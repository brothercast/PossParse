function getBadgeClassFromStatus(status) {
  switch (status) {
    case 'Proposed': return 'bg-info';
    case 'In Progress': return 'bg-warning text-dark';
    case 'Completed': return 'bg-success';
    case 'Rejected': return 'bg-danger';
    default: return 'bg-secondary';
  }
}

// Function to add event listeners to the phase table  
function initializePhaseTableEventListeners() {  
  const phaseTables = document.querySelectorAll('.phase-table');  
  phaseTables.forEach(table => {  
      table.addEventListener('click', handlePhaseTableClick);  
  });  
}  

// Handles clicks within the phase table  
function handlePhaseTableClick(event) {  
  const target = event.target;  
  const row = target.closest('tr.cos-row');  
  if (!row) return;  

  const cosId = row.dataset.cosId;  

  if (target.matches('.edit-cos-button')) {  
      turnRowToEditMode(row);  
  } else if (target.matches('.update-cos-button')) {  
      handleUpdate(row, cosId);  
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
  contentCell.innerHTML = `<textarea class="form-control form-control-sm" rows="3">${currentContent}</textarea>`;  
  accountablePartyCell.innerHTML = `<input type="text" class="form-control form-control-sm" value="${currentAccountableParty}">`;  
  completionDateCell.innerHTML = `<input type="date" class="form-control form-control-sm" value="${currentCompletionDate}">`;  
  
  toggleEditMode(row, true);  
}  
    
function handleUpdate(row, cosId) {  
  const contentInput = row.querySelector('.cos-content-cell textarea');  
  const newContent = contentInput ? contentInput.value.trim() : '';  
  const statusSelect = row.querySelector('.status-cell select');  
  const statusInput = statusSelect.options[statusSelect.selectedIndex].value;  
  const accountablePartyInput = row.querySelector('.cos-accountable-party-cell input').value.trim();  
  const completionDateInput = row.querySelector('.cos-completion-date-cell input').value;  
  
  const payload = {  
    content: newContent,  
    status: statusInput,  
    accountable_party: accountablePartyInput,  
    completion_date: completionDateInput  
  };  
  
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
    if (data.success) {  
      updateRowWithNewValues(row, data.cos);  
      toggleEditMode(row, false);  
    } else {  
      throw new Error(data.error || 'An error occurred while updating the entry.');  
    }  
  })  
  .catch(error => {  
    console.error('Error updating COS:', error);  
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

function addCOS(phaseName, ssolId) {  
  const payload = {  
    content: 'New Condition of Satisfaction',  
    status: 'Proposed',  
    accountable_party: '',  
    completion_date: '',  
    ssol_id: ssolId  
  };  
  
  fetch(`/create_cos`, {  
    method: 'POST',  
    headers: {  
      'Content-Type': 'application/json',  
      'Accept': 'application/json',  
      'X-Requested-With': 'XMLHttpRequest'  
    },  
    body: JSON.stringify(payload)  
  })  
  .then(response => response.json())  
  .then(data => {  
    if (data.success) {  
      const phaseTable = document.querySelector(`#${phaseName.replace(' ', '_')}-table tbody`);  
      const newRow = document.createElement('tr');  
      newRow.classList.add('cos-row');  
      newRow.setAttribute('data-cos-id', data.cos.id);  
      newRow.innerHTML = `  
        <td class="status-cell"><span class="status-pill bg-info ${getBadgeClassFromStatus('Proposed')}">Proposed</span></td>  
        <td class="cos-content-cell">${data.cos.content}</td>  
        <td class="cos-accountable-party-cell">${data.cos.accountable_party}</td>  
        <td class="cos-completion-date-cell">${data.cos.completion_date}</td>  
        <td class="text-end actions-cell">  
          <div class="cos-actions">  
            <button class="btn btn-sm btn-primary edit-cos-button">Edit</button>  
            <button class="btn btn-sm btn-success update-cos-button d-none">Update</button>  
            <button class="btn btn-sm btn-secondary cancel-cos-button d-none">Cancel</button>  
            <button class="btn btn-sm btn-danger delete-cos-button">Delete</button>  
            <button class="btn btn-sm btn-info analyze-cos-button" data-cos-id="${data.cos.id}">Analyze</button>  
          </div>  
        </td>  
      `;  
      phaseTable.appendChild(newRow);  
      initializePhaseTableEventListeners();  
    } else {  
      throw new Error(data.error || 'An error occurred while creating the entry.');  
    }  
  })  
  .catch(error => {  
    console.error('Error creating COS:', error);  
    alert(`An error occurred while creating the entry: ${error.message}`);  
  });  
}  
  
document.addEventListener('DOMContentLoaded', () => {  
  document.querySelectorAll('.add-cos').forEach(button => {  
    button.addEventListener('click', (event) => {  
      const phaseName = event.target.getAttribute('data-phase');  
      const ssolId = document.querySelector('#ssol-goal').getAttribute('data-ssol-id');  
      addCOS(phaseName, ssolId);  
    });  
  });  
});  

function deleteCOS(cosId, row) {  
  if (confirm(`Really delete Condition of Satisfaction?`)) {  
    fetch(`/delete_cos/${cosId}`, {  
      method: 'DELETE',  
      headers: {  
        'Content-Type': 'application/json',  
        'Accept': 'application/json'  
      }  
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
      if (data.success) {  
        row.remove();  
      } else {  
        throw new Error(data.error || 'An error occurred while deleting the entry.');  
      }  
    })  
    .catch(error => {  
      console.error('Error deleting COS:', error);  
      alert(`An error occurred while deleting the entry: ${error.message}`);  
    });  
  }  
}  

function analyzeCOS(cosId) {  
  fetch(`/analyze_cos/${cosId}`)  
    .then(response => response.json())  
    .then(data => {  
      if (data.success) {  
        const cosRow = document.querySelector(`tr[data-cos-id="${cosId}"] .cos-content-cell`);  
        const newContent = data.analyzed_cos;  
        cosRow.innerHTML = replaceCETagsWithPills(newContent);  
        initializeCEPillEventListeners();  
      } else {  
        throw new Error(data.error || 'An error occurred while analyzing the entry.');  
      }  
    })  
    .catch(error => {  
      console.error('Error analyzing COS:', error);  
      alert(`An error occurred while analyzing the entry: ${error.message}`);  
    });  
}  
  
document.addEventListener('DOMContentLoaded', () => {  
  document.querySelectorAll('.analyze-cos-button').forEach(button => {  
    button.addEventListener('click', (event) => {  
      const cosId = event.target.getAttribute('data-cos-id');  
      analyzeCOS(cosId);  
    });  
  });  
});  
  
function storeOriginalValues(row) {  
  const statusCell = row.querySelector('.status-cell');  
  const contentCell = row.querySelector('.cos-content-cell');  
  const accountablePartyCell = row.querySelector('.cos-accountable-party-cell');  
  const completionDateCell = row.querySelector('.cos-completion-date-cell');  
  
  // Store original values including CE pills  
  row.dataset.originalValues = JSON.stringify({  
    status: statusCell.textContent.trim(),  
    contentWithPills: contentCell.innerHTML.trim(),  // Store the HTML content with CE pills  
    accountableParty: accountablePartyCell.textContent.trim(),  
    completionDate: completionDateCell.textContent.trim()  
  });  
}  
  
function revertToOriginalValues(row) {  
  const originalValues = JSON.parse(row.dataset.originalValues);  
  row.querySelector('.status-cell').innerHTML = `<span class="status-pill ${getBadgeClassFromStatus(originalValues.status)}">${originalValues.status}</span>`;  
  row.querySelector('.cos-content-cell').innerHTML = originalValues.contentWithPills;  
  row.querySelector('.cos-accountable-party-cell').textContent = originalValues.accountableParty;  
  row.querySelector('.cos-completion-date-cell').textContent = originalValues.completionDate;  
}  
  
function updateRowWithNewValues(row, cos) {    
  // Check if the cos object and its properties are defined    
  if (cos && cos.status && cos.content) {    
    row.querySelector('.status-cell').innerHTML = `<span class="status-pill ${getBadgeClassFromStatus(cos.status)}">${cos.status}</span>`;    
    row.querySelector('.cos-content-cell').textContent = cos.content;    
    row.querySelector('.cos-accountable-party-cell').textContent = cos.accountable_party || '';    
    row.querySelector('.cos-completion-date-cell').textContent = cos.completion_date || '';    
  } else {    
    // If cos or any required property is undefined, log an error or handle appropriately    
    console.error('Error: COS data is undefined or missing required properties', cos);    
    alert('An error occurred while updating the entry. Please try again.');    
  }    
}      

// Function to add event listeners to the phase table  
function initializePhaseTableEventListeners() {  
  const phaseTables = document.querySelectorAll('.phase-table');  
  phaseTables.forEach(table => {  
      table.addEventListener('click', handlePhaseTableClick);  
  });  
}  

function handleResponse(response) {  
  if (!response.ok) {  
    return response.json().then(errorData => {  
      throw new Error(`Server responded with ${response.status}: ${JSON.stringify(errorData)}`);  
    });  
  }  
  return response.json();  
}  


// Handles clicks within the phase table  
function handlePhaseTableClick(event) {  
  const target = event.target;  
  const row = target.closest('tr.cos-row');  
  if (!row) return;  

  const cosId = row.dataset.cosId;  

  if (target.matches('.edit-cos-button')) {  
      turnRowToEditMode(row);  
  } else if (target.matches('.update-cos-button')) {  
      handleUpdate(row, cosId);  
  } else if (target.matches('.cancel-cos-button')) {  
      cancelEditMode(row);  
  } else if (target.matches('.delete-cos-button')) {  
      deleteCOS(cosId, row);  
  }  
}  

// Function to fetch and display analyzed COS for a given COS ID  
function fetchAndDisplayAnalyzedCOS(cosId) {  
  fetch(`/analyze_cos/${cosId}`)  
    .then(response => {  
      if (!response.ok) {  
        return response.json().then(errorData => {  
          throw new Error(`Server responded with ${response.status}: ${JSON.stringify(errorData)}`);  
        });  
      }  
      return response.json();  
    })  
    .then(data => {  
      if (data.success) {  
        const cosRow = document.querySelector(`tr[data-cos-id="${cosId}"] .cos-content-cell`);  
        if (cosRow) {  
          const newContent = data.analyzed_cos;  
          cosRow.innerHTML = replaceCETagsWithPills(newContent);  
        }  
      } else {  
        throw new Error(data.error || 'An error occurred while analyzing the entry.');  
      }  
    })  
    .catch(error => {  
      console.error('Error analyzing COS:', error);  
      alert(`An error occurred while analyzing the entry: ${error.message}`);  
    });  
}  

  
// Event listener to fetch and display analyzed COS content after DOM content is fully loaded  
document.addEventListener('DOMContentLoaded', () => {  
  const analyzeButtons = document.querySelectorAll('.analyze-cos-button');  
  analyzeButtons.forEach(button => {  
    button.addEventListener('click', function () {  
      const cosId = this.getAttribute('data-cos-id');  
      fetchAndDisplayAnalyzedCOS(cosId);  
    });  
  });  
});  


// Function to add event listeners to CE pills  
function initializeCEPillEventListeners() {  
  const cePills = document.querySelectorAll('.ce-pill');  
  cePills.forEach(pill => {  
      pill.addEventListener('click', handleCEPillClick);  
  });  
}  

function handleCEPillClick(event) {  
  const ceId = event.target.dataset.ceId; 
  console.log(`CE Pill with ID ${ceId} clicked`);  

  // Example logic to fetch CE details and display in a modal or another UI element  
  fetch(`/get_ce_by_id/${ceId}`)  
      .then(response => response.json())  
      .then(data => {  
          if (data && data.ce) {  
              displayCEDetails(data.ce); // Function to display CE details  
          } else {  
              console.error('CE details not found or error in response:', data);  
          }  
      })  
      .catch(error => {  
          console.error('Error fetching CE details:', error);  
      });  
} 



// Event listener to initialize phase table event listeners after DOM content is fully loaded  
document.addEventListener('DOMContentLoaded', () => {  
  initializePhaseTableEventListeners();  
  document.querySelectorAll('.add-cos').forEach(button => {  
    button.addEventListener('click', (event) => {  
      const phaseName = event.target.getAttribute('data-phase');  
      const ssolId = document.querySelector('#ssol-goal').getAttribute('data-ssol-id');  
      addCOS(phaseName, ssolId);  
    });  
  });  
  document.querySelectorAll('.analyze-cos-button').forEach(button => {  
    button.addEventListener('click', (event) => {  
      const cosId = event.target.getAttribute('data-cos-id');  
      analyzeCOS(cosId);  
    });  
  });  
});  

// Function to add event listeners to CE pills  
function initializeCEPillEventListeners() {  
  const cePills = document.querySelectorAll('.ce-pill');  
  cePills.forEach(pill => {  
      pill.addEventListener('click', handleCEPillClick);  
  });  
} 

// Event listener to initialize phase table event listeners after DOM content is fully loaded  
document.addEventListener('DOMContentLoaded', () => {
  initializePhaseTableEventListeners();
  document.querySelectorAll('.analyze-cos-button').forEach(button => {
    button.addEventListener('click', (event) => {
      const cosId = event.target.getAttribute('data-cos-id');
      if (cosId) {
        fetchAndDisplayAnalyzedCOS(cosId);
      }
    });
  });
  
  // Add event listener to the Analyze button  
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.analyze-cos-button').forEach(button => {
      button.addEventListener('click', (event) => {
        const cosId = event.target.getAttribute('data-cos-id');
        if (cosId) {
          fetchAndDisplayAnalyzedCOS(cosId);
        }
      });
    });
  });

  function extractCosContentForEditing(cosContentCell) {
    const badgeElements = cosContentCell.querySelectorAll('.badge');
    badgeElements.forEach((badge) => {
      const ceContent = badge.textContent;
      // Replace the badge HTML with a placeholder or markup that includes the CE content  
      badge.outerHTML = `[CE]${ceContent}[/CE]`;
    });
    return cosContentCell.innerHTML; // This now contains the editable content with [CE][/CE] placeholders  
  }

 
  document.addEventListener('DOMContentLoaded', () => {
    // Get all COS content cells  
    const cosContentCells = document.querySelectorAll('.cos-content-cell');
  
    // Loop over each cell and replace CE tags with pills  
    cosContentCells.forEach(cell => {
      const content = cell.textContent;
      const newContent = replaceCETagsWithPills(content); // This is your existing JS function  
      cell.innerHTML = newContent;
    });
  
    // Now that the DOM has been updated, add event listeners to the new pill elements  
    addEventListenersToCELabels();
  });
})

// Function to save the content as PDF  
function saveAsPDF(ssolId) {  
  const htmlContent = document.documentElement.outerHTML; // Get the entire HTML content of the page  
  fetch(`/save_as_pdf/${ssolId}`, {  
    method: 'POST',  
    headers: {  
      'Content-Type': 'application/json'  
    },  
    body: JSON.stringify({ htmlContent: htmlContent })  
  })  
  .then(response => {  
    if (!response.ok) {  
      throw new Error(`Server responded with status ${response.status}`);  
    }  
    return response.blob();  
  })  
  .then(blob => {  
    const url = window.URL.createObjectURL(blob);  
    const a = document.createElement('a');  
    a.style.display = 'none';  
    a.href = url;  
    a.download = `${ssolId}.pdf`;  
    document.body.appendChild(a);  
    a.click();  
    window.URL.revokeObjectURL(url);  
    document.body.removeChild(a);  
  })  
  .catch((error) => {  
    console.error('Error saving PDF:', error);  
  });  
}  
  
// Event listener to initialize after DOM content is fully loaded  
document.addEventListener('DOMContentLoaded', function () {  
  const saveButton = document.getElementById('save-as-pdf-button');  
  if (saveButton) {  
    saveButton.addEventListener('click', function (event) {  
      event.preventDefault(); // Prevent the default button click action  
      const ssolId = saveButton.dataset.ssolId;  
      saveAsPDF(ssolId);  
    });  
  }  
});  
