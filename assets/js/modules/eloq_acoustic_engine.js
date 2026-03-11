// eloq_acoustic_engine.js - V1.6 (Manual Trigger & Retake Edition)
// Features: Framing Scroll Lock, 3-2-1 Countdown Trigger, Per-Trial Manual Start, Retake Option.

import { supabase } from '../config.js';

const CONFIG = {
    AUDIO: {
        CALIBRATION_TIME_MS: 3000,
        SILENCE_TOLERANCE_MS: 800,
        VOLUME_MULTIPLIER: 500,
        MAX_TRIALS: 3
    },
    COLORS: {
        SAFE: '#10b981', WARNING: '#f59e0b', DANGER: '#ef4444', TEXT: '#1e293b',
        TRIAL_1: { solid: '#3b82f6', bg: 'rgba(59, 130, 246, 0.2)' },
        TRIAL_2: { solid: '#a855f7', bg: 'rgba(168, 85, 247, 0.2)' },
        TRIAL_3: { solid: '#ef4444', bg: 'rgba(239, 68, 68, 0.2)' }
    }
};

const STYLES = `
    * { box-sizing: border-box; }
    .eae-root {
        position: relative; width: 100%; height: 75vh; min-height: 500px;
        background: #f8fafc; display: flex; flex-direction: column; overflow: hidden;
        font-family: 'Inter', -apple-system, sans-serif; user-select: none;
        border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        border: 1px solid #cbd5e1;
    }
    .eae-header {
        height: 60px; padding: 0 20px; background: white; border-bottom: 1px solid #e2e8f0;
        display: flex; justify-content: space-between; align-items: center; z-index: 10; flex-shrink: 0;
    }
    .eae-title { font-weight: 700; color: #1e293b; font-size: clamp(0.9rem, 2vw, 1.1rem); }
    .eae-instruction { font-size: clamp(0.8rem, 1.5vw, 0.9rem); color: #64748b; font-weight: 500; }
    .eae-workspace {
        flex: 1; position: relative; display: flex; flex-direction: column;
        justify-content: center; align-items: center; padding: 20px;
        overflow-y: auto; overflow-x: hidden; min-height: 0; min-width: 0;
    }
    .eae-overlay {
        position: absolute; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(248, 250, 252, 0.98); z-index: 100;
        display: flex; flex-direction: column; padding: 20px; overflow-y: auto;
    }
    .eae-start-overlay {
        position: absolute; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(255, 255, 255, 0.9); z-index: 40;
        display: flex; justify-content: center; align-items: center;
        backdrop-filter: blur(2px);
    }
    .eae-countdown-text {
        font-size: 6rem; font-weight: 900; color: #3b82f6;
        text-shadow: 0 4px 10px rgba(59, 130, 246, 0.3);
        animation: eae-pop 1s ease-in-out infinite;
    }
    @keyframes eae-pop { 0% { transform: scale(0.8); opacity: 0; } 50% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); opacity: 0; } }
    .eae-menu-container {
        max-width: 600px; margin: auto; width: 100%; background: white;
        padding: 30px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);
    }
    .eae-orb-container {
        position: relative; width: 200px; height: 200px;
        display: flex; justify-content: center; align-items: center; margin-bottom: 30px;
    }
    .eae-orb-base {
        position: absolute; width: 60px; height: 60px; border-radius: 50%;
        background: #e2e8f0; z-index: 2; display: flex; justify-content: center; align-items: center;
        font-size: 1.5rem; font-weight: 800; color: white;
    }
    .eae-orb-active {
        position: absolute; width: 60px; height: 60px; border-radius: 50%;
        background: rgba(59, 130, 246, 0.2); z-index: 1; transition: transform 0.05s ease-out;
    }
    .eae-timer { font-size: 3.5rem; font-weight: 800; color: #1e293b; font-variant-numeric: tabular-nums; margin-bottom: 5px; text-align: center; }
    .eae-status-text { font-size: 1.1rem; font-weight: 600; color: #64748b; text-align: center; max-width: 450px; line-height: 1.5; margin-bottom: 20px; }
    .eae-btn {
        width: 100%; padding: 15px; border: 1px solid #cbd5e1; border-radius: 8px;
        background: white; cursor: pointer; font-weight: 700; margin: 8px 0;
        transition: 0.2s; font-size: 1rem; color: #1e293b; text-align: left;
        display: flex; justify-content: space-between; align-items: center;
    }
    .eae-btn:hover { background: #eff6ff; border-color: #3b82f6; transform: translateY(-2px); box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .eae-btn-primary { 
        background: #10b981; color: white; padding: 15px 40px; border-radius: 30px; 
        font-size: 1.2rem; font-weight: 800; border: none; cursor: pointer; 
        box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3); transition: 0.2s;
    }
    .eae-btn-primary:active { transform: scale(0.95); }
    .eae-icon-btn { padding: 8px 15px; border-radius: 5px; border: 1px solid #cbd5e1; background: white; cursor: pointer; font-weight: bold; color: #1e293b; font-size: 0.85rem; transition: 0.2s; }
    .eae-btn-danger { background: #ef4444; color: white; border: none; padding: 12px 30px; border-radius: 8px; font-weight: bold; cursor: pointer; }
    .eae-dash-wrapper { max-width: 1000px; width: 100%; margin: 0 auto; padding-bottom: 40px; }
    .eae-summary-box { background: white; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 15px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
    .eae-metric-col { text-align: center; border-right: 1px solid #f1f5f9; padding: 10px; }
    .eae-metric-col:last-child { border-right: none; }
    .eae-m-val { font-size: 2rem; font-weight: 800; }
    .eae-m-lbl { font-size: 0.75rem; color: #64748b; font-weight: 700; text-transform: uppercase; margin-top: 5px; }
    .eae-dash-grid { display: flex; flex-direction: column; gap: 20px; }
    .eae-card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.02); }
    .eae-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; }
    .eae-card-title { font-size: 1rem; color: #1e293b; font-weight: 800; text-transform: uppercase; }
    .eae-stats-row { display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 15px; font-size: 0.9rem; color: #475569; }
    .eae-stat-item { display: flex; gap: 5px; align-items: center; }
    .eae-s-val { font-weight: 700; color: #1e293b; }
    .eae-wave-container { position: relative; width: 100%; height: 120px; background: #f8fafc; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; margin-bottom: 15px; }
    .eae-wave-canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
    .eae-playhead { position: absolute; top: 0; left: 0; width: 2px; height: 100%; background: #ef4444; z-index: 10; display: none; }
    .eae-control-btn { padding: 8px 16px; border: 1px solid #cbd5e1; border-radius: 6px; background: white; font-weight: 600; cursor: pointer; color: #1e293b; display: inline-flex; align-items: center; gap: 8px; transition: 0.2s; font-size: 0.85rem; }
    .eae-control-btn:hover { background: #f8fafc; border-color: #3b82f6; }
`;

let state = {
    isActive: false, status: 'idle',
    targetSound: 'A', targetLabel: 'Vokal "Aaaaa"',
    currentTrial: 1, sessionLogs: [],
    audioCtx: null, analyser: null, microphone: null, mediaRecorder: null,
    audioChunks: [], noiseFloor: 0,
    trialData: { volumeLog: [], startTime: 0, lastVocalTime: 0, mptDuration: 0, hasStarted: false, isCancelled: false },
    animationFrameId: null, playbackAnimIds: {} 
};

export function renderEloqAcousticEngine(containerId) {
    nukeArtifacts();
    if (!document.getElementById('eae-styles')) {
        const s = document.createElement('style'); s.id = 'eae-styles'; s.innerHTML = STYLES;
        document.head.appendChild(s);
    }
    const root = document.getElementById(containerId);
    root.style.display = 'flex'; root.style.flexDirection = 'column';
    root.innerHTML = '<div class="eae-root" id="eae-app"></div>';
    showStartScreen(root.querySelector('.eae-root'));
}

function nukeArtifacts() {
    state.isActive = false;
    document.body.style.overflow = ''; 
    if (state.animationFrameId) cancelAnimationFrame(state.animationFrameId);
    Object.values(state.playbackAnimIds).forEach(id => cancelAnimationFrame(id));
    state.playbackAnimIds = {};
    if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') state.mediaRecorder.stop();
    if (state.microphone) { state.microphone.disconnect(); state.microphone = null; }
    if (state.audioCtx && state.audioCtx.state !== 'closed') { state.audioCtx.close(); state.audioCtx = null; }
    if (state.sessionLogs && state.sessionLogs.length > 0) {
        state.sessionLogs.forEach(log => { if (log.audioUrl) URL.revokeObjectURL(log.audioUrl); });
    }
    document.querySelectorAll('.eae-overlay').forEach(el => el.remove());
}

function exitToDashboard() {
    if(confirm('Akhiri sesi asesmen ini dan musnahkan data sementara?')) {
        nukeArtifacts();
        if(typeof window.renderApp === 'function') window.renderApp(null);
    }
}

function showStartScreen(appRoot) {
    const overlay = document.createElement('div');
    overlay.className = 'eae-overlay';
    overlay.innerHTML = `
        <div class="eae-menu-container" style="margin-top:auto; margin-bottom:auto;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h2 style="margin:0; color:#1e293b;">Kapasitas Fonasi & Resonansi</h2>
                <button class="eae-icon-btn" id="btn-exit-menu" style="background:#fff1f2; color:#db2777; border-color:#fbcfe8;">✖ Keluar</button>
            </div>
            <p style="color:#64748b; margin-bottom:25px; font-size:0.95rem; line-height:1.5;">Evaluasi stabilitas pita suara dan fungsi pernapasan (MPT). Sistem akan melakukan 3 sesi Drilling untuk menghitung Indeks Kelelahan Vokal dan Konsistensi.</p>
            <button class="eae-btn" id="btn-mode-a"><span>🗣️ Resonansi Pita Suara</span><span style="font-size:0.8rem; font-weight:normal; color:#64748b;">Target: "A", "I", "U"</span></button>
            <button class="eae-btn" id="btn-mode-s"><span>🌬️ Aliran Udara / Frikasi</span><span style="font-size:0.8rem; font-weight:normal; color:#64748b;">Target: "Sssss"</span></button>
            <button class="eae-btn" id="btn-mode-z"><span>🐝 Resonansi + Frikasi</span><span style="font-size:0.8rem; font-weight:normal; color:#64748b;">Target: "Zzzzz"</span></button>
        </div>
    `;
    appRoot.appendChild(overlay);
    overlay.querySelector('#btn-exit-menu').onclick = exitToDashboard;
    
    const startWrap = (code, label) => {
        state.targetSound = code; state.targetLabel = label;
        overlay.remove(); buildWorkspace(appRoot);
    };
    overlay.querySelector('#btn-mode-a').onclick = () => startWrap('A', 'Vokal "Aaaaa"');
    overlay.querySelector('#btn-mode-s').onclick = () => startWrap('S', 'Desis "Sssss"');
    overlay.querySelector('#btn-mode-z').onclick = () => startWrap('Z', 'Dengung "Zzzzz"');
}

function buildWorkspace(appRoot) {
    appRoot.innerHTML = `
        <div class="eae-header">
            <div>
                <div class="eae-title">Asesmen Akustik Klinis</div>
                <div class="eae-instruction" id="eae-inst">Persiapan Kalibrasi...</div>
            </div>
            <button class="eae-icon-btn" id="btn-exit-session" style="background:#fff1f2; color:#db2777; border-color:#fbcfe8;">✖ Keluar</button>
        </div>
        <div class="eae-workspace" id="eae-workspace">
            <div class="eae-start-overlay" id="eae-start-overlay">
                <div style="text-align:center;">
                    <p style="color:#1e293b; font-weight:600; margin-bottom:15px; font-size:1.1rem;">Sesuaikan posisi layar (scroll), pastikan ruangan hening.</p>
                    <button class="eae-btn-primary" id="btn-start-calib">MULAI KALIBRASI</button>
                </div>
            </div>
            <div id="eae-dynamic-content" style="display:flex; flex-direction:column; align-items:center; width:100%; max-width:500px;"></div>
        </div>
    `;
    document.getElementById('btn-exit-session').onclick = exitToDashboard;
    state.isActive = true; state.currentTrial = 1; state.sessionLogs = [];
    
    document.body.style.overflow = '';
    
    document.getElementById('btn-start-calib').onclick = () => {
        document.body.style.overflow = 'hidden';
        runCalibrationCountdown();
    };
}

function runCalibrationCountdown() {
    const overlay = document.getElementById('eae-start-overlay');
    let count = 3;
    overlay.innerHTML = `<div class="eae-countdown-text">${count}</div>`;
    
    const interval = setInterval(() => {
        count--;
        if(count > 0) {
            overlay.innerHTML = `<div class="eae-countdown-text">${count}</div>`;
        } else {
            clearInterval(interval);
            overlay.style.display = 'none';
            initAudioAndCalibrate();
        }
    }, 1000);
}

async function initAudioAndCalibrate() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false });
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        state.audioCtx = new AudioContext();
        state.analyser = state.audioCtx.createAnalyser();
        state.analyser.fftSize = 512;
        state.microphone = state.audioCtx.createMediaStreamSource(stream);
        state.microphone.connect(state.analyser);
        state.mediaRecorder = new MediaRecorder(stream);
        state.mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) state.audioChunks.push(e.data); };
        state.mediaRecorder.onstop = processTrialAudio;
        startCalibration();
    } catch (err) {
        alert("Akses mikrofon ditolak. Periksa izin browser tablet Bapak.");
        exitToDashboard();
    }
}

function getVolumeRMS(timeData) {
    let sumSquares = 0.0;
    for (let i = 0; i < timeData.length; i++) {
        const val = (timeData[i] - 128) / 128;
        sumSquares += val * val;
    }
    return Math.min(100, Math.sqrt(sumSquares / timeData.length) * CONFIG.AUDIO.VOLUME_MULTIPLIER);
}

function startCalibration() {
    state.status = 'calibrating';
    const content = document.getElementById('eae-dynamic-content');
    content.innerHTML = `
        <div class="eae-orb-container"><div class="eae-orb-base" style="background:#f59e0b;">🤫</div></div>
        <div class="eae-status-text">Merekam Keheningan...<br><span style="font-size:0.9rem; font-weight:normal;">Mengukur ambang batas bising ruangan (Noise Floor).</span></div>
    `;
    
    const startTime = Date.now();
    let vols = [];
    const timeData = new Uint8Array(state.analyser.fftSize);
    
    function calibLoop() {
        if (!state.isActive) return;
        state.analyser.getByteTimeDomainData(timeData);
        vols.push(getVolumeRMS(timeData));
        if (Date.now() - startTime < CONFIG.AUDIO.CALIBRATION_TIME_MS) {
            state.animationFrameId = requestAnimationFrame(calibLoop);
        } else {
            const sum = vols.reduce((a, b) => a + b, 0);
            state.noiseFloor = (sum / vols.length) + 1.5;
            prepareNextTrial();
        }
    }
    calibLoop();
}

function prepareNextTrial() {
    state.status = 'ready';
    const content = document.getElementById('eae-dynamic-content');
    let displayIcon = state.targetSound === 'S' ? '🌬️' : (state.targetSound === 'Z' ? '🐝' : 'A');
    let themeColor = state.currentTrial === 1 ? CONFIG.COLORS.TRIAL_1.solid : (state.currentTrial === 2 ? CONFIG.COLORS.TRIAL_2.solid : CONFIG.COLORS.TRIAL_3.solid);
    let themeBg = state.currentTrial === 1 ? CONFIG.COLORS.TRIAL_1.bg : (state.currentTrial === 2 ? CONFIG.COLORS.TRIAL_2.bg : CONFIG.COLORS.TRIAL_3.bg);
    
    content.innerHTML = `
        <div class="eae-timer" id="eae-time-display">0.00 <span style="font-size:1.5rem; color:#64748b;">s</span></div>
        <div class="eae-orb-container">
            <div class="eae-orb-active" id="eae-orb-visual" style="background:${themeBg}; transform:scale(1);"></div>
            <div class="eae-orb-base" style="background:${themeColor};">${displayIcon}</div>
        </div>
        <div class="eae-status-text" id="eae-live-status">Uji ${state.currentTrial} dari ${CONFIG.AUDIO.MAX_TRIALS}.<br>Bersiaplah untuk membunyikan <b>${state.targetLabel}</b>.</div>
        
        <div id="eae-action-area" style="width:100%; text-align:center;">
            <button class="eae-btn-primary" id="btn-trigger-trial" style="width:100%;">▶️ MULAI UJI ${state.currentTrial}</button>
        </div>
    `;
    document.getElementById('eae-inst').innerText = `Uji Klinis ${state.currentTrial}/${CONFIG.AUDIO.MAX_TRIALS}`;
    document.getElementById('btn-trigger-trial').onclick = runTrialCountdown;
    
    state.trialData = { volumeLog: [], startTime: 0, lastVocalTime: 0, mptDuration: 0, hasStarted: false, isCancelled: false };
    state.audioChunks = [];
}

function runTrialCountdown() {
    const actionArea = document.getElementById('eae-action-area');
    const statusText = document.getElementById('eae-live-status');
    let count = 3;
    
    actionArea.innerHTML = '';
    statusText.innerHTML = `<span style="font-size:2rem; font-weight:800; color:#3b82f6;">${count}</span>`;
    
    const interval = setInterval(() => {
        count--;
        if(count > 0) {
            statusText.innerHTML = `<span style="font-size:2rem; font-weight:800; color:#3b82f6;">${count}</span>`;
        } else {
            clearInterval(interval);
            statusText.innerHTML = '<span style="color:#10b981;">Sedang merekam... Silakan bersuara!</span>';
            beginActiveRecording();
        }
    }, 1000);
}

function beginActiveRecording() {
    const actionArea = document.getElementById('eae-action-area');
    actionArea.innerHTML = `
        <button class="eae-btn-danger" id="btn-force-stop" style="width:100%; margin-bottom:10px;">⏹ Selesai (Hentikan)</button>
        <button class="eae-btn" id="btn-retake-trial" style="width:100%; text-align:center; color:#db2777; border-color:#fbcfe8; background:#fff1f2;">🔄 Batalkan & Ulangi Uji Ini</button>
    `;
    
    document.getElementById('btn-force-stop').onclick = stopTrialRecording;
    document.getElementById('btn-retake-trial').onclick = cancelAndRetakeTrial;
    
    state.mediaRecorder.start();
    monitorLiveAudio();
}

function monitorLiveAudio() {
    if (!state.isActive || state.status !== 'ready') return;
    const timeData = new Uint8Array(state.analyser.fftSize);
    state.analyser.getByteTimeDomainData(timeData);
    const vol = getVolumeRMS(timeData);
    const isVocalizing = vol > state.noiseFloor;
    const now = Date.now();
    const orb = document.getElementById('eae-orb-visual');
    if (orb) orb.style.transform = `scale(${1 + (vol / 15)})`;
    
    if (!state.trialData.hasStarted) {
        if (isVocalizing) {
            state.trialData.hasStarted = true; state.trialData.startTime = now; state.trialData.lastVocalTime = now;
        }
    } else {
        const dur = (now - state.trialData.startTime) / 1000;
        document.getElementById('eae-time-display').innerHTML = `${dur.toFixed(2)} <span style="font-size:1.5rem; color:#64748b;">s</span>`;
        state.trialData.volumeLog.push(vol);
        if (isVocalizing) {
            state.trialData.lastVocalTime = now; state.trialData.mptDuration = dur;
        } else {
            if (now - state.trialData.lastVocalTime > CONFIG.AUDIO.SILENCE_TOLERANCE_MS) { stopTrialRecording(); return; }
        }
    }
    state.animationFrameId = requestAnimationFrame(monitorLiveAudio);
}

function stopTrialRecording() {
    state.status = 'processing';
    cancelAnimationFrame(state.animationFrameId);
    document.getElementById('eae-action-area').innerHTML = '';
    document.getElementById('eae-live-status').innerText = "Memproses Data Akustik...";
    if(state.mediaRecorder.state !== 'inactive') state.mediaRecorder.stop();
}

function cancelAndRetakeTrial() {
    state.status = 'idle';
    state.trialData.isCancelled = true;
    cancelAnimationFrame(state.animationFrameId);
    if(state.mediaRecorder.state !== 'inactive') state.mediaRecorder.stop();
}

function processTrialAudio() {
    if(!state.isActive) return;
    
    if(state.trialData.isCancelled) {
        state.trialData.isCancelled = false;
        prepareNextTrial();
        return;
    }
    
    const blob = new Blob(state.audioChunks, { type: 'audio/webm' });
    const url = URL.createObjectURL(blob);
    const vols = state.trialData.volumeLog;
    let avgVol = 0, shimmer = 0;
    
    if (vols.length > 0) {
        avgVol = vols.reduce((a,b)=>a+b,0) / vols.length;
        let diffSum = 0;
        for(let i=1; i<vols.length; i++) diffSum += Math.abs(vols[i] - vols[i-1]);
        const avgDiff = vols.length > 1 ? diffSum / (vols.length - 1) : 0;
        shimmer = avgVol > 0 ? (avgDiff / avgVol) * 100 : 0;
    }
    
    state.sessionLogs.push({ trial: state.currentTrial, mpt: state.trialData.mptDuration, avgIntensity: avgVol, shimmer: shimmer, volumeData: [...vols], audioUrl: url });
    
    if (state.currentTrial < CONFIG.AUDIO.MAX_TRIALS) {
        state.currentTrial++;
        prepareNextTrial();
    } else { showDashboard(); }
}

function showDashboard() {
    document.body.style.overflow = '';
    const logs = state.sessionLogs; const mpts = logs.map(l => l.mpt);
    const maxMpt = Math.max(...mpts); const avgShim = logs.reduce((s,l)=>s+l.shimmer,0) / logs.length;
    let fatigue = 0;
    if (logs[0].mpt > 0) {
        const drop = logs[0].mpt - logs[2].mpt;
        fatigue = drop > 0 ? (drop / logs[0].mpt) * 100 : 0;
    }
    let fatigueColor = fatigue > 20 ? CONFIG.COLORS.DANGER : (fatigue > 10 ? CONFIG.COLORS.WARNING : CONFIG.COLORS.SAFE);
    
    let consistency = 0; const meanMpt = mpts.reduce((a,b)=>a+b,0) / mpts.length;
    if (meanMpt > 0) {
        const variance = mpts.reduce((s, val) => s + Math.pow(val - meanMpt, 2), 0) / mpts.length;
        const cv = (Math.sqrt(variance) / meanMpt) * 100;
        consistency = Math.max(0, 100 - cv);
    }
    let consColor = consistency < 70 ? CONFIG.COLORS.DANGER : (consistency < 85 ? CONFIG.COLORS.WARNING : CONFIG.COLORS.SAFE);
    let shimColor = avgShim > 15 ? CONFIG.COLORS.DANGER : (avgShim > 8 ? CONFIG.COLORS.WARNING : CONFIG.COLORS.SAFE);

    const appRoot = document.getElementById('eae-app');
    const overlay = document.createElement('div'); overlay.className = 'eae-overlay';
    
    let cardsHtml = '';
    logs.forEach((log, index) => {
        let tColor = index === 0 ? CONFIG.COLORS.TRIAL_1.solid : (index === 1 ? CONFIG.COLORS.TRIAL_2.solid : CONFIG.COLORS.TRIAL_3.solid);
        cardsHtml += `
            <div class="eae-card">
                <div class="eae-card-header"><div class="eae-card-title" style="color:${tColor};">Uji ${log.trial}</div><div style="font-weight:800; font-size:1.2rem; color:#1e293b;">${log.mpt.toFixed(2)}s</div></div>
                <div class="eae-stats-row"><div class="eae-stat-item">Vol: <span class="eae-s-val">${log.avgIntensity.toFixed(1)}</span></div><div class="eae-stat-item">Tremor: <span class="eae-s-val">${log.shimmer.toFixed(1)}%</span></div></div>
                <div class="eae-wave-container"><canvas id="eae-cvs-${index}" class="eae-wave-canvas"></canvas><div id="eae-ph-${index}" class="eae-playhead"></div></div>
                <div><audio id="eae-aud-${index}" src="${log.audioUrl}"></audio><button class="eae-control-btn" id="btn-play-${index}">▶️ Putar Uji ${log.trial}</button></div>
            </div>
        `;
    });

    overlay.innerHTML = `
        <div class="eae-dash-wrapper">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h2 style="margin:0; color:#1e293b;">Laporan Resonansi: ${state.targetLabel}</h2>
                <button class="eae-icon-btn" id="btn-dash-exit" style="background:#fff1f2; color:#db2777; border-color:#fbcfe8;">✖ Keluar</button>
            </div>
            <div class="eae-summary-box">
                <div class="eae-metric-col"><div class="eae-m-val" style="color:#3b82f6;">${maxMpt.toFixed(2)}s</div><div class="eae-m-lbl">Max MPT</div></div>
                <div class="eae-metric-col"><div class="eae-m-val" style="color:${shimColor};">${avgShim.toFixed(1)}%</div><div class="eae-m-lbl">Indeks Tremor</div></div>
                <div class="eae-metric-col"><div class="eae-m-val" style="color:${fatigueColor};">${fatigue.toFixed(1)}%</div><div class="eae-m-lbl">Kelelahan</div></div>
                <div class="eae-metric-col"><div class="eae-m-val" style="color:${consColor};">${consistency.toFixed(1)}%</div><div class="eae-m-lbl">Konsistensi</div></div>
            </div>
            <div class="eae-dash-grid">${cardsHtml}</div>
        </div>
    `;
    appRoot.appendChild(overlay);
    overlay.querySelector('#btn-dash-exit').onclick = exitToDashboard;
    if (state.microphone) { state.microphone.disconnect(); state.microphone = null; }
    
    setTimeout(() => { logs.forEach((log, index) => { drawOscilloscopeDashboard(`eae-cvs-${index}`, log.volumeData, index); setupPlaybackListener(index); }); }, 150);
}

function drawOscilloscopeDashboard(canvasId, volumeData, trialIndex) {
    const cvs = document.getElementById(canvasId); if (!cvs) return;
    cvs.width = cvs.clientWidth; cvs.height = cvs.clientHeight; const ctx = cvs.getContext('2d');
    const w = cvs.width; const h = cvs.height; const len = volumeData.length; if(len === 0) return;
    
    let maxVol = Math.max(...volumeData, state.noiseFloor * 2, 10);
    const tColorSolid = trialIndex === 0 ? CONFIG.COLORS.TRIAL_1.solid : (trialIndex === 1 ? CONFIG.COLORS.TRIAL_2.solid : CONFIG.COLORS.TRIAL_3.solid);
    const tColorBg = trialIndex === 0 ? CONFIG.COLORS.TRIAL_1.bg : (trialIndex === 1 ? CONFIG.COLORS.TRIAL_2.bg : CONFIG.COLORS.TRIAL_3.bg);
    
    const noiseY = h - (state.noiseFloor / maxVol) * h;
    ctx.beginPath(); ctx.setLineDash([5, 5]); ctx.moveTo(0, noiseY); ctx.lineTo(w, noiseY);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)'; ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
    
    ctx.beginPath(); ctx.moveTo(0, h); const step = w / len;
    for (let i = 0; i < len; i++) ctx.lineTo(i * step, h - (volumeData[i] / maxVol) * h);
    ctx.lineTo(w, h); ctx.fillStyle = tColorBg; ctx.fill();
    
    ctx.beginPath();
    for (let i = 0; i < len; i++) {
        const x = i * step; const y = h - (volumeData[i] / maxVol) * h;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = tColorSolid; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
}

function setupPlaybackListener(index) {
    const btn = document.getElementById(`btn-play-${index}`); const audio = document.getElementById(`eae-aud-${index}`);
    const playhead = document.getElementById(`eae-ph-${index}`); const cvs = document.getElementById(`eae-cvs-${index}`);
    if(!btn || !audio) return;
    
    btn.onclick = () => {
        if (audio.paused) {
            audio.play(); btn.innerHTML = `⏸️ Jeda Uji ${index + 1}`; playhead.style.display = 'block';
            const updateHead = () => {
                if (audio.paused || audio.ended) return;
                playhead.style.left = `${(audio.currentTime / audio.duration) * cvs.width}px`;
                state.playbackAnimIds[index] = requestAnimationFrame(updateHead);
            };
            updateHead();
        } else { audio.pause(); btn.innerHTML = `▶️ Lanjutkan Uji ${index + 1}`; cancelAnimationFrame(state.playbackAnimIds[index]); }
    };
    audio.onended = () => { btn.innerHTML = `▶️ Putar Uji ${index + 1}`; cancelAnimationFrame(state.playbackAnimIds[index]); playhead.style.display = 'none'; playhead.style.left = '0px'; };
}