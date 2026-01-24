/* js/UIManager.js */

// Imports assume you are using native modules (ES6)
import { ElevatorPanel } from './ui/ElevatorPanel.js';
import { LayerPanel } from './ui/LayerPanel.js';
import { PropertiesPanel } from './ui/PropertiesPanel.js';

export class UIManager {
    constructor(layerManager, floorManager) {
        this.layerManager = layerManager;
        this.floorManager = floorManager;

        // Instantiate Sub-Components
        this.elevator = new ElevatorPanel(floorManager);
        this.rightPanel = new PropertiesPanel(layerManager);
        
        // LayerPanel needs a callback to tell RightPanel to clear if a layer is hidden
        this.leftPanel = new LayerPanel(layerManager, (layerId, isSelected) => {
            if (isSelected) {
                this.rightPanel.showLayerItems(layerId);
            } else {
                if (this.rightPanel.activeLayerId === layerId) {
                    this.rightPanel.clear();
                }
            }
        });
    }

    /* js/UIManager.js */

    init() {
        // Init Sub-Components
        this.leftPanel.init();
        this.createThemeButton(); 
                
        // NEW: Listen for floor changes to refresh the right panel list
        // FIX 1: Add 'e' parameter
        window.addEventListener('floor-isolated', (e) => {
            // FIX 2: Use 'this.rightPanel' instead of 'this.propertiesPanel'
            if (this.rightPanel) {
                this.rightPanel.setFloorFilter(e.detail.floorId);
                // Optional: You might not need explicit refresh() if setFloorFilter calls showLayerItems internally
                // this.rightPanel.refresh(); 
            }
            console.log('Send filter signal, Floor isolated:', e.detail.floorId);
        });
        
        window.addEventListener('floor-restored', () => {
            // FIX 2: Use 'this.rightPanel'
            if (this.rightPanel) {
                this.rightPanel.setFloorFilter(null);
            }
        });
    }


    // Called by Main.js
    createFloorButtons(floors) {
        this.elevator.create(floors);
    }

    // Called by Global Events
    selectItemFrom3D(layerId, item) {
        // 1. Ensure the layer is active in the Right Panel
        if (this.rightPanel.activeLayerId !== layerId) {
            this.rightPanel.showLayerItems(layerId);
        }

        // 2. Delegate highlighting/scrolling to the sub-component
        this.rightPanel.highlightItemInList(item);
    }

    createThemeButton() {
        const btn = document.createElement('button');
        btn.id = 'btn-theme';
        btn.textContent = 'Blueprint Mode';
        btn.onclick = () => {
            const isBlue = document.body.classList.toggle('blueprint-mode');
            btn.textContent = isBlue ? 'Exit Blueprint' : 'Blueprint Mode';
            this.floorManager.setFloorToBlueprint(isBlue);
            this.layerManager.setBlueprintMode(isBlue);
            if(this.floorManager.sceneManager) this.floorManager.sceneManager.setBackground(isBlue);
        };
        document.body.appendChild(btn);
    }
}
