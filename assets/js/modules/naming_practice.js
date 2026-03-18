// NAMING PRACTICE V5.4 - CLINICAL UI/UX EDITION
// Fokus: Single Row Verdict (Anti-Misclick), SVG Iconography, Radar Chart, Smart Lock Max 12.
// UX FIX: Voice Playback (Review Artikluasi), In-Flight Setup Button, Pulsing Record.
// Rule: NO CLEANING. SEQUENTIAL 1-5.

import { supabase } from '../config.js';

// --- ICONS ---
const ICONS = {
    MANDIRI: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
    DIBANTU: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 11h2a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h2m6-4V3m-4 4h8"/></svg>`,
    SALAH: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>`,
    RETAKE: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`,
    EXIT: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9"/></svg>`,
    RETRY: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>`,
    PLAY: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`
};

let rawData = [];
let masterCategories = [];
let appState = {
    view: 'SETUP',
    config: { categoryId: null, level: 5, totalRounds: 2 },
    calibration: { noiseFloor: 0 },
    game: { 
        currentRound: 1, cards: [], currentIdx: 0, 
        isListening: false, isSpeaking: false,
        startTime: 0, startSpeechTime: 0, silenceCounter: 0,
        sessionLogs: [], lastAudioUrl: null 
    },
    audioCtx: null, analyser: null, microphone: null, animationFrameId: null,
    mediaRecorder: null, audioChunks: []
};

// --- NUKE & EXIT PROTOCOL ---
function nukeArtifacts() {
    appState.game.isListening = false;
    appState.game.isSpeaking = false;
    if (appState.animationFrameId) cancelAnimationFrame(appState.animationFrameId);
    if (appState.mediaRecorder && appState.mediaRecorder.state !== 'inactive') {
        try { appState.mediaRecorder.stop(); } catch(e) {}
    }
    if (appState.microphone) {
        appState.microphone.mediaStream.getTracks().forEach(t => t.stop());
        appState.microphone.disconnect();
    }
    if (appState.audioCtx && appState.audioCtx.state !== 'closed') {
        appState.audioCtx.close();
    }
    document.querySelectorAll('.np-overlay').forEach(el => el.remove());
    document.getElementById('np-body')?.classList.remove('spotlight-active');
}

function exitToDashboard() {
    if(confirm('Akhiri sesi dan simpan progres ke dashboard utama?')) {
        nukeArtifacts();
        if (typeof window.renderApp === 'function') window.renderApp(null);
        else if (typeof window.loadModule === 'function') window.loadModule('digital_area');
        else window.location.reload(); 
    }
}

// --- ACOUSTIC RMS ENGINE ---
function getRMS(data) {
    let s = 0;
    for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; s += v * v; }
    return Math.sqrt(s / data.length) * 500;
}

// --- SMART SETUP ---
function updateSmartSetup() {
    const lvl = parseInt(document.getElementById('np-level').value);
    const roundSel = document.getElementById('np-rounds');
    const catSel = document.getElementById('np-cat');
    const btn = document.getElementById('btn-start');

    let roundsHtml = '';
    if (lvl === 1 || lvl === 2) roundsHtml = '<option value="1">1 Ronde</option><option value="2">2 Ronde</option><option value="3">3 Ronde</option><option value="4">4 Ronde</option><option value="5">5 Ronde</option>';
    else if (lvl === 3) roundsHtml = '<option value="1">1 Ronde</option><option value="2">2 Ronde</option><option value="3">3 Ronde</option><option value="4">4 Ronde</option>';
    else if (lvl === 4) roundsHtml = '<option value="1">1 Ronde</option><option value="2">2 Ronde</option><option value="3">3 Ronde</option>';
    else if (lvl === 5) roundsHtml = '<option value="1">1 Ronde</option><option value="2" selected>2 Ronde</option>';
    roundSel.innerHTML = roundsHtml;

    const validCats = masterCategories.filter(c => {
        return rawData.filter(i => i.category_id === c.id && i.es_game_assets?.length > 0).length >= lvl;
    });

    if (validCats.length === 0) {
        catSel.innerHTML = '<option value="">-- Aset Kurang --</option>';
        btn.disabled = true; btn.style.opacity = '0.3';
    } else {
        catSel.innerHTML = validCats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        btn.disabled = false; btn.style.opacity = '1';
    }
}

// --- SESSION FLOW ---
async function initSession() {
    try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        appState.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        appState.analyser = appState.audioCtx.createAnalyser();
        appState.microphone = appState.audioCtx.createMediaStreamSource(s);
        appState.microphone.connect(appState.analyser);

        // V5.4 Init MediaRecorder for Playback
        appState.mediaRecorder = new MediaRecorder(s);
        appState.mediaRecorder.ondataavailable = e => appState.audioChunks.push(e.data);
        appState.mediaRecorder.onstop = () => {
            const blob = new Blob(appState.audioChunks);
            appState.game.lastAudioUrl = URL.createObjectURL(blob);
            appState.audioChunks = [];
            // Enable play button in verdict
            const btnPlay = document.getElementById('btn-play-audio');
            if(btnPlay) {
                btnPlay.disabled = false;
                btnPlay.style.opacity = '1';
                btnPlay.style.transform = 'scale(1.1)';
                setTimeout(() => btnPlay.style.transform = 'scale(1)', 200);
            }
        };

        appState.config.categoryId = document.getElementById('np-cat').value;
        appState.config.level = parseInt(document.getElementById('np-level').value);
        appState.config.totalRounds = parseInt(document.getElementById('np-rounds').value);

        const overlay = document.createElement('div');
        overlay.className = 'np-overlay';
        overlay.innerHTML = `<div class="card-report" style="text-align:center;"><h2>🎙️ Kalibrasi Akustik</h2><p style="color:#64748b;">Membaca tingkat kebisingan ruangan...</p></div>`;
        document.getElementById('np-app-root').appendChild(overlay);

        let v = [];
        const d = new Uint8Array(appState.analyser.fftSize);
        const start = Date.now();
        const calLoop = () => {
            appState.analyser.getByteTimeDomainData(d);
            v.push(getRMS(d));
            if(Date.now() - start < 2000) requestAnimationFrame(calLoop);
            else {
                appState.calibration.noiseFloor = (v.reduce((a,b)=>a+b,0)/v.length) + 6;
                overlay.remove();
                startRound();
            }
        };
        calLoop();
    } catch(e) { alert("Mic Error! Pastikan izin mikrofon diberikan."); }
}

function startRound() {
    const p = rawData.filter(x => x.category_id === appState.config.categoryId);
    appState.game.cards = p.sort(() => 0.5 - Math.random()).slice(0, appState.config.level);
    appState.game.currentIdx = 0;
    appState.view = 'PLAY';
    render();
}

function handleCardClick(idx) {
    if(idx !== appState.game.currentIdx || appState.game.isListening) return;
    document.getElementById('np-body').classList.add('spotlight-active');
    
    document.querySelectorAll('.c-inner').forEach((el, i) => {
        if(i === idx) {
            el.classList.remove('zoom-out');
            el.classList.add('flipped', 'zoom-focus');
            setTimeout(() => {
                const btnRec = document.getElementById(`btn-rec-${idx}`);
                if(btnRec) {
                    btnRec.innerHTML = '🎙️ MULAI REKAM';
                    btnRec.classList.remove('recording');
                    btnRec.classList.add('show');
                }
            }, 600);
        }
        else el.classList.add('dim-hidden');
    });
}

function startAcousticEngine() {
    appState.audioChunks = [];
    appState.game.lastAudioUrl = null;
    appState.game.isListening = true;
    appState.game.isSpeaking = false;
    appState.game.startTime = Date.now();
    appState.game.silenceCounter = 0;
    
    try { appState.mediaRecorder.start(); } catch(e){} // Start recording raw audio

    const d = new Uint8Array(appState.analyser.fftSize);
    const viz = document.getElementById('vol-bar');

    const track = () => {
        if(!appState.game.isListening) return;
        appState.analyser.getByteTimeDomainData(d);
        const vol = getRMS(d);
        
        if(viz) {
            viz.style.height = `${Math.min(100, vol)}%`;
            viz.style.background = vol > appState.calibration.noiseFloor ? '#10b981' : '#64748b';
        }
        
        if(vol > appState.calibration.noiseFloor) {
            if(!appState.game.isSpeaking) { appState.game.isSpeaking = true; appState.game.startSpeechTime = Date.now(); }
            appState.game.silenceCounter = 0;
        } else if(appState.game.isSpeaking) {
            appState.game.silenceCounter += 16;
            if(appState.game.silenceCounter > 800) {
                stopTracking();
                return;
            }
        }
        appState.animationFrameId = requestAnimationFrame(track);
    };
    track();
}

function stopTracking() {
    const lat = appState.game.startSpeechTime - appState.game.startTime;
    const flu = (Date.now() - 800) - appState.game.startSpeechTime;
    appState.game.isListening = false;
    cancelAnimationFrame(appState.animationFrameId);
    
    try { appState.mediaRecorder.stop(); } catch(e){} // Stop recording to trigger onstop
    
    const btnRec = document.getElementById(`btn-rec-${appState.game.currentIdx}`);
    if(btnRec) btnRec.classList.remove('show', 'recording');

    showVerdict(Math.max(0, lat), Math.max(0, flu));
}

// 1-LINE VERDICT ROW WITH PLAYBACK
function showVerdict(lat, flu) {
    const o = document.createElement('div');
    o.className = 'np-overlay';
    o.innerHTML = `
        <div class="card-report" style="width:100%; max-width:650px; padding:30px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:25px; background:#f8fafc; padding:15px 30px; border-radius:16px; border:1px solid #e2e8f0;">
                <div style="text-align:center;">
                    <span style="font-size:0.75rem; font-weight:800; color:#64748b; letter-spacing:1px;">LATENCY (OTAK)</span><br>
                    <b style="font-size:1.8rem; color:#4f46e5;">${(lat/1000).toFixed(2)}s</b>
                </div>
                
                <button id="btn-play-audio" disabled style="opacity:0.4; background:#e0e7ff; color:#4f46e5; border:none; padding:15px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:transform 0.2s, opacity 0.2s; box-shadow:0 4px 10px rgba(79, 70, 229, 0.2);" onclick="window.np_play_audio()">
                    ${ICONS.PLAY}
                </button>

                <div style="text-align:center;">
                    <span style="font-size:0.75rem; font-weight:800; color:#64748b; letter-spacing:1px;">FLUENCY (MULUT)</span><br>
                    <b style="font-size:1.8rem; color:#10b981;">${(flu/1000).toFixed(2)}s</b>
                </div>
            </div>
            <div style="display:flex; flex-direction:row; gap:15px; width:100%;">
                <button class="btn-v" style="background:#10b981;" onclick="window.np_save(true, 0, ${lat}, ${flu})">
                    ${ICONS.MANDIRI}<span>MANDIRI</span>
                </button>
                <button class="btn-v" style="background:#f59e0b;" onclick="window.np_save(true, 1, ${lat}, ${flu})">
                    ${ICONS.DIBANTU}<span>DIBANTU</span>
                </button>
                <button class="btn-v" style="background:#ef4444;" onclick="window.np_save(false, 0, ${lat}, ${flu})">
                    ${ICONS.SALAH}<span>SALAH</span>
                </button>
                <button class="btn-v" style="background:#64748b;" onclick="window.np_retake()">
                    ${ICONS.RETAKE}<span>RETAKE</span>
                </button>
            </div>
        </div>
    `;
    document.getElementById('np-app-root').appendChild(o);
}

function saveResult(ok, p, lat, flu) {
    appState.game.sessionLogs.push({ 
        item: appState.game.cards[appState.game.currentIdx].item_name, 
        ok, p, lat, flu, 
        round: appState.game.currentRound,
        audioUrl: appState.game.lastAudioUrl // V5.4 Save Audio for End Report
    });
    
    document.querySelectorAll('.np-overlay').forEach(el => el.remove());
    
    const currentCard = document.getElementById(`c-${appState.game.currentIdx}`);
    if (currentCard) {
        currentCard.classList.remove('zoom-focus');
        currentCard.classList.add('zoom-out'); 
    }

    setTimeout(() => {
        appState.game.currentIdx++;
        if(appState.game.currentIdx >= appState.game.cards.length) {
            if(appState.game.currentRound >= appState.config.totalRounds) { nukeArtifacts(); appState.view = 'REPORT'; render(); }
            else { appState.game.currentRound++; startRound(); }
        } else { render(); }
    }, 600);
}

// --- RADAR CHART (SVG) ---
function generateRadarChart(logs) {
    const accuracy = (logs.filter(l => l.ok).length / logs.length) * 100;
    const avgLat = logs.reduce((a,b)=>a+b.lat, 0) / logs.length;
    const speed = Math.max(0, 100 - (avgLat / 5000 * 100));
    const avgFlu = logs.reduce((a,b)=>a+b.flu, 0) / logs.length;
    const fluency = Math.max(0, 100 - (avgFlu / 3000 * 100));
    const latMean = avgLat;
    const latVar = logs.reduce((a,b)=>a+Math.pow(b.lat - latMean, 2),0) / logs.length;
    const consistency = Math.max(0, 100 - (Math.sqrt(latVar) / 2000 * 100));

    const points = [accuracy, speed, fluency, consistency];
    const labels = ["AKURASI", "SPEED", "FLUENCY", "STAMINA"];
    const size = 220; const center = size / 2; const radius = size * 0.38;

    const getCoords = (val, i) => {
        const angle = (Math.PI * 2 / 4) * i - Math.PI / 2;
        const r = (val / 100) * radius;
        return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
    };

    const polygon = points.map((v, i) => { const p = getCoords(v, i); return `${p.x},${p.y}`; }).join(' ');
    
    let grids = '';
    for(let i=1; i<=4; i++) {
        const r = (i/4) * radius;
        const pStr = [0,1,2,3].map(j => { 
            const a = (Math.PI * 2 / 4) * j - Math.PI / 2;
            return `${center + r * Math.cos(a)},${center + r * Math.sin(a)}`;
        }).join(' ');
        grids += `<polygon points="${pStr}" fill="none" stroke="#e2e8f0" stroke-width="1.5" />`;
    }

    const labelsSvg = labels.map((l, i) => {
        const p = getCoords(125, i);
        return `<text x="${p.x}" y="${p.y}" font-size="10" font-weight="800" text-anchor="middle" fill="#475569" letter-spacing="1">${l}</text>`;
    }).join('');

    return `
        <svg viewBox="0 0 ${size} ${size}" style="width:100%; max-width:280px; margin:auto; display:block;">
            ${grids}
            <polygon points="${polygon}" fill="rgba(79, 70, 229, 0.25)" stroke="#4f46e5" stroke-width="3" stroke-linejoin="round" />
            ${labelsSvg}
        </svg>
    `;
}

// --- RENDER ROUTER ---
function render() {
    const root = document.getElementById('np-app-root');
    if(appState.view === 'SETUP') {
        root.innerHTML = `
            <div class="np-nav"><b style="font-size:1.1rem; color:#1e293b;">🎙️ Setup Latihan Penamaan</b></div>
            <div class="np-body" style="justify-content:center;">
                <div class="card-report" style="width:100%; max-width:450px;">
                    <label class="np-lbl">BEBAN VISUAL (1-5)</label>
                    <select id="np-level" onchange="window.np_smart()" class="np-sel">
                        <option value="1">1 Kartu (Fokus Penuh)</option>
                        <option value="2">2 Kartu</option>
                        <option value="3">3 Kartu</option>
                        <option value="4">4 Kartu</option>
                        <option value="5" selected>5 Kartu (Beban Maksimal)</option>
                    </select>
                    <label class="np-lbl">KATEGORI</label>
                    <select id="np-cat" class="np-sel"></select>
                    <label class="np-lbl">RONDE (SMART LOCK MAX 12)</label>
                    <select id="np-rounds" class="np-sel"></select>
                    <button id="btn-start" onclick="window.np_init()" class="btn-p" style="margin-top:25px; background:#4f46e5; width:100%; color:white; font-size:1.1rem;">MULAI ASESMEN</button>
                </div>
            </div>
        `;
        updateSmartSetup();
    } else if(appState.view === 'PLAY') {
        const cards = appState.game.cards.map((c, i) => `
            <div class="c-wrap" onclick="window.np_flip(${i})">
                <div id="c-${i}" class="c-inner ${i < appState.game.currentIdx ? 'flipped dim-hidden' : ''}">
                    <div class="c-f">${i+1}</div>
                    <div class="c-b"><img src="${c.es_game_assets[0]?.public_url}"></div>
                </div>
                <button id="btn-rec-${i}" class="btn-record-manual" onclick="event.stopPropagation(); window.np_start_record(${i})">
                    🎙️ MULAI REKAM
                </button>
            </div>
        `).join('');
        
        // V5.4 IN-FLIGHT NAV BUTTONS
        root.innerHTML = `
            <div class="np-nav">
                <span style="font-weight:800; color:#64748b;">RONDE ${appState.game.currentRound} / ${appState.config.totalRounds}</span>
                <div class="db-box">
                    <div id="vol-bar"></div>
                    <div style="position:absolute; bottom:${appState.calibration.noiseFloor}%; width:100%; height:2px; background:#ef4444; z-index:10;"></div>
                </div>
                <div style="display:flex; gap:10px;">
                    <button onclick="window.np_retry()" class="btn-exit-sm" style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1;">⚙️ SETUP</button>
                    <button onclick="window.np_exit()" class="btn-exit-sm">${ICONS.EXIT} KELUAR</button>
                </div>
            </div>
            <div class="np-body" id="np-body"><div class="play-grid">${cards}</div></div>
        `;
    } else if(appState.view === 'REPORT') {
        const logs = appState.game.sessionLogs;
        
        // V5.4 Audio Review List
        const audioListHtml = logs.map((l, i) => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid #f1f5f9;">
                <span style="font-weight:600; color:#1e293b;">R${l.round} - ${l.item}</span>
                <div style="display:flex; align-items:center; gap:12px;">
                    <span style="font-size:0.75rem; font-weight:800; color:${l.ok ? '#10b981' : '#ef4444'};">${l.ok ? (l.p===0?'MANDIRI':'DIBANTU') : 'SALAH'}</span>
                    ${l.audioUrl ? `<button style="background:#e0e7ff; color:#4f46e5; border:none; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer;" onclick="new Audio('${l.audioUrl}').play()">${ICONS.PLAY}</button>` : '<span style="font-size:0.7rem; color:#94a3b8;">No Audio</span>'}
                </div>
            </div>
        `).join('');

        root.innerHTML = `
            <div class="np-nav"><b style="font-size:1.1rem; color:#1e293b;">📋 Laporan Profil Klinis</b></div>
            <div class="np-body" style="background:#f8fafc; padding-top:20px;">
                <div class="card-report" style="max-width:750px; width:100%; margin-bottom:20px;">
                    <div style="display:flex; align-items:center; gap:40px; flex-wrap:wrap;">
                        <div style="flex:1; min-width:250px;">${generateRadarChart(logs)}</div>
                        <div style="flex:1; display:flex; flex-direction:column; gap:15px; min-width:250px;">
                            <div class="m-card"><span>AKURASI TOTAL</span><b>${Math.round((logs.filter(l=>l.ok).length/logs.length)*100)}%</b></div>
                            <div class="m-card"><span>RATA-RATA LATENCY</span><b style="color:#4f46e5;">${(logs.reduce((a,b)=>a+b.lat,0)/logs.length/1000).toFixed(2)}s</b></div>
                            <div class="m-card"><span>RATA-RATA FLUENCY</span><b style="color:#10b981;">${(logs.reduce((a,b)=>a+b.flu,0)/logs.length/1000).toFixed(2)}s</b></div>
                        </div>
                    </div>
                    
                    <div style="margin-top:25px; padding-top:20px; border-top:2px dashed #e2e8f0;">
                        <b style="font-size:0.85rem; color:#64748b; margin-bottom:10px; display:block;">REVIEW ARTIKULASI (AUDIO LOGS)</b>
                        <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; max-height:200px; overflow-y:auto;">
                            ${audioListHtml}
                        </div>
                    </div>

                    <div style="margin-top:30px; display:flex; gap:15px;">
                        <button class="btn-p" style="flex:1; background:#fff; color:#4f46e5; border:2px solid #4f46e5; display:flex; align-items:center; justify-content:center; gap:8px;" onclick="window.np_retry()">
                            ${ICONS.RETRY} ULANGI SESI
                        </button>
                        <button class="btn-p" style="flex:1; background:#1e293b; color:#fff; display:flex; align-items:center; justify-content:center; gap:8px;" onclick="window.np_exit()">
                            ${ICONS.EXIT} KELUAR KE MENU
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
}

// --- STYLE INJECTION ---
export async function renderNamingPractice(containerId) {
    const c = document.getElementById(containerId);
    if(!document.getElementById('np-styles')) {
        const s = document.createElement('style'); s.id = 'np-styles';
        s.innerHTML = `
            .np-app { background:#f8fafc; height:100vh; display:flex; flex-direction:column; font-family:'Inter', sans-serif; }
            .np-nav { height:70px; background:#fff; border-bottom:1px solid #e2e8f0; display:flex; align-items:center; justify-content:space-between; padding:0 30px; z-index:100; }
            .np-body { flex:1; display:flex; flex-direction:column; transition:background 0.5s; overflow-y:auto; align-items:center; padding:20px; }
            .spotlight-active { background:#0f172a !important; }
            .card-report { background:#fff; padding:30px; border-radius:24px; box-shadow:0 10px 25px -5px rgba(0,0,0,0.05); }
            .np-lbl { display:block; font-size:0.75rem; font-weight:800; color:#64748b; margin:15px 0 8px 0; letter-spacing:0.5px; }
            .np-sel { width:100%; padding:15px; border:2px solid #e2e8f0; border-radius:12px; font-weight:700; font-size:1rem; outline:none; transition:border 0.2s; background:#f8fafc; color:#1e293b; }
            .np-sel:focus { border-color:#4f46e5; }
            .btn-p { padding:18px; border:none; border-radius:14px; font-weight:800; font-size:1rem; cursor:pointer; transition:transform 0.1s; }
            .btn-p:active { transform:scale(0.98); }
            
            .btn-v { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; padding:18px 10px; border:none; border-radius:16px; color:#fff; cursor:pointer; font-weight:800; font-size:0.8rem; letter-spacing:0.5px; transition:transform 0.1s; min-height:85px; }
            .btn-v:active { transform:scale(0.96); }
            .btn-v svg { width:28px; height:28px; }
            
            .play-grid { display:flex; flex-wrap:wrap; gap:25px; justify-content:center; align-items:center; height:100%; width:100%; max-width:900px; }
            .c-wrap { width:150px; height:210px; perspective:1000px; cursor:pointer; position:relative; }
            .c-inner { width:100%; height:100%; position:relative; transition:transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s, box-shadow 0.6s; transform-style:preserve-3d; }
            .c-inner.flipped { transform:rotateY(180deg); }
            .c-inner.zoom-focus { transform:rotateY(180deg) scale(1.6); z-index:5000; box-shadow:0 30px 60px rgba(0,0,0,0.6); }
            .c-inner.zoom-out { transform:rotateY(180deg) scale(1); box-shadow:0 4px 10px rgba(0,0,0,0.1); }
            .c-inner.dim-hidden { opacity:0; filter:blur(15px); pointer-events:none; }
            .c-f, .c-b { position:absolute; inset:0; backface-visibility:hidden; border-radius:16px; border:4px solid #fff; box-shadow:0 4px 10px rgba(0,0,0,0.1); }
            .c-f { background:#4f46e5; color:#fff; display:flex; align-items:center; justify-content:center; font-size:3rem; font-weight:900; }
            .c-b { background:#fff; transform:rotateY(180deg); overflow:hidden; }
            .c-b img { width:100%; height:100%; object-fit:cover; }
            
            @keyframes pulse-record {
                0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
                70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
                100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
            }

            .btn-record-manual { position:absolute; bottom:-20px; left:50%; transform:translateX(-50%); background:#ef4444; color:white; border:none; padding:12px 25px; border-radius:25px; font-weight:800; display:flex; gap:10px; align-items:center; cursor:pointer; box-shadow:0 10px 20px rgba(239, 68, 68, 0.4); z-index:5001; opacity:0; pointer-events:none; transition:opacity 0.3s, bottom 0.3s, transform 0.2s, background 0.3s; white-space:nowrap; font-size:0.9rem; letter-spacing:1px; }
            .btn-record-manual.show { opacity:1; pointer-events:auto; bottom:-70px; }
            .btn-record-manual:active { transform:translateX(-50%) scale(0.95); }
            .btn-record-manual.recording { background: #dc2626; animation: pulse-record 1.5s infinite; pointer-events: none; }

            .db-box { width:50px; height:45px; background:#f1f5f9; border-radius:10px; position:relative; overflow:hidden; border:1px solid #e2e8f0; }
            #vol-bar { position:absolute; bottom:0; width:100%; transition:height 0.1s, background 0.2s; }
            .np-overlay { position:fixed; inset:0; background:rgba(15,23,42,0.85); backdrop-filter:blur(4px); z-index:10000; display:flex; align-items:center; justify-content:center; padding:20px; }
            
            .m-card { background:#fff; border:1px solid #e2e8f0; padding:15px; border-radius:14px; display:flex; justify-content:space-between; align-items:center; box-shadow:0 2px 4px rgba(0,0,0,0.02); }
            .m-card span { font-size:0.75rem; font-weight:800; color:#64748b; letter-spacing:0.5px; }
            .m-card b { font-size:1.5rem; color:#1e293b; }
            .btn-exit-sm { background:#fee2e2; color:#ef4444; border:none; padding:10px 16px; border-radius:10px; font-weight:800; display:flex; align-items:center; gap:6px; cursor:pointer; transition:transform 0.1s; }
            .btn-exit-sm:active { transform:scale(0.95); }
        `;
        document.head.appendChild(s);
    }
    c.innerHTML = `<div id="np-app-root" class="np-app"></div>`;

    window.np_smart = updateSmartSetup;
    window.np_init = initSession;
    window.np_flip = handleCardClick;
    window.np_save = saveResult;
    
    window.np_start_record = (idx) => {
        const btn = document.getElementById(`btn-rec-${idx}`);
        if(btn) { btn.innerHTML = '🔴 MENDENGARKAN...'; btn.classList.add('recording'); }
        startAcousticEngine();
    };
    
    window.np_retake = () => { 
        document.querySelectorAll('.np-overlay').forEach(e => e.remove()); 
        const btn = document.getElementById(`btn-rec-${appState.game.currentIdx}`);
        if(btn) { btn.innerHTML = '🎙️ MULAI REKAM'; btn.classList.remove('recording'); btn.classList.add('show'); }
    };

    // V5.4 Audio Playback Function
    window.np_play_audio = () => {
        if(appState.game.lastAudioUrl) {
            const a = new Audio(appState.game.lastAudioUrl);
            a.play();
        }
    };
    
    window.np_retry = () => { nukeArtifacts(); appState.view = 'SETUP'; render(); };
    window.np_exit = exitToDashboard;

    const { data: cat } = await supabase.from('es_game_categories').select('id, name').order('name');
    masterCategories = cat || [];
    const { data: itm } = await supabase.from('es_game_items').select('id, item_name, category_id, es_game_assets(public_url)').eq('is_published', true);
    rawData = itm || [];
    render();
}