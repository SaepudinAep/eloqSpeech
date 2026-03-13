// audio_management.js - V1.2 (SMART BINDING & ANTI-TYPO EDITION)
// Features: Audio Schema Editor, Functional Meta Mapper, Native Playback, Autocomplete Datalist.
// Rule: STRICT ENRICHMENT ONLY. Adjusted for native public_url in es_game_audios.

import { supabase } from '../config.js';

let rawData = [];
let masterCategories = [];
let masterItems = [];
let appState = {
    view: 'CATEGORY', // 'CATEGORY' | 'AUDIOS'
    activeCategoryID: null,
    activeCategoryName: null,
    activeFilter: 'ALL'
};

const ICONS = {
    EDIT: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
    TRASH: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
    BACK: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>`,
    WARNING: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
    PLUS: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
    GEAR: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
    PLAY: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`
};

const injectStyles = () => {
    if (document.getElementById('am-audio-styles')) return;
    const s = document.createElement('style');
    s.id = 'am-audio-styles';
    s.innerHTML = `
        .am-app { --p: #8b5cf6; --s: #10b981; --d: #ef4444; --slate: #64748b; --bg: #f8fafc; }
        .am-app * { box-sizing: border-box; }
        .am-app { font-family: 'Inter', sans-serif; background: #fff; height: 100vh; display: flex; flex-direction: column; position: relative; }
        .am-nav { padding: 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #fff; }
        .am-title { font-size: 1.2rem; font-weight: 800; color: #1e293b; display: flex; align-items: center; gap: 10px; }
        .am-body { flex: 1; overflow-y: auto; padding: 20px; background: var(--bg); }
        
        .grid-cats { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; }
        .grid-items { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
        
        .cat-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; cursor: pointer; transition: 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.02); position: relative; }
        .cat-card:hover { border-color: var(--p); transform: translateY(-3px); box-shadow: 0 10px 15px -3px rgba(139,92,246,0.1); }
        .cat-icon { font-size: 2.5rem; margin-bottom: 10px; }
        .cat-name { font-weight: 700; color: #1e293b; }
        .cat-count { font-size: 0.85rem; color: var(--slate); margin-top: 5px; }
        .btn-edit-cat { position: absolute; top: 10px; right: 10px; background: #f1f5f9; border: none; padding: 8px; border-radius: 6px; color: var(--slate); cursor: pointer; transition: 0.2s; }
        .btn-edit-cat:hover { background: var(--p); color: white; }

        .item-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; transition: 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.02); position: relative;}
        .item-card.draft { opacity: 0.6; filter: grayscale(60%); border: 2px dashed #cbd5e1; }
        .item-card:hover { border-color: #cbd5e1; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .item-img-box { width: 100%; padding: 20px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 10px;}
        .item-info { padding: 15px; flex: 1; border-top: 1px solid #e2e8f0; }
        .item-name { font-weight: 800; color: #1e293b; font-size: 1.1rem; margin-bottom: 5px; }
        .item-meta { font-size: 0.8rem; color: var(--slate); line-height: 1.4; display: flex; flex-direction: column; gap: 4px;}
        .meta-tag { background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: 600; color: #334155; font-size: 0.75rem; display: inline-block;}
        .item-actions { display: flex; flex-wrap: wrap; border-top: 1px solid #e2e8f0; background: #fafafa; }
        .btn-act { flex: 1; min-width: 30%; padding: 10px; border: none; background: none; cursor: pointer; font-weight: 600; font-size: 0.8rem; display: flex; align-items: center; justify-content: center; gap: 5px; color: var(--slate); border-right: 1px solid #e2e8f0; transition: 0.2s; }
        .btn-act:last-child { border-right: none; }
        .btn-act:hover { background: #f1f5f9; color: var(--p); }
        .btn-act.danger { color: #fca5a5; }
        .btn-act.danger:hover { background: #fef2f2; color: var(--d); }

        .health-badge { background: #fef2f2; color: var(--d); padding: 8px 12px; font-size: 0.75rem; font-weight: 700; display: flex; flex-direction: column; gap: 8px; border-bottom: 1px solid #fee2e2; }
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
        .btn-primary:hover { background: #7c3aed; }

        .schema-row { display: flex; gap: 10px; align-items: center; margin-bottom: 10px; background: #f1f5f9; padding: 10px; border-radius: 8px; border-left: 4px solid var(--p); }
        audio { width: 100%; height: 40px; outline: none; }
    `;
    document.head.appendChild(s);
};

export async function renderAudioManagement(containerId) {
    injectStyles();
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `<div class="am-app" id="am-app-root"><div style="padding:40px;text-align:center;">Loading Audio Logic...</div></div>`;
    
    window.openCategory = (id, name) => { appState.view = 'AUDIOS'; appState.activeCategoryID = id; appState.activeCategoryName = name; renderRouter(); };
    window.goBack = () => { appState.view = 'CATEGORY'; appState.activeCategoryID = null; appState.activeCategoryName = null; renderRouter(); };
    window.closeModal = () => document.querySelector('.preview-overlay')?.remove();
    
    window.openCategoryModal = openCategoryModal;
    window.saveCategorySchema = saveCategorySchema;
    window.addSchemaRow = addSchemaRow;
    window.removeSchemaRow = removeSchemaRow;

    window.openAudioModal = openAudioModal;
    window.saveAudioMeta = saveAudioMeta;
    window.deleteAudio = deleteAudio;
    window.toggleAudioPublish = toggleAudioPublish;

    await fetchData();
    renderRouter();
}

async function fetchData() {
    try {
        const { data: c } = await supabase.from('es_game_categories').select('id, name, description, audio_metadata_schema').order('name');
        masterCategories = (c || []).map(cat => {
            let schemaFields = [];
            if (cat.audio_metadata_schema) {
                schemaFields = Array.isArray(cat.audio_metadata_schema) ? cat.audio_metadata_schema : (cat.audio_metadata_schema.fields || []);
            }
            return { ...cat, schemaFields };
        });

        const { data: a, error: aErr } = await supabase.from('es_game_audios').select(`
            id, category_id, item_id, audio_metadata, created_at, public_url, file_path
        `).order('created_at', { ascending: false });
        
        if (aErr) console.error("Error fetching audios:", aErr);
        
        rawData = a || [];

        // Enrichment: Fetching item_metadata for anti-typo target values
        const { data: i } = await supabase.from('es_game_items').select('id, item_name, category_id, item_metadata');
        masterItems = i || [];
    } catch (e) { 
        console.error("Gagal load data:", e); 
        document.getElementById('am-app-root').innerHTML = `<div style="padding:40px;text-align:center;color:red;">Gagal Load Data. Cek Console.</div>`;
    }
}

function renderRouter() {
    const root = document.getElementById('am-app-root');
    if (!root) return; 
    
    if(appState.view === 'CATEGORY') {
        root.innerHTML = `
            <div class="am-nav">
                <div class="am-title">🎵 Manajemen Logika Audio Klinis</div>
            </div>
            <div class="am-body"><div class="grid-cats">${renderCategories()}</div></div>
        `;
    } else {
        root.innerHTML = `
            <div class="am-nav">
                <div class="am-title">
                    <button class="btn-icon-top" onclick="window.goBack()">${ICONS.BACK} Kategori</button>
                    <span style="margin-left:10px;">/ ${appState.activeCategoryName} (Audio)</span>
                </div>
            </div>
            <div class="am-body"><div class="grid-items">${renderAudios()}</div></div>
        `;
    }
}

function renderCategories() {
    return masterCategories.map(cat => {
        const catName = cat.name || 'Unnamed';
        const audioCount = rawData.filter(x => x.category_id === cat.id).length;
        // Enrichment: Fix Category Counter to only count custom attributes
        const customCount = cat.schemaFields.filter(f => f.key !== 'functional_type' && f.key !== 'syllable_count').length;
        return `
            <div class="cat-card">
                <button class="btn-edit-cat" onclick="window.openCategoryModal('${cat.id}')" title="Edit Skema Audio">${ICONS.GEAR}</button>
                <div onclick="window.openCategory('${cat.id}', '${catName}')">
                    <div class="cat-icon">🎧</div>
                    <div class="cat-name">${catName}</div>
                    <div class="cat-count">${audioCount} Audio | ${customCount} Atribut Kustom</div>
                </div>
            </div>
        `;
    }).join('');
}

function openCategoryModal(id) {
    const cat = masterCategories.find(c => c.id === id);
    if(!cat) return;

    const overlay = document.createElement('div');
    overlay.className = 'preview-overlay';
    overlay.innerHTML = `
        <div class="preview-box">
            <div class="preview-header">
                <h3 style="margin:0;">Skema Audio: ${cat.name}</h3>
                <button class="btn-icon-top" onclick="window.closeModal()" style="border:none;">✖</button>
            </div>
            <div class="preview-content">
                <p style="font-size:0.85rem; color:var(--slate); margin-top:0;">Tentukan atribut apa saja yang bisa dijadikan target instruksi oleh audio di kategori ini.</p>
                <label style="font-size: 0.8rem; font-weight: 700; color: var(--p); text-transform: uppercase;">SKEMA AUDIO KLINIS</label>
                
                <div id="schema-container" style="margin-top:10px;">
                    ${cat.schemaFields.filter(f => f.key !== 'functional_type' && f.key !== 'syllable_count').map(f => `
                        <div class="schema-row">
                            <input type="text" class="inp-box schema-key" value="${f.key || f}" placeholder="Key (misal: habitat)" style="flex:1;">
                            <button class="btn-act danger" onclick="window.removeSchemaRow(this)" style="min-width:auto; padding:8px;">✖</button>
                        </div>
                    `).join('')}
                </div>
                <button class="btn-act" style="border: 1px dashed var(--p); color:var(--p); margin-bottom:20px;" onclick="window.addSchemaRow()">+ Tambah Atribut Target</button>

                <button class="btn-save" onclick="window.saveCategorySchema('${id}')">SIMPAN SKEMA AUDIO</button>
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
        <input type="text" class="inp-box schema-key" placeholder="Key (misal: suara_hewan)" style="flex:1;">
        <button class="btn-act danger" onclick="window.removeSchemaRow(this)" style="min-width:auto; padding:8px;">✖</button>
    `;
    container.appendChild(row);
}

function removeSchemaRow(btn) { btn.parentElement.remove(); }

async function saveCategorySchema(id) {
    const schemaInputs = document.querySelectorAll('.schema-key');
    let schemaFields = Array.from(schemaInputs)
        .map(inp => inp.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'))
        .filter(val => val !== '')
        .map(key => ({ key, type: 'text' }));

    // Auto-inject mandatory clinical fields
    schemaFields.unshift({ key: 'functional_type', options: ['LABELING', 'SEMANTIC_FEATURE', 'PHONEMIC_CUE', 'ACTION_SEQUENCING'] });
    schemaFields.unshift({ key: 'syllable_count', type: 'number' });

    try {
        await supabase.from('es_game_categories').update({ audio_metadata_schema: schemaFields }).eq('id', id);
        window.closeModal();
        await fetchData(); renderRouter();
    } catch(e) { alert("Gagal menyimpan skema: " + e.message); }
}

function renderAudios() {
    const filtered = rawData.filter(x => x.category_id === appState.activeCategoryID);
    if(filtered.length === 0) return `<div style="grid-column: 1/-1; text-align:center; padding:50px; color:var(--slate);">Belum ada audio di kategori ini.</div>`;

    return filtered.map(audio => {
        const fileUrl = audio.public_url || '';
        const isQuarantine = (audio.file_path || '').includes('quarantine/');
        
        let healthBadge = isQuarantine ? `<div class="health-badge">${ICONS.WARNING} STATUS: KARANTINA (PENDING MAPPING)</div>` : '';
        const isPub = true; // Placeholder, column doesn't exist in DB yet
        const pubBadge = isPub ? `<div class="status-badge pub">🟢 LIVE</div>` : `<div class="status-badge drf">⚫ ARSIP</div>`;

        let metaObj = audio.audio_metadata || {};
        let funcType = metaObj.functional_type || 'UNMAPPED';
        let relItem = audio.item_id ? masterItems.find(i => i.id === audio.item_id)?.item_name : 'General (Semua Item)';

        return `
            <div class="item-card ${isPub ? '' : 'draft'}">
                ${pubBadge} ${healthBadge}
                <div class="item-img-box">
                    <span style="font-size:2rem; margin-bottom:5px;">🎧</span>
                    ${fileUrl ? `<audio controls src="${fileUrl}"></audio>` : '<span style="color:var(--d)">Missing File</span>'}
                </div>
                <div class="item-info">
                    <div class="item-meta">
                        <div><span class="meta-tag" style="background:var(--p); color:white;">${funcType}</span></div>
                        <div><strong>Target:</strong> ${relItem}</div>
                        ${metaObj.target_attr ? `<div><strong>Map:</strong> ${metaObj.target_attr} = ${metaObj.target_val || '?'}</div>` : ''}
                        ${metaObj.syllable_count ? `<div><strong>Suku Kata:</strong> ${metaObj.syllable_count}</div>` : ''}
                    </div>
                </div>
                <div class="item-actions">
                    <button class="btn-act" onclick="window.openAudioModal('${audio.id}')">${ICONS.EDIT} Meta Studio</button>
                    <button class="btn-act ${isPub ? 'danger' : 'publish'}" onclick="window.toggleAudioPublish('${audio.id}', ${isPub})">${isPub ? 'Arsip' : 'Publish'}</button>
                </div>
            </div>
        `;
    }).join('');
}

function openAudioModal(id) {
    const audio = rawData.find(a => a.id === id);
    if(!audio) return;
    const cat = masterCategories.find(c => c.id === audio.category_id);
    const meta = audio.audio_metadata || {};
    const itemsInCat = masterItems.filter(i => i.category_id === audio.category_id);
    const fileUrl = audio.public_url || '';

    // Enrichment: Resolve Current Item Name for Autocomplete
    let currentItemName = '';
    if(audio.item_id) {
        const fItem = itemsInCat.find(i => i.id === audio.item_id);
        if(fItem) currentItemName = fItem.item_name;
    }

    // Enrichment: Extract unique target values for Autocomplete
    let uniqueTargetVals = new Set();
    itemsInCat.forEach(item => {
        if(item.item_metadata) {
            Object.values(item.item_metadata).forEach(val => {
                if(typeof val === 'string' && val.trim() !== '') {
                    uniqueTargetVals.add(val.trim());
                }
            });
        }
    });

    const overlay = document.createElement('div');
    overlay.className = 'preview-overlay';
    overlay.innerHTML = `
        <div class="preview-box">
            <div class="preview-header">
                <h3 style="margin:0;">Logic Studio: Audio Setup</h3>
                <button class="btn-icon-top" onclick="window.closeModal()" style="border:none;">✖</button>
            </div>
            <div class="preview-content">
                ${fileUrl ? `<audio controls src="${fileUrl}" style="margin-bottom:15px;"></audio>` : ''}
                
                <div class="inp-grp">
                    <label>Fungsi Klinis (Functional Type)</label>
                    <select id="am-func-type" class="inp-box">
                        <option value="LABELING" ${meta.functional_type === 'LABELING' ? 'selected' : ''}>Labeling (Nama Benda)</option>
                        <option value="SEMANTIC_FEATURE" ${meta.functional_type === 'SEMANTIC_FEATURE' ? 'selected' : ''}>Semantic Feature (Deskripsi/Clue)</option>
                        <option value="PHONEMIC_CUE" ${meta.functional_type === 'PHONEMIC_CUE' ? 'selected' : ''}>Phonemic Cue (Bantuan Suara)</option>
                        <option value="ACTION_SEQUENCING" ${meta.functional_type === 'ACTION_SEQUENCING' ? 'selected' : ''}>Action Sequencing (Urutan)</option>
                    </select>
                </div>

                <div class="inp-grp">
                    <label>Keterikatan Item (Binding)</label>
                    <input type="text" id="am-item-bind-text" class="inp-box" list="dl-items" placeholder="Ketik nama item (kosongkan untuk GENERAL)" value="${currentItemName}">
                    <datalist id="dl-items">
                        ${itemsInCat.map(i => `<option value="${i.item_name}">`).join('')}
                    </datalist>
                </div>

                <div class="inp-grp">
                    <label>Syllable Count (Jumlah Suku Kata)</label>
                    <input type="number" id="am-syllable" class="inp-box" value="${meta.syllable_count || 0}" min="0">
                </div>

                <hr style="border:0; border-top:1px dashed #cbd5e1; margin:15px 0;">
                <label style="font-size: 0.8rem; font-weight: 700; color: var(--p); text-transform: uppercase;">RELATIONAL MAPPING TARGET</label>
                
                <div class="inp-grp" style="margin-top:10px;">
                    <label>Target Atribut (Berdasarkan Skema)</label>
                    <select id="am-target-attr" class="inp-box">
                        <option value="">-- Tidak Ada Target --</option>
                        ${cat.schemaFields.filter(f => f.key !== 'functional_type' && f.key !== 'syllable_count').map(f => 
                            `<option value="${f.key || f}" ${meta.target_attr === (f.key || f) ? 'selected' : ''}>${f.key || f}</option>`
                        ).join('')}
                    </select>
                </div>

                <div class="inp-grp">
                    <label>Nilai Atribut yang Dicari (Target Value)</label>
                    <input type="text" id="am-target-val" class="inp-box" list="dl-target-vals" value="${meta.target_val || ''}" placeholder="Ketik atau pilih nilai (misal: Air)">
                    <datalist id="dl-target-vals">
                        ${Array.from(uniqueTargetVals).map(v => `<option value="${v}">`).join('')}
                    </datalist>
                </div>

                <div style="display:flex; gap:10px; margin-top:20px;">
                    <button class="btn-act danger" style="background:#fef2f2; border:1px solid #fecaca; padding:12px; border-radius:8px;" onclick="window.deleteAudio('${id}')">${ICONS.TRASH}</button>
                    <button class="btn-save" style="flex:1; margin:0;" onclick="window.saveAudioMeta('${id}')">SIMPAN LOGIKA KLINIS</button>
                </div>
            </div>
        </div>
    `;
    document.getElementById('am-app-root').appendChild(overlay);
}

async function saveAudioMeta(id) {
    const funcType = document.getElementById('am-func-type').value;
    const itemBindText = document.getElementById('am-item-bind-text').value.trim();
    const syllable = parseInt(document.getElementById('am-syllable').value) || 0;
    const targetAttr = document.getElementById('am-target-attr').value;
    const targetVal = document.getElementById('am-target-val').value.trim();

    // Enrichment: Resolve Typed Name to UUID
    let finalItemId = null;
    if(itemBindText !== '') {
        const foundItem = masterItems.find(i => i.item_name.toLowerCase() === itemBindText.toLowerCase());
        if(foundItem) {
            finalItemId = foundItem.id;
        } else {
            alert("Item tidak ditemukan. Pastikan memilih dari daftar atau kosongkan untuk General.");
            return;
        }
    }

    let newMeta = { functional_type: funcType, syllable_count: syllable };
    if(targetAttr && targetVal) {
        newMeta.target_attr = targetAttr;
        newMeta.target_val = targetVal;
    }

    const payload = {
        item_id: finalItemId,
        audio_metadata: newMeta
    };

    try {
        await supabase.from('es_game_audios').update(payload).eq('id', id);
        window.closeModal();
        await fetchData(); renderRouter();
    } catch(e) { alert("Gagal menyimpan metadata: " + e.message); }
}

async function toggleAudioPublish(id, currentStatus) {
    alert("Maaf Pak, tabel es_game_audios belum memiliki kolom 'is_published'. Anda perlu menambahkannya ke database terlebih dahulu sebelum bisa melakukan Arsip/Publish.");
}

async function deleteAudio(id) {
    if(!confirm("Yakin hapus referensi audio ini? (File fisik di storage mungkin perlu dihapus manual)")) return;
    try {
        await supabase.from('es_game_audios').delete().eq('id', id);
        window.closeModal();
        await fetchData(); renderRouter();
    } catch(e) { alert("Gagal hapus: " + e.message); }
}