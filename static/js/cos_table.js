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

function storeOriginalValues(card) {
    const statusCell = card.querySelector('.status-pill');
    const contentDisplay = card.querySelector('.cos-content-display');
    const accountablePartyDisplay = card.querySelector('.cos-accountable-party-display');
    const completionDateDisplay = card.querySelector('.cos-completion-date-display');

    card.dataset.originalValues = JSON.stringify({
        status: statusCell.textContent.trim(),
        contentWithPills: contentDisplay.innerHTML, // Store HTML
        accountableParty: accountablePartyDisplay.textContent.trim(),
        completionDate: completionDateDisplay.textContent.trim()
    });
}

function revertToOriginalValues(card) {
    const originalValues = JSON.parse(card.dataset.originalValues);
    const statusCell = card.querySelector('.status-cell select') || card.querySelector('.status-pill'); // Check for select or pill
    const contentDisplay = card.querySelector('.cos-content-display');
    const accountablePartyDisplay = card.querySelector('.cos-accountable-party-display');
    const completionDateDisplay = card.querySelector('.cos-completion-date-display');


    statusCell.outerHTML = `<span class="status-pill ${getBadgeClassFromStatus(originalValues.status)}">${originalValues.status}</span>`; // Restore pill
    contentDisplay.innerHTML = originalValues.contentWithPills; // Restore HTML
    contentDisplay.classList.remove('d-none'); // Show display div
    contentDisplay.nextElementSibling.classList.add('d-none'); // Hide edit div (assuming edit div is immediately after display div)
    accountablePartyDisplay.textContent = originalValues.accountableParty;
    accountablePartyDisplay.classList.remove('d-none');
    accountablePartyDisplay.nextElementSibling.classList.add('d-none'); // Hide edit input
    completionDateDisplay.textContent = originalValues.completionDate;
    completionDateDisplay.classList.remove('d-none');
    completionDateDisplay.nextElementSibling.classList.add('d-none'); // Hide edit input
}

function updateCardWithNewValues(card, cos) {
    if (cos && cos.status && cos.content) {
        card.querySelector('.status-pill').className = `status-pill ${getBadgeClassFromStatus(cos.status)}`; // Update class
        card.querySelector('.status-pill').textContent = cos.status.toUpperCase(); // Update text
        card.querySelector('.cos-content-display').innerHTML = cos.content; // Use innerHTML for content
        card.querySelector('.cos-accountable-party-display').textContent = cos.accountable_party || '';
        card.querySelector('.cos-completion-date-display').textContent = cos.completion_date || '';
        initializeCEPillEventListeners(); // Re-initialize after update
        renderCEPillsForCOS(card, cos.content); // Render pills AFTER update
    } else {
        console.error('Error: COS data is undefined or missing properties', cos);
        alert('An error occurred while updating the entry.');
    }
}

function toggleEditMode(card, editing) {
    const editButton = card.querySelector('.edit-cos-button');
    const updateButton = card.querySelector('.update-cos-button');
    const cancelButton = card.querySelector('.cancel-cos-button');
    const contentDisplay = card.querySelector('.cos-content-display');
    const contentEdit = card.querySelector('.cos-content-edit');
    const accountablePartyDisplay = card.querySelector('.cos-accountable-party-display');
    const accountablePartyEdit = card.querySelector('.cos-accountable-party-edit');
    const completionDateDisplay = card.querySelector('.cos-completion-date-display');
    const completionDateEdit = card.querySelector('.cos-completion-date-edit');

    if (editing) {
        editButton.classList.add('d-none');
        updateButton.classList.remove('d-none');
        cancelButton.classList.remove('d-none');
        contentDisplay.classList.add('d-none');
        contentEdit.classList.remove('d-none');
        accountablePartyDisplay.classList.add('d-none');
        accountablePartyEdit.classList.remove('d-none');
        completionDateDisplay.classList.add('d-none');
        completionDateEdit.classList.remove('d-none');


    } else {
        editButton.classList.remove('d-none');
        updateButton.classList.add('d-none');
        cancelButton.classList.add('d-none');
        contentDisplay.classList.remove('d-none');
        contentEdit.classList.add('d-none');
        accountablePartyDisplay.classList.remove('d-none');
        accountablePartyEdit.classList.add('d-none');
        completionDateDisplay.classList.remove('d-none');
        completionDateEdit.classList.add('d-none');
    }
}

// --- Event Handlers ---

function handlePhaseTableClick(event) {
    const target = event.target;
    const card = target.closest('.cos-card');
    if (!card) return;

    const cosId = card.dataset.cosId;

    if (target.matches('.edit-cos-button')) {
        turnCardToEditMode(card);
    } else if (target.matches('.update-cos-button')) {
        handleUpdate(card, cosId);
    } else if (target.matches('.cancel-cos-button')) {
        cancelEditMode(card);
    } else if (target.matches('.delete-cos-button')) {
        deleteCOS(cosId, card);
    } else if (target.matches('.analyze-cos-button')) {
        fetchAndDisplayAnalyzedCOS(cosId, card); // Pass card to analyze function
    }
}

function turnCardToEditMode(card) {
    storeOriginalValues(card);

    const statusCell = card.querySelector('.status-pill');
    const contentDisplay = card.querySelector('.cos-content-display');
    const contentEdit = card.querySelector('.cos-content-edit');
    const accountablePartyDisplay = card.querySelector('.cos-accountable-party-display');
    const accountablePartyEdit = card.querySelector('.cos-accountable-party-edit');
    const completionDateDisplay = card.querySelector('.cos-completion-date-display');
    const completionDateEdit = card.querySelector('.cos-completion-date-edit');


    const currentStatus = statusCell.textContent.trim();
    const currentContent = contentDisplay.innerHTML; // Get HTML content
    const currentAccountableParty = accountablePartyDisplay.textContent.trim();
    const currentCompletionDate = completionDateDisplay.textContent.trim();

    statusCell.outerHTML = createStatusDropdown(currentStatus); // Replace pill with dropdown
    contentDisplay.classList.add('d-none'); // Hide display div
    contentEdit.classList.remove('d-none'); // Show edit div
    contentEdit.querySelector('textarea').value = currentContent; // Set textarea value
    accountablePartyDisplay.classList.add('d-none');
    accountablePartyEdit.classList.remove('d-none');
    accountablePartyEdit.value = currentAccountableParty;
    completionDateDisplay.classList.add('d-none');
    completionDateEdit.classList.remove('d-none');
    completionDateEdit.value = currentCompletionDate;

    toggleEditMode(card, true);
}

function handleUpdate(card, cosId) {
    const contentInput = card.querySelector('.cos-content-edit textarea');
    const newContent = contentInput ? contentInput.value.trim() : '';
    const statusSelect = card.querySelector('.status-cell select');
    const statusInput = statusSelect.options[statusSelect.selectedIndex].value;
    const accountablePartyInput = card.querySelector('.cos-accountable-party-edit input').value.trim();
    const completionDateInput = card.querySelector('.cos-completion-date-edit input').value;

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
            updateCardWithNewValues(card, data.cos);
            toggleEditMode(card, false);
        } else {
            throw new Error(data.error || 'An error occurred while updating.');
        }
    })
    .catch(error => {
        console.error('Error updating COS:', error);
        alert(`Error: ${error.message}`);
    });
}

function cancelEditMode(card) {
    revertToOriginalValues(card);
    toggleEditMode(card, false);
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
            const phaseCardGrid = document.querySelector(`#${phaseName.replace(/ /g, '_')}-accordion .cos-card-grid`);
            const newCard = document.createElement('div');
            newCard.classList.add('cos-card');
            newCard.dataset.cosId = data.cos.id;
            newCard.innerHTML = `
                <div class="cos-card-header">
                    <span class="status-pill ${getBadgeClassFromStatus('Proposed')}">PROPOSED</span>
                    <div class="cos-actions">
                        <button class="btn btn-sm btn-primary edit-cos-button" title="Edit COS"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-success update-cos-button d-none" title="Update COS"><i class="fas fa-check"></i></button>
                        <button class="btn btn-sm btn-secondary cancel-cos-button d-none" title="Cancel Edit"><i class="fas fa-times"></i></button>
                        <button class="btn btn-sm btn-danger delete-cos-button" title="Delete COS"><i class="fas fa-trash"></i></button>
                        <button class="btn btn-sm btn-info analyze-cos-button" data-cos-id="${data.cos.id}" title="Analyze COS"><i class="fas fa-search-plus"></i></button>
                    </div>
                </div>
                <div class="cos-card-body">
                    <div class="cos-content-display">
                        ${data.cos.content}
                    </div>
                    <div class="cos-content-edit d-none">
                        <textarea class="form-control form-control-sm cos-content-textarea" rows="3">${data.cos.content}</textarea>
                    </div>
                    <div class="cos-details">
                        <div class="detail-item">
                            <label class="detail-label">Accountable Party:</label>
                            <span class="cos-accountable-party-display"></span>
                            <input type="text" class="form-control form-control-sm cos-accountable-party-edit d-none" value="">
                        </div>
                        <div class="detail-item">
                            <label class="detail-label">Completion Date:</label>
                            <span class="cos-completion-date-display"></span>
                            <input type="date" class="form-control form-control-sm cos-completion-date-edit d-none" value="">
                        </div>
                    </div>
                </div>
                <div class="ce-pills-container"></div>
            `;
            phaseCardGrid.appendChild(newCard);
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


function deleteCOS(cosId, card) {
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
                card.remove();
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

function fetchAndDisplayAnalyzedCOS(cosId, card) { // Pass card as argument
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
            const cosContentDisplay = card.querySelector('.cos-content-display'); // Get cos-content-display from card
            if (cosContentDisplay) {
                cosContentDisplay.innerHTML = data.analysis_results.content_with_ce;
                initializeCEPillEventListeners();  // VERY IMPORTANT: Re-initialize after updating content
                renderCEPillsForCOS(card, data.analysis_results.content_with_ce); // Render pills AFTER analysis
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

function renderCEPillsForCOS(card, cosContent) {
    const pillsContainer = card.querySelector('.ce-pills-container');
    if (!pillsContainer) {
        console.error("CE pills container not found in card");
        return;
    }
    pillsContainer.innerHTML = ''; // Clear existing pills

    const tempContainer = document.createElement('div'); // Temporary container for parsing
    tempContainer.innerHTML = cosContent;

    // Find all ce-pill elements within cosContent (assuming backend returns with pills already rendered)
    const cePills = tempContainer.querySelectorAll('.ce-pill');
    cePills.forEach(pill => {
        pillsContainer.appendChild(pill.cloneNode(true)); // Clone and append each pill
    });

    initializeCEPillEventListeners(); // Re-initialize listeners for new pills
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
        const ceType = event.currentTarget.dataset.ceType || "Default";
        const cosContent = event.target.closest('.cos-card').querySelector('.cos-content-display').textContent.trim(); // Closest card, then content display
        const phaseElement = event.target.closest('.accordion-item');
        const phaseName = phaseElement.querySelector('.accordion-header button').innerText.trim();
        const phaseIndex = Array.from(phaseElement.parentElement.children).indexOf(phaseElement);

        fetch(`/get_ce_modal/${encodeURIComponent(ceType)}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ce_id: ceId,
                cos_content: cosContent,
                phase_name: phaseName,
                phase_index: phaseIndex,
                ssol_goal: document.querySelector('#ssol-goal').textContent.trim()
            })
        })
        .then(handleResponse)
        .then(data => {
            if (data && data.modal_html) {
                displayCEModal(data.modal_html, ceId, ceType, cosContent, phaseName, phaseIndex, data.ai_generated_data); // Use FULL call with modal_html and ai_generated_data
            } else {
              throw new Error('Modal HTML content not found or error in response');
            }
        }).catch(error => {
            console.error('Error fetching modal content:', error);
            alert('Error fetching CE Data');
        });
    } else {
        console.warn('Clicked CE pill has no data-ce-id');
    }
}

function initializePhaseTableEventListeners() { // Define the function here
    document.querySelectorAll('.phase-card-container').forEach(container => { // Event listener on phase card container
        container.removeEventListener('click', handlePhaseTableClick);
        container.addEventListener('click', handlePhaseTableClick);
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
        const card = event.target.closest('.cos-card'); // Get card from button click
        if (cosId && card) {
            fetchAndDisplayAnalyzedCOS(cosId, card); // Pass card to analyze function
        } else {
            console.warn('Analyze button missing data-cos-id or closest card not found');
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