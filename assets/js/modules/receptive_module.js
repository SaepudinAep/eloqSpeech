/* receptive_module.js - V1.3 CLINICAL REPORTING & MEMORY FIX
 * Fokus: Opsi C (Radar + Mini-Bar Report), Memory Leak Fix (Reset on Init),
 * Dual Action End-Screen (Retry/Exit), Pastel UX.
 * Rule: NO CLEANING, NO SYNTAX COLOR, FULL CODE.
 */

import { supabase } from '../config.js';

let rawData = [];
let masterCategories = [];
let appState = {}; // Akan direset total di entry point

// --- 1. MEMORY MANAGEMENT & NUKE PROTOCOL ---
function resetMemory() {
    if (appState.game?.l1Interval) clearInterval(appState.game.l1Interval);
    if (appState.audioObj) {
        appState.audioObj.pause();
        appState.audioObj.src = "";
        appState.audioObj = null;
    }
    
    // Hard Reset Memory
    appState = {
        view: 'SETUP',
        container: appState.container || null,
        config: { level: 5, categoryId: null, mode: 'TEXT', repetition: 5, distractor: 'CATEGORY' },
        game: {
            rounds: [], currentRoundIdx: 0, 
            isLocked: false, startTime: 0,
            l1Hits: 0, l1Interval: null,
            sessionLogs: []
        },
        audioObj: null
    };
    document.querySelectorAll('.rc-overlay').forEach(el => el.remove());
}

function exitToDashboard() {
    if(confirm('Akhiri sesi Reseptif dan keluar dari modul?')) {
        const c = appState.container;
        resetMemory();
        if (c) c.innerHTML = ''; // Nuke HTML
        
        if (typeof window.renderApp === 'function') window.renderApp(null);
        else if (typeof window.loadModule === 'function') window.loadModule('digital_area');
        else window.location.reload();
    }
}

// --- 2. CSS INJECTION ---
const injectStyles = () => {
    if(document.getElementById('rc-styles')) return;
    const s = document.createElement('style');
    s.id = 'rc-styles';
    s.innerHTML = `
        :root { --p: #4f46e5; --s: #10b981; --d: #ef4444; --bg: #f8fafc; --text: #1e293b; --prog: #bfdbfe; }
        * { box-sizing: border-box; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
        
        .rc-app { font-family: 'Inter', sans-serif; background: linear-gradient(135deg, #e0e7ff 0%, #fae8ff 100%); height: 100vh; width: 100vw; display: flex; flex-direction: column; overflow: hidden; position: fixed; inset: 0; }
        .rc-nav { height: 75px; background: rgba(255,255,255,0.9); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: space-between; padding: 0 clamp(10px, 3vw, 30px); border-bottom: 2px solid #e2e8f0; flex-shrink: 0; position: relative; z-index: 100; }
        .rc-body { flex: 1; overflow-y: auto; padding: clamp(15px, 3vw, 30px); display: flex; flex-direction: column; align-items: center; justify-content: flex-start; position: relative; }
        
        .setup-card { background: #fff; padding: clamp(20px, 4vw, 30px); border-radius: 20px; width: 100%; max-width: 600px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
        .report-card { background: #fff; padding: clamp(20px, 4vw, 30px); border-radius: 20px; width: 100%; max-width: 900px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
        
        .inp-grp { margin-bottom: 15px; }
        .inp-lbl { display: block; font-size: 0.8rem; font-weight: 800; color: #64748b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
        .inp-sel { width: 100%; padding: 15px; border: 2px solid #e2e8f0; border-radius: 12px; font-weight: 700; font-size: 1rem; color: var(--text); background: #f8fafc; appearance: none; outline: none; transition: 0.2s; }
        .inp-sel:focus { border-color: var(--p); }
        .inp-sel:disabled { opacity: 0.5; background: #e2e8f0; cursor: not-allowed; }
        
        .btn-main { padding: 18px; background: var(--p); color: #fff; border: none; border-radius: 14px; font-weight: 900; font-size: 1.1rem; cursor: pointer; transition: 0.2s; display:flex; justify-content:center; align-items:center; gap:10px; }
        .btn-main:active { transform: scale(0.98); }
        .btn-exit { background: #fee2e2; color: var(--d); border: none; padding: 10px 18px; border-radius: 50px; font-weight: 800; cursor: pointer; font-size: 0.9rem; }
        .btn-outline { background: #fff; color: var(--p); border: 2px solid var(--p); padding: 18px; border-radius: 14px; font-weight: 900; font-size: 1.1rem; cursor: pointer; transition: 0.2s; display:flex; justify-content:center; align-items:center; gap:10px; }

        .rc-prog-container { position: absolute; bottom: 0; left: 0; width: 100%; height: 6px; background: var(--prog); }
        .rc-prog-bar { height: 100%; background: var(--p); width: 0%; transition: width 0.3s ease; border-radius: 0 3px 3px 0; }

        /* L1 Motoric Area */
        .jump-arena { position: relative; width: 100%; height: 100%; min-height: 50vh; background: rgba(255,255,255,0.6); border-radius: 20px; border: 4px dashed rgba(79,70,229,0.3); overflow: hidden; touch-action: none; }
        .jump-target { position: absolute; width: clamp(90px, 20vw, 150px); aspect-ratio: 1; border-radius: 16px; border: 4px solid var(--p); cursor: pointer; transition: transform 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275); background: #fff; overflow: hidden; box-shadow: 0 10px 15px rgba(0,0,0,0.1); z-index: 10; }
        .jump-target img { width: 100%; height: 100%; object-fit: cover; pointer-events: none; }
        .jump-target:active { transform: scale(0.9); }
        .jump-pop { animation: popGlow 0.4s ease-out forwards; }

        /* L2-5 Cognitive Area */
        .cog-header { text-align: center; margin-bottom: clamp(15px, 3vw, 30px); width: 100%; }
        .cog-text { font-size: clamp(1.8rem, 6vw, 3.5rem); font-weight: 900; color: var(--text); text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .btn-audio { background: #fff; color: var(--p); border: 2px solid var(--p); padding: 15px 30px; border-radius: 50px; font-weight: 900; font-size: 1.2rem; cursor: pointer; display: inline-flex; align-items: center; gap: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .cog-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: clamp(15px, 4vw, 30px); width: 100%; max-width: 900px; margin: 0 auto; }
        .cog-card { width: clamp(130px, 40vw, 220px); aspect-ratio: 1; background: #fff; border-radius: 20px; border: 6px solid #e2e8f0; overflow: hidden; cursor: pointer; position: relative; box-shadow: 0 8px 20px rgba(0,0,0,0.05); opacity: 0; transform: scale(0.8) translateY(20px); animation: popInStaggered 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.2) forwards; }
        .cog-card img { width: 100%; height: 100%; object-fit: cover; pointer-events: none; }
        .cog-card.wrong { border-color: var(--d); animation: shake 0.4s; opacity: 0.4; pointer-events: none; }
        .cog-card.correct-glow { border-color: var(--s); box-shadow: 0 0 30px rgba(16,185,129,0.5); transform: scale(1.05); z-index: 10; }

        /* Report Elements */
        .rep-layout { display: flex; flex-wrap: wrap; gap: 30px; align-items: flex-start; }
        .rep-chart-zone { flex: 1; min-width: 250px; display: flex; justify-content: center; align-items: center; flex-direction: column; }
        .rep-detail-zone { flex: 1.5; min-width: 300px; display: flex; flex-direction: column; gap: 15px; }
        .m-card { background: #fff; border: 1px solid #e2e8f0; padding: 15px 20px; border-radius: 14px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .m-card span { font-size: 0.75rem; font-weight: 800; color: #64748b; letter-spacing: 0.5px; text-transform: uppercase; }
        .m-card b { font-size: 1.5rem; color: #1e293b; }
        .mini-bar-wrap { flex: 1; height: 12px; background: #e2e8f0; border-radius: 6px; margin: 0 15px; overflow: hidden; }
        .mini-bar { height: 100%; border-radius: 6px; }

        @keyframes shake { 0%, 100% {transform: translateX(0);} 25% {transform: translateX(-10px);} 75% {transform: translateX(10px);} }
        @keyframes popGlow { 0% {transform: scale(1); box-shadow:0 0 0 rgba(16,185,129,0);} 50% {transform: scale(1.2); box-shadow:0 0 40px rgba(16,185,129,0.8);} 100% {transform: scale(1); box-shadow:0 0 0 rgba(16,185,129,0);} }
        @keyframes popInStaggered { to { opacity: 1; transform: scale(1) translateY(0); } }
    `;
    document.head.appendChild(s);
};

// --- 3. AUDIO SYSTEM ---
function playSound(type, customUrl = null) {
    if(appState.audioObj) { appState.audioObj.pause(); appState.audioObj.src = ""; }
    if(customUrl) {
        appState.audioObj = new Audio(customUrl);
        appState.audioObj.play().catch(e => console.log("Audio play blocked", e));
        return;
    }
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gn = ctx.createGain();
    osc.connect(gn); gn.connect(ctx.destination);
    
    if(type === 'correct') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(523.25, ctx.currentTime); 
        osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.1);
        gn.gain.setValueAtTime(0.3, ctx.currentTime); gn.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(); osc.stop(ctx.currentTime + 0.3);
    } else if(type === 'wrong') {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, ctx.currentTime);
        gn.gain.setValueAtTime(0.2, ctx.currentTime); gn.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(); osc.stop(ctx.currentTime + 0.3);
    }
}

// --- 4. SMART SETUP LOGIC ---
function updateSmartSetup(preventCategoryReset = false) {
    const lvl = parseInt(document.getElementById('rc-lvl').value);
    const catSel = document.getElementById('rc-cat');
    const oldCatId = catSel.value;
    
    const repSel = document.getElementById('rc-rep');
    const modeSel = document.getElementById('rc-mode');
    const btn = document.getElementById('rc-start');

    const isMotoric = (lvl === 1);
    document.getElementById('grp-dist').style.display = isMotoric ? 'none' : 'block';
    
    const maxRep = isMotoric ? 10 : 5;
    let repHtml = '';
    for(let i=1; i<=maxRep; i++) repHtml += `<option value="${i}">${i} ${isMotoric ? 'Loncatan (Hits)' : 'Ronde (Trials)'}</option>`;
    const currRep = parseInt(repSel.value) || (isMotoric ? 5 : 3);
    repSel.innerHTML = repHtml; repSel.value = Math.min(currRep, maxRep);

    const validCats = masterCategories.filter(cat => {
        const catItemsCount = rawData.filter(item => item.category_id === cat.id && item.es_game_assets.some(a => a.media_type === 'IMAGE')).length;
        return catItemsCount >= lvl;
    });

    if (validCats.length === 0) {
        catSel.innerHTML = `<option value="">-- Tidak Ada Kategori Memenuhi Syarat Level ${lvl} --</option>`;
        catSel.disabled = true; btn.disabled = true; btn.style.opacity = '0.5'; modeSel.disabled = true; return;
    } else {
        catSel.disabled = false;
        catSel.innerHTML = validCats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        if (preventCategoryReset && validCats.some(c => c.id === oldCatId)) catSel.value = oldCatId;
        else catSel.selectedIndex = 0;
    }

    const newCatId = catSel.value;
    let catItems = rawData.filter(x => x.category_id === newCatId);
    let hasAudio = false;
    catItems.forEach(item => { if(item.es_game_assets?.length > 0) { if(item.es_game_assets.some(a => a.media_type === 'AUDIO')) hasAudio = true; } });

    modeSel.disabled = false;
    if(!hasAudio) { modeSel.value = 'TEXT'; modeSel.options[0].disabled = true; modeSel.options[0].text = "AUDIO (Aset Tidak Tersedia)"; } 
    else { modeSel.options[0].disabled = false; modeSel.options[0].text = "INSTRUKSI AUDIO"; }

    btn.disabled = false; btn.style.opacity = '1';
}

// --- 5. SESSION BUILDER ---
function startSession() {
    appState.config = {
        level: parseInt(document.getElementById('rc-lvl').value),
        categoryId: document.getElementById('rc-cat').value,
        mode: document.getElementById('rc-mode').value,
        repetition: parseInt(document.getElementById('rc-rep').value),
        distractor: document.getElementById('rc-dist').value
    };

    if (!appState.config.categoryId) return alert("Pilih kategori terlebih dahulu.");

    appState.game = { rounds: [], currentRoundIdx: 0, isLocked: false, sessionLogs: [], l1Hits: 0, l1Interval: null };

    const isMotoric = appState.config.level === 1;
    let pool = rawData.filter(x => x.category_id === appState.config.categoryId && x.es_game_assets.some(a => a.media_type === 'IMAGE'));
    if(appState.config.mode === 'AUDIO') pool = pool.filter(x => x.es_game_assets.some(a => a.media_type === 'AUDIO'));
    if(pool.length === 0) return alert("Data target tidak valid untuk mode ini.");

    if(isMotoric) {
        const target = pool[Math.floor(Math.random() * pool.length)];
        appState.game.rounds.push({ target: target, options: [target] });
    } else {
        for(let i=0; i<appState.config.repetition; i++) {
            const target = pool[Math.floor(Math.random() * pool.length)];
            let distractorPool = [];
            if(appState.config.distractor === 'CATEGORY') distractorPool = pool.filter(x => x.id !== target.id);
            else distractorPool = rawData.filter(x => x.id !== target.id && x.es_game_assets.some(a=>a.media_type==='IMAGE'));
            distractorPool = distractorPool.sort(() => 0.5 - Math.random()).slice(0, appState.config.level - 1);
            let options = [target, ...distractorPool].sort(() => 0.5 - Math.random());
            appState.game.rounds.push({ target: target, options: options, mistakes: 0 });
        }
    }

    appState.view = 'PLAY';
    renderRouter();
}

// --- 6. PLAY ENGINE ---
function runLevel1() {
    const area = document.getElementById('rc-play-area');
    const r = appState.game.rounds[0];
    const imgUrl = r.target.es_game_assets.find(a=>a.media_type==='IMAGE').public_url;
    
    area.innerHTML = `<div class="jump-arena" id="jump-arena"><div class="jump-target" id="jump-target" onpointerdown="window.rc_hitL1(event)"><img src="${imgUrl}"></div></div>`;

    appState.game.startTime = Date.now();
    moveJumpTarget(true);
    appState.game.l1Interval = setInterval(() => { if(!appState.game.isLocked) moveJumpTarget(); }, 3000);
}

function moveJumpTarget(initial = false) {
    const arena = document.getElementById('jump-arena');
    const target = document.getElementById('jump-target');
    if(!arena || !target) return;
    const maxX = arena.clientWidth - target.clientWidth;
    const maxY = arena.clientHeight - target.clientHeight;
    target.style.transform = `translate(${Math.max(0, Math.floor(Math.random() * maxX))}px, ${Math.max(0, Math.floor(Math.random() * maxY))}px) scale(${initial ? 1 : 1})`;
}

function handleHitL1(e) {
    if(appState.game.isLocked) return;
    appState.game.isLocked = true; e.preventDefault();
    playSound('correct');
    const target = document.getElementById('jump-target'); target.classList.add('jump-pop');
    appState.game.l1Hits++;
    appState.game.sessionLogs.push({ latency: Date.now() - appState.game.startTime, ok: true });
    document.getElementById('rc-prog-bar').style.width = ((appState.game.l1Hits / appState.config.repetition) * 100) + '%';

    setTimeout(() => {
        target.classList.remove('jump-pop');
        if(appState.game.l1Hits >= appState.config.repetition) { clearInterval(appState.game.l1Interval); appState.view = 'REPORT'; renderRouter(); } 
        else { appState.game.startTime = Date.now(); moveJumpTarget(); appState.game.isLocked = false; }
    }, 400);
}

function runLevel2_5() {
    const area = document.getElementById('rc-play-area');
    const r = appState.game.rounds[appState.game.currentRoundIdx];
    
    let headerHtml = '';
    if(appState.config.mode === 'AUDIO') {
        const audUrl = r.target.es_game_assets.find(a=>a.media_type==='AUDIO')?.public_url;
        headerHtml = `<button class="btn-audio" onclick="window.rc_playAud('${audUrl}')">🔊 DENGARKAN INSTRUKSI</button>`;
        setTimeout(() => window.rc_playAud(audUrl), 500);
    } else { headerHtml = `<div class="cog-text">CARI: ${r.target.item_name}</div>`; }

    const cardsHtml = r.options.map((opt, idx) => {
        const imgUrl = opt.es_game_assets.find(a=>a.media_type==='IMAGE').public_url;
        return `<div class="cog-card" id="card-${idx}" style="animation-delay: ${idx * 0.1}s;" onpointerdown="window.rc_eval(event, ${idx}, ${opt.id === r.target.id})"><img src="${imgUrl}"></div>`;
    }).join('');

    area.innerHTML = `<div class="cog-header">${headerHtml}</div><div class="cog-grid">${cardsHtml}</div>`;
    appState.game.startTime = Date.now();
}

function evaluateL2_5(e, idx, isTarget) {
    if(appState.game.isLocked) return;
    appState.game.isLocked = true; e.preventDefault();
    const r = appState.game.rounds[appState.game.currentRoundIdx];
    const card = document.getElementById(`card-${idx}`);

    if(isTarget) {
        playSound('correct'); card.classList.add('correct-glow');
        appState.game.sessionLogs.push({ item: r.target.item_name, ok: (r.mistakes === 0), mistakes: r.mistakes, latency: Date.now() - appState.game.startTime });
        document.getElementById('rc-prog-bar').style.width = (((appState.game.currentRoundIdx + 1) / appState.game.rounds.length) * 100) + '%';

        setTimeout(() => {
            appState.game.currentRoundIdx++; appState.game.isLocked = false;
            if(appState.game.currentRoundIdx >= appState.game.rounds.length) { appState.view = 'REPORT'; renderRouter(); } 
            else runLevel2_5();
        }, 1500);
    } else {
        playSound('wrong'); r.mistakes++; card.classList.add('wrong');
        const targetIdx = r.options.findIndex(x => x.id === r.target.id);
        const targetCard = document.getElementById(`card-${targetIdx}`);
        if(targetCard) { targetCard.style.boxShadow = '0 0 20px rgba(79,70,229,0.5)'; setTimeout(() => targetCard.style.boxShadow = 'none', 1000); }
        setTimeout(() => { appState.game.isLocked = false; }, 500);
    }
}

// --- 7. REPORT ENGINE (RADAR + MINI-BAR) ---
function generateRadarSVG(logs, isMotoric) {
    // Math logic untuk Radar
    const accuracy = isMotoric ? 100 : (logs.filter(l => l.ok).length / logs.length) * 100;
    const avgLat = logs.reduce((a,b)=>a+b.latency, 0) / logs.length;
    const speed = Math.max(0, 100 - (avgLat / (isMotoric ? 3000 : 5000) * 100)); // Cap speed score
    
    // Konsistensi (Variance waktu)
    const latVar = logs.reduce((a,b)=>a+Math.pow(b.latency - avgLat, 2),0) / logs.length;
    const consistency = Math.max(0, 100 - (Math.sqrt(latVar) / 2000 * 100));
    
    // Fokus (Makin dikit salah, makin fokus)
    const totalMistakes = isMotoric ? 0 : logs.reduce((a,b)=>a+(b.mistakes||0), 0);
    const focus = Math.max(0, 100 - (totalMistakes * 10));

    const points = [accuracy, speed, focus, consistency];
    const labels = ["AKURASI", "SPEED", "FOKUS", "STAMINA"];
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
        <svg viewBox="0 0 ${size} ${size}" style="width:100%; max-width:250px; display:block; margin:auto;">
            ${grids}
            <polygon points="${polygon}" fill="rgba(79, 70, 229, 0.25)" stroke="#4f46e5" stroke-width="3" stroke-linejoin="round" />
            ${labelsSvg}
        </svg>
    `;
}

function renderReport() {
    const logs = appState.game.sessionLogs;
    const isMotoric = appState.config.level === 1;
    if(logs.length === 0) return `<div style="padding:50px; text-align:center;">Data Kosong</div>`;

    const acc = isMotoric ? 100 : Math.round((logs.filter(l=>l.ok).length / logs.length) * 100);
    const avgLat = (logs.reduce((a,b)=>a+b.latency, 0) / logs.length / 1000).toFixed(2);
    const maxLat = Math.max(...logs.map(l=>l.latency));

    // Opsi C: Mini-Bar Chart List
    const detailRows = logs.map((l, i) => {
        const w = (l.latency / maxLat) * 100;
        const barColor = isMotoric ? 'var(--p)' : (l.ok ? 'var(--s)' : 'var(--d)');
        const lbl = isMotoric ? `Loncatan #${i+1}` : l.item;
        const errLbl = isMotoric ? '' : (l.ok ? 'MANDIRI' : `${l.mistakes}x SALAH`);
        
        return `
            <div style="margin-bottom:12px;">
                <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:800; margin-bottom:4px; color:#64748b;">
                    <span>${lbl}</span> <span style="color:${barColor}">${errLbl}</span>
                </div>
                <div style="display:flex; align-items:center;">
                    <div style="width:35px; font-weight:900; font-size:0.85rem; color:#1e293b; text-align:right;">${(l.latency/1000).toFixed(1)}s</div>
                    <div class="mini-bar-wrap"><div class="mini-bar" style="width:${w}%; background:${barColor};"></div></div>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="rc-nav"><b style="font-size:1.1rem; color:var(--text);">📊 PROFIL KLINIS RESEPTIF</b></div>
        <div class="rc-body" style="justify-content:center;">
            <div class="report-card">
                <div class="rep-layout">
                    <div class="rep-chart-zone">
                        ${generateRadarSVG(logs, isMotoric)}
                        <div style="margin-top:20px; width:100%;">
                            <div class="m-card" style="margin-bottom:10px;"><span>AKURASI</span><b style="color:${acc >= 80 ? 'var(--s)' : 'var(--d)'}">${acc}%</b></div>
                            <div class="m-card"><span>RATA-RATA RESPON</span><b>${avgLat}s</b></div>
                        </div>
                    </div>
                    
                    <div class="rep-detail-zone">
                        <div style="font-weight:900; font-size:1.1rem; color:var(--text); border-bottom:2px solid #f1f5f9; padding-bottom:10px;">ANALISIS RESPON per TARGET</div>
                        <div style="max-height:280px; overflow-y:auto; padding-right:10px;">${detailRows}</div>
                    </div>
                </div>
                
                <div style="margin-top:30px; display:flex; gap:15px; border-top:2px solid #f1f5f9; padding-top:20px;">
                    <button class="btn-outline" style="flex:1;" onclick="window.rc_retry()">🔄 ULANGI SESI INI</button>
                    <button class="btn-main" style="flex:1; background:#1e293b;" onclick="window.rc_exit()">✖ SELESAI & KELUAR</button>
                </div>
            </div>
        </div>
    `;
}

// --- 8. VIEW ROUTER ---
function renderRouter() {
    if(!appState.container) return;
    const root = appState.container;

    if(appState.view === 'SETUP') {
        root.innerHTML = `
            <div class="rc-app">
                <div class="rc-nav"><b style="font-size:1.1rem; color:var(--text);">🧠 Setup Reseptif (Pemahaman)</b></div>
                <div class="rc-body">
                    <div class="setup-card">
                        <div class="inp-grp"><label class="inp-lbl">LEVEL KESULITAN</label><select id="rc-lvl" class="inp-sel" onchange="window.rc_smartSetup(true)"><option value="1">LEVEL 1 (1 Gambar Loncat - Motorik)</option><option value="2">LEVEL 2 (1 Benar, 1 Salah)</option><option value="3">LEVEL 3 (1 Benar, 2 Salah)</option><option value="4">LEVEL 4 (1 Benar, 3 Salah)</option><option value="5" selected>LEVEL 5 (1 Benar, 4 Salah - Maksimal)</option></select></div>
                        <div class="inp-grp"><label class="inp-lbl">KATEGORI (Auto-Filter Level)</label><select id="rc-cat" class="inp-sel" onchange="window.rc_checkAudio()"></select></div>
                        <div class="inp-grp"><label class="inp-lbl">MODE INSTRUKSI (Auto-Check Audio)</label><select id="rc-mode" class="inp-sel"><option value="AUDIO">INSTRUKSI AUDIO</option><option value="TEXT">TEKS VISUAL</option></select></div>
                        <div class="inp-grp" id="grp-dist"><label class="inp-lbl">TINGKAT PENGECOH (DISTRACTOR)</label><select id="rc-dist" class="inp-sel"><option value="CATEGORY">SULIT: Pengecoh 1 Kategori (Sejenis)</option><option value="RANDOM">MUDAH: Pengecoh Acak Beda Kategori</option></select></div>
                        <div class="inp-grp"><label class="inp-lbl">REPETISI / INTENSITAS</label><select id="rc-rep" class="inp-sel"></select></div>
                        <button id="rc-start" class="btn-main" onclick="window.rc_start()">MULAI SESI TERAPI</button>
                    </div>
                </div>
            </div>
        `;
        setTimeout(() => updateSmartSetup(false), 50);
    } else if(appState.view === 'PLAY') {
        const isMotoric = appState.config.level === 1;
        const total = isMotoric ? appState.config.repetition : appState.game.rounds.length;
        const curr = isMotoric ? appState.game.l1Hits + 1 : appState.game.currentRoundIdx + 1;
        const initProg = isMotoric ? (appState.game.l1Hits / total * 100) : (appState.game.currentRoundIdx / total * 100);
        
        root.innerHTML = `
            <div class="rc-app">
                <div class="rc-nav">
                    <span style="font-weight:900; color:#64748b; font-size:1.1rem;">${appState.config.level==1 ? 'MOTORIK' : 'KOGNITIF'}</span>
                    <button class="btn-exit" onclick="window.rc_exit()">✖ KELUAR</button>
                    <div class="rc-prog-container"><div class="rc-prog-bar" id="rc-prog-bar" style="width:${initProg}%;"></div></div>
                </div>
                <div class="rc-body" id="rc-play-area"></div>
            </div>
        `;
        if(isMotoric) runLevel1(); else runLevel2_5();
    } else {
        root.innerHTML = `<div class="rc-app">${renderReport()}</div>`;
    }
}

// --- 9. ENTRY POINT ---
export async function renderReceptiveModule(containerId) {
    // 1. HARD RESET MEMORY FIRST
    resetMemory();
    
    appState.container = document.getElementById(containerId);
    if(!appState.container) return;
    
    injectStyles();
    appState.container.innerHTML = `<div id="rc-app-root" class="rc-app"><div style="margin:auto; font-weight:900; color:#4f46e5; font-size:1.2rem;">Memuat Mesin Reseptif V1.3...</div></div>`;

    window.rc_smartSetup = updateSmartSetup;
    window.rc_checkAudio = () => updateSmartSetup(true);
    window.rc_start = startSession;
    window.rc_exit = exitToDashboard;
    window.rc_retry = () => { resetMemory(); renderRouter(); }; // New Retry Function
    window.rc_hitL1 = handleHitL1;
    window.rc_eval = evaluateL2_5;
    window.rc_playAud = (url) => playSound(null, url);

    try {
        const { data: cat } = await supabase.from('es_game_categories').select('id, name').order('name');
        masterCategories = cat || [];
        const { data: itm } = await supabase.from('es_game_items').select('id, item_name, category_id, es_game_assets(public_url, media_type)').eq('is_published', true);
        rawData = itm || [];
        
        renderRouter();
    } catch(e) {
        appState.container.innerHTML = `<div style="padding:20px; color:red; font-weight:bold;">Gagal Koneksi Database: ${e.message}</div>`;
    }
}