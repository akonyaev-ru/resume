# -*- coding: utf-8 -*-
"""Рисует кадры существа и ноутбука и переписывает ими таблицы в pet.js.

    python tools/draw_pet.py

Существо простое: блочное тело, два светлых глаза со зрачками, четыре лапки —
ровно столько деталей, сколько читается в двенадцати клетках.

Кадры разложены на два слоя. Существо — свой слой шириной ровно в него самого:
при развороте оно зеркалится внутри своей же рамки и потому остаётся на месте.
Ноутбук — отдельный слой справа, он не зеркалится никогда: стоит, где поставили,
и крышка всегда откидывается в одну сторону.

Логику в `pet.js` скрипт не трогает — только блоки кадров между служебными
строками.
"""

from __future__ import annotations

from pathlib import Path

# Тело без лап: g — корпус, w — белок глаза, p — зрачок. Смотрит вправо.
BODY = [
    '.gggggggggg.',
    'gggggggggggg',
    'gggggggggggg',
    'ggwwggggwwgg',
    'ggwpggggwpgg',
    'ggwwggggwwgg',
    'gggggggggggg',
    'gggggggggggg',
    '.gggggggggg.',
]

BODY_W = len(BODY[0])       # ширина слоя существа
LAP_W = 8                   # ширина слоя ноутбука
H = 11
GROUND = H - 1
LEGS_TOP = len(BODY)

# Четыре лапки: пары «через одну» переставляются в шаге.
LEGS = {
    'stand': ((1, 2), (4, 5), (7, 8), (10, 11)),
    'walkA': ((0, 1), (4, 5), (7, 8), (10, 11)),
    'walkB': ((1, 2), (5, 6), (8, 9), (10, 11)),
    'tuck': ((3, 4), (6, 7), (8, 9), (-1, -1)),
}


def blank(width):
    return [['.'] * width for _ in range(H)]


def rect(g, x0, y0, x1, y1, ch):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if 0 <= y < H and 0 <= x < len(g[0]):
                g[y][x] = ch


def line(g, x0, y0, x1, y1, ch):
    """Отрезок по Брезенхэму — наклонная крышка ноутбука."""
    dx, dy = abs(x1 - x0), abs(y1 - y0)
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    err = dx - dy

    while True:
        if 0 <= y0 < H and 0 <= x0 < len(g[0]):
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


def body(legs='stand', eyes=True, lift=0, crouch=0, step=0, paw=None):
    """legs — как стоят лапы; lift — подскок целиком; crouch — присесть на
    клетку; step — какая пара лап оторвана; paw — лапа тянется к клавишам."""
    g = blank(BODY_W)
    shift = crouch - lift

    for y, row in enumerate(BODY):
        ny = y + shift
        if not 0 <= ny < H:
            continue
        for x, ch in enumerate(row):
            if ch != '.':
                g[ny][x] = ch

    top = LEGS_TOP + shift
    for i, (x0, x1) in enumerate(LEGS[legs]):
        if x1 < x0 or x0 < 0:
            continue
        short = 1 if step and (i % 2 == (step - 1)) else 0
        rect(g, x0, top, x1, GROUND - lift - short, 'g')

    if not eyes:
        for y in range(H):
            for x in range(BODY_W):
                if g[y][x] in 'wp':
                    g[y][x] = 'g'
        # Прикрытые глаза — две короткие тёмные чёрточки.
        rect(g, 2, 4 + shift, 3, 4 + shift, 'p')
        rect(g, 8, 4 + shift, 9, 4 + shift, 'p')

    # Лапа на клавишах: тянется вправо, к соседнему слою с ноутбуком.
    if paw is not None:
        y = GROUND - 2 if paw else GROUND - 1
        rect(g, BODY_W - 2, y, BODY_W - 1, y, 'g')

    return g


def laptop(stage):
    """Две серые полоски: клавиатура лежит, крышка поднимается и в раскрытом
    виде стоит с наклоном назад, как у настоящего ноутбука.
    stage: 0 — закрыт, 1 и 2 — раскрывается, 3 — открыт."""
    g = blank(LAP_W)
    hinge = 6

    rect(g, 0, GROUND, hinge, GROUND, 'k')          # клавиатура

    if stage == 0:
        rect(g, 0, GROUND - 1, hinge, GROUND - 1, 'k')
    elif stage == 1:
        line(g, hinge, GROUND - 1, 1, GROUND - 3, 'k')
    elif stage == 2:
        line(g, hinge, GROUND - 1, 3, GROUND - 6, 'k')
    else:
        # Крышка в две клетки толщиной, отклонена назад на две клетки.
        line(g, hinge, GROUND - 1, hinge - 2, GROUND - 8, 'k')
        line(g, hinge + 1, GROUND - 1, hinge - 1, GROUND - 8, 'k')

    return g


BODY_FRAMES = [
    # Стоя существо дышит: тело оседает на клетку, лапы остаются на месте.
    ('idle', [lambda: body(), lambda: body(crouch=1)]),
    ('blink', [lambda: body(eyes=False)]),
    ('walk', [
        lambda: body(legs='walkA', step=1),
        lambda: body(legs='stand', lift=1),
        lambda: body(legs='walkB', step=2),
        lambda: body(legs='stand'),
    ]),
    ('hop', [lambda: body(legs='tuck', lift=2)]),
    ('type', [lambda: body(paw=True), lambda: body(crouch=1, paw=False)]),
]

LAP_FRAMES = [laptop(0), laptop(1), laptop(2), laptop(3)]

HEAD = '  /* --- кадры ------------------------------------------------------------- */'
TAIL = '  /* --- сборка кадров ----------------------------------------------------- */'

NOTE = (
    '  /* Точка — пусто, буква — цвет из COLORS. Два слоя: существо шириной ровно\n'
    '     в себя (при развороте зеркалится внутри своей рамки и не съезжает) и\n'
    '     ноутбук, который не зеркалится никогда. Кадры перерисовывает\n'
    '     tools/draw_pet.py — руками их не правят. */\n'
)


def grid_js(grid) -> str:
    rows = ["        '" + ''.join(row) + "'," for row in grid]
    return '[\n' + '\n'.join(rows) + '\n      ]'


def art() -> str:
    parts = []
    for name, makers in BODY_FRAMES:
        grids = ', '.join(grid_js(make()) for make in makers)
        parts.append('    ' + name + ': [' + grids + '],')

    laps = ',\n    '.join(grid_js(g) for g in LAP_FRAMES)

    return (HEAD + '\n\n' + NOTE
            + '  var ART = {\n' + '\n'.join(parts) + '\n  };\n\n'
            + '  // Крышка: лежит, поднимается, поднимается выше, стоит с наклоном.\n'
            + '  var LAPTOP = [\n    ' + laps + ',\n  ];\n\n')


def main() -> int:
    for i, row in enumerate(BODY):
        if len(row) != BODY_W:
            raise SystemExit(f'Строка {i} рисунка длиной {len(row)}, а нужно {BODY_W}')

    path = Path(__file__).resolve().parent.parent / 'assets' / 'js' / 'pet.js'
    text = path.read_text(encoding='utf-8')

    if HEAD not in text or TAIL not in text:
        raise SystemExit('В pet.js не нашлось блока кадров — разметка файла изменилась')

    start = text.index(HEAD)
    end = text.index(TAIL)
    path.write_text(text[:start] + art() + text[end:], encoding='utf-8', newline='\n')

    print(f'{path.name}: кадры перерисованы, существо {BODY_W}x{H}, ноутбук {LAP_W}x{H}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
