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

function handlePhaseTableClick(event) {
  const target = event.target;
  const row = target.closest('tr');
  if (!row) return;

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
  }
}

function turnRowToEditMode(row) {
  storeOriginalValues(row); // Store original values before editing
  const statusCell = row.querySelector('.status-cell');
  const statusValue = statusCell.textContent.trim();
  statusCell.innerHTML = createStatusDropdown(statusValue);

  const ceContentCell = row.querySelector('.ce-content-cell');
  const ceContentValue = ceContentCell.textContent.trim();
  ceContentCell.innerHTML = `<input type="text" class="form-control form-control-sm" value="${ceContentValue}">`;

  const accountablePartyCell = row.querySelector('.ce-accountable-party-cell');
  const accountablePartyValue = accountablePartyCell.textContent.trim();
  accountablePartyCell.innerHTML = `<input type="text" class="form-control form-control-sm" value="${accountablePartyValue}">`;

  const completionDateCell = row.querySelector('.ce-completion-date-cell');
  const completionDateValue = completionDateCell.textContent.trim();
  completionDateCell.innerHTML = `<input type="date" class="form-control form-control-sm" value="${completionDateValue}">`;

  toggleButtonVisibility(row, true);
}

function updateCOS(row, cosId) {
  const contentInput = row.querySelector('.ce-content-cell input').value;
  const statusSelect = row.querySelector('.status-cell select');
  const statusInput = statusSelect.value;
  const accountablePartyInput = row.querySelector('.ce-accountable-party-cell input').value;
  const completionDateInput = row.querySelector('.ce-completion-date-cell input').value;

  fetch(`/update_cos/${cosId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: contentInput,
      status: statusInput,
      accountable_party: accountablePartyInput,
      completion_date: completionDateInput
    }),
  })
  .then(handleResponse)
  .then(data => {
    if (data.cos) {
      // Update the row with the new values
      row.querySelector('.ce-content-cell').textContent = contentInput;
      row.querySelector('.status-cell').textContent = statusInput;
      row.querySelector('.ce-accountable-party-cell').textContent = accountablePartyInput;
      row.querySelector('.ce-completion-date-cell').textContent = completionDateInput;
      toggleButtonVisibility(row, false);
    } else {
      console.error('Error updating COS:', data.error);
    }
  })
  .catch(error => console.error('Error:', error));
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
  const deleteButton = row.querySelector('.delete-ce-button');

  if (editButton && updateButton && cancelButton && deleteButton) {
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
  } else {
    console.error('One or more buttons are missing in the row.');
  }
}

function deleteCOS(cosId, row) {
  fetch(`/delete_cos/${cosId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      row.remove();
    } else {
      console.error('Error deleting COS:', data.error);
    }
  })
  .catch(error => console.error('Error:', error));id
}

function handleResponse(response) {
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
}

function storeOriginalValues(row) {
  const cellsToStore = ['status-cell', 'ce-content-cell', 'ce-accountable-party-cell', 'ce-completion-date-cell'];
  row.dataset.originalValues = JSON.stringify(
    cellsToStore.reduce((values, cellClass) => {
      const cell = row.querySelector(`.${cellClass}`);
      values[cellClass] = cell.textContent.trim();
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

function revertRowFromEditMode(row, cos) {
  row.querySelector('.status-cell').textContent = cos.status;
  row.querySelector('.ce-content-cell').textContent = cos.content;
  row.querySelector('.ce-accountable-party-cell').textContent = cos.accountable_party;
  row.querySelector('.ce-completion-date-cell').textContent = cos.completion_date;
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
    deleteCOS(cosId, row);  
  }  
}  
  
function turnRowToEditMode(row) {  
  storeOriginalValues(row);  
  const statusCell = row.querySelector('.status-cell');  
  const ceContentCell = row.querySelector('.ce-content-cell');  
  const accountablePartyCell = row.querySelector('.ce-accountable-party-cell');  
  const completionDateCell = row.querySelector('.ce-completion-date-cell');  
  
  statusCell.innerHTML = createStatusDropdown(statusCell.textContent.trim());  
  ceContentCell.innerHTML = `<input type="text" value="${ceContentCell.textContent.trim()}" class="form-control form-control-sm">`;  
  accountablePartyCell.innerHTML = `<input type="text" value="${accountablePartyCell.textContent.trim()}" class="form-control form-control-sm">`;  
  completionDateCell.innerHTML = `<input type="date" value="${completionDateCell.textContent.trim()}" class="form-control form-control-sm">`;  
  
  toggleButtonVisibility(row, true);  
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
  const statusSelect = row.querySelector('.status-cell select').value;
  const accountablePartyInput = row.querySelector('.ce-accountable-party-cell input').value;
  const completionDateInput = row.querySelector('.ce-completion-date-cell input').value;

  // Perform validation if necessary
  if (!contentInput || !statusSelect || !accountablePartyInput || !completionDateInput) {
    alert('Please fill in all fields.');
    return;
  }

  // AJAX request to update the COS entry on the server
  fetch(`/update_cos/${cosId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      content: contentInput,
      status: statusSelect,
      accountable_party: accountablePartyInput,
      completion_date: completionDateInput
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      // Update the row to display the new values
      row.querySelector('.status-cell').innerHTML = `<span class="badge ${getBadgeClassFromStatus(statusSelect)} status-pill">${statusSelect}</span>`;
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
    case 'Proposed': return 'badge-primary';
    case 'In Progress': return 'badge-warning';
    case 'Completed': return 'badge-success';
    case 'Rejected': return 'badge-danger';
    default: return 'badge-secondary';
  }
}

// The storeOriginalValues function is used to store the original data before editing
function storeOriginalValues(row) {
  const statusPill = row.querySelector('.status-cell .status-pill');
  const content = row.querySelector('.ce-content-cell').textContent;
  const accountableParty = row.querySelector('.ce-accountable-party-cell').textContent;
  const completionDate = row.querySelector('.ce-completion-date-cell').textContent;

  // Store the original values in a data attribute on the row
  row.dataset.originalValues = JSON.stringify({
    status: statusPill.textContent.trim(),
    content: content,
    accountable_party: accountableParty,
    completion_date: completionDate
  });
}
