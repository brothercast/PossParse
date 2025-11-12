// cos_table.js (Refactored for Simplicity and Reliability)
import { displayCEModal } from './ce_cards.js';
import { showLoadingSpinner, hideLoadingSpinner } from './base_functions.js';

// --- Utility Functions (Unchanged) ---
function getBadgeClassFromStatus(status) {
    switch (status) {
        case 'Proposed': return 'bg-info';
        case 'In Progress': return 'bg-warning text-dark';
        case 'Completed': return 'bg-success';
        case 'Rejected': return 'bg-danger';
        default: return 'bg-secondary';
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

// --- DOM Manipulation & State (Largely Unchanged) ---
function storeOriginalValues(cosRow) {
    const statusPill = cosRow.querySelector('.status-cell .status-pill');
    const contentDisplay = cosRow.querySelector('.cos-content-cell .cos-content-display');
    const accountablePartyDisplay = cosRow.querySelector('.cos-accountable-party-cell .cos-accountable-party-display');
    const completionDateDisplay = cosRow.querySelector('.cos-completion-date-cell .cos-completion-date-display');
    cosRow.dataset.originalValues = JSON.stringify({
        status: statusPill ? statusPill.textContent.trim().toUpperCase() : 'PROPOSED',
        contentHTML: contentDisplay ? contentDisplay.innerHTML : '',
        accountableParty: accountablePartyDisplay ? accountablePartyDisplay.textContent.trim() : '',
        completionDate: completionDateDisplay ? completionDateDisplay.textContent.trim() : ''
    });
}

function revertToOriginalValues(cosRow) {
    if (!cosRow.dataset.originalValues) return;
    const original = JSON.parse(cosRow.dataset.originalValues);
    const statusCell = cosRow.querySelector('.status-cell');
    if (statusCell) {
        statusCell.innerHTML = `<span class="status-pill ${getBadgeClassFromStatus(original.status)}">${original.status}</span>`;
    }
    const contentDisplay = cosRow.querySelector('.cos-content-cell .cos-content-display');
    if (contentDisplay) contentDisplay.innerHTML = original.contentHTML;
    const accPartyDisplay = cosRow.querySelector('.cos-accountable-party-cell .cos-accountable-party-display');
    if (accPartyDisplay) accPartyDisplay.textContent = original.accountableParty;
    const compDateDisplay = cosRow.querySelector('.cos-completion-date-cell .cos-completion-date-display');
    if (compDateDisplay) compDateDisplay.textContent = original.completionDate;
    toggleEditModeUI(cosRow, false);
}

function updateRowDisplay(cosRow, cosData) {
    const statusCell = cosRow.querySelector('.status-cell');
    if (statusCell) {
        statusCell.innerHTML = `<span class="status-pill ${getBadgeClassFromStatus(cosData.status)}">${cosData.status.toUpperCase()}</span>`;
    }
    const contentDisplay = cosRow.querySelector('.cos-content-cell .cos-content-display');
    if (contentDisplay) contentDisplay.innerHTML = cosData.content;
    const accountablePartyDisplay = cosRow.querySelector('.cos-accountable-party-cell .cos-accountable-party-display');
    if (accountablePartyDisplay) accountablePartyDisplay.textContent = cosData.accountable_party || 'N/A';
    const completionDateDisplay = cosRow.querySelector('.cos-completion-date-cell .cos-completion-date-display');
    if (completionDateDisplay) completionDateDisplay.textContent = cosData.completion_date || 'N/A';
}

function toggleEditModeUI(cosRow, editing) {
    cosRow.dataset.editing = editing.toString();
    const elementsToToggle = [
        { display: '.cos-content-display', edit: '.cos-content-edit' },
        { display: '.cos-accountable-party-display', edit: '.cos-accountable-party-edit' },
        { display: '.cos-completion-date-display', edit: '.cos-completion-date-edit' }
    ];
    elementsToToggle.forEach(pair => {
        cosRow.querySelector(pair.display)?.classList.toggle('d-none', editing);
        cosRow.querySelector(pair.edit)?.classList.toggle('d-none', !editing);
    });

    const statusCell = cosRow.querySelector('.status-cell');
    const statusPill = statusCell.querySelector('.status-pill');
    const statusDropdown = statusCell.querySelector('select.status-edit-select');
    if (editing) {
        if (statusPill && !statusDropdown) {
            const currentStatus = statusPill.textContent.trim();
            statusPill.classList.add('d-none');
            statusCell.insertAdjacentHTML('beforeend', createStatusDropdown(currentStatus));
        }
    } else {
        statusDropdown?.remove();
        statusPill?.classList.remove('d-none');
    }

    cosRow.querySelector('.edit-cos-button')?.classList.toggle('d-none', editing);
    cosRow.querySelector('.update-cos-button')?.classList.toggle('d-none', !editing);
    cosRow.querySelector('.cancel-cos-button')?.classList.toggle('d-none', !editing);
    cosRow.querySelector('.delete-cos-button')?.classList.toggle('d-none', editing);
    cosRow.querySelector('.analyze-cos-button')?.classList.toggle('d-none', editing);
}

function stripHtmlForTextarea(htmlString) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlString;
    return tempDiv.textContent || tempDiv.innerText || "";
}

function createStatusDropdown(selectedStatus) {
    const statuses = ['Proposed', 'In Progress', 'Completed', 'Rejected'];
    const optionsHtml = statuses.map(status =>
        `<option value="${status}"${status.toUpperCase() === selectedStatus.toUpperCase() ? ' selected' : ''}>${status}</option>`
    ).join('');
    return `<select class="form-select form-select-sm status-edit-select">${optionsHtml}</select>`;
}


// --- Event Handlers ---

function handlePhaseTableBodyClick(event) {
    const target = event.target;
    
    const pill = target.closest('.ce-pill');
    if (pill) {
        event.preventDefault();
        handleCEPillClick(pill);
        return;
    }

    const button = target.closest('button');
    if (button) {
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
        } else if (button.classList.contains('analyze-cos-button')) {
            handleAnalyzeCOS(button, cosRow, cosId);
        }
    }
}

function handleEditCOS(cosRow) {
    if (cosRow.dataset.editing === 'true') return;
    storeOriginalValues(cosRow);
    
    const contentDisplay = cosRow.querySelector('.cos-content-display');
    const contentTextarea = cosRow.querySelector('.cos-content-edit textarea');
    if (contentDisplay && contentTextarea) {
        contentTextarea.value = stripHtmlForTextarea(contentDisplay.innerHTML);
    }
    
    const accPartyDisplay = cosRow.querySelector('.cos-accountable-party-display');
    const accPartyEditInput = cosRow.querySelector('.cos-accountable-party-edit');
    if (accPartyDisplay && accPartyEditInput) {
        accPartyEditInput.value = accPartyDisplay.textContent.trim() === 'N/A' ? '' : accPartyDisplay.textContent.trim();
    }
    
    const compDateDisplay = cosRow.querySelector('.cos-completion-date-display');
    const compDateEditInput = cosRow.querySelector('.cos-completion-date-edit');
    if (compDateDisplay && compDateEditInput) {
        compDateEditInput.value = compDateDisplay.textContent.trim() === 'N/A' ? '' : compDateDisplay.textContent.trim();
    }

    toggleEditModeUI(cosRow, true);
}

function handleUpdateCOS(cosRow, cosId) {
    const newContent = cosRow.querySelector('.cos-content-edit textarea')?.value.trim() || '';
    const newStatus = cosRow.querySelector('.status-edit-select')?.value || 'Proposed';
    const newAccountableParty = cosRow.querySelector('.cos-accountable-party-edit')?.value.trim() || '';
    const newCompletionDate = cosRow.querySelector('.cos-completion-date-edit')?.value || '';
    const payload = { content: newContent, status: newStatus, accountable_party: newAccountableParty, completion_date: newCompletionDate };

    const updateButton = cosRow.querySelector('.update-cos-button');
    const originalButtonHtml = updateButton.innerHTML;
    updateButton.disabled = true;
    updateButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;

    fetch(`/update_cos/${cosId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify(payload)
    })
    .then(handleApiResponse)
    .then(data => {
        if (data.success && data.cos) {
            updateRowDisplay(cosRow, data.cos);
            toggleEditModeUI(cosRow, false);
        } else {
            throw new Error(data.error || 'Update failed to return COS data.');
        }
    })
    .catch(error => {
        console.error('Error updating COS:', error);
        alert(`Error: ${error.message}`);
    })
    .finally(() => {
        updateButton.disabled = false;
        updateButton.innerHTML = originalButtonHtml;
    });
}

function handleDeleteCOS(cosRow, cosId) {
    if (confirm('Are you sure you want to delete this Condition of Satisfaction?')) {
        fetch(`/delete_cos/${cosId}`, {
            method: 'DELETE',
            headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
        })
        .then(handleApiResponse)
        .then(data => {
            if (data.success) {
                cosRow.remove();
            } else {
                throw new Error(data.error || 'Deletion failed.');
            }
        })
        .catch(error => {
            console.error('Error deleting COS:', error);
            alert(`Error: ${error.message}`);
        });
    }
}

function handleAnalyzeCOS(analyzeButton, cosRow, cosId) {
    const originalButtonHtml = analyzeButton.innerHTML;
    analyzeButton.disabled = true;
    analyzeButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;

    fetch(`/analyze_cos/${cosId}`, { headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' } })
    .then(handleApiResponse)
    .then(data => {
        if (data.success && data.analysis_results?.content_with_ce) {
            const contentDisplay = cosRow.querySelector('.cos-content-display');
            if (contentDisplay) {
                contentDisplay.innerHTML = data.analysis_results.content_with_ce;
            }
        } else {
            throw new Error(data.message || 'Analysis failed to return expected results.');
        }
    })
    .catch(error => {
        console.error('Error analyzing COS:', error);
        alert(`Analysis Failed: ${error.message}`);
    })
    .finally(() => {
        analyzeButton.disabled = false;
        analyzeButton.innerHTML = originalButtonHtml;
    });
}

function handleAddCOSButtonClick(event) {
    const button = event.currentTarget;
    const accordionBody = button.closest('.accordion-body');
    const ssolId = accordionBody?.dataset.ssolId;
    if (!ssolId) {
        alert('Cannot add COS: Critical data missing.');
        return;
    }

    const payload = { content: 'New Condition of Satisfaction - edit me!', status: 'Proposed', ssol_id: ssolId };
    button.disabled = true;
    const originalButtonText = button.innerHTML;
    button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Adding...`;

    fetch(`/create_cos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify(payload)
    })
    .then(handleApiResponse)
    .then(data => {
        if (data.success && data.cos) {
            let tbody = accordionBody.querySelector('table.phase-table tbody');
            if (!tbody) {
                const phaseNameIdentifier = button.dataset.phase;
                const newTableHtml = `
                    <table class="table table-striped table-hover phase-table" id="${phaseNameIdentifier}-table">
                        <thead>
                            <tr>
                                <th scope="col" style="width: 10%;">Status</th>
                                <th scope="col" style="width: 40%;">Condition of Satisfaction</th>
                                <th scope="col" style="width: 15%;">Accountable Party</th>
                                <th scope="col" style="width: 15%;">Completion Date</th>
                                <th scope="col" class="text-end actions-header" style="width: 20%;">Actions</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>`;
                accordionBody.querySelector('p')?.remove();
                accordionBody.insertAdjacentHTML('afterbegin', newTableHtml);
                tbody = accordionBody.querySelector('tbody');
            }
            const newRow = createCosTableRow(data.cos);
            tbody.appendChild(newRow);
        } else {
            throw new Error(data.error || 'Failed to create COS.');
        }
    })
    .catch(error => {
        console.error('Error creating COS:', error);
        alert(`Error: ${error.message}`);
    })
    .finally(() => {
        button.disabled = false;
        button.innerHTML = originalButtonText;
    });
}

function createCosTableRow(cos) {
    const newRow = document.createElement('tr');
    newRow.className = 'cos-row';
    newRow.dataset.cosId = cos.id;
    newRow.dataset.editing = 'false';
    const cosContentHtml = cos.content || '';
    const cosContentText = stripHtmlForTextarea(cosContentHtml);

    newRow.innerHTML = `
        <td class="status-cell align-middle">
            <span class="status-pill ${getBadgeClassFromStatus(cos.status)}">${cos.status.toUpperCase()}</span>
        </td>
        <td class="cos-content-cell align-middle">
            <div class="cos-content-display">${cosContentHtml}</div>
            <div class="cos-content-edit d-none">
                <textarea class="form-control form-control-sm cos-content-textarea" rows="3">${cosContentText}</textarea>
            </div>
        </td>
        <td class="cos-accountable-party-cell align-middle">
            <span class="cos-accountable-party-display">${cos.accountable_party || 'N/A'}</span>
            <input type="text" class="form-control form-control-sm cos-accountable-party-edit d-none" value="${cos.accountable_party || ''}">
        </td>
        <td class="cos-completion-date-cell align-middle">
            <span class="cos-completion-date-display">${cos.completion_date || 'N/A'}</span>
            <input type="date" class="form-control form-control-sm cos-completion-date-edit d-none" value="${cos.completion_date || ''}">
        </td>
        <td class="text-end actions-cell align-middle">
            <div class="btn-group cos-actions" role="group">
                <button class="btn btn-sm btn-primary edit-cos-button" title="Edit COS"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-success update-cos-button d-none" title="Update COS"><i class="fas fa-check"></i></button>
                <button class="btn btn-sm btn-secondary cancel-cos-button d-none" title="Cancel Edit"><i class="fas fa-times"></i></button>
                <button class="btn btn-sm btn-danger delete-cos-button" title="Delete COS"><i class="fas fa-trash"></i></button>
                <button class="btn btn-sm btn-info analyze-cos-button" data-cos-id="${cos.id}" title="Analyze COS"><i class="fas fa-search-plus"></i></button>
            </div>
        </td>
    `;
    return newRow;
}


/**
 * Handles the click event on a CE pill. Gathers context and calls displayCEModal.
 * This is now a simple "launcher" for the Node Application.
 * @param {HTMLElement} pill - The CE pill element that was clicked.
 */
function handleCEPillClick(pill) {
    const ceId = pill.dataset.ceId;
    const ceType = pill.dataset.ceType || "Default";
    const ceText = pill.querySelector('.ce-pill-text')?.textContent.trim() || 'Conditional Element';

    const iconClass = (window.NODES && window.NODES[ceType]?.icon) || 'fas fa-cogs';
    showLoadingSpinner(`Analyzing ${ceType} Element...`, iconClass);

    const cosRow = pill.closest('.cos-row');
    const ssolGoal = document.querySelector('#ssol-goal')?.textContent.trim() || "SSOL Goal Not Available";
    const cosContextContent = cosRow?.querySelector('.cos-content-display')?.innerHTML || 'COS content not found.';
    const accordionItem = cosRow?.closest('.accordion-item');
    const phaseName = accordionItem?.querySelector('.accordion-header .accordion-button')?.textContent.trim().replace(/\s*PHASE\s*$/i, "").trim() || "Unknown Phase";
    const phaseIndex = accordionItem ? Array.from(accordionItem.parentElement.children).indexOf(accordionItem) : 0;

    const payload = { 
        ce_id: ceId, 
        ce_text: ceText,
        cos_content: cosContextContent, 
        phase_name: phaseName, 
        phase_index: phaseIndex, 
        ssol_goal: ssolGoal 
    };

    fetch(`/get_ce_modal/${encodeURIComponent(ceType)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(response => {
        if (!response.ok) return response.json().then(err => { throw new Error(err.error) });
        return response.json();
    })
    .then(data => {
        if (data.modal_html && data.ce_data) {
            // Pass control to the main application controller
            displayCEModal(data.modal_html, ceId, ceType, data.ce_data);
        } else {
            throw new Error(data.error || 'Server response was missing required data.');
        }
    })
    .catch(error => {
        console.error('Error fetching or displaying CE modal:', error);
        alert(`Could not load application. Error: ${error.message}`);
    })
    .finally(() => {
        hideLoadingSpinner();
    });
}

function triggerPdfExport(ssolId) {
    const printableElement = document.documentElement.cloneNode(true);
    const selectorsToRemove = [
        'script', '.cos-actions', '.add-cos', '#save-as-pdf-button',
        '.modal', '#dynamicModalContainer', '.cos-content-edit',
        '.cos-accountable-party-edit', '.cos-completion-date-edit',
        'select.status-edit-select', '#image-error-container'
    ];
    printableElement.querySelectorAll(selectorsToRemove.join(', ')).forEach(el => el.remove());
    printableElement.querySelectorAll('.accordion-collapse').forEach(collapse => collapse.classList.add('show'));
    printableElement.querySelectorAll('.accordion-button').forEach(button => button.classList.remove('collapsed'));
    printableElement.querySelectorAll('img').forEach(img => {
        if (img.src && !img.src.startsWith('http') && !img.src.startsWith('data:')) {
            try {
                img.src = new URL(img.getAttribute('src'), window.location.href).href;
            } catch (e) { console.warn("Could not convert image src to absolute URL:", img.src, e); }
        }
    });
    const htmlContent = printableElement.outerHTML;
    const pdfButton = document.getElementById('save-as-pdf-button');
    const originalButtonHtml = pdfButton.innerHTML;
    pdfButton.disabled = true;
    pdfButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';

    fetch(`/save_as_pdf/${ssolId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ htmlContent: htmlContent })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => { throw new Error(err.error || `PDF generation failed.`); });
        }
        return response.blob();
    })
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SSPEC_Solution_${ssolId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    })
    .catch(error => {
        console.error('Error saving PDF:', error);
        alert(`PDF Export Error: ${error.message}`);
    })
    .finally(() => {
        pdfButton.disabled = false;
        pdfButton.innerHTML = originalButtonHtml;
    });
}

// --- Global Initialization ---
function initializePageEventListeners() {
    document.querySelectorAll('.phase-table-container').forEach(container => {
        container.removeEventListener('click', handlePhaseTableBodyClick);
        container.addEventListener('click', handlePhaseTableBodyClick);
    });

    document.querySelectorAll('.add-cos').forEach(button => {
        button.removeEventListener('click', handleAddCOSButtonClick);
        button.addEventListener('click', handleAddCOSButtonClick);
    });

    const savePdfButton = document.getElementById('save-as-pdf-button');
    savePdfButton?.addEventListener('click', (event) => {
        event.preventDefault();
        triggerPdfExport(savePdfButton.dataset.ssolId);
    });
}

document.addEventListener('DOMContentLoaded', initializePageEventListeners);