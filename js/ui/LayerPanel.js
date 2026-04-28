/* js/ui/LayerPanel.js */

export class LayerPanel {
    constructor(layerManager, updateRightPanelCallback) {
        this.layerManager = layerManager;
        this.onLayerToggle = updateRightPanelCallback;
        this.container = document.getElementById('layer-list');
        // Track which groups are collapsed: groupName -> bool
        this._collapsed = new Map();
    }

    init() {
        if (!this.container) return;
        this.renderControls();
        this.renderList();
    }

    renderControls() {
        if (!this.container.parentNode) return;

        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'display:flex; gap:6px; margin-bottom:10px; padding-bottom:10px; border-bottom:1px solid #444;';

        wrapper.appendChild(this.createBtn("▼ Expand All",   () => this._setAllCollapsed(false)));
        wrapper.appendChild(this.createBtn("▶ Collapse All", () => this._setAllCollapsed(true)));

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

    _setAllCollapsed(collapsed) {
        Object.values(this.layerManager.layers).forEach(layer => {
            this._collapsed.set(layer.group_name || 'Other', collapsed);
        });
        this.renderList();
    }

    renderList() {
        this.container.innerHTML = '';

        // Collect layers grouped by group_name, preserving insertion order
        const groups = new Map(); // groupName -> [{ id, layer }]
        Object.keys(this.layerManager.layers).forEach(id => {
            const layer = this.layerManager.layers[id];
            const gname = layer.group_name || 'Other';
            if (!groups.has(gname)) groups.set(gname, []);
            groups.get(gname).push({ id, layer });
        });

        groups.forEach((entries, groupName) => {
            // Default: groups start expanded
            if (!this._collapsed.has(groupName)) this._collapsed.set(groupName, false);

            // Group header
            const header = document.createElement('div');
            header.className = 'layer-group-header';
            const isCollapsed = this._collapsed.get(groupName);
            header.innerHTML = `<span class="layer-group-arrow">${isCollapsed ? '▶' : '▼'}</span> ${groupName}`;
            header.addEventListener('click', () => {
                const cur = this._collapsed.get(groupName);
                this._collapsed.set(groupName, !cur);
                body.style.display = !cur ? 'none' : 'block';
                header.querySelector('.layer-group-arrow').textContent = !cur ? '▶' : '▼';
            });
            this.container.appendChild(header);

            // Group body
            const body = document.createElement('div');
            body.className = 'layer-group-body';
            body.style.display = isCollapsed ? 'none' : 'block';

            entries.forEach(({ id, layer }) => {
                const row = document.createElement('div');
                row.className = 'layer-item';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = layer.visible;
                checkbox.onchange = (e) => {
                    this.layerManager.toggleLayer(id, e.target.checked);
                    if (!e.target.checked && this.onLayerToggle) {
                        this.onLayerToggle(id, false);
                    }
                };

                const dot = document.createElement('span');
                dot.style.cssText = `display:inline-block; width:12px; height:12px; border-radius:50%; margin:0 8px 0 5px; border:1px solid #555; background-color:#${layer.color.getHexString()}`;

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

                // Cycle button — only for layers with Name1 / Name2 columns
                if (this.layerManager.hasAlternateLabels(id)) {
                    const modeLabels = ['N', 'N1', 'N2', 'N3'];
                    const cycleBtn = document.createElement('button');
                    cycleBtn.className = 'label-cycle-btn';
                    const currentMode = this.layerManager._labelModes[id] ?? 0;
                    cycleBtn.textContent = modeLabels[currentMode];
                    cycleBtn.title = 'Cycle label: Name → Name1 → Name2 → Name3 (obsolete)';
                    cycleBtn.onclick = (e) => {
                        e.stopPropagation();
                        const newMode = this.layerManager.cycleLabelMode(id);
                        cycleBtn.textContent = modeLabels[newMode ?? 0];
                    };
                    row.appendChild(cycleBtn);
                }
                body.appendChild(row);
            });

            this.container.appendChild(body);
        });
    }
}
