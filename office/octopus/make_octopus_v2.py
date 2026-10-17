# -*- coding: utf-8 -*-
"""Набор 2: аккуратные вариации Отто «как робот» (2026-10-15, владелец:
«более аккуратные варианты с минимальной отрисовкой вне осьминога, более
формальные, но не сильно»; по пробе с одеждой — «слишком однотипные, можно
делать как был робот (2) ранее, что-то подобное»).

Тот же кадр покоя из pet.js и те же правила, что в make_octopus.py (поза не
меняется ни на клетку), но вариация — это другой ВИД осьминога целиком, как
робот набора 1: материал тела, глаза, швы и детали на самом теле, а снаружи
только мелочь вроде антенны или болтов:
  • вне силуэта — не больше 16 клеток (у робота набора 1 было 16);
  • без костюмов, оружия и реквизита по бокам;
  • холст тесный, 16×16 клеток.

    py make_octopus_v2.py
    py check_pose.py --dir v2 --expect 50 --max-outside 16
"""
import json
import sys

import make_octopus as mo

# Холст набора 2 — тесный: по 2 клетки с боков, 3 сверху, 2 снизу.
# render/compose/to_image/sheet читают эти имена из модуля в момент вызова.
mo.W, mo.H, mo.OX, mo.OY = 16, 16, 2, 3
OUT = mo.HERE / 'v2'
SHEET_SCALE = 8
MAX_OUTSIDE = 16

WHITE = '#f2f3f5'
BLUE_SHIRT = '#cfe0f5'


def dark(c, k=0.25):
    return mo.mix(c, '#000000', k)


def light(c, k=0.3):
    return mo.mix(c, '#ffffff', k)


def mirror(points):
    return mo.mirror_points(points)


# --- одежда: раскраска рядов 7–8 (низ тела) ---------------------------------

ROW7 = [(x, 7) for x in range(12)]
ROW8 = [(x, 8) for x in range(1, 11)]
SHOULDERS = [(0, 6), (11, 6)]
TORSO = SHOULDERS + ROW7 + ROW8
LEGS = [(x, y) for y in (9, 10) for x in (1, 2, 4, 5, 7, 8, 10, 11)]
COLLAR = [(4, 7), (7, 7)]          # уголки воротника по бокам узла
KNOT = [(5, 7), (6, 7)]
BLADE = [(5, 8), (6, 8)]


def part(paint=None, items=()):
    return {'paint': paint or {}, 'items': list(items)}


def top(color, legs=None, neck=None):
    """Верх одежды: ряды 7–8 и плечи; щупальца — брюки (legs) или свои."""
    p = {pt: color for pt in TORSO}
    if legs:
        p.update({pt: legs for pt in LEGS})
    if neck:
        p.update({pt: neck for pt in KNOT + BLADE})
    return p


def suit(jacket, tie=None, shirt=WHITE, bow=None, pocket=None, legs='same'):
    """Пиджак, рубашка уголками, галстук или бабочка, брюки на щупальцах."""
    p = top(jacket, legs=dark(jacket, 0.18) if legs == 'same' else legs, neck=shirt)
    p.update({pt: shirt for pt in COLLAR})
    if tie:
        p.update({pt: dark(tie, 0.2) for pt in KNOT})
        p.update({pt: tie for pt in BLADE})
    if bow:
        p.update({(4, 7): bow, (7, 7): bow})
        p.update({pt: dark(bow, 0.3) for pt in KNOT})
    if pocket:
        p[(9, 7)] = pocket
    return part(p)


def sweater(color, shirt=WHITE, tie=None, legs=None):
    """Свитер или джемпер поверх рубашки: видны уголки воротника (и галстук)."""
    p = top(color, legs=legs, neck=shirt)
    p.update({pt: shirt for pt in COLLAR})
    p.update({pt: color for pt in BLADE})
    if tie:
        p.update({pt: dark(tie, 0.2) for pt in KNOT})
        p.update({pt: tie for pt in BLADE})
    return part(p)


def turtleneck(color, legs=None):
    p = top(color, legs=legs)
    p.update({pt: light(color, 0.18) for pt in ROW7})
    return part(p)


def cardigan(color, inner=WHITE, buttons=None, legs=None):
    p = top(color, legs=legs, neck=inner)
    if buttons:
        p[(4, 8)] = buttons
    return part(p)


def polo(color, collar=WHITE, legs=None):
    p = top(color, legs=legs)
    p.update({(3, 7): collar, (4, 7): collar, (7, 7): collar, (8, 7): collar})
    p.update({(5, 7): dark(color, 0.15), (6, 7): dark(color, 0.15)})
    return part(p)


def vest(color, shirt=BLUE_SHIRT, tie=None, legs=None):
    """Жилет: рукава рубашки по бокам, вырез с галстуком."""
    p = top(color, legs=legs, neck=shirt)
    p.update({pt: shirt for pt in SHOULDERS + [(0, 7), (11, 7)] + COLLAR})
    if tie:
        p.update({pt: dark(tie, 0.2) for pt in KNOT})
        p.update({pt: tie for pt in BLADE})
    return part(p)


def hoodie(color, strings=WHITE, legs=None):
    p = top(color, legs=legs)
    p.update({pt: dark(color, 0.2) for pt in KNOT})
    return part(p, [mo.cells([(4, 8), (7, 8)], strings)])


def blouse(color, bow, legs=None):
    p = top(color, legs=legs)
    p.update({(4, 7): bow, (7, 7): bow})
    p.update({pt: dark(bow, 0.25) for pt in KNOT})
    p.update({(5, 8): bow, (6, 8): bow})
    return part(p)


def shirt(color, tie=None, legs=None):
    """Рубашка без пиджака — светлая, но не белая: на белом фоне край не пропадает."""
    p = top(color, legs=legs)
    p.update({pt: dark(color, 0.12) for pt in COLLAR})
    if tie:
        p.update({pt: dark(tie, 0.2) for pt in KNOT})
        p.update({pt: tie for pt in BLADE})
    return part(p)


# --- аксессуары --------------------------------------------------------------

RIM = [(2, 2), (3, 2), (1, 3), (1, 4), (1, 5), (4, 3), (4, 4), (4, 5), (2, 6), (3, 6)]
BRIDGE = [(5, 3), (6, 3)]


def glasses(color, style='round'):
    if style == 'round':       # полная оправа
        pts = RIM + mirror(RIM)
    elif style == 'top':       # оправа без нижней дужки — легче
        rim = [p for p in RIM if p[1] < 6]
        pts = rim + mirror(rim)
    else:                      # brow — только верхний край, «браулайн»
        brow = [(1, 2), (2, 2), (3, 2), (4, 2), (1, 3), (4, 3)]
        pts = brow + mirror(brow)
    return part(items=[mo.cells(pts + BRIDGE, color)])


def lanyard(cord, card=WHITE):
    return part(items=[mo.cells([(3, 7), (4, 8), (8, 7), (7, 8)], cord),
                       mo.cells(BLADE, card), mo.cells([(5, 9), (6, 9)], cord)])


def pearls(color='#f4f1ea'):
    return part(items=[mo.cells([(3, 7), (5, 8), (6, 8), (8, 7)], color)])


def pencil():
    return part(items=[mo.cells([(-1, 0)], '#ff86a0'), mo.cells([(-1, 1), (-1, 2)], '#f2c230'),
                       mo.cells([(-1, 3)], '#3b2a20')])


def headset(color='#2a3038', light_=None):
    """Гарнитура: дужка по верхней кромке, чашка на боку, микрофон к щеке."""
    pts = [(x, 0) for x in range(1, 11)] + [(0, 1), (11, 1), (0, 3), (0, 4), (1, 6)]
    it = [mo.cells(pts, color), mo.cells([(0, 2), (0, 5), (2, 6)], light_ or color)]
    return part(items=it)


def badge(color, at=(9, 7)):
    return part(items=[mo.cells([at], color)])


def bow_hair(color):
    """Бантик на макушке справа: 3 клетки на кромке и 2 над ней."""
    return part(items=[mo.cells([(8, 0), (10, 0), (8, -1), (10, -1)], color),
                       mo.cells([(9, 0)], dark(color, 0.25))])


def beret(color):
    pts = [(x, -1) for x in range(2, 10)] + [(x, 0) for x in range(1, 11)] + [(6, -2)]
    return part(items=[mo.cells(pts, color), mo.cells([(x, 0) for x in range(2, 10, 3)], light(color, 0.15))])


def flatcap(color):
    pts = [(x, -1) for x in range(2, 10)] + [(x, 0) for x in range(1, 11)]
    return part(items=[mo.cells(pts, color), mo.cells([(x, 0) for x in range(1, 11)], dark(color, 0.2))])


def headband(color):
    return part(items=[mo.cells([(x, 1) for x in range(12)], color)])


# --- набор -------------------------------------------------------------------

# Первая проба набора 2 (одежда на рядах 7–8: юрист, аналитик, дизайнер, HR,
# разработчик, менеджер, бухгалтер, директор) отклонена: «слишком однотипные».
# Функции одежды выше оставлены — бабочка или галстук годятся как формальная
# деталь у робота.

VARIANTS = []

EYES = {(x, y) for x in (2, 3, 8, 9) for y in (3, 4, 5)}
CELLS = {(x, y) for y, row in enumerate(mo.BODY) for x, ch in enumerate(row) if ch != '.'}
EDGE = {(x, y) for x, y in CELLS
        if any((nx, ny) not in CELLS for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))}


def fn(f):
    """Раскраска правилом: f(x, y, буква кадра) → цвет или None (тогда палитра)."""
    return {'paint': {}, 'items': [], 'fn': f}


def cmap(art, legend):
    """Раскраска картой поверх тела: строки 12×11, буква из legend — цвет, прочее — палитра."""
    rows = art.strip('\n').split('\n')
    return part({(x, y): legend[ch] for y, r in enumerate(rows) for x, ch in enumerate(r) if ch in legend})


def at(points, color):
    return part({p: color for p in points})


def rows_(colors):
    return fn(lambda x, y, ch: colors.get(y))


def thing(points, color):
    """Предмет поверх или снаружи (антенна, болты): клетки в координатах тела."""
    return part(items=[mo.cells(points, color)])


def variant(slug, ru, skin=None, *parts):
    paint, fns, items = {}, [], []
    for p in parts:
        paint.update(p['paint'])
        items += p['items']
        if p.get('fn'):
            fns.append(p['fn'])

    def f(x, y, ch, sk):
        if (x, y) in paint:
            return paint[(x, y)]
        for g in fns:
            c = g(x, y, ch)
            if c:
                return c
        return None
    VARIANTS.append({'slug': slug, 'ru': ru, 'skin': dict(mo.OTTO, **(skin or {})),
                     'paint': f if (paint or fns) else None, 'items': items})


B = mo.body
VISOR = [(x, y) for x in range(1, 11) for y in range(2, 7)
         if (x, y) not in EYES and (x, y) not in {(1, 2), (10, 2), (1, 6), (10, 6)}]
SCREEN = [(x, y) for x in range(1, 11) for y in range(1, 7) if (x, y) not in EYES]

# 1. Робот-ассистент: светлый корпус, тёмный визор, глаза светятся бирюзой
variant('assistant', 'Робот-ассистент', B('#cdd5df', '#e2e7ed', '#8e98a6', w='#5fd3ce', p='#c8f7f4'),
        at(VISOR, '#1c2230'), rows_({10: '#6f7786'}),
        thing([(5, -1), (6, -1)], '#8e98a6'), thing([(5, -2), (6, -2)], '#5fd3ce'),
        thing([(-1, 3), (-1, 4), (12, 3), (12, 4)], '#8e98a6'))

# 2. Монитор: бежевый корпус ЭЛТ, экран со строками, зелёные глаза-пиксели
variant('monitor', 'Робот-монитор', B('#c9c2b0', '#ddd8c9', '#9a9482', w='#3ddc97', p='#0f2a1c'),
        at([p for p in SCREEN if p[1] % 2], '#183022'), at([p for p in SCREEN if not p[1] % 2], '#14261c'),
        at([(9, 7)], '#3ddc97'), at([(2, 7)], '#9a9482'),
        rows_({9: '#4a4d55', 10: '#4a4d55'}))

# 3. Золотой андроид: золото, диски-уши, прорезь рта, блик
variant('android', 'Золотой андроид', B('#d9a93a', '#f2cf6e', '#a8792a', w='#fff0b8', p='#8a5a10'),
        at([(0, 3), (0, 5), (11, 3), (11, 5)], '#b5862a'), at([(0, 4), (11, 4)], '#f2cf6e'),
        at([(5, 6), (6, 6)], '#8a5a10'), at([(1, 1), (2, 1), (1, 2)], '#f8dc8a'))

# Пробы 4–10 (стимпанк, голограмма, чертёж, печатная плата, гжель, твид, витраж)
# отклонены: «нравится только 1 2 и 3, делай наподобие, но не только роботов».
# Что общего у 1–3: гладкое тело в 2–3 тона, глаза переосмыслены (визор, экран,
# свечение), пара аккуратных деталей. Отклонённые проигрывали пестротой —
# узоры, сетки, полосы по всему телу. Правило набора: никаких узоров на теле,
# одна идея на лицо, деталей — считанные клетки.

LIDS = [(x, y) for x in (2, 3, 8, 9) for y in (3, 5)]          # верх и низ глаз
SHINE = [(1, 1), (2, 1), (1, 2)]                                # блик слева сверху


def band(x0, x1, y0, y1, round_=False):
    """Прямоугольник клеток тела без глаз (для визоров, экранов, масок)."""
    pts = [(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1) if (x, y) not in EYES]
    if round_:
        pts = [p for p in pts if p not in {(x0, y0), (x1, y0), (x0, y1), (x1, y1)}]
    return pts


# --- роботы ------------------------------------------------------------------

# 4. Робот-сканер: графит, тёмная щель визора, красные глаза
variant('scanner', 'Робот-сканер', B('#3a3f4b', '#555b69', '#2a2e37', w='#ff4a3d', p='#ffd0cc'),
        at(band(1, 10, 3, 5), '#14161c'), at([(4, 1), (7, 1)], '#2a2e37'), rows_({10: '#1f222a'}))

# 5. Медбот: мягкий светлый корпус, глаза-точки на одной линии
variant('medbot', 'Робот-медбот', B('#d5dbe3', '#e8ecf1', '#aab3c0', w='#22252c', p='#22252c'),
        at([(4, 4), (5, 4), (6, 4), (7, 4)], '#22252c'))

# 6. Ретро-робот: мятная жесть, глаза-лампочки, прорезь динамика, антенна
variant('retrobot', 'Ретро-робот', B('#7fcdb8', '#a3dccb', '#5aa893', w='#fff3b0', p='#5a4a10'),
        at([(4, 7), (5, 7), (6, 7), (7, 7)], '#3f8a76'),
        thing([(5, -1), (6, -1)], '#5aa893'), thing([(5, -2), (6, -2)], '#ff6b6b'),
        thing([(-1, 4), (12, 4)], '#5aa893'))

# 7. Робот-погрузчик: жёлтый ящик, тёмные линзы с бликом, гусеницы
#    (серые «козырьки» над линзами читались хмурыми бровями — сняты)
variant('loader', 'Робот-погрузчик', B('#e8a33a', '#f2bf63', '#4a4d55', w='#3a3f4b', p='#9cd3ff'))

# 8. Хромированный робот: отражения полосами света, голубые глаза
variant('chrome', 'Хром-робот', B('#b9c3cf', '#e3e8ee', '#7d8696', w='#6fb7ff', p='#e6f3ff'),
        rows_({2: '#d3dbe4', 6: '#9aa4b2'}), thing([(5, -1), (6, -1)], '#7d8696'))

# 9. Робот-игрушка: розовый, глянцевые глаза, румянец, антенна-звёздочка
variant('toybot', 'Робот-игрушка', B('#f2a7c0', '#f7c4d5', '#d17f9c', w='#3a2a35', p='#fdfdfd'),
        at([(1, 6), (10, 6)], '#e86a8e'),
        thing([(5, -1), (6, -1)], '#d17f9c'), thing([(5, -2), (6, -2)], '#ffd84a'))

# --- техника -----------------------------------------------------------------

# 10. Ретро-телевизор: деревянный корпус, экран, ручки, «рожки» антенны
variant('tv', 'Ретро-телевизор', B('#9a6b42', '#b88758', '#6e4a2a', w='#cfe8ff', p='#2a3a4a'),
        at(band(1, 9, 1, 6, True), '#2a3a4a'), at([(10, 2), (10, 4)], '#e6d3b0'),
        thing([(4, -1), (3, -2), (7, -1), (8, -2)], '#3a3f4b'))

# 11. Смартфон: чёрная рамка, экран с обоями, вырез камеры, полоска «домой»
variant('phone', 'Смартфон', B('#1f2228', '#3a3e47', '#1f2228', w='#f4f6fa', p='#1f2228'),
        at(band(1, 10, 1, 2), '#3d8bd9'), at(band(1, 10, 3, 4), '#4a74d6'), at(band(1, 10, 5, 7), '#5a5fd0'),
        at([(4, 7), (5, 7), (6, 7), (7, 7)], '#cfd6ea'), at([(5, 0), (6, 0)], '#0e1014'))

# 12. Карманная консоль: серый корпус, зелёный экран в рамке, крестовина, кнопки
GB_BEZEL = [(x, 1) for x in range(1, 11)] + [(x, 6) for x in range(1, 11)] + \
           [(1, y) for y in range(2, 6)] + [(10, y) for y in range(2, 6)]
variant('handheld', 'Карманная консоль', B('#c4c4bc', '#d8d8d0', '#9a9a92', w='#306230', p='#0f380f'),
        at(band(2, 9, 2, 5), '#8bac0f'), at(GB_BEZEL, '#5a5f6e'),
        at([(1, 7), (2, 7), (3, 7), (2, 8)], '#3a3d45'), at([(9, 7), (8, 8)], '#a3305a'))

# 13. Калькулятор: тёмный корпус, ЖК-экран, глаза — сегменты, клавиши
variant('calculator', 'Калькулятор', B('#4a4f5a', '#5f6572', '#3a3f48', w='#2a3020', p='#b9c4a8'),
        at(band(1, 10, 1, 5), '#b9c4a8'), at([(2, 7), (4, 7), (7, 7)], '#9aa0aa'), at([(9, 7)], '#f28c28'))

# 14. Умная колонка: ткань, кольцо подсветки по верхней кромке
variant('speaker', 'Умная колонка', B('#6b7280', '#5fd3ce', '#4a505c', w='#2a2e37', p='#5fd3ce'))

# 15. Ночник: тёплое свечение, пара бликов вокруг
variant('nightlight', 'Ночник', B('#ffd86b', '#fff0b0', '#e0a83a', w='#fffaf0', p='#8a5a10'),
        thing([(-1, -1), (12, -1), (-2, 4), (13, 4)], '#ffe9a0'))

# 16. Ретро-холодильник: красная эмаль, шов дверец, хромовая ручка
#     (мятный выходил бледным; шильдик по центру внизу читался зубами)
variant('fridge', 'Ретро-холодильник', B('#d65a4f', '#e8807a', '#a8433a'),
        at([(x, 2) for x in range(12)], '#a8433a'), at([(11, 1), (11, 3), (11, 4), (11, 5)], '#e3e8ee'))

# --- шлемы, маски и звери ----------------------------------------------------

# 17. Космонавт: белый скафандр, золотой визор с бликом
variant('cosmonaut', 'Космонавт', B('#d9dde3', '#eceef2', '#aab1bc', w='#f5d98a', p='#7a4f10'),
        at(VISOR, '#d9a93a'), at([(2, 2), (3, 2)], '#f5d27a'),
        at([(0, 3), (0, 4), (11, 3), (11, 4)], '#aab1bc'))

# 18. Водолаз: латунный шлем, иллюминатор, четыре болта
variant('diver', 'Водолаз', B('#c49a4a', '#ddb66a', '#8a6a2a'),
        at(VISOR, '#2a4a55'), at([(1, 2), (10, 2), (1, 6), (10, 6)], '#6a4a1a'))

# 19. Рыцарь: шлем-ведро с прорезью, глаза светятся в щели, перо
variant('helm', 'Рыцарь', B('#a3acb9', '#cdd3dc', '#6f7786', w='#1c2028', p='#ffcf5a'),
        at(LIDS, '#a3acb9'), at([(1, 4), (4, 4), (5, 4), (6, 4), (7, 4), (10, 4)], '#1c2028'),
        at([(5, 1), (6, 1), (5, 2), (6, 2)], '#cdd3dc'),
        thing([(6, -1), (7, -1), (7, -2)], '#c9443c'))

# 20. Енот: маска через глаза, белые брови, ушки (мордочка с носом под маской
#     складывалась в череп — снята)
variant('raccoon', 'Енот', B('#9aa0aa', '#b8bdc6', '#6f7580'),
        at(band(0, 11, 3, 5), '#2f333b'),
        at([(1, 2), (2, 2), (3, 2), (4, 2), (7, 2), (8, 2), (9, 2), (10, 2)], '#e6e8ec'),
        rows_({10: '#4a4f58'}), thing([(1, -1), (10, -1)], '#6f7580'))

# 21. Пингвин: чёрный, белая «маска» лица, клюв, оранжевые лапы
variant('penguin', 'Пингвин', B('#2a2d36', '#3e4250', '#f2a33a', w='#2a2d36', p='#eef0f4'),
        at(band(1, 10, 2, 7, True), '#eef0f4'), at([(5, 6), (6, 6)], '#f2a33a'),
        at([(0, 7), (11, 7)] + ROW8, '#2a2d36'))

# 22. Лиса: рыжая, белые щёки и грудка, тёмные лапы, ушки
variant('fox', 'Лиса', B('#e8853a', '#f2a35e', '#3a2a24'),
        at([(0, 6), (1, 6), (10, 6), (11, 6)] + [(x, 7) for x in range(1, 11)] + ROW8, '#f6efe6'),
        at([(5, 6), (6, 6)], '#3a2a24'), at([(0, 7), (11, 7)], '#e8853a'),
        thing([(1, -1), (2, -1), (9, -1), (10, -1)], '#e8853a'), thing([(1, -2), (10, -2)], '#3a2a24'))

# 23. Сова: светлые лицевые диски, жёлтые глаза, клюв, перья-ушки
variant('owl', 'Сова', B('#8a6a4a', '#a4876a', '#6a5440', w='#ffd84a', p='#2a1a10'),
        at(band(1, 4, 2, 6, True) + band(7, 10, 2, 6, True), '#d9c3a0'), at([(5, 5), (6, 5)], '#e0a030'),
        thing([(1, -1), (10, -1)], '#6a5440'))

# 24. Призрак: бледный, глаза — тёмные провалы
variant('ghost', 'Призрак', B('#cfcbe3', '#e2e0ee', '#b8b3d3', w='#3a3550', p='#3a3550'))

# --- материалы ---------------------------------------------------------------

# 25. Серебро: глаза того же металла — как у статуэтки
variant('silver', 'Серебро', B('#b8bec8', '#dfe3e8', '#8a919c', w='#d3d8df', p='#6f7680'),
        at(SHINE, '#eef1f4'))

# 26. Бронзовый памятник: бронза на каменном постаменте
variant('bronze', 'Бронзовый памятник', B('#b07a45', '#d19a62', '#7d5430', w='#c98f58', p='#5a3a1e'),
        thing([(x, 11) for x in range(12)], '#5d6370'), thing([(5, 11), (6, 11)], '#d9b44a'))

# 27. Розовое золото
variant('rosegold', 'Розовое золото', B('#e3a48c', '#f2c3b0', '#b87a66', w='#fbe8e0', p='#8a4a3a'),
        at(SHINE, '#f8d8cb'))

# 28. Нефрит
variant('jade', 'Нефрит', B('#4fa383', '#7cc4a6', '#2f7a5e', w='#c6ead9', p='#1f5a44'),
        at(SHINE, '#a6dcc4'))

# 29. Обсидиан: чёрный глянец с бликом
variant('obsidian', 'Обсидиан', B('#2a2b33', '#55586a', '#1a1b20'), at(SHINE, '#7a7e92'))

# 30. Фарфор: светлая глазурь, голубоватые глаза, румянец
variant('porcelain', 'Фарфор', B('#dfe4ec', '#eef1f5', '#c3cad6', w='#c9d6e8', p='#2a3a5a'),
        at([(1, 6), (10, 6)], '#f2b8c6'))

# 31. Стекло: бирюзовое стекло, блик полосой
variant('glass', 'Стекло', B('#8fd0d8', '#c6eaee', '#5fb0bc', w='#eaf7fb', p='#2a5a6a'),
        at([(1, 1), (1, 2), (2, 1), (1, 3)], '#e6f7f9'))

# 32. Терракота: матовая глина
variant('terracotta', 'Терракота', B('#c97a5a', '#d99878', '#a55c40', w='#f0e0cc', p='#5a2a1a'))

# 33. Опал: молочный, с отливом в голубое и розовое
variant('opal', 'Опал', B('#c9c4e8', '#e3f0f5', '#a39fd0', w='#f2f0fb', p='#4a3a7a'),
        at([(2, 1), (1, 6)], '#bfe6f0'), at([(9, 1), (10, 6)], '#f5c6dc'))

# 34. Виниловая фигурка: матовый пастельный, большие глянцевые глаза
variant('vinyl', 'Виниловая фигурка', B('#9fb8e8', '#b8cbef', '#7f98c8', w='#22252c', p='#f4f6fa'))

# 35. Резиновая уточка: жёлтая, оранжевый клюв, блик
variant('rubberduck', 'Резиновая уточка', B('#ffd23f', '#ffe57a', '#f2a33a'),
        at([(5, 6), (6, 6)], '#ff8a1f'), at([(1, 1), (2, 1)], '#fff3b0'))

# --- свечение ----------------------------------------------------------------

# 36. Неон: тёмный корпус, розовая и голубая трубки
variant('neon', 'Неон', B('#1c1d2e', '#ff4fd8', '#7af7ff', w='#7af7ff', p='#e9feff'))

# 37. Глубоководный: тёмно-синий, светящаяся приманка над головой
variant('deepsea', 'Глубоководный', B('#1e2a4a', '#2e3d66', '#16203a', w='#d9f7ff', p='#16203a'),
        at([(1, 7), (10, 7)], '#7af7ff'),
        thing([(5, -1), (5, -2), (6, -3)], '#2e3d66'), thing([(7, -3), (7, -2)], '#fff3a0'))

# 38. Тень: всё тёмное, глаза — две светящиеся щёлки
variant('shadow', 'Тень', B('#2a2b33', '#3a3c46', '#1f2026', w='#2a2b33', p='#f4f6fa'),
        at([(2, 4), (8, 4)], '#f4f6fa'))

# --- аркада и графика --------------------------------------------------------

# 39. Аркадный призрак: красный, глаза с синими зрачками
variant('arcade', 'Аркадный призрак', B('#e8453c', '#f06a60', '#c9302a', w='#f4f6fa', p='#2a4adf'))

# 40. Испуганный призрак: синий, глаза-точки, рот зигзагом
variant('scared', 'Испуганный призрак', B('#2a3adf', '#3a4ae8', '#2230b8', w='#2a3adf', p='#ffcfa0'),
        at([(2, 7), (4, 7), (6, 7), (8, 7), (3, 6), (5, 6), (7, 6), (9, 6)], '#ffcfa0'))

# 41. Слайм: зелёное желе, блик
variant('slime', 'Слайм', B('#7ad88f', '#b5f0c0', '#4fb36a'), at(SHINE, '#e0f9e5'))

# 42. Тучка: серо-голубая, три капли
variant('cloud', 'Тучка', B('#b8c3d2', '#d3dbe6', '#97a3b5'),
        thing([(3, 11), (6, 12), (9, 11)], '#6fa8e0'))

# --- цвет ----------------------------------------------------------------------

# 43. Негатив: цвета Отто наоборот
variant('negative', 'Негатив', B('#916400', '#734b00', '#b28729', w='#18150d', p='#edebe3'))

# 44. Чёрно-белое фото: яркость Отто без цвета
variant('mono', 'Чёрно-белый', B('#999999', '#b1b1b1', '#767676', w='#e9e9e9', p='#141414'))

# 45. Луна: бледно-жёлтая, три кратера
variant('moon', 'Луна', B('#d9d3b8', '#ece7d2', '#b8b199', w='#f5f2e6', p='#4a4536'),
        at([(1, 2), (10, 6), (6, 7)], '#c4bd9f'))

# 46. Сапфир: густо-синий, грани бликами
variant('sapphire', 'Сапфир', B('#2f5fd0', '#5a86e8', '#1f43a0', w='#dfe8ff', p='#14245a'),
        at([(2, 1), (1, 2)], '#a9c2f7'), at([(10, 6), (9, 7)], '#24489c'))

# --- характер ------------------------------------------------------------------

# 47. Соня: глаза закрыты, над головой «z»
variant('sleepy', 'Соня', None,
        at([p for p in EYES], mo.OTTO['g']), at([(2, 4), (3, 4), (8, 4), (9, 4)], '#2a3a6a'),
        thing([(11, -3), (12, -3), (12, -2), (12, -1), (13, -1)], '#4d78d6'))

# 48. Агент: тёмные очки, наушник, чёрный костюм с галстуком
variant('agent', 'Агент', None,
        at([(x, 3) for x in range(1, 11)] + [(1, 4), (2, 4), (3, 4), (4, 4), (7, 4), (8, 4), (9, 4), (10, 4)],
           '#14161c'),
        at([(2, 5), (3, 5), (8, 5), (9, 5)], mo.OTTO['g']), at([(2, 3), (8, 3)], '#4a4f5e'),
        at([(0, 5), (0, 6)], '#14161c'),
        suit('#1c1d22', tie='#2a2b33'))

# 49. Двуликий: левая половина голубая, правая розовая
variant('split', 'Двуликий', None,
        fn(lambda x, y, ch: {'h': '#ffaad6', 'g': '#ff86c0', 'd': '#d9639f'}.get(ch) if x >= 6 else None))

# 50. Кактус: зелёный, редкие колючки, цветок на макушке
variant('cactus', 'Кактус', B('#5fae5a', '#7cc476', '#3f8a3d'),
        at([(1, 2), (10, 2), (1, 6), (10, 6), (5, 7)], '#e8f0d0'),
        thing([(5, -1), (6, -1)], '#ff86c0'), thing([(5, -2)], '#ffb3d6'))


# === Третий заход (владелец: «мне нравится первый, второй, третий, девятый,
# тринадцатый, девятнадцатый, двадцать третий, двадцать четвертый. Остальные не
# очень. Как будто бы не хватает индивидуальных»). Одобренные восемь идут первыми,
# остальные 42 — новые. Отклонённые выше остаются в коде для истории, но в набор
# не входят (список ORDER в конце). У каждого нового — две-три собственные приметы
# (лицо, силуэт головы, деталь на теле), а не только цвет: перекраска без примет
# («материалы», ч/б, луна) и была «не очень».


def eye(side, cells_colors):
    """Раскраска клеток одного глаза: side 'L' или 'R', {(dx, dy): цвет} от угла глаза (2,3) / (8,3)."""
    x0 = 2 if side == 'L' else 8
    return part({(x0 + dx, 3 + dy): c for (dx, dy), c in cells_colors.items()})


TOP2 = [(x, 0) for x in range(1, 11)] + [(x, 1) for x in range(12)]   # макушка: кромка и ряд под ней

# --- роботы и техника ----------------------------------------------------------

variant('catbot', 'Робот-кот', B('#cfd6df', '#e6eaef', '#9aa3b0', w='#3ddc97', p='#d9ffe9'),
        thing([(1, -1), (1, -2), (10, -1), (10, -2)], '#9aa3b0'), thing([(2, -1), (9, -1)], '#ff9fb0'),
        at([(5, 5), (6, 5)], '#ff9fb0'), thing([(-2, 5), (-1, 5), (12, 5), (13, 5)], '#9aa3b0'))

ARC_L = [(1, 4), (2, 3), (3, 3), (4, 4)]
variant('happybot', 'Робот-весельчак', B('#5fc4c0', '#86d6d2', '#3f9a96'),
        at(band(1, 10, 2, 6, True) + sorted(EYES), '#1c2230'), at(ARC_L + mirror(ARC_L), '#ffe066'),
        thing([(-1, 3), (-1, 4), (12, 3), (12, 4)], '#3f9a96'))

variant('propbot', 'Робот с пропеллером', B('#e07b5a', '#ec9a7e', '#b05a3e', w='#2a2b33', p='#f4f6fa'),
        thing([(5, -1), (6, -1), (5, -2), (6, -2)], '#5d6675'),
        thing([(2, -2), (3, -2), (4, -2), (7, -2), (8, -2), (9, -2)], '#9aa3b0'),
        at([(1, 7), (10, 7)], '#b05a3e'))

variant('astrodroid', 'Астродроид', B('#d5dbe4', '#e8ecf1', '#9aa3b0', w='#1f2533', p='#e0483e'),
        at([(2, 1), (3, 1), (8, 1), (9, 1), (5, 2), (6, 2)], '#3d6fd0'),
        at([(1, 7), (2, 7), (4, 7), (7, 7), (9, 7), (10, 7)], '#3d6fd0'))

RIM_R = mirror(RIM)
variant('oddeye', 'Разноглазый робот', B('#8a94a6', '#a9b3c4', '#5d6675', w='#1f2533', p='#7fd3ff'),
        at(RIM_R, '#c3cad4'),
        eye('L', {(0, 0): '#5d6675', (1, 0): '#5d6675', (0, 2): '#5d6675', (1, 2): '#5d6675',
                  (0, 1): '#ff4a3d', (1, 1): '#ff9a8f'}),
        thing([(2, -1), (2, -2)], '#5d6675'), thing([(2, -3)], '#ff4a3d'))

variant('cassette', 'Кассета', B('#3a3d47', '#555966', '#2a2c33', w='#e7eaf2', p='#2a2c33'),
        at([(x, 1) for x in range(1, 11)], '#efe6cf'), at([(x, 2) for x in range(1, 11)], '#e0483e'),
        at([(4, 3), (5, 3), (6, 3), (7, 3), (4, 5), (5, 5), (6, 5), (7, 5)], '#22242b'),
        at([(4, 4), (5, 4), (6, 4), (7, 4)], '#7a5232'), at([(1, 7), (10, 7)], '#c3cad4'))

variant('boombox', 'Бумбокс', B('#c3cad4', '#dfe3e8', '#8a919c', w='#2a2b33', p='#8a919c'),
        at(RIM + RIM_R, '#5d6675'), at([(5, 3), (6, 3), (5, 4), (6, 4)], '#3a3d47'),
        at([(3, 1)], '#e0483e'), at([(4, 1)], '#f2c230'), at([(7, 1)], '#3ddc97'), at([(8, 1)], '#3d7bd9'),
        thing([(1, -1), (10, -1)], '#5d6675'), thing([(x, -2) for x in range(1, 11)], '#5d6675'))

variant('alarmclock', 'Будильник', B('#d9483e', '#e8706a', '#a8302a', w='#fbfaf6', p='#2a2b33'),
        at(band(1, 10, 1, 6, True), '#efe2c4'), at([(5, 2), (5, 3), (6, 3)], '#2a2b33'),
        thing([(0, -1), (1, -1), (0, -2), (1, -2), (10, -1), (11, -1), (10, -2), (11, -2)], '#e9b949'),
        thing([(5, -1), (6, -1)], '#5d6675'))

variant('arcadecab', 'Игровой автомат', B('#4a2a8a', '#6a44b0', '#33206a', w='#5fd3ce', p='#0b0b1a'),
        at([(x, 1) for x in range(12)], '#ffd23f'), at(band(1, 10, 2, 6), '#0b0b1a'),
        at([(3, 7)], '#e0483e'), at([(7, 7)], '#ffd23f'), at([(9, 7)], '#5fd3ce'))

variant('tamagotchi', 'Тамагочи', B('#9fe0d0', '#c2ece2', '#6fbfae', w='#c7d3b8', p='#2a3020'),
        at(band(2, 9, 2, 6, True), '#c7d3b8'), at([(3, 3), (9, 3)], '#2a3020'),
        at([(3, 7), (8, 7)], '#ff86a0'),
        thing([(5, -1), (6, -1)], '#9aa3b0'), thing([(5, -2), (6, -2)], '#c3cad4'))

variant('camera', 'Фотоаппарат', B('#2a2b33', '#3a3c46', '#1f2026', w='#3a6a9a', p='#bfe0ff'),
        at(TOP2, '#c3cad4'), at(RIM_R, '#8a919c'), at([(10, 1)], '#e0483e'),
        eye('L', {(0, 0): '#5d6675', (1, 0): '#5d6675', (0, 2): '#5d6675', (1, 2): '#5d6675',
                  (0, 1): '#9fc5e8', (1, 1): '#9fc5e8'}),
        thing([(2, -1), (3, -1)], '#8a919c'))

variant('radio', 'Радиоприёмник', B('#8a5a34', '#a8774c', '#6b432c', w='#efe3c0', p='#c0392b'),
        at([(x, 1) for x in range(12)], '#d9b44a'), at(band(2, 9, 6, 7), '#b89466'),
        thing([(10, -1), (11, -2), (12, -3)], '#c3cad4'), thing([(13, -3)], '#8a919c'))

variant('minerbot', 'Робот-шахтёр', B('#6b7280', '#8a919c', '#4a505c', w='#ffd23f', p='#7a4f10'),
        at(TOP2, '#f5c518'), thing([(4, -1), (7, -1)], '#3a3f4b'), thing([(5, -1), (6, -1)], '#fff3a0'))

variant('toaster', 'Тостер', B('#c3cad4', '#dfe3e8', '#8a919c'),
        at([(2, 0), (3, 0), (4, 0), (7, 0), (8, 0), (9, 0)], '#3a3f4b'),
        thing([(2, -1), (3, -1), (4, -1), (7, -1), (8, -1), (9, -1)], '#e0b070'),
        thing([(2, -2), (3, -2), (4, -2), (7, -2), (8, -2), (9, -2)], '#b07a3a'),
        at([(11, 4), (11, 5)], '#3a3f4b'), at([(1, 2), (1, 3)], '#eef1f4'))

# --- шлемы и маски -------------------------------------------------------------

variant('samurai', 'Самурай', B('#8a2a2a', '#b03a3a', '#5a1a1a'),
        at(TOP2, '#1f1f24'), at([(x, 7) for x in range(1, 11)], '#1f1f24'),
        thing([(3, -1), (2, -2), (1, -3), (8, -1), (9, -2), (10, -3)], '#e9b949'),
        thing([(5, -1), (6, -1), (5, -2), (6, -2)], '#e9b949'))

T_SLOT = [(4, 4), (5, 4), (6, 4), (7, 4), (5, 5), (6, 5), (5, 6), (6, 6), (5, 7), (6, 7)]
variant('spartan', 'Спартанец', B('#c49a4a', '#ddb66a', '#8a6a2a', w='#1c1f26', p='#f4f6fa'),
        at(T_SLOT, '#1c1f26'),
        thing([(x, -1) for x in range(2, 10)], '#c9443c'), thing([(x, -2) for x in range(3, 9)], '#a8302a'))

variant('welder', 'Сварщик', B('#4a4f5a', '#5f6572', '#3a3f48', w='#3d6a4a', p='#9fe0b0'),
        at(band(1, 10, 3, 5), '#1f3a2a'), at([(x, 2) for x in range(1, 11)] + [(x, 6) for x in range(1, 11)], '#2a2e37'),
        thing([(13, 6), (12, 8), (13, 9)], '#ffb347'), thing([(13, 7)], '#fff3a0'))

BEAK = [(5, 4), (6, 4), (5, 5), (6, 5), (5, 6), (6, 6), (5, 7), (6, 7)]
variant('plaguedoc', 'Чумной доктор', B('#2a2b33', '#3a3c46', '#1f2026', w='#b8863b', p='#c0392b'),
        at(BEAK, '#d9c3a0'), at([(6, 5), (6, 6), (6, 7)], '#b8a07a'),
        thing([(x, -1) for x in range(1, 11)], '#1f2026'), thing([(x, -2) for x in range(4, 8)], '#1f2026'))

LUCHA = [(1, 4), (1, 5), (1, 6), (2, 6), (3, 6)]
variant('luchador', 'Лучадор', B('#e0409a', '#ec6ab4', '#b02a78'),
        at(LUCHA + mirror(LUCHA), '#ffd23f'), at([(5, 0), (6, 0), (5, 1), (6, 1), (5, 2), (6, 2)], '#ffd23f'),
        at([(4, 1), (7, 1)], '#ffd23f'))

variant('testpilot', 'Лётчик-испытатель', B('#d0d6de', '#e4e8ed', '#9aa3b0', w='#3d5a8a', p='#2a3a5a'),
        at(VISOR, '#2a3a5a'), at([(2, 2), (3, 2), (4, 2)], '#ff9a3c'), at([(5, 2)], '#ffc27a'),
        at([(5, 0), (6, 0), (5, 1), (6, 1)], '#c9443c'))

variant('racer', 'Гонщик', B('#e0483e', '#ec6a62', '#b0302a', w='#3a4a6a', p='#8fb6ff'),
        at([(4, 0), (4, 1), (4, 2), (7, 0), (7, 1), (7, 2)], '#f2f3f5'),
        at(band(1, 10, 3, 5), '#1f2533'), at([(1, 3), (4, 3)], '#4a5a7a'))

variant('ninja', 'Ниндзя', B('#2a2b33', '#3a3c46', '#1f2026'),
        at(band(1, 10, 3, 5), mo.OTTO['g']), at([(x, 1) for x in range(12)], '#d63a32'),
        thing([(-1, 1), (-2, 0), (-2, 2)], '#d63a32'))

# --- существа ------------------------------------------------------------------

variant('eagleowl', 'Филин', B('#6b5a4a', '#86735f', '#4a3e33', w='#ff9a3c', p='#2a1a10'),
        at(band(1, 4, 2, 6, True) + band(7, 10, 2, 6, True), '#a08a70'), at([(5, 5), (6, 5)], '#3a3530'),
        at([(3, 7), (8, 7)], '#86735f'),
        thing([(1, -1), (1, -2), (2, -1), (10, -1), (10, -2), (9, -1)], '#4a3e33'))

variant('bat', 'Летучая мышь', B('#3a2f4a', '#4f4266', '#2a2236', w='#f4f6fa', p='#c0392b'),
        thing([(1, -1), (1, -2), (10, -1), (10, -2)], '#3a2f4a'), thing([(2, -1), (9, -1)], '#c97a9a'),
        thing([(-1, 3), (-2, 2), (-1, 4), (12, 3), (13, 2), (12, 4)], '#2a2236'),
        at([(4, 7), (7, 7)], '#f4f6fa'))

variant('alien', 'Инопланетянин', B('#7ad86b', '#a8eb9a', '#4fae4a', w='#14161c', p='#14161c'),
        at([(1, 3), (4, 5), (10, 3), (7, 5)], '#14161c'), at([(2, 3), (8, 3)], '#e6f6e6'),
        thing([(3, -1), (3, -2), (8, -1), (8, -2)], '#4fae4a'), thing([(3, -3), (8, -3)], '#ff86c0'))

variant('imp', 'Чертёнок', B('#d9483e', '#e8706a', '#a8302a', w='#ffd23f', p='#3a0d0d'),
        thing([(2, -1), (1, -2), (9, -1), (10, -2)], '#efe6cf'),
        thing([(12, 8), (13, 7), (13, 6)], '#a8302a'), thing([(12, 5), (13, 5)], '#a8302a'))

variant('frankenstein', 'Франкенштейн', B('#8fbf6a', '#a8d088', '#6e9a4e'),
        at(TOP2 + [(2, 2), (4, 2), (7, 2), (9, 2)], '#1f2024'),
        at([(7, 7), (8, 7), (9, 7), (8, 6)], '#3a4a2a'),
        thing([(-1, 5), (12, 5)], '#9aa3b0'), thing([(-2, 5), (13, 5)], '#5d6675'))

variant('mummy', 'Мумия', B('#e3d6b8', '#efe6cf', '#c9b994', w='#2a2b33', p='#ffd23f'),
        at([(x, 2) for x in range(12)] + [(x, 6) for x in range(12)], '#c9b994'),
        eye('L', {(dx, dy): '#e3d6b8' for dx in (0, 1) for dy in (0, 1, 2)}),
        at([(1, 4), (2, 4), (3, 4), (4, 4)], '#c9b994'),
        thing([(12, 7), (13, 8)], '#d9cba8'))

variant('vampire', 'Вампир', B('#d8dbe8', '#e6e8f0', '#2a2b33', w='#f4f6fa', p='#c0392b'),
        at(TOP2 + [(5, 2), (6, 2)], '#1f2024'), at([(0, 6), (11, 6)], '#c0392b'),
        at([(4, 7), (7, 7)], '#f4f6fa'),
        thing([(-1, 4), (-1, 5), (-1, 6), (12, 4), (12, 5), (12, 6)], '#8a1a2a'))

variant('jacklantern', 'Тыква-фонарь', B('#f28c28', '#ffa94d', '#c9640e', w='#ffd23f', p='#ff9a1f'),
        at([(1, y) for y in range(1, 8)] + [(10, y) for y in range(1, 8)], '#d9741a'),
        at([(2, 3), (9, 3)], '#f28c28'), at([(3, 6), (8, 6), (4, 7), (5, 7), (6, 7), (7, 7)], '#ffd23f'),
        thing([(5, -1), (6, -1), (6, -2)], '#4f8a34'), thing([(7, -2)], '#6fbf4a'))

variant('shark', 'Акула', B('#7d93b0', '#9fb2cb', '#5f7593'),
        at([(x, 7) for x in range(1, 11)] + ROW8, '#eef1f5'),
        at([(x, 6) for x in range(2, 10)], '#3a4250'), at([(3, 6), (5, 6), (6, 6), (8, 6)], '#f4f6fa'),
        at([(1, 3), (1, 5), (10, 3), (10, 5)], '#5f7593'),
        thing([(5, -1), (6, -1), (7, -1), (6, -2), (7, -2), (7, -3)], '#5f7593'))

CLAW = [(-2, 0), (-1, 0), (-2, 1), (-2, 2), (-1, 2), (-1, 3)]
variant('crab', 'Краб', B('#e0483e', '#ec6a62', '#b0302a'),
        thing(CLAW + mirror(CLAW), '#e0483e'), thing([(-1, 0), (12, 0)], '#b0302a'))

variant('bear', 'Медвежонок', B('#9a6a42', '#b8845a', '#6e4a2a'),
        thing([(1, -2), (2, -2), (1, -1), (9, -2), (10, -2), (10, -1)], '#9a6a42'),
        thing([(2, -1), (9, -1)], '#d9b48a'),
        at([(4, 6), (7, 6), (4, 7), (5, 7), (6, 7), (7, 7)], '#d9b48a'), at([(5, 6), (6, 6)], '#3a2a20'))

variant('frog', 'Лягушонок', B('#5cbf4f', '#86d877', '#3f9a36'),
        thing([(2, -1), (3, -1), (8, -1), (9, -1)], '#5cbf4f'),
        at([(x, 6) for x in range(2, 10)], '#2f6a2a'), at([(1, 6), (10, 6)], '#ff9fb0'))

variant('wisp', 'Блуждающий огонёк', B('#7af7ff', '#c9fbff', '#3fd0e0', w='#1f5a6a', p='#1f5a6a'),
        thing([(5, -1), (6, -1), (6, -2), (5, -3)], '#7af7ff'), thing([(-1, 2), (12, 6), (13, 1)], '#c9fbff'))

variant('amanita', 'Мухомор', B('#e6d5b0', '#e0483e', '#c9b48c', w='#fbfaf6', p='#2a2b33'),
        at([(x, 1) for x in range(12)] + [(x, 2) for x in range(12)], '#e0483e'),
        at([(2, 1), (6, 0), (9, 2), (4, 2)], '#f4f1ea'),
        thing([(-1, 2), (12, 2)], '#e0483e'))

# Рыба-клоун (белая полоса по центру) читалась молнией на куртке — заменена
# обезьянкой: светлое лицо сердечком, как диски совы, и круглые уши.
MONKEY_FACE = [p for p in band(1, 10, 2, 7, True) if p not in {(5, 2), (6, 2)}]
variant('monkey', 'Обезьянка', B('#8a5a34', '#a8774c', '#6b432c'),
        at(MONKEY_FACE, '#e6c8a4'), at([(5, 6), (6, 6)], '#6b432c'),
        thing([(-1, 3), (-1, 4), (-2, 3), (-2, 4), (12, 3), (12, 4), (13, 3), (13, 4)], '#8a5a34'),
        thing([(-1, 3), (-1, 4), (12, 3), (12, 4)], '#e6a088'))

variant('hedgehog', 'Ёжик', B('#d9b48a', '#5a4030', '#b8916a'),
        at(TOP2, '#5a4030'), at([(0, 2), (11, 2)], '#5a4030'), at([(5, 6), (6, 6)], '#2a2b33'),
        thing([(1, -1), (3, -1), (5, -1), (6, -1), (8, -1), (10, -1)], '#5a4030'))

# Ушки коалы — круглые на углах головы: прямоугольники сбоку читались рогами.
KOALA_EAR = [(-1, -2), (0, -2), (-2, -1), (-1, -1), (0, -1), (-2, 0), (-1, 0), (0, 0)]
variant('koala', 'Коала', B('#9aa0aa', '#b8bdc6', '#7d838e'),
        thing(KOALA_EAR + mirror(KOALA_EAR), '#9aa0aa'),
        thing([(-1, -1), (12, -1)], '#e6e8ec'),
        at([(5, 5), (6, 5), (5, 6), (6, 6)], '#3a3f4b'))

variant('dog', 'Пёс', B('#d9b48a', '#e6c8a4', '#b8916a'),
        thing([(-1, 1), (-1, 2), (-1, 3), (-1, 4), (-2, 2), (-2, 3),
               (12, 1), (12, 2), (12, 3), (12, 4), (13, 2), (13, 3)], '#8a5a34'),
        at([(7, 2), (8, 2), (9, 2), (10, 2), (10, 3), (10, 4), (7, 3)], '#8a5a34'),
        at([(5, 6), (6, 6)], '#2a2b33'))

variant('rabbit', 'Кролик', B('#d6b8cc', '#e3cad9', '#b896ac'),
        thing([(x, y) for x in (2, 3, 8, 9) for y in (-3, -2, -1)], '#d6b8cc'),
        thing([(3, -2), (3, -1), (8, -2), (8, -1)], '#ff9fb0'), at([(5, 6), (6, 6)], '#ff7f9a'))

ANTLER = [(2, -1), (2, -2), (1, -2), (1, -3), (3, -3)]
variant('deer', 'Олень', B('#b8845a', '#cfa078', '#8a5a34'),
        thing(ANTLER + mirror(ANTLER), '#7a5530'), at([(5, 6), (6, 6)], '#c0392b'),
        at([(2, 7), (9, 7), (1, 6), (10, 6)], '#f2e6d6'))

KEEP = ['assistant', 'monitor', 'android', 'toybot', 'calculator', 'helm', 'owl', 'ghost']
NEW = ['catbot', 'happybot', 'propbot', 'astrodroid', 'oddeye', 'cassette', 'boombox', 'alarmclock',
       'arcadecab', 'tamagotchi', 'camera', 'radio', 'minerbot', 'toaster',
       'samurai', 'spartan', 'welder', 'plaguedoc', 'luchador', 'testpilot', 'racer', 'ninja',
       'eagleowl', 'bat', 'alien', 'imp', 'frankenstein', 'mummy', 'vampire', 'jacklantern', 'shark',
       'crab', 'bear', 'frog', 'wisp', 'amanita', 'monkey', 'hedgehog', 'koala', 'dog', 'rabbit', 'deer']
_by = {}
for _v in VARIANTS:
    assert _v['slug'] not in _by, f'имя повторяется: {_v["slug"]}'
    _by[_v['slug']] = _v
VARIANTS[:] = [_by[s] for s in KEEP + NEW]


def main():
    out = OUT / 'png'
    out.mkdir(parents=True, exist_ok=True)
    for old in out.glob('*.png'):
        old.unlink()
    manifest = {'canvas': {'w': mo.W, 'h': mo.H, 'ox': mo.OX, 'oy': mo.OY, 'scale': mo.SCALE, 'bg': mo.BG},
                'source': 'assets/js/pet.js ART.idle[0] + SKIN.otto', 'max_outside': MAX_OUTSIDE,
                'variants': []}
    grids = []
    for n, v in enumerate(VARIANTS, 1):
        body, items = mo.render(v)
        grid = mo.compose(body, items)
        name = f'{n:02d}_{v["slug"]}.png'
        mo.to_image(grid, mo.SCALE).save(out / name, optimize=True)
        grids.append(grid)
        manifest['variants'].append({
            'n': n, 'slug': v['slug'], 'ru': v['ru'], 'file': f'png/{name}',
            'body': [[x, y, body[y][x]] for y in range(mo.H) for x in range(mo.W) if body[y][x]],
            'items': [[x, y, items[y][x]] for y in range(mo.H) for x in range(mo.W) if items[y][x]],
        })
    cols = 10 if len(grids) > 8 else 4
    mo.sheet(grids, range(1, len(grids) + 1), cols, SHEET_SCALE,
             OUT / ('sheet.png' if cols == 10 else 'batch1_sheet.png'))
    (OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'набор 2: {len(VARIANTS)} вариаций; холст {mo.W}×{mo.H}, тело в ({mo.OX}, {mo.OY})')


if __name__ == '__main__':
    sys.exit(main())
