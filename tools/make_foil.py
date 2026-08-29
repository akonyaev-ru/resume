"""Рисует текстуру голографической фольги для бейджа.

    python tools/make_foil.py

Результат — assets/img/foil.webp.

Плоские CSS-градиенты дают ровные цветные полосы, а настоящая фольга мятая:
полосы текут, изгибаются и вспыхивают узкими бликами на изломах. Поэтому
текстура считается один раз здесь и дальше просто ездит фоном под курсором —
рантайму ничего пересчитывать не нужно.

Как устроено: диагональная развёртка задаёт направление полос, наложенный
многооктавный шум её коробит, дробная часть превращается в цвет по радужной
шкале, а узкая гауссова полоска поверх — в блик на сгибе.
"""

from __future__ import annotations

import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "img" / "foil.webp"

WIDTH = 560
HEIGHT = 700
BANDS = 5.2             # сколько цветных полос укладывается по диагонали
WARP = 1.9              # насколько сильно шум коробит полосы
SCANLINE = 0.14         # глубина построчной штриховки
FLOOR = 0.13            # яркость впадины между складками
RIDGE = 0.030           # ширина светящегося гребня, доля полосы
SEED = 11

# Холодная шкала: индиго, фиалка, электрик, лазурь, стальной — и обратно.
# Радуга спорила с палитрой страницы и выглядела игрушечной.
RAMP = [
    (58, 42, 190),
    (124, 70, 255),
    (58, 110, 255),
    (34, 200, 245),
    (150, 190, 255),
    (92, 60, 220),
    (58, 42, 190),
]


def smooth_noise(shape: tuple[int, int], rng: np.random.Generator) -> np.ndarray:
    """Многооктавный мягкий шум — он и делает фольгу мятой."""
    field = np.zeros(shape, np.float32)
    total = 0.0
    for sigma, weight in ((46.0, 1.0), (19.0, 0.5), (8.0, 0.22)):
        octave = cv2.GaussianBlur(rng.random(shape).astype(np.float32), (0, 0), sigma)
        span = octave.max() - octave.min()
        field += weight * (octave - octave.min()) / (span if span else 1.0)
        total += weight
    return field / total


def palette(hue: np.ndarray) -> np.ndarray:
    """Дробную часть развёртки — в цвет по шкале RAMP."""
    steps = len(RAMP) - 1
    scaled = np.clip(hue, 0, 0.999999) * steps
    index = scaled.astype(np.int32)
    frac = (scaled - index)[..., None]

    ramp = np.array(RAMP, np.float32)
    return ramp[index] * (1 - frac) + ramp[index + 1] * frac


def main() -> int:
    rng = np.random.default_rng(SEED)
    rows, cols = np.mgrid[0:HEIGHT, 0:WIDTH].astype(np.float32)

    diagonal = (cols * 0.62 + rows * 0.78) / (WIDTH * 0.62 + HEIGHT * 0.78)
    field = diagonal * BANDS + smooth_noise((HEIGHT, WIDTH), rng) * WARP

    fraction = np.mod(field, 1.0)

    # Цвет сдвинут собственным шумом: иначе блик всегда приходился бы на один
    # и тот же оттенок и фольга выходила одноцветной.
    colour = palette(np.mod(field + smooth_noise((HEIGHT, WIDTH), rng) * 0.7, 1.0))

    # Металл — это контраст: глубокая тёмная впадина и узкий добела раскалённый
    # гребень. Мягкие полутона по всему кадру давали разводы масляной плёнки, а
    # не фольгу, поэтому впадина уведена почти в чёрное.
    ridge = np.exp(-((fraction - 0.5) ** 2) / (2 * RIDGE ** 2))
    glow = np.exp(-((fraction - 0.5) ** 2) / (2 * (RIDGE * 4.5) ** 2))

    out = colour * (FLOOR + 0.95 * glow)[..., None] + 250.0 * ridge[..., None]

    # Построчная штриховка: тонкая техническая развёртка поверх металла.
    scan = 1.0 - SCANLINE * (np.mod(rows, 3.0) < 1.0)
    out *= scan[..., None]

    out = np.clip(out, 0, 255).astype(np.uint8)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(out, mode="RGB").save(OUT, "WEBP", quality=86, method=6)

    sys.stdout.reconfigure(encoding="utf-8")
    print(f"{OUT.relative_to(ROOT)} - {WIDTH}x{HEIGHT}, {OUT.stat().st_size / 1024:.0f} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
