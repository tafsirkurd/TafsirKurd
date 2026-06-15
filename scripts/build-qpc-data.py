"""
Build qpc-pages.json from qpc-v2.json + qpc-v2-15-lines.db.

Output: src/data/qpc-pages.json
  {
    "pages": { "1": [[1,1],[1,2],...], "2": [...], ... },
    "surahPages": { "1": 1, "2": 2, ..., "114": 604 }
  }

Run once from project root:
  python scripts/build-qpc-data.py
"""

import json, sqlite3, os, sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
QPC_JSON   = os.path.join('C:/Users/Ferminus/Desktop', 'qpc-v2.json')
QPC_DB     = os.path.join('C:/Users/Ferminus/Desktop/qpc_inspect/db', 'qpc-v2-15-lines.db')
OUT_FILE   = os.path.join(PROJECT_DIR, 'src', 'data', 'qpc-pages.json')

def main():
    print('Loading qpc-v2.json ...')
    with open(QPC_JSON, 'r', encoding='utf-8') as f:
        raw = json.load(f)

    # Build reverse map: word_id -> (surah, ayah)
    print('Building word-id map ...')
    word_map = {}
    for entry in raw.values():
        wid = entry.get('id')
        if wid is not None:
            word_map[wid] = (int(entry['surah']), int(entry['ayah']))
    print(f'  {len(word_map):,} words indexed')

    print('Reading DB ...')
    con = sqlite3.connect(QPC_DB)
    cur = con.cursor()
    cur.execute('SELECT page_number, line_number, line_type, first_word_id, last_word_id, surah_number FROM pages ORDER BY page_number, line_number')
    rows = cur.fetchall()
    con.close()
    print(f'  {len(rows):,} DB rows')

    # Build page -> ordered verse list
    pages = {}
    surah_pages = {}

    for page_number, line_number, line_type, first_word_id, last_word_id, surah_number in rows:
        pn = str(page_number)
        if pn not in pages:
            pages[pn] = []

        if line_type == 'surah_name' and surah_number:
            sn = int(surah_number)
            if str(sn) not in surah_pages:
                surah_pages[str(sn)] = page_number

        if line_type != 'ayah' or first_word_id == '' or last_word_id == '':
            continue

        fid, lid = int(first_word_id), int(last_word_id)
        # Collect distinct (surah, ayah) pairs for this line, in word order
        seen_this_line = set()
        verse_list = pages[pn]
        for wid in range(fid, lid + 1):
            sa = word_map.get(wid)
            if not sa:
                continue
            key = (sa[0], sa[1])
            if key in seen_this_line:
                continue
            seen_this_line.add(key)
            # Only append if not already the last entry (avoid duplicates across lines)
            if not verse_list or verse_list[-1] != list(key):
                verse_list.append(list(key))

    print(f'  Built {len(pages)} pages')
    print(f'  Surah page map: {len(surah_pages)} entries')

    # Verify key pages
    checks = [('1', [[1,1],[1,2],[1,3],[1,4],[1,5],[1,6],[1,7]]),
              ('604', None)]
    for pn, expected in checks:
        got = pages.get(pn, [])
        if expected and got != expected:
            print(f'  WARN page {pn}: expected {expected}, got {got}')
        else:
            print(f'  Page {pn}: {len(got)} verses — first={got[:2] if got else []}  last={got[-2:] if got else []}')

    # Verify surahPages
    expected_sp = {'1': 1, '2': 2, '18': 293, '114': 604}
    for sn, pg in expected_sp.items():
        got = surah_pages.get(sn)
        status = 'OK' if got == pg else f'WARN got {got}'
        print(f'  surahPages[{sn}] = {got} ({status})')

    output = {'pages': pages, 'surahPages': surah_pages}
    out_str = json.dumps(output, ensure_ascii=False, separators=(',', ':'))
    print(f'\nWriting {OUT_FILE} ...')
    print(f'  Size: {len(out_str.encode("utf-8")):,} bytes')
    with open(OUT_FILE, 'w', encoding='utf-8') as f:
        f.write(out_str)
    print('Done.')

if __name__ == '__main__':
    main()
