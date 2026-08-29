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
BANDS = 7.0             # сколько цветных полос укладывается по диагонали
WARP = 2.6              # насколько сильно шум коробит полосы
SEED = 11

# Радужная шкала фольги: пурпур, фиалка, синь, бирюза, мята, золото и обратно.
RAMP = [
    (255, 0, 140),
    (150, 60, 255),
    (60, 140, 255),
    (0, 225, 220),
    (90, 255, 150),
    (255, 220, 90),
    (255, 0, 140),
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

    # Блик на сгибе — узкая полоска в середине полосы, и она белая, а не
    # цветная: у металла отсвет всегда уходит в белый.
    highlight = np.exp(-((fraction - 0.5) ** 2) / (2 * 0.05 ** 2))
    out = colour * (0.5 + 0.35 * highlight)[..., None] + 235.0 * highlight[..., None]

    out = np.clip(out, 0, 255).astype(np.uint8)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(out, mode="RGB").save(OUT, "WEBP", quality=86, method=6)

    sys.stdout.reconfigure(encoding="utf-8")
    print(f"{OUT.relative_to(ROOT)} - {WIDTH}x{HEIGHT}, {OUT.stat().st_size / 1024:.0f} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
