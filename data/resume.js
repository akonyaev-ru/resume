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
    factsLabel: {
      ru: 'Ключевые сведения, прокручиваемая полоса',
      en: 'Key facts, scrollable strip',
    },
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
    // Окно терминала: подписи шапки и команд. Формы множественного числа —
    // для 1, 2–4 и 5+ (в английском две последние совпадают).
    termHost: 'alexey@legalops',
    termPath: '~/skills',
    termAll: { ru: 'все группы', en: 'all groups' },
    termGroups: { ru: ['группа', 'группы', 'групп'], en: ['group', 'groups', 'groups'] },
    termSkills: { ru: ['навык', 'навыка', 'навыков'], en: ['skill', 'skills', 'skills'] },
    termHint: { ru: 'Щёлкните по команде, чтобы оставить одну группу', en: 'Click a command to keep one group' },
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
      // \u00A0 перед ИИ: иначе союз «и» повисает в конце строки заголовка.
      ru: 'Специалист по LegalOPS и\u00A0внедрению AI-агентов',
      en: 'LegalOPS and AI-agent implementation specialist',
    },
    // Термины, которые подсвечиваются акцентом внутри заголовка. Порядок важен:
    // roleNode ищет их последовательно, отрезая уже разобранное начало.
    roleAccent: {
      ru: ['AI-агентов'],
      en: ['AI-agent implementation'],
    },
    photo: 'assets/img/portrait.webp',
    age: 25,
    city: { ru: 'Москва', en: 'Moscow' },
    github: 'akonyaev-ru',
    updated: { ru: '15 сентября 2026', en: '15 September 2026' },
    experienceTotal: { ru: '3 года 3 месяца', en: '3 years 3 months' },
    employment: { ru: 'полная занятость', en: 'full-time' },
    schedule: { ru: 'Удалённо или гибрид', en: 'Remote or hybrid' },
    relocation: {
      ru: 'Без переезда, редкие командировки',
      en: 'No relocation, occasional trips',
    },
    specializations: {
      ru: ['Юрист', 'Бизнес-аналитик'],
      en: ['Lawyer', 'Business analyst'],
    },
    lede: {
      ru: 'Юрист по практике: перевожу юридическую функцию на AI-агентов — и\u00A0сам пишу то, что для этого нужно.',
      en: 'A practising lawyer: I move the legal function onto AI agents — and write what that takes myself.',
    },
    about: {
      ru: 'Юрист с практикой в договорной, претензионно-исковой и судебной работе, который автоматизирует юридическую функцию своими руками: нахожу узкие места, собираю требования от юристов и бизнес-заказчиков, формирую ТЗ, довожу решение до внедрения, тестирования и обучения команды, а вокруг инструментов выстраиваю методологию — регламенты, инструкции, маршруты согласования. Два юридических образования плюс Python, API и интеграция LLM. Роботизировал согласование договоров, внедрил шесть ИИ-агентов на базе Claude, выстроил контур безопасного использования ИИ в компании — способен и спроектировать архитектуру автоматизации, и реализовать её руками, от постановки задачи до пользовательского тестирования.',
      en: 'A lawyer with hands-on contract, claims and litigation practice who automates the legal function himself: I find the bottlenecks, gather requirements from lawyers and business owners, write the specification and carry the solution through to rollout, testing and team training — and build the method around the tools: policies, instructions, approval routes. Two law degrees plus Python, APIs and LLM integration. I robotised contract approval, rolled out six Claude-based AI agents and built the perimeter for safe AI use in the company — I can both design the automation architecture and build it myself, from framing the task to user testing.',
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
      value: 70, prefix: '−', suffix: '%',
      caption: { ru: 'времени на типовые задачи', en: 'time on routine tasks' },
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
            ru: 'Внедрил 6 ИИ-агентов на базе Claude в работу восьми юристов: разбор и сверка документов, подготовка типовых материалов, контроль регламентных сроков, проекты процессуальных документов и судебных актов с базой практики по каждому судье и нормативной базой АПК — включая контроль резолютивной части при множественности истцов (ст. 175 АПК). Время на типовые задачи сокращено на 70%.',
            en: 'Rolled out six Claude-based AI agents to a team of eight lawyers: parsing and cross-checking documents, drafting standard materials, tracking deadlines, and drafting procedural documents and court rulings from a per-judge practice base and the procedural code — including the operative part where there are several claimants (art. 175 of the Commercial Procedure Code). Time on routine tasks cut by 70%.',
          },
        },
        {
          text: {
            ru: 'Автоматизировал сквозной бизнес-процесс согласования договоров в Битрикс24: описал процесс AS IS / TO BE, расшил узкие места в маршруте, перестроил проверку контрагентов, статусы, уведомления и контроль сроков; согласовал целевой процесс с коммерческим блоком и провёл презентацию результатов руководству. SLA согласования сокращён на 60%, коммерческий цикл компании ускорен.',
            en: 'Automated the end-to-end contract approval process in Bitrix24: mapped the process as is / to be, cleared the bottlenecks in the route, rebuilt counterparty screening, statuses, notifications and deadline control; agreed the target process with the commercial team and presented the results to management. Approval SLA cut by 60%, the company commercial cycle sped up.',
          },
        },
        {
          text: {
            ru: 'Провёл правовую экспертизу и согласование свыше 700 договоров (40–50 в месяц): проверка контрагентов, сопровождение исполнения, обмен документами с контрагентами через Диадок.',
            en: 'Reviewed and approved over 700 contracts (40–50 a month): counterparty screening, performance follow-up, document exchange with counterparties via Diadoc.',
          },
        },
        {
          text: {
            ru: 'Разработал middleware на Python для автоматической деперсонализации данных перед отправкой в LLM: закрыл риски по 152-ФЗ и утечке коммерческой тайны, ручная подготовка документов сокращена на 95%.',
            en: 'Built Python middleware that de-identifies data automatically before it goes to an LLM: closed the risks under the personal data law and trade secret leaks; manual document preparation cut by 95%.',
          },
        },
        {
          text: {
            ru: 'Спроектировал и внедрил контур безопасного использования LLM (Claude Code, Codex) внутри компании: разграничение доступов, логирование запросов, требования информационной безопасности к ИИ-решениям. Разработал ЛНА — регламент использования ИИ в юридическом отделе и инструкции по работе с агентами с приложениями по каждому агенту; обучил 8 юристов.',
            en: 'Designed and rolled out the perimeter for safe LLM use (Claude Code, Codex) inside the company: access separation, request logging, information security requirements for AI solutions. Wrote the internal policy on AI use in the legal department and the agent manuals with an appendix per agent; trained eight lawyers.',
          },
        },
        {
          text: {
            ru: 'Вёл бэклог автоматизации юридической функции в Jira с приоритизацией по эффекту и трудозатратам: формировал бизнес-требования и ТЗ на ИИ-агентов, собирал прототип, тестировал на реальных данных, обкатывал на пилотной группе и передавал в эксплуатацию — этот цикл прошли все шесть агентов. Эффект замерял по BI-дашбордам на данных Битрикс24: убрал 80% ручного ввода в отчётности отдела, вывел KPI в реальном времени.',
            en: 'Ran the legal function automation backlog in Jira, prioritised by impact against effort: wrote business requirements and specifications for the AI agents, built the prototype, tested it on real data, ran it past a pilot group and handed it over — all six agents went through this cycle. Measured the effect on BI dashboards built on Bitrix24 data: removed 80% of manual entry from the department reporting, put KPIs under real-time control.',
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
            ru: 'Оцифровал договорную работу по гособоронзаказу: сквозной реестр контрактов с контролем сроков и обязательств вместо разрозненных файлов — единая картина портфеля для руководства.',
            en: 'Digitised contract work under the defence procurement programme: built a single register of contracts with deadline and obligation tracking, replacing scattered files. Gave management one view of the portfolio.',
          },
        },
        {
          text: {
            ru: 'Выстроил комплаенс-контроль по 275-ФЗ (ГОЗ): плановая проверка прокуратуры пройдена с 0 замечаний, многомиллионные штрафы предотвращены.',
            en: 'Set up compliance control under the defence procurement law: the scheduled prosecutor audit passed with zero findings, fines running into millions headed off.',
          },
        },
        {
          text: {
            ru: 'Стандартизировал претензионно-исковую работу и взыскание дебиторской задолженности: единый регламент, контроль стадий, отчётность по статусам; полный цикл от претензии до арбитражного суда, ФССП и банков. Выиграно 6 из 6 дел, взыскано свыше 12 000 000 ₽.',
            en: 'Standardised claims and receivables recovery: one set of rules, stage tracking, status reporting; the full cycle from claim letter to commercial court, bailiffs and banks. Won 6 cases out of 6, recovered over 12,000,000 ₽.',
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
            ru: 'Автоматизировал массовое приказное производство: разработал конструктор заявлений о выдаче судебных приказов (ст. 122 ГПК) — шаблонизация, автозаполнение из реестра, пакетная выгрузка для подачи мировым судьям. Трудозатраты отдела сокращены в 3 раза.',
            en: 'Automated high-volume court order proceedings: built a generator for court order applications (art. 122 of the Civil Procedure Code) — templating, autofill from a register, batch export for filing with magistrates. Department routine workload cut threefold.',
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
    {
      company: { ru: 'ИП Коняев Алексей Алексеевич', en: 'Sole proprietor Alexey Konyaev' },
      role: {
        ru: 'Консультант по безопасному использованию ИИ',
        en: 'Consultant on safe AI use',
      },
      period: { ru: 'Июль 2023 — настоящее время', en: 'July 2023 — present' },
      duration: { ru: '3 года 3 месяца', en: '3 years 3 months' },
      start: '2023-07',
      end: null,
      current: true,
      // Практика идёт параллельно основным местам: на шкале опыта отрезок
      // лёг бы поверх всех остальных во всю ширину. Карточка в списке есть,
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
        { name: '1С:ERP' },
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
