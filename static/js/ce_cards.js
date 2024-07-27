document.addEventListener('DOMContentLoaded', function () {  
  setupEventListeners();  
});  
  
function setupEventListeners() {  
  document.querySelectorAll('.ce-pill').forEach(pill => {  
    pill.removeEventListener('click', handleCEPillClick); // Remove any existing event listeners  
    pill.addEventListener('click', handleCEPillClick);  
  });  
}  
  
function handleCEPillClick(event) {  
  event.preventDefault();  
  event.stopPropagation();  
  
  const existingModal = document.querySelector('.modal.fade.show');  
  if (existingModal) {  
    existingModal.remove();  
  }  
  
  const ceId = event.target.dataset.ceId;  
  const ceType = event.target.dataset.ceType || "Default";  
  const cosContent = event.target.closest('tr').querySelector('.cos-content-cell').textContent.trim();  
  const phaseElement = event.target.closest('.accordion-item');  
  const phaseName = phaseElement.querySelector('.accordion-header button').innerText.trim();  
  const phaseIndex = Array.from(phaseElement.parentElement.children).indexOf(phaseElement);  
  const ssolGoal = document.querySelector('#ssol-goal').textContent.trim();  
  
  const requestData = {  
    ce_id: ceId,  
    cos_content: cosContent,  
    phase_name: phaseName,  
    phase_index: phaseIndex,  
    ssol_goal: ssolGoal  
  };  
  
  fetch(`/get_ce_modal/${encodeURIComponent(ceType)}`, {  
    method: 'POST',  
    headers: {  
      'Content-Type': 'application/json'  
    },  
    body: JSON.stringify(requestData)  
  })  
    .then(response => response.json())  
    .then(data => {  
      if (data && data.modal_html) {  
        const aiGeneratedData = data.ai_generated_data || { fields: {} };  
        displayCEModal(data.modal_html, ceId, ceType, cosContent, phaseName, phaseIndex, aiGeneratedData, data.table_data, data.tabulator_columns, ssolGoal);  
      } else {  
        console.error(`CE type "${ceType}" not found in response`);  
        // Handle missing CE type gracefully (e.g., display an error message or a default modal)  
      }  
    })  
    .catch(error => console.error('Error fetching modal content:', error));  
}  

// Define default configurations for nodes not found in NODES  
const DEFAULT_FIELDS_CONFIG = [  
  { type: 'text', name: 'subject', placeholder: 'Subject' },  
  { type: 'textarea', name: 'details', placeholder: 'Details' },  
  { type: 'text', name: 'stakeholders', placeholder: 'Stakeholders' }  
];  
  
const DEFAULT_TABULATOR_CONFIG = {  
  columns: [  
    { title: 'Subject', field: 'subject', editor: 'input' },  
    { title: 'Details', field: 'details', editor: 'input' },  
    { title: 'Stakeholders', field: 'stakeholders', editor: 'input' }  
  ]  
}; 
  
// Function to display the CE modal  
function displayCEModal(modalHtml, ceId, ceType, cosContent, phaseName, phaseIndex, aiGeneratedData = { fields: {} }, tableData, tabulatorColumns, ssolGoal) {  
  const modalContainer = document.getElementById('dynamicModalContainer');  
  if (!modalContainer) {  
    console.error('Modal container element not found in the DOM');  
    return;  
  }  
  
  const phaseColors = ["#e91e63", "#00bcd4", "#9c27b0", "#ffc107", "#66bd0e"];  
  const phaseColor = phaseColors[phaseIndex % phaseColors.length];  
  
  const fieldsConfig = NODES[ceType]?.modal_config.fields || DEFAULT_FIELDS_CONFIG;  
  const tabulatorConfig = NODES[ceType]?.tabulator_config.columns || DEFAULT_TABULATOR_CONFIG.columns;  
  
  const wrappedModalHtml = `  
  <div class="modal fade" id="ceModal-${ceId}" tabindex="-1" aria-labelledby="ceModalLabel-${ceId}" aria-hidden="true">  
    <div class="modal-dialog modal-lg" role="document">  
      <div class="modal-content">  
        <div class="modal-header" style="background-color: ${phaseColor};">  
          <div class="filled-box"></div>  
          <h5 class="modal-title" id="ceModalLabel-${ceId}">  
            <span class="node-icon me-2" style="color: ${phaseColor};">  
              <i class="${NODES[ceType]?.icon || 'fa-solid fa-question-circle'}"></i>  
            </span>  
            <span class="modal-header-title">${ceType.replace('_', ' ').toUpperCase()} // ${phaseName.toUpperCase()}</span>  
          </h5>  
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>  
        </div>  
        <div class="modal-body">  
          <h5>Source COS: ${cosContent}</h5>  
          <p>${aiGeneratedData.contextual_description || 'No contextual description available.'}</p>  
          <div id="dynamicTable-${ceId}" class="tabulator-table mb-3"></div>  
            
          <!-- Buttons for row operations -->  
          <div class="row justify-content-start mb-3">  
            <div class="col-auto">  
              <button type="button" class="btn btn-sm btn-danger" id="deleteSelectedRowsButton-${ceId}">Delete</button>  
              <button type="button" class="btn btn-sm btn-secondary" id="duplicateSelectedRowsButton-${ceId}">Duplicate</button>  
            </div>  
          </div>  
  
          <form id="ceForm-${ceId}">  
            ${generateFormFields(fieldsConfig, aiGeneratedData.fields)}  
          </form>  
          <div class="row mt-2">  
            <div class="col">  
              <button type="button" class="btn btn-success w-100" id="addRowButton-${ceId}" style="padding-top: 10px;">Add ${ceType}</button>  
            </div>  
            <div class="col">  
              <button type="button" class="btn btn-primary w-100" id="generateRowButton-${ceId}" style="padding-top: 10px;">Generate ${ceType}</button>  
            </div>  
          </div>  
        </div>  
        <div class="modal-footer">  
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>  
          <button type="button" class="btn btn-primary btn-save-changes" data-ce-id="${ceId}">Save changes</button>  
        </div>  
      </div>  
    </div>  
  </div>  
  `;  
  
  modalContainer.innerHTML = wrappedModalHtml;  
  
  const modalElement = modalContainer.querySelector(`#ceModal-${ceId}`);  
  if (modalElement) {  
    const modal = new bootstrap.Modal(modalElement);  
    modal.show();  
  
    modalElement.addEventListener('shown.bs.modal', function () {  
      const tableElementId = `#dynamicTable-${ceId}`;  
      const table = initializeTabulatorTable(tableElementId, tableData, tabulatorConfig);  
      modalElement._tabulator = table;  
    });  
  
    modalElement.addEventListener('hidden.bs.modal', function () {  
      setupEventListeners(); // Reattach event listeners when modal is closed  
    });  
  
    setupModalEventListeners(modalElement, ceId, ceType, cosContent, phaseName, phaseIndex, ssolGoal);  
  } else {  
    console.error(`Modal element not found in the DOM for CE ID: ${ceId}`);  
  }  
}  


function generateFormFields(fieldsConfig, aiData) {  
  console.log("generateFormFields called with fieldsConfig:", fieldsConfig);  
  console.log("generateFormFields called with aiData:", aiData);  
  
  if (!fieldsConfig) {  
    console.error("No fieldsConfig provided.");  
    return 'No form fields available.';  
  }  
  
  return fieldsConfig.map(field => {  
    console.log("Generating field:", field);  
  
    const fieldValue = aiData[field.name] || '';  
    const placeholder = field.placeholder || '';  
  
    if (field.type === 'textarea') {  
      return `  
        <div class="form-group">  
          <label for="${field.name}">${placeholder}</label>  
          <textarea class="form-control" id="${field.name}" name="${field.name}" placeholder="${placeholder}">${fieldValue}</textarea>  
        </div>  
      `;  
    } else {  
      return `  
        <div class="form-group">  
          <label for="${field.name}">${placeholder}</label>  
          <input type="${field.type}" class="form-control" id="${field.name}" name="${field.name}" placeholder="${placeholder}" value="${fieldValue}">  
        </div>  
      `;  
    }  
  }).join('');  
}  
  
function initializeTabulatorTable(tableSelector, tableData, tabulatorColumns) {  
  const tableElement = document.querySelector(tableSelector);  
  if (!tableElement) {  
    console.error('Table element not found:', tableSelector);  
    return;  
  }  
  
  const shouldPaginate = tableData.length > 5;  
  
  return new Tabulator(tableSelector, {  
    data: tableData.length ? tableData : [{}],  
    layout: "fitColumns",  
    pagination: shouldPaginate ? "local" : false,  
    paginationSize: 5,  
    movableColumns: true,  
    resizableRows: true,  
    movableRows: true, // Enable user-movable rows  
    selectable: true, // Enable row selection  
    reactiveData: true, // Enable reactive data  
    columns: [  
      // Add a checkbox column for row selection  
      { formatter: "rowSelection", titleFormatter: "rowSelection", hozAlign: "center", headerSort: false, width: 40, resizable: false, cellClick: function (e, cell) { cell.getRow().toggleSelect(); } },  
      ...tabulatorColumns,  
    ],  
    rowHandle: {  
      handle: '<div class="handle">☰</div>', // Custom handle icon  
      position: 'left', // Position the handle on the left  
    },  
    placeholder: "No Data Available", // Placeholder text when no data is available  
  });  
}  
  
function clearFormFields(formSelector) {  
  const form = document.querySelector(formSelector);  
  if (form) {  
    form.querySelectorAll('input, textarea, select').forEach(field => {  
      field.value = '';  // Clear the field value  
      field.placeholder = field.getAttribute('data-placeholder') || field.placeholder;  // Reset the placeholder text  
    });  
  }  
}  
  
function generateFieldsFromAI(ceId, ceType, existingCEs) {  
  const form = document.querySelector(`#ceForm-${ceId}`);  
  const cosContent = document.querySelector('.cos-content-cell').textContent.trim();  
  const ssolGoal = document.querySelector('#ssol-goal').textContent.trim();  
  
  const requestData = {  
    ce_id: ceId,  
    ce_type: ceType,  
    cos_content: cosContent,  
    ssol_goal: ssolGoal,  
    existing_ces: existingCEs  // Include existing CEs  
  };  
  
  console.log("Sending AI query request data:", requestData); // Add logging  
  
  fetch('/ai-query-endpoint', {  
    method: 'POST',  
    headers: {  
      'Content-Type': 'application/json'  
    },  
    body: JSON.stringify(requestData)  
  })  
    .then(response => {  
      console.log("AI query response status:", response.status); // Add logging  
      return response.json();  
    })  
    .then(data => {  
      console.log("AI query response data:", data); // Add logging  
      if (data && data.ai_response) {  
        populateFormFields(ceId, data.ai_response.fields);  
      } else {  
        throw new Error('AI response not found or error in response');  
      }  
    })  
    .catch(error => console.error('Error generating fields from AI:', error));  
}  

  
function populateFormFields(ceId, aiData) {  
  const form = document.querySelector(`#ceForm-${ceId}`);  
  if (form) {  
    Object.keys(aiData).forEach(fieldName => {  
      const input = form.querySelector(`[name="${fieldName}"]`);  
      if (input) {  
        input.value = aiData[fieldName];  
      }  
    });  
  }  
}  
  
document.addEventListener('DOMContentLoaded', function () {  
  setupEventListeners();  
  const formFieldsContainer = document.getElementById('dynamicModalContainer');  
  if (formFieldsContainer) {  
    console.log("Form fields container found:", formFieldsContainer);  
    formFieldsContainer.innerHTML = '';  // Ensure it's initialized correctly  
  } else {  
    console.error("Form fields container not found.");  
  }  
});  

function generateFieldsFromAI(ceId, ceType, existingCEs) {  
  const form = document.querySelector(`#ceForm-${ceId}`);  
  const cosContent = document.querySelector('.cos-content-cell').textContent.trim();  
  const ssolGoal = document.querySelector('#ssol-goal').textContent.trim();  
  
  const requestData = {  
    ce_id: ceId,  
    ce_type: ceType,  
    cos_content: cosContent,  
    ssol_goal: ssolGoal,  
    existing_ces: existingCEs  // Include existing CEs  
  };  
  
  console.log("Sending AI query request data:", requestData); // Add logging  
  
  fetch('/ai-query-endpoint', {  
    method: 'POST',  
    headers: {  
      'Content-Type': 'application/json'  
    },  
    body: JSON.stringify(requestData)  
  })  
    .then(response => {  
      console.log("AI query response status:", response.status); // Add logging  
      return response.json();  
    })  
    .then(data => {  
      console.log("AI query response data:", data); // Add logging  
      if (data && data.ai_response) {  
        populateFormFields(ceId, data.ai_response.fields);  
      } else {  
        throw new Error('AI response not found or error in response');  
      }  
    })  
    .catch(error => console.error('Error generating fields from AI:', error));  
}  

function setupModalEventListeners(modalElement, ceId, ceType, cosContent, phaseName, phaseIndex, ssolGoal) {  
  const addRowButton = modalElement.querySelector(`#addRowButton-${ceId}`);  
  const generateRowButton = modalElement.querySelector(`#generateRowButton-${ceId}`);  
  const saveChangesButton = modalElement.querySelector('.btn-save-changes');  
  const deleteSelectedRowsButton = modalElement.querySelector(`#deleteSelectedRowsButton-${ceId}`);  
  const duplicateSelectedRowsButton = modalElement.querySelector(`#duplicateSelectedRowsButton-${ceId}`);  
  
  if (addRowButton) {  
    addRowButton.addEventListener('click', () => {  
      const table = modalElement._tabulator; // Retrieve the Tabulator instance  
      const form = modalElement.querySelector(`#ceForm-${ceId}`);  
      const formData = new FormData(form);  
      const rowData = {};  
      let isAnyFieldFilled = false;  
  
      formData.forEach((value, key) => {  
        if (value.trim()) {  
          isAnyFieldFilled = true; // Mark form as valid if any field is filled  
        }  
        rowData[key] = value || '';  // Ensure value is not null  
      });  
  
      if (!isAnyFieldFilled) {  
        alert('Please fill in at least one field before adding a row.');  
        return;  
      }  
  
      // Find the first empty row  
      const rows = table.getRows();  
      let emptyRow = rows.find(row => Object.values(row.getData()).every(val => val === ''));  
  
      if (emptyRow) {  
        emptyRow.update(rowData);  
      } else {  
        table.addRow(rowData, true); // Add row to the top  
      }  
  
      clearFormFields(`#ceForm-${ceId}`);  
      reinitializeTabulatorPagination(table); // Reinitialize pagination after adding a new row  
    });  
  }  
  
  if (generateRowButton) {  
    generateRowButton.addEventListener('click', () => {  
      const form = modalElement.querySelector(`#ceForm-${ceId}`);  
      const inputs = form.querySelectorAll('input, textarea, select');  
      let emptyFields = Array.from(inputs).filter(input => input.value.trim() === '');  
  
      // Get existing CEs from the Tabulator table if available, otherwise pass an empty list  
      const table = modalElement._tabulator; // Retrieve the Tabulator instance  
      const existingCEs = table ? table.getData() : [];  
  
      if (emptyFields.length > 0) {  
        generateFieldsFromAI(ceId, ceType, existingCEs);  
      } else {  
        if (confirm('There are already values in the fields. Do you want to overwrite them?')) {  
          generateFieldsFromAI(ceId, ceType, existingCEs);  
        }  
      }  
    });  
  }  
  
  if (saveChangesButton) {  
    saveChangesButton.addEventListener('click', () => {  
      const table = modalElement._tabulator; // Retrieve the Tabulator instance  
      const formData = new FormData(modalElement.querySelector(`#ceForm-${ceId}`));  
      const updatedData = {};  
      formData.forEach((value, key) => {  
        updatedData[key] = value || '';  // Ensure value is not null  
      });  
      saveCEChanges(ceId, updatedData);  
    });  
  }  
  
  if (deleteSelectedRowsButton) {  
    deleteSelectedRowsButton.addEventListener('click', () => {  
      const table = modalElement._tabulator;  
      const selectedRows = table.getSelectedRows();  
      selectedRows.forEach(row => row.delete());  
    });  
  }  
  
  if (duplicateSelectedRowsButton) {  
    duplicateSelectedRowsButton.addEventListener('click', () => {  
      const table = modalElement._tabulator;  
      const selectedRows = table.getSelectedRows();  
      selectedRows.forEach(row => {  
        const rowData = row.getData();  
        table.addRow(rowData, true); // Add duplicated row to the top  
      });  
    });  
  }  
}  
  
function reinitializeTabulatorPagination(table) {  
  const rowCount = table.getDataCount();  
  const shouldPaginate = rowCount > 5;  
  
  if (typeof table.setPageMode === 'function') {  
    table.setPageMode(shouldPaginate ? "local" : false); // Enable pagination only if shouldPaginate is true  
  } else {  
    console.error("Tabulator's setPageMode function is not available");  
  }  
  
  table.setPageSize(5);  
  
  // Optionally, update the pagination controls visibility  
  const paginationElement = table.getPaginationElement();  
  if (paginationElement) {  
    paginationElement.style.display = shouldPaginate ? 'block' : 'none';  
  }  
}  
  
function saveCEChanges(ceId, updatedData) {  
  const modalElement = document.querySelector(`#ceModal-${ceId}`);  
  const table = modalElement._tabulator;  
  const tableData = table ? table.getData() : [];  // Get the data from the Tabulator table  
  
  // Include the table data in the updated data  
  updatedData.table_data = tableData;  
  
  fetch(`/update_ce/${encodeURIComponent(ceId)}`, {  
    method: 'PUT',  
    headers: {  
      'Content-Type': 'application/json'  
    },  
    body: JSON.stringify(updatedData)  
  })  
    .then(response => response.json())  
    .then(data => {  
      if (data.success) {  
        console.log(`CE ID ${ceId} updated successfully`);  
        bootstrap.Modal.getInstance(modalElement).hide();  
  
        // Reattach event listeners to CE pills  
        setupEventListeners();  
      } else {  
        throw new Error(data.error || 'An error occurred while updating the CE.');  
      }  
    })  
    .catch(error => {  
      console.error('Error updating CE:', error);  
      alert('An error occurred while updating the CE. Please try again.');  
    });  
}  
  
function updateCERow(ceId, formData) {  
  const cePill = document.querySelector(`.ce-pill[data-ce-id="${ceId}"]`);  
  if (cePill) {  
    cePill.textContent = formData['ceContent'];  
    cePill.dataset.ceType = formData['ceType'];  
  }  
}  
  
function generateDynamicForm(ceData) {  
  return `  
    <form id="ceForm" data-ce-id="${ceData.id}">  
      <div class="form-group">  
        <label for="ceContent">Content</label>  
        <textarea class="form-control" id="ceContent" required>${ceData.content}</textarea>  
      </div>  
      <div class="form-group">  
        <label for="ceType">Type</label>  
        <select class="form-control" id="ceType" required>${generateSelectOptions(ceData.node_type)}</select>  
      </div>  
      <!-- Add additional fields as needed -->  
    </form>  
  `;  
}  
  
function generateSelectOptions(selectedType) {  
  return Object.entries(NODES).map(([type, { definition }]) => {  
    return `<option value="${type}" ${type === selectedType ? "selected" : ""}>${definition}</option>`;  
  }).join('');  
}  
  
document.addEventListener('DOMContentLoaded', function () {  
  setupEventListeners();  
});  
