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
    constraintMode: 'HARD', // HARD vs SOFT constraint
    isExpanded: false       // Accordion state for option pills
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
    window.selectSysOption = selectSysOption;
    window.toggleSysOptionExpand = () => {
        sysState.isExpanded = !sysState.isExpanded;
        updateModalView();
    };
}

/**
 * Opens the Modal and jumps to specific node type.
 */
function openSystemEditor(existingId, type, currentValue) {
    if (type && sysState.nodeKeys.includes(type)) {
        sysState.currentIndex = sysState.nodeKeys.indexOf(type);
    } else {
        sysState.currentIndex = 0; 
    }

    sysState.editingId = existingId === 'new' ? '' : existingId;
    sysState.tempValue = (currentValue && currentValue !== 'None') ? currentValue : '';
    sysState.constraintMode = 'HARD';
    sysState.isExpanded = false;

    updateModalView();
    
    const modalEl = document.getElementById('systemConfigModal');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}

/**
 * Handles Carousel Navigation with crossfade
 */
function navigateSystemNode(direction) {
    sysState.currentIndex += direction;
    if (sysState.currentIndex < 0) sysState.currentIndex = sysState.nodeKeys.length - 1;
    if (sysState.currentIndex >= sysState.nodeKeys.length) sysState.currentIndex = 0;
    
    sysState.editingId = ""; 
    sysState.tempValue = ""; 
    sysState.isExpanded = false;

    // Crossfade transition
    const leftContent = document.getElementById('sys-left-content');
    const rightContent = document.getElementById('sys-right-content');
    
    if (leftContent) leftContent.classList.add('transitioning');
    if (rightContent) rightContent.classList.add('transitioning');
    
    setTimeout(() => {
        updateModalView();
        if (leftContent) leftContent.classList.remove('transitioning');
        if (rightContent) rightContent.classList.remove('transitioning');
    }, 300);
}

/**
 * CORE RENDER LOGIC — Updates both panels based on State
 */
function updateModalView() {
    const typeKey = sysState.nodeKeys[sysState.currentIndex];
    const config = sysState.config[typeKey] || {};
    
    // --- 1. Identity Panel (Left) ---
    const identityPanel = document.getElementById('sys-identity-panel');
    // Set CSS custom property for dynamic theming
    identityPanel.style.setProperty('--sys-node-color', config.color);
    identityPanel.style.backgroundColor = config.color;
    
    // Ghost icon
    const ghostIcon = document.getElementById('sys-ghost-icon');
    if (ghostIcon) ghostIcon.className = `${config.icon} sys-ghost-icon`;
    
    // Icon badge
    document.getElementById('sys-display-icon').className = config.icon;
    document.getElementById('sys-display-label').textContent = config.label;
    
    // VISUALIZER
    renderVisualizer(typeKey, sysState.tempValue, config.color);

    // --- 2. Calibration Console (Right) ---
    // Set CSS variable on the right panel for constraint cards etc.
    const rightPanel = identityPanel.closest('.row');
    if (rightPanel) rightPanel.style.setProperty('--sys-node-color', config.color);
    
    // Definition card
    const descEl = document.getElementById('sys-display-desc');
    const guideEl = document.getElementById('sys-display-guide');
    
    descEl.textContent = config.description;
    
    if (config.guide) {
        guideEl.textContent = config.guide;
        guideEl.classList.remove('d-none');
    } else {
        guideEl.textContent = '';
        guideEl.classList.add('d-none');
    }

    // Examples Container
    const exContainer = document.getElementById('sys-examples-container');
    exContainer.innerHTML = "";
    if(config.examples && Array.isArray(config.examples) && config.examples.length > 0) {
        exContainer.classList.remove('d-none');
        exContainer.classList.add('d-flex');
        config.examples.forEach(ex => {
            const pill = document.createElement('span');
            pill.className = "sys-example-pill";
            pill.textContent = ex;
            pill.onclick = () => {
                sysState.tempValue = ex;
                renderBespokeInput(typeKey, sysState.tempValue, config.color, config);
                renderVisualizer(typeKey, sysState.tempValue, config.color);
            };
            exContainer.appendChild(pill);
        });
    } else {
        exContainer.classList.remove('d-flex');
        exContainer.classList.add('d-none');
    }

    // Hidden Form Inputs
    document.getElementById('sys-param-type').value = typeKey;
    document.getElementById('sys-param-id').value = sysState.editingId;

    // Render Input Fields
    renderBespokeInput(typeKey, sysState.tempValue, config.color, config);
    
    // Update Status Badge
    const statusBadge = document.getElementById('sys-status-badge');
    if(sysState.tempValue) {
        statusBadge.className = "sys-status-glass calibrated";
        statusBadge.innerHTML = '<i class="fas fa-check-circle"></i> CALIBRATED';
    } else {
        statusBadge.className = "sys-status-glass unset";
        statusBadge.innerHTML = '<i class="fas fa-circle" style="font-size:6px;"></i> UNSET';
    }

    // Pagination Dots
    document.getElementById('sys-counter').textContent = `CARD ${sysState.currentIndex + 1} / ${sysState.nodeKeys.length}`;
    const dotContainer = document.getElementById('sys-dots-container');
    dotContainer.innerHTML = sysState.nodeKeys.map((k, i) => 
        `<div class="sys-dot ${i === sysState.currentIndex ? 'active' : ''}"></div>`
    ).join('');

    // Reset constraint mode visuals
    resetConstraintVisuals();
}

/**
 * Renders the Left Column State Monitor (Visual Feedback)
 */
function renderVisualizer(type, value, color) {
    const container = document.getElementById('sys-visualizer-container');
    
    // Crossfade out
    container.classList.add('fading');
    
    setTimeout(() => {
        container.innerHTML = ''; 

        // CASE: OPERATOR (Stack of Identity Cards)
        if (type === 'OPERATOR') {
            const entities = sysState.entityStore['OPERATOR'];
            
            if ((!entities || entities.length === 0) && !value) {
                container.innerHTML = `
                    <div class="sys-viz-empty">
                        <i class="fas fa-users fa-2x mb-2"></i>
                        <div class="small font-bold">NO CHAMPIONS ASSIGNED</div>
                    </div>`;
            } else {
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
            container.classList.remove('fading');
            return;
        }

        // CASE: HORIZON (Timeline Velocity)
        if (type === 'HORIZON') {
            container.innerHTML = `
                 <div class="sys-viz-glass text-center">
                     <div class="font-data text-white-50 x-small uppercase tracking-widest mb-2">TIMELINE VELOCITY</div>
                     <div class="display-4 font-brand text-white mb-0">${value ? value.split('-')[0] : '--'}</div>
                     <div class="font-data text-white-50 x-small uppercase tracking-wide mb-3">TARGET HORIZON</div>
                     <div class="progress" style="height: 4px; background-color: rgba(255,255,255,0.2); border-radius: 4px;">
                        <div class="progress-bar bg-white" style="width: ${value ? '65%' : '0%'}; border-radius: 4px;"></div>
                     </div>
                 </div>`;
            container.classList.remove('fading');
            return;
        }

        // DEFAULT: Active Pill Visualizer
        if (value && value.trim() !== "") {
            container.innerHTML = `
                <div class="sys-viz-pill">
                    <div class="rounded-circle bg-white text-dark d-flex align-items-center justify-content-center shadow-sm" 
                         style="width: 42px; height: 42px; flex-shrink: 0;">
                        <i class="${sysState.config[type].icon} fa-lg" style="color: ${color}"></i>
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
                 <div class="sys-viz-empty">
                    <i class="fas fa-terminal me-2"></i> AWAITING INPUT
                 </div>`;
        }
        
        container.classList.remove('fading');
    }, 150); // Brief delay for crossfade
}

/**
 * Renders the Right Column Input Area — OPTION PILLS instead of dropdowns
 */
function renderBespokeInput(type, value, color, config) {
    const container = document.getElementById('sys-input-container');
    container.innerHTML = '';

    // 1 & 2. SELECT DROPDOWN / OPERATOR → OPTION PILLS
    if (config.options && Array.isArray(config.options)) {
        const wizConfig = config.wizard || {};
        const insightMap = wizConfig.insight_map || {};
        
        let html = '<div class="sys-option-stack mb-3">';
        
        if (value && !sysState.isExpanded) {
            // COLLAPSED STATE
            const desc = insightMap[value] || '';
            html += `
            <div class="sys-option-pill selected collapsed-view" onclick="toggleSysOptionExpand()">
                <div class="sys-option-icon"><i class="${config.icon}"></i></div>
                <div class="sys-option-text">
                    <div class="sys-option-title">${value}</div>
                    ${desc ? `<div class="sys-option-desc">${desc}</div>` : ''}
                </div>
                <div class="sys-option-check"><i class="fas fa-chevron-down text-muted"></i></div>
            </div>`;
        } else {
            // EXPANDED STATE
            html += config.options.map(opt => {
                const isSelected = opt === value;
                const desc = insightMap[opt] || '';
                return `
                <div class="sys-option-pill ${isSelected ? 'selected' : ''}" 
                     onclick="selectSysOption('${type}', '${opt.replace(/'/g, "\\'")}')">
                    <div class="sys-option-icon"><i class="${config.icon}"></i></div>
                    <div class="sys-option-text">
                        <div class="sys-option-title">${opt}</div>
                        ${desc ? `<div class="sys-option-desc">${desc}</div>` : ''}
                    </div>
                    <div class="sys-option-check"><i class="fas fa-check"></i></div>
                </div>`;
            }).join('');
        }
        
        html += `</div><input type="hidden" name="value" id="sys-param-value" value="${value}">`;
        container.innerHTML = html;
        return;
    } 

    
    // 3. HORIZON (Date with Hero Display)
    if (type === 'HORIZON') {
        const displayDate = value ? formatDateDisplay(value) : 'SELECT DATE';
        const quickSelects = (config.wizard && config.wizard.quick_selects) || [];
        
        container.innerHTML = `
            <div class="timeline-hero-wrapper">
                <div class="timeline-label-small">TARGET DATE</div>
                <div class="timeline-date-display" onclick="document.getElementById('sys-date-real').showPicker()">
                    <span id="sys-date-display">${displayDate}</span>
                    <i class="fas fa-calendar-alt timeline-icon-trigger"></i>
                </div>
                <input type="date" id="sys-date-real" class="timeline-real-input" 
                       name="value" value="${value}">
                ${quickSelects.length > 0 ? `
                <div class="chip-row">
                    ${quickSelects.map(qs => `
                        <button type="button" class="date-chip-modern" 
                                onclick="applyQuickDate('${qs}')">${qs}</button>
                    `).join('')}
                </div>` : ''}
            </div>
        `;
        
        // Bind date change
        const dateInput = document.getElementById('sys-date-real');
        if (dateInput) {
            dateInput.onchange = (e) => {
                sysState.tempValue = e.target.value;
                document.getElementById('sys-date-display').textContent = formatDateDisplay(e.target.value);
                renderVisualizer(type, e.target.value, color);
            };
        }
        
        // Bind quick date
        window.applyQuickDate = (label) => {
            const months = {'3 Months': 3, '6 Months': 6, '1 Year': 12, '2 Years': 24, '5 Years': 60, 'ASAP': 1};
            const m = months[label] || 3;
            const d = new Date();
            d.setMonth(d.getMonth() + m);
            const val = d.toISOString().split('T')[0];
            sysState.tempValue = val;
            if (dateInput) dateInput.value = val;
            document.getElementById('sys-date-display').textContent = formatDateDisplay(val);
            renderVisualizer(type, val, color);
            
            // Highlight active chip
            document.querySelectorAll('.date-chip-modern').forEach(c => c.classList.remove('active'));
            event.target.classList.add('active');
        };
        return;
    } 
    
    // 4. TAGS (Directive, Avoidance)
    if (config.ui_type === 'tags') {
        const existingTags = value ? value.split(',').map(t => t.trim()).filter(Boolean) : [];
        const placeholder = (config.wizard && config.wizard.placeholder) || 'Add a tag...';
        
        container.innerHTML = `
            <div class="tag-input-container" onclick="document.getElementById('sys-tag-field').focus()">
                ${existingTags.map(t => `
                    <span class="tag-pill">
                        ${t}
                        <i class="fas fa-times" style="cursor:pointer; opacity:0.6;" 
                           onclick="event.stopPropagation(); removeTag('${t.replace(/'/g, "\\'")}')"></i>
                    </span>
                `).join('')}
                <input type="text" id="sys-tag-field" class="tag-input-field" 
                       placeholder="${placeholder}" autocomplete="off">
            </div>
            <input type="hidden" name="value" id="sys-param-value" value="${value}">
        `;
        
        const tagField = document.getElementById('sys-tag-field');
        tagField.onkeydown = (e) => {
            if (e.key === 'Enter' && tagField.value.trim()) {
                e.preventDefault();
                const newTag = tagField.value.trim();
                const tags = sysState.tempValue ? sysState.tempValue.split(',').map(t => t.trim()) : [];
                if (!tags.includes(newTag)) {
                    tags.push(newTag);
                    sysState.tempValue = tags.join(', ');
                    renderBespokeInput(type, sysState.tempValue, color, config);
                    renderVisualizer(type, sysState.tempValue, color);
                }
            }
        };
        
        window.removeTag = (tag) => {
            const tags = sysState.tempValue.split(',').map(t => t.trim()).filter(t => t !== tag);
            sysState.tempValue = tags.join(', ');
            renderBespokeInput(type, sysState.tempValue, color, config);
            renderVisualizer(type, sysState.tempValue, color);
        };
        return;
    }
    
    // 5. DEFAULT (Text with styled underline)
    container.innerHTML = `
        <div class="mb-3">
            <label class="sys-rationale-label" style="color:${color}">ANCHOR VALUE</label>
            <input type="text" name="value" id="sys-param-value" 
                   class="form-control form-control-lg fs-4 font-body fw-bold border-0 border-bottom rounded-0 px-0 shadow-none" 
                   value="${value}" placeholder="Define value..." autocomplete="off" 
                   style="background:transparent; border-color: ${color} !important;">
        </div>
    `;

    // Bind Live Update Listener
    const mainInput = document.getElementById('sys-param-value');
    if(mainInput) {
        mainInput.oninput = (e) => {
            sysState.tempValue = e.target.value;
            renderVisualizer(type, e.target.value, color);
        };
        mainInput.onchange = (e) => {
            sysState.tempValue = e.target.value;
            renderVisualizer(type, e.target.value, color);
        };
    }
}

/**
 * Handles option pill selection (replaces dropdown)
 */
function selectSysOption(type, value) {
    sysState.tempValue = value;
    sysState.isExpanded = false; // Collapse on select
    
    // Update hidden input
    const hiddenInput = document.getElementById('sys-param-value') || document.getElementById('real-value-input');
    if (hiddenInput) hiddenInput.value = value;
    
    // Update pill visuals
    document.querySelectorAll('.sys-option-pill').forEach(p => p.classList.remove('selected'));
    event.currentTarget.classList.add('selected');
    
    // Update visualizer
    const config = sysState.config[type];
    renderVisualizer(type, value, config.color);
}

// --- Interaction Handlers ---

function setProtocolMode(mode) {
    document.querySelectorAll('.sys-protocol-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`mode-${mode.toLowerCase()}`).classList.add('active');
    
    const container = document.getElementById('sys-input-container');
    const type = document.getElementById('sys-param-type').value;

    if (mode === 'SPECULATE') {
        sysState.isSpeculating = true;
        container.innerHTML = `
            <div class="sys-viz-glass text-center" style="background: rgba(99,102,241,0.05); border-color: rgba(99,102,241,0.2);">
                <div class="spinner-grow text-primary mb-3" role="status" style="width: 3rem; height: 3rem;"></div>
                <p class="font-body small text-muted">Connecting to SSPEC Engine...</p>
                <div class="font-data x-small text-muted tracking-widest mt-2">OPTIMIZING ${type}</div>
            </div>
        `;
        
        fetch('/speculate_context', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                ce_type: type,
                context: 'system_parameter',
                ssol_id: sysState.ssolId
            })
        })
        .then(response => response.json())
        .then(data => {
            sysState.isSpeculating = false;
            setProtocolMode('SPECIFY');
            
            if (data.success && data.text) {
                const suggestion = data.text;
                sysState.tempValue = suggestion;
                
                const typeKey = sysState.nodeKeys[sysState.currentIndex];
                const config = sysState.config[typeKey];
                
                setTimeout(() => {
                    renderBespokeInput(typeKey, suggestion, config.color, config);
                    renderVisualizer(typeKey, suggestion, config.color);
                    
                    // If the suggestion matches an existing option pill, visually select it
                    const pill = Array.from(document.querySelectorAll('.sys-option-pill')).find(p => p.innerText.trim() === suggestion || suggestion.includes(p.innerText.trim()));
                    if(pill) {
                        document.querySelectorAll('.sys-option-pill').forEach(p => p.classList.remove('selected'));
                        pill.classList.add('selected');
                    }
                }, 50);
            } else {
                console.error("Speculate failed:", data.error);
            }
        })
        .catch(err => {
            console.error("Speculate request error:", err);
            sysState.isSpeculating = false;
            setProtocolMode('SPECIFY');
        });
    } else {
        if(!sysState.isSpeculating) {
            updateModalView();
        }
    }
}

function setConstraintMode(mode) {
    sysState.constraintMode = mode;
    
    // Reset all cards
    document.getElementById('constraint-hard').classList.remove('selected');
    document.getElementById('constraint-soft').classList.remove('selected');
    
    // Set selected
    document.getElementById(`constraint-${mode.toLowerCase()}`).classList.add('selected');
    document.getElementById('sys-constraint-input').value = mode;
}

function resetConstraintVisuals() {
    document.getElementById('constraint-hard').classList.remove('selected');
    document.getElementById('constraint-soft').classList.remove('selected');
    document.getElementById(`constraint-${sysState.constraintMode.toLowerCase()}`).classList.add('selected');
}

function addEntity() {
    const name = document.getElementById('ent-name').value;
    const role = document.getElementById('ent-role').value || 'Lead';
    const org = document.getElementById('ent-org').value || 'External';
    
    if(name) {
        if(!sysState.entityStore['OPERATOR']) sysState.entityStore['OPERATOR'] = [];
        sysState.entityStore['OPERATOR'].push({name, role, org, id: Date.now()});
        sysState.tempValue = sysState.entityStore['OPERATOR'].map(e => e.name).join(', ');
        
        const config = sysState.config['OPERATOR'];
        renderVisualizer('OPERATOR', sysState.tempValue, config.color);
        
        const realInput = document.getElementById('real-value-input');
        if(realInput) realInput.value = sysState.tempValue;

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

    const btn = document.querySelector('.sys-btn-commit');
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

// --- Utility ---
function formatDateDisplay(dateStr) {
    if (!dateStr) return 'SELECT DATE';
    try {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
    } catch {
        return dateStr;
    }
}