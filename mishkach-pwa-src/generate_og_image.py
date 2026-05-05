"""Generate og-image.png (1200×630) for Open Graph + Twitter Card previews.

Run once to (re)create mishkach-pwa-src/og-image.png. The build pipeline
copies it to the repo root where Vercel serves it.

Design (v3.17 update — bolded "קל" reveals the wordplay):
  • Background: T.bg (#0b0d0c)
  • Logo (logo-welcome.png) centered, ~280px tall
  • Title "מש קל ות" — 110px, with the middle "קל" rendered in lime to
    surface the מִשְׁקָל + קַלּוּת pun (weight + lightness)
  • Subtitle "משקל + קלות" — 36px muted gray, explains the wordplay
  • Footer URL "fi-tracklon.vercel.app" — 22px mono gray

Earlier (v3.16): single-color title + "יומן משקל בעברית" subtitle.
The new layout trades plain explanation for visual storytelling — the
reader's eye hits the lime "קל" and decodes the name themselves.

Hebrew handling: PIL renders Unicode strings left-to-right. For Hebrew
to appear correctly we run them through python-bidi's get_display(),
which reorders logical (storage) order into visual (drawing) order.
Niqqud marks survive the reorder when supported by the chosen font;
Arial Bold handles the basic Hebrew alphabet but doesn't render every
niqqud cleanly, so we use the unpointed "מִשְׁקַלּוּת" → "משקלות" form.
The branded niqqud-rich form lives on the in-app splash; here a flat
share-card form reads better at 96px on small WhatsApp tiles anyway.
"""
import os
from PIL import Image, ImageDraw, ImageFont
from bidi.algorithm import get_display

SRC = os.path.dirname(os.path.abspath(__file__))
OUT_PATH = os.path.join(SRC, 'og-image.png')
LOGO_PATH = os.path.join(SRC, 'logo-welcome.png')

# ─── Canvas ─────────────────────────────────────────────────────────
W, H = 1200, 630

# Theme (matches mishkach-pwa-src/01-theme.jsx T.bg / T.lime / T.inkSub)
BG       = (11, 13, 12, 255)        # T.bg #0b0d0c
LIME     = (201, 242, 62, 255)      # spec: #C9F23E (matches CTA in app)
TITLE_GRAY = (232, 232, 232, 255)   # spec: #E8E8E8 — bright off-white for "מש"/"ות"
INK_SUB  = (136, 136, 136, 255)     # spec: #888 — subtitle gray
INK_MUTE = (110, 115, 105, 255)     # T.inkMute-ish

# ─── Font discovery ─────────────────────────────────────────────────
# Try several fallbacks so this works on Windows + macOS + Linux.
FONT_CANDIDATES_BOLD = [
    'C:/Windows/Fonts/arialbd.ttf',
    'C:/Windows/Fonts/FRANKB.TTF',
    '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
]
FONT_CANDIDATES_REG = [
    'C:/Windows/Fonts/arial.ttf',
    'C:/Windows/Fonts/david.ttf',
    '/System/Library/Fonts/Supplemental/Arial.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
]
FONT_CANDIDATES_MONO = [
    'C:/Windows/Fonts/consola.ttf',
    'C:/Windows/Fonts/cour.ttf',
    '/System/Library/Fonts/Menlo.ttc',
    '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',
]

def first_existing(paths):
    for p in paths:
        if os.path.exists(p):
            return p
    raise RuntimeError(f"None of the font candidates exist: {paths}")

FONT_BOLD = first_existing(FONT_CANDIDATES_BOLD)
FONT_REG  = first_existing(FONT_CANDIDATES_REG)
FONT_MONO = first_existing(FONT_CANDIDATES_MONO)

font_title       = ImageFont.truetype(FONT_BOLD, 110)
# Slightly larger for "קל" so the wordplay reads even on a small WhatsApp
# tile. ~14% bump is visible but not jarring at 110px base.
font_title_lime  = ImageFont.truetype(FONT_BOLD, 124)
font_subtitle    = ImageFont.truetype(FONT_REG,  36)
font_url         = ImageFont.truetype(FONT_MONO, 22)

# ─── Build the canvas ───────────────────────────────────────────────
img = Image.new('RGBA', (W, H), BG)

# Subtle radial-ish vignette: paint a faint lime glow behind where the logo sits
glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow)
glow_cx, glow_cy = W // 2, 230
for r in range(420, 0, -8):
    a = max(0, int(28 * (1 - r / 420)))
    gd.ellipse((glow_cx - r, glow_cy - r * 0.7, glow_cx + r, glow_cy + r * 0.7),
               fill=(198, 255, 61, a))
img = Image.alpha_composite(img, glow)

draw = ImageDraw.Draw(img)

# ─── Logo (resized to ~280px tall, centered horizontally) ──────────
if os.path.exists(LOGO_PATH):
    logo = Image.open(LOGO_PATH).convert('RGBA')
    target_h = 280
    ratio = target_h / logo.height
    logo = logo.resize(
        (int(logo.width * ratio), target_h),
        Image.LANCZOS,
    )
    logo_x = (W - logo.width) // 2
    logo_y = 70
    img.paste(logo, (logo_x, logo_y), logo)

# ─── Title: "מש קל ות" — tri-color, baseline-aligned ──────────────
# Visual order (left→right) on the canvas: ות (gray) | קל (lime) | מש (gray).
# We render each chunk separately with its own font + color, sharing one
# baseline so the larger lime "קל" sits cleanly between the gray pieces.
#
# python-bidi reverses each chunk into visual storage order so PIL (which
# draws strictly left-to-right) ends up showing the Hebrew letters in the
# direction a Hebrew reader expects (mem on right, shin on left, etc).
title_baseline_y = 480   # a single baseline shared by all 3 chunks
chunks = [
    # (logical Hebrew, font, color) — listed in visual order, ות leftmost
    ('ות', font_title,      TITLE_GRAY),
    ('קל', font_title_lime, LIME),
    ('מש', font_title,      TITLE_GRAY),
]
# Width per chunk via textlength; combined width centers the whole word.
widths = [draw.textlength(get_display(t), font=f) for t, f, _ in chunks]
total_w = sum(widths)
cursor_x = (W - total_w) // 2

for (logical, font, color), w in zip(chunks, widths):
    visual = get_display(logical)
    # anchor='ls' = (left, baseline) — keeps mixed-size chunks lined up
    draw.text((cursor_x, title_baseline_y), visual, font=font, fill=color, anchor='ls')
    cursor_x += w

# ─── Subtitle: "משקל + קלות" — gray, centered, explains the wordplay ─
# The "+" stays as ASCII so bidi keeps it where we want; the surrounding
# Hebrew is bidi'd as a single string.
sub_logical = 'משקל + קלות'
sub_visual = get_display(sub_logical)
sub_w = draw.textlength(sub_visual, font=font_subtitle)
sub_x = (W - sub_w) // 2
sub_y = title_baseline_y + 32   # below the title's baseline
draw.text((sub_x, sub_y), sub_visual, font=font_subtitle, fill=INK_SUB)

# ─── Footer: URL — mono gray, bottom ───────────────────────────────
url_text = 'fi-tracklon.vercel.app'
url_bbox = draw.textbbox((0, 0), url_text, font=font_url)
url_w = url_bbox[2] - url_bbox[0]
url_x = (W - url_w) // 2 - url_bbox[0]
url_y = H - 50
draw.text((url_x, url_y), url_text, font=font_url, fill=INK_MUTE)

# ─── Save ─────────────────────────────────────────────────────────
img = img.convert('RGB')  # PNG without alpha — smaller + better for OG tiles
img.save(OUT_PATH, 'PNG', optimize=True)
print(f'wrote {OUT_PATH} ({os.path.getsize(OUT_PATH)} bytes)')
