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
        this.areaFields        = document.getElementById('area-fields');
        this.inpWidth          = document.getElementById('inp-width');
        this.inpHeight         = document.getElementById('inp-height');
        this.inpColor          = document.getElementById('inp-color');
        this.inpOpacity        = document.getElementById('inp-opacity');
        this.inpBorderColor    = document.getElementById('inp-border-color');
        this.inpBorderThickness = document.getElementById('inp-border-thickness');

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
            newItem = {
                layerId,
                name,
                x:               Math.round(this.tempPos.x),
                y:               Math.round(this.tempPos.z),
                width:           parseInt(this.inpWidth.value)           || 500,
                height:          parseInt(this.inpHeight.value)          || 400,
                color:           this.inpColor.value,
                opacity:         parseFloat(this.inpOpacity.value)       || 0.25,
                borderColor:     this.inpBorderColor.value,
                borderThickness: parseInt(this.inpBorderThickness.value) || 10,
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
