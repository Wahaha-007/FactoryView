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
