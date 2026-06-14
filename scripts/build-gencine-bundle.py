#!/usr/bin/env python3
"""Build src/data/gencine-bundle.js from Supabase REST API + local adhkar JSON."""
import json, urllib.request, sys, os

SUPA_URL  = 'https://gijupzejtbpifjzwadee.supabase.co/rest/v1'
ANON_KEY  = ('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.'
             'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpanVwemVqdGJwaWZqendhZGVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NDAyOTcsImV4cCI6MjA3MTExNjI5N30.'
             '-d33o2dDpfD6ywubBcc51srvf1VUewAJwpnd0OOo51M')

HEADERS = {
    'apikey': ANON_KEY,
    'Authorization': 'Bearer ' + ANON_KEY,
    'Accept': 'application/json',
}

def fetch(table, select, filters='', order='sort_order'):
    url = f'{SUPA_URL}/{table}?select={select}&order={order}'
    if filters:
        url += '&' + filters
    # Supabase default page size is 1000; add limit
    url += '&limit=1000'
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode('utf-8'))

print('Fetching Supabase data...')

cats     = fetch('gencine_categories', 'key,label_ku,sort_order,is_hidden')
sections = fetch('gencine_sections',   'key,active,sort_order')
duas     = fetch('gencine_duas',       'category_key,ar,ku,source,repeat,sort_order',
                 filters='active=eq.true')
tasbih   = fetch('gencine_tasbih',    'ar,ku,sort_order',
                 filters='active=eq.true')
# Books: cover_url only — no pdf_url (user constraint)
books    = fetch('gencine_books',
                 'id,title_ku,author_ku,cover_url,badge_until,featured_until,'
                 'series_id,series_title_ku,volume_number,sort_order,active',
                 filters='active=eq.true')
# Hadiths: column is 'title', not 'title_ku'
hadiths  = fetch('gencine_hadiths',   'title,ar,ku,source,sort_order',
                 filters='active=eq.true')

print(f'  cats: {len(cats)} rows')
print(f'  sections: {len(sections)} rows')
print(f'  duas: {len(duas)} rows')
print(f'  tasbih: {len(tasbih)} rows')
print(f'  books: {len(books)} rows (no pdf_url)')
print(f'  hadiths: {len(hadiths)} rows')

# Read bundled adhkar from existing JSON
adhkar_path = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'gencine-adhkar.json')
with open(adhkar_path, 'r', encoding='utf-8') as f:
    adhkar = json.load(f)
print(f'  adhkar: {len(adhkar)} rows (from gencine-adhkar.json)')

bundle = {
    'version':  'v20260614b',
    'sections': sections,
    'adhkar':   adhkar,
    'hadiths':  hadiths,
    'duas':     duas,
    'cats':     cats,
    'tasbih':   tasbih,
    'books':    books,
    'asma99':   [],
}

js = 'window.GENCINE_BUNDLE=' + json.dumps(bundle, ensure_ascii=False, separators=(',',':')) + ';'

out_path = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'gencine-bundle.js')
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(js)

size_kb = len(js.encode('utf-8')) / 1024
print(f'\nWrote {out_path}')
print(f'  Size: {size_kb:.1f} KB')
