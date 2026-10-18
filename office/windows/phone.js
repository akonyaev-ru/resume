/* Окно раздела на телефоне — варианты для выбора (владелец 15.10: «телефонная версия не нравится, конкретно как
   отображается окно»). Замер 390×844: окна разной высоты (221–709), вкладки обрезаны и листаются вбок незаметно,
   в «Опыте» прокрутка внутри прокрутки (1423 в 577), подпись предмета в шапке обрезана, текст 12–14 px.
   Общее у всех вариантов: одна прокрутка, вкладки «Картотеки» — разделами друг под другом, подписи предмета нет,
   текст крупнее. Варианты подачи (класс на body, ставит офис): pw-sheet — шторка одной высоты, смахнуть вниз —
   закрыть; pw-page — страница на весь экран; pw-flip — страница + «‹ предыдущий / следующий ›» внизу и смахивание вбок.
   Выбор владельца 15.10 — pw-flip («Давай 3, листание»); шторка и страница остались для сравнения (?all).
   window.W3P = { apply(panel, o) }; o = { mode, order: [id…], title(id), open(id, dir), close() } */
(function () {
  'use strict';

  function toArr(nl) { return Array.prototype.slice.call(nl); }

  /* «Картотека» (список + часть) → все части подряд, через разделитель. Заголовок у части свой (название места,
     продукта, группы навыков) — из вкладки его не берём, иначе он повторится. */
  function stack(panel) {
    toArr(panel.querySelectorAll('.w3')).forEach(function (root) {
      if (root.classList.contains('is-stacked')) return;
      var tpls = toArr(root.querySelectorAll('template.w3-tpl'));
      if (!tpls.length) return;
      var box = document.createElement('div');
      box.className = 'w3p-stack';
      tpls.forEach(function (tpl) {
        var sec = document.createElement('section');
        sec.className = 'w3p-item';
        sec.appendChild(document.importNode(tpl.content, true));
        box.appendChild(sec);
      });
      root.appendChild(box);
      root.classList.add('is-stacked');
    });
  }

  /* Шторка: потянуть за шапку вниз — закрыть (порог 90 px или быстрый рывок). */
  function sheetDrag(panel, close) {
    if (panel._w3pDrag) return;
    panel._w3pDrag = true;
    var y0 = null, t0 = 0, dy = 0;
    panel.addEventListener('touchstart', function (e) {
      if (!document.body.classList.contains('pw-sheet')) return;
      var r = panel.getBoundingClientRect(), y = e.touches[0].clientY;
      if (y - r.top > 56 || e.target.closest('.win__close')) return;   // тянут только за шапку
      y0 = y; t0 = Date.now(); dy = 0; panel.style.transition = 'none';
    }, { passive: true });
    panel.addEventListener('touchmove', function (e) {
      if (y0 === null) return;
      dy = Math.max(0, e.touches[0].clientY - y0);
      panel.style.transform = 'translateY(' + dy + 'px)';
    }, { passive: true });
    panel.addEventListener('touchend', function () {
      if (y0 === null) return;
      var fast = dy > 30 && Date.now() - t0 < 250;
      y0 = null; panel.style.transition = 'transform .2s cubic-bezier(.22, 1, .36, 1)';
      if (dy > 90 || fast) { panel.style.transform = 'translateY(100%)'; setTimeout(function () { panel.style.transform = ''; panel.style.transition = ''; close(); }, 180); }
      else { panel.style.transform = ''; }
    });
  }

  /* Листание: внизу «‹ предыдущий / следующий ›», смахивание вбок по содержимому — соседний раздел. */
  function flip(panel, o, id) {
    var old = panel.querySelector('.w3p-nav');
    if (old) old.remove();
    if (o.mode !== 'flip') return;
    var i = o.order.indexOf(id), prev = o.order[i - 1], next = o.order[i + 1];
    var nav = document.createElement('nav');
    nav.className = 'w3p-nav'; nav.setAttribute('aria-label', (window.OT || String)('Разделы'));
    nav.innerHTML = (prev ? '<button type="button" class="w3p-go w3p-go--prev" data-go="' + prev + '"><span aria-hidden="true">‹</span> ' + o.title(prev) + '</button>' : '<span></span>') +
      '<span class="w3p-count">' + (i + 1) + ' / ' + o.order.length + '</span>' +
      (next ? '<button type="button" class="w3p-go w3p-go--next" data-go="' + next + '">' + o.title(next) + ' <span aria-hidden="true">›</span></button>' : '<span></span>');
    panel.appendChild(nav);
    nav.addEventListener('click', function (e) {
      var b = e.target.closest('[data-go]');
      if (b) o.open(b.getAttribute('data-go'), b.classList.contains('w3p-go--prev') ? -1 : 1);
    });
    if (panel._w3pSwipe) return;
    panel._w3pSwipe = true;
    var x0 = null, y0 = 0;
    panel.addEventListener('touchstart', function (e) {
      if (!document.body.classList.contains('pw-flip') || e.target.closest('.w3p-nav, .w3-btn, a')) { x0 = null; return; }
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
    }, { passive: true });
    panel.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0;
      x0 = null;
      if (Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx) * 0.6) return;   // вбок, а не листание текста
      var go = panel.querySelector(dx < 0 ? '.w3p-go--next' : '.w3p-go--prev');
      if (go) go.click();
    });
  }

  function apply(panel, o) {
    if (!panel) return;
    stack(panel);
    var id = o.id;
    flip(panel, o, id);
    if (!panel.querySelector('.w3p-grab')) {   // ручка шторки (видна только в варианте «шторка»)
      var g = document.createElement('span'); g.className = 'w3p-grab'; g.setAttribute('aria-hidden', 'true'); panel.appendChild(g);
    }
    if (o.mode === 'sheet') sheetDrag(panel, o.close);
    var body = panel.querySelector('.win__body');
    if (body && o.dir) {   // пришли листанием — содержимое въезжает с той стороны, куда листали
      body.classList.remove('w3p-in-l', 'w3p-in-r'); void body.offsetWidth;
      body.classList.add(o.dir > 0 ? 'w3p-in-r' : 'w3p-in-l');
    }
  }

  window.W3P = { apply: apply, stack: stack };
})();
