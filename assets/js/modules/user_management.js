import { supabase } from '../config.js';

let cachedRoles = [];
let currentUserProfile = null;

/**
 * UTILITY: CSS Injector untuk Toggle Switch & Toast
 */
const injectStyles = () => {
    if (document.getElementById('mgmt-styles')) return;
    const style = document.createElement('style');
    style.id = 'mgmt-styles';
    style.innerHTML = `
        .switch { position: relative; display: inline-block; width: 40px; height: 20px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e0; transition: .4s; border-radius: 20px; }
        .slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .slider { background-color: #4d97ff; }
        input:checked + .slider:before { transform: translateX(20px); }
        
        .toast-notif { position: fixed; bottom: 30px; right: 30px; background: #48bb78; color: white; padding: 15px 30px; border-radius: 12px; z-index: 10000; font-weight: bold; box-shadow: 0 10px 15px rgba(0,0,0,0.1); font-size: 14px; animation: slideIn 0.3s ease-out; }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    `;
    document.head.appendChild(style);
};

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-notif';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

/**
 * RENDER UTAMA: Full Width & No Limits
 */
export async function renderUserManagement(containerId) {
    injectStyles();
    const container = document.getElementById(containerId);
    
    // Paksa Full Width Tembus CSS Global
    container.style.cssText = "width: 100% !important; max-width: none !important; padding: 20px !important;";
    
    // 1. Ambil Sesi & Profil untuk Logika Ownership
    const { data: { session } } = await supabase.auth.getSession();
    const { data: profile } = await supabase.from('es_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
    currentUserProfile = profile;

    // 2. Cache daftar role
    const { data: roles } = await supabase.from('es_roles').select('*').order('id');
    cachedRoles = roles || [];

    const isSuperAdmin = currentUserProfile.role_id === 1;

    // 3. Render Template
    container.innerHTML = `
        <div style="display:flex; gap:12px; margin-bottom:20px; width:100%;">
            <input type="text" id="h-search" placeholder="Cari Nama atau Email..." style="flex:1; padding:15px; border-radius:12px; border:1px solid #edf2f7; font-size:15px; outline:none;">
            <button id="h-add" class="btn-primary" style="width:auto; padding:0 30px; height:50px; font-weight:bold;">+ TAMBAH USER</button>
        </div>
        
        <div style="width:100%; background:white; border-radius:16px; border:1px solid #edf2f7; overflow:hidden;">
            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse;">
                    <thead>
                        <tr style="background:#f8fafd; color:#718096; text-transform:uppercase; font-size:11px;">
                            <th style="padding:20px; text-align:left; border-bottom:1px solid #edf2f7;">Nama</th>
                            <th style="padding:20px; text-align:left; border-bottom:1px solid #edf2f7;">Role</th>
                            <th style="padding:20px; text-align:left; border-bottom:1px solid #edf2f7;">Email</th>
                            ${isSuperAdmin ? '<th style="padding:20px; text-align:left; border-bottom:1px solid #edf2f7;">Oleh</th>' : ''}
                            <th style="padding:20px; text-align:center; border-bottom:1px solid #edf2f7;">Aktif</th>
                            <th style="padding:20px; text-align:center; border-bottom:1px solid #edf2f7;">Contr</th>
                            <th style="padding:20px; text-align:center; border-bottom:1px solid #edf2f7;">Sand</th>
                            <th style="padding:20px; text-align:right; border-bottom:1px solid #edf2f7;">Aksi</th>
                        </tr>
                    </thead>
                    <tbody id="h-body"></tbody>
                </table>
            </div>
        </div>
        <div id="h-modal-portal"></div>
    `;

    document.getElementById('h-search').oninput = (e) => loadHumanTable(e.target.value);
    document.getElementById('h-add').onclick = () => openHumanModal();
    loadHumanTable();
}

/**
 * LOAD DATA: Filter & Rendering dengan Tombol Delete
 */
async function loadHumanTable(search = '') {
    const tbody = document.getElementById('h-body');
    const isSuperAdmin = currentUserProfile.role_id === 1;

    let q = supabase.from('es_profiles').select('*, es_roles(role_name), creator:created_by(full_name)').order('full_name');
    
    if (!isSuperAdmin) {
        q = q.eq('created_by', currentUserProfile.id);
    }

    if (search) q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);

    const { data: users } = await q;
    
    tbody.innerHTML = (users || []).map(u => {
        // Logika Tombol Delete: Hanya Super Admin & Bukan Diri Sendiri
        const showDelete = isSuperAdmin && u.id !== currentUserProfile.id;

        return `
        <tr style="border-bottom:1px solid #f7fafc;">
            <td style="padding:18px 20px; font-weight:bold; color:#2d3748;">${u.full_name || 'NONAME'}</td>
            <td style="padding:18px 20px;"><span style="background:#e6f0ff; color:#4d97ff; padding:5px 10px; border-radius:8px; font-weight:800; font-size:10px;">${u.es_roles?.role_name || 'User'}</span></td>
            <td style="padding:18px 20px; color:#718096;">${u.email || '-'}</td>
            ${isSuperAdmin ? `<td style="padding:18px 20px; color:#a0aec0; font-size:12px;">${u.creator?.full_name || 'System'}</td>` : ''}
            <td style="padding:18px 20px; text-align:center;">
                <label class="switch">
                    <input type="checkbox" ${u.is_active ? 'checked' : ''} onchange="window.hToggleSimple('${u.id}', 'is_active', this.checked)">
                    <span class="slider"></span>
                </label>
            </td>
            <td style="padding:18px 20px; text-align:center;">
                <label class="switch">
                    <input type="checkbox" ${u.is_contributor ? 'checked' : ''} onchange="window.hToggleSimple('${u.id}', 'is_contributor', this.checked)">
                    <span class="slider"></span>
                </label>
            </td>
            <td style="padding:18px 20px; text-align:center;">
                <label class="switch">
                    <input type="checkbox" ${u.is_sandbox ? 'checked' : ''} onchange="window.hToggleSimple('${u.id}', 'is_sandbox', this.checked)">
                    <span class="slider"></span>
                </label>
            </td>
            <td style="padding:18px 20px; text-align:right;">
                <button onclick="window.hEdit('${u.id}')" style="background:#4d97ff; color:white; border:none; padding:10px 15px; border-radius:10px; font-weight:bold; cursor:pointer;">EDIT</button>
                ${showDelete ? 
                    `<button onclick="window.hHardDelete('${u.id}', '${u.full_name}')" style="background:#fee2e2; color:#ef4444; border:1px solid #fecaca; padding:10px 15px; border-radius:10px; font-weight:bold; cursor:pointer; margin-left:8px;">HAPUS</button>` 
                : ''}
            </td>
        </tr>
    `}).join('');
}

/**
 * DELETE USER (HARD DELETE VIA EDGE FUNCTION)
 */
window.hHardDelete = async (id, name) => {
    if (!confirm(`PERINGATAN KERAS:\nAnda akan menghapus user "${name}" secara permanen.\n\nData login, profil, dan relasi data akan hilang selamanya.\nLanjutkan?`)) return;
    
    const { error } = await supabase.functions.invoke('manage-user', { 
        body: { action: 'DELETE', userData: { id } } 
    });

    if (!error) { 
        showToast("User berhasil dihapus permanen"); 
        loadHumanTable(); 
    } else {
        alert("Gagal menghapus: " + error.message);
    }
};

window.hToggleSimple = async (id, field, val) => {
    if (field === 'is_active' && !val && !confirm("Nonaktifkan login user ini?")) return loadHumanTable();
    const { error } = await supabase.functions.invoke('manage-user', { body: { action: 'UPDATE', userData: { id, [field]: val } } });
    if (!error) { showToast("Status Diperbarui"); loadHumanTable(); } else alert(error.message);
};

window.hEdit = async (id) => {
    const { data } = await supabase.from('es_profiles').select('*').eq('id', id).single();
    openHumanModal(data);
};

function openHumanModal(data = null) {
    const isEdit = !!data;
    const portal = document.getElementById('h-modal-portal');
    let filteredRoles = currentUserProfile.role_id !== 1 ? cachedRoles.filter(r => r.id === 4) : cachedRoles;
    const roleOptions = filteredRoles.map(r => `<option value="${r.id}" ${data?.role_id === r.id ? 'selected' : ''}>${r.role_name}</option>`).join('');

    portal.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-card" style="width: 100% !important; max-width: 600px !important; padding: 30px !important; border-radius: 20px !important;">
                <h3 style="margin:0 0 20px 0; border-bottom:1px solid #edf2f7; padding-bottom:15px;">${isEdit ? '🛠️ Edit User' : '👤 User Baru'}</h3>
                <label class="f-label">Nama Lengkap</label>
                <input type="text" id="m-name" class="f-input" value="${data?.full_name || ''}" style="margin-bottom:15px;">
                <label class="f-label">Akses Role</label>
                <select id="m-role" class="f-select" style="margin-bottom:15px;">${roleOptions}</select>
                <label class="f-label">Email Login</label>
                <input type="email" id="h-email" class="f-input" value="${data?.email || ''}" style="margin-bottom:15px;">
                <label class="f-label">${isEdit ? 'Ganti Password (Opsional)' : 'Password'}</label>
                <input type="password" id="m-pass" class="f-input" placeholder="${isEdit ? 'Kosongkan jika tetap' : 'Min. 6 Karakter'}" style="margin-bottom:25px;">
                <div style="display:flex; gap:12px;">
                    <button id="m-save" class="btn-primary" style="flex:2; height:50px;">SIMPAN</button>
                    <button onclick="document.getElementById('h-modal-portal').innerHTML=''" class="btn-exit" style="flex:1; height:50px; background:#f7fafc; color:#718096;">BATAL</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('m-save').onclick = async () => {
        const passVal = document.getElementById('m-pass').value;
        const payload = { 
            id: data?.id, 
            full_name: document.getElementById('m-name').value, 
            email: document.getElementById('h-email').value, 
            role_id: parseInt(document.getElementById('m-role').value),
            created_by: isEdit ? data.created_by : currentUserProfile.id 
        };
        
        if (passVal && passVal.trim().length >= 6) payload.password = passVal;
        else if (!isEdit) { alert("Password wajib!"); return; }
        
        const { error } = await supabase.functions.invoke('manage-user', { body: { action: isEdit ? 'UPDATE' : 'CREATE', userData: payload } });
        if (error) alert(error.message);
        else { showToast(isEdit ? "Data Diperbarui" : "User Berhasil Dibuat"); portal.innerHTML = ''; loadHumanTable(); }
    };
}