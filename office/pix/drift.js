/* Фон страницы офиса — «рисунки из знаков». Владелец 16.10, по своей картинке: «фон вне офиса обычный, но появлялись
   хаотичные рисунки с плавным движением». Фон пустой; время от времени в нём проявляется рисунок из знаков, медленно
   плывёт, меняет очертания и растворяется. Под офисом знаков нет — рисунок уходит за него. Яркость знака — от
   плотности рисунка; есть строки ярче, как на картинке владельца.
   Варианты — VARIANTS: cloud — облако из шума (форма своя у каждого), agent — силуэт агента офиса (pix/agents.js):
   тёмное в спрайте (глаза, обводка) — пустые места, по ним читается лицо. Сетка: «дымка» и «агенты» — знаки вплотную,
   как на картинке (7×14), «знаки сайта» — сетка поля сайта (15×19).
   Выбрано владельцем (16.10, позже): «знаки сайта» — облака плывут медленно направо; нажатие на знаки пускает волну.
   «Уменьшить движение» — два рисунка неподвижно, волны нет. Скрытая вкладка — не рисуем.
   window.OfficeDrift.start(canvas, вариант, { hole: () => {x, y, w, h} — место офиса в точках холста,
   skip: (событие) => true — нажатие и наведение не для фона (окно открыто, кнопка) }), .set(вариант), .info() — для проверок. */
(function () {
  'use strict';

  var FONT_FAMILY = '"JetBrains Mono", ui-monospace, monospace';
  var HEX = '0123456789abcdef';
  var ALNUM = HEX + HEX + 'ghjkmnpqrstuvwxyz';   // как на картинке владельца: строчные и цифры, шестнадцатеричных чаще
  var SITE = '{}[]()<>/\\|;:=+-*#$%&!?^~01234567§№¶λ';   // знаки поля сайта
  var STEP_MS = 50;   // 20 кадров в секунду: яркость знаков меняется плавно
  var MAX = 3, SPAWN_MS = [5000, 9000], LIFE_MS = [22000, 32000], IN_MS = 5000, OUT_MS = 7000;
  var TH = 0.2;   // порог проявления: ниже — знака нет
  // доля знаков рисунка, сменяющихся за секунду: строки «живые», но не мельтешат (8 за кадр при сотне знаков «знаков
  // сайта» меняли весь рисунок за секунду)
  var FLICKER = 0.15;
  // нажатие на знаки (16.10: «анимацию при нажатии на эти символы»): от точки нажатия по рисунку бежит волна — знаки в
  // кольце вспыхивают цветом hi и перебираются; в середине короткая вспышка. RIP_S — жизнь волны, RIP_V — скорость
  // кольца (точек/с), RIP_BAND — его толщина, RIP_HIT — сколько ячеек вокруг точки нажатия ищется знак
  var RIP_S = 1.4, RIP_V = 230, RIP_BAND = 24, RIP_FLASH = 0.3, RIP_HIT = 1, RIP_MAX = 4;

  /* cw×ch — ячейка, font — кегль; base — цвет знака, hi — цвет ярких строк; a0 — прозрачность края, a1 — добавка к
     середине, ah — ярким строкам */
  var VARIANTS = {
    mist: { name: 'А дымка', glyphs: ALNUM, cw: 7, ch: 14, font: 11, base: '#9aa1ad', hi: '#d9dde4', a0: 0.06, a1: 0.2, ah: 0.22, kind: 'cloud' },
    // выбор владельца 16.10: «знаки сайта, но чтобы они как облака перемещались медленно направо» — vx (точек/с), life (мс)
    code: { name: 'Б знаки сайта', glyphs: SITE, cw: 15, ch: 19, font: 12, base: '#9aa1ad', hi: '#2dd4bf', a0: 0.07, a1: 0.22, ah: 0.3, kind: 'cloud',
      vx: [5, 9], vy: 1.2, life: [34000, 48000], morph: 0.45,
      // «объектов на фоне можно сделать чуть больше» (16.10): до 4 облаков на ноутбуке, до 5 на большом экране (было 2 и 3),
      // появляются чаще, бывают мельче — помещаются в поля у офиса
      max: [4, 5], spawn: [2500, 5000], size: [0.55, 1] },
    agents: { name: 'В агенты из знаков', glyphs: ALNUM, cw: 7, ch: 14, font: 11, base: '#9aa1ad', hi: '#2dd4bf', a0: 0.08, a1: 0.26, ah: 0.22, kind: 'agent' }
  };

  /* 3D-шум симплекс (Стефан Густавсон, общественное достояние): плавные пятна без сетки; третья ось — время */
  var GRAD = [1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1];
  var PERM = new Uint8Array(512), PM12 = new Uint8Array(512);
  (function () {
    var p = [], s = 20261016, i, j, t;
    for (i = 0; i < 256; i++) p[i] = i;
    for (i = 255; i > 0; i--) { s = (s * 16807) % 2147483647; j = s % (i + 1); t = p[i]; p[i] = p[j]; p[j] = t; }
    for (i = 0; i < 512; i++) { PERM[i] = p[i & 255]; PM12[i] = (PERM[i] % 12) * 3; }
  })();
  var F3 = 1 / 3, G3 = 1 / 6;
  function corner(g, x, y, z) {
    var t = 0.6 - x * x - y * y - z * z;
    if (t <= 0) return 0;
    t *= t;
    return t * t * (GRAD[g] * x + GRAD[g + 1] * y + GRAD[g + 2] * z);
  }
  function noise3(x, y, z) {
    var s = (x + y + z) * F3, i = Math.floor(x + s), j = Math.floor(y + s), k = Math.floor(z + s);
    var t = (i + j + k) * G3, x0 = x - i + t, y0 = y - j + t, z0 = z - k + t, i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
      else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
    } else if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
    else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
    else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    var ii = i & 255, jj = j & 255, kk = k & 255;
    return 32 * (corner(PM12[ii + PERM[jj + PERM[kk]]], x0, y0, z0) +
      corner(PM12[ii + i1 + PERM[jj + j1 + PERM[kk + k1]]], x0 - i1 + G3, y0 - j1 + G3, z0 - k1 + G3) +
      corner(PM12[ii + i2 + PERM[jj + j2 + PERM[kk + k2]]], x0 - i2 + 2 * G3, y0 - j2 + 2 * G3, z0 - k2 + 2 * G3) +
      corner(PM12[ii + 1 + PERM[jj + 1 + PERM[kk + 1]]], x0 - 1 + 3 * G3, y0 - 1 + 3 * G3, z0 - 1 + 3 * G3));
  }
  function smooth(a, b, x) { var t = (x - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function lum(hex) {
    var n = parseInt(hex.slice(1), 16);
    return (0.2126 * (n >> 16 & 255) + 0.7152 * (n >> 8 & 255) + 0.0722 * (n & 255)) / 255;
  }

  var LESS = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas = null, ctx = null, V = null, opts = {}, W = 0, H = 0, dpr = 1, cols = 0, rows = 0, CW = 15, CH = 19;
  var chars = null, val = null, hiv = null, rip = null, touched = [], figs = [], ripples = [], atlas = null, glyphs = '';
  var timer = 0, nextSpawn = 0, clock = 0, bound = false, painted = 0, outH = 0, over = false;

  function makeAtlas() {   // каждый знак дважды — цветом base и hi — на одном холсте: drawImage дешевле fillText
    glyphs = V.glyphs;
    atlas = document.createElement('canvas');
    atlas.width = Math.ceil(glyphs.length * CW * dpr); atlas.height = Math.ceil(2 * CH * dpr);
    var a = atlas.getContext('2d');
    a.setTransform(dpr, 0, 0, dpr, 0, 0);
    a.font = V.font + 'px ' + FONT_FAMILY; a.textBaseline = 'middle'; a.textAlign = 'center';
    for (var row = 0; row < 2; row++) {
      a.fillStyle = row ? V.hi : V.base;
      for (var i = 0; i < glyphs.length; i++) a.fillText(glyphs.charAt(i), i * CW + CW / 2, row * CH + CH / 2);
    }
  }
  function build() {
    if (!canvas) return;
    var host = canvas.parentNode;
    W = host.clientWidth; H = host.clientHeight; dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!V) return;
    CW = V.cw; CH = V.ch;
    cols = Math.ceil(W / CW); rows = Math.ceil(H / CH);
    chars = new Uint8Array(cols * rows); val = new Float32Array(cols * rows); hiv = new Float32Array(cols * rows); rip = new Float32Array(cols * rows);
    touched = []; ripples = [];
    for (var i = 0; i < chars.length; i++) chars[i] = Math.floor(Math.random() * V.glyphs.length);
    makeAtlas();
  }
  function hole() {
    var h = opts.hole && opts.hole();
    return h && h.w > 0 ? h : { x: 0, y: 0, w: 0, h: 0 };
  }
  function overlap(a, b) {
    var w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    return w > 0 && h > 0 ? w * h : 0;
  }

  /* Новый рисунок: место — где он хотя бы на две трети виден (не под офисом, не на другом рисунке, не за краем). */
  function spawn(now, life) {
    var L = V.life || LIFE_MS, f = { born: now, life: life || rnd(L[0], L[1]), s: rnd(0, 100),
      vx: V.vx ? rnd(V.vx[0], V.vx[1]) : rnd(3, 8) * (Math.random() < 0.5 ? -1 : 1), vy: V.vx ? rnd(-V.vy, V.vy) : rnd(-4, 4) }, o = hole();
    if (V.kind === 'agent') {
      var A = window.PIX_AGENTS || {}, ids = Object.keys(A).filter(function (k) { return A[k] && A[k].idle; });
      if (!ids.length) return null;
      var sp = A[ids[Math.floor(Math.random() * ids.length)]];
      f.sp = sp;
      f.P = (W - o.w) / 2 >= 380 ? CH * 2 : CH;   // точка спрайта — 2×1 ячейки или 4×2: края ровные, без «лесенки» выборки
      f.w = sp.w * f.P; f.h = sp.h * f.P; f.L = {};
      Object.keys(sp.pal || {}).forEach(function (c) { f.L[c] = lum(sp.pal[c]); });
      f.vy = rnd(-3, 1);
    } else {
      var r = Math.max(110, Math.min(230, Math.min(W, H) * 0.22));
      var sz = V.size || [0.8, 1.05], q = rnd(sz[0], sz[1]);
      f.rx = q * r; f.ry = q * rnd(1.15, 1.3) * r; f.w = f.rx * 2; f.h = f.ry * 2;
    }
    var all = { x: 0, y: 0, w: W, h: H };
    for (var k = 0; k < 24; k++) {
      // плывёт направо — рождается левее: за жизнь пройдёт vx · life, и большую её часть проведёт на виду
      var lead = V.vx ? Math.min(W * 0.35, f.vx * f.life / 1000 * 0.6) : 0;
      f.x = rnd(-f.w * 0.15, W - f.w * 0.85 - lead); f.y = rnd(-f.h * 0.1, H - f.h * 0.9);
      var box = { x: f.x, y: f.y, w: f.w, h: f.h }, bad = overlap(box, o) + f.w * f.h - overlap(box, all);
      for (var j = 0; j < figs.length; j++) {   // соседи — там, где они сейчас (они плывут), а не где родились
        var g = figs[j], ga = Math.max(0, now - g.born) / 1000;
        bad += overlap(box, { x: g.x + g.vx * ga, y: g.y + g.vy * ga, w: g.w, h: g.h });
      }
      if (bad < f.w * f.h / 3) return f;
    }
    return null;
  }
  function envelope(f, now) {
    var t = now - f.born;
    if (t < 0) return 0;
    return Math.min(smooth(0, IN_MS, t), smooth(0, OUT_MS, f.life - t));
  }

  /* Значение рисунка в точке: > TH — знак виден; outH — доля яркой строки. */
  function sampleCloud(f, e, ts, px, py) {
    var dx = (px - f.x - f.rx) / f.rx, dy = (py - f.y - f.ry) / f.ry, d2 = dx * dx + dy * dy;
    if (d2 > 1.9) return 0;
    var z = ts * 0.06 * (V.morph || 1) + f.s;   // morph — скорость перетекания формы (у «знаков сайта» медленнее: облако плывёт, а не кипит)
    var wx = noise3(dx * 1.2 + f.s, dy * 1.2, z), wy = noise3(dx * 1.2, dy * 1.2 + f.s, z + 9);   // искажение: края рваные
    var n = noise3(dx * 1.7 + wx * 0.8, dy * 1.7 + wy * 0.8, z) * 0.7 + noise3(dx * 3.6 + wx, dy * 3.6 + wy, z * 1.6) * 0.3;
    var v = (1 - Math.sqrt(d2)) * 1.1 + n * 0.8 - (1 - e) * 1.4;
    if (v <= TH) return 0;
    // яркие строки — в координатах рисунка: едут вместе с ним (в координатах экрана стояли и казалось, что рисунок не плывёт)
    outH = smooth(0.3, 0.75, noise3((px - f.x) * 0.0045 + f.s, (py - f.y) * 0.055, ts * 0.11)) * smooth(0.35, 0.8, v);
    return v;
  }
  function sampleAgent(f, e, ts, px, py) {
    var sx = Math.floor((px - f.x) / f.P), sy = Math.floor((py - f.y) / f.P);
    if (sx < 0 || sy < 0 || sx >= f.sp.w || sy >= f.sp.h) return 0;
    var frames = f.sp.idle, fr = frames[Math.floor(ts / 0.7 + f.s) % frames.length], c = fr[sy].charAt(sx);
    if (c === '.') return 0;
    var L = f.L[c] == null ? 0.5 : f.L[c];
    if (L < 0.2) return 0;   // глаза, зрачки, тёмная обводка — пусто: по пустым местам читается лицо
    var n = noise3(px * 0.011 + f.s, py * 0.011, ts * 0.12 + f.s);
    var v = 0.95 + n * 0.45 - (1 - e) * 1.5;
    if (v <= TH) return 0;
    outH = L > 0.72 ? 0.7 : smooth(0.3, 0.75, noise3((px - f.x) * 0.0045 + f.s, (py - f.y) * 0.055, ts * 0.11)) * 0.5;
    return Math.min(v, 0.3 + 0.8 * L);   // светлое в спрайте — ярче
  }
  function put(k, v, h) {
    if (v <= TH || v <= val[k]) return;
    if (!val[k]) touched.push(k);
    val[k] = v; hiv[k] = h;
  }

  function tick(now) {
    if (!V || !ctx || document.hidden) return;
    if (!LESS) clock = now;
    if (!LESS && now >= nextSpawn) {
      var big = W * H > 1.2e6, lim = V.max ? V.max[big ? 1 : 0] : big ? MAX : 2, sp = V.spawn || SPAWN_MS;
      if (figs.length < lim) { var nf = spawn(clock); if (nf) figs.push(nf); }
      nextSpawn = now + rnd(sp[0], sp[1]);
    }
    figs = figs.filter(function (g) { return clock - g.born < g.life; });
    for (var i = 0; i < touched.length; i++) { val[touched[i]] = 0; hiv[touched[i]] = 0; rip[touched[i]] = 0; }
    touched = [];
    var ts = clock / 1000, o = hole(), pair = CW < 10;   // плотная сетка: шум раз на две ячейки — строка всё равно плавная
    for (var q = 0; q < figs.length; q++) {
      var g = figs[q], e = LESS ? 1 : envelope(g, clock), age = LESS ? 0 : (clock - g.born) / 1000;
      if (e <= 0) continue;
      var f = { x: g.x + g.vx * age, y: g.y + g.vy * age, rx: g.rx, ry: g.ry, s: g.s, P: g.P, sp: g.sp, L: g.L };
      var c0 = Math.max(0, Math.floor(f.x / CW)), c1 = Math.min(cols - 1, Math.ceil((f.x + g.w) / CW));
      var r0 = Math.max(0, Math.floor(f.y / CH)), r1 = Math.min(rows - 1, Math.ceil((f.y + g.h) / CH));
      for (var row = r0; row <= r1; row++) {
        var py = row * CH + CH / 2, inY = py > o.y && py < o.y + o.h;
        for (var col = c0; col <= c1; col += (g.sp || !pair) ? 1 : 2) {
          var px = col * CW + CW / 2, k = row * cols + col;
          if (g.sp) {
            if (inY && px > o.x && px < o.x + o.w) continue;   // под офисом знаков нет
            put(k, sampleAgent(f, e, ts, px, py), outH);
            continue;
          }
          var v = sampleCloud(f, e, ts, pair ? px + CW / 2 : px, py);
          if (!v) continue;
          if (!(inY && px > o.x && px < o.x + o.w)) put(k, v, outH);
          if (pair && col + 1 <= c1 && !(inY && px + CW > o.x && px + CW < o.x + o.w)) put(k + 1, v, outH);
        }
      }
    }
    ripples = ripples.filter(function (rp) { return (now - rp.t) / 1000 < RIP_S; });
    for (var w = 0; w < ripples.length; w++) {   // волна от нажатия — только по знакам рисунка
      var rp = ripples[w], age = (now - rp.t) / 1000, R = RIP_V * age, amp = 1 - age / RIP_S, ext = R + RIP_BAND;
      var rc0 = Math.max(0, Math.floor((rp.x - ext) / CW)), rc1 = Math.min(cols - 1, Math.ceil((rp.x + ext) / CW));
      var rr0 = Math.max(0, Math.floor((rp.y - ext) / CH)), rr1 = Math.min(rows - 1, Math.ceil((rp.y + ext) / CH));
      for (var yy = rr0; yy <= rr1; yy++) for (var xx = rc0; xx <= rc1; xx++) {
        var kq = yy * cols + xx;
        if (!val[kq]) continue;
        var d = Math.hypot(xx * CW + CW / 2 - rp.x, yy * CH + CH / 2 - rp.y), qv = (1 - Math.abs(d - R) / RIP_BAND) * amp;
        if (age < RIP_FLASH && d < RIP_BAND) qv = Math.max(qv, 1 - age / RIP_FLASH);   // вспышка в точке нажатия
        if (qv <= rip[kq]) continue;
        rip[kq] = qv;
        if (qv > 0.5 && Math.random() < 0.3) chars[kq] = Math.floor(Math.random() * glyphs.length);   // знаки в кольце перебираются
      }
    }
    var nf = touched.length * FLICKER * STEP_MS / 1000;
    nf = Math.floor(nf) + (Math.random() < nf % 1 ? 1 : 0);
    if (!LESS) for (var m = 0; m < nf; m++) chars[touched[Math.floor(Math.random() * touched.length)]] = Math.floor(Math.random() * glyphs.length);
    ctx.clearRect(0, 0, W, H);
    var aw = CW * dpr, ah = CH * dpr;
    for (i = 0; i < touched.length; i++) {
      var kk = touched[i], vv = val[kk], h = hiv[kk], rr = (kk / cols) | 0, cc = kk - rr * cols, gi = chars[kk];
      ctx.globalAlpha = (V.a0 + V.a1 * smooth(TH, 1, vv)) * (1 - h * 0.6);
      ctx.drawImage(atlas, gi * aw, 0, aw, ah, cc * CW, rr * CH, CW, CH);
      var hA = Math.max(h * V.ah, rip[kk] * 0.9);
      if (hA > 0.006) {
        ctx.globalAlpha = hA;
        ctx.drawImage(atlas, gi * aw, ah, aw, ah, cc * CW, rr * CH, CW, CH);
      }
    }
    ctx.globalAlpha = 1;
    painted = touched.length;
  }
  /* Указатель над знаком рисунка (в RIP_HIT ячейках есть знак, не под офисом) — точка в холсте, иначе null. */
  function cellAt(e) {
    if (!V || !canvas || canvas.hidden || !val) return null;
    var b = canvas.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top, o = hole();
    if (x < 0 || y < 0 || x >= W || y >= H || (x > o.x && x < o.x + o.w && y > o.y && y < o.y + o.h)) return null;
    var c = Math.floor(x / CW), r = Math.floor(y / CH);
    for (var dy = -RIP_HIT; dy <= RIP_HIT; dy++) for (var dx = -RIP_HIT; dx <= RIP_HIT; dx++) {
      var cc = c + dx, rr = r + dy;
      if (cc >= 0 && rr >= 0 && cc < cols && rr < rows && val[rr * cols + cc] > TH) return { x: x, y: y };
    }
    return null;
  }
  function onDown(e) {
    if (LESS || (opts.skip && opts.skip(e))) return;
    var p = cellAt(e);
    if (!p) return;
    ripples.push({ x: p.x, y: p.y, t: performance.now() });
    if (ripples.length > RIP_MAX) ripples.shift();
  }
  function onMove(e) {   // над знаками — «рука»: их можно нажать
    var on = !LESS && !(opts.skip && opts.skip(e)) && !!cellAt(e);
    if (on !== over && canvas) { over = on; canvas.parentNode.classList.toggle('drift-over', on); }
  }
  function loop() {
    clearInterval(timer); timer = 0;
    if (!V) return;
    if (LESS) {   // неподвижно: два рисунка в полную силу
      figs = [];
      for (var i = 0; i < 2; i++) { var f = spawn(0, 1e12); if (f) figs.push(f); }
      tick(0);
      return;
    }
    timer = setInterval(function () { tick(performance.now()); }, STEP_MS);
  }
  function seed() {   // при включении сразу один рисунок, уже наполовину проявленный, — фон не пустой первые секунды
    figs = [];
    var now = performance.now(), f = spawn(now);
    if (f) { f.born = now - IN_MS * 0.6; figs.push(f); }
    nextSpawn = now + 2500;
  }

  window.OfficeDrift = {
    variants: VARIANTS,
    start: function (c, v, o) {
      canvas = c; opts = o || {};
      if (!bound) {
        bound = true;
        var t = 0;
        window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(function () { build(); if (LESS) loop(); }, 150); });
        if (document.fonts && document.fonts.load) document.fonts.load('12px "JetBrains Mono"', '{}0a').then(function () { if (V) makeAtlas(); }, function () {});
        window.addEventListener('pointerdown', onDown, { passive: true });   // нажатие не перехватывается: офис под ним живёт как раньше
        window.addEventListener('pointermove', onMove, { passive: true });
      }
      this.set(v);
    },
    set: function (v) {
      V = VARIANTS[v] || null;
      if (!canvas) return;
      canvas.hidden = !V;
      build();
      if (V && !LESS) seed();
      loop();
    },
    info: function () { return { variant: V ? V.kind : null, figures: figs.length, painted: painted, cols: cols, rows: rows, cell: [CW, CH], ripples: ripples.length }; }
  };
})();
