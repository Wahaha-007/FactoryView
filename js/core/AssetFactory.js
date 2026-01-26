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
    createVisual(item, modelId, color) {
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
        const label = this.createLabel(item);

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
    createLabel(item) {
        const div = document.createElement('div');
        div.className = 'label';

        // Status Dot
        const dot = document.createElement('span');
        const statusClass = (item.status === 'Inactive') ? 'status-inactive' : 'status-active';
        dot.className = `status-dot ${statusClass}`;
        div.appendChild(dot);

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
