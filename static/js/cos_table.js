// cos_table.js — SSPEC Horizon Phase Table (Card Layout v2)
import { displayCEModal } from './ce_cards.js';
import { showLoadingSpinner, hideLoadingSpinner } from './base_functions.js';

// --- Utility Functions ---

const STATUS_CYCLE = ['Proposed', 'Active', 'Completed', 'Rejected'];

function getBadgeColorVar(status) {
    switch (status) {
        case 'Proposed': return '#17a2b8';
        case 'Active': return 'var(--warning)';
        case 'In Progress': return 'var(--warning)';
        case 'Completed': return 'var(--success)';
        case 'Verified': return 'var(--success)';
        case 'Rejected': return 'var(--danger)';
        default: return '#94a3b8';
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

// --- Phase Progress Tracking ---

function updatePhaseProgress(accordionItem) {
    if (!accordionItem) return;
    const cards = accordionItem.querySelectorAll('.cos-card');
    const total = cards.length;
    let satisfied = 0;

    cards.forEach(card => {
        const statusBlock = card.querySelector('.status-block');
        if (statusBlock) {
            const status = statusBlock.textContent.trim().toUpperCase();
            if (status === 'COMPLETED' || status === 'VERIFIED') {
                satisfied++;
            }
        }
    });

    // Update progress pill
    const countEl = accordionItem.querySelector('.phase-progress-count');
    const totalEl = accordionItem.querySelector('.phase-progress-total');
    if (countEl) countEl.textContent = satisfied;
    if (totalEl) totalEl.textContent = total;

    // Update progress bar
    const progressBar = accordionItem.querySelector('.phase-progress-bar');
    if (progressBar) {
        const pct = total > 0 ? (satisfied / total) * 100 : 0;
        progressBar.style.width = `${pct}%`;
    }

    // Toggle phase-complete class on header
    const header = accordionItem.querySelector('.module-header');
    if (header) {
        if (total > 0 && satisfied === total) {
            header.classList.add('phase-complete');
        } else {
            header.classList.remove('phase-complete');
        }
    }
}

function updateAllPhaseProgress() {
    document.querySelectorAll('.accordion-item').forEach(item => {
        updatePhaseProgress(item);
    });
}

// --- DOM Manipulation & State ---

function storeOriginalValues(cosCard) {
    const statusBlock = cosCard.querySelector('.status-block');
    const contentDisplay = cosCard.querySelector('.cos-content-display');
    const stakeholderTags = cosCard.querySelectorAll('.cos-stakeholder-tag');
    const datePill = cosCard.querySelector('.cos-date-pill');

    // Extract accountable parties from tags
    const parties = Array.from(stakeholderTags)
        .map(tag => tag.textContent.trim())
        .filter(t => t && t !== 'Assign');

    cosCard.dataset.originalValues = JSON.stringify({
        status: statusBlock ? statusBlock.textContent.trim() : 'PROPOSED',
        statusColor: statusBlock ? statusBlock.style.backgroundColor : '#17a2b8',
        contentHTML: contentDisplay ? contentDisplay.innerHTML : '',
        accountable: parties.join(', '),
        date: datePill ? datePill.textContent.replace(/[^\w\s/-]/g, '').trim() : ''
    });
}

function revertToOriginalValues(cosCard) {
    if (!cosCard.dataset.originalValues) return;
    const original = JSON.parse(cosCard.dataset.originalValues);

    // Revert Status
    const statusBlock = cosCard.querySelector('.status-block');
    if (statusBlock) {
        statusBlock.textContent = original.status;
        statusBlock.style.backgroundColor = original.statusColor;
    }

    // Revert Content
    const contentDisplay = cosCard.querySelector('.cos-content-display');
    if (contentDisplay) contentDisplay.innerHTML = original.contentHTML;

    toggleEditModeUI(cosCard, false);
}

function updateRowDisplay(cosCard, cosData) {
    // 1. Update Status Block
    const statusBlock = cosCard.querySelector('.status-block');
    if (statusBlock) {
        const color = getBadgeColorVar(cosData.status);
        statusBlock.textContent = cosData.status.toUpperCase();
        statusBlock.style.backgroundColor = color;
    }

    // 2. Update Content
    const contentDisplay = cosCard.querySelector('.cos-content-display');
    if (contentDisplay) contentDisplay.innerHTML = cosData.content;

    // 3. Update Stakeholder Tags
    const metaLeft = cosCard.querySelector('.cos-meta-left');
    if (metaLeft) {
        // Remove old tags
        metaLeft.querySelectorAll('.cos-stakeholder-tag').forEach(t => t.remove());

        // Build new tags
        const parties = (cosData.accountable_party || '').split(',').map(s => s.trim()).filter(Boolean);
        const datePill = metaLeft.querySelector('.cos-date-pill');

        if (parties.length > 0) {
            parties.forEach(party => {
                const tag = document.createElement('span');
                tag.className = 'cos-stakeholder-tag';
                tag.innerHTML = `<i class="fas fa-user-circle"></i> ${party}`;
                metaLeft.insertBefore(tag, datePill);
            });
        } else {
            const tag = document.createElement('span');
            tag.className = 'cos-stakeholder-tag';
            tag.style.opacity = '0.4';
            tag.innerHTML = `<i class="fas fa-user-plus"></i> Assign`;
            metaLeft.insertBefore(tag, datePill);
        }

        // Update date pill text
        if (datePill) {
            const dateText = cosData.completion_date || 'TBD';
            datePill.innerHTML = `<i class="fas fa-calendar"></i> ${dateText}`;
        }
    }

    // 4. Update phase progress
    const accItem = cosCard.closest('.accordion-item');
    updatePhaseProgress(accItem);
}

function toggleEditModeUI(cosCard, editing) {
    cosCard.dataset.editing = editing.toString();

    // Show/hide content display vs edit panel
    const contentDisplay = cosCard.querySelector('.cos-content-display');
    const editPanel = cosCard.querySelector('.cos-edit-panel');
    const metaBar = cosCard.querySelector('.cos-card-meta');

    if (editing) {
        // Pre-populate textarea
        const textarea = cosCard.querySelector('.cos-content-edit-textarea');
        if (contentDisplay && textarea) {
            textarea.value = stripHtmlForTextarea(contentDisplay.innerHTML);
        }
        if (contentDisplay) contentDisplay.style.display = 'none';
        if (editPanel) editPanel.style.display = 'block';
        if (metaBar) metaBar.style.display = 'none';
    } else {
        if (contentDisplay) contentDisplay.style.display = '';
        if (editPanel) editPanel.style.display = '';
        if (metaBar) metaBar.style.display = '';
        cosCard.dataset.editing = 'false';
    }
}

function stripHtmlForTextarea(htmlString) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlString;

    // Find any cos-badge spans and replace with bracket text from title attribute
    const badges = tempDiv.querySelectorAll('.cos-badge');
    badges.forEach(badge => {
        const title = (badge.getAttribute('title') || '').toUpperCase();
        let bracketText = '';
        if (title.includes('COMMITTED') || title.includes('IMMUTABLE')) {
            bracketText = '[CONSTRAINT]';
        } else if (title.includes('FLEXIBLE') || title.includes('RECOMMENDATION')) {
            bracketText = '[SOFT GUIDELINE]';
        } else if (title.includes('PROPOSED') || title.includes('DIRECTION')) {
            bracketText = '[GUIDELINE]';
        }
        if (bracketText) {
            const textNode = document.createTextNode(`${bracketText} `);
            badge.parentNode.replaceChild(textNode, badge);
        } else {
            badge.remove();
        }
    });

    return tempDiv.textContent || tempDiv.innerText || "";
}

// --- Status Cycling ---

function handleStatusCycle(statusBlock, cosCard) {
    const currentText = statusBlock.textContent.trim();
    // Find current index in cycle
    const currentIndex = STATUS_CYCLE.findIndex(s => s.toUpperCase() === currentText.toUpperCase());
    const nextIndex = (currentIndex + 1) % STATUS_CYCLE.length;
    const nextStatus = STATUS_CYCLE[nextIndex];

    // Update display immediately for responsiveness
    statusBlock.textContent = nextStatus.toUpperCase();
    statusBlock.style.backgroundColor = getBadgeColorVar(nextStatus);

    // Animate
    statusBlock.style.transform = 'scale(1.15)';
    setTimeout(() => { statusBlock.style.transform = ''; }, 200);

    // Persist to server
    const cosId = cosCard.dataset.cosId;
    fetch(`/update_cos/${cosId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
    })
    .then(handleApiResponse)
    .then(data => {
        if (data.success) {
            // Update phase progress
            const accItem = cosCard.closest('.accordion-item');
            updatePhaseProgress(accItem);
        }
    })
    .catch(err => {
        // Revert on failure
        statusBlock.textContent = currentText;
        statusBlock.style.backgroundColor = getBadgeColorVar(currentText);
        console.error('Status cycle failed:', err);
    });
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

    // 2. Status Cycle Click
    const statusBlock = target.closest('.status-block[data-status-cycle]');
    if (statusBlock) {
        event.preventDefault();
        const cosCard = statusBlock.closest('.cos-card');
        if (cosCard) handleStatusCycle(statusBlock, cosCard);
        return;
    }

    // 3. Action Buttons
    const button = target.closest('button');
    if (!button) return;

    const cosCard = button.closest('.cos-card');
    if (!cosCard) return;

    event.preventDefault();
    const cosId = cosCard.dataset.cosId;

    if (button.classList.contains('edit-cos-button')) {
        handleEditCOS(cosCard);
    } else if (button.classList.contains('workshop-accountable-btn')) {
        handleWorkshopAccountable(cosCard, cosId);
    } else if (button.classList.contains('update-cos-button')) {
        handleUpdateCOS(cosCard, cosId);
    } else if (button.classList.contains('cancel-cos-button')) {
        revertToOriginalValues(cosCard);
    } else if (button.classList.contains('delete-cos-button')) {
        handleDeleteCOS(cosCard, cosId);
    } else if (button.classList.contains('govern-phase-button')) {
        handleGovernPhase(cosCard, cosId);
    }
}

function handleEditCOS(cosCard) {
    if (cosCard.dataset.editing === 'true') return;
    storeOriginalValues(cosCard);
    toggleEditModeUI(cosCard, true);
}

function handleUpdateCOS(cosCard, cosId) {
    // Gather Data from edit panel
    const newContent = cosCard.querySelector('.cos-content-edit-textarea')?.value.trim() || '';
    const newStatus = cosCard.querySelector('.status-edit-select')?.value || 'Proposed';
    const newAccountable = cosCard.querySelector('.cos-accountable-party-edit')?.value.trim();
    const newDate = cosCard.querySelector('.cos-completion-date-edit')?.value;

    // UI Feedback
    const btn = cosCard.querySelector('.update-cos-button');
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
            updateRowDisplay(cosCard, data.cos);
            toggleEditModeUI(cosCard, false);
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

function handleDeleteCOS(cosCard, cosId) {
    if (!confirm('Are you sure? This will delete the Condition and all its internal logic nodes.')) return;

    fetch(`/delete_cos/${cosId}`, { method: 'DELETE' })
    .then(handleApiResponse)
    .then(() => {
        const accItem = cosCard.closest('.accordion-item');
        cosCard.remove();
        updatePhaseProgress(accItem);
    })
    .catch(err => alert(err.message));
}

function handleAddCOSButtonClick(event) {
    const button = event.currentTarget;

    // 1. Locate Context
    const container = button.closest('.phase-table-container');
    if (!container) return console.error("Phase container not found.");

    const ssolId = container.dataset.ssolId;
    if (!ssolId) return alert("System Error: SSOL Context Missing.");

    const accItem = button.closest('.accordion-item');
    const allItems = Array.from(document.querySelectorAll('.accordion-item'));
    const phaseIndex = accItem ? allItems.indexOf(accItem) : 0;

    // 2. Visual Feedback (Loading State)
    const originalHtml = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<i class="fas fa-circle-notch fa-spin me-2"></i> INITIALIZING...`;

    // 3. Construct Payload
    const payload = {
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
    .then(handleApiResponse)
    .then(data => {
        if (data.success && data.cos) {
            // 5. Inject into DOM
            const cardList = container.querySelector('.cos-card-list');
            const newCardHtml = createCardHTML(data.cos, phaseIndex);

            if (cardList) {
                // SCENARIO A: Card list exists, append
                cardList.insertAdjacentHTML('beforeend', newCardHtml);
            } else {
                // SCENARIO B: Empty State — build card list
                const emptyState = container.querySelector('.text-center.text-muted');
                if (emptyState) emptyState.remove();

                const listHtml = `<div class="cos-card-list">${newCardHtml}</div>`;
                // Insert before the footer
                const footer = container.querySelector('.add-cos-footer');
                if (footer) {
                    footer.insertAdjacentHTML('beforebegin', listHtml);
                } else {
                    container.insertAdjacentHTML('afterbegin', listHtml);
                }
            }

            // Update phase progress
            updatePhaseProgress(accItem);
        }
    })
    .catch(err => {
        console.error("COS Creation Failed:", err);
        alert("Failed to initialize new Condition. Check console.");
    })
    .finally(() => {
        button.disabled = false;
        button.innerHTML = originalHtml;
    });
}


// --- HTML Generator for New Cards (Matches outcome.html card structure) ---
function createCardHTML(cos, phaseIndex = 0) {
    const statusColor = getBadgeColorVar(cos.status || 'Proposed');
    const statusText = (cos.status || 'Proposed').toUpperCase();
    const content = cos.content || '';
    const rawContent = stripHtmlForTextarea(content);
    const accountable = cos.accountable_party || '';
    const date = cos.completion_date || '';

    // Build stakeholder tags
    let stakeholderHtml = '';
    if (accountable) {
        accountable.split(',').forEach(party => {
            const p = party.trim();
            if (p) stakeholderHtml += `<span class="cos-stakeholder-tag"><i class="fas fa-user-circle"></i> ${p}</span>`;
        });
    }
    if (!stakeholderHtml) {
        stakeholderHtml = `<span class="cos-stakeholder-tag" style="opacity: 0.4;"><i class="fas fa-user-plus"></i> Assign</span>`;
    }

    return `
    <div class="cos-card" data-cos-id="${cos.id}" data-editing="false" style="--row-phase-color: var(--phase-${phaseIndex});">
        <!-- Tier 1: Status + Content -->
        <div class="cos-card-content">
            <span class="status-block" data-status-cycle="true" style="background-color: ${statusColor};" title="Click to change status">${statusText}</span>
            <div class="cos-content-text">
                <div class="cos-content-display">${content}</div>
            </div>
        </div>
        <!-- Tier 2: Metadata -->
        <div class="cos-card-meta">
            <div class="cos-meta-left">
                ${stakeholderHtml}
                <span class="cos-date-pill"><i class="fas fa-calendar"></i> ${date || 'TBD'}</span>
            </div>
            <div class="cos-meta-actions">
                <button class="btn btn-sm btn-link text-muted edit-cos-button" title="Edit"><i class="fas fa-pen"></i></button>
                <button class="btn btn-sm btn-link text-danger delete-cos-button" title="Delete"><i class="fas fa-trash"></i></button>
                <button class="btn btn-sm govern-phase-button" title="Govern"><i class="fas fa-shield-halved me-1"></i>GOVERN</button>
            </div>
        </div>
        <!-- Edit Panel (hidden by default) -->
        <div class="cos-edit-panel">
            <textarea class="cos-content-edit-textarea">${rawContent}</textarea>
            <div class="cos-edit-fields">
                <label><i class="fas fa-user-circle"></i> Accountable:
                    <input type="text" class="cos-accountable-party-edit" value="${accountable}" placeholder="e.g. Marketing Team, Product Lead">
                </label>
                <label><i class="fas fa-calendar"></i> Target:
                    <input type="date" class="cos-completion-date-edit" value="${date}">
                </label>
                <label><i class="fas fa-flag"></i> Status:
                    <select class="status-edit-select" style="border-radius: 9999px; border: 1px solid #cbd5e1; padding: 4px 12px; font-family: var(--font-data); font-size: 0.75rem;">
                        <option value="Proposed" ${cos.status === 'Proposed' ? 'selected' : ''}>Proposed</option>
                        <option value="Active" ${cos.status === 'Active' ? 'selected' : ''}>Active</option>
                        <option value="Completed" ${cos.status === 'Completed' ? 'selected' : ''}>Completed</option>
                        <option value="Rejected" ${cos.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                    </select>
                </label>
            </div>
            <div class="cos-edit-actions">
                <button class="btn cancel-cos-button"><i class="fas fa-times me-1"></i>Cancel</button>
                <button class="btn update-cos-button"><i class="fas fa-check me-1"></i>Save</button>
            </div>
        </div>
    </div>`;
}

// --- MAIN: Launch the CE Modal Application ---

export function handleCEPillClick(pill) {
    const ceId = pill.dataset.ceId;
    const ceType = pill.dataset.ceType || "Default";

    // Safe access to NODES using window object (injected in base.html)
    const iconClass = (window.NODES && window.NODES[ceType]?.icon) || 'fas fa-cube';

    showLoadingSpinner(`INITIALIZING ${ceType.toUpperCase()} NODE...`, iconClass);

    // Scrape context for the modal initialization
    const cosCard = pill.closest('.cos-card');
    const ssolGoal = document.getElementById('ssol-goal')?.textContent.trim() || "Goal";
    const cosContent = cosCard?.querySelector('.cos-content-display')?.innerHTML || '';

    const accItem = cosCard?.closest('.accordion-item');
    const phaseText = accItem?.querySelector('.phase-title-text')?.textContent.trim() || "Unknown";

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
    // Card Actions (Delegated)
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
            const id = e.currentTarget.dataset.ssolId;
            alert("Generating PDF report...");
        });
    }

    // Calculate initial phase progress
    updateAllPhaseProgress();
});


// --- GOVERNANCE ---

let currentGovernCosId = null;

function handleGovernPhase(cosCard, cosId) {
    currentGovernCosId = cosId;

    // Get COS content to display
    const contentDisplay = cosCard.querySelector('.cos-content-display');
    const modalTextContainer = document.getElementById('governModalCosText');
    if(contentDisplay && modalTextContainer) {
        modalTextContainer.innerHTML = contentDisplay.innerHTML;
    }
    
    // Dynamically match header color to the phase color
    const header = document.getElementById('governModalHeader');
    if (header) {
        const phaseColor = getComputedStyle(cosCard).getPropertyValue('--row-phase-color').trim() || '#0ea5e9';
        header.style.backgroundColor = phaseColor;
    }
    
    // Set current values
    const currentStatus = cosCard.querySelector('.status-edit-select')?.querySelector('option[selected]')?.value || 'Active';
    const currentAccountable = cosCard.querySelector('.cos-accountable-party-edit')?.value || '';
    
    document.getElementById('governStatus').value = currentStatus;
    document.getElementById('governAccountable').value = currentAccountable;
    document.getElementById('governShoebox').value = '';
    document.getElementById('governNotes').value = '';
    
    // Clear the file lister
    window.governSelectedFiles = [];
    const fileListEl = document.getElementById('shoeboxFileList');
    if (fileListEl) fileListEl.innerHTML = '';
    
    // Attempt to load ledger if it exists (fetching the COS data directly might be better, 
    // but for now we just show it empty until they submit. Ideally, we would fetch the COS data here)
    const ledgerContainer = document.getElementById('governLedgerContainer');
    ledgerContainer.style.display = 'none';

    // Show Modal
    const modalEl = document.getElementById('governModal');
    if(modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    
    // --- File Chooser Logic ---
    window.governSelectedFiles = [];
    const dropZone = document.getElementById('shoeboxDropZone');
    const fileInput = document.getElementById('governShoeboxFiles');
    const fileList = document.getElementById('shoeboxFileList');

    if (dropZone && fileInput && fileList) {
        dropZone.addEventListener('click', () => fileInput.click());
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--aviation-teal)';
            dropZone.style.background = '#e0f2fe';
        });
        
        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = '#cbd5e1';
            dropZone.style.background = '#f8fafc';
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = '#cbd5e1';
            dropZone.style.background = '#f8fafc';
            if(e.dataTransfer.files.length) {
                handleFiles(e.dataTransfer.files);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if(e.target.files.length) {
                handleFiles(e.target.files);
            }
            // Reset input so the same file can be selected again if removed
            fileInput.value = '';
        });

        function handleFiles(files) {
            Array.from(files).forEach(file => {
                window.governSelectedFiles.push(file);
            });
            renderFileList();
        }

        function renderFileList() {
            fileList.innerHTML = '';
            window.governSelectedFiles.forEach((file, idx) => {
                const size = (file.size / 1024).toFixed(1) + ' KB';
                const div = document.createElement('div');
                div.className = 'd-flex align-items-center justify-content-between p-2 border rounded-3 bg-white shadow-sm';
                div.innerHTML = `
                    <div class="d-flex align-items-center gap-2 overflow-hidden">
                        <i class="fas fa-file-lines text-muted"></i>
                        <div class="text-truncate font-body small text-dark">${file.name}</div>
                        <div class="font-data x-small text-muted ms-2">${size}</div>
                    </div>
                    <button type="button" class="btn btn-sm btn-link text-danger p-0 ms-2" onclick="removeShoeboxFile(${idx})"><i class="fas fa-times"></i></button>
                `;
                fileList.appendChild(div);
            });
        }

        window.removeShoeboxFile = function(idx) {
            window.governSelectedFiles.splice(idx, 1);
            renderFileList();
        }
    }

    // --- Submission Logic ---
    const submitGovernBtn = document.getElementById('submitGovernBtn');
    if(submitGovernBtn) {
        submitGovernBtn.addEventListener('click', async () => {
            if(!currentGovernCosId) return;
            
            submitGovernBtn.disabled = true;
            submitGovernBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> RECORDING...';
            
            // Construct Shoebox Content (combining files and text links)
            let finalShoeboxData = document.getElementById('governShoebox').value.trim();
            if (window.governSelectedFiles.length > 0) {
                const fileNames = window.governSelectedFiles.map(f => f.name).join(', ');
                finalShoeboxData = `Attached Files: [${fileNames}]\n${finalShoeboxData}`;
            }
            
            const payload = {
                status: document.getElementById('governStatus').value,
                accountable: document.getElementById('governAccountable').value.trim(),
                shoebox: finalShoeboxData,
                notes: document.getElementById('governNotes').value.trim()
            };
            
            try {
                const response = await fetch(`/api/cos/${currentGovernCosId}/govern`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                const data = await handleApiResponse(response);
                if (data.success) {
                    // Reload the page to reflect all changes in the UI natively
                    window.location.reload();
                }
            } catch (error) {
                console.error("Governance Error:", error);
                alert("Failed to record governance decision. See console.");
                submitGovernBtn.disabled = false;
                submitGovernBtn.innerHTML = 'RECORD DECISION';
            }
        });
    }
});

function runCosDiagnostics() {
    if(!currentGovernCosId) return;

    const loader = document.getElementById('cosDiagnosticsLoader');
    const resultsContainer = document.getElementById('cosDiagnosticsResults');
    const feed = document.getElementById('cosAdvocateFeed');

    loader.classList.remove('d-none');
    resultsContainer.innerHTML = '';

    fetch(`/api/cos/${currentGovernCosId}/diagnose`, { method: 'POST' })
    .then(r => r.json())
    .then(data => {
        if(data.success && data.diagnostics) {
            renderDiagnostics(data.diagnostics);
            if(data.diagnostics.advocate_message) {
                appendCosAdvocateMessage(data.diagnostics.advocate_message);
            }
        } else {
            throw new Error(data.error || "Failed to analyze diagnostics.");
        }
    })
    .catch(err => {
        resultsContainer.innerHTML = `<div class="text-danger small p-3 text-center">${err.message}</div>`;
    })
    .finally(() => {
        loader.classList.add('d-none');
    });
}

function renderDiagnostics(diag) {
    const resultsContainer = document.getElementById('cosDiagnosticsResults');
    resultsContainer.style.pointerEvents = 'auto';
    resultsContainer.classList.remove('opacity-50');

    let html = '';
    const axes = [
        { key: 'relatedness', label: 'RELATEDNESS', icon: 'fa-users', desc: 'Party alignment & presence' },
        { key: 'possibility', label: 'POSSIBILITY', icon: 'fa-eye', desc: 'Vision & shared goal' },
        { key: 'opportunity', label: 'OPPORTUNITY', icon: 'fa-map', desc: 'Available paths & options' },
        { key: 'action', label: 'ACTION', icon: 'fa-person-running', desc: 'Execution & blockers' },
        { key: 'completion', label: 'COMPLETION', icon: 'fa-flag-checkered', desc: 'Closure & finalization' }
    ];

    axes.forEach(axis => {
        const status = diag[axis.key] || 'Warning';
        let color = '#f59e0b';
        let iconHtml = '<i class="fas fa-triangle-exclamation"></i>';

        if(status === 'Clear') {
            color = '#10b981';
            iconHtml = '<i class="fas fa-check-circle"></i>';
        } else if(status === 'Blocked') {
            color = '#ef4444';
            iconHtml = '<i class="fas fa-radiation"></i>';
        }

        html += `
            <div class="d-flex align-items-center justify-content-between p-3 rounded-3 border bg-white shadow-sm transition-all" style="border-left: 4px solid ${color} !important;">
                <div class="d-flex align-items-center gap-3">
                    <div class="rounded-circle d-flex align-items-center justify-content-center" style="width:32px;height:32px;background:${color}20;color:${color};">
                        <i class="fas ${axis.icon}"></i>
                    </div>
                    <div>
                        <div class="font-data x-small fw-bold tracking-widest text-dark">${axis.label}</div>
                        <div class="font-body x-small text-muted">${axis.desc}</div>
                    </div>
                </div>
                <div class="d-flex align-items-center gap-2 font-data small fw-bold" style="color:${color};">
                    ${iconHtml} ${status.toUpperCase()}
                </div>
            </div>
        `;
    });

    resultsContainer.innerHTML = html;
}

function appendCosAdvocateMessage(msg) {
    const feed = document.getElementById('cosAdvocateFeed');
    const msgHtml = `
        <div class="d-flex gap-3 ai-message fade-in mt-3">
            <div class="flex-shrink-0"><div class="avatar shadow-sm d-flex align-items-center justify-content-center" style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, var(--aviation-teal), #0097a7);"><i class="fas fa-robot text-white small"></i></div></div>
            <div class="p-3 rounded-4 shadow-sm font-body text-dark flex-grow-1" style="background: #f8fafc; border: 1px solid rgba(0,188,212,0.1); font-size: 0.9rem;">
                ${msg}
            </div>
        </div>
    `;
    feed.insertAdjacentHTML('beforeend', msgHtml);
    feed.scrollTop = feed.scrollHeight;
}

document.addEventListener("DOMContentLoaded", () => {
    const btnRunDiag = document.getElementById('btnRunCosDiagnostics');
    if(btnRunDiag) {
        btnRunDiag.addEventListener('click', runCosDiagnostics);
    }
});

// --- WORKSHOP ACCOUNTABLE MODAL ---

let currentWorkshopInput = null;
let currentWorkshopCosId = null;

function handleWorkshopAccountable(cosCard, cosId) {
    currentWorkshopInput = cosCard.querySelector('.cos-accountable-party-edit');
    currentWorkshopCosId = cosId;
    
    // Clear previous suggestions
    const aiContainer = document.getElementById('advocate-suggestions-container');
    if (aiContainer) {
        aiContainer.innerHTML = `<span class="text-muted small font-body opacity-50"><i class="fas fa-info-circle me-1"></i>Click 'Ask Advocate' to analyze this condition and suggest roles.</span>`;
    }
    
    // Gather existing stakeholders from the table
    const existingContainer = document.getElementById('existing-stakeholders-container');
    if (existingContainer) {
        existingContainer.innerHTML = '';
        
        // Find all unique stakeholder tags currently rendered in the table
        const uniqueStakeholders = new Set();
        document.querySelectorAll('.cos-stakeholder-tag').forEach(tag => {
            const text = tag.textContent.trim();
            if (text && text !== 'Assign') uniqueStakeholders.add(text);
        });
        
        if (uniqueStakeholders.size === 0) {
            existingContainer.innerHTML = `<span class="text-muted small font-body fst-italic">No stakeholders assigned yet.</span>`;
        } else {
            uniqueStakeholders.forEach(name => {
                const pill = document.createElement('button');
                pill.className = 'btn btn-sm btn-outline-secondary rounded-pill font-data small mb-1';
                pill.innerHTML = `<i class="fas fa-user-circle me-1"></i>${name}`;
                pill.onclick = () => selectWorkshopAccountable(name);
                existingContainer.appendChild(pill);
            });
        }
    }
    
    // Attach listener to Advocate button (re-create to avoid duplicates)
    const btnAsk = document.getElementById('btn-ask-advocate-accountable');
    if (btnAsk) {
        const newBtn = btnAsk.cloneNode(true);
        btnAsk.parentNode.replaceChild(newBtn, btnAsk);
        newBtn.addEventListener('click', runWorkshopAdvocate);
    }

    const modalEl = document.getElementById('accountableWorkshopModal');
    if (modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
}

function runWorkshopAdvocate() {
    if (!currentWorkshopCosId) return;
    
    const aiContainer = document.getElementById('advocate-suggestions-container');
    const btnAsk = document.getElementById('btn-ask-advocate-accountable');
    
    btnAsk.innerHTML = '<i class="fas fa-circle-notch fa-spin me-1"></i>ANALYZING...';
    btnAsk.disabled = true;
    aiContainer.innerHTML = `<div class="spinner-border spinner-border-sm text-info" role="status"></div><span class="ms-2 small text-muted">Advocate is analyzing condition...</span>`;
    
    fetch(`/api/cos/${currentWorkshopCosId}/workshop_accountable`, { method: 'POST' })
    .then(r => r.json())
    .then(data => {
        aiContainer.innerHTML = '';
        if (data.success && data.suggestions && data.suggestions.length > 0) {
            data.suggestions.forEach(role => {
                const pill = document.createElement('button');
                pill.className = 'btn btn-sm rounded-pill font-data small fw-bold mb-1';
                pill.style.background = 'rgba(0,188,212,0.1)';
                pill.style.color = 'var(--deep-space-blue)';
                pill.style.border = '1px solid rgba(0,188,212,0.3)';
                pill.innerHTML = `<i class="fas fa-plus me-1" style="color: var(--aviation-teal);"></i>${role}`;
                pill.onclick = () => selectWorkshopAccountable(role);
                aiContainer.appendChild(pill);
            });
        } else {
            aiContainer.innerHTML = `<span class="text-danger small">No suggestions found.</span>`;
        }
    })
    .catch(err => {
        console.error(err);
        aiContainer.innerHTML = `<span class="text-danger small">Error contacting Advocate.</span>`;
    })
    .finally(() => {
        btnAsk.innerHTML = '<i class="fas fa-sparkles me-1" style="color: var(--aviation-teal);"></i>ASK ADVOCATE';
        btnAsk.disabled = false;
    });
}

function selectWorkshopAccountable(name) {
    if (currentWorkshopInput) {
        let currentVal = currentWorkshopInput.value.trim();
        // Prevent exact duplicates
        if (currentVal.split(',').map(s => s.trim()).includes(name)) {
            // Already there
        } else {
            if (currentVal) {
                currentWorkshopInput.value = currentVal + ", " + name;
            } else {
                currentWorkshopInput.value = name;
            }
        }
    }
    
    const modalEl = document.getElementById('accountableWorkshopModal');
    if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
    }
}

// --- ALIGNMENT QUEUE LOGIC ---
let alignmentQueue = [];
let alignmentIndex = 0;

window.openAlignmentQueue = function() {
    // Find all holographic cards on the page
    const cards = Array.from(document.querySelectorAll('.cos-card[data-holographic="true"]'));
    if (cards.length === 0) return;
    
    alignmentQueue = cards.map(c => {
        return {
            id: c.dataset.cosId,
            contentHtml: c.querySelector('.cos-content-display').innerHTML,
            accountable: c.querySelector('.cos-accountable-party-edit')?.value || 'Unassigned',
            element: c
        };
    });
    
    alignmentIndex = 0;
    renderAlignmentItem();
    
    const modal = new bootstrap.Modal(document.getElementById('alignmentModal'));
    modal.show();
}

function renderAlignmentItem() {
    if (alignmentIndex >= alignmentQueue.length) {
        // Done with queue
        const modalEl = document.getElementById('alignmentModal');
        bootstrap.Modal.getInstance(modalEl).hide();
        window.location.reload(); // Refresh to clear telemetry
        return;
    }
    
    const item = alignmentQueue[alignmentIndex];
    document.getElementById('alignmentQueueCounter').innerText = `${alignmentIndex + 1} of ${alignmentQueue.length}`;
    document.getElementById('alignmentCosText').innerHTML = item.contentHtml;
    document.getElementById('alignmentAccountable').innerText = item.accountable;
    
    // Wire up EDIT button to open the actual Manage modal for this item and close alignment
    document.getElementById('alignmentRejectBtn').onclick = () => {
        // We let the data-bs-dismiss="modal" handle closing the alignment modal.
        // Wait a tiny bit for the modal to close before opening the Manage modal.
        setTimeout(() => {
            item.element.querySelector('.govern-phase-button').click();
        }, 400);
    };
}

document.addEventListener('DOMContentLoaded', () => {
    const approveBtn = document.getElementById('alignmentApproveBtn');
    if (approveBtn) {
        approveBtn.addEventListener('click', async () => {
            if (alignmentIndex >= alignmentQueue.length) return;
            const item = alignmentQueue[alignmentIndex];
            
            approveBtn.disabled = true;
            approveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            
            try {
                const response = await fetch(`/api/cos/${item.id}/solidify`, { method: 'PUT' });
                const data = await handleApiResponse(response);
                if (data.success) {
                    item.element.dataset.holographic = 'false';
                    alignmentIndex++;
                    renderAlignmentItem();
                }
            } catch (e) {
                console.error("Solidify Error:", e);
                alert("Failed to confirm item.");
            } finally {
                approveBtn.disabled = false;
                approveBtn.innerHTML = '<i class="fas fa-check me-1"></i>SOLIDIFY & CONTINUE';
            }
        });
    }
});
