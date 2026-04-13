/* js/Application.js */
import TWEEN from 'three/addons/libs/tween.module.js'; // Ensure this is imported!
import { SceneManager } from './SceneManager.js';
import { CameraManager } from './CameraManager.js';
import { InputManager } from './InputManager.js';
import { LayerManager } from './LayerManager.js';
import { FloorManager } from './FloorManager.js';
import { UIManager } from './UIManager.js';
import { DataLoader } from './DataLoader.js';
import { EditorManager } from './EditorManager.js';
import { SettingsPanel } from './ui/SettingsPanel.js';

export class Application {
    constructor() {
        // 1. Initialize Managers
        this.sceneManager = new SceneManager('canvas-container');
        this.cameraManager = new CameraManager(this.sceneManager.camera, this.sceneManager.renderer.domElement);
        this.layerManager = new LayerManager(this.sceneManager.scene);
        this.inputManager = new InputManager(this.sceneManager, this.layerManager);
        this.dataLoader = new DataLoader();
        
        // Managers with dependencies
        this.floorManager = new FloorManager(this.sceneManager, this.layerManager, this.dataLoader, this.cameraManager);
        this.uiManager = new UIManager(this.layerManager, this.floorManager);
        this.editorManager = new EditorManager(this.layerManager, this.inputManager, this.cameraManager, this.floorManager);
        this.settingsPanel = new SettingsPanel(this.layerManager);

        // Bind the animate loop to 'this' context
        this.animate = this.animate.bind(this);
    }

    async init() {
        try {
            console.log("System Initializing...");

            // 1. Load Configuration
            const config = await this.dataLoader.loadSystemConfig('assets/system_config.xlsx');

            // 2. Setup Layers & Preload Assets
            this.layerManager.initFromConfig(config.layers, config.types);
            
            console.log("Preloading 3D Models...");
            await this.layerManager.preloadModels();
            console.log("Models Ready.");

            // 3. Init Floor Manager
            this.floorManager.init(config.floors);

            // 4. Init UI
            this.uiManager.init();

            // 5. Load The Digital Twin (Floors & Items)
            if (config.floors.length > 0) {
                // Create Floating Elevator Panel
                this.uiManager.createFloorButtons(config.floors);
                
                // Load 3D Content
                await this.floorManager.loadAllFloors();
            }

            // 6. Init Editor & Settings
            this.editorManager.init();
            this.settingsPanel.init();
            this.settingsPanel.applyStartupVisibility();

            // 7. Bind Global Events
            this.bindEvents();

            // 8. Start Loop
            this.animate();

        } catch (e) {
            console.error("Critical Init Error:", e);
            alert("System failed to load. See console for details.");
        }
    }

    bindEvents() {
        // Pause Flow button
        const btnPause = document.getElementById('btn-pause-flow');
        if (btnPause) {
            btnPause.addEventListener('click', () => {
                this.layerManager.toggleFlowPause();
                const paused = this.layerManager._flowPaused;
                btnPause.textContent   = paused ? '▶ Resume Flow' : '⏸ Pause Flow';
                btnPause.style.background = paused ? '#28a745' : '';
            });
        }

        // Window Resize
        window.addEventListener('resize', () => {
            this.sceneManager.onWindowResize();
            // If camera manager needs resize logic, call it here
        });

        // UI: Refresh Layer List (e.g., when adding a new item forces a layer ON)
        window.addEventListener('refresh-layer-list', () => {
            this.uiManager.renderLayerList();
        });

        // UI: Item Clicked in 3D (Select in Right Panel)
        window.addEventListener('item-clicked', (e) => {
            const item = e.detail;
            this.uiManager.selectItemFrom3D(item.layerId, item);
            this.layerManager.highlightItem(item);
        });

        // UI: Item Selected in Panel (Focus Camera)
        window.addEventListener('focus-item', (e) => {
            const item = e.detail;
            
            // CALCULATE ABSOLUTE HEIGHT
            // 1. Get Floor Index from floorId (e.g., "floor_4" -> index 3)
            // Or use FloorManager helper if available.
            
            // HACK: We can find the visual mesh to get the true world position
            // This is safer than math guesswork.
            
            const visual = this.layerManager.findMesh(item);
            let worldY = 0;
            if (visual) {
                worldY = visual.position.y;
            } else {
                // Fallback math if mesh not found (e.g. hidden)
                // Assuming "floor_N" -> (N-1) * 300
                const floorNum = parseInt((item.floorId || '1').replace(/\D/g, '')) || 1;
                worldY = (floorNum - 1) * 300; 
            }

            // Call Camera Focus with height
            // Note: item.y is actually Z in 3D space
            this.cameraManager.focusOn(item.x, item.y, worldY);
            
            this.layerManager.highlightItem(item);
        });

        // UI: Item Deleted (Cleanup UI)
        window.addEventListener('item-deleted', (e) => {
            const deletedItem = e.detail;
            // 1. Refresh Right Panel if looking at that layer
            if (this.uiManager.activeLayerId === deletedItem.layerId) {
                this.uiManager.renderRightPanelList(deletedItem.layerId);
            }
            // 2. Clear Details if this specific item was selected
            const detailsTitle = document.querySelector('#item-details h3');
            if (detailsTitle && detailsTitle.textContent === deletedItem.name) {
                document.getElementById('item-details').innerHTML = '<div class="hint">Item deleted.</div>';
            }
        });
    }

    animate() {
        requestAnimationFrame(this.animate);

        TWEEN.update(); // <--- CRITICAL: This line must be present!
        this.layerManager.updateFlowAnimations();
        this.cameraManager.update();
        this.sceneManager.update(); // Handles renderer.render()
    }
}
