'use strict';

/* Картинка превью ссылки (og:image) — первый экран настоящей страницы, 1200×630
   (5.87, вариант А из четырёх: владелец выбрал первый экран с портретом из
   знаков). Меню, кнопки, анкета, сцена и дата обновления убраны: в картинке
   дата устарела бы. Внизу — адрес страницы.

       PLAYWRIGHT=<путь к пакету playwright> CHROME=<путь к chrome.exe> node tools/make_og.js

   Пишет assets/img/og-ru.jpg и og-en.jpg (JPEG, качество 90, ~110 КБ). Запускается
   локально, как tools/prep_portrait.py: нужен браузер. Без переменных берёт
   пакет `playwright` и его собственный браузер. Переснимать при правке роли,
   имени или подзаголовка — текст в картинке запечён. */

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');

const ROOT = path.resolve(__dirname, '..');
const URL_TEXT = 'akonyaev-ru.github.io/resume';
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg',
};

const CSS = [
  '.topbar, .hero__actions, .facts, .eyebrow, canvas.pet, canvas.thing, .skip { display: none !important; }',
  'html, body { overflow: hidden !important; }',
  'main > :not(.hero) { display: none !important; }',
  '.hero { min-height: 630px !important; padding-block: 0 !important; display: flex !important; align-items: center; }',
  '.hero__grid { width: 100%; box-sizing: border-box; padding-inline: 56px !important; max-width: none !important; }',
  '.hero__lede { max-width: 30em; }',
  '.og-url { position: fixed; left: 56px; bottom: 40px; z-index: 50; font: 500 20px/1 "JetBrains Mono", monospace;',
  '  color: var(--muted); letter-spacing: .02em; }',
  '.og-url b { color: var(--accent); font-weight: 500; }',
].join('\n');

function serve() {
  return new Promise(function (ok) {
    const srv = http.createServer(function (req, res) {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p.endsWith('/')) p += 'index.html';
      const full = path.join(ROOT, p);
      if (!full.startsWith(ROOT) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(full)] || 'application/octet-stream' });
      fs.createReadStream(full).pipe(res);
    });
    srv.listen(0, '127.0.0.1', function () { ok(srv); });
  });
}

(async function () {
  const srv = await serve();
  const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, headless: true });
  try {
    for (const lang of ['ru', 'en']) {
      const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
      await ctx.route(/docs\.google\.com/, function (r) { r.abort(); });   // живой приёмник рекордов не трогать
      const page = await ctx.newPage();
      await page.goto(base + 'index.html?lang=' + lang, { waitUntil: 'load' });
      await page.evaluate(function () { return document.fonts.ready; });
      await page.waitForTimeout(1200);   // портрет из знаков собирается после загрузки шрифта
      await page.addStyleTag({ content: CSS });
      await page.evaluate(function (url) {
        const tag = document.createElement('div');
        tag.className = 'og-url';
        tag.innerHTML = url.replace('/resume', '<b>/resume</b>');
        document.body.appendChild(tag);
      }, URL_TEXT);
      await page.waitForTimeout(300);
      const out = path.join(ROOT, 'assets', 'img', 'og-' + lang + '.jpg');
      await page.screenshot({ path: out, type: 'jpeg', quality: 90 });
      console.log(path.relative(ROOT, out) + ' — ' + Math.round(fs.statSync(out).size / 1024) + ' КБ');
      await ctx.close();
    }
  } finally {
    await browser.close();
    srv.close();
  }
})();
