import { supabase } from './config.js';
import * as UI from './modules/ui.js';

const APP_CONTEXT = 'admin'; 
let userProfile = null;
let allMenus = [];

window.renderApp = renderApp;

async function init() {
    UI.injectStyles();
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (APP_CONTEXT === 'admin' && !session) return window.location.assign('index.html');

        if (session) {
            // Mengambil profil lengkap termasuk status is_contributor
            const { data: profile } = await supabase.from('es_profiles')
                .select('*, es_roles(role_name)')
                .eq('id', session.user.id).single();
            userProfile = profile;
        }

        /**
         * TETAP PATUH PADA ATURAN:
         * Menggunakan !inner join agar database hanya menarik menu yang sudah memiliki Role.
         * Menu yang belum dikonfigurasi hak aksesnya tidak akan ditarik (Grendel Database).
         */
        const { data: menus } = await supabase.from('es_menus')
            .select('*, es_menu_roles!inner(role_id)') 
            .eq('app_context', APP_CONTEXT)
            .eq('is_active', true)
            .order('sort_order');
        
        const fetchedMenus = menus || [];

        /**
         * ENRICHMENT: Logika Pengecualian Kontributor.
         * Filter ini berjalan setelah database memastikan menu tersebut memiliki hak akses.
         */
        allMenus = fetchedMenus.filter(m => {
            // 1. JALUR KHUSUS: Jika user adalah KONTRIBUTOR, berikan akses penuh ke menu yang ditarik.
            if (userProfile?.is_contributor === true) return true;
            
            // 2. STANDAR RBAC: Jika bukan kontributor, cek kecocokan role_id secara spesifik.
            return m.es_menu_roles.some(r => r.role_id === userProfile?.role_id);
        });

        document.getElementById('loading-screen').style.display = 'none';
        renderApp(null); 
    } catch (e) { console.error(e); }
}

// --- FUNGSI PENCARI JALUR (Breadcrumb Logic) - TETAP ASLI ---
function getCrumbs(currentId) {
    const path = [];
    let tempId = currentId;
    while (tempId) {
        const item = allMenus.find(m => m.id === tempId);
        if (item) {
            path.unshift({ id: item.id, label: item.label });
            tempId = item.parent_id;
        } else break;
    }
    if (currentId !== null) path.unshift({ id: null, label: 'DASHBOARD' });
    return path;
}

// --- FUNGSI RENDER DASHBOARD - TETAP ASLI ---
function renderApp(targetId = null) {
    const app = document.getElementById('dashboard-content');
    const targetItem = allMenus.find(m => m.id === targetId);
    const crumbs = getCrumbs(targetId);

    app.innerHTML = `
        <div class="main-wrapper">
            ${UI.renderHeader(crumbs, userProfile)}
            <div id="dynamic-area"></div>
        </div>
    `;

    document.getElementById('btn-logout').onclick = async () => {
        if(confirm("Logout?")) { await supabase.auth.signOut(); window.location.reload(); }
    };

    const area = document.getElementById('dynamic-area');

    if (targetItem && targetItem.module_name) {
        loadModule(targetItem.module_name, targetItem.label);
    } else {
        area.innerHTML = `<div class="menu-grid" id="menu-grid-root"></div>`;
        const grid = document.getElementById('menu-grid-root');
        
        const subMenus = allMenus.filter(m => m.parent_id === targetId);
        subMenus.forEach(item => {
            const card = document.createElement('div');
            card.className = 'menu-card';
            card.innerHTML = `
                <div class="card-icon">${item.icon || '📁'}</div>
                <div style="font-weight:800; font-size:14px;">${item.label}</div>
                <div style="font-size:10px; color:#4d97ff; margin-top:8px; font-weight:800;">
                    ${item.module_name ? 'APLIKASI' : 'FOLDER'}
                </div>
            `;
            card.onclick = () => renderApp(item.id); 
            grid.appendChild(card);
        });
    }
}

// --- FUNGSI LOAD MODUL - TETAP ASLI ---
async function loadModule(name, label) {
    const area = document.getElementById('dynamic-area');
    area.innerHTML = `<div style="text-align:center; padding:50px; color:#4d97ff;">⏳ Memuat ${label}...</div>`;
    try {
        const mod = await import(`./modules/${name}.js`);
        const funcName = 'render' + name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
        if (mod[funcName]) {
            area.innerHTML = `<div id="mod-root"></div>`;
            mod[funcName]('mod-root');
        }
    } catch (err) { console.error(err); }
}

init();