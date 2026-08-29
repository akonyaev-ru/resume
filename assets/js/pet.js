/* Пиксельное существо, которое живёт внизу страницы: ходит вдоль нижнего края,
   присаживается поработать за ноутбуком, замечает курсор и подпрыгивает, если
   его щёлкнуть.

   Рисунок — не символы поля, а настоящие пиксели: таблица ниже, где каждая
   буква — цвет, а точка — пустое место. Каждый кадр один раз собирается в
   отдельный холст, дальше кадры только копируются: перерисовывать сотни
   квадратиков каждый раз незачем. Всё выключается разом при
   `prefers-reduced-motion` — существо просто садится за ноутбук и замирает. */
(function () {
  'use strict';

  var LESS_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var PIXEL = 3;             // сторона «пикселя» рисунка, px
  var ART_W = 26;            // ширина рисунка в пикселях: существо плюс ноутбук
  var ART_H = 16;

  var SPEED = 26;            // как быстро идёт, px в секунду
  var WALK_MS = 170;         // смена кадра шага
  var TYPE_MS = 260;         // смена кадра за ноутбуком
  var BLINK_EVERY = 4200;    // как часто моргает
  var BLINK_MS = 130;
  var WATCH_PX = 110;        // на каком расстоянии замечает курсор
  var HOP_MS = 260;          // прыжок в ответ на щелчок
  var EDGE = 12;             // отступ от краёв окна

  var COLORS = {
    o: '#161c28',            // обводка
    '#': '#7c7cff',          // тело
    d: '#5b5bd6',            // брюшко в тени
    e: '#3ddc97',            // глаза
    w: '#e7eaf2',            // блик в глазу
    a: '#ffb454',            // экран ноутбука светится
    m: '#3ddc97',            // и меняет цвет, пока существо печатает
  };

  /* Кадры нарисованы фигурами и вставлены готовыми: буква — цвет из COLORS,
     точка — пустое место. Существо занимает левую часть строки, ноутбук
     появляется справа только в кадрах работы. */
  var ART = {
    idle: [[
        '.....o.......o............',
        '....o#o.....o#o...........',
        '...o##ooooooo##o..........',
        '...o###########o..........',
        '...o############o.........',
        '..o##############o........',
        '.o######ew###ew###o.......',
        '.o######ee###ee###o.......',
        '.o################o.......',
        '.o####dddddood####o.......',
        '.o###dddddddddd###o.......',
        '..o##dddddddddd##o........',
        '...o#dddddddddd#o.........',
        '...o###########o..........',
        '...o###ooooo###o..........',
        '....ooo.....ooo...........',
      ]],
    blink: [[
        '.....o.......o............',
        '....o#o.....o#o...........',
        '...o##ooooooo##o..........',
        '...o###########o..........',
        '...o############o.........',
        '..o##############o........',
        '.o################o.......',
        '.o######oo###oo###o.......',
        '.o################o.......',
        '.o####dddddood####o.......',
        '.o###dddddddddd###o.......',
        '..o##dddddddddd##o........',
        '...o#dddddddddd#o.........',
        '...o###########o..........',
        '...o###ooooo###o..........',
        '....ooo.....ooo...........',
      ]],
    walk: [[
        '.....o.......o............',
        '....o#o.....o#o...........',
        '...o##ooooooo##o..........',
        '...o###########o..........',
        '...o############o.........',
        '..o##############o........',
        '.o######ew###ew###o.......',
        '.o######ee###ee###o.......',
        '.o################o.......',
        '.o####dddddood####o.......',
        '.o###dddddddddd###o.......',
        '..o##dddddddddd##o........',
        '...o#dddddddddd#o.........',
        '..o############o..........',
        '..o###oooooo###o..........',
        '...ooo......ooo...........',
      ], [
        '....o#o.....o#o...........',
        '...o##o.....o##o..........',
        '...o##ooooooo##o..........',
        '...o###########o..........',
        '...o############o.........',
        '..o##############o........',
        '.o######ew###ew###o.......',
        '.o######ee###ee###o.......',
        '.o################o.......',
        '.o####dddddood####o.......',
        '.o###dddddddddd###o.......',
        '..o##dddddddddd##o........',
        '...o#dddddddddd#o.........',
        '....o###########o.........',
        '....o###ooooo###o.........',
        '.....ooo.....ooo..........',
      ]],
    work: [[
        '.....o.......o............',
        '....o#o.....o#o...........',
        '...o##ooooooo##o..........',
        '...o###########o..........',
        '...o############o.........',
        '..o##############o........',
        '.o######ew###ew###o.......',
        '.o######ee###ee###o.......',
        '.o################o.ooooo.',
        '.o####dddddood####o.oaaao.',
        '.o###dddddddddd###o.oaaao.',
        '..o##dddddddddd##o..oaaao.',
        '...o#dddddddddd#o###ooooo.',
        '...o############o..ooooooo',
        '...o############o..ddddddd',
        '....oooooooooooo..........',
      ], [
        '.....o.......o............',
        '....o#o.....o#o...........',
        '...o##ooooooo##o..........',
        '...o###########o..........',
        '...o############o.........',
        '..o##############o........',
        '.o######ew###ew###o.......',
        '.o######ee###ee###o.......',
        '.o################o.ooooo.',
        '.o####dddddood####o.ommmo.',
        '.o###dddddddddd###o.ommmo.',
        '..o##dddddddddd##o..ommmo.',
        '...o#dddddddddd#o...ooooo.',
        '...o############o###oooooo',
        '...o############o..ddddddd',
        '....oooooooooooo..........',
      ]],
  };

  // Прыжок — тот же кадр, сдвинутый на пиксель вверх: рисовать отдельно нечего.
  ART.hop = [ART.idle[0].slice(1).concat([new Array(ART_W + 1).join('.')])];

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

  /* --- существо ---------------------------------------------------------- */

  var canvas = document.createElement('canvas');
  canvas.className = 'pet';
  canvas.width = ART_W * PIXEL;
  canvas.height = ART_H * PIXEL;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.title = 'Погладить';

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
    pointer: null,
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

  /* Что делать дальше: постоять, пройтись или сесть за ноутбук. */
  function decide(now) {
    var roll = Math.random();

    if (roll < 0.42) {
      pet.state = 'walk';
      pet.target = EDGE + Math.random() * (limit() - EDGE);
      pet.dir = pet.target < pet.x ? -1 : 1;
    } else if (roll < 0.76) {
      pet.state = 'work';
      pet.until = now + 7000 + Math.random() * 9000;
    } else {
      pet.state = 'idle';
      pet.until = now + 1800 + Math.random() * 3200;
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

    if (now >= pet.until) {
      if (pet.state === 'hop') pet.state = 'idle';
      decide(now);
    }
  }

  /* Кадр выбирается по состоянию: шаг перебирает две картинки, за ноутбуком
     мигает экран, стоя существо изредка моргает. */
  function pick(now) {
    if (pet.state === 'walk') {
      if (now - pet.frameAt > WALK_MS) { pet.frame += 1; pet.frameAt = now; }
      return draw('walk', pet.frame);
    }

    if (pet.state === 'work') {
      if (now - pet.frameAt > TYPE_MS) { pet.frame += 1; pet.frameAt = now; }
      return draw('work', pet.frame);
    }

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

  /* Курсор подошёл близко — существо останавливается и поворачивается к нему.
     Уходить не надо: оно любопытное, а не пугливое. */
  function watch(x, y) {
    var box = canvas.getBoundingClientRect();
    var near = x > box.left - WATCH_PX && x < box.right + WATCH_PX &&
      y > box.top - WATCH_PX && y < box.bottom + WATCH_PX;

    if (!near) return;

    pet.dir = x < box.left + box.width / 2 ? -1 : 1;
    if (pet.state === 'walk') {
      pet.state = 'idle';
      pet.until = performance.now() + 900;
    }
  }

  /* Холст шире самого существа — за ним ещё место под ноутбук. Чтобы эта
     пустота не съедала щелчки по странице, холст пропускает их сквозь себя и
     ловит только тогда, когда курсор действительно на существе. */
  function hover(x, y) {
    var box = canvas.getBoundingClientRect();
    var on = x > box.left + PIXEL && x < box.left + PIXEL * 19 &&
      y > box.top + PIXEL && y < box.bottom;

    canvas.style.pointerEvents = on ? 'auto' : 'none';
  }


  function poke() {
    pet.state = 'hop';
    pet.until = performance.now() + HOP_MS;
    wake();
  }

  document.body.appendChild(canvas);
  pet.x = Math.min(limit(), 64);
  place();

  if (LESS_MOTION) {
    // Никакого движения: существо просто сидит за ноутбуком.
    draw('work', 0);
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

  // Во вкладке в фоне кадры не считаются: вернулись — существо просыпается.
  document.addEventListener('visibilitychange', wake);
})();
