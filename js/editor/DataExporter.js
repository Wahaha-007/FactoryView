/* js/editor/DataExporter.js */

export class DataExporter {
    constructor(layerManager) {
        this.layerManager = layerManager;
    }

    // ACCEPT floorId PARAMETER
    exportData(floorId) {
        if (!floorId) {
            alert("No floor selected for export!");
            return;
        }

        if (!confirm(`Download updated data for ${floorId}?`)) return;
        
        if (typeof XLSX === 'undefined') {
            alert("XLSX library not loaded!");
            return;
        }

        const wb = XLSX.utils.book_new();
        let hasData = false;

        Object.keys(this.layerManager.layers).forEach(layerId => {
            const layer = this.layerManager.layers[layerId];
            
            // --- FIX: FILTER BY FLOOR ID ---
            // Only get items that belong to the current floor
            const items = layer.items.filter(item => item.floorId === floorId);

            if (items.length > 0) {
                hasData = true;
                const isArea = this.layerManager.layers[layerId] &&
                               this.layerManager.layers[layerId].renderType === 'area';

                const excelRows = isArea
                    ? items.map(item => ({
                        Name:            item.name,
                        X:               item.x,
                        Y:               item.y,
                        Width:           item.width           != null ? item.width           : 500,
                        Height:          item.height          != null ? item.height          : 400,
                        Color:           item.color           || "",
                        Opacity:         item.opacity         != null ? item.opacity         : 0.25,
                        BorderColor:     item.borderColor     || "",
                        BorderThickness: item.borderThickness != null ? item.borderThickness : 10,
                        Description:     item.desc            || ""
                    }))
                    : items.map(item => ({
                        Name:      item.name,
                        Type:      item.type,
                        X:         item.x,
                        Y:         item.y,
                        Description: item.desc      || "",
                        Status:    item.status       || "Active",
                        LastAudit: item.lastAudit    || "",
                        Color:     item.color        || ""
                    }));

                const ws = XLSX.utils.json_to_sheet(excelRows);
                XLSX.utils.book_append_sheet(wb, ws, layerId);
            }
        });

        if (!hasData) return alert(`No items found on ${floorId} to export!`);

        const dateStr = new Date().toISOString().slice(0,19).replace(/:/g,"-");
        
        // Include Floor ID in filename
        XLSX.writeFile(wb, `${floorId}_data_${dateStr}.xlsx`);
    }
}
