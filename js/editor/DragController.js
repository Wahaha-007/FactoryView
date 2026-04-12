/* js/editor/DragController.js */
import * as THREE from 'three';

export class DragController {
    constructor(editor, layerManager, cameraManager) {
        this.editor = editor;
        this.layerManager = layerManager;
        this.cameraManager = cameraManager;
        
        this.canvas = cameraManager.controls.domElement;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Drag State
        this.dragObject = null;
        this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        this.dragHelper = null;
    }

    init() {
        // Create Helper (Ring)
        const ringGeo = new THREE.RingGeometry(15, 20, 32);
        ringGeo.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide });
        this.dragHelper = new THREE.Mesh(ringGeo, ringMat);
        this.dragHelper.visible = false;
        
        // Add to scene (be careful about when layerManager scene is ready, usually ok in init)
        if(this.layerManager.scene) this.layerManager.scene.add(this.dragHelper);

        // Events
        this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        this.canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
        this.canvas.addEventListener('pointerup', (e) => this.onPointerUp(e));
    }

    getMouse(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        return this.mouse;
    }

    onPointerDown(e) {
        if (!this.editor.isEditMode || e.button !== 0) return; // Left click only
        if (this.editor.isDrawingFlow) return; // Flow path drawing takes priority

        this.raycaster.setFromCamera(this.getMouse(e), this.cameraManager.camera);

        // Collect interactables from visible layers
        let interactables = [];
        Object.values(this.layerManager.layers).forEach(l => {
            if (l.visible) interactables.push(l.group);
        });

        const intersects = this.raycaster.intersectObjects(interactables, true);

        if (intersects.length > 0) {
            let obj = intersects[0].object;
            // Traverse up to find the root group (which has userData)
            while(obj && !obj.userData.layerId && obj.parent) {
                obj = obj.parent;
            }

            if (obj && obj.userData.layerId) {
                this.dragObject = obj;
                this.cameraManager.controls.enabled = false; // Disable cam orbit

                // Highlight
                if(this.dragObject.material) {
                    if(!this.dragObject.userData.savedEmissive) 
                        this.dragObject.userData.savedEmissive = this.dragObject.material.emissive.getHex();
                    this.dragObject.material.emissive.setHex(0xaaaaaa);
                }

                // Show Helper
                this.dragHelper.visible = true;
                this.dragHelper.position.copy(obj.position);
                this.dragHelper.position.y = (obj.userData.floorOffset || 0) + 2; // Slightly above floor
            }
        }
    }

    onPointerMove(e) {
        if (!this.editor.isEditMode || !this.dragObject) return;

        this.raycaster.setFromCamera(this.getMouse(e), this.cameraManager.camera);
        
        // Update Drag Plane to match current floor height
        const floorHeight = this.editor.activeFloorHeight || 0;
        this.dragPlane.constant = -floorHeight; 

        const target = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.dragPlane, target);

        if (target) {
            // Calculate Elevation based on Model Type (Cone=50, etc)
            // Or just keep existing Y relative to floor
            const item = this.dragObject.userData;
            // We assume LayerManager handles elevation in updateItemPosition, 
            // but for smooth dragging we set it manually here:
            // const modelElevation = (item.type === 'Server' ...) ? ... 
            // Simpler: Just keep Y, move X/Z
            const currentY = this.dragObject.position.y;
            this.dragObject.position.set(target.x, currentY, target.z);

            // Move Helper (Stick to floor)
            this.dragHelper.position.set(target.x, floorHeight + 2, target.z);
        }
    }

    onPointerUp(e) {
        if (this.dragObject) {
            const item = this.dragObject.userData;
            const newX = Math.round(this.dragObject.position.x);
            const newY = Math.round(this.dragObject.position.z);

            // Commit change
            this.layerManager.updateItemPosition(item, newX, newY);

            // Restore Material
            if(this.dragObject.material) {
                 const saved = this.dragObject.userData.savedEmissive || 0x000000;
                 this.dragObject.material.emissive.setHex(saved);
            }

            this.dragObject = null;
            this.dragHelper.visible = false;
            this.cameraManager.controls.enabled = true;
        }
    }
}
