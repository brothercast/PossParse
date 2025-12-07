// static/js/base_functions.js
// SSPEC Horizon Edition - Core Utilities & Animation Engine

// --- STATE MANAGEMENT ---
let spinnerRequestCount = 0;
let spinnerInterval;

// --- CONTEXTUAL LOADING SCRIPTS ---
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
// 1. LOADING SPINNER (HORIZON HUD)
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
        overlay.className = 'loading-spinner-overlay';
        document.body.appendChild(overlay);
    }
    overlay.classList.remove('d-none'); // Force Bootstrap override

    // 1. Handle Icon logic
    let iconHtml = '';
    if (iconClass) {
        const cleanClass = iconClass.includes('fa-') ? iconClass : `fa-solid fa-${iconClass}`;
        // Note: "spinner-overlay-icon" class handles absolute positioning in CSS
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
    
    overlay.style.display = 'flex';
    
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
 */
function startPrinterUpdates(scriptArray) {
    let index = 0;
    const stage = document.getElementById('spinner-text-stage');
    if (!stage) return;

    if (spinnerInterval) clearInterval(spinnerInterval);

    // Initial message is static. Start cycle.
    spinnerInterval = setInterval(() => {
        // 1. Identify current visible message
        const currentMsg = stage.querySelector('.spinner-message:not(.wipe-out)');
        
        // 2. Prepare next message
        const nextText = scriptArray[index];
        const newMsg = document.createElement('div');
        newMsg.className = 'spinner-message';
        newMsg.innerText = nextText;
        stage.appendChild(newMsg);

        // 3. Trigger Wipe Animations
        // Old text wipes OUT (Left -> Right reveal of transparent)
        if (currentMsg) {
            currentMsg.classList.remove('wipe-in');
            currentMsg.classList.add('wipe-out');
        }

        // New text wipes IN (Left -> Right reveal of content)
        newMsg.classList.add('wipe-in');

        // 4. Garbage Collection
        setTimeout(() => {
            if (currentMsg) currentMsg.remove();
        }, 1200); // Wait for animation + buffer

        // Loop
        index = (index + 1) % scriptArray.length;

    }, 2200); // Rhythm of updates
}

function stopPrinterUpdates() {
    if (spinnerInterval) clearInterval(spinnerInterval);
    spinnerInterval = null;
}

// ==================================================
// 2. GOAL SELECTION UTILITIES (Monolith Cards)
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

export function updateGoalCards(data, currentUserInputText, goalCardsContainer) {
  if (!goalCardsContainer) return;
  
  if (!data || !data.goals || !Array.isArray(data.goals)) {
    goalCardsContainer.innerHTML = '<p class="text-center text-danger">Could not load goal suggestions.</p>';
    return;
  }

  goalCardsContainer.innerHTML = '';

  data.goals.forEach((goal, index) => {
    const goalDescription = (goal.goal || "No description available.").replace(/\n/g, '<br>');
    const goalTitle = goal.title || "Untitled Goal";
    const goalDomain = goal.domain || "General";
    const goalIcon = goal.icon || "fas fa-question-circle";
    const isCompliant = typeof goal.is_compliant === 'undefined' ? true : goal.is_compliant;

    // Cycle Horizon Colors
    const accentColors = ['#ff7043', '#00bcd4', '#ab47bc'];
    const accent = isCompliant ? accentColors[index % 3] : '#ef5350';
    
    // 3D Flip Gradients
    const backGrad = isCompliant 
        ? `linear-gradient(135deg, ${accentColors[index % 3]} 0%, #f4511e 100%)`
        : 'linear-gradient(135deg, #ffeb3b 0%, #d32f2f 100%)';

    const headerGrad = isCompliant
        ? `linear-gradient(135deg, white 0%, ${accent} 100%)`
        : 'linear-gradient(135deg, #ffcdd2 0%, #ef5350 100%)';

    // Staggered Animation Delays
    const animDelay = index * 0.1;
    const revealDelay = 800 + (index * 300);

    const cardHtml = `
      <div class="flip-card ${!isCompliant ? 'rejected' : ''}" style="animation-delay: ${animDelay}s;">
        <div class="flip-card-inner" data-delay="${revealDelay}">
          
          <!-- BACK (Face Down) -->
          <div class="flip-card-back" style="background: ${backGrad};">
            <div class="card-pattern-overlay"></div>
            <div class="position-relative z-2 d-flex flex-column align-items-center">
              <div class="bg-white bg-opacity-25 p-4 rounded-circle border border-2 border-white border-opacity-50 shadow-lg mb-3 backdrop-blur">
                <i class="${goalIcon} fa-3x text-white drop-shadow"></i>
              </div>
              ${!isCompliant ? '<div class="font-data text-white small bg-black bg-opacity-25 px-3 py-1 rounded-pill border border-white border-opacity-25 mt-2">Protocol Violation</div>' : ''}
            </div>
          </div>

          <!-- FRONT (Face Up) -->
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
              <form class="outcome-form" action="/outcome" method="post">
                <input type="hidden" name="selected_goal" value="${goal.goal}">
                <input type="hidden" name="domain" value="${goalDomain}">
                <input type="hidden" name="domain_icon" value="${goalIcon}">
                <input type="hidden" name="selected_goal_title" value="${goalTitle}">
                <button type="submit" class="btn-select-pill w-100 shadow-md" style="background-color: ${accent};">
                  INITIALIZE
                </button>
              </form>` : `
              <button class="btn-select-pill w-100" style="background-color: #ef5350; cursor: not-allowed; opacity: 0.8;">
                  VIOLATION
              </button>`}
            </div>
          </div>

        </div>
      </div>
    `;
    goalCardsContainer.insertAdjacentHTML('beforeend', cardHtml);
  });

  // Bind event listeners to new forms for the spinner
  // This ensures regenerated cards still trigger the spinner
  const newForms = goalCardsContainer.querySelectorAll('.outcome-form');
  newForms.forEach(form => {
      form.addEventListener('submit', (e) => {
           const title = form.querySelector('input[name="selected_goal_title"]').value;
           showLoadingSpinner(`INITIALIZING: ${title.toUpperCase()}`, "fa-rocket", "SSOL");
      });
  });

  // Trigger Flip Animation
  setTimeout(() => {
      const cards = goalCardsContainer.querySelectorAll('.flip-card-inner');
      cards.forEach(card => {
          const delay = parseInt(card.dataset.delay) || 1000;
          setTimeout(() => card.closest('.flip-card').classList.add('revealed'), delay);
      });
  }, 100);
}

// ==================================================
// 3. INPUT EDITING UTILITIES
// ==================================================

export function handleEditButtonClick(d, e, b1, b2, b3) {
    d.classList.add('d-none'); e.classList.remove('d-none'); e.value = d.textContent.trim(); e.focus();
    b1.classList.add('d-none'); b2.classList.remove('d-none'); b3.classList.remove('d-none');
}
export function handleSaveButtonClick(d, e, b1, b2, b3, cb) {
    const val = e.value.trim(); d.textContent = val;
    d.classList.remove('d-none'); e.classList.add('d-none');
    b1.classList.remove('d-none'); b2.classList.add('d-none'); b3.classList.add('d-none');
    if (cb) cb(val);
}
export function handleCancelButtonClick(d, e, b1, b2, b3) {
    d.classList.remove('d-none'); e.classList.add('d-none'); e.value = d.textContent.trim();
    b1.classList.remove('d-none'); b2.classList.add('d-none'); b3.classList.add('d-none');
}