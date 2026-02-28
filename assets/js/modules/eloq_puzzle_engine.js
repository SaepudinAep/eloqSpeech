// eloq_puzzle_engine.js - V13.2 (Final SPA Integrator & Memory Safe)
// Fix: UI.js Container Constraints, Absolute Ratio, Memory Cleanup, Functional Exit

import { supabase } from '../config.js';

// --- CONFIGURATION ---
const CONFIG = {
    VALIDATION: { MIN_DURATION_MS: 3000, MAX_DURATION_MS: 600000, MAX_PATH_RATIO: 10.0, MAX_ERRORS_MULTIPLIER: 15 },
    PERFORMANCE: { CHART_MAX_POINTS: 20, COORDINATE_SAMPLE_RATE_MS: 100, DEBOUNCE_MS: 300 },
    SNAP: { TOLERANCE_RATIO: 0.35, MAGNETIC_RATIO: 0.20 },
    UI: { OFFSET_Y: 55 },
    COLORS: { SUCCESS: '#10b981', WARNING: '#f59e0b', ERROR: '#ef4444', NEUTRAL: '#64748b' }
};

// --- STYLES (Strict CSS Constraint for dynamic-area) ---
const STYLES = `
    * { box-sizing: border-box; }
    
    .epe-root {
        position: relative; width: 100%; height: 100%; min-height: 60vh;
        background: #f8fafc; display: flex; flex-direction: column; overflow: hidden;
        font-family: 'Inter', -apple-system, sans-serif; user-select: none;
        border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    
    .epe-header {
        height: 60px; padding: 0 15px; background: white; border-bottom: 1px solid #e2e8f0;
        display: flex; justify-content: space-between; align-items: center; z-index: 10; flex-shrink: 0;
    }
    .epe-stat-box { display: flex; gap: 15px; font-size: 0.85rem; font-weight: 600; color: #475569; flex-wrap: wrap; }
    
    /* Pagar Beton Flexbox */
    .epe-workspace { 
        flex: 1; display: flex; background: #f1f5f9; position: relative; 
        min-height: 0; min-width: 0; overflow: hidden; 
    }
    
    /* HORIZONTAL MODE (Landscape) */
    @media (min-aspect-ratio: 1/1) {
        .epe-workspace { flex-direction: row; }
        .epe-tray { width: 250px; height: 100%; border-right: 2px solid #cbd5e1; flex-direction: column; align-content: flex-start; border-top: none; }
        .epe-board-container { flex: 1; height: 100%; min-width: 0; }
    }
    /* VERTIKAL MODE (Portrait) */
    @media (max-aspect-ratio: 1/1) {
        .epe-workspace { flex-direction: column; }
        .epe-tray { width: 100%; height: 140px; border-top: 2px solid #cbd5e1; flex-direction: row; align-content: flex-start; border-right: none; }
        .epe-board-container { flex: 1; width: 100%; min-height: 0; }
    }
    
    .epe-tray {
        background: #e2e8f0; padding: 15px; display: flex; gap: 10px; overflow: auto; flex-wrap: wrap; align-items: center; justify-content: center;
        box-shadow: inset 0 0 10px rgba(0,0,0,0.05); flex-shrink: 0;
    }
    
    .epe-board-container {
        display: flex; align-items: center; justify-content: center;
        background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
        background-size: 20px 20px; position: relative; overflow: hidden; padding: 20px;
    }
    
    .epe-board {
        position: relative; background-size: contain; background-repeat: no-repeat;
        box-shadow: 0 10px 25px rgba(0,0,0,0.1); border-radius: 4px; background-color: white;
    }
    
    .epe-slot {
        position: absolute; border: 1px dashed rgba(0,0,0,0.15); background: rgba(0,0,0,0.02);
        pointer-events: none; transition: all 0.2s ease;
    }
    .epe-slot.active { background: rgba(16, 185, 129, 0.2); border: 2px solid #10b981; }
    
    .epe-piece {
        position: absolute; box-shadow: 0 4px 6px rgba(0,0,0,0.15); cursor: grab; touch-action: none; 
        transition: transform 0.1s; z-index: 100;
        background-size: 100% 100%; background-color: white;
        border: 1px solid rgba(0,0,0,0.15); border-radius: 4px;
    }
    .epe-piece.dragging { cursor: grabbing; z-index: 9999 !important; transform: scale(1.08); box-shadow: 0 15px 25px rgba(0,0,0,0.2); }
    .epe-piece.locked { pointer-events: none; z-index: 1; box-shadow: none; border: none; margin: 0; border-radius: 0; }
    
    #epe-target { opacity: 0.15; width: 100%; height: 100%; pointer-events: none; }
    
    .epe-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: white; z-index: 999999; display: flex; flex-direction: column; overflow-y: auto; padding: 20px 15px; }
    
    .epe-btn { padding: 12px 20px; border: 1px solid #cbd5e1; border-radius: 8px; background: white; cursor: pointer; font-weight: 600; margin: 5px; transition: 0.2s; font-size: 0.9rem; display: inline-flex; align-items: center; gap: 8px; justify-content: center; color: #1e293b; }
    .epe-btn:hover { background: #eff6ff; border-color: #3b82f6; transform: translateY(-2px); box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .epe-icon-btn { padding: 8px; border-radius: 5px; border: 1px solid #cbd5e1; background: white; cursor: pointer; width: auto; padding: 5px 15px; display: flex; align-items: center; justify-content: center; transition: 0.2s; font-weight: bold; color: #1e293b; font-size: 0.85rem; }
    .epe-icon-btn:hover { background: #f1f5f9; }

    .epe-calibration-banner { background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: white; padding: 10px 16px; font-weight: 700; text-align: center; font-size: 0.85rem; flex-shrink: 0; text-transform: uppercase; }
    .epe-form-group { margin: 15px 0; width: 100%; max-width: 450px; }
    .epe-form-label { display: block; font-size: 0.9rem; font-weight: 600; color: #475569; margin-bottom: 6px; }
    .epe-form-select, .epe-form-input { width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; background: white; color: #1e293b; }
    
    .epe-chart-box { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 12px auto; max-width: 600px; width: 100%; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .epe-chart-title { font-size: 0.85rem; color: #64748b; margin-bottom: 15px; font-weight: 700; text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; letter-spacing: 0.5px; text-transform: uppercase; }
    .epe-data-value { font-size: 2rem; font-weight: 800; color: #1e293b; text-align: center; margin: 10px 0; }
    .epe-data-label { font-size: 0.8rem; color: #94a3b8; text-align: center; display: block; }
    .epe-metadata-box { background: #f8fafc; padding: 15px; border-radius: 10px; border: 1px solid #e2e8f0; margin: 15px auto; max-width: 600px; }
    
    .epe-grid-visual { display: grid; gap: 4px; margin: 15px auto; max-width: 300px; }
    .epe-grid-cell { aspect-ratio: 1; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 700; color: white; position: relative; text-shadow: 0 1px 2px rgba(0,0,0,0.2); }
    .epe-grid-cell::after { content: attr(data-time); position: absolute; bottom: 2px; right: 2px; font-size: 0.65rem; opacity: 0.9; }
    .epe-sequence-visual { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin: 15px 0; }
    .epe-sequence-item { background: #e0f2fe; border: 2px solid #0284c7; padding: 8px 14px; border-radius: 8px; font-weight: 700; color: #075985; font-size: 0.85rem; display: flex; align-items: center; gap: 5px; }
`;

// --- STATE ---
let state = {
    config: { rows: 0, cols: 0 },
    assets: { img: null, catId: null },
    session: { isActive: false, startTime: 0, lastActionTime: 0, lockedCount: 0, totalCount: 0, timerInterval: null, isCalibration: false, metadata: {}, isTransitioning: false },
    layout: { pieceW: 0, pieceH: 0 },
    telemetry: { events: [], path_ratios: [], errors: { total: 0, positions: [] }, pieceTimes: {}, hesitations: [], sequence: [] }
};

// --- MAIN RENDER ---
export async function renderEloqPuzzleEngine(containerId) {
    nukeArtifacts();
    if (!document.getElementById('epe-styles')) {
        const s = document.createElement('style'); s.id = 'epe-styles'; s.innerHTML = STYLES;
        document.head.appendChild(s);
    }
    const container = document.getElementById(containerId);
    
    // Pastikan container utama (dynamic-area) dapat menampung flex child dengan benar
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.height = '100%';
    
    container.innerHTML = `<div class="epe-root" id="epe-app"></div>`;
    await showCategorySelector(container.querySelector('.epe-root'));
}

function nukeArtifacts() {
    if (state.session.timerInterval) clearInterval(state.session.timerInterval);
    document.querySelectorAll('.epe-overlay').forEach(el => el.remove());
    state.session.isTransitioning = false;
}

// --- SAFE NAVIGATION & ANTI-BLANK LOGIC ---
async function showCategorySelector(root) {
    if (state.session.isTransitioning) return;
    state.session.isTransitioning = true;
    
    const overlay = document.createElement('div');
    overlay.className = 'epe-overlay';
    
    // Nuke Button di Menu Awal untuk keluar dari modul sebelum mulai
    overlay.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <h2 style="color:#1e293b; margin:0;">Instrumen Spasial</h2>
            <button class="epe-icon-btn" id="btn-exit-menu" style="background:#fff1f2; color:#db2777; border-color:#fbcfe8;">✖ Keluar</button>
        </div>
        <p id="epe-cat-status" style="text-align:center; color:#64748b; margin-bottom:20px;">Memuat data database...</p>
        <div id="epe-cat-list" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(140px,1fr)); gap:12px; max-width:600px; margin:0 auto;"></div>
    `;
    document.body.appendChild(overlay);
    
    overlay.querySelector('#btn-exit-menu').onclick = () => {
        nukeArtifacts();
        if(typeof window.renderApp === 'function') window.renderApp(null);
    };
    
    try {
        const { data: cats, error } = await supabase.from('es_game_categories').select('*');
        if (error) throw error;
        if (!cats || cats.length === 0) throw new Error("Tidak ada data kategori.");
        
        const list = overlay.querySelector('#epe-cat-list');
        list.innerHTML = '';
        
        for (const c of cats) {
            const { data: items } = await supabase.from('es_game_items').select('es_game_assets!inner(*)').eq('category_id', c.id).limit(1);
            if (items && items.length > 0) {
                const btn = document.createElement('button');
                btn.className = 'epe-btn'; 
                btn.innerHTML = `[+] ${c.name}`; 
                btn.onclick = () => { selectRandomAsset(root, c.id, overlay); };
                list.appendChild(btn);
            }
        }
        
        const statusText = document.getElementById('epe-cat-status');
        if (statusText) statusText.innerText = "Pilih Stimulus:";
    } catch (err) {
        const statusText = document.getElementById('epe-cat-status');
        if (statusText) statusText.innerHTML = `<span style="color:#ef4444;">Error: ${err.message}</span>`;
    } finally {
        state.session.isTransitioning = false;
    }
}

async function selectRandomAsset(root, catId, activeOverlay) {
    if (state.session.isTransitioning) return;
    state.session.isTransitioning = true;
    
    const originalHTML = activeOverlay.innerHTML;
    activeOverlay.innerHTML = `<h3 style="text-align:center; margin-top:20vh; color:#1e293b;">Memuat Aset Visual...</h3><p style="text-align:center; color:#64748b;">Mohon tunggu sebentar.</p>`;
    
    try {
        state.assets.catId = catId; 
        const { data: items, error } = await supabase.from('es_game_items').select('*, es_game_assets(*)').eq('category_id', catId);
        if (error) throw error;
        
        const validItems = items.filter(i => i.es_game_assets && i.es_game_assets.some(a => a.media_type === 'IMAGE'));
        if (validItems.length === 0) {
            alert("Kategori ini tidak memiliki aset berjenis IMAGE.");
            activeOverlay.innerHTML = originalHTML;
            state.session.isTransitioning = false;
            return;
        }
        
        const item = validItems[Math.floor(Math.random() * validItems.length)];
        const imgUrl = item.es_game_assets.find(a => a.media_type === 'IMAGE').public_url;

        const img = new Image();
        img.crossOrigin = "Anonymous";
        
        img.onload = () => {
            activeOverlay.remove();
            state.session.isTransitioning = false;
            showLevelSelector(root, img);
        };
        
        img.onerror = () => {
            alert("Gagal memuat gambar. Silakan periksa koneksi atau CORS.\nURL: " + imgUrl);
            activeOverlay.innerHTML = originalHTML;
            state.session.isTransitioning = false;
        };
        
        img.src = imgUrl;
    } catch (err) {
        alert(`Error Sistem: ${err.message}`);
        activeOverlay.innerHTML = originalHTML;
        state.session.isTransitioning = false;
    }
}

function showLevelSelector(root, imgObj) {
    state.assets.img = imgObj;
    const overlay = document.createElement('div');
    overlay.className = 'epe-overlay';
    overlay.innerHTML = `
        <img src="${imgObj.src}" style="max-height:200px; margin-bottom:20px; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,0.1); object-fit:contain;">
        <h3 style="text-align:center; margin-bottom:15px; color:#1e293b;">Konfigurasi Grid</h3>
        <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
            <button class="epe-btn" id="btn-2x2">2x2 (Mudah)</button>
            <button class="epe-btn" id="btn-3x3">3x3 (Sedang)</button>
            <button class="epe-btn" id="btn-4x4">4x4 (Sulit)</button>
        </div>
        <button class="epe-btn" style="margin-top:25px; margin-left:auto; margin-right:auto; display:flex; color:#64748b;" id="btn-back">[ Kembali ]</button>
    `;
    document.body.appendChild(overlay);
    
    overlay.querySelector('#btn-2x2').onclick = () => { overlay.remove(); showMetadataForm(root, 2, 2); };
    overlay.querySelector('#btn-3x3').onclick = () => { overlay.remove(); showMetadataForm(root, 3, 3); };
    overlay.querySelector('#btn-4x4').onclick = () => { overlay.remove(); showMetadataForm(root, 4, 4); };
    overlay.querySelector('#btn-back').onclick = () => { overlay.remove(); showCategorySelector(root); };
}

function showMetadataForm(root, rows, cols) {
    const overlay = document.createElement('div');
    overlay.className = 'epe-overlay';
    overlay.innerHTML = `
        <div style="max-width: 500px; margin: 0 auto; width: 100%;">
            <h3 style="margin-bottom:25px; text-align:center; color:#1e293b;">Pengaturan Sesi</h3>
            <div class="epe-form-group"><label class="epe-form-label">Mode Sesi:</label><select id="epe-mode" class="epe-form-select"><option value="normal">Mode Normal</option><option value="calibration">Mode Latihan</option></select></div>
            <div class="epe-form-group"><label class="epe-form-label">Pendampingan:</label><select id="epe-supervised" class="epe-form-select"><option value="yes">Terapis</option><option value="no">Mandiri</option></select></div>
            <div class="epe-form-group"><label class="epe-form-label">Waktu Sesi:</label><select id="epe-time" class="epe-form-select"><option value="morning">Pagi</option><option value="afternoon">Siang</option><option value="evening">Sore / Malam</option></select></div>
            <div class="epe-form-group"><label class="epe-form-label">Catatan:</label><input type="text" id="epe-notes" class="epe-form-input" placeholder="Opsional"></div>
            <div style="margin-top:30px; display:flex; gap:12px; justify-content:center;">
                <button class="epe-btn" style="border-color:#3b82f6; color:#3b82f6;" id="btn-start">Mulai Sesi</button>
                <button class="epe-btn" id="btn-back2">Kembali</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    
    overlay.querySelector('#btn-start').onclick = () => {
        state.session.isCalibration = (overlay.querySelector('#epe-mode').value === 'calibration');
        state.session.metadata = {
            supervised: overlay.querySelector('#epe-supervised').value,
            timeOfDay: overlay.querySelector('#epe-time').value,
            notes: overlay.querySelector('#epe-notes').value.trim() || 'Tidak ada',
            timestamp: new Date().toISOString()
        };
        overlay.remove(); initEnvironment(root, rows, cols);
    };
    overlay.querySelector('#btn-back2').onclick = () => { overlay.remove(); showLevelSelector(root, state.assets.img); };
}

// --- GAME ENVIRONMENT (ABSOLUTE ADAPTIVE RATIO & FUNCTIONAL EXIT) ---
function initEnvironment(root, rows, cols) {
    nukeArtifacts();
    state.config = { rows, cols };
    state.session = { isActive: false, startTime: 0, lastActionTime: 0, lockedCount: 0, totalCount: rows*cols, timerInterval: null, isCalibration: state.session.isCalibration, metadata: state.session.metadata, isTransitioning: false };
    state.telemetry = { events: [], path_ratios: [], errors: { total: 0, positions: [] }, pieceTimes: {}, hesitations: [], sequence: [] };
    
    const img = state.assets.img;
    const calibBanner = state.session.isCalibration ? `<div class="epe-calibration-banner">MODE LATIHAN - DATA TIDAK DICATAT</div>` : '';
    
    root.innerHTML = `
        ${calibBanner}
        <div class="epe-header">
            <div class="epe-stat-box"><span>Waktu: <span id="epe-timer">00:00</span></span><span>Terkunci: <span id="epe-progress">0</span>/${rows*cols}</span><span style="color:#f59e0b;">Meleset: <span id="epe-errors">0</span></span></div>
            <div style="display:flex; gap:10px;">
                <button class="epe-icon-btn" id="btn-pause">Jeda</button>
                <button class="epe-icon-btn" id="btn-close-session" style="background:#fff1f2; color:#db2777; border-color:#fbcfe8;">✖ Keluar</button>
            </div>
        </div>
        <div class="epe-workspace">
            <div class="epe-tray" id="epe-tray"></div>
            <div class="epe-board-container" id="epe-board-container">
                <div class="epe-board" id="epe-board"><img id="epe-target" src="${img.src}"></div>
            </div>
        </div>
    `;
    
    const bContainer = document.getElementById('epe-board-container');
    const board = document.getElementById('epe-board');
    const tray = document.getElementById('epe-tray');
    
    // Protokol Pembersihan SPA (Keluar Sesi)
    document.getElementById('btn-close-session').onclick = () => {
        if(confirm('Akhiri sesi dan kembali ke Dashboard?')) {
            clearInterval(state.session.timerInterval);
            state.assets.img = null; // Clean Memory
            if(typeof window.renderApp === 'function') window.renderApp(null);
        }
    };
    
    // Fungsi Rekalkulasi Ukuran Board dengan Aspect Ratio Lock
    const calculateBoardSize = () => {
        // Beri margin aman 5% dari container aktual
        const availW = bContainer.clientWidth * 0.95;
        const availH = bContainer.clientHeight * 0.95;
        
        // Cari skala minimum agar gambar muat seluruhnya tanpa merusak rasio
        const scale = Math.min(availW / img.width, availH / img.height);
        
        // Terapkan dimensi baru secara absolut
        const bW = img.width * scale;
        const bH = img.height * scale;
        
        board.style.width = `${bW}px`; 
        board.style.height = `${bH}px`;
        
        state.layout.pieceW = bW / state.config.cols;
        state.layout.pieceH = bH / state.config.rows;
        
        // Sesuaikan kepingan yang ada
        document.querySelectorAll('.epe-piece:not(.locked)').forEach(p => {
            p.style.width = `${state.layout.pieceW}px`;
            p.style.height = `${state.layout.pieceH}px`;
        });
    };
    
    // Eksekusi kalkulasi pertama kali
    calculateBoardSize();
    
    // Grid Setup
    for (let r=0; r<rows; r++) {
        for (let c=0; c<cols; c++) {
            const slot = document.createElement('div'); slot.className = 'epe-slot'; slot.id = `slot-${r}-${c}`;
            slot.style.width = `${(1/cols)*100}%`; slot.style.height = `${(1/rows)*100}%`;
            slot.style.left = `${(c/cols)*100}%`; slot.style.top = `${(r/rows)*100}%`;
            board.appendChild(slot);
        }
    }
    
    let pieceElements = [];
    for (let r=0; r<rows; r++) {
        for (let c=0; c<cols; c++) {
            // Pemotongan Kanvas tetap menggunakan resolusi asli (HD)
            const cvs = document.createElement('canvas'); 
            cvs.width = img.width/cols; 
            cvs.height = img.height/rows;
            cvs.getContext('2d').drawImage(img, c*(img.width/cols), r*(img.height/rows), img.width/cols, img.height/rows, 0, 0, cvs.width, cvs.height);
            
            const piece = document.createElement('div'); piece.className = 'epe-piece';
            piece.style.width = `${state.layout.pieceW}px`; piece.style.height = `${state.layout.pieceH}px`;
            piece.style.backgroundImage = `url(${cvs.toDataURL()})`; piece.style.position = 'relative';
            
            piece.dataset.row = r; piece.dataset.col = c; piece.dataset.pieceId = `piece-${r}-${c}`;
            pieceElements.push(piece);
            
            state.telemetry.pieceTimes[piece.dataset.pieceId] = { firstTouchTime: null, startTime: null, endTime: null, duration: 0, attempts: 0, hesitation: 0 };
            setupDrag(piece);
        }
    }
    
    pieceElements.sort(() => Math.random() - 0.5);
    pieceElements.forEach(p => tray.appendChild(p));
    
    // Resize Listener yang Adaptif
    window.addEventListener('resize', () => {
        if(!bContainer || !board || state.session.lockedCount === state.session.totalCount) return;
        calculateBoardSize();
    });
    
    document.getElementById('btn-pause').onclick = () => {
        if(confirm('Jeda sesi? Timer akan dihentikan.')) { clearInterval(state.session.timerInterval); alert('Sesi di-jeda. Buka ulang lewat menu utama untuk mereset.'); }
    };
}

// --- MAGNETIC DRAG & DROP ---
function setupDrag(el) {
    let isDragging = false, dragPath = [], offsetX = 0, offsetY = 0, lastTime = 0;
    const r = parseInt(el.dataset.row), c = parseInt(el.dataset.col), id = el.dataset.pieceId;
    
    const start = (e) => {
        if (el.classList.contains('locked')) return;
        if (!state.session.isActive) { state.session.isActive = true; state.session.startTime = Date.now(); startTimer(); }
        
        isDragging = true; dragPath = [];
        const cx = e.touches ? e.touches[0].clientX : e.clientX;
        const cy = e.touches ? e.touches[0].clientY : e.clientY;
        const rect = el.getBoundingClientRect();
        offsetX = cx - rect.left; offsetY = cy - rect.top;
        
        el.classList.add('dragging'); el.style.position = 'fixed';
        
        const now = Date.now();
        if (!state.telemetry.pieceTimes[id].firstTouchTime) state.telemetry.pieceTimes[id].firstTouchTime = now;
        if (!state.telemetry.pieceTimes[id].startTime) {
            state.telemetry.pieceTimes[id].startTime = now;
            state.telemetry.pieceTimes[id].hesitation = now - state.telemetry.pieceTimes[id].firstTouchTime;
            state.telemetry.hesitations.push({ pieceId: id, hesitation: state.telemetry.pieceTimes[id].hesitation });
        }
        state.telemetry.pieceTimes[id].attempts++;
    };
    
    const move = (e) => {
        if (!isDragging) return; e.preventDefault();
        const cx = e.touches ? e.touches[0].clientX : e.clientX;
        const cy = e.touches ? e.touches[0].clientY : e.clientY;
        
        el.style.left = (cx - offsetX) + 'px'; el.style.top = (cy - offsetY - CONFIG.UI.OFFSET_Y) + 'px'; 
        
        const now = Date.now();
        if (now - lastTime > CONFIG.PERFORMANCE.COORDINATE_SAMPLE_RATE_MS) { dragPath.push({x:cx, y:cy}); lastTime = now; }
        
        const slot = document.getElementById(`slot-${r}-${c}`);
        if(slot) {
            const sR = slot.getBoundingClientRect(), pR = el.getBoundingClientRect();
            const dist = Math.sqrt(Math.pow((pR.left+pR.width/2)-(sR.left+sR.width/2),2) + Math.pow((pR.top+pR.height/2)-(sR.top+sR.height/2),2));
            if (dist < state.layout.pieceW * CONFIG.SNAP.MAGNETIC_RATIO) slot.classList.add('active');
            else slot.classList.remove('active');
        }
    };
    
    const end = () => {
        if (!isDragging) return; isDragging = false; el.classList.remove('dragging');
        analyzePath(dragPath); checkSnap(el, r, c); dragPath = [];
    };
    
    el.addEventListener('mousedown', start); el.addEventListener('touchstart', start, {passive: false});
    document.addEventListener('mousemove', move); document.addEventListener('touchmove', move, {passive: false});
    document.addEventListener('mouseup', end); document.addEventListener('touchend', end);
}

function checkSnap(el, r, c) {
    const slot = document.getElementById(`slot-${r}-${c}`), board = document.getElementById('epe-board');
    if(!slot || !board) return;
    
    const sR = slot.getBoundingClientRect(), pR = el.getBoundingClientRect();
    const px = pR.left+pR.width/2, py = pR.top+pR.height/2;
    const dist = Math.sqrt(Math.pow(px-(sR.left+sR.width/2),2) + Math.pow(py-(sR.top+sR.height/2),2));
    
    if (dist < state.layout.pieceW * CONFIG.SNAP.TOLERANCE_RATIO) {
        el.style.left = `${(c/state.config.cols)*100}%`; el.style.top = `${(r/state.config.rows)*100}%`;
        el.style.width = `${(1/state.config.cols)*100}%`; el.style.height = `${(1/state.config.rows)*100}%`;
        el.style.position = 'absolute'; el.classList.add('locked'); board.appendChild(el); slot.classList.remove('active');
        
        state.session.lockedCount++; document.getElementById('epe-progress').innerText = state.session.lockedCount;
        const now = Date.now(); state.telemetry.pieceTimes[el.dataset.pieceId].endTime = now;
        state.telemetry.pieceTimes[el.dataset.pieceId].duration = now - state.telemetry.pieceTimes[el.dataset.pieceId].startTime;
        state.telemetry.sequence.push(el.dataset.pieceId);
        
        if(state.session.lockedCount === state.session.totalCount) setTimeout(() => finishSession(), 500);
    } else {
        el.style.position = 'relative'; el.style.left = '0'; el.style.top = '0'; document.getElementById('epe-tray').appendChild(el);
        state.telemetry.errors.total++; document.getElementById('epe-errors').innerText = state.telemetry.errors.total;
        
        const bRect = board.getBoundingClientRect(); 
        state.telemetry.errors.positions.push({ x: (px-bRect.left)/bRect.width, y: (py-bRect.top)/bRect.height });
        slot.classList.remove('active');
    }
}

function analyzePath(path) {
    if (path.length < 5) return;
    let tD = 0; for (let i=1; i<path.length; i++) tD += Math.sqrt(Math.pow(path[i].x-path[i-1].x,2) + Math.pow(path[i].y-path[i-1].y,2));
    const dD = Math.sqrt(Math.pow(path[path.length-1].x-path[0].x,2) + Math.pow(path[path.length-1].y-path[0].y,2));
    if (dD > 10) state.telemetry.path_ratios.push(tD / dD);
}

function startTimer() {
    state.session.timerInterval = setInterval(() => {
        const d = Math.floor((Date.now() - state.session.startTime) / 1000);
        const elem = document.getElementById('epe-timer');
        if(elem) elem.innerText = new Date(d*1000).toISOString().substr(14,5);
    }, 1000);
}

// --- DASHBOARD AND ANALYSIS ---
async function finishSession() {
    clearInterval(state.session.timerInterval); const dur = Date.now() - state.session.startTime;
    const aR = state.telemetry.path_ratios.length ? state.telemetry.path_ratios.reduce((a,b)=>a+b,0)/state.telemetry.path_ratios.length : 1;
    const pDurs = Object.values(state.telemetry.pieceTimes).map(p=>p.duration).filter(d=>d>0);
    const sessionData = {
        duration: dur, avgRatio: aR, errorCount: state.telemetry.errors.total,
        totalPieces: state.session.totalCount, lockedCount: state.session.lockedCount,
        avgPieceTime: pDurs.length ? pDurs.reduce((a,b)=>a+b,0)/pDurs.length : 0,
        totalAttempts: Object.values(state.telemetry.pieceTimes).reduce((s,p)=>s+p.attempts,0),
        metadata: state.session.metadata
    };
    buildDashboard(sessionData);
}

function buildDashboard(data) {
    const overlay = document.createElement('div');
    overlay.className = 'epe-overlay';
    
    let calibrationHTML = state.session.isCalibration ? `
        <div style="background:#fef3c7; border:2px solid #fbbf24; border-radius:12px; padding:18px; margin:15px auto; max-width:600px;">
            <div style="font-weight:700; color:#78350f; margin-bottom:8px; font-size:1rem;">Mode Latihan</div>
            <div style="font-size:0.9rem; color:#78350f;">Sesi ini untuk pengenalan alat. Data tidak dicatat.</div>
        </div>` : '';

    overlay.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h2 style="text-align:center; color:#1e293b; margin:0; flex:1;">Laporan Data Sesi</h2>
            <button class="epe-icon-btn" id="btn-close-dash" style="background:#fff1f2; color:#db2777; border-color:#fbcfe8;">✖ Keluar</button>
        </div>
        ${calibrationHTML}
        
        <div class="epe-metadata-box">
            <div class="epe-chart-title" style="text-align:left; border-bottom:none; margin-bottom:5px;">METADATA SESI</div>
            <div style="font-size: 0.9rem; color: #475569; line-height: 1.8;">
                Mode: <strong>${state.session.isCalibration ? 'Latihan' : 'Normal'}</strong><br>
                Pendamping: <strong>${data.metadata.supervised === 'yes' ? 'Ya' : 'Mandiri'}</strong><br>
                Waktu: <strong>${data.metadata.timeOfDay}</strong><br>
                Catatan: <em>${data.metadata.notes}</em>
            </div>
        </div>
        
        <div class="epe-chart-box">
            <div class="epe-chart-title">METRIK UTAMA</div>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:15px;">
                <div style="text-align:center;"><div class="epe-data-value">${Math.round(data.duration/1000)}s</div><div class="epe-data-label">Waktu Total</div></div>
                <div style="text-align:center;"><div class="epe-data-value">${(data.avgPieceTime/1000).toFixed(1)}s</div><div class="epe-data-label">Waktu/Keping</div></div>
                <div style="text-align:center;"><div class="epe-data-value">${data.avgRatio.toFixed(2)}</div><div class="epe-data-label">Rasio Lintasan</div></div>
                <div style="text-align:center;"><div class="epe-data-value" style="color:${data.totalAttempts > data.totalPieces * 2 ? CONFIG.COLORS.WARNING : CONFIG.COLORS.NEUTRAL}">${data.totalAttempts}</div><div class="epe-data-label">Total Percobaan</div></div>
            </div>
        </div>
        
        <div class="epe-chart-box"><div class="epe-chart-title">WAKTU PER KEPING</div><canvas id="chart-bar-time" style="width:100%; height:200px;"></canvas></div>
        <div class="epe-chart-box"><div class="epe-chart-title">EFISIENSI LINTASAN</div><canvas id="chart-line-ratio" style="width:100%; height:180px;"></canvas><div style="text-align:center; font-size:11px; color:#64748b; margin-top:10px;">* Angka 1.0 = Gerakan lurus sempurna. Angka lebih besar menunjukkan deviasi/tremor.</div></div>
        <div class="epe-chart-box"><div class="epe-chart-title">PETA PANAS KESULITAN</div><div id="heatmap-grid"></div></div>
        <div class="epe-chart-box"><div class="epe-chart-title">STRATEGI PENYELESAIAN</div><div class="epe-sequence-visual" id="sequence-viz"></div></div>
        <div class="epe-chart-box"><div class="epe-chart-title">DISTRIBUSI KESALAHAN SNAP</div><canvas id="chart-heatmap" style="width:200px; height:200px; margin:0 auto; display:block; border:2px dashed #cbd5e1; border-radius:8px;"></canvas></div>
        
        <div style="margin-top:30px; padding-bottom:30px; display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
            <button class="epe-btn" id="btn-retry">Ulangi Level</button>
            <button class="epe-btn" id="btn-change-level">Ganti Tingkat</button>
            <button class="epe-btn" style="border-color:#3b82f6; color:#3b82f6;" id="btn-change-cat">Ganti Kategori</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    setTimeout(() => {
        drawBarChart('chart-bar-time', state.telemetry.pieceTimes); drawLineChart('chart-line-ratio', state.telemetry.path_ratios);
        drawHeatmapGrid('heatmap-grid', state.telemetry.pieceTimes, state.config); drawSequenceViz('sequence-viz', state.telemetry.sequence);
        drawErrorHeatmap('chart-heatmap', state.telemetry.errors.positions);
    }, 100);
    
    // Nuke Button di Dashboard Akhir
    overlay.querySelector('#btn-close-dash').onclick = () => { nukeArtifacts(); if(typeof window.renderApp === 'function') window.renderApp(null); };
    
    overlay.querySelector('#btn-retry').onclick = () => { overlay.remove(); showMetadataForm(document.querySelector('.epe-root'), state.config.rows, state.config.cols); };
    overlay.querySelector('#btn-change-level').onclick = () => { overlay.remove(); showLevelSelector(document.querySelector('.epe-root'), state.assets.img); };
    overlay.querySelector('#btn-change-cat').onclick = () => { overlay.remove(); showCategorySelector(document.querySelector('.epe-root')); };
}

function drawBarChart(canvasId, pieceTimes) {
    const canvas = document.getElementById(canvasId); if(!canvas) return; const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.offsetWidth; const h = canvas.height = 200;
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, w, h);
    const entries = Object.entries(pieceTimes).filter(([id, data]) => data.duration > 0).map(([id, data]) => ({ id, duration: data.duration / 1000 }));
    if (entries.length === 0) { ctx.fillStyle = '#64748b'; ctx.font = '14px Arial'; ctx.textAlign = 'center'; ctx.fillText('Tidak ada data', w/2, h/2); return; }
    const maxDur = Math.max(...entries.map(e => e.duration)); const barWidth = (w - 40) / entries.length; const chartHeight = h - 60;
    entries.forEach((entry, i) => {
        const barHeight = (entry.duration / maxDur) * chartHeight; const x = 20 + i * barWidth; const y = h - 30 - barHeight;
        const intensity = entry.duration / maxDur;
        if (intensity < 0.5) ctx.fillStyle = CONFIG.COLORS.SUCCESS; else if (intensity < 0.8) ctx.fillStyle = CONFIG.COLORS.WARNING; else ctx.fillStyle = CONFIG.COLORS.ERROR;
        ctx.fillRect(x + 2, y, barWidth - 4, barHeight);
        ctx.fillStyle = '#475569'; ctx.font = '10px Arial'; ctx.textAlign = 'center'; ctx.fillText(entry.duration.toFixed(1) + 's', x + barWidth/2, y - 5); ctx.fillText(entry.id.replace('piece-',''), x + barWidth/2, h - 10);
    });
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(20, h - 30); ctx.lineTo(w - 20, h - 30); ctx.stroke();
}

function drawLineChart(canvasId, ratios) {
    const canvas = document.getElementById(canvasId); if(!canvas) return; const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.offsetWidth; const h = canvas.height = 180;
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, w, h);
    if (ratios.length === 0) { ctx.fillStyle = '#64748b'; ctx.font = '14px Arial'; ctx.textAlign = 'center'; ctx.fillText('Tidak ada data', w/2, h/2); return; }
    const baseY = h - 30; ctx.strokeStyle = '#94a3b8'; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(30, baseY); ctx.lineTo(w - 20, baseY); ctx.stroke();
    ctx.setLineDash([]); ctx.fillStyle = '#94a3b8'; ctx.font = '11px Arial'; ctx.fillText('1.0', 5, baseY + 4);
    const stepX = (w - 50) / Math.max(ratios.length - 1, 1); const mapY = (val) => baseY - ((Math.min(val, 5.0) - 1.0) / 4.0) * (h - 50);
    ctx.beginPath(); ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 3;
    ratios.forEach((val, i) => { const x = 30 + i * stepX; const y = mapY(Math.max(val, 1.0)); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }); ctx.stroke();
    ratios.forEach((val, i) => {
        const x = 30 + i * stepX; const y = mapY(Math.max(val, 1.0));
        if (val < 1.5) ctx.fillStyle = CONFIG.COLORS.SUCCESS; else if (val < 2.5) ctx.fillStyle = CONFIG.COLORS.WARNING; else ctx.fillStyle = CONFIG.COLORS.ERROR;
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    });
}

function drawHeatmapGrid(containerId, pieceTimes, config) {
    const container = document.getElementById(containerId); if(!container) return;
    container.className = 'epe-grid-visual'; container.style.gridTemplateColumns = `repeat(${config.cols}, 1fr)`; container.innerHTML = '';
    const durations = Object.entries(pieceTimes).filter(([id, data]) => data.duration > 0).map(([id, data]) => data.duration);
    const maxDur = Math.max(...durations, 1); const minDur = Math.min(...durations, 0);
    for (let r = 0; r < config.rows; r++) {
        for (let c = 0; c < config.cols; c++) {
            const data = pieceTimes[`piece-${r}-${c}`]; const cell = document.createElement('div'); cell.className = 'epe-grid-cell';
            if (data && data.duration > 0) {
                const normalized = (data.duration - minDur) / (maxDur - minDur);
                if (normalized < 0.3) cell.style.background = CONFIG.COLORS.SUCCESS; else if (normalized < 0.7) cell.style.background = CONFIG.COLORS.WARNING; else cell.style.background = CONFIG.COLORS.ERROR;
                cell.innerText = `${r},${c}`; cell.setAttribute('data-time', `${(data.duration/1000).toFixed(1)}s`);
            } else { cell.style.background = '#e2e8f0'; cell.style.color = '#94a3b8'; cell.innerText = `${r},${c}`; }
            container.appendChild(cell);
        }
    }
}

function drawSequenceViz(containerId, sequence) {
    const container = document.getElementById(containerId); if(!container) return; container.innerHTML = '';
    sequence.forEach((id, idx) => { const item = document.createElement('div'); item.className = 'epe-sequence-item'; item.innerHTML = `[${idx + 1}] ${id.replace('piece-', '')}`; container.appendChild(item); });
}

function drawErrorHeatmap(canvasId, positions) {
    const canvas = document.getElementById(canvasId); if(!canvas) return; const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#eff6ff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(251, 146, 60, 0.7)'; positions.forEach(pos => { ctx.beginPath(); ctx.arc(pos.x * canvas.width, pos.y * canvas.height, 6, 0, Math.PI * 2); ctx.fill(); });
    if (positions.length === 0) { ctx.fillStyle = '#64748b'; ctx.font = '13px Arial'; ctx.textAlign = 'center'; ctx.fillText('Tidak ada area meleset', canvas.width/2, canvas.height/2); }
}