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
    // 1. Strip all Arabic diacritics and Quran annotation marks
    s = s.replace(/[ؐ-ًؚ-ٰٟۖ-ۜ۟-ۭ]/g, '');
    // 2. Normalize alef variants → ا (U+0671 alef wasla included)
    s = s.replace(/[آأإٱ]/g, 'ا');
    // 3. Normalize alif maqsura ى → ي
    s = s.replace(/ى/g, 'ي');
    // 4. Normalize ؤ → و
    s = s.replace(/ؤ/g, 'و');
    // 5. Normalize ئ → ي
    s = s.replace(/ئ/g, 'ي');
    // 6. Remove tatweel/kashida ـ
    s = s.replace(/ـ/g, '');
    // 7. Normalize ta marbuta ة → ه
    s = s.replace(/ة/g, 'ه');
    // 8. Small waw/ya variants used in some Quran encodings
    s = s.replace(/ۥ/g, 'و');
    s = s.replace(/ۦ/g, 'ي');
    // 9. Collapse whitespace
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

  /* ── Strip common Arabic suffixes & definite article ─────────── */
  /* Enables morphological matching: الصابرين ↔ صابر ↔ صابرون etc.
   * Conservative: only strips when base remains ≥ 3 chars.          */
  function _stripSfx(tok) {
    if (!tok || tok.length <= 3) return null;
    var t = tok;
    // Strip definite article ال
    if (t.length > 3 && t.slice(0, 2) === 'ال') t = t.slice(2);
    // Strip common suffixes (possessive/plural/verb endings)
    var sfxs = ['كم','هم','ها','هن',
                'نا','كن','ني','ون',
                'ين','وا','تم','ات'];
    for (var i = 0; i < sfxs.length; i++) {
      var s = sfxs[i];
      if (t.length > s.length + 2 && t.slice(-s.length) === s) {
        var base = t.slice(0, -s.length);
        if (base.length >= 3) return base;
      }
    }
    return t !== tok ? t : null;
  }

  /* ── Deep stem: strip verbal prefixes to approach trilateral root ─
   * Handles forms like يكتب→كتب، مكتوب→كتب، تكتب→كتب، استغفر→غفر.
   * Applied as a last-resort fallback — more aggressive than _stripSfx. */
  function _deepStem(tok) {
    if (!tok || tok.length < 4) return null;
    var t = tok;
    // Strip definite article first
    if (t.slice(0, 2) === 'ال' && t.length > 4) t = t.slice(2);
    var orig = t;
    // Multi-letter verbal prefixes (most specific first)
    var pfxs = ['استف','استغ','است','انت','يست','تست','مست',
                'است','انف','يت','تت','مت',
                'ي','ت','أ','ا','م','ن'];
    for (var i = 0; i < pfxs.length; i++) {
      var p = pfxs[i];
      if (t.length > p.length + 2 && t.slice(0, p.length) === p) {
        var cand = t.slice(p.length);
        if (cand.length >= 3) { t = cand; break; }
      }
    }
    // Also strip common suffixes from the result
    var sfxs2 = ['ون','ين','ات','وا','تم','نا','ها','هم'];
    for (var j = 0; j < sfxs2.length; j++) {
      var s2 = sfxs2[j];
      if (t.length > s2.length + 2 && t.slice(-s2.length) === s2) {
        var base2 = t.slice(0, -s2.length);
        if (base2.length >= 3) { t = base2; break; }
      }
    }
    return t !== orig ? t : null;
  }

  /* ── Typo tolerance: fix common Arabic keyboard/input errors ─── */
  function _typoFix(s) {
    if (!s) return s;
    // Trailing alef on و/ه endings (فهوا → فهو, هذها → هذه)
    s = s.replace(/وا(\s|$)/g, 'و$1');
    s = s.replace(/ها(\s|$)/g, 'ه$1');
    // الاه → الله (very common phone-keyboard mistake)
    s = s.replace(/الاه/g, 'الله');
    // ييي / ووو / ааа — collapse 3+ repeated chars → 1
    s = s.replace(/(.)\1{2,}/g, '$1');
    // Duplicate leading conjunctions: "و ومن" → "ومن", "ف فمن" → "فمن"
    s = s.replace(/^[وف]\s+([وفبلك])/g, '$1');
    s = s.replace(/(\s)[وف]\s+([وفبلك])/g, '$1$2');
    // Missing space between long Arabic words (>12 chars, likely two words merged)
    // e.g. "ومنيتوكل" → try splitting at inner common prefixes after first 3 chars
    s = s.replace(/([^\s]{4,})(ومن|وما|فمن|فما|وان|ثم|وهو|وهي|وله|وفي|وان)([^\s])/g, '$1 $2$3');
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
    // Prefixed forms: verse has "ويتوكل", user typed "يتوكل"
    var pfx = 'وفبلك';
    for (var p = 0; p < pfx.length; p++) {
      var ph = _tokenIdx[pfx[p] + tok];
      if (ph) for (var j = 0; j < ph.length; j++) s.add(ph[j]);
    }
    // Suffix-stripped form: user typed "صابرون", index has "صابرين"/"الصابرين"/etc.
    var stem = _stripSfx(tok);
    if (stem && stem !== tok) {
      var sh = _tokenIdx[stem];
      if (sh) for (var k = 0; k < sh.length; k++) s.add(sh[k]);
      for (var p2 = 0; p2 < pfx.length; p2++) {
        var psh = _tokenIdx[pfx[p2] + stem];
        if (psh) for (var l = 0; l < psh.length; l++) s.add(psh[l]);
      }
    }
    // Deep stem: verb forms يكتب→كتب (offline root approximation)
    var dstem = _deepStem(tok);
    if (dstem && dstem !== tok && dstem !== stem) {
      var dh = _tokenIdx[dstem];
      if (dh) for (var m2 = 0; m2 < dh.length; m2++) s.add(dh[m2]);
    }
    return s;
  }

  /* Narrow the full _idx to candidate positions using non-stop tokens.
   * Returns pre-sorted array of _idx positions (highest token overlap first),
   * or null when a full scan is needed. Pre-sorting means the best matches
   * are scored first — critical for future early-exit optimization. */
  function _getCandidates(arTokens) {
    var nonStop = arTokens.filter(function(t) { return t.length >= 2 && !STOP_AR[t]; });
    if (!nonStop.length) return null; // all stopwords → full scan

    var overlap = {}; // _idx position → count of distinct non-stop tokens matched
    var maxSingle = 0;
    for (var t = 0; t < nonStop.length; t++) {
      var cs = _getTokCandidates(nonStop[t]);
      if (cs.size > maxSingle) maxSingle = cs.size;
      cs.forEach(function(idx) { overlap[idx] = (overlap[idx] || 0) + 1; });
    }
    if (maxSingle > 2500 && nonStop.length === 1) return null;
    // Sort positions by overlap count descending — likely best matches scored first
    var positions = Object.keys(overlap).map(Number);
    positions.sort(function(a, b) { return overlap[b] - overlap[a]; });
    return positions;
  }

  /* ── Token equality with prefix + suffix strip fallback ──────── */
  function _tokMatch(vWord, qTok) {
    if (vWord === qTok) return true;
    var vs = _stripPfx(vWord), qs = _stripPfx(qTok);
    if (vs && vs === qTok) return true;
    if (qs && qs === vWord) return true;
    if (vs && qs && vs === qs) return true;
    // Suffix stripping: صابرين ↔ صابر, الصابرين ↔ صابرون
    var vss = _stripSfx(vWord), qss = _stripSfx(qTok);
    if (vss && (vss === qTok || vss === qs)) return true;
    if (qss && (qss === vWord || qss === vs)) return true;
    if (vss && qss && vss === qss) return true;
    // Deep stem: verb forms يكتب ↔ كتب, مكتوب ↔ كتب (offline root approximation)
    var vds = _deepStem(vWord), qds = _deepStem(qTok);
    if (vds && (vds === qTok || vds === qs || vds === qss)) return true;
    if (qds && (qds === vWord || qds === vs || qds === vss)) return true;
    if (vds && qds && vds === qds) return true;
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

  /* Reverse VA lookup: "sn:an" → first canonical Arabic phrase (for "did you mean?") */
  var _vaRevMap = (function() {
    var m = {}, keys = Object.keys(VA);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (/[؀-ۿ]/.test(k) && k.length >= 6) {
        var vk = VA[k].sn + ':' + VA[k].an;
        if (!m[vk]) m[vk] = k;
      }
    }
    return m;
  })();

  /* ── Semantic verse concept tags ─────────────────────────────── */
  /* Maps "sn:an" → space/comma-separated concept keywords (Arabic + Kurdish Sorani).
   * Covers emotion, life-situation, and spiritual state so users can find verses
   * by feeling/topic, not just wording. Semantic tier fires when other scores are weak. */
  var VTAGS = {
    /* ── Fatiha ─────────────────────────────────────── */
    '1:1':  'بسملة افتتاح رحمن رحيم، به ناوی خودا شروع بسم',
    '1:2':  'حمد ستایش سوپاس رب عالمين، پەروەردگار جیهان',
    '1:5':  'عبادة استعانة نعبد نستعين، پرستن یارمەتی تەنهایە دووعا',
    '1:6':  'صراط مستقيم هداية ڕێگای ڕاست ڕێنوێنی هدایت',
    '1:7':  'صراط منعم انعمت عليهم، ئەوانەی نیعمەتیان دا خودا',
    /* ── Baqarah ─────────────────────────────────────── */
    '2:2':  'كتاب لا ريب هدى متقين، قورئان گومان نییە ڕێنوێنی',
    '2:45': 'صبر صلاة استعينوا، سابری نوێژ یارمەتی خواستن',
    '2:152':'ذكر اذكروني يادی خودا کردن یادکردن بیرهێنانەوە ذکر',
    '2:153':'صبر صابرين الله مع کردن، سابری تووشانی خودا لەگەڵ',
    '2:155':'بلاء خوف جوع نقص اموال ابتلاء، تاقیکردنەوە ترس کەمبوون تووشانن',
    '2:156':'انا لله راجعون مصيبة استرجاع، ئێمە لە خوداین مردن داهاتوو',
    '2:186':'دعا دعوة قريب يجيب يستجب مجيب، دووعا کردن نزیک وەڵام خودا هیوا',
    '2:201':'دنيا حسنة اخرة عذاب ربنا اتنا، دووعا دنیا ئاخرەت خیری هر دووان',
    '2:255':'كرسي إله الحي القيوم وسع كرسي، ئایەتی کورسی پاراستن',
    '2:286':'يكلف وسعها لا كلف نفسا، گرانتر توانا ناکات خودا',
    /* ── Al Imran ─────────────────────────────────────── */
    '3:31': 'تحبون الله اتبعوني يحببكم، خودا خۆشدەوێت پەیڕەوی خۆشبوون',
    '3:133':'سارعوا جنة عرضها السماوات اتقين، بهشت بەرزبوون بەرزکردنەوە',
    '3:135':'استغفروا ذنوب اصر كبير، لێخۆشبوون توبه گوناه',
    '3:160':'ينصركم الله فلا غالب لكم توكل وكيل، یاری خودا سەرکەوتن',
    '3:173':'حسبنا الله ونعم الوكيل توكل وكالة، بەسە باشترین وەکیل تەوەکول',
    '3:185':'ذائقة الموت اجور قيامة، هەموو گیانێک مردن ئاخرەت',
    '3:200':'صابروا رابطوا اتقوا فلاح، سابری ئاماده بون سەرکەوتن',
    /* ── Nisa ─────────────────────────────────────────── */
    '4:1':  'نفس واحدة زوج رجال نساء، دروستکردن هاوسەرگیری ئینسان خزم',
    '4:110':'يعمل سوء يظلم نفسه يستغفر الله غفور، خراپی کردن لێخۆشبوون توبه گوناه',
    /* ── Tawbah ──────────────────────────────────────── */
    '9:40': 'لا تحزن الله معنا سكينة، مەترسە ترس ئارام خودا لەگەڵ غم حزن بێهیوایی',
    '9:51': 'لن يصيبنا الا ما كتب الله مولانا توكل، نابێت بگاتێ جگەی ئەوەی نووسراوە قەدەر',
    '9:104':'توبة عن عباده يأخذ الصدقات غفور رحيم، توبه قبولکردن خودا',
    /* ── Yunus ───────────────────────────────────────── */
    '10:62':'اولياء الله خوف يحزنون لا، دۆستانی خودا ترس خەم نییان ئارام',
    /* ── Ibrahim ─────────────────────────────────────── */
    '14:7': 'شكرتم لأزيدنكم كفرتم عذابي شكر، سوپاس زیاد نیعمەت سوپاسگزاری',
    /* ── Hijr ────────────────────────────────────────── */
    '15:56':'من يقنط من رحمة ربه الضالون، هیوا بڕی رەحمەت بێهیوایی',
    /* ── Nahl ────────────────────────────────────────── */
    '16:97':'عمل صالح ذكر انثى حياة طيبة حسن اجر، ژیانی باش کاری باش',
    /* ── Isra ────────────────────────────────────────── */
    '17:23':'والدين احسانا اف تنهرهما رحمهما، دایکوباوک باشی خزمەت',
    '17:44':'يسبح سماوات ارض شيء تسبيح، تازبیدەکەن هەر شتێک',
    '17:80':'رب ادخلني مدخل صدق اخرجني مخرج سلطانا نصيرا، دووعا گەیشتن',
    /* ── Kahf ────────────────────────────────────────── */
    '18:10':'اصحاب الكهف فتية ربنا رحمة هيئ رشدا، غاری کەهف دووعا کەسانی غار',
    /* ── Maryam ──────────────────────────────────────── */
    '19:4': 'وهن العظم اشتعل الرأس شيبا، کوڕی کۆنبوون دووعا زکریا پیری',
    /* ── Taha ────────────────────────────────────────── */
    '20:25':'رب اشرح صدري يسر امري يفقهوا قولي، دووعای موسا سینەکشانەوە گرانی',
    '20:114':'زدني علما رب قل زيادة، زانست زیادکردن فێرکاری خوێندن',
    /* ── Anbiya ──────────────────────────────────────── */
    '21:83':'ايوب ضر مسني الارحم الراحمين، دووعای ئەیووب ئازار کێشە نەخۆشی',
    '21:87':'يونس لا اله الا انت سبحانك ظالمين، دووعای یونس تاریکی بێهیوایی',
    '21:107':'ارسلناك رحمة للعالمين، ئەرسال رەحمەت جیهان',
    /* ── Muminun ─────────────────────────────────────── */
    '23:118':'رب اغفر وارحم خير الراحمين، دووعا لێخۆشبوون توبه خواستن',
    /* ── Nur ─────────────────────────────────────────── */
    '24:35':'الله نور سماوات ارض نور على نور، خودا رووناکی',
    /* ── Naml ────────────────────────────────────────── */
    '27:62':'يجيب المضطر دعاه يكشف السوء ضرر، دووعا ئیچاچاک ئازار کێشە وەڵام',
    /* ── Qasas ───────────────────────────────────────── */
    '28:24':'رب لما انزلت من خير فقير، موسا دووعا خیر خزانە دانخواستن',
    /* ── Ankabut ─────────────────────────────────────── */
    '29:69':'جاهدوا لنهدينهم سبلنا محسنين، جهاد ڕێنوێنی تووشانن',
    /* ── Rum ─────────────────────────────────────────── */
    '30:21':'مودة رحمة ازواجا سكن ذكر انثى، هاوسەرگیری ئارامی خۆشی ژناشووی',
    /* ── Luqman ──────────────────────────────────────── */
    '31:12':'اتينا لقمان حكمة يشكر لنفسه كفر غني حميد، سوپاس خودا زانا',
    '31:14':'وصينا الإنسان بوالديه حملته وهنا فصاله، دایکوباوک خزمەتکردن',
    /* ── Ahzab ───────────────────────────────────────── */
    '33:41':'اذكروا الله ذكرا كثيرا سبح، زیاد یادی خودا کردن ذکر',
    /* ── Zumar ───────────────────────────────────────── */
    '39:53':'تقنطوا رحمة الله يغفر الذنوب جميعا، هیوا توبه ئومید لێخۆشبوون مغفرت بێهیوایی',
    /* ── Ghafir ──────────────────────────────────────── */
    '40:60':'ادعوني استجب دعاء استجابة، دووعا کردن وەڵام دانەوە دووعاکردن',
    /* ── Fussilat ────────────────────────────────────── */
    '41:30':'قالوا ربنا الله استقاموا ملائكة لا تخافوا لا تحزنوا، ئیستیقامەت ئارام',
    /* ── Shura ───────────────────────────────────────── */
    '42:27':'لو بسط الله الرزق لعباده لبغوا ينزل بقدر يشاء، ریزق قەدەر داباشکردن',
    /* ── Muhammad ────────────────────────────────────── */
    '47:7': 'تنصروا الله ينصركم يثبت اقدامكم، یاری خودا سەرکەوتن',
    /* ── Hujurat ─────────────────────────────────────── */
    '49:13':'خلقناكم ذكر انثى شعوبا قبائل لتعارفوا اتقاكم، نەتەوە ناسین',
    /* ── Dhariyat ────────────────────────────────────── */
    '51:58':'الله هو الرزاق ذو القوة المتين، خودا ریزقدەر روزی',
    /* ── Rahman ──────────────────────────────────────── */
    '55:13':'الاء ربكما تكذبان نعمة آلاء، نیعمەت مندانی خودا',
    /* ── Hadid ───────────────────────────────────────── */
    '57:3': 'هو الأول والآخر الظاهر الباطن بكل شيء عليم، پێشوو دوایین زانا',
    /* ── Mujadilah ───────────────────────────────────── */
    '58:11':'يرفع الله الذين آمنوا اوتوا العلم درجات زيادة، بەرزکردنەوە زانست فێرکاری',
    /* ── Jumuah ──────────────────────────────────────── */
    '62:10':'قضيت الصلاة فانتشروا الارض ابتغوا فضل، کاری کردن دوای نوێژ ریزق',
    /* ── Talaq ───────────────────────────────────────── */
    '65:3': 'توكل يتوكل رزق حسبه بالغ امره قدر قضاء، تەوەکول ڕیزق روزی بەسە پشت بستن',
    /* ── Mulk ────────────────────────────────────────── */
    '67:2': 'خلق الموت والحياة يبلوكم احسن عملا، مردن ژیان تاقی کردن',
    '67:15':'سخر لكم الارض فامشوا فعلوا وارزقوا، زەوی ریزق کارکردن روزی',
    /* ── Muzammil ────────────────────────────────────── */
    '73:20':'اقرءوا ما تيسر قران اقيموا الصلاة، خوێندنی قورئان نوێژ',
    /* ── Inshirah ────────────────────────────────────── */
    '94:1': 'الم نشرح لك صدرك وضع وزرك ذكر، سینەکشانەوە غم سواکردن ئەندۆه',
    '94:5': 'إن مع العسر يسرا فان مع، سختی گرانی دوای ئاسانی هیوا',
    '94:6': 'إن مع العسر يسرا، سختی گرانی دوای ئاسانی هیوا',
    /* ── Tin ─────────────────────────────────────────── */
    '95:4': 'خلقنا الإنسان احسن تقويم، مرۆڤ باشترین دروستکراو',
    /* ── Alaq ────────────────────────────────────────── */
    '96:1': 'اقرأ باسم ربك خلق علق، بخوێنە ناوی پەروەردگار زانست خوێندن',
    /* ── Ikhlas ──────────────────────────────────────── */
    '112:1':'قل هو الله احد الصمد، تەوحید یەکتایی یەکانەیی',
    /* ── Falaq + Nas ─────────────────────────────────── */
    '113:1':'قل اعوذ برب الفلق شر حاسد، پاراستن شێطان بەرەبەیان',
    '114:1':'قل اعوذ برب الناس ملك الناس وسواس، پاراستن مرۆڤ شێطان وسواس',
    /* additional concept tags */
    '2:45': 'استعينوا بالصبر والصلاة كبيرة صابرين، یارمەتی سابری نوێژ گرانە',
    '2:62': 'لا خوف عليهم ولا هم يحزنون امنوا عمل صالح، ترس خەم نییان ئارام',
    '2:112':'بلى من اسلم وجهه لله محسن اجر، مسلمان باشی پاداش',
    '2:128':'ربنا واجعلنا مسلمين ذرية امة مناسكنا تب، دووعا مسلمان نووسین',
    '2:238':'حافظوا على الصلوات الوسطى قانتين، نوێژ پازداری قانتین',
    '2:269':'يؤتي الحكمة من يشاء خير كثير، زانایی دانا زیادكردن',
    '3:8':  'ربنا لا تزغ قلوبنا هديتنا رحمة وهاب، دووعا قەڵب هدایت',
    '3:31': 'تحبون الله فاتبعوني يحببكم يغفر، خودا خۆشدەوێتی پەیڕەوکردن',
    '3:133':'وسارعوا مغفرة ربكم جنة عرضها السماوات، بەخشین بهشت خێرا',
    '3:139':'ولا تهنوا ولا تحزنوا الاعلون مؤمنين، ئەستەم ناکەن سەرکەوتن',
    '4:79': 'ما اصابك من سيئة من نفسك حسنة من الله، بەلا ئازار خودا',
    '10:62':'ألا إن أولياء الله لا خوف يحزنون امنوا يتقون، دۆستانی خودا ترس خەم',
    '11:88':'وما توفيقي إلا بالله عليه توكلت أنيب، پشتکردن موفق',
    '11:114':'إن الحسنات يذهبن السيئات ذكرى للذاكرين، باشی خراپ دەمەوه دەبات',
    '12:64':'والله خير الحافظين أرحم الراحمين، پازداری باشترین ئاریکار',
    '12:87':'ولا تيأسوا من روح الله يأس إلا القوم الكافرون، هیوابڕی بێهیوایی',
    '13:11':'لا يغير الله ما بقوم ما بانفسهم، گۆڕین ئەحوال ئارادەی خودا',
    '16:97':'من عمل صالحا حياة طيبة أجر بأحسن ما كانوا، ژیانی باش کار باش',
    '17:44':'وإن من شيء إلا يسبح بحمده ملائكة، تازبیدەکەن هەر شتێک',
    '17:80':'رب أدخلني مدخل صدق أخرجني مخرج سلطانا، دووعا سەفەر گەیشتن',
    '23:118':'رب اغفر وارحم خير الراحمين رحمة، دووعا لێخۆشبوون توبه',
    '24:35':'الله نور السماوات والأرض نور على نور يهدي، رووناکی هدایت',
    '25:74':'ربنا هب لنا من أزواجنا قرة أعين إماما للمتقين، دووعا خانوبەرە',
    '29:69':'والذين جاهدوا فينا لنهدينهم سبلنا محسنين، کوشش هدایت ڕێنوێنی',
    '30:21':'من آياته خلق أزواجا مودة ورحمة سكن، هاوسەرگیری خۆشی ئارام',
    '39:10':'إنما يوفى الصابرون أجرهم بغير حساب، سابری پاداش بێژمارە',
    '40:55':'فاصبر إن وعد الله حق استغفر ذنبك، سابری بوون ئیستیقامەت',
    '49:10':'إنما المؤمنون إخوة فأصلحوا بينكم، برایەتی باشکردن',
    '51:56':'وما خلقت الجن والإنس إلا ليعبدون، دروستکراوین پرستین ئامانج',
    '57:4': 'وهو معكم أينما كنتم بكل شيء عليم، خودا لەگەڵ هەموو کات دانا',
    '59:22':'هو الله الذي لا اله الا هو عالم الغيب الملك القدوس، تەوحید خودا',
    '65:2': 'ومن يتق الله يجعل له مخرجا ويرزقه، تەقوا مخرج ریزق',
    '99:7': 'من يعمل مثقال ذرة خيرا يره حساب، کاری باش پاداش',
    '99:8': 'من يعمل مثقال ذرة شرا يره حساب، کاری خراپ سزا'
  };

  /* ── Verse relationship clusters ─────────────────────────────── */
  /* Maps "sn:an" → array of semantically related verse refs (same concept cluster).
   * Surfaced as "related ayahs" under primary search results. */
  var RELATED = {
    '65:3':  ['3:173','9:51','3:160','42:27','51:58'],
    '3:173': ['65:3','9:51','2:255','3:160'],
    '2:255': ['59:22','112:1','57:3','2:286'],
    '2:286': ['94:5','2:153','65:3','3:185'],
    '2:153': ['3:200','94:5','2:45','2:155'],
    '2:155': ['3:200','2:286','67:2','2:156'],
    '2:156': ['3:185','67:2','2:155','9:40'],
    '2:186': ['40:60','27:62','21:87','2:201'],
    '9:40':  ['10:62','41:30','3:173','13:28'],
    '9:51':  ['65:3','3:173','3:160','2:286'],
    '10:62': ['9:40','41:30','3:173','13:28'],
    '13:28': ['2:152','33:41','9:40','10:62'],
    '14:7':  ['31:12','55:13','2:152','34:15'],
    '20:114':['58:11','96:1','20:25','31:12'],
    '21:83': ['21:87','27:62','2:186','40:60'],
    '21:87': ['21:83','27:62','2:186','40:60'],
    '27:62': ['40:60','2:186','21:87','21:83'],
    '39:53': ['3:135','9:104','4:110','15:56'],
    '40:60': ['2:186','27:62','21:87','2:201'],
    '41:30': ['9:40','10:62','2:153','3:200'],
    '94:5':  ['94:6','2:286','65:3','2:153'],
    '94:6':  ['94:5','2:286','65:3','2:153'],
    '2:201': ['2:286','2:155','3:133','17:80'],
    '112:1': ['2:255','57:3','1:1','1:2'],
    '17:23': ['31:14','4:1','30:21','2:228'],
    '30:21': ['4:1','17:23','2:187','2:228'],
    '3:185': ['2:156','67:2','2:155','9:40'],
    '58:11': ['20:114','96:1','31:12','2:269'],
    '51:58': ['65:3','67:15','62:10','42:27'],
    '55:13': ['14:7','31:12','2:152','27:40'],
    '33:41': ['2:152','13:28','2:186','3:191'],
    '1:5':   ['40:60','2:186','21:87','2:201'],
    '2:152': ['33:41','13:28','2:186','3:191']
  };

  /* ── Ayah importance scores (0–1000) for ultra-short query ranking ────────── */
  /* Applied as scaled bonus when query has ≤3 meaningful tokens.
   * Represents spiritual/cultural salience independent of query content. */
  var AYAH_PRIORITY = {
    '1:1':980,'1:2':980,'1:4':900,'1:5':980,'1:6':950,'1:7':900,
    '2:45':840,'2:62':800,'2:152':870,'2:153':920,'2:155':840,'2:156':920,
    '2:177':820,'2:186':960,'2:201':890,'2:214':870,'2:238':800,'2:255':1000,'2:286':980,
    '3:8':820,'3:18':810,'3:133':840,'3:139':840,'3:173':940,'3:185':920,'3:191':810,'3:200':820,
    '4:17':800,'4:57':810,'4:103':800,
    '7:23':880,'7:55':820,'7:156':830,
    '9:40':880,'9:104':810,'9:129':860,
    '10:62':830,'11:6':820,'12:87':840,
    '13:23':830,'13:28':960,
    '14:7':890,'14:30':800,'14:40':820,
    '17:9':800,'17:23':840,'17:24':820,'17:80':820,
    '20:25':890,'20:114':970,
    '21:87':940,'21:107':860,
    '27:62':860,'28:77':810,
    '29:57':810,'29:60':810,
    '33:41':830,'39:9':820,'39:10':830,'39:53':960,'39:73':830,
    '40:60':960,'41:30':830,'46:13':820,'47:7':820,'49:10':820,'49:13':830,
    '51:58':820,'55:13':920,'55:46':850,'56:12':840,
    '58:11':830,'59:22':830,'62:8':810,'64:13':820,'65:2':850,'65:3':950,
    '66:6':800,'66:8':820,'71:10':810,
    '87:17':820,'93:4':820,'94:1':870,'94:5':940,'94:6':960,
    '96:1':840,'103:3':820,'112:1':1000,'112:2':970,'112:3':960,'112:4':940
  };

  /* ── Intent boosts — known single-word spiritual searches ────────────────── */
  /* Maps common one-word Arabic spiritual queries to the most likely ayahs.
   * Applied when query has ≤1 meaningful token, pre-injecting these into candidates. */
  var INTENT_BOOSTS = {
    'رب':    ['20:114','20:25','2:201','7:23','9:129','14:40','17:80','3:8'],
    'ربنا':  ['2:201','2:286','7:23','3:8','14:40','59:10'],
    'الله':  ['2:255','112:1','13:28','59:22','2:163','3:18','64:13'],
    'الحمد': ['1:2','17:111','64:1','27:93','14:7'],
    'صبر':   ['2:153','2:155','39:10','2:177','3:200','103:3','94:5'],
    'خوف':   ['10:62','41:30','46:13','2:62','3:170','9:40'],
    'جنة':   ['3:133','13:23','55:46','56:12','39:73','4:57','2:25'],
    'نار':   ['66:6','3:131','2:24','14:30','4:56'],
    'دعاء':  ['2:186','40:60','27:62','21:87','2:201','7:55'],
    'ذكر':   ['13:28','2:152','33:41','3:191','18:24'],
    'توكل':  ['65:3','3:173','9:129','64:13','39:38'],
    'رزق':   ['65:3','51:58','11:6','29:60','2:3'],
    'مغفرة': ['39:53','3:135','4:110','71:10','9:104'],
    'شكر':   ['14:7','2:172','31:12','16:114'],
    'علم':   ['20:114','96:1','58:11','39:9','2:31'],
    'رحمة':  ['21:107','39:53','7:156','6:12','2:186'],
    'صلاة':  ['2:45','2:153','11:114','4:103','2:238'],
    'موت':   ['3:185','29:57','62:8','16:61','2:156'],
    'قلب':   ['13:28','3:8','2:10','26:89','50:37'],
    'دنيا':  ['2:201','3:185','87:17','18:45','28:77'],
    'آخرة':  ['2:201','42:20','87:17','93:4','28:77'],
    'توبة':  ['39:53','4:17','66:8','9:104','3:135'],
    'هداية': ['1:6','2:2','10:57','39:23'],
    'نعمة':  ['14:7','55:13','16:18','2:172'],
    'أمل':   ['39:53','12:87','3:139','94:5','94:6'],
    'ضيق':   ['94:5','94:6','65:7','2:286'],
    'حزن':   ['9:40','3:139','12:86','2:62'],
    'تقوى':  ['2:177','49:13','3:102','8:29'],
    'قرآن':  ['17:9','2:2','41:44','6:19'],
    'نور':   ['24:35','2:257','57:28','6:122','9:32'],
    'حكمة':  ['2:269','31:12','17:39','4:113'],
    'غفور':  ['39:53','2:173','4:110','71:10','3:31'],
    'جهاد':  ['29:69','9:41','2:218','47:7'],
    'والدين':['17:23','31:14','2:83','4:1'],
    'فرج':   ['94:5','94:6','27:62','65:3','12:87'],
    'شر':    ['113:1','114:1','2:286','4:79'],
    'خير':   ['99:7','2:177','2:201','16:97','3:92'],
    'ذنب':   ['39:53','3:135','4:110','9:104','7:23'],
    'غفر':   ['39:53','7:23','23:118','3:133','71:10'],
    'يسر':   ['94:5','94:6','2:286','65:7','87:8'],
    'عسر':   ['94:5','94:6','2:286','65:7'],
    'ضر':    ['21:83','27:62','2:286','94:5'],
    'تسبيح': ['17:44','21:19','24:41','57:1'],
    'عفو':   ['2:237','64:14','24:22','4:149'],
    'اخوة':  ['49:10','3:103','59:10'],
    'مخرج':  ['65:2','65:3','94:5'],
    'اصلاح': ['11:88','49:10','2:220','4:114'],
    'حساب':  ['99:7','99:8','14:51','2:202'],
    'نعيم':  ['55:46','56:12','13:23','3:133','55:13'],
    'اخرة':  ['2:201','87:17','42:20','28:77','93:4'],
    'جنة':   ['3:133','13:23','55:46','56:12','39:73'],
    'نار':   ['66:6','3:131','2:24','14:30'],
    'انيب':  ['11:88','42:10','39:54'],
    'وليّ':  ['10:62','2:107','3:68','41:30']
  };

  /* ── Famous/memorable ayah fragment index ────────────────────── */
  /* Curated list of notable ayah phrases and fragments. Each entry maps one or
   * more query strings to the "most likely intended" verse. Indexed at buildIndex()
   * time into _famousIdx (exact) and _famousNoSpace (fused-word tolerance). */
  var FAMOUS_PHRASES = [
    /* 65:3 — tawakkul / rizq */
    {q:['يتوكل','فهو حسبه','ومن يتوكل','يتوكل على الله','حسبه ان الله','بالغ امره','ومن يتوكل على الله فهو حسبه'],v:'65:3',w:500},
    /* 3:173 — hasbunallah */
    {q:['حسبنا','حسبنا الله','حسبنا الله ونعم','نعم الوكيل','حسبنا الله وكيل'],v:'3:173',w:500},
    /* 39:53 — la taqnatu */
    {q:['تقنطوا','لا تقنطوا','تقنطوا من رحمة','يغفر الذنوب جميعا','لا تقنطوا من رحمة الله'],v:'39:53',w:500},
    /* 94:6 — inna maal usri */
    {q:['مع العسر يسرا','إن مع العسر','ان مع العسر','العسر يسرا','عسر يسرا'],v:'94:6',w:500},
    /* 94:5 */
    {q:['فإن مع العسر','فان مع العسر'],v:'94:5',w:490},
    /* 20:114 — rabbi zidni ilma */
    {q:['رب زدني','زدني علما','قل رب زدني','رب زدني علما'],v:'20:114',w:500},
    /* 1:5 — iyyaka nabudu */
    {q:['إياك نعبد','اياك نعبد','نعبد ونستعين','نستعين','إياك نعبد وإياك نستعين'],v:'1:5',w:500},
    /* 13:28 — ala bidhikr */
    {q:['الا بذكر الله','ألا بذكر الله','بذكر الله تطمئن','تطمئن القلوب','تطمئن','ذكر الله تطمئن'],v:'13:28',w:500},
    /* 3:185 — kullu nafsin dhaiqat */
    {q:['كل نفس ذائقة','ذائقة الموت','كل نفس ذائقة الموت','ذائقة','كل نفس'],v:'3:185',w:500},
    /* 2:255 — ayat al-kursi */
    {q:['الحي القيوم','لا تاخذه سنة','وسع كرسيه','الحي القيوم لا تاخذه'],v:'2:255',w:500},
    /* 2:286 — la yukallifu */
    {q:['لا يكلف الله','يكلف الله نفسا','نفسا وسعها','لا يكلف نفسا','ربنا لا تؤاخذنا','لا تواخذنا'],v:'2:286',w:500},
    /* 2:214 — nasr allah qarib */
    {q:['نصر الله قريب','الا إن نصر الله','متى نصر الله','الا ان نصر الله'],v:'2:214',w:500},
    /* 9:40 — la tahzan */
    {q:['لا تحزن إن الله','لا تحزن','الله معنا سكينة','إن الله معنا','لا تحزن ان الله معنا'],v:'9:40',w:500},
    /* 2:153 — inna allaha maa sabirin */
    {q:['الله مع الصابرين','إن الله مع الصابرين','مع الصابرين','ان الله مع الصابرين'],v:'2:153',w:500},
    /* 40:60 — ud'uni */
    {q:['ادعوني أستجب','ادعوني استجب','استجيب','ادعوني','أستجب لكم'],v:'40:60',w:500},
    /* 2:186 — idha saala ibadi */
    {q:['فإني قريب','إني قريب أجيب','اجيب دعوة','دعوة الداعي','فاني قريب'],v:'2:186',w:500},
    /* 21:87 — dua yunus */
    {q:['لا إله إلا أنت سبحانك','لا اله الا انت سبحانك','سبحانك إني كنت','إني كنت من الظالمين','اني كنت من الظالمين'],v:'21:87',w:500},
    /* 20:25 — rabbi ishrah */
    {q:['رب اشرح لي صدري','رب اشرح','اشرح لي صدري','اشرح صدري'],v:'20:25',w:500},
    /* 2:201 — rabbana atina */
    {q:['ربنا آتنا في الدنيا','ربنا اتنا','آتنا في الدنيا حسنة','اتنا في الدنيا حسنة'],v:'2:201',w:480},
    /* 7:23 — adam & hawa */
    {q:['ظلمنا أنفسنا','ظلمنا انفسنا','ربنا ظلمنا','إن لم تغفر','ان لم تغفر'],v:'7:23',w:490},
    /* 14:7 — shukr */
    {q:['شكرتم لأزيدنكم','لئن شكرتم','لأزيدنكم','لئن كفرتم عذابي'],v:'14:7',w:480},
    /* 112:1 — ikhlas */
    {q:['قل هو الله أحد','قل هو الله','هو الله أحد','الله الصمد','قل هو الله احد'],v:'112:1',w:500},
    /* 1:1 — bismillah */
    {q:['بسم الله الرحمن','بسم الله','الرحمن الرحيم'],v:'1:1',w:500},
    /* 1:2 — alhamdulillah */
    {q:['الحمد لله رب العالمين','الحمد لله','رب العالمين'],v:'1:2',w:500},
    /* 2:152 — udhkuruni */
    {q:['فاذكروني أذكركم','اذكروني اذكركم','فاذكروني','اذكروني'],v:'2:152',w:480},
    /* 2:156 — inna lillahi */
    {q:['إنا لله وإنا إليه','إنا لله','انا لله واليه','إليه راجعون','انا لله وانا اليه راجعون'],v:'2:156',w:500},
    /* 58:11 — yarfa' al-ilm */
    {q:['يرفع الله الذين','يرفع الله الذين آمنوا','يرفع الله'],v:'58:11',w:470},
    /* 27:62 — yujib al-mudtarr */
    {q:['يجيب المضطر','أمن يجيب المضطر','المضطر إذا دعاه'],v:'27:62',w:480},
    /* 47:7 */
    {q:['تنصروا الله ينصركم','إن تنصروا الله','ان تنصروا الله'],v:'47:7',w:460},
    /* 49:10 */
    {q:['إنما المؤمنون إخوة','المؤمنون إخوة','انما المومنون اخوة'],v:'49:10',w:460},
    /* 3:139 */
    {q:['لا تهنوا ولا تحزنوا','لا تهنوا','وأنتم الأعلون'],v:'3:139',w:460},
    /* 94:1 — alam nashrah */
    {q:['ألم نشرح لك صدرك','ألم نشرح','نشرح لك صدرك','الم نشرح'],v:'94:1',w:460},
    /* 55:13 */
    {q:['فبأي آلاء ربكما','فباي الاء ربكما','آلاء ربكما تكذبان'],v:'55:13',w:470},
    /* 17:23 — parents */
    {q:['لا تقل لهما أف','لا تقل لهما','قل لهما قولا كريما'],v:'17:23',w:460},
    /* 21:107 */
    {q:['وما أرسلناك إلا رحمة','رحمة للعالمين','ارسلناك الا رحمة'],v:'21:107',w:480},
    /* 12:87 — la tay'asu */
    {q:['لا تيأسوا من روح الله','لا ييئس من روح الله','روح الله'],v:'12:87',w:470},
    /* 9:129 — hasbiy allah */
    {q:['حسبي الله','حسبي الله لا إله','لا إله إلا هو عليه توكلت'],v:'9:129',w:470},
    /* 65:2 — yattaqi */
    {q:['ومن يتق الله يجعل','يتق الله يجعل','مخرجا'],v:'65:2',w:460},
    /* 2:45 */
    {q:['واستعينوا بالصبر والصلاة','استعينوا بالصبر','الصبر والصلاة'],v:'2:45',w:460},
    /* 3:173 — hasbunallah additional */
    {q:['ونعم الوكيل','نعم الوكيل'],v:'3:173',w:480},
    /* 13:11 — la yughayyir */
    {q:['لا يغير الله ما بقوم','لا يغير ما بقوم','يغيروا ما بأنفسهم','لا يغير ما بقوم حتى يغيروا'],v:'13:11',w:480},
    /* 51:56 — wa ma khalaqtu */
    {q:['وما خلقت الجن والإنس','وما خلقت الجن','إلا ليعبدون','خلقت الجن والانس الا ليعبدون'],v:'51:56',w:470},
    /* 57:4 — wa huwa ma'akum */
    {q:['وهو معكم أينما كنتم','وهو معكم','معكم أينما كنتم','وهو معكم اينما كنتم'],v:'57:4',w:470},
    /* 99:7 — mithqal dharra khayr */
    {q:['مثقال ذرة خيرا يره','من يعمل مثقال ذرة خيرا','يعمل مثقال ذرة','فمن يعمل مثقال'],v:'99:7',w:460},
    /* 99:8 — mithqal dharra shar */
    {q:['مثقال ذرة شرا يره','يعمل مثقال ذرة شرا'],v:'99:8',w:460},
    /* 11:114 — hasanat */
    {q:['إن الحسنات يذهبن السيئات','الحسنات يذهبن السيئات','يذهبن السيئات'],v:'11:114',w:470},
    /* 3:139 — la tahinu */
    {q:['ولا تهنوا ولا تحزنوا','لا تهنوا ولا تحزنوا','وأنتم الأعلون','لا تهنوا','انتم الاعلون'],v:'3:139',w:460},
    /* 10:62 — awliya' allah */
    {q:['ألا إن أولياء الله','اولياء الله لا خوف','اولياء الله لا خوف عليهم','ألا إن أولياء الله لا خوف'],v:'10:62',w:480},
    /* 3:160 — in yansurkum */
    {q:['إن ينصركم الله فلا غالب','ينصركم الله فلا غالب','فلا غالب لكم','إن ينصركم الله'],v:'3:160',w:460},
    /* 16:97 — hayatan tayyibatan */
    {q:['حياة طيبة','فلنحيينه حياة طيبة','من عمل صالحا ذكر أو أنثى','حياة طيبه','حياه طيبه'],v:'16:97',w:470},
    /* 11:88 — tawfiqi */
    {q:['وما توفيقي إلا بالله','ما توفيقي إلا بالله','توفيقي الا بالله'],v:'11:88',w:450},
    /* 29:69 — walladhina jahadu */
    {q:['والذين جاهدوا فينا لنهدينهم','جاهدوا فينا لنهدينهم','لنهدينهم سبلنا','والذين جاهدوا فينا'],v:'29:69',w:460},
    /* 40:55 — faasbir */
    {q:['فاصبر إن وعد الله حق','إن وعد الله حق','إن وعد الله حق واستغفر'],v:'40:55',w:450},
    /* 25:74 — rabbana hab lana */
    {q:['ربنا هب لنا من أزواجنا','هب لنا من أزواجنا','قرة أعين','ربنا هب لنا'],v:'25:74',w:460},
    /* 3:8 — la tuzigh */
    {q:['ربنا لا تزغ قلوبنا','لا تزغ قلوبنا بعد إذ هديتنا','هبنا من لدنك رحمة','ربنا لا تزغ'],v:'3:8',w:460},
    /* 2:128 — rabbana waj'alna */
    {q:['ربنا واجعلنا مسلمين لك','واجعلنا مسلمين لك','ربنا وتب علينا','واجعلنا مسلمين'],v:'2:128',w:450},
    /* 9:129 — hasbiy allah — expanded */
    {q:['حسبي الله لا إله إلا هو','حسبي الله لا اله الا هو','عليه توكلت وهو رب العرش العظيم','حسبي الله'],v:'9:129',w:470},
    /* 2:269 — al-hikma */
    {q:['يؤتي الحكمة من يشاء','أوتي الحكمة فقد أوتي','يؤتي الحكمة','من يؤت الحكمة'],v:'2:269',w:460},
    /* 39:10 — yuwaffa as-sabirun */
    {q:['إنما يوفى الصابرون أجرهم','يوفى الصابرون','بغير حساب','إنما يوفى الصابرون'],v:'39:10',w:460},
    /* 4:79 — ma asabak */
    {q:['ما أصابك من سيئة فمن نفسك','ما أصابك من حسنة فمن الله','من سيئة فمن نفسك'],v:'4:79',w:450},
    /* 12:64 — allah khayru hafidhin */
    {q:['والله خير الحافظين','خير الحافظين','فالله خير حافظا'],v:'12:64',w:450},
    /* 3:133 — wa sari'u */
    {q:['وسارعوا إلى مغفرة من ربكم','سارعوا إلى مغفرة','إلى مغفرة من ربكم وجنة'],v:'3:133',w:460},
    /* 23:118 — rabbi ghfir */
    {q:['رب اغفر وارحم وأنت خير الراحمين','رب اغفر وارحم','خير الراحمين'],v:'23:118',w:460},
    /* 3:31 — qul in kuntum tuhibbun */
    {q:['قل إن كنتم تحبون الله فاتبعوني','تحبون الله فاتبعوني','يحببكم الله ويغفر لكم'],v:'3:31',w:460},
    /* 2:177 — al-birr */
    {q:['ليس البر أن تولوا وجوهكم','البر من آمن بالله','ليس البر أن تولوا','لكن البر'],v:'2:177',w:460},
    /* 59:22 — huwa allahu */
    {q:['هو الله الذي لا إله إلا هو','هو الله الذي','الملك القدوس السلام','عالم الغيب والشهادة هو الرحمن'],v:'59:22',w:480},
    /* 24:35 — nur ala nur */
    {q:['الله نور السماوات والأرض','نور على نور','الله يهدي لنوره من يشاء','نور السماوات والارض'],v:'24:35',w:470},
    /* 13:28 — ala bidhikr — expanded */
    {q:['ألا بذكر الله تطمئن القلوب','ألا بذكر الله','تطمئن القلوب','بذكر الله تطمئن'],v:'13:28',w:500},
    /* 2:255 — ayat al-kursi expanded */
    {q:['لا إله إلا هو الحي القيوم','لا اله الا هو الحي القيوم','الله لا اله الا هو الحي'],v:'2:255',w:500},
    /* 2:238 — hafidhu ala al-salawat */
    {q:['حافظوا على الصلوات','حافظوا على الصلوات والصلاة الوسطى','على الصلاة الوسطى'],v:'2:238',w:450},
    /* 67:2 — khalaq al-mawt wal-hayah */
    {q:['خلق الموت والحياة ليبلوكم','خلق الموت والحياة','أحسن عملا وهو العزيز الغفور','ليبلوكم أيكم أحسن'],v:'67:2',w:460},
    /* 7:23 — rabbana dhalamna — expanded */
    {q:['ربنا ظلمنا أنفسنا','ظلمنا أنفسنا إن لم تغفر','إن لم تغفر لنا وترحمنا','ربنا ظلمنا انفسنا'],v:'7:23',w:490},
    /* 2:112 — man aslama */
    {q:['بلى من أسلم وجهه لله','من أسلم وجهه لله وهو محسن','أسلم وجهه لله'],v:'2:112',w:450},
    /* 17:44 — yusabbihu */
    {q:['وإن من شيء إلا يسبح بحمده','يسبح بحمده','تسبيحهم إنه كان حليما','من شيء الا يسبح'],v:'17:44',w:450},
    /* 49:10 — innamal muminun */
    {q:['إنما المؤمنون إخوة فأصلحوا','المؤمنون إخوة','انما المومنون اخوة فاصلحوا','اخوة فاصلحوا'],v:'49:10',w:460},
    /* 30:21 — min ayatihi */
    {q:['ومن آياته أن خلق لكم من أنفسكم','خلق لكم من أنفسكم أزواجا','لتسكنوا إليها وجعل بينكم مودة ورحمة'],v:'30:21',w:460},
    /* 65:2 — wa man yattaqi */
    {q:['ومن يتق الله يجعل له مخرجا','يجعل له مخرجا ويرزقه','يتق الله يجعل له','من يتق الله يجعل'],v:'65:2',w:460}
  ];

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
  var _idx         = [];
  var _ready       = false;
  var _tokenIdx    = {}; // normalized-word → [_idx positions] for fast candidate lookup
  var _tagIdx      = {}; // VTAGS concept keyword → [_idx positions]
  var _famousIdx   = {}; // normalized famous fragment → {sn, an, weight, canonical}
  var _famousNoSpace = {}; // fused (no-space) version → same (handles "حسبنالله" etc.)
  var _wordFreq    = {}; // normalized word → verse-count (rarity signal)
  var _versePos    = {}; // "sn:an" → _idx position for O(1) famous verse lookup
  var _famousByWord = {}; // meaningful word → [{sn,an,weight,canonical}] from famous phrases
  var _stats       = {
    queries:0, totalMs:0, cacheHits:0, slowQ:[], zeroQ:[],
    phraseMatches:0, aliasHits:0, recentQ:[], candidateSum:0, candidateCount:0
  };

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
    // Build semantic tag index — VTAGS concept keyword → list of _idx positions
    _tagIdx = {};
    var tagKeys = Object.keys(VTAGS);
    for (var gi = 0; gi < tagKeys.length; gi++) {
      var gKey = tagKeys[gi]; // "65:3"
      var parts = gKey.split(':');
      var gsn = +parts[0], gan = +parts[1];
      var gpos = -1;
      for (var gj = 0; gj < _idx.length; gj++) {
        if (_idx[gj].sn === gsn && _idx[gj].an === gan) { gpos = gj; break; }
      }
      if (gpos === -1) continue;
      var tagWords = normAr(VTAGS[gKey]).split(/[\s،,،،]+/).filter(function(w){ return w.length >= 2; });
      for (var gw = 0; gw < tagWords.length; gw++) {
        var gtw = tagWords[gw];
        if (!_tagIdx[gtw]) _tagIdx[gtw] = [];
        _tagIdx[gtw].push(gpos);
      }
    }
    // Build verse position map — "sn:an" → _idx position for O(1) lookup
    _versePos = {};
    for (var vp = 0; vp < _idx.length; vp++) {
      _versePos[_idx[vp].sn + ':' + _idx[vp].an] = vp;
    }
    // Build word frequency index — word → number of verses containing it
    // Uses _tokenIdx since each position list has unique-per-verse entries
    _wordFreq = {};
    var allToks = Object.keys(_tokenIdx);
    for (var wk = 0; wk < allToks.length; wk++) {
      _wordFreq[allToks[wk]] = _tokenIdx[allToks[wk]].length;
    }
    // Build famous phrase index — normalized fragment → verse target + weight
    _famousIdx = {};
    _famousNoSpace = {};
    for (var fpi = 0; fpi < FAMOUS_PHRASES.length; fpi++) {
      var fp = FAMOUS_PHRASES[fpi];
      var fpPts = fp.v.split(':');
      var fpData = {sn: +fpPts[0], an: +fpPts[1], weight: fp.w, canonical: fp.q[0]};
      for (var fqi = 0; fqi < fp.q.length; fqi++) {
        var fqN = normAr(fp.q[fqi]);
        if (!_famousIdx[fqN]) _famousIdx[fqN] = fpData;
        // Index no-space version (handles fused input like "حسبنالله")
        var fqNS = fqN.replace(/\s+/g, '');
        if (!_famousNoSpace[fqNS]) _famousNoSpace[fqNS] = fpData;
        // Also store typo-fixed no-space version (handles "لاتقنطو" from "لا تقنطوا")
        var fqFix = _typoFix(fqNS);
        if (fqFix !== fqNS && !_famousNoSpace[fqFix]) _famousNoSpace[fqFix] = fpData;
      }
    }
    // Build word-level famous index — each meaningful word in canonical phrase → verse list
    _famousByWord = {};
    for (var fpi2 = 0; fpi2 < FAMOUS_PHRASES.length; fpi2++) {
      var fp2 = FAMOUS_PHRASES[fpi2];
      var fp2Pts = fp2.v.split(':');
      var fp2Data = {sn:+fp2Pts[0], an:+fp2Pts[1], weight:fp2.w, canonical:fp2.q[0]};
      var canonWds = normAr(fp2.q[0]).split(/\s+/);
      for (var cw = 0; cw < canonWds.length; cw++) {
        var cwt = canonWds[cw];
        if (!cwt || STOP_AR[cwt] || cwt.length < 2) continue;
        if (!_famousByWord[cwt]) _famousByWord[cwt] = [];
        var fwDup = false;
        for (var fwd = 0; fwd < _famousByWord[cwt].length; fwd++) {
          if (_famousByWord[cwt][fwd].sn === fp2Data.sn && _famousByWord[cwt][fwd].an === fp2Data.an) { fwDup = true; break; }
        }
        if (!fwDup) _famousByWord[cwt].push(fp2Data);
      }
    }
    _ready = true;
    console.log('[QuranSearch] indexReady count=' + _idx.length +
      ' tokenKeys=' + Object.keys(_tokenIdx).length +
      ' famousKeys=' + Object.keys(_famousIdx).length +
      ' ms=' + (Date.now() - t0));
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
        // Position bonus: phrase near verse start is stronger
        if (ap === 0)       phraseScore += 150;
        else if (ap < 20)   phraseScore += 80;
        else if (ap < 60)   phraseScore += 40;
        // Word-boundary bonus: phrase aligns to word edges (not mid-word substring)
        var atStart = (ap === 0 || e.arN[ap - 1] === ' ');
        var atEnd   = (ap + qArN.length >= e.arN.length || e.arN[ap + qArN.length] === ' ');
        if (atStart) phraseScore += 50;
        if (atEnd)   phraseScore += 50;
        // Coverage ratio: query covers X% of this verse → reward short/exact-match verses
        // e.g. 4 words from a 5-word verse scores much higher than 4 words from a 40-word verse
        var coverageBonus = Math.round((qArN.length / Math.max(e.arN.length, 1)) * 500);
        phraseScore += coverageBonus;
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
        // Coverage ratio: how much of this verse the query covers
        var cCovBonus = Math.round((consec / Math.max(e.arW.length, 1)) * 300);
        consecutiveScore += cCovBonus;
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
          } else {
            // Suffix-stripped match (e.g. query "صابرون" matches verse "الصابرين")
            var stemmed = _stripSfx(tok);
            if (stemmed && stemmed !== stripped && e.arN.indexOf(stemmed) !== -1) {
              arPfxHit++;
              if (!isStop && nonStopTotal > 0) nonStopHit += 0.7; // partial credit
              if (srcs.indexOf('arabic') === -1) srcs.push('arabic');
            }
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

    /* ── 6. Semantic concept tag matching ────────────────────────── */
    /* Fires when other tiers are weak — boosts key verses via curated concept keywords.
     * Useful for Arabic stems (توكل → verse has يتوكل) and Kurdish concept searches. */
    if (phraseScore === 0 && consecutiveScore < 200 && tokenScore < 80 && translationScore < 80) {
      var tagStr = VTAGS[e.sn + ':' + e.an];
      if (tagStr) {
        var tagWords = normAr(tagStr).split(/[\s،,،،]+/);
        var tagHit = 0;
        for (var qi = 0; qi < arTokens.length; qi++) {
          if (STOP_AR[arTokens[qi]]) continue;
          var at = arTokens[qi];
          for (var tw2 = 0; tw2 < tagWords.length; tw2++) {
            if (tagWords[tw2].length >= 2 && (tagWords[tw2] === at || tagWords[tw2].indexOf(at) === 0 || at.indexOf(tagWords[tw2]) === 0)) {
              tagHit++;
              break;
            }
          }
        }
        if (tagHit > 0) {
          var tagScore = tagHit * 55;
          translationScore = Math.max(translationScore, tagScore);
          if (srcs.indexOf('semantic') === -1) srcs.push('semantic');
        }
      }
    }

    /* ── 7. Rare word signal ──────────────────────────────────────── */
    /* Low-frequency Quran words (حسبه, تقنطوا, المضطر…) are strong confidence
     * signals. Only fires when the verse already matched the query. */
    var rareWordBonus = 0;
    if (phraseScore > 0 || consecutiveScore > 0 || tokenScore > 40) {
      for (var rw = 0; rw < arTokens.length; rw++) {
        var rwt = arTokens[rw];
        if (STOP_AR[rwt] || rwt.length < 3) continue;
        if (e.arN.indexOf(rwt) === -1) continue; // token must be in this verse
        var rwFreq = _wordFreq[rwt] || (_wordFreq[_stripPfx(rwt) || rwt] || 0);
        if (rwFreq > 0 && rwFreq <= 5)   rareWordBonus += 130;
        else if (rwFreq <= 15)            rareWordBonus += 75;
        else if (rwFreq <= 40)            rareWordBonus += 30;
      }
      rareWordBonus = Math.min(rareWordBonus, 200); // cap to avoid runaway scores
    }

    var finalScore = phraseScore + consecutiveScore + tokenScore + translationScore + rareWordBonus;
    return {
      score: finalScore, srcs: srcs, posAr: posAr, posKu: posKu,
      phraseScore: phraseScore, consecutiveScore: consecutiveScore,
      tokenScore: tokenScore, translationScore: translationScore,
      rareWordBonus: rareWordBonus, finalScore: finalScore,
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
      _stats.aliasHits++;
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
      var meaningfulTokens = arTokens.filter(function(t){ return !STOP_AR[t] && t.length >= 2; });
      var isUltraShort = meaningfulTokens.length <= 1;
      // Priority factor: scales AYAH_PRIORITY bonus by query shortness (0 for 4+ token queries)
      var pFactor = isUltraShort ? 0.65 : meaningfulTokens.length === 2 ? 0.35 : meaningfulTokens.length === 3 ? 0.12 : 0;

      // Famous phrase boost map — "sn:an" → {weight, canonical} for current query
      var _famousBoostMap = {};
      // Direct match: full normalized query against famous index
      var _qArNNoSp = qArN.replace(/\s+/g,'');
      var _directFam = _famousIdx[qArN] || _famousNoSpace[_qArNNoSp] || _famousNoSpace[_typoFix(_qArNNoSp)];
      if (_directFam) _famousBoostMap[_directFam.sn+':'+_directFam.an] = {weight:_directFam.weight, canonical:_directFam.canonical};
      // Token-level match: each individual token against famous index
      for (var ft = 0; ft < arTokens.length; ft++) {
        var ftm = _famousIdx[arTokens[ft]];
        if (ftm) {
          var ftKey = ftm.sn+':'+ftm.an;
          var ftW = Math.round(ftm.weight * 0.65);
          if (!_famousBoostMap[ftKey] || _famousBoostMap[ftKey].weight < ftW) {
            _famousBoostMap[ftKey] = {weight:ftW, canonical:ftm.canonical};
          }
        }
      }
      // _famousByWord: boost famous ayahs that contain queried words (ultra/short queries)
      if (meaningfulTokens.length <= 2) {
        for (var mt = 0; mt < meaningfulTokens.length; mt++) {
          var mtW = meaningfulTokens[mt];
          var fbwList = _famousByWord[mtW] || _famousByWord[_stripPfx(mtW)] || [];
          for (var fbi = 0; fbi < fbwList.length; fbi++) {
            var fbKey = fbwList[fbi].sn + ':' + fbwList[fbi].an;
            var fbWt = Math.round(fbwList[fbi].weight * (isUltraShort ? 0.45 : 0.28));
            if (!_famousBoostMap[fbKey] || _famousBoostMap[fbKey].weight < fbWt) {
              _famousBoostMap[fbKey] = {weight:fbWt, canonical:fbwList[fbi].canonical};
            }
          }
        }
      }
      // INTENT_BOOSTS: curated ayah list for known single-word spiritual queries
      // Also fires when the only token is a stopword (e.g. "الله" is in STOP_AR so meaningfulTokens is empty)
      var _intentKey = meaningfulTokens.length === 1 ? meaningfulTokens[0]
                     : (meaningfulTokens.length === 0 && arTokens.length === 1 ? arTokens[0] : null);
      if (isUltraShort && _intentKey) {
        var intentKey = _intentKey;
        var intentList = INTENT_BOOSTS[intentKey] || INTENT_BOOSTS[_stripPfx(intentKey)] || [];
        for (var ii = 0; ii < intentList.length; ii++) {
          var ibKey = intentList[ii];
          var ibWt = Math.max(360 - ii * 38, 100);
          if (!_famousBoostMap[ibKey] || _famousBoostMap[ibKey].weight < ibWt) {
            _famousBoostMap[ibKey] = {weight:ibWt, canonical:''};
          }
        }
      }
      // Prefix detection: query text is a prefix of a famous phrase → boost that ayah
      if (qArN.length >= 3) {
        var famIdxKeys = Object.keys(_famousIdx);
        for (var pfx = 0; pfx < famIdxKeys.length; pfx++) {
          if (famIdxKeys[pfx].length > qArN.length && famIdxKeys[pfx].indexOf(qArN) === 0) {
            var pfxEntry = _famousIdx[famIdxKeys[pfx]];
            var pfxKey = pfxEntry.sn + ':' + pfxEntry.an;
            var pfxWt = Math.round(pfxEntry.weight * 0.72);
            if (!_famousBoostMap[pfxKey] || _famousBoostMap[pfxKey].weight < pfxWt) {
              _famousBoostMap[pfxKey] = {weight:pfxWt, canonical:pfxEntry.canonical};
            }
          }
        }
      }
      var isShortQuery = meaningfulTokens.length <= 4;

      // Pre-filter via token index — typical Arabic phrase: ~5-50 candidates vs 6236
      var candidates = _getCandidates(arTokens);
      // Ensure famous-boosted verses are always in the scan set (critical for fused-word queries)
      var famKeys = Object.keys(_famousBoostMap);
      for (var fk2 = 0; fk2 < famKeys.length; fk2++) {
        if (refKeys[famKeys[fk2]]) continue;
        var fkPos = _versePos[famKeys[fk2]];
        if (fkPos !== undefined) {
          if (!candidates) candidates = [fkPos];
          else if (candidates.indexOf(fkPos) === -1) candidates.unshift(fkPos); // score first
        }
      }
      var scanLen = candidates ? candidates.length : _idx.length;

      var tScan = Date.now();
      for (var m = 0; m < scanLen; m++) {
        var e = candidates ? _idx[candidates[m]] : _idx[m];
        var eKey = e.sn+':'+e.an;
        if (refKeys[eKey]) continue;
        var famBoost = _famousBoostMap[eKey];
        var famousWeight = famBoost ? famBoost.weight : 0;
        var sv = scoreVerse(e, qArN, qLo, arTokens, loTokens);
        if (sv.score <= 0 && famousWeight <= 0) continue;
        if (exactMode && sv.phraseScore === 0 && !famousWeight) continue;
        var isFamous = famousWeight > 0;
        // Suppress priority bonus when a strong phrase match already guarantees relevance
        var priorityBonus = (pFactor > 0 && sv.phraseScore < 800) ? Math.round((AYAH_PRIORITY[eKey] || 0) * pFactor) : 0;
        var popBonus = Math.min(_getLocalPop(eKey) * 12, 90);
        var totalScore = sv.score + famousWeight + priorityBonus + popBonus;
        var sh = surahs[e.sn-1] || {};
        verseHits.push({
          type:'verse', sn:e.sn, an:e.an, arO:e.arO, kuO:e.kuO,
          surahAr:sh.ar||'', surahEn:sh.en||'',
          score:totalScore, isFamous:isFamous, famousWeight:famousWeight,
          matchSrcs:sv.srcs, posAr:sv.posAr, posKu:sv.posKu, mode:mode,
          phraseScore:sv.phraseScore, consecutiveScore:sv.consecutiveScore,
          tokenScore:sv.tokenScore, translationScore:sv.translationScore,
          rareWordBonus:sv.rareWordBonus, priorityBonus:priorityBonus, popBonus:popBonus,
          finalScore:totalScore, _vLen:sv._vLen
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
      var totalMs = scanMs + rankMs;
      _stats.queries++;
      _stats.totalMs += totalMs;
      _stats.candidateSum += scanLen;
      _stats.candidateCount++;
      if (totalMs > 80) _stats.slowQ.push({q:qOrig, ms:totalMs});
      if (!verseHits.length) _stats.zeroQ.push(qOrig);
      if (verseHits.length && verseHits[0].phraseScore > 0) _stats.phraseMatches++;
      if (verseHits.some(function(h){ return h.matchSrcs && h.matchSrcs.indexOf('semantic') !== -1; })) _stats.semanticHits = (_stats.semanticHits || 0) + 1;
      _stats.recentQ.push({q:qOrig, ms:totalMs, hits:verseHits.length});
      if (_stats.recentQ.length > 20) _stats.recentQ.shift();
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

  function _getLocalPop(key) {
    try { return +(localStorage.getItem('qtap_' + key.replace(':', '_')) || 0); } catch(e) { return 0; }
  }

  /* ── Semantic concept suggestions (for smart empty state) ───── */
  /* When a query yields no results, find the closest VTAGS-matched verses. */
  function semanticSuggest(q) {
    if (!_ready || !q || q.length < 2) return [];
    var qN = _typoFix(normAr(q));
    var tokens = qN.split(/\s+/).filter(function(t){ return t.length >= 2 && !STOP_AR[t]; });
    if (!tokens.length) return [];
    var scores = {};
    var tkKeys = Object.keys(_tagIdx);
    for (var t = 0; t < tokens.length; t++) {
      var tok = tokens[t];
      var direct = _tagIdx[tok];
      if (direct) for (var d = 0; d < direct.length; d++) scores[direct[d]] = (scores[direct[d]] || 0) + 2;
      // Prefix match
      for (var k = 0; k < tkKeys.length; k++) {
        if (tkKeys[k] !== tok && tkKeys[k].length > tok.length && tkKeys[k].indexOf(tok) === 0) {
          var ph = _tagIdx[tkKeys[k]];
          if (ph) for (var p = 0; p < ph.length; p++) scores[ph[p]] = (scores[ph[p]] || 0) + 1;
        }
      }
    }
    var positions = Object.keys(scores).map(Number).sort(function(a,b){ return scores[b]-scores[a]; });
    return positions.slice(0, 4).map(function(pos) {
      var e = _idx[pos];
      return { sn: e.sn, an: e.an, arO: e.arO };
    });
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

  /* ── Semantic worker (CF Workers AI + Vectorize) ────────────── */
  var _workerUrl = null; // set via QuranSearch.setWorkerUrl()

  /* Fire a semantic search request to the CF worker.
   * Calls cb(results) where results is [{sn,an,score}] or [] on error/timeout. */
  function _semanticFetch(q, cb) {
    if (!_workerUrl) { cb([]); return; }
    var done = false;
    var timer = setTimeout(function () {
      if (!done) { done = true; cb([]); }
    }, 1800); // 1.8s timeout — fall back to keyword-only
    try {
      fetch(_workerUrl + '/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: q })
      }).then(function (r) { return r.json(); }).then(function (body) {
        clearTimeout(timer);
        if (!done) { done = true; cb(body.results || []); }
      }).catch(function () {
        clearTimeout(timer);
        if (!done) { done = true; cb([]); }
      });
    } catch (e) {
      clearTimeout(timer);
      if (!done) { done = true; cb([]); }
    }
  }

  /* Merge semantic results into existing keyword hits.
   * - Verses found by BOTH engines get a strong boost (semantic confidence).
   * - Verses found only by semantic are added with a base semantic score.
   * The keyword engine's internal ranking stays dominant; semantic is a boost layer. */
  function _mergeWithSemantic(keywordHits, semanticHits, surahs) {
    if (!semanticHits || !semanticHits.length) return keywordHits;

    // Build lookup: "sn:an" → index in keywordHits
    var kwMap = {};
    for (var i = 0; i < keywordHits.length; i++) {
      if (keywordHits[i].sn && keywordHits[i].an) {
        kwMap[keywordHits[i].sn + ':' + keywordHits[i].an] = i;
      }
    }

    var merged = keywordHits.slice();
    for (var j = 0; j < semanticHits.length; j++) {
      var sem = semanticHits[j];
      var semKey = sem.sn + ':' + sem.an;
      var semBoost = Math.round(sem.score * 280); // 0.95 score → +266 pts
      var kwIdx = kwMap[semKey];
      if (kwIdx !== undefined) {
        // Already in keyword results — boost its score
        merged[kwIdx] = Object.assign({}, merged[kwIdx], {
          score: merged[kwIdx].score + semBoost,
          finalScore: (merged[kwIdx].finalScore || merged[kwIdx].score) + semBoost,
          matchSrcs: (merged[kwIdx].matchSrcs || []).indexOf('semantic') === -1
            ? (merged[kwIdx].matchSrcs || []).concat(['semantic']) : merged[kwIdx].matchSrcs,
          semanticScore: sem.score,
          semanticBoost: semBoost
        });
      } else if (merged.length < 30) {
        // Not in keyword results — add as pure semantic hit
        var e = findVerse(sem.sn, sem.an);
        if (!e) continue;
        var sh = surahs[e.sn - 1] || {};
        merged.push({
          type: 'verse', sn: e.sn, an: e.an, arO: e.arO, kuO: e.kuO,
          surahAr: sh.ar || '', surahEn: sh.en || '',
          score: semBoost, matchSrcs: ['semantic'],
          posAr: -1, posKu: -1, mode: 'arabic',
          phraseScore: 0, consecutiveScore: 0, tokenScore: 0,
          translationScore: 0, finalScore: semBoost,
          semanticScore: sem.score, semanticBoost: semBoost
        });
        kwMap[semKey] = merged.length - 1;
      }
    }

    merged.sort(function (a, b) { return b.score - a.score; });
    return merged.slice(0, 30);
  }

  /* ── Public API ─────────────────────────────────────────────── */
  window.QuranSearch = {
    init: function (quranData, tafsirData) {
      if (!quranData || !tafsirData) return;
      _ready = false;
      setTimeout(function () { buildIndex(quranData, tafsirData); }, 0);
    },

    /* Configure the semantic search worker URL.
     * Call once on app init: QuranSearch.setWorkerUrl('https://quran-search.tefsirkurd.workers.dev') */
    setWorkerUrl: function (url) { _workerUrl = url || null; },

    query: function (q, surahs, max) { return query(q, surahs, max); },

    /* queryAsync: fires keyword search instantly (cb called once),
     * then fires semantic search in parallel and calls cb again with
     * merged+re-ranked results when the worker responds.
     * If semantic times out or fails, cb is only called once (keyword only).
     * cb signature: function(results, isFinal) */
    queryAsync: function (q, surahs, max, cb) {
      if (!_ready || !q) { cb([], true); return; }
      var kwResults = query(q, surahs, max);

      // Call back immediately with keyword results
      var semPending = !!_workerUrl;
      cb(kwResults, !semPending);
      if (!semPending) return;

      // Minimal query length for semantic: Arabic 3+ chars or 2+ words
      var qTrim = q.trim();
      var worthSemantic = qTrim.length >= 3 && /[؀-ۿ]/.test(qTrim);
      if (!worthSemantic) { cb(kwResults, true); return; }

      _semanticFetch(qTrim, function (semHits) {
        if (!semHits.length) { cb(kwResults, true); return; }
        var merged = _mergeWithSemantic(kwResults, semHits, surahs);
        cb(merged, true);
      });
    },

    suggest: function (q) { return _ready ? suggest(q) : []; },

    /* Returns up to 4 related verse refs ("sn:an") for a given verse */
    relatedVerses: function (sn, an) {
      if (!_ready) return [];
      var key = sn + ':' + an;
      return (RELATED[key] || []).slice(0, 4);
    },

    /* Returns the canonical Arabic phrase for a verse if it has one */
    canonicalPhrase: function (sn, an) {
      return _vaRevMap[sn + ':' + an] || null;
    },

    /* Concept-matched verse suggestions for empty-state / fallback display */
    semanticSuggest: function (q) { return _ready ? semanticSuggest(q) : []; },

    /* Track user tap on a verse — stored locally to improve popularity ranking */
    trackTap: function (sn, an) {
      try {
        var k = 'qtap_' + sn + '_' + an;
        localStorage.setItem(k, Math.min((+(localStorage.getItem(k) || 0)) + 1, 50));
      } catch(e) {}
    },

    isReady: function () { return _ready; },

    stats: function () {
      var q = _stats.queries || 1;
      return {
        queries:          _stats.queries,
        avgMs:            _stats.queries ? Math.round(_stats.totalMs / _stats.queries) : 0,
        slowQueries:      _stats.slowQ.slice(-10),
        zeroResults:      _stats.zeroQ.slice(-10),
        recentQueries:    _stats.recentQ.slice(-20),
        indexSize:        _idx.length,
        tokenKeys:        Object.keys(_tokenIdx).length,
        taggedVerses:     Object.keys(VTAGS).length,
        phraseMatchRate:  Math.round(_stats.phraseMatches / q * 100) + '%',
        semanticHitRate:  Math.round((_stats.semanticHits || 0) / q * 100) + '%',
        aliasHitRate:     Math.round(_stats.aliasHits / q * 100) + '%',
        candidateCountAvg: _stats.candidateCount ? Math.round(_stats.candidateSum / _stats.candidateCount) : 0,
        cacheHits:        _stats.cacheHits,
        workerEnabled:    !!_workerUrl,
        workerUrl:        _workerUrl || null
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
