// ce_cards.js

import { showLoadingSpinner, hideLoadingSpinner } from './base_functions.js';

// Initialize ce_store (if not already defined - best practice)
const ce_store = window.ce_store || {};

document.addEventListener('DOMContentLoaded', setupEventListeners);

function setupEventListeners() {
    document.querySelectorAll('.ce-pill').forEach(pill => {
        pill.removeEventListener('click', handleCEPillClick); // Remove old listener
        pill.addEventListener('click', handleCEPillClick);
        pill.title = 'Double-click to open Conditional Element'; // Tooltip for clarity
    });
}

function handleCEPillClick(event) {
    event.preventDefault();
    event.stopPropagation();

    // Close any existing modals (important for clean UI)
    const existingModal = document.querySelector('.modal.fade.show');
    if (existingModal) {
        existingModal.remove();
    }

    const ceId = event.target.dataset.ceId;
    const ceType = event.target.dataset.ceType || "Default";
    const iconClass = NODES[ceType]?.icon || 'fa-spinner'; // Get icon
    const cosContentCell = event.target.closest('tr')?.querySelector('.cos-content-cell');  // Optional chaining
    const cosContent = cosContentCell ? cosContentCell.innerHTML : ''; // Get *HTML* content
    const phaseElement = event.target.closest('.accordion-item');
    const phaseName = phaseElement?.querySelector('.accordion-header button')?.innerText.trim(); // Optional chaining
    const phaseIndex = phaseElement ? Array.from(phaseElement.parentElement.children).indexOf(phaseElement) : 0; // Fallback to 0
    const ssolGoal = document.querySelector('#ssol-goal')?.textContent.trim() || "Goal Not Found"; // Fallback text

    const requestData = {
        ce_id: ceId,
        cos_content: cosContent,
        phase_name: phaseName,
        phase_index: phaseIndex,
        ssol_goal: ssolGoal
    };

    showLoadingSpinner(`Loading ${ceType} data...`, iconClass);
    fetch(`/get_ce_modal/${encodeURIComponent(ceType)}`, {  // Corrected endpoint
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        hideLoadingSpinner();
        if (data && data.modal_html) {
            displayCEModal(data.modal_html, ceId, ceType, cosContent, phaseName, phaseIndex, data.ai_generated_data, data.table_data, data.tabulator_columns, ssolGoal);
        } else {
            console.error(`CE type "${ceType}" not found or invalid response:`, data);
        }
    })
    .catch(error => {
        hideLoadingSpinner();
        console.error('Error fetching modal content:', error);
    });
}



function displayCEModal(modalHtml, ceId, ceType, cosContent, phaseName, phaseIndex, aiGeneratedData = { fields: {} }, tableData = [], tabulatorColumns = [], ssolGoal) {
    const modalContainer = document.getElementById('dynamicModalContainer');
    if (!modalContainer) {
        console.error('Modal container element not found.');
        return;
    }

    const phaseColors = ["#e91e63", "#00bcd4", "#9c27b0", "#ffc107", "#66bd0e"];
    const phaseColor = phaseColors[phaseIndex % phaseColors.length];
    const fieldsConfig = NODES[ceType]?.modal_config.fields || DEFAULT_FIELDS_CONFIG;  // Fallback
    const iconClass = NODES[ceType]?.icon || 'fa-solid fa-icons'; // Default icon

    // Important: Use a *template literal* for the modal HTML.  This is much cleaner.
    const wrappedModalHtml = `
        <div class="modal fade" id="ceModal-${ceId}" tabindex="-1" aria-labelledby="ceModalLabel-${ceId}" aria-hidden="true">
            <div class="modal-dialog modal-lg" role="document">
                <div class="modal-content">
                    <div class="modal-header" style="background-color: ${phaseColor};">
                        <h5 class="modal-title" id="ceModalLabel-${ceId}">
                            <span class="node-icon me-2"><i class="${iconClass}"></i></span>
                            ${ceType.replace(/_/g, ' ').toUpperCase()} // ${phaseName.toUpperCase()}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p><span class="context-label">Source COS:</span>${cosContent}</p>
                        <p><span class="context-label">${ceType}:</span> ${aiGeneratedData.contextual_description || 'No description.'}</p>
                        <div id="dynamicTable-${ceId}" class="tabulator-table mb-3"></div>
                        <div class="row justify-content-start mb-3">
                            <div class="col-auto">
                                <button type="button" class="btn btn-sm btn-danger" id="deleteSelectedRowsButton-${ceId}">Delete</button>
                                <button type="button" class="btn btn-sm btn-secondary" id="duplicateSelectedRowsButton-${ceId}">Duplicate</button>
                            </div>
                        </div>
                        <form id="ceForm-${ceId}">${generateFormFields(fieldsConfig, aiGeneratedData.fields)}</form>
                        <div class="row mt-2">
                            <div class="col"><button type="button" class="btn btn-success w-100" id="addRowButton-${ceId}">Add ${ceType}</button></div>
                            <div class="col"><button type="button" class="btn btn-primary w-100" id="generateRowButton-${ceId}">Generate ${ceType}</button></div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary btn-save-changes" data-ce-id="${ceId}">Save</button>
                    </div>
                </div>
            </div>
        </div>`;

    modalContainer.innerHTML = wrappedModalHtml;  // Set the HTML

    const modalElement = modalContainer.querySelector(`#ceModal-${ceId}`);
    if (!modalElement) {
        console.error(`Modal element not found for CE ID: ${ceId}`);
        return;
    }

    const modal = new bootstrap.Modal(modalElement);
    modal.show();

    modalElement.addEventListener('shown.bs.modal', () => {
        const tableElementId = `#dynamicTable-${ceId}`;
        const tableElement = document.querySelector(tableElementId);

        if (tableElement) {
            tableElement.innerHTML = ''; // Clear for re-initialization
        }
         const table = initializeTabulatorTable(tableElementId, tableData, tabulatorColumns, ceType); // Re-init
    });


    modalElement.addEventListener('hidden.bs.modal', () => {
        if (modalElement.dataset.hasUnsavedChanges === 'true' && !confirm('You have unsaved changes. Close anyway?')) {
            const modal = new bootstrap.Modal(modalElement); // Re-show if canceled
            modal.show();
        } else {
            setupEventListeners(); // Re-setup listeners on *confirmed* close
        }
    });

    setupModalEventListeners(modalElement, ceId, ceType, cosContent, phaseName, ssolGoal); // Setup *after* modal is in DOM
}


function initializeTabulatorTable(tableSelector, tableData, tabulatorColumns, ceType) {
    const tableElement = document.querySelector(tableSelector);
    if (!tableElement) {
        console.error('Table element not found:', tableSelector);
        return null; // Return null
    }

    const initialData = tableData.length > 0 ? tableData : [];

    try {
        const table = new Tabulator(tableSelector, {
            data: initialData,
            layout: "fitColumns",
            movableColumns: true,
            resizableRows: true,
            selectable: true,
            reactiveData: true,
            placeholder: `Add or Generate ${ceType}`,
            rowHeight: 40,
            columns: [
                { title: "", width: 30, rowHandle: true, formatter: "handle", headerSort: false, resizable: false, hozAlign: "center" },
                { formatter: "rowSelection", titleFormatter: "rowSelection", hozAlign: "center", headerSort: false, width: 40, resizable: false, cellClick: (e, cell) => cell.getRow().toggleSelect() },
                ...(tabulatorColumns || []) // Use provided columns or empty array
            ],
        });
        return table; // Return the initialized table
    } catch (error) {
        console.error('Error initializing Tabulator:', error);
        return null; // Return null on error
    }
}

function generateFormFields(fieldsConfig, aiData = {}) {
    if (!fieldsConfig) {
        console.error("No fieldsConfig provided.");
        return 'No form fields.';
    }
    return fieldsConfig.map(field => {
        const fieldValue = aiData[field.name] || '';
        const placeholder = field.placeholder || '';
        const fieldType = field.type || 'text'; // Default to 'text'

        // Use a switch for different field types. This is cleaner than multiple if/else.
        switch (fieldType) {
            case 'textarea':
                return `<div class="form-group">
                            <label for="${field.name}">${placeholder}</label>
                            <textarea class="form-control" id="${field.name}" name="${field.name}" placeholder="${placeholder}" rows="3">${fieldValue}</textarea>
                        </div>`;
            case 'select': // Example for select (add options as needed)
                 const options = field.options || [];
                 const optionsHtml = options.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('');
                 return `<div class="form-group">
                            <label for="${field.name}">${placeholder}</label>
                            <select class="form-control" id="${field.name}" name="${field.name}">${optionsHtml}</select>
                        </div>`
            default: // Handles text, number, email, etc.
                return `<div class="form-group">
                            <label for="${field.name}">${placeholder}</label>
                            <input type="${fieldType}" class="form-control" id="${field.name}" name="${field.name}" placeholder="${placeholder}" value="${fieldValue}">
                        </div>`;
        }
    }).join('');
}

function clearFormFields(formSelector) {
    const form = document.querySelector(formSelector);
    if (form) {
        form.querySelectorAll('input, textarea, select').forEach(field => {
            if (field.type !== 'checkbox' && field.type !== 'radio') {
                field.value = '';
            } // Don't clear checkboxes/radios
        });
    }
}

function setupModalEventListeners(modalElement, ceId, ceType, cosContent, phaseName, ssolGoal) {
    const addRowButton = modalElement.querySelector(`#addRowButton-${ceId}`);
    const generateRowButton = modalElement.querySelector(`#generateRowButton-${ceId}`);
    const saveChangesButton = modalElement.querySelector('.btn-save-changes');
    const deleteSelectedRowsButton = modalElement.querySelector(`#deleteSelectedRowsButton-${ceId}`);
    const duplicateSelectedRowsButton = modalElement.querySelector(`#duplicateSelectedRowsButton-${ceId}`);

    const table = modalElement._tabulator

     // Add event listener to Generate Row button
    if (generateRowButton) {
        generateRowButton.addEventListener('click', () => {
            generateFieldsFromAI(ceId, ceType, cosContent, ssolGoal);
        });
    }

    // Detect unsaved changes
    modalElement.addEventListener('input', () => {
        modalElement.dataset.hasUnsavedChanges = 'true';
    });

      modalElement.addEventListener('hidden.bs.modal', () => {
        if (modalElement.dataset.hasUnsavedChanges === 'true' && !confirm('You have unsaved changes. Close anyway?')) {
            const modal = new bootstrap.Modal(modalElement); // Re-show if canceled
            modal.show();
        } else {
             modalElement.dataset.hasUnsavedChanges = 'false';
            setupEventListeners(); // Re-setup listeners on *confirmed* close
        }
    });

    if (addRowButton) {
        addRowButton.addEventListener('click', () => {
            const table = modalElement._tabulator;
            const form = modalElement.querySelector(`#ceForm-${ceId}`);
            const formData = new FormData(form);
            const rowData = {};
            let isAnyFieldFilled = false;

            formData.forEach((value, key) => {
                if (value.trim() !== "") {
                    isAnyFieldFilled = true;
                }
                rowData[key] = value;
            });

            if (!isAnyFieldFilled) {
                alert("Please fill in at least one field before adding a row.");
                return;
            }

            const rows = table.getRows();
            let emptyRow = rows.find(row => Object.values(row.getData()).every(val => val === ''));

            if (emptyRow) {
                emptyRow.update(rowData);
            } else {
                table.addRow(rowData, true);
            }

            clearFormFields(`#ceForm-${ceId}`);
            modalElement.dataset.hasUnsavedChanges = 'true';
        });
    }

    if (saveChangesButton) {
        saveChangesButton.addEventListener('click', () => {
          saveCEChanges(ceId);
           modalElement.dataset.hasUnsavedChanges = 'false';
        });
    }

    if (deleteSelectedRowsButton) {
        deleteSelectedRowsButton.addEventListener('click', () => {
            const table = modalElement._tabulator;
            if (table) {
                const selectedRows = table.getSelectedRows();
                selectedRows.forEach(row => row.delete());
                modalElement.dataset.hasUnsavedChanges = 'true';
            }
        });
    }

    if (duplicateSelectedRowsButton) {
        duplicateSelectedRowsButton.addEventListener('click', () => {
            const table = modalElement._tabulator;
            if (table) {
                const selectedRows = table.getSelectedRows();
                selectedRows.forEach(row => {
                  const rowData = row.getData();
                    table.addRow({...rowData}); //IMPORTANT: Create Deep Copy
                });
                modalElement.dataset.hasUnsavedChanges = 'true';
            }
        });
    }
}

function saveCEChanges(ceId) {
    const modalElement = document.querySelector(`#ceModal-${ceId}`);
    const table = modalElement._tabulator;
    const tableData = table ? table.getData() : [];
     const nonNullRows = tableData.filter(row =>
        Object.values(row).some(value => value !== null && (typeof value === 'string' ? value.trim() !== '' : value !== ''))
    );

    const updatedData = {
        table_data: nonNullRows,
        form_data: getFormData(modalElement.querySelector(`#ceForm-${ceId}`))
    };

    fetch(`/update_ce/${encodeURIComponent(ceId)}`, {  // Correct endpoint
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            console.log(`CE ID ${ceId} updated successfully`);
            updateCEPills(ceId, nonNullRows.length); // Update *all* matching pills
            setupEventListeners(); // Re-setup after save
             bootstrap.Modal.getInstance(modalElement).hide();  // Close *after* update

        } else {
            console.error('Error updating CE:', data.error);
            alert(`Error updating CE: ${data.error}`);
        }
    })
    .catch(error => {
        console.error('Error updating CE:', error);
        alert(`An error occurred: ${error.message}`);
    });
}

function getFormData(form) {
    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => { data[key] = value; });
    return data;
}

// Updates *all* CE pills with the given ceId.  This is crucial.
function updateCEPills(ceId, resourceCount) {
    const cePills = document.querySelectorAll(`.ce-pill[data-ce-id="${ceId}"]`);
    cePills.forEach(cePill => {
        const ceText = cePill.textContent.replace(/\(\d+\)$/, '').trim();
        cePill.innerHTML = ''; // Clear existing content

        const textNode = document.createTextNode(ceText);
        cePill.appendChild(textNode);

        if (resourceCount > 0) {
            const tally = document.createElement('span');
            tally.className = 'badge rounded-pill bg-light text-dark ms-2 counter';
            tally.textContent = resourceCount.toString();
            cePill.appendChild(tally);
        }

        // Re-add the click listener (important!)
        cePill.addEventListener('click', handleCEPillClick);
    });
}


async function generateFieldsFromAI(ceId, ceType, cosContent, ssolGoal) {
  const form = document.querySelector(`#ceForm-${ceId}`);
  if (!form) {
    console.error(`Form not found for CE ID: ${ceId}`);
    return;
  }

   const existingCEs = Array.from(document.querySelectorAll('.ce-pill'))
        .filter(pill => pill.dataset.ceId !== ceId) // Exclude the current CE
        .map(pill => ({
            id: pill.dataset.ceId,
            type: pill.dataset.ceType,
            content: pill.textContent.trim()
        }));

  const requestData = {
    ce_id: ceId,
    ce_type: ceType,
    cos_content: cosContent,
    ssol_goal: ssolGoal,
    existing_ces: existingCEs
  };

  showLoadingSpinner(`Generating ${ceType}...`);
  try {
    const response = await fetch('/ai-query-endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.status}`);
    }

    const data = await response.json();
    hideLoadingSpinner();

    if (data && data.ai_response) {
      // Populate form fields using the AI response
      populateFormFields(ceId, data.ai_response.fields);

       // Get the table element within the modal
        const tableElementId = `#dynamicTable-${ceId}`;
        const table = initializeTabulatorTable(tableElementId, [], NODES[ceType].tabulator_config.columns, ceType);

        // Check if the AI provided table data and update the table if available
        if (data.ai_response.table_data && Array.isArray(data.ai_response.table_data)) {
            table.setData(data.ai_response.table_data);
        }

    } else {
      console.error('AI response not found or error in response:', data);
    }
  } catch (error) {
    hideLoadingSpinner();
    console.error('Error generating fields from AI:', error);
  }
}

function populateFormFields(ceId, aiData) {
  const form = document.querySelector(`#ceForm-${ceId}`);
  if (form && aiData) {
    Object.keys(aiData).forEach(fieldName => {
      const input = form.querySelector(`[name="${fieldName}"]`);
      if (input) {
        input.value = aiData[fieldName] || ''; // Ensure value is not null
      }
    });
  }
}

// Default configurations (good practice to have these)
const DEFAULT_FIELDS_CONFIG = [
    { type: "text", name: "subject", placeholder: "Subject" },
    { type: "textarea", name: "details", placeholder: "Details" },
    { type: "text", name: "stakeholders", placeholder: "Stakeholders" }
];

const DEFAULT_TABULATOR_CONFIG = {
    columns: [
        { title: "Subject", field: "subject", editor: "input" },
        { title: "Details", field: "details", editor: "input" },
        { title: "Stakeholders", field: "stakeholders", editor: "input" }
    ]
};