export class DataLoader {
    constructor() {}

    async loadSystemConfig(url) {
        try {
            const workbook = await this.fetchWorkbook(url);
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
        // Standard columns — anything else becomes an "extra" shown in Details panel
        const STANDARD_COLS = new Set(['Name', 'Type', 'X', 'Y', 'Description', 'Status', 'LastAudit', 'Color', 'Width', 'Height', 'Opacity', 'BorderColor', 'BorderThickness', 'Points', 'Speed', 'DashSize', 'GapSize', 'Tension', 'Shape']);

        try {
            const workbook = await this.fetchWorkbook(url);
            let allItems = [];

            workbook.SheetNames.forEach(sheetName => {
                const sheet = workbook.Sheets[sheetName];
                const rows = XLSX.utils.sheet_to_json(sheet);

                rows.forEach(row => {
                    const hasPosition = row.X !== undefined && row.Y !== undefined;
                    const hasPoints   = row.Points !== undefined;
                    if (!hasPosition && !hasPoints) return;

                    // For flow rows (no X/Y), extract position from first waypoint
                    let itemX = row.X != null ? row.X : 0;
                    let itemY = row.Y != null ? row.Y : 0;
                    if (!hasPosition && hasPoints) {
                        const firstPair = (row.Points || '').split(';')[0].split(',');
                        itemX = parseFloat(firstPair[0]) || 0;
                        itemY = parseFloat(firstPair[1]) || 0;
                    }

                    // Capture any column that is NOT in the standard set
                    const extras = {};
                    Object.keys(row).forEach(key => {
                        if (!STANDARD_COLS.has(key)) {
                            extras[key] = row[key];
                        }
                    });

                    allItems.push({
                        layerId:         sheetName,
                        name:            row.Name || '',
                        type:            row.Type,
                        x:               itemX,
                        y:               itemY,
                        desc:            row.Description,
                        status:          row.Status || "Active",
                        lastAudit:       row.LastAudit || "",
                        color:           row.Color || null,
                        width:           row.Width  != null ? row.Width  : null,
                        height:          row.Height != null ? row.Height : null,
                        opacity:         row.Opacity != null ? row.Opacity : null,
                        borderColor:     row.BorderColor || null,
                        borderThickness: row.BorderThickness != null ? row.BorderThickness : null,
                        points:          row.Points  || null,
                        speed:           row.Speed   != null ? row.Speed   : 1,
                        dashSize:        row.DashSize != null ? row.DashSize : 30,
                        gapSize:         row.GapSize  != null ? row.GapSize  : 15,
                        tension:         row.Tension != null ? row.Tension : 0.5,
                        shape:           row.Shape  || null,
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