document.addEventListener('DOMContentLoaded', function () {  
  initializeCETable();  
  setupEventListeners();  
});  
  
function initializeCETable() {  
  const cosContentCells = document.querySelectorAll('.cos-content-cell');  
  cosContentCells.forEach(cell => {  
    cell.innerHTML = replaceCETagsWithPills(cell.innerHTML);  
  });  
}  
  
function replaceCETagsWithPills(content) {  
  const ceTagPattern = /<ce id="(.*?)" type="(.*?)">(.*?)<\/ce>/gi;  
  return content.replace(ceTagPattern, (match, ceId, ceType, ceContent) => {  
    return `<span class="badge rounded-pill bg-secondary ce-pill" data-ce-id="${ceId}" data-ce-type="${ceType}" contenteditable="false">${ceContent}</span>`;  
  });  
}  
  
function setupEventListeners() {  
  document.addEventListener('click', event => {  
    if (event.target.matches('.ce-pill')) {  
      handleCEPillClick(event);  
    } else if (event.target.matches('.btn-save-changes')) {  
      handleSaveChanges(event);  
    }  
  });  
}  
  
function handleCEPillClick(event) {  
  const ceId = event.target.dataset.ceId;  
  const ceType = event.target.dataset.ceType || "Default";  
  fetchCEDataAndDisplayModal(ceId, ceType);  
}  
  
function fetchCEDataAndDisplayModal(ceId, ceType) {  
  fetch(`/get_ce_by_id/${encodeURIComponent(ceId)}`)  
    .then(response => response.json())  
    .then(data => {  
      if (data && data.ce) {  
        const ceData = data.ce;  
        fetch(`/get_ce_modal/${encodeURIComponent(ceType)}`)  
          .then(response => response.json())  
          .then(modalData => {  
            if (modalData && modalData.modal_html) {  
              displayCEModal(modalData.modal_html, ceData, data.cos_content);  
            } else {  
              throw new Error('Modal HTML content not found or error in response');  
            }  
          })  
          .catch(error => console.error('Error fetching modal content:', error));  
      } else {  
        throw new Error('CE data not found or error in response');  
      }  
    })  
    .catch(error => console.error('Error fetching CE details:', error));  
}  
  
function displayCEModal(modalHtml, ceData, cosContent) {  
  const modalContainer = document.getElementById('dynamicModalContainer');  
  if (!modalContainer) {  
    console.error('Modal container element not found in the DOM');  
    return;  
  }  
  
  modalContainer.innerHTML = modalHtml;  
  
  const modalElement = modalContainer.querySelector('.modal');  
  if (modalElement) {  
    modalElement.id = `ceModal-${ceData.id}`;  
  }  
  
  // Update the modal with the CE data and COS content  
  const modalTitle = modalContainer.querySelector('.modal-title');  
  if (modalTitle) {  
    modalTitle.innerHTML = `<i class="${ceData.icon}"></i> ${ceData.definition}`;  
  }  
  
  const cosContentElement = modalContainer.querySelector('.ai-generated-data');  
  if (cosContentElement) {  
    cosContentElement.innerHTML = `<h6>Parent COS: ${cosContent}</h6><p>${ceData.ai_data}</p>`;  
  }  
  
  setTimeout(() => {  
    const modalElement = modalContainer.querySelector(`#ceModal-${ceData.id}`);  
    if (modalElement) {  
      $(`#${modalElement.id}`).modal('show');  
    } else {  
      console.error(`Modal element not found in the DOM for CE ID: ${ceData.id}`);  
    }  
  }, 100);  
}  
  
function handleSaveChanges(event) {  
  const ceId = event.target.dataset.ceId;  
  const form = document.querySelector(`form[data-ce-id="${ceId}"]`);  
  if (form) {  
    const formData = collectFormData(form);  
    saveCEData(ceId, formData);  
  } else {  
    console.error('Form not found');  
  }  
}  
  
function collectFormData(form) {  
  const formData = new FormData(form);  
  const data = {};  
  formData.forEach((value, key) => data[key] = value);  
  return data;  
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
        $(`#ceModal-${ceId}`).modal('hide');  
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


  
function handleSpeculate(event) {  
  const button = event.target;  
  speculate(button);  
}  
  
function speculate(button) {  
  const ceType = button.closest('.modal').id.replace('ceModal-', '');  
  const cosText = ''; // Retrieve the COS text relevant for speculation  
  const ssolGoal = ''; // Retrieve the SSOL goal relevant for speculation  
  const ceId = ''; // Retrieve the CE ID relevant for speculation  
  
  try {  
    const aiMessage = generate_ai_query(cosText, ceId, ceType, ssolGoal);  
    fetchAIResponse(aiMessage)  
      .then(aiResponse => {  
        const tableContainer = document.querySelector(`#tableContainer${ceType}`);  
        const newRow = document.createElement('tr');  
        newRow.innerHTML = `<td>${aiResponse}</td>`;  
        const table = tableContainer.querySelector('table tbody');  
        table.appendChild(newRow);  
      })  
      .catch(error => {  
        console.error('Error speculating AI response:', error);  
      });  
  } catch (error) {  
    console.error('Error speculating AI response:', error);  
  }  
}  
  
async function fetchAIResponse(aiMessage) {  
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
  
  const responseData = await response.json();  
  return responseData;  
}  
