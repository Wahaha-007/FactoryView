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
        const STANDARD_COLS = new Set(['Name', 'Type', 'X', 'Y', 'Description', 'Status', 'LastAudit', 'Color']);

        try {
            const workbook = await this.fetchWorkbook(url);
            let allItems = [];

            workbook.SheetNames.forEach(sheetName => {
                const sheet = workbook.Sheets[sheetName];
                const rows = XLSX.utils.sheet_to_json(sheet);

                rows.forEach(row => {
                    if (row.X !== undefined && row.Y !== undefined) {

                        // Capture any column that is NOT in the standard set
                        const extras = {};
                        Object.keys(row).forEach(key => {
                            if (!STANDARD_COLS.has(key)) {
                                extras[key] = row[key];
                            }
                        });

                        allItems.push({
                            layerId:   sheetName,
                            name:      row.Name,
                            type:      row.Type,
                            x:         row.X,
                            y:         row.Y,
                            desc:      row.Description,
                            status:    row.Status || "Active",
                            lastAudit: row.LastAudit || "",
                            color:     row.Color || null,
                            // NEW: custom columns dict, e.g. { IP: "192.168.1.1", MAC: "AA:BB:CC" }
                            extras:    Object.keys(extras).length > 0 ? extras : null
                        });
                    }
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