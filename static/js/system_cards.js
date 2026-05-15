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
    tempTitle: null,        // Used for GOAL node to hold the SSPEC Title
    isSpeculating: false,   // Loading state flag
    constraintMode: 'HARD', // HARD vs SOFT constraint
    isExpanded: false,      // Accordion state for option pills
    drafts: {}              // Cache of unsaved changes across tabs
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
    sysState.tempTitle = null; // Reset temp title

    // If GOAL node, pull from DOM if tempValue is empty
    if (type === 'GOAL') {
        const titleEl = document.getElementById('ssol-title');
        const goalEl = document.getElementById('ssol-goal');
        if (!sysState.tempTitle) sysState.tempTitle = titleEl ? titleEl.textContent : '';
        if (!sysState.tempValue) sysState.tempValue = goalEl ? goalEl.textContent : '';
    }

    sysState.constraintMode = 'HARD';
    sysState.isExpanded = false;

    renderCatalogueIndex();
    updateModalView();
    
    const bladeEl = document.getElementById('systemConfigModal');
    let blade = bootstrap.Offcanvas.getInstance(bladeEl);
    if (!blade) {
        blade = new bootstrap.Offcanvas(bladeEl);
    }
    blade.show();
}

/**
 * Handles Tab Selection in the Catalogue Index
 */
function navigateSystemNode(idx) {
    if (idx < 0 || idx >= sysState.nodeKeys.length) return;
    
    // Save draft for current tab before switching
    const currentKey = sysState.nodeKeys[sysState.currentIndex];
    sysState.drafts[currentKey] = {
        value: sysState.tempValue,
        title: sysState.tempTitle,
        mode: sysState.constraintMode
    };

    sysState.currentIndex = idx;
    const newKey = sysState.nodeKeys[idx];
    
    sysState.editingId = ""; 
    sysState.isExpanded = false;

    // Load draft or default to existing
    if (sysState.drafts[newKey]) {
        sysState.tempValue = sysState.drafts[newKey].value || "";
        sysState.tempTitle = sysState.drafts[newKey].title || "";
        sysState.constraintMode = sysState.drafts[newKey].mode || "HARD";
    } else {
        const existingNode = window.SYSTEM_PARAMS ? window.SYSTEM_PARAMS.find(p => p.type === newKey) : null;
        if (existingNode && existingNode.value && existingNode.value !== 'None') {
            sysState.tempValue = existingNode.value;
        } else {
            sysState.tempValue = "";
        }
        sysState.tempTitle = null;
        sysState.constraintMode = 'HARD';
    }

    // Crossfade transition
    const rightContent = document.getElementById('sys-right-content');
    
    if (rightContent) rightContent.classList.add('transitioning');
    
    renderCatalogueIndex(); // Re-render to update active state
    
    setTimeout(() => {
        updateModalView();
        if (rightContent) rightContent.classList.remove('transitioning');
    }, 300);
}

/**
 * Builds the Tabbed Card Catalogue Index
 */
function renderCatalogueIndex() {
    const listEl = document.getElementById('sys-catalogue-list');
    if (!listEl) return;
    
    let html = '';
    
    sysState.nodeKeys.forEach((key, idx) => {
        const config = sysState.config[key];
        const isActive = idx === sysState.currentIndex;
        
        // Find existing value in the system to determine "Mode"
        let isSpeculated = false; // Mock for now, update based on real data
        let existingValue = "AI Speculated";
        
        const existingNode = window.SYSTEM_PARAMS ? window.SYSTEM_PARAMS.find(p => p.type === key) : null;
        if (existingNode && existingNode.value && existingNode.value !== 'None') {
            existingValue = existingNode.value;
            isSpeculated = false; // Manually input
        } else {
            isSpeculated = true;
        }
        
        html += `
        <div class="p-3 rounded-4 cursor-pointer transition-all d-flex align-items-center gap-3 ${isActive ? 'bg-white shadow-sm' : 'hover-bg-white-10'}" 
             onclick="navigateSystemNode(${idx})"
             style="${isActive ? 'transform: translateX(10px);' : ''}">
             
            <div class="rounded-circle d-flex align-items-center justify-content-center text-white" 
                 style="width: 40px; height: 40px; background-color: ${config.color}; opacity: ${isActive ? '1' : '0.7'};">
                <i class="${config.icon}"></i>
            </div>
            
            <div class="flex-grow-1">
                <div class="font-data tracking-widest fw-bold ${isActive ? 'text-dark' : 'text-white'} mb-1" style="font-size: 0.75rem;">${config.label.toUpperCase()}</div>
                <div class="d-flex align-items-center gap-2">
                    <span class="badge ${isSpeculated ? 'bg-primary-subtle text-primary' : 'bg-success-subtle text-success'} font-data" style="font-size: 0.55rem; padding: 0.25rem 0.4rem;">
                        ${isSpeculated ? '<i class="fas fa-wand-magic-sparkles me-1"></i> AUTO' : '<i class="fas fa-check me-1"></i> MANUAL'}
                    </span>
                    <span class="font-body small text-truncate ${isActive ? 'text-secondary' : 'text-white-50'}" style="max-width: 150px;">
                        ${existingValue}
                    </span>
                </div>
            </div>
            
            <i class="fas fa-chevron-right ${isActive ? 'text-primary' : 'text-white-50 opacity-25'}"></i>
        </div>
        `;
    });
    
    listEl.innerHTML = html;
}

/**
 * CORE RENDER LOGIC — Updates both panels based on State
 */
function updateModalView() {
    const typeKey = sysState.nodeKeys[sysState.currentIndex];
    const config = sysState.config[typeKey] || {};
    
    // --- 1. Identity Panel (Left) ---
    // The left panel is now the index, so we only update the right side!
    
    // Icon badge for Editor
    document.getElementById('sys-display-icon').className = config.icon;
    document.getElementById('sys-display-label').textContent = config.label.toUpperCase() + ' CONFIGURATION';
    
    // VISUALIZER
    renderVisualizer(typeKey, sysState.tempValue, config.color);

    // --- 2. Calibration Console (Right) ---
    // Set CSS variable on the right panel for constraint cards etc.
    const rightPanel = document.querySelector('.sys-modal-right');
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

    // Toggle Constraint & Rationale Block
    const constraintBlock = document.getElementById('sys-constraint-rationale-block');
    if (constraintBlock) {
        constraintBlock.style.display = typeKey === 'GOAL' ? 'none' : 'block';
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
        
        const vectorLabel = document.getElementById('sys-state-vector-label');
        if (vectorLabel) vectorLabel.style.display = type === 'GOAL' ? 'none' : 'block';
        
        const vizWrapper = document.getElementById('sys-visualizer-wrapper');
        if (vizWrapper) {
            if (type === 'GOAL') {
                vizWrapper.classList.remove('justify-content-center');
                vizWrapper.classList.add('justify-content-start', 'mt-5');
            } else {
                vizWrapper.classList.remove('justify-content-start', 'mt-5');
                vizWrapper.classList.add('justify-content-center');
            }
        }

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

        // CASE: GOAL (Future Fulfilled — Narrative Preview)
        if (type === 'GOAL') {
            const title = sysState.tempTitle || 'System Goal';
            if (value && value.trim() !== '') {
                container.innerHTML = `
                    <div style="text-align: left; padding: 0 16px;">
                        <h3 class="font-brand text-white mb-4" style="font-size: 2.5rem; letter-spacing: 0.5px; line-height: 1.2;">${title}</h3>
                        <div class="font-body text-white custom-scrollbar-dark" style="font-size: 1.1rem; line-height: 1.8; max-height: 250px; overflow-y: auto; opacity: 0.9; border-left: 4px solid rgba(255,255,255,0.4); padding-left: 24px;">
                            ${value}
                        </div>
                    </div>`;
            } else {
                container.innerHTML = `
                    <div class="sys-viz-empty">
                        <i class="fas fa-bullseye fa-2x mb-2" style="opacity: 0.3;"></i>
                        <div class="small font-bold">DESCRIBE THE DESTINATION</div>
                        <div class="x-small text-white-50 mt-1">What does the world look like when this is done?</div>
                    </div>`;
            }
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
    
    // 5. GOAL / TEXTAREA (Future Fulfilled Workshop)
    if (config.ui_type === 'textarea' || type === 'GOAL') {
        const currentTitle = sysState.tempTitle || '';
        
        container.innerHTML = `
            <div class="mb-3">
                <label class="sys-rationale-label" style="color:${color}">SSPEC TITLE</label>
                <input type="text" name="sys_title" id="sys-title-input" 
                       class="form-control font-body fw-bold border-0 border-bottom rounded-0 px-0 shadow-none mb-4" 
                       value="${currentTitle}" placeholder="Name your system goal..." autocomplete="off" 
                       style="background:transparent; border-color: rgba(0,0,0,0.1) !important; font-size: 1.2rem; color: #1e293b;">
            </div>
            <div class="mb-3">
                <label class="sys-rationale-label text-muted">GOAL DESCRIPTION</label>
                <textarea name="value" id="sys-param-value" 
                    class="form-control font-body border rounded-4 shadow-none" 
                    rows="5" 
                    placeholder="Describe in detail: If everything goes exactly according to plan, what are we looking at? What has been built, changed, or created? Be as specific as you want — the more detail you provide, the smarter the system becomes."
                    style="background: #f8fafc; border-color: rgba(0,0,0,0.08) !important; resize: vertical; font-size: 0.9rem; line-height: 1.6;">${value || ''}</textarea>
            </div>
            <div class="d-flex gap-2">
                <button type="button" class="btn btn-sm font-data rounded-pill px-3 py-1 flex-grow-1 transition-all hover-scale" 
                    style="background: rgba(99,102,241,0.08); color: #6366f1; border: 1px solid rgba(99,102,241,0.15); font-size: 0.7rem; letter-spacing: 0.5px;"
                    onclick="speculateFutureFulfilled()">
                    <i class="fas fa-wand-magic-sparkles me-1"></i> AI: ENVISION THE FUTURE
                </button>
            </div>
        `;

        // Bind live update for Title
        const titleInput = document.getElementById('sys-title-input');
        if (titleInput) {
            titleInput.oninput = (e) => {
                sysState.tempTitle = e.target.value;
                renderVisualizer(type, sysState.tempValue, color);
                
                // Live update background UI
                const uiTitle = document.getElementById('ui-ssol-title');
                if (uiTitle) uiTitle.innerText = e.target.value;
            };
        }

        // Bind live update for Description
        const ta = document.getElementById('sys-param-value');
        if (ta) {
            ta.oninput = (e) => {
                sysState.tempValue = e.target.value;
                renderVisualizer(type, e.target.value, color);
                
                // Live update background UI
                const uiGoal = document.getElementById('ui-ssol-goal');
                if (uiGoal) uiGoal.innerText = '"' + e.target.value + '"';
            };
        }

        // Speculate function for FF
        window.speculateFutureFulfilled = () => {
            const ta = document.getElementById('sys-param-value');
            const titleInput = document.getElementById('sys-title-input');
            const goalText = titleInput ? titleInput.value : '';
            const currentVal = ta?.value || '';

            ta.disabled = true;
            const originalPlaceholder = ta.placeholder;
            ta.placeholder = 'The SSPEC Engine is envisioning your future...';
            ta.value = '';
            ta.style.background = 'rgba(99,102,241,0.03)';

            fetch('/speculate_context', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    ce_type: 'GOAL',
                    context: 'future_fulfilled',
                    ssol_id: sysState.ssolId,
                    current_value: currentVal,
                    goal_text: goalText
                })
            })
            .then(r => r.json())
            .then(data => {
                ta.disabled = false;
                ta.style.background = '#f8fafc';
                ta.placeholder = originalPlaceholder;
                if (data.success && data.text) {
                    ta.value = data.text;
                    sysState.tempValue = data.text;
                    renderVisualizer(type, data.text, color);
                    
                    // Live update background UI
                    const uiGoal = document.getElementById('ui-ssol-goal');
                    if (uiGoal) uiGoal.innerText = '"' + data.text + '"';
                } else if (data.compliance_violation) {
                    // Safety violation — show guidance
                    ta.value = currentVal;
                    ta.style.background = 'rgba(239,83,80,0.03)';
                    ta.style.borderColor = 'rgba(239,83,80,0.3)';
                    
                    // Show violation notice below textarea
                    const notice = document.createElement('div');
                    notice.id = 'ff-compliance-notice';
                    notice.className = 'mt-3 p-3 rounded-4 border';
                    notice.style.cssText = 'background: rgba(239,83,80,0.05); border-color: rgba(239,83,80,0.2) !important;';
                    notice.innerHTML = `
                        <div class="d-flex align-items-start gap-3">
                            <div class="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style="width:32px;height:32px;background:rgba(239,83,80,0.1);">
                                <i class="fas fa-shield-halved" style="color:#ef5350;font-size:0.8rem;"></i>
                            </div>
                            <div>
                                <div class="font-data x-small fw-bold tracking-widest mb-1" style="color:#ef5350;">SAFETY PROTOCOL</div>
                                <div class="font-body small text-dark mb-2">${data.reason}</div>
                                <div class="font-body small text-muted mb-3">${data.suggestion}</div>
                                <div class="d-flex gap-2">
                                    <button type="button" class="btn btn-sm font-data rounded-pill px-3 py-1 transition-all hover-scale" 
                                        style="background:rgba(99,102,241,0.08);color:#6366f1;border:1px solid rgba(99,102,241,0.15);font-size:0.65rem;letter-spacing:0.5px;"
                                        onclick="document.getElementById('sys-param-value').value='';document.getElementById('ff-compliance-notice').remove();speculateFutureFulfilled();">
                                        <i class="fas fa-wand-magic-sparkles me-1"></i> LET THE SYSTEM HELP
                                    </button>
                                    <button type="button" class="btn btn-sm font-data rounded-pill px-3 py-1 transition-all" 
                                        style="background:rgba(0,0,0,0.03);color:#64748b;font-size:0.65rem;letter-spacing:0.5px;"
                                        onclick="document.getElementById('ff-compliance-notice').remove();document.getElementById('sys-param-value').style.background='#f8fafc';document.getElementById('sys-param-value').style.borderColor='rgba(0,0,0,0.08)';">
                                        <i class="fas fa-pen me-1"></i> REFRAME MANUALLY
                                    </button>
                                </div>
                            </div>
                        </div>`;
                    
                    // Remove any existing notice first
                    const existing = document.getElementById('ff-compliance-notice');
                    if (existing) existing.remove();
                    ta.parentElement.after(notice);
                    
                    // Update visualizer to show violation state
                    const vizContainer = document.getElementById('sys-visualizer-container');
                    vizContainer.innerHTML = `
                        <div class="sys-viz-empty" style="border-color: rgba(239,83,80,0.3);">
                            <i class="fas fa-shield-halved fa-2x mb-2" style="opacity:0.4; color:#ffcdd2;"></i>
                            <div class="small font-bold" style="color:#ffcdd2;">CONTENT FLAGGED</div>
                            <div class="x-small text-white-50 mt-1">Please reframe your vision</div>
                        </div>`;
                } else {
                    ta.value = currentVal;
                    ta.placeholder = 'Speculation failed — please describe manually.';
                }
            })
            .catch(() => {
                ta.disabled = false;
                ta.style.background = '#f8fafc';
                ta.value = currentVal;
                ta.placeholder = originalPlaceholder;
            });
        };
        return;
    }

    // 6. DEFAULT (Text with styled underline)
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
    
    const toggle = document.getElementById('auto-recalibrate-toggle');
    const isAuto = toggle ? toggle.checked : false;

    // --- GOAL SAFETY GATE ---
    // For GOAL (Future Fulfilled), run a compliance check before committing
    if (data.sys_type === 'GOAL' && data.value && data.value.trim().length > 0) {
        btn.innerHTML = '<i class="fas fa-shield-halved fa-spin me-2"></i> SAFETY CHECK...';
        btn.disabled = true;
        
        fetch('/speculate_context', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                ce_type: 'GOAL',
                context: 'future_fulfilled',
                ssol_id: sysState.ssolId,
                current_value: data.value,
                goal_text: document.getElementById('ssol-goal')?.textContent || ''
            })
        })
        .then(r => r.json())
        .then(response => {
            if (response.compliance_violation) {
                // Block the commit — show violation in the impact report area
                const reportBox = document.getElementById('sys-impact-report-container');
                reportBox.classList.remove('d-none');
                reportBox.innerHTML = `
                    <div class="p-3 border-start border-3 rounded-4 shadow-sm mt-3" style="background: rgba(239,83,80,0.05); border-color: #ef5350 !important;">
                        <div class="d-flex align-items-start gap-3">
                            <i class="fas fa-shield-halved mt-1" style="color: #ef5350;"></i>
                            <div>
                                <div class="font-data x-small fw-bold tracking-widest mb-1" style="color:#ef5350;">SAFETY PROTOCOL — COMMIT BLOCKED</div>
                                <p class="font-body small text-dark mb-2">${response.reason}</p>
                                <p class="font-body small text-muted mb-0">${response.suggestion}</p>
                            </div>
                        </div>
                    </div>`;
                btn.innerHTML = originalText;
                btn.disabled = false;
            } else {
                // Compliance passed — proceed with normal flow
                btn.innerHTML = originalText;
                btn.disabled = false;
                proceedWithCommit(data, btn, originalText, isAuto);
            }
        })
        .catch(() => {
            // Network error — proceed cautiously
            btn.innerHTML = originalText;
            btn.disabled = false;
            proceedWithCommit(data, btn, originalText, isAuto);
        });
        return;
    }

    // Non-GOAL types: proceed directly
    proceedWithCommit(data, btn, originalText, isAuto);
}

function proceedWithCommit(data, btn, originalText, isAuto) {
    if (!isAuto) {
        // Manual Mode: Speculate Impact First
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin me-2"></i> ANALYZING IMPACT...';
        btn.disabled = true;

        fetch('/speculate_impact_report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(r => r.json())
        .then(response => {
            if (response.success && response.impact_report) {
                const reportBox = document.getElementById('sys-impact-report-container');
                reportBox.classList.remove('d-none');
                
                reportBox.innerHTML = `
                    <div class="p-3 border-start border-3 border-warning rounded-3 shadow-sm mt-3" style="background: rgba(245, 158, 11, 0.05); border-color: #f59e0b !important;">
                        <div class="d-flex align-items-start gap-3">
                            <i class="fas fa-exclamation-triangle text-warning mt-1"></i>
                            <div>
                                <div class="font-data x-small fw-bold text-warning tracking-widest mb-1">IMPACT REPORT</div>
                                <p class="font-body small text-dark mb-3">${response.impact_report.message}</p>
                                <div class="d-flex gap-2">
                                    <button type="button" class="btn btn-sm btn-warning font-data x-small py-1 px-3 rounded-pill text-white shadow-sm" id="btn-force-commit">APPROVE & APPLY</button>
                                    <button type="button" class="btn btn-sm btn-outline-secondary font-data x-small py-1 px-3 rounded-pill" onclick="document.getElementById('sys-impact-report-container').classList.add('d-none');">REJECT</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                document.getElementById('btn-force-commit').onclick = () => {
                    executeCommit(data, btn, originalText, isAuto);
                };
                
                btn.innerHTML = originalText;
                btn.disabled = false;
            } else {
                alert("Error generating report");
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }).catch(err => {
            alert("Network Error");
            btn.innerHTML = originalText;
            btn.disabled = false;
        });
    } else {
        // Auto Mode
        executeCommit(data, btn, originalText, isAuto);
    }
}

function executeCommit(data, btn, originalText, isAuto) {
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
            
            // 1. Update Sidebar Pill
            const pillValEl = document.querySelector(`#sys-pill-${data.sys_type} .pill-value`);
            if (pillValEl) {
                pillValEl.innerText = data.value.charAt(0).toUpperCase() + data.value.slice(1);
                
                // Add a pulse animation
                const pillEl = document.getElementById(`sys-pill-${data.sys_type}`);
                pillEl.style.transition = 'all 0.3s ease';
                pillEl.style.transform = 'scale(1.05)';
                pillEl.style.boxShadow = '0 0 15px rgba(255,255,255,0.3)';
                setTimeout(() => {
                    pillEl.style.transform = '';
                    pillEl.style.boxShadow = '';
                }, 400);
            }
            
            // 2. Update inline highlight
            const charterCard = document.getElementById('executive-charter-card');
            if (charterCard) {
                const highlights = document.querySelectorAll(`.sys-highlight[data-type="${data.sys_type}"] .sys-highlight-text`);
                highlights.forEach(el => {
                    el.innerText = data.value;
                    const wrapper = el.closest('.sys-highlight');
                    if (wrapper) {
                        wrapper.style.transition = 'all 0.3s ease';
                        wrapper.style.transform = 'scale(1.1)';
                        setTimeout(() => wrapper.style.transform = '', 400);
                    }
                });
            }
            
            // 2.5 Update Hero Identity Block if GOAL
            if (data.sys_type === 'GOAL') {
                const uiTitle = document.getElementById('ui-ssol-title');
                const uiGoal = document.getElementById('ui-ssol-goal');
                const rawTitle = document.getElementById('ssol-title');
                const rawGoal = document.getElementById('ssol-goal');
                
                if (data.sys_title) {
                    if (uiTitle) uiTitle.innerText = data.sys_title;
                    if (rawTitle) rawTitle.innerText = data.sys_title;
                }
                if (data.value) {
                    if (uiGoal) uiGoal.innerText = `"${data.value}"`;
                    if (rawGoal) rawGoal.innerText = data.value;
                }
            }
            
            // 3. Trigger background recalibration if auto
            if (isAuto && window.recalibrateCharter) {
                window.recalibrateCharter();
            } else if (!isAuto && window.recalibrateCharter) {
                // We do it anyway because they just approved it!
                window.recalibrateCharter();
            }

            // Reset button
            btn.innerHTML = originalText;
            btn.disabled = false;
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