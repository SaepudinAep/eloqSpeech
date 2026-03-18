// eloq_touch_engine.js - V5.9 (DYNAMIC TRIALS & CLINICAL WORKFLOW)
// SOP: Pre-Flight (Menu), In-Flight (Pause & Finish), Post-Flight (Prompting & S.O.A.P)
// Smart Fix: Auto-fetch module_uuid from es_menus & Dynamic Trials (Battery 1x, Isolate 3x)

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
    .ete-pause-overlay {
        position: absolute; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(30, 41, 59, 0.85); z-index: 80;
        display: flex; justify-content: center; align-items: center;
        backdrop-filter: blur(4px); color: white;
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
        transition: 0.2s; font-size: 1rem; color: #1e293b; text-align: center;
        display: flex; justify-content: center; align-items: center; gap: 8px;
    }
    .ete-btn:hover { background: #eff6ff; border-color: #3b82f6; transform: translateY(-2px); box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .ete-btn-primary { 
        background: #10b981; color: white; padding: 15px; border-radius: 8px; 
        font-size: 1rem; font-weight: 800; border: none; cursor: pointer; 
        box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3); transition: 0.2s;
        display: flex; justify-content: center; align-items: center; gap: 8px;
    }
    .ete-btn-primary:active { transform: scale(0.95); }
    .ete-icon-btn { padding: 8px 12px; border-radius: 6px; border: 1px solid #cbd5e1; background: white; cursor: pointer; font-weight: bold; color: #1e293b; font-size: 0.85rem; transition: 0.2s; display: flex; align-items: center; gap: 4px; }
    .ete-toast {
        position: absolute; top: 80px; left: 50%; transform: translateX(-50%);
        background: #fee2e2; color: #b91c1c; padding: 12px 25px; border-radius: 30px;
        font-weight: 600; font-size: 0.95rem; border: 2px solid #ef4444; box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        opacity: 0; transition: opacity 0.3s; pointer-events: none; z-index: 50; text-align: center;
    }
    .ete-dash-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 20px; }
    .ete-card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.02); }
    .ete-card-title { font-size: 0.8rem; color: #64748b; text-transform: uppercase; font-weight: 800; margin-bottom: 8px; border-bottom: 2px solid #f1f5f9; padding-bottom: 6px; }
    .ete-mini-canvas { width: 100%; height: 120px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; }
    .ete-stat-row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 0.85rem; color: #475569; }
    .ete-stat-val { font-weight: 700; color: #1e293b; }
    .text-green { color: #10b981 !important; }
    .text-red { color: #ef4444 !important; }
`;

let state = {
    isPaused: false, lastPauseStart: 0, totalPausedTime: 0,
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
    state.isSessionActive = false; state.isPaused = false;
    document.body.style.overflow = ''; 
    if (state.resizeHandler) window.removeEventListener('resize', state.resizeHandler);
    if (state.listeners.move) {
        document.removeEventListener('mousemove', state.listeners.move);
        document.removeEventListener('touchmove', state.listeners.move);
        document.removeEventListener('mouseup', state.listeners.up);
        document.removeEventListener('touchend', state.listeners.up);
        state.listeners = { move: null, up: null };
    }
    document.querySelectorAll('.ete-overlay, .ete-pause-overlay').forEach(el => el.remove());
}

function showMainMenu(appRoot) {
    const overlay = document.createElement('div');
    overlay.className = 'ete-overlay';
    overlay.innerHTML = `
        <div class="ete-menu-container">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h2 style="margin:0; color:#1e293b;">Motorik Spasial</h2>
                <button class="ete-icon-btn" id="btn-exit-menu" style="background:#fff1f2; color:#db2777; border-color:#fbcfe8;">✖ Keluar</button>
            </div>
            <p style="color:#64748b; margin-bottom:20px; font-size:0.9rem;">Pilih mode asesmen atau latihan untuk pasien:</p>
            <button class="ete-btn" id="btn-battery" style="justify-content:space-between; border-color:#3b82f6; background:#eff6ff;">
                <span>[A] Asesmen Kinematik Lengkap</span><span style="font-size:0.8rem; font-weight:normal; color:#3b82f6;">4 Mode x 1 Uji</span>
            </button>
            <button class="ete-btn" id="btn-iso-straight" style="justify-content:space-between;">
                <span>Pola 1: Garis Lurus (Pola U)</span><span style="font-size:0.8rem; font-weight:normal; color:#64748b;">3 Uji (Drill)</span>
            </button>
            <button class="ete-btn" id="btn-iso-zigzag" style="justify-content:space-between;">
                <span>Pola 2: Garis Zig-Zag</span><span style="font-size:0.8rem; font-weight:normal; color:#64748b;">3 Uji (Drill)</span>
            </button>
            <button class="ete-btn" id="btn-iso-curve" style="justify-content:space-between;">
                <span>Pola 3: Gelombang Sinus</span><span style="font-size:0.8rem; font-weight:normal; color:#64748b;">3 Uji (Drill)</span>
            </button>
            <button class="ete-btn" id="btn-iso-spiral" style="justify-content:space-between;">
                <span>Pola 4: Spiral Archimedes</span><span style="font-size:0.8rem; font-weight:normal; color:#64748b;">3 Uji (Drill)</span>
            </button>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#btn-exit-menu').onclick = () => { nukeArtifacts(); if(typeof window.renderApp === 'function') window.renderApp(null); };
    
    // Parameter kedua adalah jumlah Uji (Trials)
    const startWrap = (seq, trials) => { overlay.remove(); buildWorkspace(appRoot, seq, trials); };
    
    overlay.querySelector('#btn-battery').onclick = () => startWrap(['straight', 'zigzag', 'curve', 'spiral'], 1);
    overlay.querySelector('#btn-iso-straight').onclick = () => startWrap(['straight'], 3);
    overlay.querySelector('#btn-iso-zigzag').onclick = () => startWrap(['zigzag'], 3);
    overlay.querySelector('#btn-iso-curve').onclick = () => startWrap(['curve'], 3);
    overlay.querySelector('#btn-iso-spiral').onclick = () => startWrap(['spiral'], 3);
}

function buildWorkspace(appRoot, sequence, trials) {
    appRoot.innerHTML = `
        <div class="ete-header">
            <div>
                <div class="ete-title">Asesmen Kinematik Motorik</div>
                <div class="ete-instruction" id="ete-inst">Menyiapkan...</div>
            </div>
            <div style="display:flex; gap:8px;">
                <button class="ete-icon-btn" id="btn-pause-session" style="background:#fefce8; color:#a16207; border-color:#fef08a; display:none;">⏸ Jeda</button>
                <button class="ete-icon-btn" id="btn-force-finish" style="background:#f0fdf4; color:#166534; border-color:#bbf7d0; display:none;">⏹ Selesai</button>
                <button class="ete-icon-btn" id="btn-exit-session" style="background:#fff1f2; color:#db2777; border-color:#fbcfe8;">✖ Batal</button>
            </div>
        </div>
        <div class="ete-workspace" id="ete-workspace">
            <canvas id="ete-canvas"></canvas>
            <div class="ete-start-overlay" id="ete-start-overlay" style="display:none;">
                <div style="text-align:center;">
                    <p style="color:#1e293b; font-weight:600; margin-bottom:15px; font-size:1.1rem;" id="ete-start-msg">Sesuaikan posisi layar, lalu tekan Mulai</p>
                    <button class="ete-btn-primary" id="btn-start-trial" style="padding:15px 40px; border-radius:30px; font-size:1.2rem;">MULAI UJI</button>
                </div>
            </div>
            <div id="pause-layer" class="ete-pause-overlay" style="display:none;">
                <div style="text-align:center;">
                    <div style="font-size:3rem; margin-bottom:15px;">⏸️</div>
                    <div style="font-weight:800; font-size:1.5rem; color:white; margin-bottom:20px;">SESI DIJEDA</div>
                    <button class="ete-btn-primary" id="btn-resume-internal" style="background:#3b82f6; padding:15px 40px;">▶ LANJUTKAN</button>
                </div>
            </div>
            <div class="ete-toast" id="ete-toast"></div>
        </div>
    `;

    document.getElementById('btn-pause-session').onclick = togglePause;
    document.getElementById('btn-resume-internal').onclick = togglePause;
    document.getElementById('btn-force-finish').onclick = () => { if(state.sessionLogs.length > 0) { finishSession(); } else { alert('Belum ada data untuk disimpan.'); } };
    document.getElementById('btn-exit-session').onclick = () => { if(confirm('Batalkan sesi? Data tidak akan disimpan.')) { nukeArtifacts(); if(typeof window.renderApp === 'function') window.renderApp(null); } };

    state.canvas = document.getElementById('ete-canvas'); state.ctx = state.canvas.getContext('2d');
    
    // Set parameter dinamis
    state.sequence = sequence; 
    state.currentIndex = 0; 
    state.currentTrial = 1; 
    state.totalTrials = trials;
    
    state.sessionLogs = []; state.isSessionActive = true;
    
    state.resizeHandler = () => setupCanvas();
    window.addEventListener('resize', state.resizeHandler);
    attachInteractionListeners(); 
    
    setTimeout(() => { setupCanvas(); startTrial(); }, 100);
}

function togglePause() {
    if (!state.trialData.isReady || !state.isSessionActive) return;
    const btn = document.getElementById('btn-pause-session');
    const layer = document.getElementById('pause-layer');
    if (!state.isPaused) {
        state.isPaused = true; state.lastPauseStart = Date.now();
        btn.innerHTML = '▶ Lanjut'; layer.style.display = 'flex';
    } else {
        state.isPaused = false; state.totalPausedTime += (Date.now() - state.lastPauseStart);
        btn.innerHTML = '⏸ Jeda'; layer.style.display = 'none';
    }
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
    state.totalPausedTime = 0;
    
    document.body.style.overflow = ''; 
    document.getElementById('btn-pause-session').style.display = 'none';
    document.getElementById('btn-force-finish').style.display = (state.sessionLogs.length > 0) ? 'block' : 'none';
    
    let modeName = "Lurus"; if(mode === 'zigzag') modeName = "Zig-Zag"; if(mode === 'curve') modeName = "Gelombang"; if(mode === 'spiral') modeName = "Spiral";
    
    // Teks dinamis menyesuaikan totalTrials
    document.getElementById('ete-inst').innerText = `${modeName.toUpperCase()} (Uji ${state.currentTrial}/${state.totalTrials})`;
    document.getElementById('ete-start-msg').innerText = `Bersiap ${modeName} - Uji ke-${state.currentTrial} dari ${state.totalTrials}`;
    
    generatePathData(mode); drawEnvironment();
    const overlay = document.getElementById('ete-start-overlay');
    overlay.style.display = 'flex';
    document.getElementById('btn-start-trial').onclick = () => {
        overlay.style.display = 'none'; document.body.style.overflow = 'hidden';
        document.getElementById('btn-pause-session').style.display = 'block';
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
    const isPortrait = h > w; const minDim = Math.min(w, h);
    const safePad = (state.layout.corridorW / 2) + 20;
    const effW = Math.min(w - (2 * safePad), 1000); const effH = Math.min(h - (2 * safePad), 1000);
    const startX = (w - effW) / 2; const startY = (h - effH) / 2;
    let points = [];
    if (mode === 'straight') points = [ {x: startX, y: startY}, {x: startX + effW, y: startY}, {x: startX + effW, y: startY + effH}, {x: startX, y: startY + effH} ];
    else if (mode === 'zigzag') {
        const segs = 10;
        if (isPortrait) {
            const stepY = effH / segs; const ampX = effW / 2;
            for (let i = 0; i <= segs; i++) points.push({ x: (w/2) + (i % 2 === 0 ? -ampX : ampX), y: startY + (i * stepY) });
        } else {
            const stepX = effW / segs; const ampY = effH / 2;
            for (let i = 0; i <= segs; i++) points.push({ x: startX + (i * stepX), y: (h/2) + (i % 2 === 0 ? -ampY : ampY) });
        }
    } 
    else if (mode === 'curve') {
        const waves = 2.5; const steps = 100; 
        if (isPortrait) {
            const ampX = effW / 2;
            for (let i = 0; i <= steps; i++) points.push({ x: (w/2) + Math.sin((i/steps) * Math.PI * 2 * waves) * -ampX, y: startY + (i/steps) * effH });
        } else {
            const ampY = effH / 2;
            for (let i = 0; i <= steps; i++) points.push({ x: startX + (i/steps) * effW, y: (h/2) + Math.sin((i/steps) * Math.PI * 2 * waves) * -ampY });
        }
    }
    else if (mode === 'spiral') {
        const cx = w/2; const cy = h/2; const maxRadius = (minDim/2) - safePad;
        const loops = 3; const steps = 150; const b = maxRadius / (loops * 2 * Math.PI);
        for (let i = 0; i <= steps; i++) {
            const theta = (i/steps) * (loops * 2 * Math.PI); const r = b * theta;
            points.push({ x: cx + r * Math.cos(theta), y: cy + r * Math.sin(theta) });
        }
    }
    
    // Logika Uji 2 (Mundur) & Uji 3 (Cermin) untuk variasi motorik
    if (state.currentTrial === 2) points.reverse();
    if (state.currentTrial === 3) {
        if (isPortrait) points = points.map(p => ({ x: (w/2) + ((w/2) - p.x), y: p.y }));
        else points = points.map(p => ({ x: p.x, y: (h/2) + ((h/2) - p.y) }));
    }

    state.trialData.pathSegments = [];
    for (let i = 1; i < points.length; i++) state.trialData.pathSegments.push({ start: points[i-1], end: points[i] });
    state.trialData.startNode = points[0]; state.trialData.endNode = points[points.length - 1];
}

function distToSegment(p, v, w) {
    const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
    if (l2 === 0) return Math.sqrt(Math.pow(p.x - v.x, 2) + Math.pow(p.y - v.y, 2));
    let t = Math.max(0, Math.min(1, ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2));
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
        if(!state.isSessionActive || !state.trialData.isReady || state.isPaused) return; e.preventDefault();
        const pos = getPos(e); const start = state.trialData.startNode;
        if (Math.sqrt(Math.pow(pos.x - start.x, 2) + Math.pow(pos.y - start.y, 2)) <= state.layout.nodeR * 1.5) {
            state.trialData.isTracing = true; state.trialData.startTime = Date.now(); state.totalPausedTime = 0;
            state.trialData.tracePoints = [{ x: pos.x, y: pos.y, time: 0, dist: 0, isError: false }];
        } else showToast("Mulai dari Hijau");
    };
    const onMove = (e) => {
        if (!state.trialData.isTracing || state.isPaused) return; e.preventDefault();
        const pos = getPos(e); const dist = getDistanceFromPath(pos);
        const currentTime = (Date.now() - state.trialData.startTime) - state.totalPausedTime;
        state.trialData.tracePoints.push({ x: pos.x, y: pos.y, time: currentTime, dist: dist, isError: dist > state.layout.tolerance });
        drawEnvironment();
    };
    const onUp = (e) => {
        if (!state.trialData.isTracing || state.isPaused) return; state.trialData.isTracing = false;
        const last = state.trialData.tracePoints[state.trialData.tracePoints.length - 1]; const end = state.trialData.endNode;
        if (Math.sqrt(Math.pow(last.x - end.x, 2) + Math.pow(last.y - end.y, 2)) <= state.layout.nodeR * 2) {
            if (last.time < CONFIG.VALIDATION.MIN_DURATION_MS) { showToast(`Terlalu cepat!`); state.trialData.tracePoints = []; drawEnvironment(); } 
            else saveLogAndNext();
        } else { showToast("Garis terputus!"); state.trialData.tracePoints = []; drawEnvironment(); }
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
        avgDeviation: tDist / Math.max(pts.length, 1),
        pathRef: JSON.parse(JSON.stringify(state.trialData.pathSegments)), traceRef: JSON.parse(JSON.stringify(pts)), layoutRef: { ...state.layout }
    });
    
    // Logika pengulangan dinamis (menggunakan state.totalTrials)
    if (state.currentTrial < state.totalTrials) {
        state.currentTrial++;
        startTrial();
    } else {
        state.currentTrial = 1;
        state.currentIndex++;
        startTrial();
    }
}

function finishSession() {
    if(!state.isSessionActive) return;
    if (state.resizeHandler) window.removeEventListener('resize', state.resizeHandler);
    document.body.style.overflow = ''; if(state.ctx && state.canvas) state.ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
    
    const totDur = state.sessionLogs.reduce((s, l) => s + l.duration, 0);
    const avgAcc = state.sessionLogs.reduce((s, l) => s + l.accuracy, 0) / Math.max(state.sessionLogs.length, 1);
    
    let cardsHTML = state.sessionLogs.map((log, i) => `
        <div class="ete-card">
            <div class="ete-card-title">${log.mode.toUpperCase()} (Uji ${log.trial})</div>
            <div class="ete-stat-row"><span>Akurasi:</span> <span class="ete-stat-val ${log.accuracy > 80 ? 'text-green' : 'text-red'}">${log.accuracy.toFixed(1)}%</span></div>
            <div class="ete-stat-row"><span>Deviasi:</span> <span class="ete-stat-val">${log.avgDeviation.toFixed(2)} px</span></div>
            <canvas id="mini-cvs-${i}" class="ete-mini-canvas" style="margin-top:8px;"></canvas>
        </div>
    `).join('');

    const overlay = document.createElement('div'); overlay.className = 'ete-overlay';
    overlay.innerHTML = `
        <div style="max-width: 900px; margin: 0 auto; width: 100%;">
            <h2 style="text-align:center; color:#1e293b; margin-top:0;">Laporan Akhir Motorik</h2>
            <div style="background:white; padding:20px; border-radius:12px; border:1px solid #e2e8f0; display:flex; justify-content:space-around; margin-bottom:20px;">
                <div style="text-align:center;"><div style="font-size:2rem; font-weight:800;">${avgAcc.toFixed(1)}%</div><div style="font-size:0.8rem; color:#64748b; font-weight:600;">AKURASI</div></div>
                <div style="text-align:center;"><div style="font-size:2rem; font-weight:800;">${(totDur/1000).toFixed(1)}s</div><div style="font-size:0.8rem; color:#64748b; font-weight:600;">DURASI</div></div>
            </div>
            <div class="ete-dash-grid">${cardsHTML}</div>
            <div style="margin-top: 25px; background: white; padding: 25px; border-radius: 12px; border: 1px solid #e2e8f0;">
                <div style="margin-bottom:20px;">
                    <label style="display:block; font-weight:800; color:#475569; margin-bottom:8px;">Tingkat Bantuan (Prompt Level):</label>
                    <select id="ete-final-prompt" style="width:100%; padding:12px; border-radius:8px; border:1px solid #cbd5e1; font-weight:600;">
                        <option value="0">Mandiri (0)</option><option value="1">Verbal/Visual (1)</option><option value="2">Fisik Penuh (2)</option>
                    </select>
                </div>
                <label style="display:block; font-weight:800; color:#475569; margin-bottom:8px;">Catatan Observasi (S.O.A.P):</label>
                <textarea id="ete-clinical-notes" style="width:100%; padding:12px; border-radius:8px; border:1px solid #cbd5e1; min-height:80px;" placeholder="Tulis catatan..."></textarea>
                <div style="display:flex; gap:12px; margin-top:20px;">
                    <button id="btn-save" class="ete-btn-primary" style="flex:2;">💾 SIMPAN</button>
                    <button id="btn-retry" class="ete-btn" style="flex:1;">🔄 ULANGI</button>
                    <button id="btn-exit" class="ete-btn" style="flex:1; color:#ef4444; border-color:#fca5a5;">✖ KELUAR</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#btn-save').onclick = () => saveClinicalDataToDB(totDur, avgAcc);
    overlay.querySelector('#btn-retry').onclick = () => { overlay.remove(); nukeArtifacts(); renderEloqTouchEngine('ete-app'); };
    overlay.querySelector('#btn-exit').onclick = () => { overlay.remove(); nukeArtifacts(); if(typeof window.renderApp === 'function') window.renderApp(null); };
    setTimeout(() => { state.sessionLogs.forEach((log, i) => drawMiniature(`mini-cvs-${i}`, log.pathRef, log.traceRef, log.layoutRef)); }, 150);
}

async function saveClinicalDataToDB(totDur, avgAcc) {
    const btn = document.getElementById('btn-save');
    const notes = document.getElementById('ete-clinical-notes').value;
    const finalPrompt = parseInt(document.getElementById('ete-final-prompt').value);
    btn.innerHTML = "⏳ MENYIMPAN..."; btn.disabled = true;

    try {
        const rawPatient = localStorage.getItem('eloq_active_patient');
        if (!rawPatient) throw new Error("⚠️ Pasien belum dipilih! Pilih pasien di bagian atas.");
        const activePatient = JSON.parse(rawPatient);
        
        // --- SMART BYPASS: TARIK LANGSUNG UUID DARI ES_MENUS ---
        const { data: menuData, error: menuErr } = await supabase
            .from('es_menus')
            .select('module_uuid')
            .eq('module_name', 'eloq_touch_engine')
            .single();

        if (menuErr) console.warn("Gagal menarik UUID Modul:", menuErr);
        const exerciseId = menuData ? menuData.module_uuid : null;

        const avgDev = state.sessionLogs.reduce((s, l) => s + l.avgDeviation, 0) / Math.max(state.sessionLogs.length, 1);
        const totalErrors = state.sessionLogs.reduce((s, l) => s + (l.traceRef.filter(p => p.isError).length), 0);
        
        const payload = {
            patient_id: activePatient.id,
            exercise_id: exerciseId, // <--- 100% PASTI TERISI UUID YANG BENAR
            cognitive_latency_ms: Math.round(totDur),
            prompt_level: finalPrompt,
            is_success: avgAcc >= 80,
            precision_offset_rel: parseFloat(avgDev.toFixed(2)),
            jitter_index: totalErrors, 
            touch_radius: 0.0,
            session_metadata: {
                module_code: "motoric_touch_engine",
                accuracy_pct: parseFloat(avgAcc.toFixed(2)),
                config: { mode: "kinematic_battery", sequence: state.sequence },
                round_details: state.sessionLogs.map(l => ({ 
                    target: l.mode, 
                    mistakes: l.traceRef.filter(p => p.isError).length, 
                    latency_ms: Math.round(l.duration) 
                })),
                module_specific_data: { raw_trace_logs: state.sessionLogs },
                therapist_notes: notes
            }
        };
        
        const { error } = await supabase.from('es_game_logs').insert(payload);
        if (error) throw error;
        
        alert("✅ Berhasil! Data Sesi Motorik sudah diamankan ke Database.");
        nukeArtifacts(); 
        if(typeof window.renderApp === 'function') window.renderApp(null);

    } catch (err) {
        alert("KESALAHAN SISTEM: " + err.message); 
        btn.innerHTML = "💾 SIMPAN"; btn.disabled = false;
    }
}

function drawMiniature(canvasId, pathSegments, tracePoints, layoutRef) {
    const cvs = document.getElementById(canvasId); if (!cvs) return;
    cvs.width = cvs.clientWidth; cvs.height = cvs.clientHeight; const ctx = cvs.getContext('2d');
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    pathSegments.forEach(s => { minX = Math.min(minX, s.start.x, s.end.x); maxX = Math.max(maxX, s.start.x, s.end.x); minY = Math.min(minY, s.start.y, s.end.y); maxY = Math.max(maxY, s.start.y, s.end.y); });
    const scale = Math.min((cvs.width-30)/(maxX-minX), (cvs.height-30)/(maxY-minY));
    const trX = (x) => 15 + (x - minX) * scale; const trY = (y) => (cvs.height/2) + (y - (minY + (maxY-minY)/2)) * scale;
    ctx.beginPath(); ctx.moveTo(trX(pathSegments[0].start.x), trY(pathSegments[0].start.y));
    for (let seg of pathSegments) ctx.lineTo(trX(seg.end.x), trY(seg.end.y));
    ctx.lineWidth = Math.max(layoutRef.corridorW * scale, 3); ctx.strokeStyle = CONFIG.COLORS.CORRIDOR; ctx.lineCap = 'round'; ctx.stroke();
    for (let i = 1; i < tracePoints.length; i++) {
        ctx.beginPath(); ctx.moveTo(trX(tracePoints[i-1].x), trY(tracePoints[i-1].y)); ctx.lineTo(trX(tracePoints[i].x), trY(tracePoints[i].y));
        ctx.lineWidth = 1.5; ctx.strokeStyle = tracePoints[i].isError ? CONFIG.COLORS.TRACE_ERROR : CONFIG.COLORS.TRACE_SAFE; ctx.stroke();
    }
}