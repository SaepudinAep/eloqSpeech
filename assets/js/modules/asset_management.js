// asset_management.js - V12 (COMPACT UI, DYNAMIC META, PUBLISH & SMART RELOCATOR)
// Features: Drill-Down Nav, Auto-Clean, Full CRUD, Smart Quarantine Relocator, Soft-Delete.
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

const SCHEMA_MAP = {
    "Buah": ["Warna", "Rasa", "Tekstur"],
    "Sayur": ["Warna", "Rasa", "Tekstur"],
    "Kendaraan": ["Tipe", "Jumlah Roda"],
    "Hewan": ["Habitat", "Makanan", "Suara"],
    "Hewan Laut": ["Habitat", "Makanan"],
    "Emosi": ["Ekspresi", "Intensitas"],
    "Pekerjaan": ["Tempat Kerja", "Alat Utama"],
    "Anggota Tubuh": ["Letak", "Fungsi"],
    "Bentuk": ["Jumlah Sisi", "Dimensi"],
    "Default": ["Warna", "Sifat"]
};

const getFields = (catName) => SCHEMA_MAP[catName] || SCHEMA_MAP["Default"];

const ICONS = {
    EDIT: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
    TRASH: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
    BACK: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>`,
    WARNING: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
    EYE: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
    EYE_OFF: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`
};

const injectStyles = () => {
    if (document.getElementById('am-v12-styles')) return;
    const s = document.createElement('style');
    s.id = 'am-v12-styles';
    s.innerHTML = `
        .am-app { --p: #4f46e5; --s: #10b981; --d: #ef4444; --slate: #64748b; --bg: #f8fafc; }
        .am-app * { box-sizing: border-box; }
        .am-app { font-family: 'Inter', sans-serif; background: #fff; height: 100vh; display: flex; flex-direction: column; position: relative; }
        .am-nav { padding: 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #fff; }
        .am-title { font-size: 1.2rem; font-weight: 800; color: #1e293b; display: flex; align-items: center; gap: 10px; }
        .am-body { flex: 1; overflow-y: auto; padding: 20px; background: var(--bg); }
        
        /* Grid Layouts */
        .grid-cats { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; }
        .grid-items { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; }
        
        /* Cards */
        .cat-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; cursor: pointer; transition: 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .cat-card:hover { border-color: var(--p); transform: translateY(-3px); box-shadow: 0 10px 15px -3px rgba(79,70,229,0.1); }
        .cat-icon { font-size: 2.5rem; margin-bottom: 10px; }
        .cat-name { font-weight: 700; color: #1e293b; }
        .cat-count { font-size: 0.85rem; color: var(--slate); margin-top: 5px; }

        .item-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; transition: 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.02); position: relative;}
        .item-card.draft { opacity: 0.6; filter: grayscale(60%); border: 2px dashed #cbd5e1; } /* ENRICHMENT: Visual DRAFT */
        .item-card:hover { border-color: #cbd5e1; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .item-img-box { width: 100%; height: 160px; background: #f1f5f9; position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .item-img-box img { width: 100%; height: 100%; object-fit: cover; }
        .item-info { padding: 15px; flex: 1; }
        .item-name { font-weight: 800; color: #1e293b; font-size: 1.1rem; margin-bottom: 5px; }
        .item-meta { font-size: 0.8rem; color: var(--slate); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .item-actions { display: flex; flex-wrap: wrap; border-top: 1px solid #e2e8f0; background: #fafafa; }
        .btn-act { flex: 1; min-width: 30%; padding: 10px; border: none; background: none; cursor: pointer; font-weight: 600; font-size: 0.8rem; display: flex; align-items: center; justify-content: center; gap: 5px; color: var(--slate); border-right: 1px solid #e2e8f0; transition: 0.2s; }
        .btn-act:last-child { border-right: none; }
        .btn-act:hover { background: #f1f5f9; color: var(--p); }
        .btn-act.danger { color: #fca5a5; } /* ENRICHMENT: Pudar agar aman */
        .btn-act.danger:hover { background: #fef2f2; color: var(--d); }
        .btn-act.publish { color: var(--s); }

        /* Health Checker Badge (ASLI BAPAK) */
        .health-badge { background: #fef2f2; color: var(--d); padding: 8px 12px; font-size: 0.75rem; font-weight: 700; display: flex; flex-direction: column; gap: 8px; border-bottom: 1px solid #fee2e2; }
        .btn-fix { width: 100%; padding: 8px; background: var(--d); color: white; border: none; border-radius: 6px; font-weight: 700; cursor: pointer; transition: 0.2s; display: flex; justify-content: center; align-items: center; gap: 5px; }
        .btn-fix:hover { background: #b91c1c; }

        /* Status Badge ENRICHMENT */
        .status-badge { position: absolute; top: 10px; right: 10px; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 800; z-index: 10; color: white; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
        .status-badge.pub { background: var(--s); }
        .status-badge.drf { background: var(--slate); border: 1px solid #94a3b8; }

        /* Modal Preview/Edit */
        .preview-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15,23,42,0.8); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(4px); }
        .preview-box { background: #fff; width: 100%; max-width: 450px; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; max-height: 90vh; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
        .preview-header { padding: 15px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; }
        .preview-content { display: flex; flex-direction: column; padding: 20px; overflow-y: auto; }
        
        .preview-img-thumbnail { width: 120px; height: 120px; margin: 0 auto 20px auto; border-radius: 12px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; overflow: hidden; border: 2px solid #e2e8f0; flex-shrink: 0; }
        .preview-img-thumbnail img { width: 100%; height: 100%; object-fit: cover; }
        
        .preview-form { display: flex; flex-direction: column; gap: 15px; }
        
        .inp-grp { display: flex; flex-direction: column; gap: 5px; }
        .inp-grp label { font-size: 0.8rem; font-weight: 700; color: var(--slate); text-transform: uppercase; }
        .inp-box { padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; outline: none; transition: 0.2s; background: #f8fafc; }
        .inp-box:focus { border-color: var(--p); background: #fff; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); }
        .btn-save { padding: 12px; background: var(--p); color: white; border: none; border-radius: 8px; font-weight: 800; cursor: pointer; margin-top: 10px; }
        
        .btn-icon-top { cursor: pointer; background: white; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 6px; font-weight: 600; font-size: 0.85rem; color: #1e293b; display: inline-flex; align-items: center; gap: 5px; transition: 0.2s; }
        .btn-icon-top:hover { background: #f1f5f9; }

        /* ENRICHMENT: CSS Form Dinamis */
        .custom-attr-row { flex-direction: row; gap: 10px; align-items: center; }
    `;
    document.head.appendChild(s);
};

export async function renderAssetManagement(containerId) {
    injectStyles();
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `<div class="am-app" id="am-app-root">Loading Data...</div>`;
    
    // Register globals
    window.openCategory = (id, name) => { appState.view = 'ITEMS'; appState.activeCategoryID = id; appState.activeCategoryName = name; renderRouter(); };
    window.goBack = () => { appState.view = 'CATEGORY'; appState.activeCategoryID = null; appState.activeCategoryName = null; renderRouter(); };
    window.previewItem = previewItem;
    window.deleteItem = deleteItem;
    window.saveEdit = saveEdit;
    window.closeModal = () => document.querySelector('.preview-overlay')?.remove();
    window.fixAssetPath = fixAssetPath;
    window.updateEditMetaUI = updateEditMetaUI;
    
    // ENRICHMENT globals
    window.togglePublish = togglePublish;
    window.addCustomField = addCustomField;

    await fetchData();
    renderRouter();
}

async function fetchData() {
    try {
        const { data: c } = await supabase.from('es_game_categories').select('*');
        masterCategories = c || [];

        // ENRICHMENT: Menarik kolom is_published
        const { data: i } = await supabase.from('es_game_items').select(`
            id, item_name, description, item_metadata, category_id, created_at, is_published,
            es_game_assets ( public_url, file_path, media_type )
        `).order('created_at', { ascending: false });
        rawData = i || [];
    } catch (e) {
        console.error("Gagal load data:", e);
    }
}

function renderRouter() {
    const root = document.getElementById('am-app-root');
    if (!root) return; 
    
    if(appState.view === 'CATEGORY') {
        root.innerHTML = `
            <div class="am-nav">
                <div class="am-title">📁 Galeri & Master Data</div>
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
        const catName = cat.category_name || cat.name || 'Unnamed';
        const itemCount = rawData.filter(x => x.category_id === cat.id).length;
        return `
            <div class="cat-card" onclick="window.openCategory('${cat.id}', '${catName}')">
                <div class="cat-icon">${cat.icon_url || '📁'}</div>
                <div class="cat-name">${catName}</div>
                <div class="cat-count">${itemCount} Item Terdaftar</div>
            </div>
        `;
    }).join('');
}

function renderItems() {
    const filtered = rawData.filter(x => x.category_id === appState.activeCategoryID);
    if(filtered.length === 0) return `<div style="grid-column: 1/-1; text-align:center; padding:50px; color:var(--slate);">Belum ada item di kategori ini.</div>`;

    return filtered.map(item => {
        const asset = item.es_game_assets && item.es_game_assets.length > 0 ? item.es_game_assets[0] : null;
        const imgUrl = asset ? asset.public_url : '';
        const isAudio = asset && asset.media_type === 'AUDIO';
        
        // HEALTH CHECKER LOGIC (DIKEMBALIKAN UTUH 100%)
        const isQuarantine = asset && (asset.file_path?.includes('quarantine/') || asset.public_url?.includes('quarantine/'));
        let healthBadge = '';
        if (isQuarantine) {
            healthBadge = `
                <div class="health-badge">
                    <div style="display:flex; align-items:center; gap:5px;">${ICONS.WARNING} STATUS: KARANTINA (BOM WAKTU)</div>
                    <button class="btn-fix" onclick="window.fixAssetPath('${item.id}', '${appState.activeCategoryName}')">📦 PINDAHKAN FISIK (FIX)</button>
                </div>
            `;
        }

        let metaText = '';
        if(item.item_metadata) {
            let metaObj = item.item_metadata;
            if (typeof metaObj === 'string') {
                try { metaObj = JSON.parse(metaObj); } catch(e) { metaObj = {}; }
            }
            
            metaText = Object.entries(metaObj)
                .filter(([k,v]) => k !== 'deskripsi' && v)
                .map(([k,v]) => `${k}: ${v}`).join(' | ');
        }

        // ENRICHMENT: Status Publikasi (Soft Delete)
        const isPub = item.is_published !== false; // Default true (tayang)
        const pubBadge = isPub ? `<div class="status-badge pub">🟢 LIVE</div>` : `<div class="status-badge drf">⚫ ARSIP</div>`;
        const pubIcon = isPub ? ICONS.EYE_OFF : ICONS.EYE;
        const pubText = isPub ? 'ARSIPKAN' : 'PUBLISH';
        const pubClass = isPub ? '' : 'publish';

        return `
            <div class="item-card ${isPub ? '' : 'draft'}" id="card-${item.id}">
                ${pubBadge}
                ${healthBadge}
                <div class="item-img-box">
                    ${!asset ? `<span style="color:var(--d); font-weight:bold;">NO IMG</span>` : 
                     (isAudio ? `<span style="font-size:3rem;">🎵</span>` : `<img src="${imgUrl}" loading="lazy">`)}
                </div>
                <div class="item-info">
                    <div class="item-name">${item.item_name}</div>
                    <div class="item-meta">${metaText || 'Tidak ada metadata'}</div>
                </div>
                <div class="item-actions">
                    <button class="btn-act" onclick="window.previewItem('${item.id}')">${ICONS.EDIT} EDIT</button>
                    <button class="btn-act ${pubClass}" onclick="window.togglePublish('${item.id}', ${isPub})">${pubIcon} ${pubText}</button>
                    <button class="btn-act danger" onclick="window.deleteItem('${item.id}')" title="Hapus Permanen">${ICONS.TRASH}</button>
                </div>
            </div>
        `;
    }).join('');
}

// --- SMART QUARANTINE RELOCATOR (DIKEMBALIKAN UTUH 100%) ---
async function fixAssetPath(itemId, catName) {
    try {
        const btn = document.querySelector(`#card-${itemId} .btn-fix`);
        if (btn) btn.innerText = "Memproses...";

        const item = rawData.find(x => x.id === itemId);
        const asset = item.es_game_assets[0];
        if(!asset || !asset.file_path) throw new Error("Path file tidak ditemukan di database.");

        const oldPath = asset.file_path;
        const baseFileName = oldPath.split('/').pop();
        const fileName = `${Date.now()}_${baseFileName}`; 
        const newPath = `production/${catName}/${fileName}`;

        console.log(`Pindah fisik: ${oldPath} -> ${newPath}`);

        const { error: moveErr } = await supabase.storage.from('general').move(oldPath, newPath);
        if (moveErr && !moveErr.message.includes('already exists')) throw moveErr;

        const { data: urlData } = supabase.storage.from('general').getPublicUrl(newPath);

        const { error: dbErr } = await supabase.from('es_game_assets')
            .update({ file_path: newPath, public_url: urlData.publicUrl })
            .eq('item_id', itemId);

        if(dbErr) throw dbErr;
        
        await supabase.from('es_quarantine_assets').delete().eq('target_item_id', itemId);

        await fetchData();
        renderRouter();

    } catch (e) {
        console.error(e);
        alert("Gagal memindahkan file: " + e.message);
        await fetchData(); renderRouter(); 
    }
}

// ENRICHMENT: Fungsi Soft-Delete
async function togglePublish(id, currentStatus) {
    try {
        const { error } = await supabase.from('es_game_items').update({ is_published: !currentStatus }).eq('id', id);
        if(error) throw error;
        await fetchData(); renderRouter();
    } catch (e) { alert("Gagal mengubah status publikasi: " + e.message); }
}

// --- DYNAMIC METADATA RENDERER ---
function updateEditMetaUI(categoryId, itemId) {
    const item = rawData.find(x => x.id === itemId);
    const cat = masterCategories.find(c => c.id === categoryId);
    if(!item || !cat) return;
    
    let metaObj = item.item_metadata || {};
    if (typeof metaObj === 'string') {
        try { metaObj = JSON.parse(metaObj); } catch(e) { metaObj = {}; }
    }
    
    // ENRICHMENT: AUTO-DISCOVERY + Custom Builder UI
    // Membaca semua keys yang sudah ada, atau memuat dari SCHEMA_MAP jika kosong
    let keysToRender = Object.keys(metaObj).filter(k => k.toLowerCase() !== 'deskripsi');
    if (keysToRender.length === 0) {
        const catName = cat.category_name || cat.name || 'Default';
        keysToRender = getFields(catName).map(f => f.toLowerCase());
    }
    
    const html = keysToRender.map(field => {
        const val = metaObj[field] || '';
        return `
            <div class="inp-grp custom-attr-row">
                <input type="text" class="inp-box attr-key" value="${field}" placeholder="Key" style="font-weight:bold; flex:1;">
                <input type="text" class="inp-box attr-val" value="${val}" placeholder="Nilai" style="flex:2;">
                <button class="btn-act danger" onclick="this.parentElement.remove()" style="min-width:auto; padding:0 10px;" title="Hapus Atribut">✖</button>
            </div>
        `;
    }).join('');
    
    const container = document.getElementById(`dynamic-meta-container-${itemId}`);
    if(container) {
        container.innerHTML = html + `
            <button class="btn-act" style="border: 1px dashed #cbd5e1; justify-content:center; margin-top:10px; font-weight:700; color:var(--p);" onclick="window.addCustomField(this.parentElement)">
                + Tambah Atribut Kustom
            </button>
        `;
    }
}

// ENRICHMENT: Fungsi Builder Atribut Dinamis
function addCustomField(container) {
    const btn = container.querySelector('button:last-child');
    const row = document.createElement('div');
    row.className = 'inp-grp custom-attr-row';
    row.innerHTML = `
        <input type="text" class="inp-box attr-key" placeholder="Key Baru" style="font-weight:bold; flex:1;">
        <input type="text" class="inp-box attr-val" placeholder="Nilai" style="flex:2;">
        <button class="btn-act danger" onclick="this.parentElement.remove()" style="min-width:auto; padding:0 10px;" title="Hapus Atribut">✖</button>
    `;
    container.insertBefore(row, btn);
}

function previewItem(id) {
    const item = rawData.find(x => x.id === id);
    if(!item) return;
    
    const asset = item.es_game_assets && item.es_game_assets[0] ? item.es_game_assets[0] : null;

    const overlay = document.createElement('div');
    overlay.className = 'preview-overlay';
    
    overlay.innerHTML = `
        <div class="preview-box">
            <div class="preview-header">
                <h3 style="margin:0; color:#1e293b; font-size:1.1rem;">Edit Metadata Aset</h3>
                <button class="btn-icon-top" onclick="window.closeModal()" style="border:none; color:var(--slate); font-size:1.2rem; padding:4px 8px;">✖</button>
            </div>
            <div class="preview-content">
                
                <div class="preview-img-thumbnail">
                    ${asset ? (asset.media_type==='AUDIO' ? '<h1 style="margin:0;">🎵</h1>' : `<img src="${asset.public_url}">`) : '<div style="font-weight:bold;color:var(--d);">NO IMG</div>'}
                </div>
                
                <div class="preview-form">
                    <div class="inp-grp">
                        <label>Nama Aset</label>
                        <input id="e-name" class="inp-box" style="font-weight:bold; color:var(--p);" value="${item.item_name}">
                    </div>
                    <div class="inp-grp">
                        <label>Kategori (Klasifikasi Modul)</label>
                        <select id="e-cat" class="inp-box" onchange="window.updateEditMetaUI(this.value, '${item.id}')">
                            ${masterCategories.map(c => {
                                const cName = c.category_name || c.name || 'Unnamed';
                                return `<option value="${c.id}" ${c.id === item.category_id ? 'selected' : ''}>${cName}</option>`;
                            }).join('')}
                        </select>
                    </div>
                    
                    <hr style="width:100%; border:0; border-top:1px dashed #cbd5e1; margin:10px 0;">
                    <label style="font-size: 0.8rem; font-weight: 700; color: var(--slate); text-transform: uppercase;">METADATA DINAMIS (KUNCI - NILAI)</label>
                    <div id="dynamic-meta-container-${item.id}" style="display:flex; flex-direction:column; gap:10px;"></div>
                    <hr style="width:100%; border:0; border-top:1px dashed #cbd5e1; margin:10px 0;">
                    
                    <div class="inp-grp">
                        <label>Deskripsi Tambahan</label>
                        <textarea id="e-desc" class="inp-box" rows="2">${item.description || ''}</textarea>
                    </div>
                    <button class="btn-save" onclick="window.saveEdit('${item.id}')">SIMPAN PERUBAHAN</button>
                </div>
            </div>
        </div>
    `;
    
    const appRoot = document.getElementById('am-app-root');
    if(appRoot) {
        appRoot.appendChild(overlay);
        window.updateEditMetaUI(item.category_id, item.id);
    }
}

async function saveEdit(id) {
    try {
        const btn = document.querySelector('.btn-save');
        btn.innerText = "Menyimpan...";
        btn.disabled = true;

        const newName = document.getElementById('e-name').value;
        const newCatId = document.getElementById('e-cat').value;
        const newDesc = document.getElementById('e-desc').value;
        
        // ENRICHMENT: Menyusun Raw JSONB dari Builder Dinamis
        const meta = { deskripsi: newDesc };
        document.querySelectorAll(`#dynamic-meta-container-${id} .custom-attr-row`).forEach(row => {
            const k = row.querySelector('.attr-key').value.trim().toLowerCase();
            const v = row.querySelector('.attr-val').value.trim();
            if(k && v) meta[k] = v; // Hanya masukkan jika key dan value tidak kosong
        });

        // ENRICHMENT FIX: Kirim objek meta utuh tanpa JSON.stringify!
        const { error } = await supabase.from('es_game_items').update({
            item_name: newName,
            category_id: newCatId,
            item_metadata: meta, 
            description: newDesc
        }).eq('id', id);

        if(error) throw error;

        window.closeModal();
        await fetchData(); 
        renderRouter(); 
    } catch (e) {
        alert("Gagal update: " + e.message);
        const btn = document.querySelector('.btn-save');
        if(btn) { btn.innerText = "SIMPAN METADATA"; btn.disabled = false; }
    }
}

async function deleteItem(id) {
    // ENRICHMENT: Peringatan Ekstrem untuk melindungi Rekam Medis
    if(!confirm("PERINGATAN KRITIS:\nHapus permanen hanya boleh dilakukan jika aset ini BELUM PERNAH ditarik ke aplikasi pasien!\n\nJika aset ini sudah pernah dimainkan, memusnahkannya akan MERUSAK REKAM MEDIS pasien terkait.\n\nSangat disarankan menekan tombol [ARSIPKAN] untuk menyembunyikan aset dengan aman.\n\nTetap Lanjutkan Hapus Permanen?")) return;
    
    try {
        const item = rawData.find(x => x.id === id);
        const asset = item.es_game_assets && item.es_game_assets[0] ? item.es_game_assets[0] : null;
        
        if (asset && asset.file_path) {
            await supabase.storage.from('general').remove([asset.file_path]);
        }
        
        const { error } = await supabase.from('es_game_items').delete().eq('id', id);
        if(error) throw error;

        await fetchData();
        renderRouter();
    } catch (e) {
        alert("Gagal menghapus! (Mungkin aset ini terkunci oleh relasi Rekam Medis): " + e.message);
    }
}