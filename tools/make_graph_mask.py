# -*- coding: utf-8 -*-
"""Собирает маску декоративной схемы для раздела «Подход».

    python tools/make_graph_mask.py Mask-group.png

Исходник — картинка со схемой связей, которую прислал владелец. На страницу она
идёт не изображением, а маской (`mask-image` в `.graph`), и это не украшение
приёма, а способ снять с неё лишнее:

* В маске работает только альфа. Надписи на плашках («4X», «25%», «328%») и
  иконки нарисованы цветом внутри сплошной заливки — альфа там ровная, поэтому
  они пропадают целиком. Выдуманным числам рядом с настоящими показателями
  резюме делать нечего, а схема процессов разделу «Подход» по смыслу идёт.
* Цвет задаёт страница (`background-color: var(--accent)`), так что схема
  участвует в палитре, а не спорит с ней: в исходнике линии фиолетовые.
* Файл легчает втрое: цвет не нужен, остаётся серый с альфой.

Исходник в репозитории не хранится (см. `.gitignore`) — он нужен только здесь.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "img" / "graph.png"


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 2

    src = Path(sys.argv[1])
    if not src.is_absolute():
        src = ROOT / src

    image = Image.open(src).convert("RGBA")
    alpha = image.getchannel("A")

    # Серый + альфа: сама краска не нужна, форму несёт альфа-канал.
    mask = Image.merge("LA", (Image.new("L", image.size, 255), alpha))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    mask.save(OUT, optimize=True)

    print("%s -> %s (%d -> %d байт)" % (src.name, OUT.relative_to(ROOT),
                                        src.stat().st_size, OUT.stat().st_size))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
