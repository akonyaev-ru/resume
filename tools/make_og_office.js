'use strict';

/* Картинка превью ссылки на главную (og:image) — пиксельный офис, 1200×630 (17.10.2026: офис на /resume/).
   Снимок собранной страницы офиса: офис целиком в натуральную величину ×1,125 на фоне поля знаков, без строки
   лицензии; агенты — на своих местах (время страницы стоит, «уменьшить движение»).

       python office/pix/build_demo.py --prod office/dist/index.html
       PLAYWRIGHT=<путь к пакету playwright> CHROME=<путь к chrome.exe> node tools/make_og_office.js

   Пишет office/og.jpg (JPEG, качество 90). Запускается локально, как tools/make_og.js: нужен браузер. Переснимать,
   когда офис заметно меняется. */

const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');

const ROOT = path.resolve(__dirname, '..');
const PAGE = path.join(ROOT, 'office', 'dist', 'index.html');
const OUT = path.join(ROOT, 'office', 'og.jpg');

(async function () {
  if (!fs.existsSync(PAGE)) throw new Error('нет ' + path.relative(ROOT, PAGE) + ' — сначала собрать страницу офиса');
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, headless: true });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(url.pathToFileURL(PAGE).href, { waitUntil: 'load' });
    await page.waitForFunction(function () { return !!window.__office && !!window.__office.pixCanvas() && window.__office.pixCanvas().n > 0; });
    await page.evaluate(function () { return document.fonts.ready; });
    await page.waitForTimeout(1500);
    await page.addStyleTag({ content: '.legal { display: none !important; }' });
    await page.waitForTimeout(200);
    await page.screenshot({ path: OUT, type: 'jpeg', quality: 90 });
    console.log(path.relative(ROOT, OUT) + ' — ' + Math.round(fs.statSync(OUT).size / 1024) + ' КБ');
    await ctx.close();
  } finally {
    await browser.close();
  }
})().catch(function (e) { console.error(e); process.exit(1); });
