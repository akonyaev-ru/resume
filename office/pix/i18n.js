/* Офис на двух языках (18.10, владелец: «Давай только английский сделаем»). Язык страницы: в сборке сайта — OFFICE_LANG
   (английская страница /resume/en/ собирается с 'en' и <html lang="en">), в демо — ?lang=en. Резюме берётся из data/resume.js
   ({ ru, en }), надписи самого офиса — из словаря ниже по русской строке: OT('Обо мне') → 'About me'. Чего в словаре нет,
   остаётся как есть — проверка office_en_check.js ищет кириллицу на английской странице. Должности, описания и имена агентов
   — по id агента; даты — «July 16, 2026». */
(function () {
  var q = null;
  try { q = new URLSearchParams(location.search).get('lang'); } catch (e) { /* без адреса — по разметке */ }
  var LANG = window.OFFICE_LANG || (q === 'en' || q === 'ru' ? q : (document.documentElement.lang || 'ru').slice(0, 2) === 'en' ? 'en' : 'ru');
  if (LANG === 'en') document.documentElement.lang = 'en';   // тетрис сайта (console.js) берёт язык отсюда

  var EN = {
    // разделы и предметы
    // 18.10, демо: контакт на стойке (вариант ct)
    'Контакты': 'Contacts', 'Телефон на стойке': 'Phone on the desk', 'Звонок на стойке': 'Bell on the desk',
    'Визитница на стойке': 'Card holder on the desk',
    'Обо мне': 'About me', 'Стойка ресепшн': 'Reception desk', 'Показатели': 'Impact', 'Большой экран': 'Big screen',
    'Опыт работы': 'Experience', 'Доска в переговорной': 'Meeting-room whiteboard', 'Собственные продукты': 'My own products',
    'Витрина': 'Display case', 'Навыки': 'Skills', 'Серверная': 'Server room', 'Образование': 'Education',
    'Диплом на стене': 'Diploma on the wall', 'Курсы': 'Professional training', 'Книжный шкаф': 'Bookshelf', 'Языки': 'Languages',
    'Глобус': 'Globe', 'Тетрис': 'Tetris', 'Игровой автомат': 'Arcade machine', 'Классическая версия': 'Classic version',
    'Старый компьютер': 'Old computer', 'Войти в офис': 'Enter the office', 'Ковёр у входа': 'Entrance rug',
    // короткие имена разделов на телефоне
    'Опыт': 'Experience', 'Продукты': 'Products', 'Разделы': 'Sections',
    // карточка агента
    'ИИ-агент': 'AI agent', 'Стаж:': 'Joined:', 'Награды:': 'Awards:', 'Награды': 'Awards', 'Агент:': 'Agent:',
    'Секретный агент': 'Secret agent', 'Информацию об этом агенте я предпочёл скрыть.': 'I have chosen to keep this agent’s details private.',
    'Описание — после согласования.': 'Description coming soon.',
    'Испытательный срок': 'Probation passed', 'Полгода': 'Six months', 'Год': 'One year', 'Золотой диск': 'Golden disk',
    'Ценный агент': 'Valuable agent', ' — ещё не получена': ' — not earned yet',
    // страница
    'Коротко обо мне': 'About me in brief', 'Подсказки': 'Hints', 'Закрыть': 'Close', 'Язык': 'Language',
    'Нажимайте на предметы с «!» и на сотрудников.': 'Click the items marked “!” and the staff.',
    'Данные резюме не загрузились (data/resume.js).': 'The resume data did not load (data/resume.js).',
    // окна разделов («Картотека»)
    'Город': 'Based in', 'Занятость': 'Employment', 'Формат': 'Format', 'Переезд': 'Relocation', 'Специализации': 'Specialisations',
    'Коротко': 'In brief', 'Подробнее': 'In detail', 'Условия работы': 'Working terms', 'Места работы': 'Jobs',
    'параллельно': 'in parallel', 'Стек': 'Stack', 'Группы навыков': 'Skill groups', 'навык': 'skill',
    // 2.5D
    'Офис': 'Office', 'Выйти в план': 'Back to plan', 'Выйти из объёмного вида': 'Leave the 3D view',
    // клавиши снизу в 2.5D (18.10, ночь)
    'Открыть то, что рядом': 'Open what is nearby', 'Идти': 'Walk',
    'Стрелки или WASD — идти · колесо — ближе / дальше · нажатие на предмет — открыть': 'Arrows or WASD — walk · wheel — closer / farther · click an item — open',
    'Стрелки или WASD — лететь · тянуть мышью — двигать · колесо — ближе / дальше · нажатие на предмет — открыть': 'Arrows or WASD — fly · drag with the mouse — move · wheel — closer / farther · click an item — open',
    // тетрис в окне
    'Рекорды': 'High scores', 'Далее': 'Next', 'Следующая фигура': 'Next piece', 'Счёт': 'Score', 'Уровень': 'Level', 'Линии': 'Lines',
    'Спецклетки': 'Special blocks', 'Стакан тетриса': 'Tetris well', 'Управление': 'Controls',
    'Влево (←)': 'Left (←)', 'Вниз (↓)': 'Down (↓)', 'Вправо (→)': 'Right (→)', 'Повернуть (↑, X)': 'Rotate (↑, X)',
    'Сбросить (пробел)': 'Drop (Space)', 'Пауза (P)': 'Pause (P)', 'пробел': 'space',
    'влево': 'left', 'вниз': 'down', 'вправо': 'right', 'поворот': 'rotate', 'сброс': 'drop', 'пауза': 'pause', 'сдвиг': 'move',
    'рекордов пока нет': 'no records yet', 'вы — ': 'you — ', ', рекорда пока нет': ', no record yet', 'рекорд ': 'record ',
    ', вне десятки': ', outside the top ten', 'ваша строка выделена': 'your row is highlighted',
    'Играть': 'Play', 'Ещё раз': 'Again', 'ИГРАТЬ': 'PLAY', 'ЕЩЁ РАЗ': 'AGAIN', 'или Enter': 'or Enter', 'или R': 'or R',
    'игрок': 'player', 'Игра окончена': 'Game over', 'счёт': 'score', 'новый рекорд': 'new record',
    'Esc — закрыть': 'Esc — close', 'R — ещё раз · Esc — закрыть': 'R — again · Esc — close',
    'Нет снимка партии (tetris/mock.js).': 'No game snapshot (tetris/mock.js).', ' · макет на снимке партии': ' · mock-up of a real game',
    'Макет на снимке настоящей партии — игра подключится после выбора раскладки.': 'A mock-up of a real game — the game connects once the layout is chosen.',
  };
  // агенты: должность и описание по id; имена — латиницей (первый набор, он на сайте; Отто и Оливия — во всех)
  var AGENTS = {
    disp: ['Dispatcher', 'Takes incoming requests and routes each task to the right specialist agent; does no subject work itself.'],
    dev: ['Developer', 'Takes products from idea and specification to tested code: architecture, tests, infrastructure, deployment.'],
    gas: ['Apps Script developer', 'Automates work with spreadsheets, documents and files in the cloud office: scripts, triggers, deployment.'],
    des: ['Designer', 'Designs visuals and interfaces — landing pages, banners, mock-ups, cards — and builds them into finished code.'],
    seo: ['SEO specialist', 'Analyses websites for search: audits, technical requirements, acceptance of changes, measuring results.'],
    eng: ['Agent engineer', 'Designs and maintains the AI agents: their rules, skills, memory and registry, as well as prompt texts.'],
    ldz: ['Legal designer', 'Lays out finished legal documents in Word so they are easy to read: structure, layout, templates — without changing the text.'],
    vid: ['Video maker', 'Writes scripts and storyboards for videos, prepares editing briefs and prompts for AI video generators.'],
    kyc: ['Counterparty due diligence specialist', 'Checks companies, sole traders and individuals against open sources and issues a dossier with a verdict before a deal.'],
    dog: ['Contracts lawyer', 'Reviews contracts before signing: spots risks, drafts amendments and protocols of disagreement, compares versions.'],
    sud: ['Litigation lawyer', 'Handles disputes: assesses prospects, builds the position, prepares claims and procedural documents through to enforcement.'],
    fin: ['Financial analyst', 'Calculates budgets and project payback and turns the numbers into clear reports.'],
    thk: ['Thinker', 'Generates unconventional ideas, runs brainstorms and finds a way out of dead-end problems.'],
  };
  var NAMES = { 'Оливия': 'Olivia', 'Отто': 'Otto', 'Феликс': 'Felix', 'Клара': 'Klara', 'Густав': 'Gustav', 'Эмиль': 'Emil',
    'Вальтер': 'Walter', 'Ингрид': 'Ingrid', 'Франц': 'Franz', 'Бруно': 'Bruno', 'Руди': 'Rudi', 'Мартин': 'Martin', 'Пауль': 'Paul',
    'Хьюго': 'Hugo', 'Виктор': 'Viktor', 'Анри': 'Henri', 'Карл': 'Karl', 'Рене': 'René' };
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // строка лицензии английской страницы: лицензия CC — на английском, ссылка на русскую версию офиса подписана по-русски (lang="ru")
  window.OFFICE_LEGAL_EN = '© <h1 class="legal__name">Alexey Konyaev</h1> · graphics – <a href="https://creativecommons.org/licenses/by-nc/4.0/deed.en" target="_blank" rel="noopener license">CC BY-NC 4.0</a>' +
    ' · code – <a href="https://github.com/akonyaev-ru/resume/blob/main/LICENSE" target="_blank" rel="noopener">MIT</a>' +
    '<span class="lang-sep"> · </span><a class="lang-link" href="https://akonyaev-ru.github.io/resume/" hreflang="ru" lang="ru">Русский</a>';
  function OT(s) { return LANG === 'en' && Object.prototype.hasOwnProperty.call(EN, s) ? EN[s] : s; }
  window.OT = OT;
  window.OFFICE_I18N = {
    lang: LANG, en: EN, t: OT,
    agent: function (id) { return LANG === 'en' ? AGENTS[id] || null : null; },
    name: function (n) { return LANG === 'en' ? NAMES[n] || n : n; },
    date: function (dt) { return MONTHS[dt.getMonth()] + ' ' + dt.getDate() + ', ' + dt.getFullYear(); },
    // разметка страницы, которую пишет не скрипт (подпись лицензии, подписи для чтения с экрана): текст и подписи — по словарю
    page: function (root) {
      if (LANG !== 'en') return;
      var walk = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT), n, list = [];
      while ((n = walk.nextNode())) list.push(n);
      list.forEach(function (t) { var k = t.nodeValue.trim(); if (k && EN[k]) t.nodeValue = t.nodeValue.replace(k, EN[k]); });
      Array.prototype.forEach.call((root || document).querySelectorAll('[aria-label], [title], [alt]'), function (e) {
        ['aria-label', 'title', 'alt'].forEach(function (a) { var v = e.getAttribute(a); if (v && EN[v]) e.setAttribute(a, EN[v]); });
      });
    },
  };
})();
