// static/js/ce_cards.js
// SSPEC "Horizon Fusion" - Condition Element Application Controller (v2025.40)

import { showLoadingSpinner, hideLoadingSpinner } from './base_functions.js';

// =============================================================================
// 1. CENTRAL STATE MANAGEMENT
// =============================================================================

const DEFAULT_STATE = {
    modalElement: null,
    ceId: null,
    ceType: null,
    activeTab: 'overview',
    collections: {
        prerequisites: [],
        stakeholders: [],
        assumptions: [],
        resources: [],
        connections: []
    },
    details_data: {},
    nodeSchema: {},
    isSaving: false,
    isScanning: false
};

let state = { ...DEFAULT_STATE };

// =============================================================================
// 2. PERSONA MATRIX & CONFIG
// =============================================================================

const PERSONAS = {
    "Research": { title: "DEEP TRUTH ENGINE", icon: "fa-flask", class: "persona-research", tone: "Empirical" },
    "Risk": { title: "SECURITY OVERWATCH", icon: "fa-shield-virus", class: "persona-risk", tone: "Critical" },
    "Stakeholder": { title: "NETWORK DIPLOMAT", icon: "fa-handshake", class: "persona-stakeholder", tone: "Strategic" },
    "Advocacy": { title: "AMPLIFIER", icon: "fa-bullhorn", class: "persona-advocacy", tone: "Persuasive" },
    "Environment": { title: "SYSTEM ECOLOGIST", icon: "fa-leaf", class: "persona-research", tone: "Holistic" },
    "Timeline": { title: "TEMPORAL ARCHITECT", icon: "fa-stopwatch", class: "persona-default", tone: "Linear" },
    "Default": { title: "SPECULATE CO-PILOT", icon: "fa-brain", class: "persona-default", tone: "Helpful" }
};

// =============================================================================
// 3. INITIALIZATION & LIFECYCLE
// =============================================================================

export function displayCEModal(modalHtml, ceId, p_ceType, ceData) {
    const modalContainer = document.getElementById('dynamicModalContainer');
    if (!modalContainer) return console.error("Critical: Modal container missing.");
    
    modalContainer.innerHTML = modalHtml;
    const modalElement = document.getElementById(`ceModal-${ceId}`);
    if (!modalElement) return console.error("Critical: Modal DOM insertion failed.");

    const modal = new bootstrap.Modal(modalElement);

    modalElement.addEventListener('shown.bs.modal', () => {
        // 1. Resolve Schema
        const nodeConfig = (window.NODES && window.NODES[p_ceType]) ? window.NODES[p_ceType] : (window.NODES['Default']);

        // 2. Hydrate State (Resetting cleanly)
        const d = ceData?.data || {};
        state = {
            modalElement, 
            ceId, 
            ceType: p_ceType, 
            activeTab: 'overview',
            collections: {
                prerequisites: d.prerequisites || [],
                stakeholders: d.stakeholders || [],
                assumptions: d.assumptions || [],
                resources: d.resources || [],
                connections: d.connections || []
            },
            details_data: d.details_data || {},
            nodeSchema: nodeConfig,
            isSaving: false,
            isScanning: false
        };
        
        // 3. Boot System
        render(); 
        setupEventListeners();
        
        // 4. "One-Hit Production" Check
        // If the node is empty, wake up the engine.
        checkAndTriggerAutoPopulation();

    }, { once: true });

    modalElement.addEventListener('hidden.bs.modal', () => {
        state = { ...DEFAULT_STATE }; // GC helper
        modalElement.remove();
    });

    modal.show();
}

// =============================================================================
// 4. AUTOMATION LOGIC ("ONE-HIT PRODUCTION")
// =============================================================================

function checkAndTriggerAutoPopulation() {
    // Logic: If critical collections are empty, we assume it's a fresh node.
    const isFresh = ['prerequisites', 'stakeholders', 'assumptions'].every(k => state.collections[k].length === 0);
    
    // Also check if summary is empty
    const hasSummary = state.details_data.summary && state.details_data.summary.length > 5;

    if (isFresh && !hasSummary) {
        console.log("System Scan Initiated: Fresh Node Detected");
        state.isScanning = true;
        updateDashboard(); // Updates the visual "Scanning" state

        // Staggered Execution (Waterfall Effect)
        // 1. Narrative (Immediate)
        triggerEnhancement('summary', null, true); 
        
        // 2. Collections (Staggered 1.5s intervals)
        setTimeout(() => triggerSpeculation('prerequisites', null, true), 1200);
        setTimeout(() => triggerSpeculation('stakeholders', null, true), 2800);
        setTimeout(() => triggerSpeculation('assumptions', null, true), 4200);
        
        // End Scan visual state after last item
        setTimeout(() => {
            state.isScanning = false;
            updateDashboard();
        }, 5000);
    }
}

// =============================================================================
// 5. RENDER PIPELINE
// =============================================================================

function render() {
    if (!state.modalElement) return;
    
    // Batch rendering
    renderAllCollections();
    renderOverviewStream();
    renderSidebarPersona();
    renderAiSidebarContent();
    updateDashboard();
}

function renderAllCollections() {
    ['prerequisites', 'stakeholders', 'assumptions', 'resources'].forEach(type => {
        renderCollectionList(type);
    });
}

function renderOverviewStream() {
    const container = state.modalElement.querySelector('#overview-logic-stream');
    if(!container) return;

    let signals = [];
    
    // Extract Critical Signals (Top items)
    (state.collections.prerequisites || []).slice(0, 3).forEach(i => 
        signals.push({ type: 'PREREQ', text: i.title, icon: 'fa-check-square', color: 'text-primary' })
    );
    (state.collections.assumptions || []).slice(0, 2).forEach(i => 
        signals.push({ type: 'RISK', text: i.hypothesis, icon: 'fa-exclamation-circle', color: 'text-danger' })
    );

    if (signals.length === 0) {
        container.innerHTML = `<div class="text-center p-4 opacity-50"><i class="fas fa-wind mb-2"></i><div class="font-data small">No Signals</div></div>`;
        return;
    }

    container.innerHTML = `<ul class="list-group list-group-flush">` + signals.map(s => `
        <li class="list-group-item px-3 py-2 border-0 border-bottom signal-item type-${s.type} bg-transparent">
            <div class="d-flex align-items-center">
                <i class="fas ${s.icon} ${s.color} me-3"></i>
                <div class="text-truncate font-body small fw-bold text-dark">${s.text || 'Untitled'}</div>
            </div>
        </li>
    `).join('') + `</ul>`;
}

function renderCollectionList(type) {
    const container = state.modalElement.querySelector(`#container-${type}-${state.ceId}`);
    if (!container) return;

    const items = state.collections[type] || [];

    // --- Empty State ---
    if (items.length === 0) {
        let icon = "fa-wind";
        let text = "Auto-Generate";
        let btnIcon = "fa-magic";
        
        // Context-aware empty states
        if (type === 'stakeholders' || type === 'resources') { 
            text = "Query SSPEC Network"; 
            btnIcon = "fa-globe";
        } else {
            text = "Run Speculate Engine";
            btnIcon = "fa-microchip";
        }
        
        container.innerHTML = `
            <div class="text-center p-5 opacity-50 border border-dashed rounded bg-light mt-3">
                <i class="fas ${icon} fa-2x mb-3 text-muted"></i>
                <p class="font-data small text-muted mb-3">DATA STREAM EMPTY</p>
                <button class="btn btn-sm btn-outline-primary font-data rounded-pill px-4 btn-speculate-collection" data-collection="${type}">
                    <i class="fas ${btnIcon} me-2"></i> ${text}
                </button>
            </div>`;
        return;
    }

    // --- Dynamic Schema Mapping ---
    const schemaKey = type.slice(0, -1) + '_schema';
    const fields = state.nodeSchema[schemaKey] || [];
    const titleKey = fields[0]?.key || 'title';
    const subKey = fields[1]?.key || 'status';

    // --- Render Cards ---
    container.innerHTML = items.map(item => {
        const title = item[titleKey] || 'Untitled';
        const subtitle = item[subKey] || 'Pending';
        
        // POSSIBILITY LOGIC:
        // Items tagged "AI" are "Possibilities" (Dashed, Ethereal)
        // Items accepted are "Reality" (Solid)
        const isProposed = item.tags && item.tags.includes("AI");

        const extraClass = isProposed ? "possibility-card border-dashed" : "border-start border-4";
        
        // Visual Color Coding for Reality
        let stripStyle = "";
        if (!isProposed) {
            let color = "var(--phase-color)"; // Default
            if (['Verified','Signed','Met','Complete'].includes(item.status)) color = "#10b981"; // Green
            else if (['Blocked','High'].includes(item.status)) color = "#ef4444"; // Red
            stripStyle = `border-left-color: ${color} !important;`;
        }

        return `
        <div class="collection-card-modern ${extraClass}" style="${stripStyle} transition: all 0.2s;">
            <div class="flex-grow-1 ps-2">
                <div class="d-flex align-items-center gap-2">
                    <div class="card-title-modern">${title}</div>
                    ${isProposed ? '<span class="badge bg-primary-soft text-primary font-data" style="font-size:0.6em">POSSIBILITY</span>' : ''}
                </div>
                <div class="card-subtitle-modern text-truncate">${subtitle}</div>
            </div>
            <div class="d-flex align-items-center gap-1">
                ${isProposed 
                    ? `<button class="btn btn-sm btn-outline-success btn-accept p-1 px-2 shadow-sm" data-col="${type}" data-id="${item.id}" title="Accept Possibility"><i class="fas fa-check"></i></button>`
                    : `<button class="btn btn-sm btn-link text-muted p-1 btn-edit-item" data-collection="${type}" data-id="${item.id}"><i class="fas fa-pencil-alt"></i></button>`
                }
                <button class="btn btn-sm btn-link text-danger p-1 btn-delete-item" data-collection="${type}" data-id="${item.id}"><i class="fas fa-times"></i></button>
            </div>
        </div>`;
    }).join('');
}

// =============================================================================
// 6. DASHBOARD & SIDEBAR METRICS
// =============================================================================

function updateDashboard() {
    // 1. Update Collection Badges
    ['prerequisites', 'stakeholders', 'assumptions', 'resources'].forEach(k => {
        const count = (state.collections[k] || []).length;
        const badge = state.modalElement.querySelector(`.count-badge[data-collection="${k}"]`);
        if (badge) {
            badge.textContent = count;
            if(count > 0) {
                badge.classList.remove('bg-light', 'text-dark');
                badge.classList.add('bg-primary', 'text-white');
            }
        }
    });

    // 2. Calculate Confidence Score (Heuristic)
    let score = 0;
    const totalGoal = 60; 
    
    // Points for existing
    Object.values(state.collections).flat().forEach(i => {
        if (i.tags !== "AI") score += 5; // Real items count more
        if (['Verified', 'Met', 'Signed', 'Active'].includes(i.status)) score += 5;
    });
    // Points for narrative
    if (state.details_data.summary && state.details_data.summary.length > 20) score += 10;

    const percent = Math.min(100, Math.floor((score / totalGoal) * 100));
    
    // 3. Update Visual Displays
    const bar = state.modalElement.querySelector('#ce-progress-bar'); // If existing in template
    const scoreDisplay = state.modalElement.querySelector('#confidence-score-display');
    
    if(scoreDisplay) scoreDisplay.innerText = `${percent}%`;

    // 4. Update Status Card (Handling Scanning State)
    const statusCard = state.modalElement.querySelector('.system-status-card'); // Optional UI hook
    const statusVal = state.modalElement.querySelector('.status-card-value');
    
    if (statusCard && statusVal) {
        if (state.isScanning) {
            statusVal.innerText = "SCANNING...";
            statusVal.className = "status-card-value text-primary animate-pulse";
            statusCard.classList.add('scanning');
        } else {
            statusCard.classList.remove('scanning');
            statusVal.className = "status-card-value"; // Reset classes
            
            if (percent === 0) statusVal.innerText = "INITIALIZED";
            else if (percent < 30) { statusVal.innerText = "ANALYZING"; statusVal.classList.add('text-warning'); }
            else if (percent < 80) { statusVal.innerText = "CALIBRATING"; statusVal.classList.add('text-info'); }
            else { statusVal.innerText = "OPTIMIZED"; statusVal.classList.add('text-success'); }
        }
    }
}

function renderSidebarPersona() {
    const header = state.modalElement.querySelector('#ai-sidebar-header');
    if(!header) return;
    
    const persona = PERSONAS[state.ceType] || PERSONAS['Default'];
    header.className = 'sidebar-persona-header ' + (persona.class || 'persona-default');
    header.innerHTML = `
        <div class="d-flex align-items-center justify-content-between">
            <div class="d-flex align-items-center gap-2">
                <i class="fas ${persona.icon} fa-lg"></i>
                <span class="font-brand" style="letter-spacing:1px;">${persona.title}</span>
            </div>
            ${state.isScanning ? '<i class="fas fa-circle-notch fa-spin text-white"></i>' : '<i class="fas fa-circle text-white fa-xs opacity-75"></i>'}
        </div>
        <div class="small opacity-75 mt-1 font-data" style="letter-spacing:0.5px;">MODE: ${persona.tone.toUpperCase()}</div>
    `;
}

function renderAiSidebarContent() {
    const content = state.modalElement.querySelector('#ai-sidebar-content');
    if(!content) return;
    const tab = state.activeTab;
    
    // Helper for buttons
    const mkBtn = (txt, icon, color, action, isNetwork = false) => 
        `<button class="btn btn-light border w-100 text-start mb-2 shadow-sm ${action}">
            <i class="fas ${icon} me-2 text-${color}"></i> 
            ${txt}
            ${isNetwork ? '<span class="float-end badge bg-light text-muted border font-data" style="font-size:0.6em">NET</span>' : '<span class="float-end badge bg-light text-muted border font-data" style="font-size:0.6em">AI</span>'}
         </button>`;

    // --- LOGIC: SPLIT BRANDING ---
    let header = "";
    
    if (['stakeholders', 'resources'].includes(tab)) {
        // --- SSPEC NETWORK MODE ---
        header = `
            <div class="mb-3 pb-2 border-bottom">
                <div class="font-data text-primary small fw-bold tracking-widest"><i class="fas fa-globe me-2"></i>SSPEC NETWORK</div>
                <div class="font-body x-small text-muted">Searching distributed ledger for partners.</div>
            </div>`;
            
        const label = tab.charAt(0).toUpperCase() + tab.slice(1, -1);
        
        // Network Actions
        header += mkBtn(`Query ${label} Pool`, "search-location", "primary", `btn-speculate-collection" data-collection="${tab}`, true);
        header += mkBtn("Match Capabilities", "link", "info", "", true);
        
    } else {
        // --- SPECULATE ENGINE MODE ---
        header = `
            <div class="mb-3 pb-2 border-bottom">
                <div class="font-data text-danger small fw-bold tracking-widest"><i class="fas fa-microchip me-2"></i>SPECULATE ENGINE</div>
                <div class="font-body x-small text-muted">Generative model active (v2025.23).</div>
            </div>`;

        if (tab === 'overview') {
            header += mkBtn("Strategic Synthesis", "chess-board", "danger", "btn-trigger-ai' data-context='narrative' data-sub='context");
            header += mkBtn("Analyze Critical Path", "project-diagram", "warning", "btn-trigger-ai' data-context='assumptions");
        } else {
            // Prereqs, Assumptions, etc.
            const label = tab.charAt(0).toUpperCase() + tab.slice(1, -1);
            header += mkBtn(`Speculate ${label}s`, "bolt", "danger", `btn-speculate-collection" data-collection="${tab}`);
            header += mkBtn("Validate Logic", "check-double", "success", "");
        }
    }
    
    // Footer Logic (Direct Uplink)
    content.innerHTML = header + `
        <div class="mt-auto pt-4 border-top">
            <label class="font-data small text-muted mb-2">
                ${['stakeholders', 'resources'].includes(tab) ? 'NETWORK UPLINK' : 'ENGINE PROMPT'}
            </label>
            <input type="text" class="form-control form-control-sm font-body" 
                   placeholder="${['stakeholders', 'resources'].includes(tab) ? 'Search Entity Database...' : 'Input Parameter...'}">
        </div>`;
}

// =============================================================================
// 7. SERVER ACTIONS (API INTERACTION)
// =============================================================================

function triggerSpeculation(type, btn = null, isAuto = false) {
    let origHtml = '';
    
    // 1. Differentiate UI
    const isNetwork = ['stakeholders', 'resources'].includes(type);
    const loadingText = isNetwork ? 'SCANNING NETWORK...' : 'CALCULATING...';
    const loadingIcon = isNetwork ? 'fa-satellite-dish' : 'fa-circle-notch';

    if (btn) { 
        origHtml = btn.innerHTML; 
        btn.disabled = true; 
        btn.innerHTML = `<i class="fas ${loadingIcon} fa-spin me-2"></i> ${loadingText}`; 
    } 

    // 2. Scrape Context
    const contextGoalEl = state.modalElement.querySelector('.source-cos-card p');
    const contextGoal = contextGoalEl ? contextGoalEl.textContent.trim() : "Project Goal";

    // 3. Execute
    fetch('/speculate_context', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ 
            ce_type: state.ceType, 
            context: type, 
            cos_text: contextGoal,
            ssol_id: window.SSOL_ID || null 
        })
    })
    .then(r => {
        if (!r.ok) throw new Error(`HTTP Error ${r.status}`);
        return r.json();
    })
    .then(data => {
        if (data.success && data.suggestions) {
            data.suggestions.forEach(item => {
                // Generate Client-Side ID to prevent key collisions
                item.id = self.crypto.randomUUID();
                item.tags = "AI"; 
                item.status = "Proposed";
                state.collections[type].push(item);
            });
            render(); 
        } else {
            throw new Error(data.error || "No suggestions returned.");
        }
    })
    .catch(err => {
        console.error("Speculation Error:", err);
        if (btn) {
            btn.classList.add('btn-danger', 'text-white');
            btn.innerHTML = `<i class="fas fa-exclamation-triangle me-2"></i> FAILED`;
            setTimeout(() => {
                btn.classList.remove('btn-danger', 'text-white');
                btn.innerHTML = origHtml;
                btn.disabled = false;
            }, 3000);
        }
    })
    .finally(() => {
        // Restore button if no error occurred handled in catch
        if (btn && !btn.innerHTML.includes("FAILED")) { 
            btn.innerHTML = origHtml; 
            btn.disabled = false; 
        }
        updateDashboard();
    });
}

function triggerEnhancement(fieldKey, btn = null, isAuto = false) {
    if (btn) { 
        btn.disabled = true; 
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> RUNNING ENGINE...'; 
    }

    const cosTextEl = state.modalElement.querySelector('.source-cos-card p');
    const cosText = cosTextEl ? cosTextEl.textContent.trim() : "Project Goal";

    fetch('/speculate_context', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ 
            ce_type: state.ceType, 
            context: 'narrative', 
            sub_context: fieldKey, 
            cos_text: cosText,
            ssol_id: window.SSOL_ID || null
        })
    })
    .then(r => r.json())
    .then(data => {
        if(data.success && data.text) {
            state.details_data[fieldKey] = data.text;
            
            // DOM Update (to avoid full re-render flickering)
            const input = state.modalElement.querySelector(`[name="${fieldKey}"]`);
            if(input) {
                input.value = data.text;
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
            updateDashboard();
        }
    })
    .catch(err => {
        console.error("Narrative Error:", err);
        if(btn && !isAuto) alert("Speculation failed. Please try again.");
    })
    .finally(() => { 
        if (btn) { 
            btn.disabled = false; 
            btn.innerHTML = '<i class="fas fa-microchip me-2"></i> SPECULATE ENGINE'; 
        } 
    });
}

function saveDataPacket() {
    const btn = state.modalElement.querySelector('.btn-save-changes');
    const status = state.modalElement.querySelector('#save-status');
    const origText = btn.innerHTML; 
    
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> COMMITTING...';
    btn.disabled = true;

    // 1. Capture Narrative Data (since it might be edited without hitting 'save' locally)
    const narrForm = state.modalElement.querySelector(`#narrative-form-${state.ceId}`);
    if (narrForm) {
        const fd = new FormData(narrForm);
        state.details_data = Object.fromEntries(fd.entries());
    }

    const packet = {
        details_data: state.details_data,
        prerequisites: state.collections.prerequisites,
        stakeholders: state.collections.stakeholders,
        assumptions: state.collections.assumptions,
        resources: state.collections.resources,
        connections: state.collections.connections
    };

    // 2. Network Request with Error Boundary
    fetch(`/update_ce/${state.ceId}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(packet)
    })
    .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
    })
    .then(data => {
        if(data.success) {
            // Success Feedback
            if(status) status.innerHTML = `<span class="text-success font-data fw-bold"><i class="fas fa-check-circle me-2"></i>SYNC COMPLETE</span>`;
            
            btn.classList.replace('btn-primary', 'btn-success');
            btn.innerHTML = `<i class="fas fa-check"></i> SAVED`;
            
            setTimeout(() => { 
                btn.classList.replace('btn-success', 'btn-primary');
                btn.innerHTML = origText;
                btn.disabled = false;
            }, 2000);
        } else {
            throw new Error(data.error || "Server rejected save.");
        }
    })
    .catch(err => {
        console.error("Save Failed:", err);
        
        // Error Feedback
        if(status) status.innerHTML = `<span class="text-danger font-data fw-bold"><i class="fas fa-exclamation-triangle me-2"></i>SAVE FAILED</span>`;
        
        btn.classList.replace('btn-primary', 'btn-danger');
        btn.innerHTML = `<i class="fas fa-redo me-2"></i> RETRY SAVE`;
        
        // Don't auto-reset the button immediately; let user see the error
        btn.disabled = false;
        
        // Clean up visual state after 4 seconds
        setTimeout(() => {
             if (btn.classList.contains('btn-danger')) {
                 btn.classList.replace('btn-danger', 'btn-primary');
                 btn.innerHTML = origText;
             }
        }, 4000);
    });
}

// =============================================================================
// 8. EVENT LISTENER DELEGATION
// =============================================================================

function setupEventListeners() {
    const m = state.modalElement;

    // A. Tabs -> Context Switching
    const nav = m.querySelector('.ce-nav-tabs');
    if(nav) {
        nav.addEventListener('shown.bs.tab', e => {
            const tid = e.target.getAttribute('data-bs-target');
            if(tid.includes('overview')) state.activeTab = 'overview';
            else if(tid.includes('narrative')) state.activeTab = 'narrative';
            else {
                // Extract collection name from ID (e.g., view-stakeholders-123)
                const parts = tid.split('-'); 
                // Careful parsing
                if(parts.length >= 2) state.activeTab = parts[1];
            }
            renderAiSidebarContent();
        });
    }

    // B. Central Click Delegation
    m.addEventListener('click', e => {
        const t = e.target;

        // 1. AI Triggers
        const specBtn = t.closest('.btn-speculate-collection');
        if(specBtn) triggerSpeculation(specBtn.dataset.collection, specBtn);
        
        const enhBtn = t.closest('.btn-enhance-field');
        if(enhBtn) triggerEnhancement(enhBtn.dataset.field, enhBtn);
        
        const aiBtn = t.closest('.btn-trigger-ai');
        if(aiBtn) triggerSpeculation(aiBtn.dataset.context, aiBtn);

        // 2. Editor Controls
        const addBtn = t.closest('.btn-add-item');
        if(addBtn) toggleEditor(addBtn.dataset.collection, true);
        
        const editBtn = t.closest('.btn-edit-item');
        if(editBtn) {
            const col = editBtn.dataset.collection;
            const item = state.collections[col].find(i => i.id === editBtn.dataset.id);
            if(item) toggleEditor(col, true, item);
        }

        const cancelBtn = t.closest('.btn-cancel-edit');
        if(cancelBtn) {
            const type = cancelBtn.closest('form').dataset.collection;
            toggleEditor(type, false);
        }

        // 3. Item Lifecycle Actions
        const accBtn = t.closest('.btn-accept');
        if(accBtn) {
            const col = accBtn.dataset.col;
            const item = state.collections[col].find(i => i.id === accBtn.dataset.id);
            if(item) { 
                item.tags = ""; // Remove AI tag
                item.status = "Active"; // Convert to Reality
                render(); 
                // Implicit save could happen here, or wait for manual save
            }
        }
        
        const delBtn = t.closest('.btn-delete-item');
        if(delBtn && confirm("Permanently remove this element?")) {
            const col = delBtn.dataset.col;
            state.collections[col] = state.collections[col].filter(i => i.id !== delBtn.dataset.id);
            render();
        }

        // 4. Save
        if(t.closest('.btn-save-changes')) saveDataPacket();
    });

    // C. Editor Form Submissions
    m.querySelectorAll('.editor-form').forEach(form => {
        form.addEventListener('submit', e => {
            e.preventDefault();
            const col = form.dataset.collection;
            const fd = new FormData(form);
            const data = Object.fromEntries(fd.entries());

            // Handle Checkboxes manually
            form.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                data[cb.name] = cb.checked;
            });

            if(form.dataset.editingId) {
                // Update Existing
                const idx = state.collections[col].findIndex(i => i.id === form.dataset.editingId);
                if(idx > -1) state.collections[col][idx] = {...state.collections[col][idx], ...data};
            } else {
                // Create New (Manual)
                data.id = self.crypto.randomUUID();
                data.status = "Active";
                state.collections[col].push(data);
            }
            toggleEditor(col, false);
            render();
        });
    });
}

function toggleEditor(type, show, itemData=null) {
    const cont = state.modalElement.querySelector(`#container-${type}-${state.ceId}`);
    const edit = state.modalElement.querySelector(`#editor-${type}-${state.ceId}`);
    const form = edit.querySelector('form');

    if(show) {
        cont.style.display = 'none';
        edit.style.display = 'block';
        form.reset();
        
        if(itemData) {
            form.dataset.editingId = itemData.id;
            // Hydrate Inputs
            Object.keys(itemData).forEach(k => {
                const input = form.querySelector(`[name="${k}"]`);
                if(input) {
                    if(input.type === 'checkbox') input.checked = itemData[k] === true;
                    else input.value = itemData[k];
                    
                    // Smart Slider Update
                    if(input.type === 'range' && input.nextElementSibling) {
                        input.nextElementSibling.innerText = input.value + '%';
                    }
                }
            });
        } else {
            delete form.dataset.editingId;
        }
    } else {
        cont.style.display = 'block';
        edit.style.display = 'none';
    }
}