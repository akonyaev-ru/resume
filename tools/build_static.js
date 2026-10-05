'use strict';

/* Текстовая версия резюме для тех, кто без JavaScript (5.87).

   Страница собирается скриптом, и робот, который его не исполняет, видел до
   5.87 только имя, роль и контакты из <noscript>. Этот сборщик при выкладке
   кладёт в `<div id="app">` всё резюме текстом — из того же `data/resume.js`,
   на языке страницы (`<html lang>`). Посетитель с JavaScript его не видит:
   класс `js` на <html> ставится в <head> до первой отрисовки, `.js
   .static-cv` спрятан стилями, а render() в app.js очищает #app и строит
   страницу заново.

       node tools/build_static.js index.html en.html

   Повторный прогон заменяет прежний блок, файл не растёт. Код 1 — точки
   встраивания нет (разметка поменялась). В репозитории блока нет: его, как
   и en.html, собирает раннер перед выкладкой. */

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const START = '<!-- static:start -->';
const END = '<!-- static:end -->';
const MOUNT = '<div id="app"></div>';

function loadData(file) {
  const box = { window: {} };
  vm.runInNewContext(fs.readFileSync(file || path.join(ROOT, 'data', 'resume.js'), 'utf8'), box, { filename: 'data/resume.js' });
  return box.window.RESUME;
}

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Текст на языке страницы: пара { ru, en } — своя половина (нет её — русская),
// строка — как есть, общая для языков.
function picker(lang) {
  return function (value) {
    if (value && typeof value === 'object' && !Array.isArray(value)) return value[lang] != null ? value[lang] : value.ru;
    return value;
  };
}

function build(R, lang) {
  const t = picker(lang);
  const u = function (key) { return esc(t(R.ui[key])); };
  const p = R.person;
  const c = p.contacts;
  const links = '<p class="static-cv__links">' + [
    '<a href="' + esc(c.telegram.href) + '">' + esc(t(c.telegram.label)) + '</a>',
    '<a href="' + esc(c.email.href) + '">' + esc(t(c.email.label)) + '</a>',
    '<a href="' + esc(c.github.href) + '">' + esc(t(c.github.label)) + '</a>',
  ].join(' · ') + '</p>';
  const list = function (items) { return '<ul>' + items.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>'; };
  // пункт опыта: результат (`bold`, 5.95) — полужирным, как на странице; фразы в тексте нет — текст как есть
  const bulletHtml = function (b) {
    const text = t(b.text), bold = b.bold ? t(b.bold) : '', at = bold ? text.indexOf(bold) : -1;
    if (at < 0) return esc(text);
    return esc(text.slice(0, at)) + '<b>' + esc(bold) + '</b>' + esc(text.slice(at + bold.length));
  };

  return [
    '<main class="static-cv wrap" id="main">',
    '<h1>' + esc(t(p.name)) + '</h1>',
    '<p class="static-cv__role">' + esc(t(p.role).replace(/\s*\n\s*/g, ' ')) + '</p>',
    '<p>' + esc(t(p.lede)) + '</p>',
    '<p class="static-cv__facts">' + [t(p.city), t(p.schedule) + ', ' + t(p.employment), t(p.relocation)].map(esc).join(' · ') + '</p>',
    links,
    '<section><h2>' + u('resultsTitle') + '</h2>' + list(R.metrics.map(function (m) {
      return '<b>' + esc((m.prefix || '') + m.value + (m.suffix || '')) + '</b> ' + esc(t(m.caption));
    })) + '<p>' + u('resultsNote') + '</p></section>',
    '<section><h2>' + u('approachTitle') + '</h2><p>' + esc(t(p.about)) + '</p><p>' + esc(t(p.pullquote)) + '</p></section>',
    '<section><h2>' + u('experienceTitle') + '</h2>' + R.experience.map(function (job) {
      return '<article><h3>' + esc(t(job.role)) + ' — ' + esc(t(job.company)) + '</h3><p>' + esc(t(job.period)) + '</p>' +
        list(job.bullets.map(bulletHtml)) + '</article>';
    }).join('') + '</section>',
    '<section><h2>' + u('projectsTitle') + '</h2>' + R.projects.map(function (pr) {
      return '<article><h3><a href="' + esc(pr.link) + '">' + esc(t(pr.name)) + '</a></h3><p>' + esc(t(pr.tagline)) + '</p><p>' +
        esc(t(pr.description)) + '</p><p>' + pr.stack.map(esc).join(' · ') + '</p></article>';
    }).join('') + '</section>',
    '<section><h2>' + u('skillsTitle') + '</h2>' + R.skillGroups.map(function (g) {
      return '<h3>' + esc(t(g.title)) + '</h3><p>' + g.skills.map(function (s) { return esc(t(s.name)); }).join(' · ') + '</p>';
    }).join('') + '</section>',
    '<section><h2>' + u('educationTitle') + '</h2>' +
      '<h3>' + u('degreesTitle') + '</h3>' + list(R.education.map(function (e) { return esc(e.year) + ' — ' + esc(t(e.degree)) + ', ' + esc(t(e.place)); })) +
      '<h3>' + u('coursesTitle') + '</h3>' + list(R.courses.map(function (e) { return esc(e.year) + ' — ' + esc(t(e.name)) + ', ' + esc(t(e.place)); })) +
      '<h3>' + u('languagesTitle') + '</h3>' + list(R.languages.map(function (l) { return esc(t(l.name)) + ' — ' + esc(t(l.level)); })) +
      '</section>',
    '<section><h2>' + u('contactTitle') + '</h2><p>' + u('contactText') + '</p>' + links + '</section>',
    '</main>',
  ].join('\n');
}

// Блок — между метками внутри #app; повторный прогон заменяет прежний.
function inject(html, block) {
  const at = html.indexOf(START);
  if (at >= 0) {
    const end = html.indexOf(END, at);
    if (end < 0) throw new Error('метка ' + START + ' есть, а ' + END + ' — нет');
    return html.slice(0, at) + START + '\n' + block + '\n' + END + html.slice(end + END.length);
  }
  if (html.split(MOUNT).length !== 2) throw new Error('в разметке нет ровно одного ' + MOUNT);
  return html.replace(MOUNT, '<div id="app">' + START + '\n' + block + '\n' + END + '</div>');
}

function langOf(html) {
  const m = /<html lang="([a-z]{2})"/.exec(html);
  if (!m) throw new Error('у <html> нет lang');
  return m[1];
}

function main(files) {
  const R = loadData();
  files.forEach(function (name) {
    const file = path.resolve(ROOT, name);
    const html = fs.readFileSync(file, 'utf8');
    const lang = langOf(html);
    fs.writeFileSync(file, inject(html, build(R, lang)), 'utf8');
    console.log(name + ' — текстовая версия (' + lang + ')');
  });
}

module.exports = { build: build, inject: inject, loadData: loadData, langOf: langOf, START: START, END: END, MOUNT: MOUNT };

if (require.main === module) {
  try {
    main(process.argv.slice(2).length ? process.argv.slice(2) : ['index.html']);
  } catch (err) {
    console.error('build_static: ' + err.message);
    process.exit(1);
  }
}
