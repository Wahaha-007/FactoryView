export class DataLoader {
    constructor() {
        this._blobBase = null; // set by fetchBlobBase() if on Vercel
    }

    // Call once at startup. Silently skips on local dev.
    async fetchBlobBase() {
        try {
            const res = await fetch('/api/asset-url');
            if (res.ok) {
                const { blobBase } = await res.json();
                this._blobBase = blobBase || null;
            }
        } catch { /* local dev — no API route */ }
    }

    // Resolve the actual URL to use: prefer blob version if available
    async resolveUrl(staticPath) {
        if (!this.blobBase) return staticPath;
        const filename = staticPath.split('/').pop();
        // Use proxy URL instead of direct blob URL
        return `api/excel?file=${encodeURIComponent(filename)}`;
    }

    async loadPresets(url) {
        try {
            const wb = await this.fetchWorkbook(await this._resolveUrl(url));
            return wb.Sheets['Presets'] ? XLSX.utils.sheet_to_json(wb.Sheets['Presets']) : [];
        } catch { return []; }
    }

    async loadSystemConfig(url) {
        try {
            const workbook = await this.fetchWorkbook(await this._resolveUrl(url));
            const layers = workbook.Sheets['Layers'] ? XLSX.utils.sheet_to_json(workbook.Sheets['Layers']) : [];
            const types  = workbook.Sheets['Types']  ? XLSX.utils.sheet_to_json(workbook.Sheets['Types'])  : [];
            const floors = workbook.Sheets['Floors'] ? XLSX.utils.sheet_to_json(workbook.Sheets['Floors']) : [];
            return { layers, types, floors };
        } catch (error) {
            console.error("Critical: Failed to load system_config.xlsx", error);
            return { layers: [], types: [], floors: [] };
        }
    }

    async loadFloorData(url) {
        url = await this._resolveUrl(url);
        // Standard columns — anything else becomes an "extra" shown in Details panel
        const STANDARD_COLS = new Set(['Name', 'Name1', 'Name2', 'Name3', 'Type', 'X', 'Y', 'X1', 'Y1', 'X2', 'Y2', 'Description', 'Status', 'LastAudit', 'Color', 'Width', 'Height', 'Opacity', 'BorderColor', 'BorderThickness', 'FontSize', 'Points', 'Speed', 'DashSize', 'GapSize', 'Tension', 'Shape', 'ShowLine', 'Product', 'Document']);

        try {
            const workbook = await this.fetchWorkbook(url);
            let allItems = [];

            workbook.SheetNames.forEach(sheetName => {
                const sheet = workbook.Sheets[sheetName];
                const rows = XLSX.utils.sheet_to_json(sheet);

                rows.forEach(row => {
                    const hasPosition  = row.X  !== undefined && row.Y  !== undefined;
                    const hasCorners   = row.X1 !== undefined && row.Y1 !== undefined &&
                                        row.X2 !== undefined && row.Y2 !== undefined;
                    const hasPoints    = row.Points !== undefined;
                    if (!hasPosition && !hasCorners && !hasPoints) return;

                    // Area rows use corner format (X1,Y1,X2,Y2); derive center + size.
                    // Legacy rows with X/Y/Width/Height also still work.
                    let itemX, itemY, itemWidth, itemHeight;
                    if (hasCorners) {
                        const x1 = row.X1, y1 = row.Y1, x2 = row.X2, y2 = row.Y2;
                        itemX      = (x1 + x2) / 2;
                        itemY      = (y1 + y2) / 2;
                        itemWidth  = Math.abs(x2 - x1);
                        itemHeight = Math.abs(y2 - y1);
                    } else {
                        // For flow rows (no X/Y), extract position from first waypoint
                        itemX = row.X != null ? row.X : 0;
                        itemY = row.Y != null ? row.Y : 0;
                        if (!hasPosition && hasPoints) {
                            const firstPair = (row.Points || '').split(';')[0].split(',');
                            itemX = parseFloat(firstPair[0]) || 0;
                            itemY = parseFloat(firstPair[1]) || 0;
                        }
                        itemWidth  = row.Width  != null ? row.Width  : null;
                        itemHeight = row.Height != null ? row.Height : null;
                    }

                    // Capture any column that is NOT in the standard set
                    const extras = {};
                    Object.keys(row).forEach(key => {
                        if (!STANDARD_COLS.has(key)) {
                            extras[key] = row[key];
                        }
                    });

                    allItems.push({
                        layerId:  sheetName,
                        name:     row.Name  || '',
                        name1:    row.Name1 || null,
                        name2:    row.Name2 || null,
                        name3:    row.Name3 != null ? String(row.Name3) : null,
                        type:     row.Type,
                        x:        itemX,
                        y:        itemY,
                        // Corner coords stored for round-trip export
                        x1:       row.X1 != null ? row.X1 : null,
                        y1:       row.Y1 != null ? row.Y1 : null,
                        x2:       row.X2 != null ? row.X2 : null,
                        y2:       row.Y2 != null ? row.Y2 : null,
                        desc:            row.Description,
                        status:          row.Status || "Active",
                        lastAudit:       row.LastAudit || "",
                        color:           row.Color || null,
                        width:           itemWidth,
                        height:          itemHeight,
                        opacity:         row.Opacity != null ? row.Opacity : null,
                        fontSize:        row.FontSize != null ? row.FontSize : null,
                        points:          row.Points  || null,
                        speed:           row.Speed   != null ? row.Speed   : 1,
                        dashSize:        row.DashSize != null ? row.DashSize : 30,
                        gapSize:         row.GapSize  != null ? row.GapSize  : 15,
                        tension:         row.Tension != null ? row.Tension : 0.5,
                        shape:           row.Shape    || null,
                        showLine:        row.ShowLine != null ? Boolean(row.ShowLine) : true,
                        product:         row.Product  || null,
                        document:        row.Document || null,
                        extras:          Object.keys(extras).length > 0 ? extras : null
                    });
                });
            });

            return allItems;
        } catch (error) {
            console.error(`Failed to load floor data: ${url}`, error);
            return [];
        }
    }

    async fetchWorkbook(url) {
        const uniqueUrl = `${url}?t=${new Date().getTime()}`;
        const response = await fetch(uniqueUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status} - ${url}`);
        const arrayBuffer = await response.arrayBuffer();
        return XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
    }
}