'use strict';

/* Иконка вкладки — Отто из кадра покоя (5.88; владелец выбрал из трёх: «Отто
   без плашки»). Рисунок не рисуется заново: клетки берутся из `ART.idle[0]`
   в pet.js, цвета — из `SKIN.otto`. Кадр 12×11 стоит во весь квадрат 12×12,
   пустой ряд сверху — Отто на нижнем крае (5.89, «Отто очень маленький» →
   «Давай А»: на треть крупнее, чем в 16×16 с полями). Клетка — 1/12 иконки:
   целое число пикселей только на экранах 150% и 300%, на 100%, 125% и 200%
   клетки разнятся на пиксель, но глаза выходят одинаковыми. Отто без щупалец
   (квадрат 8×8 с крупными глазами) был рекомендован вторым листом — выбрано А.
   Иконка вшита в разметку ссылкой data: — работает и по file://, и в
   однофайловой версии, и на странице 404 с адресом любой глубины.

       node tools/make_favicon.js          — вписать в index.html и 404.html
       node tools/make_favicon.js --check  — сверить (шаг CI): перерисовали
                                             Отто — иконку надо пересобрать

   en.html собирается из index.html и иконку получает оттуда. Код 1 — иконка
   разошлась с рисунком (в режиме --check) или разметка поменялась. */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const PAGES = ['index.html', '404.html'];
const LINK = /<link rel="icon" href="data:image\/svg\+xml,[^"]*" \/>/g;
const VIEW = 12;   // сторона квадрата в клетках — ширина кадра
const DX = 0;
const DY = 1;

function sprite(pet) {
  const at = pet.indexOf('    idle: [[');
  const end = pet.indexOf('], [', at);
  if (at < 0 || end < 0) throw new Error('в pet.js нет кадра покоя `idle: [[`');
  const rows = Array.from(pet.slice(at, end).matchAll(/'([.a-z]+)'/g), function (m) { return m[1]; })
    .filter(function (row) { return /[^.]/.test(row); });   // пустые строки сверху — запас под подскок
  const from = pet.indexOf('    otto: {');
  const to = pet.indexOf('    olivia: {', from);
  if (from < 0 || to < 0) throw new Error('в pet.js нет палитры `otto`');
  const skin = {};
  Array.from(pet.slice(from, to).matchAll(/\b([a-z]): '(#[0-9a-f]{6})'/g)).forEach(function (m) { skin[m[1]] = m[2]; });
  return { rows: rows, skin: skin };
}

// Ряд клеток одного цвета — один прямоугольник: так иконка вдвое короче.
function svg(art) {
  let rects = '';
  art.rows.forEach(function (row, y) {
    let x = 0;
    while (x < row.length) {
      const ch = row.charAt(x);
      let n = 1;
      while (x + n < row.length && row.charAt(x + n) === ch) n += 1;
      if (art.skin[ch]) rects += "<rect x='" + (x + DX) + "' y='" + (y + DY) + "' width='" + n + "' height='1' fill='" + art.skin[ch] + "'/>";
      x += n;
    }
  });
  return "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 " + VIEW + ' ' + VIEW + "' shape-rendering='crispEdges'>" + rects + '</svg>';
}

function link(art) {
  const uri = 'data:image/svg+xml,' + svg(art).replace(/</g, '%3C').replace(/>/g, '%3E').replace(/#/g, '%23');
  return '<link rel="icon" href="' + uri + '" />';
}

function main(checkOnly) {
  const want = link(sprite(fs.readFileSync(path.join(ROOT, 'assets', 'js', 'pet.js'), 'utf8')));
  let stale = 0;
  PAGES.forEach(function (name) {
    const file = path.join(ROOT, name);
    const html = fs.readFileSync(file, 'utf8');
    const found = html.match(LINK) || [];
    if (found.length !== 1) throw new Error(name + ': ссылок на иконку ' + found.length + ', а не одна');
    if (found[0] === want) { console.log(name + ' — иконка совпадает с кадром Отто'); return; }
    if (checkOnly) { stale += 1; console.log(name + ' — иконка разошлась с кадром Отто: node tools/make_favicon.js'); return; }
    fs.writeFileSync(file, html.replace(LINK, function () { return want; }), 'utf8');
    console.log(name + ' — иконка пересобрана (' + want.length + ' знаков)');
  });
  return stale;
}

module.exports = { sprite: sprite, svg: svg, link: link };

if (require.main === module) {
  try {
    process.exit(main(process.argv.indexOf('--check') >= 0) ? 1 : 0);
  } catch (err) {
    console.error('make_favicon: ' + err.message);
    process.exit(1);
  }
}
