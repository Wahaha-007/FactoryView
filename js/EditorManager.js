/* js/editor/EditorManager.js */
import { DragController } from './editor/DragController.js';
import { ContextMenu } from './editor/ContextMenu.js';
import { AddItemModal } from './editor/AddItemModal.js';
import { DataExporter } from './editor/DataExporter.js';

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

        // Sub-Modules
        this.dragController = new DragController(this, layerManager, cameraManager);
        this.contextMenu = new ContextMenu(this, layerManager, cameraManager);
        this.addItemModal = new AddItemModal(this, layerManager);
        this.exporter = new DataExporter(layerManager);
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

}
