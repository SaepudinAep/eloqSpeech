// --- START OF FILE assets/js/modules/ai-model-syncer.js ---

import { supabase } from '../config.js';

let modelList = [];

// --- 1. TOAST NOTIFICATION SYSTEM ---
// Catatan: Idealnya, fungsi ini berada di satu modul UI terpusat untuk diimpor.
// Namun, untuk menjaga modul ini mandiri, kita definisikan di sini.
const showToast = (msg, type = 'success') => {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        // Gaya untuk container toast agar posisinya benar
        container.style.cssText = 'position:fixed; bottom:20px; left:50%; transform:translateX(-50%); z-index:10000; width:90%; max-width:400px;';
        document.body.appendChild(container);
    }
    const t = document.createElement('div');
    const bgColor = type === 'success' ? '#10b981' : (type === 'danger' ? '#ef4444' : '#3b82f6');
    t.style.cssText = `padding:12px 20px; border-radius:10px; color:white; margin-bottom:10px; font-size:13px; font-weight:600; background:${bgColor}; box-shadow:0 4px 12px rgba(0,0,0,0.1); transition: opacity 0.3s; text-align:center;`;
    t.innerText = msg;
    container.appendChild(t);
    setTimeout(() => {
        t.style.opacity = '0';
        setTimeout(() => t.remove(), 300);
    }, 3000);
};

// --- 2. GLOBAL ACTIONS (Agar bisa dipanggil dari atribut onclick di HTML) ---

// Aksi 1: Sinkronisasi dengan OpenRouter (via Edge Function)
window.triggerSync = async () => {
    const btn = document.getElementById('btn-sync-now');
    if (btn) {
        btn.innerHTML = "⌛ MENGHUBUNGKAN...";
        btn.disabled = true;
    }

    try {
        // Panggil Edge Function 'ai-model-syncer'
        const { data, error } = await supabase.functions.invoke('ai-model-syncer');
        
        if (error) throw error;
        
        showToast(`Sinkronisasi Sukses! ${data.count || 0} Model Diperbarui/Ditambahkan.`);
        await loadModels(); // Refresh tabel secara otomatis
    } catch (err) {
        console.error("Sync Error:", err);
        showToast("Gagal melakukan sinkronisasi: " + err.message, "danger");
    } finally {
        if (btn) {
            btn.innerHTML = "🔄 SYNC DARI OPENROUTER";
            btn.disabled = false;
        }
    }
};

// Aksi 2: Update Prioritas & Status Aktif
window.updateAiSetting = async (modelId, key, value) => {
    try {
        const updates = {};
        // Konversi tipe data jika diperlukan
        updates[key] = (key === 'priority') ? parseInt(value) : value;

        const { error } = await supabase.from('es_ai_models').update(updates).eq('model_id', modelId);
        if (error) throw error;
        
        showToast("Pengaturan berhasil disimpan");
    } catch (err) {
        showToast("Gagal memperbarui: " + err.message, "danger");
        // Jika gagal, muat ulang data untuk mengembalikan ke state semula
        await loadModels(); 
    }
};

// --- 3. FUNGSI RENDER UTAMA ---

export const renderAiModelSyncer = async (containerId) => { 
      const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container dengan ID "${containerId}" tidak ditemukan.`);
        return;
    }

    // Render Kerangka HTML Modul
    container.innerHTML = `
        <div style="padding:20px; font-family:'Inter', sans-serif; max-width: 1200px; margin: 0 auto;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; background:white; padding:15px 20px; border-radius:16px; border:1px solid #e2e8f0; box-shadow: 0 2px 5px rgba(0,0,0,0.02);">
                <div>
                    <h2 style="margin:0; color:#1e293b; font-size: 20px;">AI Command Center</h2>
                    <p style="font-size:12px; color:#64748b; margin:4px 0 0 0;">Kelola prioritas dan ketersediaan model OpenRouter.</p>
                </div>
                <button id="btn-sync-now" onclick="window.triggerSync()" 
                    style="background:#4f46e5; color:white; padding:10px 20px; border:none; border-radius:10px; font-weight:700; cursor:pointer; font-size:12px; display:flex; align-items:center; gap:8px;">
                    🔄 SYNC DARI OPENROUTER
                </button>
            </div>
            
            <div style="background:white; border-radius:16px; border:1px solid #e2e8f0; overflow:hidden; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
                <table style="width:100%; border-collapse:collapse; text-align:left;">
                    <thead style="background:#f8fafc; font-size:11px; text-transform:uppercase; color:#64748b; font-weight:800; letter-spacing: 0.5px;">
                        <tr>
                            <th style="padding:15px 20px;">Identitas Model</th>
                            <th style="padding:15px; width:100px; text-align:center;">Prioritas</th>
                            <th style="padding:15px; width:120px; text-align:center;">Latensi (ms)</th>
                            <th style="padding:15px; width:80px; text-align:center;">Aktif</th>
                        </tr>
                    </thead>
                    <tbody id="ai-model-table-body">
                        <tr><td colspan="4" style="padding:50px; text-align:center; color:#94a3b8;">⏳ Menghubungkan ke database...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Setelah kerangka dirender, muat data dari database
    await loadModels();
};

// --- 4. FUNGSI PEMUAT DATA ---
async function loadModels() {
    const tbody = document.getElementById('ai-model-table-body');
    if (!tbody) return;

    try {
        const { data, error } = await supabase.from('es_ai_models')
            .select('*')
            .order('priority', { ascending: true }); // Urutkan berdasarkan prioritas: 1 (Tertinggi) -> 99 (Terendah)
        
        if (error) throw error;
        
        modelList = data || [];

        if (modelList.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="padding:50px; text-align:center; color:#64748b;">
                <strong>Database Kosong</strong><br>
                Klik tombol "SYNC DARI OPENROUTER" untuk mengisi data awal.
            </td></tr>`;
            return;
        }

        tbody.innerHTML = modelList.map(m => {
            // Logika pewarnaan latensi untuk feedback visual
            let latColor = '#10b981'; // Hijau (<1s)
            let latBg = '#ecfdf5';
            if (m.avg_latency_ms > 1000) { latColor = '#f59e0b'; latBg = '#fffbeb'; } // Kuning (>1s)
            if (m.avg_latency_ms > 3000) { latColor = '#ef4444'; latBg = '#fef2f2'; } // Merah (>3s)

            return `
            <tr style="border-top:1px solid #f1f5f9; font-size:13px; transition:0.1s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                <td style="padding:15px 20px;">
                    <div style="font-weight:700; color:#1e293b; font-size:14px;">${m.model_name}</div>
                    <div style="font-size:11px; color:#94a3b8; font-family:monospace; margin-top:2px;">${m.model_id}</div>
                    ${m.is_free_model ? '<span style="font-size:9px; background:#eff6ff; color:#3b82f6; padding:2px 6px; border-radius:4px; font-weight:700; margin-top:4px; display:inline-block;">FREE TIER</span>' : ''}
                </td>
                <td style="padding:15px; text-align:center;">
                    <input type="number" value="${m.priority}" 
                        style="width:50px; text-align:center; border:1px solid #cbd5e1; border-radius:8px; padding:6px; font-weight:700; outline:none;" 
                        onchange="window.updateAiSetting('${m.model_id}', 'priority', this.value)">
                </td>
                <td style="padding:15px; text-align:center;">
                    <span style="padding:4px 12px; border-radius:20px; font-size:11px; font-weight:800; background:${latBg}; color:${latColor};">
                        ${m.avg_latency_ms || 0} ms
                    </span>
                </td>
                <td style="padding:15px; text-align:center;">
                    <label class="switch" style="cursor:pointer;">
                        <input type="checkbox" ${m.is_active ? 'checked' : ''} 
                            style="accent-color: #4f46e5; width:18px; height:18px; cursor:pointer;"
                            onchange="window.updateAiSetting('${m.model_id}', 'is_active', this.checked)">
                    </label>
                </td>
            </tr>
            `;
        }).join('');

    } catch (err) {
        console.error("Load Error:", err);
        tbody.innerHTML = `<tr><td colspan="4" style="padding:30px; text-align:center; color:#ef4444; background:#fef2f2;">
            <strong>Gagal Memuat Data:</strong><br>${err.message}
        </td></tr>`;
    }
}

// --- END OF FILE ---```
