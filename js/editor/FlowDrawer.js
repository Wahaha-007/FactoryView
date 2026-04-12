/* js/editor/FlowDrawer.js */
import * as THREE from 'three';

export class FlowDrawer {
    constructor(editor, layerManager, cameraManager) {
        this.editor       = editor;
        this.layerManager = layerManager;
        this.cameraManager = cameraManager;

        this.isActive       = false;
        this.waypoints      = [];   // THREE.Vector3[]
        this.previewObjects = [];   // added to scene, removed on clear

        // Raycasting (same pattern as EditorManager._onCoordMove)
        this.canvas    = cameraManager.controls.domElement;
        this.raycaster = new THREE.Raycaster();
        this.mouse     = new THREE.Vector2();
        this.plane     = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

        // Cached DOM refs (set in init after DOM is ready)
        this.btnDraw    = null;
        this.countLabel = null;
        this.modal      = null;
    }

    init() {
        this.btnDraw    = document.getElementById('btn-draw-flow');
        this.countLabel = document.getElementById('flow-waypoint-count');
        this.modal      = document.getElementById('flow-finish-modal');

        this.canvas.addEventListener('pointerdown', (e) => this._onPointerDown(e));
    }

    /* ---- PUBLIC API ---- */

    startDrawing() {
        this.isActive = true;
        this.waypoints = [];
        this.clearPreview();
        this._updateCount();
    }

    finishDrawing() {
        if (this.waypoints.length < 2) {
            alert('Add at least 2 waypoints before finishing.');
            return;
        }
        if (this.modal) this.modal.style.display = 'block';
    }

    confirmPath(name, color, speed) {
        if (!name.trim()) { alert('Please enter a path name.'); return; }

        const points = this.waypoints
            .map(p => `${Math.round(p.x)},${Math.round(p.z)}`)
            .join(';');

        const floorIdx = this.editor.floorManager.activeFloorIndex;
        const floor    = this.editor.floorManager.floors[floorIdx];
        if (!floor) { console.error('FlowDrawer: no active floor'); return; }

        const item = {
            layerId:  'flow',
            name:     name.trim(),
            x:        0,
            y:        0,
            points,
            color,
            speed:    parseFloat(speed) || 1,
            dashSize: 30,
            gapSize:  15,
            tension:  0.5,
            floorId:  floor.id,
            desc:     'Added via Editor'
        };

        this.layerManager.addItem(item, this.editor.activeFloorHeight);

        this.clearPreview();
        this._closeModal();
        this.isActive = false;
        this._resetButton();
    }

    cancelDrawing() {
        this.clearPreview();
        this._closeModal();
        this.isActive = false;
        this._resetButton();
    }

    clearPreview() {
        const scene = this.layerManager.scene;
        this.previewObjects.forEach(obj => {
            scene.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
        });
        this.previewObjects = [];
    }

    /* ---- PRIVATE ---- */

    _onPointerDown(e) {
        if (!this.isActive || e.button !== 0) return;

        // Raycast against floor plane (identical to EditorManager._onCoordMove)
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.cameraManager.camera);
        this.plane.constant = -(this.editor.activeFloorHeight || 0);
        const hit = new THREE.Vector3();
        if (!this.raycaster.ray.intersectPlane(this.plane, hit)) return;

        this.waypoints.push(hit.clone());
        this._rebuildPreview();
    }

    _rebuildPreview() {
        this.clearPreview();
        const scene  = this.layerManager.scene;
        const y      = (this.editor.activeFloorHeight || 0) + 2;
        const color  = 0xFF8C00;

        // Cone marker at each waypoint
        const coneGeo = new THREE.ConeGeometry(8, 16, 8);
        const coneMat = new THREE.MeshBasicMaterial({ color });
        this.waypoints.forEach(wp => {
            const cone = new THREE.Mesh(coneGeo, coneMat);
            cone.position.set(wp.x, y + 8, wp.z); // elevated so it floats above floor
            scene.add(cone);
            this.previewObjects.push(cone);
        });

        // Preview line connecting all waypoints
        if (this.waypoints.length >= 2) {
            const pts    = this.waypoints.map(wp => new THREE.Vector3(wp.x, y, wp.z));
            const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
            const lineMat = new THREE.LineBasicMaterial({ color, linewidth: 2 });
            const line    = new THREE.Line(lineGeo, lineMat);
            scene.add(line);
            this.previewObjects.push(line);
        }

        this._updateCount();
    }

    _updateCount() {
        if (this.countLabel) {
            const n = this.waypoints.length;
            this.countLabel.textContent = n === 0
                ? 'Click floor to add waypoints'
                : `Waypoints: ${n}`;
        }
    }

    _closeModal() {
        if (this.modal) this.modal.style.display = 'none';
    }

    _resetButton() {
        if (this.btnDraw) {
            this.btnDraw.textContent = 'Draw Flow Path';
            this.btnDraw.style.background = '#e67e00';
        }
        if (this.countLabel) {
            this.countLabel.style.display = 'none';
            this.countLabel.textContent   = '';
        }
    }
}
