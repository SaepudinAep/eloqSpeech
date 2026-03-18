// [ COPY BUTTON - ELOQ DASHBOARD MODULE V6 (HOLISTIC OVERALL & AUTO-DETECT) ]
// Fitur Baru: Auto-Load Active Patient, Default View 'OVERALL', 
// Radar Chart Domain Klinis, Diet Terapi, Tren Kemandirian Global.

import { supabase } from '../config.js';

let DashboardState = {
    allPatients: [],
    selectedPatients: [],
    uniqueInstitutions: new Map(),
    patientLogs: {}, 
    selectedModule: {} 
};

// Domain Mapping untuk Radar Chart
const DOMAIN_MAP = {
    'touch_engine': 'Motorik',
    'receptive_engine': 'Kognitif',
    'puzzle_engine': 'Kognitif',
    'visual_matching_engine': 'Kognitif',
    'memory_card_engine': 'Memori',
    'sequence_engine': 'Memori',
    'naming_practice': 'Bahasa',
    'vowel_space_engine': 'Bahasa',
    'acoustic_mpt_engine': 'Bahasa',
    'spelling_engine': 'Bahasa'
};

function getDomainCategory(moduleCode) {
    if(!moduleCode) return 'Kognitif';
    if(DOMAIN_MAP[moduleCode]) return DOMAIN_MAP[moduleCode];
    if(moduleCode.includes('card') || moduleCode.includes('sequence')) return 'Memori';
    if(moduleCode.includes('puzzle') || moduleCode.includes('match') || moduleCode.includes('receptive')) return 'Kognitif';
    if(moduleCode.includes('touch')) return 'Motorik';
    return 'Bahasa';
}

export function renderDashboard(containerId, activePatient) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!document.getElementById('eloq-dash-css')) {
        const s = document.createElement('style');
        s.id = 'eloq-dash-css';
        s.innerHTML = `
            .dash-wrapper { display: flex; height: 85vh; min-height: 600px; background: white; border-radius: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; overflow: hidden; position: relative; font-family: 'Inter', sans-serif; }
            .dash-sidebar { width: 340px; background: #f8fafc; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); flex-shrink: 0; }
            .dash-sidebar.collapsed { width: 0; border-right: none; opacity: 0; overflow: hidden; }
            .dash-main { flex-grow: 1; display: flex; flex-direction: column; background: white; transition: all 0.3s ease; min-width: 0; }
            .panel-header { padding: 15px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: white; flex-shrink: 0; }
            
            .btn-icon { width: 36px; height: 36px; border-radius: 10px; border: 1px solid #e2e8f0; background: white; color: #4d97ff; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; transition: 0.2s; flex-shrink: 0; }
            .btn-icon:hover { background: #eff6ff; border-color: #bfdbfe; color: #1e40af; }
            
            .panel-content { padding: 20px; overflow-y: auto; flex-grow: 1; background: #f1f5f9; }
            
            /* Form Filter */
            .dash-filter-box { padding: 15px 20px; border-bottom: 1px solid #e2e8f0; background: white; flex-shrink: 0; }
            .dash-input { width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid #cbd5e1; font-weight: 600; color: #1e293b; margin-bottom: 8px; outline: none; font-size: 12px; background: #f8fafc; transition: 0.2s; }
            .dash-input:focus { border-color: #4d97ff; background: white; }
            
            /* Checkbox Item Style */
            .chk-item { padding: 12px 14px; background: white; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 8px; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: 0.2s; }
            .chk-item:hover { border-color: #bfdbfe; background: #eff6ff; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
            .chk-item input { width: 18px; height: 18px; cursor: pointer; accent-color: #4d97ff; flex-shrink: 0; }
            
            .gender-badge { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 14px; flex-shrink: 0; }
            .gender-l { background: #eff6ff; color: #3b82f6; border: 1px solid #bfdbfe; }
            .gender-p { background: #fdf2f8; color: #ec4899; border: 1px solid #fbcfe8; }
            
            /* Detail View Specifics */
            .detail-header { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }
            .stat-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 20px; }
            .stat-box { background: white; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center; }
            .stat-val { font-size: 1.5rem; font-weight: 900; color: #1e293b; margin-bottom: 4px; }
            .stat-lbl { font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; }
            
            .log-table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
            .log-table th { background: #f8fafc; padding: 12px 15px; text-align: left; font-size: 0.8rem; font-weight: 800; color: #475569; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; }
            .log-table td { padding: 15px; border-bottom: 1px solid #f1f5f9; font-size: 0.9rem; color: #1e293b; vertical-align: top; }
            .log-table tr:last-child td { border-bottom: none; }
            .log-table tr:hover { background: #f8fafc; }

            .chart-legend { display: flex; gap: 15px; font-size: 11px; font-weight: 700; color: #64748b; justify-content: center; margin-bottom: 15px; }
            .legend-item { display: flex; align-items: center; gap: 6px; }
            .legend-color { width: 12px; height: 12px; border-radius: 3px; }

            .btn-activate { padding: 12px 25px; border: none; border-radius: 10px; background: #3b82f6; color: white; font-weight: 800; font-size: 13px; cursor: pointer; transition: 0.2s; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3); }
            .btn-activate:hover { background: #2563eb; transform: translateY(-2px); }

            /* Diet Chart (Horizontal Bars) */
            .diet-row { display: flex; align-items: center; margin-bottom: 10px; font-size: 0.85rem; }
            .diet-label { width: 140px; font-weight: 800; color: #475569; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-transform: uppercase; }
            .diet-bar-wrap { flex: 1; height: 18px; background: #f1f5f9; border-radius: 4px; overflow: hidden; margin: 0 10px; position: relative; }
            .diet-bar { height: 100%; border-radius: 4px; background: #3b82f6; }
            .diet-val { width: 40px; text-align: right; font-weight: 900; color: #1e293b; }

            .grid-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
            .ov-card { background: white; padding: 20px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }
            .ov-title { font-weight: 800; font-size: 1rem; color: #1e293b; margin-bottom: 15px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; }

            @media (max-width: 900px) {
                .dash-sidebar { position: absolute; left: -340px; top: 0; bottom: 0; z-index: 10; box-shadow: 4px 0 15px rgba(0,0,0,0.1); }
                .dash-sidebar.mobile-open { left: 0; opacity: 1; }
                .grid-2col { grid-template-columns: 1fr; }
            }
            @media (max-width: 480px) {
                .dash-sidebar.mobile-open { width: 100%; }
            }
        `;
        document.head.appendChild(s);
    }

    DashboardState.selectedPatients = [];

    const iconClose = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    const iconMenu = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`;
    const iconList = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>`;
    const iconChart = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>`;
    const iconOverview = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>`;
    
    container.innerHTML = `
        <div class="dash-wrapper">
            <div id="dash-panel-left" class="dash-sidebar">
                <div class="panel-header" style="background: #f8fafc;">
                    <div style="display:flex; align-items:center; gap:8px; font-weight: 800; color: #1e293b; font-size: 14px;">
                        ${iconList} DAFTAR PASIEN
                    </div>
                    <button class="btn-icon" id="btn-close-sidebar" title="Tutup Sidebar" style="color: #64748b; border: none; background: transparent;">${iconClose}</button>
                </div>
                
                <div class="dash-filter-box" id="dash-filter-container" style="display:none;">
                    <select id="dash-inst-filter" class="dash-input" onchange="window.DashHandler.filterList()"></select>
                    <input type="text" id="dash-search-input" class="dash-input" placeholder="Cari nama pasien..." onkeyup="window.DashHandler.filterList()" style="margin-bottom:0;">
                </div>

                <div class="panel-content" id="sidebar-list-container" style="padding-top:10px; background: #f8fafc;">
                    <div style="text-align:center; padding:20px; color:#4d97ff; font-weight:bold; font-size:12px;">Menarik data...</div>
                </div>
            </div>

            <div class="dash-main">
                <div class="panel-header">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <button class="btn-icon" id="btn-toggle-sidebar" title="Buka/Tutup Daftar Pasien">${iconMenu}</button>
                        <div style="display:flex; align-items:center; gap:8px; font-weight: 800; color: #1e293b; font-size: 16px;">
                            ${iconChart} REKAM MEDIS & ANALITIK
                        </div>
                    </div>
                </div>
                <div class="panel-content" id="main-canvas-container">
                    <div style="height:100%; display:flex; justify-content:center; align-items:center;">
                        <div style="text-align: center; color: #94a3b8;">
                            <div style="margin-bottom: 15px; display:flex; justify-content:center;">${iconOverview}</div>
                            <div style="font-weight: 800; font-size: 14px;">Memuat Data Terapis...</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    const sidebar = document.getElementById('dash-panel-left');
    document.getElementById('btn-toggle-sidebar').addEventListener('click', () => {
        window.innerWidth <= 900 ? sidebar.classList.toggle('mobile-open') : sidebar.classList.toggle('collapsed');
    });
    document.getElementById('btn-close-sidebar').addEventListener('click', () => {
        window.innerWidth <= 900 ? sidebar.classList.remove('mobile-open') : sidebar.classList.add('collapsed');
    });

    loadPatientsFromDB();
}

async function loadPatientsFromDB() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: list, error } = await supabase
            .from('es_therapist_patients')
            .select('patient_id, es_institutions(id, name), es_patients(full_name, birth_year, gender)')
            .eq('therapist_id', session.user.id)
            .eq('status', 'active');

        if (error) throw error;
        
        DashboardState.allPatients = list || [];
        
        DashboardState.uniqueInstitutions.clear();
        DashboardState.allPatients.forEach(item => {
            if (item.es_institutions) {
                DashboardState.uniqueInstitutions.set(item.es_institutions.id, item.es_institutions.name);
            }
        });

        const filterEl = document.getElementById('dash-inst-filter');
        let optionsHtml = `<option value="ALL">Semua Institusi / Lokasi</option>`;
        DashboardState.uniqueInstitutions.forEach((name, id) => {
            optionsHtml += `<option value="${id}">${name}</option>`;
        });
        filterEl.innerHTML = optionsHtml;
        document.getElementById('dash-filter-container').style.display = 'block';

        window.DashHandler.filterList();

        // --- V6 AUTO-DETECT ACTIVE PATIENT ---
        const rawActive = localStorage.getItem('eloq_active_patient');
        if (rawActive) {
            const activePat = JSON.parse(rawActive);
            const foundInList = DashboardState.allPatients.find(p => p.patient_id === activePat.id);
            if (foundInList) {
                DashboardState.selectedPatients = [{
                    id: foundInList.patient_id,
                    name: foundInList.es_patients.full_name,
                    gender: foundInList.es_patients.gender,
                    instName: foundInList.es_institutions?.name || '-'
                }];
                // Default to OVERALL
                DashboardState.selectedModule[foundInList.patient_id] = 'OVERALL';
                renderCanvas(); 
                await fetchPatientLogs(foundInList.patient_id); 
                renderCanvas(); 
                return; // Stop here, Auto-detect handled it
            }
        }

        renderCanvas(); 
    } catch (err) {
        document.getElementById('sidebar-list-container').innerHTML = `<div style="color:red; font-size:12px; text-align:center;">Gagal memuat data: ${err.message}</div>`;
    }
}

function renderSidebarList(filteredData) {
    const container = document.getElementById('sidebar-list-container');
    const dataToRender = filteredData || DashboardState.allPatients;

    if (dataToRender.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:20px; color:#64748b; font-size:12px;">Tidak ada pasien ditemukan.</div>`;
        return;
    }

    const iconInst = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px; vertical-align:middle;"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg>`;

    let html = ``;
    html += dataToRender.map(item => {
        const p = item.es_patients;
        const iName = item.es_institutions?.name || '-';
        const isChecked = DashboardState.selectedPatients.some(pt => pt.id === item.patient_id) ? 'checked' : '';
        
        const isMale = (p.gender === 'L' || p.gender === 'Laki-laki');
        const badgeClass = isMale ? 'gender-l' : 'gender-p';
        const initial = p.full_name ? p.full_name.charAt(0).toUpperCase() : '?';

        return `
            <label class="chk-item">
                <input type="checkbox" value="${item.patient_id}" onchange="window.DashHandler.togglePatient(this, '${item.patient_id}')" ${isChecked}>
                <div class="gender-badge ${badgeClass}">${initial}</div>
                <div style="flex-grow: 1; min-width: 0;">
                    <div style="font-weight: 800; color: #1e293b; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.full_name}</div>
                    <div style="font-size: 10px; color: #64748b; font-weight: 600; margin-top: 2px;">${iconInst} ${iName}</div>
                </div>
            </label>
        `;
    }).join('');

    container.innerHTML = html;
}

async function fetchPatientLogs(patientId) {
    if (DashboardState.patientLogs[patientId]) return; 

    try {
        const { data, error } = await supabase
            .from('es_game_logs')
            .select('*')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: true }); 

        if (error) throw error;
        DashboardState.patientLogs[patientId] = data || [];
    } catch (err) {
        console.error("Gagal menarik log pasien:", err);
        DashboardState.patientLogs[patientId] = [];
    }
}

// --- GENERATOR OVERALL (HOLISTIC) ---
function buildOverallRadarChart(logs) {
    const domainScores = { 'Motorik': {sum:0, count:0}, 'Kognitif': {sum:0, count:0}, 'Memori': {sum:0, count:0}, 'Bahasa': {sum:0, count:0} };
    
    logs.forEach(l => {
        const d = getDomainCategory(l.session_metadata?.module_code);
        const acc = l.precision_offset_rel !== undefined ? l.precision_offset_rel : (l.session_metadata?.accuracy_pct || 0);
        domainScores[d].sum += acc;
        domainScores[d].count++;
    });

    const getAvg = (d) => domainScores[d].count > 0 ? (domainScores[d].sum / domainScores[d].count) : 0;
    
    const points = [getAvg('Motorik'), getAvg('Kognitif'), getAvg('Memori'), getAvg('Bahasa')];
    const labels = ["MOTORIK", "KOGNITIF", "MEMORI", "BAHASA"];
    
    const size = 200; const center = size / 2; const radius = size * 0.35;

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
        return `<text x="${p.x}" y="${p.y}" font-size="10" font-weight="800" text-anchor="middle" fill="#475569">${l}</text>`;
    }).join('');

    return `
        <svg viewBox="0 0 ${size} ${size}" width="100%" height="200" style="display:block; margin:auto;">
            ${grids}
            <polygon points="${polygon}" fill="rgba(16, 185, 129, 0.2)" stroke="#10b981" stroke-width="3" stroke-linejoin="round" />
            ${labelsSvg}
            ${points.map((v, i) => { const p = getCoords(v, i); return `<circle cx="${p.x}" cy="${p.y}" r="4" fill="#10b981" stroke="#fff" stroke-width="1.5"/>`; }).join('')}
        </svg>
    `;
}

function buildOverallPromptTrend(logs) {
    const w = 1000; const h = 180; const padX = 40; const padY = 30;
    const effW = w - (padX * 2); const effH = h - (padY * 2);

    if (logs.length < 2) return `<div style="text-align:center; padding:30px; color:#94a3b8; font-size:12px;">Data tidak cukup untuk melihat tren kemandirian.</div>`;

    const stepX = effW / (logs.length - 1);
    let pts = [];
    
    logs.forEach((log, i) => {
        const x = padX + (i * stepX);
        // Prompt Level: 0 = Mandiri (100% tinggi), 1 = Verbal (50% tengah), 2 = Fisik (0% bawah)
        let pr = log.prompt_level || 0;
        let score = (2 - pr) / 2; // 0->1, 1->0.5, 2->0
        let y = (h - padY) - (score * effH);
        pts.push(`${x},${y}`);
    });

    return `
        <svg viewBox="0 0 ${w} ${h}" width="100%" height="100%" preserveAspectRatio="none" style="overflow:visible;">
            <line x1="${padX}" y1="${padY}" x2="${w-padX}" y2="${padY}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="4" />
            <line x1="${padX}" y1="${h/2}" x2="${w-padX}" y2="${h/2}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="4" />
            <line x1="${padX}" y1="${h-padY}" x2="${w-padX}" y2="${h-padY}" stroke="#cbd5e1" stroke-width="2" />
            <text x="10" y="${padY+4}" font-size="10" font-weight="bold" fill="#64748b">Mandiri</text>
            <text x="10" y="${h-padY+4}" font-size="10" font-weight="bold" fill="#ef4444">Fisik</text>
            
            <polyline points="${pts.join(' ')}" fill="none" stroke="#3b82f6" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
            ${pts.map(p => `<circle cx="${p.split(',')[0]}" cy="${p.split(',')[1]}" r="4" fill="#fff" stroke="#3b82f6" stroke-width="2"/>`).join('')}
        </svg>
    `;
}

function buildDietChart(logs) {
    if(logs.length === 0) return '';
    let counts = {};
    logs.forEach(l => {
        let code = l.session_metadata?.module_code || 'Lainnya';
        code = code.replace(/_/g, ' ');
        counts[code] = (counts[code] || 0) + 1;
    });

    const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]);
    const maxCount = sorted[0][1];

    return sorted.map(([name, count]) => {
        const w = (count / maxCount) * 100;
        return `
            <div class="diet-row">
                <div class="diet-label" title="${name}">${name}</div>
                <div class="diet-bar-wrap"><div class="diet-bar" style="width:${w}%;"></div></div>
                <div class="diet-val">${count}x</div>
            </div>
        `;
    }).join('');
}

// --- MODUL SPECIFIC SVG ---
function buildSVGChart(logs, isLarge = false) {
    const w = 1000; 
    const h = isLarge ? 300 : 150;
    const padX = 30;
    const padY = 40;
    const effW = w - (padX * 2);
    const effH = h - (padY * 2);

    if (!logs || logs.length === 0) {
        return `<div style="width:100%; height:${h}px; display:flex; align-items:center; justify-content:center; color:#94a3b8; font-size:12px; font-weight:600; background:white; border-radius:12px; border:1px dashed #cbd5e1;">Belum ada data rekaman modul ini.</div>`;
    }

    const numPoints = Math.max(logs.length, 2);
    const stepX = effW / (numPoints - 1);
    let maxLatency = Math.max(...logs.map(l => (l.cognitive_latency_ms || 0) / 1000), 10); 

    let ptsAcc = [], ptsTime = [], ptsPrompt = [];
    let textLabels = '';
    
    logs.forEach((log, i) => {
        const x = padX + (i * stepX);
        let acc = log.precision_offset_rel !== undefined ? log.precision_offset_rel : (log.session_metadata?.accuracy_pct || 0);
        let yAcc = (h - padY) - ((acc / 100) * effH);
        ptsAcc.push(`${x},${yAcc}`);

        let sec = (log.cognitive_latency_ms || 0) / 1000;
        let yTime = (h - padY) - ((sec / maxLatency) * effH);
        ptsTime.push(`${x},${yTime}`);

        let pr = log.prompt_level || 0;
        let yPrompt = (h - padY) - ((pr / 2) * effH);
        ptsPrompt.push(`${x},${yPrompt}`);

        if (isLarge && (i === 0 || i === logs.length - 1 || i === Math.floor(logs.length / 2))) {
            const dateStr = new Date(log.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
            textLabels += `<text x="${x}" y="${h - 10}" font-size="12" fill="#64748b" text-anchor="middle" font-weight="bold">${dateStr}</text>`;
        }
    });

    return `
        <svg viewBox="0 0 ${w} ${h}" width="100%" height="100%" preserveAspectRatio="none" style="background:white; border-radius:12px; border:1px solid #e2e8f0; overflow:visible; display:block;">
            <line x1="${padX}" y1="${padY}" x2="${w-padX}" y2="${padY}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="4" />
            <line x1="${padX}" y1="${h/2}" x2="${w-padX}" y2="${h/2}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="4" />
            <line x1="${padX}" y1="${h-padY}" x2="${w-padX}" y2="${h-padY}" stroke="#cbd5e1" stroke-width="2" />
            
            <polyline points="${ptsPrompt.join(' ')}" fill="none" stroke="#a855f7" stroke-width="3" stroke-dasharray="8 4" opacity="0.6"/>
            <polyline points="${ptsTime.join(' ')}" fill="none" stroke="#ef4444" stroke-width="3" opacity="0.8"/>
            <polyline points="${ptsAcc.join(' ')}" fill="none" stroke="#10b981" stroke-width="4" />
            
            ${ptsAcc.map((p, i) => `<circle cx="${p.split(',')[0]}" cy="${p.split(',')[1]}" r="${isLarge?5:3}" fill="#10b981" stroke="#fff" stroke-width="2"/>`).join('')}
            ${textLabels}
        </svg>
    `;
}

// --- RENDER ROUTER ---
function renderCanvas() {
    const selected = DashboardState.selectedPatients;
    if (selected.length === 0) {
        renderEmptyState();
    } else if (selected.length === 1) {
        renderDetailedView(selected[0]);
    }
}

function renderEmptyState() {
    const container = document.getElementById('main-canvas-container');
    const iconOverview = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>`;
    
    container.innerHTML = `
        <div style="height:100%; display:flex; justify-content:center; align-items:center;">
            <div style="text-align: center; color: #94a3b8;">
                <div style="margin-bottom: 15px; display:flex; justify-content:center;">${iconOverview}</div>
                <div style="font-weight: 800; font-size: 16px; color:#1e293b;">Total Caseload Anda: <span style="color:#4d97ff;">${DashboardState.allPatients.length} Pasien</span></div>
                <div style="font-size: 12px; margin-top: 8px;">Pilih pasien di panel kiri untuk membuka evaluasi klinis.</div>
            </div>
        </div>
    `;
}

// --- MASTER-DETAIL VIEW (Single Patient Focus) ---
function renderDetailedView(patient) {
    const container = document.getElementById('main-canvas-container');
    const logs = DashboardState.patientLogs[patient.id] || [];
    
    if (logs.length === 0) {
        container.innerHTML = `<div style="padding:40px; text-align:center; font-weight:bold; color:#64748b;">Menganalisa Data Rekam Medis...</div>`;
        return;
    }

    const playedModules = [...new Set(logs.map(l => l.session_metadata?.module_code).filter(Boolean))];
    
    // V6 Auto Set to OVERALL
    if (!DashboardState.selectedModule[patient.id]) {
        DashboardState.selectedModule[patient.id] = 'OVERALL';
    }
    
    const currentMod = DashboardState.selectedModule[patient.id];
    let moduleOptions = `<option value="OVERALL" ${currentMod === 'OVERALL' ? 'selected' : ''}>🌟 OVERALL / RINGKASAN HOLISTIK</option>`;
    moduleOptions += playedModules.map(m => `<option value="${m}" ${m === currentMod ? 'selected' : ''}>📊 Analisis Modul: ${m.replace(/_/g, ' ').toUpperCase()}</option>`).join('');

    const headerHtml = `
        <div style="max-width: 1000px; margin: 0 auto; padding-bottom: 40px;">
            <div class="detail-header">
                <div style="display:flex; align-items:center; gap:15px;">
                    <div class="gender-badge ${patient.gender.startsWith('L') ? 'gender-l' : 'gender-p'}" style="width:55px; height:55px; font-size:22px;">${patient.name.charAt(0).toUpperCase()}</div>
                    <div>
                        <div style="font-size:1.3rem; font-weight:900; color:#1e293b; margin-bottom:4px;">${patient.name}</div>
                        <div style="font-size:0.85rem; font-weight:700; color:#64748b;">${patient.instName}</div>
                    </div>
                </div>
                <button class="btn-activate" onclick="window.UI_Handler.setPatient('${patient.id}', '${patient.name.replace(/'/g, "\\'")}', '${patient.instName.replace(/'/g, "\\'")}')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> TETAPKAN PASIEN AKTIF UNTUK TERAPI
                </button>
            </div>

            <select class="dash-input" style="font-size:1rem; padding:15px; margin-bottom:20px; border-color:#cbd5e1; box-shadow: 0 2px 4px rgba(0,0,0,0.02);" onchange="window.DashHandler.changeModule('${patient.id}', this.value)">
                ${moduleOptions}
            </select>
    `;

    if (currentMod === 'OVERALL') {
        // --- RENDER OVERALL VIEW ---
        container.innerHTML = headerHtml + `
            <div class="stat-row">
                <div class="stat-box"><div class="stat-val" style="color:#3b82f6;">${logs.length}</div><div class="stat-lbl">Total Sesi Keseluruhan</div></div>
                <div class="stat-box"><div class="stat-val" style="color:#10b981;">${playedModules.length}</div><div class="stat-lbl">Modul Dimainkan</div></div>
            </div>
            
            <div class="grid-2col">
                <div class="ov-card">
                    <div class="ov-title">Radar Pemetaan Domain Klinis</div>
                    ${buildOverallRadarChart(logs)}
                </div>
                <div class="ov-card">
                    <div class="ov-title">Distribusi Diet Terapi</div>
                    <div style="max-height:200px; overflow-y:auto; padding-right:10px;">
                        ${buildDietChart(logs)}
                    </div>
                </div>
            </div>

            <div class="ov-card">
                <div class="ov-title">Tren Kemandirian Global (Semua Modul)</div>
                <div style="height:180px;">
                    ${buildOverallPromptTrend(logs)}
                </div>
                <div style="text-align:center; font-size:11px; color:#64748b; margin-top:10px;">Grafik menunjukkan pergerakan dari Bantuan Fisik menuju Kemandirian penuh seiring waktu.</div>
            </div>
        </div>`;
    } else {
        // --- RENDER SPECIFIC MODULE VIEW ---
        const filteredLogs = logs.filter(l => l.session_metadata?.module_code === currentMod);
        let avgAcc = 0, avgLat = 0, totalErrors = 0;
        if (filteredLogs.length > 0) {
            avgAcc = filteredLogs.reduce((sum, l) => sum + (l.precision_offset_rel ?? (l.session_metadata?.accuracy_pct || 0)), 0) / filteredLogs.length;
            avgLat = filteredLogs.reduce((sum, l) => sum + (l.cognitive_latency_ms || 0), 0) / filteredLogs.length / 1000;
            totalErrors = filteredLogs.reduce((sum, l) => sum + (l.jitter_index || 0), 0);
        }

        const tableRows = filteredLogs.slice().reverse().map((l, i) => {
            const dateStr = new Date(l.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            const acc = l.precision_offset_rel ?? (l.session_metadata?.accuracy_pct || 0);
            const sec = ((l.cognitive_latency_ms || 0) / 1000).toFixed(1);
            const promptTxt = l.prompt_level === 0 ? 'Mandiri' : (l.prompt_level === 1 ? 'Verbal/Visual' : 'Fisik');
            const notes = l.session_metadata?.therapist_notes || '<i style="color:#cbd5e1;">Tidak ada catatan</i>';
            return `<tr><td style="font-weight:700; width:130px;">${dateStr}</td><td style="color:${acc >= 80 ? '#10b981' : '#ef4444'}; font-weight:800;">${acc.toFixed(0)}%</td><td>${sec}s</td><td><span style="background:#f1f5f9; padding:4px 8px; border-radius:6px; font-size:0.8rem; font-weight:700;">${promptTxt}</span></td><td style="font-size:0.85rem; line-height:1.4;">${notes}</td></tr>`;
        }).join('');

        container.innerHTML = headerHtml + `
                <div class="stat-row">
                    <div class="stat-box"><div class="stat-val" style="color:#3b82f6;">${filteredLogs.length}</div><div class="stat-lbl">Total Sesi Modul Ini</div></div>
                    <div class="stat-box"><div class="stat-val" style="color:${avgAcc >= 80 ? '#10b981' : '#ef4444'};">${avgAcc.toFixed(1)}%</div><div class="stat-lbl">Rata-rata Akurasi</div></div>
                    <div class="stat-box"><div class="stat-val">${avgLat.toFixed(1)}s</div><div class="stat-lbl">Rata-rata Respon</div></div>
                    <div class="stat-box"><div class="stat-val" style="color:#f59e0b;">${totalErrors}</div><div class="stat-lbl">Total Kesalahan (Jitter)</div></div>
                </div>

                <div style="background:white; padding:20px; border-radius:16px; border:1px solid #e2e8f0; margin-bottom:25px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);">
                    <div style="font-weight:800; font-size:1rem; color:#1e293b; margin-bottom:15px;">Kurva Pembelajaran Spesifik (Learning Curve)</div>
                    <div class="chart-legend">
                        <div class="legend-item"><div class="legend-color" style="background:#10b981;"></div>Akurasi (%)</div>
                        <div class="legend-item"><div class="legend-color" style="background:#ef4444;"></div>Waktu Respons</div>
                        <div class="legend-item"><div class="legend-color" style="background:#a855f7;"></div>Bantuan (Prompt)</div>
                    </div>
                    <div style="height:250px;">${buildSVGChart(filteredLogs, true)}</div>
                </div>

                <div style="font-weight:800; font-size:1.1rem; color:#1e293b; margin-bottom:15px;">Riwayat Catatan Klinis (S.O.A.P)</div>
                <div style="overflow-x:auto;">
                    <table class="log-table">
                        <thead><tr><th>Waktu Sesi</th><th>Akurasi</th><th>Waktu</th><th>Bantuan</th><th>Catatan Observasi</th></tr></thead>
                        <tbody>${tableRows || `<tr><td colspan="5" style="text-align:center; padding:30px; color:#94a3b8; font-weight:600;">Belum ada log klinis tersimpan.</td></tr>`}</tbody>
                    </table>
                </div>
            </div>
        `;
    }
}

window.DashHandler = {
    togglePatient: async (checkboxEl, patientId) => {
        if (checkboxEl.checked) {
            document.querySelectorAll('.chk-item input').forEach(chk => { if (chk !== checkboxEl) chk.checked = false; });
            const rawData = DashboardState.allPatients.find(p => p.patient_id === patientId);
            if (rawData) {
                DashboardState.selectedPatients = [{
                    id: rawData.patient_id, name: rawData.es_patients.full_name,
                    gender: rawData.es_patients.gender, instName: rawData.es_institutions?.name || '-'
                }];
                if (!DashboardState.selectedModule[patientId]) DashboardState.selectedModule[patientId] = 'OVERALL';
                renderCanvas(); 
                await fetchPatientLogs(patientId); 
                renderCanvas(); 
            }
        } else {
            DashboardState.selectedPatients = [];
            renderCanvas();
        }
    },
    changeModule: (patientId, moduleCode) => {
        DashboardState.selectedModule[patientId] = moduleCode;
        renderCanvas();
    },
    filterList: () => {
        const instId = document.getElementById('dash-inst-filter').value;
        const keyword = document.getElementById('dash-search-input').value.toLowerCase();
        let filtered = DashboardState.allPatients;
        if (instId !== 'ALL') filtered = filtered.filter(item => item.es_institutions?.id === instId);
        if (keyword) filtered = filtered.filter(item => (item.es_patients.full_name || '').toLowerCase().includes(keyword));
        renderSidebarList(filtered);
    }
};