// ce_cards.js (The Speculation Environment Controller - Horizon Fusion v2025.23)

import { showLoadingSpinner, hideLoadingSpinner } from './base_functions.js';

// --- 1. STATE MANAGEMENT ---
let state = {
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
    isSaving: false
};

// --- 2. PERSONA MATRIX ---
const PERSONAS = {
    "Research": { title: "DEEP TRUTH ENGINE", icon: "fa-flask", class: "persona-research", tone: "Empirical" },
    "Risk": { title: "SECURITY OVERWATCH", icon: "fa-shield-virus", class: "persona-risk", tone: "Critical" },
    "Stakeholder": { title: "NETWORK DIPLOMAT", icon: "fa-handshake", class: "persona-stakeholder", tone: "Strategic" },
    "Advocacy": { title: "AMPLIFIER", icon: "fa-bullhorn", class: "persona-advocacy", tone: "Persuasive" },
    "Environment": { title: "SYSTEM ECOLOGIST", icon: "fa-leaf", class: "persona-research", tone: "Holistic" },
    "Timeline": { title: "TEMPORAL ARCHITECT", icon: "fa-stopwatch", class: "persona-default", tone: "Linear" },
    "Default": { title: "SPECULATE CO-PILOT", icon: "fa-brain", class: "persona-default", tone: "Helpful" }
};

// --- 3. INITIALIZATION ---

export function displayCEModal(modalHtml, ceId, p_ceType, ceData) {
    const modalContainer = document.getElementById('dynamicModalContainer');
    modalContainer.innerHTML = modalHtml;
    
    const modalElement = document.getElementById(`ceModal-${ceId}`);
    if (!modalElement) return console.error("Modal element not found.");

    const modal = new bootstrap.Modal(modalElement);

    modalElement.addEventListener('shown.bs.modal', () => {
        // 1. Resolve Schema
        const nodeConfig = (window.NODES && window.NODES[p_ceType]) ? window.NODES[p_ceType] : (window.NODES['Default']);

        // 2. Hydrate State
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
            isSaving: false
        };
        
        // 3. Boot System
        render(); 
        setupEventListeners();
        
        // 4. Auto-Start ("One-Hit" Check)
        checkAndTriggerAutoPopulation();

    }, { once: true });

    modalElement.addEventListener('hidden.bs.modal', () => modalElement.remove());
    modal.show();
}

// --- 4. AUTOMATION LOGIC ---

function checkAndTriggerAutoPopulation() {
    const isFresh = ['prerequisites', 'stakeholders', 'assumptions'].every(k => state.collections[k].length === 0);
    
    if (isFresh) {
        console.log("System Scan Initiated: Fresh Node Detected");
        
        const statusCard = state.modalElement.querySelector('.system-status-card');
        const statusValue = state.modalElement.querySelector('.status-card-value');
        
        if (statusCard && statusValue) {
            statusValue.innerText = "SCANNING...";
            statusValue.classList.add('text-primary');
            statusCard.classList.add('scanning'); 
        }

        triggerEnhancement('summary', null); 
        setTimeout(() => triggerSpeculation('prerequisites'), 1200);
        setTimeout(() => triggerSpeculation('stakeholders'), 2800);
        setTimeout(() => triggerSpeculation('assumptions'), 4200);
    }
}

// Core View Updater
function updateModalView() {
    const typeKey = currentNodesArray[currentIndex];
    const config = systemNodesConfig[typeKey] || {};
    const modalEl = document.getElementById('systemConfigModal');
    
    // --- 1. Identity Panel (LEFT) ---
    const panel = document.getElementById('sys-identity-panel');
    panel.style.backgroundColor = config.color || '#333';
    document.getElementById('sys-display-icon').className = `fas ${config.icon} fa-2x text-white`;
    document.getElementById('sys-display-label').textContent = config.label;
    
    // --- 2. Calibration Console (RIGHT) ---
    // Definition
    document.getElementById('sys-display-desc').textContent = config.description;
    
    // Examples (NEW)
    const exContainer = document.getElementById('sys-examples-container');
    exContainer.innerHTML = "";
    if(config.examples && Array.isArray(config.examples)) {
        config.examples.forEach(ex => {
            const badge = document.createElement('span');
            badge.className = "badge bg-white border text-secondary fw-normal cursor-pointer hover-shadow";
            badge.textContent = ex;
            badge.onclick = () => {
                document.getElementById('sys-param-value').value = ex;
                updateInjectionPreview(typeKey);
                updateActivePill(config.icon); // Update Visuals immediately
            };
            exContainer.appendChild(badge);
        });
    }

    // Pre-Populate Input (Fixed Logic)
    document.getElementById('sys-param-type').value = typeKey;
    const input = document.getElementById('sys-param-value');
    
    // We use dataset.tempValue which was set in openSystemEditor
    const savedVal = modalEl.dataset.tempValue;
    
    // Visual State Logic:
    // If 'savedVal' exists, the anchor is set. If not, it's pending.
    if(savedVal) {
        input.value = savedVal;
        document.getElementById('sys-status-badge').className = "badge bg-success-subtle text-success border border-success-subtle font-data rounded-pill px-3";
        document.getElementById('sys-status-badge').innerHTML = '<i class="fas fa-check-circle me-1"></i> CALIBRATED';
    } else {
        input.value = '';
        document.getElementById('sys-status-badge').className = "badge bg-secondary-subtle text-secondary border border-secondary-subtle font-data rounded-pill px-3";
        document.getElementById('sys-status-badge').innerHTML = '<i class="fas fa-circle me-1" style="font-size:8px;"></i> UNSET';
    }

    // --- 3. Visual Pill Renderer (LEFT Panel) ---
    updateActivePill(config.icon);

    // Live Listeners
    input.oninput = () => {
        updateInjectionPreview(typeKey);
        updateActivePill(config.icon);
    };
    
    updateInjectionPreview(typeKey);

    // Pagination Rendering... (Same as before)
}

// Helper to render the Giant Pill on the Left
function updateActivePill(iconClass) {
    const val = document.getElementById('sys-param-value').value;
    const container = document.getElementById('sys-active-pill-container');
    
    if (val && val.trim() !== "") {
        // Render Active State
        container.innerHTML = `
            <div class="bg-white bg-opacity-10 border border-white border-opacity-25 rounded-pill p-3 pe-5 d-flex align-items-center backdrop-blur transition-all">
                <div class="rounded-circle bg-white text-dark d-flex align-items-center justify-content-center shadow-sm me-3" 
                     style="width: 42px; height: 42px; flex-shrink: 0;">
                    <i class="fas ${iconClass} fa-lg"></i>
                </div>
                <div>
                    <div class="font-data text-white-50 x-small uppercase tracking-wide mb-0">ANCHOR VALUE</div>
                    <div class="font-body text-white fw-bold fs-5 leading-tight text-truncate" style="max-width: 220px;">
                        ${val}
                    </div>
                </div>
            </div>
        `;
    } else {
        // Render "Empty Slot" State
        container.innerHTML = `
             <div class="border border-dashed border-white border-opacity-25 rounded-pill p-4 text-center text-white-50 font-data small">
                <i class="fas fa-terminal me-2"></i> AWAITING INPUT
             </div>
        `;
    }
}

// --- 5. RENDER PIPELINE ---

function render() {
    if (!state.modalElement) return;
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
        <li class="list-group-item px-3 py-2 border-0 border-bottom signal-item type-${s.type}">
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

    if (items.length === 0) {
        let icon = "fa-wind";
        let text = "Auto-Generate";
        if (type === 'prerequisites') { icon = "fa-list-check"; text = "Speculate Prerequisites"; }
        if (type === 'stakeholders') { icon = "fa-users-viewfinder"; text = "Query Network"; }
        
        container.innerHTML = `
            <div class="text-center p-5 opacity-50 border border-dashed rounded bg-light mt-3">
                <i class="fas ${icon} fa-2x mb-3 text-muted"></i>
                <p class="font-data small text-muted mb-3">DATA STREAM EMPTY</p>
                <button class="btn btn-sm btn-outline-primary font-data rounded-pill px-4 btn-speculate-collection" data-collection="${type}">
                    <i class="fas fa-magic me-2"></i> ${text}
                </button>
            </div>`;
        return;
    }

    const schemaKey = type.slice(0, -1) + '_schema';
    const fields = state.nodeSchema[schemaKey] || [];
    const titleKey = fields[0]?.key || 'title';
    const subKey = fields[1]?.key || 'status';

    container.innerHTML = items.map(item => {
        const title = item[titleKey] || 'Untitled';
        const subtitle = item[subKey] || 'Pending';
        const isProposed = item.tags && item.tags.includes("AI");

        const extraClass = isProposed ? "border-dashed" : "";
        let stripColor = "var(--phase-color)";
        
        if (isProposed) stripColor = "#6366f1"; 
        else if (['Verified','Signed','Met'].includes(item.status)) stripColor = "#10b981"; 

        return `
        <div class="collection-card-modern ${extraClass}" style="position:relative;">
            <div style="position:absolute; left:0; top:0; bottom:0; width:5px; background-color:${stripColor};"></div>
            <div class="flex-grow-1 ps-2">
                <div class="d-flex align-items-center gap-2">
                    <div class="card-title-modern">${title}</div>
                    ${isProposed ? '<span class="badge bg-primary-soft text-primary font-data" style="font-size:0.6em">PROPOSED</span>' : ''}
                </div>
                <div class="card-subtitle-modern text-truncate">${subtitle}</div>
            </div>
            <div class="d-flex align-items-center gap-1">
                ${isProposed 
                    ? `<button class="btn btn-sm btn-outline-success btn-accept p-1 px-2 shadow-sm" data-col="${type}" data-id="${item.id}" title="Accept"><i class="fas fa-check"></i></button>`
                    : `<button class="btn btn-sm btn-link text-muted p-1 btn-edit-item" data-collection="${type}" data-id="${item.id}"><i class="fas fa-pencil-alt"></i></button>`
                }
                <button class="btn btn-sm btn-link text-danger p-1 btn-delete-item" data-collection="${type}" data-id="${item.id}"><i class="fas fa-times"></i></button>
            </div>
        </div>`;
    }).join('');
}

// --- 6. DASHBOARD & METRICS ---

function updateDashboard() {
    // 1. Update Badges
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

    // 2. Calculate Score
    let score = 0;
    const totalGoal = 60; 
    Object.values(state.collections).flat().forEach(i => {
        score += 5; 
        if (['Verified', 'Met', 'Signed', 'Active'].includes(i.status)) score += 5;
    });
    if (state.details_data.summary && state.details_data.summary.length > 20) score += 10;

    const percent = Math.min(100, Math.floor((score / totalGoal) * 100));
    
    // 3. Update Bars (With Safety Checks)
    const bar = state.modalElement.querySelector('#ce-progress-bar');
    const lbl = state.modalElement.querySelector('#ce-progress-label');
    if(bar) bar.style.width = `${percent}%`;
    if(lbl) lbl.innerText = `${percent}%`;

    // 4. Update Status Card (CRITICAL FIX: Null Checks)
    const statusCard = state.modalElement.querySelector('.system-status-card');
    const statusVal = state.modalElement.querySelector('.status-card-value');
    
    if (statusCard && statusVal) {
        // Only update if we aren't in the middle of a scan
        if (!statusCard.classList.contains('scanning')) {
            statusVal.classList.remove('text-primary');
            if (percent === 0) statusVal.innerText = "INITIALIZED";
            else if (percent < 30) statusVal.innerText = "ANALYZING";
            else if (percent < 80) statusVal.innerText = "CALIBRATING";
            else statusVal.innerHTML = "<span class='text-success'>OPTIMIZED</span>";
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
            <i class="fas fa-circle text-white fa-xs opacity-75 animate-pulse"></i>
        </div>
        <div class="small opacity-75 mt-1 font-data" style="letter-spacing:0.5px;">MODE: ${persona.tone.toUpperCase()}</div>
    `;
}

function renderAiSidebarContent() {
    const content = state.modalElement.querySelector('#ai-sidebar-content');
    if(!content) return;
    const tab = state.activeTab;
    const mkBtn = (txt, icon, color, action) => 
        `<button class="btn btn-light border w-100 text-start mb-2 shadow-sm ${action}"><i class="fas ${icon} me-2 text-${color}"></i> ${txt}</button>`;

    let html = `<h6 class="font-data text-muted small mb-3">AVAILABLE PROTOCOLS</h6>`;

    if (tab === 'overview') {
        html += mkBtn("Strategic Analysis", "chess-board", "primary", "btn-trigger-ai' data-context='narrative' data-sub='context");
        html += mkBtn("Critical Risk Scan", "shield-alt", "danger", "btn-trigger-ai' data-context='assumptions");
    } else if (['prerequisites','stakeholders','assumptions','resources'].includes(tab)) {
        const label = tab.charAt(0).toUpperCase() + tab.slice(1, -1);
        html += `<button class="btn btn-gradient-purple w-100 text-start mb-2 shadow-sm text-white btn-speculate-collection" data-collection="${tab}"><i class="fas fa-bolt me-2"></i> Speculate ${label}s</button>`;
        html += `<div class="small text-muted mb-2 mt-2 font-data">Refinement</div>`;
        html += mkBtn("Validate Entries", "check-double", "success", "");
    } else {
        html += mkBtn("Auto-Draft Content", "magic", "purple", "btn-enhance-field' data-field='summary");
    }
    
    content.innerHTML = html + `<div class="mt-auto pt-4 border-top"><label class="font-data small text-muted mb-2">DIRECT UPLINK</label><input type="text" class="form-control form-control-sm font-body" placeholder="Query the Engine..."></div>`;
}

// --- 7. SERVER ACTIONS ---

function triggerSpeculation(type, btn = null) {
    let origHtml = '';
    if(btn) { origHtml = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>'; }
    else { updateDashboard(); }

    const contextGoal = state.modalElement.querySelector('.source-cos-card p')?.textContent.trim();

    fetch('/speculate_context', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ 
            ce_type: state.ceType, 
            context: type, 
            cos_text: contextGoal 
        })
    })
    .then(r => r.json())
    .then(data => {
        if (data.suggestions) {
            data.suggestions.forEach(i => {
                i.id = self.crypto.randomUUID();
                i.tags = "AI"; 
                i.status = "Proposed";
                state.collections[type].push(i);
            });
            render(); 
        }
    })
    .finally(() => {
        if(btn) { btn.disabled = false; btn.innerHTML = origHtml; }
        const statusCard = state.modalElement.querySelector('.system-status-card');
        if(statusCard) statusCard.classList.remove('scanning');
        updateDashboard();
    });
}

// ce_cards.js - Narrative Enhancement Logic

function triggerEnhancement(fieldKey, btn = null, isAuto = false) {
    // 1. Set Visual Loading State (if triggered by a button)
    if (btn) { 
        btn.disabled = true; 
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> THINKING...'; 
    }

    // 2. Scrape Context for AI
    // We need the Parent Goal (COS) to ground the generated text.
    const cosTextEl = state.modalElement.querySelector('.source-cos-card p');
    const cosText = cosTextEl ? cosTextEl.textContent.trim() : "Project Goal";

    // 3. Send Request to 'Narrative Mode' endpoint
    fetch('/speculate_context', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ 
            ce_type: state.ceType, 
            context: 'narrative', // Special context for text generation
            sub_context: fieldKey, // e.g., 'summary', 'research_question'
            cos_text: cosText 
        })
    })
    .then(r => r.json())
    .then(data => {
        // 4. Handle Successful Response
        if(data.success && data.text) {
            // Update Local State
            state.details_data[fieldKey] = data.text;
            
            // Update DOM Input/Textarea directly
            const input = state.modalElement.querySelector(`[name="${fieldKey}"]`);
            if(input) {
                input.value = data.text;
                // Trigger input event to notify other listeners (like autosave)
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
            
            // Update Dashboard (e.g. Readiness score jumps up because field is filled)
            updateDashboard();
        }
    })
    .catch(err => {
        console.error("Narrative Speculation Error:", err);
        if(btn && !isAuto) alert("Could not generate narrative. Please try again.");
    })
    .finally(() => { 
        // 5. Reset Button State
        if (btn) { 
            btn.disabled = false; 
            // BRANDING UPDATE: Restore 'SPECULATE' label instead of 'ENHANCE'
            btn.innerHTML = '<i class="fas fa-brain me-2"></i> SPECULATE'; 
        } 
    });
}

function saveDataPacket() {
    const btn = state.modalElement.querySelector('.btn-save-changes');
    const orig = btn.innerHTML; // Capture the dynamic "SAVE RISK" text
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> COMMITTING...';

    // Scrape Narrative Form if it exists
    const narrForm = state.modalElement.querySelector(`#narrative-form-${state.ceId}`);
    if (narrForm) {
        const fd = new FormData(narrForm);
        state.details_data = Object.fromEntries(fd.entries());
    }

    // Build Packet
    const packet = {
        details_data: state.details_data,
        prerequisites: state.collections.prerequisites,
        stakeholders: state.collections.stakeholders,
        assumptions: state.collections.assumptions,
        resources: state.collections.resources,
        connections: state.collections.connections
    };

    fetch(`/update_ce/${state.ceId}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(packet)
    })
    .then(r => r.json())
    .then(data => {
        if(data.success) {
            const status = state.modalElement.querySelector('#save-status');
            // Contextual success message
            if(status) status.innerHTML = `<span class="text-success font-data">${state.ceType.toUpperCase()} COMMITTED</span>`;
            
            btn.classList.remove('btn-primary'); btn.classList.add('btn-success');
            btn.innerHTML = `<i class="fas fa-check"></i> SAVED`;
            
            setTimeout(() => { 
                btn.classList.remove('btn-success'); btn.classList.add('btn-primary');
                btn.innerHTML = orig; // Restore "SAVE RISK"
            }, 1500);
        }
    });
}

// --- 8. EVENT LISTENERS ---

function setupEventListeners() {
    const m = state.modalElement;

    // Tabs -> Context Switching
    const nav = m.querySelector('.ce-nav-tabs');
    if(nav) {
        nav.addEventListener('shown.bs.tab', e => {
            const tid = e.target.getAttribute('data-bs-target');
            if(tid.includes('overview')) state.activeTab = 'overview';
            else if(tid.includes('narrative')) state.activeTab = 'narrative';
            else {
                const p = tid.split('-'); if(p.length > 1) state.activeTab = p[1];
            }
            renderAiSidebarContent();
        });
    }

    // Central Click Handler
    m.addEventListener('click', e => {
        const t = e.target;

        // 1. Suggest / Enhance / AI Triggers
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

        // 3. Item Actions
        const accBtn = t.closest('.btn-accept');
        if(accBtn) {
            const col = accBtn.dataset.col;
            const item = state.collections[col].find(i => i.id === accBtn.dataset.id);
            if(item) { item.tags = ""; item.status = "Active"; render(); }
        }
        
        const delBtn = t.closest('.btn-delete-item');
        if(delBtn && confirm("Purge item?")) {
            const col = delBtn.dataset.col;
            state.collections[col] = state.collections[col].filter(i => i.id !== delBtn.dataset.id);
            render();
        }

        // 4. Save
        if(t.closest('.btn-save-changes')) saveDataPacket();
    });

    // Forms
    m.querySelectorAll('.editor-form').forEach(form => {
        form.addEventListener('submit', e => {
            e.preventDefault();
            const col = form.dataset.collection;
            const fd = new FormData(form);
            const data = Object.fromEntries(fd.entries());

            // Handle Smart Widget (Checkboxes) manually
            form.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                data[cb.name] = cb.checked;
            });

            if(form.dataset.editingId) {
                const idx = state.collections[col].findIndex(i => i.id === form.dataset.editingId);
                if(idx > -1) state.collections[col][idx] = {...state.collections[col][idx], ...data};
            } else {
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
            Object.keys(itemData).forEach(k => {
                const input = form.querySelector(`[name="${k}"]`);
                if(input) {
                    if(input.type === 'checkbox') input.checked = itemData[k] === true;
                    else input.value = itemData[k];
                    // Smart Slider Update
                    if(input.type === 'range' && input.nextElementSibling) input.nextElementSibling.innerText = input.value + '%';
                }
            });
        } else delete form.dataset.editingId;
    } else {
        cont.style.display = 'block';
        edit.style.display = 'none';
    }
}