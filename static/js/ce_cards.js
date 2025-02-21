// ce_cards.js  
  
import { showLoadingSpinner, hideLoadingSpinner } from './base_functions.js';  
let hasUnsavedChanges = false;  
  
// Initialize ce_store if not already defined  
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
    pill.addEventListener('dblclick', handleCEPillDoubleClick); // Add double-click event listener  
    pill.setAttribute('title', 'Double-tap to open Conditional Element'); // Add tooltip  
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
  const iconClass = NODES[ceType]?.icon || 'fa-spinner'; // Get the appropriate icon class or default to fa-spinner  
  const cosContentCell = event.target.closest('tr').querySelector('.cos-content-cell');  
  const cosContent = cosContentCell ? cosContentCell.innerHTML : ''; // Use innerHTML instead of textContent  
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
  
  showLoadingSpinner(`Loading ${ceType} data...`, iconClass); // Pass the icon class here  
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
  
function handleCEPillDoubleClick(event) {  
  handleCEPillClick(event); // Reuse the click handler for double-click  
}  
  
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
  const cosContentWithPills = replace_ce_tags_with_pills(cosContent, ce_store);  

  const iconClass = NODES[ceType]?.icon || 'fa-solid fa-icons'; // Use default icon if not found  

  const wrappedModalHtml = `  
      <div class="modal fade" id="ceModal-${ceId}" tabindex="-1" aria-labelledby="ceModalLabel-${ceId}" aria-hidden="true">  
          <div class="modal-dialog modal-lg" role="document">  
              <div class="modal-content">  
                  <div class="modal-header" style="background-color: ${phaseColor};">  
                      <div class="filled-box"></div>  
                      <h5 class="modal-title" id="ceModalLabel-${ceId}">  
                          <span class="node-icon me-2" style="color: ${phaseColor};">  
                              <i class="${iconClass}"></i>  
                          </span>  
                          <span class="modal-header-title">${ceType.replace('_', ' ').toUpperCase()} // ${phaseName.toUpperCase()}</span>  
                      </h5>  
                      <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>  
                  </div>  
                  <div class="modal-body">  
                      <p><span class="context-label">Source COS:</span>${cosContentWithPills}</p>  
                      <p><span class="context-label">${ceType}:</span><span class="context-text">${aiGeneratedData.contextual_description || 'No contextual description available.'}</span></p>  
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

      modalElement.addEventListener('shown.bs.modal', function () {  
          const tableElementId = `#dynamicTable-${ceId}`;  
          const table = initializeTabulatorTable(tableElementId, tableData, tabulatorConfig, ceType);  
          modalElement._tabulator = table;  
      });  

      modalElement.addEventListener('hidden.bs.modal', function () {  
          if (hasUnsavedChanges && !confirm('You have unsaved changes. Do you really want to close?')) {  
              const modal = new bootstrap.Modal(modalElement);  
              modal.show();  
          } else {  
              setupEventListeners();  
          }  
      });  

      setupModalEventListeners(modalElement, ceId, ceType, cosContent, phaseName, phaseIndex, ssolGoal);  
  } else {  
      console.error(`Modal element not found in the DOM for CE ID: ${ceId}`);  
  }  
}  

  
function replace_ce_tags_with_pills(content, ce_store) {  
  const parser = new DOMParser();  
  const doc = parser.parseFromString(content, 'text/html');  
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
    pill.title = "Double-tap to open Conditional Element";  
  
    if (ceData.is_new) {  
      const greenDot = document.createElement('span');  
      greenDot.className = 'position-absolute top-0 start-100 translate-middle p-2 bg-success border border-light rounded-circle';  
      const visuallyHiddenText = document.createElement('span');  
      visuallyHiddenText.className = 'visually-hidden';  
      visuallyHiddenText.textContent = 'New CE';  
      greenDot.appendChild(visuallyHiddenText);  
      pill.appendChild(greenDot);  
    }  
  
    const nonNullRows = ceData.table_data ? ceData.table_data.filter(row => Object.values(row).some(value => value !== null && value !== '')) : [];  
    const resourceCount = nonNullRows.length;  
    if (resourceCount > 0) {  
      const tally = document.createElement('span');  
      tally.className = 'badge rounded-pill bg-light text-dark ms-2 ce-pill counter';  
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
  
function initializeTabulatorTable(tableSelector, tableData, tabulatorColumns, ceType) {  
  const tableElement = document.querySelector(tableSelector);  
  if (!tableElement) {  
      console.error('Table element not found:', tableSelector);  
      return;  
  }  

  const initialData = tableData.length ? tableData : [];  

  try {  
    const table = new Tabulator(tableSelector, {  
      data: initialData,  
      layout: "fitColumns",  
      movableColumns: true,  
      resizableRows: true,  
      selectable: true,  
      reactiveData: true,  
      placeholder: `Add or Generate ${ceType}`,  
      rowHeight: 40,  // Ensure this is the correct option  
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
  });  

      return table;  
  } catch (error) {  
      console.error('Error initializing Tabulator table:', error);  
  }  
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
  // Define buttons and elements within the modal  
  const addRowButton = modalElement.querySelector(`#addRowButton-${ceId}`);  
  const generateRowButton = modalElement.querySelector(`#generateRowButton-${ceId}`);  
  const saveChangesButton = modalElement.querySelector('.btn-save-changes');  
  const deleteSelectedRowsButton = modalElement.querySelector(`#deleteSelectedRowsButton-${ceId}`);  
  const duplicateSelectedRowsButton = modalElement.querySelector(`#duplicateSelectedRowsButton-${ceId}`);  

  // Handle changes in the modal  
  modalElement.addEventListener('change', () => {  
      hasUnsavedChanges = true;  
  });  

  // Handle modal close event  
  modalElement.addEventListener('hidden.bs.modal', function () {  
      if (hasUnsavedChanges) {  
          // Handle unsaved changes, e.g., prompt user  
          if (confirm('You have unsaved changes. Do you really want to close?')) {  
              hasUnsavedChanges = false; // Reset after handling  
          } else {  
              const modal = new bootstrap.Modal(modalElement);  
              modal.show(); // Reopen the modal  
          }  
      }  
  });  

  // Add event listener to Add Row button  
  if (addRowButton) {  
      addRowButton.addEventListener('click', () => {  
          const table = modalElement._tabulator;  
          const form = modalElement.querySelector(`#ceForm-${ceId}`);  
          const formData = new FormData(form);  
          const rowData = {};  
          let isAnyFieldFilled = false;  

          formData.forEach((value, key) => {  
              if (value.trim()) {  
                  isAnyFieldFilled = true;  
              }  
              rowData[key] = value || '';  
          });  

          if (!isAnyFieldFilled) {  
              alert('Please fill in at least one field before adding a row.');  
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
          hasUnsavedChanges = true;  
      });  
  }   
  
  if (saveChangesButton) {  
    saveChangesButton.addEventListener('click', () => {  
      saveCEChanges(ceId);  
      hasUnsavedChanges = false;  
    });  
  }  
  
  if (deleteSelectedRowsButton) {  
    deleteSelectedRowsButton.addEventListener('click', () => {  
      const table = modalElement._tabulator;  
      const selectedRows = table.getSelectedRows();  
      selectedRows.forEach(row => row.delete());  
      hasUnsavedChanges = true;  
    });  
  }  
  
  if (duplicateSelectedRowsButton) {  
    duplicateSelectedRowsButton.addEventListener('click', () => {  
      const table = modalElement._tabulator;  
      const selectedRows = table.getSelectedRows();  
      selectedRows.forEach(row => {  
        const rowData = row.getData();  
        table.addRow(rowData, true);  
      });  
      hasUnsavedChanges = true;  
    });  
  }  
  
  modalElement.addEventListener('hidden.bs.modal', function () {  
    if (hasUnsavedChanges && !confirm('You have unsaved changes. Do you really want to close?')) {  
      const modal = new bootstrap.Modal(modalElement);  
      modal.show();  
    } else {  
      setupEventListeners(); // Reattach event listeners when modal is closed  
    }  
  });  
}  
  
function saveCEChanges(ceId) {  
  const modalElement = document.querySelector(`#ceModal-${ceId}`);  
  const table = modalElement._tabulator;  
  const tableData = table ? table.getData() : [];  
  
  // Filter out rows with all null or empty values  
  const nonNullRows = tableData.filter(row =>  
    Object.values(row).some(value => value !== null &&  
      (typeof value === 'string' ? value.trim() !== '' : value !== ''))  
  );  
  
  const updatedData = {  
    table_data: nonNullRows,  
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
        updateCEPills(ceId, nonNullRows.length); // Update all CE pills with the same ID  
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
  
function updateCEPills(ceId, resourceCount) {  
  const cePills = document.querySelectorAll(`.ce-pill[data-ce-id="${ceId}"]`);  
  cePills.forEach(cePill => {  
    const ceText = cePill.textContent.replace(/\(\d+\)$/, '').trim();  
    cePill.innerHTML = ''; // Clear existing content  
  
    // Add the CE text  
    const textNode = document.createTextNode(ceText);  
    cePill.appendChild(textNode);  
  
    if (resourceCount > 0) {  
      const tally = document.createElement('span');  
      tally.className = 'badge rounded-pill bg-light text-dark ms-2 counter';  
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
  
    // Reattach click event listener  
    cePill.addEventListener('click', (event) => handleCEPillClick(event));  
  });  
}  
  
// Ensure this function is called after any changes to CE data  
function refreshAllCEPills() {  
  Object.entries(ce_store).forEach(([ceId, ceData]) => {  
    const nonBlankRows = ceData.table_data ? ceData.table_data.filter(row => Object.values(row).some(value => value !== null && value.trim() !== '')) : [];  
    updateCEPills(ceId, nonBlankRows.length);  
  });  
}  
  
// Call this function after initializing the page and after any bulk updates to CE data  
document.addEventListener('DOMContentLoaded', function () {  
  setupEventListeners();  
  refreshAllCEPills();  
});  
