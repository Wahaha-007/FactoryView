import * as THREE from 'three';

export class ScenePresetsPanel {
    constructor(cameraManager, layerManager, floorManager, dataLoader, roleManager) {
        this.cam     = cameraManager;
        this.lm      = layerManager;
        this.fm      = floorManager;
        this.dl      = dataLoader;
        this.rm      = roleManager;
        this.presets = [];
    }

    async init() {
        this.presets = await this.dl.loadPresets('assets/scene_presets.xlsx');
        this._render();
    }

    _render() {
        const wrap = document.createElement('div');
        wrap.id = 'scene-presets';

        for (let i = 1; i <= 16; i++) {
            const preset = this.presets.find(p => Number(p.id) === i);
            const btn = document.createElement('button');
            btn.className = preset ? 'preset-btn' : 'preset-btn preset-btn-empty';
            btn.textContent = preset ? preset.label : String(i);
            btn.title = preset ? (preset.tooltip || preset.label) : `Preset ${i} — not configured`;
            btn.disabled = !preset;
            if (preset) btn.addEventListener('click', () => this._apply(preset));
            wrap.appendChild(btn);
        }

        if (this.rm.canEdit()) {
            const cap = document.createElement('button');
            cap.id = 'btn-capture-preset';
            cap.textContent = '📷';
            cap.title = 'Capture current view → clipboard (paste into scene_presets.xlsx)';
            cap.addEventListener('click', () => this._capture(cap));
            wrap.appendChild(cap);
        }

        document.getElementById('canvas-container').appendChild(wrap);
    }

    applyPreset(preset) { this._apply(preset); }

    _apply(preset) {
        // 1. Camera
        const pos = new THREE.Vector3(Number(preset.cam_x), Number(preset.cam_y), Number(preset.cam_z));
        const tgt = new THREE.Vector3(Number(preset.tgt_x), Number(preset.tgt_y), Number(preset.tgt_z));
        this.cam.animateCamera(pos, tgt, 1000);

        // 2. Floor (pass skipCamera=true so clearIsolation doesn't override the camera above)
        const fi = Number(preset.floor_index);
        if (fi === -1) {
            this.fm.clearIsolation(true);
        } else {
            this.fm.isolateFloor(fi);
        }

        // 3. Layers (full snapshot)
        this._parseLayerString(preset.layers).forEach(([id, visible]) => {
            if (this.lm.layers[id]) this.lm.toggleLayer(id, visible);
        });
        window.dispatchEvent(new Event('refresh-layer-list'));

        // 4. Flow
        const wantPaused = Number(preset.flow_paused) === 1;
        if (this.lm._flowPaused !== wantPaused) this.lm.toggleFlowPause();

        // 5. Labels
        const wantHidden = Number(preset.labels_hidden) === 1;
        if (this.lm._labelsVisible === wantHidden) this.lm.toggleLabels();
    }

    _parseLayerString(str) {
        if (!str) return [];
        return String(str).split(',').map(p => {
            const [id, val] = p.trim().split(':');
            return [id?.trim(), val === '1'];
        }).filter(([id]) => id);
    }

    _capture(btn) {
        const pos = this.cam.camera.position;
        const tgt = this.cam.controls.target;
        const layers = Object.entries(this.lm.layers)
            .map(([id, l]) => `${id}:${l.visible ? 1 : 0}`).join(',');

        const row = [
            '',                              // id — user fills in
            '',                              // label
            '',                              // tooltip
            Math.round(pos.x),
            Math.round(pos.y),
            Math.round(pos.z),
            Math.round(tgt.x),
            Math.round(tgt.y),
            Math.round(tgt.z),
            this.fm.activeFloorIndex,
            layers,
            this.lm._flowPaused ? 1 : 0,
            this.lm._labelsVisible ? 0 : 1,
        ].join('\t');

        navigator.clipboard.writeText(row).then(() => {
            const orig = btn.textContent;
            btn.textContent = '✓';
            setTimeout(() => btn.textContent = orig, 1500);
        });
    }
}
