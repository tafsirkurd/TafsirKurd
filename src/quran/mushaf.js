/* Mushaf Mode — two-page spread for iPad/tablet (≥768px wide) */
(function() {
    var _mushafSurah    = 0;
    var _mushafSpreads  = [];
    var _mushafSpread   = 0;
    var _mushafActive   = false;
    var VERSES_PER_PAGE = 10;

    function _isTablet() { return window.innerWidth >= 768; }

    function _arabicNum(n) {
        if (typeof KurdishNumbers !== 'undefined') return KurdishNumbers.toKurdish(n);
        return String(n).replace(/[0-9]/g, function(d) { return '٠١٢٣٤٥٦٧٨٩'[+d]; });
    }

    function _mkEl(tag, cls) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        return e;
    }

    function _buildSpreads(surahNum) {
        if (!window.quranData || !quranData[surahNum]) return [];
        var verses = quranData[surahNum].verses || [];
        var pages = [];
        for (var i = 0; i < verses.length; i += VERSES_PER_PAGE) {
            pages.push(verses.slice(i, i + VERSES_PER_PAGE));
        }
        var spreads = [];
        for (var p = 0; p < pages.length; p += 2) {
            spreads.push([ pages[p], pages[p + 1] || [] ]);
        }
        return spreads;
    }

    function _renderPage(innerEl, numEl, verses, surahNum, spreadIdx, side) {
        while (innerEl.firstChild) innerEl.removeChild(innerEl.firstChild);
        if (!verses.length) { numEl.textContent = ''; return; }

        if (side === 'right' && spreadIdx === 0) {
            var info = window.surahNames && surahNames[surahNum];
            var header = _mkEl('div', 'mushaf-surah-header');
            var titleSpan = _mkEl('span', 'surah-title');
            titleSpan.textContent = info ? (info.arabic || '') : '';
            header.appendChild(titleSpan);
            if (surahNum !== 1 && surahNum !== 9) {
                var basmala = _mkEl('span', 'basmala');
                basmala.textContent = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
                header.appendChild(basmala);
            }
            innerEl.appendChild(header);
        }

        var block = _mkEl('div', 'mushaf-ayah-block');
        var line  = _mkEl('div', 'mushaf-ayah-text');

        verses.forEach(function(v) {
            line.appendChild(document.createTextNode(v.text + ' '));
            var marker = _mkEl('span', 'mushaf-ayah-number');
            marker.textContent = '﴿' + _arabicNum(v.verse) + '﴾';
            line.appendChild(marker);
            line.appendChild(document.createTextNode(' '));
        });
        block.appendChild(line);
        innerEl.appendChild(block);

        verses.forEach(function(v) {
            var key = surahNum + '-' + v.verse;
            var tafsirText = (window.tafsirData && tafsirData[key]) ? tafsirData[key] : '';
            if (!tafsirText) return;
            var td = _mkEl('div', 'mushaf-tafsir');
            var label = _mkEl('strong');
            label.textContent = _arabicNum(v.verse) + '. ';
            td.appendChild(label);
            td.appendChild(document.createTextNode(tafsirText));
            innerEl.appendChild(td);
        });

        var pageNum = spreadIdx * 2 + (side === 'right' ? 1 : 2);
        numEl.textContent = _arabicNum(pageNum);
    }

    function _renderSpread(idx) {
        if (!_mushafSpreads.length) return;
        idx = Math.max(0, Math.min(idx, _mushafSpreads.length - 1));
        _mushafSpread = idx;
        var spread = _mushafSpreads[idx];
        _renderPage(
            document.getElementById('mushafRightInner'),
            document.getElementById('mushafRightNum'),
            spread[0], _mushafSurah, idx, 'right'
        );
        _renderPage(
            document.getElementById('mushafLeftInner'),
            document.getElementById('mushafLeftNum'),
            spread[1], _mushafSurah, idx, 'left'
        );
        var rp = document.getElementById('mushafRightPage');
        var lp = document.getElementById('mushafLeftPage');
        if (rp) rp.scrollTop = 0;
        if (lp) lp.scrollTop = 0;
        document.getElementById('mushafPrevBtn').disabled = (idx === 0);
        document.getElementById('mushafNextBtn').disabled = (idx >= _mushafSpreads.length - 1);
        var totalPages = _mushafSpreads.length * 2;
        var p1 = _arabicNum(idx * 2 + 1);
        var p2 = spread[1].length ? ' — ' + _arabicNum(idx * 2 + 2) : '';
        document.getElementById('mushafPageInfo').textContent = p1 + p2 + ' / ' + _arabicNum(totalPages);
    }

    window.enterMushafMode = function(surahNum) {
        if (!window.quranData || !quranData[surahNum]) return;
        _mushafActive  = true;
        _mushafSurah   = surahNum;
        _mushafSpreads = _buildSpreads(surahNum);
        _mushafSpread  = 0;
        var info = window.surahNames && surahNames[surahNum];
        document.getElementById('mushafTitle').textContent =
            info ? info.english + ' (' + (info.arabic || '') + ')' : '';
        document.getElementById('mushafContainer').classList.add('mushaf-active');
        document.body.classList.add('mushaf-mode');
        var tafsirOn = document.body.classList.contains('mushaf-tafsir-on');
        var btn = document.getElementById('mushafTafsirBtn');
        if (btn) btn.classList.toggle('active', tafsirOn);
        _renderSpread(0);
    };

    window.exitMushafMode = function() {
        _mushafActive = false;
        document.getElementById('mushafContainer').classList.remove('mushaf-active');
        document.body.classList.remove('mushaf-mode');
    };

    window.mushafNavigate = function(dir) {
        _renderSpread(dir === 'prev' ? _mushafSpread - 1 : _mushafSpread + 1);
    };

    window.toggleMushafTafsir = function() {
        var on = document.body.classList.toggle('mushaf-tafsir-on');
        var btn = document.getElementById('mushafTafsirBtn');
        if (btn) btn.classList.toggle('active', on);
        localStorage.setItem('mushafTafsir', on ? '1' : '0');
    };

    function _maybeAutoMushaf(surahNum) {
        if (!_isTablet()) return;
        setTimeout(function() { window.enterMushafMode(surahNum); }, 80);
    }

    if (localStorage.getItem('mushafTafsir') === '1') {
        document.body.classList.add('mushaf-tafsir-on');
    }

    document.addEventListener('DOMContentLoaded', function() {
        var _orig = window.showSurahReader;
        if (typeof _orig === 'function') {
            window.showSurahReader = function(surahNum, highlightAyah) {
                exitMushafMode();
                _orig(surahNum, highlightAyah);
                _maybeAutoMushaf(surahNum);
            };
        }
    });

    var _resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(_resizeTimer);
        _resizeTimer = setTimeout(function() {
            var readerPage = document.getElementById('surahReaderPage');
            if (!readerPage || !readerPage.classList.contains('visible')) return;
            if (_isTablet() && !_mushafActive && _mushafSurah) {
                window.enterMushafMode(_mushafSurah);
            } else if (!_isTablet() && _mushafActive) {
                window.exitMushafMode();
            }
        }, 250);
    });
})();
