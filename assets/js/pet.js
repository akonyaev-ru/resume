/* Пиксельное существо, которое живёт внизу страницы: ходит вдоль нижнего края,
   раскрывает ноутбук и печатает, а на курсор и щелчок отзывается.

   Рисунок настоящий пиксельный: таблица ниже, где буква — цвет, точка — пустое
   место. Кадры нарисованы фигурами (см. историю коммитов) и вставлены
   готовыми; каждый один раз собирается в отдельный холст, дальше только
   копируется — перерисовывать сотни квадратиков в кадре незачем. При
   `prefers-reduced-motion` существо просто сидит за раскрытым ноутбуком. */
(function () {
  'use strict';

  var LESS_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var PIXEL = 3;             // сторона «пикселя» рисунка, px

  var SPEED = 24;            // как быстро идёт, px в секунду
  var WALK_MS = 170;         // смена кадра шага
  var OPEN_MS = 130;         // кадр раскрытия крышки
  var TYPE_MS = 220;         // смена кадра за клавишами
  var BREATH_MS = 1100;      // как медленно дышит, стоя на месте
  var SWAY_MS = 190;         // как часто перебирает щупальцами на весу
  var FLAP_MS = 110;         // и как часто полощет ими в полёте
  var BLINK_EVERY = 4600;    // как часто моргает
  var BLINK_MS = 140;
  var WATCH_PX = 110;        // на каком расстоянии замечает курсор
  var HOP_MS = 260;          // прыжок в ответ на щелчок
  var EDGE = 12;             // отступ от краёв окна

  var GRAVITY = 1700;        // px/с² — с каким ускорением падает брошенный
  var BOUNCE = 0.42;         // сколько скорости остаётся после удара о пол
  var RUB = 0.72;            // и сколько от горизонтальной после того же удара
  var STICK = 130;           // ниже этой скорости отскок прекращается, px/с
  var THROW_MAX = 1200;      // предел скорости броска, px/с
  var DRAG_PX = 3;           // с какого сдвига считаем, что это перетаскивание
  var LAND_MS = 200;         // сколько лежит осевшим после падения

  var COLORS = {
    g: '#7c7cff',            // тело
    h: '#9a9aff',            // верхняя кромка светлее — тело не плоское
    d: '#5b5bd6',            // щупальца и нижняя кромка
    w: '#e7eaf2',            // белки глаз
    p: '#12141c',            // зрачки
    k: '#838da4',            // ноутбук
  };

  /* --- кадры ------------------------------------------------------------- */

  /* Точка — пусто, буква — цвет из COLORS. Два слоя: существо шириной ровно
     в себя (при развороте зеркалится внутри своей рамки и не съезжает) и
     ноутбук, который не зеркалится никогда. Кадры перерисовывает
     tools/draw_pet.py — руками их не правят. */
  var ART = {
    idle: [[
        '.hhhhhhhhhh.',
        'hggggggggggh',
        'gggggggggggg',
        'ggwwggggwwgg',
        'ggwpggggwpgg',
        'ggwwggggwwgg',
        'gggggggggggg',
        'dggggggggggd',
        '.dddddddddd.',
        '.dd.dd.dd.dd',
        '.dd.dd.dd.dd',
      ], [
        '............',
        '.hhhhhhhhhh.',
        'hggggggggggh',
        'gggggggggggg',
        'ggwwggggwwgg',
        'ggwpggggwpgg',
        'ggwwggggwwgg',
        'gggggggggggg',
        'dggggggggggd',
        '.dddddddddd.',
        '.dd.dd.dd.dd',
      ]],
    blink: [[
        '.hhhhhhhhhh.',
        'hggggggggggh',
        'gggggggggggg',
        'gggggggggggg',
        'ggppggggppgg',
        'gggggggggggg',
        'gggggggggggg',
        'dggggggggggd',
        '.dddddddddd.',
        '.dd.dd.dd.dd',
        '.dd.dd.dd.dd',
      ]],
    walk: [[
        '.hhhhhhhhhh.',
        'hggggggggggh',
        'gggggggggggg',
        'ggwwggggwwgg',
        'ggwpggggwpgg',
        'ggwwggggwwgg',
        'gggggggggggg',
        'dggggggggggd',
        '.dddddddddd.',
        'dd..dd.dd.dd',
        '....dd....dd',
      ], [
        'hhhhhhhhhhhh',
        'gggggggggggg',
        'ggwwggggwwgg',
        'ggwpggggwpgg',
        'ggwwggggwwgg',
        'gggggggggggg',
        'dggggggggggd',
        '.dddddddddd.',
        '.dd.dd.dd.dd',
        '.dd.dd.dd.dd',
        '............',
      ], [
        '.hhhhhhhhhh.',
        'hggggggggggh',
        'gggggggggggg',
        'ggwwggggwwgg',
        'ggwpggggwpgg',
        'ggwwggggwwgg',
        'gggggggggggg',
        'dggggggggggd',
        '.dddddddddd.',
        '.dd..dd.dddd',
        '.dd.....dd..',
      ], [
        '.hhhhhhhhhh.',
        'hggggggggggh',
        'gggggggggggg',
        'ggwwggggwwgg',
        'ggwpggggwpgg',
        'ggwwggggwwgg',
        'gggggggggggg',
        'dggggggggggd',
        '.dddddddddd.',
        '.dd.dd.dd.dd',
        '.dd.dd.dd.dd',
      ]],
    hop: [[
        'hhhhhhhhhhhh',
        'ggwwggggwwgg',
        'ggwpggggwpgg',
        'ggwwggggwwgg',
        'gggggggggggg',
        'dggggggggggd',
        '.dddddddddd.',
        '...dd.dddd..',
        '...dd.dddd..',
        '............',
        '............',
      ]],
    type: [[
        '.hhhhhhhhhh.',
        'hggggggggggh',
        'gggggggggggg',
        'ggwwggggwwgg',
        'ggwpggggwpgg',
        'ggwwggggwwgg',
        'gggggggggggg',
        'dggggggggggd',
        '.dddddddddd.',
        '.dd.dd.dd.dd',
        '.dd.dd.dd.dd',
      ], [
        '............',
        '.hhhhhhhhhh.',
        'hggggggggggh',
        'gggggggggggg',
        'ggwwggggwwgg',
        'ggwpggggwpgg',
        'ggwwggggwwgg',
        'gggggggggggg',
        'dggggggggggd',
        '.dddddddddd.',
        '.dd.dd.dd.dd',
      ]],
    held: [[
        'hhhhhhhhhhhh',
        'gggggggggggg',
        'ggwwggggwwgg',
        'ggwpggggwpgg',
        'ggwwggggwwgg',
        'gggggggggggg',
        'dggggggggggd',
        '.dddddddddd.',
        '.dd.dd.dd.dd',
        '.dd.dd.dd.dd',
        '.dd.dd.dd.dd',
      ], [
        'hhhhhhhhhhhh',
        'gggggggggggg',
        'ggwwggggwwgg',
        'ggwpggggwpgg',
        'ggwwggggwwgg',
        'gggggggggggg',
        'dggggggggggd',
        '.dddddddddd.',
        'dd..dd.dd.dd',
        'dd..dd.dd.dd',
        'dd..dd.dd.dd',
      ], [
        'hhhhhhhhhhhh',
        'gggggggggggg',
        'ggwwggggwwgg',
        'ggwpggggwpgg',
        'ggwwggggwwgg',
        'gggggggggggg',
        'dggggggggggd',
        '.dddddddddd.',
        '.dd.dd.dd.dd',
        '.dd.dd.dd.dd',
        '.dd.dd.dd.dd',
      ], [
        'hhhhhhhhhhhh',
        'gggggggggggg',
        'ggwwggggwwgg',
        'ggwpggggwpgg',
        'ggwwggggwwgg',
        'gggggggggggg',
        'dggggggggggd',
        '.dddddddddd.',
        '.dd..dd.dddd',
        '.dd..dd.dddd',
        '.dd..dd.dddd',
      ]],
    fly: [[
        'hhhhhhhhhhhh',
        'gggggggggggg',
        'ggwwggggwwgg',
        'ggwpggggwpgg',
        'ggwwggggwwgg',
        'gggggggggggg',
        'dggggggggggd',
        '.dddddddddd.',
        'dd.dd.dd.dd.',
        'dd.dd.dd.dd.',
        'dd.dd.dd.dd.',
      ], [
        'hhhhhhhhhhhh',
        'gggggggggggg',
        'ggwwggggwwgg',
        'ggwpggggwpgg',
        'ggwwggggwwgg',
        'gggggggggggg',
        'dggggggggggd',
        '.dddddddddd.',
        '.dd.dd.dd.dd',
        '.dd.dd.dd.dd',
        '.dd.dd.dd.dd',
      ]],
    land: [[
        '............',
        '.hhhhhhhhhh.',
        'hggggggggggh',
        'gggggggggggg',
        'ggwwggggwwgg',
        'ggwpggggwpgg',
        'ggwwggggwwgg',
        'gggggggggggg',
        'dggggggggggd',
        '.dddddddddd.',
        'dd.dd..dd.dd',
      ]],
  };

  // Крышка: лежит, поднимается, поднимается выше, откинута назад.
  var LAPTOP = [
    [
        '.......',
        '.......',
        '.......',
        '.......',
        '.......',
        '.......',
        '.......',
        '.......',
        '.......',
        'kkkkk..',
        'kkkkk..',
      ],
    [
        '.......',
        '.......',
        '.......',
        '.......',
        '.......',
        '.......',
        '.......',
        '.......',
        '..k....',
        '...kk..',
        'kkkkk..',
      ],
    [
        '.......',
        '.......',
        '.......',
        '.......',
        '.......',
        '.......',
        '...k...',
        '...k...',
        '....k..',
        '....k..',
        'kkkkk..',
      ],
    [
        '.......',
        '.......',
        '.......',
        '.......',
        '.......',
        '.....kk',
        '.....kk',
        '....kk.',
        '....kk.',
        '....kk.',
        'kkkkk..',
      ],
  ];

  // Тот же раскрытый ноутбук, но с двумя щупальцами на клавишах.
  var LAPTOP_TYPE = [
    [
        '.......',
        '.......',
        '.......',
        '.......',
        '.......',
        '.....kk',
        '...ddkk',
        '...ddk.',
        'dd..kk.',
        'dd..kk.',
        'kkkkk..',
      ],
    [
        '.......',
        '.......',
        '.......',
        '.......',
        '.......',
        '.....kk',
        'dd...kk',
        'dd..kk.',
        '...ddk.',
        '...ddk.',
        'kkkkk..',
      ],
  ];

  /* --- сборка кадров ----------------------------------------------------- */

  // Размеры берутся из самих кадров, чтобы не разъезжаться с рисовалкой.
  var BODY_W = ART.idle[0][0].length;
  var LAP_W = LAPTOP[0][0].length;
  var ART_H = ART.idle[0].length;
  var OPEN_LAST = LAPTOP.length - 1;

  function render(art, flip) {
    var width = art[0].length;
    var canvas = document.createElement('canvas');
    canvas.width = width * PIXEL;
    canvas.height = ART_H * PIXEL;

    var ctx = canvas.getContext('2d');
    for (var y = 0; y < art.length; y += 1) {
      for (var x = 0; x < art[y].length; x += 1) {
        var color = COLORS[art[y].charAt(x)];
        if (!color) continue;

        ctx.fillStyle = color;
        ctx.fillRect((flip ? width - 1 - x : x) * PIXEL, y * PIXEL, PIXEL, PIXEL);
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

  // Ноутбук зеркалить нельзя: он должен стоять на месте и открываться в одну
  // сторону, как бы существо ни разворачивалось.
  var laptops = LAPTOP.map(function (art) { return render(art, false); });
  var lapTypes = LAPTOP_TYPE.map(function (art) { return render(art, false); });

  /* --- паучок ------------------------------------------------------------ */

  var canvas = document.createElement('canvas');
  canvas.className = 'pet';
  canvas.width = (BODY_W + LAP_W) * PIXEL;
  canvas.height = ART_H * PIXEL;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.title = 'Погладить';

  var ctx = canvas.getContext('2d');
  var pet = {
    x: 0,
    y: 0,                    // высота над нижним краем окна
    vx: 0,
    vy: 0,
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
    canvas.style.transform = 'translate(' + Math.round(pet.x) + 'px,' +
      Math.round(-pet.y) + 'px)';
  }

  function clamp(value, low, high) {
    return Math.min(high, Math.max(low, value));
  }

  function ceiling() {
    return Math.max(0, window.innerHeight - canvas.height);
  }

  /* Существо зеркалится внутри своей рамки — поэтому при развороте остаётся на
     месте, а не перепрыгивает. Ноутбук рисуется вторым слоем справа и всегда в
     одну сторону. */
  function draw(name, index, lap) {
    var set = sprites[name][index % sprites[name].length];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(pet.dir < 0 ? set.left : set.right, 0, 0);
    if (lap) ctx.drawImage(lap, BODY_W * PIXEL, 0);
  }

  function enter(state, now, until) {
    pet.state = state;
    pet.frame = 0;
    pet.frameAt = now;
    pet.until = until || 0;
  }

  /* Что делать дальше: пройтись, сесть за ноутбук или постоять. Ноутбук
     существо ставит перед собой, поэтому работать садится мордой вправо. */
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
    /* Подстраховка от любых будущих оплошностей: если Отто оказался выше пола,
       а его не держат и он не летит — он падает. */
    if (pet.y > 0 && pet.state !== 'held' && pet.state !== 'fly') {
      enter('fly', now);
      return;
    }

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

      if (pet.frame > OPEN_LAST) {
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

    // Пока держат — Отто слушается курсора, а не себя.
    if (pet.state === 'held') return;

    /* Брошенный летит по параболе, отскакивает от стен и от пола, пока не
       выдохнется. Пол — низ окна, стены — те же отступы, что и при ходьбе. */
    if (pet.state === 'fly') {
      var dt = step / 1000;

      pet.vy -= GRAVITY * dt;
      pet.x += pet.vx * dt;
      pet.y += pet.vy * dt;

      if (pet.x < EDGE) { pet.x = EDGE; pet.vx = -pet.vx * BOUNCE; }
      if (pet.x > limit()) { pet.x = limit(); pet.vx = -pet.vx * BOUNCE; }
      if (pet.y > ceiling()) { pet.y = ceiling(); pet.vy = -pet.vy * BOUNCE; }

      if (pet.y <= 0) {
        pet.y = 0;
        pet.vx *= RUB;

        if (Math.abs(pet.vy) < STICK) {
          pet.vx = 0;
          pet.vy = 0;
          enter('land', now, now + LAND_MS);
        } else {
          pet.vy = -pet.vy * BOUNCE;
        }
      }

      pet.dir = pet.vx < 0 ? -1 : 1;
      place();
      return;
    }

    if (pet.state === 'land') {
      if (now >= pet.until) decide(now);
      return;
    }


    if (now >= pet.until) decide(now);
  }

  function pick(now) {
    if (pet.state === 'walk') {
      if (now - pet.frameAt > WALK_MS) { pet.frame += 1; pet.frameAt = now; }
      return draw('walk', pet.frame, null);
    }

    if (pet.state === 'open') return draw('idle', 0, laptops[Math.min(pet.frame, OPEN_LAST)]);
    if (pet.state === 'close') return draw('idle', 0, laptops[Math.max(0, OPEN_LAST - pet.frame)]);
    if (pet.state === 'type') {
      return draw('type', pet.frame, lapTypes[pet.frame % lapTypes.length]);
    }
    if (pet.state === 'hop') return draw('hop', 0, null);
    // На весу и в полёте Отто не картинка: щупальца перебирают сами по себе.
    if (pet.state === 'held') return draw('held', Math.floor(now / SWAY_MS), null);
    if (pet.state === 'fly') return draw('fly', Math.floor(now / FLAP_MS), null);
    if (pet.state === 'land') return draw('land', 0, null);

    if (now - pet.blinkAt > BLINK_EVERY) {
      if (now - pet.blinkAt > BLINK_EVERY + BLINK_MS) pet.blinkAt = now;
      return draw('blink', 0, null);
    }

    // Стоя существо дышит: два кадра сменяются медленно и сами по себе.
    return draw('idle', Math.floor(now / BREATH_MS), null);
  }

  /* Спрятанное стилями существо (узкий экран, печать) кадров не просит.
     Проверяется это не в кадре, а при изменении размера окна: чтение стиля
     заставляет браузер пересчитывать раскладку. `offsetParent` тут не годится —
     у элемента с `position: fixed` он пустой всегда. */
  var hiddenByStyle = false;

  function checkHidden() {
    hiddenByStyle = window.getComputedStyle(canvas).display === 'none';
  }

  function frame(now) {
    if (document.hidden || hiddenByStyle) { running = false; return; }

    var step = last ? Math.min(now - last, 80) : 16.7;
    last = now;

    update(now, step);
    pick(now);

    window.requestAnimationFrame(frame);
  }

  function wake() {
    if (running || document.hidden || hiddenByStyle || LESS_MOTION) return;
    running = true;
    last = 0;
    window.requestAnimationFrame(frame);
  }

  /* --- разговор с человеком ---------------------------------------------- */

  /* Курсор подошёл близко — существо останавливается и поворачивается к нему.
     Убегать не надо: он любопытный, а не пугливый. За ноутбуком не отвлекается,
     иначе работа обрывалась бы на полуслове. */
  function watch(x, y) {
    if (grab || pet.state === 'open' || pet.state === 'type' ||
      pet.state === 'close' || pet.state === 'fly' || pet.state === 'held') return;

    var box = canvas.getBoundingClientRect();
    var near = x > box.left - WATCH_PX && x < box.right + WATCH_PX &&
      y > box.top - WATCH_PX && y < box.bottom + WATCH_PX;

    if (!near) return;

    pet.dir = x < box.left + box.width / 2 ? -1 : 1;
    if (pet.state === 'walk') enter('idle', performance.now(), performance.now() + 900);
  }

  /* Холст шире существа — за ним место под ноутбук. Чтобы эта пустота не
     съедала щелчки по странице, холст пропускает их сквозь себя и ловит только
     тогда, когда курсор действительно на существе. */
  function hover(x, y) {
    if (grab) return;          // пока держат, холст щелчки не отпускает

    var box = canvas.getBoundingClientRect();
    var on = x > box.left && x < box.left + PIXEL * BODY_W &&
      y > box.top + PIXEL * 3 && y < box.bottom;

    canvas.style.pointerEvents = on ? 'auto' : 'none';
  }

  function poke() {
    // После броска браузер шлёт ещё и click — прыгать в ответ на него не надо.
    if (dragged) { dragged = false; return; }

    enter('hop', performance.now(), performance.now() + HOP_MS);
    wake();
  }

  /* Отто можно взять и потаскать. Пока держат, он висит на курсоре; при
     отпускании получает скорость последнего движения руки и летит. */
  var grab = null;
  var dragged = false;

  function take(event) {
    if (LESS_MOTION || hiddenByStyle) return;
    event.preventDefault();

    var box = canvas.getBoundingClientRect();
    grab = {
      dx: event.clientX - box.left,
      dy: event.clientY - box.top,
      x: event.clientX,
      y: event.clientY,
      at: performance.now(),
      vx: 0,
      vy: 0,
    };

    dragged = false;
    canvas.classList.add('is-held');
    enter('held', performance.now());
    wake();
  }

  function haul(event) {
    if (!grab) return;

    var now = performance.now();
    var dt = Math.max(16, now - grab.at) / 1000;

    // Скорость руки считаем по последнему отрезку: бросок должен слушаться
    // того, как рука двигалась перед отпусканием, а не всего пути.
    grab.vx = (event.clientX - grab.x) / dt;
    grab.vy = (event.clientY - grab.y) / dt;
    grab.x = event.clientX;
    grab.y = event.clientY;
    grab.at = now;

    var x = clamp(event.clientX - grab.dx, EDGE, limit());
    var y = clamp(window.innerHeight - (event.clientY - grab.dy) - canvas.height,
      0, ceiling());

    // Считать перетаскиванием только сдвиг вбок было ошибкой: поднятый вверх
    // Отто считался нетронутым, щелчок после броска шёл за тычок, и прыжок
    // обрывал полёт — Отто оставался висеть в воздухе.
    if (Math.abs(x - pet.x) > DRAG_PX || Math.abs(y - pet.y) > DRAG_PX) dragged = true;

    pet.x = x;
    pet.y = y;
    place();
  }

  function toss() {
    if (!grab) return;

    // Экранный Y растёт вниз, наш — вверх, поэтому вертикальная меняет знак.
    pet.vx = clamp(grab.vx, -THROW_MAX, THROW_MAX);
    pet.vy = clamp(-grab.vy, -THROW_MAX, THROW_MAX);

    grab = null;
    canvas.classList.remove('is-held');
    enter('fly', performance.now());
    wake();
  }

  document.body.appendChild(canvas);
  checkHidden();
  pet.x = Math.min(limit(), 64);
  place();

  if (LESS_MOTION) {
    draw('idle', 0, laptops[OPEN_LAST]);
    return;
  }

  draw('idle', 0, null);
  wake();

  canvas.addEventListener('click', poke);
  canvas.addEventListener('mousedown', take);
  window.addEventListener('mousemove', haul, { passive: true });
  window.addEventListener('mouseup', toss);

  if (FINE_POINTER) {
    window.addEventListener('mousemove', function (event) {
      watch(event.clientX, event.clientY);
      hover(event.clientX, event.clientY);
    }, { passive: true });
  }

  window.addEventListener('resize', function () {
    checkHidden();
    pet.x = Math.min(limit(), pet.x);
    place();
    // Окно могли растянуть с телефонной ширины обратно — тогда существо
    // появляется снова и его надо разбудить.
    wake();
  });

  // Во вкладке в фоне кадры не считаются: вернулись — существо просыпается.
  document.addEventListener('visibilitychange', wake);
})();
