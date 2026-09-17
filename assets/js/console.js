/* Компьютер в офисе: по щелчку по монитору открывается окно-консоль. Сначала
   загрузка — строки печатаются по буквам, полоса бежит, — потом тетрис.

   Файл делится на две части. Ядро игры (`Tetris`) — чистые функции над
   состоянием, без DOM и времени: его гоняет `tools/check_tetris.js` в Node.
   Всё, что рисует и слушает клавиши, — ниже и только в браузере.

   Окно — не «внутри монитора»: экран у него 8x5 клеток, игру туда не
   поместить. Оно открывается поверх страницы в стиле терминала навыков и
   закрывается Esc, щелчком по подложке или крестиком-кнопкой; фокус
   возвращается на монитор. Клавиши-стрелки и пробел, пока окно открыто,
   страницу не листают. */
(function (root) {
  'use strict';

  /* --- ядро игры ---------------------------------------------------------- */

  var COLS = 10;
  var ROWS = 20;
  var ORDER = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  var SHAPES = {
    I: [[1, 1, 1, 1]],
    O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1]],
    S: [[0, 1, 1], [1, 1, 0]],
    Z: [[1, 1, 0], [0, 1, 1]],
    J: [[1, 0, 0], [1, 1, 1]],
    L: [[0, 0, 1], [1, 1, 1]],
  };
  // Очки за 1–4 линии разом, умножаются на уровень.
  var LINE_SCORE = [0, 100, 300, 500, 800];
  // Сдвиги от стенки при повороте: на месте, влево, вправо, дальше.
  var KICKS = [0, -1, 1, -2, 2];

  function rotateShape(shape) {
    var h = shape.length;
    var w = shape[0].length;
    var out = [];
    for (var x = 0; x < w; x += 1) {
      var row = [];
      for (var y = h - 1; y >= 0; y -= 1) row.push(shape[y][x]);
      out.push(row);
    }
    return out;
  }

  // Мешок из семи: все фигуры по одной в случайном порядке, потом новый мешок.
  function shuffledBag(rng) {
    var bag = ORDER.slice();
    for (var i = bag.length - 1; i > 0; i -= 1) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = bag[i];
      bag[i] = bag[j];
      bag[j] = tmp;
    }
    return bag;
  }

  function drawPiece(game) {
    if (!game.bag.length) game.bag = shuffledBag(game.rng);
    var kind = game.bag.pop();
    return { kind: kind, shape: SHAPES[kind].map(function (r) { return r.slice(); }), x: 0, y: 0 };
  }

  function collides(game, shape, px, py) {
    for (var y = 0; y < shape.length; y += 1) {
      for (var x = 0; x < shape[y].length; x += 1) {
        if (!shape[y][x]) continue;
        var nx = px + x;
        var ny = py + y;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && game.board[ny][nx]) return true;
      }
    }
    return false;
  }

  function spawn(game) {
    var piece = game.next;
    game.next = drawPiece(game);
    piece.x = Math.floor((COLS - piece.shape[0].length) / 2);
    piece.y = 0;
    game.piece = piece;
    // Новой фигуре некуда встать — игра окончена.
    if (collides(game, piece.shape, piece.x, piece.y)) game.over = true;
  }

  function create(rng) {
    var game = {
      board: [],
      bag: [],
      rng: rng || Math.random,
      piece: null,
      next: null,
      score: 0,
      lines: 0,
      level: 1,
      over: false,
      paused: false,
      fall: 0,          // накопленное время до следующего шага вниз, мс
    };
    for (var y = 0; y < ROWS; y += 1) {
      var row = [];
      for (var x = 0; x < COLS; x += 1) row.push(0);
      game.board.push(row);
    }
    game.next = drawPiece(game);
    spawn(game);
    return game;
  }

  function active(game) {
    return !game.over && !game.paused && game.piece;
  }

  function move(game, dx) {
    if (!active(game)) return false;
    var p = game.piece;
    if (collides(game, p.shape, p.x + dx, p.y)) return false;
    p.x += dx;
    return true;
  }

  function rotate(game) {
    if (!active(game)) return false;
    var p = game.piece;
    if (p.kind === 'O') return true;
    var turned = rotateShape(p.shape);
    for (var i = 0; i < KICKS.length; i += 1) {
      if (!collides(game, turned, p.x + KICKS[i], p.y)) {
        p.shape = turned;
        p.x += KICKS[i];
        return true;
      }
    }
    return false;
  }

  function clearLines(game) {
    var kept = [];
    var cleared = 0;
    for (var y = 0; y < ROWS; y += 1) {
      var full = true;
      for (var x = 0; x < COLS; x += 1) if (!game.board[y][x]) { full = false; break; }
      if (full) cleared += 1;
      else kept.push(game.board[y]);
    }
    while (kept.length < ROWS) {
      var empty = [];
      for (var i = 0; i < COLS; i += 1) empty.push(0);
      kept.unshift(empty);
    }
    game.board = kept;
    return cleared;
  }

  function lock(game) {
    var p = game.piece;
    for (var y = 0; y < p.shape.length; y += 1) {
      for (var x = 0; x < p.shape[y].length; x += 1) {
        if (!p.shape[y][x]) continue;
        var ny = p.y + y;
        if (ny < 0) { game.over = true; continue; }
        game.board[ny][p.x + x] = p.kind;
      }
    }
    var cleared = clearLines(game);
    game.score += LINE_SCORE[cleared] * game.level;
    game.lines += cleared;
    game.level = 1 + Math.floor(game.lines / 10);
    game.fall = 0;
    if (!game.over) spawn(game);
  }

  // Шаг вниз; упёрлась — ложится. Возвращает, сдвинулась ли.
  function softDrop(game) {
    if (!active(game)) return false;
    var p = game.piece;
    if (collides(game, p.shape, p.x, p.y + 1)) { lock(game); return false; }
    p.y += 1;
    return true;
  }

  function hardDrop(game) {
    if (!active(game)) return 0;
    var p = game.piece;
    var fell = 0;
    while (!collides(game, p.shape, p.x, p.y + 1)) { p.y += 1; fell += 1; }
    game.score += fell * 2;
    lock(game);
    return fell;
  }

  // Куда упадёт фигура, если её отпустить: для тени.
  function ghostY(game) {
    var p = game.piece;
    var y = p.y;
    while (!collides(game, p.shape, p.x, y + 1)) y += 1;
    return y;
  }

  // Интервал падения по уровню, мс: 800 на первом, быстрее на 70 за уровень, не ниже 90.
  function speed(level) {
    return Math.max(90, 800 - (level - 1) * 70);
  }

  // Время идёт: накопили интервал — шаг вниз. Несколько шагов, если кадр был долгим.
  function tick(game, dt) {
    if (!active(game)) return;
    game.fall += dt;
    var interval = speed(game.level);
    while (game.fall >= interval && active(game)) {
      game.fall -= interval;
      softDrop(game);
    }
  }

  var Tetris = {
    COLS: COLS,
    ROWS: ROWS,
    ORDER: ORDER,
    SHAPES: SHAPES,
    LINE_SCORE: LINE_SCORE,
    create: create,
    move: move,
    rotate: rotate,
    softDrop: softDrop,
    hardDrop: hardDrop,
    tick: tick,
    ghostY: ghostY,
    speed: speed,
    collides: collides,
    shuffledBag: shuffledBag,
    rotateShape: rotateShape,
  };

  /* --- таблица рекордов ----------------------------------------------------
     Общая десятка приходит снимком `data/records.js` (CI кладёт его в
     репозиторий раз в сутки), свой рекорд — из хранилища браузера. На экране
     они сводятся: своя запись встаёт на место по счёту, прежняя строка с тем
     же ником уходит (если там счёт выше — остаётся он), лишнее за десяткой
     отрезается; не попавшая в десятку своя запись идёт отдельной строкой без
     места. При равном счёте место за прежним рекордсменом. Чистая функция —
     проверяется в Node без окна. */
  var TOP_N = 10;

  function mergeScores(top, own) {
    var rows = (top || []).map(function (row) {
      return { nick: String(row && row.nick || '').toLowerCase(), best: Number(row && row.best) || 0, mine: false };
    }).filter(function (row) { return row.nick && row.best > 0; });
    rows.sort(function (a, b) { return b.best - a.best; });

    var extra = null;
    if (own && own.nick && Number(own.best) > 0) {
      var mine = { nick: String(own.nick).toLowerCase(), best: Number(own.best), mine: true };
      rows = rows.filter(function (row) {
        if (row.nick !== mine.nick) return true;
        mine.best = Math.max(mine.best, row.best);
        return false;
      });
      var at = rows.length;
      for (var i = 0; i < rows.length; i += 1) {
        if (mine.best > rows[i].best) { at = i; break; }
      }
      rows.splice(at, 0, mine);
      if (at >= TOP_N) extra = mine;
    }
    return { rows: rows.slice(0, TOP_N), extra: extra };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { Tetris: Tetris, mergeScores: mergeScores };
  if (!root || !root.document) return;

  /* --- окно ---------------------------------------------------------------- */

  var document = root.document;
  var LESS_MOTION = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var LANG = readLang();
  var CELL_MAX = 40;        // клетка растёт с высотой окна браузера до этого предела
  var CELL_MIN = 10;
  var CHROME = 220;         // прикидка на шапку, показатели и кнопки; точно — замером в fitWindow
  var CAP_MAX = 40;         // клавиша-колпачок, px: ужимается, пока ряд не встанет в одну строку
  var CAP_MIN = 28;
  var CAP_TOUCH = 46;       // под палец меньше не бывает (44 по гайдлайнам, с запасом)
  var CAP_LEGEND = 34;      // мельче этого подпись клавиши нечитаема — прячется
  var COARSE = root.matchMedia && root.matchMedia('(pointer: coarse)').matches;
  var TYPE_MS = 14;         // буква загрузки
  var LINE_MS = 160;        // пауза между строками
  var BAR_MS = 60;          // деление полосы
  var START_MS = 500;       // от «готово» до игры
  var OVER_MS = 1500;       // от «игра окончена» до таблицы рекордов: стакан ещё виден
  var BEST_KEY = 'office-tetris-best';
  var NICK_KEY = 'office-tetris-nick';
  var NICK_MAX = 8;         // знаков: столько влезает в табло на стене при шрифте 3x5

  var TEXT = {
    title: { ru: 'Компьютер', en: 'Computer' },
    path: '~/games',
    hint: { ru: 'Esc — закрыть', en: 'Esc — close' },
    ready: { ru: 'готово — любая клавиша', en: 'ready — press any key' },
    login: 'login: ',
    welcome: { ru: 'добро пожаловать, ', en: 'welcome, ' },
    score: { ru: 'Счёт', en: 'Score' },
    level: { ru: 'Уровень', en: 'Level' },
    lines: { ru: 'Линии', en: 'Lines' },
    best: { ru: 'Рекорд', en: 'Best' },
    next: { ru: 'Далее', en: 'Next' },
    paused: { ru: 'Пауза', en: 'Paused' },
    over: { ru: 'Игра окончена', en: 'Game over' },
    again: { ru: 'R — ещё раз', en: 'R — again' },
    scores: 'hi-scores',
    nobody: { ru: 'пока никого — будешь первым', en: 'nobody yet — be the first' },
    close: { ru: 'Закрыть', en: 'Close' },
    keys: {
      left: { ru: 'Влево (←)', en: 'Left (←)' },
      right: { ru: 'Вправо (→)', en: 'Right (→)' },
      rotate: { ru: 'Повернуть (↑, X)', en: 'Rotate (↑, X)' },
      down: { ru: 'Вниз (↓)', en: 'Down (↓)' },
      drop: { ru: 'Сбросить (пробел)', en: 'Drop (space)' },
      pause: { ru: 'Пауза (P)', en: 'Pause (P)' },
    },
  };
  var BOOT = [
    'legalops-os 5.15 · booting',
    '[ ok ] mount /skills          31 items',
    '[ ok ] wake otto & olivia     2 pets',
    '[ ok ] load tetris.bin        ',
  ];
  // Фигуры в акцентах страницы: I — accent, O — amber, S — mint, J — sky,
  // L — magenta; у страницы нет фиолетового и красного, T и Z добраны в её тоне.
  var COLORS = {
    I: '#00c5cd', O: '#ffb454', T: '#b48cff', S: '#3ddc97', Z: '#ff6b6b', J: '#79c0ff', L: '#ff86c0',
  };

  function t(value) {
    return value && typeof value === 'object' ? value[LANG] : value;
  }

  function readLang() {
    try {
      var q = new URLSearchParams(root.location.search).get('lang');
      if (q === 'ru' || q === 'en') return q;
    } catch (e) { /* без адреса — по разметке */ }
    return (document.documentElement.lang || 'ru').slice(0, 2) === 'en' ? 'en' : 'ru';
  }

  function el(tag, props, kids) {
    var node = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (key) {
        var val = props[key];
        if (val === null || val === undefined || val === false) return;
        if (key === 'class') node.className = val;
        else if (key === 'text') node.textContent = val;
        else node.setAttribute(key, val === true ? '' : val);
      });
    }
    (kids || []).forEach(function (kid) {
      if (kid) node.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
    });
    return node;
  }

  var ui = null;        // разметка окна, строится один раз
  var game = null;
  var opener = null;    // куда вернуть фокус
  var timers = [];
  var raf = 0;
  var lastFrame = 0;
  var phase = 'closed'; // closed | boot | login | play | scores
  var nick = '';        // ник текущей партии: с `login:` или из хранилища
  var cell = CELL_MAX;

  function later(fn, ms) {
    var id = root.setTimeout(fn, ms);
    timers.push(id);
    return id;
  }

  function clearTimers() {
    timers.forEach(function (id) { root.clearTimeout(id); });
    timers = [];
  }

  function readBest() {
    try { return Number(root.localStorage.getItem(BEST_KEY)) || 0; } catch (e) { return 0; }
  }

  function writeBest(value) {
    try { root.localStorage.setItem(BEST_KEY, String(value)); } catch (e) { /* без памяти браузера — просто не запомним */ }
  }

  function readNick() {
    try { return cleanNick(root.localStorage.getItem(NICK_KEY) || ''); } catch (e) { return ''; }
  }

  function writeNick(value) {
    try { root.localStorage.setItem(NICK_KEY, value); } catch (e) { /* не запомним */ }
  }

  // Ник — латиница, цифры, дефис и подчёркивание, до NICK_MAX; так он влезает
  // в табло на стене и не требует кириллического шрифта 3x5.
  function cleanNick(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, NICK_MAX);
  }

  // Рекорд — пара «ник и счёт» того, кто его поставил.
  function readRecord() {
    var best = readBest();
    return best > 0 ? { nick: readNick(), best: best } : null;
  }

  function bestLabel() {
    var record = readRecord();
    return record ? String(record.best) + ' · ' + record.nick.toUpperCase() : '0';
  }

  /* Новый рекорд: в хранилище — и всем, кто слушает: табло на стене офиса
     перерисовывается по этому событию без перезагрузки. */
  function announceRecord(record) {
    writeBest(record.best);
    writeNick(record.nick);
    try {
      document.dispatchEvent(new root.CustomEvent('office:record', { detail: record }));
    } catch (e) { /* без CustomEvent табло обновится при следующей загрузке */ }
  }

  function build() {
    if (ui) return ui;
    var field = el('canvas', { class: 'console__field', 'aria-label': 'Tetris' });
    var preview = el('canvas', { class: 'console__next', 'aria-hidden': 'true' });
    var stats = {
      score: el('b', { text: '0' }),
      level: el('b', { text: '1' }),
      lines: el('b', { text: '0' }),
      best: el('b', { text: bestLabel() }),
    };
    function stat(key) {
      return el('div', { class: 'console__stat' }, [el('span', { text: t(TEXT[key]) }), stats[key]]);
    }
    var keys = {};
    // Кнопка — клавиша-колпачок: крупно знак действия, мелко подпись клавиши,
    // если она не совпадает со знаком (↑ у поворота, пробел у сброса, P у паузы).
    function key(name, glyph, action, legend, wide) {
      var kids = [glyph, legend ? el('small', { class: 'console__key-legend', 'aria-hidden': 'true', text: legend }) : null];
      keys[name] = el('button', { class: 'console__key' + (wide ? ' console__key--wide' : ''), type: 'button', 'aria-label': t(TEXT.keys[name]), title: t(TEXT.keys[name]) }, kids);
      keys[name].addEventListener('click', function () { action(); });
      return keys[name];
    }
    var overlay = el('div', { class: 'console__over', hidden: true }, [
      el('b', { class: 'console__over-title' }),
      el('span', { class: 'console__over-text' }),
    ]);
    var log = el('pre', { class: 'console__log', 'aria-live': 'polite' });
    // Одна строка под стаканом: стрелки как на клавиатуре, широкий пробел, P.
    var keyRow = el('div', { class: 'console__keys' }, [
      el('span', { class: 'console__keys-group' }, [
        key('left', '←', function () { act('left'); }),
        key('down', '↓', function () { act('down'); }),
        key('right', '→', function () { act('right'); }),
        key('rotate', '↻', function () { act('rotate'); }, '↑'),
      ]),
      key('drop', '⤓', function () { act('drop'); }, 'space', true),
      key('pause', 'II', function () { act('pause'); }, 'P'),
    ]);
    var play = el('div', { class: 'console__play', hidden: true }, [
      el('div', { class: 'console__well' }, [field, overlay]),
      el('div', { class: 'console__side' }, [
        el('div', { class: 'console__stat' }, [el('span', { text: t(TEXT.next) }), preview]),
        stat('score'), stat('level'), stat('lines'), stat('best'),
      ]),
      keyRow,
    ]);
    // Третий экран — таблица рекордов после игры: терминальный текст, как
    // загрузка. Кнопка — для пальца и мыши, с клавиатуры то же делает R.
    var scores = el('pre', { class: 'console__scores', hidden: true, 'aria-live': 'polite' });
    var again = el('button', { class: 'console__key console__key--text', type: 'button', text: t(TEXT.again) });
    again.addEventListener('click', function () { startGame(); });
    var closeBtn = el('button', { class: 'console__close', type: 'button', 'aria-label': t(TEXT.close), title: t(TEXT.close), text: '×' });
    closeBtn.addEventListener('click', close);
    var dialog = el('div', { class: 'console', role: 'dialog', 'aria-modal': 'true', 'aria-label': t(TEXT.title), tabindex: '-1' }, [
      el('div', { class: 'console__bar' }, [
        el('span', { class: 'console__dots', 'aria-hidden': 'true' }, [el('i'), el('i'), el('i')]),
        el('b', { text: 'alexey@legalops' }),
        el('span', { text: ' ' + TEXT.path }),
        el('span', { class: 'console__hint', text: t(TEXT.hint) }),
        closeBtn,
      ]),
      el('div', { class: 'console__body' }, [log, play, scores]),
    ]);
    var veil = el('div', { class: 'console-veil', hidden: true }, [dialog]);
    veil.addEventListener('mousedown', function (event) { if (event.target === veil) close(); });
    document.body.appendChild(veil);

    ui = { veil: veil, dialog: dialog, log: log, play: play, scores: scores, again: again, field: field, preview: preview, stats: stats, overlay: overlay, keys: keys, keyRow: keyRow, closeBtn: closeBtn };
    return ui;
  }

  /* --- загрузка ------------------------------------------------------------ */

  function typeLine(line, done) {
    var node = document.createTextNode('');
    ui.log.appendChild(node);
    var i = 0;
    (function step() {
      if (phase !== 'boot') return;
      i += 1;
      node.nodeValue = line.slice(0, i);
      if (i < line.length) later(step, TYPE_MS);
      else done(node);
    })();
  }

  function boot() {
    phase = 'boot';
    ui.log.textContent = '';
    ui.log.hidden = false;
    ui.play.hidden = true;
    ui.scores.hidden = true;

    if (LESS_MOTION) { finishBoot(); return; }

    var i = 0;
    (function next() {
      if (phase !== 'boot') return;
      if (i === BOOT.length) { askLogin(); return; }
      var line = BOOT[i];
      i += 1;
      typeLine(line, function (node) {
        if (i < BOOT.length) {
          ui.log.appendChild(document.createTextNode('\n'));
          later(next, LINE_MS);
          return;
        }
        // Последняя строка — полоса загрузки, бежит делениями.
        var filled = 0;
        (function bar() {
          if (phase !== 'boot') return;
          filled += 1;
          var blocks = '';
          for (var k = 0; k < 10; k += 1) blocks += k < filled ? '█' : '░';
          node.nodeValue = line + blocks + ' ' + (filled * 10) + '%';
          if (filled < 10) later(bar, BAR_MS);
          else { ui.log.appendChild(document.createTextNode('\n')); later(next, LINE_MS); }
        })();
      });
    })();
  }

  // Домотать загрузку: все строки разом, полоса полная — и к вводу ника.
  function finishBoot() {
    clearTimers();
    ui.log.textContent = BOOT.slice(0, 3).join('\n') + '\n' + BOOT[3] + '██████████ 100%\n';
    askLogin();
  }

  /* Ввод ника — настоящее поле в строке `login:`: с клавиатуры набирается
     как в терминале, на планшете поднимает экранную клавиатуру. Прежний ник
     подставлен, пустой Enter — guest. */
  function askLogin() {
    phase = 'login';
    var field = el('input', {
      class: 'console__login', type: 'text', autocomplete: 'off', autocapitalize: 'off',
      spellcheck: 'false', maxlength: String(NICK_MAX), enterkeyhint: 'go', 'aria-label': 'login',
      value: readNick(),
    });
    field.addEventListener('input', function () {
      var clean = cleanNick(field.value);
      if (clean !== field.value) field.value = clean;
    });
    field.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') { event.preventDefault(); confirmLogin(field); }
    });
    ui.log.appendChild(document.createTextNode(TEXT.login));
    ui.log.appendChild(field);
    ui.login = field;
    field.focus();
    field.select();
  }

  function confirmLogin(field) {
    if (phase !== 'login') return;
    nick = cleanNick(field.value) || 'guest';
    writeNick(nick);
    field.disabled = true;
    ui.log.appendChild(document.createTextNode('\n' + t(TEXT.welcome) + nick + '\n' + t(TEXT.ready)));
    phase = 'boot';
    later(startGame, START_MS);
  }

  /* --- игра ---------------------------------------------------------------- */

  function fitCell() {
    var free = root.innerHeight - CHROME;
    return Math.max(CELL_MIN, Math.min(CELL_MAX, Math.floor(free / ROWS)));
  }

  function applyCell(size) {
    cell = size;
    sizeCanvas(ui.field, COLS * cell, ROWS * cell);
    sizeCanvas(ui.preview, 4 * cell, 2 * cell);
    fitKeys();
  }

  // Ряд клавиш — в одну строку под стаканом: колпачок убавляется, пока ряд не
  // перестанет переноситься (высота ряда — один колпачок). Под палец ниже
  // CAP_TOUCH не идём: если и так не влезает, пусть переносится.
  function fitKeys() {
    var floor = COARSE ? CAP_TOUCH : CAP_MIN;
    var cap = Math.max(floor, CAP_MAX);
    for (;;) {
      ui.dialog.style.setProperty('--cap', cap + 'px');
      ui.dialog.classList.toggle('console--tight', cap < CAP_LEGEND);
      if (cap <= floor || ui.keyRow.getBoundingClientRect().height <= cap + 1) return;
      cap -= 1;
    }
  }

  // Стакан — во всё окно, но окно — в экран. Прикидка по высоте даёт клетку,
  // дальше окно измеряется по-настоящему и клетка убавляется, пока оно не
  // влезет и по высоте, и по ширине: на телефоне стакан, показатели и кнопки
  // стоят стопкой, и никакая формула про их высоту не переживёт правку стилей.
  function fitWindow() {
    applyCell(fitCell());
    var pad = root.getComputedStyle(ui.veil);
    var roomX = root.innerWidth - parseFloat(pad.paddingLeft) - parseFloat(pad.paddingRight);
    var roomY = root.innerHeight - parseFloat(pad.paddingTop) - parseFloat(pad.paddingBottom);
    while (cell > CELL_MIN) {
      var box = ui.dialog.getBoundingClientRect();
      if (box.width <= roomX && box.height <= roomY) break;
      applyCell(cell - 1);
    }
  }

  function sizeCanvas(canvas, w, h) {
    var dpr = root.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  function startGame() {
    if (phase === 'closed') return;
    clearTimers();
    phase = 'play';
    game = create();
    ui.log.hidden = true;
    ui.scores.hidden = true;
    ui.play.hidden = false;
    ui.overlay.hidden = true;
    fitWindow();
    ui.stats.best.textContent = bestLabel();
    updateStats();
    lastFrame = 0;
    loop(0);
  }

  function updateStats() {
    ui.stats.score.textContent = String(game.score);
    ui.stats.level.textContent = String(game.level);
    ui.stats.lines.textContent = String(game.lines);
  }

  function block(ctx, x, y, size, color, ghost) {
    // Шов и фаска растут вместе с клеткой: при 16 px это 1 и 2 px, при 40 — 3 и 5.
    var seam = Math.max(1, Math.round(size / 16));
    var edge = Math.max(2, Math.round(size / 8));
    var inner = size - 2 * seam;
    if (ghost) {
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = seam;
      ctx.strokeRect(x * size + seam * 1.5, y * size + seam * 1.5, size - 3 * seam, size - 3 * seam);
      ctx.globalAlpha = 1;
      return;
    }
    // Клетка с тёмным швом и светлым бликом сверху-слева — пиксельный объём.
    ctx.fillStyle = color;
    ctx.fillRect(x * size + seam, y * size + seam, inner, inner);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(x * size + seam, y * size + seam, inner, edge);
    ctx.fillRect(x * size + seam, y * size + seam, edge, inner);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(x * size + seam, y * size + size - seam - edge, inner, edge);
    ctx.fillRect(x * size + size - seam - edge, y * size + seam, edge, inner);
  }

  function render() {
    var ctx = ui.field.getContext('2d');
    ctx.fillStyle = '#0b1018';
    ctx.fillRect(0, 0, COLS * cell, ROWS * cell);
    // Сетка едва видна: клетки читаются и без неё, но с ней поле — стакан.
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    for (var gx = 1; gx < COLS; gx += 1) ctx.fillRect(gx * cell, 0, 1, ROWS * cell);
    for (var gy = 1; gy < ROWS; gy += 1) ctx.fillRect(0, gy * cell, COLS * cell, 1);

    for (var y = 0; y < ROWS; y += 1) {
      for (var x = 0; x < COLS; x += 1) {
        if (game.board[y][x]) block(ctx, x, y, cell, COLORS[game.board[y][x]]);
      }
    }
    if (game.piece && !game.over) {
      var p = game.piece;
      var gy2 = ghostY(game);
      for (var py = 0; py < p.shape.length; py += 1) {
        for (var px = 0; px < p.shape[py].length; px += 1) {
          if (!p.shape[py][px]) continue;
          if (gy2 !== p.y) block(ctx, p.x + px, gy2 + py, cell, COLORS[p.kind], true);
          block(ctx, p.x + px, p.y + py, cell, COLORS[p.kind]);
        }
      }
    }

    var nctx = ui.preview.getContext('2d');
    nctx.clearRect(0, 0, 4 * cell, 2 * cell);
    var n = game.next;
    var ox = Math.floor((4 - n.shape[0].length) / 2);
    var oy = n.shape.length === 1 ? 0.5 : 0;
    for (var ny = 0; ny < n.shape.length; ny += 1) {
      for (var nx = 0; nx < n.shape[ny].length; nx += 1) {
        if (n.shape[ny][nx]) block(nctx, ox + nx, oy + ny, cell, COLORS[n.kind]);
      }
    }
  }

  /* Третий экран: общая десятка со своей записью на своём месте, счёт
     партии и подсказка. Данные — `window.RECORDS` из `data/records.js`;
     без файла или с пустым — только своя запись, либо честное «пока никого». */
  function readTop() {
    var data = root.RECORDS;
    return data && data.top && data.top.length ? data.top : [];
  }

  function padLeft(value, width) {
    var text = String(value);
    while (text.length < width) text = ' ' + text;
    return text;
  }

  function padRight(value, width) {
    var text = String(value);
    while (text.length < width) text += ' ';
    return text;
  }

  /* Строка таблицы: место (пусто у своей записи вне десятки), ник, счёт.
     Пьедестал — золото, серебро, бронза чуть жирнее (решение владельца);
     своя строка — акцентом, а на пьедестале цвет медали главнее, и свою
     узнают по пометке `you`. */
  var MEDALS = ['is-gold', 'is-silver', 'is-bronze'];

  function scoreLine(rank, row) {
    var text = padLeft(rank === null ? '' : rank, 2) + '  ' + padRight(row.nick, NICK_MAX) + '  ' + padLeft(row.best, 6);
    var medal = rank !== null && rank <= MEDALS.length ? MEDALS[rank - 1] : '';
    var line = el('span', { class: 'console__scores-row' + (row.mine ? ' is-mine' : '') + (medal ? ' ' + medal : '') }, [text]);
    if (row.mine && medal) line.appendChild(el('span', { class: 'console__scores-you', text: '  you' }));
    line.appendChild(document.createTextNode('\n'));
    return line;
  }

  function showScores() {
    if (phase !== 'play') return;
    phase = 'scores';
    root.cancelAnimationFrame(raf);
    ui.play.hidden = true;
    ui.overlay.hidden = true;

    var pane = ui.scores;
    pane.textContent = '';
    pane.appendChild(el('span', { class: 'console__scores-title', text: TEXT.scores + '\n' }));
    var table = mergeScores(readTop(), readRecord());
    if (!table.rows.length) pane.appendChild(document.createTextNode(t(TEXT.nobody) + '\n'));
    table.rows.forEach(function (row, i) { pane.appendChild(scoreLine(i + 1, row)); });
    if (table.extra) {
      pane.appendChild(document.createTextNode('\n'));
      pane.appendChild(scoreLine(null, table.extra));
    }
    pane.appendChild(el('span', { class: 'console__scores-foot', text: t(TEXT.score) + ' ' + game.score + ' · ' + t(TEXT.again) + ' · ' + t(TEXT.hint) + '\n' }));
    pane.appendChild(ui.again);
    pane.hidden = false;
    ui.dialog.focus();
  }

  function showOverlay(title, text) {
    ui.overlay.hidden = false;
    ui.overlay.firstChild.textContent = title;
    ui.overlay.lastChild.textContent = text;
  }

  function loop(now) {
    if (phase !== 'play') return;
    var dt = lastFrame ? Math.min(now - lastFrame, 100) : 0;
    lastFrame = now;
    if (!game.over && !game.paused) {
      tick(game, dt);
      updateStats();
    }
    render();
    if (game.over) {
      if (game.score > readBest()) {
        announceRecord({ nick: nick || readNick() || 'guest', best: game.score });
        ui.stats.best.textContent = bestLabel();
      }
      showOverlay(t(TEXT.over), t(TEXT.score) + ' ' + game.score + ' · ' + t(TEXT.again) + ' · ' + t(TEXT.hint));
      later(showScores, OVER_MS);
      return;   // без кадров: дальше таблица, R или Esc
    }
    raf = root.requestAnimationFrame(loop);
  }

  function resume() {
    if (phase !== 'play' || game.over) return;
    lastFrame = 0;
    root.cancelAnimationFrame(raf);
    raf = root.requestAnimationFrame(loop);
  }

  function act(name) {
    if (phase === 'boot') { finishBoot(); return; }
    if (phase !== 'play') return;
    if (name === 'pause') {
      if (game.over) return;
      game.paused = !game.paused;
      if (game.paused) showOverlay(t(TEXT.paused), 'P');
      else { ui.overlay.hidden = true; resume(); }
      return;
    }
    if (name === 'restart') { startGame(); return; }
    if (game.over || game.paused) return;
    if (name === 'left') move(game, -1);
    else if (name === 'right') move(game, 1);
    else if (name === 'rotate') rotate(game);
    else if (name === 'down') softDrop(game);
    else if (name === 'drop') hardDrop(game);
    updateStats();
    render();
    if (game.over) loop(lastFrame || 1);
  }

  var KEYS = {
    ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'rotate', ArrowDown: 'down',
    x: 'rotate', X: 'rotate', ч: 'rotate', Ч: 'rotate',
    ' ': 'drop', p: 'pause', P: 'pause', з: 'pause', З: 'pause',
    r: 'restart', R: 'restart', к: 'restart', К: 'restart',
  };

  function onKey(event) {
    if (phase === 'closed') return;
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (event.key === 'Tab') { trapTab(event); return; }
    // Ввод ника: клавиши идут в поле, Enter подтверждает и там, и здесь.
    if (phase === 'login') {
      if (event.key === 'Enter') { event.preventDefault(); confirmLogin(ui.login); }
      return;
    }
    if (phase === 'scores') {
      if (event.key === 'Enter' || event.key === ' ' || KEYS[event.key] === 'restart') {
        event.preventDefault();
        startGame();
      }
      return;
    }
    if (phase === 'boot') {
      // Пока ждём начала игры после ввода ника — клавиши ничего не значат.
      if (ui.login && ui.login.disabled) { event.preventDefault(); return; }
      event.preventDefault();
      act('skip');
      return;
    }
    var name = KEYS[event.key];
    if (!name) return;
    event.preventDefault();
    act(name);
  }

  // Tab ходит по кнопкам окна и не уходит на страницу под ним.
  function trapTab(event) {
    var focusable = Array.prototype.slice.call(ui.dialog.querySelectorAll('button:not([disabled])'))
      .filter(function (node) { return node.offsetParent !== null; });
    if (!focusable.length) { event.preventDefault(); return; }
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === ui.dialog)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function onResize() {
    if (phase !== 'play') return;
    fitWindow();
    render();
  }

  function onBlur() {
    if (phase === 'play' && game && !game.over && !game.paused) act('pause');
  }

  function onVisibility() {
    if (document.hidden) onBlur();
  }

  /* --- открыть / закрыть --------------------------------------------------- */

  function open(returnTo) {
    if (phase !== 'closed') return;
    build();
    opener = returnTo || document.activeElement;
    ui.veil.hidden = false;
    document.body.classList.add('is-console');
    document.addEventListener('keydown', onKey, true);
    root.addEventListener('blur', onBlur);
    root.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);
    ui.dialog.focus();
    boot();
  }

  function close() {
    if (phase === 'closed') return;
    phase = 'closed';
    ui.login = null;
    clearTimers();
    root.cancelAnimationFrame(raf);
    document.removeEventListener('keydown', onKey, true);
    root.removeEventListener('blur', onBlur);
    root.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisibility);
    ui.veil.hidden = true;
    document.body.classList.remove('is-console');
    if (opener && typeof opener.focus === 'function') opener.focus();
    opener = null;
  }

  root.OfficeConsole = {
    open: open,
    close: close,
    isOpen: function () { return phase !== 'closed'; },
    phase: function () { return phase; },
    game: function () { return game; },
    record: readRecord,
    nick: function () { return nick; },
    act: act,
    Tetris: Tetris,
  };
})(typeof window !== 'undefined' ? window : null);
