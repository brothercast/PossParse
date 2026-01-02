// =============================================================================
// FIXED GOAL SELECTION - Matches Prototype Animation Flow
// =============================================================================

import {
    handleEditButtonClick,
    handleSaveButtonClick,
    handleCancelButtonClick,
    regenerateGoals,
    showLoadingSpinner,
    hideLoadingSpinner,
    updateGoalCards
} from './base_functions.js';

// =============================================================================
// 1. CONFIGURATION DATA (SSPEC ONTOLOGY)
// =============================================================================

const IDENTITY_TYPES = [
    {
        id: 'Individual',
        label: 'Individual Agent',
        icon: 'fa-user',
        desc: "High autonomy, limited bandwidth. You are the primary engine.",
        color: "#00bcd4"
    },
    {
        id: 'Collective',
        label: 'Community Collective',
        icon: 'fa-users',
        desc: "Decentralized & volunteer-driven. Power comes from momentum.",
        color: "#00bcd4"
    },
    {
        id: 'Enterprise',
        label: 'Commercial Venture',
        icon: 'fa-rocket',
        desc: "Market-driven & growth-focused. Optimized for speed and capital.",
        color: "#00bcd4"
    },
    {
        id: 'Social',
        label: 'Social Impact (NGO)',
        icon: 'fa-heart',
        desc: "Mission-first structure prioritizing public trust.",
        color: "#00bcd4"
    },
    {
        id: 'Academic',
        label: 'Research / Academic',
        icon: 'fa-flask',
        desc: "Discovery-focused. Bound by peer review and grants.",
        color: "#00bcd4"
    },
    {
        id: 'Civic',
        label: 'Civic Institution',
        icon: 'fa-landmark',
        desc: "Systemic scale. High leverage but constrained by regulation.",
        color: "#00bcd4"
    }
];

const BUDGET_TYPES = [
    { id: 'Bootstrapped', label: 'Bootstrapped ($0)' },
    { id: 'Crowdfunded', label: 'Crowdfunded' },
    { id: 'Grant', label: 'Grant Funded' },
    { id: 'VC', label: 'Venture Capital' },
    { id: 'Public', label: 'Public Budget' }
];

const CONTEXT_HINTS = {
    'Individual': {
        time: "Timeline flexible. Limited by bandwidth.",
        implication: "SSPEC will prioritize **'Sweat Equity'** and **Low-Code/No-Code** solutions."
    },
    'Collective': {
        time: "Timeline fluctuates.",
        implication: "SSPEC will focus on **Community Organizing** and **Social Capital**."
    },
    'Enterprise': {
        time: "Quarterly goals.",
        implication: "SSPEC will suggest **Paid Vendors**, **Contractors**, and **IP Protection** strategies."
    },
    'Social': {
        time: "Grant cycles.",
        implication: "SSPEC will emphasize **Impact Reporting**, **Grant Compliance**, and board management."
    },
    'Academic': {
        time: "Semester/Grant cycles.",
        implication: "SSPEC will structure the timeline around **Funding Cycles** and **IRB Approvals**."
    },
    'Civic': {
        time: "Fiscal years.",
        implication: "SSPEC will prioritize **Procurement Protocols** and **Public Hearings**."
    }
};

// =============================================================================
// 2. STATE MANAGEMENT (Like Prototype)
// =============================================================================

let currentPhase = 'DEALING'; // DEALING → SELECTION → CONFIG → RETURNING
let selectedCardId = null;

// =============================================================================
// 3. ANIMATION SEQUENCE (The Monolith Magic)
// =============================================================================

function initEntrySequence() {
    const cards = document.querySelectorAll('.flip-card-wrapper');
    currentPhase = 'DEALING';
    
    cards.forEach((card, i) => {
        // 1. RESET: Remove all state classes
        card.classList.remove('state-dealing', 'state-selection', 'state-hero', 'state-dimmed');
        card.style.cssText = ''; 
        
        // Store original icon for restoration
        const iconEl = card.querySelector('.flip-card-back i.monolith-icon');
        if (iconEl) {
            card.dataset.originalIcon = iconEl.className;
        }
        
        // 2. START: Opacity 0, Closed (Back Face showing)
        card.classList.add('state-dealing');
        
        // Force reflow
        void card.offsetWidth; 
        
        // 3. DEAL: Slide Up & Fade In (Staggered)
        setTimeout(() => {
            card.classList.remove('state-dealing');
            card.classList.add('state-selection');
            currentPhase = 'SELECTION';
        }, 500 + (i * 200));
    });
}

// =============================================================================
// 4. CORE SELECTION LOGIC (3-Phase Transform)
// =============================================================================

window.selectGoal = function(cardWrapper) {
    // Block if violation card
    if (cardWrapper.classList.contains('violation')) return;
    
    // Block if already transitioning
    if (currentPhase === 'CONFIG' || currentPhase === 'RETURNING') return;
    
    currentPhase = 'CONFIG';
    selectedCardId = cardWrapper.dataset.cardId || cardWrapper.querySelector('.card-title')?.innerText;
    
    // PHASE 1: Dim siblings FIRST (so flip is visible)
    document.querySelectorAll('.flip-card-wrapper').forEach(c => {
        if (c !== cardWrapper) {
            c.classList.add('state-dimmed');
        }
    });
    
    // PHASE 2: Calculate morph coordinates
    const viewport = document.getElementById('stage-viewport');
    const rect = cardWrapper.getBoundingClientRect();
    const viewRect = viewport.getBoundingClientRect();

    const startTop = rect.top - viewRect.top;
    const startLeft = rect.left - viewRect.left;
    const startWidth = rect.width;
    const startHeight = rect.height;

    // Create placeholder to hold grid position
    const placeholder = document.createElement('div');
    placeholder.className = 'grid-placeholder';
    placeholder.style.width = startWidth + 'px';
    placeholder.style.height = startHeight + 'px';
    placeholder.id = 'active-card-placeholder';
    cardWrapper.parentNode.insertBefore(placeholder, cardWrapper);

    // Detach card to absolute positioning
    viewport.appendChild(cardWrapper);
    cardWrapper.style.position = 'absolute';
    cardWrapper.style.top = startTop + 'px';
    cardWrapper.style.left = startLeft + 'px';
    cardWrapper.style.width = startWidth + 'px';
    cardWrapper.style.height = startHeight + 'px';
    cardWrapper.style.margin = '0';
    cardWrapper.style.zIndex = '1000';
    
    // Get the inner rotator element
    const inner = cardWrapper.querySelector('.flip-card-inner');
    if (!inner) return;
    
    // Mark as morphing
    cardWrapper.classList.add('morph-active');

    // Force reflow before animation
    void cardWrapper.offsetWidth;

    // PHASE 3: Trigger BOTH position morph AND rotation flip SIMULTANEOUSLY
    requestAnimationFrame(() => {
        // Move to sidebar position
        cardWrapper.style.top = '0px';
        cardWrapper.style.left = '0px';
        cardWrapper.style.width = '35%';
        cardWrapper.style.height = '100%';
        
        // AT THE EXACT SAME MOMENT: Flip from 180deg → 0deg
        // This must be done via inline style to override CSS and trigger transition
        cardWrapper.classList.remove('state-selection');
        // Force the transform directly on the inner element
        inner.style.transform = 'rotate3d(1, 1, 0, 0deg)';
    });

    // PHASE 4: Inject hero content (after flip completes - 1.2s + buffer)
    const goalData = extractGoalData(cardWrapper);
    
    setTimeout(() => {
        injectHeroContent(cardWrapper, goalData);
        initRightPanel(goalData);
    }, 1400);
};

// =============================================================================
// 5. RETURN TO SELECTION
// =============================================================================

window.exitStage = function() {
    const cardWrapper = document.querySelector('.flip-card-wrapper.morph-active');
    const placeholder = document.getElementById('active-card-placeholder');
    const rightPanel = document.querySelector('.split-col-right');
    const inner = cardWrapper?.querySelector('.flip-card-inner');

    if (!cardWrapper || !placeholder || !inner) {
        console.error('Missing elements for return animation');
        return;
    }

    currentPhase = 'RETURNING';

    // 1. Hide wizard panel
    if (rightPanel) {
        rightPanel.classList.remove('visible');
        setTimeout(() => rightPanel.remove(), 300);
    }

    // 2. Restore monolith content (before morphing back)
    restoreMonolithContent(cardWrapper);

    // 3. Calculate return position
    const viewport = document.getElementById('stage-viewport');
    const rect = placeholder.getBoundingClientRect();
    const viewRect = viewport.getBoundingClientRect();

    const targetTop = rect.top - viewRect.top;
    const targetLeft = rect.left - viewRect.left;
    const targetWidth = rect.width;
    const targetHeight = rect.height;

    // 4. Animate BOTH position morph AND flip back to 180deg
    requestAnimationFrame(() => {
        cardWrapper.classList.remove('morph-active');
        
        // Move back to grid position
        cardWrapper.style.top = targetTop + 'px';
        cardWrapper.style.left = targetLeft + 'px';
        cardWrapper.style.width = targetWidth + 'px';
        cardWrapper.style.height = targetHeight + 'px';
        
        // AT THE SAME TIME: Flip from 0deg → 180deg
        inner.style.transform = 'rotate3d(1, 1, 0, 180deg)';
        cardWrapper.classList.add('state-selection');
    });

    // 5. Cleanup after animation
    setTimeout(() => {
        // Remove absolute positioning and inline styles
        cardWrapper.style.cssText = '';
        inner.style.transform = ''; // Clear inline transform
        
        // Restore to grid
        placeholder.parentNode.insertBefore(cardWrapper, placeholder);
        placeholder.remove();

        // Restore all siblings
        document.querySelectorAll('.flip-card-wrapper').forEach(c => {
            c.classList.remove('state-dimmed', 'morph-active');
        });

        currentPhase = 'SELECTION';
        selectedCardId = null;

    }, 1200); // Wait for 1.2s flip animation
};

// =============================================================================
// 6. CONTENT BUILDERS
// =============================================================================

function extractGoalData(card) {
    return {
        title: card.querySelector('.card-title')?.innerText || 'Unknown Goal',
        goal: card.querySelector('.card-desc')?.innerText || '',
        domain: card.querySelector('.card-domain-badge')?.innerText || '',
        icon: card.querySelector('.card-icon-float i')?.className || 'fas fa-cube',
        gradient: card.querySelector('.card-header-plate')?.style.background || 'linear-gradient(135deg, #00bcd4 0%, #2979ff 100%)'
    };
}

function injectHeroContent(cardWrapper, goalData) {
    const backFace = cardWrapper.querySelector('.flip-card-back');
    if (!backFace) return;
    
    // Fade out old content
    backFace.style.opacity = '0';
    
    setTimeout(() => {
        backFace.innerHTML = `
            <div class="sidebar-content" style="opacity: 0;">
                <div class="card-texture-overlay"></div>
                
                <button onclick="exitStage()" class="btn btn-link text-white p-0 mb-4 text-decoration-none font-data" 
                        style="font-size: 0.7rem; letter-spacing: 2px; z-index: 20; position: relative;">
                    <i class="fas fa-arrow-left me-2"></i> RETURN TO SELECTION
                </button>

                <div class="mb-auto">
                    <div class="d-inline-flex border border-white border-opacity-50 rounded-circle p-3 mb-3" 
                         style="background: rgba(255,255,255,0.1); backdrop-filter: blur(8px);">
                        <i class="${goalData.icon}" style="font-size: 2rem;"></i>
                    </div>
                    <h1 class="font-brand mb-3" style="font-size: 2.5rem; line-height: 1.1;">${goalData.title}</h1>
                    <div class="p-3 rounded-4 border border-white border-opacity-10" 
                         style="background: rgba(0,0,0,0.2);">
                        <p class="small mb-0 opacity-90">${goalData.goal}</p>
                    </div>
                </div>

                <div id="sys-pill-stack" class="sys-pill-stack mt-4">
                    <div class="font-data opacity-50 mb-2" style="font-size: 0.65rem; letter-spacing: 2px;">SYSTEM CONFIGURATION</div>
                </div>
                
                <div class="mt-4 pt-3 border-top border-white border-opacity-10">
                    <div class="font-data opacity-50 mb-2" style="font-size: 0.65rem; letter-spacing: 2px;">STATUS</div>
                    <div id="left-panel-status" class="d-inline-flex align-items-center gap-3 px-3 py-2 rounded-pill border border-white border-opacity-10" 
                         style="background: rgba(0,0,0,0.25); backdrop-filter: blur(8px);">
                        <div class="spinner-grow spinner-grow-sm text-white"></div>
                        <span class="font-data small fw-bold" style="letter-spacing: 2px;">AWAITING IDENTITY...</span>
                    </div>
                </div>
            </div>
        `;
        
        // Fade in new content
        backFace.style.opacity = '1';
        setTimeout(() => {
            const content = backFace.querySelector('.sidebar-content');
            if (content) content.style.opacity = '1';
        }, 50);
        
    }, 300);
}

function restoreMonolithContent(cardWrapper) {
    const backFace = cardWrapper.querySelector('.flip-card-back');
    const originalIcon = cardWrapper.dataset.originalIcon || 'fas fa-cube';
    
    if (!backFace) return;
    
    backFace.style.opacity = '0';
    
    setTimeout(() => {
        backFace.innerHTML = `
            <div class="card-texture-overlay"></div>
            <div class="monolith-content">
                <i class="${originalIcon} monolith-icon"></i>
                <div class="position-absolute bottom-0 mb-5 font-data text-white-50 tracking-widest uppercase opacity-50 border border-white border-opacity-25 rounded-pill px-3 py-1" 
                     style="font-size: 0.6rem; letter-spacing: 2px;">
                    POTENTIAL FUTURE
                </div>
            </div>
        `;
        backFace.style.opacity = '1';
    }, 150);
}

function initRightPanel(goalData) {
    let stage = document.getElementById('configuration-stage');

    if (!stage) {
        stage = document.createElement('div');
        stage.id = 'configuration-stage';
        document.getElementById('stage-viewport').appendChild(stage);
    }

    stage.innerHTML = `
        <div class="split-col-right">
            ${buildWizardContent(goalData)}
        </div>
    `;

    // Trigger slide animation
    setTimeout(() => {
        const panel = stage.querySelector('.split-col-right');
        if (panel) panel.classList.add('visible');
    }, 100);
}

function buildWizardContent(goalData) {
    const identityPills = IDENTITY_TYPES.map(t => `
        <div class="identity-option-pill" onclick="window.selectIdentity('${t.id}', '${t.label}', '${t.icon}', this)">
            <div class="id-icon"><i class="fas ${t.icon}"></i></div>
            <div class="id-text">
                <h6>${t.label.toUpperCase()}</h6>
                <p>${t.desc}</p>
            </div>
            <div class="ms-auto opacity-0 transition check-icon text-primary"><i class="fas fa-check-circle"></i></div>
        </div>
    `).join('');

    const budgetOptions = BUDGET_TYPES.map(b => 
        `<option value="${b.id}">${b.label}</option>`
    ).join('');

    return `
        <div class="d-flex flex-column h-100 p-4">
            <div class="mb-4 d-flex justify-content-between align-items-end">
                <div>
                    <div class="font-data text-primary small fw-bold mb-1" style="letter-spacing: 2px;">CALIBRATION</div>
                    <h2 class="font-brand mb-0" style="font-size: 2rem;">Project Physics</h2>
                </div>
                <button class="btn btn-link text-muted font-data small text-decoration-none" onclick="window.skipToSpeculate()">
                    SKIP <i class="fas fa-fast-forward ms-1"></i>
                </button>
            </div>

            <div class="flex-grow-1 overflow-y-auto pe-2">
                <p class="text-muted small fw-bold mb-3 font-data text-uppercase">1. OPERATING ENTITY</p>
                <div class="identity-grid mb-4">${identityPills}</div>
                
                <div id="context-helper-box" class="alert bg-light border-0 d-flex gap-3 align-items-start mb-4" style="opacity: 0; transition: opacity 0.3s;">
                    <i class="fas fa-lightbulb text-warning mt-1"></i>
                    <div>
                        <h6 class="font-data text-dark fw-bold" style="font-size: 0.7rem;" id="helper-title">IMPLICATION</h6>
                        <p class="font-body text-muted small mb-0" id="helper-text">Select an identity type to see implications...</p>
                    </div>
                </div>

                <div id="parameters-area" class="row g-3 d-none">
                    <div class="col-md-6">
                        <label class="font-data text-muted fw-bold mb-2" style="font-size: 0.7rem; letter-spacing: 1px;">HORIZON</label>
                        <input type="date" class="form-control p-2 border rounded bg-light" onchange="window.updateInput('horizon', this.value)">
                    </div>
                    <div class="col-md-6">
                        <label class="font-data text-muted fw-bold mb-2" style="font-size: 0.7rem; letter-spacing: 1px;">BUDGET</label>
                        <select class="form-select p-2 border rounded bg-light" onchange="window.updateInput('budget', this.value)">
                            <option value="">Select...</option>
                            ${budgetOptions}
                        </select>
                    </div>
                </div>
            </div>

            <div class="mt-4 pt-3 border-top">
                <form action="/outcome" method="post" id="outcome-form" class="d-flex justify-content-end">
                     <input type="hidden" id="input-operator" name="operator" value="">
                     <input type="hidden" id="input-horizon" name="horizon" value="">
                     <input type="hidden" id="input-budget" name="budget" value="">
                     <button type="submit" id="btn-launch" disabled class="btn btn-dark rounded-pill px-5 py-3 font-brand shadow-lg w-100" 
                             style="opacity: 0.5; transition: all 0.3s;">
                        <i class="fas fa-rocket me-2"></i> GENERATE SOLUTION
                     </button>
                </form>
            </div>
        </div>
    `;
}

// =============================================================================
// 7. WIZARD INTERACTIONS
// =============================================================================

window.selectIdentity = function(id, label, iconClass, cardEl) {
    // Reset all options
    document.querySelectorAll('.identity-option-pill').forEach(c => {
        c.classList.remove('selected');
        const check = c.querySelector('.check-icon');
        if (check) check.style.opacity = '0';
    });

    // Activate selected
    cardEl.classList.add('selected');
    const activeCheck = cardEl.querySelector('.check-icon');
    if (activeCheck) activeCheck.style.opacity = '1';

    // Update hidden input
    const input = document.getElementById('input-operator');
    if (input) input.value = id;

    // Add pill to sidebar
    window.addSystemPill('OPERATOR', label.toUpperCase(), `fas ${iconClass}`);

    // Show context hint
    const hint = CONTEXT_HINTS[id];
    if (hint) {
        const box = document.getElementById('context-helper-box');
        const title = document.getElementById('helper-title');
        const text = document.getElementById('helper-text');

        box.style.opacity = '1';
        title.textContent = `IMPLICATION FOR "${id.toUpperCase()}"`;
        text.innerHTML = `<strong>Time Factor:</strong> ${hint.time}<br>${hint.implication}`;
    }

    // Reveal parameters
    const paramsArea = document.getElementById('parameters-area');
    if (paramsArea && paramsArea.classList.contains('d-none')) {
        paramsArea.classList.remove('d-none');
    }

    // Enable launch button
    const btn = document.getElementById('btn-launch');
    if (btn) {
        btn.disabled = false;
        btn.style.opacity = '1';
    }
};

window.addSystemPill = function(type, label, iconClass) {
    const stack = document.getElementById('sys-pill-stack');
    const statusBox = document.getElementById('left-panel-status');
    
    if (!stack) return;

    // Remove existing pill of same type
    const existing = stack.querySelector(`[data-type="${type}"]`);
    if (existing) existing.remove();

    // Create pill
    const pill = document.createElement('div');
    pill.className = 'sys-context-pill';
    pill.setAttribute('data-type', type);
    
    pill.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem;">
            <i class="${iconClass}"></i>
            <div>
                <span class="d-block opacity-60" style="font-size: 0.65rem; letter-spacing: 1px;">${type}</span>
                <span style="font-weight: 700; font-size: 0.85rem;">${label}</span>
            </div>
        </div>
        <i class="fas fa-times sys-pill-remove" onclick="window.removePill('${type}')" 
           style="cursor: pointer; opacity: 0.6; transition: opacity 0.2s;" 
           onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.6'"></i>
    `;
    
    stack.appendChild(pill);

    // Update status
    if (statusBox) {
        statusBox.innerHTML = `
            <div style="width: 10px; height: 10px; background: #10b981; border-radius: 50%; animation: pulse 2s infinite;"></div>
            <span class="font-data small fw-bold" style="letter-spacing: 2px;">SYSTEM ACTIVE</span>
        `;
    }
};

window.removePill = function(type) {
    const stack = document.getElementById('sys-pill-stack');
    const pill = stack?.querySelector(`[data-type="${type}"]`);
    if (pill) pill.remove();

    if (type === 'OPERATOR') {
        const input = document.getElementById('input-operator');
        if (input) input.value = '';
        document.querySelectorAll('.identity-option-pill').forEach(c => {
            c.classList.remove('selected');
            const check = c.querySelector('.check-icon');
            if (check) check.style.opacity = '0';
        });
    }
};

window.updateInput = function(type, val) {
    if (type === 'horizon') {
        const input = document.getElementById('input-horizon');
        if (input) input.value = val;
        window.addSystemPill('HORIZON', val, 'fas fa-calendar-day');
    } else if (type === 'budget') {
        const input = document.getElementById('input-budget');
        if (input) input.value = val;
        const label = BUDGET_TYPES.find(b => b.id === val)?.label || val;
        window.addSystemPill('BUDGET', label.toUpperCase(), 'fas fa-piggy-bank');
    }

    // Check if ready to launch
    const op = document.getElementById('input-operator')?.value;
    const btn = document.getElementById('btn-launch');
    if (btn && op) {
        btn.disabled = false;
        btn.style.opacity = '1';
    }
};

window.skipToSpeculate = function() {
    showLoadingSpinner("AUTO-CALIBRATING...", "fa-solid fa-microchip");
    document.getElementById('outcome-form')?.submit();
};

// =============================================================================
// 8. INITIALIZATION
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize card animation sequence
    initEntrySequence();

    // Regenerate goals handler
    const speculateButton = document.getElementById('generate-new-goals');
    const userInputDisplay = document.querySelector('.user-input-display');
    const userInputEdit = document.querySelector('.user-input-edit');
    const editButton = document.querySelector('.edit-user-input');
    const saveButton = document.querySelector('.save-user-input');
    const cancelButton = document.querySelector('.cancel-user-input');
    const grid = document.getElementById('goalCardsContainer');

    if (speculateButton && userInputDisplay && userInputEdit) {
        speculateButton.addEventListener('click', async () => {
            let currentInputText = userInputDisplay.classList.contains('d-none')
                ? userInputEdit.value.trim()
                : userInputDisplay.textContent.trim();

            if (currentInputText) {
                showLoadingSpinner('Analysing Trajectories...', 'fa-sync-alt');
                try {
                    const data = await regenerateGoals(currentInputText);
                    if (data && data.goals) {
                        updateGoalCards(data, currentInputText, grid);
                        initEntrySequence();
                    }
                } catch (error) {
                    console.error("Error:", error);
                } finally {
                    hideLoadingSpinner();
                }
            }
        });
    }

    if (editButton) editButton.addEventListener('click', () => handleEditButtonClick(userInputDisplay, userInputEdit, editButton, saveButton, cancelButton));
    
    if (saveButton) {
        saveButton.addEventListener('click', async () => {
            handleSaveButtonClick(userInputDisplay, userInputEdit, editButton, saveButton, cancelButton, async (updatedText) => {
                if (updatedText) {
                    showLoadingSpinner('Updating Context...', 'fa-sync-alt');
                    try {
                        const data = await regenerateGoals(updatedText);
                        if (data && data.goals) {
                            updateGoalCards(data, updatedText, grid);
                            initEntrySequence();
                        }
                    } catch (error) {
                        console.error("Error:", error);
                    } finally {
                        hideLoadingSpinner();
                    }
                }
            });
        });
    }

    if (cancelButton) cancelButton.addEventListener('click', () => handleCancelButtonClick(userInputDisplay, userInputEdit, editButton, saveButton, cancelButton));

    if (userInputEdit) {
        userInputEdit.addEventListener('keydown', (event) => {
            if (userInputEdit.classList.contains('d-none')) return;
            if (event.key === 'Enter') {
                event.preventDefault();
                saveButton.click();
            }
            if (event.key === 'Escape') {
                cancelButton.click();
            }
        });
    }

    document.addEventListener('submit', (e) => {
        if (e.target.id === 'outcome-form') {
            showLoadingSpinner("GENERATING STRUCTURED SOLUTION...", "fa-solid fa-microchip");
        }
    });
});