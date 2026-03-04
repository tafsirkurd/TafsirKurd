"""Generate 5 separate batch SQL files from hadiths_parsed.json indices 3-87."""
import json, sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

with open('C:/TafsirKurd/scripts/hadiths_parsed.json', encoding='utf-8') as f:
    records = json.load(f)

batch = records[3:88]

def esc(s):
    if s is None:
        return 'NULL'
    return "'" + str(s).replace("'", "''") + "'"

BATCH_SIZE = 17  # ~5 batches of 17
for batch_num in range(5):
    start = batch_num * BATCH_SIZE
    chunk = batch[start:start + BATCH_SIZE]
    if not chunk:
        break
    path = f'C:/TafsirKurd/scripts/batch{batch_num+1}.sql'
    lines = [f"INSERT INTO gencine_hadiths (sort_order, title, ar, ku, source, active) VALUES"]
    rows = []
    for i, r in enumerate(chunk):
        global_idx = start + i
        sort_order = 96 + global_idx * 10
        title = esc(r['title'])
        ar    = esc(r['ar'])
        ku    = esc(r['ku'])
        src   = esc(r.get('source'))
        rows.append(f"  ({sort_order}, {title}, {ar}, {ku}, {src}, true)")
    lines.append(',\n'.join(rows) + ';')
    sql = '\n'.join(lines)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(sql)
    print(f"batch{batch_num+1}.sql: {len(chunk)} hadiths, sort_order {96+start*10}-{96+(start+len(chunk)-1)*10}")
