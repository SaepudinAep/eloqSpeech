import { supabase } from '../config.js';

let selectedContext = 'admin'; 
let availableRoles = []; // ENRICHMENT: Untuk menampung daftar role dari DB

// --- 1. DATA REFERENSI (EMOJI & WARNA) --- (TETAP ASLI)
const EMOJI_LIST = [
    '📁', '🏠', '⚙️', '📊', '🔒', '🔑', '👤', '👥', '📅', '🔔', '📢', '✅',
    '🏥', '🩺', '💊', '🚑', '🧠', '🫁', '🩸', '🧬', '🧸', '🧩', '🗣️', '👂',
    '🟣', '🔵', '🟢', '🟡', '🟠', '🔴', '⚡', '🌟', '🔥', '💧', '🌲', '🎓',
    '🛠️', '🏷️', '👨‍⚕️', '🗂️'
];

const COLORS = {
    admin:  { bg: '#e0e7ff', text: '#4338ca', border: '#4f46e5', label: 'ADMINISTRATOR' },
    public: { bg: '#fce7f3', text: '#be185d', border: '#db2777', label: 'PUBLIC LANDING' },
    portal: { bg: '#ffedd5', text: '#c2410c', border: '#f97316', label: 'PORTAL USER' },
    
    root:   { bar: '#8b5cf6', bg: '#f5f3ff', icon: '🟣' }, 
    folder: { bar: '#f59e0b', bg: '#fffbeb', icon: '📁' }, 
    module: { bar: '#10b981', bg: '#ecfdf5', icon: '⚡' }  
};

// --- UTILITY: STYLES & TOAST (Standar Proper) --- (TETAP ASLI)
const injectStyles = () => {
    if (document.getElementById('mm-styles')) return;
    const s = document.createElement('style');
    s.id = 'mm-styles';
    s.innerHTML = `
        .switch { position: relative; display: inline-block; width: 34px; height: 18px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e0; transition: .4s; border-radius: 20px; }
        .slider:before { position: absolute; content: ""; height: 12px; width: 12px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .slider { background-color: #4d97ff; }
        input:checked + .slider:before { transform: translateX(16px); }

        .toast-notif { position: fixed; bottom: 30px; right: 30px; background: #48bb78; color: white; padding: 15px 30px; border-radius: 12px; z-index: 10000; font-weight: bold; box-shadow: 0 10px 15px rgba(0,0,0,0.1); font-size: 14px; animation: slideIn 0.3s ease-out; }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    `;
    document.head.appendChild(s);
};

function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'toast-notif'; t.innerText = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

// --- 2. RENDER UTAMA --- (TETAP ASLI + ENRICHMENT ROLE FETCH)
export async function renderMenuManager(containerId) {
    injectStyles();
    const container = document.getElementById(containerId);
    if (!container) return;

    // --- FIX: FORCE FULL WIDTH --- (TETAP ASLI)
    container.style.cssText = "width: 100% !important; max-width: none !important; padding: 20px !important;";

    // ENRICHMENT: Ambil daftar role sebelum render
    const { data: roles } = await supabase.from('es_roles').select('*');
    availableRoles = roles || [];

    const theme = COLORS[selectedContext];
    
    container.innerHTML = `
        <div style="background:${theme.border}; padding:20px; border-radius:16px 16px 0 0; color:white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <div style="font-size:10px; opacity:0.8; letter-spacing:1.5px; font-weight:800; margin-bottom:5px;">KONTEKS APLIKASI</div>
                    <select id="m-context-filter" style="background:none; border:none; color:white; font-size:20px; font-weight:900; cursor:pointer; outline:none; width:100%;">
                        <option value="admin" ${selectedContext === 'admin' ? 'selected' : ''} style="color:#333;">🦄 ADMIN INTERNAL</option>
                        <option value="public" ${selectedContext === 'public' ? 'selected' : ''} style="color:#333;">🚀 PUBLIC LANDING</option>
                        <option value="portal" ${selectedContext === 'portal' ? 'selected' : ''} style="color:#333;">🏥 PORTAL PASIEN</option>
                    </select>
                </div>
                <button id="m-add" class="btn-primary" style="background:white; color:${theme.text}; border:none; padding:12px 25px; font-weight:bold; border-radius:30px; width:auto; box-shadow:0 2px 5px rgba(0,0,0,0.2); font-size:13px;">
                    + BUAT BARU
                </button>
            </div>
        </div>

        <div style="width:100%; border-radius:0 0 16px 16px; padding:10px; background:white; border:1px solid #e2e8f0; border-top:none;">
            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:separate; border-spacing:0 8px;">
                    <tbody id="m-body"></tbody>
                </table>
            </div>
        </div>
        
        <div id="h-modal-portal"></div>
        <div id="icon-picker-portal"></div>
    `;

    document.getElementById('m-context-filter').onchange = (e) => {
        selectedContext = e.target.value;
        renderMenuManager(containerId); 
    };

    document.getElementById('m-add').onclick = () => openMenuModal();
    loadMenuTable();
}

// --- 3. LOGIKA LOAD & SORTING DATA --- (TETAP ASLI)
async function loadMenuTable() {
    const tbody = document.getElementById('m-body');
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Memuat data...</td></tr>';
    
    const { data: menus, error } = await supabase
        .from('es_menus')
        .select(`*, parent:parent_id(label)`)
        .eq('app_context', selectedContext)
        .order('sort_order');

    if (error) {
        tbody.innerHTML = `<tr><td colspan="4" style="color:red; text-align:center;">Error: ${error.message}</td></tr>`;
        return;
    }

    if (!menus || menus.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:40px; color:#94a3b8;">Belum ada menu.</td></tr>`;
        return;
    }

    const sortedMenus = organizeMenuTree(menus);

    tbody.innerHTML = sortedMenus.map(m => {
        const isRoot = m.parent_id === null;
        const isModule = !!m.module_name;
        
        let style = isRoot ? COLORS.root : (isModule ? COLORS.module : COLORS.folder);
        
        const depth = m.depth || 0;
        const indent = `${depth * 35}px`;
        const connector = depth > 0 ? `<span style="color:#cbd5e0; margin-right:8px; font-size:18px;">↳</span>` : '';
        const parentLabel = m.parent?.label ? `SUB DARI: ${m.parent.label.toUpperCase()}` : '';

        return `
            <tr style="background:white; box-shadow: 0 2px 4px rgba(0,0,0,0.02); transition:transform 0.1s;">
                <td style="padding:0; border-radius:12px 0 0 12px; border-left:1px solid #f1f5f9; border-top:1px solid #f1f5f9; border-bottom:1px solid #f1f5f9; width: 60%;">
                    <div style="display:flex; align-items:center; padding:12px; padding-left:${depth === 0 ? '15px' : '10px'}; margin-left:${indent};">
                        ${connector}
                        <div style="width:5px; height:35px; background:${style.bar}; border-radius:4px; margin-right:12px;"></div>
                        <div style="font-size:24px; margin-right:12px;">${m.icon || style.icon}</div>
                        <div>
                            <div style="font-weight:700; color:#1e293b; font-size:14px;">${m.label}</div>
                            ${parentLabel ? `<div style="font-size:10px; color:#94a3b8; font-weight:700;">${parentLabel}</div>` : ''}
                        </div>
                    </div>
                </td>

                <td style="padding:12px; border-top:1px solid #f1f5f9; border-bottom:1px solid #f1f5f9; vertical-align:middle;">
                     ${isModule 
                        ? `<span style="background:${COLORS.module.bg}; color:${COLORS.module.bar}; padding:6px 10px; border-radius:8px; font-size:11px; font-weight:800;">⚡ ${m.module_name}</span>` 
                        : `<span style="background:${COLORS.folder.bg}; color:${COLORS.folder.bar}; padding:6px 10px; border-radius:8px; font-size:11px; font-weight:800;">📂 FOLDER</span>`
                     }
                </td>

                <td style="padding:12px; text-align:center; border-top:1px solid #f1f5f9; border-bottom:1px solid #f1f5f9; vertical-align:middle;">
                    <label class="switch">
                        <input type="checkbox" ${m.is_active ? 'checked' : ''} onchange="window.toggleMenu('${m.id}', this.checked)">
                        <span class="slider"></span>
                    </label>
                </td>

                <td style="padding:12px; text-align:right; border-radius:0 12px 12px 0; border-right:1px solid #f1f5f9; border-top:1px solid #f1f5f9; border-bottom:1px solid #f1f5f9;">
                    <div style="font-size:11px; font-weight:bold; color:#cbd5e0; display:inline-block; margin-right:12px;">#${m.sort_order}</div>
                    <button onclick="window.mEdit('${m.id}')" style="background:#f1f5f9; color:#64748b; border:1px solid #e2e8f0; width:36px; height:36px; border-radius:10px; cursor:pointer;">✏️</button>
                </td>
            </tr>
        `;
    }).join('');
}

function organizeMenuTree(flatMenus, parentId = null, depth = 0) {
    let result = [];
    const children = flatMenus.filter(m => m.parent_id === parentId);
    children.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    children.forEach(child => {
        child.depth = depth; 
        result.push(child);
        const grandChildren = organizeMenuTree(flatMenus, child.id, depth + 1);
        result = result.concat(grandChildren); 
    });
    return result;
}

// --- 4. AKSI & MODAL --- (TETAP ASLI + ENRICHMENT RBAC)
window.toggleMenu = async (id, val) => {
    const { error } = await supabase.from('es_menus').update({ is_active: val }).eq('id', id);
    if (!error) showToast(val ? "Menu diaktifkan" : "Menu disembunyikan");
    else alert(error.message);
};

window.mEdit = async (id) => {
    const { data } = await supabase.from('es_menus').select('*').eq('id', id).single();
    // ENRICHMENT: Ambil data RBAC yang sudah ada
    const { data: assigned } = await supabase.from('es_menu_roles').select('role_id').eq('menu_id', id);
    const assignedRoles = assigned?.map(r => r.role_id) || [];
    openMenuModal({ ...data, assignedRoles });
};

function openMenuModal(data = null) {
    const isEdit = !!data;
    const portal = document.getElementById('h-modal-portal');
    const theme = COLORS[selectedContext]; 

    portal.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-card" style="border-top:8px solid ${theme.border}; width:100% !important; max-width:550px !important;">
                <h3 style="margin-top:0; font-size:18px; color:${theme.text}; margin-bottom:20px; font-weight:800;">
                    ${isEdit ? '✏️ Edit Menu' : '✨ Menu Baru'}
                </h3>
                
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-bottom:15px;">
                    <div>
                        <label class="f-label">Konteks Aplikasi</label>
                        <select id="f-context" class="f-select">
                            <option value="admin" ${selectedContext === 'admin' ? 'selected' : ''}>Admin</option>
                            <option value="public" ${selectedContext === 'public' ? 'selected' : ''}>Public</option>
                            <option value="portal" ${selectedContext === 'portal' ? 'selected' : ''}>Portal</option>
                        </select>
                    </div>
                    <div>
                        <label class="f-label">Ikon Menu</label>
                        <div style="display:flex; gap:8px;">
                            <input type="text" id="f-icon" class="f-input" value="${data?.icon || '📁'}" style="text-align:center; font-size:20px; width:60px; padding:5px;" readonly>
                            <button id="btn-pick-icon" style="flex:1; background:#f1f5f9; border:1px solid #cbd5e0; border-radius:10px; cursor:pointer; font-weight:bold; font-size:12px; color:#475569;">🎨 PILIH</button>
                        </div>
                    </div>
                </div>

                <div style="margin-bottom:15px;">
                    <label class="f-label">Label Menu (Judul)</label>
                    <input type="text" id="f-label" class="f-input" value="${data?.label || ''}" placeholder="Contoh: Manajemen User">
                </div>

                <div style="margin-bottom:15px;">
                    <label class="f-label">Hak Akses Peran (RBAC) - <i>Kontributor Bypass Otomatis</i></label>
                    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap:10px; padding:10px; background:#f8fafc; border-radius:12px; border:1px solid #e2e8f0;">
                        ${availableRoles.map(r => `
                            <label style="display:flex; align-items:center; gap:8px; font-size:11px; font-weight:800; color:#475569; cursor:pointer;">
                                <input type="checkbox" class="role-check" value="${r.id}" ${data?.assignedRoles?.includes(r.id) ? 'checked' : ''}>
                                ${r.role_name.toUpperCase()}
                            </label>
                        `).join('')}
                    </div>
                </div>

                <div style="margin-bottom:15px;">
                    <label class="f-label">Nama Modul JS (Kosongkan jika hanya Folder)</label>
                    <input type="text" id="f-mod" class="f-input" value="${data?.module_name || ''}" placeholder="Contoh: user_management">
                </div>

                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-bottom:20px;">
                    <div>
                        <label class="f-label">Parent ID (Induk)</label>
                        <input type="number" id="f-parent" class="f-input" value="${data?.parent_id || ''}" placeholder="ID...">
                    </div>
                    <div>
                        <label class="f-label">Urutan</label>
                        <input type="number" id="f-sort" class="f-input" value="${data?.sort_order || '1'}">
                    </div>
                </div>

                <div style="display:flex; gap:12px;">
                    <button id="f-save" class="btn-primary" style="background:${theme.border}; border:none; height:50px;">SIMPAN</button>
                    <button onclick="document.getElementById('h-modal-portal').innerHTML=''" class="btn-exit" style="flex:1; height:50px;">BATAL</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('btn-pick-icon').onclick = () => openIconPicker();

    document.getElementById('f-save').onclick = async () => {
        const payload = {
            app_context: document.getElementById('f-context').value,
            label: document.getElementById('f-label').value,
            icon: document.getElementById('f-icon').value,
            module_name: document.getElementById('f-mod').value || null,
            parent_id: document.getElementById('f-parent').value ? parseInt(document.getElementById('f-parent').value) : null,
            sort_order: parseInt(document.getElementById('f-sort').value) || 1,
            is_active: true 
        };

        const { data: savedMenu, error } = isEdit 
            ? await supabase.from('es_menus').update(payload).eq('id', data.id).select().single()
            : await supabase.from('es_menus').insert(payload).select().single();

        if (error) alert("Error: " + error.message);
        else { 
            // ENRICHMENT: Simpan Data ke es_menu_roles
            const menuId = savedMenu.id;
            const selectedRoles = Array.from(document.querySelectorAll('.role-check:checked')).map(cb => parseInt(cb.value));
            
            if (isEdit) await supabase.from('es_menu_roles').delete().eq('menu_id', menuId);
            if (selectedRoles.length > 0) {
                const rbacPayload = selectedRoles.map(rid => ({ menu_id: menuId, role_id: rid }));
                await supabase.from('es_menu_roles').insert(rbacPayload);
            }

            showToast(isEdit ? "Menu diperbarui" : "Menu baru dibuat");
            portal.innerHTML = ''; 
            if(payload.app_context !== selectedContext) selectedContext = payload.app_context;
            renderMenuManager(containerId); 
        }
    };
}

// --- 5. MODAL ICON PICKER --- (TETAP ASLI)
function openIconPicker() {
    const picker = document.getElementById('icon-picker-portal');
    
    const gridHtml = EMOJI_LIST.map(emoji => `
        <button onclick="selectIcon('${emoji}')" style="font-size: 24px; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; cursor: pointer; transition: transform 0.1s;" onmouseover="this.style.background='#e0e7ff'" onmouseout="this.style.background='#f8fafc'">
            ${emoji}
        </button>
    `).join('');

    picker.innerHTML = `
        <div class="modal-overlay" style="z-index:10000; background:rgba(0,0,0,0.8);">
            <div class="modal-card" style="max-width:340px;">
                <h3 style="margin-top:0; text-align:center; font-size:16px;">Pilih Ikon</h3>
                <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:8px; max-height:300px; overflow-y:auto; padding:5px;">
                    ${gridHtml}
                </div>
                <button onclick="document.getElementById('icon-picker-portal').innerHTML=''" class="btn-exit" style="width:100%; margin-top:15px;">TUTUP</button>
            </div>
        </div>
    `;
}

window.selectIcon = (emoji) => {
    const input = document.getElementById('f-icon');
    if (input) input.value = emoji;
    document.getElementById('icon-picker-portal').innerHTML = ''; 
};