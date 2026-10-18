/* Пиксельные клавиши клавиатуры для тетриса в автомате.
   Форма — по второму референсу владельца 15.10 («не такие квадратные, а как на клавиатуре»), снята по клеткам: колпачок
   33×33 клетки — чёрная обводка со ступенчатыми углами, скосы по четырём сторонам (верхний светлый, боковые средние,
   нижний тёмный) шириной 4, светлые диагонали в углах, светлая рамка вокруг верхней грани 21×21, знак 9×13 с тенью на
   клетку ниже; между клавишами 3 клетки. На нашем экране клавиша ~50 CSS-пикселей: клетка = k точек экрана
   (при 125 % — 2, как пиксель шрифта Press Start), число клеток подбирается под размер, скос — 4 или 3.
   PixKeys.draw(canvas, label, span, pressed); PixKeys.mount(root); PixKeys.snap(root).
   data-span — ширина клавиши в обычных клавишах (пробел — 3: три клавиши и два промежутка). */
(function () {
  'use strict';

  /* Цвета: «как на референсе» (сняты с картинки) и «в цветах окна» (серо-синие, как рамка «Картотеки»). Выбор —
     PixKeys.palette = 'ref' | 'win'; выбор владельца 15.10 — «в цветах окна» (по умолчанию). */
  var PAL = {
    ref: { out: '#05060a', top: '#8994c1', side: '#505fa0', bot: '#3c4c7f', line: '#a6afd0', face: '#6e7db8', ink: '#eff0f5', shade: '#5f72b6' },
    win: { out: '#05060a', top: '#7f8795', side: '#4f5663', bot: '#393e48', line: '#9aa2af', face: '#636a77', ink: '#eff1f4', shade: '#565c68' },
    // бирюза окна (--w3-acc) — главная клавиша экрана «Аркады» (ENTER, R): тёмный знак, светлый блик клеткой ниже
    acc: { out: '#05060a', top: '#7eeadb', side: '#1fa898', bot: '#137a6e', line: '#a4f2e7', face: '#2dd4bf', ink: '#062b27', shade: '#79e9da' }
  };

  /* Знаки — клетки рисунка, '#' — знак. Стрелки — как на референсе: наконечник 1-3-5-7-9, ножка 5 клеток. Буквы 7×11,
     штрих в 2 клетки — того же веса, что стрелки. */
  var UP = ['....#....', '...###...', '..#####..', '.#######.', '#########', '..#####..', '..#####..', '..#####..', '..#####..',
    '..#####..', '..#####..', '..#####..', '..#####..'];
  function flipV(b) { return b.slice().reverse(); }
  function turn(b) {   // ↑ → ←: поворот на четверть против часовой
    var h = b.length, w = b[0].length, out = [];
    for (var x = w - 1; x >= 0; x--) { var r = ''; for (var y = 0; y < h; y++) r += b[y][x]; out.push(r); }
    return out;
  }
  var LEFT = turn(UP);
  var G = {
    '↑': UP, '↓': flipV(UP), '←': LEFT, '→': LEFT.map(function (r) { return r.split('').reverse().join(''); }),
    S: ['.#####.', '#######', '##...##', '##.....', '######.', '.######', '.....##', '.....##', '##...##', '#######', '.#####.'],
    P: ['######.', '#######', '##...##', '##...##', '##...##', '#######', '######.', '##.....', '##.....', '##.....', '##.....'],
    A: ['.#####.', '#######', '##...##', '##...##', '##...##', '#######', '#######', '##...##', '##...##', '##...##', '##...##'],
    C: ['.#####.', '#######', '##...##', '##.....', '##.....', '##.....', '##.....', '##.....', '##...##', '#######', '.#####.'],
    E: ['#######', '#######', '##.....', '##.....', '######.', '######.', '##.....', '##.....', '##.....', '#######', '#######'],
    // для ENTER и R на экране «Аркады»: тот же вес; T в 6 клеток — ножка в 2 стоит ровно посередине
    N: ['##...##', '###..##', '###..##', '####.##', '####.##', '##.####', '##.####', '##..###', '##..###', '##...##', '##...##'],
    T: ['######', '######', '..##..', '..##..', '..##..', '..##..', '..##..', '..##..', '..##..', '..##..', '..##..'],
    R: ['######.', '#######', '##...##', '##...##', '##...##', '#######', '######.', '##.##..', '##..##.', '##...##', '##...##'],
    // английская страница офиса (18.10): «PLAY» и «AGAIN» — L, Y (6 клеток, ножка в 2 посередине, как у T), G, I
    L: ['##.....', '##.....', '##.....', '##.....', '##.....', '##.....', '##.....', '##.....', '##.....', '#######', '#######'],
    Y: ['##..##', '##..##', '##..##', '##..##', '.####.', '..##..', '..##..', '..##..', '..##..', '..##..', '..##..'],
    G: ['.#####.', '#######', '##...##', '##.....', '##.....', '##.####', '##.####', '##...##', '##...##', '#######', '.#####.'],
    I: ['######', '######', '..##..', '..##..', '..##..', '..##..', '..##..', '..##..', '..##..', '######', '######'],
    // кириллица для «ИГРАТЬ» (владелец 15.10: «клавиша, но вместо ENTER — играть»): И — N зеркально, Г в 6 клеток, Ь
    'И': ['##...##', '##..###', '##..###', '##.####', '##.####', '####.##', '####.##', '###..##', '###..##', '##...##', '##...##'],
    'Г': ['######', '######', '##....', '##....', '##....', '##....', '##....', '##....', '##....', '##....', '##....'],
    'Ь': ['##.....', '##.....', '##.....', '##.....', '######.', '#######', '##...##', '##...##', '##...##', '#######', '######.'],
    // для «ЕЩЁ РАЗ» (владелец 15.10): З; Щ — три ножки через клетку и хвост клеткой ниже строки; пробел — 3 пустые клетки
    'З': ['.#####.', '#######', '##...##', '.....##', '..####.', '..####.', '.....##', '.....##', '##...##', '#######', '.#####.'],
    'Щ': ['##.##.##.', '##.##.##.', '##.##.##.', '##.##.##.', '##.##.##.', '##.##.##.', '##.##.##.', '##.##.##.', '##.##.##.',
      '#########', '#########', '.......##'],
    ' ': ['...', '...', '...', '...', '...', '...', '...', '...', '...', '...', '...']
  };
  // кириллические буквы, совпадающие по форме с латинскими, — тем же рисунком
  [['Р', 'P'], ['А', 'A'], ['Т', 'T'], ['Е', 'E'], ['С', 'C']].forEach(function (p) { G[p[0]] = G[p[1]]; });
  G['Ё'] = ['.##.##.', '.......'].concat(G.E);   // точки — двумя строками выше прописной
  /* Строки над и под прописной (11 клеток): у Ё точки сверху, у Щ хвост снизу. Слово ставится по прописной — точки и хвост
     выходят за неё, а не сдвигают букву (иначе Ё и Щ съезжали бы со строки). */
  var EXTRA = { 'Ё': [2, 0], 'Щ': [0, 1] };

  var GAP = 3;   // промежуток между клавишами, клеток (как на референсе)

  /* Масштаб: клетка — k точек экрана (не меньше 2), клавиша — около 50 CSS-пикселей, нечётное число клеток (знак
     нечётной ширины встаёт ровно посередине). 125 %: k 2, 31 клетка; 100 %: k 2, 25; 200 %: k 3, 33 — как референс. */
  function metrics() {
    var dpr = window.devicePixelRatio || 1, k = Math.max(2, Math.round(1.6 * dpr));
    var n = Math.round((50 * dpr / k - 1) / 2) * 2 + 1;
    n = Math.max(25, Math.min(37, n));
    return { dpr: dpr, k: k, n: n, bev: n >= 29 ? 4 : 3 };
  }

  function draw(cv, label, span, pressed, pal) {
    var m = metrics(), k = m.k, N = m.n, B = m.bev, C = PAL[pal || PixKeys.palette] || PAL.ref;
    span = span || 1;
    var W = span * N + (span - 1) * GAP, H = N;
    cv.width = W * k; cv.height = H * k;
    cv.style.width = (W * k / m.dpr) + 'px'; cv.style.height = (H * k / m.dpr) + 'px';
    var g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height);
    function px(x, y, c) { g.fillStyle = c; g.fillRect(x * k, y * k, k, k); }
    // нажатая: свет скосов наоборот (верх тёмный, низ светлый) — клавиша вдавлена; грань темнее на тон
    var top = pressed ? C.bot : C.top, bot = pressed ? C.top : C.bot, face = pressed ? C.shade : C.face;
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var dx = Math.min(x, W - 1 - x), dy = Math.min(y, H - 1 - y), c;
      if (dx + dy < 2) continue;                               // срезанный угол — прозрачно
      if (dx + dy === 2 || dx === 0 || dy === 0) c = C.out;   // обводка со ступенькой в углу
      else if (dx <= B && dy <= B && dx === dy) c = C.line;   // диагональ скоса
      else if (dx <= B && dy <= B) c = dy < dx ? (y < H / 2 ? top : bot) : C.side;
      else if (dy <= B) c = y < H / 2 ? top : bot;
      else if (dx <= B) c = C.side;
      else if (dx === B + 1 || dy === B + 1) c = C.line;      // рамка верхней грани
      else c = face;
      px(x, y, c);
    }
    // знак: по центру грани, тень — клетка ниже; нажатая — знак ниже на клетку, без тени
    var lab = String(label).split(''), gw = 0, gh = 0;
    var ex = function (ch) { return EXTRA[ch] || [0, 0]; }, body = function (ch) { return G[ch].length - ex(ch)[0] - ex(ch)[1]; };
    lab.forEach(function (ch, i) { var b = G[ch]; if (b) { gw += b[0].length + (i ? 2 : 0); gh = Math.max(gh, body(ch)); } });
    var x0 = Math.floor((W - gw) / 2), y0 = Math.floor((H - gh) / 2) + (pressed ? 1 : 0);
    lab.forEach(function (ch) {
      var b = G[ch]; if (!b) return;
      var yy = y0 + Math.floor((gh - body(ch)) / 2) - ex(ch)[0];   // по прописной; точки Ё — выше, хвост Щ — ниже
      if (!pressed) b.forEach(function (row, j) { for (var i = 0; i < row.length; i++) if (row[i] === '#') px(x0 + i, yy + j + 1, C.shade); });
      b.forEach(function (row, j) { for (var i = 0; i < row.length; i++) if (row[i] === '#') px(x0 + i, yy + j, C.ink); });
      x0 += b[0].length + 2;
    });
  }

  function paint(b, pressed) {
    var cv = b.querySelector('canvas');
    if (cv) draw(cv, b.getAttribute('data-label'), +b.getAttribute('data-span') || 1, pressed, b.getAttribute('data-pal') || undefined);
  }

  function mount(root) {
    if (!root) return;
    var m = metrics();
    // клетка рисунка в CSS-пикселях: промежутки между клавишами — целым числом клеток (стили берут --pk)
    root.style.setProperty('--pk', (m.k / m.dpr) + 'px');
    Array.prototype.forEach.call(root.querySelectorAll('button.w3x-pkey[data-label]'), function (b) {
      if (!b.querySelector('canvas')) b.appendChild(document.createElement('canvas')).setAttribute('aria-hidden', 'true');
      paint(b, b.classList.contains('is-down'));
      if (b._pk) return; b._pk = true;
      var down = function () { b.classList.add('is-down'); paint(b, true); }, up = function () { b.classList.remove('is-down'); paint(b, false); };
      b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up);
      b.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') down(); });
      b.addEventListener('keyup', up); b.addEventListener('blur', up);
    });
    echo();
  }

  /* Клавиши на экране нажимаются и с настоящей клавиатуры — видно, какая клавиша что делает (data-code — коды клавиш). */
  var echoOn = false;
  function echo() {
    if (echoOn) return; echoOn = true;
    function hit(e, on) {
      if (e.repeat && on) return;
      Array.prototype.forEach.call(document.querySelectorAll('button.w3x-pkey[data-code]'), function (b) {
        if ((' ' + b.getAttribute('data-code') + ' ').indexOf(' ' + e.code + ' ') < 0 || !b.offsetParent) return;
        b.classList.toggle('is-down', on); paint(b, on);
      });
    }
    document.addEventListener('keydown', function (e) { hit(e, true); });
    document.addEventListener('keyup', function (e) { hit(e, false); });
  }

  /* Холст чёткий, только когда его левый верхний угол лежит на целой точке экрана: окно стоит по центру, и колонки
     выходят на дробные точки. Сдвиг на остаток — position: relative (раскладку не трогает, слоя не создаёт). */
  function snap(root) {
    if (!root) return;
    var dpr = window.devicePixelRatio || 1;
    var cvs = Array.prototype.slice.call(root.querySelectorAll('button.w3x-pkey canvas'));
    cvs.forEach(function (c) { c.style.left = ''; c.style.top = ''; });
    cvs.forEach(function (c) {
      var q = c.getBoundingClientRect();
      if (!q.width) return;
      c.style.left = ((Math.round(q.left * dpr) - q.left * dpr) / dpr).toFixed(3) + 'px';
      c.style.top = ((Math.round(q.top * dpr) - q.top * dpr) / dpr).toFixed(3) + 'px';
    });
  }

  var PixKeys = { draw: draw, mount: mount, snap: snap, glyphs: G, extra: EXTRA, gap: GAP, palettes: PAL, metrics: metrics, palette: 'win' };
  window.PixKeys = PixKeys;
})();
