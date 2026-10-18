/*
 * Единственный источник содержания страницы.
 * Правка резюме = правка этого файла. Верстку трогать не нужно.
 *
 * Строки, которые переводятся, записаны парой { ru, en }. Все остальное —
 * даты, цифры, ссылки — общее для обоих языков, чтобы версии
 * не разъезжались по фактам.
 */

window.CONFIG = {
  // Язык по умолчанию: 'ru' или 'en'. Английская версия страницы лежит по
  // отдельному адресу `en.html`; ссылка `?lang=en` тоже продолжает работать.
  defaultLang: 'ru',
};

window.RESUME = {
  // Подписи интерфейса. Содержание резюме — ниже, в остальных разделах.
  ui: {
    nav: {
      results: { ru: 'Результаты', en: 'Impact' },
      experience: { ru: 'Опыт', en: 'Experience' },
      projects: { ru: 'Проекты', en: 'Projects' },
      skills: { ru: 'Навыки', en: 'Skills' },
      education: { ru: 'Образование', en: 'Education' },
      contact: { ru: 'Контакты', en: 'Contact' },
    },
    // Имя меню для экранного диктора (до 5.77 он читал «[object Object]»).
    navLabel: { ru: 'Разделы страницы', en: 'Page sections' },
    eyebrow: { ru: 'Резюме · обновлено', en: 'CV · updated' },
    factCity: { ru: 'Город', en: 'Based in' },
    factFormat: { ru: 'Формат', en: 'Format' },
    factRelocation: { ru: 'Переезд', en: 'Relocation' },
    factExperience: { ru: 'Опыт', en: 'Experience' },
    factEmail: { ru: 'Почта', en: 'Email' },
    factsLabel: {
      ru: 'Ключевые сведения, прокручиваемая полоса',
      en: 'Key facts, scrollable strip',
    },
    // Формы числа — для 1, 2–4 и 5+ (в английском две последние совпадают).
    // Сроки работы и общий стаж страница считает из дат `start` / `end`.
    ageForms: { ru: ['год', 'года', 'лет'], en: ['year old', 'years old', 'years old'] },
    yearForms: { ru: ['год', 'года', 'лет'], en: ['year', 'years', 'years'] },
    monthForms: { ru: ['месяц', 'месяца', 'месяцев'], en: ['month', 'months', 'months'] },
    resultsTitle: { ru: 'Что изменилось после внедрений', en: 'What changed after the rollouts' },
    resultsNote: {
      ru: 'За полтора года на текущем месте работы.',
      en: 'Over a year and a half at my current job.',
    },
    approachTitle: { ru: 'Подход', en: 'Approach' },
    experienceTitle: { ru: 'Опыт работы', en: 'Experience' },
    now: { ru: 'сейчас', en: 'now' },
    // уровень на ледяной шкале опыта (5.98): «ур. 3» у текущего места, в подписи ссылки места — у каждого
    level: { ru: 'ур.', en: 'Lv' },
    projectsTitle: { ru: 'Собственные продукты', en: 'My own products' },
    projectsNote: {
      ru: 'Программы выросли из настоящих задач: две — из рабочих, сначала для меня, потом для команды; третья — из семейной.',
      en: 'These programs grew out of real tasks: two from work, first for me and then for the team; the third from family life.',
    },
    openOnGithub: { ru: 'Открыть на GitHub →', en: 'Open on GitHub →' },
    // колода продуктов: стрелки и подпись «1 из 3» для чтения с экрана
    deckPrev: { ru: 'Предыдущий продукт', en: 'Previous product' },
    deckNext: { ru: 'Следующий продукт', en: 'Next product' },
    deckOf: { ru: 'из', en: 'of' },
    deckRole: { ru: 'карусель', en: 'carousel' },
    releaseLabel: { ru: 'Выпуск', en: 'Release' },
    skillsTitle: { ru: 'Навыки', en: 'Skills' },
    // Окно терминала: подписи шапки и команд. Формы множественного числа —
    // для 1, 2–4 и 5+ (в английском две последние совпадают).
    termHost: 'alexey@legalops',
    termPath: '~/skills',
    termGroups: { ru: ['группа', 'группы', 'групп'], en: ['group', 'groups', 'groups'] },
    termSkills: { ru: ['навык', 'навыка', 'навыков'], en: ['skill', 'skills', 'skills'] },
    termHint: { ru: 'Щелкните по команде, чтобы оставить одну группу', en: 'Click a command to keep one group' },
    // Имя кнопки --all для скринридера (5.86): синтаксис команды от диктора спрятан.
    allGroups: { ru: 'Все группы', en: 'All groups' },
    educationTitle: { ru: 'Образование', en: 'Education' },
    // Подзаголовок вузов: второй «Образование» под заголовком раздела повторял его.
    degreesTitle: { ru: 'Высшее', en: 'Degrees' },
    coursesTitle: { ru: 'Повышение квалификации', en: 'Professional training' },
    languagesTitle: { ru: 'Языки', en: 'Languages' },
    contactEyebrow: { ru: 'Открыт к предложениям', en: 'Open to offers' },
    contactTitle: {
      ru: 'Обсудим, что у вас работает вручную',
      en: 'Let’s talk about what you still do by hand',
    },
    contactText: {
      ru: 'Расскажите про процесс, который тормозит команду. Отвечу, за какой срок и какими средствами его получится автоматизировать — или честно скажу, что автоматизация здесь не нужна.',
      en: 'Tell me about the process that slows your team down. I’ll tell you how long it would take to automate and with what tools — or say plainly that automation is not the answer here.',
    },
    writeEmail: { ru: 'Написать на почту', en: 'Send an email' },
    sourceCode: { ru: 'Исходный код страницы', en: 'Source code of this page' },
    // 17.10.2026: лицензия репозитория — графика CC BY-NC 4.0 с указанием автора, код MIT (LICENSE в корне)
    license: { ru: '© графика — CC BY-NC 4.0, код — MIT', en: '© graphics — CC BY-NC 4.0, code — MIT' },
    updatedAt: { ru: 'Обновлено', en: 'Updated' },
    langLabel: { ru: 'Язык страницы', en: 'Page language' },
    docTitle: { ru: 'Алексей Коняев — резюме, классическая версия', en: 'Alexey Konyaev — CV, classic version' },
  },

  person: {
    name: { ru: 'Алексей Коняев', en: 'Alexey Konyaev' },
    role: {
      // \n — явный перенос: первая строка «Специалист по LegalOPS», вторая — остальное.
      // На узком экране перенос снимается стилями, строки ложатся сами.
      ru: 'Специалист по LegalOPS\nи внедрению AI-агентов',
      en: 'LegalOPS and AI-agent\nimplementation specialist',
    },
    // Термины, которые подсвечиваются акцентом внутри заголовка. Порядок важен:
    // roleNode ищет их последовательно, отрезая уже разобранное начало.
    roleAccent: {
      ru: ['LegalOPS', 'AI-агентов'],
      en: ['LegalOPS', 'AI-agent'],
    },
    photo: 'assets/img/portrait.webp',
    age: 25,
    city: { ru: 'Москва', en: 'Moscow' },
    updated: { ru: '2 октября 2026', en: '2 October 2026' },
    employment: { ru: 'полная занятость', en: 'full-time' },
    schedule: { ru: 'Удаленно или гибрид', en: 'Remote or hybrid' },
    relocation: {
      ru: 'Без переезда, редкие командировки',
      en: 'No relocation, occasional trips',
    },
    specializations: {
      ru: ['Юрист', 'Бизнес-аналитик'],
      en: ['Lawyer', 'Business analyst'],
    },
    lede: {
      // Неразрывный дефис (\u2011): на 360–414 px строка рвалась на «AI-» / «агентов».
      ru: 'Перевожу ручные процессы на AI\u2011агентов — и\u00A0сам пишу то, что для этого нужно.',
      en: 'I move manual processes onto AI agents — and write what that takes myself.',
    },
    about: {
      ru: 'Автоматизирую ручные бизнес-процессы: нахожу узкие места, собираю требования от заказчиков, формирую техническое задание и довожу решение до работающего результата — по расписанию, событию или заданному условию, — а затем обучаю команду и закрепляю процесс регламентом. Объединяю понимание бизнес-логики с техническими компетенциями: Python, API, интеграция LLM. За полтора года на текущем месте: 6 ИИ-агентов на базе Claude в ежедневной работе 8 человек (типовые задачи −70%) и еще 3 — в отделе продаж, роботизированное согласование договоров в Битрикс24 (SLA −60%), деперсонализация данных перед LLM по 152-ФЗ (ручная подготовка −95%), политика безопасного использования ИИ в контуре компании.',
      en: 'I automate manual business processes: I find the bottlenecks, gather requirements from the business, write the specification and carry the solution through to a working result — on a schedule, on an event or on a set condition — then train the team and lock the process in with a policy. I combine an understanding of business logic with technical skills: Python, APIs, LLM integration. In a year and a half at my current job: six Claude-based AI agents in the daily work of eight people (routine tasks −70%) and three more in the sales department, robotised contract approval in Bitrix24 (SLA −60%), de-identification of data before it reaches an LLM under the personal data law (manual preparation −95%), and a policy for safe AI use inside the company.',
    },
    pullquote: {
      ru: 'Результатом считаю не внедренный инструмент, а процесс, который после меня работает без меня, и измеряю его в сокращенных трудозатратах и сроках.',
      en: 'The result is not a tool that got deployed but a process that keeps running once I am gone, and I measure it in labour and time saved.',
    },
    contacts: {
      telegram: {
        label: { ru: 'Написать в Telegram', en: 'Message on Telegram' },
        href: 'https://t.me/konyaev929',
      },
      email: { label: 'inbox@akonyaev.ru', href: 'mailto:inbox@akonyaev.ru' },
      github: { label: 'github.com/akonyaev-ru', href: 'https://github.com/akonyaev-ru' },
    },
  },

  // Результаты текущего места работы. Цифры ГалВента и Дом-Профи живут в
  // разделе «Опыт» — в общей ленте они смешивали разные периоды.
  // value анимируется от нуля, поэтому число отделено от префикса и суффикса.
  metrics: [
    {
      value: 60, prefix: '−', suffix: '%',
      caption: { ru: 'SLA согласования договоров', en: 'contract approval SLA' },
    },
    {
      value: 95, prefix: '−', suffix: '%',
      caption: { ru: 'времени на подготовку документов', en: 'time spent preparing documents' },
    },
    {
      value: 70, prefix: '−', suffix: '%',
      caption: { ru: 'времени на типовые задачи', en: 'time on routine tasks' },
    },
    {
      value: 80, suffix: '%',
      caption: { ru: 'ручного ввода убрано из отчетности', en: 'of manual entry removed from reporting' },
    },
  ],

  // start / end — в формате ГГГГ-ММ, end: null означает «по настоящее время».
  // Из них страница считает шкалу опыта, срок каждого места и общий стаж —
  // вписывать «1 год 7 месяцев» руками не нужно, такие строки устаревали.
  // short — короткое имя для подписи на шкале, где полное не помещается; в
  // карточке места остаётся полное. Языка нет в short — на шкале полное.
  experience: [
    {
      company: { ru: 'Айковер ПРО', en: 'iCover PRO' },
      role: {
        ru: 'Специалист по автоматизации и искусственному интеллекту',
        en: 'Automation and artificial intelligence specialist',
      },
      period: { ru: 'Март 2025 — настоящее время', en: 'March 2025 — present' },
      start: '2025-03',
      end: null,
      current: true,
      // `bold` — результат пункта полужирным (5.95, правка №5 Дизайнера; владелец: «Мне нравится 5»; с 5.96 — и у
      // ГалВента и Дом-Профи): фраза дословно из текста пункта на каждом языке, текст не меняется; выделяется только
      // измеримый результат. Сверяет tools/check_static.js.
      bullets: [
        {
          text: {
            ru: 'Внедрил 6 ИИ-агентов на базе Claude в ежедневную работу команды из 8 человек: разбор и сверка документов, подготовка типовых материалов, контроль регламентных сроков, агент подготовки проектов документов с базой знаний по накопленной практике. Время на типовые задачи сокращено на 70%.',
            en: 'Rolled out six Claude-based AI agents into the daily work of a team of eight: parsing and cross-checking documents, drafting standard materials, tracking statutory deadlines, and an agent that drafts documents from a knowledge base of accumulated practice. Time on routine tasks cut by 70%.',
          },
          bold: { ru: 'Время на типовые задачи сокращено на 70%', en: 'Time on routine tasks cut by 70%' },
        },
        {
          text: {
            ru: 'Внедрил в отделе продаж 3 ИИ-агента (презентации, аналитика маркетплейсов, дашборды) и обучил сотрудников: отдел перешел с Google-таблиц на внутренние веб-приложения на Apps Script, время подготовки презентации сокращено на 94%.',
            en: 'Rolled out three AI agents in the sales department (presentations, marketplace analytics, dashboards) and trained the staff: the department moved from Google Sheets to internal web apps on Apps Script; time to prepare a presentation cut by 94%.',
          },
          bold: { ru: 'время подготовки презентации сокращено на 94%', en: 'time to prepare a presentation cut by 94%' },
        },
        {
          text: {
            ru: 'Вел бэклог задач автоматизации в Jira с приоритизацией по эффекту и трудозатратам: собирал требования от заказчиков, формировал техническое задание на ИИ-агентов, собирал прототип, тестировал на реальных данных, обкатывал на пилотной группе и передавал пользователям — этот цикл прошли все шесть агентов. Эффект замерял по BI-дашбордам на данных Битрикс24: убрал 80% ручного ввода в отчетности, вывел KPI в реальном времени.',
            en: 'Ran the automation backlog in Jira, prioritised by impact against effort: gathered requirements from the business, wrote the specifications for the AI agents, built the prototype, tested it on real data, ran it past a pilot group and handed it over to users — all six agents went through this cycle. Measured the effect on BI dashboards built on Bitrix24 data: removed 80% of manual entry from reporting, put KPIs on a real-time view.',
          },
          bold: { ru: 'убрал 80% ручного ввода в отчетности', en: 'removed 80% of manual entry from reporting' },
        },
        {
          text: {
            ru: 'Спроектировал и внедрил корпоративную архитектуру безопасного использования LLM (Claude Code, Codex) во внутреннем контуре компании: разграничение доступов, логирование запросов, требования информационной безопасности к ИИ-решениям. Написал регламент использования ИИ и инструкции по работе с агентами с приложениями по каждому агенту; обучил 8 пользователей.',
            en: 'Designed and rolled out a corporate architecture for safe LLM use (Claude Code, Codex) inside the company perimeter: access separation, request logging, information security requirements for AI solutions. Wrote the AI use policy and the agent manuals with an appendix per agent; trained eight users.',
          },
        },
        {
          text: {
            ru: 'Разработал middleware на Python для автоматической деперсонализации данных перед отправкой в LLM: закрыл риски по 152-ФЗ и утечке коммерческой тайны, ручная подготовка документов сокращена на 95%.',
            en: 'Built Python middleware that de-identifies data automatically before it goes to an LLM: closed the risks under the personal data law and trade secret leaks; manual document preparation cut by 95%.',
          },
          bold: { ru: 'ручная подготовка документов сокращена на 95%', en: 'manual document preparation cut by 95%' },
        },
        {
          text: {
            ru: 'Автоматизировал сквозной бизнес-процесс согласования договоров в Битрикс24: описал процесс AS IS / TO BE, расшил узкие места в маршруте, перестроил проверку контрагентов, статусы, уведомления и контроль сроков; согласовал целевой процесс с коммерческим блоком и провел презентацию результатов руководству. SLA согласования сокращен на 60%, коммерческий цикл компании ускорен.',
            en: 'Automated the end-to-end contract approval process in Bitrix24: mapped the process as is / to be, cleared the bottlenecks in the route, rebuilt counterparty screening, statuses, notifications and deadline control; agreed the target process with the commercial team and presented the results to management. Approval SLA cut by 60%, the company’s commercial cycle sped up.',
          },
          bold: { ru: 'SLA согласования сокращен на 60%', en: 'Approval SLA cut by 60%' },
        },
      ],
    },
    {
      company: { ru: 'Фабрика Вентиляции ГалВент', en: 'GalVent Ventilation Factory' },
      short: { ru: 'ГалВент' },
      role: { ru: 'Юрисконсульт', en: 'Legal counsel' },
      period: { ru: 'Июнь 2024 — Декабрь 2024', en: 'June 2024 — December 2024' },
      start: '2024-06',
      end: '2024-12',
      bullets: [
        {
          text: {
            ru: 'Оцифровал договорную работу по гособоронзаказу: сквозной реестр контрактов с контролем сроков и обязательств вместо разрозненных файлов — единая картина портфеля для руководства.',
            en: 'Digitised contract work under the defence procurement programme: built a single register of contracts with deadline and obligation tracking, replacing scattered files. Gave management one view of the portfolio.',
          },
        },
        {
          text: {
            ru: 'Выстроил комплаенс-контроль по 275-ФЗ (ГОЗ): плановая проверка прокуратуры пройдена с 0 замечаний, многомиллионные штрафы предотвращены.',
            en: 'Set up compliance control under the defence procurement law: the scheduled prosecutor audit passed with zero findings, multi-million fines averted.',
          },
          bold: { ru: 'плановая проверка прокуратуры пройдена с 0 замечаний', en: 'the scheduled prosecutor audit passed with zero findings' },
        },
        {
          text: {
            ru: 'Стандартизировал претензионно-исковую работу и взыскание дебиторской задолженности: единый регламент, контроль стадий, отчетность по статусам; полный цикл от претензии до арбитражного суда, ФССП и банков. Выиграно 6 из 6 дел, взыскано свыше 12 000 000 ₽.',
            en: 'Standardised claims and receivables recovery: one set of rules, stage tracking, status reporting; the full cycle from claim letter to commercial court, bailiffs and banks. Won 6 cases out of 6, recovered over 12,000,000 ₽.',
          },
          bold: { ru: 'Выиграно 6 из 6 дел, взыскано свыше 12 000 000 ₽', en: 'Won 6 cases out of 6, recovered over 12,000,000 ₽' },
        },
      ],
    },
    {
      company: { ru: 'Дом-Профи', en: 'Dom-Profi' },
      role: { ru: 'Юрист', en: 'Lawyer' },
      period: { ru: 'Январь 2024 — Май 2024', en: 'January 2024 — May 2024' },
      start: '2024-01',
      end: '2024-05',
      bullets: [
        {
          text: {
            ru: 'Автоматизировал массовое приказное производство: разработал конструктор заявлений о выдаче судебных приказов (ст. 122 ГПК) — шаблонизация, автозаполнение из реестра, пакетная выгрузка для подачи мировым судьям. Трудозатраты отдела сокращены в 3 раза.',
            en: 'Automated high-volume court order proceedings: built a generator for court order applications (art. 122 of the Civil Procedure Code) — templating, autofill from a register, batch export for filing with magistrates. Department routine workload cut threefold.',
          },
          bold: { ru: 'Трудозатраты отдела сокращены в 3 раза', en: 'Department routine workload cut threefold' },
        },
        {
          text: {
            ru: 'Выстроил цифровые каналы взаимодействия с банками и ФССП, минимизировав сроки фактического получения средств по исполнительным листам.',
            en: 'Set up digital channels with banks and the bailiff service, cutting the time it actually takes to collect on writs of execution.',
          },
        },
      ],
    },
    {
      company: { ru: 'ИП Коняев Алексей Алексеевич', en: 'Sole proprietor Alexey Konyaev' },
      role: {
        ru: 'Консультант по безопасному использованию ИИ',
        en: 'Consultant on safe AI use',
      },
      period: { ru: 'Июль 2023 — настоящее время', en: 'July 2023 — present' },
      start: '2023-07',
      end: null,
      current: true,
      // Практика идет параллельно основным местам: на шкале опыта отрезок
      // лег бы поверх всех остальных во всю ширину. Карточка в списке есть,
      // на шкалу запись не выводится.
      parallel: true,
      bullets: [
        {
          text: {
            ru: 'Консультировал 4 компании по безопасному использованию ИИ-инструментов и защите персональных данных (152-ФЗ): требования к обработке данных перед передачей в LLM, регламенты использования ИИ.',
            en: 'Advised four companies on safe use of AI tools and personal data protection: requirements for handling data before it goes to an LLM, internal AI-use policies.',
          },
        },
      ],
    },
  ],

  projects: [
    {
      name: 'Umbra',
      repo: 'akonyaev-ru/Umbra',
      tagline: {
        ru: 'Анонимайзер документов, работающий офлайн',
        en: 'Document anonymiser that runs offline',
      },
      description: {
        ru: 'Находит персональные данные в договорах и заменяет их метками вида [ФИО_1], чтобы документ можно было отдать нейросети без нарушения 152-ФЗ и NDA. Ответ модели восстанавливается обратно по криптографическому паспорту. Для PDF накладывает настоящие черные плашки, вычищая данные из метаданных и скрытых слоев.',
        en: 'Finds personal data in contracts and swaps it for labels like [NAME_1], so the document can go to a neural network without breaching data protection law or an NDA. The model reply is restored through a cryptographic passport. For PDFs it lays down real black bars, wiping the data out of metadata and hidden layers.',
      },
      stack: ['Python', 'slovnet', 'PyQt', 'Windows · macOS · Linux'],
      link: 'https://github.com/akonyaev-ru/Umbra',
    },
    {
      name: 'Hunter CLI',
      repo: 'akonyaev-ru/HunterCLI',
      tagline: { ru: 'Автопилот резюме в консоли', en: 'CV autopilot in the console' },
      description: {
        ru: 'Спрашивает у сервиса точное время, когда очередное поднятие резюме разрешено, ждет этот момент, добавляет случайную задержку и поднимает резюме без участия человека. Считает просмотры и приглашения по неделям, ведет до восьми аккаунтов одновременно.',
        en: 'Asks the job board exactly when the next CV bump is allowed, waits for that moment, adds a random delay and bumps the CV with no human involved. Counts views and interview invitations week by week, and runs up to eight accounts at once.',
      },
      stack: ['Python', 'TUI', 'OAuth', 'HH API'],
      link: 'https://github.com/akonyaev-ru/HunterCLI',
    },
    {
      // Имя — латиницей на обеих версиях, как у репозитория и файла выпуска (5.94, владелец: «Мы же на англ
      // договорились»; в 5.92 латиница была только в английской).
      name: 'Sadoviy Pomoshnik',
      repo: 'akonyaev-ru/Sadoviy-Pomoshnik',
      tagline: {
        ru: 'Помощник для браузерной игры „Садовая империя“',
        en: 'Helper for the browser game Molehill Empire',
      },
      description: {
        ru: 'Ставит прямо в игру кнопки-гномов: полить весь сад, засеять свободные клетки, собрать созревшее, выставить товар на рынок, разослать птиц и пчёл по заказам. Программа для Windows без установки и расширений браузера: свой код доставляет в игру по отладочному протоколу браузера. Ничего не делает без нажатия.',
        en: 'Puts gnome buttons right into the game: water the whole garden, sow the empty plots, harvest what is ripe, put goods on the market, send birds and bees out to their orders. A Windows program with no installer and no browser extension: it delivers its own code into the game over the browser debugging protocol. Nothing happens without a click.',
      },
      stack: ['Python', 'JavaScript', 'Chrome DevTools Protocol', 'Windows'],
      link: 'https://github.com/akonyaev-ru/Sadoviy-Pomoshnik',
    },
  ],

  skillGroups: [
    // `flag` — имя группы в команде `skills --group <flag>`; общее для языков.
    {
      title: { ru: 'Юридическая практика', en: 'Legal practice' },
      flag: 'legal',
      skills: [
        { name: { ru: 'Договорная работа', en: 'Contract work' } },
        { name: { ru: 'Претензионно-исковая работа', en: 'Claims and litigation' } },
        { name: { ru: 'Проверка контрагентов', en: 'Counterparty screening' } },
        { name: { ru: 'Комплаенс 275-ФЗ (ГОЗ)', en: 'Defence procurement compliance' } },
        { name: { ru: 'Защита персональных данных (152-ФЗ)', en: 'Personal data protection' } },
        { name: { ru: 'КонсультантПлюс', en: 'ConsultantPlus' } },
      ],
    },
    {
      title: { ru: 'Процессы и системы', en: 'Processes and systems' },
      flag: 'process',
      skills: [
        { name: { ru: 'Автоматизация юридической функции', en: 'Legal function automation' } },
        { name: { ru: 'Описание процессов AS IS / TO BE', en: 'Process mapping AS IS / TO BE' } },
        { name: { ru: 'Бизнес-требования и ТЗ', en: 'Business requirements and specifications' } },
        { name: { ru: 'Базы знаний', en: 'Knowledge bases' } },
        { name: { ru: 'Битрикс24', en: 'Bitrix24' } },
        { name: 'Jira' },
        { name: { ru: '1С:ERP', en: '1C:ERP' } },   // по-английски — латинская C (18.10, английский офис)
        { name: { ru: '1С:УТ', en: '1C:Trade' } },
        { name: { ru: 'Диадок (ЭДО)', en: 'Diadoc (e-document exchange)' } },
      ],
    },
    {
      title: { ru: 'Данные и безопасность', en: 'Data and security' },
      flag: 'data',
      skills: [
        { name: { ru: 'BI-дашборды', en: 'BI dashboards' } },
        { name: 'Google Sheets' },
        { name: 'MS Excel' },
        { name: { ru: 'Деперсонализация данных', en: 'Data de-identification' } },
        { name: { ru: 'Информационная безопасность', en: 'Information security' } },
      ],
    },
    {
      title: { ru: 'Разработка и интеграции', en: 'Development and integrations' },
      flag: 'dev',
      skills: [
        { name: 'Python' },
        { name: 'API' },
        { name: 'Apps Script' },
        { name: 'n8n' },
        { name: 'RPA' },
        { name: { ru: 'No-code платформы', en: 'No-code platforms' } },
      ],
    },
    {
      title: { ru: 'Искусственный интеллект', en: 'Artificial intelligence' },
      flag: 'ai',
      skills: [
        { name: { ru: 'ИИ-агенты', en: 'AI agents' } },
        { name: 'Claude' },
        { name: 'ChatGPT' },
        { name: 'Prompt Engineering' },
        { name: 'RAG' },
      ],
    },
  ],

  education: [
    {
      year: '2026',
      degree: { ru: 'Магистр юриспруденции', en: 'Master of Laws' },
      place: {
        ru: 'Российский государственный гуманитарный университет',
        en: 'Russian State University for the Humanities',
      },
    },
    {
      year: '2023',
      degree: { ru: 'Бакалавр юриспруденции', en: 'Bachelor of Laws' },
      place: {
        ru: 'Институт экономики и культуры',
        en: 'Institute of Economics and Culture',
      },
    },
  ],

  courses: [
    {
      year: '2026',
      name: {
        ru: 'LegalTech: автоматизация рутины юриста',
        en: 'LegalTech: automating a lawyer’s routine',
      },
      place: 'Legal Academy',
    },
    {
      year: '2026',
      name: {
        ru: 'Применение ИИ в профессиональной деятельности',
        en: 'Applying AI in professional practice',
      },
      place: {
        ru: 'Российский государственный гуманитарный университет',
        en: 'Russian State University for the Humanities',
      },
    },
  ],

  languages: [
    { name: { ru: 'Русский', en: 'Russian' }, level: { ru: 'родной', en: 'native' } },
    { name: { ru: 'Английский', en: 'English' }, level: { ru: 'B1, средний', en: 'B1, intermediate' } },
  ],
};
