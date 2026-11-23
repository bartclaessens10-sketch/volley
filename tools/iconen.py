"""Maakt de iconen van Volley: een gele volleybal op een donkerblauwe achtergrond."""
from pathlib import Path
from PIL import Image, ImageDraw

MAP = Path(__file__).resolve().parent.parent
BLAUW = (13, 23, 38, 255)
GEEL = (255, 201, 51, 255)
LIJN = (13, 23, 38, 255)


def bal(maat: int, marge: float, rond: bool) -> Image.Image:
    s = maat * 4  # groot tekenen, dan verkleinen: zachte randen
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if rond:
        d.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * 0.22), fill=BLAUW)
    else:
        d.rectangle([0, 0, s, s], fill=BLAUW)
    m = int(s * marge)
    d.ellipse([m, m, s - m, s - m], fill=GEEL)
    w = max(4, int(s * 0.035))
    r = s - 2 * m
    # drie gebogen naden, zoals op een volleybal
    d.arc([m - r * 0.55, m - r * 0.05, m + r * 0.75, m + r * 1.05], start=-50, end=50, fill=LIJN, width=w)
    d.arc([m + r * 0.25, m - r * 0.65, m + r * 1.35, m + r * 0.55], start=95, end=185, fill=LIJN, width=w)
    d.arc([m + r * 0.15, m + r * 0.45, m + r * 1.35, m + r * 1.55], start=185, end=290, fill=LIJN, width=w)
    d.ellipse([m, m, s - m, s - m], outline=LIJN, width=w)
    return img.resize((maat, maat), Image.LANCZOS)


bal(192, 0.14, True).save(MAP / "icon-192.png")
bal(512, 0.14, True).save(MAP / "icon-512.png")
bal(512, 0.24, False).save(MAP / "icon-maskable-512.png")
print("iconen gemaakt")
