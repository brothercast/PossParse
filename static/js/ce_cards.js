document.addEventListener('DOMContentLoaded', function () {  
  initializeCETable();  
  setupEventListeners();  
});  
  
function initializeCETable() {  
  const cosContentCells = document.querySelectorAll('.cos-content-cell');  
  cosContentCells.forEach(cell => {  
    cell.innerHTML = replaceCETagsWithPills(cell.innerHTML);  
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
    } else if (event.target.matches('.btn-save-changes')) {  
      handleSaveChanges(event);  
    }  
  });  
}  
  
function handleCEPillClick(event) {  
  console.log("CE pill clicked"); // Log click event  
  const ceId = event.target.dataset.ceId;  
  const ceType = event.target.dataset.ceType || "Default";  
  const cosContent = event.target.closest('tr').querySelector('.cos-content-cell').textContent.trim();  
  const phaseElement = event.target.closest('.accordion-item');  
  const phaseName = phaseElement.querySelector('.accordion-header button').innerText.trim();  
  const phaseIndex = Array.from(phaseElement.parentElement.children).indexOf(phaseElement);  
  
  const requestData = {  
    ce_id: ceId,  
    cos_content: cosContent,  
    phase_name: phaseName,  
    phase_index: phaseIndex,  
    ssol_goal: document.querySelector('#ssol-goal').textContent.trim()  
  };  
  
  console.log("Request data:", requestData); // Log request data  
  
  fetch(`/get_ce_modal/${encodeURIComponent(ceType)}`, {  
    method: 'POST',  
    headers: {  
      'Content-Type': 'application/json'  
    },  
    body: JSON.stringify(requestData)  
  })  
  .then(response => response.json())  
  .then(data => {  
    console.log("Modal data received:", data); // Log response data  
    if (data && data.modal_html) {  
      displayCEModal(data.modal_html, ceId, ceType, cosContent, phaseName, phaseIndex);  
      initializeTabulatorTable(`#ceTable-${ceId}`, data.table_data); // Initialize Tabulator with data  
    } else {  
      throw new Error('Modal HTML content not found or error in response');  
    }  
  })  
  .catch(error => console.error('Error fetching modal content:', error));  
}  

  
function displayCEModal(modalHtml, ceId, ceType, cosContent, phaseName, phaseIndex, aiContext) {  
  const modalContainer = document.getElementById('dynamicModalContainer');  
  if (!modalContainer) {  
      console.error('Modal container element not found in the DOM');  
      return;  
  }  

  const phaseColors = ["#e91e63", "#00bcd4", "#9c27b0", "#ffc107", "#66bd0e"]; // Colors for each phase  
  const phaseColor = phaseColors[phaseIndex % phaseColors.length]; // Get color based on phase index  

  const wrappedModalHtml = `  
      <div class="modal fade" id="ceModal-${ceId}" tabindex="-1" aria-labelledby="ceModalLabel-${ceId}" aria-hidden="true">  
          <div class="modal-dialog modal-lg" role="document">  
              <div class="modal-content" style="border-top: 5px solid ${phaseColor};">  
                  <div class="modal-header" style="background-color: ${phaseColor};">  
                      <div class="filled-box"></div>  
                      <h5 class="modal-title" id="ceModalLabel-${ceId}">  
                          <span class="node-icon me-2" style="color: ${phaseColor};">  
                              <i class="${NODES[ceType].icon}"></i>  
                          </span>  
                          <span class="modal-header-title">${ceType.replace('_', ' ').toUpperCase()}</span>  
                      </h5>  
                      <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>  
                  </div>  
                  <div class="modal-body">  
                      <p>${NODES[ceType].definition}</p>  
                      <h6>Parent COS: ${cosContent}</h6>  
                      <p>${aiContext}</p>  
                      <div id="ceTable-${ceId}" class="tabulator-table"></div>  
                      <hr>  
                      <form id="ceForm-${ceId}">  
                          ${NODES[ceType].modal_config.fields.map(field => `  
                              <div class="form-group">  
                                  <label for="${field.name}">${field.placeholder}</label>  
                                  ${field.type === 'textarea' ? `  
                                      <textarea class="form-control" id="${field.name}" name="${field.name}" placeholder="${field.placeholder}"></textarea>  
                                  ` : `  
                                      <input type="${field.type}" class="form-control" id="${field.name}" name="${field.name}" placeholder="${field.placeholder}">  
                                  `}  
                              </div>  
                          `).join('')}  
                      </form>  
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

  setTimeout(() => {  
      const modalElement = modalContainer.querySelector(`#ceModal-${ceId}`);  
      if (modalElement) {  
          $(`#ceModal-${ceId}`).modal('show');  

          $(`#ceModal-${ceId}`).on('shown.bs.modal', function () {  
              const tableElementId = `#ceTable-${ceId}`;  
              const tableData = []; // Replace with actual data  
              const tabulatorColumns = NODES[ceType].tabulator_config.columns;  
              initializeTabulatorTable(tableElementId, tableData, tabulatorColumns);  
          });  
      } else {  
          console.error(`Modal element not found in the DOM for CE ID: ${ceId}`);  
      }  
  }, 100);  
}  
  
function initializeTabulatorTable(tableId, tableData, tabulatorColumns) {  
  console.log('Initializing Tabulator table with ID:', tableId, 'and data:', tableData);  
  new Tabulator(tableId, {  
    data: tableData, // Load data into table  
    layout: "fitColumns", // Fit columns to width of table  
    height: "200px", // Set height to display 5 rows  
    pagination: "local", // Enable pagination  
    paginationSize: 5, // Number of rows per page  
    movableColumns: true, // Enable column move  
    resizableRows: true, // Enable row resize  
    columns: tabulatorColumns // Use the provided columns configuration  
  });  
}  

function fetchCEDataAndDisplayModal(ceId, ceType, cosContent) {  
  console.log(`Fetching CE data for ID: ${ceId} and Type: ${ceType}`);  
  fetch(`/get_ce_by_id/${encodeURIComponent(ceId)}`)  
    .then(response => response.json())  
    .then(data => {  
      if (data && data.ce) {  
        const ceData = data.ce;  
        console.log(`Fetched CE data: ${JSON.stringify(ceData)}`);  
        fetch(`/get_ce_modal/${encodeURIComponent(ceType)}`)  
          .then(response => response.json())  
          .then(modalData => {  
            if (modalData && modalData.modal_html) {  
              console.log(`Fetched Modal HTML: ${modalData.modal_html}`);  
              displayCEModal(modalData.modal_html, ceData, cosContent);  
            } else {  
              throw new Error('Modal HTML content not found or error in response');  
            }  
          })  
          .catch(error => console.error('Error fetching modal content:', error));  
      } else {  
        throw new Error('CE data not found or error in response');  
      }  
    })  
    .catch(error => console.error('Error fetching CE details:', error));  
}  
 

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
  
function displayFeedback(message, type) {  
  const feedbackElement = document.querySelector('#feedback');  
  if (feedbackElement) {  
    feedbackElement.textContent = message;  
    feedbackElement.className = `feedback ${type}`;  
    feedbackElement.style.display = 'block';  
    setTimeout(() => {  
      feedbackElement.style.display = 'none';  
    }, 5000);  
  }  
}  
  
function changeCEType(ceType) {  
  fetch(`/get_ce_modal/${encodeURIComponent(ceType)}`)  
    .then(response => response.json())  
    .then(data => {  
      if (data.modal_html) {  
        const modalContainer = document.querySelector('#dynamicModalContainer');  
        modalContainer.innerHTML = data.modal_html;  
      } else {  
        throw new Error('Modal HTML content not found or error in response');  
      }  
    })  
    .catch(error => {  
      console.error('Error fetching modal content:', error);  
    });  
}  
  
async function speculate(button) {  
  const ceType = button.closest('.modal').id.replace('ceModal', '');  
  const cosText = ''; // Retrieve the COS text relevant for speculation  
  const ssolGoal = ''; // Retrieve the SSOL goal relevant for speculation  
  const ceId = ''; // Retrieve the CE ID relevant for speculation  
  
  try {  
    const aiMessage = window.generate_ai_query(cosText, ceId, ceType, ssolGoal);  
    const aiResponse = await fetchAIResponse(aiMessage);  
    const tableContainer = document.querySelector(`#tableContainer${ceType}`);  
    const newRow = document.createElement('tr');  
    newRow.innerHTML = `<td>${aiResponse}</td>`;  
    const table = tableContainer.querySelector('table tbody');  
    table.appendChild(newRow);  
  } catch (error) {  
    console.error('Error speculating AI response:', error);  
  }  
}  
  
async function fetchAIResponse(aiMessage) {  
  const aiEndpoint = '/ai-query-endpoint';  
  const response = await fetch(aiEndpoint, {  
    method: 'POST',  
    headers: {  
      'Content-Type': 'application/json'  
    },  
    body: JSON.stringify({ message: aiMessage })  
  });  
  
  if (!response.ok) {  
    throw new Error(`AI service responded with status ${response.status}`);  
  }  
  
  return await response.json();  
}  
  
function createAndShowCEModal(ceData) {  
  if (!ceData || typeof ceData.type === 'undefined') {  
    console.error('CE data or type is undefined');  
    displayFeedback("Error: CE data or type is undefined", "error");  
    return;  
  }  
  
  fetch(`/get_ce_modal/${encodeURIComponent(ceData.node_type)}`)  
    .then(response => response.json())  
    .then(data => {  
      if (data.modal_html) {  
        const modalContainer = document.getElementById('dynamicModalContainer');  
        modalContainer.innerHTML = data.modal_html;  
        $(`#ceModal${ceData.node_type}`).modal('show');  
      } else {  
        throw new Error('Modal HTML content not found or error in response');  
      }  
    })  
    .catch(error => console.error('Error fetching modal content:', error));  
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
  
// Event listener for the "Save changes" button within the modal  
document.addEventListener('DOMContentLoaded', function () {  
  document.addEventListener('click', function (event) {  
    if (event.target.matches('.btn-save-changes')) {  
      const ceId = event.target.dataset.ceId;  
      const form = document.querySelector(`#ceForm${ceId}`);  
      if (form) {  
        const formData = new FormData(form);  
        const data = {};  
        formData.forEach((value, key) => data[key] = value);  
  
        fetch(`/update_ce/${encodeURIComponent(ceId)}`, {  
          method: 'PUT',  
          headers: {  
            'Content-Type': 'application/json'  
          },  
          body: JSON.stringify(data)  
        })  
          .then(response => response.json())  
          .then(updateData => {  
            if (updateData.success) {  
              $(`#ceModal${ceId}`).modal('hide');  
              displayFeedback("CE updated successfully", "success");  
            } else {  
              displayFeedback(updateData.error || 'An error occurred while updating the CE.', "error");  
            }  
          })  
          .catch(updateError => {  
            displayFeedback(`Error: ${updateError.message}`, "error");  
          });  
      } else {  
        console.error('Form not found');  
      }  
    }  
  });  
});  

document.addEventListener('DOMContentLoaded', function () {  
  const addEntryButton = document.getElementById('addEntryButton');  
  const dynamicTable = document.getElementById('dynamicTable').querySelector('tbody');  
  
  addEntryButton.addEventListener('click', function () {  
    const form = document.getElementById(`ceForm${ce_id}`);  
    const formData = new FormData(form);  
    const newRow = document.createElement('tr');  
  
    newRow.innerHTML = generateTableRowHTML(formData);  
    dynamicTable.appendChild(newRow);  
    form.reset(); // Clear the form fields  
  });  
  
  dynamicTable.addEventListener('click', function (event) {  
    if (event.target.classList.contains('delete-entry')) {  
      const row = event.target.closest('tr');  
      row.remove();  
    } else if (event.target.classList.contains('edit-entry')) {  
      const row = event.target.closest('tr');  
      populateFormFieldsFromRow(row);  
      row.remove();  
    }  
  });  
  
  function generateTableRowHTML(formData) {  
    let rowHTML = '';  
    formData.forEach((value, key) => {  
      rowHTML += `<td>${value}</td>`;  
    });  
    rowHTML += `  
      <td>  
        <button class="btn btn-sm btn-warning edit-entry">Edit</button>  
        <button class="btn btn-sm btn-danger delete-entry">Delete</button>  
      </td>  
    `;  
    return rowHTML;  
  }  
  
  function populateFormFieldsFromRow(row) {  
    const form = document.getElementById(`ceForm${ce_id}`);  
    const cells = row.querySelectorAll('td');  
    cells.forEach((cell, index) => {  
      if (index < cells.length - 1) {  
        const fieldName = form.elements[index].name;  
        form.elements[fieldName].value = cell.textContent;  
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
    dynamicTable.appendChild(newRow);  
  });  
});  
