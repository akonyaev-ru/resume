#!/usr/bin/env node
/* Ядро тетриса из assets/js/console.js — проверки правил без браузера.

       node tools/check_tetris.js

   Ядро — чистые функции над состоянием, случайность подставляется снаружи,
   поэтому каждая проверка детерминирована: свой генератор с зерном или
   заранее заданный порядок фигур. */
'use strict';

const path = require('path');
const { Tetris, mergeScores, makeNick, validNick, worthSending, NICK_WORDS } = require(path.join(__dirname, '..', 'assets', 'js', 'console.js'));

const results = [];
function check(name, fn) {
  try {
    const note = fn();
    results.push({ name, ok: true });
    console.log('  ✓ ' + name + (note ? ': ' + note : ''));
  } catch (e) {
    results.push({ name, ok: false });
    console.log('  ✗ ' + name + ': ' + (e && e.message ? e.message : e));
  }
}
function fail(msg) { throw new Error(msg); }

// Детерминированный генератор — как в check_pet.
function rng(seed) {
  let s = seed >>> 0 || 1;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Подставной порядок фигур: генератор, который выдаёт «мешок» в нужном порядке.
function scripted(kinds) {
  const game = Tetris.create(function () { return 0; }, { specialChance: 0 });
  // Заменяем мешок и текущую фигуру заданным порядком: первая — текущая.
  game.bag = kinds.slice(1).reverse().map(function (k) { return k; });
  game.piece = { kind: kinds[0], shape: Tetris.SHAPES[kinds[0]].map(function (r) { return r.slice(); }), x: 3, y: 0 };
  game.next = { kind: game.bag.pop(), shape: null, x: 0, y: 0 };
  game.next.shape = Tetris.SHAPES[game.next.kind].map(function (r) { return r.slice(); });
  return game;
}

function fillRow(game, y, gapX) {
  for (let x = 0; x < Tetris.COLS; x += 1) game.board[y][x] = x === gapX ? 0 : 'J';
}

check('новая игра: пустое поле, фигура сверху по центру, очки нули', function () {
  const g = Tetris.create(rng(3));
  const cells = g.board.reduce(function (n, row) { return n + row.filter(Boolean).length; }, 0);
  if (cells !== 0) fail('поле не пустое: ' + cells);
  if (!g.piece || g.piece.y !== 0) fail('фигуры нет или она не сверху');
  const w = g.piece.shape[0].length;
  if (g.piece.x !== Math.floor((Tetris.COLS - w) / 2)) fail('фигура не по центру: x ' + g.piece.x);
  if (g.score !== 0 || g.lines !== 0 || g.level !== 1 || g.over) fail('счёт не нулевой');
  return g.piece.kind + ', далее ' + g.next.kind;
});

check('мешок из семи: каждая фигура ровно раз, потом новый мешок', function () {
  const g = Tetris.create(rng(11));
  const seen = [g.piece.kind, g.next.kind];
  while (seen.length < 14) {
    Tetris.hardDrop(g);
    Tetris.tick(g, 2000);   // спецклетка, если выпала, доигрывает эффект — и выходит следующая
    if (g.over) fail('игра кончилась раньше, чем вышли два мешка');
    // Поле очищаем: здесь смотрят порядок фигур, а не укладку.
    g.board.forEach(function (row) { row.fill(0); });
    seen.push(g.next.kind);
  }
  const first = seen.slice(0, 7).sort().join('');
  const second = seen.slice(7, 14).sort().join('');
  if (first !== 'IJLOSTZ' || second !== 'IJLOSTZ') fail('мешки: ' + seen.join(''));
  return seen.join('');
});

check('движение упирается в стенки и не выходит за поле', function () {
  const g = scripted(['O', 'T', 'I']);
  let steps = 0;
  while (Tetris.move(g, -1)) steps += 1;
  if (g.piece.x !== 0) fail('влево ушла не до стенки: x ' + g.piece.x);
  while (Tetris.move(g, 1)) steps += 1;
  if (g.piece.x + g.piece.shape[0].length !== Tetris.COLS) fail('вправо ушла не до стенки: x ' + g.piece.x);
  return 'шагов ' + steps + ', x от 0 до ' + g.piece.x;
});

check('поворот у стенки сдвигает фигуру, а не отменяется', function () {
  const g = scripted(['I', 'O', 'T']);
  while (Tetris.move(g, 1)) { /* к правой стенке */ }
  // Палка лежит горизонтально у правого края; вертикальная — влезает только со сдвигом.
  if (!Tetris.rotate(g)) fail('поворот у стенки не удался');
  if (g.piece.shape.length !== 4 || g.piece.shape[0].length !== 1) fail('фигура не встала вертикально');
  if (g.piece.x < 0 || g.piece.x >= Tetris.COLS) fail('после поворота вышла за поле: x ' + g.piece.x);
  return 'стоит вертикально на x ' + g.piece.x;
});

check('поворот через занятые клетки не проходит', function () {
  const g = scripted(['T', 'O', 'I']);
  // Обложить фигуру: заполнить строки под ней и вокруг так, чтобы повороту негде было развернуться.
  for (let y = 0; y < 3; y += 1) for (let x = 0; x < Tetris.COLS; x += 1) g.board[y][x] = 'J';
  for (let x = 0; x < 3; x += 1) { g.board[0][3 + x] = 0; g.board[1][3 + x] = 0; }
  g.board[0][3] = 'J'; g.board[0][5] = 'J';     // остаётся ровно форма T: сверху одна клетка, снизу три
  g.piece.x = 3; g.piece.y = 0;
  const before = JSON.stringify(g.piece.shape);
  const turned = Tetris.rotate(g);
  if (turned) fail('поворот прошёл сквозь занятые клетки');
  if (JSON.stringify(g.piece.shape) !== before) fail('форма изменилась при неудачном повороте');
  return 'отказ, форма прежняя';
});

check('линия очищается, счёт растёт по уровню', function () {
  const g = scripted(['I', 'O', 'T', 'S']);
  fillRow(g, Tetris.ROWS - 1, 9);          // нижняя строка без одной клетки справа
  fillRow(g, Tetris.ROWS - 2, 9);          // и вторая тоже
  g.board[Tetris.ROWS - 3][9] = 0;
  // Палка вертикально в правый столбец закроет обе дыры.
  Tetris.rotate(g);
  while (Tetris.move(g, 1)) { /* к правой стенке */ }
  if (g.piece.x !== Tetris.COLS - 1) fail('палка не у правой стенки: x ' + g.piece.x);
  const fell = Tetris.hardDrop(g);
  if (g.lines !== 2) fail('очищено линий ' + g.lines + ', а не 2');
  const expected = Tetris.LINE_SCORE[2] * 1 + fell * 2;
  if (g.score !== expected) fail('счёт ' + g.score + ', ожидалось ' + expected);
  // От палки остались две клетки в правом столбце, одна над другой, на дне.
  const left = [];
  g.board.forEach(function (row, y) { row.forEach(function (c, x) { if (c) left.push(y + ',' + x); }); });
  if (left.join(' ') !== (Tetris.ROWS - 2) + ',9 ' + (Tetris.ROWS - 1) + ',9') fail('после очистки на поле ' + left.join(' '));
  return '2 линии, счёт ' + g.score + ' (падение ' + fell + '), остаток палки на дне';
});

check('уровень растёт каждые десять линий, скорость — с ним', function () {
  const g = Tetris.create(rng(5));
  g.lines = 9;
  fillRow(g, Tetris.ROWS - 1, 0);
  // Любая фигура, закрывающая клетку 0 внизу: подложим палку вертикально слева.
  g.piece = { kind: 'I', shape: [[1], [1], [1], [1]], x: 0, y: 0 };
  Tetris.hardDrop(g);
  if (g.lines !== 10) fail('линий ' + g.lines);
  if (g.level !== 2) fail('уровень ' + g.level + ', а не 2');
  if (!(Tetris.speed(2) < Tetris.speed(1))) fail('второй уровень не быстрее первого');
  if (Tetris.speed(99) < 90) fail('скорость ушла ниже предела');
  return 'уровень 2, интервал ' + Tetris.speed(1) + ' → ' + Tetris.speed(2) + ' мс, предел ' + Tetris.speed(99);
});

check('время двигает фигуру вниз с интервалом уровня', function () {
  const g = Tetris.create(rng(7));
  const y0 = g.piece.y;
  Tetris.tick(g, Tetris.speed(1) - 1);
  if (g.piece.y !== y0) fail('сдвинулась раньше интервала');
  Tetris.tick(g, 2);
  if (g.piece.y !== y0 + 1) fail('не сдвинулась по истечении интервала: y ' + g.piece.y);
  Tetris.tick(g, Tetris.speed(1) * 3);
  if (g.piece.y !== y0 + 4) fail('долгий кадр дал не три шага: y ' + g.piece.y);
  return 'шаг ровно по интервалу, долгий кадр — несколько шагов';
});

check('жёсткий сброс кладёт фигуру на дно и даёт очки за высоту', function () {
  const g = scripted(['O', 'T', 'I']);
  const fell = Tetris.hardDrop(g);
  if (fell !== Tetris.ROWS - 2) fail('упала на ' + fell + ', а не ' + (Tetris.ROWS - 2));
  if (g.score !== fell * 2) fail('очки за падение ' + g.score);
  const bottom = g.board[Tetris.ROWS - 1].filter(Boolean).length;
  if (bottom !== 2) fail('квадрат не на дне');
  if (g.piece.kind !== 'T') fail('следующая фигура не вышла: ' + g.piece.kind);
  return 'упала на ' + fell + ', очки ' + g.score + ', вышла ' + g.piece.kind;
});

check('тень показывает место падения', function () {
  const g = scripted(['T', 'O', 'I']);
  fillRow(g, Tetris.ROWS - 1, 9);
  const gy = Tetris.ghostY(g);
  if (gy !== Tetris.ROWS - 3) fail('тень на ' + gy + ', ожидалось ' + (Tetris.ROWS - 3));
  Tetris.hardDrop(g);
  return 'тень на ' + gy + ', сброс подтвердил';
});

check('поле заполнилось — игра окончена, ходы не принимаются', function () {
  const g = Tetris.create(rng(9));
  for (let y = 1; y < Tetris.ROWS; y += 1) fillRow(g, y, y % 2 ? 0 : 9);
  g.piece = { kind: 'O', shape: [[1, 1], [1, 1]], x: 4, y: 0 };
  Tetris.hardDrop(g);
  if (!g.over) fail('игра не кончилась при полном поле');
  const x = g.piece.x;
  if (Tetris.move(g, 1) || g.piece.x !== x) fail('после конца игры фигура двигается');
  if (Tetris.rotate(g)) fail('после конца игры фигура поворачивается');
  return 'конец игры, ходы отклонены';
});

check('пауза останавливает время и ходы', function () {
  const g = Tetris.create(rng(2));
  g.paused = true;
  const y0 = g.piece.y;
  Tetris.tick(g, 5000);
  if (g.piece.y !== y0) fail('на паузе фигура упала');
  if (Tetris.move(g, 1)) fail('на паузе фигура сдвинулась');
  g.paused = false;
  Tetris.tick(g, Tetris.speed(1));
  if (g.piece.y !== y0 + 1) fail('после паузы время не пошло');
  return 'стоит на паузе, идёт после';
});

/* --- таблица рекордов: общая десятка и свой рекорд сводятся на экране ------ */

function top(n, from) {
  const rows = [];
  for (let i = 0; i < n; i += 1) rows.push({ nick: 'nick-' + String(i + 1).padStart(2, '0'), best: (from || 10000) - i * 1000 });
  return rows;
}

check('своя запись встаёт по счёту, десятка не растёт', function () {
  const table = mergeScores(top(10), { nick: 'mango-07', best: 6500 });
  if (table.rows.length !== 10) fail('строк ' + table.rows.length + ', а не 10');
  if (table.rows[4].nick !== 'mango-07' || !table.rows[4].mine) fail('своя не на пятом месте: ' + JSON.stringify(table.rows[4]));
  if (table.rows[9].nick !== 'nick-09') fail('десятый должен быть nick-09, а не ' + table.rows[9].nick);
  if (table.extra) fail('своя в десятке, отдельной строки быть не должно');
  if (table.rows.filter(function (r) { return r.mine; }).length !== 1) fail('своих строк не одна');
  return 'пятое место, nick-10 выпал';
});

check('свой ник уже в таблице — строка одна, счёт больший', function () {
  const table = mergeScores(top(10), { nick: 'NICK-03', best: 8500 });
  const mine = table.rows.filter(function (r) { return r.nick === 'nick-03'; });
  if (mine.length !== 1) fail('строк с ником nick-03: ' + mine.length);
  if (mine[0].best !== 8500 || !mine[0].mine) fail('свой счёт не подставился: ' + JSON.stringify(mine[0]));
  if (table.rows[2].nick !== 'nick-03') fail('после нового счёта место не третье');
  const stale = mergeScores(top(10), { nick: 'nick-03', best: 100 });
  const kept = stale.rows.filter(function (r) { return r.nick === 'nick-03'; })[0];
  if (!kept || kept.best !== 8000 || !kept.mine) fail('в таблице счёт выше своего — должен остаться он: ' + JSON.stringify(kept));
  if (stale.extra) fail('при своём нике в десятке отдельной строки не бывает');
  return 'ник сведён, регистр не мешает, больший счёт побеждает';
});

check('своя запись вне десятки — отдельной строкой без места', function () {
  const table = mergeScores(top(10), { nick: 'guest', best: 640 });
  if (table.rows.length !== 10 || table.rows.some(function (r) { return r.mine; })) fail('своя попала в десятку');
  if (!table.extra || table.extra.nick !== 'guest' || table.extra.best !== 640 || !table.extra.mine) fail('отдельной строки нет: ' + JSON.stringify(table.extra));
  return 'десятка целая, своя ниже';
});

check('равный счёт не обгоняет прежнего рекордсмена', function () {
  const table = mergeScores(top(10), { nick: 'late', best: 7000 });
  if (table.rows[3].nick !== 'nick-04' || table.rows[4].nick !== 'late') fail('при равном счёте новичок встал выше: ' + table.rows.map(function (r) { return r.nick; }).join(','));
  return 'ничья — место за первым';
});

check('пустая таблица и мусор в данных', function () {
  const empty = mergeScores([], null);
  if (empty.rows.length || empty.extra) fail('из ничего что-то вышло');
  const alone = mergeScores(undefined, { nick: 'solo', best: 300 });
  if (alone.rows.length !== 1 || alone.rows[0].nick !== 'solo' || !alone.rows[0].mine) fail('свой рекорд без общей таблицы не показан');
  const dirty = mergeScores([{ nick: '', best: 5 }, { nick: 'ok', best: 'x' }, { nick: 'fine', best: 42 }, null, { best: 7 }], null);
  if (dirty.rows.length !== 1 || dirty.rows[0].nick !== 'fine') fail('мусор прошёл: ' + JSON.stringify(dirty.rows));
  const unsorted = mergeScores([{ nick: 'b', best: 10 }, { nick: 'a', best: 20 }], null);
  if (unsorted.rows[0].nick !== 'a') fail('таблица не отсортирована по счёту');
  return 'пусто — пусто, мусор отброшен, порядок по счёту';
});

/* --- ник от консоли: слово из списка и две цифры ------------------------- */

check('ник — слово из списка и две цифры, не длиннее восьми', function () {
  const seen = new Set();
  for (let seed = 1; seed <= 300; seed += 1) {
    const nick = makeNick(rng(seed));
    const m = /^([a-z]{3,5})-(\d{2})$/.exec(nick);
    if (!m) fail('не того вида: ' + nick);
    if (NICK_WORDS.indexOf(m[1]) < 0) fail('слова нет в списке: ' + nick);
    if (nick.length > 8) fail('длиннее восьми: ' + nick);
    seen.add(nick);
  }
  if (seen.size < 250) fail('из 300 зёрен вышло всего ' + seen.size + ' разных ников');
  const same = makeNick(rng(7)) === makeNick(rng(7));
  if (!same) fail('одно зерно — разные ники');
  return seen.size + ' разных из 300, зерно повторяемо';
});

check('цифры дополняются нулём, обе границы достижимы', function () {
  const low = makeNick(function () { return 0; });
  const high = makeNick(function () { return 0.999999; });
  if (!/-00$/.test(low)) fail('ноль без дополнения: ' + low);
  if (!/-99$/.test(high)) fail('верхняя граница не 99: ' + high);
  if (low.split('-')[0] !== NICK_WORDS[0]) fail('нижняя граница — не первое слово: ' + low);
  if (high.split('-')[0] !== NICK_WORDS[NICK_WORDS.length - 1]) fail('верхняя граница — не последнее слово: ' + high);
  return low + ' … ' + high;
});

check('проверка ника: свой вид принимается, чужой отбрасывается', function () {
  const word = NICK_WORDS[3];
  if (validNick(word + '-42') !== word + '-42') fail('свой ник не принят');
  if (validNick(word.toUpperCase() + '-42') !== word + '-42') fail('регистр должен приводиться');
  [
    'alexivan', 'guest', word + '-4', word + '-420', word + '42', 'xyzzy-42', 'zz-42',
    'ab-cd', '', null, undefined, 42, word + '-42 ', ' ' + word + '-42',
  ].forEach(function (bad) {
    if (validNick(bad) !== '') fail('принято лишнее: ' + JSON.stringify(bad) + ' → ' + validNick(bad));
  });
  return 'принят ' + word + '-42, отброшено 14 чужих';
});

check('список слов: короткие, латиница, без повторов и без грязных созвучий', function () {
  if (NICK_WORDS.length < 150) fail('слов всего ' + NICK_WORDS.length);
  const seen = new Set();
  const dirty = [
    'ass', 'sex', 'cock', 'dick', 'tit', 'fuck', 'shit', 'cum', 'fag', 'nig', 'rape', 'hell',
    'damn', 'crap', 'poo', 'pee', 'anal', 'cunt', 'slut', 'nazi', 'porn', 'hui', 'huy', 'xui',
    'xuy', 'pizd', 'eba', 'ebl', 'bly', 'suka', 'mud', 'pid', 'zhop', 'jop', 'her', 'sra', 'ssa',
    'loh', 'lox', 'gov', 'moch', 'kal', 'pop', 'sos', 'gad', 'chmo', 'gnid', 'urod', 'debil',
    'dura', 'blin', 'pis', 'xer', 'gey', 'gay', 'homo', 'jew', 'negr', 'kill', 'die', 'drug',
  ];
  NICK_WORDS.forEach(function (word) {
    if (!/^[a-z]{3,5}$/.test(word)) fail('не по правилу: ' + JSON.stringify(word));
    if (seen.has(word)) fail('повтор: ' + word);
    seen.add(word);
    dirty.forEach(function (bad) { if (word.indexOf(bad) >= 0) fail('созвучие «' + bad + '» в слове ' + word); });
  });
  return NICK_WORDS.length + ' слов чистые';
});

/* --- отправка рекорда в общую таблицу: только когда есть шанс попасть в десятку */

check('порог отправки: десятка неполная — шлём любой рекорд', function () {
  if (!worthSending(top(3), { nick: 'lynx-07', best: 1 })) fail('при трёх строках рекорд 1 не отправлен');
  if (!worthSending([], { nick: 'lynx-07', best: 5 })) fail('при пустой таблице рекорд не отправлен');
  if (worthSending([], { nick: 'lynx-07', best: 0 })) fail('нулевой счёт отправлен');
  if (worthSending([], null)) fail('без рекорда что-то отправлено');
  return 'неполная десятка принимает всё, ноль и пустота — нет';
});

check('порог отправки: десятка полная — только выше нижней строки', function () {
  const full = top(10);   // 10000 … 1000
  if (worthSending(full, { nick: 'lynx-07', best: 900 })) fail('900 ниже 1000, а отправлено');
  if (worthSending(full, { nick: 'lynx-07', best: 1000 })) fail('1000 равно нижней строке, а отправлено');
  if (!worthSending(full, { nick: 'lynx-07', best: 1001 })) fail('1001 выше нижней, а не отправлено');
  return 'ниже и вровень — нет, выше — да';
});

check('порог отправки: свой ник уже в десятке — шлём улучшение, не шлём то же', function () {
  const full = top(10).map(function (r, i) { return i === 6 ? { nick: 'lynx-07', best: 4000 } : r; });
  if (!worthSending(full, { nick: 'LYNX-07', best: 4001 })) fail('улучшение своей строки не отправлено');
  if (worthSending(full, { nick: 'lynx-07', best: 4000 })) fail('тот же счёт отправлен повторно');
  if (worthSending(full, { nick: 'lynx-07', best: 3999 })) fail('счёт ниже своей строки отправлен');
  const mine = top(10).map(function (r, i) { return i === 9 ? { nick: 'lynx-07', best: 1000 } : r; });
  if (!worthSending(mine, { nick: 'lynx-07', best: 1001 })) fail('улучшение своей нижней строки не отправлено');
  return 'улучшение — да, повтор и хуже — нет';
});

check('порог отправки: мусор в таблице не считается строками', function () {
  const dirty = top(9).concat([{ nick: '', best: 5 }, { nick: 'bad', best: 'x' }, null]);
  if (!worthSending(dirty, { nick: 'lynx-07', best: 1 })) fail('девять годных строк и мусор — десятка неполная, рекорд должен уйти');
  return 'мусор отброшен, десятка неполная';
});

/* --- спецклетки (5.38) ------------------------------------------------------ */

// Фигура со спецклеткой в заданной клетке формы; следующая — обычная.
function withSpecial(kind, type, sy, sx, x) {
  const g = scripted([kind, 'O', 'I']);
  g.piece.shape[sy][sx] = type;
  g.piece.x = x;
  return g;
}

function cellsOf(g) {
  const out = [];
  g.board.forEach(function (row, y) { row.forEach(function (c, x) { if (c) out.push(y + ',' + x + ':' + c); }); });
  return out;
}

function specialsIn(shape) {
  const found = [];
  shape.forEach(function (row) { row.forEach(function (v) { if (Tetris.isSpecial(v)) found.push(v); }); });
  return found;
}

check('спецклетка: шанс 0 — ни одной за сорок фигур, шанс 1 — ровно одна в каждой', function () {
  const none = Tetris.create(rng(3), { specialChance: 0 });
  for (let i = 0; i < 40; i += 1) {
    if (specialsIn(none.piece.shape).length) fail('при шансе 0 выпала спецклетка');
    Tetris.hardDrop(none);
    Tetris.tick(none, 2000);
    none.board.forEach(function (row) { row.fill(0); });
  }
  const all = Tetris.create(rng(3), { specialChance: 1 });
  const seen = {};
  for (let i = 0; i < 100; i += 1) {
    const found = specialsIn(all.piece.shape);
    if (found.length !== 1) fail('при шансе 1 в фигуре ' + found.length + ' спецклеток');
    seen[found[0]] = (seen[found[0]] || 0) + 1;
    if (specialsIn(all.next.shape).length !== 1) fail('следующая без спецклетки');
    Tetris.hardDrop(all);
    Tetris.tick(all, 2000);
    all.board.forEach(function (row) { row.fill(0); });
  }
  Object.keys(Tetris.SPECIALS).forEach(function (key) { if (!seen[key]) fail('за сто фигур не выпала ' + key); });
  if (!(seen.mine > seen.acid && seen.acid > seen.hole)) fail('веса 6:3:1 не соблюдены: ' + JSON.stringify(seen));
  if (!(seen.mine > seen.hole * 3)) fail('мина должна выпадать много чаще дыры: ' + JSON.stringify(seen));
  return 'сто фигур: ' + JSON.stringify(seen);
});

check('поворот переносит спецклетку вместе с формой', function () {
  const g = withSpecial('T', 'acid', 1, 0, 3);
  for (let turn = 0; turn < 4; turn += 1) {
    if (!Tetris.rotate(g)) fail('поворот не прошёл');
    const found = specialsIn(g.piece.shape);
    if (found.length !== 1 || found[0] !== 'acid') fail('после поворота спецклеток ' + found.length);
  }
  if (g.piece.shape[1][0] !== 'acid') fail('четыре поворота не вернули спецклетку на место');
  return 'четыре поворота, кислота на месте';
});

check('мина: взрыв 3×3, очки за чужие клетки, следующая фигура ждёт конца взрыва', function () {
  const g = withSpecial('T', 'mine', 1, 1, 3);
  fillRow(g, 17, 9); fillRow(g, 18, 9); fillRow(g, 19, 9);
  const fell = Tetris.hardDrop(g);
  if (g.piece !== null) fail('фигура вышла до конца взрыва');
  if (!g.effect || g.effect.type !== 'mine') fail('эффект не начался: ' + JSON.stringify(g.effect));
  if (g.score !== fell * 2) fail('очки начислены до взрыва: ' + g.score);
  Tetris.tick(g, Tetris.MINE_MS - 1);
  if (g.piece !== null) fail('фигура вышла раньше срока');
  Tetris.tick(g, 2);
  if (g.piece === null || g.effect) fail('взрыв не кончился');
  // Сгорели три чужие клетки ряда 17 под фигурой (по 10) и сама фигура (без очков).
  if (g.score !== fell * 2 + 30) fail('очки ' + g.score + ', ожидалось ' + (fell * 2 + 30));
  if (g.lines !== 0) fail('взрыв посчитан линией');
  const rest = cellsOf(g).filter(function (c) { return c.indexOf(':T') > 0 || c.indexOf(':mine') > 0; });
  if (rest.length) fail('от фигуры что-то осталось: ' + rest.join(' '));
  for (let x = 3; x <= 5; x += 1) if (g.board[17][x]) fail('кратер не пуст в ' + x);
  if (g.board[17][2] !== 'J' || g.board[17][6] !== 'J' || g.board[18][4] !== 'J') fail('взрыв задел лишнее');
  return 'кратер 3×3, +30, следующая ' + g.piece.kind + ' через ' + Tetris.MINE_MS + ' мс';
});

check('оседание: что выше кратера, опускается на число сожжённых; старая дыра остаётся', function () {
  const g = withSpecial('I', 'mine', 0, 3, 0);
  Tetris.rotate(g);                                            // палка вертикально, мина внизу
  if (g.piece.shape[3][0] !== 'mine') fail('мина не внизу: ' + JSON.stringify(g.piece.shape));
  g.board[10][0] = 'J';                                        // верхушка башни
  for (let y = 12; y < 20; y += 1) g.board[y][0] = 'J';        // башня с просветом на 11
  const fell = Tetris.hardDrop(g);                             // палка на верхушке: клетки 6..9, мина на 9
  if (g.piece !== null || !g.effect || g.effect.y !== 9) fail('палка не легла на башню: ' + JSON.stringify(g.effect));
  Tetris.tick(g, Tetris.MINE_MS);
  // Сгорели свои (0,8), (0,9) и чужая верхушка (0,10): две верхние клетки палки съехали на три.
  const col = [];
  for (let y = 0; y < 20; y += 1) col.push(g.board[y][0] || '.');
  if (col.join('') !== '.........II.JJJJJJJJ') fail('столбец: ' + col.join(''));
  if (g.score !== fell * 2 + 10) fail('очки ' + g.score + ', ожидалось ' + (fell * 2 + 10));
  return 'две клетки палки спустились на три, просвет над башней остался';
});

check('чёрная дыра: глотает 5×5 вокруг себя, что выше — оседает, очки за чужие клетки, линии не растут', function () {
  const g = withSpecial('T', 'hole', 1, 1, 4);
  fillRow(g, 17, 9); fillRow(g, 18, 9); fillRow(g, 19, 9);
  g.board[16][1] = 'S'; g.board[16][8] = 'S';                 // за краем квадрата — целы
  g.board[14][3] = 'L';                                        // верхний угол квадрата — сгорит
  const fell = Tetris.hardDrop(g);                             // T на ряду 17: низ 16, дыра (5,16)
  if (!g.effect || g.effect.type !== 'hole' || g.effect.y !== 16 || g.effect.cells.length !== 25) fail('эффект не начался: ' + JSON.stringify(g.effect));
  Tetris.tick(g, Tetris.HOLE_MS - 1);
  if (g.piece !== null) fail('фигура вышла раньше срока');
  Tetris.tick(g, 2);
  if (g.piece === null || g.effect) fail('дыра не кончилась');
  // Квадрат 5×5 вокруг (5,16): ряды 14–18, столбцы 3–7. Чужих: ряд 17 — 5, ряд 18 — 5, L на (3,14) — 1 → 11.
  if (g.score !== fell * 2 + 110) fail('очки ' + g.score + ', ожидалось ' + (fell * 2 + 110));
  if (g.lines !== 0) fail('дыра посчитана линией');
  for (let y = 14; y <= 18; y += 1) for (let x = 3; x <= 7; x += 1) if (g.board[y][x]) fail('в квадрате осталось ' + y + ',' + x + ':' + g.board[y][x]);
  if (g.board[16][1] !== 'S' || g.board[16][8] !== 'S' || g.board[17][2] !== 'J' || g.board[18][8] !== 'J') fail('дыра задела лишнее');
  if (g.board[19][5] !== 'J') fail('ряд 19 под квадратом задет');
  return 'квадрат 5×5 пуст, +110, соседи целы, следующая через ' + Tetris.HOLE_MS + ' мс';
});

check('кислота: прожигает четыре клетки под собой по шагу времени, столбец тонет, потом растворяется', function () {
  const g = withSpecial('I', 'acid', 0, 3, 0);
  Tetris.rotate(g);                                            // палка вертикально, кислота внизу
  if (g.piece.shape[3][0] !== 'acid') fail('кислота не внизу: ' + JSON.stringify(g.piece.shape));
  for (let y = 13; y < 20; y += 1) g.board[y][0] = 'J';        // семь клеток стопки под ней
  const fell = Tetris.hardDrop(g);
  if (!g.effect || g.effect.type !== 'acid' || g.board[12][0] !== 'acid') fail('кислота не легла: ' + JSON.stringify(g.effect));
  Tetris.tick(g, Tetris.ACID_STEP);
  if (g.board[13][0] !== 'acid' || g.board[12][0] !== 'I') fail('после шага кислота не съехала: ' + cellsOf(g).join(' '));
  if (g.score !== fell * 2 + 10) fail('за первую клетку очки ' + g.score);
  Tetris.tick(g, Tetris.ACID_STEP * 3);
  if (g.board[16][0] !== 'acid' || g.effect.burnt !== 4) fail('после четырёх шагов: ' + cellsOf(g).join(' '));
  if (g.piece !== null) fail('фигура вышла до растворения');
  Tetris.tick(g, Tetris.ACID_STEP);
  if (g.effect || g.piece === null) fail('кислота не растворилась');
  const col = [];
  for (let y = 0; y < 20; y += 1) col.push(g.board[y][0] || '.');
  if (col.join('') !== '..............IIIJJJ') fail('столбец: ' + col.join(''));
  if (g.score !== fell * 2 + 40) fail('очки ' + g.score + ', ожидалось ' + (fell * 2 + 40));
  return 'четыре клетки по ' + Tetris.ACID_STEP + ' мс, +40, палка села на остаток';
});

check('кислота останавливается, когда под ней пусто', function () {
  const g = withSpecial('I', 'acid', 0, 3, 0);
  Tetris.rotate(g);
  g.board[17][0] = 'J'; g.board[18][0] = 'J';                  // две клетки, под ними воздух
  Tetris.hardDrop(g);
  Tetris.tick(g, Tetris.ACID_STEP * 2);
  if (g.effect.burnt !== 2 || g.board[18][0] !== 'acid') fail('две клетки не сгорели: ' + cellsOf(g).join(' '));
  Tetris.tick(g, Tetris.ACID_STEP);
  if (g.effect || g.board[19][0]) fail('кислота не растворилась над пустотой: ' + cellsOf(g).join(' '));
  if (g.board[18][0] !== 'I') fail('палка не села: ' + cellsOf(g).join(' '));
  return 'две сгорели, воздух — стоп, растворилась';
});

check('спецклетка, ушедшая с линией, ничего не делает; выше линии — съезжает и срабатывает там', function () {
  const g = withSpecial('T', 'mine', 1, 1, 3);
  for (let x = 0; x < 10; x += 1) if (x < 3 || x > 5) g.board[17][x] = 'J';   // ряд 17 ждёт трёх клеток
  fillRow(g, 18, 9); fillRow(g, 19, 9);
  const fell = Tetris.hardDrop(g);
  if (g.effect || g.piece === null) fail('мина в снятой линии сработала');
  if (g.lines !== 1 || g.score !== fell * 2 + Tetris.LINE_SCORE[1]) fail('линия не засчитана: ' + g.score);
  // Теперь мина в верхней клетке T: линия снимается, мина съезжает на ряд ниже и взрывается там.
  const h = withSpecial('T', 'mine', 0, 1, 3);
  for (let x = 0; x < 10; x += 1) if (x < 3 || x > 5) h.board[17][x] = 'J';
  fillRow(h, 18, 9); fillRow(h, 19, 9);
  Tetris.hardDrop(h);
  if (!h.effect || h.effect.y !== 17 || h.board[17][4] !== 'mine') fail('мина не съехала на снятую линию: ' + JSON.stringify(h.effect));
  Tetris.tick(h, Tetris.MINE_MS);
  if (h.board[18][3] || h.board[18][4] || h.board[18][5]) fail('взрыв на новом месте не выбил ряд 18');
  if (h.lines !== 1) fail('линий ' + h.lines);
  return 'в линии — молчит; над линией — съезжает и взрывается';
});

check('во время эффекта ходов нет: сброс, сдвиг и поворот ничего не делают', function () {
  const g = withSpecial('T', 'mine', 1, 1, 3);
  fillRow(g, 19, 9);
  const score = g.score + Tetris.hardDrop(g) * 2;
  if (Tetris.hardDrop(g) !== 0 || Tetris.move(g, 1) || Tetris.rotate(g) || Tetris.softDrop(g)) fail('ход прошёл во время эффекта');
  if (g.score !== score) fail('очки за пустой ход: ' + g.score);
  return 'все четыре хода отклонены';
});

check('пауза держит и эффект', function () {
  const g = withSpecial('T', 'hole', 1, 1, 3);
  fillRow(g, 19, 9);
  Tetris.hardDrop(g);
  g.paused = true;
  Tetris.tick(g, 5000);
  if (!g.effect || g.effect.t !== 0) fail('на паузе эффект шёл');
  g.paused = false;
  Tetris.tick(g, Tetris.HOLE_MS);
  if (g.effect) fail('после паузы эффект не доиграл');
  return 'стоит на паузе, доигрывает после';
});

const failed = results.filter(function (r) { return !r.ok; }).length;
console.log('\nИтог: ' + results.length + ' проверок, ' + (failed ? failed + ' упало' : 'все зелёные'));
process.exit(failed ? 1 : 0);
