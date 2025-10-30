// ce_cards.js (Refactored with requestAnimationFrame for reliable modal display)

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
 * Displays the Conditional Element modal, resolving the DOM race condition.
 * @param {string} modalHtml - The raw HTML for the modal.
 * @param {string} ceId - The ID of the Conditional Element.
 */
function displayCEModal(modalHtml, ceId) {
    const modalContainer = document.getElementById('dynamicModalContainer');
    if (!modalContainer) {
        console.error('Modal container element (#dynamicModalContainer) not found.');
        return;
    }

    // 1. Inject the HTML into the container.
    modalContainer.innerHTML = modalHtml;

    // 2. Use requestAnimationFrame to wait for the next repaint cycle.
    // This ensures the browser has processed the innerHTML change and the new element exists in the DOM.
    requestAnimationFrame(() => {
        // 3. NOW, find the newly added modal element by its ID.
        const modalElement = document.getElementById(`ceModal-${ceId}`);
        if (!modalElement) {
            console.error(`Failed to find modal element #ceModal-${ceId} after injection and repaint.`);
            return;
        }

        // 4. Create a new Bootstrap modal instance from the element.
        const modal = new bootstrap.Modal(modalElement);
        const ceType = modalElement.dataset.nodeType || 'Default';

        // 5. Set up event listeners once the modal is fully shown.
        modalElement.addEventListener('shown.bs.modal', () => {
            const tableElementId = `#dynamicTable-${ceId}`;
            const initialTableDataElement = modalElement.querySelector('.initial-table-data');
            const initialTableData = initialTableDataElement ? JSON.parse(initialTableDataElement.textContent || '[]') : [];

            modalElement._tabulator = initializeTabulatorTable(
                tableElementId,
                initialTableData,
                tabulatorColumnsDefinition(ceType),
                ceType,
                modalElement
            );

            setupModalEventListeners(modalElement, ceId);

        }, { once: true });

        // 6. Add a cleanup listener to remove the modal from the DOM when it's hidden.
        modalElement.addEventListener('hidden.bs.modal', () => {
            modalElement.remove();
        }, { once: true });

        // 7. Show the modal.
        modal.show();
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
    const deleteSelectedRowsButton = modalElement.querySelector(`#deleteSelectedRowsButton-${ceId}`);

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