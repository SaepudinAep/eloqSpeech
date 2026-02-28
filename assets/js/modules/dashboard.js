import { supabase } from '../config.js';

const LOGO_URL = "https://vkienlwfzvgneyxqzgcx.supabase.co/storage/v1/object/sign/general/Eloq_logo.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8yZjkwZjc5YS05MjVhLTQ3YzctOTQzMy0xNDJiZmVhMjU3M2YiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJnZW5lcmFsL0Vsb3FfbG9nby5wbmciLCJpYXQiOjE3NzA3MTYzMzgsImV4cCI6MjA4NjA3NjMzOH0.EkXa0J5nqm0i3R0o2j6yTpSkN70YaORi2slXnEH_-GA";

export async function renderDashboard(container, user) {
    container.innerHTML = `
        <div style="display:flex; justify-content:center; align-items:center; height:80vh;">
            <div style="color:#4d97ff; font-weight:bold; animation: pulse 1s infinite;">Menyiapkan Dashboard...</div>
        </div>
    `;

    try {
        const { data: profile, error } = await supabase
            .from('es_profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error) throw error;

        // PERBAIKAN: Bungkus semua dalam satu .dashboard-container agar tidak berantakan
        container.innerHTML = `
            <div class="dashboard-container">
                <div class="dashboard-header">
                    <div class="brand-wrapper">
                        <img src="${LOGO_URL}" class="logo-small" alt="Logo">
                        <span>EloqSpeech</span>
                    </div>
                    <button id="btn-logout" class="btn-logout-compact">Keluar</button>
                </div>

                <div class="profile-card">
                    <p class="profile-greeting">Selamat Datang,</p>
                    <h1 class="profile-name">${profile.full_name || 'Pengguna'}</h1>
                    
                    <div class="badge-container">
                        ${profile.role_id === 1 ? '<span class="badge badge-admin">Administrator</span>' : ''}
                        ${profile.is_contributor ? '<span class="badge badge-contributor">Kontributor</span>' : ''}
                        ${profile.is_active ? '<span class="badge badge-active">Active</span>' : ''}
                    </div>
                </div>

                <div class="menu-grid">
                    <div class="menu-item">
                        <span class="menu-icon">👥</span>
                        <div class="menu-title">Pasien</div>
                        <div class="menu-desc">Data Terapi</div>
                    </div>
                    
                    <div class="menu-item">
                        <span class="menu-icon">📊</span>
                        <div class="menu-title">Laporan</div>
                        <div class="menu-desc">Analisa AI</div>
                    </div>
                    
                    <div class="menu-item">
                        <span class="menu-icon">📅</span>
                        <div class="menu-title">Jadwal</div>
                        <div class="menu-desc">Kalender Sesi</div>
                    </div>
                    
                    <div class="menu-item">
                        <span class="menu-icon">⚙️</span>
                        <div class="menu-title">Setelan</div>
                        <div class="menu-desc">Pengaturan</div>
                    </div>
                </div>

                <div style="text-align:center; margin-top:30px; color:#a0aec0; font-size:11px;">
                    EloqSpeech v1.0.0-dev
                </div>
            </div>
        `;

        document.getElementById('btn-logout').addEventListener('click', async () => {
            const btn = document.getElementById('btn-logout');
            btn.innerText = "...";
            await supabase.auth.signOut();
        });

    } catch (err) {
        console.error("Dashboard Error:", err);
        container.innerHTML = `<div class="error-msg">Gagal memuat: ${err.message}</div>`;
    }
}