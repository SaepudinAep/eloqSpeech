// audio_management.js - V2.0 (SPREADSHEET & INLINE BATCH EDITOR EDITION)
// Features: Data Grid UI, Inline Auto-Save, Health Indicator, Audio Schema Editor, Native Playback.
// Rule: STRICT ENRICHMENT ONLY. NO CLEANING.

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
    PLAY: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`,
    SAVE: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>`
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

        /* Enrichment: Spreadsheet Styles */
        .am-table-container { width: 100%; overflow-x: auto; background: #fff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        .am-table { width: 100%; border-collapse: collapse; min-width: 1000px; }
        .am-th { background: #f8fafc; padding: 12px 15px; text-align: left; font-size: 11px; color: var(--slate); font-weight: 800; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; white-space: nowrap; }
        .am-td { padding: 8px 15px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
        .am-tr { transition: background-color 0.2s; }
        .am-tr:hover { background: #f1f5f9; }
        .inline-inp { width: 100%; border: 1px solid transparent; background: transparent; padding: 6px 8px; border-radius: 6px; font-size: 13px; outline: none; transition: 0.2s; color: #1e293b; font-family: 'Inter', sans-serif; }
        .inline-inp:hover { border-color: #cbd5e1; background: #fff; }
        .inline-inp:focus { border-color: var(--p); background: #fff; box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.1); }
        .inline-sel { width: 100%; border: 1px solid transparent; background: transparent; padding: 6px 8px; border-radius: 6px; font-size: 13px; outline: none; cursor: pointer; font-weight: 600; color: var(--p); }
        .inline-sel:hover { border-color: #cbd5e1; background: #fff; }
        
        .health-dot { width: 12px; height: 12px; border-radius: 50%; display: inline-block; cursor: help; }
        .health-green { background: var(--s); box-shadow: 0 0 5px var(--s); }
        .health-red { background: var(--d); box-shadow: 0 0 5px var(--d); animation: pulse-red 2s infinite; }
        .health-yellow { background: #eab308; box-shadow: 0 0 5px #eab308; }
        @keyframes pulse-red { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
        
        .compact-audio { height: 30px; width: 130px; }
        .btn-inline-save { background: #f8fafc; border: 1px solid #cbd5e1; padding: 6px 10px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--slate); transition: 0.2s; }
        .btn-inline-save:hover { background: var(--s); color: white; border-color: var(--s); }
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
    
    // Enrichment: Inline Save Action
    window.inlineSaveAudio = inlineSaveAudio;

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

        // Fetching item_metadata for anti-typo target values
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
                    <span style="margin-left:10px;">/ ${appState.activeCategoryName} (Mode Batch Edit)</span>
                </div>
            </div>
            <div class="am-body">${renderAudiosSpreadsheet()}</div>
        `;
    }
}

function renderCategories() {
    return masterCategories.map(cat => {
        const catName = cat.name || 'Unnamed';
        const audioCount = rawData.filter(x => x.category_id === cat.id).length;
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

    schemaFields.unshift({ key: 'functional_type', options: ['LABELING', 'SEMANTIC_FEATURE', 'PHONEMIC_CUE', 'ACTION_SEQUENCING', 'IDENTIFICATION_PROMPT', 'SOUND_RECOGNITION'] });
    schemaFields.unshift({ key: 'syllable_count', type: 'number' });

    try {
        await supabase.from('es_game_categories').update({ audio_metadata_schema: schemaFields }).eq('id', id);
        window.closeModal();
        await fetchData(); renderRouter();
    } catch(e) { alert("Gagal menyimpan skema: " + e.message); }
}

// Enrichment: Health Check Logic
function getHealthStatus(metaObj, itemId) {
    const func = metaObj.functional_type || 'UNMAPPED';
    if (func === 'UNMAPPED') return { cls: 'health-yellow', msg: 'Menunggu Pemetaan' };
    
    if (['LABELING', 'SOUND_RECOGNITION'].includes(func)) {
        if (!itemId) return { cls: 'health-red', msg: 'Wajib di-binding ke Item Spesifik' };
    }
    
    if (func === 'SEMANTIC_FEATURE') {
        if (!metaObj.target_attr || !metaObj.target_val) return { cls: 'health-red', msg: 'Target Atribut/Nilai Kosong' };
    }
    
    return { cls: 'health-green', msg: 'Valid & Siap Digunakan' };
}

// Enrichment: Spreadsheet UI Generator
function renderAudiosSpreadsheet() {
    const filtered = rawData.filter(x => x.category_id === appState.activeCategoryID);
    if(filtered.length === 0) return `<div style="text-align:center; padding:50px; color:var(--slate);">Belum ada audio di kategori ini.</div>`;

    const itemsInCat = masterItems.filter(i => i.category_id === appState.activeCategoryID);
    const cat = masterCategories.find(c => c.id === appState.activeCategoryID);
    
    let uniqueTargetVals = new Set();
    itemsInCat.forEach(item => {
        if(item.item_metadata) {
            Object.values(item.item_metadata).forEach(val => {
                if(typeof val === 'string' && val.trim() !== '') uniqueTargetVals.add(val.trim());
            });
        }
    });

    const attrOptions = cat.schemaFields
        .filter(f => f.key !== 'functional_type' && f.key !== 'syllable_count')
        .map(f => `<option value="${f.key || f}">${f.key || f}</option>`).join('');

    let html = `
        <datalist id="dl-items-table">
            ${itemsInCat.map(i => `<option value="${i.item_name}">`).join('')}
        </datalist>
        <datalist id="dl-target-vals-table">
            ${Array.from(uniqueTargetVals).map(v => `<option value="${v}">`).join('')}
        </datalist>

        <div class="am-table-container">
            <table class="am-table">
                <thead>
                    <tr>
                        <th class="am-th" style="width: 50px; text-align:center;">St</th>
                        <th class="am-th" style="width: 150px;">Audio</th>
                        <th class="am-th" style="width: 180px;">Tipe Fungsional</th>
                        <th class="am-th" style="width: 180px;">Item Binding</th>
                        <th class="am-th" style="width: 150px;">Target Attr</th>
                        <th class="am-th" style="width: 150px;">Target Value</th>
                        <th class="am-th" style="width: 80px;">Suku Kata</th>
                        <th class="am-th" style="width: 100px; text-align:center;">Aksi</th>
                    </tr>
                </thead>
                <tbody>
    `;

    filtered.forEach(audio => {
        const fileUrl = audio.public_url || '';
        let metaObj = audio.audio_metadata || {};
        let funcType = metaObj.functional_type || 'UNMAPPED';
        
        let currentItemName = '';
        if(audio.item_id) {
            const fItem = itemsInCat.find(i => i.id === audio.item_id);
            if(fItem) currentItemName = fItem.item_name;
        }

        const health = getHealthStatus(metaObj, audio.item_id);

        html += `
            <tr class="am-tr" id="row-${audio.id}">
                <td class="am-td" style="text-align:center;">
                    <span class="health-dot ${health.cls}" title="${health.msg}"></span>
                </td>
                <td class="am-td">
                    ${fileUrl ? `<audio controls class="compact-audio" src="${fileUrl}"></audio>` : '<span style="color:red">Missing</span>'}
                </td>
                <td class="am-td">
                    <select id="func-${audio.id}" class="inline-sel" onchange="window.inlineSaveAudio('${audio.id}')">
                        <option value="UNMAPPED" ${funcType === 'UNMAPPED' ? 'selected' : ''}>-- Pilih Tipe --</option>
                        <option value="LABELING" ${funcType === 'LABELING' ? 'selected' : ''}>LABELING</option>
                        <option value="SEMANTIC_FEATURE" ${funcType === 'SEMANTIC_FEATURE' ? 'selected' : ''}>SEMANTIC_FEATURE</option>
                        <option value="SOUND_RECOGNITION" ${funcType === 'SOUND_RECOGNITION' ? 'selected' : ''}>SOUND_RECOGNITION</option>
                        <option value="IDENTIFICATION_PROMPT" ${funcType === 'IDENTIFICATION_PROMPT' ? 'selected' : ''}>IDENTIFICATION_PROMPT</option>
                        <option value="PHONEMIC_CUE" ${funcType === 'PHONEMIC_CUE' ? 'selected' : ''}>PHONEMIC_CUE</option>
                        <option value="ACTION_SEQUENCING" ${funcType === 'ACTION_SEQUENCING' ? 'selected' : ''}>ACTION_SEQUENCING</option>
                    </select>
                </td>
                <td class="am-td">
                    <input type="text" id="item-${audio.id}" class="inline-inp" list="dl-items-table" value="${currentItemName}" placeholder="Ketik Item / General" onchange="window.inlineSaveAudio('${audio.id}')">
                </td>
                <td class="am-td">
                    <select id="attr-${audio.id}" class="inline-sel" style="color:#1e293b;" onchange="window.inlineSaveAudio('${audio.id}')">
                        <option value="">-- Kosong --</option>
                        ${attrOptions.replace(`value="${metaObj.target_attr}"`, `value="${metaObj.target_attr}" selected`)}
                    </select>
                </td>
                <td class="am-td">
                    <input type="text" id="val-${audio.id}" class="inline-inp" list="dl-target-vals-table" value="${metaObj.target_val || ''}" placeholder="Nilai (Opsional)" onchange="window.inlineSaveAudio('${audio.id}')">
                </td>
                <td class="am-td">
                    <input type="number" id="syl-${audio.id}" class="inline-inp" value="${metaObj.syllable_count || 0}" min="0" onchange="window.inlineSaveAudio('${audio.id}')">
                </td>
                <td class="am-td" style="display:flex; gap:5px; justify-content:center;">
                    <button class="btn-inline-save" onclick="window.inlineSaveAudio('${audio.id}')" title="Simpan Baris">${ICONS.SAVE}</button>
                    <button class="btn-inline-save" onclick="window.openAudioModal('${audio.id}')" title="Advanced Editor">${ICONS.GEAR}</button>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table></div>`;
    return html;
}

// Enrichment: Inline Auto-Save System
async function inlineSaveAudio(id) {
    const row = document.getElementById(`row-${id}`);
    if(row) row.style.opacity = '0.6';

    const funcType = document.getElementById(`func-${id}`).value;
    const itemName = document.getElementById(`item-${id}`).value.trim();
    const targetAttr = document.getElementById(`attr-${id}`).value;
    const targetVal = document.getElementById(`val-${id}`).value.trim();
    const syllable = parseInt(document.getElementById(`syl-${id}`).value) || 0;

    let finalItemId = null;
    if(itemName !== '') {
        const foundItem = masterItems.find(i => i.item_name.toLowerCase() === itemName.toLowerCase() && i.category_id === appState.activeCategoryID);
        if(foundItem) finalItemId = foundItem.id;
    }

    let newMeta = { functional_type: funcType, syllable_count: syllable };
    if(targetAttr && targetVal) {
        newMeta.target_attr = targetAttr;
        newMeta.target_val = targetVal;
    }

    const payload = { item_id: finalItemId, audio_metadata: newMeta };

    try {
        await supabase.from('es_game_audios').update(payload).eq('id', id);
        
        // Update local state without full reload
        const audioIdx = rawData.findIndex(a => a.id === id);
        if(audioIdx > -1) {
            rawData[audioIdx].item_id = finalItemId;
            rawData[audioIdx].audio_metadata = newMeta;
        }

        // Re-render to update health dot accurately
        renderRouter(); 
        
        const newRow = document.getElementById(`row-${id}`);
        if(newRow) {
            newRow.style.backgroundColor = '#ecfdf5'; // Flash Green
            setTimeout(() => newRow.style.backgroundColor = '', 800);
        }

    } catch(e) { 
        alert("Gagal update data: " + e.message); 
        if(row) row.style.opacity = '1';
    }
}

// Keeping Original Modal for Advanced Edge Cases
function openAudioModal(id) {
    const audio = rawData.find(a => a.id === id);
    if(!audio) return;
    const cat = masterCategories.find(c => c.id === audio.category_id);
    const meta = audio.audio_metadata || {};
    const itemsInCat = masterItems.filter(i => i.category_id === audio.category_id);
    const fileUrl = audio.public_url || '';

    let currentItemName = '';
    if(audio.item_id) {
        const fItem = itemsInCat.find(i => i.id === audio.item_id);
        if(fItem) currentItemName = fItem.item_name;
    }

    let uniqueTargetVals = new Set();
    itemsInCat.forEach(item => {
        if(item.item_metadata) {
            Object.values(item.item_metadata).forEach(val => {
                if(typeof val === 'string' && val.trim() !== '') uniqueTargetVals.add(val.trim());
            });
        }
    });

    const overlay = document.createElement('div');
    overlay.className = 'preview-overlay';
    overlay.innerHTML = `
        <div class="preview-box">
            <div class="preview-header">
                <h3 style="margin:0;">Advanced Audio Studio</h3>
                <button class="btn-icon-top" onclick="window.closeModal()" style="border:none;">✖</button>
            </div>
            <div class="preview-content">
                ${fileUrl ? `<audio controls src="${fileUrl}" style="margin-bottom:15px;"></audio>` : ''}
                
                <div class="inp-grp">
                    <label>Fungsi Klinis</label>
                    <select id="am-func-type" class="inp-box">
                        <option value="LABELING" ${meta.functional_type === 'LABELING' ? 'selected' : ''}>Labeling</option>
                        <option value="SEMANTIC_FEATURE" ${meta.functional_type === 'SEMANTIC_FEATURE' ? 'selected' : ''}>Semantic Feature</option>
                        <option value="SOUND_RECOGNITION" ${meta.functional_type === 'SOUND_RECOGNITION' ? 'selected' : ''}>Sound Recognition</option>
                        <option value="IDENTIFICATION_PROMPT" ${meta.functional_type === 'IDENTIFICATION_PROMPT' ? 'selected' : ''}>Identification Prompt</option>
                        <option value="PHONEMIC_CUE" ${meta.functional_type === 'PHONEMIC_CUE' ? 'selected' : ''}>Phonemic Cue</option>
                    </select>
                </div>

                <div class="inp-grp">
                    <label>Keterikatan Item (Binding)</label>
                    <input type="text" id="am-item-bind-text" class="inp-box" list="dl-items" placeholder="Kosongkan untuk GENERAL" value="${currentItemName}">
                    <datalist id="dl-items">${itemsInCat.map(i => `<option value="${i.item_name}">`).join('')}</datalist>
                </div>

                <div class="inp-grp">
                    <label>Jumlah Suku Kata</label>
                    <input type="number" id="am-syllable" class="inp-box" value="${meta.syllable_count || 0}" min="0">
                </div>

                <hr style="border:0; border-top:1px dashed #cbd5e1; margin:15px 0;">
                <label style="font-size: 0.8rem; font-weight: 700; color: var(--p); text-transform: uppercase;">RELATIONAL MAPPING TARGET</label>
                
                <div class="inp-grp" style="margin-top:10px;">
                    <label>Target Atribut</label>
                    <select id="am-target-attr" class="inp-box">
                        <option value="">-- Tidak Ada Target --</option>
                        ${cat.schemaFields.filter(f => f.key !== 'functional_type' && f.key !== 'syllable_count').map(f => 
                            `<option value="${f.key || f}" ${meta.target_attr === (f.key || f) ? 'selected' : ''}>${f.key || f}</option>`
                        ).join('')}
                    </select>
                </div>

                <div class="inp-grp">
                    <label>Target Value</label>
                    <input type="text" id="am-target-val" class="inp-box" list="dl-target-vals" value="${meta.target_val || ''}">
                    <datalist id="dl-target-vals">${Array.from(uniqueTargetVals).map(v => `<option value="${v}">`).join('')}</datalist>
                </div>

                <div style="display:flex; gap:10px; margin-top:20px;">
                    <button class="btn-act danger" style="background:#fef2f2; border:1px solid #fecaca; padding:12px; border-radius:8px;" onclick="window.deleteAudio('${id}')">${ICONS.TRASH}</button>
                    <button class="btn-save" style="flex:1; margin:0;" onclick="window.saveAudioMeta('${id}')">SIMPAN DATA</button>
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

    let finalItemId = null;
    if(itemBindText !== '') {
        const foundItem = masterItems.find(i => i.item_name.toLowerCase() === itemBindText.toLowerCase() && i.category_id === appState.activeCategoryID);
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

    try {
        await supabase.from('es_game_audios').update({ item_id: finalItemId, audio_metadata: newMeta }).eq('id', id);
        window.closeModal();
        await fetchData(); renderRouter();
    } catch(e) { alert("Gagal menyimpan metadata: " + e.message); }
}

async function toggleAudioPublish(id, currentStatus) {
    alert("Kolom is_published belum tersedia di es_game_audios.");
}

async function deleteAudio(id) {
    if(!confirm("Yakin hapus referensi audio ini?")) return;
    try {
        await supabase.from('es_game_audios').delete().eq('id', id);
        window.closeModal();
        await fetchData(); renderRouter();
    } catch(e) { alert("Gagal hapus: " + e.message); }
}