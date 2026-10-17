/* «Картотека» (выбор владельца 14.10) — варианты «Обо мне» и «Навыков» на одном экране.
   Владелец: «„Навыки“ и „Обо мне“ нужно доработать». Было: «Обо мне» разрезан на три вкладки («Коротко» на 2/3 пустое),
   «Навыки» — вкладка на группу (видно 6 из 31). Разработчик, 14–15.10: Дизайнер (сабагент) пять раз обрывался по связи,
   варианты собраны в принятом стиле «Картотеки» — её токены, рамка, срезанные углы, маркеры клетками 4 px.
   window.W3X = { about: { a, b, c }, skills: { a, b, c }, init(panel) }; c — как сейчас (WIN_V3), для сравнения.
   Только настоящие данные window.RESUME; уровней и процентов у навыков нет — в данных их нет.
   Портрет: window.W3X_PHOTO (демо одним файлом вшивает его данными) или путь сайта от офиса. */
(function () {
  'use strict';

  function list(x) { return x == null ? [] : [].concat(x); }
  function plural(n, one, few, many) {
    var a = n % 10, b = n % 100;
    if (a === 1 && b !== 11) return one;
    if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
    return many;
  }
  /* Почта — кнопкой «Написать на почту» со ссылкой mailto:, как на нынешнем сайте (владелец 15.10); адрес — в подсказке. */
  function links(c, t, esc, cls, ui) {
    return ['telegram', 'email', 'github'].filter(function (k) { return c[k] && c[k].href; }).map(function (k) {
      // GitHub — надписью «GitHub», а не адресом профиля (17.10: «сделай не ссылку, а именно GitHub»)
      var text = k === 'email' && ui && ui.writeEmail ? t(ui.writeEmail) : k === 'github' ? 'GitHub' : t(c[k].label);
      return '<a class="w3-btn' + (k === 'telegram' ? ' w3-btn--main' : '') + (cls ? ' ' + cls : '') + '" href="' + esc(c[k].href) + '"' +
        (k === 'email' ? ' title="' + esc(String(c[k].href).replace('mailto:', '')) + '"' : ' target="_blank" rel="noopener"') + '>' + esc(text) + '</a>';
    }).join('');
  }
  function facts(p, t) {
    return [['Город', t(p.city)], ['Занятость', t(p.employment)], ['Формат', t(p.schedule)], ['Переезд', t(p.relocation)],
      ['Специализации', list(t(p.specializations)).join(', ')]].filter(function (f) { return f[1]; });
  }
  function photo(p) {
    if (!p.photo) return '';
    return window.W3X_PHOTO || ('../../../' + p.photo);   // офис лежит в .proto/design/office/, сайт — тремя уровнями выше
  }
  function chips(g, t, esc) {
    return '<ul class="w3-chips w3x-chips">' + list(g.skills).map(function (s) { return '<li>' + esc(t(s.name)) + '</li>'; }).join('') + '</ul>';
  }
  function same(id) {   // «как сейчас» — вид «Картотеки» без изменений
    return function (R, t, esc) { return window.WIN_V3.render[id](R, t, esc); };
  }

  var W3X = {
    about: {
      /* А — «карточка персонажа»: слева портрет в пиксельной рамке, имя, роль, контакты; справа — главное, рассказ,
         условия плитками, цитата. Всё на одном экране, без вкладок. */
      a: function (R, t, esc) {
        var p = R.person || {}, src = photo(p), q = t(p.pullquote);
        return '<div class="w3x w3x-about w3x-about-a">' +
          '<aside class="w3x-card">' +
            /* Портрет набран знаками фонового поля, как на нынешнем сайте; фото проступает под курсором (владелец 15.10). */
            (src ? '<div class="w3x-photo w3x-glyph"><canvas class="w3x-glyphs" aria-hidden="true"></canvas>' +
                '<img class="w3x-photo__img" src="' + esc(src) + '" alt="' + esc(t(p.name)) + '" decoding="async"></div>'
              : '<div class="w3x-photo w3x-photo--none" aria-hidden="true">' + esc(String(t(p.name)).charAt(0)) + '</div>') +
            '<h3 class="w3x-name">' + esc(t(p.name)) + '</h3>' +
            '<p class="w3x-role">' + esc(t(p.role).replace(/\n/g, ' ')) + '</p>' +
            '<div class="w3x-btns">' + links(p.contacts || {}, t, esc, '', R.ui) + '</div>' +
          '</aside>' +
          '<div class="w3x-main">' +
            '<p class="w3x-lede">' + esc(t(p.lede)) + '</p>' +
            '<p class="w3x-story">' + esc(t(p.about)) + '</p>' +
            '<dl class="w3x-stats">' + facts(p, t).map(function (f) {
              return '<div><dt>' + f[0] + '</dt><dd>' + esc(f[1]) + '</dd></div>';
            }).join('') + '</dl>' +
            (q ? '<blockquote class="w3-quote w3x-quote">' + esc(q) + '</blockquote>' : '') +
          '</div></div>';
      },
      /* Б — «досье»: без портрета, две колонки — кто и как связаться / условия и рассказ. */
      b: function (R, t, esc) {
        var p = R.person || {}, q = t(p.pullquote);
        return '<div class="w3x w3x-about w3x-about-b">' +
          '<div class="w3x-col">' +
            '<h3 class="w3x-name">' + esc(t(p.name)) + '</h3>' +
            '<p class="w3x-role">' + esc(t(p.role).replace(/\n/g, ' ')) + '</p>' +
            '<p class="w3x-lede">' + esc(t(p.lede)) + '</p>' +
            '<div class="w3x-btns w3x-btns--row">' + links(p.contacts || {}, t, esc, '', R.ui) + '</div>' +
            (q ? '<blockquote class="w3-quote w3x-quote">' + esc(q) + '</blockquote>' : '') +
          '</div>' +
          '<div class="w3x-col">' +
            '<dl class="w3-facts w3x-facts">' + facts(p, t).map(function (f) { return '<dt>' + f[0] + '</dt><dd>' + esc(f[1]) + '</dd>'; }).join('') + '</dl>' +
            '<p class="w3x-story">' + esc(t(p.about)) + '</p>' +
          '</div></div>';
      },
      c: same('about')
    },
    skills: {
      /* А — «инвентарь»: все пять групп сразу, ячейками в три колонки. Колонки CSS неразрывные ячейки не делят
         (две колонки и пустая третья), поэтому раскладка — здесь: группа идёт в самую короткую колонку, высота —
         по числу строк ярлыков (ярлык длиннее ~22 знаков занимает строку один). */
      a: function (R, t, esc) {
        var cols = [[], [], []], h = [0, 0, 0];
        list(R.skillGroups).forEach(function (g) {
          var lines = 0, row = 0;
          list(g.skills).forEach(function (s) {
            var w = String(t(s.name)).length + 3;
            if (row + w > 34) { lines++; row = 0; }
            row += w;
          });
          var k = h.indexOf(Math.min.apply(null, h)), n = list(g.skills).length;
          h[k] += 3 + lines + 1;
          cols[k].push('<section class="w3x-slot"><h3 class="w3x-group">' + esc(t(g.title)) + '</h3>' +
            '<p class="w3x-count">' + n + ' ' + plural(n, 'навык', 'навыка', 'навыков') + '</p>' + chips(g, t, esc) + '</section>');
        });
        return '<div class="w3x w3x-skills w3x-skills-a">' + cols.map(function (c) { return '<div class="w3x-colslot">' + c.join('') + '</div>'; }).join('') + '</div>';
      },
      /* Б — «таблица»: группа слева, её навыки строкой справа; все пять строк сразу. */
      b: function (R, t, esc) {
        return '<div class="w3x w3x-skills w3x-skills-b">' + list(R.skillGroups).map(function (g) {
          return '<section class="w3x-row"><h3 class="w3x-group">' + esc(t(g.title)) + '</h3>' + chips(g, t, esc) + '</section>';
        }).join('') + '</div>';
      },
      c: same('skills')
    },
    /* Тетрис в автомате (владелец 15.10: рекорды — в окне, вместо табло; видны во время игры; спецклетки как есть).
       Пока макет на снимке настоящей партии (W3X_TETRIS из tetris/mock.js): стакан, «далее», легенда, счёт — настоящие,
       рекорды — общая десятка из data/records.js. Игра подключится после выбора раскладки. */
    /* Владелец 15.10 о раскладке А: «не нравится визуально, как расположены блоки, и кнопки управления» — справа блоки
       разной высоты и пустота под ними, клавиши мелкие. Новые раскладки: колонки по высоте стакана, клавиши — пиксельные
       колпачки по его референсу (tetris/keys.js). А оставлена для сравнения. */
    tetris: {
      a: function (R, t, esc) { return tetrisMock('a', esc); },        // А — как было: стакан и колонка справа
      // «Аркада» (выбор владельца 15.10) — настоящая игра сайта, если console.js подключён; без него — макет
      arcade: function (R, t, esc) { return window.OfficeConsole && OfficeConsole.blocks ? tetrisArcade(esc) : tetrisMock('arcade', esc); },
      deck: function (R, t, esc) { return tetrisMock('deck', esc); }    // «Пульт» — стакан слева, клавиши рядом снизу
    },
    init: function (panel) {
      if (!panel) return;
      var body = panel.querySelector('.win__body');
      if (body && panel.querySelector('.w3x')) body.scrollTop = 0;
      glyphPortrait(panel);
      if (window.PixKeys && panel.querySelector('.w3x-pkey')) { PixKeys.mount(panel); PixKeys.snap(panel); }
      // макет, а не игра: клавиши ничего не двигают — честно в подзаголовке окна (у живой «Аркады» — нет)
      var sub = panel.querySelector('#winSub');
      if (sub && panel.querySelector('.w3x-tetris:not(.w3x-live)') && !/макет/.test(sub.textContent)) sub.textContent += ' · макет на снимке партии';
    },
    tetrisStart: tetrisStart,
    startStyle: 'key',   // кнопка стартового экрана и конца партии: 'btn' | 'key' | 'blink' (screenButton); в демо — группа «Кнопка тетриса»
    snap: snap
  };


  /* Портрет из знаков — перенос initGlyphPortrait с нынешнего сайта (assets/js/app.js): фото ужимается до точки на
     ячейку 6×8, яркость выбирает знак по «плотности чернил» (порядок знаков считается, а не подбирается руками),
     прозрачное остаётся пустым — силуэт рисуют сами знаки. Несколько знаков пересобираются раз в 220 мс; само фото
     проступает в круге под курсором (стили). Пиксели фото с диска браузер не отдаёт — тогда просто фото. */
  var GLYPHS = '{}[]()<>/\\|;:=+-*#$%&!?^~01234567§№¶λ';   // как на сайте, с обратной косой
  var MONO = '"JetBrains Mono", ui-monospace, monospace';
  var LESS = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function glyphPortrait(panel) {
    var host = panel.querySelector('.w3x-glyph');
    if (!host || host._gp) return;
    host._gp = true;
    var canvas = host.querySelector('.w3x-glyphs'), photo = host.querySelector('.w3x-photo__img'), ctx = canvas.getContext('2d');
    var CELL_W = 6, CELL_H = 8, FONT = 7.5, DIM = [74, 84, 116], BRIGHT = [233, 236, 244];
    var ramp = GLYPHS, cells = [];
    function buildRamp() {
      var pr = document.createElement('canvas'); pr.width = 12; pr.height = 16;
      var pc = pr.getContext('2d', { willReadFrequently: true });
      pc.font = '11px ' + MONO; pc.textBaseline = 'top';
      ramp = GLYPHS.split('').map(function (ch) {
        pc.clearRect(0, 0, 12, 16); pc.fillStyle = '#fff'; pc.fillText(ch, 1, 1);
        var d = pc.getImageData(0, 0, 12, 16).data, ink = 0;
        for (var i = 3; i < d.length; i += 4) ink += d[i];
        return { ch: ch, ink: ink };
      }).sort(function (a, b) { return a.ink - b.ink; }).map(function (x) { return x.ch; }).join('');
    }
    function paint(c) {
      var m = c.lum;
      ctx.fillStyle = 'rgb(' + Math.round(DIM[0] + (BRIGHT[0] - DIM[0]) * m) + ',' + Math.round(DIM[1] + (BRIGHT[1] - DIM[1]) * m) + ',' +
        Math.round(DIM[2] + (BRIGHT[2] - DIM[2]) * m) + ')';
      ctx.globalAlpha = 0.5 + 0.5 * m;
      ctx.fillText(c.ch, c.col * CELL_W, c.row * CELL_H);
    }
    function render() {
      var w = host.clientWidth, h = host.clientHeight;
      if (!w || !h || !photo.naturalWidth) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.font = FONT + 'px ' + MONO; ctx.textBaseline = 'top';
      var cols = Math.ceil(w / CELL_W), rows = Math.ceil(h / CELL_H), sm = document.createElement('canvas');
      sm.width = cols; sm.height = rows;
      // как object-fit: cover и object-position: 50% 0 у самого фото — знаки ложатся ровно под проступающее фото
      var k = Math.max(w / photo.naturalWidth, h / photo.naturalHeight), sw = w / k, sh = h / k, sx = (photo.naturalWidth - sw) / 2;
      var sc = sm.getContext('2d', { willReadFrequently: true }); sc.drawImage(photo, sx, 0, sw, sh, 0, 0, cols, rows);
      var px;
      try { px = sc.getImageData(0, 0, cols, rows).data; } catch (e) { host.classList.add('is-plain'); return; }
      cells = []; ctx.clearRect(0, 0, w, h);
      for (var row = 0; row < rows; row++) for (var col = 0; col < cols; col++) {
        var at = (row * cols + col) * 4, a = px[at + 3] / 255;
        if (a < 0.16) continue;
        var lum = (px[at] * 0.299 + px[at + 1] * 0.587 + px[at + 2] * 0.114) / 255;
        lum = Math.min(1, Math.pow(lum * a, 0.78) * 1.1);   // полутона приподняты, как на сайте
        var c = { col: col, row: row, lum: lum, ch: ramp.charAt(Math.round(lum * (ramp.length - 1))) };
        cells.push(c); paint(c);
      }
      ctx.globalAlpha = 1;
      host.classList.add('is-drawn');
    }
    buildRamp();
    if (photo.complete && photo.naturalWidth) render(); else photo.addEventListener('load', render);
    if (document.fonts && document.fonts.load) document.fonts.load('11px "JetBrains Mono"', '{}01').then(function () { buildRamp(); render(); }, function () {});
    host.addEventListener('mousemove', function (e) {
      var b = host.getBoundingClientRect();
      host.classList.add('is-live');
      host.style.setProperty('--mx', Math.round(e.clientX - b.left) + 'px');
      host.style.setProperty('--my', Math.round(e.clientY - b.top) + 'px');
    });
    host.addEventListener('mouseleave', function () { host.classList.remove('is-live'); });
    if (LESS) return;
    var timer = setInterval(function () {
      if (!document.contains(host)) { clearInterval(timer); return; }   // окно закрыли или перерисовали
      if (document.hidden || !cells.length) return;
      for (var i = 0; i < 3; i++) {
        var c = cells[Math.floor(Math.random() * cells.length)], at = Math.round(c.lum * (ramp.length - 1));
        c.ch = ramp.charAt(Math.max(0, Math.min(ramp.length - 1, at + (Math.random() < 0.5 ? -1 : 1))));
        ctx.clearRect(c.col * CELL_W, c.row * CELL_H, CELL_W, CELL_H); paint(c);
      }
      ctx.globalAlpha = 1;
    }, 220);
  }

  /* Макет окна тетриса. Рекорды — как на сайте (mergeScores): общая десятка, своя запись на месте по счёту, не в
     десятке — отдельной строкой; при пустой таблице — честное «рекордов пока нет». Свой ник — из партии снимка. */
  function tetrisMock(kind, esc) {
    var S = window.W3X_TETRIS, REC = window.RECORDS || { top: [] };
    if (!S) return '<p class="stub">Нет снимка партии (tetris/mock.js).</p>';
    var top = (REC.top || []).slice(0, 10), mine = S.nick;
    var rows = top.length ? top.map(function (r, i) {
      return '<li' + (r.nick === mine ? ' class="is-mine"' : '') + '><span class="w3x-place">' + (i + 1) + '</span>' +
        '<span class="w3x-nick">' + esc(r.nick) + '</span><span class="w3x-best">' + esc(String(r.best)) + '</span></li>';
    }).join('') : '<li class="w3x-empty">рекордов пока нет</li>';
    var own = '<p class="w3x-own">вы — <span class="w3x-nick">' + esc(mine || '—') + '</span>, рекорда пока нет</p>';
    // без строки «общая таблица на …» — владелец 15.10: «убери упоминание общей таблицы»
    var records = '<section class="w3x-tblock w3x-records"><h3 class="w3x-group">Рекорды</h3><ol class="w3x-top">' + rows + '</ol>' + own + '</section>';
    var next = '<section class="w3x-tblock"><h3 class="w3x-group">Далее</h3><img class="w3x-next" src="' + S.next + '" alt="Следующая фигура" width="' +
      Math.round(S.nw / 1.25) + '" height="' + Math.round(S.nh / 1.25) + '"></section>';
    var stats = '<dl class="w3x-tblock w3x-stats-t"><div><dt>Счёт</dt><dd class="w3x-tnum">' + S.score + '</dd></div>' +
      '<div><dt>Уровень</dt><dd class="w3x-tnum">' + S.level + '</dd></div><div><dt>Линии</dt><dd class="w3x-tnum">' + S.lines + '</dd></div></dl>';
    var legend = '<section class="w3x-tblock"><h3 class="w3x-group">Спецклетки</h3><ul class="w3x-legend">' + (S.legend || []).map(function (l) {
      // в снимке название и пояснение слиплись («черная дырaглотает…») — делим по известному названию
      var m = String(l.text).match(/^(черная дыра|чёрная дыра|кислота|радуга|камень|вирус)\s*(.*)$/i) || [0, l.text, ''];
      // владелец 15.10: «описание специальных блоков должно остаться» — название и пояснение всегда
      return '<li><img src="' + l.icon + '" alt="" width="16" height="16"><span><b>' + esc(m[1]) + '</b> ' + esc(m[2]) + '</span></li>';
    }).join('') + '</ul></section>';
    var board = '<div class="w3x-board"><img src="' + S.field + '" alt="Стакан тетриса" width="' + Math.round(S.fw / 1.25) + '" height="' +
      Math.round(S.fh / 1.25) + '"></div>';
    /* Управление — как на сайте (console.js, keyRow): одна строка под стаканом — стрелки, поворот, широкий сброс, пауза;
       крупно знак действия, мелко клавиша, если не совпадает со знаком. Владелец 15.10: «управление пропало — вернуть».
       В макете кнопки ещё ничего не делают — заработают с игрой. */
    var KEYS = [['left', '←', '', 'Влево (←)'], ['down', '↓', '', 'Вниз (↓)'], ['right', '→', '', 'Вправо (→)'], ['rotate', '↻', '↑', 'Повернуть (↑, X)'],
      ['drop', '⤓', 'пробел', 'Сбросить (пробел)'], ['pause', 'II', 'P', 'Пауза (P)']];
    var cap = function (k) {
      return '<button type="button" class="w3x-key' + (k[0] === 'drop' ? ' w3x-key--wide' : '') + '" data-act="' + k[0] + '" aria-label="' + k[3] + '" title="' + k[3] + '">' +
        '<span class="w3x-key__glyph">' + k[1] + '</span>' + (k[2] ? '<small aria-hidden="true">' + k[2] + '</small>' : '') + '</button>';
    };
    var keys = '<div class="w3x-keys"><span class="w3x-keys__group">' + KEYS.slice(0, 4).map(cap).join('') + '</span>' + KEYS.slice(4).map(cap).join('') + '</div>';
    var mark = '<p class="w3x-mock">Макет на снимке настоящей партии — игра подключится после выбора раскладки.</p>';
    if (kind === 'a') return '<div class="w3x w3x-tetris w3x-tetris-a"><div class="w3x-boardcol">' + board + keys + '</div>' +
      '<div class="w3x-tcol"><div class="w3x-trow">' + next + stats + '</div>' +
      '<div class="w3x-tpair">' + records + legend + '</div>' + mark + '</div></div>';   // рекорды и спецклетки рядом — влезает и десятка

    var pkey = pkeyHtml;
    var hud = function (cls) {
      return '<dl class="w3x-hud ' + cls + '"><div><dt>Счёт</dt><dd class="w3x-tnum">' + S.score + '</dd></div>' +
        '<div><dt>Уровень</dt><dd class="w3x-tnum">' + S.level + '</dd></div><div><dt>Линии</dt><dd class="w3x-tnum">' + S.lines + '</dd></div></dl>';
    };
    var nextImg = '<img class="w3x-next" src="' + S.next + '" alt="Следующая фигура" width="' + Math.round(S.nw / 1.25) + '" height="' + Math.round(S.nh / 1.25) + '">';

    if (kind === 'arcade') {
      /* «Аркада» — как NES-тетрис: стакан посередине; слева — что делают спецклетки и пульт (стрелки буквой «Т», под ними
         пробел во всю ширину, P над ←); справа — далее, счёт и рекорды. Колонки ровно по высоте стакана. */
        return '<div class="w3x w3x-tetris w3x-tetris-arcade">' +
        '<div class="w3x-side">' + legend + ARCADE_CTL + '</div>' +
        board +
        '<div class="w3x-side"><div class="w3x-nexthud"><section class="w3x-tblock"><h3 class="w3x-group">Далее</h3>' + nextImg + '</section>' +
        '<div class="w3x-tblock">' + hud('w3x-hud--col') + '</div></div>' + records + '</div></div>';
    }
    /* «Пульт» — стакан слева; справа сверху табло (далее, счёт, уровень, линии), посередине рекорды и спецклетки рядом,
       снизу клавиши одним рядом с подписями — низ пульта на уровне дна стакана. */
    var row = function (act, w) { return '<span class="w3x-cap">' + pkey(act, w) + '<small>' + PKEYS[act][3] + '</small></span>'; };
    var deck = '<section class="w3x-tblock w3x-deck"><h3 class="w3x-group">Управление</h3><div class="w3x-deck__keys">' +
      '<span class="w3x-deck__grp">' + row('left') + row('down') + row('right') + '</span>' +
      '<span class="w3x-deck__grp">' + row('rotate') + row('drop', 2) + row('pause') + '</span></div></section>';
    return '<div class="w3x w3x-tetris w3x-tetris-deck">' + board + '<div class="w3x-side">' +
      '<div class="w3x-tblock w3x-board-hud"><div class="w3x-hudnext"><span class="w3x-hudlbl">Далее</span>' + nextImg + '</div>' + hud('w3x-hud--row') + '</div>' +
      '<div class="w3x-tpair">' + records + legend + '</div>' + deck + '</div></div>';
  }

  /* Пиксельные клавиши (tetris/keys.js): знак на колпачке — клавиша клавиатуры, подпись — действие (как на сайте:
     ← → сдвиг, ↓ вниз, ↑ поворот, пробел — сброс, P — пауза). data-code — какие настоящие клавиши её нажимают. */
  var PKEYS = {
    left: ['←', 'ArrowLeft', 'Влево (←)', 'влево'], down: ['↓', 'ArrowDown', 'Вниз (↓)', 'вниз'],
    right: ['→', 'ArrowRight', 'Вправо (→)', 'вправо'], rotate: ['↑', 'ArrowUp KeyX', 'Повернуть (↑, X)', 'поворот'],
    drop: ['SPACE', 'Space', 'Сбросить (пробел)', 'сброс'], pause: ['P', 'KeyP', 'Пауза (P)', 'пауза']
  };
  function pkeyHtml(act, span, area) {   // span — ширина в обычных клавишах (пробел)
    var k = PKEYS[act];
    return '<button type="button" class="w3x-pkey" data-act="' + act + '" data-label="' + k[0] + '" data-code="' + k[1] + '"' +
      (span ? ' data-span="' + span + '"' : '') + (area ? ' style="grid-area: ' + area + '"' : '') + ' aria-label="' + k[2] + '" title="' + k[2] + '"></button>';
  }
  /* Пульт «Аркады»: стрелки буквой «Т», P над ←, пробел во всю ширину (три клавиши и два промежутка); рядом — что делает каждая. */
  var ARCADE_CTL = '<section class="w3x-tblock w3x-ctl"><h3 class="w3x-group">Управление</h3><div class="w3x-ctl__in"><div class="w3x-pad">' +
    pkeyHtml('pause', 0, 'p') + pkeyHtml('rotate', 0, 'u') + pkeyHtml('left', 0, 'l') + pkeyHtml('down', 0, 'd') + pkeyHtml('right', 0, 'r') +
    pkeyHtml('drop', 3, 's') + '</div><ul class="w3x-how"><li><b>↑</b> поворот</li><li><b>← →</b> сдвиг</li><li><b>↓</b> вниз</li>' +
    '<li><b>пробел</b> сброс</li><li><b>P</b> пауза</li></ul></div></section>';

  /* «Аркада» на настоящей игре сайта (assets/js/console.js, окно-skin): стакан и «далее» — холсты, которые рисует игра;
     спецклетки — её значками и её подписями (размеры из правил ядра); счёт, уровень, линии — из партии; рекорды — общая
     десятка (data/records.js) со своей записью (mergeScores). Поверх стакана — стартовый экран, пауза, конец партии. */
  function tetrisArcade(esc) {
    var C = window.OfficeConsole;
    var legend = '<section class="w3x-tblock"><h3 class="w3x-group">Спецклетки</h3><ul class="w3x-legend">' + C.blocks().map(function (b) {
      return '<li data-type="' + b.type + '"><canvas class="w3x-licon" aria-hidden="true"></canvas><span><b>' + esc(b.name) + '</b> ' + esc(b.text) + '</span></li>';
    }).join('') + '</ul></section>';
    var board = '<div class="w3x-board"><canvas class="w3x-field" role="img" aria-label="Стакан тетриса"></canvas>' +
      '<div class="w3x-screen" aria-live="polite"></div><div class="w3x-over" hidden><b></b><span></span></div></div>';
    var hud = '<dl class="w3x-hud w3x-hud--col"><div><dt>Счёт</dt><dd class="w3x-tnum" data-stat="score">0</dd></div>' +
      '<div><dt>Уровень</dt><dd class="w3x-tnum" data-stat="level">1</dd></div><div><dt>Линии</dt><dd class="w3x-tnum" data-stat="lines">0</dd></div></dl>';
    // без строки «общая таблица на …» — владелец 15.10: «убери упоминание общей таблицы»
    var records = '<section class="w3x-tblock w3x-records"><h3 class="w3x-group">Рекорды</h3><ol class="w3x-top"></ol><p class="w3x-own"></p></section>';
    return '<div class="w3x w3x-tetris w3x-tetris-arcade w3x-live">' +
      '<div class="w3x-side">' + legend + ARCADE_CTL + '</div>' + board +
      '<div class="w3x-side"><div class="w3x-nexthud"><section class="w3x-tblock"><h3 class="w3x-group">Далее</h3><canvas class="w3x-nextc" aria-hidden="true"></canvas></section>' +
      '<div class="w3x-tblock">' + hud + '</div></div>' + records + '</div></div>';
  }

  function escHtml(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* Кнопка экрана поверх стакана — три вида (владелец 15.10: «кривовато выглядит и кнопка не очень»; была .w3-btn окна —
     шрифт Arial (кнопки шрифт страницы не наследуют), рамку фокуса обрезали срезанные углы):
       'btn'   — пиксельная кнопка: бирюза окна, ступенчатые углы и скосы клетками клавиш (--pk), надпись Press Start;
       'key'   — ВЫБОР ВЛАДЕЛЬЦА 15.10 («клавиша, но вместо ENTER — играть»): клавиша тем же рисунком, что пульт
                 (tetris/keys.js), бирюзой: «ИГРАТЬ» (2,5 клавиши — 50 клеток слова влезают и при 100 %, где клетка 2 точки)
                 с подписью «или Enter»; в конце партии — «ЕЩЁ РАЗ» с подписью «или R» (владелец 15.10; 59 клеток — 3 клавиши);
       'blink' — надпись «▶ ИГРАТЬ», мигает, как PRESS START на автоматах (при «уменьшить движение» не мигает).
     'btn' и 'blink' остаются для сравнения (?ts=btn|blink). Возвращает { el — что вставить, focus — сама кнопка }. */
  function screenButton(kind, act, onClick) {
    var word = act === 'start' ? 'Играть' : 'Ещё раз', b = document.createElement('button'), el = b;
    b.type = 'button';
    if (kind === 'key') {
      b.className = 'w3x-pkey w3x-startkey';
      b.setAttribute('data-label', act === 'start' ? 'ИГРАТЬ' : 'ЕЩЁ РАЗ');
      b.setAttribute('data-span', act === 'start' ? '2.5' : '3');
      b.setAttribute('data-code', act === 'start' ? 'Enter NumpadEnter' : 'KeyR');   // нажатие на клавиатуре видно на экране
      b.setAttribute('data-pal', 'acc');
      b.setAttribute('aria-label', word + ' (' + (act === 'start' ? 'Enter' : 'R') + ')');
      el = document.createElement('span'); el.className = 'w3x-startcap';
      el.appendChild(b);
      var cap = document.createElement('small'); cap.textContent = act === 'start' ? 'или Enter' : 'или R'; el.appendChild(cap);
    } else {
      /* Надпись — во вложенном span: фильтр чёткости пиксельного шрифта (#w3x-crisp, порог прозрачности) работает только
         на прозрачном фоне, а у кнопки фон сплошной. «▶» — знак самого Press Start 2P (проверено замером ширины). */
      b.className = kind === 'blink' ? 'w3x-press' : 'w3x-pbtn';
      b.innerHTML = (kind === 'blink' ? '<span class="w3x-press__mark" aria-hidden="true">▶</span>' : '') + '<span class="w3x-btxt">' + word + '</span>';
    }
    b.addEventListener('click', onClick);
    return { el: el, focus: b };
  }

  /* Рекорды: десятка со своей строкой на месте по счёту (акцентом), своя вне десятки — отдельной строкой; рекорда нет —
     «вы — ник, рекорда пока нет»; таблица пуста — честное «рекордов пока нет». */
  function paintRecords(panel, table, nick) {
    var ol = panel.querySelector('.w3x-top'), own = panel.querySelector('.w3x-own');
    if (!ol) return;
    ol.innerHTML = table.rows.length ? table.rows.map(function (r, i) {
      return '<li' + (r.mine ? ' class="is-mine"' : '') + '><span class="w3x-place">' + (i + 1) + '</span><span class="w3x-nick">' + escHtml(r.nick) +
        '</span><span class="w3x-best">' + escHtml(r.best) + '</span></li>';
    }).join('') : '<li class="w3x-empty">рекордов пока нет</li>';
    var mine = table.extra || table.rows.filter(function (r) { return r.mine; })[0];
    own.innerHTML = mine ? 'вы — <span class="w3x-nick">' + escHtml(mine.nick) + '</span>, ' + (table.extra ? 'рекорд ' + escHtml(mine.best) + ', вне десятки' : 'ваша строка выделена')
      : 'вы — <span class="w3x-nick">' + escHtml(nick || '—') + '</span>, рекорда пока нет';
  }

  /* Запуск игры в окне «Аркады»: окно — наше (skin), игра — console.js. Клетка стакана — целое число точек экрана и
     наибольшая, при которой окно не листается (на ноутбуке 1366×768 меньше, чем на 1920×1080). Закрыть окно офиса —
     остановить игру; Esc игры — закрыть окно офиса. send: false — партии прототипа в общую таблицу не уходят. */
  var CELL_MAX = 26, CELL_MIN = 12;   // CSS-пиксели клетки стакана: до 26 (как в макете — 20,8 при 125 %), не меньше 12
  function tetrisStart(panel, opts) {
    var C = window.OfficeConsole, root = panel && panel.querySelector('.w3x-live');
    if (!C || !root) return false;
    if (C.isOpen()) C.close();   // окно перерисовали — прежняя партия закрывается (её окна уже нет в странице)
    var q = function (s) { return panel.querySelector(s); };
    // игра держит фокус в окне (ui.dialog.focus) — окну нужен tabindex, иначе после «Играть» фокус падал на страницу
    if (!panel.hasAttribute('tabindex')) panel.setAttribute('tabindex', '-1');
    var field = q('.w3x-field'), screen = q('.w3x-screen'), body = q('.win__body');
    var legend = {};
    Array.prototype.forEach.call(panel.querySelectorAll('.w3x-legend li[data-type]'), function (li) {
      legend[li.getAttribute('data-type')] = li;
      C.icon(li.querySelector('canvas'), li.getAttribute('data-type'), 16);
    });
    var keys = {};
    Array.prototype.forEach.call(panel.querySelectorAll('.w3x-pkey[data-act]'), function (b) {
      keys[b.getAttribute('data-act')] = b;
      b.addEventListener('click', function () { C.act(b.getAttribute('data-act')); });
    });
    var style = (window.W3X && W3X.startStyle) || 'key';
    var start = screenButton(style, 'start', function () { C.act('start'); });
    var again = screenButton(style, 'again', function () { C.act('restart'); });
    var stat = function (k) { return q('[data-stat="' + k + '"]'); };
    /* Счёт игра пишет каждый кадр (updateStats), а запись текста — изменение разметки: наблюдатель snap() тогда
       пересчитывал бы надписи и перерисовывал клавиши 60 раз в секунду. Пишем, только когда число сменилось. */
    var put = function (el, v) { if (el.textContent !== v) el.textContent = v; };
    var lazy = function (el) { return { get textContent() { return el.textContent; }, set textContent(v) { put(el, String(v)); } }; };
    var before = 0;   // рекорд до партии: «новый рекорд» — только если побит, а не повторён
    function show(html, btn, hint) {
      screen.innerHTML = html;
      if (btn) screen.appendChild(btn.el);
      if (hint) { var p = document.createElement('p'); p.className = 'w3x-screen__hint'; p.textContent = hint; screen.appendChild(p); }
      screen.hidden = false;
      if (btn) btn.focus.focus();
      snap(panel);
    }
    // подпись и значение — двумя строками по центру: в одной строке два шрифта вставали на разные базовые линии (замер 15.10)
    var pair = function (label, value) { return '<p class="w3x-screen__who"><span class="w3x-screen__lbl">' + label + '</span>' + value + '</p>'; };
    // наибольшая клетка, при которой окно не листается; не влезает и самая малая — та, где перебор наименьший
    function pick(apply, max) {
      var dpr = window.devicePixelRatio || 1, hi = Math.floor(max * dpr), lo = Math.ceil(CELL_MIN * dpr), best = null;
      for (var k = hi; k >= lo; k--) {
        apply(k / dpr);
        var over = body ? body.scrollHeight - body.clientHeight : 0;
        if (over <= 1) return { k: k, over: 0 };
        if (!best || over < best.over - 1) best = { k: k, over: over };
      }
      apply(best.k / dpr);
      return best;
    }
    /* Колонки «Спецклетки + Управление» не ниже ~408 px: клавиши меньше 50 px не рисуются, пояснения спецклеток владелец
       велел оставить. На коротком экране (1366×643, окно 470) стакан влезал только клеткой 15 — играть мелко. Стакан
       мельче удобного (CELL_COMFORT) — окно становится выше, ровно чтобы клетка была удобной, если на экране есть место.
       Где удобная клетка влезает и так (экран владельца — 24, 1920×945 — 26), высота окна прежняя. */
    var CELL_COMFORT = 20, lastApply = null;
    function fit(apply) {
      panel.style.removeProperty('--w3-max');
      lastApply = apply;
      var dpr = window.devicePixelRatio || 1, best = pick(apply, CELL_MAX), room = panel.parentNode ? panel.parentNode.clientHeight - 16 : 0;
      if ((best.over > 1 || best.k < Math.floor(CELL_COMFORT * dpr)) && room > panel.offsetHeight) {
        panel.style.setProperty('--w3-max', room + 'px');   // окно по содержимому, не выше экрана
        var grown = pick(apply, CELL_COMFORT);
        if (!(grown.over <= 1 && (best.over > 1 || grown.k > best.k))) { panel.style.removeProperty('--w3-max'); apply(best.k / dpr); }
      }
      snap(panel);
    }
    var skin = {
      ui: { dialog: panel, field: field, preview: q('.w3x-nextc'), overlay: q('.w3x-over'), stats: { score: lazy(stat('score')), best: document.createElement('span') },
        legend: legend, keys: keys, closeBtn: q('#winClose'), again: again.focus },
      send: opts.send,
      boot: function (nick) {
        paintRecords(panel, C.table(), nick);
        fit(function (cell) { sizeBoard(field, q('.w3x-nextc'), cell); });
        // у клавиши ENTER подпись «играть» под ней, подсказка лишняя; у кнопки и надписи — «или Enter»
        show('<p class="w3x-screen__title w3x-screen__title--big">Тетрис</p>' + pair('игрок', '<span class="w3x-nick">' + escHtml(nick) + '</span>'),
          start, style === 'key' ? '' : 'или Enter');
      },
      play: function () { screen.hidden = true; screen.innerHTML = ''; before = (C.record() || {}).best || 0; },
      fit: fit,
      stats: function (game) { put(stat('level'), String(game.level)); put(stat('lines'), String(game.lines)); },
      over: function (score, table) {
        paintRecords(panel, table, C.nick());
        var fresh = score > before && score > 0;
        show('<p class="w3x-screen__title">Игра окончена</p>' + pair('счёт', '<b class="w3x-tnum">' + escHtml(score) + '</b>') +
          (fresh ? '<p class="w3x-screen__rec">новый рекорд</p>' : ''), again, style === 'key' ? 'Esc — закрыть' : 'R — ещё раз · Esc — закрыть');
      },
      close: function () {
        panel.style.removeProperty('--w3-max');   // прибавка высоты — только для тетриса: окно дальше служит другим разделам
        window.removeEventListener('resize', onWinResize);
        if (document.contains(field) && opts.close) opts.close();   // окно ещё наше — закрыть его
      }
    };
    /* Смена размера окна браузера: в партии подгоняет сама игра (onResize в console.js), на стартовом экране — мы.
       Без этого окно, открытое свёрнутым или в узкой вкладке, оставалось с клеткой 12 и после разворота. */
    var queued = 0;
    function onWinResize() {
      if (queued) return;
      queued = requestAnimationFrame(function () {
        queued = 0;
        if (lastApply && C.isOpen() && document.contains(field) && C.phase() === 'boot') fit(lastApply);
      });
    }
    window.addEventListener('resize', onWinResize);
    C.open(opts.from, { skin: skin });
    /* Шрифты окна (Golos Text, Press Start) грузятся, когда их впервые видит раскладка — то есть посреди подгонки. Потом
       пояснения спецклеток переносятся иначе (замер 1366×643: 109 → 142 px), и окно, подогнанное без прокрутки, листалось.
       Догрузились — подогнать заново (на стартовом экране и в партии; после партии холсты не трогаем — стакан стёрся бы). */
    if (document.fonts && document.fonts.status !== 'loaded') {
      document.fonts.ready.then(function () {
        var ph = C.isOpen() && document.contains(field) && C.phase();
        if (lastApply && (ph === 'boot' || ph === 'play')) fit(lastApply);
      });
    }
    return true;
  }
  /* До первой партии стакан пустой, но размер у него уже есть — стартовый экран лежит поверх. */
  function sizeBoard(field, next, cell) {
    var G = window.OfficeConsole.geometry(), dpr = window.devicePixelRatio || 1;
    [[field, G.cols, G.rows], [next, G.previewW, G.previewH]].forEach(function (c) {
      c[0].width = Math.round(c[1] * cell * dpr); c[0].height = Math.round(c[2] * cell * dpr);
      c[0].style.width = c[1] * cell + 'px'; c[0].style.height = c[2] * cell + 'px';
    });
    var g = field.getContext('2d'); g.fillStyle = '#0b1018'; g.fillRect(0, 0, field.width, field.height);
  }

  /* Пиксельный шрифт чёткий, только когда его клетки лежат на целых точках экрана. Размер это даёт (кратные 6,4 px
     при 125 %), а положение — нет: окно стоит по центру, и строки выходят на 211,31 / 293,81 точки (замер 15.10:
     27–34 % точек надписей — промежуточные тона). Каждой надписи — сдвиг на остаток до целой точки через
     position: relative (раскладку не трогает, слоя не создаёт). Пересчёт — при смене содержимого окна, шрифтов,
     размера. */
  var PIX = '.win__title, .w3-name, .w3x-name, .w3-who, .w3x-group, .w3-num, .w3-year, .w3-lang, .w3x-tnum, .w3x-nick, .w3x-best, .w3x-place, ' +
    '.w3x-screen__title, .w3x-over b, .w3x-btxt, .w3x-press__mark';   // надписи и кнопки поверх стакана «Аркады»
  function snap(panel) {
    if (!panel) return;
    var on = /\bw3-font-(tiny5|press)\b/.test(document.body.className), dpr = window.devicePixelRatio || 1;
    var els = Array.prototype.slice.call(panel.querySelectorAll(PIX));
    els.forEach(function (e) { e.style.removeProperty('top'); e.style.removeProperty('left'); });
    // пиксельные клавиши тетриса: перерисовать под нынешний масштаб и поставить на целые точки (при любом шрифте)
    if (window.PixKeys && panel.querySelector('.w3x-pkey')) { PixKeys.mount(panel); PixKeys.snap(panel); }
    // стакан и «далее» живой игры — тоже на целые точки: клетка стакана — целое число точек экрана; пиксельная кнопка
    // экрана — тоже: её скосы и ступеньки углов — клетки клавиш (--pk), на дробной точке они расплываются
    Array.prototype.forEach.call(panel.querySelectorAll('.w3x-field, .w3x-nextc, .w3x-pbtn'), function (c) {
      c.style.left = ''; c.style.top = '';
      var r = c.getBoundingClientRect();
      if (!r.width) return;
      c.style.left = ((Math.round(r.left * dpr) - r.left * dpr) / dpr).toFixed(3) + 'px';
      c.style.top = ((Math.round(r.top * dpr) - r.top * dpr) / dpr).toFixed(3) + 'px';
    });
    if (!on) return;
    els.forEach(function (e) {
      if (!/Tiny5|Press Start/.test(getComputedStyle(e).fontFamily.split(',')[0])) return;
      var r = document.createRange(); r.selectNodeContents(e);
      var q = r.getBoundingClientRect();
      if (!q.width) return;
      var dy = (Math.round(q.top * dpr) - q.top * dpr) / dpr, dx = (Math.round(q.left * dpr) - q.left * dpr) / dpr;
      if (getComputedStyle(e).position === 'static') e.style.position = 'relative';
      e.style.top = dy.toFixed(3) + 'px'; e.style.left = dx.toFixed(3) + 'px';
    });
    if (!panel._w3xSnap) {   // один раз на окно: смена пункта «Картотеки», шрифты, размер окна
      panel._w3xSnap = true;
      var queued = 0, again = function () { if (!queued) queued = requestAnimationFrame(function () { queued = 0; snap(panel); }); };
      if (window.MutationObserver) new MutationObserver(again).observe(panel, { childList: true, subtree: true });
      window.addEventListener('resize', again);
      if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', again);
    }
  }

  /* Порог прозрачности для пиксельного шрифта: Windows рисует текст с ClearType — цветная бахрома по краям клеток
     (замер 15.10: «+##+» в каждом штрихе). Под фильтром Chrome рисует текст оттенками серого, а порог делает каждую
     точку либо буквой, либо фоном. Фильтр — один на страницу. */
  function crispFilter() {
    if (document.getElementById('w3x-crisp')) return;
    var NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.setAttribute('aria-hidden', 'true');
    svg.style.position = 'absolute';
    svg.innerHTML = '<filter id="w3x-crisp" color-interpolation-filters="sRGB"><feComponentTransfer>' +
      '<feFuncA type="discrete" tableValues="0 1"/></feComponentTransfer></filter>';
    document.body.appendChild(svg);
  }
  if (document.body) crispFilter(); else document.addEventListener('DOMContentLoaded', crispFilter);

  window.W3X = W3X;
})();
