# Демо офиса одним файлом — открывается двойным щелчком, без сервера (владелец 14.10: «прислать демо, что уже есть»).
# Только офис в утверждённом виде (?art=t16, пол П2, стены С3, толщина 8), экспериментальные переключатели спрятаны.
#   py pix/build_demo.py                     →  dist/office_demo.html (демо: шапка с переключателем экрана)
#   py pix/build_demo.py --prod <файл>       →  страница сайта (17.10: офис на /resume/): без шапки демо, свои title,
#                                               описание, адрес и картинка превью
# Работает и в рабочей папке (.proto/design/office, окна — рядом в ../windows), и в репозитории сайта (office/, окна —
# в office/windows): корень сайта — ближайшая папка выше с data/resume.js.
import base64
import io
import os
import re
import sys
import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
OFFICE = os.path.dirname(HERE)
SRC = os.path.join(OFFICE, 'greybox.html')
PROD = '--prod' in sys.argv
OUT = sys.argv[sys.argv.index('--prod') + 1] if PROD else os.path.join(OFFICE, 'dist', 'office_demo.html')


def up_to(rel):   # ближайшая папка выше офиса, где лежит rel
    d = OFFICE
    while not os.path.exists(os.path.join(d, rel)):
        p = os.path.dirname(d)
        if p == d:
            raise SystemExit('не найден корень сайта (' + rel + ')')
        d = p
    return d


SITE = up_to(os.path.join('data', 'resume.js'))
WIN = os.path.join(OFFICE, 'windows') if os.path.isdir(os.path.join(OFFICE, 'windows')) else os.path.join(OFFICE, '..', 'windows')

INLINE = {   # скрипты страницы: путь в <script src> → файл; остальные (старые режимы a, b, w, t8, t16c) выкидываются
    '../../../data/resume.js': os.path.join(SITE, 'data', 'resume.js'),
    'pix/pix.js': os.path.join(HERE, 'pix.js'),
    'pix/rooms.js': os.path.join(HERE, 'rooms.js'),
    'art/work/t16/art.js': os.path.join(OFFICE, 'art', 'work', 't16', 'art.js'),
    'pix/objects.js': os.path.join(HERE, 'objects.js'),
    'pix/agents.js': os.path.join(HERE, 'agents.js'),   # агенты: костюм по роли, тело цветом агента (pix/agents.py)
    'pix/medals.js': os.path.join(HERE, 'medals.js'),   # медали агентов (pix/medals.py, 18.10)
    'pix/field.js': os.path.join(HERE, 'field.js'),   # фон — поле знаков, как на сайте
    'pix/drift.js': os.path.join(HERE, 'drift.js'),
    'pix/office3d.js': os.path.join(HERE, 'office3d.js'),   # 2.5D-демо (16.10, ночь)   # фон — рисунки из знаков (16.10, варианты «Фон за офисом»)
    '../windows/variant_1.js': os.path.join(WIN, 'variant_1.js'),   # окна разделов — варианты Дизайнера 14.10
    '../windows/variant_2.js': os.path.join(WIN, 'variant_2.js'),
    '../windows/variant_3.js': os.path.join(WIN, 'variant_3.js'),
    '../windows/v3x.js': os.path.join(WIN, 'v3x.js'),
    '../windows/tetris/mock.js': os.path.join(WIN, 'tetris', 'mock.js'),   # макет тетриса: снимок партии
    '../windows/tetris/keys.js': os.path.join(WIN, 'tetris', 'keys.js'),   # пиксельные клавиши тетриса
    '../windows/phone.js': os.path.join(WIN, 'phone.js'),   # окно раздела на телефоне (варианты 15.10)
    '../../../data/records.js': os.path.join(SITE, 'data', 'records.js'),   # общая десятка рекордов   # «Картотека»: «Обо мне», «Навыки», шрифты
    '../../../assets/js/console.js': os.path.join(SITE, 'assets', 'js', 'console.js'),   # «Аркада» — настоящая игра сайта
}


def read(p):
    with io.open(p, encoding='utf-8') as f:
        return f.read()


html = read(SRC)


def script(m):
    src = m.group(1)
    if src not in INLINE:
        return ''
    js = read(INLINE[src]).replace('</script', '<' + '\\/script')   # закрывающий тег внутри кода оборвал бы скрипт
    return '<script>/* %s */\n%s\n</script>' % (src, js)


html, n = re.subn(r'<script src="([^"]+)"></script>', script, html)
assert n == 24, n   # подключений скриптов в странице (18.10: +1 — медали); вставляются из INLINE, прочие выкидываются

# стили окон: @import шрифтов сайта заменяется самими шрифтами (Golos Text, Unbounded — кириллица и латиница) данными в файле
RES = SITE
FONTS = ('golos-text-cyrillic.woff2', 'golos-text-latin.woff2', 'unbounded-cyrillic.woff2', 'unbounded-latin.woff2',
         'jetbrains-mono-latin.woff2', 'jetbrains-mono-cyrillic.woff2', 'jetbrains-mono-greek.woff2')   # знаки поля и портрета: латиница, №, λ


def fonts_css():
    # шрифты переменные: один файл на все насыщенности — вшиваем его один раз с диапазоном font-weight
    seen = {}
    for block in re.findall(r'@font-face\s*\{[^}]*\}', read(os.path.join(RES, 'assets', 'css', 'fonts.css'))):
        m = re.search(r'url\(\.\./fonts/([^)]+)\)', block)
        if not m or m.group(1) not in FONTS:
            continue
        w = int(re.search(r'font-weight:\s*(\d+)', block).group(1))
        if m.group(1) in seen:
            seen[m.group(1)][1].append(w)
        else:
            seen[m.group(1)] = (block, [w], m.group(0))
    out = []
    for name, (block, ws, url) in seen.items():
        with open(os.path.join(RES, 'assets', 'fonts', name), 'rb') as f:
            data = base64.b64encode(f.read()).decode('ascii')
        block = re.sub(r'font-weight:\s*\d+', 'font-weight: %d %d' % (min(ws), max(ws)), block)
        out.append(block.replace(url, 'url(data:font/woff2;base64,' + data + ')'))
    assert len(out) == 7, len(out)
    return '\n'.join(out)


first = [True]


def style(m):
    css = read(os.path.join(WIN, m.group(1)))
    css, k = re.subn(r'@import url\("\.\./\.\./\.\./assets/css/fonts\.css"\);', '', css)
    assert k <= 1, (m.group(1), k)
    head = fonts_css() + '\n' if first[0] else ''
    first[0] = False
    return '<style>/* ../windows/%s */\n%s%s\n</style>' % (m.group(1), head, css)


html, k = re.subn(r'<link rel="stylesheet" href="\.\./windows/(variant_\d\.css|v3x\.css)">', style, html)
assert k == 4, k


def pixel_fonts(m):   # пиксельные шрифты акцентов — данными в файле (демо открывают без сервера)
    css = read(os.path.join(WIN, 'fonts', 'fonts.css'))
    def data(u):
        with open(os.path.join(WIN, 'fonts', u.group(1)), 'rb') as f:
            return 'url(data:font/ttf;base64,' + base64.b64encode(f.read()).decode('ascii') + ')'
    css, t5 = re.subn(r"@font-face \{ font-family: 'Tiny5';[^}]*\}\s*", '', css)   # 15.10: выбран Press Start 2P — Tiny5 (433 КБ) в демо не нужен
    assert t5 == 1, t5
    css, j = re.subn(r'url\(([A-Za-z0-9]+\.ttf)\)', data, css)
    assert j == 1, j
    return '<style>/* ../windows/fonts/fonts.css */\n%s\n</style>' % css


html, k = re.subn(r'<link rel="stylesheet" href="\.\./windows/fonts/fonts\.css">', pixel_fonts, html)
assert k == 1, k


def rep(a, b):
    global html
    assert html.count(a) == 1, a[:60]
    html = html.replace(a, b)


with open(os.path.join(SITE, 'assets', 'img', 'portrait.webp'), 'rb') as f:
    PHOTO = base64.b64encode(f.read()).decode('ascii')
# портрет — данными в самих данных резюме, как в однофайловой версии сайта: страница не ссылается ни на что рядом с собой
# (17.10: офис — главная сайта, путь assets/img/… в корне не существует); окно «Обо мне» берёт его оттуда же — копия одна
rep("    photo: 'assets/img/portrait.webp',", "    photo: 'data:image/webp;base64," + PHOTO + "',")
rep('<script>/* ../windows/v3x.js */', "<script>window.W3X_PHOTO = window.RESUME.person.photo;</script>\n<script>/* ../windows/v3x.js */")
rep("var ARTV = new URLSearchParams(location.search).get('art');",
    "var ARTV = new URLSearchParams(location.search).get('art') || 't16';   // демо одним файлом: сразу нарисованный офис")
if PROD:
    # страница сайта: заголовок, описание и превью — как у резюме; адрес — корень сайта; иконка вкладки — Отто, как у старой
    old = read(os.path.join(SITE, 'index.html'))
    def tag(rx):
        m = re.search(rx, old)
        assert m, rx
        return m.group(0)
    desc = re.search(r'<meta name="description" content="([^"]+)"', old).group(1)
    ogdesc = re.search(r'<meta property="og:description" content="([^"]+)"', old).group(1)
    URL = 'https://akonyaev-ru.github.io/resume/'
    head = '\n'.join([
        '<title>Резюме Алексея Коняева</title>',
        '<meta name="description" content="%s">' % desc,
        '<meta name="author" content="Алексей Коняев">',
        '<link rel="canonical" href="%s">' % URL,
        '<meta property="og:type" content="website">',
        '<meta property="og:locale" content="ru_RU">',
        '<meta property="og:site_name" content="Резюме Алексея Коняева">',
        '<meta property="og:title" content="Резюме Алексея Коняева">',
        '<meta property="og:description" content="%s">' % ogdesc,
        '<meta property="og:url" content="%s">' % URL,
        '<meta property="og:image" content="%sog.jpg">' % URL,
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        '<meta property="og:image:alt" content="Пиксельный офис Алексея Коняева: разделы резюме — предметы офиса">',
        '<meta name="twitter:card" content="summary_large_image">',
        tag(r'<link rel="icon" [^>]*>'),
    ])
    rep('<title>Пиксельный офис — серый макет</title>', head)
else:
    rep('<title>Пиксельный офис — серый макет</title>', '<title>Пиксельный офис — демо</title>')
day = datetime.date.today().strftime('%d.%m')
title = re.compile(r"  else if \(TRACE\) document\.querySelector\('\.bar__title'\)\.innerHTML = .*?смотрим офис\.';", re.S)
assert len(title.findall(html)) == 1
html = title.sub(lambda m: """  else if (TRACE) document.querySelector('.bar__title').innerHTML = '<b>Пиксельный офис — демо на %s.</b> ' +
    'Офис нарисован руками по картинке Gemini: 27 предметов, пол «сланец», обои — кирпич в цветах переговорной. Нажмите на предмет с «!» — ' +
    'откроется раздел резюме. Агенты тоже нажимаются.';""" % day, html)
# метка собранного демо (body.demo-build) — для правил, которые нужны только ему
html = html.replace('<body class="', '<body class="demo-build ' + ('site-build ' if PROD else ''), 1)
assert 'class="demo-build ' in html
rep('</style>\n<!-- окна разделов', """  /* демо одним файлом: только утверждённый вид — переключатели вариантов спрятаны */
  /* сильнее правила страницы «body.pix .pix-only { display: flex !important }» */
  body .grp--links, body.pix .grp[data-group="names"], body.pix .grp[data-group="tone"], body.pix .grp[data-group="outline"],
  body.pix .grp[data-group="floor"], body.pix .grp[data-group="walls"], body.pix .grp[data-group="wt"],
  body.pix .grp[data-group="zoom"], body.pix .grp[data-group="mk"], body.pix .grp[data-group="board"], body .grp[data-group="wv"],
  body .grp[data-group="w3-about"], body .grp[data-group="w3-skills"], body .grp[data-group="w3-font"],
  body .grp[data-group="field"], body .grp[data-group="w3-tetris"], body .grp[data-group="pk"], body .grp[data-group="pw"] { display: none !important; }   /* тетрис — «Аркада», клавиши «в цветах окна» — выбор владельца 15.10 */   /* 15.10: «Обо мне» А, «Навыки» В, Press Start 2P   /* решено 14.10: ×1,125, кружок, почти белые */
""" + ("""  /* страница сайта (17.10): шапки демо нет — офис во всё окно; телефонный вид настоящий телефон включает сам */
  body.site-build #bar { display: none !important; }
  body.site-build { grid-template-rows: 1fr !important; }
""" if PROD else '') + """</style>
<!-- окна разделов""")

os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
with io.open(OUT, 'w', encoding='utf-8', newline='\n') as f:
    f.write(html)
print('%s — %d КБ' % (OUT, os.path.getsize(OUT) // 1024))
