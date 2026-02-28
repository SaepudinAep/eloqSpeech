import { supabase } from '../config.js';

let cachedTypes = [];
let currentUserProfile = null;

// Palet Warna untuk Tipe Institusi (Otomatis digilir)
const TYPE_COLORS = [
    { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5', label: 'RED' },     // Merah (RS)
    { bg: '#dcfce7', text: '#15803d', border: '#86efac', label: 'GREEN' },   // Hijau (Klinik)
    { bg: '#ffedd5', text: '#c2410c', border: '#fdba74', label: 'ORANGE' },  // Orange (Praktek)
    { bg: '#e0e7ff', text: '#4338ca', border: '#a5b4fc', label: 'INDIGO' },  // Indigo (Sekolah)
    { bg: '#fae8ff', text: '#a21caf', border: '#f0abfc', label: 'PURPLE' }   // Ungu (Lainnya)
];

export async function renderInstitutionManagement(containerId) {
    const container = document.getElementById(containerId);
    
    // 1. Ambil Profil Admin (untuk 'created_by') [cite: 2026-02-10]
    const { data: { session } } = await supabase.auth.getSession();
    const { data: profile } = await supabase.from('es_profiles').select('*').eq('id', session.user.id).single();
    currentUserProfile = profile;

    // 2. Ambil Tipe Institusi untuk Filter & Modal
    const { data: types } = await supabase.from('es_institution_types').select('*').order('id');
    cachedTypes = types || [];

    // 3. Render Layout Filter & Grid [cite: 2026-02-11]
    container.innerHTML = `
        <div style="background:white; padding:15px; border-radius:16px; box-shadow:0 2px 8px rgba(0,0,0,0.05); margin-bottom:15px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <div style="font-weight:800; color:#1e293b; font-size:14px;">FILTER TIPE:</div>
                <button id="i-add" class="btn-primary" style="width:auto; padding:8px 20px; font-size:12px;">+ INSTITUSI BARU</button>
            </div>
            
            <div id="type-filters" style="display:flex; gap:8px; overflow-x:auto; padding-bottom:5px;">
                <button onclick="window.filterInst('all')" class="filter-chip active" style="background:#1e293b; color:white; border:none; padding:6px 14px; border-radius:20px; font-weight:700; font-size:11px; white-space:nowrap;">SEMUA</button>
                ${cachedTypes.map((t, idx) => {
                    const color = TYPE_COLORS[idx % TYPE_COLORS.length];
                    return `<button onclick="window.filterInst(${t.id})" class="filter-chip" style="background:${color.bg}; color:${color.text}; border:1px solid ${color.border}; padding:6px 14px; border-radius:20px; font-weight:700; font-size:11px; white-space:nowrap;">${t.type_name}</button>`;
                }).join('')}
            </div>
        </div>

        <div id="inst-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:15px;">
            </div>
        <div id="i-modal-portal"></div>
    `;

    document.getElementById('i-add').onclick = () => openInstModal();
    loadInstitutionGrid();
}

/**
 * Memuat Grid Kartu Institusi [cite: 2026-02-11]
 */
async function loadInstitutionGrid(typeId = 'all') {
    const grid = document.getElementById('inst-grid');
    grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:20px; color:#64748b;">Memuat data institusi...</div>';

    // Query Join Tipe
    let q = supabase.from('es_institutions')
        .select(`*, es_institution_types(id, type_name)`)
        .order('created_at', { ascending: false });

    // Filter Ownership (Kecuali Super Admin Role 1) [cite: 2026-02-10]
    if (currentUserProfile.role_id !== 1) {
        q = q.eq('created_by', currentUserProfile.id);
    }

    if (typeId !== 'all') {
        q = q.eq('inst_type_id', typeId);
    }

    const { data: insts } = await q;

    if (!insts || insts.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; background:white; border-radius:16px; color:#94a3b8; font-weight:bold;">Belum ada data institusi.</div>';
        return;
    }

    grid.innerHTML = insts.map(item => {
        // Tentukan warna berdasarkan ID Tipe [cite: 2026-02-11]
        // Karena ID tipe integer, kita pakai modulo agar warnanya konsisten
        const typeIndex = cachedTypes.findIndex(t => t.id === item.inst_type_id);
        const theme = TYPE_COLORS[(typeIndex >= 0 ? typeIndex : 0) % TYPE_COLORS.length];
        
        // Inisial Nama untuk Logo
        const initial = item.name ? item.name.substring(0, 2).toUpperCase() : '??';

        return `
            <div style="background:white; border-radius:16px; padding:20px; border:1px solid #f1f5f9; box-shadow:0 4px 6px -1px rgba(0,0,0,0.02); position:relative; overflow:hidden;">
                
                <div style="position:absolute; top:0; left:0; right:0; height:6px; background:${theme.text};"></div>

                <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:15px;">
                    <div style="width:50px; height:50px; background:${theme.bg}; color:${theme.text}; border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:20px; font-weight:900; border:2px solid ${theme.border};">
                        ${initial}
                    </div>
                    <div style="text-align:right;">
                        <span style="background:${theme.bg}; color:${theme.text}; font-size:10px; font-weight:800; padding:4px 10px; border-radius:20px; display:inline-block; margin-bottom:4px;">
                            ${item.es_institution_types?.type_name || 'UMUM'}
                        </span>
                        <div style="font-size:10px; color:#94a3b8; font-weight:bold;">${item.city || 'Kota -'}</div>
                    </div>
                </div>

                <div style="font-size:16px; font-weight:800; color:#1e293b; line-height:1.3; margin-bottom:15px; min-height:42px;">
                    ${item.name}
                </div>

                <div style="display:flex; gap:10px; margin-top:10px; border-top:1px solid #f1f5f9; padding-top:15px;">
                    <button onclick="window.editInst('${item.id}')" style="flex:1; background:#f8fafc; border:1px solid #e2e8f0; color:#475569; padding:8px; border-radius:10px; font-size:11px; font-weight:bold; cursor:pointer;">EDIT</button>
                    <button style="flex:1; background:${theme.bg}; border:none; color:${theme.text}; padding:8px; border-radius:10px; font-size:11px; font-weight:bold; cursor:pointer;">DETAIL</button>
                </div>
            </div>
        `;
    }).join('');
}

// Fungsi Filter Global untuk dipanggil tombol [cite: 2026-02-11]
window.filterInst = (id) => loadInstitutionGrid(id);

window.editInst = async (id) => {
    const { data } = await supabase.from('es_institutions').select('*').eq('id', id).single();
    openInstModal(data);
};

function openInstModal(data = null) {
    const isEdit = !!data;
    const portal = document.getElementById('i-modal-portal');

    // Generate Pilihan Tipe [cite: 2026-02-11]
    const typeOptions = cachedTypes.map(t => 
        `<option value="${t.id}" ${data?.inst_type_id === t.id ? 'selected' : ''}>${t.type_name}</option>`
    ).join('');

    portal.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-card">
                <h3 style="margin-top:0; font-size:18px;">${isEdit ? '🏢 Edit Institusi' : '🏥 Institusi Baru'}</h3>
                
                <label class="f-label">Nama Institusi</label>
                <input type="text" id="f-name" class="f-input" value="${data?.name || ''}" placeholder="Contoh: RSUD Sehat Sentosa">

                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                    <div>
                        <label class="f-label">Tipe / Kategori</label>
                        <select id="f-type" class="f-select">${typeOptions}</select>
                    </div>
                    <div>
                        <label class="f-label">Kota / Lokasi</label>
                        <input type="text" id="f-city" class="f-input" value="${data?.city || ''}" placeholder="Jakarta">
                    </div>
                </div>

                <div style="display:flex; gap:10px; margin-top:20px;">
                    <button id="f-save" class="btn-primary">SIMPAN DATA</button>
                    <button onclick="document.getElementById('i-modal-portal').innerHTML=''" class="btn-exit" style="flex:1;">BATAL</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('f-save').onclick = async () => {
        const payload = {
            name: document.getElementById('f-name').value,
            city: document.getElementById('f-city').value,
            inst_type_id: parseInt(document.getElementById('f-type').value),
            created_by: currentUserProfile.id // Ownership Stamping [cite: 2026-02-10]
        };

        const { error } = isEdit 
            ? await supabase.from('es_institutions').update(payload).eq('id', data.id)
            : await supabase.from('es_institutions').insert(payload);

        if (error) alert(error.message);
        else { portal.innerHTML = ''; loadInstitutionGrid(); }
    };
}