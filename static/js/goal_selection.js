// goal_selection.js
import {
    applyTextillateEffect,
    handleEditButtonClick, // For edit button
    handleSaveButtonClick, // For save button - will take a callback
    handleCancelButtonClick, // For cancel button
    regenerateGoals,
    showLoadingSpinner,
    hideLoadingSpinner,
    updateGoalCards // We'll call this directly after regenerateGoals
    // initializeEventListeners can be called if it only does generic things now
} from './base_functions.js';

// Function to apply animations to the current set of cards
function applyCardAnimations(container) {
    if (container) {
        const domainElements = container.querySelectorAll('.domain.domain-text'); // Be more specific
        const titleElements = container.querySelectorAll('.goal-description.goal-text'); // Assuming these are the titles you want to animate

        // Example of staggered fadeIn for domain text
        domainElements.forEach((element, index) => {
            const staggerDelay = index * 150; // Shorter delay
            element.style.opacity = 0; // Start hidden for fadeIn
            setTimeout(() => {
                $(element).animate({ opacity: 1 }, 700);
            }, staggerDelay);
        });

        // Apply Textillate to titles (assuming titles are inside .goal-description)
        // Note: Textillate might re-wrap content. If goal.title is short, use that.
        // If applyTextillateEffect expects NodeList and handles jQuery wrapping:
        if (titleElements.length > 0) {
            applyTextillateEffect(titleElements, 1.2, 50); // Adjusted params
        }

        // Custom animation for .goal-description spans (if you keep that)
        // This needs to be called if animateGoalText is a separate function
        // animateGoalText(); // If this function is defined and you want to use it.
    }
}


document.addEventListener('DOMContentLoaded', () => {
    const goalCardsContainer = document.querySelector('.card-container');
    const speculateButton = document.getElementById('generate-new-goals');
    const editButton = document.querySelector('.edit-user-input');
    const saveButton = document.querySelector('.save-user-input');
    const cancelButton = document.querySelector('.cancel-user-input');
    const userInputDisplay = document.querySelector('.user-input-display');
    const userInputEdit = document.querySelector('.user-input-edit');

    // Initial animations for existing cards
    if (goalCardsContainer) {
        applyCardAnimations(goalCardsContainer);
    }

    // Event listener for "Speculate New Outcomes" button
    if (speculateButton && userInputDisplay && userInputEdit) {
        speculateButton.addEventListener('click', async () => {
            let currentInputText = '';
            if (!userInputDisplay.classList.contains('d-none')) {
                currentInputText = userInputDisplay.textContent.trim();
            } else {
                currentInputText = userInputEdit.value.trim();
            }

            if (currentInputText) {
                showLoadingSpinner('Speculating New Outcomes...', 'fas fa-sync-alt');
                try {
                    const data = await regenerateGoals(currentInputText); // regenerateGoals now returns data
                    if (data && data.goals) {
                        updateGoalCards(data, currentInputText, goalCardsContainer); // Pass container
                        applyCardAnimations(goalCardsContainer); // Re-apply animations
                    } else {
                        console.error("No goals data received from regenerateGoals");
                        // Optionally show an error to the user
                    }
                } catch (error) {
                    console.error("Error regenerating goals:", error);
                    // Optionally show an error to the user
                } finally {
                    hideLoadingSpinner();
                }
            } else {
                alert("Please enter your possibility or goal.");
            }
        });
    }

    // Event listeners for edit, save, and cancel actions
    if (editButton) {
        editButton.addEventListener('click', () => handleEditButtonClick(userInputDisplay, userInputEdit, editButton, saveButton, cancelButton));
    }
    if (saveButton && userInputDisplay && userInputEdit) {
        saveButton.addEventListener('click', async () => {
            // handleSaveButtonClick now directly updates display and calls callback
            handleSaveButtonClick(userInputDisplay, userInputEdit, editButton, saveButton, cancelButton, async (updatedText) => {
                if (updatedText) {
                    showLoadingSpinner('Updating Outcomes...', 'fas fa-sync-alt');
                    try {
                        const data = await regenerateGoals(updatedText); // regenerateGoals returns data
                        if (data && data.goals) {
                             updateGoalCards(data, updatedText, goalCardsContainer);
                             applyCardAnimations(goalCardsContainer);
                        } else {
                            console.error("No goals data received after saving input");
                        }
                    } catch (error) {
                        console.error("Error regenerating goals after save:", error);
                    } finally {
                        hideLoadingSpinner();
                    }
                } else {
                    alert("Please enter your possibility or goal.");
                }
            });
        });
    }
    if (cancelButton) {
        cancelButton.addEventListener('click', () => handleCancelButtonClick(userInputDisplay, userInputEdit, editButton, saveButton, cancelButton));
    }

    // Event listeners for individual goal selection forms
    const goalSelectionForms = document.querySelectorAll('.goal-selection-form');
    goalSelectionForms.forEach((form) => {
        form.addEventListener('submit', (event) => {
            event.preventDefault(); // Keep this
            const iconClass = form.querySelector('input[name="domain_icon"]').value;
            showLoadingSpinner('Speculating Structured Solution', iconClass);
            form.submit(); // Proceed with form submission
        });
    });
});