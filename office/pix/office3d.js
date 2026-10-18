/* 2.5D-офис — живое демо (16.10, ночь: владелец — «переход из такого офиса в 2.5D, как было в пещере, только это
   будет офис, чтобы переход был красивый и можно было по офису походить; все элементы такие же, и агенты ходили»;
   «делай живое демо: переход и прогулка — за Отто и свободная камера, с переключателем»).

   Как устроено. Плоский офис нарисован косой проекцией 45°: у каждого предмета есть «нога» (низ), и точка рисунка
   (x, y) — это точка на высоте (нога − y) над полом на глубине «ноги». Поэтому каждый рисунок встаёт вертикальной
   стоячей картинкой на свою ногу (как в Octopath Traveler), стены — объёмные коробки (лица и кромки — из того же слоя
   стен, что в плоском офисе), пол — тот же слой пола, тени предметов ложатся на пол. Камера смотрит сверху-спереди
   под 45°: без перспективы это изображение совпадает с плоским точка в точку. Переход: камера стартует почти без
   перспективы (узкий угол издалека, растяжение по вертикали как у плоского) — вид неотличим от плоского, — плавно
   включает перспективу и подлетает к Отто (или к середине — свободная камера); вертикальные стены вырастают из пола.
   Порядок — буфер глубины: стоячая картинка у стены закрыта стеной перед ней, сидящий за столом — столом.

   Данные — от greybox.html (host): сцена (пол, слой стен, предметы с картинками и «ногами»), кадр (агенты, живые
   экраны, пузыри), управление Отто, открытие окна предмета. Рисует WebGL2; без WebGL2 вход не показывается.
   Office3D.supported(), .enter(host, mode), .exit(), .setMode(mode), .on(). */
(function () {
  'use strict';
  var VS = '#version 300 es\n' +
    'in vec3 aPos; in vec2 aUv; in float aShade; uniform mat4 uVP; out vec2 vUv; out float vShade; out float vW;\n' +
    'void main() { vec4 c = uVP * vec4(aPos, 1.0); gl_Position = c; vUv = aUv; vShade = aShade; vW = c.w; }';
  var FS = '#version 300 es\nprecision mediump float;\n' +
    'uniform sampler2D uTex; uniform float uCut; uniform vec3 uFog; uniform vec2 uFogR; uniform float uFogK; uniform float uMul;\n' +
    'in vec2 vUv; in float vShade; in float vW; out vec4 o;\n' +
    'void main() { vec4 t = texture(uTex, vUv); if (t.a < uCut) discard;\n' +
    '  float f = clamp((vW - uFogR.x) / max(1.0, uFogR.y - uFogR.x), 0.0, 1.0) * uFogK;\n' +
    '  o = vec4(mix(min(t.rgb * vShade * uMul, vec3(1.0)), uFog, f), t.a); }';
  var FOG = [0.07, 0.075, 0.09];
  var HOT_MUL = 1.3;   // наведение: предмет светлее целиком
  var DEG = Math.PI / 180, PITCH0 = 45, PITCH1 = 35;   // наклон камеры: в начале 45° (как плоский), в конце ниже — пол уходит вдаль
  // Вертикаль растянута на 1 / cos(наклона): стоячие картинки — с квадратными точками при любом наклоне (при 45° и узком
  // угле это ровно плоский офис). Без растяжения (честная камера под 45°) всё сплющено по высоте до 0,71 — точки рисунка
  // становятся плоскими прямоугольниками (первый прогон 16.10: агенты и столы «лежали»).
  var S0 = { fov: 0.1 };   // начало перехода: почти без перспективы (при 1,5° края уезжали на 6–8 точек экрана от плоского)
  var END = { otto: 210, free: 330 }, FOV1 = 28;        // конец: видимая высота у цели (точки мира) и угол обзора, °
  var TRANS_S = 1.7, RM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  var gl = null, cv = null, hud = null, host = null, prog = null, U = {}, raf = 0, on = false, mode = 'otto';
  var scene = null, sceneV = -1, texCache = new WeakMap(), white = null, blobTex = null;
  var cam = { s: 0, dir: 0, target: [512, 0, 320], H: 452.5, follow: [512, 320] }, keys = {}, last = 0;
  var drag = null, hover = null, near = null, onExit = null, lastStat = null;
  /* Что поверх 2.5D (18.10: «не хочу, чтобы была кнопка „Выйти в план“ и управление в режиме 2.5D — нужно сделать что-то
     другое или убрать вовсе»; пузырь над Отто показан и снят: «не нравится, убери пузырь этот. Сделай кнопки сверху»;
     из трёх видов кнопок владелец взял первый: «клавиши сверху, только давай снизу сделаем»), host.hud():
     'keys' — пиксельные клавиши «Аркады» ESC, E и стрелки в ряд у нижнего края по середине, без надписей. Нажимаются
              мышью (ESC — выход, E — открыть то, что рядом, стрелка — идти, пока держишь) и «нажимаются» с клавиатуры
              (PixKeys по data-code); E тускнеет, когда рядом ничего нет. Выход — и шагом Отто на коврик у входа (через него
              и вошли), и нажатием на коврик;
     'bar'  — как было: панель «Офис | Выйти в план» и строка управления (для сравнения в демо). */
  var hudMode = 'bar', wasMat = false, padDir = null;

  function supported() {
    try { var c = document.createElement('canvas'); return !!c.getContext('webgl2'); } catch (e) { return false; }
  }
  // ---------- математика ----------
  function persp(fovy, asp, n, f) {
    var t = 1 / Math.tan(fovy / 2), nf = 1 / (n - f);
    return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) * nf, -1, 0, 0, 2 * f * n * nf, 0];
  }
  function look(e, c, up) {
    var z = norm([e[0] - c[0], e[1] - c[1], e[2] - c[2]]), x = norm(cross(up, z)), y = cross(z, x);
    return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1];
  }
  function mul(a, b) {   // a·b, столбцы
    var r = new Array(16);
    for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) {
      r[j * 4 + i] = a[i] * b[j * 4] + a[4 + i] * b[j * 4 + 1] + a[8 + i] * b[j * 4 + 2] + a[12 + i] * b[j * 4 + 3];
    }
    return r;
  }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function norm(a) { var l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function smooth(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  // ---------- WebGL ----------
  function shader(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function initGL() {
    cv = document.createElement('canvas'); cv.className = 'o3d';
    gl = cv.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: false });
    if (!gl) return false;
    prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
    gl.bindAttribLocation(prog, 0, 'aPos'); gl.bindAttribLocation(prog, 1, 'aUv'); gl.bindAttribLocation(prog, 2, 'aShade');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    ['uVP', 'uTex', 'uCut', 'uFog', 'uFogR', 'uFogK', 'uMul'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
    U.vao = gl.createVertexArray(); U.buf = gl.createBuffer();
    gl.bindVertexArray(U.vao); gl.bindBuffer(gl.ARRAY_BUFFER, U.buf);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 24, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 24, 20);
    var w = document.createElement('canvas'); w.width = w.height = 1; var wg = w.getContext('2d'); wg.fillStyle = '#fff'; wg.fillRect(0, 0, 1, 1);
    white = w;
    var b = document.createElement('canvas'); b.width = 16; b.height = 6; var bg = b.getContext('2d');   // мягкая тень под агентом
    for (var y = 0; y < 6; y++) for (var x = 0; x < 16; x++) {
      var d = Math.hypot((x + 0.5 - 8) / 8, (y + 0.5 - 3) / 3);
      if (d < 1) { bg.fillStyle = 'rgba(0,0,0,' + (0.32 * (1 - d * d)).toFixed(3) + ')'; bg.fillRect(x, y, 1, 1); }
    }
    blobTex = b;
    return true;
  }
  function tex(c, key) {   // текстура холста: одна на холст; key — содержимое холста меняется (живой экран)
    var e = texCache.get(c);
    if (e && (key === undefined || e.key === key)) return e.t;
    var t = e ? e.t : gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    texCache.set(c, { t: t, key: key });
    return t;
  }
  // квад: точки p0..p3 (по кругу), uv u0..u3, тень (множитель цвета)
  function quad(a, p, uv, sh) {
    [0, 1, 2, 0, 2, 3].forEach(function (i) { a.push(p[i][0], p[i][1], p[i][2], uv[i][0], uv[i][1], sh); });
  }
  function draw(arr, texture, cut) {
    if (!arr.length) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, U.buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STREAM_DRAW);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1f(U.uCut, cut);
    gl.drawArrays(gl.TRIANGLES, 0, arr.length / 6);
  }

  // ---------- сцена: пол с тенями, стены, предметы ----------
  /* Части рисунка (данные хозяина, items[].parts): точка достаётся первой части, в чей прямоугольник попала; тень
     (полупрозрачные точки) — на пол. 'stand' — стоя: высоты от ноги F (точка (x, r) — на высоте F − r), плоскость — на
     глубине Z (по умолчанию F; у кресел ниже ноги — стойка достаёт до лежачей крестовины); ext — толщина (силуэт
     выдавлен назад), caps — верх толщины (false — нет: сверху лежит своя часть), cap — точка рисунка цветом верха;
     seat — сиденье за спинкой {x: [x0, x1], h, d, col: [x, y], legs: строка} с копией ножек у его края. 'flat' — лёжа на
     высоте h, side — бока до h − side, deep — верх продлён назад цветом первой строки (рисунок неглубокий). */
  function layersOf(img, it, P) {
    var w = img.width, h = img.height, d = img.getContext('2d').getImageData(0, 0, w, h).data;
    var shad = new ImageData(w, h), own = new Int16Array(w * h).fill(-2), bottom = -1;
    var defs = (P && P.parts) || [], L = defs.map(function (q) { return Object.assign({}, q); });
    var D = P && P.flat != null ? { m: 'flat', h: P.flat } : { m: 'stand', F: P && P.def != null ? P.def : null, Z: P && P.defZ, ext: P && P.ext, caps: P && P.caps, cap: P && P.cap };
    L.push(D);
    L.forEach(function (q) { q.data = new ImageData(w, h); q.mask = new Uint8Array(w * h); q.n = 0; });
    var inR = function (q, sx, sy) { return !q.r || q.r.some(function (R) { return sx >= R[0] && sx < R[2] && sy >= R[1] && sy < R[3]; }); };
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var i = y * w + x, a = d[i * 4 + 3];
      if (!a) continue;
      if (a < 0x60) { for (var c = 0; c < 4; c++) shad.data[i * 4 + c] = d[i * 4 + c]; continue; }
      bottom = Math.max(bottom, y);
      var k = 0; while (k < L.length - 1 && !inR(L[k], x, y)) k++;
      var q = L[k]; own[i] = k; q.mask[i] = 1; q.n++;
      for (c = 0; c < 4; c++) q.data.data[i * 4 + c] = d[i * 4 + c];
    }
    // дыры лежачей части (под мониторами, техникой) — ближайшей точкой той же части в строке
    L.forEach(function (q, k) {
      if (!q.fill) return;
      var orig = q.mask.slice();
      q.r.forEach(function (R) {
        for (var y = Math.max(0, R[1]); y < Math.min(h, R[3]); y++) for (var x = Math.max(0, R[0]); x < Math.min(w, R[2]); x++) {
          var i = y * w + x;
          if (orig[i] || own[i] < 0 || own[i] >= k) continue;
          for (var dd = 1; dd < w; dd++) {
            var s = x - dd >= 0 && orig[i - dd] ? i - dd : x + dd < w && orig[i + dd] ? i + dd : -1;
            if (s < 0) continue;
            for (var c = 0; c < 4; c++) q.data.data[i * 4 + c] = q.data.data[s * 4 + c];
            q.mask[i] = 1; break;
          }
        }
      });
    });
    // столбец цвета боков: у края, но не тёмная обводка (бока цветом обводки читались чёрными полосами)
    var lum = function (x, y) { if (x < 0 || x >= w || y < 0 || y >= h) return 0; var i = (y * w + x) * 4; return d[i + 3] < 0x60 ? 0 : 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]; };
    var sideCol = function (R, k, left) {
      var y = Math.min(h - 1, R[3] + Math.floor(k / 2));
      for (var s = 0; s < 4; s++) { var x = left ? R[0] + s : R[2] - 1 - s; if (lum(x, y) > 45) return x; }
      return left ? R[0] + 1 : R[2] - 2;
    };
    // тень на полу — сплошной строкой: в плане её прерывают стоячие части (кресла перед столом, ножки), а в 2.5D они
    // стоят в своей плоскости, и дыры по их форме лежали на полу отдельной зубчатой «тенью» (17.10: «у стульев тень
    // какая-то»). Промежуток до 24 точек между точками тени, весь из точек стоячих частей, — цветом тени слева
    for (var y2 = 0; y2 < h; y2++) {
      var last = -1;
      for (var x2 = 0; x2 < w; x2++) {
        var j2 = y2 * w + x2;
        if (shad.data[j2 * 4 + 3]) {
          if (last >= 0 && x2 - last > 1 && x2 - last <= 25) {
            var ok = true;
            for (var g2 = last + 1; g2 < x2 && ok; g2++) { var o2 = own[y2 * w + g2]; ok = o2 >= 0 && L[o2].m === 'stand'; }
            if (ok) for (g2 = last + 1; g2 < x2; g2++) for (var c2 = 0; c2 < 4; c2++) shad.data[(y2 * w + g2) * 4 + c2] = shad.data[(y2 * w + last) * 4 + c2];
          }
          last = x2;
        }
      }
    }
    var sh = document.createElement('canvas'); sh.width = w; sh.height = h; sh.getContext('2d').putImageData(shad, 0, 0);
    // нога стоячей части по умолчанию — нога предмета, но не выше нижней плотной точки (тело — над полом)
    var Fdef = Math.max(it.F, it.y + bottom + 1);
    var layers = [];
    L.forEach(function (q) {
      if (!q.n && !q.fill) return;
      if (q.m === 'skip') return;   // точки заняты частью, но не рисуются (строки рисунка, которым в объёме места нет)
      var cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d').putImageData(q.data, 0, 0);
      var Fw = q.m === 'stand' ? (q.F != null ? it.y + q.F : Fdef) : null;
      var lay = { m: q.m, Fw: Fw, Zw: q.m === 'stand' ? (q.Z != null ? it.y + q.Z : Fw) : null, h: q.h, c: cv, mask: q.mask, n: q.n,
        x: it.x, y: it.y, w: w, h0: h, side: q.side, deep: q.deep || 0, r: q.r, def: q === D, cap: q.cap || null };
      if (q.side) lay.cols = q.r.map(function (R) { return [sideCol(R, q.side, true), sideCol(R, q.side, false)]; });
      if (q.m === 'stand' && q.ext) lay.ext = extrude(lay, q.ext, q.caps !== false, q.cap ? (q.cap[1] + 0.5) / h : null, q.cap ? (q.cap[0] + 0.5) / w : null);
      if (q.boxes) lay.boxes = q.boxes.map(function (B) {
        var T = B.top || B.col;   // верх — своим цветом (светлая кромка сиденья), бока — цветом col
        return { x0: it.x + B.x[0], x1: it.x + B.x[1], lo: B.h[0], hi: B.h[1], z0: it.y + B.z[0], z1: it.y + B.z[1], u: (B.col[0] + 0.5) / w, v: (B.col[1] + 0.5) / h, tu: (T[0] + 0.5) / w, tv: (T[1] + 0.5) / h };
      });
      layers.push(lay);
      if (q.m === 'stand' && q.seat) {   // сиденье за спинкой (у стула спиной к нам рисунок его не показывает) и ножки у его края
        var S = q.seat;
        // верх — цветом точки col, перёд и бока толщиной t — цветом точки side (по умолчанию col)
        var Sd0 = S.side || S.col;
        lay.seat = { x0: it.x + S.x[0], x1: it.x + S.x[1], h: S.h, t: S.t || 0, z0: lay.Zw - S.d, z1: lay.Zw, u: (S.col[0] + 0.5) / w, v: (S.col[1] + 0.5) / h,
          su: (Sd0[0] + 0.5) / w, sv: (Sd0[1] + 0.5) / h };
        var ld = new ImageData(w, h);
        for (var i = S.legs * w; i < w * h; i++) if (q.mask[i]) for (var c = 0; c < 4; c++) ld.data[i * 4 + c] = q.data.data[i * 4 + c];
        var lc = document.createElement('canvas'); lc.width = w; lc.height = h; lc.getContext('2d').putImageData(ld, 0, 0);
        layers.push({ m: 'back', Fw: Fw, z: lay.Zw - S.d + 0.5, c: lc, mask: new Uint8Array(w * h), n: 0, x: it.x, y: it.y, w: w, h0: h });
      }
    });
    // задние ножки: копия ножек (строки с P.back стоячей части по умолчанию) у заднего края столешницы — в косой проекции
    // их не видно за столешницей, в 2.5D сбоку стол без них висел в воздухе
    // столешница — самая большая лежачая часть (не первая по списку: у столов первой стала лежачее сиденье дальних стульев,
    // и копии ножек вставали у его края — стойками между стульями, аудит 17.10)
    var dl = layers.filter(function (q) { return q.def && q.m === 'stand'; })[0];
    var fl = layers.filter(function (q) { return q.m === 'flat' && q.r; }).sort(function (p, q) { return q.n - p.n; })[0];
    if (P && P.back != null && dl && fl) {
      var bd = new ImageData(w, h), src = dl.c.getContext('2d').getImageData(0, 0, w, h).data;
      for (var i2 = P.back * w; i2 < w * h; i2++) for (var c2 = 0; c2 < 4; c2++) bd.data[i2 * 4 + c2] = src[i2 * 4 + c2];
      var bc = document.createElement('canvas'); bc.width = w; bc.height = h; bc.getContext('2d').putImageData(bd, 0, 0);
      var zb = it.y + Math.min.apply(null, fl.r.map(function (R) { return R[1]; })) + fl.h + 0.5;   // задний край столешницы
      layers.push({ m: 'back', Fw: dl.Fw, z: zb, c: bc, mask: new Uint8Array(w * h), n: 0, x: it.x, y: it.y, w: w, h0: h });
    }
    return { shad: sh, layers: layers };
  }
  /* Толщина стоячей части: силуэт выдавлен назад на d от плоскости Zw — бока у левого и правого края каждой строки
     (строки с одним краем — одним куском), верх у верхней точки каждого столбца (caps). Цвет боков — точка рядом с
     краем (край — тёмная обводка), верха — точка cap или вторая сверху */
  function extrude(q, d, caps, capV, capU) {
    var w = q.w, h = q.h0, m = q.mask, A = [], F = q.Fw, z1 = q.Zw, z0 = z1 - d;
    // бок — по краю точек в строке. У части с прямоугольниками — у каждого куска строки (17.10, вечер: у кресел у торцов
    // обе спинки — одна часть, и бок строился только по крайним точкам строки — у спинок не было граней к столу, «справа
    // спинки нет»); у части по умолчанию — по крайней точке, как раньше (щели между ножками и колёсами без стенок)
    var perRun = !!q.r;
    var edge = function (side) {
      var runs = [], open = {};
      for (var j = 0; j < h; j++) {
        var es = [], next = {};
        if (perRun) {
          for (var i = 0; i < w; i++) {
            var nb = side < 0 ? i - 1 : i + 1;
            if (m[j * w + i] && !(nb >= 0 && nb < w && m[j * w + nb])) es.push(i);
          }
        } else {
          for (var i2 = 0; i2 < w; i2++) { var ii = side < 0 ? i2 : w - 1 - i2; if (m[j * w + ii]) { es.push(ii); break; } }
        }
        es.forEach(function (e) {
          var r0 = open[e];
          if (r0 && r0.j1 === j - 1) r0.j1 = j; else { r0 = { e: e, j0: j, j1: j }; runs.push(r0); }
          next[e] = r0;
        });
        open = next;
      }
      runs.forEach(function (r) {
        var ein = r.e - side, ok = ein >= 0 && ein < w;
        for (var jj = r.j0; ok && jj <= r.j1; jj++) ok = !!m[jj * w + ein];
        var X = q.x + r.e + (side > 0 ? 1 : 0), ya = F - (q.y + r.j0), yb = F - (q.y + r.j1 + 1), u = ((ok ? ein : r.e) + 0.5) / w, va = r.j0 / h, vb = (r.j1 + 1) / h;
        if (side < 0) quad(A, [[X, ya, z0], [X, ya, z1], [X, yb, z1], [X, yb, z0]], [[u, va], [u, va], [u, vb], [u, vb]], 0.74);
        else quad(A, [[X, ya, z1], [X, ya, z0], [X, yb, z0], [X, yb, z1]], [[u, va], [u, va], [u, vb], [u, vb]], 0.86);
      });
    };
    edge(-1); edge(1);
    if (!caps) return A;
    var runs = [], cur = null;
    for (var i = 0; i < w; i++) {
      var top = -1;
      for (var j = 0; j < h; j++) if (m[j * w + i]) { top = j; break; }
      if (cur && cur.t === top && top >= 0) cur.i1 = i; else { if (cur) runs.push(cur); cur = top >= 0 ? { t: top, i0: i, i1: i } : null; }
    }
    if (cur) runs.push(cur);
    runs.forEach(function (r) {
      var ok = r.t + 1 < h;
      for (var ii = r.i0; ok && ii <= r.i1; ii++) ok = !!m[(r.t + 1) * w + ii];
      var Y = F - (q.y + r.t), xa = q.x + r.i0, xb = q.x + r.i1 + 1, v = capV != null ? capV : ((ok ? r.t + 1 : r.t) + 0.5) / h;
      var ua = capU != null ? capU : r.i0 / w, ub = capU != null ? capU : (r.i1 + 1) / w;
      quad(A, [[xa, Y, z0], [xb, Y, z0], [xb, Y, z1], [xa, Y, z1]], [[ua, v], [ub, v], [ub, v], [ua, v]], 0.95);
    });
    return A;
  }
  function buildScene() {
    var s = host.scene();
    sceneV = s.v;
    var floor = document.createElement('canvas'); floor.width = s.aw; floor.height = s.ah;
    var fg = floor.getContext('2d'); fg.drawImage(s.bg, 0, 0);
    var items = s.items.map(function (it) {
      var a = layersOf(it.img, it, it.parts);
      fg.drawImage(a.shad, it.x, it.y);
      return { x: it.x, y: it.y, F: it.F, L: a.layers, full: it.img, spot: it.spot, key: it.key, spr: it.spr };
    });
    // стены: лица (горизонтальные) — коробки толщиной Th, высотой лица; вертикальные полосы — коробки Tv, вырастают
    var Hw = s.tall - s.Th, longest = s.segs.reduce(function (m, g) { return g.x1 - g.x0 > (m ? m.x1 - m.x0 : 0) ? g : m; }, null);
    // вертикальные полосы: соседние по ряду клетки с одной глубиной — одна коробка (иначе вдоль верхней коробки офиса
    // встаёт гребёнка из 64 столбиков, первый прогон 16.10); затем соседние по столбцу — одна коробка: стена из
    // кусков по клетке читалась отдельными столбиками со щелями (16.10, ночь: «стены странные»)
    var strips = [];
    s.strips.slice().sort(function (p, q) { return p.y - q.y || p.y0 - q.y0 || p.y1 - q.y1 || p.x - q.x; }).forEach(function (st) {
      var m = strips[strips.length - 1];
      if (m && m.y === st.y && m.y0 === st.y0 && m.y1 === st.y1 && m.cx + 1 === st.x) { m.x1 = st.x1; m.cx = st.x; }
      else strips.push({ y: st.y, y0: st.y0, y1: st.y1, x0: st.x1 - s.Tv, x1: st.x1, cx: st.x });
    });
    var cols = [];
    strips.sort(function (p, q) { return p.x0 - q.x0 || p.x1 - q.x1 || p.y0 - q.y0; }).forEach(function (st) {
      var m = cols[cols.length - 1];
      if (m && m.x0 === st.x0 && m.x1 === st.x1 && Math.abs(m.y1 - st.y0) < 0.5) m.y1 = Math.max(m.y1, st.y1);
      else cols.push({ y: st.y, y0: st.y0, y1: st.y1, x0: st.x0, x1: st.x1 });
    });
    // верхняя коробка за лицами верхней стены (ряд 0): в плане она за краем кадра, в 2.5D вставала второй стеной позади
    // (17.10: «в опенспейсе какая-то вторая стена сверху») — не ставим
    cols = cols.filter(function (st) { return !(st.y === 0 && st.y1 <= s.Th * 2 + 0.5); });
    // свободный верх вертикальной стены, к которой сбоку примыкает поперечная, — вровень с задней гранью поперечной: полоса
    // начинается от верха клетки, а коробка лица — на Th ниже, и стена торчала столбиком за поперечной (17.10: «косяк у
    // стены» — у ресепшена на 8; у стен, упирающихся в верхнюю, на 12 — их прятала снятая «вторая стена»)
    cols.forEach(function (st) {
      var over = function (q) { return q.x0 < st.x1 && q.x1 > st.x0; };
      if (cols.some(function (q) { return q !== st && over(q) && Math.abs(q.y1 - st.y0) < 0.5; }) ||
        (s.joins || []).some(function (j) { return over(j) && Math.abs(j.y1 - st.y0) < 0.5; }) ||
        s.segs.some(function (g) { return over(g) && Math.abs(g.G - st.y0) < 0.5; })) return;
      var backs = s.segs.filter(function (g) {
        var b = g.G - s.Th;
        return (Math.abs(g.x0 - st.x1) < 0.5 || Math.abs(g.x1 - st.x0) < 0.5) && b > st.y0 + 0.5 && b - st.y0 < 24.5 && b < st.y1;
      }).map(function (g) { return g.G - s.Th; });
      if (backs.length) st.y0 = Math.min.apply(null, backs);
    });
    // верх стен: полоска 8 точек — обводка, верх ×6, обводка (кладётся поперёк короткой стороны коробки)
    var tp = document.createElement('canvas'); tp.width = 8; tp.height = 1; var tg = tp.getContext('2d');
    tg.fillStyle = s.wallTop || '#26272c'; tg.fillRect(0, 0, 8, 1); tg.fillStyle = s.wallOl || '#141416'; tg.fillRect(0, 0, 1, 1); tg.fillRect(7, 0, 1, 1);
    scene = { aw: s.aw, ah: s.ah, floor: floor, fg: s.fg, bg: s.bg, segs: s.segs, strips: cols, joins: s.joins || [], Th: s.Th, Tv: s.Tv, tall: s.tall, topTex: tp,
      Hw: Hw, brick: longest, items: items };
  }
  function wallGeom(rise) {   // [меш с лицами из слоя стен, меш с верхами полос из слоя пола]
    var S = scene, A = [], B = [], fw = S.fg.width, fh = S.fg.height, Hw = S.Hw, Th = S.Th, tall = S.tall;
    var uvF = function (x, y) { return [x / fw, y / fh]; };
    var br = S.brick, brickUV = function (u0, u1, row0, row1) {   // кусок кирпичного лица для боков: длина по самому длинному лицу
      var L = br.x1 - br.x0, x0 = br.x0 + (u0 % L), x1 = Math.min(br.x1, x0 + (u1 - u0));
      return [uvF(x0, br.G - Hw + row0), uvF(x1, br.G - Hw + row0), uvF(x1, br.G - Hw + row1), uvF(x0, br.G - Hw + row1)];
    };
    S.segs.forEach(function (g) {
      var x0 = g.x0, x1 = g.x1, z1 = g.G, z0 = g.G - Th;
      quad(A, [[x0, Hw, z1], [x1, Hw, z1], [x1, 0, z1], [x0, 0, z1]], [uvF(x0, g.G - Hw), uvF(x1, g.G - Hw), uvF(x1, g.G), uvF(x0, g.G)], 1);   // лицо
      quad(A, [[x0, Hw, z0], [x1, Hw, z0], [x1, Hw, z1], [x0, Hw, z1]], [uvF(x0, g.G - tall), uvF(x1, g.G - tall), uvF(x1, g.G - tall + Th), uvF(x0, g.G - tall + Th)], 1);   // кромка
      quad(A, [[x0, Hw, z0], [x0, Hw, z1], [x0, 0, z1], [x0, 0, z0]], brickUV(z0, z1, 0, Hw), 0.72);   // торцы — кирпичом, как бока полос
      quad(A, [[x1, Hw, z1], [x1, Hw, z0], [x1, 0, z0], [x1, 0, z1]], brickUV(z0, z1, 0, Hw), 0.86);
    });
    var h = Hw * rise;
    var topQuad = function (x0, x1, z0, z1) {   // обводка — по длинным краям
      var across = x1 - x0 <= z1 - z0;
      quad(B, [[x0, h, z0], [x1, h, z0], [x1, h, z1], [x0, h, z1]], across ? [[0, 0.5], [1, 0.5], [1, 0.5], [0, 0.5]] : [[0, 0.5], [0, 0.5], [1, 0.5], [1, 0.5]], 1);
    };
    S.joins.forEach(function (j) {
      var x0 = j.x0, x1 = j.x1, z0 = j.y0, z1 = j.y1;
      topQuad(x0, x1, z0, z1);
      if (h > 0.5) {
        var r0 = Hw - h;
        quad(A, [[x0, h, z1], [x0, h, z0], [x0, 0, z0], [x0, 0, z1]], brickUV(z0, z1, r0, Hw), 0.72);
        quad(A, [[x1, h, z0], [x1, h, z1], [x1, 0, z1], [x1, 0, z0]], brickUV(z0, z1, r0, Hw), 0.9);
      }
    });
    S.strips.forEach(function (st) {
      var x1 = st.x1, x0 = st.x0, z0 = st.y0, z1 = st.y1;
      topQuad(x0, x1, z0, z1);   // верх — цветом верха стен плана (слой пола у концов стен — пол: там в плане верх закрыт кромкой лица)
      if (h > 0.5) {
        var L = z1 - z0, r0 = Hw - h;
        quad(A, [[x0, h, z1], [x0, h, z0], [x0, 0, z0], [x0, 0, z1]], brickUV(z0, z0 + L, r0, Hw), 0.72);   // западный бок
        quad(A, [[x1, h, z0], [x1, h, z1], [x1, 0, z1], [x1, 0, z0]], brickUV(z0, z0 + L, r0, Hw), 0.9);    // восточный бок
        quad(A, [[x0, h, z1], [x1, h, z1], [x1, 0, z1], [x0, 0, z1]], brickUV(x0, x1, r0, Hw), 1);          // южный торец
      }
    });
    return [A, B];
  }
  // стоячая картинка: прямоугольник рисунка (x, y, w, h) на ноге z — точка (px, py) рисунка на высоте z − py
  function standee(arr, x, y, w, h, z, u0, v0, u1, v1) {
    quad(arr, [[x, z - y, z], [x + w, z - y, z], [x + w, z - y - h, z], [x, z - y - h, z]], [[u0, v0], [u1, v0], [u1, v1], [u0, v1]], 1);
  }

  // ---------- камера ----------
  function camState() {
    var s = ease(cam.s), fov = lerp(S0.fov, FOV1, s) * DEG, pitch = lerp(PITCH0, PITCH1, s) * DEG, yS = 1 / Math.cos(pitch);
    // холст — во всё окно; в начале перехода офис (452,5 видимой высоты) занимает свой прямоугольник страницы:
    // видимая высота окна больше во столько, во сколько окно выше офиса, и середина сдвинута к середине офиса
    var r = host.rect(), Wc = window.innerWidth, Hc = window.innerHeight, k0 = Math.max(0.05, r.height / Hc);
    var Hend = END[mode], H = Math.exp(lerp(Math.log(452.5 / k0), Math.log(cam.H || Hend), s));
    var ox = ((r.left + r.width / 2) / Wc * 2 - 1) * (1 - s), oy = (1 - (r.top + r.height / 2) / Hc * 2) * (1 - s);
    var tg = [lerp(512, cam.follow[0], s), 0, lerp(320, cam.follow[1], s)];
    var D = H / (2 * Math.tan(fov / 2));
    var eye = [tg[0], D * Math.sin(pitch), tg[2] + D * Math.cos(pitch)];
    var asp = Wc / Hc * yS, Pm = persp(fov, asp, Math.max(1, D - 1100), D + 1100);
    var Off = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, ox, oy, 0, 1];   // сдвиг в пространстве отсечения: x' = x + ox·w
    return { s: s, eye: eye, tg: tg, D: D, pitch: pitch, yS: yS, ox: ox, oy: oy, VP: mul(Off, mul(Pm, look(eye, tg, [0, 1, 0]))), fov: fov, asp: asp };
  }
  function rayAt(cs, mx, my) {   // луч из камеры через точку холста (0..1)
    var nx = mx * 2 - 1 - cs.ox, ny = 1 - my * 2 - cs.oy, t = Math.tan(cs.fov / 2);
    var f = norm([cs.tg[0] - cs.eye[0], cs.tg[1] - cs.eye[1], cs.tg[2] - cs.eye[2]]), r = norm(cross(f, [0, 1, 0])), u = cross(r, f);
    var d = norm([f[0] + r[0] * nx * t * cs.asp + u[0] * ny * t, f[1] + r[1] * nx * t * cs.asp + u[1] * ny * t, f[2] + r[2] * nx * t * cs.asp + u[2] * ny * t]);
    return { o: cs.eye, d: d };
  }

  // ---------- кадр ----------
  function place() {   // холст — во всё окно браузера (стиль .o3d у хозяина)
    var dpr = window.devicePixelRatio || 1;
    var W = Math.round(window.innerWidth * dpr), H = Math.round(window.innerHeight * dpr);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  }
  function tick(now) {
    raf = requestAnimationFrame(tick);
    var dt = Math.min(0.05, last ? (now - last) / 1000 : 0); last = now;
    if (cam.dir) {
      cam.s = Math.max(0, Math.min(1, cam.s + cam.dir * dt / (RM ? 0.01 : TRANS_S)));
      if (cam.s === 1 && cam.dir > 0) cam.dir = 0;
      if (cam.s === 0 && cam.dir < 0) { finishExit(); return; }
    }
    controls(dt);
    if (host.version() !== sceneV) buildScene();
    render();
  }
  function controls(dt) {
    var pd = padDir && window.__MUT !== 'nopad' ? padDir : [0, 0];   // стрелка сверху, зажатая мышью
    var dx = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0) + (drag && drag.joy ? drag.jx : 0) + pd[0];
    var dy = (keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0) + (drag && drag.joy ? drag.jy : 0) + pd[1];
    var busy = host.busy();
    if (mode === 'otto') {
      host.input(busy || cam.s < 1 ? 0 : dx, busy || cam.s < 1 ? 0 : dy);
      var p = host.playerPos();
      if (p) { var k = 1 - Math.pow(0.0015, dt); cam.follow[0] += (p.x - cam.follow[0]) * k; cam.follow[1] += (p.y - 8 - cam.follow[1]) * k; }
      near = cam.s === 1 ? host.nearSpot() : null;
      if (hudMode !== 'bar' && cam.s === 1 && cam.dir === 0 && host.onMat) {   // шагнул на коврик у входа — выход (стоял на нём при входе — сперва сойти)
        var onMat = host.onMat();
        if (onMat && !wasMat) exit();
        wasMat = onMat;
      }
    } else {
      if (!busy && (dx || dy)) { var v = 0.9 * (cam.H || END.free); cam.follow[0] += dx * v * dt; cam.follow[1] += dy * v * dt; }
      cam.follow[0] = Math.max(0, Math.min(scene ? scene.aw : 1024, cam.follow[0]));
      cam.follow[1] = Math.max(40, Math.min(scene ? scene.ah : 640, cam.follow[1]));
      near = null;
    }
    hudUpdate();
  }
  function render() {
    place();
    var cs = camState(), S = scene;
    gl.viewport(0, 0, cv.width, cv.height);
    gl.clearColor(FOG[0], FOG[1], FOG[2], smooth(0.02, 0.4, cs.s)); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(prog); gl.bindVertexArray(U.vao);
    gl.uniformMatrix4fv(U.uVP, false, new Float32Array(cs.VP));
    gl.uniform1i(U.uTex, 0); gl.activeTexture(gl.TEXTURE0);
    gl.uniform3fv(U.uFog, FOG); gl.uniform2f(U.uFogR, cs.D - 50, cs.D + 520); gl.uniform1f(U.uFogK, 0.45 * cs.s); gl.uniform1f(U.uMul, 1);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);   // стекло не просвечивает до страницы
    // пол
    var F = []; quad(F, [[0, 0, 0], [S.aw, 0, 0], [S.aw, 0, S.ah], [0, 0, S.ah]], [[0, 0], [1, 0], [1, 1], [0, 1]], 1);
    gl.depthMask(true); draw(F, tex(S.floor), 0);
    var fr = host.frame();
    // тени под агентами — на полу, без записи глубины
    var B = [];
    fr.agents.forEach(function (a) { if (!a.seat) { var cx = a.px, cz = a.F - 0.5; quad(B, [[cx - 8, 0.3, cz - 3], [cx + 8, 0.3, cz - 3], [cx + 8, 0.3, cz + 3], [cx - 8, 0.3, cz + 3]], [[0, 0], [1, 0], [1, 1], [0, 1]], 1); } });
    gl.depthMask(false); draw(B, tex(blobTex), 0); gl.depthMask(true);
    var stat = { sides: 0, ext: 0, joins: 0, backs: 0 };   // для проверки: сколько кусков нарисовано в кадре
    // стены
    var W = wallGeom(smooth(0.05, 0.75, cs.s));
    stat.joins = S.joins.length;
    draw(W[0], tex(S.fg), 0.5); draw(W[1], tex(S.topTex), 0.5);
    // стоячие картинки — от дальних к ближним (полупрозрачные точки стекла ложатся на то, что за ними)
    var list = [];
    S.items.forEach(function (it, i) {
      // наведение: предмет целиком светлее (17.10: «чтобы ничего лишнего не светилось» — обводка картинки висела рамкой
      // вокруг передней грани, отдельно от верха и боков)
      var mul = hover && hover.kind === 'obj' && hover.spot && hover.spot === it.spot ? HOT_MUL : 1;
      gl.uniform1f(U.uMul, mul);
      it.L.forEach(function (q) {
        if (q.boxes) { var Bx = []; q.boxes.forEach(function (bx) { boxAt(Bx, bx); }); draw(Bx, tex(it.full), 0.5); stat.boxes = (stat.boxes || 0) + q.boxes.length; }
        if (q.m === 'flat') {
          var A = []; flatAt(A, q); draw(A, tex(q.c), 0.5);
          if (q.side) { var Sd = []; sidesOf(Sd, q); draw(Sd, tex(it.full), 0.5); stat.sides += Sd.length / 36; }
        } else if (q.m === 'back') { list.push({ z: q.z, c: q.c, x: q.x, y: q.y, w: q.w, h: q.h0, base: q.Fw, mul: mul }); stat.backs++; }
        else {
          if (q.ext) { draw(q.ext, tex(q.c), 0.5); stat.ext += q.ext.length / 36; }
          if (q.seat) {   // сиденье: верх, перёд и бока (низ и зад камера не видит)
            var St = [], s = q.seat, b = s.h - s.t, one = function (u, v) { return [[u, v], [u, v], [u, v], [u, v]]; };
            quad(St, [[s.x0, s.h, s.z0], [s.x1, s.h, s.z0], [s.x1, s.h, s.z1], [s.x0, s.h, s.z1]], one(s.u, s.v), 1);
            if (s.t) {
              quad(St, [[s.x0, s.h, s.z1], [s.x1, s.h, s.z1], [s.x1, b, s.z1], [s.x0, b, s.z1]], one(s.su, s.sv), 0.9);
              quad(St, [[s.x0, s.h, s.z0], [s.x0, s.h, s.z1], [s.x0, b, s.z1], [s.x0, b, s.z0]], one(s.su, s.sv), 0.74);
              quad(St, [[s.x1, s.h, s.z1], [s.x1, s.h, s.z0], [s.x1, b, s.z0], [s.x1, b, s.z1]], one(s.su, s.sv), 0.86);
            }
            draw(St, tex(it.full), 0.5); stat.seats = (stat.seats || 0) + 1;
          }
          list.push({ z: q.Zw, c: q.c, x: q.x, y: q.y, w: q.w, h: q.h0, base: q.Fw, mul: mul });
        }
      });
      gl.uniform1f(U.uMul, 1);
    });
    fr.ovs.forEach(function (o) {
      var base = o.F, par = o.par != null && S.items[o.par], fl = null;
      if (par) {
        base = standOf(par, o.x + o.w / 2, o.y + o.h / 2);   // экран — в плоскости той части, на которой он нарисован
        fl = flatRowsOf(par, o);
      }
      if (fl) {   // верхние строки слоя лежат на лежачей части (чуть выше неё — не мерцать с ней)
        var Fp = [], hh = fl.h + 0.15, zb = o.y + fl.k * o.h + hh;
        quad(Fp, [[o.x, hh, o.y + hh], [o.x + o.w, hh, o.y + hh], [o.x + o.w, hh, zb], [o.x, hh, zb]], [[0, 0], [1, 0], [1, fl.k], [0, fl.k]], 1);
        draw(Fp, tex(o.cv, o.key), 0.5); stat.ovFlat = (stat.ovFlat || 0) + 1;
      }
      if (!fl || fl.k < 1) list.push({ z: base + 0.6, c: o.cv, key: o.key, x: o.x, y: o.y, w: o.w, h: o.h, base: base, v0: fl ? fl.k : 0 });
    });
    fr.agents.forEach(function (a) {
      var C = agentCut(a), v1 = C.k;
      if (v1 < 1) { stat.cut = (stat.cut || 0) + 1; (stat.cutIds = stat.cutIds || []).push(a.id + ' ' + v1.toFixed(2)); (stat.cutBase = stat.cutBase || {})[a.id] = C.base; }
      list.push({ z: C.base + 0.2, c: a.img, x: a.x, y: a.y, w: a.w, h: a.h, base: C.base, v1: v1 });
    });
    list.sort(function (p, q) { return p.z - q.z; });
    list.forEach(function (q) {
      var A = []; standeeAt(A, q);
      if (q.mul && q.mul !== 1) gl.uniform1f(U.uMul, q.mul);
      draw(A, tex(q.c, q.key), 0.5);
      if (q.mul && q.mul !== 1) gl.uniform1f(U.uMul, 1);
    });
    // пузыри — поверх всего
    gl.disable(gl.DEPTH_TEST);
    fr.bubbles.forEach(function (b) { var A = []; standeeAt(A, { z: b.F + 1, x: b.x, y: b.y, w: b.w, h: b.h, base: b.F }); draw(A, tex(b.img), 0.5); });
    gl.enable(gl.DEPTH_TEST);
    lastStat = stat;
    host.fade(1 - smooth(0, 0.12, cs.s));   // плоский офис гаснет в самом начале перехода (и загорается в конце выхода)
  }
  function flatAt(A, q) {   // лежачая часть: строка r рисунка — на глубине y + r + h, на высоте h
    var h = q.h;
    quad(A, [[q.x, h, q.y + h], [q.x + q.w, h, q.y + h], [q.x + q.w, h, q.y + q.h0 + h], [q.x, h, q.y + q.h0 + h]], [[0, 0], [1, 0], [1, 1], [0, 1]], 1);
    if (q.deep) q.r.forEach(function (R) {   // верх продлён назад цветом второй строки прямоугольника (первая — обводка)
      var za = q.y + R[1] + h - q.deep, zb = q.y + R[1] + h, v = (R[1] + 1.5) / q.h0, ua = R[0] / q.w, ub = R[2] / q.w;
      quad(A, [[q.x + R[0], h, za], [q.x + R[2], h, za], [q.x + R[2], h, zb], [q.x + R[0], h, zb]], [[ua, v], [ub, v], [ub, v], [ua, v]], 1);
    });
  }
  /* боковины лежачей части: у левого и правого края каждого прямоугольника — стенка глубиной в прямоугольник, высотой
     side строк, цветом передней грани под ним (столбец рисунка у края, строки под прямоугольником), чуть темнее */
  function sidesOf(A, q) {
    var W = q.w, Hh = q.h0, k = q.side, h = q.h;
    q.r.forEach(function (R, n) {
      var z0 = q.y + R[1] + h - q.deep, z1 = q.y + R[3] + h, va = R[3] / Hh, vb = (R[3] + k) / Hh, cl = q.cols[n];
      [[R[0], cl[0], 0.74], [R[2], cl[1], 0.86]].forEach(function (s) {   // левый бок — столбцом у левого края (не обводкой), правый — у правого
        var xs = q.x + s[0], uc = (s[1] + 0.5) / W;
        quad(A, [[xs, h, z0], [xs, h, z1], [xs, h - k, z1], [xs, h - k, z0]], [[uc, va], [uc, va], [uc, vb], [uc, vb]], s[2]);
      });
    });
  }
  function standOf(it, X, Y) {   // нога стоячей части предмета, в которой лежит точка мира (X, Y); иначе — самой большой
    var big = null;
    for (var k = 0; k < it.L.length; k++) {
      var q = it.L[k];
      if (q.m !== 'stand') continue;
      var u = Math.floor(X - q.x), v = Math.floor(Y - q.y);
      if (u >= 0 && v >= 0 && u < q.w && v < q.h0 && q.mask[v * q.w + u]) return q.Fw;
      if (!big || q.n > big.n) big = q;
    }
    return big ? big.Fw : it.F;
  }
  // рисунок (x, y, w, h) в плоскости ноги base, но на глубине z (чуть ближе — экраны поверх своего предмета)
  function standeeAt(A, q) {   // v0 / v1 — доли строк сверху и снизу, которые не рисуются (лежат отдельно, закрыты столом)
    var b = q.base, z = q.z, v0 = q.v0 || 0, v1 = q.v1 == null ? 1 : q.v1, ya = q.y + q.h * v0, yb = q.y + q.h * v1;
    quad(A, [[q.x, b - ya, z], [q.x + q.w, b - ya, z], [q.x + q.w, b - yb, z], [q.x, b - yb, z]], [[0, v0], [1, v0], [1, v1], [0, v1]], 1);
  }
  function boxAt(A, b) {   // коробка: верх (своим цветом), перёд и бока (низ и зад камера не видит)
    var one = [[b.u, b.v], [b.u, b.v], [b.u, b.v], [b.u, b.v]], top = [[b.tu, b.tv], [b.tu, b.tv], [b.tu, b.tv], [b.tu, b.tv]];
    quad(A, [[b.x0, b.hi, b.z0], [b.x1, b.hi, b.z0], [b.x1, b.hi, b.z1], [b.x0, b.hi, b.z1]], top, 1);
    quad(A, [[b.x0, b.hi, b.z1], [b.x1, b.hi, b.z1], [b.x1, b.lo, b.z1], [b.x0, b.lo, b.z1]], one, 0.9);
    quad(A, [[b.x0, b.hi, b.z0], [b.x0, b.hi, b.z1], [b.x0, b.lo, b.z1], [b.x0, b.lo, b.z0]], one, 0.74);
    quad(A, [[b.x1, b.hi, b.z1], [b.x1, b.hi, b.z0], [b.x1, b.lo, b.z0], [b.x1, b.lo, b.z1]], one, 0.86);
  }
  /* сидящий за столом (и любой агент за мебелью): в плане стол рисуется поверх его нижней части от своего заднего края;
     в 2.5D он стоит своей картинкой, и щупальца поднимались над столешницей — «ноги на столе» (17.10). Обрезка — по
     заднему краю лежачей части предмета, который в плане рисуется после агента (нога дальше) и перекрывает его по
     ширине хотя бы на 60 %. Возвращает долю строк рисунка, которую рисовать (k), и где поставить агента (base). Если его
     ступни в плане под этой частью (сидит за столом) — на её задний край, строкой среза на её высоте: срез ложится ровно
     на край столешницы, как в плане (17.10, вечер: в переговорной агент стоял на 5 точек ближе края — между срезом и
     столом была тёмная щель, на кухне на 4 дальше — стол прятал лишнее). Идущий позади мебели остаётся на своём месте */
  function agentCut(a) {
    var cut = a.y + a.h, base = null;
    scene.items.forEach(function (it) {
      if (!(it.F > a.F + 0.01)) return;
      it.L.forEach(function (q) {
        if (q.m !== 'flat' || !q.r) return;
        q.r.forEach(function (R) {
          // лежачая часть целиком позади ступней агента (сиденье дальнего стула, на котором он сидит) его не закрывает: в
          // плане ряд дальних стульев рисуется до агента, стол — после (17.10, вечер: «агенты обрезаны» — резало по сиденью)
          if (it.y + R[3] <= a.F) return;
          var X0 = it.x + R[0], X1 = it.x + R[2], E = it.y + R[1];
          var ov = Math.min(X1, a.x + a.w) - Math.max(X0, a.x);
          if (ov >= a.w * 0.6 && E > a.y + 0.5 && E < cut) { cut = E; base = a.F > E ? E + q.h : null; }
        });
      });
    });
    return { k: (cut - a.y) / a.h, base: base != null ? base : a.F };
  }
  /* живой слой o на предмете it: сколько верхних строк (доля k) лежит на лежачей части — по середине слоя: точка, не
     занятая стоячей частью (кроме части по умолчанию), но занятая лежачей. null — слой стоит целиком */
  function flatRowsOf(it, o) {
    var u = Math.floor(o.x + o.w / 2 - it.x), n = 0, h = null;
    for (var r = 0; r < o.h; r++) {
      var v = Math.floor(o.y + r - it.y), own = null;
      if (v < 0 || u < 0 || !it.L[0] || u >= it.L[0].w || v >= it.L[0].h0) break;
      for (var k = 0; k < it.L.length && !own; k++) {
        var q = it.L[k];
        if (q.m === 'stand' && !q.def && q.mask && q.mask[v * q.w + u]) own = q;
      }
      if (!own) for (k = 0; k < it.L.length && !own; k++) { q = it.L[k]; if (q.m === 'flat' && q.mask && q.mask[v * q.w + u]) own = q; }
      if (!own || own.m !== 'flat') break;
      n++; h = own.h;
    }
    return n ? { k: n / o.h, h: h } : null;
  }

  // ---------- наведение и нажатие ----------
  function pick(mx, my) {
    if (!scene || cam.s < 1) return null;
    var cs = camState(), ray = rayAt(cs, mx, my), best = null;
    function hit(z, x, y, w, h, base) {
      if (Math.abs(ray.d[2]) < 1e-6) return null;
      var t = (z - ray.o[2]) / ray.d[2];
      if (t <= 0) return null;
      var X = ray.o[0] + ray.d[0] * t, Y = ray.o[1] + ray.d[1] * t, py = base - Y;   // точка рисунка
      if (X < x || X >= x + w || py < y || py >= y + h) return null;
      return { t: t, u: X - x, v: py - y };
    }
    host.frame().agents.forEach(function (a) {
      var r = hit(a.F + 0.2, a.x, a.y, a.w, a.h, a.F);
      if (r && (!best || r.t < best.t)) best = { t: r.t, kind: 'agent', id: a.id };
    });
    scene.items.forEach(function (it) {
      if (!it.spot || (it.spot === '@exit' && hudMode === 'bar')) return;   // коврик — выход, кроме прежнего вида с кнопкой
      it.L.forEach(function (q) {
        var r;
        if (q.m === 'flat') {   // плоскость высоты h: точка рисунка — (X − x, Z − h − y)
          if (Math.abs(ray.d[1]) < 1e-6) return;
          var tt = (q.h - ray.o[1]) / ray.d[1]; if (tt <= 0) return;
          var X = ray.o[0] + ray.d[0] * tt, Z = ray.o[2] + ray.d[2] * tt;
          r = { t: tt, u: X - q.x, v: Z - q.h - q.y };
          if (r.u < 0 || r.v < 0 || r.u >= q.w || r.v >= q.h0) return;
        } else if (!(r = hit(q.Zw, q.x, q.y, q.w, q.h0, q.Fw))) return;
        if (!q.mask[Math.floor(r.v) * q.w + Math.floor(r.u)]) return;
        if (!best || r.t < best.t) best = { t: r.t, kind: 'obj', spot: it.spot };
      });
    });
    return best;
  }
  function onMove(e) {
    var r = cv.getBoundingClientRect();
    if (drag) {
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (drag.joy) { var l = Math.hypot(dx, dy); drag.jx = l > 12 ? dx / l : 0; drag.jy = l > 12 ? dy / l : 0; }
      else if (mode === 'free') {
        var k = (cam.H || END.free) / r.height, cs = camState();
        cam.follow[0] = drag.fx - dx * k * cs.yS; cam.follow[1] = drag.fy - dy * k / Math.sin(cs.pitch);
        if (Math.hypot(dx, dy) > 4) drag.moved = true;
      }
      return;
    }
    hover = pick((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    cv.style.cursor = hover ? 'pointer' : mode === 'free' ? 'grab' : 'default';
  }
  function onDown(e) {
    if (cam.s < 1) return;
    var touch = e.pointerType === 'touch';
    drag = { x: e.clientX, y: e.clientY, fx: cam.follow[0], fy: cam.follow[1], joy: touch && mode === 'otto', jx: 0, jy: 0, moved: false, t0: performance.now() };
    cv.setPointerCapture && cv.setPointerCapture(e.pointerId);
  }
  function onUp(e) {
    var d = drag; drag = null;
    if (!d) return;
    var r = cv.getBoundingClientRect(), quick = performance.now() - d.t0 < 400 && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 8;
    if (!quick) return;
    var h = pick((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    if (h && h.kind === 'obj') { if (h.spot === '@exit') exit(); else host.open(h.spot); }
    else if (h && h.kind === 'agent') host.openAgent(h.id);
  }
  function onWheel(e) {
    if (cam.s < 1) return;
    e.preventDefault();
    cam.H = Math.max(120, Math.min(560, (cam.H || END[mode]) * Math.pow(1.1, e.deltaY > 0 ? 1 : -1)));
  }
  function onKey(e) {
    if (!on) return;
    var down = e.type === 'keydown', c = e.code;
    if (host.busy()) { keys = {}; return; }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].indexOf(c) >= 0) { keys[c] = down; e.preventDefault(); return; }
    if (!down) return;
    if ((c === 'KeyE' || c === 'Enter' || c === 'Space') && near && mode === 'otto') { e.preventDefault(); useNear(); }
    else if (c === 'Escape') { e.preventDefault(); exit(); }
  }
  function useNear() {   // E — с клавиатуры или клавишей сверху: открыть то, что рядом; у коврика — выход
    if (!near || mode !== 'otto') return;
    if (near.id === 'enter3d') { if (hudMode !== 'bar') exit(); }   // (было «E — Войти в офис» изнутри офиса)
    else host.open(near.id);
  }

  // ---------- подсказки и кнопки ----------
  function hudBuild() {
    hudMode = (host.hud && host.hud()) || 'bar';
    if (hudMode !== 'bar') hudMode = 'keys';
    hud = document.createElement('div'); hud.className = 'o3d-hud o3d-hud--' + hudMode;
    var OT = window.OT || String;   // надписи — по словарю офиса (pix/i18n.js, 18.10)
    if (hudMode === 'bar') hud.innerHTML = '<div class="o3d-hud__bar"><b>' + OT('Офис') + '</b>' +
      '<button type="button" data-x="1">' + OT('Выйти в план') + '</button></div><div class="o3d-hud__tip"></div>';
    else {   // клавиши снизу — тем же рисовальщиком, что клавиши «Аркады» (windows/tetris/keys.js), в цветах окна
      var lab = function (t, k) { var s = OT(t) + ' (' + k + ')'; return ' aria-label="' + s + '" title="' + s + '"'; };
      var key = function (l, code, attrs, span) {
        return '<button type="button" class="w3x-pkey o3d-key" data-label="' + l + '" data-code="' + code + '" data-pal="win"' +
          (span ? ' data-span="' + span + '"' : '') + attrs + '></button>';
      };
      var group = function (inner) { return '<div class="o3d-kr">' + inner + '</div>'; };
      var h = group(key('ESC', 'Escape', ' data-x="1"' + lab('Выйти из объёмного вида', 'Esc'), 2)) +
        group(key('E', 'KeyE', ' data-act="e"' + lab('Открыть то, что рядом', 'E'))) +
        group([['←', 'ArrowLeft KeyA', '-1,0'], ['↑', 'ArrowUp KeyW', '0,-1'], ['↓', 'ArrowDown KeyS', '0,1'], ['→', 'ArrowRight KeyD', '1,0']]
          .map(function (a) { return key(a[0], a[1], ' data-dir="' + a[2] + '"' + lab('Идти', a[0])); }).join(''));
      hud.innerHTML = '<div class="o3d-keys">' + h + '</div>';
      if (window.PixKeys) PixKeys.mount(hud);
      // стрелка: идти, пока держишь (мышь, палец)
      hud.addEventListener('pointerdown', function (e) {
        var b = e.target.closest('[data-dir]'); if (!b) return;
        padDir = b.dataset.dir.split(',').map(Number);
        if (b.setPointerCapture) b.setPointerCapture(e.pointerId);
      });
      var up = function () { padDir = null; };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (t) { hud.addEventListener(t, up); });
    }
    hud.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.x) exit();
      else if (b.dataset.act === 'e') useNear();
      else if (b.dataset.m) setMode(b.dataset.m);
    });
    host.stage().appendChild(hud);
    if (window.PixKeys && hudMode !== 'bar') PixKeys.snap(hud);   // ряд по центру — холсты клавиш на целые точки экрана
  }
  function hudUpdate() {
    if (!hud) return;
    if (hudMode !== 'bar') {   // E тускнеет, когда рядом ничего нет
      var eb = hud.querySelector('[data-act="e"]'), off = window.__MUT === 'noedim' ? false : !near || cam.s < 1;
      if (eb && eb.__off !== off) { eb.__off = off; eb.classList.toggle('is-off', off); eb.setAttribute('aria-disabled', off ? 'true' : 'false'); }
      return;
    }
    hud.querySelectorAll('[data-m]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.m === mode ? 'true' : 'false'); });
    var tip = hud.querySelector('.o3d-hud__tip'), t;
    if (cam.s < 1) t = '';
    else if (mode === 'otto') t = near ? '<kbd>E</kbd> — ' + near.title : (window.OT || String)('Стрелки или WASD — идти · колесо — ближе / дальше · нажатие на предмет — открыть');
    else t = (window.OT || String)('Стрелки или WASD — лететь · тянуть мышью — двигать · колесо — ближе / дальше · нажатие на предмет — открыть');
    if (tip.__t !== t) { tip.innerHTML = t; tip.__t = t; }
  }

  // ---------- вход и выход ----------
  function enter(h, m, exitCb) {
    if (on) return;
    host = h; onExit = exitCb || null;
    if (!gl && !initGL()) return;
    mode = m === 'free' ? 'free' : 'otto';
    host.stage().appendChild(cv); hudBuild();
    on = true; cam.s = 0; cam.dir = 1; cam.H = 0; keys = {}; last = 0; hover = null; near = null;
    host.setPlayer(mode === 'otto');
    wasMat = !!(host.onMat && host.onMat());
    var p = host.playerPos();
    cam.follow = mode === 'otto' && p ? [p.x, p.y - 8] : [512, 320];
    buildScene();
    cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointerup', onUp);
    cv.addEventListener('wheel', onWheel, { passive: false });
    // на погружении: раньше обработчиков страницы — иначе Escape сперва закрывает окно раздела, а потом видит «свободно» и выводит из 2.5D
    window.addEventListener('keydown', onKey, true); window.addEventListener('keyup', onKey, true);
    host.stage().classList.add('is-3d');
    raf = requestAnimationFrame(tick);
  }
  function setMode(m) {
    if (!on || m === mode) return;
    mode = m; cam.H = 0;
    host.setPlayer(mode === 'otto');
    var p = host.playerPos();
    if (mode === 'otto' && p) cam.follow = [p.x, p.y - 8];
    if (host.onMode) host.onMode(mode);
    hudUpdate();
  }
  function exit() { if (on && cam.dir >= 0) { cam.dir = -1; host.input(0, 0); keys = {}; padDir = null; } }
  function finishExit() {
    cancelAnimationFrame(raf); on = false; cam.dir = 0;
    cv.removeEventListener('pointermove', onMove); cv.removeEventListener('pointerdown', onDown); cv.removeEventListener('pointerup', onUp);
    cv.removeEventListener('wheel', onWheel);
    window.removeEventListener('keydown', onKey, true); window.removeEventListener('keyup', onKey, true);
    padDir = null;
    host.setPlayer(false); host.fade(1);
    if (cv.parentNode) cv.parentNode.removeChild(cv);
    if (hud && hud.parentNode) hud.parentNode.removeChild(hud); hud = null;
    host.stage().classList.remove('is-3d');
    if (onExit) onExit();
  }

  window.Office3D = {
    supported: supported, enter: enter, exit: exit, setMode: setMode,
    // вид поверх 2.5D сменился (переключатель демо) — пересобрать на лету
    hudRefresh: function () {
      if (!on) return;
      if (hud && hud.parentNode) hud.parentNode.removeChild(hud); hud = null; padDir = null;
      hudBuild(); hudUpdate();
    },
    hud: function () { return { mode: hudMode, el: !!hud, wasMat: wasMat, pad: padDir }; },
    on: function () { return on; }, mode: function () { return mode; },
    // для проверки: доля перехода, камера, подсказка, что под точкой холста
    info: function () { return { on: on, s: cam.s, mode: mode, follow: cam.follow.slice(), H: cam.H, near: near, items: scene ? scene.items.length : 0, stat: lastStat }; },
    pickAt: function (mx, my) { return pick(mx, my); },
    scene: function () { return scene; }, cam: function () { return on ? camState() : null; },
    hold: function (s) { cam.s = s; cam.dir = 0; },   // остановить переход на доле s (сверка с плоским)
    look: function (x, y, H) { cam.follow = [x, y]; if (H) cam.H = H; },   // свободная камера — к точке офиса (снимки вблизи)
    key: function (code, down) { onKey({ type: down ? 'keydown' : 'keyup', code: code, preventDefault: function () {} }); },
  };
})();
