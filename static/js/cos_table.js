// Function to handle the click event on CE pills
function handleCEPillButtonClick(event) {
  const ceId = event.target.dataset.ceId;

  // AJAX call to fetch CE data based on the CE ID
  fetch(`/get_ce_by_id?ce_id=${ceId}`)
    .then((response) => response.json())
    .then((data) => {
      // Show the CE details in a modal
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

  if (ceData && ceData.content) {
    // Check if the CE type is available
    if (ceData.ce_type) {
      const ceContent = document.createElement('h2');
      ceContent.textContent = ceData.content;

      const ceType = document.createElement('p');
      ceType.textContent = `CE Type: ${ceData.ce_type}`;

      modalBody.appendChild(ceContent);
      modalBody.appendChild(ceType);
    } else {
      const analyzingMessage = document.createElement('p');
      analyzingMessage.textContent = 'Analyzing CE Type...';

      modalBody.appendChild(analyzingMessage);
    }
  } else {
    const errorMessage = document.createElement('p');
    errorMessage.textContent = 'Error: Unable to load CE details.';
    modalBody.appendChild(errorMessage);
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

// Add event listeners to CE pills
document.addEventListener('DOMContentLoaded', () => {
  const cePills = document.querySelectorAll('.ce-pill-button');
  cePills.forEach((pill) => {
    pill.addEventListener('click', handleCEPillButtonClick);
  });
});