/* Пол и стены пиксельного офиса — варианты на выбор владельцу (14.10: «перерисуй стены и пол, предложи варианты»).
   Рисуют в пикселях рисунка: клетка t = 16, лицо стены — 32 ряда сверху вниз (кромка 4, лицо 24, низ 4).
   greybox.html: ?floor=<имя>&walls=<имя> и переключатели «Пол» / «Стены» (кнопки строятся отсюда).
   Рецепты П1–П3 и С1–С3 — сабагент «Дизайнер» 14.10, с поправкой по замеру Gemini (шов 2 точки, обводка стен).
   Рамка по замеру: тело пола 86–91 по яркости (под него подобраны стулья), лицо стены — тёплый беж ≈191;
   дерево (владелец: «пол во всех комнатах плюс-минус одного цвета»), тёмный пол и стены сайта, кирпич отброшены —
   на них сливаются стулья, диплом, аркада.

   floor.cell(g, X, Y, t, c) — клетка пола; c = { x, y, zone: 'os'|'mr'|'kt'|'rc'|'sr', zoneAt(x, y) };
     проём двери берёт зону комнаты, в которую ведёт. floor.mat(g, X, Y, w, h) — коврик у входа.
   wall.top — верх стены; wall.ol — обводка верха у пола (null — светлая кромка wall.edge, как было); wall.front —
   передний край кромки над лицом; wall.face(g, X0, Y0, w, c) — тело лица 28 рядов; c = { x, y, zone — комната перед
   стеной }; wall.shade — тень на полу под лицом: цвет или [[рядов, цвет], ...]; wall.side — тень справа от стены.
   Толщину стен (одну на все, владелец 14.10: «толщина стен должна быть одинаковой») задаёт greybox.html. */
(function () {
  'use strict';
  var OL = '#0e0e0f';   // обводка — как у предметов
  function rect(g, c, x, y, w, h) { g.fillStyle = c; g.fillRect(x, y, w, h); }
  function tileHash(tx, ty) {   // номер плитки → 0..15 (рецепт Дизайнера: без диагоналей и полос)
    var h = Math.imul(tx, 0x27d4eb2d) ^ Math.imul(ty + 0x9e37, 0x165667b1);
    h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
    return ((h ^ (h >>> 12)) >>> 0) % 16;
  }

  /* ---------- Пол. ---------- */
  function gemTile(g, X, Y, t) {   // П1: шов 2 точки по границе клеток (замер Gemini: тело 91, шов 99–102), тон плиток ±2
    var v = tileHash(X / t, Y / t);
    var body = v < 8 ? '#57585d' : v < 11 ? '#55565b' : v < 14 ? '#595a5f' : '#55585f';   // основа / темнее / светлее / холодная
    rect(g, '#616267', X, Y, t, t); rect(g, body, X + 1, Y + 1, t - 2, t - 2);
  }
  function plates(g, X, Y, t, P) {   // плиты 32×32 по абсолютным координатам: кромка сверху-слева, шов снизу-справа
    var tx = Math.floor(X / 32), ty = Math.floor(Y / 32), i0 = X % 32, j0 = Y % 32, v = tileHash(tx, ty);
    rect(g, v < 10 ? P.body : v < 13 ? P.dark : P.light, X, Y, t, t);
    if (i0 === 0) rect(g, P.edge, X, Y, 1, t);
    if (j0 === 0) rect(g, P.edge, X, Y, t, 1);
    if (i0 + t === 32) rect(g, P.seam, X + t - 1, Y, 1, t);
    if (j0 + t === 32) rect(g, P.seam, X, Y + t - 1, t, 1);
  }
  var SLATE = { body: '#545967', dark: '#525765', light: '#565b69', edge: '#5c6170', seam: '#484d5a' };
  var STONE = { body: '#58595e', dark: '#56575c', light: '#5a5b60', edge: '#606166', seam: '#4c4d52' };
  function carpet(g, X, Y, t) {   // ковровая плитка «вразворот»: полосы то по рядам, то по столбцам
    rect(g, '#54565c', X, Y, t, t);
    g.fillStyle = '#505258';
    var across = ((X / t + Y / t) & 1) === 0;
    for (var k = 3; k < t; k += 4) { if (across) g.fillRect(X, Y + k, t, 1); else g.fillRect(X + k, Y, 1, t); }
  }
  function raised(g, X, Y, t, perf) {   // фальшпол серверной: светлый верх-лево, тёмный низ-право, перфорация перед стойками
    rect(g, '#5a5b60', X, Y, t, t);
    rect(g, '#65666b', X, Y, t, 1); rect(g, '#65666b', X, Y, 1, t);
    rect(g, '#4c4d52', X, Y + t - 1, t, 1); rect(g, '#4c4d52', X + t - 1, Y, 1, t);
    if (perf) { g.fillStyle = '#4a4b50'; [3, 6, 9, 12].forEach(function (i) { [3, 6, 9, 12].forEach(function (j) { g.fillRect(X + i, Y + j, 1, 1); }); }); }
  }
  function matWarm(g, X, Y, w, h) { rect(g, '#5b4f43', X, Y, w, h); rect(g, '#6b5d4f', X + 1, Y + 1, w - 2, h - 2); }
  // --panel-2; бирюзовую кайму (--accent-dim) владелец снял 14.10: «подсветка выхода голубой рамкой выглядит странно»
  function matSite(g, X, Y, w, h) { rect(g, '#141926', X, Y, w, h); }
  var RACK_X = [48, 49, 51, 52, 54, 55, 57, 58];   // столбцы стоек серверной: перфорированы плиты в проходе перед ними

  var floors = {
    now: { name: 'как сейчас', cell: function (g, X, Y, t) {
      rect(g, '#57585d', X, Y, t, t); rect(g, '#5e6065', X + t - 1, Y, 1, t); rect(g, '#5e6065', X, Y + t - 1, t, 1);
    }, mat: function (g, X, Y, w, h) { rect(g, '#6b5d4f', X, Y, w, h); } },
    gem: { name: 'П1 плитка Gemini', cell: gemTile, mat: matWarm },
    slate: { name: 'П2 сланец сайта ✓', cell: function (g, X, Y, t) { plates(g, X, Y, t, SLATE); }, mat: matSite },
    zones: { name: 'П3 по комнатам', mat: matSite, cell: function (g, X, Y, t, c) {
      if (c.zone === 'os' || c.zone === 'mr') carpet(g, X, Y, t);
      else if (c.zone === 'kt') gemTile(g, X, Y, t);
      else if (c.zone === 'rc') plates(g, X, Y, t, STONE);
      else raised(g, X, Y, t, (c.y === 36 || c.y === 37) && RACK_X.indexOf(c.x) >= 0);
      // порожек: 1 точка по краю клетки, где сосед — пол другой комнаты
      g.fillStyle = '#707277';
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(function (d) {
        var z = c.zoneAt(c.x + d[0], c.y + d[1]);
        if (!z || z === c.zone) return;
        if (d[0] < 0) g.fillRect(X, Y, 1, t); else if (d[0] > 0) g.fillRect(X + t - 1, Y, 1, t);
        else if (d[1] < 0) g.fillRect(X, Y, t, 1); else g.fillRect(X, Y + t - 1, t, 1);
      });
    } },
  };

  /* ---------- Стены. ----------
     Верх стены (полосы и кромка над лицом) рисует greybox.html одной толщиной для всех стен (?wt=), с обводкой wall.ol
     по краю к полу; wall.top — его цвет, wall.front — нижний ряд кромки над лицом (передний край).
     wall.face(g, X0, Y0, w, c) — тело лица под кромкой: 28 рядов (лицо 24, тень и плинтус 4) шириной w от X0. */
  var SHADE = [[2, 'rgba(0,0,0,.16)'], [2, 'rgba(0,0,0,.08)']];   // тень под лицом — умножением, швы видны под ней
  var C1 = [[1, '#d4cdc1'], [15, '#c6beb1'], [6, '#c2baad'], [2, '#bcb4a7'], [1, '#b3ab9e'], [1, '#aaa295'], [1, '#8c8377'], [1, '#6e665b']];
  var C2 = [[1, '#d4cdc1'], [15, '#c6beb1'], [1, '#0b7a82'], [7, '#bdb5a8'], [1, '#b0a89b'], [1, '#a69e91'], [1, '#343d50'], [1, '#222838']];
  function rows(list) {   // тело лица из рядов [высота, цвет] сверху вниз, всего 28
    return function (g, X0, Y0, w) { var y = Y0; list.forEach(function (r) { rect(g, r[1], X0, y, w, r[0]); y += r[0]; }); };
  }
  var faceC1 = rows(C1);
  function bottom(g, X0, Y0, w, list) { rows(list)(g, X0, Y0 + 24, w); }   // ряды 24–27: тень над плинтусом и плинтус
  function kitchenTile(g, X0, Y0, w) {   // белая плитка «кабанчик» 8×4 со сдвигом на полплитки, узор по абсолютному X
    for (var f = 0; f < 24; f++) {
      var k = f >> 2, r = f & 3, sh = k & 1 ? 4 : 0;
      for (var i = 0; i < w; i++) {
        var m = (X0 + i + sh) % 8;
        rect(g, r === 3 || m === 7 ? '#cdc8bf' : r === 0 && m === 0 ? '#e9e6df' : '#dcd8cf', X0 + i, Y0 + f, 1, 1);
      }
    }
  }
  function brick(g, X0, Y0, w, P) {   // «кабанчик» 8×4 со сдвигом на полплитки в своих цветах: шов, плитка, блик
    for (var f = 0; f < 24; f++) {
      var k = f >> 2, r = f & 3, sh = k & 1 ? 4 : 0;
      for (var i = 0; i < w; i++) {
        var m = (X0 + i + sh) % 8;
        rect(g, r === 3 || m === 7 ? P.seam : r === 0 && m === 0 ? P.hi : P.tile, X0 + i, Y0 + f, 1, 1);
      }
    }
  }
  // цвета войлока переговорной на узоре кухни (владелец 14.10: «обои одинаковые, кирпич как на кухне, цвета переговорной»)
  var BRICK_MR = { tile: '#8a919e', seam: '#767d8a', hi: '#9aa1ad' };
  function felt(g, X0, Y0, w) {   // войлочные панели переговорной, стык раз в клетку
    rect(g, '#9aa1ad', X0, Y0, w, 1); rect(g, '#8a919e', X0, Y0 + 1, w, 23);
    for (var i = 0; i < w; i++) if ((X0 + i) % 16 === 15) rect(g, '#767d8a', X0 + i, Y0, 1, 24);
  }
  function blocks(g, X0, Y0, w) {   // крашеные бетонные блоки серверной 16×8
    for (var f = 0; f < 24; f++) {
      var k = f >> 3, r = f & 7, sh = k & 1 ? 8 : 0;
      for (var i = 0; i < w; i++) rect(g, r === 7 || (X0 + i + sh) % 16 === 15 ? '#95979b' : f === 0 ? '#b4b6ba' : '#a6a8ac', X0 + i, Y0 + f, 1, 1);
    }
  }

  var walls = {
    now: { name: 'как сейчас', top: '#2c2d32', edge: '#3a3c42', ol: null, front: '#25262b', shade: '#4b4c51',
      face: rows([[24, '#c6beb1'], [2, '#b3ab9e'], [2, '#7a7166']]) },
    c1: { name: 'С1 беж с объёмом', top: '#2c2d32', ol: '#1e1f23', front: '#303136', shade: SHADE, side: 'rgba(0,0,0,.08)', face: faceC1 },
    c2: { name: 'С2 нитка сайта', top: '#1b202b', ol: '#0f131c', front: '#2a3140', shade: SHADE, side: 'rgba(0,0,0,.08)', face: rows(C2) },
    c3: { name: 'С3 по комнатам', top: '#2c2d32', ol: '#1e1f23', front: '#303136', shade: SHADE, side: 'rgba(0,0,0,.08)',
      face: function (g, X0, Y0, w, c) {
        if (c.zone === 'kt') { kitchenTile(g, X0, Y0, w); bottom(g, X0, Y0, w, C1.slice(-4)); }
        else if (c.zone === 'mr') { felt(g, X0, Y0, w); bottom(g, X0, Y0, w, [[1, '#7c8390'], [1, '#737a87'], [1, '#5a5e66'], [1, '#3d4047']]); }
        else if (c.zone === 'sr') { blocks(g, X0, Y0, w); bottom(g, X0, Y0, w, [[1, '#9a9ca0'], [1, '#919397'], [1, '#4a4c52'], [1, '#333539']]); }
        else faceC1(g, X0, Y0, w);
      } },
  };
  walls.c4 = { name: 'С4 кирпич, цвета переговорной ✓', top: '#2c2d32', ol: '#1e1f23', front: '#303136', shade: SHADE, side: 'rgba(0,0,0,.08)',
    face: function (g, X0, Y0, w) { brick(g, X0, Y0, w, BRICK_MR); bottom(g, X0, Y0, w, [[1, '#7c8390'], [1, '#737a87'], [1, '#5a5e66'], [1, '#3d4047']]); } };
  var VOID = '#16181b';   // снаружи офиса — около фона страницы: при тонких стенах офис стоит планом на странице

  window.PIX_ROOMS = { floors: floors, walls: walls, VOID: VOID, OL: OL, rect: rect, rows: rows, tileHash: tileHash };
})();
