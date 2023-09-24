import {
  applyTextillateEffect,
  handleEditButtonClick,
  handleSaveButtonClick,
  handleCancelButtonClick,
  regenerateGoals,
  initializeEventListeners,
  showLoadingSpinner,
} from './base_functions.js';

document.addEventListener('DOMContentLoaded', () => {
  initializeEventListeners();

  // Apply the animation effect after the cards are updated
  const goalCardsContainer = document.querySelector('.card-container');
  if (goalCardsContainer) {
    const domainElements = goalCardsContainer.querySelectorAll('.domain, .fa-2x');
    const titleElements = goalCardsContainer.querySelectorAll('.card-title');

    applyTextillateEffect(domainElements, 1.5, 0, true);
    applyTextillateEffect(titleElements, 1.5, 0);

    // Trigger the animations after a delay to ensure smooth execution
    setTimeout(() => {
      domainElements.forEach((element) => {
        $(element).textillate('start');
      });

      titleElements.forEach((element) => {
        $(element).textillate('start');
      });
    }, 1000); // Delay the animation trigger by 1 second
  } else {
    console.error('goalCardsContainer element not found.');
  }
});

// Initialize event listeners for edit, save, and cancel buttons
initializeEventListeners();

// Initialize event listener for "Speculate New Outcomes" button
const speculateButton = document.getElementById('generate-new-goals');
if (speculateButton) {
  speculateButton.addEventListener('click', (event) => regenerateGoals(event));
} else {
  console.error('Speculate New Outcomes button not found.');
}

// Add event listener for goal selection buttons
const goalSelectionForms = document.querySelectorAll('.goal-selection-form');
if (goalSelectionForms) {
  goalSelectionForms.forEach((form) => {
    form.addEventListener('submit', () => {
      showLoadingSpinner();
    });
  });
} else {
  console.error('Goal selection forms not found.');
}