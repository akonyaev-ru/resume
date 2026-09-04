'use strict';

/* Прогон двух существ вхолостую.

   `assets/js/pet.js` написан для браузера, но глазами в панели предпросмотра
   он не проверяется: там `document.hidden`, кадры не считаются вовсе, а ширина
   окна в момент загрузки нулевая. Поэтому скрипт исполняется здесь под
   заглушками `window` и `document`, время идёт синтетическими часами, а
   `Math.random` подменён генератором с зерном — прогон обязан повторяться.

   Наружу скрипт ничего не отдаёт, и трогать его ради проверки не нужно: видно
   ровно то же, что видно браузеру — куда сдвинут холст (`style.transform`) и
   что на нём нарисовано (`drawImage`: тело слева, предмет справа, пузырь
   поверх, у самого верха). Этого хватает, чтобы поймать нахлёст, залипшую
   сцену, зависание после броска и падение скрипта при
   `prefers-reduced-motion` — то, чего в панели не увидеть.

       node tools/check_pet.js                     — прогон
       node tools/check_pet.js --seeds 20 --minutes 8
       node tools/check_pet.js --selftest          — а ловит ли она хоть что-то

   Код возврата 0 — все проверки зелёные, 1 — хоть одна упала. */

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'assets', 'js', 'pet.js');

// На диске у файла CRLF — приводим к одному виду, иначе поиск кусков врёт.
const CODE = fs.readFileSync(SOURCE, 'utf8')
  .split('\r\n').join('\n');

/* Какой текст скрипта сейчас исполняется. Обычно — тот, что на диске; на
   самопроверке (`--selftest`) сюда подставляется нарочно испорченный. Файл
   при этом не трогается вовсе. */
let ACTIVE = CODE;

const ARGS = { seeds: 10, minutes: 5, selftest: false };

process.argv.slice(2).forEach(function (arg, i, all) {
  if (arg === '--seeds') ARGS.seeds = Number(all[i + 1]);
  if (arg === '--minutes') ARGS.minutes = Number(all[i + 1]);
  if (arg === '--selftest') ARGS.selftest = true;
});

const FRAME_MS = 1000 / 60;
const WIDTH = 1280;
const HEIGHT = 900;

/* Числа берём из самого скрипта, а не переписываем сюда: разъехавшись с ним,
   проверка начала бы врать в обе стороны. Вычисляемые размеры (ширина тела,
   высота пузыря) меряются ниже по нарисованному. */
const NUM = {};
for (const found of CODE.matchAll(/\bvar ([A-Z][A-Z_]+) = (-?[\d.]+);/g)) {
  NUM[found[1]] = Number(found[2]);
}

for (const name of ['EDGE', 'MEET_GAP', 'PIXEL', 'SPEED', 'RUN_SPEED', 'SCENE_MAX']) {
  if (!(name in NUM)) {
    console.error('В pet.js больше нет константы ' + name + ' — проверку надо чинить.');
    process.exit(2);
  }
}

/* --- часы, случайность, заглушки ---------------------------------------- */

/* Генератор с зерном (mulberry32). Со штатным `Math.random` проверка то падала
   бы, то нет, а такой ответ хуже, чем никакого. */
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function event(x, y) {
  return { clientX: x, clientY: y, preventDefault: function () {} };
}

/* Мир: окно, документ и время. Возвращает то, что нужно проверкам, — холсты
   существ, шаг времени и способ подсунуть событие мыши. */
function open(options) {
  const opt = Object.assign({
    width: WIDTH,
    height: HEIGHT,
    seed: 1,
    lessMotion: false,
    finePointer: true,
    petsHidden: false,
  }, options);

  let now = 0;
  let ids = 0;
  let frames = 0;
  let pending = [];

  const appended = [];
  const made = [];
  const winHandlers = Object.create(null);
  const docHandlers = Object.create(null);

  function makeCanvas() {
    const layers = [];
    const paint = [];
    const handlers = Object.create(null);
    const classes = new Set();

    const ctx = {
      fillStyle: '',
      // Из чего собран сам кадр: по этому следу проверки отличают трубку от
      // ноутбука, а не по безымянному номеру холста.
      fillRect: function (x, y) { paint.push({ x: x, y: y }); },
      // Кадр начинается с очистки — значит в `layers` всегда текущий кадр.
      clearRect: function () { layers.length = 0; },
      drawImage: function (image, dx, dy) {
        layers.push({ id: image.id, dx: dx, dy: dy });
      },
    };

    const el = {
      id: ids++,
      width: 0,
      height: 0,
      className: '',
      title: '',
      style: {},
      classList: {
        add: function (name) { classes.add(name); },
        remove: function (name) { classes.delete(name); },
        contains: function (name) { return classes.has(name); },
      },
      layers: layers,
      paint: paint,
      setAttribute: function () {},
      getContext: function () { return ctx; },
      addEventListener: function (type, fn) {
        (handlers[type] || (handlers[type] = [])).push(fn);
      },
      // Событие, пришедшее прямо на холст: щелчок и захват.
      fire: function (type, ev) {
        (handlers[type] || []).forEach(function (fn) { fn(ev); });
      },
      /* Холст прибит к левому нижнему углу окна (`position: fixed`,
         `inset-block-end: 0`), а двигает его только `transform` — так что
         прямоугольник считается ровно из него. */
      spot: function () {
        const m = /translate\((-?\d+)px,(-?\d+)px\)/.exec(el.style.transform || '');
        return m ? { x: Number(m[1]), y: -Number(m[2]) } : { x: 0, y: 0 };
      },
      getBoundingClientRect: function () {
        const at = el.spot();
        return {
          left: at.x,
          right: at.x + el.width,
          top: opt.height - el.height - at.y,
          bottom: opt.height - at.y,
          width: el.width,
          height: el.height,
        };
      },
    };

    made[el.id] = el;
    return el;
  }

  const win = {
    innerWidth: opt.width,
    innerHeight: opt.height,
    matchMedia: function (query) {
      return {
        matches: query.indexOf('prefers-reduced-motion') >= 0
          ? opt.lessMotion
          : opt.finePointer,
      };
    },
    getComputedStyle: function () {
      return { display: opt.petsHidden ? 'none' : 'block' };
    },
    requestAnimationFrame: function (cb) { frames += 1; pending.push(cb); return frames; },
    addEventListener: function (type, fn) {
      (winHandlers[type] || (winHandlers[type] = [])).push(fn);
    },
  };

  const doc = {
    hidden: false,
    createElement: function () { return makeCanvas(); },
    body: { appendChild: function (el) { appended.push(el); } },
    addEventListener: function (type, fn) {
      (docHandlers[type] || (docHandlers[type] = [])).push(fn);
    },
  };

  const sandbox = {
    window: win,
    document: doc,
    performance: { now: function () { return now; } },
    Math: Object.create(Math),
    console: console,
  };
  sandbox.Math.random = rng(opt.seed);

  const world = {
    error: null,
    pets: [],
    made: made,
    otto: null,
    olivia: null,
    frames: function () { return frames; },
    at: function () { return now; },
    limit: function () {
      const el = world.pets[0];
      return Math.max(NUM.EDGE, opt.width - el.width - NUM.EDGE);
    },
    // Событие в окно: движение руки и отпускание кнопки ловит именно оно.
    win: function (type, ev) {
      (winHandlers[type] || []).forEach(function (fn) { fn(ev); });
    },
    resize: function (width) {
      opt.width = width;
      win.innerWidth = width;
      world.win('resize', {});
    },
    hide: function (flag) { opt.petsHidden = flag; },
    /* Шаг времени. `watch` зовётся после каждого кадра — проверки копят
       по нему своё, а не держат в памяти весь прогон. */
    step: function (ms, watch) {
      const until = now + ms;
      while (now < until) {
        now = Math.min(until, now + FRAME_MS);
        const due = pending;
        pending = [];
        due.forEach(function (cb) { cb(now); });
        if (watch) watch(now, world.pets.map(look));
      }
    },
  };

  try {
    vm.createContext(sandbox);
    vm.runInContext(ACTIVE, sandbox, { filename: 'assets/js/pet.js' });
  } catch (err) {
    world.error = err;
    return world;
  }

  world.pets = appended;
  world.otto = appended[0];
  world.olivia = appended[1];
  return world;
}

/* Что нарисовано на холсте в этом кадре. Слоёв три и различаются они местом:
   тело от левого края, предмет правее тела, пузырь у самого верха. */
function look(el) {
  const at = el.spot();
  const out = { x: at.x, y: at.y, body: null, prop: null, bubble: false };

  el.layers.forEach(function (layer) {
    if (layer.dy === 0) out.bubble = true;
    else if (layer.dx === 0) out.body = layer.id;
    else out.prop = layer.id;
  });

  return out;
}

/* Насколько высоко забирается рисунок: у поднятой трубки верхняя клетка выше,
   чем у откинутой крышки ноутбука. Так и различаем два дела, не заглядывая в
   палитру. */
function topOf(world, id) {
  const el = world.made[id];
  if (!el || !el.paint.length) fail('кадр ' + id + ' пуст — рисовать нечем');
  return el.paint.reduce(function (top, cell) { return Math.min(top, cell.y); }, Infinity);
}

/* Квадратик, которым гладят упавшего, — единственный кадр предмета всего в
   четыре клетки: у трубки их шесть и больше, у ноутбука восемь и больше. По
   размеру рисунка его и узнаём. Раньше приметой было «у Оливии в слое
   предмета вообще хоть что-то», но с 2026-09-04 она говорит по телефону, и
   примета сломалась: стоя от него ровно в корпусе, она попадала под неё
   посреди разговора. */
const PET_CELLS = 4;

function petting(world, prop) {
  return prop !== null && world.made[prop].paint.length === PET_CELLS;
}

/* Схватить, потрясти и отпустить. Скорость броска скрипт считает по последнему
   отрезку руки, поэтому между движениями обязано идти время. */
function toss(world, el, points) {
  const box = el.getBoundingClientRect();
  el.fire('mousedown', event(box.left + 6, box.bottom - 6));
  world.step(FRAME_MS);

  points.forEach(function (p) {
    world.win('mousemove', event(p.x, p.y));
    world.step(33);
  });

  const last = points[points.length - 1];
  world.win('mouseup', event(last.x, last.y));
  world.step(FRAME_MS);
}

/* --- проверки ------------------------------------------------------------ */

class Problem extends Error {}

function fail(message) { throw new Problem(message); }

const checks = [];

function check(name, fn) { checks.push({ name: name, fn: fn }); }

function sec(ms) { return (ms / 1000).toFixed(1) + ' с'; }

check('загрузка', function () {
  const world = open({});
  if (world.error) fail('скрипт упал при загрузке: ' + world.error.message);
  if (world.pets.length !== 2) fail('холстов на странице ' + world.pets.length + ', а не два');

  const titles = world.pets.map(function (el) { return el.title; });
  if (titles[0] !== 'Погладить Отто' || titles[1] !== 'Погладить Оливию') {
    fail('подписи не те: ' + titles.join(' / '));
  }
  if (world.pets.some(function (el) { return el.className !== 'pet'; })) {
    fail('холст без класса pet — стили до него не дойдут');
  }
  if (world.pets.some(function (el) { return look(el).body === null; })) {
    fail('кто-то не нарисован сразу после загрузки');
  }

  return titles.join(', ');
});

/* Поза покоя для просивших меньше движения: оба стоят при своём деле — он с
   раскрытым ноутбуком, она с поднятой трубкой, — и кадров не просят. В
   обычном режиме эта ветка не исполняется совсем. Проверка сторожит и старый
   дефект 30 августа: тогда `rest()` падал до отрисовки и не было видно
   вообще никого. */
check('тихий режим', function () {
  const world = open({ lessMotion: true });
  if (world.error) fail('скрипт упал при prefers-reduced-motion: ' + world.error.message);

  const otto = look(world.otto);
  const olivia = look(world.olivia);

  if (otto.body === null) fail('Отто не нарисован');
  if (olivia.body === null) fail('Оливия не нарисована');
  if (otto.prop === null) fail('у Отто не раскрыт ноутбук');
  if (olivia.prop === null) fail('у Оливии не поднята трубка');

  const lid = topOf(world, otto.prop);
  const handset = topOf(world, olivia.prop);
  if (handset >= lid) {
    fail('трубка не поднята к голове: её верх на ' + handset +
      ', а крышка ноутбука начинается с ' + lid);
  }

  world.step(5000);
  if (world.frames() !== 0) fail('запрошено кадров: ' + world.frames() + ', а движения не просили');

  return 'оба при деле, трубка выше крышки (' + handset + ' против ' + lid +
    '), кадров не просят';
});

/* Работают оба, и работа идёт полным кругом: предмет поднимается, идёт само
   дело, предмет убирается. Кадров предмета за это время набирается не меньше
   шести — у Отто четыре на крышку и два на щупальца по клавишам, у Оливии
   четыре на подъём трубки и четыре на речь. Пока она танцевала, в этом слое
   у неё не было ни одного кадра, так что проверка сторожит именно занятие,
   а не рисунок. Квадратик поглаживания в счёт не идёт: он не дело. */
check('работают оба', function () {
  const world = open({ seed: 7 });
  const seen = [new Set(), new Set()];

  world.step(180000, function (t, pets) {
    pets.forEach(function (pet, i) {
      if (pet.prop !== null && !petting(world, pet.prop)) seen[i].add(pet.prop);
    });
  });

  ['Отто', 'Оливия'].forEach(function (name, i) {
    if (seen[i].size < 6) {
      fail(name + ' за три минуты показал кадров дела ' + seen[i].size +
        ', а полный круг — это шесть и больше');
    }
  });

  return 'за три минуты кадров дела: у Отто ' + seen[0].size +
    ', у Оливии ' + seen[1].size;
});

/* На узком экране стили прячут обоих, и кадры считаться не должны. Окно могли
   растянуть обратно — тогда они просыпаются. */
check('узкий экран', function () {
  const world = open({ petsHidden: true });
  if (world.error) fail('скрипт упал: ' + world.error.message);

  world.step(5000);
  if (world.frames() !== 0) fail('спрятанные существа просят кадры: ' + world.frames());

  world.hide(false);
  world.resize(WIDTH);
  world.step(1000);
  if (world.frames() === 0) fail('окно растянули обратно, а они не проснулись');

  return 'кадров нет, после возврата ширины просыпаются';
});

/* Долгий прогон на нескольких зёрнах: границы окна, нахлёст, живость кадра и
   сами встречи. Всё считается по ходу, весь прогон в памяти не держим. */
function longRun(seeds, minutes) {
  const span = minutes * 60 * 1000;
  const report = { meetings: 0 };

  for (let seed = 1; seed <= seeds; seed += 1) {
    const world = open({ seed: seed });
    if (world.error) fail('зерно ' + seed + ': скрипт упал — ' + world.error.message);

    const limit = world.limit();
    // На столько они расходятся, стоя бок о бок: ширина тела плюс просвет.
    const SPAN = bodySpan(world);

    const seen = [
      { composite: null, changed: 0 },
      { composite: null, changed: 0 },
    ];
    let together = null;
    let counted = false;

    world.step(span, function (t, pets) {
      pets.forEach(function (pet, i) {
        if (pet.x < NUM.EDGE - 1 || pet.x > limit + 1) {
          fail('зерно ' + seed + ', ' + sec(t) + ': ушёл за край, x = ' + pet.x +
            ' при допустимых ' + NUM.EDGE + '..' + limit);
        }
        if (pet.y !== 0) {
          fail('зерно ' + seed + ', ' + sec(t) + ': повис в воздухе на ' + pet.y + ' px');
        }

        /* Кадр обязан меняться: даже стоя они дышат — два кадра сменяются раз
           в секунду с небольшим. Застывший кадр — это залипшая сцена. */
        const composite = pet.body + ':' + pet.prop;
        if (composite !== seen[i].composite) {
          seen[i].composite = composite;
          seen[i].changed = t;
        } else if (t - seen[i].changed > 3000) {
          fail('зерно ' + seed + ', ' + sec(t) + ': кадр не менялся ' +
            sec(t - seen[i].changed) + ' — похоже на залипшую сцену');
        }
      });

      const gap = Math.abs(pets[0].x - pets[1].x);

      // Сквозь друг друга они не ходят. Допуск — на кадр шага и округление.
      if (gap < SPAN - 3) {
        fail('зерно ' + seed + ', ' + sec(t) + ': нахлёст, зазор ' + gap +
          ' px при положенных ' + SPAN);
      }

      // Встреча: стоят ровно бок о бок и достаточно долго.
      if (Math.abs(gap - SPAN) <= 2) {
        if (together === null) together = t;
        if (!counted && t - together > 1000) { report.meetings += 1; counted = true; }
      } else {
        together = null;
        counted = false;
      }
    });
  }

  return report;
}

/* На столько расходятся их `x`, когда они стоят бок о бок: ширина тела плюс
   просвет. Скрипт держит это в `SPAN`, но наружу не отдаёт, поэтому меряем по
   холсту нарисованного кадра — холст самого существа шире тела на предмет, и
   по нему не посчитать. */
function bodySpan(world) {
  const drawn = look(world.otto);
  if (drawn.body === null) fail('в кадре нет тела — мерить нечего');
  return world.made[drawn.body].width + NUM.MEET_GAP;
}

check('в пределах окна и без нахлёста', function () {
  const seeds = ARGS.seeds;
  const report = longRun(seeds, ARGS.minutes);
  return seeds + ' зёрен по ' + ARGS.minutes + ' мин: границы целы, нахлёста нет, ' +
    'кадр живой, встреч ' + report.meetings;
});

check('встречи случаются', function () {
  const report = longRun(2, 3);
  if (report.meetings === 0) fail('за два прогона по три минуты они ни разу не сошлись');
  return 'сошлись ' + report.meetings + ' раз(а) за два прогона';
});

/* Бросок обязан кончаться приземлением. Отдельно проверяется щелчок сразу
   после броска: браузер шлёт `click` следом за `mouseup`, и когда-то он шёл за
   тычок — прыжок обрывал полёт, и Отто оставался висеть в воздухе. */
check('бросок кончается приземлением', function () {
  const world = open({ seed: 5 });
  world.step(2000);

  toss(world, world.olivia, [
    { x: 700, y: 600 },
    { x: 760, y: 520 },
    { x: 820, y: 440 },
  ]);

  // Тот самый щелчок вдогонку.
  world.olivia.fire('click', event(820, 440));

  let flew = false;
  let landed = null;

  world.step(9000, function (t, pets) {
    const her = pets[1];
    if (her.y > 0) { flew = true; landed = null; }
    else if (flew && landed === null) landed = t;
  });

  if (!flew) fail('брошенная не полетела вовсе');
  if (landed === null) fail('через девять секунд после броска всё ещё в воздухе');

  world.step(3000, function (t, pets) {
    if (pets[1].y !== 0) fail('после приземления снова взлетела сама');
  });

  return 'полёт, приземление на ' + sec(landed) + ', щелчок вдогонку не мешает';
});

/* Кого бросили, к тому второй бежит утешать. Второй слой на её холсте бывает
   теперь и трубкой, поэтому поглаживание узнаём по самому кадру — квадратику
   в четыре клетки, — а место проверяем отдельно. */
check('прибегает утешать', function () {
  const world = open({ seed: 3 });
  world.step(2000);

  toss(world, world.otto, [
    { x: 520, y: 700 },
    { x: 540, y: 690 },
    { x: 560, y: 700 },
  ]);

  const SPAN = bodySpan(world);
  let landed = null;
  let beside = null;
  const strokes = new Set();

  world.step(12000, function (t, pets) {
    const him = pets[0];
    const her = pets[1];

    if (landed === null) {
      if (him.y === 0 && t > 500) landed = t;
      return;
    }

    if (!petting(world, her.prop)) return;

    strokes.add(her.prop);
    if (beside === null && Math.abs(her.x - (him.x - SPAN)) <= 3) beside = t;
  });

  if (beside === null) fail('за двенадцать секунд никто не подошёл утешать');
  if (strokes.size < 2) {
    fail('квадратик не ходит вверх-вниз: кадров всего ' + strokes.size);
  }

  return 'встала слева через ' + sec(beside - landed) + ' после падения, гладит';
});

/* Пузырь с восклицательными всплывает у того, кто прибежал, — и только у него:
   свой собственный бросок никто не комментирует. Проверяем в обе стороны. */
check('удивляется тот, кто прибежал', function () {
  const cases = [
    { thrown: 1, name: 'Оливию', helper: 0, helperName: 'Отто' },
    { thrown: 0, name: 'Отто', helper: 1, helperName: 'Оливия' },
  ];

  const notes = [];

  cases.forEach(function (one) {
    const world = open({ seed: 11 });
    world.step(2000);

    toss(world, world.pets[one.thrown], [
      { x: 520, y: 700 },
      { x: 545, y: 690 },
      { x: 570, y: 700 },
    ]);

    let helperBubble = false;
    let thrownBubble = false;

    world.step(12000, function (t, pets) {
      if (pets[one.helper].bubble) helperBubble = true;
      if (pets[one.thrown].bubble) thrownBubble = true;
    });

    if (!helperBubble) fail('бросили ' + one.name + ', а ' + one.helperName + ' не удивился');
    if (thrownBubble) fail('бросили ' + one.name + ' — и он же комментирует свой бросок');
    notes.push(one.helperName);
  });

  return 'удивляются оба по очереди: ' + notes.join(', ');
});

/* Сцена обязана кончаться сама, а не по предохранителю: `SCENE_MAX` поставлен
   на случай беды и в норме не срабатывает никогда. Поэтому меряем не
   «разошлись когда-нибудь», а сколько длилось поглаживание и тронулись ли оба
   потом с места. Поглаживание опознаётся по кадру в четыре клетки, так что
   начало и конец видны точно, а не «появился хоть какой-то предмет». */
check('сцена не подвисает', function () {
  const world = open({ seed: 3 });
  world.step(2000);

  const SPAN = bodySpan(world);

  toss(world, world.otto, [
    { x: 520, y: 700 },
    { x: 540, y: 690 },
    { x: 560, y: 700 },
  ]);

  const seen = [
    { composite: null, changed: 0 },
    { composite: null, changed: 0 },
  ];
  const stood = [null, null];
  const moved = [null, null];
  let from = null;
  let till = null;

  world.step(NUM.SCENE_MAX + 60000, function (t, pets) {
    pets.forEach(function (pet, i) {
      const composite = pet.body + ':' + pet.prop;
      if (composite !== seen[i].composite) {
        seen[i].composite = composite;
        seen[i].changed = t;
      } else if (t - seen[i].changed > 3000) {
        fail(sec(t) + ': кадр застыл на ' + sec(t - seen[i].changed));
      }
    });

    if (from === null) {
      if (petting(world, pets[1].prop) &&
        Math.abs(pets[1].x - (pets[0].x - SPAN)) <= 3) from = t;
      return;
    }

    if (till === null) {
      if (!petting(world, pets[1].prop)) {
        till = t;
        pets.forEach(function (pet, i) { stood[i] = pet.x; });
      }
      return;
    }

    pets.forEach(function (pet, i) {
      if (moved[i] === null && Math.abs(pet.x - stood[i]) > 10) moved[i] = t - till;
    });
  });

  if (from === null) fail('до поглаживания дело не дошло');
  if (till === null) fail('гладит без остановки — сцена не кончилась сама');

  const spent = till - from;
  if (spent > NUM.PET_MS + 1500) {
    fail('поглаживание длилось ' + sec(spent) + ' при положенных ' + sec(NUM.PET_MS) +
      ' — сцену оборвал предохранитель, а не она сама');
  }
  if (moved[0] === null || moved[1] === null) {
    fail('после сцены с места так и не тронулись: ' +
      (moved[0] === null ? 'Отто' : 'Оливия'));
  }

  return 'гладила ' + sec(spent) + ', потом оба вернулись к своим делам';
});

/* Границы окна проверяются и прогулкой, но случайная прогулка доходит до
   правого края нескоро. Тут то же самое в лоб: схваченного тащим за оба края
   и смотрим, где он остановится. */
check('за край не утащить', function () {
  const world = open({ seed: 4 });
  world.step(2000);

  const el = world.olivia;
  const limit = world.limit();
  const box = el.getBoundingClientRect();
  el.fire('mousedown', event(box.left + 6, box.bottom - 6));
  world.step(FRAME_MS);

  world.win('mousemove', event(WIDTH + 300, HEIGHT - 40));
  world.step(FRAME_MS);
  const right = look(el).x;
  if (right > limit + 1) {
    fail('утащили за правый край: x = ' + right + ' при пределе ' + limit);
  }

  world.win('mousemove', event(-300, HEIGHT - 40));
  world.step(FRAME_MS);
  const left = look(el).x;
  if (left < NUM.EDGE - 1) {
    fail('утащили за левый край: x = ' + left + ' при отступе ' + NUM.EDGE);
  }

  world.win('mouseup', event(-300, HEIGHT - 40));
  world.step(FRAME_MS);

  return 'справа упирается в ' + right + ', слева в ' + left;
});

/* Окно сузили — никто не остался за краем. */
check('окно сузили', function () {
  const world = open({ seed: 9 });
  world.step(4000);
  world.resize(560);
  world.step(1000);

  const limit = world.limit();
  world.pets.forEach(function (el, i) {
    const at = look(el);
    if (at.x > limit + 1) {
      fail((i ? 'Оливия' : 'Отто') + ' осталась за краем: x = ' + at.x + ' при пределе ' + limit);
    }
  });

  return 'оба в пределах окна 560 px';
});

/* --- кто проверяет проверку --------------------------------------------- */

/* Зелёный прогон стоит ровно столько, сколько эта проверка ловит. Поэтому
   `--selftest` вносит в текст скрипта заведомые поломки — по одной, в памяти,
   файл на диске при этом не трогается — и требует, чтобы названная проверка
   покраснела. Поломки взяты не с потолка: это те самые дефекты, что уже были,
   и те правила, которые в контракте записаны отдельными строками.

   Проходит поломка незамеченной — значит проверка перестала стеречь то, ради
   чего писалась, и чинить надо её, а не pet.js. */
const BREAKS = [
  {
    name: 'в тихом режиме оба стоят без дела',
    red: 'тихий режим',
    parts: [[
      "draw('idle', 0, open && prop ? prop[openLast] : null);",
      "draw('idle', 0, null);",
    ]],
  },
  {
    name: 'Оливия вместо трубки садится за ноутбук',
    red: 'тихий режим',
    parts: [[
      "    prop: { open: PHONE, busy: PHONE_TALK },",
      "    prop: { open: LAPTOP, busy: LAPTOP_TYPE },",
    ]],
  },
  {
    name: 'дело больше не выпадает — оба только гуляют',
    red: 'работают оба',
    parts: [[
      '      } else if (roll < 0.8 && spec.prop) {',
      '      } else if (false) {',
    ]],
  },
  {
    name: 'ходят сквозь друг друга',
    red: 'в пределах окна и без нахлёста',
    parts: [[
      '        Math.abs(me.mate.x - me.x) < SPAN;',
      '        false;',
    ]],
  },
  {
    name: 'сцена не кончается сама — только по предохранителю',
    red: 'сцена не подвисает',
    parts: [[
      '    if (now >= scene.until) endScene(now);',
      '    if (false) endScene(now);',
    ]],
  },
  {
    name: 'прибежавший не удивляется',
    red: 'удивляется тот, кто прибежал',
    parts: [[
      '    helper.swear(now);',
      '    void 0;',
    ]],
  },
  {
    name: 'щелчок вдогонку броску оставляет висеть в воздухе',
    red: 'бросок кончается приземлением',
    parts: [
      ['      if (me.dragged) { me.dragged = false; return; }', '      void 0;'],
      ["      if (me.y > 0 && me.state !== 'held' && me.state !== 'fly') {", '      if (false) {'],
    ],
  },
  {
    name: 'правый край окна не считается',
    red: 'за край не утащить',
    parts: [[
      '      return Math.max(EDGE, window.innerWidth - canvas.width - EDGE);',
      '      return window.innerWidth;',
    ]],
  },
];

function selftest() {
  console.log('');
  console.log('Самопроверка: ломаем pet.js в памяти и смотрим, кто заметит');
  console.log('');

  let bad = 0;

  BREAKS.forEach(function (one) {
    let code = CODE;
    let missing = null;

    one.parts.forEach(function (part) {
      if (code.indexOf(part[0]) < 0) missing = part[0];
      else code = code.replace(part[0], part[1]);
    });

    if (missing) {
      bad += 1;
      console.log('  ✗ ' + one.name + ': такого куска в pet.js больше нет — поломку не внести');
      console.log('      ' + missing.trim());
      return;
    }

    ACTIVE = code;
    const red = [];
    checks.forEach(function (item) {
      try { item.fn(); } catch (err) { red.push(item.name); }
    });
    ACTIVE = CODE;

    if (red.indexOf(one.red) >= 0) {
      console.log('  ✓ ' + one.name);
      console.log('      поймала «' + one.red + '»' +
        (red.length > 1 ? ' (и ещё ' + (red.length - 1) + ')' : ''));
    } else {
      bad += 1;
      console.log('  ✗ ' + one.name);
      console.log('      «' + one.red + '» этого не заметила' +
        (red.length ? '; покраснели другие: ' + red.join(', ') : '; не покраснел никто'));
    }
  });

  console.log('');
  console.log(bad
    ? 'Итог самопроверки: ' + bad + ' из ' + BREAKS.length + ' поломок прошло мимо'
    : 'Итог самопроверки: все ' + BREAKS.length + ' поломок пойманы');
  console.log('');

  process.exit(bad ? 1 : 0);
}

/* --- запуск -------------------------------------------------------------- */

function main() {
  if (ARGS.selftest) return selftest();

  console.log('');
  console.log('Прогон существ — assets/js/pet.js');
  console.log('');

  let bad = 0;
  const started = Date.now();

  checks.forEach(function (one) {
    let note = null;
    try {
      note = one.fn();
    } catch (err) {
      bad += 1;
      if (err instanceof Problem) {
        console.log('  ✗ ' + one.name + ': ' + err.message);
      } else {
        console.log('  ✗ ' + one.name + ': ' + err.stack);
      }
      return;
    }
    console.log('  ✓ ' + one.name + (note ? ': ' + note : ''));
  });

  const spent = ((Date.now() - started) / 1000).toFixed(1);
  console.log('');
  console.log(bad
    ? 'Итог: ' + bad + ' из ' + checks.length + ' упало (' + spent + ' с)'
    : 'Итог: ' + checks.length + ' проверок, все зелёные (' + spent + ' с)');
  console.log('');

  process.exit(bad ? 1 : 0);
}

main();
