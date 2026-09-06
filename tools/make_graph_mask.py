# -*- coding: utf-8 -*-
"""Собирает маску декоративной схемы для раздела «Подход».

    python tools/make_graph_mask.py Mask-group.png

Исходник — картинка со схемой связей, которую прислал владелец. На страницу она
идёт не изображением, а маской (`mask-image` в `.graph`): цвет задаёт сама
страница, поэтому схема участвует в её палитре, а не спорит с ней — в исходнике
линии фиолетовые. Заодно файл легчает втрое: краски не нужны, нужна форма.

Форму собираем из двух признаков, и второй появился не сразу.

* **Альфа** даёт плашки и связи между ними. Первая версия маски только на ней и
  держалась — и владелец сразу заметил: «там нет иконок, просто цвет». Так и
  было: иконки внутри плашек нарисованы белым с альфой около 72, а заливка
  плашки — фиолетовым с альфой около 170, поэтому в альфа-маске иконка тусклее
  собственной подложки и пропадает.
* **Яркость на фоне страницы** возвращает иконки. Белый штрих на тёмном фоне
  ярче фиолетовой заливки втрое (медиана 95 против 30), так что берём максимум
  из двух долей: плашки и связи остаются как были, иконки проступают поверх.

Числа на шести плашках («4X», «25%», «328%») стираются вручную — им рядом с
настоящими показателями резюме делать нечего. Плашки находятся по цвету: только
у них заливка зелёная или розовая, остальные фиолетовые. Внутренность такой
плашки заливается её же фоном, контур остаётся — на странице это плашка, в
которой ничего не написано.

Исходник в репозитории не хранится (см. `.gitignore`) — он нужен только здесь.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "img" / "graph.png"

PAGE_BG = np.array([11, 13, 19], np.float32)   # --void, фон страницы
LUM = np.array([0.2126, 0.7152, 0.0722], np.float32)
ICON_LUM = 95.0        # яркость штриха иконки на фоне: выше неё маска полная
CHIP_MIN_W = 60        # плашки с числами шириной 64 px; мелкое — это иконки
EDGE = 3               # столько пикселей контура плашки не трогаем


def tinted(rgb: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    """Пиксели зелёного и розового оттенка — только у плашек с числами."""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    green = (g > r + 25) & (g > b + 15)
    rose = (r > g + 35) & (r > b + 20)
    return (alpha > 40) & (green | rose)


def boxes_of(flags: np.ndarray, gap: int = 14) -> list[list[int]]:
    """Сливает разрозненные точки в прямоугольники — по близости, без соседей."""
    out: list[list[int]] = []
    ys, xs = np.nonzero(flags)
    for x, y in sorted(zip(xs.tolist(), ys.tolist())):
        for box in out:
            if box[0] - gap <= x <= box[2] + gap and box[1] - gap <= y <= box[3] + gap:
                box[0], box[1] = min(box[0], x), min(box[1], y)
                box[2], box[3] = max(box[2], x), max(box[3], y)
                break
        else:
            out.append([x, y, x, y])

    merged = True
    while merged:
        merged = False
        for i in range(len(out)):
            for j in range(i + 1, len(out)):
                a, b = out[i], out[j]
                if (a[0] - gap <= b[2] and b[0] - gap <= a[2]
                        and a[1] - gap <= b[3] and b[1] - gap <= a[3]):
                    a[0], a[1] = min(a[0], b[0]), min(a[1], b[1])
                    a[2], a[3] = max(a[2], b[2]), max(a[3], b[3])
                    out.pop(j)
                    merged = True
                    break
            if merged:
                break
    return out


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 2

    src = Path(sys.argv[1])
    if not src.is_absolute():
        src = ROOT / src

    image = Image.open(src).convert("RGBA")
    data = np.asarray(image).astype(np.float32)
    rgb, alpha = data[..., :3], data[..., 3]

    seen = PAGE_BG + (rgb - PAGE_BG) * (alpha[..., None] / 255.0)
    lum = seen @ LUM

    mask = np.maximum(alpha / 255.0, np.clip(lum / ICON_LUM, 0.0, 1.0))
    mask[alpha <= 2] = 0.0            # за пределами схемы рисовать нечего

    # Числа долой. Внутренность плашки — её же заливка: берём медиану тех
    # пикселей, что не ярче заливки, иначе среднее утянут сами цифры.
    chips = [b for b in boxes_of(tinted(rgb, alpha)) if b[2] - b[0] + 1 >= CHIP_MIN_W]
    body = Image.fromarray(((alpha > 40) * 255).astype(np.uint8))
    inner = np.asarray(body.filter(ImageFilter.MinFilter(EDGE * 2 + 1))) > 0

    for x0, y0, x1, y1 in chips:
        area = np.zeros_like(inner)
        area[y0:y1 + 1, x0:x1 + 1] = inner[y0:y1 + 1, x0:x1 + 1]
        fill = area & (lum < 40)
        if not fill.any():
            continue
        mask[area] = float(np.median(mask[fill]))

    shape = Image.fromarray(np.round(mask * 255.0).astype(np.uint8))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    Image.merge("LA", (Image.new("L", image.size, 255), shape)).save(OUT, optimize=True)

    print("%s -> %s: плашек с числами %d, %d -> %d байт"
          % (src.name, OUT.relative_to(ROOT), len(chips),
             src.stat().st_size, OUT.stat().st_size))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
