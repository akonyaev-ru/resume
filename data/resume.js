/*
 * Единственный источник содержания страницы.
 * Правка резюме = правка этого файла. Вёрстку трогать не нужно.
 *
 * Строки, которые переводятся, записаны парой { ru, en }. Всё остальное —
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
    releaseLabel: { ru: 'Выпуск', en: 'Release' },
    skillsTitle: { ru: 'Навыки', en: 'Skills' },
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
    callPhone: { ru: 'Позвонить', en: 'Call' },
    sourceCode: { ru: 'Исходный код страницы', en: 'Source code of this page' },
    updatedAt: { ru: 'Обновлено', en: 'Updated' },
    langLabel: { ru: 'Язык страницы', en: 'Page language' },
    docTitle: { ru: 'Резюме Алексея Коняева', en: 'Alexey Konyaev — CV' },
  },

  person: {
    name: { ru: 'Алексей Коняев', en: 'Alexey Konyaev' },
    role: {
      // \u00A0 перед AI: иначе союз «и» повисает в конце строки заголовка.
      ru: 'Специалист по автоматизации процессов и\u00A0AI-разработке',
      en: 'Process automation and AI engineering specialist',
    },
    // Термины, которые подсвечиваются акцентом внутри заголовка. Порядок важен:
    // roleNode ищет их последовательно, отрезая уже разобранное начало.
    roleAccent: {
      ru: ['автоматизации', 'AI-разработке'],
      en: ['Process automation', 'AI engineering'],
    },
    photo: 'assets/img/portrait.webp',
    age: 25,
    city: { ru: 'Москва', en: 'Moscow' },
    github: 'akonyaev-ru',
    updated: { ru: '4 сентября 2026', en: '4 September 2026' },
    experienceTotal: { ru: '2 года 7 месяцев', en: '2 years 7 months' },
    employment: { ru: 'полная занятость', en: 'full-time' },
    schedule: { ru: 'Удалённо или гибрид', en: 'Remote or hybrid' },
    relocation: {
      ru: 'Без переезда, редкие командировки',
      en: 'No relocation, occasional trips',
    },
    specializations: {
      ru: ['Бизнес-аналитик', 'Менеджер продукта'],
      en: ['Business analyst', 'Product manager'],
    },
    lede: {
      ru: 'Перевожу ручные бизнес-процессы в автоматические — и сам пишу то, что для этого нужно.',
      en: 'I move manual business processes into automatic ones — and write what that takes myself.',
    },
    about: {
      ru: 'Нахожу узкие места в ручных процессах, собираю требования от заказчиков, формирую техническое задание и довожу решение до работающего результата — по расписанию, событию или заданному условию. Объединяю понимание бизнес-логики с техническими компетенциями: Python, API, интеграция LLM. Роботизировал согласование договоров, внедрил ИИ-агентов на базе Claude, выстроил политику безопасного использования ИИ в контуре компании. Способен и спроектировать архитектуру автоматизации, и реализовать её руками — от постановки задачи до пользовательского тестирования.',
      en: 'I find the bottlenecks in manual processes, gather requirements from the people who own them, write the specification and carry the solution through to a working result — running on a schedule, on an event or on a condition. I combine an understanding of business logic with technical skills: Python, APIs, LLM integration. I robotised contract approval, rolled out Claude-based AI agents and built the policy for safe use of AI inside the company perimeter. I can both design the automation architecture and build it myself, from framing the task to user testing.',
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
      phone: { label: '+7 (929) 990-29-29', href: 'tel:+79299902929' },
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
      duration: { ru: '1 год 7 месяцев', en: '1 year 7 months' },
      start: '2025-03',
      end: null,
      current: true,
      bullets: [
        {
          text: {
            ru: 'Автоматизировал сквозной процесс согласования договоров на базе Битрикс24: описал процесс как есть, расшил узкие места в маршруте, перестроил проверку контрагентов, статусы, уведомления и контроль сроков. Сократил SLA согласования на 60%, ускорив коммерческий цикл компании.',
            en: 'Automated the end-to-end contract approval process on Bitrix24: mapped the process as it was, cleared the bottlenecks in the route, rebuilt counterparty screening, statuses, notifications and deadline control. Cut the approval SLA by 60% and sped up the company commercial cycle.',
          },
        },
        {
          text: {
            ru: 'Разработал middleware на Python для автоматической деперсонализации данных перед отправкой в LLM. Закрыл риски по 152-ФЗ и утечке коммерческой тайны, сократил время ручной подготовки документов на 95%.',
            en: 'Built Python middleware that de-identifies data automatically before it goes to an LLM. Closed the risks under the Russian personal data law and trade secret leaks, and cut manual document preparation time by 95%.',
          },
        },
        {
          text: {
            ru: 'Спроектировал и внедрил корпоративную архитектуру безопасного использования LLM (Claude Code, Codex) во внутреннем контуре компании: разграничение доступов, логирование запросов, регламент работы с конфиденциальными данными. Сформировал требования информационной безопасности к ИИ-решениям.',
            en: 'Designed and rolled out the corporate architecture for safe LLM use (Claude Code, Codex) inside the company perimeter: access separation, request logging and rules for handling confidential data. Set the information security requirements for AI solutions.',
          },
        },
        {
          text: {
            ru: 'Собрал BI-отчётность по задачам подразделения: спроектировал дашборды, подгрузил данные из Битрикс24. Убрал 80% ручного ввода и дал контроль KPI в реальном времени.',
            en: 'Built BI reporting for the unit workload: designed the dashboards and pulled the data from Bitrix24. Removed 80% of manual entry and put KPIs under real-time control.',
          },
        },
        {
          text: {
            ru: 'Внедрил ИИ-агентов в ежедневную работу команды: разбор и сверка документов, подготовка типовых материалов, контроль регламентных сроков. Высвободил 70% FTE от рутины на профильные задачи.',
            en: 'Brought AI agents into the team daily work: parsing and cross-checking documents, drafting standard materials, tracking deadlines. Freed 70% of FTE from routine for professional work.',
          },
        },
        {
          text: {
            ru: 'Вёл бэклог задач автоматизации и приоритизировал их по эффекту и трудозатратам: формировал техническое задание на ИИ-агентов, собирал прототип, проверял его на реальных данных и обкатывал на пилотной группе до передачи пользователям.',
            en: 'Ran the automation backlog and prioritised it by impact against effort: wrote the specifications for the AI agents, built the prototype, tested it on real data and ran it past a pilot group before handing it to users.',
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
          text: {
            ru: 'Оцифровал договорную работу по гособоронзаказу: собрал сквозной реестр контрактов с контролем сроков и обязательств вместо разрозненных файлов. Дал руководству единую картину по портфелю.',
            en: 'Digitised contract work under the defence procurement programme: built a single register of contracts with deadline and obligation tracking, replacing scattered files. Gave management one view of the portfolio.',
          },
        },
        {
          text: {
            ru: 'Выстроил процесс контроля соответствия требованиям 275-ФЗ: плановая проверка прокуратуры пройдена с 0 замечаний, риск многомиллионных штрафов снят.',
            en: 'Set up compliance control against the defence procurement law: the scheduled prosecutor audit was passed with zero findings, heading off fines running into millions.',
          },
        },
        {
          text: {
            ru: 'Стандартизировал работу с дебиторской задолженностью: единый регламент, контроль стадий, прозрачная отчётность по статусам. Возвращено в компанию свыше 12 000 000 ₽, результативность 6 из 6.',
            en: 'Standardised receivables work: one set of rules, stage tracking, transparent status reporting. Recovered over 12,000,000 ₽ for the company, 6 cases out of 6.',
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
          text: {
            ru: 'Разработал генератор документов для пакетной обработки массовых однотипных заявок: шаблонизация, автозаполнение из реестра, выгрузка пакетами. Сократил рутинные трудозатраты отдела в 3 раза.',
            en: 'Built a document generator for batch processing of high-volume identical requests: templating, autofill from a register, batch export. Cut the department routine workload threefold.',
          },
        },
        {
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
    },
  ],

  skillGroups: [
    {
      title: { ru: 'Искусственный интеллект', en: 'Artificial intelligence' },
      skills: [
        { name: 'Claude' },
        { name: 'ChatGPT' },
        { name: 'Perplexity' },
        { name: 'Prompt Engineering' },
        { name: 'RAG' },
        { name: { ru: 'ИИ-агенты', en: 'AI agents' } },
        { name: 'Antigravity' },
      ],
    },
    {
      title: { ru: 'Разработка и интеграции', en: 'Development and integrations' },
      skills: [
        { name: 'Python' },
        { name: 'API' },
        { name: 'Google API' },
        { name: 'Apps Script' },
        { name: 'n8n' },
        { name: 'RPA' },
        { name: { ru: 'No-code платформы', en: 'No-code platforms' } },
      ],
    },
    {
      title: { ru: 'Процессы и системы', en: 'Processes and systems' },
      skills: [
        { name: { ru: 'Автоматизация бизнес-процессов', en: 'Business process automation' } },
        { name: { ru: 'Описание процессов AS IS / TO BE', en: 'Process mapping AS IS / TO BE' } },
        { name: { ru: 'Битрикс24', en: 'Bitrix24' } },
        { name: { ru: '1С: Предприятие', en: '1C: Enterprise' } },
        { name: { ru: '1С: ERP', en: '1C: ERP' } },
        { name: { ru: 'Электронный документооборот', en: 'Electronic document flow' } },
      ],
    },
    {
      title: { ru: 'Данные и безопасность', en: 'Data and security' },
      skills: [
        { name: { ru: 'BI-дашборды', en: 'BI dashboards' } },
        { name: 'Google Sheets' },
        { name: 'MS Excel' },
        { name: { ru: 'Деперсонализация данных', en: 'Data de-identification' } },
        { name: { ru: 'Информационная безопасность', en: 'Information security' } },
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
