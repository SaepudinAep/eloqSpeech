// exercise_hub.js - V2.0 (The Matrix Selector)
// Logic: Existing Assets + Game Templates = Clinical Exercise

import { supabase } from '../config.js';

let categories = [];
let items = [];
let templates = [];
let appState = {
    view: 'CATEGORY', // CATEGORY | ITEMS | MODES
    activeCategoryID: null,
    activeCategoryName: null,
    selectedItem: null
};

// --- STYLES (Konsisten dengan UI Bapak) ---
const injectStyles = () => {
    if (document.getElementById('eh-v2-styles')) return;
    const s = document.createElement('style');
    s.id = 'eh-v2-styles';
    s.innerHTML = `
        .eh-root { padding: 20px; max-width: 1200px; margin: 0 auto; }
        .eh-breadcrumb { display: flex; align-items: center; gap: 8px; margin-bottom: 25px; font-weight: 800; color: #64748b; }
        .eh-link { cursor: pointer; color: #4d97ff; text-decoration: underline; }
        
        /* Grid Layouts */
        .eh-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; }
        
        /* Card Styles */
        .eh-card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; text-align: center; cursor: pointer; transition: 0.2s; }
        .eh-card:hover { transform: translateY(-5px); border-color: #4d97ff; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
        
        .mode-card { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; cursor: pointer; text-align: left; transition: 0.2s; }
        .mode-card:hover { background: #eff6ff; border-color: #4d97ff; transform: scale(1.02); }
        .mode-card h4 { margin: 0 0 5px 0; color: #1e293b; }
        .mode-card p { margin: 0; font-size: 12px; color: #64748b; }

        .item-img { width: 100%; height: 120px; object-fit: contain; margin-bottom: 10px; }
        .empty-state { grid-column: 1/-1; text-align: center; padding: 40px; color: #94a3b8; }
    `;
    document.head.appendChild(s);
};

export async function renderExerciseHub(containerId) {
    injectStyles();
    const container = document.getElementById(containerId);
    container.innerHTML = `<div class="eh-root">⏳ Mengkalibrasi Neural Database...</div>`;

    // Global Functions Binding
    window.setEhView = (v) => { appState.view = v; renderRouter(); };
    window.selectItem = (id) => { 
        appState.selectedItem = items.find(i => i.id === id);
        appState.view = 'MODES'; 
        renderRouter(); 
    };
    window.launchSession = (templateId) => launchGameSession(templateId);

    await fetchData();
    renderRouter();
}

async function fetchData() {
    // 1. Ambil Kategori yang SUDAH ADA di database Bapak
    const { data: cats } = await supabase.from('es_game_categories').select('id, name').order('name');
    categories = cats || [];

    // 2. Ambil Item & Aset Gambarnya
    const { data: gameItems } = await supabase.from('es_game_items')
        .select('*, es_game_assets(*)')
        .eq('is_active', true);
    items = gameItems || [];

    // 3. Ambil Template (Resep) yang baru di-inject
    const { data: tpls } = await supabase.from('es_game_templates')
        .select('*')
        .eq('is_active', true);
    templates = tpls || [];
}

function renderRouter() {
    const root = document.getElementById('eh-app') || document.querySelector('.eh-root');
    if (!root) return;
    root.innerHTML = '';
    
    const nav = document.createElement('div');
    nav.className = 'eh-breadcrumb';

    if (appState.view === 'CATEGORY') {
        nav.innerHTML = `<span>📂 PILIH KATEGORI ASET</span>`;
        root.appendChild(nav);
        renderCategories(root);
    } else if (appState.view === 'ITEMS') {
        nav.innerHTML = `<span class="eh-link" onclick="setEhView('CATEGORY')">KATEGORI</span> <span style="color:#cbd5e1">/</span> <span>${appState.activeCategoryName.toUpperCase()}</span>`;
        root.appendChild(nav);
        renderItems(root);
    } else if (appState.view === 'MODES') {
        nav.innerHTML = `<span class="eh-link" onclick="setEhView('ITEMS')">${appState.activeCategoryName.toUpperCase()}</span> <span style="color:#cbd5e1">/</span> <span>PILIH METODE LATIHAN</span>`;
        root.appendChild(nav);
        renderModeSelector(root);
    }
}

// LEVEL 1: Render Kategori yang ada
function renderCategories(root) {
    const grid = document.createElement('div');
    grid.className = 'eh-grid';
    
    if (categories.length === 0) {
        grid.innerHTML = `<div class="empty-state">Belum ada kategori aset di database.</div>`;
    }

    categories.forEach(cat => {
        // Hitung jumlah item real-time
        const count = items.filter(i => i.category_id === cat.id).length;
        if (count === 0) return; // Sembunyikan kategori kosong agar rapi

        const card = document.createElement('div');
        card.className = 'eh-card';
        card.onclick = () => {
            appState.activeCategoryID = cat.id;
            appState.activeCategoryName = cat.name;
            setEhView('ITEMS');
        };
        // Gunakan emoji statis atau icon dari DB jika ada
        card.innerHTML = `<div style="font-size:30px; margin-bottom:10px;">📦</div><b>${cat.name}</b><br><small style="color:#64748b">${count} Item Siap</small>`;
        grid.appendChild(card);
    });
    root.appendChild(grid);
}

// LEVEL 2: Render Item/Aset
function renderItems(root) {
    const grid = document.createElement('div');
    grid.className = 'eh-grid';
    
    const filtered = items.filter(i => i.category_id === appState.activeCategoryID);
    
    filtered.forEach(item => {
        const img = item.es_game_assets.find(a => a.media_type === 'IMAGE');
        const imgUrl = img ? img.public_url : 'https://placehold.co/150?text=No+Img';
        
        const card = document.createElement('div');
        card.className = 'eh-card';
        card.onclick = () => selectItem(item.id);
        card.innerHTML = `
            <img src="${imgUrl}" class="item-img">
            <div style="font-weight:bold; font-size:14px;">${item.item_name}</div>
        `;
        grid.appendChild(card);
    });
    root.appendChild(grid);
}

// LEVEL 3: Render Pilihan Mode (Template)
function renderModeSelector(root) {
    const item = appState.selectedItem;
    const img = item.es_game_assets.find(a => a.media_type === 'IMAGE');
    
    // Preview Aset yang dipilih
    const header = document.createElement('div');
    header.style.textAlign = 'center';
    header.style.marginBottom = '30px';
    header.innerHTML = `
        <img src="${img ? img.public_url : ''}" style="height:100px; border-radius:10px; box-shadow:0 4px 6px rgba(0,0,0,0.1);">
        <h2 style="margin:10px 0 5px 0;">${item.item_name}</h2>
        <p style="color:#64748b;">Pilih metode latihan untuk pasien:</p>
    `;
    root.appendChild(header);

    // Grid Pilihan Mode
    const grid = document.createElement('div');
    grid.className = 'eh-grid';

    templates.forEach(tpl => {
        // Parsing metadata JSON dari deskripsi
        let meta = { mode: 'TAP', desc: tpl.description };
        try { meta = JSON.parse(tpl.description); } catch(e) {}

        const card = document.createElement('div');
        card.className = 'mode-card';
        card.onclick = () => launchSession(tpl.id);
        card.innerHTML = `
            <h4>${tpl.template_name}</h4>
            <p>${meta.desc}</p>
        `;
        grid.appendChild(card);
    });
    root.appendChild(grid);
}

// --- FINAL LAUNCHER ---
async function launchGameSession(templateId) {
    const tpl = templates.find(t => t.id === templateId);
    const item = appState.selectedItem;
    const img = item.es_game_assets.find(a => a.media_type === 'IMAGE');

    console.log(`🚀 Launching: ${item.item_name} [${tpl.template_name}]`);

    // Parse Mode
    let mode = 'TAP';
    try { mode = JSON.parse(tpl.description).mode; } catch(e) {}

    const config = {
        asset_url: img ? img.public_url : '',
        size: 150,
        mode: mode, // TAP | HOLD | FOLLOW
        label: item.item_name
    };

    // Eksekusi Kernel atau Direct Engine
    if (window.eloqKernel) {
        window.eloqKernel.startSession(null, { config_json: config }, 'mod-root');
    } else {
        // Fallback Direct Import
        try {
            const { renderTouchEngine } = await import(`./${tpl.module_path}.js`);
            renderTouchEngine('mod-root', config);
        } catch(e) {
            alert(`Gagal memuat engine: ${tpl.module_path}`);
        }
    }
}