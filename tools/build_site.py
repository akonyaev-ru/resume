"""Собирает папку сайта `_site/` — ровно то, что отдаёт GitHub Pages.

    python tools/build_site.py

До 5.79 выкладка публиковала весь репозиторий (`upload-pages-artifact` с
`path: "."`): на домене резюме отдавались PROJECT_SPEC.md, README.md, tools/,
scripts/ и даже `.pyc` из прогона проверок. Теперь публикуются страницы, их
стили, скрипты, данные и картинки — по списку, — и перед выкладкой
проверяется, что каждая локальная ссылка из страниц, стилей и скриптов ведёт
на файл внутри папки: забытый в списке файл дал бы 404 на живом сайте.

Запускается в CI после сборок `en.html` и `dist/resume.html`.
"""

from __future__ import annotations

import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Страницы и то, без чего они не работают. Однофайловая версия тоже страница:
# её раздают ссылкой, и она не должна ссылаться ни на что рядом с собой.
PAGES = ["index.html", "en.html", "404.html", "sitemap.xml", "dist/resume.html"]
FOLDERS = ["assets", "data"]

HTML_REF = re.compile(r'\b(?:src|href)="([^"]+)"')
CSS_REF = re.compile(r"url\(\s*['\"]?([^'\")]+)")
# Путь строкой в скрипте: портрет в data/resume.js. Считается от страницы, то есть от корня.
JS_REF = re.compile(r"""['"]((?:assets|data)/[^'"?#\s]+)['"]""")
FOREIGN = re.compile(r"^(?:[a-z][a-z0-9+.-]*:|//|#)", re.I)


def local(ref: str) -> str | None:
    """Путь внутри сайта или None для чужого адреса, якоря и data:-ссылки."""
    if not ref or FOREIGN.match(ref):
        return None
    return ref.split("#", 1)[0].split("?", 1)[0] or None


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
            need(script, ref, site)
    return problems


def build(root: Path, out: Path) -> list[str]:
    """Копирует страницы и их папки из root в out; возвращает список отказов."""
    problems: list[str] = []
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)

    for name in PAGES:
        source = root / name
        if not source.is_file():
            problems.append(f"нет страницы {name}")
            continue
        (out / name).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, out / name)

    for name in FOLDERS:
        source = root / name
        if not source.is_dir():
            problems.append(f"нет папки {name}")
            continue
        shutil.copytree(source, out / name, ignore=shutil.ignore_patterns("__pycache__", "*.pyc", ".*"))

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
