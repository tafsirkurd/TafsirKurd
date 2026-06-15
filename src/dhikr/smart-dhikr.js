/**
 * Smart Daily Companion  v41
 * Variable number of slides — seasonal items each get own slide, never displace card 1:
 *   1. Zikr of current time   (time-aware, always present via fallback)
 *   2+. Seasonal slides       (Dhul Hijjah / Ramadan / Arafat — one slide each when active)
 *   next. Weather slide       (rain/thunder/wind only)
 *   then. Ayah of the day     (Baghdad-seeded, salt 1)
 *   3. Hadith of the day      (Baghdad-seeded, salt 2)
 *   4. Book of the day        (Baghdad-seeded, salt 4)
 *   5. Weather dhikr          (rain when raining, thunder/wind otherwise)
 *
 * Daily cards (2-4) use Asia/Baghdad date as seed (UTC+3, no DST).
 * All users see the same daily cards; refresh at 00:00 Baghdad time.
 */
(function(window) {
  'use strict';

  /* ─────────────────────────────────────────────
     TIME ITEMS  (card 1 — time-aware zikr)
  ───────────────────────────────────────────── */
  var TIME_ITEMS = [
    /* ── Prayer windows (highest priority — override morning/evening) ── */
    {
      id: 'masjid_enter', categoryKey: 'masjid_enter', icon: 'fas fa-mosque',
      labelKey: 'adhkar.masjid_enter', labelFallback: 'چونا مزگەوت',
      subtitleKey: 'gencine.smart.masjid_hint', subtitleFallback: 'کاتا چوونا مزگەوتێ',
      fallbackAr: 'اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ',
      fallbackRepeat: 3,
      fallbackSource: 'مسلم',
      timeTag: 'مزگەفت', basePriority: 90,
      prayerOffset: 0   /* 0–20 min after each athan */
    },
    {
      id: 'after_prayer', categoryKey: 'after_prayer', icon: 'fas fa-hands-praying',
      labelKey: 'adhkar.after_prayer', labelFallback: 'دوای نوێژ',
      subtitleKey: 'gencine.smart.after_prayer_hint', subtitleFallback: 'زکرێن پشتی نڤێژێ',
      fallbackAr: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ',
      fallbackRepeat: 33,
      fallbackSource: 'البخاري ومسلم',
      timeTag: 'پشتی نڤێژێ', basePriority: 85,
      prayerOffset: 20  /* 20–40 min after each athan */
    },

    {
      id: 'morning', categoryKey: 'morning', icon: 'fas fa-sun',
      labelKey: 'adhkar.morning', labelFallback: 'زکرێن بەیانیکردن',
      subtitleKey: 'gencine.smart.morning_hint', subtitleFallback: 'ڕۆژا خوه ب زکرێ دەستپێکە',
      fallbackAr: 'اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا',
      fallbackRepeat: 3,
      fallbackSource: 'أبو داود والترمذي',
      timeTag: 'سپێدە', basePriority: 50,
      timeWindow: { start: 'Fajr', end: 'Dhuhr', fs: 5*60, fe: 11*60+30, wraps: false }
    },
    {
      id: 'waking', categoryKey: 'waking', icon: 'fas fa-cloud-sun',
      labelKey: 'adhkar.waking', labelFallback: 'دوای هاتنا خوو',
      subtitleKey: 'gencine.smart.waking_hint', subtitleFallback: 'پشتی ژ خەو ڕابوونێ بخوێنە',
      fallbackAr: 'الحَمْدُ للَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا',
      fallbackRepeat: 1,
      fallbackSource: 'البخاري',
      timeTag: 'سپێدە', basePriority: 58, /* beats morning when both active (Fajr→Sunrise) */
      timeWindow: { start: 'Fajr', end: 'Sunrise', fs: 5*60, fe: 8*60, wraps: false }
    },
    {
      id: 'sunrise', categoryKey: 'morning', icon: 'fas fa-sun',
      labelKey: 'adhkar.sunrise', labelFallback: 'نوێژا ئیشراق',
      subtitleKey: 'gencine.smart.sunrise_hint', subtitleFallback: 'دەمێ نڤێژا ڕۆژهەلاتنێ',
      timeTag: 'ئیشراق', basePriority: 62, /* beats morning+waking in its window */
      sunriseWindow: { before: 30, after: 30 } /* 30 min before and after Sunrise */
    },
    {
      id: 'evening', categoryKey: 'evening', icon: 'fas fa-moon',
      labelKey: 'adhkar.evening', labelFallback: 'زکرێن ئێواربوون',
      subtitleKey: 'gencine.smart.evening_hint', subtitleFallback: 'ئێوارا خوە ب زکرێ بکە',
      fallbackAr: 'اللَّهُمَّ بِكَ أَمْسَيْنَا وَبِكَ أَصْبَحْنَا',
      fallbackRepeat: 3,
      fallbackSource: 'أبو داود والترمذي',
      timeTag: 'ئێڤار', basePriority: 50,
      timeWindow: { start: 'Asr', end: 'Maghrib', fs: 15*60+30, fe: 19*60, wraps: false }
    },
    {
      id: 'sleep', categoryKey: 'sleep', icon: 'fas fa-bed',
      labelKey: 'adhkar.sleep', labelFallback: 'بەرى نڤستنێ',
      subtitleKey: 'gencine.smart.sleep_hint', subtitleFallback: 'پێش خەوکردنێ بخوێنە',
      fallbackAr: 'بِاسْمِكَ اللَّهُمَّ أَموُتُ وَأَحْيَا',
      fallbackRepeat: 3,
      fallbackSource: 'البخاري ومسلم',
      timeTag: 'شەڤ', basePriority: 50,
      timeWindow: { start: 'Isha', end: 'Fajr', fs: 21*60, fe: 5*60, wraps: true }
    },
    {
      id: 'friday', categoryKey: 'friday', icon: 'fas fa-calendar-day',
      labelKey: 'adhkar.friday', labelFallback: 'ڕۆژا ئینانێ',
      subtitleKey: 'gencine.smart.friday_hint', subtitleFallback: 'ئەڤڕۆ ڕۆژا ئینیێ یە',
      fallbackRepeat: 1,
      fallbackSource: 'أبو داود',
      timeTag: 'ئەینی', basePriority: 65, /* intentionally beats morning/evening on Friday */
      dayBoostDays: [5]
    },
    {
      id: 'salawat', categoryKey: 'salawat', icon: 'fas fa-star-and-crescent',
      labelKey: 'adhkar.salawat', labelFallback: 'صەڵەوات',
      subtitleKey: 'gencine.smart.salawat_hint', subtitleFallback: 'صەڵەواتێ بکە سەر پێغەمبەر \uFDFA',
      timeTag: null, basePriority: 60, /* beats morning/evening but loses to friday */
      fallbackRepeat: 10,
      fallbackSource: 'مسلم',
      dayBoostDays: [5],
      thursdayNightBoost: true
    },

  ];

  /* ─────────────────────────────────────────────
     SEASONAL ITEMS  — added as extra slides, never replace card 1
     Each active seasonal item gets its own dedicated slide inserted
     after the regular zikr slide so nothing is displaced.
  ───────────────────────────────────────────── */
  var SEASONAL_ITEMS = [
    /* ── Ramadan ── */
    {
      id: 'fasting', categoryKey: 'fasting', icon: 'fas fa-moon',
      labelKey: 'adhkar.fasting', labelFallback: 'نیەتا ڕۆژوو',
      subtitleKey: 'gencine.smart.fasting_hint', subtitleFallback: 'ڕۆژیبوونا تە خودێ قەبیل بکەت',
      fallbackAr: 'اللَّهُمَّ لَكَ صُمْتُ وَعَلَى رِزْقِكَ أَفْطَرْتُ',
      fallbackRepeat: 1,
      fallbackSource: 'أبو داود',
      timeTag: 'ڕەمەزان',
      hijriCond: function(h, nowMin, fajrMin, maghribMin) {
        return h.month === 9 && nowMin >= fajrMin && nowMin < maghribMin;
      }
    },
    {
      id: 'breaking_fast', categoryKey: 'breaking_fast', icon: 'fas fa-utensils',
      labelKey: 'adhkar.breaking_fast', labelFallback: 'کاتا ئیفتارێ',
      subtitleKey: 'gencine.smart.breaking_fast_hint', subtitleFallback: 'ڕۆژیا تە یا ب تام بیت',
      fallbackAr: 'اللَّهُمَّ إِنِّي لَكَ صُمْتُ وَبِكَ آمَنْتُ',
      fallbackRepeat: 1,
      fallbackSource: 'أبو داود والترمذي',
      timeTag: 'فتارە',
      hijriCond: function(h, nowMin, fajrMin, maghribMin) {
        return h.month === 9 && nowMin >= maghribMin && nowMin < maghribMin + 45;
      }
    },
    {
      id: 'lailat_qadr', categoryKey: 'lailat_qadr', icon: 'fas fa-star',
      labelKey: 'adhkar.lailat_qadr', labelFallback: 'شەوا قەدرێ',
      subtitleKey: 'gencine.smart.lailat_qadr_hint', subtitleFallback: 'شەوا هەزار مانگ',
      fallbackAr: 'اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي',
      fallbackRepeat: 1,
      fallbackSource: 'الترمذي',
      timeTag: 'شەڤا قەدرێ',
      hijriCond: function(h, nowMin, fajrMin, maghribMin) {
        if (h.month !== 9) return false;
        var isNight = nowMin >= maghribMin || nowMin < fajrMin;
        if (h.day >= 21 && h.day <= 29 && isNight) return true;
        if (h.day === 20 && nowMin >= maghribMin)   return true;
        return false;
      }
    },
    /* ── Dhul Hijjah ── */
    {
      id: 'dhul_hijjah', categoryKey: 'dhul_hijjah', icon: 'fas fa-kaaba',
      labelKey: 'adhkar.dhul_hijjah', labelFallback: 'دەیا ذولحیجەیێ',
      subtitleKey: 'gencine.smart.dhul_hijjah_hint', subtitleFallback: 'دەهـ ڕۆژێن مەزن',
      fallbackAr: 'سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ وَلَا إِلَهَ إِلَّا اللَّهُ وَاللَّهُ أَكْبَرُ',
      fallbackRepeat: 100,
      fallbackSource: 'البخاري',
      timeTag: 'ذوالحیجە',
      hijriCond: function() { var d = _getDhulHijjahDay(); return d >= 1 && d <= 8; }
    },
    {
      id: 'arafat', categoryKey: 'arafat', icon: 'fas fa-kaaba',
      labelKey: 'adhkar.arafat', labelFallback: 'دوعای عەرەفاتێ',
      subtitleKey: 'gencine.smart.arafat_hint', subtitleFallback: 'باشترین ڕۆژی ساڵ',
      fallbackAr: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ',
      fallbackRepeat: 1,
      fallbackSource: 'مالك والترمذي',
      timeTag: 'عەرەفە',
      hijriCond: function() { return _getDhulHijjahDay() === 9; }
    }
  ];

  /* ─────────────────────────────────────────────
     WEATHER ITEMS  (card 5 — dedicated weather slide)
     Rain when raining, otherwise thunder or wind as fallback.
  ───────────────────────────────────────────── */
  var WEATHER_ITEMS = [
    {
      id: 'rain', categoryKey: 'rain', icon: 'fas fa-cloud-rain',
      labelKey: 'adhkar.rain', labelFallback: 'باران',
      subtitleKey: 'gencine.smart.rain_hint', subtitleFallback: 'باران دکەت — دوعا بکە',
      fallbackAr: 'اللَّهُمَّ صَيِّبًا نَافِعًا',
      fallbackRepeat: 1,
      fallbackSource: 'البخاري',
      timeTag: 'باران'
    },
    {
      id: 'thunder', categoryKey: 'thunder', icon: 'fas fa-bolt',
      labelKey: 'adhkar.thunder', labelFallback: 'کاتا برووسکێ',
      subtitleKey: 'gencine.smart.thunder_hint', subtitleFallback: 'زکرێن هەورووبرووسکە',
      fallbackAr: 'سُبْحَانَ الَّذِي يُسَبِّحُ الرَّعْدُ بِحَمْدِهِ',
      fallbackRepeat: 1,
      fallbackSource: 'الموطأ',
      timeTag: 'هەوا'
    },
    {
      id: 'wind', categoryKey: 'wind', icon: 'fas fa-wind',
      labelKey: 'adhkar.wind', labelFallback: 'کاتا هەوایی',
      subtitleKey: 'gencine.smart.wind_hint', subtitleFallback: 'زکرێن کاتی باد',
      fallbackAr: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَهَا وَخَيْرَ مَا فِيهَا',
      fallbackRepeat: 1,
      fallbackSource: 'أبو داود',
      timeTag: 'هەوا'
    }
  ];

  /* Fallback pool — used when no time window is active (e.g. midday weekday).
     Picked by daily seed → same all day, changes tomorrow.
     8 items = 8-day cycle. after_prayer removed (covered by prayer window). */
  var FALLBACK_ZIKR = [
    {
      id: 'forgiveness', categoryKey: 'forgiveness', icon: 'fas fa-dove',
      labelKey: 'adhkar.forgiveness', labelFallback: 'داواکاری لێبوردن',
      subtitleKey: 'gencine.smart.forgiveness_hint', subtitleFallback: 'ئیستیغفارەکە زیادە بکە',
      fallbackAr: 'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ',
      fallbackRepeat: 3,
      fallbackSource: 'البخاري ومسلم',
      timeTag: null
    },
    {
      id: 'protection', categoryKey: 'protection', icon: 'fas fa-shield-halved',
      labelKey: 'adhkar.protection', labelFallback: 'پاراستن',
      subtitleKey: 'gencine.smart.protection_hint', subtitleFallback: 'زکرێن پاراستن و حەمایەتێ',
      fallbackAr: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ',
      fallbackRepeat: 3,
      fallbackSource: 'أبو داود والترمذي',
      timeTag: null
    },
    {
      id: 'salawat', categoryKey: 'salawat', icon: 'fas fa-star-and-crescent',
      labelKey: 'adhkar.salawat', labelFallback: 'صەڵەوات',
      subtitleKey: 'gencine.smart.salawat_hint', subtitleFallback: 'صەڵەواتێ بکە سەر پێغەمبەر \uFDFA',
      fallbackAr: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ',
      fallbackRepeat: 10,
      fallbackSource: 'مسلم',
      timeTag: null
    },
    {
      id: 'gratitude', categoryKey: 'gratitude', icon: 'fas fa-star',
      labelKey: 'adhkar.gratitude', labelFallback: 'سوپاسگوزاری',
      subtitleKey: 'gencine.smart.gratitude_hint', subtitleFallback: 'سوپاسا خواێ بکە',
      fallbackAr: 'الْحَمْدُ لِلَّهِ الَّذِي بِنِعْمَتِهِ تَتِمُّ الصَّالِحَاتُ',
      fallbackRepeat: 3,
      fallbackSource: 'ابن ماجه',
      timeTag: null
    },
    {
      id: 'before_quran', categoryKey: 'before_quran', icon: 'fas fa-book-open-reader',
      labelKey: 'adhkar.before_quran', labelFallback: 'بەری خوێندنا قورئانێ',
      subtitleKey: 'gencine.smart.before_quran_hint', subtitleFallback: 'پێش دەستپێکردنا قورئانێ',
      fallbackAr: 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ',
      fallbackRepeat: 1,
      fallbackSource: 'البخاري',
      timeTag: null
    },
    {
      id: 'distress', categoryKey: 'distress', icon: 'fas fa-hand-holding-heart',
      labelKey: 'adhkar.distress', labelFallback: 'پەریشانی',
      subtitleKey: 'gencine.smart.distress_hint', subtitleFallback: 'دوعا لە کاتی زەحمەت',
      fallbackAr: 'لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ',
      fallbackRepeat: 3,
      fallbackSource: 'الترمذي',
      timeTag: null
    },
    {
      id: 'istikhara', categoryKey: 'istikhara', icon: 'fas fa-compass',
      labelKey: 'adhkar.istikhara', labelFallback: 'دوعای ئیستیخارە',
      subtitleKey: 'gencine.smart.istikhara_hint', subtitleFallback: 'داواکاری ڕێنمایی',
      fallbackAr: 'اللَّهُمَّ إِنِّي أَسْتَخِيرُكَ بِعِلْمِكَ وَأَسْتَقْدِرُكَ بِقُدْرَتِكَ',
      fallbackRepeat: 1,
      fallbackSource: 'البخاري',
      timeTag: null
    },
    {
      id: 'adhan', categoryKey: 'adhan', icon: 'fas fa-bullhorn',
      labelKey: 'adhkar.adhan', labelFallback: 'دوای ئەزان',
      subtitleKey: 'gencine.smart.adhan_hint', subtitleFallback: 'دوعایا پشتی بانگی',
      fallbackAr: 'اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ وَالصَّلَاةِ الْقَائِمَةِ',
      fallbackRepeat: 1,
      fallbackSource: 'البخاري',
      timeTag: null
    }
  ];

  /* ─────────────────────────────────────────────
     SURAH DATA
  ───────────────────────────────────────────── */
  var SURAH_NAMES = [
    'فاتحە','بەقەرە','ئالی عیمران','نیسا','مائیدە','ئەنعام','ئەعراف','ئەنفال',
    'توبە','یونس','هود','یوسف','ڕەعد','ئیبراهیم','حیجر','نەحل','ئیسرا','کەهف',
    'مەریەم','تاها','ئەنبیا','حەج','مومینون','نور','فورقان','شوعەرا','نەمل',
    'قەسەس','عەنکەبوت','ڕوم','لوقمان','سەجدە','ئەحزاب','سەبا','فاتیر','یاسین',
    'سافات','ساد','زومەر','غافیر','فوسیلەت','شورا','زوخروف','دوخان','جاسیە',
    'ئەحقاف','موحەممەد','فەتح','حوجورات','قاف','زاریات','تور','نەجم','قەمەر',
    'ڕەحمان','واقیعە','حەدید','موجادیلە','حەشر','مومتەحینە','سەف','جومعە',
    'موناقیقون','تەغابون','تەلاق','تەحریم','مولک','قەلەم','هاققە','مەعاریج',
    'نوح','جین','موزەممیل','موددەسیر','قیامەت','ئینسان','موڕسەلات','نەبا',
    'نازیعات','عەبەسە','تەکویر','ئینفیتار','موتەففیفین','ئینشیقاق','بوروج',
    'تارق','ئەعلا','غاشیە','فەجر','بەلەد','شەمس','لێل','دوحا','شەرح','تین',
    'عەلەق','قەدر','بەیینە','زەلزەلە','عادیات','قارعە','تەکاسور','عەسر',
    'هومەزە','فیل','قورێش','ماعون','کەوسەر','کافیرون','نەسر','مەسەد','ئیخلاس',
    'فەلەق','ناس'
  ];
  var SURAH_NAMES_AR = [
    'الفاتحة','البقرة','آل عمران','النساء','المائدة','الأنعام','الأعراف','الأنفال',
    'التوبة','يونس','هود','يوسف','الرعد','إبراهيم','الحجر','النحل','الإسراء','الكهف',
    'مريم','طه','الأنبياء','الحج','المؤمنون','النور','الفرقان','الشعراء','النمل',
    'القصص','العنكبوت','الروم','لقمان','السجدة','الأحزاب','سبأ','فاطر','يس',
    'الصافات','ص','الزمر','غافر','فصلت','الشورى','الزخرف','الدخان','الجاثية',
    'الأحقاف','محمد','الفتح','الحجرات','ق','الذاريات','الطور','النجم','القمر',
    'الرحمن','الواقعة','الحديد','المجادلة','الحشر','الممتحنة','الصف','الجمعة',
    'المنافقون','التغابن','الطلاق','التحريم','الملك','القلم','الحاقة','المعارج',
    'نوح','الجن','المزمل','المدثر','القيامة','الإنسان','المرسلات','النبأ',
    'النازعات','عبس','التكوير','الانفطار','المطففين','الانشقاق','البروج',
    'الطارق','الأعلى','الغاشية','الفجر','البلد','الشمس','الليل','الضحى','الشرح','التين',
    'العلق','القدر','البينة','الزلزلة','العاديات','القارعة','التكاثر','العصر',
    'الهمزة','الفيل','قريش','الماعون','الكوثر','الكافرون','النصر','المسد','الإخلاص',
    'الفلق','الناس'
  ];
  var SURAH_SIZES = [
    7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,
    112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,
    59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,
    52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,
    11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6
  ];

  /* ─────────────────────────────────────────────
     HIJRI CALENDAR  (tabular / civil algorithm)
     Pass _baghdadDate() so day changes at Baghdad midnight.
  ───────────────────────────────────────────── */

  /**
   * Returns the current day number within Dhul Hijjah (1–30),
   * or -1 if today is not in Dhul Hijjah.
   *
   * Priority: admin-set multi-year map from site_settings
   *   key: hajj_dhul_hijjah_dates — JSON string, e.g.:
   *   {"2025":"2025-05-28","2026":"2026-05-18","2027":"2027-05-07",...}
   *   Admin updates the current year's entry each year from
   *   islamicreliefcanada.org/resources/islamic-calendar after moon sighting.
   *
   * Fallback: tabular Hijri algorithm (may be ±1 day off actual sighting).
   */
  function _getDhulHijjahDay() {
    try {
      var ss   = JSON.parse(localStorage.getItem('siteSettings_v6'));
      var raw  = ss && ss.d && ss.d.hajj_dhul_hijjah_dates;
      if (raw) {
        var map  = (typeof raw === 'string') ? JSON.parse(raw) : raw;
        var baghdad = _baghdadDate();
        var year = String(baghdad.getUTCFullYear());
        var d1   = map[year]; /* "YYYY-MM-DD" */
        if (d1) {
          var bISO = year + '-'
            + String(baghdad.getUTCMonth() + 1).padStart(2, '0') + '-'
            + String(baghdad.getUTCDate()).padStart(2, '0');
          var diffDays = Math.round(
            (new Date(bISO).getTime() - new Date(d1).getTime()) / 86400000
          );
          if (diffDays >= 0 && diffDays < 30) return diffDays + 1; /* 1-indexed */
          return -1; /* outside Dhul Hijjah window */
        }
      }
    } catch(e) {}
    /* Fallback: tabular algorithm */
    var h = _toHijri(_baghdadDate());
    return (h.month === 12) ? h.day : -1;
  }

  function _toHijri(date) {
    var y = date.getUTCFullYear(), m = date.getUTCMonth() + 1, d = date.getUTCDate();
    var a = Math.floor((14 - m) / 12);
    var yy = y + 4800 - a, mm = m + 12 * a - 3;
    var jdn = d + Math.floor((153 * mm + 2) / 5) + 365 * yy +
              Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
    var l = jdn - 1948440 + 10632;
    var n = Math.floor((l - 1) / 10631);
    l = l - 10631 * n + 354;
    var j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
            Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
    l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
        Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
    return {
      year:  30 * n + j - 30,
      month: Math.floor((24 * l) / 709),
      day:   l - Math.floor((709 * Math.floor((24 * l) / 709)) / 24)
    };
  }

  /* ─────────────────────────────────────────────
     WEATHER DETECTION  (Duhok: 36.87°N 42.95°E)
     3 independent sources fetched in parallel.
     Majority vote wins; if 2+ agree → use that.
     If all fail → keep last cached result.
     Cache TTL: 30 min (fresh enough, not spammy).

     Condition values:
       'rain'      — precipitation / drizzle / showers
       'snow'      — snowfall / sleet / ice pellets
       'thunder'   — thunderstorm
       'wind'      — high wind (≥ 40 km/h), no precip
       'clear'     — nothing notable
  ───────────────────────────────────────────── */
  var _RAIN_KEY = 'sd_rain_v4';
  var _RAIN_TTL = 30 * 60 * 1000; /* 30 min — weather changes slowly; reduces API pressure */
  /* clean up orphaned old cache keys */
  try { localStorage.removeItem('sd_rain_v3'); localStorage.removeItem('sd_rain_v2'); localStorage.removeItem('sd_rain_v1'); } catch(e) {}


  /* Weather-code → condition classifier (WMO codes, Open-Meteo scale) */
  function _classifyCode(code, prec, windspeed) {
    code = code || 0; prec = prec || 0; windspeed = windspeed || 0;
    if (code >= 95) return 'thunder';                                    /* 95-99 thunderstorm    */
    if (code === 71 || code === 73 || code === 75 || code === 77 ||
        code === 85 || code === 86 || code === 56 || code === 57 ||
        code === 66 || code === 67) return 'snow';                       /* snow / freezing rain  */
    if (prec >= 0.1 || (code >= 51 && code <= 82)) return 'rain';       /* ≥0.1mm or rain codes  */
    if (windspeed >= 40) return 'wind';                                  /* strong wind, no precip*/
    return 'clear';
  }

  function _isRaining() {
    try {
      var c = JSON.parse(localStorage.getItem(_RAIN_KEY));
      if (c && (Date.now() - c.ts) < _RAIN_TTL) return c.condition === 'rain' || c.condition === 'snow' || c.condition === 'thunder';
    } catch(e) {}
    return false;
  }

  /* Returns cached condition or 'clear' if cache is fresh */
  function _getWeatherCondition() {
    try {
      var c = JSON.parse(localStorage.getItem(_RAIN_KEY));
      if (c && (Date.now() - c.ts) < _RAIN_TTL) return c.condition || 'clear';
    } catch(e) {}
    return 'clear';
  }

  /* Shared Open-Meteo parser — same WMO weather_code scale for all models */
  function _omFetch(url) {
    return fetch(url).then(function(r){return r.json();}).then(function(d){
      var c = d.current || {};
      return _classifyCode(c.weather_code, c.precipitation, c.wind_speed_10m);
    }).catch(function(){return null;});
  }

  /* wttr.in parser (JSON v1) — works for both city-name and coord URLs */
  var _WTTR_SNOW = {179:1,227:1,230:1,323:1,326:1,329:1,332:1,335:1,338:1,350:1,362:1,365:1,368:1,371:1,374:1,377:1};
  function _wttrFetch(url) {
    return fetch(url).then(function(r){return r.json();}).then(function(d){
      var cur = (d.current_condition && d.current_condition[0]) || {};
      var code = parseInt(cur.weatherCode || '0', 10);
      var prec = parseFloat(cur.precipMM || '0');
      var wind = parseFloat(cur.windspeedKmph || '0');
      if (code === 392 || code === 395) return 'thunder';         /* snow with thunder */
      if (code >= 200 && code < 300) return 'thunder';
      if (_WTTR_SNOW[code]) return 'snow';
      if (prec >= 0.1 || (code >= 300 && code < 600)) return 'rain';
      if (wind >= 40) return 'wind';
      return 'clear';
    }).catch(function(){return null;});
  }

  var _OM = 'https://api.open-meteo.com/v1/forecast?latitude=36.87&longitude=42.95&current=precipitation,weather_code,wind_speed_10m&timezone=Asia%2FBaghdad&forecast_days=1';

  var _fetchRainInProgress = false;
  var _fetchRainFailTs = 0;
  var _RAIN_FAIL_COOLDOWN = 5 * 60 * 1000; /* 5 min backoff after all sources fail */
  function _fetchRain() {
    try {
      var c = JSON.parse(localStorage.getItem(_RAIN_KEY));
      if (c && (Date.now() - c.ts) < _RAIN_TTL) return; /* cache fresh */
    } catch(e) {}
    if (_fetchRainInProgress) return;
    if (_fetchRainFailTs && (Date.now() - _fetchRainFailTs) < _RAIN_FAIL_COOLDOWN) return;
    _fetchRainInProgress = true;

    /* 4 independent sources — 1 Open-Meteo (auto model), wttr.in ×2,
       Norwegian Met Office. Reduced from 6 Open-Meteo model variants
       to avoid 429 burst-rate errors on the free tier.               */

    /* Source 1 — Open-Meteo auto-model (best regional blend) */
    var s1 = _omFetch(_OM);

    /* Source 2 — wttr.in by city name */
    var s2 = _wttrFetch('https://wttr.in/Duhok?format=j1');

    /* Source 3 — wttr.in by exact Duhok coordinates */
    var s3 = _wttrFetch('https://wttr.in/36.87,42.95?format=j1');

    /* Source 4 — Norwegian Met Office (fully independent provider) */
    var s4 = fetch('https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=36.87&lon=42.95',
        { headers: { 'User-Agent': 'TafsirKurdApp/1.0 tefsirkurd@gmail.com' } })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        var ts   = (d.properties && d.properties.timeseries && d.properties.timeseries[0]) || {};
        var inst = (ts.data && ts.data.instant && ts.data.instant.details) || {};
        var n1h  = (ts.data && ts.data.next_1_hours) || {};
        var sym  = (n1h.summary && n1h.summary.symbol_code) || '';
        var prec = (n1h.details && n1h.details.precipitation_amount) || 0;
        var wind = inst.wind_speed || 0; /* m/s */
        if (sym.indexOf('thunder') !== -1) return 'thunder';
        if (sym.indexOf('snow') !== -1 || sym.indexOf('sleet') !== -1) return 'snow';
        if (sym.indexOf('rain') !== -1 || sym.indexOf('shower') !== -1 || sym.indexOf('drizzle') !== -1 || prec >= 0.1) return 'rain';
        if (wind >= 11) return 'wind'; /* 11 m/s ≈ 40 km/h */
        return 'clear';
      }).catch(function() { return null; });

    Promise.all([s1, s2, s3, s4]).then(function(results) {
      _fetchRainInProgress = false;
      /* Filter out nulls (failed sources) */
      var valid = results.filter(function(r) { return r !== null; });
      if (!valid.length) { _fetchRainFailTs = Date.now(); return; } /* all failed — back off */

      /* Majority vote across 4 sources (Open-Meteo auto, wttr.in ×2, Norwegian Met).
         Any condition reported by ≥2 sources wins.
         Priority if tied: thunder > snow > rain > wind. */
      var counts = {};
      valid.forEach(function(cond) { counts[cond] = (counts[cond] || 0) + 1; });
      var THRESHOLD = 2; /* 2 of 4 independent sources must agree */
      var winner = 'clear';
      ['wind', 'rain', 'snow', 'thunder'].forEach(function(cond) { /* ascending priority */
        if ((counts[cond] || 0) >= THRESHOLD) winner = cond;
      });

      /* Read old condition before overwriting — used to detect a change */
      var prevCondition = null;
      try {
        var _prev = JSON.parse(localStorage.getItem(_RAIN_KEY));
        if (_prev) prevCondition = _prev.condition;
      } catch(e3) {}

      try {
        localStorage.setItem(_RAIN_KEY, JSON.stringify({
          ts: Date.now(),
          condition: winner,
          sources: results  /* debug: what each source returned */
        }));
      } catch(e2) {}

      /* If weather changed, bust the section cache so the next render picks
         up the new card set. If gencine home is currently visible, re-draw
         immediately so the weather slide appears without a manual refresh. */
      if (winner !== prevCondition) {
        clearCache();
        if (window.GencineUI && GencineUI._view === 'home') {
          setTimeout(function() {
            if (window.GencineUI && GencineUI._view === 'home') GencineUI._draw();
          }, 150);
        }
      }
    }).catch(function() { _fetchRainInProgress = false; });
  }

  /* ─────────────────────────────────────────────
     TIME HELPERS
  ───────────────────────────────────────────── */
  function _toMin(hhmm) {
    if (!hhmm || typeof hhmm !== 'string') return -1;
    var p = hhmm.split(':');
    return p.length < 2 ? -1 : parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
  }

  function _todayISO() {
    var d = new Date();
    return d.getFullYear()
      + '-' + String(d.getMonth() + 1).padStart(2, '0')
      + '-' + String(d.getDate()).padStart(2, '0');
  }

  function _inRange(cur, s, e, wraps) {
    if (s < 0 || e < 0) return false;
    return wraps ? (cur >= s || cur < e) : (cur >= s && cur < e);
  }

  /* Baghdad date (Asia/Baghdad = UTC+3, no DST).
     Shift now by +3 h then read the UTC fields — equivalent to
     reading local date in Baghdad.  Same result for every user
     on the same Baghdad calendar day; changes at 00:00 Baghdad. */
  var _BAGHDAD_OFFSET_MS = 3 * 60 * 60 * 1000;   /* UTC+3, fixed */

  function _baghdadDate() {
    return new Date(Date.now() + _BAGHDAD_OFFSET_MS);
  }

  function _daySeed() {
    var d = _baghdadDate();
    return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
  }

  /* Deterministic daily index — same result all day, changes next day */
  function _seededIdx(length, salt) {
    if (!length) return 0;
    return Math.abs(_daySeed() * 31 + salt * 7919) % length;
  }

  /* ─────────────────────────────────────────────
     PRAYER TIMES
  ───────────────────────────────────────────── */
  function _getPrayerTimings() {
    try {
      var city   = localStorage.getItem('prayerCity')   || 'Duhok';
      var method = parseInt(localStorage.getItem('prayerMethod') || '13', 10);
      var today  = new Date();
      var dayNum = String(today.getDate());
      var mk = 'prayer-kurd2:' + city + ':' + today.getFullYear() + ':' + (today.getMonth() + 1);
      var monthly = JSON.parse(localStorage.getItem(mk));
      if (monthly && monthly.days && monthly.days[dayNum] && monthly.days[dayNum].Fajr)
        return monthly.days[dayNum];
      var dk = 'prayer3:' + city + ':' + method + ':' + _todayISO();
      var daily = JSON.parse(localStorage.getItem(dk));
      if (daily && daily.timings && daily.timings.Fajr) return daily.timings;
    } catch(e) {}
    return null;
  }

  /* ─────────────────────────────────────────────
     STATE / STREAKS
  ───────────────────────────────────────────── */
  var _STATE_KEY = 'sd_daily_v1';

  function _getState() {
    try {
      var raw = JSON.parse(localStorage.getItem(_STATE_KEY));
      if (raw && raw.date === _todayISO()) return raw;
    } catch(e) {}
    return { date: _todayISO(), opened: [], completed: [] };
  }

  function _saveState(s) {
    try { localStorage.setItem(_STATE_KEY, JSON.stringify(s)); } catch(e) {}
  }

  function _markOpened(id) {
    var s = _getState();
    if (s.opened.indexOf(id) < 0) s.opened.push(id);
    _saveState(s);
  }

  function _markCompleted(id) {
    var s = _getState();
    if (s.completed.indexOf(id) < 0) s.completed.push(id);
    if (s.opened.indexOf(id)    < 0) s.opened.push(id);
    _saveState(s);
    _updateStreak(id);
  }

  function _getStreak(id) {
    try { return JSON.parse(localStorage.getItem('sd_streak_' + id)) || { count: 0, lastDate: null }; }
    catch(e) { return { count: 0, lastDate: null }; }
  }

  function _updateStreak(id) {
    var streak = _getStreak(id);
    var today  = _todayISO();
    if (streak.lastDate === today) return streak;
    var prev = new Date(Date.now() - 86400000);
    var yest  = prev.getFullYear() + '-'
      + String(prev.getMonth() + 1).padStart(2, '0') + '-'
      + String(prev.getDate()).padStart(2, '0');
    streak.count    = (streak.lastDate === yest) ? streak.count + 1 : 1;
    streak.lastDate = today;
    try { localStorage.setItem('sd_streak_' + id, JSON.stringify(streak)); } catch(e) {}
    return streak;
  }

  /* ─────────────────────────────────────────────
     CATEGORY DATA CHECK
  ───────────────────────────────────────────── */
  function _catHasData(catKey) {
    try {
      var cached = JSON.parse(localStorage.getItem('gencine_adhkar_v1'));
      if (!cached || !Array.isArray(cached)) return true;
      return cached.some(function(a) { return a.category_key === catKey && a.active !== false; });
    } catch(e) { return true; }
  }

  /* ─────────────────────────────────────────────
     TIME-ACTIVE CHECK
  ───────────────────────────────────────────── */
  function _isTimeActive(item, nowMin, dow, prayers, maghribMin, fajrMin) {
    if (item.timeWindow) {
      var tw = item.timeWindow;
      var ts = (prayers && _toMin(prayers[tw.start]) >= 0) ? _toMin(prayers[tw.start]) : tw.fs;
      var te = (prayers && _toMin(prayers[tw.end])   >= 0) ? _toMin(prayers[tw.end])   : tw.fe;
      return _inRange(nowMin, ts, te, tw.wraps);
    }
    /* sunriseWindow: active N min before and after Sunrise */
    if (item.sunriseWindow) {
      var sr = prayers ? _toMin(prayers['Sunrise']) : -1;
      if (sr >= 0) {
        var srStart = (sr - item.sunriseWindow.before + 24 * 60) % (24 * 60);
        var srEnd   = (sr + item.sunriseWindow.after) % (24 * 60);
        return _inRange(nowMin, srStart, srEnd, false);
      }
      return false;
    }
    /* prayerOffset: active for 20 min starting `offset` minutes after each of the 5 prayers */
    if (item.prayerOffset !== undefined) {
      var PRAYERS = ['Fajr','Dhuhr','Asr','Maghrib','Isha'];
      for (var pi = 0; pi < PRAYERS.length; pi++) {
        var base = prayers ? _toMin(prayers[PRAYERS[pi]]) : -1;
        if (base < 0) continue;
        var ws = (base + item.prayerOffset) % (24 * 60);
        var we = (ws + 20) % (24 * 60);
        var wraps = we < ws;
        if (_inRange(nowMin, ws, we, wraps)) return true;
      }
      return false;
    }
    if (item.dayBoostDays && item.dayBoostDays.indexOf(dow) >= 0) return true;
    if (item.thursdayNightBoost && dow === 4 && nowMin >= maghribMin) return true;
    if (item.hijriCond) {
      var h = _toHijri(_baghdadDate());
      return item.hijriCond(h, nowMin, fajrMin, maghribMin);
    }
    if (item.rainCond) return _isRaining();
    return false;
  }

  function _scoreItem(item, state) {
    var s = item.basePriority || 50;
    if (state.completed.indexOf(item.id) >= 0) s -= 60;
    if (state.opened.indexOf(item.id)    >= 0) s -= 15;
    return s;
  }

  /* ─────────────────────────────────────────────
     CARD 1 — ZIKR OF CURRENT TIME
     Always returns exactly one item.
     Priority: time-active window > daily-seeded fallback.
  ───────────────────────────────────────────── */
  function _getZikrItem() {
    _fetchRain(); /* background refresh — never blocks rendering */

    var now        = new Date();
    var nowMin     = now.getHours() * 60 + now.getMinutes();
    var dow        = now.getDay();
    var prayers    = _getPrayerTimings();
    var maghribMin = (prayers && _toMin(prayers.Maghrib) >= 0) ? _toMin(prayers.Maghrib) : 18 * 60;
    var fajrMin    = (prayers && _toMin(prayers.Fajr)    >= 0) ? _toMin(prayers.Fajr)    :  5 * 60;
    var state      = _getState();

    var active = TIME_ITEMS
      .filter(function(item) {
        return _catHasData(item.categoryKey) && _isTimeActive(item, nowMin, dow, prayers, maghribMin, fajrMin);
      })
      .map(function(item) { return { item: item, score: _scoreItem(item, state) }; })
      .sort(function(a, b) { return b.score - a.score; });

    var fallback = FALLBACK_ZIKR[_seededIdx(FALLBACK_ZIKR.length, 3)];

    /* If the top winner is a prayer-offset item already completed today,
       yield to fallback — user already read it, no point repeating it
       just because they opened the app again within the same window.      */
    var winner = active.length ? active[0].item : null;
    var winnerExhausted = winner
      && winner.prayerOffset !== undefined
      && state.completed.indexOf(winner.id) >= 0;

    /* ── Debug log ── */
    try {
      var dbgT = now.getHours() + ':' + String(now.getMinutes()).padStart(2,'0');
      if (active.length) {
        console.log('[SmartZikr] ' + dbgT + ' — candidates:');
        active.forEach(function(c) {
          var mark = (!winnerExhausted && c === active[0]) ? '✓' : ' ';
          console.log('  ' + mark + ' ' + c.item.id + ' score=' + c.score);
        });
        if (winnerExhausted) {
          console.log('[SmartZikr] winner ' + winner.id + ' already completed → fallback: ' + fallback.id);
        } else {
          console.log('[SmartZikr] winner → ' + winner.id);
        }
      } else {
        console.log('[SmartZikr] ' + dbgT + ' — no active window → fallback: ' + fallback.id);
      }
    } catch(e) {}

    if (!active.length || winnerExhausted) return fallback;
    return winner;
  }

  /* ─────────────────────────────────────────────
     CARD 5 — WEATHER DHIKR
     Condition from multi-source vote:
       thunder → thunder dhikr
       rain    → rain dhikr
       wind    → wind dhikr
       clear   → rotate thunder/wind by daily seed
     Slide hidden only if the chosen category has no adhkar data at all.
  ───────────────────────────────────────────── */
  function _getWeatherItem() {
    _fetchRain(); /* background refresh — never blocks rendering */
    var condition = _getWeatherCondition();

    /* Map condition → preferred WEATHER_ITEMS index */
    var preferred;
    if (condition === 'thunder') preferred = WEATHER_ITEMS[1];  /* thunder */
    else if (condition === 'rain') preferred = WEATHER_ITEMS[0]; /* rain    */
    else if (condition === 'wind') preferred = WEATHER_ITEMS[2]; /* wind    */
    else {
      /* clear sky — rotate thunder/wind by daily seed (salt 6) */
      var fallbacks = [WEATHER_ITEMS[1], WEATHER_ITEMS[2]];
      var start = _seededIdx(fallbacks.length, 6);
      preferred = fallbacks[start];
    }

    /* Use preferred if it has data */
    if (_catHasData(preferred.categoryKey)) return preferred;

    /* Preferred has no data — try other weather items */
    for (var i = 0; i < WEATHER_ITEMS.length; i++) {
      if (WEATHER_ITEMS[i] !== preferred && _catHasData(WEATHER_ITEMS[i].categoryKey)) {
        return WEATHER_ITEMS[i];
      }
    }
    /* No weather adhkar in cache at all — hide the slide */
    return null;
  }

  /* ─────────────────────────────────────────────
     CARD 2 — AYAH OF THE DAY  (salt 1)
     Always available — no network needed.
  ───────────────────────────────────────────── */
  function _getAyahAr(s, a) {
    try {
      var qd = window.S && window.S.quranData && window.S.quranData[String(s)];
      if (!qd) return '';
      var vv = qd.verses || qd;
      var txt = String((vv[a - 1] && (vv[a - 1].text || vv[a - 1])) || '').trim();
      return txt.length > 100 ? txt.slice(0, 100) + '…' : txt;
    } catch(e) { return ''; }
  }

  function _buildAyahItem() {
    /* Friday (Baghdad time) → always Surah Al-Kahf, Ayah 1 */
    if (_baghdadDate().getUTCDay() === 5) {
      return {
        _type: 'daily', id: 'ayah_day',
        icon: 'fas fa-book-quran', tag: 'ئایەتا ڕۆژێ',
        title: SURAH_NAMES_AR[17], subtitle: 'سورەتا کەهف · ئایەت 1',
        arText: _getAyahAr(18, 1), _s: 18, _a: 1,
        nav: function() {
          if (window.App && App.tab && App.openSurah) {
            App.tab('quran');
            setTimeout(function() { App.openSurah(18, 1); }, 300);
          }
        }
      };
    }
    var flat = _seededIdx(6236, 1);
    var rem  = flat, surah = 1, ayah = 1;
    for (var i = 0; i < SURAH_SIZES.length; i++) {
      if (rem < SURAH_SIZES[i]) { surah = i + 1; ayah = rem + 1; break; }
      rem -= SURAH_SIZES[i];
    }
    var surahName = SURAH_NAMES_AR[surah - 1] || SURAH_NAMES[surah - 1] || ('سورة ' + surah);
    var s = surah, a = ayah;
    return {
      _type: 'daily', id: 'ayah_day',
      icon: 'fas fa-book-quran', tag: 'ئایەتا ڕۆژێ',
      title: surahName, subtitle: surahName + ' · ئایەت ' + ayah,
      arText: _getAyahAr(s, a), _s: s, _a: a,
      nav: function() {
        if (window.App && App.tab && App.openSurah) {
          App.tab('quran');
          setTimeout(function() { App.openSurah(s, a); }, 300);
        }
      }
    };
  }

  /* ─────────────────────────────────────────────
     CARD 3 — HADITH OF THE DAY  (salt 2)
     Opens the exact seeded hadith in detail view.
     If data not yet cached: card is shown but opens
     hadith list — refreshes to exact on next _draw.
  ───────────────────────────────────────────── */
  function _buildHadithItem() {
    var hadiths = (function() {
      try {
        var raw = JSON.parse(localStorage.getItem('gencine_hadiths_v2'));
        return (raw && Array.isArray(raw.data)) ? raw.data : raw; /* unwrap {ts,data} envelope */
      } catch(e) { return null; }
    }());

    if (hadiths && hadiths.length) {
      var idx     = _seededIdx(hadiths.length, 2);
      var h       = hadiths[idx];
      var preview = (h.ku || h.ar || '').trim();
      if (preview.length > 55) preview = preview.slice(0, 55) + '\u2026';
      return {
        _type: 'daily', id: 'hadith_day',
        icon: 'fas fa-scroll', tag: 'حەدیسا ڕۆژێ',
        title:    h.title || preview,
        subtitle: h.source || 'پێغەمبەرێ ئیسلامێ \uFDFA',
        nav: function(ui) {
          if (!ui) return;
          ui._view = 'hadith'; ui._hadithSearch = ''; ui._hadithDetailIdx = idx; ui._draw();
        }
      };
    }

    /* Cache empty — placeholder, navigates to hadith list until data loads */
    return {
      _type: 'daily', id: 'hadith_day',
      icon: 'fas fa-scroll', tag: 'حەدیسا ڕۆژێ',
      title:    'حەدیسا ڕۆژێ',
      subtitle: 'دابەزێنا داتا...',
      nav: function(ui) {
        if (!ui) return;
        ui._view = 'hadith'; ui._hadithSearch = ''; ui._hadithDetailIdx = null; ui._draw();
      }
    };
  }

  /* ─────────────────────────────────────────────
     CARD 4 — BOOK OF THE DAY  (salt 4)
     Opens the exact seeded book directly.
     If data not yet cached: placeholder until data loads.
  ───────────────────────────────────────────── */
  function _buildBookItem() {
    var books = (function() {
      try {
        var raw = JSON.parse(localStorage.getItem('gencine_books_v4'));
        return (raw && Array.isArray(raw.data)) ? raw.data : raw; /* unwrap {ts,data} envelope */
      } catch(e) { return null; }
    }());

    if (books && books.length) {
      var b      = books[_seededIdx(books.length, 4)] || books[0];
      var bookId = b.id;
      return {
        _type: 'daily', id: 'book_day',
        icon: 'fas fa-book-open', tag: 'پەرتوکا ڕۆژێ',
        title:    b.title_ku || b.title_ar || 'پەرتوک',
        subtitle: b.author_ku || 'بخوێنە',
        coverUrl: b.cover_url || null,
        nav: function(ui) { if (ui) ui.openBook(bookId); }
      };
    }

    /* Cache empty — placeholder until data loads */
    return {
      _type: 'daily', id: 'book_day',
      icon: 'fas fa-book-open', tag: 'پەرتوکا ڕۆژێ',
      title:    'پەرتوکا ڕۆژێ',
      subtitle: 'دابەزێنا داتا...',
      nav: function(ui) { if (ui) { ui._view = 'books'; ui._draw(); } }
    };
  }

  /* ─────────────────────────────────────────────
     SEASONAL ITEMS CHECK — returns all currently active seasonal items
     as separate slides (none replace the regular zikr slide).
  ───────────────────────────────────────────── */
  function _getSeasonalItems() {
    var now        = new Date();
    var nowMin     = now.getHours() * 60 + now.getMinutes();
    var dow        = now.getDay();
    var prayers    = _getPrayerTimings();
    var maghribMin = (prayers && _toMin(prayers.Maghrib) >= 0) ? _toMin(prayers.Maghrib) : 18 * 60;
    var fajrMin    = (prayers && _toMin(prayers.Fajr)    >= 0) ? _toMin(prayers.Fajr)    :  5 * 60;

    return SEASONAL_ITEMS
      .filter(function(item) {
        return _catHasData(item.categoryKey) && _isTimeActive(item, nowMin, dow, prayers, maghribMin, fajrMin);
      })
      .map(function(item) { return { _type: 'adhkar', _adhkarItem: item }; });
  }

  /* ─────────────────────────────────────────────
     getItemsNow — variable number of slides:
       1. Regular time zikr (always)
       2+. Active seasonal items (each gets own slide — none displace card 1)
       next. Weather dhikr (only when raining/thunder/wind)
       then. Ayah of the day
       then. Hadith of the day
       last. Book of the day
  ───────────────────────────────────────────── */
  function getItemsNow() {
    var items = [
      { _type: 'adhkar', _adhkarItem: _getZikrItem() }    /* card 1: time zikr — never displaced */
    ];

    /* seasonal slides — added after card 1, one slide each */
    var seasonal = _getSeasonalItems();
    for (var si = 0; si < seasonal.length; si++) {
      items.push(seasonal[si]);
    }

    /* weather slide — added when condition is not clear */
    var weatherItem = (_getWeatherCondition() !== 'clear') ? _getWeatherItem() : null;
    if (weatherItem) {
      items.push({ _type: 'adhkar', _adhkarItem: weatherItem });
    }

    items.push(_buildAyahItem());
    items.push(_buildHadithItem());
    items.push(_buildBookItem());
    return items;
  }

  /* ─────────────────────────────────────────────
     CARD BUILDERS
  ───────────────────────────────────────────── */
  function _mk(tag, cls, text) {
    var el = document.createElement(tag);
    if (cls)  el.className   = cls;
    if (text) el.textContent = text;
    return el;
  }

  /* Read adhkar for a category from the localStorage cache */
  function _getAdhkarFromCache(catKey) {
    try {
      var list = [];
      // Primary: localStorage (populated after first DB fetch, persists across sessions)
      var raw = JSON.parse(localStorage.getItem('gencine_adhkar_v1'));
      list = (raw && Array.isArray(raw.data)) ? raw.data : (Array.isArray(raw) ? raw : []);
      // Fallback: in-memory data from dhikr.js — covers iOS/Android first session open
      // where localStorage hasn't been written yet but _dbAdhkar is already in memory
      if (!list.length && window.GencineUI && window.GencineUI.getAllAdhkar) {
        list = window.GencineUI.getAllAdhkar();
      }
      return list.filter(function(a) { return a.category_key === catKey && a.active !== false; });
    } catch(e) { return []; }
  }

  function _buildAdhkarCard(item, gencineUI) {
    var T = function(k, d) { var r = window.t ? window.t(k) : k; return (r && r !== k) ? r : (d || k); };
    var state  = _getState();
    var done   = state.completed.indexOf(item.id) >= 0;
    var streak = _getStreak(item.id);
    var isFriday = item.id === 'friday' || item.id === 'salawat';

    /* Load actual adhkar from cache so we can show a real preview */
    var adhkarList  = _getAdhkarFromCache(item.categoryKey);
    /* Pick one dhikr for the day using a separate salt (5) — same all day, changes daily */
    var featured    = adhkarList.length ? adhkarList[_seededIdx(adhkarList.length, 5)] : null;
    var totalCount  = adhkarList.length;

    /* Card — identical structure to _buildDailyCard so height is exactly the same */
    var cls = 'sd-card' + (done ? ' sd-card-done' : '') + (isFriday ? ' sd-card-friday' : '');
    var card = _mk('div', cls);

    /* icon */
    var iWrap = _mk('div', 'sd-icon');
    iWrap.appendChild(_mk('i', item.icon));
    card.appendChild(iWrap);

    /* content — same class as other cards */
    var content = _mk('div', 'sd-content');

    /* tag row: time tag (or hint subtitle when no timeTag) + count badge inline */
    var tagWrap = document.createElement('div');
    if (item.timeTag) {
      tagWrap.appendChild(_mk('span', 'sd-tag', item.timeTag));
    } else if (item.subtitleKey || item.subtitleFallback) {
      // Show hint as tag when item has no timeTag (e.g. adhan dua card)
      tagWrap.appendChild(_mk('span', 'sd-tag', T(item.subtitleKey, item.subtitleFallback)));
    }
    if (totalCount > 0) tagWrap.appendChild(_mk('span', 'sd-zikr-count', totalCount + ' ' + T('gencine.smart.zikr_count_label', 'زکر')));
    content.appendChild(tagWrap);

    /* title zone — same min-height as other cards */
    var titleZone = _mk('div', 'sd-title-zone');
    if (featured && featured.ar && !done) {
      var arEl  = _mk('div', 'sd-zikr-ar');
      var arTxt = featured.ar.replace(/\s+/g, ' ').trim();
      if (arTxt.length > 100) arTxt = arTxt.slice(0, 100) + '…';
      arEl.textContent = arTxt;
      titleZone.appendChild(arEl);
    } else if (item.fallbackAr && !done) {
      var arEl2 = _mk('div', 'sd-zikr-ar');
      arEl2.textContent = item.fallbackAr;
      titleZone.appendChild(arEl2);
    } else {
      titleZone.appendChild(_mk('div', 'sd-title', T(item.labelKey, item.labelFallback)));
    }
    content.appendChild(titleZone);

    /* sub line — Kurdish label + badge + source, same as sd-sub on other cards */
    var subEl = _mk('div', 'sd-sub' + (done ? ' sd-sub-done' : ''));
    if (done) {
      subEl.textContent = T('gencine.smart.done_today', 'ئەڤڕۆ تەمام بوو ✓');
    } else if (streak.count >= 2) {
      subEl.textContent = streak.count + ' ' + T('gencine.smart.days_row', 'ڕۆژ پەی هەم 🔥');
    } else {
      var subParts = [T(item.labelKey, item.labelFallback)];
      var _rep = featured ? (featured.repeat || 1) : (item.fallbackRepeat || 1);
      var _src = featured ? featured.source : item.fallbackSource;
      if (_rep > 1) subParts.push('× ' + _rep);
      if (_src)     subParts.push(_src);
      subEl.textContent = subParts.join('  ·  ');
    }
    content.appendChild(subEl);

    card.appendChild(content);

    card.addEventListener('click', function() {
      _markOpened(item.id);
      if (gencineUI) {
        gencineUI._adhkarCat  = item.categoryKey;
        gencineUI._adhkarView = 'list';
        gencineUI._view       = 'adhkar';
        gencineUI._draw();
      }
    });
    return card;
  }

  function _buildDailyCard(item, gencineUI) {
    var card = _mk('div', 'sd-card');

    /* Icon slot — for book_day with cover: show cover image instead of icon */
    if (item.id === 'book_day' && item.coverUrl) {
      var iCover = _mk('div', 'sd-book-cover-icon');
      var iImg = document.createElement('img');
      iImg.className = 'sd-book-cover-img';
      iImg.src = item.coverUrl;
      iImg.alt = '';
      iImg.loading = 'lazy';
      iCover.appendChild(iImg);
      card.appendChild(iCover);
    } else {
      var iWrap = _mk('div', 'sd-icon');
      iWrap.appendChild(_mk('i', item.icon));
      card.appendChild(iWrap);
    }

    var content = _mk('div', 'sd-content');
    content.appendChild(_mk('span', 'sd-tag', item.tag));
    var titleZone = _mk('div', 'sd-title-zone');

    /* Ayah card: Arabic text in title zone; surah name as fallback until quran loads */
    if (item.id === 'ayah_day') {
      if (item.arText) {
        var arEl = _mk('div', 'sd-zikr-ar');
        arEl.textContent = item.arText;
        titleZone.appendChild(arEl);
      } else {
        var fallbackEl = _mk('div', 'sd-title', item.title);
        titleZone.appendChild(fallbackEl);
        if (item._s) {
          (function _fill(n) {
            var txt = _getAyahAr(item._s, item._a);
            if (txt) {
              fallbackEl.className = 'sd-zikr-ar';
              fallbackEl.textContent = txt;
            } else if (n > 0) { setTimeout(function() { _fill(n - 1); }, 400); }
          })(20);
        }
      }
    } else {
      titleZone.appendChild(_mk('div', 'sd-title', item.title));
    }

    content.appendChild(titleZone);
    content.appendChild(_mk('div', 'sd-sub', item.subtitle));
    card.appendChild(content);

    var arrow = _mk('div', 'sd-arrow');
    arrow.appendChild(_mk('i', 'fas fa-chevron-left'));
    card.appendChild(arrow);

    card.addEventListener('click', function() {
      _markOpened(item.id);
      item.nav(gencineUI);
    });
    return card;
  }

  function _buildCard(hybridItem, gencineUI) {
    if (hybridItem._type === 'adhkar')
      return _buildAdhkarCard(hybridItem._adhkarItem, gencineUI);
    return _buildDailyCard(hybridItem, gencineUI);
  }

  /* ─────────────────────────────────────────────
     SLIDER  v17

     DOM layout (after render() builds it):
       .sd-wrapper  (overflow:hidden, rectangular — NO border-radius for GPU perf)
         .sd-track  (display:flex ltr)
           [cs0]  clone of real first slide — at DOM pos 0
           [sN-1] real last slide
           [sN-2]
           ...
           [s0]   real first slide — at DOM pos N
           [csN-1] clone of real last slide — at DOM pos N+1
         .sd-progress  (position:absolute bottom:0 — sits flush at card base)
           .sd-bar
       .sd-dots

     RTL infinite loop:
       Slides are in REVERSED DOM order so that "forward" = translateX increases
       (track moves RIGHT), which feels natural in RTL (new card from left).
       Real first slide s0 sits at DOM pos N; translateX = -(N-current)*W.

       When advancing past last slide:
         animate to cs0 (pos 0, translateX=0) → transitionend → jump to s0 (translateX=-N*W)
       When going before first:
         animate to csN-1 (pos N+1, translateX=-(N+1)*W) → jump to sN-1 (translateX=-W)
       User never sees a jump — both clone and original are visually identical.

     Swipe — RTL semantics:
       Finger RIGHT (dx>0) → track follows right → reveals lower DOM index = next
       logical slide (current+1). Natural for RTL reading direction.
       Finger LEFT  (dx<0) → prev (current-1).

     Progress bar:
       position:absolute bottom:0 inside wrapper — rides the bottom edge of the card.
  ───────────────────────────────────────────── */
  function _initSlider(wrapper, track, dotsEl, count) {
    if (count <= 1) { dotsEl.style.display = 'none'; return; }

    var DURATION = 10000;
    var SNAP_MS  = 320;
    var SNAP_FN  = 'cubic-bezier(0.22,1,0.36,1)';
    var current  = 0;   /* logical index 0..count-1 */

    /* ── progress bar — inside sd-card-outer, clipped by its border-radius ── */
    var prog = _mk('div', 'sd-progress');
    var bar  = _mk('div', 'sd-bar');
    prog.appendChild(bar);
    wrapper.parentNode.appendChild(prog);   /* wrapper.parentNode = sd-card-outer */

    /* ── dots: RTL order (count-1 → 0) so dot[0] ends up rightmost ── */
    var dots = [];
    for (var i = count - 1; i >= 0; i--) {
      (function(idx) {
        var dot = _mk('span', 'sd-dot' + (idx === 0 ? ' sd-dot-active' : ''));
        dot.addEventListener('click', function() { _goTo(idx, true); });
        dotsEl.appendChild(dot);
        dots[idx] = dot;
      }(i));
    }

    function _alive() { return !!(document.body && document.body.contains(track)); }
    function _W()     { var w = wrapper.clientWidth || wrapper.offsetWidth; return w > 0 ? w : window.innerWidth - 32; }

    /* translateX for logical slide `cur`:
       s0 is at DOM pos `count` (after prepended clone).
       formula: -(count - cur) * W                          */
    function _posX(cur) { return -(count - cur) * _W(); }

    var _trackX = _posX(0); // JS-tracked position — avoids getComputedStyle reads
    function _applyX(px, anim) {
      _trackX = px;
      track.style.transition = anim ? 'transform ' + SNAP_MS + 'ms ' + SNAP_FN : 'none';
      track.style.transform  = 'translate3d(' + px + 'px,0,0)';
    }

    function _syncDots() {
      for (var j = 0; j < count; j++) dots[j].classList.remove('sd-dot-active');
      dots[current].classList.add('sd-dot-active');
    }

    /* Pending transitionend handler for silent teleport after infinite wrap */
    var _teleportFn = null;
    function _cancelTeleport() {
      if (_teleportFn) {
        track.removeEventListener('transitionend', _teleportFn);
        _teleportFn = null;
      }
    }

    function _goTo(idx, anim) {
      _cancelTeleport();
      var dest, teleportX, isWrap = false;

      if (idx >= count) {
        /* forward wrap: animate to clone-of-first (DOM pos 0, translateX=0) */
        dest      = 0;
        teleportX = _posX(0);   /* = -count*W, real s0 */
        current   = 0;
        isWrap    = true;
      } else if (idx < 0) {
        /* backward wrap: animate to clone-of-last (DOM pos count+1) */
        dest      = -(count + 1) * _W();
        teleportX = _posX(count - 1);   /* = -W, real sN-1 */
        current   = count - 1;
        isWrap    = true;
      } else {
        current = idx;
        dest    = _posX(current);
      }

      _syncDots();
      _applyX(dest, anim !== false);

      /* After animation reaches clone, instantly jump to the real slide.
         transitionend fires once per property — guard with _cancelTeleport. */
      if (isWrap && anim !== false) {
        var tX = teleportX;
        _teleportFn = function() {
          _cancelTeleport();
          _applyX(tX, false);
        };
        track.addEventListener('transitionend', _teleportFn);
      }

      _resetProg();
    }

    /* ── RAF progress ── */
    var _raf = null, _tStart = 0, _accum = 0, _paused = false;

    function _resetProg() {
      _accum = 0; _paused = false;
      bar.style.transition = 'none';
      bar.style.transform  = 'scaleX(0)';
      if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
      _tStart = performance.now();
      _raf = requestAnimationFrame(_tick);
    }

    function _pauseProg() {
      if (_paused) return;
      _paused = true;
      _accum += performance.now() - _tStart;
      if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
    }

    function _resumeProg() {
      if (!_paused) return;
      _paused = false;
      _tStart = performance.now();
      _raf = requestAnimationFrame(_tick);
    }

    function _tick() {
      if (_paused) return;
      /* Element temporarily removed from DOM (e.g. user navigated away and back).
         Keep the loop alive so it auto-resumes when the section re-enters DOM. */
      if (!_alive()) { _raf = requestAnimationFrame(_tick); return; }
      var pct = Math.min((_accum + performance.now() - _tStart) / DURATION, 1);
      bar.style.transform = 'scaleX(' + pct + ')';
      if (pct >= 1) { _goTo(current + 1, true); return; }
      _raf = requestAnimationFrame(_tick);
    }

    /* Read current track X — JS-tracked to avoid layout-flushing getComputedStyle */
    function _readX() { return _trackX; }

    /* ── swipe ── */
    var _drag = false, _sx = 0, _sy = 0, _baseX = 0;
    var _decided = false, _horiz = false;
    var INTENT = 5;
    var _vx = 0, _vtLast = 0, _xLast = 0;

    /* ── swipe — non-passive so we can preventDefault vertical scroll ── */
    track.addEventListener('touchstart', function(e) {
      _cancelTeleport();
      var actualX = _readX();
      _drag = true; _decided = false; _horiz = false;
      _sx = e.touches[0].clientX; _sy = e.touches[0].clientY;
      _baseX = actualX;
      _vx = 0; _vtLast = performance.now(); _xLast = _sx;
      track.style.transition = 'none';
      track.style.transform  = 'translate3d(' + actualX + 'px,0,0)';
      _pauseProg();
    }, { passive: false });

    track.addEventListener('touchmove', function(e) {
      if (!_drag) return;
      var cx = e.touches[0].clientX, cy = e.touches[0].clientY;
      var dx = cx - _sx, dy = cy - _sy;
      if (!_decided) {
        if (Math.abs(dx) < INTENT && Math.abs(dy) < INTENT) return;
        _decided = true;
        _horiz   = Math.abs(dx) >= Math.abs(dy);
        if (!_horiz) { _drag = false; _resumeProg(); return; }
      }
      if (!_horiz) return;
      /* Block page scroll while dragging horizontally */
      e.preventDefault();
      var now = performance.now(), dt = now - _vtLast;
      if (dt > 0) { _vx = (cx - _xLast) / dt; }
      _vtLast = now; _xLast = cx;
      /* Clamp: clone-of-first at right (translateX=0), clone-of-last at left */
      var W = _W(), raw = _baseX + dx;
      var min = -(count + 1) * W, max = 0;
      var clamped = raw > max ? max + (raw - max) * 0.25
                  : raw < min ? min + (raw - min) * 0.25
                  : raw;
      track.style.transform = 'translate3d(' + clamped + 'px,0,0)';
    }, { passive: false });

    function _onEnd(e) {
      if (!_drag) return; _drag = false;
      var endX    = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : _sx;
      var delta   = endX - _sx;
      var W       = _W();
      var vxFresh = (performance.now() - _vtLast) < 80 ? _vx : 0;
      var flick   = Math.abs(vxFresh) > 0.3;
      if (flick || Math.abs(delta) > W * 0.18) {
        /* RTL: swipe right (delta>0 / vx>0) = next (+1), swipe left = prev (-1) */
        var dir = (vxFresh !== 0) ? (vxFresh > 0 ? 1 : -1) : (delta > 0 ? 1 : -1);
        _goTo(current + dir, true);
      } else {
        _goTo(current, true);
      }
    }
    track.addEventListener('touchend',    _onEnd, { passive: false });
    track.addEventListener('touchcancel', _onEnd, { passive: false });

    function _onVis() {
      if (!_alive()) { document.removeEventListener('visibilitychange', _onVis); return; }
      document.hidden ? _pauseProg() : _resumeProg();
    }
    document.addEventListener('visibilitychange', _onVis);

    /* ── start at real first slide (DOM pos count, translateX = -count*W) ── */
    _applyX(_posX(0), false);
    _syncDots();
    _resetProg();

    /* Expose resume hook on wrapper — called by render() when returning the
       cached section to DOM after within-tab navigation (e.g. back from adhkar). */
    wrapper._resumeSlider = function() {
      _paused = false;
      _accum  = 0;
      _tStart = performance.now();
      if (_raf) cancelAnimationFrame(_raf);
      _raf = requestAnimationFrame(_tick);
    };
  }

  /* ─────────────────────────────────────────────
     DAILY REFRESH COUNTDOWN
     Pure HH:MM:SS timer above the card.
     No label, no icon — just the time remaining
     until Baghdad midnight, updated every second.
  ───────────────────────────────────────────── */
  function _buildCountdown() {
    var chip    = _mk('span', 'sd-chip');
    var lbl     = _mk('span', 'sd-chip-lbl', 'نویکرن:');
    var timeEl  = _mk('span', 'sd-chip-time');
    chip.appendChild(lbl);
    chip.appendChild(timeEl);

    function _msUntilBaghdadMidnight() {
      var d = _baghdadDate();
      var nextMidnightUTC =
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1)
        - _BAGHDAD_OFFSET_MS;
      return nextMidnightUTC - Date.now();
    }

    function _fmt(ms) {
      var total = Math.max(0, Math.floor(ms / 1000));
      var h = Math.floor(total / 3600);
      var m = Math.floor((total % 3600) / 60);
      var s = total % 60;
      return String(h).padStart(2, '0') + ':'
           + String(m).padStart(2, '0') + ':'
           + String(s).padStart(2, '0');
    }

    function _update() {
      // Self-clean if chip was removed from DOM (tab switch, panel hide, clearCache)
      if (!document.body.contains(chip)) {
        clearInterval(chip._countdownTid);
        chip._countdownTid = null;
        return;
      }
      timeEl.textContent = _fmt(_msUntilBaghdadMidnight());
    }

    _update();
    chip._countdownTid = setInterval(_update, 1000);

    return chip;
  }

  /* ─────────────────────────────────────────────
     SKELETON  — shown while section is loading.
     Mirrors real card geometry so the transition
     from skeleton → real is seamless.
  ───────────────────────────────────────────── */
  function _buildSkelSection() {
    var section = _mk('div', 'sd-section');

    /* header row skeleton */
    var hdr = _mk('div', 'sd-hdr');
    hdr.appendChild(_mk('span', 'sd-hdr-label', '\u200b')); /* zero-width to hold height */
    section.appendChild(hdr);

    /* one skeleton card (matches slider height) */
    var wrapper = _mk('div', 'sd-wrapper');
    var card    = _mk('div', 'sd-skel-card');
    card.appendChild(_mk('div', 'sd-skel-icon skel-block'));
    var body = _mk('div', 'sd-skel-body');
    body.appendChild(_mk('div', 'sd-skel-tag skel-block'));
    body.appendChild(_mk('div', 'sd-skel-title skel-block'));
    body.appendChild(_mk('div', 'sd-skel-sub skel-block'));
    card.appendChild(body);
    wrapper.appendChild(card);
    var outer = _mk('div', 'sd-card-outer');
    outer.appendChild(wrapper);
    section.appendChild(outer);

    /* dots skeleton */
    var dotsEl = _mk('div', 'sd-dots');
    for (var i = 0; i < 4; i++) dotsEl.appendChild(_mk('span', 'sd-dot' + (i === 0 ? ' sd-dot-active' : '')));
    section.appendChild(dotsEl);

    return section;
  }

  /* ─────────────────────────────────────────────
     SECTION CACHE
     One section element per Baghdad day.
     Returning the same DOM node on pull-to-refresh
     preserves slider position + timer — no visual reset.
  ───────────────────────────────────────────── */
  var _sectionCache = { el: null, seed: null, hasData: false, hasAdhkarData: false, seasonalKey: null, hasQuranData: false };

  /* ─────────────────────────────────────────────
     RENDER
     Returns section element.
     Same Baghdad day → returns cached element so
     pull-to-refresh does not reset the slider.
     New day or first call → builds fresh.
  ───────────────────────────────────────────── */
  function render(gencineUI) {
    var seed    = _daySeed();
    var hasData = (function() {
      try {
        var h = JSON.parse(localStorage.getItem('gencine_hadiths_v2') || 'null');
        var b = JSON.parse(localStorage.getItem('gencine_books_v4')   || 'null');
        var hArr = (h && h.data) ? h.data : h;
        var bArr = (b && b.data) ? b.data : b;
        return !!(Array.isArray(hArr) && hArr.length && Array.isArray(bArr) && bArr.length);
      } catch(e) { return false; }
    }());
    // Track adhkar data separately — hadiths/books being cached doesn't mean adhkar is ready
    var hasAdhkarData = (function() {
      try {
        var a = JSON.parse(localStorage.getItem('gencine_adhkar_v1') || 'null');
        var aArr = (a && Array.isArray(a.data)) ? a.data : (Array.isArray(a) ? a : []);
        if (aArr.length) return true;
        // Also check in-memory (covers first session on iOS before localStorage write)
        return !!(window.GencineUI && window.GencineUI.getAllAdhkar && window.GencineUI.getAllAdhkar().length);
      } catch(e) { return false; }
    }());
    var hasQuranData = !!(window.S && window.S.quranData);
    /* Seasonal key — string of active seasonal item IDs.
       Cache must miss when seasonal state changes mid-day
       (e.g. breaking_fast slide appears at Maghrib time). */
    var currentSeasonalKey = _getSeasonalItems()
      .map(function(s) { return s._adhkarItem.id; }).join(',');

    /* Cache hit: same day, same seasonal state, AND (data was already full OR still no data).
       Only rebuild mid-day if cache was built with placeholders but real
       data has now loaded — this is what makes hadith/book show real content.
       Also rebuild if quranData just became available (ayah card needs real Arabic text). */
    if (_sectionCache.el && _sectionCache.seed === seed
        && _sectionCache.seasonalKey === currentSeasonalKey) {
      if ((_sectionCache.hasData || !hasData) && (_sectionCache.hasAdhkarData || !hasAdhkarData) && (_sectionCache.hasQuranData || !hasQuranData)) {
        /* Resume slider progress bar — it may have stopped while the section
           was outside the DOM during within-tab navigation. */
        var _cw = _sectionCache.el.querySelector('.sd-wrapper');
        if (_cw && _cw._resumeSlider) _cw._resumeSlider();
        return _sectionCache.el;
      }
      /* fall through: cache had placeholders, data just arrived → rebuild */
    }

    var items = getItemsNow();  /* always 4 */
    try {
      console.log('[SmartDhikr]', items.length, 'cards →',
        items.map(function(i) {
          return i._type === 'adhkar' ? 'zikr' : (i.id || i._type);
        }).join(', '));
    } catch(e) {}

    var T       = window.t || function(k, d) { return d || k; };
    var section = _mk('div', 'sd-section sd-enter');

    /* header row — RTL flex: title on right, countdown chip on left */
    var hdr = _mk('div', 'sd-hdr');
    hdr.appendChild(_mk('span', 'sd-hdr-label', 'بیرئینانا ڕۆژانە'));
    hdr.appendChild(_buildCountdown());
    section.appendChild(hdr);

    /* wrapper + track */
    var wrapper = _mk('div', 'sd-wrapper');
    var track   = _mk('div', 'sd-track');

    items.forEach(function(item) {
      var slide = _mk('div', 'sd-slide');
      slide.appendChild(_buildCard(item, gencineUI));
      track.appendChild(slide);
    });

    /* ── Reverse slide order for RTL (forward = track moves RIGHT) ──
       DOM before: [s0][s1][s2][s3]
       DOM after:  [s3][s2][s1][s0]
       Appending an existing node moves it to the end — no innerHTML needed. */
    var slides = Array.prototype.slice.call(track.children);
    slides.reverse();
    slides.forEach(function(s) { track.appendChild(s); });

    /* ── Clone first + last for infinite loop ──────────────────────
       Prepend clone of s0 (shown when wrapping forward past last slide).
       Append  clone of sN-1 (shown when wrapping backward past first).
       Result: [cs0][sN-1]...[s1][s0][csN-1]
       cloneNode(true) copies DOM structure; event listeners are NOT copied
       (fine — clones are visible for only ~320ms during the wrap anim).   */
    var cs0  = track.lastChild.cloneNode(true);   /* clone of s0  */
    var csLast = track.firstChild.cloneNode(true); /* clone of sN-1 */
    track.insertBefore(cs0, track.firstChild);
    track.appendChild(csLast);

    wrapper.appendChild(track);
    /* sd-card-outer clips progress bar to card radius — progress appended here by _initSlider */
    var outer = _mk('div', 'sd-card-outer');
    outer.appendChild(wrapper);
    section.appendChild(outer);

    /* dots — outside card shell so they sit below it */
    var dotsEl = _mk('div', 'sd-dots');
    section.appendChild(dotsEl);

    /* double-RAF: guarantees wrapper is in DOM + layout committed */
    var _done = false;
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        if (_done) return; _done = true;
        _initSlider(wrapper, track, dotsEl, items.length);
      });
    });

    // Clear stale countdown interval from previous cached section before replacing
    if (_sectionCache.el) {
      var _oldChip = _sectionCache.el.querySelector('.sd-chip');
      if (_oldChip && _oldChip._countdownTid) {
        clearInterval(_oldChip._countdownTid);
        _oldChip._countdownTid = null;
      }
    }

    _sectionCache.el            = section;
    _sectionCache.seed          = seed;
    _sectionCache.hasData       = hasData;
    _sectionCache.hasAdhkarData = hasAdhkarData;
    _sectionCache.seasonalKey   = currentSeasonalKey;
    _sectionCache.hasQuranData  = hasQuranData;
    return section;
  }

  /* ─────────────────────────────────────────────
     PUBLIC API
  ───────────────────────────────────────────── */
  function clearCache() {
    // Clear countdown interval before nulling el — prevents orphaned 1Hz timer
    if (_sectionCache.el) {
      var _chip = _sectionCache.el.querySelector('.sd-chip');
      if (_chip && _chip._countdownTid) { clearInterval(_chip._countdownTid); _chip._countdownTid = null; }
    }
    _sectionCache.el            = null;
    _sectionCache.seed          = null;
    _sectionCache.hasData       = false;
    _sectionCache.hasAdhkarData = false;
    _sectionCache.seasonalKey   = null;
    _sectionCache.hasQuranData  = false;
  }

  /* Called by app.js when quranData becomes available.
     If the section was pre-built before quranData loaded, clears the cache
     so the next render() call rebuilds with real ayah text. */
  function onQuranReady() {
    if (_sectionCache.el && !_sectionCache.hasQuranData) {
      clearCache();
      if (window.GencineUI && GencineUI._view === 'home') {
        setTimeout(function() { GencineUI._draw(); }, 50);
      }
    }
  }

  /* ─────────────────────────────────────────────
     LIVE WATCHER — detects slide changes without user interaction
     Checks every 20 s for:
       • seasonal items appearing / disappearing (e.g. breaking_fast at Maghrib)
       • card-1 zikr item switching window (e.g. morning → after_prayer)
       • Baghdad day rollover at midnight (daily cards refresh)
     On any change: bust cache + redraw immediately if home is visible.
  ───────────────────────────────────────────── */
  (function() {
    var _prevSeasonalKey = null;
    var _prevZikrId      = null;
    var _prevDaySeed     = null;

    setInterval(function() {
      try {
        var seasonalKey = _getSeasonalItems()
          .map(function(s) { return s._adhkarItem.id; }).join(',');
        var zikrId  = _getZikrItem().id;
        var daySeed = _daySeed();

        var changed = seasonalKey !== _prevSeasonalKey
                   || zikrId     !== _prevZikrId
                   || daySeed    !== _prevDaySeed;

        _prevSeasonalKey = seasonalKey;
        _prevZikrId      = zikrId;
        _prevDaySeed     = daySeed;

        if (changed) {
          clearCache();
          if (window.GencineUI && GencineUI._view === 'home') {
            GencineUI._draw();
          }
        }
      } catch(e) {}
    }, 20 * 1000);
  }());

  window.SmartDhikr = {
    getItemsNow:      getItemsNow,
    markOpened:       _markOpened,
    markCompleted:    _markCompleted,
    getStreak:        _getStreak,
    render:           render,
    clearCache:       clearCache,
    onQuranReady:     onQuranReady,
    buildSkelSection: _buildSkelSection
  };

}(window));
