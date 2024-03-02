// This function replaces CE tags with interactive pills  
function replaceCETagsWithPills(content) {  
  // Define the pattern to match CE tags with their IDs  
  const ceTagPattern = /<CE ID:([\w-]+)><\/CE>/g;  
  // Replace each CE tag with a pill element  
  return content.replace(ceTagPattern, (match, ceId) => {  
    return `<span class="ce-pill badge bg-primary" data-ce-id="${ceId}">CE</span>`;  
  });  
}  
  
// Function to add event listeners to CE pills  
function addEventListenersToCELabels() {  
  // Select all elements with the 'ce-pill' class  
  const cePills = document.querySelectorAll('.ce-pill');  
  // Add a click event listener to each pill  
  cePills.forEach((pill) => {  
    pill.addEventListener('click', (event) => {  
      const ceId = event.target.dataset.ceId;  
      // Fetch and display the CE details when a pill is clicked  
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
    });  
  });  
}   
  
// This function should be called when the server returns analyzed COS content  
function displayAnalyzedContent(content) {  
  // Replace CE tags with interactive pills  
  const updatedContentWithPills = replaceCETagsWithPills(content);  
  // Select the container where the COS content should be displayed  
  const cosContentContainer = document.getElementById('cos-content-container');  
  // Check if the container exists  
  if (cosContentContainer) {  
    // Update the container's HTML with the new content containing pills  
    cosContentContainer.innerHTML = updatedContentWithPills;  
    // Add event listeners to the newly created pills  
    addEventListenersToCEPills();  
  } else {  
    console.error('COS content container not found');  
  }  
}  
  
// This function creates the content for the CE modal  
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
    const ceContent = document.createElement('p');  
    ceContent.textContent = `Content: ${ceData.content}`;  
  
    const ceType = document.createElement('p');  
    ceType.textContent = `Type: ${ceData.condition_type || 'Not specified'}`;  
  
    modalBody.appendChild(ceContent);  
    modalBody.appendChild(ceType);  
  } else {  
    // Display an error message if the data is missing  
    modalBody.innerHTML = '<p>Error: Unable to load CE details.</p>';  
  }  
  
  // Append the header and body to the modal content  
  modalContent.appendChild(modalHeader);  
  modalContent.appendChild(modalBody);  
  
  return modalContent.outerHTML; // Return the HTML string of the modal content  
}  
  
// This function displays the CE modal  
function showCEModal(ceData) {
  // Create the modal content dynamically based on the CE data  
  const modalContent = document.createElement('div');
  modalContent.classList.add('modal-content');
  
  // Create the modal header  
  const modalHeader = document.createElement('div');
  modalHeader.classList.add('modal-header');
  modalHeader.innerHTML = `  
    <h5 class="modal-title" id="ceModalLabel">Conditional Element Details</h5>  
    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>  
  `;
  
  // Create the modal body  
  const modalBody = document.createElement('div');
  modalBody.classList.add('modal-body');
  modalBody.innerHTML = `  
    <p><strong>Content:</strong> ${ceData.content}</p>  
    <p><strong>Type:</strong> ${ceData.condition_type || 'Not specified'}</p>  
    <p><strong>Status:</strong> ${ceData.is_satisfied ? 'Satisfied' : 'Not satisfied'}</p>  
  `;
  
  // Create the modal footer  
  const modalFooter = document.createElement('div');
  modalFooter.classList.add('modal-footer');
  modalFooter.innerHTML = `  
    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>  
  `;
  
  // Append header, body, and footer to the modal content  
  modalContent.appendChild(modalHeader);
  modalContent.appendChild(modalBody);
  modalContent.appendChild(modalFooter);
  
  // Get the modal container element from the DOM  
  const modalContainer = document.getElementById('ceModalContainer');
  modalContainer.innerHTML = ''; // Clear any existing content  
  modalContainer.appendChild(modalContent);
  
  const modalElement = new bootstrap.Modal(document.getElementById('ceModalContainer'));
  modalElement.show();
  
  
  // Add event listeners to CE pills  
  document.addEventListener('DOMContentLoaded', () => {
    const cePills = document.querySelectorAll('.ce-pill');
    cePills.forEach((pill) => {
      pill.addEventListener('click', (event) => {
        const ceId = event.target.dataset.ceId;
        // Fetch CE data from the server  
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
      });
    });
  });

  

  // Function to add click event listeners to the CE pills  
  function addEventListenersToCELabels() {
    // Select all elements with the 'ce-pill' class  
    const cePills = document.querySelectorAll('.ce-pill');
    // Add a click event listener to each pill  
    cePills.forEach((pill) => {
      pill.addEventListener('click', (event) => {
        const ceId = event.target.dataset.ceId;
        // Fetch and display the CE details when a pill is clicked  
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
      });
    });

  // Call the function to add event listeners once the DOM content is fully loaded  
  document.addEventListener('DOMContentLoaded', addEventListenersToCELabels);  

    // This function should be called when the server returns analyzed COS content  
    function displayAnalyzedContent(content) {
      // Replace CE tags with interactive pills  
      const updatedContentWithPills = replaceCETagsWithPills(content);
      // Select the container where the COS content should be displayed  
      const cosContentContainer = document.getElementById('cos-content-container');
      // Check if the container exists  
      if (cosContentContainer) {
        // Update the container's HTML with the new content containing pills  
        cosContentContainer.innerHTML = updatedContentWithPills;
        // Add event listeners to the newly created pills  
        addEventListenersToCEPills();
      } else {
        console.error('COS content container not found');
      }
    }
  
   
    // Add a click event listener to each pill  
    cePills.forEach((pill) => {
      pill.addEventListener('click', (event) => {
        // Extract the CE ID from the data attribute of the clicked pill  
        const ceId = event.target.dataset.ceId;
        
        // Fetch and display the CE details using the CE ID  
        fetchCEDetails(ceId);
      });
    });
  
    // Function to fetch CE details from the server and display them  
    function fetchCEDetails(ceId) {
      // Make an AJAX call to the server to fetch CE details by CE ID  
      fetch(`/get_ce_by_id?ce_id=${ceId}`)
        .then((response) => response.json())
        .then((data) => {
          if (data.ce) {
            // If CE details are found, display them (e.g., in a modal or a dedicated section)  
            displayCEDetails(data.ce);
          } else {
            console.error('CE details not found:', data);
          }
        })
        .catch((error) => {
          console.error('Error fetching CE details:', error);
        });
    }
  
    // Function to display CE details (e.g., in a modal)  
    function displayCEDetails(ceData) {
      const ceDetailsModal = document.getElementById('ceDetailsModal');
      const ceContentElement = ceDetailsModal.querySelector('.ce-content');
      const ceTypeElement = ceDetailsModal.querySelector('.ce-type');
    
      // Populate the modal fields with CE data  
      ceContentElement.textContent = ceData.content;
      ceTypeElement.textContent = ceData.condition_type;
    
      // Show the modal (this will depend on how your modals are implemented)  
      $('#ceDetailsModal').modal('show');
    }
  
    // Call the function to add event listeners once the DOM content is fully loaded  
    document.addEventListener('DOMContentLoaded', () => {
      addEventListenersToCEPills();
    });
  }
}