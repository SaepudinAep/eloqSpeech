// eloq_touch_engine.js - V4.8 (Web-App Scroll Setup & Start Trigger)
// Features: Framing Scroll Adjustment, Start Trigger Lock, 2x2 Grid Report.

import { supabase } from '../config.js';

const CONFIG = {
    VALIDATION: { MIN_DURATION_MS: 3000 },
    COLORS: {
        CORRIDOR: '#e2e8f0', CENTER_LINE: '#cbd5e1',
        START_NODE: '#10b981', END_NODE: '#ef4444',
        TRACE_SAFE: '#3b82f6', TRACE_ERROR: '#ef4444', TEXT: '#1e293b'
    }
};

const STYLES = `
    * { box-sizing: border-box; }
    .ete-root {
        position: relative; width: 100%; height: 75vh; min-height: 500px;
        background: #f8fafc; display: flex; flex-direction: column; overflow: hidden;
        font-family: 'Inter', -apple-system, sans-serif; user-select: none; touch-action: none;
        border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        border: 1px solid #cbd5e1;
    }
    .ete-header {
        height: 60px; padding: 0 20px; background: white; border-bottom: 1px solid #e2e8f0;
        display: flex; justify-content: space-between; align-items: center; z-index: 10; flex-shrink: 0;
    }
    .ete-title { font-weight: 700; color: #1e293b; font-size: clamp(0.9rem, 2vw, 1.1rem); }
    .ete-instruction { font-size: clamp(0.8rem, 1.5vw, 0.9rem); color: #64748b; font-weight: 500; }
    .ete-workspace {
        flex: 1; position: relative; background: #ffffff;
        display: flex; justify-content: center; align-items: center;
        min-height: 0; min-width: 0; overflow: hidden;
    }
    canvas { display: block; width: 100%; height: 100%; touch-action: none; }
    .ete-overlay {
        position: absolute; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(248, 250, 252, 0.95); z-index: 100;
        display: flex; flex-direction: column; padding: 30px; overflow-y: auto;
    }
    .ete-start-overlay {
        position: absolute; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(255, 255, 255, 0.85); z-index: 40;
        display: flex; justify-content: center; align-items: center;
        backdrop-filter: blur(2px);
    }
    .ete-menu-container {
        max-width: 600px; margin: auto; width: 100%; background: white;
        padding: 30px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);
    }
    .ete-btn {
        width: 100%; padding: 15px; border: 1px solid #cbd5e1; border-radius: 8px;
        background: white; cursor: pointer; font-weight: 700; margin: 8px 0;
        transition: 0.2s; font-size: 1rem; color: #1e293b; text-align: left;
        display: flex; justify-content: space-between; align-items: center;
    }
    .ete-btn:hover { background: #eff6ff; border-color: #3b82f6; transform: translateY(-2px); box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .ete-btn-primary { 
        background: #10b981; color: white; padding: 15px 40px; border-radius: 30px; 
        font-size: 1.2rem; font-weight: 800; border: none; cursor: pointer; 
        box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3); transition: 0.2s;
    }
    .ete-btn-primary:active { transform: scale(0.95); }
    .ete-icon-btn { padding: 8px 15px; border-radius: 5px; border: 1px solid #cbd5e1; background: white; cursor: pointer; font-weight: bold; color: #1e293b; font-size: 0.85rem; transition: 0.2s; }
    .ete-toast {
        position: absolute; top: 80px; left: 50%; transform: translateX(-50%);
        background: #fee2e2; color: #b91c1c; padding: 12px 25px; border-radius: 30px;
        font-weight: 600; font-size: 0.95rem; border: 2px solid #ef4444; box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        opacity: 0; transition: opacity 0.3s; pointer-events: none; z-index: 50; text-align: center;
    }
    .ete-dash-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 20px; }
    .ete-card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.02); }
    .ete-card-title { font-size: 0.85rem; color: #64748b; text-transform: uppercase; font-weight: 800; margin-bottom: 12px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; }
    .ete-mini-canvas { width: 100%; height: 140px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; }
    .ete-stat-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.9rem; color: #475569; }
    .ete-stat-val { font-weight: 700; color: #1e293b; }
    .text-green { color: #10b981 !important; }
    .text-red { color: #ef4444 !important; }
`;

let state = {
    sequence: [], currentIndex: 0, currentTrial: 1, totalTrials: 1, sessionLogs: [],
    layout: { corridorW: 60, nodeR: 25, tolerance: 30 }, 
    trialData: { mode: null, startTime: 0, pathSegments: [], tracePoints: [], startNode: null, endNode: null, isTracing: false, isReady: false },
    listeners: { move: null, up: null }, 
    canvas: null, ctx: null, resizeHandler: null, isSessionActive: false
};

export function renderEloqTouchEngine(containerId) {
    nukeArtifacts();
    if (!document.getElementById('ete-styles')) {
        const s = document.createElement('style'); s.id = 'ete-styles'; s.innerHTML = STYLES;
        document.head.appendChild(s);
    }
    const root = document.getElementById(containerId);
    root.style.display = 'flex'; root.style.flexDirection = 'column';
    root.innerHTML = `<div class="ete-root" id="ete-app"></div>`;
    showMainMenu(root.querySelector('.ete-root'));
}

function nukeArtifacts() {
    state.isSessionActive = false;
    document.body.style.overflow = ''; // Unlock global scroll
    if (state.resizeHandler) window.removeEventListener('resize', state.resizeHandler);
    if (state.listeners.move) {
        document.removeEventListener('mousemove', state.listeners.move);
        document.removeEventListener('touchmove', state.listeners.move);
        document.removeEventListener('mouseup', state.listeners.up);
        document.removeEventListener('touchend', state.listeners.up);
        state.listeners = { move: null, up: null };
    }
    document.querySelectorAll('.ete-overlay').forEach(el => el.remove());
}

function showMainMenu(appRoot) {
    const overlay = document.createElement('div');
    overlay.className = 'ete-overlay';
    overlay.innerHTML = `
        <div class="ete-menu-container">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h2 style="margin:0; color:#1e293b;">Instrumen Spasial Dinamis</h2>
                <button class="ete-icon-btn" id="btn-exit-menu" style="background:#fff1f2; color:#db2777; border-color:#fbcfe8;">✖ Keluar</button>
            </div>
            <p style="color:#64748b; margin-bottom:25px; font-size:0.95rem;">Evaluasi kontrol motorik klinis.</p>
            <button class="ete-btn" id="btn-battery"><span>[A] Asesmen Kinematik Lengkap</span><span style="font-size:0.8rem; font-weight:normal; color:#64748b;">4 Mode</span></button>
            <div style="margin: 25px 0; border-top: 1px dashed #cbd5e1;"></div>
            <button class="ete-btn" id="btn-iso-straight">Latihan 1: Garis Lurus (Pola U)</button>
            <button class="ete-btn" id="btn-iso-zigzag">Latihan 2: Garis Zig-Zag</button>
            <button class="ete-btn" id="btn-iso-curve">Latihan 3: Gelombang Sinus</button>
            <button class="ete-btn" id="btn-iso-spiral">Latihan 4: Spiral Archimedes</button>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#btn-exit-menu').onclick = () => { nukeArtifacts(); if(typeof window.renderApp === 'function') window.renderApp(null); };
    const startWrap = (seq) => { overlay.remove(); buildWorkspace(appRoot, seq); };
    overlay.querySelector('#btn-battery').onclick = () => startWrap(['straight', 'zigzag', 'curve', 'spiral']);
    overlay.querySelector('#btn-iso-straight').onclick = () => startWrap(['straight']);
    overlay.querySelector('#btn-iso-zigzag').onclick = () => startWrap(['zigzag']);
    overlay.querySelector('#btn-iso-curve').onclick = () => startWrap(['curve']);
    overlay.querySelector('#btn-iso-spiral').onclick = () => startWrap(['spiral']);
}

function buildWorkspace(appRoot, sequence) {
    appRoot.innerHTML = `
        <div class="ete-header">
            <div>
                <div class="ete-title">Asesmen Kinematik Motorik</div>
                <div class="ete-instruction" id="ete-inst">Menyiapkan instrumen...</div>
            </div>
            <button class="ete-icon-btn" id="btn-exit-session" style="background:#fff1f2; color:#db2777; border-color:#fbcfe8;">✖ Keluar</button>
        </div>
        <div class="ete-workspace" id="ete-workspace">
            <canvas id="ete-canvas"></canvas>
            <div class="ete-start-overlay" id="ete-start-overlay" style="display:none;">
                <div style="text-align:center;">
                    <p style="color:#1e293b; font-weight:600; margin-bottom:15px; font-size:1.1rem;">Sesuaikan posisi layar (scroll), lalu tekan Mulai</p>
                    <button class="ete-btn-primary" id="btn-start-trial">MULAI LATIHAN</button>
                </div>
            </div>
            <div class="ete-toast" id="ete-toast"></div>
        </div>
    `;
    document.getElementById('btn-exit-session').onclick = () => { if(confirm('Akhiri sesi?')) { nukeArtifacts(); if(typeof window.renderApp === 'function') window.renderApp(null); } };
    state.canvas = document.getElementById('ete-canvas'); state.ctx = state.canvas.getContext('2d');
    state.sequence = sequence; state.currentIndex = 0; state.currentTrial = 1; state.totalTrials = sequence.length > 1 ? 1 : 3;
    state.sessionLogs = []; state.isSessionActive = true;
    
    state.resizeHandler = () => setupCanvas();
    window.addEventListener('resize', state.resizeHandler);
    attachInteractionListeners(); 
    
    setTimeout(() => {
        setupCanvas(); 
        startTrial();
    }, 100);
}

function setupCanvas() {
    if(!state.isSessionActive || !state.canvas) return;
    const ws = document.getElementById('ete-workspace');
    state.canvas.width = ws.clientWidth; state.canvas.height = ws.clientHeight;
    
    const minDim = Math.min(state.canvas.width, state.canvas.height);
    state.layout.corridorW = Math.min(Math.max(minDim * 0.08, 40), 80);
    state.layout.nodeR = state.layout.corridorW * 0.45; 
    state.layout.tolerance = state.layout.corridorW * 0.55;
    
    if (state.trialData.mode) { generatePathData(state.trialData.mode); drawEnvironment(); }
}

function startTrial() {
    if (!state.isSessionActive) return;
    if (state.currentIndex >= state.sequence.length) { finishSession(); return; }
    const mode = state.sequence[state.currentIndex];
    state.trialData = { mode: mode, startTime: 0, pathSegments: [], tracePoints: [], startNode: null, endNode: null, isTracing: false, isReady: false };
    
    document.body.style.overflow = ''; // Unlock scroll for framing
    
    let modeName = "Lurus"; if(mode === 'zigzag') modeName = "Zig-Zag"; if(mode === 'curve') modeName = "Gelombang"; if(mode === 'spiral') modeName = "Spiral";
    let rotName = ""; if (state.totalTrials > 1) { if(state.currentTrial === 2) rotName = " (Mundur)"; if(state.currentTrial === 3) rotName = " (Cermin)"; }
    document.getElementById('ete-inst').innerText = `Tahap ${state.currentIndex + 1}/${state.sequence.length} : ${modeName}${rotName}`;
    
    generatePathData(mode); drawEnvironment();
    
    // Tampilkan tombol Mulai
    const overlay = document.getElementById('ete-start-overlay');
    overlay.style.display = 'flex';
    document.getElementById('btn-start-trial').onclick = () => {
        overlay.style.display = 'none';
        document.body.style.overflow = 'hidden'; // Kunci scroll saat tes aktif
        state.trialData.isReady = true;
    };
}

function showToast(msg) {
    if(!state.isSessionActive) return;
    const t = document.getElementById('ete-toast');
    if(t) { t.innerText = msg; t.style.opacity = '1'; setTimeout(() => t.style.opacity = '0', 2500); }
}

function generatePathData(mode) {
    const w = state.canvas.width; const h = state.canvas.height;
    const isPortrait = h > w; 
    const minDim = Math.min(w, h);
    
    const safePad = (state.layout.corridorW / 2) + 20;
    const padX = safePad;
    const padY = safePad;
    
    const effW = Math.min(w - (2 * padX), 1000); 
    const effH = Math.min(h - (2 * padY), 1000);
    const startX = (w - effW) / 2;
    const startY = (h - effH) / 2;

    let points = [];
    if (mode === 'straight') {
        points = [ 
            {x: startX, y: startY}, 
            {x: startX + effW, y: startY}, 
            {x: startX + effW, y: startY + effH}, 
            {x: startX, y: startY + effH} 
        ];
    } 
    else if (mode === 'zigzag') {
        const segs = 10;
        if (isPortrait) {
            const stepY = effH / segs;
            const ampX = effW / 2;
            for (let i = 0; i <= segs; i++) points.push({ x: (w/2) + (i % 2 === 0 ? -ampX : ampX), y: startY + (i * stepY) });
        } else {
            const stepX = effW / segs;
            const ampY = effH / 2;
            for (let i = 0; i <= segs; i++) points.push({ x: startX + (i * stepX), y: (h/2) + (i % 2 === 0 ? -ampY : ampY) });
        }
    } 
    else if (mode === 'curve') {
        const waves = 2.5; const steps = 100; 
        if (isPortrait) {
            const ampX = effW / 2;
            for (let i = 0; i <= steps; i++) { const t = i / steps; points.push({ x: (w/2) + Math.sin(t * Math.PI * 2 * waves) * -ampX, y: startY + t * effH }); }
        } else {
            const ampY = effH / 2;
            for (let i = 0; i <= steps; i++) { const t = i / steps; points.push({ x: startX + t * effW, y: (h/2) + Math.sin(t * Math.PI * 2 * waves) * -ampY }); }
        }
    }
    else if (mode === 'spiral') {
        const cx = w / 2; const cy = h / 2;
        const maxRadius = (minDim / 2) - safePad;
        const loops = 3; const steps = 150; const b = maxRadius / (loops * 2 * Math.PI);
        for (let i = 0; i <= steps; i++) {
            const theta = (i / steps) * (loops * 2 * Math.PI); const r = b * theta;
            points.push({ x: cx + r * Math.cos(theta), y: cy + r * Math.sin(theta) });
        }
    }
    
    if (state.totalTrials > 1) {
        if (state.currentTrial === 2) {
            points.reverse();
        } else if (state.currentTrial === 3) {
            if (mode === 'straight') {
                if (isPortrait) { const centerY = h / 2; points = points.map(p => ({ x: p.x, y: centerY + (centerY - p.y) })); } 
                else { const centerX = w / 2; points = points.map(p => ({ x: centerX + (centerX - p.x), y: p.y })); }
            } else {
                if (isPortrait) { const centerX = w / 2; points = points.map(p => ({ x: centerX + (centerX - p.x), y: p.y })); } 
                else { const centerY = h / 2; points = points.map(p => ({ x: p.x, y: centerY + (centerY - p.y) })); }
            }
        }
    }
    
    state.trialData.pathSegments = [];
    for (let i = 1; i < points.length; i++) state.trialData.pathSegments.push({ start: points[i-1], end: points[i] });
    state.trialData.startNode = points[0]; state.trialData.endNode = points[points.length - 1];
}

function distToSegment(p, v, w) {
    const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
    if (l2 === 0) return Math.sqrt(Math.pow(p.x - v.x, 2) + Math.pow(p.y - v.y, 2));
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.sqrt(Math.pow(p.x - (v.x + t * (w.x - v.x)), 2) + Math.pow(p.y - (v.y + t * (w.y - v.y)), 2));
}

function getDistanceFromPath(p) {
    let minDist = Infinity;
    for (let seg of state.trialData.pathSegments) minDist = Math.min(minDist, distToSegment(p, seg.start, seg.end));
    return minDist;
}

function drawEnvironment() {
    const ctx = state.ctx; ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
    const segs = state.trialData.pathSegments; if (segs.length === 0) return;
    
    ctx.beginPath(); ctx.moveTo(segs[0].start.x, segs[0].start.y);
    for (let seg of segs) ctx.lineTo(seg.end.x, seg.end.y);
    ctx.lineWidth = state.layout.corridorW; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = CONFIG.COLORS.CORRIDOR; ctx.stroke();
    
    ctx.beginPath(); ctx.moveTo(segs[0].start.x, segs[0].start.y);
    for (let seg of segs) ctx.lineTo(seg.end.x, seg.end.y);
    ctx.lineWidth = 2; ctx.strokeStyle = CONFIG.COLORS.CENTER_LINE; ctx.stroke();
    
    ctx.beginPath(); ctx.arc(state.trialData.endNode.x, state.trialData.endNode.y, state.layout.nodeR, 0, Math.PI*2); ctx.fillStyle = CONFIG.COLORS.END_NODE; ctx.fill();
    ctx.beginPath(); ctx.arc(state.trialData.startNode.x, state.trialData.startNode.y, state.layout.nodeR, 0, Math.PI*2); ctx.fillStyle = CONFIG.COLORS.START_NODE; ctx.fill();
    drawTrace();
}

function drawTrace() {
    const ctx = state.ctx; const points = state.trialData.tracePoints; if (points.length < 2) return;
    for (let i = 1; i < points.length; i++) {
        ctx.beginPath(); ctx.moveTo(points[i-1].x, points[i-1].y); ctx.lineTo(points[i].x, points[i].y);
        ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.strokeStyle = points[i].isError ? CONFIG.COLORS.TRACE_ERROR : CONFIG.COLORS.TRACE_SAFE; ctx.stroke();
    }
}

function attachInteractionListeners() {
    const cvs = state.canvas;
    const getPos = (e) => {
        const rect = cvs.getBoundingClientRect();
        return { x: (e.touches ? e.touches[0].clientX : e.clientX) - rect.left, y: (e.touches ? e.touches[0].clientY : e.clientY) - rect.top };
    };

    const onDown = (e) => {
        if(!state.isSessionActive || !state.trialData.isReady) return; e.preventDefault();
        const pos = getPos(e); const start = state.trialData.startNode;
        if (Math.sqrt(Math.pow(pos.x - start.x, 2) + Math.pow(pos.y - start.y, 2)) <= state.layout.nodeR * 1.5) {
            state.trialData.isTracing = true; state.trialData.startTime = Date.now(); state.trialData.tracePoints = [{ x: pos.x, y: pos.y, time: 0, dist: 0, isError: false }];
        } else showToast("Ketuk dan mulai dari Lingkaran HIJAU");
    };
    
    const onMove = (e) => {
        if (!state.trialData.isTracing || !state.isSessionActive || !state.trialData.isReady) return; e.preventDefault();
        const pos = getPos(e); const dist = getDistanceFromPath(pos); const safeDist = isNaN(dist) ? 0 : dist; 
        state.trialData.tracePoints.push({ x: pos.x, y: pos.y, time: Date.now() - state.trialData.startTime, dist: safeDist, isError: safeDist > state.layout.tolerance });
        drawEnvironment();
    };
    
    const onUp = (e) => {
        if (!state.trialData.isTracing || !state.isSessionActive || !state.trialData.isReady) return; state.trialData.isTracing = false;
        const last = state.trialData.tracePoints[state.trialData.tracePoints.length - 1]; const end = state.trialData.endNode;
        if (Math.sqrt(Math.pow(last.x - end.x, 2) + Math.pow(last.y - end.y, 2)) <= state.layout.nodeR * 2) {
            if (last.time < CONFIG.VALIDATION.MIN_DURATION_MS) { showToast(`Terlalu cepat! Ulangi perlahan.`); state.trialData.tracePoints = []; drawEnvironment(); } 
            else saveLogAndNext();
        } else { showToast("Garis terputus sebelum ujung. Silakan ulangi."); state.trialData.tracePoints = []; drawEnvironment(); }
    };
    
    state.listeners.move = onMove; state.listeners.up = onUp;
    cvs.addEventListener('mousedown', onDown); cvs.addEventListener('touchstart', onDown, {passive:false});
    document.addEventListener('mousemove', onMove); document.addEventListener('touchmove', onMove, {passive:false});
    document.addEventListener('mouseup', onUp); document.addEventListener('touchend', onUp);
}

function saveLogAndNext() {
    const pts = state.trialData.tracePoints; const duration = pts[pts.length-1].time;
    let errs = 0, tDist = 0; pts.forEach(p => { if (p.isError) errs++; tDist += p.dist; });
    state.sessionLogs.push({
        mode: state.trialData.mode, trial: state.currentTrial, duration: duration,
        accuracy: ((pts.length - errs) / Math.max(pts.length, 1)) * 100,
        avgDeviation: isNaN(tDist / Math.max(pts.length, 1)) ? 0 : (tDist / Math.max(pts.length, 1)),
        pathRef: JSON.parse(JSON.stringify(state.trialData.pathSegments)), traceRef: JSON.parse(JSON.stringify(pts)), layoutRef: { ...state.layout }
    });
    if (state.currentTrial < state.totalTrials) { 
        state.currentTrial++; 
        showToast(`Bersiap Uji ${state.currentTrial}/${state.totalTrials}`); 
        setTimeout(() => { if(state.isSessionActive) startTrial(); }, 1200); 
    } else { 
        state.currentTrial = 1; state.currentIndex++; 
        startTrial(); 
    }
}

function finishSession() {
    if(!state.isSessionActive) return;
    if (state.resizeHandler) window.removeEventListener('resize', state.resizeHandler);
    
    document.body.style.overflow = ''; // Unlock scroll saat laporan muncul
    
    if(state.ctx && state.canvas) {
        state.ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
    }
    
    const totDur = state.sessionLogs.reduce((s, l) => s + l.duration, 0);
    const avgAcc = state.sessionLogs.reduce((s, l) => s + l.accuracy, 0) / Math.max(state.sessionLogs.length, 1);
    
    let cardsHTML = '';
    state.sessionLogs.forEach((log, i) => {
        let ml = "Lurus"; if(log.mode === 'zigzag') ml = "Zig-Zag"; if(log.mode === 'curve') ml = "Gelombang"; if(log.mode === 'spiral') ml = "Spiral";
        cardsHTML += `
            <div class="ete-card">
                <div class="ete-card-title">${ml} (Uji ${log.trial}/${state.totalTrials})</div>
                <div class="ete-stat-row"><span>Akurasi:</span> <span class="ete-stat-val ${log.accuracy > 80 ? 'text-green' : 'text-red'}">${log.accuracy.toFixed(1)}%</span></div>
                <div class="ete-stat-row"><span>Deviasi:</span> <span class="ete-stat-val">${log.avgDeviation.toFixed(2)} px</span></div>
                <div class="ete-stat-row"><span>Waktu:</span> <span class="ete-stat-val">${(log.duration/1000).toFixed(2)} s</span></div>
                <canvas id="mini-cvs-${i}" class="ete-mini-canvas" style="margin-top:10px;"></canvas>
            </div>
        `;
    });

    const overlay = document.createElement('div'); overlay.className = 'ete-overlay';
    overlay.innerHTML = `
        <div style="max-width: 900px; margin: 0 auto; width: 100%;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <h2 style="text-align:center; color:#1e293b; margin:0; flex:1;">Laporan Klinis Motorik</h2>
                <button class="ete-icon-btn" id="btn-dash-exit" style="background:#fff1f2; color:#db2777; border-color:#fbcfe8;">✖ Keluar</button>
            </div>
            <div style="background:white; padding:20px; border-radius:12px; border:1px solid #e2e8f0; display:flex; justify-content:space-around; margin-bottom:20px;">
                <div style="text-align:center;"><div style="font-size:2.2rem; font-weight:800; color:#1e293b;">${avgAcc.toFixed(1)}%</div><div style="font-size:0.85rem; color:#64748b; font-weight:600;">RATA-RATA AKURASI</div></div>
                <div style="text-align:center;"><div style="font-size:2.2rem; font-weight:800; color:#1e293b;">${(totDur/1000).toFixed(1)}s</div><div style="font-size:0.85rem; color:#64748b; font-weight:600;">WAKTU AKTIF</div></div>
            </div>
            <div class="ete-dash-grid">${cardsHTML}</div>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#btn-dash-exit').onclick = () => { nukeArtifacts(); if(typeof window.renderApp === 'function') window.renderApp(null); };
    setTimeout(() => { state.sessionLogs.forEach((log, i) => { drawMiniature(`mini-cvs-${i}`, log.pathRef, log.traceRef, log.layoutRef); }); }, 150);
}

function drawMiniature(canvasId, pathSegments, tracePoints, layoutRef) {
    const cvs = document.getElementById(canvasId); if (!cvs) return;
    cvs.width = cvs.clientWidth; cvs.height = cvs.clientHeight; const ctx = cvs.getContext('2d');
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    pathSegments.forEach(s => { minX = Math.min(minX, s.start.x, s.end.x); maxX = Math.max(maxX, s.start.x, s.end.x); minY = Math.min(minY, s.start.y, s.end.y); maxY = Math.max(maxY, s.start.y, s.end.y); });
    const pW = maxX - minX; const pH = maxY - minY; const padding = 20;
    const scale = Math.min((cvs.width - padding*2) / (pW || 1), (cvs.height - padding*2) / (pH || 1));
    const trX = (x) => padding + (x - minX) * scale; const trY = (y) => (cvs.height/2) + (y - (minY + pH/2)) * scale;
    
    ctx.beginPath(); ctx.moveTo(trX(pathSegments[0].start.x), trY(pathSegments[0].start.y));
    for (let seg of pathSegments) ctx.lineTo(trX(seg.end.x), trY(seg.end.y));
    ctx.lineWidth = Math.max((layoutRef ? layoutRef.corridorW : 60) * scale, 4); ctx.strokeStyle = CONFIG.COLORS.CORRIDOR; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
    
    if (tracePoints.length < 2) return;
    for (let i = 1; i < tracePoints.length; i++) {
        ctx.beginPath(); ctx.moveTo(trX(tracePoints[i-1].x), trY(tracePoints[i-1].y)); ctx.lineTo(trX(tracePoints[i].x), trY(tracePoints[i].y));
        ctx.lineWidth = 2; ctx.strokeStyle = tracePoints[i].isError ? CONFIG.COLORS.TRACE_ERROR : CONFIG.COLORS.TRACE_SAFE; ctx.stroke();
    }
}