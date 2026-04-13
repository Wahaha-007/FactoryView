/* js/editor/AddItemModal.js */

export class AddItemModal {
    constructor(editor, layerManager) {
        this.editor = editor;
        this.layerManager = layerManager;

        // DOM Elements — device
        this.modal        = document.getElementById('edit-modal');
        this.inpName      = document.getElementById('inp-name');
        this.inpLayer     = document.getElementById('inp-layer');
        this.inpType      = document.getElementById('inp-type');
        this.btnConfirm   = document.getElementById('btn-confirm');
        this.btnCancel    = document.getElementById('btn-cancel');
        this.deviceFields = document.getElementById('device-fields');

        // DOM Elements — area
        this.areaFields  = document.getElementById('area-fields');
        this.inpX1       = document.getElementById('inp-x1');
        this.inpY1       = document.getElementById('inp-y1');
        this.inpX2       = document.getElementById('inp-x2');
        this.inpY2       = document.getElementById('inp-y2');
        this.inpColor    = document.getElementById('inp-color');
        this.inpOpacity  = document.getElementById('inp-opacity');
        this.inpFontSize = document.getElementById('inp-font-size');

        this.tempPos = null;
    }

    init() {
        if (!this.modal) return;

        window.addEventListener('floor-dblclick', (e) => this.onFloorDoubleClick(e));
        this.btnConfirm.addEventListener('click', () => this.confirm());
        this.btnCancel.addEventListener('click',  () => this.hide());
        this.inpLayer.addEventListener('change',  () => this.updateFields());
    }

    onFloorDoubleClick(e) {
        if (!this.editor.isEditMode) return;

        const { point, clientX, clientY } = e.detail;
        this.tempPos = point;

        // Populate Layer Dropdown
        this.inpLayer.innerHTML = '';
        Object.keys(this.layerManager.layers).forEach(layerId => {
            const layer = this.layerManager.layers[layerId];
            const opt = document.createElement('option');
            opt.value = layerId;
            opt.textContent = layer.name;
            this.inpLayer.appendChild(opt);
        });

        this.updateFields();

        // Show Modal
        // Pre-fill area corner defaults centred on click point
        if (this.inpX1) {
            const cx = Math.round(point.x), cz = Math.round(point.z);
            this.inpX1.value = cx - 250;
            this.inpY1.value = cz - 200;
            this.inpX2.value = cx + 250;
            this.inpY2.value = cz + 200;
        }

        this.modal.style.display = 'block';
        this.modal.style.left = clientX + 'px';
        this.modal.style.top  = clientY + 'px';

        this.inpName.value = '';
        this.inpName.focus();
    }

    updateFields() {
        const layerId = this.inpLayer.value;
        const layer   = this.layerManager.layers[layerId];
        const isArea  = layer && layer.renderType === 'area';

        this.deviceFields.style.display = isArea ? 'none'  : 'block';
        this.areaFields.style.display   = isArea ? 'block' : 'none';

        if (!isArea) {
            const types = this.layerManager.getTypesForLayer(layerId);
            this.inpType.innerHTML = '';
            types.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t;
                opt.textContent = t;
                this.inpType.appendChild(opt);
            });
        }
    }

    confirm() {
        const name    = this.inpName.value.trim();
        const layerId = this.inpLayer.value;
        const layer   = this.layerManager.layers[layerId];

        const floorIdx = this.editor.floorManager.activeFloorIndex;
        if (floorIdx === -1 || !this.editor.floorManager.floors[floorIdx]) {
            console.error("Cannot add item: No active floor selected.");
            return;
        }

        const currentFloorId = this.editor.floorManager.floors[floorIdx].id;
        const floorHeight    = floorIdx * 300;

        if (!name || !this.tempPos) return;

        // Ensure layer is visible
        if (!layer.visible) {
            this.layerManager.toggleLayer(layerId, true);
            window.dispatchEvent(new CustomEvent('refresh-layer-list'));
        }

        let newItem;

        if (layer.renderType === 'area') {
            const x1 = parseInt(this.inpX1.value) || 0;
            const y1 = parseInt(this.inpY1.value) || 0;
            const x2 = parseInt(this.inpX2.value) || 500;
            const y2 = parseInt(this.inpY2.value) || 400;
            newItem = {
                layerId,
                name,
                x:        (x1 + x2) / 2,
                y:        (y1 + y2) / 2,
                x1, y1, x2, y2,
                width:    Math.abs(x2 - x1),
                height:   Math.abs(y2 - y1),
                color:    this.inpColor.value,
                opacity:  parseFloat(this.inpOpacity.value)  || 0.25,
                fontSize: parseInt(this.inpFontSize.value)   || 14,
                desc:    "Added via Editor",
                floorId: currentFloorId
            };
        } else {
            newItem = {
                layerId,
                name,
                type:      this.inpType.value,
                x:         Math.round(this.tempPos.x),
                y:         Math.round(this.tempPos.z),
                desc:      "Added via Editor",
                status:    "Active",
                lastAudit: new Date().toISOString().split('T')[0],
                floorId:   currentFloorId
            };
        }

        this.layerManager.addItem(newItem, floorHeight);
        this.hide();
    }

    hide() {
        this.modal.style.display = 'none';
        this.tempPos = null;
    }
}
