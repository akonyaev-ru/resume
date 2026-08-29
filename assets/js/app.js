/* Сборка страницы из data/resume.js. Никаких зависимостей и сборщика. */
(function () {
  'use strict';

  var R = window.RESUME;
  var CFG = window.CONFIG || {};
  var STATS = window.STATS || { repos: {} };
  var LESS_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // Из чего собирается фоновое поле: синтаксис кода вперемешку с юридическими
  // знаками — обе половины профиля разом.
  var GLYPHS = '{}[]()<>/\\|;:=+-*#$%&!?^~01234567§№¶λ';

  // Для заголовков алфавит короче: в наборном Unbounded нет § № ¶ λ, и на их
  // месте подставлялся бы запасной шрифт — буквы бы прыгали по ширине.
  var TITLE_GLYPHS = '{}[]()<>/\\|;:=+-*#$%&!?^~0123456789';

  var LANGS = ['ru', 'en'];
  var LANG = readLang();

  var state = { filter: null, filterLabel: null };
  var observers = [];

  /* --- язык --------------------------------------------------------------- */

  function readLang() {
    var fromUrl = new URLSearchParams(location.search).get('lang');
    if (fromUrl && LANGS.indexOf(fromUrl) !== -1) return fromUrl;

    // У языковой копии страницы язык записан в разметке и весит больше
    // сохранённого выбора: по этому адресу пришли именно за ним.
    var pinned = metaContent('cv:lang');
    if (pinned && LANGS.indexOf(pinned) !== -1) return pinned;

    var saved = null;
    try { saved = localStorage.getItem('cv:lang'); } catch (e) { /* приватный режим */ }
    if (saved && LANGS.indexOf(saved) !== -1) return saved;

    return CFG.defaultLang || 'ru';
  }

  /* Переводимая строка хранится парой { ru, en }; всё остальное — даты, ссылки,
     теги — общее и возвращается как есть. */
  function t(value) {
    if (value && typeof value === 'object' && !Array.isArray(value) &&
      (Object.prototype.hasOwnProperty.call(value, 'ru') ||
        Object.prototype.hasOwnProperty.call(value, 'en'))) {
      return value[LANG];
    }
    return value;
  }

  function u(key) {
    return t(R.ui[key]);
  }

  function metaContent(name) {
    var node = document.querySelector('meta[name="' + name + '"]');
    return node && node.getAttribute('content');
  }

  /* Языковых копий страницы две — русская `index.html` и английская `en.html`,
     у каждой свои мета-теги. Ссылки друг на друга лежат в
     <link rel="alternate">, оттуда их и берёт переключатель. */
  function langPage(lang) {
    // Одиночный файл (dist/resume.html) уходит по почте и открывается с диска:
    // уводить его на сайт нельзя, язык там переключается на месте.
    if (location.protocol !== 'http:' && location.protocol !== 'https:') return null;

    var link = document.querySelector('link[rel="alternate"][hreflang="' + lang + '"]');
    if (!link) return null;

    try {
      var url = new URL(link.getAttribute('href'), location.href);
      return url.origin === location.origin ? url.href : null;
    } catch (e) { return null; }
  }

  function setLang(lang) {
    if (lang === LANG || LANGS.indexOf(lang) === -1) return;

    try { localStorage.setItem('cv:lang', lang); } catch (e) { /* приватный режим */ }

    var page = langPage(lang);
    if (page) { location.href = page; return; }

    LANG = lang;
    try {
      var url = new URL(location.href);
      url.searchParams.set('lang', lang);
      history.replaceState(null, '', url);
    } catch (e) { /* страница открыта во встроенном окне без своей истории */ }

    document.documentElement.lang = lang;
    document.title = u('docTitle');
    state.filter = null;
    state.filterLabel = null;
    document.body.classList.remove('is-filtering');
    render();
  }

  /* --- мелкие помощники -------------------------------------------------- */

  function el(tag, props, kids) {
    var node = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (key) {
        var val = props[key];
        if (val === null || val === undefined || val === false) return;
        if (key === 'class') node.className = val;
        else if (key === 'text') node.textContent = val;
        else if (key.slice(0, 2) === 'on') node.addEventListener(key.slice(2), val);
        else node.setAttribute(key, val === true ? '' : val);
      });
    }
    (kids || []).forEach(function (kid) {
      if (kid) node.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
    });
    return node;
  }

  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  function randomFrom(set) {
    return set.charAt(Math.floor(Math.random() * set.length));
  }

  function randomGlyph() {
    return randomFrom(GLYPHS);
  }

  function section(id, title, kids) {
    return el('section', { class: 'section', id: id }, [
      el('div', { class: 'wrap' }, [
        el('div', { class: 'section__head' }, [
          el('h2', { class: 'section__title', text: title }),
        ]),
      ].concat(kids)),
    ]);
  }

  /* --- шапка ------------------------------------------------------------- */

  var NAV = ['results', 'experience', 'projects', 'skills', 'education', 'contact'];

  function buildTopbar() {
    return el('header', { class: 'topbar' }, [
      el('div', { class: 'wrap topbar__inner' }, [
        el('span', { class: 'topbar__name', text: t(R.person.name) }),
        el('nav', { class: 'topbar__nav', 'aria-label': u('nav').experience },
          NAV.map(function (id) {
            return el('a', { href: '#' + id, text: t(R.ui.nav[id]), 'data-nav': id });
          })),
        el('div', { class: 'topbar__tools' }, [buildLangSwitch()]),
      ]),
    ]);
  }

  /* Ползунок языка: подложка уезжает под выбранную половину. */
  function buildLangSwitch() {
    return el('div', {
      class: 'lang' + (LANG === 'en' ? ' is-en' : ''),
      role: 'group',
      'aria-label': u('langLabel'),
    }, [
      el('span', { class: 'lang__pill', 'aria-hidden': 'true' }),
    ].concat(LANGS.map(function (lang) {
      return el('button', {
        class: 'lang__btn',
        type: 'button',
        'aria-pressed': String(lang === LANG),
        text: lang.toUpperCase(),
        onclick: function () { setLang(lang); },
      });
    })));
  }

  /* --- первый экран ------------------------------------------------------ */

  /* Термины из roleAccent подсвечиваются акцентом прямо в заголовке. */
  function roleNode(text, accents) {
    var host = el('h1', { class: 'hero__role' });
    var rest = text;

    (accents || []).forEach(function (term) {
      var at = rest.indexOf(term);
      if (at === -1) return;
      if (at > 0) host.appendChild(document.createTextNode(rest.slice(0, at)));
      host.appendChild(el('em', { text: term }));
      rest = rest.slice(at + term.length);
    });

    if (rest) host.appendChild(document.createTextNode(rest));
    return host;
  }

  function buildHero() {
    var p = R.person;

    var left = el('div', {}, [
      el('p', { class: 'eyebrow', text: u('eyebrow') + ' ' + t(p.updated) }),
      el('p', { class: 'hero__name', text: t(p.name) }),
      roleNode(t(p.role), t(p.roleAccent)),
      el('p', { class: 'hero__lede', text: t(p.lede) }),
      el('div', { class: 'hero__specs' }, t(p.specializations).map(function (s) {
        return el('span', { class: 'spec', text: s });
      })),
      el('div', { class: 'hero__actions' }, [
        el('a', {
          class: 'btn btn--primary', href: p.contacts.telegram.href,
          target: '_blank', rel: 'noopener', text: t(p.contacts.telegram.label),
        }),
        el('a', {
          class: 'btn btn--ghost', href: p.contacts.github.href,
          target: '_blank', rel: 'noopener', text: 'GitHub',
        }),
      ]),
    ]);

    // Портрет набирается знаками фонового поля на canvas, а сама фотография
    // лежит сверху и проявляется только под курсором.
    var portrait = p.photo ? el('figure', { class: 'portrait' }, [
      el('canvas', { class: 'portrait__glyphs', 'aria-hidden': 'true' }),
      el('img', {
        class: 'portrait__photo', src: p.photo, alt: t(p.name), decoding: 'async',
      }),
    ]) : null;

    return el('section', { class: 'hero' }, [
      el('div', { class: 'wrap hero__grid' }, [left, portrait]),
      buildFacts(),
    ]);
  }

  /* Анкета лентой во всю ширину под первым экраном. Панелью сбоку она делала
     правую колонку вдвое выше левой, и под текстом зияла пустота. */
  function buildFacts() {
    var p = R.person;

    var rows = [
      [u('factCity'), t(p.city) + ' · ' + p.age + ' ' + u('years')],
      [u('factFormat'), t(p.schedule) + ' · ' + t(p.employment)],
      [u('factRelocation'), t(p.relocation)],
      [u('factExperience'), t(p.experienceTotal)],
    ];

    return el('div', { class: 'wrap facts' }, rows.map(function (row) {
      return el('div', { class: 'fact' }, [
        el('span', { class: 'fact__key', text: row[0] }),
        el('span', { class: 'fact__val', text: row[1] }),
      ]);
    }).concat([
      el('div', { class: 'fact' }, [
        el('span', { class: 'fact__key', text: u('factEmail') }),
        el('span', { class: 'fact__val' }, [
          el('a', { href: p.contacts.email.href, text: p.contacts.email.label }),
        ]),
      ]),
    ]));
  }

  /* Тег выпуска показывается без ведущей `v`: рядом со словом «Выпуск» она
     ничего не добавляет. */
  function tagName(tag) {
    return /^v\d/.test(tag) ? tag.slice(1) : tag;
  }

  function humanDate(iso) {
    var date = new Date(iso + 'T00:00:00Z');
    if (isNaN(date.getTime())) return iso;
    try {
      var text = new Intl.DateTimeFormat(LANG === 'en' ? 'en-GB' : 'ru-RU', {
        day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
      }).format(date);
      // Русская локаль приписывает « г.»; на странице даты пишутся без него.
      return text.replace(/\s*г\.$/, '');
    } catch (e) {
      return iso;
    }
  }

  /* --- результаты -------------------------------------------------------- */

  function buildMetrics() {
    var grid = el('div', { class: 'metrics enter' }, R.metrics.map(function (m) {
      return el('div', { class: 'metric' }, [
        el('span', {
          class: 'metric__value',
          'data-value': String(m.value),
          'data-prefix': m.prefix || '',
          'data-suffix': m.suffix || '',
          text: (m.prefix || '') + '0' + (m.suffix || ''),
        }),
        el('span', { class: 'metric__caption', text: t(m.caption) }),
      ]);
    }));

    return section('results', u('resultsTitle'), [
      el('p', { class: 'section__note', text: u('resultsNote') }),
      grid,
    ]);
  }

  /* --- подход ------------------------------------------------------------ */

  function buildApproach() {
    return section('approach', u('approachTitle'), [
      el('div', { class: 'approach enter' }, [
        el('p', { class: 'approach__text', text: t(R.person.about) }),
        el('blockquote', { class: 'pullquote', text: t(R.person.pullquote) }),
      ]),
    ]);
  }

  /* --- опыт -------------------------------------------------------------- */

  function months(iso) {
    var parts = iso.split('-');
    return Number(parts[0]) * 12 + Number(parts[1]) - 1;
  }

  /* Шкала: три места работы отрезками на общей оси от первого месяца до
     сегодняшнего. Пропуски между работами показаны честно — они и есть
     промежутки на шкале. */
  function buildTimeline() {
    var today = new Date();
    var now = today.getFullYear() * 12 + today.getMonth();

    var jobs = R.experience.slice().reverse();
    var from = Math.min.apply(null, jobs.map(function (job) { return months(job.start); }));
    var to = Math.max.apply(null, jobs.map(function (job) {
      return job.end ? months(job.end) : now;
    }));
    var span = Math.max(1, to - from + 1);

    var scale = el('div', { class: 'timeline__scale' });
    for (var year = Math.ceil(from / 12); year * 12 <= to; year += 1) {
      var offset = ((year * 12 - from) / span) * 100;
      scale.appendChild(el('span', {
        class: 'timeline__year',
        style: 'left:' + offset.toFixed(2) + '%',
        text: String(year),
      }));
    }

    var track = el('div', { class: 'timeline__track' });
    var labels = el('div', { class: 'timeline__labels' });

    jobs.forEach(function (job, index) {
      var start = months(job.start);
      var end = job.end ? months(job.end) : now;
      var left = ((start - from) / span) * 100;
      var width = ((end - start + 1) / span) * 100;
      var target = '#job-' + (R.experience.length - 1 - index);

      track.appendChild(el('a', {
        class: 'timeline__seg' + (job.current ? ' is-current' : ''),
        href: target,
        style: 'left:' + left.toFixed(2) + '%;width:' + width.toFixed(2) + '%',
        'aria-label': t(job.company) + ', ' + t(job.period),
        title: t(job.company) + ' · ' + t(job.period),
      }));

      labels.appendChild(el('a', {
        class: 'timeline__label',
        href: target,
        style: 'left:' + left.toFixed(2) + '%',
      }, [
        el('span', { class: 'timeline__company', text: t(job.company) }),
        el('span', { class: 'timeline__span', text: t(job.duration) }),
      ]));
    });

    return el('div', { class: 'timeline enter' }, [scale, track, labels]);
  }

  function buildJobs() {
    var list = el('div', { class: 'jobs' }, R.experience.map(function (job, index) {
      return el('article', { class: 'job enter', id: 'job-' + index }, [
        el('div', { class: 'job__meta' }, [
          el('span', { class: 'job__period', text: t(job.period) }),
          el('span', { class: 'job__duration', text: t(job.duration) }),
          job.current ? el('span', { class: 'job__now', text: u('now') }) : null,
        ]),
        el('div', {}, [
          el('h3', { class: 'job__company', text: t(job.company) }),
          el('p', { class: 'job__role', text: t(job.role) }),
          el('ul', { class: 'job__bullets' }, job.bullets.map(function (bullet) {
            return el('li', {
              class: 'bullet',
              'data-tags': (bullet.tags || []).join(' '),
              text: t(bullet.text),
            });
          })),
        ]),
      ]);
    }));

    return section('experience', u('experienceTitle'), [buildTimeline(), list]);
  }

  /* --- проекты ----------------------------------------------------------- */

  /* Звёзды и последний выпуск подставляет `scripts/fetch_stats.py` перед
     выкладкой. Данных может не быть вовсе — тогда строки просто нет. */
  function buildProjects() {
    var grid = el('div', { class: 'projects enter' }, R.projects.map(function (pr) {
      var stat = (STATS.repos && STATS.repos[pr.repo]) || null;
      var stars = stat && typeof stat.stars === 'number' ? stat.stars : null;
      var release = stat && stat.release;
      return el('article', { class: 'project', 'data-tags': (pr.tags || []).join(' ') }, [
        el('div', { class: 'project__top' }, [
          el('h3', { class: 'project__name', text: pr.name }),
          stars !== null ? el('span', { class: 'project__stars', text: '★ ' + stars }) : null,
        ]),
        el('p', { class: 'project__tagline', text: t(pr.tagline) }),
        release ? el('p', {
          class: 'project__release',
          text: u('releaseLabel') + ' ' + tagName(release.tag) + ' · ' + humanDate(release.date),
        }) : null,
        el('p', { class: 'project__text', text: t(pr.description) }),
        el('div', { class: 'project__stack' }, pr.stack.map(function (s) {
          return el('span', { text: s });
        })),
        el('a', {
          class: 'project__link', href: pr.link, target: '_blank', rel: 'noopener',
          text: u('openOnGithub'),
        }),
      ]);
    }));

    return section('projects', u('projectsTitle'), [
      el('p', { class: 'section__note', text: u('projectsNote') }),
      grid,
    ]);
  }

  /* --- навыки ------------------------------------------------------------ */

  function buildSkills() {
    var groups = el('div', { class: 'skill-groups enter' }, R.skillGroups.map(function (group) {
      return el('div', {}, [
        el('h3', { class: 'skill-group__title', text: t(group.title) }),
        el('div', { class: 'chips' }, group.skills.map(function (skill) {
          var name = t(skill.name);
          if (!skill.filter) return el('span', { class: 'chip', text: name });
          return el('button', {
            class: 'chip',
            type: 'button',
            'data-filter': skill.filter,
            'aria-pressed': 'false',
            text: name,
            onclick: function () {
              setFilter(state.filter === skill.filter ? null : skill.filter, name);
            },
          });
        })),
      ]);
    }));

    return section('skills', u('skillsTitle'), [
      el('p', { class: 'section__note', text: u('skillsNote') }),
      groups,
      el('div', { class: 'filter-status', id: 'filter-status' }),
    ]);
  }

  function setFilter(tag, label) {
    state.filter = tag;
    state.filterLabel = label;
    $$('button.chip').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.getAttribute('data-filter') === tag));
    });
    applyFilter();
  }

  function applyFilter() {
    var tag = state.filter;
    document.body.classList.toggle('is-filtering', Boolean(tag));

    $$('.bullet, .project').forEach(function (node) {
      var tags = (node.getAttribute('data-tags') || '').split(' ');
      node.classList.toggle('is-hit', Boolean(tag) && tags.indexOf(tag) !== -1);
    });

    var status = $('#filter-status');
    if (!status) return;
    status.textContent = '';

    if (!tag) {
      collectMagnets();
      return;
    }

    var hits = $$('.bullet.is-hit').length + $$('.project.is-hit').length;
    status.appendChild(el('span', {
      text: hits ? state.filterLabel + ' — ' + hits + ' ' + plural(hits) : u('noMatches'),
    }));
    status.appendChild(el('button', {
      class: 'btn', type: 'button', text: u('reset'),
      onclick: function () { setFilter(null, null); },
    }));

    // «Сбросить» появляется и исчезает — список магнитов пересобирается.
    collectMagnets();
  }

  function plural(n) {
    var forms = u('matchForms');
    if (LANG !== 'ru') return n === 1 ? forms[0] : forms[1];

    var mod10 = n % 10;
    var mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return forms[0];
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
    return forms[2];
  }

  /* --- образование ------------------------------------------------------- */

  function records(title, items, render) {
    return el('div', {}, [
      el('h3', { class: 'skill-group__title', text: title }),
    ].concat(items.map(render)));
  }

  function buildEducation() {
    var edu = records(u('educationTitle'), R.education, function (rec) {
      return el('div', { class: 'record' }, [
        el('span', { class: 'record__year', text: rec.year }),
        el('div', {}, [
          el('p', { class: 'record__title', text: t(rec.degree) }),
          el('p', { class: 'record__place', text: t(rec.place) }),
        ]),
      ]);
    });

    var courses = records(u('coursesTitle'), R.courses, function (rec) {
      return el('div', { class: 'record' }, [
        el('span', { class: 'record__year', text: rec.year }),
        el('div', {}, [
          el('p', { class: 'record__title', text: t(rec.name) }),
          el('p', { class: 'record__place', text: t(rec.place) }),
        ]),
      ]);
    });

    courses.appendChild(el('div', { class: 'record' }, [
      el('span', { class: 'record__year', text: u('languagesTitle') }),
      el('div', {}, R.languages.map(function (lang) {
        return el('p', { class: 'record__place', text: t(lang.name) + ' — ' + t(lang.level) });
      })),
    ]));

    return section('education', u('educationTitle'), [
      el('div', { class: 'two-col enter' }, [edu, courses]),
    ]);
  }

  /* --- контакты ---------------------------------------------------------- */

  function buildContact() {
    var p = R.person;
    return el('section', { class: 'contact', id: 'contact' }, [
      el('div', { class: 'wrap' }, [
        el('p', { class: 'eyebrow', text: u('contactEyebrow') }),
        el('h2', { class: 'contact__title', text: u('contactTitle') }),
        el('p', { class: 'contact__text', text: u('contactText') }),
        el('div', { class: 'contact__actions' }, [
          el('a', {
            class: 'btn btn--primary', href: p.contacts.telegram.href,
            target: '_blank', rel: 'noopener', text: t(p.contacts.telegram.label),
          }),
          el('a', { class: 'btn btn--ghost', href: p.contacts.email.href, text: u('writeEmail') }),
          el('a', {
            class: 'btn btn--ghost', href: p.contacts.github.href,
            target: '_blank', rel: 'noopener', text: 'GitHub',
          }),
        ]),
        el('p', {
          class: 'print-only fact__val',
          text: p.contacts.email.href.replace('mailto:', '') + ' · ' +
            p.contacts.telegram.href.replace('https://', '') + ' · ' + p.contacts.github.label,
        }),
      ]),
    ]);
  }

  function buildFooter() {
    return el('footer', { class: 'footer' }, [
      el('div', { class: 'wrap footer__inner' }, [
        el('span', { text: t(R.person.name) + ' · ' + t(R.person.city) }),
        el('span', {}, [
          el('a', {
            href: 'https://github.com/akonyaev-ru/resume', target: '_blank', rel: 'noopener',
            text: u('sourceCode'),
          }),
        ]),
        el('span', { text: u('updatedAt') + ' ' + t(R.person.updated) }),
      ]),
    ]);
  }

  /* --- реакция на курсор: магниты и блик ---------------------------------- */

  var magnets = [];
  var portrait = null;

  function collectMagnets() {
    magnets = $$('.btn');
    portrait = $('.portrait');
  }

  /* Один обработчик движения мыши на две мелочи: кнопки рядом с курсором
     чуть тянутся к нему, а под курсором внутри карточки светится пятно.
     Все прямоугольники читаются до записи стилей — иначе браузер пересчитывал
     бы раскладку на каждой кнопке. */
  function initPointerFx() {
    if (!FINE_POINTER || LESS_MOTION) return;

    var REACH = 55;      // на сколько пикселей за габариты кнопки достаёт магнит
    // Доля расстояния, которую отрабатывает сдвиг. Больше 0.2 — и упор в MAX_X
    // достигается почти сразу: кнопка не тянется, а прыгает в крайнее положение.
    var PULL = 0.18;
    var MAX_X = 8;
    var MAX_Y = 6;

    document.addEventListener('mousemove', function (event) {
      var card = event.target.closest ? event.target.closest('.metric, .project') : null;
      if (card) {
        var box = card.getBoundingClientRect();
        card.style.setProperty('--mx', (event.clientX - box.left).toFixed(0) + 'px');
        card.style.setProperty('--my', (event.clientY - box.top).toFixed(0) + 'px');
      }

      if (portrait) lightPortrait(event);

      var rects = magnets.map(function (btn) { return btn.getBoundingClientRect(); });

      rects.forEach(function (rect, index) {
        var dx = event.clientX - (rect.left + rect.width / 2);
        var dy = event.clientY - (rect.top + rect.height / 2);
        var reach = Math.max(rect.width, rect.height) / 2 + REACH;
        var distance = Math.sqrt(dx * dx + dy * dy);
        var button = magnets[index];

        if (distance > reach) {
          if (button.style.transform) button.style.transform = '';
          return;
        }

        var force = (1 - distance / reach) * PULL;
        var shiftX = Math.max(-MAX_X, Math.min(MAX_X, dx * force));
        var shiftY = Math.max(-MAX_Y, Math.min(MAX_Y, dy * force));
        button.style.transform = 'translate(' + shiftX.toFixed(1) + 'px, ' + shiftY.toFixed(1) + 'px)';
      });
    }, { passive: true });

    document.addEventListener('mouseleave', function () {
      magnets.forEach(function (button) { button.style.transform = ''; });
      if (portrait) portrait.classList.remove('is-live');
    });
  }

  /* Курсор над портретом сдвигает окно, в котором проступает фотография. */
  function lightPortrait(event) {
    var rect = portrait.getBoundingClientRect();
    var inside = event.clientX >= rect.left && event.clientX <= rect.right &&
      event.clientY >= rect.top && event.clientY <= rect.bottom;

    if (!inside) {
      if (portrait.classList.contains('is-live')) portrait.classList.remove('is-live');
      return;
    }

    portrait.classList.add('is-live');
    portrait.style.setProperty('--mx', (event.clientX - rect.left).toFixed(0) + 'px');
    portrait.style.setProperty('--my', (event.clientY - rect.top).toFixed(0) + 'px');
  }

  /* --- портрет из символов ------------------------------------------------ */

  // Портрет пересобирается при каждой перерисовке страницы (например, при
  // смене языка), а глобальные слушатели вешаются один раз — иначе они
  // копились бы с каждым переключением.
  var portraitRedraw = null;
  var portraitFlicker = null;
  var portraitBound = false;

  /* Лицо набирается теми же знаками, что и фоновое поле: фотография ужимается
     до одного пикселя на ячейку, и яркость каждого пикселя выбирает знак —
     от самого лёгкого к самому плотному. Прозрачные места остаются пустыми,
     поэтому силуэт рисуют сами символы. Сама фотография лежит сверху и
     проявляется только в окне под курсором — за это отвечают стили. */
  function initGlyphPortrait() {
    var host = $('.portrait');
    if (!host) return;

    var canvas = host.querySelector('.portrait__glyphs');
    var photo = host.querySelector('.portrait__photo');
    var ctx = canvas.getContext('2d');

    var CELL_W = 6;
    var CELL_H = 8;
    var FONT = 7.5;
    var DIM = [74, 84, 116];     // цвет самой тёмной части лица
    var BRIGHT = [233, 236, 244];
    var FLICKER_MS = 220;
    var FLICKER_COUNT = 3;

    var ramp = '';
    var cells = [];
    var cols = 0;
    var rows = 0;

    /* Знаки выстраиваются по «плотности чернил»: каждый рисуется на крошечном
       холсте, и считается, сколько он закрасил. Так порядок не нужно
       подбирать руками, и он не поедет при смене шрифта. */
    function buildRamp() {
      var probe = document.createElement('canvas');
      probe.width = 12;
      probe.height = 16;
      var pctx = probe.getContext('2d');
      pctx.font = '11px "JetBrains Mono", ui-monospace, monospace';
      pctx.textBaseline = 'top';

      var scored = GLYPHS.split('').map(function (char) {
        pctx.clearRect(0, 0, 12, 16);
        pctx.fillStyle = '#fff';
        pctx.fillText(char, 1, 1);
        var pixels = pctx.getImageData(0, 0, 12, 16).data;
        var ink = 0;
        for (var i = 3; i < pixels.length; i += 4) ink += pixels[i];
        return { char: char, ink: ink };
      });

      scored.sort(function (a, b) { return a.ink - b.ink; });
      ramp = scored.map(function (s) { return s.char; }).join('');
    }

    function paintCell(cell) {
      var mix = cell.lum;
      ctx.fillStyle = 'rgb(' +
        Math.round(DIM[0] + (BRIGHT[0] - DIM[0]) * mix) + ',' +
        Math.round(DIM[1] + (BRIGHT[1] - DIM[1]) * mix) + ',' +
        Math.round(DIM[2] + (BRIGHT[2] - DIM[2]) * mix) + ')';
      ctx.globalAlpha = 0.5 + 0.5 * cell.lum;
      ctx.fillText(cell.char, cell.col * CELL_W, cell.row * CELL_H);
    }

    function render() {
      var width = host.clientWidth;
      var height = host.clientHeight;
      if (!width || !height || !photo.naturalWidth) return;

      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = FONT + 'px "JetBrains Mono", ui-monospace, monospace';
      ctx.textBaseline = 'top';

      cols = Math.ceil(width / CELL_W);
      rows = Math.ceil(height / CELL_H);

      // Ужимаем фотографию до одного пикселя на ячейку: браузер сам усредняет
      // область, вручную считать среднее не нужно.
      var small = document.createElement('canvas');
      small.width = cols;
      small.height = rows;
      var sctx = small.getContext('2d');
      sctx.drawImage(photo, 0, 0, cols, rows);
      var pixels = sctx.getImageData(0, 0, cols, rows).data;

      cells = [];
      ctx.clearRect(0, 0, width, height);

      for (var row = 0; row < rows; row += 1) {
        for (var col = 0; col < cols; col += 1) {
          var at = (row * cols + col) * 4;
          var alpha = pixels[at + 3] / 255;
          if (alpha < 0.16) continue;

          var lum = (pixels[at] * 0.299 + pixels[at + 1] * 0.587 + pixels[at + 2] * 0.114) / 255;
          // Полутона приподняты: без этого лицо тонет, а знаки читаются только
          // на бликах.
          lum = Math.min(1, Math.pow(lum * alpha, 0.78) * 1.1);

          var cell = {
            col: col,
            row: row,
            lum: lum,
            char: ramp.charAt(Math.round(lum * (ramp.length - 1))),
          };
          cells.push(cell);
          paintCell(cell);
        }
      }

      ctx.globalAlpha = 1;
    }

    /* Несколько знаков пересобираются в пределах своей яркости — портрет
       дышит так же, как фоновое поле. */
    function flicker() {
      if (document.hidden || !cells.length) return;

      for (var i = 0; i < FLICKER_COUNT; i += 1) {
        var cell = cells[Math.floor(Math.random() * cells.length)];
        var at = Math.round(cell.lum * (ramp.length - 1));
        var shift = at + (Math.random() < 0.5 ? -1 : 1);
        cell.char = ramp.charAt(Math.max(0, Math.min(ramp.length - 1, shift)));

        ctx.clearRect(cell.col * CELL_W, cell.row * CELL_H, CELL_W, CELL_H);
        paintCell(cell);
      }

      ctx.globalAlpha = 1;
    }

    buildRamp();
    portraitRedraw = render;
    portraitFlicker = flicker;

    if (photo.complete && photo.naturalWidth) render();
    else photo.addEventListener('load', render);

    if (portraitBound) return;
    portraitBound = true;

    window.addEventListener('resize', function () {
      if (portraitRedraw) portraitRedraw();
    });

    if (LESS_MOTION) return;
    window.setInterval(function () {
      if (portraitFlicker) portraitFlicker();
    }, FLICKER_MS);
  }

  /* --- расшифровка заголовков --------------------------------------------- */

  /* Заголовок раздела при появлении собирается из тех же знаков, что и фоновое
     поле: буквы встают на место слева направо, остальные пока мельтешат. */
  function initTitleDecode() {
    if (LESS_MOTION || !('IntersectionObserver' in window)) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        decodeTitle(entry.target);
      });
    }, { rootMargin: '0px 0px -15% 0px', threshold: 0.6 });

    $$('.section__title').forEach(function (title) { observer.observe(title); });
    observers.push(observer);
  }

  function decodeTitle(node) {
    var text = node.textContent;
    var duration = Math.min(700, 320 + text.length * 12);
    var start = null;

    // Ширина заголовка на время перебора фиксируется: иначе линейка справа от
    // него дёргалась бы на каждом кадре.
    node.style.minWidth = node.offsetWidth + 'px';

    function frame(now) {
      if (start === null) start = now;

      var progress = Math.min((now - start) / duration, 1);
      var locked = Math.floor(progress * text.length);
      var out = '';

      for (var i = 0; i < text.length; i += 1) {
        var char = text.charAt(i);
        out += (i < locked || char === ' ') ? char : randomFrom(TITLE_GLYPHS);
      }

      node.textContent = out;

      if (progress < 1) {
        window.requestAnimationFrame(frame);
      } else {
        node.textContent = text;
        node.style.minWidth = '';
      }
    }

    window.requestAnimationFrame(frame);
  }

  /* --- поле символов ------------------------------------------------------ */

  /* Фон страницы — сплошная сетка моноширинных знаков. Сама по себе она едва
     различима; курсор освещает вокруг себя круг, где символы разгораются от
     индиго к мятному. Свет гаснет не сразу, а затухает кадр за кадром, поэтому
     за курсором тянется короткий шлейф.

     Рисуется целиком только при сборке и изменении размера окна. На каждый кадр
     перерисовывается лишь квадрат вокруг курсора — иначе четыре с лишним тысячи
     символов пришлось бы выводить по шестьдесят раз в секунду. */
  function initField() {
    var canvas = $('#field');
    if (!canvas) return;

    var ctx = canvas.getContext('2d');

    var CELL_W = 15;
    var CELL_H = 19;
    var FONT = 12;
    var RADIUS = 132;          // радиус пятна под курсором, px
    var DECAY = 0.84;          // во сколько раз гаснет тепло за кадр (16.7 мс)
    var THRESH = 0.02;         // ниже этого символ считается погасшим
    var BASE = '#8791ab';      // цвет спящего символа
    var BASE_ALPHA = 0.085;
    var ACCENT = '#7c7cff';
    var MINT = '#3ddc97';
    var FLICKER_MS = 130;      // как часто пересобираются случайные символы
    var FLICKER_COUNT = 5;

    var BUG_FIRST_MS = 9000;   // первый паучок приходит быстрее прочих
    var BUG_MIN_MS = 26000;    // пауза между появлениями    // пауза между появлениями паучка
    var BUG_MAX_MS = 58000;
    var BUG_FALL = 7;          // ячеек в секунду вниз
    var BUG_CLIMB = 11;        // и обратно наверх
    var BUG_FLEE = 34;         // если курсор подошёл вплотную
    var BUG_HANG_MS = 2400;    // сколько висит, прежде чем уйти
    var BUG_SCARE = 150;       // на каком расстоянии замечает курсор, px
    var BUG_STEP_MS = 240;     // как часто перебирает лапками

    var BUG_W = 5;             // паучок пять ячеек в ширину и столько же в высоту
    var BUG_H = 5;

    /* Голова `o`, брюшко `#` в боках `( )`, вокруг восемь лапок. В двух фазах
       пары лапок меняются местами — передние вытягиваются, задние подбираются,
       и наоборот: выходит перебор. Пробел значит «ячейку не трогаем», поэтому
       сквозь паучка видно поле. */
    var BUG_FRAMES = [
      [
        '\\', ' ', '|', ' ', '/',
        ' ', '\\', 'o', '/', ' ',
        ' ', '(', '#', ')', ' ',
        ' ', '/', ' ', '\\', ' ',
        '/', ' ', ' ', ' ', '\\',
      ],
      [
        ' ', '\\', '|', '/', ' ',
        '\\', ' ', 'o', ' ', '/',
        ' ', '(', '#', ')', ' ',
        '/', ' ', ' ', ' ', '\\',
        ' ', '/', ' ', '\\', ' ',
      ],
    ];

    /* Тело светится ярче лапок: иначе на фоне поля паучок не читается. */
    function bugHeat(char) {
      if (char === 'o' || char === '#') return 1;
      if (char === '(' || char === ')') return 0.86;
      return 0.74;
    }

    /* Брошенная ячейка возвращается полю. Знаки лапок и нити в алфавите поля
       уже есть — их можно оставить, они догорят следом за движением. А `o`
       головы там нет: единственная буква среди символов бросалась бы в глаза,
       поэтому её меняем на случайный знак. */
    function releaseCell(index) {
      if (chars[index] === 'o') chars[index] = randomGlyph();
    }

    var cols = 0;
    var rows = 0;
    var chars = [];
    var heat = null;           // сколько «света» осталось в каждой ячейке
    var hot = [];              // индексы ячеек, где свет ещё есть
    var lit = null;            // флаг «уже в списке», чтобы не заводить дубли
    var margins = [];          // столбцы за пределами колонки с текстом
    var bug = null;
    var lastPoint = null;
    var lastFrame = 0;
    var running = false;

    function build() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var width = window.innerWidth;
      var height = window.innerHeight;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = FONT + 'px "JetBrains Mono", ui-monospace, monospace';
      ctx.textBaseline = 'top';

      cols = Math.ceil(width / CELL_W);
      rows = Math.ceil(height / CELL_H);
      chars = new Array(cols * rows);
      for (var i = 0; i < chars.length; i += 1) chars[i] = randomGlyph();
      heat = new Float32Array(cols * rows);
      lit = new Uint8Array(cols * rows);
      hot = [];
      bug = null;

      lastPoint = null;
      measureMargins();
      paintAll();
    }

    /* Поля страницы — столбцы, где нет текста. По ним спускается паучок; на
       узком экране полей не остаётся, и его там не бывает. */
    function measureMargins() {
      margins = [];
      var wrap = $('.wrap');
      if (!wrap) return;

      var box = wrap.getBoundingClientRect();
      var pad = CELL_W;

      for (var col = 0; col < cols; col += 1) {
        var x = col * CELL_W + CELL_W / 2;
        if (x < box.left - pad || x > box.right + pad) margins.push(col);
      }
    }

    function paintCell(col, row, alpha, color) {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.fillText(chars[row * cols + col], col * CELL_W + 2, row * CELL_H + 3);
    }

    function paintAll() {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (var row = 0; row < rows; row += 1) {
        for (var col = 0; col < cols; col += 1) paintCell(col, row, BASE_ALPHA, BASE);
      }
      ctx.globalAlpha = 1;
    }

    function wake() {
      if (running) return;
      running = true;
      lastFrame = 0;
      window.requestAnimationFrame(frame);
    }

    /* Ячейка получает свет и попадает в список горящих. Список нужен, чтобы в
       кадре перерисовывать только их: раньше считался один общий прямоугольник,
       и свет в разных углах экрана заставлял перерисовывать полполя. */
    function touch(index, value) {
      if (value > heat[index]) heat[index] = value;
      if (!lit[index]) {
        lit[index] = 1;
        hot.push(index);
      }
      wake();
    }

    /* Курсор подогревает ячейки вокруг себя. Тепло не сбрасывается мгновенно, а
       гаснет кадр за кадром — поэтому за курсором тянется короткий хвост. */
    function warm(x, y) {
      var c0 = Math.max(0, Math.floor((x - RADIUS) / CELL_W));
      var c1 = Math.min(cols - 1, Math.ceil((x + RADIUS) / CELL_W));
      var r0 = Math.max(0, Math.floor((y - RADIUS) / CELL_H));
      var r1 = Math.min(rows - 1, Math.ceil((y + RADIUS) / CELL_H));

      for (var row = r0; row <= r1; row += 1) {
        for (var col = c0; col <= c1; col += 1) {
          var dx = col * CELL_W + CELL_W / 2 - x;
          var dy = row * CELL_H + CELL_H / 2 - y;
          var value = 1 - Math.sqrt(dx * dx + dy * dy) / RADIUS;
          if (value > 0) touch(row * cols + col, value);
        }
      }
    }

    /* Паучок спускается на нити в поле страницы, висит и уходит обратно.
       Ему нужно пять столбцов подряд без текста, поэтому на узком экране, где
       полей не остаётся, его не бывает. */
    function bugColumn() {
      var half = (BUG_W - 1) / 2;
      var candidates = [];

      for (var i = half; i < margins.length - half; i += 1) {
        var solid = true;
        for (var k = 1; k <= half; k += 1) {
          if (margins[i - k] !== margins[i] - k || margins[i + k] !== margins[i] + k) solid = false;
        }
        if (solid) candidates.push(margins[i]);
      }

      return candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : -1;
    }

    function spawnBug() {
      if (bug || document.hidden || rows < 10) return;

      var col = bugColumn();
      if (col < 0) return;

      bug = {
        col: col,
        row: -BUG_H,
        depth: 3 + Math.random() * (rows * 0.5),
        state: 'fall',
        until: 0,
        phase: 0,
        stepAt: 0,
        cells: [],
      };

      wake();
    }

    /* Знаки в занятых ячейках подменяются на лапки и тело, тепло держится
       каждый кадр: `touch` только поднимает его, а гаснет оно само. */
    function paintBug() {
      var top = Math.round(bug.row);
      var legs = BUG_FRAMES[bug.phase];
      var next = [];
      var index;
      var row;

      // Нить — от верхнего края до паучка.
      for (row = 0; row < top; row += 1) {
        index = row * cols + bug.col;
        chars[index] = '|';
        touch(index, 0.3);
        next.push(index);
      }

      for (var r = 0; r < BUG_H; r += 1) {
        row = top + r;
        if (row < 0 || row >= rows) continue;

        for (var c = 0; c < BUG_W; c += 1) {
          var char = legs[r * BUG_W + c];
          if (char === ' ') continue;

          index = row * cols + bug.col - (BUG_W - 1) / 2 + c;
          chars[index] = char;
          touch(index, bugHeat(char));
          next.push(index);
        }
      }

      var stays = {};
      for (var i = 0; i < next.length; i += 1) stays[next[i]] = 1;
      for (i = 0; i < bug.cells.length; i += 1) {
        if (!stays[bug.cells[i]]) releaseCell(bug.cells[i]);
      }

      bug.cells = next;
    }



    function advanceBug(step, now) {
      if (!bug) return;

      if (bug.state === 'fall') {
        bug.row += (BUG_FALL * step) / 1000;
        if (bug.row >= bug.depth) {
          bug.row = bug.depth;
          bug.state = 'hang';
          bug.until = now + BUG_HANG_MS;
        }
      } else if (bug.state === 'hang') {
        if (now >= bug.until) bug.state = 'climb';
      } else {
        bug.row -= ((bug.state === 'flee' ? BUG_FLEE : BUG_CLIMB) * step) / 1000;
        if (bug.row < -BUG_H) {
          for (var i = 0; i < bug.cells.length; i += 1) releaseCell(bug.cells[i]);
          bug = null;
          return;
        }
      }

      if (now - bug.stepAt > BUG_STEP_MS) {
        bug.phase = bug.phase ? 0 : 1;
        bug.stepAt = now;
      }

      paintBug();
    }

    /* Курсор подошёл вплотную — паучок удирает наверх. */
    function scareBug(x, y) {
      if (!bug || bug.state === 'flee') return;

      var bx = bug.col * CELL_W + CELL_W / 2;
      var by = (bug.row + BUG_H / 2) * CELL_H;
      if (Math.abs(x - bx) < BUG_SCARE && Math.abs(y - by) < BUG_SCARE) bug.state = 'flee';
    }

    function frame(now) {
      var step = lastFrame ? Math.min(now - lastFrame, 64) : 16.7;
      lastFrame = now;

      advanceBug(step, now);

      var fade = Math.pow(DECAY, step / 16.7);
      var kept = [];

      for (var i = 0; i < hot.length; i += 1) {
        var index = hot[i];
        var value = heat[index] * fade;
        var row = (index / cols) | 0;
        var col = index - row * cols;

        ctx.clearRect(col * CELL_W, row * CELL_H, CELL_W, CELL_H);

        if (value < THRESH) {
          heat[index] = 0;
          lit[index] = 0;
          paintCell(col, row, BASE_ALPHA, BASE);
        } else {
          heat[index] = value;
          kept.push(index);
          paintCell(col, row, BASE_ALPHA + value * value, value > 0.78 ? MINT : ACCENT);
        }
      }

      hot = kept;
      ctx.globalAlpha = 1;

      if (hot.length || bug) window.requestAnimationFrame(frame);
      else running = false;
    }

    build();
    window.addEventListener('resize', build);

    if (FINE_POINTER && !LESS_MOTION) {
      window.addEventListener('mousemove', function (event) {
        var x = event.clientX;
        var y = event.clientY;

        // Между кадрами курсор успевает уехать далеко: подогреваем и точки по
        // пути, иначе хвост получается пунктирным.
        if (lastPoint) {
          var dx = x - lastPoint.x;
          var dy = y - lastPoint.y;
          var steps = Math.min(8, Math.floor(Math.sqrt(dx * dx + dy * dy) / (RADIUS / 3)));
          for (var s = 1; s <= steps; s += 1) {
            warm(lastPoint.x + (dx * s) / (steps + 1), lastPoint.y + (dy * s) / (steps + 1));
          }
        }

        lastPoint = { x: x, y: y };
        warm(x, y);
        scareBug(x, y);
      }, { passive: true });
    }

    if (LESS_MOTION) return;

    (function scheduleBug(first) {
      window.setTimeout(function () {
        spawnBug();
        scheduleBug(false);
      }, first ? BUG_FIRST_MS * (0.6 + Math.random() * 0.8)
        : BUG_MIN_MS + Math.random() * (BUG_MAX_MS - BUG_MIN_MS));
    })(true);

    /* Медленное мерцание: несколько случайных символов пересобираются и
       перерисовываются поштучно. */
    window.setInterval(function () {
      if (document.hidden || !chars.length) return;
      for (var i = 0; i < FLICKER_COUNT; i += 1) {
        var index = Math.floor(Math.random() * chars.length);
        var row = Math.floor(index / cols);
        var col = index % cols;
        chars[index] = randomGlyph();
        ctx.clearRect(col * CELL_W, row * CELL_H, CELL_W, CELL_H);

        // Если ячейка сейчас освещена, её нельзя гасить до спящего цвета:
        // получалась бы тёмная точка внутри пятна на один кадр.
        var value = heat[index];
        if (value > 0) paintCell(col, row, BASE_ALPHA + value * value, value > 0.78 ? MINT : ACCENT);
        else paintCell(col, row, BASE_ALPHA, BASE);
      }
      ctx.globalAlpha = 1;
    }, FLICKER_MS);
  }

  /* --- появление и счётчики ---------------------------------------------- */

  function initObservers() {
    if (!('IntersectionObserver' in window)) {
      $$('.enter').forEach(function (n) { n.classList.add('is-in'); });
      $$('.metric__value').forEach(countTo);
      return;
    }

    var appear = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        appear.unobserve(entry.target);
        entry.target.querySelectorAll('.metric__value').forEach(countTo);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });

    $$('.enter').forEach(function (n) { appear.observe(n); });

    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        $$('[data-nav]').forEach(function (a) {
          var active = a.getAttribute('data-nav') === entry.target.id;
          a.classList.toggle('is-active', active);
          if (active) revealNav(a);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    NAV.forEach(function (id) {
      var node = document.getElementById(id);
      if (node) spy.observe(node);
    });

    observers.push(appear, spy);
  }

  /* В узкой шапке меню прокручивается вбок: без этого отметка текущего раздела
     уезжает за край и подсказывать перестаёт. Двигается только сама лента —
     положение страницы не трогаем. */
  function revealNav(link) {
    var strip = link.parentNode;
    if (!strip || strip.scrollWidth <= strip.clientWidth + 1) return;

    var stripBox = strip.getBoundingClientRect();
    var linkBox = link.getBoundingClientRect();
    var left = strip.scrollLeft + (linkBox.left - stripBox.left) -
      (stripBox.width - linkBox.width) / 2;

    left = Math.max(0, Math.min(left, strip.scrollWidth - strip.clientWidth));
    if (Math.abs(strip.scrollLeft - left) < 2) return;

    try {
      strip.scrollTo({ left: left, behavior: LESS_MOTION ? 'auto' : 'smooth' });
    } catch (e) {
      strip.scrollLeft = left;
    }
  }

  function countTo(node) {
    var target = Number(node.getAttribute('data-value'));
    var prefix = node.getAttribute('data-prefix') || '';
    var suffix = node.getAttribute('data-suffix') || '';

    if (LESS_MOTION || !target) {
      node.textContent = prefix + target + suffix;
      return;
    }

    var duration = 950;
    var start = null;

    function frame(now) {
      if (start === null) start = now;
      var progress = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      node.textContent = prefix + Math.round(target * eased) + suffix;
      if (progress < 1) window.requestAnimationFrame(frame);
    }

    window.requestAnimationFrame(frame);
  }

  /* --- сборка ------------------------------------------------------------ */

  function render() {
    observers.forEach(function (observer) { observer.disconnect(); });
    observers = [];

    var app = $('#app');
    app.textContent = '';
    app.appendChild(buildTopbar());
    app.appendChild(el('main', { id: 'main' }, [
      buildHero(),
      buildMetrics(),
      buildApproach(),
      buildJobs(),
      buildProjects(),
      buildSkills(),
      buildEducation(),
      buildContact(),
    ]));
    app.appendChild(buildFooter());

    initObservers();
    initTitleDecode();
    initGlyphPortrait();
    collectMagnets();
  }

  function init() {
    document.documentElement.lang = LANG;
    document.title = u('docTitle');
    render();
    initPointerFx();
    initField();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
