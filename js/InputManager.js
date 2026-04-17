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
        this._hoveredVisual = null;

        this.domElement.addEventListener('click',       (e) => this.onClick(e));
        this.domElement.addEventListener('dblclick',    (e) => this.onDoubleClick(e));
        this.domElement.addEventListener('pointermove', (e) => this._onPointerMove(e));

        this._tooltip = document.getElementById('flow-tooltip');
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

    _onPointerMove(event) {
        if (!this._tooltip) return;
        if (this.isEditMode) return; // edit mode has its own pointer handling

        // Collect all invisible hit-tube meshes from visible flow layers
        const hitMeshes = [];
        const meshToVisual = new Map();
        Object.values(this.layerManager.layers).forEach(layer => {
            if (layer.renderType !== 'flow' || !layer.visible) return;
            layer.group.children.forEach(visual => {
                if (!visual.visible) return; // skip floor-filtered visuals
                if (visual._flowHitMesh) {
                    hitMeshes.push(visual._flowHitMesh);
                    meshToVisual.set(visual._flowHitMesh, visual);
                }
            });
        });

        if (hitMeshes.length === 0) { this._clearHover(); return; }

        const coords = this.getMouseCoords(event);
        this.raycaster.setFromCamera(coords, this.camera);
        const hits = this.raycaster.intersectObjects(hitMeshes, false);

        if (hits.length > 0) {
            const visual = meshToVisual.get(hits[0].object);
            if (visual && visual !== this._hoveredVisual) {
                this._clearHover();
                this._hoveredVisual = visual;
                if (visual._flowLine) {
                    visual._flowLine.material.opacity = 1.0;
                }
            }
            const item = visual?.userData;
            if (item) {
                this._tooltip.textContent = item.product || item.name;
                this._tooltip.style.display = 'block';
                this._tooltip.style.left = (event.clientX + 14) + 'px';
                this._tooltip.style.top  = (event.clientY - 10) + 'px';
            }
            this.domElement.style.cursor = 'pointer';
        } else {
            this._clearHover();
        }
    }

    _clearHover() {
        if (this._hoveredVisual) {
            const line = this._hoveredVisual._flowLine;
            if (line) {
                line.material.opacity = 0.6;
            }
            this._hoveredVisual = null;
        }
        if (this._tooltip) this._tooltip.style.display = 'none';
        if (!this.isEditMode) this.domElement.style.cursor = 'default';
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
