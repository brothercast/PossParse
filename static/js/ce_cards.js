document.addEventListener('DOMContentLoaded', function () {  
  const tableSelector = '#ceTable';  
  if (typeof tableData !== 'undefined' && typeof tabulatorColumns !== 'undefined') {
    initializeCETable(tableSelector, tableData, tabulatorColumns);
  } else {
    console.error('tableData or tabulatorColumns is not defined');
  }
  setupEventListeners();  
});  
  
function initializeCETable(tableSelector, tableData, tabulatorColumns) {  
  const tableElement = document.querySelector(tableSelector);  
  if (!tableElement) {  
    console.error('Table element not found:', tableSelector);  
    return;  
  }  
  
  const paginationElement = document.querySelector(`${tableSelector} .tabulator-paginator`);  
  if (paginationElement) {  
    if (tableData.length <= 5) {  
      paginationElement.style.display = 'none';  
    } else {  
      paginationElement.style.display = 'block';  
    }  
  }  
  
  new Tabulator(tableSelector, {  
    data: tableData, // Load data into table  
    layout: "fitColumns", // Fit columns to width of table  
    pagination: "local", // Enable pagination  
    paginationSize: 5, // Number of rows per page  
    movableColumns: true, // Enable column move  
    resizableRows: true, // Enable row resize  
    columns: tabulatorColumns, // Use the provided columns configuration  
    rowFormatter: function (row) {  
      const element = row.getElement();  
      element.style.backgroundColor = row.getPosition() % 2 === 0 ? '#f5f5f5' : '#eeeeee';  
    },  
    paginationButtonCount: 3, // Number of page buttons to display  
  });  
}   

function replaceCETagsWithPills(content) {  
  const ceTagPattern = /<ce id="(.*?)" type="(.*?)">(.*?)<\/ce>/gi;  
  return content.replace(ceTagPattern, (match, ceId, ceType, ceContent) => {  
    return `<span class="badge rounded-pill bg-secondary ce-pill" data-ce-id="${ceId}" data-ce-type="${ceType}" contenteditable="false">${ceContent}</span>`;  
  });  
}  

function setupEventListeners() {  
  document.addEventListener('click', event => {  
    if (event.target.matches('.ce-pill')) {  
      handleCEPillClick(event);  
    }  
  });  
}    
  
function handleCEPillClick(event) {  
  // Extract necessary data attributes from the clicked CE pill  
  const ceId = event.target.dataset.ceId;  
  const ceType = event.target.dataset.ceType || "Default";  
  const cosContentElement = event.target.closest('tr').querySelector('.cos-content-cell');  
  
  if (!cosContentElement) {  
    console.error('cosContentElement not found');  
    return;  
  }  
  
  const cosContent = cosContentElement.textContent.trim();  
  const phaseElement = event.target.closest('.accordion-item');  
  const phaseName = phaseElement.querySelector('.accordion-header button').innerText.trim();  
  const phaseIndex = Array.from(phaseElement.parentElement.children).indexOf(phaseElement);  
  const ssolGoalElement = document.querySelector('#ssol-goal');  
  const ssolGoal = ssolGoalElement ? ssolGoalElement.textContent.trim() : '';  
  
  // Construct the request data object  
  const requestData = {  
    ce_id: ceId,  
    cos_content: cosContent,  
    phase_name: phaseName,  
    phase_index: phaseIndex,  
    ssol_goal: ssolGoal  
  };  
  
  // Fetch the modal content using the POST request to the `/get_ce_modal` endpoint  
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
      displayCEModal(data.modal_html, ceId, ceType, cosContent, phaseName, phaseIndex);
      
      // Initialize the table with the received data
      if (data.table_data && data.tabulator_columns) {
        const tableSelector = `#dynamicTable-${ceId}`;
        initializeCETable(tableSelector, data.table_data, data.tabulator_columns);
      }
    } else {
      throw new Error('Modal HTML content not found or error in response');
    }
  })
  .catch(error => console.error('Error fetching modal content:', error));
}
  
function fetchModalContent(requestData) {  
  fetch(`/get_ce_modal/${encodeURIComponent(requestData.ceType)}`, {  
    method: 'POST',  
    headers: {  
      'Content-Type': 'application/json'  
    },  
    body: JSON.stringify(requestData)  
  })  
  .then(response => response.json())  
  .then(data => {  
    if (data.modal_html) {  
      displayCEModal(data.modal_html, requestData.ce_id, requestData.ceType, requestData.cos_content, requestData.phase_name, requestData.phase_index, data.ai_context);  
    } else {  
      throw new Error('Error fetching modal content: ' + (data.error || 'Unknown error'));  
    }  
  })  
  .catch(error => {  
    console.error('Error fetching modal content:', error);  
  });  
}  
  
function displayCEModal(modalHtml, ceId, ceType, cosContent, phaseName, phaseIndex) {  
  const modalContainer = document.getElementById('dynamicModalContainer');  
  if (!modalContainer) {  
    console.error('Modal container element not found in the DOM');  
    return;  
  }  
  
  console.log('Displaying CE Modal with the following parameters:');  
  console.log(`CE ID: ${ceId}`);  
  console.log(`CE Type: ${ceType}`);  
  console.log(`COS Content: ${cosContent}`);  
  console.log(`Phase Name: ${phaseName}`);  
  console.log(`Phase Index: ${phaseIndex}`);  
  
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
            ${generateFormFields(NODES[ceType]?.modal_config.fields)}  
          </form>  
          <button type="button" class="btn btn-success" id="addRowButton-${ceId}">Add ${ceType}</button>  
        </div>  
        <div class="modal-footer">  
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>  
          <button type="button" class="btn btn-primary btn-save-changes" data-ce-id="${ceId}">Save changes</button>  
        </div>  
      </div>  
    </div>  
  </div>  
  `;  
  
  console.log('Wrapped Modal HTML:', wrappedModalHtml);  
  
  modalContainer.innerHTML = wrappedModalHtml;  
  
  const modalElement = modalContainer.querySelector(`#ceModal-${ceId}`);  
  console.log('Modal Element:', modalElement);  
  
  if (modalElement) {  
    const modal = new bootstrap.Modal(modalElement);  
    modal.show();  
  
    modalElement.addEventListener('shown.bs.modal', function () {  
      const tableElementId = `#dynamicTable-${ceId}`;  
      const tabulatorColumns = NODES[ceType]?.tabulator_config.columns || [];  
      console.log('Initializing Tabulator Table with ID:', tableElementId);  
      initializeTabulatorTable(tableElementId, [], tabulatorColumns);  
    });  
  
    console.log(`Modal content for CE ID ${ceId}:`, modalElement.innerHTML);  
  
    const addRowButton = document.getElementById(`addRowButton-${ceId}`);  
    if (addRowButton) {  
      addRowButton.addEventListener('click', () => {  
        const formData = new FormData(document.querySelector(`#ceForm-${ceId}`));  
        const rowData = {};  
        formData.forEach((value, key) => {  
          rowData[key] = value;  
        });  
        const table = Tabulator.findTable(`#dynamicTable-${ceId}`)[0];  
        table.addRow(rowData);  
      });  
    }  
  
    const saveChangesButton = modalElement.querySelector('.btn-save-changes');  
    if (saveChangesButton) {  
      saveChangesButton.addEventListener('click', () => {  
        const formData = new FormData(document.querySelector(`#ceForm-${ceId}`));  
        const updatedData = {};  
        formData.forEach((value, key) => {  
          updatedData[key] = value;  
        });  
        saveCEChanges(ceId, updatedData);  
      });  
    }  
  } else {  
    console.error(`Modal element not found in the DOM for CE ID: ${ceId}`);  
  }  
}  
  
function generateFormFields(fieldsConfig) {  
  if (!fieldsConfig) {  
    return 'No form fields available.';  
  }  
  
  return fieldsConfig.map(field => `  
    <div class="form-group">  
      <label for="${field.name}">${field.placeholder}</label>  
      ${field.type === 'textarea' ? `  
        <textarea class="form-control" id="${field.name}" name="${field.name}" placeholder="${field.placeholder}"></textarea>  
      ` : `  
        <input type="${field.type}" class="form-control" id="${field.name}" name="${field.name}" placeholder="${field.placeholder}">  
      `}  
    </div>  
  `).join('');  
}  
  
function initializeTabulatorTable(tableSelector, tableData, tabulatorColumns) {  
  const tableElement = document.querySelector(tableSelector);  
  if (!tableElement) {  
    console.error('Table element not found:', tableSelector);  
    return;  
  }  
  
  new Tabulator(tableSelector, {  
    data: tableData, // Load data into table  
    layout: "fitColumns", // Fit columns to width of table  
    pagination: "local", // Enable pagination  
    paginationSize: 5, // Number of rows per page  
    movableColumns: true, // Enable column move  
    resizableRows: true, // Enable row resize  
    columns: tabulatorColumns, // Use the provided columns configuration  
    rowFormatter: function (row) {  
      const element = row.getElement();  
      element.style.backgroundColor = row.getPosition() % 2 === 0 ? '#f5f5f5' : '#eeeeee';  
    },  
    paginationButtonCount: 3, // Number of page buttons to display  
  });  
}  
  
function saveCEChanges(ceId, updatedData) {  
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
  
function generateFormFields(fieldsConfig) {  
  if (!fieldsConfig) {  
    return 'No form fields available.';  
  }  
  
  return fieldsConfig.map(field => `  
    <div class="form-group">  
      <label for="${field.name}">${field.placeholder}</label>  
      ${field.type === 'textarea' ? `  
        <textarea class="form-control" id="${field.name}" name="${field.name}" placeholder="${field.placeholder}"></textarea>  
      ` : `  
        <input type="${field.type}" class="form-control" id="${field.name}" name="${field.name}" placeholder="${field.placeholder}">  
      `}  
    </div>  
  `).join('');  
}  
  
function initializeTabulatorTable(tableSelector, tableData, tabulatorColumns) {  
  const tableElement = document.querySelector(tableSelector);  
  if (!tableElement) {  
    console.error('Table element not found:', tableSelector);  
    return;  
  }  
  
  new Tabulator(tableSelector, {  
    data: tableData, // Load data into table  
    layout: "fitColumns", // Fit columns to width of table  
    pagination: "local", // Enable pagination  
    paginationSize: 5, // Number of rows per page  
    movableColumns: true, // Enable column move  
    resizableRows: true, // Enable row resize  
    columns: tabulatorColumns, // Use the provided columns configuration  
    rowFormatter: function (row) {  
      const element = row.getElement();  
      element.style.backgroundColor = row.getPosition() % 2 === 0 ? '#f5f5f5' : '#eeeeee';  
    },  
    paginationButtonCount: 3, // Number of page buttons to display  
  });  
}  

function setupModalEventListeners(modalElement) {  
  // Assuming that Tabulator creates a table element with a specific class  
  const tableElement = modalElement.querySelector('.tabulator-table');  
    
  // Setup event listener for the Add Entry button in the modal  
  const addEntryButton = modalElement.querySelector('.add-entry-button');  
  if (addEntryButton) {  
    addEntryButton.addEventListener('click', function () {  
      const formSelector = `#ceForm-${modalElement.dataset.ceId}`;  
      const form = modalElement.querySelector(formSelector);  
      if (form) {  
        const formData = new FormData(form);  
        addEntryToTable(tableElement, formData);  
        form.reset(); // Clear the form fields after adding the entry  
      }  
    });  
  }  
  
  // Setup event listeners for any existing table rows for edit and delete actions  
  setupTableEventListeners(tableElement);  
}   

function setupTableEventListeners(tableElement) {  
  // Attach event listeners to the table body for edit and delete actions  
  const tableBody = tableElement.querySelector('tbody');  
  if (tableBody) {  
    tableBody.addEventListener('click', function (event) {  
      if (event.target.matches('.edit-entry')) {  
        const row = event.target.closest('tr');  
        editEntry(row);  
      } else if (event.target.matches('.delete-entry')) {  
        const row = event.target.closest('tr');  
        deleteEntry(row);  
      }  
    });  
  }  
}  
  
function addEntryToTable(tableElement, formData) {  
  // Logic to add a new entry to the Tabulator table  
  if (tableElement) {  
    const table = Tabulator.findTable(tableElement)[0];  
    if (table) {  
      const rowData = {};  
      formData.forEach((value, key) => {  
        rowData[key] = value;  
      });  
      table.addRow(rowData); // This assumes Tabulator's addRow method  
    }  
  }  
}  
  
function generateTableRowHTML(formData) {  
  let rowHTML = '';  
  formData.forEach((value, key) => {  
    rowHTML += `<td>${value}</td>`;  
  });  
  // Add action buttons for editing and deleting the entry  
  rowHTML += `  
    <td>  
      <button class="btn btn-sm btn-warning edit-entry">Edit</button>  
      <button class="btn btn-sm btn-danger delete-entry">Delete</button>  
    </td>  
  `;  
  return rowHTML;  
}  
  
function populateFormFieldsFromRow(row, ceId) {  
  const form = document.querySelector(`#ceForm-${ceId}`);  
  const inputs = form.querySelectorAll('input, select, textarea');  
  const cells = row.querySelectorAll('td');  
  inputs.forEach((input, index) => {  
    if (index < cells.length - 1) { // Exclude the last cell which contains buttons  
      input.value = cells[index].textContent;  
    }  
  });  
}  
  
  // Fetch AI suggestions and populate the table  
  const aiGeneratedData = JSON.parse(document.getElementById('aiGeneratedData').textContent);  
  aiGeneratedData.forEach(suggestion => {  
    const formData = new FormData();  
    Object.entries(suggestion).forEach(([key, value]) => formData.set(key, value));  
    const newRow = document.createElement('tr');  
    newRow.innerHTML = generateTableRowHTML(formData);  
    tableBody.appendChild(newRow);  
  });  

  document.addEventListener('shown.bs.modal', function(event) {  
    if (event.target.classList.contains('ce-modal')) {  
      setupModalEventListeners(event.target);  
    }  
  });  
  
  function editEntry(row) {  
    // Extract the row data from Tabulator  
    const rowData = row.getData();  
      
    // Assuming you have a form inside the modal to edit the row data  
    const formSelector = `#ceForm-${row.getTable().element.dataset.ceId}`;  
    const form = row.getTable().element.closest('.modal').querySelector(formSelector);  
      
    if (form) {  
      // Populate the form with the row data  
      Object.entries(rowData).forEach(([key, value]) => {  
        const input = form.querySelector(`[name="${key}"]`);  
        if (input) {  
          input.value = value;  
        }  
      });  
    
      // Bring the form into view and focus on the first input  
      form.scrollIntoView();  
      const firstInput = form.querySelector('input, select, textarea');  
      if (firstInput) {  
        firstInput.focus();  
      }  
    
      // Add a temporary event listener to the form's submit event  
      const submitHandler = function(event) {  
        event.preventDefault();  
        const updatedData = {};  
        new FormData(form).forEach((value, key) => {  
          updatedData[key] = value;  
        });  
        row.update(updatedData); // Update the row in the Tabulator table  
        form.removeEventListener('submit', submitHandler);  
        form.reset(); // Clear the form fields after updating  
      };  
      form.addEventListener('submit', submitHandler);  
    }  
  }  
    
  function deleteEntry(row) {  
    // Show a confirmation dialog before deleting  
    if (confirm('Are you sure you want to delete this entry?')) {  
      row.delete(); // Delete the row from the Tabulator table  
    }  
  }  
    
  // Bind event listeners when the modal is shown  
  document.addEventListener('shown.bs.modal', function(event) {  
    if (event.target.classList.contains('ce-modal')) {  
      setupModalEventListeners(event.target);  
    }  
  });  
  
function handleSaveChanges(event) {  
  const ceId = event.target.dataset.ceId;  
  const form = document.querySelector(`form[data-ce-id="${ceId}"]`);  
  if (form) {  
    const formData = collectFormData(form);  
    saveCEData(ceId, formData);  
  } else {  
    console.error('Form not found');  
  }  
}  
  
function collectFormData(form) {  
  const formData = new FormData(form);  
  const data = {};  
  formData.forEach((value, key) => data[key] = value);  
  return data;  
}  
  
function saveCEData(ceId, formData) {  
  fetch(`/update_ce/${encodeURIComponent(ceId)}`, {  
    method: 'PUT',  
    headers: {  
      'Content-Type': 'application/json'  
    },  
    body: JSON.stringify(formData)  
  })  
    .then(response => response.json())  
    .then(data => {  
      if (data.success) {  
        updateCERow(ceId, formData);  
        $(`#ceModal-${ceId}`).modal('hide');  
        displayFeedback("CE updated successfully", "success");  
      } else {  
        displayFeedback(data.error || 'An error occurred while updating the CE.', "error");  
      }  
    })  
    .catch(error => {  
      displayFeedback(`Error: ${error.message}`, "error");  
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
 

