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
