document.addEventListener('DOMContentLoaded', function () {  
  setupEventListeners();  
});  
  
function setupEventListeners() {  
  document.querySelectorAll('.ce-pill').forEach(pill => {  
    pill.addEventListener('click', handleCEPillClick, { once: true });  
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
      displayCEModal(data.modal_html, ceId, ceType, cosContent, phaseName, phaseIndex, aiGeneratedData, data.table_data, data.tabulator_columns);  
    } else {  
      throw new Error('Modal HTML content not found or error in response');  
    }  
  })  
  .catch(error => console.error('Error fetching modal content:', error));  
}  
  
function displayCEModal(modalHtml, ceId, ceType, cosContent, phaseName, phaseIndex, aiGeneratedData = { fields: {} }, tableData, tabulatorColumns, ssolGoal) {  
  const modalContainer = document.getElementById('dynamicModalContainer');  
  if (!modalContainer) {  
    console.error('Modal container element not found in the DOM');  
    return;  
  }  
  
  const phaseColors = ["#e91e63", "#00bcd4", "#9c27b0", "#ffc107", "#66bd0e"];  
  const phaseColor = phaseColors[phaseIndex % phaseColors.length];  
  
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
            <span class="modal-header-title">${ceType.replace('_', ' ').toUpperCase()}</span>  
          </h5>  
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>  
        </div>  
        <div class="modal-body">  
          <p>${NODES[ceType]?.definition || 'No definition available.'}</p>  
          <h6>Parent COS: ${cosContent}</h6>  
          <div id="dynamicTable-${ceId}" class="tabulator-table"></div> <!-- Ensure ID is unique by appending ceId -->  
          <hr>  
          <form id="ceForm-${ceId}">  
            ${generateFormFields(NODES[ceType]?.modal_config.fields, aiGeneratedData.fields)}  
          </form>  
          <div class="button-group">  
            <button type="button" class="btn btn-success" id="addRowButton-${ceId}">Add ${ceType}</button>  
            <button type="button" class="btn btn-primary" id="generateRowButton-${ceId}">Generate ${ceType}</button>  
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
      const table = initializeTabulatorTable(tableElementId, tableData, tabulatorColumns);  
      modalElement._tabulator = table;  
    });  
  
    setupModalEventListeners(modalElement, ceId, ceType, cosContent, phaseName, phaseIndex, ssolGoal);  
  } else {  
    console.error(`Modal element not found in the DOM for CE ID: ${ceId}`);  
  }  
}  
  
function initializeTabulatorTable(tableSelector, tableData, tabulatorColumns) {  
  const tableElement = document.querySelector(tableSelector);  
  if (!tableElement) {  
    console.error('Table element not found:', tableSelector);  
    return;  
  }  
  
  return new Tabulator(tableSelector, {  
    data: tableData.length ? tableData : [{}],  
    layout: "fitColumns",  
    pagination: "local",  
    paginationSize: 5,  
    movableColumns: true,  
    resizableRows: true,  
    columns: tabulatorColumns,  
  });  
}  
  
function clearFormFields(formSelector) {  
  const form = document.querySelector(formSelector);  
  if (form) {  
    form.reset();  
    form.querySelectorAll('input, textarea, select').forEach(field => {  
      field.value = field.placeholder;  
    });  
  }  
}  
  
function generateFieldsFromAI(ceId, ceType) {  
  const form = document.querySelector(`#ceForm-${ceId}`);  
  const cosContent = document.querySelector('.cos-content-cell').textContent.trim();  
  const ssolGoal = document.querySelector('#ssol-goal').textContent.trim();  
  
  const requestData = {  
    ce_id: ceId,  
    ce_type: ceType,  
    cos_content: cosContent,  
    ssol_goal: ssolGoal  
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
  
function generateFormFields(fieldsConfig, aiData) {  
  if (!fieldsConfig) {  
    return 'No form fields available.';  
  }  
  
  return fieldsConfig.map(field => {  
    return `  
      <div class="form-group">  
        <label for="${field.name}">${field.placeholder}</label>  
        ${field.type === 'textarea' ? `  
          <textarea class="form-control" id="${field.name}" name="${field.name}" placeholder="${field.placeholder}">${aiData[field.name] || ''}</textarea>  
        ` : `  
          <input type="${field.type}" class="form-control" id="${field.name}" name="${field.name}" placeholder="${field.placeholder}" value="${aiData[field.name] || ''}">  
        `}  
      </div>  
    `;  
  }).join('');  
}  
  
function setupModalEventListeners(modalElement, ceId, ceType, cosContent, phaseName, phaseIndex, ssolGoal) {  
  const addRowButton = modalElement.querySelector(`#addRowButton-${ceId}`);  
  const generateRowButton = modalElement.querySelector(`#generateRowButton-${ceId}`);  
  const saveChangesButton = modalElement.querySelector('.btn-save-changes');  
  
  if (addRowButton) {  
    addRowButton.addEventListener('click', () => {  
      const table = modalElement._tabulator; // Retrieve the Tabulator instance  
      const formData = new FormData(modalElement.querySelector(`#ceForm-${ceId}`));  
      const rowData = {};  
      formData.forEach((value, key) => {  
        rowData[key] = value;  
      });  
  
      // Find the first empty row  
      const rows = table.getRows();  
      let emptyRow = rows.find(row => Object.values(row.getData()).every(val => val === ''));  
        
      if (emptyRow) {  
        emptyRow.update(rowData);  
      } else {  
        table.addRow(rowData, true); // Add row to the top  
      }  
        
      clearFormFields(`#ceForm-${ceId}`);  
    });  
  }  
  
  if (generateRowButton) {  
    generateRowButton.addEventListener('click', () => {  
      const form = modalElement.querySelector(`#ceForm-${ceId}`);  
      const inputs = form.querySelectorAll('input, textarea, select');  
      let emptyFields = Array.from(inputs).filter(input => input.value.trim() === '');  
  
      if (emptyFields.length > 0) {  
        generateFieldsFromAI(ceId, ceType);  
      } else {  
        if (confirm('There are already values in the fields. Do you want to overwrite them?')) {  
          generateFieldsFromAI(ceId, ceType);  
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
        updatedData[key] = value;  
      });  
      saveCEChanges(ceId, updatedData);  
    });  
  }  
}  
  
function saveCEChanges(ceId, updatedData) {  
  fetch(`/update_ce/${encodeURIComponent(ceId)}`, {  
      method: 'PUT',  // Ensure the method is PUT  
      headers: {  
          'Content-Type': 'application/json'  
      },  
      body: JSON.stringify(updatedData)  
  })  
  .then(response => response.json())  
  .then(data => {  
      if (data.success) {  
          console.log(`CE ID ${ceId} updated successfully`);  
          bootstrap.Modal.getInstance(document.querySelector(`#ceModal-${ceId}`)).hide();  
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
