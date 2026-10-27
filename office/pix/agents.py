# Спрайты агентов офиса. 2026-10-16: костюмы — выбор владельца из каталога всех 150
# (.proto/design/agents/costume_catalog.html; Ника — Калькулятор), в своих цветах, как в каталоге. Перекраски тела цветом
# агента нет (владелец 16.10: «а нахрена ты их перекрашиваешь? Я этого не просил»): правило 15.10 «тело цветом из демо»
# было для костюмов по ролям и к выбору из каталога не относится; цвет агента — только на бейдже.
# Кадры как у осьминогов сайта (assets/js/pet.js, ART): покой — два кадра дыхания, моргание, ходьба — четыре кадра.
#
# Источник — описания вариаций осьминогов (.proto/design/octopus/manifest.json, v2/, v3/): у каждой слой тела (120 точек
# силуэта Отто, раскрашенных костюмом) и слой предметов поверх. Для каждого агента:
#   1. кадры: тело ставится по кадру сайта (idle[0..1], blink[0], walk[0..3]): по строкам кадра — сдвиг вверх/вниз
#      (дыхание, подскок шага) и переставленные щупальца (новые точки — цветом щупалец этого костюма); предметы едут вместе
#      с телом. Моргают только те, у кого глаза свои (белок #e7eaf2, зрачок #12141c) и не закрыты предметом;
#   2. все кадры одной рамки (общая обрезка), «ноги» — середина и низ тела кадра покоя.
# Отто и Оливия — как на сайте.
# Выход: pix/agents.js — window.PIX_AGENTS = { id: { w, h, ax, ay, pal, idle: [кадр, кадр], walk: [4 кадра], blink: кадр|null } },
# кадр — строки из знаков палитры ("." — прозрачно); pix/agents_sheet.png — лист кадров ×6.
# py pix/agents.py
import json, os, re
from collections import Counter
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OFFICE = os.path.dirname(HERE)
# каталог костюмов — рядом с офисом (в рабочей папке ../octopus, в репозитории сайта office/octopus); pet.js — в корне
# сайта: ближайшая папка выше с assets/js/pet.js
OCT = os.path.join(OFFICE, 'octopus') if os.path.isdir(os.path.join(OFFICE, 'octopus')) else os.path.join(OFFICE, '..', 'octopus')
_d = OFFICE
while not os.path.isfile(os.path.join(_d, 'assets', 'js', 'pet.js')) and os.path.dirname(_d) != _d:
    _d = os.path.dirname(_d)
PET = os.path.join(_d, 'assets', 'js', 'pet.js')
MAN = {1: 'manifest.json', 2: os.path.join('v2', 'manifest.json'), 3: os.path.join('v3', 'manifest.json'),
       5: os.path.join('v5', 'manifest.json')}   # набор 5 — костюмы для Отто и Оливии (16.10, ночь)

# id, имя, костюм (набор, номер) | 'otto' | 'olivia'. Выбор владельца 16.10 (каталог).
AGENTS = [
    ('disp', 'Оливия', (5, 25)),    # Лунная моль (владелец 16.10, ночь: «Оливия — лунная моль нравится»; набор 5)
    ('dev', 'Отто', (3, 27)),       # Йети (владелец 16.10, ночь: «давай Отто сделаем йети из самого первого набора» — каталог)
    ('gas', 'Лео', (2, 2)),         # Робот-монитор
    ('des', 'Мира', (3, 15)),       # Ленивец
    ('seo', 'Тим', (3, 32)),        # Оборотень
    ('eng', 'Гоша', (2, 1)),        # Робот-ассистент
    ('x1', '?', (2, 6)),            # Рыцарь
    ('ldz', 'Ада', (2, 7)),         # Сова
    ('x2', '?', (2, 33)),           # Инопланетянин
    ('vid', 'Рон', (2, 45)),        # Обезьянка
    ('x3', '?', (1, 2)),            # Робот
    ('kyc', 'Ника', (2, 38)),       # Тыква-фонарь (владелец 16.10 — вместо Калькулятора; глаза дорисованы, см. PATCH)
    ('dog', 'Зоя', (3, 5)),         # Сипуха
    ('sud', 'Боб', (3, 17)),        # Цыплёнок (владелец 16.10 — вместо Призрака 2-08)
    ('x5', '?', (2, 3)),            # Золотой андроид
    ('fin', 'Карл', (3, 9)),        # Хомяк (владелец 17.10, вечер: «финансовый аналитик… костюм хомяка из первого каталога»)
    ('thk', 'Рене', (5, 5)),        # Капибара (владелец 21.10: Мыслитель — выбор из каталога, набор 5)
    ('cpy', 'Агата', (2, 32)),      # Летучая мышь (владелец 23.10: Копирайтер; циклоп 5-10 — «не нравится, сделай летучую мышь»)
    ('pm', 'Элиза', (2, 16)),       # Будильник (владелец 27.10: «продакту будильник»)
    ('b24', 'Конрад', (5, 8)),      # Горгулья (владелец 27.10: «разработчику битрикс горгулью»)
]
EYE_W, EYE_P = (231, 234, 242), (18, 20, 28)   # свои глаза Отто: белок и зрачок


def hexrgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def pet_frames():
    """Кадры тела из assets/js/pet.js: idle, blink, walk — списки кадров по 13 строк по 12 знаков."""
    src = open(PET, encoding='utf-8').read()
    art = src[src.index('var ART = {'):]
    out = {}
    for name in ('idle', 'blink', 'walk'):
        m = re.search(r'\n    %s: \[(.*?)\]\],' % name, art, re.S)
        rows = re.findall(r"'([.a-z]{12})'", m.group(1))
        assert len(rows) % 13 == 0, (name, len(rows))
        out[name] = [rows[i:i + 13] for i in range(0, len(rows), 13)]
    assert len(out['idle']) == 2 and len(out['blink']) == 1 and len(out['walk']) == 4
    return out


def manifest(s):
    m = json.load(open(os.path.join(OCT, MAN[s]), encoding='utf-8'))
    return m['canvas'], {v['n']: v for v in m['variants']}


def layers(key):
    """(канва (w, h), начало тела (ox, oy), тело {(c, r): rgb}, предметы [(x, y, rgb)]) — c, r от начала тела."""
    if key in ('otto', 'olivia'):
        cv, vs = manifest(1)
        im = Image.open(os.path.join(OCT, '00_otto.png')).convert('RGB')
        im = im.resize((im.width // 16, im.height // 16), Image.NEAREST)
        swap = {hexrgb('#6e9bff'): hexrgb('#ff86c0'), hexrgb('#8cb4ff'): hexrgb('#ffaad6'), hexrgb('#4d78d6'): hexrgb('#d9639f')} if key == 'olivia' else {}
        body = {(x - cv['ox'], y - cv['oy']): swap.get(im.getpixel((x, y)), im.getpixel((x, y))) for x, y, _ in vs[1]['body']}
        return (cv['w'], cv['h']), (cv['ox'], cv['oy']), body, []
    s, n = key
    cv, vs = manifest(s)
    v = vs[n]
    body = {(x - cv['ox'], y - cv['oy']): hexrgb(c) for x, y, c in v['body']}
    items = [(x, y, hexrgb(c)) for x, y, c in v['items']]
    return (cv['w'], cv['h']), (cv['ox'], cv['oy']), body, items


def frame(F, I0, body, items, size, org, tent):
    """Картинка кадра F (13×12) по кадру покоя I0: тело по строкам кадра, предметы — со сдвигом тела."""
    first = lambda fr: next(i for i, r in enumerate(fr) if r.strip('.'))
    dy = first(F) - first(I0)
    W, Hh = size
    im = Image.new('RGBA', (W, Hh + 2), (0, 0, 0, 0))   # запас по точке сверху и снизу: подскок и дыхание
    ox, oy = org[0], org[1] + 1
    put = lambda x, y, c: im.putpixel((x, y), c + (255,)) if 0 <= x < W and 0 <= y < Hh + 2 else None
    r0 = first(I0)
    for (c, r), col in body.items():   # точки тела, оставшиеся в кадре
        tr = r + r0 + dy
        if 0 <= tr < 13 and F[tr][c] != '.':
            put(ox + c, oy + r + dy, col)
    for tr in range(13):                # новые точки щупалец (в кадре есть, в покое на этом месте не было)
        for c in range(12):
            r = tr - r0 - dy
            if F[tr][c] != '.' and (c, r) not in body:
                put(ox + c, oy + r + dy, tent)
    for x, y, col in items:
        put(x, y + 1 + dy, col)
    return im


def blink(img, body, items, org):
    """Моргание: свои глаза (белок и зрачок Отто, не под предметом) → белок цветом тела рядом, зрачок — полоской."""
    itm = {(x, y) for x, y, _ in items}
    eyes = [(c, r) for (c, r), col in body.items() if col in (EYE_W, EYE_P)]
    if len(eyes) != 12 or any((org[0] + c, org[1] + r) in itm for c, r in eyes):
        return None
    out = img.copy()
    ox, oy = org[0], org[1] + 1
    for c, r in eyes:   # глаза — столбцы 2–3 и 8–9, строки 3–5 тела; средняя строка — зрачок полоской
        side = 1 if c < 6 else 10
        col = body.get((side, r), body.get((side, 3)))
        out.putpixel((ox + c, oy + r), (EYE_P if r == 4 else col) + (255,))
    return out


# основной цвет спины, если свой у костюма сливается с полом (был у калькулятора Ники: корпус #4a4f5a ≈ пол #494e5a)
BACK_MAIN = {}
# перекраска костюма целиком, цвет → цвет (27.10): у горгульи 5-08 камень #5a5f6e почти цвета пола — со спины пропадала
# совсем. Камень светлее на ступень, рога и брови — темнее пола (над полом иначе пропадают), глаза, рот и зубы — как были
RECOLOR = {'b24': {'#5a5f6e': '#7d8394', '#727888': '#959bab', '#454a57': '#666c7a', '#3a3f4b': '#2e323c'}}
# цвета лица, которые со спины остаются (рёбра тыквы идут вокруг всей тыквы)
BACK_KEEP = {'kyc': ['#d9741a']}
# дорисовка костюма поверх слоя тела, точки тела (столбец, строка) → цвет.
# Тыква-фонарь: 16.10 глаза-полоски 2×4 переделаны в треугольники с улыбкой — владелец: «тыква сильно выделяется,
# сделать просто глаза как у всех, в стиле тыквы». Теперь глаза как у всех — 2×3 со зрачком (светящиеся жёлтым, зрачок
# тёмный), рот — короткая тёмная прорезь, как у обезьянки.
# Сипуха Луизы: глаза тёмные, «зрачок» — почти того же тёмного цвета (владелец: «у Луизы зрачки не видно вовсе») —
# в тёмном глазу светлый блик.
_K, _Y, _E = '#5a2606', '#ffd23f', '#f28c28'
PATCH = {
    'kyc': {**{p: _E for p in [(2, 6), (3, 6), (8, 6), (9, 6), (4, 7), (5, 7), (6, 7), (7, 7)]},   # нижние концы полосок, рот
            **{(c, r): _Y for c in (2, 3, 8, 9) for r in (3, 4, 5)},                         # глаза 2×3
            (3, 4): _K, (9, 4): _K,                                                        # зрачки (к середине — SYM)
            (5, 7): _K, (6, 7): _K},                                                       # рот
    # глаза как у всех — 2×3 со зрачком: радужка тёмно-янтарная, зрачок чёрный (блик в тёмном глазу в цвет лицевого
    # диска читался выщербленным углом, а не бликом)
    'dog': {**{(c, r): '#b9772a' for c in (2, 3, 8, 9) for r in (3, 4, 5)}, (3, 4): '#1a0f08', (9, 4): '#1a0f08'},
}
# Зрачки к середине (16.10: «у цыплёнка зрачки кривые», «проверь всех»): у костюмов зрачок обоих глаз был в правом
# столбце глаза — левый смотрел к носу, правый к краю, взгляд кривой. Правый глаз отражается: точки (8, 4) и (9, 4)
# меняются местами. Отто теперь йети из каталога — тоже здесь; у Оливии (лунная моль) тёмные глаза с бликом — блик с одной стороны у обоих, не трогаем; мумия одноглазая.
SYM = {'gas', 'des', 'seo', 'eng', 'x1', 'ldz', 'x2', 'vid', 'x3', 'kyc', 'dog', 'sud', 'x5', 'dev', 'cpy', 'pm', 'b24'}   # dev — йети из каталога, cpy — летучая мышь (23.10), pm — будильник, b24 — горгулья (27.10)


def back(body, items, org, aid=None):
    """Вид со спины (владелец 16.10: «чтобы, когда шли наверх, не ходили спиной вперёд»): тот же силуэт, отражён
    (со спины лево и право меняются). Лицо — всё внутри тела в строках 1–7, чего нет на боках тела (столбцы 0 и 11
    строк 2–6): глаза, морда, экран, кнопки — закрашивается: полосой строки, если цвет края строки идёт и внутри
    (бинты мумии), иначе основным цветом костюма (самый частый в строках 2–6 из цветов боков). Кромка сверху, края,
    низ и щупальца — как спереди. Предметы на лице (внутри силуэта ниже верхней строки) — долой, над головой и сбоку
    (уши, шляпы, антенны) — остаются, отражённые."""
    side = {body[(c, r)] for r in range(2, 7) for c in (0, 11) if (c, r) in body} | {hexrgb(h) for h in BACK_KEEP.get(aid, [])}
    cnt = Counter(col for (c, r), col in body.items() if 2 <= r <= 6 and col in side)
    main_col = cnt.most_common(1)[0][0]
    if aid in BACK_MAIN:   # свой основной цвет спины: им же — и бока, которые были этим цветом
        new = hexrgb(BACK_MAIN[aid])
        body = {p: (new if col == main_col else col) for p, col in body.items()}
        side = {new if c == main_col else c for c in side}
        main_col = new
    out = {}
    for (c, r), col in body.items():
        if 1 <= r <= 7 and 1 <= c <= 10 and col not in side:
            edge = body.get((0, r))
            inner = [body.get((x, r)) for x in range(1, 11)]
            col = edge if 2 <= r <= 6 and edge in inner else main_col
        out[(11 - c, r)] = col
    cols = {c for c, r in body}
    W2 = 2 * org[0] + 11                              # x на канве → отражённый x
    keep = [(W2 - x, y, col) for x, y, col in items
            if (y - org[1]) < 1 or (x - org[0]) not in cols or (x - org[0], y - org[1]) not in body]
    return out, keep


KEYS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'


def main():
    FR = pet_frames()
    I0 = FR['idle'][0]
    out, sheet = {}, []
    for aid, name, key in AGENTS:
        size, org, body, items = layers(key)
        assert len(body) == 120, (aid, len(body))
        rc = {hexrgb(a): hexrgb(b) for a, b in RECOLOR.get(aid, {}).items()}
        body, items = {p: rc.get(c, c) for p, c in body.items()}, [(x, y, rc.get(c, c)) for x, y, c in items]
        for p, col in PATCH.get(aid, {}).items():
            assert p in body, (aid, p)
            body[p] = hexrgb(col)
        if aid in SYM:
            body[(8, 4)], body[(9, 4)] = body[(9, 4)], body[(8, 4)]
        tent = Counter(col for (c, r), col in body.items() if r >= 9).most_common(1)[0][0]   # цвет щупалец костюма
        frames = {'idle': [frame(F, I0, body, items, size, org, tent) for F in FR['idle']],
                  'walk': [frame(F, I0, body, items, size, org, tent) for F in FR['walk']]}
        b = blink(frames['idle'][0], body, items, org)
        frames['blink'] = [b] if b else []
        bbody, bitems = back(body, items, org, aid)
        frames['back_idle'] = [frame(F, I0, bbody, bitems, size, org, tent) for F in FR['idle']]
        frames['back_walk'] = [frame(F, I0, bbody, bitems, size, org, tent) for F in FR['walk']]
        allf = frames['idle'] + frames['walk'] + frames['blink'] + frames['back_idle'] + frames['back_walk']
        boxes = [f.getbbox() for f in allf]
        bb = (min(q[0] for q in boxes), min(q[1] for q in boxes), max(q[2] for q in boxes), max(q[3] for q in boxes))
        pal, keys = {}, {}
        def enc(img):
            c = img.crop(bb); rows = []
            for y in range(c.height):
                r = ''
                for x in range(c.width):
                    p = c.getpixel((x, y))
                    if p[3] == 0:
                        r += '.'; continue
                    hx = '#%02x%02x%02x' % p[:3]
                    if hx not in keys:
                        keys[hx] = KEYS[len(keys)]
                    r += keys[hx]
                rows.append(r)
            return rows
        ax = org[0] + 6 - bb[0]                      # середина тела (12 точек)
        ay = org[1] + 1 + 11 - bb[1]                 # низ щупалец кадра покоя (тело — 11 строк)
        out[aid] = {'w': bb[2] - bb[0], 'h': bb[3] - bb[1], 'ax': ax, 'ay': ay,
                    'idle': [enc(f) for f in frames['idle']], 'walk': [enc(f) for f in frames['walk']],
                    'blink': enc(frames['blink'][0]) if frames['blink'] else None,
                    'back': {'idle': [enc(f) for f in frames['back_idle']], 'walk': [enc(f) for f in frames['back_walk']]}}
        out[aid]['pal'] = {v: k for k, v in keys.items()}
        sheet.append((name, aid, [f.crop(bb) for f in frames['idle'] + frames['walk'] + frames['blink']],
                      [f.crop(bb) for f in frames['back_idle'] + frames['back_walk']]))
        print('%-5s %-7s рамка %2dx%2d, ноги (%d, %d), моргает: %s, цветов %d' %
              (aid, name,out[aid]['w'], out[aid]['h'], ax, ay, 'да' if b else 'нет', len(keys)))
    with open(os.path.join(HERE, 'agents.js'), 'w', encoding='utf-8', newline='\n') as f:
        f.write('/* Спрайты агентов офиса — собраны pix/agents.py (костюм — выбор владельца, в своих цветах; кадры как у\n'
                '   осьминогов сайта: idle — дыхание, walk — шаг, blink — моргание или null). Кадр — строки из знаков палитры pal\n'
                '   ("." — прозрачно), все кадры одной рамки w×h; ax/ay — «ноги»: середина тела и низ щупалец в покое. */\n')
        f.write('window.PIX_AGENTS = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
    # лист: у каждого агента кадры подряд — покой, дыхание, ход ×4, моргание, затем спина: покой ×2, ход ×4; ×5
    S, cw = 5, 18 * 5 + 6
    rowh = 20 * S + 26
    img = Image.new('RGB', (cw * 14 + 150, rowh * len(sheet)), (73, 78, 90))   # цвет пола офиса
    d = ImageDraw.Draw(img)
    font = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 15)
    for i, (name, aid, fr, bk) in enumerate(sheet):
        y = i * rowh
        d.text((8, y + 8), name + ' · ' + aid, fill=(242, 244, 246), font=font)
        for j, f in enumerate(fr + [None] * (7 - len(fr)) + bk):
            if f is None:
                continue
            big = f.resize((f.width * S, f.height * S), Image.NEAREST)
            img.paste(big, (150 + j * cw, y + 20 * S - big.height + 10), big)
    d.text((150 + 7 * cw, 4), 'спина', fill=(242, 244, 246), font=font)
    img.save(os.path.join(HERE, 'agents_sheet.png'))


if __name__ == '__main__':
    main()
