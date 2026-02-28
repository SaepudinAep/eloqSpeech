// [ COPY BUTTON - ELOQSPEECH PATIENT MANAGEMENT FINAL COMPLETE ]
// Status: Gender & Guardian Added | Active Toggle | Full Width | Toast

import { supabase } from '../config.js';

let currentInstId = 'all';

// --- UTILITY: STYLES & TOAST ---
const injectStyles = () => {
    if (document.getElementById('pt-styles')) return;
    const s = document.createElement('style');
    s.id = 'pt-styles';
    s.innerHTML = `
        .switch { position: relative; display: inline-block; width: 34px; height: 18px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e0; transition: .4s; border-radius: 20px; }
        .slider:before { position: absolute; content: ""; height: 12px; width: 12px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .slider { background-color: #4d97ff; }
        input:checked + .slider:before { transform: translateX(16px); }

        .toast-notif { position: fixed; bottom: 30px; right: 30px; background: #48bb78; color: white; padding: 15px 30px; border-radius: 12px; z-index: 10000; font-weight: bold; box-shadow: 0 10px 15px rgba(0,0,0,0.1); font-size: 14px; animation: slideIn 0.3s ease-out; }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    `;
    document.head.appendChild(s);
};

function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'toast-notif'; t.innerText = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

function calculateAge(year, month) {
    if (!year || !month) return '-';
    const now = new Date();
    let y = now.getFullYear() - year;
    let m = (now.getMonth() + 1) - month;
    if (m < 0) { y--; m += 12; }
    return `${y} Th ${m} Bln`;
}

function generateUUID() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

// --- RENDER UTAMA ---
export async function renderPatientManagement(targetId) {
    injectStyles();
    const root = document.getElementById(targetId);
    
    // FULL WIDTH LAYOUT
    root.innerHTML = `
        <div style="width:100%; padding:20px;">
            <div id="inst-tabs" style="display:flex; gap:10px; overflow-x:auto; padding-bottom:15px; margin-bottom:20px; border-bottom:1px solid #e2e8f0;">
                <div style="font-size:12px; color:#94a3b8; padding:10px;">Memuat lokasi...</div>
            </div>

            <div id="action-bar" style="display:flex; gap:15px; margin-bottom:20px;">
                <button id="btn-reg-p" disabled style="flex:1; background:#94a3b8; color:white; border:none; border-radius:12px; padding:15px; font-weight:800; font-size:13px; cursor:not-allowed; opacity:0.6; box-shadow:0 4px 6px rgba(0,0,0,0.05);">
                    👶 DAFTAR PASIEN BARU
                </button>
                <button id="btn-claim-p" disabled style="flex:1; background:#94a3b8; color:white; border:none; border-radius:12px; padding:15px; font-weight:800; font-size:13px; cursor:not-allowed; opacity:0.6; box-shadow:0 4px 6px rgba(0,0,0,0.05);">
                    🔍 KLAIM DARI DATABASE
                </button>
            </div>

            <div style="background:white; border-radius:20px; border:1px solid #e2e8f0; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.03);">
                <table style="width:100%; border-collapse:collapse; text-align:left;">
                    <thead style="background:#f8fafc; color:#64748b; font-weight:800; border-bottom:2px solid #e2e8f0; font-size:11px; text-transform:uppercase;">
                        <tr>
                            <th style="padding:20px;">Pasien</th>
                            <th style="padding:20px;">Diagnosa & Wali</th>
                            <th style="padding:20px; text-align:center;">Aktif</th>
                            <th style="padding:20px; text-align:right;">Aksi</th>
                        </tr>
                    </thead>
                    <tbody id="patient-table-body">
                        <tr><td colspan="4" style="text-align:center; padding:40px; color:#94a3b8;">Memuat daftar pasien...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
        <div id="pt-modal-portal"></div>
    `;

    loadInstitutionTabs();
}

// --- LOGIKA TABS ---
async function loadInstitutionTabs() {
    const tabArea = document.getElementById('inst-tabs');
    const { data: { session } } = await supabase.auth.getSession();
    
    const { data: workplaces } = await supabase.from('es_therapist_workplaces')
        .select('institution_id, es_institutions(name, city)')
        .eq('therapist_id', session.user.id);

    tabArea.innerHTML = `
        <button onclick="window.switchInst('all')" id="tab-all" class="inst-tab" 
            style="background:#4d97ff; color:white; border:1px solid #4d97ff; padding:10px 20px; border-radius:30px; font-size:12px; font-weight:800; white-space:nowrap; cursor:pointer;">
            🌐 SEMUA
        </button>
    ` + (workplaces ? workplaces.map(w => `
        <button onclick="window.switchInst('${w.institution_id}')" id="tab-${w.institution_id}" class="inst-tab" 
            style="background:white; border:1px solid #e2e8f0; color:#64748b; padding:10px 20px; border-radius:30px; font-size:12px; font-weight:800; white-space:nowrap; cursor:pointer;">
            🏢 ${w.es_institutions.name}
        </button>
    `).join('') : '');

    window.switchInst = (instId) => {
        currentInstId = instId;
        const btnReg = document.getElementById('btn-reg-p');
        const btnClaim = document.getElementById('btn-claim-p');

        document.querySelectorAll('.inst-tab').forEach(t => {
            t.style.background = 'white'; t.style.color = '#64748b'; t.style.borderColor = '#e2e8f0';
        });

        const active = document.getElementById(instId === 'all' ? 'tab-all' : `tab-${instId}`);
        if (active) {
            active.style.background = '#4d97ff'; active.style.color = 'white'; active.style.borderColor = '#4d97ff';
        }

        if (instId === 'all') {
            btnReg.disabled = true; btnReg.style.background = '#94a3b8'; btnReg.style.cursor = 'not-allowed';
            btnClaim.disabled = true; btnClaim.style.background = '#94a3b8'; btnClaim.style.cursor = 'not-allowed';
        } else {
            btnReg.disabled = false; btnReg.style.background = '#10b981'; btnReg.style.cursor = 'pointer'; btnReg.style.opacity = '1';
            btnClaim.disabled = false; btnClaim.style.background = '#ffab19'; btnClaim.style.cursor = 'pointer'; btnClaim.style.opacity = '1';
        }

        fetchInstitutionalPatients(instId);
    };

    window.switchInst('all');

    document.getElementById('btn-reg-p').onclick = () => openPatientModal();
    document.getElementById('btn-claim-p').onclick = () => openClaimModal();
}

// --- FETCH DATA ---
async function fetchInstitutionalPatients(instId) {
    const tbody = document.getElementById('patient-table-body');
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:30px; color:#94a3b8;">Sinkronisasi data...</td></tr>';
    
    let query = supabase.from('es_therapist_patients')
        .select(`patient_id, es_patients(*), joined_at, es_institutions(name)`)
        .order('joined_at', { ascending: false });

    if (instId !== 'all') {
        query = query.eq('institution_id', instId);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:50px; color:#94a3b8; font-weight:bold;">Tidak ada pasien ditemukan.</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(tp => {
        const p = tp.es_patients;
        if (!p) return '';
        const instLabel = instId === 'all' ? `<div style="font-size:10px; color:#ffab19; font-weight:800; margin-top:4px;">🏥 ${tp.es_institutions?.name || '-'}</div>` : '';
        const genderIcon = p.gender === 'P' ? '♀️' : (p.gender === 'L' ? '♂️' : '❓');
        const genderBg = p.gender === 'P' ? '#fdf2f8' : (p.gender === 'L' ? '#eff6ff' : '#f1f5f9');

        return `
            <tr style="border-bottom:1px solid #f1f5f9; transition:background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                <td style="padding:20px;">
                    <div style="display:flex; align-items:center;">
                        <div style="width:40px; height:40px; background:${genderBg}; border-radius:12px; display:flex; align-items:center; justify-content:center; margin-right:15px; font-size:18px;">${genderIcon}</div>
                        <div>
                            <div style="font-weight:800; color:#1e293b; font-size:14px;">${p.full_name}</div>
                            <div style="font-size:11px; color:#64748b;">📍 ${p.city || '-'}</div>
                            ${instLabel}
                        </div>
                    </div>
                </td>
                <td style="padding:20px;">
                    <div style="font-weight:700; color:#475569; font-size:13px;">${p.diagnosis || '-'}</div>
                    <div style="font-size:11px; color:#94a3b8; font-weight:600; margin-top:2px;">Wali: ${p.guardian_name || '-'}</div>
                    <div style="font-size:11px; color:#4d97ff; font-weight:800; margin-top:4px;">🎂 ${calculateAge(p.birth_year, p.birth_month)}</div>
                </td>
                <td style="padding:20px; text-align:center;">
                    <label class="switch">
                        <input type="checkbox" ${p.is_active ? 'checked' : ''} onchange="window.togglePatientActive('${p.id}', this.checked)">
                        <span class="slider"></span>
                    </label>
                </td>
                <td style="padding:20px; text-align:right;">
                    <button onclick="window.editPatient('${p.id}')" style="background:white; border:1px solid #e2e8f0; padding:8px 16px; border-radius:10px; font-size:11px; font-weight:800; cursor:pointer; color:#475569; margin-right:8px; box-shadow:0 2px 4px rgba(0,0,0,0.02);">✏️ EDIT</button>
                    <button style="background:#4d97ff; border:none; padding:8px 16px; border-radius:10px; font-size:11px; font-weight:800; cursor:pointer; color:white; box-shadow:0 2px 4px rgba(77, 151, 255, 0.3);">REKAM MEDIS</button>
                </td>
            </tr>
        `;
    }).join('');
}

// --- LOGIKA TOGGLE ACTIVE ---
window.togglePatientActive = async (id, val) => {
    const { error } = await supabase.from('es_patients').update({ is_active: val }).eq('id', id);
    if (error) {
        alert("Gagal update: " + error.message);
        fetchInstitutionalPatients(currentInstId); // Revert UI
    } else {
        showToast(val ? "Pasien diaktifkan" : "Pasien dinonaktifkan");
    }
};

// --- LOGIKA EDIT & CREATE ---
window.editPatient = async (id) => {
    const { data } = await supabase.from('es_patients').select('*').eq('id', id).single();
    if(data) openPatientModal(data);
};

function openPatientModal(data = null) {
    const isEdit = !!data;
    const portal = document.getElementById('pt-modal-portal');
    
    portal.innerHTML = `
        <div style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; padding:20px; z-index:9999;">
            <div style="background:white; width:100%; max-width:500px; border-radius:24px; padding:30px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.1); max-height:90vh; overflow-y:auto;">
                <h3 style="margin:0; font-size:20px; font-weight:800; color:#1e293b; margin-bottom:20px; border-bottom:1px solid #f1f5f9; padding-bottom:15px;">
                    ${isEdit ? '✏️ Edit Data Pasien' : '👶 Pasien Baru'}
                </h3>
                
                <div style="display:grid; gap:15px;">
                    <div>
                        <label class="f-label">Nama Lengkap Pasien *</label>
                        <input type="text" id="in-name" class="f-input" value="${data?.full_name || ''}" placeholder="Nama Pasien">
                    </div>

                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                        <div>
                            <label class="f-label">Jenis Kelamin *</label>
                            <select id="in-gender" class="f-select">
                                <option value="" disabled ${!data?.gender ? 'selected' : ''}>Pilih...</option>
                                <option value="L" ${data?.gender === 'L' ? 'selected' : ''}>Laki-laki</option>
                                <option value="P" ${data?.gender === 'P' ? 'selected' : ''}>Perempuan</option>
                            </select>
                        </div>
                        <div>
                            <label class="f-label">Nama Wali / Ortu</label>
                            <input type="text" id="in-guardian" class="f-input" value="${data?.guardian_name || ''}" placeholder="Nama Ayah/Ibu">
                        </div>
                    </div>
                    
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                        <div>
                            <label class="f-label">Tahun Lahir</label>
                            <input type="number" id="in-year" class="f-input" value="${data?.birth_year || ''}" placeholder="YYYY">
                        </div>
                        <div>
                            <label class="f-label">Bulan (1-12)</label>
                            <input type="number" id="in-month" class="f-input" value="${data?.birth_month || ''}" placeholder="MM">
                        </div>
                    </div>

                    <div>
                        <label class="f-label">Kota Domisili</label>
                        <input type="text" id="in-city" class="f-input" value="${data?.city || ''}" placeholder="Kota tempat tinggal">
                    </div>
                    
                    <div>
                        <label class="f-label">Diagnosa Utama</label>
                        <input type="text" id="in-diag" class="f-input" value="${data?.diagnosis || ''}" placeholder="Contoh: Speech Delay">
                    </div>
                </div>

                <div style="display:flex; gap:10px; margin-top:25px;">
                    <button id="btn-save-p" style="flex:2; background:#10b981; color:white; border:none; border-radius:12px; padding:15px; font-weight:800; cursor:pointer; font-size:13px;">SIMPAN DATA</button>
                    <button onclick="document.getElementById('pt-modal-portal').innerHTML=''" style="flex:1; border:none; background:#f1f5f9; border-radius:12px; padding:15px; font-weight:800; cursor:pointer; font-size:13px; color:#64748b;">BATAL</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('btn-save-p').onclick = async () => {
        const payload = {
            full_name: document.getElementById('in-name').value,
            gender: document.getElementById('in-gender').value, // NEW
            guardian_name: document.getElementById('in-guardian').value, // NEW
            birth_year: document.getElementById('in-year').value || null,
            birth_month: document.getElementById('in-month').value || null,
            city: document.getElementById('in-city').value,
            diagnosis: document.getElementById('in-diag').value,
            is_active: true // Default active
        };

        if(!payload.full_name) return alert("Nama wajib diisi!");
        if(!payload.gender) return alert("Jenis Kelamin wajib dipilih!");

        try {
            if (isEdit) {
                // UPDATE MODE
                const { error } = await supabase.from('es_patients').update(payload).eq('id', data.id);
                if(error) throw error;
                showToast("Data pasien berhasil diperbarui");
            } else {
                // CREATE MODE
                const { data: { session } } = await supabase.auth.getSession();
                const pid = generateUUID();
                const newPatient = { ...payload, id: pid, created_by: session.user.id };
                
                await supabase.from('es_patients').insert([newPatient]);
                await supabase.from('es_therapist_patients').insert({ 
                    therapist_id: session.user.id, 
                    patient_id: pid, 
                    institution_id: currentInstId, 
                    joined_at: new Date().toISOString() 
                });
                showToast("Pasien baru berhasil didaftarkan");
            }
            
            document.getElementById('pt-modal-portal').innerHTML = '';
            fetchInstitutionalPatients(currentInstId);
        } catch(e) {
            alert("Gagal: " + e.message);
        }
    };
}

// --- LOGIKA KLAIM ---
function openClaimModal() {
    const portal = document.getElementById('pt-modal-portal');
    portal.innerHTML = `
        <div style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; padding:20px; z-index:9999;">
            <div style="background:white; width:100%; max-width:450px; border-radius:24px; padding:25px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);">
                <h3 style="margin:0; font-size:18px; font-weight:800; color:#1e293b;">🔍 Klaim Pasien (Global)</h3>
                <div style="display:grid; gap:12px; margin-top:20px;">
                    <div>
                        <label class="f-label" style="color:#4d97ff;">DOMISILI / KOTA</label>
                        <input type="text" id="s-city" class="f-input" placeholder="Wajib diisi (Min 3 huruf)">
                    </div>
                    <div>
                        <label class="f-label">NAMA PASIEN</label>
                        <input type="text" id="s-term" class="f-input" placeholder="Nama Pasien">
                    </div>
                    <button id="btn-do-search" style="background:#4d97ff; color:white; border:none; border-radius:12px; padding:12px; font-weight:800; cursor:pointer; margin-top:10px;">CARI PASIEN</button>
                </div>
                <div id="search-results" style="margin-top:20px; max-height:200px; overflow-y:auto; border-top:1px solid #f1f5f9; padding-top:10px;"></div>
                <button onclick="document.getElementById('pt-modal-portal').innerHTML=''" style="width:100%; margin-top:15px; border:none; background:#f1f5f9; border-radius:12px; padding:12px; font-weight:800; color:#64748b; cursor:pointer;">TUTUP</button>
            </div>
        </div>
    `;

    document.getElementById('btn-do-search').onclick = async () => {
        const city = document.getElementById('s-city').value.trim();
        const term = document.getElementById('s-term').value.trim();
        const resBox = document.getElementById('search-results');
        if (city.length < 3) return alert("Kota minimal 3 huruf!");
        
        resBox.innerHTML = '<div style="text-align:center; font-size:11px; color:#94a3b8;">Mencari...</div>';
        
        const { data, error } = await supabase.rpc('search_patient_index', { search_city: city, search_term: term });
        
        if (error) return resBox.innerHTML = '<div style="text-align:center; font-size:11px; color:#ef4444;">Fungsi pencarian belum diinstal.</div>';
        if (!data || data.length === 0) return resBox.innerHTML = '<div style="text-align:center; font-size:11px; color:#ef4444;">Data tidak ditemukan.</div>';

        resBox.innerHTML = data.map(p => `
            <div style="background:#f8fafc; padding:12px; border-radius:12px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; border:1px solid #e2e8f0;">
                <div>
                    <div style="font-weight:800; font-size:13px; color:#1e293b;">${p.full_name}</div>
                    <div style="font-size:10px; color:#64748b;">🏠 ${p.city}</div>
                </div>
                <button onclick="window.execClaim('${p.patient_id}', '${p.full_name}')" style="background:#10b981; color:white; border:none; padding:6px 12px; border-radius:8px; font-size:11px; font-weight:800; cursor:pointer;">+ KLAIM</button>
            </div>
        `).join('');
    };
}

window.execClaim = async (pid, name) => {
    if (!confirm(`Klaim pasien "${name}" ke institusi ini?`)) return;
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from('es_therapist_patients').insert({
        therapist_id: session.user.id, patient_id: pid, institution_id: currentInstId, joined_at: new Date().toISOString()
    });
    if (error) alert("Gagal klaim: " + error.message);
    else { 
        showToast("Pasien berhasil diklaim!"); 
        document.getElementById('pt-modal-portal').innerHTML = ''; 
        window.switchInst(currentInstId); 
    }
};