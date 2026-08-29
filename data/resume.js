/*
 * Единственный источник содержания страницы.
 * Правка резюме = правка этого файла. Вёрстку трогать не нужно.
 *
 * Строки, которые переводятся, записаны парой { ru, en }. Всё остальное —
 * даты, цифры, ссылки, теги фильтра — общее для обоих языков, чтобы версии
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
    eyebrow: { ru: 'Резюме · обновлено', en: 'CV · updated' },
    factCity: { ru: 'Город', en: 'Based in' },
    factFormat: { ru: 'Формат', en: 'Format' },
    factRelocation: { ru: 'Переезд', en: 'Relocation' },
    factExperience: { ru: 'Опыт', en: 'Experience' },
    factEmail: { ru: 'Почта', en: 'Email' },
    years: { ru: 'лет', en: 'years old' },
    resultsTitle: { ru: 'Что изменилось после внедрений', en: 'What changed after the rollouts' },
    resultsNote: {
      ru: 'За полтора года на текущем месте работы.',
      en: 'Over a year and a half at my current job.',
    },
    approachTitle: { ru: 'Подход', en: 'Approach' },
    experienceTitle: { ru: 'Опыт работы', en: 'Experience' },
    now: { ru: 'сейчас', en: 'now' },
    projectsTitle: { ru: 'Собственные продукты', en: 'My own products' },
    projectsNote: {
      ru: 'Обе программы выросли из рабочих задач: сначала нужны были мне, потом — команде.',
      en: 'Both grew out of real work: first I needed them, then the team did.',
    },
    openOnGithub: { ru: 'Открыть на GitHub →', en: 'Open on GitHub →' },
    skillsTitle: { ru: 'Навыки', en: 'Skills' },
    skillsNote: {
      ru: 'Навык с точкой — кликабельный: страница оставит на виду те задачи и проекты, где он применялся.',
      en: 'A skill with a dot is clickable: the page keeps only the work where it was used.',
    },
    noMatches: { ru: 'В опыте нет задач с этим навыком', en: 'No work listed for this skill' },
    reset: { ru: 'Сбросить', en: 'Reset' },
    matchForms: { ru: ['совпадение', 'совпадения', 'совпадений'], en: ['match', 'matches'] },
    educationTitle: { ru: 'Образование', en: 'Education' },
    coursesTitle: { ru: 'Повышение квалификации', en: 'Professional training' },
    languagesTitle: { ru: 'Языки', en: 'Languages' },
    contactEyebrow: { ru: 'Открыт к предложениям', en: 'Open to offers' },
    contactTitle: {
      ru: 'Обсудим, что у вас работает вручную',
      en: 'Let us talk about what you still do by hand',
    },
    contactText: {
      ru: 'Расскажите про процесс, который тормозит команду. Отвечу, за какой срок и какими средствами его получится автоматизировать — или честно скажу, что автоматизация здесь не нужна.',
      en: 'Tell me about the process that slows your team down. I will tell you how long automating it would take and what it would take — or say plainly that automation is not the answer here.',
    },
    writeEmail: { ru: 'Написать на почту', en: 'Send an email' },
    sourceCode: { ru: 'Исходный код страницы', en: 'Source code of this page' },
    updatedAt: { ru: 'Обновлено', en: 'Updated' },
    langLabel: { ru: 'Язык страницы', en: 'Page language' },
    docTitle: { ru: 'Резюме Алексея Коняева', en: 'Alexey Konyaev — CV' },
  },

  person: {
    name: { ru: 'Алексей Коняев', en: 'Alexey Konyaev' },
    role: {
      ru: 'Специалист по LegalOPS и AI-разработке',
      en: 'LegalOPS and AI engineering specialist',
    },
    // Термины, которые подсвечиваются акцентом внутри заголовка.
    roleAccent: { ru: ['LegalOPS', 'AI-разработке'], en: ['LegalOPS', 'AI engineering'] },
    photo: 'assets/img/portrait.webp',
    age: 25,
    city: { ru: 'Москва', en: 'Moscow' },
    github: 'akonyaev-ru',
    updated: { ru: '29 августа 2026', en: '29 August 2026' },
    experienceTotal: { ru: '2 года 6 месяцев', en: '2 years 6 months' },
    employment: { ru: 'полная занятость', en: 'full-time' },
    schedule: { ru: 'Удалённо или гибрид', en: 'Remote or hybrid' },
    relocation: {
      ru: 'Без переезда, редкие командировки',
      en: 'No relocation, occasional trips',
    },
    specializations: {
      ru: ['Бизнес-аналитик', 'Юрист', 'Менеджер продукта'],
      en: ['Business analyst', 'Lawyer', 'Product manager'],
    },
    lede: {
      ru: 'Перевожу юридические и операционные процессы из ручного режима в автоматический — и сам пишу то, что для этого нужно.',
      en: 'I move legal and operational processes out of manual mode into automatic — and write what that takes myself.',
    },
    about: {
      ru: 'Объединяю юридическую экспертизу — два профильных образования и практику в договорной, претензионной и судебной работе — с техническими компетенциями: Python, API, интеграция LLM-моделей. Описываю процессы AS IS / TO BE, собираю требования от юристов и довожу их до работающей функциональности. Роботизировал согласование договоров, внедрил AI-агентов на базе Claude, разработал политику безопасного использования ИИ в контуре компании (Information Governance). Способен и спроектировать архитектуру автоматизации, и реализовать её руками — от постановки задачи до пользовательского тестирования.',
      en: 'I combine legal expertise — two law degrees and hands-on practice in contract, pre-litigation and court work — with technical skills: Python, APIs, LLM integration. I map processes AS IS / TO BE, gather requirements from lawyers and carry them through to working functionality. I robotised contract approval, rolled out Claude-based AI agents and wrote the policy for safe use of AI inside the company (information governance). I can both design the automation architecture and build it myself, from framing the task to user testing.',
    },
    pullquote: {
      ru: 'Результат — не внедрённый инструмент, а процесс, который после меня работает без меня.',
      en: 'The result is not a tool that got deployed. It is a process that keeps running once I am gone.',
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
      value: 70, suffix: '%',
      caption: { ru: 'FTE высвобождено от рутины', en: 'of FTE freed from routine' },
    },
    {
      value: 80, suffix: '%',
      caption: { ru: 'ручного ввода убрано из отчётности', en: 'of manual entry removed from reporting' },
    },
  ],

  // start / end — для шкалы опыта, в формате ГГГГ-ММ. end: null означает
  // «по настоящее время».
  experience: [
    {
      company: { ru: 'Айковер ПРО', en: 'iCover PRO' },
      role: {
        ru: 'Юрист по автоматизации и искусственному интеллекту',
        en: 'Legal counsel for automation and artificial intelligence',
      },
      period: { ru: 'Март 2025 — настоящее время', en: 'March 2025 — present' },
      duration: { ru: '1 год 6 месяцев', en: '1 year 6 months' },
      start: '2025-03',
      end: null,
      current: true,
      bullets: [
        {
          tags: ['bitrix', 'process', 'contracts'],
          text: {
            ru: 'Автоматизировал Contract Lifecycle Management на базе Битрикс24: описал процессы AS IS / TO BE, собрал требования от юристов, перестроил маршруты проверки контрагентов и согласования договоров. Сократил SLA согласования на 60%, ускорив коммерческий цикл компании.',
            en: 'Automated contract lifecycle management on Bitrix24: mapped the processes AS IS / TO BE, gathered requirements from the lawyers, rebuilt the counterparty screening and contract approval routes. Cut the approval SLA by 60% and sped up the company commercial cycle.',
          },
        },
        {
          tags: ['python', 'llm', 'pdn'],
          text: {
            ru: 'Разработал middleware на Python для автоматической деперсонализации данных перед отправкой в LLM. Закрыл риски по 152-ФЗ и утечке коммерческой тайны, сократил время ручной подготовки документов на 95%.',
            en: 'Built Python middleware that de-identifies data automatically before it goes to an LLM. Closed the risks under the Russian personal data law and trade secret leaks, and cut manual document preparation time by 95%.',
          },
        },
        {
          tags: ['llm', 'pdn', 'process'],
          text: {
            ru: 'Спроектировал и внедрил корпоративную архитектуру безопасного использования LLM (Claude Code, Codex) во внутреннем контуре компании: политика Information Governance, разграничение доступов, логирование запросов, регламент работы с конфиденциальными данными.',
            en: 'Designed and rolled out the corporate architecture for safe LLM use (Claude Code, Codex) inside the company perimeter: an information governance policy, access separation, request logging and rules for handling confidential data.',
          },
        },
        {
          tags: ['bi', 'bitrix'],
          text: {
            ru: 'Внедрил Legal Data Analytics: спроектировал BI-дашборды учёта юридических задач и нагрузки на команду по данным из Битрикс24. Убрал 80% ручного ввода и дал контроль KPI в реальном времени.',
            en: 'Introduced legal data analytics: designed BI dashboards tracking legal tasks and team workload from Bitrix24 data. Removed 80% of manual entry and put KPIs under real-time control.',
          },
        },
        {
          tags: ['agents', 'llm'],
          text: {
            ru: 'Перевёл юридическую команду на работу с ИИ-агентами: разбор и сверка документов, подготовка типовых материалов, контроль регламентных сроков. Высвободил 70% FTE штатных юристов от рутины на профильные задачи.',
            en: 'Moved the legal team onto AI agents: parsing and cross-checking documents, drafting standard materials, tracking statutory deadlines. Freed 70% of in-house lawyer FTE from routine for professional work.',
          },
        },
      ],
    },
    {
      company: { ru: 'Фабрика Вентиляции ГалВент', en: 'GalVent Ventilation Factory' },
      role: { ru: 'Юрисконсульт', en: 'Legal counsel' },
      period: { ru: 'Июнь 2024 — Декабрь 2024', en: 'June 2024 — December 2024' },
      duration: { ru: '7 месяцев', en: '7 months' },
      start: '2024-06',
      end: '2024-12',
      bullets: [
        {
          tags: ['contracts', 'process'],
          text: {
            ru: 'Выстроил превентивную систему Legal Risk Management по госконтрактам: сквозной реестр договоров в рамках гособоронзаказа с контролем сроков и обязательств вместо разрозненных файлов. Дал руководству единую картину по портфелю.',
            en: 'Built a preventive legal risk management system for state contracts: a single register of defence procurement contracts with deadline and obligation tracking, replacing scattered files. Gave management one view of the portfolio.',
          },
        },
        {
          tags: ['fz275'],
          text: {
            ru: 'Обеспечил прохождение плановой проверки прокуратуры на соблюдение 275-ФЗ с 0 замечаний, предотвратив финансовые риски в виде многомиллионных штрафов.',
            en: 'Took the company through a scheduled prosecutor audit of defence procurement compliance with zero findings, heading off fines running into millions.',
          },
        },
        {
          tags: ['litigation', 'process'],
          text: {
            ru: 'Стандартизировал претензионно-исковую работу и взыскание дебиторской задолженности: единый регламент, контроль стадий, прозрачная отчётность по статусам. Взыскано свыше 12 000 000 ₽, результативность 100% — 6 из 6 дел.',
            en: 'Standardised pre-litigation and debt recovery work: one set of rules, stage tracking, transparent status reporting. Recovered over 12,000,000 ₽ with a 100% success rate — 6 cases out of 6.',
          },
        },
      ],
    },
    {
      company: { ru: 'Дом-Профи', en: 'Dom-Profi' },
      role: { ru: 'Юрист', en: 'Lawyer' },
      period: { ru: 'Январь 2024 — Май 2024', en: 'January 2024 — May 2024' },
      duration: { ru: '5 месяцев', en: '5 months' },
      start: '2024-01',
      end: '2024-05',
      bullets: [
        {
          tags: ['litigation', 'process'],
          text: {
            ru: 'Внедрил автоматизацию массового судопроизводства: разработал генератор процессуальных документов для пакетной подачи мировым судьям — шаблонизация, автозаполнение из реестра, выгрузка пакетами. Сократил рутинные трудозатраты отдела в 3 раза.',
            en: 'Automated high-volume litigation: built a generator of court filings for batch submission to magistrates — templating, autofill from a register, batch export. Cut the department routine workload threefold.',
          },
        },
        {
          tags: ['litigation', 'process'],
          text: {
            ru: 'Выстроил цифровые каналы взаимодействия с банками и ФССП, минимизировав сроки фактического получения средств по исполнительным листам.',
            en: 'Set up digital channels with banks and the bailiff service, cutting the time it actually takes to collect on writs of execution.',
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
        ru: 'Находит персональные данные в договорах и заменяет их метками вида [ФИО_1], чтобы документ можно было отдать нейросети без нарушения 152-ФЗ и NDA. Ответ модели восстанавливается обратно по криптографическому паспорту. Для PDF накладывает настоящие чёрные плашки, вычищая данные из метаданных и скрытых слоёв.',
        en: 'Finds personal data in contracts and swaps it for labels like [NAME_1], so the document can go to a neural network without breaching data protection law or an NDA. The model reply is restored through a cryptographic passport. For PDFs it lays down real black bars, wiping the data out of metadata and hidden layers.',
      },
      stack: ['Python', 'slovnet', 'PyQt', 'Windows · macOS · Linux'],
      link: 'https://github.com/akonyaev-ru/Umbra',
      tags: ['python', 'pdn', 'llm'],
    },
    {
      name: 'Hunter CLI',
      repo: 'akonyaev-ru/HunterCLI',
      tagline: { ru: 'Автопилот резюме в консоли', en: 'CV autopilot in the console' },
      description: {
        ru: 'Спрашивает у сервиса точное время, когда очередное поднятие резюме разрешено, ждёт этот момент, добавляет случайную задержку и поднимает резюме без участия человека. Считает просмотры и приглашения по неделям, ведёт до восьми аккаунтов одновременно.',
        en: 'Asks the job board exactly when the next CV bump is allowed, waits for that moment, adds a random delay and bumps the CV with no human involved. Counts views and interview invitations week by week, and runs up to eight accounts at once.',
      },
      stack: ['Python', 'TUI', 'OAuth', 'HH API'],
      link: 'https://github.com/akonyaev-ru/HunterCLI',
      tags: ['python', 'agents', 'process'],
    },
  ],

  // filter: id тега — навык кликабелен и подсвечивает свои задачи в опыте.
  skillGroups: [
    {
      title: { ru: 'Искусственный интеллект', en: 'Artificial intelligence' },
      skills: [
        { name: 'Claude', filter: 'llm' },
        { name: 'ChatGPT', filter: 'llm' },
        { name: 'Perplexity' },
        { name: 'Prompt Engineering' },
        { name: 'RAG' },
        { name: { ru: 'ИИ-агенты', en: 'AI agents' }, filter: 'agents' },
        { name: 'Antigravity' },
      ],
    },
    {
      title: { ru: 'Разработка и интеграции', en: 'Development and integrations' },
      skills: [
        { name: 'Python', filter: 'python' },
        { name: 'API', filter: 'python' },
        { name: 'Google API' },
        { name: 'Apps Script' },
        { name: 'n8n' },
      ],
    },
    {
      title: { ru: 'Процессы и данные', en: 'Processes and data' },
      skills: [
        {
          name: { ru: 'Описание процессов AS IS / TO BE', en: 'Process mapping AS IS / TO BE' },
          filter: 'process',
        },
        { name: { ru: 'Битрикс24', en: 'Bitrix24' }, filter: 'bitrix' },
        { name: { ru: 'BI-дашборды', en: 'BI dashboards' }, filter: 'bi' },
        { name: { ru: 'Электронный документооборот', en: 'Electronic document flow' } },
        { name: 'Google Sheets' },
        { name: { ru: '1С: Предприятие', en: '1C: Enterprise' } },
        { name: { ru: '1С: ERP', en: '1C: ERP' } },
      ],
    },
    {
      title: { ru: 'Юридический стек', en: 'Legal stack' },
      skills: [
        { name: { ru: 'Договорная работа', en: 'Contract work' }, filter: 'contracts' },
        { name: { ru: 'Претензионно-исковая работа', en: 'Pre-litigation and claims' }, filter: 'litigation' },
        {
          name: { ru: 'Защита персональных данных · 152-ФЗ', en: 'Personal data protection' },
          filter: 'pdn',
        },
        {
          name: { ru: 'Гособоронзаказ · 275-ФЗ', en: 'Defence procurement compliance' },
          filter: 'fz275',
        },
        { name: { ru: 'КонсультантПлюс', en: 'ConsultantPlus' } },
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
        en: 'LegalTech: automating a lawyer routine',
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
