# -*- coding: utf-8 -*-
"""Рисует кадры существ и ноутбука и переписывает ими таблицы в pet.js.

    python tools/draw_pet.py

Существо простое: блочное тело, два светлых глаза со зрачками, четыре лапки —
ровно столько деталей, сколько читается в двенадцати клетках.

Кадры одни на двоих: Отто и Оливия отличаются только палитрой. Так две фигуры
не разъедутся между собой при первой же правке позы.

Кадры разложены на два слоя. Существо — свой слой шириной ровно в него самого:
при развороте оно зеркалится внутри своей же рамки и потому остаётся на месте.
Предмет — отдельный слой справа, он не зеркалится никогда: стоит, где
поставили. Предмет свой у каждого: у Отто ноутбук, крышка которого всегда
откидывается в одну сторону, у Оливии лист бумаги, который она поднимает к
глазам.

В том же слое предмета живёт щупальце, которым Отто гладит соседку по
макушке: слой не зеркалится, поэтому гладит он всегда вправо от себя.

Третьим слоем идёт пузырь ругани — он всплывает над головой и живёт своей
жизнью, не завися от позы.

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
PROP_W = 7                  # ширина слоя ноутбука

# Две пустые строки над телом: в прыжке оно уезжает вверх ровно на столько, и
# без запаса краем рамки срезало бы макушку.
TOP = 2
H = TOP + len(BODY) + 2     # + две строки щупалец
GROUND = H - 1
LEGS_TOP = TOP + len(BODY)
EYE_ROW = TOP + 4           # строка зрачков — по ней рисуются прикрытые глаза

# Четыре лапки: пары «через одну» переставляются в шаге.
LEGS = {
    'stand': ((1, 2), (4, 5), (7, 8), (10, 11)),
    'walkA': ((0, 1), (4, 5), (7, 8), (10, 11)),
    'walkB': ((1, 2), (5, 6), (8, 9), (10, 11)),
    'tuck': ((3, 4), (6, 7), (8, 9), (-1, -1)),
    'sweep': ((0, 1), (3, 4), (6, 7), (9, 10)),   # сдуты назад в полёте
    'splay': ((0, 1), (3, 4), (7, 8), (10, 11)),  # разъехались при ударе
}


def blank(width):
    return [['.'] * width for _ in range(H)]


def rect(g, x0, y0, x1, y1, ch):
    # Границы берутся из самой сетки, а не из высоты существа: у полки она своя.
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if 0 <= y < len(g) and 0 <= x < len(g[0]):
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


def volume(g):
    """Немного объёма: верхняя кромка светлее, нижняя темнее. Обводку по краю на
    тёмной странице всё равно не видно, а так тело перестаёт быть плоским."""
    for x in range(BODY_W):
        for y in range(H):
            if g[y][x] == 'g':
                g[y][x] = 'h'
                break

    for x in range(BODY_W):
        for y in range(H - 1, -1, -1):
            if g[y][x] == 'g':
                g[y][x] = 'd'
                break

    return g


def body(legs='stand', eyes=True, lift=0, crouch=0, step=0, hang=False):
    """legs — как стоят щупальца; lift — подскок целиком; crouch — присесть на
    клетку; step — какая пара щупалец оторвана от земли; hang — щупальца висят
    во всю длину, до нижнего края (когда его держат на весу)."""
    g = blank(BODY_W)
    shift = crouch - lift

    for y, row in enumerate(BODY):
        ny = TOP + y + shift
        if not 0 <= ny < H:
            continue
        for x, ch in enumerate(row):
            if ch != '.':
                g[ny][x] = ch

    volume(g)

    top = LEGS_TOP + shift
    for i, (x0, x1) in enumerate(LEGS[legs]):
        if x1 < x0 or x0 < 0:
            continue
        short = 1 if step and (i % 2 == (step - 1)) else 0
        bottom = GROUND if hang else GROUND - lift - short
        rect(g, x0, top, x1, bottom, 'd')

    if eyes is False:
        for y in range(H):
            for x in range(BODY_W):
                if g[y][x] in 'wp':
                    g[y][x] = 'g'
        # Прикрытые глаза — две короткие тёмные чёрточки.
        rect(g, 2, EYE_ROW + shift, 3, EYE_ROW + shift, 'p')
        rect(g, 8, EYE_ROW + shift, 9, EYE_ROW + shift, 'p')

    return g


def laptop(stage):
    """Клавиатура лежит, крышка поднимается от неё и в раскрытом виде откинута
    назад — от осьминожка, экраном к нему. Весь ноутбук нарочно мельче его
    самого: вполовину ниже и вдвое уже.
    stage: 0 — закрыт, 1 и 2 — раскрывается, 3 — открыт."""
    g = blank(PROP_W)
    hinge = 4

    rect(g, 0, GROUND, hinge, GROUND, 'k')          # клавиатура

    if stage == 0:
        rect(g, 0, GROUND - 1, hinge, GROUND - 1, 'k')
    elif stage == 1:
        line(g, hinge, GROUND - 1, 2, GROUND - 2, 'k')
    elif stage == 2:
        line(g, hinge, GROUND - 1, 3, GROUND - 4, 'k')
    else:
        # Крышка в две клетки толщиной, откинута назад через вертикаль.
        line(g, hinge, GROUND - 1, hinge + 1, GROUND - 5, 'k')
        line(g, hinge + 1, GROUND - 1, hinge + 2, GROUND - 5, 'k')

    return g


# Где стоят щупальца на клавиатуре: два прямоугольника по две клетки, между
# ними просвет. Никакой перемычки к телу — она читалась как непонятная загогулина.
PRESS_X = ((0, 1), (3, 4))


def tentacles(g, first):
    """Два щупальца печатают: одно опущено на клавиши, другое поднято на две
    клетки. В соседнем кадре они меняются местами — получается перебор.
    Живут они в слое ноутбука, а не тела: тот слой не зеркалится, а печатает
    осьминожек всегда мордой к нему."""
    g = [row[:] for row in g]

    for i, (x0, x1) in enumerate(PRESS_X):
        down = (i == 0) if first else (i == 1)
        top = GROUND - 2 if down else GROUND - 4
        rect(g, x0, top, x1, top + 1, 'd')

    return g


# Лист бумаги: две клетки в ширину, шесть в высоту и с наклоном — каждые две
# строки он уходит на клетку вправо. Ширину и высоту подъёма владелец правил
# на глаз: три клетки были толстоваты, а поднятый к самым глазам лист закрывал
# ему пол-лица. Наклон тут и делает бумагу бумагой:
# прямой белый прямоугольник владелец забраковал как брусок, ровно как до того
# трубку. Взято с крышки ноутбука — она читается по той же причине.
PAPER_W = 2
PAPER_H = 6
PAPER_BOTTOM = (GROUND, GROUND - 1, GROUND - 2, GROUND - 3)   # по шагам подъёма


def paper(lift):
    """Лист в щупальце. lift: 0 — у самого пола, 3 — поднят к глазам."""
    g = blank(PROP_W)
    bottom = PAPER_BOTTOM[lift]

    for i in range(PAPER_H):
        y = bottom - i
        x = 1 + i // 2                        # наклон: клетка вправо на две строки
        rect(g, x, y, x + PAPER_W - 1, y, 'w')

    rect(g, 0, bottom, 1, bottom + 1, 'd')    # щупальце держит лист снизу

    return g


def pet_hand(lifted):
    """Поглаживание: квадратик гладит соседку по щеке, ходя вверх-вниз.

    Стоит он в просвете между ними, а не поверх её тела: холст соседки лежит
    выше, и всё, что Отто рисует в её клетках, ею же и закрывается. Просвет как
    раз в две клетки — `MEET_GAP`, — и квадратик занимает его целиком.

    Живёт в слое предмета: тот не зеркалится, а гладит Отто всегда справа от
    себя, потому и подходит он всегда слева от неё. Ни щупальца, ни перемычки к
    телу: проведённая наискось рука читалась загогулиной."""
    g = blank(PROP_W)
    top = TOP + 3 if lifted else TOP + 5     # от глаза к щеке и обратно

    rect(g, 0, top, 1, top + 1, 'd')

    return g


# --- обстановка ---------------------------------------------------------

# Книжная полка: корпус `f`, задняя стенка `e`, книги — цифрами. Четырнадцать
# клеток в ширину и восемнадцать в высоту: она нарочно выше существа (тринадцать
# клеток), иначе рядом с ним читалась бы ящиком, а не мебелью.
SHELF_W = 14
SHELF_H = 18
SHELF_ROWS = 4                  # высота отсека в клетках

# Книги в отсеке: (столбец, ширина, высота, цвет). Столбцы считаются от левой
# стенки, высота — от полки вверх. Ширина и высота разные у соседних: одинаковые
# читались забором, а не книгами.
SHELF_BOOKS = [
    [(1, 2, 4, '1'), (3, 2, 3, '2'), (5, 2, 4, '3'), (7, 1, 3, '4'),
     (8, 2, 4, '5'), (10, 2, 3, '1')],
    [(1, 2, 3, '4'), (3, 1, 4, '5'), (4, 2, 4, '1'), (6, 2, 3, '2'),
     (8, 2, 4, '3'), (10, 2, 4, '4')],
    [(1, 2, 4, '5'), (3, 2, 3, '3'), (5, 2, 4, '1'), (7, 2, 4, '2'),
     (9, 1, 3, '4'), (10, 2, 4, '5')],
]


# Кулер настольный, по фотографии от владельца: бутыль занимает две трети
# высоты, корпус приземистый и белый, серой крышки нет вовсе — сверху та же
# вода. Первый заход был наоборот (корпус в пол-роста, бутыль коротышка) и на
# кулер не походил.
COOLER_W = 10
COOLER_H = 20
COOLER_BODY = 13             # с какой строки начинается корпус


def cooler():
    """Кадр один: кулер не шевелится, его только двигают."""
    g = [['.'] * COOLER_W for _ in range(COOLER_H)]
    right = COOLER_W - 1
    floor = COOLER_H - 1

    # Бутыль: скруглена сверху, книзу сужается в горлышко, поперёк — рёбра.
    rect(g, 2, 0, 7, 0, 'w')
    rect(g, 1, 1, 8, 9, 'w')
    rect(g, 2, 10, 7, 10, 'w')
    rect(g, 3, 11, 6, COOLER_BODY - 1, 'w')      # горлышко
    rect(g, 2, 2, 2, 8, 'g')                     # блик по левому боку
    rect(g, 1, 4, 8, 4, 'g')                     # рёбра
    rect(g, 1, 7, 8, 7, 'g')

    # Корпус: белый ящик с нишей, двумя кранами и поддоном.
    rect(g, 0, COOLER_BODY, right, floor, 'b')
    rect(g, 1, COOLER_BODY + 1, 1, floor - 1, 'g')       # светлая грань слева
    rect(g, 2, COOLER_BODY + 2, right - 2, floor - 1, 'n')   # ниша
    rect(g, 3, COOLER_BODY + 2, 3, COOLER_BODY + 3, 'r')     # горячий кран
    rect(g, 6, COOLER_BODY + 2, 6, COOLER_BODY + 3, 'c')     # холодный
    rect(g, 2, floor - 1, right - 2, floor - 1, 'c')         # поддон

    return g


# Тумбочка с ящиками: столешница со свесом, три фасада с ручками, ножки. На
# ней при загрузке стоит кулер — но это не одно целое, а два предмета, и
# растащить их можно в любую сторону.
CABINET_W = 14
CABINET_H = 14


def cabinet():
    g = [['.'] * CABINET_W for _ in range(CABINET_H)]
    right = CABINET_W - 1
    floor = CABINET_H - 1

    rect(g, 0, 0, right, 1, 'f')                  # столешница со свесом
    rect(g, 1, 2, right - 1, floor, 'f')          # корпус
    rect(g, 1, 2, 1, floor - 2, 'g')              # светлая грань слева

    for i in range(3):                            # три ящика
        top = 3 + i * 3
        rect(g, 3, top, right - 3, top + 1, 'e')
        rect(g, 6, top, 7, top, 'h')              # ручка

    rect(g, 2, floor - 1, 3, floor, 'k')          # ножки
    rect(g, right - 3, floor - 1, right - 2, floor, 'k')

    return g


# Растение в кадке: четыре листа-овала на стеблях из середины кадки. Листья
# нарочно пятнами, а не штрихами: тонкие линии на этом размере сливаются в
# кашу — пробовали, кончилось нечитаемым веером.
PLANT_W = 13
PLANT_H = 16
POT_TOP = 11                     # верхняя кромка кадки
PLANT_ROOT = (6, POT_TOP - 1)    # откуда растут стебли

# Листья: центр по x, центр по y, цвет. Светлые и тёмные вперемешку — так
# видно, что их несколько, а не одно пятно.
PLANT_LEAVES = [(5, 2, 'l'), (2, 6, 'm'), (9, 5, 'm'), (10, 9, 'l')]


def leaf(g, cx, cy, color):
    """Овал пять на три с сужением к краям."""
    rect(g, cx - 1, cy - 1, cx + 1, cy - 1, color)
    rect(g, cx - 2, cy, cx + 2, cy, color)
    rect(g, cx - 1, cy + 1, cx + 1, cy + 1, color)


def plant():
    """Кадка, стебли и листья. Кадр один: растение не шевелится."""
    g = [['.'] * PLANT_W for _ in range(PLANT_H)]

    for cx, cy, _ in PLANT_LEAVES:
        line(g, PLANT_ROOT[0], PLANT_ROOT[1], cx, cy, 's')

    for cx, cy, color in PLANT_LEAVES:
        leaf(g, cx, cy, color)

    rect(g, 1, POT_TOP, PLANT_W - 2, POT_TOP, 'r')          # обод
    rect(g, 2, POT_TOP + 1, PLANT_W - 3, PLANT_H - 2, 'p')  # корпус
    rect(g, 3, PLANT_H - 1, PLANT_W - 4, PLANT_H - 1, 'p')  # книзу уже

    return g


def shelf():
    """Корпус, три отсека с книгами и ножки. Кадр один: полка не шевелится,
    её только двигают."""
    g = [['.'] * SHELF_W for _ in range(SHELF_H)]
    right = SHELF_W - 1
    floor = SHELF_H - 1

    rect(g, 0, 0, right, floor - 2, 'e')            # задняя стенка
    rect(g, 0, 0, right, 0, 'f')                    # верхняя доска
    rect(g, 0, 0, 0, floor, 'f')                    # боковины
    rect(g, right, 0, right, floor, 'f')
    rect(g, 0, floor - 2, right, floor - 2, 'f')    # нижняя доска

    for i, books in enumerate(SHELF_BOOKS):
        base = 1 + (i + 1) * (SHELF_ROWS + 1) - 1   # полка под отсеком
        if i < len(SHELF_BOOKS) - 1:
            rect(g, 0, base, right, base, 'f')      # разделительная полка
        for x, w, h, color in books:
            rect(g, x, base - h, x + w - 1, base - 1, color)

    rect(g, 1, floor - 1, 2, floor, 'f')            # ножки
    rect(g, right - 2, floor - 1, right - 1, floor, 'f')

    return g


# Пузырь ругани: белое облачко с хвостиком вниз, к голове, и три
# восклицательных знака внутри. Рисуется буквами `w` и `p` — теми же, что белок
# глаза и зрачок: свои цвета заводить не нужно, эти есть у обоих.
#
# Знаки неподвижны. Дрожание пробовали тремя способами — разводить их к краям,
# ронять на строку ниже, сдвигать вбок: во всех знаки упираются в край облачка
# и оно выглядит надкусанным. Пузырь и так возникает и гаснет, этого хватает.
#
# Под знак отведено четыре строки, а не три: на трёх не остаётся просвета перед
# точкой, и восклицательный выходит просто палкой. Решётку владелец отменил —
# на трёх клетках в ширину она не читается.
BUBBLE = [
    '.wwwwwww.',
    'wwpwpwpww',
    'wwpwpwpww',
    'wwwwwwwww',
    'wwpwpwpww',
    '.wwwwwww.',
    '..ww.....',
]


BODY_FRAMES = [
    # Стоя существо дышит: тело оседает на клетку, лапы остаются на месте.
    # Эти же два кадра идут и за ноутбуком.
    ('idle', [lambda: body(), lambda: body(crouch=1)]),
    ('blink', [lambda: body(eyes=False)]),
    ('walk', [
        lambda: body(legs='walkA', step=1),
        lambda: body(legs='stand', lift=1),
        lambda: body(legs='walkB', step=2),
        lambda: body(legs='stand'),
    ]),
    ('hop', [lambda: body(legs='tuck', lift=2)]),
    # Танцует на месте: приседает и подскакивает, щупальца перебирают вбок.
    # Качать вбок само тело нельзя — крайний столбец срезало бы краем рамки.
    ('dance', [
        lambda: body(legs='sweep', crouch=1),
        lambda: body(legs='stand', lift=1),
        lambda: body(legs='stand', crouch=1),
        lambda: body(legs='sweep', lift=1),
    ]),
    # Отто держат на весу: щупальца висят и качаются из стороны в сторону.
    ('held', [
        lambda: body(lift=1, hang=True),
        lambda: body(legs='walkA', lift=1, hang=True),
        lambda: body(lift=1, hang=True),
        lambda: body(legs='walkB', lift=1, hang=True),
    ]),
    # Летит: щупальца полощет ветром.
    ('fly', [
        lambda: body(legs='sweep', lift=1, hang=True),
        lambda: body(lift=1, hang=True),
    ]),
    # Приземлился: осел, щупальца разъехались.
    ('land', [lambda: body(legs='splay', crouch=1)]),
]

LAP_FRAMES = [laptop(0), laptop(1), laptop(2), laptop(3)]
# Лист поднимают к глазам: четыре кадра подъёма.
PAPER_FRAMES = [paper(0), paper(1), paper(2), paper(3)]
# И просматривают: лист покачивается на клетку — это и есть само дело.
LEAF_FRAMES = [paper(3), paper(2)]
PET_FRAMES = [pet_hand(False), pet_hand(True)]
TYPE_FRAMES = [tentacles(laptop(3), True), tentacles(laptop(3), False)]
SHELF_FRAME = shelf()
PLANT_FRAME = plant()
COOLER_FRAME = cooler()
CABINET_FRAME = cabinet()

HEAD = '  /* --- кадры ------------------------------------------------------------- */'
TAIL = '  /* --- сборка кадров ----------------------------------------------------- */'

NOTE = (
    '  /* Точка — пусто, буква — цвет из палитры. Кадры тела одни на двоих:\n'
    '     Отто и Оливия отличаются только палитрой.\n'
    '     Два слоя: существо шириной ровно в себя (при развороте зеркалится\n'
    '     внутри своей рамки и не съезжает) и предмет, который не зеркалится\n'
    '     никогда: ноутбук у Отто, лист бумаги у Оливии. Кадры перерисовывает\n'
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

    def table(frames):
        return ',\n    '.join(grid_js(g) for g in frames)

    return (HEAD + '\n\n' + NOTE
            + '  var ART = {\n' + '\n'.join(parts) + '\n  };\n\n'
            + '  // Сколько пустых строк рамки идёт над телом: запас на прыжок.\n'
            + '  // По ним считается, где холст ловит щелчок.\n'
            + '  var ART_TOP = ' + str(TOP) + ';\n\n'
            + '  // Крышка: лежит, поднимается, поднимается выше, откинута назад.\n'
            + '  var LAPTOP = [\n    ' + table(LAP_FRAMES) + ',\n  ];\n\n'
            + '  // Тот же раскрытый ноутбук, но с двумя щупальцами на клавишах.\n'
            + '  var LAPTOP_TYPE = [\n    ' + table(TYPE_FRAMES) + ',\n  ];\n\n'
            + '  // Лист бумаги Оливии: поднимается от пола к глазам, наклонный.\n'
            + '  var PAPERS = [\n    ' + table(PAPER_FRAMES) + ',\n  ];\n\n'
            + '  // Лист на весу покачивается на клетку — она его просматривает.\n'
            + '  var PAPERS_LEAF = [\n    ' + table(LEAF_FRAMES) + ',\n  ];\n\n'
            + '  // Щупальце, которым Отто гладит соседку: то на макушке, то над.\n'
            + '  var PET = [\n    ' + table(PET_FRAMES) + ',\n  ];\n\n'
            + '  // Пузырь ругани: белое облачко с тремя восклицательными.\n'
            + '  var BUBBLE = ' + grid_js(BUBBLE) + ';\n\n'
            + '  // Книжная полка: корпус, три отсека с книгами, ножки. Кадр один —\n'
            + '  // она не шевелится, её только двигают.\n'
            + '  var SHELF = ' + grid_js(SHELF_FRAME) + ';\n\n'
            + '  // Растение в кадке: четыре листа на стеблях. Кадр тоже один.\n'
            + '  var PLANT = ' + grid_js(PLANT_FRAME) + ';\n\n'
            + '  // Кулер: высокая бутыль горлышком вниз и приземистый корпус.\n'
            + '  var COOLER = ' + grid_js(COOLER_FRAME) + ';\n\n'
            + '  // Тумбочка с тремя ящиками — на ней стоит кулер.\n'
            + '  var CABINET = ' + grid_js(CABINET_FRAME) + ';\n\n')


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

    print(f'{path.name}: кадры перерисованы, существо {BODY_W}x{H}, '
          f'предмет {PROP_W}x{H}, полка {SHELF_W}x{SHELF_H}, '
          f'растение {PLANT_W}x{PLANT_H}, кулер {COOLER_W}x{COOLER_H}, '
          f'тумбочка {CABINET_W}x{CABINET_H}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
