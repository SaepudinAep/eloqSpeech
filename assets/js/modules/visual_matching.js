// visual_matching.js - V6.1 (Metadata Fix & Unified Bucket)
// Features: Dynamic Metadata Parsing (Fixed Object Type), Unified Bucket UI, Global Sweeper, Anti-Stuck.
// Status: ISOLATED PROTOTYPE (Tidak menyimpan ke database utama).
// Pattern: Strict Standard Architecture.

import { supabase } from '../config.js';

// --- STATE MANAGEMENT ---
let rawData = [];
let masterCategories = [];
let appState = {
    view: 'SETUP', 
    config: { mode: 'IDENTIK', optionsCount: 6, totalRounds: 3 },
    game: { rounds: [], currentRoundIdx: 0, roundStartTime: 0, currentRoundLog: null, sessionLogs: [] }
};

let dragObj = { id: null, card: null, clone: null, startX: 0, startY: 0, isCorrect: false };
let audioCtx = null;

const ICONS = {
    PLAY: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="m7 4 12 8-12 8V4Z"/></svg>`,
    CHECK: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3"><path d="M20 6 9 17l-5-5"/></svg>`,
    CHART: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>`
};

// --- AUDIO ENGINE ---
function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playSound(type) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (type === 'correct') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); 
        osc.frequency.exponentialRampToValueAtTime(1046.50, audioCtx.currentTime + 0.1); 
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start(); osc.stop(audioCtx.currentTime + 0.3);
    } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start(); osc.stop(audioCtx.currentTime + 0.3);
    }
}

// --- CSS INJECTION ---
const injectStyles = () => {
    if (document.getElementById('vm-styles')) return;
    const s = document.createElement('style');
    s.id = 'vm-styles';
    s.innerHTML = `
        .vm-app { --p: #4f46e5; --s: #10b981; --d: #ef4444; --slate: #64748b; --bg: #f8fafc; font-family: 'Inter', sans-serif; background: #fff; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
        .vm-app * { box-sizing: border-box; }
        .vm-nav { padding: 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #fff; z-index: 10; }
        .vm-title { font-size: 1.2rem; font-weight: 800; color: #1e293b; display: flex; align-items: center; gap: 10px; }
        .vm-body { flex: 1; overflow-y: auto; padding: 20px; background: var(--bg); display:flex; flex-direction:column; align-items:center; }
        
        .setup-box { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 30px; width: 100%; max-width: 500px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); }
        .inp-grp { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
        .inp-grp label { font-size: 0.85rem; font-weight: 700; color: var(--slate); text-transform: uppercase; }
        .inp-box { padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 1rem; outline: none; transition: 0.2s; background: #f8fafc; width:100%; }
        
        .btn-start { width: 100%; padding: 15px; background: var(--p); color: white; border: none; border-radius: 12px; font-weight: 800; font-size: 1.1rem; cursor: pointer; display:flex; justify-content:center; align-items:center; gap:8px; transition:0.2s; }
        
        /* PLAY AREA LAYOUT */
        .play-header { width: 100%; max-width: 900px; text-align: center; margin-bottom: 30px; }
        .play-instruction { font-size: 1.4rem; font-weight: 900; color: #1e293b; text-transform: uppercase; letter-spacing: 1px; }
        
        /* UNIFIED BUCKET */
        .unified-bucket { width: 100%; max-width: 700px; min-height: 220px; background: #e0e7ff; border: 4px dashed var(--p); border-radius: 20px; display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 15px; padding: 30px 20px 20px 20px; position: relative; transition: 0.3s; margin-bottom: 40px; box-shadow: inset 0 4px 6px rgba(0,0,0,0.05); }
        .unified-bucket.drag-over { background: #c7d2fe; border-color: #4338ca; transform: scale(1.02); }
        
        .example-badge { position: absolute; top: -25px; left: 50%; transform: translateX(-50%); background: white; border: 3px solid #cbd5e1; border-radius: 12px; padding: 5px; display: flex; align-items: center; gap: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); z-index: 5; }
        .example-badge img { width: 50px; height: 50px; border-radius: 6px; object-fit: cover; }
        .example-badge span { font-weight: 800; font-size: 0.85rem; color: var(--slate); text-transform: uppercase; padding-right: 15px; }
        
        .dropped-item { width: 90px; height: 90px; border-radius: 10px; border: 3px solid var(--s); object-fit: cover; animation: popIn 0.3s; z-index: 2; box-shadow: 0 4px 6px rgba(0,0,0,0.1); background: white; }
        @keyframes popIn { 0% {transform: scale(0);} 80% {transform: scale(1.1);} 100% {transform: scale(1);} }
        
        /* OPTION CARDS */
        .options-grid { display: flex; gap: 20px; justify-content: center; flex-wrap: wrap; width: 100%; max-width: 900px; }
        .option-card { width: 130px; height: 130px; background: #fff; border: 2px solid #e2e8f0; border-radius: 16px; display: flex; align-items: center; justify-content: center; overflow: hidden; cursor: grab; box-shadow: 0 4px 6px rgba(0,0,0,0.05); touch-action: none; user-select: none; transition: 0.2s; }
        .option-card img { width: 100%; height: 100%; object-fit: cover; pointer-events: none; }
        .option-card.hidden { opacity: 0; pointer-events: none; transform: scale(0.8); }
        
        @keyframes shake { 0%, 100% {transform: translateX(0);} 25% {transform: translateX(-8px);} 75% {transform: translateX(8px);} }
        .anim-shake { animation: shake 0.4s; border-color: var(--d); background: #fef2f2; }
        
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

// --- GLOBAL SWEEPER ---
function sweepClones() {
    document.querySelectorAll('[id^="clone-"]').forEach(el => el.remove());
    if (dragObj.card) dragObj.card.style.opacity = '1';
    dragObj = { id: null, card: null, clone: null, startX: 0, startY: 0, isCorrect: false };
}

// --- ENTRY POINT ---
export async function renderVisualMatching(containerId) {
    injectStyles();
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `<div class="vm-app" id="vm-app-root"><div style="padding:40px; text-align:center;">Memuat Mesin Klinis...</div></div>`;
    
    window.vm_startGame = startGame;
    window.vm_resetSetup = () => { appState.view = 'SETUP'; renderRouter(); };
    window.vm_ptrDown = ptrDown;
    window.vm_updateModes = updateDynamicModes;

    await fetchData();
    renderRouter();
}

// --- UNIVERSAL TOUCH ENGINE (ANTI-STUCK) ---
function ptrDown(e, instanceId, isCorrect) {
    initAudio(); 
    e.preventDefault();
    e.target.setPointerCapture(e.pointerId);
    
    dragObj.id = instanceId;
    dragObj.isCorrect = isCorrect === 'true';
    dragObj.card = document.getElementById(`opt-${instanceId}`);
    
    const rect = dragObj.card.getBoundingClientRect();
    dragObj.clone = dragObj.card.cloneNode(true);
    dragObj.clone.id = `clone-${instanceId}`;
    dragObj.clone.style.position = 'fixed';
    dragObj.clone.style.left = `${rect.left}px`;
    dragObj.clone.style.top = `${rect.top}px`;
    dragObj.clone.style.width = `${rect.width}px`;
    dragObj.clone.style.height = `${rect.height}px`;
    dragObj.clone.style.margin = '0';
    dragObj.clone.style.zIndex = '9999';
    dragObj.clone.style.pointerEvents = 'none';
    dragObj.clone.style.transform = 'scale(1.1)';
    dragObj.clone.style.opacity = '0.9';
    dragObj.clone.style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.2)';
    document.body.appendChild(dragObj.clone);

    dragObj.startX = e.clientX;
    dragObj.startY = e.clientY;
    dragObj.card.style.opacity = '0.2';

    dragObj.card.addEventListener('pointermove', ptrMove);
    dragObj.card.addEventListener('pointerup', ptrUp);
    dragObj.card.addEventListener('pointercancel', ptrCancel);
}

function ptrMove(e) {
    if(!dragObj.clone) return;
    e.preventDefault();
    
    const dx = e.clientX - dragObj.startX;
    const dy = e.clientY - dragObj.startY;
    dragObj.clone.style.transform = `translate(${dx}px, ${dy}px) scale(1.1)`;

    const dropZone = document.getElementById('drop-zone');
    if(!dropZone) return;
    const rect = dropZone.getBoundingClientRect();
    if(e.clientX > rect.left && e.clientX < rect.right && e.clientY > rect.top && e.clientY < rect.bottom) {
        dropZone.classList.add('drag-over');
    } else {
        dropZone.classList.remove('drag-over');
    }
}

function ptrUp(e) {
    if(!dragObj.clone) return;
    
    e.target.releasePointerCapture(e.pointerId);
    dragObj.card.removeEventListener('pointermove', ptrMove);
    dragObj.card.removeEventListener('pointerup', ptrUp);
    dragObj.card.removeEventListener('pointercancel', ptrCancel);

    const dropZone = document.getElementById('drop-zone');
    if(!dropZone) { sweepClones(); return; }
    
    const rect = dropZone.getBoundingClientRect();
    const isInside = (e.clientX > rect.left && e.clientX < rect.right && e.clientY > rect.top && e.clientY < rect.bottom);

    dropZone.classList.remove('drag-over');
    dragObj.clone.remove();
    dragObj.card.style.opacity = '1';

    if(isInside) checkAnswer(dragObj.id, dragObj.isCorrect);

    dragObj = { id: null, card: null, clone: null, startX: 0, startY: 0, isCorrect: false };
}

function ptrCancel(e) {
    const dropZone = document.getElementById('drop-zone');
    if(dropZone) dropZone.classList.remove('drag-over');
    sweepClones();
}

// --- DATA FETCHING & PARSING ---
async function fetchData() {
    try {
        const { data: c, error: cErr } = await supabase.from('es_game_categories').select('*');
        if(cErr) throw cErr;
        
        const { data: i, error: iErr } = await supabase.from('es_game_items').select(`
            id, item_name, category_id, item_metadata,
            es_game_assets ( public_url, media_type )
        `).eq('is_published', true);
        if(iErr) throw iErr;
        
        rawData = (i || []).filter(item => item.es_game_assets && item.es_game_assets.some(a => a.media_type === 'IMAGE'));
        
        // Parse JSON Metadata (Penanganan Supabase Native JSON/JSONB)
        rawData.forEach(item => {
            if (typeof item.item_metadata === 'object' && item.item_metadata !== null) {
                item.parsedMeta = item.item_metadata;
            } else {
                try { item.parsedMeta = item.item_metadata ? JSON.parse(item.item_metadata) : {}; } 
                catch(e) { item.parsedMeta = {}; }
            }
        });
        
        const categoriesWithItems = new Set(rawData.map(item => item.category_id));
        masterCategories = (c || []).filter(cat => categoriesWithItems.has(cat.id));
    } catch (e) {
        alert("Gagal memuat database: " + e.message);
    }
}

function updateDynamicModes() {
    const catId = document.getElementById('vm-cat').value;
    const items = rawData.filter(x => x.category_id === catId);
    const catName = masterCategories.find(c => c.id === catId)?.name || 'Kategori';
    
    let keys = new Set();
    items.forEach(item => {
        if (item.parsedMeta) {
            Object.keys(item.parsedMeta).forEach(k => {
                // Jangan masukkan key jika isinya kosong
                if (item.parsedMeta[k] && item.parsedMeta[k].toString().trim() !== '') {
                    keys.add(k);
                }
            });
        }
    });
    
    let html = `
        <option value="IDENTIK">Visual Identik (Sama Persis)</option>
        <option value="KATEGORI" selected>Satu Golongan (${catName})</option>
    `;
    
    keys.forEach(k => {
        if(k.toLowerCase() !== 'deskripsi') html += `<option value="META_${k}">Berdasarkan Atribut: ${k.toUpperCase()}</option>`;
    });
    
    const modeEl = document.getElementById('vm-mode');
    if (modeEl) modeEl.innerHTML = html;
}

// --- ROUTER & VIEW RENDERER ---
function renderRouter() {
    sweepClones(); // Sapu bersih bayangan sisa ronde sebelumnya
    const root = document.getElementById('vm-app-root');
    if (!root) return;

    if (appState.view === 'SETUP') {
        if(masterCategories.length === 0) {
            root.innerHTML = `<div style="padding:40px; text-align:center;">Belum ada data valid.</div>`;
            return;
        }

        root.innerHTML = `
            <div class="vm-nav"><div class="vm-title">🧩 Dasbor Terapis: Setup Sorting Kognitif</div></div>
            <div class="vm-body">
                <div class="setup-box">
                    <div class="inp-grp">
                        <label>Target Kategori Utama</label>
                        <select id="vm-cat" class="inp-box" onchange="window.vm_updateModes()">
                            ${masterCategories.map(c => `<option value="${c.id}">${c.name || c.category_name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="inp-grp">
                        <label>Aturan Pencocokan</label>
                        <select id="vm-mode" class="inp-box"></select>
                    </div>
                    <div class="inp-grp">
                        <label>Total Kartu di Bawah</label>
                        <select id="vm-options" class="inp-box">
                            <option value="4">4 Kartu</option>
                            <option value="6" selected>6 Kartu</option>
                            <option value="8">8 Kartu</option>
                        </select>
                    </div>
                    <div class="inp-grp">
                        <label>Jumlah Ronde</label>
                        <input type="number" id="vm-rounds" class="inp-box" value="3" min="1" max="10">
                    </div>
                    <button class="btn-start" onclick="window.vm_startGame()">${ICONS.PLAY} MULAI SESI ABK</button>
                </div>
            </div>
        `;
        setTimeout(() => updateDynamicModes(), 100);
        
    } else if (appState.view === 'PLAY') {
        const r = appState.game.rounds[appState.game.currentRoundIdx];
        const exampleImg = r.exampleItem.es_game_assets.find(a => a.media_type === 'IMAGE').public_url;
        
        let instruction = 'KUMPULKAN YANG SEJENIS!';
        if(appState.config.mode === 'IDENTIK') instruction = 'KUMPULKAN GAMBAR YANG SAMA!';
        else if(appState.config.mode.startsWith('META_')) {
            const attr = appState.config.mode.replace('META_', '');
            const val = r.exampleItem.parsedMeta[attr];
            instruction = `KUMPULKAN YANG ${attr.toUpperCase()}NYA ${val.toUpperCase()}!`;
        }
        
        root.innerHTML = `
            <div class="vm-nav">
                <div style="font-weight:800; color:var(--slate);">Ronde ${appState.game.currentRoundIdx + 1} / ${appState.config.totalRounds}</div>
                <button class="btn-start" style="width:auto; padding:8px 15px; font-size:0.85rem; background:#f1f5f9; color:var(--d);" onclick="window.vm_resetSetup()">Batal Sesi</button>
            </div>
            <div class="vm-body" style="justify-content:flex-start;">
                
                <div class="play-header">
                    <div class="play-instruction">${instruction}</div>
                </div>

                <div class="unified-bucket" id="drop-zone">
                    <div class="example-badge">
                        <img src="${exampleImg}">
                        <span>Samakan dengan Ini ➔</span>
                    </div>
                    </div>
                
                <div class="options-grid">
                    ${r.options.map((opt, idx) => {
                        const img = opt.item.es_game_assets.find(a => a.media_type === 'IMAGE').public_url;
                        const instanceId = `${opt.item.id}-${idx}`; 
                        return `
                        <div class="option-card" id="opt-${instanceId}"
                             onpointerdown="window.vm_ptrDown(event, '${instanceId}', '${opt.isCorrect}')">
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
    const mode = document.getElementById('vm-mode').value;
    const catId = document.getElementById('vm-cat').value;
    const optCount = parseInt(document.getElementById('vm-options').value);
    const totalRounds = parseInt(document.getElementById('vm-rounds').value);

    const catItems = rawData.filter(x => x.category_id === catId);
    if(catItems.length < 1) return alert("Kategori tidak memiliki aset.");

    appState.config = { mode, categoryId: catId, optionsCount: optCount, totalRounds };
    appState.game = { rounds: [], currentRoundIdx: 0, sessionLogs: [] };

    for(let i=0; i<totalRounds; i++) {
        let exampleItem, options = [];
        let targetsNeeded = 0;

        if (mode === 'IDENTIK') {
            exampleItem = catItems[Math.floor(Math.random() * catItems.length)];
            targetsNeeded = 2; 
            for(let j=0; j<targetsNeeded; j++) options.push({ item: exampleItem, isCorrect: true });
            
            let distractors = [...rawData].filter(x => x.id !== exampleItem.id).sort(() => 0.5 - Math.random()).slice(0, optCount - targetsNeeded);
            distractors.forEach(d => options.push({ item: d, isCorrect: false }));
        } 
        else if (mode === 'KATEGORI') {
            const shuffledCatItems = [...catItems].sort(() => 0.5 - Math.random());
            exampleItem = shuffledCatItems[0];
            
            const availableTargets = shuffledCatItems.slice(1, 4);
            targetsNeeded = Math.min(availableTargets.length, Math.floor(optCount / 2));
            if(targetsNeeded < 1) targetsNeeded = 1;
            
            for(let j=0; j<targetsNeeded; j++) {
                options.push({ item: availableTargets[j] || exampleItem, isCorrect: true });
            }
            
            let distractors = rawData.filter(x => x.category_id !== catId).sort(() => 0.5 - Math.random()).slice(0, optCount - targetsNeeded);
            distractors.forEach(d => options.push({ item: d, isCorrect: false }));
        }
        else if (mode.startsWith('META_')) {
            const metaKey = mode.replace('META_', '');
            const validItems = catItems.filter(x => x.parsedMeta && x.parsedMeta[metaKey] && x.parsedMeta[metaKey].trim() !== '');
            
            if(validItems.length === 0) {
                exampleItem = catItems[0];
                options.push({ item: exampleItem, isCorrect: true });
                targetsNeeded = 1;
            } else {
                exampleItem = validItems[Math.floor(Math.random() * validItems.length)];
                const targetValue = exampleItem.parsedMeta[metaKey];
                
                let matchingItems = rawData.filter(x => x.parsedMeta && x.parsedMeta[metaKey] === targetValue && x.id !== exampleItem.id);
                targetsNeeded = Math.min(matchingItems.length, Math.floor(optCount / 2));
                if(targetsNeeded < 1) { targetsNeeded = 1; matchingItems = [exampleItem]; }
                
                for(let j=0; j<targetsNeeded; j++) {
                    options.push({ item: matchingItems[j], isCorrect: true });
                }
                
                let distractors = rawData.filter(x => !(x.parsedMeta && x.parsedMeta[metaKey] === targetValue) && x.id !== exampleItem.id).sort(() => 0.5 - Math.random()).slice(0, optCount - targetsNeeded);
                distractors.forEach(d => options.push({ item: d, isCorrect: false }));
            }
        }

        options = options.sort(() => 0.5 - Math.random());
        const catObj = masterCategories.find(c => c.id === catId);
        
        let catNameDisplay = catObj ? (catObj.name || catObj.category_name) : 'Kategori';
        if(mode.startsWith('META_') && exampleItem.parsedMeta) {
            catNameDisplay = `${mode.replace('META_','')} ${exampleItem.parsedMeta[mode.replace('META_','')]}`;
        }
        
        appState.game.rounds.push({ 
            exampleItem, options, targetsNeeded, targetsFound: 0, 
            categoryName: catNameDisplay
        });
    }

    startNewRoundLog();
    appState.view = 'PLAY'; 
    renderRouter();
}

function startNewRoundLog() {
    appState.game.currentRoundLog = { firstAttemptCorrect: true, latencyMs: 0, mistakes: [], startTime: Date.now() };
}

function checkAnswer(instanceId, isCorrect) {
    const r = appState.game.rounds[appState.game.currentRoundIdx];
    const card = document.getElementById(`opt-${instanceId}`);
    const dropZone = document.getElementById('drop-zone');

    if (isCorrect) {
        playSound('correct');
        card.classList.add('hidden'); 
        
        const imgUrl = card.querySelector('img').src;
        dropZone.innerHTML += `<img src="${imgUrl}" class="dropped-item">`;
        
        r.targetsFound++;
        
        if (r.targetsFound >= r.targetsNeeded) {
            appState.game.currentRoundLog.latencyMs = Date.now() - appState.game.currentRoundLog.startTime;
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
            }, 1500);
        }
    } else {
        playSound('wrong');
        if(card) {
            card.classList.add('anim-shake');
            setTimeout(() => card.classList.remove('anim-shake'), 400);
        }
        appState.game.currentRoundLog.firstAttemptCorrect = false;
        appState.game.currentRoundLog.mistakes.push({ timeTaken: Date.now() - appState.game.currentRoundLog.startTime });
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
            const r = appState.game.rounds[idx];
            errorRows += `<tr><td>Ronde ${idx+1}</td><td style="text-transform:uppercase;">${r.categoryName}</td><td>${log.mistakes.length} Kesalahan Tarik</td></tr>`;
        }
    });

    return `
        <div class="vm-nav">
            <div class="vm-title">${ICONS.CHART} Laporan Klasifikasi Kognitif</div>
            <button class="btn-start" style="width:auto; padding:8px 15px; font-size:0.85rem;" onclick="window.vm_resetSetup()">SELESAI</button>
        </div>
        <div class="vm-body" style="align-items:center;">
            <div class="report-grid">
                <div class="metric-card">
                    <div class="metric-label">Akurasi Visual</div>
                    <div class="metric-val" style="color:${accuracy >= 80 ? 'var(--s)' : 'var(--p)'};">${accuracy}%</div>
                    <div style="font-size:0.8rem; color:var(--slate);">(${correctFirstAttempts} dari ${total} Sempurna)</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Kecepatan Pemrosesan</div>
                    <div class="metric-val">${avgLatencySec}s</div>
                    <div style="font-size:0.8rem; color:var(--slate);">Rata-rata per Ronde</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Kemandirian Klasifikasi</div>
                    <div class="metric-val" style="color:var(--slate);">${correctFirstAttempts} / ${total}</div>
                </div>
            </div>
            ${errorRows ? `
            <table class="error-table">
                <thead><tr><th style="width:100px;">Soal</th><th>Target Pengelompokan</th><th>Catatan Kegagalan</th></tr></thead>
                <tbody>${errorRows}</tbody>
            </table>
            ` : `<div style="padding:20px; background:#f0fdf4; color:var(--s); border-radius:12px; font-weight:800; border:1px solid #bbf7d0; text-align:center; width:100%; max-width:800px;">🎉 Sempurna! Penyortiran kognitif berhasil tanpa cacat.</div>`}
        </div>
    `;
}