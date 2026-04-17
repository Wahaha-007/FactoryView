/* js/ui/PaperFormOverlay.js */

export class PaperFormOverlay {
    constructor() { this.el = null; }

    init() {
        this.el = document.getElementById('paper-overlay');
        document.getElementById('paper-overlay-close')
            .addEventListener('click', () => this.hide());
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') this.hide();
        });
        // Reposition whenever panels collapse/expand (UIManager fires 'resize' after transition)
        window.addEventListener('resize', () => {
            if (this.el && this.el.style.display !== 'none') this._reposition();
        });
    }

    _reposition() {
        const canvas = document.getElementById('canvas-container');
        if (!canvas) return;
        const pad = 20;
        const r = canvas.getBoundingClientRect();
        this.el.style.left   = `${r.left   + pad}px`;
        this.el.style.top    = `${r.top    + pad}px`;
        this.el.style.width  = `${r.width  - pad * 2}px`;
        this.el.style.height = `${r.height - pad * 2}px`;
    }

    show(item) {
        if (!this.el) return;
        const ex = item.extras || {};

        document.getElementById('paper-overlay-title').textContent = item.name;
        document.getElementById('po-frequency').textContent  = ex.Frequency  || '—';
        document.getElementById('po-formtype').textContent   = ex.FormType    || '—';
        document.getElementById('po-recordedby').textContent = ex.RecordedBy  || '—';
        document.getElementById('po-purpose').textContent    = ex.Purpose     || '—';

        const schemaEl = document.getElementById('po-schema');
        schemaEl.innerHTML = '';
        (ex.DataSchema || '').split(';').filter(Boolean).forEach(field => {
            const chip = document.createElement('span');
            chip.className = 'po-chip';
            chip.textContent = field.trim();
            schemaEl.appendChild(chip);
        });

        document.getElementById('paper-overlay-iframe').src =
            item.document ? `${item.document}#toolbar=0` : '';

        this._reposition();
        this.el.style.display = 'flex';
    }

    hide() {
        if (!this.el) return;
        document.getElementById('paper-overlay-iframe').src = '';
        this.el.style.display = 'none';
    }
}
