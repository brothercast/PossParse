// ce_cards.js  
  
// Function to replace CE tags with interactive Bootstrap pills  
function replaceCETagsWithPills(content) {  
  const ceTagPattern = /<ce id="(.*?)" type="(.*?)">(.*?)<\/ce>/gi;  
  return content.replace(ceTagPattern, (match, ceId, ceType, ceContent) => {  
    return `<span class="badge rounded-pill bg-secondary ce-pill" data-ce-id="${ceId}" data-ce-type="${ceType}">${ceContent}</span>`;  
  });  
}  
  
// Call this function once the content is loaded into the DOM  
document.addEventListener('DOMContentLoaded', () => {  
  const cosContentCells = document.querySelectorAll('.cos-content-cell');  
  cosContentCells.forEach(cell => {  
    cell.innerHTML = replaceCETagsWithPills(cell.innerHTML);  
  });  
});  

  
// Function to fetch and display CE details  
function fetchCEDetails(ceId) {  
  fetch(`/get_ce_by_id?ce_id=${ceId}`)  
    .then(response => response.json())  
    .then(data => {  
      if (data.ce) {  
        showCEModal(data.ce);  
      } else {  
        console.error('CE data not found:', data);  
      }  
    })  
    .catch(error => {  
      console.error('Error fetching CE data:', error);  
    });  
}  
  
// Function to dynamically create and display the CE details in a modal using Bootstrap  
function showCEModal(ceData) {  
  // Create the modal elements  
  const modalDiv = document.createElement('div');  
  modalDiv.classList.add('modal', 'fade');  
  modalDiv.id = 'ceModal';  
  modalDiv.setAttribute('tabindex', '-1');  
  modalDiv.setAttribute('role', 'dialog');  
  modalDiv.setAttribute('aria-labelledby', 'ceModalLabel');  
  modalDiv.setAttribute('aria-hidden', 'true');  
  
  const modalDialogDiv = document.createElement('div');  
  modalDialogDiv.classList.add('modal-dialog');  
  modalDialogDiv.setAttribute('role', 'document');  
  
  const modalContentDiv = document.createElement('div');  
  modalContentDiv.classList.add('modal-content');  
  
  const modalHeaderDiv = document.createElement('div');  
  modalHeaderDiv.classList.add('modal-header');  
  
  const modalTitleH5 = document.createElement('h5');  
  modalTitleH5.classList.add('modal-title');  
  modalTitleH5.id = 'ceModalLabel';  
  modalTitleH5.textContent = 'Conditional Element Details';  
  
  const closeButton = document.createElement('button');  
  closeButton.classList.add('close');  
  closeButton.setAttribute('type', 'button');  
  closeButton.setAttribute('data-bs-dismiss', 'modal');  
  closeButton.setAttribute('aria-label', 'Close');  
  closeButton.innerHTML = '<span aria-hidden="true">&times;</span>';  
  
  modalHeaderDiv.appendChild(modalTitleH5);  
  modalHeaderDiv.appendChild(closeButton);  
  
  const modalBodyDiv = document.createElement('div');  
  modalBodyDiv.classList.add('modal-body');  
  modalBodyDiv.innerHTML = `  
    <p><strong>ID:</strong> ${ceData.id}</p>  
    <p><strong>Content:</strong> ${ceData.content}</p>  
    <p><strong>Type:</strong> ${ceData.node_type || 'Unknown'}</p>  
  `;  
  
  modalContentDiv.appendChild(modalHeaderDiv);  
  modalContentDiv.appendChild(modalBodyDiv);  
  
  modalDialogDiv.appendChild(modalContentDiv);  
  modalDiv.appendChild(modalDialogDiv);  
  
  // Append the modal to the body and show it  
  document.body.appendChild(modalDiv);  
  const bootstrapModal = new bootstrap.Modal(modalDiv);  
  bootstrapModal.show();  
  
  // Event listener to remove the modal from the DOM once it's closed  
  modalDiv.addEventListener('hidden.bs.modal', function () {  
    modalDiv.remove();  
  });  
}  


function addEventListenersToCEPills() {  
  // Select all CE pills and add click event listeners  
  document.querySelectorAll('.ce-pill').forEach(pill => {  
    pill.addEventListener('click', handleCEPillClick);  
  });  
}  

// Initialization function that encapsulates all the necessary initialization logic  
function initialize() {  
  const cosContentContainers = document.querySelectorAll('.cos-content-container');  
  cosContentContainers.forEach(container => {  
    const contentWithCE = container.innerHTML;  
    container.innerHTML = replaceCETagsWithPills(contentWithCE);  
  });  
  
  // Add event listeners to the newly created CE pills  
  addEventListenersToCEPills();  
}  
  
// When the DOM is fully loaded, execute the initialization function  
document.addEventListener('DOMContentLoaded', initialize);  
