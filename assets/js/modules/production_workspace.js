// production_workspace.js - V42 (TRUE DB-DRIVEN SCHEMA + AUTO-CLEANER)
// Rule: STRICT REFACTORING ONLY. SCHEMA_MAP REMOVED.
// Fixes: 
// 1. Dynamic metadata rendering based on es_game_categories.metadata_schema.
// 2. Full DB + Physical Storage Deletion logic preserved.
// 3. Restored window bindings for bulk/delete buttons.

import { supabase } from '../config.js';

let quarantineItems = [];
let masterCategories = [];
let dbModels = [];
let selectedIds = new Set();

const toTitleCase = (str) => {
    if (!str) return '';
    if (Array.isArray(str)) str = str.join(', ');
    if (typeof str !== 'string') str = String(str);
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ').trim();
};

const ICONS = {
    AI: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4M19 17v4M3 5h4M17 19h4"/></svg>`,
    SAVE: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`,
    TRASH: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`,
    PLAY: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="m7 4 12 8-12 8V4Z"/></svg>`,
    REFRESH: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8M21 3v5h-5"/></svg>`
};

const injectStyles = () => {
    if (document.getElementById('pw-v42-styles')) return;
    const s = document.createElement('style');
    s.id = 'pw-v42-styles';
    s.innerHTML = `
        :root { --p: #4f46e5; --s: #10b981; --d: #ef4444; --slate: #64748b; }
        .pw-app { font-family: sans-serif; background: #fff; padding-bottom: 120px; }
        .pw-nav { position: sticky; top: 0; background: #fff; padding: 15px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; z-index: 1000; }
        .pw-table { width: 100%; border-collapse: collapse; }
        .pw-table td { padding: 20px 15px; border-bottom: 2px solid #f1f5f9; vertical-align: top; }
        .thumb-box { width: 96px; height: 96px; border-radius: 12px; background: #f8fafc; overflow: hidden; display: flex; align-items: center; justify-content: center; border: 1px solid #e2e8f0; }
        .thumb-box img { width: 100%; height: 100%; object-fit: cover; }
        
        .input-v36 { width: 100%; border: 1px solid #cbd5e1; background: #fff; padding: 12px; border-radius: 10px; font-size: 14px; outline: none; transition: 0.2s; }
        .input-v36:focus { border-color: var(--p); box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1); }
        
        .input-ok { border-color: var(--s) !important; background: #f0fdf4 !important; }
        .input-err { border-color: var(--d) !important; background: #fef2f2 !important; }

        .btn-act { padding: 12px; border-radius: 12px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
        .btn-act:disabled { opacity: 0.5; cursor: not-allowed; }
        
        .bulk-bar { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); background: #1e293b; color: #fff; padding: 15px 30px; border-radius: 100px; display: flex; gap: 20px; align-items: center; box-shadow: 0 20px 40px rgba(0,0,0,0.4); z-index: 2000; }
    `;
    document.head.appendChild(s);
};

window.getEloqAuditUser = () => {
    try {
        const profile = JSON.parse(localStorage.getItem('eloq_user_profile'));
        return profile ? profile.id : null;
    } catch (e) { return null; }
};

export async function renderProductionWorkspace(containerId) {
    injectStyles();
    await fetchContext();
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <datalist id="cat-list">
            ${masterCategories.map(c => `<option value="${c.name}">`).join('')}
        </datalist>
        <div class="pw-app">
            <div class="pw-nav">
                <div style="display:flex; gap:15px; align-items:center;">
                    <h2 style="margin:0; font-size:20px;">Warehouse V42 (DB-Driven)</h2>
                    <select id="m-sel" class="input-v36" style="width:180px;">
                        ${dbModels.map(m => `<option value="${m.model_id}">${m.model_name}</option>`).join('')}
                    </select>
                </div>
                <div style="display:flex; gap:10px;">
                    <button class="btn-act" style="background:var(--p); color:white; padding:0 25px; font-weight:700;" onclick="window.triggerAllAI()">✨ BATCH AI</button>
                    <button class="btn-act" style="background:#fff; border:1px solid #cbd5e1; padding:0 20px;" onclick="document.getElementById('f-up').click()">+ UPLOAD</button>
                    <button class="btn-act" style="background:#fff; border:1px solid #cbd5e1;" onclick="window.fetchQueue()">${ICONS.REFRESH}</button>
                    <input type="file" id="f-up" hidden multiple onchange="window.handleUpload(this.files)">
                </div>
            </div>
            <table class="pw-table"><tbody id="q-body"></tbody></table>
            <div id="b-bar" class="bulk-bar" style="display:none;">
                <span id="b-count">0 items selected</span>
                <button class="btn-act" style="background:var(--s); color:white; padding:10px 30px; font-weight:800;" onclick="window.bulkApprove()">APPROVE ALL</button>
                <button class="btn-act" style="background:var(--d); color:white; padding:10px 30px;" onclick="window.bulkDelete()">DELETE ALL</button>
            </div>
        </div>
    `;

    window.fetchQueue = fetchQueue;
    window.handleUpload = handleUpload;
    window.triggerAI = triggerAI;
    window.triggerAllAI = triggerAllAI;
    window.approveOne = approveOne;
    window.deleteOne = deleteOne;
    window.bulkApprove = bulkApprove;
    window.bulkDelete = bulkDelete;

    window.updateMeta = (id, catName) => { 
        document.getElementById(`meta-r2-${id}`).innerHTML = renderMetaR2(id, catName);
    };
    window.cleanInput = (el) => { el.value = toTitleCase(el.value); };

    window.validateCat = (el) => {
        const val = el.value.trim().toLowerCase();
        const match = masterCategories.find(c => c.name.toLowerCase() === val);
        
        if (match) {
            el.value = match.name; 
            el.classList.add('input-ok');
            el.classList.remove('input-err');
            window.updateMeta(el.id.replace('c-', ''), match.name);
        } else {
            el.classList.add('input-err');
            el.classList.remove('input-ok');
            window.updateMeta(el.id.replace('c-', ''), ''); // Kosongkan meta jika kategori salah
        }
    };

    window.toggleItem = (id, c) => { c ? selectedIds.add(id) : selectedIds.delete(id); updateBar(); };
    window.toggleAll = (c) => { quarantineItems.forEach(i => window.toggleItem(i.id, c)); fetchQueue(); };
    window.playAud = (u) => new Audio(u).play();
    
    fetchQueue();
}

async function fetchContext() {
    const { data: c } = await supabase.from('es_game_categories').select('id, name, metadata_schema').order('name');
    masterCategories = (c || []).map(cat => {
        let schemaFields = [];
        if (cat.metadata_schema) {
            schemaFields = Array.isArray(cat.metadata_schema) ? cat.metadata_schema : (cat.metadata_schema.fields || []);
        }
        return { ...cat, schemaFields };
    });
    
    const { data: m } = await supabase.from('es_ai_models').select('model_id, model_name').eq('is_active', true);
    dbModels = m || [];
}

async function fetchQueue() {
    const { data } = await supabase.from('es_quarantine_assets').select('*').eq('status', 'PENDING').order('created_at', { ascending: false });
    quarantineItems = data || [];
    renderRows();
}

function renderRows() {
    const b = document.getElementById('q-body');
    if (!quarantineItems.length) { b.innerHTML = '<tr><td style="text-align:center; padding:100px;">Gudang Bersih.</td></tr>'; return; }
    
    b.innerHTML = quarantineItems.map(item => {
        const isAud = item.media_type === 'AUDIO';
        const cleanName = toTitleCase(item.proposed_item_name || '');
        const cleanCat = item.proposed_category || ''; 

        return `
        <tr id="row-${item.id}">
            <td style="width:40px; vertical-align:middle;"><input type="checkbox" onchange="window.toggleItem('${item.id}', this.checked)" ${selectedIds.has(item.id)?'checked':''}></td>
            <td style="width:120px;">
                <div class="thumb-box">
                    ${isAud ? `<button class="btn-act" style="background:none;" onclick="window.playAud('${item.public_url}')">${ICONS.PLAY}</button>` : `<img src="${item.public_url}">`}
                </div>
            </td>
            <td>
                <div style="display:flex; gap:10px; margin-bottom:12px;">
                    <input id="n-${item.id}" class="input-v36" style="flex:2; font-weight:800;" 
                        value="${cleanName}" placeholder="Nama Item..."
                        onblur="window.cleanInput(this)">
                    
                    <input id="c-${item.id}" list="cat-list" class="input-v36" style="flex:1;" 
                        value="${cleanCat}" placeholder="Ketik Kategori..." 
                        oninput="window.validateCat(this)"
                        onblur="window.validateCat(this)">
                </div>
                <div id="meta-r2-${item.id}" style="display:flex; gap:10px; margin-bottom:12px; flex-wrap:wrap;">
                    ${renderMetaR2(item.id, item.proposed_category, item.ai_metadata)}
                </div>
                <div>
                    <input id="desc-${item.id}" class="input-v36" placeholder="Deskripsi Terapi..." value="${item.ai_metadata?.deskripsi || ''}">
                </div>
            </td>
            <td style="width:120px; vertical-align:middle;">
                <div style="display:flex; flex-direction:column; gap:8px;">
                    <button class="btn-act" style="background:#eef2ff; color:var(--p);" onclick="window.triggerAI('${item.id}')">${ICONS.AI} AI</button>
                    <button class="btn-act btn-approve" style="background:#ecfdf5; color:var(--s);" onclick="window.approveOne('${item.id}')">${ICONS.SAVE} SAVE</button>
                    <button class="btn-act" style="background:#fef2f2; color:var(--d);" onclick="window.deleteOne('${item.id}')">${ICONS.TRASH} DEL</button>
                </div>
            </td>
        </tr>`;
    }).join('');
    
    setTimeout(() => {
        quarantineItems.forEach(i => {
            const el = document.getElementById(`c-${i.id}`);
            if(el && el.value) window.validateCat(el);
        });
    }, 100);
    
    updateBar();
}

function renderMetaR2(id, catName, data = {}) {
    let targetKeys = [];
    const cat = masterCategories.find(c => c.name.toLowerCase() === (catName || '').trim().toLowerCase());
    
    if (cat && cat.schemaFields.length > 0) {
        targetKeys = cat.schemaFields.map(f => f.key || f);
    } else if (data && Object.keys(data).length > 0) {
        targetKeys = Object.keys(data).filter(k => k.toLowerCase() !== 'deskripsi');
    }
    
    if (targetKeys.length === 0) return `<span style="font-size:12px; color:var(--slate);">Pilih kategori valid untuk memuat skema metadata.</span>`;

    return targetKeys.map((keyStr, idx) => `
        <input id="meta-${id}-${idx}" class="input-v36" style="flex:1; min-width:100px; font-size:13px; background:#fcfdfe;" 
        data-label="${keyStr}" placeholder="${toTitleCase(keyStr.replace(/_/g, ' '))}" 
        value="${toTitleCase(data ? (data[keyStr.toLowerCase()] || data[keyStr] || '') : '')}"
        onblur="window.cleanInput(this)">
    `).join('');
}

async function triggerAI(id) {
    const item = quarantineItems.find(x => x.id === id);
    const mid = document.getElementById('m-sel').value;
    const btn = document.querySelector(`#row-${id} button[onclick^="window.triggerAI"]`); 
    
    try {
        if(btn) { btn.innerHTML = '⏳'; btn.disabled = true; }
        
        const { data } = await supabase.functions.invoke('eloqspeech-guardian', { body: { public_url: item.public_url, quarantine_id: id, manual_model_id: mid } });
        const res = data.data || data;
        
        const cleanName = toTitleCase(res.item_name || res.name || '');
        const cleanCat = res.category || '';
        
        document.getElementById(`n-${id}`).value = cleanName;
        const catInput = document.getElementById(`c-${id}`);
        catInput.value = cleanCat;
        
        document.getElementById(`desc-${id}`).value = res.ai_metadata?.deskripsi || res.deskripsi || '';
        
        document.getElementById(`meta-r2-${id}`).innerHTML = renderMetaR2(id, cleanCat, res.ai_metadata || res);
        window.validateCat(catInput);

    } catch (e) { console.error(e); alert('AI Gagal'); }
    finally { if(btn) { btn.innerHTML = `${ICONS.AI} AI`; btn.disabled = false; } }
}

async function triggerAllAI() {
    if(!confirm("Jalankan Batch AI?")) return;
    for (const item of quarantineItems) { 
        await triggerAI(item.id); 
        await new Promise(r => setTimeout(r, 800)); 
    }
}

async function approveOne(id, isBulk = false) {
    const btn = document.querySelector(`#row-${id} .btn-approve`);
    if (btn) { btn.innerHTML = '⏳'; btn.disabled = true; }

    const n = document.getElementById(`n-${id}`).value; 
    const catName = document.getElementById(`c-${id}`).value;
    
    const cat = masterCategories.find(x => x.name.toLowerCase() === catName.trim().toLowerCase());
    
    if(!n || !cat) {
        if (btn) { btn.innerHTML = `${ICONS.SAVE} SAVE`; btn.disabled = false; }
        return alert("Kategori tidak valid (Merah) atau Nama kosong!");
    }
    
    const meta = { deskripsi: document.getElementById(`desc-${id}`).value };
    document.querySelectorAll(`[id^="meta-${id}-"]`).forEach(i => { meta[i.getAttribute('data-label').toLowerCase()] = i.value; });

    const item = quarantineItems.find(x => x.id === id);
    const currentUserId = window.getEloqAuditUser();
    
    try {
        const { data: ni, error: itemErr } = await supabase.from('es_game_items').insert({ 
            item_name: n, 
            category_id: cat.id, 
            item_metadata: meta, 
            description: meta.deskripsi,
            created_by: currentUserId,
            is_published: true
        }).select().single();
        
        if(itemErr) throw itemErr;

        const fileName = item.file_path.split('/').pop();
        const newPath = `production/${cat.name}/${fileName}`;

        const { error: moveErr } = await supabase.storage.from('general').move(item.file_path, newPath);
        if (moveErr && !moveErr.message.includes('already exists')) console.warn("Peringatan Storage:", moveErr.message);

        const { data: urlData } = supabase.storage.from('general').getPublicUrl(newPath);

        const { error: assetErr } = await supabase.from('es_game_assets').insert({ 
            item_id: ni.id, 
            public_url: urlData.publicUrl, 
            file_path: newPath,
            media_type: item.media_type,
            created_by: currentUserId
        });

        if(assetErr) throw assetErr;

        await supabase.from('es_quarantine_assets').delete().eq('id', id);

        if (!isBulk) { 
            const row = document.getElementById(`row-${id}`);
            if (row) row.remove();
            quarantineItems = quarantineItems.filter(x => x.id !== id); 
            selectedIds.delete(id); 
            updateBar(); 
        }
    } catch (e) {
        console.error("Gagal saat memproses persetujuan:", e);
        alert("Operasi Gagal: " + e.message);
        if (btn) { btn.innerHTML = `${ICONS.SAVE} SAVE`; btn.disabled = false; }
    }
}

async function bulkApprove() {
    for (const id of selectedIds) { await approveOne(id, true); }
    selectedIds.clear(); fetchQueue();
}

async function bulkDelete() {
    if(!confirm("HAPUS PERMANEN: Aset yang dipilih akan dihapus dari Database dan Storage. Lanjutkan?")) return;
    
    try {
        const filesToRemove = [];
        for (const id of selectedIds) {
            const item = quarantineItems.find(x => x.id === id);
            if (item && item.file_path) filesToRemove.push(item.file_path);
        }

        if (filesToRemove.length > 0) {
            await supabase.storage.from('general').remove(filesToRemove);
        }

        for (const id of selectedIds) { 
            await supabase.from('es_quarantine_assets').delete().eq('id', id); 
        }

        selectedIds.clear(); 
        fetchQueue();
    } catch (e) {
        alert("Gagal menghapus aset massal: " + e.message);
    }
}

async function deleteOne(id) {
    if(!confirm("HAPUS PERMANEN: Aset ini akan dihapus dari Database dan Storage. Lanjutkan?")) return;
    
    try {
        const item = quarantineItems.find(x => x.id === id);
        
        if (item && item.file_path) {
            await supabase.storage.from('general').remove([item.file_path]);
        }
        
        await supabase.from('es_quarantine_assets').delete().eq('id', id);
        
        const rowEl = document.getElementById(`row-${id}`);
        if(rowEl) rowEl.remove();
        quarantineItems = quarantineItems.filter(x => x.id !== id);
        selectedIds.delete(id); 
        updateBar();
    } catch (e) {
        alert("Gagal menghapus aset: " + e.message);
    }
}

async function handleUpload(files) {
    const currentUserId = window.getEloqAuditUser();
    
    for (const f of files) {
        const path = `quarantine/${Date.now()}_${f.name.replace(/\s/g,'_')}`;
        await supabase.storage.from('general').upload(path, f);
        const { data } = supabase.storage.from('general').getPublicUrl(path);
        await supabase.from('es_quarantine_assets').insert({ 
            public_url: data.publicUrl, 
            file_path: path, 
            media_type: f.type.startsWith('image/')?'IMAGE':'AUDIO', 
            status: 'PENDING',
            contributor_id: currentUserId
        });
    }
    fetchQueue();
}

function updateBar() {
    const t = document.getElementById('b-bar');
    const c = document.getElementById('b-count');
    if (selectedIds.size > 0) { t.style.display = 'flex'; c.innerText = `${selectedIds.size} Items Selected`; }
    else { t.style.display = 'none'; }
}