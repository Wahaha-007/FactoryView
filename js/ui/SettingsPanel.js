/* js/ui/SettingsPanel.js */

export class SettingsPanel {
    static KEY = 'fv_settings';

    static load() {
        try { return JSON.parse(localStorage.getItem(SettingsPanel.KEY)) || {}; }
        catch { return {}; }
    }

    static save(data) {
        localStorage.setItem(SettingsPanel.KEY, JSON.stringify(data));
    }

    constructor(layerManager) {
        this.layerManager = layerManager;
        this.modal     = null;
        this.listEl    = null;
    }

    init() {
        this.modal  = document.getElementById('settings-modal');
        this.listEl = document.getElementById('settings-layer-list');

        const btnOpen  = document.getElementById('btn-settings');
        const btnClose = document.getElementById('settings-close');
        const btnSave  = document.getElementById('settings-save');

        if (btnOpen)  btnOpen.addEventListener('click', () => this.show());
        if (btnClose) btnClose.addEventListener('click', () => this._close());
        if (btnSave)  btnSave.addEventListener('click', () => this._save());
    }

    /** Apply saved startup visibility to all layers. Call after layers are loaded. */
    applyStartupVisibility() {
        const settings = SettingsPanel.load();
        const startupVisible = settings.startupVisible || {};
        Object.keys(this.layerManager.layers).forEach(id => {
            if (id in startupVisible) {
                this.layerManager.toggleLayer(id, startupVisible[id]);
            }
        });
    }

    show() {
        if (!this.modal || !this.listEl) return;
        const settings = SettingsPanel.load();
        const startupVisible = settings.startupVisible || {};

        this.listEl.innerHTML = '';
        Object.keys(this.layerManager.layers).forEach(id => {
            const layer = this.layerManager.layers[id];

            // Default: use current layer visibility if no saved preference
            const checked = id in startupVisible ? startupVisible[id] : layer.visible;

            const row = document.createElement('label');
            row.style.cssText = 'display:flex; align-items:center; gap:10px; padding:5px 2px; cursor:pointer; font-size:0.85rem; color:#ccc;';

            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.dataset.layerId = id;
            cb.checked = checked;

            const dot = document.createElement('span');
            dot.style.cssText = `display:inline-block; width:10px; height:10px; border-radius:50%; background:#${layer.color.getHexString()}; flex-shrink:0;`;

            const name = document.createTextNode(layer.name);

            row.appendChild(cb);
            row.appendChild(dot);
            row.appendChild(name);
            this.listEl.appendChild(row);
        });

        this.modal.style.display = 'block';
    }

    _save() {
        const startupVisible = {};
        this.listEl.querySelectorAll('input[type=checkbox]').forEach(cb => {
            startupVisible[cb.dataset.layerId] = cb.checked;
        });
        SettingsPanel.save({ startupVisible });
        this._close();
    }

    _close() {
        if (this.modal) this.modal.style.display = 'none';
    }
}
