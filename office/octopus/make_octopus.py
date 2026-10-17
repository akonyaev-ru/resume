# -*- coding: utf-8 -*-
"""Вариации Отто на белом фоне (2026-10-15, просьба владельца: «50 осьминогов,
позу не менять — только цвета и предметы»).

Рисунок не перерисовывается: клетки тела берутся из кадра покоя `ART.idle[0]`
в assets/js/pet.js, как у tools/make_favicon.js. Тело стоит в одной и той же
клетке холста у всех вариаций. Вариация = палитра тела (или раскраска по клеткам:
полосы, пятна) + предметы шаблонами по пикселям поверх и вокруг.

    py make_octopus.py          — PNG каждой вариации, лист, manifest.json
    py check_pose.py            — проверка «поза не сдвинулась» (отдельно)

Координаты в шаблонах — клетки тела: x 0..11 слева направо, y 0..10 сверху
(y 0 — верхняя светлая кромка, y 9..10 — щупальца). Предметы могут выходить
за тело: холст шире и выше. Точка в шаблоне — пусто.
"""
import json
import re
import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = next(p for p in HERE.parents if (p / 'assets' / 'js' / 'pet.js').is_file())   # корень сайта: рабочая папка .proto/design/octopus или office/octopus в репозитории
PET = ROOT / 'assets' / 'js' / 'pet.js'

W, H = 24, 22          # холст в клетках
OX, OY = 6, 8          # где на холсте клетка тела (0, 0)
SCALE = 16             # отдельная вариация: клетка = 16×16 точек
SHEET_SCALE = 6        # лист: клетка = 6×6 точек
BG = '#ffffff'


def load_otto():
    pet = PET.read_text(encoding='utf-8')
    at = pet.index('    idle: [[')
    end = pet.index('], [', at)
    rows = [r for r in re.findall(r"'([.a-z]+)'", pet[at:end]) if re.search(r'[^.]', r)]
    frm = pet.index('    otto: {')
    to = pet.index('    olivia: {', frm)
    skin = dict(re.findall(r"\b([a-z]): '(#[0-9a-f]{6})'", pet[frm:to]))
    return rows, skin


BODY, OTTO = load_otto()
BW, BH = len(BODY[0]), len(BODY)


# --- описание вариаций ------------------------------------------------------

def tpl(x, y, art, pal, outline=None):
    """Предмет: левый верхний угол (x, y) в клетках тела, рисунок строками."""
    rows = [r for r in art.strip('\n').split('\n')]
    return {'x': x, 'y': y, 'rows': rows, 'pal': pal, 'outline': outline}


def cells(points, color):
    """Предмет из списка клеток (для того, что проще посчитать, чем нарисовать)."""
    return {'cells': [(x, y, color) for x, y in points]}


def body(g, h, d, **kw):
    """Палитра тела: основной цвет, светлая кромка сверху, щупальца и низ."""
    return dict(g=g, h=h, d=d, **kw)


VARIANTS = []


def variant(slug, ru, skin=None, paint=None, items=()):
    VARIANTS.append({'slug': slug, 'ru': ru, 'skin': dict(OTTO, **(skin or {})),
                     'paint': paint, 'items': list(items)})


def rows_paint(colors):
    """Раскраска по рядам тела: {y: цвет} — полосы."""
    def f(x, y, ch, skin):
        return colors.get(y)
    return f


def cells_paint(colors, under=None):
    """Раскраска отдельных клеток тела: {(x, y): цвет} — пятна, полосы, швы."""
    def f(x, y, ch, skin):
        return colors.get((x, y)) or (under(x, y, ch, skin) if under else None)
    return f


def mirror_points(points):
    """Тело симметрично около x = 5,5: клетка x отражается в 11 − x."""
    return [(11 - x, y) for x, y in points]


def pair(x, y, art, pal, outline=None):
    """Пара предметов: слева как нарисовано, справа зеркально."""
    rows = art.strip('\n').split('\n')
    w = max(len(r) for r in rows)
    rows = [r.ljust(w, '.') for r in rows]
    return [tpl(x, y, '\n'.join(rows), pal, outline),
            tpl(11 - (x + w - 1), y, '\n'.join(r[::-1] for r in rows), pal, outline)]


def mix(c, to, k):
    a = [int(c[i:i + 2], 16) for i in (1, 3, 5)]
    b = [int(to[i:i + 2], 16) for i in (1, 3, 5)]
    return '#%02x%02x%02x' % tuple(round(p + (q - p) * k) for p, q in zip(a, b))


def minos(origins, color):
    """Фигура тетриса: клетка фигуры — квадрат 2×2 со светлым углом и тёмным."""
    out = []
    for x, y in origins:
        out += [(x, y, mix(color, '#ffffff', 0.35)), (x + 1, y, color),
                (x, y + 1, color), (x + 1, y + 1, mix(color, '#000000', 0.22))]
    return {'cells': out}


# 1. Француз: берет, усы, багет, тельняшка на щупальцах
variant('french', 'Француз',
        paint=rows_paint({7: '#e3e8f1', 8: '#26346b', 9: '#cdd6e5', 10: '#26346b'}),
        items=[
            tpl(-1, -3, """
.......k......
....bbbbbb....
..bbbBBbbbbbb.
.bbbbbbbbbbbbbb
""", {'k': '#2a2d3a', 'b': '#2a2d3a', 'B': '#4a5066'}),
            tpl(0, 5, """
.m........m.
..mmmmmmmm..
""", {'m': '#3b2a20'}),
            tpl(12, 2, """
....Cc
...CcC
..CcC.
.CcC..
CcC...
cC....
""", {'C': '#d0913f', 'c': '#f2c67e'}, outline='#9a6326'),
        ])

# 2. Робот: металл, глаза-экраны бирюзой, антенна, болты, решётка рта
variant('robot', 'Робот',
        skin={'g': '#a3acb9', 'h': '#cdd3dc', 'd': '#6f7786', 'w': '#1f2633', 'p': '#5fd3ce'},
        paint=rows_paint({9: '#6f7786', 10: '#4c5462'}),
        items=[
            tpl(3, -4, """
..aa..
..aa..
..ss..
.pppp.
""", {'a': '#ff5a4f', 's': '#4c5462', 'p': '#6f7786'}),
            tpl(-1, 3, "n\nN\nn", {'n': '#6f7786', 'N': '#cdd3dc'}),
            tpl(12, 3, "n\nN\nn", {'n': '#6f7786', 'N': '#cdd3dc'}),
            cells([(1, 1), (10, 1), (1, 7), (10, 7)], '#6f7786'),
            tpl(4, 7, "gGgG", {'g': '#3b4250', 'G': '#7d8696'}),
        ])

# 3. Пират: треуголка с черепом, повязка, серьга, сабля
variant('pirate', 'Пират',
        skin={'g': '#e0674f', 'h': '#f08a73', 'd': '#b44a37'},
        items=[
            tpl(-2, -6, """
....kkkkkkkk....
...kkkkWWWkkkk..
k..kkkWkWkWkkk.k
kk.kkkkWWWkkk.kk
kkkkkkkkkkkkkkkk
.yyyyyyyyyyyyyy.
""", {'k': '#24252c', 'W': '#f2efe6', 'y': '#e9b949'}),
            tpl(2, 3, "kk\nkk\nkk", {'k': '#24252c'}),
            cells([(4, 2), (5, 1), (1, 6), (0, 7)], '#24252c'),
            cells([(12, 5)], '#e9b949'),
            tpl(13, -1, """
..s.
.sS.
.sS.
.sS.
.sS.
.sS.
yyyy
.h..
.h..
.y..
""", {'s': '#e4e9ef', 'S': '#a9b2bf', 'y': '#e9b949', 'h': '#6b432c'}, outline='#5d6675'),
        ])

# 4. Судья: парик, мантия, жабо, молоток
variant('judge', 'Судья',
        paint=rows_paint({7: '#2b2d36', 8: '#2b2d36', 9: '#2b2d36', 10: '#2b2d36'}),
        items=[
            tpl(-2, -2, """
....wwwwwwww....
..cccccccccccc..
.wwwwwwwwwwwwww.
cc............cc
ww............ww
cc............cc
ww............ww
""", {'w': '#efeee7', 'c': '#c4c2b6'}, outline='#8f8d83'),
            tpl(5, 7, "jj\njj", {'j': '#f4f4f0'}),
            tpl(12, 5, """
..HHH
..HHH
...h.
..h..
.h...
h....
""", {'H': '#7a4b30', 'h': '#b07a52'}),
        ])

# 5. Волшебник: колпак со звездой, волшебная палочка
variant('wizard', 'Волшебник',
        items=[
            tpl(-2, -8, """
..........p.....
.........pp.....
........ppp.....
.......ppPp.....
......pppPp.....
.....psppPpp....
....ppppppppp...
...yyyyyyyyyyy..
pppppppppppppppp
""", {'p': '#4b3591', 'P': '#7258c4', 's': '#ffd84a', 'y': '#e9b949'}),
            tpl(12, 2, """
...s.
..sss
...s.
..w..
.w...
w....
""", {'s': '#ffd84a', 'w': '#5b3a29'}),
        ])

# 6. Пчела: жёлтая в чёрную полоску, усики, крылья
variant('bee', 'Пчела',
        skin={'g': '#f7c531', 'h': '#ffdc6a', 'd': '#d9a514'},
        paint=rows_paint({7: '#2a2630', 9: '#2a2630'}),
        items=[
            tpl(0, -3, """
.kk......kk.
..k......k..
...k....k...
""", {'k': '#2a2630'}),
            tpl(-4, -1, """
.ww.
wwww
wwww
.www
""", {'w': '#d7ecff'}, outline='#7fb0dc'),
            tpl(12, -1, """
.ww.
wwww
wwww
www.
""", {'w': '#d7ecff'}, outline='#7fb0dc'),
        ])

# 7. Огонь: тело-пламя, языки огня на голове, искры
variant('fire', 'Огонь',
        skin={'h': '#ffd447', 'g': '#ff8f2a', 'd': '#e0482a', 'w': '#fff4d6', 'p': '#5a1a10'},
        items=[
            tpl(0, -5, """
..R.....R...
..RR..R.RR..
.RRoR.RRoRR.
.RooRRRooooR
RRoyyooyyooR
""", {'R': '#e0482a', 'o': '#ff8f2a', 'y': '#ffd447'}),
            cells([(-2, -2), (14, -4), (15, 1)], '#ffb33a'),
        ])


# 8. Космонавт: стеклянный шлем, воротник, скафандр
def dome():
    cx, cy, rx, ry = 5.5, 2.5, 8.0, 7.0
    pts = []
    for y in range(-6, 8):
        for x in range(-4, 16):
            d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
            if 0.82 <= d <= 1.12:
                pts.append((x, y))
    return pts


variant('astronaut', 'Космонавт',
        paint=rows_paint({9: '#c9d0db', 10: '#c9d0db'}),
        items=[
            cells(dome(), '#8fb6d4'),
            cells([(-1, -1), (0, -2), (1, -3)], '#d9ecfa'),
            tpl(-2, 8, """
CccccccccccccccC
""", {'C': '#6f7786', 'c': '#a3acb9'}),
        ])

# --- профессии ---------------------------------------------------------------

variant('chef', 'Шеф-повар',
        skin=body('#f49ab0', '#f8bccb', '#d9738c'),
        items=[
            tpl(0, -6, """
..www..www..
.wwwwwwwwww.
wwwwwswwwwww
wwswwswwwsww
.wwwwwwwwww.
..cccccccc..
.wwwwwwwwww.
""", {'w': '#f3f3ef', 's': '#d6d6cf', 'c': '#d6d6cf'}, outline='#8f8f88'),
            tpl(3, 7, """
rrrrrr
.rrrr.
..rr..
""", {'r': '#d94a4a'}),
            tpl(12, 1, """
ww.
ww.
ww.
.h.
.h.
.h.
.h.
""", {'w': '#c98d55', 'h': '#a06a3a'}),
        ])

variant('firefighter', 'Пожарный',
        skin=body('#45b39d', '#6fd0bb', '#2f8a78'),
        items=[
            tpl(-1, -4, """
.....rrrr.....
...rLrrrrrr...
..rLrryyrrrr..
.rrrrryyrrrrr.
RRRRRRRRRRRRRR
""", {'r': '#d63a32', 'L': '#ef6a5c', 'y': '#f0c040', 'R': '#a8261f'}),
            tpl(12, 2, """
.h..
rhGG
.hGG
.h..
.h..
.h..
.h..
""", {'h': '#b07a52', 'r': '#d63a32', 'G': '#c3cad4'}, outline='#5d6675'),
        ])

variant('builder', 'Строитель',
        paint=rows_paint({7: '#ff8c1a', 8: '#dfe3e8', 9: '#ff8c1a', 10: '#ff8c1a'}),
        items=[
            tpl(-1, -3, """
.....yyyy.....
...yyyYYyyy...
..yyyyYYyyyy..
dddddddddddddd
""", {'y': '#f5c518', 'Y': '#ffe066', 'd': '#d4a20c'}),
            tpl(12, 3, """
LLLL
GG.G
.h..
.h..
.h..
.h..
""", {'L': '#b9c1cc', 'G': '#7d8696', 'h': '#b07a52'}),
        ])

variant('doctor', 'Доктор',
        skin=body('#7fd1c1', '#a6e3d6', '#4fae9c'),
        paint=rows_paint({7: '#eef1f5', 8: '#eef1f5'}),
        items=[
            tpl(2, -4, """
.wwwwww.
wwwRRwww
wwRRRRww
wwwRRwww
wwwwwwww
""", {'w': '#f3f4f6', 'R': '#e0483e'}, outline='#9aa3b0'),
            tpl(2, 6, """
k......k
.k....k.
..kkkk..
....s...
""", {'k': '#3b4250', 's': '#a3acb9'}),
        ])

variant('police', 'Полицейский',
        items=[
            tpl(-1, -3, """
nnnNnnnnnnnnnn
.nnnnnyynnnnn.
..bbbbbbbbbb..
..kKkkkkkkkk..
""", {'n': '#1f2f5a', 'N': '#3a4c8a', 'y': '#f0c040', 'b': '#2a2d3a', 'k': '#14161c', 'K': '#4a4f5e'}),
            tpl(2, 6, "yy\nyy", {'y': '#f0c040'}),
        ])

variant('detective', 'Детектив',
        skin=body('#9a8fd6', '#b8afe6', '#766bb8'),
        items=[
            tpl(-1, -3, """
....cCcCcC....
..cCcCcCcCcC..
.CcCcCcCcCcCc.
f.pppppppppp.f
f............f
""", {'c': '#c79a63', 'C': '#9a7246', 'p': '#7a5530', 'f': '#9a7246'}),
            tpl(12, 0, """
..rr.
.raar
.raar
..rr.
.h...
h....
""", {'r': '#3b4250', 'a': '#cfe7f5', 'h': '#6b432c'}),
            tpl(-4, 3, """
s...
.s..
bb..
bbsss
""", {'b': '#6b432c', 's': '#3b2a20'}),
        ])

variant('scientist', 'Учёный',
        skin=body('#ff9e7a', '#ffbea3', '#e07a56'),
        paint=rows_paint({7: '#eef1f5', 8: '#eef1f5'}),
        items=[
            tpl(0, 1, """
kkkkkkkkkkkk
.kLLk..kLLk.
""", {'k': '#3b4250', 'L': '#ffcf5a'}),
            tpl(13, 3, """
.gg.
.gg.
gLLg
LLLL
LLLL
""", {'g': '#cfe7f5', 'L': '#e05ad0'}, outline='#5d6675'),
        ])

variant('painter', 'Художник',
        paint=cells_paint({(1, 1): '#e5484d', (2, 1): '#e5484d', (2, 2): '#e5484d',
                           (9, 1): '#ffd84a', (10, 2): '#ffd84a', (9, 2): '#ffd84a',
                           (5, 7): '#4cc06a', (6, 7): '#4cc06a', (6, 8): '#4cc06a',
                           (0, 5): '#ff8a1f', (0, 6): '#ff8a1f', (11, 5): '#b48cff',
                           (8, 9): '#ff86c0', (8, 10): '#ff86c0'}),
        items=[
            tpl(-6, 4, """
.wwww.
wrwyww
wwbwgw
.wwww.
""", {'w': '#d9a86c', 'r': '#e5484d', 'y': '#ffd84a', 'b': '#4a8fe7', 'g': '#4cc06a'}, outline='#9a6b3a'),
            tpl(12, 1, """
....r
...rr
...s.
..h..
.h...
h....
""", {'r': '#e5484d', 's': '#a3acb9', 'h': '#6b432c'}),
        ])

variant('sailor', 'Моряк',
        items=[
            tpl(-1, -3, """
..wwwwwwwwww..
.wwwwwwwwwwww.
..kkkkkkkkkk..
""", {'w': '#f1f3f6', 'k': '#1d1f27'}, outline='#9aa3b0'),
            cells([(11, -1), (12, 0), (11, 0), (12, 1), (13, 1)], '#1d1f27'),
            cells([(12, 2), (13, 2)], '#e9b949'),
            tpl(-6, 3, """
...h...
..ooo..
.o.o.o.
hoohooh
.o.o.o.
..ooo..
...h...
""", {'o': '#8a5a34', 'h': '#c98d55'}),
        ])

variant('pilot', 'Лётчик',
        skin=body('#d68fd6', '#e8b3e8', '#b06ab0'),
        items=[
            tpl(-1, -2, """
...bbbbbbbb...
..bbbBbbbbbb..
.bbbbbbbbbbbb.
b............b
b............b
b............b
""", {'b': '#8a5a34', 'B': '#a8774c'}),
            tpl(1, 1, """
ffffffffff
fLLf..fLLf
""", {'f': '#3b2a20', 'L': '#9fd0ee'}),
            tpl(0, 7, "ssssssssssss", {'s': '#e0483e'}),
            cells([(12, 7), (13, 7), (13, 6), (14, 6), (15, 7), (16, 7), (16, 8)], '#e0483e'),
        ])

variant('programmer', 'Программист',
        items=[
            tpl(-1, -2, """
...hhhhhhhh...
..h........h..
.h..........h.
h............h
cc..........cc
cC..........Cc
cc..........cc
""", {'h': '#2a3038', 'c': '#2a3038', 'C': '#5fd3ce'}),
            cells([(0, 5), (1, 6), (2, 6)], '#2a3038'),
            cells([(3, 6)], '#5fd3ce'),
            tpl(12, 4, """
.kkkk.
.kTtk.
.ktTk.
.kkkk.
bbbbbb
""", {'k': '#39404f', 't': '#5fd3ce', 'T': '#3aa8a3', 'b': '#838da4'}),
        ])

variant('gardener', 'Садовник',
        skin=body('#6cc070', '#92d896', '#4f9e55'),
        items=[
            tpl(-2, -3, """
....hwhwhwhw....
....whwhwhwh....
....rrrrrrrr....
HHHHHHHHHHHHHHHH
""", {'h': '#e8c46a', 'w': '#d8b25a', 'r': '#d94a4a', 'H': '#c9a14a'}),
            tpl(-6, 4, """
s.....
.s..l.
a.smmm
...mlm
a..mmm
""", {'m': '#8a94a6', 'l': '#a9b3c4', 's': '#8a94a6', 'a': '#79c0ff'}),
        ])

# --- эпохи -------------------------------------------------------------------

variant('king', 'Король',
        items=[
            tpl(1, -4, """
y...yy...y
yy..yy..yy
yyyyRRyyyy
yByyyyyyBy
""", {'y': '#f2c230', 'R': '#e0483e', 'B': '#3d7bd9'}),
            tpl(0, 7, "eeekeeeekeee", {'e': '#f1f1ec', 'k': '#24252c'}),
            tpl(12, 1, """
.y.
yRy
.y.
.h.
.h.
.h.
.h.
.h.
""", {'y': '#f2c230', 'R': '#e0483e', 'h': '#c99a12'}),
        ])

variant('knight', 'Рыцарь',
        items=[
            tpl(-1, -6, """
.......pp.....
......pp......
.....pP.......
....ssSSss....
..sssSSsssss..
.ssssssssssss.
.ssssssssssss.
......nn......
......nn......
""", {'s': '#b9c1cc', 'S': '#dde3ea', 'n': '#8a93a3', 'p': '#d63a32', 'P': '#ef6a5c'}, outline='#5d6675'),
            tpl(-6, 3, """
ooooo
owRwo
oRRRo
owRwo
.owo.
..o..
""", {'o': '#5d6675', 'w': '#e4e7ec', 'R': '#d63a32'}),
        ])

variant('viking', 'Викинг',
        items=[
            tpl(0, -3, """
...ssssss...
.ssssssssss.
ssssssssssss
.rrrrrrrrrr.
""", {'s': '#9aa3b0', 'r': '#6f7786'}),
            *pair(-4, -5, """
h...
h...
hh..
.hhh
..hh
""", {'h': '#efe6cf'}, outline='#a89c7c'),
            tpl(2, 6, """
oooooooo
oOooooOo
.oooooo.
..oOOo..
..o..o..
""", {'o': '#e07b2e', 'O': '#b85a1a'}),
        ])

variant('pharaoh', 'Фараон',
        skin=body('#3fb6b0', '#6fd0c9', '#2a8f8a'),
        paint=rows_paint({7: '#e9b949', 8: '#2d4fa3'}),
        items=[
            tpl(-2, -4, """
.......uu.......
....bbbbbbbb....
...yyyyyyyyyy...
..bbbbbbbbbbbb..
.yyyyyyyyyyyyyy.
bb............bb
yy............yy
bb............bb
yy............yy
bbb..........bbb
yyy..........yyy
""", {'b': '#2d4fa3', 'y': '#e9b949', 'u': '#f2c230'}),
        ])

variant('cowboy', 'Ковбой',
        skin=body('#e8b86d', '#f5d08f', '#c4914a'),
        items=[
            tpl(-3, -4, """
......cc..cc......
.....cccccccc.....
.....cccccccc.....
C....kkkkkkkk....C
.CCCCCCCCCCCCCCCC.
""", {'c': '#8a5a34', 'C': '#6b432c', 'k': '#3b2a20'}),
            tpl(2, 7, """
rrwrrwrr
.rrrrrr.
...rr...
""", {'r': '#d63a32', 'w': '#f1f1ec'}),
            tpl(12, 4, """
.rrr.
r...r
r...r
.rrr.
r....
""", {'r': '#c9a06a'}),
        ])


def pelt(x, y, ch, skin):
    if y in (7, 8):
        return '#6b432c' if (x, y) in {(2, 7), (5, 8), (8, 7), (10, 8), (1, 8)} else '#e9a23b'
    return None


variant('caveman', 'Пещерный',
        paint=pelt,
        items=[
            tpl(2, -3, """
bb....bb
.bbbbbb.
BB....BB
""", {'b': '#e8dfc8', 'B': '#c9bea0'}),
            tpl(12, 1, """
.ccc
ccCc
cccc
.cc.
.c..
.c..
c...
""", {'c': '#9a6b3a', 'C': '#6e4a26'}),
        ])

variant('gentleman', 'Джентльмен',
        skin=body('#9fb2c9', '#c0cfe0', '#7d92ab'),
        items=[
            tpl(0, -6, """
..kKkkkkkk..
..kKkkkkkk..
..kKkkkkkk..
..kKkkkkkk..
..rrrrrrrr..
kkkkkkkkkkkk
""", {'k': '#24252c', 'K': '#4a4f5e', 'r': '#7a2a3a'}),
            tpl(7, 2, """
.gg.
g..g
g..g
g..g
.gg.
""", {'g': '#e9b949'}),
            cells([(10, 7), (11, 8)], '#c99a12'),
            tpl(4, 6, "mmmm", {'m': '#3b2a20'}),
            tpl(3, 7, """
rr..rr
rrRRrr
rr..rr
""", {'r': '#b8283a', 'R': '#7a1a26'}),
        ])

variant('disco', 'Диско',
        skin=body('#ff5fa2', '#ff8ec0', '#d93b82'),
        items=[
            tpl(-2, -5, """
....aaaAaaaa....
..aaAaaaaaaAaa..
.aaaaaaAaaaaaaa.
aaAaaaaaaaaaaAaa
aaaaaAaaaAaaaaaa
aaa..........aaa
.aa..........aa.
""", {'a': '#3b2a20', 'A': '#5a4030'}),
            tpl(1, 3, """
kLkkkkkLkk
.kkk..kkk.
.kkk..kkk.
""", {'k': '#14161c', 'L': '#5a6070'}),
            tpl(13, -6, """
.s.
.s.
dld
ldl
dld
""", {'s': '#5d6675', 'd': '#9aa3b0', 'l': '#e4e9ef'}),
            cells([(16, -3), (12, -2)], '#ffd84a'),
        ])

# --- стихии ------------------------------------------------------------------


def wave(x, y, ch, skin):
    if y == 6 and x % 4 in (0, 1):
        return '#8fe1f5'
    if y == 7 and x % 4 in (2, 3):
        return '#8fe1f5'
    return None


variant('water', 'Вода',
        skin=body('#45c4e6', '#8fe1f5', '#2a8fc0'),
        paint=wave,
        items=[
            tpl(2, -4, """
.b....b.
..b..b..
b..bb..b
.bbbbbb.
""", {'b': '#45c4e6'}),
            tpl(-5, 2, """
.d.
dld
ddd
.d.
""", {'d': '#2a8fc0', 'l': '#8fe1f5'}),
            tpl(14, 5, """
.d.
dld
ddd
.d.
""", {'d': '#2a8fc0', 'l': '#8fe1f5'}),
            cells([(-2, -2), (14, -1), (15, 1)], '#8fd3f0'),
        ])

variant('ice', 'Лёд',
        skin=body('#bfe6f5', '#d6f0fb', '#8cc7e3', w='#f4fbff', p='#2a5a7a'),
        items=[
            tpl(1, -4, """
....cC....
.c..cC..c.
.cC.cC.cC.
cccccccccc
""", {'c': '#7fc8ea', 'C': '#4aa3cf'}),
            cells([(2, 11), (2, 12), (4, 11), (8, 11), (8, 12), (11, 11)], '#7fc8ea'),
            tpl(13, -3, """
c.c.c
.ccc.
ccccc
.ccc.
c.c.c
""", {'c': '#7fc8ea'}),
        ])

variant('storm', 'Молния',
        skin=body('#7b5cff', '#a08cff', '#5a3fd6'),
        items=[
            tpl(-6, -1, """
...yY
..yY.
.yY..
yyyyY
..yY.
.yY..
.Y...
""", {'y': '#ffd23f', 'Y': '#e0a31a'}),
            tpl(13, 3, """
...yY
..yY.
.yY..
yyyyY
..yY.
.yY..
.Y...
""", {'y': '#ffd23f', 'Y': '#e0a31a'}),
            cells([(3, -2), (8, -3), (5, -4), (-1, 8), (13, 0)], '#ffd23f'),
        ])

variant('stone', 'Камень',
        skin=body('#9a9590', '#bdb8b1', '#77726c'),
        paint=cells_paint({(3, 1): '#5e5a55', (4, 2): '#5e5a55', (4, 1): '#5e5a55',
                           (9, 6): '#5e5a55', (10, 7): '#5e5a55', (6, 7): '#5e5a55', (7, 8): '#5e5a55',
                           (0, 4): '#5e5a55'}),
        items=[
            tpl(1, -2, """
...g....g.
..gg.g.gg.
mmmMmmmmMm
""", {'g': '#6fae4a', 'm': '#6fae4a', 'M': '#4f8a34'}),
            cells([(0, 1), (0, 2), (11, 1)], '#4f8a34'),
            cells([(4, -3)], '#ff86c0'),
            cells([(-3, 10), (-2, 10), (-2, 9), (13, 10), (14, 10)], '#8a857f'),
        ])

# --- персонажи и роботы ------------------------------------------------------

variant('rockstar', 'Рок-звезда',
        skin=body('#4e4166', '#6b5c87', '#362b4a'),
        items=[
            tpl(4, -6, """
..m.
.mMm
mMm.
.mMm
mMm.
.mm.
""", {'m': '#ff3df2', 'M': '#c42bbd'}),
            tpl(13, -2, """
..kk.
..kk.
..n..
..n..
..n..
r.n.r
rrnrr
.rwr.
rrwrr
rrrrr
.rrr.
""", {'r': '#d63a32', 'w': '#f1f1ec', 'n': '#6b432c', 'k': '#24252c'}),
        ])

variant('space', 'Космос',
        skin=body('#2b2f6b', '#3f458f', '#1e2150'),
        paint=cells_paint({(1, 1): '#ffe9a8', (6, 1): '#ffe9a8', (10, 2): '#ffe9a8',
                           (5, 5): '#ffe9a8', (2, 7): '#ffe9a8', (9, 8): '#ffe9a8', (4, 10): '#ffe9a8'}),
        items=[
            tpl(-5, -3, """
.mmm
mm..
mm..
.mmm
""", {'m': '#ffe9a8'}),
            tpl(12, -5, """
..oo..
.oooo.
rrrrrr
.oooo.
..oo..
""", {'o': '#ffb454', 'r': '#b48cff'}),
            cells([(-3, 5), (15, 4), (16, 9), (-2, 10), (2, -5)], '#ffe9a8'),
        ])


def half_metal(x, y, ch, skin):
    if x >= 6:
        return {'h': '#cdd3dc', 'g': '#a3acb9', 'd': '#6f7786', 'w': '#1f2633', 'p': '#ff4a3d'}[ch]
    return None


variant('cyborg', 'Киборг',
        paint=half_metal,
        items=[
            cells([(7, 1), (10, 1), (7, 7), (10, 6)], '#6f7786'),
            tpl(12, 3, "n\nN\nn", {'n': '#6f7786', 'N': '#cdd3dc'}),
            cells([(9, -1), (9, -2)], '#4c5462'),
            cells([(9, -3)], '#ff4a3d'),
            cells([(10, 4)], '#ff9a8f'),
        ])

variant('windup', 'Заводная игрушка',
        skin=body('#d64a3a', '#ef7a66', '#a8301f'),
        paint=cells_paint({**{(x, 2): '#e9b949' for x in range(12)},
                           **{(x, 7): '#e9b949' for x in range(12)},
                           (1, 2): '#b88a1e', (10, 2): '#b88a1e', (1, 7): '#b88a1e', (10, 7): '#b88a1e'}),
        items=[
            tpl(12, 2, """
..kkk
..k.k
kkkkk
..k.k
..kkk
""", {'k': '#e9b949'}, outline='#b88a1e'),
        ])

variant('tetris', 'Тетрис',
        skin=body('#ffb454', '#ffcb85', '#e0912e'),
        items=[
            minos([(3, -6), (5, -6), (7, -6), (5, -4)], '#b48cff'),
            minos([(-4, 1), (-4, 3), (-4, 5), (-4, 7)], '#00c5cd'),
            minos([(14, 7), (16, 7), (12, 9), (14, 9)], '#3ddc97'),
        ])

# --- костюмы зверей ----------------------------------------------------------

variant('cat', 'Кот',
        skin=body('#f2a04a', '#ffc078', '#d27a2a'),
        paint=cells_paint({(3, 1): '#c26a1e', (5, 1): '#c26a1e', (6, 1): '#c26a1e', (8, 1): '#c26a1e',
                           (5, 2): '#c26a1e', (6, 2): '#c26a1e', (0, 3): '#c26a1e', (0, 6): '#c26a1e',
                           (11, 3): '#c26a1e', (11, 6): '#c26a1e', (5, 6): '#ff7f9a', (6, 6): '#ff7f9a'}),
        items=[
            tpl(0, -3, """
.o........o.
.oo......oo.
.opo....opo.
""", {'o': '#f2a04a', 'p': '#ff9fb0'}),
            cells([(-3, 5), (-2, 5), (-1, 5), (-3, 7), (-2, 7), (-1, 7)], '#5a4a3a'),
            cells(mirror_points([(-3, 5), (-2, 5), (-1, 5), (-3, 7), (-2, 7), (-1, 7)]), '#5a4a3a'),
        ])

variant('frog', 'Царевна-лягушка',
        skin=body('#5cbf4f', '#86d877', '#3f9a36'),
        items=[
            tpl(3, -3, """
y.yy.y
yyRRyy
""", {'y': '#f2c230', 'R': '#e0483e'}),
            tpl(-4, 5, """
.g................
gghhhhhhhhhhhhhhrr
.g............rr..
""", {'g': '#9aa3b0', 'h': '#a06a3a', 'r': '#e0483e'}),
        ])

PANDA_LEFT = [(1, 4), (1, 5), (1, 6), (2, 6), (5, 6)]   # пятно вокруг глаза и нос
variant('panda', 'Панда',
        skin=body('#d3d7de', '#e2e5ea', '#2a2b35', w='#2a2b35', p='#f2f3f5'),
        paint=cells_paint({p: '#2a2b35' for p in PANDA_LEFT + mirror_points(PANDA_LEFT)}),
        items=[
            tpl(0, -2, """
.kk......kk.
kkk......kkk
""", {'k': '#2a2b35'}),
            tpl(13, 0, """
.gl
.g.
.n.
.gl
.g.
.n.
lg.
.g.
.n.
.g.
""", {'g': '#6fbf4a', 'n': '#4a8f30', 'l': '#4cc06a'}),
        ])

TIGER = {(3, 1): 'k', (8, 1): 'k', (5, 1): 'k', (6, 1): 'k', (5, 2): 'k', (6, 2): 'k',
         (0, 2): 'k', (1, 2): 'k', (11, 2): 'k', (10, 2): 'k', (0, 5): 'k', (11, 5): 'k',
         (2, 8): 'k', (9, 8): 'k',
         (4, 6): 'w', (7, 6): 'w', (4, 7): 'w', (5, 7): 'w', (6, 7): 'w', (7, 7): 'w',
         (5, 6): 'n', (6, 6): 'n'}
variant('tiger', 'Тигр',
        skin=body('#f28c28', '#ffb04f', '#c96a14'),
        paint=cells_paint({p: {'k': '#2a2630', 'w': '#fff1dc', 'n': '#ff7f9a'}[c] for p, c in TIGER.items()},
                          under=rows_paint({9: '#2a2630'})),
        items=[
            tpl(0, -2, """
.oo......oo.
owwo....owwo
""", {'o': '#f28c28', 'w': '#fff1dc'}),
        ])

variant('unicorn', 'Единорог',
        skin=body('#f5b8d8', '#fbd3e8', '#e08cbd'),
        items=[
            tpl(5, -5, """
.y
.Y
yY
Yy
yY
""", {'y': '#f2c230', 'Y': '#ffe58a'}),
            tpl(-3, -2, """
....12
..1234
.12345
12345.
2345..
345...
456...
56....
6.....
""", {'1': '#ff6b6b', '2': '#ffb454', '3': '#ffe04a', '4': '#3ddc97', '5': '#79c0ff', '6': '#b48cff'}),
            cells([(14, -2), (15, 3), (13, 8), (-5, 9)], '#f2c230'),
        ])

LADY = [(5, 0), (6, 0), (5, 1), (6, 1), (5, 2), (6, 2),
        (1, 1), (2, 1), (1, 2), (2, 2), (3, 6), (4, 6), (3, 7), (4, 7)]
variant('ladybug', 'Божья коровка',
        skin=body('#e33b33', '#ff6a5c', '#2a2630'),
        paint=cells_paint({p: '#2a2630' for p in LADY + mirror_points(LADY)}),
        items=[
            tpl(1, -4, """
K........K
.k......k.
..k....k..
...k..k...
""", {'k': '#2a2630', 'K': '#2a2630'}),
        ])

variant('bunny', 'Кролик',
        skin=body('#b8bec9', '#d3d8e0', '#959ca9'),
        paint=cells_paint({(5, 6): '#ff7f9a', (6, 6): '#ff7f9a', (5, 7): '#f6f6f2', (6, 7): '#f6f6f2'}),
        items=[
            tpl(1, -6, """
.o......o.
ooo....ooo
opo....opo
opo....opo
opo....opo
ooo....ooo
""", {'o': '#b8bec9', 'p': '#ff9fb0'}),
            tpl(12, 3, """
...gg
..gg.
.oo..
oo...
o....
""", {'o': '#ff8a1f', 'g': '#4cc06a'}),
        ])

variant('dragon', 'Дракон',
        skin=body('#4fb36a', '#7ad18e', '#36894f'),
        paint=cells_paint({(x, y): '#f2d36b' for x in range(3, 9) for y in (7, 8)}),
        items=[
            tpl(0, -3, """
.....ss.....
..s..ss..s..
.sss.SS.sss.
""", {'s': '#ff9a3c', 'S': '#e07020'}),
            *pair(-5, 1, """
w....
ww..w
wwwww
.wWWw
..w.w
""", {'w': '#2f7a45', 'W': '#7ad18e'}),
        ])

# --- праздники и герои -------------------------------------------------------

variant('santa', 'Дед Мороз',
        skin=body('#d63a32', '#ef6a5c', '#a8261f'),
        items=[
            tpl(-1, -5, """
....rrrr......
...rrrrrrr....
..rrrrrrrrrr..
..rrrrrrrrr...
.rrrrrrrrrrrr.
""", {'r': '#e8463e'}),
            tpl(-1, -3, """
............ww
............ww
..............
wwwwwwwwwwwwww
""", {'w': '#f1f1ec'}, outline='#a8a8a0'),
            tpl(0, 6, """
...wwwwww...
.wwwwwwwwww.
..wwwwwwww..
...wwwwww...
....wwww....
""", {'w': '#f1f1ec'}, outline='#a8a8a0'),
            tpl(13, 7, """
gRgg
RRRR
gRgg
gRgg
""", {'g': '#2f8f4a', 'R': '#e0483e'}),
        ])

variant('snowman', 'Снеговик',
        skin=body('#d5e1ee', '#e8f0f8', '#b4c4d6', w='#3b4250', p='#14161c'),
        paint=cells_paint({(5, 6): '#ff8a1f', (6, 6): '#ff8a1f', (7, 6): '#ffb066'}),
        items=[
            tpl(2, -4, """
..bbbb..
.bbbbbb.
.bBbbbb.
BBBBBBBB
""", {'b': '#8a94a6', 'B': '#6f7786'}),
            tpl(0, 7, "rrggrrggrrgg", {'r': '#d63a32', 'g': '#2f8f4a'}),
            tpl(0, 8, "gr\nrg\ngr", {'r': '#d63a32', 'g': '#2f8f4a'}),
            cells([(-1, 4), (-2, 4), (-3, 3), (-4, 3), (-3, 2)], '#6b432c'),
            cells(mirror_points([(-1, 4), (-2, 4), (-3, 3), (-4, 3), (-3, 2)]), '#6b432c'),
        ])


def ninja(x, y, ch, skin):
    if 3 <= y <= 5 and 1 <= x <= 10 and ch == 'g':
        return OTTO['g']
    return None


variant('ninja', 'Ниндзя',
        skin=body('#2a2b35', '#3e4050', '#1c1d25'),
        paint=ninja,
        items=[
            tpl(0, 1, "rrrrrrrrrrrr", {'r': '#d63a32'}),
            cells([(-1, 1), (-2, 0), (-3, 0), (-4, -1), (-2, 2), (-3, 2), (-4, 3)], '#d63a32'),
            tpl(13, 4, """
s.s
.k.
s.s
""", {'s': '#8a93a3', 'k': '#3b4250'}),
        ])

variant('superhero', 'Супергерой',
        items=[
            *pair(-3, 1, """
..c
..c
.cc
.cc
.cc
ccc
ccc
ccc
ccC
cC.
""", {'c': '#d63a32', 'C': '#a8261f'}),
            tpl(0, 2, """
.kkkk..kkkk.
kk..kkkk..kk
kk..kkkk..kk
.k..k..k..k.
""", {'k': '#1f2f5a'}),
            tpl(4, 7, """
.yy.
yrry
.yy.
""", {'y': '#ffd84a', 'r': '#d63a32'}),
        ])

variant('angel', 'Ангел',
        skin=body('#9cc8f5', '#c0ddf9', '#76a8e0'),
        items=[
            tpl(2, -4, """
..yyyy..
yy....yy
..yyyy..
""", {'y': '#f2c230'}),
            *pair(-5, 0, """
...ww
.wwww
wwwww
wwwss
.wss.
..s..
""", {'w': '#f4f4f0', 's': '#d9dde3'}, outline='#9aa3b0'),
        ])


# --- сборка -----------------------------------------------------------------

def render(v):
    """Холст: body — тело (как в pet.js, перекрашено), items — предметы поверх."""
    body = [[None] * W for _ in range(H)]
    for y, row in enumerate(BODY):
        for x, ch in enumerate(row):
            if ch == '.':
                continue
            color = v['paint'](x, y, ch, v['skin']) if v['paint'] else None
            body[OY + y][OX + x] = color or v['skin'][ch]
    items = [[None] * W for _ in range(H)]

    def free(cx, cy):
        return body[cy][cx] is None and items[cy][cx] is None

    for it in v['items']:
        mine = []
        if 'cells' in it:
            for x, y, c in it['cells']:
                mine.append((OX + x, OY + y, c))
        else:
            for dy, row in enumerate(it['rows']):
                for dx, ch in enumerate(row):
                    if ch != '.':
                        mine.append((OX + it['x'] + dx, OY + it['y'] + dy, it['pal'][ch]))
        for cx, cy, c in mine:
            if not (0 <= cx < W and 0 <= cy < H):
                raise ValueError(f"{v['slug']}: предмет вышел за холст ({cx}, {cy})")
            items[cy][cx] = c
        if it.get('outline'):
            ring = set()
            for cx, cy, _ in mine:
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < W and 0 <= ny < H and free(nx, ny):
                        ring.add((nx, ny))
            for nx, ny in ring:
                items[ny][nx] = it['outline']
    return body, items


def compose(body, items):
    return [[items[y][x] or body[y][x] or BG for x in range(W)] for y in range(H)]


def to_image(grid, scale):
    img = Image.new('RGB', (W, H))
    img.putdata([tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)) for row in grid for c in row])
    return img.resize((W * scale, H * scale), Image.NEAREST)


# Цифры 3×5 для подписей листа — пиксельные, без сглаживания шрифта.
DIGITS = {
    '0': ['111', '101', '101', '101', '111'], '1': ['010', '110', '010', '010', '111'],
    '2': ['111', '001', '111', '100', '111'], '3': ['111', '001', '011', '001', '111'],
    '4': ['101', '101', '111', '001', '001'], '5': ['111', '100', '111', '001', '111'],
    '6': ['111', '100', '111', '101', '111'], '7': ['111', '001', '010', '010', '010'],
    '8': ['111', '101', '111', '101', '111'], '9': ['111', '101', '111', '001', '111'],
}


def draw_number(img, n, x0, y0, px, color=(120, 128, 144)):
    s = str(n)
    for i, ch in enumerate(s):
        for gy, line in enumerate(DIGITS[ch]):
            for gx, bit in enumerate(line):
                if bit == '1':
                    for yy in range(px):
                        for xx in range(px):
                            img.putpixel((x0 + (i * 4 + gx) * px + xx, y0 + gy * px + yy), color)


def sheet(grids, numbers, cols, scale, path):
    gap = 2 * scale
    label = 7 * 2   # высота подписи: цифра 5 точек ×2 + поля
    tw, th = W * scale, H * scale
    rows = (len(grids) + cols - 1) // cols
    img = Image.new('RGB', (cols * tw + (cols + 1) * gap, rows * (th + label) + (rows + 1) * gap), (255, 255, 255))
    for i, (g, n) in enumerate(zip(grids, numbers)):
        r, c = divmod(i, cols)
        x0, y0 = gap + c * (tw + gap), gap + r * (th + label + gap)
        img.paste(to_image(g, scale), (x0, y0))
        draw_number(img, n, x0 + 2, y0 + th + 2, 2)
    img.save(path, optimize=True)


def main():
    out = HERE / 'png'
    out.mkdir(exist_ok=True)
    for old in out.glob('*.png'):
        old.unlink()
    manifest = {'canvas': {'w': W, 'h': H, 'ox': OX, 'oy': OY, 'scale': SCALE, 'bg': BG},
                'source': 'assets/js/pet.js ART.idle[0] + SKIN.otto', 'variants': []}
    grids = []
    # 00 — исходник, для сравнения
    src = {'slug': 'otto', 'ru': 'Отто (исходник)', 'skin': OTTO, 'paint': None, 'items': []}
    b, i = render(src)
    to_image(compose(b, i), SCALE).save(HERE / '00_otto.png', optimize=True)
    for n, v in enumerate(VARIANTS, 1):
        body, items = render(v)
        grid = compose(body, items)
        name = f'{n:02d}_{v["slug"]}.png'
        to_image(grid, SCALE).save(out / name, optimize=True)
        grids.append(grid)
        manifest['variants'].append({
            'n': n, 'slug': v['slug'], 'ru': v['ru'], 'file': f'png/{name}',
            'body': [[x, y, body[y][x]] for y in range(H) for x in range(W) if body[y][x]],
            'items': [[x, y, items[y][x]] for y in range(H) for x in range(W) if items[y][x]],
        })
    cols = 10 if len(grids) > 8 else 4
    sheet(grids, range(1, len(grids) + 1), cols, SHEET_SCALE if cols == 10 else 8,
          HERE / ('sheet.png' if cols == 10 else 'batch1_sheet.png'))
    (HERE / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'вариаций: {len(VARIANTS)}; холст {W}×{H} клеток, тело в ({OX}, {OY}); '
          f'исходник: {BW}×{BH} из pet.js')


if __name__ == '__main__':
    sys.exit(main())
