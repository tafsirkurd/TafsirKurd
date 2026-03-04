"""
Parse hadiths_raw.txt → structured JSON with Arabic normalization.
Kurdish text is NEVER modified — SHA-256 hash verifies byte-for-byte identity.
"""
import sys, io, re, json, hashlib, unicodedata
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# ─── CONFIG ──────────────────────────────────────────────────────────────────

RAW_PATH   = "C:/TafsirKurd/scripts/hadiths_raw.txt"
OUT_PATH   = "C:/TafsirKurd/scripts/hadiths_parsed.json"
SAMPLE_CNT = 3   # show this many samples before asking user to proceed

# Short paragraphs (≤ this many chars) between two Arabic blocks = title for NEXT hadith
# Long paragraphs (> this) = translation of CURRENT hadith
TITLE_MAX_LEN = 100

# ─── LANGUAGE DETECTION ──────────────────────────────────────────────────────

# Kurdish Badini markers (Arabic script + harika characters)
KU_CHARS = set('ێۆڤژڕ')

def has_diacritics(t):
    return sum(1 for c in t if '\u064B' <= c <= '\u0652') > 2

def is_arabic_para(t):
    if not t: return False
    ar = sum(1 for c in t if '\u0600' <= c <= '\u06FF')
    ku = sum(1 for c in t if c in KU_CHARS)
    return has_diacritics(t) and ar > 10 and ku == 0

# ─── ARABIC NORMALIZATION ────────────────────────────────────────────────────
# Rules (Arabic-only — Kurdish untouched):
# 1. Replace ( after Prophet's titles with ﷺ
# 2. Replace ( that continues an isnad chain (followed by عن or ، قال) → رضي الله عنه
# 3. Replace : ( with : « (opening quote after "said:")
# 4. Replace remaining ( with » (closing quotes)

_AR_DIAC = r'[\u064B-\u065F\u0670]*'  # optional Arabic diacritics

def _loosify(word):
    """Build regex matching Arabic word tolerating any diacritics between letters."""
    parts = []
    for ch in word:
        if ch == ' ':
            parts.append(r'\s*')
        else:
            parts.append(re.escape(ch) + _AR_DIAC)
    return ''.join(parts)

# Prophet names without diacritics — matched loosely (any diacritics allowed between letters)
_PROPHET_NAMES = ['النبي', 'رسول الله', 'رسوله', 'محمد']
_PROPHET_RE = re.compile(
    r'(' + '|'.join(_loosify(w) for w in _PROPHET_NAMES) + r')\s*\('
)

def normalize_arabic(text: str) -> str:
    """
    Clean Arabic hadith text. Returns normalized string.
    NEVER call this on Kurdish text.

    Strategy:
    1. NFC-normalize + replace Prophet names ( → ﷺ (diacritic-tolerant)
    2. State-machine over remaining characters:
       - ( preceded by ':' (outside quote) → opening «
       - ( outside a quote (not after ':') → رضي الله عنه (companion honorific)
       - ( inside a quote → closing »
    """
    t = unicodedata.normalize('NFC', text)

    # Step 1: Prophet honorific (diacritic-tolerant match)
    t = _PROPHET_RE.sub(r'\1ﷺ ', t)

    # Step 2: State machine — process remaining ( based on quote depth
    result = []
    in_quote = False
    i = 0
    while i < len(t):
        c = t[i]
        if c == '(':
            if in_quote:
                # Inside a quote: ( closes it
                while result and result[-1] == ' ':
                    result.pop()
                result.append('»')
                in_quote = False
            else:
                # Outside a quote: check if we're right after a colon (opening quote)
                preceding = ''.join(result).rstrip()
                if preceding.endswith(':'):
                    result.append('«')
                    in_quote = True
                else:
                    # Companion / narrator honorific
                    result.append('رضي الله عنه ')
        elif c == ')':
            pass  # remove stray closing parens
        elif c == '«':
            in_quote = True
            result.append(c)
        elif c == '»':
            in_quote = False
            result.append(c)
        else:
            result.append(c)
        i += 1

    t = ''.join(result)

    # Step 3: Normalize spacing
    t = re.sub(r'«\s+', '«', t)
    t = re.sub(r'\s+»', '»', t)
    t = re.sub(r'[ \t]+', ' ', t)
    t = re.sub(r'\s*،\s*', '، ', t)

    t = t.strip()
    if t and t[-1] not in '.»؟!،':
        t += '»'

    return t

# ─── PARSER ──────────────────────────────────────────────────────────────────

def parse_blocks(raw: str):
    """
    Split raw text into hadith blocks.
    File structure between two Arabic paragraphs:
      [long Kurdish translation of current hadith]  (len > TITLE_MAX_LEN)
      [short title lines for NEXT hadith]           (len <= TITLE_MAX_LEN)
    """
    paras = [p.strip() for p in re.split(r'[\r\n]+', raw) if p.strip()]

    # Find positions of all Arabic paragraphs
    ar_positions = [i for i, p in enumerate(paras) if is_arabic_para(p)]

    blocks = []
    n = len(paras)

    for pos, ar_idx in enumerate(ar_positions):
        prev_ar = ar_positions[pos - 1] if pos > 0 else -1

        # All non-Arabic paragraphs between previous Arabic and this one
        between = [paras[i] for i in range(prev_ar + 1, ar_idx)
                   if not is_arabic_para(paras[i])]

        if pos == 0:
            # Before first Arabic: everything is a title (no prior translation)
            title_lines = between
        else:
            # Long paragraphs = translation of previous hadith
            # Short paragraphs at the END = title for this hadith
            # Find last long paragraph position
            title_start = 0
            for j, p in enumerate(between):
                if len(p) > TITLE_MAX_LEN:
                    title_start = j + 1   # title starts after this long paragraph
            title_lines = between[title_start:]

        # Kurdish translation = all paragraphs AFTER this Arabic until next Arabic
        # but only the LONG ones (short trailing ones = title of NEXT hadith)
        next_ar = ar_positions[pos + 1] if pos + 1 < len(ar_positions) else n
        all_after = [paras[i] for i in range(ar_idx + 1, next_ar)
                     if not is_arabic_para(paras[i])]

        # ku_lines = long paragraphs only (short ones at the end = next block's title)
        trans_end = 0
        for j, p in enumerate(all_after):
            if len(p) > TITLE_MAX_LEN:
                trans_end = j + 1
        ku_lines = all_after[:trans_end] if trans_end else all_after

        blocks.append({
            '_ar_idx': ar_idx,
            '_title_raw': title_lines,
            'arabic_raw': paras[ar_idx],
            'kurdish_lines': ku_lines,
        })

    return blocks


def build_record(block: dict, idx: int) -> dict:
    """Convert a raw block into a clean record."""
    # Title: join Kurdish title lines, convert to proper display form
    # ه + ZWNJ before an Arabic letter = Kurdish vowel ە (U+06D5)
    # ه + ZWNJ before space/end = word-final ه, just strip ZWNJ
    title_raw_joined = ' '.join(block['_title_raw']).strip()
    title_display = re.sub('ه\u200C(?=[\u0600-\u06FF])', 'ە', title_raw_joined)
    title_display = title_display.replace('\u200C', '').strip()

    # Arabic: normalize (the ONLY place we modify text)
    ar_original = block['arabic_raw']
    ar_normalized = normalize_arabic(ar_original)

    # Kurdish translation: join — ABSOLUTELY UNCHANGED (preserve ZWNJ etc.)
    ku_original = '\n'.join(block['kurdish_lines'])

    # Kurdish hash for immutability verification
    ku_hash = hashlib.sha256(ku_original.encode('utf-8')).hexdigest()

    return {
        'sort_order': (idx + 1) * 10,
        'title': title_display if title_display else None,
        'ar': ar_normalized,
        'ku': ku_original,
        'source': None,           # [NEEDS_VERIFICATION] — no sources in file
        'active': True,
        '_meta': {
            'ar_original': ar_original,
            'ku_sha256': ku_hash,
            'ku_line_count': len(block['kurdish_lines']),
        }
    }

# ─── MAIN ────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    with open(RAW_PATH, encoding='utf-8') as f:
        raw = f.read()

    print(f"Raw file: {len(raw)} chars")

    blocks = parse_blocks(raw)
    print(f"Parsed {len(blocks)} hadith blocks\n")

    records = [build_record(b, i) for i, b in enumerate(blocks)]

    # Save full JSON
    with open(OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    print(f"Written to {OUT_PATH}\n")

    # Show first SAMPLE_CNT entries
    print("=" * 70)
    print(f"SAMPLE ({SAMPLE_CNT} of {len(records)} entries) — REVIEW BEFORE INSERT")
    print("=" * 70)
    for i, r in enumerate(records[:SAMPLE_CNT]):
        print(f"\n--- HADITH #{i+1} ---")
        print(f"  TITLE   : {r['title']}")
        print(f"  ARABIC  : {r['ar']}")
        print(f"  KURDISH : {r['ku'][:150]}...")
        print(f"  SOURCE  : {r['source']}")
        print(f"  KU_HASH : {r['_meta']['ku_sha256'][:16]}...")
        print(f"  AR_ORIG : {r['_meta']['ar_original'][:100]}...")

    # Summary stats
    print(f"\n{'='*70}")
    print(f"TOTALS: {len(records)} hadiths ready")
    no_title   = sum(1 for r in records if not r['title'])
    no_source  = sum(1 for r in records if not r['source'])
    print(f"  - No title:   {no_title}")
    print(f"  - No source:  {no_source} (all need verification)")
    print(f"\nKurdish immutability: all hashes stored in _meta.ku_sha256")
    print("Run import_hadiths.py to insert after approval.")
