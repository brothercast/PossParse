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
  storeOriginalValues(row);  
  
  const statusCell = row.querySelector('.status-cell');  
  const contentCell = row.querySelector('.cos-content-cell');  
  const accountablePartyCell = row.querySelector('.cos-accountable-party-cell');  
  const completionDateCell = row.querySelector('.cos-completion-date-cell');  
  
  const currentStatus = statusCell.textContent.trim();  
  const currentContent = contentCell.textContent.trim();  
  const currentAccountableParty = accountablePartyCell.textContent.trim();  
  const currentCompletionDate = completionDateCell.textContent.trim();  
  
  statusCell.innerHTML = createStatusDropdown(currentStatus);  
  contentCell.innerHTML = `<input type="text" class="form-control form-control-sm" value="${currentContent}">`;  
  accountablePartyCell.innerHTML = `<input type="text" class="form-control form-control-sm" value="${currentAccountableParty}">`;  
  completionDateCell.innerHTML = `<input type="date" class="form-control form-control-sm" value="${currentCompletionDate}">`;  
  
  toggleEditMode(row, true);  
}  
  
function handleUpdate(row, cosId, ssolId) {  
  const contentInput = row.querySelector('.cos-content-cell input').value;  
  const statusSelect = row.querySelector('.status-cell select');  
  const statusInput = statusSelect.options[statusSelect.selectedIndex].value;  
  const accountablePartyInput = row.querySelector('.cos-accountable-party-cell input').value;  
  const completionDateInput = row.querySelector('.cos-completion-date-cell input').value;  
  
  const payload = {  
    content: contentInput,  
    status: statusInput,  
    accountable_party: accountablePartyInput,  
    completion_date: completionDateInput,  
    ssol_id: ssolId  
  };  
  
  console.log(`Sending update for COS ID: ${cosId}`, payload); // Added log  
  
  fetch(`/update_cos/${cosId}`, {  
    method: 'PUT',  
    headers: {  
      'Content-Type': 'application/json',  
      'Accept': 'application/json',  
      'X-Requested-With': 'XMLHttpRequest'  
    },  
    body: JSON.stringify(payload)  
  })  
  .then(response => {  
    if (!response.ok) {  
      return response.json().then(errorData => {  
        throw new Error(`Server responded with ${response.status}: ${JSON.stringify(errorData)}`);  
      });  
    }  
    return response.json();  
  })  
  .then(data => {  
    console.log(`Received response for COS ID: ${cosId}`, data); // Added log  
    if (data.success) {  
      console.log(`Updating row with new values for COS ID: ${cosId}`); // Added log  
      updateRowWithNewValues(row, data.cos);  
      toggleEditMode(row, false);  
    } else {  
      throw new Error(data.error || 'An error occurred while updating the entry.');  
    }  
  })  
  .catch(error => {  
    console.error(`Error updating COS ID: ${cosId}:`, error); // Updated log  
    alert(`An error occurred while updating the entry: ${error.message}`);  
  });  
}  
  
function createStatusDropdown(selectedStatus) {  
  const statuses = ['Proposed', 'In Progress', 'Completed', 'Rejected'];  
  return `<select class="form-select form-select-sm">${statuses.map(status => `<option value="${status}"${status === selectedStatus ? ' selected' : ''}>${status}</option>`).join('')}</select>`;  
}  
  
function cancelEditMode(row) {  
  revertToOriginalValues(row);  
  toggleEditMode(row, false);  
}  
  
function deleteCOS(cosId, row) {  
  fetch(`/delete_cos/${cosId}`, {  
    method: 'DELETE', // Corrected to use DELETE method  
    headers: {  
      'Content-Type': 'application/json',  
      'Accept': 'application/json'  
    }  
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
    status: statusCell.textContent.trim(),  
    content: contentCell.textContent.trim(),  
    accountableParty: accountablePartyCell.textContent.trim(),  
    completionDate: completionDateCell.textContent.trim()  
  });  
}  
  
function revertToOriginalValues(row) {  
  const originalValues = JSON.parse(row.dataset.originalValues);  
  row.querySelector('.status-cell').innerHTML = `<span class="badge badge-pill ${getBadgeClassFromStatus(originalValues.status)}">${originalValues.status}</span>`;  
  row.querySelector('.cos-content-cell').textContent = originalValues.content;  
  row.querySelector('.cos-accountable-party-cell').textContent = originalValues.accountableParty;  
  row.querySelector('.cos-completion-date-cell').textContent = originalValues.completionDate;  
}  
  
function updateRowWithNewValues(row, cos) {  
  // Check if the cos object and its properties are defined  
  if (cos && cos.status && cos.content) {  
    row.querySelector('.status-cell').innerHTML = `<span class="badge badge-pill ${getBadgeClassFromStatus(cos.status)}">${cos.status}</span>`;  
    row.querySelector('.cos-content-cell').textContent = cos.content;  
    row.querySelector('.cos-accountable-party-cell').textContent = cos.accountable_party || '';  
    row.querySelector('.cos-completion-date-cell').textContent = cos.completion_date || '';  
  } else {  
    // If cos or any required property is undefined, log an error or handle appropriately  
    console.error('Error: COS data is undefined or missing required properties', cos);  
    alert('An error occurred while updating the entry. Please try again.');  
  }  
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
