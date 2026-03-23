/* =====================================================================
 * QuranSearch — Smart Quran Search Engine v1.0
 * TafsirKurd Capacitor App
 *
 * Architecture:
 *  normAr()      — Arabic normalization pipeline (harakat, alef, ya, hamza, tatweel)
 *  SURAH_ALIASES — transliteration / common spellings → surah number
 *  VERSE_ALIASES — famous ayah strings → {sn, an}
 *  parseRef()    — detects "2:255" / "2/255" / "baqarah 255" etc.
 *  buildIndex()  — one-time: precomputes arN + kuN for all 6236 verses
 *  scoreVerse()  — weighted score: Arabic exact/position/tokens + Kurdish
 *  query()       — orchestrates all above, returns ranked results array
 *
 * Result shapes:
 *  {type:'ref',   sn, an, arO, kuO, surahAr, surahEn, score, matchType}
 *  {type:'surah', sn, surahAr, surahEn, ayahCount, score}
 *  {type:'verse', sn, an, arO, kuO, surahAr, surahEn, score}
 *
 * Performance:
 *  Index built once via setTimeout(0) — never blocks app init.
 *  Query: ~6236 indexOf() iterations ≈ 2-5ms on mid-range Android.
 *  Debounce is applied at the App.onSearch layer (150ms).
 * ===================================================================== */
(function () {
  'use strict';

  /* ── Arabic normalization pipeline ──────────────────────────────── */
  function normAr(s) {
    if (!s) return '';
    s = String(s);
    // 1. Remove harakat / tashkeel / Quran tajweed marks
    s = s.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, '');
    // 2. Normalize alef variants → ا  (أ إ آ ٱ ٱ)
    s = s.replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627');
    // 3. Normalize alif maqsura ى → ي
    s = s.replace(/\u0649/g, '\u064A');
    // 4. Normalize hamza on waw ؤ → و
    s = s.replace(/\u0624/g, '\u0648');
    // 5. Normalize hamza on ya ئ → ي
    s = s.replace(/\u0626/g, '\u064A');
    // 6. Remove tatweel ـ
    s = s.replace(/\u0640/g, '');
    // 7. Normalize ta marbuta ة → ه  (helps "رحمة" match "رحمه")
    s = s.replace(/\u0629/g, '\u0647');
    // 8. Normalize whitespace
    s = s.replace(/\s+/g, ' ').trim();
    return s;
  }

  /* ── Lowercase normalize ────────────────────────────────────────── */
  function normLo(s) { return s ? String(s).toLowerCase().trim() : ''; }

  /* ── Strip leading "al-" and collapse spaces/apostrophes ───────── */
  function cleanKey(s) { return s.replace(/^al[-\s]/i, '').replace(/[-'\s]/g, ''); }

  /* ── Surah aliases  (normalized string → surah number) ─────────── */
  /* Covers English names, common transliterations, alternate spellings */
  var SA = {
    /* 1 */ fatiha:1,fatihah:1,faatiha:1,opening:1,
    /* 2 */ baqarah:2,albaqarah:2,albaqara:2,bakara:2,baqara:2,bagara:2,
    /* 3 */ aliimran:3,alimran:3,imran:3,
    /* 4 */ nisa:4,nissa:4,nesa:4,women:4,
    /* 5 */ maidah:5,maid:5,table:5,
    /* 6 */ anam:6,cattle:6,
    /* 7 */ araf:7,heights:7,
    /* 8 */ anfal:8,spoils:8,
    /* 9 */ tawbah:9,toba:9,towba:9,taubah:9,repentance:9,
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
  /* Maps normalized search string → {sn, an} */
  var VA = {
    /* Ayat al-Kursi — 2:255 */
    'ayat al kursi': {sn:2,an:255}, 'ayat alkursi': {sn:2,an:255},
    'ayatul kursi':  {sn:2,an:255}, 'ayatulkursi':  {sn:2,an:255},
    'ayt al kursi':  {sn:2,an:255}, 'ayah al kursi': {sn:2,an:255},
    'al kursi':      {sn:2,an:255}, 'alkursi':       {sn:2,an:255},
    'kursi':         {sn:2,an:255}, 'throne verse':  {sn:2,an:255},
    /* Last 2 ayahs of Al-Baqarah — 2:285 */
    'amanar rasulo':    {sn:2,an:285}, 'amanar rasulu':  {sn:2,an:285},
    'amana alrasulo':   {sn:2,an:285}, 'amanar rasul':   {sn:2,an:285},
    'last 2 baqarah':   {sn:2,an:285}, 'last two baqarah': {sn:2,an:285},
    /* Rabbi zidni ilma — 20:114 */
    'rabbi zidni ilma': {sn:20,an:114}, 'rabbi zidni':     {sn:20,an:114},
    'zidni ilma':       {sn:20,an:114}, 'rabi zidni':      {sn:20,an:114},
    /* Rabbish sharh — 20:25 */
    'rabbish rahli sadri': {sn:20,an:25}, 'rabbi shrahli':        {sn:20,an:25},
    'rabbi shrah li sadri':{sn:20,an:25}, 'rabbish sharh li sadri':{sn:20,an:25},
    'rabb ishrah':         {sn:20,an:25}, 'expand my chest':      {sn:20,an:25},
    /* Qul huwallahu — 112:1 */
    'qul huwallahu ahad': {sn:112,an:1}, 'qul huwa allahu': {sn:112,an:1},
    'say he is allah':    {sn:112,an:1},
    /* Inna maal usri — 94:5-6 */
    'inna maal usri yusra':  {sn:94,an:5}, 'fainna maal usri yusra': {sn:94,an:6},
    'maal usri yusra':       {sn:94,an:5}, 'with hardship comes ease': {sn:94,an:5},
    /* Hasbunallah — 3:173 */
    'hasbunallah wanimal wakeel': {sn:3,an:173}, 'hasbunallah': {sn:3,an:173},
    'sufficient for us is allah': {sn:3,an:173},
    /* Bismillah / Al-Fatiha */
    'bismillah': {sn:1,an:1}, 'bism allah': {sn:1,an:1},
    'alhamdulillah': {sn:1,an:2}, 'al hamdu lillah': {sn:1,an:2},
    /* La tahzan — 9:40 */
    'la tahzan': {sn:9,an:40}, 'do not grieve': {sn:9,an:40},
    /* La taqnatu — 39:53 */
    'la taqnatu':                  {sn:39,an:53},
    'la taqnatu min rahmat allah': {sn:39,an:53},
    'do not despair':              {sn:39,an:53},
    /* Inna Allah maa as-sabirin — 2:153 */
    'innallaha maas sabirin':  {sn:2,an:153},
    'inna llaha maa ssabirin': {sn:2,an:153},
    'god is with the patient': {sn:2,an:153},
    /* Ya-Sin */
    'ya sin': {sn:36,an:1}, 'ya seen': {sn:36,an:1},
    /* Iqra — 96:1 */
    'iqra bismi rabbik': {sn:96,an:1}, 'recite in the name': {sn:96,an:1}
  };

  /* ── Reference parser ──────────────────────────────────────────── */
  /* Returns {sn, an} or null */
  function parseRef(qLo, surahs) {
    var m;
    // "2:255" or "2/255"
    m = qLo.match(/^(\d{1,3})\s*[:/]\s*(\d{1,3})$/);
    if (m) { var sn = +m[1], an = +m[2]; if (sn >= 1 && sn <= 114 && an >= 1) return {sn:sn, an:an}; }
    // "2 255"
    m = qLo.match(/^(\d{1,3})\s+(\d{1,3})$/);
    if (m) { var sn2 = +m[1], an2 = +m[2]; if (sn2 >= 1 && sn2 <= 114 && an2 >= 1) return {sn:sn2, an:an2}; }
    // "baqarah 255" or "البقرة 255"
    m = qLo.match(/^(.+?)\s+(\d{1,3})$/);
    if (m && +m[2] >= 1) {
      var np = normLo(m[1]);
      var npc = cleanKey(np);
      var an3 = +m[2];
      if (SA[np])  return {sn:SA[np],  an:an3};
      if (SA[npc]) return {sn:SA[npc], an:an3};
      // Try full SURAHS array
      var arQ = normAr(m[1]);
      for (var i = 0; i < surahs.length; i++) {
        var s = surahs[i];
        var enCl = cleanKey(normLo(s.en));
        if (npc.length >= 3 && enCl.indexOf(npc) !== -1) return {sn:s.n, an:an3};
        if (arQ.length >= 2 && normAr(s.ar).indexOf(arQ) !== -1) return {sn:s.n, an:an3};
      }
    }
    return null;
  }

  /* ── Search index ──────────────────────────────────────────────── */
  /* Flat array of precomputed verse entries. Built once after data loads. */
  var _idx = [];
  var _ready = false;

  function buildIndex(quranData, tafsirData) {
    var t0 = Date.now();
    _idx = [];
    for (var sn = 1; sn <= 114; sn++) {
      var sd = quranData[String(sn)];
      if (!sd) continue;
      var vv = sd.verses || sd;
      var kd = tafsirData ? (tafsirData[sn - 1] || {verses:[]}) : {verses:[]};
      var kvv = kd.verses || [];
      for (var vi = 0; vi < vv.length; vi++) {
        var vObj = vv[vi];
        var arO = String(vObj.text || vObj || '');
        var kuO = kvv[vi] ? String(kvv[vi].text || kvv[vi].tafsir || '') : '';
        _idx.push({
          sn:  sn,
          an:  vi + 1,
          arO: arO,
          arN: normAr(arO),
          kuO: kuO,
          kuN: normLo(kuO)
        });
      }
    }
    _ready = true;
    console.log('[QuranSearch] index built ' + (Date.now() - t0) + 'ms — ' + _idx.length + ' verses');
  }

  /* ── Verse scorer ──────────────────────────────────────────────── */
  /* Returns a relevance score > 0 when verse matches the query */
  function scoreVerse(e, qArN, qLo, tokens) {
    var sc = 0;
    // Arabic exact phrase
    var ap = e.arN.indexOf(qArN);
    if (ap !== -1) {
      sc += 500;
      if (ap === 0)       sc += 150; // starts at beginning — big bonus
      else if (ap < 20)   sc += 80;
      else if (ap < 60)   sc += 40;
    }
    // Multi-token Arabic (partial phrase — each word separately)
    if (tokens.length > 1) {
      var hit = 0;
      for (var i = 0; i < tokens.length; i++) {
        if (tokens[i].length >= 2 && e.arN.indexOf(tokens[i]) !== -1) hit++;
      }
      if (hit === tokens.length && sc === 0) sc += 350; // all tokens found
      else if (hit >= 2 && sc === 0)         sc += hit * 55;
      else if (hit >= 1 && sc === 0)         sc += hit * 25;
    }
    // Kurdish match
    if (e.kuN && qLo.length >= 2) {
      var kp = e.kuN.indexOf(qLo);
      if (kp !== -1) {
        sc += 250;
        if (kp === 0) sc += 60;
      }
    }
    return sc;
  }

  /* ── Utility: find verse in index by sn+an ─────────────────────── */
  function findVerse(sn, an) {
    for (var i = 0; i < _idx.length; i++) {
      if (_idx[i].sn === sn && _idx[i].an === an) return _idx[i];
    }
    return null;
  }

  /* ── Main query function ───────────────────────────────────────── */
  /* Returns array of result objects ordered: refs first, then surahs, then verses */
  function query(q, surahs, maxResults) {
    if (!_ready || !q) return [];
    maxResults = maxResults || 30;

    var qOrig = q.trim();
    if (!qOrig) return [];
    var qLo  = normLo(qOrig);
    var qArN = normAr(qOrig);
    var results = [];
    var refKeys = {};

    /* ── 1. Famous verse alias ─────────────────────────────────── */
    var va = VA[qLo] || VA[cleanKey(qLo)];
    if (va) {
      var ve = findVerse(va.sn, va.an);
      if (ve) {
        var vSn = surahs[ve.sn - 1] || {};
        results.push({type:'ref', sn:ve.sn, an:ve.an, arO:ve.arO, kuO:ve.kuO,
          surahAr:vSn.ar||'', surahEn:vSn.en||'', score:1000, matchType:'alias'});
        refKeys[ve.sn + ':' + ve.an] = 1;
      }
    }

    /* ── 2. Reference pattern (2:255 / baqarah 255 / etc.) ─────── */
    var ref = parseRef(qLo, surahs);
    if (ref && !refKeys[ref.sn + ':' + ref.an]) {
      var re = findVerse(ref.sn, ref.an);
      if (re) {
        var rSn = surahs[re.sn - 1] || {};
        results.push({type:'ref', sn:re.sn, an:re.an, arO:re.arO, kuO:re.kuO,
          surahAr:rSn.ar||'', surahEn:rSn.en||'', score:950, matchType:'ref'});
        refKeys[re.sn + ':' + re.an] = 1;
      }
    }

    /* ── 3. Surah name search ──────────────────────────────────── */
    var snFromAlias = SA[qLo] || SA[cleanKey(qLo)];
    var surahHits = [];
    for (var k = 0; k < surahs.length; k++) {
      var s = surahs[k];
      var sc2 = 0;
      var enLo = normLo(s.en);
      var enCl = cleanKey(enLo);
      var qCl  = cleanKey(qLo);
      var arN2 = normAr(s.ar);
      if      (String(s.n) === qLo)                               sc2 = 920;
      else if (enLo === qLo || enCl === qCl)                     sc2 = 860;
      else if (arN2 === qArN)                                     sc2 = 860;
      else if (snFromAlias === s.n)                               sc2 = 840;
      else if (qCl.length >= 3  && enCl.indexOf(qCl)  !== -1)    sc2 = 700;
      else if (qArN.length >= 2 && arN2.indexOf(qArN) !== -1)    sc2 = 700;
      else if (qLo.length >= 3  && enLo.indexOf(qLo)  !== -1)    sc2 = 660;
      if (sc2 > 0) surahHits.push({type:'surah', sn:s.n, surahAr:s.ar, surahEn:s.en, ayahCount:s.a, score:sc2});
    }
    surahHits.sort(function (a, b) { return b.score - a.score; });
    surahHits = surahHits.slice(0, 4);

    /* ── 4. Verse index search ─────────────────────────────────── */
    var verseHits = [];
    if (qArN.length >= 2 || qLo.length >= 2) {
      var tokens = qArN.split(/\s+/).filter(function (t) { return t.length >= 2; });
      for (var m = 0; m < _idx.length; m++) {
        var e = _idx[m];
        if (refKeys[e.sn + ':' + e.an]) continue; // already shown as direct ref
        var score = scoreVerse(e, qArN, qLo, tokens);
        if (score > 0) {
          var sv = surahs[e.sn - 1] || {};
          verseHits.push({type:'verse', sn:e.sn, an:e.an, arO:e.arO, kuO:e.kuO,
            surahAr:sv.ar||'', surahEn:sv.en||'', score:score});
          if (verseHits.length >= 300) break; // performance guard
        }
      }
      verseHits.sort(function (a, b) { return b.score - a.score; });
      verseHits = verseHits.slice(0, 25);
    }

    return results.concat(surahHits, verseHits);
  }

  /* ── Public API ─────────────────────────────────────────────────── */
  window.QuranSearch = {
    /* Call once after both quranData and tafsirData are loaded */
    init: function (quranData, tafsirData) {
      if (!quranData || !tafsirData) return;
      _ready = false;
      /* Defer to avoid blocking app initialisation */
      setTimeout(function () { buildIndex(quranData, tafsirData); }, 0);
    },

    /* Main search entry point */
    query: function (q, surahs, max) { return query(q, surahs, max); },

    isReady: function () { return _ready; },

    /* Console debug helper — call QuranSearch.debug(SURAHS) from DevTools */
    debug: function (surahs) {
      var tests = [
        'الحمد لله', 'لا تقنطوا', '2:255', 'ayat al kursi',
        'البقرة 255', 'رب اشرح لي صدري', 'yaseen', 'ikhlas',
        'amanar rasulu', 'forgiveness', 'mercy', 'patience',
        'baqarah', 'baqrah', 'rabbish rahli sadri', 'قل هو الله'
      ];
      console.group('QuranSearch.debug()');
      tests.forEach(function (q) {
        var r = query(q, surahs, 3);
        console.log(
          '"' + q + '" →',
          r.map(function (x) {
            return x.type + ' ' + x.sn + (x.an ? ':' + x.an : '') + ' (' + x.score + ')';
          }).join(', ') || '(no results)'
        );
      });
      console.groupEnd();
    }
  };
})();
