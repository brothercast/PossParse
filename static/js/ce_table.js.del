import { displayCEModal } from './ce_cards.js';

function handleCEPillClick(event) {
  const ceId = event.target.dataset.ceId;
  const ceType = event.currentTarget.dataset.ceType || "Default";
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
      displayCEModal(data.modal_html, ceId, ceType, cosContent, phaseName, phaseIndex, data.ai_generated_data);
    } else {
      throw new Error('Modal HTML content not found or error in response');
    }
  })
  .catch(error => console.error('Error fetching modal content:', error));
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
    if (data.analysis_results) { // Corrected: Check for data.analysis_results instead of data.analyzed_cos (based on routes.py response)
      // Update the UI with the analyzed data
      const cosContentCell = row.querySelector('.cos-content-cell');
      cosContentCell.innerHTML = data.analysis_results.content_with_ce;
      initializeCEPillEventListeners(); // Re-initialize CE pill event listeners after content update
    } else {
      console.error('Error analyzing COS:', data.error);
    }
  })
  .catch(error => console.error('Error:', error));
}

export { handleCEPillClick }; // Only export handleCEPillClick, other functions are internal to this module.