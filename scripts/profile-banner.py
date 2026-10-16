"""Generate the light/dark GitHub profile banners (packages/profile/assets).

Text is outlined to SVG paths with the portfolio's fonts, because GitHub
serves README images as <img>, which cannot load web fonts.

Setup (once):  python3 -m venv .venv && .venv/bin/pip install fonttools brotli uharfbuzz
Run from the repo root (after npm install, which provides the fonts):
    .venv/bin/python scripts/profile-banner.py . packages/profile/assets
"""
import io
import math
import sys

import uharfbuzz as hb
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT, OUT = sys.argv[1], sys.argv[2]
FS = ROOT + "/node_modules/@fontsource-variable"
W, H = 1280, 320

THEMES = {
    "light": dict(paper="#edf1ec", ink="#0f2e29", soft="#4a675e", contour="#b4c5ba", sun="#f2b33d"),
    "dark": dict(paper="#0d201c", ink="#e2ebe5", soft="#9ab4aa", contour="#2a4a42", sun="#f2b33d"),
}


def load(path, axes):
    font = TTFont(path)
    inst = instantiateVariableFont(font, axes)
    buf = io.BytesIO()
    inst.flavor = None
    inst.save(buf)
    data = buf.getvalue()
    return TTFont(io.BytesIO(data)), hb.Font(hb.Face(data))


def text_path(fonts, text, size, x, y, tracking=0.0):
    tt, hbfont = fonts
    upm = tt["head"].unitsPerEm
    gs = tt.getGlyphSet()
    order = tt.getGlyphOrder()
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(hbfont, buf, {"kern": True, "liga": True})
    s = size / upm
    pen_x = 0.0
    parts = []
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        name = order[info.codepoint]
        sp = SVGPathPen(gs)
        gx = x + (pen_x + pos.x_offset) * s
        gy = y - pos.y_offset * s
        gs[name].draw(TransformPen(sp, (s, 0, 0, -s, gx, gy)))
        d = sp.getCommands()
        if d:
            parts.append(d)
        pen_x += pos.x_advance + tracking * upm
    return " ".join(parts), pen_x * s


def contours(cx, cy, n=16, base=40, step=26):
    """Closed, gently wobbling rings around (cx, cy) — a topographic summit."""
    rings = []
    for i in range(n):
        r = base + i * step
        pts = []
        for k in range(181):
            t = k / 180 * 2 * math.pi
            wob = (
                1
                + 0.10 * math.sin(3 * t + i * 0.35)
                + 0.06 * math.sin(5 * t - i * 0.5 + 1.3)
                + 0.03 * math.sin(9 * t + i * 0.8)
            )
            rr = r * wob
            pts.append((cx + rr * math.cos(t) * 1.25, cy + rr * math.sin(t)))
        d = "M" + " L".join(f"{px:.1f} {py:.1f}" for px, py in pts) + "Z"
        rings.append(d)
    return rings


name_font = load(FS + "/bricolage-grotesque/files/bricolage-grotesque-latin-standard-normal.woff2",
                 {"wght": 720, "wdth": 78, "opsz": 96})
label_font = load(FS + "/bricolage-grotesque/files/bricolage-grotesque-latin-standard-normal.woff2",
                  {"wght": 560, "wdth": 100, "opsz": 14})
serif_font = load(FS + "/newsreader/files/newsreader-latin-standard-italic.woff2",
                  {"wght": 400, "opsz": 36})

X = 72
name_d, _ = text_path(name_font, "Mayank Suman", 112, X, 168)
tag_d, _ = text_path(serif_font, "Senior Software Developer, Frontend", 38, X, 224)
meta_d, meta_w = text_path(label_font, "VANCOUVER, BC  ·  BUILDING FOR THE WEB SINCE 2012", 17, X + 30, 270, tracking=0.08)
rings = contours(1060, 210)

for theme, c in THEMES.items():
    ring_svg = "\n    ".join(
        f'<path d="{d}" stroke-width="{1.6 if i % 4 == 3 else 1}"/>' for i, d in enumerate(rings)
    )
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-labelledby="t">
  <title id="t">Mayank Suman — Senior Software Developer, Frontend</title>
  <defs>
    <clipPath id="frame"><rect width="{W}" height="{H}" rx="20"/></clipPath>
    <linearGradient id="fade" x1="0" x2="1">
      <stop offset="0.38" stop-color="{c['paper']}" stop-opacity="1"/>
      <stop offset="0.62" stop-color="{c['paper']}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <g clip-path="url(#frame)">
    <rect width="{W}" height="{H}" fill="{c['paper']}"/>
    <g fill="none" stroke="{c['contour']}">
    {ring_svg}
    </g>
    <circle cx="1060" cy="210" r="13" fill="{c['sun']}"/>
    <rect width="{W}" height="{H}" fill="url(#fade)"/>
  </g>
  <path d="{name_d}" fill="{c['ink']}"/>
  <path d="{tag_d}" fill="{c['soft']}"/>
  <circle cx="{X + 9}" cy="264" r="7" fill="{c['sun']}"/>
  <path d="{meta_d}" fill="{c['soft']}"/>
</svg>
"""
    with open(f"{OUT}/banner-{theme}.svg", "w") as fh:
        fh.write(svg)
    print(theme, len(svg), "bytes")
