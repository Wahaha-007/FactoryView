/* js/ui/RoleManager.js */

export class RoleManager {
    constructor() {
        this.role = this._readCookie();
    }

    _readCookie() {
        const m = document.cookie.match(/(?:^|;\s*)auth_role=([^;]+)/);
        const r = m ? m[1] : 'viewer';
        return ['admin', 'editor', 'viewer'].includes(r) ? r : 'viewer';
    }

    getRole()  { return this.role; }
    isAdmin()  { return this.role === 'admin'; }
    canEdit()  { return this.role === 'admin' || this.role === 'editor'; }

    init() {
        // Settings button — admin only
        if (!this.isAdmin()) {
            document.getElementById('btn-settings')?.remove();
        }

        // Edit Mode, Export, Draw Flow — editor+ only
        if (!this.canEdit()) {
            document.getElementById('btn-edit-mode')?.remove();
            document.getElementById('btn-export')?.remove();
            document.getElementById('btn-draw-flow')?.remove();
        }

        // Users panel — admin only
        const btnUsers = document.getElementById('btn-users');
        if (btnUsers) {
            if (this.isAdmin()) {
                btnUsers.style.display = '';
                btnUsers.addEventListener('click', () => this._showUsers());
            } else {
                btnUsers.remove();
            }
        }

        document.getElementById('users-close')?.addEventListener('click', () => {
            document.getElementById('users-modal').style.display = 'none';
        });
    }

    _showUsers() {
        document.getElementById('users-modal').style.display = 'block';
    }
}
