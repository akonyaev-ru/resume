/* Окна разделов офиса — вариант 1 «Карусель». Дизайнер (консультация), 2026-10-14.
   window.WIN_V1 = { render: { <раздел>(R, t, esc) → HTML для #winBody }, init(panel) }.
   init вызывается после вставки HTML: делит длинные места работы на страницы по высоте окна,
   строит точки, вешает стрелки, клавиши ← → и свайп. Обычный JS (ES5), без сборки.
   Тексты интерфейса — по-русски; английские подписи — когда дойдёт до EN. */
(function () {
  'use strict';

  var SVG_PREV = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var SVG_NEXT = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var SVG_OUT = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="M7 3H3v10h10V9M9.5 3H13v3.5M13 3L7.5 8.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function list(x) { return x == null ? [] : [].concat(x); }
  function toArr(nl) { return Array.prototype.slice.call(nl); }
  function attr(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  /* Пункт опыта: измеримый результат (`bold`) — полужирным внутри текста (решение владельца, 5.95–5.96). */
  function bullet(b, t, esc) {
    var html = esc(t(b && b.text != null ? b.text : b)), hit = false;
    if (b && b.bold) {
      var eb = esc(t(b.bold)), i = html.indexOf(eb);
      if (eb && i >= 0) { html = html.slice(0, i) + '<b>' + eb + '</b>' + html.slice(i + eb.length); hit = true; }
    }
    return { html: html, hit: hit };
  }

  /* label и name приходят уже экранированными. */
  function slide(label, group, inner, split) {
    return '<section class="w1__slide" data-group="' + group + '" data-label="' + label + '"' + (split ? ' data-split=""' : '') + '>' +
      '<div class="w1__in">' + inner + '</div></section>';
  }
  function carousel(name, slides, mod) {
    return '<div class="w1' + (mod ? ' ' + mod : '') + '" role="region" aria-roledescription="карусель" aria-label="' + name + '">' +
      '<div class="w1__view"><div class="w1__track">' + slides.join('') + '</div></div>' +
      '<div class="w1__nav"><div class="w1__dots" role="group" aria-label="Карточки"></div><div class="w1__arrows">' +
      '<button type="button" class="w1__btn" data-step="-1" aria-label="Предыдущая карточка">' + SVG_PREV + '</button>' +
      '<button type="button" class="w1__btn" data-step="1" aria-label="Следующая карточка">' + SVG_NEXT + '</button>' +
      '</div></div><p class="w1__status" aria-live="polite"></p></div>';
  }
  function entries(name, rows, t, esc) {
    var items = rows.map(function (r) {
      return '<li><span class="w1-year">' + esc(t(r[0])) + '</span><span><span class="w1-deg">' + esc(t(r[1])) + '</span>' +
        '<span class="w1-place">' + esc(t(r[2])) + '</span></span></li>';
    }).join('');
    return carousel(name, [slide(name, 0, '<ul class="w1-entries">' + items + '</ul>')], 'w1--narrow');
  }

  var RENDER = {
    about: function (R, t, esc) {
      var p = R.person || {}, c = p.contacts || {};
      var links = ['telegram', 'email', 'github'].filter(function (k) { return c[k] && c[k].href; }).map(function (k) {
        return '<a class="w1-contact' + (k === 'telegram' ? ' w1-contact--main' : '') + '" href="' + esc(c[k].href) + '"' +
          (k === 'email' ? '' : ' target="_blank" rel="noopener"') + '>' + esc(t(c[k].label)) + '</a>';
      }).join('');
      var facts = [['Город', t(p.city)], ['Занятость', t(p.employment)], ['Формат', t(p.schedule)], ['Переезд', t(p.relocation)],
        ['Специализации', list(t(p.specializations)).join(', ')]]   // массив — через запятую с пробелом
        .filter(function (f) { return f[1]; })
        .map(function (f) { return '<dt>' + f[0] + '</dt><dd>' + esc(f[1]) + '</dd>'; }).join('');
      var quote = t(p.pullquote);
      return carousel('Обо мне', [
        slide('Коротко', 0, '<h3 class="w1-who">' + esc(t(p.name)) + '</h3>' +
          '<p class="w1-role">' + esc(t(p.role).replace(/\n/g, ' ')) + '</p>' +
          '<p class="w1-lede">' + esc(t(p.lede)) + '</p><div class="w1-contacts">' + links + '</div>'),
        slide('Подробнее', 1, '<p class="w1__text">' + esc(t(p.about)) + '</p>' +
          (quote ? '<blockquote class="w1-quote">' + esc(quote) + '</blockquote>' : '')),
        slide('Условия работы', 2, '<dl class="w1-facts">' + facts + '</dl>')
      ]);
    },

    metrics: function (R, t, esc) {
      var items = list(R.metrics).map(function (q) {
        return '<li><span class="w1-num">' + esc((q.prefix || '') + q.value) + (q.suffix ? '<small>' + esc(q.suffix) + '</small>' : '') +
          '</span><span class="w1-cap">' + esc(t(q.caption)) + '</span></li>';
      }).join('');
      return carousel('Показатели', [slide('Показатели', 0, '<ul class="w1-metrics">' + items + '</ul>')], 'w1--narrow');
    },

    /* Карточка — место работы. Не помещается по высоте — делится на страницы «1/2, 2/2» (init). */
    experience: function (R, t, esc) {
      return carousel('Опыт работы', list(R.experience).map(function (e, g) {
        var items = list(e.bullets).map(function (b) {
          var x = bullet(b, t, esc);
          return '<li' + (x.hit ? ' class="has-result"' : '') + '>' + x.html + '</li>';
        }).join('');
        var name = esc(t(e.company));
        return slide(name, g,
          '<header class="w1__head"><h3 class="w1__name">' + name + '<span class="w1__part" hidden></span></h3>' +
          '<p class="w1__when">' + esc(t(e.period)) + '</p>' +
          '<p class="w1__role">' + esc(t(e.role)) + (e.parallel ? '<span class="w1__tag">параллельно</span>' : '') + '</p></header>' +
          '<ul class="w1__list">' + items + '</ul>', true);
      }));
    },

    products: function (R, t, esc) {
      return carousel('Собственные продукты', list(R.projects).map(function (p, g) {
        var name = esc(t(p.name));
        return slide(name, g,
          '<header class="w1__head"><h3 class="w1__name">' + name + '</h3><p class="w1__role">' + esc(t(p.tagline)) + '</p></header>' +
          '<p class="w1__text">' + esc(t(p.description)) + '</p>' +
          '<ul class="w1-chips" aria-label="Стек">' + list(p.stack).map(function (s) { return '<li>' + esc(t(s)) + '</li>'; }).join('') + '</ul>' +
          (p.link ? '<a class="w1-link" href="' + esc(p.link) + '" target="_blank" rel="noopener">' + SVG_OUT +
            '<span>' + esc(p.repo || p.link) + '</span></a>' : ''));
      }));
    },

    skills: function (R, t, esc) {
      return carousel('Навыки', list(R.skillGroups).map(function (gr, g) {
        var name = esc(t(gr.title));
        return slide(name, g, '<header class="w1__head"><h3 class="w1__name">' + name + '</h3></header>' +
          '<ul class="w1-chips w1-chips--lg">' + list(gr.skills).map(function (s) { return '<li>' + esc(t(s.name)) + '</li>'; }).join('') + '</ul>');
      }));
    },

    education: function (R, t, esc) {
      return entries('Образование', list(R.education).map(function (e) { return [e.year, e.degree, e.place]; }), t, esc);
    },
    courses: function (R, t, esc) {
      return entries('Курсы', list(R.courses).map(function (e) { return [e.year, e.name, e.place]; }), t, esc);
    },
    languages: function (R, t, esc) {
      var items = list(R.languages).map(function (l) {
        return '<li><span class="w1-lang">' + esc(t(l.name)) + '</span><span class="w1-level">' + esc(t(l.level)) + '</span></li>';
      }).join('');
      return carousel('Языки', [slide('Языки', 0, '<ul class="w1-entries w1-entries--lang">' + items + '</ul>')], 'w1--narrow');
    }
  };

  /* ---------- Поведение ---------- */

  /* Делит карточки с data-split на страницы так, чтобы каждая помещалась в avail px. */
  function paginate(track, avail) {
    toArr(track.querySelectorAll('.w1__slide[data-split]')).forEach(function (s) {
      var tag = s.querySelector('.w1__part');
      if (tag) { tag.textContent = '1/2'; tag.hidden = false; }   // мерить с меткой: она может перенести название
      var ul = s.querySelector('.w1__list');
      if (!ul || s.querySelector('.w1__in').offsetHeight <= avail) { if (tag) tag.hidden = true; return; }
      var items = toArr(ul.children);
      items.forEach(function (li) { ul.removeChild(li); });
      var blank = s.cloneNode(true), cur = s, n = 0, parts = [s];
      items.forEach(function (li) {
        var box = cur.querySelector('.w1__list');
        box.appendChild(li); n++;
        if (n > 1 && cur.querySelector('.w1__in').offsetHeight > avail) {
          box.removeChild(li);
          var nx = blank.cloneNode(true);
          track.insertBefore(nx, cur.nextSibling);
          cur = nx; parts.push(nx); n = 1;
          nx.querySelector('.w1__list').appendChild(li);
        }
      });
      parts.forEach(function (p, k) {
        var tg = p.querySelector('.w1__part');
        if (parts.length > 1) {
          p.setAttribute('data-part', (k + 1) + ' из ' + parts.length);
          if (tg) { tg.textContent = (k + 1) + '/' + parts.length; tg.hidden = false; }
        } else if (tg) tg.hidden = true;
      });
    });
  }

  function go(root, i, instant) {
    var track = root.querySelector('.w1__track'), slides = track ? track.children : [], n = slides.length;
    if (!n) return;
    i = Math.max(0, Math.min(n - 1, i));
    root._i = i;
    if (instant) track.style.transition = 'none';
    track.style.transform = 'translateX(' + (-100 * i) + '%)';
    if (instant) { void track.offsetWidth; track.style.transition = ''; }
    for (var k = 0; k < n; k++) {
      if (k === i) { slides[k].removeAttribute('inert'); slides[k].removeAttribute('aria-hidden'); }
      else { slides[k].setAttribute('inert', ''); slides[k].setAttribute('aria-hidden', 'true'); }
    }
    toArr(root.querySelectorAll('.w1__dot')).forEach(function (d, k) {
      if (k === i) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
    });
    var b = root.querySelectorAll('.w1__btn');
    if (b.length === 2) { b[0].setAttribute('aria-disabled', String(i === 0)); b[1].setAttribute('aria-disabled', String(i === n - 1)); }
    var st = root.querySelector('.w1__status');
    if (st && n > 1 && !instant) st.textContent = slides[i].getAttribute('aria-label') || '';
  }

  function setup(root, panel, group) {
    var track = root.querySelector('.w1__track');
    if (!track) return;
    var split = !!track.querySelector('[data-split]');
    root.classList.toggle('is-multi', split || track.children.length > 1);   // с полосой навигации — для честного замера
    if (split) {
      panel.classList.add('w1-measure');
      var avail = root.querySelector('.w1__view').clientHeight;
      if (avail > 120) paginate(track, avail);
      panel.classList.remove('w1-measure');
    }
    var slides = toArr(track.children), multi = slides.length > 1;
    root.classList.toggle('is-multi', multi);
    if (!multi) {
      // одна карточка: без навигации; скрытые кнопки нельзя оставлять — ловушка Tab берёт последнюю кнопку окна
      var nav = root.querySelector('.w1__nav');
      if (nav) nav.parentNode.removeChild(nav);
      root.removeAttribute('aria-roledescription');
    }
    var dots = root.querySelector('.w1__dots'), h = '', prev = null;
    slides.forEach(function (s, k) {
      var g = s.getAttribute('data-group');
      var name = (s.getAttribute('data-label') || '') + (s.hasAttribute('data-part') ? ', часть ' + s.getAttribute('data-part') : '');
      if (multi) {
        s.setAttribute('role', 'group');
        s.setAttribute('aria-roledescription', 'карточка');
        s.setAttribute('aria-label', name + ' (' + (k + 1) + ' из ' + slides.length + ')');
      }
      h += '<button type="button" class="w1__dot' + (prev !== null && g !== prev ? ' is-gap' : '') + '" data-to="' + k +
        '" aria-label="' + attr(name) + '" title="' + attr(name) + '"><span></span></button>';
      prev = g;
    });
    if (dots) dots.innerHTML = multi ? h : '';
    var start = 0;
    if (group != null) {
      for (var k = 0; k < slides.length; k++) if (slides[k].getAttribute('data-group') === group) { start = k; break; }
    }
    go(root, start, true);
  }

  /* Пересборка с исходной разметки: окно сменило размер или догрузились шрифты. */
  function rebuild(root, panel) {
    if (!root._src || !root.isConnected || root.offsetParent === null) return;
    var cur = root.querySelector('.w1__track') && root.querySelector('.w1__track').children[root._i || 0];
    var g = cur ? cur.getAttribute('data-group') : null;
    root.innerHTML = root._src;
    setup(root, panel, g);
  }

  function bind(root) {
    if (root._w1) return;
    root._w1 = true;
    root.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.w1__btn, .w1__dot') : null;
      if (!b || !root.contains(b)) return;
      if (b.classList.contains('w1__dot')) go(root, +b.getAttribute('data-to'));
      else if (b.getAttribute('aria-disabled') !== 'true') go(root, (root._i || 0) + (+b.getAttribute('data-step')));
    });
    /* Свайп пальцем или пером; вертикальную прокрутку листа отдаёт браузеру (touch-action: pan-y). */
    root.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' || !root.classList.contains('is-multi')) return;
      var view = e.target.closest ? e.target.closest('.w1__view') : null;
      if (!view || !root.contains(view)) return;
      var track = view.querySelector('.w1__track'), x0 = e.clientX, y0 = e.clientY, t0 = Date.now();
      var id = e.pointerId, w = view.clientWidth || 1, dx = 0, mode = 0;
      function move(ev) {
        if (ev.pointerId !== id) return;
        dx = ev.clientX - x0;
        var dy = ev.clientY - y0;
        if (!mode) {
          if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.2) {
            mode = 1; track.style.transition = 'none';
            try { view.setPointerCapture(id); } catch (err) { /* не критично */ }
          } else if (Math.abs(dy) > 10) mode = -1;
        }
        if (mode === 1) {
          var i = root._i || 0, n = track.children.length;
          var edge = (i === 0 && dx > 0) || (i === n - 1 && dx < 0);
          track.style.transform = 'translateX(calc(' + (-100 * i) + '% + ' + Math.round(edge ? dx / 3 : dx) + 'px))';
        }
      }
      function up(ev) {
        if (ev.pointerId !== id) return;
        view.removeEventListener('pointermove', move);
        view.removeEventListener('pointerup', up);
        view.removeEventListener('pointercancel', up);
        if (mode !== 1) return;
        track.style.transition = '';
        var v = Math.abs(dx) / Math.max(1, Date.now() - t0);
        var step = (Math.abs(dx) > w * 0.2 || (Math.abs(dx) > 30 && v > 0.45)) ? (dx < 0 ? 1 : -1) : 0;
        go(root, (root._i || 0) + step);
      }
      view.addEventListener('pointermove', move);
      view.addEventListener('pointerup', up);
      view.addEventListener('pointercancel', up);
    });
  }

  /* Клавиши ← → листают, пока окно открыто. Ставится один раз на страницу. */
  function keys() {
    if (window.__w1Keys) return;
    window.__w1Keys = true;
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (!document.body.classList.contains('win-v1')) return;
      var tg = e.target;
      if (tg && (tg.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName))) return;
      var root = document.querySelector('.w1.is-multi');
      if (!root || root.offsetParent === null) return;
      e.preventDefault();
      go(root, (root._i || 0) + (e.key === 'ArrowRight' ? 1 : -1));
    });
  }

  /* Окно сменило размер (окно браузера, «телефон ↔ компьютер» в демо) — страницы пересчитываются. */
  function watch(panel) {
    if (panel._w1ro || typeof ResizeObserver === 'undefined' || !panel.parentNode) return;
    var host = panel.parentNode, last = host.clientWidth + 'x' + host.clientHeight, timer = 0;
    panel._w1ro = new ResizeObserver(function () {
      var key = host.clientWidth + 'x' + host.clientHeight;
      if (key === last) return;
      last = key;
      clearTimeout(timer);
      timer = setTimeout(function () {
        var root = panel.querySelector('.w1');
        if (root) rebuild(root, panel);
      }, 120);
    });
    panel._w1ro.observe(host);
  }

  function init(panel) {
    if (!panel) return;
    var body = panel.querySelector('.win__body');
    if (body) body.scrollTop = 0;
    var root = panel.querySelector('.w1');
    if (!root) return;
    root._src = root.innerHTML;
    bind(root);
    setup(root, panel, null);
    watch(panel);
    keys();
    // Первый показ: шрифты сайта могли ещё грузиться — страницы мерились запасным шрифтом.
    if (document.fonts && document.fonts.status !== 'loaded' && document.fonts.ready) {
      document.fonts.ready.then(function () { if (panel.querySelector('.w1') === root) rebuild(root, panel); });
    }
  }

  window.WIN_V1 = { render: RENDER, init: init };
})();
