"""Assemble all JSX source files into the final single-file PWA index.html.

v3.0+ pipeline:
  1. Concatenate all JSX files in a known order → one large .jsx blob.
  2. Run esbuild on it (transform-only, no bundling) to:
        - convert JSX to React.createElement(...) calls
        - minify the output
        - target ES2020 for broad mobile support
  3. Drop the minified JS into the index.html template (no Babel runtime).
  4. Copy supporting assets (sw.js, manifest, icons, api/claude.mjs).

This replaces the v2.x flow that shipped raw JSX + Babel Standalone, which
forced the browser to compile ~900KB of JSX on every cold start (2-4 seconds
of white screen on mid-range mobile). After v3.0 the browser runs ready-to-go
JS immediately.

Requirements:
  - Python 3
  - Node.js (any recent version)
  - esbuild — installed locally: cd mishkach-pwa-src && npm install
"""
import os, shutil, subprocess, sys, tempfile

# Make stdout UTF-8 even on Windows console (cp1252 default) — otherwise
# the final ✓ print blows up with UnicodeEncodeError.
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

# Resolve paths relative to this script's location, so the build works from
# anywhere (cd to repo root, cd to mishkach-pwa-src/, IDE play button, etc).
SRC = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(os.path.join(SRC, '..'))  # repo root — what Vercel serves

os.makedirs(OUT, exist_ok=True)

JSX_FILES = [
    '01-theme.jsx',
    '02-store.jsx',
    '03-charts.jsx',
    '04-ui.jsx',
    '15-personas.jsx',
    '18-strings.jsx',       # NEW: UI strings per persona×gender
    '19-errors.jsx',        # NEW: Error messages per persona×gender
    '20-ai-prompts.jsx',    # NEW: AI system prompts per persona
    '05-screen-onboarding.jsx',
    '06-screen-home.jsx',
    '07-screen-log.jsx',
    '08-screen-history.jsx',
    '09-screen-goal.jsx',
    '10-screen-profile.jsx',
    '12-claude-api.jsx',
    '13-screen-nutrition.jsx',
    '16-tips-creative.jsx',
    '17-notifications.jsx',
    '21-workout-catalog.jsx',  # NEW: Hebrew exercise catalog + helpers
    '22-screen-workout.jsx',   # NEW: Workout tracking screen
    '23-screen-report.jsx',    # NEW: AI-powered personal report (PDF + WhatsApp)
    '24-icons.jsx',            # NEW (v3.5): persona icon set + <Icon> alias
    '11-app.jsx',
]

# ─── 1) Concatenate JSX sources ─────────────────────────────────────
body = []
for f in JSX_FILES:
    path = os.path.join(SRC, f)
    with open(path, 'r', encoding='utf-8') as fp:
        body.append(fp.read())
combined_jsx = '\n\n'.join(body)
combined_jsx_size = len(combined_jsx.encode('utf-8'))

# ─── 2) Run esbuild → minified JS ───────────────────────────────────
# We write the concat to a temp .jsx file so esbuild can infer the loader
# from the extension; --loader=jsx as a CLI flag only works with stdin.
with tempfile.TemporaryDirectory() as tmpdir:
    jsx_path = os.path.join(tmpdir, 'combined.jsx')
    js_path  = os.path.join(tmpdir, 'combined.js')
    with open(jsx_path, 'w', encoding='utf-8') as fp:
        fp.write(combined_jsx)

    # Locate the esbuild Node entrypoint inside the local install. Calling
    # `node bin/esbuild` works on every OS — avoids platform-specific shims
    # (.cmd on Windows, shell wrapper on POSIX).
    esbuild_bin = os.path.join(SRC, 'node_modules', 'esbuild', 'bin', 'esbuild')
    if not os.path.exists(esbuild_bin):
        sys.stderr.write(
            "✗ esbuild not found at {}\n".format(esbuild_bin) +
            "  Run: cd mishkach-pwa-src && npm install\n"
        )
        sys.exit(1)

    cmd = [
        'node', esbuild_bin, jsx_path,
        '--target=es2020',
        '--jsx-factory=React.createElement',
        '--jsx-fragment=React.Fragment',
        '--minify',
        '--legal-comments=none',
        '--charset=utf8',           # keep Hebrew strings inline, don't escape to \uXXXX
        '--outfile=' + js_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
    # esbuild prints summary + warnings to stderr even on success
    if result.stderr:
        # Filter to lines that look meaningful (warnings/errors); skip empty
        for line in result.stderr.splitlines():
            if line.strip():
                sys.stderr.write('  ' + line + '\n')
    if result.returncode != 0:
        sys.stderr.write("✗ esbuild failed (exit {})\n".format(result.returncode))
        sys.exit(result.returncode)

    with open(js_path, 'r', encoding='utf-8') as fp:
        compiled_js = fp.read()
compiled_js_size = len(compiled_js.encode('utf-8'))

# ─── 3) Wrap in HTML (no Babel runtime, plain <script>) ─────────────
HTML = '''<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1" />
  <meta name="description" content="מִשְׁקַלּוּת — תשקלו לפני שתאכלו. תקנאו בעצמכם של מחר." />

  <title>מִשְׁקַלּוּת · תשקלו לפני שתאכלו</title>

  <!-- Open Graph / Facebook / WhatsApp -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="מִשְׁקַלּוּת" />
  <meta property="og:title" content="מִשְׁקַלּוּת · תשקלו לפני שתאכלו" />
  <meta property="og:description" content="תשקלו לפני שתאכלו. תקנאו בעצמכם של מחר." />
  <meta property="og:image" content="https://fi-tracklon.vercel.app/og-preview.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="מִשְׁקַלּוּת — מעקב משקל ותזונה בעברית" />
  <meta property="og:url" content="https://fi-tracklon.vercel.app/" />
  <meta property="og:locale" content="he_IL" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="מִשְׁקַלּוּת" />
  <meta name="twitter:description" content="תשקלו לפני שתאכלו. תקנאו בעצמכם של מחר." />
  <meta name="twitter:image" content="https://fi-tracklon.vercel.app/og-preview.png" />

  <!-- PWA -->
  <link rel="manifest" href="manifest.webmanifest" />
  <meta name="theme-color" content="#0b0d0c" />
  <meta name="color-scheme" content="dark" />

  <!-- iOS -->
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="מִשְׁקַלּוּת" />
  <link rel="apple-touch-icon" href="apple-touch-icon.png" />

  <!-- iOS Splash Screens -->
  <link rel="apple-touch-startup-image" href="splash-1290x2796.png" media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)" />
  <link rel="apple-touch-startup-image" href="splash-1179x2556.png" media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)" />
  <link rel="apple-touch-startup-image" href="splash-1170x2532.png" media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" />
  <link rel="apple-touch-startup-image" href="splash-1125x2436.png" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" />
  <link rel="apple-touch-startup-image" href="splash-750x1334.png" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" />

  <!-- Icons -->
  <link rel="icon" type="image/png" sizes="32x32" href="favicon.png" />
  <link rel="icon" type="image/png" sizes="192x192" href="icon-192.png" />

  <!-- Fonts (preload + cache) -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Heebo:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

  <style>
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    html, body {
      margin: 0; padding: 0;
      background: #0b0d0c; color: #f4f6f2;
      font-family: "Inter", "Heebo", -apple-system, system-ui, sans-serif;
      overscroll-behavior: none;
      overflow: hidden;
      height: 100dvh;
      touch-action: manipulation;
    }
    #root {
      height: 100dvh;
      padding-top: env(safe-area-inset-top, 0);
      padding-bottom: env(safe-area-inset-bottom, 0);
      box-sizing: border-box;
      overflow: hidden;
    }
    /* Make all direct app containers fit inside the safe-area padded #root */
    #root > div:not(.boot) { height: 100% !important; }
    button { font-family: inherit; -webkit-tap-highlight-color: transparent; }
    input, textarea { font-family: inherit; }
    input:focus, button:focus { outline: none; }
    ::-webkit-scrollbar { width: 0; height: 0; background: transparent; }

    /* Animations */
    @keyframes mk-fadeup {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes mk-fadein {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* Loading */
    .boot {
      position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
      background: #0b0d0c; z-index: 9999;
    }
    .boot-dot {
      width: 14px; height: 14px; border-radius: 50%; background: #c6ff3d;
      animation: boot-pulse 1.2s ease-in-out infinite;
    }
    @keyframes boot-pulse {
      0%, 100% { opacity: 0.3; transform: scale(0.8); }
      50% { opacity: 1; transform: scale(1.2); }
    }
  </style>
</head>
<body>
  <div id="root">
    <div class="boot"><div class="boot-dot"></div></div>
  </div>

  <script>
    // Boot watchdog: if React doesn't mount within 10s, show an error
    setTimeout(function() {
      var boot = document.querySelector('.boot');
      if (boot && boot.parentNode) {
        boot.innerHTML = '<div style="text-align:center;padding:20px;color:#f4f6f2;font-family:system-ui;direction:rtl">\\
          <div style="font-size:40px;margin-bottom:10px">⚠️</div>\\
          <div style="font-size:16px;font-weight:700;margin-bottom:8px">טעינה נכשלה</div>\\
          <div style="font-size:12px;color:#999">אולי אין חיבור לרשת. נסה לטעון מחדש.</div>\\
          <button onclick="location.reload()" style="margin-top:20px;padding:10px 20px;background:#c6ff3d;color:#0b0d0c;border:none;border-radius:10px;font-weight:700;cursor:pointer">טען מחדש</button>\\
        </div>';
      }
    }, 10000);
  </script>

  <!-- React 18 UMD only — JSX is pre-compiled at build time, no Babel runtime -->
  <script crossorigin src="https://unpkg.com/react@18.2.0/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18.2.0/umd/react-dom.production.min.js"></script>

  <script>
/* ════════════════════════════════════════════════════════════════════
   FiTracklon PWA — pre-compiled by esbuild at build time.
   Hebrew weight + nutrition tracker with Claude Opus 4.7 insights.
   All data in localStorage. No telemetry.
   ════════════════════════════════════════════════════════════════════ */

''' + compiled_js + '''
  </script>
</body>
</html>
'''

# ─── 4) Write final index.html ──────────────────────────────────────
out_html = os.path.join(OUT, 'index.html')
with open(out_html, 'w', encoding='utf-8') as fp:
    fp.write(HTML)

# Copy static assets
for static in ['manifest.webmanifest', 'sw.js', 'icon-192.png', 'icon-512.png',
               'icon-maskable.png', 'apple-touch-icon.png', 'favicon.png',
               'logo-welcome.png', 'og-preview.png',
               'splash-1290x2796.png', 'splash-1179x2556.png',
               'splash-1170x2532.png', 'splash-1125x2436.png',
               'splash-750x1334.png']:
    src = os.path.join(SRC, static)
    dst = os.path.join(OUT, static)
    if os.path.exists(src):
        shutil.copy(src, dst)

# Copy Vercel edge function to /api/claude.mjs (mjs = guaranteed ESM parsing)
api_src = os.path.join(SRC, 'api-claude.js')
api_dir = os.path.join(OUT, 'api')
os.makedirs(api_dir, exist_ok=True)
if os.path.exists(api_src):
    shutil.copy(api_src, os.path.join(api_dir, 'claude.mjs'))

# Write a minimal package.json to declare ESM + dependencies (none)
# This also prevents Vercel from treating the project as needing a build step
pkg_json = os.path.join(OUT, 'package.json')
with open(pkg_json, 'w') as fp:
    fp.write('''{
  "name": "fitracklon",
  "version": "1.3.0",
  "private": true,
  "type": "module"
}
''')

# Write vercel.json — minimal, let file-level export config drive runtime
vercel_json = os.path.join(OUT, 'vercel.json')
with open(vercel_json, 'w') as fp:
    fp.write('''{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "cleanUrls": true
}
''')

# ─── 5) Size report ─────────────────────────────────────────────────
def walk_files(root):
    for dp, _, files in os.walk(root):
        # Skip nested source/build directories so the totals match the
        # files Vercel actually serves from the repo root.
        rel = os.path.relpath(dp, root)
        if rel.startswith('mishkach-pwa-src') or rel.startswith('node_modules') or rel.startswith('.git'):
            continue
        for f in files:
            yield os.path.join(dp, f)

def kb(n): return f"{n//1024} KB" if n >= 1024 else f"{n} B"

html_size = os.path.getsize(out_html)
total = sum(os.path.getsize(p) for p in walk_files(OUT))

print(f"✓ Source JSX (raw)        → {kb(combined_jsx_size)}")
print(f"✓ Compiled JS (minified)  → {kb(compiled_js_size)}")
print(f"✓ index.html              → {kb(html_size)}")
print(f"✓ Total bundle (root)     → {kb(total)}")
print()
for p in sorted(walk_files(OUT)):
    rel = os.path.relpath(p, OUT)
    sz = os.path.getsize(p)
    print(f"  - {rel:35s} {kb(sz):>10}")
