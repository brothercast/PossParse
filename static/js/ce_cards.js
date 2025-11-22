// ce_cards.js (The Speculation Environment Controller - Phase 4 Final)

// --- STATE MANAGEMENT ---
let state = {
    modalElement: null,
    ceId: null,
    ceType: null,
    activeTab: 'overview',
    // Unified storage for all list-based data
    collections: {
        prerequisites: [],
        stakeholders: [],
        assumptions: [],
        resources: [],
        connections: []
    },
    // Storage for text-based form data (Narrative)
    details_data: {},
    isSaving: false,
    sidebarContext: 'Overview'
};

// --- INITIALIZATION ---

/**
 * Main entry point called by the parent page to launch the modal.
 * @param {string} modalHtml - The raw HTML string of the modal shell.
 * @param {string} ceId - The UUID of the Conditional Element.
 * @param {string} p_ceType - The Node Type (e.g., 'Risk', 'Research').
 * @param {object} ceData - The existing data payload from the database.
 */
export function displayCEModal(modalHtml, ceId, p_ceType, ceData) {
    const modalContainer = document.getElementById('dynamicModalContainer');
    modalContainer.innerHTML = modalHtml;
    const modalElement = document.getElementById(`ceModal-${ceId}`);
    
    // Bootstrap Modal Instance
    const modal = new bootstrap.Modal(modalElement);

    modalElement.addEventListener('shown.bs.modal', () => {
        // Hydrate State from DB or set defaults
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
            isSaving: false,
            sidebarContext: 'Overview'
        };
        
        render(); 
        setupEventListeners();
        
        // --- THE "ONE-HIT" TRIGGER ---
        checkAndTriggerAutoPopulation();

    }, { once: true });

    // Cleanup on close
    modalElement.addEventListener('hidden.bs.modal', () => {
        modalElement.remove();
    });

    modal.show();
}

// --- AUTOMATION LOGIC ---

function checkAndTriggerAutoPopulation() {
    // Heuristic: If all collections are empty, this is a "Fresh Node".
    const isFresh = ['prerequisites', 'stakeholders', 'assumptions'].every(key => 
        state.collections[key].length === 0
    );

    if (isFresh) {
        console.log("Fresh Node Detected. Initiating System Scan...");
        
        // Visual Feedback in the Status Card
        const statusValue = state.modalElement.querySelector('.status-card-value');
        if (statusValue) {
            statusValue.innerHTML = '<span class="text-primary"><i class="fas fa-circle-notch fa-spin"></i> INITIATING...</span>';
        }

        // 1. Draft the Narrative Summary first
        triggerEnhancement('summary', null, true);

        // 2. Sequential Generation of Strategic Layers (Staggered for effect)
        // We don't generate Resources automatically yet, just the logic layers.
        setTimeout(() => triggerSpeculation('prerequisites'), 1000);
        setTimeout(() => triggerSpeculation('stakeholders'), 2500);
        setTimeout(() => triggerSpeculation('assumptions'), 4000);
    }
}

// --- RENDER PIPELINE ---

function render() {
    if (!state.modalElement) return;
    
    renderAllCollections();
    updateDashboard(); // Calculates progress and updates metrics
    renderAiSidebar();
}

function renderAllCollections() {
    // Loop through each collection type and render its specific list
    ['prerequisites', 'stakeholders', 'assumptions', 'resources', 'connections'].forEach(type => {
        renderCollectionList(type);
    });
}

/**
 * Renders cards for a specific collection. Handles "Ghost States" and "Proposed Items".
 */
function renderCollectionList(type) {
    const container = state.modalElement.querySelector(`#container-${type}-${state.ceId}`);
    if (!container) return;

    const items = state.collections[type] || [];
    
    // 1. GHOST STATE (Empty Tab)
    if (items.length === 0) {
        let emptyMsg = "No items defined.";
        let btnText = "Auto-Generate";
        let icon = "fa-wind";

        if (type === 'prerequisites') { emptyMsg = "Define dependencies to clear the path."; btnText = "Speculate Prerequisites"; icon = "fa-tasks"; }
        if (type === 'stakeholders') { emptyMsg = "Map the human network."; btnText = "Query SSPEC Network"; icon = "fa-users"; }
        if (type === 'assumptions') { emptyMsg = "Identify risks and theories."; btnText = "Analyze Risks"; icon = "fa-shield-alt"; }
        if (type === 'resources') { emptyMsg = "Gather evidence and assets."; btnText = "Find Resources"; icon = "fa-database"; }

        container.innerHTML = `
            <div class="ghost-state">
                <div class="ghost-icon-container"><i class="fas ${icon} fa-2x"></i></div>
                <h5 class="text-uppercase mb-2" style="font-family:'Unica One'">System Standing By</h5>
                <p class="text-muted small mb-4">${emptyMsg}</p>
                <button class="btn btn-primary px-4 btn-speculate-collection shadow-sm" data-collection="${type}">
                    <i class="fas fa-magic me-2"></i> ${btnText}
                </button>
            </div>`;
        return;
    }

    // 2. CARD LIST
    container.innerHTML = items.map(item => {
        // Smart Title detection based on schema variations
        const mainText = item.title || item.name || item.hypothesis || item.risk_vector || item.event || 'Untitled';
        const subText = item.role || item.risk || item.status || item.impact || item.url || '';
        
        // "Proposed" (AI) vs "Active" (User) detection
        const isProposed = item.tags && (item.tags.includes("AI") || item.tags.includes("Proposed"));
        
        // Styling logic
        const cardClass = isProposed 
            ? 'card mb-2 proposed-item' 
            : 'card mb-2 border shadow-sm collection-card';
        
        const badge = isProposed 
            ? `<span class="badge badge-proposed border ms-2">AI PROPOSED</span>` 
            : '';

        // Button Logic
        let actionsHtml = '';
        if (isProposed) {
            actionsHtml = `
                <button class="btn btn-sm btn-outline-success btn-accept-item me-1" title="Accept" data-collection="${type}" data-id="${item.id}"><i class="fas fa-check"></i></button>
                <button class="btn btn-sm btn-light text-danger btn-delete-item" title="Reject" data-collection="${type}" data-id="${item.id}"><i class="fas fa-times"></i></button>
            `;
        } else {
            actionsHtml = `
                <button class="btn btn-sm btn-light text-muted btn-edit-item" data-collection="${type}" data-id="${item.id}"><i class="fas fa-pencil-alt"></i></button>
                <button class="btn btn-sm btn-light text-danger btn-delete-item" data-collection="${type}" data-id="${item.id}"><i class="fas fa-trash"></i></button>
            `;
        }

        return `
        <div class="${cardClass}">
            <div class="card-body p-3 d-flex justify-content-between align-items-start">
                <div class="flex-grow-1 me-3">
                    <div class="d-flex align-items-center mb-1">
                        <h6 class="fw-bold mb-0 text-dark">${mainText}</h6>
                        ${badge}
                    </div>
                    <div class="small text-muted text-truncate" style="max-width: 450px;">${subText}</div>
                </div>
                <div class="btn-group">
                    ${actionsHtml}
                </div>
            </div>
        </div>`;
    }).join('');
}

// --- DASHBOARD NERVOUS SYSTEM ---

function updateDashboard() {
    // 1. Update Tab Badges (e.g., "Prerequisites (3)")
    ['prerequisites', 'stakeholders', 'assumptions', 'resources', 'connections'].forEach(key => {
        const count = (state.collections[key] || []).length;
        const badge = state.modalElement.querySelector(`.count-badge[data-collection="${key}"]`);
        if (badge) {
            badge.textContent = count;
            if(count > 0) {
                badge.classList.remove('bg-light', 'text-dark');
                badge.classList.add('bg-primary', 'text-white');
            }
        }
    });

    // 2. Calculate "Readiness" (Analog Progress)
    // This logic mimics "checking off" items for the project phase.
    let points = 0;
    let maxPoints = 60; // Hypothetical goal
    
    // Points for items existing
    Object.values(state.collections).flat().forEach(item => {
        points += 5;
        // Bonus points for verified status
        if (item.status === 'Verified' || item.status === 'Met' || item.status === 'Signed') {
            points += 5; 
        }
    });

    // Points for Narrative fields
    if (state.details_data.summary && state.details_data.summary.length > 10) points += 10;
    
    const percentage = Math.min(100, Math.floor((points / maxPoints) * 100));

    // Update UI Bars
    const bar = state.modalElement.querySelector('#ce-progress-bar');
    const label = state.modalElement.querySelector('#ce-progress-label');
    if (bar) bar.style.width = `${percentage}%`;
    if (label) label.textContent = `${percentage}%`;

    // 3. Update Main Status Text based on Readiness
    const statusText = state.modalElement.querySelector('.status-card-value');
    
    // Don't overwrite the "INITIATING" spinner if it's active
    if (statusText && !statusText.innerHTML.includes('fa-spin')) { 
        if (percentage === 0) statusText.textContent = "INITIALIZED";
        else if (percentage < 30) statusText.textContent = "CALIBRATING";
        else if (percentage < 80) statusText.textContent = "ACTIVE";
        else statusText.innerHTML = "<span class='text-success'>OPTIMIZED</span>";
    }
}

function renderAiSidebar() {
    const content = state.modalElement.querySelector('#ai-sidebar-content');
    if (!content) return;

    let actionsHtml = '';
    const ctx = state.activeTab; // e.g., 'prerequisites'

    // Context-Aware Sidebar Actions
    if (ctx === 'overview') {
        actionsHtml = `
            <button class="btn btn-sm btn-light w-100 text-start mb-2 border shadow-sm"><i class="fas fa-search-dollar me-2 text-success"></i> Analyze Cost Impact</button>
            <button class="btn btn-sm btn-light w-100 text-start mb-2 border shadow-sm"><i class="fas fa-exclamation-triangle me-2 text-warning"></i> Identify Critical Risks</button>
        `;
    } else if (ctx === 'stakeholders') {
        actionsHtml = `
            <button class="btn btn-sm btn-light w-100 text-start mb-2 border shadow-sm"><i class="fas fa-user-plus me-2 text-primary"></i> Suggest Key Players</button>
            <button class="btn btn-sm btn-light w-100 text-start mb-2 border shadow-sm"><i class="fas fa-handshake me-2 text-info"></i> Draft Outreach Email</button>
        `;
    } else if (ctx === 'narrative' || ctx === 'details') {
        actionsHtml = `
            <button class="btn btn-sm btn-light w-100 text-start mb-2 border shadow-sm"><i class="fas fa-magic me-2 text-purple"></i> Polish Narrative Tone</button>
        `;
    } else {
        actionsHtml = `
            <button class="btn btn-sm btn-light w-100 text-start mb-2 border shadow-sm"><i class="fas fa-lightbulb me-2 text-warning"></i> Generate Ideas</button>
        `;
    }

    content.innerHTML = `
        <div class="mb-4">
            <h6 class="small fw-bold text-muted text-uppercase mb-3">Active Context: ${ctx.toUpperCase()}</h6>
            ${actionsHtml}
        </div>
        <div class="mt-auto border-top pt-3">
            <label class="small fw-bold text-muted mb-1">Ask SPECULATE</label>
            <div class="input-group">
                <input type="text" class="form-control form-control-sm" placeholder="Query this node...">
                <button class="btn btn-primary btn-sm"><i class="fas fa-paper-plane"></i></button>
            </div>
        </div>
    `;
}

// --- SPECULATE ENGINE ACTIONS ---

/**
 * Triggers generation for a collection list (e.g., generating 3 prerequisites).
 */
function triggerSpeculation(collectionType, buttonElement = null) {
    let originalHtml = '';
    if(buttonElement) {
        originalHtml = buttonElement.innerHTML;
        buttonElement.disabled = true;
        buttonElement.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> Thinking...`;
    }

    // Scrape context (Source COS) from the DOM
    const cosText = state.modalElement.querySelector('.source-cos-card p')?.textContent.trim() || "Goal";

    fetch('/speculate_context', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            ce_type: state.ceType,
            context: collectionType, // 'prerequisites', etc.
            cos_text: cosText,
            current_items: state.collections[collectionType]
        })
    })
    .then(res => res.json())
    .then(data => {
        if(data.success && data.suggestions) {
            data.suggestions.forEach(item => {
                item.id = self.crypto.randomUUID();
                item.tags = "AI"; // Mark as Proposed
                item.status = "Pending Review";
                state.collections[collectionType].push(item);
            });
            render(); // Re-render to show new items
        } else {
            console.error("Speculation failed:", data.error);
        }
    })
    .catch(err => console.error("Network error:", err))
    .finally(() => {
        if(buttonElement) {
            buttonElement.disabled = false;
            buttonElement.innerHTML = originalHtml;
        }
        // If we triggered the "SCANNING" state, clear it now
        const statusText = state.modalElement.querySelector('.status-card-value');
        if (statusText && statusText.textContent.includes('INITIATING')) {
            updateDashboard(); // Re-run logic to set correct text
        }
    });
}

/**
 * Triggers text enhancement for specific fields (e.g., rewriting the summary).
 */
function triggerEnhancement(fieldKey, buttonElement = null, isAuto = false) {
    if (buttonElement) {
        buttonElement.disabled = true;
        buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }

    const cosText = state.modalElement.querySelector('.source-cos-card p')?.textContent.trim() || "Goal";

    fetch('/speculate_context', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            ce_type: state.ceType,
            context: 'narrative', // Special context routed in Python
            sub_context: fieldKey, // e.g., 'summary'
            cos_text: cosText
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.text) {
            state.details_data[fieldKey] = data.text;
            // Update the textarea immediately if visible
            const input = state.modalElement.querySelector(`[name="${fieldKey}"]`);
            if (input) input.value = data.text;
            updateDashboard();
        }
    })
    .finally(() => {
        if (buttonElement) {
            buttonElement.disabled = false;
            buttonElement.innerHTML = '<i class="fas fa-magic"></i>';
        }
    });
}

// --- EVENT HANDLING & EDITORS ---

function setupEventListeners() {
    const modal = state.modalElement;

    // 1. Context Switching (Tabs)
    const navTabs = modal.querySelector('.ce-nav-tabs');
    if(navTabs) {
        navTabs.addEventListener('shown.bs.tab', event => {
            const targetId = event.target.getAttribute('data-bs-target'); // #view-prerequisites-ID
            // Extract middle part (e.g. 'prerequisites')
            // Handle potential ID format variations safely
            if (targetId.includes('overview')) state.activeTab = 'overview';
            else if (targetId.includes('details')) state.activeTab = 'narrative'; // Mapped to 'Narrative'
            else {
                const parts = targetId.split('-');
                if(parts.length >= 2) state.activeTab = parts[1]; 
            }
            renderAiSidebar();
        });
    }

    // 2. Unified Click Delegation
    modal.addEventListener('click', event => {
        const t = event.target;

        // --- BUTTONS: Speculate / Enhance ---
        const specBtn = t.closest('.btn-speculate-collection');
        if (specBtn) triggerSpeculation(specBtn.dataset.collection, specBtn);

        const enhanceBtn = t.closest('.btn-enhance-field');
        if (enhanceBtn) triggerEnhancement(enhanceBtn.dataset.field, enhanceBtn);

        // --- BUTTONS: Add / Edit / Cancel ---
        const addBtn = t.closest('.btn-add-item');
        if (addBtn) toggleEditor(addBtn.dataset.collection, true);

        const cancelBtn = t.closest('.btn-cancel-edit');
        if (cancelBtn) {
            // Find which editor we are in
            const form = cancelBtn.closest('form');
            toggleEditor(form.dataset.collection, false);
        }

        const editBtn = t.closest('.btn-edit-item');
        if (editBtn) {
            const type = editBtn.dataset.collection;
            const id = editBtn.dataset.id;
            const item = state.collections[type].find(i => i.id === id);
            if(item) toggleEditor(type, true, item);
        }

        // --- BUTTONS: Item Actions (Accept / Delete) ---
        const acceptBtn = t.closest('.btn-accept-item');
        if (acceptBtn) {
            const type = acceptBtn.dataset.collection;
            const item = state.collections[type].find(i => i.id === acceptBtn.dataset.id);
            if (item) {
                item.tags = ""; // Remove AI tag
                item.status = "Active"; // Promote to Active
                render(); // Re-render to change style from dashed to solid
            }
        }

        const deleteBtn = t.closest('.btn-delete-item');
        if (deleteBtn) {
            if(confirm("Remove this item?")) {
                const type = deleteBtn.dataset.collection;
                state.collections[type] = state.collections[type].filter(i => i.id !== deleteBtn.dataset.id);
                render();
            }
        }

        // --- BUTTONS: Main Save ---
        if (t.closest('.btn-save-changes')) saveDataPacket();
    });

    // 3. Form Submission (Generic Editor)
    modal.addEventListener('submit', event => {
        if (event.target.classList.contains('editor-form')) {
            event.preventDefault();
            const form = event.target;
            const type = form.dataset.collection;
            const fd = new FormData(form);
            const newData = Object.fromEntries(fd.entries());

            if (form.dataset.editingId) {
                // Update Existing
                const idx = state.collections[type].findIndex(i => i.id === form.dataset.editingId);
                if (idx > -1) state.collections[type][idx] = { ...state.collections[type][idx], ...newData };
            } else {
                // Create New
                newData.id = self.crypto.randomUUID();
                state.collections[type].push(newData);
            }
            
            toggleEditor(type, false);
            render();
        }
    });

    // 4. Narrative Inputs (Auto-save to state on typing)
    const detailForm = modal.querySelector(`#narrative-form-${state.ceId}`);
    if (detailForm) {
        detailForm.addEventListener('input', (e) => {
            state.details_data[e.target.name] = e.target.value;
            // No full render() here to avoid losing focus, just quiet state update
            updateDashboard(); // Update progress bar silently
        });
    }
}

function toggleEditor(type, show, itemData = null) {
    const container = state.modalElement.querySelector(`#container-${type}-${state.ceId}`);
    const editor = state.modalElement.querySelector(`#editor-${type}-${state.ceId}`);
    const form = editor.querySelector('form');

    if (show) {
        container.style.display = 'none';
        editor.style.display = 'block';
        form.reset();
        if (itemData) {
            form.dataset.editingId = itemData.id;
            // Populate fields
            Object.keys(itemData).forEach(key => {
                const input = form.querySelector(`[name="${key}"]`);
                if(input) {
                    if(input.type === 'checkbox') input.checked = true; 
                    else input.value = itemData[key];
                }
            });
        } else {
            delete form.dataset.editingId;
        }
    } else {
        container.style.display = 'block';
        editor.style.display = 'none';
    }
}

function saveDataPacket() {
    if (state.isSaving) return;
    state.isSaving = true;
    const btn = state.modalElement.querySelector('.btn-save-changes');
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Saving...';

    // Construct Packet
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
    .then(res => res.json())
    .then(data => {
        if(data.success) {
            const status = state.modalElement.querySelector('#save-status');
            if(status) status.innerHTML = `<i class="fas fa-check-circle text-success"></i> Saved at ${new Date().toLocaleTimeString()}`;
            
            btn.classList.replace('btn-primary', 'btn-success');
            btn.innerHTML = '<i class="fas fa-check"></i> Saved';
            setTimeout(() => {
                btn.classList.replace('btn-success', 'btn-primary');
                btn.innerHTML = originalHtml;
            }, 2000);
        }
    })
    .catch(err => {
        console.error("Save failed", err);
        alert("Failed to save data packet.");
    })
    .finally(() => {
        state.isSaving = false;
    });
}