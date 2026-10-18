"""Собирает папку сайта `_site/` — ровно то, что отдаёт GitHub Pages.

    python tools/build_site.py

До 5.79 выкладка публиковала весь репозиторий (`upload-pages-artifact` с
`path: "."`): на домене резюме отдавались PROJECT_SPEC.md, README.md, tools/,
scripts/ и даже `.pyc` из прогона проверок. Теперь публикуются страницы, их
стили, скрипты, данные и картинки — по списку, — и перед выкладкой
проверяется, что каждая локальная ссылка из страниц, стилей и скриптов ведёт
на файл внутри папки: забытый в списке файл дал бы 404 на живом сайте.

С 17.10.2026 на главной (`/resume/`) — пиксельный офис, классическая версия
резюме — в `old/` со своими `assets/` и `data/`. Офис — одна страница со всем
внутри: её собирает `office/pix/build_demo.py --prod office/dist/index.html`,
рядом лежит картинка превью `office/og.jpg`. По прежним адресам английской и
однофайловой версий — страницы-переадресации в `old/`. С 18.10.2026 у офиса есть английская страница
`/resume/en/` (`build_demo.py --prod office/dist/en/index.html --lang en`).

Запускается в CI после сборок `en.html`, `dist/resume.html` и страницы офиса.
"""

from __future__ import annotations

import os
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Офис: собранная страница и картинка превью -> корень сайта; английская страница офиса (18.10.2026) -> en/.
OFFICE = {"office/dist/index.html": "index.html", "office/dist/en/index.html": "en/index.html", "office/og.jpg": "og.jpg"}
# Классическая версия и то, без чего она не работает, -> old/. Однофайловая
# версия тоже страница: её раздают ссылкой, и она не должна ссылаться ни на что
# рядом с собой.
OLD = "old"
PAGES = ["index.html", "en.html", "dist/resume.html"]
FOLDERS = ["assets", "data"]
# Общие для сайта — в корне.
ROOT_PAGES = ["404.html", "sitemap.xml"]
# Прежние адреса -> новые: страница-переадресация, чтобы розданные ссылки не вели в 404.
MOVED = {"en.html": "old/en.html", "dist/resume.html": "old/dist/resume.html"}
BASE = "https://akonyaev-ru.github.io/resume/"

HTML_REF = re.compile(r'\b(?:src|href)="([^"]+)"')
CSS_REF = re.compile(r"url\(\s*['\"]?([^'\")]+)")
# Путь строкой в скрипте: портрет в data/resume.js. Считается от страницы, то есть от папки, где лежит её index.html.
JS_REF = re.compile(r"""['"]((?:assets|data)/[^'"?#\s]+)['"]""")
FOREIGN = re.compile(r"^(?:[a-z][a-z0-9+.-]*:|//|#)", re.I)


def local(ref: str) -> str | None:
    """Путь внутри сайта или None для чужого адреса, якоря и data:-ссылки. Кусок кода во вшитом скрипте
    (`href="' + esc(c.email.href) + '"` — разметка, которую собирает скрипт офиса) адресом не считается."""
    if not ref or FOREIGN.match(ref) or re.search(r"['\"+\s{}$]", ref):
        return None
    return ref.split("#", 1)[0].split("?", 1)[0] or None


def page_root(path: Path, site: Path) -> Path:
    """Папка страницы, которой принадлежит файл: ближайшая выше, где лежит index.html."""
    d = path.parent
    while d != site and not (d / "index.html").is_file():
        d = d.parent
    return d


def broken(site: Path) -> list[str]:
    """Локальные ссылки, которым в папке сайта не на что указать."""
    site = site.resolve()
    problems: list[str] = []

    def need(owner: Path, ref: str, base: Path) -> None:
        path = local(ref)
        if path is None:
            return
        target = (base / path).resolve()
        if not target.is_relative_to(site) or not target.is_file():
            problems.append(f"{owner.relative_to(site).as_posix()}: нет файла {path}")

    for page in sorted(site.rglob("*.html")):
        text = page.read_text(encoding="utf-8")
        for ref in HTML_REF.findall(text) + JS_REF.findall(text):   # и во вшитых скриптах
            need(page, ref, page.parent)
    for sheet in sorted(site.rglob("*.css")):
        for ref in CSS_REF.findall(sheet.read_text(encoding="utf-8")):
            need(sheet, ref, sheet.parent)
    for script in sorted(site.rglob("*.js")):
        for ref in JS_REF.findall(script.read_text(encoding="utf-8")):
            need(script, ref, page_root(script, site))
    return problems


def moved_page(src: str, dst: str) -> str:
    """Страница-переадресация с прежнего адреса src на новый dst (оба — от корня сайта)."""
    rel = os.path.relpath(dst, os.path.dirname(src) or ".").replace(os.sep, "/")
    return (
        '<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n'
        f'<title>Страница переехала</title>\n<link rel="canonical" href="{BASE}{dst}">\n'
        f'<meta http-equiv="refresh" content="0; url={rel}">\n<meta name="robots" content="noindex">\n</head>\n'
        f'<body>\n<p>Страница переехала: <a href="{rel}">{BASE}{dst}</a></p>\n</body>\n</html>\n'
    )


def build(root: Path, out: Path) -> list[str]:
    """Копирует страницы и их папки из root в out; возвращает список отказов."""
    problems: list[str] = []
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)

    def put(source: Path, target: Path, what: str) -> None:
        if not source.is_file():
            problems.append(f"нет {what} {source.relative_to(root).as_posix()}")
            return
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)

    for src, dst in OFFICE.items():
        put(root / src, out / dst, "страницы офиса" if src.endswith(".html") else "файла офиса")
    for name in ROOT_PAGES:
        put(root / name, out / name, "страницы")
    for name in PAGES:
        put(root / name, out / OLD / name, "страницы")
    for name in FOLDERS:
        source = root / name
        if not source.is_dir():
            problems.append(f"нет папки {name}")
            continue
        shutil.copytree(source, out / OLD / name, ignore=shutil.ignore_patterns("__pycache__", "*.pyc", ".*"))
    for src, dst in MOVED.items():
        target = out / src
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(moved_page(src, dst), encoding="utf-8", newline="\n")

    problems += broken(out)
    files = sum(1 for path in out.rglob("*") if path.is_file())
    print(f"{out.name}: файлов {files}" + (f", отказов {len(problems)}" if problems else ""))
    return problems


def main() -> int:
    problems = build(ROOT, ROOT / "_site")
    for problem in problems:
        print("  " + problem)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
