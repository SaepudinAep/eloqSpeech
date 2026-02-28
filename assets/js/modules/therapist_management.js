import { supabase } from '../config.js';

const CARD_THEMES = [
    { bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: '#bfdbfe', text: '#1e40af', accent: '#3b82f6' }, 
    { bg: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)', border: '#fbcfe8', text: '#9d174d', accent: '#ec4899' }, 
    { bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border: '#bbf7d0', text: '#166534', accent: '#22c55e' }, 
    { bg: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)', border: '#fed7aa', text: '#9a3412', accent: '#f97316' }, 
];

export async function renderTherapistManagement(containerId) {
    const container = document.getElementById(containerId);

    container.innerHTML = `
        <div style="background:white; padding:20px; border-radius:16px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05); margin-bottom:20px; display:flex; justify-content:space-between; align-items:center;">
            <div>
                <h3 style="margin:0; font-size:16px; color:#1e293b; font-weight:800; letter-spacing:-0.5px;">DATA TERAPIS</h3>
                <div style="font-size:11px; color:#64748b; margin-top:4px;">Kelola profil & akun login (Server-Side)</div>
            </div>
            <button id="btn-add-therapist" class="btn-primary" style="width:auto; padding:10px 20px; font-size:11px; box-shadow:0 4px 10px rgba(59, 130, 246, 0.3);">
                + TERAPIS BARU
            </button>
        </div>

        <div id="therapist-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap:15px;"></div>
        <div id="th-modal-portal"></div>
    `;

    document.getElementById('btn-add-therapist').onclick = () => openCreateTherapistModal();
    loadTherapistGrid();
}

async function loadTherapistGrid() {
    const grid = document.getElementById('therapist-grid');
    grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:20px; color:#94a3b8;">Mengambil data...</div>';

    const { data: roles } = await supabase.from('es_roles').select('id').ilike('role_name', '%therapist%').single();
    if (!roles) return;

    const { data: profiles } = await supabase.from('es_profiles').select(`*, es_therapists(*)`).eq('role_id', roles.id).order('full_name');

    if (!profiles || profiles.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; border:2px dashed #e2e8f0; border-radius:16px; color:#94a3b8;">Belum ada Terapis.</div>';
        return;
    }

    grid.innerHTML = profiles.map((p, idx) => {
        const theme = CARD_THEMES[idx % CARD_THEMES.length];
        let detail = {};
        if (p.es_therapists) detail = Array.isArray(p.es_therapists) ? (p.es_therapists[0] || {}) : p.es_therapists;
        
        return `
            <div style="background:${theme.bg}; border:1px solid ${theme.border}; border-radius:20px; padding:20px; position:relative; transition:transform 0.2s;">
                <div style="display:flex; align-items:center; margin-bottom:15px;">
                    <div style="width:45px; height:45px; background:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:16px; font-weight:900; color:${theme.accent}; border:2px solid ${theme.border}; margin-right:12px;">
                        ${p.full_name ? p.full_name.substring(0, 2).toUpperCase() : '??'}
                    </div>
                    <div>
                        <div style="font-size:14px; font-weight:800; color:${theme.text};">${p.full_name}</div>
                        <div style="font-size:10px; color:${theme.text}; opacity:0.8;">${p.email}</div>
                    </div>
                </div>
                <div style="background:rgba(255,255,255,0.6); border-radius:12px; padding:10px; margin-bottom:10px; border:1px solid ${theme.border};">
                    <div style="display:flex; justify-content:space-between;">
                        <span style="font-size:9px; color:#64748b; font-weight:bold;">KOTA</span>
                        <span style="font-size:10px; font-weight:800; color:${theme.text};">${detail.city || '-'}</span>
                    </div>
                </div>
                <button onclick="window.editTherapist('${p.id}')" style="width:100%; background:white; color:${theme.accent}; border:1px solid ${theme.border}; padding:8px; border-radius:10px; font-weight:800; font-size:10px; cursor:pointer;">✏️ EDIT DETAIL</button>
            </div>
        `;
    }).join('');
}

function openCreateTherapistModal() {
    const portal = document.getElementById('th-modal-portal');
    portal.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-card" style="max-width:500px;">
                <h3 style="margin-top:0;">✨ Registrasi Terapis</h3>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                    <div>
                        <label class="f-label">Email</label><input type="email" id="c-email" class="f-input">
                        <label class="f-label">Password</label><input type="password" id="c-pass" class="f-input">
                    </div>
                    <div>
                        <label class="f-label">Nama & Gelar</label><input type="text" id="c-name" class="f-input">
                        <label class="f-label">Kota</label><input type="text" id="c-city" class="f-input">
                    </div>
                </div>
                <div style="display:flex; gap:10px; margin-top:20px;">
                    <button id="c-save" class="btn-primary">PROSES (SERVER)</button>
                    <button onclick="document.getElementById('th-modal-portal').innerHTML=''" class="btn-exit" style="flex:1;">BATAL</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('c-save').onclick = async () => {
        const btn = document.getElementById('c-save');
        btn.innerText = "MENGHUBUNGI SERVER...";
        btn.disabled = true;

        try {
            const email = document.getElementById('c-email').value;
            const pass = document.getElementById('c-pass').value;
            const name = document.getElementById('c-name').value;
            const city = document.getElementById('c-city').value;
            const { data: { user } } = await supabase.auth.getUser(); // Admin ID

            const { data: role } = await supabase.from('es_roles').select('id').ilike('role_name', '%therapist%').single();
            if(!role) throw new Error("Role Therapist hilang.");

            // PANGGIL EDGE FUNCTION
            const { data, error } = await supabase.functions.invoke('manage-user', {
                body: {
                    action: 'CREATE_THERAPIST',
                    userData: {
                        email: email, password: pass, full_name: name, role_id: role.id,
                        created_by: user.id,
                        details: { city: city } // Masuk ke es_therapists
                    }
                }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            alert("✅ Sukses!");
            portal.innerHTML = '';
            loadTherapistGrid();

        } catch (err) {
            alert("Gagal: " + err.message);
            btn.innerText = "COBA LAGI";
            btn.disabled = false;
        }
    };
}

// Edit tetap pakai Client Side update (lebih cepat untuk edit data kecil)
window.editTherapist = async (profileId) => {
    const { data: profile } = await supabase.from('es_profiles').select('*').eq('id', profileId).single();
    const { data: detailData } = await supabase.from('es_therapists').select('*').eq('profile_id', profileId);
    let detail = Array.isArray(detailData) ? detailData[0] : detailData;
    
    const portal = document.getElementById('th-modal-portal');
    portal.innerHTML = `
        <div class="modal-overlay"><div class="modal-card">
            <h3>✏️ Edit Data</h3>
            <label class="f-label">Nama</label><input type="text" id="e-name" class="f-input" value="${profile.full_name}">
            <label class="f-label">Kota</label><input type="text" id="e-city" class="f-input" value="${detail?.city || ''}">
            <button id="e-save" class="btn-primary" style="margin-top:15px;">SIMPAN</button>
            <button onclick="document.getElementById('th-modal-portal').innerHTML=''" class="btn-exit" style="margin-top:5px; width:100%;">BATAL</button>
        </div></div>
    `;
    
    document.getElementById('e-save').onclick = async () => {
        const name = document.getElementById('e-name').value;
        const city = document.getElementById('e-city').value;
        await supabase.from('es_profiles').update({ full_name: name }).eq('id', profileId);
        await supabase.from('es_therapists').upsert({ profile_id: profileId, full_name: name, city: city, updated_at: new Date() });
        portal.innerHTML = '';
        loadTherapistGrid();
    };
};