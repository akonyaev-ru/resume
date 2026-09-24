"""Проверки выкладки без внешней сети: звёзды, метка выпуска, папка сайта.

    python tools/check_publish.py

Выкладка не должна падать из-за чужого сервиса и не должна публиковать
служебное. Звёзды спрашиваются у подставного сервера на 127.0.0.1, который
рвёт соединение, недодаёт ответ и отвечает не тем; метка выпуска ставится
дважды; папка сайта собирается из временной копии проекта с мусором вокруг.
"""

from __future__ import annotations

import contextlib
import http.server
import importlib.util
import io
import json
import os
import shutil
import sys
import tempfile
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

results: list[bool] = []


def load(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def check(name: str, fn) -> None:
    try:
        note = fn()
        results.append(True)
        print("  ✓ " + name + (": " + note if note else ""))
    # SystemExit тоже красный: stamp_assets до 5.79 отказывал именно им, и без
    # этого первая же красная проверка обрывала весь прогон.
    except (Exception, SystemExit) as error:  # noqa: BLE001 — любая ошибка проверки — красный
        results.append(False)
        print("  ✗ " + name + ": " + f"{type(error).__name__}: {error}")


def fail(message: str) -> None:
    raise AssertionError(message)


# --- звёзды и выпуски ----------------------------------------------------------

fs = load("fetch_stats", ROOT / "scripts" / "fetch_stats.py")


class GitHub(http.server.BaseHTTPRequestHandler):
    """Подставной API: первый сегмент пути выбирает, как он сломан."""

    def log_message(self, *args):  # журнал запросов в выводе проверок не нужен
        pass

    def reply(self, code: int, body: str) -> None:
        data = body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):  # noqa: N802 — имя задаёт http.server
        mode = self.path.split("/")[1]
        release = self.path.endswith("/releases/latest")
        if mode == "disconnect":
            return                                   # ответа нет: соединение закроется
        if mode == "truncated":
            self.send_response(200)
            self.send_header("Content-Length", "1000")
            self.end_headers()
            self.wfile.write(b'{"stargazers_count"')
            return
        if mode == "array":
            return self.reply(200, "[]")
        if mode == "garbage":
            return self.reply(200, "<html>rate limit</html>")
        if release and mode == "norelease":
            return self.reply(404, '{"message": "Not Found"}')
        if release:
            return self.reply(200, '{"tag_name": "v2026.1", "published_at": "2026-09-01T10:00:00Z"}')
        return self.reply(200, '{"stargazers_count": 5}')


@contextlib.contextmanager
def github():
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), GitHub)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        yield f"http://127.0.0.1:{server.server_address[1]}"
    finally:
        server.shutdown()
        server.server_close()


def run_stats(base: str, mode: str):
    """main() против подставного API: код и записанные данные."""
    resume = ROOT / "tools" / "_stats_resume_probe.js"
    out = ROOT / "tools" / "_stats_probe.js"
    resume.write_text("projects: [{ repo: 'owner/one' }]", encoding="utf-8")
    saved = fs.API, fs.RELEASE_API, fs.RESUME, fs.OUT, fs.TIMEOUT
    fs.API = base + "/" + mode + "/repos/{repo}"
    fs.RELEASE_API = base + "/" + mode + "/repos/{repo}/releases/latest"
    fs.RESUME, fs.OUT, fs.TIMEOUT = resume, out, 5
    log = io.StringIO()
    try:
        with contextlib.redirect_stdout(log), contextlib.redirect_stderr(log):
            code = fs.main()
        text = out.read_text(encoding="utf-8")
        data = json.loads(text[text.index("{"):text.rindex("}") + 1])
        return code, data
    finally:
        fs.API, fs.RELEASE_API, fs.RESUME, fs.OUT, fs.TIMEOUT = saved
        for probe in (resume, out):
            if probe.exists():
                probe.unlink()


def stats_failures():
    with github() as base:
        for mode in ("disconnect", "truncated", "array", "garbage"):
            code, data = run_stats(base, mode)
            if code != 0 or data.get("repos") != {}:
                fail(f"{mode}: код {code}, данные {data}")
    return "обрыв, недокачка, массив вместо объекта, HTML — код 0, счётчиков просто нет"


def stats_normal():
    with github() as base:
        code, data = run_stats(base, "ok")
    want = {"owner/one": {"stars": 5, "release": {"tag": "v2026.1", "date": "2026-09-01"}}}
    if code != 0 or data.get("repos") != want:
        fail(f"код {code}, данные {data}")
    return "звёзды и выпуск записаны"


def stats_no_release():
    with github() as base:
        code, data = run_stats(base, "norelease")
    if code != 0 or data.get("repos") != {"owner/one": {"stars": 5, "release": None}}:
        fail(f"код {code}, данные {data}")
    return "нет выпусков — звёзды есть, строки о выпуске нет"


# --- метка выпуска -------------------------------------------------------------

def stamp_twice():
    """Второй запуск по уже подписанному index.html падал «не нашлось ссылок»:
    подписанную разметку, случайно попавшую в коммит, CI не собрал бы."""
    sa = load("stamp_assets", ROOT / "tools" / "stamp_assets.py")
    work = Path(tempfile.mkdtemp())
    shutil.copy(ROOT / "index.html", work / "index.html")
    saved_root, saved_sha = sa.ROOT, os.environ.get("GITHUB_SHA")
    sa.ROOT = work
    try:
        with contextlib.redirect_stdout(io.StringIO()):
            os.environ["GITHUB_SHA"] = "aaaaaaa1111"
            first = sa.main()
            os.environ["GITHUB_SHA"] = "bbbbbbb2222"
            second = sa.main()
        html = (work / "index.html").read_text(encoding="utf-8")
    finally:
        sa.ROOT = saved_root
        if saved_sha is None:
            os.environ.pop("GITHUB_SHA", None)
        else:
            os.environ["GITHUB_SHA"] = saved_sha
        shutil.rmtree(work)
    if first != 0 or second != 0:
        fail(f"коды {first}, {second}")
    if "?v=aaaaaaa" in html or html.count("?v=bbbbbbb") != 7 or "?v=bbbbbbb?v=" in html:
        fail("метки: " + ", ".join(sorted(set(part.split('"')[0] for part in html.split("?v=")[1:]))))
    return "второй запуск переподписал все 7 ссылок, метка одна"


# --- папка сайта ---------------------------------------------------------------

SITE = {"index.html", "en.html", "404.html", "sitemap.xml", "assets", "data", "dist"}


def project_copy() -> Path:
    """Копия проекта в том виде, в каком её видит CI перед выкладкой, с мусором вокруг."""
    work = Path(tempfile.mkdtemp())
    for name in ("index.html", "404.html", "sitemap.xml"):
        shutil.copy(ROOT / name, work / name)
    shutil.copy(ROOT / "index.html", work / "en.html")
    for name in ("assets", "data"):
        shutil.copytree(ROOT / name, work / name)
    (work / "dist").mkdir()
    (work / "dist" / "resume.html").write_text("<!doctype html><title>один файл</title>", encoding="utf-8")
    (work / "dist" / "fragment.html").write_text("старая сборка", encoding="utf-8")
    for junk in ("PROJECT_SPEC.md", "README.md", "MEMORY.md", ".gitignore", "Mask-group.png",
                 "tools/check_pet.js", "scripts/fetch_records.py", "scripts/__pycache__/x.pyc"):
        path = work / junk
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("служебное", encoding="utf-8")
    return work


def build(work: Path):
    bs = load("build_site", ROOT / "tools" / "build_site.py")
    out = Path(tempfile.mkdtemp()) / "_site"
    with contextlib.redirect_stdout(io.StringIO()):
        problems = bs.build(work, out)
    return out, problems


def site_only_pages():
    work = project_copy()
    try:
        out, problems = build(work)
        top = {p.name for p in out.iterdir()}
        dist = {p.name for p in (out / "dist").iterdir()}
        shutil.rmtree(out.parent)
    finally:
        shutil.rmtree(work)
    if problems:
        fail("; ".join(problems))
    if top != SITE or dist != {"resume.html"}:
        fail(f"в папке: {sorted(top)}, в dist: {sorted(dist)}")
    return "страницы, assets, data и dist/resume.html — служебного нет"


def site_missing_reference():
    work = project_copy()
    try:
        (work / "assets" / "img" / "portrait.webp").unlink()
        out, problems = build(work)
        shutil.rmtree(out.parent)
    finally:
        shutil.rmtree(work)
    if not any("assets/img/portrait.webp" in p for p in problems):
        fail("пропажа портрета не замечена: " + "; ".join(problems))
    return "ссылка из data/resume.js на пропавший портрет — отказ"


def site_missing_page():
    work = project_copy()
    try:
        (work / "en.html").unlink()
        out, problems = build(work)
        shutil.rmtree(out.parent)
    finally:
        shutil.rmtree(work)
    if not any("en.html" in p for p in problems):
        fail("пропажа en.html не замечена: " + "; ".join(problems))
    return "нет английской копии — отказ"


def single_file_self_contained():
    work = project_copy()
    try:
        (work / "dist" / "resume.html").write_text('<script src="assets/js/app.js"></script>', encoding="utf-8")
        out, problems = build(work)
        shutil.rmtree(out.parent)
    finally:
        shutil.rmtree(work)
    if not any("dist/resume.html" in p for p in problems):
        fail("ссылка одиночной копии наружу не замечена: " + "; ".join(problems))
    return "одиночная копия со ссылкой на файл рядом — отказ"


check("звёзды: сбои GitHub не роняют выкладку", stats_failures)
check("звёзды: нормальный ответ записан", stats_normal)
check("звёзды: у проекта нет выпусков", stats_no_release)
check("метка выпуска: повторный запуск переподписывает", stamp_twice)
check("папка сайта: только страницы и их файлы", site_only_pages)
check("папка сайта: битая ссылка из скрипта — отказ", site_missing_reference)
check("папка сайта: нет страницы — отказ", site_missing_page)
check("папка сайта: одиночная копия ни на что не ссылается", single_file_self_contained)

failed = results.count(False)
print(f"\nИтог: {len(results)} проверок, " + (f"{failed} упало" if failed else "все зелёные"))
sys.exit(1 if failed else 0)
