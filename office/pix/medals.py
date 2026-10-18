"""Медали агентов (18.10) — перерисованы руками по образцу Gemini, который выбрал владелец («первый вариант, где
маленькая звёздочка»): короткая лента со светлой складкой, тёмный хомут, монета с гравированным кольцом, значок в
середине, у главной — искорка. Образец Gemini — 37 × 53 клетки; здесь вдвое крупнее пиксель (диск 21 точка), чтобы
медаль рядом с крупным портретом карточки была того же «веса», что предметы офиса. Цвета — с образца, обводка — офиса.

Пять медалей (владелец 18.10: «Да, давай Оливии», «Три»): val «Ценный агент», disk «Золотой диск» (папка от 1 ГБ),
m3 «Испытательный срок», m6 «Полгода», y1 «Год». Плюс slot — пустое место в виде силуэта медали.

    py pix/medals.py      → pix/medals.js (window.PIX_MEDALS), pix/medals_sheet.png (образец Gemini / мой, ×8)
"""
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
W, H = 23, 32               # медаль: лента 0…9, хомут 10, диск 11…31
CX, CY, R = 11, 21, 10.5    # диск: центр в целой точке, поперёк 21
GROOVE = 7.0                # гравированное кольцо

OUT = '#16161c'             # обводка (тон обводки предметов офиса, чуть в синеву — как у образца)
METAL = {   # L блик кромки, l светлый, B основа, D тень, K гравировка и цифры, Y звезда, W искорка
    'gold':   {'L': '#ffe46e', 'l': '#fdcf2e', 'B': '#f6b012', 'D': '#cf7712', 'K': '#8f560c', 'Y': '#ffe53b', 'W': '#fffbea'},
    'bronze': {'L': '#efc283', 'l': '#dfa45f', 'B': '#c08643', 'D': '#94592b', 'K': '#5b2c10'},
    'silver': {'L': '#f1f3fa', 'l': '#d5d8e0', 'B': '#b6b9c4', 'D': '#83879b', 'K': '#4f5369'},
}
RIBBON = {  # q светлая складка, r лента, p бок ленты, s полоса
    'teal':  {'q': '#72e4d0', 'r': '#2ac8b1', 'p': '#137a72', 's': '#e9edfa'},
    'navy':  {'q': '#5469b6', 'r': '#2b3f9a', 'p': '#1c2766'},
    'green': {'q': '#6fca58', 'r': '#3a9a3e', 'p': '#1f5a27'},
    'blue':  {'q': '#5c9ef4', 'r': '#2b6dcc', 'p': '#1b4590'},
    'red':   {'q': '#f25b52', 'r': '#c92b2b', 'p': '#861b1f'},
}
FLOPPY = {'N': '#34465c', 'S': '#cfd3e4', 's': '#6d7590', 'c': '#fbf4dc', 'u': '#efc232'}

# значки 7 × 7 и цифры (жирные, штрих 2) — рисунок по клеткам, # — знак
STAR = ['...#...',
        '..###..',
        '#######',
        '.#####.',
        '..###..',
        '.##.##.',
        '.#...#.']
DISK = ['NNNNNNN.',    # дискета 8 × 8: шторка со щелью справа, корпус, наклейка с двумя полосами, срезанный угол
        'NNSSSsSN',
        'NNSSSsSN',
        'NNNNNNNN',
        'NccccccN',
        'NuuuuuuN',
        'NccccccN',
        'NuuuuuuN']
LAUREL = ['.K.',      # веточка слева от «12» (справа — зеркально): листья ёлочкой, низ загибается к середине
          'K..',
          '.K.',
          'K..',
          '.K.',
          'K..',
          '.K.',
          '.KK',
          '..K']
DIGIT = {
    '1': ['.##', '###', '.##', '.##', '.##', '.##', '.##'],
    '2': ['.###.', '##.##', '...##', '..##.', '.##..', '##...', '#####'],
    '3': ['####.', '...##', '...##', '.###.', '...##', '...##', '####.'],
    '6': ['.###.', '##...', '##...', '####.', '##.##', '##.##', '.###.'],
}


class Sprite:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.a = [['.'] * w for _ in range(h)]

    def px(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.a[y][x] = c

    def get(self, x, y):
        return self.a[y][x] if 0 <= x < self.w and 0 <= y < self.h else '.'

    def rows(self):
        return [''.join(r) for r in self.a]


def in_disc(x, y, r=R):
    return (x - CX) ** 2 + (y - CY) ** 2 <= r * r


def ribbon(s, kind):
    """Лента 13 точек: обводка, тёмные бока, светлая складка сверху, низ сходится к хомуту."""
    for x in range(5, 18):
        s.px(x, 0, 'o')
    for y in range(1, 8):
        s.px(5, y, 'o'); s.px(17, y, 'o')
        for x in range(6, 17):
            s.px(x, y, 'p' if x in (6, 16) else 'q' if y <= 2 else 'r')
    # низ: бока ступенькой внутрь (как у образца), к хомуту темнее
    s.px(6, 8, 'o'); s.px(16, 8, 'o')
    for x in range(7, 16):
        s.px(x, 8, 'p' if x in (7, 15) else 'r')
    s.px(7, 9, 'o'); s.px(15, 9, 'o')
    for x in range(8, 15):
        s.px(x, 9, 'p')
    if kind == 'teal':   # белая полоса посередине — у главной медали
        for y in range(1, 10):
            for x in (10, 11, 12):
                if s.get(x, y) not in ('o', '.'):
                    s.px(x, y, 's')
    for x in range(7, 16):   # хомут
        s.px(x, 10, 'o')


def disc(s, ring=True):
    """Монета: обводка, блик кромки сверху-слева, тень кромки снизу-справа, кольцо — ровная тёмная линия (первая
    редакция с кольцом «тень/свет» вышла пунктиром — у образца линия цельная)."""
    for y in range(CY - 11, CY + 12):
        for x in range(CX - 11, CX + 12):
            if not in_disc(x, y):
                continue
            edge = any(not in_disc(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            if edge:
                s.px(x, y, 'o'); continue
            dx, dy = x - CX, y - CY
            r = math.hypot(dx, dy)
            a = (dx + dy) / (r * math.sqrt(2)) if r else 0   # −1 — к свету (сверху-слева), +1 — от света
            if R - r < 1.6:
                s.px(x, y, 'L' if a < -0.25 else 'D' if a > 0.5 else 'B')
            else:
                s.px(x, y, 'B')
    if ring:   # кольцо: точки, чей центр ближе всего к окружности GROOVE, — по одной на шаг, без двойных ступенек
        for y in range(CY - 8, CY + 9):
            for x in range(CX - 8, CX + 9):
                r = math.hypot(x - CX, y - CY)
                if abs(r - GROOVE) < 0.5:
                    s.px(x, y, 'D')


def stamp(s, pat, x0, y0, color=None, shadow=None, light=None, ring=None):
    """Рисунок по клеткам; shadow — тень на (+1, +1) снаружи знака, light — свет на краю знака сверху-слева,
    ring — обводка знака по четырём сторонам (звезда: светло-жёлтое на жёлтом без обводки сливалось)."""
    on = set()
    for j, row in enumerate(pat):
        for i, c in enumerate(row):
            if c != '.':
                on.add((x0 + i, y0 + j))
                s.px(x0 + i, y0 + j, color or c)
    if ring:
        for (x, y) in on:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                if (x + dx, y + dy) not in on:
                    s.px(x + dx, y + dy, ring)
    if shadow:
        for (x, y) in on:
            if (x + 1, y + 1) not in on and s.get(x + 1, y + 1) in ('B', 'l', 'L', 'D'):
                s.px(x + 1, y + 1, shadow)
    if light:
        for (x, y) in on:
            if (x - 1, y) not in on and (x, y - 1) not in on:
                s.px(x, y, light)


def laurels(s):
    """Лавровые веточки по бокам «12» (у образца — так же, вместо кольца): ёлочка листьев, низ загибается к середине.
    Первая редакция ставила листья по дуге под числом — читалось многоточием."""
    h = len(LAUREL)
    for j, row in enumerate(LAUREL):
        for i, c in enumerate(row):
            if c != '.':
                s.px(CX - 8 + i, CY - 4 + j, 'K')
                s.px(CX + 8 - i, CY - 4 + j, 'K')


# Искорка у кромки сверху справа — отдельным слоем: мерцает (большая → малая → точка → нет); при «уменьшить движение»
# стоит большая. Крест 5 × 5: середина и ближние — белые, кончики — светлые.
SPARK = {'x': 18, 'y': 13,
         'big': [[0, 0, 'W'], [1, 0, 'W'], [-1, 0, 'W'], [0, 1, 'W'], [0, -1, 'W'], [2, 0, 'L'], [-2, 0, 'L'], [0, 2, 'L'], [0, -2, 'L']],
         'small': [[0, 0, 'W'], [1, 0, 'L'], [-1, 0, 'L'], [0, 1, 'L'], [0, -1, 'L']],
         'dot': [[0, 0, 'W']]}


def sparkle(s):
    for (dx, dy, c) in SPARK['big']:
        s.px(SPARK['x'] + dx, SPARK['y'] + dy, c)


def medal(metal, rib, icon):
    s = Sprite(W, H)
    ribbon(s, rib)
    disc(s, ring=icon != '12')
    # значки — с тенью снизу-справа и без света по краю: в первой редакции свет и тень вместе размывали звезду и цифры
    if icon == 'star':
        stamp(s, STAR, CX - 3, CY - 3, color='Y', ring='D')   # искорка — слоем (SPARK), на листе — дорисовывается
    elif icon == 'disk':
        stamp(s, DISK, CX - 4, CY - 4, shadow='D')
    else:
        glyphs = [DIGIT[ch] for ch in icon]
        w = sum(len(g[0]) for g in glyphs) + len(glyphs) - 1
        x = CX - w // 2
        for g in glyphs:
            stamp(s, g, x, CY - 3, color='K')
            x += len(g[0]) + 1
        if icon == '12':
            laurels(s)
    pal = {'o': OUT}
    pal.update(METAL[metal])
    pal.update(RIBBON[rib])
    if icon == 'disk':
        pal.update(FLOPPY)
    used = set(''.join(s.rows())) - {'.'}
    if icon == 'star':
        used |= {'W', 'L'}
    out = {'w': W, 'h': H, 'rows': s.rows(), 'pal': {k: v for k, v in pal.items() if k in used},
           'disc': [CX, CY, R], 'metal': metal}
    if icon == 'star':
        out['spark'] = SPARK
    return out


def slot(m):
    """Пустое место под медаль — её силуэт (лента, хомут, диск), утопленный в фон окна: тёмная кромка по всему краю, хомут —
    тёмной чертой. Владелец 18.10: «формы под медали должны быть в виде медали» (были кружки); затем «не очень нравится
    белая обводка у пустых медалей» — светлая губа снизу-справа (#47505d) убрана, кромка одна, тёмная."""
    on = {(x, y) for y, row in enumerate(m['rows']) for x, c in enumerate(row) if c != '.'}
    s = Sprite(m['w'], m['h'])
    for (x, y) in on:
        edge = any((x + dx, y + dy) not in on for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        s.px(x, y, 'a' if edge or y == 10 else 'w')
    return {'w': m['w'], 'h': m['h'], 'rows': s.rows(), 'pal': {'w': '#0d0f12', 'a': '#050607'}}


MEDALS = {
    'val':  medal('gold', 'teal', 'star'),
    'disk': medal('gold', 'navy', 'disk'),
    'm3':   medal('bronze', 'green', '3'),
    'm6':   medal('silver', 'blue', '6'),
    'y1':   medal('gold', 'red', '12'),
}
MEDALS['slot'] = slot(MEDALS['m3'])   # силуэт у всех пяти один (лента 13, хомут, диск 21)

if __name__ == '__main__':
    js = ('/* Медали агентов — pix/medals.py (рисунок руками по образцу Gemini, 18.10). Не править руками. */\n'
          'window.PIX_MEDALS = ' + json.dumps(MEDALS, ensure_ascii=False, separators=(',', ':')) + ';\n')
    with open(os.path.join(HERE, 'medals.js'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(js)
    print('pix/medals.js —', len(js), 'байт')
    if '--sheet' in sys.argv:   # лист сравнения: образец Gemini (если есть рядом) и мой рисунок ×8
        from PIL import Image, ImageDraw
        gem = os.path.join(HERE, '..', '..', 'medals', 'in', 'gemini_1.jpg')
        S, pad = 8, 24
        order = ['val', 'disk', 'm3', 'm6', 'y1']
        cells = []
        g = Image.open(gem).convert('RGB') if os.path.exists(gem) else None
        boxes = [(10, 35), (55, 35), (100, 35), (145, 35), (191, 35)]   # клетки образца (traced_1.json), шаг 25/3
        for k, key in enumerate(order):
            m = MEDALS[key]
            im = Image.new('RGB', (m['w'] * S, m['h'] * S), (43, 48, 57))
            d = ImageDraw.Draw(im)
            rows = m['rows']
            if 'spark' in m:   # искорка — как стоит при «уменьшить движение»
                sp = Sprite(m['w'], m['h']); sp.a = [list(r) for r in rows]; sparkle(sp); rows = sp.rows()
            for j, row in enumerate(rows):
                for i, ch in enumerate(row):
                    if ch != '.':
                        d.rectangle([i * S, j * S, i * S + S - 1, j * S + S - 1], fill=m['pal'][ch])
            ref = None
            if g:
                x0, y0 = 7.2 + boxes[k][0] * 25 / 3, 2.9 + boxes[k][1] * 25 / 3
                ref = g.crop((int(x0), int(y0), int(x0 + 38 * 25 / 3), int(y0 + 53 * 25 / 3)))
                ref = ref.resize((round(ref.width * im.height / ref.height), im.height), Image.LANCZOS)
            cells.append((ref, im))
        Wt = sum((r.width if r else 0) + im.width + pad * 2 for r, im in cells) + pad
        sheet = Image.new('RGB', (Wt, cells[0][1].height + pad * 2), (24, 27, 32))
        x = pad
        for ref, im in cells:
            if ref:
                sheet.paste(ref, (x, pad)); x += ref.width + 8
            sheet.paste(im, (x, pad)); x += im.width + pad * 2
        sheet.save(os.path.join(HERE, 'medals_sheet.png'))
        print('pix/medals_sheet.png', sheet.size)
