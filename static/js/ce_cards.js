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
        criteria: [],
        connections: []
    },
    details_data: {},
    nodeSchema: {},
    viewModes: {
        prerequisites: 'tile',
        stakeholders: 'tile',
        assumptions: 'tile',
        resources: 'tile',
        criteria: 'tile'
    },
    chatHistory: [],      // [{role: 'user'|'advocate', content: string, timestamp: number}]
    chatContext: null,     // Active context the Advocate is discussing (e.g. 'prerequisites', 'overview')
    isAdvocateTyping: false,
    isSaving: false,
    isScanning: false
};

let state = { ...DEFAULT_STATE };

// =============================================================================
// 2. PERSONA MATRIX & CONFIG
// =============================================================================

const PERSONAS = {
    "Research": { title: "Research Assistant", icon: "fa-flask", greeting: "Let's find the truth together." },
    "Risk": { title: "Risk Advisor", icon: "fa-shield-virus", greeting: "Let's identify what could go wrong." },
    "Stakeholder": { title: "Network Scout", icon: "fa-user-astronaut", greeting: "Let's map your human network." },
    "Advocacy": { title: "Campaign Strategist", icon: "fa-bullhorn", greeting: "Let's build momentum." },
    "Environment": { title: "Systems Ecologist", icon: "fa-leaf", greeting: "Let's understand the ecosystem." },
    "Timeline": { title: "Schedule Architect", icon: "fa-stopwatch", greeting: "Let's map the critical path." },
    "Praxis": { title: "Operations Guide", icon: "fa-rocket", greeting: "Let's figure out the how." },
    "Collaboration": { title: "Partnership Advisor", icon: "fa-handshake", greeting: "Let's find the right allies." },
    "Default": { title: "Workshop Assistant", icon: "fa-brain", greeting: "How can I help?" }
};

// Guidance text for empty collection states
const COLLECTION_GUIDANCE = {
    prerequisites: {
        icon: "fa-cubes",
        title: "Building Blocks",
        desc: "What needs to be true before this can happen? These are the foundation."
    },
    stakeholders: {
        icon: "fa-users",
        title: "Key People",
        desc: "Who's involved? Champions, gatekeepers, collaborators — map your human network."
    },
    assumptions: {
        icon: "fa-lightbulb",
        title: "Hidden Beliefs",
        desc: "What are we betting on? Surface the assumptions so they can be tested."
    },
    resources: {
        icon: "fa-toolbox",
        title: "Tools & References",
        desc: "What assets, documents, or tools will fuel this work?"
    },
    criteria: {
        icon: "fa-vial",
        title: "Success Criteria",
        desc: "What are the concrete, testable conditions that define success? Thresholds, gates, constraints, and decision forks."
    }
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
        
        // Read contextual tab labels from the template data attribute
        const contentEl = modalElement.querySelector('.ce-app-content');
        let tabLabels = {};
        try { tabLabels = JSON.parse(contentEl?.getAttribute('data-tab-labels') || '{}'); } catch(e) {}
        
        state = {
            modalElement, 
            ceId, 
            ceType: p_ceType, 
            activeTab: 'overview',
            tabLabels,
            collections: {
                prerequisites: d.prerequisites || [],
                stakeholders: d.stakeholders || [],
                assumptions: d.assumptions || [],
                resources: d.resources || [],
                criteria: d.criteria || [],
                connections: d.connections || []
            },
            details_data: d.details_data || {},
            nodeSchema: nodeConfig,
            viewModes: {
                prerequisites: 'tile',
                stakeholders: 'tile',
                assumptions: 'tile',
                resources: 'tile',
                criteria: 'tile'
            },
            chatHistory: d.chatHistory || [],
            chatContext: null,
            isAdvocateTyping: false,
            isSaving: false,
            isScanning: false
        };
        
        // 3. Boot System
        render(); 
        setupEventListeners();
        
        // 3b. Render primary field as markdown + CE pills
        renderPrimaryField();
        
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
    const isFresh = ['prerequisites', 'stakeholders', 'assumptions'].every(k => state.collections[k].length === 0);
    const hasSummary = state.details_data.summary && state.details_data.summary.length > 5;

    const initState = state.modalElement.querySelector('#ce-init-state');
    const statusCard = state.modalElement.querySelector('#ce-status-card');

    if (isFresh && !hasSummary) {
        // Show Initialization Dialog instead of Auto-Running
        if (initState) initState.style.display = 'block';
        if (statusCard) statusCard.style.display = 'none';
    } else {
        if (initState) initState.style.display = 'none';
        if (statusCard) statusCard.style.display = 'flex';
    }
}

window.executeAutoPopulation = function() {
    state.isScanning = true;
    updateDashboard();

    const initState = state.modalElement.querySelector('#ce-init-state');
    const statusCard = state.modalElement.querySelector('#ce-status-card');
    if (initState) initState.style.display = 'none';
    if (statusCard) statusCard.style.display = 'flex';

    // Staggered Execution
    triggerEnhancement('summary', null, true); 
    setTimeout(() => triggerSpeculation('prerequisites', null, true), 1200);
    setTimeout(() => triggerSpeculation('stakeholders', null, true), 2800);
    setTimeout(() => triggerSpeculation('assumptions', null, true), 4200);
    
    setTimeout(() => {
        state.isScanning = false;
        updateDashboard();
    }, 5000);
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
    renderChatInputBar();
    updateDashboard();
    checkNodeIntegrity();
}

// --- GOVERNANCE: Node Integrity Check ---
function checkNodeIntegrity() {
    const badge = state.modalElement?.querySelector('#ce-integrity-badge');
    if (!badge) return;
    
    // Don't show badge if we are in init state
    const initState = state.modalElement.querySelector('#ce-init-state');
    if (initState && initState.style.display !== 'none') {
        badge.classList.remove('d-md-flex');
        badge.classList.add('d-none');
        return;
    }
    
    badge.classList.remove('d-none');
    badge.classList.add('d-md-flex');
    
    const criteria = state.collections.criteria || [];
    const label = badge.querySelector('.integrity-label');
    const icon = badge.querySelector('i');
    
    // Base styles vs dynamically applied ones
    badge.style.cssText = ''; 
    
    if (criteria.length === 0) {
        badge.className = 'btn btn-glass font-data d-none d-md-flex align-items-center gap-2 text-warning';
        badge.style.background = 'rgba(245, 158, 11, 0.15)';
        badge.style.border = '1px solid rgba(245, 158, 11, 0.3)';
        icon.className = 'fas fa-shield-alt';
        label.textContent = 'INTEGRITY PENDING';
        return;
    }
    
    const isCompromised = criteria.some(c => ['Fail', 'Blocked', 'Violated'].includes(c.status));
    const isPending = criteria.some(c => ['Pending', 'Unresolved'].includes(c.status));
    
    if (isCompromised) {
        badge.className = 'btn btn-glass font-data d-none d-md-flex align-items-center gap-2 text-white shadow-sm ce-advocate-trigger';
        badge.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        badge.style.border = '1px solid #b91c1c';
        icon.className = 'fas fa-shield-virus fa-fade';
        label.textContent = 'INTEGRITY COMPROMISED';
        badge.title = 'Click to open Advocate Analysis';
    } else if (isPending) {
        badge.className = 'btn btn-glass font-data d-none d-md-flex align-items-center gap-2 text-warning';
        badge.style.background = 'rgba(245, 158, 11, 0.15)';
        badge.style.border = '1px solid rgba(245, 158, 11, 0.3)';
        icon.className = 'fas fa-shield-alt';
        label.textContent = 'INTEGRITY PENDING';
        badge.removeAttribute('title');
    } else {
        badge.className = 'btn btn-glass font-data d-none d-md-flex align-items-center gap-2 text-success';
        badge.style.background = 'rgba(16, 185, 129, 0.15)';
        badge.style.border = '1px solid rgba(16, 185, 129, 0.3)';
        icon.className = 'fas fa-shield-check';
        label.textContent = 'INTEGRITY VERIFIED';
        badge.removeAttribute('title');
    }
}

// --- PRIMARY FIELD: Markdown + CE Pill Rendering ---
function renderPrimaryField() {
    const m = state.modalElement;
    if (!m) return;
    
    const renderedView = m.querySelector('.ce-rendered-view');
    const editForm = m.querySelector('.ce-edit-form');
    const textarea = editForm?.querySelector('textarea');
    if (!renderedView || !textarea) return;
    
    const rawText = textarea.value || '';
    
    if (!rawText.trim()) {
        // Empty — show placeholder
        const placeholder = renderedView.dataset.placeholder || 'Click to add content...';
        renderedView.innerHTML = `<p>${placeholder}</p>`;
        renderedView.classList.add('is-empty');
    } else {
        renderedView.classList.remove('is-empty');
        
        // Step 1: Parse markdown
        let html = rawText;
        if (typeof marked !== 'undefined') {
            marked.setOptions({ breaks: true, gfm: true });
            html = marked.parse(rawText);
        } else {
            // Fallback: escape HTML and convert line breaks
            html = rawText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            html = html.replace(/\n/g, '<br>');
        }
        
        // Step 2: Parse CE tags (<ce type="X">text</ce> → interactive pills)
        html = html.replace(
            /&lt;ce\s+type=(?:&quot;|"|')(\w+)(?:&quot;|"|')&gt;(.*?)&lt;\/ce&gt;/gi,
            (match, ceType, ceText) => {
                const nodeInfo = window.NODES?.[ceType] || window.NODES?.['Default'] || {};
                const color = nodeInfo.color || '#6c757d';
                const icon = nodeInfo.icon || 'fa-solid fa-cube';
                return `<span class="ce-capsule" data-ce-type="${ceType}" style="--node-color: ${color};" title="${ceType} Node"><i class="${icon}"></i>${ceText}</span>`;
            }
        );
        
        // Also handle unescaped CE tags (from server-side content)
        html = html.replace(
            /<ce\s+type=["'](\w+)["']>(.*?)<\/ce>/gi,
            (match, ceType, ceText) => {
                const nodeInfo = window.NODES?.[ceType] || window.NODES?.['Default'] || {};
                const color = nodeInfo.color || '#6c757d';
                const icon = nodeInfo.icon || 'fa-solid fa-cube';
                return `<span class="ce-capsule" data-ce-type="${ceType}" style="--node-color: ${color};" title="${ceType} Node"><i class="${icon}"></i>${ceText}</span>`;
            }
        );
        
        renderedView.innerHTML = html;
    }
}

function renderAllCollections() {
    ['prerequisites', 'stakeholders', 'assumptions', 'resources', 'criteria'].forEach(type => {
        if (type === 'criteria') {
            renderCriteriaList();
        } else {
            renderCollectionList(type);
        }
    });
}

function renderOverviewStream() {
    // Deprecated: Replaced by Workshop Checklist
}

function renderCollectionList(type) {
    const container = state.modalElement.querySelector(`#container-${type}-${state.ceId}`);
    if (!container) return;

    const items = state.collections[type] || [];

    // --- Empty State (Warm Guided) ---
    if (items.length === 0) {
        const guidance = COLLECTION_GUIDANCE[type] || { icon: 'fa-folder-open', title: 'Collection', desc: 'Add items to get started.' };
        const nodeColor = state.nodeSchema?.color || 'var(--phase-color)';
        
        container.innerHTML = `
            <div class="text-center p-5 mt-3 rounded-4" style="background: linear-gradient(160deg, ${nodeColor}06, ${nodeColor}12); border: 1px dashed ${nodeColor}35;">
                <div class="rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style="width: 56px; height: 56px; background: ${nodeColor}15;">
                    <i class="fas ${guidance.icon} fa-lg" style="color: ${nodeColor};"></i>
                </div>
                <h6 class="font-brand text-dark mb-1">${guidance.title}</h6>
                <p class="font-body small text-muted mb-4" style="max-width: 320px; margin: 0 auto;">${guidance.desc}</p>
                <div class="d-flex justify-content-center gap-2">
                    <button class="btn btn-sm font-data rounded-pill px-4 text-white shadow-sm btn-speculate-collection" data-collection="${type}" style="background: linear-gradient(90deg, ${nodeColor}, ${nodeColor}dd);">
                        <i class="fas fa-sparkles me-1"></i> Let the Engine Help
                    </button>
                    <button class="btn btn-sm font-data rounded-pill px-4 border btn-add-item" data-collection="${type}" style="color: ${nodeColor}; border-color: ${nodeColor}50 !important;">
                        <i class="fas fa-pen me-1"></i> Add Manually
                    </button>
                </div>
            </div>`;
        return;
    }

    // --- Dynamic Schema Mapping ---
    const schemaKey = type.slice(0, -1) + '_schema';
    const fields = state.nodeSchema[schemaKey] || [];
    const titleKey = fields[0]?.key || 'title';
    const subKey = fields[1]?.key || 'status';

    // --- Render Based on View Mode ---
    const viewMode = state.viewModes[type] || 'tile';

    if (viewMode === 'table') {
        // Table View
        const cols = fields.slice(0, 4); // Show up to 4 columns
        let html = `<div class="table-responsive"><table class="table table-sm table-hover font-body align-middle" style="font-size: 0.85rem;">`;
        html += `<thead><tr>`;
        cols.forEach(f => html += `<th class="text-muted font-data fw-normal tracking-widest" style="font-size:0.7rem;">${f.label.toUpperCase()}</th>`);
        html += `<th class="text-end">ACTIONS</th></tr></thead><tbody>`;
        
        html += items.map(item => {
            const isProposed = item.tags && item.tags.includes("AI");
            let rowHtml = `<tr class="${isProposed ? 'table-primary bg-opacity-10' : ''}">`;
            
            cols.forEach(f => {
                let val = item[f.key] || '<span class="text-muted">—</span>';
                if (f.key === titleKey && isProposed) val += ' <span class="badge bg-primary-soft text-primary font-data" style="font-size:0.6em">POSSIBILITY</span>';
                if (f.type === 'toggle') val = item[f.key] ? '<i class="fas fa-check text-success"></i>' : '<span class="text-muted">—</span>';
                rowHtml += `<td>${val}</td>`;
            });
            
            rowHtml += `<td class="text-end">
                ${isProposed 
                    ? `<button class="btn btn-sm btn-outline-success btn-accept p-1 px-2 shadow-sm" data-col="${type}" data-id="${item.id}" title="Accept Possibility"><i class="fas fa-check"></i></button>`
                    : `<button class="btn btn-sm btn-link text-muted p-1 btn-edit-item" data-collection="${type}" data-id="${item.id}"><i class="fas fa-pencil-alt"></i></button>`
                }
                <button class="btn btn-sm btn-link text-danger p-1 btn-delete-item" data-collection="${type}" data-id="${item.id}"><i class="fas fa-times"></i></button>
            </td></tr>`;
            return rowHtml;
        }).join('');
        
        html += `</tbody></table></div>`;
        container.innerHTML = html;

    } else if (viewMode === 'constellation') {
        // Constellation View Placeholder (Canvas initialized via JS later)
        container.innerHTML = `
            <div class="h-100 d-flex flex-column align-items-center justify-content-center bg-light rounded-4 position-relative" style="min-height: 300px; border: 1px solid #e2e8f0;">
                <canvas id="canvas-${type}-${state.ceId}" class="w-100 h-100 position-absolute top-0 start-0" style="border-radius: 1rem;"></canvas>
                <div class="position-absolute bottom-0 start-0 p-3 text-muted font-data" style="font-size: 0.7rem; pointer-events: none;">
                    <i class="fas fa-project-diagram me-1"></i> Interactive Network Graph (Coming Soon)
                </div>
            </div>`;
            
        // We would trigger a constellation render function here, e.g., renderConstellation(type, `canvas-${type}-${state.ceId}`)
        setTimeout(() => {
            if (window.renderConstellation) {
                window.renderConstellation(type, `canvas-${type}-${state.ceId}`, items, state.ceType);
            }
        }, 50);

    } else {
        // Tile View (Default)
        container.innerHTML = items.map(item => {
            const title = item[titleKey] || 'Processing...';
            const subtitle = item[subKey] || 'Pending';
            
            const isProposed = item.tags && item.tags.includes("AI");
            const extraClass = isProposed ? "possibility-card border-dashed" : "border-start border-4";
            
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
}

// --- BESPOKE CRITERIA RENDERER ---
function renderCriteriaList() {
    const container = state.modalElement.querySelector(`#container-criteria-${state.ceId}`);
    if (!container) return;

    const items = state.collections.criteria || [];

    if (items.length === 0) {
        const guidance = COLLECTION_GUIDANCE.criteria;
        const nodeColor = state.nodeSchema?.color || 'var(--phase-color)';
        container.innerHTML = `
            <div class="text-center p-5 mt-3 rounded-4" style="background: linear-gradient(160deg, ${nodeColor}06, ${nodeColor}12); border: 1px dashed ${nodeColor}35;">
                <div class="rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style="width: 56px; height: 56px; background: ${nodeColor}15;">
                    <i class="fas ${guidance.icon} fa-lg" style="color: ${nodeColor};"></i>
                </div>
                <h6 class="font-brand text-dark mb-1">${guidance.title}</h6>
                <p class="font-body small text-muted mb-4" style="max-width: 320px; margin: 0 auto;">${guidance.desc}</p>
                <div class="d-flex justify-content-center gap-2">
                    <button class="btn btn-sm font-data rounded-pill px-4 text-white shadow-sm btn-speculate-collection" data-collection="criteria" style="background: linear-gradient(90deg, ${nodeColor}, ${nodeColor}dd);">
                        <i class="fas fa-sparkles me-1"></i> Extract Criteria
                    </button>
                    <button class="btn btn-sm font-data rounded-pill px-4 border btn-add-item" data-collection="criteria" style="color: ${nodeColor}; border-color: ${nodeColor}50 !important;">
                        <i class="fas fa-pen me-1"></i> Add Manually
                    </button>
                </div>
            </div>`;
        return;
    }

    // Type-specific icons & colors
    const TYPE_META = {
        Threshold:   { icon: 'fa-gauge-high',     color: '#6366f1' },
        Gate:        { icon: 'fa-door-open',       color: '#0ea5e9' },
        Constraint:  { icon: 'fa-shield-halved',   color: '#f59e0b' },
        Conditional: { icon: 'fa-code-branch',     color: '#8b5cf6' },
        Benchmark:   { icon: 'fa-chart-column',    color: '#10b981' }
    };
    
    const STATUS_META = {
        Pass:       { icon: 'fa-circle-check',    color: '#10b981', bg: '#ecfdf5' },
        Fail:       { icon: 'fa-circle-xmark',    color: '#ef4444', bg: '#fef2f2' },
        Pending:    { icon: 'fa-clock',            color: '#94a3b8', bg: '#f8fafc' },
        Blocked:    { icon: 'fa-lock',             color: '#ef4444', bg: '#fef2f2' },
        Compliant:  { icon: 'fa-shield-check',     color: '#10b981', bg: '#ecfdf5' },
        Violated:   { icon: 'fa-triangle-exclamation', color: '#ef4444', bg: '#fef2f2' },
        Unresolved: { icon: 'fa-question-circle',  color: '#f59e0b', bg: '#fffbeb' }
    };

    container.innerHTML = items.map(item => {
        const cType = item.criterion_type || 'Threshold';
        const meta = TYPE_META[cType] || TYPE_META.Threshold;
        const status = item.status || 'Pending';
        const sMeta = STATUS_META[status] || STATUS_META.Pending;
        const isProposed = item.tags && item.tags.includes("AI");
        
        // Build the detail line based on criterion type
        let detailHtml = '';
        switch(cType) {
            case 'Threshold':
                const op = item.operator || '≤';
                const target = item.target || '—';
                const unit = item.unit || '';
                const current = item.current ? `<span class="fw-bold" style="color: ${sMeta.color};">${unit}${item.current}</span> / ` : '';
                detailHtml = `${current}${op} <span class="fw-bold">${unit}${target}</span>`;
                break;
            case 'Gate':
                detailHtml = status === 'Pass' ? '<i class="fas fa-unlock text-success me-1"></i>Cleared' : '<i class="fas fa-lock text-muted me-1"></i>Awaiting';
                break;
            case 'Constraint':
                const sev = item.severity || 'Hard';
                detailHtml = `<span class="badge rounded-pill ${sev === 'Hard' ? 'bg-danger-subtle text-danger' : 'bg-warning-subtle text-warning'}" style="font-size: 0.6rem;">${sev.toUpperCase()}</span>`;
                break;
            case 'Conditional':
                detailHtml = item.condition ? `<span class="text-muted">If:</span> ${item.condition.substring(0, 40)}${item.condition.length > 40 ? '…' : ''}` : 'Define condition';
                break;
            case 'Benchmark':
                const ref = item.reference || 'Reference';
                detailHtml = `vs <span class="fst-italic">${ref.substring(0, 30)}</span>`;
                break;
        }

        return `
        <div class="criterion-card ${isProposed ? 'criterion-proposed' : ''}" style="--criterion-color: ${meta.color}; --status-color: ${sMeta.color}; --status-bg: ${sMeta.bg};">
            <div class="criterion-type-badge">
                <i class="fas ${meta.icon}"></i>
            </div>
            <div class="criterion-body">
                <div class="d-flex align-items-center gap-2">
                    <span class="criterion-label">${item.label || 'Unnamed'}</span>
                    <span class="criterion-type-tag">${cType}</span>
                    ${isProposed ? '<span class="badge bg-primary-soft text-primary font-data" style="font-size:0.55em">AI SUGGESTED</span>' : ''}
                </div>
                <div class="criterion-detail">${detailHtml}</div>
            </div>
            <div class="criterion-status">
                <i class="fas ${sMeta.icon}" style="color: ${sMeta.color};"></i>
                <span style="color: ${sMeta.color};">${status}</span>
            </div>
            <div class="criterion-actions">
                ${isProposed 
                    ? `<button class="btn btn-sm btn-outline-success btn-accept p-1 px-2" data-col="criteria" data-id="${item.id}" title="Accept"><i class="fas fa-check"></i></button>`
                    : `<button class="btn btn-sm btn-link text-muted p-1 btn-edit-item" data-collection="criteria" data-id="${item.id}"><i class="fas fa-pencil-alt"></i></button>`
                }
                <button class="btn btn-sm btn-link text-danger p-1 btn-delete-item" data-collection="criteria" data-id="${item.id}"><i class="fas fa-times"></i></button>
            </div>
        </div>`;
    }).join('');
}

// =============================================================================
// 6. DASHBOARD & SIDEBAR METRICS
// =============================================================================

function updateDashboard() {
    const nodeColor = state.nodeSchema?.color || '#6366f1';
    
    // 1. Update Collection Badges (tab badges)
    ['prerequisites', 'stakeholders', 'assumptions', 'resources', 'criteria'].forEach(k => {
        const count = (state.collections[k] || []).length;
        // Tab badges
        const badge = state.modalElement.querySelector(`.count-badge[data-collection="${k}"]`);
        if (badge) {
            badge.textContent = count;
            if(count > 0) {
                badge.classList.remove('bg-light', 'text-dark');
                badge.classList.add('bg-primary', 'text-white');
            } else {
                badge.classList.add('bg-light', 'text-dark');
                badge.classList.remove('bg-primary', 'text-white');
            }
        }
        // Metric pills (Tier 2)
        const inlineBadge = state.modalElement.querySelector(`.count-badge-inline[data-collection="${k}"]`);
        if (inlineBadge) inlineBadge.textContent = count;
    });

    // 2. Progress calculation
    // Check first detail field key dynamically
    const firstKey = state.nodeSchema?.details_schema?.[0]?.key || 'summary';
    const hasNarrative = state.details_data[firstKey] && state.details_data[firstKey].length > 5;
    const hasPrereq = (state.collections.prerequisites || []).length > 0;
    const hasStakeholder = (state.collections.stakeholders || []).length > 0;

    let completed = 0;
    if (hasNarrative) completed++;
    if (hasPrereq) completed++;
    if (hasStakeholder) completed++;

    const percent = Math.floor((completed / 3) * 100);
    
    // Completion badge
    const badge = state.modalElement.querySelector('#completion-badge');
    if (badge) badge.innerText = `${percent}%`;
    
    // Progress bar (Tier 3)
    const progressBar = state.modalElement.querySelector('#tier3-progress-bar');
    if (progressBar) progressBar.style.width = `${percent}%`;
    
    const progressText = state.modalElement.querySelector('#tier3-progress-text');
    if (progressText) progressText.textContent = `${completed}/3 milestones`;

    // 3. Tier 3 summary cards
    const prereqSummary = state.modalElement.querySelector(`#tier3-prereq-${state.ceId}`);
    if (prereqSummary) {
        const items = state.collections.prerequisites || [];
        if (items.length > 0) {
            const firstField = state.nodeSchema?.prerequisite_schema?.[0]?.key || 'title';
            prereqSummary.innerHTML = items.slice(0, 2).map(i => 
                `<div class="text-truncate" style="font-size: 0.72rem; color: #475569;">• ${i[firstField] || 'Item'}</div>`
            ).join('') + (items.length > 2 ? `<div style="font-size: 0.65rem; color: ${nodeColor};">+${items.length - 2} more</div>` : '');
        } else {
            prereqSummary.innerHTML = '<span class="text-muted" style="font-size: 0.72rem;">No items yet</span>';
        }
    }
    
    const riskSummary = state.modalElement.querySelector(`#tier3-risk-${state.ceId}`);
    if (riskSummary) {
        const items = state.collections.assumptions || [];
        if (items.length > 0) {
            const firstField = state.nodeSchema?.assumption_schema?.[0]?.key || 'title';
            riskSummary.innerHTML = items.slice(0, 2).map(i => 
                `<div class="text-truncate" style="font-size: 0.72rem; color: #b91c1c;">⚠ ${i[firstField] || 'Risk'}</div>`
            ).join('') + (items.length > 2 ? `<div style="font-size: 0.65rem; color: #ef4444;">+${items.length - 2} more</div>` : '');
        } else {
            riskSummary.innerHTML = '<span class="text-muted" style="font-size: 0.72rem;">No risks identified</span>';
        }
    }

    // 4. Hidden checklist update (for compat)
    const updateCheckItem = (id, isDone) => {
        const item = state.modalElement.querySelector(`#${id}`);
        if (item) {
            const icon = item.querySelector('.status-icon');
            if (icon) {
                if (isDone) icon.className = 'fas fa-check-circle text-success status-icon';
                else icon.className = 'far fa-circle text-muted status-icon';
            }
        }
    };

    updateCheckItem('chk-narrative', hasNarrative);
    updateCheckItem('chk-prereq', hasPrereq);
    updateCheckItem('chk-stakeholder', hasStakeholder);
    
    // 5. Progress dots
    const dots = state.modalElement.querySelectorAll('.ce-progress-dot');
    dots.forEach((dot, i) => {
        dot.classList.remove('active', 'complete');
        if (i < completed) dot.classList.add('complete');
        if (i === completed) dot.classList.add('active');
    });
    
    const milestoneStatus = state.modalElement.querySelector('#milestone-status');
    if (milestoneStatus) {
        const labels = ['Getting Started', 'In Progress', 'Almost There', 'Complete!'];
        milestoneStatus.textContent = labels[Math.min(completed, 3)];
    }
}

function renderSidebarPersona() {
    const header = state.modalElement.querySelector('#ai-sidebar-header');
    if(!header) return;
    
    const persona = PERSONAS[state.ceType] || PERSONAS['Default'];
    const nodeColor = state.nodeSchema?.color || '#6366f1';
    header.className = 'sidebar-persona-header';
    header.style.background = `linear-gradient(135deg, ${nodeColor}, ${nodeColor}dd)`;
    header.innerHTML = `
        <div class="d-flex align-items-center justify-content-between">
            <div class="d-flex align-items-center gap-2 text-white">
                <div class="rounded-circle d-flex align-items-center justify-content-center" style="width: 32px; height: 32px; background: rgba(255,255,255,0.2);">
                    <i class="fas ${persona.icon}"></i>
                </div>
                <span class="font-brand" style="letter-spacing:0.5px; font-size: 0.9rem;">${persona.title}</span>
            </div>
            ${state.isScanning ? '<i class="fas fa-circle-notch fa-spin text-white"></i>' : '<i class="fas fa-circle text-white fa-xs opacity-50"></i>'}
        </div>
        <div class="small text-white opacity-75 mt-1 font-body" style="font-size: 0.78rem;">${persona.greeting}</div>
    `;
}

// =============================================================================
// 6b. CONVERSATIONAL ADVOCATE: Chat Renderer & Logic
// =============================================================================

// SUA (Suggested User Action) definitions — context-aware per tab
const SUA_MAP = {
    overview: [
        { label: 'Propose Pathways', icon: 'fa-route', prompt: 'Propose distinct resolution trajectories for this node.', speculateMode: 'pathways' },
        { label: 'Draft definition', icon: 'fa-pen-fancy', prompt: 'Draft a definition for this node based on the parent condition.' },
        { label: 'Identify risks', icon: 'fa-exclamation-triangle', prompt: 'What are the key risks and assumptions for this node?' }
    ],
    prerequisites: [
        { label: 'Generate prerequisites', icon: 'fa-cubes', prompt: 'Generate prerequisites for this node.', speculateMode: 'prerequisites' },
        { label: 'Find gaps', icon: 'fa-search', prompt: 'Are there any missing prerequisites or dependency gaps?' }
    ],
    stakeholders: [
        { label: 'Find stakeholders', icon: 'fa-users', prompt: 'Who are the key stakeholders for this node?', speculateMode: 'matchmaker_stakeholders' },
        { label: 'Map network', icon: 'fa-project-diagram', prompt: 'Map the stakeholder network and identify champions vs gatekeepers.' }
    ],
    assumptions: [
        { label: 'Surface assumptions', icon: 'fa-lightbulb', prompt: 'What hidden assumptions is this node making?', speculateMode: 'assumptions' },
        { label: 'Stress test', icon: 'fa-bolt', prompt: 'Stress test the current assumptions — which ones are most fragile?' }
    ],
    resources: [
        { label: 'Find resources', icon: 'fa-toolbox', prompt: 'What tools, references, or assets would help here?', speculateMode: 'resources' },
        { label: 'Match capabilities', icon: 'fa-link', prompt: 'Match available capabilities in the SSPEC network to this node.', speculateMode: 'matchmaker_resources' }
    ],
    criteria: [
        { label: 'Extract criteria', icon: 'fa-vial', prompt: 'Extract testable success criteria from the definition.', speculateMode: 'criteria' },
        { label: 'Validate logic', icon: 'fa-check-double', prompt: 'Validate the logical consistency of current criteria.' }
    ]
};

function renderAiSidebarContent() {
    const feed = state.modalElement.querySelector('#advocate-chat-feed');
    if (!feed) return;
    const nodeColor = state.nodeSchema?.color || '#6366f1';
    const persona = PERSONAS[state.ceType] || PERSONAS['Default'];
    
    let html = '';
    
    // Welcome message if no history
    if (state.chatHistory.length === 0) {
        // Build a contextual insight for the greeting
        const totalItems = ['prerequisites', 'stakeholders', 'assumptions', 'resources', 'criteria']
            .reduce((sum, k) => sum + (state.collections[k]?.length || 0), 0);
        const firstKey = state.nodeSchema?.details_schema?.[0]?.key || 'summary';
        const hasDef = state.details_data[firstKey] && state.details_data[firstKey].length > 5;
        
        let insightLine = '';
        if (!hasDef && totalItems === 0) {
            insightLine = `This workspace is fresh — want me to draft a definition to get started?`;
        } else if (hasDef && totalItems === 0) {
            insightLine = `You have a definition but no collections yet. Want me to generate some?`;
        } else if ((state.collections.criteria?.length || 0) === 0 && totalItems > 0) {
            insightLine = `You have ${totalItems} items but no criteria yet — want me to extract some?`;
        } else {
            insightLine = `You're making good progress. How can I help?`;
        }
        
        html += `
            <div class="chat-welcome">
                <div class="chat-welcome-icon" style="background: linear-gradient(135deg, ${nodeColor}, ${nodeColor}dd);">
                    <i class="fas ${persona.icon}"></i>
                </div>
                <h6>${persona.title}</h6>
                <p>${persona.greeting}<br><span style="color: #475569; font-weight: 500;">${insightLine}</span></p>
            </div>`;
    }
    
    // Render chat history
    state.chatHistory.forEach((msg, idx) => {
        if (msg.role === 'user') {
            html += `
                <div class="chat-bubble user" style="background: linear-gradient(135deg, ${nodeColor}, ${nodeColor}dd);">
                    ${escapeHtml(msg.content)}
                </div>
                <div class="chat-bubble-meta user-meta">${formatChatTime(msg.timestamp)}</div>`;
        } else if (msg.role === 'advocate') {
            // Parse markdown in advocate messages
            let rendered = msg.content;
            if (typeof marked !== 'undefined') {
                marked.setOptions({ breaks: true, gfm: true });
                rendered = marked.parse(msg.content);
            }
            html += `
                <div class="chat-bubble advocate">
                    ${rendered}
                </div>
                <div class="chat-bubble-meta">${persona.title} · ${formatChatTime(msg.timestamp)}</div>`;
            
            // Render action card if present
            if (msg.action && !msg.action._dismissed) {
                const actionType = msg.action.action;
                const isExecuted = msg.actionExecuted;
                let cardHtml = '';
                
                if (actionType === 'inject_items') {
                    const col = msg.action.collection || 'items';
                    const count = msg.action.items?.length || 0;
                    cardHtml = `
                        <div class="chat-action-card">
                            <div class="action-header"><i class="fas fa-bolt"></i> ACTION: INJECT ${col.toUpperCase()}</div>
                            <div class="action-body">${count} ${col} ready to add to your workspace.</div>
                            <div class="action-buttons">
                                ${isExecuted 
                                    ? '<span class="badge bg-success font-data"><i class="fas fa-check me-1"></i>APPLIED</span>'
                                    : `<button class="btn btn-sm btn-success font-data rounded-pill px-3 btn-accept-action" data-msg-idx="${idx}"><i class="fas fa-check me-1"></i>Accept</button>
                                       <button class="btn btn-sm btn-light border font-data rounded-pill px-3 btn-dismiss-action" data-msg-idx="${idx}"><i class="fas fa-times me-1"></i>Dismiss</button>`
                                }
                            </div>
                        </div>`;
                } else if (actionType === 'governance_align') {
                    const count = msg.action.updates?.length || 0;
                    cardHtml = `
                        <div class="chat-action-card" style="--action-color: #f59e0b;">
                            <div class="action-header"><i class="fas fa-gavel"></i> ACTION: GOVERNANCE ALIGNMENT</div>
                            <div class="action-body">${count} criteria update${count !== 1 ? 's' : ''} proposed by the Ombud.</div>
                            <div class="action-buttons">
                                ${isExecuted 
                                    ? '<span class="badge bg-success font-data"><i class="fas fa-check me-1"></i>ALIGNED</span>'
                                    : `<button class="btn btn-sm btn-warning font-data rounded-pill px-3 btn-accept-action" data-msg-idx="${idx}"><i class="fas fa-check me-1"></i>Align</button>
                                       <button class="btn btn-sm btn-light border font-data rounded-pill px-3 btn-dismiss-action" data-msg-idx="${idx}"><i class="fas fa-times me-1"></i>Decline</button>`
                                }
                            </div>
                        </div>`;
                } else if (actionType === 'propose_pathways') {
                    const pathways = msg.action.pathways || [];
                    if (pathways.length > 0) {
                        let optionsHtml = pathways.map((p, pIdx) => {
                            let pColor = '#94a3b8'; // Default grey
                            let pIcon = 'fa-route';
                            if (p.type === 'The Hack') { pColor = '#f97316'; pIcon = 'fa-bolt'; }
                            else if (p.type === 'The Symbiosis') { pColor = '#3b82f6'; pIcon = 'fa-handshake'; }
                            else if (p.type === 'The Institution') { pColor = '#10b981'; pIcon = 'fa-university'; }
                            
                            return `
                                <div class="pathway-option-card p-2 rounded mb-2" style="background: ${pColor}0a; border: 1px solid ${pColor}40;">
                                    <div class="d-flex align-items-center gap-2 mb-1">
                                        <i class="fas ${pIcon}" style="color: ${pColor};"></i>
                                        <span class="font-brand fw-bold" style="font-size:0.85rem; color:${pColor};">${p.type}</span>
                                    </div>
                                    <div class="font-body text-muted mb-2" style="font-size:0.75rem;">${p.desc}</div>
                                    ${!isExecuted ? `<button class="btn btn-sm w-100 btn-select-pathway font-data fw-bold shadow-sm" style="background:${pColor}; color:white; font-size:0.7rem;" data-msg-idx="${idx}" data-pathway-idx="${pIdx}">SELECT PATHWAY</button>` : ''}
                                </div>
                            `;
                        }).join('');

                        cardHtml = `
                            <div class="chat-action-card w-100" style="--action-color: #8b5cf6;">
                                <div class="action-header"><i class="fas fa-code-branch"></i> ACTION: GRADIENT DESCENT</div>
                                <div class="action-body mb-2">Select a trajectory. Collections will be populated accordingly.</div>
                                <div class="d-flex flex-column w-100">
                                    ${optionsHtml}
                                </div>
                                ${isExecuted ? '<div class="mt-1"><span class="badge bg-success font-data"><i class="fas fa-check me-1"></i>PATHWAY SELECTED</span></div>' : ''}
                            </div>`;
                    }
                }
                html += cardHtml;
            }
        }
    });
    
    // Typing indicator
    if (state.isAdvocateTyping) {
        html += `
            <div class="advocate-typing" id="advocate-typing-indicator">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>`;
    }
    
    feed.innerHTML = html;
    
    // Auto-scroll to bottom
    requestAnimationFrame(() => {
        feed.scrollTop = feed.scrollHeight;
    });
}

function renderChatInputBar() {
    const inputArea = state.modalElement.querySelector('#advocate-chat-input');
    if (!inputArea) return;
    const nodeColor = state.nodeSchema?.color || '#6366f1';
    const tab = state.activeTab || 'overview';
    
    // Build SUA chips for the current context
    const suas = SUA_MAP[tab] || SUA_MAP.overview;
    const chipHtml = suas.map(s => 
        `<button class="sua-chip" style="--node-color: ${nodeColor};" data-prompt="${escapeAttr(s.prompt)}" ${s.speculateMode ? `data-speculate="${s.speculateMode}"` : ''}>
            <i class="fas ${s.icon}"></i> ${s.label}
        </button>`
    ).join('');
    
    inputArea.innerHTML = `
        <div class="sua-chip-bar">${chipHtml}</div>
        <div class="advocate-input-wrap" style="--node-color: ${nodeColor};">
            <input type="text" id="advocate-chat-input-field" 
                   placeholder="Ask about this ${state.ceType?.toLowerCase() || 'node'}..." 
                   ${state.isAdvocateTyping ? 'disabled' : ''}>
            <button class="btn-advocate-send" style="background: linear-gradient(135deg, ${nodeColor}, ${nodeColor}dd);" 
                    ${state.isAdvocateTyping ? 'disabled' : ''}>
                <i class="fas fa-arrow-up"></i>
            </button>
        </div>`;
}

function sendSpeculateMessage(text, collection) {
    if (!text?.trim() || state.isAdvocateTyping) return;
    
    // Push user message
    state.chatHistory.push({
        role: 'user',
        content: text.trim(),
        timestamp: Date.now()
    });
    
    state.isAdvocateTyping = true;
    renderAiSidebarContent();
    renderChatInputBar();

    const cosEl = state.modalElement.querySelector('[data-cos-text]');
    const cosText = cosEl?.dataset.cosText || cosEl?.textContent?.trim() || "Project Goal";

    fetch('/speculate_context', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ 
            ce_type: state.ceType, 
            context: collection, 
            sub_context: null, 
            cos_text: cosText,
            ssol_id: window.SSOL_ID || null
        })
    })
    .then(r => r.json())
    .then(data => {
        if(data.success && data.suggestions) {
            let chatContent = `I've generated some ${collection} for you using the speculation engine.`;
            let actionPayload = { action: 'inject_items', collection: collection, items: data.suggestions };
            
            if (collection === 'pathways') {
                chatContent = "I've mapped out 3 potential trajectories based on the system physics. Which approach fits your strategy?";
                actionPayload = { action: 'propose_pathways', pathways: data.suggestions };
            }

            state.chatHistory.push({
                role: 'advocate',
                content: chatContent,
                timestamp: Date.now(),
                action: actionPayload,
                actionExecuted: false
            });
        } else {
            state.chatHistory.push({
                role: 'advocate',
                content: `⚠️ Failed to generate ${collection}. Please try again.`,
                timestamp: Date.now()
            });
        }
    })
    .catch(err => {
        console.error("Speculate Bridge Error:", err);
        state.chatHistory.push({
            role: 'advocate',
            content: '⚠️ Connection lost. Please try again.',
            timestamp: Date.now()
        });
    })
    .finally(() => {
        state.isAdvocateTyping = false;
        renderAiSidebarContent();
        renderChatInputBar();
    });
}

function sendChatMessage(text) {
    if (!text?.trim() || state.isAdvocateTyping) return;
    
    // Push user message
    state.chatHistory.push({
        role: 'user',
        content: text.trim(),
        timestamp: Date.now()
    });
    
    // Update UI immediately
    state.isAdvocateTyping = true;
    renderAiSidebarContent();
    renderChatInputBar();
    
    // Build CE context snapshot for the API
    const cosEl = state.modalElement.querySelector('[data-cos-text]');
    const cosText = cosEl?.dataset.cosText || cosEl?.textContent?.trim() || '';
    
    const ceContext = {
        cos_text: cosText,
        details_data: state.details_data,
        prerequisites: state.collections.prerequisites?.length || 0,
        stakeholders: state.collections.stakeholders?.length || 0,
        assumptions: state.collections.assumptions?.length || 0,
        resources: state.collections.resources?.length || 0,
        criteria: state.collections.criteria?.length || 0
    };
    
    // Build history for API (strip timestamps, keep last 10)
    const apiHistory = state.chatHistory.slice(-11, -1).map(m => ({
        role: m.role === 'advocate' ? 'assistant' : m.role,
        content: m.content
    }));
    
    fetch('/advocate_chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: text.trim(),
            history: apiHistory,
            ce_context: ceContext,
            ce_type: state.ceType,
            active_tab: state.activeTab || 'overview',
            ssol_id: window.SSOL_ID || null
        })
    })
    .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
    })
    .then(data => {
        if (data.success) {
            state.chatHistory.push({
                role: 'advocate',
                content: data.message || 'I received your message.',
                timestamp: Date.now(),
                action: data.action || null,
                actionExecuted: false
            });
        } else {
            state.chatHistory.push({
                role: 'advocate',
                content: `⚠️ ${data.error || 'Something went wrong. Try again.'}`,
                timestamp: Date.now()
            });
        }
    })
    .catch(err => {
        console.error('Advocate Chat Error:', err);
        state.chatHistory.push({
            role: 'advocate',
            content: '⚠️ Connection lost. Please try again.',
            timestamp: Date.now()
        });
    })
    .finally(() => {
        state.isAdvocateTyping = false;
        renderAiSidebarContent();
        renderChatInputBar();
    });
}

function handleAdvocateAction(msgIdx) {
    const msg = state.chatHistory[msgIdx];
    if (!msg || !msg.action) return;

    if (msg.action.action === 'inject_items') {
        const col = msg.action.collection;
        const items = msg.action.items || [];
        
        if (state.collections[col]) {
            const formattedItems = items.map(i => ({
                id: generateUUID(),
                data: i,
                status: 'Proposed',
                tags: 'AI Generated'
            }));
            state.collections[col] = [...formattedItems, ...state.collections[col]];
        }
    } else if (msg.action.action === 'governance_align') {
        const updates = msg.action.updates || [];
        updates.forEach(upd => {
            const existing = state.collections.criteria.find(c => c.id === upd.target_id);
            if (existing) {
                existing.data = upd.updated_data;
                existing.status = 'Aligned';
            }
        });
    }
    
    msg.actionExecuted = true;
    render();
    saveDataPacket();
}

function handlePathwaySelection(msgIdx, pathwayIdx) {
    const msg = state.chatHistory[msgIdx];
    if (!msg || !msg.action || !msg.action.pathways) return;
    
    const pathway = msg.action.pathways[pathwayIdx];
    if (!pathway) return;

    if (pathway.items) {
        Object.keys(pathway.items).forEach(col => {
            if (state.collections[col]) {
                const newItems = pathway.items[col].map(item => ({
                    id: generateUUID(),
                    data: item,
                    status: 'Proposed',
                    tags: 'AI Generated'
                }));
                state.collections[col] = [...newItems, ...state.collections[col]];
            }
        });
    }
    
    msg.actionExecuted = true;
    render();
    saveDataPacket();
}

// --- Helpers ---
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
function escapeAttr(str) {
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function formatChatTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

    // Marching ants on the active tab panel
    const activeTab = state.modalElement.querySelector(`.tab-pane.active`);
    if (activeTab) activeTab.classList.add('ce-generating');

    // 2. Scrape Context (reads from data-cos-text attribute injected by ce_templates.py)
    const cosEl = state.modalElement.querySelector('[data-cos-text]');
    const contextGoal = cosEl?.dataset.cosText || cosEl?.textContent?.trim() || "Project Goal";

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
                item.linked_ce_id = null;
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
        // Remove marching ants
        const activeTab = state.modalElement.querySelector(`.tab-pane.active`);
        if (activeTab) activeTab.classList.remove('ce-generating');
        updateDashboard();
    });
}

function triggerEnhancement(fieldKey, btn = null, isAuto = false) {
    if (btn) { 
        btn.disabled = true; 
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> RUNNING ENGINE...'; 
    }

    // Marching ants on the primary card
    const primaryCard = state.modalElement.querySelector('.ce-primary-card');
    if (primaryCard) primaryCard.classList.add('ce-generating');

    const cosEl2 = state.modalElement.querySelector('[data-cos-text]');
    const cosText = cosEl2?.dataset.cosText || cosEl2?.textContent?.trim() || "Project Goal";

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
            
            // DOM Update: sync textarea + re-render markdown view
            const input = state.modalElement.querySelector(`[name="${fieldKey}"]`);
            if(input) {
                input.value = data.text;
            }
            
            // Switch back to rendered view (if in edit mode)
            const editForm = state.modalElement.querySelector('.ce-edit-form');
            const renderedView = state.modalElement.querySelector('.ce-rendered-view');
            const toggle = state.modalElement.querySelector('.ce-edit-toggle');
            if (editForm && !editForm.classList.contains('d-none')) {
                editForm.classList.add('d-none');
                renderedView?.classList.remove('d-none');
                if (toggle) {
                    toggle.classList.remove('active');
                    const lbl = toggle.querySelector('.edit-toggle-label');
                    if (lbl) lbl.textContent = 'Edit';
                    const icon = toggle.querySelector('i');
                    if (icon) icon.className = 'fas fa-pen me-1';
                }
            }

            // --- PROGRESSIVE DISCLOSURE: Unlock Workspace ---
            const initState = state.modalElement.querySelector('#ce-init-state');
            const workspace = state.modalElement.querySelector('#ce-workspace-content');
            if (initState && initState.style.display !== 'none') {
                initState.style.setProperty('display', 'none', 'important');
                if (workspace) {
                    workspace.style.opacity = '1';
                    workspace.style.pointerEvents = 'auto';
                }
            }
            
            renderPrimaryField();
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
        // Remove marching ants
        const primaryCard = state.modalElement.querySelector('.ce-primary-card');
        if (primaryCard) primaryCard.classList.remove('ce-generating');
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
        criteria: state.collections.criteria, // Looks like criteria might have been missing? Let's make sure it's here.
        connections: state.collections.connections,
        chatHistory: state.chatHistory
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
            renderChatInputBar();
        });
    }

        // B. Central Click Delegation
    m.addEventListener('click', e => {
        const t = e.target;

        // 0. Initialization Triggers
        const autoInit = t.closest('#btn-auto-init');
        if(autoInit) {
            const fieldKey = state.nodeSchema?.details_schema?.[0]?.key || 'summary';
            
            // Visual feedback for the cascading loading
            autoInit.innerHTML = '<i class="fas fa-circle-notch fa-spin me-2"></i> INITIATING SYSTEM PHYSICS...';
            autoInit.disabled = true;

            // Sequential Cascade (Narrative -> Criteria -> Prerequisites)
            // We use the existing functions. triggerEnhancement automatically shows the workspace on success.
            triggerEnhancement(fieldKey, null, true);
            
            // Simulate a delay for the subsequent calls to give the visual impression of sequential work
            setTimeout(() => {
                triggerSpeculation('criteria', null, true);
            }, 3000);
            
            setTimeout(() => {
                triggerSpeculation('prerequisites', null, true);
            }, 6000);
        }

        const manualInit = t.closest('#btn-manual-init');
        if(manualInit) {
            const initState = m.querySelector('#ce-init-state');
            const workspace = m.querySelector('#ce-workspace-content');
            if (initState) initState.style.setProperty('display', 'none', 'important');
            if (workspace) {
                workspace.style.opacity = '1';
                workspace.style.pointerEvents = 'auto';
            }
            // Enter edit mode via toggle
            const toggle = m.querySelector('.ce-edit-toggle');
            if (toggle && !toggle.classList.contains('active')) toggle.click();
        }

        // 1. AI Triggers
        const specBtn = t.closest('.btn-speculate-collection');
        if(specBtn) triggerSpeculation(specBtn.dataset.collection, specBtn);
        
        const enhBtn = t.closest('.btn-enhance-field');
        if(enhBtn) triggerEnhancement(enhBtn.dataset.field, enhBtn);
        
        const aiBtn = t.closest('.btn-trigger-ai');
        if(aiBtn) triggerSpeculation(aiBtn.dataset.context, aiBtn);
        
        // 1.5 Governance Trigger
        const advBtn = t.closest('.ce-advocate-trigger');
        if(advBtn) triggerAdvocateGovernance(advBtn);
        
        // 1.6 [Governance actions now flow through chat — see btn-accept-action handler in 5g]

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
            const col = delBtn.dataset.collection;
            state.collections[col] = state.collections[col].filter(i => i.id !== delBtn.dataset.id);
            render();
        }

        // 4. Jump Tab Links & Metric Pills (Tier 3 / Quick Insights)
        const jumpTab = t.closest('.btn-jump-tab') || t.closest('.metric-pill');
        if(jumpTab) {
            e.preventDefault();
            const target = jumpTab.dataset.target || jumpTab.dataset.collection;
            if (target) {
                const tabBtn = m.querySelector(`.ce-nav-tabs .nav-link[data-bs-target="#view-${target}-${state.ceId}"]`);
                if (tabBtn) tabBtn.click();
            }
        }

        // 5. View/Edit Toggle for Primary Field
        const editToggle = t.closest('.ce-edit-toggle');
        if(editToggle) {
            const renderedView = m.querySelector('.ce-rendered-view');
            const editForm = m.querySelector('.ce-edit-form');
            const textarea = editForm?.querySelector('textarea');
            const label = editToggle.querySelector('.edit-toggle-label');
            
            if (renderedView && editForm && textarea) {
                const isEditing = !editForm.classList.contains('d-none');
                
                if (isEditing) {
                    // Switch to VIEW mode: sync data + re-render
                    const firstKey = state.nodeSchema?.details_schema?.[0]?.key || 'summary';
                    state.details_data[firstKey] = textarea.value;
                    editForm.classList.add('d-none');
                    renderedView.classList.remove('d-none');
                    editToggle.classList.remove('active');
                    if (label) label.textContent = 'Edit';
                    editToggle.querySelector('i').className = 'fas fa-pen me-1';
                    renderPrimaryField();
                    updateDashboard();
                } else {
                    // Switch to EDIT mode
                    renderedView.classList.add('d-none');
                    editForm.classList.remove('d-none');
                    editToggle.classList.add('active');
                    if (label) label.textContent = 'Done';
                    editToggle.querySelector('i').className = 'fas fa-check me-1';
                    textarea.focus();
                }
            }
        }

        // 5b. Click rendered view to enter edit mode
        const clickedRendered = t.closest('.ce-rendered-view');
        if(clickedRendered && clickedRendered.classList.contains('is-empty')) {
            // Click placeholder → enter edit mode
            const toggle = m.querySelector('.ce-edit-toggle');
            if (toggle) toggle.click();
        }

        // 5c. View Mode Toggle
        const viewToggle = t.closest('.btn-view-toggle');
        if (viewToggle) {
            const col = viewToggle.dataset.collection;
            const view = viewToggle.dataset.view;
            if (col && view) {
                state.viewModes[col] = view;
                // Update UI state for buttons in this collection's toolbar
                const btnGroup = viewToggle.closest('.btn-group');
                if (btnGroup) {
                    btnGroup.querySelectorAll('.btn-view-toggle').forEach(btn => btn.classList.remove('active'));
                    viewToggle.classList.add('active');
                }
                renderCollectionList(col);
            }
        }

        // 5d. Sidebar Toggle (ASSISTANT button)
        const sidebarToggle = t.closest('#speculate-sidebar-toggle');
        if (sidebarToggle) {
            const sidebar = m.querySelector('.ai-sidebar');
            if (sidebar) {
                sidebar.classList.toggle('sidebar-open');
                sidebarToggle.classList.toggle('active');
                // Update button icon to reflect state
                const icon = sidebarToggle.querySelector('i');
                if (icon) {
                    if (sidebar.classList.contains('sidebar-open')) {
                        icon.className = 'fas fa-times';
                    } else {
                        icon.className = 'fas fa-sparkles';
                    }
                }
            }
        }

        // 5e. SUA Chips (Suggested User Actions)
        const suaChip = t.closest('.sua-chip');
        if (suaChip) {
            const prompt = suaChip.dataset.prompt;
            const speculateMode = suaChip.dataset.speculate;
            if (prompt) {
                // Open sidebar if not already open
                const sidebar = m.querySelector('.ai-sidebar');
                if (sidebar && !sidebar.classList.contains('sidebar-open')) {
                    sidebar.classList.add('sidebar-open');
                    const toggleBtn = m.querySelector('#speculate-sidebar-toggle');
                    if (toggleBtn) {
                        toggleBtn.classList.add('active');
                        const ic = toggleBtn.querySelector('i');
                        if (ic) ic.className = 'fas fa-times';
                    }
                }
                
                if (speculateMode && speculateMode.startsWith('matchmaker_')) {
                    const col = speculateMode.split('_')[1];
                    openMatchmakerDrawer(col);
                } else if (speculateMode) {
                    sendSpeculateMessage(prompt, speculateMode);
                } else {
                    sendChatMessage(prompt);
                }
            }
        }

        // 5f. Chat Send Button
        const sendBtn = t.closest('.btn-advocate-send');
        if (sendBtn) {
            const input = m.querySelector('#advocate-chat-input-field');
            if (input?.value?.trim()) {
                sendChatMessage(input.value);
                input.value = '';
            }
        }

        // 5g. Action Card Accept/Dismiss
        const acceptAction = t.closest('.btn-accept-action');
        if (acceptAction) {
            const idx = parseInt(acceptAction.dataset.msgIdx, 10);
            handleAdvocateAction(idx);
        }
        const dismissAction = t.closest('.btn-dismiss-action');
        if (dismissAction) {
            const idx = parseInt(dismissAction.dataset.msgIdx, 10);
            const msg = state.chatHistory[idx];
            if (msg) {
                msg.actionExecuted = true; // Mark as handled without applying
                renderAiSidebarContent();
            }
        }
        
        // 5h. Select Pathway
        const selectPathway = t.closest('.btn-select-pathway');
        if (selectPathway) {
            const msgIdx = parseInt(selectPathway.dataset.msgIdx, 10);
            const pathwayIdx = parseInt(selectPathway.dataset.pathwayIdx, 10);
            handlePathwaySelection(msgIdx, pathwayIdx);
        }

        // 5i. Matchmaker Drawer actions
        if (t.closest('.btn-close-matchmaker')) {
            const drawer = m.querySelector('#matchmaker-drawer');
            if (drawer) drawer.classList.remove('open');
        }

        const fillOpp = t.closest('.btn-fill-opportunity');
        if (fillOpp) {
            const resultsContainer = m.querySelector('#matchmaker-results');
            const matches = JSON.parse(resultsContainer.dataset.matches || '[]');
            const idx = parseInt(fillOpp.dataset.matchIdx, 10);
            const col = fillOpp.dataset.collection;
            const match = matches[idx];

            if (match && state.collections[col]) {
                const newItem = {
                    id: generateUUID(),
                    data: { name: match.name, title: match.name, expertise: 'Matched Capability', type: 'Match' },
                    status: 'Proposed',
                    tags: 'Matchmaker'
                };
                state.collections[col].unshift(newItem);
                saveDataPacket();
                render(); 
                
                const originalText = fillOpp.innerHTML;
                fillOpp.innerHTML = '<i class="fas fa-check me-1"></i>ADDED';
                fillOpp.classList.replace('btn-outline-primary', 'btn-success');
                fillOpp.classList.add('text-white');
                setTimeout(() => {
                    fillOpp.innerHTML = originalText;
                    fillOpp.classList.replace('btn-success', 'btn-outline-primary');
                    fillOpp.classList.remove('text-white');
                }, 2000);
            }
        }

        // 6. Save
        if(t.closest('.btn-save-changes')) saveDataPacket();
    });

    // B2. Chat Input: Enter-to-send
    m.addEventListener('keydown', e => {
        if (e.target.id === 'advocate-chat-input-field' && e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const input = e.target;
            if (input.value?.trim()) {
                sendChatMessage(input.value);
                input.value = '';
            }
        }
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
                data.linked_ce_id = null;
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

// --- GOVERNANCE ADVOCATE (Chat-Integrated) ---
function triggerAdvocateGovernance(btn) {
    if (btn) btn.innerHTML = '<i class="fas fa-circle-notch fa-spin me-2"></i>ANALYZING...';
    
    // Open sidebar if hidden
    const sidebar = state.modalElement.querySelector('.ai-sidebar');
    if (sidebar && !sidebar.classList.contains('sidebar-open')) {
        sidebar.classList.add('sidebar-open');
        const toggleBtn = state.modalElement.querySelector('#speculate-sidebar-toggle');
        if (toggleBtn) {
            toggleBtn.classList.add('active');
            const icon = toggleBtn.querySelector('i');
            if (icon) icon.className = 'fas fa-times';
        }
    }
    
    // Inject a system message into chat to show governance is running
    state.chatHistory.push({
        role: 'user',
        content: '🛡️ Requesting Governance Analysis — criteria integrity is compromised.',
        timestamp: Date.now()
    });
    state.isAdvocateTyping = true;
    renderAiSidebarContent();

    const failingCriteria = (state.collections.criteria || []).filter(c => ['Fail', 'Blocked', 'Violated'].includes(c.status));

    fetch('/speculate_context', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ 
            ce_type: state.ceType, 
            context: 'governance', 
            failing_criteria: failingCriteria,
            ssol_id: window.SSOL_ID || null 
        })
    })
    .then(r => r.json())
    .then(data => {
        if (btn) btn.innerHTML = '<i class="fas fa-shield-virus fa-fade me-2"></i>INTEGRITY COMPROMISED';
        if (data.success && data.report) {
            const ombud = data.report.ombud || {};
            const adv = data.report.advocate || {};
            
            // Build a rich governance response
            let govMessage = `**🔨 The Ombud** (${ombud.status || 'Violation'})\n${ombud.message || 'Criteria logic is compromised.'}\n\n`;
            govMessage += `**💡 Advocate Proposal**\n${adv.resolution || adv.insight || 'Adjust constraints to align with reality.'}\n\n`;
            govMessage += `**📊 Impact:** ${adv.impact_measurement || 'Downstream risk analysis pending.'}`;
            
            state.chatHistory.push({
                role: 'advocate',
                content: govMessage,
                timestamp: Date.now(),
                action: adv.state_updates?.length ? {
                    action: 'governance_align',
                    updates: adv.state_updates
                } : null,
                actionExecuted: false
            });
        } else {
            state.chatHistory.push({
                role: 'advocate',
                content: '⚠️ Governance analysis could not be completed.',
                timestamp: Date.now()
            });
        }
    })
    .catch(err => {
        console.error(err);
        if (btn) btn.innerHTML = '<i class="fas fa-shield-virus fa-fade me-2"></i>INTEGRITY COMPROMISED';
        state.chatHistory.push({
            role: 'advocate',
            content: '⚠️ Connection to Governance engine lost.',
            timestamp: Date.now()
        });
    })
    .finally(() => {
        state.isAdvocateTyping = false;
        renderAiSidebarContent();
    });
}

// =============================================================================
// 8. MATCHMAKER DRAWER
// =============================================================================

function openMatchmakerDrawer(collection) {
    const drawer = state.modalElement.querySelector('#matchmaker-drawer');
    const resultsContainer = state.modalElement.querySelector('#matchmaker-results');
    if (!drawer || !resultsContainer) return;

    // Show scanning UI
    drawer.classList.add('open');
    resultsContainer.innerHTML = `
        <div class="text-center py-5 matchmaker-scanning">
            <div class="radar-container mx-auto mb-3">
                <div class="radar-sweep"></div>
            </div>
            <h6 class="font-data text-primary mb-1">ANALYZING SYSTEM PHYSICS</h6>
            <p class="text-muted small">Scanning network for ${collection}...</p>
        </div>
    `;

    const cosEl = state.modalElement.querySelector('[data-cos-text]');
    const cosText = cosEl?.dataset.cosText || cosEl?.textContent?.trim() || "Project Goal";

    fetch('/matchmaker_scan', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ 
            ce_type: state.ceType, 
            target_collection: collection, 
            cos_text: cosText,
            ssol_id: window.SSOL_ID || null
        })
    })
    .then(r => r.json())
    .then(data => {
        if(data.success && data.matches) {
            renderMatchmakerResults(data.matches, collection);
        } else {
            resultsContainer.innerHTML = `<div class="p-4 text-center text-danger">⚠️ Scan failed.</div>`;
        }
    })
    .catch(err => {
        resultsContainer.innerHTML = `<div class="p-4 text-center text-danger">⚠️ Connection error.</div>`;
    });
}

function renderMatchmakerResults(matches, collection) {
    const resultsContainer = state.modalElement.querySelector('#matchmaker-results');
    if (!resultsContainer) return;

    if (matches.length === 0) {
        resultsContainer.innerHTML = `<div class="p-4 text-center text-muted">No matches found.</div>`;
        return;
    }

    const html = matches.map((m, idx) => `
        <div class="match-card p-3 border rounded mb-3 bg-white shadow-sm position-relative overflow-hidden" style="transition: all 0.2s;">
            <div class="d-flex justify-content-between align-items-start mb-2">
                <div>
                    <h6 class="font-brand mb-0">${escapeHtml(m.name || 'Unknown')}</h6>
                    <span class="badge bg-primary-soft text-primary font-data" style="font-size:0.65rem;">${collection.toUpperCase()} MATCH</span>
                </div>
                <div class="match-score-circle d-flex align-items-center justify-content-center rounded-circle font-data fw-bold" style="width:36px; height:36px; background:#f0fdf4; color:#16a34a; border: 2px solid #bbf7d0; font-size:0.8rem;">
                    ${m.match_score || 90}%
                </div>
            </div>
            <p class="text-muted small mb-3 font-body">${escapeHtml(m.rationale || 'Compatible based on system physics.')}</p>
            <button class="btn btn-sm btn-outline-primary w-100 font-data fw-bold btn-fill-opportunity" data-match-idx="${idx}" data-collection="${collection}">FILL OPPORTUNITY</button>
        </div>
    `).join('');

    resultsContainer.innerHTML = `
        <h6 class="font-data text-muted mb-3"><i class="fas fa-check-circle text-success me-2"></i>FOUND ${matches.length} HIGH-COMPATIBILITY MATCHES</h6>
        ${html}
    `;

    resultsContainer.dataset.matches = JSON.stringify(matches);
}