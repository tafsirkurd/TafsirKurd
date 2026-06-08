/* Gencine (Religious Treasure) Tab — GencineUI v20260572 */
(function(){
'use strict';

function _sections(){
  var T = function(k,d){ var v=window.t?window.t(k):undefined; return (!v||v===k)?(d||k):v; };
  var all = [
    { name:'hadith', label:T('gencine.hadith','حەدیس'),     sub:T('gencine.hadith_sub','فەرمودێن پێغەمبەرێ ئیسلامێ'),           icon:'fas fa-scroll'             },
    { name:'adhkar', label:T('gencine.adhkar','زکیر'),        sub:T('gencine.adhkar_sub','زکرێن بەیانی، ئێوار و زیاتر'),         icon:'fas fa-heart'               },
    { name:'dua',    label:T('gencine.dua','دوعا'),          sub:T('gencine.dua_sub','دعاهای قورئانی'),                         icon:'fa-solid fa-person-praying' },
    { name:'tasbih', label:T('gencine.tasbih','تەسبیح'),    sub:T('gencine.tasbih_sub','ژمارتنا دیکرێن ئیسلامی'),              icon:'fas fa-rotate'             },
    { name:'asma',   label:T('gencine.asma','ناوێن خوا'),   sub:T('gencine.asma_sub','٩٩ ناوێن گەورەیێ خوایێ بەزەیی کار'),   icon:'fas fa-star-and-crescent' },
    { name:'books',  label:T('gencine.books','پەرتوک'),        sub:T('gencine.books_sub','پەرتوکێن ئیسلامی'),                       icon:'fas fa-book-open' }
  ];
  if (!_dbSections || !_dbSections.length) return all;
  var now = new Date();
  var activeMap = {}, orderMap = {}, badgeMap = {}, newCountMap = {};
  _dbSections.forEach(function(s){
    activeMap[s.key] = s.active;
    if (s.sort_order != null) orderMap[s.key] = s.sort_order;
    if (s.badge_until && new Date(s.badge_until) > now) badgeMap[s.key] = true;
  });
  function _countNew(arr){ return arr ? arr.filter(function(x){ return x.badge_until && new Date(x.badge_until) > now; }).length : 0; }
  newCountMap['hadith'] = _countNew(_dbHadiths);
  newCountMap['dua']    = _countNew(_dbDuas);
  newCountMap['adhkar'] = _countNew(_dbAdhkar);
  newCountMap['books']  = _countNew(_dbBooks);
  return all
    .filter(function(sec){ return activeMap[sec.name] !== false; })
    .sort(function(a, b){
      var oa = orderMap[a.name] != null ? orderMap[a.name] : 999;
      var ob = orderMap[b.name] != null ? orderMap[b.name] : 999;
      return oa - ob;
    })
    .map(function(sec){
      var s2 = badgeMap[sec.name] ? Object.assign({}, sec, { badge: true }) : sec;
      var nc = newCountMap[sec.name] || 0;
      return nc ? Object.assign({}, s2, { newCount: nc }) : s2;
    });
}

/* ── 99 Names of Allah ── */
var ASMA_DATA = [
  {n:1,  ar:'الرَّحْمَنُ',            tr:'Ar-Rahmaan',          ku:'ئەو زۆر بەزەیی کار'},
  {n:2,  ar:'الرَّحِيمُ',             tr:'Ar-Raheem',            ku:'ئەو هەمیشە بەزەیی کار'},
  {n:3,  ar:'الْمَلِكُ',              tr:'Al-Malik',             ku:'پاشا'},
  {n:4,  ar:'الْقُدُّوسُ',            tr:'Al-Quddoos',           ku:'پیرۆز'},
  {n:5,  ar:'السَّلَامُ',             tr:'As-Salaam',            ku:'ئاشتی بەخش'},
  {n:6,  ar:'الْمُؤْمِنُ',            tr:"Al-Mu'min",            ku:'باوەڕداری دەر'},
  {n:7,  ar:'الْمُهَيْمِنُ',          tr:'Al-Muhaimin',          ku:'پاراستووار'},
  {n:8,  ar:'الْعَزِيزُ',             tr:'Al-Azeez',             ku:'بەهێز'},
  {n:9,  ar:'الْجَبَّارُ',            tr:'Al-Jabbaar',           ku:'سەروەر'},
  {n:10, ar:'الْمُتَكَبِّرُ',         tr:'Al-Mutakabbir',        ku:'گەورەیی خاوەن'},
  {n:11, ar:'الْخَالِقُ',             tr:'Al-Khaaliq',           ku:'دروستکار'},
  {n:12, ar:'الْبَارِئُ',             tr:"Al-Baari'",            ku:'بوونی دەر هێنەر'},
  {n:13, ar:'الْمُصَوِّرُ',           tr:'Al-Musawwir',          ku:'شێوەدەر'},
  {n:14, ar:'الْغَفَّارُ',            tr:'Al-Ghaffaar',          ku:'زۆر بەخشینکار'},
  {n:15, ar:'الْقَهَّارُ',            tr:'Al-Qahhaar',           ku:'زەبردەست'},
  {n:16, ar:'الْوَهَّابُ',            tr:'Al-Wahhaab',           ku:'بەخشینکارێ گەورە'},
  {n:17, ar:'الرَّزَّاقُ',            tr:'Ar-Razzaaq',           ku:'رزگاری دەر'},
  {n:18, ar:'الْفَتَّاحُ',            tr:'Al-Fattaah',           ku:'کردنەوەر'},
  {n:19, ar:'الْعَلِيمُ',             tr:"Al-'Aleem",            ku:'زاناس'},
  {n:20, ar:'الْقَابِضُ',             tr:'Al-Qaabid',            ku:'گرتنکار'},
  {n:21, ar:'الْبَاسِطُ',             tr:'Al-Baasit',            ku:'فراخکار'},
  {n:22, ar:'الْخَافِضُ',             tr:'Al-Khaafid',           ku:'دەخوازینەر'},
  {n:23, ar:'الرَّافِعُ',             tr:"Ar-Raafi'",            ku:'برزکار'},
  {n:24, ar:'الْمُعِزُّ',             tr:"Al-Mu'izz",            ku:'بریزدارکار'},
  {n:25, ar:'الْمُذِلُّ',             tr:'Al-Mudhill',           ku:'بێبریزی دەر'},
  {n:26, ar:'السَّمِيعُ',             tr:"As-Samee'",            ku:'بیستکار'},
  {n:27, ar:'الْبَصِيرُ',             tr:'Al-Baseer',            ku:'بینەر'},
  {n:28, ar:'الْحَكَمُ',              tr:'Al-Hakam',             ku:'دادوەر'},
  {n:29, ar:'الْعَدْلُ',              tr:"Al-'Adl",              ku:'دادپەروەر'},
  {n:30, ar:'اللَّطِيفُ',             tr:'Al-Lateef',            ku:'نەرمدڵ'},
  {n:31, ar:'الْخَبِيرُ',             tr:'Al-Khabeer',           ku:'ئاگادار'},
  {n:32, ar:'الْحَلِيمُ',             tr:'Al-Haleem',            ku:'بردبار'},
  {n:33, ar:'الْعَظِيمُ',             tr:"Al-'Azeem",            ku:'گەورە'},
  {n:34, ar:'الْغَفُورُ',             tr:'Al-Ghafoor',           ku:'بەخشینکار'},
  {n:35, ar:'الشَّكُورُ',             tr:'Ash-Shakoor',          ku:'سوپاسگوزار'},
  {n:36, ar:'الْعَلِيُّ',             tr:"Al-'Aliyy",            ku:'برز'},
  {n:37, ar:'الْكَبِيرُ',             tr:'Al-Kabeer',            ku:'گەورە'},
  {n:38, ar:'الْحَفِيظُ',             tr:'Al-Hafeez',            ku:'پاراستووار'},
  {n:39, ar:'الْمُقِيتُ',             tr:'Al-Muqeet',            ku:'خواردن دەر'},
  {n:40, ar:'الْحَسِيبُ',             tr:'Al-Haseeb',            ku:'ژمارەکار'},
  {n:41, ar:'الْجَلِيلُ',             tr:'Al-Jaleel',            ku:'شکوهمەند'},
  {n:42, ar:'الْكَرِيمُ',             tr:'Al-Kareem',            ku:'کەریم'},
  {n:43, ar:'الرَّقِيبُ',             tr:'Ar-Raqeeb',            ku:'چاودێر'},
  {n:44, ar:'الْمُجِيبُ',             tr:'Al-Mujeeb',            ku:'وەڵامدەر'},
  {n:45, ar:'الْوَاسِعُ',             tr:"Al-Waasi'",            ku:'فراخ'},
  {n:46, ar:'الْحَكِيمُ',             tr:'Al-Hakeem',            ku:'شارەزا'},
  {n:47, ar:'الْوَدُودُ',             tr:'Al-Wadood',            ku:'خۆشەویست'},
  {n:48, ar:'الْمَجِيدُ',             tr:'Al-Majeed',            ku:'شانازیدار'},
  {n:49, ar:'الْبَاعِثُ',             tr:"Al-Baa'ith",           ku:'هەستینەر'},
  {n:50, ar:'الشَّهِيدُ',             tr:'Ash-Shaheed',          ku:'شایەت'},
  {n:51, ar:'الْحَقُّ',               tr:'Al-Haqq',              ku:'ڕاست'},
  {n:52, ar:'الْوَكِيلُ',             tr:'Al-Wakeel',            ku:'پشتی'},
  {n:53, ar:'الْقَوِيُّ',             tr:'Al-Qawiyy',            ku:'بەهێز'},
  {n:54, ar:'الْمَتِينُ',             tr:'Al-Mateen',            ku:'مەحکەم'},
  {n:55, ar:'الْوَلِيُّ',             tr:'Al-Waliyy',            ku:'دۆست'},
  {n:56, ar:'الْحَمِيدُ',             tr:'Al-Hameed',            ku:'ستایشدار'},
  {n:57, ar:'الْمُحْصِي',             tr:'Al-Muhsee',            ku:'ژمارەکارێ هەمەیان'},
  {n:58, ar:'الْمُبْدِئُ',            tr:"Al-Mubdi'",            ku:'دەستپێکار'},
  {n:59, ar:'الْمُعِيدُ',             tr:"Al-Mu'eed",            ku:'گەڕاندنەوەر'},
  {n:60, ar:'الْمُحْيِي',             tr:'Al-Muhyee',            ku:'ژیانی دەر'},
  {n:61, ar:'الْمُمِيتُ',             tr:'Al-Mumeet',            ku:'مردنی دەر'},
  {n:62, ar:'الْحَيُّ',               tr:'Al-Hayy',              ku:'ژیاو'},
  {n:63, ar:'الْقَيُّومُ',            tr:'Al-Qayyoom',           ku:'ئایەندەپار'},
  {n:64, ar:'الْوَاجِدُ',             tr:'Al-Waajid',            ku:'دۆزەرەوە'},
  {n:65, ar:'الْمَاجِدُ',             tr:'Al-Maajid',            ku:'شانازیدار'},
  {n:66, ar:'الْوَاحِدُ',             tr:'Al-Waahid',            ku:'یەک'},
  {n:67, ar:'الْأَحَدُ',              tr:'Al-Ahad',              ku:'تاک'},
  {n:68, ar:'الصَّمَدُ',              tr:'As-Samad',             ku:'بێ نیاز'},
  {n:69, ar:'الْقَادِرُ',             tr:'Al-Qaadir',            ku:'توانا'},
  {n:70, ar:'الْمُقْتَدِرُ',          tr:'Al-Muqtadir',          ku:'توانادار'},
  {n:71, ar:'الْمُقَدِّمُ',           tr:'Al-Muqaddim',          ku:'پێشخەر'},
  {n:72, ar:'الْمُؤَخِّرُ',           tr:"Al-Mu'akhkhir",        ku:'دواخەر'},
  {n:73, ar:'الْأَوَّلُ',             tr:'Al-Awwal',             ku:'یەکەم'},
  {n:74, ar:'الْآخِرُ',               tr:'Al-Aakhir',            ku:'کۆتایی'},
  {n:75, ar:'الظَّاهِرُ',             tr:'Az-Zaahir',            ku:'ئاشکرا'},
  {n:76, ar:'الْبَاطِنُ',             tr:'Al-Baatin',            ku:'نهێنی'},
  {n:77, ar:'الْوَالِي',              tr:'Al-Waali',             ku:'سەروەر'},
  {n:78, ar:'الْمُتَعَالِي',          tr:"Al-Muta'aali",         ku:'برزتر'},
  {n:79, ar:'الْبَرُّ',               tr:'Al-Barr',              ku:'باش'},
  {n:80, ar:'التَّوَّابُ',            tr:'At-Tawwaab',           ku:'توبە پەذیر'},
  {n:81, ar:'الْمُنْتَقِمُ',          tr:'Al-Muntaqim',          ku:'توانجەگر'},
  {n:82, ar:'الْعَفُوُّ',             tr:"Al-'Afuww",            ku:'بوخشایینکار'},
  {n:83, ar:'الرَّءُوفُ',             tr:"Ar-Ra'oof",            ku:'نەرمدڵ'},
  {n:84, ar:'مَالِكُ الْمُلْكِ',      tr:'Maalik-ul-Mulk',       ku:'پاشایێ پاشایان'},
  {n:85, ar:'ذُو الْجَلَالِ وَالْإِكْرَامِ', tr:'Dhul-Jalaali wal-Ikraam', ku:'خاوەنێ شکوه و کەرامەت'},
  {n:86, ar:'الْمُقْسِطُ',            tr:'Al-Muqsit',            ku:'دادپەروەر'},
  {n:87, ar:'الْجَامِعُ',             tr:'Al-Jaami',             ku:'کۆکار'},
  {n:88, ar:'الْغَنِيُّ',             tr:'Al-Ghaniyy',           ku:'بێ نیاز'},
  {n:89, ar:'الْمُغْنِي',             tr:'Al-Mughnee',           ku:'دەوڵەمەند کار'},
  {n:90, ar:'الْمَانِعُ',             tr:'Al-Maani',             ku:'پاراستووار'},
  {n:91, ar:'الضَّارُّ',              tr:'Ad-Daarr',             ku:'زیانی دەر'},
  {n:92, ar:'النَّافِعُ',             tr:"An-Naafi'",            ku:'سوودی دەر'},
  {n:93, ar:'النُّورُ',               tr:'An-Noor',              ku:'ڕووناکی'},
  {n:94, ar:'الْهَادِي',              tr:'Al-Haadee',            ku:'ڕێنیشاندەر'},
  {n:95, ar:'الْبَدِيعُ',             tr:"Al-Badee'",            ku:'دروستکارێ نوێ'},
  {n:96, ar:'الْبَاقِي',              tr:'Al-Baaqee',            ku:'هەمیشە مایەوە'},
  {n:97, ar:'الْوَارِثُ',             tr:'Al-Waarith',           ku:'وارس'},
  {n:98, ar:'الرَّشِيدُ',             tr:'Ar-Rasheed',           ku:'ڕێنیشاندەر'},
  {n:99, ar:'الصَّبُورُ',             tr:'As-Saboor',            ku:'بردبار'}
];

/* Persistent image-loaded tracker — survives every home re-render */
var IMG_LOADED = {};

/* Preload and mark loaded immediately */
(function(){
  ['hadith','adhkar','dua','tasbih','asma'].forEach(function(name){
    var s = {name:name};
    if(IMG_LOADED[s.name]) return;
    var img = new Image();
    img.onload = function(){ IMG_LOADED[s.name] = true; };
    img.src = '/assets/icons/genc-' + s.name + '-bg.webp';
  });
})();

var DHIKR_LIST = [
  {ar:'سُبْحَانَ اللَّهِ',                         ku:'سبحان الله',                key:'سبحان'},
  {ar:'الْحَمْدُ لِلَّهِ',                         ku:'الحمد لله',                 key:'الحمد'},
  {ar:'اللَّهُ أَكْبَرُ',                          ku:'الله أكبر',                  key:'اكبر'},
  {ar:'لَا إِلَهَ إِلَّا اللَّهُ',                ku:'لا اله الا الله',           key:'الا'},
  {ar:'أَسْتَغْفِرُ اللَّهَ',                      ku:'استغفر الله',                key:'استغفر'},
  {ar:'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',       ku:'سبحان الله وبحمده',         key:'وبحمده'},
  {ar:'سُبْحَانَ اللَّهِ الْعَظِيمِ',              ku:'سبحان الله العظيم',         key:'العظيم'},
  {ar:'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ',          ku:'صلات بەسەر پێغەمبەر',       key:'محمد'},
  {ar:'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', ku:'لا حوله ولا قوه',          key:'حوله'},
  {ar:'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ',     ku:'بسم الله الرحمن الرحيم',   key:'الرحمن'}
];

/* Adhkar category keys and Kurdish labels */
var ADHKAR_CAT_KEYS = ['morning','evening','sleep','waking','house_enter','house_exit','bathroom_enter','bathroom_exit','masjid_enter','masjid_exit','wudu','opening_prayer','ruku','rising_ruku','sujood','between_sujood','tashahhud','eating_before','eating_after','breaking_fast','fasting','travel','travel_return','vehicle','marketplace','charity','distress','debt','fear','forgiveness','protection','rain','thunder','wind','after_prayer','adhan','salawat','qunut','lailat_qadr','dhul_hijjah','talbiyah','safa_marwa','zamzam','entering_makkah','arafat','grave','eclipse','illness','pain','ruqyah','visiting_sick','condolence','newborn','anger','sneeze','new_clothes','dressing','mirror','new_moon','nightmare','istikhara','wedding','kaffarah','before_quran','friday','gratitude'];
var ADHKAR_CAT_LABELS = {
  morning:        'زکرێن بەیانیکردن',
  evening:        'زکرێن ئێواربوون',
  sleep:          'بەرى نڤستنێ',
  waking:         'دوای هاتنا خوو',
  house_enter:    'چونا ماڵ',
  house_exit:     'دەرچوونا ماڵ',
  bathroom_enter: 'چونا دەستشوینکێ',
  bathroom_exit:  'دەرچوونا دەستشوینکێ',
  masjid_enter:   'چونا مزگەوت',
  masjid_exit:    'دەرچوونا مزگەوت',
  wudu:           'وەزوو',
  opening_prayer: 'دوعای دەستپێکردنا نوێژ',
  ruku:           'زکرێن ڕکووع',
  rising_ruku:    'ڕاستبوونا ڕکووعێ',
  sujood:         'زکرێن سەجدەیێ',
  between_sujood: 'نێو دووسەجدەیێ',
  tashahhud:      'شەهدەدان',
  eating_before:  'بەرا خواردن',
  eating_after:   'دوای خواردن',
  breaking_fast:  'کاتا ئیفتارێ',
  fasting:        'نیەتا ڕۆژوو',
  travel:         'گەشت',
  travel_return:  'گەرانا ماڵ',
  vehicle:        'سواربوونا نەقلیەتێ',
  marketplace:    'چونا بازارێ',
  charity:        'کاتا سەدەقەیێ',
  distress:       'پەریشانی',
  debt:           'کاتا قەرزێ',
  fear:           'کاتا تیرسێ',
  forgiveness:    'داواکاری لێبوردن',
  protection:     'پاراستن',
  rain:           'باران',
  thunder:        'کاتا برووسکێ',
  wind:           'کاتا هەوایی',
  after_prayer:   'دوای نوێژ',
  adhan:          'دوای ئەزان',
  salawat:        'صەڵەوات',
  qunut:          'دوعای قونووت',
  lailat_qadr:    'شەوا قەدرێ',
  dhul_hijjah:    'دەیا ذولحیجەیێ',
  talbiyah:       'تەلبیەی حەج',
  safa_marwa:     'سەفا و مەروە',
  zamzam:         'ئاوا زەمزەمێ',
  entering_makkah:'چونا مەکەیێ',
  arafat:         'دوعای عەرەفاتێ',
  grave:          'سەردانی گۆرستانێ',
  eclipse:        'کاتا کووسووفێ',
  illness:        'نەخۆشی',
  pain:           'کاتا ئازارێ',
  ruqyah:         'ڕووقیای شەرعی',
  visiting_sick:  'سەردانی نەخۆش',
  condolence:     'سووزداری',
  newborn:        'زێدەبوونا منداڵ',
  anger:          'کاتا هەرسێ',
  sneeze:         'کاتا بزنکوی',
  new_clothes:    'جلێن نوێ',
  dressing:       'کاتا جلوبەرگکردنێ',
  mirror:         'دیتنا ئاوینێ',
  new_moon:       'دیتنا مانگا نوێ',
  nightmare:      'خەوا خراپ',
  istikhara:      'دوعای ئیستیخارە',
  wedding:        'تەبریکا زاوایێ',
  kaffarah:       'کەفارەتا کۆمەلکردنێ',
  before_quran:   'بەرا خوێندنا قورئانێ',
  friday:         'ڕۆژا ئینانێ',
  gratitude:      'سوپاسگوزاری'
};
var ADHKAR_ICONS = {
  morning:        { icon:'fas fa-sun'                      },
  evening:        { icon:'fas fa-moon'                     },
  sleep:          { icon:'fas fa-bed'                      },
  waking:         { icon:'fas fa-cloud-sun'                },
  house_enter:    { icon:'fas fa-door-open'                },
  house_exit:     { icon:'fas fa-arrow-right-from-bracket' },
  bathroom_enter: { icon:'fas fa-toilet'                   },
  bathroom_exit:  { icon:'fas fa-soap'                     },
  masjid_enter:   { icon:'fas fa-mosque'                   },
  masjid_exit:    { icon:'fas fa-person-walking'           },
  wudu:           { icon:'fas fa-hands-bubbles'            },
  opening_prayer: { icon:'fas fa-person-praying'           },
  ruku:           { icon:'fas fa-person-falling'           },
  rising_ruku:    { icon:'fas fa-arrow-up'                 },
  sujood:         { icon:'fas fa-person-rays'              },
  between_sujood: { icon:'fas fa-arrows-up-down'           },
  tashahhud:      { icon:'fas fa-hand-point-up'            },
  eating_before:  { icon:'fas fa-utensils'                 },
  eating_after:   { icon:'fas fa-heart'                    },
  breaking_fast:  { icon:'fas fa-bowl-food'                },
  fasting:        { icon:'fas fa-sun'                      },
  travel:         { icon:'fas fa-road'                     },
  travel_return:  { icon:'fas fa-house-circle-check'       },
  vehicle:        { icon:'fas fa-car-side'                 },
  marketplace:    { icon:'fas fa-store'                    },
  charity:        { icon:'fas fa-hand-holding-dollar'      },
  distress:       { icon:'fas fa-hand-holding-heart'       },
  debt:           { icon:'fas fa-coins'                    },
  fear:           { icon:'fas fa-shield-heart'             },
  forgiveness:    { icon:'fas fa-dove'                     },
  protection:     { icon:'fas fa-shield-halved'            },
  rain:           { icon:'fas fa-cloud-rain'               },
  thunder:        { icon:'fas fa-bolt'                     },
  wind:           { icon:'fas fa-wind'                     },
  after_prayer:   { icon:'fas fa-hands-praying'            },
  adhan:          { icon:'fas fa-bullhorn'                 },
  salawat:        { icon:'fas fa-star-and-crescent'        },
  qunut:          { icon:'fas fa-moon'                     },
  lailat_qadr:    { icon:'fas fa-star'                     },
  dhul_hijjah:    { icon:'fas fa-calendar-days'            },
  talbiyah:       { icon:'fas fa-kaaba'                    },
  safa_marwa:     { icon:'fas fa-repeat'                   },
  zamzam:         { icon:'fas fa-glass-water'              },
  entering_makkah:{ icon:'fas fa-archway'                  },
  arafat:         { icon:'fas fa-mountain-sun'             },
  grave:          { icon:'fas fa-place-of-worship'         },
  eclipse:        { icon:'fas fa-circle-dot'               },
  illness:        { icon:'fas fa-hand-holding-medical'     },
  pain:           { icon:'fas fa-heart-pulse'              },
  ruqyah:         { icon:'fas fa-wand-magic-sparkles'      },
  visiting_sick:  { icon:'fas fa-user-doctor'              },
  condolence:     { icon:'fas fa-heart-crack'              },
  newborn:        { icon:'fas fa-baby'                     },
  anger:          { icon:'fas fa-fire'                     },
  sneeze:         { icon:'fas fa-head-side-cough'          },
  new_clothes:    { icon:'fas fa-tag'                      },
  dressing:       { icon:'fas fa-shirt'                    },
  mirror:         { icon:'fas fa-eye'                      },
  new_moon:       { icon:'fas fa-circle-half-stroke'       },
  nightmare:      { icon:'fas fa-cloud-moon'               },
  istikhara:      { icon:'fas fa-compass'                  },
  wedding:        { icon:'fas fa-heart-circle-check'       },
  kaffarah:       { icon:'fas fa-people-group'             },
  before_quran:   { icon:'fas fa-book-open-reader'         },
  friday:         { icon:'fas fa-calendar-day'             },
  gratitude:      { icon:'fas fa-star'                     }
};

/* Fallback hardcoded categories — used when Supabase not available */
var FALLBACK_CAT_KEYS   = ['morning','evening','travel','eating','sleep','general'];
var FALLBACK_CAT_LABELS = {
  morning: (window.t&&window.t('gencine.cat_morning'))||'بەیانیکردن',
  evening: (window.t&&window.t('gencine.cat_evening'))||'ئێواربوون',
  travel:  (window.t&&window.t('gencine.cat_travel')) ||'گەشت',
  eating:  (window.t&&window.t('gencine.cat_eating')) ||'خواردن',
  sleep:   (window.t&&window.t('gencine.cat_sleep'))  ||'خەو',
  general: (window.t&&window.t('gencine.cat_general'))||'گشتی'
};

var TARGET_PRESETS = [33, 66, 99, 100, 500, 1000];
var RING_R    = 110;
var RING_CIRC = 2 * Math.PI * RING_R;

/* ── Supabase data cache ── */
var _dbCats     = null;   /* [{key, label_ku, ...}] */
var _dbDuas     = null;   /* [{category_key, ar, ku, source, repeat}] */
var _dbHadiths  = null;   /* [{title, ar, ku, source}] */
var _dbSections = null;   /* [{key, active, sort_order}] */
var _dbTasbih   = null;   /* [{ar, ku, sort_order}] */
var _dbAsma99   = null;   /* [{n, ku}] overrides */
var _dbAdhkar   = null;   /* [{category_key, ar, repeat, source, sort_order}] */
var _dbBooks    = [];
var _loadingDb  = false;
var _dbLoaded   = false;
var _skeletonShown = false; /* true while skeleton is visible — triggers fade-in on first real render */

/* Pre-warm: read all caches into memory immediately at script load so _dbLoaded=true
   before the user ever opens the Gencine tab — eliminates skeleton flash on 2nd+ open. */
(function _prewarmGencineCache() {
  try {
    function _rc(k) {
      var raw = localStorage.getItem(k);
      if (!raw) return null;
      var p = JSON.parse(raw);
      return p.data || p;
    }
    var cats     = _rc('gencine_cats_v5');
    var duas     = _rc('gencine_duas_v3');
    var hadiths  = _rc('gencine_hadiths_v2');
    var sections = _rc('gencine_sections_v1');
    var books    = _rc('gencine_books_v4');
    var tasbih   = _rc('gencine_tasbih_v1');
    var asma99   = _rc('gencine_asma99_v1');
    var adhkar   = _rc('gencine_adhkar_v1');
    if (sections) _dbSections = sections;
    if (books)    _dbBooks    = books;
    if (tasbih)   _dbTasbih   = tasbih;
    if (asma99)   _dbAsma99   = asma99;
    if (adhkar)   _dbAdhkar   = adhkar;
    if (cats && duas && hadiths) {
      _dbCats    = cats;
      _dbDuas    = duas;
      _dbHadiths = hadiths;
      _dbLoaded  = true;
    }
  } catch(e) {}
})();

function _buildSkeleton() {
  function _sk(tag, cls) { var e = document.createElement(tag); e.className = cls; return e; }
  var wrap = _sk('div', 'genc-skel');

  /* ── Smart slider skeleton ── */
  var smart = _sk('div', 'genc-skel-smart');
  var hdr = _sk('div', 'genc-skel-smart-hdr');
  hdr.appendChild(_sk('div', 'genc-skel-smart-label skel-block'));
  hdr.appendChild(_sk('div', 'genc-skel-smart-chip skel-block'));
  smart.appendChild(hdr);
  smart.appendChild(_sk('div', 'genc-skel-card skel-block'));
  var dots = _sk('div', 'genc-skel-dots');
  for (var d = 0; d < 4; d++) {
    dots.appendChild(_sk('div', 'genc-skel-dot skel-block' + (d === 0 ? ' genc-skel-dot-active' : '')));
  }
  smart.appendChild(dots);
  wrap.appendChild(smart);

  /* ── Grid card skeletons ── */
  var cards = _sk('div', 'genc-skel-cards');
  for (var c = 0; c < 3; c++) cards.appendChild(_sk('div', 'genc-skel-gcard skel-block'));
  wrap.appendChild(cards);

  return wrap;
}

function _readCache(key) {
  try {
    var raw = localStorage.getItem(key);
    if (!raw) return null;
    var parsed = JSON.parse(raw);
    /* Cache never expires — background refresh keeps it fresh silently.
       User can pull-to-refresh to force a reload. */
    return parsed.data || parsed; /* support both {ts,data} and raw formats */
  } catch(e) { return null; }
}
function _writeCache(key, data) {
  try { localStorage.setItem(key, JSON.stringify({ts: Date.now(), data: data})); } catch(e) {}
}

function _getSupabase() {
  /* app.js exposes supabase via window._appSupabase once initialized */
  return window._appSupabase || null;
}

var _lastBgRefresh = 0; /* timestamp of last silent re-fetch (ms) */

/* Silent background re-fetch — at most once per 60s, updates badges/new content */
function _triggerBgRefresh() {
  if (!navigator.onLine || _loadingDb) return;
  if (Date.now() - _lastBgRefresh < 60000) return;
  _lastBgRefresh = Date.now();
  _fetchDbData(function() {
    var ui = window.GencineUI;
    if (!ui) return;
    ui._homeEl = null;
    if (ui._view === 'home') ui._draw();
    else if (ui._view === 'hadith' && ui._hadithDetailIdx === null) ui._draw();
    else if (ui._view === 'books') ui._draw();
    else if (ui._view === 'tasbih') ui._draw();
    else if (ui._view === 'adhkar') ui._draw();
    else if (ui._view === 'dua') ui._draw();
  });
}

/* Load from cache instantly, then re-fetch once in background per session */
function _initDbData(onDone) {
  var cachedCats     = _readCache('gencine_cats_v5');
  var cachedDuas     = _readCache('gencine_duas_v3');
  var cachedHadiths  = _readCache('gencine_hadiths_v2');
  var cachedSections = _readCache('gencine_sections_v1');
  var cachedBooks    = _readCache('gencine_books_v4');
  var cachedTasbih   = _readCache('gencine_tasbih_v1');
  var cachedAsma99   = _readCache('gencine_asma99_v1');
  var cachedAdhkar   = _readCache('gencine_adhkar_v1');

  if (cachedSections) _dbSections = cachedSections;
  if (cachedBooks)    _dbBooks    = cachedBooks;
  if (cachedTasbih)   _dbTasbih   = cachedTasbih;
  if (cachedAsma99)   _dbAsma99   = cachedAsma99;
  if (cachedAdhkar)   _dbAdhkar   = cachedAdhkar;

  console.log('[Gencine] data source: cats=' + (cachedCats?'cache':'miss') +
    ' hadiths=' + (cachedHadiths?'cache':'miss') +
    ' books=' + (cachedBooks?'cache':'miss') +
    ' adhkar=' + (cachedAdhkar?'cache':'miss') +
    ' duas=' + (cachedDuas?'cache':'miss') +
    ' asma99=' + (cachedAsma99?'cache':'miss') +
    ' tasbih=' + (cachedTasbih?'cache':'miss'));

  if (cachedCats && cachedDuas && cachedHadiths) {
    _dbCats    = cachedCats;
    _dbDuas    = cachedDuas;
    _dbHadiths = cachedHadiths;
    _dbLoaded  = true;
    window._gencineDbVersion = (window._gencineDbVersion || 0) + 1; // bump for _tabHash cache
    if (onDone) onDone();
    if (window._splashReadyGencine) window._splashReadyGencine();
    /* One silent background refresh per session to pick up admin changes */
    _triggerBgRefresh();
  } else {
    console.log('[Gencine] cache incomplete — Supabase fetch starting');
    _fetchDbData(onDone);
  }
}

var _fetchQueue = []; /* callbacks waiting for _fetchDbData to complete */

function _fetchDbData(onDone) {
  if (_loadingDb) {
    /* Already in-flight — queue callback, don't call it prematurely */
    if (onDone) _fetchQueue.push(onDone);
    return;
  }
  var sb = _getSupabase();
  if (!sb) {
    /* Supabase not ready yet — subscribe once; fire as soon as app.js sets it */
    if (onDone) _fetchQueue.push(onDone);
    if (window._onAppSupabaseReady) {
      window._onAppSupabaseReady(function() {
        var cbs = _fetchQueue.splice(0);
        _loadingDb = false;
        _fetchDbData(function() {
          _dbLoaded = true;
          cbs.forEach(function(cb){ try{cb();}catch(e){} });
        });
      });
    } else {
      /* Fallback: app.js not yet loaded, retry once after 1s */
      setTimeout(function() {
        var cbs = _fetchQueue.splice(0);
        _fetchDbData(function() {
          _dbLoaded = true;
          cbs.forEach(function(cb){ try{cb();}catch(e){} });
        });
      }, 1000);
    }
    return;
  }
  if (onDone) _fetchQueue.push(onDone);

  _loadingDb = true;

  var catsPromise     = sb.from('gencine_categories').select('*').eq('active', true).eq('is_hidden', false).order('sort_order', { ascending: true });
  var duasPromise     = sb.from('gencine_duas').select('*').eq('active', true).order('category_key').order('sort_order');
  var hadithsPromise  = sb.from('gencine_hadiths').select('*').eq('active', true).order('sort_order');
  var sectionsPromise = sb.from('gencine_sections').select('*').order('sort_order');
  var tasbihPromise   = sb.from('gencine_tasbih').select('*').eq('active', true).order('sort_order');
  var asma99Promise   = sb.from('gencine_asma99').select('n,ku');
  var booksPromise    = sb.from('gencine_books').select('*').eq('active', true).order('sort_order', { ascending: false }).order('created_at', { ascending: false });
  var adhkarPromise   = sb.from('gencine_adhkar').select('*').eq('active', true).order('category_key').order('sort_order');
  var _gcTimeout=new Promise(function(_,rej){setTimeout(function(){rej(new Error('gencine_timeout'));},15000);});
  Promise.race([
    Promise.all([catsPromise, duasPromise, hadithsPromise, sectionsPromise, booksPromise, tasbihPromise, asma99Promise, adhkarPromise]),
    _gcTimeout
  ]).then(function(results) {
    _loadingDb = false;
    var catRes = results[0], duaRes = results[1], hadithRes = results[2], secRes = results[3], bookRes = results[4], tasbihRes = results[5], asma99Res = results[6], adhkarRes = results[7];
    if (!catRes.error && catRes.data) {
      _dbCats = catRes.data;
      _writeCache('gencine_cats_v5', _dbCats);
    }
    if (!duaRes.error && duaRes.data) {
      _dbDuas = duaRes.data;
      _writeCache('gencine_duas_v3', _dbDuas);
    }
    if (!hadithRes.error && hadithRes.data) {
      _dbHadiths = hadithRes.data;
      _writeCache('gencine_hadiths_v2', _dbHadiths);
    }
    if (!secRes.error && secRes.data) {
      _dbSections = secRes.data;
      _writeCache('gencine_sections_v1', _dbSections);
    }
    if (!bookRes.error && bookRes.data) {
      _dbBooks = bookRes.data;
      _writeCache('gencine_books_v4', _dbBooks);
      /* Pre-cache all book cover images in the HTTP cache */
      _dbBooks.forEach(function(b){ if(b.cover_url){ var img=new Image(); img.src=b.cover_url; } });
    }
    if (tasbihRes && !tasbihRes.error && tasbihRes.data) { _dbTasbih = tasbihRes.data; _writeCache('gencine_tasbih_v1', _dbTasbih); }
    if (asma99Res && !asma99Res.error && asma99Res.data) { _dbAsma99 = asma99Res.data; _writeCache('gencine_asma99_v1', _dbAsma99); }
    if (adhkarRes && !adhkarRes.error && adhkarRes.data) { _dbAdhkar = adhkarRes.data; _writeCache('gencine_adhkar_v1', _dbAdhkar); }
    _dbLoaded = true;
    if (window._splashReadyGencine) window._splashReadyGencine();
    var cbs = _fetchQueue.splice(0);
    cbs.forEach(function(cb){ try{cb();}catch(e){} });
  }).catch(function() {
    _loadingDb = false;
    _dbLoaded  = true;
    // Ensure _dbSections is at least an empty array so _renderHome shows static menu
    // instead of staying on the skeleton forever when Supabase is unreachable.
    if (!_dbSections) _dbSections = [];
    if (window._splashReadyGencine) window._splashReadyGencine();
    var cbs = _fetchQueue.splice(0);
    cbs.forEach(function(cb){ try{cb();}catch(e){} });
  });
}

/* ── Book save/favourite helpers ── */
function _bookGetSaved(){ try{ return JSON.parse(localStorage.getItem('book_saved')||'[]'); }catch(e){ return []; } }
function _bookIsSaved(id){ return _bookGetSaved().some(function(b){ return String(b.id)===String(id); }); }
function _bookToggleSave(id, book){
  var saved = _bookGetSaved();
  var idx = saved.findIndex(function(b){ return String(b.id)===String(id); });
  if (idx >= 0) { saved.splice(idx, 1); }
  else { saved.unshift({ id: book.id, title_ku: book.title_ku, title_ar: book.title_ar, author_ku: book.author_ku, cover_url: book.cover_url }); }
  localStorage.setItem('book_saved', JSON.stringify(saved));
}

/* ── Book reading-progress helpers ── */
function _bookGetProgress(id){ try{ return JSON.parse(localStorage.getItem('pdfProg_'+id)||'null'); }catch(e){ return null; } }
function _bookClearProgress(id){ try{ localStorage.removeItem('pdfProg_'+id); }catch(e){} }

/* ── Reading history (separate from progress, tracks opened books) ── */
// Always reads fresh from localStorage so cross-device sync via applySyncData is visible immediately.
function _getReadingHistory(){
  try{ var arr=JSON.parse(localStorage.getItem('book_read_ids')||'[]'); var h={}; arr.forEach(function(id){ h[String(id)]=true; }); return h; }catch(e){ return {}; }
}
function _addToReadingHistory(id){
  var h=_getReadingHistory(); h[String(id)]=true;
  try{ localStorage.setItem('book_read_ids',JSON.stringify(Object.keys(h))); }catch(e){}
}
function _removeFromReadingHistory(id){
  var h=_getReadingHistory(); delete h[String(id)];
  try{ localStorage.setItem('book_read_ids',JSON.stringify(Object.keys(h))); }catch(e){}
}

/* ── Series helpers ── */
function _seriesGetLastRead(volumes) {
  var best = null, bestTs = 0;
  volumes.forEach(function(v) {
    var p = _bookGetProgress(v.id);
    if (p && p.ts > bestTs) { bestTs = p.ts; best = { vol: v, prog: p }; }
  });
  return best;
}
function _seriesGetReadCount(volumes) {
  var h = _getReadingHistory(), count = 0;
  volumes.forEach(function(v) { if (_bookGetProgress(v.id) || h[String(v.id)]) count++; });
  return count;
}

/* ── Time-ago helper ── */
function _timeAgo(ts) {
  if (!ts) return '';
  var T = function(k,d){ var v=window.t?window.t(k):undefined; return (!v||v===k)?(d||k):v; };
  var diff = Math.floor((Date.now() - ts) / 86400000);
  if (diff < 1) return T('gencine.today','ئەڤڕۆ');
  if (diff === 1) return T('gencine.yesterday','دووهی');
  if (diff < 7) return diff + ' ' + T('gencine.days_ago','ڕۆژ');
  if (diff < 30) return Math.floor(diff/7) + ' ' + T('gencine.weeks_ago','حەفتی');
  return Math.floor(diff/30) + ' ' + T('gencine.months_ago','مانگ');
}

/* ── Supabase progress sync — only fires when user is logged in ── */
var _sbSyncTimer = null;
function _syncProgressToSupabase(bookId, page, total, ts) {
  clearTimeout(_sbSyncTimer);
  _sbSyncTimer = setTimeout(function() {
    var sb = window._appSupabase; if (!sb) return;
    sb.auth.getSession().then(function(r) {
      var uid = r && r.data && r.data.session && r.data.session.user && r.data.session.user.id;
      if (!uid) return;
      sb.from('book_reading_progress').upsert({user_id:uid,book_id:parseInt(bookId,10),page:page,total:total,ts:ts,updated_at:new Date().toISOString()},{onConflict:'user_id,book_id'}).then(function(){}).catch(function(){});
    }).catch(function(){});
  }, 1200);
}

/* Merge Supabase progress with localStorage — takes whichever is newer */
function _mergeProgressFromSupabase(bookId, localProg, cb) {
  var sb = window._appSupabase; if (!sb) { cb(localProg); return; }
  sb.auth.getSession().then(function(r) {
    var uid = r && r.data && r.data.session && r.data.session.user && r.data.session.user.id;
    if (!uid) { cb(localProg); return; }
    sb.from('book_reading_progress').select('page,total,ts').eq('user_id',uid).eq('book_id',parseInt(bookId,10)).maybeSingle().then(function(res) {
      var remote = res && res.data;
      if (!remote) { cb(localProg); return; }
      if (!localProg || (remote.ts && remote.ts > (localProg.ts||0))) {
        try { localStorage.setItem('pdfProg_'+bookId, JSON.stringify({page:remote.page,total:remote.total,ts:remote.ts})); } catch(e) {}
        cb({page:remote.page,total:remote.total,ts:remote.ts});
      } else { cb(localProg); }
    }).catch(function(){ cb(localProg); });
  }).catch(function(){ cb(localProg); });
}

/* Return category keys+labels from DB or fallback */
function _getCatKeys() {
  if (_dbCats && _dbCats.length) return _dbCats.map(function(c){ return c.key; });
  return FALLBACK_CAT_KEYS;
}
function _getCatLabel(key) {
  if (_dbCats && _dbCats.length) {
    var found = _dbCats.find(function(c){ return c.key === key; });
    return found ? found.label_ku : key;
  }
  return FALLBACK_CAT_LABELS[key] || key;
}
/* Return duas for a category from DB or window.DUA_DATA fallback */
function _getDuas(catKey) {
  if (_dbDuas && _dbDuas.length) {
    return _dbDuas.filter(function(d){ return d.category_key === catKey; });
  }
  return (window.DUA_DATA && window.DUA_DATA[catKey]) ? window.DUA_DATA[catKey] : [];
}
/* Return hadiths from DB */
function _getHadiths() {
  return (_dbHadiths && _dbHadiths.length) ? _dbHadiths : [];
}
/* Return adhkar for a category from DB */
function _getAdhkar(catKey) {
  if (_dbAdhkar && _dbAdhkar.length) {
    return _dbAdhkar.filter(function(a){ return a.category_key === catKey; });
  }
  return [];
}
/* Return ALL adhkar — used by smart-dhikr.js to get in-memory data on iOS
   where localStorage may not be written yet on first session open */
function _getAllAdhkar() {
  return _dbAdhkar || [];
}
/* Return unique adhkar category keys from DB */
function _getAdhkarCatKeys() {
  if (!_dbAdhkar || !_dbAdhkar.length) return ADHKAR_CAT_KEYS;
  var seen = {}, keys = [];
  _dbAdhkar.forEach(function(a){ if (!seen[a.category_key]){ seen[a.category_key]=1; keys.push(a.category_key); } });
  return keys;
}
function _getTasbih() {
  return (_dbTasbih && _dbTasbih.length) ? _dbTasbih : DHIKR_LIST;
}
function _getAsmaKuOverride(n) {
  if (!_dbAsma99 || !_dbAsma99.length) return null;
  var row = _dbAsma99.find(function(r){ return r.n === n; });
  return row ? row.ku : null;
}

var APP_LINK = 'https://tafsirkurd.com/links';

function _mkCopyBtn(text) {
  var btn = document.createElement('button');
  btn.className = 'dua-copy-btn';
  var ico = document.createElement('i');
  ico.className = 'fas fa-copy';
  btn.appendChild(ico);
  btn.onclick = function(e) {
    e.stopPropagation();
    var full = text + '\n\n──────────\nTafsirKurd\n' + APP_LINK;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(full).catch(function(){});
    } else {
      /* Fallback for older WebViews */
      var ta = document.createElement('textarea');
      ta.value = full;
      ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      try { document.execCommand('copy'); } catch(ex){}
      document.body.removeChild(ta);
    }
    haptic(12);
    ico.className = 'fas fa-check';
    btn.classList.add('copied');
    setTimeout(function(){
      ico.className = 'fas fa-copy';
      btn.classList.remove('copied');
    }, 1500);
  };
  return btn;
}

function haptic(ms){
  try{
    // Use app.js H namespace if available (same spam guard + platform checks)
    if(window.H){
      if(ms>=40){window.H.success();}
      else if(ms>=20){window.H.medium();}
      else if(ms>=8){window.H.light();}
      else{window.H.selection();}
      return;
    }
    // Direct Capacitor fallback (qibla/standalone context)
    var Hp=window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.Haptics;
    if(!Hp){if(navigator.vibrate)navigator.vibrate([ms]);return;}
    if(ms>=40){Hp.notification({type:'SUCCESS'});}
    else if(ms>=20){Hp.impact({style:'MEDIUM'});}
    else if(ms>=8){Hp.impact({style:'LIGHT'});}
    else{Hp.selectionChanged();}
  }catch(e){}
}
function $(id){return document.getElementById(id)}

window.GencineUI = {
  _view:            'home',   /* 'home' | 'adhkar' | 'dua' | 'tasbih' | 'hadith' */
  _homeEl:          null,     /* cached home grid — built once, reused */
  _adhkarView:          'grid',   /* 'grid' | 'list' */
  _adhkarGridScrollPos: null,
  _adhkarCat:       'morning',
  _duaCat:          'quran',
  _tasbihCount:     0,
  _tasbihTarget:    33,
  _tasbihDhikrIdx:  0,
  _hadithDetailIdx: null,   /* null = list view; number = detail view */
  _hadithSearch:    '',     /* current search query */
  _voiceActive:     false,
  _recognition:     null,
  _voiceLastMatch:  0,
  _voiceDebounceMs: 1200,
  _bookCat:         'all',
  _bookSearch:      '',
  _bookAuthor:      '',
  _currentBook:     null,
  _pdfDoc:          null,
  _pdfPage:         1,
  _pdfRendering:    false,
  _expandedSeries:  {},
  _pdfHasToc:       false,

  /* Expose in-memory adhkar so smart-dhikr.js can get counts on iOS where
     localStorage may not be written yet on the first session open */
  getAllAdhkar: function() { return _getAllAdhkar(); },

  /* Look up a book record by pdf_url — used by the unified download manager in app.js */
  getBook: function(pdfUrl) {
    for (var i = 0; i < _dbBooks.length; i++) {
      if (_dbBooks[i].pdf_url === pdfUrl) return _dbBooks[i];
    }
    return null;
  },

  /* ── state persistence ── */
  _loadState: function(){
    var c = parseInt(localStorage.getItem('tasbihCount'))  || 0;
    var t = parseInt(localStorage.getItem('tasbihTarget')) || 33;
    var d = parseInt(localStorage.getItem('tasbihDhikr'))  || 0;
    this._tasbihCount     = (c < 0 || isNaN(c)) ? 0 : c;
    this._tasbihTarget    = TARGET_PRESETS.indexOf(t) !== -1 ? t : 33;
    var _dlen = _getTasbih().length || DHIKR_LIST.length;
    this._tasbihDhikrIdx  = (d < 0 || d >= _dlen || isNaN(d)) ? 0 : d;
  },
  _saveState: function(){
    localStorage.setItem('tasbihCount',  this._tasbihCount);
    localStorage.setItem('tasbihTarget', this._tasbihTarget);
    localStorage.setItem('tasbihDhikr',  this._tasbihDhikrIdx);
  },

  /* ── called by App.tab('gencine') ── */
  render: function(){
    var self = this;
    this._loadState();

    var el = $('gencineContent');

    this._view = 'home';
    this._hadithDetailIdx = null;
    /* Hide books header buttons when returning to home */
    var _hb = document.getElementById('booksHdrBtns');
    if (_hb) _hb.style.display = 'none';

    if (!_dbLoaded) {
      this._draw();
      _initDbData(function(){
        self._homeEl = null; // rebuild with DB sort order
        self._draw();
      });
    } else {
      this._draw();
      _triggerBgRefresh();
    }
  },

  /* ── background data prefetch — warms cache with no DOM work ── */
  prefetch: function(){
    if(_dbLoaded||_loadingDb)return;
    _initDbData(null);
  },

  /* ── pull-to-refresh: clear cache + re-fetch + re-render ── */
  refresh: function(){
    var self = this;
    localStorage.removeItem('gencine_cats_v5');
    localStorage.removeItem('gencine_duas_v3');
    localStorage.removeItem('gencine_hadiths_v2');
    localStorage.removeItem('gencine_books_v4');
    localStorage.removeItem('gencine_sections_v1');
    localStorage.removeItem('gencine_tasbih_v1');
    localStorage.removeItem('gencine_adhkar_v1');
    localStorage.removeItem('gencine_asma99_v1');
    _dbLoaded  = false;
    _loadingDb = false;
    this._homeEl = null;
    if (window.SmartDhikr) SmartDhikr.clearCache();
    _fetchDbData(function(){ self._draw(); });
  },

  /* ── called by section nav buttons ── */
  section: function(name){
    if (this._view === 'home') {
      var _pg = document.getElementById('panelGencine');
      if (_pg) this._homeScrollPos = _pg.scrollTop;
    }
    this._view = name;
    if (name === 'hadith') { this._hadithDetailIdx = null; this._hadithSearch = ''; }
    if (name === 'adhkar') { this._adhkarView = 'grid'; }
    this._draw();
  },

  openAdhkar: function(catKey) {
    this._view = 'adhkar';
    this._adhkarView = 'list';
    this._adhkarCat = catKey || 'morning';
    this._draw();
    return true;
  },

  openBook: function(bookId){
    var book = null;
    for (var i = 0; i < _dbBooks.length; i++) {
      if (String(_dbBooks[i].id) === String(bookId)) { book = _dbBooks[i]; break; }
    }
    if (!book) return false;
    // Save scroll position so we can restore it when closing the book
    var panel = document.getElementById('panelGencine');
    this._booksScrollPos = panel ? panel.scrollTop : 0;
    this._view = 'book-reader';
    this._currentBook = book;
    this._pdfDoc = null;
    this._pdfPage = 1;
    this._draw();
    return true;
  },

  goHome: function(){
    if (this._view === 'book-reader') { this._view = 'books'; }
    else if (this._view === 'hadith' && this._hadithDetailIdx !== null) { this._hadithDetailIdx = null; }
    else if (this._view === 'adhkar' && this._adhkarView === 'list') { this._adhkarView = 'grid'; }
    else { this._view = 'home'; }
    this._draw();
  },

  // Renders the swipe-back destination into an arbitrary container without mutating any state.
  // Called by swipe-back.js at drag-lock time to pre-populate the bg layer for Type AG.
  _renderDestInto: function(container) {
    var sv = this._view, si = this._hadithDetailIdx, sa = this._adhkarView;
    // Mirror goHome() logic — read-only destination determination
    if (this._view === 'book-reader') {
      this._view = 'books';                   // book-reader → books list
    } else if (this._view === 'hadith' && this._hadithDetailIdx !== null) {
      this._hadithDetailIdx = null;           // hadith detail → hadith list
    } else if (this._view === 'adhkar' && this._adhkarView === 'list') {
      this._adhkarView = 'grid';              // adhkar list → adhkar grid
    } else {
      this._view = 'home';                    // everything else → gencine home
    }
    try {
      if      (this._view === 'home')   this._renderHome(container);
      else if (this._view === 'hadith') this._renderHadith(container);
      else if (this._view === 'adhkar') this._renderAdhkar(container);
      else if (this._view === 'books')  this._renderBooks(container);
    } finally {
      // Always restore — even if a render method throws
      this._view = sv; this._hadithDetailIdx = si; this._adhkarView = sa;
    }
    // _renderHome may add genc-fade-in for its own entry animation — strip it here
    // so the destination appears immediately as the swipe gesture reveals it.
    container.classList.remove('genc-fade-in');
  },

  closeSheet: function(){
    if(this._activeSheet){ this._activeSheet.classList.remove('on'); }
  },

  _updateHeader: function(){
    var backBtn        = document.getElementById('gencineBackBtn');
    var title          = document.getElementById('gencineHdrTitle');
    var booksBtns      = document.getElementById('booksHdrBtns');
    var fsBtn          = document.getElementById('pdfFsBtn');
    var tocBtn         = document.getElementById('pdfTocBtn');
    var gencSearchBtns = document.getElementById('gencSearchBtns');
    var isHome         = (this._view === 'home');
    var isBooks        = (this._view === 'books');
    var isReader       = (this._view === 'book-reader');
    var isSearchable   = (this._view === 'adhkar' || this._view === 'dua' || this._view === 'hadith' || this._view === 'asma')
                         && !(this._view === 'adhkar' && this._adhkarView === 'list')
                         && !(this._view === 'hadith' && this._hadithDetailIdx !== null);
    var navBtns        = document.getElementById('pdfNavBtns');
    if(backBtn)        backBtn.style.display        = isHome ? 'none' : 'flex';
    if(title)          title.style.visibility       = isHome ? '' : 'hidden';
    if(booksBtns)      booksBtns.style.display      = isBooks ? 'flex' : 'none';
    if(navBtns)        navBtns.style.display        = isReader ? 'flex' : 'none';
    if(fsBtn)          fsBtn.style.display          = isReader ? 'flex' : 'none';
    if(tocBtn)         tocBtn.style.display         = (isReader && this._pdfHasToc) ? 'flex' : 'none';
    if(gencSearchBtns) gencSearchBtns.style.display = isSearchable ? 'flex' : 'none';
    if(!isSearchable){ var gsb = document.getElementById('gencSearchBtn'); if(gsb) gsb.classList.remove('on'); }
  },

  /* ── main dispatcher ── */
  _draw: function(){
    var el = $('gencineContent');
    if(!el) return;
    if(this._view !== 'tasbih' && this._voiceActive) this._stopVoice();
    if(this._pdfCleanup){ this._pdfCleanup(); this._pdfCleanup = null; }
    // Clear sheet reference — DOM removal below already removes it from screen
    this._activeSheet = null;
    // Close rec-picker on every Gencine view change — it must never survive navigation within the tab
    if(window.App && App.closeRecPicker) App.closeRecPicker();
    while(el.firstChild) el.removeChild(el.firstChild);
    var panel = document.getElementById('panelGencine');
    var restoringBooks  = (this._view === 'books'  && this._booksScrollPos != null);
    var restoringHome   = (this._view === 'home'   && this._homeScrollPos  != null);
    var restoringAdhkar = (this._view === 'adhkar' && this._adhkarView === 'grid' && this._adhkarGridScrollPos != null);
    if(panel && !restoringBooks && !restoringHome && !restoringAdhkar) panel.scrollTop = 0;
    this._updateHeader();
    if(this._view === 'home'){
      this._renderHome(el);
      if(restoringHome){
        var _savedHome = this._homeScrollPos;
        this._homeScrollPos = null;
        if(panel) setTimeout(function(){ panel.scrollTop = _savedHome; }, 0);
      }
    }
    else if(this._view === 'adhkar'){
      this._renderAdhkar(el);
      if(restoringAdhkar){
        var _savedAdhkar = this._adhkarGridScrollPos;
        this._adhkarGridScrollPos = null;
        if(panel) setTimeout(function(){ panel.scrollTop = _savedAdhkar; }, 0);
      }
    }
    else if(this._view === 'dua')     this._renderDua(el);
    else if(this._view === 'tasbih')  this._renderTasbih(el);
    else if(this._view === 'asma')       this._renderAsma(el);
    else if(this._view === 'books'){
      this._renderBooks(el);
      if(restoringBooks){
        var savedPos = this._booksScrollPos;
        this._booksScrollPos = null;
        if(panel) setTimeout(function(){ panel.scrollTop = savedPos; }, 0);
      }
    }
    else if(this._view === 'book-reader') this._renderBookReader(el);
    else                                  this._renderHadith(el);
  },

  /* ═══════════════════ HOME ═══════════════════ */
  _renderHome: function(container){
    /* Smart daily companion — always fresh (time-aware) */
    if (window.SmartDhikr) {
      var smartEl = SmartDhikr.render(this);
      if (smartEl) container.appendChild(smartEl);
    }

    if (this._homeEl) {
      /* Fade in real content if skeleton was showing before */
      if (_skeletonShown) {
        _skeletonShown = false;
        container.classList.remove('genc-fade-in');
        void container.offsetWidth; /* force reflow so animation restarts */
        container.classList.add('genc-fade-in');
      }
      container.appendChild(this._homeEl);
      return;
    }
    /* Show skeleton until DB sections arrive */
    if (!_dbSections) {
      _skeletonShown = true;
      container.appendChild(_buildSkeleton());
      return;
    }
    /* Fade in on first real render after skeleton */
    if (_skeletonShown) {
      _skeletonShown = false;
      container.classList.remove('genc-fade-in');
      void container.offsetWidth;
      container.classList.add('genc-fade-in');
    }
    var self = this;
    var home = document.createElement('div');
    home.className = 'genc-home';

    _sections().forEach(function(sec){
      var btn = document.createElement('button');
      btn.className = 'genc-card-btn';
      btn.dataset.sec = sec.name;
      btn.onclick = function(){ self.section(sec.name); };

      /* <img> element — fades in via opacity when loaded, no background-size warp */
      var url = '/assets/icons/genc-' + sec.name + '-bg.webp';
      var cardImg = document.createElement('img');
      cardImg.className = 'genc-card-img';
      cardImg.alt = '';
      /* Always apply has-image immediately — overlay + text colours render
         correctly at once. Image opacity-fades in via CSS when it loads. */
      cardImg.src = url;
      btn.classList.add('has-image');
      btn.appendChild(cardImg);

      /* Overlay */
      var overlay = document.createElement('div');
      overlay.className = 'genc-card-overlay';
      btn.appendChild(overlay);

      /* Glowing top bar */
      var topbar = document.createElement('div');
      topbar.className = 'genc-card-topbar';
      btn.appendChild(topbar);

      /* Card body */
      var body = document.createElement('div');
      body.className = 'genc-card-body';

      /* Frosted glass icon circle */
      var iconCircle = document.createElement('div');
      iconCircle.className = 'genc-card-icon';
      var ico = document.createElement('i');
      ico.className = sec.icon;
      iconCircle.appendChild(ico);
      body.appendChild(iconCircle);

      /* Text (title + subtitle) */
      var texts = document.createElement('div');
      texts.className = 'genc-card-texts';
      var title = document.createElement('div');
      title.className = 'genc-card-title';
      title.textContent = sec.label;
      texts.appendChild(title);
      var sub = document.createElement('div');
      sub.className = 'genc-card-sub';
      sub.textContent = sec.sub;
      texts.appendChild(sub);
      body.appendChild(texts);

      /* Chevron */
      var arrow = document.createElement('div');
      arrow.className = 'genc-card-arrow';
      var chevron = document.createElement('i');
      chevron.className = 'fas fa-chevron-left';
      arrow.appendChild(chevron);
      body.appendChild(arrow);

      /* Section-level "نوی" badge — set via admin badge dialog */
      if (sec.badge) {
        var newBadge = document.createElement('div');
        newBadge.className = 'genc-card-badge';
        newBadge.textContent = (window.t && window.t('iv.new_badge')) || 'نوی';
        btn.appendChild(newBadge);
      }

      /* Item-count dot (separate from section badge) */
      if (sec.newCount) {
        var notifDot = document.createElement('div');
        notifDot.className = 'genc-notif-count';
        notifDot.textContent = sec.newCount;
        btn.appendChild(notifDot);
      }

      btn.appendChild(body);
      home.appendChild(btn);
    });

    /* Schedule re-render when the earliest active badge expires */
    var _allBadgeItems = (_dbSections || []).concat(_dbHadiths || []).concat(_dbDuas || []).concat(_dbAdhkar || []).concat(_dbBooks || []);
    var _soonest = null;
    _allBadgeItems.forEach(function(s) {
      if (s.badge_until) {
        var exp = new Date(s.badge_until).getTime();
        if (exp > Date.now() && (!_soonest || exp < _soonest)) _soonest = exp;
      }
    });
    if (_soonest) {
      setTimeout(function() {
        self._homeEl = null;
        if (self._view === 'home') self._draw();
      }, _soonest - Date.now() + 100);
    }

    this._homeEl = home;
    container.appendChild(home);
  },

  /* ── back row shared by all sections ── */
  _backRow: function(label, onBack){
    var self = this;
    var row = document.createElement('div');
    row.className = 'genc-back-row';
    var btn = document.createElement('button');
    btn.className = 'genc-back-btn';
    var i = document.createElement('i');
    i.className = 'fas fa-arrow-right';
    btn.appendChild(i);
    btn.onclick = onBack ? onBack : function(){ self.render(); };
    row.appendChild(btn);
    if(label){
      var t = document.createElement('span');
      t.className = 'genc-back-label';
      t.textContent = label;
      row.appendChild(t);
    }
    return row;
  },

  /* ═══════════════════ ADHKAR ═══════════════════ */
  _renderAdhkar: function(container){
    if (this._adhkarView === 'list') { this._renderAdhkarCatList(container); }
    else                             { this._renderAdhkarGrid(container); }
  },

  _renderAdhkarGrid: function(container){
    var self = this;
    var T = function(k,d){ var v=window.t?window.t(k):undefined; return (!v||v===k)?(d||k):v; };
    var catKeys = _getAdhkarCatKeys();

    var GROUPS = [
      { labelKey: 'adhkar.group.daily',   label: 'ڕۆژانە',         keys: ['morning','evening','waking','sleep'] },
      { labelKey: 'adhkar.group.prayer',  label: 'نوێژ',            keys: ['adhan','opening_prayer','ruku','rising_ruku','sujood','between_sujood','tashahhud','after_prayer','qunut'] },
      { labelKey: 'adhkar.group.food',    label: 'خواردن',          keys: ['eating_before','eating_after','fasting','breaking_fast'] },
      { labelKey: 'adhkar.group.places',  label: 'مالبیا و جێ',    keys: ['house_enter','house_exit','bathroom_enter','bathroom_exit','masjid_enter','masjid_exit','marketplace','vehicle'] },
      { labelKey: 'adhkar.group.travel',  label: 'گەشت',            keys: ['travel','travel_return'] },
      { labelKey: 'adhkar.group.hajj',    label: 'حەج',             keys: ['talbiyah','safa_marwa','zamzam','entering_makkah','arafat','dhul_hijjah'] },
      { labelKey: 'adhkar.group.ramadan', label: 'ڕەمەزان',        keys: ['fasting','breaking_fast','lailat_qadr'] },
      { labelKey: 'adhkar.group.weather', label: 'هەوا',            keys: ['rain','thunder','wind','eclipse'] },
      { labelKey: 'adhkar.group.health',  label: 'تەندروستی',      keys: ['illness','pain','ruqyah','visiting_sick','condolence'] },
      { labelKey: 'adhkar.group.special', label: 'کاتی تایبەت',    keys: ['friday','salawat','lailat_qadr','new_moon'] },
      { labelKey: 'adhkar.group.life',    label: 'ژیانی ڕۆژانە',   keys: ['wudu','dressing','mirror','new_clothes','sneeze','anger','fear','debt','charity','distress','forgiveness','protection','before_quran','gratitude','nightmare','istikhara','wedding','newborn','kaffarah','grave'] },
      { labelKey: 'adhkar.group.other',   label: 'دیکە',            keys: [] }
    ];

    var keyToGroup = {};
    GROUPS.forEach(function(g, gi) {
      g.keys.forEach(function(k) { if (!keyToGroup[k]) keyToGroup[k] = gi; });
    });

    var grouped = GROUPS.map(function() { return []; });
    catKeys.forEach(function(key) {
      var gi = (keyToGroup[key] !== undefined) ? keyToGroup[key] : GROUPS.length - 1;
      grouped[gi].push(key);
    });

    /* Search bar — books style */
    var adhkarSearchBar = document.createElement('div');
    adhkarSearchBar.className = 'book-search-bar';
    var adhkarInner = document.createElement('div');
    adhkarInner.className = 'book-search-wrap-inner';
    var adhkarIco = document.createElement('i'); adhkarIco.className = 'fas fa-search book-search-ico';
    var adhkarInput = document.createElement('input');
    adhkarInput.type = 'search'; adhkarInput.className = 'book-search-inp';
    adhkarInput.placeholder = T('gencine.adhkar_search_ph', 'گەڕان...');
    var adhkarClear = document.createElement('button'); adhkarClear.className = 'book-search-clear';
    var _acx = document.createElement('i'); _acx.className = 'fas fa-times'; adhkarClear.appendChild(_acx);
    adhkarInput.oninput = function(){ adhkarClear.classList.toggle('visible', !!adhkarInput.value); buildAdhkarGrid(adhkarInput.value); };
    adhkarClear.onclick = function(){ adhkarInput.value = ''; adhkarClear.classList.remove('visible'); buildAdhkarGrid(''); adhkarInput.focus(); };
    adhkarInner.appendChild(adhkarIco); adhkarInner.appendChild(adhkarInput); adhkarInner.appendChild(adhkarClear);
    adhkarSearchBar.appendChild(adhkarInner);
    container.appendChild(adhkarSearchBar);

    var _gsbAdhkar = document.getElementById('gencSearchBtn');
    if(_gsbAdhkar){ _gsbAdhkar.onclick = function(){
      var open = adhkarSearchBar.classList.toggle('open');
      _gsbAdhkar.classList.toggle('on', open);
      if(open) setTimeout(function(){ adhkarInput.focus(); }, 50);
      else { adhkarInput.value = ''; adhkarClear.classList.remove('visible'); buildAdhkarGrid(''); }
    }; }

    var wrap = document.createElement('div');
    wrap.className = 'adhkar-list-wrap';
    container.appendChild(wrap);

    function buildAdhkarGrid(q) {
      while (wrap.firstChild) wrap.removeChild(wrap.firstChild);
      var filter = q ? q.toLowerCase() : '';

      GROUPS.forEach(function(group, gi) {
        var keys = grouped[gi].filter(function(key) {
          if (!filter) return true;
          var label = (window.t && window.t('adhkar.' + key)) || ADHKAR_CAT_LABELS[key] || key;
          return label.toLowerCase().indexOf(filter) !== -1 || T(group.labelKey, group.label).toLowerCase().indexOf(filter) !== -1;
        });
        if (!keys.length) return;

      var section = document.createElement('div');
      section.className = 'adhkar-list-section';

      var hdr = document.createElement('div');
      hdr.className = 'adhkar-list-hdr';
      hdr.textContent = T(group.labelKey, group.label);
      section.appendChild(hdr);

      var rows = document.createElement('div');
      rows.className = 'adhkar-list-rows';

      keys.forEach(function(key, ki) {
        var catItems = _getAdhkar(key);
        var count = catItems.length;
        var label = (window.t && window.t('adhkar.' + key)) || ADHKAR_CAT_LABELS[key] || key;
        var meta  = ADHKAR_ICONS[key] || { icon:'fas fa-circle' };
        var newInCat = catItems.filter(function(x){ return x.badge_until && new Date(x.badge_until).getTime() > Date.now(); }).length;

        var row = document.createElement('button');
        row.className = 'adhkar-list-row' + (ki === keys.length - 1 ? ' adhkar-list-row-last' : '');
        row.onclick = function() {
          var _pg = document.getElementById('panelGencine');
          if (_pg) self._adhkarGridScrollPos = _pg.scrollTop;
          self._adhkarView = 'list';
          self._adhkarCat  = key;
          self._draw();
        };

        var iconWrap = document.createElement('div');
        iconWrap.className = 'adhkar-list-icon';
        var ico = document.createElement('i');
        ico.className = meta.icon;
        iconWrap.appendChild(ico);

        var lbl = document.createElement('div');
        lbl.className = 'adhkar-list-label';
        lbl.textContent = label;

        var right = document.createElement('div');
        right.className = 'adhkar-list-right';
        if (newInCat) {
          var newDot = document.createElement('span');
          newDot.className = 'adhkar-new-dot';
          newDot.textContent = newInCat;
          right.appendChild(newDot);
        } else if (count) {
          var cnt = document.createElement('span');
          cnt.className = 'adhkar-list-count';
          cnt.textContent = count;
          right.appendChild(cnt);
        }
        var chev = document.createElement('i');
        chev.className = 'fas fa-chevron-left adhkar-list-chev';
        right.appendChild(chev);

        row.appendChild(iconWrap);
        row.appendChild(lbl);
        row.appendChild(right);
        rows.appendChild(row);
      });

      section.appendChild(rows);
      wrap.appendChild(section);
      });
    }

    buildAdhkarGrid('');

    adhkarInput.addEventListener('input', function() {
      buildAdhkarGrid(this.value.trim());
    });
  },

  _renderAdhkarCatList: function(container){
    var self = this;
    var T = function(k,d){ var v=window.t?window.t(k):undefined; return (!v||v===k)?(d||k):v; };

    var items = _getAdhkar(this._adhkarCat);
    if (!items.length) {
      var emptyEl = document.createElement('div');
      emptyEl.style.cssText = 'text-align:center;padding:40px 16px;color:var(--text3);direction:rtl;font-size:.88rem';
      emptyEl.textContent = T('gencine.adhkar_empty', 'چ زکر نینن.');
      container.appendChild(emptyEl);
      return;
    }

    var list = document.createElement('div');
    list.className = 'adhkar-list';

    items.forEach(function(item){
      var card = document.createElement('div');
      card.className = 'adhkar-card';

      if (item.badge_until && new Date(item.badge_until).getTime() > Date.now()) {
        var aNewChip = document.createElement('div');
        aNewChip.className = 'new-badge';
        aNewChip.textContent = (window.t && window.t('iv.new_badge')) || 'نوی';
        card.appendChild(aNewChip);
      }

      var ar = document.createElement('div');
      ar.className = 'adhkar-card-ar';
      ar.textContent = item.ar || '';
      card.appendChild(ar);

      var footer = document.createElement('div');
      footer.className = 'adhkar-card-footer';
      var src = document.createElement('span');
      src.className = 'adhkar-card-src';
      src.textContent = item.source || '';
      footer.appendChild(src);
      var right = document.createElement('div');
      right.className = 'adhkar-card-right';
      if ((item.repeat || 1) > 1){
        var rep = document.createElement('span');
        rep.className = 'adhkar-card-repeat';
        rep.textContent = '\u00D7 ' + item.repeat;
        right.appendChild(rep);
      }
      right.appendChild(_mkCopyBtn(item.ar || ''));
      footer.appendChild(right);
      card.appendChild(footer);
      list.appendChild(card);
    });

    container.appendChild(list);
  },

  /* ═══════════════════ DUA (Quran only) ═══════════════════ */
  _renderDua: function(container){
    var T = function(k,d){ var v=window.t?window.t(k):undefined; return (!v||v===k)?(d||k):v; };
    var duas = _getDuas('quran');

    if (!duas.length) {
      var empty = document.createElement('div');
      empty.style.cssText = 'text-align:center;padding:60px 24px;color:var(--text3);font-size:.9rem;direction:rtl';
      empty.textContent = T('gencine.dua_empty', 'چ دوعا نینن');
      container.appendChild(empty);
      return;
    }

    /* Search bar — books style */
    var duaSearchBar = document.createElement('div');
    duaSearchBar.className = 'book-search-bar';
    var duaInner = document.createElement('div');
    duaInner.className = 'book-search-wrap-inner';
    var duaIco = document.createElement('i'); duaIco.className = 'fas fa-search book-search-ico';
    var duaInput = document.createElement('input');
    duaInput.type = 'text'; duaInput.className = 'book-search-inp';
    duaInput.placeholder = T('gencine.dua_search_ph', 'گەڕان...');
    var duaClear = document.createElement('button'); duaClear.className = 'book-search-clear';
    var _dcx = document.createElement('i'); _dcx.className = 'fas fa-times'; duaClear.appendChild(_dcx);
    duaInput.oninput = function(){ duaClear.classList.toggle('visible', !!duaInput.value); buildDuaList(duaInput.value); };
    duaClear.onclick = function(){ duaInput.value = ''; duaClear.classList.remove('visible'); buildDuaList(''); duaInput.focus(); };
    duaInner.appendChild(duaIco); duaInner.appendChild(duaInput); duaInner.appendChild(duaClear);
    duaSearchBar.appendChild(duaInner);
    container.appendChild(duaSearchBar);

    var _gsbDua = document.getElementById('gencSearchBtn');
    if(_gsbDua){ _gsbDua.onclick = function(){
      var open = duaSearchBar.classList.toggle('open');
      _gsbDua.classList.toggle('on', open);
      if(open) setTimeout(function(){ duaInput.focus(); }, 50);
      else { duaInput.value = ''; duaClear.classList.remove('visible'); buildDuaList(''); }
    }; }

    /* Count label */
    var duaCount = document.createElement('div');
    duaCount.className = 'genc-search-count';
    duaCount.textContent = duas.length + ' ' + T('gencine.dua_count', 'دوعا');
    container.appendChild(duaCount);

    var list = document.createElement('div');
    list.className = 'dua-list';
    container.appendChild(list);

    var _now = Date.now();
    function buildDuaList(q) {
      while (list.firstChild) list.removeChild(list.firstChild);
      var items = q ? duas.filter(function(d){
        var hay = (d.ar || '') + ' ' + (d.ku || '') + ' ' + (d.source || '');
        return hay.toLowerCase().indexOf(q.toLowerCase()) !== -1;
      }) : duas;
      duaCount.textContent = q
        ? items.length + ' / ' + duas.length + ' ' + T('gencine.dua_count', 'دوعا')
        : duas.length + ' ' + T('gencine.dua_count', 'دوعا');
      if (!items.length) {
        var noRes = document.createElement('div');
        noRes.className = 'hadith-empty';
        noRes.textContent = T('gencine.hadith_empty', 'هیچ ئەنجامێک نەدۆزراوەتەوە');
        list.appendChild(noRes);
        return;
      }
      items.forEach(function(dua){
        var card = document.createElement('div');
        card.className = 'dua-card';

        if (dua.badge_until && new Date(dua.badge_until).getTime() > _now) {
          var newChip = document.createElement('div');
          newChip.className = 'new-badge';
          newChip.textContent = (window.t && window.t('iv.new_badge')) || 'نوی';
          card.appendChild(newChip);
        }

        var ar = document.createElement('div');
        ar.className = 'dua-card-ar';
        var arText = dua.ar || '';
        var ayahs = arText.split('۝');
        if (ayahs.length > 1) {
          var ARABIC_NUMS = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
          function toArabicNum(n) {
            return String(n).split('').map(function(d){ return ARABIC_NUMS[+d] || d; }).join('');
          }
          var ayahnums = dua.ayahnums || [];
          var realIdx = 0;
          ayahs.forEach(function(ayah, idx) {
            ayah = ayah.trim();
            if (!ayah) return;
            ar.appendChild(document.createTextNode(ayah + ' '));
            var numEl = document.createElement('span');
            numEl.className = 'dua-ayah-num';
            numEl.textContent = toArabicNum(ayahnums[realIdx] !== undefined ? ayahnums[realIdx] : idx + 1);
            realIdx++;
            ar.appendChild(numEl);
            ar.appendChild(document.createTextNode(' '));
          });
        } else {
          ar.textContent = arText;
        }
        card.appendChild(ar);

        if (dua.ku) {
          var ku = document.createElement('div');
          ku.className = 'dua-card-ku';
          ku.textContent = dua.ku;
          card.appendChild(ku);
        }

        var footer = document.createElement('div');
        footer.className = 'dua-card-footer';
        var src = document.createElement('span');
        src.className = 'dua-card-src';
        src.textContent = dua.source || '';
        footer.appendChild(src);
        var repeatCount = dua.repeat || 1;
        if (repeatCount > 1) {
          var rep = document.createElement('span');
          rep.className = 'dua-card-repeat';
          rep.textContent = '× ' + repeatCount;
          footer.appendChild(rep);
        }
        var copyText = (dua.ar || '') + (dua.ku ? '\n\n' + dua.ku : '') + (dua.source ? '\n\n' + dua.source : '');
        footer.appendChild(_mkCopyBtn(copyText));
        card.appendChild(footer);
        list.appendChild(card);
      });
    }

    buildDuaList('');

    duaInput.addEventListener('input', function() {
      buildDuaList(this.value.trim());
    });
  },

  /* ═════════════════════ TASBIH ═════════════════════ */
  _renderTasbih: function(container){
    var self = this;
    var T = function(k,d){ var v=window.t?window.t(k):undefined; return (!v||v===k)?(d||k):v; };
    

    var wrap = document.createElement('div');
    wrap.className = 'tasbih-wrap';

    /* ── selected dhikr card ── */
    var list = _getTasbih();
    var curDhikr = list[self._tasbihDhikrIdx] || list[0] || {};

    var selCard = document.createElement('div');
    selCard.className = 'tasbih-sel-card';

    var selAr = document.createElement('div');
    selAr.className = 'tasbih-sel-ar';
    selAr.textContent = curDhikr.ar || '';
    selCard.appendChild(selAr);

    var changeBtn = document.createElement('button');
    changeBtn.className = 'tasbih-sel-change';
    var changeI = document.createElement('i');
    changeI.className = 'fas fa-list';
    changeBtn.appendChild(changeI);
    changeBtn.appendChild(document.createTextNode(' ' + T('gencine.change_dhikr', 'دیکرەکا بگۆرە')));
    selCard.appendChild(changeBtn);
    wrap.appendChild(selCard);

    /* ── bottom-sheet dhikr picker ── */
    var sheet = document.createElement('div');
    sheet.className = 'tasbih-picker-sheet';

    var inner = document.createElement('div');
    inner.className = 'tasbih-picker-inner';

    var hdr = document.createElement('div');
    hdr.className = 'tasbih-picker-hdr';
    var hdrTitle = document.createElement('div');
    hdrTitle.className = 'tasbih-picker-title';
    hdrTitle.textContent = T('gencine.pick_dhikr', 'دیکرێکا هەلبژارە');
    var closeBtn = document.createElement('button');
    closeBtn.className = 'tasbih-picker-close';
    var closeI = document.createElement('i');
    closeI.className = 'fas fa-times';
    closeBtn.appendChild(closeI);
    hdr.appendChild(hdrTitle);
    hdr.appendChild(closeBtn);
    inner.appendChild(hdr);

    var pickerList = document.createElement('div');
    pickerList.className = 'tasbih-picker-list';
    var pickerItems = [];
    list.forEach(function(d, i){
      var item = document.createElement('div');
      item.className = 'tasbih-picker-item' + (i === self._tasbihDhikrIdx ? ' on' : '');

      var numBadge = document.createElement('div');
      numBadge.className = 'tasbih-picker-num';
      numBadge.textContent = i + 1;

      var texts = document.createElement('div');
      texts.className = 'tasbih-picker-texts';
      var arTxt = document.createElement('div');
      arTxt.className = 'tasbih-picker-ar';
      arTxt.textContent = d.ar || '';
      texts.appendChild(arTxt);

      var check = document.createElement('i');
      check.className = 'fas fa-check tasbih-picker-check';

      item.appendChild(numBadge);
      item.appendChild(texts);
      item.appendChild(check);

      item.onclick = function(){
        self._tasbihDhikrIdx = i;
        self._tasbihCount = 0;
        self._saveState();
        // Update selected card
        selAr.textContent = d.ar || '';
        // Update picker highlights
        pickerItems.forEach(function(p){ p.classList.remove('on'); });
        item.classList.add('on');
        // Close sheet
        sheet.classList.remove('on');
        self._updateRing();
      };
      pickerItems.push(item);
      pickerList.appendChild(item);
    });
    inner.appendChild(pickerList);
    sheet.appendChild(inner);

    // Open/close logic
    function openSheet(){
      // Set scroll position before sheet becomes visible — prevents visible snap/jump
      var active = pickerList.querySelector('.tasbih-picker-item.on');
      if(active){
        pickerList.scrollTop = (active.offsetTop - pickerList.offsetTop) - (pickerList.clientHeight - active.offsetHeight) / 2;
      }
      sheet.classList.add('on');
    }
    changeBtn.onclick = openSheet;
    selCard.onclick = function(e){ if(e.target === selCard || e.target === selAr) openSheet(); };
    closeBtn.onclick = function(){ sheet.classList.remove('on'); };
    sheet.onclick = function(e){ if(e.target === sheet) sheet.classList.remove('on'); };
    // Prevent scroll inside the picker list from bubbling up and triggering pull-to-refresh
    pickerList.addEventListener('touchstart', function(e){ e.stopPropagation(); }, {passive:true});
    pickerList.addEventListener('touchmove',  function(e){ e.stopPropagation(); }, {passive:true});

    // Store reference so App.tab() can force-close this sheet when leaving the Gencine tab
    self._activeSheet = sheet;

    wrap.appendChild(sheet);

    /* ── SVG ring (bigger: 260px) ── */
    var ringWrap = document.createElement('div');
    ringWrap.className = 'tasbih-ring';

    var svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 260 260');
    svg.setAttribute('width','260');
    svg.setAttribute('height','260');

    var track = document.createElementNS('http://www.w3.org/2000/svg','circle');
    track.setAttribute('class','tasbih-ring-track');
    track.setAttribute('cx','130'); track.setAttribute('cy','130'); track.setAttribute('r', RING_R);
    svg.appendChild(track);

    var fillEl = document.createElementNS('http://www.w3.org/2000/svg','circle');
    fillEl.setAttribute('class','tasbih-ring-fill');
    fillEl.setAttribute('cx','130'); fillEl.setAttribute('cy','130'); fillEl.setAttribute('r', RING_R);
    fillEl.setAttribute('stroke-dasharray', RING_CIRC);
    var pct = Math.min(self._tasbihCount / Math.max(self._tasbihTarget, 1), 1);
    fillEl.setAttribute('stroke-dashoffset', RING_CIRC * (1 - pct));
    fillEl.id = 'tasbihRingFill';
    svg.appendChild(fillEl);
    ringWrap.appendChild(svg);

    /* tap button */
    var tapBtn = document.createElement('button');
    tapBtn.className = 'tasbih-tap-btn';
    var countNum = document.createElement('div');
    countNum.className = 'tasbih-count-num';
    countNum.id = 'tasbihCountNum';
    countNum.textContent = self._tasbihCount;
    tapBtn.appendChild(countNum);
    var countOf = document.createElement('div');
    countOf.className = 'tasbih-count-of';
    countOf.id = 'tasbihCountOf';
    countOf.textContent = T('gencine.tasbih_of', 'من') + ' ' + self._tasbihTarget;
    tapBtn.appendChild(countOf);
    var tapHint = document.createElement('div');
    tapHint.className = 'tasbih-tap-hint';
    tapHint.textContent = T('gencine.tap_hint','بتاپینێ');
    tapBtn.appendChild(tapHint);
    tapBtn.onclick = function(){ self._tasbihTap(); };
    ringWrap.appendChild(tapBtn);
    wrap.appendChild(ringWrap);

    /* ── target presets ── */
    var targetRow = document.createElement('div');
    targetRow.className = 'tasbih-target-row';
    var targetBtns = [];
    TARGET_PRESETS.forEach(function(n){
      var btn = document.createElement('button');
      btn.className = 'tasbih-target-btn' + (n === self._tasbihTarget ? ' on' : '');
      btn.textContent = n;
      btn.onclick = function(){
        self._tasbihTarget = n;
        self._tasbihCount = 0;
        self._saveState();
        targetBtns.forEach(function(b){ b.classList.remove('on'); });
        btn.classList.add('on');
        self._updateRing();
      };
      targetBtns.push(btn);
      targetRow.appendChild(btn);
    });
    wrap.appendChild(targetRow);

    /* ── action row: reset + voice ── */
    var actionRow = document.createElement('div');
    actionRow.className = 'tasbih-action-row';

    var resetBtn = document.createElement('button');
    resetBtn.className = 'tasbih-reset-btn';
    var resetI = document.createElement('i');
    resetI.className = 'fas fa-rotate-left';
    resetBtn.appendChild(resetI);
    var resetLbl = document.createElement('span');
    resetLbl.textContent = T('gencine.reset','سفر');
    resetBtn.appendChild(resetLbl);
    resetBtn.onclick = function(){ self._tasbihReset(); };
    actionRow.appendChild(resetBtn);

    var hasSR = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    var voiceBtn = document.createElement('button');
    voiceBtn.id = 'tasbihVoiceBtn';
    voiceBtn.className = 'tasbih-voice-btn' + (self._voiceActive ? ' on' : '') + (hasSR ? '' : ' disabled');
    if (!hasSR) voiceBtn.disabled = true;
    var micI = document.createElement('i');
    micI.className = 'fas fa-microphone mic-icon';
    voiceBtn.appendChild(micI);
    var voiceLbl = document.createElement('span');
    voiceLbl.id = 'tasbihVoiceLbl';
    voiceLbl.textContent = self._voiceActive
      ? T('gencine.voice_listening','...دابیستم')
      : T('gencine.voice_start','دانگ');
    voiceBtn.appendChild(voiceLbl);
    var bars = document.createElement('div');
    bars.id = 'tasbihVoiceBars';
    bars.className = 'tasbih-voice-bars ' + (self._voiceActive ? 'active' : 'idle');
    for(var b = 0; b < 5; b++){
      var bar = document.createElement('div');
      bar.className = 'tasbih-voice-bar';
      bars.appendChild(bar);
    }
    voiceBtn.appendChild(bars);
    if (hasSR) voiceBtn.onclick = function(){ self._toggleVoice(); };
    actionRow.appendChild(voiceBtn);

    /* voice status line — shows hint or "not available" */
    var voiceStatus = document.createElement('div');
    voiceStatus.id = 'tasbihVoiceStatus';
    voiceStatus.className = 'tasbih-voice-status';
    voiceStatus.textContent = hasSR
      ? T('gencine.voice_hint', 'تاپ بکە و دکرێکێ بên')
      : T('gencine.voice_unavailable', 'دانگ li vê cihazê pêşkeftî nîne');
    wrap.appendChild(actionRow);
    wrap.appendChild(voiceStatus);

    /* transcript — live speech feedback */
    var tscript = document.createElement('div');
    tscript.id = 'tasbihVoiceTranscript';
    tscript.className = 'tasbih-voice-transcript';
    wrap.appendChild(tscript);

    container.appendChild(wrap);
  },

  _scoreHadith: function(h, q) {
    if (!q) return 1;
    function stripD(s) { return s.replace(/[\u064B-\u065F\u0670]/g, ''); }
    var qN = stripD(q).toLowerCase();
    if (!qN) return 1;
    var title = stripD(h.title || '').toLowerCase();
    var ar    = stripD(h.ar   || '').toLowerCase();
    var ku    = (h.ku     || '').toLowerCase();

    var score = 0;

    if (title === qN) return 10000;
    if (title.startsWith(qN))  score = Math.max(score, 5000);
    if (title.includes(qN))    score = Math.max(score, 3000);
    if (ar.includes(qN))       score = Math.max(score, 2000);
    if (ku.includes(qN))       score = Math.max(score, 1500);

    /* Per-word bonus */
    qN.split(/\s+/).filter(function(w){ return w.length >= 2; }).forEach(function(w){
      if (title.includes(w)) score += 500;
      if (ar.includes(w))    score += 300;
      if (ku.includes(w))    score += 200;
    });
    return score;
  },

  _renderHadith: function(container){
    var self = this;
    var T = function(k,d){ var v=window.t?window.t(k):undefined; return (!v||v===k)?(d||k):v; };
    var hadiths = _getHadiths();

    /* ── Detail view ── */
    if (this._hadithDetailIdx !== null) {
      var h = hadiths[this._hadithDetailIdx];
      if (!h) { this._hadithDetailIdx = null; this._renderHadith(container); return; }


      var detail = document.createElement('div');
      detail.className = 'hadith-detail-card';

      var numRow = document.createElement('div');
      numRow.className = 'hadith-num-badge';
      numRow.textContent = '#' + (this._hadithDetailIdx + 1);
      detail.appendChild(numRow);

      if (h.title) {
        var titleEl = document.createElement('div');
        titleEl.className = 'hadith-detail-title';
        titleEl.textContent = h.title;
        detail.appendChild(titleEl);
      }

      if (h.badge_until && new Date(h.badge_until).getTime() > Date.now()) {
        var hDetailChip = document.createElement('span');
        hDetailChip.style.cssText = 'display:inline-block;width:fit-content;background:#e53e3e;color:#fff;font-size:.62rem;font-weight:800;padding:2px 8px;border-radius:6px;margin-top:4px;margin-bottom:8px;letter-spacing:.04em';
        hDetailChip.textContent = (window.t && window.t('iv.new_badge')) || 'نوی';
        detail.appendChild(hDetailChip);
      }

      if (h.ar) {
        var arEl = document.createElement('div');
        arEl.className = 'dua-card-ar';
        arEl.textContent = h.ar;
        detail.appendChild(arEl);
      }
      if (h.ku) {
        var kuEl = document.createElement('div');
        kuEl.className = 'dua-card-ku';
        kuEl.textContent = h.ku;
        detail.appendChild(kuEl);
      }

      var detailFooter = document.createElement('div');
      detailFooter.className = 'dua-card-footer';
      if (h.source) {
        h.source.split('\n').filter(Boolean).forEach(function(s) {
          var srcEl = document.createElement('span');
          srcEl.className = 'dua-card-src';
          srcEl.textContent = s;
          detailFooter.appendChild(srcEl);
        });
      }
      var copyText = (h.title ? h.title + '\n\n' : '') + (h.ar || '') + (h.ku ? '\n\n' + h.ku : '') + (h.source ? '\n\n' + h.source : '');
      detailFooter.appendChild(_mkCopyBtn(copyText));
      if (navigator.share) {
        var shareBtn = document.createElement('button');
        shareBtn.className = 'dua-copy-btn';
        var shareIco = document.createElement('i');
        shareIco.className = 'fas fa-share-alt';
        shareBtn.appendChild(shareIco);
        (function(shareText){
          shareBtn.onclick = function(e) {
            e.stopPropagation();
            navigator.share({title: h.title||'Hadith', text: shareText}).catch(function(){});
            haptic(12);
          };
        })(copyText);
        detailFooter.appendChild(shareBtn);
      }
      detail.appendChild(detailFooter);
      container.appendChild(detail);

      /* Prev / Next */
      var nav = document.createElement('div');
      nav.className = 'hadith-nav';

      var prevBtn = document.createElement('button');
      prevBtn.className = 'hadith-nav-btn' + (this._hadithDetailIdx === 0 ? ' disabled' : '');
      prevBtn.disabled = this._hadithDetailIdx === 0;
      var prevIco = document.createElement('i');
      prevIco.className = 'fas fa-arrow-right';
      prevBtn.appendChild(prevIco);
      var prevLbl = document.createElement('span');
      prevLbl.textContent = T('gencine.hadith_prev','پێشوو');
      prevBtn.appendChild(prevLbl);
      prevBtn.onclick = function(){ self._hadithDetailIdx--; self._draw(); var p=document.getElementById('panelGencine');if(p)p.scrollTop=0; };
      nav.appendChild(prevBtn);

      var navCount = document.createElement('span');
      navCount.className = 'hadith-nav-count';
      navCount.textContent = (this._hadithDetailIdx + 1) + ' / ' + hadiths.length;
      nav.appendChild(navCount);

      var nextBtn = document.createElement('button');
      nextBtn.className = 'hadith-nav-btn' + (this._hadithDetailIdx === hadiths.length - 1 ? ' disabled' : '');
      nextBtn.disabled = this._hadithDetailIdx === hadiths.length - 1;
      var nextLbl = document.createElement('span');
      nextLbl.textContent = T('gencine.hadith_next','دواتر');
      nextBtn.appendChild(nextLbl);
      var nextIco = document.createElement('i');
      nextIco.className = 'fas fa-arrow-left';
      nextBtn.appendChild(nextIco);
      nextBtn.onclick = function(){ self._hadithDetailIdx++; self._draw(); var p=document.getElementById('panelGencine');if(p)p.scrollTop=0; };
      nav.appendChild(nextBtn);

      container.appendChild(nav);
      return;
    }

    /* ── List view ── */
    

    if (!hadiths.length) {
      _fetchDbData(function() {
        if (_getHadiths().length && self._view === 'hadith' && self._hadithDetailIdx === null) self._draw();
      });
      var wrap = document.createElement('div');
      wrap.className = 'genc-coming';
      var iconEl = document.createElement('div');
      iconEl.className = 'genc-coming-icon';
      var loadIco = document.createElement('i');
      loadIco.className = 'fas fa-book-open';
      iconEl.appendChild(loadIco);
      wrap.appendChild(iconEl);
      var comingTitle = document.createElement('div');
      comingTitle.className = 'genc-coming-title';
      comingTitle.textContent = T('gencine.loading','بارکرن...');
      wrap.appendChild(comingTitle);
      container.appendChild(wrap);
      return;
    }

    /* Search bar — books style */
    if (!this._hadithReverse) this._hadithReverse = false;
    var searchWrap = document.createElement('div');
    searchWrap.className = 'book-search-bar' + (this._hadithSearch ? ' open' : '');
    var searchInner = document.createElement('div');
    searchInner.className = 'book-search-wrap-inner';
    var searchIco = document.createElement('i'); searchIco.className = 'fas fa-search book-search-ico';
    var searchInput = document.createElement('input');
    searchInput.type = 'search'; searchInput.className = 'book-search-inp';
    searchInput.placeholder = T('gencine.hadith_search_ph','گەڕان بە ناو یا دەق...');
    searchInput.value = this._hadithSearch;
    var searchClear = document.createElement('button');
    searchClear.className = 'book-search-clear' + (this._hadithSearch ? ' visible' : '');
    var _hcx = document.createElement('i'); _hcx.className = 'fas fa-times'; searchClear.appendChild(_hcx);
    var sortBtn = document.createElement('button');
    sortBtn.className = 'hadith-sort-btn' + (this._hadithReverse ? ' hadith-sort-btn--active' : '');
    var sortIco = document.createElement('i'); sortIco.className = 'fas fa-arrow-down-9-1'; sortBtn.appendChild(sortIco);
    searchInput.oninput = function(){ self._hadithSearch = searchInput.value; searchClear.classList.toggle('visible', !!searchInput.value); buildList(searchInput.value); };
    searchClear.onclick = function(){ self._hadithSearch = ''; searchInput.value = ''; searchClear.classList.remove('visible'); buildList(''); searchInput.focus(); };
    searchInner.appendChild(searchIco); searchInner.appendChild(searchInput); searchInner.appendChild(searchClear); searchInner.appendChild(sortBtn);
    searchWrap.appendChild(searchInner);
    container.appendChild(searchWrap);

    var _gsbHadith = document.getElementById('gencSearchBtn');
    if(_gsbHadith){
      _gsbHadith.classList.toggle('on', !!this._hadithSearch);
      _gsbHadith.onclick = function(){
        var open = searchWrap.classList.toggle('open');
        _gsbHadith.classList.toggle('on', open);
        if(open) setTimeout(function(){ searchInput.focus(); }, 50);
        else { self._hadithSearch = ''; searchInput.value = ''; searchClear.classList.remove('visible'); buildList(''); }
      };
    }

    /* Count label */
    var countEl = document.createElement('div');
    countEl.className = 'hadith-count';
    container.appendChild(countEl);

    /* List container — rebuilt in-place on each keystroke */
    var list = document.createElement('div');
    list.className = 'hadith-list';
    container.appendChild(list);

    function buildList(q) {
      while (list.firstChild) list.removeChild(list.firstChild);

      var scored;
      if (!q || !q.trim()) {
        scored = hadiths.map(function(h, i){ return {h: h, origIdx: i}; });
        if (self._hadithReverse) scored = scored.slice().reverse();
        countEl.textContent = hadiths.length + ' ' + T('gencine.hadith_count','فەرمودە');
      } else {
        scored = hadiths.map(function(h, i){
          return {h: h, origIdx: i, score: self._scoreHadith(h, q.trim())};
        }).filter(function(x){ return x.score > 0; });
        scored.sort(function(a, b){ return b.score - a.score; });
        countEl.textContent = scored.length + ' / ' + hadiths.length + ' ' + T('gencine.hadith_count','فەرمودە');
      }

      if (!scored.length) {
        var empty = document.createElement('div');
        empty.className = 'hadith-empty';
        empty.textContent = T('gencine.hadith_empty','هیچ فەرمودەیەک نەدۆزراوەتەوە');
        list.appendChild(empty);
        return;
      }

      scored.forEach(function(item, displayIdx){
        var h = item.h;
        var origIdx = item.origIdx;

        var row = document.createElement('button');
        row.className = 'hadith-title-item';

        var numEl = document.createElement('div');
        numEl.className = 'hadith-num';
        numEl.textContent = origIdx + 1;
        row.appendChild(numEl);

        var textCol = document.createElement('div');
        textCol.className = 'hadith-title-col';

        if (h.badge_until && new Date(h.badge_until).getTime() > Date.now()) {
          var hNewChip = document.createElement('span');
          hNewChip.style.cssText = 'display:inline-block;width:fit-content;background:#e53e3e;color:#fff;font-size:.62rem;font-weight:800;padding:2px 8px;border-radius:6px;margin-bottom:5px;letter-spacing:.04em';
          hNewChip.textContent = (window.t && window.t('iv.new_badge')) || 'نوی';
          textCol.appendChild(hNewChip);
        }
        var titleText = document.createElement('div');
        titleText.className = 'hadith-title-text';
        titleText.textContent = h.title || (h.ar ? h.ar.substring(0, 55) + '…' : '');
        textCol.appendChild(titleText);

        if (h.ar && h.title) {
          var arPrev = document.createElement('div');
          arPrev.className = 'hadith-title-ar';
          arPrev.textContent = h.ar.length > 65 ? h.ar.substring(0,65)+'…' : h.ar;
          textCol.appendChild(arPrev);
        }

        if (h.source) {
          var srcEl = document.createElement('div');
          srcEl.className = 'hadith-title-src';
          srcEl.textContent = h.source.split('\n').filter(Boolean).join(' • ');
          textCol.appendChild(srcEl);
        }
        row.appendChild(textCol);

        var arrow = document.createElement('i');
        arrow.className = 'fas fa-chevron-left';
        row.appendChild(arrow);

        row.onclick = function(){
          var p = document.getElementById('panelGencine');
          self._hadithListScroll = p ? p.scrollTop : 0;
          self._hadithDetailIdx = origIdx;
          self._draw();
          if (p) p.scrollTop = 0;
        };
        list.appendChild(row);
      });
    }

    buildList(this._hadithSearch);

    sortBtn.onclick = function(){
      self._hadithReverse = !self._hadithReverse;
      sortBtn.classList.toggle('hadith-sort-btn--active', self._hadithReverse);
      buildList(self._hadithSearch);
    };
  },

  /* ═══════════════════ 99 NAMES ═══════════════════ */
  _renderAsma: function(container){
    var T = function(k,d){ var v=window.t?window.t(k):undefined; return (!v||v===k)?(d||k):v; };
    

    /* search bar — books style */
    var searchWrap = document.createElement('div');
    searchWrap.className = 'book-search-bar';
    var searchInner = document.createElement('div');
    searchInner.className = 'book-search-wrap-inner';
    var searchIco = document.createElement('i'); searchIco.className = 'fas fa-search book-search-ico';
    var input = document.createElement('input');
    input.type = 'search'; input.className = 'book-search-inp';
    input.placeholder = T('gencine.asma_search_ph','گەڕان...');
    var searchClear = document.createElement('button'); searchClear.className = 'book-search-clear';
    var _axc = document.createElement('i'); _axc.className = 'fas fa-times'; searchClear.appendChild(_axc);
    input.oninput = function(){ searchClear.classList.toggle('visible', !!input.value); buildCards(input.value); };
    searchClear.onclick = function(){ input.value = ''; searchClear.classList.remove('visible'); buildCards(''); input.focus(); };
    searchInner.appendChild(searchIco); searchInner.appendChild(input); searchInner.appendChild(searchClear);
    searchWrap.appendChild(searchInner);
    container.appendChild(searchWrap);

    var _gsbAsma = document.getElementById('gencSearchBtn');
    if(_gsbAsma){ _gsbAsma.onclick = function(){
      var open = searchWrap.classList.toggle('open');
      _gsbAsma.classList.toggle('on', open);
      if(open) setTimeout(function(){ input.focus(); }, 50);
      else { input.value = ''; searchClear.classList.remove('visible'); buildCards(''); }
    }; }

    /* count label */
    var countEl = document.createElement('div');
    countEl.className = 'asma-count';
    countEl.textContent = T('gencine.asma_count','٩٩ ناوێن خوا');
    container.appendChild(countEl);

    /* grid */
    var grid = document.createElement('div');
    grid.className = 'asma-grid';

    function buildCards(filter){
      while(grid.firstChild) grid.removeChild(grid.firstChild);
      var list = filter
        ? ASMA_DATA.filter(function(a){
            var q = filter.toLowerCase();
            return a.ar.includes(filter) || a.tr.toLowerCase().includes(q) || a.ku.includes(filter);
          })
        : ASMA_DATA;

      countEl.textContent = filter ? (list.length + ' / ٩٩') : T('gencine.asma_count','٩٩ ناوێن خوا');

      list.forEach(function(a){
        var card = document.createElement('div');
        card.className = 'asma-card';

        var num = document.createElement('div');
        num.className = 'asma-num';
        num.textContent = a.n;
        card.appendChild(num);

        var ar = document.createElement('div');
        ar.className = 'asma-ar';
        ar.textContent = a.ar;
        card.appendChild(ar);

        var tr = document.createElement('div');
        tr.className = 'asma-trans';
        tr.textContent = a.tr;
        card.appendChild(tr);

        var ku = document.createElement('div');
        ku.className = 'asma-ku';
        var _kuOvr=_getAsmaKuOverride(a.n); ku.textContent = _kuOvr!==null?_kuOvr:a.ku;
        card.appendChild(ku);

        var footer = document.createElement('div');
        footer.className = 'asma-card-footer';
        var copyText = a.ar + '\n' + a.tr + '\n' + a.ku;
        footer.appendChild(_mkCopyBtn(copyText));
        card.appendChild(footer);

        grid.appendChild(card);
      });
    }

    buildCards('');
    container.appendChild(grid);
  },

  /* ═══════════════════ TASBIH ACTIONS ═══════════════════ */
  _tasbihTap: function(){
    this._tasbihCount++;
    // Fire only one haptic per tap — success on completion, selection otherwise
    if(this._tasbihCount >= this._tasbihTarget){ haptic(40); }
    else { haptic(8); }
    this._saveState();
    this._updateRing();
  },

  _tasbihReset: function(){
    this._tasbihCount = 0;
    this._saveState();
    this._updateRing();
  },

  _updateRing: function(){
    var fill = $('tasbihRingFill');
    var num  = $('tasbihCountNum');
    var of   = $('tasbihCountOf');
    if(num)  num.textContent = this._tasbihCount;
    if(of)   of.textContent  = '/ ' + this._tasbihTarget;
    if(fill){
      var pct = Math.min(this._tasbihCount / Math.max(this._tasbihTarget, 1), 1);
      fill.setAttribute('stroke-dashoffset', RING_CIRC * (1 - pct));
    }
  },
  /* =========== VOICE TASBIH =========== */
  _toggleVoice: function(){
    if(this._voiceActive){ this._stopVoice(); } else { this._startVoice(); }
  },

  _normalizeAr: function(s){
    return s
      .replace(/[\u064B-\u065F\u0670\u0671\u0651\u0652]/g,'')
      .replace(/[آأإٱٲٳ]/g,'ا')
      .replace(/ة/g,'ه').replace(/ى/g,'ي')
      .replace(/ؤ/g,'و').replace(/ئ/g,'ي').replace(/ء/g,'')
      .trim().replace(/\s+/g,' ');
  },

  _countMatches: function(transcript){
    var self = this;
    var t = self._normalizeAr(transcript);
    var tNoSpace = t.replace(/\s/g,'');
    var list = _getTasbih();
    var dhikr = list[self._tasbihDhikrIdx];
    if(!dhikr) return 0;
    function countIn(h,n){ if(!n)return 0; var x=0,p=0; while((p=h.indexOf(n,p))!==-1){x++;p+=n.length;} return x; }
    var COMMON = {'الله':1,'اله':1,'لا':1,'في':1,'من':1,'على':1,'و':1,'ب':1,'ل':1};
    var best = 0;
    /* Pre-check: for long dhikrs (≥4 words), require a non-common word from the
       second half of the phrase — prevents counting when user hasn't finished yet */
    var arNorm = self._normalizeAr(dhikr.ar || dhikr.ku || '');
    var arAllWords = arNorm.split(' ').filter(function(w){ return w.length > 1; });
    if(arAllWords.length >= 4){
      var secondHalf = arAllWords.slice(Math.floor(arAllWords.length / 2));
      var endWord = null;
      for(var si = 0; si < secondHalf.length; si++){
        if(!COMMON[secondHalf[si]]){ endWord = secondHalf[si]; break; }
      }
      if(endWord && !t.includes(endWord)) return 0;
    }
    /* S0: hardcoded key — single most distinctive word, bypasses generic filtering */
    if(dhikr.key){
      var c0 = countIn(t, dhikr.key);
      if(c0 > best) best = c0;
    }
    var sources = [self._normalizeAr(dhikr.ku), self._normalizeAr(dhikr.ar)];
    for(var k=0;k<sources.length;k++){
      var tgt=sources[k]; if(!tgt) continue;
      /* S1: full phrase */
      var c1=countIn(t,tgt); if(c1>best)best=c1;
      /* S2: no-space (handles merged transcripts) */
      var c2=countIn(tNoSpace,tgt.replace(/\s/g,'')); if(c2>best)best=c2;
      var words=tgt.split(' ');
      var kws=words.filter(function(w){return w.length>=3&&!COMMON[w];});
      if(!kws.length)kws=words.filter(function(w){return w.length>=2&&!COMMON[w];});
      if(!kws.length)kws=words.filter(function(w){return w.length>=2;});
      if(!kws.length)kws=words;
      /* S3: min-count across ALL keywords = complete repetitions only */
      if(kws.length>=2){
        var minC=Infinity;
        for(var wi=0;wi<kws.length;wi++){ var wc=countIn(t,kws[wi]); if(wc<minC)minC=wc; }
        if(minC>0&&minC<Infinity&&minC>best)best=minC;
      }
      /* S4: longest single keyword — only for single-keyword dhikrs (multi-keyword handled by S3) */
      kws.sort(function(a,b){return b.length-a.length;});
      if(kws.length===1){ var c3=countIn(t,kws[0]); if(c3>best)best=c3; }
      /* S5: majority of keywords present = at least 1 (≥70% required — prevents partial-speech counting) */
      if(!best){
        var hitCount=0;
        for(var w=0;w<kws.length;w++){if(t.includes(kws[w]))hitCount++;}
        if(hitCount>0&&hitCount>=Math.ceil(kws.length*0.7))best=1;
      }
    }
    return best;
  },

  _startVoice: function(){
    var self = this;
    var T = function(k,d){ var v=window.t?window.t(k):undefined; return (!v||v===k)?(d||k):v; };
    var SRClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SRClass){
      self._setVoiceStatus(T('gencine.voice_unavailable','دانگ li vê cihazê pêşkeftî nîne'));
      return;
    }

    /* stop any existing instance first */
    if(self._recognition){
      try{ self._recognition.abort(); }catch(e){}
      self._recognition = null;
    }

    /* set active + show pending state immediately so button feels responsive */
    self._voiceActive    = true;
    self._voiceLastMatch = 0;
    self._updateVoiceBtn();
    self._setVoiceStatus(T('gencine.voice_requesting','داخوازییا مۆڵەتێ دهێتەکرن...'));

    /* Step 1: Request RECORD_AUDIO at native level (Android only).
       Capacitor's WebView only grants audio to getUserMedia if the
       native runtime permission is already approved. */
    var AudioPerm = window.Capacitor &&
                    window.Capacitor.Plugins &&
                    window.Capacitor.Plugins.AudioPermission;

    var nativePermPromise = AudioPerm
      ? AudioPerm.requestMicPermission()
      : Promise.resolve({granted: true}); /* iOS / web — no native step needed */

    nativePermPromise.then(function(res){
      if(!self._voiceActive) return;
      if(res && res.granted === false){
        self._stopVoice();
        self._setVoiceStatus(T('gencine.voice_permission','مۆڵەتدان ب مایکرۆفۆنی.'));
        return;
      }
      /* Native permission confirmed — launch recognizer directly.
         Skip getUserMedia: Capacitor WebView onPermissionRequest handles
         AUDIO_CAPTURE automatically once the native RECORD_AUDIO is granted. */
      self._launchRecognition(SRClass, T);
    }).catch(function(){
      if(self._voiceActive) self._launchRecognition(SRClass, T);
    });
  },

  _launchRecognition: function(SRClass, T){
    var self = this;
    T = T || window.t || function(k,d){ return d||k; };

    var rec = new SRClass();
    rec.continuous      = true;
    rec.interimResults  = true;
    rec.lang            = 'ar-SA';
    rec.maxAlternatives = 3;
    self._recognition   = rec;
    self._setVoiceStatus(T('gencine.voice_listening','...دابیستم'));

    rec.onresult = function(event){
      var interim = '', final_ = '';
      for(var i = event.resultIndex; i < event.results.length; i++){
        var res = event.results[i];
        for(var a = 0; a < res.length; a++){
          if(res.isFinal) final_ += res[a].transcript + ' ';
          else            interim += res[a].transcript + ' ';
        }
      }
      /* show live feedback */
      var live = (interim || final_).trim();
      if(live){
        var tEl = document.getElementById('tasbihVoiceTranscript');
        if(tEl){ tEl.textContent = live; tEl.classList.add('visible'); }
      }
      /* count only from final results with debounce */
      if(final_.trim()){
        var now = Date.now();
        if(now - self._voiceLastMatch >= self._voiceDebounceMs){
          var best = 0; var bestText = '';
          var lastRes = event.results[event.results.length - 1];
          for(var ai = 0; ai < lastRes.length; ai++){
            var n = self._countMatches(lastRes[ai].transcript);
            if(n > best){ best = n; bestText = lastRes[ai].transcript; }
          }
          if(!best){ best = self._countMatches(final_); bestText = final_; }
          if(best > 0){
            self._voiceLastMatch = now;
            self._showTranscript(bestText, best);
            for(var j = 0; j < best; j++) self._tasbihTap();
          }
        }
      }
    };

    rec.onerror = function(event){
      if(event.error === 'not-allowed' || event.error === 'permission-denied'){
        self._stopVoice();
        var T2 = window.t || function(k,d){ return d||k; };
        self._setVoiceStatus(T2('gencine.voice_permission','مۆڵەتدان ب مایکرۆفۆنی.'));
      }
      /* no-speech, aborted, network — onend handles restart */
    };

    rec.onend = function(){
      if(!self._voiceActive || self._recognition !== rec) return;
      /* small delay to avoid tight restart loop on rapid errors */
      setTimeout(function(){
        if(!self._voiceActive || self._recognition !== rec) return;
        try{ rec.start(); }catch(e){}
      }, 300);
    };

    try{
      rec.start();
    }catch(e){
      self._stopVoice();
      self._setVoiceStatus(T('gencine.voice_error','هەلەیەک çêbû'));
    }
  },

  _stopVoice: function(){
    var self = this;
    var T = function(k,d){ var v=window.t?window.t(k):undefined; return (!v||v===k)?(d||k):v; };
    self._voiceActive = false;
    if(self._recognition){
      try{ self._recognition.abort(); }catch(e){}
      self._recognition = null;
    }
    self._showTranscript('', 0);
    self._updateVoiceBtn();
    self._setVoiceStatus(T('gencine.voice_hint','تاپ بکە و دکرێکێ بên'));
  },

  _setVoiceStatus: function(text){
    var el = document.getElementById('tasbihVoiceStatus');
    if(el) el.textContent = text;
  },

  _showTranscript: function(text, count){
    var self = this;
    var el = document.getElementById('tasbihVoiceTranscript');
    if(!el) return;
    if(!text){ el.textContent=''; el.classList.remove('visible'); return; }
    el.textContent = text + (count>1 ? ' ×'+count : '');
    el.classList.add('visible');
    clearTimeout(self._transcriptTimer);
    self._transcriptTimer = setTimeout(function(){
      el.classList.remove('visible');
    }, 2500);
  },

  /* Storage manager — shows downloaded books + delete option */
  _showDlManager: function() {
    var self = this;
    var T = function(k,d){ var v=window.t?window.t(k):undefined; return (!v||v===k)?(d||k):v; };
    var existing = document.getElementById('pdfDlManagerOverlay');
    if (existing) { existing.remove(); return; }

    var overlay = document.createElement('div'); overlay.id = 'pdfDlManagerOverlay'; overlay.className = 'book-overlay open';
    var panel = document.createElement('div'); panel.className = 'book-overlay-panel';
    var pill = document.createElement('div'); pill.className = 'book-overlay-pill'; panel.appendChild(pill);
    var hdr = document.createElement('div'); hdr.className = 'book-overlay-hdr';
    var titleEl = document.createElement('span'); titleEl.textContent = T('dl.manage','بەرپرسایەتیکردنی داونلۆدەکان');
    var closeBtn = document.createElement('button'); closeBtn.className = 'book-hdr-btn';
    var cIco = document.createElement('i'); cIco.className = 'fas fa-times'; closeBtn.appendChild(cIco);
    closeBtn.onclick = function() { overlay.remove(); };
    hdr.appendChild(closeBtn); hdr.appendChild(titleEl); panel.appendChild(hdr);
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

    var list = document.createElement('div'); list.className = 'book-overlay-list';
    list.style.padding = '12px 16px';

    var loadingRow = document.createElement('div'); loadingRow.textContent = T('gencine.books_loading','بارکرن...');
    loadingRow.style.cssText = 'color:var(--text-secondary);padding:24px;text-align:center';
    list.appendChild(loadingRow);
    panel.appendChild(list);
    overlay.appendChild(panel);
    document.getElementById('panelGencine').appendChild(overlay);

    PdfStore.listAll().then(function(cached) {
      list.removeChild(loadingRow);

      if (!cached.length) {
        var emptyEl = document.createElement('div');
        emptyEl.textContent = T('dl.no_reciters','هیچ پەرتوکێک نەهاتیە داونلۆد کرن');
        emptyEl.style.cssText = 'color:var(--text-secondary);padding:24px;text-align:center';
        list.appendChild(emptyEl);
        return;
      }

      // Calculate total size
      var totalBytes = cached.reduce(function(s, c) { return s + c.bytes; }, 0);
      var storageRow = document.createElement('div');
      storageRow.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 4px 16px;border-bottom:1px solid var(--border);margin-bottom:12px;color:var(--text-secondary);font-size:13px';
      var sIco = document.createElement('i'); sIco.className = 'fas fa-hdd'; sIco.style.color = 'var(--accent)';
      storageRow.appendChild(sIco);
      storageRow.appendChild(document.createTextNode(T('dl.storage_used','جێی بەکارهاتوو') + ': ' + PdfStore.fmtSize(totalBytes)));
      list.appendChild(storageRow);

      // Match cached entries to book records
      cached.forEach(function(entry) {
        var book = null;
        for (var i = 0; i < _dbBooks.length; i++) {
          if (_dbBooks[i].pdf_url && _dbBooks[i].pdf_url === entry.pdfUrl) { book = _dbBooks[i]; break; }
        }
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:12px;padding:10px 4px;border-bottom:1px solid var(--border-subtle,rgba(255,255,255,.06))';

        // Cover thumb
        var thumb = document.createElement('div');
        thumb.style.cssText = 'width:36px;height:50px;border-radius:4px;overflow:hidden;flex-shrink:0;background:var(--surface2)';
        if (book && book.cover_url) {
          var tImg = document.createElement('img'); tImg.src = book.cover_url; tImg.style.cssText = 'width:100%;height:100%;object-fit:cover';
          thumb.appendChild(tImg);
        } else {
          var tIco = document.createElement('i'); tIco.className = 'fas fa-book'; tIco.style.cssText = 'margin:14px auto;display:block;text-align:center;color:var(--text-tertiary)';
          thumb.appendChild(tIco);
        }
        row.appendChild(thumb);

        // Title + size
        var info = document.createElement('div'); info.style.cssText = 'flex:1;min-width:0';
        var tnEl = document.createElement('div'); tnEl.style.cssText = 'font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;direction:rtl';
        tnEl.textContent = book ? (book.title_ku || book.title_ar || '—') : entry.pdfUrl.split('/').pop();
        var szEl = document.createElement('div'); szEl.style.cssText = 'font-size:12px;color:var(--text-secondary);margin-top:2px';
        szEl.textContent = PdfStore.fmtSize(entry.bytes);
        info.appendChild(tnEl); info.appendChild(szEl);
        row.appendChild(info);

        // Delete button
        var delBtn = document.createElement('button'); delBtn.className = 'book-hdr-btn';
        delBtn.style.cssText = 'color:var(--danger,#e55);flex-shrink:0';
        var dIco = document.createElement('i'); dIco.className = 'fas fa-trash-alt'; delBtn.appendChild(dIco);
        delBtn.onclick = function() {
          var bk = book || { pdf_url: entry.pdfUrl };
          PdfStore.remove(bk).then(function() {
            row.remove();
            self._refreshBookDlBadges();
            // Update storage total
            var remaining = list.querySelectorAll('[data-dl-row]');
            if (!remaining.length) { overlay.remove(); self._showDlManager(); } // re-open to show empty state
          });
        };
        delBtn.setAttribute('data-dl-row','1');
        row.setAttribute('data-dl-row','1');
        row.appendChild(delBtn);
        list.appendChild(row);
      });
    });
  },

  /* Refresh download badges after a PDF is cached */
  _refreshBookDlBadges: function() {
    if (!window.PdfStore) return;
    var badges = document.querySelectorAll('.book-dl-badge');
    var self = this;
    badges.forEach(function(badge) {
      var bookId = badge.getAttribute('data-book-id');
      var book = null;
      for (var i = 0; i < _dbBooks.length; i++) { if (String(_dbBooks[i].id) === bookId) { book = _dbBooks[i]; break; } }
      if (!book || !book.pdf_url) return;
      PdfStore.has(book).then(function(cached) {
        badge.classList.toggle('cached', cached);
        var ico = badge.querySelector('i');
        if (ico) ico.className = cached ? 'fas fa-check' : 'fas fa-arrow-down';
      });
    });
  },

  /* =========== BOOKS =========== */
  _renderBooks: function(container){
    var self = this;
    var T = function(k,d){ var v=window.t?window.t(k):undefined; return (!v||v===k)?(d||k):v; };

    var books = _dbBooks.filter(function(b){ return b.active !== false; });


    /* ── Show header buttons in the panel hdr ── */
    var sheikhBtn = document.getElementById('bookSheikhBtn');
    var savedBtn  = document.getElementById('bookSavedBtn');
    var readBtn   = document.getElementById('bookReadBtn');
    var dlBtn     = document.getElementById('bookDlBtn');
    var searchTogBtn = document.getElementById('bookSearchBtn');
    var hdrBtnsWrap = document.getElementById('booksHdrBtns');
    if (hdrBtnsWrap) hdrBtnsWrap.style.display = 'flex';
    if (sheikhBtn) sheikhBtn.classList.toggle('on', !!self._bookAuthor);
    if (savedBtn)  savedBtn.classList.toggle('on', self._bookCat === 'saved');
    if (readBtn)   readBtn.classList.toggle('on', self._bookCat === 'reading');
    if (dlBtn && window.PdfStore) {
      dlBtn.style.display = '';
      // Prefer the unified app-level manager (accessible from Settings too);
      // fall back to the inline manager if app.js hasn't loaded it yet.
      dlBtn.onclick = function(e) {
        e.stopPropagation();
        if (window.App && App.openDlManager) App.openDlManager();
        else self._showDlManager();
      };
    } else if (dlBtn) { dlBtn.style.display = 'none'; }

    /* ── Collapsible search bar ── */
    var searchBar = document.createElement('div');
    searchBar.className = 'book-search-bar' + (self._bookSearch ? ' open' : '');
    var searchWrapInner = document.createElement('div'); searchWrapInner.className = 'book-search-wrap-inner';
    var searchIcoEl = document.createElement('i'); searchIcoEl.className = 'fas fa-search book-search-ico';
    var searchInp = document.createElement('input');
    searchInp.type = 'text'; searchInp.className = 'book-search-inp';
    searchInp.placeholder = T('gencine.search_books','گەڕان...');
    searchInp.value = self._bookSearch || '';
    var searchClear = document.createElement('button'); searchClear.className = 'book-search-clear' + (self._bookSearch ? ' visible' : '');
    var scx = document.createElement('i'); scx.className = 'fas fa-times'; searchClear.appendChild(scx);
    searchInp.oninput = function(){
      self._bookSearch = searchInp.value;
      searchClear.classList.toggle('visible', !!searchInp.value);
      renderGrid();
    };
    searchClear.onclick = function(){ self._bookSearch = ''; searchInp.value = ''; searchClear.classList.remove('visible'); renderGrid(); searchInp.focus(); };
    searchWrapInner.appendChild(searchIcoEl); searchWrapInner.appendChild(searchInp); searchWrapInner.appendChild(searchClear);
    searchBar.appendChild(searchWrapInner);
    container.appendChild(searchBar);

    /* ── Sheikh filter overlay ── */
    var sheikhOverlay = document.createElement('div'); sheikhOverlay.className = 'book-overlay';
    var sheikhPanel = document.createElement('div'); sheikhPanel.className = 'book-overlay-panel';
    /* Pill handle */
    var pill = document.createElement('div'); pill.className = 'book-overlay-pill'; sheikhPanel.appendChild(pill);
    var sheikhHdr = document.createElement('div'); sheikhHdr.className = 'book-overlay-hdr';
    var sheikhTitle = document.createElement('span'); sheikhTitle.textContent = T('gencine.sheikh_filter','ماموستا');
    var sheikhClose = document.createElement('button'); sheikhClose.className = 'book-hdr-btn';
    var scIco = document.createElement('i'); scIco.className = 'fas fa-times'; sheikhClose.appendChild(scIco);
    sheikhClose.onclick = function(){ sheikhOverlay.classList.remove('open'); };
    sheikhHdr.appendChild(sheikhClose); sheikhHdr.appendChild(sheikhTitle);
    sheikhPanel.appendChild(sheikhHdr);

    /* Build author → book count map */
    var authorCount = {};
    books.forEach(function(b){ var a = b.author_ku || b.author_ar; if(a){ authorCount[a] = (authorCount[a]||0)+1; } });
    var authors = Object.keys(authorCount);

    var sheikhList = document.createElement('div'); sheikhList.className = 'book-overlay-list';
    var allAuthorCards = []; /* keep refs to update .on state */

    function updateCardStates() {
      allAuthorCards.forEach(function(c){
        var isAll = c._isAll;
        c.classList.toggle('on', isAll ? !self._bookAuthor : self._bookAuthor === c._authorName);
      });
    }

    function makeAuthorCard(name, count, isAll) {
      var card = document.createElement('button');
      card._isAll = isAll; card._authorName = name;
      card.className = 'book-author-card' + ((isAll ? !self._bookAuthor : self._bookAuthor === name) ? ' on' : '');
      var avatar = document.createElement('div'); avatar.className = 'book-author-avatar';
      var avIco = document.createElement('i'); avIco.className = isAll ? 'fas fa-layer-group' : 'fas fa-user-tie';
      avatar.appendChild(avIco); card.appendChild(avatar);
      var nameEl = document.createElement('span'); nameEl.className = 'book-author-name';
      nameEl.textContent = name; nameEl.dir = 'rtl'; card.appendChild(nameEl);
      var countEl = document.createElement('span'); countEl.className = 'book-author-count';
      countEl.textContent = count + ' ' + T('gencine.books_unit','پەرتوک'); card.appendChild(countEl);
      card.onclick = function(){
        if (isAll) { self._bookAuthor = ''; if(sheikhBtn)sheikhBtn.classList.remove('on'); }
        else        { self._bookAuthor = name; if(sheikhBtn)sheikhBtn.classList.add('on'); }
        updateCardStates();
        sheikhOverlay.classList.remove('open'); renderGrid();
      };
      allAuthorCards.push(card);
      return card;
    }

    sheikhList.appendChild(makeAuthorCard(T('gencine.cat_all','هەمێ'), books.length, true));
    authors.forEach(function(name){ sheikhList.appendChild(makeAuthorCard(name, authorCount[name], false)); });


    sheikhPanel.appendChild(sheikhList);
    sheikhOverlay.appendChild(sheikhPanel);
    sheikhOverlay.onclick = function(e){ if(e.target===sheikhOverlay) sheikhOverlay.classList.remove('open'); };
    container.appendChild(sheikhOverlay);

    /* ── Wire header buttons ── */
    if (sheikhBtn) sheikhBtn.onclick = function(){ updateCardStates(); sheikhOverlay.classList.add('open'); };
    if (savedBtn) savedBtn.onclick = function(){
      self._bookCat = self._bookCat === 'saved' ? 'all' : 'saved';
      savedBtn.classList.toggle('on', self._bookCat === 'saved');
      if (readBtn) readBtn.classList.remove('on');
      renderGrid();
    };
    if (readBtn) readBtn.onclick = function(){
      self._bookCat = self._bookCat === 'reading' ? 'all' : 'reading';
      readBtn.classList.toggle('on', self._bookCat === 'reading');
      if (savedBtn) savedBtn.classList.remove('on');
      renderGrid();
    };
    if (searchTogBtn) searchTogBtn.onclick = function(){
      var isOpen = searchBar.classList.toggle('open');
      searchTogBtn.classList.toggle('on', isOpen);
      if (isOpen) { setTimeout(function(){ searchInp.focus(); }, 50); }
      else { self._bookSearch = ''; searchInp.value = ''; renderGrid(); }
    };

    /* ── Category filter chips ── */
    var catMap = {};
    books.forEach(function(b){
      if (!b.category) return;
      if (catMap[b.category] === undefined || b.sort_order < catMap[b.category]) catMap[b.category] = b.sort_order;
    });
    var cats = ['all'].concat(Object.keys(catMap).sort(function(a,b){ return catMap[a] - catMap[b]; }));
    var catRow;
    if (cats.length > 1) {
      catRow = document.createElement('div'); catRow.className = 'book-cat-row';
      catRow.style.display = (self._bookCat === 'reading' || self._bookCat === 'saved') ? 'none' : '';
      cats.forEach(function(cat){
        var btn = document.createElement('button');
        btn.className = 'book-cat-btn' + (cat === self._bookCat ? ' on' : '');
        btn.textContent = cat === 'all' ? T('gencine.cat_all','هەمێ') : cat;
        btn.onclick = function(){ self._bookCat = cat; catRow.querySelectorAll('.book-cat-btn').forEach(function(b){ b.classList.toggle('on', b === btn); }); renderGrid(); };
        catRow.appendChild(btn);
      });
      container.appendChild(catRow);
    }

    /* ── Featured section (rendered inside renderGrid) ── */
    var featuredSection = document.createElement('div'); featuredSection.className = 'book-featured-section'; featuredSection.style.display = 'none';
    /* ── Grid + empty state ── */
    var statsBar = document.createElement('div'); statsBar.className = 'book-stats-bar'; statsBar.style.display = 'none';
    var grid = document.createElement('div'); grid.className = 'book-grid';
    var emptyState = document.createElement('div'); emptyState.className = 'genc-coming'; emptyState.style.display = 'none';
    var ei = document.createElement('i'); ei.className = 'fas fa-book-open genc-coming-icon';
    var et = document.createElement('div'); et.className = 'genc-coming-title';
    emptyState.appendChild(ei); emptyState.appendChild(et);
    container.appendChild(featuredSection);
    container.appendChild(statsBar);
    container.appendChild(grid);
    container.appendChild(emptyState);

    function renderGrid() {
      container.querySelectorAll('.book-cat-row').forEach(function(cr){ cr.style.display = (self._bookCat === 'reading' || self._bookCat === 'saved') ? 'none' : ''; });
      while (grid.firstChild) grid.removeChild(grid.firstChild);
      while (featuredSection.firstChild) featuredSection.removeChild(featuredSection.firstChild);
      emptyState.style.display = 'none';
      /* ── Featured books at top (all-view, no filters) ── */
      var _fnow = Date.now();
      var _featBooks = (_dbBooks || []).filter(function(b){ return b.active !== false && b.featured_until && new Date(b.featured_until).getTime() > _fnow; });
      if (_featBooks.length && self._bookCat === 'all' && !self._bookSearch && !self._bookAuthor) {
        featuredSection.style.display = '';
        var _flbl = document.createElement('div'); _flbl.className = 'book-featured-lbl';
        var _flbIco = document.createElement('i'); _flbIco.className = 'fas fa-star'; _flbl.appendChild(_flbIco);
        _flbl.appendChild(document.createTextNode(' ' + T('gencine.featured','تایبەتمەندکری')));
        featuredSection.appendChild(_flbl);
        function _makeFeatClick(fb) {
          return function(){
            var panel = document.getElementById('panelGencine');
            self._booksScrollPos = panel ? panel.scrollTop : 0;
            _addToReadingHistory(fb.id);
            if (!_bookGetProgress(String(fb.id))) { try { localStorage.setItem('pdfProg_'+fb.id, JSON.stringify({page:1,total:fb.pages||0,ts:Date.now()})); } catch(e3) {} }
            self._currentBook = fb; self._pdfDoc = null; self._pdfPage = 1; self._view = 'book-reader'; self._draw();
          };
        }
        function _buildFeatCard(fb, extraClass) {
          var _fc = document.createElement('div'); _fc.className = 'book-feat-card' + (extraClass ? ' '+extraClass : '');
          /* Layer 1: blurred cover as background */
          var _fbg = document.createElement('div'); _fbg.className = 'book-feat-card-bg';
          if (fb.cover_url) _fbg.style.backgroundImage = 'url('+fb.cover_url+')';
          _fc.appendChild(_fbg);
          /* Layer 2: dark gradient overlay */
          var _fov = document.createElement('div'); _fov.className = 'book-feat-card-overlay'; _fc.appendChild(_fov);
          /* Layer 3: sharp thumbnail (floats top-right in RTL) */
          var _fth = document.createElement('div'); _fth.className = 'book-feat-card-thumb';
          if (fb.cover_url) {
            var _fti = document.createElement('img'); _fti.className = 'book-feat-card-cover'; _fti.alt = fb.title_ku||'';
            _fti.onload = function(){ _fti.classList.add('loaded'); }; _fti.src = fb.cover_url; _fth.appendChild(_fti);
          } else { var _ftph = document.createElement('div'); _ftph.className = 'book-feat-card-ph'; var _ftphi = document.createElement('i'); _ftphi.className = 'fas fa-book'; _ftph.appendChild(_ftphi); _fth.appendChild(_ftph); }
          _fc.appendChild(_fth);
          /* Text overlay (bottom-left in RTL) */
          var _finfo = document.createElement('div'); _finfo.className = 'book-feat-card-info';
          var _ft = document.createElement('div'); _ft.className = 'book-feat-card-title'; _ft.textContent = fb.title_ku||fb.title_ar||''; _finfo.appendChild(_ft);
          if (fb.author_ku||fb.author_ar){ var _fau = document.createElement('div'); _fau.className = 'book-feat-card-author'; _fau.textContent = fb.author_ku||fb.author_ar; _finfo.appendChild(_fau); }
          var _fmeta = document.createElement('div'); _fmeta.className = 'book-feat-card-meta';
          if (fb.pages){ var _fpg = document.createElement('div'); _fpg.className = 'book-feat-card-pages'; _fpg.textContent = fb.pages + ' ' + T('gencine.pages_unit','ڕۆپەل'); _fmeta.appendChild(_fpg); }
          if (fb.badge_until && new Date(fb.badge_until).getTime() > Date.now()){ var _fbdg = document.createElement('div'); _fbdg.className = 'book-feat-card-badge'; _fbdg.textContent = (window.t&&window.t('iv.new_badge'))||'نوی'; _fmeta.appendChild(_fbdg); }
          _finfo.appendChild(_fmeta);
          _fc.appendChild(_finfo);
          _fc.onclick = _makeFeatClick(fb);
          return _fc;
        }
        if (_featBooks.length === 1) {
          featuredSection.appendChild(_buildFeatCard(_featBooks[0]));
        } else {
          var _caro = document.createElement('div'); _caro.className = 'book-feat-carousel';
          var _track = document.createElement('div'); _track.className = 'book-feat-track';
          _featBooks.forEach(function(_fb){
            _track.appendChild(_buildFeatCard(_fb, 'book-feat-slide'));
          });
          _caro.appendChild(_track);
          var _dotWrap = document.createElement('div'); _dotWrap.className = 'book-feat-dots';
          var _dotEls = _featBooks.map(function(_,i){
            var _d = document.createElement('div'); _d.className = 'book-feat-dot'+(i===0?' active':''); _dotWrap.appendChild(_d); return _d;
          });
          _caro.appendChild(_dotWrap);
          featuredSection.appendChild(_caro);
          (function(){
            var _cur=0, _n=_featBooks.length, _tmr=null, _tx0=0;
            var _w = _caro.getBoundingClientRect().width || _caro.offsetWidth || 300;
            [].slice.call(_track.children).forEach(function(sl){ sl.style.width=_w+'px'; sl.style.minWidth=_w+'px'; });
            function _goTo(i){
              _cur=(i+_n)%_n;
              _track.style.transform='translateX('+(_cur*_w)+'px)';
              _dotEls.forEach(function(d,j){ d.classList.toggle('active',j===_cur); });
            }
            function _arm(){ _tmr=setTimeout(function(){ _goTo(_cur+1); _arm(); },3500); }
            function _rearm(){ clearTimeout(_tmr); _arm(); }
            _caro.addEventListener('touchstart',function(e){ _tx0=e.touches[0].clientX; clearTimeout(_tmr); },{passive:true});
            _caro.addEventListener('touchend',function(e){ var dx=e.changedTouches[0].clientX-_tx0; if(Math.abs(dx)>40) _goTo(_cur+(dx<0?1:-1)); _rearm(); },{passive:true});
            _caro.addEventListener('mouseenter',function(){ clearTimeout(_tmr); });
            _caro.addEventListener('mouseleave',_rearm);
            _arm();
          })();
        }
      } else { featuredSection.style.display = 'none'; }
      var _history = _getReadingHistory(); // read once per render
      // Stats bar
      var _rCount=0, _pCount=0;
      books.forEach(function(b){ var _p=_bookGetProgress(b.id); if(_p||_history[String(b.id)]){_rCount++; if(_p&&_p.page)_pCount+=_p.page;} });
      if (_rCount > 0 && self._bookCat === 'reading') {
        while(statsBar.firstChild) statsBar.removeChild(statsBar.firstChild);
        var _lastTs=0; books.forEach(function(b){ var _p=_bookGetProgress(b.id); if(_p&&_p.ts>_lastTs)_lastTs=_p.ts; });
        function _mkStatItem(icoClass, val, lbl) {
          var item=document.createElement('div'); item.className='book-stats-item';
          var ico=document.createElement('i'); ico.className=icoClass+' book-stats-ico'; item.appendChild(ico);
          var v=document.createElement('div'); v.className='book-stats-val'; v.textContent=val; item.appendChild(v);
          var l=document.createElement('div'); l.className='book-stats-lbl'; l.textContent=lbl; item.appendChild(l);
          return item;
        }
        statsBar.appendChild(_mkStatItem('fas fa-book-open', _rCount, T('gencine.books_read','پەرتوک')));
        var sep1=document.createElement('div'); sep1.className='book-stats-sep'; statsBar.appendChild(sep1);
        statsBar.appendChild(_mkStatItem('fas fa-file-alt', _pCount, T('gencine.pages_unit','ڕۆپەل')));
        var sep2=document.createElement('div'); sep2.className='book-stats-sep'; statsBar.appendChild(sep2);
        var lastLbl=_lastTs ? _timeAgo(_lastTs) : '—';
        statsBar.appendChild(_mkStatItem('fas fa-clock', lastLbl, T('gencine.last_read','دوا جار')));
        statsBar.style.display='flex';
      } else { statsBar.style.display='none'; }
      var q = (self._bookSearch || '').trim().toLowerCase();
      var pool = self._bookCat === 'saved'
        ? books.filter(function(b){ return _bookIsSaved(b.id); })
        : self._bookCat === 'reading'
        ? books.filter(function(b){ return !!_history[String(b.id)] || !!_bookGetProgress(b.id); })
        : self._bookCat === 'all' ? books
        : books.filter(function(b){ return b.category === self._bookCat; });
      if (self._bookAuthor) pool = pool.filter(function(b){ return (b.author_ku||b.author_ar) === self._bookAuthor; });
      /* Smart search: every word in query must appear somewhere in the book */
      var filtered = q ? (function(){
        var words = q.split(/\s+/).filter(Boolean);
        return pool.filter(function(b){
          var haystack = [b.title_ku, b.title_ar, b.author_ku, b.author_ar, b.category]
            .map(function(s){ return (s||'').toLowerCase(); }).join(' ');
          return words.every(function(w){ return haystack.indexOf(w) !== -1; });
        });
      })() : pool;

      // ── Group books into series ───────────────────────────────────────────────
      var _seriesMap = {}, _renderItems = [];
      filtered.forEach(function(b) {
        if (b.series_id) {
          if (!_seriesMap[b.series_id]) {
            _seriesMap[b.series_id] = { _isSeries:true, series_id:b.series_id, series_title_ku:b.series_title_ku||b.title_ku, author_ku:b.author_ku, author_ar:b.author_ar, cover_url:b.cover_url, volumes:[] };
            _renderItems.push(_seriesMap[b.series_id]);
          }
          _seriesMap[b.series_id].volumes.push(b);
        } else { _renderItems.push(b); }
      });
      _renderItems.forEach(function(item) {
        if (!item._isSeries) return;
        item.volumes.sort(function(a,b){ return (a.volume_number||0)-(b.volume_number||0); });
        if (!item.cover_url && item.volumes.length) item.cover_url = item.volumes[0].cover_url;
      });

      if (!_renderItems.length) {
        et.textContent = T('gencine.books_empty','پەرتوکەکە نیە');
        emptyState.style.display = 'flex'; return;
      }

      function _openBookReader(vol) {
        var panel = document.getElementById('panelGencine');
        self._booksScrollPos = panel ? panel.scrollTop : 0;
        _addToReadingHistory(vol.id);
        if (!_bookGetProgress(String(vol.id))) {
          try { localStorage.setItem('pdfProg_'+vol.id, JSON.stringify({page:1,total:vol.pages||0,ts:Date.now()})); } catch(e3) {}
        }
        self._currentBook = vol; self._pdfDoc = null; self._pdfPage = 1;
        self._view = 'book-reader'; self._draw();
      }

      function _downloadAllSeries(volumes, btn) {
        var toGet = volumes.filter(function(v){ return v.pdf_url; });
        if (!toGet.length || !window.PdfStore) return;
        btn.disabled = true;
        var i = 0;
        function _next() {
          if (i >= toGet.length) { btn.disabled = false; var ic = btn.querySelector('i'); if(ic) ic.className='fas fa-check'; return; }
          var vol = toGet[i++];
          PdfStore.has(vol).then(function(cached){ if(cached){_next();return;} PdfStore.download(vol,null).then(_next).catch(_next); }).catch(_next);
        }
        _next();
      }

      function _buildSeriesCard(sg) {
        var expanded = !!(self._expandedSeries && self._expandedSeries[sg.series_id]);
        var lastRead = _seriesGetLastRead(sg.volumes);
        var readCount = _seriesGetReadCount(sg.volumes);
        var outer = document.createElement('div'); outer.className = 'book-series-card'; outer.style.gridColumn = '1 / -1';
        var row = document.createElement('div'); row.className = 'book-series-row';
        var cw = document.createElement('div'); cw.className = 'book-cover-wrap book-series-cover-wrap';
        if (sg.cover_url) {
          var img = document.createElement('img'); img.className = 'book-cover'; img.alt = sg.series_title_ku||'';
          img.onload = function(){ img.classList.add('loaded'); }; img.src = sg.cover_url;
          if (img.complete) img.classList.add('loaded'); cw.appendChild(img);
        } else { var ph = document.createElement('div'); ph.className='book-cover-placeholder'; var phi=document.createElement('i'); phi.className='fas fa-book'; ph.appendChild(phi); cw.appendChild(ph); }
        var vcBadge = document.createElement('div'); vcBadge.className='book-series-vol-count-badge'; vcBadge.textContent=sg.volumes.length+' '+T('gencine.series_vols','بەرگ'); cw.appendChild(vcBadge);
        if (sg.volumes.some(function(v){ return v.badge_until && new Date(v.badge_until).getTime() > Date.now(); })) {
          var snb = document.createElement('div'); snb.className = 'book-cover-new-badge'; snb.textContent = (window.t&&window.t('iv.new_badge'))||'نوی'; cw.appendChild(snb);
        }
        row.appendChild(cw);
        var info = document.createElement('div'); info.className = 'book-series-info';
        var titleEl = document.createElement('div'); titleEl.className='book-series-title'; titleEl.textContent=sg.series_title_ku||''; info.appendChild(titleEl);
        if (sg.author_ku||sg.author_ar) { var auth=document.createElement('div'); auth.className='book-author'; auth.textContent=sg.author_ku||sg.author_ar; info.appendChild(auth); }
        if (lastRead) {
          var lrEl=document.createElement('div'); lrEl.className='book-last-read';
          var lrIco=document.createElement('i'); lrIco.className='fas fa-bookmark'; lrEl.appendChild(lrIco);
          var vl=lastRead.vol.volume_number ? (' '+T('gencine.series_vol_lbl','بەرگ')+' '+lastRead.vol.volume_number+' ·') : '';
          lrEl.appendChild(document.createTextNode(vl+' '+T('gencine.page_lbl','ڕ')+'. '+lastRead.prog.page+' — '+_timeAgo(lastRead.prog.ts))); info.appendChild(lrEl);
        }
        if (readCount > 0) {
          var pb=document.createElement('div'); pb.className='book-series-prog-bar';
          var pf=document.createElement('div'); pf.className='book-series-prog-fill'; pf.style.width=Math.round(readCount/sg.volumes.length*100)+'%'; pb.appendChild(pf); info.appendChild(pb);
          var pl=document.createElement('div'); pl.className='book-series-prog-lbl'; pl.textContent=readCount+' / '+sg.volumes.length+' '+T('gencine.series_done','خوێندیە'); info.appendChild(pl);
        }
        var btnRow=document.createElement('div'); btnRow.className='book-series-btns';
        if (lastRead) {
          var contBtn=document.createElement('button'); contBtn.className='book-series-continue';
          var cIco=document.createElement('i'); cIco.className='fas fa-play'; contBtn.appendChild(cIco);
          contBtn.appendChild(document.createTextNode(' '+T('gencine.series_continue','بەردەوامبوون')));
          (function(lv){ contBtn.onclick=function(e){ e.stopPropagation(); _openBookReader(lv.vol); }; })(lastRead);
          btnRow.appendChild(contBtn);
        }
        var eBtn=document.createElement('button'); eBtn.className='book-series-expand';
        var eIco=document.createElement('i'); eIco.className='fas fa-'+(expanded?'chevron-up':'chevron-down'); eBtn.appendChild(eIco);
        eBtn.appendChild(document.createTextNode(' '+sg.volumes.length+' '+T('gencine.series_vols','بەرگ')));
        btnRow.appendChild(eBtn); info.appendChild(btnRow); row.appendChild(info); outer.appendChild(row);
        var vols=document.createElement('div'); vols.className='book-series-vols'+(expanded?' open':'');
        sg.volumes.forEach(function(vol) {
          var vRow=document.createElement('div'); vRow.className='book-series-vol-row';
          var vNum=document.createElement('div'); vNum.className='book-series-vol-num'; vNum.textContent=vol.volume_number||'—'; vRow.appendChild(vNum);
          var vInf=document.createElement('div'); vInf.className='book-series-vol-info';
          var vTit=document.createElement('div'); vTit.className='book-series-vol-title'; vTit.textContent=vol.title_ku||vol.title_ar||(T('gencine.series_vol_lbl','بەرگ')+' '+(vol.volume_number||'')); vInf.appendChild(vTit);
          if (vol.pages) { var vPg=document.createElement('div'); vPg.className='book-pages'; vPg.textContent=vol.pages+' '+T('gencine.pages_unit','ڕۆپەل'); vInf.appendChild(vPg); }
          vRow.appendChild(vInf);
          if (vol.badge_until && new Date(vol.badge_until).getTime() > Date.now()) {
            var vNb = document.createElement('div'); vNb.className = 'iv-new-badge'; vNb.textContent = (window.t&&window.t('iv.new_badge'))||'نوی'; vRow.appendChild(vNb);
          }
          var vProg=_bookGetProgress(vol.id);
          if (vProg&&vProg.page>0&&vProg.total>0) { var vPEl=document.createElement('div'); vPEl.className='book-series-vol-pct'; vPEl.textContent=Math.min(100,Math.round(vProg.page/vProg.total*100))+'%'; vRow.appendChild(vPEl); }
          if (window.PdfStore&&vol.pdf_url) {
            var vDl=document.createElement('div'); vDl.className='book-series-vol-dl'; var vDlIco=document.createElement('i'); vDlIco.className='fas fa-arrow-down'; vDl.appendChild(vDlIco);
            (function(bk,el,ico){ PdfStore.has(bk).then(function(c){ if(c){ el.classList.add('cached'); ico.className='fas fa-check'; } }); })(vol,vDl,vDlIco);
            vRow.appendChild(vDl);
          }
          (function(bk){ vRow.onclick=function(){ _openBookReader(bk); }; })(vol);
          vols.appendChild(vRow);
        });
        if (sg.volumes.length>1&&window.PdfStore) {
          var dlWrap=document.createElement('div'); dlWrap.className='book-series-dl-wrap';
          var dlBtn=document.createElement('button'); dlBtn.className='book-series-dl-all';
          var dlIco=document.createElement('i'); dlIco.className='fas fa-download'; dlBtn.appendChild(dlIco);
          dlBtn.appendChild(document.createTextNode(' '+T('gencine.series_dl_all','داونلۆدی هەمی')));
          (function(b){ dlBtn.onclick=function(e){ e.stopPropagation(); _downloadAllSeries(sg.volumes,b); }; })(dlBtn);
          dlWrap.appendChild(dlBtn); vols.appendChild(dlWrap);
        }
        outer.appendChild(vols);
        function _toggleExpand(e) {
          if(e) e.stopPropagation(); expanded=!expanded;
          if(!self._expandedSeries) self._expandedSeries={};
          self._expandedSeries[sg.series_id]=expanded;
          vols.classList.toggle('open',expanded); eIco.className='fas fa-'+(expanded?'chevron-up':'chevron-down');
        }
        eBtn.onclick=_toggleExpand;
        row.onclick=function(e){ if(!e.target.closest('.book-series-continue')) _toggleExpand(e); };
        return outer;
      }

      _renderItems.forEach(function(book){
        if (book._isSeries) { grid.appendChild(_buildSeriesCard(book)); return; }
        var card = document.createElement('div'); card.className = 'book-card';

        var coverWrap = document.createElement('div'); coverWrap.className = 'book-cover-wrap';
        if (book.cover_url) {
          var img = document.createElement('img');
          img.className = 'book-cover'; img.alt = book.title_ku || '';
          img.onload = function(){ img.classList.add('loaded'); };
          img.onerror = function(){ img.classList.add('loaded'); };
          img.src = book.cover_url;
          if (img.complete) img.classList.add('loaded');
          coverWrap.appendChild(img);
        } else {
          var ph = document.createElement('div'); ph.className = 'book-cover-placeholder';
          var pi = document.createElement('i'); pi.className = 'fas fa-book'; ph.appendChild(pi); coverWrap.appendChild(ph);
        }
        /* ── Reading progress overlay ── */
        var _prog = _bookGetProgress(book.id);
        // If this is the book we just closed, use the in-memory final state — it's always fresh.
        if (self._lastClosedBook && self._lastClosedBook.id === String(book.id)) {
          _prog = { page: self._lastClosedBook.page, total: self._lastClosedBook.total, ts: Date.now() };
        }
        var _inHistory = !!_history[String(book.id)];
        if (_prog || _inHistory) {
          coverWrap.classList.add('has-progress');
          var _total = (_prog && _prog.total > 1) ? _prog.total : (book.pages > 1 ? book.pages : 0);
          var _pct = (_prog && _total > 0) ? Math.min(100, Math.round(_prog.page / _total * 100)) : 0;
          var _inReadingMode = (self._bookCat === 'reading');
          // Badge (top-left) — tappable in reading-filter mode only
          var _rb = document.createElement('div');
          _rb.className = 'book-read-badge' + (_inReadingMode ? ' removable' : '');
          var _rbi = document.createElement('i'); _rbi.className = _inReadingMode ? 'fas fa-trash-alt' : 'fas fa-check-circle'; _rb.appendChild(_rbi);
          var _rbt = document.createElement('span'); _rbt.textContent = _inReadingMode ? T('iv.delete','ژێبرن') : T('iv.read_title','هاتییە خویندن'); _rb.appendChild(_rbt);
          if (_inReadingMode) {
            _rb.onclick = function(e) {
              e.stopPropagation();
              if (coverWrap.classList.contains('confirm-remove')) return;
              coverWrap.classList.add('confirm-remove');
              _confirmBox.style.display = 'flex';
            };
          }
          coverWrap.appendChild(_rb);
          // SVG circular ring (bottom-right)
          var _CCIRC = 138.23; // 2π × 22
          var _ringWrap = document.createElement('div'); _ringWrap.className = 'book-ring-wrap';
          var _NS = 'http://www.w3.org/2000/svg';
          var _rsvg = document.createElementNS(_NS,'svg'); _rsvg.setAttribute('viewBox','0 0 50 50'); _rsvg.classList.add('book-ring-svg');
          var _rtrack = document.createElementNS(_NS,'circle'); _rtrack.setAttribute('cx','25'); _rtrack.setAttribute('cy','25'); _rtrack.setAttribute('r','22'); _rtrack.classList.add('book-ring-track'); _rsvg.appendChild(_rtrack);
          var _rfill = document.createElementNS(_NS,'circle'); _rfill.setAttribute('cx','25'); _rfill.setAttribute('cy','25'); _rfill.setAttribute('r','22'); _rfill.classList.add('book-ring-fill');
          var _visualPct = _pct > 0 ? _pct : (_prog && _prog.page > 0 ? 4 : 0);
          _rfill.setAttribute('stroke-dasharray', '138.23');
          _rfill.setAttribute('stroke-dashoffset', _visualPct > 0 ? String(_CCIRC * (1 - _visualPct / 100)) : String(_CCIRC));
          _rsvg.appendChild(_rfill); _ringWrap.appendChild(_rsvg);
          if (_pct > 0) {
            var _rpct = document.createElement('div'); _rpct.className = 'book-ring-pct'; _rpct.textContent = _pct + '%'; _ringWrap.appendChild(_rpct);
          } else if (_prog && _prog.page >= 1) {
            var _rpn = document.createElement('div'); _rpn.className = 'book-ring-pct'; _rpn.textContent = 'پ' + _prog.page; _ringWrap.appendChild(_rpn);
          } else {
            var _rico = document.createElement('i'); _rico.className = 'fas fa-book-open book-ring-ico'; _ringWrap.appendChild(_rico);
          }
          coverWrap.appendChild(_ringWrap);
          // Page pill (bottom-left): "65 / 245"
          if (_prog && _prog.page >= 1) {
            var _pill = document.createElement('div'); _pill.className = 'book-page-pill';
            var _pgCur = document.createElement('span'); _pgCur.className = 'pg-cur'; _pgCur.textContent = _prog.page;
            var _pgSep = document.createElement('span'); _pgSep.className = 'pg-sep'; _pgSep.textContent = '/';
            var _pgTot = document.createElement('span'); _pgTot.className = 'pg-tot'; _pgTot.textContent = _total > 1 ? _total : (book.pages || '?');
            _pill.appendChild(_pgCur); _pill.appendChild(_pgSep); _pill.appendChild(_pgTot);
            coverWrap.appendChild(_pill);
          }
          // Bottom gradient overlay
          var _po = document.createElement('div'); _po.className = 'book-prog-overlay';
          coverWrap.appendChild(_po);
          // Thin progress bar at cover bottom
          var _bar = document.createElement('div'); _bar.className = 'book-cover-bar';
          var _barFill = document.createElement('div'); _barFill.className = 'book-cover-bar-fill';
          _barFill.style.width = (_visualPct > 0 ? Math.max(_visualPct, 2) : 0) + '%';
          _bar.appendChild(_barFill); coverWrap.appendChild(_bar);
          // Inline confirm box
          var _confirmBox = document.createElement('div'); _confirmBox.className = 'book-confirm-remove'; _confirmBox.style.display = 'none';
          var _confirmMsg = document.createElement('span'); _confirmMsg.className = 'book-confirm-msg'; _confirmMsg.textContent = T('iv.confirm_remove_read','دڵنیایت؟');
          var _confirmYes = document.createElement('button'); _confirmYes.className = 'book-confirm-yes'; _confirmYes.textContent = T('iv.delete','ژێبرن');
          var _confirmNo = document.createElement('button'); _confirmNo.className = 'book-confirm-no'; _confirmNo.textContent = T('iv.cancel','نەخێر');
          _confirmBox.appendChild(_confirmMsg); _confirmBox.appendChild(_confirmYes); _confirmBox.appendChild(_confirmNo);
          _confirmYes.onclick = function(e) { e.stopPropagation(); _bookClearProgress(book.id); _removeFromReadingHistory(book.id); renderGrid(); };
          _confirmNo.onclick = function(e) { e.stopPropagation(); coverWrap.classList.remove('confirm-remove'); _confirmBox.style.display = 'none'; };
          coverWrap.appendChild(_confirmBox);
        }
        card.appendChild(coverWrap);

        /* NEW badge — positioned on cover so nothing is cut off */
        if (book.badge_until && new Date(book.badge_until).getTime() > Date.now()) {
          var nb = document.createElement('div'); nb.className = 'book-cover-new-badge'; nb.textContent = (window.t&&window.t('iv.new_badge'))||'نوی'; coverWrap.appendChild(nb);
        }

        /* Download badge — shown if PDF is cached offline */
        if (window.PdfStore && book.pdf_url) {
          var dlBadge = document.createElement('div');
          dlBadge.className = 'book-dl-badge'; dlBadge.setAttribute('data-book-id', String(book.id));
          var dlIco = document.createElement('i'); dlIco.className = 'fas fa-arrow-down';
          dlBadge.appendChild(dlIco);
          PdfStore.has(book).then(function(cached) {
            if (cached) { dlBadge.classList.add('cached'); dlIco.className = 'fas fa-check'; }
          });
          coverWrap.appendChild(dlBadge);
        }

        /* Bookmark — bottom-right of info area */
        var saveBtn = document.createElement('button');
        saveBtn.className = 'book-save-btn' + (_bookIsSaved(book.id) ? ' saved' : '');
        var sIco = document.createElement('i'); sIco.className = 'fas fa-bookmark'; saveBtn.appendChild(sIco);
        saveBtn.onclick = function(e){
          e.stopPropagation(); _bookToggleSave(book.id, book);
          saveBtn.classList.toggle('saved', _bookIsSaved(book.id));
          if (window.Capacitor && window.Capacitor.Plugins.Haptics) window.Capacitor.Plugins.Haptics.impact({style:'LIGHT'});
        };

        var info = document.createElement('div'); info.className = 'book-info';
        var titleEl = document.createElement('div'); titleEl.className = 'book-title';
        titleEl.textContent = book.title_ku || book.title_ar || ''; info.appendChild(titleEl);
        if (book.author_ku || book.author_ar) {
          var auth = document.createElement('div'); auth.className = 'book-author';
          auth.textContent = book.author_ku || book.author_ar; info.appendChild(auth);
        }
        if (_prog && _prog.ts) {
          var _lrEl = document.createElement('div'); _lrEl.className = 'book-last-read';
          var _lrIco = document.createElement('i'); _lrIco.className = 'fas fa-clock'; _lrEl.appendChild(_lrIco);
          _lrEl.appendChild(document.createTextNode(' ' + _timeAgo(_prog.ts)));
          info.appendChild(_lrEl);
        }
        var infoFoot = document.createElement('div'); infoFoot.className = 'book-info-foot';
        if (book.pages) {
          var pg = document.createElement('div'); pg.className = 'book-pages';
          pg.textContent = book.pages + ' ' + T('gencine.pages_unit','ڕۆپەل'); infoFoot.appendChild(pg);
        }
        infoFoot.appendChild(saveBtn);
        info.appendChild(infoFoot);
        card.appendChild(info);

        (function(bk){ card.onclick = function(e){
          if (e.target.closest('.book-save-btn') || e.target.closest('.book-prog-clear')) return;
          _openBookReader(bk);
        }; })(book);
        grid.appendChild(card);
      });
    }

    renderGrid();
  },

  _renderBookReader: function(container){
    var self = this;
    var book = self._currentBook;
    if (!book) { self._view = 'books'; self._draw(); return; }
    var T = function(k,d){ var v=window.t?window.t(k):undefined; return (!v||v===k)?(d||k):v; };

    // Kick off Supabase merge immediately — updates localStorage before doLoad reads it
    _mergeProgressFromSupabase(book.id, _bookGetProgress(String(book.id)), function(){});

    var loadingEl = document.createElement('div');
    loadingEl.className = 'book-reader-loading';

    // Circular SVG progress ring — idle: spinning 25 % arc; progress: fills to 100 %
    var CIRC = 439.8; // 2π × 70
    var ringWrap = document.createElement('div');
    ringWrap.className = 'pdf-ring-wrap pdf-ring-idle'; // idle spinner until download begins
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 160 160');
    svg.classList.add('pdf-ring-svg');
    var track = document.createElementNS(NS, 'circle');
    track.setAttribute('cx','80'); track.setAttribute('cy','80'); track.setAttribute('r','70');
    track.classList.add('pdf-ring-track');
    svg.appendChild(track);
    var arc = document.createElementNS(NS, 'circle');
    arc.setAttribute('cx','80'); arc.setAttribute('cy','80'); arc.setAttribute('r','70');
    arc.classList.add('pdf-ring-fill');
    svg.appendChild(arc);
    ringWrap.appendChild(svg);
    // Book icon shown during idle; swapped for percentage when download starts
    var ringIcon = document.createElement('i');
    ringIcon.className = 'fas fa-book-open pdf-ring-icon';
    ringWrap.appendChild(ringIcon);
    var progressPct = document.createElement('div');
    progressPct.className = 'pdf-ring-pct';
    ringWrap.appendChild(progressPct);
    loadingEl.appendChild(ringWrap);

    // Title + dots grouped
    var infoEl = document.createElement('div');
    infoEl.className = 'pdf-load-info';
    var titleEl = document.createElement('div');
    titleEl.className = 'pdf-load-title';
    titleEl.textContent = book && book.title || '';
    infoEl.appendChild(titleEl);
    var dotsEl = document.createElement('div');
    dotsEl.className = 'pdf-load-dots';
    for (var _di = 0; _di < 3; _di++) {
      var dot = document.createElement('div');
      dot.className = 'pdf-load-dot';
      dotsEl.appendChild(dot);
    }
    infoEl.appendChild(dotsEl);
    loadingEl.appendChild(infoEl);
    container.appendChild(loadingEl);

    // Alias for backward compat with progress update code
    var progressFill = arc;

    var pagesWrap = document.createElement('div');
    pagesWrap.style.cssText = 'padding:4px 2px 80px;display:flex;flex-direction:column;gap:3px;';
    container.appendChild(pagesWrap);

    /* ── Pinch zoom · double-tap · pan ── */
    var _pdfZoom = 1, _tx = 0, _ty = 0;
    var _pinchStart = null, _panStart = null;
    var _lastTap = 0, _lastTapX = 0, _lastTapY = 0;
    var _badgeTimer = null;
    pagesWrap.style.transformOrigin = '0 0';

    /* ── Fullscreen toggle ── */
    var panel  = document.getElementById('panelGencine');
    var hdr    = panel && panel.querySelector('.hdr');
    var fsBtn  = document.getElementById('pdfFsBtn');
    var _hdrHidden = false;

    /* Make header fully opaque while PDF is open so zoomed content can't bleed
       through its semi-transparent backdrop when _ty moves pagesWrap upward. */
    if(hdr){ hdr.style.background = 'var(--bg)'; hdr.style.backdropFilter = 'none'; hdr.style.webkitBackdropFilter = 'none'; }

    /* floating restore pill — remove any orphan from a previous session */
    if (self._pdfRestoreBtn) { try { self._pdfRestoreBtn.remove(); } catch(e) {} self._pdfRestoreBtn = null; }
    if (self._pdfBadge)      { try { self._pdfBadge.remove();      } catch(e) {} self._pdfBadge = null; }
    var restoreBtn = document.createElement('button');
    self._pdfRestoreBtn = restoreBtn;
    restoreBtn.style.cssText = 'position:fixed;top:calc(var(--safe-t,12px) + 8px);left:12px;'
      +'height:32px;padding:0 14px;border-radius:16px;border:none;cursor:pointer;'
      +'background:rgba(0,0,0,.48);color:#fff;font-size:.78rem;font-weight:600;'
      +'display:flex;align-items:center;gap:6px;z-index:202;'
      +'backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);'
      +'box-shadow:0 2px 12px rgba(0,0,0,.25);opacity:0;pointer-events:none;'
      +'transform:translateY(-16px);transition:opacity .3s ease,transform .3s cubic-bezier(.34,1.56,.64,1);';
    var ri = document.createElement('i'); ri.className = 'fas fa-compress';
    restoreBtn.appendChild(ri);
    document.body.appendChild(restoreBtn);

    function _animHdr(hide){
      if(!hdr) return;
      hdr.style.transition = 'height .3s cubic-bezier(.4,0,.2,1),min-height .3s cubic-bezier(.4,0,.2,1),opacity .3s ease,padding .3s ease';
      if(hide){
        hdr.style.height='0'; hdr.style.minHeight='0';
        hdr.style.opacity='0'; hdr.style.overflow='hidden'; hdr.style.padding='0';
      } else {
        hdr.style.height='56px'; hdr.style.minHeight='56px';
        hdr.style.opacity='1'; hdr.style.padding='';
        setTimeout(function(){ hdr.style.height=''; hdr.style.minHeight=''; hdr.style.overflow=''; hdr.style.transition=''; }, 320);
      }
    }

    function _toggleHdr(){
      _hdrHidden = !_hdrHidden;
      _animHdr(_hdrHidden);
      if(_hdrHidden){
        restoreBtn.style.pointerEvents='auto';
        requestAnimationFrame(function(){ restoreBtn.style.opacity='0.38'; restoreBtn.style.transform='translateY(0)'; });
        if(fsBtn) fsBtn.querySelector('i').className='fas fa-compress';
      } else {
        restoreBtn.style.opacity='0'; restoreBtn.style.transform='translateY(-16px)'; restoreBtn.style.pointerEvents='none';
        if(fsBtn) fsBtn.querySelector('i').className='fas fa-expand';
      }
    }

    if(fsBtn) fsBtn.onclick = _toggleHdr;
    restoreBtn.addEventListener('click', _toggleHdr);

    /* ── TOC drawer ── */
    var _pdfTocBtn = document.getElementById('pdfTocBtn');
    var _tocDrawer = null;
    function _toggleToc() {
      if (_tocDrawer) {
        _tocDrawer.classList.remove('open');
        var _dEl = _tocDrawer; _tocDrawer = null;
        setTimeout(function(){ if(_dEl&&_dEl.parentNode) _dEl.parentNode.removeChild(_dEl); }, 320);
        if(_pdfTocBtn) _pdfTocBtn.classList.remove('on'); return;
      }
      if (!_tocData||!_tocData.length) return;
      if(_pdfTocBtn) _pdfTocBtn.classList.add('on');
      var drawer=document.createElement('div'); drawer.className='pdf-toc-drawer';
      var inner=document.createElement('div'); inner.className='pdf-toc-inner';
      var hdr2=document.createElement('div'); hdr2.className='pdf-toc-hdr';
      var hdrTit=document.createElement('div'); hdrTit.className='pdf-toc-title'; hdrTit.textContent=T('gencine.toc','فهرست');
      var closeBtn2=document.createElement('button'); closeBtn2.className='pdf-toc-close';
      var ci=document.createElement('i'); ci.className='fas fa-times'; closeBtn2.appendChild(ci);
      closeBtn2.onclick=_toggleToc; hdr2.appendChild(closeBtn2); hdr2.appendChild(hdrTit); inner.appendChild(hdr2);
      var list=document.createElement('div'); list.className='pdf-toc-list';
      _tocData.forEach(function(item){
        var row=document.createElement('button'); row.className='pdf-toc-row'+(item.depth>0?' depth-'+Math.min(item.depth,2):'');
        var rt=document.createElement('div'); rt.className='pdf-toc-row-title'; rt.textContent=item.title;
        var rp=document.createElement('div'); rp.className='pdf-toc-row-page'; rp.textContent=item.page;
        row.appendChild(rt); row.appendChild(rp);
        (function(pg){ row.onclick=function(){ if(_curPage!==pg){_jumpToPage(pg);_curPage=pg;_updatePageNav();_saveProgress();} _toggleToc(); }; })(item.page);
        list.appendChild(row);
      });
      inner.appendChild(list); drawer.appendChild(inner);
      drawer.onclick=function(e){ if(e.target===drawer) _toggleToc(); };
      document.body.appendChild(drawer); _tocDrawer=drawer;
      requestAnimationFrame(function(){ drawer.classList.add('open'); });
    }
    if(_pdfTocBtn) _pdfTocBtn.onclick=_toggleToc;

    /* ── Zoom badge ── */
    var badge = document.createElement('div');
    self._pdfBadge = badge;
    badge.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);'
      +'background:rgba(0,0,0,.55);color:#fff;padding:5px 18px;border-radius:20px;'
      +'font-size:.95rem;font-weight:700;pointer-events:none;opacity:0;transition:opacity .2s;z-index:9999;letter-spacing:.04em;';
    document.body.appendChild(badge);

    /* cleanup when navigating away */
    self._pdfCleanup = function(){
      window._sbPdfZoomed = false;
      if(self._pdfPageObs){ self._pdfPageObs.disconnect(); self._pdfPageObs = null; }
      badge.remove(); restoreBtn.remove();
      self._pdfBadge = null; self._pdfRestoreBtn = null;
      if(fsBtn) fsBtn.onclick = null;
      if(hdr){ hdr.style.background=''; hdr.style.backdropFilter=''; hdr.style.webkitBackdropFilter=''; }
      if(hdr && _hdrHidden){
        hdr.style.transition=''; hdr.style.height=''; hdr.style.minHeight='';
        hdr.style.opacity=''; hdr.style.overflow=''; hdr.style.padding='';
      }
    };

    function _showBadge(z){
      badge.textContent = z.toFixed(1)+'×';
      badge.style.opacity = '1';
      clearTimeout(_badgeTimer);
      _badgeTimer = setTimeout(function(){ badge.style.opacity='0'; }, 900);
    }

    function _clampTx(nl){
      if(nl===undefined) nl = pagesWrap.getBoundingClientRect().left - _tx;
      if(_pdfZoom<=1){ _tx=0; return; }
      var W = window.innerWidth;
      var cw = (pagesWrap.offsetWidth||W) * _pdfZoom;
      if(nl+cw <= W){ _tx=(W-nl-cw)/2; return; }
      _tx = Math.min(-nl, Math.max(W-nl-cw, _tx));
    }

    function _applyPdfTransform(animate){
      pagesWrap.style.transition = animate ? 'transform .22s cubic-bezier(.25,.46,.45,.94)' : 'none';
      pagesWrap.style.transform  = 'translate('+_tx+'px,'+_ty+'px) scale('+_pdfZoom+')';
      pagesWrap.style.touchAction = _pdfZoom>1.01 ? 'none' : 'pan-y';
      window._sbPdfZoomed = _pdfZoom > 1.05; // swipe-back guard
    }

    function _pinchDist(t){ var dx=t[0].clientX-t[1].clientX,dy=t[0].clientY-t[1].clientY; return Math.sqrt(dx*dx+dy*dy); }

    /* Zoom anchored at screen point (cx,cy).
       getBoundingClientRect() already accounts for current _tx/_ty AND panel scroll.
       nl/nt = natural position of pagesWrap (without _tx/_ty).
       lx/ly = content-space coords of anchor point.
       After new zoom: screen point = nl + lx*newZoom + newTx  →  newTx = cx - nl - lx*newZoom. */
    function _zoomAt(newZoom, cx, cy){
      var r = pagesWrap.getBoundingClientRect();
      var lx = (cx - r.left) / _pdfZoom;
      var ly = (cy - r.top)  / _pdfZoom;
      var nl = r.left - _tx;
      var nt = r.top  - _ty;
      _pdfZoom = newZoom;
      _tx = cx - nl - lx * _pdfZoom;
      _ty = cy - nt - ly * _pdfZoom;
      _clampTx();
    }

    pagesWrap.addEventListener('touchstart', function(e){
      pagesWrap.style.transition = 'none';
      if(e.touches.length===2){
        _panStart = null;
        var cx=(e.touches[0].clientX+e.touches[1].clientX)/2;
        var cy=(e.touches[0].clientY+e.touches[1].clientY)/2;
        var r = pagesWrap.getBoundingClientRect();
        var nl = r.left - _tx, nt = r.top - _ty;
        _pinchStart = {
          dist: _pinchDist(e.touches),
          zoom: _pdfZoom,
          cx: cx, cy: cy,
          nl: nl, nt: nt,
          lx: (cx - nl - _tx) / _pdfZoom,
          ly: (cy - nt - _ty) / _pdfZoom
        };
        e.preventDefault();
      } else if(e.touches.length===1){
        _pinchStart = null;
        var x1=e.touches[0].clientX, y1=e.touches[0].clientY, now=Date.now();
        if(now-_lastTap<300 && Math.abs(x1-_lastTapX)<40 && Math.abs(y1-_lastTapY)<40){
          _lastTap = 0;
          if(_pdfZoom>1.05){ _pdfZoom=1; _tx=0; _ty=0; _applyPdfTransform(true); }
          else { _zoomAt(2.5, x1, y1); _applyPdfTransform(true); }
          _showBadge(_pdfZoom);
          if(e.cancelable) e.preventDefault();
          return;
        }
        _lastTap=now; _lastTapX=x1; _lastTapY=y1;
        if(_pdfZoom>1.01){
          _panStart = {x:x1, y:y1, tx:_tx, ty:_ty};
          e.preventDefault();
        }
      }
    }, {passive:false});

    pagesWrap.addEventListener('touchmove', function(e){
      if(e.touches.length===2 && _pinchStart){
        e.preventDefault();
        var newZoom = Math.min(4, Math.max(1, _pinchStart.zoom * _pinchDist(e.touches) / _pinchStart.dist));
        _pdfZoom = newZoom;
        _tx = _pinchStart.cx - _pinchStart.nl - _pinchStart.lx * _pdfZoom;
        _ty = _pinchStart.cy - _pinchStart.nt - _pinchStart.ly * _pdfZoom;
        _clampTx(_pinchStart.nl);
        _applyPdfTransform(false);
        _showBadge(_pdfZoom);
      } else if(e.touches.length===1 && _panStart){
        e.preventDefault();
        _tx = _panStart.tx + (e.touches[0].clientX - _panStart.x);
        _ty = _panStart.ty + (e.touches[0].clientY - _panStart.y);
        _clampTx();
        _applyPdfTransform(false);
      }
    }, {passive:false});

    pagesWrap.addEventListener('touchend', function(e){
      if(e.touches.length < 2) _pinchStart = null;
      if(e.touches.length === 0){
        _panStart = null;
        if(_pdfZoom < 1.08){ _pdfZoom=1; _tx=0; _ty=0; _applyPdfTransform(true); }
      }
    });

    var doLoad = function(pdf) {
      if (self._currentBook !== book) return; // user switched books while loading — discard
      self._pdfDoc = pdf;
      var _totalPages = pdf.numPages; // capture now — pdf.destroy() in cleanup must not affect saved values

      // ── TOC deep scan ──────────────────────────────────────────────────────────
      var _tocData = null;
      try { var _st = JSON.parse(localStorage.getItem('pdfToc_'+book.id)||'null'); if(_st&&_st.length){_tocData=_st; self._pdfHasToc=true; self._updateHeader();} } catch(e){}
      pdf.getOutline().then(function(outline){
        if (!outline||!outline.length) return;
        var flat=[];
        function _co(items,d){ (items||[]).forEach(function(item){ if(item&&item.title) flat.push({title:item.title,dest:item.dest,depth:d}); if(item&&item.items&&item.items.length) _co(item.items,d+1); }); }
        _co(outline,0); if (!flat.length) return;
        var resolved=new Array(flat.length), done=0;
        flat.forEach(function(item,i){
          function _res(pg){ resolved[i]={title:item.title,page:pg||1,depth:item.depth}; if(++done===flat.length){ _tocData=resolved; try{localStorage.setItem('pdfToc_'+book.id,JSON.stringify(resolved));}catch(e2){} self._pdfHasToc=true; self._updateHeader(); } }
          try {
            var dest=item.dest; if(!dest){_res(1);return;}
            var getRef=typeof dest==='string'?pdf.getDestination(dest).then(function(d){return d&&d[0];}):Promise.resolve(dest&&dest[0]);
            getRef.then(function(ref){ if(!ref){_res(1);return;} pdf.getPageIndex(ref).then(function(idx){_res(idx+1);}).catch(function(){_res(1);}); }).catch(function(){_res(1);});
          } catch(e){_res(1);}
        });
      }).catch(function(){});
      // Always update with confirmed numPages from loaded PDF
      var _pg = 1;
      if (book && book.id) {
        try {
          var _ep = _bookGetProgress(String(book.id));
          _pg = (_ep && _ep.page > 1 && _ep.page <= _totalPages) ? _ep.page : 1;
          localStorage.setItem('pdfProg_'+book.id, JSON.stringify({page:_pg,total:_totalPages,ts:Date.now()}));
        } catch(e2) {}
      }
      // When resuming mid-book keep spinner visible until the scroll jump settles
      if (_pg <= 1) loadingEl.style.display = 'none';
      var slots = [];
      for (var i = 1; i <= _totalPages; i++) {
        var slot = document.createElement('div');
        slot.setAttribute('data-page', i);
        slot.style.cssText = 'width:100%;background:#fff;min-height:300px;';
        pagesWrap.appendChild(slot);
        slots.push(slot);
      }

      // ── Virtualized render queue ────────────────────────────────────────────
      // Root cause of blank-screen crash: IntersectionObserver fires for every
      // page entering the extended viewport during fast scroll. With no concurrency
      // limit, 20+ simultaneous canvas allocations exhaust iOS GPU memory
      // (~12 MB/page × 3× DPR × 20 pages = OOM → WKWebView process killed).
      //
      // Fix:
      //   MAX_RQ=2   — max concurrent PDF.js renders at any time
      //   MAX_KEPT=6 — max canvas elements alive in DOM; farthest evicted first
      //   _scrollingPdf — rendering pauses during active scroll so fast swipes
      //                   don't flood the queue with stale pages
      //   DPR cap at 2  — 3× retina across 200+ pages = instant OOM; 2× is sharp
      var _rq = [], _rqActive = 0, _renderedNums = [];
      var _scrollingPdf = false, _scrollPdfTimer = null;
      var MAX_RQ = 2, MAX_KEPT = 6;
      var _dpr = Math.min(window.devicePixelRatio || 1,
        document.documentElement.classList.contains('perf-critical') ? 1 : 2);

      function _evictFarPages(anchor) {
        while (_renderedNums.length > MAX_KEPT) {
          var fIdx = 0;
          for (var ei = 1; ei < _renderedNums.length; ei++) {
            if (Math.abs(_renderedNums[ei]-anchor) > Math.abs(_renderedNums[fIdx]-anchor)) fIdx = ei;
          }
          var evP = _renderedNums.splice(fIdx, 1)[0];
          var evS = slots[evP - 1];
          if (evS) {
            var evC = evS.querySelector('canvas');
            if (evC) {
              try { var evCtx = evC.getContext('2d'); if(evCtx) evCtx.clearRect(0,0,evC.width,evC.height); } catch(e){}
              evC.width = 0; evC.height = 0;
              if (evC.parentNode) evC.parentNode.removeChild(evC);
            }
            evS._rendered = false; evS._rendering = false;
            evS.style.minHeight = '300px';
          }
        }
      }

      function _drainRQ() {
        if (_scrollingPdf) return;
        while (_rqActive < MAX_RQ && _rq.length > 0) {
          var task = _rq.shift();
          if (!task || task.slot._rendered || task.slot._rendering) continue;
          task.slot._rendering = true;
          _rqActive++;
          (function(tk) {
            try {
              tk.pdf.getPage(tk.n).then(function(page) {
                if (!tk.slot._rendering) { _rqActive = Math.max(0,_rqActive-1); _drainRQ(); return null; }
                var w = (pagesWrap.offsetWidth || window.innerWidth) - 4;
                var uv = page.getViewport({scale:1});
                var vp = page.getViewport({scale:(w/uv.width)*_dpr});
                var cv = document.createElement('canvas');
                cv.width = vp.width; cv.height = vp.height;
                cv.style.cssText = 'display:block;width:'+w+'px;height:'+Math.floor(vp.height/_dpr)+'px;';
                return page.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise
                  .then(function() {
                    if (!tk.slot._rendering) { cv.width=0; cv.height=0; return; }
                    tk.slot.style.minHeight = '';
                    while (tk.slot.firstChild) tk.slot.removeChild(tk.slot.firstChild);
                    tk.slot.appendChild(cv);
                    tk.slot._rendered = true; tk.slot._rendering = false;
                    if (_renderedNums.indexOf(tk.n) < 0) _renderedNums.push(tk.n);
                    _evictFarPages(tk.n);
                  }).catch(function(){ tk.slot._rendering = false; });
              }).catch(function(){ tk.slot._rendering = false; })
              .then(function(){ _rqActive = Math.max(0,_rqActive-1); _drainRQ(); });
            } catch(e) { tk.slot._rendering = false; _rqActive = Math.max(0,_rqActive-1); _drainRQ(); }
          })(task);
        }
      }

      function _enqueueRender(n, sl, pd) {
        if (!sl || sl._rendered || sl._rendering) return;
        for (var qi = _rq.length-1; qi >= 0; qi--) { if (_rq[qi].slot === sl) _rq.splice(qi,1); }
        _rq.push({n:n, slot:sl, pdf:pd});
        if (_rq.length > 12) _rq.splice(0, _rq.length - 12); // cap queue during fast scroll
        _drainRQ();
      }

      var obs = new IntersectionObserver(function(entries) {
        entries.forEach(function(e) {
          if (!e.isIntersecting) return;
          var n = parseInt(e.target.getAttribute('data-page'));
          _enqueueRender(n, e.target, pdf);
          if (n > 1 && slots[n-2]) _enqueueRender(n-1, slots[n-2], pdf);
          if (n < _totalPages && slots[n]) _enqueueRender(n+1, slots[n], pdf);
        });
      }, {rootMargin: '200px 0px', threshold: 0});
      self._pdfPageObs = obs;
      slots.forEach(function(s) { obs.observe(s); });
      _enqueueRender(1, slots[0], pdf);
      if (slots[1]) _enqueueRender(2, slots[1], pdf);

      /* ── Page navigation ── */
      var _curPage = (_pg && _pg > 1) ? _pg : 1;
      var _revealTimer = null;
      var _safetyTimer = null;
      if (_curPage > 1) {
        pagesWrap.style.opacity = '0';
        _safetyTimer = setTimeout(function(){
          pagesWrap.style.transition = 'opacity 0.2s ease'; pagesWrap.style.opacity = '1'; loadingEl.style.display = 'none';
        }, 5000);
      }
      var _navScrollTimer = null;
      var _jumpActive = false;
      var _panelEl = document.getElementById('panelGencine');
      var _prevBtn = document.getElementById('pdfPrevBtn');
      var _nextBtn = document.getElementById('pdfNextBtn');
      var _pageInd = document.getElementById('pdfPageInd');

      function _updatePageNav() {
        if (_pageInd && document.activeElement !== _pageInd) _pageInd.value = _curPage;
        if (_pageInd) _pageInd.max = _totalPages;
        if (_prevBtn) _prevBtn.disabled = _curPage <= 1;
        if (_nextBtn) _nextBtn.disabled = _curPage >= _totalPages;
      }

      /* Return header height accounting for fullscreen hide */
      function _hdrH() {
        return (hdr && hdr.getBoundingClientRect().height) || 0;
      }

      /* Scroll slot to exactly below the sticky header — instant, no smooth */
      function _scrollToSlot(slot) {
        if (!_panelEl || !slot) return;
        var slotTop  = slot.getBoundingClientRect().top;
        var panelTop = _panelEl.getBoundingClientRect().top;
        /* subtract header height: formula targets panelTop but first visible
           pixel is panelTop + hdrHeight (sticky header sits inside the panel) */
        _panelEl.scrollTop = _panelEl.scrollTop + (slotTop - panelTop) - _hdrH();
      }

      /* Jump to arbitrary page with retry loop.
         Intermediate unrendered slots have min-height:300px placeholders.
         After each instant scroll the IntersectionObserver renders newly
         visible pages; retrying re-measures and corrects the offset. */
      function _jumpToPage(n) {
        var slot = slots[n - 1];
        if (!slot) return;
        _jumpActive = true;
        _enqueueRender(n, slot, pdf);
        if (n > 1) _enqueueRender(n - 1, slots[n - 2], pdf);
        if (n < _totalPages) _enqueueRender(n + 1, slots[n], pdf);

        _scrollToSlot(slot);

        var _attempts = 0;
        function _retry() {
          if (_attempts++ >= 4) { _jumpActive = false; return; }
          setTimeout(function() {
            var slotTop  = slot.getBoundingClientRect().top;
            var panelTop = _panelEl.getBoundingClientRect().top;
            var off = slotTop - panelTop - _hdrH();
            if (Math.abs(off) > 4) {
              _panelEl.scrollTop = _panelEl.scrollTop + off;
              _retry();
            } else {
              _jumpActive = false;
            }
          }, 160);
        }
        _retry();
      }

      /* _syncPage — scroll-independent formula:
         slot.getBCR.top - panel.getBCR.top + panel.scrollTop = slot's absolute
         distance from panel content-top, same value regardless of scroll position.
         Running inside rAF ensures iOS compositor has committed positions first. */
      function _syncPage() {
        if (!_panelEl) return;
        requestAnimationFrame(function() {
          if (!_panelEl || _jumpActive) return;
          var panelTop  = _panelEl.getBoundingClientRect().top;
          var scrollTop = _panelEl.scrollTop;
          var ref       = scrollTop + (_hdrH() || 0);
          var best = 1, bestDist = Infinity;
          slots.forEach(function(sl, i) {
            var absTop = sl.getBoundingClientRect().top - panelTop + scrollTop;
            var dist   = Math.abs(absTop - ref);
            if (dist < bestDist) { bestDist = dist; best = i + 1; }
          });
          if (best !== _curPage) { _curPage = best; _updatePageNav(); _saveProgress(); }
        });
      }

      var _navScrollHandler = function() {
        clearTimeout(_navScrollTimer);
        _navScrollTimer = setTimeout(_syncPage, 80);
        // Pause PDF rendering during scroll — prevents stale canvas allocations
        _scrollingPdf = true;
        clearTimeout(_scrollPdfTimer);
        _scrollPdfTimer = setTimeout(function() { _scrollingPdf = false; _drainRQ(); }, 200);
      };
      if (_panelEl) _panelEl.addEventListener('scroll', _navScrollHandler, {passive:true});

      var _touchEndHandler = function() {
        clearTimeout(_navScrollTimer);
        _navScrollTimer = setTimeout(_syncPage, 250);
      };
      if (_panelEl) _panelEl.addEventListener('touchend', _touchEndHandler, {passive:true});

      // Viewport IO — fires when a page crosses visibility threshold → triggers _syncPage
      var _visObs = new IntersectionObserver(function() { _syncPage(); }, { threshold: [0.1, 0.5] });
      slots.forEach(function(s) { _visObs.observe(s); });

      // Guaranteed flush every 2 s — catches any event the other mechanisms miss
      var _periodicSave = setInterval(function() { _syncPage(); _saveProgress(); }, 2000);

      function _saveProgress() {
        if (book && book.id) {
          var _ts = Date.now();
          try { localStorage.setItem('pdfProg_'+book.id, JSON.stringify({page:_curPage,total:_totalPages,ts:_ts})); } catch(e2) {}
          _syncProgressToSupabase(book.id, _curPage, _totalPages, _ts);
        }
      }
      if (_prevBtn) _prevBtn.onclick = function() {
        if (_curPage > 1) {
          _enqueueRender(_curPage - 1, slots[_curPage - 2], pdf);
          _scrollToSlot(slots[_curPage - 2]);
          _curPage--; _updatePageNav(); _saveProgress();
        }
      };
      if (_nextBtn) _nextBtn.onclick = function() {
        if (_curPage < _totalPages) {
          _enqueueRender(_curPage, slots[_curPage], pdf);
          _scrollToSlot(slots[_curPage]);
          _curPage++; _updatePageNav(); _saveProgress();
        }
      };
      if (_pageInd) {
        _pageInd.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') { _pageInd.blur(); }
        });
        _pageInd.addEventListener('blur', function() {
          var n = parseInt(_pageInd.value);
          if (!isNaN(n) && n >= 1 && n <= _totalPages) {
            _jumpToPage(n);
            _curPage = n; _updatePageNav(); _saveProgress();
          } else {
            _pageInd.value = _curPage;
          }
        });
      }

      _updatePageNav();
      if (_curPage > 1) {
        _jumpToPage(_curPage);
        _revealTimer = setTimeout(function(){
          clearTimeout(_safetyTimer);
          loadingEl.style.display = 'none';
          pagesWrap.style.transition = 'opacity 0.2s ease';
          pagesWrap.style.opacity = '1';
        }, 720);
      }

      // Resume banner — shown when continuing a book already in progress
      var _resumeBanner = null;
      var _bannerTimers = [];
      if (_curPage > 1) {
        _resumeBanner = document.createElement('div'); _resumeBanner.className = 'book-resume-banner';
        var _rBanIco = document.createElement('i'); _rBanIco.className = 'fas fa-bookmark'; _resumeBanner.appendChild(_rBanIco);
        _resumeBanner.appendChild(document.createTextNode(' ' + T('gencine.resuming','بەردەوامبوون') + ' — ' + T('gencine.page_lbl','پ') + ' ' + _curPage));
        // Appended to body — panel overflow+transform traps position:fixed on iOS
        // CSS handles positioning via --safe-t + --hdr-h custom properties (no JS measurement needed)
        document.body.appendChild(_resumeBanner);
        _bannerTimers.push(setTimeout(function(){ _resumeBanner.classList.add('visible'); }, 300));
        _bannerTimers.push(setTimeout(function(){
          _resumeBanner.classList.remove('visible');
          _bannerTimers.push(setTimeout(function(){ if (_resumeBanner && _resumeBanner.parentNode) _resumeBanner.parentNode.removeChild(_resumeBanner); }, 400));
        }, 3500));
      }

      /* Extend existing cleanup to remove nav listeners */
      var _prevCleanup = self._pdfCleanup;
      self._pdfCleanup = function() {
        // Synchronous final page detect — no rAF needed, no active scroll at exit time.
        if (_panelEl && slots.length) {
          var _pt = _panelEl.getBoundingClientRect().top;
          var _st = _panelEl.scrollTop;
          var _rf = _st + (_hdrH() || 0);
          var _bst = 1, _bd = Infinity;
          slots.forEach(function(sl, i) {
            var d = Math.abs(sl.getBoundingClientRect().top - _pt + _st - _rf);
            if (d < _bd) { _bd = d; _bst = i + 1; }
          });
          if (_bst !== _curPage) _curPage = _bst;
        }
        // Cache final state on self so _renderBooks can use it even if localStorage lags.
        self._lastClosedBook = { id: String(book.id), page: _curPage, total: _totalPages };
        _saveProgress();
        // Instantly hide visible content so the ghost doesn't flash during DOM clear
        if (pagesWrap) { pagesWrap.style.transition = 'none'; pagesWrap.style.opacity = '0'; }
        if (loadingEl) { loadingEl.style.display = 'none'; }
        if (_panelEl) _panelEl.removeEventListener('scroll', _navScrollHandler);
        if (_panelEl) _panelEl.removeEventListener('touchend', _touchEndHandler);
        clearTimeout(_navScrollTimer);
        clearTimeout(_revealTimer);
        clearTimeout(_safetyTimer);
        _bannerTimers.forEach(clearTimeout);
        if (_resumeBanner && _resumeBanner.parentNode) _resumeBanner.parentNode.removeChild(_resumeBanner);
        clearInterval(_periodicSave);
        if (_visObs) _visObs.disconnect();
        // Stop render queue — prevents in-flight renders completing into freed slots
        _rq = []; _rqActive = 0; _renderedNums = [];
        clearTimeout(_scrollPdfTimer); _scrollingPdf = false;
        // Free canvas GPU backing stores — iOS WebKit + Android Chromium both need this
        // clearRect first (Chromium doesn't always GC from resize alone), then zero dims
        slots.forEach(function(s) {
          var cv = s.querySelector('canvas');
          if (cv) {
            try { var ctx = cv.getContext('2d'); if (ctx) ctx.clearRect(0, 0, cv.width, cv.height); } catch(e) {}
            cv.width = 0; cv.height = 0;
          }
          while (s.firstChild) s.removeChild(s.firstChild);
        });
        if (_prevBtn) _prevBtn.onclick = null;
        if (_nextBtn) _nextBtn.onclick = null;
        if (_pageInd) { _pageInd.onblur = null; _pageInd.onkeydown = null; _pageInd.value = ''; }
        if (_prevCleanup) _prevCleanup();
        // Suppress "Worker was terminated" unhandled rejections emitted by PDF.js internals
        var _wErrH = function(ev){ if (ev.reason && ev.reason.message === 'Worker was terminated') ev.preventDefault(); };
        window.addEventListener('unhandledrejection', _wErrH);
        // Destroy PDF document to release PDF.js GPU memory — critical on iOS
        try { if (pdf && pdf.destroy) { var _dp = pdf.destroy(); if (_dp && _dp.catch) _dp.catch(function(){}); } } catch(e) {}
        setTimeout(function(){ window.removeEventListener('unhandledrejection', _wErrH); }, 1000);
        self._pdfDoc = null;
        // TOC cleanup
        if (_tocDrawer) { try { _tocDrawer.remove(); } catch(e){} _tocDrawer = null; }
        self._pdfHasToc = false; self._updateHeader();
      };
    };

    if (self._pdfDoc) { doLoad(self._pdfDoc); return; }

    var _PDF_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
    var pdfjsLib = window['pdfjs-dist/build/pdf'] || window.pdfjsLib;
    if (!pdfjsLib) {
      /* Lazy-load PDF.js the first time a PDF book is opened.
         Guard against double-load if user taps button twice. */
      if (window._pdfJsLoading) return;
      window._pdfJsLoading = true;
      var scr = document.createElement('script');
      scr.src = _PDF_CDN + 'pdf.min.js';
      scr.onload = function() {
        window._pdfJsLoading = false;
        var lib = window['pdfjs-dist/build/pdf'] || window.pdfjsLib;
        if (lib) { lib.GlobalWorkerOptions.workerSrc = _PDF_CDN + 'pdf.worker.min.js'; self._draw(); }
        else { titleEl.textContent = 'PDF.js failed to load'; }
      };
      scr.onerror = function() { window._pdfJsLoading = false; titleEl.textContent = 'Failed to load PDF viewer'; };
      document.head.appendChild(scr);
      return;
    }
    pdfjsLib.GlobalWorkerOptions.workerSrc = _PDF_CDN + 'pdf.worker.min.js';

    var _pdfCmapUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/';
    var _pdfBaseOpts = { cMapUrl: _pdfCmapUrl, cMapPacked: true, useSystemFonts: true, disableFontFace: true };
    var _loadCancelled = false;
    var _cleanupBeforeLoad = self._pdfCleanup;

    function _startLoadingTask(lt) {
      lt.promise.then(function(pdf) {
        if (!_loadCancelled) doLoad(pdf);
      }).catch(function(e) {
        if (!_loadCancelled) { _showPdfRetry(); console.error('PDF load error:', e); }
      });
      self._pdfCleanup = function() {
        _loadCancelled = true;
        try { var _d = lt.destroy(); if (_d && _d.catch) _d.catch(function(){}); } catch(e) {}
        if (_cleanupBeforeLoad) _cleanupBeforeLoad();
      };
    }

    // Try cache first — works offline. On cache miss, download+cache, then open.
    if (window.PdfStore && book.pdf_url) {
      self._pdfCleanup = function() { _loadCancelled = true; if (_cleanupBeforeLoad) _cleanupBeforeLoad(); };
      PdfStore.load(book).then(function(cachedBuf) {
        if (_loadCancelled) return;
        if (cachedBuf) {
          _startLoadingTask(pdfjsLib.getDocument(Object.assign({ data: cachedBuf }, _pdfBaseOpts)));
        } else {
          // Download and cache, showing progress ring
          PdfStore.download(book, function(pct) {
            if (ringWrap && ringWrap.classList.contains('pdf-ring-idle')) {
              ringWrap.classList.remove('pdf-ring-idle');
              arc.classList.add('pdf-ring-progress');
              arc.style.setProperty('stroke-dashoffset', String(CIRC));
              ringIcon.style.display = 'none';
              progressPct.style.display = 'block';
            }
            if (progressPct) progressPct.textContent = pct + '%';
            if (arc) arc.style.setProperty('stroke-dashoffset', (CIRC * (1 - pct / 100)).toFixed(2));
            if (pct >= 100 && arc) arc.classList.add('pdf-ring-done');
          }).then(function(buf) {
            if (_loadCancelled) return;
            _startLoadingTask(pdfjsLib.getDocument(Object.assign({ data: buf }, _pdfBaseOpts)));
            self._refreshBookDlBadges();
          }).catch(function() {
            if (!_loadCancelled) _showPdfRetry();
          });
        }
      }).catch(function() {
        if (!_loadCancelled) _showPdfRetry();
      });
      return; // async path
    }

    // Fallback: no PdfStore, load directly from network
    var pdfSrc = 'https://tafsirkurd.com/pdf-proxy?url=' + encodeURIComponent(book.pdf_url);
    var loadingTask = pdfjsLib.getDocument(Object.assign({ url: pdfSrc }, _pdfBaseOpts));
    function _showPdfRetry() {
      var isOffline = !navigator.onLine;
      while (loadingEl.firstChild) loadingEl.removeChild(loadingEl.firstChild);

      // Icon circle
      var errCircle = document.createElement('div');
      errCircle.style.cssText = 'position:relative;width:110px;height:110px;border-radius:50%;background:var(--bg2);display:flex;align-items:center;justify-content:center;flex-shrink:0';
      var errIco = document.createElement('i');
      errIco.className = isOffline ? 'fas fa-wifi' : 'fas fa-exclamation-triangle';
      errIco.style.cssText = 'font-size:2.4rem;color:' + (isOffline ? 'var(--text-tertiary)' : 'var(--accent)');
      errCircle.appendChild(errIco);
      if (isOffline) {
        var xBadge = document.createElement('div');
        xBadge.style.cssText = 'position:absolute;bottom:8px;right:6px;width:26px;height:26px;border-radius:50%;background:#e74c3c;display:flex;align-items:center;justify-content:center;border:2px solid var(--bg)';
        var xIco = document.createElement('i'); xIco.className = 'fas fa-times'; xIco.style.cssText = 'font-size:.65rem;color:#fff';
        xBadge.appendChild(xIco); errCircle.appendChild(xBadge);
      }
      loadingEl.appendChild(errCircle);

      // Text block
      var txtWrap = document.createElement('div');
      txtWrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:7px;text-align:center;max-width:230px';
      var mainTxt = document.createElement('div');
      mainTxt.style.cssText = 'font-size:1rem;font-weight:700;color:var(--text)';
      mainTxt.textContent = isOffline ? (T('pdf.offline_title','ئینتەرنێت نینە')) : (T('gencine.books_error','خەلەتیەک ڕوویدا'));
      txtWrap.appendChild(mainTxt);
      if (isOffline) {
        var subTxt = document.createElement('div');
        subTxt.style.cssText = 'font-size:.82rem;color:var(--text-tertiary);line-height:1.55';
        subTxt.textContent = T('pdf.offline_sub','ئەڤ پەرتوک هێشتا نەهاتیە داخستن — ئینتەرنێتێ بخستۆ و دووبارە هەوڵ بدە');
        txtWrap.appendChild(subTxt);
      }
      loadingEl.appendChild(txtWrap);

      // Retry button
      var retryBtn = document.createElement('button');
      retryBtn.textContent = T('gencine.retry','دووبارە هەوڵ بدە');
      retryBtn.className = 'btn-primary';
      retryBtn.style.cssText = 'padding:10px 28px;font-size:.95rem;border-radius:14px';
      retryBtn.onclick = function() { self._draw(); };
      loadingEl.appendChild(retryBtn);
    }

    /* Suppress PDF.js "Worker was terminated" unhandled rejections during this session */
    var _pdfWorkerErrHandler = function(ev) {
      if (ev.reason && ev.reason.message === 'Worker was terminated') ev.preventDefault();
    };
    window.addEventListener('unhandledrejection', _pdfWorkerErrHandler);

    /* Abort and show retry if stalled for 20 s with no progress */
    var _loadTimer = setTimeout(function() {
      try { var _ltd = loadingTask.destroy(); if (_ltd && _ltd.catch) _ltd.catch(function(){}); } catch(e3) {}
      _showPdfRetry();
    }, 20000);

    loadingTask.onProgress = function(data) {
      if (data.total > 0) {
        var pct = Math.min(100, Math.round(data.loaded / data.total * 100));
        // First progress tick: switch from idle spinner to progress ring
        if (ringWrap.classList.contains('pdf-ring-idle')) {
          ringWrap.classList.remove('pdf-ring-idle');
          arc.classList.add('pdf-ring-progress');
          arc.style.setProperty('stroke-dashoffset', String(CIRC));
          ringIcon.style.display = 'none';
          progressPct.style.display = 'block';
        }
        progressPct.textContent = pct + '%';
        arc.style.setProperty('stroke-dashoffset', (CIRC * (1 - pct / 100)).toFixed(2));
        if (pct >= 100) arc.classList.add('pdf-ring-done');
        clearTimeout(_loadTimer);
        if (pct < 100) {
          _loadTimer = setTimeout(function() {
            try { var _ltd2 = loadingTask.destroy(); if (_ltd2 && _ltd2.catch) _ltd2.catch(function(){}); } catch(e3) {}
            _showPdfRetry();
          }, 20000);
        }
      }
    };
    // Wire up timeout cleanup and promise for the direct-URL fallback path
    self._pdfCleanup = function() {
      _loadCancelled = true;
      window.removeEventListener('unhandledrejection', _pdfWorkerErrHandler);
      try { var _ltd3 = loadingTask.destroy(); if (_ltd3 && _ltd3.catch) _ltd3.catch(function(){}); } catch(e3) {}
      clearTimeout(_loadTimer);
      if (_cleanupBeforeLoad) _cleanupBeforeLoad();
    };
    loadingTask.promise.then(function(pdf) {
      clearTimeout(_loadTimer);
      if (!_loadCancelled) {
        doLoad(pdf);
        // Cache in background for next time
        if (window.PdfStore && book.pdf_url) PdfStore.download(book, null).then(function(){ self._refreshBookDlBadges(); }).catch(function(){});
      }
    }).catch(function(e) {
      clearTimeout(_loadTimer);
      if (!_loadCancelled) { _showPdfRetry(); console.error('PDF load error:', e); }
    });
  },

  _updateVoiceBtn: function(){
    var btn  = document.getElementById('tasbihVoiceBtn');
    var lbl  = document.getElementById('tasbihVoiceLbl');
    var bars = document.getElementById('tasbihVoiceBars');
    var T    = window.t || function(k,d){ return d||k; };
    if(!btn) return;
    if(this._voiceActive){
      btn.classList.add('on');
      if(lbl)  lbl.textContent = T('gencine.voice_stop','rawestin');
      if(bars){ bars.classList.remove('idle'); bars.classList.add('active'); }
    } else {
      btn.classList.remove('on');
      if(lbl)  lbl.textContent = T('gencine.voice_start','دانگ');
      if(bars){ bars.classList.remove('active'); bars.classList.add('idle'); }
    }
  }
};

})();
