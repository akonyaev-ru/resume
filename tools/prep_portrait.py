"""Готовит портрет для страницы: вырезает фон, кадрирует, красит в палитру сайта.

    python tools/prep_portrait.py "путь/к/фото.png"

Результат — assets/img/portrait.webp с прозрачным фоном.

Фон снимает u2net_human_seg — та же сеть, что внутри rembg, но запускается
напрямую через onnxruntime, чтобы не тянуть в окружение сам rembg. Модель
берётся из ~/.u2net; если её там нет, скрипт честно об этом говорит и ничего
не делает.

Дальше маска подрезается и растушёвывается на пиксель-другой — иначе по контуру
остаётся светлая кайма от прежнего фона, — а полутона переводятся в дуотон от
синевато-тёмного к почти белому: иначе чёрный свитер сливается с полотном
страницы. Растворяется только низ, где силуэт обрезан краем кадра; по остальным
сторонам вырезка идёт точно по контуру, а объём портрету на странице добавляют
свечение по силуэту и параллакс — оба живут в стилях и скрипте, не в картинке.
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
ASPECT = 0.88           # ширина к высоте кадра
HEAD_RATIO = 1.72       # высота кадра в высотах головы
SHADOW = (0x1b, 0x22, 0x30)   # куда уходят тени — синевато-тёмный из палитры
HIGHLIGHT = (0xe9, 0xec, 0xf4)  # куда уходят света
# Растворяется только низ, и совсем немного: там силуэт обрезан краем кадра.
# По бокам и сверху вырезка идёт точно по контуру — размытые края лишали
# портрет веса, он выглядел призраком.
FADE = 0.08
SIDE_FADE = 0.0
TOP_FADE = 0.0


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


def reframe(gray: np.ndarray, mask: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Кадр 4:5 по голове и плечам.

    Размер головы определяется по маске: плечи — первая строка, где силуэт
    резко расширяется. От этого и считается кадр, поэтому скрипт одинаково
    работает и с тесным портретом, и со снимком по пояс.
    """
    height, width = gray.shape
    solid = mask > 0.5
    widths = solid.sum(axis=1)

    rows = np.where(widths > 0)[0]
    if not len(rows):
        return gray, mask

    top = int(rows[0])
    bottom = int(rows[-1])
    subject = bottom - top + 1

    head_w = max(1, int(widths[top:top + max(1, int(subject * 0.12))].max()))
    shoulder = top + int(subject * 0.35)
    for row in range(top + max(1, int(subject * 0.05)), bottom + 1):
        if widths[row] > head_w * 1.6:
            shoulder = row
            break

    head_h = max(1, shoulder - top)
    new_h = int(min(height, head_h * HEAD_RATIO))
    new_w = int(round(new_h * ASPECT))
    if new_w > width:
        new_w = width
        new_h = int(round(new_w / ASPECT))

    band = solid[top:shoulder]
    xs = np.where(band.any(axis=0))[0]
    face_x = int((xs[0] + xs[-1]) / 2) if len(xs) else width // 2

    y0 = int(np.clip(top - head_h * 0.42, 0, max(0, height - new_h)))
    x0 = int(np.clip(face_x - new_w // 2, 0, max(0, width - new_w)))
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

    gray, mask = reframe(*cutout(source))

    # Вверх не растягиваем: мыла на портрете быть не должно.
    target_w = min(TARGET_W, gray.shape[1])
    height = round(gray.shape[0] * target_w / gray.shape[1])
    gray = cv2.resize(gray, (target_w, height), interpolation=cv2.INTER_AREA)
    mask = cv2.resize(mask, (target_w, height), interpolation=cv2.INTER_AREA)

    if FADE > 0:
        rows = max(1, int(height * FADE))
        mask[height - rows:, :] *= (np.linspace(1.0, 0.0, rows) ** 1.5)[:, None]

    if SIDE_FADE > 0:
        cols = max(1, int(target_w * SIDE_FADE))
        side = np.linspace(0.0, 1.0, cols) ** 1.2
        mask[:, :cols] *= side[None, :]
        mask[:, target_w - cols:] *= side[::-1][None, :]

    if TOP_FADE > 0:
        rows = max(1, int(height * TOP_FADE))
        mask[:rows, :] *= (np.linspace(0.0, 1.0, rows) ** 1.4)[:, None]

    alpha = (mask * 255).astype(np.uint8)
    # Почти прозрачное дожимаем до нуля: лоссовое сжатие размазывает такую
    # альфу, и на светлом фоне проступает прямоугольник картинки.
    alpha[alpha < 8] = 0

    rgba = np.dstack([duotone(gray), alpha])

    OUT.parent.mkdir(parents=True, exist_ok=True)
    # Цвет жмём с потерями, прозрачность — нет. Иначе на светлом фоне
    # проступает прямоугольник картинки: лоссовая альфа шумит по всему кадру.
    Image.fromarray(rgba, mode="RGBA").save(
        OUT, "WEBP", quality=90, alpha_quality=100, method=6,
    )

    sys.stdout.reconfigure(encoding="utf-8")
    print(f"{OUT.relative_to(ROOT)} - {target_w}x{height}, {OUT.stat().st_size / 1024:.0f} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
