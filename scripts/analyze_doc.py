"""Analyze the structure of the extracted .doc text to understand paragraph patterns."""
import sys, io, re, unicodedata
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

with open('C:/TafsirKurd/scripts/hadiths_raw.txt', encoding='utf-8') as f:
    raw = f.read()

# Split on paragraph breaks (Word uses \r, \n, or \r\n)
paras = [p.strip() for p in re.split(r'[\r\n]+', raw) if p.strip()]

print(f"Total non-empty paragraphs: {len(paras)}\n")

def classify(text):
    """Classify a paragraph as Arabic, Kurdish, or Mixed."""
    ar_chars = sum(1 for c in text if '\u0600' <= c <= '\u06FF')
    # Kurdish Badini uses Arabic script with special chars + harika dots
    # Key markers: ه‌ ێ ۆ ڤ ژ
    ku_markers = sum(1 for c in text if c in 'ێۆڤژ')
    # Arabic-specific: diacritics (tashkeel)
    ar_diacritics = sum(1 for c in text if '\u064B' <= c <= '\u0652')

    if not ar_chars:
        return 'LATIN/OTHER'
    if ku_markers > 2 or (ku_markers > 0 and ar_diacritics == 0):
        return 'KURDISH'
    if ar_diacritics > 3:
        return 'ARABIC'
    return 'MIXED'

# Show first 30 paragraphs with classification
print("=== FIRST 30 PARAGRAPHS ===")
for i, p in enumerate(paras[:30]):
    cls = classify(p)
    preview = p[:100].replace('\n', ' ')
    print(f"[{i:03d}] {cls:10s} | {preview}")

print("\n=== LOOKING FOR HADITH BOUNDARIES ===")
# What character does the (ﷺ) symbol appear as?
for i, p in enumerate(paras[:60]):
    special = [hex(ord(c)) for c in p if ord(c) > 127 and unicodedata.category(c) in ('So','Cf','Co','Cn')]
    if special:
        print(f"[{i:03d}] Special chars: {special[:10]} | {p[:80]}")

print("\n=== UNIQUE SPECIAL CHARS IN WHOLE DOC ===")
from collections import Counter
special_chars = Counter()
for c in raw:
    if ord(c) > 127:
        cat = unicodedata.category(c)
        if cat in ('So', 'Cf', 'Co', 'Cn', 'Cs'):
            special_chars[c] += 1
for char, count in special_chars.most_common(20):
    print(f"  U+{ord(char):04X} ({unicodedata.name(char, '?'):30s}) count={count}")
