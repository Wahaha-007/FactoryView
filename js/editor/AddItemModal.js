/* js/editor/AddItemModal.js */

export class AddItemModal {
    constructor(editor, layerManager) {
        this.editor = editor;
        this.layerManager = layerManager;

        // DOM Elements
        this.modal = document.getElementById('edit-modal');
        this.inpName = document.getElementById('inp-name');
        this.inpLayer = document.getElementById('inp-layer');
        this.inpType = document.getElementById('inp-type');
        this.btnConfirm = document.getElementById('btn-confirm');
        this.btnCancel = document.getElementById('btn-cancel');

        this.tempPos = null;
    }

    init() {
        if (!this.modal) return;

        window.addEventListener('floor-dblclick', (e) => this.onFloorDoubleClick(e));
        this.btnConfirm.addEventListener('click', () => this.confirm());
        this.btnCancel.addEventListener('click', () => this.hide());
        this.inpLayer.addEventListener('change', () => this.updateTypeDropdown());
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

        this.updateTypeDropdown();

        // Show Modal
        this.modal.style.display = 'block';
        this.modal.style.left = clientX + 'px';
        this.modal.style.top = clientY + 'px';

        this.inpName.value = '';
        this.inpName.focus();
    }

    updateTypeDropdown() {
        const layerId = this.inpLayer.value;
        const types = this.layerManager.getTypesForLayer(layerId);

        this.inpType.innerHTML = '';
        types.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            opt.textContent = t;
            this.inpType.appendChild(opt);
        });
    }

    confirm() {
        const name = this.inpName.value;
        const layerId = this.inpLayer.value;
        const type = this.inpType.value;

        // --- NEW LOGIC START ---
        
        // 1. Get Active Floor Index from FloorManager (via EditorManager)
        const floorIdx = this.editor.floorManager.activeFloorIndex;
        
        // Safety Check
        if (floorIdx === -1 || !this.editor.floorManager.floors[floorIdx]) {
            console.error("Cannot add item: No active floor selected.");
            return;
        }

        const currentFloorId = this.editor.floorManager.floors[floorIdx].id;
        
        // 2. Calculate Floor Height Offset (Assuming 300 units per floor)
        // Ideally use FloorManager constant if available, otherwise 300 is the hardcoded gap
        const floorHeight = floorIdx * 300; 

        if (!name || !this.tempPos) return;

        // Ensure layer is visible
        const targetLayer = this.layerManager.layers[layerId];
        if (!targetLayer.visible) {
            this.layerManager.toggleLayer(layerId, true);
            window.dispatchEvent(new CustomEvent('refresh-layer-list'));
        }

        // 3. Create Item Object
        const newItem = {
            layerId: layerId,
            name: name,
            type: type,
            // X and Y correspond to the 2D plane coordinates
            // (Note: In 3D space, Y is 'Z', but Excel calls it 'Y')
            x: Math.round(this.tempPos.x),
            y: Math.round(this.tempPos.z), 
            desc: "Added via Editor",
            status: "Active",
            lastAudit: new Date().toISOString().split('T')[0],
            floorId: currentFloorId // Tag for Filtering/Exporting
        };

        // 4. Add Item with Visual Offset
        // pass floorHeight as the second argument to elevate the model
        this.layerManager.addItem(newItem, floorHeight);

        // --- NEW LOGIC END ---

        this.hide();
    }

    hide() {
        this.modal.style.display = 'none';
        this.tempPos = null;
    }
}
