"""Generate separate batch SQL files from islah_parsed.json."""
import json, sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

with open('C:/TafsirKurd/scripts/islah_parsed.json', encoding='utf-8') as f:
    records = json.load(f)

def esc(s):
    if s is None:
        return 'NULL'
    return "'" + str(s).replace("'", "''") + "'"

BATCH_SIZE = 20
for batch_num in range(0, len(records), BATCH_SIZE):
    chunk = records[batch_num:batch_num + BATCH_SIZE]
    idx = batch_num // BATCH_SIZE + 1
    path = f'C:/TafsirKurd/scripts/islah_batch{idx}.sql'
    rows = []
    for r in chunk:
        rows.append(f"  ({r['sort_order']}, {esc(r['title'])}, {esc(r['ar'])}, {esc(r['ku'])}, NULL, true)")
    sql = "INSERT INTO gencine_hadiths (sort_order, title, ar, ku, source, active) VALUES\n" + ',\n'.join(rows) + ';'
    with open(path, 'w', encoding='utf-8') as f:
        f.write(sql)
    print(f"islah_batch{idx}.sql: {len(chunk)} hadiths, sort_order {chunk[0]['sort_order']}-{chunk[-1]['sort_order']}")
