/* js/ui/PropertiesPanel.js */

export class PropertiesPanel {
    constructor(layerManager) {
        this.layerManager = layerManager;
        this.listContainer = document.getElementById('item-list');
        this.detailsContainer = document.getElementById('item-details'); // <--- ADD THIS
        this.activeLayerId = null;
        this.activeFloorId = null; // Store active floor context
    }

    setFloorFilter(floorId) {
        this.activeFloorId = floorId;
        // If a list is currently open, refresh it immediately
        if (this.activeLayerId) {
            this.showLayerItems(this.activeLayerId);
        }
        console.log(`Floor filter set to: ${floorId}`);
    }
    
    /* js/ui/PropertiesPanel.js */

    // Called when user clicks a Layer name in Left Panel
    showLayerItems(layerId) {
        this.activeLayerId = layerId;
        if (!this.listContainer) return;
        this.listContainer.innerHTML = '';

        // Header
        const header = document.createElement('h3');
        const layerName = this.layerManager.layers[layerId] ? this.layerManager.layers[layerId].name : layerId;
        header.textContent = layerName;
        header.style.cssText = 'padding:10px; border-bottom:1px solid #444; margin:0; position:sticky; top:0; background:#2a2a2a; z-index:5;';
        this.listContainer.appendChild(header);

        // 1. Get All Items
        let items = this.layerManager.getLayerItems(layerId);
        
        // --- 2. APPLY FILTER (THIS IS THE MISSING PART) ---
        if (this.activeFloorId) {
            // Only keep items where item.floorId matches the active floor
            items = items.filter(item => item.floorId === this.activeFloorId);
        }
        // --------------------------------------------------

        if (items.length === 0) {
            const contextMsg = this.activeFloorId ? `on ${this.activeFloorId}` : 'in this layer';
            this.listContainer.innerHTML += `<div class="empty-state">No items ${contextMsg}.</div>`;
            return;
        }

        items.forEach(item => {
            const li = document.createElement('li');
            li.userData = item; // For highlighting logic

            const isInactive = item.status === 'Inactive';
            const floorNum = (item.floorId || '').replace(/\D/g, '') || '?';
            const displayName = `F${floorNum}: ${item.name}`;

            // --- AUDIT CHECK ---
            const auditInfo = this.checkAudit(item.lastAudit);
            const warningHTML = auditInfo.overdue 
                ? `<span title="Audit Overdue" style="font-size:1.2rem;">⚠️</span>` 
                : '';

            // --- HTML STRUCTURE ---
            li.innerHTML = `
                <div class="list-item-left">
                    <span class="list-status-dot" style="background:${isInactive ? '#f44' : '#4f4'}"></span>
                    <span>${displayName}</span>
                </div>
                <div class="list-item-right">
                    ${warningHTML}
                </div>
            `;
            
            // Flex styling for the LI (ensure this is in CSS or inline)
            li.style.display = 'flex';
            li.style.justifyContent = 'space-between';
            li.style.alignItems = 'center';

            li.onclick = () => this.selectItem(item, li);
            this.listContainer.appendChild(li);
        });
    }

// ... rest of the file ...

    // NEW METHOD
    highlightItemInList(item) {
        // 1. Find the LI element
        // We iterate through children because we don't store LI references in a map (though we could for performance)
        const listItems = Array.from(this.listContainer.children);
        
        let targetLi = null;

        listItems.forEach(li => {
            // Reset all
            li.classList.remove('selected');
            
            // Match Logic:
            // We need a robust way to match. Since we changed the display text to "F1: Name",
            // li.textContent won't match item.name exactly anymore.
            // BEST PRACTICE: Attach the item data to the DOM element property
            if (li.userData === item) {
                targetLi = li;
            }
        });

        // 2. Highlight and Scroll
        if (targetLi) {
            targetLi.classList.add('selected');
            
            // Auto-Scroll
            targetLi.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });

            // Also show details
            this.renderDetails(item);
        }
    }

    selectItem(item, liElement) {
        // UI Highlight
        if (liElement) {
            Array.from(this.listContainer.children).forEach(c => c.classList.remove('selected'));
            liElement.classList.add('selected');
        }

        // Show Details
        this.renderDetails(item);

        // Notify Main App (to move camera)
        window.dispatchEvent(new CustomEvent('focus-item', { detail: item }));
    }


    renderDetails(item) {
        // 1. Safety Check
        if (!this.detailsContainer) {
            console.error("Details container not found!");
            return;
        }

        // 2. Audit Helper
        const auditInfo = this.checkAudit(item.lastAudit);
        const auditHTML = auditInfo.overdue 
            ? `<div class="audit-warning" style="color:#ff8888; margin-top:5px;">⚠️ Overdue: ${auditInfo.text}</div>`
            : `<div class="audit-ok" style="color:#88ff88; margin-top:5px;">✓ OK: ${auditInfo.text}</div>`;

        // 3. Render HTML
        this.detailsContainer.innerHTML = `
            <h3 style="margin-top:0; border-bottom:1px solid #444; padding-bottom:5px;">${item.name}</h3>
            
            <div style="font-size:0.9rem; line-height:1.6;">
                <div><strong>Type:</strong> ${item.type || 'N/A'}</div>
                <div><strong>Layer:</strong> ${item.layerId || 'N/A'}</div>
                <div><strong>Floor:</strong> ${item.floorId || 'N/A'}</div>
                <div><strong>Status:</strong> <span style="color:${item.status === 'Inactive' ? '#f44' : '#4f4'}">${item.status}</span></div>
                <div><strong>Pos:</strong> X:${item.x}, Y:${item.y}</div>
                ${auditHTML}
            </div>
            
            <div class="divider" style="height:1px; background:#444; margin:10px 0;"></div>
            
            <div style="color:#aaa; font-style:italic;">
                ${item.desc || 'No description provided.'}
            </div>
        `;
    }


    clear() {
        this.activeLayerId = null;
        if(this.listContainer) this.listContainer.innerHTML = '<div class="empty-state">Select a layer...</div>';
        if(this.detailsContainer) this.detailsContainer.innerHTML = '<div class="hint">Select an item</div>';
    }

    // Utility
    checkAudit(dateVal) {
        if (!dateVal) return { overdue: false, text: "N/A" };
        const date = (dateVal instanceof Date) ? dateVal : new Date(dateVal);
        const yearAgo = new Date();
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        return { overdue: date < yearAgo, text: date.toISOString().split('T')[0] };
    }

    refresh() {
        // Only refresh if a layer is currently selected
        if (this.activeLayerId) {
            console.log("Refreshing Right Panel for Layer:", this.activeLayerId);
            this.showLayerItems(this.activeLayerId);
        }
    }
}
