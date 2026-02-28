import { supabase } from './config.js';

const LOGO_URL = "https://vkienlwfzvgneyxqzgcx.supabase.co/storage/v1/object/public/general/Eloq_logo.png";

/**
 * Memverifikasi hak akses pengguna secara hierarkis
 * ENRICHMENT: Mengembalikan data profil jika sukses agar bisa disimpan.
 */
async function verifyAccess(userId) {
    try {
        const { data: profile, error } = await supabase
            .from('es_profiles')
            .select('*, es_roles(role_name)') // Perkaya: Ambil detail lengkap
            .eq('id', userId)
            .single();

        if (error || !profile) return null;

        // 1. CEK STATUS AKTIF:
        if (profile.is_active !== true) {
            console.warn("Akses Ditolak: Akun dinonaktifkan.");
            return null;
        }

        // 2. CEK WEWENANG: Super Admin (1) atau Kontributor
        const isAllowed = profile.role_id === 1 || profile.is_contributor === true;

        return isAllowed ? profile : null;
    } catch (err) {
        return null;
    }
}

/**
 * Merender Form Login ke dalam DOM (TETAP ASLI)
 */
function renderLoginForm() {
    const container = document.getElementById('app');
    if (!container) return;
    
    container.innerHTML = `
        <div class="card">
            <img src="${LOGO_URL}" alt="EloqSpeech" class="logo-large">
            <h2>Login EloqSpeech</h2>
            
            <input type="email" id="login-email" placeholder="Email" autocomplete="email">
            <input type="password" id="login-password" placeholder="Password" autocomplete="current-password">
            
            <button id="btn-login" class="btn-login">MASUK</button>
            
            <div id="auth-error" class="error-msg"></div>
        </div>
    `;

    document.getElementById('btn-login').addEventListener('click', handleLogin);
}

/**
 * Proses Login dengan Feedback & Persistensi LocalStorage
 */
async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('auth-error');

    if (!email || !password) {
        errorDiv.innerText = "Email dan password wajib diisi.";
        return;
    }

    errorDiv.innerText = "Memverifikasi...";

    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // Validasi Akses & Ambil Profil
        const profileData = await verifyAccess(data.user.id);
        
        if (profileData) {
            // ENRICHMENT: Tanam data di LocalStorage agar "identitas" tidak hilang saat pindah halaman
            localStorage.setItem('eloq_user_profile', JSON.stringify(profileData));
            window.location.assign('main.html');
        } else {
            // Logout paksa jika syarat tidak terpenuhi
            await supabase.auth.signOut();
            localStorage.removeItem('eloq_user_profile');
            errorDiv.innerText = "Akses Ditolak: Izin tidak mencukupi.";
        }
    } catch (err) {
        errorDiv.innerText = "Login Gagal: " + err.message;
    }
}

/**
 * Inisialisasi: Cek Sesi Aktif (TETAP ASLI)
 */
async function init() {
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        const profileData = await verifyAccess(session.user.id);
        if (profileData) {
            localStorage.setItem('eloq_user_profile', JSON.stringify(profileData));
            window.location.assign('main.html');
            return;
        } else {
            await supabase.auth.signOut();
            localStorage.removeItem('eloq_user_profile');
        }
    }
    
    renderLoginForm();
}

init();