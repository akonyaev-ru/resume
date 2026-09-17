"""Собирает общую десятку рекордов тетриса в data/records.js.

Источник — опубликованная таблица ответов Google-формы, в которую страница
шлёт ник и счёт после партии (`assets/js/console.js`, `RECORDS_FORM`).
Запускается в GitHub Actions перед публикацией; снимок коммитится в
репозиторий, поэтому при недоступной таблице на сайте остаётся прежняя
десятка, а не пустая. Зависимостей нет: только стандартная библиотека.

Строка ответа принимается, только если ник того вида, который выдаёт сама
консоль (слово из её же списка и две цифры), а счёт — целое от 1 до
SCORE_MAX: всё остальное в таблицу может положить кто угодно, и оно
отбрасывается молча. На ник — лучший счёт, при равных — более ранний.
"""

from __future__ import annotations

import csv
import io
import json
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets" / "js" / "console.js"   # список слов ников — там же, где их выдают
OUT = ROOT / "data" / "records.js"
TSV_URL = (
    "https://docs.google.com/spreadsheets/d/e/"
    "2PACX-1vQFLM3E31JX1oEuimftYXovcVsIxEf_JDaYKzZELi5AYomv4BV4pf9LNfuYrLN63MkP5ett5Mhz6XRn"
    "/pub?gid=2132992211&single=true&output=tsv"
)
TIMEOUT = 20
TOP_N = 10
SCORE_MAX = 999999          # шесть знаков: столько влезает в строку таблицы
NICK_RE = re.compile(r"^([a-z]{3,5})-\d{2}$")
HEADER = "/* Обновляется автоматически: .github/workflows/deploy.yml. Руками не править. */\n"


def nick_words(source: str) -> set[str]:
    """Слова ников из console.js: массив NICK_WORDS, один источник на обе стороны."""
    found = re.search(r"var NICK_WORDS = \[(.*?)\];", source, re.S)
    if not found:
        raise ValueError("в console.js не найден NICK_WORDS")
    words = set(re.findall(r"'([a-z]{3,5})'", found.group(1)))
    if len(words) < 100:
        raise ValueError(f"слов ников подозрительно мало: {len(words)}")
    return words


def parse(text: str, words: set[str]) -> list[tuple[str, int]]:
    """Годные пары (ник, счёт) из TSV в порядке ответов; заголовок — по именам столбцов."""
    reader = csv.reader(io.StringIO(text), delimiter="\t")
    try:
        header = [cell.strip().lower() for cell in next(reader)]
    except StopIteration:
        return []
    if "nick" not in header or "score" not in header:
        raise ValueError(f"в таблице нет столбцов nick и score: {header}")
    nick_at, score_at = header.index("nick"), header.index("score")

    rows: list[tuple[str, int]] = []
    for cells in reader:
        if len(cells) <= max(nick_at, score_at):
            continue
        nick = cells[nick_at].strip().lower()
        found = NICK_RE.match(nick)
        if not found or found.group(1) not in words:
            continue
        try:
            score = int(cells[score_at].strip())
        except ValueError:
            continue
        if not 0 < score <= SCORE_MAX:
            continue
        rows.append((nick, score))
    return rows


def top(rows: list[tuple[str, int]]) -> list[dict]:
    """Лучший счёт на ник, по убыванию; при равных — кто раньше."""
    best: dict[str, tuple[int, int]] = {}
    for index, (nick, score) in enumerate(rows):
        if nick not in best or score > best[nick][0]:
            best[nick] = (score, index)
    ordered = sorted(best.items(), key=lambda item: (-item[1][0], item[1][1]))
    return [{"nick": nick, "best": score} for nick, (score, _) in ordered[:TOP_N]]


def fetch(url: str) -> str | None:
    request = urllib.request.Request(url, headers={"User-Agent": "akonyaev-ru-cv"})
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
            return response.read().decode("utf-8")
    except (urllib.error.URLError, TimeoutError, UnicodeDecodeError) as error:
        print(f"{url[:60]}…: не удалось получить таблицу — {error}", file=sys.stderr)
        return None


def current(path: Path) -> list[dict] | None:
    """Десятка из прежнего снимка — чтобы не переписывать файл без изменений."""
    if not path.exists():
        return None
    found = re.search(r"window\.RECORDS = (\{.*\});", path.read_text(encoding="utf-8"), re.S)
    if not found:
        return None
    try:
        return json.loads(found.group(1)).get("top")
    except json.JSONDecodeError:
        return None


def render(rows: list[dict], updated: str) -> str:
    data = {"updated": updated, "top": rows}
    return HEADER + "window.RECORDS = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n"


def main() -> int:
    text = fetch(TSV_URL)
    if text is None:
        print("Таблица недоступна — снимок оставлен прежним")
        return 0

    rows = top(parse(text, nick_words(SOURCE.read_text(encoding="utf-8"))))
    if rows == current(OUT):
        print(f"Десятка не изменилась: {len(rows)} строк")
        return 0

    OUT.write_text(render(rows, datetime.now(timezone.utc).strftime("%Y-%m-%d")), encoding="utf-8")
    for place, row in enumerate(rows, 1):
        print(f"{place:>2}  {row['nick']:<8}  {row['best']:>6}")
    print(f"Записано: {OUT.relative_to(ROOT)} ({len(rows)} строк)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
