/* js/ui/ElevatorPanel.js */

export class ElevatorPanel {
    constructor(floorManager) {
        this.floorManager = floorManager;
        this.floorBtns = [];
        this.container = null;
    }

    create(floors) {
        console.log("UI: Creating Elevator Panel");

        // Create Container
        this.container = document.createElement('div');
        this.container.id = 'elevator-panel'; // Styles from CSS
        
        // Inline styles for critical positioning (fallback if CSS missing)
        Object.assign(this.container.style, {
            position: 'absolute',
            bottom: '30px',
            right: '30px',
            display: 'flex',
            flexDirection: 'column-reverse',
            gap: '12px',
            padding: '12px',
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(5px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '25px',
            zIndex: '1000'
        });

        this.floorBtns = [];

        floors.forEach((floor, index) => {
            const btn = document.createElement('button');
            btn.textContent = `F${index + 1}`;
            btn.title = floor.name || `Floor ${index + 1}`;
            
            // Basic styles
            Object.assign(btn.style, {
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                border: '2px solid #555',
                background: '#333',
                color: 'white',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            });

            // Events
            btn.onmouseenter = () => this.onHover(btn, index, true);
            btn.onmouseleave = () => this.onHover(btn, index, false);
            btn.onclick = () => this.onClick(index);

            this.floorBtns.push(btn);
            this.container.appendChild(btn);
        });

        this.attachToDOM();
    }

    attachToDOM() {
        const viewer = document.getElementById('canvas-container');
        if (viewer) {
            if (getComputedStyle(viewer).position === 'static') viewer.style.position = 'relative';
            viewer.appendChild(this.container);
        } else {
            document.body.appendChild(this.container);
        }
    }

    onHover(btn, index, isEnter) {
        if (this.floorManager.activeFloorIndex === index) return; // Don't change active style
        btn.style.borderColor = isEnter ? '#aaa' : '#555';
    }

    onClick(index) {
        const isActive = (this.floorManager.activeFloorIndex === index);
        // Delegate logic to FloorManager
        this.floorManager.toggleFloorIsolation(index);
        this.updateState(isActive ? -1 : index);
    }

    updateState(activeIndex) {
        this.floorBtns.forEach((btn, index) => {
            const isActive = (index === activeIndex);
            Object.assign(btn.style, {
                background: isActive ? '#00d2ff' : '#333',
                color: isActive ? '#000' : '#fff',
                borderColor: isActive ? '#00d2ff' : '#555',
                boxShadow: isActive ? '0 0 15px #00d2ff' : 'none',
                transform: isActive ? 'scale(1.1)' : 'scale(1)'
            });
        });
    }
}
