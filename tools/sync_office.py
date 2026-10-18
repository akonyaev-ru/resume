"""Переносит исходники пиксельного офиса из рабочей папки в репозиторий: `.proto/design/{office,windows,octopus}` -> `office/`.

    py tools/sync_office.py

Запускается локально (рабочая папка `.proto/` в репозиторий не входит). Берётся только то, из чего собирается страница
офиса и чем сделаны её рисунки: страница, движок, рисунки предметов и костюмов, их генераторы, окна разделов, пиксельный
шрифт. Не берутся картинки Gemini и их нарезка (эскиз, по которому офис рисовался), референсы, снимки и служебные
сравнения. После копии проверяет, что из `office/` собирается та же страница, что из рабочей папки, и что генераторы
рисунков предметов и костюмов дают те же файлы, что лежат рядом.
"""

from __future__ import annotations

import filecmp
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT / ".proto" / "design"
DEST = ROOT / "office"

FILES = {
    "office": [
        "greybox.html",
        "pix/build_demo.py", "pix/objects.py", "pix/agents.py", "pix/medals.py",
        "pix/pix.js", "pix/rooms.js", "pix/objects.js", "pix/agents.js", "pix/medals.js", "pix/field.js", "pix/drift.js", "pix/office3d.js",
        "pix/traced/showcase_office.json",
        "art/work/t16/art.js", "art/work/plan.json", "art/work/a/objects.json",
    ],
    "windows": [
        "variant_1.js", "variant_1.css", "variant_2.js", "variant_2.css", "variant_3.js", "variant_3.css",
        "v3x.js", "v3x.css", "phone.js", "tetris/keys.js", "tetris/mock.js",
        "fonts/fonts.css", "fonts/PressStart2P.ttf", "fonts/PressStart2P-OFL.txt",
    ],
    "octopus": [
        "make_octopus.py", "make_octopus_v2.py", "make_octopus_v3.py", "make_octopus_v5.py",
        "manifest.json", "v2/manifest.json", "v3/manifest.json", "v5/manifest.json", "00_otto.png",
    ],
}
TARGET = {"office": DEST, "windows": DEST / "windows", "octopus": DEST / "octopus"}


def copy() -> int:
    n = 0
    for part, names in FILES.items():
        for name in names:
            src, dst = WORK / part / name, TARGET[part] / name
            if not src.is_file():
                raise SystemExit(f"нет файла {src}")
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
            n += 1
    # лишнее от прошлых переносов
    keep = {TARGET[p] / name for p, names in FILES.items() for name in names} | {DEST / "README.md", DEST / "og.jpg"}
    for path in sorted(DEST.rglob("*")):
        if path.is_file() and path not in keep and "dist" not in path.parts:
            print("  убран", path.relative_to(ROOT).as_posix())
            path.unlink()
    return n


def build(script: Path, out: Path) -> None:
    subprocess.run([sys.executable, str(script), "--prod", str(out)], check=True, capture_output=True)


def main() -> int:
    n = copy()
    print(f"office/: файлов {n}")
    tmp = Path(tempfile.mkdtemp())
    try:
        # та же страница из репозитория и из рабочей папки
        build(DEST / "pix" / "build_demo.py", tmp / "a.html")
        build(WORK / "office" / "pix" / "build_demo.py", tmp / "b.html")
        same = filecmp.cmp(tmp / "a.html", tmp / "b.html", shallow=False)
        print("страница из office/ = из рабочей папки:", "да" if same else "НЕТ")
        # генераторы рисунков из опубликованного дают опубликованное
        sand = tmp / "site"
        shutil.copytree(DEST, sand / "office", ignore=shutil.ignore_patterns("dist"))
        (sand / "assets" / "js").mkdir(parents=True)
        shutil.copy2(ROOT / "assets" / "js" / "pet.js", sand / "assets" / "js" / "pet.js")
        ok = same
        for gen, made in (("objects.py", "objects.js"), ("agents.py", "agents.js"), ("medals.py", "medals.js")):
            subprocess.run([sys.executable, str(sand / "office" / "pix" / gen)], check=True, capture_output=True)
            eq = filecmp.cmp(sand / "office" / "pix" / made, DEST / "pix" / made, shallow=False)
            print(f"{gen} даёт тот же {made}:", "да" if eq else "НЕТ")
            ok = ok and eq
        return 0 if ok else 1
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
