/* Двое пиксельных существ, которые живут внизу страницы. Отто ходит вдоль
   нижнего края, раскрывает ноутбук и печатает; Оливия — розовая — гуляет и
   танцует на месте. Время от времени они сходятся: прыгают друг перед
   другом, а иногда она подходит и смотрит, как он работает. Оба отзываются на
   курсор и щелчок, обоих можно схватить и зашвырнуть. Кого зашвырнули, того
   второй встречает пузырём с тремя восклицательными, бросает дела и бежит
   утешать: встаёт рядом и гладит по щеке.

   Рисунок настоящий пиксельный: таблицы ниже, где буква — цвет, точка — пустое
   место. Кадры тела одни на двоих, различаются только палитрой. Ноутбук — второй
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
  var RUN_SPEED = 115;       // и как быстро бежит на выручку
  var WALK_MS = 170;         // смена кадра шага
  var RUN_MS = 70;           // и смена кадра у бегущего
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
  /* Мебель падает иначе, чем существо: строго вниз и почти без отскока.
     Отскок вдобавок подрезан сверху — с высоты в пол-экрана «честный» отскок
     превращал полку в мячик. */
  var THING_BOUNCE = 0.18;   // сколько скорости остаётся после удара о пол
  var THING_HOP = 160;       // и не больше этого, px/с — предел отскока
  var THING_STICK = 90;      // ниже этой скорости отскок прекращается

  var LAND_MS = 200;         // сколько лежит осевшим после падения
  var SWEAR_MS = 1900;       // сколько висит пузырь с восклицательными
  var PET_MS = 2800;         // сколько гладит упавшую
  var PET_FRAME_MS = 320;    // и такт самого поглаживания

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

  /* Цвета у каждого свои, кадры общие. */
  var SKIN = {
    otto: {
      g: '#6e9bff',          // тело
      h: '#8cb4ff',          // верхняя кромка светлее — тело не плоское
      d: '#4d78d6',          // щупальца и нижняя кромка
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
      k: '#838da4',          // тот же серый, что у ноутбука Отто
    },
    /* Обстановка: цвета приглушённые, ни один не спорит с акцентом
       страницы — мебель стоит фоном, а не в центре. */
    plant: {
      l: '#5fae74',          // лист посветлее
      m: '#3f8259',          // и потемнее — чтобы их было видно поштучно
      h: '#7fc48f',          // блик на листе: свет слева, как у всего остального
      s: '#2f6444',          // стебель
      r: '#a9694c',          // обод кадки
      p: '#8a5340',          // её корпус
      w: '#bd7d5c',          // светлая грань кадки
      n: '#2e2018',          // земля под ободом
    },
    ficus: {
      l: '#5fae74',          // крона на свету
      m: '#3f8259',          // и в тени — те же зелёные, что у растения
      s: '#7a5a3c',          // ствол
      b: '#96724c',          // его светлая грань — коричневая, а не зелёная
      r: '#a9694c',          // обод кадки
      p: '#8a5340',          // её корпус
      w: '#bd7d5c',          // светлая грань кадки
      n: '#2e2018',          // земля под ободом
    },
    sofa: {
      f: '#4e6472',          // рама и обивка
      c: '#5e7787',          // подушки посветлее
      h: '#7a8fa0',          // светлые кромки: верх спинки и подлокотников
      d: '#3a4a56',          // швы, пуговицы и тени
      p: '#c9a227',          // плед горчичный — выбор владельца из четырёх
      q: '#e6c65f',          // и его светлые складки
      k: '#2a3038',          // ножки
    },
    shelf: {
      f: '#39404f',          // корпус и полки
      e: '#171c28',          // задняя стенка
      1: '#5a7fd6',
      2: '#c96fa0',
      3: '#2f9aa3',
      4: '#c39a4e',
      5: '#7d6bb0',
    },
  };

  /* --- кадры ------------------------------------------------------------- */

  /* Точка — пусто, буква — цвет из палитры. Кадры тела одни на двоих:
     Отто и Оливия отличаются только палитрой.
     Два слоя: существо шириной ровно в себя (при развороте зеркалится
     внутри своей рамки и не съезжает) и предмет, который не зеркалится
     никогда: ноутбук у Отто, лист бумаги у Оливии. Кадры перерисовывает
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
        'gggggggggggg',
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
        'gggggggggggg',
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
        'gggggggggggg',
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
        'gggggggggggg',
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
        'gggggggggggg',
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
        'gggggggggggg',
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
        'gggggggggggg',
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
        'gggggggggggg',
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
        'gggggggggggg',
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
        'gggggggggggg',
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
        'gggggggggggg',
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
        'gggggggggggg',
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
        'gggggggggggg',
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
        'gggggggggggg',
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
        'gggggggggggg',
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
        'gggggggggggg',
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
        'gggggggggggg',
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
        'gggggggggggg',
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
        'gggggggggggg',
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

  // Лист бумаги Оливии: поднимается от пола к глазам, наклонный.
  var PAPERS = [
    [
        '.......',
        '.......',
        '.......',
        '.......',
        '.......',
        '.......',
        '.......',
        '...ww..',
        '...ww..',
        '..ww...',
        '..ww...',
        '.ww....',
        'ddw....',
      ],
    [
        '.......',
        '.......',
        '.......',
        '.......',
        '.......',
        '.......',
        '...ww..',
        '...ww..',
        '..ww...',
        '..ww...',
        '.ww....',
        'ddw....',
        'dd.....',
      ],
    [
        '.......',
        '.......',
        '.......',
        '.......',
        '.......',
        '...ww..',
        '...ww..',
        '..ww...',
        '..ww...',
        '.ww....',
        'ddw....',
        'dd.....',
        '.......',
      ],
    [
        '.......',
        '.......',
        '.......',
        '.......',
        '...ww..',
        '...ww..',
        '..ww...',
        '..ww...',
        '.ww....',
        'ddw....',
        'dd.....',
        '.......',
        '.......',
      ],
  ];

  // Лист на весу покачивается на клетку — она его просматривает.
  var PAPERS_LEAF = [
    [
        '.......',
        '.......',
        '.......',
        '.......',
        '...ww..',
        '...ww..',
        '..ww...',
        '..ww...',
        '.ww....',
        'ddw....',
        'dd.....',
        '.......',
        '.......',
      ],
    [
        '.......',
        '.......',
        '.......',
        '.......',
        '.......',
        '...ww..',
        '...ww..',
        '..ww...',
        '..ww...',
        '.ww....',
        'ddw....',
        'dd.....',
        '.......',
      ],
  ];

  // Щупальце, которым Отто гладит соседку: то на макушке, то над.
  var PET = [
    [
        '.......',
        '.......',
        '.......',
        '.......',
        '.......',
        '.......',
        '.......',
        'dd.....',
        'dd.....',
        '.......',
        '.......',
        '.......',
        '.......',
      ],
    [
        '.......',
        '.......',
        '.......',
        '.......',
        '.......',
        'dd.....',
        'dd.....',
        '.......',
        '.......',
        '.......',
        '.......',
        '.......',
        '.......',
      ],
  ];

  // Пузырь ругани: белое облачко с тремя восклицательными.
  var BUBBLE = [
        '.wwwwwww.',
        'wwpwpwpww',
        'wwpwpwpww',
        'wwwwwwwww',
        'wwpwpwpww',
        '.wwwwwww.',
        '..ww.....',
      ];

  // Книжная полка: корпус, три отсека с книгами, ножки. Кадр один —
  // она не шевелится, её только двигают.
  var SHELF = [
        'ffffffffffffff',
        'f11ee33e55eeef',
        'f11223345511ef',
        'f11223345511ef',
        'f11223345511ef',
        'ffffffffffffff',
        'fee511ee3344ef',
        'f44511223344ef',
        'f44511223344ef',
        'f44511223344ef',
        'ffffffffffffff',
        'f55ee1122e55ef',
        'f55331122455ef',
        'f55331122455ef',
        'f55331122455ef',
        'ffffffffffffff',
        'fff........fff',
        'fff........fff',
      ];

  // Растение в кадке: четыре листа на стеблях. Кадр тоже один.
  var PLANT = [
        '....hll......',
        '...hllll.....',
        '....lll.hmm..',
        '.hmm.s.hmmmm.',
        'hmmmms..mmm..',
        '.mmm..s.s....',
        '....s.ss.hll.',
        '.....ssshllll',
        '......ssslll.',
        '.rnnnnnnnnnr.',
        '..wpppppppp..',
        '..wpppppppp..',
        '...ppppppp...',
      ];

  // Диван: низкий и широкий, с подушками и подлокотниками.
  var SOFA = [
        '.....hhhhhhhhhhhhhhhh.....',
        '....fccccccccdcccccccf....',
        '....fccccccccdcccccccf....',
        '....fcccdccccdcccdcccf....',
        'qqqqfccccccccdcccccccfhhh.',
        'ppqpfccccccccdcccccccfdfff',
        'ppqpfccccccccdcccccccfdfff',
        'fpppffffffffffffffffffdfff',
        'fpppcccccccccdccccccccdfff',
        'fpfqcccccccccdccccccccdfff',
        'ffffddddddddddddddddddffff',
        '.kk....................kk.',
      ];

  // Фикус: деревце со стволом и густой кроной.
  var FICUS = [
        '.....llmm....',
        '....llllmmm..',
        '..llmlllmmmm.',
        '.lllllllmmm..',
        '..llllmlmmmm.',
        '..lmllllmmmm.',
        '..lllllmmm...',
        '....mmmmmm...',
        '....mmmmm....',
        '......bs.....',
        '......bs.....',
        '......bs.....',
        '..rnnnnnnnr..',
        '...wpppppp...',
        '...wpppppp...',
        '...ppppppp...',
      ];

  /* --- сборка кадров ----------------------------------------------------- */

  // Размеры берутся из самих кадров, чтобы не разъезжаться с рисовалкой.
  var BODY_W = ART.idle[0][0].length;
  var PROP_W = LAPTOP[0][0].length;
  var ART_H = ART.idle[0].length;

  /* Пузырь ругани всплывает над головой, поэтому холст выше рисунка на его
     высоту. Размеры берутся из самого пузыря, чтобы не разъехаться с
     рисовалкой. */
  var BUBBLE_H = BUBBLE.length;
  var BUBBLE_X = 2;          // на сколько клеток пузырь сдвинут вправо

  // На столько расходятся их `x`, когда они стоят бок о бок.
  var SPAN = BODY_W * PIXEL + MEET_GAP;

  function clamp(value, low, high) {
    return Math.min(high, Math.max(low, value));
  }

  function render(art, flip, skin) {
    var width = art[0].length;
    var canvas = document.createElement('canvas');
    canvas.width = width * PIXEL;
    canvas.height = art.length * PIXEL;

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

    /* Предмет — второй слой справа от тела, он не зеркалится. Есть он у
       обоих: Отто раскрывает ноутбук, Оливия поднимает лист бумаги. Сколько
       кадров занимает раскрытие, считаем по самой таблице, а не числом в
       коде. */
    var prop = null;
    var busy = null;
    var openLast = 0;
    var bubble = render(BUBBLE, false, spec.skin);
    var hands = PET.map(function (art) { return render(art, false, spec.skin); });

    if (spec.prop) {
      prop = spec.prop.open.map(function (art) { return render(art, false, spec.skin); });
      busy = spec.prop.busy.map(function (art) { return render(art, false, spec.skin); });
      openLast = prop.length - 1;
    }

    var canvas = document.createElement('canvas');
    canvas.className = 'pet';
    /* Холст шире рисунка у обоих: справа место под предмет и под квадратик,
       которым гладят соседа, — они живут в одном слое. */
    canvas.width = (BODY_W + PROP_W) * PIXEL;
    canvas.height = (ART_H + BUBBLE_H) * PIXEL;
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
      swearUntil: 0,         // до какого времени висит пузырь
      hurry: false,          // на выручку он бежит, а не идёт
      errand: null,          // куда позвал режиссёр встреч; null — занят собой
      facing: 1,             // и куда повернуться, когда дойдёт
      grab: null,
      dragged: false,
      hidden: false,
      canvas: canvas,
    };

    function limit() {
      // Ширина без полосы прокрутки: `innerWidth` считает её своей, и предмет
      // у правого края уезжал под ползунок.
      return Math.max(EDGE, document.documentElement.clientWidth - canvas.width - EDGE);
    }

    function place() {
      canvas.style.transform = 'translate(' + Math.round(me.x) + 'px,' +
        Math.round(-me.y) + 'px)';
    }

    function ceiling() {
      return Math.max(0, window.innerHeight - canvas.height);
    }

    /* Существо зеркалится внутри своей рамки — поэтому при развороте остаётся
       на месте, а не перепрыгивает. Предмет — ноутбук у Отто, лист бумаги
       у Оливии — рисуется вторым слоем справа и всегда в одну сторону, пузырь
       ругани — третьим, поверх всего. Само
       существо стоит не у верхнего края холста, а ниже на высоту пузыря: холст
       прижат к низу окна, и запас сверху ничего не сдвигает. */
    function draw(name, index, lap) {
      var now = performance.now();
      var set = sprites[name][index % sprites[name].length];
      var top = BUBBLE_H * PIXEL;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(me.dir < 0 ? set.left : set.right, 0, top);
      if (lap) ctx.drawImage(lap, BODY_W * PIXEL, top);

      if (me.swearUntil > now && me.state !== 'held' && me.state !== 'fly') {
        ctx.drawImage(bubble, BUBBLE_X * PIXEL, 0);
      }
    }

    function enter(state, now, until) {
      me.state = state;
      me.frame = 0;
      me.frameAt = now;
      me.until = until || 0;
    }

    function stroll(now) {
      me.hurry = false;
      me.target = EDGE + Math.random() * (limit() - EDGE);
      me.dir = me.target < me.x ? -1 : 1;
      enter('walk', now);
    }

    /* Что делать дальше: пройтись, заняться своим делом или постоять. Дело у
       каждого своё, но у обоих с предметом и мордой вправо: слой предмета не
       зеркалится. Отто садится за ноутбук, Оливия поднимает лист к глазам и
       просматривает его. Позвал режиссёр — планы отменяются, идём на встречу.

       Танец Оливии отменён владельцем 2026-09-04: в офисе работают оба. Кадры
       `ART.dance` оставлены — вернуть занятие можно одной веткой здесь. */
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
      } else if (roll < 0.8 && spec.prop) {
        me.dir = 1;
        enter('open', now);
      } else {
        enter('idle', now, now + 1800 + Math.random() * 3200);
      }
    }

    /* Режиссёр зовёт на место встречи: дойти до `x` и встать мордой в сторону
       `facing`. Занятие бросается сразу — иначе один топтался бы у места
       встречи, пока второй допечатывает свои десять секунд. */
    function summon(now, x, facing, hurry) {
      if (me.state === 'held' || me.state === 'fly') return;

      me.errand = clamp(x, EDGE, limit());
      me.facing = facing;
      me.hurry = !!hurry;

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
      me.hurry = false;
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

        me.x += me.dir * (me.hurry ? RUN_SPEED : SPEED) * (step / 1000);
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

      // Стоит у места встречи, прыгает, гладит: этими состояниями распоряжается
      // режиссёр, сам из них никто не выходит.
      if (me.state === 'wait' || me.state === 'jump' || me.state === 'pet') return;

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
        if (now - me.frameAt > (me.hurry ? RUN_MS : WALK_MS)) {
          me.frame += 1;
          me.frameAt = now;
        }
        return draw('walk', me.frame, null);
      }

      if (me.state === 'open') return draw('idle', 0, prop[Math.min(me.frame, openLast)]);
      if (me.state === 'close') return draw('idle', 0, prop[Math.max(0, openLast - me.frame)]);
      // За делом идут те же два кадра дыхания, что и стоя, — меняется предмет.
      if (me.state === 'busy') return draw('idle', me.frame, busy[me.frame % busy.length]);
      if (me.state === 'hop') return draw('hop', 0, null);

      // Гладит соседку: щупальце то на её макушке, то поднято над ней.
      if (me.state === 'pet') {
        if (now - me.frameAt > PET_FRAME_MS) { me.frame += 1; me.frameAt = now; }
        return draw('idle', 0, hands[me.frame % hands.length]);
      }

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

    /* Поза покоя для `prefers-reduced-motion`. Проверка на предмет обязательна:
       он есть не у всех, и без неё скрипт падал у тех, кто просил меньше
       движения, — а падал он до отрисовки, так что не было видно вообще
       никого. */
    function rest(open) {
      draw('idle', 0, open && prop ? prop[openLast] : null);
    }

    /* Пузырь — не состояние, а наклейка поверх кадра: занятие он не обрывает,
       и разворачиваться к обидчику никто не станет. Иначе печатающий Отто
       отвернулся бы от ноутбука, а тот слой не зеркалится. */
    function swear(now) {
      me.swearUntil = now + SWEAR_MS;
      wake();
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
        me.state === 'wait' || me.state === 'jump' || me.state === 'pet') return;

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
        y > box.top + PIXEL * (BUBBLE_H + ART_TOP + 3) && y < box.bottom;

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
    me.swear = swear;
    me.checkHidden = checkHidden;
    me.watch = watch;
    me.hover = hover;
    me.haul = haul;
    me.toss = toss;

    return me;
  }

  /* --- обстановка --------------------------------------------------------- */

  /* Мебель — не существо: она никуда не идёт, кадров не тратит, пока стоит, и
     на курсор не отзывается. Общего с существами три вещи: холст, прибитый к
     низу окна, перетаскивание мышью и падение. Падает она по-своему — строго
     вниз и почти без отскока: скорость руки не учитывается вовсе, иначе полку
     можно было бы зашвырнуть, как Оливию. */
  function makeThing(spec) {
    var art = render(spec.art, false, spec.skin);

    var canvas = document.createElement('canvas');
    canvas.className = 'thing';
    canvas.width = art.width;
    canvas.height = art.height;
    canvas.setAttribute('aria-hidden', 'true');
    canvas.title = spec.title;

    var ctx = canvas.getContext('2d');

    var me = {
      x: 0,
      y: 0,                  // высота над нижним краем окна
      vy: 0,
      grab: null,
      hidden: false,
      canvas: canvas,
    };

    function limit() {
      // Ширина без полосы прокрутки: `innerWidth` считает её своей, и предмет
      // у правого края уезжал под ползунок.
      return Math.max(EDGE, document.documentElement.clientWidth - canvas.width - EDGE);
    }

    function ceiling() {
      return Math.max(0, window.innerHeight - canvas.height);
    }

    function place() {
      canvas.style.transform = 'translate(' + Math.round(me.x) + 'px,' +
        Math.round(-me.y) + 'px)';
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(art, 0, 0);
    }

    function checkHidden() {
      me.hidden = window.getComputedStyle(canvas).display === 'none';
    }

    // Холст прозрачен для щелчков, пока курсор не на самой полке: иначе она
    // съедала бы нажатия по странице под собой.
    function hover(x, y) {
      if (me.grab) return;

      var box = canvas.getBoundingClientRect();
      var on = x > box.left && x < box.right && y > box.top && y < box.bottom;

      canvas.style.pointerEvents = on ? 'auto' : 'none';
    }

    function take(event) {
      if (LESS_MOTION || me.hidden) return;
      event.preventDefault();

      var box = canvas.getBoundingClientRect();
      me.grab = { dx: event.clientX - box.left, dy: event.clientY - box.top };
      me.vy = 0;
      canvas.classList.add('is-held');
      wake();
    }

    function haul(event) {
      if (!me.grab) return;

      me.x = clamp(event.clientX - me.grab.dx, EDGE, limit());
      me.y = clamp(window.innerHeight - (event.clientY - me.grab.dy) - canvas.height,
        0, ceiling());
      place();
    }

    function drop() {
      if (!me.grab) return;

      me.grab = null;
      me.vy = 0;             // скорость руки не в счёт: полка падает, а не летит
      canvas.classList.remove('is-held');
      wake();
    }

    /* На чём предмет стоит: на полу или на верхе другого, который ниже и
       перекрывается с ним по горизонтали. Отсюда и кулер на тумбочке: одним
       предметом они не склеены, просто один стоит на другом. Увели тумбочку —
       опоры не стало, и кулер падает. */
    function support() {
      var level = 0;

      things.forEach(function (other) {
        if (other === me || other.hidden) return;
        if (me.x + canvas.width <= other.x) return;
        if (other.x + other.canvas.width <= me.x) return;

        var top = other.y + other.canvas.height;
        if (top <= me.y + 1 && top > level) level = top;
      });

      return level;
    }

    /* Пока стоит на своей опоре — кадр не считается вовсе. Иначе мебель
       тратила бы время в каждом кадре, ничего не делая. */
    function update(now, step) {
      if (me.grab) return;

      var floor = support();

      if (me.vy === 0 && me.y <= floor) {
        // Опора могла подъехать под предмет — тогда он встаёт на неё.
        if (me.y !== floor) { me.y = floor; place(); }
        return;
      }

      var dt = step / 1000;

      me.vy -= GRAVITY * dt;
      me.y += me.vy * dt;

      if (me.y <= floor) {
        me.y = floor;
        var back = Math.min(-me.vy * THING_BOUNCE, THING_HOP);
        me.vy = back > THING_STICK ? back : 0;
      }

      me.x = Math.min(limit(), Math.max(EDGE, me.x));
      place();
    }

    canvas.addEventListener('mousedown', take);
    document.body.appendChild(canvas);
    draw();

    me.limit = limit;
    me.place = place;
    me.hover = hover;
    me.haul = haul;
    me.drop = drop;
    me.update = update;
    me.checkHidden = checkHidden;

    return me;
  }

  // Подпись всплывает при наведении — у каждого своя, с именем.
  var otto = makePet({
    title: 'Погладить Отто', skin: SKIN.otto, aside: -1,
    prop: { open: LAPTOP, busy: LAPTOP_TYPE },
  });
  var olivia = makePet({
    title: 'Погладить Оливию', skin: SKIN.olivia, aside: 1,
    prop: { open: PAPERS, busy: PAPERS_LEAF },
  });
  var pets = [otto, olivia];

  /* Обстановка офиса. `at` — доля свободной полосы, где предмет стоит при
     загрузке: 0 — вплотную к левому краю, 1 — к правому. Считается от полосы,
     а не от ширины окна, поэтому широкий предмет у правого края не уезжает за
     него. Расставлены по бокам — середина оставлена пустой, чтобы обстановка
     не лезла в глаза посреди страницы: там идут подписи подвала, и на широком
     экране мебель садилась прямо на них — владелец увидел это с телевизора.

     `on` — предмет стоит не на полу, а на другом: кулер на тумбочке. Одним
     предметом их не делаем нарочно — владелец просил, чтобы растащить их можно
     было в любую сторону. Следующий предмет добавляется строкой. */
  var things = [
    { name: 'shelf', art: SHELF, skin: SKIN.shelf, title: 'Подвинуть полку', at: 0 },
    { name: 'ficus', art: FICUS, skin: SKIN.ficus, title: 'Подвинуть фикус', at: 0.045 },
    { name: 'sofa', art: SOFA, skin: SKIN.sofa, title: 'Подвинуть диван', at: 0.92 },
    { name: 'plant', art: PLANT, skin: SKIN.plant, title: 'Подвинуть растение', at: 0.97 },
  ].map(function (spec) {
    var thing = makeThing(spec);
    thing.name = spec.name;
    thing.at = spec.at;
    thing.on = spec.on;
    return thing;
  });

  function thingNamed(name) {
    var found = null;
    things.forEach(function (t) { if (t.name === name) found = t; });
    return found;
  }

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
      p.hurry = false;
      if (p.state === 'wait' || p.state === 'jump' || p.state === 'pet') p.decide(now);
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

  /* Кого зашвырнули, того второй встречает пузырём с тремя восклицательными и
     бежит утешать: встаёт рядом и гладит по щеке. Ловим переход из полёта в
     приземление: бросок кончается именно им.

     Утешающий встаёт всегда слева: квадратик, которым он гладит, живёт в слое
     предмета, а тот не зеркалится и смотрит вправо. Если он был справа, по
     дороге он упавшего обгоняет — правило «не ходить сквозь друг друга» на пути
     с поручением не действует, и это осознанно: он спешит. */
  var falling = [false, false];

  function watchFall(now) {
    pets.forEach(function (p, i) {
      if (falling[i] && p.state === 'land') comfort(now, p);
      falling[i] = p.state === 'fly';
    });
  }

  function comfort(now, fallen) {
    var helper = fallen === otto ? olivia : otto;

    helper.swear(now);

    var spot = fallen.x - SPAN;
    if (spot < EDGE || occupied(helper)) return;   // встать негде — не утешить

    if (scene) endScene(now);
    fallen.summon(now, fallen.x, -1);              // лежит где упал, мордой к нему
    helper.summon(now, spot, 1, true);
    scene = { kind: 'pet', until: 0, deadline: now + SCENE_MAX, helper: helper };
  }

  function direct(now) {
    if (!scene) {
      // Без сцены никто не должен оставаться в её состояниях.
      pets.forEach(function (p) {
        if (p.state === 'wait' || p.state === 'jump' || p.state === 'pet') p.decide(now);
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

      if (scene.kind === 'pet') {
        scene.until = now + PET_MS;
        scene.helper.enter('pet', now, scene.until);
        return;
      }

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
    watchFall(now);
    pets.forEach(function (p) {
      p.update(now, step);
      p.pick(now);
    });
    things.forEach(function (t) { t.update(now, step); });

    window.requestAnimationFrame(frame);
  }

  function wake() {
    if (running || document.hidden || allHidden() || LESS_MOTION) return;
    running = true;
    last = 0;
    window.requestAnimationFrame(frame);
  }

  pets.forEach(function (p) { p.checkHidden(); });
  things.forEach(function (t) { t.checkHidden(); });

  otto.x = clamp(64, EDGE, otto.limit());
  olivia.x = clamp(otto.x + SPAN + 96, EDGE, olivia.limit());
  pets.forEach(function (p) { p.place(); });
  things.forEach(function (t) {
    if (t.on) return;
    t.x = clamp(EDGE + (t.limit() - EDGE) * t.at, EDGE, t.limit());
    t.place();
  });
  // Стоящие на другом предмете встают по его середине и на его высоту.
  things.forEach(function (t) {
    if (!t.on) return;
    var base = thingNamed(t.on);
    t.x = clamp(base.x + (base.canvas.width - t.canvas.width) / 2, EDGE, t.limit());
    t.y = base.y + base.canvas.height;
    t.place();
  });

  if (LESS_MOTION) {
    pets.forEach(function (p) { p.rest(true); });
    return;
  }

  pets.forEach(function (p) { p.rest(false); });
  wake();

  window.addEventListener('mousemove', function (event) {
    pets.forEach(function (p) { p.haul(event); });
    things.forEach(function (t) { t.haul(event); });
  }, { passive: true });

  window.addEventListener('mouseup', function () {
    pets.forEach(function (p) { p.toss(); });
    things.forEach(function (t) { t.drop(); });
  });

  if (FINE_POINTER) {
    window.addEventListener('mousemove', function (event) {
      pets.forEach(function (p) {
        p.watch(event.clientX, event.clientY);
        p.hover(event.clientX, event.clientY);
      });
      things.forEach(function (t) { t.hover(event.clientX, event.clientY); });
    }, { passive: true });
  }

  window.addEventListener('resize', function () {
    pets.forEach(function (p) {
      p.checkHidden();
      p.x = Math.min(p.limit(), p.x);
      p.place();
    });
    things.forEach(function (t) {
      t.checkHidden();
      t.x = Math.min(t.limit(), t.x);
      t.place();
    });
    // Окно могли растянуть с телефонной ширины обратно — тогда они появляются
    // снова, и их надо разбудить.
    wake();
  });

  // Во вкладке в фоне кадры не считаются: вернулись — существа просыпаются.
  document.addEventListener('visibilitychange', wake);
})();
