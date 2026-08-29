# -*- coding: utf-8 -*-
"""Рисует кадры паучка и переписывает ими таблицу ART в assets/js/pet.js.

    python tools/draw_pet.py

Руками такие пропорции не сходятся, поэтому фигуры задаются числами:
прямоугольники тела и глаз, отрезок наклонной крышки ноутбука. Логику в
`pet.js` скрипт не трогает — только блок кадров между служебными строками
«кадры» и «сборка кадров».

Паучок срисован с образца владельца: блочное тело, тёмный сегмент сзади, два
светлых глаза-полоски со зрачками, короткие лапки. Ноутбук — две серые полоски:
лежачая клавиатура и крышка, которая поднимается за три кадра.
"""

from __future__ import annotations

from pathlib import Path

W, H = 22, 12
GROUND = 10          # строка, на которой стоят лапки
LEG_X = (1, 4, 7, 10)


def blank() -> list[list[str]]:
    return [['.'] * W for _ in range(H)]


def rect(g, x0, y0, x1, y1, ch):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if 0 <= y < H and 0 <= x < W:
                g[y][x] = ch


def line(g, x0, y0, x1, y1, ch):
    """Отрезок по Брезенхэму — наклонная крышка ноутбука."""
    dx, dy = abs(x1 - x0), abs(y1 - y0)
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    err = dx - dy

    while True:
        if 0 <= y0 < H and 0 <= x0 < W:
            g[y0][x0] = ch
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 > -dy:
            err -= dy
            x0 += sx
        if e2 < dx:
            err += dx
            y0 += sy


def spider(phase=0, eyes=True, front_up=False, lift=0):
    """phase — какая пара лапок оторвана от земли; lift — подскок тела;
    front_up — передние лапки на клавишах (True — подняты, False — на них)."""
    g = blank()

    # тёмный сегмент сзади
    rect(g, 0, 2 - lift, 4, 7 - lift, 'D')

    # тело
    rect(g, 4, 3 - lift, 12, 8 - lift, '#')
    rect(g, 5, 2 - lift, 11, 2 - lift, '#')

    # глаза-полоски со зрачками
    if eyes:
        rect(g, 6, 3 - lift, 7, 7 - lift, 'w')
        rect(g, 9, 3 - lift, 10, 7 - lift, 'w')
        rect(g, 6, 5 - lift, 7, 6 - lift, 'p')
        rect(g, 9, 5 - lift, 10, 6 - lift, 'p')
    else:
        rect(g, 6, 5 - lift, 7, 5 - lift, 'p')
        rect(g, 9, 5 - lift, 10, 5 - lift, 'p')

    # лапки: через одну оторваны от земли
    for i, x in enumerate(LEG_X):
        step = 1 if (i % 2 == 0) == (phase == 0) else 0
        rect(g, x, 8 - lift, x + 1, GROUND - step, 'd')

    # передние лапки на клавишах
    if front_up is not False:
        y = 7 if front_up else 8
        rect(g, 13, y, 15, y, 'd')
        rect(g, 15, y, 15, 8, 'd')

    return g


def laptop(stage):
    """Две серые полоски: клавиатура лежит, крышка поднимается.
    stage: 0 — закрыт, 1 и 2 — раскрывается, 3 — открыт."""
    g = blank()

    rect(g, 14, 9, 20, 9, 'g')         # клавиатура

    if stage == 0:
        rect(g, 14, 8, 20, 8, 'g')     # крышка лежит сверху
    elif stage == 1:
        line(g, 20, 8, 15, 6, 'g')
    elif stage == 2:
        line(g, 20, 8, 17, 3, 'g')
    else:
        rect(g, 19, 3, 20, 8, 'g')     # крышка стоит

    return g


def merge(a, b):
    g = [row[:] for row in a]
    for y in range(H):
        for x in range(W):
            if b[y][x] != '.':
                g[y][x] = b[y][x]
    return g


FRAMES = [
    ('idle', [lambda: spider(phase=0)]),
    ('blink', [lambda: spider(phase=0, eyes=False)]),
    ('walk', [lambda: spider(phase=0), lambda: spider(phase=1, lift=1)]),
    ('hop', [lambda: spider(phase=1, lift=2)]),
    ('open', [
        lambda: merge(spider(phase=0), laptop(0)),
        lambda: merge(spider(phase=0), laptop(1)),
        lambda: merge(spider(phase=0), laptop(2)),
        lambda: merge(spider(phase=0), laptop(3)),
    ]),
    ('type', [
        lambda: merge(spider(phase=0, front_up=True), laptop(3)),
        lambda: merge(spider(phase=0, front_up=False), laptop(3)),
    ]),
]

HEAD = '  /* --- кадры ------------------------------------------------------------- */'
TAIL = '  /* --- сборка кадров ----------------------------------------------------- */'

NOTE = (
    '  /* Точка — пусто, буква — цвет из COLORS. Паучок занимает левую часть\n'
    '     строки, ноутбук появляется справа в кадрах раскрытия и работы.\n'
    '     Кадры перерисовывает tools/draw_pet.py — руками их не правят. */\n'
)


def art() -> str:
    parts = []
    for name, makers in FRAMES:
        grids = []
        for make in makers:
            rows = ["        '" + ''.join(row) + "'," for row in make()]
            grids.append('[\n' + '\n'.join(rows) + '\n      ]')
        parts.append('    ' + name + ': [' + ', '.join(grids) + '],')

    return HEAD + '\n\n' + NOTE + '  var ART = {\n' + '\n'.join(parts) + '\n  };\n\n'


def main() -> int:
    path = Path(__file__).resolve().parent.parent / 'assets' / 'js' / 'pet.js'
    text = path.read_text(encoding='utf-8')

    if HEAD not in text or TAIL not in text:
        raise SystemExit('В pet.js не нашлось блока кадров — разметка файла изменилась')

    start = text.index(HEAD)
    end = text.index(TAIL)
    path.write_text(text[:start] + art() + text[end:], encoding='utf-8', newline='\n')

    print(f'{path.name}: кадры перерисованы, {W}x{H} клеток')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
