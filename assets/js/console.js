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

  /* --- спецклетки (5.38) ------------------------------------------------------
     Одна из четырёх клеток фигуры бывает особой: значение клетки формы — не 1,
     а ключ спецклетки, и поворот переносит его вместе с формой. При приземлении
     линии чистятся как обычно, а уцелевшая спецклетка запускает эффект:
     `game.effect` держит следующую фигуру, пока не доиграет, и ведётся временем
     через `tick`. Что выше сожжённой клетки, опускается на число сожжённых под
     ним, старые дыры остаются — «оседание». За сожжённую клетку стопки —
     SPECIAL_SCORE × уровень (ставка линии: 100 за десять); свои клетки фигуры и
     сама спецклетка не в счёт; `lines` и уровень растут только от настоящих
     линий. Розыгрыш — по весам, с первого уровня: посетитель играет одну
     партию, и спецклетка должна успеть ему встретиться. */
  var SPECIALS = { hole: 6, acid: 3, laser: 1 };   // ключ → вес при розыгрыше (5.47: дыра 3×3 частая, лазер-крест редкий)
  var SPECIAL_CHANCE = 0.15;   // доля фигур со спецклеткой (5.39: была 0,1 — владелец после партии)
  var SPECIAL_SCORE = 10;      // за сожжённую клетку стопки, × уровень
  var HOLE_MS = 500;           // чёрная дыра: втягивает 3×3 вокруг себя (5.47; 5.41–5.46 было 5×5)
  var LASER_MS = 500;          // лазер: выжигает весь ряд и весь столбец (5.47, вместо мины 3×3)
  var BLAST = { hole: 1 };     // радиус в клетках: 3×3
  var ACID_STEP = 220;         // кислота: мс на клетку вниз (5.39: было 180)
  var ACID_DEPTH = 4;          // кислота: клеток вниз, потом растворяется сама

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

  function isSpecial(value) {
    return typeof value === 'string' && Object.prototype.hasOwnProperty.call(SPECIALS, value);
  }

  // Спецклетка — по шансу игры (`specialChance`, по умолчанию SPECIAL_CHANCE),
  // тип — по весам, место — любая из клеток формы.
  function plantSpecial(game, piece) {
    var chance = typeof game.specialChance === 'number' ? game.specialChance : SPECIAL_CHANCE;
    if (!(game.rng() < chance)) return;
    var keys = Object.keys(SPECIALS);
    var total = 0;
    keys.forEach(function (key) { total += SPECIALS[key]; });
    var roll = game.rng() * total;
    var type = keys[keys.length - 1];
    for (var i = 0; i < keys.length; i += 1) {
      roll -= SPECIALS[keys[i]];
      if (roll < 0) { type = keys[i]; break; }
    }
    var cells = [];
    piece.shape.forEach(function (row, y) {
      row.forEach(function (v, x) { if (v) cells.push([y, x]); });
    });
    var at = cells[Math.min(cells.length - 1, Math.floor(game.rng() * cells.length))];
    piece.shape[at[0]][at[1]] = type;
  }

  function drawPiece(game) {
    if (!game.bag.length) game.bag = shuffledBag(game.rng);
    var kind = game.bag.pop();
    var piece = { kind: kind, shape: SHAPES[kind].map(function (r) { return r.slice(); }), x: 0, y: 0 };
    plantSpecial(game, piece);
    return piece;
  }

  function emptyRow() {
    var row = [];
    for (var i = 0; i < COLS; i += 1) row.push(0);
    return row;
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

  function create(rng, options) {
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
      specialChance: options && typeof options.specialChance === 'number' ? options.specialChance : SPECIAL_CHANCE,
      effect: null,     // идущий эффект спецклетки: держит следующую фигуру
      cleared: [],      // номера строк, снятых последней чисткой
    };
    for (var y = 0; y < ROWS; y += 1) game.board.push(emptyRow());
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
    var cleared = [];
    for (var y = 0; y < ROWS; y += 1) {
      var full = true;
      for (var x = 0; x < COLS; x += 1) if (!game.board[y][x]) { full = false; break; }
      if (full) cleared.push(y);
      else kept.push(game.board[y]);
    }
    while (kept.length < ROWS) kept.unshift(emptyRow());
    game.board = kept;
    game.cleared = cleared;
    return cleared.length;
  }

  function scoreLines(game, cleared) {
    game.score += LINE_SCORE[cleared] * game.level;
    game.lines += cleared;
    game.level = 1 + Math.floor(game.lines / 10);
  }

  function lock(game) {
    var p = game.piece;
    var own = [];          // клетки фигуры в стакане: за них очков не дают
    var special = null;
    for (var y = 0; y < p.shape.length; y += 1) {
      for (var x = 0; x < p.shape[y].length; x += 1) {
        var v = p.shape[y][x];
        if (!v) continue;
        var ny = p.y + y;
        var nx = p.x + x;
        if (ny < 0) { game.over = true; continue; }
        game.board[ny][nx] = isSpecial(v) ? v : p.kind;
        own.push({ x: nx, y: ny });
        if (isSpecial(v)) special = { type: v, x: nx, y: ny };
      }
    }
    scoreLines(game, clearLines(game));
    game.fall = 0;
    if (game.over) return;
    // Спецклетка, ушедшая вместе с линией, ничего не делает; уцелевшая
    // съезжает вниз на число снятых под ней строк и запускает эффект.
    if (special && game.cleared.indexOf(special.y) < 0) {
      var sunk = function (c) {
        return c.y + game.cleared.filter(function (row) { return row > c.y; }).length;
      };
      special.y = sunk(special);
      own = own.filter(function (c) { return game.cleared.indexOf(c.y) < 0; })
        .map(function (c) { return { x: c.x, y: sunk(c) }; });
      game.effect = startEffect(special, own);
      game.piece = null;
      return;
    }
    spawn(game);
  }

  function startEffect(special, own) {
    var effect = { type: special.type, x: special.x, y: special.y, t: 0, own: own, burnt: 0 };
    if (effect.type === 'laser') {
      effect.dur = LASER_MS;
      effect.cells = [];
      for (var lx = 0; lx < COLS; lx += 1) effect.cells.push({ x: lx, y: special.y });
      for (var ly = 0; ly < ROWS; ly += 1) if (ly !== special.y) effect.cells.push({ x: special.x, y: ly });
    } else if (BLAST[effect.type]) {
      var r = BLAST[effect.type];
      effect.dur = HOLE_MS;
      effect.cells = [];
      for (var dy = -r; dy <= r; dy += 1) {
        for (var dx = -r; dx <= r; dx += 1) {
          var cy = special.y + dy;
          var cx = special.x + dx;
          if (cy >= 0 && cy < ROWS && cx >= 0 && cx < COLS) effect.cells.push({ x: cx, y: cy });
        }
      }
    } else {
      effect.dur = ACID_STEP * (ACID_DEPTH + 1);   // прикидка для окна; шаги считает acidStep
    }
    return effect;
  }

  function isOwn(effect, x, y) {
    return effect.own.some(function (c) { return c.x === x && c.y === y; });
  }

  // Всё, что выше клетки (x, y), опускается на одну: сама клетка уже пуста.
  // Свои клетки фигуры едут вместе со столбцом, чтобы и дальше не считаться.
  function dropAbove(game, effect, x, y) {
    for (var yy = y; yy > 0; yy -= 1) game.board[yy][x] = game.board[yy - 1][x];
    game.board[0][x] = 0;
    effect.own.forEach(function (c) { if (c.x === x && c.y < y) c.y += 1; });
  }

  // Остаток фигуры не висит: свои клетки с пустотой под собой опускаются,
  // пока не упрутся, — снизу вверх, чтобы нижняя села первой, а верхняя легла
  // на неё. Фигура держалась на том, что сгорело, — значит, падает (5.43,
  // дефект нашёл владелец: боковые клетки T зависли над съеденным пиком).
  // Сама кислота не падает — растворяется на месте; чужие навесы стопки, как
  // в классике, остаются.
  function settleOwn(game, effect) {
    effect.own.slice().sort(function (a, b) { return b.y - a.y; }).forEach(function (c) {
      var v = game.board[c.y][c.x];
      if (!v || v === 'acid') return;
      while (c.y + 1 < ROWS && !game.board[c.y + 1][c.x]) {
        game.board[c.y + 1][c.x] = v;
        game.board[c.y][c.x] = 0;
        c.y += 1;
      }
    });
  }

  // Сжечь клетку: очки за чужую, пусто на её месте, столбец над ней оседает.
  function burnCell(game, effect, x, y) {
    if (!game.board[y][x]) return;
    if (!isOwn(effect, x, y)) game.score += SPECIAL_SCORE * game.level;
    game.board[y][x] = 0;
    effect.own = effect.own.filter(function (c) { return !(c.x === x && c.y === y); });
    dropAbove(game, effect, x, y);
  }

  // Кислота: клетка строго под ней сгорает, столбец оседает — кислота съезжает
  // на её место; под ней пусто, дно или предел глубины — растворяется сама.
  function acidStep(game, effect) {
    var below = effect.y + 1;
    if (effect.burnt < ACID_DEPTH && below < ROWS && game.board[below][effect.x]) {
      burnCell(game, effect, effect.x, below);
      effect.y = below;
      effect.burnt += 1;
      settleOwn(game, effect);
      return;
    }
    game.board[effect.y][effect.x] = 0;
    dropAbove(game, effect, effect.x, effect.y);
    finishEffect(game);
  }

  function advanceEffect(game, dt) {
    var effect = game.effect;
    effect.t += dt;
    if (effect.type === 'acid') {
      while (game.effect === effect && effect.t >= ACID_STEP) {
        effect.t -= ACID_STEP;
        acidStep(game, effect);
      }
      return;
    }
    if (effect.t >= effect.dur) finishEffect(game);
  }

  // Эффект доиграл: лазер выжигает крест, дыра — 3×3, столбцы оседают; потом
  // обычная чистка линий — и только теперь следующая фигура.
  function finishEffect(game) {
    var effect = game.effect;
    if (effect.cells) {
      var holes = {};
      effect.cells.forEach(function (c) {
        if (!game.board[c.y][c.x]) return;
        if (!isOwn(effect, c.x, c.y)) game.score += SPECIAL_SCORE * game.level;
        game.board[c.y][c.x] = 0;
        (holes[c.x] = holes[c.x] || []).push(c.y);
      });
      Object.keys(holes).forEach(function (x) {
        holes[x].sort(function (a, b) { return a - b; });   // верхняя дыра первой: нижние не сдвигаются
        holes[x].forEach(function (y) { dropAbove(game, effect, Number(x), y); });
      });
    }
    settleOwn(game, effect);
    game.effect = null;
    scoreLines(game, clearLines(game));
    spawn(game);
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
    if (game.effect && !game.over && !game.paused) { advanceEffect(game, dt); return; }
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
    SPECIALS: SPECIALS,
    SPECIAL_CHANCE: SPECIAL_CHANCE,
    SPECIAL_SCORE: SPECIAL_SCORE,
    HOLE_MS: HOLE_MS,
    LASER_MS: LASER_MS,
    BLAST: BLAST,
    ACID_STEP: ACID_STEP,
    ACID_DEPTH: ACID_DEPTH,
    isSpecial: isSpecial,
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

  /* --- ник ------------------------------------------------------------------
     Ник выдаёт консоль сама: слово из списка и две цифры — `orbit-42`.
     Посетитель своего ника не набирает, и чужого мата на общем табло не
     бывает по построению (решение владельца вместо модерации). Слова
     короткие, нейтральные, латиницей, без грязных созвучий по-русски и
     по-английски — список сторожит проверка; цифры — чтобы два «orbit» не
     слились в одну строку. Раз выданный ник закреплён за браузером; ники
     прежнего свободного вида (до 5.30) заменяются, рекорд остаётся. */
  var NICK_MAX = 8;         // знаков: слово до пяти, дефис и две цифры
  var NICK_WORDS = [
    'alpha', 'beta', 'gamma', 'delta', 'sigma', 'omega', 'theta', 'kappa', 'zeta',
    'iota', 'nova', 'comet', 'orbit', 'lunar', 'solar', 'astro', 'star', 'moon',
    'mars', 'venus', 'pluto', 'atom', 'ion', 'quark', 'boson', 'muon', 'laser',
    'radar', 'sonar', 'pixel', 'byte', 'chip', 'disk', 'code', 'data',
    'node', 'link', 'loop', 'stack', 'queue', 'array', 'token', 'macro', 'micro',
    'nano', 'giga', 'mega', 'kilo', 'tera', 'river', 'lake', 'ocean', 'coral',
    'reef', 'wave', 'tide', 'cloud', 'storm', 'rain', 'snow', 'frost', 'fog',
    'mist', 'wind', 'dawn', 'dusk', 'noon', 'spark', 'flame', 'ember', 'blaze',
    'stone', 'rock', 'flint', 'sand', 'dune', 'mesa', 'cliff', 'ridge', 'peak',
    'hill', 'vale', 'glen', 'grove', 'oak', 'pine', 'elm', 'birch', 'cedar',
    'maple', 'fern', 'moss', 'ivy', 'lotus', 'iris', 'rose', 'lily', 'daisy',
    'tulip', 'mint', 'sage', 'basil', 'thyme', 'cocoa', 'latte', 'mango', 'lemon',
    'lime', 'melon', 'peach', 'plum', 'berry', 'apple', 'olive', 'honey', 'sugar',
    'candy', 'bagel', 'toast', 'pasta', 'taco', 'sushi', 'ramen', 'fox', 'wolf',
    'bear', 'lynx', 'otter', 'panda', 'koala', 'lemur', 'zebra', 'tiger', 'lion',
    'puma', 'cobra', 'gecko', 'newt', 'frog', 'toad', 'crab', 'squid', 'whale',
    'shark', 'seal', 'crane', 'raven', 'robin', 'finch', 'wren', 'owl', 'hawk',
    'eagle', 'swift', 'dove', 'swan', 'goose', 'duck', 'moth', 'bee', 'wasp',
    'ant', 'mouse', 'mole', 'hare', 'deer', 'elk', 'moose', 'bison', 'yak',
    'llama', 'camel', 'horse', 'pony', 'mule', 'goat', 'sheep', 'lamb', 'gear',
    'cog', 'bolt', 'anvil', 'forge', 'lamp', 'torch', 'lens', 'prism', 'brick',
    'tile', 'plank', 'beam', 'mast', 'sail', 'oar', 'raft', 'canoe', 'kayak',
    'barge', 'ferry', 'cargo', 'crate', 'chest', 'vault', 'key', 'lock', 'gate',
    'door', 'tower', 'arch', 'dome', 'spire', 'plaza', 'alley', 'road', 'path',
    'trail', 'track', 'rail', 'tram', 'metro', 'taxi', 'cab', 'van', 'jeep',
    'bike', 'red', 'blue', 'cyan', 'teal', 'navy', 'lilac', 'mauve', 'amber',
    'gold', 'ivory', 'pearl', 'jade', 'ruby', 'onyx', 'opal', 'topaz', 'beryl',
    'agate', 'umber', 'ochre', 'sepia', 'khaki', 'echo', 'sonic', 'tempo', 'chord',
    'tune', 'note', 'beat', 'alto', 'tenor', 'drum', 'harp', 'flute', 'lyre',
    'viola', 'cello', 'banjo',
  ];
  var NICK_RE = /^([a-z]{3,5})-(\d{2})$/;

  function makeNick(rng) {
    var random = rng || Math.random;
    var word = NICK_WORDS[Math.min(NICK_WORDS.length - 1, Math.floor(random() * NICK_WORDS.length))];
    var digits = String(Math.min(99, Math.floor(random() * 100)));
    return word + '-' + (digits.length < 2 ? '0' + digits : digits);
  }

  // Ник своего вида — как есть (строчными), всё прочее — пустая строка.
  function validNick(value) {
    if (typeof value !== 'string') return '';
    var found = NICK_RE.exec(value.toLowerCase());
    return found && NICK_WORDS.indexOf(found[1]) >= 0 ? found[0] : '';
  }

  /* Стоит ли слать рекорд в общую таблицу: только когда у него есть шанс
     в ней оказаться — десятка неполная, счёт выше её нижней строки или
     улучшена своя строка. Так в таблицу ответов не сыплется всё подряд, а
     заведомо не проходящее остаётся в браузере. */
  function worthSending(top, own) {
    if (!own || !own.nick || !(Number(own.best) > 0)) return false;
    var mine = String(own.nick).toLowerCase();
    var best = Number(own.best);
    var rows = (top || []).filter(function (row) {
      return row && row.nick && Number(row.best) > 0;
    });
    for (var i = 0; i < rows.length; i += 1) {
      if (String(rows[i].nick).toLowerCase() === mine) return best > Number(rows[i].best);
    }
    if (rows.length < TOP_N) return true;
    var floor = rows.reduce(function (low, row) { return Math.min(low, Number(row.best)); }, Infinity);
    return best > floor;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      Tetris: Tetris, mergeScores: mergeScores, worthSending: worthSending,
      makeNick: makeNick, validNick: validNick, NICK_WORDS: NICK_WORDS,
    };
  }
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
  /* Приёмник общей таблицы — Google-форма владельца: страница шлёт в неё
     POST с ником и счётом. Ответ формы не читается (`no-cors`), успеха
     страница не знает и не ждёт: свой рекорд у неё в браузере, общая
     десятка приедет снимком `data/records.js` после ежедневного прогона.
     Адрес и номера полей — из предзаполненной ссылки формы. */
  var RECORDS_FORM = {
    url: 'https://docs.google.com/forms/d/e/1FAIpQLSdCP_iHRmjFXiLs_9vf4y1aiSYLppR0MM-oLz6gSUC4y5UpJQ/formResponse',
    nick: 'entry.928209438',
    score: 'entry.1739214668',
  };
  var BEST_KEY = 'office-tetris-best';
  var NICK_KEY = 'office-tetris-nick';
  var SENT_KEY = 'office-tetris-sent';   // какой счёт уже ушёл в форму

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
  var clock = 0;        // мс от начала партии — часы анимаций спецклеток
  var phase = 'closed'; // closed | boot | play | scores
  var nick = '';        // ник партии: выдан консолью, закреплён в хранилище
  var waiting = false;  // ник напечатан, игра начнётся по таймеру: клавиши ничего не значат
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

  function readSent() {
    try { return Number(root.localStorage.getItem(SENT_KEY)) || 0; } catch (e) { return 0; }
  }

  function writeSent(value) {
    try { root.localStorage.setItem(SENT_KEY, String(value)); } catch (e) { /* не запомним — уйдёт ещё раз */ }
  }

  function readNick() {
    try { return validNick(root.localStorage.getItem(NICK_KEY)); } catch (e) { return ''; }
  }

  function writeNick(value) {
    try { root.localStorage.setItem(NICK_KEY, value); } catch (e) { /* не запомним */ }
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

  function submitRecord(record) {
    if (!root.fetch || !root.URLSearchParams) return;
    var body = new root.URLSearchParams();
    body.set(RECORDS_FORM.nick, record.nick);
    body.set(RECORDS_FORM.score, String(record.best));
    try {
      // keepalive: запрос доживёт, даже если вкладку закрыли сразу после партии.
      // Ушёл — запоминаем счёт, чтобы не слать его после каждой партии; не
      // ушёл (сеть, блокировщик) — уйдёт после следующей.
      root.fetch(RECORDS_FORM.url, { method: 'POST', mode: 'no-cors', body: body, keepalive: true })
        .then(function () { writeSent(record.best); })
        .catch(function () { /* рекорд остаётся своим */ });
    } catch (e) { /* то же */ }
  }

  /* После партии в форму идёт личный рекорд — не обязательно этой партии:
     рекорд, поставленный до общей таблицы или не дошедший до неё, тоже
     должен попасть в снимок. Условия: этот счёт ещё не уходил и у него есть
     шанс в десятке (`worthSending`). */
  function shareRecord() {
    var record = readRecord();
    if (!record || record.best <= readSent()) return;
    if (worthSending(readTop(), record)) submitRecord(record);
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

  function typeLine(line, done, into) {
    var node = document.createTextNode('');
    (into || ui.log).appendChild(node);
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
    waiting = false;

    if (LESS_MOTION) { finishBoot(); return; }

    var i = 0;
    (function next() {
      if (phase !== 'boot') return;
      if (i === BOOT.length) { login(); return; }
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

  // Домотать загрузку: все строки разом, полоса полная, ник напечатан — и к игре.
  function finishBoot() {
    clearTimers();
    issueNick();
    ui.log.textContent = BOOT.slice(0, 3).join('\n') + '\n' + BOOT[3] + '██████████ 100%\n' + TEXT.login;
    ui.log.appendChild(el('span', { class: 'console__nick', text: nick }));
    greet();
  }

  // Ник партии: прежний из хранилища или новый — и сразу в хранилище, чтобы
  // домотка и следующий заход печатали тот же.
  function issueNick() {
    nick = readNick() || makeNick();
    writeNick(nick);
  }

  /* Вход: строку `login:` консоль дописывает сама, по буквам, как загрузку.
     Поля ввода нет — своего ника посетитель не выбирает. */
  function login() {
    issueNick();
    ui.log.appendChild(document.createTextNode(TEXT.login));
    var slot = el('span', { class: 'console__nick' });
    ui.log.appendChild(slot);
    typeLine(nick, greet, slot);
  }

  function greet() {
    ui.log.appendChild(document.createTextNode('\n' + t(TEXT.welcome) + nick + '\n' + t(TEXT.ready)));
    waiting = true;
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
    waiting = false;
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
    bevel(ctx, x, y, size);
  }

  function bevel(ctx, x, y, size) {
    var seam = Math.max(1, Math.round(size / 16));
    var edge = Math.max(2, Math.round(size / 8));
    var inner = size - 2 * seam;
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(x * size + seam, y * size + seam, inner, edge);
    ctx.fillRect(x * size + seam, y * size + seam, edge, inner);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(x * size + seam, y * size + size - seam - edge, inner, edge);
    ctx.fillRect(x * size + size - seam - edge, y * size + seam, edge, inner);
  }

  // Плоская заливка внутри шва, без фаски: дыра — не блок.
  function flat(ctx, x, y, size, color) {
    var seam = Math.max(1, Math.round(size / 16));
    ctx.fillStyle = color;
    ctx.fillRect(x * size + seam, y * size + seam, size - 2 * seam, size - 2 * seam);
  }

  /* --- спецклетки: вид ---------------------------------------------------------
     Значки рисуются пикселем в одну восьмую клетки — 5 px при 40, то же зерно,
     что фаска обычных блоков (требование владельца после TNT субпикселем 2 px).
     Движение — по часам кадра `clock`, без таймеров; при reduced-motion часы
     стоят на нуле — первый кадр. Мина — тёмный металл с пластиной и красным
     диодом, мигает двойным вспыхом; дыра — плоская чернота с туманностью
     вокруг ядра, ободок дышит, звёзды мерцают; яд — череп на лайме, плывёт по
     синусу вверх на 0,7 и вниз на 0,2 доли, рядом всплывают пузырьки. Всё
     строго внутри клетки. Выбрано владельцем из девяти показов на настоящем
     стакане (5.38). */
  var INK = {
    acid: '#d4ff2e', acidDark: '#5f8a00',
    gun: '#3a4152', plateLight: '#7c8699', plate: '#5c6478', plateDark: '#454c5e', socket: '#22262f',
    screw: '#8a93a3', ledOn: '#ff2e2e', ledOff: '#5a1010', ledCore: '#ffb0b0',
    black: '#05030d', star: '#e7eaf2', starDim: '#9aa3b5',
    fireWhite: '#fff3b0', fireYellow: '#ffd23f', fireOrange: '#ff7a1a', fireDark: '#7a2416',
  };
  var NEBULA = { n: '#2a3f8f', p: '#5a3aa8', m: '#9b5de5', l: '#d8c8ff', k: '#000000' };
  var NEBULA_DIM = { n: '#2a3f8f', p: '#5a3aa8', m: '#9b5de5', l: '#b48cff', k: '#000000' };
  var NEBULA_ROWS = ['..n.n..', '.npmpn.', 'npmlmpn', 'pmlklmp', 'npmlmpn', '.npmpn.', '..n.n..'];
  var PLATE_ROWS = ['.llll.', 'lmmmmd', 'lmmmmd', 'lmmmmd', 'lmmmmd', '.dddd.'];
  var PLATE_INK = { l: INK.plateLight, m: INK.plate, d: INK.plateDark };
  var SOCKET_ROWS = ['.xx.', 'xxxx', 'xxxx', '.xx.'];
  var SKULL_ROWS = ['.xxx.', 'xxxxx', 'x.x.x', 'xxxxx', '.x.x.'];
  var FRAME_MS = 120;       // шаг дискретных движений: мигание, мерцание, пузырьки
  var BLINK_MS = 2400;      // период двойного мигания диода мины
  var FLOAT_MS = 1800;      // период плавания черепа

  // Пиксель значка: координаты и размер в восьмых долях клетки. Края считаются
  // одной формулой от начала и конца, а не «начало плюс округлённая ширина»:
  // иначе при дробной доле (клетка 34 px → 4,25) соседние пиксели не
  // стыкуются, и череп рассыпается на части (дефект 5.41, найден владельцем).
  function pix(ctx, x, y, size, color, ux, uy, uw, uh) {
    var u = size / 8;
    var x0 = Math.round(x * size + ux * u);
    var y0 = Math.round(y * size + uy * u);
    var x1 = Math.round(x * size + (ux + (uw || 1)) * u);
    var y1 = Math.round(y * size + (uy + (uh || 1)) * u);
    ctx.fillStyle = color;
    ctx.fillRect(x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0));
  }

  // Растровый значок: строки из точек и букв, каждая буква — свой цвет.
  function sprite(ctx, x, y, size, rows, colors, ox, oy) {
    for (var r = 0; r < rows.length; r += 1) {
      for (var c = 0; c < rows[r].length; c += 1) {
        if (rows[r][c] !== '.') pix(ctx, x, y, size, colors[rows[r][c]], ox + c, oy + r, 1, 1);
      }
    }
  }

  function twinkle(ctx, x, y, size, cx, cy, u, core, ray) {
    pix(ctx, x, y, size, ray, cx - u, cy, u, u);
    pix(ctx, x, y, size, ray, cx + u, cy, u, u);
    pix(ctx, x, y, size, ray, cx, cy - u, u, u);
    pix(ctx, x, y, size, ray, cx, cy + u, u, u);
    pix(ctx, x, y, size, core, cx, cy, u, u);
  }

  function screw(ctx, x, y, size, sx, sy) {
    pix(ctx, x, y, size, INK.screw, sx, sy, 0.8, 0.8);
    pix(ctx, x, y, size, INK.socket, sx + 0.1, sy + 0.3, 0.6, 0.2);
  }

  function drawSpecial(ctx, x, y, size, type, ms) {
    var f = Math.floor(ms / FRAME_MS);
    if (type === 'laser') {
      drawLaserCell(ctx, x, y, size, ms);
    } else if (type === 'hole') {
      flat(ctx, x, y, size, INK.black);
      sprite(ctx, x, y, size, NEBULA_ROWS, f % 8 < 4 ? NEBULA : NEBULA_DIM, 0.5, 0.5);
      pix(ctx, x, y, size, INK.star, 0.7, 0.7, 0.6, 0.6);
      if (f % 4 < 2) pix(ctx, x, y, size, INK.starDim, 7, 6, 0.5, 0.5);
      if ((f + 1) % 4 < 2) pix(ctx, x, y, size, INK.starDim, 1, 6.8, 0.5, 0.5);
      if (f % 6 < 3) twinkle(ctx, x, y, size, 6.5, 1.5, 0.5, INK.star, INK.starDim);
      else pix(ctx, x, y, size, INK.star, 6.5, 1.5, 0.5, 0.5);
    } else if (type === 'acid') {
      block(ctx, x, y, size, INK.acid);
      var ph = (ms % FLOAT_MS) / FLOAT_MS * Math.PI * 2;
      var dy = -0.25 - 0.45 * Math.cos(ph);
      var dx = 0.2 * Math.sin(ph * 0.5);
      sprite(ctx, x, y, size, SKULL_ROWS, { x: INK.acidDark }, 1.5 + dx, 1.5 + dy);
      var b1 = (f % 30) * 0.19;
      var b2 = ((f + 15) % 30) * 0.19;
      if (b1 < 5) pix(ctx, x, y, size, INK.acidDark, 0.9, 6.4 - b1, 0.5, 0.5);
      if (b2 < 5) pix(ctx, x, y, size, INK.acidDark, 6.6, 6.4 - b2, 0.5, 0.5);
    }
  }

  /* --- эффекты поверх стакана (5.39) --------------------------------------------
     Сам стакан меняется в ядре по концу эффекта, здесь только картинка. Шум —
     детерминированный, по координатам и номеру кадра: кадры не мигают, а
     прогон с подменёнными часами повторяем. Мина — разряд по соседям, дыра —
     осколки, чернеющие по пути к центру, кислота — разъедание по пикселям и
     испарение; подробности у каждой функции. */
  function noise(a, b, c) {
    var n = Math.sin(a * 12.9898 + b * 78.233 + (c || 0) * 37.719) * 43758.5453;
    return n - Math.floor(n);
  }

  var LZ = { body: '#1a0a12', slate: '#8a93a3', beam: '#ff2e4a', core: '#ffffff', halo: 'rgba(255,46,74,0.35)', halo2: 'rgba(255,46,74,0.16)' };

  // Четверть блока: мини-блок со своей фаской в отведённом прямоугольнике (в единицах).
  function quarter(ctx, x, y, size, ux, uy, uw, uh, color) {
    var u = size / 8;
    var px0 = Math.round(x * size + ux * u);
    var py0 = Math.round(y * size + uy * u);
    var pw = Math.round(uw * u);
    var ph = Math.round(uh * u);
    var edge = Math.max(1, Math.round(size / 16));
    ctx.fillStyle = color;
    ctx.fillRect(px0, py0, pw, ph);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(px0, py0, pw, edge);
    ctx.fillRect(px0, py0, edge, ph);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(px0, py0 + ph - edge, pw, edge);
    ctx.fillRect(px0 + pw - edge, py0, edge, ph);
  }

  // Крест из шва: ореол в две ступени, красная линия, белая сердцевина.
  function cross(ctx, x, y, size, gap, glow, coreOn) {
    var seam = Math.max(1, Math.round(size / 16));
    var inner = size - 2 * seam;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x * size + seam, y * size + seam, inner, inner);
    ctx.clip();
    ctx.globalAlpha = glow;
    pix(ctx, x, y, size, LZ.halo2, 0.6, 4 - gap / 2 - 1.2, 6.8, gap + 2.4);
    pix(ctx, x, y, size, LZ.halo2, 4 - gap / 2 - 1.2, 0.6, gap + 2.4, 6.8);
    pix(ctx, x, y, size, LZ.halo, 0.6, 4 - gap / 2 - 0.5, 6.8, gap + 1);
    pix(ctx, x, y, size, LZ.halo, 4 - gap / 2 - 0.5, 0.6, gap + 1, 6.8);
    ctx.globalAlpha = 1;
    pix(ctx, x, y, size, LZ.beam, 0.6, 4 - gap / 2, 6.8, gap);
    pix(ctx, x, y, size, LZ.beam, 4 - gap / 2, 0.6, gap, 6.8);
    if (coreOn) pix(ctx, x, y, size, LZ.core, 4 - gap / 2 - 0.2, 4 - gap / 2 - 0.2, gap + 0.4, gap + 0.4);
    ctx.restore();
  }

  function quarters(ctx, x, y, size, gap, color, spread) {
    var half = 3.4 - gap / 2 - spread;
    var seam = 0.6 + spread;
    quarter(ctx, x, y, size, seam, seam, half, half, color);
    quarter(ctx, x, y, size, 4 + gap / 2, seam, half, half, color);
    quarter(ctx, x, y, size, seam, 4 + gap / 2, half, half, color);
    quarter(ctx, x, y, size, 4 + gap / 2, 4 + gap / 2, half, half, color);
  }

  // Клетка лазера (5.47, владелец выбрал из показов): четыре серых мини-блока,
  // рассечённых светящимся красным крестом; шов дышит, белая сердцевина
  // изредка гаснет.
  function drawLaserCell(ctx, x, y, size, ms) {
    block(ctx, x, y, size, LZ.body);
    var glow = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(ms / 300));
    cross(ctx, x, y, size, 0.9, glow, (ms % 900) > 100);
    quarters(ctx, x, y, size, 0.9, LZ.slate, 0);
  }

  // Половина клетки (верх/низ или лево/право) со служебного холста со сдвигом.
  function half(ctx, size, x, y, axis, which, dx, dy) {
    var dpr = root.devicePixelRatio || 1;
    var w = axis === 'y' ? size : size / 2;
    var h = axis === 'y' ? size / 2 : size;
    var sx = axis === 'y' ? 0 : which * size / 2;
    var sy = axis === 'y' ? which * size / 2 : 0;
    ctx.drawImage(scratch, Math.round(sx * dpr), Math.round(sy * dpr), Math.round(w * dpr), Math.round(h * dpr), Math.round(x * size + sx + dx), Math.round(y * size + sy + dy), Math.round(w), Math.round(h));
  }

  /* Лазер (5.47): клетка заряжается — крест светится ярче; потом из шва в
     четыре стороны до стенок бьют лучи (белая сердцевина в красном ореоле).
     Луч режет каждую клетку на пути пополам поперёк себя — в ряду на верх и
     низ, в столбце на лево и право, — половины расходятся и тают; у каждой
     клетки свой отсчёт от момента, когда луч её прошёл. Четвертинки самой
     клетки разъезжаются по диагоналям и гаснут, крест остаётся в лучах. */
  function fxLaser(ctx, e, size, p, ms) {
    var u = size / 8;
    var cx = (e.x + 0.5) * size;
    var cy = (e.y + 0.5) * size;
    var charge = Math.min(1, p / 0.15);
    var shoot = Math.max(0, Math.min(1, (p - 0.15) / 0.4));
    var reach = shoot * Math.max(COLS, ROWS) * size;
    e.cells.forEach(function (c, idx) {
      var v = game.board[c.y][c.x];
      if (!v || (c.x === e.x && c.y === e.y)) return;
      var dist = Math.max(Math.abs(c.x - e.x), Math.abs(c.y - e.y)) * size;
      if (reach < dist) return;
      // Свой отсчёт у каждой клетки: от момента, когда луч её прошёл, на разрез — половина эффекта.
      var pass = 0.15 + (dist / (Math.max(COLS, ROWS) * size)) * 0.4;
      var hit = Math.max(0, Math.min(1, (p - pass) / 0.5));
      var axis = c.y === e.y ? 'y' : 'x';          // в ряду режем на верх/низ, в столбце — на лево/право
      var c2 = cellCanvas(size);
      block(c2, 0, 0, size, cellColor(v));
      coverCell(ctx, size, c.x, c.y);
      var sep = hit * hit * size * 0.9;
      ctx.globalAlpha = Math.max(0, 1 - hit * 1.05);
      half(ctx, size, c.x, c.y, axis, 0, axis === 'y' ? 0 : -sep, axis === 'y' ? -sep : 0);
      half(ctx, size, c.x, c.y, axis, 1, axis === 'y' ? 0 : sep, axis === 'y' ? sep : 0);
      ctx.globalAlpha = 1;
      // Вспышка разреза: белая черта поперёк клетки, пока луч только прошёл.
      if (hit < 0.3) {
        ctx.globalAlpha = 1 - hit / 0.3;
        if (axis === 'y') pix(ctx, c.x, c.y, size, LZ.core, 0, 3.7, 8, 0.6);
        else pix(ctx, c.x, c.y, size, LZ.core, 3.7, 0, 0.6, 8);
        ctx.globalAlpha = 1;
      }
    });
    // Лучи.
    if (shoot > 0) {
      var fade = p > 0.7 ? Math.max(0, 1 - (p - 0.7) / 0.3) : 1;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var ex = cx + d[0] * reach;
        var ey = cy + d[1] * reach;
        ctx.globalAlpha = 0.45 * fade;
        ctx.strokeStyle = LZ.beam;
        ctx.lineWidth = u * 2.2;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.globalAlpha = fade;
        ctx.strokeStyle = LZ.core;
        ctx.lineWidth = Math.max(1, u * 0.7);
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }
    // Сама клетка: заряжается — светится; с выстрелом четвертинки разъезжаются по диагоналям.
    coverCell(ctx, size, e.x, e.y);
    if (shoot <= 0) {
      drawLaserCell(ctx, e.x, e.y, size, ms);
      ctx.globalAlpha = 0.6 * charge;
      flat(ctx, e.x, e.y, size, LZ.core);
      ctx.globalAlpha = 1;
      return;
    }
    var fly = Math.min(1, shoot / 0.9);
    ctx.globalAlpha = Math.max(0, 1 - Math.max(0, fly - 0.5) * 2);
    cross(ctx, e.x, e.y, size, 0.9, 1, true);
    ctx.globalAlpha = 1;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - fly * 1.05);
      ctx.translate(cx + q[0] * (1.7 * u + fly * fly * size * 0.9), cy + q[1] * (1.7 * u + fly * fly * size * 0.9));
      quarter(ctx, 0, 0, size, -1.45, -1.45, 2.9, 2.9, LZ.slate);
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  }

  // Цвет клетки стакана для эффектов: у спецклетки — тон её пластины.
  function cellColor(v) { return isSpecial(v) ? INK.plate : COLORS[v]; }

  // Цвет между двумя шестнадцатеричными: t = 0 — первый, 1 — второй.
  function mix(a, b, t) {
    var ar = parseInt(a.slice(1, 3), 16), ag = parseInt(a.slice(3, 5), 16), ab = parseInt(a.slice(5, 7), 16);
    var br = parseInt(b.slice(1, 3), 16), bg = parseInt(b.slice(3, 5), 16), bb = parseInt(b.slice(5, 7), 16);
    return 'rgb(' + Math.round(ar + (br - ar) * t) + ',' + Math.round(ag + (bg - ag) * t) + ',' + Math.round(ab + (bb - ab) * t) + ')';
  }

  var SHARDS = 3;   // клетка трескается на 3×3 осколка

  function drawHole(ctx, e, size, p, ms) {
    var u = size / 8;
    var seam = Math.max(1, Math.round(size / 16));
    var cx = (e.x + 0.5) * size;
    var cy = (e.y + 0.5) * size;
    // Клетки квадрата с началом эффекта трескаются на осколки; каждый осколок
    // срывается к центру со своей задержкой, по дороге чернеет и сжимается
    // (владелец, 5.44: «чтобы блоки расщеплялись, в чёрный красились»).
    e.cells.forEach(function (c) {
      var v = game.board[c.y][c.x];
      if (!v || (c.x === e.x && c.y === e.y)) return;
      var color = cellColor(v);
      var part = (size - 2 * seam) / SHARDS;
      for (var sy = 0; sy < SHARDS; sy += 1) {
        for (var sx = 0; sx < SHARDS; sx += 1) {
          var delay = noise(c.x * 7 + sx, c.y * 5 + sy, 3) * 0.4;
          var qk = Math.max(0, (p - delay) / (1 - delay));
          qk *= qk;
          var x0 = c.x * size + seam + sx * part;
          var y0 = c.y * size + seam + sy * part;
          var fx = x0 + part / 2 + (cx - x0 - part / 2) * qk;
          var fy = y0 + part / 2 + (cy - y0 - part / 2) * qk;
          var fs = Math.max(1, part * (1 - 0.7 * qk) - 1);
          ctx.fillStyle = mix(color, '#000000', Math.min(1, qk * 1.6));
          ctx.fillRect(Math.round(fx - fs / 2), Math.round(fy - fs / 2), Math.round(fs), Math.round(fs));
        }
      }
    });
    // Звёздная пыль стекается со всех сторон.
    ctx.fillStyle = INK.star;
    for (var k = 0; k < 8; k += 1) {
      var ang = noise(k, 21) * Math.PI * 2;
      var dist = 2 + noise(k, 24) * 1.5;
      var qk = Math.max(0, Math.min(1, p * 1.4 - noise(k, 22) * 0.4));
      var sx = e.x + 0.5 + Math.cos(ang) * dist * (1 - qk);
      var sy = e.y + 0.5 + Math.sin(ang) * dist * (1 - qk);
      ctx.globalAlpha = 1 - qk * 0.8;
      ctx.fillRect(Math.round(sx * size), Math.round(sy * size), Math.ceil(u * 0.45), Math.ceil(u * 0.45));
    }
    ctx.globalAlpha = 1;
    // Сама дыра: крутится, набухает, схлопывается.
    var grow = p < 0.75 ? 1 + 0.25 * Math.sin(p / 0.75 * Math.PI) : Math.max(0.02, (1 - p) / 0.25);
    ctx.save();
    ctx.translate((e.x + 0.5) * size, (e.y + 0.5) * size);
    ctx.rotate(p * Math.PI);
    ctx.scale(grow, grow);
    ctx.translate(-0.5 * size, -0.5 * size);
    drawSpecial(ctx, 0, 0, size, 'hole', ms);
    ctx.restore();
  }

  var scratch = null;   // служебный холст в одну клетку: с него клетка переносится по пикселям

  function cellCanvas(size) {
    var dpr = root.devicePixelRatio || 1;
    if (!scratch) scratch = document.createElement('canvas');
    var w = Math.round(size * dpr);
    if (scratch.width !== w || scratch.height !== w) { scratch.width = w; scratch.height = w; }
    var c2 = scratch.getContext('2d');
    c2.setTransform(dpr, 0, 0, dpr, 0, 0);
    c2.clearRect(0, 0, size, size);
    return c2;
  }

  // Пиксель клетки (i, j из 8×8) со служебного холста на поле со сдвигом по y.
  function chunk(ctx, size, x, y, i, j, dy) {
    var dpr = root.devicePixelRatio || 1;
    var u = size / 8;
    var x0 = Math.round(i * u);
    var x1 = Math.round((i + 1) * u);
    var y0 = Math.round(j * u);
    var y1 = Math.round((j + 1) * u);
    ctx.drawImage(scratch, x0 * dpr, y0 * dpr, (x1 - x0) * dpr, (y1 - y0) * dpr, x * size + x0, Math.round(y * size + y0 + dy), x1 - x0, y1 - y0);
  }

  function coverCell(ctx, size, x, y) {
    ctx.fillStyle = '#0b1018';
    ctx.fillRect(x * size, y * size, size, size);
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    ctx.fillRect(x * size, y * size, 1, size);
    ctx.fillRect(x * size, y * size, size, 1);
  }

  /* Кислота (5.45, владелец: «с ядом тоже что-нибудь придумаем»). Пока горит:
     клетка под ней разъедается по пикселям — верх первым, но неровно; пиксель
     сперва зеленеет, потом отваливается каплей вниз и гаснет; над разъеденным
     всплывают пузырьки. На последнем шаге сама кислота испаряется: пиксели
     черепа снизу вверх отрываются, уходят вверх и тают. */
  function drawAcid(ctx, e, size, ms) {
    var u = size / 8;
    var q = Math.min(1, e.t / ACID_STEP);
    var below = e.y + 1;
    var burning = e.burnt < ACID_DEPTH && below < ROWS && game.board[below][e.x];
    var i, j, n, k;
    if (burning) {
      var v = game.board[below][e.x];
      var c2 = cellCanvas(size);
      block(c2, 0, 0, size, isSpecial(v) ? INK.plate : COLORS[v]);
      coverCell(ctx, size, e.x, below);
      for (j = 0; j < 8; j += 1) {
        for (i = 0; i < 8; i += 1) {
          n = 0.1 + 0.5 * noise(i, j, e.burnt) + 0.35 * j / 8;   // порог: когда пиксель разъедается
          if (q < n) { chunk(ctx, size, e.x, below, i, j, 0); continue; }
          k = (q - n) / (1 - n);
          if (k < 0.3) {
            chunk(ctx, size, e.x, below, i, j, 0);
            ctx.globalAlpha = 0.9 * k / 0.3;
            pix(ctx, e.x, below, size, INK.acid, i, j, 1, 1);
            ctx.globalAlpha = 1;
          } else {
            var d = (k - 0.3) / 0.7;
            ctx.globalAlpha = 1 - d;
            pix(ctx, e.x, below, size, mix(INK.acid, INK.acidDark, d), i, j + d * d * 12, 1, 1);
            ctx.globalAlpha = 1;
          }
        }
      }
      ctx.fillStyle = INK.acidDark;
      for (k = 0; k < 3; k += 1) {
        var by = (below + 0.9) * size - ((ms / 45 + k * 29) % (size * 0.9));
        if (by < below * size + u * (1 - q) * 6) continue;   // пузырьки только в разъеденной части
        ctx.fillRect(Math.round(e.x * size + (0.8 + noise(k, e.burnt) * 5.6) * u), Math.round(by), Math.ceil(u * 0.5), Math.ceil(u * 0.5));
      }
    } else {
      var c3 = cellCanvas(size);
      drawSpecial(c3, 0, 0, size, 'acid', ms);
      coverCell(ctx, size, e.x, e.y);
      for (j = 0; j < 8; j += 1) {
        for (i = 0; i < 8; i += 1) {
          n = 0.05 + 0.55 * noise(i, j, 99) + 0.35 * (7 - j) / 8;   // низ испаряется первым
          if (q < n) { chunk(ctx, size, e.x, e.y, i, j, 0); continue; }
          k = (q - n) / (1 - n);
          ctx.globalAlpha = Math.max(0, 1 - k * 1.2);
          chunk(ctx, size, e.x, e.y, i, j, -k * k * size * 1.3);
          ctx.globalAlpha = 1;
        }
      }
    }
  }

  function drawEffect(ctx, e, size, ms) {
    var p = Math.min(1, e.t / e.dur);
    if (e.type === 'laser') fxLaser(ctx, e, size, p, ms);
    else if (e.type === 'hole') drawHole(ctx, e, size, p, ms);
    else drawAcid(ctx, e, size, ms);
  }

  function render() {
    var ctx = ui.field.getContext('2d');
    ctx.fillStyle = '#0b1018';
    ctx.fillRect(0, 0, COLS * cell, ROWS * cell);
    // Сетка едва видна: клетки читаются и без неё, но с ней поле — стакан.
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    for (var gx = 1; gx < COLS; gx += 1) ctx.fillRect(gx * cell, 0, 1, ROWS * cell);
    for (var gy = 1; gy < ROWS; gy += 1) ctx.fillRect(0, gy * cell, COLS * cell, 1);

    var ms = LESS_MOTION ? 0 : clock;
    var pulled = {};   // клетки, которые тянет дыра: их рисует эффект
    if (game.effect && game.effect.type === 'hole') {
      game.effect.cells.forEach(function (c) { pulled[c.y * COLS + c.x] = true; });
    }
    for (var y = 0; y < ROWS; y += 1) {
      for (var x = 0; x < COLS; x += 1) {
        var v = game.board[y][x];
        if (!v || pulled[y * COLS + x]) continue;
        if (isSpecial(v)) drawSpecial(ctx, x, y, cell, v, ms);
        else block(ctx, x, y, cell, COLORS[v]);
      }
    }
    if (game.piece && !game.over) {
      var p = game.piece;
      var gy2 = ghostY(game);
      for (var py = 0; py < p.shape.length; py += 1) {
        for (var px = 0; px < p.shape[py].length; px += 1) {
          var pv = p.shape[py][px];
          if (!pv) continue;
          if (gy2 !== p.y) block(ctx, p.x + px, gy2 + py, cell, COLORS[p.kind], true);
          if (isSpecial(pv)) drawSpecial(ctx, p.x + px, p.y + py, cell, pv, ms);
          else block(ctx, p.x + px, p.y + py, cell, COLORS[p.kind]);
        }
      }
    }
    if (game.effect) drawEffect(ctx, game.effect, cell, ms);

    var nctx = ui.preview.getContext('2d');
    nctx.clearRect(0, 0, 4 * cell, 2 * cell);
    var n = game.next;
    var ox = Math.floor((4 - n.shape[0].length) / 2);
    var oy = n.shape.length === 1 ? 0.5 : 0;
    for (var ny = 0; ny < n.shape.length; ny += 1) {
      for (var nx = 0; nx < n.shape[ny].length; nx += 1) {
        var nv = n.shape[ny][nx];
        if (!nv) continue;
        if (isSpecial(nv)) drawSpecial(nctx, ox + nx, oy + ny, cell, nv, ms);
        else block(nctx, ox + nx, oy + ny, cell, COLORS[n.kind]);
      }
    }
  }

  /* Третий экран — сразу после конца партии: «Игра окончена» со счётом
     партии первой строкой, общая десятка со своей записью на своём месте,
     подсказка. Данные — `window.RECORDS` из `data/records.js`; без файла
     или с пустым — только своя запись, либо честное «пока никого». */
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
    pane.appendChild(el('span', { class: 'console__scores-over', text: t(TEXT.over) }));
    pane.appendChild(document.createTextNode(' · ' + t(TEXT.score) + ' ' + game.score + '\n\n'));
    pane.appendChild(el('span', { class: 'console__scores-title', text: TEXT.scores + '\n' }));
    var table = mergeScores(readTop(), readRecord());
    if (!table.rows.length) pane.appendChild(document.createTextNode(t(TEXT.nobody) + '\n'));
    table.rows.forEach(function (row, i) { pane.appendChild(scoreLine(i + 1, row)); });
    if (table.extra) {
      pane.appendChild(document.createTextNode('\n'));
      pane.appendChild(scoreLine(null, table.extra));
    }
    pane.appendChild(el('span', { class: 'console__scores-foot', text: t(TEXT.again) + ' · ' + t(TEXT.hint) + '\n' }));
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
    clock = now;
    if (!game.over && !game.paused) {
      tick(game, dt);
      updateStats();
    }
    render();
    if (game.over) {
      if (game.score > readBest()) {
        announceRecord({ nick: nick, best: game.score });
        ui.stats.best.textContent = bestLabel();
      }
      shareRecord();
      showScores();   // сразу, без плашки над стаканом — решение владельца
      return;         // без кадров: дальше таблица, R или Esc
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
    if (phase === 'scores') {
      if (event.key === 'Enter' || event.key === ' ' || KEYS[event.key] === 'restart') {
        event.preventDefault();
        startGame();
      }
      return;
    }
    if (phase === 'boot') {
      // Пока ждём начала игры с напечатанным ником — клавиши ничего не значат;
      // раньше того любая доматывает загрузку.
      event.preventDefault();
      if (!waiting) act('skip');
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
    waiting = false;
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
