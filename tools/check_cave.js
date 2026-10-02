#!/usr/bin/env node
/* Пещера за «Опытом» (assets/js/cave.js, 5.90) — проверки без браузера.

       node tools/check_cave.js

   Картинку считает видеокарта, её здесь не проверить — это делают живые проверки на настоящей
   странице (сверка кадр в кадр с прототипом, контраст, нагрузка). Здесь то, что ломается тихо:
   — мир (огни, сосульки, наросты, кристаллы, снег, кольца хода, текстуры камня) — ровно тот, что
     владелец одобрил в прототипе: отпечатки сняты с прототипа (.live/cave/world_ref.js сверил мир
     продукта с ним число в число), и любая правка генератора их меняет;
   — огней не больше, чем места в шейдере, при любых воротах; кольца хода в своих пределах, у
     ворот уже;
   — ворота, камера, вход и выход у кромок раздела — по своим правилам;
   — страница под заглушками: без WebGL2, без видеокарты, с несобравшимся шейдером пещеры нет и
     страница не тронута; на узком окне — выключена; при «уменьшить движение» — неподвижный кадр;
     кадр собирается без ошибок и рисует спрайты и снег;
   — персонажи в нишах: ни одна точка арта не в камне, под ними и перед ними — пол;
   — смена сцены (5.91): пещера по всему экрану, пока раздел посреди окна, во времени и через темноту; «тише». */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// CAVE_JS — другой файл вместо assets/js/cave.js: так проверку гоняют по копии с поломкой.
const SOURCE = process.env.CAVE_JS ? path.resolve(process.env.CAVE_JS) : path.join(__dirname, '..', 'assets', 'js', 'cave.js');
const core = require(SOURCE);
const C = core.consts;

const results = [];
function check(name, fn) {
  try {
    const note = fn();
    results.push({ name, ok: true });
    console.log('  ✓ ' + name + (note ? ': ' + note : ''));
  } catch (e) {
    results.push({ name, ok: false });
    console.log('  ✗ ' + name + ': ' + (e && e.message ? e.message : e));
  }
}
function fail(msg) { throw new Error(msg); }

/* Отпечатки одобренного мира — сняты с прототипа 2026-10-01 (.live/cave/world_ref.js: мир
   продукта совпал с прототипом число в число на всех этих раскладках). FNV-1a по битам float64. */
const PRINTS = {
  '35,44': { lights: 24, sprites: 96, world: '893ecf24', tube: 'e5b5a8be' },
  '23,44': { lights: 24, sprites: 110, world: 'aeb66174', tube: '153ee707' },
  '20,40': { lights: 27, sprites: 114, world: 'fd6eb670', tube: 'c124bbf5' },
  '12,50': { lights: 26, sprites: 111, world: 'db9c29fc', tube: 'a9e8f762' },
  '30,34': { lights: 25, sprites: 103, world: 'fac8801c', tube: 'a1f6f809' },
  '35': { lights: 15, sprites: 47, world: 'bdd4b302', tube: '9cab6649' },
  '': { lights: 13, sprites: 46, world: '05965911', tube: '26418a75' },
  flakes: '95bf46ad',
  textures: '60344428',
};

function fnv(nums) {
  const b = new DataView(new ArrayBuffer(8));
  let h = 0x811c9dc5;
  for (const x of nums) {
    b.setFloat64(0, x);
    for (let i = 0; i < 8; i++) { h ^= b.getUint8(i); h = Math.imul(h, 0x01000193) >>> 0; }
  }
  return ('00000000' + h.toString(16)).slice(-8);
}
function flat(a) { return [].concat.apply([], a); }
function worldNums(w) {
  return flat(w.lights.map(function (o) { return [o.x, o.y, o.z, o.base, o.inv, o.phase]; })).concat(
    flat(w.sprites.map(function (s) { return s.kind === 0 ? [s.kind, s.x, s.y, s.len, s.w, s.top] : [s.kind, s.x, s.y, s.h, s.w]; })));
}

console.log('Пещера — assets/js/cave.js');

/* --- мир --------------------------------------------------------------------- */

check('мир — одобренный: огни, спрайты и кольца хода по семи раскладкам ворот', function () {
  const bad = [];
  Object.keys(PRINTS).forEach(function (key) {
    if (key === 'flakes' || key === 'textures') return;
    const gates = key ? key.split(',').map(Number) : [], want = PRINTS[key], w = core.buildWorld(gates);
    const got = { lights: w.lights.length, sprites: w.sprites.length, world: fnv(worldNums(w)), tube: fnv(Array.from(core.buildTube(gates))) };
    ['lights', 'sprites', 'world', 'tube'].forEach(function (k) { if (got[k] !== want[k]) bad.push('[' + key + '] ' + k + ': ' + got[k] + ' вместо ' + want[k]); });
  });
  if (bad.length) fail(bad.join('; '));
  return 'отпечатки совпали';
});

check('снег и текстуры камня — одобренные', function () {
  const fl = fnv(flat(core.buildFlakes().map(function (f) { return [f.x, f.y, f.z, f.sp, f.ph]; })));
  const tx = fnv([].concat.apply([], core.makeTextures().map(function (t) { return Array.from(t); })));
  if (fl !== PRINTS.flakes) fail('снег: ' + fl + ' вместо ' + PRINTS.flakes);
  if (tx !== PRINTS.textures) fail('текстуры: ' + tx + ' вместо ' + PRINTS.textures);
  return '90 снежинок, 6 текстур ' + C.N + '×' + C.N;
});

check('огней (кристаллы и разломы) не больше места в шейдере при любых воротах', function () {
  let max = 0, worst = null, n = 0;
  const configs = [[], [20]];
  for (let a = 5; a <= C.ML - 8; a++) for (let b = a + 4; b <= C.ML - 8; b++) configs.push([a, b]);
  configs.forEach(function (g) {
    const L = core.buildWorld(g).lights.length + core.buildRifts(g, core.RIFT).length;   // у каждого разлома свой огонь
    n += 1;
    if (L > max) { max = L; worst = g; }
  });
  if (max > C.MAXL) fail('при воротах [' + worst + '] огней ' + max + ' > ' + C.MAXL);
  return n + ' раскладок, больше всего огней — ' + max + ' (ворота [' + worst + ']) из ' + C.MAXL;
});

check('кольца хода: радиус в пределах, тон положительный, камень — сухой, иней или лёд', function () {
  const t = core.buildTube([35, 44]);
  let rMin = Infinity, rMax = 0;
  for (let i = 0; i < t.length; i += 4) {
    rMin = Math.min(rMin, t[i]); rMax = Math.max(rMax, t[i]);
    if (!(t[i + 1] > 0 && t[i + 1] < 2)) fail('тон ' + t[i + 1] + ' в отсчёте ' + i / 4);
    if ([5, 6, 7].indexOf(t[i + 2]) < 0) fail('камень ' + t[i + 2] + ' в отсчёте ' + i / 4);
  }
  if (rMin < 0.2 || rMax > C.T_R0 * 1.3) fail('радиус от ' + rMin.toFixed(3) + ' до ' + rMax.toFixed(3));
  return 'радиус ' + rMin.toFixed(2) + '…' + rMax.toFixed(2) + ' (ось — ' + C.T_R0 + ')';
});

check('у ворот ход уже: сужение на кольце ворот', function () {
  const gates = [35, 44], t = core.buildTube(gates), mean = function (k) {
    let s = 0;
    for (let b = 0; b < C.T_BINS; b++) s += t[(k * C.T_BINS + b) * 4];
    return s / C.T_BINS;
  };
  let far = 0, n = 0;
  for (let k = 3; k < C.ML - 3; k++) if (Math.abs(k - gates[0]) > 4 && Math.abs(k - gates[1]) > 4) { far += mean(k); n += 1; }
  far /= n;
  const at = gates.map(mean);
  at.forEach(function (r, i) { if (r > far * 0.82) fail('ворота ' + gates[i] + ': средний радиус ' + r.toFixed(3) + ' при обычном ' + far.toFixed(3)); });
  return 'обычный ' + far.toFixed(2) + ', у ворот ' + at.map(function (r) { return r.toFixed(2); }).join(' и ');
});

check('ярусы: сосулек и кристаллов глубже больше, у ворот их нет', function () {
  const gates = [24, 44], w = core.buildWorld(gates), lvl = function (y) { return core.levelOf(gates, y); };
  const per = { 3: [0, 0, 0], 2: [0, 0, 0], 1: [0, 0, 0] };   // ряды, сосульки, кристаллы
  for (let y = 2; y < C.ML - 2; y++) per[lvl(y)][0] += 1;
  w.sprites.forEach(function (s) {
    const L = lvl(Math.floor(s.y));
    if (s.kind === 0) per[L][1] += 1;
    if (s.kind === 3 && gates.every(function (g) { return Math.abs(s.y - (g - 1)) > 1e-9; })) per[L][2] += 1;
    if (s.kind === 0 && gates.some(function (g) { return Math.abs(Math.floor(s.y) - g) < 1.2; })) fail('сосулька у ворот: y ' + s.y.toFixed(2));
  });
  const d = function (L, i) { return per[L][i] / per[L][0]; };
  if (!(d(1, 1) > d(2, 1) && d(2, 1) > d(3, 1))) fail('сосулек на ряд: ' + [3, 2, 1].map(function (L) { return d(L, 1).toFixed(2); }).join(' / '));
  if (!(d(1, 2) > d(3, 2))) fail('кристаллов на ряд: ' + [3, 2, 1].map(function (L) { return d(L, 2).toFixed(2); }).join(' / '));
  return 'сосулек на ряд сверху вниз ' + [3, 2, 1].map(function (L) { return d(L, 1).toFixed(2); }).join(' → ') +
    ', кристаллов ' + [3, 2, 1].map(function (L) { return d(L, 2).toFixed(2); }).join(' → ');
});

/* --- разломы ------------------------------------------------------------------------ */

check('разломы: в каждой форме есть дыра, вокруг неё кромка и свечение', function () {
  const at = core.riftAtlas(), stride = C.RS_W * C.RS_N, notes = [];
  for (let sh = 0; sh < C.RS_N; sh++) {
    let hole = 0, rim = 0, glow = 0;
    for (let ty = 0; ty < C.RS_H; ty++) for (let tx = 0; tx < C.RS_W; tx++) {
      const o = (ty * stride + sh * C.RS_W + tx) * 4;
      if (at.data[o]) hole += 1;
      if (at.data[o + 1]) rim += 1;
      if (at.data[o + 2] > 40 && !at.data[o]) glow += 1;
      if (at.data[o] && at.data[o + 1]) fail('форма ' + sh + ': дыра и кромка в одном текселе');
    }
    if (hole < 300 || hole > 4000) fail('форма ' + sh + ': дыры ' + hole + ' текселей');
    if (rim < hole * 0.15) fail('форма ' + sh + ': кромки ' + rim + ' при дыре ' + hole);
    if (glow < rim) fail('форма ' + sh + ': свечения ' + glow + ' меньше кромки ' + rim);
    if (!at.cores[sh].length) fail('форма ' + sh + ': знакам неоткуда вылетать');
    notes.push(hole + '/' + rim);
  }
  return 'дыра/кромка, текселей: ' + notes.join(', ');
});

check('разломы: вдоль хода, не у ворот, на стенах только там, где их видно над полом', function () {
  const gates = [24, 28], rf = core.buildRifts(gates, core.RIFT);
  if (rf.length < 7 || rf.length > C.MAXR) fail('разломов ' + rf.length);
  let walls = 0, floors = 0;
  rf.forEach(function (o) {
    gates.forEach(function (g) { if (Math.abs(o.y - g) < 2.2) fail('разлом у ворот ' + g + ': y ' + o.y.toFixed(2)); });
    if (o.y < 4 || o.y > C.ML - 7) fail('разлом за краем хода: y ' + o.y.toFixed(2));
    if (o.kind === 0) { walls += 1; if (Math.sin(o.a) < -0.5) fail('разлом на стене ниже пола: θ ' + o.a.toFixed(2)); }
    else { floors += 1; if (Math.abs(o.a - 4.5) > 0.6) fail('разлом на полу у стены: x ' + o.a.toFixed(2)); }
    if (Math.abs(o.cos * o.cos + o.sin * o.sin - 1) > 1e-9) fail('поворот разлома не единичный');
  });
  // ход камеры — 36 клеток: на пути хотя бы пять разломов
  const onPath = rf.filter(function (o) { return o.y > C.Y0 && o.y < C.Y1 + 12; }).length;
  if (onPath < 5) fail('на пути камеры разломов ' + onPath);
  return rf.length + ' разломов (стены ' + walls + ', пол ' + floors + '), на пути камеры ' + onPath;
});

check('знаки кода: шрифт 5 × 7, набор поля сайта', function () {
  const G = core.GLYPH_ROWS, keys = Object.keys(G), field = '{}[]()<>/|;:=+-*#$%&!?^~01234567§№¶λ';
  if (keys.length !== 16) fail('знаков ' + keys.length);
  keys.forEach(function (k) {
    if (field.indexOf(k) < 0) fail('знака «' + k + '» нет в поле сайта');
    if (G[k].length !== 7 || G[k].some(function (row) { return row.length !== 5 || /[^.X]/.test(row); })) fail('знак «' + k + '» не 5 × 7');
    if (!G[k].some(function (row) { return row.indexOf('X') >= 0; })) fail('знак «' + k + '» пустой');
  });
  return keys.join(' ');
});

/* --- ворота, камера, вход и выход ----------------------------------------------- */

check('ворота — между местами работы, в пределах хода, не ближе четырёх клеток', function () {
  const vh = 945, top = 1550, h = 2300;
  const g = core.gatesFrom(top, h, vh, [top + 1600, top + 1950]);
  if (g.length !== 2) fail('ворот ' + g.length);
  if (g[0] < 5 || g[1] > C.ML - 8 || g[1] - g[0] < 4) fail('ворота ' + g);
  const close = core.gatesFrom(top, h, vh, [top + 1600, top + 1610]);
  if (close[1] - close[0] !== 4) fail('близкие места работы: ворота ' + close);
  if (core.gatesFrom(top, h, vh, []).length !== 0) fail('одно место работы — ворот быть не должно');
  if (core.gatesFrom(top, h, vh, [top + 900]).length !== 1) fail('два места работы — одни ворота');
  const edge = core.gatesFrom(top, h, vh, [top - 5000, top + 99999]);
  if (edge[0] !== 5 || edge[1] !== Math.min(C.ML - 8, Math.round(C.Y1))) fail('крайние ворота ' + edge);
  return 'обычная раскладка → [' + g + '], близкие → [' + close + ']';
});

check('камера: до раздела в начале хода, после — в конце, по пути — только вперёд', function () {
  const vh = 945, h = 2300;
  if (core.camTarget(vh, vh + 10, h) !== C.Y0) fail('до раздела камера ' + core.camTarget(vh, vh + 10, h));
  if (core.camTarget(vh, -h - 10, h) !== C.Y1) fail('после раздела камера ' + core.camTarget(vh, -h - 10, h));
  let prev = -1;
  for (let top = vh; top >= -h; top -= 37) {
    const c = core.camTarget(vh, top, h);
    if (c < prev) fail('камера пошла назад при верхе раздела ' + top);
    prev = c;
  }
  return 'от ' + C.Y0 + ' до ' + C.Y1 + ' клетки';
});

/* Смена сцены (5.91). Владелец о «утре 600» — «переход к пещере это просто полоса»; после форм края, «по краям»,
   разломов в фоне и трещин по периметру — «Через темноту мне нравится»: пещера включается по всему экрану, пока
   занимает середину окна, — во времени, сперва темнота цвета фона, потом камни. Меры — от слов и вида («середина
   окна», «через темноту», без мигания у границы), а не от чисел cave.js. */
check('смена сцены: пещера — пока занимает середину окна, с запасом у границы; сперва темнота, потом камни', function () {
  const vh = 945, mid = vh / 2, Z = function (top, bot) { return { darkTop: top, darkBot: bot }; };
  const bad = [];
  if (core.sceneTarget(Z(mid - 200, mid + 2000), vh, false) !== 1) bad.push('пещера посреди окна — сцены нет');
  if (core.sceneTarget(Z(mid + 200, mid + 2000), vh, false) !== 0) bad.push('верх пещеры ниже середины — сцена уже есть');
  if (core.sceneTarget(Z(-2000, mid - 200), vh, false) !== 0) bad.push('низ пещеры выше середины — сцена ещё есть');
  // запас у границы: места верха пещеры, где включённая сцена держится, а выключенная не включается
  let hyst = 0;
  for (let x = mid - 300; x <= mid + 300; x++) {
    if (core.sceneTarget(Z(x, mid + 2000), vh, true) === 1 && core.sceneTarget(Z(x, mid + 2000), vh, false) === 0) hyst += 1;
  }
  if (hyst < 40 || hyst > 300) bad.push('запас у границы ' + hyst + ' px');
  // через темноту: на 0 — ничего, на 1 — всё; камни проступают, когда темнота почти во всю силу
  const L0 = core.sceneLook(0), L1 = core.sceneLook(1);
  if (L0[0] !== 0 || L0[1] !== 0 || L1[0] !== 1 || L1[1] !== 1) bad.push('края смены ' + L0 + ' / ' + L1);
  let firstStone = null, back = 0;
  for (let i = 0; i <= 1000; i++) {
    const a = core.sceneLook(i / 1000), b = core.sceneLook(Math.min(1, (i + 1) / 1000));
    if (firstStone === null && a[1] > 0.02) firstStone = i / 1000;
    if (b[0] < a[0] || b[1] < a[1]) back += 1;
  }
  if (firstStone === null || !(core.sceneLook(firstStone)[0] >= 0.8)) bad.push('камни проступают, а темнота ещё ' + (firstStone === null ? '—' : core.sceneLook(firstStone)[0].toFixed(2)));
  if (back) bad.push('не в одну сторону: шагов ' + back);
  // смена — около секунды: не мгновенно и не тягуче
  if (!(C.SCENE_MS >= 600 && C.SCENE_MS <= 2000)) bad.push('смена за ' + C.SCENE_MS + ' мс');
  if (bad.length) fail(bad.join('; '));
  return 'запас у границы ' + hyst + ' px; камни — с хода ' + firstStone.toFixed(2) + ' (темнота ' + core.sceneLook(firstStone)[0].toFixed(2) +
    '); смена ' + C.SCENE_MS + ' мс';
});

/* Предел под текстом — против настоящих цветов текста из style.css, по формуле WCAG 2: бирюза
   роли, основной текст и серые подписи раздела — у пещеры у них свой, более светлый цвет (5.90:
   полосы под датами нет). CAVE_CSS — другой файл стилей (так проверку гоняют по копии с поломкой). */
check('предел яркости под текстом даёт не меньше 4.5:1 цветам сайта', function () {
  const css = fs.readFileSync(process.env.CAVE_CSS ? path.resolve(process.env.CAVE_CSS) : path.join(__dirname, '..', 'assets', 'css', 'style.css'), 'utf8');
  const hex = function (m, what) {
    if (!m) fail('в style.css нет ' + what);
    return [0, 2, 4].map(function (i) { return parseInt(m[1].slice(i, i + 2), 16); });
  };
  const token = function (name) { return hex(new RegExp('--' + name + ':\\s*#([0-9a-f]{6})', 'i').exec(css), 'токена --' + name); };
  const label = hex(/html\.cave #experience \.timeline__span \{ color: #([0-9a-f]{6}); \}/i.exec(css), 'цвета серых подписей у пещеры');
  const lin = function (c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const lum = function (rgb) { return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]); };
  const ratio = function (a, b) { return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
  const lim = core.MASK_LIMITS;
  const rows = [
    ['роль (--accent)', ratio(lum(token('accent')), lim.L_TEXT)],
    ['основной текст (--text-dim)', ratio(lum(token('text-dim')), lim.L_TEXT)],
    ['серые подписи раздела у пещеры', ratio(lum(label), lim.L_TEXT)],
    ['серый текст соседних разделов (--muted) на входе и выходе', ratio(lum(token('muted')), lim.L_OUT)],
  ];
  const bad = rows.filter(function (r) { return r[1] < 4.5; });
  if (bad.length) fail(bad.map(function (r) { return r[0] + ' — ' + r[1].toFixed(2) + ':1'; }).join('; '));
  return rows.map(function (r) { return r[1].toFixed(2); }).join(', ');
});

check('шейдеры собраны из тех же чисел и целы', function () {
  const S = core.shaders, bad = [];
  Object.keys(S).forEach(function (k) {
    const src = S[k];
    if (src.indexOf('#version 300 es') !== 0) bad.push(k + ': нет #version 300 es в начале');
    const open = (src.match(/\{/g) || []).length, close = (src.match(/\}/g) || []).length;
    if (open !== close) bad.push(k + ': скобок { ' + open + ', } ' + close);
    const po = (src.match(/\(/g) || []).length, pc = (src.match(/\)/g) || []).length;
    if (po !== pc) bad.push(k + ': скобок ( ' + po + ', ) ' + pc);
  });
  const fs0 = S.FS_TUBE;
  ['FOG_K = 0.11', 'L_TEXT = ' + core.MASK_LIMITS.L_TEXT, 'MAXL = ' + C.MAXL].forEach(function (w) {
    if (fs0.indexOf(w) < 0) bad.push('в шейдере нет «' + w + '»');
  });
  if (bad.length) fail(bad.join('; '));
  return Object.keys(S).length + ' шейдеров';
});

/* --- персонажи ----------------------------------------------------------------------- */

/* Персонаж — плоскость на своей глубине; точка арта видна, если ход до неё не кончился. Расчёт — как в шейдере
   (tubeCast слово в слово, числа — из самого шейдера). Места ниши — все, куда персонажа ставит раскладка (кольцо
   k0 от 3 до 30), и с воротами рядом (сужение кольца). Владелец 2026-10-02: «маг в стенке застрял как-будто» —
   низ мантии и сапоги уходили в угол пола и в скат за спиной (22 % точек мага; у рыцаря — кончик меча и сапог). */
function glNum(name) {
  const src = core.shaders.FS_TUBE, at = src.indexOf(' ' + name + ' = ');
  const v = at < 0 ? NaN : parseFloat(src.slice(at + name.length + 4));
  if (!isFinite(v)) fail('в шейдере нет числа ' + name);
  return v;
}
function tubeCast(td, bf, rho, cy, NEAR) {   // FS_TUBE: tubeCast
  const BINS = C.T_BINS, ML = C.ML, b0 = Math.floor(bf), b1 = b0 + 1 === BINS ? 0 : b0 + 1, fr = bf - b0;
  const R = function (b, k) { return td[(k * BINS + b) * 4]; };
  let k = Math.floor(cy), R0 = R(b0, k) + (R(b1, k) - R(b0, k)) * fr;
  for (let it = 0; it < ML; it++) {
    if (k >= ML - 1) break;
    const R1 = R(b0, k + 1) + (R(b1, k + 1) - R(b0, k + 1)) * fr, den = rho - (R1 - R0);
    if (den > 1e-6) {
      const t = (R0 + (R1 - R0) * (cy - k)) / den;
      if (t > NEAR && t <= k + 1 - cy + 1e-6 && t >= k - cy - 1e-6) return t;
    }
    R0 = R1;
    k++;
  }
  return ML - 1 - cy;
}
// луч из камеры (на оси, на месте cy) к точке мира: [где кончается ход, где точка]
function wallBefore(G, td, cy, x, y, z) {
  const d = y - cy, sx = (x - G.CX) / d, vz = (z - G.EYE) / d;
  let bf = ((sx === 0 && vz === 0 ? 0 : Math.atan2(vz, sx)) + Math.PI) / (2 * Math.PI) * C.T_BINS - 0.5;
  if (bf < 0) bf += C.T_BINS;
  return [tubeCast(td, bf, Math.sqrt(sx * sx + vz * vz), cy, G.NEAR), d];
}
let PLACES = null;
function places() {
  if (PLACES) return PLACES;
  const G = { CX: glNum('CX'), EYE: glNum('EYE'), NEAR: glNum('NEAR') }, list = [], tubes = {};
  core.CHARS.forEach(function (c) {
    const base = core.charAt(c, 2400, 1500, 4200, 945);
    for (let k0 = 3; k0 <= 30; k0++) {
      [null, 0, 1, 2, -1].forEach(function (g) {
        const gates = g === null ? [] : [k0 + g], key = gates.join();
        if (!tubes[key]) tubes[key] = core.buildTube(gates);
        const ch = Object.assign({}, base, { y: k0 + C.KN_SLOPE }), td = tubes[key].slice();
        core.carveNiche(td, ch);
        list.push({ c: c, ch: ch, td: td, k0: k0, g: g });
      });
    }
  });
  return (PLACES = { G: G, list: list });
}
function charName(c) { return c.art === core.KNIGHT ? 'рыцарь' : c.art === core.MAGE ? 'маг' : 'персонаж'; }
function placeName(w) { return 'кольцо ' + w.k0 + (w.g === null ? '' : ', ворота ' + (w.g >= 0 ? '+' : '') + w.g); }

check('персонажи целиком в ходе: ни одна точка арта не в камне — на любом месте ниши, у ворот тоже', function () {
  const P = places(), worst = {}, corners = [[0.5, 0.5], [0.02, 0.02], [0.98, 0.02], [0.02, 0.98], [0.98, 0.98]];
  let n = 0;
  P.list.forEach(function (p) {
    const a = core.artPixels(p.c.art), ch = p.ch, cy = ch.y - 2;
    let hid = 0;
    for (let j = 0; j < a.h; j++) {
      for (let i = 0; i < a.w; i++) {
        if (a.data[(j * a.w + i) * 4 + 3] < 128) continue;
        n += 1;
        // центр и углы клетки (чуть внутрь): экран может показать любой её край
        const inside = corners.every(function (q) {
          const r = wallBefore(P.G, p.td, cy, ch.x - ch.w / 2 + (i + q[0]) / a.w * ch.w, ch.y, ch.h * (1 - (j + q[1]) / a.h));
          return r[1] < r[0];
        });
        if (!inside) hid += 1;
      }
    }
    const nm = charName(p.c);
    if (hid && (!worst[nm] || hid > worst[nm].hid)) worst[nm] = { hid: hid, k0: p.k0, g: p.g };
  });
  const bad = Object.keys(worst);
  if (bad.length) fail(bad.map(function (nm) { return nm + ': ' + worst[nm].hid + ' точек в камне (' + placeName(worst[nm]) + ')'; }).join('; '));
  return P.list.length + ' мест, ' + n + ' точек арта';
});

check('у ниши пол: под персонажем и перед ним, от края до края и шире на 5 см, — пол, а не грань стены', function () {
  const P = places(), worst = {};
  P.list.forEach(function (p) {
    const ch = p.ch, cy = ch.y - 2;
    let wall = 0, all = 0;
    for (let x = ch.x - ch.w / 2 - 0.025; x <= ch.x + ch.w / 2 + 0.025 + 1e-9; x += 0.02) {
      [0, 0.15, 0.3].forEach(function (dy) {
        const r = wallBefore(P.G, p.td, cy, x, ch.y - dy, 0);
        all += 1;
        if (r[0] < r[1] - 1e-4) wall += 1;
      });
    }
    const nm = charName(p.c);
    if (wall && (!worst[nm] || wall > worst[nm].wall)) worst[nm] = { wall: wall, all: all, k0: p.k0, g: p.g };
  });
  const bad = Object.keys(worst);
  if (bad.length) fail(bad.map(function (nm) { const w = worst[nm]; return nm + ': стена вместо пола в ' + w.wall + ' из ' + w.all + ' точек (' + placeName(w) + ')'; }).join('; '));
  return P.list.length + ' мест';
});

/* --- страница под заглушками -------------------------------------------------------- */

const SRC = fs.readFileSync(SOURCE, 'utf8');

// Видеокарта-заглушка: любой метод — функция, записывающая вызов; константы — числа.
function fakeGL(opts, calls) {
  const consts = {};
  return new Proxy({}, {
    get: function (t, k) {
      if (typeof k !== 'string') return undefined;
      if (/^[A-Z0-9_]+$/.test(k)) { if (!(k in consts)) consts[k] = Object.keys(consts).length + 1; return consts[k]; }
      return function () {
        calls.push([k].concat(Array.prototype.slice.call(arguments)));
        if (k === 'getShaderParameter') return !opts.badShader;
        if (k === 'getProgramParameter') return true;
        if (k === 'isContextLost') return false;
        if (k === 'getShaderInfoLog') return 'ERROR: 0:1: заглушка';
        if (k === 'getExtension') return null;
        return {};
      };
    },
  });
}

/* Страница: текст «Подхода» кончается на 1440 px документа, раздел «Опыт» — 1550…3850, заголовок на
   1600, три места работы (последнее кончается на 3800), шкала; заголовок «Проектов» — на 3960; окно
   1920×945. Позиции — числами: offsetTop без offsetParent и прямоугольник от прокрутки. Пещера — от
   чуть ниже 1440 до чуть выше 3960. Промежутки у соседей (160 px) нарочно далеки от удвоенного отступа
   раздела (100): так видно, что края пещеры взяты у соседей, а не достроены по разделу — при 120 px
   допуск «чуть ниже — 5…30 px» их не различал, и поломка «соседи не читаются» прошла. */
const PAGE = { secTop: 1550, secH: 2300, head: 1600, lastBottom: 3800, prevBottom: 1440, nextHead: 3960, vh: 945 };
// края пещеры на странице
PAGE.zone = core.zoneFrom(PAGE.prevBottom, PAGE.head, PAGE.lastBottom, PAGE.nextHead);
// тики цикла пещеры вручную: n кадров по 16 мс от t0; при загрузке первый тик ставит сцену сразу
function ticks(p, n, t0) { for (let i = 1; i <= n; i++) p.log.raf.splice(0).forEach(function (f) { f((t0 || 0) + 16 * i); }); }
function sandbox(opts) {
  const log = { inserted: 0, cls: new Set(), warns: [], raf: [], calls: [], flips: 0 };
  const win = { innerWidth: opts.width || 1920, innerHeight: 945, scrollY: opts.scrollY || 0 };
  function el(top, h, left, right, more) {
    return Object.assign({
      style: { setProperty: function () {} }, offsetTop: top, offsetHeight: h, offsetParent: null, isConnected: true,
      getBoundingClientRect: function () { return { top: top - win.scrollY, bottom: top + h - win.scrollY, left: left, right: right, width: right - left, height: h }; },
    }, more || {});
  }
  const jobs = [el(1700, 1200, 400, 1500), el(2900, 450, 400, 1500), el(3350, 450, 400, 1500)];
  const metas = [el(1700, 60, 400, 590), el(2900, 60, 400, 590), el(3350, 60, 400, 590)];
  const wrap = el(1550, 2300, 400, 1500);
  const head = el(1600, 50, 400, 1500);
  const timeline = el(1680, 40, 400, 1500);
  const prevWrap = el(PAGE.prevBottom - 500, 500, 400, 1500), nextHead = el(PAGE.nextHead, 50, 400, 1500);
  const section = el(1550, 2300, 0, 1920, {
    previousElementSibling: opts.noNeighbors ? null : { querySelector: function (s) { return s === '.wrap' ? prevWrap : null; } },
    nextElementSibling: opts.noNeighbors ? null : { querySelector: function (s) { return s === '.section__head' ? nextHead : null; } },
    querySelector: function (s) { return s === '.wrap' ? wrap : s === '.timeline' ? timeline : s === '.section__head' ? head : null; },
    querySelectorAll: function (s) { return s === '.job' ? jobs : s === '.job__meta' ? metas : []; },
  });
  const field = { parentNode: { insertBefore: function () { log.inserted += 1; } }, nextSibling: null };
  const calls = log.calls;
  const canvas = {
    style: {}, width: 0, height: 0, setAttribute: function () {}, addEventListener: function () {},
    getContext: function (type) { return type === 'webgl2' && !opts.noContext ? fakeGL(opts, calls) : null; },
  };
  const doc = {
    readyState: 'complete',
    getElementById: function (id) { return id === 'field' ? field : id === 'experience' ? section : id === 'app' ? {} : null; },
    createElement: function () { return canvas; },
    addEventListener: function () {},
    querySelectorAll: function () { return []; },
    documentElement: { classList: {   // flips — сколько раз офис гас и возвращался
      add: function () { for (const c of arguments) { if (c === 'cave-away' && !log.cls.has(c)) log.flips += 1; log.cls.add(c); } },
      remove: function () { for (const c of arguments) { if (c === 'cave-away' && log.cls.has(c)) log.flips += 1; log.cls.delete(c); } } } },
  };
  Object.assign(win, {
    document: doc, Math: Math, Float32Array: Float32Array, Array: Array, Object: Object, String: String, Number: Number,
    console: { warn: function () { log.warns.push(Array.prototype.join.call(arguments, ' ')); }, error: function () { log.warns.push('error'); }, log: function () {} },
    matchMedia: function (q) {
      const w = /min-width:\s*(\d+)px/.exec(q);
      return { matches: w ? win.innerWidth >= +w[1] : /reduce/.test(q) ? !!opts.less : false, addEventListener: function () {} };
    },
    requestIdleCallback: function (f) { f(); }, setTimeout: function (f) { f(); },
    requestAnimationFrame: function (f) { log.raf.push(f); return log.raf.length; }, cancelAnimationFrame: function () {},
    addEventListener: function () {}, performance: { now: function () { return 0; } },
  });
  if (opts.webgl2 !== false) win.WebGL2RenderingContext = function () {};
  win.window = win;
  vm.createContext(win);
  vm.runInContext(SRC, win, { filename: 'assets/js/cave.js' });
  return { win: win, log: log, canvas: canvas };
}

function untouched(p, tag) {
  if (p.log.inserted) fail(tag + ': холст вставлен');
  if (p.log.cls.size) fail(tag + ': классы ' + Array.from(p.log.cls));
  if (p.win.__cave) fail(tag + ': пещера завелась');
}

check('нет WebGL2 — пещеры нет, страница не тронута', function () {
  untouched(sandbox({ webgl2: false }), 'нет WebGL2');
});
check('WebGL2 без видеокарты (getContext отказывает) — пещеры нет, страница не тронута', function () {
  untouched(sandbox({ noContext: true }), 'без видеокарты');
});
check('шейдер не собрался — пещеры нет, страница не тронута, в консоли причина', function () {
  const p = sandbox({ badShader: true });
  untouched(p, 'шейдер');
  if (!p.log.warns.some(function (w) { return /шейдер не собрался/.test(w); })) fail('в консоли нет предупреждения: ' + p.log.warns.join(' | '));
  return p.log.warns[0];
});
check('окно 720 px — холст есть, но пещера выключена и класса нет', function () {
  const p = sandbox({ width: 720 });
  if (p.win.__cave.state() !== 'off') fail('состояние ' + p.win.__cave.state());
  if (p.log.cls.has('cave')) fail('класс cave поставлен');
  return 'состояние off';
});
check('широкое окно — пещера включена, края — по соседям, ворота по раскладке', function () {
  const p = sandbox({});
  if (p.win.__cave.state() !== 'on') fail('состояние ' + p.win.__cave.state());
  if (!p.log.cls.has('cave')) fail('нет класса cave');
  const z = zoneIs(p, PAGE.prevBottom, PAGE.nextHead, 'пещера');
  const want = core.gatesFrom(z[0], z[1] - z[0], PAGE.vh, [2900, 3350]).join();
  if (p.win.__cave.gates().join() !== want) fail('ворота ' + p.win.__cave.gates() + ' вместо ' + want);
  return 'пещера ' + z.join(' / ') + ', ворота [' + want + ']';
});
check('соседей нет — промежутки как удвоенные отступы раздела', function () {
  const z = zoneIs(sandbox({ noNeighbors: true }), 2 * PAGE.secTop - PAGE.head, 2 * (PAGE.secTop + PAGE.secH) - PAGE.lastBottom, 'без соседей');
  return 'пещера ' + z.join(' / ');
});
/* Края пещеры на странице (координаты документа) — по словам владельца, а не по числам из cave.js
   (проверка, взявшая числа у проверяемого файла, зеленеет на любой их поломке): начало — «ниже „Подхода“»,
   то есть на 5…30 px ниже его текста (inY); конец — «чуть выше „Собственных продуктов“», на 5…30 px выше
   заголовка (outY). */
function zoneIs(p, inY, outY, tag) {
  const z = p.win.__cave.zone(), sy = p.win.scrollY;
  const got = [z.darkTop, z.darkBot].map(function (v) { return Math.round((v + sy) * 1000) / 1000; });
  const bad = [];
  if (!(got[0] - inY >= 5 && got[0] - inY <= 30)) bad.push('пещера с ' + got[0] + ', а текст соседа кончается на ' + inY);
  if (!(outY - got[1] >= 5 && outY - got[1] <= 30)) bad.push('пещера до ' + got[1] + ' — заголовок следующего раздела на ' + outY);
  if (bad.length) fail(tag + ': ' + bad.join('; '));
  return got;
}
check('«уменьшить движение» — неподвижный кадр', function () {
  const p = sandbox({ less: true });
  if (p.win.__cave.state() !== 'static') fail('состояние ' + p.win.__cave.state());
  return 'состояние static';
});
check('кадр собирается: спрайты экземплярами, без ошибок', function () {
  const p = sandbox({ scrollY: 2600 });   // середина раздела в окне
  ticks(p, 1, 0);                         // загрузка посреди раздела — сцена сразу
  const f0 = p.win.__cave.frames(), notes = [];
  [4, 12, 20, C.Y1].forEach(function (cam) {
    p.log.calls.length = 0;
    p.win.__cave.render(1234, cam);
    const inst = p.log.calls.filter(function (c) { return c[0] === 'drawArraysInstanced'; });
    const pts = p.log.calls.filter(function (c) { return c[0] === 'drawArrays' && c[1] !== undefined && c[3] !== 3; });
    const full = p.log.calls.filter(function (c) { return c[0] === 'drawArrays' && c[3] === 3; });
    if (full.length !== 1) fail('камера ' + cam + ': проход стен ' + full.length + ' раз');
    if (!inst.length || !(inst[0][4] > 0)) fail('камера ' + cam + ': спрайтов не нарисовано');
    notes.push(cam + ': спрайтов ' + inst[0][4] + (pts.length ? ', снежинок ' + pts[0][3] : ''));
  });
  if (p.win.__cave.frames() - f0 !== 4) fail('кадров ' + (p.win.__cave.frames() - f0));
  if (p.log.warns.length) fail('в консоли: ' + p.log.warns.join(' | '));
  return notes.join('; ');
});
/* «Тише» (5.91; владелец: «пещера слишком большая, эффектов много» → «Тише нравится»): знаки из разломов не вылетают,
   снега нет, свет кристаллов не дышит, ход и предметы ближе к цвету фона; рыцарь и маг — как есть. Свет — по тому,
   что уходит в видеокарту (текстура огней), за 6 секунд. */
check('тише: знаки не вылетают, снега нет, свет кристаллов не дышит, ход и предметы ближе к цвету фона', function () {
  const p = sandbox({ scrollY: 2600 });
  ticks(p, 1, 0);
  const st0 = p.win.__cave.stats(), crystals = st0.lights - st0.rifts - p.win.__cave.chars().length;
  let most = 0, flakes = 0, moved = 0, first = null;
  for (let t = 0; t <= 6000; t += 100) {
    p.log.calls.length = 0;
    p.win.__cave.render(t, 15);
    most = Math.max(most, p.win.__cave.stats().parts);
    const pts = p.log.calls.filter(function (c) { return c[0] === 'drawArrays' && c[3] !== 3; });
    flakes += pts.length ? pts[0][3] : 0;
    const up = p.log.calls.filter(function (c) { return c[0] === 'texImage2D' && c[9] && c[9].length === C.MAXL * 2 * 4; }).pop();
    if (!up) continue;
    const li = Array.from(up[9]).slice(C.MAXL * 4, C.MAXL * 4 + crystals * 4).filter(function (v, i) { return i % 4 === 0; });
    if (first === null) first = li; else if (li.some(function (v, i) { return Math.abs(v - first[i]) > 1e-9; })) moved += 1;
  }
  const bad = [];
  if (!(crystals > 0)) bad.push('кристаллов нет');
  if (first === null) bad.push('огни в видеокарту не уходят');
  if (most) bad.push('знаков в полёте ' + most);
  if (flakes) bad.push('снежинок ' + flakes);
  if (moved) bad.push('свет кристаллов менялся в ' + moved + ' кадрах');
  const S = core.shaders;
  if (S.FS_TUBE.indexOf('finish(FOG + (c - FOG) * DIM, xs, ys)') < 0) bad.push('ход не ближе к цвету фона');
  if (S.FS_SPRITE.indexOf('finish(FOG + (col - FOG) * (vTone.a * DIM), xs, ys)') < 0) bad.push('предметы не ближе к цвету фона');
  if (!(C.CAVE_DIM > 0.5 && C.CAVE_DIM < 0.9)) bad.push('затемнение ' + C.CAVE_DIM);
  if (bad.length) fail(bad.join('; '));
  return 'кристаллов ' + crystals + ', за 6 с: знаков 0, снежинок 0, свет не менялся; ход и предметы — ×' + C.CAVE_DIM;
});

/* Смена во времени (5.91): прокрутили в раздел — пещера проступает за SCENE_MS, ушли — так же уходит; загрузка посреди
   раздела и «уменьшить движение» — сразу. Офис уходит на время сцены (смена прошла 0,3) и возвращается после неё
   (ниже 0,12); на месте не мигает. Цикл пещеры крутится вручную, кадр — 16 мс. */
check('смена во времени: около SCENE_MS туда и обратно; при загрузке и «уменьшить движение» — сразу; офис — на время сцены', function () {
  const bad = [];
  const inside = sandbox({ scrollY: 2600 });
  ticks(inside, 6, 0);
  if (inside.win.__cave.scene().v !== 1) bad.push('загрузка посреди раздела — сцена ' + inside.win.__cave.scene().v);
  if (!inside.log.cls.has('cave-away')) bad.push('посреди раздела офис виден');
  if (inside.log.flips > 1) bad.push('посреди раздела офис мигает');
  const above = sandbox({ scrollY: 5 });
  ticks(above, 6, 0);
  if (above.win.__cave.scene().v !== 0 || above.log.cls.has('cave-away')) bad.push('над разделом — сцена или офис погашен');
  // туда: от прокрутки до полной сцены; офис уходит, когда смена прошла 0,3
  const p = sandbox({ scrollY: 5 });
  ticks(p, 2, 0);
  p.win.scrollY = 2600;
  let tOn = null, awayAt = null, t = 32;
  for (let i = 0; i < 400 && tOn === null; i++) {
    t += 16;
    p.log.raf.splice(0).forEach(function (f) { f(t); });
    const v = p.win.__cave.scene().v;
    if (awayAt === null && p.log.cls.has('cave-away')) awayAt = v;
    if (v >= 1) tOn = t - 32;
  }
  if (tOn === null || Math.abs(tOn - C.SCENE_MS) > 48) bad.push('сцена включилась за ' + tOn + ' мс вместо ' + C.SCENE_MS);
  if (awayAt === null || awayAt < 0.3 || awayAt > 0.35) bad.push('офис ушёл на ходе ' + awayAt);
  // обратно: ушли из раздела — сцена гаснет за SCENE_MS, офис возвращается ниже 0,12
  p.win.scrollY = 5;
  const t1 = t;
  let tOff = null, backAt = null;
  for (let i = 0; i < 400 && tOff === null; i++) {
    t += 16;
    p.log.raf.splice(0).forEach(function (f) { f(t); });
    const v = p.win.__cave.scene().v;
    if (backAt === null && !p.log.cls.has('cave-away')) backAt = v;
    if (v <= 0) tOff = t - t1;
  }
  if (tOff === null || Math.abs(tOff - C.SCENE_MS) > 48) bad.push('сцена погасла за ' + tOff + ' мс');
  if (backAt === null || backAt > 0.12 || backAt < 0.07) bad.push('офис вернулся на ходе ' + backAt);
  if (p.log.flips !== 2) bad.push('офис переключался ' + p.log.flips + ' раз вместо 2');
  // «уменьшить движение»: сразу
  const less = sandbox({ scrollY: 5, less: true });
  ticks(less, 2, 0);
  less.win.scrollY = 2600;
  ticks(less, 1, 100);
  if (less.win.__cave.scene().v !== 1) bad.push('«уменьшить движение» — сцена ' + less.win.__cave.scene().v + ' через кадр');
  if (bad.length) fail(bad.join('; '));
  return 'туда ' + tOn + ' мс, обратно ' + tOff + ' мс; офис ушёл на ' + awayAt.toFixed(2) + ', вернулся на ' + backAt.toFixed(2) +
    '; при загрузке и «уменьшить движение» — сразу';
});

const failed = results.filter(function (r) { return !r.ok; }).length;
console.log('\nИтог: ' + results.length + ' проверок, ' + (failed ? failed + ' упало' : 'все зелёные'));
process.exit(failed ? 1 : 0);
