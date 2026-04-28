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

        // Flow pause state
        this._flowPaused      = false;
        this._flowPauseOffset = 0;
        this._pauseStart      = 0;
        this._lastFlowT       = 0;

        // Label visibility toggle
        this._labelsVisible   = true;

        // Per-layer label-cycle mode: 0=Name, 1=Name1, 2=Name2
        this._labelModes = {};
    }

    toggleLabels() {
        this._labelsVisible = !this._labelsVisible;
        Object.values(this.layers).forEach(layer => {
            if (!this._labelsVisible) {
                // Hide all labels unconditionally
                layer.group.traverse(child => {
                    if (child.isCSS2DObject) child.visible = false;
                });
            } else {
                // Show labels only for items that are actually visible:
                // layer must be enabled AND the item must not be filtered out by floor
                if (!layer.visible) return;
                layer.group.children.forEach(visual => {
                    if (!visual.visible) return; // hidden by floor filter
                    visual.traverse(child => {
                        if (child.isCSS2DObject) {
                            child.visible = true;
                            // Also reset DOM opacity — the floor-switch fade animation
                            // may have left element.style.opacity = '0' even though
                            // the Three.js visible flag is now true.
                            child.element.style.transition = 'opacity 0.2s';
                            child.element.style.opacity = 1;
                        }
                    });
                });
            }
        });
        return this._labelsVisible;
    }

    hasAlternateLabels(layerId) {
        const layer = this.layers[layerId];
        if (!layer?.items?.length) return false;
        return layer.items.some(item => item.name1 || item.name2 || item.name3);
    }

    // Tint a mesh grey (obsolete) or restore its original material
    _applyObsoleteStyle(item, isObsolete) {
        const visual = this.findMesh(item);
        if (!visual) return;
        visual.traverse(child => {
            if (!child.isMesh) return;
            if (isObsolete) {
                if (!child.userData._origMat) child.userData._origMat = child.material;
                const grey = child.userData._origMat.clone();
                grey.color.setHex(0x555555);
                grey.opacity = 0.4;
                grey.transparent = true;
                child.material = grey;
            } else if (child.userData._origMat) {
                child.material = child.userData._origMat;
                delete child.userData._origMat;
            }
        });
    }

    cycleLabelMode(layerId) {
        const layer = this.layers[layerId];
        if (!layer) return;

        const hasName1 = layer.items.some(i => i.name1);
        const hasName2 = layer.items.some(i => i.name2);
        const hasName3 = layer.items.some(i => i.name3);
        const maxMode  = hasName3 ? 3 : hasName2 ? 2 : hasName1 ? 1 : 0;

        const current = this._labelModes[layerId] ?? 0;
        const next    = current >= maxMode ? 0 : current + 1;
        this._labelModes[layerId] = next;

        layer.group.traverse(child => {
            if (!child.isCSS2DObject) return;
            const item = child.userData.item;
            if (!item) return;

            const isObsoleteNow = next    === 3 && item.name3 === '-';
            const wasObsolete   = current === 3 && item.name3 === '-';

            // Apply / remove obsolete mesh tint when the state changes
            if (isObsoleteNow !== wasObsolete) {
                this._applyObsoleteStyle(item, isObsoleteNow);
            }

            if (isObsoleteNow) {
                child.visible = false;
                return;
            }
            if (wasObsolete) {
                // Only restore if global label toggle allows it
                child.visible = this._labelsVisible;
            }

            const newText = next === 1 ? (item.name1 || item.name) :
                            next === 2 ? (item.name2 || item.name) :
                            next === 3 ? (item.name3 || item.name) :
                            item.name;
            const el = child.element;

            // Lazily wrap the text node in an inner span so the animation
            // transform doesn't conflict with CSS2DRenderer's outer positioning transform
            let textSpan = el.querySelector('.label-inner');
            if (!textSpan) {
                const textNode = Array.from(el.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
                if (textNode) {
                    textSpan = document.createElement('span');
                    textSpan.className = 'label-inner';
                    textSpan.style.display = 'inline-block';
                    textSpan.textContent = textNode.textContent;
                    el.replaceChild(textSpan, textNode);
                }
            }

            if (textSpan) {
                textSpan.style.animation = 'none';
                void textSpan.offsetWidth;
                textSpan.style.animation = 'label-flip 0.35s ease';
                setTimeout(() => { textSpan.textContent = newText; }, 140);
            } else {
                el.lastChild.textContent = newText;
            }
        });

        return next;
    }

    toggleFlowPause() {
        if (this._flowPaused) {
            this._flowPauseOffset += performance.now() - this._pauseStart;
            this._flowPaused = false;
        } else {
            this._pauseStart = performance.now();
            this._flowPaused = true;
        }
    }

    initFromConfig(configLayers, configTypes, currentRole = 'admin') {
        configLayers.forEach(cfg => {
            if (cfg.ViewRoles) {
                const allowed = cfg.ViewRoles.split(',').map(r => r.trim().toLowerCase());
                if (!allowed.includes(currentRole)) return;
            }
            const isVisible = (cfg.RenderType === 'area' || cfg.RenderType === 'flow') ? true : (cfg.id === 'it_dev');
            this.createLayer(cfg.id, cfg.name, cfg.color, isVisible, cfg.icon, cfg.RenderType);
            this.layers[cfg.id].group_name = cfg.Group || 'Other';
            this.layers[cfg.id].popup = !!cfg.Popup;
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

    createLayer(id, name, colorHex, initialVisible = true, icon = null, renderType = 'device') {
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
            icon: icon,
            renderType: renderType || 'device'
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

        // 1. FILTER: If a floor is active, show items on that floor + global items (cross-floor)
        if (this.activeFloorId) {
            items = items.filter(item => item.floorId === this.activeFloorId || !item.floorId || item.floorId === 'global');
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

        // --- FLOW LAYER ---
        if (layer.renderType === 'flow') {
            const flowColor = item.color ? new THREE.Color(item.color) : layer.color;
            const visual = this.factory.createFlowVisual(item, flowColor);
            // Cross-floor paths (floorId='global' or '') use absolute Y=0;
            // their points already carry absolute world Y via 3-part "x,z,y" format.
            const flowYOffset = (!item.floorId || item.floorId === 'global') ? 0 : heightOffset;
            visual.position.set(0, flowYOffset, 0);
            visual.userData = item;
            visual.userData.floorOffset = flowYOffset;

            layer.group.add(visual);
            layer.items.push(item);
            return;
        }

        // --- AREA LAYER ---
        if (layer.renderType === 'area') {
            const visual = this.factory.createAreaVisual(item);
            visual.position.set(item.x, heightOffset + 2, item.y);
            visual.userData = item;
            visual.userData.floorOffset = heightOffset;

            const label = visual.children.find(c => c.isCSS2DObject);
            if (label) {
                label.userData.item = item;
                label.element.onclick = (e) => {
                    e.stopPropagation();
                    window.dispatchEvent(new CustomEvent('item-clicked', { detail: item }));
                };
                label.visible = layer.visible;
            }

            layer.group.add(visual);
            layer.items.push(item);
            return;
        }

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
        if (label) {
            label.userData.item = item;
            label.element.onclick = (e) => {
                e.stopPropagation();
                window.dispatchEvent(new CustomEvent('item-clicked', { detail: item }));
            };
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
                const offset = mesh.userData.floorOffset || 0;
                if (layer.renderType === 'area') {
                    mesh.position.set(newX, offset + 2, newY);
                } else {
                    const modelId = this.typeToModelMap[item.type] || 'cone';
                    const elevation = (modelId === 'cone') ? 50 : 0;
                    mesh.position.set(newX, elevation + offset, newY);
                }
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
                if (label) {
                    const labelOn = shouldBeVisible && this._labelsVisible;
                    label.visible = labelOn;
                    if (labelOn) {
                        label.element.style.transition = '';
                        label.element.style.opacity = 1;
                    }
                }
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

    /* --- ANIMATION --- */
    highlightItem(item) {
        const layer = this.layers[item.layerId];
        if (!layer) return;
        if (layer.renderType === 'area' || layer.renderType === 'flow') return;
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

    /* --- FLOW ANIMATION --- */
    // Called every frame (before sceneManager.update / renderer.render).
    // Position updates here are always reflected correctly because Three.js
    // recomputes world matrices at the start of renderer.render().
    updateFlowAnimations() {
        // Always update _lastFlowT when running; freeze it when paused so
        // pulses stay exactly in place instead of the loop early-returning
        // (which can leave stale positions from the last frame).
        if (!this._flowPaused) {
            this._lastFlowT = (performance.now() - this._flowPauseOffset) / 1000;
        }
        const t = this._lastFlowT;
        Object.values(this.layers).forEach(layer => {
            if (layer.renderType !== 'flow' || !layer.visible) return;
            layer.group.children.forEach(visual => {
                if (!visual.visible || !visual._flowCurve) return;
                const curve  = visual._flowCurve;
                const speed  = visual._flowSpeed || 1;
                const n = visual._flowPulses.length;
                visual._flowPulses.forEach((pulse, i) => {
                    const phase = i / n;

                    if (pulse._isHuman) {
                        // Variable walking speed + slight lateral wander
                        const speedMod = 1 + 0.18 * Math.sin(t * 2.0 + pulse._speedSeed);
                        const tVal = ((t * speed * 0.005 * speedMod) + phase) % 1;
                        const pos     = curve.getPointAt(tVal);
                        const tangent = curve.getTangentAt(tVal);
                        // Perpendicular direction in XZ plane
                        const perp = new THREE.Vector3(-tangent.z, 0, tangent.x);
                        const lat  = pulse._lateralBias + pulse._lateralAmp * Math.sin(t * 0.6 + pulse._lateralSeed);
                        pulse.position.set(pos.x + perp.x * lat, pos.y + 6, pos.z + perp.z * lat);
                    } else {
                        const pos = curve.getPointAt(((t * speed * 0.08) + phase) % 1);
                        pulse.position.set(pos.x, pos.y + 6, pos.z);
                    }
                });
            });
        });
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
                    // Guard against stale timeouts: only hide if this item's floor
                    // is still not the active floor at the time the timer fires.
                    // Rapid floor-switching would otherwise hide items that have
                    // already been re-shown by the newer switch.
                    if (targetOpacity === 0) {
                        const fd = child.userData.floorId;
                        const current = this.activeFloorId;
                        if (!current || fd === current || !fd || fd === 'global') return;
                        child.visible = false;
                        // CSS2DRenderer uses traverseVisible() so it never visits children
                        // of hidden objects — explicitly hide the label DOM element so it
                        // cannot receive pointer events or appear on top of other floors.
                        const lbl = child.children.find(c => c.isCSS2DObject);
                        if (lbl) { lbl.visible = false; lbl.element.style.display = 'none'; }
                    }
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
        // 1. Fade Mesh + Line Materials (Recursive for Groups)
        child.traverse((c) => {
            if ((c.isMesh || c.isLine) && c.material) {
                c.material.transparent = true;
                const baseOpacity = c.userData.baseOpacity != null ? c.userData.baseOpacity : 1;
                new TWEEN.Tween(c.material)
                    .to({ opacity: targetOpacity * baseOpacity }, duration)
                    .easing(TWEEN.Easing.Quadratic.Out)
                    .start();
            }
        });

        // 2. Fade CSS Label
        const label = child.children.find(c => c.isCSS2DObject);
        if (label) {
            if (targetOpacity === 0) {
                // Disable pointer events immediately — CSS2DRenderer won't set display:none
                // on labels inside hidden meshes, so clicks would still fire on opacity-0 labels
                label.element.style.pointerEvents = 'none';
                label.element.style.transition = `opacity ${duration}ms`;
                label.element.style.opacity = 0;
            } else {
                // Restore display and pointer events before fading in
                label.element.style.display = '';
                label.element.style.pointerEvents = '';
                label.visible = this._labelsVisible;
                label.element.offsetHeight; // force reflow
                label.element.style.transition = `opacity ${duration}ms`;
                label.element.style.opacity = this._labelsVisible ? 1 : 0;
            }
        }

        // Callback for setting .visible = false after fade out
        if (onComplete) {
            setTimeout(onComplete, duration);
        }
    }
}
