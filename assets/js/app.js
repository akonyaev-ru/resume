/* Сборка страницы из data/resume.js. Никаких зависимостей и сборщика. */
(function () {
  'use strict';

  var R = window.RESUME;
  var CFG = window.CONFIG || {};
  var STATS = window.STATS || { repos: {} };
  var LESS_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var state = {
    framing: readFraming(),
    filter: null,
  };

  /* --- мелкие помощники -------------------------------------------------- */

  function el(tag, props, kids) {
    var node = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (key) {
        var val = props[key];
        if (val === null || val === undefined || val === false) return;
        if (key === 'class') node.className = val;
        else if (key === 'text') node.textContent = val;
        else if (key === 'html') node.innerHTML = val;
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

  function readFraming() {
    var fromUrl = new URLSearchParams(location.search).get('v');
    if (fromUrl && R.framings[fromUrl]) return fromUrl;
    var saved = null;
    try { saved = localStorage.getItem('cv:framing'); } catch (e) { /* приватный режим */ }
    if (saved && R.framings[saved]) return saved;
    return CFG.defaultFraming || Object.keys(R.framings)[0];
  }

  function framing() { return R.framings[state.framing]; }

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
        el('div', { class: 'topbar__tools' }, [
          el('button', {
            class: 'btn', id: 'theme-btn', type: 'button',
            title: 'Оформление: авто, светлое, тёмное',
          }),
          el('button', {
            class: 'btn', type: 'button', text: 'PDF',
            title: 'Открыть окно печати — сохраните в PDF',
            onclick: function () { window.print(); },
          }),
        ]),
      ]),
    ]);
  }

  /* --- экран знакомства -------------------------------------------------- */

  function buildHero() {
    var p = R.person;

    var roleText = el('span', { class: 'redact', id: 'role-text', text: framing().title });
    var lede = el('p', { class: 'hero__lede', id: 'hero-lede', text: framing().lede });
    var hint = el('p', { class: 'framing__hint', id: 'framing-hint', text: framing().switchHint });

    var switcher = el('div', {
      class: 'framing', id: 'framing', role: 'group',
      'aria-label': 'Версия резюме',
    }, Object.keys(R.framings).map(function (key) {
      return el('button', {
        class: 'framing__btn',
        type: 'button',
        'data-framing': key,
        'aria-pressed': String(key === state.framing),
        text: R.framings[key].switchLabel,
        onclick: function () { setFraming(key); },
      });
    }));

    var actions = el('div', { class: 'hero__actions' }, [
      el('a', {
        class: 'btn btn--primary', href: p.contacts.telegram.href,
        target: '_blank', rel: 'noopener', text: 'Написать в Telegram',
      }),
      el('a', {
        class: 'btn btn--ghost', href: p.contacts.github.href,
        target: '_blank', rel: 'noopener', text: 'GitHub',
      }),
    ]);

    var left = el('div', {}, [
      el('p', { class: 'eyebrow', text: 'Резюме · обновлено ' + p.updated }),
      el('h1', { class: 'hero__name', text: p.name }),
      el('p', { class: 'hero__role' }, [roleText]),
      lede,
      switcher,
      hint,
      actions,
    ]);

    return el('section', { class: 'hero' }, [
      el('div', { class: 'wrap hero__grid' }, [left, buildFactsheet()]),
    ]);
  }

  function contactValue(contact, hidden) {
    if (!hidden) {
      return el('a', { href: contact.href, target: '_blank', rel: 'noopener', text: contact.label });
    }
    var bar = el('span', { class: 'redact', text: contact.label });
    var btn = el('button', {
      class: 'reveal', type: 'button', 'aria-label': 'Показать: ' + contact.label,
      onclick: function () {
        bar.style.setProperty('--rd-origin', 'right center');
        bar.classList.add('is-open');
        window.setTimeout(function () {
          var link = el('a', { href: contact.href, target: '_blank', rel: 'noopener', text: contact.label });
          if (btn.parentNode) btn.parentNode.replaceChild(link, btn);
        }, LESS_MOTION ? 0 : 620);
      },
    }, [bar]);
    return btn;
  }

  function buildFactsheet() {
    var p = R.person;
    var hidden = CFG.hideContacts !== false;

    var rows = [
      ['Город', el('span', { text: p.city + ' · ' + p.age + ' лет' })],
      ['Формат', el('span', { text: p.schedule + ' · ' + p.employment.toLowerCase() })],
      ['Переезд', el('span', { text: p.relocation })],
      ['Опыт', el('span', { text: p.experienceTotal })],
      ['Telegram', contactValue(p.contacts.telegram, false)],
      ['Почта', contactValue(p.contacts.email, hidden)],
      ['Телефон', contactValue(p.contacts.phone, hidden)],
    ];

    if (CFG.showSalary) rows.splice(4, 0, ['Ожидание', el('span', { text: p.salary })]);

    return el('aside', { class: 'factsheet enter' }, [
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

  /* --- результаты -------------------------------------------------------- */

  function buildMetrics() {
    var grid = el('div', { class: 'metrics enter' }, R.metrics.map(function (m) {
      var value = el('span', {
        class: 'metric__value',
        'data-value': String(m.value),
        'data-prefix': m.prefix || '',
        'data-suffix': m.suffix || '',
        text: (m.prefix || '') + '0' + (m.suffix || ''),
      });
      return el('div', { class: 'metric' + (m.accent ? ' metric--accent' : '') }, [
        value,
        el('span', { class: 'metric__caption', text: m.caption }),
        el('span', { class: 'metric__source', text: m.source }),
      ]);
    }));
    return section('results', 'Что изменилось после внедрений', [grid]);
  }

  /* --- подход ------------------------------------------------------------ */

  function buildApproach() {
    var about = el('p', { class: 'approach__text', id: 'about-text', text: framing().about });
    var quote = el('blockquote', { class: 'pullquote', id: 'pullquote', text: framing().pullquote });
    var specs = el('div', { class: 'spec-list', id: 'specs' }, framing().specializations.map(function (s) {
      return el('span', { class: 'spec', text: s });
    }));

    return section('approach', 'Подход', [
      el('div', { class: 'approach enter' }, [
        el('div', {}, [about, specs]),
        quote,
      ]),
    ]);
  }

  /* --- опыт -------------------------------------------------------------- */

  function buildJobs() {
    var list = el('div', { class: 'jobs', id: 'jobs' }, R.experience.map(function (job) {
      var meta = el('div', { class: 'job__meta' }, [
        el('span', { class: 'job__period', text: job.period }),
        el('span', { class: 'job__duration', text: job.duration }),
        job.current ? el('span', { class: 'job__now', text: 'сейчас' }) : null,
      ]);

      var bullets = el('ul', { class: 'job__bullets', 'data-bullets': job.company });

      return el('article', { class: 'job enter' }, [
        meta,
        el('div', {}, [
          el('h3', { class: 'job__company', text: job.company }),
          el('p', { class: 'job__role', text: job.role }),
          bullets,
        ]),
      ]);
    }));

    renderBullets(list);
    return section('experience', 'Опыт работы', [list]);
  }

  function renderBullets(root) {
    R.experience.forEach(function (job) {
      var host = root.querySelector('[data-bullets="' + job.company + '"]');
      if (!host) return;
      host.textContent = '';
      var order = (job.order && job.order[state.framing]) || job.bullets.map(function (b) { return b.id; });
      order.forEach(function (id) {
        var bullet = job.bullets.filter(function (b) { return b.id === id; })[0];
        if (!bullet) return;
        host.appendChild(el('li', {
          class: 'bullet',
          'data-tags': (bullet.tags || []).join(' '),
          text: bullet[state.framing],
        }));
      });
    });
    applyFilter();
  }

  /* --- проекты ----------------------------------------------------------- */

  function buildProjects() {
    var grid = el('div', { class: 'projects enter' }, R.projects.map(function (pr) {
      var stars = STATS.repos && STATS.repos[pr.repo];
      return el('article', {
        class: 'project',
        'data-tags': (pr.tags || []).join(' '),
      }, [
        el('div', { class: 'project__top' }, [
          el('h3', { class: 'project__name', text: pr.name }),
          typeof stars === 'number'
            ? el('span', { class: 'project__stars', text: '★ ' + stars })
            : null,
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
      el('p', { class: 'skills__hint', text: 'Обе программы выросли из рабочих задач: сначала нужны были мне, потом — команде.' }),
      grid,
    ]);
  }

  /* --- навыки ------------------------------------------------------------ */

  function buildSkills() {
    var groups = el('div', { class: 'skill-groups enter', id: 'skill-groups' });
    var status = el('div', { class: 'filter-status', id: 'filter-status' });

    var wrapper = section('skills', 'Навыки', [
      el('p', {
        class: 'skills__hint',
        text: 'Навык с точкой — кликабельный: страница оставит на виду те задачи, где он применялся.',
      }),
      groups,
      status,
    ]);

    renderSkills(groups);
    return wrapper;
  }

  function renderSkills(root) {
    root.textContent = '';
    R.skillGroups.forEach(function (group) {
      var skills = group.skills.filter(function (s) {
        return !s.in || s.in.indexOf(state.framing) !== -1;
      });
      if (!skills.length) return;

      root.appendChild(el('div', { class: 'skill-group' }, [
        el('h3', { class: 'skill-group__title', text: group.title }),
        el('div', { class: 'chips' }, skills.map(function (skill) {
          if (!skill.filter) return el('span', { class: 'chip', text: skill.name });
          return el('button', {
            class: 'chip',
            type: 'button',
            'data-filter': skill.filter,
            'aria-pressed': String(state.filter === skill.filter),
            text: skill.name,
            onclick: function () {
              setFilter(state.filter === skill.filter ? null : skill.filter, skill.name);
            },
          });
        })),
      ]));
    });
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
        ? 'Показано, где применялось: ' + state.filterLabel + ' — ' +
          hits + ' ' + plural(hits, ['совпадение', 'совпадения', 'совпадений'])
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

  function buildEducation() {
    var edu = el('div', {}, [
      el('h3', { class: 'skill-group__title', text: 'Образование' }),
    ].concat(R.education.map(function (rec) {
      return el('div', { class: 'record' }, [
        el('span', { class: 'record__year', text: rec.year }),
        el('div', {}, [
          el('p', { class: 'record__title', text: rec.degree }),
          el('p', { class: 'record__place', text: rec.place }),
        ]),
      ]);
    })));

    var courses = el('div', {}, [
      el('h3', { class: 'skill-group__title', text: 'Повышение квалификации' }),
    ].concat(R.courses.map(function (rec) {
      return el('div', { class: 'record' }, [
        el('span', { class: 'record__year', text: rec.year }),
        el('div', {}, [
          el('p', { class: 'record__title', text: rec.name }),
          el('p', { class: 'record__place', text: rec.place }),
        ]),
      ]);
    })).concat([
      el('div', { class: 'record' }, [
        el('span', { class: 'record__year', text: 'Языки' }),
        el('div', {}, R.languages.map(function (lang) {
          return el('p', { class: 'record__place', text: lang.name + ' — ' + lang.level });
        })),
      ]),
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
            target: '_blank', rel: 'noopener', text: 'Telegram ' + p.contacts.telegram.label,
          }),
          el('a', {
            class: 'btn btn--ghost', href: p.contacts.email.href, text: 'Написать на почту',
          }),
          el('button', {
            class: 'btn btn--ghost', type: 'button', text: 'Сохранить в PDF',
            onclick: function () { window.print(); },
          }),
        ]),
        el('p', { class: 'print-only fact__val', text: p.contacts.email.label + ' · ' + p.contacts.phone.label + ' · ' + p.contacts.telegram.label }),
      ]),
    ]);
  }

  function buildFooter() {
    return el('footer', { class: 'footer' }, [
      el('div', { class: 'wrap footer__inner' }, [
        el('span', { text: R.person.name + ' · ' + R.person.city }),
        el('span', {}, [
          el('a', { href: R.person.contacts.github.href, target: '_blank', rel: 'noopener', text: 'Исходный код страницы' }),
        ]),
        el('span', { text: 'Обновлено ' + R.person.updated }),
      ]),
    ]);
  }

  /* --- переключение рамки ------------------------------------------------ */

  function setFraming(key) {
    if (key === state.framing || !R.framings[key]) return;
    state.framing = key;

    try { localStorage.setItem('cv:framing', key); } catch (e) { /* приватный режим */ }
    var url = new URL(location.href);
    url.searchParams.set('v', key);
    history.replaceState(null, '', url);

    $$('#framing .framing__btn').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.getAttribute('data-framing') === key));
    });

    var f = framing();
    sweep($('#role-text'), f.title);

    $('#hero-lede').textContent = f.lede;
    $('#framing-hint').textContent = f.switchHint;
    $('#about-text').textContent = f.about;
    $('#pullquote').textContent = f.pullquote;

    var specs = $('#specs');
    specs.textContent = '';
    f.specializations.forEach(function (s) {
      specs.appendChild(el('span', { class: 'spec', text: s }));
    });

    renderBullets($('#jobs'));
    renderSkills($('#skill-groups'));
    setFilter(null, null);
  }

  /* Плашка проходит по строке слева направо и оставляет за собой новый текст. */
  function sweep(node, text) {
    if (!node) return;
    if (LESS_MOTION) {
      node.textContent = text;
      node.classList.add('is-open');
      return;
    }
    node.style.setProperty('--rd-origin', 'left center');
    node.classList.remove('is-open');
    window.setTimeout(function () {
      node.textContent = text;
      node.style.setProperty('--rd-origin', 'right center');
      node.classList.add('is-open');
    }, 620);
  }

  /* --- оформление -------------------------------------------------------- */

  var THEMES = [
    ['auto', 'Авто'],
    ['light', 'Светлая'],
    ['dark', 'Тёмная'],
  ];

  function initTheme() {
    var saved = 'auto';
    try { saved = localStorage.getItem('cv:theme') || 'auto'; } catch (e) { /* приватный режим */ }
    applyTheme(saved);

    $('#theme-btn').addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme') || 'auto';
      var idx = THEMES.map(function (t) { return t[0]; }).indexOf(current);
      applyTheme(THEMES[(idx + 1) % THEMES.length][0]);
    });
  }

  function applyTheme(name) {
    if (name === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', name);
    try { localStorage.setItem('cv:theme', name); } catch (e) { /* приватный режим */ }
    var label = THEMES.filter(function (t) { return t[0] === name; })[0];
    $('#theme-btn').textContent = label ? label[1] : 'Авто';
  }

  /* --- появление и счётчики ---------------------------------------------- */

  function initObservers() {
    if (!('IntersectionObserver' in window)) {
      $$('.enter').forEach(function (n) { n.classList.add('is-in'); });
      $$('.metric__value').forEach(function (n) { countTo(n, 1); });
      return;
    }

    var appear = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        appear.unobserve(entry.target);
        entry.target.querySelectorAll('.metric__value').forEach(function (value) {
          countTo(value);
        });
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });

    $$('.enter').forEach(function (n) { appear.observe(n); });

    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        $$('[data-nav]').forEach(function (link) {
          link.classList.toggle('is-active', link.getAttribute('data-nav') === entry.target.id);
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

    var duration = 900;
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

    var main = el('main', { id: 'main' }, [
      buildHero(),
      buildMetrics(),
      buildApproach(),
      buildJobs(),
      buildProjects(),
      buildSkills(),
      buildEducation(),
      buildContact(),
    ]);

    app.appendChild(main);
    app.appendChild(buildFooter());

    initTheme();
    initObservers();

    var role = $('#role-text');
    if (LESS_MOTION) {
      role.classList.add('is-open');
    } else {
      role.style.setProperty('--rd-origin', 'right center');
      window.setTimeout(function () { role.classList.add('is-open'); }, 420);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
