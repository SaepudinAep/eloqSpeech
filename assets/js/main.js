/**
 * [ PRO-CLEAN ] ELOQ CORE MAIN.JS V3
 * Optimized: Shell Rendering, State Management, & Patient Session Enforcement
 */
import { supabase } from './config.js';
import * as UI from './modules/ui.js';

// --- 1. GLOBAL STATE (Single Source of Truth) ---
const State = {
    context: 'admin',
    user: null,
    menus: [],
    activePatient: null,
    isShellRendered: false
};

// --- 2. INITIALIZATION ---
async function init() {
    UI.injectStyles();
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return window.location.assign('index.html');

        // Fetch Profile & Menus secara Paralel (Lebih Cepat)
        const [profileRes, menuRes] = await Promise.all([
            supabase.from('es_profiles').select('*, es_roles(role_name)').eq('id', session.user.id).single(),
            supabase.from('es_menus').select('*, es_menu_roles!inner(role_id)').eq('app_context', State.context).eq('is_active', true).order('sort_order')
        ]);

        State.user = profileRes.data;
        
        // RBAC Filtering
        State.menus = (menuRes.data || []).filter(m => {
            if (State.user?.is_contributor) return true;
            return m.es_menu_roles.some(r => r.role_id === State.user?.role_id);
        });

        // Load Active Patient Session
        const savedPatient = localStorage.getItem('eloq_active_patient');
        if (savedPatient) State.activePatient = JSON.parse(savedPatient);

        document.getElementById('loading-screen')?.remove();
        
        // Jalankan aplikasi
        renderApp(null);

    } catch (err) {
        console.error("System Failure:", err);
    }
}

// --- 3. CORE RENDERING (THE ORCHESTRATOR) ---
function renderApp(targetId = null) {
    const container = document.getElementById('dashboard-content');
    const crumbs = getCrumbs(targetId);

    // A. RENDER SHELL (Hanya 1x Seumur Hidup Sesi)
    if (!State.isShellRendered) {
        container.innerHTML = `
            <div class="main-wrapper">
                <header id="header-region"></header>
                <main id="dynamic-area" style="min-height: 80vh;"></main>
            </div>
        `;
        setupGlobalEvents();
        State.isShellRendered = true;
    }

    // B. UPDATE HEADER (Update Breadcrumb & Patient Pill saja)
    document.getElementById('header-region').innerHTML = UI.renderHeader(crumbs, State.user);

    // C. ROUTING LOGIC
    const area = document.getElementById('dynamic-area');
    const target = State.menus.find(m => m.id === targetId);

    if (target?.module_name) {
        loadModule(target.module_name, target.label);
    } else {
        renderGrid(targetId, area);
    }
}

// --- 4. SUB-RENDERERS ---
function renderGrid(parentId, container) {
    const items = State.menus.filter(m => m.parent_id === parentId);
    container.innerHTML = `<div class="menu-grid"></div>`;
    const grid = container.querySelector('.menu-grid');

    grid.innerHTML = items.map(item => `
        <div class="menu-card" onclick="renderApp(${item.id})">
            <div class="card-icon">${item.icon || '📁'}</div>
            <div style="font-weight:800; font-size:14px; color:#1e293b;">${item.label}</div>
            <div style="font-size:10px; color:#4d97ff; margin-top:8px; font-weight:800;">
                ${item.module_name ? 'APLIKASI' : 'FOLDER'}
            </div>
        </div>
    `).join('');
}

async function loadModule(name, label) {
    const area = document.getElementById('dynamic-area');
    area.innerHTML = `<div style="text-align:center; padding:100px; color:#4d97ff; font-weight:800;">⏳ LOADING ${label.toUpperCase()}...</div>`;
    
    try {
        const mod = await import(`./modules/${name}.js`);
        const funcName = 'render' + name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
        
        if (mod[funcName]) {
            area.innerHTML = `<div id="mod-root"></div>`;
            // INJEKSI: Kirim State Pasien Aktif ke Modul
            mod[funcName]('mod-root', State.activePatient);
        } else {
            throw new Error(`Module entry point [${funcName}] not found.`);
        }
    } catch (err) {
        area.innerHTML = `<div style="padding:40px; color:red;">❌ Error loading ${name}: ${err.message}</div>`;
    }
}

// --- 5. HELPERS ---
function getCrumbs(currentId) {
    const path = [];
    let tid = currentId;
    while (tid) {
        const m = State.menus.find(i => i.id === tid);
        if (m) { path.unshift({ id: m.id, label: m.label, icon: m.icon }); tid = m.parent_id; }
        else break;
    }
    return path;
}

function setupGlobalEvents() {
    // Event delegation untuk Logout (Hanya dipasang 1x di body)
    document.body.addEventListener('click', async (e) => {
        if (e.target.closest('#btn-logout')) {
            if (confirm("Logout dan Akhiri Sesi?")) {
                localStorage.removeItem('eloq_active_patient');
                await supabase.auth.signOut();
                window.location.reload();
            }
        }
    });
}

// Panggil Global Accessor
window.renderApp = renderApp;

init();