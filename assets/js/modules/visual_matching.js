// visual_matching.js - V4 (UNIVERSAL TOUCH & DRAG EDITION)
// Features: Mobile/Tablet Touch Drag, Auto-hide Empty Categories, Clinical Metrics.
// Status: ISOLATED PROTOTYPE (Tidak menyimpan ke database utama).
// Pattern: Strict Standard Architecture.

import { supabase } from '../config.js';

// --- STATE MANAGEMENT ---
let rawData = [];
let masterCategories = [];
let appState = {
    view: 'SETUP', 
    config: { categoryId: null, optionsCount: 3, totalRounds: 5 },
    game: { rounds: [], currentRoundIdx: 0, roundStartTime: 0, currentRoundLog: null, sessionLogs: [] }
};

// Global Drag State untuk Mobile & Desktop
let dragObj = { id: null, card: null, clone: null, startX: 0, startY: 0 };

const ICONS = {
    PLAY: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="m7 4 12 8-12 8V4Z"/></svg>`,
    CHECK: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3"><path d="M20 6 9 17l-5-5"/></svg>`,
    CHART: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>`
};

// --- CSS INJECTION ---
const injectStyles = () => {
    if (document.getElementById('vm-styles')) return;
    const s = document.createElement('style');
    s.id = 'vm-styles';
    s.innerHTML = `
        .vm-app { --p: #4f46e5; --s: #10b981; --d: #ef4444; --slate: #64748b; --bg: #f8fafc; font-family: 'Inter', sans-serif; background: #fff; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
        .vm-app * { box-sizing: border-box; }
        .vm-nav { padding: 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #fff; }
        .vm-title { font-size: 1.2rem; font-weight: 800; color: #1e293b; display: flex; align-items: center; gap: 10px; }
        .vm-body { flex: 1; overflow-y: auto; padding: 20px; background: var(--bg); display:flex; flex-direction:column; align-items:center; }
        
        .setup-box { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 30px; width: 100%; max-width: 500px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); }
        .inp-grp { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
        .inp-grp label { font-size: 0.85rem; font-weight: 700; color: var(--slate); text-transform: uppercase; }
        .inp-box { padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 1rem; outline: none; transition: 0.2s; background: #f8fafc; width:100%; }
        
        .btn-start { width: 100%; padding: 15px; background: var(--p); color: white; border: none; border-radius: 12px; font-weight: 800; font-size: 1.1rem; cursor: pointer; display:flex; justify-content:center; align-items:center; gap:8px; transition:0.2s; }
        
        /* DROP ZONE */
        .target-zone { width: 220px; height: 220px; background: #e0e7ff; border: 4px dashed var(--p); border-radius: 20px; display: flex; align-items: center; justify-content: center; overflow: hidden; margin-bottom: 40px; box-shadow: inset 0 4px 6px rgba(0,0,0,0.05); transition: 0.3s; position: relative; }
        .target-zone img { width: 100%; height: 100%; object-fit: cover; opacity: 0.4; pointer-events: none; }
        .target-zone::after { content: "Tarik ke Sini"; position: absolute; font-weight: 900; color: var(--p); opacity: 0.8; pointer-events: none; background: rgba(255,255,255,0.7); padding: 5px 15px; border-radius: 8px; }
        .target-zone.drag-over { background: #c7d2fe; border-color: #4338ca; transform: scale(1.05); }
        .target-zone.drag-over::after { opacity: 0; }
        
        /* OPTION CARDS (Touch Enabled) */
        .options-grid { display: flex; gap: 20px; justify-content: center; flex-wrap: wrap; }
        .option-card { width: 140px; height: 140px; background: #fff; border: 2px solid #e2e8f0; border-radius: 16px; display: flex; align-items: center; justify-content: center; overflow: hidden; cursor: grab; box-shadow: 0 4px 6px rgba(0,0,0,0.05); 
            touch-action: none; /* KUNCI UNTUK MOBILE: Cegah scroll saat menyentuh kartu */
            user-select: none;
        }
        .option-card img { width: 100%; height: 100%; object-fit: cover; pointer-events: none; }
        
        @keyframes shake { 0%, 100% {transform: translateX(0);} 25% {transform: translateX(-8px);} 75% {transform: translateX(8px);} }
        .anim-shake { animation: shake 0.4s; border-color: var(--d); background: #fef2f2; }
        .anim-correct { border-color: var(--s); background: #f0fdf4; transform: scale(1.1); box-shadow: 0 10px 25px rgba(16,185,129,0.4); z-index: 10;}
        
        .success-overlay { position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(255,255,255,0.9); z-index: 2000; display:flex; flex-direction:column; align-items:center; justify-content:center; opacity:0; pointer-events:none; transition:0.3s; }
        .success-overlay.show { opacity: 1; pointer-events:auto; }

        .report-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; width: 100%; max-width: 800px; margin-bottom:30px;}
        .metric-card { background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:20px; text-align:center; box-shadow:0 4px 6px rgba(0,0,0,0.02);}
        .metric-val { font-size:2rem; font-weight:900; color:var(--p); margin:10px 0 5px 0;}
        .metric-label { font-size:0.85rem; color:var(--slate); font-weight:700; text-transform:uppercase;}
        
        .error-table { width: 100%; max-width: 800px; background:#fff; border:1px solid #e2e8f0; border-radius:12px; border-collapse: collapse; overflow:hidden;}
        .error-table th { background:#f8fafc; padding:15px; text-align:left; font-size:0.85rem; color:var(--slate); font-weight:800; border-bottom:1px solid #e2e8f0;}
        .error-table td { padding:15px; border-bottom:1px solid #f1f5f9; font-size:0.95rem; font-weight:600; color:#1e293b;}
    `;
    document.head.appendChild(s);
};

// --- ENTRY POINT ---
export async function renderVisualMatching(containerId) {
    injectStyles();
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `<div class="vm-app" id="vm-app-root"><div style="padding:40px; text-align:center;">Memuat Mesin Klinis...</div></div>`;
    
    // Window Globals Registration
    window.vm_startGame = startGame;
    window.vm_resetSetup = () => { appState.view = 'SETUP'; renderRouter(); };
    window.vm_ptrDown = ptrDown;

    await fetchData();
    renderRouter();
}

// --- UNIVERSAL TOUCH & DRAG ENGINE ---
function ptrDown(e, id) {
    e.preventDefault();
    dragObj.id = id;
    dragObj.card = document.getElementById(`opt-${id}`);
    
    // Buat bayangan kartu agar yang asli tetap di bawah
    const rect = dragObj.card.getBoundingClientRect();
    dragObj.clone = dragObj.card.cloneNode(true);
    dragObj.clone.id = `clone-${id}`;
    dragObj.clone.style.position = 'fixed';
    dragObj.clone.style.left = `${rect.left}px`;
    dragObj.clone.style.top = `${rect.top}px`;
    dragObj.clone.style.width = `${rect.width}px`;
    dragObj.clone.style.height = `${rect.height}px`;
    dragObj.clone.style.margin = '0';
    dragObj.clone.style.zIndex = '9999';
    dragObj.clone.style.pointerEvents = 'none'; // Tembus sentuhan
    dragObj.clone.style.transform = 'scale(1.1)';
    dragObj.clone.style.opacity = '0.9';
    dragObj.clone.style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.2)';
    document.body.appendChild(dragObj.clone);

    dragObj.startX = e.clientX;
    dragObj.startY = e.clientY;
    dragObj.card.style.opacity = '0.2'; // Redupkan yang asli

    // Daftarkan pemantau gesekan
    document.addEventListener('pointermove', ptrMove, { passive: false });
    document.addEventListener('pointerup', ptrUp);
}

function ptrMove(e) {
    if(!dragObj.clone) return;
    e.preventDefault(); // Cegah scroll layar
    
    const dx = e.clientX - dragObj.startX;
    const dy = e.clientY - dragObj.startY;
    dragObj.clone.style.transform = `translate(${dx}px, ${dy}px) scale(1.1)`;

    // Cek apakah jari berada di atas zona target
    const dropZone = document.getElementById('drop-zone');
    const rect = dropZone.getBoundingClientRect();
    if(e.clientX > rect.left && e.clientX < rect.right && e.clientY > rect.top && e.clientY < rect.bottom) {
        dropZone.classList.add('drag-over');
    } else {
        dropZone.classList.remove('drag-over');
    }
}

function ptrUp(e) {
    if(!dragObj.clone) return;
    document.removeEventListener('pointermove', ptrMove);
    document.removeEventListener('pointerup', ptrUp);

    const dropZone = document.getElementById('drop-zone');
    const rect = dropZone.getBoundingClientRect();
    
    // Validasi titik lepas jari
    const isInside = (e.clientX > rect.left && e.clientX < rect.right && e.clientY > rect.top && e.clientY < rect.bottom);

    dropZone.classList.remove('drag-over');
    dragObj.clone.remove(); // Hapus bayangan
    dragObj.card.style.opacity = '1'; // Kembalikan kartu asli

    if(isInside) {
        checkAnswer(dragObj.id); // Panggil fungsi cek jawaban
    }

    dragObj = { id: null, card: null, clone: null, startX: 0, startY: 0 }; // Reset
}

// --- DATA FETCHING ---
async function fetchData() {
    try {
        const { data: c, error: cErr } = await supabase.from('es_game_categories').select('*');
        if(cErr) throw cErr;
        
        const { data: i, error: iErr } = await supabase.from('es_game_items').select(`
            id, item_name, category_id,
            es_game_assets ( public_url, media_type )
        `).eq('is_published', true);
        if(iErr) throw iErr;
        
        rawData = (i || []).filter(item => item.es_game_assets && item.es_game_assets.some(a => a.media_type === 'IMAGE'));
        
        // Filter Kategori Kosong
        const categoriesWithItems = new Set(rawData.map(item => item.category_id));
        masterCategories = (c || []).filter(cat => categoriesWithItems.has(cat.id));
    } catch (e) {
        alert("Gagal memuat database: " + e.message);
    }
}

// --- ROUTER & VIEW RENDERER ---
function renderRouter() {
    const root = document.getElementById('vm-app-root');
    if (!root) return;

    if (appState.view === 'SETUP') {
        if(masterCategories.length === 0) {
            root.innerHTML = `<div style="padding:40px; text-align:center;">Belum ada kategori yang memiliki aset gambar valid.</div>`;
            return;
        }

        root.innerHTML = `
            <div class="vm-nav"><div class="vm-title">🧩 Dasbor Terapis: Setup Visual Matching</div></div>
            <div class="vm-body">
                <div class="setup-box">
                    <div class="inp-grp">
                        <label>Target Kategori</label>
                        <select id="vm-cat" class="inp-box">
                            ${masterCategories.map(c => {
                                const categoryName = c.name || c.category_name || 'Tanpa Nama';
                                return `<option value="${c.id}">${categoryName}</option>`;
                            }).join('')}
                        </select>
                    </div>
                    <div class="inp-grp">
                        <label>Tingkat Kesulitan</label>
                        <select id="vm-options" class="inp-box">
                            <option value="2">Level 1 (2 Gambar)</option>
                            <option value="3" selected>Level 2 (3 Gambar)</option>
                            <option value="4">Level 3 (4 Gambar)</option>
                        </select>
                    </div>
                    <div class="inp-grp">
                        <label>Jumlah Ronde</label>
                        <input type="number" id="vm-rounds" class="inp-box" value="5" min="1" max="20">
                    </div>
                    <button class="btn-start" onclick="window.vm_startGame()">${ICONS.PLAY} MULAI SESI ABK</button>
                </div>
            </div>
        `;
    } else if (appState.view === 'PLAY') {
        const r = appState.game.rounds[appState.game.currentRoundIdx];
        const targetImg = r.target.es_game_assets.find(a => a.media_type === 'IMAGE').public_url;
        
        root.innerHTML = `
            <div class="vm-nav">
                <div style="font-weight:800; color:var(--slate);">Ronde ${appState.game.currentRoundIdx + 1} / ${appState.config.totalRounds}</div>
                <button class="btn-start" style="width:auto; padding:8px 15px; font-size:0.85rem; background:#f1f5f9; color:var(--d);" onclick="window.vm_resetSetup()">Batal Sesi</button>
            </div>
            <div class="vm-body" style="justify-content:center;">
                
                <div class="target-zone" id="drop-zone"><img src="${targetImg}"></div>
                
                <div class="options-grid">
                    ${r.options.map(opt => {
                        const img = opt.es_game_assets.find(a => a.media_type === 'IMAGE').public_url;
                        return `
                        <div class="option-card" id="opt-${opt.id}"
                             onpointerdown="window.vm_ptrDown(event, '${opt.id}')">
                            <img src="${img}">
                        </div>`;
                    }).join('')}
                </div>
            </div>
            <div class="success-overlay" id="vm-success">${ICONS.CHECK}</div>
        `;
        appState.game.roundStartTime = Date.now();
    } else if (appState.view === 'REPORT') {
        root.innerHTML = renderReport();
    }
}

// --- ENGINE LOGIC ---
function startGame() {
    const catId = document.getElementById('vm-cat').value;
    const optCount = parseInt(document.getElementById('vm-options').value);
    const totalRounds = parseInt(document.getElementById('vm-rounds').value);

    const catItems = rawData.filter(x => x.category_id === catId);
    if(catItems.length < 2) return alert("Aset kurang dari 2. Tambah aset!");

    appState.config = { categoryId: catId, optionsCount: optCount, totalRounds: totalRounds };
    appState.game = { rounds: [], currentRoundIdx: 0, sessionLogs: [] };

    for(let i=0; i<totalRounds; i++) {
        const target = catItems[Math.floor(Math.random() * catItems.length)];
        let distractors = rawData.filter(x => x.id !== target.id);
        distractors = distractors.sort(() => 0.5 - Math.random()).slice(0, optCount - 1);
        
        let options = [target, ...distractors].sort(() => 0.5 - Math.random());
        appState.game.rounds.push({ target, options });
    }

    startNewRoundLog();
    appState.view = 'PLAY'; 
    renderRouter();
}

function startNewRoundLog() {
    appState.game.currentRoundLog = { firstAttemptCorrect: true, latencyMs: 0, mistakes: [] };
}

function checkAnswer(selectedId) {
    const r = appState.game.rounds[appState.game.currentRoundIdx];
    const card = document.getElementById(`opt-${selectedId}`);
    const timeTaken = Date.now() - appState.game.roundStartTime;

    if (selectedId === r.target.id) {
        if(card) card.classList.add('anim-correct');
        appState.game.currentRoundLog.latencyMs = timeTaken;
        appState.game.sessionLogs.push(appState.game.currentRoundLog);
        
        document.getElementById('vm-success').classList.add('show');
        
        setTimeout(() => {
            appState.game.currentRoundIdx++;
            if(appState.game.currentRoundIdx >= appState.config.totalRounds) {
                appState.view = 'REPORT'; 
            } else {
                startNewRoundLog();
            }
            renderRouter();
        }, 1200);

    } else {
        if(card) {
            card.classList.add('anim-shake');
            setTimeout(() => card.classList.remove('anim-shake'), 400);
        }
        const wrongItem = rawData.find(x => x.id === selectedId);
        appState.game.currentRoundLog.firstAttemptCorrect = false;
        appState.game.currentRoundLog.mistakes.push({
            selectedId: selectedId,
            selectedName: wrongItem ? wrongItem.item_name : 'Unknown',
            timeTaken: timeTaken
        });
    }
}

// --- POST-SESSION REPORT ---
function renderReport() {
    const logs = appState.game.sessionLogs;
    const total = logs.length;
    const correctFirstAttempts = logs.filter(l => l.firstAttemptCorrect).length;
    const accuracy = Math.round((correctFirstAttempts / total) * 100);
    const avgLatencyMs = logs.reduce((sum, l) => sum + l.latencyMs, 0) / total;
    const avgLatencySec = (avgLatencyMs / 1000).toFixed(1);

    let errorRows = '';
    logs.forEach((log, idx) => {
        if(!log.firstAttemptCorrect) {
            const targetName = appState.game.rounds[idx].target.item_name;
            const mistakesStr = log.mistakes.map(m => `<span style="color:var(--d);">${m.selectedName}</span>`).join(', ');
            errorRows += `<tr><td>Ronde ${idx+1}</td><td>${targetName}</td><td>${mistakesStr}</td></tr>`;
        }
    });

    return `
        <div class="vm-nav">
            <div class="vm-title">${ICONS.CHART} Laporan Hasil Sesi</div>
            <button class="btn-start" style="width:auto; padding:8px 15px; font-size:0.85rem;" onclick="window.vm_resetSetup()">SELESAI</button>
        </div>
        <div class="vm-body" style="align-items:center;">
            <div class="report-grid">
                <div class="metric-card">
                    <div class="metric-label">Akurasi Visual</div>
                    <div class="metric-val" style="color:${accuracy >= 80 ? 'var(--s)' : 'var(--p)'};">${accuracy}%</div>
                    <div style="font-size:0.8rem; color:var(--slate);">(${correctFirstAttempts} dari ${total} Langsung Benar)</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Kecepatan Respon</div>
                    <div class="metric-val">${avgLatencySec}s</div>
                    <div style="font-size:0.8rem; color:var(--slate);">Rata-rata</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Kemandirian</div>
                    <div class="metric-val" style="color:var(--slate);">${correctFirstAttempts} / ${total}</div>
                </div>
            </div>
            ${errorRows ? `
            <table class="error-table">
                <thead><tr><th style="width:100px;">Soal</th><th>Target</th><th>Salah Menarik</th></tr></thead>
                <tbody>${errorRows}</tbody>
            </table>
            ` : `<div style="padding:20px; background:#f0fdf4; color:var(--s); border-radius:12px; font-weight:800; border:1px solid #bbf7d0; text-align:center; width:100%; max-width:800px;">🎉 Sempurna! Selesai tanpa kesalahan.</div>`}
        </div>
    `;
}