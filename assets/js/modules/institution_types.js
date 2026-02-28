import { supabase } from '../config.js';

// Palet Warna Candy (Rotasi Otomatis) [cite: 2026-02-11]
const THEMES = [
    { bg: '#fee2e2', border: '#fca5a5', text: '#b91c1c' }, // Merah (RS)
    { bg: '#dcfce7', border: '#86efac', text: '#15803d' }, // Hijau (Klinik)
    { bg: '#ffedd5', border: '#fdba74', text: '#c2410c' }, // Orange (Praktek)
    { bg: '#e0e7ff', border: '#a5b4fc', text: '#4338ca' }, // Indigo (Sekolah)
    { bg: '#fae8ff', border: '#f0abfc', text: '#a21caf' }, // Ungu (Home Visit)
    { bg: '#f0fdfa', border: '#5eead4', text: '#0f766e' }, // Teal (Lainnya)
];

// Deteksi Ikon Cerdas berdasarkan Nama [cite: 2026-02-11]
function getSmartIcon(name) {
    const n = name.toLowerCase();
    if (n.includes('sakit') || n.includes('rs')) return '🏥';
    if (n.includes('klinik') || n.includes('clinic')) return '🩺';
    if (n.includes('sekolah') || n.includes('school')) return '🎓';
    if (n.includes('praktek') || n.includes('pribadi')) return '🏠';
    if (n.includes('home') || n.includes('visit') || n.includes('kunjungan')) return '🚗'; // Khusus Home Visit
    if (n.includes('online') || n.includes('tele')) return '💻';
    return '🏷️'; // Default
}

export async function renderInstitutionTypes(containerId) {
    const container = document.getElementById(containerId);

    // Layout Header Vibrant
    container.innerHTML = `
        <div style="background:linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); padding:20px; border-radius:16px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05); margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; border:1px solid #e2e8f0;">
            <div>
                <h3 style="margin:0; font-size:16px; color:#1e293b; font-weight:800; letter-spacing:-0.5px;">KAMUS TIPE INSTITUSI</h3>
                <div style="font-size:11px; color:#64748b; margin-top:4px; font-weight:600;">Definisikan kategori (RS, Klinik, Home Visit)</div>
            </div>
            <button id="t-add" class="btn-primary" style="width:auto; padding:10px 20px; font-size:11px;">+ KATEGORI BARU</button>
        </div>

        <div id="type-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap:15px;">
            </div>
        <div id="t-modal-portal"></div>
    `;

    document.getElementById('t-add').onclick = () => openTypeModal();
    loadTypeGrid();
}

/**
 * Memuat Grid dengan Gaya Candy [cite: 2026-02-11]
 */
async function loadTypeGrid() {
    const grid = document.getElementById('type-grid');
    grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:20px; color:#94a3b8;">Memuat data...</div>';

    const { data: types, error } = await supabase
        .from('es_institution_types')
        .select('*')
        .order('id');

    if (!types || types.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; border:2px dashed #e2e8f0; border-radius:16px; color:#94a3b8; font-weight:bold;">Belum ada kategori data.</div>';
        return;
    }

    grid.innerHTML = types.map((t, idx) => {
        // Rotasi tema warna agar bervariasi
        const theme = THEMES[idx % THEMES.length];
        const icon = getSmartIcon(t.type_name);
        
        return `
            <div style="background:${theme.bg}; border:1px solid ${theme.border}; border-radius:18px; padding:20px; position:relative; transition:transform 0.2s; box-shadow:0 2px 4px rgba(0,0,0,0.02);">
                
                <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:12px;">
                    <div style="font-size:32px; filter:drop-shadow(0 4px 2px rgba(0,0,0,0.05));">${icon}</div>
                    <div style="background:rgba(255,255,255,0.6); padding:4px 8px; border-radius:8px; font-size:10px; font-weight:800; color:${theme.text};">ID: ${t.id}</div>
                </div>
                
                <div style="font-size:15px; font-weight:800; color:${theme.text}; margin-bottom:6px; line-height:1.2;">
                    ${t.type_name}
                </div>
                
                <div style="font-size:11px; color:${theme.text}; opacity:0.8; margin-bottom:18px; line-height:1.4; min-height:32px; font-weight:500;">
                    ${t.description || 'Kategori layanan standar.'}
                </div>

                <div style="display:flex; gap:8px;">
                    <button onclick="window.editType(${t.id})" style="flex:1; background:white; color:${theme.text}; border:1px solid ${theme.border}; padding:8px; border-radius:10px; font-weight:800; font-size:10px; cursor:pointer; box-shadow:0 2px 4px rgba(0,0,0,0.05);">UBAH</button>
                    <button onclick="window.deleteType(${t.id})" style="width:36px; background:#fff1f2; color:#ef4444; border:1px solid #fecaca; border-radius:10px; font-weight:bold; cursor:pointer;">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

window.editType = async (id) => {
    const { data } = await supabase.from('es_institution_types').select('*').eq('id', id).single();
    openTypeModal(data);
};

window.deleteType = async (id) => {
    if (!confirm('Hapus kategori ini? Pastikan tidak ada Institusi yang terhubung.')) return;
    const { error } = await supabase.from('es_institution_types').delete().eq('id', id);
    if (error) alert("Gagal hapus: Data sedang digunakan.");
    else loadTypeGrid();
};

function openTypeModal(data = null) {
    const isEdit = !!data;
    const portal = document.getElementById('t-modal-portal');

    portal.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-card">
                <h3 style="margin-top:0; font-size:18px; color:#1e293b;">${isEdit ? '✏️ Edit Kategori' : '✨ Tambah Kategori'}</h3>
                
                <label class="f-label">Nama Kategori</label>
                <input type="text" id="f-name" class="f-input" value="${data?.type_name || ''}" placeholder="Contoh: Home Visit">

                <label class="f-label">Deskripsi</label>
                <input type="text" id="f-desc" class="f-input" value="${data?.description || ''}" placeholder="Keterangan singkat...">

                <div style="display:flex; gap:10px; margin-top:20px;">
                    <button id="f-save" class="btn-primary">SIMPAN</button>
                    <button onclick="document.getElementById('t-modal-portal').innerHTML=''" class="btn-exit" style="flex:1;">BATAL</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('f-save').onclick = async () => {
        const payload = {
            type_name: document.getElementById('f-name').value,
            description: document.getElementById('f-desc').value
        };

        const { error } = isEdit 
            ? await supabase.from('es_institution_types').update(payload).eq('id', data.id)
            : await supabase.from('es_institution_types').insert(payload);

        if (error) alert(error.message);
        else { portal.innerHTML = ''; loadTypeGrid(); }
    };
}