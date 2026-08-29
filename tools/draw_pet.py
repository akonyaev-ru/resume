# -*- coding: utf-8 -*-
"""Рисует кадры существа и переписывает ими таблицу ART в assets/js/pet.js.

    python tools/draw_pet.py

Существо простое: блочное тело, два светлых глаза со зрачками, четыре лапки —
ровно столько деталей, сколько читается в 12 клетках. Скрипт делает из одной
карты все кадры: шаг, дыхание, моргание, прыжок, раскрытие ноутбука и работу за
ним. Логику в `pet.js` он не трогает — только блок кадров между служебными
строками «кадры» и «сборка кадров».

Обводки нет: тёмная страница сама работает контуром.
"""

from __future__ import annotations

from pathlib import Path

# Тело без лап: g — корпус, w — белок глаза, p — зрачок. Смотрит вправо, туда
# же, куда ставится ноутбук.
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

BODY_W = len(BODY[0])
W = 20               # 12 клеток существу, дальше место под ноутбук
H = 11
GROUND = H - 1
LEGS_TOP = len(BODY)

# Четыре лапки: пары «через одну» переставляются в шаге.
LEGS = {
    'stand': ((1, 2), (4, 5), (7, 8), (10, 11)),
    'walkA': ((0, 1), (4, 5), (7, 8), (10, 11)),
    'walkB': ((1, 2), (5, 6), (8, 9), (10, 11)),
    'tuck': ((3, 4), (6, 7), (8, 9), (0, 0)),
}


def blank():
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


def body(legs='stand', eyes=True, lift=0, crouch=0, step=0):
    """legs — как стоят лапы; lift — подскок целиком; crouch — присесть на
    клетку; step — какая пара лап оторвана от земли."""
    g = blank()
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
        if x1 < x0:
            continue
        short = 1 if step and (i % 2 == (step - 1)) else 0
        rect(g, x0, top, x1, GROUND - lift - short, 'g')

    if not eyes:
        for y in range(H):
            for x in range(W):
                if g[y][x] in 'wp':
                    g[y][x] = 'g'
        # Прикрытые глаза — две короткие тёмные чёрточки.
        rect(g, 2, 4 + shift, 3, 4 + shift, 'p')
        rect(g, 8, 4 + shift, 9, 4 + shift, 'p')

    return g


def laptop(stage):
    """Две серые полоски: клавиатура лежит, крышка поднимается.
    stage: 0 — закрыт, 1 и 2 — раскрывается, 3 — открыт."""
    g = blank()

    rect(g, 13, GROUND, 19, GROUND, 'k')       # клавиатура

    if stage == 0:
        rect(g, 13, GROUND - 1, 19, GROUND - 1, 'k')
    elif stage == 1:
        line(g, 19, GROUND - 1, 14, GROUND - 3, 'k')
    elif stage == 2:
        line(g, 19, GROUND - 1, 16, GROUND - 6, 'k')
    else:
        rect(g, 18, GROUND - 6, 19, GROUND - 1, 'k')

    return g


def paws(g, up):
    """Передняя лапа тянется к клавишам и постукивает по ним."""
    g = [row[:] for row in g]
    y = GROUND - 2 if up else GROUND - 1
    rect(g, 12, y, 13, y, 'g')
    return g


def merge(a, b):
    g = [row[:] for row in a]
    for y in range(H):
        for x in range(W):
            if b[y][x] != '.':
                g[y][x] = b[y][x]
    return g


FRAMES = [
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
    ('open', [
        lambda: merge(body(), laptop(0)),
        lambda: merge(body(), laptop(1)),
        lambda: merge(body(), laptop(2)),
        lambda: merge(body(), laptop(3)),
    ]),
    ('type', [
        lambda: paws(merge(body(), laptop(3)), True),
        lambda: paws(merge(body(crouch=1), laptop(3)), False),
    ]),
]

HEAD = '  /* --- кадры ------------------------------------------------------------- */'
TAIL = '  /* --- сборка кадров ----------------------------------------------------- */'

NOTE = (
    '  /* Точка — пусто, буква — цвет из COLORS. Существо занимает левую часть\n'
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

    print(f'{path.name}: кадры перерисованы, {W}x{H} клеток')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
