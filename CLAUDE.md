# FactoryView — Claude Code Project Brief

## What this project is
A **3D Factory Digital Twin** web application. Users can view a multi-floor manufacturing facility in 3D, see equipment/devices by layer, click items for details, and use an Edit Mode to add or remove items. Data is stored in Excel files and imported/exported via the browser.

## Stack
- **Frontend:** Vanilla JavaScript ES6 modules — **no build step, no bundler**
- **3D Rendering:** Three.js v0.160.0 (loaded via importmap in `index.html`)
- **Animation:** Tween.js (must call `TWEEN.update()` in every animation frame)
- **Data:** SheetJS (XLSX) — reads `.xlsx` files directly in the browser
- **Auth:** Vercel Edge Middleware (`middleware.js`) with HMAC-SHA256 token in HttpOnly cookie
- **Backend:** Vercel serverless functions in `api/` (`auth.js`, `logout.js`)
- **Deployment:** Vercel (`vercel.json`)

## Architecture — Manager Pattern
All logic is split into single-responsibility manager classes. `Application.js` wires them together.

| Manager | File | Responsibility |
|---|---|---|
| SceneManager | `js/SceneManager.js` | Three.js scene, renderer, lights |
| CameraManager | `js/CameraManager.js` | Camera, orbit controls, `focusOn(x, y, worldY)` |
| LayerManager | `js/LayerManager.js` | Layer visibility, item meshes, highlight, `findMesh(item)` |
| FloorManager | `js/FloorManager.js` | Floor switching, loads floor data, floor height offsets |
| UIManager | `js/UIManager.js` | Left panel (layers), right panel (item list + details), elevator buttons |
| EditorManager | `js/EditorManager.js` | Edit mode: add/delete items, drag controls |
| DataLoader | `js/DataLoader.js` | Fetch & parse `.xlsx` workbooks (system config + floor data) |
| InputManager | `js/InputManager.js` | Mouse/keyboard events, raycasting for item clicks |

Sub-modules in `js/core/`: `AssetFactory.js`, `Materials.js`  
Sub-modules in `js/editor/`: modal dialogs, drag controllers, data export  
Sub-modules in `js/ui/`: `ElevatorPanel.js`, `LayerPanel.js`, `PropertiesPanel.js`

## Data Format

### `assets/system_config.xlsx` — loaded at startup
| Sheet | Columns | Purpose |
|---|---|---|
| `Layers` | id, name, ... | Defines all layer types |
| `Types` | id, model, ... | Maps type names to 3D model assets |
| `Floors` | id, name, dataFile, image, ... | Floor list, links to per-floor data files |

### `assets/floor_N_data.xlsx` — one per floor
Each **sheet name = layerId**. Each row is one item:
- Required: `X`, `Y` (position in floor units)
- Standard: `Name`, `Type`, `Description`, `Status`, `LastAudit`, `Color`
- Any extra columns become `extras` dict shown in the Details panel

## Key conventions
- **Floor height offset:** `(floorIndex) * 300` units in Y (world space)
- **Coordinate mapping:** item `x` = Three.js X, item `y` = Three.js Z (depth)
- **Events (window-level):** `refresh-layer-list`, `item-clicked`, `focus-item`, `item-deleted`
- **Auth:** `AUTH_SECRET` env var must be set in Vercel. Cookie name: `auth_token`

## Important constraints — do NOT violate
- **No build step.** Do not introduce Webpack, Vite, Rollup, or any bundler.
- **No npm packages.** All dependencies are CDN/importmap in `index.html`.
- **Do not change the auth cookie mechanism** without testing on Vercel — the edge middleware runs in a restricted environment.
- **Always call `TWEEN.update()`** in the animation loop or transitions will break.

## File layout
```
/assets/          — Floor PNG images + Excel data files
/api/             — Vercel serverless functions (auth.js, logout.js)
/js/              — All application JS (see Manager table above)
/css/style.css    — Dark theme UI styles
index.html        — Main app (3-panel layout)
login.html        — Auth page
middleware.js     — Vercel Edge auth guard
vercel.json       — Deployment config
compack.py        — Utility: generates FactoryView-PACKED.md project snapshot
```

## Testing / Running locally
Open `index.html` in a browser (via a local server, e.g. `npx serve .` or VS Code Live Server).  
Auth middleware only runs on Vercel — locally, no login is required.

## When adding a new manager or module
Follow the existing pattern: `constructor(deps)`, `init()`, event methods, no direct DOM access outside UIManager.
