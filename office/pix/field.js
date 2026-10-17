/* Фон страницы офиса — поле знаков, как на нынешнем сайте (assets/js/app.js, initField), в нескольких цветах.
   Владелец 15.10: «фон сайта как в текущем сайте, чтобы по тематике подходило, но немного другого цвета, чтобы не
   было чересчур (нужны варианты)». Перенесено поведение поля сайта: знаки {}[]()<>/… моноширинным шрифтом, ячейка
   15×19, курсор «греет» ячейки вокруг (радиус, затухание за кадр), несколько знаков перемешиваются. Без параллакса и
   отклика на прокрутку — страница офиса не листается. «Уменьшить движение» — поле неподвижно, без нагрева.
   window.OfficeField.start(canvas, вариант), .set(вариант); варианты — VARIANTS ниже. */
(function () {
  'use strict';

  var GLYPHS = '{}[]()<>/\\|;:=+-*#$%&!?^~01234567§№¶λ';   // как на сайте
  var CELL_W = 15, CELL_H = 19, FONT = 12;
  var DECAY = 0.84, THRESH = 0.02, FLICKER_MS = 130, FLICKER_COUNT = 5;
  var FONT_FAMILY = '"JetBrains Mono", ui-monospace, monospace';

  /* base — цвет спящего знака и его прозрачность; glow — ореол под курсором, ember — его горячая середина (нет — без неё);
     peak — потолок прозрачности горящего знака; radius — радиус пятна. «site» — ровно как на сайте. */
  var VARIANTS = {
    none: null,
    site: { name: 'как на сайте', base: '#8791ab', alpha: 0.085, glow: '#00c5cd', ember: '#ffb454', peak: 1, radius: 132 },
    quiet: { name: 'тише', base: '#8791ab', alpha: 0.05, glow: '#2dd4bf', ember: null, peak: 0.45, radius: 110 },
    office: { name: 'в цвет офиса', base: '#9aa1ad', alpha: 0.055, glow: '#2dd4bf', ember: '#8ff3e6', peak: 0.6, radius: 120 },
    teal: { name: 'бирюзовая тьма', base: '#2dd4bf', alpha: 0.04, glow: '#5ee6d4', ember: null, peak: 0.5, radius: 120 }
  };

  var LESS = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas = null, ctx = null, V = null, cols = 0, rows = 0, chars = [], heat = null, lit = null, hot = [];
  var running = false, lastFrame = 0, lastPoint = null, flickerTimer = 0, bound = false;

  function glyph() { return GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length)); }

  function build() {
    if (!canvas) return;
    var host = canvas.parentNode, w = host.clientWidth, h = host.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = FONT + 'px ' + FONT_FAMILY; ctx.textBaseline = 'top';
    cols = Math.ceil(w / CELL_W); rows = Math.ceil(h / CELL_H);
    chars = new Array(cols * rows);
    for (var i = 0; i < chars.length; i++) chars[i] = glyph();
    heat = new Float32Array(cols * rows); lit = new Uint8Array(cols * rows); hot = [];
    paintAll();
  }
  function paintCell(col, row, alpha, color) {
    ctx.globalAlpha = alpha; ctx.fillStyle = color;
    ctx.fillText(chars[row * cols + col], col * CELL_W + 2, row * CELL_H + 3);
  }
  function paintAll() {
    if (!ctx) return;
    ctx.clearRect(0, 0, cols * CELL_W, rows * CELL_H);
    if (!V) return;
    for (var row = 0; row < rows; row++) for (var col = 0; col < cols; col++) paintCell(col, row, V.alpha, V.base);
    ctx.globalAlpha = 1;
  }
  function touch(i, v) {
    if (v > heat[i]) heat[i] = v;
    if (!lit[i]) { lit[i] = 1; hot.push(i); }
    if (!running) { running = true; lastFrame = 0; requestAnimationFrame(frame); }
  }
  function warm(x, y) {
    var R = V.radius, c0 = Math.max(0, Math.floor((x - R) / CELL_W)), c1 = Math.min(cols - 1, Math.ceil((x + R) / CELL_W));
    var r0 = Math.max(0, Math.floor((y - R) / CELL_H)), r1 = Math.min(rows - 1, Math.ceil((y + R) / CELL_H));
    for (var row = r0; row <= r1; row++) for (var col = c0; col <= c1; col++) {
      var dx = col * CELL_W + CELL_W / 2 - x, dy = row * CELL_H + CELL_H / 2 - y, v = 1 - Math.sqrt(dx * dx + dy * dy) / R;
      if (v > 0) touch(row * cols + col, v);
    }
  }
  function frame(now) {
    var step = lastFrame ? Math.min(now - lastFrame, 64) : 16.7; lastFrame = now;
    var fade = Math.pow(DECAY, step / 16.7), kept = [];
    for (var i = 0; i < hot.length; i++) {
      var k = hot[i], v = heat[k] * fade, row = (k / cols) | 0, col = k - row * cols;
      if (v < THRESH || !V) { heat[k] = 0; lit[k] = 0; } else { heat[k] = v; kept.push(k); }
      ctx.clearRect(col * CELL_W, row * CELL_H, CELL_W, CELL_H);
      if (!V) continue;
      if (v < THRESH) paintCell(col, row, V.alpha, V.base);
      else paintCell(col, row, V.alpha + v * v * V.peak, V.ember && v > 0.78 ? V.ember : V.glow);
    }
    hot = kept; ctx.globalAlpha = 1;
    if (hot.length) requestAnimationFrame(frame); else running = false;
  }
  function flicker() {
    if (document.hidden || !V || !cols) return;
    for (var i = 0; i < FLICKER_COUNT; i++) {
      var col = Math.floor(Math.random() * cols), row = Math.floor(Math.random() * rows), k = row * cols + col;
      if (lit[k]) continue;
      chars[k] = glyph();
      ctx.clearRect(col * CELL_W, row * CELL_H, CELL_W, CELL_H);
      paintCell(col, row, V.alpha, V.base);
    }
    ctx.globalAlpha = 1;
  }
  function onMove(e) {
    if (!V || !canvas) return;
    var b = canvas.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top;
    if (lastPoint) {   // между кадрами курсор уезжает далеко — греем и точки по пути, иначе хвост пунктиром
      var dx = x - lastPoint.x, dy = y - lastPoint.y, steps = Math.min(8, Math.floor(Math.sqrt(dx * dx + dy * dy) / (V.radius / 3)));
      for (var s = 1; s <= steps; s++) warm(lastPoint.x + dx * s / (steps + 1), lastPoint.y + dy * s / (steps + 1));
    }
    lastPoint = { x: x, y: y }; warm(x, y);
  }

  window.OfficeField = {
    variants: VARIANTS,
    start: function (c, v) {
      canvas = c; this.set(v);
      if (bound) return; bound = true;
      var t = 0;
      window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(build, 150); });
      if (document.fonts && document.fonts.load) document.fonts.load(FONT + 'px "JetBrains Mono"', '{}01').then(paintAll, function () {});
      if (LESS) return;
      if (window.matchMedia && window.matchMedia('(pointer: fine)').matches) window.addEventListener('mousemove', onMove, { passive: true });
      flickerTimer = setInterval(flicker, FLICKER_MS);
    },
    set: function (v) {
      V = VARIANTS[v] || null;
      if (canvas) { canvas.hidden = !V; build(); }
    }
  };
})();
