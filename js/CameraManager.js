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
