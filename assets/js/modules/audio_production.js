// audio_production.js - V1.5 (BULK QUEUE, DUAL DATALIST & QUARANTINE EDITION)
// Rule: STRICT ENRICHMENT. NO CLEANING. NO SYNTAX COLOR.
// Features: Bulk Upload Queue System, Dual Datalist (Items & Categories), State Persistence, Audio Quarantine Dashboard.

import { supabase } from '../config.js';

let appState = {
    view: 'RECORD', // RECORD, UPLOAD, OPTIMIZE, QUARANTINE
    rawBlob: null,
    optimizedBlob: null,
    categories: [],
    items: [],
    queue: [], // Untuk Bulk Upload
    initialQueueSize: 0,
    quarantineList: [] // Enrichment: State untuk Karantina
};

let mediaRecorder;
let audioChunks = [];
let audioContext;
let visualizerInterval;

// Live Visualizer instances
let liveAudioCtx;
let liveAnalyser;

const ICONS = {
    MIC: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>`,
    STOP: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12"/></svg>`,
    UPLOAD: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
    SEND: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
    CHECK: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    TRASH: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`
};

const injectStyles = () => {
    if (document.getElementById('ap-styles')) return;
    const s = document.createElement('style');
    s.id = 'ap-styles';
    s.innerHTML = `
        .ap-app { --p: #4f46e5; --s: #10b981; --d: #ef4444; --slate: #64748b; font-family: sans-serif; background: #f8fafc; min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 40px 20px; box-sizing: border-box; }
        .ap-card { background: #fff; width: 100%; max-width: 800px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); overflow: hidden; border: 1px solid #e2e8f0; }
        .ap-nav { display: flex; border-bottom: 1px solid #e2e8f0; background: #fff; }
        .ap-tab { flex: 1; text-align: center; padding: 15px; font-weight: 700; cursor: pointer; color: var(--slate); border-bottom: 3px solid transparent; transition: 0.2s; font-size: 13px; }
        .ap-tab.active { color: var(--p); border-bottom-color: var(--p); background: #fefeff; }
        .ap-tab.disabled { opacity: 0.4; pointer-events: none; cursor: not-allowed; }
        .ap-body { padding: 30px; display: flex; flex-direction: column; align-items: center; gap: 20px; }
        
        .btn-record { width: 80px; height: 80px; border-radius: 50%; background: #fee2e2; color: var(--d); border: 4px solid #fecaca; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; }
        .btn-record.recording { background: var(--d); color: white; animation: pulse 1.5s infinite; }
        .btn-upload-area { width: 100%; padding: 40px 20px; border: 2px dashed #cbd5e1; border-radius: 12px; text-align: center; cursor: pointer; color: var(--slate); transition: 0.2s; background: #f8fafc; }
        .btn-upload-area:hover { border-color: var(--p); background: #eff6ff; color: var(--p); }
        
        .meter-box { width: 100%; background: #f1f5f9; border-radius: 8px; padding: 15px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #e2e8f0; }
        .meter-stat { display: flex; flex-direction: column; }
        .meter-label { font-size: 11px; font-weight: 700; color: var(--slate); text-transform: uppercase; }
        .meter-val { font-size: 16px; font-weight: 800; color: #1e293b; }
        .meter-save { font-size: 14px; font-weight: 800; color: var(--s); background: #ecfdf5; padding: 4px 8px; border-radius: 4px; }
        
        .input-v36 { width: 100%; border: 1px solid #cbd5e1; background: #fff; padding: 12px; border-radius: 10px; font-size: 14px; outline: none; transition: 0.2s; box-sizing: border-box; }
        .input-v36:focus { border-color: var(--p); box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1); }
        .btn-act { padding: 14px; border-radius: 10px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: 800; gap: 8px; width: 100%; transition: 0.2s; }
        
        .queue-alert { width: 100%; background: #fef08a; color: #854d0e; padding: 10px; border-radius: 8px; font-weight: 800; font-size: 13px; text-align: center; border: 1px solid #fde047; margin-bottom: -10px; }
        
        canvas { width: 100%; height: 60px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
        @keyframes pulse { 0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); } 70% { transform: scale(1.05); box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); } 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }

        /* Enrichment: Karantina Styles */
        .qa-list { width: 100%; display: flex; flex-direction: column; gap: 10px; }
        .qa-item { display: flex; align-items: center; justify-content: space-between; background: #fff; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; gap: 10px; flex-wrap: wrap;}
        .qa-info { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 150px; }
        .qa-title { font-weight: 800; font-size: 14px; color: #1e293b; text-transform: uppercase; }
        .qa-meta { font-size: 12px; color: var(--slate); }
        .qa-player { border-radius: 4px; height: 35px; width: 200px; outline: none; }
        .qa-actions { display: flex; gap: 8px; }
        .btn-icon { padding: 8px 12px; border-radius: 6px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 12px; gap: 5px;}
        .btn-approve { background: var(--s); }
        .btn-reject { background: var(--d); }
    `;
    document.head.appendChild(s);
};

export async function renderAudioProduction(containerId) {
    injectStyles();
    const container = document.getElementById(containerId);
    if (!container) return;

    await fetchCategoriesAndItems();
    
    window.switchView = (view) => { 
        appState.view = view; 
        if (view === 'QUARANTINE') {
            loadQuarantineAudios(container);
        } else {
            renderUI(container); 
        }
    };
    
    window.startRecording = startRecording;
    window.stopRecording = stopRecording;
    window.handleFileSelect = handleFileSelect;
    window.sendToQuarantine = sendToQuarantine;
    window.formatBytes = formatBytes;
    window.discardRecording = discardRecording;
    
    // Enrichment: Register fungsi karantina
    window.approveAudio = approveAudio;
    window.rejectAudio = rejectAudio;
    
    renderUI(container);
}

async function fetchCategoriesAndItems() {
    const { data: c } = await supabase.from('es_game_categories').select('name').order('name');
    appState.categories = c || [];

    // Enrichment: Fetch Unique Item Names for Datalist
    const { data: i } = await supabase.from('es_game_items').select('item_name').order('item_name');
    let uniqueItems = new Set();
    (i || []).forEach(item => uniqueItems.add(item.item_name));
    appState.items = Array.from(uniqueItems);
}

// Enrichment: Fetch data Karantina khusus AUDIO
async function loadQuarantineAudios(container) {
    const { data, error } = await supabase
        .from('es_quarantine_assets')
        .select('*')
        .eq('media_type', 'AUDIO')
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });
        
    if (data) {
        appState.quarantineList = data;
    }
    renderUI(container);
}

// Enrichment: Approve & pindahkan ke es_game_audios
async function approveAudio(id) {
    if (!confirm('Approve audio ini dan masukkan ke Live Data?')) return;
    const asset = appState.quarantineList.find(a => a.id === id);
    if (!asset) return;

    try {
        const { error: insErr } = await supabase.from('es_game_audios').insert({
            file_path: asset.file_path,
            public_url: asset.public_url,
            file_size_kb: asset.file_size_kb,
            created_by: asset.contributor_id
            // Data logic (category_id, item_id, dll) akan diisi dari modul Management V2
        });

        if (insErr) throw insErr;

        await supabase.from('es_quarantine_assets').update({ status: 'APPROVED' }).eq('id', id);
        loadQuarantineAudios(document.querySelector('.ap-app').parentNode);
    } catch (e) {
        alert("Gagal Approve: " + e.message);
    }
}

// Enrichment: Reject audio
async function rejectAudio(id) {
    if (!confirm('Tolak dan hapus data audio ini?')) return;
    try {
        await supabase.from('es_quarantine_assets').update({ status: 'REJECTED' }).eq('id', id);
        loadQuarantineAudios(document.querySelector('.ap-app').parentNode);
    } catch (e) {
        alert("Gagal Reject: " + e.message);
    }
}

function renderUI(container) {
    let bodyHtml = '';
    const canOptimize = appState.optimizedBlob !== null;
    let queueHtml = '';

    if (appState.initialQueueSize > 0) {
        const currentFileNum = appState.initialQueueSize - appState.queue.length;
        queueHtml = `<div class="queue-alert"> MODE BULK UPLOAD: Memproses File ${currentFileNum} dari ${appState.initialQueueSize}</div>`;
    }
    
    if (appState.view === 'RECORD') {
        bodyHtml = `
            <div style="font-size:14px; color:var(--slate); font-weight:600; text-align:center;">Tekan tombol untuk merekam suara asli.</div>
            <button id="btn-rec" class="btn-record" onclick="window.startRecording()">${ICONS.MIC}</button>
            <canvas id="visualizer"></canvas>
            <div id="rec-status" style="font-weight:700; color:#1e293b;">Siap Merekam</div>
            ${canOptimize ? `<div style="color:var(--s); font-size:12px; font-weight:700;"> Ada rekaman tersimpan di tab Optimize</div>` : ''}
        `;
    } else if (appState.view === 'UPLOAD') {
        bodyHtml = `
            <input type="file" id="f-aud" accept="audio/*" multiple hidden onchange="window.handleFileSelect(this.files)">
            <div class="btn-upload-area" onclick="document.getElementById('f-aud').click()">
                ${ICONS.UPLOAD}
                <div style="margin-top:10px; font-weight:700;">Klik untuk Upload File / Bulk Upload</div>
                <div style="font-size:12px; margin-top:5px;">Bisa pilih banyak file sekaligus (MP3, WAV, M4A)</div>
            </div>
        `;
    } else if (appState.view === 'OPTIMIZE') {
        if (!canOptimize) {
            window.switchView('RECORD');
            return;
        }

        const origSize = window.formatBytes(appState.rawBlob.size);
        const optSize = window.formatBytes(appState.optimizedBlob.size);
        const percent = Math.round((1 - (appState.optimizedBlob.size / appState.rawBlob.size)) * 100);
        
        let prefillName = '';
        if (appState.rawBlob && appState.rawBlob.name) {
            prefillName = appState.rawBlob.name.replace(/\.[^/.]+$/, ""); // Buang ekstensi file
        }

        bodyHtml = `
            ${queueHtml}
            <div class="meter-box">
                <div class="meter-stat"><span class="meter-label">Raw Size</span><span class="meter-val" style="color:var(--slate);">${origSize}</span></div>
                <div class="meter-stat" style="text-align:right;"><span class="meter-label">Optimized (Opus)</span><span class="meter-val" style="color:var(--p);">${optSize}</span></div>
                <div class="meter-save">Hemat ${percent > 0 ? percent : 0}%</div>
            </div>
            
            <audio controls src="${URL.createObjectURL(appState.optimizedBlob)}" style="width:100%; height:40px; outline:none;"></audio>
            
            <div style="width:100%; display:flex; flex-direction:column; gap:10px; margin-top:10px;">
                <input type="text" id="ap-name" list="item-list" class="input-v36" placeholder="Nama Instruksi (misal: Kucing)" value="${prefillName}">
                <input type="text" id="ap-cat" list="cat-list" class="input-v36" placeholder="Usulan Kategori (misal: Hewan)">
                
                <datalist id="item-list">${appState.items.map(i => `<option value="${i}">`).join('')}</datalist>
                <datalist id="cat-list">${appState.categories.map(c => `<option value="${c.name}">`).join('')}</datalist>
            </div>
            
            <button id="btn-send" class="btn-act" style="background:var(--p); color:white;" onclick="window.sendToQuarantine()">
                ${ICONS.SEND} SEND TO QUARANTINE
            </button>
            <button class="btn-act" style="background:#fef2f2; color:var(--d);" onclick="window.discardRecording()">
                ${appState.queue.length > 0 ? ' BUANG & LANJUT ANTRIAN' : ' BUANG REKAMAN'}
            </button>
        `;
    } else if (appState.view === 'QUARANTINE') {
        // Enrichment: Render UI Karantina
        if (appState.quarantineList.length === 0) {
            bodyHtml = `<div style="padding:40px; color:var(--slate); text-align:center; font-weight:700;">Antrean Karantina Audio Kosong.</div>`;
        } else {
            const listHtml = appState.quarantineList.map(item => `
                <div class="qa-item">
                    <div class="qa-info">
                        <div class="qa-title">${item.proposed_item_name || 'Tanpa Nama'}</div>
                        <div class="qa-meta">Kat: ${item.proposed_category || '-'}</div>
                    </div>
                    <audio class="qa-player" controls src="${item.public_url}"></audio>
                    <div class="qa-actions">
                        <button class="btn-icon btn-approve" onclick="window.approveAudio('${item.id}')">${ICONS.CHECK} OK</button>
                        <button class="btn-icon btn-reject" onclick="window.rejectAudio('${item.id}')">${ICONS.TRASH}</button>
                    </div>
                </div>
            `).join('');
            
            bodyHtml = `
                <div style="width:100%; display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <div style="font-weight:800; color:var(--p);">TOTAL ANTREAN: ${appState.quarantineList.length}</div>
                </div>
                <div class="qa-list">${listHtml}</div>
            `;
        }
    }

    container.innerHTML = `
        <div class="ap-app">
            <div class="ap-card">
                <div class="ap-nav">
                    <div class="ap-tab ${appState.view === 'RECORD' ? 'active' : ''}" onclick="window.switchView('RECORD')"> RECORDER</div>
                    <div class="ap-tab ${appState.view === 'UPLOAD' ? 'active' : ''}" onclick="window.switchView('UPLOAD')"> UPLOAD</div>
                    <div class="ap-tab ${appState.view === 'OPTIMIZE' ? 'active' : ''} ${!canOptimize ? 'disabled' : ''}" onclick="${canOptimize ? "window.switchView('OPTIMIZE')" : ""}"> OPTIMIZE</div>
                    <div class="ap-tab ${appState.view === 'QUARANTINE' ? 'active' : ''}" onclick="window.switchView('QUARANTINE')"> QUARANTINE</div>
                </div>
                <div class="ap-body">${bodyHtml}</div>
            </div>
        </div>
    `;
    
    if (appState.view === 'RECORD') {
        resetVisualizerCanvas();
    }
}

async function handleFileSelect(files) {
    if (!files || files.length === 0) return;
    
    // Enrichment: Inisialisasi Sistem Antrean
    appState.queue = Array.from(files);
    appState.initialQueueSize = appState.queue.length;
    
    await processNextInQueue();
}

async function processNextInQueue() {
    if (appState.queue.length === 0) {
        appState.initialQueueSize = 0; // Reset antrean
        window.switchView('RECORD');
        return;
    }

    const file = appState.queue.shift();
    appState.rawBlob = file;
    
    const container = document.querySelector('.ap-body');
    const currentNum = appState.initialQueueSize - appState.queue.length;
    
    container.innerHTML = `
        <div style="padding:40px; font-weight:700; color:var(--p); text-align:center;">
             Processing Engine: Trim & Normalize...<br>
            <span style="font-size:12px; color:var(--slate);">File ${currentNum} dari ${appState.initialQueueSize} : ${file.name}</span>
        </div>`;
    
    await processAudioEngine(file);
}

function discardRecording() {
    appState.rawBlob = null;
    appState.optimizedBlob = null;
    
    // Enrichment: Lanjut antrean jika ada, jika habis kembali ke Record
    if (appState.queue.length > 0) {
        processNextInQueue();
    } else {
        appState.initialQueueSize = 0;
        window.switchView('RECORD');
    }
}

function resetVisualizerCanvas() {
    const canvas = document.getElementById('visualizer');
    if (!canvas) return;
    
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, canvas.height / 2 - 1, canvas.width, 2);
}

function startLiveVisualizer(stream) {
    const canvas = document.getElementById('visualizer');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');

    if (!liveAudioCtx) {
        liveAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    liveAnalyser = liveAudioCtx.createAnalyser();
    liveAnalyser.fftSize = 1024;
    
    const source = liveAudioCtx.createMediaStreamSource(stream);
    source.connect(liveAnalyser);
    
    const bufferLength = liveAnalyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    function draw() {
        if (!mediaRecorder || mediaRecorder.state !== 'recording') {
            resetVisualizerCanvas();
            return;
        }
        
        visualizerInterval = requestAnimationFrame(draw);
        liveAnalyser.getByteTimeDomainData(dataArray);
        
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ef4444'; 
        ctx.beginPath();
        
        const sliceWidth = canvas.width * 1.0 / bufferLength;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * canvas.height / 2;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
            
            x += sliceWidth;
        }
        
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
    }
    
    draw();
}

async function startRecording() {
    const btn = document.getElementById('btn-rec');
    
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        window.stopRecording();
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = e => { 
            if (e.data.size > 0) {
                audioChunks.push(e.data); 
            }
        };
        
        mediaRecorder.onstop = async () => {
            appState.rawBlob = new Blob(audioChunks, { type: 'audio/webm' });
            appState.queue = []; // Clear queue jika rekam manual
            appState.initialQueueSize = 0;
            
            document.getElementById('rec-status').innerText = "Processing Engine...";
            
            stream.getTracks().forEach(t => t.stop());
            
            if (liveAudioCtx && liveAudioCtx.state !== 'closed') { 
                liveAudioCtx.close(); 
                liveAudioCtx = null; 
            }
            
            await processAudioEngine(appState.rawBlob);
        };

        mediaRecorder.start();
        btn.innerHTML = ICONS.STOP;
        btn.classList.add('recording');
        document.getElementById('rec-status').innerText = "Merekam... Klik untuk Berhenti";
        
        startLiveVisualizer(stream);
        
    } catch (err) { 
        alert("Mic gagal diakses: " + err); 
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        document.getElementById('btn-rec').classList.remove('recording');
        
        if (visualizerInterval) {
            cancelAnimationFrame(visualizerInterval);
        }
    }
}

// THE MICRO-STUDIO ENGINE (Auto Trim, Normalize, Compress to 32kbps Opus)
async function processAudioEngine(blob) {
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        const channelData = audioBuffer.getChannelData(0);
        const threshold = 0.02; // Silence threshold
        let startIdx = 0, endIdx = channelData.length - 1;
        
        while (startIdx < endIdx && Math.abs(channelData[startIdx]) < threshold) {
            startIdx++;
        }
        
        while (endIdx > startIdx && Math.abs(channelData[endIdx]) < threshold) {
            endIdx--;
        }
        
        let maxPeak = 0;
        for (let i = startIdx; i <= endIdx; i++) {
            if (Math.abs(channelData[i]) > maxPeak) {
                maxPeak = Math.abs(channelData[i]);
            }
        }
        
        const gainMultiplier = maxPeak > 0 ? (0.95 / maxPeak) : 1; // Peak Normalize to -0.4dB
        const trimmedLength = endIdx - startIdx + 1;
        
        if (trimmedLength <= 0) {
            throw new Error("Audio kosong atau terlalu hening.");
        }

        const offlineCtx = new OfflineAudioContext(1, trimmedLength, 22050); // Force 22kHz Mono
        const source = offlineCtx.createBufferSource();
        source.buffer = audioBuffer;
        
        const gainNode = offlineCtx.createGain();
        gainNode.gain.value = gainMultiplier;
        
        source.connect(gainNode);
        gainNode.connect(offlineCtx.destination);
        source.start(0, startIdx / audioBuffer.sampleRate);
        
        const renderedBuffer = await offlineCtx.startRendering();
        
        // Convert AudioBuffer to Blob (Opus WebM 32kbps) using MediaRecorder trick
        appState.optimizedBlob = await encodeToCompressedOpus(renderedBuffer);
        window.switchView('OPTIMIZE');

    } catch (e) {
        console.error(e);
        alert("Gagal memproses audio: " + e.message);
        discardRecording(); // Lanjut ke antrean berikutnya jika gagal
    }
}

function encodeToCompressedOpus(audioBuffer) {
    return new Promise(resolve => {
        const streamCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = streamCtx.createBufferSource();
        source.buffer = audioBuffer;
        
        const destination = streamCtx.createMediaStreamDestination();
        source.connect(destination);
        
        const rec = new MediaRecorder(destination.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 32000 });
        const chunks = [];
        
        rec.ondataavailable = e => {
            chunks.push(e.data);
        };
        
        rec.onstop = () => {
            resolve(new Blob(chunks, { type: 'audio/webm' }));
        };
        
        source.start(0);
        rec.start();
        
        source.onended = () => {
            rec.stop();
        };
    });
}

async function sendToQuarantine() {
    const name = document.getElementById('ap-name').value.trim();
    const cat = document.getElementById('ap-cat').value.trim();
    const btn = document.getElementById('btn-send');
    
    if (!name || !cat) {
        return alert("Nama dan Usulan Kategori wajib diisi!");
    }
    
    btn.innerHTML = ' MENGIRIM...'; 
    btn.disabled = true;

    try {
        const safeName = name.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
        const safeCat = cat.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
        const fileName = `AUD_${Date.now()}_${safeCat}_${safeName}.webm`;
        const path = `quarantine/${fileName}`;

        const { error: upErr } = await supabase.storage.from('general').upload(path, appState.optimizedBlob);
        
        if (upErr) {
            throw upErr;
        }

        const { data: urlData } = supabase.storage.from('general').getPublicUrl(path);

        const currentUserId = window.getEloqAuditUser ? window.getEloqAuditUser() : null;

        const { error: dbErr } = await supabase.from('es_quarantine_assets').insert({
            public_url: urlData.publicUrl,
            file_path: path,
            media_type: 'AUDIO',
            status: 'PENDING',
            proposed_item_name: name,
            proposed_category: cat,
            contributor_id: currentUserId
        });

        if (dbErr) {
            throw dbErr;
        }

        appState.rawBlob = null;
        appState.optimizedBlob = null;
        
        // Enrichment: Panggil file berikutnya dari antrean
        if (appState.queue.length > 0) {
            processNextInQueue();
        } else {
            alert("Semua file berhasil dikirim ke Karantina.");
            appState.initialQueueSize = 0;
            window.switchView('RECORD');
        }

    } catch (e) {
        alert("Gagal mengirim: " + e.message);
        btn.innerHTML = `${ICONS.SEND} SEND TO QUARANTINE`; 
        btn.disabled = false;
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}