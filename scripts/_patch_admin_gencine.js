var fs=require('fs');
var p='C:/TafsirKurd/src/admin-gencine.html';
var c=fs.readFileSync(p,'utf8');

// ─── 1. Add Tasbih tab button after Hadiths tab ─────────────────────────────
c=c.replace(
  '<button class="platform-tab" onclick="switchTab(\'asma99\')">',
  '<button class="platform-tab" onclick="switchTab(\'tasbih\')">\n                    <i data-lucide="rotate-cw" style="width:15px;height:15px"></i>\n                    Tasbih\n                    <span class="tab-count" id="tab-count-tasbih">0</span>\n                </button>\n                <button class="platform-tab" onclick="switchTab(\'asma99\')">'
);

// ─── 2. Add Tasbih panel before 99 Names panel ───────────────────────────────
var tasbihPanel = `
            <!-- ── TASBIH ── -->
            <div id="panel-tasbih" class="view-panel">
                <input type="hidden" id="tasbih-edit-id">
                <div class="add-form-wrap">
                    <button class="add-form-toggle" id="tasbih-form-toggle" onclick="toggleForm('tasbih')">
                        <i data-lucide="plus"></i>
                        <span id="tasbih-form-toggle-label">Add Dhikr</span>
                    </button>
                    <div class="add-form-body" id="tasbih-form-body">
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Arabic Text</label>
                                <textarea id="tasbih-ar" class="form-textarea" placeholder="سُبْحَانَ اللَّهِ" dir="rtl" style="min-height:60px"></textarea>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Kurdish / Short Label</label>
                                <input type="text" id="tasbih-ku" class="form-input" placeholder="سبحان الله" dir="rtl" style="font-family:'IBM Plex Sans Arabic',system-ui,sans-serif">
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Sort Order</label>
                                    <input type="number" id="tasbih-sort" class="form-input" value="10" min="0">
                                </div>
                                <div class="form-group" style="justify-content:flex-end;align-items:flex-end">
                                    <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                                        <input type="checkbox" id="tasbih-active" checked>
                                        <span class="form-label" style="margin:0">Active</span>
                                    </label>
                                </div>
                            </div>
                            <div class="form-actions">
                                <button class="btn btn-secondary" onclick="cancelTasbihEdit()">Cancel</button>
                                <button class="btn btn-primary" onclick="saveTasbih()">Save Dhikr</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="list-toolbar">
                    <span class="list-count" id="tasbih-count"></span>
                </div>
                <div id="tasbih-list" class="items-list"></div>
            </div>
`;
c=c.replace(
  '\n            <!-- ── 99 NAMES ── -->',
  tasbihPanel + '\n            <!-- ── 99 NAMES ── -->'
);

// ─── 3. Make Asma99 cards editable (add edit button + inline input) ──────────
// Update renderAsma99 to add edit button and inline editing
var oldRenderAsma = `function renderAsma99() {
    var q = (document.getElementById('asma-search') || {value:''}).value.toLowerCase();
    var filtered = q ? ASMA_DATA_ADMIN.filter(function(a){
        return a.ar.includes(q) || a.tr.toLowerCase().includes(q) || a.ku.includes(q);
    }) : ASMA_DATA_ADMIN;
    var grid = document.getElementById('asma-grid'); if (!grid) return;
    grid.textContent = '';
    var countEl = document.getElementById('asma-count');
    if (countEl) countEl.textContent = filtered.length + ' / 99 names';
    filtered.forEach(function(a) {
        var card = mke('div', 'asma-card');
        var num = mke('div', 'asma-card-num'); num.textContent = '#' + a.n;
        var ar  = mke('div', 'asma-card-ar');  ar.textContent  = a.ar;
        var tr  = mke('div', 'asma-card-tr');  tr.textContent  = a.tr;
        var ku  = mke('div', 'asma-card-ku');  ku.textContent  = a.ku;
        card.appendChild(num); card.appendChild(ar); card.appendChild(tr); card.appendChild(ku);
        grid.appendChild(card);
    });
}
function filterAsma(q) { renderAsma99(); }`;

var newRenderAsma = `var _asma99Overrides = {}; /* n -> ku, loaded from DB */

async function loadAsma99Overrides() {
    var supabase = window.adminAuth.getSupabase(); if (!supabase) return;
    var r = await supabase.from('gencine_asma99').select('n,ku');
    if (!r.error && r.data) {
        _asma99Overrides = {};
        r.data.forEach(function(row){ _asma99Overrides[row.n] = row.ku; });
    }
}

async function saveAsmaKu(n, ku) {
    var supabase = window.adminAuth.getSupabase(); if (!supabase) return;
    var r = await supabase.from('gencine_asma99').upsert({n: n, ku: ku, updated_at: new Date().toISOString()}, {onConflict: 'n'});
    if (r.error) { showNotification('Save failed: ' + r.error.message, 'error'); return; }
    _asma99Overrides[n] = ku;
    showNotification('Name #' + n + ' updated.', 'success');
    localStorage.removeItem('gencine_asma99_v1');
    renderAsma99();
}

function renderAsma99() {
    var q = (document.getElementById('asma-search') || {value:''}).value.toLowerCase();
    var filtered = q ? ASMA_DATA_ADMIN.filter(function(a){
        var kuVal = _asma99Overrides[a.n] || a.ku;
        return a.ar.includes(q) || a.tr.toLowerCase().includes(q) || kuVal.includes(q);
    }) : ASMA_DATA_ADMIN;
    var grid = document.getElementById('asma-grid'); if (!grid) return;
    grid.textContent = '';
    var countEl = document.getElementById('asma-count');
    if (countEl) countEl.textContent = filtered.length + ' / 99 names';
    filtered.forEach(function(a) {
        var kuVal = _asma99Overrides[a.n] || a.ku;
        var card = mke('div', 'asma-card');
        card.style.cssText = 'position:relative';
        var num = mke('div', 'asma-card-num'); num.textContent = '#' + a.n;
        var ar  = mke('div', 'asma-card-ar');  ar.textContent  = a.ar;
        var tr  = mke('div', 'asma-card-tr');  tr.textContent  = a.tr;
        var ku  = mke('div', 'asma-card-ku');  ku.textContent  = kuVal;
        /* Edit button */
        var editBtn = mke('button', 'icon-action');
        editBtn.title = 'Edit Kurdish';
        editBtn.style.cssText = 'position:absolute;top:8px;left:8px';
        var editIco = mke('i'); editIco.setAttribute('data-lucide','pencil'); editBtn.appendChild(editIco);
        /* Inline edit row (hidden by default) */
        var editRow = mke('div', '');
        editRow.style.cssText = 'display:none;gap:6px;margin-top:8px;align-items:center';
        var inp = mke('input', 'form-input');
        inp.type='text'; inp.value=kuVal; inp.dir='rtl';
        inp.style.cssText = 'font-family:"IBM Plex Sans Arabic",system-ui,sans-serif;flex:1';
        var saveBtn = mke('button', 'btn btn-primary');
        saveBtn.textContent = 'Save';
        saveBtn.style.cssText = 'padding:6px 14px;font-size:12px';
        var cancelBtn = mke('button', 'btn btn-secondary');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.cssText = 'padding:6px 10px;font-size:12px';
        editRow.appendChild(inp); editRow.appendChild(saveBtn); editRow.appendChild(cancelBtn);
        editBtn.onclick = function(){
            editRow.style.display = editRow.style.display === 'none' ? 'flex' : 'none';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        };
        saveBtn.onclick = function(){ saveAsmaKu(a.n, inp.value.trim()); };
        cancelBtn.onclick = function(){ editRow.style.display='none'; };
        card.appendChild(editBtn);
        card.appendChild(num); card.appendChild(ar); card.appendChild(tr); card.appendChild(ku);
        card.appendChild(editRow);
        grid.appendChild(card);
    });
    if (typeof lucide !== 'undefined') lucide.createIcons();
}
function filterAsma(q) { renderAsma99(); }`;

c=c.replace(oldRenderAsma, newRenderAsma);

// ─── 4. Add Tasbih state + CRUD JS ──────────────────────────────────────────
var tasbihJS = `
/* ── TASBIH ── */
var allTasbih = [];

async function loadTasbih() {
    var supabase = window.adminAuth.getSupabase(); if (!supabase) return;
    var r = await supabase.from('gencine_tasbih').select('*').order('sort_order');
    if (r.error) { showNotification('Error: ' + r.error.message, 'error'); return; }
    allTasbih = r.data || [];
    renderTasbihList(); updateStats();
}

function renderTasbihList() {
    var list = document.getElementById('tasbih-list');
    if (!list) return;
    list.textContent = '';
    var countEl = document.getElementById('tasbih-count');
    if (countEl) countEl.textContent = allTasbih.length + ' dhikr items';
    if (!allTasbih.length) {
        var es = mke('div', 'empty-state');
        var ep = mke('p'); ep.textContent = 'No tasbih items yet.';
        es.appendChild(ep); list.appendChild(es); return;
    }
    allTasbih.forEach(function(item) {
        var card = mke('div', 'item-card');
        var body = mke('div', 'item-card-body');
        var arEl = mke('div', 'item-card-ar'); arEl.textContent = item.ar;
        arEl.style.cssText = 'direction:rtl;font-family:"IBM Plex Sans Arabic",system-ui,sans-serif;font-size:1rem';
        var kuEl = mke('div', 'item-card-meta'); kuEl.textContent = item.ku;
        var sortEl = mke('div','item-card-meta'); sortEl.textContent = 'order: ' + item.sort_order + (item.active ? '' : ' · hidden');
        body.appendChild(arEl); body.appendChild(kuEl); body.appendChild(sortEl);
        var acts = mke('div', 'item-card-actions');
        acts.appendChild(mkIconBtn('pencil', 'Edit', false, function(id){ return function(){ editTasbih(id); }; }(item.id)));
        acts.appendChild(mkIconBtn('trash-2', 'Delete', true, function(id){ return function(){ deleteTasbih(id); }; }(item.id)));
        card.appendChild(body); card.appendChild(acts);
        list.appendChild(card);
    });
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function editTasbih(id) {
    var item = allTasbih.find(function(x){ return x.id === id; });
    if (!item) return;
    document.getElementById('tasbih-edit-id').value = id;
    document.getElementById('tasbih-ar').value = item.ar || '';
    document.getElementById('tasbih-ku').value = item.ku || '';
    document.getElementById('tasbih-sort').value = item.sort_order || 10;
    document.getElementById('tasbih-active').checked = item.active !== false;
    var body = document.getElementById('tasbih-form-body');
    body.classList.add('open');
    document.getElementById('tasbih-form-toggle-label').textContent = 'Editing Dhikr';
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function cancelTasbihEdit() {
    document.getElementById('tasbih-edit-id').value = '';
    document.getElementById('tasbih-ar').value = '';
    document.getElementById('tasbih-ku').value = '';
    document.getElementById('tasbih-sort').value = 10;
    document.getElementById('tasbih-active').checked = true;
    document.getElementById('tasbih-form-body').classList.remove('open');
    document.getElementById('tasbih-form-toggle-label').textContent = 'Add Dhikr';
}

async function saveTasbih() {
    var ar = document.getElementById('tasbih-ar').value.trim();
    if (!ar) { showNotification('Arabic text is required.', 'warning'); return; }
    var editId = document.getElementById('tasbih-edit-id').value;
    var payload = {
        ar: ar,
        ku: document.getElementById('tasbih-ku').value.trim(),
        sort_order: parseInt(document.getElementById('tasbih-sort').value) || 10,
        active: document.getElementById('tasbih-active').checked
    };
    var supabase = window.adminAuth.getSupabase();
    var r = editId
        ? await supabase.from('gencine_tasbih').update(payload).eq('id', editId)
        : await supabase.from('gencine_tasbih').insert(payload);
    if (r.error) { showNotification('Save failed: ' + r.error.message, 'error'); return; }
    showNotification(editId ? 'Dhikr updated.' : 'Dhikr added.', 'success');
    cancelTasbihEdit();
    await loadTasbih();
    localStorage.removeItem('gencine_tasbih_v1');
}

async function deleteTasbih(id) {
    if (!confirm('Delete this dhikr item?')) return;
    var r = await window.adminAuth.getSupabase().from('gencine_tasbih').delete().eq('id', id);
    if (r.error) { showNotification('Delete failed: ' + r.error.message, 'error'); return; }
    showNotification('Dhikr deleted.', 'success');
    await loadTasbih();
    localStorage.removeItem('gencine_tasbih_v1');
}

`;

// Insert tasbih JS before the 99 Names section
c=c.replace('/* ── 99 NAMES ── */', tasbihJS + '/* ── 99 NAMES ── */');

// ─── 5. Update loadAll, updateStats, TAB_NAMES, addLabels, switchTab, topAdd ─
c=c.replace(
  "async function loadAll() { await Promise.all([loadCategories(), loadDuas(), loadHadiths(), loadSections()]); }",
  "async function loadAll() { await Promise.all([loadCategories(), loadDuas(), loadHadiths(), loadSections(), loadTasbih(), loadAsma99Overrides()]); }"
);

c=c.replace(
  "document.getElementById('stat-hadiths').textContent = allHadiths.length;\n    document.getElementById('tab-count-cats').textContent    = allCategories.length;\n    document.getElementById('tab-count-duas').textContent    = allDuas.length;\n    document.getElementById('tab-count-hadiths').textContent = allHadiths.length;",
  "document.getElementById('stat-hadiths').textContent = allHadiths.length;\n    document.getElementById('tab-count-cats').textContent    = allCategories.length;\n    document.getElementById('tab-count-duas').textContent    = allDuas.length;\n    document.getElementById('tab-count-hadiths').textContent = allHadiths.length;\n    var tcT = document.getElementById('tab-count-tasbih'); if(tcT) tcT.textContent = allTasbih.length;"
);

c=c.replace(
  "var TAB_NAMES = ['categories','duas','hadiths','asma99'];",
  "var TAB_NAMES = ['categories','duas','hadiths','tasbih','asma99'];"
);

c=c.replace(
  "var addLabels = { categories: 'Add Category', duas: 'Add Dua', hadiths: 'Add Hadith', asma99: '' };",
  "var addLabels = { categories: 'Add Category', duas: 'Add Dua', hadiths: 'Add Hadith', tasbih: 'Add Dhikr', asma99: '' };"
);

c=c.replace(
  "    if (addBtn) addBtn.style.display = name === 'asma99' ? 'none' : '';",
  "    if (addBtn) addBtn.style.display = name === 'asma99' ? 'none' : '';\n    if (name === 'tasbih') renderTasbihList();"
);

c=c.replace(
  "    if (currentTab === 'asma99') return;\n    toggleForm(currentTab === 'categories' ? 'cat' : currentTab === 'duas' ? 'dua' : 'hadith');",
  "    if (currentTab === 'asma99') return;\n    if (currentTab === 'tasbih') { toggleForm('tasbih'); return; }\n    toggleForm(currentTab === 'categories' ? 'cat' : currentTab === 'duas' ? 'dua' : 'hadith');"
);

fs.writeFileSync(p,c,'utf8');
console.log('done');
