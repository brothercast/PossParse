document.addEventListener('DOMContentLoaded', () => {  
  const cosTable = document.getElementById('cos-table');  
  if (cosTable) {  
    cosTable.addEventListener('click', (event) => {  
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
    });  
  }  
});  

document.addEventListener('DOMContentLoaded', () => {  
  const cosTable = document.getElementById('cos-table');  
  if (cosTable) {  
    cosTable.addEventListener('click', (event) => {  
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
    });  
  }  
});  
  
function turnRowToEditMode(row) {  
  // Replace text with input fields  
  const contentCell = row.querySelector('.ce-content-cell');  
  const statusCell = row.querySelector('.status-cell');  
  const content = contentCell.innerText;  
  const status = statusCell.innerText;  
  
  contentCell.innerHTML = `<input type="text" class="form-control form-control-sm ce-content-input" value="${content}">`;  
  statusCell.innerHTML = `  
    <select class="form-control form-control-sm ce-status-input">  
      <option value="Proposed" ${status === 'Proposed' ? 'selected' : ''}>Proposed</option>  
      <option value="In Progress" ${status === 'In Progress' ? 'selected' : ''}>In Progress</option>  
      <option value="Completed" ${status === 'Completed' ? 'selected' : ''}>Completed</option>  
      <option value="Rejected" ${status === 'Rejected' ? 'selected' : ''}>Rejected</option>  
    </select>  
  `;  

    // Hide edit button, show update and cancel buttons  
    row.querySelector('.edit-ce-button').style.display = 'none';  
    row.querySelector('.update-ce-button').style.display = 'inline-block';  
    row.querySelector('.cancel-ce-button').style.display = 'inline-block';  
  }  

  document.addEventListener('DOMContentLoaded', () => {  
    const cosTable = document.getElementById('cos-table');  
    if (cosTable) {  
      cosTable.addEventListener('click', (event) => {  
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
      });  
    }  
  });  
    
  function turnRowToEditMode(row) {  
    // Replace text with input fields  
    const contentCell = row.querySelector('.ce-content-cell');  
    const statusCell = row.querySelector('.status-cell');  
    const content = contentCell.innerText;  
    const status = statusCell.innerText;  
    
    contentCell.innerHTML = `<input type="text" class="form-control form-control-sm ce-content-input" value="${content}">`;  
    statusCell.innerHTML = `  
      <select class="form-control form-control-sm ce-status-input">  
        <option value="Proposed" ${status === 'Proposed' ? 'selected' : ''}>Proposed</option>  
        <option value="In Progress" ${status === 'In Progress' ? 'selected' : ''}>In Progress</option>  
        <option value="Completed" ${status === 'Completed' ? 'selected' : ''}>Completed</option>  
        <option value="Rejected" ${status === 'Rejected' ? 'selected' : ''}>Rejected</option>  
      </select>  
    `;  
    
    // Hide edit button, show update and cancel buttons  
    row.querySelector('.edit-ce-button').style.display = 'none';  
    row.querySelector('.update-ce-button').style.display = 'inline-block';  
    row.querySelector('.cancel-ce-button').style.display = 'inline-block';  
  }  
    
  function updateCOS(row, cosId) {  
    // Grab the new data from the input fields  
    const contentInput = row.querySelector('.ce-content-input').value;  
    const statusSelect = row.querySelector('.ce-status-input');  
    const statusInput = statusSelect.options[statusSelect.selectedIndex].value;  
    
    fetch(`/update_cos/${cosId}`, {  
      method: 'POST',  
      headers: {  
        'Content-Type': 'application/json',  
      },  
      body: JSON.stringify({  
        content: contentInput,  
        status: statusInput,  
      }),  
    })  
    .then(response => response.json())  
    .then(data => {  
      if (data.cos) {  
        // Update the UI with the new COS data  
        row.querySelector('.ce-content-cell').innerText = data.cos.content;  
        row.querySelector('.status-cell').innerText = data.cos.status;  
    
        // Hide update and cancel buttons, show edit button  
        row.querySelector('.edit-ce-button').style.display = 'inline-block';  
        row.querySelector('.update-ce-button').style.display = 'none';  
        row.querySelector('.cancel-ce-button').style.display = 'none';  
      } else {  
        console.error('Error updating COS:', data.error);  
      }  
    })  
    .catch(error => console.error('Error:', error));  
}  
  
function cancelEditMode(row) {  
  // Revert changes by refreshing the page or re-rendering the row content  
  location.reload();  
} 

document.addEventListener('DOMContentLoaded', () => {  
  const cosTable = document.getElementById('cos-table');  
  if (cosTable) {  
    cosTable.addEventListener('click', (event) => {  
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
    });  
  }  
});  
  
function turnRowToEditMode(row) {  
  // Replace text with input fields  
  const contentCell = row.querySelector('.ce-content-cell');  
  const statusCell = row.querySelector('.status-cell');  
  const content = contentCell.innerText;  
  const status = statusCell.innerText;  
  
  contentCell.innerHTML = `<input type="text" class="form-control form-control-sm ce-content-input" value="${content}">`;  
  statusCell.innerHTML = `  
    <select class="form-control form-control-sm ce-status-input">  
      <option value="Proposed" ${status === 'Proposed' ? 'selected' : ''}>Proposed</option>  
      <option value="In Progress" ${status === 'In Progress' ? 'selected' : ''}>In Progress</option>  
      <option value="Completed" ${status === 'Completed' ? 'selected' : ''}>Completed</option>  
      <option value="Rejected" ${status === 'Rejected' ? 'selected' : ''}>Rejected</option>  
    </select>  
  `;  
  
  // Hide edit button, show update and cancel buttons  
  row.querySelector('.edit-ce-button').style.display = 'none';  
  row.querySelector('.update-ce-button').style.display = 'inline-block';  
  row.querySelector('.cancel-ce-button').style.display = 'inline-block';  
}  
  
function updateCOS(row, cosId) {  
  // Grab the new data from the input fields  
  const contentInput = row.querySelector('.ce-content-input').value;  
  const statusSelect = row.querySelector('.ce-status-input');  
  const statusInput = statusSelect.options[statusSelect.selectedIndex].value;  
  
  fetch(`/update_cos/${cosId}`, {  
    method: 'POST',  
    headers: {  
      'Content-Type': 'application/json',  
    },  
    body: JSON.stringify({  
      content: contentInput,  
      status: statusInput,  
    }),  
  })  
  .then(response => response.json())  
  .then(data => {  
    if (data.cos) {  
      // Update the UI with the new COS data  
      row.querySelector('.ce-content-cell').innerText = data.cos.content;  
      row.querySelector('.status-cell').innerText = data.cos.status;  
  
      // Hide update and cancel buttons, show edit button  
      row.querySelector('.edit-ce-button').style.display = 'inline-block';  
      row.querySelector('.update-ce-button').style.display = 'none';  
      row.querySelector('.cancel-ce-button').style.display = 'none';  
    } else {  
      console.error('Error updating COS:', data.error);  
    }  
  })  
  .catch(error => console.error('Error:', error));  
}  
  
function cancelEditMode(row) {  
  // Revert changes by refreshing the page or re-rendering the row content  
  location.reload();  
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

document.addEventListener('DOMContentLoaded', () => {  
  const cosTable = document.getElementById('cos-table');  
  if (cosTable) {  
    cosTable.addEventListener('click', (event) => {  
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
    });  
  }  
});  
  
function turnRowToEditMode(row) {  
  // Replace text with input fields  
  const contentCell = row.querySelector('.ce-content-cell');  
  const statusCell = row.querySelector('.status-cell');  
  const content = contentCell.innerText;  
  const status = statusCell.innerText;  
  
  contentCell.innerHTML = `<input type="text" class="form-control form-control-sm ce-content-input" value="${content}">`;  
  statusCell.innerHTML = `  
    <select class="form-control form-control-sm ce-status-input">  
      <option value="Proposed" ${status === 'Proposed' ? 'selected' : ''}>Proposed</option>  
      <option value="In Progress" ${status === 'In Progress' ? 'selected' : ''}>In Progress</option>  
      <option value="Completed" ${status === 'Completed' ? 'selected' : ''}>Completed</option>  
      <option value="Rejected" ${status === 'Rejected' ? 'selected' : ''}>Rejected</option>  
    </select>  
  `;  
  
  // Hide edit button, show update and cancel buttons  
  row.querySelector('.edit-ce-button').style.display = 'none';  
  row.querySelector('.update-ce-button').style.display = 'inline-block';  
  row.querySelector('.cancel-ce-button').style.display = 'inline-block';  
}  
  
function updateCOS(row, cosId) {  
  // Grab the new data from the input fields  
  const contentInput = row.querySelector('.ce-content-input').value;  
  const statusSelect = row.querySelector('.ce-status-input');  
  const statusInput = statusSelect.options[statusSelect.selectedIndex].value;  
  
  fetch(`/update_cos/${cosId}`, {  
    method: 'POST',  
    headers: {  
      'Content-Type': 'application/json',  
    },  
    body: JSON.stringify({  
      content: contentInput,  
      status: statusInput,  
    }),  
  })  
  .then(response => response.json())  
  .then(data => {  
    if (data.cos) {  
      // Update the UI with the new COS data  
      row.querySelector('.ce-content-cell').innerText = data.cos.content;  
      row.querySelector('.status-cell').innerText = data.cos.status;  
  
      // Hide update and cancel buttons, show edit button  
      row.querySelector('.edit-ce-button').style.display = 'inline-block';  
      row.querySelector('.update-ce-button').style.display = 'none';  
      row.querySelector('.cancel-ce-button').style.display = 'none';  
    } else {  
      console.error('Error updating COS:', data.error);  
    }  
  })  
  .catch(error => console.error('Error:', error));  
}  
  
function cancelEditMode(row) {  
  // Revert changes by refreshing the page or re-rendering the row content  
  location.reload();  
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

// Function to display the CE modal
function showCEModal(ceData) {
  const existingModal = document.getElementById('ceModal');
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement('div');
  modal.className = 'modal fade';
  modal.id = 'ceModal';
  modal.setAttribute('tabindex', '-1');
  modal.setAttribute('aria-labelledby', 'ceModalLabel');
  modal.setAttribute('aria-hidden', 'true');

  const modalDialog = document.createElement('div');
  modalDialog.className = 'modal-dialog modal-dialog-centered';
  modalDialog.setAttribute('role', 'document');

  const modalContent = createCEModalContent(ceData);
  modalDialog.appendChild(modalContent);
  modal.appendChild(modalDialog);

  document.body.appendChild(modal);
  $(modal).modal('show');

  $(modal).on('hidden.bs.modal', function () {
    modal.remove();
  });
}

// Function to create the CE modal content
function createCEModalContent(ceData) {
  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';

  const modalHeader = document.createElement('div');
  modalHeader.className = 'modal-header';
  modalHeader.innerHTML = `
    <h5 class="modal-title" id="ceModalLabel">Conditional Element Details</h5>
    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
      <span aria-hidden="true">&times;</span>
    </button>
  `;

  const modalBody = document.createElement('div');
  modalBody.className = 'modal-body';

  if (ceData && ceData.content) {
    const ceContent = document.createElement('h2');
    ceContent.textContent = ceData.content;

    const ceType = document.createElement('p');
    ceType.textContent = `CE Type: ${ceData.ce_type}`;

    modalBody.appendChild(ceContent);
    modalBody.appendChild(ceType);
  } else {
    const errorMessage = document.createElement('p');
    errorMessage.textContent = 'Error: Unable to load CE details.';
    modalBody.appendChild(errorMessage);
  }

  modalContent.appendChild(modalHeader);
  modalContent.appendChild(modalBody);

  return modalContent;
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

// Add event listeners to CE pills  
document.addEventListener('DOMContentLoaded', () => {  
  const cePills = document.querySelectorAll('.ce-pill-button');  
  cePills.forEach((pill) => {  
    pill.addEventListener('click', handleCEPillClick);  
  });  
});  

// Function definitions  
function turnRowToEditMode(row) {  
  // Logic to turn the row to edit mode  
}  
  
function updateCOS(row, cosId) {  
  // Logic to update the COS  
}  
  
function cancelEditMode(row) {  
  // Logic to cancel edit mode  
}  
  
function deleteCOS(cosId, row) {  
  // Logic to delete the COS  
}  
  
function analyzeCOS(cosId) {  
  // Logic to analyze the COS  
}  
  
// Function to show the CE modal  
function showCEModal(ceData) {  
  // Logic to show the modal with CE details  
}  
  
// Function to create the CE modal content  
function createCEModalContent(ceData) {  
  // Logic to create the content of the CE modal  
}  
  
// Function to handle the click event on CE pills  
function handleCEPillClick(event) {  
  // Logic to handle CE pill clicks  
}  
  
// Function to reset buttons to their default state after an update or cancel  
function resetEditButtons(row) {  
  // Logic to reset edit buttons  
}  
  
// Function to handle the update button click for CE  
function handleCEUpdateButtonClick(event) {  
  // Logic to handle CE update button click  
}  
  
// Add event listeners to CE pills  
document.addEventListener('DOMContentLoaded', () => {  
  const cePills = document.querySelectorAll('.ce-pill-button');  
  cePills.forEach((pill) => {  
    pill.addEventListener('click', handleCEPillClick);  
  });  
});  
  
// Function to turn the row to edit mode  
function turnRowToEditMode(row) {  
  // Replace text with input fields  
  // ...  
}  
  
// Function to update the COS  
function updateCOS(row, cosId) {  
  // Grab the new data from the input fields  
  // ...  
}  
  
// Function to cancel edit mode  
function cancelEditMode(row) {  
  // Logic to cancel edit mode  
  // ...  
}  
  
// Function to delete the COS  
function deleteCOS(cosId, row) {  
  // Logic to delete the COS  
  // ...  
}  
  
// Function to analyze the COS  
function analyzeCOS(cosId) {  
  // Logic to analyze the COS  
  // ...  
}  
  
// Function to display the CE modal  
function showCEModal(ceData) {  
  // Logic to show the modal with CE details  
  // ...  
}  
  
// Function to create the CE modal content  
function createCEModalContent(ceData) {  
  // Logic to create the content of the CE modal  
  // ...  
}  
  
// Function to handle the click event on CE pills  
function handleCEPillClick(event) {  
  // Logic to handle CE pill clicks  
  // ...  
}  
  
// Function to reset buttons to their default state after an update or cancel  
function resetEditButtons(row) {  
  // Logic to reset edit buttons  
  // ...  
}  
  
// Function to handle the update button click for CE  
function handleCEUpdateButtonClick(event) {  
  // Logic to handle CE update button click  
  // ...  
}  
  
// Function to analyze the COS content using the provided COS ID  
function analyzeCOSContent(ceId) {  
  // Logic to analyze the COS content  
  // ...  
}  
  
// Function to update the display of the CE type in the UI  
function updateCETypeDisplay(ceId, analyzedCOS) {  
  // Logic to update the display of the CE type  
  // ...  
}  
  
// Main event listener for the table  
document.addEventListener('DOMContentLoaded', () => {  
  const cosTable = document.getElementById('cos-table');  
  if (cosTable) {  
    cosTable.addEventListener('click', (event) => {  
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
    });  
  }  
  
  // Attach event listeners to all CE pills  
  const cePills = document.querySelectorAll('.ce-pill-button');  
  cePills.forEach(pill => {  
    pill.addEventListener('click', handleCEPillClick);  
  });  
});  

document.addEventListener('DOMContentLoaded', () => {  
  // Attach event listeners after the DOM is fully loaded  
  const ceAnalyzeButtons = document.querySelectorAll('.ce-analyze-button');  
  ceAnalyzeButtons.forEach(button => {  
    button.addEventListener('click', handleCEAnalyzeClick);  
  });  
});  
  
function handleCEAnalyzeClick(event) {  
  const ceId = event.target.dataset.ceId;  
  const ceContentCell = document.querySelector(`tr[data-ce-id="${ceId}"] .ce-content-cell`);  
    
  if (ceContentCell) {  
    const cosContent = ceContentCell.textContent || ceContentCell.innerText;  
    analyzeCOSContent(cosContent, ceId);  
  }  
}  
  
// Function to analyze the COS content using the provided COS ID  
function analyzeCOSContent(ceId) {  
  fetch(`/analyze_cos/${ceId}`)  
    .then(response => response.json())  
    .then(data => {  
      if (data.analyzed_cos && data.analyzed_cos.length > 0) {  
        updateCETypeDisplay(ceId, data.analyzed_cos);  
      } else {  
        console.error('No analyzed data returned for COS');  
      }  
    })  
    .catch(error => console.error('Error:', error));  
}   
  
// Function to update the display of the CE type in the UI  
function updateCETypeDisplay(ceId, analyzedCOS) {  
  const ceTypeContainer = document.querySelector(`tr[data-ce-id="${ceId}"] .ce-type-container`);  
  if (ceTypeContainer) {  
    ceTypeContainer.textContent = analyzedCOS.map(cos => cos.content).join(', ');  
  }  
}  
  
function showCEModal(ceData) {  
  // Remove any existing modals  
  const existingModal = document.getElementById('ceModal');  
  if (existingModal) {  
    existingModal.parentNode.removeChild(existingModal);  
  }  
  
  // Create the modal's HTML structure  
  const modalHTML = `  
    <div class="modal fade" id="ceModal" tabindex="-1" role="dialog" aria-labelledby="ceModalLabel" aria-hidden="true">  
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
    </div>  
  `;  
  
  // Append the modal to the body  
  document.body.insertAdjacentHTML('beforeend', modalHTML);  
  
  // Use Bootstrap's modal functionality to show the modal  
  $('#ceModal').modal('show');  
}  

document.addEventListener('DOMContentLoaded', () => {  
  // Attach event listeners to all phase tables  
  const phaseTables = document.querySelectorAll('.phase-table');  
    
  phaseTables.forEach(table => {  
    table.addEventListener('click', (event) => {  
      if (event.target.matches('.edit-ce-button')) {  
        handleEditButtonClick(event);  
      } else if (event.target.matches('.delete-ce-button')) {  
        handleDeleteButtonClick(event);  
      } else if (event.target.matches('.analyze-ce-button')) {  
        handleAnalyzeButtonClick(event);  
      }  
    });  
  });  
}); 

