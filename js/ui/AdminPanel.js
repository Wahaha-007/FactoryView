/* js/ui/AdminPanel.js */

const DATA_FILES = [
    { key: 'floor_1_data.xlsx',  label: 'Floor 1 Data' },
    { key: 'floor_2_data.xlsx',  label: 'Floor 2 Data' },
    { key: 'system_config.xlsx', label: 'System Config' },
    { key: 'scene_presets.xlsx', label: 'Scene Presets' },
];

export class AdminPanel {
    constructor() {
        this.container = null;
        this._isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    }

    init(containerEl) {
        this.container = containerEl;
        this._render();
    }

    _render() {
        this.container.innerHTML = '';

        const rows = DATA_FILES.map(f => {
            const row = document.createElement('div');
            row.className = 'admin-file-row';
            row.innerHTML = `
                <span class="admin-file-label">${f.label}</span>
                <a class="admin-dl-btn" href="assets/${f.key}" download="${f.key}" title="Download ${f.key}">⬇</a>
                ${this._isLocal
                    ? `<span class="admin-upload-na" title="Upload requires Vercel">⬆ N/A</span>`
                    : `<label class="admin-ul-btn" title="Upload new ${f.key}">⬆<input type="file" accept=".xlsx" data-file="${f.key}" style="display:none"></label>`
                }
                <span class="admin-status" id="admin-status-${f.key}"></span>
            `;
            return row;
        });

        rows.forEach(r => this.container.appendChild(r));

        if (!this._isLocal) {
            this.container.querySelectorAll('input[type="file"]').forEach(input => {
                input.addEventListener('change', e => this._handleUpload(e));
            });
        }
    }

    async _handleUpload(e) {
        const input  = e.target;
        const file   = input.files[0];
        const filename = input.dataset.file;
        if (!file) return;

        const statusEl = document.getElementById(`admin-status-${filename}`);
        statusEl.textContent = '⟳';
        statusEl.style.color = '#aaa';
        input.value = '';

        try {
            const buffer = await file.arrayBuffer();
            const res = await fetch(`/api/upload?file=${encodeURIComponent(filename)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
                body: buffer,
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `HTTP ${res.status}`);
            }

            statusEl.textContent = '✓';
            statusEl.style.color = '#88ff88';
            setTimeout(() => { statusEl.textContent = ''; }, 3000);

            // Prompt the user to reload so new data is picked up
            if (confirm(`"${filename}" uploaded successfully.\n\nReload page to apply new data?`)) {
                window.location.reload();
            }
        } catch (err) {
            statusEl.textContent = '✗';
            statusEl.style.color = '#ff6666';
            console.error('Upload failed:', err);
            setTimeout(() => { statusEl.textContent = ''; }, 4000);
        }
    }
}
