"""Готовит портрет для страницы: вырезает фон, кадрирует, красит в палитру сайта.

    python tools/prep_portrait.py "путь/к/фото.png"

Результат — assets/img/portrait.webp с прозрачным фоном.

Фон снимает u2net — сеть из ~/.u2net, запускается напрямую через onnxruntime,
чтобы не тянуть в окружение сам rembg. Берётся портретная `u2net_human_seg`,
а если её там нет — общая `u2net`: на снимке с человеком она справляется не
хуже. Если нет ни одной, скрипт честно об этом говорит и ничего не делает.

Дальше с края снимается кайма прежнего фона: фон на снимке не белый, а серый
с градиентом сверху вниз, поэтому его яркость оценивается отдельно в каждой
точке, и краевые пиксели, похожие на здешний фон, гасятся, а у оставшихся
примесь фона вычитается. Полутона переводятся в дуотон от
синевато-тёмного к почти белому: иначе чёрный свитер сливается с полотном
страницы. Растворяется только низ, где силуэт обрезан краем кадра; по остальным
сторонам вырезка идёт точно по контуру, а объём портрету на странице добавляют
свечение по силуэту и параллакс — оба живут в стилях и скрипте, не в картинке.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "img" / "portrait.webp"
# Сначала ищем портретную сеть, потом общую: в ~/.u2net может лежать любая из
# двух, и на снимке с человеком общая справляется не хуже.
MODELS = (
    Path.home() / ".u2net" / "u2net_human_seg.onnx",
    Path.home() / ".u2net" / "u2net.onnx",
)


def model_path() -> Path:
    for path in MODELS:
        if path.exists():
            return path
    raise SystemExit("Не найдена модель: " + " или ".join(str(p) for p in MODELS))


# Ниже — то, ради чего раньше тянулся OpenCV. Он в окружении не стоит, а всё
# нужное есть в scipy и PIL, поэтому зависимость снята. `mirror` у scipy — это
# то же краевое условие, что BORDER_REFLECT_101 у OpenCV по умолчанию.
def box_blur(a: np.ndarray, window: int) -> np.ndarray:
    return ndimage.uniform_filter(a, size=window, mode="mirror")


def gauss(a: np.ndarray, sigma: float) -> np.ndarray:
    return ndimage.gaussian_filter(a, sigma=sigma, mode="mirror")


def erode(a: np.ndarray, iterations: int = 1) -> np.ndarray:
    """Эрозия плоским элементом 3x3 — это минимум по окну 3x3."""
    for _ in range(iterations):
        a = ndimage.minimum_filter(a, size=3, mode="nearest")
    return a


def scale(a: np.ndarray, width: int, height: int, smooth: bool) -> np.ndarray:
    """`smooth=True` — усреднение по площади (для уменьшения), иначе билинейно.

    Возвращается копия, а не представление поверх PIL: то приходит только для
    чтения, а маску вызывающий код правит на месте.
    """
    mode = Image.BOX if smooth else Image.BILINEAR
    return np.array(
        Image.fromarray(a.astype(np.float32), mode="F").resize((width, height), mode),
        dtype=np.float32,
    )


def to_gray(rgb: np.ndarray) -> np.ndarray:
    """Те же веса, что у OpenCV в RGB2GRAY."""
    return (rgb[:, :, 0] * 0.299 + rgb[:, :, 1] * 0.587 + rgb[:, :, 2] * 0.114).astype(np.float32)

TARGET_W = 760          # ширина итогового файла, px (показывается вдвое меньше)
ASPECT = 0.92           # ширина к высоте кадра
HEAD_RATIO = 2.05       # высота кадра в высотах головы
BG_TOL = 26.0           # насколько близко к фону, чтобы считать пиксель фоном
RIM_HEADROOM = 10.0     # насколько кромке позволено быть ярче внутренности
SHADOW = (0x1b, 0x22, 0x30)   # куда уходят тени — синевато-тёмный из палитры
HIGHLIGHT = (0xe9, 0xec, 0xf4)  # куда уходят света
# Растворяется только низ, и совсем немного: там силуэт обрезан краем кадра.
# По бокам и сверху вырезка идёт точно по контуру — размытые края лишали
# портрет веса, он выглядел призраком.
FADE = 0.08
SIDE_FADE = 0.0
TOP_FADE = 0.0


def background(gray: np.ndarray, mask: np.ndarray) -> np.ndarray:
    """Яркость фона в каждой точке кадра.

    Фон на снимке не белый и не ровный — серый с градиентом сверху вниз, — так
    что одним числом его не описать. Усредняем только заведомо фоновые пиксели,
    расширяя окно, пока не покроем весь кадр: у силуэта фон всегда рядом,
    а что творится в его середине, нам и не нужно.
    """
    known = (mask < 0.03).astype(np.float32)
    value = gray * known
    out = np.zeros_like(gray)
    filled = np.zeros_like(gray)

    for window in (51, 121, 241, 481):
        num = box_blur(value, window)
        den = box_blur(known, window)
        fresh = (den > 1e-4) & (filled < 0.5)
        out[fresh] = num[fresh] / den[fresh]
        filled[fresh] = 1.0

    if (filled < 0.5).any():
        out[filled < 0.5] = float(gray[known > 0.5].mean()) if known.any() else 200.0

    return gauss(out, 12)


def cutout(path: Path) -> tuple[np.ndarray, np.ndarray]:
    """Возвращает картинку в оттенках серого и маску прозрачности."""
    model = model_path()

    source = Image.open(path).convert("RGB")
    original = np.array(source)

    small = np.array(source.resize((320, 320), Image.LANCZOS)).astype(np.float32)
    small = small / max(small.max(), 1.0)
    normalized = np.zeros_like(small)
    for channel, mean, std in ((0, 0.485, 0.229), (1, 0.456, 0.224), (2, 0.406, 0.225)):
        normalized[:, :, channel] = (small[:, :, channel] - mean) / std

    session = ort.InferenceSession(str(model), providers=["CPUExecutionProvider"])
    raw = session.run(None, {
        session.get_inputs()[0].name: normalized.transpose(2, 0, 1)[None].astype(np.float32),
    })[0][0][0]

    span = raw.max() - raw.min()
    mask = (raw - raw.min()) / (span if span else 1.0)
    mask = scale(mask, original.shape[1], original.shape[0], smooth=False)

    gray = to_gray(original)
    bg = background(gray, mask)

    # Кайма. Сеть оставляет по контуру полупрозрачные пиксели, и в них сидит
    # прежний фон: волосы и плечи обводило светлым ореолом. Гасим те краевые
    # пиксели, что похожи на здешний фон; глубину силуэта не трогаем, иначе
    # выело бы светлое лицо.
    core = erode((mask > 0.6).astype(np.float32), iterations=4)
    core = gauss(core, 2.0)
    similar = np.clip(1.0 - np.abs(gray - bg) / BG_TOL, 0, 1)
    mask = np.clip(mask * (1.0 - similar * (1.0 - core)), 0, 1)

    mask = erode(mask, iterations=1)
    mask = np.clip(gauss(mask, 1.0), 0, 1)

    # У тех краевых пикселей, что остались, вычитаем примесь фона: они смесь
    # его и силуэта, и без вычитания остаются светлее, чем есть на самом деле.
    lean = np.where(mask > 0.02, (gray - (1 - mask) * bg) / np.maximum(mask, 0.25), gray)

    # Потолок для кромки. Оценка фона не идеальна, и там, где она занижена,
    # вычитание оставляет краевой пиксель светлее, чем он есть: по контуру волос
    # это читалось светлой обводкой, и владелец её видел. Ярче ближней
    # внутренности силуэта кромке быть неоткуда, поэтому просто не даём.
    # Внутренность берём минимумом по окну 9x9 среди уверенно непрозрачных
    # пикселей; запас в 10 единиц сохраняет живой перепад на границе, но снимает
    # ореол. Форму силуэта это не трогает — только яркость, — поэтому тонкие
    # пряди остаются на месте, чего не даёт ни более широкий BG_TOL, ни лишняя
    # эрозия: те убирают ореол хуже и вдобавок подъедают контур.
    inner = ndimage.grey_erosion(np.where(mask > 0.9, lean, 255.0), size=9)
    rim = (mask > 0.02) & (mask < 0.9)
    lean = np.where(rim, np.minimum(lean, inner + RIM_HEADROOM), lean)

    return np.clip(lean, 0, 255).astype(np.uint8), mask


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
    gray = scale(gray, target_w, height, smooth=True)
    mask = scale(mask, target_w, height, smooth=True)

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
