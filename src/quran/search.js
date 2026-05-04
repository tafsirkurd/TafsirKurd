/* =====================================================================
 * QuranSearch — Smart Quran Search Engine v2.0
 * TafsirKurd Capacitor App
 *
 * Architecture:
 *  normAr()       — Arabic normalization (harakat, alef, ya, hamza, tatweel, ta-marbuta)
 *  normLo()       — lowercase/trim normalize
 *  arDigits()     — Arabic-Indic → ASCII digits
 *  _stripPfx()    — strip one-letter Arabic prefixes (و/ف/ب/ل/ك)
 *  SA             — Surah aliases (English transliterations)
 *  VA             — Famous verse aliases (Arabic phrases + English names)
 *  parseRef()     — "2:255" / "٢:٢٥٥" / "baqarah 255" / "البقرة 255" etc.
 *  detectMode()   — detect query mode: ref / surah / arabic / latin / mixed
 *  buildIndex()   — one-time: precomputes arN + kuN + tfN for all 6236 verses
 *  scoreVerse()   — weighted score + match sources + match positions
 *  query()        — orchestrates all above, returns ranked results
 *
 * Result shapes:
 *  {type:'ref',   sn, an, arO, kuO, surahAr, surahEn, score, matchSrcs, posAr, posKu, mode}
 *  {type:'surah', sn, surahAr, surahEn, ayahCount, score, matchSrcs, mode}
 *  {type:'verse', sn, an, arO, kuO, surahAr, surahEn, score, matchSrcs, posAr, posKu, mode}
 *
 * Debug logs:
 *  [QuranSearch] indexReady count=N ms=M
 *  [QuranSearch] query="..." mode=MODE results=N ms=M
 * ===================================================================== */
(function () {
  'use strict';

  /* ── Arabic normalization pipeline ──────────────────────────────── */
  function normAr(s) {
    if (!s) return '';
    s = String(s);
    // 1. Remove harakat / tashkeel / Quran tajweed marks
    s = s.replace(/[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۨ-ۭ]/g, '');
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
    /* Arabic — Ayat al-Kursi */
    'ايه الكرسي':{sn:2,an:255},'اية الكرسي':{sn:2,an:255},'ايات الكرسي':{sn:2,an:255},
    'الله لا اله الا هو':{sn:2,an:255},
    /* Arabic — Rabbi zidni ilma */
    'رب زدني علما':{sn:20,an:114},'رب زدنى علما':{sn:20,an:114},
    'قال رب زدني علما':{sn:20,an:114},'قال ربي زدني علما':{sn:20,an:114},
    /* Arabic — Qul huwallahu */
    'قل هو الله احد':{sn:112,an:1},'قل هو الله':{sn:112,an:1},
    /* Arabic — Bismillah / Fatiha */
    'بسم الله':{sn:1,an:1},'بسم الله الرحمن الرحيم':{sn:1,an:1},
    'الحمد لله':{sn:1,an:2},'الحمد لله رب العالمين':{sn:1,an:2},
    /* Arabic — Hasbunallah */
    'حسبنا الله':{sn:3,an:173},'حسبنا الله ونعم الوكيل':{sn:3,an:173},
    /* Arabic — La taqnatu */
    'لا تقنطوا':{sn:39,an:53},'لا تقنطوا من رحمة الله':{sn:39,an:53},
    /* Arabic — Inna maal usri */
    'ان مع العسر يسرا':{sn:94,an:6},'فان مع العسر يسرا':{sn:94,an:6},
    /* Arabic — Inna Allah maa sabirin */
    'ان الله مع الصابرين':{sn:2,an:153},
    /* Arabic — La tahzan */
    'لا تحزن':{sn:9,an:40},
    /* Arabic — Dua Yunus / La ilaha illa anta */
    'لا اله الا انت سبحانك':{sn:21,an:87},'لا اله الا انت':{sn:21,an:87},
    'سبحانك اني كنت من الظالمين':{sn:21,an:87},'دعاء يونس':{sn:21,an:87},
    /* Arabic — Rabbi ishrah */
    'رب اشرح لي صدري':{sn:20,an:25},'رب اشرح':{sn:20,an:25},
    /* Arabic — Rabbana atina */
    'ربنا اتنا':{sn:2,an:201},'ربنا اتنا في الدنيا حسنة':{sn:2,an:201},
    /* Arabic — Alam nashrah */
    'الم نشرح':{sn:94,an:1},'الم نشرح لك صدرك':{sn:94,an:1},
    /* Arabic — Wama arsalnaka */
    'وما ارسلناك الا رحمه للعالمين':{sn:21,an:107},
    /* Arabic — Inna lillahi */
    'انا لله وانا اليه راجعون':{sn:2,an:156},'انا لله':{sn:2,an:156},
    /* English — Dua Yunus */
    'la ilaha illa anta subhanaka':{sn:21,an:87},'dua yunus':{sn:21,an:87},
    /* English — Inna lillahi */
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
  var _idx   = [];
  var _ready = false;

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
        // Fallback: if no translation, use first 200 chars of tafsir for display
        if (!kuO && tfO) kuO = tfO.substring(0, 200);
        _idx.push({
          sn: sn, an: vi + 1,
          arO: arO, arN: normAr(arO),
          kuO: kuO, kuN: normLo(kuO),
          tfO: tfO, tfN: normLo(tfO)
        });
      }
    }
    _ready = true;
    console.log('[QuranSearch] indexReady count=' + _idx.length + ' ms=' + (Date.now() - t0));
  }

  /* ── Verse scorer ─────────────────────────────────────────────── */
  /* Returns {score, srcs, posAr, posKu} */
  function scoreVerse(e, qArN, qLo, arTokens, loTokens) {
    var sc = 0, srcs = [], posAr = -1, posKu = -1;

    /* Arabic exact phrase */
    var ap = e.arN.indexOf(qArN);
    if (ap !== -1) {
      posAr = ap;
      sc += 500;
      if (ap === 0)       sc += 150;
      else if (ap < 20)   sc += 80;
      else if (ap < 60)   sc += 40;
      if (srcs.indexOf('arabic') === -1) srcs.push('arabic');
    }

    /* Arabic token matching */
    if (arTokens.length > 0) {
      var arHit = 0, arPfx = 0;
      for (var i=0; i<arTokens.length; i++) {
        var tok = arTokens[i];
        if (tok.length < 2) continue;
        var tp = e.arN.indexOf(tok);
        if (tp !== -1) {
          arHit++;
          if (posAr === -1) posAr = tp;
          if (srcs.indexOf('arabic') === -1) srcs.push('arabic');
        } else {
          // Try stripping one-letter prefix (handles و/ف/ب/ل prefixed words)
          var stripped = _stripPfx(tok);
          if (stripped && e.arN.indexOf(stripped) !== -1) arPfx++;
        }
      }
      var totalArTok = arTokens.filter(function(t){return t.length>=2;}).length;
      if (totalArTok > 1) {
        if (sc < 300) {
          if (arHit + arPfx >= totalArTok) sc += 350;
          else if (arHit >= 2)             sc += arHit * 55 + arPfx * 25;
          else if (arHit === 1)            sc += 30 + arPfx * 20;
        } else {
          // Bonus for additional token hits on top of phrase match
          if (arHit >= 2) sc += 20;
        }
      } else if (totalArTok === 1 && sc === 0 && qArN.length >= 3) {
        // Single token — try prefix strip for a modest bonus
        var stripped1 = _stripPfx(qArN);
        if (stripped1 && e.arN.indexOf(stripped1) !== -1) {
          sc += 120;
          if (srcs.indexOf('arabic') === -1) srcs.push('arabic');
          if (posAr === -1) posAr = e.arN.indexOf(stripped1);
        }
      }
    }

    /* Kurdish / translation match */
    if (e.kuN && qLo.length >= 2) {
      var kp = e.kuN.indexOf(qLo);
      if (kp !== -1) {
        posKu = kp; sc += 250;
        if (kp === 0) sc += 60;
        if (srcs.indexOf('translation') === -1) srcs.push('translation');
      } else if (loTokens.length > 1) {
        var kuHit = 0;
        for (var j=0; j<loTokens.length; j++) {
          if (loTokens[j].length >= 3 && e.kuN.indexOf(loTokens[j]) !== -1) {
            kuHit++;
            if (posKu === -1) posKu = e.kuN.indexOf(loTokens[j]);
          }
        }
        if (kuHit >= 2) { sc += kuHit * 50; if (srcs.indexOf('translation') === -1) srcs.push('translation'); }
        else if (kuHit === 1) { sc += 35; if (srcs.indexOf('translation') === -1) srcs.push('translation'); }
      }
    }

    /* Tafsir match — lower priority, only when no other match */
    if (sc === 0 && e.tfN && qLo.length >= 3) {
      var tP = e.tfN.indexOf(qLo);
      if (tP !== -1) {
        sc += 110;
        srcs.push('tafsir');
        if (posKu === -1) posKu = tP;
      } else if (loTokens.length > 1) {
        var tfHit = 0;
        for (var k=0; k<loTokens.length; k++) {
          if (loTokens[k].length >= 4 && e.tfN.indexOf(loTokens[k]) !== -1) tfHit++;
        }
        if (tfHit >= 2) { sc += tfHit * 28; srcs.push('tafsir'); }
      }
    }

    return {score: sc, srcs: srcs, posAr: posAr, posKu: posKu};
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

    var qLo  = normLo(qOrig);
    var qArN = normAr(qOrig);
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
          posAr:0, posKu:-1, mode:mode
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
          posAr:0, posKu:-1, mode:mode
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
      for (var m=0; m<_idx.length; m++) {
        var e = _idx[m];
        if (refKeys[e.sn+':'+e.an]) continue;
        var sv = scoreVerse(e, qArN, qLo, arTokens, loTokens);
        if (sv.score > 0) {
          var sh = surahs[e.sn-1] || {};
          verseHits.push({
            type:'verse', sn:e.sn, an:e.an, arO:e.arO, kuO:e.kuO,
            surahAr:sh.ar||'', surahEn:sh.en||'',
            score:sv.score, matchSrcs:sv.srcs,
            posAr:sv.posAr, posKu:sv.posKu, mode:mode
          });
          if (verseHits.length >= 300) break;
        }
      }
      verseHits.sort(function(a,b){return b.score-a.score;});
      verseHits = verseHits.slice(0, 25);
    }

    var out = results.concat(surahHits, verseHits);
    console.log('[QuranSearch] query="'+qOrig+'" mode='+mode+' results='+out.length+' ms='+(Date.now()-t0));
    return out;
  }

  /* ── Public API ─────────────────────────────────────────────── */
  window.QuranSearch = {
    init: function (quranData, tafsirData) {
      if (!quranData || !tafsirData) return;
      _ready = false;
      setTimeout(function () { buildIndex(quranData, tafsirData); }, 0);
    },

    query: function (q, surahs, max) { return query(q, surahs, max); },

    isReady: function () { return _ready; },

    debug: function (surahs) {
      var tests = [
        '2:255', '٢:٢٥٥',
        'البقره 255',
        'الفاتحه', 'Al-Fatiha',
        'قال رب زدني علما',
        'قال ربي زدني علما',
        'لا اله الا انت سبحانك',
        'yaseen', 'ikhlas', 'hasbunallah',
        'forgiveness', 'patience', 'baqarah',
        'rabbish rahli sadri',
        'قل هو الله',
        'ان مع العسر يسرا',
        'لا تقنطوا'
      ];
      console.group('QuranSearch.debug()');
      tests.forEach(function (q) {
        var r = query(q, surahs, 3);
        console.log(
          '"' + q + '" →',
          r.map(function (x) {
            return x.type + ' ' + x.sn + (x.an ? ':' + x.an : '') +
              ' (' + x.score + ') srcs=' + ((x.matchSrcs || []).join(',')) + ' mode=' + x.mode;
          }).join(', ') || '(no results)'
        );
      });
      console.groupEnd();
    }
  };
})();
