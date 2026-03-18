// spelling_game.js - V11.2 (Standardized Clinical Edition)
// Features: LEVEL 1 SHUFFLE ADDED, Ghost Drag Engine.
// Enrichment: Post-Flight S.O.A.P & Database Integration (es_game_logs).
// Pattern: Strict Standard Architecture (No Core Logic Cleaning).

import { supabase } from '../config.js';

let state = {
    container: null,
    targetWord: '',
    level: 1,
    showHint: false,
    slots: [], 
    items: [], 
    errors: 0,
    startTime: 0,
    sessionLogs: [],
    isWon: false
};

let dragState = {
    id: null,
    ghost: null
};

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const PALETTE = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

// --- 0. GLOBAL SPA EXIT FUNCTION ---
window.splExitModule = () => {
    const modal = document.getElementById('spl-modal');
    if (modal) modal.remove();
    
    if (state.container) {
        state.container.innerHTML = '';
    }
    
    state = {
        container: null,
        targetWord: '',
        level: 1,
        showHint: false,
        slots: [], 
        items: [], 
        errors: 0,
        startTime: 0,
        sessionLogs: [],
        isWon: false
    };
    
    if (typeof window.renderApp === 'function') {
        window.renderApp(null);
    } else if (typeof window.loadModule === 'function') {
        window.loadModule('digital_area');
    } else {
        window.location.reload();
    }
};

const injectStyles = () => {
    if (document.getElementById('spell-styles')) return;
    const s = document.createElement('style');
    s.id = 'spell-styles';
    s.innerHTML = `
        :root { 
            --p: #4f46e5; 
            --s: #10b981; 
            --d: #ef4444; 
            --bg: #f8fafc; 
        }
        
        .spell-app { 
            font-family: 'Inter', sans-serif; 
            height: 100vh; 
            display: flex; 
            flex-direction: column; 
            background: var(--bg); 
            overflow: hidden; 
            width: 100%; 
            touch-action: none; 
            position: relative; 
        }
        
        .spell-app *, .modal-overlay * { 
            box-sizing: border-box; 
        }
        
        /* NAVIGASI TERAPIS */
        .spell-nav { 
            padding: 12px 15px; 
            background: #fff; 
            border-bottom: 2px solid #e2e8f0; 
            display: flex; 
            gap: 10px; 
            flex-wrap: wrap; 
            align-items: center; 
            z-index: 10; 
            justify-content: space-between; 
        }
        
        .nav-group { 
            display: flex; 
            gap: 8px; 
            align-items: center; 
        }
        
        .btn-nav { 
            padding: 10px 15px; 
            border: none; 
            border-radius: 8px; 
            font-weight: 900; 
            cursor: pointer; 
            font-size: 0.85rem; 
            color: #fff; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            text-transform: uppercase;
        }

        /* AREA BERMAIN STERIL */
        .spell-body { 
            flex: 1; 
            overflow-y: auto; 
            padding: 20px; 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            gap: clamp(20px, 5vh, 40px); 
            position: relative; 
        }
        
        .target-zone { 
            display: flex; 
            gap: clamp(5px, 1vw, 12px); 
            align-items: center; 
            flex-wrap: wrap; 
            justify-content: center; 
            background: #fff; 
            padding: 25px; 
            border-radius: 20px; 
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); 
            width: 100%; 
            max-width: 950px; 
            min-height: 120px; 
        }
        
        .slot-box { 
            width: clamp(45px, 9vw, 80px); 
            aspect-ratio: 1/1; 
            border: 3px dashed #cbd5e1; 
            border-radius: 14px; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-size: clamp(1.8rem, 3.5vw, 3rem); 
            font-weight: 900; 
            background: #f8fafc; 
            position: relative; 
        }
        
        .slot-box.occupied { 
            border-style: solid; 
            border-color: #94a3b8; 
            background: #fff; 
        }
        
        .slot-space { 
            width: clamp(15px, 3vw, 30px); 
            height: 10px; 
        } 
        
        .slot-hint { 
            position: absolute; 
            opacity: 0.25; 
            color: #64748b; 
            pointer-events: none; 
            text-transform: uppercase; 
            font-size: inherit; 
        }

        .items-zone { 
            display: flex; 
            justify-content: center; 
            gap: clamp(8px, 1.5vw, 15px); 
            flex-wrap: wrap; 
            padding: 25px; 
            background: #fff; 
            border-radius: 20px; 
            width: 100%; 
            max-width: 950px; 
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); 
            min-height: 110px; 
            border: 2px solid #f1f5f9; 
            align-items: center; 
        }
        
        /* ITEM HURUF & POINTER TRACKING */
        .drag-item { 
            width: clamp(45px, 8vw, 70px); 
            aspect-ratio: 1/1; 
            border-radius: 12px; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-size: clamp(1.5rem, 3vw, 2.5rem); 
            font-weight: 900; 
            color: #fff; 
            cursor: grab; 
            box-shadow: 0 4px 6px rgba(0,0,0,0.15); 
            text-transform: uppercase; 
            user-select: none; 
            touch-action: none; 
            border: 2px solid rgba(255,255,255,0.2); 
        }
        
        .drag-item.in-slot { 
            width: 100%; 
            height: 100%; 
            border-radius: 10px; 
            box-shadow: none; 
            font-size: inherit; 
            border: none; 
        }
        
        .drag-item.dimmed { 
            opacity: 0.2; 
            transform: scale(0.95); 
        }

        /* MODAL SETUP & ASSESSMENT (ANTI-SQUISH) */
        .modal-overlay { 
            position: fixed; 
            inset: 0; 
            background: rgba(15,23,42,0.85); 
            z-index: 2000; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            padding: 15px; 
            backdrop-filter: blur(4px); 
            font-family: 'Inter', sans-serif; 
        }
        
        .modal-box { 
            background: #fff; 
            width: 100%; 
            max-width: 550px; 
            border-radius: 16px; 
            display: flex; 
            flex-direction: column; 
            max-height: 90vh; 
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); 
            overflow: hidden; 
        }
        
        .modal-header { 
            padding: 20px; 
            text-align: center; 
            font-weight: 900; 
            font-size: 1.2rem; 
            border-bottom: 2px solid #f1f5f9; 
            flex: 0 0 auto; 
            background: #fff; 
            color: #0f172a; 
        }
        
        .modal-content { 
            padding: 20px; 
            flex: 1 1 auto; 
            overflow-y: auto; 
        }
        
        .modal-footer { 
            padding: 15px 20px; 
            background: #fff; 
            border-top: 2px solid #f1f5f9; 
            flex: 0 0 auto; 
            display: flex; 
            gap: 10px; 
        }
        
        .inp-label { 
            display: block; 
            font-size: 0.85rem; 
            font-weight: 800; 
            color: #64748b; 
            margin-bottom: 8px; 
        }
        
        .inp-text { 
            width: 100%; 
            padding: 15px; 
            border: 2px solid #e2e8f0; 
            border-radius: 10px; 
            font-size: 1.2rem; 
            font-weight: 900; 
            text-transform: uppercase; 
            text-align: center; 
            outline: none; 
            margin-bottom: 15px; 
            transition: 0.2s; 
            color: #0f172a; 
            font-family: inherit;
        }
        
        .inp-text:focus { 
            border-color: var(--p); 
        }
        
        /* TOMBOL ABSOLUT TAHAN BANTING */
        .btn-modal { 
            border: none; 
            border-radius: 8px; 
            font-weight: 900; 
            font-size: 1.1rem; 
            cursor: pointer; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            min-height: 60px; 
            flex-shrink: 0; 
            text-transform: uppercase; 
            letter-spacing: 1px; 
            flex: 1; 
            transition: 0.2s;
        }
        .btn-modal:disabled { background: #cbd5e1; cursor: not-allowed; }
        
        .btn-red { 
            background: white; 
            color: var(--d); 
            border: 2px solid #fecaca;
        }
        
        .btn-primary { 
            background: var(--p); 
            color: #fff; 
        }

        /* ANIMASI REWARD & LANJUT */
        .btn-next-word { 
            background: var(--s); 
            color: #fff; 
            padding: 15px 30px; 
            border: none; 
            border-radius: 50px; 
            font-weight: 900; 
            font-size: 1.2rem; 
            cursor: pointer; 
            box-shadow: 0 10px 15px -3px rgba(16,185,129,0.4); 
            animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
        }
        
        .win-bounce { 
            animation: bounce-win 1s ease infinite; 
        }
        
        .confetti { 
            position: absolute; 
            width: 10px; 
            height: 20px; 
            background: red; 
            z-index: 1000; 
            animation: fall linear forwards; 
            top: -20px; 
        }
        
        /* CSS GRAFIK BATANG LAPORAN */
        .chart-container { 
            margin-bottom: 20px; 
            background: #f8fafc; 
            padding: 15px; 
            border-radius: 10px; 
            border: 1px solid #e2e8f0; 
        }
        
        .chart-title { 
            font-weight: 900; 
            font-size: 0.9rem; 
            color: #334155; 
            margin-bottom: 10px; 
            text-transform: uppercase; 
        }
        
        .chart-row { 
            display: flex; 
            align-items: center; 
            margin-bottom: 8px; 
            font-size: 0.85rem; 
        }
        
        .chart-label { 
            width: 100px; 
            font-weight: 800; 
            color: #64748b; 
            white-space: nowrap; 
            overflow: hidden; 
            text-overflow: ellipsis; 
        }
        
        .chart-bar-wrap { 
            flex: 1; 
            height: 24px; 
            background: #e2e8f0; 
            border-radius: 4px; 
            overflow: hidden; 
            margin: 0 10px; 
            position: relative; 
        }
        
        .chart-bar { 
            height: 100%; 
            border-radius: 4px; 
            transition: width 0.5s ease; 
        }
        
        .chart-val { 
            width: 40px; 
            text-align: right; 
            font-weight: 900; 
            color: #334155; 
        }
        
        .bar-err { background: #ef4444; }
        .bar-time { background: #3b82f6; }

        @keyframes popIn { 
            0% { transform: scale(0); opacity: 0; } 
            100% { transform: scale(1); opacity: 1; } 
        }
        
        @keyframes bounce-win { 
            0%, 100% { transform: translateY(0); } 
            50% { transform: translateY(-15px); } 
        }
        
        @keyframes fall { 
            to { transform: translateY(100vh) rotate(360deg); } 
        }
    `;
    document.head.appendChild(s);
};

export async function renderSpellingGame(containerId) {
    state.container = document.getElementById(containerId);
    if (!state.container) return;
    injectStyles();
    
    window.splOpenSetup = showSetupModal;
    window.splSubmit = submitSetup;
    window.splCloseModal = () => { 
        const m = document.getElementById('spl-modal'); 
        if(m) m.remove(); 
    };
    window.splRetry = retryCurrent;
    window.splEnd = showAssessment;
    window.splNextWord = () => { 
        state.isWon = false; 
        showSetupModal(); 
    };

    window.splPointerDown = handlePointerDown;
    window.splPointerMove = handlePointerMove;
    window.splPointerUp = handlePointerUp;

    renderShell();
    showSetupModal();
}

function renderShell() {
    state.container.innerHTML = `
        <div class="spell-app">
            <div id="spl-nav"></div>
            <div class="spell-body" id="spl-board"></div>
        </div>
    `;
    renderNav();
}

function renderNav() {
    const nav = document.getElementById('spl-nav');
    if (!nav) return;
    nav.innerHTML = `
        <div class="spell-nav">
            <div style="font-weight:900; color:#64748b; font-size:0.9rem;">
                SALAH PENEMPATAN: <span style="color:var(--d); font-size:1.1rem;" id="err-count">${state.errors}</span>
            </div>
            <div class="nav-group">
                <button class="btn-nav" style="background:#94a3b8" onclick="window.splRetry()">ULANGI</button>
                <button class="btn-nav" style="background:var(--p)" onclick="window.splOpenSetup()">SETUP</button>
                <button class="btn-nav" style="background:var(--d)" onclick="window.splEnd()">AKHIRI SESI</button>
            </div>
        </div>
    `;
}

function showSetupModal() {
    window.splCloseModal();
    
    const d = document.createElement('div');
    d.id = 'spl-modal';
    d.className = 'modal-overlay';
    d.innerHTML = `
        <div class="modal-box">
            <div class="modal-header">PENGATURAN KATA</div>
            <div class="modal-content">
                <label class="inp-label">KATA / FRASA TARGET</label>
                <input type="text" id="m-word" class="inp-text" placeholder="KETIK DISINI" autocomplete="off" value="${state.isWon ? '' : state.targetWord}">
                
                <label class="inp-label">LEVEL PENGECOH</label>
                <select id="m-lvl" class="inp-text" style="font-size:1rem; text-align-last:center;">
                    <option value="1" ${state.level === 1 ? 'selected' : ''}>LEVEL 1 (TANPA PENGECOH)</option>
                    <option value="2" ${state.level === 2 ? 'selected' : ''}>LEVEL 2 (+3 HURUF ACAK)</option>
                    <option value="3" ${state.level === 3 ? 'selected' : ''}>LEVEL 3 (+6 HURUF ACAK)</option>
                </select>
                
                <label style="display:flex; align-items:center; gap:10px; justify-content:center; cursor:pointer; font-weight:800; font-size:0.9rem; margin-top:10px;">
                    <input type="checkbox" id="m-hint" style="transform:scale(1.3)" ${state.showHint ? 'checked' : ''}> TAMPILKAN BAYANGAN HURUF
                </label>
            </div>
            <div class="modal-footer">
                <button class="btn-modal btn-red" onclick="window.splExitModule()">BATAL & KELUAR</button>
                <button class="btn-modal btn-primary" onclick="window.splSubmit()">MULAI SESI</button>
            </div>
        </div>
    `;
    document.body.appendChild(d);
    setTimeout(() => document.getElementById('m-word').focus(), 100);
}

function submitSetup() {
    let val = document.getElementById('m-word').value.toUpperCase();
    val = val.replace(/\s+/g, ' ').trim(); 
    
    if (!val || !/^[A-Z\s]+$/.test(val)) {
        return alert("Pastikan input hanya berisi huruf alfabet dan spasi.");
    }
    
    if (state.targetWord && !state.isWon) logSession(); 
    
    state.targetWord = val;
    state.level = parseInt(document.getElementById('m-lvl').value);
    state.showHint = document.getElementById('m-hint').checked;
    state.errors = 0;
    state.startTime = Date.now();
    state.isWon = false;
    
    state.slots = val.split('').map((char, idx) => ({ 
        idx: idx, 
        char: char, 
        isSpace: char === ' ' 
    }));
    
    let charsForPool = val.replace(/\s/g, '').split('');
    let distCount = state.level === 2 ? 3 : (state.level === 3 ? 6 : 0);
    
    for(let i=0; i<distCount; i++) {
        charsForPool.push(ALPHABET[Math.floor(Math.random() * 26)]);
    }
    
    for (let i = charsForPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [charsForPool[i], charsForPool[j]] = [charsForPool[j], charsForPool[i]];
    }
    
    state.items = charsForPool.map((char, i) => {
        const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
        return { 
            id: `it-${i}-${Date.now()}`, 
            char: char, 
            pos: 'pool', 
            color: color 
        };
    });
    
    state.items.sort(() => Math.random() - 0.5);
    
    window.splCloseModal();
    renderNav();
    renderBoard();
}

function renderBoard() {
    const board = document.getElementById('spl-board');
    if (!board) return;
    
    document.getElementById('err-count').innerText = state.errors;

    const slotsHTML = state.slots.map(s => {
        if (s.isSpace) return `<div class="slot-space"></div>`;
        
        const itm = state.items.find(i => i.pos === s.idx);
        let innerHTML = '';
        if (itm) {
            innerHTML = `
                <div class="drag-item in-slot ${state.isWon ? 'win-bounce' : ''}" 
                     id="${itm.id}" 
                     style="background:${itm.color}; animation-delay: ${s.idx * 0.1}s;" 
                     onpointerdown="window.splPointerDown(event, '${itm.id}')">
                    ${itm.char}
                </div>`;
        } else if (state.showHint) {
            innerHTML = `<span class="slot-hint">${s.char}</span>`;
        }
        
        return `<div class="slot-box ${itm ? 'occupied' : ''}" data-slotidx="${s.idx}">${innerHTML}</div>`;
    }).join('');

    let poolContent = '';
    if (state.isWon) {
        poolContent = `<button class="btn-next-word" onclick="window.splNextWord()">LANJUT KATA BERIKUTNYA</button>`;
    } else {
        const poolItems = state.items.filter(i => i.pos === 'pool');
        if (poolItems.length > 0) {
            poolContent = poolItems.map(i => `
                <div class="drag-item" 
                     id="${i.id}" 
                     style="background:${i.color};" 
                     onpointerdown="window.splPointerDown(event, '${i.id}')">
                    ${i.char}
                </div>`).join('');
        } else {
            poolContent = `<div style="color:#cbd5e1; font-weight:900; letter-spacing:1px;">SEMUA HURUF DIAMBIL</div>`;
        }
    }

    board.innerHTML = `
        <div class="target-zone">${slotsHTML}</div>
        <div class="items-zone" id="pool-zone">${poolContent}</div>
    `;
}

// --- POINTER TRACKING ENGINE ---
function handlePointerDown(e, id) {
    if (state.isWon) return; 
    e.preventDefault();
    if(dragState.ghost) return;

    dragState.id = id;
    const el = document.getElementById(id);
    if(!el) return;

    dragState.ghost = el.cloneNode(true);
    dragState.ghost.style.position = 'fixed';
    dragState.ghost.style.zIndex = '9999';
    dragState.ghost.style.pointerEvents = 'none'; 
    dragState.ghost.style.width = el.offsetWidth + 'px';
    dragState.ghost.style.height = el.offsetHeight + 'px';
    dragState.ghost.style.margin = '0';
    dragState.ghost.style.opacity = '0.95';
    dragState.ghost.style.boxShadow = '0 15px 25px rgba(0,0,0,0.3)';
    dragState.ghost.classList.remove('in-slot');
    document.body.appendChild(dragState.ghost);

    moveGhost(e.clientX, e.clientY);
    el.classList.add('dimmed');

    window.addEventListener('pointermove', window.splPointerMove, {passive: false});
    window.addEventListener('pointerup', window.splPointerUp);
}

function moveGhost(x, y) {
    if(!dragState.ghost) return;
    dragState.ghost.style.left = (x - dragState.ghost.offsetWidth / 2) + 'px';
    dragState.ghost.style.top = (y - dragState.ghost.offsetHeight / 2) + 'px';
}

function handlePointerMove(e) {
    e.preventDefault();
    moveGhost(e.clientX, e.clientY);
}

function handlePointerUp(e) {
    window.removeEventListener('pointermove', window.splPointerMove);
    window.removeEventListener('pointerup', window.splPointerUp);
    
    if(!dragState.ghost || !dragState.id) return;

    dragState.ghost.remove();
    dragState.ghost = null;

    const dropTarget = document.elementFromPoint(e.clientX, e.clientY);
    const slotEl = dropTarget ? dropTarget.closest('.slot-box') : null;

    const itmId = dragState.id;
    dragState.id = null;

    if (slotEl) {
        const targetIdx = parseInt(slotEl.getAttribute('data-slotidx'));
        processDropToSlot(itmId, targetIdx);
    } else {
        processDropToPool(itmId); 
    }
}

function processDropToSlot(id, targetIdx) {
    const itm = state.items.find(i => i.id === id);
    const targetSlot = state.slots.find(s => s.idx === targetIdx);
    
    if(!itm || !targetSlot || targetSlot.isSpace) return;

    const existing = state.items.find(i => i.pos === targetIdx);
    if (existing) {
        existing.pos = 'pool'; 
    }
    
    if (itm.char !== targetSlot.char) {
        state.errors++;
        itm.pos = 'pool'; 
    } else {
        itm.pos = targetIdx; 
    }

    renderBoard();
    checkWinCondition();
}

function processDropToPool(id) {
    const itm = state.items.find(i => i.id === id);
    if(itm) {
        itm.pos = 'pool';
    }
    renderBoard();
}

// --- LOGIKA SESI & REWARD ---
function retryCurrent() {
    if (state.isWon) return; 
    state.items.forEach(i => i.pos = 'pool');
    state.errors = 0;
    renderBoard();
}

function checkWinCondition() {
    const letterSlots = state.slots.filter(s => !s.isSpace);
    const isWin = letterSlots.every(s => {
        const i = state.items.find(itm => itm.pos === s.idx);
        return i && i.char === s.char;
    });

    if (isWin && !state.isWon) {
        state.isWon = true;
        logSession();
        renderBoard(); 
        fireConfetti();
    }
}

function fireConfetti() {
    const app = document.querySelector('.spell-app');
    for (let i = 0; i < 50; i++) {
        const conf = document.createElement('div');
        conf.className = 'confetti';
        conf.style.left = Math.random() * 100 + 'vw';
        conf.style.backgroundColor = PALETTE[Math.floor(Math.random() * PALETTE.length)];
        conf.style.animationDuration = (Math.random() * 2 + 1) + 's';
        app.appendChild(conf);
        setTimeout(() => conf.remove(), 3000); 
    }
}

// --- ANALYTICS & DASHBOARD LAPORAN ---
function logSession() {
    if (!state.targetWord) return;
    state.sessionLogs.push({ 
        kata: state.targetWord, 
        salah: state.errors, 
        waktu: Math.round((Date.now() - state.startTime) / 1000) 
    });
}

function showAssessment() {
    if (state.targetWord && !state.isWon) logSession(); 
    
    if (state.sessionLogs.length === 0) {
        return window.splExitModule(); 
    }
    
    window.splCloseModal();

    let maxErr = Math.max(...state.sessionLogs.map(l => l.salah), 5); 
    let maxTime = Math.max(...state.sessionLogs.map(l => l.waktu), 30); 

    const errCharts = state.sessionLogs.map(l => {
        let w = (l.salah / maxErr) * 100;
        return `
            <div class="chart-row">
                <div class="chart-label">${l.kata}</div>
                <div class="chart-bar-wrap">
                    <div class="chart-bar bar-err" style="width:${w}%"></div>
                </div>
                <div class="chart-val">${l.salah}x</div>
            </div>`;
    }).join('');

    const timeCharts = state.sessionLogs.map(l => {
        let w = (l.waktu / maxTime) * 100;
        return `
            <div class="chart-row">
                <div class="chart-label">${l.kata}</div>
                <div class="chart-bar-wrap">
                    <div class="chart-bar bar-time" style="width:${w}%"></div>
                </div>
                <div class="chart-val">${l.waktu}s</div>
            </div>`;
    }).join('');

    const d = document.createElement('div');
    d.id = 'spl-modal';
    d.className = 'modal-overlay';
    d.innerHTML = `
        <div class="modal-box">
            <div class="modal-header">LAPORAN PERFORMA SESI</div>
            <div class="modal-content">
                <div class="chart-container">
                    <div class="chart-title">TINGKAT KESALAHAN (MERAH)</div>
                    ${errCharts}
                </div>
                <div class="chart-container">
                    <div class="chart-title">WAKTU SELESAI (BIRU)</div>
                    ${timeCharts}
                </div>
                
                <hr style="border:none; border-top:2px dashed #e2e8f0; margin:30px 0 20px 0;">
                <div style="background:#f8fafc; padding:20px; border-radius:12px; border:1px solid #cbd5e1; text-align:left;">
                    <div style="font-weight:800; color:#1e293b; margin-bottom:15px; text-transform:uppercase; font-size:0.9rem;">Form Observasi Klinis (S.O.A.P)</div>
                    
                    <label class="inp-label">Tingkat Bantuan Akhir (Prompt Level):</label>
                    <select id="spl-final-prompt" class="inp-text" style="font-size:1rem; text-align-last:center; padding:12px;">
                        <option value="0">Mandiri (0)</option>
                        <option value="1">Verbal/Visual Hint (1)</option>
                        <option value="2">Fisik Penuh (2)</option>
                    </select>
                    
                    <label class="inp-label" style="margin-top:15px;">Catatan Terapis:</label>
                    <textarea id="spl-clinical-notes" class="inp-text" style="min-height:80px; resize:vertical; font-size:1rem; text-transform:none; text-align:left; padding:12px;" placeholder="Tuliskan respon dan fokus pasien..."></textarea>
                </div>

            </div>
            <div class="modal-footer">
                <button class="btn-modal btn-red" onclick="window.splExitModule()">✖ KELUAR TANPA SIMPAN</button>
                <button class="btn-modal btn-primary" id="btn-save-spl">💾 SIMPAN REKAM MEDIS</button>
            </div>
        </div>
    `;
    document.body.appendChild(d);
    
    // Bind Database Save Action
    document.getElementById('btn-save-spl').onclick = saveSpellingDataToDB;
}

async function saveSpellingDataToDB() {
    const btn = document.getElementById('btn-save-spl');
    const promptLevel = parseInt(document.getElementById('spl-final-prompt').value);
    const notes = document.getElementById('spl-clinical-notes').value;

    btn.innerHTML = "⏳ MENYIMPAN..."; btn.disabled = true;

    try {
        const rawPatient = localStorage.getItem('eloq_active_patient');
        if (!rawPatient) throw new Error("Pilih pasien terlebih dahulu di bagian header aplikasi!");
        const activePatient = JSON.parse(rawPatient);

        // Cari UUID dari tabel es_menus (Asumsi nama modul: spelling_game)
        const { data: menuData } = await supabase.from('es_menus').select('module_uuid').eq('module_name', 'spelling_game').single();
        const exerciseId = menuData ? menuData.module_uuid : null;

        // Kalkulasi Metrik Agregat
        const totalWords = state.sessionLogs.length;
        let totalErrors = 0;
        let totalTimeMs = 0;
        let totalLetters = 0;

        state.sessionLogs.forEach(log => {
            totalErrors += log.salah;
            totalTimeMs += (log.waktu * 1000);
            totalLetters += log.kata.replace(/\s/g, '').length;
        });

        // Precision: Semakin sedikit salah tarik berbanding panjang kata, semakin presisi.
        let precision = totalLetters > 0 ? ((totalLetters - totalErrors) / totalLetters) * 100 : 0;
        precision = Math.max(0, precision); // Cegah nilai minus jika error terlalu banyak

        const payload = {
            patient_id: activePatient.id,
            exercise_id: exerciseId,
            cognitive_latency_ms: Math.round(totalTimeMs / totalWords), // Rata-rata waktu penyelesaian per kata
            prompt_level: promptLevel,
            is_success: precision >= 80,
            precision_offset_rel: parseFloat(precision.toFixed(2)),
            jitter_index: totalErrors, // Kesalahan peletakan diukur sebagai Jitter
            touch_radius: 0.0,
            session_metadata: {
                module_code: "spelling_engine",
                total_words_completed: totalWords,
                total_errors: totalErrors,
                config_level: state.level,
                config_hint_active: state.showHint,
                word_logs: state.sessionLogs,
                therapist_notes: notes
            }
        };

        const { error } = await supabase.from('es_game_logs').insert(payload);
        if (error) throw error;

        alert("✅ Berhasil! Data Sesi Spelling sudah diamankan ke Database.");
        window.splExitModule();

    } catch (err) {
        alert("GAGAL MENYIMPAN: " + err.message);
        btn.innerHTML = "💾 SIMPAN REKAM MEDIS"; btn.disabled = false;
    }
}