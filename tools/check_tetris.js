#!/usr/bin/env node
/* Ядро тетриса из assets/js/console.js — проверки правил без браузера.

       node tools/check_tetris.js

   Ядро — чистые функции над состоянием, случайность подставляется снаружи,
   поэтому каждая проверка детерминирована: свой генератор с зерном или
   заранее заданный порядок фигур. */
'use strict';

const path = require('path');
const { Tetris } = require(path.join(__dirname, '..', 'assets', 'js', 'console.js'));

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
  const game = Tetris.create(function () { return 0; });
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

const failed = results.filter(function (r) { return !r.ok; }).length;
console.log('\nИтог: ' + results.length + ' проверок, ' + (failed ? failed + ' упало' : 'все зелёные'));
process.exit(failed ? 1 : 0);
