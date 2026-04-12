/* js/FloorManager.js */
import * as THREE from 'three';

export class FloorManager {
    constructor(sceneManager, layerManager, dataLoader, cameraManager) {
        this.sceneManager = sceneManager;
        this.layerManager = layerManager;
        this.dataLoader = dataLoader;
        this.cameraManager = cameraManager;

        this.floors = [];
        this.floorMeshes = [];
        this.FLOOR_GAP = 300;
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

}
