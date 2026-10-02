/* Пещера за разделом «Опыт» (5.90).

   Владелец выбрал её из прототипов 2026-10-01: ледяная пещера, ход — труба с семью неровными
   гранями («грубая»), во весь фон и видна под текстом, у букв тень. Камера идёт вглубь, пока
   читают раздел: сверху Айковер ПРО, за первыми воротами ГалВент, за вторыми Дом-Профи — вниз,
   в прошлое, и чем глубже, тем больше льда («особенно тем что мы идем вглубь»). На время
   раздела офис внизу окна гаснет, разделителей между местами работы нет; пещера — сам раздел: она
   начинается сразу под текстом «Подхода» и кончается чуть выше заголовка «Собственные продукты», а
   вход и выход — утренние, длинные: сперва поле знаков тонет в темноте цвета фона, потом из неё
   проступают камни. Камера не прыгает за колесом мыши, а плавно догоняет прокрутку.

   Рисует видеокарта (WebGL2). Прототип на JavaScript считал каждую точку сам — 25–40 мс на
   кадр, и страница при прокрутке «висла»: главный поток был занят на 65 %. Здесь на JS только
   мир — кольца хода, огни, сосульки, снег, текстуры камня, — он строится раз на раскладку теми
   же зёрнами, что в прототипе; каждую точку кадра считает шейдер.

   Пещеры нет, и страница такая же, как до неё (поле знаков, офис на месте, разделители видны),
   если: нет WebGL2; браузер рисовал бы без видеокарты, программно
   (`failIfMajorPerformanceCaveat`); окно уже 721 px (там нет и офиса); в печати. При
   `prefers-reduced-motion` пещера — неподвижный кадр: камера не едет за прокруткой, кристаллы
   не дышат, снег не падает, офис гаснет без анимации.

   Разломы (2026-10-02; владелец: «разломы (трещины), в которых будет фон сайта, будто игра
   взломана и код вырывается наружу» — из трёх вариантов: «Трещины мне нравятся… и давай небольшой
   эффект символов от трещин добавим»). В стенах и полу — неровные разломы с бирюзовой кромкой; в
   дыре — «слой кода»: знаки набора поля сайта пиксельным шрифтом, сетка отстаёт от прокрутки, как
   поле, знаки изредка вспыхивают и горят под курсором; из разломов изредка вылетают и гаснут знаки.

   Мир, кольца хода и разломы — чистые функции без DOM: их гоняет tools/check_cave.js в Node. */
(function (root) {
  'use strict';

  /* --- постоянные: пещера r7 из прототипа ------------------------------------ */

  var ML = 72;                         // длина хода, клеток
  var CX = 4.5, EYE = 0.75, HW = 1.6;  // ось хода, высота глаза, высота падения снега
  /* Путь камеры по ходу. До 2026-10-02 — 64,5 клетки; владелец: «колесико мыши работает по разному,
     у меня быстро — трещины и другие объекты просто как будто моргают; давай сделаем шаг по пещере
     более коротким». Шаг камеры на пиксель прокрутки с тех пор в 2,7 раза короче: сперва путь 36
     клеток на пещеру со входом и выходом по 900 px, теперь (вход и выход — в промежутках между
     разделами, пещера на 1600 px короче) 24,5 клетки — шаг тот же. Мир строится прежний — ML клеток,
     дальняя часть хода просто не видна. */
  var Y0 = 1.5, Y1 = Y0 + 24.5;
  var NEAR = 0.05;
  // Ход — труба: кольцо через клетку, семь граней с разбросом вершин, радиус, отсчётов угла
  // в таблице кольца, повторов текстуры по окружности.
  var TUBE = 7, T_JIT = 0.24, T_R0 = 1.45, T_BINS = 512, T_UREP = 9;
  var T_LIGHT = [-0.5, -0.866];        // откуда свет в сечении: грань, глядящая вниз-влево, светлее
  var N = 64;                          // сторона текстуры камня
  var ICE = 2, CRYSTALS = 1.5;         // «ледяная»: лёд по всем ярусам, кристаллов в полтора раза больше
  var FOG = [8, 10, 16], FOG_K = 0.11; // туман — цвет фона страницы (--void)
  var HEAD = 0.32, HEAD_K = 1 / 5;     // «фонарь» камеры
  var EXPO = 0.62, LWIN = 4.5;         // выдержка; огонь светит на 4,5 клетки по ходу и плавно гаснет
  var AMB = { 3: [0.12, 0.124, 0.13], 2: [0.115, 0.122, 0.136], 1: [0.12, 0.135, 0.16] };
  var CRYSTAL_RGB = [0.55, 0.82, 0.95];
  var ICICLES = { 3: 0.15, 2: 0.5, 1: 0.8 };      // сосулек на ряд — по ярусу
  var CRYSTAL_P = { 3: 0.12, 2: 0.22, 1: 0.32 };  // кристаллов на ряд — по ярусу
  var PX = 3;                          // пиксель пещеры, CSS px
  /* Подача (вариант «Г» коридора): под блоком текста пещера приглушена до MASK, к полям — плавно
     за MASK_SOFT. */
  var MASK = 0.6, MASK_SOFT = 140;
  /* Перенос на сайт (5.90): замер по 16 местам на четырёх экранах нашёл то, что прототип
     пропускал (он мерил реже): кристалл, проходящий прямо под строкой, ронял её до 4.02:1. Под
     блоком текста фон теперь не светлее L_TEXT по яркости WCAG — с сохранением оттенка: кристалл
     под строкой остаётся бирюзовым, только тусклее. Роли (бирюза, яркость 0,443) это даёт не
     меньше 4.7:1, основному тексту — 5.2.
     Тёмной полосы под колонкой дат и шкалой, как в прототипе, нет (владелец: «тут не должно быть
     этой полоски» — «Давай без полосы»): серые подписи раздела вместо неё светлее, их цвет — в
     style.css у `html.cave`, и он рассчитан на этот же предел (4.65:1). */
  var L_TEXT = 0.055;
  /* Над верхом и под низом раздела «Опыт» фон под блоком текста — не ярче L_OUT: серому тексту
     `--muted` соседей это даёт 4.55:1. До текста соседей пещера не доходит вовсе (она начинается под
     текстом «Подхода» и кончается над заголовком «Проектов»); L_OUT — на случай, если раскладка сдвинет
     соседей: 2026-10-02 вход и выход по 900 px заходили на них камнями, и серое пояснение «Проектов»
     падало до 3.04:1. */
  var L_OUT = 0.019;
  /* Вход и выход (2026-10-02). Владелец: «переход с фона на пещеру более плавный… вход и выход в цвет
     фона» (вход и выход стали по 900 px через темноту — «слишком сильно пещеру растянул… чуть выше слов
     „Опыт работы“ и чуть выше слов „Собственные продукты“»; переход только в промежутке — «снова
     топорный, просто полоса»; неровные края и темнота за промежутком не прижились) → «просто утренний
     вариант, но начало фона пещеры ниже „Подхода“ (чуть выше „Опыт работы“), а конец чуть выше
     „Собственных продуктов“» → из 900 / 600 / 350 px — «утро 600». Пещера начинается на EDGE_M
     промежутка ниже текста «Подхода» (14 px из 144) и кончается на EDGE_M промежутка выше заголовка
     «Проектов»; вход и выход — утренние, внутрь раздела, по EDGE_T px (не больше половины пещеры):
     непрозрачность — за первые EDGE_A доли (поле знаков тонет в темноте цвета фона), свет — с доли EDGE_L
     до конца (из темноты проступают камни); на выходе — то же в обратном порядке. Заголовок раздела и
     шкала — в начале входа, на темноте; камни во всю силу — с середины первого места работы. */
  var EDGE_M = 0.1, EDGE_T = 600, EDGE_A = 0.45, EDGE_L = 0.3;
  var SPRITE_FAR = 22;                 // дальше спрайтов не видно в тумане
  var MAXL = 80;                       // огней в мире больше не бывает: ряд — не больше одного
  var DEPTH_K = 128;                   // глубина в буфере — клетки / DEPTH_K
  var CAM_TAU = 140;                   // камера догоняет прокрутку, мс
  var CAM_SNAP = 6;                    // скачок больше — сразу на место (перезагрузка, переход по ссылке)
  var IDLE_MS = 83;                    // без движения кадр ~12 раз в секунду: дышат кристаллы, падает снег

  /* Разломы. Форма — из атласа: RS_N форм по RS_W × RS_H текселей, коробка формы R_BOX_W × R_BOX_L
     клеток при масштабе 1 (тексель ~0,022 клетки по обеим осям). Разлом на стене стоит по углу θ
     вокруг оси хода, на полу — по x; у каждого свой поворот, масштаб и фаза свечения. RIFT — шаг
     между разломами по ходу, масштаб, доля разломов на полу, сила свечения и света на камень, знаков в
     секунду с разлома. Знаков — небольшой эффект (владелец): в прототипе «код наружу» их было 2,6 в
     секунду, крупнее и дольше. */
  var RS_W = 64, RS_H = 192, RS_N = 4, R_BOX_W = 1.4, R_BOX_L = 4.2, MAXR = 32, MAXP = 60;
  var RIFT = { step: 4.5, size: [0.8, 1.2], floor: 0.22, glow: 1.0, light: 0.8, particles: 1.2 };
  /* Знаки кода — набор поля сайта (app.js, GLYPHS), пиксельным шрифтом 5 × 7. */
  var GLYPH_ROWS = {
    '{': ['..XX.', '.X...', '.X...', 'X....', '.X...', '.X...', '..XX.'],
    '}': ['.XX..', '...X.', '...X.', '....X', '...X.', '...X.', '.XX..'],
    '<': ['...X.', '..X..', '.X...', 'X....', '.X...', '..X..', '...X.'],
    '>': ['.X...', '..X..', '...X.', '....X', '...X.', '..X..', '.X...'],
    '/': ['....X', '....X', '...X.', '..X..', '.X...', 'X....', 'X....'],
    ';': ['.....', '..X..', '.....', '.....', '..X..', '..X..', '.X...'],
    '=': ['.....', '.....', 'XXXXX', '.....', 'XXXXX', '.....', '.....'],
    '#': ['.X.X.', '.X.X.', 'XXXXX', '.X.X.', 'XXXXX', '.X.X.', '.X.X.'],
    '$': ['..X..', '.XXXX', 'X.X..', '.XXX.', '..X.X', 'XXXX.', '..X..'],
    '%': ['XX..X', 'XX.X.', '...X.', '..X..', '.X...', '.X.XX', 'X..XX'],
    '0': ['.XXX.', 'X...X', 'X..XX', 'X.X.X', 'XX..X', 'X...X', '.XXX.'],
    '1': ['..X..', '.XX..', '..X..', '..X..', '..X..', '..X..', '.XXX.'],
    'λ': ['X....', '.X...', '.X...', '..X..', '.X.X.', 'X...X', 'X...X'],
    '+': ['.....', '..X..', '..X..', 'XXXXX', '..X..', '..X..', '.....'],
    '*': ['.....', 'X.X.X', '.XXX.', 'XXXXX', '.XXX.', 'X.X.X', '.....'],
    '§': ['.XXX.', 'X....', '.XX..', 'X..X.', '.XX..', '...X.', 'XXX..'],
  };
  var GLYPH_KEYS = Object.keys(GLYPH_ROWS);

  /* Рыцарь (2026-10-02; владелец: «Теперь мне нужно добавить в пещеру персонажей. Начнем с начала (верха),
     думаю туда можно добавить рыцаря… Нужно сделать так чтобы они вписались в графику пещеры. Можно даже
     добавить какую-нибудь легкую анимацию» → «он должен стоять в пещере (быть у стены) а не быть
     зафиксирован на сайте» → «размер персонажа реальным (по размеру пещеры), реалистичным»). Арт владельца
     снят по его сетке. Рыцарь стоит в нише левой стены — на KN_NICHE клетки левее края пола — и опирается о
     её дальнюю стенку (владелец: «Он не выглядит так будто опирается об стену»): ниша выбита на двух кольцах
     хода перед ним (радиус KN_NICHE_R в левом секторе), а на следующем кольце стена возвращается к ходу —
     этот скат и есть стенка за его спиной; рыцарь стоит на доле KN_SLOPE ската, вплотную к ней, под ногами —
     тень на полу (KN_SHADOW клетки). Рост KN_H клетки:
     камера смотрит с высоты глаз EYE — у человека это ~1,6 м, клетка ~2,1 м, — так что рыцарь со шлемом и
     рогами ~2 м. Ниша — потому что ход на экране — середина, под колонкой строк: рыцарь такого роста,
     стоящий в самом ходе, рядом с камерой наполовину уходит под строки, а в нише он там, где владелец обвёл
     его рамкой, — на стене левее текста. Место по ходу: KN_D клеток перед камерой в ту прокрутку, когда верх
     первого места работы — на KN_REF высоты окна; дальше камера подходит к нему и проходит мимо. Светится сам и светит на стены вокруг — огонь, как у кристаллов (сила и радиус KN_LIGHT,
     дышит); вокруг — искры в полях KN_SPARK точек арта. KNIGHT_ANIM: 0 — искры мерцают на месте, 1 — искры
     поднимаются, 2 — то же, и рыцарь парит на точку арта вверх и вниз. Строки за ним защищены так же, как
     за пещерой, но только сами строки и текст колонки дат: пустое место под датами — тоже блок текста, и
     под общей защитой рыцарь у стены был бы тёмным силуэтом. Весь персонаж — внутри хода (владелец про мага:
     «маг в стенке застрял как-будто» — низ мантии и сапоги уходили в угол пола и в скат за спиной): ниша
     раздвигается по его силуэту, каждая точка арта — ближе к оси, чем стена, на KN_GAP клетки, и у ниши есть
     ровный пол до задней стенки: нижние грани хода в нише уходят под пол на KN_FLOOR клетки. */
  var KN_H = 0.95, KN_NICHE = 0.48, KN_NICHE_R = 1.95, KN_SLOPE = 0.45, KN_SHADOW = 0.42, KN_GAP = 0.03, KN_FLOOR = 0.22;
  var KN_D = 2.0, KN_REF = 0.05, KN_SPARK = 18, KN_LIGHT = [1.6, 1.0];
  var KNIGHT_ANIM = 1;
  // рыцарь: начало — снят с арта владельца скриптом .proto/knight/extract.py, вставлен make_js.py (не править руками)
  var KNIGHT = { w: 74, h: 106,
    pal: ['183952', '204972', '2d5c87', '336c9a', '3f79a4', '4385b4', '4e90ba', '559ac2', '689db3', '5fa3c7', '66accd', '6eb6d4', '77bdd7', '7ec5dd', '85cbe0', '8dd2e4', '98dbea', 'a4e4ee', 'b0ebf1', 'bef2f4'],
    rle: '35.gr37.|34.ks38.|33.ept38.|33.imt13.s24.|33.ijqo.q7.p2.je23.|34.gjtqn.k2j2rcj2.jt23.|34.djpsn2k' +
      'opktr2.2jt23.|33.ekhgosdo2pkntm2hro23.|33.i.e2hldl3pk2teqmg23.|24.r11.eghf2l2ok2tqme24.|24.rt10.' +
      'dcdjgmnfltqrd25.|24.mst9.e2gol2g2mt2q26.|23.shns2.2s4.hegla2nhglsnt26.|3.mr19.2h2s.mr3.f2hfm3a3l' +
      'nqc26.|3.hqr15.q2.hjqtnhps2.fnjflpb2agqh28.|2.lgmoq14.hr.mjlsmnlkr2.hohelrdab2aq27.|2.kglnp14.jg' +
      'qohlq2opoq.cbgpflkrnactj27.|3.def16.gfhp2or2t2oq2bapgflp2apobr26.|4.en15.2e3hp4rtltbcao2glq2askg' +
      'p26.|4.ejo13.2em2hlgn2r2tlsbg2anglkamobheq25.|4.dem12.ko3pk2hrtolplobdl2blo2aqfcberlt23.|5.dg12.' +
      '4bkplhsphlnlnb2dlbam2ambm2brl2t22.|5.dko10.jpqlgcbpr3gmgklbe2hpm3a2bq2crkptm21.|5.den11.2bqpjkc2' +
      'qgl3gqbehk2jpoabtl2crnl2q21.|6.dei8.2ghd2b2qgc2ph2gpjbmhd3jgqtpldcqhqmt21.|6.dko7.cophmecbkqe.qn' +
      'hkqb2hmrfdjkjrpgpcqljms21.|6.dfn5.3cbmlk2fgb4.2pobeh2lnmpdgkrlrmoblmnj2.sts16.|7.fg4.2c2bc2bflgc' +
      'dbc.2b2.bkh3lqomq2jtp2qbqmr3.2jn2s14.|7.dnc2.2cbj2sorbcd3b7.h3lnolq2kqrqsqgbrop.hj2hj2sc12.|7.dj' +
      'o2.cbpqmpsqs4b2.bc4.jgjnqlrlm2k2s2po2bpq.2j2d2jntr11.|7.cem3.no2klos2rd4.ce3.efkfjkjqr2mkt3pobcb' +
      '2.2jefd2hlmts9.|7.cehc2.mfkoq2mr2sr3.ced.hkemf2goghlmkspmkpchc2.2je2f2d2hjrs8.|8.d2j2.2h2fgqr2p2' +
      'sq3.b2d3efn7hlsl2kobfn2.jd5fdehgptr6.|8.ced2.cjfq2fhr3ptm3.ed2eghgkm3gjncbplngbfj.ijd6fed2h2st5.' +
      '|8.cj2ocdbg2fkg2jqopsq2.dfejfhm2hlhonchgcpmebfgkejd4fj2f2dhjsrs4.|7.p2olsl2e2bfelhgjsfcbc2.edcfj' +
      'fo2p2bf2gtjdmd2cgeghd4fg3f2djhrts3.|4.2qnlkfm2socb3cbnmhlbostb.ec2dhlnb2c3fjtpkebcfecbhd9f2d2g3t' +
      '2.|.2rlmnf2clhntc2ld2.d2.l.m2pqt2.2ef3bel2gh2jtpnob2d2cbhd10f2dg2str.|jqgjcdc2hc2jtc2lr7.lk2pts3' +
      '.2bdcbn2gpoefmqgb2c2bh2cgc2fl6f2dg2trb|jgj3.nhjgdlsc2or7.lqnqpsc.cdbhdgbnl2f2nsgq4bnjf2bebfl7feh' +
      'jtsb|.m4.m2hjdfqc2ort6.chq2r2c2.bdjhebng2jhrplm2belmkc2d2bfl8fdj2rb|6.2mhjgckd2opt7.bc2bcl2.bdc2' +
      'hbg3jloqlg2bkgk3dbe2fl8fdhqpc|7.o3jgcho2pt6.2ejfnck.e6bmjpq2lembrbcgbcbqmc11fdh2q.|7.ojkmgdeo2pt' +
      'b5.fehenbk.dm2nq3b5crcksb2c2b2qn12fdj2q.|7.lkf2lfeo2ptb5.2c2dm.c.fe2fgm2pr2bjosrkl5bgmqnc10fdjqp' +
      '.|7.kp2gmgeo2ptb7.chb3.4bc4kqbplnsmbpm2befg2qnb4fc3fdjhqi.|8.nk2gkf2psps12.gmnq2p6bklksbrlps2be2' +
      'go3b2fbfb2fdjqpg.|8.gngjn2fpsps12.2gfq2gmlprs3bmg2brm2s2bdmbc2j2bd2b2fdkqp2.|9.nk2hmf2rnr12.2gdr' +
      'hg2hrsqb2c2bcblrlr3bdbecjbd2b3fdkrp2.|9.mk2hne2ror12.f2dshjhrks2b5c2bmonr2bcbcbj4b4fjqp2.|9.jo3h' +
      'ernoqt10.cl2ds2hrkjs2b3c2d3brmqc3b3chgb5frqo2.|9.jo3her3ot10.cj2dqhrjkhl3b2c2e2bcbrmq4bjedeb5frp' +
      'o2.|10.on2fjf2ons10.ghng2q2jhqlb4ce3bebnrmp2bcehg2b5fqp3.|10.2n2fgfronq10.hkeopo2jmrb2cb3c2be2g2' +
      'cpm3bfc2b4fdfqp3.|10.in4fs3ns9.n2eofmhjmrbe3cd3behmjhb2q2bc3b4fdlqo3.|11.nlg2fin2ot8.gefep2fphjq' +
      'be2h2d3bdg2nmgbqk2b2db4fdkqo3.|11.2mn2fhn2oti7.2geng2fernb2ejlg3bedg3mnmcob4c3fejnq4.|11.mngo2fr' +
      '2oti7.egfmng2fopbe2j2lf2bfdgekm2pn2b4c3fdjpq4.|12.ngfmfmo2st7.gdkfn2ghobde2jnmg2bcegegkopsmb4c3f' +
      'djqn4.|12.n2gflmsrot7.fhken2g2obdehmplgbf3cg2hm2prl4c3fhjp5.|12.no3gkt2ot7.dhfpeglobc2eqlprkbe3c' +
      'ge2jm2pqb3c2fdgkp5.|13.n4gsop2t6.gheqgnob2ce2fsopqga2e2c2f2hor2s2c3fdgom5.|13.on3gpoq2t6.lgeqlm.' +
      '2cdefgsopqg2a2e2dfghlr2b3cfdhgo6.|13.on3gjo2qtc4.imgh2m2.cflehdmrpqg3a3edghn3bpscfdhn7.|13.inm2g' +
      'kt2qtc4.ojho4.cgclhcg2rsg4a2edeg3bqrscdghq7.|14.ngmnh2trts4.pjo6.dchkdjr2b2g4acgh3bpkpscfhn8.|14' +
      '.ing2n5t14.hch2kjbs2b5a2b2cfjkptcfhm8.|14.inl2nj4t14.cjdklbontb5ab2cbogmptchm9.|15.k3nj2tpt15.ef' +
      'gjbom2tg3ae4boglorcl10.|15.m3nj2tpsm14.ehfblkm2tp3adhj2bjneodhm10.|15.m3njqs2pt15.ejbnlmqtrpaedf' +
      'dl2bjkecm11.|16.nk2nqspqte17.jlqmspqae2fch2p2d.k12.|16.2nknjs2oti17.jnmfjqjae2fchgfq15.|16.no3jt' +
      '2ors17.k2f2gofafgckgfmr15.|16.2o3jq2oqt16.2bgf2gkbdfeblfhp16.|17.o3j3onso14.klm2bghekp2ecjfmp16.' +
      '|17.n3jks2nsp14.g2jqpb2ctsdecgjp17.|17.2n3jsnoqt14.g2d2h2osts2dlglp17.|17.2n4jr2ot14.gecj2hkjts3' +
      'dkm18.|18.nk3jr2os15.ecjf2hltoe2dkm18.|18.nm2jkronsd14.e2mf2hjtocdfl19.|18.2n3jkonsp15.fdoehjtoq' +
      'dfl19.|19.2nk2jr2nt15.2fdpgkpsqdh20.|19.n2o2jsnot16.e2dqklsndj20.|19.nojkjrmot17.edqflsmdj20.|19' +
      '.iojhlrpors16.egdjlspe21.|19.inj2ljrons17.gdphmtpe20.|20.2n2jhr2ns17.2eckmtpfg19.|20.2n2jhr2nt18' +
      '.gh2jrodg19.|20.cn2jhl2nst17.ifghqs2dg18.|21.ok3jrops18.jekjsldjh17.|21.2o3jr2os18.2kjr2edejg16.' +
      '|21.2n3jpons18.2ko4a2eji15.|21.2n4jsn2r17.kh2bmsraded15.|22.nk3jr2ns18.c.knmsq18.|22.nm3jrnos20.' +
      '2mocdi17.|22.2n3jmnoq20.gjckqtq16.|22.knh3jrop20.gbjkq3r15.|23.nm3jr2o20.cbkmekn2s14.|24.2m2jrno' +
      '21.3cen2ono13.|25.nkjqso24.3e2dk13.|25.mlhlse43.|26.lnjs44.|27.onr44.|28.mr44.|29.q44.' };
  // рыцарь: конец

  /* Маг (2026-10-02; владелец: «Супер, теперь давай добавим этого мага ближе к Дом-Профи», место — рамкой у
     правой стены, правее строк). Всё как у рыцаря — арт снят по сетке (.proto/mage/extract.py), ниша со скатом
     за спиной, огонь у спины, тень, искры, — но у правой стены и у места работы MG_JOB (третьего, «Дом-Профи»):
     MG_D клеток перед камерой в ту прокрутку, когда его верх — на MG_REF высоты окна (на снимке владельца
     заголовок «Дом-Профи» — на 40 % окна, маг — правее и ниже). Справа строки кончаются раньше блока текста
     (у них своя ширина: на 1536 px — у 1087, блок — до 1305), и защита строк за персонажами идёт по самим
     строкам (uBodyR), иначе маг у стены был бы под ней. Рост MG_H клетки — ~1,8 м: в мантии с капюшоном. */
  var MG_H = 0.86, MG_D = 2.0, MG_REF = 0.40, MG_JOB = 2, MG_LIGHT = [1.4, 1.0];
  // маг: начало — снят с арта владельца скриптом .proto/mage/extract.py, вставлен make_js.py (не править руками)
  var MAGE = { w: 49, h: 94,
    pal: ['0a1837', '0c1e46', '132751', '19315d', '2b3234', '1d3b6a', '224878', '285283', '425150', '366b9e', '4875a3', '667674', '4382bb', '5582b2', '668db6', '4e9bd3', '77a2c7', '67b3de', '78c9ed', '98c4df', '8ae6f8', 'abe0f3', 'b2f4fc', 'c5fafd'],
    rle: '31.m3j2h12.|30.5j3h11.|29.5j5h10.|28.m4j5hg10.|27.3xk6h3g9.|26.5xo4h4g9.|26.x3ixwj3h2g2c9.|25.tb' +
      '4iwv2h2g3c9.|25.rbe4iwv2g5c8.|25.rba2l2i2v2g5c8.|25.qbat4lvq3d3cb7.|25.o2btl2qlvq2d5c7.|25.o2b2w' +
      'vqlcrh5cb7.|26.bcw2suodrp3c3a7.|26.nc2xwuqdrp2cb2a8.|26.nr2x2urkm2babac8.|21.xvx2wjw2xusrm3abt2s' +
      't7.|21.2xwuw2u2x2urb2a3su2w3v4.|21.2xuw3uxwusjhm2suw2u3wtvx2.|22.x2u3sw2u2jr4su3xvqkjk2.|22.2x2s' +
      'rpwurjprw2rpwvxtg2djk2.|22.vx2rwp2urmrs3rpwsq4dk3.|22.hvwpw2puj2px2r2wqdf5d3.|22.hfxur2pm3puwxwq' +
      '7dc3.|22.hgcwupr4pwxqba6fdc3.|22.hgdcxprw2puwa2cbfg5fd3.|22.hgfdxpxwspusb2db4g4fd2.|22.h2gdx2wsw' +
      'pubc2d2a4g3fd2.|22.h2gfxru2suvb2db2a5g2fd2.|22.hg2fwprwrpvc2d3a2h3g3fd.|22.hgfgwpupspvb2d4ah4g2f' +
      'd.|22.hgfgx5pvbdb4a2h3g2fd.|22.2hdgfw3puvbd2b3ag2h2g2fd.|21.wh2gdfw3pva2d2b4a2h2g2fd.|21.w2g2cdw' +
      '3pvad3b4a3hg2fcd|21.kxhcbdv3pvbd3b3aghv2g2fqd|7.2u12.xudc2bq3pv5b3agh3gfk2d|6x2.su9.x2ws2bqtsm2p' +
      'q5b3ax4gtf2d|.xs2xws2.us7.x2w2r2boq5s2r2o2knhx2gx2gdtd|2.xsrwrs2.s7.xw2rmrq2hrp2r4qn2kd3gfxg2dtd' +
      '|3.wpmr3ps6.xw2sr2mkgx3pr4fdc2b2xgxwfdtfd|4.u2m2jksr7.usp2mgfw3pw4f2c2bx2wusvdtfd|5.mkmp2sp2s6.u' +
      'rphgwv3px3f3db2w3usr2qjd|6.2srjidspu5.srkxgwp2rpx3f3dcws2u2s4qd|13.mq2l2.vsrpgxwp2rpx2fx3dco2u2s' +
      'r2qnqd|15.e4ispxgxr2srpxfvw4d3busrqonoq|16.4e2rh2xr2srpxfwrx2dcbabtoj2on2o|18.t2rjhxru2sr2xfmrwf' +
      'dcba2sqo2a2no|19.srjxwru2sr2xgfwsfdcbusq2ojn2.q|20.2jwr3usr2x2gwufdct2sq2ojn3.|20.jxwr3usr2x3guf' +
      'dctstq2ojp3.|20.jxr4usr2x2gfud2cdsqn2kjp3.|19.j2xs4usr2x2g2fd4cn2k2jp3.|19.jws5usrxw2g2f2d2c3b3j' +
      'n3.|18.j2ws5usrxv2g2f2d2c3b3jn3.|17.kjwr6usrxv2g2f2d3c2b3jn3.|17.j2xs6u2rxv2g2f2d3c2b3jmp2.|17.2' +
      'xr7usrwvg3f2d3cbc2jkjp2.|16.jwxs7usr2vg4fd3c2b2k2mr2.|16.2ws8usrwv5fd3c2b2k2mp2.|15.kwrs8usrwtgf' +
      'd2fd3c2bkn2mp2.|15.2wr8usrpvt2fv3d3cbabn2mp2.|15.2wr8usrpvtfvs4d3c2bn2mp2.|15.wrs8usrpvt2rv4d3c2' +
      'bo2mps.|15.wr3s5u2srpvtmr6d2c2b2m2pr.|15.w2r9srnvtgm6d2c2b3mur.|15.w3r7s2rnvtf5dcd2c2bnumup.|15.' +
      'wp3r3s3r2qn2vq5dv2dc2bovmpu.|15.wp2r4q2r3qnk2t3d2vqd2cqbov2pv.|15.wp11qnk2t3dvrqdcbq2bv2pv.|15.w' +
      'm8q3onk2tvdqvpq2dqo2bv2pv.|15.wm2q9o2nk2tow2pq2dqobav2tw.|16.n2q10onk2t2p2r3cqdbav2tv.|16.n13okv' +
      '2tprk2d2cdca4v.|16.14onk2tpqtd4cqb3vx.|16.14onk2qoq2dt3cq2b2v2.|16.14onkq2t2dct2ct2qb2v2.|16.15o' +
      'kjtq2c2t2cq2oavw2.|16.15onk3qtmq2cqkokav2.|16.qn13o2nk3qkodtononax2.|17.15on2k2qtd2c2qkjn3.|17.1' +
      '5o2nk4q2cqknjk3.|17.15o3nko3qcq2nko3.|19.q12o4nj3q2ok2oq3.|20.2i11o3nk4j2o2q4.|20.i2e3ae7o2n2k5j' +
      'k5.|19.l2i4e7.qon4kea7.|18.tl3i3e10.4i3e6.|17.tsq2i4e9.6i2e6.|15.ltqoli4ea9.tqtoi2e7.|14.4l2i2e2' +
      'a10.l3to3e7.|14.3i2e2a12.2i3o3e8.|15.2ea15.5ie10.|34.4e11.' };
  // маг: конец

  // Персонажи пещеры: арт, рост, сторона стены (−1 — левая, 1 — правая), место по ходу, огонь, место в атласе.
  var CHARS = [
    { art: KNIGHT, h: KN_H, side: -1, d: KN_D, ref: KN_REF, job: 0, light: KN_LIGHT, ax: 0 },
    { art: MAGE, h: MG_H, side: 1, d: MG_D, ref: MG_REF, job: MG_JOB, light: MG_LIGHT, ax: KNIGHT.w },
  ];

  /* --- случайность и текстуры ------------------------------------------------- */

  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function smooth01(x) { x = clamp01(x); return x * x * (3 - 2 * x); }

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function vnoise(seed, cells) {   // бесшовный шум значений
    var r = rng(seed), g = new Float32Array(cells * cells), out = new Float32Array(N * N);
    for (var i = 0; i < g.length; i++) g[i] = r();
    for (var y = 0; y < N; y++) {
      for (var x = 0; x < N; x++) {
        var fx = x / N * cells, fy = y / N * cells, x0 = Math.floor(fx), y0 = Math.floor(fy);
        var tx = fx - x0, ty = fy - y0;
        tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
        var x1 = (x0 + 1) % cells, y1 = (y0 + 1) % cells;
        out[y * N + x] = (g[y0 * cells + x0] * (1 - tx) + g[y0 * cells + x1] * tx) * (1 - ty) +
          (g[y1 * cells + x0] * (1 - tx) + g[y1 * cells + x1] * tx) * ty;
      }
    }
    return out;
  }
  function fractal(seed) {
    var a = vnoise(seed, 4), b = vnoise(seed + 1, 8), c = vnoise(seed + 2, 16), out = new Float32Array(N * N);
    for (var i = 0; i < out.length; i++) out[i] = a[i] * 0.55 + b[i] * 0.3 + c[i] * 0.15;
    return out;
  }
  function mix(a, b, k) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; }
  function wrapd(a) { a %= N; if (a > N / 2) a -= N; else if (a < -N / 2) a += N; return a; }

  /* Камни: серые валуны — ячейки Вороного на бесшовной сетке, тёмные щели между ними; камень
     светлее сверху-слева и темнеет к краям, как выпуклый. Точки раскиданы почти свободно и
     каждая третья пропущена — камни разного размера (без этого ложились «стёганым одеялом»);
     ice — иней и лёд в щелях и на гранях. Альбедо 0…255, по три числа на тексель. */
  function stonesTex(seed, cells, base, ice, iceCol) {
    iceCol = iceCol || [110, 172, 200];
    var r = rng(seed), pts = [], tones = [];
    for (var j = 0; j < cells; j++) {
      for (var i = 0; i < cells; i++) {
        if (r() < 0.3) continue;
        pts.push([(i + 0.05 + r() * 0.9) / cells * N, (j + 0.05 + r() * 0.9) / cells * N]);
        tones.push(0.62 + r() * 0.66);
      }
    }
    var n = fractal(seed + 3), fr = fractal(seed + 7), rad = N / cells / 2, out = new Float32Array(N * N * 3);
    for (var y = 0; y < N; y++) {
      for (var x = 0; x < N; x++) {
        var d1 = 1e9, d2 = 1e9, k1 = 0;
        for (var p = 0; p < pts.length; p++) {
          var dx = wrapd(x + 0.5 - pts[p][0]), dy = wrapd(y + 0.5 - pts[p][1]), d = dx * dx + dy * dy;
          if (d < d1) { d2 = d1; d1 = d; k1 = p; } else if (d < d2) d2 = d;
        }
        d1 = Math.sqrt(d1); d2 = Math.sqrt(d2);
        var edge = d2 - d1;
        var ox = wrapd(x + 0.5 - pts[k1][0]) / rad, oy = wrapd(y + 0.5 - pts[k1][1]) / rad;
        var shade = (1.05 - (ox + oy) * 0.18) * (0.7 + 0.3 * clamp01(edge / 3));
        var k = tones[k1] * (0.8 + n[y * N + x] * 0.4) * shade;
        var c = [base[0] * k, base[1] * k, base[2] * k];
        c = mix([9, 11, 16], c, clamp01((edge - 0.4) / 1.4));        // щель между камнями
        if (ice) {
          var f = fr[y * N + x], gap = 1 - clamp01((edge - 0.4) / 2.2);
          var a = clamp01((f - (0.66 - 0.1 * ice)) * 3) * 0.75 + gap * 0.35 * ice;
          if (a > 0) c = mix(c, iceCol, Math.min(0.85, a));
        }
        var o = (y * N + x) * 3;
        out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2];
      }
    }
    return out;
  }

  // Шесть текстур одной стопкой; номер — слой в шейдере. Одна раскладка камней на сухой,
  // заиндевевший и ледяной — ярусы переходят без шва.
  function makeTextures() {
    return [
      stonesTex(61, 6, [104, 106, 112], 0),                    // 0 — сухой камень
      stonesTex(61, 6, [104, 106, 112], 0.7),                  // 1 — в инее
      stonesTex(61, 6, [96, 102, 114], 1.6, [150, 205, 228]),  // 2 — во льду (и торец хода)
      stonesTex(67, 3, [118, 120, 128], 0),                    // 3 — ворота: крупный камень
      stonesTex(71, 8, [84, 86, 92], 0),                       // 4 — пол
      stonesTex(71, 8, [80, 86, 98], 1.2),                     // 5 — пол подо льдом
    ];
  }

  /* --- мир: ярусы, огни, спрайты, снег, кольца хода ---------------------------- */

  // Ярус по глубине: 3 — сверху (нынешнее место работы), 1 — в самом низу.
  function levelOf(gates, y) { return gates.length < 2 ? 3 : y < gates[0] ? 3 : y < gates[1] ? 2 : 1; }

  // Камень грани по ярусу: сверху сухой, глубже — в инее и во льду. 5…7 — слои 0…2.
  function wallType(lv, r) {
    var p = lv === 3 ? [0.7, 0.3, 0] : lv === 2 ? [0.3, 0.5, 0.2] : [0.1, 0.3, 0.6], u = r();
    return u < p[0] ? 5 : u < p[0] + p[1] ? 6 : 7;
  }

  /* Огни и спрайты. Порядок обращений к генератору — ровно как в прототипе: от него зависит, где
     что стоит, а владелец одобрял именно этот мир. kind: 0 — сосулька, 1 — каменный нарост,
     2 — ледяной нарост, 3 — кристалл (светится сам и светит вокруг). */
  function buildWorld(gates) {
    var lights = [], sprites = [], rs = rng(91), x0 = CX - 1.15, x1 = CX + 1.15;   // пол ~2,5 клетки вокруг оси
    function light(x, y, z, i, rad) {
      var o = { x: x, y: y, z: z, base: i, i: i, inv: 1 / (rad * rad), phase: lights.length * 1.37 + 0.4 };
      lights.push(o);
      return o;
    }
    function nearGate(y, d) {
      for (var k = 0; k < gates.length; k++) if (Math.abs(y - gates[k]) < d) return true;
      return false;
    }
    for (var y = 2; y < ML - 2; y++) {
      var lv = levelOf(gates, y);
      // сосульки растут из свода-арки над своим местом; запас вверх прячется в камне по глубине
      for (var n = 0; n < 2; n++) {
        if (rs() < ICICLES[lv] && !nearGate(y, 1.2)) {
          var icx = x0 + 0.2 + rs() * (x1 - x0 - 0.4), dxi = icx - CX;
          var ic = { kind: 0, x: icx, y: y + rs(), len: 0.18 + rs() * 0.42, w: 0.1 + rs() * 0.12 };
          ic.top = EYE + Math.sqrt(Math.max(0, T_R0 * T_R0 - dxi * dxi)) + 0.2;
          ic.len += 0.2;
          sprites.push(ic);
        }
      }
      // наросты на полу у стен
      if (rs() < 0.22 && !nearGate(y, 1.5)) {
        var side = rs() < 0.5, iceMite = ICE >= lv || (ICE >= 1 && rs() < 0.25);
        sprites.push({ kind: iceMite ? 2 : 1, x: side ? x0 + 0.25 + rs() * 0.3 : x1 - 0.25 - rs() * 0.3,
          y: y + rs(), h: 0.2 + rs() * 0.35, w: 0.18 + rs() * 0.14 });
      }
      // кристаллы — светятся; глубже чаще
      if (rs() < CRYSTAL_P[lv] * CRYSTALS && !nearGate(y, 1.5)) {
        var left = rs() < 0.5, cxw = left ? x0 + 0.3 + rs() * 0.25 : x1 - 0.3 - rs() * 0.25, cyw = y + 0.2 + rs() * 0.6;
        var hgt = 0.22 + rs() * 0.2;
        var lt = light(cxw, cyw, hgt * 0.6, 0.9, 1.1);
        sprites.push({ kind: 3, x: cxw, y: cyw, h: hgt, w: 0.34, light: lt });
      }
    }
    // ворота — сужение хода; перед ним по крупному кристаллу с каждой стороны
    for (var g = 0; g < gates.length; g++) {
      for (var s = 0; s < 2; s++) {
        var gx = CX + (s ? 0.5 : -0.5), gy = gates[g] - 1;
        var gl = light(gx, gy, 0.25, 1.1, 1.2);
        sprites.push({ kind: 3, x: gx, y: gy, h: 0.32, w: 0.34, light: gl });
      }
    }
    return { lights: lights, sprites: sprites };
  }

  // Снег: точки стоят в мире (повтор через 12 клеток) и падают от свода к полу, качаясь.
  function buildFlakes() {
    var rf = rng(57), out = [];
    for (var k = 0; k < 90; k++) out.push({ x: 1.2 + rf() * 6.6, y: rf(), z: rf(), sp: 0.5 + rf(), ph: rf() * 6.28 });
    return out;
  }

  /* Атлас форм разломов: главный разлом — ломаная сверху вниз, шире в середине, плюс две-три ветки
     вбок. Поле расстояний со знаком (внутри разлома меньше нуля) даёт четыре канала: R — дыра, G —
     кромка, B — свечение на камне вокруг, A — дымка: у края дыры она светится изнутри и тает к
     середине. cores — тексели дыры каждой формы (откуда вылетают знаки). */
  function riftAtlas() {
    var stride = RS_W * RS_N, out = new Uint8Array(stride * RS_H * 4), cores = [];
    for (var sh = 0; sh < RS_N; sh++) {
      var r = rng(301 + sh * 17), segs = [], pts = [], x = 32 + (r() - 0.5) * 12, y = 10;
      pts.push([x, y]);
      while (y < RS_H - 10) {
        y = Math.min(RS_H - 10, y + 6 + r() * 10);
        x = Math.max(12, Math.min(52, x + (r() < 0.5 ? -1 : 1) * (2 + r() * 8)));
        pts.push([x, y]);
      }
      var wMax = 3.5 + r() * 2;
      var halfw = function (t) { return wMax * Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.7); };
      for (var i = 0; i < pts.length - 1; i++) {
        var t0 = i / (pts.length - 1), t1 = (i + 1) / (pts.length - 1);
        segs.push([pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], halfw(t0) * (0.8 + 0.4 * r()), halfw(t1) * (0.8 + 0.4 * r())]);
      }
      var nb = 2 + (r() < 0.5 ? 1 : 0);
      for (var b = 0; b < nb; b++) {
        var k = 1 + Math.floor(r() * (pts.length - 2)), bx = pts[k][0], by = pts[k][1], dir = r() < 0.5 ? -1 : 1;
        var len = 20 + r() * 40, w0 = halfw(k / (pts.length - 1)) * 0.55, steps = 3 + Math.floor(r() * 3), dy0 = (r() - 0.5) * 1.6;
        for (var st = 0; st < steps; st++) {
          var nx = Math.max(2, Math.min(RS_W - 3, bx + dir * (len / steps) * (0.6 + r() * 0.8)));
          var ny = Math.max(2, Math.min(RS_H - 3, by + (len / steps) * dy0 + (r() - 0.5) * 6));
          segs.push([bx, by, nx, ny, w0 * (1 - st / steps), w0 * (1 - (st + 1) / steps)]);
          bx = nx; by = ny;
        }
      }
      var core = [];
      for (var ty = 0; ty < RS_H; ty++) {
        for (var tx = 0; tx < RS_W; tx++) {
          var px = tx + 0.5, py = ty + 0.5, sd = 1e9;
          for (var q = 0; q < segs.length; q++) {
            var sg = segs[q], ex = sg[2] - sg[0], ey = sg[3] - sg[1], L2 = ex * ex + ey * ey;
            var u = L2 > 0 ? Math.max(0, Math.min(1, ((px - sg[0]) * ex + (py - sg[1]) * ey) / L2)) : 0;
            var ddx = px - (sg[0] + ex * u), ddy = py - (sg[1] + ey * u);
            var d = Math.sqrt(ddx * ddx + ddy * ddy) - (sg[4] + (sg[5] - sg[4]) * u);
            if (d < sd) sd = d;
          }
          var o = (ty * stride + sh * RS_W + tx) * 4;
          out[o] = sd < 0 ? 255 : 0;
          out[o + 1] = sd >= 0 && sd < 1.3 ? 255 : 0;
          out[o + 2] = sd >= 0 && sd < 14 ? Math.round(255 * Math.exp(-sd / 3)) : 0;
          out[o + 3] = sd < 0 ? Math.round(255 * Math.max(0, 1 + sd / 2.5)) : 0;
          if (sd < -0.8) core.push(tx, ty);
        }
      }
      cores.push(core);
    }
    return { data: out, cores: cores };
  }

  /* Разломы вдоль хода: через шаг RIFT.step (с разбросом), кроме ворот; на стенах — слева, справа, на
     своде (углы, которые видны над полом); иногда на полу — поперёк хода. Свои зёрна: мир пещеры
     (огни, спрайты) от них не меняется. a — угол θ (стена) или x (пол). */
  function buildRifts(gates, rv) {
    var out = [], r = rng(173);
    for (var y = 5 + r() * 2; y < ML - 7; y += rv.step * (0.7 + r() * 0.6)) {
      var near = false;
      for (var k = 0; k < gates.length; k++) if (Math.abs(y - gates[k]) < 2.2) near = true;
      var floor = r() < rv.floor, s = rv.size[0] + r() * (rv.size[1] - rv.size[0]), shape = Math.floor(r() * RS_N);
      var phase = r() * 6.28, side = r(), jit = r() - 0.5, phi = r() * Math.PI;
      if (near) continue;
      var o = { kind: floor ? 1 : 0, y: y, s: s, shape: shape, phase: phase };
      if (floor) {
        o.a = CX + jit * 1.0;
        phi = Math.PI / 2 + (phi / Math.PI - 0.5) * 1.0;   // поперёк хода
        o.s = s * 0.85;
      } else {
        var th = side < 0.42 ? Math.PI + jit * 0.7 : side < 0.84 ? jit * 0.7 : Math.PI / 2 + jit * 1.0;
        o.a = ((th + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
      }
      o.cos = Math.cos(phi); o.sin = Math.sin(phi);
      out.push(o);
      if (out.length >= MAXR) break;
    }
    return out;
  }

  /* Кольца хода. Камера на оси (x = CX, z = EYE) и смотрит вдоль y. Кольцо через клетку —
     многоугольник из TUBE вершин со своим разбросом; у ворот кольцо уже на треть. Таблица
     кольца — T_BINS отсчётов угла: расстояние от оси до грани, тон грани (свой у каждой, по
     наклону к свету, темнее у ребра) и камень. Четыре числа на отсчёт: (радиус, тон, камень, 0). */
  function buildTube(gates) {
    var r = rng(131), TAU = Math.PI * 2, crease = TAU / T_BINS * 3, out = new Float32Array(ML * T_BINS * 4);
    for (var k = 0; k < ML; k++) {
      var gk = 1;
      for (var q = 0; q < gates.length; q++) { var dg = k - gates[q]; gk = Math.min(gk, 1 - 0.3 * Math.exp(-dg * dg / 0.8)); }
      var lv = levelOf(gates, k + 0.5), a0 = r() * TAU, angs = [], px = [], pz = [], types = [], tones = [];
      for (var i = 0; i < TUBE; i++) {
        var a = a0 + (i + (r() - 0.5) * T_JIT * 2) * TAU / TUBE, rad = T_R0 * gk * (1 + (r() - 0.5) * T_JIT * 2);
        angs.push(a); px.push(rad * Math.cos(a)); pz.push(rad * Math.sin(a));
        types.push(wallType(lv, r)); tones.push(0.86 + r() * 0.28);
      }
      for (var b = 0; b < T_BINS; b++) {
        var th = (b + 0.5) / T_BINS * TAU - Math.PI;
        var rel = ((th - angs[0]) % TAU + TAU) % TAU, e = TUBE - 1;
        for (var j = 0; j < TUBE - 1; j++) if (rel < angs[j + 1] - angs[0]) { e = j; break; }
        var e1 = (e + 1) % TUBE, ex = px[e1] - px[e], ez = pz[e1] - pz[e], dx = Math.cos(th), dz = Math.sin(th);
        var den = dx * ez - dz * ex;                                           // cross(d, E)
        var s = Math.abs(den) > 1e-9 ? (px[e] * ez - pz[e] * ex) / den : T_R0;  // cross(P0, E) / cross(d, E)
        var toEdge = Math.min(Math.abs(rel - (angs[e] - angs[0])), Math.abs((e1 ? angs[e1] - angs[0] : TAU) - rel));
        var el = Math.sqrt(ex * ex + ez * ez) || 1, nx = -ez / el, nz = ex / el;   // нормаль грани внутрь хода
        var lit = 0.62 + 0.5 * Math.max(0, nx * T_LIGHT[0] + nz * T_LIGHT[1]);
        var o = (k * T_BINS + b) * 4;
        out[o] = s > 0.2 ? s : T_R0;
        out[o + 1] = tones[e] * lit * (toEdge < crease ? 0.6 + 0.4 * toEdge / crease : 1);
        out[o + 2] = types[e];
      }
    }
    return out;
  }

  /* Ворота — там, где кончается одно место работы и начинается следующее: камера проходит их,
     когда верх следующей карточки — на середине окна. Всё в координатах страницы. */
  function gatesFrom(secTop, secH, vh, jobTops) {
    var gates = [];
    for (var k = 0; k < jobTops.length && k < 2; k++) {
      var gy = Math.round(Y0 + (Y1 - Y0) * clamp01((jobTops[k] + vh / 2 - secTop) / (secH + vh)));
      gates.push(Math.max(5, Math.min(ML - 8, gy)));
    }
    if (gates.length === 2 && gates[1] - gates[0] < 4) gates[1] = gates[0] + 4;
    return gates;
  }

  // Камера по прокрутке: верх пещеры у низа окна — начало хода, низ пещеры за верхом окна — конец.
  function camTarget(vh, secTop, secH) { return Y0 + (Y1 - Y0) * clamp01((vh - secTop) / (secH + vh)); }

  /* Края пещеры по раскладке, в координатах страницы: inY — низ текста раздела выше, headY — верх
     заголовка «Опыт работы», lastY — низ последнего места работы, outY — верх заголовка раздела ниже.
     Пещера — darkTop…darkBot; темнота цвета фона — darkTop…alphaTop и alphaBot…darkBot, камни —
     inTop…fullTop и fullBot…outBot. */
  function zoneFrom(inY, headY, lastY, outY) {
    var s0 = inY + EDGE_M * (headY - inY), s1 = outY - EDGE_M * (outY - lastY), t = Math.max(Math.min(EDGE_T, (s1 - s0) / 2), 1);
    return { darkTop: s0, alphaTop: s0 + EDGE_A * t, inTop: s0 + EDGE_L * t, fullTop: s0 + t,
      fullBot: s1 - t, outBot: s1 - EDGE_L * t, alphaBot: s1 - EDGE_A * t, darkBot: s1 };
  }
  // Те же края, сдвинутые на d (от верха раздела — в окно и обратно).
  function shiftZone(z, d) {
    return { darkTop: z.darkTop + d, alphaTop: z.alphaTop + d, inTop: z.inTop + d, fullTop: z.fullTop + d,
      fullBot: z.fullBot + d, outBot: z.outBot + d, alphaBot: z.alphaBot + d, darkBot: z.darkBot + d };
  }

  // Непрозрачность (темнота цвета фона) и свет (камни) в ряду ys; Z — края в тех же координатах. Как в шейдере.
  function edgeAt(ys, Z) {
    return [
      Math.min(smooth01((ys - Z.darkTop) / Math.max(Z.alphaTop - Z.darkTop, 1)), smooth01((Z.darkBot - ys) / Math.max(Z.darkBot - Z.alphaBot, 1))),
      Math.min(smooth01((ys - Z.inTop) / Math.max(Z.fullTop - Z.inTop, 1)), smooth01((Z.outBot - ys) / Math.max(Z.outBot - Z.fullBot, 1))),
    ];
  }
  // Видимость пещеры — камней — в ряду: непрозрачность × свет.
  function rampAt(ys, Z) { var e = edgeAt(ys, Z); return e[0] * e[1]; }

  // Арт персонажа — точки RGBA (точка арта — точка пещеры) из строки с повторами (make_js.py).
  function artPixels(K) {
    var data = new Uint8Array(K.w * K.h * 4);
    K.rle.split('|').forEach(function (row, y) {
      var x = 0, n = '';
      for (var i = 0; i < row.length; i++) {
        var ch = row[i];
        if (ch >= '0' && ch <= '9') { n += ch; continue; }
        var cnt = n ? +n : 1, c = ch === '.' ? null : K.pal[ch.charCodeAt(0) - 97];
        n = '';
        for (var k = 0; k < cnt; k++, x++) {
          if (!c) continue;
          var o = (y * K.w + x) * 4;
          data[o] = parseInt(c.slice(0, 2), 16); data[o + 1] = parseInt(c.slice(2, 4), 16); data[o + 2] = parseInt(c.slice(4, 6), 16);
          data[o + 3] = 255;
        }
      }
    });
    return { w: K.w, h: K.h, data: data };
  }

  /* Персонаж в мире: место по ходу — по раскладке (верх его места работы jobTop и пещера darkTop…darkBot — в
     координатах страницы, окно высотой vh): c.d клеток перед камерой той прокрутки, при которой верх места
     работы — на c.ref окна, и на долю KN_SLOPE в клетке — там скат дальней стенки ниши у него за спиной. На полу
     в нише своей стены (край — на KN_NICHE за краем пола), ростом c.h. */
  function charAt(c, jobTop, darkTop, darkBot, vh) {
    var sRef = jobTop - c.ref * vh, w = c.h * c.art.w / c.art.h;
    var y = Math.floor(camTarget(vh, darkTop - sRef, darkBot - darkTop) + c.d) + KN_SLOPE;
    return { x: CX + c.side * (1.15 + KN_NICHE - w / 2), y: y, w: w, h: c.h, side: c.side, c: c };
  }

  /* Силуэт персонажа вокруг оси хода: в каждом отсчёте угла таблицы колец — расстояние от оси до самой дальней
     точки арта (0 — точек нет). Точка арта — клетка: берутся её углы; отсчёт — с соседями, потому что шейдер
     смешивает два соседних (tubeCast). */
  function charReach(kn) {
    var a = artPixels(kn.c.art), need = new Float32Array(T_BINS), TAU = Math.PI * 2;
    for (var j = 0; j < a.h; j++) {
      for (var i = 0; i < a.w; i++) {
        if (a.data[(j * a.w + i) * 4 + 3] < 128) continue;
        for (var q = 0; q < 4; q++) {
          var x = kn.x - kn.w / 2 + (i + (q & 1)) / a.w * kn.w - CX, z = kn.h * (1 - (j + (q >> 1)) / a.h) - EYE;
          var b = Math.floor((Math.atan2(z, x) + Math.PI) / TAU * T_BINS) % T_BINS, r = Math.sqrt(x * x + z * z);
          for (var db = -1; db <= 1; db++) {
            var bb = (b + db + T_BINS) % T_BINS;
            if (r > need[bb]) need[bb] = r;
          }
        }
      }
    }
    return need;
  }

  /* Ниша персонажа: в таблице колец хода (buildTube) на двух кольцах перед ним радиус в секторе его стены — не
     меньше KN_NICHE_R; на кольце за ним стена прежняя (раздвигается, только где это нужно полу и ему самому, —
     ниже), и между ними — скат, дальняя стенка ниши, у которой он стоит. Сектор — от направления к стене вниз до 24° (угол пола под ногами) и вверх до 14° (над головой), края
     — плавно, по 8°. Пол ниши — общий пол хода, ровный до задней стенки: ниже угла пола у стенки нижние грани хода
     на тех же двух кольцах уходят под пол на KN_FLOOR (иначе они встают над полом, и персонаж стоит на грани
     стены), к прямому «вниз» — плавно. Кольцо за ним — так, чтобы на его месте по ходу (доля KN_SLOPE между
     кольцами) пол ещё был виден, а сразу за ним скат доходил до пола. Сам персонаж — весь внутри: по углам его
     силуэта (charReach) оба кольца перед ним не уже его точек на KN_GAP, кольцо за ним — тоже, на его месте. */
  function carveNiche(out, kn) {
    var k0 = Math.floor(kn.y), lo = -0.42, hi = 0.24, soft = 0.14, floorR = new Float32Array(T_BINS);
    var f = Math.max(kn.y - k0, 0.05);   // доля между кольцами (KN_SLOPE); ноль дал бы в таблицу NaN
    for (var k = k0 - 1; k <= k0; k++) {
      if (k < 0 || k >= ML) continue;
      for (var b = 0; b < T_BINS; b++) {
        var th = (b + 0.5) / T_BINS * 2 * Math.PI - Math.PI;   // угол вокруг оси хода: вправо — 0, влево — ±π
        var el = kn.side > 0 ? th : (th > 0 ? Math.PI - th : -(Math.PI + th));   // от направления к его стене
        var out1 = el < lo ? lo - el : el > hi ? el - hi : 0, w = smooth01(1 - out1 / soft);
        var o = (k * T_BINS + b) * 4;
        if (w > 0) out[o] = Math.max(out[o], out[o] + (KN_NICHE_R - out[o]) * w);
        // пол: только своя нижняя четверть (−90°…0°), ниже угла пола у задней стенки; к −72° сходит на нет
        var fr = el < 0 && el > -Math.PI / 2 ? EYE / Math.sin(-el) : Infinity, wf = smooth01((el + 1.25) / 0.25);
        if (fr < KN_NICHE_R && wf > 0) {
          out[o] = Math.max(out[o], out[o] + (fr + KN_FLOOR - out[o]) * wf);
          if (wf >= 1) floorR[b] = fr;
        }
      }
    }
    if (k0 < 1 || k0 + 1 >= ML) return out;
    for (var bf = 0; bf < T_BINS; bf++) {   // пол на его месте по ходу — до самых ног и между ними
      if (!floorR[bf]) continue;
      var t0 = floorR[bf] + KN_GAP, of0 = (k0 * T_BINS + bf) * 4, of1 = ((k0 + 1) * T_BINS + bf) * 4;
      if (out[of0] >= t0) out[of1] = Math.max(out[of1], (t0 - (1 - f) * out[of0]) / f);
    }
    var need = charReach(kn);
    for (var b2 = 0; b2 < T_BINS; b2++) {
      if (!need[b2]) continue;
      var r = need[b2] + KN_GAP, o0 = (k0 * T_BINS + b2) * 4, o1 = ((k0 + 1) * T_BINS + b2) * 4;
      out[o0 - T_BINS * 4] = Math.max(out[o0 - T_BINS * 4], r);
      out[o0] = Math.max(out[o0], r);
      out[o1] = Math.max(out[o1], (r - (1 - f) * out[o0]) / f);
    }
    return out;
  }

  // Свет в точке — для спрайтов, один раз на спрайт: рассеянный яруса, «фонарь» камеры, огни рядом.
  function lightAt(lights, gates, wx, wy, wz, dist, out) {
    var amb = AMB[levelOf(gates, wy)], di = (dist * 20) | 0, d = di / 20, hd = di < 2000 ? HEAD / (1 + d * d * HEAD_K) : 0;
    var r = amb[0] + hd, g = amb[1] + hd, b = amb[2] + hd, w2 = LWIN * LWIN;
    for (var j = 0; j < lights.length; j++) {
      var o = lights[j], dy = wy - o.y, w = 1 - dy * dy / w2;
      if (w <= 0) continue;
      var dx = wx - o.x, dz = wz - o.z, k = o.i * w * w / (1 + (dx * dx + dy * dy + dz * dz) * o.inv);
      r += CRYSTAL_RGB[0] * k; g += CRYSTAL_RGB[1] * k; b += CRYSTAL_RGB[2] * k;
    }
    out[0] = r; out[1] = g; out[2] = b;
  }

  // Кристаллы дышат медленно: сила огня и яркость кристалла в этот миг.
  function breathe(lights, time) {
    for (var i = 0; i < lights.length; i++) {
      var o = lights[i];
      o.f = 0.82 + 0.18 * Math.sin(time / 900 + o.phase);
      o.i = o.base * o.f;
    }
  }

  /* --- шейдеры ------------------------------------------------------------------- */

  function fl(x) { var s = String(x); return /[.e]/.test(s) ? s : s + '.0'; }
  function v3(a) { return 'vec3(' + a.map(fl).join(', ') + ')'; }

  // Постоянные — из тех же чисел, что выше: в JS и в шейдере одна пещера.
  var GLSL_HEAD = [
    '#version 300 es',
    'precision highp float;',
    'precision highp int;',
    'precision highp sampler2D;',
    'const float PI = 3.141592653589793, TAU = 6.283185307179586;',
    'const float ML = ' + fl(ML) + ', CX = ' + fl(CX) + ', EYE = ' + fl(EYE) + ', NEAR = ' + fl(NEAR) + ';',
    'const int MLI = ' + ML + ', BINSI = ' + T_BINS + ', MAXL = ' + MAXL + ';',
    'const float BINS = ' + fl(T_BINS) + ', UREP = ' + fl(T_UREP) + ', DEPTH_K = ' + fl(DEPTH_K) + ';',
    'const vec3 FOG = ' + v3(FOG) + ';',
    'const float FOG_K = ' + fl(FOG_K) + ', HEAD = ' + fl(HEAD) + ', HEAD_K = ' + fl(HEAD_K) + ', EXPO = ' + fl(EXPO) + ';',
    'const float LWIN2 = ' + fl(LWIN * LWIN) + ';',
    'const vec3 LRGB = ' + v3(CRYSTAL_RGB) + ';',
    'const vec3 AMB3 = ' + v3(AMB[3]) + ', AMB2 = ' + v3(AMB[2]) + ', AMB1 = ' + v3(AMB[1]) + ';',
    'const float MASK = ' + fl(MASK) + ', MASK_SOFT = ' + fl(MASK_SOFT) + ', L_TEXT = ' + fl(L_TEXT) + ', L_OUT = ' + fl(L_OUT) + ';',
    'const int MAXR = ' + MAXR + ', RS_W = ' + RS_W + ', RS_H = ' + RS_H + ', GLYPHS = ' + GLYPH_KEYS.length + ';',
    'const float KN_W = ' + fl(KNIGHT.w) + ', KN_HA = ' + fl(KNIGHT.h) + ', MG_W = ' + fl(MAGE.w) + ', MG_HA = ' + fl(MAGE.h) +
      ', KN_M = ' + fl(KN_SPARK) + ';',
    '#define KNIGHT_ANIM ' + KNIGHT_ANIM,
    'const float R_BOX_W = ' + fl(R_BOX_W) + ', R_BOX_L = ' + fl(R_BOX_L) + ';',
    '',
  ].join('\n');

  /* Подача — функция точки экрана, поэтому её можно делать в каждом проходе (стены, спрайты,
     снег) в момент записи: побеждает по глубине одна точка, и обработана будет она. xs, ys — центр
     точки в CSS px от левого верхнего угла окна. Края — в окне: uDt…uAt и uAb…uDb — темнота цвета фона,
     uIt…uTt и uBb…uOb — камни. Цвет 0…255, на выходе — с умноженной прозрачностью (так холст WebGL отдаёт
     странице). */
  var GLSL_FINISH = [
    'uniform float uCW, uH, uDt, uAt, uIt, uTt, uBb, uOb, uAb, uDb, uWrL, uWrR, uSecT, uSecB;',
    'uniform float uBodyL, uBodyR;',   // левый край колонки строк мест работы и правый край самих строк, px окна
    'uniform vec4 uMeta[8];',  // текст колонки дат каждого места работы — рамки в окне, px
    'uniform int uNMeta;',
    'uniform float uF, uHz, uVw0;',
    'uniform vec2 uGates;',
    'uniform int uNG;',
    'float sm(float x) { return smoothstep(0.0, 1.0, x); }',
    'float levelOf(float y) { return uNG < 2 ? 3.0 : (y < uGates.x ? 3.0 : (y < uGates.y ? 2.0 : 1.0)); }',
    // непрозрачность (темнота цвета фона) и свет (камни) в ряду ys
    'vec2 edge(float ys) {',
    '  return vec2(min(sm((ys - uDt) / max(uAt - uDt, 1.0)), sm((uDb - ys) / max(uDb - uAb, 1.0))),',
    '              min(sm((ys - uIt) / max(uTt - uIt, 1.0)), sm((uOb - ys) / max(uOb - uBb, 1.0))));',
    '}',
    'float lin(float c) { c /= 255.0; return c <= 0.04045 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4); }',
    'float unlin(float l) { return 255.0 * (l <= 0.0031308 ? l * 12.92 : 1.055 * pow(l, 1.0 / 2.4) - 0.055); }',
    // доля защиты текста в точке: весь блок текста (пещера) или только строки и текст колонки дат (рыцарь)
    'float kaWrap(float xs) { return 1.0 - sm(max(max(uWrL - xs, xs - uWrR), 0.0) / MASK_SOFT); }',
    'float kaText(float xs, float ys) {',
    '  float ka = 1.0 - sm(max(max(uBodyL - xs, xs - uBodyR), 0.0) / 32.0);',   // края строк — узкие: строки ровно в uBodyL…uBodyR
    '  for (int i = 0; i < 8; i++) {',
    '    if (i >= uNMeta) break;',
    '    vec2 q = max(max(uMeta[i].xy - vec2(xs, ys), vec2(xs, ys) - uMeta[i].zw), vec2(0.0));',
    '    ka = max(ka, 1.0 - sm(length(q) / 40.0));',
    '  }',
    '  return ka;',
    '}',
    'vec4 finishK(vec3 c, float xs, float ys, float ka) {',
    '  vec2 e = edge(ys);',
    '  float a8 = floor(clamp(e.x * 255.0, 0.0, 255.0));',
    '  if (a8 < 1.0) return vec4(0.0);',
    '  float lt = e.y;',
    '  float m = (MASK + (1.0 - MASK) * (1.0 - ka)) * lt;',
    '  vec3 r = FOG + (c - FOG) * m;',
    '  if (ka > 0.0) {',   // под блоком текста — не ярче предела, оттенок тот же; вне раздела предел строже
    '    float lim = mix(L_OUT, L_TEXT, sm((ys - uSecT + 30.0) / 60.0) * sm((uSecB - ys + 30.0) / 60.0));',
    '    vec3 l = vec3(lin(r.r), lin(r.g), lin(r.b));',
    '    float Y = dot(l, vec3(0.2126, 0.7152, 0.0722));',
    '    if (Y > lim) r += (vec3(unlin(l.r * lim / Y), unlin(l.g * lim / Y), unlin(l.b * lim / Y)) - r) * ka;',
    '  }',
    '  float a = a8 / 255.0;',
    '  return vec4(floor(clamp(r, 0.0, 255.0)) / 255.0 * a, a);',
    '}',
    'vec4 finish(vec3 c, float xs, float ys) { return finishK(c, xs, ys, kaWrap(xs)); }',
    '',
  ].join('\n');

  // Один треугольник на весь холст — без буферов, по номеру вершины.
  var VS_FULL = GLSL_HEAD + [
    'void main() {',
    '  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));',
    '  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);',
    '}',
  ].join('\n');

  /* Стены, пол и торец. Луч точки экрана в сечении идёт от оси под углом θ = atan2(vz, sx) и
     удаляется от неё на ρ = √(sx² + vz²) на клетку глубины. Стену ищем по кольцам: между кольцами
     k и k + 1 радиус под углом θ меняется линейно, встреча — из одного уравнения ρ·t = R(cy + t).
     Пол — плоскость z = 0. Свет копится так же, как в прототипе; шаг «фонаря» и тумана — 1/20 клетки
     (там это были таблицы). */
  var FS_TUBE = GLSL_HEAD + GLSL_FINISH + [
    'uniform sampler2D uRing, uTex, uLights, uRift, uRiftD, uGlyph;',
    'uniform int uNL, uNR;',
    'uniform float uCam, uScrollK, uTime;',
    'uniform vec2 uMouse;',
    'float hash2(float x, float y) { return fract(sin(x * 127.1 + y * 311.7) * 43758.5453); }',
    // «слой кода» в дыре разлома — фон сайта: знаки его набора, сетка 6 × 8 точек пещеры, отстаёт
    // от прокрутки, как поле страницы; знаки изредка вспыхивают, у курсора горят бирюзой, как поле
    'vec3 codeAt(float xs, float ys) {',
    '  float px = floor(xs / uCW), py = floor((ys + uScrollK) / uCW);',
    '  float gcx = floor(px / 6.0), gcy = floor(py / 8.0);',
    '  int gx = int(px - gcx * 6.0), gy = int(py - gcy * 8.0);',
    '  if (gx > 4 || gy > 6) return FOG;',
    '  int gi = min(GLYPHS - 1, int(hash2(gcx, gcy) * float(GLYPHS)));',
    '  if (texelFetch(uGlyph, ivec2(gi * 5 + gx, gy), 0).r < 0.5) return FOG;',
    '  float flash = step(0.97, hash2(gcx + floor(uTime / 420.0) * 13.0, gcy));',
    '  vec2 cc = vec2((gcx * 6.0 + 2.5) * uCW, (gcy * 8.0 + 3.5) * uCW - uScrollK);',
    '  float lit = clamp(max(flash, 1.0 - length(cc - uMouse) / 132.0), 0.0, 1.0);',
    '  return mix(vec3(80.0, 88.0, 108.0), vec3(0.0, 197.0, 205.0), lit);',
    '}',
    // разлом в точке стены или пола: r — дыра, g — кромка, b — свечение × сила, a — дымка × сила
    'vec4 riftAt(int surf, vec3 w, float bf) {',
    '  vec4 acc = vec4(0.0);',
    '  if (surf > 1) return acc;',
    '  float th = (bf + 0.5) / BINS * TAU - PI;',
    '  for (int i = 0; i < MAXR; i++) {',
    '    if (i >= uNR) break;',
    '    vec4 d0 = texelFetch(uRiftD, ivec2(2 * i, 0), 0), d1 = texelFetch(uRiftD, ivec2(2 * i + 1, 0), 0);',
    '    if (int(d0.x + 0.5) != surf) continue;',
    '    float ly = w.y - d0.z;',
    '    if (abs(ly) > d0.w * (R_BOX_L + R_BOX_W) * 0.5) continue;',
    '    float lx = surf == 0 ? (mod(th - d0.y + PI, TAU) - PI) * 1.45 : w.x - d0.y;',
    '    float ay = lx * d1.x + ly * d1.y, ax = ly * d1.x - lx * d1.y;',
    '    float tx = ax / (d0.w * R_BOX_W) * float(RS_W) + float(RS_W) * 0.5, ty = ay / (d0.w * R_BOX_L) * float(RS_H) + float(RS_H) * 0.5;',
    '    if (tx < 0.0 || ty < 0.0 || tx >= float(RS_W) || ty >= float(RS_H)) continue;',
    '    vec4 t = texelFetch(uRift, ivec2(int(d1.z + 0.5) * RS_W + int(tx), int(ty)), 0);',
    '    acc = max(acc, vec4(t.r, t.g, t.b * d1.w, t.a * d1.w));',
    '  }',
    '  return acc;',
    '}',
    'out vec4 outColor;',
    'uniform vec3 uKnF[2];',   // персонажи: место ног на полу (x, y) и радиус тени; радиус 0 — персонажа нет
    'float ringR(int b, int k) { return texelFetch(uRing, ivec2(b, k), 0).r; }',
    'vec3 ambAt(float lv) { return lv > 2.5 ? AMB3 : (lv > 1.5 ? AMB2 : AMB1); }',
    'vec3 lightAt(vec3 w, float di) {',
    '  float d = di / 20.0;',
    '  vec3 c = ambAt(levelOf(w.y)) + (di < 2000.0 ? HEAD / (1.0 + d * d * HEAD_K) : 0.0);',
    '  for (int j = 0; j < MAXL; j++) {',
    '    if (j >= uNL) break;',
    '    vec4 a = texelFetch(uLights, ivec2(j, 0), 0);',
    '    float dy = w.y - a.y, k = 1.0 - dy * dy / LWIN2;',
    '    if (k <= 0.0) continue;',
    '    float dx = w.x - a.x, dz = w.z - a.z;',
    '    c += LRGB * (texelFetch(uLights, ivec2(j, 1), 0).x * k * k / (1.0 + (dx * dx + dy * dy + dz * dz) * a.w));',
    '  }',
    '  return c;',
    '}',
    'float tubeCast(float bf, float rho, float cy) {',
    '  int b0 = int(bf), b1 = b0 + 1 == BINSI ? 0 : b0 + 1, k = int(floor(cy));',
    '  float fr = bf - float(b0);',
    '  float p0 = ringR(b0, k), R0 = p0 + (ringR(b1, k) - p0) * fr;',
    '  for (int it = 0; it < MLI; it++) {',
    '    if (k >= MLI - 1) break;',
    '    float q0 = ringR(b0, k + 1), R1 = q0 + (ringR(b1, k + 1) - q0) * fr;',
    '    float den = rho - (R1 - R0);',
    '    if (den > 1e-6) {',
    '      float t = (R0 + (R1 - R0) * (cy - float(k))) / den;',
    '      if (t > NEAR && t <= float(k) + 1.0 - cy + 1e-6 && t >= float(k) - cy - 1e-6) return t;',
    '    }',
    '    R0 = R1;',
    '    k++;',
    '  }',
    '  return ML - 1.0 - cy;',
    '}',
    'vec3 albedo(int layer, float u, float v) {',
    '  int x = min(63, int((u - floor(u)) * 64.0)), y = min(63, int((v - floor(v)) * 64.0));',
    '  return texelFetch(uTex, ivec2(x, y + layer * 64), 0).rgb;',
    '}',
    'void main() {',
    '  float ys = (uH - gl_FragCoord.y) * uCW, xs = gl_FragCoord.x * uCW;',
    '  vec2 e0 = edge(ys);',
    '  if (e0.x * 255.0 < 1.0) { outColor = vec4(0.0); gl_FragDepth = 0.0; return; }',
    // одна темнота цвета фона, камней нет: ход не считаем, спрайтам и снегу здесь не рисоваться
    '  if (e0.y <= 0.0) { outColor = finish(FOG, xs, ys); gl_FragDepth = 0.0; return; }',
    '  float sx = (xs - uVw0) / uF, vz = (uHz - ys) / uF, cy = uCam;',
    '  float bf = ((sx == 0.0 && vz == 0.0 ? 0.0 : atan(vz, sx)) + PI) / TAU * BINS - 0.5;',
    '  if (bf < 0.0) bf += BINS;',
    '  float rho = sqrt(sx * sx + vz * vz);',
    '  float t = tubeCast(bf, rho, cy);',
    '  int surf = t >= ML - 1.0 - cy - 1e-6 ? 5 : 0;',
    '  if (vz < 0.0) { float tf = EYE / -vz; if (tf < t) { t = tf; surf = 1; } }',
    '  vec3 w = vec3(CX + sx * t, cy + t, EYE + vz * t);',
    '  float lv = levelOf(w.y), glow = 0.0, sf = 1.0, tu, tv;',
    '  int layer;',
    '  if (surf == 0) {',
    '    vec4 rg = texelFetch(uRing, ivec2(int(bf), min(MLI - 1, int(w.y))), 0);',
    '    int ty = int(rg.b + 0.5);',
    '    if (uNG > 0 && abs(w.y - uGates.x) < 0.9) ty = 8;',   // сужение у ворот — крупный камень
    '    if (uNG > 1 && abs(w.y - uGates.y) < 0.9) ty = 8;',
    '    layer = ty - 5;',
    '    tu = bf / BINS * UREP; tv = w.y;',
    '    glow = ty == 7 ? 0.06 : (ty == 6 ? 0.02 : 0.0);',      // лёд светится сам — внизу видно и без кристаллов
    '    float fy = w.y - floor(w.y);',
    '    sf = rg.g * ((fy < 0.035 || fy > 0.965) ? 0.82 : 1.0);', // тон грани, шов у ребра и у кольца
    '  } else if (surf == 1) {',
    '    bool iceF = lv <= 2.0;',                                 // пол подо льдом — в двух нижних ярусах
    '    layer = iceF ? 5 : 4; tu = w.x; tv = w.y;',
    '    if (iceF) glow = 0.035;',
    '    for (int q = 0; q < 2; q++) if (uKnF[q].z > 0.0) sf *= mix(0.4, 1.0, smoothstep(0.35, 1.0, length((w.xy - uKnF[q].xy) / vec2(uKnF[q].z, uKnF[q].z * 0.5))));',   // тени под персонажами
    '  } else {',
    '    layer = 2; tu = w.x; tv = w.z;',
    '  }',
    '  float di = floor(t * 20.0), F = di < 2000.0 ? exp(-FOG_K * di / 20.0) : 0.0;',
    '  vec3 a = albedo(layer, tu, tv) * sf, l = lightAt(w, di);',
    '  vec4 rf = riftAt(surf, w, bf);',
    // свечение разлома ложится на камень, кромка — яркая бирюза; в дыре — слой кода с дымкой у края
    '  vec3 em = vec3(0.0, 175.0, 190.0) * rf.b * 0.55;',
    '  vec3 c = (vec3(a.r * (l.r + glow), a.g * (l.g + glow), a.b * (l.b + glow * 1.4)) * EXPO + em) * F + FOG * (1.0 - F);',
    '  if (rf.g > 0.5) c = mix(c, vec3(150.0, 245.0, 248.0) * min(1.0, 0.45 + rf.b) * F + FOG * (1.0 - F), 0.9);',
    '  if (rf.r > 0.5) {',
    '    vec3 code = mix(codeAt(xs, ys), vec3(0.0, 197.0, 205.0), min(1.0, rf.a) * 0.6);',
    '    c = code * (0.55 + 0.45 * F) + FOG * (0.45 - 0.45 * F);',
    '  }',
    '  gl_FragDepth = t / DEPTH_K;',
    '  outColor = finish(c, xs, ys);',
    '}',
  ].join('\n');

  /* Спрайты — по прямоугольнику на штуку, экземплярами. Форму решает каждая точка сама, теми же
     правилами, что в прототипе: u — доля ширины, z — высота в мире на глубине спрайта.
     Прямоугольник — с запасом в пиксель: края решает форма, а не растеризация. */
  var VS_SPRITE = GLSL_HEAD + [
    'layout(location = 0) in vec4 aRect;',   // xL, xR, yT, yB — CSS px
    'layout(location = 1) in vec4 aShape;',  // глубина, вид, верх/высота, длина
    'layout(location = 2) in vec4 aTone;',   // множитель цвета (rgb), туман
    'uniform float uCW, uW, uH;',
    'flat out vec4 vRect;',
    'flat out vec4 vShape;',
    'flat out vec4 vTone;',
    'void main() {',
    '  float fx = float(gl_VertexID & 1), fy = float(gl_VertexID >> 1);',
    '  float x = mix(aRect.x - uCW, aRect.y + uCW, fx), y = mix(aRect.z - uCW, aRect.w + uCW, fy);',
    '  gl_Position = vec4(x / (uW * uCW) * 2.0 - 1.0, 1.0 - y / (uH * uCW) * 2.0, aShape.x / DEPTH_K * 2.0 - 1.0, 1.0);',
    '  vRect = aRect; vShape = aShape; vTone = aTone;',
    '}',
  ].join('\n');

  var FS_SPRITE = GLSL_HEAD + GLSL_FINISH + [
    'flat in vec4 vRect;',
    'flat in vec4 vShape;',
    'flat in vec4 vTone;',
    'uniform sampler2D uGlyph;',
    'uniform sampler2D uKnight;',
    'uniform float uKTime;',
    'out vec4 outColor;',
    'float kHash(vec2 p) { p = fract(p * vec2(0.1031, 0.1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.x); }',
    // искра в точке арта: вспыхивает и гаснет в свой срок, с KNIGHT_ANIM > 0 искры поднимаются (6 точек в секунду)
    'float kSpark(vec2 c, float t) {',
    '#if KNIGHT_ANIM > 0',
    '  c.y += floor(t * 0.006);',
    '#endif',
    '  float h = kHash(c + 17.0);',
    '  if (h > 0.012) return 0.0;',
    '  float ph = fract(h * 83.0 + t * 0.00045);',
    '  return smoothstep(0.0, 0.15, ph) * (1.0 - smoothstep(0.5, 0.9, ph));',
    '}',
    'void main() {',
    '  float ys = (uH - gl_FragCoord.y) * uCW, xs = gl_FragCoord.x * uCW;',
    '  float u = (xs - vRect.x) / (vRect.y - vRect.x);',
    '  if (u < 0.0 || u > 1.0) discard;',
    '  float d = vShape.x, kind = vShape.y, z = EYE + ((uHz - ys) / uF) * d;',
    '  vec3 col;',
    '  if (kind > 4.5) {',                                   // персонаж (5 — рыцарь, 6 — маг): точка арта по месту в мире, вокруг искры
    '    float aw = kind > 5.5 ? MG_W : KN_W, ah = kind > 5.5 ? MG_HA : KN_HA, ax = kind > 5.5 ? KN_W : 0.0;',
    '    float v = (vShape.z - z) / vShape.w;',
    '    if (v < 0.0 || v > 1.0) discard;',
    '    vec2 a = vec2(u * (aw + 2.0 * KN_M), v * (ah + 2.0 * KN_M)) - KN_M;',
    '    vec4 kt = a.x >= 0.0 && a.y >= 0.0 && a.x < aw && a.y < ah ? texelFetch(uKnight, ivec2(a) + ivec2(int(ax), 0), 0) : vec4(0.0);',
    '    vec3 kc;',
    '    if (kt.a > 0.5) kc = kt.rgb * 255.0 * vTone.r;',
    '    else {',
    '      vec2 dd = (a - vec2(aw * 0.5, ah * 0.45)) / vec2(aw * 0.8, ah * 0.62);',
    '      float sp = kSpark(floor(a), uKTime) * (1.0 - smoothstep(0.55, 1.0, length(dd)));',
    '      if (sp < 0.35) discard;',
    '      kc = mix(vec3(86.0, 150.0, 182.0), vec3(196.0, 232.0, 244.0), sp);',
    '    }',
    '    outColor = finishK(kc * vTone.a + FOG * (1.0 - vTone.a), xs, ys, kaText(xs, ys));',
    '    return;',
    '  }',
    '  if (kind > 3.5) {',                                   // знак кода из разлома: гаснет в темноту
    '    float v = (vShape.z - z) / vShape.w;',
    '    if (v < 0.0 || v > 1.0) discard;',
    '    int gx = min(4, int(u * 5.0)), gy = min(6, int(v * 7.0));',
    '    if (texelFetch(uGlyph, ivec2(int(vTone.g + 0.5) * 5 + gx, gy), 0).r < 0.5) discard;',
    '    vec3 gc = FOG + (mix(vec3(0.0, 197.0, 205.0), vec3(150.0, 245.0, 248.0), vTone.b) - FOG) * vTone.r;',
    '    outColor = finish(gc * vTone.a + FOG * (1.0 - vTone.a), xs, ys);',
    '    return;',
    '  }',
    '  if (kind < 0.5) {',                                   // сосулька: сужается книзу
    '    float v = (vShape.z - z) / vShape.w;',
    '    if (v < 0.0 || v > 1.0) discard;',
    '    float hw = 0.5 * pow(1.0 - v, 0.9);',
    '    if (abs(u - 0.5) > hw) discard;',
    '    float e = (u - 0.5) / max(hw, 1e-6);',
    '    col = (e < -0.35 ? vec3(196.0, 232.0, 244.0) : (e > 0.45 ? vec3(40.0, 92.0, 128.0) : vec3(104.0, 168.0, 198.0))) * vTone.rgb;',
    '  } else if (kind < 2.5) {',                            // нарост: сужается кверху
    '    float v = z / vShape.z;',
    '    if (v < 0.0 || v > 1.0) discard;',
    '    float hw = 0.5 * pow(1.0 - v, 1.1);',
    '    if (abs(u - 0.5) > hw) discard;',
    '    float e = (u - 0.5) / max(hw, 1e-6);',
    '    vec3 lo = kind > 1.5 ? vec3(170.0, 214.0, 230.0) : vec3(120.0, 128.0, 146.0);',
    '    vec3 hi = kind > 1.5 ? vec3(34.0, 80.0, 112.0) : vec3(36.0, 40.0, 52.0);',
    '    vec3 mid = kind > 1.5 ? vec3(86.0, 150.0, 182.0) : vec3(74.0, 82.0, 100.0);',
    '    col = (e < -0.3 ? lo : (e > 0.4 ? hi : mid)) * vTone.rgb;',
    '  } else {',                                            // кристалл: три призмы с острыми верхами, светится сам
    '    float vv = z / vShape.z;',
    '    bool hit = false;',
    '    vec3 hc = vec3(0.0);',
    '    for (int q = 0; q < 3; q++) {',
    '      float cxp = q == 0 ? 0.3 : (q == 1 ? 0.52 : 0.72);',
    '      float wp = q == 0 ? 0.1 : (q == 1 ? 0.13 : 0.09);',
    '      float hp = q == 0 ? 0.62 : (q == 1 ? 1.0 : 0.74);',
    '      float du = u - cxp;',
    '      if (abs(du) < wp && vv >= 0.0 && vv < hp - abs(du) * 1.6) {',
    '        hit = true;',
    '        hc = du < -wp * 0.25 ? vec3(150.0, 245.0, 248.0) : (du > wp * 0.45 ? vec3(0.0, 110.0, 120.0) : vec3(0.0, 197.0, 205.0));',
    '      }',
    '    }',
    '    if (!hit) discard;',
    '    col = hc * vTone.r;',
    '  }',
    '  outColor = finish(col * vTone.a + FOG * (1.0 - vTone.a), xs, ys);',
    '}',
  ].join('\n');

  // Снег — точка в пиксель пещеры; глубину не пишет, проверяет.
  var VS_SNOW = GLSL_HEAD + [
    'layout(location = 0) in vec4 aFlake;',   // столбец, ряд, глубина, туман
    'uniform float uW, uH;',
    'flat out float vF;',
    'void main() {',
    '  gl_Position = vec4((aFlake.x + 0.5) / uW * 2.0 - 1.0, 1.0 - (aFlake.y + 0.5) / uH * 2.0, aFlake.z / DEPTH_K * 2.0 - 1.0, 1.0);',
    '  gl_PointSize = 1.0;',
    '  vF = aFlake.w;',
    '}',
  ].join('\n');

  var FS_SNOW = GLSL_HEAD + GLSL_FINISH + [
    'flat in float vF;',
    'out vec4 outColor;',
    'void main() {',
    '  float ys = (uH - gl_FragCoord.y) * uCW, xs = gl_FragCoord.x * uCW;',
    '  outColor = finish(vec3(150.0, 190.0, 210.0) * vF + FOG * (1.0 - vF), xs, ys);',
    '}',
  ].join('\n');

  // Атлас персонажей: арты рядом по горизонтали (c.ax — левый край), высота — наибольшая.
  var CHAR_PIX = (function () {
    var w = 0, h = 0;
    CHARS.forEach(function (c) { w = Math.max(w, c.ax + c.art.w); h = Math.max(h, c.art.h); });
    var data = new Uint8Array(w * h * 4);
    CHARS.forEach(function (c) {
      var px = artPixels(c.art);
      for (var y = 0; y < px.h; y++) data.set(px.data.subarray(y * px.w * 4, (y + 1) * px.w * 4), (y * w + c.ax) * 4);
    });
    return { w: w, h: h, data: data };
  })();

  var core = {
    MASK_LIMITS: { L_TEXT: L_TEXT, L_OUT: L_OUT },
    rng: rng, makeTextures: makeTextures, buildWorld: buildWorld, buildFlakes: buildFlakes, buildTube: buildTube,
    riftAtlas: riftAtlas, buildRifts: buildRifts, RIFT: RIFT, GLYPH_ROWS: GLYPH_ROWS,
    levelOf: levelOf, gatesFrom: gatesFrom, camTarget: camTarget, zoneFrom: zoneFrom, shiftZone: shiftZone, edgeAt: edgeAt,
    rampAt: rampAt, lightAt: lightAt, breathe: breathe, KNIGHT: KNIGHT, MAGE: MAGE, CHARS: CHARS, artPixels: artPixels, charAt: charAt,
    carveNiche: carveNiche, charReach: charReach, CHAR_PIX: CHAR_PIX,
    shaders: { VS_FULL: VS_FULL, FS_TUBE: FS_TUBE, VS_SPRITE: VS_SPRITE, FS_SPRITE: FS_SPRITE, VS_SNOW: VS_SNOW, FS_SNOW: FS_SNOW },
    consts: { ML: ML, Y0: Y0, Y1: Y1, T_BINS: T_BINS, T_R0: T_R0, TUBE: TUBE, MAXL: MAXL, PX: PX, N: N, EDGE_M: EDGE_M, EDGE_T: EDGE_T, EDGE_A: EDGE_A, EDGE_L: EDGE_L,
      MAXR: MAXR, MAXP: MAXP, RS_W: RS_W, RS_H: RS_H, RS_N: RS_N, KN_H: KN_H, KN_NICHE: KN_NICHE, KN_NICHE_R: KN_NICHE_R, KN_D: KN_D, KN_REF: KN_REF,
      KN_SPARK: KN_SPARK, KN_LIGHT: KN_LIGHT, KN_SLOPE: KN_SLOPE, KN_SHADOW: KN_SHADOW, KN_GAP: KN_GAP, KN_FLOOR: KN_FLOOR,
      KNIGHT_ANIM: KNIGHT_ANIM,
      MG_H: MG_H, MG_D: MG_D, MG_REF: MG_REF, MG_JOB: MG_JOB, MG_LIGHT: MG_LIGHT },
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = core;
  if (!root || !root.document) return;

  /* --- видеокарта ---------------------------------------------------------------- */

  var CTX = {
    alpha: true, premultipliedAlpha: true, antialias: false, depth: true, stencil: false,
    preserveDrawingBuffer: false, powerPreference: 'low-power',
    failIfMajorPerformanceCaveat: true,   // программный рендер — тот же процессор, что и прототип: не надо
  };

  function makeGL(gl) {
    function shader(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) {
        console.warn('[пещера] шейдер не собрался:', gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    }
    function program(vs, fs, names) {
      var a = shader(gl.VERTEX_SHADER, vs), b = shader(gl.FRAGMENT_SHADER, fs);
      if (!a || !b) return null;
      var p = gl.createProgram();
      gl.attachShader(p, a);
      gl.attachShader(p, b);
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) {
        console.warn('[пещера] программа не связалась:', gl.getProgramInfoLog(p));
        return null;
      }
      var u = {};
      names.forEach(function (n) { u[n] = gl.getUniformLocation(p, n); });
      return { p: p, u: u };
    }
    var COMMON = ['uCW', 'uH', 'uBodyL', 'uBodyR', 'uMeta', 'uNMeta', 'uDt', 'uAt', 'uIt', 'uTt', 'uBb', 'uOb', 'uAb', 'uDb', 'uWrL', 'uWrR', 'uSecT', 'uSecB', 'uF', 'uHz', 'uVw0', 'uGates', 'uNG', 'uW'];
    var tube = program(VS_FULL, FS_TUBE, COMMON.concat(['uRing', 'uTex', 'uLights', 'uNL', 'uCam', 'uRift', 'uRiftD', 'uNR',
      'uGlyph', 'uMouse', 'uScrollK', 'uTime', 'uKnF']));
    var sprite = program(VS_SPRITE, FS_SPRITE, COMMON.concat(['uGlyph', 'uKnight', 'uKTime']));
    var snow = program(VS_SNOW, FS_SNOW, COMMON);
    if (!tube || !sprite || !snow) return null;

    function texture(unit) {
      var t = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    }
    var R = {
      gl: gl, tube: tube, sprite: sprite, snow: snow, texKnight: texture(6),
      texRing: texture(0), texAlb: texture(1), texLights: texture(2),
      texRift: texture(3), texRiftD: texture(4), texGlyph: texture(5),
      vaoFull: gl.createVertexArray(), vaoSprite: gl.createVertexArray(), vaoSnow: gl.createVertexArray(),
      bufSprite: gl.createBuffer(), bufSnow: gl.createBuffer(),
    };
    gl.useProgram(tube.p);
    gl.uniform1i(tube.u.uRing, 0);
    gl.uniform1i(tube.u.uTex, 1);
    gl.uniform1i(tube.u.uLights, 2);
    gl.uniform1i(tube.u.uRift, 3);
    gl.uniform1i(tube.u.uRiftD, 4);
    gl.uniform1i(tube.u.uGlyph, 5);
    gl.useProgram(sprite.p);
    gl.uniform1i(sprite.u.uGlyph, 5);
    gl.uniform1i(sprite.u.uKnight, 6);

    gl.bindVertexArray(R.vaoSprite);
    gl.bindBuffer(gl.ARRAY_BUFFER, R.bufSprite);
    for (var i = 0; i < 3; i++) {
      gl.enableVertexAttribArray(i);
      gl.vertexAttribPointer(i, 4, gl.FLOAT, false, 48, i * 16);
      gl.vertexAttribDivisor(i, 1);
    }
    gl.bindVertexArray(R.vaoSnow);
    gl.bindBuffer(gl.ARRAY_BUFFER, R.bufSnow);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, 0);
    gl.bindVertexArray(null);
    return R;
  }

  function upload(gl, t, unit, w, h, data) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, w, h, 0, gl.RGBA, gl.FLOAT, data);
  }

  /* --- страница ------------------------------------------------------------------ */

  function start() {
    var doc = root.document, html = doc.documentElement;
    var field = doc.getElementById('field');
    if (!field || !root.WebGL2RenderingContext) return;   // нет WebGL2 — страница как была
    var canvas = doc.createElement('canvas');
    canvas.id = 'cave';
    canvas.setAttribute('aria-hidden', 'true');
    var gl = canvas.getContext('webgl2', CTX);
    if (!gl) return;                                      // нет видеокарты — тоже
    var R = makeGL(gl);
    if (!R) return;

    var WIDE = root.matchMedia('(min-width: 721px)');
    var LESS_MOTION = root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var TEX = makeTextures(), FLAKES = buildFlakes();
    var ATLAS = riftAtlas(), rifts = [], riftTex = new Float32Array(MAXR * 8), riftLight0 = 0;
    var glyphTex = new Uint8Array(GLYPH_KEYS.length * 5 * 7 * 4);
    GLYPH_KEYS.forEach(function (ch, gi) {
      GLYPH_ROWS[ch].forEach(function (row, gy) {
        for (var gx = 0; gx < 5; gx++) if (row[gx] === 'X') { var o = (gy * GLYPH_KEYS.length * 5 + gi * 5 + gx) * 4; glyphTex[o] = 255; glyphTex[o + 3] = 255; }
      });
    });
    var parts = [], prng = rng(911), lastT = 0, mouse = [-1e4, -1e4];
    function upload8(t, unit, w, h, data) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    }
    // Разломы мира и их огни (свет на камень вокруг) — в конец списка огней, мир не меняется.
    function placeRifts() {
      rifts = buildRifts(gates, RIFT);
      riftLight0 = world.lights.length;
      rifts.forEach(function (rf) {
        var p = rf.kind ? [rf.a, rf.y, 0.15] : [CX + 1.2 * Math.cos(rf.a), rf.y, EYE + 1.2 * Math.sin(rf.a)];
        world.lights.push({ x: p[0], y: p[1], z: p[2], base: RIFT.light, i: RIFT.light, inv: 1, phase: rf.phase });
      });
      riftTex.fill(0);
      rifts.forEach(function (rf, i) { riftTex.set([rf.kind, rf.a, rf.y, rf.s, rf.cos, rf.sin, rf.shape, RIFT.glow], i * 8); });
    }
    // Огни персонажей — последними в списке огней: у спины, на высоте груди — пятно света на стенке ниши за ним.
    function placeChars() {
      while (charLights.length && world.lights[world.lights.length - 1] === charLights[charLights.length - 1]) {
        world.lights.pop();
        charLights.pop();
      }
      charLights = L.chars.map(function (ch, i) {
        var o = { x: ch.x + ch.side * 0.05, y: ch.y + 0.08, z: 0.6, base: ch.c.light[0], i: ch.c.light[0],
          inv: 1 / (ch.c.light[1] * ch.c.light[1]), phase: 2.1 + i * 1.7 };
        world.lights.push(o);
        return o;
      });
      uploadLights(true);
    }
    // Свечение разлома дышит медленно, как кристаллы.
    function riftPulse(rf, time) { return 0.85 + 0.15 * Math.sin(time / 1100 + rf.phase); }
    // Точка разлома в мире: тексель (tx, ty) его формы — на стене или на полу, с нормалью внутрь хода.
    function riftAt3(rf, tx, ty) {
      var ax = (tx + 0.5 - RS_W / 2) / RS_W * rf.s * R_BOX_W, ay = (ty + 0.5 - RS_H / 2) / RS_H * rf.s * R_BOX_L;
      var lx = ay * rf.cos - ax * rf.sin, ly = ay * rf.sin + ax * rf.cos;
      if (rf.kind) return { x: rf.a + lx, y: rf.y + ly, z: 0.03, nx: 0, nz: 1 };
      var th = rf.a + lx / 1.45, R = 1.32;
      return { x: CX + R * Math.cos(th), y: rf.y + ly, z: EYE + R * Math.sin(th), nx: -Math.cos(th), nz: -Math.sin(th) };
    }
    /* Знаки кода: изредка вылетают из разломов перед камерой, летят в ход и гаснут. Небольшой эффект
       (владелец): RIFT.particles в секунду с разлома, живут 1–1,8 с, на экране не крупнее полутора
       размеров шрифта. При «уменьшить движение» их нет. */
    function stepParts(time, cy) {
      var dt = Math.min(0.1, (time - lastT) / 1000);
      lastT = time;
      if (LESS_MOTION || dt <= 0) return;
      rifts.forEach(function (rf) {
        if (rf.y < cy - 0.5 || rf.y > cy + 16) return;
        var want = RIFT.particles * dt * rf.s;
        while (want > 0 && parts.length < MAXP) {
          if (want < 1 && prng() > want) break;
          want -= 1;
          var core = ATLAS.cores[rf.shape], j = Math.floor(prng() * core.length / 2) * 2;
          var p = riftAt3(rf, core[j], core[j + 1]), sp = 0.3 + prng() * 0.35;
          parts.push({ x: p.x + p.nx * 0.06, y: p.y, z: p.z + p.nz * 0.06, vx: p.nx * sp + (prng() - 0.5) * 0.12, vy: (prng() - 0.5) * 0.25,
            vz: p.nz * sp + 0.1 + prng() * 0.12, age: 0, life: 1 + prng() * 0.8, g: Math.floor(prng() * GLYPH_KEYS.length), swap: prng() });
        }
      });
      for (var i = parts.length - 1; i >= 0; i--) {
        var q = parts[i];
        q.age += dt;
        if (q.age > q.life) { parts.splice(i, 1); continue; }
        q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
        q.vx *= 0.985; q.vz = q.vz * 0.985 - 0.05 * dt;
        q.swap -= dt;
        if (q.swap < 0) { q.g = Math.floor(prng() * GLYPH_KEYS.length); q.swap = 0.15 + prng() * 0.35; }
      }
    }
    // Курсор над пещерой зажигает знаки слоя кода в разломах — как поле страницы.
    root.addEventListener('mousemove', function (e) { mouse[0] = e.clientX; mouse[1] = e.clientY; if (shown) dirty = true; }, { passive: true });
    doc.addEventListener('mouseleave', function () { mouse[0] = mouse[1] = -1e4; dirty = true; });
    var albedo = new Float32Array(N * N * 6 * 4);
    TEX.forEach(function (t, layer) {
      for (var i = 0; i < N * N; i++) {
        var o = (layer * N * N + i) * 4;
        albedo[o] = t[i * 3]; albedo[o + 1] = t[i * 3 + 1]; albedo[o + 2] = t[i * 3 + 2]; albedo[o + 3] = 1;
      }
    });

    // Огни — текстура MAXL × 2: в первом ряду место и радиус (раз на мир), во втором сила (каждый кадр).
    var section = null, gates = null, world = null, lightTex = new Float32Array(MAXL * 8);
    /* Блок текста раздела: левый и правый край в окне; края пещеры (zoneFrom) — от верха раздела, px; рыцарь —
       и маг — в мире (charAt); колонка строк и текст колонки дат каждого места работы (рамки от верха раздела) — для
       защиты строк за рыцарем. */
    var L = { wrL: 0, wrR: 0, z: null, chars: [], bodyL: 0, bodyR: 0, metas: [] }, metaBuf = new Float32Array(32), charLights = [];
    var shadowBuf = new Float32Array(6);
    var inst = new Float32Array(0), flakesBuf = new Float32Array(FLAKES.length * 4), tmp = [0, 0, 0];
    var W = 0, H = 0, shown = false, state = 'off', lost = false;
    var frames = 0, mainMs = 0, lastCam = 0, lastMs = 0;

    function uploadAll() {
      upload(gl, R.texAlb, 1, N, N * 6, albedo);
      if (gates) {
        uploadTube();
        uploadLights(true);
      }
    }
    // Кольца хода — с нишами персонажей; ключ — ворота и кольца ниш: заново, только когда сдвинулось одно из них.
    var tubeKey = '';
    function tubeKeyNow() { return gates.join() + '/' + L.chars.map(function (ch) { return ch.side + ':' + Math.floor(ch.y); }).join(','); }
    function uploadTube() {
      var td = buildTube(gates);
      L.chars.forEach(function (ch) { carveNiche(td, ch); });
      upload(gl, R.texRing, 0, T_BINS, ML, td);
      tubeKey = tubeKeyNow();
    }
    function uploadLights(pos) {
      var ls = world.lights, n = Math.min(ls.length, MAXL);
      if (pos) {
        lightTex.fill(0);
        for (var i = 0; i < n; i++) {
          lightTex[i * 4] = ls[i].x; lightTex[i * 4 + 1] = ls[i].y; lightTex[i * 4 + 2] = ls[i].z; lightTex[i * 4 + 3] = ls[i].inv;
        }
      }
      for (var j = 0; j < n; j++) lightTex[(MAXL + j) * 4] = ls[j].i;
      upload(gl, R.texLights, 2, MAXL, 2, lightTex);
    }

    // Положение в документе без transform: карточки въезжают в кадр (.enter), и мир не должен
    // зависеть от того, успели они въехать или нет.
    function pageTop(el) { var y = 0; for (var e = el; e; e = e.offsetParent) y += e.offsetTop; return y; }

    function layout() {
      section = doc.getElementById('experience');
      var block = section && section.querySelector('.wrap');
      if (!block) { section = null; return; }
      var vh = root.innerHeight, sTop = pageTop(section), sH = section.offsetHeight, br = block.getBoundingClientRect();
      var jobs = section.querySelectorAll('.job'), tops = [];
      for (var k = 1; k < Math.min(jobs.length, 3); k++) tops.push(pageTop(jobs[k]));
      L.wrL = br.left; L.wrR = br.right;
      /* Во всю силу — от чуть выше заголовка раздела (шкала опыта внутри) до низа последнего места
         работы. Вход — от низа текста «Подхода» (его .wrap), выход — до чуть выше заголовка «Проектов»:
         пещера не заходит на текст соседей. Соседа нет — промежуток как у раздела: отступ раздела
         до заголовка и после последнего места работы, вдвое. */
      var head = section.querySelector('.section__head'), lastJob = jobs.length ? jobs[jobs.length - 1] : null;
      var prev = section.previousElementSibling, next = section.nextElementSibling;
      var prevWrap = prev && prev.querySelector ? prev.querySelector('.wrap') : null;
      var nextHead = next && next.querySelector ? next.querySelector('.section__head') : null;
      var headY = head ? pageTop(head) : sTop, lastY = lastJob ? pageTop(lastJob) + lastJob.offsetHeight : sTop + sH;
      var inY = prevWrap ? pageTop(prevWrap) + prevWrap.offsetHeight : 2 * sTop - headY;
      var outY = nextHead ? pageTop(nextHead) : 2 * (sTop + sH) - lastY;
      inY = Math.min(inY, headY); outY = Math.max(outY, lastY);
      L.z = shiftZone(zoneFrom(inY, headY, lastY, outY), -sTop);
      // рыцарь — в мире у левой стены; строки и текст колонки дат — чтобы защитить их за ним
      L.metas = []; L.bodyL = L.wrL; L.bodyR = L.wrR;
      for (var q = 0; q < jobs.length && L.metas.length < 8; q++) {
        var mq = jobs[q].querySelector ? jobs[q].querySelector('.job__meta') : null;
        if (!mq) continue;
        var bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
        for (var c = 0; c < mq.children.length; c++) {
          var ch = mq.children[c], cr = ch.getBoundingClientRect(), ct = pageTop(ch);
          bx0 = Math.min(bx0, cr.left); bx1 = Math.max(bx1, cr.right); by0 = Math.min(by0, ct); by1 = Math.max(by1, ct + ch.offsetHeight);
        }
        if (bx1 > bx0) L.metas.push([bx0, by0 - sTop, bx1, by1 - sTop]);
        if (!q && mq.nextElementSibling) L.bodyL = mq.nextElementSibling.getBoundingClientRect().left;
      }
      // правый край самих строк мест работы: у строк своя ширина, они кончаются раньше блока текста
      if (doc.createRange && doc.createTreeWalker) {
        var right = 0, rng = doc.createRange();
        for (var q2 = 0; q2 < jobs.length; q2++) {
          var mq2 = jobs[q2].querySelector ? jobs[q2].querySelector('.job__meta') : null, body = mq2 && mq2.nextElementSibling;
          if (!body) continue;
          for (var tw = doc.createTreeWalker(body, 4), tn = tw.nextNode(); tn; tn = tw.nextNode()) {
            if (!tn.nodeValue.trim()) continue;
            rng.selectNodeContents(tn);
            var rs2 = rng.getClientRects();
            for (var ri = 0; ri < rs2.length; ri++) right = Math.max(right, rs2[ri].right);
          }
        }
        if (right > L.bodyL) L.bodyR = Math.min(L.wrR, right);
      }
      L.chars = [];
      CHARS.forEach(function (c) {
        var job = jobs[Math.min(c.job, jobs.length - 1)];
        if (job) L.chars.push(charAt(c, pageTop(job), sTop + L.z.darkTop, sTop + L.z.darkBot, vh));
      });
      // путь камеры — по всей пещере, со входом и выходом
      var g = gatesFrom(sTop + L.z.darkTop, L.z.darkBot - L.z.darkTop, vh, tops);
      if (!gates || g.join() !== gates.join()) {   // мир — только когда сдвинулись ворота
        gates = g;
        world = buildWorld(gates);
        placeRifts();
        charLights = [];
        if (world.lights.length > MAXL) console.warn('[пещера] огней больше, чем', MAXL);
        inst = new Float32Array((world.sprites.length + MAXP + CHARS.length) * 12);   // + персонажи
        breathe(world.lights, 0);
        uploadLights(true);
      }
      // место персонажей по ходу зависит от раскладки, а не только от ворот: ниши и огни — по нему
      if (tubeKey !== tubeKeyNow()) uploadTube();
      placeChars();
    }

    function charView(ch) {
      var d = ch.y - lastCam, f = root.innerWidth / 2, hz = root.innerHeight / 2, k = { x: ch.x, y: ch.y, w: ch.w, h: ch.h, d: d, side: ch.side };
      if (d > NEAR) {
        k.left = f + (ch.x - ch.w / 2 - CX) / d * f; k.right = f + (ch.x + ch.w / 2 - CX) / d * f;
        k.top = hz - (ch.h - EYE) / d * f; k.bottom = hz + EYE / d * f;
      }
      return k;
    }

    function show(on) {
      if (on === shown) return;
      shown = on;
      canvas.style.opacity = on ? '1' : '0';
    }

    /* Кадр: часы (мс) и камера (клетка хода). Всё о странице — числами здесь же; дальше только
       видеокарта. Из прототипа почти дословно: спрайты и снег раскладываются на JS (их сотня),
       точки считает шейдер. */
    function draw(time, cy) {
      if (!section || lost) return;
      var t0 = root.performance.now();
      var vw = root.innerWidth, vh = root.innerHeight, sr = section.getBoundingClientRect();
      var Z = shiftZone(L.z, sr.top);
      if (Z.darkBot <= 0 || Z.darkTop >= vh) { show(false); return; }
      var w = Math.ceil(vw / PX), h = Math.ceil(vh / PX);
      if (w !== W || h !== H) {
        W = w; H = h;
        canvas.width = W; canvas.height = H;
        canvas.style.width = W * PX + 'px';
        canvas.style.height = H * PX + 'px';
      }
      var f = vw / 2, hz = vh / 2, vw0 = vw / 2, rowLo = Math.max(0, Math.floor(Z.darkTop / PX)), rowHi = Math.min(H - 1, Math.ceil(Z.darkBot / PX));
      // персонажи: дышат светом, при KNIGHT_ANIM 2 — парят на точку арта; тени под ними; рамки текста дат — в окно
      var knBright = LESS_MOTION ? 1 : 0.93 + 0.07 * Math.sin(time / 900 + 1.3);
      var knBob = KNIGHT_ANIM === 2 && !LESS_MOTION ? Math.floor(Math.sin(time * 0.0021) + 0.5) : 0;   // в точках арта
      shadowBuf.fill(0);
      L.chars.forEach(function (ch, i) { if (i < 2) shadowBuf.set([ch.x, ch.y, KN_SHADOW], i * 3); });
      metaBuf.fill(0);
      L.metas.forEach(function (b, i) { metaBuf.set([b[0], b[1] + sr.top, b[2], b[3] + sr.top], i * 4); });
      // камней в окне нет — одна темнота цвета фона: огни, знаки, спрайты и снег не считаем
      var stones = Z.outBot > 0 && Z.inTop < vh, n = 0, m = 0;
      if (stones) {
        breathe(world.lights, time);
        rifts.forEach(function (rf, i) {
          var k = riftPulse(rf, time);
          riftTex[i * 8 + 7] = RIFT.glow * k;
          var lt = world.lights[riftLight0 + i];
          if (lt) lt.i = RIFT.light * k;
        });
        upload(gl, R.texRiftD, 4, MAXR * 2, 1, riftTex);
        uploadLights(false);
        stepParts(time, cy);

        // спрайты: дальние первыми (при равной глубине прав первый — как в прототипе)
        var list = [];
        for (var i = 0; i < world.sprites.length; i++) {
          var s = world.sprites[i], d = s.y - cy;
          if (d > NEAR + 0.15 && d < SPRITE_FAR) list.push({ s: s, d: d });
        }
        parts.forEach(function (q) {
          var d = q.y - cy;
          if (!(d > NEAR + 0.15 && d < SPRITE_FAR)) return;
          var gh = Math.max(7 * PX, Math.min(10 * PX, 0.16 * f / d)) * d / f;   // от одного до полутора размеров шрифта
          list.push({ s: { kind: 4, x: q.x, y: q.y, zc: q.z, h: gh, w: gh * 5 / 7, q: q }, d: d });
        });
        L.chars.forEach(function (ch) {   // персонажи — в мире, как остальные
          var dk = ch.y - cy;
          if (dk > NEAR + 0.15 && dk < SPRITE_FAR) list.push({ s: { kind: 5 + CHARS.indexOf(ch.c), x: ch.x, y: ch.y, w: ch.w, h: ch.h, art: ch.c.art }, d: dk });
        });
        list.sort(function (a, b) { return b.d - a.d; });
        for (var j = 0; j < list.length; j++) {
          var sp = list[j].s, d2 = list[j].d;
          // у персонажа — поля для искр вокруг арта (KN_SPARK точек) и качание
          var mk = sp.kind >= 5 ? sp.h * KN_SPARK / sp.art.h : 0, bob = sp.kind >= 5 ? knBob * sp.h / sp.art.h : 0;
          var wq = sp.kind >= 5 ? sp.w * (sp.art.w + 2 * KN_SPARK) / sp.art.w : sp.w;
          var zTop = sp.kind === 0 ? sp.top : sp.kind === 4 ? sp.zc + sp.h / 2 : sp.h + mk + bob;
          var zBot = sp.kind === 0 ? sp.top - sp.len : sp.kind === 4 ? sp.zc - sp.h / 2 : bob - mk;
          var xL = vw0 + ((sp.x - wq / 2 - CX) / d2) * f, xR = vw0 + ((sp.x + wq / 2 - CX) / d2) * f;
          var yT = hz - ((zTop - EYE) / d2) * f, yB = hz - ((zBot - EYE) / d2) * f;
          var c0 = Math.max(0, Math.floor(xL / PX)), c1 = Math.min(W - 1, Math.ceil(xR / PX));
          var r0 = Math.max(rowLo, Math.floor(yT / PX)), r1 = Math.min(rowHi, Math.ceil(yB / PX));
          if (c0 > c1 || r0 > r1) continue;
          var o = n * 12;
          inst[o] = xL; inst[o + 1] = xR; inst[o + 2] = yT; inst[o + 3] = yB;
          inst[o + 4] = d2; inst[o + 5] = sp.kind;
          inst[o + 6] = sp.kind === 0 ? sp.top : sp.kind >= 4 ? zTop : sp.h;
          inst[o + 7] = sp.kind === 0 ? sp.len : sp.kind === 4 ? sp.h : sp.kind >= 5 ? zTop - zBot : 0;
          if (sp.kind === 4) {   // знак кода: яркость (тает к концу жизни), номер знака, белизна вспышки
            var qa = sp.q.age / sp.q.life;
            inst[o + 8] = Math.min(1, sp.q.age / 0.12) * (qa > 0.45 ? 1 - (qa - 0.45) / 0.55 : 1);
            inst[o + 9] = sp.q.g; inst[o + 10] = qa < 0.2 ? 1 - qa / 0.2 : 0;
          } else if (sp.kind >= 5) {   // персонаж светится сам: дыхание света
            inst[o + 8] = knBright; inst[o + 9] = 0; inst[o + 10] = 0;
          } else if (sp.kind === 3) {
            var pulse = sp.light.i / sp.light.base;
            inst[o + 8] = pulse; inst[o + 9] = pulse; inst[o + 10] = pulse;
          } else {
            lightAt(world.lights, gates, sp.x, sp.y, (zTop + zBot) / 2, d2, tmp);
            inst[o + 8] = (tmp[0] + 0.04) * EXPO; inst[o + 9] = (tmp[1] + 0.06) * EXPO; inst[o + 10] = (tmp[2] + 0.09) * EXPO;
          }
          inst[o + 11] = Math.exp(-FOG_K * d2);
          n += 1;
        }

        // снег — в ярусах со льдом
        for (var k = 0; k < FLAKES.length; k++) {
          var fk = FLAKES[k], rel = ((fk.y * 12 - cy) % 12 + 12) % 12, fyw = cy + 0.6 + rel;
          if (levelOf(gates, fyw) === 3) continue;
          var fz = HW - (((time * 0.00011 * fk.sp) + fk.ph) % 1) * HW, fx = fk.x + Math.sin(time * 0.0007 + fk.ph) * 0.15;
          fx = CX + (fx - 4.5) * 0.33;   // ход узкий: снег — над полом вокруг оси
          var dd = fyw - cy, colS = Math.floor((vw0 + ((fx - CX) / dd) * f) / PX), rowS = Math.floor((hz - ((fz - EYE) / dd) * f) / PX);
          if (colS < 0 || colS >= W || rowS < rowLo || rowS > rowHi) continue;
          flakesBuf[m * 4] = colS; flakesBuf[m * 4 + 1] = rowS; flakesBuf[m * 4 + 2] = dd; flakesBuf[m * 4 + 3] = Math.exp(-FOG_K * dd);
          m += 1;
        }
      }

      gl.viewport(0, 0, W, H);
      gl.disable(gl.BLEND);
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
      gl.clearColor(0, 0, 0, 0);
      gl.clearDepth(1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      function common(p) {
        gl.useProgram(p.p);
        gl.uniform1f(p.u.uCW, PX); gl.uniform1f(p.u.uH, H); gl.uniform1f(p.u.uW, W);
        gl.uniform1f(p.u.uBodyL, L.bodyL); gl.uniform1f(p.u.uBodyR, L.bodyR);
        gl.uniform4fv(p.u.uMeta, metaBuf); gl.uniform1i(p.u.uNMeta, L.metas.length);
        gl.uniform1f(p.u.uDt, Z.darkTop); gl.uniform1f(p.u.uAt, Z.alphaTop); gl.uniform1f(p.u.uIt, Z.inTop); gl.uniform1f(p.u.uTt, Z.fullTop);
        gl.uniform1f(p.u.uBb, Z.fullBot); gl.uniform1f(p.u.uOb, Z.outBot); gl.uniform1f(p.u.uAb, Z.alphaBot); gl.uniform1f(p.u.uDb, Z.darkBot);
        gl.uniform1f(p.u.uSecT, sr.top); gl.uniform1f(p.u.uSecB, sr.bottom);
        gl.uniform1f(p.u.uWrL, L.wrL); gl.uniform1f(p.u.uWrR, L.wrR);
        gl.uniform1f(p.u.uF, f); gl.uniform1f(p.u.uHz, hz); gl.uniform1f(p.u.uVw0, vw0);
        gl.uniform2f(p.u.uGates, gates[0] || 0, gates[1] || 0); gl.uniform1i(p.u.uNG, gates.length);
      }
      common(R.tube);
      gl.uniform1i(R.tube.u.uNL, Math.min(world.lights.length, MAXL));
      gl.uniform1f(R.tube.u.uCam, cy);
      gl.uniform1i(R.tube.u.uNR, rifts.length);
      gl.uniform2f(R.tube.u.uMouse, mouse[0], mouse[1]);
      gl.uniform1f(R.tube.u.uScrollK, LESS_MOTION ? 0 : root.scrollY * 0.25);   // как поле страницы (app.js, PARALLAX)
      gl.uniform1f(R.tube.u.uTime, LESS_MOTION ? 0 : time);
      gl.uniform3fv(R.tube.u.uKnF, shadowBuf);
      gl.depthFunc(gl.ALWAYS);
      gl.bindVertexArray(R.vaoFull);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (n) {
        common(R.sprite);
        gl.uniform1f(R.sprite.u.uKTime, LESS_MOTION ? 0 : time);
        gl.depthFunc(gl.LESS);
        gl.bindVertexArray(R.vaoSprite);
        gl.bindBuffer(gl.ARRAY_BUFFER, R.bufSprite);
        gl.bufferData(gl.ARRAY_BUFFER, inst.subarray(0, n * 12), gl.DYNAMIC_DRAW);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
      }
      if (m) {
        common(R.snow);
        gl.depthFunc(gl.LESS);
        gl.depthMask(false);
        gl.bindVertexArray(R.vaoSnow);
        gl.bindBuffer(gl.ARRAY_BUFFER, R.bufSnow);
        gl.bufferData(gl.ARRAY_BUFFER, flakesBuf.subarray(0, m * 4), gl.DYNAMIC_DRAW);
        gl.drawArrays(gl.POINTS, 0, m);
      }
      gl.bindVertexArray(null);
      show(true);
      lastCam = cy;
      frames += 1;
      lastMs = root.performance.now() - t0;
      mainMs += lastMs;
    }

    /* Офис стоит по нижнему краю окна и гаснет, пока низ окна — в пещере: вместе они не сходятся.
       Мера — видимость пещеры в ряду середины офиса (OFFICE_Y px от низа окна): гаснет выше 0,3,
       возвращается ниже 0,12 — с запасом, чтобы на границе не мигало. Гаснут слева направо, по
       очереди; при «уменьшить движение» — сразу. До 2026-10-02 мерой был сам раздел: офис гас, когда
       пещеры у низа окна ещё не было, и возвращался, когда раздел почти ушёл из окна (владелец:
       «пропадают и появляются поздно, нужно чтобы когда низ сайта был вне пещеры они появлялись»). */
    var officeAway = false, OFFICE_STAGGER = 55, OFFICE_Y = 50;
    function officeTick() {
      if (!section) return;
      var vh = root.innerHeight, r = section.getBoundingClientRect();
      var v = rampAt(vh - OFFICE_Y, shiftZone(L.z, r.top));
      if (!officeAway && v > 0.3) {
        Array.prototype.slice.call(doc.querySelectorAll('canvas.pet, canvas.thing'))
          .map(function (el) { return { el: el, r: el.getBoundingClientRect() }; })
          .sort(function (a, b) { return a.r.left - b.r.left; })
          .forEach(function (b, i) { b.el.style.setProperty('--cave-delay', (LESS_MOTION ? 0 : i * OFFICE_STAGGER) + 'ms'); });
        officeAway = true;
        html.classList.add('cave-away');
      } else if (officeAway && v < 0.12) {
        officeAway = false;
        html.classList.remove('cave-away');
      }
    }

    /* Камера: плавно догоняет прокрутку (владелец о прыжках за колесом: «меня уже тошнит от этой
       скорости»); скачок больше CAM_SNAP клеток — сразу на место. Пока догоняет — кадр на каждый тик
       экрана, потом ~12 кадров в секунду. При «уменьшить движение» камера стоит перед первыми
       воротами, время стоит, а кадр перерисовывается только когда сдвинулся сам раздел. */
    var raf = 0, cam = null, prev = 0, last = 0, dirty = true, t0 = 0, relayout = false;
    function staticCam() { return gates && gates.length ? Math.max(Y0, gates[0] - 6) : (Y0 + Y1) / 2; }
    function loop(now) {
      raf = 0;
      if (state === 'off' || lost) return;
      if (section && !section.isConnected) relayout = true;   // страницу пересобрали (язык на file://)
      if (relayout) { relayout = false; layout(); dirty = true; }
      if (!section) { show(false); raf = root.requestAnimationFrame(loop); return; }
      officeTick();
      if (LESS_MOTION) {
        if (dirty) { draw(0, staticCam()); dirty = false; }
      } else {
        var sr = section.getBoundingClientRect(), dt = Math.min(64, now - prev);
        var target = camTarget(root.innerHeight, sr.top + L.z.darkTop, L.z.darkBot - L.z.darkTop);
        prev = now;
        if (cam === null || Math.abs(target - cam) > CAM_SNAP) cam = target;
        var moving = Math.abs(target - cam) > 0.002;
        if (moving) cam += (target - cam) * (1 - Math.exp(-dt / CAM_TAU));
        if (moving || dirty || now - last > IDLE_MS) { draw(now - t0, cam); last = now; dirty = false; }
      }
      raf = root.requestAnimationFrame(loop);
    }

    function enable() {
      if (state !== 'off') return;
      state = LESS_MOTION ? 'static' : 'on';
      html.classList.add('cave');
      layout();
      officeTick();
      // плавность ухода офиса — кадром позже: загрузка посреди раздела гасит его сразу
      root.requestAnimationFrame(function () { if (state !== 'off') html.classList.add('cave-office'); });
      cam = null; prev = root.performance.now(); dirty = true;
      if (!raf) raf = root.requestAnimationFrame(loop);
    }
    function disable() {
      state = 'off';
      if (raf) { root.cancelAnimationFrame(raf); raf = 0; }
      show(false);
      officeAway = false;
      html.classList.remove('cave', 'cave-away', 'cave-office');
    }

    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); lost = true; show(false); });
    canvas.addEventListener('webglcontextrestored', function () {
      var again = makeGL(gl);
      if (!again) { disable(); return; }
      R = again; lost = false; W = 0; H = 0;
      uploadAll();
      upload8(R.texRift, 3, RS_W * RS_N, RS_H, ATLAS.data);
      upload8(R.texGlyph, 5, GLYPH_KEYS.length * 5, 7, glyphTex);
      upload8(R.texKnight, 6, CHAR_PIX.w, CHAR_PIX.h, CHAR_PIX.data);
      dirty = true;
      if (state !== 'off' && !raf) raf = root.requestAnimationFrame(loop);
    });

    upload(gl, R.texAlb, 1, N, N * 6, albedo);
    upload8(R.texRift, 3, RS_W * RS_N, RS_H, ATLAS.data);
    upload8(R.texGlyph, 5, GLYPH_KEYS.length * 5, 7, glyphTex);
    upload8(R.texKnight, 6, CHAR_PIX.w, CHAR_PIX.h, CHAR_PIX.data);
    field.parentNode.insertBefore(canvas, field.nextSibling);   // над полем знаков, под #app
    t0 = root.performance.now();

    function onWide() { if (WIDE.matches) enable(); else disable(); }
    if (WIDE.addEventListener) WIDE.addEventListener('change', onWide); else if (WIDE.addListener) WIDE.addListener(onWide);
    root.addEventListener('scroll', function () { dirty = true; }, { passive: true });
    root.addEventListener('resize', function () { relayout = true; });
    // Раздел меняет высоту (догрузился шрифт, пересобрали страницу на другом языке) — раскладка заново.
    if (root.ResizeObserver) new root.ResizeObserver(function () { relayout = true; }).observe(doc.getElementById('app') || doc.body);
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { relayout = true; });
    onWide();

    // Для живых проверок: состояние, кадр по заказу, камера, ворота, видимость по рядам.
    root.__cave = {
      state: function () { return lost ? 'lost' : state; },
      frames: function () { return frames; },
      work: function () { return { n: frames, ms: mainMs }; },
      ms: function () { return lastMs; },
      cam: function () { return lastCam; },
      gates: function () { return gates ? gates.slice() : []; },
      away: function () { return officeAway; },
      stats: function () { return world ? { lights: world.lights.length, sprites: world.sprites.length, rifts: rifts.length, parts: parts.length } : null; },
      rifts: function () { return rifts.map(function (rf) { return { kind: rf.kind, a: rf.a, y: rf.y, s: rf.s }; }); },
      render: function (time, cy) { draw(time, cy); return lastMs; },
      ramp: function () {
        if (!section) return [];
        var Z = shiftZone(L.z, section.getBoundingClientRect().top), out = [];
        for (var r = 0; r < H; r++) out.push(rampAt((r + 0.5) * PX, Z));
        return out;
      },
      // непрозрачность (темнота) и свет (камни) по рядам холста
      edges: function () {
        if (!section) return [];
        var Z = shiftZone(L.z, section.getBoundingClientRect().top), out = [];
        for (var r = 0; r < H; r++) out.push(edgeAt((r + 0.5) * PX, Z));
        return out;
      },
      // персонажи: место в мире и рамка на экране при последней камере (без полей для искр); рыцарь — первый
      chars: function () { return L.chars.map(charView); },
      knight: function () { return L.chars.length ? charView(L.chars[0]) : null; },
      // края пещеры в окне (zoneFrom): темнота, камни, полоса «во всю силу»
      zone: function () { return section ? shiftZone(L.z, section.getBoundingClientRect().top) : null; },
    };
  }

  // Пещера стартует, когда страница свободна: первому экрану она не нужна, а мир и текстуры —
  // десятки миллисекунд счёта.
  function later() {
    if (root.requestIdleCallback) root.requestIdleCallback(start, { timeout: 1500 });
    else root.setTimeout(start, 200);
  }
  if (root.document.readyState === 'complete') later();
  else root.addEventListener('load', later);
})(typeof window !== 'undefined' ? window : null);
