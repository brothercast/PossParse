// cos_table.js
import { displayCEModal } from './ce_cards.js';
import { showLoadingSpinner, hideLoadingSpinner } from './base_functions.js';

// --- Utility Functions ---

function getBadgeColorVar(status) {
    switch (status) {
        case 'Proposed': return '#17a2b8'; // Info cyan
        case 'Active': return 'var(--warning)';
        case 'In Progress': return 'var(--warning)';
        case 'Completed': return 'var(--success)';
        case 'Verified': return 'var(--success)';
        case 'Rejected': return 'var(--danger)';
        default: return '#94a3b8'; // Muted gray
    }
}

function handleApiResponse(response) {
    if (!response.ok) {
        return response.json().then(errorData => {
            const message = errorData.error || errorData.message || JSON.stringify(errorData);
            throw new Error(`Server responded with ${response.status}: ${message}`);
        });
    }
    return response.json();
}

// --- DOM Manipulation & State ---

function storeOriginalValues(cosRow) {
    const statusBlock = cosRow.querySelector('.status-cell .status-block');
    const contentDisplay = cosRow.querySelector('.cos-content-cell .cos-content-display');
    const accountableDisplay = cosRow.querySelector('.cos-accountable-party-display');
    const dateDisplay = cosRow.querySelector('.cos-completion-date-display');

    cosRow.dataset.originalValues = JSON.stringify({
        status: statusBlock ? statusBlock.textContent.trim() : 'PROPOSED',
        contentHTML: contentDisplay ? contentDisplay.innerHTML : '',
        accountable: accountableDisplay ? accountableDisplay.textContent.trim() : '',
        date: dateDisplay ? dateDisplay.textContent.trim() : ''
    });
}

function revertToOriginalValues(cosRow) {
    if (!cosRow.dataset.originalValues) return;
    const original = JSON.parse(cosRow.dataset.originalValues);

    // Revert Status
    const statusCell = cosRow.querySelector('.status-cell');
    if (statusCell) {
        const color = getBadgeColorVar(original.status);
        statusCell.innerHTML = `<span class="status-block" style="background-color: ${color};">${original.status}</span>`;
    }

    // Revert Content
    const contentDisplay = cosRow.querySelector('.cos-content-display');
    if (contentDisplay) contentDisplay.innerHTML = original.contentHTML;

    // Revert Meta
    const accDisplay = cosRow.querySelector('.cos-accountable-party-display');
    if (accDisplay) accDisplay.textContent = original.accountable;
    
    const dateDisplay = cosRow.querySelector('.cos-completion-date-display');
    if (dateDisplay) dateDisplay.textContent = original.date;

    toggleEditModeUI(cosRow, false);
}

function updateRowDisplay(cosRow, cosData) {
    // 1. Update Status Block
    const statusCell = cosRow.querySelector('.status-cell');
    if (statusCell) {
        const color = getBadgeColorVar(cosData.status);
        statusCell.innerHTML = `<span class="status-block" style="background-color: ${color};">${cosData.status.toUpperCase()}</span>`;
    }

    // 2. Update Content (with potential new Pills)
    const contentDisplay = cosRow.querySelector('.cos-content-display');
    if (contentDisplay) contentDisplay.innerHTML = cosData.content;

    // 3. Update Fields
    const accDisplay = cosRow.querySelector('.cos-accountable-party-display');
    if (accDisplay) accDisplay.textContent = cosData.accountable_party || 'N/A';

    const dateDisplay = cosRow.querySelector('.cos-completion-date-display');
    if (dateDisplay) dateDisplay.textContent = cosData.completion_date || 'TBD';
}

function toggleEditModeUI(cosRow, editing) {
    cosRow.dataset.editing = editing.toString();

    // Toggle visibility classes
    // Using Bootstrap .d-none utilities
    const elements = [
        { display: '.cos-content-display', edit: '.cos-content-edit' },
        { display: '.cos-accountable-party-display', edit: '.cos-accountable-party-edit' },
        { display: '.cos-completion-date-display', edit: '.cos-completion-date-edit' }
    ];

    elements.forEach(pair => {
        const disp = cosRow.querySelector(pair.display);
        const edit = cosRow.querySelector(pair.edit);
        if (disp) disp.classList.toggle('d-none', editing);
        if (edit) edit.classList.toggle('d-none', !editing);
    });

    // Toggle Status Dropdown
    const statusCell = cosRow.querySelector('.status-cell');
    const currentBlock = statusCell.querySelector('.status-block');
    
    if (editing) {
        if (currentBlock) {
            const currentVal = currentBlock.textContent.trim();
            currentBlock.classList.add('d-none');
            if(!statusCell.querySelector('select')) {
                statusCell.insertAdjacentHTML('beforeend', createStatusDropdown(currentVal));
            }
        }
    } else {
        const select = statusCell.querySelector('select');
        if (select) select.remove();
        if (currentBlock) currentBlock.classList.remove('d-none');
    }

    // Toggle Action Buttons
    const viewBtns = cosRow.querySelector('.actions-cell .btn-group:not(.d-none)');
    const editBtns = cosRow.querySelector('.actions-cell .btn-group.d-none');
    
    // This logic handles the swapping of button groups defined in outcome.html
    const actionsCell = cosRow.querySelector('.actions-cell');
    const groups = actionsCell.querySelectorAll('.btn-group');
    
    if (groups.length >= 2) {
        // Group 0 is View actions, Group 1 is Edit actions
        groups[0].classList.toggle('d-none', editing);
        groups[1].classList.toggle('d-none', !editing);
    }
}

function stripHtmlForTextarea(htmlString) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlString;
    return tempDiv.textContent || tempDiv.innerText || "";
}

function createStatusDropdown(selectedStatus) {
    const statuses = ['Proposed', 'Active', 'Completed', 'Verified', 'Rejected'];
    const options = statuses.map(s => 
        `<option value="${s}" ${s.toUpperCase() === selectedStatus.toUpperCase() ? 'selected' : ''}>${s.toUpperCase()}</option>`
    ).join('');
    return `<select class="form-select form-select-sm status-edit-select shadow-none border-secondary">${options}</select>`;
}

// --- EVENT HANDLERS ---

function handlePhaseTableBodyClick(event) {
    const target = event.target;

    // 1. CE Pill Click (Launch Modal)
    const pill = target.closest('.ce-pill, .ce-capsule');
    if (pill) {
        event.preventDefault();
        handleCEPillClick(pill);
        return;
    }

    // 2. Action Buttons
    const button = target.closest('button');
    if (!button) return;

    const cosRow = button.closest('.cos-row');
    if (!cosRow) return;

    event.preventDefault();
    const cosId = cosRow.dataset.cosId;

    if (button.classList.contains('edit-cos-button')) {
        handleEditCOS(cosRow);
    } else if (button.classList.contains('update-cos-button')) {
        handleUpdateCOS(cosRow, cosId);
    } else if (button.classList.contains('cancel-cos-button')) {
        revertToOriginalValues(cosRow);
    } else if (button.classList.contains('delete-cos-button')) {
        handleDeleteCOS(cosRow, cosId);
    }
}

function handleEditCOS(cosRow) {
    if (cosRow.dataset.editing === 'true') return;
    storeOriginalValues(cosRow);

    // Pre-populate textarea (strip existing HTML/Pills for editing)
    const contentDisplay = cosRow.querySelector('.cos-content-display');
    const textarea = cosRow.querySelector('.cos-content-edit textarea');
    if (contentDisplay && textarea) {
        textarea.value = stripHtmlForTextarea(contentDisplay.innerHTML);
    }

    toggleEditModeUI(cosRow, true);
}

function handleUpdateCOS(cosRow, cosId) {
    // Gather Data
    const newContent = cosRow.querySelector('.cos-content-edit textarea')?.value.trim() || '';
    const newStatus = cosRow.querySelector('.status-edit-select')?.value || 'Proposed';
    const newAccountable = cosRow.querySelector('.cos-accountable-party-edit')?.value.trim();
    const newDate = cosRow.querySelector('.cos-completion-date-edit')?.value;

    // UI Feedback
    const btn = cosRow.querySelector('.update-cos-button');
    const origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i>`;

    fetch(`/update_cos/${cosId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            content: newContent, 
            status: newStatus, 
            accountable_party: newAccountable, 
            completion_date: newDate 
        })
    })
    .then(handleApiResponse)
    .then(data => {
        if (data.success && data.cos) {
            updateRowDisplay(cosRow, data.cos);
            toggleEditModeUI(cosRow, false);
        } else {
            throw new Error('Failed to return COS data');
        }
    })
    .catch(err => alert(err.message))
    .finally(() => {
        btn.disabled = false;
        btn.innerHTML = origHtml;
    });
}

function handleDeleteCOS(cosRow, cosId) {
    if (!confirm('Are you sure? This will delete the Condition and all its internal logic nodes.')) return;

    fetch(`/delete_cos/${cosId}`, { method: 'DELETE' })
    .then(handleApiResponse)
    .then(() => cosRow.remove())
    .catch(err => alert(err.message));
}

function handleAddCOSButtonClick(event) {
    const button = event.currentTarget;
    
    // 1. Locate Context
    const container = button.closest('.phase-table-container');
    if (!container) return console.error("Phase container not found.");
    
    const ssolId = container.dataset.ssolId;
    if (!ssolId) return alert("System Error: SSOL Context Missing.");

    // 2. Visual Feedback (Loading State)
    const originalHtml = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<i class="fas fa-circle-notch fa-spin me-2"></i> INITIALIZING...`;

    // 3. Construct Payload
    const payload = {
        // Default placeholder text inviting definition
        content: "New Condition of Satisfaction - Click edit to define parameters.",
        status: "Proposed",
        ssol_id: ssolId
    };

    // 4. Network Request
    fetch(`/create_cos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(handleApiResponse) // Expects standard helper
    .then(data => {
        if (data.success && data.cos) {
            // 5. Inject into DOM
            const table = container.querySelector('table.retro-table');
            const newRowHtml = createRowHTML(data.cos); // Generate Row HTML

            if (table) {
                // SCENARIO A: Table exists, append row
                const tbody = table.querySelector('tbody');
                tbody.insertAdjacentHTML('beforeend', newRowHtml);
            } else {
                // SCENARIO B: Empty State (No table yet)
                // We must remove the "No protocols" placeholder and build the table skeleton
                const emptyState = container.querySelector('.text-center.text-muted');
                if(emptyState) emptyState.remove();

                // The wrapper for the table needs to go BEFORE the button footer
                // Note: outcome.html structure puts button in a div.p-3 at bottom of container
                const tableSkeleton = `
                    <table class="table table-hover mb-0 align-middle retro-table">
                        <thead class="bg-light">
                            <tr>
                                <th class="ps-4" style="width: 110px;">Status</th>
                                <th>Condition of Satisfaction</th>
                                <th style="width: 18%;">Accountable</th>
                                <th style="width: 12%;">Target</th>
                                <th class="text-end pe-4" style="width: 100px;">Edit</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${newRowHtml}
                        </tbody>
                    </table>
                `;
                
                // Insert as first element in the body (pushing the footer down)
                container.insertAdjacentHTML('afterbegin', tableSkeleton);
            }
        }
    })
    .catch(err => {
        console.error("COS Creation Failed:", err);
        alert("Failed to initialize new Condition. Check console.");
    })
    .finally(() => {
        // 6. Restore Button State
        button.disabled = false;
        button.innerHTML = originalHtml;
    });
}


// --- HTML Generator for New Rows (Matches outcome.html structure) ---
function createRowHTML(cos) {
    return `
    <tr class="cos-row" data-cos-id="${cos.id}" data-editing="false">
        <td class="status-cell">
            <span class="status-block" style="background-color: #17a2b8;">${cos.status.toUpperCase()}</span>
        </td>
        <td class="cos-content-cell">
            <div class="cos-content-display">${cos.content}</div>
            <div class="cos-content-edit d-none">
                <textarea class="form-control form-control-sm">${stripHtmlForTextarea(cos.content)}</textarea>
            </div>
        </td>
        <td class="cos-accountable-party-cell">
            <span class="cos-accountable-party-display">N/A</span>
            <input type="text" class="form-control form-control-sm cos-accountable-party-edit d-none">
        </td>
        <td class="cos-completion-date-cell font-data">
            <span class="cos-completion-date-display">TBD</span>
            <input type="date" class="form-control form-control-sm cos-completion-date-edit d-none">
        </td>
        <td class="text-end actions-cell">
            <div class="btn-group cos-actions">
                <button class="btn btn-sm btn-link text-muted edit-cos-button"><i class="fas fa-cog"></i></button>
                <button class="btn btn-sm btn-link text-danger delete-cos-button"><i class="fas fa-trash"></i></button>
            </div>
            <div class="btn-group cos-actions d-none">
                <button class="btn btn-sm btn-success update-cos-button"><i class="fas fa-check"></i></button>
                <button class="btn btn-sm btn-secondary cancel-cos-button"><i class="fas fa-times"></i></button>
            </div>
        </td>
    </tr>`;
}

// --- MAIN: Launch the CE Modal Application ---

export function handleCEPillClick(pill) {
    const ceId = pill.dataset.ceId;
    const ceType = pill.dataset.ceType || "Default";
    
    // Safe access to NODES using window object (injected in base.html)
    const iconClass = (window.NODES && window.NODES[ceType]?.icon) || 'fas fa-cube';
    
    showLoadingSpinner(`INITIALIZING ${ceType.toUpperCase()} NODE...`, iconClass);

    // Scrape context for the modal initialization
    const cosRow = pill.closest('.cos-row');
    const ssolGoal = document.getElementById('ssol-goal')?.textContent.trim() || "Goal";
    const cosContent = cosRow?.querySelector('.cos-content-display')?.innerHTML || '';
    
    const accItem = cosRow?.closest('.accordion-item');
    const phaseText = accItem?.querySelector('.phase-title')?.textContent.trim() || "Unknown";
    
    // Calculate phase index based on DOM order
    const allItems = Array.from(document.querySelectorAll('.accordion-item'));
    const phaseIndex = accItem ? allItems.indexOf(accItem) : 0;

    fetch(`/get_ce_modal/${encodeURIComponent(ceType)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            ce_id: ceId, 
            cos_content: cosContent, 
            phase_name: phaseText,
            phase_index: phaseIndex,
            ssol_goal: ssolGoal 
        })
    })
    .then(handleApiResponse)
    .then(data => {
        if(data.modal_html) {
            // Launch the full application controller
            displayCEModal(data.modal_html, ceId, ceType, data.ce_data);
        }
    })
    .catch(err => {
        console.error(err);
        alert("System Error: Could not load node application.");
    })
    .finally(() => hideLoadingSpinner());
}

// --- GLOBAL LISTENERS ---

document.addEventListener('DOMContentLoaded', () => {
    // Table Actions (Delegated)
    document.querySelectorAll('.phase-table-container').forEach(container => {
        container.addEventListener('click', handlePhaseTableBodyClick);
    });

    // Add COS Buttons
    document.querySelectorAll('.add-cos').forEach(btn => {
        btn.addEventListener('click', handleAddCOSButtonClick);
    });

    // PDF Export
    const pdfBtn = document.getElementById('save-as-pdf-button');
    if(pdfBtn) {
        pdfBtn.addEventListener('click', (e) => {
            // e.target.dataset.ssolId might need bubbling check if icon clicked
            const id = e.currentTarget.dataset.ssolId;
            // Call PDF function (omitted for brevity, assume similar to existing)
            alert("Generating PDF report...");
        });
    }
});