"""Собирает страницу в один HTML-файл: стили, скрипты и данные внутрь разметки.

    python tools/build_single.py              -> dist/resume.html  (полный документ)
    python tools/build_single.py --fragment   -> dist/fragment.html (без обвязки
                                                 html/head/body — для вставки)

Шрифты остаются ссылкой на Google Fonts: без сети подхватятся запасные
из font-family. Всё остальное работает офлайн, файл можно просто отправить.
"""

from __future__ import annotations

import base64
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"

LINK = re.compile(r'\s*<link rel="stylesheet" href="(assets/css/[^"]+)" />')
SCRIPT = re.compile(r'\s*<script src="([^"]+)"></script>')
# Путь к картинке встречается в двух видах: от корня сайта в разметке и
# скрипте, относительным — в стилях, которые лежат этажом ниже.
IMAGE = re.compile(r"(?:assets|\.\.)/img/([\w.-]+)")

MIME = {
    ".webp": "image/webp",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
}


def inline(html: str) -> str:
    def css(match: re.Match[str]) -> str:
        body = (ROOT / match.group(1)).read_text(encoding="utf-8")
        return "\n  <style>\n" + body + "\n  </style>"

    def js(match: re.Match[str]) -> str:
        body = (ROOT / match.group(1)).read_text(encoding="utf-8")
        # </script> внутри строки оборвал бы тег раньше времени.
        body = body.replace("</script>", "<\\/script>")
        return "\n  <script>\n" + body + "\n  </script>"

    return inline_images(SCRIPT.sub(js, LINK.sub(css, html)))


def inline_images(html: str) -> str:
    """Пути к картинкам превращаются в data:-ссылки — и в разметке, и внутри
    вшитого скрипта, где путь к портрету лежит обычной строкой."""
    def replace(match: re.Match[str]) -> str:
        path = ROOT / "assets" / "img" / match.group(1)
        if not path.exists():
            return match.group(0)
        payload = base64.b64encode(path.read_bytes()).decode("ascii")
        mime = MIME.get(path.suffix.lower(), "application/octet-stream")
        return f"data:{mime};base64,{payload}"

    return IMAGE.sub(replace, html)


def to_fragment(html: str) -> str:
    """Оставляет содержимое body плюс title, шрифты и стили из head."""
    head = re.search(r"<head>(.*?)</head>", html, re.S)
    body = re.search(r"<body>(.*?)</body>", html, re.S)
    if not head or not body:
        raise SystemExit("Не найдены head или body — разметка index.html изменилась")

    keep = []
    for pattern in (
        r"<title>.*?</title>",
        r'<link rel="stylesheet" href="https://fonts\.googleapis\.com[^"]*" />',
        r"<style>.*?</style>",
    ):
        found = re.search(pattern, head.group(1), re.S)
        if found:
            keep.append(found.group(0))

    return "\n".join(keep) + "\n" + body.group(1).strip() + "\n"


def main() -> int:
    html = inline((ROOT / "index.html").read_text(encoding="utf-8"))
    fragment = "--fragment" in sys.argv

    DIST.mkdir(exist_ok=True)
    out = DIST / ("fragment.html" if fragment else "resume.html")
    out.write_text(to_fragment(html) if fragment else html, encoding="utf-8")

    size = out.stat().st_size / 1024
    print(f"{out.relative_to(ROOT)} — {size:.0f} КБ")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
