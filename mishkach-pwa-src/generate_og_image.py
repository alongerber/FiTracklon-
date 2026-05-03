"""Generate og-image.png (1200×630) for Open Graph + Twitter Card previews.

Run once to (re)create mishkach-pwa-src/og-image.png. The build pipeline
copies it to the repo root where Vercel serves it.

Design (per v3.16 spec):
  • Background: T.bg (#0b0d0c)
  • Logo (logo-welcome.png) centered, ~280px tall
  • Title "מִשְׁקַלּוּת" — 96px bold lime
  • Subtitle "יומן משקל בעברית" — 32px regular muted gray
  • Footer URL "fi-tracklon.vercel.app" — 18px mono-ish gray

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
LIME     = (198, 255, 61, 255)      # T.lime #c6ff3d
INK_SUB  = (170, 175, 165, 255)     # T.inkSub-ish gray
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

font_title    = ImageFont.truetype(FONT_BOLD, 110)   # was 96 — bumped for ~280px logo balance
font_subtitle = ImageFont.truetype(FONT_REG,  34)
font_url      = ImageFont.truetype(FONT_MONO, 22)

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

# ─── Title: "מִשְׁקַלּוּת" — lime, centered ──────────────────────
# Use the unpointed form (without niqqud) so PIL+arialbd renders cleanly
# at 110px. Bidi-reverse for visual order.
title_logical = 'משקלות'
title_visual = get_display(title_logical)
title_bbox = draw.textbbox((0, 0), title_visual, font=font_title)
title_w = title_bbox[2] - title_bbox[0]
title_h = title_bbox[3] - title_bbox[1]
title_x = (W - title_w) // 2 - title_bbox[0]
title_y = 380
draw.text((title_x, title_y), title_visual, font=font_title, fill=LIME)

# ─── Subtitle: "יומן משקל בעברית" — gray, centered ─────────────
sub_logical = 'יומן משקל בעברית'
sub_visual = get_display(sub_logical)
sub_bbox = draw.textbbox((0, 0), sub_visual, font=font_subtitle)
sub_w = sub_bbox[2] - sub_bbox[0]
sub_x = (W - sub_w) // 2 - sub_bbox[0]
sub_y = title_y + title_h + 32
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
