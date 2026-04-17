export class PropertiesPanel {
    constructor(layerManager) {
        this.layerManager = layerManager;
        this.listContainer    = document.getElementById('item-list');
        this.detailsContainer = document.getElementById('item-details');
        this.activeLayerId = null;
        this.activeFloorId = null;
    }

    setFloorFilter(floorId) {
        this.activeFloorId = floorId;
        if (this.activeLayerId) {
            this.showLayerItems(this.activeLayerId);
        }
        console.log(`Floor filter set to: ${floorId}`);
    }

    showLayerItems(layerId) {
        this.activeLayerId = layerId;
        if (!this.listContainer) return;
        this.listContainer.innerHTML = '';

        const header = document.createElement('h3');
        const layerName = this.layerManager.layers[layerId]
            ? this.layerManager.layers[layerId].name : layerId;
        header.textContent = layerName;
        header.style.cssText = 'padding:10px; border-bottom:1px solid #444; margin:0; position:sticky; top:0; background:#2a2a2a; z-index:5;';
        this.listContainer.appendChild(header);

        let items = this.layerManager.getLayerItems(layerId);

        if (this.activeFloorId) {
            items = items.filter(item => item.floorId === this.activeFloorId);
        }

        if (items.length === 0) {
            const contextMsg = this.activeFloorId ? `on ${this.activeFloorId}` : 'in this layer';
            this.listContainer.innerHTML += `<div class="empty-state">No items ${contextMsg}.</div>`;
            return;
        }

        items.forEach(item => {
            const li = document.createElement('li');
            li.userData = item;

            const isInactive = item.status === 'Inactive';
            const floorNum   = (item.floorId || '').replace(/\D/g, '') || '?';
            const displayName = `F${floorNum}: ${item.name}`;

            const auditInfo   = this.checkAudit(item.lastAudit);
            const warningHTML = auditInfo.overdue
                ? `<span title="Audit Overdue" style="font-size:1.2rem;">⚠️</span>` : '';

            li.innerHTML = `
                <div class="list-item-left">
                    <span class="list-status-dot" style="background:${isInactive ? '#f44' : '#4f4'}"></span>
                    <span>${displayName}</span>
                </div>
                <div class="list-item-right">${warningHTML}</div>
            `;
            li.style.display        = 'flex';
            li.style.justifyContent = 'space-between';
            li.style.alignItems     = 'center';

            li.onclick = () => this.selectItem(item, li);
            this.listContainer.appendChild(li);
        });
    }

    highlightItemInList(item) {
        const listItems = Array.from(this.listContainer.children);
        let targetLi = null;

        listItems.forEach(li => {
            li.classList.remove('selected');
            if (li.userData === item) targetLi = li;
        });

        if (targetLi) {
            targetLi.classList.add('selected');
            targetLi.scrollIntoView({ behavior: 'smooth', block: 'center' });
            this.renderDetails(item);
        }
    }

    selectItem(item, liElement) {
        if (liElement) {
            Array.from(this.listContainer.children).forEach(c => c.classList.remove('selected'));
            liElement.classList.add('selected');
        }
        this.renderDetails(item);
        window.dispatchEvent(new CustomEvent('focus-item', { detail: item }));
    }

    renderDetails(item) {
        if (!this.detailsContainer) {
            console.error("Details container not found!");
            return;
        }

        // --- Document link ---
        const docHTML = item.document
            ? `<div style="margin-bottom:10px;">
                 <a href="${item.document.replace(/^assets\/docs\//, '/api/docs/')}" target="_blank" rel="noopener"
                    style="display:block; padding:8px 12px; background:#1a3a4a; color:#00d2ff;
                           border:1px solid #00d2ff55; border-radius:4px; text-align:center;
                           text-decoration:none; font-size:0.85rem;">
                     📄 View Document
                 </a>
               </div>`
            : '';

        // --- Audit row ---
        const auditInfo = this.checkAudit(item.lastAudit);
        const auditHTML = auditInfo.overdue
            ? `<div class="audit-warning" style="color:#ff8888; margin-top:5px;">⚠️ Overdue: ${auditInfo.text}</div>`
            : `<div class="audit-ok"     style="color:#88ff88; margin-top:5px;">✓ OK: ${auditInfo.text}</div>`;

        // --- Custom columns (IP, MAC, Switch, Port, etc.) ---
        let extrasHTML = '';
        if (item.extras && Object.keys(item.extras).length > 0) {
            const rows = Object.entries(item.extras)
                .map(([key, val]) => `<div><strong>${key}:</strong> ${val ?? '—'}</div>`)
                .join('');
            extrasHTML = `
                <div style="height:1px; background:#444; margin:10px 0;"></div>
                <div style="font-size:0.78rem; color:#777; text-transform:uppercase;
                            letter-spacing:1px; margin-bottom:6px;">Custom Fields</div>
                ${rows}
            `;
        }

        // --- Description ---
        const descHTML = item.desc
            ? `<div style="height:1px; background:#444; margin:10px 0;"></div>
               <div style="color:#aaa; font-style:italic;">${item.desc}</div>`
            : '';

        // ← No <h3> name here anymore
        this.detailsContainer.innerHTML = `
            <div style="font-size:0.9rem; line-height:1.8;">
                ${docHTML}
                <div><strong>Type:</strong> ${item.type || 'N/A'}</div>
                <div><strong>Status:</strong>
                    <span style="color:${item.status === 'Inactive' ? '#f44' : '#4f4'}">
                        ${item.status}
                    </span>
                </div>
                ${auditHTML}
                ${extrasHTML}
                ${descHTML}
            </div>
        `;
    }

    clear() {
        this.activeLayerId = null;
        if (this.listContainer)    this.listContainer.innerHTML    = '<div class="empty-state">Select a layer...</div>';
        if (this.detailsContainer) this.detailsContainer.innerHTML = '<div class="hint">Select an item</div>';
    }

    checkAudit(dateVal) {
        if (!dateVal) return { overdue: false, text: "N/A" };
        const date = (dateVal instanceof Date) ? dateVal : new Date(dateVal);
        const yearAgo = new Date();
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        return { overdue: date < yearAgo, text: date.toISOString().split('T')[0] };
    }

    refresh() {
        if (this.activeLayerId) {
            console.log("Refreshing Right Panel for Layer:", this.activeLayerId);
            this.showLayerItems(this.activeLayerId);
        }
    }
}