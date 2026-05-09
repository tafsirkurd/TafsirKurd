/* =====================================================================
 * QuranSearch — Smart Quran Search Engine v3.0
 * TafsirKurd Capacitor App
 *
 * Architecture:
 *  normAr()        — Arabic normalization (harakat, alef, ya, hamza, tatweel, ta-marbuta)
 *  normLo()        — lowercase/trim normalize
 *  arDigits()      — Arabic-Indic → ASCII digits
 *  _stripPfx()     — strip one-letter Arabic prefix (و/ف/ب/ل/ك)
 *  _tokMatch()     — token equality with mutual prefix-strip fallback
 *  _maxConsec()    — longest consecutive run of query tokens in verse word array
 *  STOP_AR         — Arabic stopwords (downweighted in token scoring, still active in phrase matching)
 *  SA              — Surah aliases (English transliterations)
 *  VA              — Famous verse aliases (Arabic phrases + English names)
 *  parseRef()      — "2:255" / "٢:٢٥٥" / "baqarah 255" / "البقرة 255" etc.
 *  detectMode()    — detect query mode: ref / surah / arabic / latin / mixed
 *  buildIndex()    — one-time: precomputes arN + arW + kuN + tfN for all 6236 verses
 *  scoreVerse()    — tiered scorer: phrase → consecutive → token → translation
 *  query()         — orchestrates all above, returns ranked results
 *
 * Scoring tiers:
 *  1. Exact normalized phrase match   → 1000–1150
 *  2. All tokens consecutive          → 850
 *  3. Partial consecutive run ≥5      → 550+
 *  4. Partial consecutive run ≥4      → 400+
 *  5. Partial consecutive run ≥3      → 200+
 *  6. 2-token consecutive             → 80
 *  7. Non-stop token coverage         → 0–250
 *  8. Translation/Kurdish             → 0–310
 *  9. Tafsir fallback                 → 0–110
 *
 * Debug fields per result:
 *  phraseScore, consecutiveScore, tokenScore, translationScore, finalScore
 *
 * Result shapes:
 *  {type:'ref',   sn, an, arO, kuO, surahAr, surahEn, score, matchSrcs, posAr, posKu, mode,
 *   phraseScore, consecutiveScore, tokenScore, translationScore, finalScore}
 *  {type:'surah', sn, surahAr, surahEn, ayahCount, score, matchSrcs, mode}
 *  {type:'verse', sn, an, arO, kuO, surahAr, surahEn, score, matchSrcs, posAr, posKu, mode,
 *   phraseScore, consecutiveScore, tokenScore, translationScore, finalScore}
 * ===================================================================== */
(function () {
  'use strict';

  /* ── Arabic normalization pipeline ──────────────────────────────── */
  function normAr(s) {
    if (!s) return '';
    s = String(s);
    // 1. Remove harakat / tashkeel / Quran tajweed marks
    s = s.replace(/[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۨ-ۭ]/g, '');
    // 2. Normalize alef variants → ا
    s = s.replace(/[آأإٱ]/g, 'ا');
    // 3. Normalize alif maqsura ى → ي
    s = s.replace(/ى/g, 'ي');
    // 4. Normalize ؤ → و
    s = s.replace(/ؤ/g, 'و');
    // 5. Normalize ئ → ي
    s = s.replace(/ئ/g, 'ي');
    // 6. Remove tatweel ـ
    s = s.replace(/ـ/g, '');
    // 7. Normalize ta marbuta ة → ه
    s = s.replace(/ة/g, 'ه');
    // 8. Normalize whitespace
    s = s.replace(/\s+/g, ' ').trim();
    return s;
  }

  /* ── Lowercase normalize ──────────────────────────────────────── */
  function normLo(s) { return s ? String(s).toLowerCase().trim() : ''; }

  /* ── Arabic-Indic digits → ASCII ─────────────────────────────── */
  function arDigits(s) {
    return String(s).replace(/[٠١٢٣٤٥٦٧٨٩]/g, function (c) {
      return String('٠١٢٣٤٥٦٧٨٩'.indexOf(c));
    });
  }

  /* ── Strip leading "al-" / collapse apostrophes / dashes ─────── */
  function cleanKey(s) { return s.replace(/^al[-\s]/i, '').replace(/[-'\s]/g, ''); }

  /* ── Strip one-letter Arabic prefix (و/ف/ب/ل/ك) ─────────────── */
  function _stripPfx(tok) {
    if (tok.length > 2 && 'وفبلك'.indexOf(tok[0]) !== -1) {
      return tok.slice(1);
    }
    return null;
  }

  /* ── Typo tolerance: fix common Arabic keyboard/input errors ─── */
  function _typoFix(s) {
    if (!s) return s;
    // Trailing alef on و/ه endings (فهوا → فهو, هذها → هذه)
    s = s.replace(/وا(\s|$)/g, 'و$1');
    s = s.replace(/ها(\s|$)/g, 'ه$1');
    // الاه → الله (very common phone-keyboard mistake)
    s = s.replace(/الاه/g, 'الله');
    // ييي / ووو / ااا — collapse 3+ repeated chars → 1
    s = s.replace(/(.)\1{2,}/g, '$1');
    // Double spaces
    s = s.replace(/\s{2,}/g, ' ').trim();
    return s;
  }

  /* ── Token index candidate lookup ────────────────────────────── */
  /* Returns Set of _idx positions containing tok OR any prefixed form */
  function _getTokCandidates(tok) {
    var s = new Set();
    var h = _tokenIdx[tok];
    if (h) for (var i = 0; i < h.length; i++) s.add(h[i]);
    // Also look up prefixed verse words (verse has "ويتوكل", user typed "يتوكل")
    var pfx = 'وفبلك';
    for (var p = 0; p < pfx.length; p++) {
      var ph = _tokenIdx[pfx[p] + tok];
      if (ph) for (var j = 0; j < ph.length; j++) s.add(ph[j]);
    }
    return s;
  }

  /* Narrow the full _idx to candidate positions using non-stop tokens.
   * Returns array of _idx positions, or null when full scan is needed. */
  function _getCandidates(arTokens) {
    var nonStop = arTokens.filter(function(t) { return t.length >= 2 && !STOP_AR[t]; });
    if (!nonStop.length) return null; // all stopwords → full scan

    var union = new Set();
    var maxSingle = 0;
    for (var t = 0; t < nonStop.length; t++) {
      var cs = _getTokCandidates(nonStop[t]);
      if (cs.size > maxSingle) maxSingle = cs.size;
      cs.forEach(function(idx) { union.add(idx); });
    }
    // If every token is extremely common, don't bother narrowing
    if (maxSingle > 2500 && nonStop.length === 1) return null;
    return Array.from(union);
  }

  /* ── Token equality with mutual prefix-strip fallback ─────────── */
  function _tokMatch(vWord, qTok) {
    if (vWord === qTok) return true;
    var vs = _stripPfx(vWord);
    if (vs && vs === qTok) return true;
    var qs = _stripPfx(qTok);
    if (qs && qs === vWord) return true;
    if (vs && qs && vs === qs) return true;
    return false;
  }

  /* ── Longest consecutive run of queryToks in verseWords ──────── */
  function _maxConsec(verseWords, queryToks) {
    if (!queryToks.length || !verseWords.length) return 0;
    var best = 0;
    for (var vi = 0; vi < verseWords.length; vi++) {
      for (var qi = 0; qi < queryToks.length; qi++) {
        if (!_tokMatch(verseWords[vi], queryToks[qi])) continue;
        var run = 1;
        var vj = vi + 1;
        for (var qj = qi + 1; qj < queryToks.length && vj < verseWords.length; qj++, vj++) {
          if (_tokMatch(verseWords[vj], queryToks[qj])) run++;
          else break;
        }
        if (run > best) best = run;
        if (best === queryToks.length) return best; // can't do better
      }
    }
    return best;
  }

  /* ── Arabic stopwords (downweighted in token scoring) ────────── */
  /* They are still active in phrase matching — never removed from the text. */
  var STOP_AR = {
    'من':1,'في':1,'علي':1,'الله':1,'ان':1,'اي':1,'ما':1,'لا':1,
    'هو':1,'هي':1,'هم':1,'عن':1,'الي':1,'ثم':1,'لم':1,'لن':1,
    'قد':1,'بل':1,'انه':1,'كل':1,'هذا':1,'هذه':1,'ذلك':1,'تلك':1,
    'هل':1,'كان':1,'فهو':1,'وهو':1,'وهي':1,'اله':1,'اذا':1,'لقد':1,
    'عليه':1,'عليهم':1,'قال':1,'يقول':1,'ومن':1,'وما':1,'فما':1,
    'فان':1,'وان':1,'اما':1,'مما':1,'مع':1,'بما':1,'عما':1,'اذ':1
  };

  /* ── Mode detection ───────────────────────────────────────────── */
  function detectMode(qOrig, qLo) {
    var qD = arDigits(qLo);
    if (/^\d{1,3}\s*[:/]\s*\d{1,3}$/.test(qD)) return 'ref';
    if (/^\d{1,3}\s+\d{1,3}$/.test(qD)) return 'ref';
    if (SA[qLo] || SA[cleanKey(qLo)]) return 'surah';
    var hasAr = /[؀-ۿ]/.test(qOrig);
    var hasLat = /[a-zA-Z]/.test(qOrig);
    if (hasAr && !hasLat) return 'arabic';
    if (!hasAr && hasLat) return 'latin';
    return 'mixed';
  }

  /* ── Surah aliases (normalized lowercase key → surah number) ─── */
  var SA = {
    /* 1 */  fatiha:1,fatihah:1,faatiha:1,opening:1,fatihe:1,
    /* 2 */  baqarah:2,albaqarah:2,albaqara:2,bakara:2,baqara:2,bagara:2,
    /* 3 */  aliimran:3,alimran:3,imran:3,
    /* 4 */  nisa:4,nissa:4,nesa:4,women:4,
    /* 5 */  maidah:5,maid:5,table:5,
    /* 6 */  anam:6,cattle:6,
    /* 7 */  araf:7,heights:7,
    /* 8 */  anfal:8,spoils:8,
    /* 9 */  tawbah:9,toba:9,towba:9,taubah:9,repentance:9,
    /* 10 */ yunus:10,younus:10,jonah:10,
    /* 11 */ hud:11,
    /* 12 */ yusuf:12,yosef:12,yousef:12,joseph:12,
    /* 13 */ rad:13,thunder:13,
    /* 14 */ ibrahim:14,ibraheem:14,abraham:14,
    /* 15 */ hijr:15,
    /* 16 */ nahl:16,bee:16,
    /* 17 */ isra:17,baniisrail:17,israa:17,nightjourney:17,
    /* 18 */ kahf:18,cave:18,kehf:18,
    /* 19 */ maryam:19,mariam:19,mary:19,
    /* 20 */ taha:20,
    /* 21 */ anbiya:21,anbiyaa:21,prophets:21,
    /* 22 */ hajj:22,pilgrimage:22,
    /* 23 */ muminun:23,believers:23,mumenon:23,muminoon:23,
    /* 24 */ nur:24,light:24,
    /* 25 */ furqan:25,criterion:25,
    /* 26 */ shuara:26,poets:26,shuaraa:26,
    /* 27 */ naml:27,ants:27,
    /* 28 */ qasas:28,stories:28,
    /* 29 */ ankabut:29,spider:29,ankaboot:29,
    /* 30 */ rum:30,rome:30,byzantines:30,
    /* 31 */ luqman:31,lokman:31,
    /* 32 */ sajdah:32,prostration:32,assajda:32,
    /* 33 */ ahzab:33,confederates:33,
    /* 34 */ saba:34,sheba:34,
    /* 35 */ fatir:35,originator:35,fater:35,
    /* 36 */ yasin:36,yaseen:36,ysin:36,yaaseen:36,
    /* 37 */ saffat:37,rangers:37,assaffat:37,
    /* 38 */ sad:38,
    /* 39 */ zumar:39,groups:39,azzumar:39,
    /* 40 */ ghafir:40,forgiver:40,mumin:40,
    /* 41 */ fussilat:41,detailed:41,
    /* 42 */ shura:42,consultation:42,ashura:42,
    /* 43 */ zukhruf:43,ornaments:43,
    /* 44 */ dukhan:44,smoke:44,
    /* 45 */ jathiyah:45,kneeling:45,jasia:45,
    /* 46 */ ahqaf:46,sanddunes:46,
    /* 47 */ muhammad:47,
    /* 48 */ fath:48,victory:48,
    /* 49 */ hujurat:49,rooms:49,hujuraat:49,
    /* 50 */ qaf:50,
    /* 51 */ dhariyat:51,scattering:51,zariyat:51,
    /* 52 */ tur:52,mount:52,attur:52,
    /* 53 */ najm:53,star:53,
    /* 54 */ qamar:54,moon:54,
    /* 55 */ rahman:55,merciful:55,
    /* 56 */ waqiah:56,event:56,waqia:56,
    /* 57 */ hadid:57,iron:57,
    /* 58 */ mujadilah:58,argument:58,mujadila:58,
    /* 59 */ hashr:59,gathering:59,
    /* 60 */ mumtahanah:60,examined:60,mumtahina:60,
    /* 61 */ saff:61,ranks:61,
    /* 62 */ jumuah:62,friday:62,jumua:62,juma:62,
    /* 63 */ munafiqun:63,hypocrites:63,munafikun:63,
    /* 64 */ taghabun:64,loss:64,
    /* 65 */ talaq:65,divorce:65,
    /* 66 */ tahrim:66,banning:66,
    /* 67 */ mulk:67,sovereignty:67,dominion:67,
    /* 68 */ qalam:68,pen:68,
    /* 69 */ haqqah:69,reality:69,
    /* 70 */ maarij:70,ascent:70,almaraj:70,
    /* 71 */ nuh:71,nooh:71,noah:71,
    /* 72 */ jinn:72,aljinn:72,jins:72,
    /* 73 */ muzzammil:73,enswathed:73,muzammil:73,
    /* 74 */ muddaththir:74,cloaked:74,mudathir:74,mudassir:74,
    /* 75 */ qiyamah:75,resurrection:75,
    /* 76 */ insan:76,man:76,dahr:76,
    /* 77 */ mursalat:77,winds:77,
    /* 78 */ naba:78,tidings:78,
    /* 79 */ naziat:79,pullers:79,
    /* 80 */ abasa:80,frowned:80,
    /* 81 */ takwir:81,shrouding:81,
    /* 82 */ infitar:82,cleaving:82,
    /* 83 */ mutaffifin:83,defrauders:83,
    /* 84 */ inshiqaq:84,splitting:84,
    /* 85 */ buruj:85,constellations:85,
    /* 86 */ tariq:86,nightstar:86,
    /* 87 */ ala:87,mosthigh:87,
    /* 88 */ ghashiyah:88,overwhelming:88,ghashiya:88,
    /* 89 */ fajr:89,dawn:89,
    /* 90 */ balad:90,city:90,
    /* 91 */ shams:91,sun:91,
    /* 92 */ layl:92,night:92,
    /* 93 */ duha:93,morning:93,
    /* 94 */ sharh:94,expanding:94,inshirah:94,
    /* 95 */ tin:95,fig:95,
    /* 96 */ alaq:96,clot:96,iqra:96,
    /* 97 */ qadr:97,power:97,destiny:97,laylat:97,
    /* 98 */ bayyinah:98,evidence:98,
    /* 99 */ zalzalah:99,earthquake:99,zilzal:99,zalzala:99,
    /* 100 */ adiyat:100,chargers:100,
    /* 101 */ qariah:101,calamity:101,
    /* 102 */ takathur:102,abundance:102,rivalry:102,
    /* 103 */ asr:103,time:103,
    /* 104 */ humazah:104,slanderer:104,
    /* 105 */ fil:105,elephant:105,alfeel:105,
    /* 106 */ quraysh:106,quraish:106,qureysh:106,
    /* 107 */ maun:107,smallkindness:107,
    /* 108 */ kawthar:108,kosar:108,kauthar:108,
    /* 109 */ kafirun:109,disbelievers:109,kafiroon:109,
    /* 110 */ nasr:110,help:110,
    /* 111 */ masad:111,lahab:111,flame:111,aboulahab:111,
    /* 112 */ ikhlas:112,sincerity:112,tawhid:112,toheed:112,towhid:112,
    /* 113 */ falaq:113,daybreak:113,
    /* 114 */ nas:114,mankind:114,annas:114
  };

  /* ── Famous verse aliases ─────────────────────────────────────── */
  var VA = {
    /* Ayat al-Kursi */
    'ayat al kursi':{sn:2,an:255},'ayat alkursi':{sn:2,an:255},
    'ayatul kursi':{sn:2,an:255},'ayatulkursi':{sn:2,an:255},
    'ayt al kursi':{sn:2,an:255},'ayah al kursi':{sn:2,an:255},
    'al kursi':{sn:2,an:255},'alkursi':{sn:2,an:255},
    'kursi':{sn:2,an:255},'throne verse':{sn:2,an:255},
    /* Last 2 of Baqarah */
    'amanar rasulo':{sn:2,an:285},'amanar rasulu':{sn:2,an:285},
    'amana alrasulo':{sn:2,an:285},'amanar rasul':{sn:2,an:285},
    'last 2 baqarah':{sn:2,an:285},'last two baqarah':{sn:2,an:285},
    /* Rabbi zidni ilma */
    'rabbi zidni ilma':{sn:20,an:114},'rabbi zidni':{sn:20,an:114},
    'zidni ilma':{sn:20,an:114},'rabi zidni':{sn:20,an:114},
    /* Rabbish sharh */
    'rabbish rahli sadri':{sn:20,an:25},'rabbi shrahli':{sn:20,an:25},
    'rabbi shrah li sadri':{sn:20,an:25},'rabbish sharh li sadri':{sn:20,an:25},
    'rabb ishrah':{sn:20,an:25},'expand my chest':{sn:20,an:25},
    /* Qul huwallahu */
    'qul huwallahu ahad':{sn:112,an:1},'qul huwa allahu':{sn:112,an:1},
    'say he is allah':{sn:112,an:1},
    /* Inna maal usri */
    'inna maal usri yusra':{sn:94,an:5},'fainna maal usri yusra':{sn:94,an:6},
    'maal usri yusra':{sn:94,an:5},'with hardship comes ease':{sn:94,an:5},
    /* Hasbunallah */
    'hasbunallah wanimal wakeel':{sn:3,an:173},'hasbunallah':{sn:3,an:173},
    'sufficient for us is allah':{sn:3,an:173},
    /* Bismillah */
    'bismillah':{sn:1,an:1},'bism allah':{sn:1,an:1},
    'alhamdulillah':{sn:1,an:2},'al hamdu lillah':{sn:1,an:2},
    /* La tahzan */
    'la tahzan':{sn:9,an:40},'do not grieve':{sn:9,an:40},
    /* La taqnatu */
    'la taqnatu':{sn:39,an:53},'la taqnatu min rahmat allah':{sn:39,an:53},
    'do not despair':{sn:39,an:53},
    /* Inna Allah maa as-sabirin */
    'innallaha maas sabirin':{sn:2,an:153},'inna llaha maa ssabirin':{sn:2,an:153},
    'god is with the patient':{sn:2,an:153},
    /* Ya-Sin */
    'ya sin':{sn:36,an:1},'ya seen':{sn:36,an:1},
    /* Iqra */
    'iqra bismi rabbik':{sn:96,an:1},'recite in the name':{sn:96,an:1},
    /* Man yatawakkal */
    'man yatawakkal':{sn:65,an:3},'waman yatawakkal':{sn:65,an:3},
    'whoever relies on allah':{sn:65,an:3},'tawakkal ala allah':{sn:65,an:3},
    /* Iyyaka nabudu */
    'iyyaka nabudu':{sn:1,an:5},'iyyaka nabudu wa iyyaka nastaeen':{sn:1,an:5},
    'you alone we worship':{sn:1,an:5},

    /* ── Arabic aliases ──────────────────────────────────────────── */
    /* Ayat al-Kursi */
    'ايه الكرسي':{sn:2,an:255},'اية الكرسي':{sn:2,an:255},'ايات الكرسي':{sn:2,an:255},
    'الله لا اله الا هو':{sn:2,an:255},
    /* Rabbi zidni ilma */
    'رب زدني علما':{sn:20,an:114},'رب زدنى علما':{sn:20,an:114},
    'قال رب زدني علما':{sn:20,an:114},'قال ربي زدني علما':{sn:20,an:114},
    /* Qul huwallahu */
    'قل هو الله احد':{sn:112,an:1},'قل هو الله':{sn:112,an:1},
    /* Bismillah / Fatiha */
    'بسم الله':{sn:1,an:1},'بسم الله الرحمن الرحيم':{sn:1,an:1},
    'الحمد لله':{sn:1,an:2},'الحمد لله رب العالمين':{sn:1,an:2},
    /* Hasbunallah */
    'حسبنا الله':{sn:3,an:173},'حسبنا الله ونعم الوكيل':{sn:3,an:173},
    /* La taqnatu */
    'لا تقنطوا':{sn:39,an:53},'لا تقنطوا من رحمة الله':{sn:39,an:53},
    /* Inna maal usri */
    'ان مع العسر يسرا':{sn:94,an:6},'فان مع العسر يسرا':{sn:94,an:6},
    'إن مع العسر يسرا':{sn:94,an:6},'إن مع العسر يسرًا':{sn:94,an:6},
    /* Inna Allah maa sabirin */
    'ان الله مع الصابرين':{sn:2,an:153},
    /* La tahzan */
    'لا تحزن':{sn:9,an:40},
    /* Dua Yunus */
    'لا اله الا انت سبحانك':{sn:21,an:87},'لا اله الا انت':{sn:21,an:87},
    'سبحانك اني كنت من الظالمين':{sn:21,an:87},'دعاء يونس':{sn:21,an:87},
    /* Rabbi ishrah */
    'رب اشرح لي صدري':{sn:20,an:25},'رب اشرح':{sn:20,an:25},
    /* Rabbana atina */
    'ربنا اتنا':{sn:2,an:201},'ربنا اتنا في الدنيا حسنة':{sn:2,an:201},
    /* Alam nashrah */
    'الم نشرح':{sn:94,an:1},'الم نشرح لك صدرك':{sn:94,an:1},
    /* Wama arsalnaka */
    'وما ارسلناك الا رحمه للعالمين':{sn:21,an:107},
    /* Inna lillahi */
    'انا لله وانا اليه راجعون':{sn:2,an:156},'انا لله':{sn:2,an:156},
    /* Man yatawakkal — full phrase and common fragments */
    'ومن يتوكل على الله فهو حسبه':{sn:65,an:3},
    'ومن يتوكل علي الله فهو حسبه':{sn:65,an:3},
    'من يتوكل على الله فهو حسبه':{sn:65,an:3},
    'من يتوكل علي الله فهو حسبه':{sn:65,an:3},
    'فهو حسبه':{sn:65,an:3},
    'يتوكل على الله':{sn:65,an:3},
    'يتوكل علي الله':{sn:65,an:3},
    /* Iyyaka nabudu */
    'إياك نعبد وإياك نستعين':{sn:1,an:5},
    'اياك نعبد واياك نستعين':{sn:1,an:5},
    'إياك نعبد':{sn:1,an:5},
    'اياك نعبد':{sn:1,an:5},

    /* ── English aliases ─────────────────────────────────────────── */
    'la ilaha illa anta subhanaka':{sn:21,an:87},'dua yunus':{sn:21,an:87},
    'inna lillahi wa inna ilayhi rajiun':{sn:2,an:156}
  };

  /* ── Reference parser ─────────────────────────────────────────── */
  function parseRef(qLo, surahs) {
    var m;
    var qD = arDigits(qLo);
    // "2:255" or "2/255"
    m = qD.match(/^(\d{1,3})\s*[:/]\s*(\d{1,3})$/);
    if (m) { var sn=+m[1], an=+m[2]; if(sn>=1&&sn<=114&&an>=1) return {sn:sn,an:an}; }
    // "2 255"
    m = qD.match(/^(\d{1,3})\s+(\d{1,3})$/);
    if (m) { var sn2=+m[1], an2=+m[2]; if(sn2>=1&&sn2<=114&&an2>=1) return {sn:sn2,an:an2}; }
    // "baqarah 255" or "البقرة 255"
    m = qD.match(/^(.+?)\s+(\d{1,3})$/);
    if (m && +m[2]>=1) {
      var np=normLo(m[1]), npc=cleanKey(np), an3=+m[2];
      if (SA[np])  return {sn:SA[np],  an:an3};
      if (SA[npc]) return {sn:SA[npc], an:an3};
      var arQ = normAr(m[1]);
      for (var i=0; i<surahs.length; i++) {
        var s = surahs[i];
        if (npc.length>=3 && cleanKey(normLo(s.en)).indexOf(npc)!==-1) return {sn:s.n,an:an3};
        if (arQ.length>=2  && normAr(s.ar).indexOf(arQ)!==-1)           return {sn:s.n,an:an3};
      }
    }
    return null;
  }

  /* ── Search index ─────────────────────────────────────────────── */
  var _idx      = [];
  var _ready    = false;
  var _tokenIdx = {}; // normalized-word → [_idx positions] for fast candidate lookup
  var _stats    = { queries:0, totalMs:0, cacheHits:0, slowQ:[], zeroQ:[] };

  function buildIndex(quranData, tafsirData) {
    var t0 = Date.now();
    _idx = [];
    for (var sn=1; sn<=114; sn++) {
      var sd = quranData[String(sn)];
      if (!sd) continue;
      var vv  = sd.verses || sd;
      var kd  = tafsirData ? (tafsirData[sn-1] || {verses:[]}) : {verses:[]};
      var kvv = kd.verses || [];
      for (var vi=0; vi<vv.length; vi++) {
        var vObj = vv[vi];
        var arO  = String(vObj.text || vObj || '');
        var kuO  = kvv[vi] ? String(kvv[vi].text  || '') : '';
        var tfO  = kvv[vi] ? String(kvv[vi].tafsir || '') : '';
        if (!kuO && tfO) kuO = tfO.substring(0, 200);
        var arN = normAr(arO);
        _idx.push({
          sn: sn, an: vi + 1,
          arO: arO, arN: arN,
          arW: arN.split(/\s+/).filter(Boolean), // word array for consecutive matching
          kuO: kuO, kuN: normLo(kuO),
          tfO: tfO, tfN: normLo(tfO)
        });
      }
    }
    // Build reverse token index — word → list of _idx positions
    _tokenIdx = {};
    for (var ti = 0; ti < _idx.length; ti++) {
      var twords = _idx[ti].arW;
      var tseen  = {};
      for (var wi = 0; wi < twords.length; wi++) {
        var tw = twords[wi];
        if (!tseen[tw]) {
          tseen[tw] = 1;
          if (!_tokenIdx[tw]) _tokenIdx[tw] = [];
          _tokenIdx[tw].push(ti);
        }
      }
    }
    _ready = true;
    console.log('[QuranSearch] indexReady count=' + _idx.length +
      ' tokenKeys=' + Object.keys(_tokenIdx).length + ' ms=' + (Date.now() - t0));
  }

  /* ── Verse scorer ─────────────────────────────────────────────── */
  /* Returns {score, srcs, posAr, posKu, phraseScore, consecutiveScore, tokenScore, translationScore, finalScore} */
  function scoreVerse(e, qArN, qLo, arTokens, loTokens) {
    var phraseScore = 0, consecutiveScore = 0, tokenScore = 0, translationScore = 0;
    var srcs = [], posAr = -1, posKu = -1;

    /* ── 1. Exact normalized Arabic phrase ───────────────────── */
    if (qArN.length >= 3) {
      var ap = e.arN.indexOf(qArN);
      if (ap !== -1) {
        posAr = ap;
        phraseScore = 1000;
        if (ap === 0)       phraseScore += 150;
        else if (ap < 20)   phraseScore += 80;
        else if (ap < 60)   phraseScore += 40;
        if (srcs.indexOf('arabic') === -1) srcs.push('arabic');
      }
    }

    /* ── 2. Consecutive token sequence (phrase not found) ────── */
    if (phraseScore === 0 && arTokens.length >= 2) {
      var consec = _maxConsec(e.arW, arTokens);
      if (consec >= 2) {
        if      (consec >= arTokens.length) consecutiveScore = 850;
        else if (consec >= 5)               consecutiveScore = 550 + consec * 20;
        else if (consec >= 4)               consecutiveScore = 400 + consec * 20;
        else if (consec >= 3)               consecutiveScore = 200 + consec * 20;
        else                                consecutiveScore = 80;
        if (srcs.indexOf('arabic') === -1) srcs.push('arabic');
        if (posAr === -1) posAr = 0;
      }
    }

    /* ── 3. Token matching with stopword downweighting ───────── */
    if (phraseScore === 0) {
      var arHit = 0, arPfxHit = 0;
      var nonStopTotal = 0, nonStopHit = 0;
      for (var i = 0; i < arTokens.length; i++) {
        var tok = arTokens[i];
        if (tok.length < 2) continue;
        var isStop = STOP_AR[tok] === 1;
        if (!isStop) nonStopTotal++;
        var tp = e.arN.indexOf(tok);
        if (tp !== -1) {
          arHit++;
          if (!isStop) nonStopHit++;
          if (posAr === -1) posAr = tp;
          if (srcs.indexOf('arabic') === -1) srcs.push('arabic');
        } else {
          var stripped = _stripPfx(tok);
          if (stripped && e.arN.indexOf(stripped) !== -1) {
            arPfxHit++;
            if (srcs.indexOf('arabic') === -1) srcs.push('arabic');
          }
        }
      }
      var totalToks = arTokens.filter(function (t) { return t.length >= 2; }).length;
      if (totalToks > 0 && (arHit + arPfxHit) > 0) {
        // Non-stop tokens carry most weight; stop tokens add a small bonus
        var nonStopScore = nonStopTotal > 0 ? (nonStopHit / nonStopTotal) * 220 : 0;
        var stopBonus    = Math.max(0, arHit - nonStopHit + arPfxHit) * 8;
        tokenScore = Math.round(nonStopScore + stopBonus);
        // Bonus for complete coverage (all meaningful tokens present)
        if (nonStopTotal > 0 && nonStopHit >= nonStopTotal) tokenScore += 40;
      }
    }

    /* ── 4. Kurdish / translation match ─────────────────────── */
    if (e.kuN && qLo.length >= 2) {
      var kp = e.kuN.indexOf(qLo);
      if (kp !== -1) {
        posKu = kp;
        translationScore += 250 + (kp === 0 ? 60 : 0);
        if (srcs.indexOf('translation') === -1) srcs.push('translation');
      } else if (loTokens.length > 1) {
        var kuHit = 0;
        for (var j = 0; j < loTokens.length; j++) {
          if (loTokens[j].length >= 3 && e.kuN.indexOf(loTokens[j]) !== -1) {
            kuHit++;
            if (posKu === -1) posKu = e.kuN.indexOf(loTokens[j]);
          }
        }
        if (kuHit >= 2) {
          translationScore += kuHit * 50;
          if (srcs.indexOf('translation') === -1) srcs.push('translation');
        } else if (kuHit === 1) {
          translationScore += 35;
          if (srcs.indexOf('translation') === -1) srcs.push('translation');
        }
      }
    }

    /* ── 5. Tafsir fallback (only when no Arabic/translation match) */
    if (phraseScore === 0 && consecutiveScore === 0 && tokenScore === 0 && translationScore < 50) {
      if (e.tfN && qLo.length >= 3) {
        var tP = e.tfN.indexOf(qLo);
        if (tP !== -1) {
          translationScore += 110;
          srcs.push('tafsir');
          if (posKu === -1) posKu = tP;
        } else if (loTokens.length > 1) {
          var tfHit = 0;
          for (var k = 0; k < loTokens.length; k++) {
            if (loTokens[k].length >= 4 && e.tfN.indexOf(loTokens[k]) !== -1) tfHit++;
          }
          if (tfHit >= 2) { translationScore += tfHit * 28; srcs.push('tafsir'); }
        }
      }
    }

    var finalScore = phraseScore + consecutiveScore + tokenScore + translationScore;
    return {
      score: finalScore, srcs: srcs, posAr: posAr, posKu: posKu,
      phraseScore: phraseScore, consecutiveScore: consecutiveScore,
      tokenScore: tokenScore, translationScore: translationScore,
      finalScore: finalScore,
      _vLen: e.arW.length
    };
  }

  /* ── Find verse by sn+an ──────────────────────────────────────── */
  function findVerse(sn, an) {
    for (var i=0; i<_idx.length; i++) {
      if (_idx[i].sn===sn && _idx[i].an===an) return _idx[i];
    }
    return null;
  }

  /* ── Main query function ──────────────────────────────────────── */
  function query(q, surahs, maxResults) {
    if (!_ready || !q) return [];
    maxResults = maxResults || 30;

    var qOrig = q.trim();
    if (!qOrig) return [];

    // Exact-phrase mode: query wrapped in " " or « » or " "
    var exactMode = qOrig.length > 2 &&
      ((qOrig[0]==='"'    && qOrig[qOrig.length-1]==='"')    ||
       (qOrig[0]==='“' && qOrig[qOrig.length-1]==='”') ||
       (qOrig[0]==='«' && qOrig[qOrig.length-1]==='»'));
    if (exactMode) qOrig = qOrig.slice(1, -1).trim();

    var qLo  = normLo(qOrig);
    var qArN = _typoFix(normAr(qOrig)); // normalize then fix common typos
    var mode = detectMode(qOrig, qLo);
    var results = [], refKeys = {};
    var t0 = Date.now();

    /* ── 1. Famous verse alias ───────────────────────────────── */
    var va = VA[qLo] || VA[cleanKey(qLo)] || VA[qArN] || VA[normAr(cleanKey(qOrig))];
    if (va) {
      var ve = findVerse(va.sn, va.an);
      if (ve) {
        var vSn = surahs[ve.sn-1] || {};
        results.push({
          type:'ref', sn:ve.sn, an:ve.an, arO:ve.arO, kuO:ve.kuO,
          surahAr:vSn.ar||'', surahEn:vSn.en||'',
          score:1000, matchType:'alias', matchSrcs:['arabic'],
          posAr:0, posKu:-1, mode:mode,
          phraseScore:1000, consecutiveScore:0, tokenScore:0, translationScore:0, finalScore:1000
        });
        refKeys[ve.sn+':'+ve.an] = 1;
      }
    }

    /* ── 2. Reference pattern (2:255 / baqarah 255 / etc.) ──── */
    var ref = parseRef(qLo, surahs);
    if (ref && !refKeys[ref.sn+':'+ref.an]) {
      var re = findVerse(ref.sn, ref.an);
      if (re) {
        var rSn = surahs[re.sn-1] || {};
        results.push({
          type:'ref', sn:re.sn, an:re.an, arO:re.arO, kuO:re.kuO,
          surahAr:rSn.ar||'', surahEn:rSn.en||'',
          score:950, matchType:'ref', matchSrcs:['ref'],
          posAr:0, posKu:-1, mode:mode,
          phraseScore:0, consecutiveScore:0, tokenScore:0, translationScore:0, finalScore:950
        });
        refKeys[re.sn+':'+re.an] = 1;
      }
    }

    /* ── 3. Surah name search ────────────────────────────────── */
    var snFromAlias = SA[qLo] || SA[cleanKey(qLo)];
    var surahHits = [];
    for (var k=0; k<surahs.length; k++) {
      var s = surahs[k];
      var sc2 = 0;
      var enLo = normLo(s.en), enCl = cleanKey(enLo);
      var qCl  = cleanKey(qLo), arN2 = normAr(s.ar);
      if      (String(s.n) === qLo)                            sc2 = 920;
      else if (enLo===qLo || enCl===qCl)                      sc2 = 860;
      else if (arN2===qArN)                                    sc2 = 860;
      else if (snFromAlias===s.n)                              sc2 = 840;
      else if (qCl.length>=3  && enCl.indexOf(qCl)  !== -1)   sc2 = 700;
      else if (qArN.length>=2 && arN2.indexOf(qArN) !== -1)   sc2 = 700;
      else if (qLo.length>=3  && enLo.indexOf(qLo)  !== -1)   sc2 = 660;
      if (sc2 > 0) surahHits.push({
        type:'surah', sn:s.n, surahAr:s.ar, surahEn:s.en,
        ayahCount:s.a, score:sc2, matchSrcs:['surah'], mode:mode
      });
    }
    surahHits.sort(function(a,b){return b.score-a.score;});
    surahHits = surahHits.slice(0, 4);

    /* ── 4. Verse index search ───────────────────────────────── */
    var verseHits = [];
    if (qArN.length >= 2 || qLo.length >= 2) {
      var arTokens = qArN.split(/\s+/).filter(function(t){return t.length>=2;});
      var loTokens = qLo.split(/\s+/).filter(function(t){return t.length>=2;});

      // Pre-filter via token index — typical Arabic phrase: ~5-50 candidates vs 6236
      var candidates = _getCandidates(arTokens);
      var scanLen = candidates ? candidates.length : _idx.length;

      var tScan = Date.now();
      for (var m = 0; m < scanLen; m++) {
        var e = candidates ? _idx[candidates[m]] : _idx[m];
        if (refKeys[e.sn+':'+e.an]) continue;
        var sv = scoreVerse(e, qArN, qLo, arTokens, loTokens);
        if (sv.score <= 0) continue;
        if (exactMode && sv.phraseScore === 0) continue; // strict exact-phrase mode
        var sh = surahs[e.sn-1] || {};
        verseHits.push({
          type:'verse', sn:e.sn, an:e.an, arO:e.arO, kuO:e.kuO,
          surahAr:sh.ar||'', surahEn:sh.en||'',
          score:sv.score, matchSrcs:sv.srcs,
          posAr:sv.posAr, posKu:sv.posKu, mode:mode,
          phraseScore:sv.phraseScore, consecutiveScore:sv.consecutiveScore,
          tokenScore:sv.tokenScore, translationScore:sv.translationScore,
          finalScore:sv.finalScore, _vLen:sv._vLen
        });
      }
      var scanMs = Date.now() - tScan;
      var tRank = Date.now();
      verseHits.sort(function(a,b){
        if (b.score !== a.score) return b.score - a.score;
        if (a.phraseScore > 0 && b.phraseScore > 0 && a.posAr !== b.posAr) return a.posAr - b.posAr;
        if ((a._vLen||99) !== (b._vLen||99)) return (a._vLen||99) - (b._vLen||99);
        return a.sn - b.sn;
      });
      var rankMs = Date.now() - tRank;
      verseHits = verseHits.slice(0, 25);
      // Track stats
      _stats.queries++;
      _stats.totalMs += scanMs + rankMs;
      if (scanMs + rankMs > 80) _stats.slowQ.push({q:qOrig, ms:scanMs+rankMs});
      if (!verseHits.length) _stats.zeroQ.push(qOrig);
      console.log('[QSearchPerf] query="'+qOrig+'" candidates='+scanLen+'/'+_idx.length+
        ' scanMs='+scanMs+' rankMs='+rankMs+' hits='+verseHits.length+(exactMode?' [exact]':''));
    }

    var out = results.concat(surahHits, verseHits);
    if (out.length > 0 && out[0].sn) {
      console.log('[QSearchPerf] top=' + out[0].sn + ':' + (out[0].an || '') + ' score=' + out[0].score);
    }
    console.log('[QuranSearch] query="'+qOrig+'" mode='+mode+' results='+out.length+' ms='+(Date.now()-t0));
    return out;
  }

  /* ── Live phrase suggestions ─────────────────────────────────── */
  /* Prefix-matches query against Arabic VA keys → [{text, sn, an}] */
  function suggest(q) {
    if (!q || q.length < 2) return [];
    var qN = _typoFix(normAr(q));
    var suggs = [], seen = {};
    var vaKeys = Object.keys(VA);
    for (var i = 0; i < vaKeys.length; i++) {
      var key = vaKeys[i];
      if (!/[؀-ۿ]/.test(key)) continue; // Arabic keys only
      var keyN = normAr(key);
      if (keyN.length > qN.length + 1 && keyN.indexOf(qN) === 0) {
        var target = VA[key];
        var tKey = target.sn + ':' + target.an;
        if (!seen[tKey]) {
          seen[tKey] = 1;
          suggs.push({text: key, sn: target.sn, an: target.an});
        }
      }
    }
    return suggs.slice(0, 5);
  }

  /* ── Public API ─────────────────────────────────────────────── */
  window.QuranSearch = {
    init: function (quranData, tafsirData) {
      if (!quranData || !tafsirData) return;
      _ready = false;
      setTimeout(function () { buildIndex(quranData, tafsirData); }, 0);
    },

    query: function (q, surahs, max) { return query(q, surahs, max); },

    suggest: function (q) { return _ready ? suggest(q) : []; },

    isReady: function () { return _ready; },

    stats: function () {
      return {
        queries:    _stats.queries,
        avgMs:      _stats.queries ? Math.round(_stats.totalMs / _stats.queries) : 0,
        slowQueries: _stats.slowQ.slice(-10),
        zeroResults: _stats.zeroQ.slice(-10),
        indexSize:  _idx.length,
        tokenKeys:  Object.keys(_tokenIdx).length,
        workerEnabled: false
      };
    },

    debug: function (surahs) {
      var tests = [
        /* required test cases */
        'ومن يتوكل على الله فهو حسبه',
        'فهو حسبه',
        'لا تقنطوا من رحمة الله',
        'إن مع العسر يسرا',
        'ان مع العسر يسرا',
        'رب زدني علما',
        'إياك نعبد وإياك نستعين',
        'حسبنا الله ونعم الوكيل',
        /* fuzzy variants */
        'ومن يتوكل ع الله فهو حسبه',
        'ومن يتوكل على الله فهوا حسبه',
        /* reference / surah */
        '2:255', '٢:٢٥٥',
        'البقره 255',
        'الفاتحه', 'Al-Fatiha',
        /* classic */
        'قال رب زدني علما',
        'لا اله الا انت سبحانك',
        'yaseen', 'ikhlas', 'hasbunallah',
        'rabbish rahli sadri',
        'قل هو الله'
      ];
      console.group('QuranSearch.debug()');
      tests.forEach(function (q) {
        var r = query(q, surahs, 3);
        console.log(
          '"' + q + '" →',
          r.map(function (x) {
            var dbg = x.phraseScore !== undefined
              ? ' [P=' + x.phraseScore + ' C=' + x.consecutiveScore +
                ' T=' + x.tokenScore + ' Tr=' + x.translationScore +
                ' F=' + x.finalScore + ']'
              : '';
            return x.type + ' ' + x.sn + (x.an ? ':' + x.an : '') +
              ' (' + x.score + ')' + dbg +
              ' srcs=' + ((x.matchSrcs || []).join(',')) + ' mode=' + x.mode;
          }).join(' | ') || '(no results)'
        );
      });
      console.groupEnd();
    }
  };
})();
