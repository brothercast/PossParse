// static/js/system_cards.js
import { showLoadingSpinner, hideLoadingSpinner } from './base_functions.js';

// --- Unified State Management ---
let sysState = {
    config: {},             // Loaded from window.SYSTEM_NODES_CONFIG
    nodeKeys: [],           // Array of node types (['HORIZON', 'OPERATOR', ...])
    currentIndex: 0,        // Current slide index
    ssolId: null,           // Context SSOL ID
    
    // Entity Store for the OPERATOR stack (client-side cache)
    entityStore: { 
        'OPERATOR': [] 
    },

    // Transient Editing State (The "Buffer")
    editingId: null,        // DB ID of the node being edited (or '' for new)
    tempValue: null,        // Current value in the input field
    isSpeculating: false,   // Loading state flag
    constraintMode: 'HARD'  // HARD vs SOFT constraint
};

/**
 * Initializes the System Card Controller.
 * Called from outcome.html once the DOM is ready.
 */
export function initSystemCards(ssolId) {
    sysState.ssolId = ssolId;
    
    // 1. Load Configuration (Injected in base.html)
    if(window.SYSTEM_NODES_CONFIG) {
        sysState.config = window.SYSTEM_NODES_CONFIG;
        sysState.nodeKeys = Object.keys(sysState.config);
    }

    // 2. Bind Global Functions for HTML OnClick Attributes
    window.openSystemEditor = openSystemEditor;
    window.navigateSystemNode = navigateSystemNode;
    window.setProtocolMode = setProtocolMode;
    window.setConstraintMode = setConstraintMode;
    window.submitSystemForm = submitSystemForm;
    window.addEntity = addEntity;
}

/**
 * Opens the Modal and jumps to specific node type.
 * @param {string} existingId - The specific DB ID (or 'new')
 * @param {string} type - The System Node Type (e.g., 'BUDGET', 'OPERATOR')
 * @param {string} currentValue - The current value to pre-fill
 */
function openSystemEditor(existingId, type, currentValue) {
    // 1. Set Carousel Index
    if (type && sysState.nodeKeys.includes(type)) {
        sysState.currentIndex = sysState.nodeKeys.indexOf(type);
    } else {
        sysState.currentIndex = 0; 
    }

    // 2. Hydrate State
    sysState.editingId = existingId === 'new' ? '' : existingId;
    // Handle 'None' string from Jinja template if field is empty
    sysState.tempValue = (currentValue && currentValue !== 'None') ? currentValue : '';
    sysState.constraintMode = 'HARD'; // Reset to default

    updateModalView();
    
    // 3. Launch Bootstrap Modal
    const modalEl = document.getElementById('systemConfigModal');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}

/**
 * Handles Carousel Navigation (Prev/Next)
 */
function navigateSystemNode(direction) {
    // 1. Update Index
    sysState.currentIndex += direction;
    
    // Loop navigation
    if (sysState.currentIndex < 0) sysState.currentIndex = sysState.nodeKeys.length - 1;
    if (sysState.currentIndex >= sysState.nodeKeys.length) sysState.currentIndex = 0;
    
    // 2. Reset Transient State for the new card
    sysState.editingId = ""; 
    sysState.tempValue = ""; 
    // In a real app, you might want to fetch the existing value for this next node here
    // For now, we start fresh or relying on what passed in via click (limit of this carousel implementation)

    updateModalView();
}

/**
 * CORE RENDER LOGIC
 * Updates the Left (Visual) and Right (Input) panels based on the State.
 */
function updateModalView() {
    const typeKey = sysState.nodeKeys[sysState.currentIndex];
    const config = sysState.config[typeKey] || {};
    
    // --- 1. Identity Panel (Left) ---
    const identityPanel = document.getElementById('sys-identity-panel');
    identityPanel.style.backgroundColor = config.color;
    
    document.getElementById('sys-display-icon').className = `fas ${config.icon} fa-2x text-white`;
    document.getElementById('sys-display-label').textContent = config.label;
    
    // VISUALIZER: Render the correct state view (Gauge, Stack, or Text)
    renderVisualizer(typeKey, sysState.tempValue, config.color);

    // --- 2. Calibration Console (Right) ---
    // Ontology & Guide
    document.getElementById('sys-display-desc').textContent = config.description;
    document.getElementById('sys-display-guide').textContent = config.guide;

    // Examples Container (New Feature)
    const exContainer = document.getElementById('sys-examples-container');
    exContainer.innerHTML = "";
    if(config.examples && Array.isArray(config.examples)) {
        config.examples.forEach(ex => {
            const badge = document.createElement('span');
            badge.className = "badge bg-white border text-secondary fw-normal cursor-pointer hover-shadow";
            badge.textContent = ex;
            badge.onclick = () => {
                // Click to fill
                sysState.tempValue = ex;
                renderBespokeInput(typeKey, sysState.tempValue, config.color, config);
                renderVisualizer(typeKey, sysState.tempValue, config.color);
            };
            exContainer.appendChild(badge);
        });
    }

    // Hidden Form Inputs
    document.getElementById('sys-param-type').value = typeKey;
    document.getElementById('sys-param-id').value = sysState.editingId;

    // Render Input Fields
    renderBespokeInput(typeKey, sysState.tempValue, config.color, config);
    
    // Update Badge Status
    const statusBadge = document.getElementById('sys-status-badge');
    if(sysState.tempValue) {
        statusBadge.className = "badge bg-success-subtle text-success border border-success-subtle font-data rounded-pill px-3";
        statusBadge.innerHTML = '<i class="fas fa-check-circle me-1"></i> CALIBRATED';
    } else {
        statusBadge.className = "badge bg-secondary-subtle text-secondary border border-secondary-subtle font-data rounded-pill px-3";
        statusBadge.innerHTML = '<i class="fas fa-circle me-1" style="font-size:8px;"></i> UNSET';
    }

    // Pagination Dots
    document.getElementById('sys-counter').textContent = `CARD ${sysState.currentIndex + 1} / ${sysState.nodeKeys.length}`;
    const dotContainer = document.getElementById('sys-dots-container');
    dotContainer.innerHTML = sysState.nodeKeys.map((k, i) => 
        `<div class="sys-dot ${i === sysState.currentIndex ? 'active' : ''}" style="opacity: ${i === sysState.currentIndex ? '1' : '0.3'}"></div>`
    ).join('');
}

/**
 * Renders the Left Column State Monitor (Visual Feedback)
 */
function renderVisualizer(type, value, color) {
    const container = document.getElementById('sys-visualizer-container');
    container.innerHTML = ''; 

    // CASE: OPERATOR (Stack of Identity Cards)
    if (type === 'OPERATOR') {
        const entities = sysState.entityStore['OPERATOR'];
        
        if ((!entities || entities.length === 0) && !value) {
             container.innerHTML = `
                <div class="bg-white bg-opacity-10 border-2 border-dashed border-white border-opacity-25 rounded-xl p-5 text-center text-white-50">
                    <i class="fas fa-users fa-2x mb-2"></i>
                    <div class="small font-bold">NO CHAMPIONS ASSIGNED</div>
                </div>`;
        } else {
            // Visualize entities OR the text value
            const displayEntities = (entities && entities.length > 0) 
                ? entities 
                : [{name: value, role: 'Primary Contact', org: 'Entity'}];
            
            displayEntities.forEach(ent => {
                container.innerHTML += `
                <div class="sys-entity-card">
                     <div class="sys-entity-avatar" style="color:${color}; background: #fff;">${ent.name ? ent.name[0] : '?'}</div>
                     <div style="flex-grow:1; overflow:hidden;">
                        <div class="font-bold text-dark text-truncate" style="font-size:0.85rem;">${ent.name || 'Unknown'}</div>
                        <div class="font-data text-muted x-small text-truncate">${ent.role} • ${ent.org}</div>
                     </div>
                     <div class="badge bg-light text-muted border"><i class="fas fa-box"></i></div>
                </div>`;
            });
        }
        return;
    }

    // CASE: HORIZON (Velocity Gauge)
    if (type === 'HORIZON') {
        container.innerHTML = `
             <div class="bg-white bg-opacity-10 border border-white border-opacity-25 rounded-2xl p-4 backdrop-blur-sm text-center">
                 <div class="font-data text-white-50 x-small uppercase tracking-widest mb-2">TIMELINE VELOCITY</div>
                 <div class="display-4 font-brand text-white mb-0">${value ? value.split('-')[0] : '--'}</div>
                 <div class="font-data text-white-50 x-small uppercase tracking-wide mb-3">TARGET HORIZON</div>
                 <div class="progress" style="height: 4px; background-color: rgba(255,255,255,0.2);">
                    <div class="progress-bar bg-white" style="width: ${value ? '65%' : '0%'}"></div>
                 </div>
             </div>`;
        return;
    }

    // DEFAULT: Big Typographic Display (The "Active Pill")
    if (value && value.trim() !== "") {
        container.innerHTML = `
            <div class="bg-white bg-opacity-10 border border-white border-opacity-25 rounded-pill p-3 pe-5 d-flex align-items-center backdrop-blur transition-all">
                <div class="rounded-circle bg-white text-dark d-flex align-items-center justify-content-center shadow-sm me-3" 
                     style="width: 42px; height: 42px; flex-shrink: 0;">
                    <!-- Use icon from current config in state -->
                    <i class="fas ${sysState.config[type].icon} fa-lg" style="color: ${color}"></i>
                </div>
                <div>
                    <div class="font-data text-white-50 x-small uppercase tracking-wide mb-0">ANCHOR VALUE</div>
                    <div class="font-body text-white fw-bold fs-5 leading-tight text-truncate" style="max-width: 220px;">
                        ${value}
                    </div>
                </div>
            </div>`;
    } else {
        container.innerHTML = `
             <div class="border border-dashed border-white border-opacity-25 rounded-pill p-4 text-center text-white-50 font-data small">
                <i class="fas fa-terminal me-2"></i> AWAITING INPUT
             </div>
        `;
    }
}

/**
 * Renders the Right Column Input Area and attaches Live Listeners
 */
function renderBespokeInput(type, value, color, config) {
    const container = document.getElementById('sys-input-container');
    container.innerHTML = '';

    // 1. OPERATOR (Contact Form)
    if (type === 'OPERATOR') {
        container.innerHTML = `
            <div class="bg-light rounded-3 p-3 border border-light-subtle">
                <div class="d-flex align-items-center gap-2 mb-3 text-muted border-bottom pb-2">
                    <i class="fas fa-user-plus small"></i>
                    <span class="font-data x-small fw-bold tracking-widest">ADD CHAMPION</span>
                </div>
                <div class="row g-2">
                    <div class="col-12">
                        <input type="text" id="ent-name" class="form-control form-control-sm" placeholder="Entity Name" value="${value}">
                    </div>
                    <div class="col-6"><input type="text" id="ent-role" class="form-control form-control-sm" placeholder="Role / Title"></div>
                    <div class="col-6"><input type="text" id="ent-org" class="form-control form-control-sm" placeholder="Organization"></div>
                </div>
                <button type="button" class="btn btn-dark w-100 btn-sm mt-3 font-data" onclick="addEntity()">
                    <i class="fas fa-plus-circle me-1"></i> ADD TO STACK
                </button>
                <input type="hidden" name="value" id="real-value-input" value="${value}">
            </div>
        `;
        
        // Attach listener for single-value simple entry
        document.getElementById('ent-name').oninput = (e) => {
            sysState.tempValue = e.target.value;
            document.getElementById('real-value-input').value = e.target.value;
            renderVisualizer(type, e.target.value, color);
        };
        return;
    }

    // 2. SELECT DROPDOWN
    if (config.options && Array.isArray(config.options)) {
        const opts = config.options.map(opt => 
            `<option value="${opt}" ${opt === value ? 'selected' : ''}>${opt}</option>`
        ).join('');
        
        container.innerHTML = `
            <div class="mb-3">
                <label class="font-data text-muted x-small mb-2" style="color:${color} !important">SELECT CONFIGURATION</label>
                <select name="value" id="sys-param-value" class="form-select form-select-lg font-body fw-bold border-0 border-bottom rounded-0 px-0 shadow-none bg-transparent">
                    <option value="" disabled ${!value ? 'selected' : ''}>Choose...</option>
                    ${opts}
                </select>
            </div>
        `;
    } 
    // 3. HORIZON (Date)
    else if (type === 'HORIZON') {
        container.innerHTML = `
            <div class="mb-3">
                <label class="font-data text-muted x-small mb-2" style="color:${color} !important">TARGET DATE</label>
                <input type="date" name="value" id="sys-param-value" class="form-control form-control-lg fs-4 font-body fw-bold border-0 border-bottom rounded-0 px-0 shadow-none" 
                       value="${value}" style="background:transparent;">
            </div>
        `;
    } 
    // 4. DEFAULT (Text)
    else {
        container.innerHTML = `
            <div class="mb-3">
                <label class="font-data text-muted x-small mb-2" style="color:${color} !important">ANCHOR VALUE</label>
                <input type="text" name="value" id="sys-param-value" class="form-control form-control-lg fs-4 font-body fw-bold border-0 border-bottom rounded-0 px-0 shadow-none" 
                       value="${value}" placeholder="Define value..." autocomplete="off" style="background:transparent;">
            </div>
        `;
    }

    // Bind Live Update Listener
    const mainInput = document.getElementById('sys-param-value');
    if(mainInput) {
        mainInput.oninput = (e) => {
            sysState.tempValue = e.target.value;
            renderVisualizer(type, e.target.value, color);
        };
        // For Select, onchange is better
        mainInput.onchange = (e) => {
            sysState.tempValue = e.target.value;
            renderVisualizer(type, e.target.value, color);
        };
    }
}

// --- Interaction Handlers ---

function setProtocolMode(mode) {
    // UI Toggle
    document.querySelectorAll('.sys-protocol-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`mode-${mode.toLowerCase()}`).classList.add('active');
    
    const container = document.getElementById('sys-input-container');
    const type = document.getElementById('sys-param-type').value;

    if (mode === 'SPECULATE') {
        sysState.isSpeculating = true;
        container.innerHTML = `
            <div class="bg-light border border-primary-subtle rounded-3 p-5 text-center animate-in fade-in">
                <div class="spinner-grow text-primary mb-3" role="status" style="width: 3rem; height: 3rem;"></div>
                <p class="font-body small text-muted">Connecting to SSPEC Engine...</p>
                <div class="font-data x-small text-muted tracking-widest mt-2">OPTIMIZING ${type}</div>
            </div>
        `;
        
        // Mock Simulation (In real app: fetch /speculate_system_node)
        setTimeout(() => {
            let suggestion = "AI Optimized Value";
            if(type === 'HORIZON') suggestion = "2026-11-15"; 
            if(type === 'OPERATOR') suggestion = "Strategic Consortium";
            if(type === 'BUDGET') suggestion = "Grant Funded";
            
            // Switch back to Specify
            sysState.isSpeculating = false;
            setProtocolMode('SPECIFY');
            
            // Update State
            sysState.tempValue = suggestion;
            
            // Re-render inputs and visualizer
            const typeKey = sysState.nodeKeys[sysState.currentIndex];
            const config = sysState.config[typeKey];
            
            setTimeout(() => {
                renderBespokeInput(typeKey, suggestion, config.color, config);
                renderVisualizer(typeKey, suggestion, config.color);
                
                // For Operator, sync specific fields
                if(type === 'OPERATOR') {
                    const entInput = document.getElementById('ent-name');
                    const realInput = document.getElementById('real-value-input');
                    if(entInput) entInput.value = suggestion;
                    if(realInput) realInput.value = suggestion;
                }
            }, 50);
        }, 1200);
    } else {
        // Cancel Speculation / Return to form
        if(!sysState.isSpeculating) {
            updateModalView();
        }
    }
}

function setConstraintMode(mode) {
    sysState.constraintMode = mode;
    
    document.querySelector('.selected-mode-card').classList.remove('selected-mode-card');
    
    document.getElementById('constraint-hard').classList.add('opacity-50');
    document.getElementById('constraint-soft').classList.add('opacity-50');
    
    const target = document.getElementById(`constraint-${mode.toLowerCase()}`);
    target.classList.remove('opacity-50');
    target.classList.add('selected-mode-card');
    
    document.getElementById('sys-constraint-input').value = mode;
}

function addEntity() {
    const name = document.getElementById('ent-name').value;
    const role = document.getElementById('ent-role').value || 'Lead';
    const org = document.getElementById('ent-org').value || 'External';
    
    if(name) {
        // Update Store
        if(!sysState.entityStore['OPERATOR']) sysState.entityStore['OPERATOR'] = [];
        sysState.entityStore['OPERATOR'].push({name, role, org, id: Date.now()});
        
        // Update State
        sysState.tempValue = sysState.entityStore['OPERATOR'].map(e => e.name).join(', ');
        
        // Update Visualizer
        const config = sysState.config['OPERATOR'];
        renderVisualizer('OPERATOR', sysState.tempValue, config.color);
        
        // Update Hidden Input
        const realInput = document.getElementById('real-value-input');
        if(realInput) realInput.value = sysState.tempValue;

        // Clear Form
        document.getElementById('ent-name').value = '';
        document.getElementById('ent-role').value = '';
        document.getElementById('ent-org').value = '';
    }
}

function submitSystemForm() {
    const form = document.getElementById('system-node-form');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    data.ssol_id = sysState.ssolId;
    data.key = data.sys_type;

    // UI Feedback
    const btn = document.querySelector('button[onclick="submitSystemForm()"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin me-2"></i> SAVING...';
    btn.disabled = true;

    fetch('/update_ssol_system_node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(r => r.json())
    .then(response => {
        if (response.success) {
            const modalEl = document.getElementById('systemConfigModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();
            
            // Reload to reflect changes on main dashboard
            location.reload(); 
        } else {
            alert("Error saving: " + (response.error || "Unknown error"));
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    })
    .catch(err => {
        console.error(err);
        alert("Network Error");
        btn.innerHTML = originalText;
        btn.disabled = false;
    });
}