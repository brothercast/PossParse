// Function to handle the click event on CE pills
function handleCEPillClick(event) {
  const ceId = event.target.dataset.ceId;

  // AJAX call to fetch CE data based on the CE ID
  fetch(`/get_ce_by_id?ce_id=${ceId}`)
    .then((response) => response.json())
    .then((data) => {
      // Check if the CE has already been analyzed
      if (data.ce.ce_type) {
        // If already analyzed, show the CE details in a modal or tooltip
        showCEModal(data.ce);
      } else {
        // If not analyzed, analyze the COS and get the CE type
        analyzeCOS(ceId, data.ce);
      }
    })
    .catch((error) => {
      console.log('Error:', error);
    });
}

// Function to analyze the COS and get the CE type
function analyzeCOS(ceId, ceData) {
  // Fetch the COS data from the backend based on the CE ID
  fetch(`/get_ce_by_id?ce_id=${ceId}`)
    .then((response) => response.json())
    .then((data) => {
      const cosContent = data.ce.content;

      // Analyze the COS to identify the CE type
      fetch('/analyze_cos_type', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cos_content: cosContent }),
      })
        .then((response) => response.json())
        .then((data) => {
          // Update the CE with the analyzed CE type
          updateCEwithAnalyzedCE(ceId, ceData, data.ce_type);
        })
        .catch((error) => {
          console.log('Error:', error);
        });
    })
    .catch((error) => {
      console.log('Error:', error);
    });
}

// Function to update the CE with the analyzed CE type
function updateCEwithAnalyzedCE(ceId, ceData, ceType) {
  // Update the CE in the backend with the analyzed CE type
  fetch(`/update_ce_type?ce_id=${ceId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ce_type: ceType }),
  })
    .then((response) => response.json())
    .then((data) => {
      // Show the CE details in a modal or tooltip
      showCEModal(data.ce);
    })
    .catch((error) => {
      console.log('Error:', error);
    });
}

// Function to create the CE modal content
function createCEModalContent(ceData) {
  const modalContent = document.createElement('div');
  modalContent.classList.add('modal-content');

  // Create the modal header
  const modalHeader = document.createElement('div');
  modalHeader.classList.add('modal-header');
  modalHeader.innerHTML = `
    <h5 class="modal-title" id="ceModalLabel">Conditional Element Details</h5>
    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
      <span aria-hidden="true">&times;</span>
    </button>
  `;

  // Create the modal body
  const modalBody = document.createElement('div');
  modalBody.classList.add('modal-body');

  // Check if the necessary data is present
  if (ceData && ceData.content) {
    const ceContent = document.createElement('h2');
    ceContent.textContent = ceData.content;

    const ceType = document.createElement('p');
    ceType.textContent = `CE Type: ${ceData.ce_type}`;

    modalBody.appendChild(ceContent);
    modalBody.appendChild(ceType);
  } else {
    // Display an error message if the data is missing
    modalBody.innerHTML = '<p>Error: Unable to load CE details.</p>';
  }
  
  // Append the header and body to the modal content
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

// Add event listeners to CE pills
document.addEventListener('DOMContentLoaded', () => {
  const cePills = document.querySelectorAll('.ce-pill-button');
  cePills.forEach((pill) => {
    pill.addEventListener('click', handleCEPillClick);
  });
});