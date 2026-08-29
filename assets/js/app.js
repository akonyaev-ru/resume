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

  var state = { filter: null, filterLabel: null };

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

  function randomGlyph() {
    return GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length));
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

  var NAV = [
    ['results', 'Результаты'],
    ['experience', 'Опыт'],
    ['projects', 'Проекты'],
    ['skills', 'Навыки'],
    ['education', 'Образование'],
    ['contact', 'Контакты'],
  ];

  function buildTopbar() {
    return el('header', { class: 'topbar' }, [
      el('div', { class: 'wrap topbar__inner' }, [
        el('span', { class: 'topbar__name', text: R.person.name }),
        el('nav', { class: 'topbar__nav', 'aria-label': 'Разделы' },
          NAV.map(function (item) {
            return el('a', { href: '#' + item[0], text: item[1], 'data-nav': item[0] });
          })),
      ]),
    ]);
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
      el('p', { class: 'eyebrow', text: 'Резюме · обновлено ' + p.updated }),
      el('p', { class: 'hero__name', text: p.name }),
      roleNode(p.role, p.roleAccent),
      el('p', { class: 'hero__lede', text: p.lede }),
      el('div', { class: 'hero__specs' }, p.specializations.map(function (s) {
        return el('span', { class: 'spec', text: s });
      })),
      el('div', { class: 'hero__actions' }, [
        el('a', {
          class: 'btn btn--primary', href: p.contacts.telegram.href,
          target: '_blank', rel: 'noopener', text: p.contacts.telegram.label,
        }),
        el('a', {
          class: 'btn btn--ghost', href: p.contacts.github.href,
          target: '_blank', rel: 'noopener', text: 'GitHub',
        }),
      ]),
    ]);

    return el('section', { class: 'hero' }, [
      el('div', { class: 'wrap hero__grid' }, [left, buildFactsheet()]),
    ]);
  }

  function buildFactsheet() {
    var p = R.person;

    var rows = [
      ['Город', el('span', { text: p.city + ' · ' + p.age + ' лет' })],
      ['Формат', el('span', { text: p.schedule + ' · ' + p.employment.toLowerCase() })],
      ['Переезд', el('span', { text: p.relocation })],
      ['Опыт', el('span', { text: p.experienceTotal })],
      ['Почта', link(p.contacts.email)],
    ];

    if (CFG.showSalary) rows.splice(4, 0, ['Ожидание', el('span', { text: p.salary })]);

    // Без класса enter: анкета — часть первого экрана, на телефоне она уезжает
    // под сгиб, и появление по прокрутке оставляло бы на её месте пустое поле.
    return el('aside', { class: 'factsheet' }, [
      el('div', { class: 'factsheet__head' }, [
        el('span', { text: 'Анкета' }),
        el('span', { text: p.updated }),
      ]),
      el('div', { class: 'factsheet__body' }, rows.map(function (row) {
        return el('div', { class: 'fact' }, [
          el('span', { class: 'fact__key', text: row[0] }),
          el('span', { class: 'fact__val' }, [row[1]]),
        ]);
      })),
    ]);
  }

  function link(contact) {
    return el('a', { href: contact.href, target: '_blank', rel: 'noopener', text: contact.label });
  }

  /* --- результаты -------------------------------------------------------- */

  function buildMetrics() {
    var grid = el('div', { class: 'metrics enter' }, R.metrics.map(function (m) {
      return el('div', { class: 'metric' + (m.accent ? ' metric--accent' : '') }, [
        el('span', {
          class: 'metric__value',
          'data-value': String(m.value),
          'data-prefix': m.prefix || '',
          'data-suffix': m.suffix || '',
          text: (m.prefix || '') + '0' + (m.suffix || ''),
        }),
        el('span', { class: 'metric__caption', text: m.caption }),
      ]);
    }));

    return section('results', 'Что изменилось после внедрений', [
      el('p', { class: 'section__note', text: 'За полтора года на текущем месте работы.' }),
      grid,
    ]);
  }

  /* --- подход ------------------------------------------------------------ */

  function buildApproach() {
    return section('approach', 'Подход', [
      el('div', { class: 'approach enter' }, [
        el('p', { class: 'approach__text', text: R.person.about }),
        el('blockquote', { class: 'pullquote', text: R.person.pullquote }),
      ]),
    ]);
  }

  /* --- опыт -------------------------------------------------------------- */

  function buildJobs() {
    var list = el('div', { class: 'jobs' }, R.experience.map(function (job) {
      return el('article', { class: 'job enter' }, [
        el('div', { class: 'job__meta' }, [
          el('span', { class: 'job__period', text: job.period }),
          el('span', { class: 'job__duration', text: job.duration }),
          job.current ? el('span', { class: 'job__now', text: 'сейчас' }) : null,
        ]),
        el('div', {}, [
          el('h3', { class: 'job__company', text: job.company }),
          el('p', { class: 'job__role', text: job.role }),
          el('ul', { class: 'job__bullets' }, job.bullets.map(function (bullet) {
            return el('li', {
              class: 'bullet',
              'data-tags': (bullet.tags || []).join(' '),
              text: bullet.text,
            });
          })),
        ]),
      ]);
    }));

    return section('experience', 'Опыт работы', [list]);
  }

  /* --- проекты ----------------------------------------------------------- */

  function buildProjects() {
    var grid = el('div', { class: 'projects enter' }, R.projects.map(function (pr) {
      var stars = STATS.repos && STATS.repos[pr.repo];
      return el('article', { class: 'project', 'data-tags': (pr.tags || []).join(' ') }, [
        el('div', { class: 'project__top' }, [
          el('h3', { class: 'project__name', text: pr.name }),
          typeof stars === 'number' ? el('span', { class: 'project__stars', text: '★ ' + stars }) : null,
        ]),
        el('p', { class: 'project__tagline', text: pr.tagline }),
        el('p', { class: 'project__text', text: pr.description }),
        el('div', { class: 'project__stack' }, pr.stack.map(function (s) {
          return el('span', { text: s });
        })),
        el('a', {
          class: 'project__link', href: pr.link, target: '_blank', rel: 'noopener',
          text: 'Открыть на GitHub →',
        }),
      ]);
    }));

    return section('projects', 'Собственные продукты', [
      el('p', {
        class: 'section__note',
        text: 'Обе программы выросли из рабочих задач: сначала нужны были мне, потом — команде.',
      }),
      grid,
    ]);
  }

  /* --- навыки ------------------------------------------------------------ */

  function buildSkills() {
    var groups = el('div', { class: 'skill-groups enter' }, R.skillGroups.map(function (group) {
      return el('div', {}, [
        el('h3', { class: 'skill-group__title', text: group.title }),
        el('div', { class: 'chips' }, group.skills.map(function (skill) {
          if (!skill.filter) return el('span', { class: 'chip', text: skill.name });
          return el('button', {
            class: 'chip',
            type: 'button',
            'data-filter': skill.filter,
            'aria-pressed': 'false',
            text: skill.name,
            onclick: function () {
              setFilter(state.filter === skill.filter ? null : skill.filter, skill.name);
            },
          });
        })),
      ]);
    }));

    return section('skills', 'Навыки', [
      el('p', {
        class: 'section__note',
        text: 'Навык с точкой — кликабельный: страница оставит на виду те задачи и проекты, где он применялся.',
      }),
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
    if (!tag) return;

    var hits = $$('.bullet.is-hit').length + $$('.project.is-hit').length;
    status.appendChild(el('span', {
      text: hits
        ? state.filterLabel + ' — ' + hits + ' ' +
          plural(hits, ['совпадение', 'совпадения', 'совпадений'])
        : 'В опыте нет задач с этим навыком',
    }));
    status.appendChild(el('button', {
      class: 'btn', type: 'button', text: 'Сбросить',
      onclick: function () { setFilter(null, null); },
    }));
  }

  function plural(n, forms) {
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
    var edu = records('Образование', R.education, function (rec) {
      return el('div', { class: 'record' }, [
        el('span', { class: 'record__year', text: rec.year }),
        el('div', {}, [
          el('p', { class: 'record__title', text: rec.degree }),
          el('p', { class: 'record__place', text: rec.place }),
        ]),
      ]);
    });

    var courses = records('Повышение квалификации', R.courses, function (rec) {
      return el('div', { class: 'record' }, [
        el('span', { class: 'record__year', text: rec.year }),
        el('div', {}, [
          el('p', { class: 'record__title', text: rec.name }),
          el('p', { class: 'record__place', text: rec.place }),
        ]),
      ]);
    });

    courses.appendChild(el('div', { class: 'record' }, [
      el('span', { class: 'record__year', text: 'Языки' }),
      el('div', {}, R.languages.map(function (lang) {
        return el('p', { class: 'record__place', text: lang.name + ' — ' + lang.level });
      })),
    ]));

    return section('education', 'Образование', [
      el('div', { class: 'two-col enter' }, [edu, courses]),
    ]);
  }

  /* --- контакты ---------------------------------------------------------- */

  function buildContact() {
    var p = R.person;
    return el('section', { class: 'contact', id: 'contact' }, [
      el('div', { class: 'wrap' }, [
        el('p', { class: 'eyebrow', text: 'Открыт к предложениям' }),
        el('h2', { class: 'contact__title', text: 'Обсудим, что у вас работает вручную' }),
        el('p', {
          class: 'contact__text',
          text: 'Расскажите про процесс, который тормозит команду. Отвечу, за какой срок и какими средствами его получится автоматизировать — или честно скажу, что автоматизация здесь не нужна.',
        }),
        el('div', { class: 'contact__actions' }, [
          el('a', {
            class: 'btn btn--primary', href: p.contacts.telegram.href,
            target: '_blank', rel: 'noopener', text: p.contacts.telegram.label,
          }),
          el('a', { class: 'btn btn--ghost', href: p.contacts.email.href, text: 'Написать на почту' }),
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
        el('span', { text: R.person.name + ' · ' + R.person.city }),
        el('span', {}, [
          el('a', {
            href: 'https://github.com/akonyaev-ru/resume', target: '_blank', rel: 'noopener',
            text: 'Исходный код страницы',
          }),
        ]),
        el('span', { text: 'Обновлено ' + R.person.updated }),
      ]),
    ]);
  }

  /* --- поле символов ------------------------------------------------------ */

  /* Фон страницы — сплошная сетка моноширинных знаков: синтаксис кода вперемешку
     с юридическими символами. Сама по себе она едва различима; курсор освещает
     вокруг себя круг, где символы разгораются от индиго к мятному, а часть из
     них пересобирается. Без мыши поле живёт медленным мерцанием.

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
    var RADIUS = 172;          // радиус освещённого круга, px
    var BASE = '#8791ab';      // цвет спящего символа
    var BASE_ALPHA = 0.085;
    var ACCENT = '#7c7cff';
    var MINT = '#3ddc97';
    var FLICKER_MS = 130;      // как часто пересобираются случайные символы
    var FLICKER_COUNT = 5;

    var cols = 0;
    var rows = 0;
    var chars = [];
    var spot = null;
    var lastBox = null;
    var pending = false;

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

      lastBox = null;
      paintAll();
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

    /* Квадрат ячеек вокруг точки — область, которую нужно перерисовать. */
    function boxAt(point) {
      return {
        c0: Math.max(0, Math.floor((point.x - RADIUS) / CELL_W)),
        c1: Math.min(cols - 1, Math.ceil((point.x + RADIUS) / CELL_W)),
        r0: Math.max(0, Math.floor((point.y - RADIUS) / CELL_H)),
        r1: Math.min(rows - 1, Math.ceil((point.y + RADIUS) / CELL_H)),
      };
    }

    function merge(a, b) {
      if (!a) return b;
      if (!b) return a;
      return {
        c0: Math.min(a.c0, b.c0), c1: Math.max(a.c1, b.c1),
        r0: Math.min(a.r0, b.r0), r1: Math.max(a.r1, b.r1),
      };
    }

    function paintSpot() {
      pending = false;

      var box = merge(lastBox, spot ? boxAt(spot) : null);
      if (!box) return;

      ctx.clearRect(box.c0 * CELL_W, box.r0 * CELL_H,
        (box.c1 - box.c0 + 1) * CELL_W, (box.r1 - box.r0 + 1) * CELL_H);

      for (var row = box.r0; row <= box.r1; row += 1) {
        for (var col = box.c0; col <= box.c1; col += 1) {
          var alpha = BASE_ALPHA;
          var color = BASE;

          if (spot) {
            var dx = col * CELL_W + CELL_W / 2 - spot.x;
            var dy = row * CELL_H + CELL_H / 2 - spot.y;
            var near = 1 - Math.sqrt(dx * dx + dy * dy) / RADIUS;
            if (near > 0) {
              alpha = BASE_ALPHA + near * near * 1;
              color = near > 0.78 ? MINT : ACCENT;
            }
          }

          paintCell(col, row, alpha, color);
        }
      }

      ctx.globalAlpha = 1;
      lastBox = spot ? boxAt(spot) : null;
    }

    function request() {
      if (pending) return;
      pending = true;
      window.requestAnimationFrame(paintSpot);
    }

    build();
    window.addEventListener('resize', build);

    if (!FINE_POINTER) return;

    window.addEventListener('mousemove', function (event) {
      spot = { x: event.clientX, y: event.clientY };
      request();
    }, { passive: true });

    document.addEventListener('mouseleave', function () {
      spot = null;
      request();
    });

    if (LESS_MOTION) return;

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
        paintCell(col, row, BASE_ALPHA, BASE);
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
          a.classList.toggle('is-active', a.getAttribute('data-nav') === entry.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    NAV.forEach(function (item) {
      var node = document.getElementById(item[0]);
      if (node) spy.observe(node);
    });
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

  /* --- запуск ------------------------------------------------------------ */

  function init() {
    var app = $('#app');
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
    initField();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
