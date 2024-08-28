import {  
  applyTextillateEffect,  
  handleEditButtonClick,  
  handleSaveButtonClick,  
  handleCancelButtonClick,  
  regenerateGoals,  
  showLoadingSpinner,  
  hideLoadingSpinner,  
  initializeEventListeners,  
} from './base_functions.js';  

document.addEventListener('DOMContentLoaded', () => {  
  initializeEventListeners();  

  const goalCardsContainer = document.querySelector('.card-container');  
  if (goalCardsContainer) {  
      const domainElements = goalCardsContainer.querySelectorAll('.domain');  
      const titleElements = goalCardsContainer.querySelectorAll('.card-title');  

      // Apply the text animation effect to the title elements  
      applyTextillateEffect(titleElements, 1.5, 0);  

      // Trigger the animations with a staggered delay  
      domainElements.forEach((element, index) => {  
          const staggerDelay = index * 250; // Adjust the delay time as needed  
          setTimeout(() => {  
              $(element).fadeIn(1000);  
          }, staggerDelay);  
      });  

      titleElements.forEach((element, index) => {  
          const staggerDelay = index * 250; // Adjust the delay time as needed  
          setTimeout(() => {  
              $(element).textillate('start');  
          }, staggerDelay);  
      });  
  } else {  
      console.error('goalCardsContainer element not found.');  
  }  

  const speculateButton = document.getElementById('generate-new-goals');  
  if (speculateButton) {  
      speculateButton.addEventListener('click', (event) => regenerateGoals(event));  
  } else {  
      console.error('Speculate New Outcomes button not found.');  
  }  

  const goalSelectionForms = document.querySelectorAll('.goal-selection-form');  
  if (goalSelectionForms.length > 0) {  
      goalSelectionForms.forEach((form) => {  
          form.addEventListener('submit', (event) => {  
              event.preventDefault();  
              const iconClass = form.querySelector('input[name="domain_icon"]').value;  
              showLoadingSpinner('Speculating Structured Solution...', iconClass);  
              form.submit();  
          });  
      });  
  } else {  
      console.error('Goal selection forms not found.');  
  }  

  // Event listeners for the edit, save, and cancel buttons  
  const editButtons = document.querySelectorAll('.edit-user-input');  
  editButtons.forEach(button => button.addEventListener('click', handleEditButtonClick));  

  const saveButtons = document.querySelectorAll('.save-user-input');  
  saveButtons.forEach(button => button.addEventListener('click', handleSaveButtonClick));  

  const cancelButtons = document.querySelectorAll('.cancel-user-input');  
  cancelButtons.forEach(button => button.addEventListener('click', handleCancelButtonClick));  
});  

function initializeEventListeners() {  
  document.querySelectorAll('.goal-selection-form').forEach(form => {  
      form.addEventListener('submit', (event) => {  
          event.preventDefault();  
          const iconClass = event.target.querySelector('input[name="domain_icon"]').value;  
          showLoadingSpinner('Speculating Structured Solution...', iconClass);  
          form.submit();  
      });  
  });  

  document.getElementById('generate-new-goals').addEventListener('click', () => {  
      const userInput = document.querySelector('.user-input').textContent.trim();  
      showLoadingSpinner('Speculating New Outcomes...', 'fas fa-sync-alt');  
      regenerateGoals(userInput);  
  });  
}  
