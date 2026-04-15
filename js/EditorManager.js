/* js/editor/EditorManager.js */
import * as THREE from 'three';
import { DragController } from './editor/DragController.js';
import { ContextMenu } from './editor/ContextMenu.js';
import { AddItemModal } from './editor/AddItemModal.js';
import { DataExporter } from './editor/DataExporter.js';
import { FlowDrawer } from './editor/FlowDrawer.js';

export class EditorManager {
    constructor(layerManager, inputManager, cameraManager, floorManager) {
        this.layerManager = layerManager;
        this.inputManager = inputManager;
        this.cameraManager = cameraManager;
        this.floorManager = floorManager;

        this.isEditMode = false;
        this.activeFloorHeight = 0;
        this.activeFloorDims = { width: 1000, depth: 1000 }; // Default
        this.activeFloorInfo = null; // Store full floor info

        // UI Elements
        this.btnEdit = document.getElementById('btn-edit-mode');
        this.btnExport = document.getElementById('btn-export');
        this.coordDisplay = document.getElementById('coord-display');

        // Coordinate raycasting
        this.coordRaycaster = new THREE.Raycaster();
        this.coordMouse = new THREE.Vector2();
        this.coordPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

        // Sub-Modules
        this.dragController = new DragController(this, layerManager, cameraManager);
        this.contextMenu = new ContextMenu(this, layerManager, cameraManager);
        this.addItemModal = new AddItemModal(this, layerManager);
        this.exporter = new DataExporter(layerManager);
        this.flowDrawer = new FlowDrawer(this, layerManager, cameraManager);
    }

    /* js/EditorManager.js */

    init() {
        // 1. Bind UI Buttons
        if (this.btnEdit) this.btnEdit.addEventListener('click', () => this.toggleEditMode());

        const btnTop = document.getElementById('btn-top');
        if (btnTop) {
            btnTop.addEventListener('click', () => {
                if (this.activeFloorInfo) {
                    const lock = this.isEditMode;
                    this.cameraManager.setTopDownView(
                        this.activeFloorInfo.height,
                        this.activeFloorInfo.width,
                        this.activeFloorInfo.depth,
                        this.activeFloorInfo.center,
                        lock
                    );
                }
            });
        }

        // 2. Init Sub-Modules
        this.dragController.init();
        this.contextMenu.init();
        this.addItemModal.init();
        this.flowDrawer.init();

        // Draw Flow Path button
        const btnDrawFlow = document.getElementById('btn-draw-flow');
        if (btnDrawFlow) btnDrawFlow.addEventListener('click', () => this.toggleFlowDrawing());

        // Flow finish modal buttons
        const btnFlowConfirm = document.getElementById('flow-finish-confirm');
        if (btnFlowConfirm) {
            btnFlowConfirm.addEventListener('click', () => {
                const layerId  = document.getElementById('flow-inp-layer')?.value;
                const name     = document.getElementById('flow-inp-name').value;
                const color    = document.getElementById('flow-inp-color').value;
                const speed    = document.getElementById('flow-inp-speed').value;
                const shape    = document.getElementById('flow-inp-shape').value;
                const product  = document.getElementById('flow-inp-product').value;
                const showLine = document.getElementById('flow-inp-showline').checked;
                this.flowDrawer.confirmPath(name, color, speed, shape, product, showLine, layerId);
                this._resetDrawFlowButton();
            });
        }
        const btnFlowCancel = document.getElementById('flow-finish-cancel');
        if (btnFlowCancel) {
            btnFlowCancel.addEventListener('click', () => {
                this.flowDrawer.cancelDrawing();
            });
        }

        // 3. Listen for Floor Isolation
        window.addEventListener('floor-isolated', (e) => {
            this.activeFloorHeight = e.detail.height;
            this.activeFloorInfo = e.detail; // Capture details
            if (this.btnEdit) this.btnEdit.style.display = 'block';
        });

        window.addEventListener('floor-restored', () => {
            if (this.btnEdit) this.btnEdit.style.display = 'none';
            if (this.isEditMode) this.toggleEditMode(); // Force exit
        });

        // 4. Export Button Logic
        if (this.btnExport) {
            this.btnExport.addEventListener('click', () => {
                // Check dependency
                if (!this.floorManager) {
                    console.error("FloorManager not connected to EditorManager");
                    return;
                }

                // Get Active Floor Index
                const idx = this.floorManager.activeFloorIndex;

                // Validate Selection
                if (idx === -1 || !this.floorManager.floors[idx]) {
                    alert("Please select (isolate) a floor first.");
                    return;
                }

                // Execute Export
                const activeFloorId = this.floorManager.floors[idx].id;
                console.log(`Exporting data for: ${activeFloorId}`); // Debug
                this.exporter.exportData(activeFloorId);
            });
        }

        // Coordinate display on pointer move
        const canvas = this.cameraManager.controls.domElement;
        canvas.addEventListener('pointermove', (e) => this._onCoordMove(e));

        // Hide button by default
        if (this.btnEdit) this.btnEdit.style.display = 'none';
    }


    /* js/editor/EditorManager.js */

    toggleEditMode() {
        this.isEditMode = !this.isEditMode;
        this.inputManager.setEditMode(this.isEditMode);

        // Get the Elevator Panel
        const elevatorPanel = document.getElementById('elevator-panel');

        // UI Updates (Buttons)
        if(this.btnEdit) {
            this.btnEdit.textContent = this.isEditMode ? "Exit 2D Edit" : "Enter Edit Mode";
            this.btnEdit.style.background = this.isEditMode ? "#d9534f" : "#444";
        }
        if(this.btnExport) {
            this.btnExport.style.display = this.isEditMode ? "block" : "none";
        }

        // --- NEW: DISABLE ELEVATOR PANEL ---
        if (elevatorPanel) {
            if (this.isEditMode) {
                // Disable interaction and dim it
                elevatorPanel.style.pointerEvents = 'none';
                elevatorPanel.style.opacity = '0.5';
                elevatorPanel.style.filter = 'grayscale(100%)'; // Optional: makes it look more "disabled"
            } else {
                // Restore interaction and look
                elevatorPanel.style.pointerEvents = 'auto';
                elevatorPanel.style.opacity = '1';
                elevatorPanel.style.filter = 'none';
            }
        }

        // Coordinate display visibility
        if (this.coordDisplay) {
            this.coordDisplay.style.display = this.isEditMode ? 'block' : 'none';
        }

        // Draw Flow Path button visibility
        const btnDrawFlow = document.getElementById('btn-draw-flow');
        if (btnDrawFlow) {
            btnDrawFlow.style.display = this.isEditMode ? 'block' : 'none';
        }
        if (!this.isEditMode) {
            // Clean up any in-progress flow drawing when exiting edit mode
            this.flowDrawer.cancelDrawing();
        }

        // Camera Logic
        if (this.isEditMode) {
            if (this.activeFloorInfo) {
                this.cameraManager.setTopDownView(
                    this.activeFloorInfo.height, 
                    this.activeFloorInfo.width, 
                    this.activeFloorInfo.depth,
                    this.activeFloorInfo.center
                );
            }
            setTimeout(() => { 
                if(this.isEditMode) this.cameraManager.controls.enableRotate = false; 
            }, 1200);
        } else {
            this.cameraManager.restoreView();
            this.addItemModal.hide();
            this.contextMenu.hide();
        }
    }

    get isDrawingFlow() { return this.flowDrawer?.isActive ?? false; }

    toggleFlowDrawing() {
        const btn       = document.getElementById('btn-draw-flow');
        const countLbl  = document.getElementById('flow-waypoint-count');
        if (!this.flowDrawer.isActive) {
            this.flowDrawer.startDrawing();
            if (btn) { btn.textContent = 'Finish Path'; btn.style.background = '#28a745'; }
            if (countLbl) countLbl.style.display = 'block';
        } else {
            this.flowDrawer.finishDrawing();
        }
    }

    _resetDrawFlowButton() {
        const btn      = document.getElementById('btn-draw-flow');
        const countLbl = document.getElementById('flow-waypoint-count');
        if (btn)      { btn.textContent = 'Draw Flow Path'; btn.style.background = '#e67e00'; }
        if (countLbl) { countLbl.style.display = 'none'; countLbl.textContent = ''; }
    }

    _onCoordMove(e) {
        if (!this.isEditMode || !this.coordDisplay) return;
        const canvas = this.cameraManager.controls.domElement;
        const rect = canvas.getBoundingClientRect();
        this.coordMouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
        this.coordMouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
        this.coordRaycaster.setFromCamera(this.coordMouse, this.cameraManager.camera);
        this.coordPlane.constant = -(this.activeFloorHeight || 0);
        const hit = new THREE.Vector3();
        if (this.coordRaycaster.ray.intersectPlane(this.coordPlane, hit)) {
            this.coordDisplay.textContent = `X: ${Math.round(hit.x)}   Y: ${Math.round(hit.z)}`;
        }
    }
}
