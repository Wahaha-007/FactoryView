/* js/core/AssetFactory.js */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { CatmullRomCurve3 } from 'three';

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
            mesh = this.createProceduralMesh(modelId, color, item);
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

    createProceduralMesh(modelId, color, item = null) {
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

            case 'paper': {
                const geo = new THREE.BoxGeometry(15, 40, 5);
                geo.translate(0, 20, 0);
                const faceChar = (item?.extras?.Mark || '').toString().trim().charAt(0);
                if (faceChar) {
                    // Canvas texture for front (+z) and back (-z) faces
                    const canvas = document.createElement('canvas');
                    canvas.width = 64; canvas.height = 128;
                    const ctx = canvas.getContext('2d');
                    // Background: the item/layer color
                    ctx.fillStyle = '#' + color.getHexString();
                    ctx.fillRect(0, 0, 64, 128);
                    // Character: white fill with black stroke for readability on any background
                    ctx.font = 'bold 52px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.strokeStyle = '#000000';
                    ctx.lineWidth = 6;
                    ctx.lineJoin = 'round';
                    ctx.strokeText(faceChar, 32, 68);
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText(faceChar, 32, 68);
                    const tex = new THREE.CanvasTexture(canvas);
                    const faceMat = new THREE.MeshStandardMaterial({ map: tex, transparent: true });
                    // BoxGeometry material order: +x, -x, +y, -y, +z (front), -z (back)
                    return new THREE.Mesh(geo, [material, material, material, material, faceMat, faceMat]);
                }
                geometry = geo;
                break;
            }

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

    
    /* --- AREA VISUAL --- */
    createAreaVisual(item) {
        const group = new THREE.Group();

        const w           = item.width  || 500;
        const h           = item.height || 400;
        const fillColor   = new THREE.Color(item.color || '#ff6600');
        const raw         = parseFloat(item.opacity);
        const fillOpacity = (!isNaN(raw) && raw > 0 && raw <= 1) ? raw : 0.3;

        const fillMat = new THREE.MeshBasicMaterial({
            color: fillColor,
            transparent: true,
            opacity: fillOpacity,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        const fillMesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), fillMat);
        fillMesh.rotation.x = -Math.PI / 2;
        fillMesh.position.y = 0.5;
        fillMesh.renderOrder = 2;
        fillMesh.userData.baseOpacity = fillOpacity; // prevent fade system from overwriting to 1
        group.add(fillMesh);

        // Label
        const label = this.createAreaLabel(item);
        label.position.set(0, 1, 0);
        group.add(label);

        group.userData = item;
        return group;
    }

    /* --- FLOW VISUAL --- */
    createFlowVisual(item, color) {
        const group = new THREE.Group();

        // Parse points string into Vector3 array.
        // Format: "x,z" (2-part, y=0, floor height added by group position)
        //      or "x,z,y" (3-part, y is absolute world offset — used for cross-floor paths)
        const rawPoints = (item.points || '').split(';').map(pair => {
            const parts = pair.trim().split(',').map(Number);
            const px = parts[0], pz = parts[1];
            const py = parts.length >= 3 ? parts[2] : 0;
            return new THREE.Vector3(px, py, pz);
        }).filter(p => !isNaN(p.x) && !isNaN(p.z));

        if (rawPoints.length < 2) return group;

        // Smooth curve through all waypoints
        // tension: 0 = very curvy, 1 = nearly straight at waypoints (default 0.5)
        const tension = item.tension != null ? item.tension : 0.5;
        const curve = new CatmullRomCurve3(rawPoints, false, 'catmullrom', tension);
        const sampleCount = rawPoints.length * 20; // ~20 pts per segment = smooth curves
        const curvePoints = curve.getPoints(sampleCount);

        // Static dashed path line — skipped if item.showLine === false
        const lineGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
        const lineMat = new THREE.LineDashedMaterial({
            color:       color,
            dashSize:    item.dashSize || 30,
            gapSize:     item.gapSize  || 15,
            transparent: true,
            opacity:     0.6
        });
        const line = new THREE.Line(lineGeo, lineMat);
        line.computeLineDistances();
        if (item.showLine !== false) group.add(line);

        // Invisible hit tube — static mesh wrapping the path, used for hover raycasting.
        // TubeGeometry with visible=false lets us detect hover reliably (THREE.Line can't be raycasted).
        const hitGeo  = new THREE.TubeGeometry(curve, Math.max(20, rawPoints.length * 5), 15, 4, false);
        const hitMat  = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });
        const hitMesh = new THREE.Mesh(hitGeo, hitMat);
        group.add(hitMesh);
        group._flowHitMesh   = hitMesh;
        group._flowLine      = item.showLine !== false ? line : null;
        group._flowLineColor = new THREE.Color(color);

        // Animated pulse objects — count scales with curve length so density is uniform.
        // Positions are updated each frame in LayerManager.updateFlowAnimations()
        // BEFORE renderer.render(), so Three.js always picks up the new positions.
        const pulseCount = Math.max(1, Math.round(curve.getLength() / 250));
        const pulses = [];
        const startPos = rawPoints[0];
        for (let i = 0; i < pulseCount; i++) {
            const pulse = this._createPulseObject(item.shape, color);
            pulse.position.set(startPos.x, startPos.y + 6, startPos.z);

            // Human pulses get per-instance randomness for natural movement
            if (item.shape === 'human') {
                pulse._isHuman     = true;
                pulse._lateralBias = (Math.random() - 0.5) * 6;
                pulse._lateralAmp  = 2 + Math.random() * 3;
                pulse._lateralSeed = Math.random() * Math.PI * 2;
                pulse._speedSeed   = Math.random() * Math.PI * 2;
            }

            group.add(pulse);
            pulses.push(pulse);
        }

        // Store curve + pulse refs directly on the group so updateFlowAnimations can
        // access them without touching userData (which is reserved for item data).
        group._flowCurve  = curve;
        group._flowPulses = pulses;
        group._flowSpeed  = item.speed || 1;

        group.userData = item;
        return group;
    }

    // Returns a Mesh or Group. Box-type shapes get subtle edge lines using a
    // tinted-dark version of the fill colour (not pure black — avoids black-blob at zoom-out).
    _createPulseObject(shape, color) {
        const mat     = new THREE.MeshBasicMaterial({ color });
        const edgeColor = new THREE.Color(color).multiplyScalar(0.35);
        const edgeMat   = new THREE.LineBasicMaterial({ color: edgeColor });

        const withEdges = (mesh) => {
            mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), edgeMat));
            return mesh;
        };

        switch (shape) {
            case 'box':
                return withEdges(new THREE.Mesh(new THREE.BoxGeometry(16, 12, 20), mat));
            case 'small_box':
                return withEdges(new THREE.Mesh(new THREE.BoxGeometry(10, 8, 12), mat));
            case 'can': {
                // Rounded shape — no edges, silhouette is enough
                return new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 14, 12), mat);
            }
            case 'sack': {
                const geo = new THREE.CapsuleGeometry(5, 12, 4, 8);
                geo.rotateZ(Math.PI / 2);
                return new THREE.Mesh(geo, mat); // no edges on organic shape
            }
            case 'powder':
                return new THREE.Mesh(new THREE.SphereGeometry(5, 6, 4), mat); // soft — no hard edges

            case 'pallet': {
                // Flat wooden pallet carrying 4 boxes in a 2×2 arrangement (1.5× scale)
                const g = new THREE.Group();
                const base = withEdges(new THREE.Mesh(new THREE.BoxGeometry(33, 4.5, 22.5), mat));
                base.position.y = 2.25;
                g.add(base);
                [[-8.25, -5.25], [8.25, -5.25], [-8.25, 5.25], [8.25, 5.25]].forEach(([bx, bz]) => {
                    const box = withEdges(new THREE.Mesh(new THREE.BoxGeometry(13.5, 12, 9), mat));
                    box.position.set(bx, 10.5, bz);
                    g.add(box);
                });
                return g;
            }

            case 'human': {
                // Stylised human figure: head + body + arms + legs
                const g = new THREE.Group();
                // head
                g.add(new THREE.Mesh(new THREE.SphereGeometry(3, 8, 6), mat));
                // neck + body
                const body = withEdges(new THREE.Mesh(new THREE.CylinderGeometry(2, 2.5, 9, 8), mat));
                body.position.y = -7.5;
                g.add(body);
                // left arm
                const lArm = withEdges(new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 7, 6), mat));
                lArm.position.set(-4, -6, 0); lArm.rotation.z = 0.4;
                g.add(lArm);
                // right arm
                const rArm = withEdges(new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 7, 6), mat));
                rArm.position.set(4, -6, 0); rArm.rotation.z = -0.4;
                g.add(rArm);
                // left leg
                const lLeg = withEdges(new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1, 8, 6), mat));
                lLeg.position.set(-2, -16, 0);
                g.add(lLeg);
                // right leg
                const rLeg = withEdges(new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1, 8, 6), mat));
                rLeg.position.set(2, -16, 0);
                g.add(rLeg);
                // Position head at top (shift the whole figure up so feet are at y≈0)
                g.position.y = 20;
                return g;
            }

            default: // sphere — no hard edges needed
                return new THREE.Mesh(new THREE.SphereGeometry(8, 8, 6), mat);
        }
    }

    createAreaLabel(item) {
        const div = document.createElement('div');
        div.className = 'area-label';
        div.textContent = item.name;
        if (item.fontSize) div.style.fontSize = item.fontSize + 'px';
        div.addEventListener('click', (e) => {
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent('item-clicked', { detail: item }));
        });
        return new CSS2DObject(div);
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
