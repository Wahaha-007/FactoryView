/* js/ui/ItemPopup.js */

export class ItemPopup {
    constructor() { this.el = null; }

    init() {
        this.el = document.getElementById('item-popup');
        document.getElementById('item-popup-close')
            .addEventListener('click', () => this.hide());
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') this.hide();
        });
        this.el.addEventListener('transitionend', e => {
            if (e.propertyName === 'opacity' && !this.el.classList.contains('open')) {
                this.el.style.display = 'none';
            }
        });
    }

    show(item) {
        if (!this.el) return;

        document.getElementById('item-popup-title').textContent = item.name;

        // Photo (Vercel Blob URL stored in extras.Photo)
        const photoWrap = document.getElementById('item-popup-photo-wrap');
        const photoImg  = document.getElementById('item-popup-photo');
        const photoUrl  = item.extras?.Photo || item.photo || '';
        if (photoUrl) {
            photoImg.src = photoUrl;
            photoWrap.style.display = 'block';
        } else {
            photoWrap.style.display = 'none';
            photoImg.src = '';
        }

        // Description
        const descEl = document.getElementById('item-popup-desc');
        descEl.textContent = item.desc || '';
        descEl.style.display = item.desc ? 'block' : 'none';

        // Status + Last Audit
        const statusEl = document.getElementById('item-popup-status-row');
        const statusColor = (item.status || '').toLowerCase() === 'active' ? '#88ff88' : '#ffaa44';
        statusEl.innerHTML =
            `<span class="ip-status-chip" style="background:${statusColor}22;color:${statusColor};border:1px solid ${statusColor}44">${item.status || 'Unknown'}</span>` +
            (item.lastAudit ? `<span class="ip-audit">Last audit: ${item.lastAudit}</span>` : '');

        // Extras table (skip Photo key — already shown as image)
        const specsEl = document.getElementById('item-popup-specs');
        specsEl.innerHTML = '';
        if (item.extras) {
            Object.entries(item.extras).forEach(([key, val]) => {
                if (key === 'Photo') return;
                const row = document.createElement('div');
                row.className = 'ip-spec-row';
                row.innerHTML = `<span class="ip-spec-key">${key}</span><span class="ip-spec-val">${val ?? '—'}</span>`;
                specsEl.appendChild(row);
            });
        }

        // Spring-open animation: set visible first, then add .open next frame
        this.el.style.display = 'flex';
        requestAnimationFrame(() => requestAnimationFrame(() => {
            this.el.classList.add('open');
        }));
    }

    hide() {
        if (!this.el) return;
        this.el.classList.remove('open');
        // transitionend listener sets display:none after animation completes
    }
}
