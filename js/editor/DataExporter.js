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
            
            // Only get items that belong to the current floor, plus global (cross-floor) items
            const items = layer.items.filter(item => item.floorId === floorId || !item.floorId || item.floorId === 'global');

            if (items.length > 0) {
                hasData = true;
                const renderType = this.layerManager.layers[layerId]?.renderType;

                const excelRows = renderType === 'flow'
                    ? items.map(item => ({
                        Name:     item.name,
                        Points:   item.points    || '',
                        Color:    item.color     || '#FF6600',
                        Speed:    item.speed    != null ? item.speed    : 1,
                        DashSize: item.dashSize != null ? item.dashSize : 30,
                        GapSize:  item.gapSize  != null ? item.gapSize  : 15,
                        Tension:  item.tension  != null ? item.tension  : 0.5,
                        Shape:    item.shape    || ''
                    }))
                    : renderType === 'area'
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
                        Name:        item.name,
                        Type:        item.type,
                        X:           item.x,
                        Y:           item.y,
                        Description: item.desc   || "",
                        Status:      item.status  || "Active",
                        LastAudit:   item.lastAudit || "",
                        Color:       item.color   || ""
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
