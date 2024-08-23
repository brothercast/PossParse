import { showLoadingSpinner, hideLoadingSpinner } from './base_functions.js';  

if (typeof ce_store === 'undefined') {  
  var ce_store = {};  
}  
  
document.addEventListener('DOMContentLoaded', function () {  
  setupEventListeners();  
});  
  
function setupEventListeners() {  
  document.querySelectorAll('.ce-pill').forEach(pill => {  
    pill.removeEventListener('click', handleCEPillClick); // Remove any existing event listeners  
    pill.addEventListener('click', handleCEPillClick);  
  });  
}  
  
// ce_cards.js  
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
  
  showLoadingSpinner(`Loading ${ceType} data...`);  
  fetch(`/get_ce_modal/${encodeURIComponent(ceType)}`, {  
    method: 'POST',  
    headers: {  
      'Content-Type': 'application/json'  
    },  
    body: JSON.stringify(requestData)  
  })  
    .then(response => response.json())  
    .then(data => {  
      hideLoadingSpinner();  
      if (data && data.modal_html) {  
        const aiGeneratedData = data.ai_generated_data || { fields: {} };  
        displayCEModal(data.modal_html, ceId, ceType, cosContent, phaseName, phaseIndex, aiGeneratedData, data.table_data, data.tabulator_columns, ssolGoal);  
      } else {  
        console.error(`CE type "${ceType}" not found in response`);  
      }  
    })  
    .catch(error => {  
      hideLoadingSpinner();  
      console.error('Error fetching modal content:', error);  
    });  
}  
  
// Add double-click event listener  
document.addEventListener('dblclick', function(event) {  
  if (event.target.classList.contains('ce-pill')) {  
    handleCEPillClick(event);  
  }  
});  
  
// Ensure this is called after the modal dialog is displayed  
document.addEventListener('DOMContentLoaded', function () {  
  setupEventListeners();  
});  

  
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
            <h5>Source COS:</h5>  
            <div class="cos-content">  
              ${generateCOSContent(cosContent)}  
            </div>  
            <p>${aiGeneratedData.contextual_description || 'No contextual description available.'}</p>  
            <div id="dynamicTable-${ceId}" class="tabulator-table mb-3"></div>  
  
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
  
    const fullCosTextElement = modalElement.querySelector('.full-cos-text');  
    if (fullCosTextElement) {  
      const fullCosText = fullCosTextElement.textContent;  
      modalElement.dataset.fullCosText = fullCosText;  
    }  
  
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



function generateCOSContent(cosContent) {  
  const parser = new DOMParser();  
  const doc = parser.parseFromString(cosContent, 'text/html');  
  const ceTags = doc.querySelectorAll('ce');  
  
  ceTags.forEach(ceTag => {  
    const ceId = ceTag.getAttribute('id');  
    const ceType = ceTag.getAttribute('type');  
    const ceText = ceTag.textContent;  
    const ceData = ce_store[ceId] || {};  
  
    const pill = document.createElement('span');  
    pill.className = 'badge rounded-pill bg-secondary ce-pill position-relative';  
    pill.dataset.ceId = ceId;  
    pill.dataset.ceType = ceType;  
    pill.textContent = ceText;  
  
    if (ceData.is_new) {  
      const greenDot = document.createElement('span');  
      greenDot.className = 'position-absolute top-0 start-100 translate-middle p-2 bg-success border border-light rounded-circle';  
      const visuallyHiddenText = document.createElement('span');  
      visuallyHiddenText.className = 'visually-hidden';  
      visuallyHiddenText.textContent = 'New CE';  
      greenDot.appendChild(visuallyHiddenText);  
      pill.appendChild(greenDot);  
    }  
  
    const resourceCount = ceData.table_data ? ceData.table_data.length : 0;  
    if (resourceCount > 0) {  
      const tally = document.createElement('span');  
      tally.className = 'badge bg-light text-dark ms-2';  
      tally.textContent = resourceCount.toString();  
      pill.appendChild(tally);  
    }  
  
    ceTag.replaceWith(pill);  
  });  
  
  return doc.body.innerHTML;  
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
      selectable: true,  // Enable row selection  
      reactiveData: true, // Enable reactive data  
      columns: [  
          {  
              title: "",  
              width: 30,  
              rowHandle: true,  
              formatter: "handle",  
              headerSort: false,  
              resizable: false,  
              hozAlign: "center"  
          },  
          {  
              formatter: "rowSelection",  
              titleFormatter: "rowSelection",  
              hozAlign: "center",  
              headerSort: false,  
              width: 40,  
              resizable: false,  
              cellClick: function (e, cell) {  
                  cell.getRow().toggleSelect();  
              }  
          },  
          ...tabulatorColumns,  
      ],  
      placeholder: "No Data Available", // Placeholder text when no data is available  
      rowFormatter: function (row) {  
          const rowElement = row.getElement();  
          const cells = rowElement.querySelectorAll('.tabulator-cell');  
          let maxHeight = 0;  
          cells.forEach(cell => {  
              cell.style.height = 'auto';  
              const cellHeight = cell.scrollHeight;  
              if (cellHeight > maxHeight) {  
                  maxHeight = cellHeight;  
              }  
          });  
          rowElement.style.height = `${maxHeight}px`;  
          cells.forEach(cell => {  
              cell.style.height = '100%';  
          });  
      }  
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
  
  showLoadingSpinner(`Generating ${ceType}...`);  
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
      hideLoadingSpinner();  
      console.log("AI query response data:", data); // Add logging  
      if (data && data.ai_response) {  
        populateFormFields(ceId, data.ai_response.fields);  
      } else {  
        throw new Error('AI response not found or error in response');  
      }  
    })  
    .catch(error => {  
      hideLoadingSpinner();  
      console.error('Error generating fields from AI:', error);  
    });  
}  
  
function extractCosContentForEditing(cosContentCell) {  
  const badgeElements = cosContentCell.querySelectorAll('.badge, .position-absolute');  
  badgeElements.forEach((badge) => {  
    const ceContent = badge.previousSibling.textContent;  
    badge.previousSibling.textContent = ceContent;  // Restore original text without badge  
    badge.remove();  // Remove the badge element  
  });  
  return cosContentCell.innerHTML;  // This now contains the editable content with original CE text  
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
      table.setPageMode(shouldPaginate ? "local" : false);  
  } else {  
      console.error("Tabulator's setPageMode function is not available");  
  }  
  
  table.setPageSize(5);  
  
  if (typeof table.getPaginationElement === 'function') {  
      const paginationElement = table.getPaginationElement();  
      if (paginationElement) {  
          paginationElement.style.display = shouldPaginate ? 'block' : 'none';  
      }  
  } else {  
      console.error("Tabulator's getPaginationElement function is not available");  
  }  
}  
  
function saveCEChanges(ceId) {  
  const modalElement = document.querySelector(`#ceModal-${ceId}`);
    const fullCosText = modalElement.dataset.fullCosText;  
  const table = modalElement._tabulator;  
  const tableData = table ? table.getData() : []; // Get the data from the Tabulator table  
  
  const updatedData = {  
      table_data: tableData,  
      form_data: getFormData(modalElement.querySelector(`#ceForm-${ceId}`))  
  };  
  
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
      updateCEPill(ceId, tableData.length); // Update the CE pill with the number of rows
      setupEventListeners(); // Reattach event listeners to CE pills
    } else {
      throw new Error(data.error || 'An error occurred while updating the CE.');
    }
  })
  .catch(error => {
    console.error('Error updating CE:', error);
    alert('An error occurred while updating the CE. Please try again.');
  });
}
  
function getFormData(form) {  
  const formData = new FormData(form);  
  const data = {};  
  formData.forEach((value, key) => {  
      data[key] = value || '';  // Ensure value is not null  
  });  
  return data;  
}  
  
function updateCERow(ceId, formData) {  
  const cePill = document.querySelector(`.ce-pill[data-ce-id="${ceId}"]`);  
  if (cePill) {  
    cePill.textContent = formData['ceContent'];  
    cePill.dataset.ceType = formData['ceType'];  
  }  
}  
  
function updateCEPill(ceId, resourceCount) {
  const cePills = document.querySelectorAll(`.ce-pill[data-ce-id="${ceId}"]`);
  cePills.forEach(cePill => {
    const ceText = cePill.textContent.trim();
    cePill.innerHTML = ''; // Clear existing content

    // Add the CE text
    const textNode = document.createTextNode(ceText.replace(/\(\d+\)$/, '').trim());
    cePill.appendChild(textNode);

    if (resourceCount > 0) {
      const tally = document.createElement('span');
      tally.className = 'badge bg-light text-dark ms-2';
      tally.textContent = resourceCount.toString();
      cePill.appendChild(tally);
    }

    // Add the green dot for new CEs
    const ceData = ce_store[ceId];
    if (ceData && ceData.is_new) {
      const greenDot = document.createElement('span');
      greenDot.className = 'position-absolute top-0 start-100 translate-middle p-2 bg-success border border-light rounded-circle';
      const visuallyHiddenText = document.createElement('span');
      visuallyHiddenText.className = 'visually-hidden';
      visuallyHiddenText.textContent = 'New CE';
      greenDot.appendChild(visuallyHiddenText);
      cePill.appendChild(greenDot);
    }
  });
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
