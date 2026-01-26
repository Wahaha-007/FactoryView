/* js/DataLoader.js */

export class DataLoader {
    constructor() {}

    async loadSystemConfig(url) {
        try {
            const workbook = await this.fetchWorkbook(url);
            
            // Parse Sheet 1: Layers
            const layers = workbook.Sheets['Layers'] ? XLSX.utils.sheet_to_json(workbook.Sheets['Layers']) : [];
            // Parse Sheet 2: Types
            const types = workbook.Sheets['Types'] ? XLSX.utils.sheet_to_json(workbook.Sheets['Types']) : [];
            // NEW: Parse Sheet 3: Floors
            const floors = workbook.Sheets['Floors'] ? XLSX.utils.sheet_to_json(workbook.Sheets['Floors']) : [];

            return { layers, types, floors };
        } catch (error) {
            console.error("Critical: Failed to load system_config.xlsx", error);
            return { layers: [], types: [], floors: [] };
        }
    }

    async loadFloorData(url) {
        try {
            const workbook = await this.fetchWorkbook(url);
            let allItems = [];

            workbook.SheetNames.forEach(sheetName => {
                const sheet = workbook.Sheets[sheetName];
                const rows = XLSX.utils.sheet_to_json(sheet);

                rows.forEach(row => {
                    if (row.X !== undefined && row.Y !== undefined) {
                        allItems.push({
                            layerId: sheetName,
                            name: row.Name,
                            type: row.Type,
                            x: row.X,
                            y: row.Y,
                            desc: row.Description,
                            status: row.Status || "Active",
                            lastAudit: row.LastAudit || "",
                            // [NEW] Read Color from Excel (e.g., "#FF0000" or "red")
                            color: row.Color || null 
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

    // async fetchWorkbook(url) {
    //     const response = await fetch(url);
    //     if (!response.ok) throw new Error(`HTTP ${response.status} - ${url}`);
    //     const arrayBuffer = await response.arrayBuffer();
    //     return XLSX.read(arrayBuffer, { type: 'array', cellDates: true }); 
    // }

    async fetchWorkbook(url) {
        // --- FIX: ADD CACHE BUSTER ---
        // Appending the current timestamp ensures the URL is unique every time,
        // forcing the browser to bypass the cache and download the latest file.
        const uniqueUrl = `${url}?t=${new Date().getTime()}`;

        const response = await fetch(uniqueUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status} - ${url}`);
        const arrayBuffer = await response.arrayBuffer();
        return XLSX.read(arrayBuffer, { type: 'array', cellDates: true }); 
    }
}
