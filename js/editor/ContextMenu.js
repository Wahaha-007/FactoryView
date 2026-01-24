/* js/editor/ContextMenu.js */
import * as THREE from 'three';

export class ContextMenu {
    constructor(editor, layerManager, cameraManager) {
        this.editor = editor;
        this.layerManager = layerManager;
        this.cameraManager = cameraManager;
        
        this.menu = document.getElementById('context-menu');
        this.btnDelete = document.getElementById('btn-delete');
        this.selectedItem = null;
        this.raycaster = new THREE.Raycaster();
    }

    init() {
        if(!this.menu) return;
        
        const canvas = this.cameraManager.controls.domElement;
        canvas.addEventListener('contextmenu', (e) => this.onContextMenu(e));
        
        this.btnDelete.addEventListener('click', () => this.deleteSelectedItem());
        window.addEventListener('click', () => this.hide());
    }

    onContextMenu(e) {
        if (!this.editor.isEditMode) return;
        e.preventDefault();

        // Raycast to find item
        const rect = this.cameraManager.controls.domElement.getBoundingClientRect();
        const mouse = {
            x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
            y: -((e.clientY - rect.top) / rect.height) * 2 + 1
        };

        this.raycaster.setFromCamera(mouse, this.cameraManager.camera);
        
        let interactables = [];
        Object.values(this.layerManager.layers).forEach(l => {
            if (l.visible) interactables.push(l.group);
        });

        const intersects = this.raycaster.intersectObjects(interactables, true);

        if (intersects.length > 0) {
            let obj = intersects[0].object;
            while(obj && !obj.userData.layerId && obj.parent) { obj = obj.parent; }

            if (obj && obj.userData.layerId) {
                this.selectedItem = obj.userData;
                this.menu.style.display = 'block';
                this.menu.style.left = e.clientX + 'px';
                this.menu.style.top = e.clientY + 'px';
            }
        }
    }

    deleteSelectedItem() {
        if (this.selectedItem && confirm(`Delete item "${this.selectedItem.name}"?`)) {
            this.layerManager.removeItem(this.selectedItem);
            this.hide();
        }
    }

    hide() {
        if(this.menu) this.menu.style.display = 'none';
        this.selectedItem = null;
    }
}
