/* Окна разделов офиса — вариант 2 «Блоки». Дизайнер (консультация), 2026-10-14.
   window.WIN_V2 = { render: { <раздел>(R, t, esc) → HTML для #winBody }, init(panel) }.
   «Опыт»: обзор — блок на место работы с его измеримыми результатами (фразы `bold` из данных, дословно);
   нажатие на блок открывает все пункты этого места внутри окна, «Все места» или Esc — назад.
   Подробности лежат в <template> и вставляются только на время показа: в скрытых частях окна
   нет кнопок и ссылок, ловушка Tab страницы видит только видимое. Обычный JS (ES5), без сборки. */
(function () {
  'use strict';

  var SVG_MORE = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var SVG_BACK = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var SVG_OUT = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="M7 3H3v10h10V9M9.5 3H13v3.5M13 3L7.5 8.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function list(x) { return x == null ? [] : [].concat(x); }
  function closest(el, sel) { return el && el.closest ? el.closest(sel) : null; }
  function plural(n, one, few, many) {
    var a = n % 10, b = n % 100;
    if (a === 1 && b !== 11) return one;
    if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
    return many;
  }

  /* Пункт опыта: результат (`bold`) — полужирным внутри текста (решение владельца, 5.95–5.96). */
  function bullet(b, t, esc) {
    var html = esc(t(b && b.text != null ? b.text : b)), hit = false, eb = '';
    if (b && b.bold) {
      eb = esc(t(b.bold));
      var i = html.indexOf(eb);
      if (eb && i >= 0) { html = html.slice(0, i) + '<b>' + eb + '</b>' + html.slice(i + eb.length); hit = true; }
    }
    return { html: html, hit: hit, bold: eb };
  }
  function contactLinks(c, t, esc) {
    return ['telegram', 'email', 'github'].filter(function (k) { return c[k] && c[k].href; }).map(function (k) {
      return '<a class="w2-contact' + (k === 'telegram' ? ' w2-contact--main' : '') + '" href="' + esc(c[k].href) + '"' +
        (k === 'email' ? '' : ' target="_blank" rel="noopener"') + '>' + esc(t(c[k].label)) + '</a>';
    }).join('');
  }
  function pair(rows, t, esc) {
    return '<ul class="w2 w2--narrow w2-pair">' + rows.map(function (r) {
      return '<li class="w2-tile"><span class="w2-year">' + esc(t(r[0])) + '</span><span class="w2-deg">' + esc(t(r[1])) + '</span>' +
        '<span class="w2-place">' + esc(t(r[2])) + '</span></li>';
    }).join('') + '</ul>';
  }

  var RENDER = {
    /* Разработчик 14.10: рассказ (~1100 знаков) с визиткой, условиями и цитатой не помещался в окно на экране владельца
       (591 при 483 — по замеру, любой раскладкой); в обзоре — первая фраза рассказа, весь он — по «Читать полностью»,
       тем же механизмом, что подробности места работы (назад — кнопкой или Esc). */
    about: function (R, t, esc) {
      var p = R.person || {}, story = String(t(p.about) || ''), m = story.match(/^[^.!?]+[.!?](?=\s|$)/);
      var lead = m ? m[0] : story, more = lead.length < story.length;
      var html = RENDER.aboutGrid(R, t, esc, lead, more);
      if (!more) return html;
      return '<div class="w2 w2-exp w2-aboutx"><div class="w2-over">' + html + '</div>' +
        '<div class="w2-detail" role="region" aria-label="О себе подробно" hidden></div>' +
        '<template class="w2-tpl" data-k="story"><div class="w2-detail__bar"><button type="button" class="w2-back">' + SVG_BACK + 'Назад</button>' +
        '<div class="w2-detail__id"><h3 class="w2-detail__name">' + esc(t(p.name)) + '</h3>' +
        '<p class="w2-detail__meta">' + esc(t(p.role).replace(/\n/g, ' ')) + '</p></div></div>' +
        '<p class="w2-story w2-story--full">' + esc(story) + '</p></template></div>';
    },
    aboutGrid: function (R, t, esc, lead, more) {
      var p = R.person || {}, c = p.contacts || {}, quote = t(p.pullquote);
      var facts = [['Город', t(p.city)], ['Занятость', t(p.employment)], ['Формат', t(p.schedule)], ['Переезд', t(p.relocation)],
        ['Специализации', list(t(p.specializations)).join(', ')]]   // массив — через запятую с пробелом
        .filter(function (f) { return f[1]; })
        .map(function (f) { return '<dt>' + f[0] + '</dt><dd>' + esc(f[1]) + '</dd>'; }).join('');
      return '<div class="w2 w2-about">' +
        '<section class="w2-tile"><h3 class="w2-who">' + esc(t(p.name)) + '</h3>' +
          '<p class="w2-role">' + esc(t(p.role).replace(/\n/g, ' ')) + '</p>' +
          '<p class="w2-lede">' + esc(t(p.lede)) + '</p><div class="w2-contacts">' + contactLinks(c, t, esc) + '</div></section>' +
        '<section class="w2-tile" aria-label="Условия работы"><dl class="w2-facts">' + facts + '</dl></section>' +
        (more ? '<section class="w2-tile w2-job w2-teaser" data-k="story"><p class="w2-story">' + esc(lead) + '</p>' +
          '<button type="button" class="w2-more" data-k="story" aria-label="Читать полностью: о себе">Читать полностью' + SVG_MORE + '</button></section>'
          : '<section class="w2-tile"><p class="w2-story">' + esc(lead) + '</p></section>') +
        (quote ? '<section class="w2-tile w2-quote"><blockquote>' + esc(quote) + '</blockquote></section>' : '') +
        '</div>';
    },

    metrics: function (R, t, esc) {
      return '<ul class="w2 w2--mid w2-metrics">' + list(R.metrics).map(function (q) {
        return '<li class="w2-tile"><span class="w2-num">' + esc((q.prefix || '') + q.value) +
          (q.suffix ? '<small>' + esc(q.suffix) + '</small>' : '') + '</span><span class="w2-cap">' + esc(t(q.caption)) + '</span></li>';
      }).join('') + '</ul>';
    },

    experience: function (R, t, esc) {
      var cards = '', tpls = '';
      list(R.experience).forEach(function (e, k) {
        var pts = list(e.bullets).map(function (b) { return bullet(b, t, esc); });
        var n = pts.length, name = esc(t(e.company)), role = esc(t(e.role)), when = esc(t(e.period));
        var tag = e.parallel ? '<span class="w2-tag">параллельно</span>' : '';
        var res = pts.filter(function (x) { return x.hit; }).map(function (x) { return '<li>' + x.bold + '</li>'; }).join('');
        var shown = res ? '<ul class="w2-res" aria-label="Результаты">' + res + '</ul>' : (n ? '<p class="w2-gist">' + pts[0].html + '</p>' : '');
        var whole = !res && n <= 1;   // блок и так показывает всё — подробностей не нужно
        var count = n + ' ' + plural(n, 'пункт', 'пункта', 'пунктов');
        cards += '<article class="w2-tile w2-job' + (whole ? ' w2-job--static' : '') + '" data-k="' + k + '">' +
          '<div class="w2-job__top"><h3 class="w2-h">' + name + '</h3>' +
          (whole ? '' : '<button type="button" class="w2-more" data-k="' + k + '" aria-label="Подробнее: ' + name + ', ' + count + '">' +
            count + SVG_MORE + '</button>') + '</div>' +
          '<p class="w2-job__role">' + role + tag + '</p><p class="w2-job__when">' + when + '</p>' + shown + '</article>';
        if (whole) return;
        var chars = 0;
        list(e.bullets).forEach(function (b) { chars += String(t(b && b.text != null ? b.text : b)).length; });
        tpls += '<template class="w2-tpl" data-k="' + k + '">' +
          '<div class="w2-detail__bar"><button type="button" class="w2-back">' + SVG_BACK + 'Все места</button>' +
          '<div class="w2-detail__id"><h3 class="w2-detail__name">' + name + '</h3>' +
          '<p class="w2-detail__meta">' + role + ' · ' + when + tag + '</p></div></div>' +
          '<ul class="w2-points' + (chars < 800 ? ' w2-points--one' : '') + '">' + pts.map(function (x) {
            return '<li' + (x.hit ? ' class="has-result"' : '') + '>' + x.html + '</li>';
          }).join('') + '</ul></template>';
      });
      return '<div class="w2 w2-exp"><div class="w2-over"><div class="w2-jobs">' + cards + '</div></div>' +
        '<div class="w2-detail" role="region" aria-label="Подробности места работы" hidden></div>' + tpls + '</div>';
    },

    products: function (R, t, esc) {
      return '<div class="w2 w2-prods">' + list(R.projects).map(function (p) {
        return '<article class="w2-tile w2-prod"><h3 class="w2-h">' + esc(t(p.name)) + '</h3>' +
          '<p class="w2-prod__tag">' + esc(t(p.tagline)) + '</p><p class="w2-prod__text">' + esc(t(p.description)) + '</p>' +
          '<ul class="w2-chips" aria-label="Стек">' + list(p.stack).map(function (s) { return '<li>' + esc(t(s)) + '</li>'; }).join('') + '</ul>' +
          (p.link ? '<a class="w2-link" href="' + esc(p.link) + '" target="_blank" rel="noopener">' + SVG_OUT +
            '<span>' + esc(p.repo || p.link) + '</span></a>' : '') + '</article>';
      }).join('') + '</div>';
    },

    skills: function (R, t, esc) {
      return '<div class="w2 w2-skills">' + list(R.skillGroups).map(function (g) {
        return '<section class="w2-tile w2-skill"><h3 class="w2-h">' + esc(t(g.title)) + '</h3><ul class="w2-chips">' +
          list(g.skills).map(function (s) { return '<li>' + esc(t(s.name)) + '</li>'; }).join('') + '</ul></section>';
      }).join('') + '</div>';
    },

    education: function (R, t, esc) {
      return pair(list(R.education).map(function (e) { return [e.year, e.degree, e.place]; }), t, esc);
    },
    courses: function (R, t, esc) {
      return pair(list(R.courses).map(function (e) { return [e.year, e.name, e.place]; }), t, esc);
    },
    languages: function (R, t, esc) {
      return '<ul class="w2 w2--narrow w2-pair">' + list(R.languages).map(function (l) {
        return '<li class="w2-tile"><span class="w2-lang">' + esc(t(l.name)) + '</span><span class="w2-level">' + esc(t(l.level)) + '</span></li>';
      }).join('') + '</ul>';
    }
  };

  /* ---------- Поведение «Опыта»: обзор ⇄ подробности ---------- */
  function openDetail(root, k) {
    var tpl = root.querySelector('template.w2-tpl[data-k="' + k + '"]');
    var det = root.querySelector('.w2-detail'), over = root.querySelector('.w2-over');
    if (!tpl || !det || !over || !tpl.content) return;
    det.innerHTML = '';
    det.appendChild(document.importNode(tpl.content, true));
    over.hidden = true;
    det.hidden = false;
    root.classList.add('is-deep');
    root.classList.remove('was-deep');
    root._k = k;
    if (root.parentNode) root.parentNode.scrollTop = 0;
    var back = det.querySelector('.w2-back');
    if (back) back.focus();
  }
  function closeDetail(root) {
    var det = root.querySelector('.w2-detail'), over = root.querySelector('.w2-over');
    if (!det || !over) return;
    det.hidden = true;
    det.innerHTML = '';
    over.hidden = false;
    root.classList.remove('is-deep');
    root.classList.add('was-deep');
    if (root.parentNode) root.parentNode.scrollTop = 0;
    var b = root.querySelector('.w2-more[data-k="' + root._k + '"]');
    if (b) b.focus();
  }

  /* Esc в подробностях — назад к обзору, а не закрытие окна. Ставится один раз; ловит раньше обработчика страницы. */
  function keys() {
    if (window.__w2Keys) return;
    window.__w2Keys = true;
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || !document.body.classList.contains('win-v2')) return;
      var root = document.querySelector('.w2-exp.is-deep');
      if (!root || root.offsetParent === null) return;
      e.preventDefault();
      e.stopPropagation();
      closeDetail(root);
    }, true);
  }

  function init(panel) {
    if (!panel) return;
    var body = panel.querySelector('.win__body');
    if (body) body.scrollTop = 0;
    keys();
    var root = panel.querySelector('.w2-exp');
    if (!root || root._w2) return;
    root._w2 = true;
    root.addEventListener('click', function (e) {
      var tg = e.target;
      if (closest(tg, '.w2-back')) { closeDetail(root); return; }
      var job = closest(tg, '.w2-job');
      if (!job || !root.contains(job) || job.classList.contains('w2-job--static') || closest(tg, 'a')) return;
      // выделяли текст в блоке — не открывать (кнопка «N пунктов» открывает всегда)
      if (!closest(tg, '.w2-more') && window.getSelection && String(window.getSelection())) return;
      openDetail(root, job.getAttribute('data-k'));
    });
  }

  window.WIN_V2 = { render: RENDER, init: init };
})();
