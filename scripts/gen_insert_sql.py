"""
Generate INSERT SQL for hadiths #4-88 (indices 3-87) from hadiths_parsed.json.
Continuing from sort_order 86 (test hadiths #1-3 = sort_order 66/76/86).
Next sort_order starts at 96.
"""
import json, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

with open('C:/TafsirKurd/scripts/hadiths_parsed.json', encoding='utf-8') as f:
    records = json.load(f)

# Hadiths #4-88 = indices 3..87
batch = records[3:88]
print(f"-- Inserting {len(batch)} hadiths (indices 3-87 from parsed JSON)")
print(f"-- sort_order: 96 to {96 + (len(batch)-1)*10}")
print()

def esc(s):
    """Escape single quotes for SQL."""
    if s is None:
        return 'NULL'
    return "'" + str(s).replace("'", "''") + "'"

# Split into batches of 20 for readability
BATCH_SIZE = 20
for batch_start in range(0, len(batch), BATCH_SIZE):
    chunk = batch[batch_start:batch_start + BATCH_SIZE]
    print(f"INSERT INTO gencine_hadiths (sort_order, title, ar, ku, source, active) VALUES")
    rows = []
    for i, r in enumerate(chunk):
        global_idx = batch_start + i
        sort_order = 96 + global_idx * 10
        title  = esc(r['title'])
        ar     = esc(r['ar'])
        ku     = esc(r['ku'])
        source = esc(r.get('source'))
        rows.append(f"  ({sort_order}, {title}, {ar}, {ku}, {source}, true)")
    print(',\n'.join(rows) + ';')
    print()

print(f"-- Done: {len(batch)} hadiths")
