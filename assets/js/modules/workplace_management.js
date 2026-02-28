// [ COPY BUTTON - WORKPLACE MANAGEMENT MANUAL ]
// Modul Tanpa Google API - Ringan & Cepat [cite: 2026-02-11]

import { supabase } from '../config.js';

export async function renderWorkplaceManagement(targetId) {
    const root = document.getElementById(targetId);
    
    root.innerHTML = `
        <div class="main-wrapper" style="max-width:600px; margin:0 auto; padding:10px;">
            <div style="background:white; padding:20px; border-radius:24px; border:1px solid #e2e8f0; margin-bottom:20px;">
                <h3 style="color:#1e293b; font-size:16px; margin-bottom:15px;">🏢 Tambah Tempat Praktik</h3>
                
                <div style="margin-bottom:15px;">
                    <label style="font-size:12px; font-weight:800; color:#64748b;">NAMA INSTANSI / UNIT</label>
                    <input type="text" id="wp-name" class="f-input" placeholder="Contoh: RS Medika atau Home Visit">
                </div>

                <div style="margin-bottom:15px;">
                    <label style="font-size:12px; font-weight:800; color:#64748b;">KOTA</label>
                    <input type="text" id="wp-city" class="f-input" placeholder="Contoh: Jakarta Selatan">
                </div>

                <div style="margin-bottom:20px;">
                    <label style="font-size:12px; font-weight:800; color:#64748b;">TIPE LAYANAN</label>
                    <select id="wp-type" class="f-input" style="background:white;">
                        <option value="1">Klinik Mandiri</option>
                        <option value="2">Rumah Sakit</option>
                        <option value="3">Sekolah</option>
                        <option value="4">Pusat Layanan</option>
                        <option value="6">Home Visit / Private</option>
                    </select>
                </div>

                <button id="btn-add-wp" class="btn-primary" style="background:#4d97ff; width:100%; font-weight:800;">SIMPAN LOKASI</button>
                <div id="wp-status" style="margin-top:10px; font-size:12px; text-align:center; display:none;"></div>
            </div>

            <h3 style="color:#1e293b; font-size:16px; margin-bottom:15px;">📍 Daftar Lokasi Saya</h3>
            <div id="wp-list" style="display:flex; flex-direction:column; gap:12px;">
                <div style="text-align:center; padding:20px; color:#94a3b8;">Memuat data...</div>
            </div>
        </div>
    `;

    fetchMyWorkplaces();
    document.getElementById('btn-add-wp').onclick = handleAddWorkplace;
}

async function handleAddWorkplace() {
    const name = document.getElementById('wp-name').value.trim();
    const city = document.getElementById('wp-city').value.trim();
    const typeId = document.getElementById('wp-type').value;
    const status = document.getElementById('wp-status');

    if (!name || !city) {
        alert("Nama dan Kota wajib diisi!");
        return;
    }

    status.style.display = 'block';
    status.style.color = '#4d97ff';
    status.innerText = "⏳ Sedang memproses...";

    try {
        const { data: { session } } = await supabase.auth.getSession();
        const uid = session.user.id;

        // 1. Cek apakah institusi sudah ada di master (Case Insensitive)
        let { data: inst } = await supabase.from('es_institutions')
            .select('id')
            .ilike('name', name)
            .ilike('city', city)
            .single();

        let instId = inst?.id;

        // 2. Jika belum ada, buat baru
        if (!instId) {
            const isVerified = (typeId == "6"); // Home visit otomatis verified
            const { data: newInst, error: errI } = await supabase.from('es_institutions').insert([{
                name: name,
                city: city,
                inst_type_id: typeId,
                is_verified: isVerified,
                created_by: uid
            }]).select().single();
            
            if (errI) throw errI;
            instId = newInst.id;
        }

        // 3. Hubungkan ke Terapis
        const { error: errT } = await supabase.from('es_therapist_workplaces').insert([{
            therapist_id: uid,
            institution_id: instId
        }]);

        if (errT) {
            if (errT.code === '23505') {
                status.style.color = '#ffab19';
                status.innerText = "⚠️ Lokasi ini sudah ada di daftar Anda.";
            } else throw errT;
        } else {
            status.style.color = '#10b981';
            status.innerText = "✅ Berhasil ditambahkan!";
            document.getElementById('wp-name').value = "";
            document.getElementById('wp-city').value = "";
            fetchMyWorkplaces();
        }
    } catch (e) {
        status.style.color = '#ef4444';
        status.innerText = "❌ Error: " + e.message;
    }
}

async function fetchMyWorkplaces() {
    const area = document.getElementById('wp-list');
    const { data: { session } } = await supabase.auth.getSession();

    const { data, error } = await supabase
        .from('es_therapist_workplaces')
        .select('id, is_primary, es_institutions(name, city, inst_type_id)')
        .eq('therapist_id', session.user.id);

    if (!data || data.length === 0) {
        area.innerHTML = `<div style="text-align:center; padding:30px; border:2px dashed #e2e8f0; border-radius:18px; color:#94a3b8; font-size:13px;">Belum ada tempat praktik.</div>`;
        return;
    }

    area.innerHTML = data.map(item => `
        <div style="background:white; padding:16px; border-radius:18px; border:1px solid #edf2f7; display:flex; justify-content:space-between; align-items:center;">
            <div>
                <div style="font-weight:800; color:#1e293b; font-size:14px;">${item.es_institutions.name}</div>
                <div style="font-size:11px; color:#64748b; margin-top:2px;">
                    📍 ${item.es_institutions.city} • ${item.es_institutions.inst_type_id == 6 ? '🏠 Home Visit' : '🏥 Institusi'}
                </div>
            </div>
            <div style="display:flex; gap:12px;">
                <button onclick="window.setPrimary('${item.id}')" style="background:none; border:none; cursor:pointer;">${item.is_primary ? '⭐' : '☆'}</button>
                <button onclick="window.removeWP('${item.id}')" style="background:none; border:none; cursor:pointer; color:#ef4444;">🗑️</button>
            </div>
        </div>
    `).join('');
}

window.setPrimary = async (id) => {
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from('es_therapist_workplaces').update({ is_primary: false }).eq('therapist_id', session.user.id);
    await supabase.from('es_therapist_workplaces').update({ is_primary: true }).eq('id', id);
    fetchMyWorkplaces();
};

window.removeWP = async (id) => {
    if (confirm("Hapus dari daftar Anda?")) {
        await supabase.from('es_therapist_workplaces').delete().eq('id', id);
        fetchMyWorkplaces();
    }
};