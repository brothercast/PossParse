// static/js/base_functions.js

/**
 * Applies Textillate animation effect to a collection of elements.
 * @param {NodeListOf<Element>|Array<Element>} elements - The elements to animate.
 * @param {number} [delayScale=1.2] - Textillate delayScale option.
 * @param {number} [delayOffset=50] - Offset for staggering animations.
 * @param {boolean} [fadeEffect=false] - If true, uses a simple jQuery fadeIn instead of Textillate.
 */
export function applyTextillateEffect(elements, delayScale = 1.2, delayOffset = 50, fadeEffect = false) {
  const baseDelay = 30;
  const animationDuration = 700; // Animation duration in milliseconds
  const elementsArray = Array.from(elements); // Ensure it's an array

  elementsArray.forEach((element, index) => {
    const elementDelay = baseDelay + index * delayOffset;
    if (fadeEffect) {
      $(element).hide().delay(elementDelay).fadeIn(animationDuration);
    } else {
      $(element).textillate({
        initialDelay: elementDelay,
        in: {
          effect: 'flipInY',
          delayScale: delayScale,
          delay: baseDelay,
          sync: false,
          shuffle: false,
          reverse: false,
          duration: animationDuration,
        },
        loop: false,
        autoStart: true,
      });
    }
  });
}

/**
 * Handles the click event for the "Edit User Input" button.
 * @param {HTMLElement} userInputDisplay - The span displaying the user input.
 * @param {HTMLInputElement} userInputEdit - The input field for editing.
 * @param {HTMLButtonElement} editButton - The edit button.
 * @param {HTMLButtonElement} saveButton - The save button.
 * @param {HTMLButtonElement} cancelButton - The cancel button.
 */
export function handleEditButtonClick(userInputDisplay, userInputEdit, editButton, saveButton, cancelButton) {
  if (userInputDisplay && userInputEdit && editButton && saveButton && cancelButton) {
    userInputDisplay.classList.add('d-none');
    userInputEdit.classList.remove('d-none');
    userInputEdit.value = userInputDisplay.textContent.trim();
    userInputEdit.focus();
    editButton.classList.add('d-none');
    saveButton.classList.remove('d-none');
    cancelButton.classList.remove('d-none');
  } else {
    console.error("handleEditButtonClick: Required DOM elements not found.");
  }
}

/**
 * Handles the click event for the "Save User Input" button.
 * @param {HTMLElement} userInputDisplay - The span displaying the user input.
 * @param {HTMLInputElement} userInputEdit - The input field for editing.
 * @param {HTMLButtonElement} editButton - The edit button.
 * @param {HTMLButtonElement} saveButton - The save button.
 * @param {HTMLButtonElement} cancelButton - The cancel button.
 * @param {function(string)} callback - Function to call with the updated text.
 */
export function handleSaveButtonClick(userInputDisplay, userInputEdit, editButton, saveButton, cancelButton, callback) {
  if (userInputDisplay && userInputEdit && editButton && saveButton && cancelButton) {
    const updatedUserInput = userInputEdit.value.trim();
    userInputDisplay.textContent = updatedUserInput;
    userInputDisplay.classList.remove('d-none');
    userInputEdit.classList.add('d-none');
    editButton.classList.remove('d-none');
    saveButton.classList.add('d-none');
    cancelButton.classList.add('d-none');
    if (typeof callback === 'function') {
      callback(updatedUserInput);
    }
  } else {
    console.error("handleSaveButtonClick: Required DOM elements not found.");
  }
}

/**
 * Handles the click event for the "Cancel User Input" button.
 * @param {HTMLElement} userInputDisplay - The span displaying the user input.
 * @param {HTMLInputElement} userInputEdit - The input field for editing.
 * @param {HTMLButtonElement} editButton - The edit button.
 * @param {HTMLButtonElement} saveButton - The save button.
 * @param {HTMLButtonElement} cancelButton - The cancel button.
 */
export function handleCancelButtonClick(userInputDisplay, userInputEdit, editButton, saveButton, cancelButton) {
  if (userInputDisplay && userInputEdit && editButton && saveButton && cancelButton) {
    userInputDisplay.classList.remove('d-none');
    userInputEdit.classList.add('d-none');
    userInputEdit.value = userInputDisplay.textContent.trim(); // Revert input field too
    editButton.classList.remove('d-none');
    saveButton.classList.add('d-none');
    cancelButton.classList.add('d-none');
  } else {
    console.error("handleCancelButtonClick: Required DOM elements not found.");
  }
}

/**
 * Fetches new goal suggestions from the server.
 * @param {string} user_input_text - The user's input text.
 * @returns {Promise<object>} - A promise that resolves with the JSON data of goals.
 * @throws {Error} - Throws an error if the fetch fails or the response is not ok.
 */
export async function regenerateGoals(user_input_text) {
  try {
    const response = await fetch('/goal_selection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: new URLSearchParams({ user_text: user_input_text }),
    });
    if (!response.ok) {
      let errorMsg = `Failed to fetch new goals. Status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMsg = errorData.error || errorData.message || `Server error: ${response.status}`;
      } catch (e) {
        console.warn("Could not parse error response as JSON.");
      }
      throw new Error(errorMsg);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error in regenerateGoals fetch:', error);
    throw error;
  }
}

/**
 * Updates the goal cards displayed on the page.
 * @param {object} data - The data object containing the array of goals.
 * @param {string} currentUserInputText - The current user input text.
 * @param {HTMLElement} goalCardsContainer - The container element for the goal cards.
 */
export function updateGoalCards(data, currentUserInputText, goalCardsContainer) {
  if (!goalCardsContainer) {
    console.error("updateGoalCards: goalCardsContainer element not found.");
    return;
  }
  if (!data || !data.goals || !Array.isArray(data.goals)) {
    console.error("updateGoalCards: Invalid or missing goals data.", data);
    goalCardsContainer.innerHTML = '<p class="text-center text-danger">Could not load goal suggestions at this time.</p>';
    return;
  }

  goalCardsContainer.innerHTML = '';

  data.goals.forEach((goal) => {
    const goalDescription = (goal.goal || "No description available.").replace(/\n/g, '<br>');
    const goalTitleForForm = goal.title || "Untitled Goal";
    const goalDomain = goal.domain || "General";
    // Critical: Ensure the icon class string includes necessary FontAwesome sizing/animation
    // For example, if goal.icon is just "fas fa-atom", and you want it larger and spinning:
    // const goalIcon = `${goal.icon || "fas fa-question-circle"} fa-2x`; // Add fa-2x for size
    // Or if goal.icon from backend already contains sizing:
    const goalIcon = goal.icon || "fas fa-question-circle";
    const isCompliant = typeof goal.compliant === 'undefined' ? true : goal.compliant;

    const cardHtml = `
      <div class="col-md-4 mb-4">
        <div class="card retro-futuristic-card text-center ${isCompliant ? '' : 'non-compliant'}">
          <div class="card-body card-content">
            <div class="card-upper-content">
                <i class="${goalIcon} mb-3"></i> <!-- Removed fa-2x here, assuming it's part of goalIcon string or CSS -->
                <p class="domain domain-text">${goalDomain.replace(/\b\w/g, l => l.toUpperCase())}</p>
                <div class="goal-description goal-text">
                    ${goalDescription}
                </div>
            </div>
            ${isCompliant ? `
            <form action="/outcome" method="post" class="goal-selection-form">
              <input type="hidden" name="selected_goal" value="${goal.goal || ''}">
              <input type="hidden" name="domain" value="${goalDomain}">
              <input type="hidden" name="domain_icon" value="${goalIcon}">
              <input type="hidden" name="selected_goal_title" value="${goalTitleForForm}">
              <button type="submit" class="btn btn-primary">Select</button>
            </form>
            ` : `
            <button type="button" class="btn btn-danger start-over-button">Start Over</button>
            `}
          </div>
        </div>
      </div>
    `;
    goalCardsContainer.insertAdjacentHTML('beforeend', cardHtml);
  });

  const newForms = goalCardsContainer.querySelectorAll('.goal-selection-form');
  newForms.forEach(form => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const iconValue = form.querySelector('input[name="domain_icon"]').value;
      // Ensure iconValue includes sizing for the spinner if it's different from the card icon
      showLoadingSpinner('Speculating Structured Solution...', `${iconValue} fa-2x`); // Example: add fa-2x
      form.submit();
    });
  });

  const startOverButtons = goalCardsContainer.querySelectorAll('.start-over-button');
  startOverButtons.forEach(button => {
    button.addEventListener('click', () => {
      window.location.href = '/';
    });
  });
}

/**
 * Shows the loading spinner with a message and icon.
 * @param {string} [message='Generating Outcomes...'] - The message to display.
 * @param {string} [iconClass='fas fa-atom fa-spin fa-3x'] - FontAwesome icon class(es), including any sizing or animation.
 */
export function showLoadingSpinner(message = 'Generating Outcomes...', iconClass = 'fas fa-atom fa-spin fa-3x') { // DEFAULT ICON CHANGED
  const spinner = document.getElementById('loading-spinner');
  const spinnerText = document.getElementById('spinner-text');
  const spinnerIcon = document.getElementById('spinner-icon');

  if (spinner && spinnerText && spinnerIcon) {
    spinnerText.textContent = message;
    spinnerIcon.className = ''; // Clear all existing classes from the icon element first

    // Apply all classes from the iconClass string
    iconClass.split(' ').forEach(cls => {
      if (cls.trim()) { // Ensure class is not empty
        spinnerIcon.classList.add(cls.trim());
      }
    });
    // No need to add a generic 'fa-icon' unless your CSS specifically styles it for sizing.
    // FontAwesome's own sizing classes (fa-xs, fa-sm, fa-lg, fa-2x to fa-10x) are preferred.

    spinner.classList.remove('d-none', 'fade-out');
    spinner.classList.add('fade-in');
  } else {
    console.warn("Loading spinner elements (spinner, spinner-text, or spinner-icon) not found in the DOM.");
  }
}

/**
 * Hides the loading spinner.
 */
export function hideLoadingSpinner() {
  const spinner = document.getElementById('loading-spinner');
  if (spinner) {
    spinner.classList.remove('fade-in');
    spinner.classList.add('fade-out');
    setTimeout(() => {
      spinner.classList.add('d-none');
    }, 500); // Match CSS fade-out duration
  }
}

/**
 * Initializes generic event listeners. Specific page listeners are handled in their respective JS files.
 */
export function initializeEventListeners() {
  console.log("Base initializeEventListeners called - for truly generic, site-wide listeners if any.");
  // Edit/Save/Cancel for user input on goal_selection.html are now set up in goal_selection.js
  // by calling the specific handler functions from this file with the correct DOM elements.
}

console.log("base_functions.js has been loaded.");