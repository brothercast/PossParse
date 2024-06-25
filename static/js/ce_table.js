function handleCEPillClick(event) {  
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
  
  fetch(`/get_ce_modal/${encodeURIComponent(ceType)}`, {  
    method: 'POST',  
    headers: {  
      'Content-Type': 'application/json'  
    },  
    body: JSON.stringify(requestData)  
  })  
  .then(response => response.json())  
  .then(data => {  
    if (data && data.modal_html) {  
      displayCEModal(data.modal_html, ceId, ceType, cosContent, phaseName, phaseIndex, data.ai_context);  
    } else {  
      throw new Error('Modal HTML content not found or error in response');  
    }  
  })  
  .catch(error => console.error('Error fetching modal content:', error));  
}  

// Function to analyze the CE and get the CE type
function analyzeCE(ceId, ceData) {
  fetch('/analyze_ce_type', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ cos_content: ceData.content }),
  })
    .then((response) => response.json())
    .then((data) => {
      updateCEwithAnalyzedCE(ceId, ceData, data.ce_type);
    })
    .catch((error) => {
      console.log('Error:', error);
    });
}

// Function to update the CE with the analyzed CE type
function updateCEwithAnalyzedCE(ceId, ceData, ceType) {
  fetch(`/update_ce_type?ce_id=${ceId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ce_type: ceType }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.ce && data.ce.ce_type) {
        showCEModal(data.ce);
      } else {
        showCEModal(ceData);
      }
    })
    .catch((error) => {
      console.log('Error:', error);
    });
}

function createCEModalContent(ceData, cosContent, aiContext) {  
  const modalContent = document.createElement('div');  
  modalContent.classList.add('modal-content');  
  
  const modalHeader = document.createElement('div');  
  modalHeader.classList.add('modal-header');  
  modalHeader.innerHTML = `  
    <h5 class="modal-title" id="ceModalLabel">Conditional Element Details</h5>  
    <button type="button" class="close" data-dismiss="modal" aria-label="Close">  
      <span aria-hidden="true">&times;</span>  
    </button>  
  `;  
  
  const modalBody = document.createElement('div');  
  modalBody.classList.add('modal-body');  
  
  if (ceData && ceData.content && cosContent) {  
    const cosContentElement = document.createElement('p');  
    cosContentElement.innerHTML = `<strong>Parent COS:</strong> ${cosContent}`;  
  
    const ceContentElement = document.createElement('h2');  
    ceContentElement.textContent = ceData.content;  
  
    const ceTypeElement = document.createElement('p');  
    ceTypeElement.textContent = `CE Type: ${ceData.ce_type}`;  
  
    const aiContextElement = document.createElement('p');  
    aiContextElement.innerHTML = `<strong>AI Context:</strong> ${aiContext}`;  
  
    modalBody.appendChild(cosContentElement);  
    modalBody.appendChild(ceContentElement);  
    modalBody.appendChild(ceTypeElement);  
    modalBody.appendChild(aiContextElement);  
  } else {  
    modalBody.innerHTML = '<p>Error: Unable to load CE details.</p>';  
  }  
  
  modalContent.appendChild(modalHeader);  
  modalContent.appendChild(modalBody);  
  
  return modalContent;  
}  



// Function to display the CE modal
function showCEModal(ceData) {
  const modal = document.createElement('div');
  modal.classList.add('modal', 'fade');
  modal.id = 'ceModal';
  modal.setAttribute('tabindex', '-1');
  modal.setAttribute('aria-labelledby', 'ceModalLabel');
  modal.setAttribute('aria-hidden', 'true');

  const modalDialog = document.createElement('div');
  modalDialog.classList.add('modal-dialog', 'modal-dialog-centered');
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

// Function to handle the edit button click for CE
function handleCEEditButtonClick(event) {
  const row = event.target.closest('tr');
  const ceContentCell = row.querySelector('.ce-content-cell');
  const currentContent = ceContentCell.textContent.trim();
  
  // Replace the content cells with editable fields
  ceContentCell.innerHTML = `<input type="text" class="form-control form-control-sm ce-content-input" value="${currentContent}">`;
  
  // Show the update and cancel buttons, hide the edit and delete buttons
  row.querySelector('.edit-ce-button').classList.add('d-none');
  row.querySelector('.delete-ce-button').classList.add('d-none');
  row.querySelector('.update-ce-button').classList.remove('d-none');
  row.querySelector('.cancel-ce-button').classList.remove('d-none');
}

// Function to handle the update button click for CE
function handleCEUpdateButtonClick(event) {
  const row = event.target.closest('tr');
  const ceContentInput = row.querySelector('.ce-content-input');
  
  // If there is a valid input field, update the CE content
  if (ceContentInput) {
    const newContent = ceContentInput.value.trim();
    row.querySelector('.ce-content-cell').textContent = newContent;
  }

  // Hide the update and cancel buttons and show the edit button
  row.querySelector('.edit-ce-button').classList.remove('d-none');
  row.querySelector('.update-ce-button').classList.add('d-none');
  row.querySelector('.cancel-ce-button').classList.add('d-none');
}

// Function to handle the cancel button click for CE
function handleCECancelButtonClick(event) {
  const row = event.target.closest('tr');
  const ceContentCell = row.querySelector('.ce-content-cell');
  const originalContent = ceContentCell.dataset.originalContent;
  
  // Revert the content cell to its original value
  ceContentCell.textContent = originalContent;

  // Hide the update and cancel buttons and show the edit button
  row.querySelector('.edit-ce-button').classList.remove('d-none');
  row.querySelector('.update-ce-button').classList.add('d-none');
  row.querySelector('.cancel-ce-button').classList.add('d-none');
}

// Add event listeners to CE pills and buttons within the CE table
document.addEventListener('DOMContentLoaded', () => {  
  const cosTable = document.querySelector('#cos-table');  
    
  if (cosTable) {  
    cosTable.addEventListener('click', (event) => {  
      if (event.target.matches('.edit-ce-button')) {  
        handleEditButtonClick(event);  
      } else if (event.target.matches('.delete-ce-button')) {  
        handleDeleteButtonClick(event);  
      } else if (event.target.matches('.analyze-ce-button')) {  
        handleAnalyzeButtonClick(event);  
      }  
    });  
  }  
});  
  
function handleEditButtonClick(event) {  
  const row = event.target.closest('tr');  
  const ceContentCell = row.querySelector('.ce-content-cell');  
  const currentContent = ceContentCell.textContent.trim();  
  
  // Replace the content cell with an input field  
  ceContentCell.innerHTML = `<input type="text" class="form-control form-control-sm ce-content-input" value="${currentContent}">`;  
  
  // Change the "Edit" button to a "Save" button  
  event.target.classList.add('d-none');  
  const saveButton = row.querySelector('.save-ce-button');  
  if (saveButton) {  
    saveButton.classList.remove('d-none');  
  }  
  
  // Add click event for the save button  
  saveButton.addEventListener('click', (e) => handleSaveButtonClick(e, row));  
}  
  
function handleSaveButtonClick(event, row) {  
  const ceContentInput = row.querySelector('.ce-content-input');  
  const newContent = ceContentInput.value.trim();  
  const ceId = row.dataset.ceId;  
  // Send the updated content to the server  
  fetch(`/update_cos`, {  
    method: 'POST',  
    headers: {'Content-Type': 'application/json'},  
    body: JSON.stringify({cos_id: ceId, content: newContent}),  
  })  
  .then(response => response.json())  
  .then(data => {  
    // Check if the update was successful  
    if (data.success) {  
      // Update the UI to show the new content  
      const ceContentCell = row.querySelector('.ce-content-cell');  
      ceContentCell.textContent = newContent;  
      // Change the "Save" button back to an "Edit" button  
      const editButton = row.querySelector('.edit-ce-button');  
      editButton.classList.remove('d-none');  
      event.target.classList.add('d-none');  
    } else {  
      console.error('Error updating CE:', data.error);  
    }  
  })  
  .catch(error => console.error('Error:', error));  
}  
  
function handleDeleteButtonClick(event) {  
  const row = event.target.closest('tr');  
  const ceId = row.dataset.ceId;  
  // Send a delete request to the server  
  fetch(`/delete_cos`, {  
    method: 'POST',  
    headers: {'Content-Type': 'application/json'},  
    body: JSON.stringify({cos_id: ceId}),  
  })  
  .then(response => response.json())  
  .then(data => {  
    // Check if the delete was successful  
    if (data.success) {  
      // Remove the row from the table  
      row.remove();  
    } else {  
      console.error('Error deleting CE:', data.error);  
    }  
  })  
  .catch(error => console.error('Error:', error));  
}  
  
function handleAnalyzeButtonClick(event) {  
  const row = event.target.closest('tr');  
  const ceId = row.dataset.ceId;  
  // Send the COS/CE content to the server for analysis  
  fetch(`/analyze_cos/${ceId}`)  
  .then(response => response.json())  
  .then(data => {  
    // Display the analysis results  
    if (data.analyzed_cos) {  
      // Update the UI with the analyzed data  
      // This could be displaying a modal, updating a field, etc.  
      console.log('Analyzed COS:', data.analyzed_cos);  
    } else {  
      console.error('Error analyzing COS:', data.error);  
    }  
  })  
  .catch(error => console.error('Error:', error));  
}  