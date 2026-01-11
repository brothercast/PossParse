// static/js/base_functions.js
// SSPEC Horizon Edition - Core Utilities & Animation Engine

// ==================================================
// 1. STATE MANAGEMENT & SCRIPTS
// ==================================================
let spinnerRequestCount = 0;
let spinnerInterval;

// The "Thoughts" of the Engine based on what it is doing.
const SCRIPTS = {
    DEFAULT: [
        "Accessing SSPEC Neural Network...",
        "Vectorizing inputs...",
        "Optimizing resource paths...",
        "Finalizing data packet..."
    ],
    SSOL: [ // Creating the Solution (Outcome Page)
        "Accessing Global Knowledge Graph...",
        "Inferring System Anchors (Operator, Directive, Scale)...",
        "Backcasting temporal milestones...",
        "Structuring Phase 1: Discovery...",
        "Calculating Phase 2: Engagement vectors...",
        "Projecting Legacy outcomes...",
        "Finalizing Strategic Charter..."
    ],
    LIST: [ // Generating Collections (CEs)
        "Scanning phase context...",
        "Identifying causal dependencies...",
        "Filtering for high probability...",
        "Formatting structural suggestions...",
        "Vectorizing list items..."
    ],
    NARRATIVE: [ // Enhancing Text
        "Reading System Anchors...",
        "Synthesizing operational tone...",
        "Drafting executive language...",
        "Refining clarity and impact...",
        "Appending domain citations..."
    ],
    SAVE: [ // Commit to DB
        "Serializing data packet...",
        "Updating Vector DB...",
        "Re-calculating System Integrity...",
        "Commit verified."
    ]
};

// ==================================================
// 2. LOADING SPINNER (HORIZON HUD)
// ==================================================

/**
 * Displays the Horizon Loading HUD.
 * @param {string} title - Main header (e.g. "INITIALIZING NODE")
 * @param {string} iconClass - FontAwesome class (e.g. "fa-rocket")
 * @param {string} contextKey - Key for SCRIPTS (DEFAULT, SSOL, LIST, NARRATIVE, SAVE)
 */
export function showLoadingSpinner(title = "PROCESSING", iconClass = null, contextKey = 'DEFAULT') {
    spinnerRequestCount++;

    let overlay = document.querySelector('.loading-spinner-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'loading-spinner-overlay d-none';
        document.body.appendChild(overlay);
    }
    
    // Ensure we are visible (remove d-none if present from initialization)
    overlay.classList.remove('d-none');
    overlay.style.display = 'flex';
    overlay.classList.remove('fade-out');

    // 1. Handle Icon logic
    let iconHtml = '';
    if (iconClass) {
        const cleanClass = iconClass.includes('fa-') ? iconClass : `fa-solid fa-${iconClass}`;
        iconHtml = `<i class="${cleanClass} spinner-overlay-icon"></i>`;
    } else {
        iconHtml = `<i class="fa-solid fa-microchip spinner-overlay-icon"></i>`;
    }

    // 2. Render Structure (Atom + Text Stage)
    overlay.innerHTML = `
        <div class="spinner-box">
            <!-- The Visual Stack: Atom Background + Static Icon Foreground -->
            <div class="spinner-visual-stack">
                <div class="la-ball-atom la-2x">
                    <div></div><div></div><div></div><div></div>
                </div>
                ${iconHtml}
            </div>
            
            <!-- The Text Content -->
            <div class="spinner-content">
                <div class="spinner-title">${title}</div>
                <!-- Fixed height container for wipe effects -->
                <div class="spinner-text-stage" id="spinner-text-stage">
                    <div class="spinner-message wipe-in">SSPEC ENGINE ONLINE...</div>
                </div>
            </div>
        </div>
    `;
    
    // 3. Start the "Thinking" Animation
    const script = SCRIPTS[contextKey] || SCRIPTS.DEFAULT;
    startPrinterUpdates(script);
}

export function hideLoadingSpinner() {
    spinnerRequestCount--;

    if (spinnerRequestCount <= 0) {
        spinnerRequestCount = 0;
        const overlay = document.querySelector('.loading-spinner-overlay');
        
        if (overlay) {
            stopPrinterUpdates();
            overlay.classList.add('fade-out'); // CSS Opacity transition
            
            setTimeout(() => {
                if (spinnerRequestCount === 0) {
                    overlay.style.display = 'none';
                    overlay.classList.remove('fade-out');
                    overlay.classList.add('d-none');
                }
            }, 500); // Matches CSS transition time
        }
    }
}

/**
 * Manages the "Invisible Printer" wipe effect.
 * Creates new DOM nodes for incoming text and animates old ones out.
 * 
 * LOGIC: 
 * 1. Current text wipes L->R (Erasing)
 * 2. New text waits 300ms
 * 3. New text wipes L->R (Printing)
 * Result: A moving gap between old and new.
 */
function startPrinterUpdates(scriptArray) {
    let index = 0;
    const stage = document.getElementById('spinner-text-stage');
    if (!stage) return;

    if (spinnerInterval) clearInterval(spinnerInterval);

    // Cycle through messages
    spinnerInterval = setInterval(() => {
        // 1. Identify current visible message
        // Note: We select only active ones to avoid grabbing items currently animating out
        const currentMsg = stage.querySelector('.spinner-message.wipe-in:not(.wipe-out)');
        
        // 2. Prepare next message
        const nextText = scriptArray[index];
        const newMsg = document.createElement('div');
        newMsg.className = 'spinner-message';
        newMsg.innerText = nextText;
        
        // TIMING FIX: Set explicit delay (0.3s) to create the visual "gap"
        // This lets the wipe-out start moving before the new text appears chasing it.
        newMsg.style.animationDelay = '0.3s';
        
        stage.appendChild(newMsg);

        // 3. Trigger Wipe Animations
        if (currentMsg) {
            currentMsg.classList.remove('wipe-in');
            currentMsg.classList.add('wipe-out');
        }
        
        // Trigger In animation (will wait 0.3s due to style above)
        newMsg.classList.add('wipe-in');

        // 4. Garbage Collection (Cleanup old DOM nodes after animation completes)
        setTimeout(() => {
            if (currentMsg) currentMsg.remove();
        }, 1200);

        // Loop index
        index = (index + 1) % scriptArray.length;

    }, 2500); // Slower rhythm (2.5s) to accommodate the delay and let user read
}

function stopPrinterUpdates() {
    if (spinnerInterval) clearInterval(spinnerInterval);
    spinnerInterval = null;
}

// ==================================================
// 3. DATA OPERATIONS
// ==================================================

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
    if (!response.ok) throw new Error("Goal generation failed.");
    return await response.json();
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

/**
 * Legacy support for updating goal cards.
 * @deprecated Modern logic uses goal_selection.js renderNewGoals()
 */
export function updateGoalCards(data, currentUserInputText, goalCardsContainer) {
  if (!goalCardsContainer) return;
  
  if (!data || !data.goals || !Array.isArray(data.goals)) {
    goalCardsContainer.innerHTML = '<p class="text-center text-danger">Could not load goal suggestions.</p>';
    return;
  }

  goalCardsContainer.innerHTML = '';

  data.goals.forEach((goal, index) => {
    // Basic fallback rendering - strictly for legacy/debug usage
    const cardHtml = `
      <div class="flip-card-wrapper">
        <div class="flip-card-inner">
            <div class="flip-card-front" style="background: ${goal.card_gradient}">
                <h3 class="card-title-large">${goal.title}</h3>
                <p class="card-desc-large">${goal.goal}</p>
            </div>
        </div>
      </div>
    `;
    goalCardsContainer.insertAdjacentHTML('beforeend', cardHtml);
  });
}

// ==================================================
// 4. UI HANDLERS (Header Interactions)
// ==================================================

export function handleEditButtonClick() {
    const displayContainer = document.getElementById('user-input-display-container');
    const editContainer = document.getElementById('user-input-edit-container');
    const input = document.querySelector('.user-input-edit');

    if (displayContainer && editContainer) {
        displayContainer.classList.add('d-none');
        editContainer.classList.remove('d-none');
        editContainer.classList.add('d-flex');
        if (input) input.focus();
    }
}

export function handleSaveButtonClick() {
    const displayContainer = document.getElementById('user-input-display-container');
    const editContainer = document.getElementById('user-input-edit-container');
    const input = document.querySelector('.user-input-edit');
    const displayTitle = document.querySelector('.user-input-display');

    if (input && displayTitle) {
        const newVal = input.value.trim();
        if (newVal) {
            displayTitle.textContent = `"${newVal}"`;
            displayTitle.title = newVal;
        }
    }

    if (displayContainer && editContainer) {
        editContainer.classList.add('d-none');
        editContainer.classList.remove('d-flex');
        displayContainer.classList.remove('d-none');
    }
}

export function handleCancelButtonClick() {
    const displayContainer = document.getElementById('user-input-display-container');
    const editContainer = document.getElementById('user-input-edit-container');
    const input = document.querySelector('.user-input-edit');
    const displayTitle = document.querySelector('.user-input-display');

    if (input && displayTitle) {
        const currentVal = displayTitle.textContent.replace(/^"|"$/g, '');
        input.value = currentVal;
    }

    if (displayContainer && editContainer) {
        editContainer.classList.add('d-none');
        editContainer.classList.remove('d-flex');
        displayContainer.classList.remove('d-none');
    }
}

// Auto-bind header listeners
document.addEventListener('DOMContentLoaded', () => {
    const editBtn = document.querySelector('.edit-user-input');
    const saveBtn = document.querySelector('.save-user-input');
    const cancelBtn = document.querySelector('.cancel-user-input');

    if (editBtn) editBtn.addEventListener('click', handleEditButtonClick);
    if (saveBtn) saveBtn.addEventListener('click', handleSaveButtonClick);
    if (cancelBtn) cancelBtn.addEventListener('click', handleCancelButtonClick);
});