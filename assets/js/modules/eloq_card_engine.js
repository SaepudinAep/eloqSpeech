// eloq_card_engine.js
// Clinical Grade Memory Game Engine (Enrichment Version)
// Features: Latency Tracking, Perseveration Check, Auto-Prompting (SOP), Asset Selector, Pre-Flight & Dashboard
// ENRICHMENT: Intra-Session Analytics, Gradual Difficulty (2x2 to 5x2), & Global SPA Exit

import { supabase } from '../config.js';

// --- 0. GLOBAL SPA EXIT FUNCTION ---
window.eceExitModule = () => {
    if(state.gameTimerInterval) clearInterval(state.gameTimerInterval);
    if(state.promptTimer) clearTimeout(state.promptTimer);
    
    // Safely unmount and call router exit (Acoustic Engine standard)
    const container = document.querySelector('.ece-root')?.parentElement;
    if(container) container.innerHTML = '';
    if(typeof window.renderApp === 'function') window.renderApp(null);
};

// --- 1. ENCAPSULATED STYLES (CSS INJECTION) ---
const STYLES = `
    .ece-root { font-family: 'Inter', sans-serif; text-align: center; padding: 20px; background: #f8fafc; border-radius: 16px; min-height: 500px; position: relative; }
    .ece-overlay { position: absolute; top:0; left:0; right:0; bottom:0; background: rgba(255,255,255,0.98); z-index: 10; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 16px; padding: 20px; }
    
    .ece-cat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px; width: 80%; max-width: 800px; margin: 0 auto; }
    .ece-cat-card { background: white; border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px; cursor: pointer; transition: 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .ece-cat-card:hover { transform: translateY(-5px); border-color: #3b82f6; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
    
    /* Pre-Flight Form */
    .ece-form-box { background: white; border: 1px solid #cbd5e1; padding: 25px; border-radius: 12px; width: 100%; max-width: 400px; text-align: left; }
    .ece-form-group { margin-bottom: 15px; }
    .ece-form-group label { display: block; font-weight: bold; margin-bottom: 5px; font-size: 0.9em; color: #334155; }
    .ece-select { width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; font-family: inherit; background: #f8fafc; }
    .ece-btn { width: 100%; padding: 12px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; margin-top: 10px; transition: 0.2s; }
    .ece-btn:hover { background: #2563eb; }

    /* Game Grid */
    .ece-game-grid { display: grid; gap: 15px; margin: 20px auto; max-width: 800px; }
    .ece-card { aspect-ratio: 1; perspective: 1000px; cursor: pointer; }
    .ece-card-inner { position: relative; width: 100%; height: 100%; text-align: center; transition: transform 0.6s; transform-style: preserve-3d; }
    .ece-card.flipped .ece-card-inner { transform: rotateY(180deg); }
    .ece-card-front, .ece-card-back { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 2px solid #cbd5e1; }
    .ece-card-front { background: #3b82f6; color: white; font-size: 2em; transition: 0.3s; }
    .ece-card-back { background: white; border: 2px solid #3b82f6; transform: rotateY(180deg); }
    .ece-card-back img { width: 80%; height: 80%; object-fit: contain; }
    
    /* ENRICHMENT: Visual Hint (Errorless Learning) */
    .ece-card.seen-hint .ece-card-front { background: #fffbeb !important; border: 3px solid #f59e0b !important; color: #f59e0b !important; }

    /* Clinical Feedback */
    .ece-shake { animation: shake 0.5s; }
    .ece-glow { box-shadow: 0 0 15px #facc15; border-color: #facc15; }
    @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }

    /* ENRICHMENT: Dashboard Charts */
    .ece-dash { max-width: 650px; margin: 0 auto; background: white; padding: 20px; border-radius: 12px; border: 1px solid #cbd5e1; text-align: left; }
    .ece-chart-row { display: flex; align-items: center; margin-bottom: 15px; }
    .ece-chart-lbl { width: 40%; font-size: 0.85em; font-weight: bold; color: #475569; }
    .ece-chart-bar-bg { flex: 1; height: 12px; background: #e2e8f0; border-radius: 6px; margin: 0 15px; overflow: hidden; }
    .ece-chart-fill { height: 100%; border-radius: 6px; transition: width 1s; }
    .ece-chart-val { width: 15%; font-weight: bold; text-align: right; }

    /* ENRICHMENT: Analytics UI */
    .ece-svg-container { width: 100%; height: 120px; background: #f1f5f9; border-radius: 8px; position: relative; overflow: visible; margin-top: 10px; border: 1px solid #e2e8f0; }
    .ece-dash-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
    .ece-metric-box { background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
    .ece-metric-box h4 { margin: 0 0 8px 0; font-size: 0.85em; color: #64748b; text-transform: uppercase; }
`;

// --- 2. GAME STATE (CLINICAL METRICS) ---
let state = {
    config: {
        pairs: 3, // Default Level 2 (3x2)
        cols: 3,
        visualHint: false
    },
    
    cards: [],
    flippedIndices: [],
    matchedPairs: 0,
    totalPairs: 0,
    isLocked: false,
    
    startTime: 0,
    gameTimerInterval: null,
    
    metrics: {
        clickCount: 0,
        impulsiveClicks: 0,
        perseverationErrors: 0,
        promptLevelMax: 0,
        latencyTotal: 0
    },
    
    lastClickTime: 0,
    lastMistakePair: null,
    promptTimer: null,
    idleSeconds: 0,

    // ENRICHMENT: Intra-Session Analytics Tracker
    itemTracker: {}, 
    matchHistory: [], 
    lastMatchClickCount: 0 
};

// --- 3. MOUNT FUNCTION ---
export async function renderEloqCardEngine(containerId) {
    if (!document.getElementById('ece-styles')) {
        const s = document.createElement('style'); s.id = 'ece-styles'; s.innerHTML = STYLES; document.head.appendChild(s);
    }

    const container = document.getElementById(containerId);
    container.innerHTML = `<div class="ece-root">⏳ Memuat Logika Klinis...</div>`;

    await showCategorySelector(container);
}

// --- 4. ASSET SELECTION ---
async function showCategorySelector(container) {
    try {
        const { data: cats, error: catError } = await supabase.from('es_game_categories').select('*');
        if (catError) throw catError;
        
        let html = `
            <div class="ece-root">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; width:80%; max-width:800px; margin-left:auto; margin-right:auto;">
                    <h2 style="margin:0;">Pilih Topik Latihan Memori</h2>
                    <button class="ece-btn" style="width:auto; margin:0; padding:8px 15px; background:#ef4444;" onclick="window.eceExitModule()">✖ Keluar</button>
                </div>
                <div class="ece-cat-grid" id="ece-cat-list">Loading...</div>
            </div>
        `;
        container.innerHTML = html;
        const list = document.getElementById('ece-cat-list');
        list.innerHTML = '';

        for (const cat of cats) {
            const { count, error: countError } = await supabase.from('es_game_items').select('*', { count: 'exact', head: true }).eq('category_id', cat.id);
            if (countError) throw countError;
            
            // ENRICHMENT: Syarat minimum kini turun menjadi 2 aset untuk melayani Grid 2x2
            if (count >= 2) { 
                const el = document.createElement('div');
                el.className = 'ece-cat-card';
                el.innerHTML = `<div style="font-size:2em; margin-bottom:10px;">${cat.icon_url || '📁'}</div><b>${cat.name}</b><br><small>${count} Aset</small>`;
                
                el.onclick = () => showPreFlightForm(container, cat.id, cat.name);
                list.appendChild(el);
            }
        }
    } catch (err) {
        container.innerHTML = `<div class="ece-root" style="color:red; font-weight:bold;">❌ Gagal Memuat Data: ${err.message}</div>`;
    }
}

// --- ENRICHMENT 1: PRE-FLIGHT FORM (GRADUAL DIFFICULTY) ---
function showPreFlightForm(container, categoryId, catName) {
    container.innerHTML = `
        <div class="ece-root">
            <div class="ece-overlay">
                <h2 style="margin-top:0;">Dosis Terapi: ${catName}</h2>
                <div class="ece-form-box">
                    <div class="ece-form-group">
                        <label>Tingkat Kesulitan (Ukuran Grid)</label>
                        <select id="ece-level" class="ece-select">
                            <option value="1">Level 1 (Grid 2x2 - 4 Kartu)</option>
                            <option value="2" selected>Level 2 (Grid 3x2 - 6 Kartu)</option>
                            <option value="3">Level 3 (Grid 4x2 - 8 Kartu)</option>
                            <option value="4">Level 4 (Grid 5x2 - 10 Kartu)</option>
                        </select>
                    </div>
                    <div class="ece-form-group">
                        <label>Bantuan Jejak Visual (Errorless Learning)</label>
                        <select id="ece-hint" class="ece-select">
                            <option value="false" selected>Standar (Tanpa Bantuan)</option>
                            <option value="true">Aktif (Tandai kartu yang pernah salah)</option>
                        </select>
                    </div>
                    <button class="ece-btn" onclick="window.eceStartEngine('${container.id}', '${categoryId}')">MULAI TERAPI</button>
                    <button class="ece-btn" style="background:white; color:#64748b; border:1px solid #cbd5e1;" onclick="window.renderEloqCardEngine('${container.id}')">Kembali ke Menu</button>
                </div>
            </div>
        </div>
    `;

    window.eceStartEngine = (cId, catId) => {
        const lvl = document.getElementById('ece-level').value;
        // ENRICHMENT INJEKSI: Konfigurasi Grid Bertahap Baru
        if(lvl === '1') { state.config.pairs = 2; state.config.cols = 2; }
        else if(lvl === '2') { state.config.pairs = 3; state.config.cols = 3; }
        else if(lvl === '3') { state.config.pairs = 4; state.config.cols = 4; }
        else { state.config.pairs = 5; state.config.cols = 5; }
        
        state.config.visualHint = document.getElementById('ece-hint').value === 'true';
        
        prepareGame(document.getElementById(cId), catId);
    };
}

// --- 5. GAME PREPARATION ---
async function prepareGame(container, categoryId) {
    try {
        container.innerHTML = `<div class="ece-root">⏳ Menyiapkan Aset...</div>`;

        const { data: items, error } = await supabase.from('es_game_items').select('*, es_game_assets(*)').eq('category_id', categoryId);
        if (error) throw error;

        const validItems = items.filter(item => item.es_game_assets && item.es_game_assets.some(a => a.media_type === 'IMAGE' && a.public_url));

        if (validItems.length < state.config.pairs) {
            alert(`⚠️ Aset gambar tidak cukup. Butuh ${state.config.pairs} gambar unik untuk level ini, hanya ada ${validItems.length}.`);
            await showCategorySelector(container);
            return;
        }

        const selected = validItems.sort(() => 0.5 - Math.random()).slice(0, state.config.pairs);
        
        state.itemTracker = {};
        selected.forEach(item => {
            let color = "Tidak Diketahui";
            if (item.item_metadata) {
                try {
                    const meta = typeof item.item_metadata === 'string' ? JSON.parse(item.item_metadata) : item.item_metadata;
                    color = meta.warna || "Tidak Diketahui";
                } catch(e) {}
            }
            state.itemTracker[item.id] = { name: item.item_name, color: color, penalties: 0 };
        });

        let deck = [...selected, ...selected];
        deck.sort(() => 0.5 - Math.random());

        state.cards = deck;
        state.totalPairs = selected.length;
        state.matchedPairs = 0;
        state.startTime = Date.now();
        state.metrics = { clickCount: 0, impulsiveClicks: 0, perseverationErrors: 0, promptLevelMax: 0, latencyTotal: 0 };
        state.lastClickTime = Date.now();
        state.idleSeconds = 0;
        
        state.matchHistory = [];
        state.lastMatchClickCount = 0;
        
        renderGame(container);
        startPromptTimer();

    } catch (err) {
        container.innerHTML = `<div class="ece-root" style="color:red; font-weight:bold;">❌ Gagal Menyiapkan Game: ${err.message}</div>`;
    }
}

// --- 6. RENDER GAME UI ---
function renderGame(container) {
    let gridHtml = state.cards.map((item, index) => {
        const imgObj = item.es_game_assets.find(a => a.media_type === 'IMAGE');
        const imgUrl = imgObj ? imgObj.public_url : '';
        return `
            <div class="ece-card" id="card-${index}" onclick="window.eceCardClick(${index})">
                <div class="ece-card-inner">
                    <div class="ece-card-front">?</div>
                    <div class="ece-card-back"><img src="${imgUrl}"></div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="ece-root">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; font-weight:bold; max-width:800px; margin-left:auto; margin-right:auto;">
                <button class="ece-btn" style="width:auto; margin:0; padding:8px 15px; background:#ef4444;" onclick="window.eceExitModule()">✖ Akhiri Sesi</button>
                <span style="color:#475569;">⏱️ <span id="ece-timer">00:00</span></span>
                <span id="ece-feedback" style="color:#3b82f6;">Skor: <span id="ece-score">0</span> / ${state.totalPairs}</span>
            </div>
            <div class="ece-game-grid" style="grid-template-columns: repeat(${state.config.cols}, 1fr);">
                ${gridHtml}
            </div>
        </div>
    `;

    window.eceCardClick = handleCardClick;
    
    if(state.gameTimerInterval) clearInterval(state.gameTimerInterval);
    state.gameTimerInterval = setInterval(() => {
        const seconds = Math.floor((Date.now() - state.startTime) / 1000);
        state.idleSeconds++;
        const m = String(Math.floor(seconds / 60)).padStart(2, '0');
        const s = String(seconds % 60).padStart(2, '0');
        const timerEl = document.getElementById('ece-timer');
        if(timerEl) timerEl.innerText = `${m}:${s}`;
    }, 1000);
}

// --- 7. CORE LOGIC ---
function handleCardClick(index) {
    if (state.isLocked) return;
    if (state.flippedIndices.includes(index)) return;
    if (document.getElementById(`card-${index}`).classList.contains('matched')) return;

    const now = Date.now();
    
    if (state.lastClickTime > 0) {
        const diff = now - state.lastClickTime;
        if (diff < 300) state.metrics.impulsiveClicks++;
        state.metrics.latencyTotal += diff;
    }
    
    state.lastClickTime = now;
    state.metrics.clickCount++;
    state.idleSeconds = 0; 

    resetPromptTimer();

    document.getElementById(`card-${index}`).classList.add('flipped');
    state.flippedIndices.push(index);

    if (state.flippedIndices.length === 2) {
        state.isLocked = true;
        setTimeout(checkForMatch, 500); 
    }
}

function checkForMatch() {
    const [idx1, idx2] = state.flippedIndices;
    const card1 = state.cards[idx1];
    const card2 = state.cards[idx2];

    if (card1.id === card2.id) {
        const clicksTaken = state.metrics.clickCount - state.lastMatchClickCount;
        state.matchHistory.push(clicksTaken);
        state.lastMatchClickCount = state.metrics.clickCount; 

        document.getElementById(`card-${idx1}`).classList.add('matched');
        document.getElementById(`card-${idx2}`).classList.add('matched');
        state.matchedPairs++;
        state.flippedIndices = [];
        state.isLocked = false;
        state.lastMistakePair = null;
        
        document.getElementById('ece-score').innerText = state.matchedPairs;
        if (state.matchedPairs === state.totalPairs) finishGame();
    } else {
        state.itemTracker[card1.id].penalties += 1;
        if (card1.id !== card2.id) state.itemTracker[card2.id].penalties += 1;

        const currentPairKey = [card1.id, card2.id].sort().join('-');
        if (state.lastMistakePair === currentPairKey) state.metrics.perseverationErrors++;
        state.lastMistakePair = currentPairKey;

        setTimeout(() => {
            const el1 = document.getElementById(`card-${idx1}`);
            const el2 = document.getElementById(`card-${idx2}`);
            el1.classList.remove('flipped');
            el2.classList.remove('flipped');
            
            if (state.config.visualHint) {
                el1.classList.add('seen-hint');
                el2.classList.add('seen-hint');
            }
            
            state.flippedIndices = [];
            state.isLocked = false;
        }, 1500);
    }
}

// --- 8. PROMPTING SYSTEM ---
function startPromptTimer() {
    clearTimeout(state.promptTimer);
    state.promptTimer = setTimeout(() => {
        triggerPrompt(1);
        state.promptTimer = setTimeout(() => { triggerPrompt(2); }, 5000); 
    }, 5000);
}

function resetPromptTimer() {
    document.querySelectorAll('.ece-card').forEach(el => el.classList.remove('ece-shake', 'ece-glow'));
    startPromptTimer();
}

function triggerPrompt(level) {
    const availableIndex = state.cards.findIndex((c, i) => !document.getElementById(`card-${i}`).classList.contains('matched') && !document.getElementById(`card-${i}`).classList.contains('flipped'));
    if (availableIndex === -1) return;

    const el = document.getElementById(`card-${availableIndex}`);
    if (level === 1) {
        el.classList.add('ece-shake');
        state.metrics.promptLevelMax = Math.max(state.metrics.promptLevelMax, 1);
    } else if (level === 2) {
        el.classList.add('ece-glow');
        state.metrics.promptLevelMax = Math.max(state.metrics.promptLevelMax, 2);
    }
}

// --- 9. FINISH & DASHBOARD (PURE RAW DATA VISUALIZATION) ---
function finishGame() {
    if(state.gameTimerInterval) clearInterval(state.gameTimerInterval);
    if(state.promptTimer) clearTimeout(state.promptTimer);
    
    const duration = Math.round((Date.now() - state.startTime) / 1000);
    const avgLatency = state.metrics.clickCount > 0 ? Math.round(state.metrics.latencyTotal / state.metrics.clickCount) : 0;
    
    const errPct = Math.min(100, (state.metrics.perseverationErrors / 5) * 100);
    const impPct = Math.min(100, (state.metrics.impulsiveClicks / 10) * 100);
    const errColor = state.metrics.perseverationErrors === 0 ? '#10b981' : '#ef4444';
    const impColor = state.metrics.impulsiveClicks > 3 ? '#ef4444' : (state.metrics.impulsiveClicks > 0 ? '#f59e0b' : '#10b981');

    // 1. Kalkulasi SVG (Learning Curve)
    const maxClicks = Math.max(...state.matchHistory, 10);
    const points = state.matchHistory.map((clicks, index) => {
        const x = state.totalPairs > 1 ? (index / (state.totalPairs - 1)) * 100 : 50;
        const y = 100 - ((clicks / maxClicks) * 100);
        return `${x},${y}`;
    }).join(' ');

    // 2. Kalkulasi Kesalahan per Objek
    let itemErrorsHtml = '';
    const itemArray = Object.values(state.itemTracker).filter(item => item.penalties > 0).sort((a, b) => b.penalties - a.penalties);
    if (itemArray.length > 0) {
        const maxItemPen = itemArray[0].penalties;
        itemErrorsHtml = itemArray.map(item => {
            const pct = (item.penalties / Math.max(maxItemPen, 1)) * 100;
            return `
                <div class="ece-chart-row" style="margin-bottom:8px; font-size:0.85em;">
                    <div class="ece-chart-lbl" style="width:30%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.name}</div>
                    <div class="ece-chart-bar-bg" style="height:14px; background:#f1f5f9; border-radius:4px; margin:0 10px;"><div class="ece-chart-fill" style="width:${pct}%; background:#ef4444; border-radius:4px;"></div></div>
                    <div class="ece-chart-val" style="width:10%;">${item.penalties}x</div>
                </div>
            `;
        }).join('');
    } else {
        itemErrorsHtml = `<div style="font-size:0.85em; color:#10b981; margin-bottom:10px;">Tidak ada kesalahan spesifik objek.</div>`;
    }

    // 3. Kalkulasi Kesalahan per Warna
    let colorTally = {};
    Object.values(state.itemTracker).forEach(item => {
        if (item.color !== "Tidak Diketahui" && item.penalties > 0) {
            if(!colorTally[item.color]) colorTally[item.color] = 0;
            colorTally[item.color] += item.penalties;
        }
    });

    let colorErrorsHtml = '';
    const colorArray = Object.keys(colorTally).map(key => ({ color: key, penalties: colorTally[key] })).sort((a, b) => b.penalties - a.penalties);
    if (colorArray.length > 0) {
        const maxColorPen = colorArray[0].penalties;
        colorErrorsHtml = colorArray.map(item => {
            const pct = (item.penalties / Math.max(maxColorPen, 1)) * 100;
            return `
                <div class="ece-chart-row" style="margin-bottom:8px; font-size:0.85em;">
                    <div class="ece-chart-lbl" style="width:30%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.color}</div>
                    <div class="ece-chart-bar-bg" style="height:14px; background:#f1f5f9; border-radius:4px; margin:0 10px;"><div class="ece-chart-fill" style="width:${pct}%; background:#f59e0b; border-radius:4px;"></div></div>
                    <div class="ece-chart-val" style="width:10%;">${item.penalties}x</div>
                </div>
            `;
        }).join('');
    } else {
        colorErrorsHtml = `<div style="font-size:0.85em; color:#10b981; margin-bottom:10px;">Tidak ada kesalahan spesifik warna.</div>`;
    }

    const container = document.querySelector('.ece-root').parentElement;
    
    // RENDER: Dasbor Murni Data Visual
    container.innerHTML = `
        <div class="ece-root">
            <h2 style="color:#1e293b; margin-top:0;">Rekam Medis Sesi Klinis</h2>
            <p style="color:#64748b; margin-bottom:20px;">Durasi Total: <b>${duration} Detik</b> | Waktu Pikir: <b>${avgLatency} ms</b></p>
            
            <div class="ece-dash">
                
                <div style="margin-bottom:25px; padding-bottom:20px; border-bottom:1px dashed #cbd5e1;">
                    <div style="font-weight:bold; color:#334155; margin-bottom:5px;">Kurva Strategi Pencarian</div>
                    <div style="font-size:0.85em; color:#64748b;">Melacak jumlah klik / tebakan per pasangan yang ditemukan.</div>
                    <div class="ece-svg-container">
                        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style="padding:15px 10px 5px 10px; overflow:visible;">
                            <polyline fill="none" stroke="#3b82f6" stroke-width="3" points="${points}" stroke-linecap="round" stroke-linejoin="round"/>
                            ${state.matchHistory.map((clicks, index) => {
                                const x = state.totalPairs > 1 ? (index / (state.totalPairs - 1)) * 100 : 50;
                                const y = 100 - ((clicks / maxClicks) * 100);
                                return `<circle cx="${x}" cy="${y}" r="3" fill="#ef4444"/><text x="${x}" y="${y-6}" font-size="8" fill="#475569" text-anchor="middle">${clicks}</text>`;
                            }).join('')}
                        </svg>
                    </div>
                </div>

                <div style="margin-bottom:25px; padding-bottom:20px; border-bottom:1px dashed #cbd5e1;">
                    <div style="font-weight:bold; color:#334155; margin-bottom:15px;">Distribusi Beban Memori Visual (Penalti Kesalahan)</div>
                    <div class="ece-dash-grid" style="align-items:start;">
                        <div class="ece-metric-box">
                            <div style="font-size:0.85em; font-weight:bold; color:#475569; margin-bottom:12px; border-bottom:1px solid #cbd5e1; padding-bottom:5px;">Berdasarkan Objek</div>
                            ${itemErrorsHtml}
                        </div>
                        <div class="ece-metric-box">
                            <div style="font-size:0.85em; font-weight:bold; color:#475569; margin-bottom:12px; border-bottom:1px solid #cbd5e1; padding-bottom:5px;">Berdasarkan Warna Atribut</div>
                            ${colorErrorsHtml}
                        </div>
                    </div>
                </div>

                <div style="font-weight:bold; color:#334155; margin-bottom:15px;">Metrik Fungsi Eksekutif Standar</div>
                <div class="ece-chart-row">
                    <div class="ece-chart-lbl">Perseverasi (Mengulang Salah)</div>
                    <div class="ece-chart-bar-bg"><div class="ece-chart-fill" style="width:${errPct}%; background:${errColor};"></div></div>
                    <div class="ece-chart-val">${state.metrics.perseverationErrors} x</div>
                </div>
                <div class="ece-chart-row">
                    <div class="ece-chart-lbl">Klik Impulsif (&lt;300ms)</div>
                    <div class="ece-chart-bar-bg"><div class="ece-chart-fill" style="width:${impPct}%; background:${impColor};"></div></div>
                    <div class="ece-chart-val">${state.metrics.impulsiveClicks} x</div>
                </div>
                
                <hr style="border:none; border-top:1px solid #e2e8f0; margin:20px 0;">
                
                <div style="display:flex; justify-content:space-between; font-size:0.9em;">
                    <span>Bantuan Jejak Visual: <b>${state.config.visualHint ? 'AKTIF' : 'NONAKTIF'}</b></span>
                    <span>Bantuan Prompt Maks: <b>Level ${state.metrics.promptLevelMax}</b></span>
                </div>
                
                <button class="ece-btn" style="margin-top:20px;" onclick="window.eceExitModule()">✖ TUTUP SESI & KELUAR</button>
            </div>
        </div>
    `;
    
    console.log("Payload Raw Data Klinis:", { metrics: state.metrics, matchHistory: state.matchHistory, itemErrors: itemArray, colorErrors: colorArray });
}