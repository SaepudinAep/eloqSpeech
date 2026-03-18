// ui.js - V5.2 (ELOQ UI CORE - SMART SEARCH, RESPONSIVE & MODULE CONTEXT READY)
// Fitur: Smart Search Pasien, Responsive Nav, Patient Pill, & Module Context Handler

import { supabase } from '../config.js';

export function injectStyles() {
    if (document.getElementById('eloq-core-css')) return;
    const s = document.createElement('style');
    s.id = 'eloq-core-css';
    s.innerHTML = `
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; }
        body { background-color: #f8fafc; color: #1e293b; }
        
        .main-wrapper { 
            width: 100%; 
            padding: 15px; 
            display: flex; 
            flex-direction: column; 
            gap: 20px; 
        }

        .nav-bar { 
            display: flex; justify-content: space-between; align-items: center; 
            background: white; padding: 10px 20px; border-radius: 20px; 
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;
        }

        .nav-left, .nav-right { display: flex; align-items: center; gap: 12px; }
        .logo-icon { height: 32px; width: auto; cursor: pointer; }
        .v-line { width: 1px; height: 20px; background: #e2e8f0; margin: 0 5px; }

        .breadcrumb-container { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 800; color: #4d97ff; }
        .crumb-item { cursor: pointer; display: flex; align-items: center; transition: 0.2s; opacity: 0.7; }
        .crumb-item:hover { opacity: 1; transform: scale(1.1); }
        .crumb-item.active { opacity: 1; color: #1e40af; background: #eff6ff; padding: 4px 12px; border-radius: 8px; border: 1px solid #bfdbfe; cursor: default; transform: none; }
        .crumb-sep { color: #cbd5e1; font-weight: 400; font-size: 10px; }

        .patient-pill {
            display: inline-flex; align-items: center; justify-content: center;
            padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: 800;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05); transition: all 0.2s ease;
            white-space: nowrap; margin: 0 10px; cursor: pointer; border: 1px solid transparent;
        }
        .patient-pill:hover { transform: translateY(-1px); box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .patient-pill.empty { background: #fffbeb; color: #92400e; border-color: #fef3c7; }
        .patient-pill.active { background: #f0fdf4; color: #166534; border-color: #dcfce7; }
        .pill-text { padding-right: 8px; border-right: 1px solid rgba(0,0,0,0.1); }
        .pill-close { padding-left: 8px; color: #ef4444; font-size: 14px; font-weight: 900; }
        .pill-close:hover { color: #b91c1c; }

        .user-info-box { text-align: right; display: flex; flex-direction: column; }
        .u-name-label { font-size: 12px; font-weight: 800; color: #1e293b; }
        .u-role-tag { font-size: 9px; font-weight: 700; color: #4d97ff; background: #eff6ff; padding: 2px 6px; border-radius: 6px; border: 1px solid #bfdbfe; margin-top: 2px; align-self: flex-end; }
        .u-avatar-box { width: 36px; height: 36px; background: #4d97ff; color: white; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 15px; box-shadow: 0 4px 6px rgba(77, 151, 255, 0.2); }
        
        .ui-modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); z-index: 9999; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(4px); }
        
        @media (max-width: 768px) {
            .main-wrapper { padding: 8px; }
            .nav-bar { padding: 10px; }
            .user-info-box { display: flex; text-align: right; }
            .u-name-label { font-size: 11px; }
            .u-role-tag { font-size: 8px; padding: 1px 4px; }
            .crumb-item.active { max-width: 100px; overflow: hidden; text-overflow: ellipsis; }
        }
    `;
    document.head.appendChild(s);
}

export function renderHeader(crumbs = [], profile = null) {
    let activePatient = null;
    try {
        const stored = localStorage.getItem('eloq_active_patient');
        if (stored) activePatient = JSON.parse(stored);
    } catch (e) {
        localStorage.removeItem('eloq_active_patient');
    }

    const userName = profile?.full_name || 'Pengguna';
    const userRole = profile?.es_roles?.role_name || 'USER';
    const userInitial = userName.charAt(0).toUpperCase();
    const logoUrl = "https://vkienlwfzvgneyxqzgcx.supabase.co/storage/v1/object/public/general/Eloq_logo.png";

    let breadcrumbHtml = `<span class="crumb-item" onclick="window.renderApp(null)" title="Dashboard" style="font-size:16px;">🏠</span>`;
    if (crumbs && crumbs.length > 0) {
        crumbs.forEach((c, i) => {
            breadcrumbHtml += `<span class="crumb-sep">/</span>`;
            if (i === crumbs.length - 1) {
                breadcrumbHtml += `<span class="crumb-item active">${c.label.toUpperCase()}</span>`;
            } else {
                breadcrumbHtml += `<span class="crumb-item" onclick="window.renderApp(${c.id})" title="${c.label}" style="font-size:16px;">${c.icon || '📂'}</span>`;
            }
        });
    }

    let pillHtml = '';
    if (activePatient) {
        const instName = activePatient.instName || '-';
        pillHtml = `
            <div class="patient-pill active" title="Lokasi Institusi: ${instName}">
                <span class="pill-text" onclick="window.UI_Handler.openPatientSelector()">🟢 ${activePatient.name}</span>
                <span class="pill-close" onclick="window.UI_Handler.clearPatient()" title="Akhiri Sesi">✖</span>
            </div>
        `;
    } else {
        pillHtml = `
            <div class="patient-pill empty" onclick="window.UI_Handler.openPatientSelector()">
                ⚠️ [ 👤 PILIH PASIEN ]
            </div>
        `;
    }

    return `
        <div class="nav-bar">
            <div class="nav-left">
                <div class="brand-group" onclick="window.renderApp(null)" style="cursor:pointer; display:flex; align-items:center;">
                    <img src="${logoUrl}" class="logo-icon" alt="Eloq">
                </div>
                <div class="v-line"></div>
                <div class="breadcrumb-container">
                    ${breadcrumbHtml}
                </div>
            </div>

            ${pillHtml}

            <div class="nav-right">
                <div class="user-info-box">
                    <span class="u-name-label">${userName}</span>
                    <span class="u-role-tag">${userRole.toUpperCase()}</span>
                </div>
                <div class="u-avatar-box">${userInitial}</div>
                <div class="v-line"></div>
                <button id="btn-logout" title="Akhiri Sesi (Logout)" style="width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: white; border: 1px solid #fecaca; color: #ef4444; border-radius: 10px; cursor: pointer; transition: 0.2s; box-shadow: 0 2px 4px rgba(239, 68, 68, 0.05); flex-shrink: 0;" onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='white'">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                        <line x1="12" y1="2" x2="12" y2="12"></line>
                    </svg>
                </button>
            </div>
        </div>
        <div id="ui-modal-portal"></div>
    `;
}

window.UI_Handler = {
    cachedData: [], 

    // --- FUNGSI BARU: PENYIMPAN KONTEKS MODUL/EXERCISE ---
    setModuleContext: (moduleUuid) => {
        if(moduleUuid) {
            localStorage.setItem('eloq_active_exercise', JSON.stringify({ id: moduleUuid }));
        } else {
            localStorage.removeItem('eloq_active_exercise');
        }
    },

    openPatientSelector: async () => {
        const portal = document.getElementById('ui-modal-portal');
        if (!portal) return;

        portal.innerHTML = `
            <div class="ui-modal-overlay">
                <div class="ui-modal-card" style="display: flex; flex-direction: column; width: 90%; max-width: 500px; height: 85vh; max-height: 800px; background: white; border-radius: 24px; padding: 20px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);">
                    
                    <div style="flex-shrink: 0;">
                        <h3 style="margin:0 0 5px 0; color:#1e293b; font-size:18px;">👤 Pilih Pasien Aktif</h3>
                        <p style="font-size:11px; color:#64748b; margin-bottom:15px;">Pilih anak untuk mengunci sesi rekam medis.</p>
                        
                        <div id="ps-filter-container" style="display:none;">
                            <select id="ps-inst-filter" style="width: 100%; padding: 12px; border-radius: 12px; border: 2px solid #e2e8f0; font-weight: 800; color: #1e293b; margin-bottom: 8px; outline: none; background: #f8fafc; font-size: 14px;" onchange="window.UI_Handler.renderList()"></select>
                            
                            <input type="text" id="ps-search-input" placeholder="🔍 Cari nama, wali, atau kota..." style="width: 100%; padding: 12px; border-radius: 12px; border: 2px solid #e2e8f0; font-weight: 600; color: #1e293b; margin-bottom: 15px; outline: none; background: #f8fafc; font-size: 14px;" onkeyup="window.UI_Handler.renderList()">
                        </div>
                    </div>

                    <div id="ps-list-container" style="flex-grow: 1; overflow-y: auto; padding-right: 5px; margin-bottom: 15px;">
                        <div style="text-align:center; padding:20px; color:#4d97ff; font-weight:bold; font-size:12px;">⏳ Menarik data caseload...</div>
                    </div>

                    <div style="flex-shrink: 0;">
                        <button onclick="document.getElementById('ui-modal-portal').innerHTML=''" style="width:100%; padding:14px; border:none; border-radius:12px; background:#f1f5f9; color:#64748b; font-weight:900; font-size:13px; cursor:pointer;">BATAL</button>
                    </div>

                </div>
            </div>
        `;

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sesi tidak valid");

            const { data: list, error } = await supabase
                .from('es_therapist_patients')
                .select('patient_id, es_institutions(id, name), es_patients(full_name, city, guardian_name, birth_year, gender)')
                .eq('therapist_id', session.user.id)
                .eq('status', 'active');

            if (error) throw error;

            const container = document.getElementById('ps-list-container');
            if (!list || list.length === 0) {
                container.innerHTML = `<div style="text-align:center; padding:20px; color:#ef4444; font-size:12px;">Daftar Caseload Anda kosong.<br>Tambahkan pasien dari menu Manajemen.</div>`;
                return;
            }

            window.UI_Handler.cachedData = list;

            const uniqueInst = new Map();
            list.forEach(item => {
                if (item.es_institutions) {
                    uniqueInst.set(item.es_institutions.id, item.es_institutions.name);
                }
            });

            const filterEl = document.getElementById('ps-inst-filter');
            let optionsHtml = `<option value="ALL">🏢 Tampilkan Semua Lokasi</option>`;
            uniqueInst.forEach((name, id) => {
                optionsHtml += `<option value="${id}">${name}</option>`;
            });
            filterEl.innerHTML = optionsHtml;
            document.getElementById('ps-filter-container').style.display = 'block';

            window.UI_Handler.renderList();

        } catch (err) {
            document.getElementById('ps-list-container').innerHTML = `<div style="color:red; font-size:12px; text-align:center;">Gagal: ${err.message}</div>`;
        }
    },

    renderList: () => {
        const instId = document.getElementById('ps-inst-filter') ? document.getElementById('ps-inst-filter').value : 'ALL';
        const keyword = document.getElementById('ps-search-input') ? document.getElementById('ps-search-input').value.toLowerCase() : '';
        const container = document.getElementById('ps-list-container');
        const data = window.UI_Handler.cachedData;
        
        let filtered = instId === 'ALL' 
            ? data 
            : data.filter(item => item.es_institutions?.id === instId);

        if (keyword) {
            filtered = filtered.filter(item => {
                const p = item.es_patients;
                const searchString = `${p.full_name || ''} ${p.guardian_name || ''} ${p.city || ''}`.toLowerCase();
                return searchString.includes(keyword);
            });
        }

        if (filtered.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:20px; color:#64748b; font-size:12px;">Tidak ada pasien yang sesuai dengan pencarian/lokasi ini.</div>`;
            return;
        }

        const currentYear = new Date().getFullYear();

        container.innerHTML = filtered.map(item => {
            const p = item.es_patients;
            const iName = item.es_institutions?.name || 'Institusi Tidak Diketahui';
            
            const genderIcon = (p.gender === 'P' || p.gender === 'Perempuan') ? '👧' : '👦';
            const age = p.birth_year ? (currentYear - p.birth_year) + ' Thn' : '?';
            const city = p.city || '-';
            const guardian = p.guardian_name || '-';

            return `
                <div class="ps-item" onclick="window.UI_Handler.setPatient('${item.patient_id}', '${p.full_name.replace(/'/g, "\\'")}', '${iName.replace(/'/g, "\\'")}')" style="display:flex; align-items:center; padding:10px 14px; background:#fff; border:1px solid #e2e8f0; border-radius:12px; margin-bottom:8px; cursor:pointer; transition:0.2s;">
                    
                    <div style="font-size:18px; width:34px; height:34px; background:#f8fafc; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-right:12px; border:1px solid #e2e8f0;">
                        ${genderIcon}
                    </div>
                    
                    <div style="flex-grow:1; min-width:0; display:flex; align-items:center; justify-content:space-between; gap:10px;">
                        
                        <div style="font-weight:800; color:#1e293b; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                            ${p.full_name} <span style="font-weight:600; color:#64748b; font-size:11px; margin-left:4px;">(${age})</span>
                        </div>
                        
                        <div style="font-size:11px; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-align:right;">
                            ${guardian} • ${city}
                        </div>
                        
                    </div>
                    
                    <div style="font-size:14px; color:#cbd5e1; flex-shrink:0; margin-left:12px;">❯</div>
                    
                </div>
            `;
        }).join('');
    },

    setPatient: (id, name, instName) => {
        localStorage.setItem('eloq_active_patient', JSON.stringify({ id, name, instName }));
        document.getElementById('ui-modal-portal').innerHTML = '';
        window.location.reload(); 
    },

    clearPatient: () => {
        if (confirm("Akhiri sesi pasien aktif saat ini?")) {
            localStorage.removeItem('eloq_active_patient');
            window.location.reload();
        }
    }
};