// ce_cards.js  
  
document.addEventListener('DOMContentLoaded', function () {  
  initializeCETable();  
});  
  
function initializeCETable() {  
  const cosContentCells = document.querySelectorAll('.cos-content-cell');  
  cosContentCells.forEach(cell => {  
    cell.innerHTML = replaceCETagsWithPills(cell.innerHTML);  
    cell.addEventListener('dblclick', enableInlineEditing);  
    cell.addEventListener('blur', saveInlineEdit);  
    cell.addEventListener('keypress', function (e) {  
      if (e.key === 'Enter') {  
        e.preventDefault(); // Prevent newline on Enter  
        cell.blur();  
      }  
    });  
  });  
}  
  
function replaceCETagsWithPills(content) {  
  const ceTagPattern = /<ce id="(.*?)" type="(.*?)">(.*?)<\/ce>/gi;  
  return content.replace(ceTagPattern, (match, ceId, ceType, ceContent) => {  
    return `<span class="badge rounded-pill bg-secondary ce-pill" data-ce-id="${ceId}" data-ce-type="${ceType}" contenteditable="false">${ceContent}</span>`;  
  });  
}  

  
function enableInlineEditing(event) {  
  const target = event.target;  
  target.setAttribute('contenteditable', 'true');  
  target.focus();  
}  
  
function saveInlineEdit(event) {  
  const target = event.target;  
  target.removeAttribute('contenteditable');  
    
  const row = target.closest('tr');  
  const ceId = row.dataset.ceId;  
  const ssolId = row.dataset.ssolId; // Assuming the SSOL ID is stored in a data attribute on the row  
  const updatedContent = target.textContent.trim();  
  const formData = {  
    content: updatedContent,  
    ssol_id: ssolId // Including the SSOL ID in the payload if required by the server  
  };  
    
  updateCE(ceId, formData, target);  
}  

  
async function updateCE(ceId, formData) {  
  try {  
    const response = await fetch(`/update_ce/${encodeURIComponent(ceId)}`, {  
      method: 'PUT',  
      headers: {  
        'Content-Type': 'application/json'  
      },  
      body: JSON.stringify(formData)  
    });  
    const data = await response.json();  
    if (data.success) {  
      displayFeedback("CE updated successfully", "success");  
    } else {  
      throw new Error('Failed to update CE');  
    }  
  } catch (error) {  
    displayFeedback(`Error: ${error.message}`, "error");  
  }  
}  
  
function revertCEContent(element, originalContent) {  
  if (element) {  
    element.textContent = originalContent;  
  }  
}  
  
function displayFeedback(message, type) {  
  const feedbackElement = document.querySelector('#feedback');  
  if (feedbackElement) {  
    feedbackElement.textContent = message;  
    feedbackElement.className = `feedback ${type}`;  
    feedbackElement.style.display = 'block';  
    setTimeout(() => {  
      feedbackElement.style.display = 'none';  
    }, 5000);  
  }  
}  
  
// Event listener for CE pills  
document.addEventListener('click', event => {  
  if (event.target.matches('.ce-pill')) {  
    const ceId = event.target.dataset.ceId;  
    fetchCEDataAndDisplayModal(ceId);  
  }  
});   

function openCEModal(ceId) {  
  fetch(`/get_ce_modal/${encodeURIComponent(ceId)}`)  
      .then(response => response.json())  
      .then(data => {  
          if (data.modal_html) {  
              displayCEModal(data.modal_html);  
          } else {  
              throw new Error('Modal HTML content not found or error in response');  
          }  
      })  
      .catch(error => {  
          console.error('Error fetching CE details:', error);  
      });  
}   

function displayCEModal(modalHtml) {  
  const modalContainer = document.getElementById('dynamicModalContainer');  
  if (!modalContainer) {  
    console.error('Modal container element not found in the DOM');  
    return;  
  }  
  modalContainer.innerHTML = modalHtml;  
  $(modalContainer).find('.modal').modal('show');  
}  


  
// Helper function to handle the modal display after fetching modal content  
function fetchCEDataAndDisplayModal(ceId) {  
  fetch(`/get_ce_by_id/${encodeURIComponent(ceId)}`)  
    .then(response => response.json())  
    .then(ceData => {  
      if (ceData && ceData.ce) {  
        fetch(`/get_ce_modal/${encodeURIComponent(ceId)}`)  
          .then(response => response.json())  
          .then(modalData => {  
            if (modalData && modalData.modal_html) {  
              displayCEModal(modalData.modal_html, ceData.ce); // Pass ceData.ce to the function  
            } else {  
              throw new Error('Modal HTML content not found or error in response');  
            }  
          });  
      } else {  
        throw new Error('CE data not found or error in response');  
      }  
    })  
    .catch(error => console.error('Error fetching CE details:', error));  
}  
  
// Function to display the CE modal  
function displayCEModal(modalHtml, ceData) {  
  if (!modalHtml || !ceData) {  
    console.error('displayCEModal called with invalid arguments:', modalHtml, ceData);  
    return;  
  }  
  
  const modalContainer = document.getElementById('dynamicModalContainer');  
  if (!modalContainer) {  
    console.error('Modal container element not found in the DOM');  
    return;  
  }  
  modalContainer.innerHTML = modalHtml;  
  
  // Assuming we have a modal ID format like `#ceModal${ceId}`  
  const modalId = `ceModal${ceData.id}`;  
  const modalElement = document.getElementById(modalId);  
  if (modalElement) {  
    $(`#${modalId}`).modal('show');  
  } else {  
    console.error('Modal element not found in the DOM:', modalId);  
  }  
}  
  
  
// Event listener for clicking on CE pills to open the modal  
document.addEventListener('click', event => {  
  if (event.target.matches('.ce-pill')) {  
    const ceId = event.target.dataset.ceId;  
    fetchCEDataAndDisplayModal(ceId);  
  }  
});  


// Function to handle AI speculation  
function speculate(ceType, cosText, ssolGoal) {  
  // Prepare the AI query message  
  const aiMessage = {  
    cos_text: cosText,  
    ssol_goal: ssolGoal,  
    ce_type: ceType  
  };  
  
  // Call the function to fetch AI response  
  fetchAIResponse(aiMessage)  
    .then(aiResponse => {  
      // Process the AI response  
      // ...  
    })  
    .catch(error => {  
      console.error('Error during AI speculation:', error);  
    });  
}  
  
// Helper function to fetch AI response from Flask backend  
function fetchAIResponse(aiMessage) {  
  return fetch('/ai-query-endpoint', {  
    method: 'POST',  
    headers: {  
      'Content-Type': 'application/json'  
    },  
    body: JSON.stringify(aiMessage)  
  })  
  .then(response => {  
    if (!response.ok) {  
      throw new Error(`AI service responded with status ${response.status}`);  
    }  
    return response.json();  
  });  
}  

function displayCEModal(modalHtml, ceData) {  
  const modalContainer = document.getElementById('dynamicModalContainer');  
    
  if (!modalContainer) {  
    console.error('Modal container element not found in the DOM');  
    return;  
  }  
    
  // Set the modal HTML content to the container  
  modalContainer.innerHTML = modalHtml;  
    
  // Assuming we have a modal ID format like `#ceModal${ceId}`  
  const modalId = `ceModal${ceData.id}`;  
  const modalElement = document.getElementById(modalId);  
    
  if (modalElement) {  
    // Use jQuery to show the modal  
    $(`#${modalId}`).modal('show');  
  } else {  
    console.error('Modal element not found in the DOM:', modalId);  
  }  
}  
  
  // Event listener for the "Save changes" button within the modal  
  document.addEventListener('DOMContentLoaded', function () {
    document.addEventListener('click', function (event) {
      if (event.target.matches('.btn-save-changes')) {
        const ceId = event.target.dataset.ceId;
        const form = document.querySelector(`form[data-ce-id="${ceId}"]`);
        if (form) {
          const formData = new FormData(form);
          const data = {};
          formData.forEach((value, key) => data[key] = value);
  
          fetch(`/update_ce/${encodeURIComponent(ceId)}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
          })
            .then(response => response.json())
            .then(updateData => {
              if (updateData.success) {
                // Handle the successful update, such as updating the UI or closing the modal  
              } else {
                // Handle the error in update  
              }
            })
            .catch(updateError => {
              // Handle any errors during the update  
            });
        } else {
          console.error('Form not found');
        }
      }
    });
  });

  // Event listener for the "Save changes" button within the modal  
  document.addEventListener('DOMContentLoaded', function () {
    document.addEventListener('click', function (event) {
      if (event.target.matches('.btn-save-changes')) {
        const ceId = event.target.dataset.ceId;
        const form = document.querySelector(`form[data-ce-id="${ceId}"]`);
        if (form) {
          const formData = new FormData(form);
          const data = {};
          formData.forEach((value, key) => data[key] = value);
  
          fetch(`/update_ce/${encodeURIComponent(ceId)}`, {
            method: 'PUT', // Ensure this matches the server-side expectation  
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
          })
            .then(response => response.json())
            .then(updateData => {
              if (updateData.success) {
                // Handle the successful update, such as updating the UI or closing the modal  
                $(`#ceModal${ceType}`).modal('hide');
                displayFeedback("CE updated successfully", "success");
              } else {
                // Handle the error in update  
                displayFeedback(updateData.error || 'An error occurred while updating the CE.', "error");
              }
            })
            .catch(updateError => {
              // Handle any errors during the update  
              displayFeedback(`Error: ${updateError.message}`, "error");
            });
        } else {
          console.error('Form not found');
        }
      }
    });
  });
  
// Event listener for clicking on CE pills to open the modal  
document.addEventListener('click', event => {  
  if (event.target.matches('.ce-pill')) {  
    const ceId = event.target.dataset.ceId;  
    fetchCEDataAndDisplayModal(ceId);  
  }  
});  

  function createAndShowCEModal(ceData) {
    // Check if ceData and ceData.type are defined  
    if (!ceData || typeof ceData.type === 'undefined') {
      console.error('CE data or type is undefined');
      displayFeedback("Error: CE data or type is undefined", "error");
      return;
    }
  
    // Fetch the modal content from the server using the ceData.type  
    fetch(`/get_ce_modal/${ceData.type}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data.modal_html) {
          // Inject the modal HTML into the DOM  
          document.body.insertAdjacentHTML('beforeend', data.modal_html);
  
          // Use Bootstrap's modal method to show the modal  
          const modalId = `ceModal${ceData.type}`;
          $(`#${modalId}`).modal('show');
  
          // Attach event listener for modal close to remove it from the DOM  
          $(`#${modalId}`).on('hidden.bs.modal', function () {
            $(this).remove();
          });
        } else {
          throw new Error('Modal HTML content not found or error in response');
        }
      })
      .catch(error => {
        console.error('Error fetching modal content:', error);
        displayFeedback("Error fetching modal content", "error");
      });
  }
  
  function generateDynamicForm(ceData) {
    return `  
    <form id="ceForm" data-ce-id="${ceData.id}">  
      <div class="form-group">  
        <label for="ceContent">Content</label>  
        <textarea class="form-control" id="ceContent" required>${ceData.content}</textarea>  
      </div>  
      <div class="form-group">  
        <label for="ceType">Type</label>  
        <select class="form-control" id="ceType" required>${generateSelectOptions(ceData.node_type)}</select>  
      </div>  
      <!-- Add additional fields as needed -->  
    </form>  
  `;
  }
  
  function generateSelectOptions(selectedType) {
    // Assuming NODES contains the types and descriptions  
    return Object.entries(NODES).map(([type, { definition }]) => {
      return `<option value="${type}" ${type === selectedType ? "selected" : ""}>${definition}</option>`;
    }).join('');
  }
  
  function collectFormData(formElement) {
    const formData = {};
    formElement.querySelectorAll('input, select, textarea').forEach(input => {
      formData[input.id] = input.value;
    });
    return formData;
  }
  
  function saveCEData(ceId, formData) {
    fetch(`/update_ce/${encodeURIComponent(ceId)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          updateCERow(ceId, formData);
          $('#ceModal').modal('hide');
          displayFeedback("CE updated successfully", "success");
        } else {
          displayFeedback(data.error || 'An error occurred while updating the CE.', "error");
        }
      })
      .catch(error => {
        displayFeedback(`Error: ${error.message}`, "error");
      });
  }
  
  function updateCERow(ceId, formData) {
    const cePill = document.querySelector(`.ce-pill[data-ce-id="${ceId}"]`);
    if (cePill) {
      cePill.textContent = formData['ceContent'];
      cePill.dataset.ceType = formData['ceType'];
    }
  }

  // Event listener for the "Save changes" button within the modal  
  document.addEventListener('DOMContentLoaded', function () {
    document.addEventListener('click', function (event) {
      // Check if the clicked element is the Save changes button  
      if (event.target.matches('.btn-save-changes')) {
        const ceId = event.target.dataset.ceId;  // Retrieve CE ID stored in a data attribute  
        const form = document.querySelector(`#ceForm${ceId}`);  // Make sure the form has the correct ID  
        if (form) {
          const formData = new FormData(form);
          const data = {};
          formData.forEach((value, key) => data[key] = value);
  
          fetch(`/update_ce/${encodeURIComponent(ceId)}`, {  // Make sure to use the correct CE ID  
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
          })
            .then(response => response.json())
            .then(data => {
              // Handle the response data  
            })
            .catch(error => {
              // Handle any errors  
            });
        } else {
          console.error('Form not found');
        }
      }

    });
  });

  // Function to dynamically change the CE Type and update the modal  
  function changeCEType(ceType) {
    // Fetch the new modal content based on the selected CE Type  
    fetch(`/get_ce_modal/${encodeURIComponent(ceType)}`)
      .then(response => response.json())
      .then(data => {
        if (data.modal_html) {
          const modalContainer = document.querySelector('#dynamicModalContainer');
          modalContainer.innerHTML = data.modal_html;
        } else {
          throw new Error('Modal HTML content not found or error in response');
        }
      })
      .catch(error => {
        console.error('Error fetching modal content:', error);
      });
  }

  // Event listener for the CE Type dropdown change  
  document.addEventListener('change', event => {
    if (event.target.matches('.ce-type-dropdown')) {
      const ceType = event.target.value;
      changeCEType(ceType);
    }
  });

  // Handler for initiating speculation based on AI  
  async function speculate(button) {
    const ceType = button.closest('.modal').id.replace('ceModal', '');
    const cosText = ''; // Retrieve the COS text relevant for speculation  
    const ssolGoal = ''; // Retrieve the SSOL goal relevant for speculation  
    const ceId = ''; // Retrieve the CE ID relevant for speculation  
    
    try {
      // Use the generate_ai_query function to create the AI message  
      // This function needs to be exposed to the frontend, possibly by setting it to window object in Flask  
      const aiMessage = window.generate_ai_query(cosText, ceId, ceType, ssolGoal);
    
      // Send the AI message to the Flask backend, which will handle AI service communication  
      const aiResponse = await fetchAIResponse(aiMessage);
    
      // Add the AI-generated content to the table in the modal  
      const tableContainer = document.querySelector(`#tableContainer${ceType}`);
      const newRow = document.createElement('tr');
      newRow.innerHTML = `<td>${aiResponse}</td>`; // Adjust according to the actual AI response structure  
      const table = tableContainer.querySelector('table tbody');
      table.appendChild(newRow);
    } catch (error) {
      // Handle errors  
      console.error('Error speculating AI response:', error);
    }
  }
  
  // Helper function to fetch AI response from Flask backend  
  async function fetchAIResponse(aiMessage) {
    // Set the correct endpoint URL for the Flask route handling AI requests  
    const aiEndpoint = '/ai-query-endpoint';
  
    const response = await fetch(aiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: aiMessage })
    });
  
    if (!response.ok) {
      throw new Error(`AI service responded with status ${response.status}`);
    }
    return await response.json(); // Assuming the Flask route returns a JSON response from AI  
  }
  
  // Event listener for the speculate button  
  document.addEventListener('click', event => {
    if (event.target.matches('.speculate-button')) {
      speculate(event.target);
    }
  });