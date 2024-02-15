document.addEventListener('DOMContentLoaded', () => {  
  const phaseTables = document.querySelectorAll('.phase-table');  
  phaseTables.forEach(table => {  
    table.addEventListener('click', handlePhaseTableClick);  
  });  
});  
  
function handlePhaseTableClick(event) {  
  const target = event.target;  
  const row = target.closest('tr.cos-row');  
  if (!row) return;  
  
  const ssolId = row.closest('.accordion-body').dataset.ssolId;  
  const cosId = row.dataset.cosId;  
  
  if (target.matches('.edit-cos-button')) {  
    turnRowToEditMode(row);  
  } else if (target.matches('.update-cos-button')) {  
    handleUpdate(row, cosId, ssolId);  
  } else if (target.matches('.cancel-cos-button')) {  
    cancelEditMode(row);   
  } else if (target.matches('.delete-cos-button')) {  
    deleteCOS(cosId, row);  
  }  
} 
  
function toggleEditMode(row, editing) {  
  const editButton = row.querySelector('.edit-cos-button');  
  const updateButton = row.querySelector('.update-cos-button');  
  const cancelButton = row.querySelector('.cancel-cos-button');  
    
  if (editing) {  
    editButton.classList.add('d-none');  
    updateButton.classList.remove('d-none');  
    cancelButton.classList.remove('d-none');  
  } else {  
    editButton.classList.remove('d-none');  
    updateButton.classList.add('d-none');  
    cancelButton.classList.add('d-none');  
  }  
}   
  
function turnRowToEditMode(row) {  
  // Store the original values of the row to enable cancellation  
  storeOriginalValues(row);  
  
  // Get the current status from the badge in the cell, if it exists  
  const statusBadge = row.querySelector('.status-cell .badge');  
  const currentStatus = statusBadge ? statusBadge.textContent.trim() : '';  
  
  // The content cell contains the COS content that needs to be replaced with an input field  
  const contentCell = row.querySelector('.cos-content-cell');  
  const currentContent = contentCell ? contentCell.textContent.trim() : '';  
  
  // The accountable party cell contains the name of the party that needs to be replaced with an input field  
  const accountablePartyCell = row.querySelector('.cos-accountable-party-cell');  
  const currentAccountableParty = accountablePartyCell ? accountablePartyCell.textContent.trim() : '';  
  
  // The completion date cell contains the date that needs to be replaced with a date input field  
  const completionDateCell = row.querySelector('.cos-completion-date-cell');  
  const currentCompletionDate = completionDateCell ? completionDateCell.textContent.trim() : '';  
  
  // Replace the entire content of the status cell with a dropdown  
  const statusCell = row.querySelector('.status-cell');  
  if (statusCell) {  
    statusCell.innerHTML = createStatusDropdown(currentStatus);  
  }  
  
  // Replace the content of the COS cell with an input field for editing  
  if (contentCell) {  
    contentCell.innerHTML = `<input type="text" class="form-control form-control-sm" value="${currentContent}">`;  
  }  
  
  // Replace the content of the accountable party cell with an input field for editing  
  if (accountablePartyCell) {  
    accountablePartyCell.innerHTML = `<input type="text" class="form-control form-control-sm" value="${currentAccountableParty}">`;  
  }  
  
  // Replace the content of the completion date cell with a date input for editing  
  if (completionDateCell) {  
    completionDateCell.innerHTML = `<input type="date" class="form-control form-control-sm" value="${currentCompletionDate}">`;  
  }  
  
  // Change the row to edit mode by toggling the visibility of buttons  
  toggleEditMode(row, true);  
}  

  
function handleUpdate(row, cosId, ssolId) {  
  // Retrieve values from the form inputs  
  const contentInput = row.querySelector('.cos-content-cell input').value;  
  const statusSelect = row.querySelector('.status-cell select');  
  const statusInput = statusSelect.options[statusSelect.selectedIndex].value;  
  const accountablePartyInput = row.querySelector('.cos-accountable-party-cell input').value;  
  const completionDateInput = row.querySelector('.cos-completion-date-cell input').value;  
  
  // Check if the cosId and ssolId are valid  
  if (!cosId) {  
    console.error('COS ID is missing or invalid.');  
    alert('COS ID is missing or invalid. Please try again.');  
    return;  
  }  
  if (!ssolId) {  
    console.error('SSOL ID is missing or invalid.');  
    alert('SSOL ID is missing or invalid. Please try again.');  
    return;  
  }  
  
  // Create the payload with the updated COS data  
  const payload = {  
    content: contentInput,  
    status: statusInput,  
    accountable_party: accountablePartyInput,  
    completion_date: completionDateInput,  
    ssol_id: ssolId  
  };  
  
  // Send the POST request to the server with the updated data  
  fetch(`/update_cos/${cosId}`, {  
    method: 'POST',  
    headers: {  
      'Content-Type': 'application/json',  
      'Accept': 'application/json',  
      'X-Requested-With': 'XMLHttpRequest'  
    },  
    body: JSON.stringify(payload)  
  })  
  .then(response => {  
    if (!response.ok) {  
      // If the server responds with an error, throw it to be caught in the catch block  
      return response.json().then(errorData => {  
        throw new Error(`Server responded with ${response.status}: ${JSON.stringify(errorData)}`);  
      });  
    }  
    return response.json();  
  })  
  .then(data => {  
    if (data.success) {  
      // Update the table row with the new values  
      updateRowWithNewValues(row, data.cos);  
      // Exit edit mode  
      toggleEditMode(row, false);  
    } else {  
      // If the server indicates failure, alert the user  
      throw new Error(data.error || 'An error occurred while updating the entry.');  
    }  
  })  
  .catch(error => {  
    // Log the error and alert the user  
    console.error('Error updating COS:', error);  
    alert(`An error occurred while updating the entry: ${error.message}`);  
  });  
}  

  
function createStatusDropdown(selectedStatus) {  
  const statuses = ['Proposed', 'In Progress', 'Completed', 'Rejected'];  
  let optionsHTML = statuses.map(status =>  
    `<option value="${status}"${status === selectedStatus ? ' selected' : ''}>${status}</option>`  
  ).join('');  
  
  return `<select class="form-select form-select-sm">${optionsHTML}</select>`;  
}  
  
  
function deleteCOS(cosId, row) {  
  fetch(`/delete_cos/${cosId}`, {  
    method: 'POST',  
    headers: {  
      'Content-Type': 'application/json',  
      'Accept': 'application/json'  
    },  
    body: JSON.stringify({ cos_id: cosId })  
  })  
  .then(response => response.json())  
  .then(data => {  
    if (data.success) {  
      row.remove();  
    } else {  
      console.error('Error deleting COS:', data.error);  
    }  
  })  
  .catch(error => {  
    console.error('Error deleting COS:', error);  
  });  
}  
  
function storeOriginalValues(row) {  
  const statusCell = row.querySelector('.status-cell');  
  const contentCell = row.querySelector('.cos-content-cell');  
  const accountablePartyCell = row.querySelector('.cos-accountable-party-cell');  
  const completionDateCell = row.querySelector('.cos-completion-date-cell');  
    
  row.dataset.originalValues = JSON.stringify({  
    status: statusCell.innerHTML,  
    content: contentCell.innerHTML,  
    accountableParty: accountablePartyCell.innerHTML,  
    completionDate: completionDateCell.innerHTML  
  });  
}  
  
function revertToOriginalValues(row) {  
  const originalValues = JSON.parse(row.dataset.originalValues);  
  for (const cellClass in originalValues) {  
    const cell = row.querySelector(`.${cellClass}`);  
    if (cellClass === 'status-cell') {  
      cell.innerHTML = `<span class="badge badge-pill ${getBadgeClassFromStatus(originalValues[cellClass])}">${originalValues[cellClass]}</span>`;  
    } else {  
      cell.textContent = originalValues[cellClass];  
    }  
  }  
}  
  
function updateRowWithNewValues(row, cos) {  
  row.querySelector('.status-cell').innerHTML = `<span class="badge badge-pill ${getBadgeClassFromStatus(cos.status)}">${cos.status}</span>`;  
  row.querySelector('.cos-content-cell').textContent = cos.content;  
  row.querySelector('.cos-accountable-party-cell').textContent = cos.accountable_party || '';  
  row.querySelector('.cos-completion-date-cell').textContent = cos.completion_date || '';  
}  
  
function getBadgeClassFromStatus(status) {    
  switch (status) {    
    case 'Proposed': return 'bg-secondary';    
    case 'In Progress': return 'bg-warning';    
    case 'Completed': return 'bg-success';    
    case 'Rejected': return 'bg-danger';    
    default: return 'bg-secondary';    
  }    
}  

