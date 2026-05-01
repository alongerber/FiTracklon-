"""Generate Mishkach PWA icons (192, 512, maskable)."""
from PIL import Image, ImageDraw
import math
import os

OUT = '/home/claude/mishkach-pwa-src'

# Brand colors
BG = (11, 13, 12, 255)         # T.bg
LIME = (198, 255, 61, 255)     # T.lime
LIME_DIM = (198, 255, 61, 120)


def rounded_rect(draw, box, radius, fill):
    """Draw a filled rounded rectangle."""
    x0, y0, x1, y1 = box
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def descending_curve(draw, size, stroke_color, stroke_width=None, padding=None):
    """Draw a descending curve (trending-down chart)."""
    if stroke_width is None:
        stroke_width = max(14, size // 32)
    if padding is None:
        padding = size // 4

    # LTR "trending down" icon: start top-left, end bottom-right, with big dot at end
    x_start = padding
    y_start = padding + size // 12  # a bit below top
    x_end = size - padding
    y_end = size - padding - size // 12  # a bit above bottom

    # Build smooth line — start flat, then arc downward (emphasizes "decline")
    points = []
    for t in range(0, 101, 2):
        tt = t / 100
        # Cubic ease-in for more dramatic late-descent feel
        cx1 = x_start + (x_end - x_start) * 0.45
        cy1 = y_start + (y_end - y_start) * 0.1   # first ctrl pt high → line starts horizontal
        cx2 = x_start + (x_end - x_start) * 0.7
        cy2 = y_start + (y_end - y_start) * 0.95  # second ctrl pt low → line ends steep
        # Cubic bezier
        x = (1-tt)**3 * x_start + 3*(1-tt)**2 * tt * cx1 + 3*(1-tt) * tt**2 * cx2 + tt**3 * x_end
        y = (1-tt)**3 * y_start + 3*(1-tt)**2 * tt * cy1 + 3*(1-tt) * tt**2 * cy2 + tt**3 * y_end
        points.append((x, y))

    # Main stroke
    draw.line(points, fill=stroke_color, width=stroke_width, joint='curve')

    # Starting dot (top-left) — hollow-looking via bg fill inside
    sr = stroke_width * 0.75
    draw.ellipse([x_start - sr, y_start - sr, x_start + sr, y_start + sr], fill=stroke_color)

    # Ending dot (bottom-right) — big, emphasized
    end_r = stroke_width * 1.5
    draw.ellipse([x_end - end_r, y_end - end_r, x_end + end_r, y_end + end_r], fill=stroke_color)
    # Inner ring for depth
    inner_r = end_r * 0.55
    draw.ellipse([x_end - inner_r, y_end - inner_r, x_end + inner_r, y_end + inner_r], fill=BG)


def make_icon(size, maskable=False):
    """Generate an icon at `size`."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    if maskable:
        # Maskable: fill the whole canvas (platforms crop to any shape)
        draw.rectangle([0, 0, size, size], fill=BG)
        # Safe zone: 80% inner circle — draw curve at 60% of size to stay safe
        safe = int(size * 0.6)
        off = (size - safe) // 2
        inner = Image.new('RGBA', (safe, safe), (0, 0, 0, 0))
        inner_draw = ImageDraw.Draw(inner)
        descending_curve(inner_draw, safe, LIME, stroke_width=max(10, safe // 10), padding=safe // 5)
        img.paste(inner, (off, off), inner)
    else:
        # Regular: rounded corners
        radius = int(size * 0.22)
        rounded_rect(draw, (0, 0, size, size), radius, BG)
        # Curve
        descending_curve(draw, size, LIME, stroke_width=max(12, size // 18), padding=size // 5)

    return img


def main():
    # 192x192
    img192 = make_icon(192)
    img192.save(os.path.join(OUT, 'icon-192.png'), 'PNG', optimize=True)
    print(f"✓ icon-192.png")

    # 512x512
    img512 = make_icon(512)
    img512.save(os.path.join(OUT, 'icon-512.png'), 'PNG', optimize=True)
    print(f"✓ icon-512.png")

    # Maskable 512x512
    maskable = make_icon(512, maskable=True)
    maskable.save(os.path.join(OUT, 'icon-maskable.png'), 'PNG', optimize=True)
    print(f"✓ icon-maskable.png")

    # Apple touch icon (180x180)
    img180 = make_icon(180)
    img180.save(os.path.join(OUT, 'apple-touch-icon.png'), 'PNG', optimize=True)
    print(f"✓ apple-touch-icon.png")

    # Favicon (32x32)
    img32 = make_icon(32)
    img32.save(os.path.join(OUT, 'favicon.png'), 'PNG', optimize=True)
    print(f"✓ favicon.png")


if __name__ == '__main__':
    main()
