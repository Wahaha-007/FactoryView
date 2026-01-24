/* js/ui/LayerPanel.js */

export class LayerPanel {
    constructor(layerManager, updateRightPanelCallback) {
        this.layerManager = layerManager;
        this.onLayerToggle = updateRightPanelCallback; // Callback to clear right panel if needed
        this.container = document.getElementById('layer-list');
    }

    init() {
        if (!this.container) return;
        this.renderControls();
        this.renderList();
    }

    renderControls() {
        // Insert "All / None" buttons above the list
        if(!this.container.parentNode) return;

        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'display:flex; gap:10px; margin-bottom:10px; padding-bottom:10px; border-bottom:1px solid #444;';

        const btnAll = this.createBtn("All", () => this.setAll(true));
        const btnNone = this.createBtn("None", () => this.setAll(false));

        wrapper.appendChild(btnAll);
        wrapper.appendChild(btnNone);
        
        this.container.parentNode.insertBefore(wrapper, this.container);
    }

    createBtn(text, onClick) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.fontSize = "0.8rem";
        btn.style.padding = "4px";
        btn.onclick = onClick;
        return btn;
    }

    setAll(visible) {
        Object.keys(this.layerManager.layers).forEach(id => {
            this.layerManager.toggleLayer(id, visible);
        });
        this.renderList();
    }

    renderList() {
        this.container.innerHTML = '';
        Object.keys(this.layerManager.layers).forEach(id => {
            const layer = this.layerManager.layers[id];
            
            const row = document.createElement('div');
            row.className = 'layer-item'; // CSS class

            // Checkbox
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = layer.visible;
            checkbox.onchange = (e) => {
                this.layerManager.toggleLayer(id, e.target.checked);
                if (!e.target.checked && this.onLayerToggle) {
                    this.onLayerToggle(id, false); // Notify to clear selection if layer hidden
                }
            };

            // Color Dot
            const dot = document.createElement('span');
            dot.style.cssText = `display:inline-block; width:12px; height:12px; border-radius:50%; margin:0 8px 0 5px; border:1px solid #555; background-color:#${layer.color.getHexString()}`;

            // Name Label
            const label = document.createElement('span');
            label.textContent = layer.name;
            label.style.cursor = 'pointer';
            label.onclick = () => {
                if (layer.visible && this.onLayerToggle) this.onLayerToggle(id, true);
                else alert("Turn on the layer first.");
            };

            row.appendChild(checkbox);
            row.appendChild(dot);
            row.appendChild(label);
            this.container.appendChild(row);
        });
    }
}
