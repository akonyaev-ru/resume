"""Собирает счётчики звёзд для проектов из resume.js и пишет data/stats.js.

Запускается в GitHub Actions перед публикацией. Зависимостей нет: только
стандартная библиотека. При недоступном API файл остаётся с пустыми данными —
страница в этом случае просто не показывает счётчики.
"""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RESUME = ROOT / "data" / "resume.js"
OUT = ROOT / "data" / "stats.js"
API = "https://api.github.com/repos/{repo}"
TIMEOUT = 15


def repos_from_resume() -> list[str]:
    text = RESUME.read_text(encoding="utf-8")
    return re.findall(r"repo:\s*'([^']+)'", text)


def stars(repo: str) -> int | None:
    request = urllib.request.Request(
        API.format(repo=repo),
        headers={
            "Accept": "application/vnd.github+json",
            "User-Agent": "akonyaev-ru-cv",
        },
    )
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        request.add_header("Authorization", f"Bearer {token}")

    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
            payload = json.load(response)
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
        print(f"{repo}: не удалось получить данные — {error}", file=sys.stderr)
        return None

    return payload.get("stargazers_count")


def main() -> int:
    collected: dict[str, int] = {}
    for repo in repos_from_resume():
        count = stars(repo)
        if count is not None:
            collected[repo] = count
            print(f"{repo}: {count} звёзд")

    data = {
        "updated": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "repos": collected,
    }

    OUT.write_text(
        "/* Обновляется автоматически: .github/workflows/deploy.yml. Руками не править. */\n"
        "window.STATS = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )
    print(f"Записано: {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
