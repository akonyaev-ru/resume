# -*- coding: utf-8 -*-
"""Рисует кадры дракончика и переписывает ими таблицу ART в assets/js/pet.js.

    python tools/draw_pet.py

Сам дракончик — рисунок владельца, обведённый по клеткам: карта `RAW` ниже,
буква на клетку. Скрипт делает из неё кадры: шаг, дыхание, моргание, прыжок,
раскрытие ноутбука и работу за ним. Логику в `pet.js` он не трогает — только
блок кадров между служебными строками «кадры» и «сборка кадров».

Цвета по просьбе владельца: тело фиолетовое, рога, пузико и кончик хвоста —
жёлтые. Обводки нет: тёмная страница сама работает контуром, как чёрный контур
в исходном рисунке.
"""

from __future__ import annotations

from pathlib import Path

# Дракончик смотрит влево — как нарисован. Кадры разворачиваются при сборке,
# поэтому здесь он один раз зеркалится: рисунок по умолчанию смотрит вправо,
# туда же, куда ставится ноутбук.
RAW = [
    '.....gg..ggg..',
    '....ggg..ggg..',
    '...gggggggggg.',
    '..ggggggggggg.',
    '..gggggggggggg',
    '..ggggeggggggg',
    '..ggggeggggggg',
    '.gggggggggggg.',
    '.geggggggggg..',
    '.gggggggggg...',
    '..mmmmmgggg...',
    '.....gggggggg.',
    '.....gggggg.gg',
    '....ggggggg..g',
    '....ggggggg..g',
    '....gg..gg....',
    '....gg..gg....',
]

BODY = [row[::-1] for row in RAW]

W = 22               # 14 клеток дракончику, дальше место под ноутбук
H = len(BODY)
GROUND = H - 1
LEGS_ROWS = (15, 16)


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


def paint_zones(rows):
    """Рога, пузико и кончик хвоста — жёлтые. Красится один раз по исходной
    карте: если красить после сдвигов, жёлтым затекает голова."""
    g = [list(r) for r in rows]

    for x in range(len(g[0])):
        for y in (0, 1):
            if g[y][x] == 'g':
                g[y][x] = 'y'

    for y in range(11, 15):
        for x in range(5, 9):
            if g[y][x] == 'g':
                g[y][x] = 'y'

    for y, x in ((12, 1), (13, 0), (14, 0)):
        if g[y][x] == 'g':
            g[y][x] = 'y'

    return g


COLORED = paint_zones(BODY)


def body(legs='stand', eyes=True, lift=0, crouch=0):
    """legs — как стоят лапы; lift — подскок целиком; crouch — присесть на
    клетку (тело ниже, лапы короче, ступни на месте)."""
    g = blank()
    shift = crouch - lift

    for y, row in enumerate(COLORED):
        if y in LEGS_ROWS:
            continue
        for x, ch in enumerate(row):
            ny = y + shift
            if ch != '.' and 0 <= ny < H:
                g[ny][x] = ch

    pairs = {
        'stand': ((4, 5), (8, 9)),
        'walkA': ((3, 4), (8, 9)),
        'walkB': ((5, 6), (9, 10)),
        'tuck': ((5, 6), (7, 8)),
    }[legs]

    top = LEGS_ROWS[0] + shift
    bottom = GROUND - lift
    for x0, x1 in pairs:
        if top <= bottom:
            rect(g, x0, top, x1, bottom, 'g')

    if not eyes:
        for y in range(H):
            for x in range(W):
                if g[y][x] == 'e':
                    g[y][x] = 'g'
        rect(g, 7, 6 + shift, 8, 6 + shift, 'e')

    return g


def laptop(stage):
    """Две серые полоски: клавиатура лежит, крышка поднимается.
    stage: 0 — закрыт, 1 и 2 — раскрывается, 3 — открыт."""
    g = blank()

    rect(g, 15, 16, 21, 16, 'k')       # клавиатура

    if stage == 0:
        rect(g, 15, 15, 21, 15, 'k')   # крышка лежит сверху
    elif stage == 1:
        line(g, 21, 15, 16, 13, 'k')
    elif stage == 2:
        line(g, 21, 15, 18, 10, 'k')
    else:
        rect(g, 20, 10, 21, 15, 'k')   # крышка стоит

    return g


def paws(g, up):
    """Передние лапы на клавишах: приподнимаются по очереди."""
    g = [row[:] for row in g]
    y = 14 if up else 15
    rect(g, 13, y, 15, y, 'g')
    rect(g, 15, y, 15, 15, 'g')
    return g


def merge(a, b):
    g = [row[:] for row in a]
    for y in range(H):
        for x in range(W):
            if b[y][x] != '.':
                g[y][x] = b[y][x]
    return g


FRAMES = [
    # Стоя дракончик дышит: раз в несколько кадров тело оседает на клетку.
    ('idle', [lambda: body(), lambda: body(crouch=1)]),
    ('blink', [lambda: body(eyes=False)]),
    ('walk', [
        lambda: body(legs='walkA'),
        lambda: body(legs='stand', lift=1),
        lambda: body(legs='walkB'),
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
    '  /* Точка — пусто, буква — цвет из COLORS. Дракончик занимает левую часть\n'
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
    for i, row in enumerate(RAW):
        if len(row) != 14:
            raise SystemExit(f'Строка {i} рисунка длиной {len(row)}, а нужно 14')

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
