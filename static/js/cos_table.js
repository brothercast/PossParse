// cos_table.js
import { displayCEModal } from './ce_cards.js'; // Ensure displayCEModal is imported

function getBadgeClassFromStatus(status) {
    switch (status) {
        case 'Proposed': return 'bg-info';
        case 'In Progress': return 'bg-warning text-dark';
        case 'Completed': return 'bg-success';
        case 'Rejected': return 'bg-danger';
        default: return 'bg-secondary';
    }
}

// --- Helper Functions ---

function handleResponse(response) {
    if (!response.ok) {
        return response.json().then(errorData => {
            throw new Error(`Server responded with ${response.status}: ${JSON.stringify(errorData)}`);
        });
    }
    return response.json();
}

function createStatusDropdown(selectedStatus) {
    const statuses = ['Proposed', 'In Progress', 'Completed', 'Rejected'];
    return `<select class="form-select form-select-sm">${statuses.map(status => `<option value="${status}"${status === selectedStatus ? ' selected' : ''}>${status}</option>`).join('')}</select>`;
}

function storeOriginalValues(row) {
    const statusCell = row.querySelector('.status-cell');
    const contentCell = row.querySelector('.cos-content-cell');
    const accountablePartyCell = row.querySelector('.cos-accountable-party-cell');
    const completionDateCell = row.querySelector('.cos-completion-date-cell');

    row.dataset.originalValues = JSON.stringify({
        status: statusCell.textContent.trim(),
        contentWithPills: contentCell.innerHTML, // Store HTML
        accountableParty: accountablePartyCell.textContent.trim(),
        completionDate: completionDateCell.textContent.trim()
    });
}

function revertToOriginalValues(row) {
    const originalValues = JSON.parse(row.dataset.originalValues);
    row.querySelector('.status-cell').innerHTML = `<span class="status-pill ${getBadgeClassFromStatus(originalValues.status)}">${originalValues.status}</span>`;
    row.querySelector('.cos-content-cell').innerHTML = originalValues.contentWithPills; // Restore HTML
    row.querySelector('.cos-accountable-party-cell').textContent = originalValues.accountableParty;
    row.querySelector('.cos-completion-date-cell').textContent = originalValues.completionDate;
}

function updateRowWithNewValues(row, cos) {
    if (cos && cos.status && cos.content) {
        row.querySelector('.status-cell').innerHTML = `<span class="status-pill ${getBadgeClassFromStatus(cos.status)}">${cos.status}</span>`;
        row.querySelector('.cos-content-cell').innerHTML = cos.content; // Use innerHTML for content
        row.querySelector('.cos-accountable-party-cell').textContent = cos.accountable_party || '';
        row.querySelector('.cos-completion-date-cell').textContent = cos.completion_date || '';
        initializeCEPillEventListeners(); // Re-initialize after update
    } else {
        console.error('Error: COS data is undefined or missing properties', cos);
        alert('An error occurred while updating the entry.');
    }
}

function toggleEditMode(row, editing) {
    const editButton = row.querySelector('.edit-cos-button');
    const updateButton = row.querySelector('.update-cos-button');
    const cancelButton = row.querySelector('.cancel-cos-button');

    if (editing) {
        editButton.classList.add('d-none');
        updateButton.classList.remove('d-none');
        cancelButton.classList.remove('d-none');
    } else {
        editButton.classList.remove('d-none');
        updateButton.classList.add('d-none');
        cancelButton.classList.add('d-none');
    }
}

// --- Event Handlers ---

function handlePhaseTableClick(event) {
    const target = event.target;
    const row = target.closest('tr.cos-row');
    if (!row) return;

    const cosId = row.dataset.cosId;

    if (target.matches('.edit-cos-button')) {
        turnRowToEditMode(row);
    } else if (target.matches('.update-cos-button')) {
        handleUpdate(row, cosId);
    } else if (target.matches('.cancel-cos-button')) {
        cancelEditMode(row);
    } else if (target.matches('.delete-cos-button')) {
        deleteCOS(cosId, row);
    } else if (target.matches('.analyze-cos-button')) {
        fetchAndDisplayAnalyzedCOS(cosId); // Use the improved function
    }
}

function turnRowToEditMode(row) {
    storeOriginalValues(row);

    const statusCell = row.querySelector('.status-cell');
    const contentCell = row.querySelector('.cos-content-cell');
    const accountablePartyCell = row.querySelector('.cos-accountable-party-cell');
    const completionDateCell = row.querySelector('.cos-completion-date-cell');

    const currentStatus = statusCell.textContent.trim();
    const currentContent = contentCell.innerHTML; // Get HTML content
    const currentAccountableParty = accountablePartyCell.textContent.trim();
    const currentCompletionDate = completionDateCell.textContent.trim();

    statusCell.innerHTML = createStatusDropdown(currentStatus);
    contentCell.innerHTML = `<textarea class="form-control form-control-sm" rows="3">${currentContent}</textarea>`;
    accountablePartyCell.innerHTML = `<input type="text" class="form-control form-control-sm" value="${currentAccountableParty}">`;
    completionDateCell.innerHTML = `<input type="date" class="form-control form-control-sm" value="${currentCompletionDate}">`;

    toggleEditMode(row, true);
}

function handleUpdate(row, cosId) {
    const contentInput = row.querySelector('.cos-content-cell textarea');
    const newContent = contentInput ? contentInput.value.trim() : '';
    const statusSelect = row.querySelector('.status-cell select');
    const statusInput = statusSelect.options[statusSelect.selectedIndex].value;
    const accountablePartyInput = row.querySelector('.cos-accountable-party-cell input').value.trim();
    const completionDateInput = row.querySelector('.cos-completion-date-cell input').value;

    const payload = {
        content: newContent,
        status: statusInput,
        accountable_party: accountablePartyInput,
        completion_date: completionDateInput
    };

    fetch(`/update_cos/${cosId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(payload)
    })
    .then(handleResponse) // Use the helper function
    .then(data => {
        if (data.success) {
            updateRowWithNewValues(row, data.cos);
            toggleEditMode(row, false);
        } else {
            throw new Error(data.error || 'An error occurred while updating.');
        }
    })
    .catch(error => {
        console.error('Error updating COS:', error);
        alert(`Error: ${error.message}`);
    });
}

function cancelEditMode(row) {
    revertToOriginalValues(row);
    toggleEditMode(row, false);
}


function addCOS(phaseName, ssolId) {
    const payload = {
        content: 'New Condition of Satisfaction',
        status: 'Proposed',
        accountable_party: '',
        completion_date: '',
        ssol_id: ssolId
    };

    fetch(`/create_cos`, { // No need for a separate create_cos route
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(payload)
    })
    .then(handleResponse)
    .then(data => {
        if (data.success) {
            const phaseTable = document.querySelector(`#${phaseName.replace(/ /g, '_')}-table tbody`); // Regex for spaces
            const newRow = document.createElement('tr');
            newRow.classList.add('cos-row');
            newRow.setAttribute('data-cos-id', data.cos.id);
            newRow.innerHTML = `
                <td class="status-cell"><span class="status-pill ${getBadgeClassFromStatus('Proposed')}">Proposed</span></td>
                <td class="cos-content-cell">${data.cos.content}</td>
                <td class="cos-accountable-party-cell">${data.cos.accountable_party || ''}</td>
                <td class="cos-completion-date-cell">${data.cos.completion_date || ''}</td>
                <td class="text-end actions-cell">
                    <div class="cos-actions">
                        <button class="btn btn-sm btn-primary edit-cos-button">Edit</button>
                        <button class="btn btn-sm btn-success update-cos-button d-none">Update</button>
                        <button class="btn btn-sm btn-secondary cancel-cos-button d-none">Cancel</button>
                        <button class="btn btn-sm btn-danger delete-cos-button">Delete</button>
                        <button class="btn btn-sm btn-info analyze-cos-button" data-cos-id="${data.cos.id}">Analyze</button>
                    </div>
                </td>
            `;
            phaseTable.appendChild(newRow);
            initializePhaseTableEventListeners(); // Re-initialize after adding
            initializeCEPillEventListeners();
        } else {
            throw new Error(data.error || 'An error occurred while creating.');
        }
    })
    .catch(error => {
        console.error('Error creating COS:', error);
        alert(`Error: ${error.message}`);
    });
}


function deleteCOS(cosId, row) {
    if (confirm(`Delete this Condition of Satisfaction?`)) {
        fetch(`/delete_cos/${cosId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(handleResponse)
        .then(data => {
            if (data.success) {
                row.remove();
            } else {
                throw new Error(data.error || 'An error occurred while deleting.');
            }
        })
        .catch(error => {
            console.error('Error deleting COS:', error);
            alert(`Error: ${error.message}`);
        });
    }
}

function fetchAndDisplayAnalyzedCOS(cosId) {
    fetch(`/analyze_cos/${cosId}`, {
        headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest' // For AJAX requests
        }
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(errData => {
                throw new Error(`Server error (${response.status}): ${errData.message || response.statusText}`);
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            const cosRow = document.querySelector(`tr[data-cos-id="${cosId}"] .cos-content-cell`);
            if (cosRow) {
                cosRow.innerHTML = data.analysis_results.content_with_ce;
                initializeCEPillEventListeners();  // VERY IMPORTANT: Re-initialize after updating content
            }
        } else {
            throw new Error(data.message || 'Analysis failed.'); // Use the message from the server
        }
    })
    .catch(error => {
        console.error('Error analyzing COS:', error);
        alert(`Analysis failed: ${error.message}`);
    });
}

// --- Initialization ---
function initializeCEPillEventListeners() {
    document.querySelectorAll('.ce-pill').forEach(pill => {
        pill.removeEventListener('click', handleCEPillClick); // Prevent duplicates
        pill.addEventListener('click', handleCEPillClick);
    });
}

function handleCEPillClick(event) {
    const ceId = event.currentTarget.dataset.ceId; // Use currentTarget
    if (ceId) {
        fetch(`/get_ce_by_id?ce_id=${ceId}`) //Use query parameter
        .then(handleResponse)
        .then(data => {
            if (data.ce) {
                //Assuming ce_cards.js has a function for creating/showing the modal.
                displayCEModal(data.ce);
            } else {
                console.error('CE Data not found in response', data);
                alert('CE Data not found');
            }
        }).catch(error => {
            console.error('Error fetching CE data', error);
            alert('Error fetching CE Data');
        })
    } else {
        console.warn('Clicked CE pill has no data-ce-id');
    }
}

function initializePhaseTableEventListeners() { // Define the function here
    document.querySelectorAll('.phase-table').forEach(table => {
        table.removeEventListener('click', handlePhaseTableClick);
        table.addEventListener('click', handlePhaseTableClick);
    });
}

// Initialize event listeners when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    initializePhaseTableEventListeners(); // Call it here
    initializeCEPillEventListeners();
});

document.querySelectorAll('.add-cos').forEach(button => {
    button.addEventListener('click', (event) => {
        const phaseName = event.target.dataset.phase;
        const ssolId = document.querySelector('#ssol-goal')?.textContent.trim();
        if (ssolId) {
            addCOS(phaseName, ssolId);
        } else {
            console.error('SSOL ID not found');
            alert('SSOL ID not found. Please ensure the page is loaded correctly.');
        }
    });
});

document.querySelectorAll('.analyze-cos-button').forEach(button => {
    button.addEventListener('click', (event) => {
        const cosId = event.currentTarget.dataset.cosId;
        if (cosId) {
            fetchAndDisplayAnalyzedCOS(cosId);
        } else {
            console.warn('Analyze button missing data-cos-id');
        }
    });
});


// --- PDF Export ---
function saveAsPDF(ssolId) {
    const htmlContent = document.documentElement.outerHTML;
    fetch(`/save_as_pdf/${ssolId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ htmlContent: htmlContent })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        return response.blob();
    })
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Structured Solution ${ssolId}.pdf`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a); // Clean up
    })
    .catch(error => {
        console.error('Error saving PDF:', error);
        alert(`PDF save error: ${error.message}`);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const saveButton = document.getElementById('save-as-pdf-button');
    if (saveButton) {
        saveButton.addEventListener('click', (event) => {
            event.preventDefault();
            const ssolId = saveButton.dataset.ssolId;
            if (!ssolId) {
                console.error('SSOL ID is missing for PDF');
                alert('SSOL ID missing, cannot generate PDF');
                return;
            }
            saveAsPDF(ssolId);
        });
    }
});