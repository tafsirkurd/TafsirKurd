"""
Parse إصلاح المجتمع.doc → insert into gencine_hadiths.
Strips hadith numbers like (1), (٢), (3) from Arabic text.
sort_order continues from 946 (after existing max 936).
"""
import sys, io, struct, re, json, unicodedata
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import olefile

DOC_PATH  = "C:/Users/Ferminus/Desktop/إصلاح المجتمع.doc"
RAW_PATH  = "C:/TafsirKurd/scripts/islah_raw.txt"
JSON_PATH = "C:/TafsirKurd/scripts/islah_parsed.json"
SQL_PATH  = "C:/TafsirKurd/scripts/islah_insert.sql"

START_SORT = 946   # continues from existing max sort_order 936

# ─── DOC EXTRACTION (same as read_doc.py) ────────────────────────────────────

def parse_piece_table(data):
    n = (len(data) - 4) // 12
    pieces = []
    cp_offset = 0
    pcd_offset = (n + 1) * 4
    cps = [struct.unpack_from('<I', data, cp_offset + i*4)[0] for i in range(n+1)]
    for i in range(n):
        pcd = data[pcd_offset + i*8: pcd_offset + i*8 + 8]
        fc_value = struct.unpack_from('<I', pcd, 2)[0]
        is_compressed = bool(fc_value & 0x40000000)
        fc = (fc_value & ~0x40000000)
        if is_compressed:
            fc = fc >> 1
            is_unicode = False
        else:
            is_unicode = True
        pieces.append((cps[i], cps[i+1], fc, is_unicode))
    return pieces

def parse_clx(clx):
    pieces = []
    i = 0
    while i < len(clx):
        clxt = clx[i]; i += 1
        if clxt == 0x02:
            cb = struct.unpack_from('<I', clx, i)[0]; i += 4
            pieces = parse_piece_table(clx[i:i+cb])
            break
        elif clxt == 0x01:
            cb = struct.unpack_from('<H', clx, i)[0]; i += 2 + cb
        else:
            break
    return pieces

def extract_text(path):
    ole = olefile.OleFileIO(path)
    word_stream = ole.openstream('WordDocument').read()
    table_name = '1Table' if ole.exists('1Table') else '0Table'
    table_stream = ole.openstream(table_name).read()
    fc_clx  = struct.unpack_from('<I', word_stream, 0x01A2)[0]
    lcb_clx = struct.unpack_from('<I', word_stream, 0x01A6)[0]
    clx = table_stream[fc_clx:fc_clx + lcb_clx]
    pieces = parse_clx(clx)
    texts = []
    for (cp_start, cp_end, fc, is_unicode) in pieces:
        length = cp_end - cp_start
        if is_unicode:
            raw = word_stream[fc:fc + length * 2]
            texts.append(raw.decode('utf-16-le', errors='replace'))
        else:
            raw = word_stream[fc:fc + length]
            try:    texts.append(raw.decode('cp1256', errors='replace'))
            except: texts.append(raw.decode('latin-1', errors='replace'))
    return ''.join(texts)

# ─── LANGUAGE DETECTION ───────────────────────────────────────────────────────

KU_CHARS = set('ێۆڤژڕ')

def has_diacritics(t):
    return sum(1 for c in t if '\u064B' <= c <= '\u0652') > 2

def is_arabic_para(t):
    if not t: return False
    ar = sum(1 for c in t if '\u0600' <= c <= '\u06FF')
    ku = sum(1 for c in t if c in KU_CHARS)
    return has_diacritics(t) and ar > 10 and ku == 0

# ─── STRIP HADITH NUMBERS ─────────────────────────────────────────────────────
# Matches: (1), (٢), (123) at the very start of text (with optional whitespace)
# Also matches leading numbers without parens: ١- or 1.
_NUM_RE = re.compile(
    r'^[\s\u200f\u200e]*'           # leading whitespace / RLM / LRM
    r'(?:'
    r'\([\d\u0660-\u0669]+\)'       # (1) or (٢)
    r'|[\d\u0660-\u0669]+[.\-]'     # 1. or ١-
    r')'
    r'[\s\u200f\u200e]*'            # trailing whitespace
)

def strip_number(text):
    return _NUM_RE.sub('', text).strip()

# ─── ARABIC NORMALIZATION (same as parse_hadiths.py) ─────────────────────────

_AR_DIAC = r'[\u064B-\u065F\u0670]*'

def _loosify(word):
    parts = []
    for ch in word:
        if ch == ' ':
            parts.append(r'\s*')
        else:
            parts.append(re.escape(ch) + _AR_DIAC)
    return ''.join(parts)

_PROPHET_NAMES = ['النبي', 'رسول الله', 'رسوله', 'محمد']
_PROPHET_RE = re.compile(
    r'(' + '|'.join(_loosify(w) for w in _PROPHET_NAMES) + r')\s*\('
)

def normalize_arabic(text):
    t = unicodedata.normalize('NFC', text)
    # Strip hadith number first
    t = strip_number(t)
    # Prophet honorific
    t = _PROPHET_RE.sub(r'\1ﷺ ', t)
    # State machine for ( ) → «»  /  رضي الله عنه
    result = []
    in_quote = False
    for c in t:
        if c == '(':
            if in_quote:
                while result and result[-1] == ' ':
                    result.pop()
                result.append('»')
                in_quote = False
            else:
                preceding = ''.join(result).rstrip()
                if preceding.endswith(':'):
                    result.append('«')
                    in_quote = True
                else:
                    result.append('رضي الله عنه ')
        elif c == ')':
            pass
        elif c == '«':
            in_quote = True
            result.append(c)
        elif c == '»':
            in_quote = False
            result.append(c)
        else:
            result.append(c)
    t = ''.join(result)
    t = re.sub(r'«\s+', '«', t)
    t = re.sub(r'\s+»', '»', t)
    t = re.sub(r'[ \t]+', ' ', t)
    t = re.sub(r'\s*،\s*', '، ', t)
    t = t.strip()
    if t and t[-1] not in '.»؟!،':
        t += '»'
    return t

# ─── PARSER ───────────────────────────────────────────────────────────────────

TITLE_MAX_LEN = 100

def parse_blocks(raw):
    paras = [p.strip() for p in re.split(r'[\r\n]+', raw) if p.strip()]
    ar_positions = [i for i, p in enumerate(paras) if is_arabic_para(p)]
    print(f"  Arabic paragraphs found: {len(ar_positions)}")

    blocks = []
    n = len(paras)

    for pos, ar_idx in enumerate(ar_positions):
        prev_ar = ar_positions[pos - 1] if pos > 0 else -1
        between = [paras[i] for i in range(prev_ar + 1, ar_idx)
                   if not is_arabic_para(paras[i])]

        if pos == 0:
            title_lines = between
        else:
            title_start = 0
            for j, p in enumerate(between):
                if len(p) > TITLE_MAX_LEN:
                    title_start = j + 1
            title_lines = between[title_start:]

        next_ar = ar_positions[pos + 1] if pos + 1 < len(ar_positions) else n
        all_after = [paras[i] for i in range(ar_idx + 1, next_ar)
                     if not is_arabic_para(paras[i])]

        trans_end = 0
        for j, p in enumerate(all_after):
            if len(p) > TITLE_MAX_LEN:
                trans_end = j + 1
        ku_lines = all_after[:trans_end] if trans_end else all_after

        blocks.append({
            'title_lines': title_lines,
            'ar_raw': paras[ar_idx],
            'ku_lines': ku_lines,
        })

    return blocks

def esc(s):
    if s is None:
        return 'NULL'
    return "'" + str(s).replace("'", "''") + "'"

# ─── MAIN ─────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    print(f"Reading: {DOC_PATH}")
    raw = extract_text(DOC_PATH)
    with open(RAW_PATH, 'w', encoding='utf-8') as f:
        f.write(raw)
    print(f"Raw extracted: {len(raw)} chars → {RAW_PATH}")
    print(f"\nFirst 2000 chars:\n{'='*60}")
    print(raw[:2000])
    print('='*60)

    blocks = parse_blocks(raw)
    print(f"\nTotal hadith blocks: {len(blocks)}")

    records = []
    for i, b in enumerate(blocks):
        # Title: join and clean
        title_raw = ' '.join(b['title_lines']).strip()
        title = re.sub('ه\u200C(?=[\u0600-\u06FF])', 'ە', title_raw)
        title = title.replace('\u200C', '').strip() or None

        ar = normalize_arabic(b['ar_raw'])
        ku = '\n'.join(b['ku_lines']).strip() or None

        sort_order = START_SORT + i * 10

        records.append({
            'sort_order': sort_order,
            'title': title,
            'ar': ar,
            'ku': ku,
        })

    # Save JSON
    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    print(f"Saved JSON: {JSON_PATH}")

    # Preview first 5
    print(f"\n{'='*60}\nPREVIEW (first 5)\n{'='*60}")
    for r in records[:5]:
        print(f"\nsort_order: {r['sort_order']}")
        print(f"  title: {r['title']}")
        print(f"  ar:    {r['ar'][:120]}...")
        print(f"  ku:    {(r['ku'] or '')[:100]}...")

    # Generate SQL in batches of 20
    BATCH = 20
    sql_parts = []
    for start in range(0, len(records), BATCH):
        chunk = records[start:start+BATCH]
        rows = []
        for r in chunk:
            rows.append(
                f"  ({r['sort_order']}, {esc(r['title'])}, {esc(r['ar'])}, {esc(r['ku'])}, NULL, true)"
            )
        sql_parts.append(
            "INSERT INTO gencine_hadiths (sort_order, title, ar, ku, source, active) VALUES\n"
            + ',\n'.join(rows) + ';'
        )

    sql = '\n\n'.join(sql_parts)
    with open(SQL_PATH, 'w', encoding='utf-8') as f:
        f.write(sql)
    print(f"\nSQL written: {SQL_PATH}")
    print(f"Total: {len(records)} hadiths, sort_order {START_SORT}–{START_SORT + (len(records)-1)*10}")
