/**
 * ELOQ UI CORE MODULE (FINAL RESPONSIVE)
 * Fix: Tablet Portrait Full Width & Breadcrumb
 */

export function renderHeader(crumbs = [], profile = null) {
    const userName = profile?.full_name || 'Pengguna';
    const userRole = profile?.es_roles?.role_name || 'USER';
    const userInitial = userName.charAt(0).toUpperCase();
    const logoUrl = "https://vkienlwfzvgneyxqzgcx.supabase.co/storage/v1/object/public/general/Eloq_logo.png";

    const breadcrumbHtml = crumbs.length > 0 
        ? crumbs.map((c, i) => `
            <span class="crumb-item" onclick="window.renderApp(${c.id})">${c.label.toUpperCase()}</span>
            ${i < crumbs.length - 1 ? '<span class="crumb-sep">/</span>' : ''}
          `).join('')
        : '<span class="crumb-item active" onclick="window.renderApp(null)">DASHBOARD</span>';

    return `
        <div class="nav-bar">
            <div class="nav-left">
                <div class="brand-group" onclick="window.renderApp(null)" style="cursor:pointer; display:flex; align-items:center; gap:10px;">
                    <img src="${logoUrl}" class="logo-icon" alt="Eloq">
                </div>
                <div class="v-line"></div>
                <div class="breadcrumb-container">
                    ${breadcrumbHtml}
                </div>
            </div>

            <div class="nav-right">
                <div class="user-info-box">
                    <span class="u-name-label">${userName}</span>
                    <span class="u-role-tag">${userRole.toUpperCase()}</span>
                </div>
                <div class="u-avatar-box">${userInitial}</div>
                <div class="v-line"></div>
                <button id="btn-logout" class="btn-logout-danger" title="Logout"></button>
            </div>
        </div>
    `;
}

export function injectStyles() {
    if (document.getElementById('eloq-core-css')) return;
    const s = document.createElement('style');
    s.id = 'eloq-core-css';
    // PERBAIKAN: Media Query untuk Tablet Portrait (max-width: 768px)
    // Mengurangi padding wrapper agar konten bisa lebih lebar
    s.innerHTML = `
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; }
        body { background-color: #f8fafc; color: #1e293b; }
        
        .main-wrapper { 
            width: 100%; 
            padding: 15px; 
            display: flex; 
            flex-direction: column; 
            gap: 20px; 
        }

        /* FIX TABLET PORTRAIT */
        @media (max-width: 768px) {
            .main-wrapper { padding: 8px; } /* Kurangi padding di layar sempit */
            .nav-bar { padding: 10px; }
            .user-info-box { display: none; } /* Sembunyikan nama user di mobile/tablet portrait */
        }

        /* HEADER BOX */
        .nav-bar { 
            display: flex; justify-content: space-between; align-items: center; 
            background: white; padding: 10px 20px; border-radius: 20px; 
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;
        }

        .nav-left, .nav-right { display: flex; align-items: center; gap: 12px; }
        .logo-icon { height: 32px; width: auto; }
        .v-line { width: 1px; height: 20px; background: #e2e8f0; margin: 0 5px; }

        /* BREADCRUMB STYLE */
        .breadcrumb-container { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 800; color: #4d97ff; }
        .crumb-item { cursor: pointer; opacity: 0.6; transition: 0.2s; white-space: nowrap; }
        .crumb-item:hover { opacity: 1; text-decoration: underline; }
        .crumb-item:last-child { opacity: 1; cursor: default; pointer-events: none; color: #1e40af; }
        .crumb-sep { color: #cbd5e1; font-weight: 400; }

        /* USER IDENTITY */
        .user-info-box { text-align: right; display: flex; flex-direction: column; }
        .u-name-label { font-size: 12px; font-weight: 800; color: #1e293b; }
        .u-role-tag { font-size: 9px; font-weight: 700; color: #4d97ff; background: #eff6ff; padding: 2px 6px; border-radius: 6px; border: 1px solid #bfdbfe; margin-top: 2px; align-self: flex-end; }
        
        .u-avatar-box { 
            width: 36px; height: 36px; background: #4d97ff; color: white; 
            border-radius: 10px; display: flex; align-items: center; justify-content: center; 
            font-weight: 800; font-size: 15px; box-shadow: 0 4px 6px rgba(77, 151, 255, 0.2);
        }

        .btn-logout-danger { background: #fff5f5; border: 1px solid #fecaca; color: #ef4444; padding: 8px 12px; border-radius: 12px; cursor: pointer; }

        /* GRID SYSTEM */
        .menu-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 15px; }
        .menu-card { background: white; padding: 25px 15px; border-radius: 24px; text-align: center; cursor: pointer; border: 1px solid transparent; transition: 0.2s; }
        .menu-card:active { transform: scale(0.95); }
        .card-icon { font-size: 40px; margin-bottom: 12px; }
    `;
    document.head.appendChild(s);
}
