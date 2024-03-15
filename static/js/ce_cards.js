// ce_cards.js  
  
// Function to replace CE tags with interactive Bootstrap pills  
function replaceCETagsWithPills(content) {  
  // Define the pattern to match CE tags with their IDs  
  const ceTagPattern = /<ce>(.*?)<\/ce>/gi; // Ensure global and case-insensitive flags are set  
  // Replace each CE tag with a Bootstrap pill element  
  return content.replace(ceTagPattern, (match, ceContent) => {  
    const ceId = uuidv4(); // Generate a unique ID for each CE. You need to define the uuidv4 function or use a library that provides UUID generation.  
    return `<span class="badge rounded-pill bg-secondary ce-pill" data-ce-id="${ceId}">${ceContent}</span>`;  
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
  const modalTitle = document.getElementById('ceModalTitle');  
  const modalBody = document.getElementById('ceModalBody');  
  
  // Set the content  
  modalTitle.textContent = 'Conditional Element Details';  
  modalBody.innerHTML = `  
    <p><strong>ID:</strong> ${ceData.id}</p>  
    <p><strong>Content:</strong> ${ceData.content}</p>  
    <p><strong>Type:</strong> ${ceData.node_type || 'Unknown'}</p>  
  `;  
  
  // Show the modal using Bootstrap's modal method  
  const bootstrapModal = new bootstrap.Modal(document.getElementById('ceModal'));  
  bootstrapModal.show();  
}  
  
// Function to fetch analyzed COS content and display it  
function fetchAndDisplayAnalyzedCOS(cosId) {  
  fetch(`/analyze_cos/${cosId}`)  
    .then(response => response.json())  
    .then(data => {  
      if (data.content_with_ce) {  
        const cosContentContainer = document.getElementById('cos-content-container');  
        cosContentContainer.innerHTML = replaceCETagsWithPills(data.content_with_ce);  
        addEventListenersToCEPills();  
      }  
    })  
    .catch(error => console.error('Error fetching analyzed COS content:', error));  
}  
  
// Generate a UUID for the CE. This is a placeholder function.  
function uuidv4() {  
  return 'xxxx-xxxx-4xxx-yxxx-xxxx-yyyy'.replace(/[xy]/g, function(c) {  
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);  
    return v.toString(16);  
  });  
}  
  
// When the DOM is fully loaded, fetch and display the analyzed COS content  
document.addEventListener('DOMContentLoaded', () => {  
  const cosId = document.querySelector('[data-cos-id]').dataset.cosId; // Get the COS ID from a data attribute  
  fetchAndDisplayAnalyzedCOS(cosId); // Call the function to fetch and display the content  
});  

function addEventListenersToCELabels() {  
  // Select all elements with the 'ce-label' class (or any other class or selector used for CE labels)  
  const ceLabels = document.querySelectorAll('.ce-label');  
  // Add a click event listener to each label  
  ceLabels.forEach((label) => {  
    label.addEventListener('click', (event) => {  
      const ceId = event.target.dataset.ceId;  
      // Fetch and display the CE details when a label is clicked  
      fetchCEDetails(ceId);  
    });  
  });  
}  

document.querySelectorAll('.ce-pill').forEach(pill => {  
  pill.addEventListener('click', event => {  
    const ceId = event.target.dataset.ceId;  
    fetch(`/get_ce_details/${ceId}`)  
      .then(response => response.json())  
      .then(data => {  
        if (data.ce) {  
          showCEDetailsModal(data.ce);  
        }  
      });  
  });  
});  