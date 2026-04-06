import { ElevatorPanel } from './ui/ElevatorPanel.js';
import { LayerPanel } from './ui/LayerPanel.js';
import { PropertiesPanel } from './ui/PropertiesPanel.js';

export class UIManager {
    constructor(layerManager, floorManager) {
        this.layerManager = layerManager;
        this.floorManager = floorManager;

        this.elevator = new ElevatorPanel(floorManager);
        this.rightPanel = new PropertiesPanel(layerManager);

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

    init() {
        this.leftPanel.init();
        this.createThemeButton();
        this.createCollapseButton();            // ← NEW

        window.addEventListener('floor-isolated', (e) => {
            if (this.rightPanel) {
                this.rightPanel.setFloorFilter(e.detail.floorId);
            }
            console.log('Send filter signal, Floor isolated:', e.detail.floorId);
        });

        window.addEventListener('floor-restored', () => {
            if (this.rightPanel) {
                this.rightPanel.setFloorFilter(null);
            }
        });
    }

    createFloorButtons(floors) {
        this.elevator.create(floors);
    }

    selectItemFrom3D(layerId, item) {
        if (this.rightPanel.activeLayerId !== layerId) {
            this.rightPanel.showLayerItems(layerId);
        }
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
            if (this.floorManager.sceneManager) this.floorManager.sceneManager.setBackground(isBlue);
        };
        document.body.appendChild(btn);
    }

    // ─── NEW ──────────────────────────────────────────────────────────────────
    createCollapseButton() {
        const PANEL_WIDTH = '250px';

        const btn = document.createElement('button');
        btn.id = 'btn-toggle-left';
        btn.title = 'Toggle Layer Panel';
        btn.textContent = '◀';
        document.body.appendChild(btn);

        const panel = document.getElementById('panel-left');
        let collapsed = false;

        btn.addEventListener('click', () => {
            collapsed = !collapsed;
            panel.classList.toggle('collapsed', collapsed);
            btn.textContent = collapsed ? '▶' : '◀';
            btn.style.left  = collapsed ? '0px' : PANEL_WIDTH;

            // ← Wait for the 0.3s CSS transition to finish,
            //   then notify Three.js renderer to resize to the new canvas dimensions
            setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
            }, 320);
        });
    }
    // ─────────────────────────────────────────────────────────────────────────
}