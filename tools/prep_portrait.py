"""Готовит портрет для страницы: вырезает фон, кадрирует, красит в палитру сайта.

    python tools/prep_portrait.py "путь/к/фото.png"

Результат — assets/img/portrait.webp с прозрачным фоном.

Фон снимает u2net_human_seg — та же сеть, что внутри rembg, но запускается
напрямую через onnxruntime, чтобы не тянуть в окружение сам rembg. Модель
берётся из ~/.u2net; если её там нет, скрипт честно об этом говорит и ничего
не делает.

Дальше три вещи, без которых портрет на тёмной странице выглядит наклейкой:
маска подрезается и растушёвывается (иначе по контуру остаётся светлая кайма
от прежнего фона), полутона переводятся в дуотон от синевато-тёмного к почти
белому (иначе чёрный свитер сливается с полотном), и нижний край растворяется
в фоне.
"""

from __future__ import annotations

import sys
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "img" / "portrait.webp"
MODEL = Path.home() / ".u2net" / "u2net_human_seg.onnx"

TARGET_W = 760          # ширина итогового файла, px (показывается вдвое меньше)
ASPECT = 0.8            # ширина к высоте: портретный кадр 4:5
SHADOW = (0x1b, 0x22, 0x30)   # куда уходят тени — синевато-тёмный из палитры
HIGHLIGHT = (0xe9, 0xec, 0xf4)  # куда уходят света
FADE = 0.13             # доля высоты снизу, которая растворяется в фоне
SIDE_FADE = 0.07        # то же по бокам: плечи упираются в края кадра
TOP_FADE = 0.06         # и сверху: в исходнике волосы срезаны краем кадра


def cutout(path: Path) -> tuple[np.ndarray, np.ndarray]:
    """Возвращает картинку в оттенках серого и маску прозрачности."""
    if not MODEL.exists():
        raise SystemExit(f"Не найдена модель {MODEL}")

    source = Image.open(path).convert("RGB")
    original = np.array(source)

    small = np.array(source.resize((320, 320), Image.LANCZOS)).astype(np.float32)
    small = small / max(small.max(), 1.0)
    normalized = np.zeros_like(small)
    for channel, mean, std in ((0, 0.485, 0.229), (1, 0.456, 0.224), (2, 0.406, 0.225)):
        normalized[:, :, channel] = (small[:, :, channel] - mean) / std

    session = ort.InferenceSession(str(MODEL), providers=["CPUExecutionProvider"])
    raw = session.run(None, {
        session.get_inputs()[0].name: normalized.transpose(2, 0, 1)[None].astype(np.float32),
    })[0][0][0]

    span = raw.max() - raw.min()
    mask = (raw - raw.min()) / (span if span else 1.0)
    mask = cv2.resize(mask, (original.shape[1], original.shape[0]), interpolation=cv2.INTER_LINEAR)

    # Подрезаем и растушёвываем край: прежний фон был светлым, и без этого по
    # контуру остаётся заметная кайма.
    mask = cv2.erode(mask, np.ones((3, 3), np.uint8), iterations=2)
    mask = cv2.GaussianBlur(mask, (0, 0), 1.6)

    gray = cv2.cvtColor(original, cv2.COLOR_RGB2GRAY)
    return gray, np.clip(mask, 0, 1)


def crop(gray: np.ndarray, mask: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    rows = np.where(mask.max(axis=1) > 0.04)[0]
    cols = np.where(mask.max(axis=0) > 0.04)[0]
    if not len(rows) or not len(cols):
        return gray, mask

    pad_y = int(gray.shape[0] * 0.015)
    pad_x = int(gray.shape[1] * 0.015)
    y0 = max(0, rows[0] - pad_y)
    y1 = min(gray.shape[0], rows[-1] + pad_y)
    x0 = max(0, cols[0] - pad_x)
    x1 = min(gray.shape[1], cols[-1] + pad_x)
    return gray[y0:y1, x0:x1], mask[y0:y1, x0:x1]


def reframe(gray: np.ndarray, mask: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Портретный кадр 4:5, привязанный к голове.

    Квадрат из исходника показывал слишком много свитера: лицо получалось
    мелким, а срезанные краем кадра плечи бросались в глаза. Кадр по голове
    читается как обычный портрет, а не как вырезанная фигура без плеч.
    """
    height, width = gray.shape
    solid = mask > 0.5

    rows = np.where(solid.any(axis=1))[0]
    top = int(rows[0]) if len(rows) else 0

    band = solid[top:top + max(1, int(height * 0.35))]
    xs = np.where(band.any(axis=0))[0]
    face_x = int((xs[0] + xs[-1]) / 2) if len(xs) else width // 2

    new_h = height
    new_w = int(round(new_h * ASPECT))
    if new_w > width:
        new_w = width
        new_h = int(round(new_w / ASPECT))

    x0 = int(np.clip(face_x - new_w // 2, 0, width - new_w))
    y0 = int(np.clip(top - int(new_h * 0.04), 0, height - new_h))
    return gray[y0:y0 + new_h, x0:x0 + new_w], mask[y0:y0 + new_h, x0:x0 + new_w]


def duotone(gray: np.ndarray) -> np.ndarray:
    """Серое в две краски палитры. Заодно поднимает тени, иначе тёмный свитер
    пропадает на почти чёрном полотне страницы."""
    value = gray.astype(np.float32) / 255.0
    value = np.clip(value * 1.06 + 0.06, 0, 1)
    value = value ** 0.92

    out = np.zeros(gray.shape + (3,), dtype=np.float32)
    for channel in range(3):
        out[:, :, channel] = SHADOW[channel] + (HIGHLIGHT[channel] - SHADOW[channel]) * value
    return np.clip(out, 0, 255).astype(np.uint8)


def main() -> int:
    if len(sys.argv) < 2:
        raise SystemExit("Укажите путь к исходному фото")

    source = Path(sys.argv[1])
    if not source.exists():
        raise SystemExit(f"Не найден файл {source}")

    gray, mask = reframe(*crop(*cutout(source)))

    height = round(gray.shape[0] * TARGET_W / gray.shape[1])
    gray = cv2.resize(gray, (TARGET_W, height), interpolation=cv2.INTER_AREA)
    mask = cv2.resize(mask, (TARGET_W, height), interpolation=cv2.INTER_AREA)

    # Плечи упираются в края кадра, поэтому низ и бока растворяются — иначе
    # силуэт обрывался бы ровными линиями прямо посреди страницы.
    fade_rows = max(1, int(height * FADE))
    mask[height - fade_rows:, :] *= (np.linspace(1.0, 0.0, fade_rows) ** 1.5)[:, None]

    fade_cols = max(1, int(TARGET_W * SIDE_FADE))
    side = (np.linspace(0.0, 1.0, fade_cols) ** 1.2)
    mask[:, :fade_cols] *= side[None, :]
    mask[:, TARGET_W - fade_cols:] *= side[::-1][None, :]

    top_rows = max(1, int(height * TOP_FADE))
    mask[:top_rows, :] *= (np.linspace(0.0, 1.0, top_rows) ** 1.4)[:, None]

    rgba = np.dstack([duotone(gray), (mask * 255).astype(np.uint8)])

    OUT.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(rgba, mode="RGBA").save(OUT, "WEBP", quality=88, method=6)

    sys.stdout.reconfigure(encoding="utf-8")
    print(f"{OUT.relative_to(ROOT)} - {TARGET_W}x{height}, {OUT.stat().st_size / 1024:.0f} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
