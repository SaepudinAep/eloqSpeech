// asset_management.js - V14 (TRUE DB-DRIVEN: NATIVE METADATA SCHEMA)
// Features: Full Native DB Schema, Category CRUD, Smart Relocator, Soft-Delete.
// Rule: STRICT ENRICHMENT ONLY. Original logic preserved.

import { supabase } from '../config.js';

let rawData = [];
let masterCategories = [];
let appState = {
    view: 'CATEGORY', // 'CATEGORY' | 'ITEMS'
    activeCategoryID: null,
    activeCategoryName: null,
    activeFilter: 'ALL'
};

const ICONS = {
    EDIT: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
    TRASH: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
    BACK: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>`,
    WARNING: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
    EYE: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
    EYE_OFF: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`,
    PLUS: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
    GEAR: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`
};

const injectStyles = () => {
    if (document.getElementById('am-v14-styles')) return;
    const s = document.createElement('style');
    s.id = 'am-v14-styles';
    s.innerHTML = `
        .am-app { --p: #4f46e5; --s: #10b981; --d: #ef4444; --slate: #64748b; --bg: #f8fafc; }
        .am-app * { box-sizing: border-box; }
        .am-app { font-family: 'Inter', sans-serif; background: #fff; height: 100vh; display: flex; flex-direction: column; position: relative; }
        .am-nav { padding: 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #fff; }
        .am-title { font-size: 1.2rem; font-weight: 800; color: #1e293b; display: flex; align-items: center; gap: 10px; }
        .am-body { flex: 1; overflow-y: auto; padding: 20px; background: var(--bg); }
        
        .grid-cats { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; }
        .grid-items { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; }
        
        .cat-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; cursor: pointer; transition: 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.02); position: relative; }
        .cat-card:hover { border-color: var(--p); transform: translateY(-3px); box-shadow: 0 10px 15px -3px rgba(79,70,229,0.1); }
        .cat-icon { font-size: 2.5rem; margin-bottom: 10px; }
        .cat-name { font-weight: 700; color: #1e293b; }
        .cat-count { font-size: 0.85rem; color: var(--slate); margin-top: 5px; }
        .btn-edit-cat { position: absolute; top: 10px; right: 10px; background: #f1f5f9; border: none; padding: 8px; border-radius: 6px; color: var(--slate); cursor: pointer; transition: 0.2s; }
        .btn-edit-cat:hover { background: var(--p); color: white; }

        .item-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; transition: 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.02); position: relative;}
        .item-card.draft { opacity: 0.6; filter: grayscale(60%); border: 2px dashed #cbd5e1; }
        .item-card:hover { border-color: #cbd5e1; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .item-img-box { width: 100%; height: 160px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .item-img-box img { width: 100%; height: 100%; object-fit: cover; }
        .item-info { padding: 15px; flex: 1; }
        .item-name { font-weight: 800; color: #1e293b; font-size: 1.1rem; margin-bottom: 5px; }
        .item-meta { font-size: 0.8rem; color: var(--slate); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .item-actions { display: flex; flex-wrap: wrap; border-top: 1px solid #e2e8f0; background: #fafafa; }
        .btn-act { flex: 1; min-width: 30%; padding: 10px; border: none; background: none; cursor: pointer; font-weight: 600; font-size: 0.8rem; display: flex; align-items: center; justify-content: center; gap: 5px; color: var(--slate); border-right: 1px solid #e2e8f0; transition: 0.2s; }
        .btn-act:last-child { border-right: none; }
        .btn-act:hover { background: #f1f5f9; color: var(--p); }
        .btn-act.danger { color: #fca5a5; }
        .btn-act.danger:hover { background: #fef2f2; color: var(--d); }
        .btn-act.publish { color: var(--s); }

        .health-badge { background: #fef2f2; color: var(--d); padding: 8px 12px; font-size: 0.75rem; font-weight: 700; display: flex; flex-direction: column; gap: 8px; border-bottom: 1px solid #fee2e2; }
        .btn-fix { width: 100%; padding: 8px; background: var(--d); color: white; border: none; border-radius: 6px; font-weight: 700; cursor: pointer; transition: 0.2s; }
        .btn-fix:hover { background: #b91c1c; }
        .status-badge { position: absolute; top: 10px; right: 10px; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 800; z-index: 10; color: white; }
        .status-badge.pub { background: var(--s); }
        .status-badge.drf { background: var(--slate); border: 1px solid #94a3b8; }

        .preview-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15,23,42,0.8); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(4px); }
        .preview-box { background: #fff; width: 100%; max-width: 500px; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; max-height: 90vh; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
        .preview-header { padding: 15px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; }
        .preview-content { display: flex; flex-direction: column; padding: 20px; overflow-y: auto; }
        
        .inp-grp { display: flex; flex-direction: column; gap: 5px; margin-bottom: 15px; }
        .inp-grp label { font-size: 0.8rem; font-weight: 700; color: var(--slate); text-transform: uppercase; }
        .inp-box { padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; outline: none; background: #f8fafc; }
        .inp-box:focus { border-color: var(--p); background: #fff; }
        .btn-save { padding: 12px; background: var(--p); color: white; border: none; border-radius: 8px; font-weight: 800; cursor: pointer; margin-top: 10px; width: 100%; }
        
        .btn-icon-top { cursor: pointer; background: white; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 6px; font-weight: 600; font-size: 0.85rem; color: #1e293b; display: inline-flex; align-items: center; gap: 5px; }
        .btn-icon-top:hover { background: #f1f5f9; }
        .btn-primary { background: var(--p); color: white; border: none; padding: 8px 15px; border-radius: 6px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 5px; }
        .btn-primary:hover { background: #4338ca; }

        .schema-row { display: flex; gap: 10px; align-items: center; margin-bottom: 10px; background: #f1f5f9; padding: 10px; border-radius: 8px; }
    `;
    document.head.appendChild(s);
};

export async function renderAssetManagement(containerId) {
    injectStyles();
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `<div class="am-app" id="am-app-root"><div style="padding:40px;text-align:center;">Loading Data...</div></div>`;
    
    window.openCategory = (id, name) => { appState.view = 'ITEMS'; appState.activeCategoryID = id; appState.activeCategoryName = name; renderRouter(); };
    window.goBack = () => { appState.view = 'CATEGORY'; appState.activeCategoryID = null; appState.activeCategoryName = null; renderRouter(); };
    window.previewItem = previewItem;
    window.deleteItem = deleteItem;
    window.saveEdit = saveEdit;
    window.closeModal = () => document.querySelector('.preview-overlay')?.remove();
    window.fixAssetPath = fixAssetPath;
    window.togglePublish = togglePublish;
    
    window.openCategoryModal = openCategoryModal;
    window.saveCategory = saveCategory;
    window.deleteCategory = deleteCategory;
    window.addSchemaRow = addSchemaRow;
    window.removeSchemaRow = removeSchemaRow;

    await fetchData();
    renderRouter();
}

async function fetchData() {
    try {
        const { data: c } = await supabase.from('es_game_categories').select('*').order('name');
        masterCategories = (c || []).map(cat => {
            let schemaFields = [];
            if (cat.metadata_schema) {
                schemaFields = Array.isArray(cat.metadata_schema) ? cat.metadata_schema : (cat.metadata_schema.fields || []);
            }
            return { ...cat, schemaFields };
        });

        const { data: i } = await supabase.from('es_game_items').select(`
            id, item_name, description, item_metadata, category_id, created_at, is_published,
            es_game_assets ( public_url, file_path, media_type )
        `).order('created_at', { ascending: false });
        rawData = i || [];
    } catch (e) { console.error("Gagal load data:", e); }
}

function renderRouter() {
    const root = document.getElementById('am-app-root');
    if (!root) return; 
    
    if(appState.view === 'CATEGORY') {
        root.innerHTML = `
            <div class="am-nav">
                <div class="am-title">📁 Manajemen Kategori & Skema</div>
                <button class="btn-primary" onclick="window.openCategoryModal()">${ICONS.PLUS} Kategori Baru</button>
            </div>
            <div class="am-body"><div class="grid-cats">${renderCategories()}</div></div>
        `;
    } else {
        root.innerHTML = `
            <div class="am-nav">
                <div class="am-title">
                    <button class="btn-icon-top" onclick="window.goBack()">${ICONS.BACK} Kategori</button>
                    <span style="margin-left:10px;">/ ${appState.activeCategoryName}</span>
                </div>
            </div>
            <div class="am-body"><div class="grid-items">${renderItems()}</div></div>
        `;
    }
}

function renderCategories() {
    return masterCategories.map(cat => {
        const catName = cat.name || 'Unnamed';
        const itemCount = rawData.filter(x => x.category_id === cat.id).length;
        const schemaCount = cat.schemaFields.length;
        return `
            <div class="cat-card">
                <button class="btn-edit-cat" onclick="window.openCategoryModal('${cat.id}')" title="Edit Kategori & Skema">${ICONS.GEAR}</button>
                <div onclick="window.openCategory('${cat.id}', '${catName}')">
                    <div class="cat-icon">📁</div>
                    <div class="cat-name">${catName}</div>
                    <div class="cat-count">${itemCount} Item | ${schemaCount} Atribut Skema</div>
                </div>
            </div>
        `;
    }).join('');
}

function openCategoryModal(id = null) {
    const cat = id ? masterCategories.find(c => c.id === id) : { name: '', description: '', schemaFields: [] };
    const isNew = !id;

    const overlay = document.createElement('div');
    overlay.className = 'preview-overlay';
    overlay.innerHTML = `
        <div class="preview-box">
            <div class="preview-header">
                <h3 style="margin:0;">${isNew ? 'Tambah Kategori Baru' : 'Edit Kategori & Skema'}</h3>
                <button class="btn-icon-top" onclick="window.closeModal()" style="border:none;">✖</button>
            </div>
            <div class="preview-content">
                <div class="inp-grp">
                    <label>Nama Kategori</label>
                    <input id="cat-name" class="inp-box" value="${cat.name}" placeholder="Misal: Hewan Laut">
                </div>
                <div class="inp-grp">
                    <label>Deskripsi Kategori</label>
                    <textarea id="cat-desc" class="inp-box" rows="2">${cat.description || ''}</textarea>
                </div>
                
                <hr style="border:0; border-top:1px dashed #cbd5e1; margin:10px 0;">
                <label style="font-size: 0.8rem; font-weight: 700; color: var(--slate); text-transform: uppercase;">SKEMA METADATA (Standar Atribut Item)</label>
                
                <div id="schema-container" style="margin-top:10px;">
                    ${cat.schemaFields.map(f => `
                        <div class="schema-row">
                            <input type="text" class="inp-box schema-key" value="${f.key || f}" placeholder="Key (misal: warna)" style="flex:1;">
                            <button class="btn-act danger" onclick="window.removeSchemaRow(this)" style="min-width:auto; padding:8px;">✖</button>
                        </div>
                    `).join('')}
                </div>
                <button class="btn-act" style="border: 1px dashed #cbd5e1; color:var(--p); margin-bottom:20px;" onclick="window.addSchemaRow()">+ Tambah Atribut Wajib</button>

                <div style="display:flex; gap:10px;">
                    ${!isNew ? `<button class="btn-act danger" style="background:#fef2f2; border:1px solid #fecaca; padding:12px; border-radius:8px;" onclick="window.deleteCategory('${id}')">${ICONS.TRASH}</button>` : ''}
                    <button class="btn-save" style="flex:1; margin:0;" onclick="window.saveCategory('${id}')">SIMPAN KATEGORI</button>
                </div>
            </div>
        </div>
    `;
    document.getElementById('am-app-root').appendChild(overlay);
}

function addSchemaRow() {
    const container = document.getElementById('schema-container');
    const row = document.createElement('div');
    row.className = 'schema-row';
    row.innerHTML = `
        <input type="text" class="inp-box schema-key" placeholder="Key (misal: rasa_benda)" style="flex:1;">
        <button class="btn-act danger" onclick="window.removeSchemaRow(this)" style="min-width:auto; padding:8px;">✖</button>
    `;
    container.appendChild(row);
}

function removeSchemaRow(btn) { btn.parentElement.remove(); }

async function saveCategory(id) {
    const name = document.getElementById('cat-name').value.trim();
    const desc = document.getElementById('cat-desc').value.trim();
    const schemaInputs = document.querySelectorAll('.schema-key');
    
    if(!name) return alert("Nama kategori wajib diisi!");

    const schemaFields = Array.from(schemaInputs)
        .map(inp => inp.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'))
        .filter(val => val !== '')
        .map(key => ({ key, type: 'text' }));

    try {
        const payload = { name: name, description: desc, metadata_schema: schemaFields };
        if (id && id !== 'null') {
            await supabase.from('es_game_categories').update(payload).eq('id', id);
        } else {
            await supabase.from('es_game_categories').insert(payload);
        }
        window.closeModal();
        await fetchData(); renderRouter();
    } catch(e) { alert("Gagal menyimpan kategori: " + e.message); }
}

async function deleteCategory(id) {
    const itemCount = rawData.filter(x => x.category_id === id).length;
    if (itemCount > 0) return alert(`Gagal: Kategori ini masih memiliki ${itemCount} item di dalamnya. Hapus atau pindahkan item terlebih dahulu.`);
    
    if(!confirm("Yakin ingin menghapus kategori ini permanen?")) return;
    try {
        await supabase.from('es_game_categories').delete().eq('id', id);
        window.closeModal();
        await fetchData(); renderRouter();
    } catch(e) { alert("Gagal menghapus: " + e.message); }
}

function renderItems() {
    const filtered = rawData.filter(x => x.category_id === appState.activeCategoryID);
    if(filtered.length === 0) return `<div style="grid-column: 1/-1; text-align:center; padding:50px; color:var(--slate);">Belum ada item.</div>`;

    return filtered.map(item => {
        const asset = item.es_game_assets?.[0];
        const isAudio = asset && asset.media_type === 'AUDIO';
        const isQuarantine = asset && asset.file_path?.includes('quarantine/');
        
        let healthBadge = isQuarantine ? `<div class="health-badge"><div style="display:flex; align-items:center; gap:5px;">${ICONS.WARNING} STATUS: KARANTINA</div><button class="btn-fix" onclick="window.fixAssetPath('${item.id}', '${appState.activeCategoryName}')">📦 PINDAHKAN FISIK</button></div>` : '';

        let metaText = '';
        if(item.item_metadata) {
            let metaObj = typeof item.item_metadata === 'string' ? JSON.parse(item.item_metadata) : item.item_metadata;
            metaText = Object.entries(metaObj).filter(([k,v]) => k !== 'deskripsi' && v).map(([k,v]) => `${k}: ${v}`).join(' | ');
        }

        const isPub = item.is_published !== false;
        const pubBadge = isPub ? `<div class="status-badge pub">🟢 LIVE</div>` : `<div class="status-badge drf">⚫ ARSIP</div>`;

        return `
            <div class="item-card ${isPub ? '' : 'draft'}" id="card-${item.id}">
                ${pubBadge} ${healthBadge}
                <div class="item-img-box">${!asset ? `<span style="color:var(--d);font-weight:bold;">NO IMG</span>` : (isAudio ? `<span style="font-size:3rem;">🎵</span>` : `<img src="${asset.public_url}" loading="lazy">`)}</div>
                <div class="item-info">
                    <div class="item-name">${item.item_name}</div>
                    <div class="item-meta">${metaText || 'Tidak ada metadata'}</div>
                </div>
                <div class="item-actions">
                    <button class="btn-act" onclick="window.previewItem('${item.id}')">${ICONS.EDIT} EDIT</button>
                    <button class="btn-act ${isPub ? '' : 'publish'}" onclick="window.togglePublish('${item.id}', ${isPub})">${isPub ? ICONS.EYE_OFF : ICONS.EYE} ${isPub ? 'ARSIP' : 'PUBLISH'}</button>
                    <button class="btn-act danger" onclick="window.deleteItem('${item.id}')">${ICONS.TRASH}</button>
                </div>
            </div>
        `;
    }).join('');
}

function previewItem(id) {
    const item = rawData.find(x => x.id === id);
    const cat = masterCategories.find(c => c.id === item.category_id);
    if(!item || !cat) return;
    
    let metaObj = typeof item.item_metadata === 'string' ? JSON.parse(item.item_metadata || '{}') : (item.item_metadata || {});
    
    const schemaHTML = cat.schemaFields.length === 0 
        ? `<div style="font-size:0.85rem; color:var(--slate); font-style:italic;">Kategori ini belum memiliki Skema Atribut. Edit Kategori untuk menambahkan standar.</div>`
        : cat.schemaFields.map(f => {
            const keyName = f.key || f;
            return `
            <div class="inp-grp" style="margin-bottom:10px;">
                <label>${keyName.replace(/_/g, ' ')}</label>
                <input type="text" class="inp-box meta-val" data-key="${keyName}" value="${metaObj[keyName] || ''}" placeholder="Nilai ${keyName}...">
            </div>
        `}).join('');

    const overlay = document.createElement('div');
    overlay.className = 'preview-overlay';
    overlay.innerHTML = `
        <div class="preview-box">
            <div class="preview-header">
                <h3 style="margin:0;">Edit Item Metadata</h3>
                <button class="btn-icon-top" onclick="window.closeModal()" style="border:none;">✖</button>
            </div>
            <div class="preview-content">
                <div class="inp-grp"><label>Nama Item</label><input id="e-name" class="inp-box" value="${item.item_name}"></div>
                
                <hr style="border:0; border-top:1px dashed #cbd5e1; margin:15px 0;">
                <label style="font-size: 0.8rem; font-weight: 700; color: var(--p); text-transform: uppercase;">ATRIBUT STANDAR (${cat.name})</label>
                <div id="dynamic-meta-container" style="margin-top:10px;">${schemaHTML}</div>
                <hr style="border:0; border-top:1px dashed #cbd5e1; margin:15px 0;">
                
                <div class="inp-grp"><label>Deskripsi Khusus</label><textarea id="e-desc" class="inp-box" rows="2">${item.description || ''}</textarea></div>
                <button class="btn-save" onclick="window.saveEdit('${item.id}')">SIMPAN ITEM</button>
            </div>
        </div>
    `;
    document.getElementById('am-app-root').appendChild(overlay);
}

async function saveEdit(id) {
    const newName = document.getElementById('e-name').value;
    const newDesc = document.getElementById('e-desc').value;
    
    const meta = { deskripsi: newDesc };
    document.querySelectorAll('#dynamic-meta-container .meta-val').forEach(inp => {
        if(inp.value.trim()) meta[inp.getAttribute('data-key')] = inp.value.trim();
    });

    try {
        await supabase.from('es_game_items').update({ item_name: newName, item_metadata: meta, description: newDesc }).eq('id', id);
        window.closeModal();
        await fetchData(); renderRouter(); 
    } catch(e) { alert("Gagal update item: " + e.message); }
}

async function fixAssetPath(itemId, catName) {
    try {
        const item = rawData.find(x => x.id === itemId);
        const asset = item.es_game_assets[0];
        const fileName = `${Date.now()}_${asset.file_path.split('/').pop()}`; 
        const newPath = `production/${catName}/${fileName}`;
        await supabase.storage.from('general').move(asset.file_path, newPath);
        const { data: urlData } = supabase.storage.from('general').getPublicUrl(newPath);
        await supabase.from('es_game_assets').update({ file_path: newPath, public_url: urlData.publicUrl }).eq('item_id', itemId);
        await supabase.from('es_quarantine_assets').delete().eq('target_item_id', itemId);
        await fetchData(); renderRouter();
    } catch (e) { alert("Gagal memindahkan file: " + e.message); }
}

async function togglePublish(id, currentStatus) {
    try { await supabase.from('es_game_items').update({ is_published: !currentStatus }).eq('id', id); await fetchData(); renderRouter(); } 
    catch(e) { alert("Gagal mengubah status: " + e.message); }
}

async function deleteItem(id) {
    if(!confirm("PERINGATAN KRITIS: Menghapus item yang sudah dimainkan pasien akan merusak Rekam Medis. Gunakan ARSIP jika ragu.\n\nTetap Hapus Permanen?")) return;
    try {
        const asset = rawData.find(x => x.id === id)?.es_game_assets?.[0];
        if (asset?.file_path) await supabase.storage.from('general').remove([asset.file_path]);
        await supabase.from('es_game_items').delete().eq('id', id);
        await fetchData(); renderRouter();
    } catch(e) { alert("Gagal menghapus item (Mungkin terkunci Rekam Medis): " + e.message); }
}