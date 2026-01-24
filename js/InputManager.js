import * as THREE from 'three';

export class InputManager extends EventTarget {
    constructor(sceneManager, layerManager) {
        super();
        this.camera = sceneManager.camera;
        this.scene = sceneManager.scene;
        this.domElement = sceneManager.renderer.domElement;
        this.layerManager = layerManager;

        this.raycaster = new THREE.Raycaster();
        this.isEditMode = false;

        this.domElement.addEventListener('click', (e) => this.onClick(e));
        this.domElement.addEventListener('dblclick', (e) => this.onDoubleClick(e));
    }

    setEditMode(active) {
        this.isEditMode = active;
        this.domElement.style.cursor = active ? 'crosshair' : 'default';
    }

    getMouseCoords(event) {
        const rect = this.domElement.getBoundingClientRect();
        return {
            x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
            y: -((event.clientY - rect.top) / rect.height) * 2 + 1
        };
    }

    onClick(event) {
        const coords = this.getMouseCoords(event);
        this.raycaster.setFromCamera(coords, this.camera);

        // Check Layer Items
        let interactables = [];
        Object.values(this.layerManager.layers).forEach(l => {
            if (l.visible) interactables.push(l.group);
        });

        const intersects = this.raycaster.intersectObjects(interactables, true);
        
        if (intersects.length > 0) {
            let obj = intersects[0].object;
            // Traverse up to find the user data object
            while(obj && !obj.userData.layerId && obj.parent) {
                obj = obj.parent;
            }
            
            if (obj.userData && obj.userData.layerId) {
                // UNIFIED EVENT: Dispatch to window
                window.dispatchEvent(new CustomEvent('item-clicked', { detail: obj.userData }));
            }
        }
    }

    onDoubleClick(event) {
        if (!this.isEditMode) return;

        const coords = this.getMouseCoords(event);
        this.raycaster.setFromCamera(coords, this.camera);
        
        const intersects = this.raycaster.intersectObjects(this.scene.children);
        // Find the floor (PlaneGeometry)
        const floorHit = intersects.find(hit => hit.object.geometry && hit.object.geometry.type === 'PlaneGeometry');

        if (floorHit) {
            window.dispatchEvent(new CustomEvent('floor-dblclick', { 
                detail: { 
                    point: floorHit.point, 
                    clientX: event.clientX, 
                    clientY: event.clientY 
                } 
            }));
        }
    }
}
