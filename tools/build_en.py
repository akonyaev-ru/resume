"""Собирает английскую копию страницы: `index.html` -> `en.html`.

    python tools/build_en.py

Обе копии лежат в одной папке, поэтому пути к стилям, скриптам и картинкам у
них одинаковые и переписывать их не нужно. Отличаются только мета-теги в
<head> и русский текст запасной разметки <noscript>: именно их читают поисковик
и превью ссылки, а скрипт со своим переключателем языка до них не добирается.

Английские строки лежат таблицей ниже. Если русский оригинал в `index.html`
поправят, сборка упадёт и назовёт строку, которой не нашлось, — молча
устаревшего перевода на сайте не окажется.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Пары «как в index.html» -> «как в en.html». Каждая обязана встретиться ровно
# один раз.
STRINGS = [
    ('<html lang="ru">', '<html lang="en">'),
    ("<title>Резюме Алексея Коняева</title>", "<title>Alexey Konyaev — CV</title>"),
    (
        'content="Специалист по автоматизации и AI-разработке.'
        " Автоматизирую ручные бизнес-процессы и внедряю ИИ: Python, LLM,"
        ' Битрикс24. Опыт, результаты, продукты."',
        'content="Automation and AI engineering specialist. Automating'
        " manual business processes and rolling out AI: Python, LLM, Bitrix24."
        ' Experience, results, products."',
    ),
    ('content="Алексей Коняев"', 'content="Alexey Konyaev"'),
    ('content="Резюме Алексея Коняева"', 'content="Alexey Konyaev — CV"'),
    (
        'content="Специалист по автоматизации и AI-разработке:'
        ' автоматизация ручных процессов, внедрение ИИ."',
        'content="Automation and AI engineering specialist: automating'
        ' manual processes, rolling out AI."',
    ),
    # Машиночитаемый блок schema.org: у него свои строки, каждая с ключом
    # впереди — иначе они совпали бы с текстом мета-тегов и разметки.
    ('"inLanguage": "ru"', '"inLanguage": "en"'),
    ('"name": "Алексей Коняев"', '"name": "Alexey Konyaev"'),
    ('"alternateName": "Alexey Konyaev"', '"alternateName": "Алексей Коняев"'),
    (
        '"jobTitle": "Специалист по автоматизации и AI-разработке"',
        '"jobTitle": "Automation and AI engineering specialist"',
    ),
    (
        '"description": "Автоматизация бизнес-процессов и внедрение ИИ: Python,'
        ' LLM, Битрикс24."',
        '"description": "Automating business processes and rolling out AI: Python,'
        ' LLM, Bitrix24."',
    ),
    ('"addressLocality": "Москва"', '"addressLocality": "Moscow"'),
    ('"name": "Айковер ПРО"', '"name": "iCover PRO"'),
    (">К содержанию<", ">Skip to content<"),
    ("<h1>Алексей Коняев</h1>", "<h1>Alexey Konyaev</h1>"),
    (
        "<p>Специалист по автоматизации и AI-разработке. Москва,"
        " удалённо или гибрид.</p>",
        "<p>Automation and AI engineering specialist. Moscow, remote or"
        " hybrid.</p>",
    ),
    (">Написать в Telegram<", ">Message me on Telegram<"),
    ("Почта: <a", "Email: <a"),
    (
        "<p>Страница собирается на JavaScript — включите его, чтобы увидеть"
        " резюме целиком.</p>",
        "<p>The page is built with JavaScript — switch it on to see the whole"
        " CV.</p>",
    ),
]

# Язык копии записан в разметке: сохранённый ранее выбор его не перебивает —
# по этому адресу пришли за английской версией.
PIN = (
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />\n'
    '  <meta name="cv:lang" content="en" />',
)


def set_attr(html: str, pattern: str, value: str, what: str) -> str:
    """Подменяет значение атрибута: шаблон захватывает всё до него, значение
    подставляется функцией — иначе обратные слэши и группы в самом значении
    пришлось бы экранировать."""
    out, count = re.subn(pattern, lambda m: m.group(1) + value + '"', html, count=1)
    if count != 1:
        raise SystemExit(f"Не найдено: {what} — разметка index.html изменилась")
    return out


def main() -> int:
    src = (ROOT / "index.html").read_text(encoding="utf-8")

    found = re.search(r'<link rel="alternate" hreflang="en" href="([^"]+)"', src)
    if not found:
        raise SystemExit("В index.html нет ссылки на английскую версию")
    url = found.group(1)

    html = src
    for ru, en in STRINGS + [PIN]:
        if ru not in html:
            raise SystemExit(f"Не найдено в index.html: {ru[:70]}")
        if html.count(ru) != 1:
            raise SystemExit(f"Встречается не один раз: {ru[:70]}")
        html = html.replace(ru, en, 1)

    html = set_attr(html, r'(<link rel="canonical" href=")[^"]+"', url, "canonical")
    html = set_attr(html, r'(<meta property="og:url" content=")[^"]+"', url, "og:url")
    html = set_attr(
        html, r'(<meta property="og:locale" content=")[^"]+"', "en_US", "og:locale"
    )
    html = set_attr(
        html,
        r'(<meta property="og:locale:alternate" content=")[^"]+"',
        "ru_RU",
        "og:locale:alternate",
    )

    out = ROOT / "en.html"
    out.write_text(html, encoding="utf-8", newline="\n")
    print(f"{out.name} — {out.stat().st_size / 1024:.0f} КБ, canonical {url}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
