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
            const isVisible = (cfg.id === 'it_dev');
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
