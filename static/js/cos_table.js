document.addEventListener('DOMContentLoaded', () => {
  const phaseTables = document.querySelectorAll('.phase-table');
  phaseTables.forEach(table => {
    table.addEventListener('click', handlePhaseTableClick);
    console.log('Event listeners added to phase tables for handling clicks.');
  });
});

function handlePhaseTableClick(event) {
  const target = event.target;
  const row = target.closest('tr');
  if (!row) {
    console.log('Click event occurred outside of a table row.');
    return;
  }

  const cosId = row.dataset.ceId;

  if (target.matches('.edit-ce-button')) {
    console.log(`Entering edit mode for COS ID: ${cosId}`);
    toggleEditMode(row, true);
    turnRowToEditMode(row);
  } else if (target.matches('.update-ce-button')) {
    console.log(`Updating COS ID: ${cosId}`);
    handleUpdate(row, cosId);
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

function handleUpdate(row, cosId) {
  const contentInput = row.querySelector('.ce-content-cell input').value;
  const statusSelect = row.querySelector('.status-cell select');
  const statusInput = statusSelect.options[statusSelect.selectedIndex].value;
  const accountablePartyInput = row.querySelector('.ce-accountable-party-cell input').value;
  const completionDateInput = row.querySelector('.ce-completion-date-cell input').value;

  console.log(`Sending update request for COS ID: ${cosId} with new values: Status: ${statusInput}, Content: ${contentInput}, Accountable Party: ${accountablePartyInput}, Completion Date: ${completionDateInput}`);

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
  .then(response => {
    if (!response.ok) {
      throw new Error(`Network response was not ok for COS ID: ${cosId}`);
    }
    return response.json();
  })
  .then(data => {
    if (data.success) {
      console.log(`COS ID: ${cosId} updated successfully.`);
      updateRowWithNewValues(row, data.cos);
      toggleEditMode(row, false);
    } else {
      console.error(`Error updating COS ID: ${cosId}:`, data.error);
      alert('An error occurred while updating the entry.');
    }
  })
  .catch(error => {
    console.error(`Error updating COS ID: ${cosId}:`, error);
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
  // Log the received cos object for debugging
  console.log('Received COS data:', cos);

  if (!cos) {
    console.error('No COS data provided to update the row.');
    return;
  }

  // Update the status with a fallback in case cos.status is undefined or null
  const statusBadgeHtml = `<span class="badge ${getBadgeClassFromStatus(cos.status || 'Proposed')} status-pill">${cos.status || 'Proposed'}</span>`;
  row.querySelector('.status-cell').innerHTML = statusBadgeHtml;

  // Update the content with a fallback for empty or undefined values
  row.querySelector('.ce-content-cell').textContent = cos.content || 'No content provided';

  // Update the accountable party with a fallback for empty or undefined values
  row.querySelector('.ce-accountable-party-cell').textContent = cos.accountable_party || 'No accountable party provided';

  // Update the completion date with a fallback for empty or undefined values
  row.querySelector('.ce-completion-date-cell').textContent = cos.completion_date || 'No completion date provided';
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
