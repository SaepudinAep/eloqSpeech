// eloq_kernel.js - V1.0.0
// Features: Dynamic Exercise Launcher, Session Management, Metadata Driven.

import { supabase } from '../config.js';

let exercises = [];
let appState = {
    selectedPatientID: null,
    activeSession: null
};

// --- 1. STYLES INJECTION (Sesuai Pola Signature Bapak) ---
function injectStyles() {
    if (document.getElementById('kernel-styles')) return;
    const style = document.createElement('style');
    style.id = 'kernel-styles';
    style.innerHTML = `
        .exercise-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 20px;
            padding: 20px;
        }
        .exercise-card {
            background: white;
            border-radius: 16px;
            border: 1px solid #e2e8f0;
            padding: 20px;
            transition: all 0.2s ease;
            cursor: pointer;
            position: relative;
            overflow: hidden;
        }
        .exercise-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            border-color: #6366f1;
        }
        .difficulty-badge {
            font-size: 10px;
            font-weight: bold;
            padding: 4px 8px;
            border-radius: 20px;
            text-transform: uppercase;
            margin-bottom: 10px;
            display: inline-block;
        }
        .diff-easy { background: #dcfce7; color: #166534; }
        .diff-medium { background: #fef9c3; color: #854d0e; }
        .diff-hard { background: #fee2e2; color: #991b1b; }
        
        .launch-btn {
            width: 100%;
            padding: 12px;
            background: #6366f1;
            color: white;
            border: none;
            border-radius: 12px;
            font-weight: 600;
            cursor: pointer;
            margin-top: 15px;
        }
        .launch-btn:hover { background: #4f46e5; }
    `;
    document.head.appendChild(style);
}

// --- 2. DATABASE LOGIC (DB-DRIVEN) ---

async function fetchExercises() {
    try {
        const { data, error } = await supabase
            .from('es_game_exercises')
            .select(\`
                id,
                label,
                category_name,
                difficulty_level,
                config_json,
                es_game_templates (
                    template_name,
                    module_path
                )
            \`)
            .eq('is_active', true);

        if (error) throw error;
        exercises = data;
    } catch (err) {
        console.error("Kernel Error:", err.message);
        alert("Gagal memuat daftar latihan.");
    }
}

// --- 3. UI RENDERING (Exercise Launcher) ---

export async function renderExerciseLauncher(containerId, patientId = null) {
    injectStyles();
    const container = document.getElementById(containerId);
    if (!container) return;

    appState.selectedPatientID = patientId; // Jika dipanggil dari Caseload

    container.innerHTML = \`<div style="padding:20px; text-align:center;">Memuat Ruang Latihan...</div>\`;
    await fetchExercises();

    if (exercises.length === 0) {
        container.innerHTML = \`<div style="padding:40px; text-align:center; color:#64748b;">Belum ada latihan aktif di database.</div>\`;
        return;
    }

    const cardsHtml = exercises.map(ex => {
        const diffClass = \`diff-\${ex.difficulty_level.toLowerCase()}\`;
        return \`
            <div class="exercise-card" onclick="window.initExercise('\${ex.id}')">
                <div class="difficulty-badge \${diffClass}">\${ex.difficulty_level}</div>
                <h3 style="margin:0 0 5px 0; font-size:18px;">\${ex.label}</h3>
                <p style="margin:0; font-size:13px; color:#64748b;">
                    Kategori: <b>\${ex.category_name}</b><br>
                    Mode: \${ex.es_game_templates.template_name}
                </p>
                <button class="launch-btn">MULAI LATIHAN</button>
            </div>
        \`;
    }).join('');

    container.innerHTML = \`
        <div style="padding: 20px 20px 0 20px;">
            <h2 style="margin:0;">Ruang Latihan Digital</h2>
            <p style="color:#64748b; margin:5px 0 20px 0;">Pilih modul untuk memulai sesi terapi.</p>
        </div>
        <div class="exercise-grid">
            \${cardsHtml}
        </div>
    \`;
}

// --- 4. SESSION & CORE LOGIC ---

window.initExercise = async function(exerciseId) {
    const ex = exercises.find(e => e.id === exerciseId);
    if (!ex) return;

    // Persiapan Sesi (Kernel State)
    appState.activeSession = {
        exercise_id: ex.id,
        patient_id: appState.selectedPatientID,
        start_time: new Date(),
        config: ex.config_json
    };

    console.log("Kernel: Menyiapkan Sesi...", appState.activeSession);

    // Dynamic Module Loader (Logika untuk memanggil Engine)
    // Sesuai pola Bapak, kita panggil module_path dari template
    try {
        const modulePath = ex.es_game_templates.module_path;
        // Inisialisasi engine di sini (Langkah selanjutnya)
        alert(\`Memulai \${ex.label}... (Menunggu Engine: \${modulePath})\`);
    } catch (err) {
        alert("Gagal menjalankan modul game: " + err.message);
    }
};

window.saveClinicalLog = async function(metrics) {
    if (!appState.activeSession) return;

    try {
        const logData = {
            patient_id: appState.activeSession.patient_id,
            exercise_id: appState.activeSession.exercise_id,
            cognitive_latency_ms: metrics.latency,
            precision_offset_rel: metrics.precision,
            jitter_index: metrics.jitter,
            touch_radius: metrics.radius,
            is_success: metrics.success,
            session_metadata: {
                ...metrics.extra,
                client_timestamp: new Date().toISOString()
            }
        };

        const { error } = await supabase.from('es_game_logs').insert([logData]);
        if (error) throw error;
        
        console.log("Log Klinis V1.0.1 Berhasil Disimpan.");
        appState.activeSession = null;
    } catch (err) {
        console.error("Save Log Error:", err.message);
    }
};