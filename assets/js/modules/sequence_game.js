// sequence_game.js - V1.1 (Standardized Clinical Edition)
// Features: Drag-and-Drop + Tap-to-Place Hybrid, Dynamic Slot Generation.
// Enrichment: Post-Flight S.O.A.P & Database Integration (es_game_logs), Global SPA Exit.
// Pattern: Strict Standard Architecture (No Core Logic Cleaning).

import { supabase } from '../config.js';

const CATEGORY_ID = 'd4dc10dd-3b96-4470-a83b-22e7174fe5dc';

let state = {
    container: null,
    view: 'LOADING',
    stories: {},
    activeStory: null,
    items: [],
    slots: [],
    errors: 0,
    startTime: 0,
    selectedItem: null
};

const ICONS = {
    PLAY: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="m7 4 12 8-12 8V4Z"/></svg>`,
    CHECK: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`
};

// --- 0. GLOBAL SPA EXIT FUNCTION ---
window.seqExitModule = () => {
    const modal = document.querySelector('.modal-overlay');
    if (modal) modal.remove();
    
    if (state.container) state.container.innerHTML = '';
    
    state = {
        container: null, view: 'LOADING', stories: {}, activeStory: null,
        items: [], slots: [], errors: 0, startTime: 0, selectedItem: null
    };
    
    if (typeof window.renderApp === 'function') window.renderApp(null);
    else if (typeof window.loadModule === 'function') window.loadModule('digital_area');
    else window.location.reload();
};

const injectStyles = () => {
    if (document.getElementById('seq-styles')) return;
    const s = document.createElement('style');
    s.id = 'seq-styles';
    s.innerHTML = `
        .seq-app { --p: #4f46e5; --s: #10b981; --d: #ef4444; --bg: #f8fafc; font-family: 'Inter', sans-serif; height: 100vh; display: flex; flex-direction: column; background: var(--bg); overflow: hidden; width: 100%; }
        .seq-app * { box-sizing: border-box; }
        .seq-nav { padding: 15px 20px; background: #fff; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.02); z-index: 10; }
        .seq-title { font-weight: 800; font-size: clamp(1rem, 2.5vw, 1.2rem); color: #1e293b; display: flex; align-items: center; gap: 10px; cursor: pointer; }
        .seq-body { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; }
        
        .menu-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px; width: 100%; max-width: 1200px; }
        .story-card { background: #fff; border: 2px solid #e2e8f0; border-radius: 12px; padding: 15px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: 0.2s; }
        .story-card:hover { border-color: var(--p); transform: translateY(-2px); box-shadow: 0 4px 6px -1px rgba(79,70,229,0.1); }
        .story-info h3 { margin: 0 0 5px 0; color: #1e293b; font-size: 1.1rem; }
        .story-info p { margin: 0; font-size: 0.85rem; color: #64748b; }
        
        /* RESPONSIVE GAME AREA (POTRAIT & LANDSCAPE) */
        .game-area { display: flex; flex-direction: column; gap: 3vh; width: 100%; max-width: 1000px; height: 100%; justify-content: center; }
        @media (orientation: landscape) and (min-width: 768px) {
            .game-area { flex-direction: column; justify-content: space-evenly; }
        }

        .board-zone { display: flex; justify-content: center; gap: clamp(10px, 2vw, 20px); flex-wrap: wrap; padding: 10px; }
        .slot-box { width: clamp(70px, 15vw, 140px); aspect-ratio: 1/1; border: 3px dashed #cbd5e1; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: clamp(1.5rem, 3vw, 2.5rem); color: #cbd5e1; font-weight: 800; transition: 0.3s; background: #fff; cursor: pointer; }
        .slot-box.active { border-color: var(--p); background: #eef2ff; }
        .slot-box.filled { border: 3px solid var(--s); background: #fff; overflow: hidden; cursor: default; }
        .slot-box img { width: 100%; height: 100%; object-fit: cover; pointer-events: none; border-radius: 8px; }
        
        .items-zone { display: flex; justify-content: center; gap: clamp(10px, 2vw, 20px); flex-wrap: wrap; padding: clamp(10px, 2vw, 20px); background: #fff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); min-height: clamp(90px, 18vw, 160px); align-items: center; }
        .drag-item { width: clamp(70px, 15vw, 140px); aspect-ratio: 1/1; border-radius: 12px; overflow: hidden; cursor: grab; border: 4px solid transparent; transition: 0.2s; background: #f1f5f9; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .drag-item.selected { border-color: var(--p); transform: scale(1.05) translateY(-5px); box-shadow: 0 10px 15px -3px rgba(79,70,229,0.3); }
        .drag-item img { width: 100%; height: 100%; object-fit: cover; pointer-events: none; }
        .drag-item:active { cursor: grabbing; }

        .btn-finish { display: none; margin: 0 auto; background: var(--s); color: white; border: none; padding: 15px 30px; border-radius: 100px; font-weight: 800; font-size: clamp(1rem, 2vw, 1.2rem); cursor: pointer; box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.3); transition: 0.3s; width: fit-content; }
        .btn-finish:hover { transform: translateY(-2px); }

        .modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.85); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(4px); }
        .modal-box { background: #fff; width: 100%; max-width: 450px; border-radius: 20px; padding: clamp(15px, 4vw, 25px); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); max-height: 90vh; overflow-y: auto; }
        .modal-title { font-weight: 800; font-size: 1.2rem; margin-bottom: 15px; text-align: center; }
        .inp-grp { margin-bottom: 15px; }
        .inp-grp label { display: block; font-size: 0.85rem; font-weight: 700; color: #64748b; margin-bottom: 8px; }
        .radio-grp { display: flex; flex-direction: column; gap: 8px; }
        .radio-label { display: flex; align-items: center; gap: 10px; font-size: 0.95rem; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; background: #f8fafc; }
        input[type="radio"] { transform: scale(1.2); accent-color: var(--p); }
        .textarea-box { width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; resize: vertical; outline: none; font-family: inherit; }
        .btn-save { width: 100%; padding: 15px; background: var(--p); color: white; border: none; border-radius: 10px; font-weight: 800; cursor: pointer; font-size: 1rem; margin-top: 10px; transition: 0.2s; }
        .btn-save:disabled { background: #cbd5e1; cursor: not-allowed; }
        .btn-close-modal { width: 100%; padding: 15px; background: #fff; color: var(--d); border: 2px solid #fecaca; border-radius: 10px; font-weight: 800; cursor: pointer; font-size: 1rem; margin-top: 10px; }
    `;
    document.head.appendChild(s);
};

export async function renderSequenceGame(containerId) {
    state.container = document.getElementById(containerId);
    if (!state.container) return;
    
    injectStyles();
    
    window.seqSelectStory = selectStory;
    window.seqExitGame = exitGame;
    window.seqDragStart = handleDragStart;
    window.seqDragOver = handleDragOver;
    window.seqDrop = handleDrop;
    window.seqItemTap = handleItemTap;
    window.seqSlotTap = handleSlotTap;
    window.seqFinishStory = showAssessmentModal;
    window.seqSaveData = saveClinicalData;

    await setupData();
}

async function setupData() {
    renderView('LOADING');
    try {
        const { data } = await supabase.from('es_game_items').select(`id, item_metadata, es_game_assets(public_url)`).eq('category_id', CATEGORY_ID).eq('is_published', true);
        
        state.stories = {};
        (data || []).forEach(item => {
            let meta = typeof item.item_metadata === 'string' ? JSON.parse(item.item_metadata) : item.item_metadata;
            let title = meta.judul || 'Tanpa Judul';
            if (!state.stories[title]) state.stories[title] = [];
            
            state.stories[title].push({
                id: item.id,
                judul: title,
                urutan: parseInt(meta.urutan) || 0,
                aktifitas: meta.aktifitas || '',
                url: item.es_game_assets?.[0]?.public_url || ''
            });
        });
        
        Object.keys(state.stories).forEach(k => state.stories[k].sort((a, b) => a.urutan - b.urutan));
        state.view = 'MENU';
        renderView();
    } catch (e) {
        console.error(e);
        state.container.innerHTML = `<div style="padding:20px; color:red;">Gagal memuat data sequence.</div>`;
    }
}

function renderView(overrideView) {
    if (overrideView) state.view = overrideView;
    const root = state.container;

    if (state.view === 'LOADING') {
        root.innerHTML = `<div class="seq-app"><div style="margin:auto; font-weight:bold;">⏳ Memuat Modul Sikuen...</div></div>`;
    } 
    else if (state.view === 'MENU') {
        const cards = Object.keys(state.stories).map(judul => `
            <div class="story-card" onclick="window.seqSelectStory('${judul}')">
                <div class="story-info">
                    <h3>${judul}</h3>
                    <p>${state.stories[judul].length} Gambar • ${state.stories[judul][0].aktifitas}</p>
                </div>
                <div style="color:var(--p);">${ICONS.PLAY}</div>
            </div>
        `).join('');

        root.innerHTML = `
            <div class="seq-app">
                <div class="seq-nav">
                    <div class="seq-title">🧩 Modul Sikuen Cerita</div>
                    <button style="background:#fee2e2; color:#ef4444; border:none; padding:8px 15px; border-radius:50px; font-weight:800; cursor:pointer; font-size:0.85rem;" onclick="window.seqExitModule()">✖ KELUAR</button>
                </div>
                <div class="seq-body"><div class="menu-grid">${cards || '<p>Tidak ada data.</p>'}</div></div>
            </div>
        `;
    } 
    else if (state.view === 'PLAY') {
        root.innerHTML = `
            <div class="seq-app">
                <div class="seq-nav">
                    <div class="seq-title" onclick="window.seqExitGame()">🔙 ${state.activeStory}</div>
                    <div style="display:flex; gap:15px; align-items:center;">
                        <div style="font-weight:700; color:var(--d);" id="err-counter">Salah: ${state.errors}</div>
                        <button style="background:#fee2e2; color:#ef4444; border:none; padding:8px 15px; border-radius:50px; font-weight:800; cursor:pointer; font-size:0.85rem;" onclick="window.seqExitModule()">✖ KELUAR</button>
                    </div>
                </div>
                <div class="seq-body">
                    <div class="game-area">
                        <div class="board-zone" id="slots-area">
                            ${state.slots.map(s => `
                                <div class="slot-box ${s.isFilled ? 'filled' : ''}" data-urutan="${s.urutan}" 
                                     ondragover="window.seqDragOver(event)" ondrop="window.seqDrop(event, ${s.urutan})" onclick="window.seqSlotTap(${s.urutan})">
                                    ${s.isFilled ? `<img src="${s.imgUrl}">` : s.urutan}
                                </div>
                            `).join('')}
                        </div>
                        <div class="items-zone" id="items-area">
                            ${state.items.filter(i => !i.isPlaced).map(i => `
                                <div class="drag-item ${state.selectedItem?.id === i.id ? 'selected' : ''}" id="item-${i.id}" draggable="true" 
                                     ondragstart="window.seqDragStart(event, '${i.id}', ${i.urutan})" onclick="window.seqItemTap('${i.id}', ${i.urutan})">
                                    <img src="${i.url}">
                                </div>
                            `).join('')}
                        </div>
                        <button class="btn-finish" id="btn-finish" onclick="window.seqFinishStory()">✓ Selesai Bercerita</button>
                    </div>
                </div>
            </div>
        `;
        checkWinCondition();
    }
}

function selectStory(judul) {
    state.activeStory = judul;
    state.errors = 0;
    state.startTime = Date.now();
    state.selectedItem = null;
    
    state.slots = state.stories[judul].map(i => ({ urutan: i.urutan, isFilled: false, imgUrl: null }));
    state.items = state.stories[judul].map(i => ({ ...i, isPlaced: false })).sort(() => Math.random() - 0.5);
    
    renderView('PLAY');
}

function exitGame() { renderView('MENU'); }

// --- DRAG & DROP ---
function handleDragStart(e, id, urutan) {
    e.dataTransfer.setData('id', id);
    e.dataTransfer.setData('urutan', urutan);
}
function handleDragOver(e) { e.preventDefault(); }
function handleDrop(e, targetUrutan) {
    e.preventDefault();
    processMove(e.dataTransfer.getData('id'), parseInt(e.dataTransfer.getData('urutan')), targetUrutan);
}

// --- TAP (MOBILE) ---
function handleItemTap(id, urutan) {
    if (state.selectedItem?.id === id) state.selectedItem = null;
    else state.selectedItem = { id, urutan };
    renderView('PLAY');
}
function handleSlotTap(targetUrutan) {
    if (!state.selectedItem) return;
    processMove(state.selectedItem.id, state.selectedItem.urutan, targetUrutan);
}

// --- LOGIC ---
function processMove(id, itemUrutan, targetUrutan) {
    const slot = state.slots.find(s => s.urutan === targetUrutan);
    if (slot.isFilled) return;

    if (itemUrutan === targetUrutan) {
        const item = state.items.find(i => i.id === id);
        slot.isFilled = true;
        slot.imgUrl = item.url;
        item.isPlaced = true;
        state.selectedItem = null;
    } else {
        state.errors++;
        const el = document.querySelector(`.slot-box[data-urutan="${targetUrutan}"]`);
        if(el) { el.style.borderColor = 'var(--d)'; el.style.backgroundColor = '#fef2f2'; setTimeout(() => renderView('PLAY'), 400); }
        state.selectedItem = null;
    }
    renderView('PLAY');
}

function checkWinCondition() {
    if (state.slots.every(s => s.isFilled)) {
        const itemsArea = document.getElementById('items-area');
        const btn = document.getElementById('btn-finish');
        if (itemsArea) itemsArea.style.display = 'none';
        if (btn) btn.style.display = 'block';
    }
}

// --- ASSESSMENT & DATABASE INTEGRATION ---
function showAssessmentModal() {
    const duration = Math.round((Date.now() - state.startTime) / 1000);
    const div = document.createElement('div');
    div.className = 'modal-overlay';
    div.innerHTML = `
        <div class="modal-box">
            <div class="modal-title">Observasi Klinis (S.O.A.P)</div>
            <div style="background:#f1f5f9; padding:10px; border-radius:8px; margin-bottom:15px; font-size:0.85rem; display:flex; justify-content:space-between;">
                <span>⏱️ Waktu: <b>${duration} dtk</b></span><span style="color:var(--d);">⚠️ Salah Tarik: <b>${state.errors}x</b></span>
            </div>
            
            <div class="inp-grp">
                <label>1. Bantuan Logika (Prompt Level)</label>
                <div class="radio-grp">
                    <label class="radio-label"><input type="radio" name="bl" value="Mandiri" checked> Mandiri (0)</label>
                    <label class="radio-label"><input type="radio" name="bl" value="Verbal"> Verbal / Visual (1)</label>
                    <label class="radio-label"><input type="radio" name="bl" value="Fisik"> Fisik Penuh (2)</label>
                </div>
            </div>
            
            <div class="inp-grp">
                <label>2. Output Cerita (Ekspresif)</label>
                <div class="radio-grp">
                    <label class="radio-label"><input type="radio" name="bc" value="Non-Verbal"> Non-Verbal / Menunjuk</label>
                    <label class="radio-label"><input type="radio" name="bc" value="Kata"> Kata Tunggal / Terpotong</label>
                    <label class="radio-label"><input type="radio" name="bc" value="Kalimat" checked> Kalimat Utuh Terangkai</label>
                </div>
            </div>
            
            <div class="inp-grp">
                <label>Catatan Terapis</label>
                <textarea id="c-note" class="textarea-box" rows="3" placeholder="Tuliskan respon anak terhadap alur cerita..."></textarea>
            </div>
            
            <button class="btn-save" id="btn-save-db" onclick="window.seqSaveData(${duration}, ${state.errors})">💾 SIMPAN REKAM MEDIS</button>
            <button class="btn-close-modal" onclick="window.seqExitModule()">✖ KELUAR TANPA SIMPAN</button>
        </div>
    `;
    document.body.appendChild(div);
}

async function saveClinicalData(durationSec, errors) {
    const btn = document.getElementById('btn-save-db');
    const blVal = document.querySelector('input[name="bl"]:checked').value;
    const bcVal = document.querySelector('input[name="bc"]:checked').value;
    const notes = document.getElementById('c-note').value;

    let promptLevel = 0;
    if (blVal === 'Verbal') promptLevel = 1;
    if (blVal === 'Fisik') promptLevel = 2;

    if(btn) { btn.innerHTML = "⏳ MENYIMPAN..."; btn.disabled = true; }

    try {
        const rawPatient = localStorage.getItem('eloq_active_patient');
        if (!rawPatient) throw new Error("Pilih pasien terlebih dahulu di dashboard utama aplikasi!");
        const activePatient = JSON.parse(rawPatient);

        // Fetch UUID Modul Sequence
        const { data: menuData } = await supabase.from('es_menus').select('module_uuid').eq('module_name', 'sequence_game').single();
        const exerciseId = menuData ? menuData.module_uuid : null;

        // Hitung Akurasi: (Total Item / (Total Item + Kesalahan))
        const totalItems = state.slots.length;
        const accuracy = (totalItems / Math.max(totalItems + errors, 1)) * 100;

        const payload = {
            patient_id: activePatient.id,
            exercise_id: exerciseId,
            cognitive_latency_ms: durationSec * 1000,
            prompt_level: promptLevel,
            is_success: accuracy >= 80,
            precision_offset_rel: parseFloat(accuracy.toFixed(2)),
            jitter_index: errors,
            touch_radius: 0.0,
            session_metadata: {
                module_code: "sequence_engine",
                story_title: state.activeStory,
                output_cerita: bcVal,
                total_errors: errors,
                therapist_notes: notes
            }
        };

        const { error } = await supabase.from('es_game_logs').insert(payload);
        if (error) throw error;

        alert("✅ Berhasil! Data Sesi Sikuen Cerita sudah diamankan ke Database.");
        const modal = document.querySelector('.modal-overlay');
        if(modal) modal.remove();
        window.seqExitModule();

    } catch (err) {
        alert("GAGAL MENYIMPAN: " + err.message);
        if(btn) { btn.innerHTML = "💾 SIMPAN REKAM MEDIS"; btn.disabled = false; }
    }
}