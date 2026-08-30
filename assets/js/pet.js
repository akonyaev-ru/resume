/* Двое пиксельных существ, которые живут внизу страницы. Отто ходит вдоль
   нижнего края, раскрывает ноутбук и печатает; Оливия — розовая, с румянцем —
   гуляет и танцует на месте. Время от времени они сходятся: прыгают друг перед
   другом, а иногда она подходит и смотрит, как он работает. Оба отзываются на
   курсор и щелчок, обоих можно схватить и зашвырнуть.

   Рисунок настоящий пиксельный: таблицы ниже, где буква — цвет, точка — пустое
   место. Кадры тела одни на двоих, различаются только палитрой: клетки румянца
   помечены своей буквой, и у Отто она красится в цвет тела. Ноутбук — второй
   слой справа, он есть только у Отто. Каждый кадр один раз собирается в
   отдельный холст, дальше только копируется — перерисовывать сотни квадратиков
   в кадре незачем. При `prefers-reduced-motion` оба стоят на месте: Отто за
   раскрытым ноутбуком, Оливия просто рядом. */
(function () {
  'use strict';

  var LESS_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var PIXEL = 3;             // сторона «пикселя» рисунка, px

  var SPEED = 24;            // как быстро идёт, px в секунду
  var WALK_MS = 170;         // смена кадра шага
  var OPEN_MS = 130;         // кадр раскрытия крышки
  var BUSY_MS = 220;         // смена кадра за клавишами
  var DANCE_MS = 200;        // смена кадра в танце
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

  var MEET_EVERY = 26000;    // не чаще, чем раз в столько, они сходятся
  var MEET_SPAN = 24000;     // плюс случайная добавка
  var MEET_GAP = 6;          // просвет между ними, когда стоят рядом, px
  var RETRY_MS = 3000;       // сейчас не до встреч — вернуться к затее через
  var SCENE_MAX = 40000;     // предохранитель: дольше сцена не живёт
  var JUMP_MS = 460;         // такт прыжков на встрече
  var JUMP_UP_MS = 240;      // сколько такта они в воздухе
  var JUMPS = 4;             // сколько раз подпрыгивают
  var LOOK_CHANCE = 0.4;     // как часто вместо прыжков она идёт смотреть
  var LOOK_REACH = 420;      // с какого расстояния идёт: дальше — только прыжки
  var LOOK_MS = 6500;        // сколько стоит и смотрит, как он работает
  var LOOK_KEEP = 30000;     // столько он не бросит работу, пока она идёт

  /* Цвета у каждого свои, кадры общие. Буква `r` — румянец: у неё это розовые
     прямоугольники под глазами, у Отто — тот же цвет, что и у тела, то есть
     ничего не видно. Пропускать эти клетки, как незнакомый цвет, нельзя: у него
     на их месте были бы две дыры в теле. */
  var SKIN = {
    otto: {
      g: '#7c7cff',          // тело
      h: '#9a9aff',          // верхняя кромка светлее — тело не плоское
      d: '#5b5bd6',          // щупальца и нижняя кромка
      w: '#e7eaf2',          // белки глаз
      p: '#12141c',          // зрачки
      k: '#838da4',          // ноутбук
    },
    olivia: {
      g: '#ff86c0',
      h: '#ffaad6',
      d: '#d9639f',
      w: '#e7eaf2',
      p: '#12141c',
      r: '#ff5fa2',          // румянец
    },
  };

  // У Отто румянца нет: там, где он у неё, у него просто тело. Цвет берётся
  // ссылкой на его же — руками продублированный, он разъехался бы при первой
  // смене окраски.
  SKIN.otto.r = SKIN.otto.g;

  /* --- кадры ------------------------------------------------------------- */

  /* Точка — пусто, буква — цвет из палитры. Кадры тела одни на двоих:
     клетки румянца помечены буквой `r`, и каждый берёт по ней своё.
     Два слоя: существо шириной ровно в себя (при развороте зеркалится
     внутри своей рамки и не съезжает) и ноутбук, который не зеркалится
     никогда и есть только у Отто. Кадры перерисовывает
     tools/draw_pet.py — руками их не правят. */
  var ART = {
    idle: [[
        '............',
        '............',
        '.hhhhhhhhhh.',
        'hggggggggggh',
        'gggggggggggg',
        'ggwwggggwwgg',
        'ggwpggggwpgg',
        'ggwwggggwwgg',
        'ggrrggggrrgg',
        'dggggggggggd',
        '.dddddddddd.',
        '.dd.dd.dd.dd',
        '.dd.dd.dd.dd',
      ], [
        '............',
        '............',
        '............',
        '.hhhhhhhhhh.',
        'hggggggggggh',
        'gggggggggggg',
        'ggwwggggwwgg',
        'ggwpggggwpgg',
        'ggwwggggwwgg',
        'ggrrggggrrgg',
        'dggggggggggd',
        '.dddddddddd.',
        '.dd.dd.dd.dd',
      ]],
    blink: [[
        '............',
        '............',
        '.hhhhhhhhhh.',
        'hggggggggggh',
        'gggggggggggg',
        'gggggggggggg',
        'ggppggggppgg',
        'gggggggggggg',
        'ggrrggggrrgg',
        'dggggggggggd',
        '.dddddddddd.',
        '.dd.dd.dd.dd',
        '.dd.dd.dd.dd',
      ]],
    walk: [[
        '............',
        '............',
        '.hhhhhhhhhh.',
        'hggggggggggh',
        'gggggggggggg',
        'ggwwggggwwgg',
        'ggwpggggwpgg',
        'ggwwggggwwgg',
        'ggrrggggrrgg',
        'dggggggggggd',
        '.dddddddddd.',
        'dd..dd.dd.dd',
        '....dd....dd',
      ], [
        '............',
        '.hhhhhhhhhh.',
        'hggggggggggh',
        'gggggggggggg',
        'ggwwggggwwgg',
        'ggwpggggwpgg',
        'ggwwggggwwgg',
        'ggrrggggrrgg',
        'dggggggggggd',
        '.dddddddddd.',
        '.dd.dd.dd.dd',
        '.dd.dd.dd.dd',
        '............',
      ], [
        '............',
        '............',
        '.hhhhhhhhhh.',
        'hggggggggggh',
        'gggggggggggg',
        'ggwwggggwwgg',
        'ggwpggggwpgg',
        'ggwwggggwwgg',
        'ggrrggggrrgg',
        'dggggggggggd',
        '.dddddddddd.',
        '.dd..dd.dddd',
        '.dd.....dd..',
      ], [
        '............',
        '............',
        '.hhhhhhhhhh.',
        'hggggggggggh',
        'gggggggggggg',
        'ggwwggggwwgg',
        'ggwpggggwpgg',
        'ggwwggggwwgg',
        'ggrrggggrrgg',
        'dggggggggggd',
        '.dddddddddd.',
        '.dd.dd.dd.dd',
        '.dd.dd.dd.dd',
      ]],
    hop: [[
        '.hhhhhhhhhh.',
        'hggggggggggh',
        'gggggggggggg',
        'ggwwggggwwgg',
        'ggwpggggwpgg',
        'ggwwggggwwgg',
        'ggrrggggrrgg',
        'dggggggggggd',
        '.dddddddddd.',
        '...dd.dddd..',
        '...dd.dddd..',
        '............',
        '............',
      ]],
    dance: [[
        '............',
        '............',
        '............',
        '.hhhhhhhhhh.',
        'hggggggggggh',
        'gggggggggggg',
        'ggwwggggwwgg',
        'ggwpggggwpgg',
        'ggwwggggwwgg',
        'ggrrggggrrgg',
        'dggggggggggd',
        '.dddddddddd.',
        'dd.dd.dd.dd.',
      ], [
        '............',
        '.hhhhhhhhhh.',
        'hggggggggggh',
        'gggggggggggg',
        'ggwwggggwwgg',
        'ggwpggggwpgg',
        'ggwwggggwwgg',
        'ggrrggggrrgg',
        'dggggggggggd',
        '.dddddddddd.',
        '.dd.dd.dd.dd',
        '.dd.dd.dd.dd',
        '............',
      ], [
        '............',
        '............',
        '............',
        '.hhhhhhhhhh.',
        'hggggggggggh',
        'gggggggggggg',
        'ggwwggggwwgg',
        'ggwpggggwpgg',
        'ggwwggggwwgg',
        'ggrrggggrrgg',
        'dggggggggggd',
        '.dddddddddd.',
        '.dd.dd.dd.dd',
      ], [
        '............',
        '.hhhhhhhhhh.',
        'hggggggggggh',
        'gggggggggggg',
        'ggwwggggwwgg',
        'ggwpggggwpgg',
        'ggwwggggwwgg',
        'ggrrggggrrgg',
        'dggggggggggd',
        '.dddddddddd.',
        'dd.dd.dd.dd.',
        'dd.dd.dd.dd.',
        '............',
      ]],
    held: [[
        '............',
        '.hhhhhhhhhh.',
        'hggggggggggh',
        'gggggggggggg',
        'ggwwggggwwgg',
        'ggwpggggwpgg',
        'ggwwggggwwgg',
        'ggrrggggrrgg',
        'dggggggggggd',
        '.dddddddddd.',
        '.dd.dd.dd.dd',
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
        'ggrrggggrrgg',
        'dggggggggggd',
        '.dddddddddd.',
        'dd..dd.dd.dd',
        'dd..dd.dd.dd',
        'dd..dd.dd.dd',
      ], [
        '............',
        '.hhhhhhhhhh.',
        'hggggggggggh',
        'gggggggggggg',
        'ggwwggggwwgg',
        'ggwpggggwpgg',
        'ggwwggggwwgg',
        'ggrrggggrrgg',
        'dggggggggggd',
        '.dddddddddd.',
        '.dd.dd.dd.dd',
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
        'ggrrggggrrgg',
        'dggggggggggd',
        '.dddddddddd.',
        '.dd..dd.dddd',
        '.dd..dd.dddd',
        '.dd..dd.dddd',
      ]],
    fly: [[
        '............',
        '.hhhhhhhhhh.',
        'hggggggggggh',
        'gggggggggggg',
        'ggwwggggwwgg',
        'ggwpggggwpgg',
        'ggwwggggwwgg',
        'ggrrggggrrgg',
        'dggggggggggd',
        '.dddddddddd.',
        'dd.dd.dd.dd.',
        'dd.dd.dd.dd.',
        'dd.dd.dd.dd.',
      ], [
        '............',
        '.hhhhhhhhhh.',
        'hggggggggggh',
        'gggggggggggg',
        'ggwwggggwwgg',
        'ggwpggggwpgg',
        'ggwwggggwwgg',
        'ggrrggggrrgg',
        'dggggggggggd',
        '.dddddddddd.',
        '.dd.dd.dd.dd',
        '.dd.dd.dd.dd',
        '.dd.dd.dd.dd',
      ]],
    land: [[
        '............',
        '............',
        '............',
        '.hhhhhhhhhh.',
        'hggggggggggh',
        'gggggggggggg',
        'ggwwggggwwgg',
        'ggwpggggwpgg',
        'ggwwggggwwgg',
        'ggrrggggrrgg',
        'dggggggggggd',
        '.dddddddddd.',
        'dd.dd..dd.dd',
      ]],
  };

  // Сколько пустых строк рамки идёт над телом: запас на прыжок.
  // По ним считается, где холст ловит щелчок.
  var ART_TOP = 2;

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
  var PROP_W = LAPTOP[0][0].length;
  var ART_H = ART.idle[0].length;

  // На столько расходятся их `x`, когда они стоят бок о бок.
  var SPAN = BODY_W * PIXEL + MEET_GAP;

  function clamp(value, low, high) {
    return Math.min(high, Math.max(low, value));
  }

  function render(art, flip, skin) {
    var width = art[0].length;
    var canvas = document.createElement('canvas');
    canvas.width = width * PIXEL;
    canvas.height = ART_H * PIXEL;

    var ctx = canvas.getContext('2d');
    for (var y = 0; y < art.length; y += 1) {
      for (var x = 0; x < art[y].length; x += 1) {
        var color = skin[art[y].charAt(x)];
        if (!color) continue;

        ctx.fillStyle = color;
        ctx.fillRect((flip ? width - 1 - x : x) * PIXEL, y * PIXEL, PIXEL, PIXEL);
      }
    }

    return canvas;
  }

  /* Рисунок общий, цвета разные — значит и готовых холстов два набора. Собрать
     их один раз дешевле, чем красить пиксели в кадре. */
  function sheet(skin) {
    var out = {};

    Object.keys(ART).forEach(function (name) {
      out[name] = ART[name].map(function (art) {
        return { right: render(art, false, skin), left: render(art, true, skin) };
      });
    });

    return out;
  }

  /* --- существо ----------------------------------------------------------- */

  /* Оба умеют одно и то же, поэтому существо — не набор переменных модуля, как
     было при одном Отто, а фабрика: свой холст, своё состояние, свои
     обработчики. Кадровый цикл при этом один на двоих — он ниже. */
  function makePet(spec) {
    var sprites = sheet(spec.skin);

    /* Предмет — второй слой справа от тела, он не зеркалится. Есть он только у
       Отто; у Оливии своё занятие без предмета. Сколько кадров занимает
       раскрытие, считаем по самой таблице, а не числом в коде. */
    var prop = null;
    var busy = null;
    var openLast = 0;

    if (spec.prop) {
      prop = spec.prop.open.map(function (art) { return render(art, false, spec.skin); });
      busy = spec.prop.busy.map(function (art) { return render(art, false, spec.skin); });
      openLast = prop.length - 1;
    }

    var canvas = document.createElement('canvas');
    canvas.className = 'pet';
    // Холст шире рисунка только у того, кто носит с собой предмет.
    canvas.width = (BODY_W + (spec.prop ? PROP_W : 0)) * PIXEL;
    canvas.height = ART_H * PIXEL;
    canvas.setAttribute('aria-hidden', 'true');
    canvas.title = spec.title;

    var ctx = canvas.getContext('2d');

    var me = {
      x: 0,
      y: 0,                  // высота над нижним краем окна
      vx: 0,
      vy: 0,
      dir: 1,
      state: 'idle',
      until: 0,
      target: 0,
      frame: 0,
      frameAt: 0,
      blinkAt: 0,
      errand: null,          // куда позвал режиссёр встреч; null — занят собой
      facing: 1,             // и куда повернуться, когда дойдёт
      grab: null,
      dragged: false,
      hidden: false,
      canvas: canvas,
    };

    function limit() {
      return Math.max(EDGE, window.innerWidth - canvas.width - EDGE);
    }

    function place() {
      canvas.style.transform = 'translate(' + Math.round(me.x) + 'px,' +
        Math.round(-me.y) + 'px)';
    }

    function ceiling() {
      return Math.max(0, window.innerHeight - canvas.height);
    }

    /* Существо зеркалится внутри своей рамки — поэтому при развороте остаётся
       на месте, а не перепрыгивает. Ноутбук рисуется вторым слоем справа и
       всегда в одну сторону. */
    function draw(name, index, lap) {
      var set = sprites[name][index % sprites[name].length];
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(me.dir < 0 ? set.left : set.right, 0, 0);
      if (lap) ctx.drawImage(lap, BODY_W * PIXEL, 0);
    }

    function enter(state, now, until) {
      me.state = state;
      me.frame = 0;
      me.frameAt = now;
      me.until = until || 0;
    }

    function stroll(now) {
      me.target = EDGE + Math.random() * (limit() - EDGE);
      me.dir = me.target < me.x ? -1 : 1;
      enter('walk', now);
    }

    /* Что делать дальше: пройтись, заняться своим делом или постоять. Дело у
       каждого своё: Отто садится за ноутбук — и мордой вправо, потому что
       ставит его перед собой, — а Оливия танцует на месте. Позвал режиссёр —
       свои планы отменяются, идём на встречу. */
    function decide(now) {
      if (me.errand !== null) {
        me.target = me.errand;
        me.dir = me.target < me.x ? -1 : 1;
        enter('walk', now);
        return;
      }

      // Стоят друг в друге — сначала разойтись, дела потом. Без этого они
      // ждали бы конца случайной паузы, а это до пяти секунд внахлёст.
      if (tooClose()) {
        stepAside(now);
        return;
      }

      var roll = Math.random();

      if (roll < 0.44) {
        stroll(now);
      } else if (roll < 0.8) {
        if (spec.prop) {
          me.dir = 1;
          enter('open', now);
        } else {
          enter('dance', now, now + 4000 + Math.random() * 5000);
        }
      } else {
        enter('idle', now, now + 1800 + Math.random() * 3200);
      }
    }

    /* Режиссёр зовёт на место встречи: дойти до `x` и встать мордой в сторону
       `facing`. Занятие бросается сразу — иначе один топтался бы у места
       встречи, пока второй допечатывает свои десять секунд. */
    function summon(now, x, facing) {
      if (me.state === 'held' || me.state === 'fly') return;

      me.errand = clamp(x, EDGE, limit());
      me.facing = facing;

      // Раскрытое он закроет сам: раскрытие и закрытие идут по кадрам,
      // обрывать их на середине нельзя. Само дело обрывается сразу.
      if (me.state === 'busy') me.until = 0;
      else if (me.state !== 'open' && me.state !== 'close') decide(now);
    }

    /* Сквозь друг друга они не ходят. Идущего на встречу это правило не
       касается — там они как раз и должны сойтись бок о бок. */
    function tooClose() {
      return me.errand === null && me.mate &&
        Math.abs(me.mate.x - me.x) < SPAN;
    }

    // Мешает тот, кто оказался впереди по ходу и уже вплотную.
    function inTheWay() {
      if (!tooClose()) return false;
      var gap = me.mate.x - me.x;
      return (gap > 0) === (me.dir > 0);
    }

    /* Столкнулись — отходит прочь от второго, а не просто разворачивается:
       развернуться мало, если они уже налезли друг на друга. Стоят точь-в-точь
       на одном месте (обоих прижало к краю) — расходятся по своим сторонам,
       иначе оба шагнули бы в одну. Отходить некуда — просто стоит: топтание на
       месте выглядело бы поломкой. */
    function stepAside(now) {
      var gap = me.mate.x - me.x;
      var away = gap > 0 ? -1 : gap < 0 ? 1 : spec.aside;
      var spot = clamp(me.x + away * (SPAN + Math.random() * 160), EDGE, limit());

      if (Math.abs(spot - me.x) < 8) {
        enter('idle', now, now + 1500 + Math.random() * 2000);
        return;
      }

      me.dir = away;
      me.target = spot;
      enter('walk', now);
    }

    /* Пришёл. Шёл по своим делам — выбирает следующее занятие; звал режиссёр —
       встаёт лицом куда велено и ждёт, дальше сценой распоряжается он. */
    function arrive(now) {
      if (me.errand === null) {
        decide(now);
        return;
      }

      me.errand = null;
      me.dir = me.facing;
      enter('wait', now);
    }

    function update(now, step) {
      /* Подстраховка от любых будущих оплошностей: если он оказался выше пола,
         а его не держат и он не летит — он падает. */
      if (me.y > 0 && me.state !== 'held' && me.state !== 'fly') {
        enter('fly', now);
        return;
      }

      if (me.state === 'walk') {
        if (inTheWay()) { stepAside(now); return; }

        me.x += me.dir * SPEED * (step / 1000);
        if ((me.dir > 0 && me.x >= me.target) || (me.dir < 0 && me.x <= me.target)) {
          me.x = me.target;
          arrive(now);
        }
        me.x = Math.min(limit(), Math.max(EDGE, me.x));
        place();
        return;
      }

      // Предмет раскрывается кадр за кадром, потом идёт дело; закрывается он
      // теми же кадрами в обратную сторону.
      if (me.state === 'open' || me.state === 'close') {
        if (now - me.frameAt < OPEN_MS) return;

        me.frameAt = now;
        me.frame += 1;

        if (me.frame > openLast) {
          if (me.state !== 'open') decide(now);
          // Позвали, пока раскрывалось, — за дело он не садится вовсе:
          // закрывает обратно и идёт.
          else if (me.errand !== null) enter('close', now);
          else enter('busy', now, now + 8000 + Math.random() * 9000);
        }
        return;
      }

      if (me.state === 'busy') {
        if (now - me.frameAt > BUSY_MS) { me.frame += 1; me.frameAt = now; }
        if (now >= me.until) enter('close', now);
        return;
      }

      // Пока держат — он слушается курсора, а не себя.
      if (me.state === 'held') return;

      // Стоит у места встречи и прыгает по команде: этими двумя состояниями
      // распоряжается режиссёр, сам из них никто не выходит.
      if (me.state === 'wait' || me.state === 'jump') return;

      /* Брошенный летит по параболе, отскакивает от стен и от пола, пока не
         выдохнется. Пол — низ окна, стены — те же отступы, что и при ходьбе. */
      if (me.state === 'fly') {
        var dt = step / 1000;

        me.vy -= GRAVITY * dt;
        me.x += me.vx * dt;
        me.y += me.vy * dt;

        if (me.x < EDGE) { me.x = EDGE; me.vx = -me.vx * BOUNCE; }
        if (me.x > limit()) { me.x = limit(); me.vx = -me.vx * BOUNCE; }
        if (me.y > ceiling()) { me.y = ceiling(); me.vy = -me.vy * BOUNCE; }

        if (me.y <= 0) {
          me.y = 0;
          me.vx *= RUB;

          if (Math.abs(me.vy) < STICK) {
            me.vx = 0;
            me.vy = 0;
            enter('land', now, now + LAND_MS);
          } else {
            me.vy = -me.vy * BOUNCE;
          }
        }

        me.dir = me.vx < 0 ? -1 : 1;
        place();
        return;
      }

      if (me.state === 'land') {
        if (now >= me.until) decide(now);
        return;
      }

      if (now >= me.until) decide(now);
    }

    function pick(now) {
      if (me.state === 'walk') {
        if (now - me.frameAt > WALK_MS) { me.frame += 1; me.frameAt = now; }
        return draw('walk', me.frame, null);
      }

      if (me.state === 'open') return draw('idle', 0, prop[Math.min(me.frame, openLast)]);
      if (me.state === 'close') return draw('idle', 0, prop[Math.max(0, openLast - me.frame)]);
      // За делом идут те же два кадра дыхания, что и стоя, — меняется предмет.
      if (me.state === 'busy') return draw('idle', me.frame, busy[me.frame % busy.length]);
      if (me.state === 'hop') return draw('hop', 0, null);

      // Танцует на месте: приседает, подскакивает и перебирает щупальцами.
      if (me.state === 'dance') {
        if (now - me.frameAt > DANCE_MS) { me.frame += 1; me.frameAt = now; }
        return draw('dance', me.frame, null);
      }

      // На весу и в полёте он не картинка: щупальца перебирают сами по себе.
      if (me.state === 'held') return draw('held', Math.floor(now / SWAY_MS), null);
      if (me.state === 'fly') return draw('fly', Math.floor(now / FLAP_MS), null);
      if (me.state === 'land') return draw('land', 0, null);

      /* Прыжки на встрече отсчитываются от общего для обоих `frameAt`, поэтому
         они отрываются от земли и приземляются вместе. */
      if (me.state === 'jump') {
        return draw((now - me.frameAt) % JUMP_MS < JUMP_UP_MS ? 'hop' : 'idle', 0, null);
      }

      if (now - me.blinkAt > BLINK_EVERY) {
        if (now - me.blinkAt > BLINK_EVERY + BLINK_MS) me.blinkAt = now;
        return draw('blink', 0, null);
      }

      // Стоя существо дышит: два кадра сменяются медленно и сами по себе. Тем
      // же дышит и тот, кто ждёт у места встречи.
      return draw('idle', Math.floor(now / BREATH_MS), null);
    }

    function rest(open) {
      draw('idle', 0, open ? prop[openLast] : null);
    }

    /* Спрятанное стилями существо (узкий экран, печать) кадров не просит.
       Проверяется это не в кадре, а при изменении размера окна: чтение стиля
       заставляет браузер пересчитывать раскладку. `offsetParent` тут не
       годится — у элемента с `position: fixed` он пустой всегда. */
    function checkHidden() {
      me.hidden = window.getComputedStyle(canvas).display === 'none';
    }

    /* Курсор подошёл близко — существо останавливается и поворачивается к нему.
       Убегать не надо: оно любопытное, а не пугливое. За делом и по дороге на
       встречу не отвлекается, иначе оно обрывалось бы на полуслове. */
    function watch(x, y) {
      if (me.grab || me.errand !== null) return;
      if (me.state === 'open' || me.state === 'busy' || me.state === 'close' ||
        me.state === 'fly' || me.state === 'held' || me.state === 'dance' ||
        me.state === 'wait' || me.state === 'jump') return;

      var box = canvas.getBoundingClientRect();
      var near = x > box.left - WATCH_PX && x < box.right + WATCH_PX &&
        y > box.top - WATCH_PX && y < box.bottom + WATCH_PX;

      if (!near) return;

      me.dir = x < box.left + box.width / 2 ? -1 : 1;
      if (me.state === 'walk') enter('idle', performance.now(), performance.now() + 900);
    }

    /* Холст выше и шире рисунка: сверху запас под бантик и прыжок, справа —
       место под ноутбук. Чтобы эта пустота не съедала щелчки по странице, холст
       пропускает их сквозь себя и ловит только тогда, когда курсор
       действительно на существе. */
    function hover(x, y) {
      if (me.grab) return;          // пока держат, холст щелчки не отпускает

      var box = canvas.getBoundingClientRect();
      var on = x > box.left && x < box.left + PIXEL * BODY_W &&
        y > box.top + PIXEL * (ART_TOP + 3) && y < box.bottom;

      canvas.style.pointerEvents = on ? 'auto' : 'none';
    }

    function poke() {
      // После броска браузер шлёт ещё и click — прыгать в ответ на него не надо.
      if (me.dragged) { me.dragged = false; return; }

      enter('hop', performance.now(), performance.now() + HOP_MS);
      wake();
    }

    /* Каждого можно взять и потаскать. Пока держат, он висит на курсоре; при
       отпускании получает скорость последнего движения руки и летит. */
    function take(event) {
      if (LESS_MOTION || me.hidden) return;
      event.preventDefault();

      var box = canvas.getBoundingClientRect();
      me.grab = {
        dx: event.clientX - box.left,
        dy: event.clientY - box.top,
        x: event.clientX,
        y: event.clientY,
        at: performance.now(),
        vx: 0,
        vy: 0,
      };

      me.dragged = false;
      me.errand = null;             // на встречу его больше никто не ждёт
      canvas.classList.add('is-held');
      enter('held', performance.now());
      wake();
    }

    function haul(event) {
      if (!me.grab) return;

      var now = performance.now();
      var dt = Math.max(16, now - me.grab.at) / 1000;

      // Скорость руки считаем по последнему отрезку: бросок должен слушаться
      // того, как рука двигалась перед отпусканием, а не всего пути.
      me.grab.vx = (event.clientX - me.grab.x) / dt;
      me.grab.vy = (event.clientY - me.grab.y) / dt;
      me.grab.x = event.clientX;
      me.grab.y = event.clientY;
      me.grab.at = now;

      var x = clamp(event.clientX - me.grab.dx, EDGE, limit());
      var y = clamp(window.innerHeight - (event.clientY - me.grab.dy) - canvas.height,
        0, ceiling());

      // Считать перетаскиванием только сдвиг вбок было ошибкой: поднятый строго
      // вверх Отто числился нетронутым, щелчок после броска шёл за тычок, и
      // прыжок обрывал полёт — Отто оставался висеть в воздухе.
      if (Math.abs(x - me.x) > DRAG_PX || Math.abs(y - me.y) > DRAG_PX) me.dragged = true;

      me.x = x;
      me.y = y;
      place();
    }

    function toss() {
      if (!me.grab) return;

      // Экранный Y растёт вниз, наш — вверх, поэтому вертикальная меняет знак.
      me.vx = clamp(me.grab.vx, -THROW_MAX, THROW_MAX);
      me.vy = clamp(-me.grab.vy, -THROW_MAX, THROW_MAX);

      me.grab = null;
      canvas.classList.remove('is-held');
      enter('fly', performance.now());
      wake();
    }

    canvas.addEventListener('click', poke);
    canvas.addEventListener('mousedown', take);
    document.body.appendChild(canvas);

    me.limit = limit;
    me.place = place;
    me.enter = enter;
    me.decide = decide;
    me.summon = summon;
    me.update = update;
    me.pick = pick;
    me.rest = rest;
    me.checkHidden = checkHidden;
    me.watch = watch;
    me.hover = hover;
    me.haul = haul;
    me.toss = toss;

    return me;
  }

  // Подпись всплывает при наведении — у каждого своя, с именем.
  var otto = makePet({
    title: 'Погладить Отто', skin: SKIN.otto, aside: -1,
    prop: { open: LAPTOP, busy: LAPTOP_TYPE },
  });
  var olivia = makePet({
    title: 'Погладить Оливию', skin: SKIN.olivia, aside: 1,
  });
  var pets = [otto, olivia];

  // Знакомим их друг с другом: каждому нужно знать, где второй, чтобы не
  // пройти сквозь него.
  otto.mate = olivia;
  olivia.mate = otto;

  /* --- встречи ------------------------------------------------------------ */

  /* Раз в полминуты с небольшим они сходятся. Сценария два: попрыгать друг
     перед другом или — если Отто как раз за ноутбуком — постоять рядом и
     посмотреть, как он работает. Режиссёр только зовёт на место и назначает
     время; как идти, они знают сами. Любая сцена обрывается, стоит человеку
     схватить одного из них: держать чужое состояние у режиссёра права нет. */

  var scene = null;
  var meetAt = MEET_EVERY;

  function occupied(p) {
    return !!p.grab || p.state === 'held' || p.state === 'fly';
  }

  function endScene(now) {
    scene = null;
    meetAt = now + MEET_EVERY + Math.random() * MEET_SPAN;

    pets.forEach(function (p) {
      p.errand = null;
      if (p.state === 'wait' || p.state === 'jump') p.decide(now);
    });
  }

  /* Место встречи — посередине между ними, но так, чтобы в окно поместились
     оба: сначала ставим левого, правый встаёт от него в `SPAN`. */
  function callTogether(now) {
    var left = otto.x <= olivia.x ? otto : olivia;
    var right = left === otto ? olivia : otto;
    var far = Math.min(left.limit(), right.limit() - SPAN);
    if (far < EDGE) return false;

    var leftX = clamp((otto.x + olivia.x) / 2 - SPAN / 2, EDGE, far);
    left.summon(now, leftX, 1);
    right.summon(now, leftX + SPAN, -1);
    scene = { kind: 'jump', until: 0, deadline: now + SCENE_MAX };
    return true;
  }

  /* Она подходит посмотреть, как он работает. Встаёт с той стороны, с которой
     уже стоит: обходить его насквозь она не станет, а места хватает с обеих —
     слева вплотную, справа за ноутбуком. Идёт, только если он близко: через
     весь экран это была бы не встреча, а поход. */
  function callLook(now) {
    var left = olivia.x <= otto.x;
    var spot = left ? otto.x - SPAN : otto.x + otto.canvas.width + MEET_GAP;

    if (spot < EDGE || spot > olivia.limit()) return false;
    if (Math.abs(olivia.x - spot) > LOOK_REACH) return false;

    // Пока она идёт и смотрит, работу он не бросает.
    otto.until = Math.max(otto.until, now + LOOK_KEEP);
    olivia.summon(now, spot, left ? 1 : -1);
    scene = { kind: 'look', until: 0, deadline: now + SCENE_MAX };
    return true;
  }

  function direct(now) {
    if (!scene) {
      // Без сцены никто не должен оставаться в её состояниях.
      pets.forEach(function (p) {
        if (p.state === 'wait' || p.state === 'jump') p.decide(now);
      });

      if (now < meetAt || otto.hidden || olivia.hidden) return;
      if (occupied(otto) || occupied(olivia)) { meetAt = now + RETRY_MS; return; }

      // Не сложилось со сценой посмотреть — идут прыгать.
      var started = otto.state === 'busy' && Math.random() < LOOK_CHANCE && callLook(now);
      if (!started) started = callTogether(now);
      if (!started) meetAt = now + RETRY_MS;
      return;
    }

    // Схватили одного из них или сцена затянулась — расходимся.
    if (occupied(otto) || occupied(olivia) || now > scene.deadline) {
      endScene(now);
      return;
    }

    if (!scene.until) {
      if (scene.kind === 'look') {
        // Работу он мог и бросить — тогда смотреть не на что.
        if (otto.state !== 'busy') { endScene(now); return; }
        if (olivia.state !== 'wait') return;
        scene.until = now + LOOK_MS;
        return;
      }

      if (otto.state !== 'wait' || olivia.state !== 'wait') return;

      scene.until = now + JUMPS * JUMP_MS;
      otto.enter('jump', now, scene.until);
      olivia.enter('jump', now, scene.until);
      return;
    }

    if (now >= scene.until) endScene(now);
  }

  /* --- кадры -------------------------------------------------------------- */

  var running = false;
  var last = 0;

  function allHidden() {
    return otto.hidden && olivia.hidden;
  }

  function frame(now) {
    if (document.hidden || allHidden()) { running = false; return; }

    var step = last ? Math.min(now - last, 80) : 16.7;
    last = now;

    direct(now);
    pets.forEach(function (p) {
      p.update(now, step);
      p.pick(now);
    });

    window.requestAnimationFrame(frame);
  }

  function wake() {
    if (running || document.hidden || allHidden() || LESS_MOTION) return;
    running = true;
    last = 0;
    window.requestAnimationFrame(frame);
  }

  pets.forEach(function (p) { p.checkHidden(); });

  otto.x = clamp(64, EDGE, otto.limit());
  olivia.x = clamp(otto.x + SPAN + 96, EDGE, olivia.limit());
  pets.forEach(function (p) { p.place(); });

  if (LESS_MOTION) {
    pets.forEach(function (p) { p.rest(true); });
    return;
  }

  pets.forEach(function (p) { p.rest(false); });
  wake();

  window.addEventListener('mousemove', function (event) {
    pets.forEach(function (p) { p.haul(event); });
  }, { passive: true });

  window.addEventListener('mouseup', function () {
    pets.forEach(function (p) { p.toss(); });
  });

  if (FINE_POINTER) {
    window.addEventListener('mousemove', function (event) {
      pets.forEach(function (p) {
        p.watch(event.clientX, event.clientY);
        p.hover(event.clientX, event.clientY);
      });
    }, { passive: true });
  }

  window.addEventListener('resize', function () {
    pets.forEach(function (p) {
      p.checkHidden();
      p.x = Math.min(p.limit(), p.x);
      p.place();
    });
    // Окно могли растянуть с телефонной ширины обратно — тогда они появляются
    // снова, и их надо разбудить.
    wake();
  });

  // Во вкладке в фоне кадры не считаются: вернулись — существа просыпаются.
  document.addEventListener('visibilitychange', wake);
})();
