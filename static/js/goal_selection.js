// goal_selection.js
import {
    handleEditButtonClick,
    handleSaveButtonClick,
    handleCancelButtonClick,
    regenerateGoals,
    showLoadingSpinner,
    hideLoadingSpinner,
    updateGoalCards
} from './base_functions.js';


// --- Diagonal Pivot Animation Logic (MODIFIED for Staggering) ---

/**
 * Triggers the animation for a single card's frames and its content.
 * @param {HTMLElement} container - The .diagonal-pivot-container for a single card.
 * @param {number} baseDelay - The base delay to start this card's animation.
 */
function playDiagonalPivot(container, baseDelay = 0) {
    if (!container) return;

    const frames = container.querySelectorAll('.diagonal-pivot-frame');
    const contentItems = container.querySelectorAll('.goal-content-item');

    // Hide content initially
    contentItems.forEach(item => item.classList.remove('animate'));

    // Animate the frames after the base delay
    setTimeout(() => {
        // --- NEW: Add 'animate' class to the container to make it fade in ---
        container.classList.add('animate');

        frames.forEach(frame => {
            frame.classList.remove('animate');
            void frame.offsetHeight; 
            frame.classList.add('animate');
        });

        // Stagger the fade-in of the content items
        // This starts after the pivot animation has begun
        contentItems.forEach((item, index) => {
            const contentDelay = index * 150 + 400; // 400ms initial delay + 150ms stagger
            setTimeout(() => {
                item.classList.add('animate');
            }, contentDelay);
        });

    }, baseDelay);
}


/**
 * Initializes the pivot animation for all cards on the page.
 * @param {string} containerSelector - The CSS selector for the card containers.
 */
function initDiagonalPivot(containerSelector = '.diagonal-pivot-container') {
    const containers = document.querySelectorAll(containerSelector);

    containers.forEach((container, index) => {
        // Stagger the animation start for each card container from left to right
        const cardStaggerDelay = index * 250; 
        playDiagonalPivot(container, cardStaggerDelay);
    });
}

// Function to apply animations to a new set of cards
function applyCardAnimations(container) {
    // Re-run the global initialization to animate new cards
    initDiagonalPivot('.diagonal-pivot-container');
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
    initDiagonalPivot();

    // Event listener for "Speculate New Outcomes" button
    if (speculateButton && userInputDisplay && userInputEdit) {
        speculateButton.addEventListener('click', async () => {
            let currentInputText = userInputDisplay.classList.contains('d-none')
                ? userInputEdit.value.trim()
                : userInputDisplay.textContent.trim();

            if (currentInputText) {
                showLoadingSpinner('Speculating New Outcomes...', 'fas fa-sync-alt');
                try {
                    const data = await regenerateGoals(currentInputText);
                    if (data && data.goals) {
                        updateGoalCards(data, currentInputText, goalCardsContainer); 
                        applyCardAnimations(goalCardsContainer); // Re-apply new animations
                    } else {
                        console.error("No goals data received from regenerateGoals");
                    }
                } catch (error) {
                    console.error("Error regenerating goals:", error);
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
    if (saveButton) {
        saveButton.addEventListener('click', async () => {
            handleSaveButtonClick(userInputDisplay, userInputEdit, editButton, saveButton, cancelButton, async (updatedText) => {
                if (updatedText) {
                    showLoadingSpinner('Updating Outcomes...', 'fas fa-sync-alt');
                    try {
                        const data = await regenerateGoals(updatedText);
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
    
    // --- NEW: Add keyboard shortcuts for the edit input ---
    if (userInputEdit) {
        userInputEdit.addEventListener('keydown', (event) => {
            // If the input field is not visible, do nothing.
            if (userInputEdit.classList.contains('d-none')) {
                return;
            }
            // On 'Enter', trigger the save button's click event.
            if (event.key === 'Enter') {
                event.preventDefault(); // Prevent default form submission
                saveButton.click();
            }
            // On 'Escape', trigger the cancel button's click event.
            if (event.key === 'Escape') {
                cancelButton.click();
            }
        });
    }


    // Event listeners for individual goal selection forms
    document.body.addEventListener('submit', (event) => {
        if (event.target.matches('.goal-selection-form')) {
            event.preventDefault();
            const form = event.target;
            const iconClass = form.querySelector('input[name="domain_icon"]').value;
            showLoadingSpinner('Speculating Structured Solution', iconClass);
            form.submit();
        }
    });
});