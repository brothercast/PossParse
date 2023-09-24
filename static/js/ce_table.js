// Function to handle the click event on CE pills
function handleCEPillClick(event) {
  const ceId = event.target.dataset.ceId;
  fetch(`/get_ce_by_id?ce_id=${ceId}`)
    .then((response) => response.json())
    .then((data) => {
      if (!data.error && data.ce.ce_type) {
        showCEModal(data.ce);
      } else {
        analyzeCE(ceId, data.ce);
      }
    })
    .catch((error) => {
      console.log('Error:', error);
    });
}

// Function to analyze the CE and get the CE type
function analyzeCE(ceId, ceData) {
  fetch(`/get_ce_by_id?ce_id=${ceId}`)
    .then((response) => response.json())
    .then((data) => {
      const cosContent = data.ce.content;
      fetch('/analyze_ce_type', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cos_content: cosContent }),
      })
        .then((response) => response.json())
        .then((data) => {
          updateCEwithAnalyzedCE(ceId, data.ce);
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
  fetch(`/update_ce_type?ce_id=${ceId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ce_type: ceType }),
  })
    .then((response) => response.json())
    .then((data) => {
      // Check if the CE data includes the ce_type property
      if (data.ce.ce_type) {
        showCEModal(data.ce);
      } else {
        showCEModal(ceData);
      }
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
    const ceContent = document.createElement('h2');
    ceContent.textContent = ceData.content;

    const ceType = document.createElement('p');
    ceType.textContent = `CE Type: ${ceData.ce_type}`;

    modalBody.appendChild(ceContent);
    modalBody.appendChild(ceType);
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

// Add event listeners to CE pills
document.addEventListener('DOMContentLoaded', () => {
  const cePills = document.querySelectorAll('.ce-pill-button');
  cePills.forEach((pill) => {
    pill.addEventListener('click', handleCEPillClick);
  });
});