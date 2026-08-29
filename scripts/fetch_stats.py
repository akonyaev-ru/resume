"""Собирает звёзды и последний выпуск проектов из resume.js в data/stats.js.

Запускается в GitHub Actions перед публикацией. Зависимостей нет: только
стандартная библиотека. При недоступном API файл остаётся с пустыми данными —
страница в этом случае просто не показывает ни счётчиков, ни выпусков.
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
RELEASE_API = "https://api.github.com/repos/{repo}/releases/latest"
TIMEOUT = 15


def repos_from_resume() -> list[str]:
    text = RESUME.read_text(encoding="utf-8")
    return re.findall(r"repo:\s*'([^']+)'", text)


def ask(url: str, quiet_404: bool = False) -> dict | None:
    request = urllib.request.Request(
        url,
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
            return json.load(response)
    except urllib.error.HTTPError as error:
        # 404 у выпусков — обычное дело: у проекта их может не быть вовсе.
        if error.code == 404 and quiet_404:
            return None
        print(f"{url}: не удалось получить данные — {error}", file=sys.stderr)
        return None
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
        print(f"{url}: не удалось получить данные — {error}", file=sys.stderr)
        return None


def repo_stats(repo: str) -> dict | None:
    """Звёзды и последний выпуск. Без выпусков репозиторий не пропадает —
    у него просто не будет строки о выпуске на странице."""
    payload = ask(API.format(repo=repo))
    if payload is None or payload.get("stargazers_count") is None:
        return None

    stats: dict = {"stars": payload["stargazers_count"], "release": None}

    latest = ask(RELEASE_API.format(repo=repo), quiet_404=True)
    if latest and latest.get("tag_name") and latest.get("published_at"):
        stats["release"] = {
            "tag": latest["tag_name"],
            # На странице показывается только дата, время ни к чему.
            "date": latest["published_at"][:10],
        }

    return stats


def main() -> int:
    collected: dict[str, dict] = {}
    for repo in repos_from_resume():
        stats = repo_stats(repo)
        if stats is not None:
            collected[repo] = stats
            release = stats["release"]
            tail = f", выпуск {release['tag']} от {release['date']}" if release else ""
            print(f"{repo}: {stats['stars']} звёзд{tail}")

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
