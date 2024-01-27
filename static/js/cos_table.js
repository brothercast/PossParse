document.addEventListener('DOMContentLoaded', () => {
  const phaseTables = document.querySelectorAll('.phase-table');
  phaseTables.forEach(table => {
    table.addEventListener('click', handlePhaseTableClick);
  });
});

function handlePhaseTableClick(event) {  
  const target = event.target;  
  const row = target.closest('tr');  
  if (!row) {  
    console.log('Click event occurred outside of a table row.');  
    return;  
  }  
  
  // Retrieve the SSOL ID from a data attribute on the table or another parent element  
  const ssolId = row.closest('[data-ssol-id]').dataset.ssolId;  
  
  const cosId = row.dataset.ceId;  
  
  if (target.matches('.edit-ce-button')) {  
    console.log(`Entering edit mode for COS ID: ${cosId}`);  
    toggleEditMode(row, true);  
    turnRowToEditMode(row);  
  } else if (target.matches('.update-ce-button')) {  
    console.log(`Updating COS ID: ${cosId}`);  
    handleUpdate(row, cosId, ssolId); // Pass the SSOL ID to the update handler  
  } else if (target.matches('.cancel-ce-button')) {  
    console.log(`Cancelling edit mode for COS ID: ${cosId}`);  
    cancelEditMode(row);  
  } else if (target.matches('.delete-ce-button')) {  
    console.log(`Deleting COS ID: ${cosId}`);  
    deleteCOS(cosId, row);  
  }  
}  


function toggleEditMode(row, editing) {
  const editButton = row.querySelector('.edit-ce-button');
  const updateButton = row.querySelector('.update-ce-button');
  const cancelButton = row.querySelector('.cancel-ce-button');

  if (editing) {
    console.log('Toggling edit mode on.');
    row.dataset.editing = "true";
    row.classList.add('editing');
    editButton.classList.add('d-none');
    updateButton.classList.remove('d-none');
    cancelButton.classList.remove('d-none');
  } else {
    console.log('Toggling edit mode off.');
    row.dataset.editing = "false";
    row.classList.remove('editing');
    editButton.classList.remove('d-none');
    updateButton.classList.add('d-none');
    cancelButton.classList.add('d-none');
  }
}

function turnRowToEditMode(row) {
  storeOriginalValues(row);
  const currentStatus = row.querySelector('.status-cell span').textContent.trim() || 'Proposed';
  const currentContent = row.querySelector('.ce-content-cell').textContent.trim() || '';
  const currentAccountableParty = row.querySelector('.ce-accountable-party-cell').textContent.trim() || '';
  const currentCompletionDate = row.querySelector('.ce-completion-date-cell').textContent.trim() || '';

  console.log(`Turning row to edit mode with current values: Status: ${currentStatus}, Content: ${currentContent}, Accountable Party: ${currentAccountableParty}, Completion Date: ${currentCompletionDate}`);

  row.querySelector('.status-cell').innerHTML = createStatusDropdown(currentStatus);
  row.querySelector('.ce-content-cell').innerHTML = `<input type="text" class="form-control form-control-sm" value="${currentContent}">`;
  row.querySelector('.ce-accountable-party-cell').innerHTML = `<input type="text" class="form-control form-control-sm" value="${currentAccountableParty}">`;
  row.querySelector('.ce-completion-date-cell').innerHTML = `<input type="date" class="form-control form-control-sm" value="${currentCompletionDate}">`;
}

function handleUpdate(row, cosId, ssolId) {
  // Retrieve values from the form inputs
  const contentInput = row.querySelector('.ce-content-cell input').value;
  const statusSelect = row.querySelector('.status-cell select');
  const statusInput = statusSelect.options[statusSelect.selectedIndex].value;
  const accountablePartyInput = row.querySelector('.ce-accountable-party-cell input').value;
  const completionDateInput = row.querySelector('.ce-completion-date-cell input').value;

  // Check if the ssolId is valid
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

function cancelEditMode(row) {
  console.log(`Cancelling edit mode for row:`, row);
  revertToOriginalValues(row);
  toggleEditMode(row, false);
}

function createStatusDropdown(selectedStatus) {
  const statuses = ['Proposed', 'In Progress', 'Completed', 'Rejected'];
  return `<select class="form-select form-select-sm">${statuses.map(status => `<option value="${status}" ${selectedStatus === status ? 'selected' : ''}>${status}</option>`).join('')}</select>`;
}

function deleteCOS(cosId, row) {
  console.log(`Sending delete request for COS ID: ${cosId}`);

  fetch(`/delete_cos/${cosId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cos_id: cosId })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`Network response was not ok for COS ID: ${cosId}`);
    }
    return response.json();
  })
  .then(data => {
    if (data.success) {
      console.log(`COS ID: ${cosId} deleted successfully.`);
      row.remove();
    } else {
      console.error(`Error deleting COS ID: ${cosId}:`, data.error);
    }
  })
  .catch(error => {
    console.error(`Error deleting COS ID: ${cosId}:`, error);
  });
}

function storeOriginalValues(row) {
  const cellsToStore = ['status-cell', 'ce-content-cell', 'ce-accountable-party-cell', 'ce-completion-date-cell'];
  row.dataset.originalValues = JSON.stringify(
    cellsToStore.reduce((values, cellClass) => {
      const cell = row.querySelector(`.${cellClass}`);
      if (cell) {
        values[cellClass] = cell.textContent.trim();
      } else {
        console.error(`Cell with class ${cellClass} not found in the row.`);
      }
      return values;
    }, {})
  );
}

function revertToOriginalValues(row) {
  const originalValues = JSON.parse(row.dataset.originalValues);
  for (const [cellClass, value] of Object.entries(originalValues)) {
    const cell = row.querySelector(`.${cellClass}`);
    cell.textContent = value;
  }
}

function updateRowWithNewValues(row, cos) {
  if (!cos || Object.keys(cos).length === 0) {
    console.error('No COS data provided to update the row.');
    return;
  }

  // Update the row with the new values from the COS object
  row.querySelector('.status-cell').innerHTML = `<span class="badge ${getBadgeClassFromStatus(cos.status)} status-pill">${cos.status}</span>`;
  row.querySelector('.ce-content-cell').textContent = cos.content;
  row.querySelector('.ce-accountable-party-cell').textContent = cos.accountable_party;
  row.querySelector('.ce-completion-date-cell').textContent = cos.completion_date;
}

function getBadgeClassFromStatus(status) {
  switch (status) {
    case 'Proposed': return 'badge-secondary';
    case 'In Progress': return 'badge-warning';
    case 'Completed': return 'badge-success';
    case 'Rejected': return 'badge-danger';
    default: return 'badge-secondary';
  }
}
