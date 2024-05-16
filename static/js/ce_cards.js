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
  
  const ceId = target.closest('tr').dataset.ceId;  
  const updatedContent = target.textContent.trim();  
  const formData = { content: updatedContent };  
  
  updateCE(ceId, formData, target);  
}  
  
function updateCE(ceId, formData, element) {  
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
      displayFeedback("CE updated successfully", "success");  
    } else {  
      revertCEContent(element, formData.content);  
      displayFeedback("Failed to save changes", "error");  
    }  
  })  
  .catch(error => {  
    revertCEContent(element, formData.content);  
    displayFeedback(`Error: ${error.message}`, "error");  
  });  
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
  
document.addEventListener('click', event => {  
  if (event.target.matches('.ce-pill')) {  
    const ceId = event.target.dataset.ceId;  
    fetchCEData(ceId);  
  }  
});  
  
function fetchCEData(ceId) {  
  fetch(`/get_ce_by_id/${encodeURIComponent(ceId)}`)  
    .then(response => {  
      if (!response.ok) {  
        throw new Error(`HTTP error! status: ${response.status}`);  
      }  
      return response.json();  
    })  
    .then(data => {  
      if (data.ce) {  
        console.log('Received CE data:', data.ce); // Log the received CE data  
        createAndShowCEModal(data.ce);  
      } else {  
        throw new Error('CE data not found or error in response');  
      }  
    })  
    .catch(error => {  
      console.error('Error fetching CE data:', error);  
      displayFeedback("Error fetching CE details", "error");  
    });  
} 
  
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
