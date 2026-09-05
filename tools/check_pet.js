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
      /* Цвет запоминаем вместе с клеткой: у часов стрелки лежат поверх
         циферблата, и по одним координатам кадры неразличимы. */
      fillRect: function (x, y) { paint.push({ x: x, y: y, c: this.fillStyle }); },
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
    /* Ширина без полосы прокрутки. У браузера она меньше `innerWidth` на
       ширину ползунка, и края предметов считаются именно по ней; в прогоне
       ползунка нет, поэтому обе совпадают. */
    documentElement: { get clientWidth() { return opt.width; } },
    createElement: function () { return makeCanvas(); },
    body: { appendChild: function (el) { appended.push(el); } },
    addEventListener: function (type, fn) {
      (docHandlers[type] || (docHandlers[type] = [])).push(fn);
    },
  };

  /* Настенные часы спрашивают настоящее время, поэтому в песочнице оно своё и
     управляемое: `world.clock(h, m)` переводит стрелки. */
  let clockAt = { h: 10, m: 5 };

  function Stub() {
    this.getHours = function () { return clockAt.h; };
    this.getMinutes = function () { return clockAt.m; };
  }

  const sandbox = {
    window: win,
    document: doc,
    performance: { now: function () { return now; } },
    Math: Object.create(Math),
    Date: Stub,
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
    clock: function (h, m) { clockAt = { h: h, m: m }; },
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
    // Размеры окна нужны проверкам, чтобы считать, куда вести курсор.
    wide: function () { return opt.width; },
    high: function () { return opt.height; },
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

  // Существа создаются первыми, мебель следом: делим по классу холста, а не
  // по порядку — порядок легко переставить, класс держит вёрстка.
  world.pets = appended.filter(function (el) { return el.className === 'pet'; });
  // Сравнение по началу строки, а не по всему классу: у предмета может
  // появиться свой вариант класса, и точное сравнение потеряет его целиком —
  // так однажды из проверок выпал ковёр.
  world.things = appended.filter(function (el) { return el.className.indexOf('thing') === 0; });
  world.otto = world.pets[0];
  world.olivia = world.pets[1];
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

/* Отпечаток кадра: из каких клеток он собран. Им и различаем дела — у него
   ноутбук, у неё кружка, а номера холстов сами по себе не говорят ничего. */
/* Полный отпечаток кадра: клетки вместе с цветом. Нужен там, где рисунок
   меняется краской по тем же клеткам, — например у стрелок часов. */
function printOf(world, id) {
  const el = world.made[id];
  if (!el || !el.paint.length) fail('кадр ' + id + ' пуст — рисовать нечем');
  return el.paint.map(function (c) { return c.x + ',' + c.y + c.c; }).sort().join(' ');
}

function shapeOf(world, id) {
  const el = world.made[id];
  if (!el || !el.paint.length) fail('кадр ' + id + ' пуст — рисовать нечем');
  return el.paint.map(function (c) { return c.x + ',' + c.y; }).sort().join(' ');
}

/* Квадратик, которым гладят упавшего, — единственный кадр предмета всего в
   четыре клетки: у ноутбука и кружки их восемь и больше. По размеру рисунка его и
   узнаём. Раньше приметой было «у Оливии в слое предмета вообще хоть что-то»,
   но с 2026-09-04 предмет есть и у неё, и примета сломалась: стоя от него
   ровно в корпусе, она попадала под неё посреди своего дела. */
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
  if (world.pets.some(function (el) { return look(el).body === null; })) {
    fail('кто-то не нарисован сразу после загрузки');
  }

  if (!world.things.length) fail('обстановки на странице нет вовсе');

  const seen = new Set();
  const spots = world.things.map(function (thing) {
    const at = thing.spot();
    const name = thing.title;

    if (!name) fail('у предмета обстановки нет подписи');
    if (seen.has(name)) fail('две подписи «' + name + '» — предметы не различить');
    seen.add(name);

    if (!thing.layers.length) fail(name + ': предмет не нарисован');

    if (wall(thing)) {
      if (at.y <= 0) fail(name + ': висящее при загрузке лежит на полу');
    } else {
      const rest = restLevel(world, thing, at.x, at.y);
      if (at.y !== rest) {
        fail(name + ': при загрузке стоит на ' + at.y + ', а опора на ' + rest);
      }
    }
    if (at.x < NUM.EDGE || at.x > world.wide() - thing.width) {
      fail(name + ': при загрузке стоит за краем окна, x = ' + at.x);
    }
    return name.replace('Подвинуть ', '') + ' на ' + at.x +
      (at.y ? ' (на высоте ' + at.y + ')' : '');
  });

  return titles.join(', ') + '; ' + spots.join(', ');
});

/* Поза покоя для просивших меньше движения: оба стоят при своём деле — он с
   раскрытым ноутбуком, она с поднятой кружкой, — и кадров не просят. В
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
  if (olivia.prop === null) fail('у Оливии не поднята кружка');

  const lid = shapeOf(world, otto.prop);
  const sheet = shapeOf(world, olivia.prop);
  if (lid === sheet) fail('дело у обоих одно и то же: рисунок предмета совпал');

  // Мебель в тихом режиме стоит нарисованной: двигать её нельзя, а исчезать
  // ей незачем.
  if (!world.things[0].layers.length) fail('в тихом режиме полка не нарисована');

  world.step(5000);
  if (world.frames() !== 0) fail('запрошено кадров: ' + world.frames() + ', а движения не просили');

  return 'оба при деле, и дела разные (' + lid.split(' ').length + ' клеток у него, ' +
    sheet.split(' ').length + ' у неё), кадров не просят';
});

/* Работают оба, и работа идёт полным кругом: предмет поднимается, идёт само
   дело, предмет убирается. Кадров предмета за это время набирается не меньше
   шести — у Отто четыре на крышку и два на щупальца по клавишам, у Оливии
   четыре на подъём кружки и четыре на пар над ней. Пока она танцевала, в слое
   у неё не было ни одного кадра, так что проверка сторожит именно занятие,
   а не рисунок. Квадратик поглаживания в счёт не идёт: он не дело. */
check('работают оба', function () {
  const world = open({ seed: 7 });
  const seen = [new Set(), new Set()];

  world.step(180000, function (t, pets) {
    pets.forEach(function (pet, i) {
      if (pet.prop === null) return;
      if (petting(world, pet.prop) || withCan(world, pet.prop)) return;
      seen[i].add(pet.prop);
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

/* На чём предмет стоит в точке `x`: на полу или на верхе другого предмета,
   который с ним перекрывается. Тем же правилом живёт `pet.js`, и проверки
   считают его отдельно — иначе они сверяли бы скрипт сам с собой. */
function wall(el) {
  return el.className.indexOf('--wall') > 0;
}

function restLevel(world, thing, x, y) {
  let level = 0;

  world.things.forEach(function (other) {
    // Висящее на стене опорой не бывает: на доску не ставят.
    if (other === thing || wall(other)) return;
    const at = other.spot();
    if (x + thing.width <= at.x || at.x + other.width <= x) return;

    // Опора — только то, что стоит ниже: предмет, стоящий сверху, опорой не
    // считается, иначе тумбочка «стояла бы» на собственном кулере.
    const top = at.y + other.height;
    if (top <= y + 1 && top > level) level = top;
  });

  return level;
}

/* Каждому предмету обстановки — свой прогон: уроненный предмет не должен
   мешать следующему, а проверка обязана покрывать все, а не первый. */
function world_of_things() {
  const sample = open({ seed: 5 });
  return sample.things.map(function (_, i) {
    const world = open({ seed: 5 });
    return { world: world, thing: world.things[i] };
  });
}

/* Обстановку можно подвинуть, и падает она не как существо: строго вниз и почти
   без отскока. Поднимаем её к середине экрана, отпускаем в движении вбок — и
   смотрим три вещи: по горизонтали она с места отпускания не сдвинулась, до
   пола дошла, а при ударе подскочила на считаные пиксели. Рука при этом идёт
   быстро: существо с такой скоростью улетело бы через полокна. */
check('обстановку двигают, и она падает вниз', function () {
  const notes = [];

  world_of_things().forEach(function (one) {
    const world = one.world;
    const thing = one.thing;
    if (wall(thing)) return;              // висящее не падает, у него своя проверка
    const name = thing.title.replace('Подвинуть ', '');
    const from = thing.spot().x;

    // Куда попали курсором внутри холста — от этой точки и считается сдвиг.
    const hold = { dx: 8, dy: 8 };
    const box = thing.getBoundingClientRect();

    function hand(x, y) {
      // x — левый край предмета, y — высота над полом; переводим в точку курсора.
      return event(x + hold.dx, world.high() - y - thing.height + hold.dy);
    }

    thing.fire('mousedown', event(box.left + hold.dx, box.top + hold.dy));
    world.step(FRAME_MS);

    const back = from > 300 ? -1 : 1;      // ведём в ту сторону, где есть место
    [[60, 90], [140, 170], [220, 240]].forEach(function (pt) {
      world.win('mousemove', hand(from + back * pt[0], pt[1]));
      world.step(33);
    });

    const lifted = thing.spot();
    if (lifted.y < 100) fail(name + ': не подняли, y = ' + lifted.y);
    if (Math.abs(lifted.x - from) < 100) fail(name + ': не сдвинули вбок, x = ' + lifted.x);

    // Рука замирает перед тем, как отпустить: бросок нулевой, и предмет обязан
    // упасть отвесно. Полёт по броску проверяет соседняя проверка.
    world.win('mousemove', hand(lifted.x, lifted.y));
    world.step(33);
    world.win('mouseup', hand(lifted.x, lifted.y));

    const dropped = thing.spot().x;
    const rest = restLevel(world, thing, dropped, thing.spot().y);
    let sideways = 0;
    let landed = null;
    let peak = 0;

    world.step(4000, function (t) {
      const now = thing.spot();
      sideways = Math.max(sideways, Math.abs(now.x - dropped));
      if (landed === null) {
        if (now.y === rest) landed = t;
        return;
      }
      peak = Math.max(peak, now.y - rest);
    });

    if (landed === null) fail(name + ': за четыре секунды не дошёл до опоры на ' + rest);
    if (sideways > 0) fail(name + ': уехал вбок на ' + sideways + ' px — падать должен отвесно');
    if (peak > 12) fail(name + ': отскочил на ' + peak + ' px — отскок должен быть еле заметным');
    if (thing.spot().y !== rest) fail(name + ': после отскока не улёгся, y = ' + thing.spot().y);

    notes.push(name + ': с ' + lifted.y + ' px за ' + sec(landed) + ', отскок ' + peak);
  });

  return notes.join('; ');
});

/* Предмет, поставленный на другой, стоит на его верху — и падает, когда опору
   увели. Проверяем на любой паре, где нижний шире верхнего: пара «тумбочка с
   кулером» была в обстановке недолго, а правило осталось общим. */
check('предмет стоит на другом и падает без него', function () {
  const world = open({ seed: 6 });
  world.step(500);

  // Нижний — самый широкий, верхний — самый узкий: так они точно перекроются.
  const sorted = world.things.filter(function (t) { return !wall(t); })
    .sort(function (a, b) { return b.width - a.width; });
  const under = sorted[0];
  const over = sorted[sorted.length - 1];
  if (under === over) fail('в обстановке меньше двух предметов');

  const hold = { dx: 6, dy: 6 };
  function hand(thing, x, y) {
    return event(x + hold.dx, world.high() - y - thing.height + hold.dy);
  }

  // Верхний предмет поднимаем и опускаем на середину нижнего. Руку перед
  // отпусканием останавливаем: иначе это бросок, и предмет улетит вбок.
  const target = under.spot().x + Math.round((under.width - over.width) / 2);
  let box = over.getBoundingClientRect();
  over.fire('mousedown', event(box.left + hold.dx, box.top + hold.dy));
  world.step(FRAME_MS);
  world.win('mousemove', hand(over, target, 260));
  world.step(33);
  world.win('mousemove', hand(over, target, 260));
  world.step(33);
  world.win('mouseup', hand(over, target, 260));

  let stood = null;
  const droppedAt = world.at();
  world.step(3000, function (t) {
    if (stood === null && over.spot().y === under.height) stood = t - droppedAt;
  });

  if (stood === null) {
    fail(over.title + ' не встал на ' + under.title + ': он на ' + over.spot().y +
      ', а верх опоры на ' + under.height);
  }

  const kept = over.spot().x;

  // Теперь уводим опору — верхний обязан упасть на пол и не поехать вбок.
  box = under.getBoundingClientRect();
  under.fire('mousedown', event(box.left + hold.dx, box.top + hold.dy));
  world.step(FRAME_MS);
  const away = Math.max(NUM.EDGE, under.spot().x - 320);
  world.win('mousemove', hand(under, away, 0));
  world.step(33);
  world.win('mousemove', hand(under, away, 0));
  world.step(33);
  world.win('mouseup', hand(under, away, 0));

  let fell = null;
  const movedAt = world.at();
  world.step(3000, function (t) {
    if (fell === null && over.spot().y === 0) fell = t - movedAt;
  });

  if (fell === null) fail('опору увели, а ' + over.title + ' остался висеть на ' + over.spot().y);
  if (over.spot().x !== kept) {
    fail('верхний поехал вбок вслед за опорой: было ' + kept + ', стало ' + over.spot().x);
  }

  return over.title.replace('Подвинуть ', '') + ' встал на ' +
    under.title.replace('Подвинуть ', '') + ' за ' + sec(stood) +
    ', без опоры упал за ' + sec(fell);
});

/* Брошенная вбок мебель летит вбок. До 2026-09-05 бросок в счёт не шёл вовсе —
   предмет падал строго вниз, — и владелец попросил вернуть полёт: «мебель падает
   очень сильно вниз, а не в бок как персонажи». Тяжесть при этом осталась: летит
   он хуже существа и по полу не катится. */
check('мебель бросают вбок, и она летит вбок', function () {
  const world = open({ seed: 4 });
  world.step(500);

  const thing = world.things.filter(function (t) { return !wall(t); })[0];
  const name = thing.title.replace('Подвинуть ', '');
  const from = thing.spot().x;
  const hold = { dx: 6, dy: 6 };

  function hand(x, y) {
    return event(x + hold.dx, world.high() - y - thing.height + hold.dy);
  }

  const box = thing.getBoundingClientRect();
  thing.fire('mousedown', event(box.left + hold.dx, box.top + hold.dy));
  world.step(FRAME_MS);

  // Ведём руку вбок и вверх и отпускаем на ходу — это и есть бросок.
  [[60, 120], [180, 200], [300, 260]].forEach(function (pt) {
    world.win('mousemove', hand(from + pt[0], pt[1]));
    world.step(33);
  });
  world.win('mouseup', hand(from + 300, 260));

  const released = thing.spot().x;
  let landed = null;

  world.step(4000, function (t) {
    if (landed === null && thing.spot().y === 0) landed = t;
  });

  if (landed === null) fail(name + ': за четыре секунды не приземлился после броска');

  const flew = thing.spot().x - released;
  if (flew < 40) fail(name + ': бросок не в счёт, пролетел вбок всего ' + flew + ' px');

  return name + ': пролетел вбок ' + Math.round(flew) + ' px и лёг за ' + sec(landed);
});

/* На диван садятся: доходят, забираются на сиденье, сидят и слезают. Диван при
   этом остаётся предметом — его двигают мышью, — поэтому сидящего ищем не по
   состоянию (его отсюда не видно), а по высоте: он стоит ровно на верху дивана.
   Владелец просил начать анимации с дивана и напомнил, что диван двигается. */
check('на диван садятся и слезают', function () {
  const world = open({ seed: 3 });
  world.step(500);

  const couch = world.things.filter(function (t) {
    return t.title.indexOf('диван') >= 0;
  })[0];
  if (!couch) fail('дивана в обстановке нет');

  const top = couch.spot().y + NUM.SEAT_UP;
  let sat = null;
  let down = null;

  world.step(240000, function (t, pets) {
    const up = pets.some(function (p) { return p.y === top; });
    if (sat === null && up) sat = t;
    if (sat !== null && down === null && !up && pets.every(function (p) { return p.y === 0; })) {
      down = t;
    }
  });

  if (sat === null) fail('за четыре минуты никто не сел на диван');
  if (down === null) fail('сел и не слез: за четыре минуты с дивана никто не встал');

  return 'сели на ' + sec(sat) + ', слезли к ' + sec(down);
});

/* Диван можно увести из-под сидящего: он остаётся обычным предметом, и сидящий
   тогда падает на пол, а не висит в воздухе. */
check('диван увели — сидящий падает', function () {
  const world = open({ seed: 3 });

  const couch = world.things.filter(function (t) {
    return t.title.indexOf('диван') >= 0;
  })[0];
  const top = couch.spot().y + NUM.SEAT_UP;

  /* Шагаем короткими отрезками и останавливаемся, как только кто-то сел: если
     прогнать все четыре минуты разом, он успеет и слезть, и диван мы уведём
     из-под пустого места — проверка пройдёт, ничего не проверив. */
  let sitter = null;
  for (let i = 0; i < 240 && sitter === null; i++) {
    world.step(1000, function (t, pets) {
      if (sitter !== null) return;
      pets.forEach(function (p, k) { if (p.y === top) sitter = k; });
    });
  }

  if (sitter === null) fail('за четыре минуты никто не сел — проверять нечего');

  // Берём диван рукой: сидеть больше не на чем.
  const box = couch.getBoundingClientRect();
  couch.fire('mousedown', event(box.left + 6, box.top + 6));
  world.step(FRAME_MS);
  world.win('mousemove', event(box.left + 306, box.top - 60));
  world.step(33);

  let fell = null;
  const from = world.at();
  world.step(4000, function (t, pets) {
    if (fell === null && pets[sitter].y === 0) fell = t - from;
  });

  if (fell === null) fail('диван увели, а сидящий остался висеть');
  return 'диван увели — упал за ' + sec(fell);
});

/* Слезающего с дивана утешать не бегут: это не падение, а его собственная
   затея. Пузырь с восклицательными и поглаживание положены только тому, кого
   бросили рукой или из-под кого выдернули диван. */
check('слезающего с дивана не утешают', function () {
  const world = open({ seed: 3 });
  const SPAN = bodySpan(world);

  const couch = world.things.filter(function (t) {
    return t.title.indexOf('диван') >= 0;
  })[0];
  const top = couch.spot().y + NUM.SEAT_UP;

  /* Смотрим три схода подряд, а не один. Утешать бегут не всегда: если второй
     сам занят, сцена не начинается, и по одному сходу поломку можно проглядеть.
     Каждый сход смотрим двенадцать секунд — утешающий бежит через полокна. */
  let watched = 0;

  for (let round = 0; round < 3; round++) {
    let sat = false;
    for (let i = 0; i < 240 && !sat; i++) {
      world.step(1000, function (t, pets) {
        if (pets.some(function (p) { return p.y === top; })) sat = true;
      });
    }
    if (!sat) break;

    let off = false;
    for (let i = 0; i < 40 && !off; i++) {
      world.step(1000, function (t, pets) {
        if (pets.every(function (p) { return p.y === 0; })) off = true;
      });
    }
    if (!off) fail('сел и за сорок секунд не слез');

    let bubble = false;
    let pets4 = false;
    let side = false;

    world.step(12000, function (t, pets) {
      pets.forEach(function (pet) {
        if (pet.bubble) bubble = true;
        if (petting(world, pet.prop)) pets4 = true;
      });
      if (Math.abs(pets[0].x - pets[1].x) <= SPAN + 2) side = true;
    });

    if (bubble) fail('после схода с дивана кто-то выругался пузырём');
    if (pets4) fail('после схода с дивана второй прибежал гладить');
    if (side) fail('после схода с дивана второй прибежал и встал вплотную');

    watched += 1;
  }

  if (!watched) fail('за четыре минуты никто не сел — проверять нечего');
  return 'сходов посмотрено ' + watched + ': ни пузыря, ни утешения';
});

/* При загрузке существа не стоят внутри мебели. Отто раньше вставал на 64-й
   пиксель и при обновлении страницы оказывался прямо в фикусе — владелец это и
   увидел. Проверяем на трёх ширинах: кадка стоит по доле окна и с шириной
   уезжает. */
check('при загрузке никто не стоит в мебели', function () {
  const notes = [];

  [720, 1280, 1920].forEach(function (width) {
    const world = open({ seed: 5, width: width });
    world.step(200);

    const span = bodySpan(world) - NUM.MEET_GAP;    // ширина тела без просвета

    world.pets.forEach(function (el) {
      const pet = look(el);
      const name = el.title.replace('Погладить ', '');

      world.things.forEach(function (thing) {
        if (wall(thing)) return;            // висящее над головой не в счёт

        const at = thing.spot().x;
        if (pet.x + span <= at || at + thing.width <= pet.x) return;

        fail(name + ' при ширине ' + width + ' стоит в предмете «' +
          thing.title.replace('Подвинуть ', '') + '»: сам ' + pet.x + '..' +
          (pet.x + span) + ', предмет ' + at + '..' + (at + thing.width));
      });
    });

    notes.push(width + ': ' + look(world.pets[0]).x);
  });

  return 'Отто встаёт на ' + notes.join(', ');
});

/* Часы идут: стрелки показывают настоящее время, огрублённое до четверти.
   Время в песочнице своё, поэтому переводим его сами и смотрим, сменился ли
   кадр. Кадр сверяем отпечатком рисунка — номера холстов сами по себе ничего
   не значат. */
check('часы показывают время', function () {
  const world = open({ seed: 5 });
  world.clock(10, 5);
  world.step(2000);

  const clock = world.things.filter(wall)[1];
  if (!clock) fail('вторых висящих часов в обстановке нет');
  if (!clock.layers.length) fail('часы не нарисованы');

  const morning = printOf(world, clock.layers[0].id);

  // Полчаса вперёд: минутная обязана переставиться.
  world.clock(10, 40);
  world.step(2000);
  const later = printOf(world, clock.layers[0].id);
  if (later === morning) fail('прошло полчаса, а стрелки не двинулись');

  // Четыре часа вперёд: теперь и часовая.
  world.clock(14, 40);
  world.step(2000);
  const afternoon = printOf(world, clock.layers[0].id);
  if (afternoon === later) fail('прошло четыре часа, а часовая не двинулась');

  // Вернули время — вернулся и кадр: показ зависит от времени, а не от счётчика.
  world.clock(10, 5);
  world.step(2000);
  if (printOf(world, clock.layers[0].id) !== morning) {
    fail('время то же, а кадр другой — часы идут сами по себе');
  }

  return 'стрелки идут за временем и возвращаются вместе с ним';
});

/* Льётся ли из лейки: ищем в кадре предмета клетку цвета воды. Цвет заглушка
   запоминает вместе с клеткой, поэтому полив узнаётся точно, а не по числу
   клеток. */
const WATER_BLUE = '#79c0ff';
const CAN_METAL = '#8a94a6';

/* Кадр с лейкой: её металл больше нигде не встречается. Полив — занятие общее,
   и в счёт «своего дела» он не идёт, иначе сломанный ноутбук маскировался бы
   поливом. */
function withCan(world, id) {
  const el = id === null || id === undefined ? null : world.made[id];
  return !!el && el.paint.some(function (cell) { return cell.c === CAN_METAL; });
}

function pouring(world, id) {
  const el = id === null || id === undefined ? null : world.made[id];
  return !!el && el.paint.some(function (cell) { return cell.c === WATER_BLUE; });
}

/* Кадки, которые можно полить. */
function pots(world) {
  return world.things.filter(function (t) {
    return t.title.indexOf('фикус') >= 0 || t.title.indexOf('растение') >= 0;
  });
}

/* Дождаться полива: шагаем секундными отрезками, пока в кадре предмета не
   появится вода. Возвращаем, кто и когда. */
function waitForWater(world, seconds) {
  let when = null;
  let who = null;

  for (let i = 0; i < seconds && when === null; i++) {
    world.step(1000, function (t, watchers) {
      if (when !== null) return;
      watchers.forEach(function (pet, k) {
        if (pouring(world, pet.prop)) { when = t; who = k; }
      });
    });
  }

  return { when: when, who: who };
}

check('поливают растение', function () {
  const world = open({ seed: 5 });
  const found = waitForWater(world, 300);

  if (found.when === null) fail('за пять минут никто не полил растение');

  // Стоит он при этом слева от кадки, на длину тела: носик смотрит вправо.
  const SPAN = bodySpan(world);
  const me = look(world.pets[found.who]);
  const near = pots(world).some(function (pot) {
    return Math.abs(pot.spot().x - me.x - SPAN) <= NUM.WATER_REACH;
  });

  if (!near) fail('полил, стоя не у кадки: сам на ' + me.x);

  return 'полил на ' + sec(found.when) + ', стоя вплотную к кадке';
});

/* Растение можно увести из-под носика: оно такой же предмет, как остальные.
   Полив тогда кончается, а не льётся в пустоту. */
check('растение увели — полив кончился', function () {
  const world = open({ seed: 5 });
  const found = waitForWater(world, 300);
  if (found.when === null) fail('за пять минут никто не полил — проверять нечего');

  const SPAN = bodySpan(world);
  const me = look(world.pets[found.who]);
  const pot = pots(world).filter(function (one) {
    return Math.abs(one.spot().x - me.x - SPAN) <= NUM.WATER_REACH;
  })[0];
  if (!pot) fail('поливал, а кадки рядом нет');

  const box = pot.getBoundingClientRect();
  pot.fire('mousedown', event(box.left + 6, box.top + 6));
  world.step(FRAME_MS);
  world.win('mousemove', event(box.left + 220, box.top - 40));

  let wet = false;
  world.step(1500, function (t, watchers) {
    if (pouring(world, watchers[found.who].prop)) wet = true;
  });

  if (wet) fail('кадку унесли, а он всё льёт');
  return 'кадку унесли — полив кончился';
});

/* Доску перевешивают: где отпустили, там и осталась. Мебель на её месте
   падала бы на пол — этим висящее и отличается, и это ровно то, что просил
   владелец: «брать и в другое место закреплять». */
check('доску перевешивают, и она висит', function () {
  const world = open({ seed: 9 });
  world.step(500);

  const board = world.things.filter(wall)[0];
  if (!board) fail('в обстановке нет висящего предмета');

  const was = board.spot();
  if (was.y <= 0) fail('доска при загрузке лежит на полу');

  const hold = { dx: 8, dy: 8 };
  const box = board.getBoundingClientRect();
  const toX = Math.min(was.x + 260, world.wide() - board.width - NUM.EDGE);
  const toY = was.y + 90;

  board.fire('mousedown', event(box.left + hold.dx, box.top + hold.dy));
  world.step(FRAME_MS);
  world.win('mousemove', event(toX + hold.dx, world.high() - toY - board.height + hold.dy));
  world.step(33);
  world.win('mouseup', event(toX + hold.dx, world.high() - toY - board.height + hold.dy));

  const hung = board.spot();
  if (Math.abs(hung.x - toX) > 2 || Math.abs(hung.y - toY) > 2) {
    fail('доска не перевесилась: ждали ' + toX + ',' + toY +
      ', а она на ' + hung.x + ',' + hung.y);
  }

  // Три секунды спустя она обязана висеть там же, а не сползти на пол.
  world.step(3000);
  const now = board.spot();
  if (now.x !== hung.x || now.y !== hung.y) {
    fail('доска не удержалась: была ' + hung.x + ',' + hung.y +
      ', стала ' + now.x + ',' + now.y);
  }

  return 'перевесили с ' + was.x + ',' + was.y + ' на ' + now.x + ',' + now.y +
    ' — висит';
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
        if (pet.y !== 0 && !onThing(world, pet, SPAN)) {
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
      // Сквозь друг друга они не ходят и место по горизонтали не делят — даже
      // когда один сидит на диване, а другой идёт по полу.
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
/* Выше пола существо бывает только на диване: лезет на него или сидит. Тогда
   под ним есть предмет, и оно не выше его верха. Всё прочее — зависание, ровно
   то, что ловила эта проверка до появления посадки. */
function onThing(world, pet, span) {
  const middle = pet.x + span / 2;

  return world.things.some(function (t) {
    if (wall(t)) return false;

    const at = t.spot().x;
    if (middle < at || middle > at + t.width) return false;
    return pet.y <= t.spot().y + t.height + 1;
  });
}

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
    name: 'Оливия садится за тот же ноутбук, что у Отто',
    red: 'тихий режим',
    parts: [[
      "    prop: { open: MUG, busy: MUG_STEAM },",
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
    name: 'полку забыли нарисовать',
    red: 'тихий режим',
    parts: [[
      '    document.body.appendChild(canvas);\n    draw();',
      '    document.body.appendChild(canvas);',
    ]],
  },
  {
    name: 'доска падает, как мебель',
    red: 'доску перевешивают, и она висит',
    parts: [[
      '      if (spec.wall) return;',
      '      if (false) return;',
    ]],
  },
  {
    name: 'опоры под предметом не существует',
    red: 'предмет стоит на другом и падает без него',
    parts: [[
      '      var floor = support();',
      '      var floor = 0;',
    ]],
  },
  {
    name: 'слезание с дивана считают падением',
    red: 'слезающего с дивана не утешают',
    parts: [[
      '          me.thrown = false;                 // слезает сам: утешать не за что',
      '          me.thrown = true;',
    ]],
  },
  {
    name: 'полив не кончается без растения',
    red: 'растение увели — полив кончился',
    parts: [[
      '        if (!stillWatering() || me.errand !== null) {',
      '        if (false) {',
    ]],
  },
  {
    name: 'Отто встаёт на старое место, в фикус',
    red: 'при загрузке никто не стоит в мебели',
    parts: [[
      '    ? firstPot.x + firstPot.canvas.width + 16',
      '    ? 64',
    ]],
  },
  {
    name: 'часы не переставляют стрелки',
    red: 'часы показывают время',
    parts: [[
      '      if (!spec.face || now - me.askedAt < 1000) return;',
      '      if (true) return;',
    ]],
  },
  {
    name: 'сидящий не замечает, что диван увели',
    red: 'диван увели — сидящий падает',
    parts: [[
      '        if (!stillSeated() || me.errand !== null) {',
      '        if (false) {',
    ]],
  },
  {
    name: 'мебель не слушается броска',
    red: 'мебель бросают вбок, и она летит вбок',
    parts: [[
      '      me.vx = clamp(me.grab.vx * THING_THROW, -THING_THROW_MAX, THING_THROW_MAX);',
      '      me.vx = 0;',
    ]],
  },
  {
    name: 'полка отскакивает, как существо',
    red: 'обстановку двигают, и она падает вниз',
    parts: [[
      'var back = Math.min(-me.vy * THING_BOUNCE, THING_HOP);',
      'var back = -me.vy * BOUNCE;',
    ]],
  },
  {
    name: 'предмет проваливается сквозь опору',
    red: 'обстановку двигают, и она падает вниз',
    parts: [[
      '      if (me.y <= floor) {\n        me.y = floor;',
      '      if (false) {\n        me.y = floor;',
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
      ["      if (me.y > 0 && me.state !== 'held' && me.state !== 'fly' &&\n        me.state !== 'climb' && me.state !== 'sit') {", '      if (false) {'],
    ],
  },
  {
    name: 'правый край окна не считается',
    red: 'за край не утащить',
    parts: [[
      '      return Math.max(EDGE, document.documentElement.clientWidth - canvas.width - EDGE);',
      '      return document.documentElement.clientWidth;',
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
