// static/js/base_functions.js
// SSPEC Horizon Edition - Core Utilities

// --- LOADING SPINNER STATE ---
// Tracks how many concurrent processes are requesting the spinner
let spinnerRequestCount = 0;
let spinnerInterval;

const LOADING_MESSAGES = [
    "Accessing SSPEC Neural Network...",
    "Vectorizing inputs...",
    "Consulting domain strategies...",
    "Drafting executive narrative...",
    "Identifying critical dependencies...",
    "Optimizing resource paths...",
    "Finalizing data packet..."
];


/**
 * Displays the Horizon Loading HUD.
 * Keeps track of requests so it doesn't vanish prematurely during auto-population.
 * @param {string} title - The main header (e.g. "INITIALIZING NODE")
 * @param {string} iconClass - FontAwesome class (e.g. "fa-circle-notch")
 */
export function showLoadingSpinner(title = "PROCESSING", iconClass = "fa-circle-notch") {
    spinnerRequestCount++;
    console.log(`Spinner Requested: ${title} (Active Requests: ${spinnerRequestCount})`);

    // 1. Find or Create Overlay
    let overlay = document.querySelector('.loading-spinner-overlay');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'loading-spinner-overlay fade-in';
        document.body.appendChild(overlay);
    } else {
        // Critical: Ensure bootstrap d-none is removed if present
        overlay.classList.remove('d-none');
        overlay.classList.remove('fade-out'); // Stop any hiding animation
        overlay.classList.add('fade-in');
    }

    // 2. Render Structure (Horizon Style)
    // If already visible, we update the text/icon but don't nuke DOM to prevent flickering
    const existingTitle = overlay.querySelector('.spinner-title');
    
    if (existingTitle && overlay.style.display !== 'none') {
        existingTitle.textContent = title;
        // Update icon
        const iconContainer = overlay.querySelector('.spinner-icon');
        if (iconContainer) {
             iconContainer.innerHTML = `<i class="fas ${iconClass} ${iconClass.includes('spin') ? '' : 'fa-spin'}"></i>`;
        }
    } else {
        // Fresh Render
        overlay.innerHTML = `
            <div class="spinner-box">
                <div class="spinner-icon">
                    <i class="fas ${iconClass} ${iconClass.includes('spin') ? '' : 'fa-spin'}"></i>
                </div>
                <div class="spinner-content" style="display:flex; flex-direction:column; align-items:flex-start;">
                    <div class="spinner-title" style="line-height:1.1;">${title}</div>
                    <div class="spinner-text font-body small text-muted" id="dynamic-spinner-text">Initializing protocols...</div>
                </div>
            </div>
        `;
    }
    
    // 3. Make Visible
    overlay.style.display = 'flex';

    // 4. Start Talking
    startStatusUpdates();
}

export function hideLoadingSpinner() {
    spinnerRequestCount--;
    console.log(`Spinner Release. Remaining: ${spinnerRequestCount}`);

    // Only hide if NO other processes are waiting
    if (spinnerRequestCount <= 0) {
        spinnerRequestCount = 0; // Safety reset
        const overlay = document.querySelector('.loading-spinner-overlay');
        
        if (overlay) {
            stopStatusUpdates(); 
            overlay.classList.remove('fade-in');
            overlay.classList.add('fade-out'); // CSS Animation
            
            // Wait for animation to finish before DOM hiding
            setTimeout(() => {
                if (spinnerRequestCount === 0) {
                    overlay.style.display = 'none';
                    overlay.classList.add('d-none'); // Re-apply d-none for Bootstrap safety
                    overlay.classList.remove('fade-out');
                }
            }, 500); // Match CSS transition time
        }
    }
}

// --- Message Cycler ---
function startStatusUpdates() {
    const textEl = document.getElementById('dynamic-spinner-text');
    let index = 0;
    
    if (spinnerInterval) clearInterval(spinnerInterval);
    
    spinnerInterval = setInterval(() => {
        const currentEl = document.getElementById('dynamic-spinner-text');
        if (currentEl) {
            // Simple opacity pulse for transition
            currentEl.style.opacity = 0.5;
            setTimeout(() => {
                currentEl.innerText = LOADING_MESSAGES[index];
                currentEl.style.opacity = 1;
                index = (index + 1) % LOADING_MESSAGES.length;
            }, 300);
        } else {
            stopStatusUpdates();
        }
    }, 2000); 
}

function stopStatusUpdates() {
    if (spinnerInterval) clearInterval(spinnerInterval);
    spinnerInterval = null;
}

// --- INPUT HANDLING ---

/**
 * Handles the click event for the "Edit User Input" button.
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

// --- GOAL REGENERATION ---

/**
 * Fetches new goal suggestions from the server.
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
 * UPDATED FOR HORIZON MONOLITH DESIGN (Clean Rectangular Cards with 3D Flip)
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

  data.goals.forEach((goal, index) => {
    const goalDescription = (goal.goal || "No description available.").replace(/\n/g, '<br>');
    const goalTitle = goal.title || "Untitled Goal";
    const goalDomain = goal.domain || "General";
    const goalIcon = goal.icon || "fas fa-question-circle";
    // Check compliance, default to true if undefined
    const isCompliant = typeof goal.is_compliant === 'undefined' ? true : goal.is_compliant;

    // Cycle Colors: Coral, Cyan, Purple (Horizon Palette)
    const i = index;
    const accentColors = ['#ff7043', '#00bcd4', '#ab47bc'];
    const accent = isCompliant ? accentColors[i % 3] : '#ef5350';
    
    // Card Back Gradient (Face Down)
    const backGrad = isCompliant 
        ? [
            'linear-gradient(135deg, #ff7043 0%, #f4511e 100%)', 
            'linear-gradient(135deg, #26c6da 0%, #00bcd4 100%)', 
            'linear-gradient(135deg, #ab47bc 0%, #7b1fa2 100%)'
          ][i % 3]
        : 'linear-gradient(135deg, #ffeb3b 0%, #ff9800 40%, #d32f2f 100%)';

    // Header Plate Gradient (Face Up)
    const headerGrad = isCompliant
        ? [
            'linear-gradient(135deg, #ffcc80 0%, #ff7043 100%)',
            'linear-gradient(135deg, #80deea 0%, #00bcd4 100%)',
            'linear-gradient(135deg, #e1bee7 0%, #ab47bc 100%)'
          ][i % 3]
        : 'linear-gradient(135deg, #ffcdd2 0%, #ef5350 100%)';

    // Animation Timing (Staggered)
    const animDelay = i * 0.2;
    // The "Hold" before flip: 1.2s base + 0.6s stagger per card
    const revealDelay = 1200 + (i * 600);

    const cardHtml = `
      <!-- CARD WRAPPER (Handles the "Deal" entrance) -->
      <div class="flip-card ${!isCompliant ? 'rejected' : ''}" style="animation-delay: ${animDelay}s;">
        <div class="flip-card-inner" data-delay="${revealDelay}">
          
          <!-- BACK (Face Down - Visible First) -->
          <div class="flip-card-back" style="background: ${backGrad};">
            <div class="card-pattern-overlay"></div>
            <div class="position-relative z-2 d-flex flex-column align-items-center">
              <div class="bg-white bg-opacity-25 p-4 rounded-circle border border-2 border-white border-opacity-50 shadow-lg mb-3 backdrop-blur">
                <i class="${goalIcon} fa-3x text-white drop-shadow"></i>
              </div>
              ${!isCompliant ? `
              <div class="font-data text-white small text-uppercase bg-black bg-opacity-25 px-3 py-1 rounded-pill border border-white border-opacity-25 mt-2">
                Protocol Violation
              </div>` : ''}
            </div>
          </div>

          <!-- FRONT (Face Up - Hidden First) -->
          <div class="flip-card-front">
            <div class="card-header-plate" style="background: ${headerGrad};">
               <div class="card-domain-badge shadow-sm">${goalDomain.toUpperCase()}</div>
               <div class="card-icon-float">
                  <i class="${goalIcon} fa-2x" style="color: ${accent};"></i>
               </div>
            </div>

            <div class="card-body">
              <h3 class="card-title">${goalTitle}</h3>
              <p class="card-desc small">${goalDescription}</p>
            </div>

            <div class="card-footer bg-transparent border-0 p-0 pb-4">
              ${isCompliant ? `
              <form action="/outcome" method="post">
                <input type="hidden" name="selected_goal" value="${goal.goal}">
                <input type="hidden" name="domain" value="${goalDomain}">
                <input type="hidden" name="domain_icon" value="${goalIcon}">
                <input type="hidden" name="selected_goal_title" value="${goalTitle}">
                <button type="submit" class="btn-select-pill w-100 shadow-md" style="background-color: ${accent};">
                  SELECT PROTOCOL
                </button>
              </form>` : `
              <button class="btn-select-pill w-100" style="background-color: #ef5350; cursor: not-allowed; opacity: 0.8;">
                  PROTOCOL VIOLATION
              </button>`}
            </div>
          </div>

        </div>
      </div>
    `;
    
    goalCardsContainer.insertAdjacentHTML('beforeend', cardHtml);
  });

  // Trigger Flip Animation for newly added cards after they render
  setTimeout(() => {
      const cards = goalCardsContainer.querySelectorAll('.flip-card-inner');
      cards.forEach(card => {
          const delay = parseInt(card.dataset.delay) || 1000;
          setTimeout(() => {
              card.closest('.flip-card').classList.add('revealed');
          }, delay);
      });
  }, 100);
}

/**
 * Initializes generic event listeners.
 */
export function initializeEventListeners() {
  console.log("Horizon Base Functions: Initialized.");
}