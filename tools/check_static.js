'use strict';

/* Проверка текстовой версии для тех, кто без JavaScript (`tools/build_static.js`).

   Собирает блок из настоящего `data/resume.js` в копии `index.html` на обоих
   языках и смотрит: всё ли резюме на месте, язык свой, один #main, текст
   экранирован, повторный прогон ничего не меняет, а без точки встраивания
   сборщик отказывает. Файлы проекта не трогаются.

       node tools/check_static.js

   Код 0 — зелёная, 1 — хоть одна проверка упала. */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const S = require('./build_static.js');

const ROOT = path.resolve(__dirname, '..');
const R = S.loadData();
const SOURCE = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const results = [];
function check(name, fn) {
  try {
    const note = fn();
    results.push(true);
    console.log('  ✓ ' + name + (note ? ': ' + note : ''));
  } catch (err) {
    results.push(false);
    console.log('  ✗ ' + name + ': ' + err.message);
  }
}
function fail(message) { throw new Error(message); }

function pick(value, lang) {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value[lang] != null ? value[lang] : value.ru) : value;
}

// Текст блока без разметки и с разобранными сущностями — как его прочтёт робот.
function textOf(html) {
  // полужирное внутри строки (результат пункта, 5.95) — тот же сплошной текст, без пробелов вокруг
  return html.replace(/<\/?b>/g, '').replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

function everything(lang) {
  return [pick(R.person.name, lang), pick(R.person.role, lang).replace(/\s*\n\s*/g, ' '), pick(R.person.lede, lang), pick(R.person.about, lang)]
    .concat(R.metrics.map(function (m) { return pick(m.caption, lang); }))
    .concat(R.experience.map(function (j) { return pick(j.company, lang); }))
    .concat(R.experience.map(function (j) { return pick(j.role, lang); }))
    .concat([].concat.apply([], R.experience.map(function (j) { return j.bullets.map(function (b) { return pick(b.text, lang); }); })))
    .concat(R.projects.map(function (p) { return pick(p.name, lang); }))
    .concat(R.projects.map(function (p) { return pick(p.description, lang); }))
    .concat(R.skillGroups.map(function (g) { return pick(g.title, lang); }))
    .concat([].concat.apply([], R.skillGroups.map(function (g) { return g.skills.map(function (s) { return pick(s.name, lang); }); })))
    .concat(R.education.map(function (e) { return pick(e.degree, lang); }))
    .concat(R.courses.map(function (e) { return pick(e.name, lang); }))
    .concat(R.languages.map(function (l) { return pick(l.name, lang); }))
    .concat([R.person.contacts.email.label]);
}

['ru', 'en'].forEach(function (lang) {
  check('резюме целиком на своём языке: ' + lang, function () {
    const page = lang === 'ru' ? SOURCE : SOURCE.replace('<html lang="ru">', '<html lang="en">');
    const html = S.inject(page, S.build(R, S.langOf(page)));
    // Только сам блок: в копии страницы остаются русские JSON-LD и мета.
    const text = textOf(html.slice(html.indexOf(S.START), html.indexOf(S.END)));
    const need = everything(lang);
    const missing = need.filter(function (s) { return text.indexOf(s) < 0; });
    if (missing.length) fail('нет ' + missing.length + ' из ' + need.length + ': ' + missing.slice(0, 3).join(' | '));
    if (/\[object Object\]|undefined/.test(text)) fail('в тексте «[object Object]» или «undefined»');
    const other = lang === 'ru' ? pick(R.experience[0].company, 'en') : pick(R.experience[0].company, 'ru');
    if (text.indexOf(other) >= 0) fail('в тексте чужой язык: «' + other + '»');
    return need.length + ' строк на месте';
  });
});

check('результат пункта опыта (`bold`) — дословно из его текста на обоих языках, в текстовой версии полужирный', function () {
  const marked = [].concat.apply([], R.experience.map(function (j) { return j.bullets.filter(function (b) { return b.bold; }); }));
  if (marked.length < 8) fail('помеченных пунктов ' + marked.length + ', а должно быть не меньше восьми (5.96: Айковер 5, ГалВент 2, Дом-Профи 1)');
  ['ru', 'en'].forEach(function (lang) {
    marked.forEach(function (b) {
      const text = pick(b.text, lang), bold = pick(b.bold, lang);
      if (!bold || text.indexOf(bold) < 0) fail(lang + ': фразы «' + bold + '» нет в тексте пункта');
    });
    const page = lang === 'ru' ? SOURCE : SOURCE.replace('<html lang="ru">', '<html lang="en">');
    const html = S.inject(page, S.build(R, S.langOf(page)));
    const head = '<h2>' + pick(R.ui.experienceTitle, lang) + '</h2>', from = html.indexOf(head);
    if (from < 0) fail(lang + ': нет раздела опыта в текстовой версии');
    const exp = html.slice(from, html.indexOf('</section>', from));
    const n = (exp.match(/<b>/g) || []).length;
    if (n !== marked.length) fail(lang + ': полужирных пунктов в текстовой версии ' + n + ' из ' + marked.length);
  });
});

check('блок внутри #app, #main один', function () {
  const html = S.inject(SOURCE, S.build(R, 'ru'));
  const at = html.indexOf('<div id="app">' + S.START);
  if (at < 0) fail('метки не внутри <div id="app">');
  if (html.indexOf(S.END + '</div>') < 0) fail('конец блока не закрывает #app');
  const ids = (html.match(/id="main"/g) || []).length;
  if (ids !== 1) fail('id="main" встречается ' + ids + ' раз');
  return 'между метками, #main один';
});

check('повторный прогон ничего не меняет', function () {
  const once = S.inject(SOURCE, S.build(R, 'ru'));
  const twice = S.inject(once, S.build(R, 'ru'));
  if (once !== twice) fail('второй прогон изменил страницу (' + once.length + ' → ' + twice.length + ' знаков)');
  return 'второй прогон — байт в байт';
});

check('текст экранирован', function () {
  const data = JSON.parse(JSON.stringify(R));
  data.person.name = { ru: 'Имя <script>alert(1)</script> & «кавычки"', en: 'x' };
  const html = S.build(data, 'ru');
  if (html.indexOf('<script>') >= 0) fail('тег из данных попал в разметку как есть');
  if (html.indexOf('&lt;script&gt;alert(1)&lt;/script&gt; &amp; «кавычки&quot;') < 0) fail('знаки не превратились в сущности');
  return '<, >, & и кавычки — сущностями';
});

check('без точки встраивания — отказ, а не молчаливая порча', function () {
  let refused = false;
  try { S.inject(SOURCE.replace(S.MOUNT, '<div id="app" class="x"></div>'), 'блок'); } catch (err) { refused = true; }
  if (!refused) fail('разметка без <div id="app"></div> — а сборщик промолчал');
  return 'отказ с понятной причиной';
});

check('запуск из командной строки пишет файлы на месте', function () {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'static-'));
  try {
    fs.mkdirSync(path.join(dir, 'tools'));
    fs.mkdirSync(path.join(dir, 'data'));
    fs.copyFileSync(path.join(ROOT, 'tools', 'build_static.js'), path.join(dir, 'tools', 'build_static.js'));
    fs.copyFileSync(path.join(ROOT, 'data', 'resume.js'), path.join(dir, 'data', 'resume.js'));
    fs.writeFileSync(path.join(dir, 'index.html'), SOURCE);
    fs.writeFileSync(path.join(dir, 'en.html'), SOURCE.replace('<html lang="ru">', '<html lang="en">'));
    execFileSync(process.execPath, [path.join(dir, 'tools', 'build_static.js'), 'index.html', 'en.html'], { cwd: dir, stdio: 'pipe' });
    const ru = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
    const en = fs.readFileSync(path.join(dir, 'en.html'), 'utf8');
    if (ru.indexOf(pick(R.experience[0].company, 'ru')) < 0) fail('index.html без русского блока');
    if (en.indexOf(pick(R.experience[0].company, 'en')) < 0) fail('en.html без английского блока');
    return 'index.html — русский, en.html — английский';
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

const bad = results.filter(function (ok) { return !ok; }).length;
console.log('');
console.log('Итог: ' + results.length + ' проверок, ' + (bad ? bad + ' упало' : 'все зелёные'));
process.exit(bad ? 1 : 0);
