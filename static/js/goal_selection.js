// static/js/goal_selection.js
// SSPEC "Horizon Fusion" - Goal Selection Controller (v2026.01)

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
        label: 'Individual / Just Me',
        icon: 'fa-user',
        desc: "You are acting alone. Maximum agility, but limited by your personal time and energy.",
        color: "#00bcd4" // Teal
    },
    {
        id: 'Grassroots',
        label: 'Community / Grassroots',
        icon: 'fa-users',
        desc: "A volunteer network or collective. Driven by passion and consensus rather than payroll.",
        color: "#8bc34a" // Light Green
    },
    {
        id: 'Team',
        label: 'Small Team / Startup',
        icon: 'fa-rocket',
        desc: "A dedicated group with specific roles. Driven by speed, product, and growth.",
        color: "#ff9800" // Orange
    },
    {
        id: 'NonProfit',
        label: 'Non-Profit / NGO',
        icon: 'fa-hand-holding-heart',
        desc: "Mission-driven organization. Accountability is to donors, grants, and public trust.",
        color: "#e91e63" // Pink
    },
    {
        id: 'Enterprise',
        label: 'Corporate / Enterprise',
        icon: 'fa-building',
        desc: "Large-scale commercial entity. High resources, but governed by profit and quarterly targets.",
        color: "#3f51b5" // Indigo
    },
    {
        id: 'Public',
        label: 'Public / Civic Body',
        icon: 'fa-landmark',
        desc: "Government or Municipal entity. High leverage, but bound by regulation and public procedure.",
        color: "#607d8b" // Blue Grey
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
        time: "Timeline is 100% dependent on your personal bandwidth.",
        implication: "SSPEC will structure the plan around **Low-Code Tools**, **Freelance Support**, and **'Sweat Equity'** to avoid burnout."
    },
    'Grassroots': {
        time: "Timeline fluctuates based on volunteer momentum.",
        implication: "SSPEC will focus on **Community Organizing**, **Social Capital**, and **Viral Advocacy** to replace financial capital."
    },
    'Team': {
        time: "Timeline is aggressive; governed by runway and burn rate.",
        implication: "SSPEC will suggest **Agile Workflows**, **MVP Iterations**, and **Vendor Partnerships** for speed."
    },
    'NonProfit': {
        time: "Timeline often dictated by funding cycles and board approvals.",
        implication: "SSPEC will emphasize **Impact Measurement**, **Grant Compliance**, and **Stakeholder Stewardship**."
    },
    'Enterprise': {
        time: "Timeline moves in fiscal quarters.",
        implication: "SSPEC will prioritize **Risk Mitigation**, **IP Protection**, and **Scalable Infrastructure**."
    },
    'Public': {
        time: "Timeline is slow and steady due to regulatory requirements.",
        implication: "SSPEC will map out **Procurement Protocols**, **Public Hearings**, and **Compliance Checks**."
    }
};

const TOTAL_STEPS = 3;

// =============================================================================
// 2. STATE MANAGEMENT
// =============================================================================

const State = {
    phase: 'INIT', // INIT, DEALING, SELECTION, CONFIG, RETURNING
    selectedCardId: null,
    selectedCardData: null,
    wizardStep: 1,
    
    // Color harmony data (populated from backend)
    colorData: window.GOAL_COLOR_DATA || [],
    
    // Configuration values
    configuration: {
        operator: null,
        horizon: null,
        budget: null
    }
};

// =============================================================================
// 3. COLOR UTILITIES
// =============================================================================

function getGoalColors(cardId) {
    const goal = State.colorData.find(g => 
        (g.title || "").toLowerCase().replace(/\s+/g, '-') === cardId
    );
    return goal || {};
}

function hsvToHex(h, s = 0.75, v = 0.9) {
    const hNorm = h / 360;
    const i = Math.floor(hNorm * 6);
    const f = hNorm * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    let r, g, b;
    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }
    const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function getHarmonizedPillColor(baseHue, offset = 30) {
    const pillHue = (baseHue + offset) % 360;
    return hsvToHex(pillHue, 0.65, 0.90);
}

// =============================================================================
// 4. PHASE TRANSITIONS (The State Machine)
// =============================================================================

function transitionTo(newPhase, payload = {}) {
    const oldPhase = State.phase;
    console.log(`[SSPEC] Phase Transition: ${oldPhase} → ${newPhase}`);
    
    State.phase = newPhase;
    
    switch (newPhase) {
        case 'DEALING': handleDealingPhase(); break;
        case 'SELECTION': handleSelectionPhase(); break;
        case 'CONFIG': handleConfigPhase(payload.cardWrapper, payload.goalData); break;
        case 'RETURNING': handleReturningPhase(); break;
    }
}

// =============================================================================
// 5. PHASE HANDLERS
// =============================================================================

function handleDealingPhase() {
    const cards = document.querySelectorAll('.flip-card-wrapper');
    cards.forEach((card, index) => {
        card.classList.remove('state-selection', 'state-config', 'state-dimmed', 'state-returning');
        card.style.cssText = '';
        const inner = card.querySelector('.flip-card-inner');
        if (inner) inner.style.transform = '';
        
        // Store original icon
        const iconEl = card.querySelector('.flip-card-back i.monolith-icon');
        if (iconEl) card.dataset.originalIcon = iconEl.className;
        
        card.classList.add('state-dealing');
        void card.offsetWidth; // Force Reflow
        
        const revealDelay = 300 + (index * 200);
        setTimeout(() => {
            card.classList.remove('state-dealing');
            card.classList.add('state-revealing');
            setTimeout(() => {
                card.classList.remove('state-revealing');
                card.classList.add('state-selection');
            }, 600);
        }, revealDelay);
    });
    
    setTimeout(() => {
        if (State.phase === 'DEALING') transitionTo('SELECTION');
    }, 400 + (cards.length * 200) + 800);
}

function handleSelectionPhase() {
    const cards = document.querySelectorAll('.flip-card-wrapper');
    cards.forEach(card => {
        card.classList.remove('state-dealing', 'state-revealing', 'state-config', 'state-dimmed', 'state-returning');
        card.classList.add('state-selection');
        card.style.cssText = '';
        const inner = card.querySelector('.flip-card-inner');
        if (inner) inner.style.transform = '';
    });
}

function handleConfigPhase(cardWrapper, goalData) {
    if (!cardWrapper) return;
    
    State.selectedCardId = cardWrapper.dataset.cardId || goalData?.title;
    State.selectedCardData = goalData;
    State.wizardStep = 1;
    
    const viewport = document.getElementById('stage-viewport');
    
    // 1. Dim Siblings
    document.querySelectorAll('.flip-card-wrapper').forEach(card => {
        if (card !== cardWrapper) card.classList.add('state-dimmed');
    });
    
    // 2. Placeholder
    const rect = cardWrapper.getBoundingClientRect();
    const viewRect = viewport.getBoundingClientRect();
    const placeholder = document.createElement('div');
    placeholder.className = 'grid-placeholder';
    placeholder.id = 'active-card-placeholder';
    placeholder.style.width = rect.width + 'px';
    placeholder.style.height = rect.height + 'px';
    cardWrapper.parentNode.insertBefore(placeholder, cardWrapper);
    
    // 3. Promote to Absolute
    const startTop = rect.top - viewRect.top;
    const startLeft = rect.left - viewRect.left;
    viewport.appendChild(cardWrapper);
    cardWrapper.style.position = 'absolute';
    cardWrapper.style.top = startTop + 'px';
    cardWrapper.style.left = startLeft + 'px';
    cardWrapper.style.width = rect.width + 'px';
    cardWrapper.style.height = rect.height + 'px';
    cardWrapper.style.margin = '0';
    cardWrapper.style.zIndex = '100';
    
    // 4. Animate to Sidebar
    void cardWrapper.offsetWidth;
    cardWrapper.classList.remove('state-selection');
    cardWrapper.classList.add('state-config'); // Triggers CSS morph
    
    requestAnimationFrame(() => {
        cardWrapper.style.top = '0px';
        cardWrapper.style.left = '0px';
        cardWrapper.style.height = '100%';
        // Width is handled by CSS .state-config
    });
    
    // 5. Activate Wizard & Inject Content
    setTimeout(() => {
        const stage = document.getElementById('configuration-stage');
        if(stage) stage.classList.add('active');
        
        injectHeroContent(cardWrapper, goalData);
        updateSystemStatus('Ready for identity selection', 'active');
    }, 400);
}

function handleReturningPhase() {
    const cardWrapper = document.querySelector('.flip-card-wrapper.state-config');
    const placeholder = document.getElementById('active-card-placeholder');
    const stage = document.getElementById('configuration-stage');
    
    if(stage) stage.classList.remove('active'); // Hide Wizard
    
    if (!cardWrapper || !placeholder) {
        transitionTo('SELECTION');
        return;
    }
    
    const viewport = document.getElementById('stage-viewport');
    restoreMonolithContent(cardWrapper);
    
    // Calculate Return Path
    const pRect = placeholder.getBoundingClientRect();
    const vRect = viewport.getBoundingClientRect();
    
    cardWrapper.classList.remove('state-config');
    cardWrapper.classList.add('state-returning');
    
    requestAnimationFrame(() => {
        cardWrapper.style.top = (pRect.top - vRect.top) + 'px';
        cardWrapper.style.left = (pRect.left - vRect.left) + 'px';
        cardWrapper.style.width = pRect.width + 'px';
        cardWrapper.style.height = pRect.height + 'px';
    });
    
    setTimeout(() => {
        cardWrapper.style.cssText = '';
        const inner = cardWrapper.querySelector('.flip-card-inner');
        if(inner) inner.style.transform = '';
        
        placeholder.parentNode.insertBefore(cardWrapper, placeholder);
        placeholder.remove();
        
        // Reset Logic
        State.selectedCardId = null;
        State.selectedCardData = null;
        State.configuration = { operator: null, horizon: null, budget: null };
        State.wizardStep = 1;
        
        // Clear Wizard UI
        document.querySelectorAll('.wizard-identity-pill').forEach(p => p.classList.remove('selected'));
        const hintBox = document.getElementById('context-helper-box');
        if(hintBox) hintBox.classList.add('d-none');
        
        updateSystemStatus('Standing by');
        transitionTo('SELECTION');
    }, 800);
}

// =============================================================================
// 6. CONTENT BUILDERS
// =============================================================================

function extractGoalData(card) {
    const cardId = card.dataset.cardId;
    const colorHue = parseFloat(card.dataset.colorHue) || 180;
    const backendData = getGoalColors(cardId);
    
    return {
        id: cardId,
        title: card.dataset.cardTitle || "Unknown Goal",
        goal: card.querySelector('.card-desc-large')?.innerText || "",
        domain: card.querySelector('.card-domain-badge-large')?.innerText || "",
        icon: card.querySelector('.card-icon-float-large i')?.className || "fas fa-cube",
        colorHue: colorHue,
        // Fallback or use backend data
        iconColor: backendData.icon_color || hsvToHex(colorHue, 0.9, 0.7)
    };
}

function injectHeroContent(cardWrapper, goalData) {
    const backFace = cardWrapper.querySelector('.flip-card-back');
    if (!backFace) return;
    
    backFace.style.opacity = '0';
    
    setTimeout(() => {
        backFace.innerHTML = `
            <!-- Texture overlay OUTSIDE hero-card-content to cover entire back face -->
            <div class="card-texture-overlay"></div>
            
            <div class="hero-card-content">
                <!-- Ghost icon background -->
                <i class="${goalData.icon} hero-ghost-icon"></i>
                
                <!-- Return button -->
                <button onclick="window.exitStage()" class="hero-return-button">
                    <i class="fas fa-arrow-left"></i> RETURN TO CHOICES
                </button>
                
                <!-- Domain pill - NO inline styles, let CSS handle it -->
                <div class="hero-domain-pill">
                    <i class="${goalData.icon}"></i>
                    <span>${goalData.domain}</span>
                </div>
                
                <!-- Title -->
                <h2 class="hero-title">${goalData.title}</h2>
                
                <!-- Description box -->
                <div class="hero-desc-box">
                    <div class="hero-desc-accent"></div>
                    <p class="hero-desc-text">${goalData.goal}</p>
                </div>
                
                <!-- System configuration label -->
                <div style="margin-top: auto;">
                    <div class="hero-config-label">SYSTEM CONFIGURATION</div>
                    <div id="sys-pill-stack" class="d-flex flex-column gap-2">
                        <!-- Pills added dynamically -->
                    </div>
                </div>
                
                
        `;
        backFace.style.opacity = '1';
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
                <div class="monolith-icon-circle"><i class="${originalIcon} monolith-icon"></i></div>
                <div class="font-data text-white-50 x-small tracking-widest opacity-75 border border-white border-opacity-25 rounded-pill px-3 py-1">STRUCTURED SPECULATION</div>
            </div>
        `;
        backFace.style.opacity = '1';
    }, 150);
}

// =============================================================================
// 7. WIZARD LOGIC & HELPERS
// =============================================================================

function updateSystemStatus(text, type = 'active') {
    const textEl = document.getElementById('global-status-text');
    const dotEl = document.getElementById('global-status-dot');
    
    if (textEl && dotEl) {
        textEl.textContent = text;
        textEl.className = 'font-body small fw-bold transition-colors'; // Reset
        
        if (type === 'working') {
            textEl.classList.add('text-info');
            dotEl.className = 'rounded-circle bg-info shadow-sm animate-pulse';
        } else if (type === 'active') {
            textEl.classList.add('text-dark');
            dotEl.className = 'rounded-circle bg-success shadow-sm';
        } else {
            textEl.classList.add('text-muted');
            dotEl.className = 'rounded-circle bg-secondary shadow-sm';
        }
    }
}

function addSystemPill(type, value, iconClass) {
    const stack = document.getElementById('sys-pill-stack');
    if (!stack) return;
    
    // Get Colors
    const baseHue = State.selectedCardData?.colorHue || 180;
    const typeOffsets = { 'OPERATOR': 0, 'HORIZON': 60, 'BUDGET': 120 };
    const offset = typeOffsets[type] || 30;
    const pillColor = getHarmonizedPillColor(baseHue, offset);
    
    // Remove Existing
    const existing = stack.querySelector(`[data-type="${type}"]`);
    if (existing) existing.remove();
    
    // Create Atomic Pill
    const pill = document.createElement('div');
    pill.className = 'system-pill-display shadow-sm';
    pill.setAttribute('data-type', type);
    
    // STYLING: Match Outcome Page Atoms (White Pill, Colored Border)
    pill.style.cssText = `
        display: inline-flex; align-items: center; gap: 0.75rem;
        padding: 0.4rem 1rem 0.4rem 0.4rem;
        background: rgba(255, 255, 255, 0.95);
        border: 2px solid ${pillColor};
        border-radius: 50px;
        width: auto; max-width: 100%;
        transition: all 0.3s ease;
        animation: pillPopIn 0.4s forwards;
    `;
    
    pill.innerHTML = `
        <div style="width: 28px; height: 28px; border-radius: 50%; background: ${pillColor}; color: white; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; flex-shrink: 0;">
            <i class="${iconClass}"></i>
        </div>
        <div style="display: flex; flex-direction: column; line-height: 1;">
            <span style="font-size: 0.55rem; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: #64748b; margin-bottom: 2px;">${type}</span>
            <span style="font-size: 0.8rem; font-weight: 700; color: #1e293b;">${value}</span>
        </div>
    `;
    stack.appendChild(pill);
    
    // Friendly Status Update
    const friendlyType = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
    updateSystemStatus(`Setting ${friendlyType} to ${value}...`, 'working');
    setTimeout(() => {
        updateSystemStatus(`${friendlyType} updated`, 'active');
    }, 800);
}

function suggestIdentity() {
    const goalText = (State.selectedCardData?.goal + " " + State.selectedCardData?.title).toLowerCase();
    let suggestion = 'Individual';
    
    if (goalText.match(/community|neighborhood|club|collective/)) suggestion = 'Grassroots';
    else if (goalText.match(/startup|app|platform|scale/)) suggestion = 'Team';
    else if (goalText.match(/foundation|charity|aid|relief/)) suggestion = 'NonProfit';
    else if (goalText.match(/city|law|public|park/)) suggestion = 'Public';
    else if (goalText.match(/corp|global|stock/)) suggestion = 'Enterprise';
    
    setTimeout(() => {
        const card = document.querySelector(`.wizard-identity-pill[onclick*="'${suggestion}'"]`);
        if(card) {
            card.classList.add('suggested-pulse');
            // Optional: updateSystemStatus(`Suggestion: ${suggestion}`, 'active');
        }
    }, 500);
}

// =============================================================================
// 8. RE-RENDER LOGIC (Zombie Killer)
// =============================================================================

function renderNewGoals(goals, gridElement) {
    gridElement.innerHTML = '';
    
    goals.forEach((goal, index) => {
        const hue = goal.color_hue || (index * 60) % 360;
        const gradient = goal.card_gradient || `linear-gradient(135deg, hsl(${hue}, 70%, 50%), hsl(${hue + 30}, 80%, 40%))`;
        const plateGradient = goal.plate_gradient || `linear-gradient(135deg, hsl(${hue}, 70%, 60%), hsl(${hue}, 70%, 50%))`;
        const btnGradient = goal.btn_gradient || `linear-gradient(to right, hsl(${hue}, 70%, 50%), hsl(${hue}, 80%, 40%))`;
        const iconColor = goal.icon_color || '#fff';

        const cardWrapper = document.createElement('div');
        cardWrapper.className = `flip-card-wrapper ${!goal.is_compliant ? 'violation' : ''}`;
        cardWrapper.dataset.cardId = `goal-${index}`;
        cardWrapper.dataset.cardTitle = goal.title;
        cardWrapper.dataset.colorHue = hue;
        cardWrapper.onclick = function() { window.selectGoal(this); };

        cardWrapper.innerHTML = `
            <div class="flip-card-inner">
                <div class="flip-card-back" style="background: ${gradient};">
                    <div class="card-texture-overlay"></div>
                    <div class="monolith-content">
                        <div class="monolith-icon-circle"><i class="${goal.icon} monolith-icon"></i></div>
                        ${!goal.is_compliant 
                            ? `<span class="badge bg-black bg-opacity-25 border border-danger text-white font-data px-3 py-2">PROTOCOL VIOLATION</span>`
                            : `<div class="font-data text-white-50 x-small tracking-widest opacity-75 border border-white border-opacity-25 rounded-pill px-3 py-1">STRUCTURED SPECULATION</div>`
                        }
                    </div>
                </div>
                <div class="flip-card-front">
                        <div class="card-header-plate" style="background: ${plateGradient};">
                            <div class="card-texture-overlay"></div>
                            <div class="card-domain-badge-large">${(goal.domain || 'GENERAL').toUpperCase()}</div>
                            <div class="card-icon-float-large"><i class="${goal.icon}" style="color: ${iconColor};"></i></div>
                        </div>
                        <div class="card-body-large">
                            <h3 class="card-title-large">${goal.title}</h3>
                            <p class="card-desc-large">${goal.goal}</p>
                        </div>
                        <div class="card-footer-large">
                            <button type="button" class="btn-select-pill-large" style="background: ${btnGradient};">
                                ${!goal.is_compliant ? 'PROTOCOL VIOLATION' : 'CHOOSE GOAL'}
                            </button>
                        </div>
                </div>
            </div>
            <!-- Dynamic Dock for System Pills -->
            <div class="system-pill-dock position-absolute top-0 start-0 w-100 p-4 d-flex flex-column gap-2" style="z-index: 5; pointer-events: none;"></div>
        `;
        gridElement.appendChild(cardWrapper);
    });
}

// =============================================================================
// 9. INITIALIZATION & LISTENERS
// =============================================================================

// Window Scope Actions (HTML Handlers)
window.selectGoal = function(cardWrapper) {
    if (State.phase !== 'SELECTION' && State.phase !== 'DEALING') return;
    if (cardWrapper.classList.contains('violation')) return;
    
    State.selectedCardData = extractGoalData(cardWrapper);
    transitionTo('CONFIG', { cardWrapper, goalData: State.selectedCardData });
    suggestIdentity();
};

window.exitStage = function() {
    if (State.phase === 'CONFIG') transitionTo('RETURNING');
};

window.selectIdentity = function(id, el) {
    document.querySelectorAll('.wizard-identity-pill').forEach(p => p.classList.remove('selected'));
    el.classList.add('selected');
    State.configuration.operator = id;
    
    // Add Contextual Hint
    const hintData = CONTEXT_HINTS[id];
    const hintBox = document.getElementById('context-helper-box');
    const hintText = document.getElementById('context-helper-text');
    
    if(hintData && hintText) {
        hintBox.classList.remove('d-none', 'opacity-0');
        hintBox.classList.add('fade-in-up');
        hintText.innerHTML = `
            <div class="mb-3">
                <i class="fas fa-history me-2 text-warning"></i> 
                <span class="text-white-50 x-small tracking-widest">TEMPORAL PHYSICS</span>
                <div class="text-white small mt-1">${hintData.time}</div>
            </div>
            <div>
                <i class="fas fa-chess-board me-2 text-info"></i>
                <span class="text-white-50 x-small tracking-widest">STRATEGIC IMPLICATION</span>
                <div class="text-white small mt-1">${hintData.implication}</div>
            </div>
        `;
    }
    
    // Add Pill
    const type = IDENTITY_TYPES.find(t => t.id === id);
    addSystemPill('OPERATOR', type.label.toUpperCase(), `fas ${type.icon}`);
    document.getElementById('btn-next').disabled = false;
};

// ... (Add selectBudget, setHorizon handlers similarly or inline if simpler) ...

window.nextStep = function() {
    if (State.wizardStep < TOTAL_STEPS) {
        // Logic to swap steps (assuming step-1, step-2 divs exist)
        // For prototype, simple class toggle:
        document.getElementById(`step-${State.wizardStep}`).classList.add('d-none');
        State.wizardStep++;
        document.getElementById(`step-${State.wizardStep}`).classList.remove('d-none');
        // Reset btn state
    } else {
        submitConfiguration();
    }
};

window.skipToSpeculate = function() {
    showLoadingSpinner("AUTO-CALIBRATING...", "fa-solid fa-microchip");
    submitConfiguration();
};

function submitConfiguration() {
    const form = document.getElementById('final-submit-form');
    // Populate Form
    document.getElementById('form-goal').value = State.selectedCardData.goal;
    document.getElementById('form-title').value = State.selectedCardData.title;
    document.getElementById('form-domain').value = State.selectedCardData.domain;
    document.getElementById('form-operator').value = State.configuration.operator || "";
    
    // Show spinner
    import('./base_functions.js').then(({ showLoadingSpinner }) => {
        showLoadingSpinner("GENERATING STRUCTURED SOLUTION...", "fa-microchip");
        form.submit();
    });
}

// MAIN INIT
document.addEventListener('DOMContentLoaded', () => {
    console.log('[SSPEC] Goal Selection Module Initialized');
    
    transitionTo('DEALING');
    
    // ZOMBIE KILLER (Re-Calculate Button)
    const oldSpeculateBtn = document.getElementById('generate-new-goals');
    if (oldSpeculateBtn) {
        const newSpeculateBtn = oldSpeculateBtn.cloneNode(true);
        oldSpeculateBtn.parentNode.replaceChild(newSpeculateBtn, oldSpeculateBtn);
        
        newSpeculateBtn.addEventListener('click', async () => {
            const display = document.querySelector('.user-input-display');
            const edit = document.querySelector('.user-input-edit');
            const grid = document.getElementById('goalCardsContainer');
            const text = (!display.classList.contains('d-none')) ? display.textContent.trim() : edit.value.trim();
            
            if(text) {
                import('./base_functions.js').then(({ showLoadingSpinner, hideLoadingSpinner, regenerateGoals }) => {
                    showLoadingSpinner('Analysing Trajectories...', 'fa-sync-alt');
                    regenerateGoals(text).then(data => {
                        if(data?.goals) {
                            State.colorData = data.goals;
                            window.GOAL_COLOR_DATA = data.goals;
                            renderNewGoals(data.goals, grid);
                            State.phase = 'INIT';
                            State.selectedCardId = null;
                            setTimeout(() => transitionTo('DEALING'), 50);
                        }
                    }).finally(() => hideLoadingSpinner());
                });
            }
        });
    }
    
    // Animation CSS Injection
    if (!document.getElementById('pill-anim-style')) {
        const style = document.createElement('style');
        style.id = 'pill-anim-style';
        style.innerHTML = `
            @keyframes pillPopIn { 0% { opacity: 0; transform: scale(0.8) translateX(-20px); } 100% { opacity: 1; transform: scale(1) translateX(0); } }
        `;
        document.head.appendChild(style);
    }
});