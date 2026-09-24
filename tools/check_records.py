"""Проверки scripts/fetch_records.py без внешней сети: разбор таблицы, отбор, десятка.

    python tools/check_records.py

Таблица ответов открыта для записи кому угодно, поэтому главное здесь —
что чужое отбрасывается: ник не того вида или не из списка, счёт не число,
ноль, отрицательный, за потолком. Плюс порядок и срез десятки. И что ни
чужая строка, ни сбой сети не роняют выкладку и не стирают десятку:
`main()` гоняется против подставного сервера на 127.0.0.1.
"""

from __future__ import annotations

import contextlib
import http.server
import importlib.util
import io
import sys
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SPEC = importlib.util.spec_from_file_location("fetch_records", ROOT / "scripts" / "fetch_records.py")
fr = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(fr)

WORDS = fr.nick_words((ROOT / "assets" / "js" / "console.js").read_text(encoding="utf-8"))
W = sorted(WORDS)   # W[i] — i-е слово по алфавиту: ники в проверках строятся из настоящих слов

results: list[bool] = []


def check(name: str, fn) -> None:
    try:
        note = fn()
        results.append(True)
        print("  ✓ " + name + (": " + note if note else ""))
    except Exception as error:  # noqa: BLE001 — любая ошибка проверки — красный
        results.append(False)
        print("  ✗ " + name + ": " + str(error))


def fail(message: str) -> None:
    raise AssertionError(message)


def tsv(rows: list[list[str]], header: list[str] | None = None) -> str:
    lines = ["\t".join(header or ["Отметка времени", "nick", "score"])]
    lines += ["\t".join(row) for row in rows]
    return "\n".join(lines) + "\n"


def parse(rows: list[list[str]], header: list[str] | None = None):
    """Разбор строк «ник, счёт» с подставленной отметкой времени впереди."""
    return fr.parse(tsv([["2026-09-17 12:00:00"] + row for row in rows], header), WORDS)


def words_from_source():
    if len(WORDS) < 150:
        fail(f"слов {len(WORDS)}")
    return f"{len(WORDS)} слов"


def good_rows():
    got = parse([[W[0].upper() + "-07", "500"], [" " + W[1] + "-42 ", " 12 "]])
    if got != [(W[0] + "-07", 500), (W[1] + "-42", 12)]:
        fail(str(got))
    return "две строки, регистр и пробелы сняты"


def alien_nicks():
    got = parse([
        ["alexivan", "100"], ["guest", "100"], ["xyzzy-42", "100"], [W[0] + "-4", "100"],
        [W[0] + "-420", "100"], [W[0] + "42", "100"], ["", "100"], [W[0] + "-42 you", "100"],
    ])
    if got:
        fail(str(got))
    return "восемь чужих — ноль строк"


def alien_scores():
    got = parse([
        [W[0] + "-01", "x"], [W[0] + "-01", "0"], [W[0] + "-01", "-5"], [W[0] + "-01", str(fr.SCORE_MAX + 1)],
        [W[0] + "-01", "1.5"], [W[0] + "-01", ""], [W[0] + "-01", str(fr.SCORE_MAX)],
    ])
    if got != [(W[0] + "-01", fr.SCORE_MAX)]:
        fail(str(got))
    return "прошёл только потолок"


def columns_by_header():
    got = fr.parse(tsv([["77", "мусор", W[2] + "-33"]], header=["Score", "Комментарий", "Nick"]), WORDS)
    if got != [(W[2] + "-33", 77)]:
        fail(str(got))
    return "score первым, nick третьим — разобрано"


def missing_columns():
    try:
        fr.parse(tsv([["a", "b"]], header=["x", "y"]), WORDS)
    except ValueError:
        return "ValueError, как и должно"
    fail("разобрало таблицу без нужных столбцов")


def short_rows():
    if fr.parse("", WORDS):
        fail("из пустого текста что-то вышло")
    got = fr.parse(tsv([["2026-09-17"], []]), WORDS)
    if got:
        fail(str(got))
    return "пусто — пусто, обрывки пропущены"


def top_ten():
    rows = [
        (W[0] + "-00", 500), (W[1] + "-00", 100), (W[1] + "-00", 900), (W[0] + "-00", 300),
        (W[2] + "-00", 500), (W[3] + "-00", 700),
    ] + [(W[i] + "-00", 10 - i) for i in range(4, 14)]
    got = fr.top(rows)
    order = [row["nick"] for row in got]
    expect = [W[i] + "-00" for i in [1, 3, 0, 2, 4, 5, 6, 7, 8, 9]]
    if order != expect:
        fail(str(order))
    if got[0]["best"] != 900 or got[2]["best"] != 500:
        fail(str(got[:3]))
    if len(got) != fr.TOP_N:
        fail(f"строк {len(got)}")
    return "повтор ника схлопнут в лучший, ничья 500 за более ранним, лишнее отрезано"


def render_and_read():
    text = fr.render([{"nick": "orbit-42", "best": 5}], "2026-09-17")
    if not text.startswith(fr.HEADER) or "window.RECORDS = {" not in text or '"updated": "2026-09-17"' not in text:
        fail(text[:120])
    probe = ROOT / "tools" / "_records_probe.js"
    probe.write_text(text, encoding="utf-8")
    try:
        back = fr.current(probe)
    finally:
        probe.unlink()
    if back != [{"nick": "orbit-42", "best": 5}]:
        fail(str(back))
    return "шапка, дата, десятка — и прочтено обратно тем же скриптом"


def stub_is_empty():
    got = fr.current(ROOT / "data" / "records.js")
    if got is None:
        fail("заглушка не читается")
    return f"{len(got)} строк в снимке"


# --- чужое в открытой форме и сбои сети ---------------------------------------

def quote_does_not_swallow():
    """Ник из одной кавычки: разбор с кавычками csv считал её началом поля и
    проглатывал все следующие ответы — десятка молча переставала обновляться."""
    got = parse([['"', "100"], [W[0] + "-01", "500"], [W[1] + "-02", "70"]])
    if got != [(W[0] + "-01", 500), (W[1] + "-02", 70)]:
        fail(str(got))
    return "кавычка — обычный мусор, строки после неё целы"


def huge_field():
    """Кавычка и хвост длиннее предела поля csv (131 072) роняли разбор, а с ним выкладку."""
    got = parse([['"' + "x" * 140_000, "1"], [W[2] + "-03", "9"]])
    if got != [(W[2] + "-03", 9)]:
        fail(str(got))
    return "поле в 140 000 знаков пропущено без исключения"


GOOD = tsv([["2026-09-24 10:00:00", W[3] + "-11", "300"], ["2026-09-24 10:01:00", W[4] + "-12", "200"]])
JUNK = tsv([["2026-09-24 10:00:00", "hacker", "999"], ["x", '"', "1"]])
BEFORE = [{"nick": W[5] + "-13", "best": 400}]


class Stub(http.server.BaseHTTPRequestHandler):
    """Подставная таблица: путь выбирает, как она сломана."""

    def log_message(self, *args):  # noqa: D401 — журнал запросов в выводе проверок не нужен
        pass

    def do_GET(self):  # noqa: N802 — имя задаёт http.server
        path = self.path.split("?")[0]
        if path == "/disconnect":
            return                                   # ответа нет: соединение просто закроется
        if path == "/truncated":
            self.send_response(200)
            self.send_header("Content-Length", "1000")
            self.end_headers()
            self.wfile.write("nick\tscore\n".encode("utf-8"))
            return                                   # обещали 1000 байт, отдали 11
        if path == "/error":
            self.send_error(500)
            return
        body = {"/empty": "", "/html": "<!doctype html><title>Sign in</title>",
                "/junk": JUNK, "/good": GOOD}.get(path, "")
        data = body.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/tab-separated-values; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


@contextlib.contextmanager
def stub_server():
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Stub)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        yield f"http://127.0.0.1:{server.server_address[1]}"
    finally:
        server.shutdown()
        server.server_close()


def run_main(url: str, before: list[dict]):
    """main() на подставной таблице и временном снимке: код, снимок после, вывод."""
    probe = ROOT / "tools" / "_records_main_probe.js"
    probe.write_text(fr.render(before, "2026-09-01"), encoding="utf-8")
    saved = fr.TSV_URL, fr.OUT, fr.TIMEOUT
    fr.TSV_URL, fr.OUT, fr.TIMEOUT = url, probe, 5
    out = io.StringIO()
    try:
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
            code = fr.main()
        return code, fr.current(probe), out.getvalue()
    finally:
        fr.TSV_URL, fr.OUT, fr.TIMEOUT = saved
        probe.unlink()


def network_failures():
    with stub_server() as base:
        for path in ("/disconnect", "/truncated", "/error"):
            code, after, _ = run_main(base + path, BEFORE)
            if code != 0 or after != BEFORE:
                fail(f"{path}: код {code}, снимок {after}")
    return "обрыв без ответа, недокачанный ответ, 500 — код 0, прежняя десятка"


def empty_body_keeps_snapshot():
    with stub_server() as base:
        code, after, _ = run_main(base + "/empty", BEFORE)
    if code != 0 or after != BEFORE:
        fail(f"код {code}, снимок {after}")
    return "пустой ответ 200 — сбой источника, десятка не стёрта"


def page_instead_of_table():
    with stub_server() as base:
        code, after, _ = run_main(base + "/html", BEFORE)
    if code != 1 or after != BEFORE:
        fail(f"код {code}, снимок {after}")
    return "страница вместо таблицы — код 1 без трассировки, снимок цел"


def junk_only_keeps_snapshot():
    with stub_server() as base:
        code, after, _ = run_main(base + "/junk", BEFORE)
    if code != 1 or after != BEFORE:
        fail(f"код {code}, снимок {after}")
    return "ни одной годной строки при непустом снимке — код 1, снимок цел"


def good_table_updates():
    with stub_server() as base:
        code, after, _ = run_main(base + "/good", BEFORE)
    expect = [{"nick": W[3] + "-11", "best": 300}, {"nick": W[4] + "-12", "best": 200}]
    if code != 0 or after != expect:
        fail(f"код {code}, снимок {after}")
    return "годная таблица — новая десятка записана"


check("список слов берётся из console.js и не пуст", words_from_source)
check("годные строки проходят, ник приводится к строчным", good_rows)
check("чужие ники отбрасываются: свободный вид, слово не из списка, лишние цифры", alien_nicks)
check("чужие счета отбрасываются: не число, ноль, минус, за потолком, дробь", alien_scores)
check("столбцы находятся по заголовку, а не по месту", columns_by_header)
check("без столбцов nick и score — громкий отказ, а не пустая десятка", missing_columns)
check("короткие строки и пустая таблица не ломают разбор", short_rows)
check("десятка: лучший на ник, по убыванию, при равных — кто раньше, срез до десяти", top_ten)
check("снимок пишется как JS с датой и читается обратно", render_and_read)
check("снимок в репозитории читается", stub_is_empty)
check("кавычка в нике не проглатывает следующие ответы", quote_does_not_swallow)
check("поле длиннее предела csv не роняет разбор", huge_field)
check("обрыв, недокачка и 500 — десятка прежняя, выкладка идёт дальше", network_failures)
check("пустой ответ не стирает десятку", empty_body_keeps_snapshot)
check("страница вместо таблицы — громкий отказ без трассировки, снимок цел", page_instead_of_table)
check("один мусор при непустом снимке — громкий отказ, снимок цел", junk_only_keeps_snapshot)
check("годная таблица записывает новую десятку", good_table_updates)

failed = results.count(False)
print(f"\nИтог: {len(results)} проверок, " + (f"{failed} упало" if failed else "все зелёные"))
sys.exit(1 if failed else 0)
