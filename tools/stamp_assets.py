# -*- coding: utf-8 -*-
"""Подписывает ссылки на стили и скрипты меткой выпуска.

    python tools/stamp_assets.py

GitHub Pages отдаёт файлы с `Cache-Control: max-age=600`, а браузеры держат их
и дольше. Из-за этого свежая выкладка доходила до владельца через раз: он видел
старый `pet.js` и справедливо говорил, что правка не сделана. Метка в адресе
меняется с каждым выпуском, поэтому браузер обязан скачать файл заново.

Метка — короткий SHA коммита (`GITHUB_SHA`), а вне раннера отметка времени.
Скрипт работает по `index.html`; английская копия собирается из него следом и
метку унаследует.
"""

from __future__ import annotations

import os
import re
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Что подписываем: свои стили и свои скрипты. Шрифты с Google Fonts и прочее
# чужое не трогаем — их адреса нам не принадлежат.
PATTERN = re.compile(r'(?P<attr>href|src)="(?P<path>(?:assets|data)/[^"?]+\.(?:css|js))"')


def stamp() -> str:
    sha = os.environ.get("GITHUB_SHA", "")
    return sha[:7] if sha else time.strftime("%Y%m%d%H%M")


def main() -> int:
    mark = stamp()
    path = ROOT / "index.html"
    html = path.read_text(encoding="utf-8")

    html, count = PATTERN.subn(
        lambda m: '%s="%s?v=%s"' % (m.group("attr"), m.group("path"), mark), html
    )

    if not count:
        raise SystemExit("В index.html не нашлось ссылок на свои стили и скрипты")

    path.write_text(html, encoding="utf-8", newline="\n")
    print(f"index.html: подписано ссылок {count}, метка {mark}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
