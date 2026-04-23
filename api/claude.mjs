// ════════════════════════════════════════════════════════════════════
// /api/claude.js — Vercel Edge Function
// Proxies Anthropic API with shared password + weekly cost cap
// Zero npm dependencies. Uses Upstash REST API directly if available.
// ════════════════════════════════════════════════════════════════════

export const config = {
  runtime: 'edge',
};

const WEEKLY_CAP_USD = 2.0;
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

// Pricing per 1M tokens — must match client pricing table
const PRICING = {
  'claude-opus-4-7':           { in: 5,  out: 25 },
  'claude-opus-4-6':           { in: 5,  out: 25 },
  'claude-sonnet-4-6':         { in: 3,  out: 15 },
  'claude-haiku-4-5-20251001': { in: 1,  out: 5  },
};

// ─── ISO week key ───────────────────────────────────────────────────
function weekKey() {
  const d = new Date();
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
  return `fitracklon:usage:${target.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function daysUntilWeekReset() {
  const d = new Date();
  const dayOfWeek = d.getUTCDay(); // 0 = Sun
  // ISO week resets Monday; days until next Monday
  const daysLeft = (1 - dayOfWeek + 7) % 7 || 7;
  return daysLeft;
}

// ─── KV (Upstash REST) helpers — optional, degrades gracefully ──────
// Supports two env var naming conventions:
// 1. Vercel KV legacy: KV_REST_API_URL + KV_REST_API_TOKEN
// 2. Upstash native:   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
function getKvCreds() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return { url, token };
  return null;
}

function kvConfigured() {
  return getKvCreds() !== null;
}

async function kvGet(key) {
  const creds = getKvCreds();
  if (!creds) return null;
  try {
    const r = await fetch(`${creds.url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${creds.token}` },
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j?.result ?? null;
  } catch (_) { return null; }
}

async function kvIncrByFloat(key, amount) {
  const creds = getKvCreds();
  if (!creds) return null;
  try {
    const r = await fetch(
      `${creds.url}/incrbyfloat/${encodeURIComponent(key)}/${amount}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${creds.token}` },
      }
    );
    if (!r.ok) return null;
    const j = await r.json();
    // Set TTL of 21 days so old weeks auto-expire
    await fetch(
      `${creds.url}/expire/${encodeURIComponent(key)}/${21 * 24 * 3600}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${creds.token}` },
      }
    ).catch(() => {});
    return parseFloat(j?.result ?? 0);
  } catch (_) { return null; }
}

// ─── Response helpers ───────────────────────────────────────────────
function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'cache-control': 'no-store',
    },
  });
}

function errorResponse(type, message, status, extras = {}) {
  return jsonResponse({ error: { type, message }, ...extras }, status);
}

// ─── Handler ────────────────────────────────────────────────────────
export default async function handler(req) {
  try {
    return await handleRequest(req);
  } catch (err) {
    // Top-level safety net: any unhandled error returns a structured 500
    return errorResponse(
      'internal_error',
      `Internal error: ${err?.message || String(err)}`,
      500,
      { stack: err?.stack?.split('\n')?.slice(0, 5) }
    );
  }
}

async function handleRequest(req) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'content-type, x-app-password',
        'access-control-max-age': '86400',
      },
    });
  }

  if (req.method !== 'POST') {
    return errorResponse('method_not_allowed', 'Use POST', 405);
  }

  // ─── Auth ────────────────────────────────────────────────────────
  const providedPw = req.headers.get('x-app-password') || '';
  const expectedPw = process.env.APP_PASSWORD || '';
  if (!expectedPw) {
    return errorResponse('server_error', 'APP_PASSWORD env var not configured on server', 500);
  }
  if (providedPw !== expectedPw) {
    return errorResponse('authentication_error', 'קוד גישה שגוי', 401);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return errorResponse('server_error', 'ANTHROPIC_API_KEY env var not configured on server', 500);
  }

  // ─── Weekly cap check ────────────────────────────────────────────
  const wk = weekKey();
  let currentSpend = 0;
  if (kvConfigured()) {
    const val = await kvGet(wk);
    currentSpend = parseFloat(val) || 0;
    if (currentSpend >= WEEKLY_CAP_USD) {
      const daysLeft = daysUntilWeekReset();
      return errorResponse(
        'cap_exceeded',
        `חרגת מהתקרה השבועית ($${WEEKLY_CAP_USD}). איפוס בעוד ${daysLeft} ימים.`,
        429,
        { weekly_spend: currentSpend, cap: WEEKLY_CAP_USD, days_until_reset: daysLeft }
      );
    }
  }

  // ─── Read and forward body ───────────────────────────────────────
  let bodyText;
  let parsedBody;
  try {
    bodyText = await req.text();
    parsedBody = JSON.parse(bodyText);
  } catch (_) {
    return errorResponse('invalid_request', 'Invalid JSON body', 400);
  }

  // Sanity: reject anything too big (basic abuse protection)
  if (bodyText.length > 5_000_000) {
    return errorResponse('invalid_request', 'Request body too large', 413);
  }

  // ─── Forward to Anthropic ────────────────────────────────────────
  let upstream;
  try {
    upstream = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'content-type': 'application/json',
      },
      body: bodyText,
    });
  } catch (e) {
    return errorResponse('upstream_error', `Anthropic unreachable: ${e.message}`, 502);
  }

  const respText = await upstream.text();
  let respData;
  try {
    respData = JSON.parse(respText);
  } catch (_) {
    respData = { error: { type: 'upstream_error', message: respText.slice(0, 200) } };
  }

  // ─── Track cost if successful ────────────────────────────────────
  if (upstream.ok && respData?.usage) {
    const model = parsedBody.model || 'claude-opus-4-7';
    const pricing = PRICING[model] || PRICING['claude-opus-4-7'];
    const cost =
      (respData.usage.input_tokens  * pricing.in  +
       respData.usage.output_tokens * pricing.out) / 1_000_000;

    const newSpend = await kvIncrByFloat(wk, cost);
    respData._weekly_spend = newSpend !== null ? newSpend : (currentSpend + cost);
    respData._weekly_cap = WEEKLY_CAP_USD;
    respData._days_until_reset = daysUntilWeekReset();
    if (!kvConfigured()) {
      respData._warning = 'weekly_cap_not_enforced';
    }
  }

  return new Response(JSON.stringify(respData), {
    status: upstream.status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'cache-control': 'no-store',
    },
  });
}
