// ce_cards.js

let state = {
    modalElement: null,
    ceId: null,
    ceType: null,
    activeTab: 'overview',
    // We now store all collections in a unified object
    collections: {
        prerequisites: [],
        stakeholders: [],
        assumptions: [],
        resources: [],
        connections: []
    },
    details_data: {},
    aiSidebarContent: '', // Cache content
};

function render() {
    if (!state.modalElement) return;
    renderProgressBar();
    renderAllCollections(); // Renders all lists (prerequisites, stakeholders, etc.)
    renderAiSidebar();
    updateCounts();
}

function renderAllCollections() {
    ['prerequisites', 'stakeholders', 'assumptions', 'resources'].forEach(type => {
        renderCollection(type);
    });
}

// Generic renderer for any list-based tab
function renderCollection(type) {
    const container = state.modalElement.querySelector(`#container-${type}-${state.ceId}`);
    if (!container) return;

    const items = state.collections[type] || [];
    
    if (items.length === 0) {
        container.innerHTML = `
            <div class="text-center p-5 text-muted border border-dashed rounded">
                <i class="fas fa-folder-open fa-2x mb-3 opacity-25"></i>
                <p>No ${type} added yet.</p>
            </div>`;
        return;
    }

    // Generate Card HTML based on data
    container.innerHTML = items.map(item => `
        <div class="card mb-2 border-start-0 border-end-0 border-top-0 border-bottom shadow-sm" style="border-left: 4px solid var(--phase-color) !important;">
            <div class="card-body p-3 d-flex justify-content-between align-items-start">
                <div>
                    <h6 class="fw-bold mb-1">${item.title || item.name || item.hypothesis || 'Untitled'}</h6>
                    <p class="small text-muted mb-0 text-truncate" style="max-width: 400px;">
                        ${item.role || item.risk || item.url || ''}
                    </p>
                     ${item.tags ? `<span class="badge bg-light text-dark border mt-2">${item.tags}</span>` : ''}
                </div>
                <button class="btn btn-sm btn-light text-primary btn-edit-item" 
                    data-collection="${type}" data-id="${item.id}">
                    <i class="fas fa-edit"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function renderAiSidebar() {
    const content = state.modalElement.querySelector('#ai-sidebar-content');
    if (!content) return;

    let actionsHtml = '';
    
    // Context-Aware Actions
    if (state.activeTab === 'overview') {
        actionsHtml = `
            <button class="btn btn-sm btn-light w-100 text-start mb-2 border"><i class="fas fa-rocket text-primary me-2"></i> Suggest Critical Path</button>
            <button class="btn btn-sm btn-light w-100 text-start mb-2 border"><i class="fas fa-microchip text-primary me-2"></i> Analyze Feasibility</button>
        `;
    } else if (state.activeTab === 'stakeholders') {
        actionsHtml = `
            <button class="btn btn-sm btn-light w-100 text-start mb-2 border"><i class="fas fa-user-plus text-success me-2"></i> Identify Key Players</button>
            <button class="btn btn-sm btn-light w-100 text-start mb-2 border"><i class="fas fa-handshake text-info me-2"></i> Suggest Alignment Strategy</button>
        `;
    } else if (state.activeTab === 'assumptions') {
        actionsHtml = `
            <button class="btn btn-sm btn-light w-100 text-start mb-2 border"><i class="fas fa-shield-alt text-warning me-2"></i> Challenge Assumptions</button>
        `;
    } else {
        // Default
        actionsHtml = `
            <button class="btn btn-sm btn-light w-100 text-start mb-2 border"><i class="fas fa-lightbulb text-warning me-2"></i> Generate Ideas</button>
        `;
    }

    content.innerHTML = `
        <div class="mb-4">
            <h6 class="small fw-bold text-muted text-uppercase mb-3">Context: ${state.activeTab}</h6>
            ${actionsHtml}
        </div>
        <div class="mb-4">
            <h6 class="small fw-bold text-muted text-uppercase mb-3">Chat</h6>
            <textarea class="form-control form-control-sm mb-2" rows="3" placeholder="Ask SPECULATE..."></textarea>
            <button class="btn btn-primary btn-sm w-100">Send</button>
        </div>
    `;
}

function updateCounts() {
    state.modalElement.querySelectorAll('.count-badge').forEach(badge => {
        const type = badge.dataset.collection;
        if (state.collections[type]) {
            badge.textContent = state.collections[type].length;
        }
    });
    
    // Overall progress (mock logic)
    const totalItems = Object.values(state.collections).flat().length;
    const progress = Math.min(100, totalItems * 5);
    const bar = state.modalElement.querySelector('#ce-progress-bar');
    const label = state.modalElement.querySelector('#ce-progress-label');
    if (bar) bar.style.width = `${progress}%`;
    if (label) label.textContent = `${progress}%`;
}

// --- ACTIONS ---

function toggleEditor(collectionType, show, itemData = null) {
    const container = state.modalElement.querySelector(`#container-${collectionType}-${state.ceId}`);
    const editor = state.modalElement.querySelector(`#editor-${collectionType}-${state.ceId}`);
    const form = editor.querySelector('form');

    if (show) {
        container.style.display = 'none';
        editor.style.display = 'block';
        form.reset();
        // Pre-fill if editing
        if (itemData) {
            form.dataset.editingId = itemData.id;
            Object.keys(itemData).forEach(key => {
                const input = form.querySelector(`[name="${key}"]`);
                if (input) input.value = itemData[key];
            });
        } else {
            delete form.dataset.editingId;
        }
    } else {
        container.style.display = 'block';
        editor.style.display = 'none';
        delete form.dataset.editingId;
    }
}

// --- LISTENERS ---

function setupEventListeners() {
    const modal = state.modalElement;

    // Tab Switching -> Update Sidebar Context
    const tabEl = modal.querySelector('.ce-nav-tabs');
    if (tabEl) {
        tabEl.addEventListener('shown.bs.tab', event => {
            const targetId = event.target.getAttribute('data-bs-target'); // e.g. #view-stakeholders-UUID
            // Extract middle part "stakeholders"
            const parts = targetId.split('-');
            state.activeTab = parts[1]; 
            renderAiSidebar();
        });
    }

    modal.addEventListener('click', event => {
        const t = event.target;
        
        // Add Item Button
        const addBtn = t.closest('.btn-add-item');
        if (addBtn) {
            toggleEditor(addBtn.dataset.collection, true);
        }

        // Cancel Edit Button
        if (t.closest('.btn-cancel-edit')) {
            // Find parent collection type
            const editor = t.closest('.collection-editor');
            const type = editor.id.split('-')[1];
            toggleEditor(type, false);
        }
        
        // Edit specific item
        const editBtn = t.closest('.btn-edit-item');
        if (editBtn) {
            const type = editBtn.dataset.collection;
            const id = editBtn.dataset.id;
            const item = state.collections[type].find(i => i.id === id);
            if (item) toggleEditor(type, true, item);
        }
        
        // Save Main Button
        if (t.closest('.btn-save-changes')) {
            saveDataPacket();
        }
    });

    // Form Submissions (Generic Handler for all collection editors)
    modal.addEventListener('submit', event => {
        if (event.target.classList.contains('editor-form')) {
            event.preventDefault();
            const form = event.target;
            const type = form.dataset.collection;
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            if (form.dataset.editingId) {
                // Update
                const index = state.collections[type].findIndex(i => i.id === form.dataset.editingId);
                if (index > -1) state.collections[type][index] = { ...state.collections[type][index], ...data };
            } else {
                // Add
                data.id = self.crypto.randomUUID();
                state.collections[type].push(data);
            }
            
            toggleEditor(type, false);
            render();
        }
    });
}

function saveDataPacket() {
    const btn = state.modalElement.querySelector('.btn-save-changes');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    
    // Harvest text areas from Narrative tab
    const narrativeForm = state.modalElement.querySelector(`#narrative-form-${state.ceId}`);
    if(narrativeForm) {
        const fd = new FormData(narrativeForm);
        state.details_data = Object.fromEntries(fd.entries());
    }

    // Build Packet matching `CE` model `data` JSON structure
    const packet = {
        details_data: state.details_data,
        resources: state.collections.resources,
        prerequisites: state.collections.prerequisites,
        stakeholders: state.collections.stakeholders,
        assumptions: state.collections.assumptions,
        connections: state.collections.connections
    };

    fetch(`/update_ce/${state.ceId}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(packet)
    }).then(res => res.json()).then(data => {
        btn.innerHTML = '<i class="fas fa-check"></i> Saved';
        setTimeout(() => btn.innerHTML = 'Save Changes', 2000);
    });
}

export function displayCEModal(modalHtml, ceId, p_ceType, ceData) {
    const modalContainer = document.getElementById('dynamicModalContainer');
    modalContainer.innerHTML = modalHtml;
    const modalElement = document.getElementById(`ceModal-${ceId}`);
    const modal = new bootstrap.Modal(modalElement);

    modalElement.addEventListener('shown.bs.modal', () => {
        const d = ceData?.data || {};
        state = {
            modalElement, ceId, ceType: p_ceType, activeTab: 'overview',
            collections: {
                prerequisites: d.prerequisites || [],
                stakeholders: d.stakeholders || [],
                assumptions: d.assumptions || [],
                resources: d.resources || [],
                connections: d.connections || []
            },
            details_data: d.details_data || {},
        };
        render();
        setupEventListeners();
    }, { once: true });

    modalElement.addEventListener('hidden.bs.modal', () => modalElement.remove());
    modal.show();
}