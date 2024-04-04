// ce_cards.js  
  
// Function to replace CE tags with interactive Bootstrap pills  
function replaceCETagsWithPills(content) {  
  // Define the pattern to match CE tags with their IDs  
  const ceTagPattern = /<ce id='(.*?)' type='(.*?)'>(.*?)<\/ce>/gi;  
  // Replace each CE tag with a Bootstrap pill element  
  return content.replace(ceTagPattern, (match, ceId, ceType, ceContent) => {  
    return `<span class="badge rounded-pill bg-secondary ce-pill" data-ce-id="${ceId}" data-ce-type="${ceType}">${ceContent}</span>`;  
  });  
}  
  
// Function to add event listeners to CE pills  
function addEventListenersToCEPills() {  
  // Select all elements with the 'ce-pill' class  
  const cePills = document.querySelectorAll('.ce-pill');  
  // Add a click event listener to each pill  
  cePills.forEach((pill) => {  
    pill.addEventListener('click', (event) => {  
      const ceId = event.target.dataset.ceId;  
      // Fetch and display the CE details when a pill is clicked  
      fetchCEDetails(ceId);  
    });  
  });  
}  
  
// Function to fetch and display CE details  
function fetchCEDetails(ceId) {  
  fetch(`/get_ce_by_id?ce_id=${ceId}`)  
    .then((response) => response.json())  
    .then((data) => {  
      if (data.ce) {  
        showCEModal(data.ce);  
      } else {  
        console.error('CE data not found:', data);  
      }  
    })  
    .catch((error) => {  
      console.error('Error fetching CE data:', error);  
    });  
}  
  
// Function to display the CE details in a modal using Bootstrap  
function showCEModal(ceData) {  
  // Get the modal elements  
  const modalBody = document.getElementById('ceModalBody');  
  
  if (modalBody) {  
    // Set the content  
    modalBody.innerHTML = `  
      <p><strong>ID:</strong> ${ceData.id}</p>  
      <p><strong>Content:</strong> ${ceData.content}</p>  
      <p><strong>Type:</strong> ${ceData.node_type || 'Unknown'}</p>  
    `;  
  
    // Show the modal using Bootstrap's modal method  
    const bootstrapModal = new bootstrap.Modal(document.getElementById('ceModal'));  
    bootstrapModal.show();  
  } else {  
    console.error('Modal body element not found');  
  }  
}  
  
// When the DOM is fully loaded, add event listeners to CE pills if they exist  
document.addEventListener('DOMContentLoaded', () => {  
  const cosContentContainer = document.getElementById('cos-content-container');  
  if (cosContentContainer) {  
    const contentWithCE = cosContentContainer.innerHTML;  
    cosContentContainer.innerHTML = replaceCETagsWithPills(contentWithCE);  
    addEventListenersToCEPills();  
  } else {  
    console.error('COS content container not found');  
  }  
});  

// When the DOM is fully loaded, add event listeners to CE pills if they exist  
document.addEventListener('DOMContentLoaded', () => {  
  // Select all elements that contain COS content  
  const cosItems = document.querySelectorAll('.cos-item');  
  cosItems.forEach((cosItem) => {  
    const content = cosItem.innerHTML;  
    cosItem.innerHTML = replaceCETagsWithPills(content);  
  });  
  // Add event listeners to the newly created CE pills  
  addEventListenersToCEPills();  
}); 