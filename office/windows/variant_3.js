/* Окна разделов офиса — вариант 3 «Картотека». Дизайнер (консультация), 2026-10-14.
   window.WIN_V3 = { render: { <раздел>(R, t, esc) → HTML для #winBody }, init(panel) }.
   Разделы из нескольких частей (опыт, продукты, навыки, «обо мне») — список слева, выбранное справа.
   Клавиши: на списке ↑ ↓ Home End; где угодно в окне ← → — соседняя часть; PageUp/PageDown листают правую часть.
   Высота окна не прыгает при смене части: init меряет все части и ставит правой стороне высоту самой высокой
   (в пределах окна). Части лежат в <template> — в скрытом нет кнопок и ссылок для ловушки Tab страницы.
   Обычный JS (ES5), без сборки. Тексты интерфейса — по-русски. */
(function () {
  'use strict';

  var SVG_OUT = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="M7 3H3v10h10V9M9.5 3H13v3.5M13 3L7.5 8.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" stroke-linejoin="miter"/></svg>';

  function list(x) { return x == null ? [] : [].concat(x); }
  function toArr(nl) { return Array.prototype.slice.call(nl); }
  function closest(el, sel) { return el && el.closest ? el.closest(sel) : null; }
  function plural(n, one, few, many) {
    var a = n % 10, b = n % 100;
    if (a === 1 && b !== 11) return one;
    if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
    return many;
  }

  /* Пункт опыта: результат (`bold`) — полужирным внутри текста (решение владельца, 5.95–5.96). */
  function bullet(b, t, esc) {
    var html = esc(t(b && b.text != null ? b.text : b)), hit = false;
    if (b && b.bold) {
      var eb = esc(t(b.bold)), i = html.indexOf(eb);
      if (eb && i >= 0) { html = html.slice(0, i) + '<b>' + eb + '</b>' + html.slice(i + eb.length); hit = true; }
    }
    return { html: html, hit: hit };
  }

  /* Картотека: items = [{ name, sub, html }] — name и sub уже экранированы. */
  function book(label, items) {
    if (!items.length) return '';
    var tabs = items.map(function (it, k) {
      return '<button type="button" role="tab" class="w3-tab" id="w3-tab-' + k + '" data-k="' + k + '" aria-controls="w3-pane" aria-selected="' +
        (k === 0) + '"><span class="w3-tab__name">' + it.name + '</span>' + (it.sub ? '<span class="w3-tab__sub">' + it.sub + '</span>' : '') + '</button>';
    }).join('');
    var tpls = items.map(function (it, k) { return '<template class="w3-tpl" data-k="' + k + '">' + it.html + '</template>'; }).join('');
    return '<div class="w3"><div class="w3-rail" role="tablist" aria-orientation="vertical" aria-label="' + label + '">' + tabs + '</div>' +
      '<div class="w3-pane" id="w3-pane" role="tabpanel" aria-labelledby="w3-tab-0" tabindex="0">' + items[0].html + '</div>' + tpls + '</div>';
  }
  function entries(rows, t, esc) {
    return '<div class="w3-solo w3--narrow"><ul class="w3-entries">' + rows.map(function (r) {
      return '<li><span class="w3-year">' + esc(t(r[0])) + '</span><span><span class="w3-deg">' + esc(t(r[1])) + '</span>' +
        '<span class="w3-place">' + esc(t(r[2])) + '</span></span></li>';
    }).join('') + '</ul></div>';
  }

  var RENDER = {
    about: function (R, t, esc) {
      var p = R.person || {}, c = p.contacts || {}, quote = t(p.pullquote);
      var links = ['telegram', 'email', 'github'].filter(function (k) { return c[k] && c[k].href; }).map(function (k) {
        return '<a class="w3-btn' + (k === 'telegram' ? ' w3-btn--main' : '') + '" href="' + esc(c[k].href) + '"' +
          (k === 'email' ? '' : ' target="_blank" rel="noopener"') + '>' + esc(t(c[k].label)) + '</a>';
      }).join('');
      var facts = [['Город', t(p.city)], ['Занятость', t(p.employment)], ['Формат', t(p.schedule)], ['Переезд', t(p.relocation)],
        ['Специализации', list(t(p.specializations)).join(', ')]]   // массив — через запятую с пробелом
        .filter(function (f) { return f[1]; })
        .map(function (f) { return '<dt>' + f[0] + '</dt><dd>' + esc(f[1]) + '</dd>'; }).join('');
      return book('Обо мне', [
        { name: 'Коротко', sub: '', html: '<h3 class="w3-who">' + esc(t(p.name)) + '</h3>' +
          '<p class="w3-meta">' + esc(t(p.role).replace(/\n/g, ' ')) + '</p>' +
          '<p class="w3-lede">' + esc(t(p.lede)) + '</p><div class="w3-btns">' + links + '</div>' },
        { name: 'Подробнее', sub: '', html: '<p class="w3-text">' + esc(t(p.about)) + '</p>' +
          (quote ? '<blockquote class="w3-quote">' + esc(quote) + '</blockquote>' : '') },
        { name: 'Условия работы', sub: '', html: '<dl class="w3-facts">' + facts + '</dl>' }
      ]);
    },

    metrics: function (R, t, esc) {
      return '<div class="w3-solo w3--narrow"><ul class="w3-screen">' + list(R.metrics).map(function (q) {
        // минус U+2212 — тире U+2013 (Разработчик 15.10): в Press Start 2P минуса нет, запасной шрифт рисовал его
        // тонкой чертой ниже середины цифр — владелец: «тире как тире, а не нижнее подчёркивание»
        return '<li><span class="w3-num">' + esc(((q.prefix || '') + q.value).replace(/−/g, '–')) + (q.suffix ? '<small>' + esc(q.suffix) + '</small>' : '') +
          '</span><span class="w3-cap">' + esc(t(q.caption)) + '</span></li>';
      }).join('') + '</ul></div>';
    },

    experience: function (R, t, esc) {
      return book('Места работы', list(R.experience).map(function (e) {
        var name = esc(t(e.company)), when = esc(t(e.period));
        return { name: name, sub: when, html:
          '<header class="w3-head"><h3 class="w3-name">' + name + '</h3>' +
          '<p class="w3-meta">' + esc(t(e.role)) + (e.parallel ? '<span class="w3-tag">параллельно</span>' : '') + '</p>' +
          '<p class="w3-when">' + when + '</p></header>' +
          '<ul class="w3-points">' + list(e.bullets).map(function (b) {
            var x = bullet(b, t, esc);
            return '<li' + (x.hit ? ' class="has-result"' : '') + '>' + x.html + '</li>';
          }).join('') + '</ul>' };
      }));
    },

    products: function (R, t, esc) {
      return book('Продукты', list(R.projects).map(function (p) {
        var name = esc(t(p.name)), tag = esc(t(p.tagline));
        return { name: name, sub: tag, html:
          '<header class="w3-head"><h3 class="w3-name">' + name + '</h3><p class="w3-meta">' + tag + '</p></header>' +
          '<p class="w3-text">' + esc(t(p.description)) + '</p>' +
          '<ul class="w3-chips" aria-label="Стек">' + list(p.stack).map(function (s) { return '<li>' + esc(t(s)) + '</li>'; }).join('') + '</ul>' +
          (p.link ? '<a class="w3-btn" href="' + esc(p.link) + '" target="_blank" rel="noopener">' + SVG_OUT +
            '<span>' + esc(p.repo || p.link) + '</span></a>' : '') };
      }));
    },

    skills: function (R, t, esc) {
      return book('Группы навыков', list(R.skillGroups).map(function (g) {
        var name = esc(t(g.title)), n = list(g.skills).length;
        return { name: name, sub: n + ' ' + plural(n, 'навык', 'навыка', 'навыков'), html:
          '<header class="w3-head"><h3 class="w3-name">' + name + '</h3></header>' +
          '<ul class="w3-chips w3-chips--lg">' + list(g.skills).map(function (s) { return '<li>' + esc(t(s.name)) + '</li>'; }).join('') + '</ul>' };
      }));
    },

    education: function (R, t, esc) {
      return entries(list(R.education).map(function (e) { return [e.year, e.degree, e.place]; }), t, esc);
    },
    courses: function (R, t, esc) {
      return entries(list(R.courses).map(function (e) { return [e.year, e.name, e.place]; }), t, esc);
    },
    languages: function (R, t, esc) {
      return '<div class="w3-solo w3--narrow"><ul class="w3-entries w3-entries--lang">' + list(R.languages).map(function (l) {
        return '<li><span class="w3-lang">' + esc(t(l.name)) + '</span><span class="w3-level">' + esc(t(l.level)) + '</span></li>';
      }).join('') + '</ul></div>';
    }
  };

  /* ---------- Поведение ---------- */
  function paint(pane, tpl) {
    pane.innerHTML = '';
    if (tpl && tpl.content) pane.appendChild(document.importNode(tpl.content, true));
  }

  function select(root, k, focusTab) {
    var tabs = toArr(root.querySelectorAll('.w3-tab')), pane = root.querySelector('.w3-pane');
    if (!tabs.length || !pane) return;
    k = Math.max(0, Math.min(tabs.length - 1, k));
    if (k !== (root._k || 0)) {
      tabs.forEach(function (tb, i) { tb.setAttribute('aria-selected', String(i === k)); });
      paint(pane, root.querySelector('template.w3-tpl[data-k="' + k + '"]'));
      pane.setAttribute('aria-labelledby', tabs[k].id);
      pane.scrollTop = 0;
      pane.classList.remove('is-in');
      void pane.offsetWidth;
      pane.classList.add('is-in');
      root._k = k;
    }
    if (focusTab) tabs[k].focus();
    // на телефоне список — строкой: выбранная вкладка не уходит за край
    var rail = root.querySelector('.w3-rail'), tb = tabs[k];
    if (rail && rail.scrollWidth > rail.clientWidth + 1) {
      var x = tb.offsetLeft - rail.offsetLeft, w = tb.offsetWidth;
      if (x < rail.scrollLeft) rail.scrollLeft = Math.max(0, x - 8);
      else if (x + w > rail.scrollLeft + rail.clientWidth) rail.scrollLeft = x + w - rail.clientWidth + 8;
    }
  }

  /* Правой стороне — высота самой высокой части, но не выше окна: окно не прыгает при смене части. */
  function fit(root, panel) {
    var pane = root.querySelector('.w3-pane'), tpls = toArr(root.querySelectorAll('template.w3-tpl'));
    if (!pane || tpls.length < 2 || root.offsetParent === null) return;
    var k = root._k || 0, keep = pane.scrollTop;
    pane.style.minHeight = '';
    panel.classList.add('w3-measure');
    var avail = pane.clientHeight;
    panel.classList.remove('w3-measure');
    var max = 0;
    tpls.forEach(function (tpl) { paint(pane, tpl); max = Math.max(max, pane.scrollHeight); });
    paint(pane, tpls[k]);
    pane.scrollTop = keep;
    if (max && avail) pane.style.minHeight = Math.min(max, avail) + 'px';
  }

  function keys() {
    if (window.__w3Keys) return;
    window.__w3Keys = true;
    document.addEventListener('keydown', function (e) {
      if (!document.body.classList.contains('win-v3') || e.altKey || e.ctrlKey || e.metaKey) return;
      var tg = e.target;
      if (tg && (tg.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName))) return;
      var root = document.querySelector('.w3');
      if (!root || root.offsetParent === null) return;
      var key = e.key, onTab = !!closest(tg, '.w3-tab'), k = root._k || 0, n = root.querySelectorAll('.w3-tab').length, to = null;
      if (key === 'PageDown' || key === 'PageUp') {
        var pane = root.querySelector('.w3-pane');
        if (pane && pane.scrollHeight > pane.clientHeight) {
          e.preventDefault();
          pane.scrollTop += (key === 'PageDown' ? 1 : -1) * Math.round(pane.clientHeight * 0.85);
        }
        return;
      }
      if (e.shiftKey) return;
      if (key === 'ArrowRight' || (onTab && key === 'ArrowDown')) to = k + 1;
      else if (key === 'ArrowLeft' || (onTab && key === 'ArrowUp')) to = k - 1;
      else if (onTab && key === 'Home') to = 0;
      else if (onTab && key === 'End') to = n - 1;
      if (to === null) return;
      e.preventDefault();
      select(root, to, onTab);
    });
  }

  function watch(panel) {
    if (panel._w3ro || typeof ResizeObserver === 'undefined' || !panel.parentNode) return;
    var host = panel.parentNode, last = host.clientWidth + 'x' + host.clientHeight, timer = 0;
    panel._w3ro = new ResizeObserver(function () {
      var key = host.clientWidth + 'x' + host.clientHeight;
      if (key === last) return;
      last = key;
      clearTimeout(timer);
      timer = setTimeout(function () {
        var root = panel.querySelector('.w3');
        if (root) fit(root, panel);
      }, 120);
    });
    panel._w3ro.observe(host);
  }

  function init(panel) {
    if (!panel) return;
    var body = panel.querySelector('.win__body');
    if (body) body.scrollTop = 0;
    keys();
    var root = panel.querySelector('.w3');
    if (!root) return;
    root._k = 0;
    if (!root._w3) {
      root._w3 = true;
      root.addEventListener('click', function (e) {
        var tab = closest(e.target, '.w3-tab');
        if (tab && root.contains(tab)) select(root, +tab.getAttribute('data-k'), false);
      });
    }
    fit(root, panel);
    watch(panel);
    // Первый показ: шрифты сайта могли ещё грузиться — высоту мерили запасным шрифтом.
    if (document.fonts && document.fonts.status !== 'loaded' && document.fonts.ready) {
      document.fonts.ready.then(function () { if (panel.querySelector('.w3') === root) fit(root, panel); });
    }
  }

  window.WIN_V3 = { render: RENDER, init: init };
})();
