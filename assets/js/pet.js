/* Пиксельный паучок, который живёт внизу страницы: ходит вдоль нижнего края,
   раскрывает ноутбук и печатает, а на курсор и щелчок отзывается.

   Рисунок настоящий пиксельный: таблица ниже, где буква — цвет, точка — пустое
   место. Кадры нарисованы фигурами (см. историю коммитов) и вставлены
   готовыми; каждый один раз собирается в отдельный холст, дальше только
   копируется — перерисовывать сотни квадратиков в кадре незачем. При
   `prefers-reduced-motion` паучок просто сидит за раскрытым ноутбуком. */
(function () {
  'use strict';

  var LESS_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var PIXEL = 3;             // сторона «пикселя» рисунка, px
  var ART_W = 22;            // ширина рисунка: паучок и место под ноутбук
  var ART_H = 12;

  var SPEED = 24;            // как быстро идёт, px в секунду
  var WALK_MS = 170;         // смена кадра шага
  var OPEN_MS = 130;         // кадр раскрытия крышки
  var TYPE_MS = 220;         // смена кадра за клавишами
  var BLINK_EVERY = 4600;    // как часто моргает
  var BLINK_MS = 140;
  var WATCH_PX = 110;        // на каком расстоянии замечает курсор
  var HOP_MS = 260;          // прыжок в ответ на щелчок
  var EDGE = 12;             // отступ от краёв окна

  var COLORS = {
    '#': '#7c7cff',          // тело
    d: '#5b5bd6',            // лапки
    D: '#3a3a7a',            // сегмент сзади
    w: '#e7eaf2',            // глаза
    p: '#161c28',            // зрачки
    g: '#838da4',            // ноутбук
  };

  /* --- кадры ------------------------------------------------------------- */

  /* Точка — пусто, буква — цвет из COLORS. Паучок занимает левую часть
     строки, ноутбук появляется справа в кадрах раскрытия и работы.
     Кадры перерисовывает tools/draw_pet.py — руками их не правят. */
  var ART = {
    idle: [[
        '......................',
        '......................',
        'DDDDD#######..........',
        'DDDD##ww#ww##.........',
        'DDDD##ww#ww##.........',
        'DDDD##pp#pp##.........',
        'DDDD##pp#pp##.........',
        'DDDD##ww#ww##.........',
        '.dd.dd#dd#dd#.........',
        '.dd.dd.dd.dd..........',
        '....dd....dd..........',
        '......................',
      ]],
    blink: [[
        '......................',
        '......................',
        'DDDDD#######..........',
        'DDDD#########.........',
        'DDDD#########.........',
        'DDDD##pp#pp##.........',
        'DDDD#########.........',
        'DDDD#########.........',
        '.dd.dd#dd#dd#.........',
        '.dd.dd.dd.dd..........',
        '....dd....dd..........',
        '......................',
      ]],
    walk: [[
        '......................',
        '......................',
        'DDDDD#######..........',
        'DDDD##ww#ww##.........',
        'DDDD##ww#ww##.........',
        'DDDD##pp#pp##.........',
        'DDDD##pp#pp##.........',
        'DDDD##ww#ww##.........',
        '.dd.dd#dd#dd#.........',
        '.dd.dd.dd.dd..........',
        '....dd....dd..........',
        '......................',
      ], [
        '......................',
        'DDDDD#######..........',
        'DDDD##ww#ww##.........',
        'DDDD##ww#ww##.........',
        'DDDD##pp#pp##.........',
        'DDDD##pp#pp##.........',
        'DDDD##ww#ww##.........',
        '.dd.dd#dd#dd#.........',
        '.dd.dd.dd.dd..........',
        '.dd.dd.dd.dd..........',
        '.dd....dd.............',
        '......................',
      ]],
    hop: [[
        'DDDDD#######..........',
        'DDDD##ww#ww##.........',
        'DDDD##ww#ww##.........',
        'DDDD##pp#pp##.........',
        'DDDD##pp#pp##.........',
        'DDDD##ww#ww##.........',
        '.dd.dd#dd#dd#.........',
        '.dd.dd.dd.dd..........',
        '.dd.dd.dd.dd..........',
        '.dd.dd.dd.dd..........',
        '.dd....dd.............',
        '......................',
      ]],
    open: [[
        '......................',
        '......................',
        'DDDDD#######..........',
        'DDDD##ww#ww##.........',
        'DDDD##ww#ww##.........',
        'DDDD##pp#pp##.........',
        'DDDD##pp#pp##.........',
        'DDDD##ww#ww##.........',
        '.dd.dd#dd#dd#.ggggggg.',
        '.dd.dd.dd.dd..ggggggg.',
        '....dd....dd..........',
        '......................',
      ], [
        '......................',
        '......................',
        'DDDDD#######..........',
        'DDDD##ww#ww##.........',
        'DDDD##ww#ww##.........',
        'DDDD##pp#pp##.........',
        'DDDD##pp#pp##..gg.....',
        'DDDD##ww#ww##....gg...',
        '.dd.dd#dd#dd#......gg.',
        '.dd.dd.dd.dd..ggggggg.',
        '....dd....dd..........',
        '......................',
      ], [
        '......................',
        '......................',
        'DDDDD#######..........',
        'DDDD##ww#ww##....g....',
        'DDDD##ww#ww##.....g...',
        'DDDD##pp#pp##.....g...',
        'DDDD##pp#pp##......g..',
        'DDDD##ww#ww##......g..',
        '.dd.dd#dd#dd#.......g.',
        '.dd.dd.dd.dd..ggggggg.',
        '....dd....dd..........',
        '......................',
      ], [
        '......................',
        '......................',
        'DDDDD#######..........',
        'DDDD##ww#ww##......gg.',
        'DDDD##ww#ww##......gg.',
        'DDDD##pp#pp##......gg.',
        'DDDD##pp#pp##......gg.',
        'DDDD##ww#ww##......gg.',
        '.dd.dd#dd#dd#......gg.',
        '.dd.dd.dd.dd..ggggggg.',
        '....dd....dd..........',
        '......................',
      ]],
    type: [[
        '......................',
        '......................',
        'DDDDD#######..........',
        'DDDD##ww#ww##......gg.',
        'DDDD##ww#ww##......gg.',
        'DDDD##pp#pp##......gg.',
        'DDDD##pp#pp##......gg.',
        'DDDD##ww#ww##ddd...gg.',
        '.dd.dd#dd#dd#..d...gg.',
        '.dd.dd.dd.dd..ggggggg.',
        '....dd....dd..........',
        '......................',
      ], [
        '......................',
        '......................',
        'DDDDD#######..........',
        'DDDD##ww#ww##......gg.',
        'DDDD##ww#ww##......gg.',
        'DDDD##pp#pp##......gg.',
        'DDDD##pp#pp##......gg.',
        'DDDD##ww#ww##......gg.',
        '.dd.dd#dd#dd#......gg.',
        '.dd.dd.dd.dd..ggggggg.',
        '....dd....dd..........',
        '......................',
      ]],
  };

  /* --- сборка кадров ----------------------------------------------------- */

  function render(art, flip) {
    var canvas = document.createElement('canvas');
    canvas.width = ART_W * PIXEL;
    canvas.height = ART_H * PIXEL;

    var ctx = canvas.getContext('2d');
    for (var y = 0; y < art.length; y += 1) {
      for (var x = 0; x < art[y].length; x += 1) {
        var color = COLORS[art[y].charAt(x)];
        if (!color) continue;

        ctx.fillStyle = color;
        ctx.fillRect((flip ? ART_W - 1 - x : x) * PIXEL, y * PIXEL, PIXEL, PIXEL);
      }
    }

    return canvas;
  }

  var sprites = {};
  Object.keys(ART).forEach(function (name) {
    sprites[name] = ART[name].map(function (art) {
      return { right: render(art, false), left: render(art, true) };
    });
  });

  /* --- паучок ------------------------------------------------------------ */

  var canvas = document.createElement('canvas');
  canvas.className = 'pet';
  canvas.width = ART_W * PIXEL;
  canvas.height = ART_H * PIXEL;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.title = 'Потрогать';

  var ctx = canvas.getContext('2d');
  var pet = {
    x: 0,
    dir: 1,
    state: 'idle',
    until: 0,
    target: 0,
    frame: 0,
    frameAt: 0,
    blinkAt: 0,
  };

  var running = false;
  var last = 0;

  function limit() {
    return Math.max(EDGE, window.innerWidth - canvas.width - EDGE);
  }

  function place() {
    canvas.style.transform = 'translateX(' + Math.round(pet.x) + 'px)';
  }

  function draw(name, index) {
    var set = sprites[name][index % sprites[name].length];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(pet.dir < 0 ? set.left : set.right, 0, 0);
  }

  function enter(state, now, until) {
    pet.state = state;
    pet.frame = 0;
    pet.frameAt = now;
    pet.until = until || 0;
  }

  /* Что делать дальше: пройтись, сесть за ноутбук или постоять. Ноутбук
     паучок ставит перед собой, поэтому работать он садится мордой вправо. */
  function decide(now) {
    var roll = Math.random();

    if (roll < 0.44) {
      pet.target = EDGE + Math.random() * (limit() - EDGE);
      pet.dir = pet.target < pet.x ? -1 : 1;
      enter('walk', now);
    } else if (roll < 0.8) {
      pet.dir = 1;
      enter('open', now);
    } else {
      enter('idle', now, now + 1800 + Math.random() * 3200);
    }
  }

  function update(now, step) {
    if (pet.state === 'walk') {
      pet.x += pet.dir * SPEED * (step / 1000);
      if ((pet.dir > 0 && pet.x >= pet.target) || (pet.dir < 0 && pet.x <= pet.target)) {
        pet.x = pet.target;
        decide(now);
      }
      pet.x = Math.min(limit(), Math.max(EDGE, pet.x));
      place();
      return;
    }

    // Крышка поднимается кадр за кадром, потом паучок печатает; закрывает он её
    // теми же кадрами в обратную сторону.
    if (pet.state === 'open' || pet.state === 'close') {
      if (now - pet.frameAt < OPEN_MS) return;

      pet.frameAt = now;
      pet.frame += 1;

      if (pet.frame >= sprites.open.length) {
        if (pet.state === 'open') enter('type', now, now + 8000 + Math.random() * 9000);
        else decide(now);
      }
      return;
    }

    if (pet.state === 'type') {
      if (now - pet.frameAt > TYPE_MS) { pet.frame += 1; pet.frameAt = now; }
      if (now >= pet.until) enter('close', now);
      return;
    }

    if (now >= pet.until) decide(now);
  }

  function pick(now) {
    if (pet.state === 'walk') {
      if (now - pet.frameAt > WALK_MS) { pet.frame += 1; pet.frameAt = now; }
      return draw('walk', pet.frame);
    }

    if (pet.state === 'open') return draw('open', Math.min(pet.frame, 3));
    if (pet.state === 'close') return draw('open', Math.max(0, 3 - pet.frame));
    if (pet.state === 'type') return draw('type', pet.frame);
    if (pet.state === 'hop') return draw('hop', 0);

    if (now - pet.blinkAt > BLINK_EVERY) {
      if (now - pet.blinkAt > BLINK_EVERY + BLINK_MS) pet.blinkAt = now;
      return draw('blink', 0);
    }

    return draw('idle', 0);
  }

  function frame(now) {
    if (document.hidden) { running = false; return; }

    var step = last ? Math.min(now - last, 80) : 16.7;
    last = now;

    update(now, step);
    pick(now);

    window.requestAnimationFrame(frame);
  }

  function wake() {
    if (running || document.hidden || LESS_MOTION) return;
    running = true;
    last = 0;
    window.requestAnimationFrame(frame);
  }

  /* --- разговор с человеком ---------------------------------------------- */

  /* Курсор подошёл близко — паучок останавливается и поворачивается к нему.
     Убегать не надо: он любопытный, а не пугливый. За ноутбуком не отвлекается,
     иначе работа обрывалась бы на полуслове. */
  function watch(x, y) {
    if (pet.state === 'open' || pet.state === 'type' || pet.state === 'close') return;

    var box = canvas.getBoundingClientRect();
    var near = x > box.left - WATCH_PX && x < box.right + WATCH_PX &&
      y > box.top - WATCH_PX && y < box.bottom + WATCH_PX;

    if (!near) return;

    pet.dir = x < box.left + box.width / 2 ? -1 : 1;
    if (pet.state === 'walk') enter('idle', performance.now(), performance.now() + 900);
  }

  /* Холст шире паучка — за ним место под ноутбук. Чтобы эта пустота не съедала
     щелчки по странице, холст пропускает их сквозь себя и ловит только тогда,
     когда курсор действительно на паучке. */
  function hover(x, y) {
    var box = canvas.getBoundingClientRect();
    var on = x > box.left && x < box.left + PIXEL * 19 &&
      y > box.top + PIXEL * 3 && y < box.bottom;

    canvas.style.pointerEvents = on ? 'auto' : 'none';
  }

  function poke() {
    enter('hop', performance.now(), performance.now() + HOP_MS);
    wake();
  }

  document.body.appendChild(canvas);
  pet.x = Math.min(limit(), 64);
  place();

  if (LESS_MOTION) {
    draw('open', 3);
    return;
  }

  draw('idle', 0);
  wake();

  canvas.addEventListener('click', poke);

  if (FINE_POINTER) {
    window.addEventListener('mousemove', function (event) {
      watch(event.clientX, event.clientY);
      hover(event.clientX, event.clientY);
    }, { passive: true });
  }

  window.addEventListener('resize', function () {
    pet.x = Math.min(limit(), pet.x);
    place();
  });

  // Во вкладке в фоне кадры не считаются: вернулись — паучок просыпается.
  document.addEventListener('visibilitychange', wake);
})();
