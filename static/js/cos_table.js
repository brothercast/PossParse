document.addEventListener('DOMContentLoaded', () => {  
  const cosTable = document.getElementById('cos-table');  
  const cePills = document.querySelectorAll('.ce-pill-button');  
  const phaseTables = document.querySelectorAll('.phase-table');  
  
  if (cosTable) {  
    cosTable.addEventListener('click', handleTableClick);  
  }  
  
  cePills.forEach((pill) => {  
    pill.addEventListener('click', handleCEPillClick);  
  });  
  
  phaseTables.forEach(table => {  
    table.addEventListener('click', handlePhaseTableClick);  
  });  
});  

function handleTableClick(event) {
  const row = event.target.closest('tr');
  const cosId = row.dataset.cosId;

  if (event.target.matches('.edit-ce-button')) {
    turnRowToEditMode(row);
  } else if (event.target.matches('.update-ce-button')) {
    updateCOS(row, cosId);
  } else if (event.target.matches('.cancel-ce-button')) {
    cancelEditMode(row);
  } else if (event.target.matches('.delete-ce-button')) {
    deleteCOS(cosId, row);
  } else if (event.target.matches('.analyze-ce-button')) {
    analyzeCOS(cosId);
  }
}

function turnRowToEditMode(row) {  
  // Existing implementation to turn the row into edit mode...  
    
  // Store original data  
  const originalData = {  
    content: row.querySelector('.ce-content-cell').innerText,  
    status: row.querySelector('.status-cell').innerText,  
    accountableParty: row.querySelector('.ce-accountable-party-cell').innerText,  
    completionDate: row.querySelector('.ce-completion-date-cell').innerText  
  };  
  row.dataset.originalData = JSON.stringify(originalData);  
  
  toggleButtonVisibility(row, true);  
}  
  
function cancelEditMode(row) {  
  // Retrieve original data  
  const originalData = JSON.parse(row.dataset.originalData);  
  
  // Revert cell values to original data  
  row.querySelector('.ce-content-cell').innerText = originalData.content;  
  row.querySelector('.status-cell').innerText = originalData.status;  
  row.querySelector('.ce-accountable-party-cell').innerText = originalData.accountableParty;  
  row.querySelector('.ce-completion-date-cell').innerText = originalData.completionDate;  
  
  // Remove edit mode from the row  
  toggleButtonVisibility(row, false);  
}  

function createStatusDropdown(selectedStatus) {
  const statuses = ['Proposed', 'In Progress', 'Completed', 'Rejected'];
  const options = statuses.map(status =>
    `<option value="${status}" ${status === selectedStatus ? 'selected' : ''}>${status}</option>`
  ).join('');

  return `<select class="form-control form-control-sm ce-status-input">${options}</select>`;
}

function toggleButtonVisibility(row, editing) {  
  const editButton = row.querySelector('.edit-ce-button');  
  const updateButton = row.querySelector('.update-ce-button');  
  const cancelButton = row.querySelector('.cancel-ce-button');  
  const deleteButton = row.querySelector('.delete-ce-button');  
  
  if (editing) {  
    editButton.classList.add('d-none');  
    deleteButton.classList.add('d-none');  
    updateButton.classList.remove('d-none');  
    cancelButton.classList.remove('d-none');  
  } else {  
    editButton.classList.remove('d-none');  
    deleteButton.classList.remove('d-none');  
    updateButton.classList.add('d-none');  
    cancelButton.classList.add('d-none');  
  }  
}  
  
function updateCOS(row, cosId) {  
  const contentInput = row.querySelector('.ce-content-cell-input').value;  
  const statusSelect = row.querySelector('.ce-status-input');  
  const statusInput = statusSelect.value;  
  
  fetch(`/update_cos/${cosId}`, {  
    method: 'POST',  
    headers: { 'Content-Type': 'application/json' },  
    body: JSON.stringify({ content: contentInput, status: statusInput }),  
  })  
  .then(handleResponse)  
  .then(data => {  
    if (data.cos) {  
      row.querySelector('.ce-content-cell').innerText = data.cos.content;  
      row.querySelector('.status-cell').innerText = data.cos.status;  
      toggleButtonVisibility(row, false);  
    } else {  
      console.error('Error updating COS:', data.error);  
    }  
  })  
  .catch(error => console.error('Error:', error));  
}  
  
function handleResponse(response) {  
  if (!response.ok) {  
    throw new Error('Network response was not ok');  
  }  
  return response.json();  
}  
  
function cancelEditMode(row) {  
  // Revert to original text values from input fields  
  row.querySelectorAll('.form-control').forEach(input => {  
    const cell = input.closest('td');  
    cell.innerText = input.value;  
  });  
  
  toggleButtonVisibility(row, false);  
}  

// ... (Previous refactoring parts)  
  
function toggleButtonVisibility(row, editing) {  
  const editButton = row.querySelector('.edit-ce-button');  
  const updateButton = row.querySelector('.update-ce-button');  
  const cancelButton = row.querySelector('.cancel-ce-button');  
  const deleteButton = row.querySelector('.delete-ce-button');  
  
  if (editing) {  
    editButton.classList.add('d-none');  
    deleteButton.classList.add('d-none');  
    updateButton.classList.remove('d-none');  
    cancelButton.classList.remove('d-none');  
  } else {  
    editButton.classList.remove('d-none');  
    deleteButton.classList.remove('d-none');  
    updateButton.classList.add('d-none');  
    cancelButton.classList.add('d-none');  
  }  
}  
  
function updateCOS(row, cosId) {  
  const contentInput = row.querySelector('.ce-content-cell-input').value;  
  const statusSelect = row.querySelector('.ce-status-input');  
  const statusInput = statusSelect.value;  
  
  fetch(`/update_cos/${cosId}`, {  
    method: 'POST',  
    headers: { 'Content-Type': 'application/json' },  
    body: JSON.stringify({ content: contentInput, status: statusInput }),  
  })  
  .then(handleResponse)  
  .then(data => {  
    if (data.cos) {  
      row.querySelector('.ce-content-cell').innerText = data.cos.content;  
      row.querySelector('.status-cell').innerText = data.cos.status;  
      toggleButtonVisibility(row, false);  
    } else {  
      console.error('Error updating COS:', data.error);  
    }  
  })  
  .catch(error => console.error('Error:', error));  
}  
  
function handleResponse(response) {  
  if (!response.ok) {  
    throw new Error('Network response was not ok');  
  }  
  return response.json();  
}  
  
function cancelEditMode(row) {  
  // Revert to original text values from input fields  
  row.querySelectorAll('.form-control').forEach(input => {  
    const cell = input.closest('td');  
    cell.innerText = input.value;  
  });  
  
  toggleButtonVisibility(row, false);  
}  
  
function deleteCOS(cosId, row) {  
  fetch(`/delete_cos/${cosId}`, {  
    method: 'POST',  
    headers: {  
      'Content-Type': 'application/json',  
    },  
  })  
  .then(response => response.json())  
  .then(data => {  
    if (data.success) {  
      row.remove();  
    } else {  
      console.error('Error deleting COS:', data.error);  
    }  
  })  
  .catch(error => console.error('Error:', error));  
}  

function analyzeCOS(cosId) {  
  fetch(`/analyze_cos/${cosId}`)  
  .then(response => response.json())  
  .then(data => {  
    if (data.analyzed_cos) {  
      // Logic to display the analysis results  
      // This could include updating the DOM with new elements or showing a modal with the results  
      console.log('Analyzed COS:', data.analyzed_cos);  
    } else {  
      console.error('No analyzed data returned for COS', data.error);  
    }  
  })  
  .catch(error => console.error('Error:', error));  
}    
  
function showCEModal(ceData) {  
  // Create or update the modal content  
  let modal = document.getElementById('ceModal');  
  if (!modal) {  
    modal = document.createElement('div');  
    modal.id = 'ceModal';  
    document.body.appendChild(modal);  
  }  
  
  modal.innerHTML = createCEModalContent(ceData);  
  $('#ceModal').modal('show');  
}  q
  
function createCEModalContent(ceData) {  
  return `  
    <div class="modal-dialog modal-dialog-centered" role="document">  
      <div class="modal-content">  
        <div class="modal-header">  
          <h5 class="modal-title" id="ceModalLabel">Conditional Element Details</h5>  
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">  
            <span aria-hidden="true">&times;</span>  
          </button>  
        </div>  
        <div class="modal-body">  
          <h2>${ceData.content}</h2>  
          <p>CE Type: ${ceData.ce_type}</p>  
        </div>  
      </div>  
    </div>  
  `;  
}   
function toggleButtonVisibility(row, editing) {  
  const editButton = row.querySelector('.edit-ce-button');  
  const updateButton = row.querySelector('.update-ce-button');  
  const cancelButton = row.querySelector('.cancel-ce-button');  
  const deleteButton = row.querySelector('.delete-ce-button');  
  
  if (editing) {  
    editButton.classList.add('d-none');  
    deleteButton.classList.add('d-none');  
    updateButton.classList.remove('d-none');  
    cancelButton.classList.remove('d-none');  
  } else {  
    editButton.classList.remove('d-none');  
    deleteButton.classList.remove('d-none');  
    updateButton.classList.add('d-none');  
    cancelButton.classList.add('d-none');  
  }  
}  
  
function updateCOS(row, cosId) {  
  const contentInput = row.querySelector('.ce-content-cell-input').value;  
  const statusSelect = row.querySelector('.ce-status-input');  
  const statusInput = statusSelect.value;  
  
  fetch(`/update_cos/${cosId}`, {  
    method: 'POST',  
    headers: { 'Content-Type': 'application/json' },  
    body: JSON.stringify({ content: contentInput, status: statusInput }),  
  })  
  .then(handleResponse)  
  .then(data => {  
    if (data.cos) {  
      row.querySelector('.ce-content-cell').innerText = data.cos.content;  
      row.querySelector('.status-cell').innerText = data.cos.status;  
      toggleButtonVisibility(row, false);  
    } else {  
      console.error('Error updating COS:', data.error);  
    }  
  })  
  .catch(error => console.error('Error:', error));  
}  
  
function handleResponse(response) {  
  if (!response.ok) {  
    throw new Error('Network response was not ok');  
  }  
  return response.json();  
}  
  
function cancelEditMode(row) {  
  // Revert to original text values from input fields  
  row.querySelectorAll('.form-control').forEach(input => {  
    const cell = input.closest('td');  
    cell.innerText = input.value;  
  });  
  
  toggleButtonVisibility(row, false);  
}  
   
function showCEModal(ceData) {  
  // Create or update the modal content  
  let modal = document.getElementById('ceModal');  
  if (!modal) {  
    modal = document.createElement('div');  
    modal.id = 'ceModal';  
    document.body.appendChild(modal);  
  }  
  
  modal.innerHTML = createCEModalContent(ceData);  
  $('#ceModal').modal('show');  
}  
  
function createCEModalContent(ceData) {  
  return `  
    <div class="modal-dialog modal-dialog-centered" role="document">  
      <div class="modal-content">  
        <div class="modal-header">  
          <h5 class="modal-title" id="ceModalLabel">Conditional Element Details</h5>  
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">  
            <span aria-hidden="true">&times;</span>  
          </button>  
        </div>  
        <div class="modal-body">  
          <h2>${ceData.content}</h2>  
          <p>CE Type: ${ceData.ce_type}</p>  
        </div>  
      </div>  
    </div>  
  `;  
}  
  
// Function to handle the click event on CE pills
function handleCEPillClick(event) {
  const ceId = event.target.dataset.ceId;

  fetch(`/get_ce_by_id/${ceId}`)
    .then(response => response.json())
    .then(data => showCEModal(data.ce))
    .catch(error => console.error('Error fetching CE details:', error));
}

// Function to reset buttons to their default state after an update or cancel
function resetEditButtons(row) {
  const editButton = row.querySelector('.edit-ce-button');
  const updateButton = row.querySelector('.update-ce-button');
  const cancelButton = row.querySelector('.cancel-ce-button');

  if (editButton && updateButton && cancelButton) {
    editButton.classList.remove('d-none');
    updateButton.classList.add('d-none');
    cancelButton.classList.add('d-none');
  }
}

// Function to handle the update button click for CE
function handleCEUpdateButtonClick(event) {
  const row = event.target.closest('tr');
  const ceId = row.dataset.ceId;
  const contentInput = row.querySelector('.ce-content-input');
  const statusDropdown = row.querySelector('.ce-status-dropdown');
  const accountablePartyInput = row.querySelector('.ce-accountable-party-input');
  const completionDateInput = row.querySelector('.ce-completion-date-input');

  const ceData = {
    content: contentInput.value,
    status: statusDropdown.value,
    accountable_party: accountablePartyInput.value,
    completion_date: completionDateInput.value
  };

  fetch(`/update_cos/${ceId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(ceData),
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      // Update the CE row with the new values
      row.querySelector('.ce-content-cell').textContent = contentInput.value;
      row.querySelector('.ce-status-cell').textContent = statusDropdown.options[statusDropdown.selectedIndex].text;
      row.querySelector('.ce-accountable-party-cell').textContent = accountablePartyInput.value;
      row.querySelector('.ce-completion-date-cell').textContent = completionDateInput.value;

      // Reset buttons to default state
      resetEditButtons(row);
    } else {
      console.error('Error updating CE:', data.error);
    }
  })
  .catch(error => {
    console.error('Error:', error);
  });
}

// Append the modal to the body  
  let ceData = {/* ... */}; // The CE data to display in the modal
  let modalHTML = createCEModalContent(ceData);
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  
  // Use Bootstrap's modal functionality to show the modal  
  $('#ceModal').modal('show');  
  

  document.addEventListener('DOMContentLoaded', () => {    
    const phaseTables = document.querySelectorAll('.phase-table');    
    
    phaseTables.forEach(table => {    
      table.addEventListener('click', handlePhaseTableClick);    
    });    
  });   
    
  function handlePhaseTableClick(event) {    
    const target = event.target;    
    const row = target.closest('tr');    
    const cosId = row.dataset.cosId;    
    
    if (target.matches('.edit-ce-button')) {    
      turnRowToEditMode(row);    
    } else if (target.matches('.update-ce-button')) {    
      updateCOS(row, cosId);    
    } else if (target.matches('.cancel-ce-button')) {    
      cancelEditMode(row);    
    } else if (target.matches('.delete-ce-button')) {    
      if (confirm('Are you sure you want to delete this Condition of Satisfaction?')) {  
        deleteCOS(cosId, row);    
      }  
    } else if (target.matches('.analyze-ce-button')) {    
      analyzeCOS(cosId);    
    }    
  }   

function handlePhaseTableClick(event) {  
  // This function will delegate click events within the phase table to appropriate handlers.  
  const target = event.target;  
  const row = target.closest('tr');  
  const ceId = row ? row.dataset.ceId : null;  
  
  if (target.matches('.edit-ce-button')) {  
    turnRowToEditMode(row);  
  } else if (target.matches('.update-ce-button')) {  
    updateCOS(row, ceId);  
  } else if (target.matches('.cancel-ce-button')) {  
    cancelEditMode(row);  
  } else if (target.matches('.delete-ce-button')) {  
    deleteCOS(ceId, row);  
  } else if (target.matches('.analyze-ce-button')) {  
    analyzeCOS(ceId);  
  }  
}  