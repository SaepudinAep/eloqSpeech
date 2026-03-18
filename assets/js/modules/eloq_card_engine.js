// eloq_card_engine.js - V20.1 (FIXED VISUAL ICONS)
// Standar: Unified Setup, Smart Filtering (Hide Empty Cats), Plain Cards (No '?'), S.O.A.P & DB Integration.
// Menjaga 100% Logika Klinis Asli (ItemTracker, MatchHistory, Perseveration, SVG Chart)

import { supabase } from '../config.js';

// --- 0. GLOBAL SPA EXIT FUNCTION ---
window.eceExitModule = () => {
    if(state.gameTimerInterval) clearInterval(state.gameTimerInterval);
    if(state.promptTimer) clearTimeout(state.promptTimer);
    
    const container = document.querySelector('.ece-root')?.parentElement;
    if(container) container.innerHTML = '';
    if(typeof window.renderApp === 'function') window.renderApp(null);
};

// --- 1. ENCAPSULATED STYLES ---
const STYLES = `
    .ece-root { font-family: 'Inter', sans-serif; text-align: center; padding: 20px; background: #f8fafc; border-radius: 16px; min-height: 600px; position: relative; color: #1e293b; }
    .ece-overlay { position: absolute; inset:0; background: rgba(255,255,255,0.98); z-index: 100; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 16px; padding: 20px; overflow-y: auto; }
    
    /* Setup Modal Components */
    .ece-setup-card { background: white; border: 1px solid #cbd5e1; border-radius: 20px; width: 100%; max-width: 500px; padding: 25px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); text-align: left; }
    .ece-field-group { margin-bottom: 18px; }
    .ece-label { display: block; font-weight: 800; font-size: 0.85rem; color: #64748b; text-transform: uppercase; margin-bottom: 8px; }
    .ece-input { width: 100%; padding: 12px; border-radius: 10px; border: 2px solid #e2e8f0; font-family: inherit; font-weight: 600; outline: none; transition: 0.2s; background: white; color: #1e293b; }
    .ece-input:focus { border-color: #3b82f6; }
    
    /* Multi-Category Selector Box */
    .ece-cat-scroll { height: 180px; overflow-y: auto; border: 2px solid #e2e8f0; border-radius: 10px; padding: 10px; background: #f8fafc; }
    .ece-cat-item { display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #f1f5f9; cursor: pointer; border-radius: 6px; transition: 0.2s; }
    .ece-cat-item:hover { background: #eff6ff; }
    .ece-cat-item input { width: 18px; height: 18px; cursor: pointer; margin-right: 10px; }
    .ece-asset-count { font-size: 0.75rem; font-weight: 800; padding: 3px 8px; border-radius: 10px; background: #e2e8f0; color: #475569; }
    
    .ece-validation-msg { font-size: 0.8rem; font-weight: 700; color: #ef4444; margin-top: 10px; text-align: center; display: none; padding: 8px; background: #fef2f2; border-radius: 8px; border: 1px solid #fca5a5; }
    .ece-btn { padding: 15px 25px; border-radius: 12px; border: none; font-weight: 800; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 10px; }
    .btn-primary { background: #3b82f6; color: white; width: 100%; margin-top: 10px; }
    .btn-primary:disabled { background: #cbd5e1; cursor: not-allowed; }

    /* Game Grid */
    .ece-game-grid { display: grid; gap: 15px; margin: 20px auto; max-width: 800px; }
    .ece-card { aspect-ratio: 1; perspective: 1000px; cursor: pointer; }
    .ece-card-inner { position: relative; width: 100%; height: 100%; text-align: center; transition: transform 0.6s; transform-style: preserve-3d; }
    .ece-card.flipped .ece-card-inner { transform: rotateY(180deg); }
    .ece-card-front, .ece-card-back { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 2px solid #cbd5e1; }
    
    /* V20: Plain Blue Card Front (No '?' Text) */
    .ece-card-front { background: #3b82f6; box-shadow: inset 0 0 15px rgba(0,0,0,0.1); transition: 0.3s; }
    
    .ece-card-back { background: white; border: 2px solid #3b82f6; transform: rotateY(180deg); }
    .ece-card-back img { width: 80%; height: 80%; object-fit: contain; }
    
    /* Visual Hint (Errorless Learning) */
    .ece-card.seen-hint .ece-card-front { background: #fcd34d !important; border: 3px solid #f59e0b !important; }

    /* Clinical Feedback */
    .ece-shake { animation: shake 0.5s; }
    .ece-glow { box-shadow: 0 0 15px #facc15; border-color: #facc15; }
    @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }

    /* Dashboard Charts */
    .ece-dash { max-width: 650px; margin: 0 auto; background: white; padding: 20px; border-radius: 12px; border: 1px solid #cbd5e1; text-align: left; }
    .ece-chart-row { display: flex; align-items: center; margin-bottom: 15px; }
    .ece-chart-lbl { width: 40%; font-size: 0.85em; font-weight: bold; color: #475569; }
    .ece-chart-bar-bg { flex: 1; height: 12px; background: #e2e8f0; border-radius: 6px; margin: 0 15px; overflow: hidden; }
    .ece-chart-fill { height: 100%; border-radius: 6px; transition: width 1s; }
    .ece-chart-val { width: 15%; font-weight: bold; text-align: right; }
    .ece-svg-container { width: 100%; height: 120px; background: #f1f5f9; border-radius: 8px; position: relative; overflow: visible; margin-top: 10px; border: 1px solid #e2e8f0; }
    .ece-dash-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
    .ece-metric-box { background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
    .ece-metric-box h4 { margin: 0 0 8px 0; font-size: 0.85em; color: #64748b; text-transform: uppercase; }
`;

// --- 2. GAME STATE (CLINICAL METRICS) ---
let state = {
    config: { pairs: 3, cols: 3, visualHint: false, selectedCats: [] },
    
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

    // Intra-Session Analytics Tracker
    itemTracker: {}, 
    matchHistory: [], 
    lastMatchClickCount: 0 
};

// --- 3. MOUNT FUNCTION & SMART SETUP MODAL ---
export async function renderEloqCardEngine(containerId) {
    if (!document.getElementById('ece-styles')) {
        const s = document.createElement('style'); s.id = 'ece-styles'; s.innerHTML = STYLES; document.head.appendChild(s);
    }
    const container = document.getElementById(containerId);
    container.innerHTML = `<div class="ece-root"><div class="ece-overlay"><h3>⏳ Smart Filtering Database...</h3></div></div>`;

    try {
        // 1. Ambil data kategori
        const { data: cats, error: catError } = await supabase.from('es_game_categories').select('*');
        if (catError) throw catError;

        // 2. Ambil data item yang punya gambar untuk menghitung ketersediaan aset per kategori
        const { data: assets, error: assetError } = await supabase.from('es_game_items').select('category_id, es_game_assets!inner(public_url)').eq('es_game_assets.media_type', 'IMAGE');
        if (assetError) throw assetError;

        const assetMap = {};
        assets.forEach(it => {
            if (it.es_game_assets && it.es_game_assets.length > 0 && it.es_game_assets[0].public_url) {
                assetMap[it.category_id] = (assetMap[it.category_id] || 0) + 1;
            }
        });

        // 3. Filter kategori kosong agar tidak tampil
        const validCats = cats.filter(c => (assetMap[c.id] || 0) > 0);

        if (validCats.length === 0) {
            container.innerHTML = `<div class="ece-root" style="color:red; font-weight:bold;">❌ Tidak ada satupun kategori yang memiliki aset gambar di database.</div>`;
            return;
        }

        // 4. Bangun UI Setup Satu Pintu
        container.innerHTML = `
            <div class="ece-root">
                <div class="ece-overlay">
                    <div class="ece-setup-card">
                        <h2 style="margin-top:0; border-bottom:2px solid #f1f5f9; padding-bottom:15px; margin-bottom:20px;">Setup Memori Spasial</h2>
                        
                        <div class="ece-field-group">
                            <label class="ece-label">1. Tingkat Kesulitan (Dosis)</label>
                            <select id="ece-level" class="ece-input" onchange="window.eceValidateSetup()">
                                <option value="2">Level 1 (Grid 2x2 - Butuh 2 Pasang)</option>
                                <option value="3" selected>Level 2 (Grid 3x2 - Butuh 3 Pasang)</option>
                                <option value="4">Level 3 (Grid 4x2 - Butuh 4 Pasang)</option>
                                <option value="5">Level 4 (Grid 5x2 - Butuh 5 Pasang)</option>
                            </select>
                        </div>
                        
                        <div class="ece-field-group">
                            <label class="ece-label">2. Bantuan Jejak Visual (Errorless Learning)</label>
                            <select id="ece-hint" class="ece-input">
                                <option value="false" selected>Standar (Tanpa Bantuan)</option>
                                <option value="true">Aktif (Tandai kartu yang pernah salah)</option>
                            </select>
                        </div>
                        
                        <div class="ece-field-group">
                            <label class="ece-label">3. Pilih Topik / Kategori</label>
                            <p style="font-size:0.75rem; color:#94a3b8; margin-top:0; margin-bottom:10px;">Anda bisa mencentang lebih dari satu kategori untuk menggabungkan aset.</p>
                            <div class="ece-cat-scroll" id="cat-list-container">
                                ${validCats.map(c => {
                                    const count = assetMap[c.id];
                                    return `
                                        <label class="ece-cat-item">
                                            <div style="display:flex; align-items:center;">
                                                <input type="checkbox" name="ece-cat" value="${c.id}" data-count="${count}" onchange="window.eceValidateSetup()">
                                                <span style="font-weight:600;">${c.icon_url || '📁'} ${c.name}</span>
                                            </div>
                                            <span class="ece-asset-count">${count} Aset</span>
                                        </label>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                        
                        <div id="validation-msg" class="ece-validation-msg">⚠️ Total aset dari kategori yang dicentang tidak mencukupi untuk tingkat kesulitan ini.</div>
                        
                        <div style="display:flex; gap:10px; margin-top:25px;">
                            <button class="ece-btn" style="flex:1; background:white; border:1px solid #cbd5e1; color:#64748b;" onclick="window.eceExitModule()">Batal</button>
                            <button class="ece-btn btn-primary" id="btn-start-game" style="flex:2;" disabled>MULAI TERAPI ❯</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        window.eceValidateSetup = () => {
            const pairsRequired = parseInt(document.getElementById('ece-level').value);
            const checkboxes = document.querySelectorAll('input[name="ece-cat"]:checked');
            
            let totalAvailable = 0;
            checkboxes.forEach(cb => totalAvailable += parseInt(cb.dataset.count));
            
            const btn = document.getElementById('btn-start-game');
            const msg = document.getElementById('validation-msg');
            
            if (totalAvailable >= pairsRequired && checkboxes.length > 0) {
                btn.disabled = false; btn.style.cursor = 'pointer'; msg.style.display = 'none';
            } else {
                btn.disabled = true; btn.style.cursor = 'not-allowed';
                msg.style.display = checkboxes.length > 0 ? 'block' : 'none';
            }
        };

        document.getElementById('btn-start-game').onclick = () => prepareGame(container);

    } catch (err) {
        container.innerHTML = `<div class="ece-root" style="color:red; font-weight:bold;">❌ Gagal Memuat Data: ${err.message}</div>`;
    }
}

// --- 4. GAME PREPARATION (Multi-Category Fetch) ---
async function prepareGame(container) {
    const btn = document.getElementById('btn-start-game');
    btn.disabled = true; btn.innerText = "⏳ Memuat Aset...";

    const pairsRequired = parseInt(document.getElementById('ece-level').value);
    const useHint = document.getElementById('ece-hint').value === 'true';
    const selectedCheckboxes = document.querySelectorAll('input[name="ece-cat"]:checked');
    const catIds = Array.from(selectedCheckboxes).map(cb => cb.value);

    try {
        const { data: items, error } = await supabase.from('es_game_items').select('*, es_game_assets!inner(*)').in('category_id', catIds).eq('es_game_assets.media_type', 'IMAGE');
        if (error) throw error;

        const validItems = items.filter(item => item.es_game_assets && item.es_game_assets.some(a => a.public_url));
        const selected = validItems.sort(() => 0.5 - Math.random()).slice(0, pairsRequired);
        
        state.config.pairs = pairsRequired;
        state.config.cols = (pairsRequired === 2) ? 2 : (pairsRequired === 5) ? 5 : (pairsRequired === 4) ? 4 : 3;
        state.config.visualHint = useHint;
        state.config.selectedCats = catIds;

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
        state.flippedIndices = [];
        state.isLocked = false;
        
        renderGame(container);
        startPromptTimer();

    } catch (err) {
        alert("Gagal Menyiapkan Game: " + err.message);
        btn.disabled = false; btn.innerText = "MULAI TERAPI ❯";
    }
}

// --- 5. RENDER GAME UI (Plain Cards) ---
function renderGame(container) {
    let gridHtml = state.cards.map((item, index) => {
        const imgObj = item.es_game_assets.find(a => a.media_type === 'IMAGE');
        const imgUrl = imgObj ? imgObj.public_url : '';
        // V20: ece-card-front is empty (No '?')
        return `
            <div class="ece-card" id="card-${index}" onclick="window.eceCardClick(${index})">
                <div class="ece-card-inner">
                    <div class="ece-card-front"></div>
                    <div class="ece-card-back"><img src="${imgUrl}"></div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="ece-root">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; font-weight:bold; max-width:800px; margin-left:auto; margin-right:auto;">
                <button class="ece-btn" style="width:auto; margin:0; padding:8px 15px; background:white; border:1px solid #ef4444; color:#ef4444;" onclick="window.eceExitModule()">✖ Akhiri Sesi</button>
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

// --- 6. CORE LOGIC ---
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

// --- 7. PROMPTING SYSTEM ---
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

// --- 8. FINISH & DASHBOARD (WITH S.O.A.P & DB INTEGRATION) ---
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
    
    // RENDER: Dasbor Data Visual + S.O.A.P Form
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
                
                <div style="background:#f8fafc; padding:20px; border-radius:12px; border:1px solid #cbd5e1;">
                    <div style="font-weight:800; color:#1e293b; margin-bottom:15px; text-transform:uppercase; font-size:0.9rem;">Form Observasi Klinis (S.O.A.P)</div>
                    
                    <div style="margin-bottom:15px;">
                        <label style="display:block; font-size:0.85rem; font-weight:700; color:#475569; margin-bottom:5px;">Tingkat Bantuan Akhir (Prompt Level):</label>
                        <select id="ece-final-prompt" class="ece-input" style="padding:10px;">
                            <option value="0" ${state.metrics.promptLevelMax === 0 ? 'selected' : ''}>Mandiri (0)</option>
                            <option value="1" ${state.metrics.promptLevelMax === 1 ? 'selected' : ''}>Verbal/Visual Hint (1)</option>
                            <option value="2" ${state.metrics.promptLevelMax === 2 ? 'selected' : ''}>Fisik Penuh (2)</option>
                        </select>
                    </div>
                    
                    <div style="margin-bottom:15px;">
                        <label style="display:block; font-size:0.85rem; font-weight:700; color:#475569; margin-bottom:5px;">Catatan Terapis:</label>
                        <textarea id="ece-clinical-notes" class="ece-input" style="min-height:80px; resize:vertical;" placeholder="Tuliskan respon dan fokus anak..."></textarea>
                    </div>
                    
                    <button class="ece-btn btn-primary" id="btn-save-db">💾 SIMPAN REKAM MEDIS</button>
                    <button class="ece-btn" style="width:100%; margin-top:10px; background:white; color:#ef4444; border:1px solid #ef4444;" onclick="window.eceExitModule()">✖ KELUAR TANPA SIMPAN</button>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('btn-save-db').onclick = () => saveClinicalDataToDB();
}

async function saveClinicalDataToDB() {
    const btn = document.getElementById('btn-save-db');
    const promptLevel = parseInt(document.getElementById('ece-final-prompt').value);
    const notes = document.getElementById('ece-clinical-notes').value;
    
    btn.innerHTML = "⏳ MENYIMPAN..."; btn.disabled = true;

    try {
        const rawPatient = localStorage.getItem('eloq_active_patient');
        if (!rawPatient) throw new Error("Pilih pasien terlebih dahulu di bagian header!");
        const activePatient = JSON.parse(rawPatient);

        // Fetch UUID Modul
        const { data: menuData } = await supabase.from('es_menus').select('module_uuid').eq('module_name', 'eloq_card_engine').single();
        const exerciseId = menuData ? menuData.module_uuid : null;

        // Kalkulasi Akurasi
        const accuracy = (state.totalPairs / Math.max(state.metrics.clickCount / 2, state.totalPairs)) * 100;

        const payload = {
            patient_id: activePatient.id,
            exercise_id: exerciseId,
            cognitive_latency_ms: Math.round(state.metrics.latencyTotal),
            prompt_level: promptLevel,
            is_success: accuracy >= 80,
            precision_offset_rel: parseFloat(accuracy.toFixed(2)),
            jitter_index: state.metrics.impulsiveClicks,
            touch_radius: 0.0,
            session_metadata: {
                module_code: "memory_card_engine",
                config_used: {
                    grid_size: `${state.config.cols}x2`,
                    visual_hint_active: state.config.visualHint
                },
                categories_used: state.config.selectedCats,
                total_clicks: state.metrics.clickCount,
                perseveration_count: state.metrics.perseverationErrors,
                learning_curve_history: state.matchHistory,
                therapist_notes: notes
            }
        };

        const { error } = await supabase.from('es_game_logs').insert(payload);
        if (error) throw error;

        alert("✅ Berhasil! Data Sesi Memori Kartu sudah diamankan ke Database.");
        window.eceExitModule();

    } catch (err) {
        alert("GAGAL MENYIMPAN: " + err.message);
        btn.innerHTML = "💾 SIMPAN REKAM MEDIS"; btn.disabled = false;
    }
}