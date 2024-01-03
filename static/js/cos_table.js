document.addEventListener('DOMContentLoaded', () => {
  const phaseTables = document.querySelectorAll('.phase-table');
  phaseTables.forEach(table => {
    table.addEventListener('click', handlePhaseTableClick);
  });
});

function handlePhaseTableClick(event) {  
  const target = event.target;  
  const row = target.closest('tr');  
  if (!row) return;

  if (target.matches('.edit-ce-button')) {
    toggleEditMode(row, true);
    turnRowToEditMode(row);
  } else if (target.matches('.update-ce-button')) {
    const cosId = row.dataset.ceId;
    updateCOS(row, cosId);
  } else if (target.matches('.cancel-ce-button')) {
    toggleEditMode(row, false);
    revertRowFromEditMode(row);
  } else if (target.matches('.delete-ce-button')) {
    const cosId = row.dataset.ceId;
    deleteCOS(cosId, row);
  } else if (target.matches('.analyze-ce-button')) {
    const cosId = row.dataset.ceId;
    analyzeCOS(cosId);
  }
}

function toggleEditMode(row, editing) {
  if (editing) {
    row.dataset.editing = "true";
    row.classList.add('editing');
  } else {
    row.dataset.editing = "false";
    row.classList.remove('editing');
  }
}

function turnRowToEditMode(row) {
  if (!row) {
    console.error('The provided row is null or undefined.');
    return;
  }

  // Retrieve the current values and elements
  const statusSpan = row.querySelector('.status-cell span');
  const contentCell = row.querySelector('.ce-content-cell');
  const accountablePartyCell = row.querySelector('.ce-accountable-party-cell');
  const completionDateCell = row.querySelector('.ce-completion-date-cell');

  // Check if all elements are present
  if (!statusSpan) {
    console.error('The status span is missing in the row.');
    return;
  }
  if (!contentCell) {
    console.error('The content cell is missing in the row.');
    return;
  }
  if (!accountablePartyCell) {
    console.error('The accountable party cell is missing in the row.');
    return;
  }
  if (!completionDateCell) {
    console.error('The completion date cell is missing in the row.');
    return;
  }

  // Store the current non-editable values
  storeOriginalValues(row);

  // Retrieve the current values or use default empty values
  const currentStatus = statusSpan.textContent.trim() || 'Proposed';
  const currentContent = contentCell.textContent.trim() || '';
  const currentAccountableParty = accountablePartyCell.textContent.trim() || '';
  const currentCompletionDate = completionDateCell.textContent.trim() || '';

  // Replace the current values with input fields
  row.querySelector('.status-cell').innerHTML = createStatusDropdown(currentStatus);
  contentCell.innerHTML = `<input type="text" class="form-control form-control-sm" value="${currentContent}">`;
  accountablePartyCell.innerHTML = `<input type="text" class="form-control form-control-sm" value="${currentAccountableParty}">`;
  completionDateCell.innerHTML = `<input type="date" class="form-control form-control-sm" value="${currentCompletionDate}">`;

  // Change button visibility
  toggleButtonVisibility(row, true);
}

function handleUpdate(row) {
  // Retrieve input values from the row
  const cosId = row.dataset.ceId;
  const contentInput = row.querySelector('.ce-content-cell input').value;
  const statusSelect = row.querySelector('.status-cell select');
  const statusInput = statusSelect.options[statusSelect.selectedIndex].value;
  const accountablePartyInput = row.querySelector('.ce-accountable-party-cell input').value;
  const completionDateInput = row.querySelector('.ce-completion-date-cell input').value;

  // AJAX request to update the COS entry on the server
  fetch(`/update_cos/${cosId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      cos_id: cosId,
      content: contentInput,
      status: statusInput,
      accountable_party: accountablePartyInput,
      completion_date: completionDateInput
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.text();
  })
  .then(text => {
    try {
      const data = JSON.parse(text);
      // Handle the response data
    } catch (error) {
      console.error('The response was not valid JSON:', text);
    }
  })
  .catch(error => {
    console.error('Error:', error);
  });
}

function cancelEditMode(row) {
  // Revert to original values from stored data
  revertToOriginalValues(row);
  toggleButtonVisibility(row, false);
}

function createStatusDropdown(selectedStatus) {
  const statuses = ['Proposed', 'In Progress', 'Completed', 'Rejected'];
  return `
    <select class="form-select form-select-sm">
      ${statuses.map(status => `<option value="${status}" ${selectedStatus === status ? 'selected' : ''}>${status}</option>`).join('')}
    </select>`;
}

function toggleButtonVisibility(row, editing) {
  const editButton = row.querySelector('.edit-ce-button');
  const updateButton = row.querySelector('.update-ce-button');
  const cancelButton = row.querySelector('.cancel-ce-button');

  if (editButton && updateButton && cancelButton) {
    if (editing) {
      editButton.classList.add('d-none');
      updateButton.classList.remove('d-none');
      cancelButton.classList.remove('d-none');
    } else {
      editButton.classList.remove('d-none');
      updateButton.classList.add('d-none');
      cancelButton.classList.add('d-none');
    }
  } else {
    console.error('One or more buttons are missing in the row.');
  }
}

function deleteCOS(cosId, row) {
  fetch(`/delete_cos/${cosId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cos_id: cosId }) // Ensure the body contains the correct data
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  })
  .then(data => {
    if (data.success) {
      row.remove();
    } else {
      console.error('Error deleting COS:', data.error);
    }
  })
  .catch(error => console.error('Error:', error));
}


function storeOriginalValues(row) {
  const cellsToStore = ['status-cell', 'ce-content-cell', 'ce-accountable-party-cell', 'ce-completion-date-cell'];
  row.dataset.originalValues = JSON.stringify(
    cellsToStore.reduce((values, cellClass) => {
      const cell = row.querySelector(`.${cellClass}`);
      // Add a check to ensure the cell is not null
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

function revertRowFromEditMode(row) {
  const originalValues = JSON.parse(row.dataset.originalValues);
  row.querySelector('.status-cell').innerHTML = `<span class="badge ${getBadgeClassFromStatus(originalValues['status-cell'])} status-pill">${originalValues['status-cell']}</span>`;
  row.querySelector('.ce-content-cell').textContent = originalValues['ce-content-cell'];
  row.querySelector('.ce-accountable-party-cell').textContent = originalValues['ce-accountable-party-cell'];
  row.querySelector('.ce-completion-date-cell').textContent = originalValues['ce-completion-date-cell'];
}

document.addEventListener('DOMContentLoaded', () => {  
  const phaseTables = document.querySelectorAll('.phase-table');  
  phaseTables.forEach(table => {  
    table.addEventListener('click', handlePhaseTableClick);  
  });  
  
  const cePills = document.querySelectorAll('.ce-pill-button');  
  cePills.forEach(pill => {  
    pill.addEventListener('click', handleCEPillClick);  
  });  
});  
  
document.addEventListener('DOMContentLoaded', () => {  
  const phaseTables = document.querySelectorAll('.phase-table');  
  phaseTables.forEach(table => {  
    table.addEventListener('click', handlePhaseTableClick);  
  });  
});  
  
function handlePhaseTableClick(event) {  
  const target = event.target;  
  // Ensure that you're getting the closest 'tr' element to the event target  
  const row = target.closest('tr');  
  if (!row) return; // If there's no row, exit the function
  
  if (target.matches('.edit-ce-button')) {  
    toggleEditMode(row, true);  
    turnRowToEditMode(row);  
  } else if (target.matches('.update-ce-button')) {  
    const cosId = row.dataset.ceId;  
    updateCOS(row, cosId);  
  } else if (target.matches('.cancel-ce-button')) {  
    toggleEditMode(row, false);  
    revertRowFromEditMode(row);  
  } else if (target.matches('.delete-ce-button')) {  
    const cosId = row.dataset.ceId;  
    deleteCOS(cosId, row);  
  }  
}  
  
function turnRowToEditMode(row) {
  if (!row) {
    console.error('The provided row is null or undefined.');
    return;
  }

  // Check if the row is already being edited
  if (row.dataset.editing === "true") {
    console.log('The row is already in edit mode.');
    return;
  }

  // Retrieve the current values and elements
  const statusSpan = row.querySelector('.status-cell span');
  const contentCell = row.querySelector('.ce-content-cell');
  const accountablePartyCell = row.querySelector('.ce-accountable-party-cell');
  const completionDateCell = row.querySelector('.ce-completion-date-cell');

  // Check if all elements are present and log specific errors if not
  if (!statusSpan) {
    console.error('The status span is missing in the row:', row);
    return;
  }
  if (!contentCell) {
    console.error('The content cell is missing in the row:', row);
    return;
  }
  if (!accountablePartyCell) {
    console.error('The accountable party cell is missing in the row:', row);
    return;
  }
  if (!completionDateCell) {
    console.error('The completion date cell is missing in the row:', row);
    return;
  }

  // Store the current non-editable values
  storeOriginalValues(row);

  // Retrieve the current values or use default empty values
  const currentStatus = statusSpan.textContent.trim() || 'Proposed';
  const currentContent = contentCell.textContent.trim() || '';
  const currentAccountableParty = accountablePartyCell.textContent.trim() || '';
  const currentCompletionDate = completionDateCell.textContent.trim() || '';

  // Replace the current values with input fields
  row.querySelector('.status-cell').innerHTML = createStatusDropdown(currentStatus);
  contentCell.innerHTML = `<input type="text" class="form-control form-control-sm" value="${currentContent}">`;
  accountablePartyCell.innerHTML = `<input type="text" class="form-control form-control-sm" value="${currentAccountableParty}">`;
  completionDateCell.innerHTML = `<input type="date" class="form-control form-control-sm" value="${currentCompletionDate}">`;

  // Change button visibility and set editing state
  toggleButtonVisibility(row, true);
  row.dataset.editing = "true";
}



    
function cancelEditMode(row) {
  revertToOriginalValues(row);
  toggleButtonVisibility(row, false);

  function showCEModal(ceData) {
    const modalContent = createCEModalContent(ceData);
    const modalElement = document.createElement('div');
    modalElement.innerHTML = modalContent;
    document.body.appendChild(modalElement);
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
  }

 // Define the updateCOS function to be used when the "Update" button is clicked
 function updateCOS(row, cosId) {
  // Retrieve input values from the row
  const contentInput = row.querySelector('.ce-content-cell input').value;
  const statusSelect = row.querySelector('.status-cell select');
  const statusInput = statusSelect.options[statusSelect.selectedIndex].value;
  const accountablePartyInput = row.querySelector('.ce-accountable-party-cell input').value;
  const completionDateInput = row.querySelector('.ce-completion-date-cell input').value;

  // AJAX request to update the COS entry on the server
  fetch(`/update_cos/${cosId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      cos_id: cosId,
      content: contentInput,
      status: statusInput,
      accountable_party: accountablePartyInput,
      completion_date: completionDateInput
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.cos) {
      // Update the row to display the new values
      updateRowWithNewValues(row, data.cos);
      toggleEditMode(row, false);
    } else {
      alert('An error occurred while updating the entry.');
    }
  })
  .catch(error => {
    console.error('Error:', error);
  });
}

// Helper function to update the row with new values from the server response
function updateRowWithNewValues(row, cos) {
  row.querySelector('.status-cell').innerHTML = `<span class="badge ${getBadgeClassFromStatus(cos.status)} status-pill">${cos.status}</span>`;
  row.querySelector('.ce-content-cell').textContent = cos.content;
  row.querySelector('.ce-accountable-party-cell').textContent = cos.accountable_party;
  row.querySelector('.ce-completion-date-cell').textContent = cos.completion_date;
}

// Helper function to get the appropriate badge class based on status
function getBadgeClassFromStatus(status) {
  switch (status) {
    case 'Proposed': return 'badge-secondary';
    case 'In Progress': return 'badge-warning';
    case 'Completed': return 'badge-success';
    case 'Rejected': return 'badge-danger';
    default: return 'badge-secondary';
  }
}

// Helper function to toggle button visibility
function toggleButtonVisibility(row, editing) {
  const editButton = row.querySelector('.edit-ce-button');
  const updateButton = row.querySelector('.update-ce-button');
  const cancelButton = row.querySelector('.cancel-ce-button');
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

  function createCEModalContent(ceData) {
    return `
    <div class="modal fade" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Conditional Element Details</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <h2>${ceData.content}</h2>
            <p>CE Type: ${ceData.ce_type}</p>
          </div>
        </div>
      </div>
    </div>
  `;
  }
  
  function handleCEPillClick(event) {
    const ceId = event.target.dataset.ceId;
    fetch(`/get_ce_by_id/${ceId}`)
      .then(response => response.json())
      .then(data => {
        if (data.ce) {
          showCEModal(data.ce);
        } else {
          console.error('Error fetching CE details:', data.error);
        }
      })
      .catch(error => console.error('Error:', error));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  
  // Event listener for the edit button
  document.querySelectorAll('.edit-ce-button').forEach(button => {
    button.addEventListener('click', function(event) {
      const row = event.target.closest('tr');
      turnRowToEditMode(row);
    });
  });

  // Event listener for the update button
  document.querySelectorAll('.update-ce-button').forEach(button => {
    button.addEventListener('click', function(event) {
      const row = event.target.closest('tr');
      // Call a function to handle the update logic
      handleUpdate(row);
    });
  });

  // Event listener for the cancel button
  document.querySelectorAll('.cancel-ce-button').forEach(button => {
    button.addEventListener('click', function(event) {
      const row = event.target.closest('tr');
      // Call a function to revert the changes and exit edit mode
      handleCancel(row);
    });
  });

});

function handleUpdate(row) {
  // Retrieve input values from the row
  const cosId = row.dataset.ceId;
  const contentInput = row.querySelector('.ce-content-cell input').value;
  const statusSelect = row.querySelector('.status-cell select');
  const statusInput = statusSelect.options[statusSelect.selectedIndex].value;
  const accountablePartyInput = row.querySelector('.ce-accountable-party-cell input').value;
  const completionDateInput = row.querySelector('.ce-completion-date-cell input').value;

  // AJAX request to update the COS entry on the server
  fetch(`/update_cos/${cosId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      content: contentInput,
      status: statusInput,
      accountable_party: accountablePartyInput,
      completion_date: completionDateInput
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      // Update the row to display the new values
      const badgeClass = getBadgeClassFromStatus(statusInput);
      row.querySelector('.status-cell').innerHTML = `<span class="badge ${badgeClass} rounded-pill">${statusInput}</span>`;
      row.querySelector('.ce-content-cell').textContent = contentInput;
      row.querySelector('.ce-accountable-party-cell').textContent = accountablePartyInput;
      row.querySelector('.ce-completion-date-cell').textContent = completionDateInput;

      // Toggle button visibility back to non-edit state
      toggleButtonVisibility(row, false);
    } else {
      alert('An error occurred while updating the entry.');
    }
  })
  .catch(error => {
    console.error('Error:', error);
  });
}

function handleCancel(row) {
  // Revert input values to their original data
  const originalValues = JSON.parse(row.dataset.originalValues);

  // Update the row to display the original values
  row.querySelector('.status-cell').innerHTML = `<span class="badge ${getBadgeClassFromStatus(originalValues.status)} status-pill">${originalValues.status}</span>`;
  row.querySelector('.ce-content-cell').textContent = originalValues.content;
  row.querySelector('.ce-accountable-party-cell').textContent = originalValues.accountable_party;
  row.querySelector('.ce-completion-date-cell').textContent = originalValues.completion_date;

  // Toggle button visibility back to non-edit state
  toggleButtonVisibility(row, false);
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

// The storeOriginalValues function is used to store the original data before editing
function storeOriginalValues(row) {
  const cellsToStore = ['status-cell', 'ce-content-cell', 'ce-accountable-party-cell', 'ce-completion-date-cell'];
  row.dataset.originalValues = JSON.stringify(
    cellsToStore.reduce((values, cellClass) => {
      const cell = row.querySelector(`.${cellClass} span, .${cellClass}`);
      values[cellClass] = cell.textContent.trim();
      return values;
    }, {})
  );
}

