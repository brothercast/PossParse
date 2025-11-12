// ce_cards.js (The "Speculation Environment" Controller)

// --- STATE MANAGEMENT ---
// A single source of truth for the entire Node Application. All functions read from and write to this.
let state = {
    modalElement: null,
    ceId: null,
    ceType: null,
    details_data: {},
    resources: [],
    connections: [],
    
    // UI State
    viewMode: 'grid', // 'grid' or 'list'
    selectedResourceIds: new Set(),
    showAiSidebar: false,
    searchQuery: '',
    isSaving: false,
};

// --- RENDER FUNCTIONS ---

/**
 * The main render function. Calls all sub-renderers to update the UI based on the current state.
 */
function render() {
    if (!state.modalElement) return;
    renderToolbar();
    renderResources();
    renderBulkActionsBar();
    renderOverviewDashboard();
    toggleAiSidebar();
}

/**
 * Renders the interactive resource cards in the #resources-container.
 */
function renderResources() {
    const container = state.modalElement.querySelector('#resources-container');
    if (!container) return;

    const filteredResources = state.resources.filter(r => {
        const query = state.searchQuery.toLowerCase();
        if (!query) return true;
        const titleMatch = r.title && r.title.toLowerCase().includes(query);
        const snippetMatch = r.snippet && r.snippet.toLowerCase().includes(query);
        const tagMatch = r.tags && r.tags.some(tag => tag.toLowerCase().includes(query));
        return titleMatch || snippetMatch || tagMatch;
    });

    container.className = `resources-container p-3 flex-grow-1 ${state.viewMode}-view`;
    if (filteredResources.length === 0) {
        container.innerHTML = `<div class="text-center p-5 text-muted"><h4>No Resources Found</h4><p>Try clearing your search or use the "Speculate with AI" button to discover new items.</p></div>`;
        return;
    }
    container.innerHTML = filteredResources.map(renderResourceCard).join('');
}

/**
 * Builds the HTML for a single, rich resource card based on the mockup.
 * @param {object} resource The resource data object.
 * @returns {string} HTML string for the card.
 */
function renderResourceCard(resource) {
    const isSelected = state.selectedResourceIds.has(resource.id);
    const statusIcons = {
        'Verified': '<i class="fas fa-check-circle text-success" title="Verified"></i>',
        'Reviewed': '<i class="fas fa-eye text-info" title="Reviewed"></i>',
        'Pending': '<i class="fas fa-clock text-warning" title="Pending"></i>',
    };
    const statusIcon = statusIcons[resource.status] || '';

    return `
        <div class="card resource-card ${isSelected ? 'selected' : ''}" data-resource-id="${resource.id}">
            <div class="card-body p-3">
                <div class="d-flex align-items-start">
                    <input type="checkbox" class="form-check-input me-3 mt-1 flex-shrink-0" data-id="${resource.id}" ${isSelected ? 'checked' : ''} />
                    <div class="flex-grow-1">
                        <div class="d-flex justify-content-between align-items-center">
                            <h6 class="card-title mb-1 me-2">${statusIcon} ${resource.title || 'Untitled'}</h6>
                            ${resource.relevance ? `<span class="badge bg-primary-soft fw-bold">${resource.relevance}%</span>` : ''}
                        </div>
                        <p class="card-text small text-muted mb-2">${resource.snippet || ''}</p>
                        ${(resource.tags && resource.tags.length) ? `<div class="mt-2">${resource.tags.map(tag => `<span class="badge bg-secondary-soft me-1">${tag}</span>`).join('')}</div>` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Renders the toolbar with dynamic controls.
 */
function renderToolbar() {
    const toolbar = state.modalElement.querySelector('#resources-toolbar');
    if(!toolbar) return;

    let speculateButtonText = '<i class="fas fa-brain me-2"></i> Speculate';
    let speculateButtonTitle = 'Use the SPECULATE Engine to find new resources';
    if (state.ceType === 'Stakeholder' || state.ceType === 'Collaboration') {
        speculateButtonText = '<i class="fas fa-network-wired me-2"></i> Query Network';
        speculateButtonTitle = 'Query the SSPEC Network for contacts and organizations';
    }

    toolbar.innerHTML = `
        <div class="row g-2 align-items-center">
            <div class="col-auto">
                <div class="btn-group">
                    <button class="btn btn-primary" id="add-manual-btn" title="Add a new resource manually"><i class="fas fa-plus"></i> Add</button>
                    <button class="btn btn-info btn-speculate" id="speculate-btn" title="${speculateButtonTitle}">${speculateButtonText}</button>
                </div>
            </div>
            <div class="col">
                <div class="input-group">
                    <input type="text" id="resource-search" class="form-control" placeholder="Filter current resources..." value="${state.searchQuery}">
                    <span class="input-group-text"><i class="fas fa-search"></i></span>
                </div>
            </div>
            <div class="col-auto">
                 <div class="btn-group view-toggle-group">
                    <button class="btn btn-outline-secondary ${state.viewMode === 'grid' ? 'active' : ''}" data-view="grid" title="Grid View"><i class="fas fa-th-large"></i></button>
                    <button class="btn btn-outline-secondary ${state.viewMode === 'list' ? 'active' : ''}" data-view="list" title="List View"><i class="fas fa-bars"></i></button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Renders the bulk actions bar, showing it only when items are selected.
 */
function renderBulkActionsBar() {
    const bar = state.modalElement.querySelector('#bulk-actions-bar');
    const count = state.selectedResourceIds.size;
    bar.style.display = count > 0 ? 'flex' : 'none';
    if(count > 0) {
        bar.innerHTML = `
            <div class="d-flex justify-content-between align-items-center w-100">
                <span class="fw-bold ps-2">${count} item${count > 1 ? 's' : ''} selected</span>
                <div>
                    <button class="btn btn-sm btn-outline-secondary me-2"><i class="fas fa-tag me-1"></i> Tag</button>
                    <button class="btn btn-sm btn-outline-secondary me-2"><i class="fas fa-check-circle me-1"></i> Change Status</button>
                    <button class="btn btn-sm btn-danger" id="bulk-delete-btn"><i class="fas fa-trash-alt"></i> Delete Selected</button>
                </div>
            </div>
        `;
    }
}

/**
 * Updates all the dashboard elements on the Overview tab.
 */
function renderOverviewDashboard() {
    const statCardContainer = state.modalElement.querySelector('#overview-stat-cards');
    const connectionsContainer = state.modalElement.querySelector('#overview-connections');

    // --- 1. Update Counters on Tabs/Header ---
    state.modalElement.querySelectorAll('.resource-counter').forEach(el => el.textContent = state.resources.length);
    state.modalElement.querySelectorAll('.connection-counter').forEach(el => el.textContent = state.connections.length);
    
    // --- 2. Build the Stat Cards ---
    if (statCardContainer) {
        const verifiedCount = state.resources.filter(r => r.status === 'Verified').length;
        // Mock data for AI Insights until that feature is built
        const aiInsightsCount = 3; 
        const relevanceScores = state.resources.map(r => r.relevance).filter(Boolean);
        const avgRelevance = relevanceScores.length > 0
            ? (relevanceScores.reduce((a, b) => a + b, 0) / relevanceScores.length).toFixed(0) + '%'
            : 'N/A';
        
        const stats = [
            { label: 'Resources', value: state.resources.length, icon: 'fa-book', color: 'text-primary' },
            { label: 'Verified', value: verifiedCount, icon: 'fa-check-circle', color: 'text-success' },
            { label: 'AI Insights', value: aiInsightsCount, icon: 'fa-brain', color: 'text-info' },
            { label: 'Relevance', value: avgRelevance, icon: 'fa-bullseye', color: 'text-warning' },
        ];

        statCardContainer.innerHTML = stats.map(stat => `
            <div class="col">
                <div class="stat-card text-center">
                    <i class="fas ${stat.icon} ${stat.color} stat-icon"></i>
                    <div class="stat-value ${stat.color}">${stat.value}</div>
                    <div class="stat-label text-uppercase">${stat.label}</div>
                </div>
            </div>
        `).join('');
    }

    // --- 3. Build the Knowledge Connection Cards ---
    if (connectionsContainer) {
        // Mock data for connections until that feature is built
        const mockConnections = [
            { title: 'Sugar Sustainability', count: 2 },
            { title: 'Baking Science', count: 3 },
            { title: 'Carbon Footprint', count: 4 },
        ];
        
        connectionsContainer.innerHTML = mockConnections.map(conn => `
            <div class="col-md-4">
                <div class="connection-card">
                    <div class="fw-bold small">${conn.title}</div>
                    <div class="text-muted small">${conn.count} connections</div>
                </div>
            </div>
        `).join('');
    }
}

function toggleAiSidebar() {
    const sidebar = state.modalElement.querySelector('#ai-sidebar');
    if (sidebar) sidebar.style.display = state.showAiSidebar ? 'block' : 'none';
}

// --- ACTIONS & UI LOGIC ---

/**
 * Toggles visibility between the resource list and the editor form.
 * @param {boolean} showEditor - True to show editor, false to show list.
 * @param {object|null} resourceData - Data for editing, or null for a new resource.
 */
function showResourceEditor(showEditor, resourceData = null) {
    const listContainer = state.modalElement.querySelector('#resources-container');
    const toolbar = state.modalElement.querySelector('#resources-toolbar');
    const editor = state.modalElement.querySelector('#resource-editor-container');
    const form = state.modalElement.querySelector(`#resource-editor-form-${state.ceId}`);
    const title = state.modalElement.querySelector('#resource-editor-title');

    if (showEditor) {
        listContainer.style.display = 'none';
        toolbar.style.display = 'none';
        editor.style.display = 'block';
        form.reset();
        
        const nodeConfig = window.NODES[state.ceType] || window.NODES['Default'];
        if (resourceData) { // Edit mode
            title.textContent = 'Edit Resource';
            form.dataset.editingId = resourceData.id;
            nodeConfig.resource_schema.forEach(field => {
                const input = form.querySelector(`[name="${field.key}"]`);
                if (input) input.value = resourceData[field.key] || '';
            });
        } else { // Add new mode
            title.textContent = 'Add New Resource';
            delete form.dataset.editingId;
        }
    } else {
        listContainer.style.display = 'block';
        toolbar.style.display = 'block';
        editor.style.display = 'none';
        delete form.dataset.editingId;
    }
}

/**
 * Saves all changes from the Node Application to the backend.
 */
function saveCEChanges() {
    if (state.isSaving) return;
    state.isSaving = true;
    const saveButton = state.modalElement.querySelector('.btn-save-changes');
    const statusEl = state.modalElement.querySelector('#save-status');

    // Collect data from the Details form before saving
    const detailsForm = state.modalElement.querySelector(`#details-form-${state.ceId}`);
    if (detailsForm) {
        const detailsFormData = new FormData(detailsForm);
        state.details_data = Object.fromEntries(detailsFormData.entries());
    }

    const finalData = {
        details_data: state.details_data,
        resources: state.resources,
        connections: state.connections,
    };

    saveButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Saving...`;
    saveButton.disabled = true;

    fetch(`/update_ce/${state.ceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData)
    })
    .then(response => {
        if (!response.ok) return response.json().then(err => { throw new Error(err.error || 'Save failed'); });
        return response.json();
    })
    .then(() => {
        statusEl.textContent = `Saved at ${new Date().toLocaleTimeString()}`;
        state.modalElement.dataset.hasUnsavedChanges = 'false';
    })
    .catch(error => {
        statusEl.textContent = 'Save Failed!';
        alert(`Save Failed: ${error.message}`);
    })
    .finally(() => {
        state.isSaving = false;
        saveButton.innerHTML = `<i class="fas fa-save me-2"></i>Save Changes`;
        saveButton.disabled = false;
    });
}

// --- EVENT HANDLERS ---
function setupEventListeners() {
    const modal = state.modalElement;

    // --- Main Click Event Delegation ---
    modal.addEventListener('click', event => {
        const target = event.target;

        // Editor Workflow
        if (target.closest('#add-manual-btn')) { showResourceEditor(true, null); return; }
        if (target.closest('#cancel-edit-btn')) { showResourceEditor(false); return; }
        
        const card = target.closest('.resource-card');
        if (card && !target.matches('input[type="checkbox"]')) {
            const resourceId = card.dataset.resourceId;
            const resourceToEdit = state.resources.find(r => r.id === resourceId);
            if (resourceToEdit) showResourceEditor(true, resourceToEdit);
            return;
        }

        // Resource Selection
        const cardCheckbox = target.closest('.resource-card .form-check-input');
        if (cardCheckbox) {
            const resourceId = cardCheckbox.dataset.id;
            cardCheckbox.checked ? state.selectedResourceIds.add(resourceId) : state.selectedResourceIds.delete(resourceId);
            card.classList.toggle('selected');
            renderBulkActionsBar();
            return;
        }
        
        // Bulk Delete
        if (target.closest('#bulk-delete-btn')) {
            if (confirm(`Are you sure you want to delete ${state.selectedResourceIds.size} selected resources?`)) {
                const idsToDelete = Array.from(state.selectedResourceIds);
                state.resources = state.resources.filter(r => !idsToDelete.includes(r.id));
                state.selectedResourceIds.clear();
                render(); // Re-render everything
            }
            return;
        }

        // Toolbar: View Mode Toggles
        const viewButton = target.closest('.view-toggle-group button[data-view]');
        if (viewButton && viewButton.dataset.view !== state.viewMode) {
            state.viewMode = viewButton.dataset.view;
            render(); // Re-render the toolbar and resources
            return;
        }
        
        // Sidebar Toggles
        if (target.closest('#speculate-sidebar-toggle')) { state.showAiSidebar = true; toggleAiSidebar(); return; }
        if (target.closest('#close-sidebar-btn')) { state.showAiSidebar = false; toggleAiSidebar(); return; }
        
        // Save Button
        if (target.closest('.btn-save-changes')) { saveCEChanges(); return; }
    });
    
    // --- Form & Input Event Delegation ---
    // Resource Editor Form Submission
    modal.addEventListener('submit', event => {
        if (event.target.id === `resource-editor-form-${state.ceId}`) {
            event.preventDefault();
            const form = event.target;
            const formData = new FormData(form);
            const resourceObject = Object.fromEntries(formData.entries());
            const editingId = form.dataset.editingId;

            if (editingId) { // Update existing
                const index = state.resources.findIndex(r => r.id === editingId);
                if (index > -1) state.resources[index] = { ...state.resources[index], ...resourceObject };
            } else { // Add new
                resourceObject.id = self.crypto.randomUUID();
                state.resources.push(resourceObject);
            }
            
            modal.dataset.hasUnsavedChanges = 'true';
            showResourceEditor(false);
            render();
        }
    });

    // Search input with debounce
    let searchTimeout;
    modal.addEventListener('input', event => {
        modal.dataset.hasUnsavedChanges = 'true'; // Flag any input change
        if (event.target.id === 'resource-search') {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                state.searchQuery = event.target.value;
                renderResources();
            }, 300);
        }
    });
}


// --- INITIALIZATION ---
/**
 * Main function to display the modal. This is the primary export.
 */
export function displayCEModal(modalHtml, ceId, p_ceType, ceData) {
    const modalContainer = document.getElementById('dynamicModalContainer');
    modalContainer.innerHTML = modalHtml;
    const modalElement = document.getElementById(`ceModal-${ceId}`);
    if (!modalElement) return console.error('Modal element not found after injection.');

    const modal = new bootstrap.Modal(modalElement);
    
    modalElement.addEventListener('shown.bs.modal', () => {
        state = {
            modalElement, ceId, ceType: p_ceType,
            details_data: ceData?.data?.details_data || {},
            resources: (ceData?.data?.resources || []).map(r => ({ ...r, id: r.id || self.crypto.randomUUID() })),
            connections: ceData?.data?.connections || [],
            viewMode: 'grid', selectedResourceIds: new Set(), showAiSidebar: false, searchQuery: '', isSaving: false,
        };
        render(); // Initial render
        setupEventListeners();
    }, { once: true });

    modalElement.addEventListener('hidden.bs.modal', (event) => {
        if(modalElement.dataset.hasUnsavedChanges === 'true') {
            if(!confirm("You have unsaved changes that will be lost. Are you sure you want to close?")) {
                event.preventDefault();
                return;
            }
        }
        modalElement.remove(); // Cleanup DOM
    });

    modal.show();
}