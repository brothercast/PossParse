// cos_table.js (Refactored for Bootstrap Table Layout in outcome.html)
import { displayCEModal } from './ce_cards.js'; // For CE pill clicks

// --- Utility Functions ---
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

// --- DOM Manipulation & State ---

/**
 * Stores the original values of a COS row before entering edit mode.
 * @param {HTMLTableRowElement} cosRow - The <tr> element representing the COS.
 */
function storeOriginalValues(cosRow) {
    const statusPill = cosRow.querySelector('.status-cell .status-pill');
    const contentDisplay = cosRow.querySelector('.cos-content-cell .cos-content-display');
    const accountablePartyDisplay = cosRow.querySelector('.cos-accountable-party-cell .cos-accountable-party-display');
    const completionDateDisplay = cosRow.querySelector('.cos-completion-date-cell .cos-completion-date-display');

    cosRow.dataset.originalValues = JSON.stringify({
        status: statusPill ? statusPill.textContent.trim().toUpperCase() : 'PROPOSED',
        contentHTML: contentDisplay ? contentDisplay.innerHTML : '', // Store raw HTML with CE pills
        accountableParty: accountablePartyDisplay ? accountablePartyDisplay.textContent.trim() : '',
        completionDate: completionDateDisplay ? completionDateDisplay.textContent.trim() : ''
    });
}

/**
 * Reverts a COS row to its original stored values after cancelling edit.
 * @param {HTMLTableRowElement} cosRow - The <tr> element.
 */
function revertToOriginalValues(cosRow) {
    if (!cosRow.dataset.originalValues) return;
    const original = JSON.parse(cosRow.dataset.originalValues);

    // Restore Status
    const statusCell = cosRow.querySelector('.status-cell');
    if (statusCell) {
        statusCell.innerHTML = `<span class="status-pill ${getBadgeClassFromStatus(original.status)}">${original.status}</span>`;
    }

    // Restore Content
    const contentDisplay = cosRow.querySelector('.cos-content-cell .cos-content-display');
    const contentEditDiv = cosRow.querySelector('.cos-content-cell .cos-content-edit');
    if (contentDisplay) contentDisplay.innerHTML = original.contentHTML;
    if (contentEditDiv) contentEditDiv.querySelector('textarea').value = stripHtmlForTextarea(original.contentHTML);


    // Restore Accountable Party
    const accPartyDisplay = cosRow.querySelector('.cos-accountable-party-cell .cos-accountable-party-display');
    const accPartyEditInput = cosRow.querySelector('.cos-accountable-party-cell .cos-accountable-party-edit');
    if (accPartyDisplay) accPartyDisplay.textContent = original.accountableParty;
    if (accPartyEditInput) accPartyEditInput.value = original.accountableParty;

    // Restore Completion Date
    const compDateDisplay = cosRow.querySelector('.cos-completion-date-cell .cos-completion-date-display');
    const compDateEditInput = cosRow.querySelector('.cos-completion-date-cell .cos-completion-date-edit');
    if (compDateDisplay) compDateDisplay.textContent = original.completionDate;
    if (compDateEditInput) compDateEditInput.value = original.completionDate;

    toggleEditModeUI(cosRow, false); // Switch back to display mode
}

/**
 * Updates the display of a COS row with new data from the server.
 * @param {HTMLTableRowElement} cosRow - The <tr> element.
 * @param {object} cosData - The COS data object from the server.
 */
function updateRowDisplay(cosRow, cosData) {
    const statusCell = cosRow.querySelector('.status-cell');
    if (statusCell) { // Should always exist
        statusCell.innerHTML = `<span class="status-pill ${getBadgeClassFromStatus(cosData.status)}">${cosData.status.toUpperCase()}</span>`;
    }

    const contentDisplay = cosRow.querySelector('.cos-content-cell .cos-content-display');
    if (contentDisplay) contentDisplay.innerHTML = cosData.content; // Assumes cosData.content has CE pills

    const accountablePartyDisplay = cosRow.querySelector('.cos-accountable-party-cell .cos-accountable-party-display');
    if (accountablePartyDisplay) accountablePartyDisplay.textContent = cosData.accountable_party || '';

    const completionDateDisplay = cosRow.querySelector('.cos-completion-date-cell .cos-completion-date-display');
    if (completionDateDisplay) completionDateDisplay.textContent = cosData.completion_date || '';

    initializeCEPillEventListeners(cosRow.querySelector('.cos-content-cell')); // Re-bind pills in the updated content
}


/**
 * Toggles the UI between display and edit mode for a COS row.
 * @param {HTMLTableRowElement} cosRow - The <tr> element.
 * @param {boolean} editing - True for edit mode, false for display mode.
 */
function toggleEditModeUI(cosRow, editing) {
    cosRow.dataset.editing = editing.toString(); // For CSS state styling if needed

    // Toggle visibility of display spans and edit inputs/textareas
    const elementsToToggle = [
        { display: '.cos-content-display', edit: '.cos-content-edit' },
        { display: '.cos-accountable-party-display', edit: '.cos-accountable-party-edit' },
        { display: '.cos-completion-date-display', edit: '.cos-completion-date-edit' }
    ];

    elementsToToggle.forEach(pair => {
        const displayEl = cosRow.querySelector(pair.display);
        const editEl = cosRow.querySelector(pair.edit);
        if (displayEl) displayEl.classList.toggle('d-none', editing);
        if (editEl) editEl.classList.toggle('d-none', !editing);
    });

    // Handle status pill/dropdown
    const statusCell = cosRow.querySelector('.status-cell');
    const statusPill = statusCell.querySelector('.status-pill');
    const statusDropdown = statusCell.querySelector('select.status-edit-select');

    if (editing) {
        if (statusPill && !statusDropdown) { // Only create dropdown if it doesn't exist
            const currentStatus = statusPill.textContent.trim();
            statusPill.classList.add('d-none');
            // statusPill.style.display = 'none';
            statusCell.insertAdjacentHTML('beforeend', createStatusDropdown(currentStatus));
        }
    } else {
        if (statusDropdown) statusDropdown.remove();
        if (statusPill) statusPill.classList.remove('d-none');
        // if (statusPill) statusPill.style.display = '';
    }

    // Toggle action buttons
    cosRow.querySelector('.edit-cos-button').classList.toggle('d-none', editing);
    cosRow.querySelector('.update-cos-button').classList.toggle('d-none', !editing);
    cosRow.querySelector('.cancel-cos-button').classList.toggle('d-none', !editing);
    cosRow.querySelector('.delete-cos-button').classList.toggle('d-none', editing); // Hide delete in edit mode
    cosRow.querySelector('.analyze-cos-button').classList.toggle('d-none', editing); // Hide analyze in edit mode
}

/**
 * Helper to strip HTML for placing content into a textarea for plain text editing.
 * CE pills will be lost if not re-analyzed on save.
 * @param {string} htmlString
 * @returns {string} Plain text.
 */
function stripHtmlForTextarea(htmlString) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlString;
    return tempDiv.textContent || tempDiv.innerText || "";
}

/**
 * Creates the HTML for the status dropdown.
 * @param {string} selectedStatus - The currently selected status.
 * @returns {string} HTML string for the select element.
 */
function createStatusDropdown(selectedStatus) {
    const statuses = ['Proposed', 'In Progress', 'Completed', 'Rejected'];
    let optionsHtml = statuses.map(status =>
        `<option value="${status}"${status.toUpperCase() === selectedStatus.toUpperCase() ? ' selected' : ''}>${status}</option>`
    ).join('');
    return `<select class="form-select form-select-sm status-edit-select">${optionsHtml}</select>`;
}


// --- Event Handlers ---

/**
 * Handles clicks within the phase table body (event delegation).
 * @param {Event} event - The click event.
 */
function handlePhaseTableBodyClick(event) {
    const button = event.target.closest('button'); // Focus on button clicks
    if (!button) return;

    const cosRow = button.closest('.cos-row');
    if (!cosRow) return;

    const cosId = cosRow.dataset.cosId;

    if (button.classList.contains('edit-cos-button')) {
        event.preventDefault();
        if (cosRow.dataset.editing === 'true') return; // Already editing
        storeOriginalValues(cosRow);

        // Populate textarea with plain text from current display for editing
        const contentDisplay = cosRow.querySelector('.cos-content-cell .cos-content-display');
        const contentTextarea = cosRow.querySelector('.cos-content-cell .cos-content-edit textarea');
        if (contentDisplay && contentTextarea) {
            contentTextarea.value = stripHtmlForTextarea(contentDisplay.innerHTML);
        }
        // Populate other edit fields
        const accPartyDisplay = cosRow.querySelector('.cos-accountable-party-cell .cos-accountable-party-display');
        const accPartyEditInput = cosRow.querySelector('.cos-accountable-party-cell .cos-accountable-party-edit');
        if (accPartyDisplay && accPartyEditInput) accPartyEditInput.value = accPartyDisplay.textContent.trim();

        const compDateDisplay = cosRow.querySelector('.cos-completion-date-cell .cos-completion-date-display');
        const compDateEditInput = cosRow.querySelector('.cos-completion-date-cell .cos-completion-date-edit');
        if (compDateDisplay && compDateEditInput) compDateEditInput.value = compDateDisplay.textContent.trim();

        toggleEditModeUI(cosRow, true);

    } else if (button.classList.contains('update-cos-button')) {
        event.preventDefault();
        handleUpdateCOS(cosRow, cosId);
    } else if (button.classList.contains('cancel-cos-button')) {
        event.preventDefault();
        revertToOriginalValues(cosRow); // This also calls toggleEditModeUI(cosRow, false)
    } else if (button.classList.contains('delete-cos-button')) {
        event.preventDefault();
        handleDeleteCOS(cosRow, cosId);
    } else if (button.classList.contains('analyze-cos-button')) {
        event.preventDefault();
        handleAnalyzeCOS(button, cosRow, cosId);
    }
}

/**
 * Handles the update logic for a COS row.
 * @param {HTMLTableRowElement} cosRow - The <tr> element.
 * @param {string} cosId - The ID of the COS.
 */
function handleUpdateCOS(cosRow, cosId) {
    const contentTextarea = cosRow.querySelector('.cos-content-cell .cos-content-edit textarea');
    // Sending plain text; backend needs to re-analyze for CE pills.
    const newContent = contentTextarea ? contentTextarea.value.trim() : '';

    const statusSelect = cosRow.querySelector('.status-cell select.status-edit-select');
    const newStatus = statusSelect ? statusSelect.value : cosRow.querySelector('.status-cell .status-pill').textContent.trim();

    const accountablePartyInput = cosRow.querySelector('.cos-accountable-party-cell .cos-accountable-party-edit');
    const newAccountableParty = accountablePartyInput ? accountablePartyInput.value.trim() : '';

    const completionDateInput = cosRow.querySelector('.cos-completion-date-cell .cos-completion-date-edit');
    const newCompletionDate = completionDateInput ? completionDateInput.value : '';

    const payload = {
        content: newContent, // Plain text, backend re-analyzes
        status: newStatus,
        accountable_party: newAccountableParty,
        completion_date: newCompletionDate
    };

    const updateButton = cosRow.querySelector('.update-cos-button');
    const originalButtonHtml = updateButton.innerHTML;
    updateButton.disabled = true;
    updateButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;

    fetch(`/update_cos/${cosId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(payload)
    })
    .then(handleApiResponse)
    .then(data => {
        if (data.success && data.cos) {
            updateRowDisplay(cosRow, data.cos); // data.cos.content should have pills
            toggleEditModeUI(cosRow, false);
        } else {
            throw new Error(data.error || data.message || 'Update failed to return COS data.');
        }
    })
    .catch(error => {
        console.error('Error updating COS:', error);
        alert(`Error: ${error.message}`);
        // Optionally revert if critical error: revertToOriginalValues(cosRow);
    })
    .finally(() => {
        updateButton.disabled = false;
        updateButton.innerHTML = originalButtonHtml;
    });
}

/**
 * Handles deletion of a COS row.
 * @param {HTMLTableRowElement} cosRow - The <tr> element.
 * @param {string} cosId - The ID of the COS.
 */
function handleDeleteCOS(cosRow, cosId) {
    if (confirm('Are you sure you want to delete this Condition of Satisfaction? This cannot be undone.')) {
        fetch(`/delete_cos/${cosId}`, {
            method: 'DELETE',
            headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
        })
        .then(handleApiResponse)
        .then(data => {
            if (data.success) {
                cosRow.remove();
            } else {
                throw new Error(data.error || data.message || 'Deletion failed.');
            }
        })
        .catch(error => {
            console.error('Error deleting COS:', error);
            alert(`Error: ${error.message}`);
        });
    }
}

/**
 * Handles analysis of a COS row's content.
 * @param {HTMLButtonElement} analyzeButton - The analyze button.
 * @param {HTMLTableRowElement} cosRow - The <tr> element.
 * @param {string} cosId - The ID of the COS.
 */
function handleAnalyzeCOS(analyzeButton, cosRow, cosId) {
    const originalButtonHtml = analyzeButton.innerHTML;
    analyzeButton.disabled = true;
    analyzeButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;

    fetch(`/analyze_cos/${cosId}`, { // Route from routes.py
        headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
    })
    .then(handleApiResponse)
    .then(data => {
        if (data.success && data.analysis_results && data.analysis_results.content_with_ce) {
            const contentDisplay = cosRow.querySelector('.cos-content-cell .cos-content-display');
            if (contentDisplay) {
                contentDisplay.innerHTML = data.analysis_results.content_with_ce;
                initializeCEPillEventListeners(contentDisplay); // Re-bind pills
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
        analyzeButton.innerHTML = originalButtonHtml; // Restore original icon/text
    });
}

/**
 * Handles adding a new COS.
 * @param {Event} event - The click event from the "Add COS" button.
 */
function handleAddCOSButtonClick(event) {
    const button = event.currentTarget;
    const phaseNameIdentifier = button.dataset.phase; // e.g., "Discovery_Phase"
    const accordionBody = button.closest('.accordion-body');
    const ssolId = accordionBody ? accordionBody.dataset.ssolId : null;
    const table = accordionBody ? accordionBody.querySelector('table.phase-table') : null;
    const tbody = table ? table.tBodies[0] : null;

    if (!ssolId) {
        console.error('SSOL ID not found for adding COS.');
        alert('Cannot add COS: Critical data missing.');
        return;
    }

    const payload = {
        content: 'New Condition of Satisfaction - edit me!', // Default content
        status: 'Proposed',
        ssol_id: ssolId,
        // Optionally, you could send phase_name_identifier if backend uses it
    };

    button.disabled = true;
    const originalButtonText = button.innerHTML;
    button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Adding...`;

    fetch(`/create_cos`, { // This route needs to be implemented in routes.py
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(payload)
    })
    .then(handleApiResponse)
    .then(data => {
        if (data.success && data.cos) {
            if (tbody) {
                const newRow = createCosTableRow(data.cos);
                tbody.appendChild(newRow);
            } else if (table) { // Table exists but no tbody (shouldn't happen with valid HTML)
                const newTbody = document.createElement('tbody');
                const newRow = createCosTableRow(data.cos);
                newTbody.appendChild(newRow);
                table.appendChild(newTbody);
            } else {
                // This case means no table existed (phase was empty)
                // We need to create the table structure
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
                        <tbody>
                        </tbody>
                    </table>`;
                const pTag = accordionBody.querySelector('p'); // "No COS found" paragraph
                if(pTag) pTag.remove();
                accordionBody.insertAdjacentHTML('afterbegin', newTableHtml); // Insert table at the top
                const newTbody = accordionBody.querySelector('table.phase-table tbody');
                if(newTbody){
                    const newRow = createCosTableRow(data.cos);
                    newTbody.appendChild(newRow);
                }
            }
        } else {
            throw new Error(data.error || data.message || 'Failed to create COS.');
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

/**
 * Creates a new <tr> element for a COS.
 * @param {object} cos - The COS data object.
 * @returns {HTMLTableRowElement} The new <tr> element.
 */
function createCosTableRow(cos) {
    const newRow = document.createElement('tr');
    newRow.classList.add('cos-row');
    newRow.dataset.cosId = cos.id;
    newRow.dataset.editing = 'false';

    // Ensure cos.content is defined, default to empty string if not
    const cosContentHtml = cos.content || '';
    // For textarea, strip HTML. Backend will re-analyze and add pills.
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
            <span class="cos-accountable-party-display">${cos.accountable_party || ''}</span>
            <input type="text" class="form-control form-control-sm cos-accountable-party-edit d-none" value="${cos.accountable_party || ''}">
        </td>
        <td class="cos-completion-date-cell align-middle">
            <span class="cos-completion-date-display">${cos.completion_date || ''}</span>
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
    initializeCEPillEventListeners(newRow.querySelector('.cos-content-cell')); // Init pills for the new row
    return newRow;
}


// --- CE Pill Click Handling ---
/**
 * Adds event listeners to CE pills.
 * @param {HTMLElement} parentElement - The parent element to search within for CE pills. Defaults to document.
 */
function initializeCEPillEventListeners(parentElement = document) {
    parentElement.querySelectorAll('.ce-pill').forEach(pill => {
        pill.removeEventListener('click', handleCEPillClick); // Prevent duplicates
        pill.addEventListener('click', handleCEPillClick);
    });
}

/**
 * Handles clicks on CE pills to open the CE modal.
 * @param {Event} event - The click event.
 */
function handleCEPillClick(event) {
    event.preventDefault(); // Prevent any default action if pill is inside a link
    const pill = event.currentTarget;
    const ceId = pill.dataset.ceId;

    if (!ceId) {
        console.warn('CE Pill clicked without a ce-id.');
        return;
    }

    const ceType = pill.dataset.ceType || "Default";
    const cosRow = pill.closest('.cos-row'); // Pills are inside cos-content-cell of a cos-row
    const cosContentDisplay = cosRow ? cosRow.querySelector('.cos-content-cell .cos-content-display') : null;
    // Send the entire HTML content of the COS, so the modal can display context with other pills
    const cosContextContent = cosContentDisplay ? cosContentDisplay.innerHTML : '';

    const accordionItem = cosRow ? cosRow.closest('.accordion-item') : null;
    const phaseButton = accordionItem ? accordionItem.querySelector('.accordion-header .accordion-button') : null;
    let phaseName = "Unknown Phase";
    if (phaseButton) {
        const buttonTextClone = phaseButton.cloneNode(true);
        buttonTextClone.querySelectorAll('.phase-progress-bar, .accordion-button-icon').forEach(el => el.remove()); // Remove non-text parts
        phaseName = buttonTextClone.textContent.trim().replace(/\s*PHASE\s*$/i, "").trim(); // Remove " PHASE" suffix
    }
    
    let phaseIndex = 0; // Default
    if (accordionItem) {
        const allAccordionItems = Array.from(accordionItem.parentElement.children);
        phaseIndex = allAccordionItems.indexOf(accordionItem);
    }


    const ssolGoalElement = document.querySelector('#ssol-goal');
    const ssolGoal = ssolGoalElement ? ssolGoalElement.textContent.trim() : "SSOL Goal Not Available";

    const payload = {
        ce_id: ceId,
        cos_content: cosContextContent, // Send the HTML for context
        phase_name: phaseName,
        phase_index: phaseIndex,
        ssol_goal: ssolGoal,
        // existing_ces: [] // Populate if you want to send other CEs from THIS COS for advanced context
    };

    fetch(`/get_ce_modal/${encodeURIComponent(ceType)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(handleApiResponse)
    .then(data => {
        if (data.modal_html) {
            // displayCEModal is imported from ce_cards.js
            displayCEModal(data.modal_html, ceId, ceType, cosContextContent, phaseName, phaseIndex, data.ai_generated_data, ssolGoal);
        } else {
            throw new Error(data.error || 'Modal HTML content not found in response.');
        }
    })
    .catch(error => {
        console.error('Error fetching or displaying CE modal:', error);
        alert(`Error interacting with Conditional Element: ${error.message}`);
    });
}


// --- PDF Export ---
function triggerPdfExport(ssolId) {
    const printableElement = document.documentElement.cloneNode(true);

    // Remove scripts, action buttons, modals, edit fields for PDF
    const selectorsToRemove = [
        'script', '.cos-actions', '.add-cos', '#save-as-pdf-button',
        '.modal', '#dynamicModalContainer', '.cos-content-edit',
        '.cos-accountable-party-edit', '.cos-completion-date-edit',
        'select.status-edit-select', '#image-error-container'
    ];
    printableElement.querySelectorAll(selectorsToRemove.join(', ')).forEach(el => el.remove());

    // Ensure all accordions are shown open in PDF
    printableElement.querySelectorAll('.accordion-collapse').forEach(collapse => {
        collapse.classList.add('show');
        collapse.style.display = 'block'; // Force display if .show is not enough
    });
    printableElement.querySelectorAll('.accordion-button').forEach(button => {
        button.classList.remove('collapsed');
        button.setAttribute('aria-expanded', 'true');
    });

    // Ensure images use absolute paths
    printableElement.querySelectorAll('img').forEach(img => {
        if (img.src && !img.src.startsWith('http') && !img.src.startsWith('data:')) {
            try {
                img.src = new URL(img.getAttribute('src'), window.location.href).href;
            } catch (e) {
                console.warn("Could not convert image src to absolute URL:", img.src, e);
            }
        }
    });
    // Ensure static assets like CSS are correctly linked if needed by PDF generator,
    // though pdfkit usually handles this via the css parameter.

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
            return response.json().then(err => { throw new Error(err.error || `PDF generation failed: ${response.status}`); });
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
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
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
    // Delegate clicks for COS row actions to the tbody of each phase table
    document.querySelectorAll('.phase-table tbody').forEach(tbody => {
        tbody.removeEventListener('click', handlePhaseTableBodyClick); // Remove first to avoid duplicates
        tbody.addEventListener('click', handlePhaseTableBodyClick);
    });

    // Attach listeners to "Add COS" buttons
    document.querySelectorAll('.add-cos').forEach(button => {
        button.removeEventListener('click', handleAddCOSButtonClick); // Remove first
        button.addEventListener('click', handleAddCOSButtonClick);
    });

    // Initialize CE pill listeners on the whole document initially
    initializeCEPillEventListeners(document);

    // PDF Export Button
    const savePdfButton = document.getElementById('save-as-pdf-button');
    if (savePdfButton) {
        savePdfButton.addEventListener('click', (event) => {
            event.preventDefault();
            const ssolId = savePdfButton.dataset.ssolId;
            if (!ssolId) {
                console.error('SSOL ID missing for PDF.');
                alert('Cannot generate PDF: SSOL ID is missing.');
                return;
            }
            triggerPdfExport(ssolId);
        });
    }
}

// Auto-initialize when the DOM is ready
document.addEventListener('DOMContentLoaded', initializePageEventListeners);