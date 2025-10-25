// ce_cards.js (Refactored for Stability with MutationObserver)

import { 
    showLoadingSpinner, 
    hideLoadingSpinner,
    initializeTabulatorTable 
} from './base_functions.js'; 

// --- Helper Functions ---

/**
 * Extracts form data from a given form element into a key-value object.
 * @param {HTMLFormElement} form - The form element.
 * @returns {object} - An object containing the form's data.
 */
function getFormData(form) { 
    if (!form) return {};
    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => { data[key] = value; });
    console.log("getFormData() - Extracted:", data);
    return data;
}

/**
 * Clears all input fields within a given form.
 * @param {string} formSelector - The CSS selector for the form.
 */
function clearFormFields(formSelector) {
    const form = document.querySelector(formSelector);
    if (form) {
        form.querySelectorAll('input, textarea, select').forEach(field => {
            if (field.type !== 'checkbox' && field.type !== 'radio') {
                field.value = '';
            }
        });
        console.log(`clearFormFields() - Cleared fields for ${formSelector}`);
    }
}

/**
 * Saves all changes (form data and table data) made in the CE modal to the server.
 * @param {string} ceId - ID of the Conditional Element to save.
 */
function saveCEChanges(ceId) { 
    const modalElement = document.querySelector(`#ceModal-${ceId}`);
    if (!modalElement) {
        console.error(`Save failed: Modal for CE ID ${ceId} not found.`);
        return;
    }
    
    const table = modalElement._tabulator;
    const tableData = table ? table.getData() : [];
    
     const nonNullRows = tableData.filter(row =>
        Object.values(row).some(value => value !== null && (typeof value === 'string' ? value.trim() !== '' : value !== ''))
    );

    const updatedData = {
        table_data: nonNullRows, // Array of objects
        form_data: getFormData(modalElement.querySelector(`#ceForm-${ceId}`)) // Object
    };
    
    const modalInstance = bootstrap.Modal.getInstance(modalElement);
    const saveButton = modalElement.querySelector('.btn-save-changes');
    const originalButtonHtml = saveButton.innerHTML;
    saveButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Saving...`;
    saveButton.disabled = true;

    fetch(`/update_ce/${encodeURIComponent(ceId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
    })
    .then(response => {
        if (!response.ok) { return response.json().then(err => { throw new Error(err.error || `Server Error: ${response.status}`); }); }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            console.log(`CE ID ${ceId} updated successfully`);
            modalElement.dataset.hasUnsavedChanges = 'false';
            if (modalInstance) modalInstance.hide();
        } else {
            throw new Error(data.error || 'Update failed on the server.');
        }
    })
    .catch(error => {
        console.error('Error updating CE:', error);
        alert(`An error occurred while saving: ${error.message}`);
    })
    .finally(() => {
        saveButton.innerHTML = originalButtonHtml;
        saveButton.disabled = false;
    });
}

// --- NODES Definition (Local copy for frontend logic) ---
const NODES = window.NODES || {};

// --- Main Entry Point ---

/**
 * Displays the Conditional Element modal, using a MutationObserver for reliability.
 * @param {string} modalHtml - The raw HTML for the modal.
 * @param {string} ceId - The ID of the Conditional Element.
 * @param {string} p_ceType - The NodeType of the CE.
 */
function displayCEModal(modalHtml, ceId, p_ceType) {
    const modalContainer = document.getElementById('dynamicModalContainer');
    if (!modalContainer) {
        console.error('Modal container element (#dynamicModalContainer) not found.');
        return;
    }
    
    modalContainer.innerHTML = modalHtml;

    // Use a MutationObserver to wait for the modal to be added to the DOM.
    // This is more reliable than relying on event timing.
    const observer = new MutationObserver((mutations, obs) => {
        const modalElement = document.getElementById(`ceModal-${ceId}`);
        if (modalElement) {
            obs.disconnect(); // We've found our modal, no need to observe further.
            
            console.log(`displayCEModal() - Observer found modal #${ceId}, proceeding with setup.`);

            const modal = new bootstrap.Modal(modalElement);

            // Set up everything AFTER the modal is fully shown to the user.
            modalElement.addEventListener('shown.bs.modal', () => {
                console.log(`displayCEModal() - 'shown.bs.modal' event fired for #${ceId}.`);
                
                const tableElementId = `#dynamicTable-${ceId}`;
                const initialTableData = JSON.parse(modalElement.querySelector('.initial-table-data').textContent || '[]');

                // Initialize Tabulator
                modalElement._tabulator = initializeTabulatorTable(
                    tableElementId, 
                    initialTableData,
                    tabulatorColumnsDefinition(p_ceType), 
                    p_ceType, 
                    modalElement
                );

                // Attach all button listeners
                setupModalEventListeners(modalElement, ceId);
            }, { once: true }); // Use { once: true } to prevent this from firing multiple times.

            // Cleanup when the modal is hidden
            modalElement.addEventListener('hidden.bs.modal', () => {
                modalElement.remove();
            }, { once: true });

            modal.show();
        }
    });

    observer.observe(modalContainer, {
        childList: true, // Watch for nodes being added or removed
        subtree: true    // Watch descendants of the container as well
    });
}

/**
 * Defines the Tabulator table columns based on the CE type.
 * @param {string} ceType - The NodeType of the CE.
 * @returns {Array} - An array of column definition objects for Tabulator.
 */
function tabulatorColumnsDefinition(ceType) {
    const nodeConfig = NODES[ceType]?.tabulator_config;
    const specificColumns = nodeConfig?.columns || NODES['Default']?.tabulator_config?.columns || [];
    return [
        { formatter: "rowSelection", titleFormatter: "rowSelection", hozAlign: "center", headerSort: false, width: 40 },
        ...specificColumns
    ];
}

/**
 * Sets up event listeners for all interactive elements within the modal.
 * @param {HTMLElement} modalElement - The root DOM element of the modal.
 * @param {string} ceId - The ID of the current Conditional Element.
 */
function setupModalEventListeners(modalElement, ceId) {
    console.log(`setupModalEventListeners() - Attaching listeners for modal #${ceId}`);

    const addRowButton = modalElement.querySelector(`#addRowButton-${ceId}`);
    const saveChangesButton = modalElement.querySelector('.btn-save-changes');
    // ... other button selectors

    if (addRowButton) {
        addRowButton.addEventListener('click', () => {
            console.log("Add Row button clicked.");
            const table = modalElement._tabulator;
            if (!table) {
                console.error("Tabulator table instance not found on modalElement._tabulator");
                alert("Error: The resources table is not available.");
                return;
            }

            const form = modalElement.querySelector(`#ceForm-${ceId}`);
            const rowData = getFormData(form);

            if (!Object.values(rowData).some(val => val && val.trim() !== "")) {
                alert("Please fill in at least one field to add a resource.");
                return;
            }

            // The core action: Add data to the table
            table.addRow(rowData, false);
            console.log("Row added to Tabulator in memory.");
            
            clearFormFields(`#ceForm-${ceId}`);
            modalElement.dataset.hasUnsavedChanges = 'true';
        });
    }

    if (saveChangesButton) {
        saveChangesButton.addEventListener('click', () => {
            console.log("Save Changes button clicked.");
            saveCEChanges(ceId);
        });
    }

    // Add listeners for Generate, Delete, Duplicate here if they exist...
    // Example for delete:
    const deleteSelectedRowsButton = modalElement.querySelector(`#deleteSelectedRowsButton-${ceId}`);
    if(deleteSelectedRowsButton) {
        deleteSelectedRowsButton.addEventListener('click', () => {
            const table = modalElement._tabulator;
            if(table) {
                const selectedRows = table.getSelectedRows();
                if (selectedRows.length === 0) { alert("Please select rows to delete."); return; }
                selectedRows.forEach(row => row.delete());
                modalElement.dataset.hasUnsavedChanges = 'true';
                console.log(`${selectedRows.length} rows deleted.`);
            }
        });
    }
}

// Export the primary function that cos_table.js will call.
export { displayCEModal };