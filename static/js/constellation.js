// constellation.js
// Transit Diagram renderer for CE modal collections
// Design: Mid-century modern populuxe — subway map meets Mondrian
// "Everything's Up; Everything's Perky; Everything's HELLO!"

// ============================================================================
// 1. TRANSIT LINE COLORS — Each collection type is a distinct "line"
// ============================================================================
const TRANSIT_LINES = {
    prerequisites: { color: '#ff7043', label: 'PREREQUISITES', icon: 'fa-cubes' },
    stakeholders:  { color: '#0ea5e9', label: 'STAKEHOLDERS',  icon: 'fa-users' },
    assumptions:   { color: '#f59e0b', label: 'ASSUMPTIONS',   icon: 'fa-lightbulb' },
    resources:     { color: '#10b981', label: 'RESOURCES',      icon: 'fa-toolbox' },
    criteria:      { color: '#8b5cf6', label: 'CRITERIA',       icon: 'fa-vial' }
};

// ============================================================================
// 1b. ICON UNICODE LOOKUP — vis.js icon shapes need Unicode codepoints
// ============================================================================
// Maps FA class names to their Unicode characters for vis.js rendering.
// Covers all CE types, collection types, system nodes, and common fallbacks.
const FA_ICON_MAP = {
    // CE Type Icons (from ce_nodes.py)
    'fa-cube':            '\uf1b2',
    'fa-flask':           '\uf0c3',
    'fa-shield-virus':    '\ue06c',
    'fa-user-astronaut':  '\uf4fb',
    'fa-rocket':          '\uf135',
    'fa-leaf':            '\uf06c',
    'fa-stopwatch':       '\uf2f2',
    'fa-bullhorn':        '\uf0a1',
    'fa-handshake':       '\uf2b5',
    'fa-scale-balanced':  '\uf24e',
    'fa-coins':           '\uf51e',
    'fa-microchip':       '\uf2db',
    'fa-chart-line':      '\uf201',

    // Collection Icons (from TRANSIT_LINES)
    'fa-cubes':           '\uf1b3',
    'fa-users':           '\uf0c0',
    'fa-lightbulb':       '\uf0eb',
    'fa-toolbox':         '\uf552',
    'fa-vial':            '\uf492',

    // System Node Icons (from system_nodes.py)
    'fa-bullseye':        '\uf140',
    'fa-bolt':            '\uf0e7',
    'fa-earth-americas':  '\uf57d',
    'fa-people-carry-box':'\uf4ce',
    'fa-heart':           '\uf004',
    'fa-ban':             '\uf05e',
    'fa-signature':       '\uf5b7',

    // UI / Common fallbacks
    'fa-circle':          '\uf111',
    'fa-layer-group':     '\uf5fd',
    'fa-project-diagram': '\uf542',
    'fa-diagram-project': '\uf542',
    'fa-compress':        '\uf066',
    'fa-plus':            '\u002b',
    'fa-minus':           '\uf068',
    'fa-brain':           '\uf5dc',
};

function getIconUnicode(iconClass) {
    // Handle full class strings like "fa-solid fa-flask" → "fa-flask"
    const cleaned = iconClass.replace(/fa-solid\s+|fa-regular\s+|fas\s+|far\s+/g, '').trim();
    return FA_ICON_MAP[cleaned] || FA_ICON_MAP['fa-cube'];
}

// ============================================================================
// 2. PER-COLLECTION TRANSIT DIAGRAM
// ============================================================================
window.renderConstellation = function(collectionType, canvasId, items, ceType, tabLabels) {
    const container = document.getElementById(canvasId);
    if (!container) return;

    const parent = container.parentElement;
    const lineConfig = TRANSIT_LINES[collectionType] || { color: '#6366f1', label: collectionType.toUpperCase() };
    const displayLabel = (tabLabels && tabLabels[collectionType]) ? tabLabels[collectionType].toUpperCase() : lineConfig.label;
    const centerColor = window.NODES?.[ceType]?.color || '#6366f1';

    // Build the transit diagram container
    parent.innerHTML = `
        <div class="constellation-container" style="--transit-color: ${lineConfig.color}; --center-color: ${centerColor};">
            <div class="constellation-canvas" id="vis-${collectionType}-${canvasId}"></div>
            <div class="constellation-toolbar">
                <button class="btn btn-glass constellation-btn" title="Zoom In" data-action="zoomIn">
                    <i class="fas fa-plus"></i>
                </button>
                <button class="btn btn-glass constellation-btn" title="Zoom Out" data-action="zoomOut">
                    <i class="fas fa-minus"></i>
                </button>
                <button class="btn btn-glass constellation-btn" title="Reset View" data-action="fit">
                    <i class="fas fa-compress"></i>
                </button>
            </div>
            <div class="constellation-legend">
                <div class="legend-line">
                    <span class="legend-swatch" style="background: ${centerColor};"></span>
                    <span class="legend-label">${ceType.toUpperCase()}</span>
                </div>
                <div class="legend-line">
                    <span class="legend-swatch" style="background: ${lineConfig.color};"></span>
                    <span class="legend-label">${displayLabel}</span>
                </div>
                ${items.some(i => i.tags && i.tags.includes('AI')) ? `
                <div class="legend-line">
                    <span class="legend-swatch legend-swatch-dashed" style="border-color: ${lineConfig.color};"></span>
                    <span class="legend-label">PROPOSED</span>
                </div>` : ''}
            </div>
        </div>`;

    const visContainer = parent.querySelector(`#vis-${collectionType}-${canvasId}`);
    if (!visContainer || typeof vis === 'undefined') return;

    // --- Build Graph Data ---
    const nodes = new vis.DataSet();
    const edges = new vis.DataSet();

    // Central "Interchange" Node — shows CE type icon
    const centerIcon = window.NODES?.[ceType]?.icon || 'fa-solid fa-cube';
    // Extract the FA icon class (e.g., 'fa-flask' from 'fa-solid fa-flask')
    const centerIconCode = centerIcon.replace(/fa-solid\s+|fa-regular\s+|fas\s+|far\s+/g, '').trim();

    nodes.add({
        id: 'center',
        label: ceType.toUpperCase(),
        shape: 'icon',
        icon: {
            face: 'Font Awesome 6 Free',
            code: getIconUnicode(centerIconCode),
            size: 30,
            color: centerColor,
            weight: 900
        },
        font: {
            color: '#1e293b',
            face: 'Antonio, sans-serif',
            size: 13,
            bold: { face: 'Antonio, sans-serif' },
            vadjust: 12
        },
        shadow: false,
        fixed: { x: true, y: true },
        x: 0,
        y: 0
    });

    // Station Nodes (Collection Items)
    const angleStep = items.length > 0 ? (2 * Math.PI) / items.length : 0;
    const radius = Math.max(140, items.length * 28);

    items.forEach((item, idx) => {
        const title = item.title || item.name || item.label || 'Entity';
        const isProposed = item.tags && item.tags.includes("AI");

        const angle = angleStep * idx - Math.PI / 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        const itemIconClass = lineConfig.icon || 'fa-cube';

        nodes.add({
            id: item.id || `item-${idx}`,
            label: title.length > 22 ? title.substring(0, 20) + '…' : title,
            _hoverHtml: buildTooltipHtml(title, item, collectionType, isProposed),
            shape: 'icon',
            icon: {
                face: 'Font Awesome 6 Free',
                code: getIconUnicode(itemIconClass),
                size: isProposed ? 18 : 24,
                color: isProposed ? mixColor(lineConfig.color, 0.45) : lineConfig.color,
                weight: 900
            },
            font: {
                color: '#334155',
                face: 'Antonio, sans-serif',
                size: 11,
                vadjust: 10
            },
            shadow: false,
            x: x,
            y: y,
            _itemData: item,
            _collection: collectionType
        });

        // Route Edge
        edges.add({
            from: 'center',
            to: item.id || `item-${idx}`,
            color: {
                color: isProposed ? mixColor(lineConfig.color, 0.3) : lineConfig.color,
                highlight: lineConfig.color,
                hover: lineConfig.color
            },
            width: isProposed ? 2 : 3,
            dashes: isProposed ? [8, 6] : false,
            smooth: {
                type: 'curvedCW',
                roundness: 0.15
            },
            hoverWidth: 1,
            selectionWidth: 1
        });
    });

    // --- Vis.js Options: Clean Transit Map Aesthetic ---
    const options = {
        nodes: {
            borderWidth: 3,
            shadow: false,
            font: {
                face: 'Antonio, sans-serif',
                size: 11,
                color: '#334155',
                strokeWidth: 3,
                strokeColor: '#fefcfa'
            }
        },
        edges: {
            smooth: {
                type: 'curvedCW',
                roundness: 0.15
            },
            shadow: false
        },
        physics: {
            enabled: false // Use fixed positions for the clean subway-map feel
        },
        interaction: {
            hover: true,
            tooltipDelay: 150,
            zoomView: true,
            dragView: true,
            dragNodes: true,
            navigationButtons: false,
            keyboard: false
        },
        layout: {
            improvedLayout: true
        }
    };

    // --- Initialize Network ---
    const network = new vis.Network(visContainer, { nodes, edges }, options);

    // Fit to view after render
    setTimeout(() => {
        network.fit({ animation: { duration: 400, easingFunction: 'easeInOutQuad' } });
    }, 100);

    // --- Wire Toolbar ---
    parent.querySelectorAll('.constellation-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = btn.dataset.action;
            if (action === 'zoomIn') {
                const scale = network.getScale();
                network.moveTo({ scale: scale * 1.3, animation: { duration: 300, easingFunction: 'easeInOutQuad' } });
            } else if (action === 'zoomOut') {
                const scale = network.getScale();
                network.moveTo({ scale: scale / 1.3, animation: { duration: 300, easingFunction: 'easeInOutQuad' } });
            } else if (action === 'fit') {
                network.fit({ animation: { duration: 400, easingFunction: 'easeInOutQuad' } });
            }
        });
    });

    // --- Wire Click-to-Edit ---
    network.on('doubleClick', (params) => {
        if (params.nodes.length > 0 && params.nodes[0] !== 'center') {
            const nodeId = params.nodes[0];
            const nodeData = nodes.get(nodeId);
            if (nodeData?._itemData && nodeData?._collection) {
                // Simulate clicking the edit button for this item
                const editBtn = document.querySelector(
                    `.btn-edit-item[data-collection="${nodeData._collection}"][data-id="${nodeData._itemData.id}"]`
                );
                if (editBtn) editBtn.click();
            }
        }
    });

    // Store network reference for cleanup
    parent._visNetwork = network;

    // --- Wire Hover Overlay ---
    network.on('hoverNode', (params) => {
        const node = nodes.get(params.node);
        if (node && node._hoverHtml) {
            showHoverOverlay(node._hoverHtml, params.pointer.DOM.x, params.pointer.DOM.y, parent);
        }
    });
    network.on('blurNode', () => hideHoverOverlay());
};


// ============================================================================
// 3. CONNECTIONS TAB — UNIFIED TRANSIT MAP
// ============================================================================
window.renderConnectionsMap = function(canvasId, stateObj) {
    const container = document.getElementById(canvasId);
    if (!container || typeof vis === 'undefined') return;

    const ceType = stateObj.ceType || 'Default';
    const centerColor = stateObj.nodeSchema?.color || window.NODES?.[ceType]?.color || '#6366f1';
    const collections = stateObj.collections || {};
    const tabLabels = stateObj.tabLabels || {};

    // Build the container
    container.innerHTML = `
        <div class="constellation-container constellation-connections" style="--center-color: ${centerColor};">
            <div class="constellation-canvas" id="vis-connections-canvas"></div>
            <div class="constellation-toolbar">
                <button class="btn btn-glass constellation-btn" title="Zoom In" data-action="zoomIn">
                    <i class="fas fa-plus"></i>
                </button>
                <button class="btn btn-glass constellation-btn" title="Zoom Out" data-action="zoomOut">
                    <i class="fas fa-minus"></i>
                </button>
                <button class="btn btn-glass constellation-btn" title="Reset View" data-action="fit">
                    <i class="fas fa-compress"></i>
                </button>
            </div>
            <div class="constellation-legend constellation-legend-full">
                <div class="legend-line">
                    <span class="legend-swatch" style="background: ${centerColor};"></span>
                    <span class="legend-label">${ceType.toUpperCase()}</span>
                </div>
                ${Object.entries(TRANSIT_LINES).map(([key, cfg]) => {
                    const lbl = tabLabels[key] ? tabLabels[key].toUpperCase() : cfg.label;
                    return `
                    <div class="legend-line">
                        <span class="legend-swatch" style="background: ${cfg.color};"></span>
                        <span class="legend-label">${lbl}</span>
                    </div>`;
                }).join('')}
            </div>
        </div>`;

    const visContainer = container.querySelector('#vis-connections-canvas');
    if (!visContainer) return;

    const nodes = new vis.DataSet();
    const edges = new vis.DataSet();

    // --- Central Interchange --- shows CE type icon
    const connCenterIcon = window.NODES?.[ceType]?.icon || 'fa-solid fa-cube';
    const connCenterCode = connCenterIcon.replace(/fa-solid\s+|fa-regular\s+|fas\s+|far\s+/g, '').trim();

    nodes.add({
        id: 'center',
        label: ceType.toUpperCase(),
        shape: 'icon',
        icon: {
            face: 'Font Awesome 6 Free',
            code: getIconUnicode(connCenterCode),
            size: 36,
            color: centerColor,
            weight: 900
        },
        font: {
            color: '#1e293b',
            face: 'Antonio, sans-serif',
            size: 14,
            bold: { face: 'Antonio, sans-serif' },
            vadjust: 14
        },
        shadow: false,
        fixed: { x: true, y: true },
        x: 0,
        y: 0
    });

    // --- Collection Hub Nodes + Item Nodes ---
    const collectionKeys = Object.keys(TRANSIT_LINES);
    const hubAngleStep = (2 * Math.PI) / collectionKeys.length;
    const hubRadius = 200;

    let totalItems = 0;
    collectionKeys.forEach(key => {
        totalItems += (collections[key] || []).length;
    });

    // If empty, show a friendly message
    if (totalItems === 0) {
        container.innerHTML = `
            <div class="constellation-container constellation-empty-state" style="--center-color: ${centerColor};">
                <div class="constellation-empty-inner">
                    <i class="fas fa-project-diagram" style="color: ${centerColor}; font-size: 2.5rem; opacity: 0.6;"></i>
                    <h6 class="font-brand" style="color: #1e293b; margin-top: 1rem;">No Connections Yet</h6>
                    <p class="font-body" style="color: #64748b; font-size: 0.85rem; max-width: 280px; margin: 0 auto;">
                        Add items to your collections and they'll appear here as an interactive transit map.
                    </p>
                </div>
            </div>`;
        return;
    }

    collectionKeys.forEach((key, hubIdx) => {
        const line = TRANSIT_LINES[key];
        const items = collections[key] || [];
        if (items.length === 0) return;

        const hubAngle = hubAngleStep * hubIdx - Math.PI / 2;
        const hubX = Math.cos(hubAngle) * hubRadius;
        const hubY = Math.sin(hubAngle) * hubRadius;

        // Hub Node (collection type) — shows collection icon
        const hubId = `hub-${key}`;
        const hubIconClass = line.icon || 'fa-cube';

        nodes.add({
            id: hubId,
            label: tabLabels[key] ? tabLabels[key].toUpperCase() : line.label,
            shape: 'icon',
            icon: {
                face: 'Font Awesome 6 Free',
                code: getIconUnicode(hubIconClass),
                size: 26,
                color: line.color,
                weight: 900
            },
            font: {
                color: line.color,
                face: 'Antonio, sans-serif',
                size: 11,
                vadjust: 10
            },
            shadow: false,
            fixed: { x: true, y: true },
            x: hubX,
            y: hubY
        });

        // Hub → Center edge (thick transit line)
        edges.add({
            from: 'center',
            to: hubId,
            color: { color: line.color, highlight: line.color, hover: line.color },
            width: 4,
            smooth: { type: 'curvedCW', roundness: 0.1 },
            hoverWidth: 1,
            selectionWidth: 1
        });

        // Item nodes radiate from hub
        const itemAngleStep = items.length > 1 ? (Math.PI * 0.8) / (items.length - 1) : 0;
        const itemBaseAngle = hubAngle - (Math.PI * 0.4);
        const itemRadius = 100;

        items.forEach((item, itemIdx) => {
            const title = item.title || item.name || item.label || 'Entity';
            const isProposed = item.tags && item.tags.includes("AI");

            const iAngle = items.length > 1 ? itemBaseAngle + itemAngleStep * itemIdx : hubAngle;
            const ix = hubX + Math.cos(iAngle) * itemRadius;
            const iy = hubY + Math.sin(iAngle) * itemRadius;

            const nodeId = `${key}-${item.id || `item-${itemIdx}`}`;
            const connItemIcon = line.icon || 'fa-cube';

            nodes.add({
                id: nodeId,
                label: title.length > 18 ? title.substring(0, 16) + '…' : title,
                _hoverHtml: buildTooltipHtml(title, item, key, isProposed),
                shape: 'icon',
                icon: {
                    face: 'Font Awesome 6 Free',
                    code: getIconUnicode(connItemIcon),
                    size: isProposed ? 16 : 20,
                    color: isProposed ? mixColor(line.color, 0.45) : line.color,
                    weight: 900
                },
                font: {
                    color: '#475569',
                    face: 'Antonio, sans-serif',
                    size: 10,
                    vadjust: 8
                },
                shadow: false,
                fixed: { x: true, y: true },
                x: ix,
                y: iy,
                _itemData: item,
                _collection: key
            });

            // Item → Hub edge
            edges.add({
                from: hubId,
                to: nodeId,
                color: {
                    color: isProposed ? mixColor(line.color, 0.35) : line.color,
                    highlight: line.color,
                    hover: line.color
                },
                width: isProposed ? 1.5 : 2.5,
                dashes: isProposed ? [5, 4] : false,
                smooth: { type: 'curvedCW', roundness: 0.12 },
                hoverWidth: 0.5,
                selectionWidth: 0.5
            });
        });
    });

    // --- Vis.js Options ---
    const options = {
        nodes: {
            borderWidth: 3,
            shadow: false,
            font: {
                face: 'Antonio, sans-serif',
                size: 10,
                color: '#475569',
                strokeWidth: 3,
                strokeColor: '#fefcfa'
            }
        },
        edges: {
            smooth: { type: 'curvedCW', roundness: 0.1 },
            shadow: false
        },
        physics: { enabled: false },
        interaction: {
            hover: true,
            tooltipDelay: 150,
            zoomView: true,
            dragView: true,
            dragNodes: false,
            navigationButtons: false
        }
    };

    const network = new vis.Network(visContainer, { nodes, edges }, options);

    setTimeout(() => {
        network.fit({
            animation: { duration: 500, easingFunction: 'easeInOutQuad' }
        });
    }, 100);

    // Wire toolbar
    container.querySelectorAll('.constellation-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = btn.dataset.action;
            if (action === 'zoomIn') {
                network.moveTo({ scale: network.getScale() * 1.3, animation: { duration: 300, easingFunction: 'easeInOutQuad' } });
            } else if (action === 'zoomOut') {
                network.moveTo({ scale: network.getScale() / 1.3, animation: { duration: 300, easingFunction: 'easeInOutQuad' } });
            } else if (action === 'fit') {
                network.fit({ animation: { duration: 400, easingFunction: 'easeInOutQuad' } });
            }
        });
    });

    // Wire click-to-edit
    network.on('doubleClick', (params) => {
        if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            if (nodeId === 'center' || nodeId.startsWith('hub-')) return;
            const nodeData = nodes.get(nodeId);
            if (nodeData?._itemData && nodeData?._collection) {
                const editBtn = document.querySelector(
                    `.btn-edit-item[data-collection="${nodeData._collection}"][data-id="${nodeData._itemData.id}"]`
                );
                if (editBtn) {
                    // Switch to the correct tab first
                    const tabBtn = document.querySelector(
                        `.ce-nav-tabs .nav-link[data-bs-target*="view-${nodeData._collection}"]`
                    );
                    if (tabBtn) tabBtn.click();
                    setTimeout(() => editBtn.click(), 150);
                }
            }
        }
    });

    container._visNetwork = network;

    // --- Wire Hover Overlay ---
    network.on('hoverNode', (params) => {
        const node = nodes.get(params.node);
        if (node && node._hoverHtml) {
            showHoverOverlay(node._hoverHtml, params.pointer.DOM.x, params.pointer.DOM.y, container);
        }
    });
    network.on('blurNode', () => hideHoverOverlay());
};


// ============================================================================
// 4. HELPERS
// ============================================================================

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function mixColor(hex, opacity) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Builds a rich Hover-Expand card for collection item nodes.
 * Shows: icon, title, status badge, description preview, and edit hint.
 */
function buildTooltipHtml(title, item, collectionType, isProposed) {
    const line = TRANSIT_LINES[collectionType] || { color: '#6366f1', label: collectionType, icon: 'fa-cube' };
    const status = item.status || 'Pending';
    const subtitle = item.description || item.rationale || item.notes || '';
    const icon = line.icon || 'fa-cube';

    // Status color mapping
    let statusColor = '#94a3b8'; // default muted
    if (['Verified','Signed','Met','Complete','Pass','Compliant'].includes(status)) statusColor = '#10b981';
    else if (['Blocked','High','Fail','Violated'].includes(status)) statusColor = '#ef4444';
    else if (['Active','In Progress'].includes(status)) statusColor = '#0ea5e9';
    else if (['Pending','Unresolved'].includes(status)) statusColor = '#f59e0b';

    return `
        <div class="constellation-hover-card" style="--hover-line-color: ${line.color};">
            <div class="hover-card-header">
                <div class="hover-card-icon" style="background: ${mixColor(line.color, 0.12)}; color: ${line.color};">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="hover-card-title-block">
                    <div class="hover-card-title">${escapeHtml(title)}</div>
                    <div class="hover-card-meta">
                        <span class="hover-card-line-badge" style="color: ${line.color};">${line.label}</span>
                        ${isProposed ? '<span class="hover-card-ai-badge">POSSIBILITY</span>' : ''}
                    </div>
                </div>
                <span class="hover-card-status" style="background: ${mixColor(statusColor, 0.12)}; color: ${statusColor};">${status.toUpperCase()}</span>
            </div>
            ${subtitle ? `<div class="hover-card-body">${escapeHtml(subtitle.substring(0, 140))}${subtitle.length > 140 ? '…' : ''}</div>` : ''}
            <div class="hover-card-footer">
                <span class="hover-card-hint"><i class="fas fa-mouse-pointer"></i> Double-click to edit</span>
            </div>
        </div>
    `;
}

// --- Hover Overlay Logic ---
let hoverOverlayEl = null;

function showHoverOverlay(html, x, y, container) {
    if (!hoverOverlayEl) {
        hoverOverlayEl = document.createElement('div');
        hoverOverlayEl.className = 'constellation-hover-overlay';
        document.body.appendChild(hoverOverlayEl);
    }

    hoverOverlayEl.innerHTML = html;

    // Position relative to the container, with bounds checking
    const rect = container.getBoundingClientRect();
    let left = rect.left + x + 12; // offset right of cursor
    let top = rect.top + y - 10;   // slightly above cursor

    // Prevent going off-screen right
    const cardWidth = 300; // approximate max width
    if (left + cardWidth > window.innerWidth - 16) {
        left = rect.left + x - cardWidth - 12; // flip to left side
    }
    // Prevent going off-screen bottom
    const cardHeight = 160; // approximate max height
    if (top + cardHeight > window.innerHeight - 16) {
        top = window.innerHeight - cardHeight - 16;
    }
    // Prevent going off-screen top
    if (top < 8) top = 8;

    hoverOverlayEl.style.left = left + 'px';
    hoverOverlayEl.style.top = top + 'px';
    hoverOverlayEl.classList.add('show');
}

function hideHoverOverlay() {
    if (hoverOverlayEl) {
        hoverOverlayEl.classList.remove('show');
    }
}


// ============================================================================
// 5. SSPEC NETWORK — FULL MTA-STYLE TRANSIT MAP
// ============================================================================

// Phase colors matching the outcome.html CSS variables
const PHASE_COLORS = {
    'Discovery':  '#ff7043',
    'Engagement': '#26c6da',
    'Action':     '#ab47bc',
    'Completion': '#ffa726',
    'Legacy':     '#66bd0e'
};

// CE type transit line colors (sourced from window.NODES at runtime)
function getCeLineColor(ceType) {
    if (window.NODES && window.NODES[ceType]) {
        return window.NODES[ceType].color;
    }
    // Fallback palette for unknown types
    const fallbacks = {
        'Research': '#ec407a', 'Risk': '#ef5350', 'Stakeholder': '#42a5f5',
        'Praxis': '#ab47bc', 'Environment': '#66bb6a', 'Timeline': '#ffa726',
        'Advocacy': '#26c6da', 'Collaboration': '#7e57c2', 'Legal': '#78909c',
        'Financial': '#ffca28', 'Technology': '#26a69a', 'Measurement': '#8d6e63',
        'Default': '#95a5a6'
    };
    return fallbacks[ceType] || '#95a5a6';
}

function getCeLineIcon(ceType) {
    if (window.NODES && window.NODES[ceType]) {
        return window.NODES[ceType].icon;
    }
    return 'fa-solid fa-cube';
}

window.renderSspecNetwork = function(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof vis === 'undefined') return;

    // ── 1. SCRAPE DOM TOPOLOGY ──────────────────────────────────────────
    const topology = scrapeOutcomeTopology();
    if (!topology || topology.totalCEs === 0) {
        canvas.innerHTML = `
            <div class="constellation-container constellation-empty-state" style="--center-color: var(--aviation-teal);">
                <div class="constellation-empty-inner">
                    <i class="fas fa-diagram-project" style="color: var(--aviation-teal); font-size: 2.5rem; opacity: 0.6;"></i>
                    <h6 class="font-brand" style="color: #1e293b; margin-top: 1rem;">No Entities Yet</h6>
                    <p class="font-body" style="color: #64748b; font-size: 0.85rem; max-width: 280px; margin: 0 auto;">
                        Add CE nodes to your Conditions of Satisfaction and they'll appear here as an interactive transit map.
                    </p>
                </div>
            </div>`;
        return;
    }

    // ── 2. BUILD CONTAINER ──────────────────────────────────────────────
    const container = canvas.parentElement;
    container.innerHTML = `
        <div class="constellation-container sspec-network-map" style="--center-color: var(--aviation-teal);">
            <div class="constellation-canvas" id="vis-sspec-network"></div>
            <div class="constellation-toolbar">
                <button class="btn btn-glass constellation-btn" title="Zoom In" data-action="zoomIn">
                    <i class="fas fa-plus"></i>
                </button>
                <button class="btn btn-glass constellation-btn" title="Zoom Out" data-action="zoomOut">
                    <i class="fas fa-minus"></i>
                </button>
                <button class="btn btn-glass constellation-btn" title="Reset View" data-action="fit">
                    <i class="fas fa-compress"></i>
                </button>
            </div>
            <div class="constellation-legend constellation-legend-full sspec-network-legend">
                ${buildNetworkLegend(topology)}
            </div>
        </div>`;

    const visContainer = container.querySelector('#vis-sspec-network');
    if (!visContainer) return;

    // ── 3. BUILD GRAPH DATA ─────────────────────────────────────────────
    const nodes = new vis.DataSet();
    const edges = new vis.DataSet();

    const allNodes = [];
    const allEdges = [];

    // Temporarily intercept .add() calls to collect data for animation
    const _originalNodesAdd = nodes.add.bind(nodes);
    const _originalEdgesAdd = edges.add.bind(edges);
    nodes.add = (item) => allNodes.push(item);
    edges.add = (item) => allEdges.push(item);

    const PHASE_COL_WIDTH = 280;
    const COS_ROW_HEIGHT = 80;
    const PHASE_PADDING_TOP = 60;
    const phaseNames = Object.keys(PHASE_COLORS);

    // ── PHASE REGION LABEL NODES (background text like "Manhattan") ──
    phaseNames.forEach((phaseName, pIdx) => {
        const phaseData = topology.phases.find(p => p.name === phaseName);
        const cosCount = phaseData ? phaseData.cos.length : 0;
        const colX = pIdx * PHASE_COL_WIDTH;
        const regionHeight = Math.max(3, cosCount) * COS_ROW_HEIGHT;

        nodes.add({
            id: `phase-label-${phaseName}`,
            label: phaseName.toUpperCase(),
            shape: 'text',
            x: colX,
            y: -40,
            font: {
                color: mixColor(PHASE_COLORS[phaseName], 0.25),
                face: 'Antonio, sans-serif',
                size: 22,
                bold: { face: 'Antonio, sans-serif' }
            },
            fixed: { x: true, y: true },
            physics: false,
            selectable: false
        });

        // Phase column header station
        nodes.add({
            id: `phase-${phaseName}`,
            label: '',
            shape: 'dot',
            size: 16,
            color: {
                background: PHASE_COLORS[phaseName],
                border: PHASE_COLORS[phaseName],
                highlight: { background: PHASE_COLORS[phaseName], border: '#1e293b' },
                hover: { background: PHASE_COLORS[phaseName], border: '#1e293b' }
            },
            borderWidth: 4,
            font: { size: 0 },
            shadow: false,
            fixed: { x: true, y: true },
            x: colX,
            y: 0,
            _type: 'phase',
            _phaseName: phaseName
        });
    });

    // Phase header connecting rail — the main trunk line
    for (let i = 0; i < phaseNames.length - 1; i++) {
        edges.add({
            from: `phase-${phaseNames[i]}`,
            to: `phase-${phaseNames[i + 1]}`,
            color: { color: '#cbd5e1', highlight: '#94a3b8', hover: '#94a3b8' },
            width: 5,
            smooth: false,
            dashes: false,
            selectionWidth: 0,
            hoverWidth: 0
        });
    }

    // ── COS STATION NODES ───────────────────────────────────────────────
    // Track CE type → list of {nodeId, x, y} for line routing
    const ceTypeStations = {};

    topology.phases.forEach((phase, pIdx) => {
        const colX = pIdx * PHASE_COL_WIDTH;

        phase.cos.forEach((cos, cIdx) => {
            const stationY = PHASE_PADDING_TOP + cIdx * COS_ROW_HEIGHT;
            const stationId = `cos-${cos.id}`;

            // Determine if interchange (multiple CE types)
            const uniqueTypes = [...new Set(cos.ces.map(ce => ce.type))];
            const isInterchange = uniqueTypes.length > 1;
            const stationSize = isInterchange ? 14 : 10;

            // Station border shows dominant CE type color
            const dominantColor = cos.ces.length > 0 ? getCeLineColor(cos.ces[0].type) : '#cbd5e1';

            // Build station label — truncate COS content
            const stationLabel = cos.contentPreview.length > 22 
                ? cos.contentPreview.substring(0, 20) + '…' 
                : cos.contentPreview;

            // Show dominant CE type icon for this COS station
            const stationIcon = cos.ces.length > 0 ? getCeLineIcon(cos.ces[0].type) : 'fa-solid fa-circle';
            const stationIconClass = stationIcon.replace(/fa-solid\s+|fa-regular\s+|fas\s+|far\s+/g, '').trim();

            nodes.add({
                id: stationId,
                label: stationLabel,
                shape: isInterchange ? 'icon' : 'icon',
                icon: {
                    face: 'Font Awesome 6 Free',
                    code: getIconUnicode(stationIconClass),
                    size: isInterchange ? 22 : 18,
                    color: dominantColor,
                    weight: 900
                },
                font: {
                    color: '#475569',
                    face: 'Antonio, sans-serif',
                    size: 9,
                    vadjust: 16,
                    strokeWidth: 2,
                    strokeColor: 'rgba(255,255,255,0.7)'
                },
                shadow: false,
                fixed: { x: true, y: true },
                x: colX,
                y: stationY,
                _hoverHtml: buildNetworkStationTooltip(cos, phase.name),
                _type: 'cos',
                _cosId: cos.id,
                _phaseName: phase.name,
                _ceTypes: uniqueTypes
            });

            // Vertical rail from phase header to first COS — solid drop line
            if (cIdx === 0) {
                edges.add({
                    from: `phase-${phase.name}`,
                    to: stationId,
                    color: { color: mixColor(PHASE_COLORS[phase.name], 0.4), highlight: PHASE_COLORS[phase.name], hover: PHASE_COLORS[phase.name] },
                    width: 4,
                    smooth: false,
                    dashes: false,
                    selectionWidth: 0,
                    hoverWidth: 0
                });
            }

            // Vertical rail between COS stations within a phase
            if (cIdx > 0) {
                const prevStationId = `cos-${phase.cos[cIdx - 1].id}`;
                edges.add({
                    from: prevStationId,
                    to: stationId,
                    color: { color: mixColor(PHASE_COLORS[phase.name], 0.3), highlight: PHASE_COLORS[phase.name], hover: PHASE_COLORS[phase.name] },
                    width: 4,
                    smooth: false,
                    dashes: false,
                    selectionWidth: 0,
                    hoverWidth: 0
                });
            }

            // Register CE type stations for transit line routing
            cos.ces.forEach((ce, ceIdx) => {
                if (!ceTypeStations[ce.type]) ceTypeStations[ce.type] = [];
                ceTypeStations[ce.type].push({
                    stationId,
                    x: colX,
                    y: stationY,
                    ceId: ce.id,
                    ceLabel: ce.label,
                    ceType: ce.type,
                    cosId: cos.id,
                    phaseName: phase.name
                });
            });
        });
    });

    // ── CE TRANSIT LINES (the bold colored lines — the soul of the subway map)
    // For each CE type, draw thick edges connecting all stations where it appears
    let ceTypeIndex = 0;
    Object.entries(ceTypeStations).forEach(([ceType, stations]) => {
        if (stations.length < 2) return; // No line for singletons

        const lineColor = getCeLineColor(ceType);

        // Sort by x (phase order), then y (COS order within phase)
        stations.sort((a, b) => a.x - b.x || a.y - b.y);

        // Alternate curve direction per CE type to avoid overlapping lines
        // at shared interchange stations — like real subway map routing
        const curveType = ceTypeIndex % 2 === 0 ? 'curvedCW' : 'curvedCCW';
        const roundness = 0.12 + (ceTypeIndex % 4) * 0.04; // Vary roundness slightly

        for (let i = 0; i < stations.length - 1; i++) {
            const from = stations[i];
            const to = stations[i + 1];

            // Determine edge style based on distance
            const samePhase = from.x === to.x;

            edges.add({
                from: from.stationId,
                to: to.stationId,
                color: { color: lineColor, highlight: lineColor, hover: lineColor },
                width: 6,  // Bold subway-map lines
                smooth: samePhase 
                    ? false  // Straight vertical within phase
                    : { type: curveType, roundness: roundness },
                dashes: false,
                hoverWidth: 1,
                selectionWidth: 2,
                _ceType: ceType
            });
        }
        ceTypeIndex++;
    });

    // Restore original add methods
    nodes.add = _originalNodesAdd;
    edges.add = _originalEdgesAdd;

    // Build the boundary nodes to initialize the map viewport immediately without popping in
    const maxPhaseIdx = topology.phases.length - 1;
    const maxCosCount = Math.max(0, ...topology.phases.map(p => p.cos.length));
    const maxX = Math.max(0, maxPhaseIdx * PHASE_COL_WIDTH);
    const maxY = Math.max(400, PHASE_PADDING_TOP + maxCosCount * COS_ROW_HEIGHT);

    nodes.add({ id: 'bounds-bl', x: 0, y: maxY, shape: 'dot', size: 0, color: 'transparent' });
    nodes.add({ id: 'bounds-tr', x: maxX, y: -40, shape: 'dot', size: 0, color: 'transparent' });

    // ── 4. VIS.JS OPTIONS ───────────────────────────────────────────────
    const options = {
        nodes: {
            borderWidth: 3,
            shadow: false,
            font: {
                face: 'Antonio, sans-serif',
                size: 10,
                color: '#475569',
                strokeWidth: 3,
                strokeColor: 'rgba(255,255,255,0.7)'
            }
        },
        edges: {
            smooth: false,
            shadow: {
                enabled: true,
                color: 'rgba(0,0,0,0.06)',
                size: 4,
                x: 0,
                y: 2
            }
        },
        physics: { enabled: false },
        interaction: {
            hover: true,
            tooltipDelay: 100,
            zoomView: true,
            dragView: true,
            dragNodes: false,
            navigationButtons: false
        }
    };

    function fitAndAlignTop(animate = true) {
        // Prevent over-zooming on small graphs by setting max scale
        network.fit({
            animation: animate ? { duration: 600, easingFunction: 'easeInOutQuad' } : false
        });
        setTimeout(() => {
            const currentPosition = network.getViewPosition();
            let currentScale = network.getScale();
            // Cap scale at 1.0 to match the exact look in the screenshot
            if (currentScale > 1.0) currentScale = 1.0; 
            
            // Fallback to 550 if tab is hidden during load
            const canvasHeight = visContainer.clientHeight || 550; 
            const targetY = (canvasHeight * 0.35) / currentScale;
            network.moveTo({
                position: { x: currentPosition.x, y: targetY },
                scale: currentScale,
                animation: animate ? { duration: 400, easingFunction: 'easeInOutQuad' } : false
            });
        }, animate ? 650 : 50);
    }

    const network = new vis.Network(visContainer, { nodes, edges }, options);
    canvas._visNetwork = network;

    function animateNetworkDrawing() {
        // Map node IDs to their X coordinates to determine edge timing
        const nodeXMap = {};
        allNodes.forEach(n => { nodeXMap[n.id] = n.x; });

        // Calculate appearX for each edge (max of from.x and to.x)
        allEdges.forEach(e => {
            const fromX = nodeXMap[e.from] !== undefined ? nodeXMap[e.from] : 0;
            const toX = nodeXMap[e.to] !== undefined ? nodeXMap[e.to] : 0;
            e._appearX = Math.max(fromX, toX);
        });

        // Group X coordinates (Phases)
        const uniqueXs = [...new Set(allNodes.map(n => n.x))].sort((a, b) => a - b);
        let currentPhaseIndex = 0;

        function drawNextPhase() {
            if (currentPhaseIndex >= uniqueXs.length) return;
            
            const targetX = uniqueXs[currentPhaseIndex];
            
            const phaseNodes = allNodes.filter(n => n.x === targetX);
            if (phaseNodes.length > 0) nodes.add(phaseNodes);
            
            const phaseEdges = allEdges.filter(e => e._appearX === targetX);
            if (phaseEdges.length > 0) edges.add(phaseEdges);
            
            currentPhaseIndex++;
            setTimeout(drawNextPhase, 350); // 350ms delay between phases
        }
        
        drawNextPhase();
    }

    // Initialize camera instantly without animation
    setTimeout(() => {
        fitAndAlignTop(false);
        // Start the progressive drawing animation slightly after camera is ready
        setTimeout(animateNetworkDrawing, 100);
    }, 100);

    // ── 5. TOOLBAR ──────────────────────────────────────────────────────
    container.querySelectorAll('.constellation-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = btn.dataset.action;
            if (action === 'zoomIn') {
                network.moveTo({ scale: network.getScale() * 1.3, animation: { duration: 300, easingFunction: 'easeInOutQuad' } });
            } else if (action === 'zoomOut') {
                network.moveTo({ scale: network.getScale() / 1.3, animation: { duration: 300, easingFunction: 'easeInOutQuad' } });
            } else if (action === 'fit') {
                fitAndAlignTop();
            }
        });
    });

    // ── 6. INTERACTIONS ─────────────────────────────────────────────────
    network.on('doubleClick', (params) => {
        if (params.nodes.length === 0) return;
        const nodeId = params.nodes[0];
        const nodeData = nodes.get(nodeId);

        if (nodeData._type === 'cos') {
            // Navigate to Phases tab and highlight the COS row
            const phasesTab = document.getElementById('phases-tab');
            if (phasesTab) phasesTab.click();

            setTimeout(() => {
                const cosRow = document.querySelector(`.cos-card[data-cos-id="${nodeData._cosId}"]`);
                if (cosRow) {
                    // Open parent accordion
                    const accordion = cosRow.closest('.accordion-collapse');
                    if (accordion && !accordion.classList.contains('show')) {
                        const trigger = document.querySelector(`[data-bs-target="#${accordion.id}"]`);
                        if (trigger) trigger.click();
                    }
                    setTimeout(() => {
                        cosRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        cosRow.style.transition = 'background 0.5s';
                        cosRow.style.background = 'rgba(0,188,212,0.1)';
                        setTimeout(() => { cosRow.style.background = ''; }, 2000);
                    }, 300);
                }
            }, 200);
        }

        if (nodeData._type === 'phase') {
            const phasesTab = document.getElementById('phases-tab');
            if (phasesTab) phasesTab.click();
            setTimeout(() => {
                const headings = document.querySelectorAll('[id^="heading"]');
                const phaseIdx = Object.keys(PHASE_COLORS).indexOf(nodeData._phaseName);
                if (headings[phaseIdx]) headings[phaseIdx].click();
            }, 200);
        }
    });

    // Click on station → flash CE pills in that COS row
    network.on('click', (params) => {
        if (params.nodes.length === 0) return;
        const nodeData = nodes.get(params.nodes[0]);
        if (nodeData && nodeData._type === 'cos') {
            // Find CE pills in that COS and flash them
            const pills = document.querySelectorAll(`.cos-card[data-cos-id="${nodeData._cosId}"] .ce-capsule`);
            pills.forEach(pill => {
                pill.style.transition = 'transform 0.3s, box-shadow 0.3s';
                pill.style.transform = 'scale(1.15)';
                pill.style.boxShadow = '0 0 12px rgba(0,188,212,0.4)';
                setTimeout(() => {
                    pill.style.transform = '';
                    pill.style.boxShadow = '';
                }, 1500);
            });
        }
    });

    // Highlight connected transit lines on select
    network.on('selectNode', (params) => {
        if (params.nodes.length === 0) return;
        const selectedId = params.nodes[0];
        const selectedNode = allNodes.find(n => n.id === selectedId);
        if (!selectedNode) return;

        const typesToHighlight = selectedNode._ceTypes || [];
        const edgesToHighlight = new Set();
        const nodesToHighlight = new Set([selectedId]);

        allEdges.forEach(e => {
            let shouldHighlight = false;
            if (e.from === selectedId || e.to === selectedId) {
                // Always highlight directly connected rails
                shouldHighlight = true;
            } else if (e._ceType && typesToHighlight.includes(e._ceType)) {
                // Highlight full transit routes sharing the CE types
                shouldHighlight = true;
            }
            if (shouldHighlight) {
                edgesToHighlight.add(e.id);
                nodesToHighlight.add(e.from);
                nodesToHighlight.add(e.to);
            }
        });

        // Only update items currently drawn to prevent breaking the entrance animation
        const visibleNodes = nodes.getIds();
        const visibleEdges = edges.getIds();
        
        nodes.update(visibleNodes.map(id => ({ 
            id, 
            opacity: nodesToHighlight.has(id) ? 1.0 : 0.15 
        })));
        edges.update(visibleEdges.map(id => ({ 
            id, 
            opacity: edgesToHighlight.has(id) ? 1.0 : 0.1 
        })));
    });

    // Restore opacities on deselect
    network.on('deselectNode', () => {
        const visibleNodes = nodes.getIds();
        const visibleEdges = edges.getIds();
        nodes.update(visibleNodes.map(id => ({ id, opacity: 1.0 })));
        edges.update(visibleEdges.map(id => ({ id, opacity: 1.0 })));
    });

    // Store network reference
    canvas._visNetwork = network;
    container._visNetwork = network;

    // --- Wire Hover Overlay ---
    network.on('hoverNode', (params) => {
        const node = nodes.get(params.node);
        if (node && node._hoverHtml) {
            showHoverOverlay(node._hoverHtml, params.pointer.DOM.x, params.pointer.DOM.y, container);
        }
    });
    network.on('blurNode', () => hideHoverOverlay());
};


// ── DOM SCRAPER ─────────────────────────────────────────────────────────
function scrapeOutcomeTopology() {
    const phases = [];
    let totalCEs = 0;
    const phaseNames = ['Discovery', 'Engagement', 'Action', 'Completion', 'Legacy'];

    const accordionItems = document.querySelectorAll('#phaseAccordion > .accordion-item');

    accordionItems.forEach((item, idx) => {
        const phaseName = phaseNames[idx] || `Phase ${idx + 1}`;
        const cosRows = item.querySelectorAll('.cos-card');
        const cosEntries = [];

        cosRows.forEach(row => {
            const cosId = row.dataset.cosId;
            const contentEl = row.querySelector('.cos-content-display');
            const contentText = contentEl ? contentEl.textContent.trim() : '';
            const capsules = row.querySelectorAll('.ce-capsule');
            const ces = [];

            capsules.forEach(pill => {
                const ceId = pill.dataset.ceId;
                const ceType = pill.dataset.ceType || 'Default';
                const ceLabel = pill.textContent.trim();
                ces.push({ id: ceId, type: ceType, label: ceLabel });
                totalCEs++;
            });

            if (ces.length > 0) {
                cosEntries.push({
                    id: cosId,
                    contentPreview: contentText.substring(0, 80),
                    ces
                });
            }
        });

        phases.push({ name: phaseName, cos: cosEntries });
    });

    return { phases, totalCEs };
}


// ── LEGEND BUILDER ──────────────────────────────────────────────────────
function buildNetworkLegend(topology) {
    // Collect all unique CE types
    const ceTypes = new Set();
    topology.phases.forEach(p => {
        p.cos.forEach(c => {
            c.ces.forEach(ce => ceTypes.add(ce.type));
        });
    });

    // Phase legend
    let html = '<div class="legend-section">';
    html += '<span class="legend-section-title">PHASES</span>';
    Object.entries(PHASE_COLORS).forEach(([name, color]) => {
        html += `<div class="legend-line">
            <span class="legend-swatch" style="background: ${color};"></span>
            <span class="legend-label">${name.toUpperCase()}</span>
        </div>`;
    });
    html += '</div>';

    // CE type legend  
    html += '<div class="legend-section" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(0,0,0,0.06);">';
    html += '<span class="legend-section-title">TRANSIT LINES</span>';
    ceTypes.forEach(ceType => {
        const color = getCeLineColor(ceType);
        html += `<div class="legend-line">
            <span class="legend-swatch" style="background: ${color};"></span>
            <span class="legend-label">${ceType.toUpperCase()}</span>
        </div>`;
    });
    html += '</div>';

    return html;
}


// ── STATION TOOLTIP ─────────────────────────────────────────────────────
function buildNetworkStationTooltip(cos, phaseName) {
    const phaseColor = PHASE_COLORS[phaseName] || '#6366f1';

    const ceList = cos.ces.map(ce => {
        const color = getCeLineColor(ce.type);
        const icon = getCeLineIcon(ce.type);
        return `
            <div class="hover-card-ce-pill">
                <span class="hover-card-ce-icon" style="color: ${color};"><i class="${icon}"></i></span>
                <span class="hover-card-ce-label">${escapeHtml(ce.label)}</span>
                <span class="hover-card-ce-type" style="color: ${color};">${ce.type}</span>
            </div>`;
    }).join('');

    return `
        <div class="constellation-hover-card constellation-hover-card-station" style="--hover-line-color: ${phaseColor};">
            <div class="hover-card-header">
                <div class="hover-card-icon" style="background: ${mixColor(phaseColor, 0.12)}; color: ${phaseColor};">
                    <i class="fas fa-layer-group"></i>
                </div>
                <div class="hover-card-title-block">
                    <div class="hover-card-meta">
                        <span class="hover-card-line-badge" style="color: ${phaseColor};">${phaseName.toUpperCase()} PHASE</span>
                    </div>
                </div>
            </div>
            <div class="hover-card-body" style="font-size: 0.82rem;">${escapeHtml(cos.contentPreview)}</div>
            <div class="hover-card-ce-list">
                ${ceList}
            </div>
            <div class="hover-card-footer">
                <span class="hover-card-hint"><i class="fas fa-mouse-pointer"></i> Double-click to navigate</span>
            </div>
        </div>
    `;
}
