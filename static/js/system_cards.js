// static/js/system_cards.js
import { showLoadingSpinner, hideLoadingSpinner } from './base_functions.js';

// --- State Management ---
let systemNodesConfig = {}; 
let currentNodesArray = []; 
let currentIndex = 0;       
let currentSSOLId = null;

// Mock Entity Store for Prototype (In a full app, this would fetch from the DB relationship)
// We use this to visually stack cards in the left panel for the OPERATOR node.
let entityStore = {
    'OPERATOR': [] 
};

/**
 * Initializes the System Card Controller.
 * Called from outcome.html once the DOM is ready.
 */
export function initSystemCards(ssolId) {
    currentSSOLId = ssolId;
    
    // 1. Load Configuration (Injected in base.html via Python context processor)
    if(window.SYSTEM_NODES_CONFIG) {
        systemNodesConfig = window.SYSTEM_NODES_CONFIG;
        currentNodesArray = Object.keys(systemNodesConfig);
    }

    // 2. Bind Global Functions for OnClick Attributes in HTML
    window.openSystemEditor = openSystemEditor;
    window.navigateSystemNode = navigateSystemNode;
    window.setProtocolMode = setProtocolMode;
    window.setConstraintMode = setConstraintMode;
    window.submitSystemForm = submitSystemForm;
    window.addEntity = addEntity; // Specific to Operator Node
}

/**
 * Opens the Modal and jumps to specific node type.
 * @param {string} existingId - The specific DB ID (optional)
 * @param {string} type - The System Node Type (e.g., 'BUDGET', 'OPERATOR')
 * @param {string} currentValue - The current value to pre-fill
 */
function openSystemEditor(existingId, type, currentValue) {
    if (type && currentNodesArray.includes(type)) {
        currentIndex = currentNodesArray.indexOf(type);
    } else {
        currentIndex = 0; 
    }

    const modalEl = document.getElementById('systemConfigModal');
    modalEl.dataset.editingId = existingId === 'new' ? '' : existingId;
    
    // Store initial value in dataset to survive re-renders
    if(currentValue && currentValue !== 'None') {
        modalEl.dataset.tempValue = currentValue;
    } else {
        delete modalEl.dataset.tempValue;
    }

    updateModalView();
    
    // Launch Bootstrap Modal
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}

/**
 * Handles Carousel Navigation (Prev/Next)
 */
function navigateSystemNode(direction) {
    currentIndex += direction;
    if (currentIndex < 0) currentIndex = currentNodesArray.length - 1;
    if (currentIndex >= currentNodesArray.length) currentIndex = 0;
    
    // Reset temporary state when sliding
    const modalEl = document.getElementById('systemConfigModal');
    delete modalEl.dataset.tempValue; 
    modalEl.dataset.editingId = ""; 

    updateModalView();
}

/**
 * CORE RENDER LOGIC
 * Updates the Left (Visual) and Right (Input) panels based on the current Node Type.
 */
function updateModalView() {
    const typeKey = currentNodesArray[currentIndex];
    const config = systemNodesConfig[typeKey] || {};
    const modalEl = document.getElementById('systemConfigModal');
    const savedVal = modalEl.dataset.tempValue || '';

    // --- 1. Identity Panel (Left) ---
    document.getElementById('sys-identity-panel').style.backgroundColor = config.color;
    document.getElementById('sys-display-icon').className = `fas ${config.icon} fa-2x text-white`;
    document.getElementById('sys-display-label').textContent = config.label;
    
    // VISUALIZER: Render the correct state view (Gauge, Stack, or Text)
    renderVisualizer(typeKey, savedVal, config.color);

    // --- 2. Calibration Console (Right) ---
    // Info Text
    document.getElementById('sys-display-desc').textContent = config.description;
    document.getElementById('sys-display-guide').textContent = config.guide;

    // Hidden Form Inputs
    document.getElementById('sys-param-type').value = typeKey;
    document.getElementById('sys-param-id').value = modalEl.dataset.editingId;

    // Render Input Fields based on Type
    renderBespokeInput(typeKey, savedVal, config.color, config);
    
    // Pagination Dots
    document.getElementById('sys-counter').textContent = `CARD ${currentIndex + 1} / ${currentNodesArray.length}`;
    const dotContainer = document.getElementById('sys-dots-container');
    dotContainer.innerHTML = currentNodesArray.map((k, i) => 
        `<div class="sys-dot ${i === currentIndex ? 'active' : ''}" style="opacity: ${i === currentIndex ? '1' : '0.3'}"></div>`
    ).join('');
}

/**
 * Renders the Left Column State Monitor
 */
function renderVisualizer(type, value, color) {
    const container = document.getElementById('sys-visualizer-container');
    container.innerHTML = ''; // Clear

    // CASE: OPERATOR (Stack of Identity Cards)
    if (type === 'OPERATOR') {
        if (entityStore['OPERATOR'].length === 0 && !value) {
             container.innerHTML = `
                <div class="bg-white bg-opacity-10 border-2 border-dashed border-white border-opacity-25 rounded-xl p-5 text-center text-white-50">
                    <i class="fas fa-users fa-2x mb-2"></i>
                    <div class="small font-bold">NO CHAMPIONS ASSIGNED</div>
                </div>`;
        } else {
            // Visualize either the stored entity stack OR the single value if simple text was used
            const displayEntities = entityStore['OPERATOR'].length > 0 
                ? entityStore['OPERATOR'] 
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

    // DEFAULT: Big Typographic Display
    container.innerHTML = `
        <div class="bg-white bg-opacity-10 border border-white border-opacity-25 rounded-xl p-4 backdrop-blur-sm shadow-inner">
             <div class="d-flex align-items-center gap-3">
                <div class="rounded-circle bg-white" style="width: 8px; height: 8px;"></div>
                <div class="fs-3 fw-bold text-white text-break lh-sm">${value || 'Unset'}</div>
             </div>
        </div>`;
}

/**
 * Renders the Right Column Input Area
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
                        <input type="text" id="ent-name" class="form-control form-control-sm" placeholder="Entity Name (e.g. Acme Corp)" value="${value}">
                    </div>
                    <div class="col-6"><input type="text" id="ent-role" class="form-control form-control-sm" placeholder="Role / Title"></div>
                    <div class="col-6"><input type="text" id="ent-org" class="form-control form-control-sm" placeholder="Organization"></div>
                </div>
                <button type="button" class="btn btn-dark w-100 btn-sm mt-3 font-data" onclick="addEntity()">
                    <i class="fas fa-plus-circle me-1"></i> ADD TO STACK
                </button>
                <!-- Hidden real value field for submission -->
                <input type="hidden" name="value" id="real-value-input" value="${value}">
            </div>
        `;
        return;
    }

    // 2. SELECT DROPDOWN (If 'options' exist in config)
    if (config.options && Array.isArray(config.options)) {
        const opts = config.options.map(opt => 
            `<option value="${opt}" ${opt === value ? 'selected' : ''}>${opt}</option>`
        ).join('');
        
        container.innerHTML = `
            <div class="mb-3">
                <label class="font-data text-muted x-small mb-2" style="color:${color} !important">SELECT CONFIGURATION</label>
                <select name="value" class="form-select form-select-lg font-body fw-bold border-0 border-bottom rounded-0 px-0 shadow-none bg-transparent">
                    <option value="" disabled ${!value ? 'selected' : ''}>Choose...</option>
                    ${opts}
                </select>
            </div>
        `;
        return;
    }

    // 3. HORIZON (Date Picker)
    if (type === 'HORIZON') {
        container.innerHTML = `
            <div class="mb-3">
                <label class="font-data text-muted x-small mb-2" style="color:${color} !important">TARGET DATE</label>
                <input type="date" name="value" class="form-control form-control-lg fs-4 font-body fw-bold border-0 border-bottom rounded-0 px-0 shadow-none" 
                       value="${value}" style="background:transparent;">
            </div>
        `;
        return;
    }

    // 4. DEFAULT (Text Input)
    container.innerHTML = `
        <div class="mb-3">
            <label class="font-data text-muted x-small mb-2" style="color:${color} !important">ANCHOR VALUE</label>
            <input type="text" name="value" class="form-control form-control-lg fs-4 font-body fw-bold border-0 border-bottom rounded-0 px-0 shadow-none" 
                   value="${value}" placeholder="Define value..." autocomplete="off" style="background:transparent;">
        </div>
    `;
}

// --- Interaction Handlers ---

function setProtocolMode(mode) {
    // UI Toggle
    document.querySelectorAll('.sys-protocol-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`mode-${mode.toLowerCase()}`).classList.add('active');
    
    const container = document.getElementById('sys-input-container');
    const type = document.getElementById('sys-param-type').value;

    if (mode === 'SPECULATE') {
        // AI LOADING STATE
        container.innerHTML = `
            <div class="bg-light border border-primary-subtle rounded-3 p-5 text-center animate-in fade-in">
                <div class="spinner-grow text-primary mb-3" role="status" style="width: 3rem; height: 3rem;"></div>
                <p class="font-body small text-muted">Connecting to SSPEC Engine...</p>
                <div class="font-data x-small text-muted tracking-widest mt-2">OPTIMIZING ${type}</div>
            </div>
        `;
        
        // Mock Simulation for Prototype (In real app, fetch /speculate_system_node)
        // This simulates the AI "Thinking" and returning a smart value
        setTimeout(() => {
            let suggestion = "AI Optimization";
            if(type === 'HORIZON') suggestion = "2026-11-15"; // AI picks a date
            if(type === 'OPERATOR') suggestion = "Strategic Consortium";
            if(type === 'BUDGET') suggestion = "Grant Funded";
            
            // Switch back to Specify mode to show the result
            setProtocolMode('SPECIFY');
            
            // Slight delay to allow DOM to repaint before injecting value
            setTimeout(() => {
                const inp = document.querySelector('[name="value"]');
                const sel = document.querySelector('select[name="value"]');
                
                if(inp) inp.value = suggestion;
                if(sel) sel.value = suggestion;
                
                // For Operator, fill the visible input too
                if(type === 'OPERATOR') {
                    document.getElementById('ent-name').value = suggestion;
                    document.getElementById('real-value-input').value = suggestion;
                }
                
                // Trigger Visualizer Update
                renderVisualizer(type, suggestion, systemNodesConfig[type].color);
            }, 50);
        }, 1200);
    } else {
        // Re-render standard inputs (Cancel Speculation)
        updateModalView();
    }
}

function setConstraintMode(mode) {
    // UI Toggle for Hard/Soft Constraints
    document.querySelector('.selected-mode-card').classList.remove('selected-mode-card');
    
    // Add opacity to unselected
    document.getElementById('constraint-hard').classList.add('opacity-50');
    document.getElementById('constraint-soft').classList.add('opacity-50');
    
    // Activate selected
    const target = document.getElementById(`constraint-${mode.toLowerCase()}`);
    target.classList.remove('opacity-50');
    target.classList.add('selected-mode-card');
    
    document.getElementById('sys-constraint-input').value = mode;
}

/**
 * Adds an entity to the Operator Stack (Client-side visual only for now)
 */
function addEntity() {
    const name = document.getElementById('ent-name').value;
    const role = document.getElementById('ent-role').value || 'Lead';
    const org = document.getElementById('ent-org').value || 'External';
    
    if(name) {
        // Add to store
        entityStore['OPERATOR'].push({name, role, org, id: Date.now()});
        
        // Update Visualizer
        renderVisualizer('OPERATOR', null, systemNodesConfig['OPERATOR'].color);
        
        // Update Hidden Input (Comma separated for simple storage)
        const realInput = document.getElementById('real-value-input');
        const currentVals = entityStore['OPERATOR'].map(e => e.name).join(', ');
        realInput.value = currentVals;

        // Clear Form
        document.getElementById('ent-name').value = '';
        document.getElementById('ent-role').value = '';
        document.getElementById('ent-org').value = '';
    }
}

/**
 * Submits the data to the backend
 */
function submitSystemForm() {
    const form = document.getElementById('system-node-form');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Add SSOL ID context
    data.ssol_id = currentSSOLId;
    data.key = data.sys_type; // Match backend expectation

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
            // Close Modal
            const modalEl = document.getElementById('systemConfigModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();
            
            // Reload page to update the Sidebar (simplest way to refresh global context)
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