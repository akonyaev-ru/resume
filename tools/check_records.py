"""Проверки scripts/fetch_records.py без сети: разбор таблицы, отбор, десятка.

    python tools/check_records.py

Таблица ответов открыта для записи кому угодно, поэтому главное здесь —
что чужое отбрасывается: ник не того вида или не из списка, счёт не число,
ноль, отрицательный, за потолком. Плюс порядок и срез десятки.
"""

from __future__ import annotations

import importlib.util
import sys
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

failed = results.count(False)
print(f"\nИтог: {len(results)} проверок, " + (f"{failed} упало" if failed else "все зелёные"))
sys.exit(1 if failed else 0)
