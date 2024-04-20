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
  
// Function to display the CE details in a modal using Bootstrap  
function showCEModal(ceData) {  
  const modalBody = document.getElementById('ceModalBody');  
  if (modalBody) {  
    modalBody.innerHTML = `  
      <p><strong>ID:</strong> ${ceData.id}</p>  
      <p><strong>Content:</strong> ${ceData.content}</p>  
      <p><strong>Type:</strong> ${ceData.node_type || 'Unknown'}</p>  
    `;  
    const bootstrapModal = new bootstrap.Modal(document.getElementById('ceModal'));  
    bootstrapModal.show();  
  } else {  
    console.error('Modal body element not found');  
  }  
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
