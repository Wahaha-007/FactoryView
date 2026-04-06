# Project Structure

```
    compack.py
    index.html
    [assets/]
        1st Floor-B.png
        2nd Floor.png
        3rd Floor-B.png
        4th Floor-B.png
        Floor1.png
        floor_1_data.xlsx
        floor_2_data.xlsx
        floor_3_data.xlsx
        floor_4_data.xlsx
        system_config.xlsx
    [css/]
        style.css
    [js/]
        Application.js
        CameraManager.js
        DataLoader.js
        EditorManager.js
        FloorManager.js
        FloorManager_Old.js
        InputManager.js
        LayerManager.js
        SceneManager.js
        UIManager.js
        main.js
        [core/]
            AssetFactory.js
            Materials.js
        [editor/]
            AddItemModal.js
            ContextMenu.js
            DataExporter.js
            DragController.js
        [ui/]
            ElevatorPanel.js
            LayerPanel.js
            PropertiesPanel.js
```

---

# File Contents

## compack.py

```python
import os


# =========================
# Configuration
# =========================
ROOT_DIR = os.getcwd()
OUTPUT_FILE = "FactoryView-PACKED.md"   # ← .md preserves code fences on upload


CODE_EXTENSIONS = {'.py', '.css', '.html', '.ts', '.tsx', '.js', '.mjs', '.md', '.yaml'}
EXCLUDE_DIRS = {'.git', '__pycache__', '.vscode', '.idea', 'node_modules', 'venv311', '.next'}


# Extension → markdown language tag for syntax highlighting
LANG_MAP = {
    '.py':   'python',
    '.css':  'css',
    '.html': 'html',
    '.ts':   'typescript',
    '.tsx':  'tsx',
    '.js':   'javascript',
    '.mjs':  'javascript',
    '.md':   'markdown',
}


# =========================
# Write Project Structure
# =========================
def write_structure(outfile):
    outfile.write("# Project Structure\n\n")
    outfile.write("```\n")

    for root, dirs, files in os.walk(ROOT_DIR):
        dirs[:] = sorted([d for d in dirs if d not in EXCLUDE_DIRS])

        level = root.replace(ROOT_DIR, "").count(os.sep)
        indent = "    " * level

        if root != ROOT_DIR:
            outfile.write(f"{indent}[{os.path.basename(root)}/]\n")

        sub_indent = "    " * (level + 1)
        for f in sorted(files):
            if f == OUTPUT_FILE:
                continue
            outfile.write(f"{sub_indent}{f}\n")

    outfile.write("```\n\n")
    outfile.write("---\n\n")


# =========================
# Write File Contents
# =========================
def write_files(outfile):
    outfile.write("# File Contents\n\n")

    for root, dirs, files in os.walk(ROOT_DIR):
        dirs[:] = sorted([d for d in dirs if d not in EXCLUDE_DIRS])

        for file in sorted(files):
            ext = os.path.splitext(file)[1].lower()

            if ext in CODE_EXTENSIONS and file != OUTPUT_FILE:
                path = os.path.join(root, file)
                rel  = os.path.relpath(path, ROOT_DIR).replace(os.sep, "/")
                lang = LANG_MAP.get(ext, "")

                try:
                    with open(path, "r", encoding="utf-8") as f:
                        content = f.read()

                    # ── Markdown code fence preserves underscores on upload ──
                    outfile.write(f"## {rel}\n\n")
                    outfile.write(f"```{lang}\n")
                    outfile.write(content)
                    if not content.endswith("\n"):
                        outfile.write("\n")
                    outfile.write("```\n\n")

                    print(f"Packed: {rel}")

                except Exception as e:
                    print(f"Failed to read {rel}: {e}")


# =========================
# Main
# =========================
def main():
    print(f"Scanning project: {ROOT_DIR}")

    with open(OUTPUT_FILE, "w", encoding="utf-8") as outfile:
        write_structure(outfile)
        write_files(outfile)

    print(f"\nAll done! Output: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
```

## index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Factory Digital Twin</title>
    <link rel="stylesheet" href="css/style.css">
    <!-- Import SheetJS for Excel reading -->
    <script src="https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.umd.js"></script>

    <script type="importmap">
        {
            "imports": {
                "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
                "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
            }
        }
    </script>
</head>
<body>

    <!-- LEFT PANEL: Layer Control -->
    <div id="panel-left">
        <h3>Layers</h3>
        <div id="layer-list">
            <!-- Checkboxes will be injected here by JS -->
        </div>
        
        <div class="divider"></div>
        <h3>View Controls</h3>
        <button id="btn-top">Reset Top View</button>
        <div class="hint">
            Rotate: Arrows<br>
            Pan: Right Click<br>
            Zoom: Scroll
        </div>
            <!-- ... existing content ... -->
        <div class="divider"></div>
        <h3>Editor</h3>
        <button id="btn-edit-mode">Enter Edit Mode</button>
        <button id="btn-export" style="display:none; background:#28a745;">Save & Export XLSX</button>
    </div>

    <!-- CENTER: 3D Canvas -->
    <div id="canvas-container"></div>

    <!-- RIGHT PANEL: Device List & Details -->
    <div id="panel-right">
        <!-- Upper: List -->
        <div id="panel-right-top">
            <h3>Items in Layer</h3>
            <ul id="item-list">
                <li class="empty-state">Select a layer to see items...</li>
            </ul>
        </div>

        <!-- Lower: Details -->
        <div id="panel-right-bottom">
            <h3>Details</h3>
            <div id="item-details">
                <p class="empty-state">Select an item...</p>
            </div>
        </div>
    </div>

    <!-- Loading Overlay -->
    <div id="loading">Loading System...</div>

    <!-- EDIT MODAL -->
    <!-- Modal for Adding Items -->
    <div id="edit-modal">
        <h3>Add Item</h3>
        
        <label>Name:</label>
        <input type="text" id="inp-name" autocomplete="off">
        
        <!-- NEW: Layer Selection -->
        <label>Layer:</label>
        <select id="inp-layer"></select>

        <label>Type:</label>
        <select id="inp-type"></select>
        
        <div style="margin-top: 15px; text-align: right;">
            <button id="btn-cancel" style="width: auto; background: #666;">Cancel</button>
            <button id="btn-confirm" style="width: auto; background: #00d2ff;">Confirm</button>
        </div>
    </div>

    <!-- Context Menu for Deleting -->
    <div id="context-menu" style="display:none; position:fixed; z-index:2000; background:#333; border:1px solid #555; padding:5px; border-radius:4px; box-shadow:0 2px 10px rgba(0,0,0,0.5);">
        <button id="btn-delete" style="background:#d9534f; color:white; border:none; padding:8px 15px; cursor:pointer; width:100%;">Delete Item</button>
    </div>

    <!-- Main Logic -->
    <script type="module" src="js/main.js"></script>

</body>
</html>
```

## css/style.css

```css
/* =========================================
   1. VARIABLES & THEME
   ========================================= */
:root {
    --bg-color: #222;
    --panel-bg: #2a2a2a;
    --panel-item-bg: #252525;
    --text-color: #eee;
    --text-muted: #aaa;
    --border-color: #444;
    --accent-color: #00d2ff;
    --danger-color: #ff4444;
    --success-color: #44ff44;
    --font-main: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

body.blueprint-mode {
    --bg-color: #000;
    --panel-bg: #111;
    --panel-item-bg: #000;
    --text-color: #aaccff;
    --border-color: #333;
    --accent-color: #00ffff;
}

/* =========================================
   2. BASE & LAYOUT
   ========================================= */
* { box-sizing: border-box; }

body {
    margin: 0;
    overflow: hidden;
    background-color: var(--bg-color);
    color: var(--text-color);
    font-family: var(--font-main);
    display: flex;
    height: 100vh;
}

/* Layout Columns */
#panel-left {
    width: 250px;
    background: var(--panel-bg);
    border-right: 1px solid var(--border-color);
    padding: 15px;
    display: flex;
    flex-direction: column;
    z-index: 10;
}

#canvas-container {
    flex-grow: 1;
    position: relative;
    background: #fff; /* Canvas itself usually covers this */
    overflow: hidden;
}

#panel-right {
    width: 300px;
    background: var(--panel-bg);
    border-left: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    z-index: 10;
}

#panel-right-top {
    height: 60%;
    padding: 15px;
    overflow-y: auto;
    border-bottom: 1px solid var(--border-color);
}

#panel-right-bottom {
    height: 40%;
    padding: 15px;
    background: var(--panel-item-bg);
    overflow-y: auto;
}

/* =========================================
   3. TYPOGRAPHY & UTILITIES
   ========================================= */
h3 {
    margin-top: 0;
    font-size: 1rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
}

.divider {
    height: 1px;
    background: var(--border-color);
    margin: 20px 0;
}

.hint {
    font-size: 0.8rem;
    color: #777;
    margin-top: 10px;
}

/* =========================================
   4. COMPONENTS: BUTTONS & INPUTS
   ========================================= */
button {
    width: 100%;
    padding: 10px;
    cursor: pointer;
    background: var(--border-color);
    color: var(--text-color);
    border: none;
    border-radius: 4px;
    transition: background 0.2s;
}

button:hover { background: #555; }

/* Specific Toggle Button (Theme) */
#btn-theme {
    position: absolute;
    top: 10px;
    right: 320px;
    z-index: 100;
    width: auto;
    padding: 8px 15px;
    background: var(--panel-bg);
    border: 1px solid var(--border-color);
    font-weight: bold;
}

/* =========================================
   5. COMPONENTS: LISTS & ITEMS
   ========================================= */
/* Left Panel: Checkboxes */
.layer-item {
    display: flex;
    align-items: center;
    padding: 8px 0;
    cursor: pointer;
}
.layer-item input { margin-right: 10px; transform: scale(1.2); }

/* Right Panel: Item List */
#item-list { list-style: none; padding: 0; margin: 0; }

#item-list li {
    padding: 10px;
    border-bottom: 1px solid #333;
    cursor: pointer;
    font-size: 0.9rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
}
#item-list li:hover { background: #333; color: #fff; }
#item-list li.selected { background: #007acc; color: white; }

.list-item-left { display: flex; align-items: center; gap: 8px; }
.list-status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.list-status-active { background-color: var(--success-color); box-shadow: 0 0 2px var(--success-color); }
.list-status-inactive { background-color: var(--danger-color); }

/* =========================================
   6. COMPONENTS: OVERLAYS & 3D UI
   ========================================= */
/* Loading Screen */
#loading {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    background: rgba(0,0,0,0.8); padding: 20px; border-radius: 8px; z-index: 999;
}

/* 3D Labels (CSS2D) */
.label {
    color: #FFF;
    font-family: sans-serif;
    padding: 5px 10px;
    background: rgba(0, 0, 0, 0.6);
    border-left: 3px solid var(--accent-color);
    border-radius: 4px;
    font-weight: bold;
    cursor: pointer;
    user-select: none;
    pointer-events: auto;
    font-size: var(--label-size, 12px);
    margin-top: var(--label-offset, -20px);
    transition: font-size 0.1s, margin-top 0.1s;
    transition: opacity 1s ease-in-out; 
}
.label:hover {
    background: rgba(0, 0, 0, 0.9);
    border-left-color: #ffcc00;
    z-index: 999;
}

/* Status Dots in Labels */
.status-dot {
    display: inline-block; width: 8px; height: 8px;
    border-radius: 50%; margin-right: 6px;
    border: 1px solid rgba(255,255,255,0.5);
}
.status-active { background-color: var(--success-color); box-shadow: 0 0 4px var(--success-color); }
.status-inactive { background-color: var(--danger-color); box-shadow: 0 0 4px var(--danger-color); }

/* Elevator Panel (Floating) */
#elevator-panel {
    /* Styles are injected by JS, but you can move them here if you want fixed CSS */
}

/* =========================================
   7. COMPONENTS: MODALS & DETAILS
   ========================================= */
/* Edit Modal */
#edit-modal {
    display: none;
    position: fixed;
    background: #333;
    border: 1px solid #555;
    padding: 15px;
    border-radius: 4px;
    width: 250px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    z-index: 1000;
}
#edit-modal input, #edit-modal select {
    width: 100%; padding: 6px; margin-top: 4px;
    background: #222; border: 1px solid #444; color: #fff;
    border-radius: 3px;
}
#edit-modal button#btn-confirm:hover { background: #00bfff; }

/* Details Panel Warnings */
.audit-warning {
    margin-top: 10px; padding: 10px;
    background: rgba(255, 0, 0, 0.2);
    border-left: 3px solid var(--danger-color);
    color: #ffcccc; font-size: 0.9rem;
    display: flex; align-items: center;
}
.audit-ok {
    color: #88ff88; font-size: 0.8rem; margin-top: 5px;
}
```

## js/Application.js

```javascript
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

            // 6. Init Editor
            this.editorManager.init();

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
        // Update Managers
        this.cameraManager.update();
        this.sceneManager.update(); // Handles renderer.render()
    }
}
```

## js/CameraManager.js

```javascript
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import TWEEN from 'three/addons/libs/tween.module.js';

export class CameraManager {
    constructor(camera, domElement) {
        this.camera = camera;
        this.controls = new OrbitControls(camera, domElement);
        
        // --- CONFIG ---
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.1;
        this.controls.screenSpacePanning = true;
        this.controls.enableZoom = false; // We handle zoom manually for smoothness
        
        // Limit Vertical Rotation (Don't go below floor)
        this.controls.maxPolarAngle = Math.PI / 2 - THREE.MathUtils.degToRad(10);
        this.camera.up.set(0, 1, 0);

        // Zoom Settings
        this.ZOOM_SPEED = 0.1;
        this.MIN_DIST = 100;
        this.MAX_DIST = 20000;

        // Store previous state
        this.savedState = null;

        // Default State
        this.defaultPosition = new THREE.Vector3(-1800, 2400, 2600);
        // @Console > window.app.cameraManager.camera.position => Vector3 {x: -1767.4514233273323, y: 2372.6130403029906, z: 2664.1186022692127}
        this.defaultTarget = new THREE.Vector3(80, 60, -100);
        // @Console > window.app.cameraManager.controls.target => {x: 73.93231473251474, y: 63.2758561294205, z: -113.6863612123789}

        // Bind Manual Zoom
        domElement.addEventListener('wheel', (e) => this.handleManualZoom(e), { passive: false });
    }

    update() {
        if (this.controls.enabled) {
            this.controls.update();
        }
        TWEEN.update();
    }

    /* --- MANUAL ZOOM (Restored) --- */
    handleManualZoom(event) {
        if (!this.controls.enabled) return;
        event.preventDefault();

        const target = this.controls.target;
        const offset = new THREE.Vector3().copy(this.camera.position).sub(target);
        
        let distance = offset.length();

        if (event.deltaY > 0) {
            distance *= (1 + this.ZOOM_SPEED); // Zoom Out
        } else {
            distance /= (1 + this.ZOOM_SPEED); // Zoom In
        }

        distance = Math.max(this.MIN_DIST, Math.min(this.MAX_DIST, distance));

        offset.setLength(distance);
        this.camera.position.copy(target).add(offset);
        this.controls.update();
    }

    /* --- ELEVATOR ANIMATION --- */
    transitionToFloor(floorHeight, duration = 1500) {
        // 1. Get current state
        const currentTarget = this.controls.target.clone();
        const currentPos = this.camera.position.clone();
        
        // 2. Calculate Vertical Diff
        const targetYDiff = floorHeight - currentTarget.y;
        
        // 3. New Target (Shift Y only)
        const endTarget = new THREE.Vector3(currentTarget.x, floorHeight, currentTarget.z);
        
        // 4. New Position (Shift Y only)
        // This preserves the exact zoom distance and angle established by handleManualZoom
        const endPos = new THREE.Vector3(currentPos.x, currentPos.y + targetYDiff, currentPos.z);

        // 5. Animate
        this.animateCamera(endPos, endTarget, duration);
    }

    /* --- OVERVIEW ANIMATION --- */
    transitionToOverview(centerHeight) {
        const targetPos = new THREE.Vector3(1500, centerHeight + 1000, 1500); 
        const targetLook = new THREE.Vector3(500, centerHeight, 300); 
        this.animateCamera(targetPos, targetLook, 2000);
    }

    /* --- FOCUS ITEM --- */

    focusOn(x, z, targetHeight = 0) { // Renamed y -> z for clarity, added targetHeight
        const goalTarget = new THREE.Vector3(x, targetHeight, z);

        // Keep current zoom distance/angle relative to target
        const offset = this.camera.position.clone().sub(this.controls.target);
        
        // Safety cap on zoom
        if (offset.length() > 1000) offset.setLength(1000);

        const goalCamPos = goalTarget.clone().add(offset);
        
        this.animateCamera(goalCamPos, goalTarget, 1000);
    }

    resetView() {
        this.animateCamera(this.defaultPosition, this.defaultTarget, 1000);
    }

    /* --- ANIMATION HELPER --- */
    animateCamera(endPos, endTarget, duration = 1000, onComplete = null) {
            const startPos = this.camera.position.clone();
            const startTarget = this.controls.target.clone();
            const animation = { t: 0 };

            new TWEEN.Tween(animation)
                .to({ t: 1 }, duration)
                .easing(TWEEN.Easing.Quadratic.InOut)
                .onUpdate(() => {
                    this.camera.position.lerpVectors(startPos, endPos, animation.t);
                    this.controls.target.lerpVectors(startTarget, endTarget, animation.t);
                })
                .onComplete(() => {
                    if (onComplete) onComplete();
                })
                .start();
        }

    /* --- REPLACED: SMOOTH SPHERICAL TRANSITION --- */
    setTopDownView(floorHeight, floorWidth = 2000, floorDepth = 2000, floorCenter = null) {
        // 1. SAVE STATE
        this.savedState = {
            position: this.camera.position.clone(),
            target: this.controls.target.clone()
        };

        // 2. CALCULATE END TARGET (Look at center of floor)
        const offsetX = 300; 
        const offsetZ = 0;   // Use this if you want to shift Up/Down (Screen space)

        const targetX = (floorCenter ? floorCenter.x : this.controls.target.x) + offsetX;
        const targetZ = (floorCenter ? floorCenter.z : this.controls.target.z) + offsetZ;
        const endTarget = new THREE.Vector3(targetX, floorHeight, targetZ);

        // 3. CALCULATE ZOOM FIT (RADIUS)
        const vFOV = THREE.MathUtils.degToRad(this.camera.fov);
        const aspect = this.camera.aspect;
        
        // Calculate distance for Height and Width
        const distH = floorDepth / (2 * Math.tan(vFOV / 2));
        const distW = floorWidth / (2 * Math.tan(vFOV / 2) * aspect);
        
        // Use the larger distance + 1.5x Padding (Increased from 1.2 to fix "Zoom too much")
        const endRadius = Math.max(distH, distW) * 0.7;

        // 4. SPHERICAL INTERPOLATION SETUP
        
        // A. Calculate Start Spherical (Current Camera relative to Target)
        const startOffset = this.camera.position.clone().sub(this.controls.target);
        const startSph = new THREE.Spherical().setFromVector3(startOffset);

        // B. Define End Spherical (Top Down, North Up)
        const endSph = {
            radius: endRadius,
            phi: 0.001,  // Almost 0 (Top Down). Absolute 0 causes Three.js Gimbal Lock.
            theta: 0     // 0 aligns with +Z (South), ensuring Floorplan is upright.
        };

        // 5. ANIMATE USING SPHERICAL COORDINATES
        const animation = { t: 0 };

        this.controls.enableDamping = false; // Disable damping to prevent jitter during tween

        new TWEEN.Tween(animation)
            .to({ t: 1 }, 1500) // 1.5 Seconds for a grander entrance
            .easing(TWEEN.Easing.Cubic.InOut) // Cubic is smoother than Quadratic
            .onUpdate(() => {
                // 1. Interpolate Target (Linear move is fine here)
                this.controls.target.lerpVectors(this.savedState.target, endTarget, animation.t);

                // 2. Interpolate Spherical Coords (The "Orbit" effect)
                // This ensures rotation happens constantly throughout the movement
                const currentRadius = THREE.MathUtils.lerp(startSph.radius, endSph.radius, animation.t);
                const currentPhi = THREE.MathUtils.lerp(startSph.phi, endSph.phi, animation.t);
                
                // Handle Theta Wrapping (Shortest Path)
                // If start is 350deg and end is 0deg, we don't want to spin 350deg backwards.
                let dTheta = endSph.theta - startSph.theta;
                if (dTheta > Math.PI) dTheta -= 2 * Math.PI;
                if (dTheta < -Math.PI) dTheta += 2 * Math.PI;
                const currentTheta = startSph.theta + (dTheta * animation.t);

                // 3. Apply to Camera
                const sph = new THREE.Spherical(currentRadius, currentPhi, currentTheta);
                const newOffset = new THREE.Vector3().setFromSpherical(sph);
                
                // Position = Moving Target + Moving Offset
                this.camera.position.copy(this.controls.target).add(newOffset);
            })
            .onComplete(() => {
                this.controls.enableRotate = false;
                this.controls.enableDamping = true;
            })
            .start();
    }

    restoreView() {
        if (!this.savedState) {
            this.unlockView();
            return;
        }

        this.controls.enableRotate = true;
        this.controls.enableDamping = false; // Disable damping for direct control

        // 1. SETUP START STATE (Current Top-Down View)
        const startTarget = this.controls.target.clone();
        const startOffset = this.camera.position.clone().sub(startTarget);
        const startSph = new THREE.Spherical().setFromVector3(startOffset);

        // 2. SETUP END STATE (Original Saved 3D View)
        const endTarget = this.savedState.target.clone();
        const endOffset = this.savedState.position.clone().sub(endTarget);
        const endSph = new THREE.Spherical().setFromVector3(endOffset);

        // 3. ANIMATE SPHERICALLY (The "Orbit" back)
        const animation = { t: 0 };

        new TWEEN.Tween(animation)
            .to({ t: 1 }, 1500) // Match the 1.5s duration of the entry
            .easing(TWEEN.Easing.Cubic.InOut)
            .onUpdate(() => {
                // A. Interpolate Target (Linear move is fine for the pivot point)
                this.controls.target.lerpVectors(startTarget, endTarget, animation.t);

                // B. Interpolate Spherical Coordinates (Radius, Phi, Theta)
                const currentRadius = THREE.MathUtils.lerp(startSph.radius, endSph.radius, animation.t);
                const currentPhi = THREE.MathUtils.lerp(startSph.phi, endSph.phi, animation.t);

                // Handle Theta Wrapping (Find shortest rotation path)
                // This prevents the camera from doing a full 360 spin if the angles cross the PI/-PI boundary
                let dTheta = endSph.theta - startSph.theta;
                if (dTheta > Math.PI) dTheta -= 2 * Math.PI;
                if (dTheta < -Math.PI) dTheta += 2 * Math.PI;
                
                const currentTheta = startSph.theta + (dTheta * animation.t);

                // C. Apply New Position
                const sph = new THREE.Spherical(currentRadius, currentPhi, currentTheta);
                const newOffset = new THREE.Vector3().setFromSpherical(sph);
                
                // Camera Position = Moving Target + Moving Orbit Offset
                this.camera.position.copy(this.controls.target).add(newOffset);
            })
            .onComplete(() => {
                this.controls.enableDamping = true; // Re-enable damping
                this.savedState = null; // Cleanup
            })
            .start();
    }
    
    unlockView() {
        this.controls.enableRotate = true;
        this.controls.maxPolarAngle = Math.PI / 2 - THREE.MathUtils.degToRad(10);
        this.controls.minPolarAngle = 0;
    }

}
```

## js/DataLoader.js

```javascript
/* js/DataLoader.js */

export class DataLoader {
    constructor() {}

    async loadSystemConfig(url) {
        try {
            const workbook = await this.fetchWorkbook(url);
            
            // Parse Sheet 1: Layers
            const layers = workbook.Sheets['Layers'] ? XLSX.utils.sheet_to_json(workbook.Sheets['Layers']) : [];
            // Parse Sheet 2: Types
            const types = workbook.Sheets['Types'] ? XLSX.utils.sheet_to_json(workbook.Sheets['Types']) : [];
            // NEW: Parse Sheet 3: Floors
            const floors = workbook.Sheets['Floors'] ? XLSX.utils.sheet_to_json(workbook.Sheets['Floors']) : [];

            return { layers, types, floors };
        } catch (error) {
            console.error("Critical: Failed to load system_config.xlsx", error);
            return { layers: [], types: [], floors: [] };
        }
    }

    async loadFloorData(url) {
        try {
            const workbook = await this.fetchWorkbook(url);
            let allItems = [];

            workbook.SheetNames.forEach(sheetName => {
                const sheet = workbook.Sheets[sheetName];
                const rows = XLSX.utils.sheet_to_json(sheet);

                rows.forEach(row => {
                    if (row.X !== undefined && row.Y !== undefined) {
                        allItems.push({
                            layerId: sheetName,
                            name: row.Name,
                            type: row.Type,
                            x: row.X,
                            y: row.Y,
                            desc: row.Description,
                            status: row.Status || "Active",
                            lastAudit: row.LastAudit || "",
                            // [NEW] Read Color from Excel (e.g., "#FF0000" or "red")
                            color: row.Color || null 
                        });
                    }
                });
            });

            return allItems;
        } catch (error) {
            console.error(`Failed to load floor data: ${url}`, error);
            return [];
        }
    }

    // async fetchWorkbook(url) {
    //     const response = await fetch(url);
    //     if (!response.ok) throw new Error(`HTTP ${response.status} - ${url}`);
    //     const arrayBuffer = await response.arrayBuffer();
    //     return XLSX.read(arrayBuffer, { type: 'array', cellDates: true }); 
    // }

    async fetchWorkbook(url) {
        // --- FIX: ADD CACHE BUSTER ---
        // Appending the current timestamp ensures the URL is unique every time,
        // forcing the browser to bypass the cache and download the latest file.
        const uniqueUrl = `${url}?t=${new Date().getTime()}`;

        const response = await fetch(uniqueUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status} - ${url}`);
        const arrayBuffer = await response.arrayBuffer();
        return XLSX.read(arrayBuffer, { type: 'array', cellDates: true }); 
    }
}
```

## js/EditorManager.js

```javascript
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
```

## js/FloorManager.js

```javascript
/* js/FloorManager.js */
import * as THREE from 'three';
import { Materials } from './core/Materials.js';

export class FloorManager {
    constructor(sceneManager, layerManager, dataLoader, cameraManager) {
        this.sceneManager = sceneManager;
        this.layerManager = layerManager;
        this.dataLoader = dataLoader;
        this.cameraManager = cameraManager;

        this.floors = [];
        this.floorMeshes = [];
        this.FLOOR_GAP = 300;
        this.isBlueprintMode = false;
        this.activeFloorIndex = -1; // -1 means All Visible
    }

    init(floorsConfig) {
        this.floors = floorsConfig;
    }

    /* --- LOAD EVERYTHING --- */
    async loadAllFloors() {
        console.log("Loading Digital Twin Stack...");

        const loadingEl = document.getElementById('loading');
        if (loadingEl) loadingEl.style.display = 'block';

        this.layerManager.clearAllItems();

        // Sequential Load to ensure order
        for (let i = 0; i < this.floors.length; i++) {
            await this.setupFloor(this.floors[i], i);
        }

        if (loadingEl) loadingEl.style.display = 'none';

        // Default View: Overview or First Floor?
        // Let's start with all floors visible
        this.clearIsolation();
    }

    async setupFloor(floorConfig, index) {
        const yOffset = index * this.FLOOR_GAP;

        // 1. Load Texture (Supports .png, .jpg, .svg)
        const texture = await new THREE.TextureLoader().loadAsync(floorConfig.map_file);
        texture.colorSpace = THREE.SRGBColorSpace;

        // IMPROVEMENT: Optimize texture filters for clearer lines (crucial for SVG maps)
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = true;
        // Maximize anisotropy if available for sharp angled views
        const maxAnisotropy = this.sceneManager.renderer.capabilities.getMaxAnisotropy();
        texture.anisotropy = maxAnisotropy;

        // 2. Geometry & Material
        // Safety check: specific SVGs might report 0 dimensions if viewBox is missing
        const width = texture.image.width || 2000;
        const height = texture.image.height || 1000;

        const geometry = new THREE.PlaneGeometry(width, height);

        // Detect file type for specific material settings
        const isSVG = floorConfig.map_file.toLowerCase().endsWith('.svg');

        const material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 1,
            // IMPROVEMENT: Lower alphaTest for SVGs to preserve anti-aliased edges, 
            // keep 0.1 for PNGs to crop empty space cleanly.
            alphaTest: isSVG ? 0.0 : 0.1,
            depthWrite: false
        });

        // 3. Mesh
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = yOffset;

        // IMPORTANT: Store ID for filtering
        mesh.userData.floorId = floorConfig.id || floorConfig.name;
        mesh.userData.isFloor = true;

        this.sceneManager.scene.add(mesh);
        this.floorMeshes.push(mesh);

        // Store config for reference
        this.floors[index].mesh = mesh;
        this.floors[index].y = yOffset;
        // 4. Load Items
        const items = await this.dataLoader.loadFloorData(floorConfig.data_file);
        console.log(`[FloorManager] Loaded ${items.length} items for Floor ${floorConfig.id}`);

        items.forEach(item => {
            item.floorId = floorConfig.id; // Tag for filtering
            this.layerManager.addItem(item, yOffset);
        });
    }

    /* --- NAVIGATION / ISOLATION --- */
    toggleFloorIsolation(index) {
        if (this.activeFloorIndex === index) {
            this.clearIsolation();
        } else {
            this.isolateFloor(index);
        }
    }

    isolateFloor(index) {
        this.activeFloorIndex = index;
        const activeFloorId = this.floors[index].id;
        const floorHeight = index * this.FLOOR_GAP;

        // 1. GET DIMENSIONS & CENTER
        // We need the bounding box to know the true size of the floor plan
        const mesh = this.floorMeshes[index];

        // Ensure bounding box is updated
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
        const bbox = mesh.geometry.boundingBox;

        const width = bbox.max.x - bbox.min.x;
        const depth = bbox.max.y - bbox.min.y; // PlaneGeometry uses Y for height locally

        // Calculate center (in case floor isn't centered at 0,0)
        const center = new THREE.Vector3();
        mesh.getWorldPosition(center);

        console.log(`Isolating Floor ${index + 1} (Size: ${width}x${depth})`);

        // 2. TOGGLE VISIBILITY
        this.floorMeshes.forEach((m, i) => {
            m.visible = (i === index);
            if (m.material) m.material.opacity = 1;
        });

        // 3. FADE ITEMS
        this.layerManager.fadeItemsByFloor(activeFloorId, 1000);

        // 4. DISPATCH EVENT WITH DATA
        window.dispatchEvent(new CustomEvent('floor-isolated', {
            detail: {
                index: index,
                floorId: activeFloorId,
                height: floorHeight,
                width: width,     // <--- New
                depth: depth,     // <--- New
                center: center    // <--- New
            }
        }));
    }

    clearIsolation() {
        this.activeFloorIndex = -1;
        console.log("Restoring All Floors");

        // 1. INSTANTLY Show All Floors
        this.floorMeshes.forEach(mesh => {
            mesh.visible = true;
            if (mesh.material) mesh.material.opacity = 1;
        });

        // 2. FADE Items Back In (Keep this!)
        this.layerManager.fadeAllItemsIn(1000);

        // 3. Reset Camera
        this.cameraManager.resetView();

        // 4. Notify System
        window.dispatchEvent(new CustomEvent('floor-restored'));
    }

    /* --- BLUEPRINT MODE --- */
    setFloorToBlueprint(active) {
        this.isBlueprintMode = active;

        this.floorMeshes.forEach(mesh => {
            if (active) {
                // Apply Shader
                const texture = mesh.userData.originalMat.map;
                const bpMat = Materials.createBlueprintMaterial(texture);
                mesh.material = bpMat;
            } else {
                // Restore Original
                mesh.material = mesh.userData.originalMat;
            }
        });
    }
}
```

## js/FloorManager_Old.js

```javascript
/* js/FloorManager.js */
import * as THREE from 'three';
import { Materials } from './core/Materials.js';

export class FloorManager {
    constructor(sceneManager, layerManager, dataLoader, cameraManager) {
        this.sceneManager = sceneManager;
        this.layerManager = layerManager;
        this.dataLoader = dataLoader;
        this.cameraManager = cameraManager;

        this.floors = [];
        this.floorMeshes = [];
        this.FLOOR_GAP = 300; 
        this.isBlueprintMode = false;
        this.activeFloorIndex = -1; // -1 means All Visible
    }

    init(floorsConfig) {
        this.floors = floorsConfig;
    }

    /* --- LOAD EVERYTHING --- */
    async loadAllFloors() {
        console.log("Loading Digital Twin Stack...");
        
        const loadingEl = document.getElementById('loading');
        if(loadingEl) loadingEl.style.display = 'block';

        this.layerManager.clearAllItems();

        // Sequential Load to ensure order
        for (let i = 0; i < this.floors.length; i++) {
            await this.setupFloor(this.floors[i], i);
        }

        if(loadingEl) loadingEl.style.display = 'none';

        // Default View: Overview or First Floor?
        // Let's start with all floors visible
        this.clearIsolation();
    }

    async setupFloor(floorConfig, index) {
        const yOffset = index * this.FLOOR_GAP;

        // 1. Load Texture
        const texture = await new THREE.TextureLoader().loadAsync(floorConfig.map_file);
        texture.colorSpace = THREE.SRGBColorSpace; 

        // 2. Geometry & Material
        const geometry = new THREE.PlaneGeometry(texture.image.width, texture.image.height);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 1,
            // FIX FOR PNGs:
            alphaTest: 0.1, // Discard pixels with opacity < 0.1
            depthWrite: false // Usually good for transparent overlays, try true if issues persist
        });

        // 3. Mesh
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotateX(-Math.PI / 2);
        mesh.position.y = yOffset;
        mesh.userData = { floorIndex: index, floorId: floorConfig.id };
        
        // Save original material for blueprint toggle
        mesh.userData.originalMat = material;

        this.sceneManager.scene.add(mesh);
        this.floorMeshes.push(mesh);

        console.log(`[FloorManager] Loading items for Floor ${floorConfig.id} from file: ${floorConfig.data_file}`);

        // 4. Load Items
        const items = await this.dataLoader.loadFloorData(floorConfig.data_file);
        console.log(`[FloorManager] Loaded ${items.length} items for Floor ${floorConfig.id}`);
        
        items.forEach(item => {
            item.floorId = floorConfig.id; // Tag for filtering
            this.layerManager.addItem(item, yOffset);
        });
    }

    /* --- NAVIGATION / ISOLATION --- */
    toggleFloorIsolation(index) {
        if (this.activeFloorIndex === index) {
            this.clearIsolation();
        } else {
            this.isolateFloor(index);
        }
    }

    isolateFloor(index) {
        this.activeFloorIndex = index;
        const activeFloorId = this.floors[index].id;
        const floorHeight = index * this.FLOOR_GAP;

        // 1. GET DIMENSIONS & CENTER
        // We need the bounding box to know the true size of the floor plan
        const mesh = this.floorMeshes[index];
        
        // Ensure bounding box is updated
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
        const bbox = mesh.geometry.boundingBox;
        
        const width = bbox.max.x - bbox.min.x;
        const depth = bbox.max.y - bbox.min.y; // PlaneGeometry uses Y for height locally
        
        // Calculate center (in case floor isn't centered at 0,0)
        const center = new THREE.Vector3();
        mesh.getWorldPosition(center); 

        console.log(`Isolating Floor ${index + 1} (Size: ${width}x${depth})`);

        // 2. TOGGLE VISIBILITY
        this.floorMeshes.forEach((m, i) => {
            m.visible = (i === index);
            if(m.material) m.material.opacity = 1; 
        });

        // 3. FADE ITEMS
        this.layerManager.fadeItemsByFloor(activeFloorId, 1000);

        // 4. DISPATCH EVENT WITH DATA
        window.dispatchEvent(new CustomEvent('floor-isolated', { detail: { 
            index: index, 
            floorId: activeFloorId,
            height: floorHeight,
            width: width,     // <--- New
            depth: depth,     // <--- New
            center: center    // <--- New
        }}));
    }

    clearIsolation() {
        this.activeFloorIndex = -1;
        console.log("Restoring All Floors");

        // 1. INSTANTLY Show All Floors
        this.floorMeshes.forEach(mesh => {
            mesh.visible = true;
            if(mesh.material) mesh.material.opacity = 1;
        });

        // 2. FADE Items Back In (Keep this!)
        this.layerManager.fadeAllItemsIn(1000);

        // 3. Reset Camera
        this.cameraManager.resetView();

        // 4. Notify System
        window.dispatchEvent(new CustomEvent('floor-restored'));
    }

    /* --- BLUEPRINT MODE --- */
    setFloorToBlueprint(active) {
        this.isBlueprintMode = active;

        this.floorMeshes.forEach(mesh => {
            if (active) {
                // Apply Shader
                const texture = mesh.userData.originalMat.map;
                const bpMat = Materials.createBlueprintMaterial(texture);
                mesh.material = bpMat;
            } else {
                // Restore Original
                mesh.material = mesh.userData.originalMat;
            }
        });
    }
}
```

## js/InputManager.js

```javascript
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
```

## js/LayerManager.js

```javascript
/* js/LayerManager.js */
import * as THREE from 'three';
import TWEEN from 'three/addons/libs/tween.module.js';
import { AssetFactory } from './core/AssetFactory.js'; 

export class LayerManager {
    constructor(scene) {
        this.scene = scene;
        this.layers = {};
        this.typesMap = {};       // Type Name -> Layer ID
        this.typeToModelMap = {}; // Type Name -> Model ID
        this.layerToTypesMap = {};
        this.availableTypes = [];
        
        // Use the new Factory
        this.factory = new AssetFactory();
        
        this.activeFloorId = null; // For filtering
    }

    initFromConfig(configLayers, configTypes) {
        configLayers.forEach(cfg => {
            const isVisible = (cfg.id === 'loc_name');
            this.createLayer(cfg.id, cfg.name, cfg.color, isVisible, cfg.icon);
            this.layerToTypesMap[cfg.id] = [];
        });

        configTypes.forEach(t => {
            this.typesMap[t.type] = t.layer_id;
            this.typeToModelMap[t.type] = t.model_id || 'cone';
            if (this.layerToTypesMap[t.layer_id]) {
                this.layerToTypesMap[t.layer_id].push(t.type);
            }
            this.availableTypes.push(t.type);
        });
    }

    async preloadModels() {
        await this.factory.preloadModels(this.typeToModelMap);
    }

    createLayer(id, name, colorHex, initialVisible = true, icon = null) {
        const group = new THREE.Group();
        group.name = name;
        group.visible = initialVisible;
        this.scene.add(group);

        this.layers[id] = {
            name,
            group,
            visible: initialVisible,
            color: new THREE.Color(colorHex || '#00d2ff'),
            items: [],
            icon: icon
        };
        return this.layers[id];
    }

    getTypesForLayer(layerId) { return this.layerToTypesMap[layerId] || ['Default']; }
    getLayerIdForType(typeName) { return this.typesMap[typeName] || Object.keys(this.layers)[0]; }
    /* js/LayerManager.js */

    getLayerItems(layerId) {
        const layer = this.layers[layerId];
        if (!layer) return [];

        let items = layer.items;

        // 1. FILTER: If a floor is active, only return items on that floor
        if (this.activeFloorId) {
            items = items.filter(item => item.floorId === this.activeFloorId);
        }

        // 2. SORT: Order by Floor ID (assuming floorId is something like 'floor_1', 'floor_2')
        // We can also assume the order in the array is roughly insertion order (floor 1 loaded first), 
        // but explicit sort is safer.
        
        // Helper to extract number from "floor_1" -> 1
        const getFloorNum = (id) => {
            const match = (id || '').match(/\d+/);
            return match ? parseInt(match[0]) : 999;
        };

        return items.sort((a, b) => getFloorNum(a.floorId) - getFloorNum(b.floorId));
    }


    /* --- ADD / REMOVE ITEMS --- */
    addItem(item, heightOffset = 0) {
        const layer = this.layers[item.layerId];
        if (!layer) return;

        // 1. Delegate Creation to Factory
        const modelId = this.typeToModelMap[item.type] || 'cone';

        // [NEW] Determine Color: Use item's specific color if available, else use layer color
        let objectColor = layer.color;
        if (item.color) {
            // Create a new THREE.Color from the hex string or name in Excel
            objectColor = new THREE.Color(item.color);
        }
        const visual = this.factory.createVisual(item, modelId, objectColor, layer.icon);

        // 2. Position
        // Base elevation logic (extracted from original)
        const baseElevation = (modelId === 'cone') ? 50 : 0;
        visual.position.set(item.x, baseElevation + heightOffset, item.y);
        
        visual.userData = item;
        visual.userData.floorOffset = heightOffset; 

        // 3. Re-bind Click Event to include full item object
        // The factory adds a generic listener, but we want the full item data reference
        const label = visual.children.find(c => c.isCSS2DObject);
        if(label) {
             // We can't easily remove anonymous listeners from factory, 
             // but we can ensure the factory dispatches a generic event 
             // or we overwrite the element onclick here if we wanted strictly binding data.
             // However, the factory dispatching 'item-clicked' with basic data is often enough.
             // If you need the EXACT item reference passed to window, we do it here:
             label.element.onclick = (e) => {
                 e.stopPropagation();
                 window.dispatchEvent(new CustomEvent('item-clicked', { detail: item }));
             };
             
             // Sync initial visibility
             label.visible = layer.visible;
        }

        layer.group.add(visual);
        layer.items.push(item);
    }

    removeItem(item) {
        const layer = this.layers[item.layerId];
        if (!layer) return;

        const index = layer.items.indexOf(item);
        if (index > -1) layer.items.splice(index, 1);

        const mesh = layer.group.children.find(child => child.userData === item);
        if (mesh) {
            const label = mesh.children.find(c => c.isCSS2DObject);
            if (label && label.element && label.element.parentNode) {
                label.element.parentNode.removeChild(label.element);
            }
            layer.group.remove(mesh);
            mesh.traverse((c) => { 
                if(c.geometry) c.geometry.dispose(); 
                if(c.material) c.material.dispose(); 
            });
            window.dispatchEvent(new CustomEvent('item-deleted', { detail: item }));
        }
    }

    clearAllItems() {
        Object.values(this.layers).forEach(layer => {
            layer.group.traverse((child) => {
                if (child.isCSS2DObject && child.element && child.element.parentNode) {
                    child.element.parentNode.removeChild(child.element);
                }
            });
            layer.group.clear();
            layer.items = [];
        });
    }

    updateItemPosition(item, newX, newY) {
        item.x = newX;
        item.y = newY;
        const layer = this.layers[item.layerId];
        if(layer) {
            const mesh = layer.group.children.find(child => child.userData === item);
            if(mesh) {
                const modelId = this.typeToModelMap[item.type] || 'cone';
                const elevation = (modelId === 'cone') ? 50 : 0;
                // Keep floor offset if it exists
                const offset = mesh.userData.floorOffset || 0;
                mesh.position.set(newX, elevation + offset, newY);
            }
        }
    }

    /* --- VISIBILITY & BLUEPRINT --- */
    toggleLayer(id, isVisible) {
        const layer = this.layers[id];
        if (layer) {
            layer.visible = isVisible;
            layer.group.visible = isVisible;
            
            // Sync with Floor Filter
            layer.group.children.forEach(child => {
                let shouldBeVisible = isVisible;
                if (isVisible && this.activeFloorId) {
                    if (child.userData.floorId !== this.activeFloorId) shouldBeVisible = false;
                }
                child.visible = shouldBeVisible;
                const label = child.children.find(c => c.isCSS2DObject);
                if (label) label.visible = shouldBeVisible;
            });
        }
    }

    filterItemsByFloor(floorId) {
        this.activeFloorId = floorId;
        Object.values(this.layers).forEach(layer => {
            if (!layer.visible) return;
            layer.group.children.forEach(child => {
                const isOnFloor = (child.userData.floorId === floorId);
                child.visible = isOnFloor;
                const label = child.children.find(c => c.isCSS2DObject);
                if (label) label.visible = isOnFloor;
            });
        });
    }

    showAllItems() {
        this.activeFloorId = null;
        Object.values(this.layers).forEach(layer => {
            if (!layer.visible) return;
            layer.group.children.forEach(child => {
                child.visible = true;
                const label = child.children.find(c => c.isCSS2DObject);
                if (label) label.visible = true;
            });
        });
    }

    setBlueprintMode(active) {
        Object.values(this.layers).forEach(layer => {
            layer.group.traverse((child) => {
                if (child.isMesh && !child.isCSS2DObject) {
                    if (active) {
                        if (!child.userData.originalMat) child.userData.originalMat = child.material;
                        child.material = new THREE.MeshBasicMaterial({
                            color: 0x001133, transparent: true, opacity: 0.1, depthWrite: false
                        });
                        
                        if (!child.userData.edgesHelper) {
                            const edgesGeo = new THREE.EdgesGeometry(child.geometry, 15);
                            const edgesMat = new THREE.LineBasicMaterial({ color: 0x00ffff });
                            const edges = new THREE.LineSegments(edgesGeo, edgesMat);
                            child.add(edges);
                            child.userData.edgesHelper = edges;
                        }
                        child.userData.edgesHelper.visible = true;
                    } else {
                        if (child.userData.originalMat) child.material = child.userData.originalMat;
                        if (child.userData.edgesHelper) child.userData.edgesHelper.visible = false;
                    }
                }
            });
        });
    }

    /* --- ANIMATION --- */
    highlightItem(item) {
        const layer = this.layers[item.layerId];
        if (!layer) return;
        const targetMesh = layer.group.children.find(child => child.userData === item);
        
        if (!targetMesh || !layer.visible) return;

        const currentY = targetMesh.position.y;
        const bounceHeight = currentY + 60;

        new TWEEN.Tween(targetMesh.position)
            .to({ y: bounceHeight }, 300)
            .yoyo(true).repeat(3)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();

        // targetMesh.traverse((child) => {
        //     if (child.isMesh) {
        //         const oldMat = child.material;
        //         const flashMat = oldMat.clone();
        //         flashMat.color.setHex(0xffff00);
        //         child.material = flashMat;
        //         new TWEEN.Tween(child.material.color)
        //             .to({ r: 1, g: 1, b: 0 }, 300)
        //             .yoyo(true).repeat(3)
        //             .onComplete(() => { child.material = oldMat; })
        //             .start();
        //     }
        // });
    }
    
    findMesh(item) {
        const layer = this.layers[item.layerId];
        if (!layer) return null;
        return layer.group.children.find(c => c.userData === item);
    }

    /* --- ANIMATED FILTERING --- */
    
    // Fade out items not on the target floor
    fadeItemsByFloor(activeFloorId, duration = 1000) {
        this.activeFloorId = activeFloorId;

        Object.values(this.layers).forEach(layer => {
            if (!layer.visible) return;

            layer.group.children.forEach(child => {
                const isOnFloor = (child.userData.floorId === activeFloorId);
                const targetOpacity = isOnFloor ? 1 : 0;
                
                // If we need to show it, make sure it's visible first
                if (isOnFloor) child.visible = true;

                this.animateChildOpacity(child, targetOpacity, duration, () => {
                    // If faded out completely, set visible = false for performance
                    if (targetOpacity === 0) child.visible = false;
                });
            });
        });
    }

    // Fade all items back in
    fadeAllItemsIn(duration = 1000) {
        this.activeFloorId = null;

        Object.values(this.layers).forEach(layer => {
            if (!layer.visible) return;

            layer.group.children.forEach(child => {
                child.visible = true; // Ensure visible start
                this.animateChildOpacity(child, 1, duration);
            });
        });
    }

    // Helper to fade mesh + label
    animateChildOpacity(child, targetOpacity, duration, onComplete) {
        // 1. Fade Mesh Materials (Recursive for Groups like Laptop)
        child.traverse((c) => {
            if (c.isMesh && c.material) {
                c.material.transparent = true;
                new TWEEN.Tween(c.material)
                    .to({ opacity: targetOpacity }, duration)
                    .easing(TWEEN.Easing.Quadratic.Out)
                    .start();
            }
        });

        // 2. Fade CSS Label
        const label = child.children.find(c => c.isCSS2DObject);
        if (label) {
            // CSS objects opacity must be handled via DOM
            if (targetOpacity === 0) {
                // Fade out then hide
                label.element.style.transition = `opacity ${duration}ms`;
                label.element.style.opacity = 0;
            } else {
                // Show then fade in
                label.visible = true;
                // Force reflow
                label.element.offsetHeight; 
                label.element.style.transition = `opacity ${duration}ms`;
                label.element.style.opacity = 1;
            }
        }

        // Callback for setting .visible = false after fade out
        if (onComplete) {
            setTimeout(onComplete, duration);
        }
    }
}
```

## js/SceneManager.js

```javascript
import * as THREE from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

export class SceneManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;

        // 1. Setup Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0);

        // 2. Camera
        this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 10, 50000);
        this.camera.position.set(0, 1000, 2000);

        // 3. WebGL Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        // ENSURE THIS IS SET (It is default in newer Three.js, but good to be explicit)
        this.renderer.outputColorSpace = THREE.SRGBColorSpace; 
        this.renderer.capabilities.logarithmicDepthBuffer = true;
        this.renderer.domElement.style.position = 'absolute';
        this.renderer.domElement.style.top = '0';
        this.renderer.domElement.style.zIndex = '0';
        this.container.appendChild(this.renderer.domElement);

        // 4. Label Renderer
        this.labelRenderer = new CSS2DRenderer();
        this.labelRenderer.setSize(this.width, this.height);
        this.labelRenderer.domElement.style.position = 'absolute';
        this.labelRenderer.domElement.style.top = '0';
        this.labelRenderer.domElement.style.zIndex = '1';
        this.labelRenderer.domElement.style.pointerEvents = 'none'; // Allow clicks to pass through
        this.container.appendChild(this.labelRenderer.domElement);

        // 5. Lights
        const ambient = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambient);
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(1000, 2000, 1000);
        this.scene.add(dirLight);

        // 6. Resize Handler
        window.addEventListener('resize', () => this.onWindowResize(), false);
    }

    /* --- NEW METHOD --- */
    setBackground(isBlueprint) {
        if (isBlueprint) {
            // Match the Blueprint CSS (Deep Navy)
            // this.scene.background = new THREE.Color(0x001133); 
            this.scene.background = new THREE.Color(0x000000); 
        } else {
            // Revert to Standard (Light Grey)
            this.scene.background = new THREE.Color(0xf0f0f0);
        }
    }

    onWindowResize() {
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.width, this.height);
        this.labelRenderer.setSize(this.width, this.height);
    }

    update() {
        this.renderer.render(this.scene, this.camera);
        this.labelRenderer.render(this.scene, this.camera);
    }
}
```

## js/UIManager.js

```javascript
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
```

## js/main.js

```javascript
/* js/main.js */
import { Application } from './Application.js';

// Create and Start Application
const app = new Application();
app.init();

// Optional: Expose app to window for debugging in console
window.app = app;
```

## js/core/AssetFactory.js

```javascript
/* js/core/AssetFactory.js */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export class AssetFactory {
    constructor() {
        this.loader = new GLTFLoader();
        this.modelCache = {};
    }

    /* --- 1. MODEL LOADING --- */
    async preloadModels(typeToModelMap) {
        const uniquePaths = new Set();
        Object.values(typeToModelMap).forEach(modelId => {
            if (modelId.endsWith('.glb') || modelId.endsWith('.gltf')) {
                uniquePaths.add(modelId);
            }
        });

        const promises = Array.from(uniquePaths).map(path => {
            return new Promise((resolve) => {
                this.loader.load(path, (gltf) => {
                    // Normalize Size (Fit to 40x40x40 box)
                    const root = gltf.scene;
                    const box = new THREE.Box3().setFromObject(root);
                    const size = new THREE.Vector3();
                    box.getSize(size);
                    const scaleFactor = 40 / Math.max(size.x, size.y, size.z);
                    root.scale.set(scaleFactor, scaleFactor, scaleFactor);

                    // Normalize Pivot (Center Bottom)
                    const container = new THREE.Group();
                    container.add(root);

                    box.setFromObject(root); // Update box after scale
                    const center = new THREE.Vector3();
                    box.getCenter(center);
                    root.position.sub(center); // Center it
                    root.position.y += (box.max.y - box.min.y) / 2; // Move bottom to 0

                    this.modelCache[path] = container;
                    console.log(`Loaded model: ${path}`);
                    resolve();
                }, undefined, (e) => {
                    console.error(`Failed to load model ${path}`, e);
                    resolve(); // Resolve anyway so we don't block app
                });
            });
        });

        await Promise.all(promises);
    }

    /* --- 2. ASSET CREATION --- */
    createVisual(item, modelId, color, layerIcon) {
        let mesh;

        // A. Custom Model (GLB)
        if (this.modelCache[modelId]) {
            mesh = this.modelCache[modelId].clone();

            // --- CRITICAL FIX: CLONE MATERIALS & ENABLE TRANSPARENCY ---
            mesh.traverse((child) => {
                if (child.isMesh) {
                    // Clone material so fading one object doesn't fade all
                    child.material = child.material.clone();
                    // Enable transparency so opacity tweening works
                    child.material.transparent = true;
                    // Apply layer color tint if needed (optional)
                    // child.material.color.lerp(color, 0.5); 

                    // Note: If you want to FORCE the layer color on the model, uncomment:
                    // child.material.color.copy(color);
                }
            });
        }
        // B. Procedural Geometry
        else {
            mesh = this.createProceduralMesh(modelId, color);
        }

        // Attach Data
        mesh.userData = item;

        // C. Create Label
        const label = this.createLabel(item, layerIcon);

        // Label Height Logic
        const labelHeight = (modelId === 'cone') ? 10 : 60;
        label.position.set(0, labelHeight, 0);

        mesh.add(label);

        return mesh;
    }

    createProceduralMesh(modelId, color) {
        let geometry;
        // Ensure standard material handles transparency for fading
        const material = new THREE.MeshStandardMaterial({
            color: color,
            transparent: true // <--- IMPORTANT FOR FADING
        });

        switch (modelId) {
            case 'box':
                geometry = new THREE.BoxGeometry(40, 40, 40);
                geometry.translate(0, 20, 0); break;
            case 'sphere':
                geometry = new THREE.SphereGeometry(25, 32, 32);
                geometry.translate(0, 25, 0); break;
            case 'cone':
                geometry = new THREE.ConeGeometry(20, 60, 16);
                geometry.translate(0, 30, 0); geometry.rotateX(Math.PI); break;

            // --- NETWORK ---
            case 'ap':
                geometry = new THREE.BoxGeometry(30, 8, 30);
                geometry.translate(0, 4, 0); break;
            case 'server':
                geometry = new THREE.BoxGeometry(30, 70, 30);
                geometry.translate(0, 35, 0); break;
            case 'switch':
                //geometry = new THREE.BoxGeometry(60, 12, 40);
                //# geometry.translate(0, 6, 0); break;
                geometry = new THREE.SphereGeometry(15, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2); break;

            // --- DEVICES ---
            case 'laptop':
                const groupLap = new THREE.Group();
                const base = new THREE.Mesh(new THREE.BoxGeometry(30, 2, 20), material);
                const screen = new THREE.Mesh(new THREE.BoxGeometry(30, 20, 2), material);
                base.position.y = 1;
                screen.position.set(0, 11, -10); screen.rotation.x = 0.2;
                groupLap.add(base); groupLap.add(screen);
                return groupLap; // Returns Group, material shared but cloned instance per group call is safer if we clone material above? 
            // Actually here 'material' is created NEW every time createProceduralMesh is called, so it's safe!

            case 'desktop':
                geometry = new THREE.BoxGeometry(15, 40, 35);
                geometry.translate(0, 20, 0); break;

            case 'paper':
                geometry = new THREE.BoxGeometry(15, 40, 5);
                geometry.translate(0, 20, 0); break;

            case 'monitor':
                const groupMon = new THREE.Group();
                const stand = new THREE.Mesh(new THREE.CylinderGeometry(2, 4, 15), material);
                const panel = new THREE.Mesh(new THREE.BoxGeometry(40, 25, 2), material);
                stand.position.y = 7.5; panel.position.y = 25;
                groupMon.add(stand); groupMon.add(panel);
                return groupMon;

            // --- FACILITIES ---
            case 'clock':
                geometry = new THREE.CylinderGeometry(15, 15, 4, 32);
                geometry.rotateX(Math.PI / 2); geometry.translate(0, 20, 0); break;
            case 'dome':
                geometry = new THREE.SphereGeometry(15, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2); break;
            case 'bullet':
                geometry = new THREE.CylinderGeometry(8, 8, 30, 16);
                geometry.rotateX(Math.PI / 2); geometry.translate(0, 15, 0); break;
            case 'desk':
                geometry = new THREE.BoxGeometry(60, 4, 40);
                geometry.translate(0, 20, 0); break;

            // --- WEIGHT SCALE ---
            case 'scale':
                const groupScale = new THREE.Group();
                const baseGeo = new THREE.BoxGeometry(40, 4, 50);
                const baseMesh = new THREE.Mesh(baseGeo, material);
                baseMesh.position.y = 2;

                const poleGeo = new THREE.BoxGeometry(4, 40, 4);
                const poleMesh = new THREE.Mesh(poleGeo, material);
                poleMesh.position.set(0, 20, -20);

                const headGeo = new THREE.BoxGeometry(20, 12, 4);
                const headMesh = new THREE.Mesh(headGeo, material);
                headMesh.position.set(0, 40, -18);

                groupScale.add(baseMesh); groupScale.add(poleMesh); groupScale.add(headMesh);
                return groupScale;

            default:
                // Default to Cone
                geometry = new THREE.ConeGeometry(20, 60, 16);
                geometry.translate(0, 30, 0); geometry.rotateX(Math.PI); break;
        }

        return new THREE.Mesh(geometry, material);
    }

    
    // Update the signature to accept the full item
    createLabel(item, layerIcon) {
        
        const ICON_MAP = {
            'house': '🏠',  // You can use emojis for simplicity
            'server': '🖥️',
            'wifi': '📡',
            'warning': '⚠️',
            'camera': '📷',
            'note': '📝',      
            'operator': '👷',  
            'scale': '⚖️',     
            'scanner': '🔫' ,
            'clock': '🕒'   
        };

        const div = document.createElement('div');
        div.className = 'label';

        // 1. Check if Layer has a specific Icon config
        if (layerIcon && ICON_MAP[layerIcon]) {
            const iconSpan = document.createElement('span');
            iconSpan.textContent = ICON_MAP[layerIcon];
            iconSpan.style.marginRight = '5px';
            iconSpan.style.fontSize = '1.2em';
            div.appendChild(iconSpan);
        } 
        // 2. Fallback to the old "Dot" logic if no icon is configured
        else {
            // Status Dot
            const dot = document.createElement('span');
            const statusClass = (item.status === 'Inactive') ? 'status-inactive' : 'status-active';
            dot.className = `status-dot ${statusClass}`;
            div.appendChild(dot);
        }
        // Text
        div.appendChild(document.createTextNode(item.name));

        // Click Event
        div.addEventListener('click', (e) => {
            e.stopPropagation();
            // FIX: Pass the FULL item object, which contains layerId, x, y, etc.
            window.dispatchEvent(new CustomEvent('item-clicked', { detail: item }));
        });

        return new CSS2DObject(div);
    }
}
```

## js/core/Materials.js

```javascript
/* js/core/Materials.js */
import * as THREE from 'three';

export const Materials = {
    // Factory method for the Blueprint Shader
    createBlueprintMaterial(originalTexture) {
        return new THREE.ShaderMaterial({
            uniforms: {
                map: { value: originalTexture },
                bgColor: { value: new THREE.Color(0x000000) }, // Black background
                lineColor: { value: new THREE.Color(0xffffff) } // White lines
            },
            side: THREE.DoubleSide,
            transparent: true,
            vertexShader: `
                varying vec2 vUv; 
                void main() { 
                    vUv = uv; 
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); 
                }
            `,
            fragmentShader: `
                uniform sampler2D map; 
                uniform vec3 bgColor; 
                uniform vec3 lineColor; 
                varying vec2 vUv;

                void main() {
                    vec4 texColor = texture2D(map, vUv);
                    
                    // Detect edges/lines based on brightness
                    // (Assuming blueprints are dark lines on white, or inverted)
                    // Adjust logic based on your specific floor plan images
                    
                    // Simple logic: Dark pixels = Lines, Light pixels = Background
                    // We invert this logic if source is White Background / Black Lines
                    
                    float brightness = dot(texColor.rgb, vec3(0.333));
                    
                    // Threshold: pixels darker than 0.9 are lines
                    float isLine = 1.0 - smoothstep(0.4, 0.9, brightness);
                    
                    // Preserve original Alpha if PNG
                    isLine *= texColor.a;

                    vec3 finalColor = mix(bgColor, lineColor, isLine);
                    gl_FragColor = vec4(finalColor, 1.0);
                }
            `
        });
    }
};
```

## js/editor/AddItemModal.js

```javascript
/* js/editor/AddItemModal.js */

export class AddItemModal {
    constructor(editor, layerManager) {
        this.editor = editor;
        this.layerManager = layerManager;

        // DOM Elements
        this.modal = document.getElementById('edit-modal');
        this.inpName = document.getElementById('inp-name');
        this.inpLayer = document.getElementById('inp-layer');
        this.inpType = document.getElementById('inp-type');
        this.btnConfirm = document.getElementById('btn-confirm');
        this.btnCancel = document.getElementById('btn-cancel');

        this.tempPos = null;
    }

    init() {
        if (!this.modal) return;

        window.addEventListener('floor-dblclick', (e) => this.onFloorDoubleClick(e));
        this.btnConfirm.addEventListener('click', () => this.confirm());
        this.btnCancel.addEventListener('click', () => this.hide());
        this.inpLayer.addEventListener('change', () => this.updateTypeDropdown());
    }

    onFloorDoubleClick(e) {
        if (!this.editor.isEditMode) return;

        const { point, clientX, clientY } = e.detail;
        this.tempPos = point;

        // Populate Layer Dropdown
        this.inpLayer.innerHTML = '';
        Object.keys(this.layerManager.layers).forEach(layerId => {
            const layer = this.layerManager.layers[layerId];
            const opt = document.createElement('option');
            opt.value = layerId;
            opt.textContent = layer.name;
            this.inpLayer.appendChild(opt);
        });

        this.updateTypeDropdown();

        // Show Modal
        this.modal.style.display = 'block';
        this.modal.style.left = clientX + 'px';
        this.modal.style.top = clientY + 'px';

        this.inpName.value = '';
        this.inpName.focus();
    }

    updateTypeDropdown() {
        const layerId = this.inpLayer.value;
        const types = this.layerManager.getTypesForLayer(layerId);

        this.inpType.innerHTML = '';
        types.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            opt.textContent = t;
            this.inpType.appendChild(opt);
        });
    }

    confirm() {
        const name = this.inpName.value;
        const layerId = this.inpLayer.value;
        const type = this.inpType.value;

        // --- NEW LOGIC START ---
        
        // 1. Get Active Floor Index from FloorManager (via EditorManager)
        const floorIdx = this.editor.floorManager.activeFloorIndex;
        
        // Safety Check
        if (floorIdx === -1 || !this.editor.floorManager.floors[floorIdx]) {
            console.error("Cannot add item: No active floor selected.");
            return;
        }

        const currentFloorId = this.editor.floorManager.floors[floorIdx].id;
        
        // 2. Calculate Floor Height Offset (Assuming 300 units per floor)
        // Ideally use FloorManager constant if available, otherwise 300 is the hardcoded gap
        const floorHeight = floorIdx * 300; 

        if (!name || !this.tempPos) return;

        // Ensure layer is visible
        const targetLayer = this.layerManager.layers[layerId];
        if (!targetLayer.visible) {
            this.layerManager.toggleLayer(layerId, true);
            window.dispatchEvent(new CustomEvent('refresh-layer-list'));
        }

        // 3. Create Item Object
        const newItem = {
            layerId: layerId,
            name: name,
            type: type,
            // X and Y correspond to the 2D plane coordinates
            // (Note: In 3D space, Y is 'Z', but Excel calls it 'Y')
            x: Math.round(this.tempPos.x),
            y: Math.round(this.tempPos.z), 
            desc: "Added via Editor",
            status: "Active",
            lastAudit: new Date().toISOString().split('T')[0],
            floorId: currentFloorId // Tag for Filtering/Exporting
        };

        // 4. Add Item with Visual Offset
        // pass floorHeight as the second argument to elevate the model
        this.layerManager.addItem(newItem, floorHeight);

        // --- NEW LOGIC END ---

        this.hide();
    }

    hide() {
        this.modal.style.display = 'none';
        this.tempPos = null;
    }
}
```

## js/editor/ContextMenu.js

```javascript
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
```

## js/editor/DataExporter.js

```javascript
/* js/editor/DataExporter.js */

export class DataExporter {
    constructor(layerManager) {
        this.layerManager = layerManager;
    }

    // ACCEPT floorId PARAMETER
    exportData(floorId) {
        if (!floorId) {
            alert("No floor selected for export!");
            return;
        }

        if (!confirm(`Download updated data for ${floorId}?`)) return;
        
        if (typeof XLSX === 'undefined') {
            alert("XLSX library not loaded!");
            return;
        }

        const wb = XLSX.utils.book_new();
        let hasData = false;

        Object.keys(this.layerManager.layers).forEach(layerId => {
            const layer = this.layerManager.layers[layerId];
            
            // --- FIX: FILTER BY FLOOR ID ---
            // Only get items that belong to the current floor
            const items = layer.items.filter(item => item.floorId === floorId);

            if (items.length > 0) {
                hasData = true;
                const excelRows = items.map(item => ({
                    Name: item.name,
                    Type: item.type,
                    X: item.x,
                    Y: item.y,
                    Description: item.desc || "",
                    Status: item.status || "Active",
                    LastAudit: item.lastAudit || "",
                        // [ADD THIS LINE] Save the color back to the Excel file
                    Color: item.color || "" 
                }));

                const ws = XLSX.utils.json_to_sheet(excelRows);
                XLSX.utils.book_append_sheet(wb, ws, layerId);
            }
        });

        if (!hasData) return alert(`No items found on ${floorId} to export!`);

        const dateStr = new Date().toISOString().slice(0,19).replace(/:/g,"-");
        
        // Include Floor ID in filename
        XLSX.writeFile(wb, `${floorId}_data_${dateStr}.xlsx`);
    }
}
```

## js/editor/DragController.js

```javascript
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
```

## js/ui/ElevatorPanel.js

```javascript
/* js/ui/ElevatorPanel.js */

export class ElevatorPanel {
    constructor(floorManager) {
        this.floorManager = floorManager;
        this.floorBtns = [];
        this.container = null;
    }

    create(floors) {
        console.log("UI: Creating Elevator Panel");

        // Create Container
        this.container = document.createElement('div');
        this.container.id = 'elevator-panel'; // Styles from CSS
        
        // Inline styles for critical positioning (fallback if CSS missing)
        Object.assign(this.container.style, {
            position: 'absolute',
            bottom: '30px',
            right: '30px',
            display: 'flex',
            flexDirection: 'column-reverse',
            gap: '12px',
            padding: '12px',
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(5px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '25px',
            zIndex: '1000'
        });

        this.floorBtns = [];

        floors.forEach((floor, index) => {
            const btn = document.createElement('button');
            btn.textContent = `F${index + 1}`;
            btn.title = floor.name || `Floor ${index + 1}`;
            
            // Basic styles
            Object.assign(btn.style, {
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                border: '2px solid #555',
                background: '#333',
                color: 'white',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            });

            // Events
            btn.onmouseenter = () => this.onHover(btn, index, true);
            btn.onmouseleave = () => this.onHover(btn, index, false);
            btn.onclick = () => this.onClick(index);

            this.floorBtns.push(btn);
            this.container.appendChild(btn);
        });

        this.attachToDOM();
    }

    attachToDOM() {
        const viewer = document.getElementById('canvas-container');
        if (viewer) {
            if (getComputedStyle(viewer).position === 'static') viewer.style.position = 'relative';
            viewer.appendChild(this.container);
        } else {
            document.body.appendChild(this.container);
        }
    }

    onHover(btn, index, isEnter) {
        if (this.floorManager.activeFloorIndex === index) return; // Don't change active style
        btn.style.borderColor = isEnter ? '#aaa' : '#555';
    }

    onClick(index) {
        const isActive = (this.floorManager.activeFloorIndex === index);
        // Delegate logic to FloorManager
        this.floorManager.toggleFloorIsolation(index);
        this.updateState(isActive ? -1 : index);
    }

    updateState(activeIndex) {
        this.floorBtns.forEach((btn, index) => {
            const isActive = (index === activeIndex);
            Object.assign(btn.style, {
                background: isActive ? '#00d2ff' : '#333',
                color: isActive ? '#000' : '#fff',
                borderColor: isActive ? '#00d2ff' : '#555',
                boxShadow: isActive ? '0 0 15px #00d2ff' : 'none',
                transform: isActive ? 'scale(1.1)' : 'scale(1)'
            });
        });
    }
}
```

## js/ui/LayerPanel.js

```javascript
/* js/ui/LayerPanel.js */

export class LayerPanel {
    constructor(layerManager, updateRightPanelCallback) {
        this.layerManager = layerManager;
        this.onLayerToggle = updateRightPanelCallback; // Callback to clear right panel if needed
        this.container = document.getElementById('layer-list');
    }

    init() {
        if (!this.container) return;
        this.renderControls();
        this.renderList();
    }

    renderControls() {
        // Insert "All / None" buttons above the list
        if(!this.container.parentNode) return;

        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'display:flex; gap:10px; margin-bottom:10px; padding-bottom:10px; border-bottom:1px solid #444;';

        const btnAll = this.createBtn("All", () => this.setAll(true));
        const btnNone = this.createBtn("None", () => this.setAll(false));

        wrapper.appendChild(btnAll);
        wrapper.appendChild(btnNone);
        
        this.container.parentNode.insertBefore(wrapper, this.container);
    }

    createBtn(text, onClick) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.fontSize = "0.8rem";
        btn.style.padding = "4px";
        btn.onclick = onClick;
        return btn;
    }

    setAll(visible) {
        Object.keys(this.layerManager.layers).forEach(id => {
            this.layerManager.toggleLayer(id, visible);
        });
        this.renderList();
    }

    renderList() {
        this.container.innerHTML = '';
        Object.keys(this.layerManager.layers).forEach(id => {
            const layer = this.layerManager.layers[id];
            
            const row = document.createElement('div');
            row.className = 'layer-item'; // CSS class

            // Checkbox
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = layer.visible;
            checkbox.onchange = (e) => {
                this.layerManager.toggleLayer(id, e.target.checked);
                if (!e.target.checked && this.onLayerToggle) {
                    this.onLayerToggle(id, false); // Notify to clear selection if layer hidden
                }
            };

            // Color Dot
            const dot = document.createElement('span');
            dot.style.cssText = `display:inline-block; width:12px; height:12px; border-radius:50%; margin:0 8px 0 5px; border:1px solid #555; background-color:#${layer.color.getHexString()}`;

            // Name Label
            const label = document.createElement('span');
            label.textContent = layer.name;
            label.style.cursor = 'pointer';
            label.onclick = () => {
                if (layer.visible && this.onLayerToggle) this.onLayerToggle(id, true);
                else alert("Turn on the layer first.");
            };

            row.appendChild(checkbox);
            row.appendChild(dot);
            row.appendChild(label);
            this.container.appendChild(row);
        });
    }
}
```

## js/ui/PropertiesPanel.js

```javascript
/* js/ui/PropertiesPanel.js */

export class PropertiesPanel {
    constructor(layerManager) {
        this.layerManager = layerManager;
        this.listContainer = document.getElementById('item-list');
        this.detailsContainer = document.getElementById('item-details'); // <--- ADD THIS
        this.activeLayerId = null;
        this.activeFloorId = null; // Store active floor context
    }

    setFloorFilter(floorId) {
        this.activeFloorId = floorId;
        // If a list is currently open, refresh it immediately
        if (this.activeLayerId) {
            this.showLayerItems(this.activeLayerId);
        }
        console.log(`Floor filter set to: ${floorId}`);
    }
    
    /* js/ui/PropertiesPanel.js */

    // Called when user clicks a Layer name in Left Panel
    showLayerItems(layerId) {
        this.activeLayerId = layerId;
        if (!this.listContainer) return;
        this.listContainer.innerHTML = '';

        // Header
        const header = document.createElement('h3');
        const layerName = this.layerManager.layers[layerId] ? this.layerManager.layers[layerId].name : layerId;
        header.textContent = layerName;
        header.style.cssText = 'padding:10px; border-bottom:1px solid #444; margin:0; position:sticky; top:0; background:#2a2a2a; z-index:5;';
        this.listContainer.appendChild(header);

        // 1. Get All Items
        let items = this.layerManager.getLayerItems(layerId);
        
        // --- 2. APPLY FILTER (THIS IS THE MISSING PART) ---
        if (this.activeFloorId) {
            // Only keep items where item.floorId matches the active floor
            items = items.filter(item => item.floorId === this.activeFloorId);
        }
        // --------------------------------------------------

        if (items.length === 0) {
            const contextMsg = this.activeFloorId ? `on ${this.activeFloorId}` : 'in this layer';
            this.listContainer.innerHTML += `<div class="empty-state">No items ${contextMsg}.</div>`;
            return;
        }

        items.forEach(item => {
            const li = document.createElement('li');
            li.userData = item; // For highlighting logic

            const isInactive = item.status === 'Inactive';
            const floorNum = (item.floorId || '').replace(/\D/g, '') || '?';
            const displayName = `F${floorNum}: ${item.name}`;

            // --- AUDIT CHECK ---
            const auditInfo = this.checkAudit(item.lastAudit);
            const warningHTML = auditInfo.overdue 
                ? `<span title="Audit Overdue" style="font-size:1.2rem;">⚠️</span>` 
                : '';

            // --- HTML STRUCTURE ---
            li.innerHTML = `
                <div class="list-item-left">
                    <span class="list-status-dot" style="background:${isInactive ? '#f44' : '#4f4'}"></span>
                    <span>${displayName}</span>
                </div>
                <div class="list-item-right">
                    ${warningHTML}
                </div>
            `;
            
            // Flex styling for the LI (ensure this is in CSS or inline)
            li.style.display = 'flex';
            li.style.justifyContent = 'space-between';
            li.style.alignItems = 'center';

            li.onclick = () => this.selectItem(item, li);
            this.listContainer.appendChild(li);
        });
    }

// ... rest of the file ...

    // NEW METHOD
    highlightItemInList(item) {
        // 1. Find the LI element
        // We iterate through children because we don't store LI references in a map (though we could for performance)
        const listItems = Array.from(this.listContainer.children);
        
        let targetLi = null;

        listItems.forEach(li => {
            // Reset all
            li.classList.remove('selected');
            
            // Match Logic:
            // We need a robust way to match. Since we changed the display text to "F1: Name",
            // li.textContent won't match item.name exactly anymore.
            // BEST PRACTICE: Attach the item data to the DOM element property
            if (li.userData === item) {
                targetLi = li;
            }
        });

        // 2. Highlight and Scroll
        if (targetLi) {
            targetLi.classList.add('selected');
            
            // Auto-Scroll
            targetLi.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });

            // Also show details
            this.renderDetails(item);
        }
    }

    selectItem(item, liElement) {
        // UI Highlight
        if (liElement) {
            Array.from(this.listContainer.children).forEach(c => c.classList.remove('selected'));
            liElement.classList.add('selected');
        }

        // Show Details
        this.renderDetails(item);

        // Notify Main App (to move camera)
        window.dispatchEvent(new CustomEvent('focus-item', { detail: item }));
    }


    renderDetails(item) {
        // 1. Safety Check
        if (!this.detailsContainer) {
            console.error("Details container not found!");
            return;
        }

        // 2. Audit Helper
        const auditInfo = this.checkAudit(item.lastAudit);
        const auditHTML = auditInfo.overdue 
            ? `<div class="audit-warning" style="color:#ff8888; margin-top:5px;">⚠️ Overdue: ${auditInfo.text}</div>`
            : `<div class="audit-ok" style="color:#88ff88; margin-top:5px;">✓ OK: ${auditInfo.text}</div>`;

        // 3. Render HTML
        this.detailsContainer.innerHTML = `
            <h3 style="margin-top:0; border-bottom:1px solid #444; padding-bottom:5px;">${item.name}</h3>
            
            <div style="font-size:0.9rem; line-height:1.6;">
                <div><strong>Type:</strong> ${item.type || 'N/A'}</div>
                <div><strong>Layer:</strong> ${item.layerId || 'N/A'}</div>
                <div><strong>Floor:</strong> ${item.floorId || 'N/A'}</div>
                <div><strong>Status:</strong> <span style="color:${item.status === 'Inactive' ? '#f44' : '#4f4'}">${item.status}</span></div>
                <div><strong>Pos:</strong> X:${item.x}, Y:${item.y}</div>
                ${auditHTML}
            </div>
            
            <div class="divider" style="height:1px; background:#444; margin:10px 0;"></div>
            
            <div style="color:#aaa; font-style:italic;">
                ${item.desc || 'No description provided.'}
            </div>
        `;
    }


    clear() {
        this.activeLayerId = null;
        if(this.listContainer) this.listContainer.innerHTML = '<div class="empty-state">Select a layer...</div>';
        if(this.detailsContainer) this.detailsContainer.innerHTML = '<div class="hint">Select an item</div>';
    }

    // Utility
    checkAudit(dateVal) {
        if (!dateVal) return { overdue: false, text: "N/A" };
        const date = (dateVal instanceof Date) ? dateVal : new Date(dateVal);
        const yearAgo = new Date();
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        return { overdue: date < yearAgo, text: date.toISOString().split('T')[0] };
    }

    refresh() {
        // Only refresh if a layer is currently selected
        if (this.activeLayerId) {
            console.log("Refreshing Right Panel for Layer:", this.activeLayerId);
            this.showLayerItems(this.activeLayerId);
        }
    }
}
```

