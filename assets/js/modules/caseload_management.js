import { supabase } from '../config.js';

// Tema Kartu "Fresh" untuk Caseload
const CASE_THEMES = [
    { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', accent: '#22c55e' }, // Hijau
    { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af', accent: '#3b82f6' }, // Biru
    { bg: '#faf5ff', border: '#e9d5ff', text: '#6b21a8', accent: '#a855f7' }, // Ungu
];

// --- FUNGSI UTAMA: RENDER HALAMAN ---
export async function renderCaseloadManagement(containerId) {
    const container = document.getElementById(containerId);

    // 1. Header & Container
    container.innerHTML = `
        <div style="background:white; padding:20px; border-radius:16px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05); margin-bottom:20px; display:flex; justify-content:space-between; align-items:center;">
            <div>
                <h3 style="margin:0; font-size:16px; color:#1e293b; font-weight:800; letter-spacing:-0.5px;">PASIEN SAYA (CASELOAD)</h3>
                <div style="font-size:11px; color:#64748b; margin-top:4px;">Daftar pasien yang Anda tangani saat ini</div>
            </div>
            <button id="btn-claim-patient" class="btn-primary" style="width:auto; padding:10px 20px; font-size:11px; background:linear-gradient(135deg, #22c55e 0%, #16a34a 100%); box-shadow:0 4px 10px rgba(34, 197, 94, 0.3);">
                + TAMBAH / KLAIM PASIEN
            </button>
        </div>

        <div id="caseload-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:15px;">
            </div>

        <div id="cl-modal-portal"></div>
    `;

    // 2. Event Listener
    document.getElementById('btn-claim-patient').onclick = () => openClaimModal();
    
    // 3. Load Data
    loadCaseloadGrid();
}

// --- FUNGSI LOAD DATA (MY PATIENTS) ---
async function loadCaseloadGrid() {
    const grid = document.getElementById('caseload-grid');
    grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:20px; color:#94a3b8;">Mengambil data caseload...</div>';

    // Ambil ID Terapis yang sedang login
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Query ke tabel penghubung (es_therapist_patients)
    // Join ke Profile Pasien -> Join ke Detail Pasien
    const { data: caseload, error } = await supabase
        .from('es_therapist_patients')
        .select(`
            *,
            patient:patient_id (
                full_name,
                es_patients (
                    guardian_name,
                    diagnosis,
                    birth_year,
                    birth_month,
                    gender,
                    city
                )
            )
        `)
        .eq('therapist_id', user.id)
        .eq('status', 'active'); // Hanya yang aktif

    if (error) {
        grid.innerHTML = `<div style="color:red;">Error: ${error.message}</div>`;
        return;
    }

    if (!caseload || caseload.length === 0) {
        grid.innerHTML = `
            <div style="grid-column:1/-1; text-align:center; padding:40px; border:2px dashed #e2e8f0; border-radius:16px; color:#94a3b8;">
                <div style="font-size:30px; margin-bottom:10px;">📭</div>
                <b>Belum ada pasien.</b><br>
                Klik tombol "Tambah / Klaim" untuk mencari pasien.
            </div>`;
        return;
    }

    // Render Kartu
    grid.innerHTML = caseload.map((item, idx) => {
        const p = item.patient; 
        const d = (p.es_patients && p.es_patients[0]) ? p.es_patients[0] : {}; // Detail
        const theme = CASE_THEMES[idx % CASE_THEMES.length];
        
        // Ikon Gender
        const genderIcon = d.gender === 'L' ? '♂️' : (d.gender === 'P' ? '♀️' : '❓');
        const genderColor = d.gender === 'L' ? '#2563eb' : (d.gender === 'P' ? '#db2777' : '#64748b');

        // Hitung Usia Singkat
        let ageStr = '-';
        if(d.birth_year && d.birth_month) {
            const now = new Date();
            let y = now.getFullYear() - d.birth_year;
            let m = (now.getMonth() + 1) - d.birth_month;
            if(m < 0) { y--; m += 12; }
            ageStr = `${y} Th ${m} Bln`;
        }

        return `
            <div style="background:${theme.bg}; border:1px solid ${theme.border}; border-radius:16px; padding:15px; position:relative; box-shadow:0 2px 4px rgba(0,0,0,0.02);">
                <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:10px;">
                    <div style="display:flex; align-items:center;">
                        <div style="width:35px; height:35px; background:white; border-radius:50%; display:flex; align-items:center; justify-content:center; border:1px solid ${theme.border}; color:${genderColor}; font-size:16px; margin-right:10px;">
                            ${genderIcon}
                        </div>
                        <div>
                            <div style="font-weight:800; color:#1e293b; font-size:13px;">${p.full_name}</div>
                            <div style="font-size:10px; color:#64748b;">${d.city || 'Tanpa Kota'}</div>
                        </div>
                    </div>
                    <span style="font-size:9px; font-weight:bold; background:white; padding:2px 6px; border-radius:6px; border:1px solid ${theme.border}; color:${theme.text};">
                        ${ageStr}
                    </span>
                </div>

                <div style="background:rgba(255,255,255,0.5); padding:8px; border-radius:8px; border:1px solid ${theme.border}; margin-bottom:10px;">
                    <div style="font-size:10px; color:#64748b;">
                        <b>Wali:</b> ${d.guardian_name || '-'}<br>
                        <b>Diagnosa:</b> ${d.diagnosis || '-'}
                    </div>
                </div>

                <div style="display:flex; gap:5px;">
                    <button style="flex:1; background:white; border:1px solid ${theme.border}; color:${theme.text}; font-size:10px; font-weight:bold; padding:6px; border-radius:8px; cursor:pointer;">
                        📄 LIHAT PROFIL
                    </button>
                    <button onclick="window.removePatient('${item.id}')" style="background:white; border:1px solid #fca5a5; color:#ef4444; font-size:10px; font-weight:bold; padding:6px 10px; border-radius:8px; cursor:pointer;">
                        ❌
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// --- FUNGSI MODAL: KLAIM / CARI PASIEN (SECURE SEARCH) ---
function openClaimModal() {
    const portal = document.getElementById('cl-modal-portal');
    
    portal.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-card" style="max-width:500px;">
                <h3 style="margin-top:0; color:#1e293b;">🔍 Cari & Klaim Pasien</h3>
                <p style="font-size:11px; color:#64748b; margin-bottom:15px;">
                    Gunakan <b>Kota Domisili</b> dan kata kunci (Nama Anak / Email Wali / Nama Wali) untuk menemukan pasien.
                </p>

                <label class="f-label">Kota Domisili Pasien (Wajib)</label>
                <input type="text" id="s-city" class="f-input" placeholder="Contoh: Bandung">

                <label class="f-label">Kata Kunci (Nama / Email / Wali)</label>
                <input type="text" id="s-term" class="f-input" placeholder="Contoh: Budi atau siti@gmail.com">

                <button id="btn-search-go" class="btn-primary" style="margin-top:10px; width:100%;">CARI PASIEN</button>

                <div id="search-results" style="margin-top:20px; max-height:200px; overflow-y:auto; border-top:1px solid #f1f5f9; padding-top:10px;">
                    <div style="text-align:center; font-size:11px; color:#cbd5e1; padding:10px;">Hasil pencarian akan muncul di sini...</div>
                </div>

                <button onclick="document.getElementById('cl-modal-portal').innerHTML=''" class="btn-exit" style="margin-top:15px; width:100%;">TUTUP</button>
            </div>
        </div>
    `;

    // Event Listener Tombol Cari
    document.getElementById('btn-search-go').onclick = async () => {
        const city = document.getElementById('s-city').value;
        const term = document.getElementById('s-term').value;
        const resultBox = document.getElementById('search-results');

        if (!city || city.length < 3) {
            alert("Kota wajib diisi (min. 3 huruf)"); return;
        }
        if (!term || term.length < 3) {
            alert("Kata kunci wajib diisi (min. 3 huruf)"); return;
        }

        resultBox.innerHTML = '<div style="text-align:center; color:#64748b;">Mencari...</div>';

        try {
            // PANGGIL RPC DATABASE (Secure Function)
            const { data, error } = await supabase.rpc('search_patient_index', {
                search_city: city,
                search_term: term
            });

            if (error) throw error;

            if (!data || data.length === 0) {
                resultBox.innerHTML = '<div style="text-align:center; color:#ef4444; font-size:11px;">Tidak ditemukan data yang cocok.</div>';
                return;
            }

            // Render Hasil
            resultBox.innerHTML = data.map(p => `
                <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:10px; border-radius:8px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-weight:bold; font-size:12px; color:#1e293b;">${p.full_name}</div>
                        <div style="font-size:10px; color:#64748b;">
                            Wali: ${p.guardian_name || '-'} | 📧 ${p.masked_email}
                        </div>
                    </div>
                    <button onclick="window.confirmAdd('${p.patient_id}', '${p.full_name}')" style="background:#22c55e; color:white; border:none; padding:5px 10px; border-radius:6px; font-size:10px; font-weight:bold; cursor:pointer;">
                        + ADD
                    </button>
                </div>
            `).join('');

        } catch (err) {
            resultBox.innerHTML = `<div style="color:red; font-size:11px;">Error: ${err.message}</div>`;
        }
    };
}

// --- FUNGSI AKSI: SIMPAN KE DATABASE ---
window.confirmAdd = async (patientId, patientName) => {
    if (!confirm(`Tambahkan ${patientName} ke daftar pasien Anda?`)) return;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Insert ke es_therapist_patients
        const { error } = await supabase.from('es_therapist_patients').insert({
            therapist_id: user.id,
            patient_id: patientId,
            status: 'active'
        });

        if (error) {
            if (error.code === '23505') alert("Pasien ini sudah ada di daftar Anda.");
            else throw error;
        } else {
            alert("✅ Berhasil ditambahkan!");
            document.getElementById('cl-modal-portal').innerHTML = ''; // Tutup modal
            loadCaseloadGrid(); // Refresh grid
        }
    } catch (err) {
        alert("Gagal: " + err.message);
    }
};

window.removePatient = async (recordId) => {
    if(!confirm("Hapus pasien ini dari daftar Anda? (Data pasien tidak akan hilang dari sistem)")) return;
    
    const { error } = await supabase.from('es_therapist_patients').delete().eq('id', recordId);
    if(error) alert("Gagal hapus: " + error.message);
    else loadCaseloadGrid();
};