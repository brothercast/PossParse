// constellation.js
// Handles the force-directed graph view for CE modal collections

window.renderConstellation = function(collectionType, canvasId, items, ceType) {
    const container = document.getElementById(canvasId);
    if (!container) return;

    // Use parent container for vis.js (it replaces the canvas element internally)
    const parent = container.parentElement;
    parent.innerHTML = ''; // clear placeholder

    // Build Graph Data
    const nodes = new vis.DataSet();
    const edges = new vis.DataSet();

    // 1. Central Node (The current CE)
    const centerColor = window.NODES?.[ceType]?.color || '#6366f1';
    nodes.add({
        id: 'center',
        label: ceType.toUpperCase(),
        shape: 'dot',
        size: 25,
        color: { background: centerColor, border: 'white' },
        font: { color: '#334155', face: 'Inter', size: 14, bold: true },
        shadow: true
    });

    // 2. Collection Nodes
    const isNetwork = ['stakeholders', 'resources'].includes(collectionType);
    const itemColor = isNetwork ? '#0ea5e9' : '#10b981';

    items.forEach((item, idx) => {
        const title = item.title || item.name || item.label || 'Entity';
        const isProposed = item.tags && item.tags.includes("AI");
        
        nodes.add({
            id: item.id || `item-${idx}`,
            label: title.substring(0, 20) + (title.length > 20 ? '...' : ''),
            shape: 'dot',
            size: isProposed ? 12 : 18,
            color: { 
                background: isProposed ? '#f8fafc' : itemColor, 
                border: isProposed ? itemColor : 'white' 
            },
            font: { color: '#475569', face: 'Inter', size: 12 },
            borderWidth: isProposed ? 2 : 1,
            borderWidthSelected: 3
        });

        // Edge back to center
        edges.add({
            from: 'center',
            to: item.id || `item-${idx}`,
            color: { color: '#cbd5e1', highlight: centerColor },
            width: isProposed ? 1 : 2,
            dashes: isProposed
        });
    });

    // Vis.js Options for a "Jetsons" fluid feel
    const options = {
        nodes: {
            borderWidth: 2,
            shadow: { enabled: true, color: 'rgba(0,0,0,0.1)', size: 10, x: 0, y: 4 }
        },
        edges: {
            smooth: { type: 'continuous' }
        },
        physics: {
            forceAtlas2Based: {
                gravitationalConstant: -50,
                centralGravity: 0.01,
                springLength: 100,
                springConstant: 0.08
            },
            maxVelocity: 50,
            solver: 'forceAtlas2Based',
            timestep: 0.35,
            stabilization: { iterations: 150 }
        },
        interaction: {
            hover: true,
            tooltipDelay: 200,
            zoomView: true,
            dragView: true
        }
    };

    // Initialize Network
    new vis.Network(parent, { nodes, edges }, options);
};
