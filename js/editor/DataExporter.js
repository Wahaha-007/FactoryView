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
                        Shape:    item.shape    || '',
                        ShowLine: item.showLine != null ? item.showLine : true,
                        Product:  item.product  || '',
                        Document: item.document || ''
                    }))
                    : renderType === 'area'
                    ? items.map(item => {
                        // Use stored corners if available; otherwise compute from center+size
                        const x1 = item.x1 != null ? item.x1 : item.x - (item.width  || 500) / 2;
                        const y1 = item.y1 != null ? item.y1 : item.y - (item.height || 400) / 2;
                        const x2 = item.x2 != null ? item.x2 : item.x + (item.width  || 500) / 2;
                        const y2 = item.y2 != null ? item.y2 : item.y + (item.height || 400) / 2;
                        return {
                            Name:        item.name,
                            X1:          Math.round(x1),
                            Y1:          Math.round(y1),
                            X2:          Math.round(x2),
                            Y2:          Math.round(y2),
                            Color:       item.color   || "",
                            Opacity:     item.opacity != null ? item.opacity : 0.25,
                            FontSize:    item.fontSize != null ? item.fontSize : 14,
                            Description: item.desc    || ""
                        };
                    })
                    : items.map(item => ({
                        Name:        item.name,
                        Type:        item.type,
                        X:           item.x,
                        Y:           item.y,
                        Description: item.desc   || "",
                        Status:      item.status  || "Active",
                        LastAudit:   item.lastAudit || "",
                        Color:       item.color   || "",
                        Document:    item.document || "",
                        ...(item.extras || {})
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
