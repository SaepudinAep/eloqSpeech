// eloq_vowel_engine.js - V5.1 (Standardized Clinical Edition)
// Features: RMS Calibration, Dual-Pipeline (Real-time + MediaRecorder), Shoelace Polygon VSA.
// Enrichment: In-Flight Setup Navigation & Post-Flight S.O.A.P Database Integration.
// Pattern: Strict Standard Architecture (No Core Logic Cleaning).

import { supabase } from '../config.js';

// --- CONFIGURATION ---
const CONFIG = {
    AUDIO: {
        CALIBRATION_TIME_MS: 3000,
        RECORD_TIME_MS: 3000,
        VOLUME_MULTIPLIER: 500
    },
    VOWEL_CHART: {
        F1_MIN: 200, F1_MAX: 1200, // Sumbu Y (Bukaan Rahang: Tinggi = Tertutup, Rendah = Terbuka)
        F2_MIN: 500, F2_MAX: 3200  // Sumbu X (Posisi Lidah: Kiri = Depan, Kanan = Belakang)
    },
    COLORS: {
        A: '#ef4444', I: '#3b82f6', U: '#10b981', E: '#f59e0b', O: '#8b5cf6',
        NEUTRAL: '#94a3b8', TEXT: '#1e293b', GRID: '#e2e8f0'
    }
};

// --- STYLES ---
const STYLES = `
    * { box-sizing: border-box; }
    .eve-root { position: relative; width: 100%; height: 100%; min-height: 60vh; background: #f8fafc; display: flex; flex-direction: column; overflow: hidden; font-family: 'Inter', sans-serif; user-select: none; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .eve-header { height: 60px; padding: 0 20px; background: white; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; z-index: 10; flex-shrink: 0; }
    .eve-title { font-weight: 700; color: #1e293b; font-size: 1.1rem; }
    .eve-workspace { flex: 1; position: relative; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 20px; overflow: hidden; }
    .eve-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(248, 250, 252, 0.98); z-index: 100; display: flex; flex-direction: column; padding: 20px; overflow-y: auto; }
    .eve-menu-container { max-width: 600px; margin: auto; width: 100%; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
    
    .eve-orb-container { position: relative; width: 150px; height: 150px; display: flex; justify-content: center; align-items: center; margin: 20px auto; }
    .eve-orb-base { position: absolute; width: 60px; height: 60px; border-radius: 50%; background: #e2e8f0; z-index: 2; display: flex; justify-content: center; align-items: center; font-size: 1.5rem; font-weight: 800; color: white; }
    
    .eve-btn { width: 100%; padding: 15px; border: 1px solid #cbd5e1; border-radius: 8px; background: white; cursor: pointer; font-weight: 700; margin: 8px 0; transition: 0.2s; font-size: 1rem; color: #1e293b; text-align: left; }
    .eve-btn:hover { background: #eff6ff; border-color: #3b82f6; transform: translateY(-2px); }
    .eve-btn-action { background: #3b82f6; color: white; text-align: center; border: none; }
    .eve-icon-btn { padding: 8px 15px; border-radius: 5px; border: 1px solid #cbd5e1; background: white; cursor: pointer; font-weight: bold; color: #1e293b; font-size: 0.85rem; transition: 0.2s; }
    .eve-control-btn { padding: 8px 15px; border: 1px solid #cbd5e1; border-radius: 6px; background: white; font-weight: 600; cursor: pointer; color: #1e293b; font-size: 0.85rem; }
    .eve-control-btn:hover { background: #f1f5f9; }
    
    .eve-form-label { display: block; font-size: 0.9rem; font-weight: 700; color: #475569; margin-bottom: 8px; margin-top: 15px; }
    .eve-select { width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; background: white; font-family: inherit; font-size: 1rem; color: #1e293b; margin-bottom: 20px; }
    
    .eve-chart-container { width: 100%; max-width: 500px; aspect-ratio: 1; background: white; border: 2px solid #e2e8f0; border-radius: 12px; position: relative; margin: 20px 0; box-shadow: inset 0 0 20px rgba(0,0,0,0.02); }
    canvas { display: block; width: 100%; height: 100%; }
    .eve-status { font-size: 1.2rem; font-weight: 700; color: #475569; margin-bottom: 10px; text-align: center; }
    .eve-timer-bar { width: 100%; max-width: 500px; height: 10px; background: #e2e8f0; border-radius: 5px; overflow: hidden; margin-bottom: 20px; }
    .eve-timer-fill { height: 100%; background: #3b82f6; width: 0%; transition: width 0.1s linear; }
    
    .eve-dash-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 25px; }
    .eve-metric-box { background: white; border: 1px solid #e2e8f0; padding: 15px; border-radius: 10px; text-align: center; }
    .eve-m-val { font-size: 1.8rem; font-weight: 800; color: #1e293b; margin-bottom: 5px; }
    .eve-m-lbl { font-size: 0.75rem; color: #64748b; font-weight: 700; text-transform: uppercase; }
`;

// --- CORE CLINICAL ENGINE ---
class EloqVowelEngine {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.noiseFloor = 0;
    
    this.isRecording = false;
    this.currentVowel = null;
    this.bufferSize = 2048;
    this.sampleRate = 44100;
    
    // Inisialisasi 5 Titik Vokal
    this.sessionData = {
      "A": { trajectory: [], f1_mean: 0, f2_mean: 0, stability: 0, audioUrl: null },
      "I": { trajectory: [], f1_mean: 0, f2_mean: 0, stability: 0, audioUrl: null },
      "U": { trajectory: [], f1_mean: 0, f2_mean: 0, stability: 0, audioUrl: null },
      "E": { trajectory: [], f1_mean: 0, f2_mean: 0, stability: 0, audioUrl: null },
      "O": { trajectory: [], f1_mean: 0, f2_mean: 0, stability: 0, audioUrl: null }
    };
    
    this.clinicalMetrics = { vsa_area: 0, vai_score: 0, fcr_ratio: 0 };
  }

  async initialize() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.sampleRate = this.audioContext.sampleRate;
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, 
          video: false 
      });
      
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.bufferSize;
      
      this.mediaRecorder = new MediaRecorder(stream);
      this.mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) this.audioChunks.push(e.data); };
      
      this.microphone.connect(this.analyser);
      return true;
    } catch (error) {
      console.error("Gagal inisialisasi mic:", error);
      return false;
    }
  }

  getVolumeRMS() {
    const timeData = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(timeData);
    let sumSquares = 0.0;
    for (let i = 0; i < timeData.length; i++) {
        const val = (timeData[i] - 128) / 128;
        sumSquares += val * val;
    }
    const rms = Math.sqrt(sumSquares / timeData.length);
    return Math.min(100, rms * CONFIG.AUDIO.VOLUME_MULTIPLIER);
  }

  startRecording(vowelLabel) {
    if(this.audioContext && this.audioContext.state === 'suspended') this.audioContext.resume();
    
    this.currentVowel = vowelLabel.toUpperCase();
    this.sessionData[this.currentVowel].trajectory = [];
    this.audioChunks = [];
    
    this.isRecording = true;
    this.mediaRecorder.start();
  }

  stopRecording(onCompleteCallback) {
    this.isRecording = false;
    
    this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.sessionData[this.currentVowel].audioUrl = URL.createObjectURL(blob);
        this.calculateVowelAverages(this.currentVowel);
        if(onCompleteCallback) onCompleteCallback();
    };
    
    if(this.mediaRecorder.state !== 'inactive') this.mediaRecorder.stop();
  }

  processAudioFrame() {
    if (!this.isRecording) return { f1: 0, f2: 0, volume: 0 };
    
    const currentVolume = this.getVolumeRMS();
    let f1 = 0, f2 = 0;
    
    if (currentVolume > this.noiseFloor) {
        const frequencyData = new Float32Array(this.analyser.frequencyBinCount);
        this.analyser.getFloatFrequencyData(frequencyData);
        
        f1 = this.findPeakInRange(frequencyData, 200, 1000);
        f2 = this.findPeakInRange(frequencyData, Math.max(800, f1 + 200), 3000);
        
        if (f1 > 0 && f2 > 0) {
            this.sessionData[this.currentVowel].trajectory.push({ 
                time: Date.now(), f1: f1, f2: f2, volume: currentVolume 
            });
        }
    }
    
    return { f1, f2, volume: currentVolume };
  }

  findPeakInRange(freqData, minHz, maxHz) {
    const nyquist = this.sampleRate / 2;
    const minBin = Math.floor((minHz / nyquist) * freqData.length);
    const maxBin = Math.floor((maxHz / nyquist) * freqData.length);
    let maxVal = -Infinity, peakBin = -1;
    
    for (let i = minBin; i <= maxBin; i++) {
      if (freqData[i] > maxVal) { maxVal = freqData[i]; peakBin = i; }
    }
    if (peakBin === -1) return 0;
    
    let alpha = freqData[peakBin - 1] || 0;
    let beta = freqData[peakBin];
    let gamma = freqData[peakBin + 1] || 0;
    let denom = alpha - 2 * beta + gamma;
    let p = denom === 0 ? 0 : 0.5 * (alpha - gamma) / denom;
    return ((peakBin + p) * nyquist) / freqData.length;
  }

  calculateVowelAverages(vowel) {
    const data = this.sessionData[vowel].trajectory;
    if (data.length === 0) return;
    
    let f1Sum = 0, f2Sum = 0;
    data.forEach(p => { f1Sum += p.f1; f2Sum += p.f2; });
    this.sessionData[vowel].f1_mean = f1Sum / data.length;
    this.sessionData[vowel].f2_mean = f2Sum / data.length;
    
    let varianceF1 = 0;
    data.forEach(p => varianceF1 += Math.pow(p.f1 - this.sessionData[vowel].f1_mean, 2));
    let sd = Math.sqrt(varianceF1 / data.length);
    this.sessionData[vowel].stability = Math.max(0, 1 - (sd / 100)); 
  }

  calculateClinicalMetrics(activeSequence) {
    const data = this.sessionData;
    
    // 1. Hitung Luas VSA Dinamis (Shoelace Formula)
    // Urutan fonetik standar untuk non-intersecting polygon: I -> E -> A -> O -> U
    const phoneticOrder = ['I', 'E', 'A', 'O', 'U'];
    const activePoints = phoneticOrder.filter(v => activeSequence.includes(v) && data[v].f1_mean > 0).map(v => data[v]);
    
    let area = 0;
    if (activePoints.length >= 3) {
        let j = activePoints.length - 1;
        for (let i = 0; i < activePoints.length; i++) {
            area += (activePoints[j].f1_mean + activePoints[i].f1_mean) * (activePoints[j].f2_mean - activePoints[i].f2_mean);
            j = i;
        }
        this.clinicalMetrics.vsa_area = Math.abs(area / 2);
    } else {
        this.clinicalMetrics.vsa_area = 0; // Tidak bisa membentuk area
    }

    // 2. Hitung VAI dan FCR HANYA jika Corner Vowels (A, I, U) direkam
    const hasCorners = activeSequence.includes('A') && activeSequence.includes('I') && activeSequence.includes('U');
    if (hasCorners && data['A'].f1_mean > 0 && data['I'].f1_mean > 0 && data['U'].f1_mean > 0) {
        const A = data['A'], I = data['I'], U = data['U'];
        this.clinicalMetrics.vai_score = (I.f2_mean + A.f1_mean) / (I.f1_mean + U.f1_mean + U.f2_mean + A.f2_mean);
        this.clinicalMetrics.fcr_ratio = (U.f2_mean + A.f2_mean + I.f1_mean + U.f1_mean) / (I.f2_mean + A.f1_mean);
    } else {
        this.clinicalMetrics.vai_score = 0;
        this.clinicalMetrics.fcr_ratio = 0;
    }
  }

  closeEngine() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') this.mediaRecorder.stop();
    if (this.analyser) this.analyser.disconnect();
    if (this.microphone) {
        this.microphone.mediaStream.getTracks().forEach(track => track.stop());
        this.microphone.disconnect();
    }
    if (this.audioContext && this.audioContext.state !== 'closed') this.audioContext.close();
  }
}

// --- STATE MANAGEMENT ---
let state = {
    engine: null, isActive: false,
    sequence: [], currentIndex: 0,
    animFrame: null, startTime: 0,
    currentF1: 0, currentF2: 0, currentVol: 0
};

// --- INITIALIZATION & SPA EXIT ---
export function renderEloqVowelEngine(containerId) {
    nukeArtifacts();
    if (!document.getElementById('eve-styles')) {
        const s = document.createElement('style'); s.id = 'eve-styles'; s.innerHTML = STYLES;
        document.head.appendChild(s);
    }
    const root = document.getElementById(containerId);
    root.style.display = 'flex'; root.style.flexDirection = 'column'; root.style.height = '100%';
    root.innerHTML = '<div class="eve-root" id="eve-app"></div>';
    showStartScreen(root.querySelector('.eve-root'));
}

function nukeArtifacts() {
    state.isActive = false;
    if (state.animFrame) cancelAnimationFrame(state.animFrame);
    
    if (state.engine && state.engine.sessionData) {
        Object.values(state.engine.sessionData).forEach(data => {
            if(data.audioUrl) URL.revokeObjectURL(data.audioUrl);
        });
    }
    
    if (state.engine) { state.engine.closeEngine(); state.engine = null; }
    document.querySelectorAll('.eve-overlay').forEach(el => el.remove());
}

function exitToDashboard() {
    if(confirm('Akhiri sesi asesmen ini dan musnahkan data?')) {
        nukeArtifacts();
        if(typeof window.renderApp === 'function') window.renderApp(null);
    }
}

// --- PHASE 1: PRE-FLIGHT MENU ---
function showStartScreen(appRoot) {
    const overlay = document.createElement('div');
    overlay.className = 'eve-overlay';
    overlay.innerHTML = `
        <div class="eve-menu-container" style="margin:auto;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h2 style="margin:0; color:#1e293b;">Resonansi & VSA Klinis</h2>
                <button class="eve-icon-btn" id="btn-exit-menu" style="background:#fff1f2; color:#db2777; border-color:#fbcfe8;">✖ Keluar</button>
            </div>
            <p style="color:#64748b; margin-bottom:15px; font-size:0.95rem;">Sesuaikan dosis terapi (*Fatigue Management*) dengan memilih mode di bawah ini.</p>
            
            <label class="eve-form-label">Mode Asesmen & Terapi:</label>
            <select id="eve-mode-select" class="eve-select">
                <optgroup label="Asesmen Baterai Lengkap (Diagnosis)">
                    <option value="A,I,U" selected>Segitiga Standar (A-I-U)</option>
                    <option value="A,I,U,E,O">Poligon Lengkap (A-I-U-E-O)</option>
                </optgroup>
                <optgroup label="Isolasi / Latihan Target (Drilling)">
                    <option value="A">Isolasi Huruf: "A" (Rahang Terbuka)</option>
                    <option value="I">Isolasi Huruf: "I" (Lidah Depan)</option>
                    <option value="U">Isolasi Huruf: "U" (Bibir Membulat)</option>
                    <option value="E">Isolasi Huruf: "E"</option>
                    <option value="O">Isolasi Huruf: "O"</option>
                </optgroup>
            </select>
            
            <button class="eve-btn eve-btn-action" id="btn-start-drill">Mulai Kalibrasi & Asesmen</button>
        </div>
    `;
    appRoot.appendChild(overlay);
    overlay.querySelector('#btn-exit-menu').onclick = exitToDashboard;
    
    overlay.querySelector('#btn-start-drill').onclick = async () => {
        const selectedMode = overlay.querySelector('#eve-mode-select').value;
        state.sequence = selectedMode.split(',');
        
        overlay.innerHTML = `<div class="eve-menu-container" style="margin:auto; text-align:center;"><h3>Menyiapkan Mikrofon...</h3></div>`;
        state.engine = new EloqVowelEngine();
        const success = await state.engine.initialize();
        if(success) {
            overlay.remove();
            startCalibrationPhase(appRoot);
        } else {
            alert("Akses mikrofon ditolak atau tidak tersedia.");
            exitToDashboard();
        }
    };
}

// --- PHASE 2: CALIBRATION ---
function startCalibrationPhase(appRoot) {
    state.isActive = true;
    appRoot.innerHTML = `
        <div class="eve-header">
            <div><div class="eve-title">Kalibrasi Ruangan</div></div>
            <button class="eve-icon-btn" id="btn-exit-calib" style="background:#fff1f2; color:#db2777; border-color:#fbcfe8;">✖ Keluar</button>
        </div>
        <div class="eve-workspace">
            <div class="eve-orb-container"><div class="eve-orb-base" style="background:#f59e0b;">🤫</div></div>
            <div class="eve-status">Harap Hening...</div>
            <div style="color:#64748b; font-size:0.9rem;">Mengukur ambang batas bising ruangan (Noise Floor).</div>
        </div>
    `;
    
    document.getElementById('btn-exit-calib').onclick = exitToDashboard;
    
    let vols = [];
    const calibStart = Date.now();
    
    const calibLoop = () => {
        if (!state.isActive) return;
        vols.push(state.engine.getVolumeRMS());
        
        if (Date.now() - calibStart < CONFIG.AUDIO.CALIBRATION_TIME_MS) {
            state.animFrame = requestAnimationFrame(calibLoop);
        } else {
            const sum = vols.reduce((a, b) => a + b, 0);
            state.engine.noiseFloor = (sum / vols.length) + 1.5; 
            buildWorkspace(appRoot);
        }
    };
    calibLoop();
}

// --- PHASE 3: WORKSPACE & BIOFEEDBACK ---
function buildWorkspace(appRoot) {
    state.currentIndex = 0;
    
    appRoot.innerHTML = `
        <div class="eve-header">
            <div><div class="eve-title">Biofeedback Artikulasi</div></div>
            <div style="display:flex; gap:10px;">
                <button class="eve-icon-btn" id="btn-setup-session" style="background:#f1f5f9; color:#475569; border-color:#cbd5e1;">⚙️ Setup</button>
                <button class="eve-icon-btn" id="btn-exit-session" style="background:#fff1f2; color:#db2777; border-color:#fbcfe8;">✖ Keluar</button>
            </div>
        </div>
        <div class="eve-workspace">
            <div class="eve-status" id="eve-status-text">Persiapan...</div>
            <div class="eve-timer-bar"><div class="eve-timer-fill" id="eve-progress"></div></div>
            <div class="eve-chart-container">
                <canvas id="eve-canvas"></canvas>
            </div>
            <button class="eve-btn eve-btn-action" id="btn-record-trigger" style="max-width:300px;">Mulai Rekam Suara</button>
        </div>
    `;
    
    document.getElementById('btn-exit-session').onclick = exitToDashboard;
    document.getElementById('btn-setup-session').onclick = () => {
        nukeArtifacts();
        const root = document.getElementById('eve-app');
        root.innerHTML = '';
        showStartScreen(root);
    };

    prepareNextVowel();
    drawChartGrid();
}

function prepareNextVowel() {
    if(state.currentIndex >= state.sequence.length) {
        showDashboard();
        return;
    }
    
    const targetVowel = state.sequence[state.currentIndex];
    const stepText = state.sequence.length > 1 ? `Langkah ${state.currentIndex + 1}/${state.sequence.length}: ` : `Latihan Isolasi: `;
    
    document.getElementById('eve-status-text').innerHTML = `${stepText}Bunyikan <span style="color:${CONFIG.COLORS[targetVowel]}; font-size:2rem;">"${targetVowel}"</span> panjang.`;
    document.getElementById('eve-progress').style.width = '0%';
    
    const btn = document.getElementById('btn-record-trigger');
    btn.style.display = 'block';
    btn.innerText = `Rekam Suara "${targetVowel}"`;
    btn.onclick = () => startRecordingProcess(targetVowel);
}

function startRecordingProcess(vowel) {
    document.getElementById('btn-record-trigger').style.display = 'none';
    document.getElementById('eve-status-text').innerHTML = `<span style="color:#10b981;">Merekam "${vowel}"... Tahan suara Bapak/Ibu.</span>`;
    
    state.engine.startRecording(vowel);
    state.startTime = Date.now();
    
    const pollingLoop = () => {
        if(!state.isActive) return;
        
        const currentData = state.engine.processAudioFrame();
        state.currentF1 = currentData.f1;
        state.currentF2 = currentData.f2;
        state.currentVol = currentData.volume;

        const elapsed = Date.now() - state.startTime;
        const progress = Math.min((elapsed / CONFIG.AUDIO.RECORD_TIME_MS) * 100, 100);
        document.getElementById('eve-progress').style.width = `${progress}%`;
        
        drawChartGrid(); 
        drawLiveOrb();   
        
        if(elapsed < CONFIG.AUDIO.RECORD_TIME_MS) {
            state.animFrame = requestAnimationFrame(pollingLoop);
        } else {
            document.getElementById('eve-status-text').innerHTML = "Memproses Formant...";
            state.engine.stopRecording(() => {
                state.currentIndex++;
                prepareNextVowel();
            });
        }
    };
    
    pollingLoop();
}

// --- 2D RENDERING ---
function mapToCanvas(f1, f2, canvasW, canvasH) {
    let x = canvasW - ((f2 - CONFIG.VOWEL_CHART.F2_MIN) / (CONFIG.VOWEL_CHART.F2_MAX - CONFIG.VOWEL_CHART.F2_MIN)) * canvasW;
    let y = ((f1 - CONFIG.VOWEL_CHART.F1_MIN) / (CONFIG.VOWEL_CHART.F1_MAX - CONFIG.VOWEL_CHART.F1_MIN)) * canvasH;
    
    x = Math.max(0, Math.min(canvasW, x));
    y = Math.max(0, Math.min(canvasH, y));
    return { x, y };
}

function drawChartGrid() {
    const cvs = document.getElementById('eve-canvas');
    if(!cvs) return;
    cvs.width = cvs.clientWidth; cvs.height = cvs.clientHeight;
    const ctx = cvs.getContext('2d');
    
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    
    ctx.strokeStyle = CONFIG.COLORS.GRID; ctx.lineWidth = 1;
    for(let i=1; i<4; i++) {
        ctx.beginPath(); ctx.moveTo(0, i*(cvs.height/4)); ctx.lineTo(cvs.width, i*(cvs.height/4)); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(i*(cvs.width/4), 0); ctx.lineTo(i*(cvs.width/4), cvs.height); ctx.stroke();
    }
    
    ctx.fillStyle = CONFIG.COLORS.NEUTRAL; ctx.font = '10px Arial';
    ctx.fillText("F2 Lidah Maju (3200Hz)", 5, 12);
    ctx.fillText("Lidah Mundur (500Hz) F2", cvs.width - 120, 12);
    ctx.fillText("F1 Rahang Tertutup (200Hz)", 5, 25);
    ctx.fillText("Rahang Terbuka (1200Hz) F1", 5, cvs.height - 5);
}

function drawLiveOrb() {
    const cvs = document.getElementById('eve-canvas');
    if(!cvs || state.currentF1 === 0 || state.currentF2 === 0) return;
    
    const ctx = cvs.getContext('2d');
    const pos = mapToCanvas(state.currentF1, state.currentF2, cvs.width, cvs.height);
    
    const activeVowel = state.sequence[state.currentIndex];
    const color = CONFIG.COLORS[activeVowel] || CONFIG.COLORS.NEUTRAL;
    
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 15, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.stroke();
}

// --- PHASE 4: SMART DASHBOARD ---
function showDashboard() {
    state.engine.calculateClinicalMetrics(state.sequence);
    const metrics = state.engine.clinicalMetrics;
    const data = state.engine.sessionData;
    const isMultiVowel = state.sequence.length >= 3;
    
    const appRoot = document.getElementById('eve-app');
    const overlay = document.createElement('div');
    overlay.className = 'eve-overlay';
    
    // Smart Rendering: Hide Area Metrics if Isolated Vowel
    const metricsHtml = isMultiVowel ? `
        <div class="eve-dash-grid">
            <div class="eve-metric-box">
                <div class="eve-m-val">${Math.round(metrics.vsa_area).toLocaleString()}</div>
                <div class="eve-m-lbl">Luas VSA (Hz²)</div>
            </div>
            <div class="eve-metric-box">
                <div class="eve-m-val">${metrics.vai_score > 0 ? metrics.vai_score.toFixed(2) : '-'}</div>
                <div class="eve-m-lbl">Indeks VAI</div>
            </div>
            <div class="eve-metric-box">
                <div class="eve-m-val">${metrics.fcr_ratio > 0 ? metrics.fcr_ratio.toFixed(2) : '-'}</div>
                <div class="eve-m-lbl">Rasio FCR</div>
            </div>
        </div>
    ` : `
        <div style="background:#eff6ff; border:1px solid #bfdbfe; color:#1e40af; padding:15px; border-radius:8px; margin-bottom:25px; font-size:0.9rem;">
            <strong>Mode Isolasi:</strong> Pengukuran Luas VSA dan FCR dinonaktifkan. Fokus pada presisi target (F1/F2) dan stabilitas tremor.
        </div>
    `;
    
    overlay.innerHTML = `
        <div style="max-width:850px; margin:auto; width:100%;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h2 style="margin:0; color:#1e293b;">Rekam Medis: Formant Vokal</h2>
                <button class="eve-icon-btn" id="btn-dash-exit" style="background:#fff1f2; color:#db2777; border-color:#fbcfe8;">✖ Tutup Sesi</button>
            </div>
            
            ${metricsHtml}
            
            <div style="display:flex; gap:20px; flex-wrap:wrap;">
                <div style="flex:1; min-width:300px;">
                    <h3 style="font-size:1rem; color:#475569; margin-bottom:10px; border-bottom:2px solid #e2e8f0; padding-bottom:5px;">Peta Ruang Artikulasi (VSA)</h3>
                    <div class="eve-chart-container" style="margin:0;">
                        <canvas id="eve-final-canvas"></canvas>
                    </div>
                </div>
                
                <div style="flex:1; min-width:300px; background:white; border:1px solid #e2e8f0; border-radius:12px; padding:20px;">
                    <h3 style="font-size:1rem; color:#475569; margin-bottom:15px; border-bottom:2px solid #e2e8f0; padding-bottom:5px;">Detail Metrik & Playback Audit</h3>
                    ${state.sequence.map(v => `
                        <div style="margin-bottom:15px; display:flex; justify-content:space-between; align-items:center; padding-bottom:10px; border-bottom:1px dashed #e2e8f0;">
                            <div style="font-size:1.5rem; font-weight:800; color:${CONFIG.COLORS[v]}; width:30px; text-align:center;">${v}</div>
                            <div style="flex:1; margin-left:15px; font-size:0.9rem; color:#475569;">
                                <div>F1 (Rahang): <b>${Math.round(data[v].f1_mean)} Hz</b></div>
                                <div>F2 (Lidah): <b>${Math.round(data[v].f2_mean)} Hz</b></div>
                                <div style="font-size:0.8rem; color:#94a3b8; margin-top:3px;">Stabilitas: ${(data[v].stability * 100).toFixed(1)}%</div>
                            </div>
                            <div>
                                <audio id="eve-aud-${v}" src="${data[v].audioUrl}"></audio>
                                <button class="eve-control-btn" id="btn-play-${v}">▶️ Putar</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <hr style="border:none; border-top:1px solid #e2e8f0; margin:30px 0 20px 0;">
            <div style="background:#f8fafc; padding:20px; border-radius:12px; border:1px solid #cbd5e1; margin-bottom:20px; text-align:left;">
                <div style="font-weight:800; color:#1e293b; margin-bottom:15px; text-transform:uppercase; font-size:0.9rem;">Form Observasi Klinis (S.O.A.P)</div>
                <div style="margin-bottom:15px;">
                    <label style="display:block; font-size:0.85rem; font-weight:700; color:#475569; margin-bottom:5px;">Tingkat Bantuan Akhir (Prompt Level):</label>
                    <select id="eve-final-prompt" class="eve-select" style="margin-bottom:0; padding:10px;">
                        <option value="0">Mandiri (0)</option>
                        <option value="1">Verbal/Visual Hint (1)</option>
                        <option value="2">Fisik Penuh (2)</option>
                    </select>
                </div>
                <div style="margin-bottom:15px;">
                    <label style="display:block; font-size:0.85rem; font-weight:700; color:#475569; margin-bottom:5px;">Catatan Terapis:</label>
                    <textarea id="eve-clinical-notes" class="eve-select" style="min-height:80px; resize:vertical; padding:10px; margin-bottom:0;" placeholder="Tuliskan respon dan fokus pasien..."></textarea>
                </div>
                <button class="eve-btn eve-btn-action" id="btn-save-db" style="width:100%;">💾 SIMPAN REKAM MEDIS</button>
            </div>

        </div>
    `;
    appRoot.appendChild(overlay);
    overlay.querySelector('#btn-dash-exit').onclick = exitToDashboard;
    
    state.sequence.forEach(v => setupPlaybackListener(v));
    
    // Bind the save button
    document.getElementById('btn-save-db').onclick = saveVowelDataToDB;
    
    if(state.engine && state.engine.microphone) {
        state.engine.microphone.disconnect();
        state.engine.microphone.mediaStream.getTracks().forEach(t => t.stop());
    }
    
    setTimeout(() => { drawFinalVSA(data, state.sequence); }, 150);
}

function setupPlaybackListener(vowel) {
    const btn = document.getElementById(`btn-play-${vowel}`);
    const audio = document.getElementById(`eve-aud-${vowel}`);
    if(!btn || !audio) return;
    
    btn.onclick = () => {
        if (audio.paused) {
            audio.play();
            btn.innerHTML = `⏸️ Jeda`;
        } else {
            audio.pause();
            btn.innerHTML = `▶️ Putar`;
        }
    };
    audio.onended = () => { btn.innerHTML = `▶️ Putar`; };
}

function drawFinalVSA(data, activeSequence) {
    const cvs = document.getElementById('eve-final-canvas');
    if(!cvs) return;
    cvs.width = cvs.clientWidth; cvs.height = cvs.clientHeight;
    const ctx = cvs.getContext('2d');
    
    drawChartGrid();
    
    // Draw Area Polygon if >= 3 points
    if (activeSequence.length >= 3) {
        const phoneticOrder = ['I', 'E', 'A', 'O', 'U'];
        const orderedSequence = phoneticOrder.filter(v => activeSequence.includes(v));
        
        ctx.beginPath();
        orderedSequence.forEach((v, index) => {
            const pos = mapToCanvas(data[v].f1_mean, data[v].f2_mean, cvs.width, cvs.height);
            if (index === 0) ctx.moveTo(pos.x, pos.y);
            else ctx.lineTo(pos.x, pos.y);
        });
        ctx.closePath();
        ctx.fillStyle = 'rgba(59, 130, 246, 0.15)'; ctx.fill();
        ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2; ctx.stroke();
    }
    
    // Draw Nodes
    const drawNode = (pos, color, label) => {
        if(pos.x === 0 && pos.y === 0) return;
        ctx.beginPath(); ctx.arc(pos.x, pos.y, 8, 0, 2*Math.PI);
        ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#1e293b'; ctx.font = 'bold 14px Arial'; ctx.fillText(label, pos.x + 12, pos.y + 5);
    };
    
    activeSequence.forEach(v => {
        const pos = mapToCanvas(data[v].f1_mean, data[v].f2_mean, cvs.width, cvs.height);
        drawNode(pos, CONFIG.COLORS[v], v);
    });
}

// --- DATABASE INTEGRATION (Enrichment) ---
async function saveVowelDataToDB() {
    const btn = document.getElementById('btn-save-db');
    const promptLevel = parseInt(document.getElementById('eve-final-prompt').value);
    const notes = document.getElementById('eve-clinical-notes').value;

    btn.innerHTML = "⏳ MENYIMPAN..."; btn.disabled = true;

    try {
        const rawPatient = localStorage.getItem('eloq_active_patient');
        if (!rawPatient) throw new Error("Pilih pasien terlebih dahulu di bagian header aplikasi!");
        const activePatient = JSON.parse(rawPatient);

        // Fetch UUID Modul Vowel Engine
        const { data: menuData } = await supabase.from('es_menus').select('module_uuid').eq('module_name', 'eloq_vowel_engine').single();
        const exerciseId = menuData ? menuData.module_uuid : null;

        const metrics = state.engine.clinicalMetrics;
        const sessionData = state.engine.sessionData;

        const payload = {
            patient_id: activePatient.id,
            exercise_id: exerciseId,
            cognitive_latency_ms: 0, // Akustik murni, tidak ada latensi klik
            prompt_level: promptLevel,
            is_success: true, // Observasi klinis tanpa sistem gagal/lulus
            precision_offset_rel: parseFloat(metrics.vai_score.toFixed(2)) || 0, // VAI mapped to precision
            jitter_index: parseFloat(metrics.fcr_ratio.toFixed(2)) || 0, // FCR mapped to jitter
            touch_radius: parseFloat(metrics.vsa_area.toFixed(2)) || 0, // VSA Area mapped to touch_radius
            session_metadata: {
                module_code: "vowel_space_engine",
                sequence: state.sequence,
                vsa_area: metrics.vsa_area,
                vai_score: metrics.vai_score,
                fcr_ratio: metrics.fcr_ratio,
                vowel_details: state.sequence.map(v => ({
                    vowel: v,
                    f1_mean: sessionData[v].f1_mean,
                    f2_mean: sessionData[v].f2_mean,
                    stability: sessionData[v].stability
                })),
                therapist_notes: notes
            }
        };

        const { error } = await supabase.from('es_game_logs').insert(payload);
        if (error) throw error;

        alert("✅ Berhasil! Data Sesi Vowel Space (VSA) sudah diamankan ke Database.");
        exitToDashboard();

    } catch (err) {
        alert("GAGAL MENYIMPAN: " + err.message);
        btn.innerHTML = "💾 SIMPAN REKAM MEDIS"; btn.disabled = false;
    }
}