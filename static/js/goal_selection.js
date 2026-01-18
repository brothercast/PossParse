// static/js/goal_selection.js
// SSPEC "Horizon Fusion" - Goal Selection Controller (v2026.16 - Architectural Integrity)

import {
    regenerateGoals,
    showLoadingSpinner,
    hideLoadingSpinner
} from './base_functions.js';

// =============================================================================
// 1. DATA DEFAULTS (THE ONTOLOGY)
// =============================================================================

const DEFAULTS = {
    OPERATOR: [
        { id: 'Individual', label: 'Just Me (Individual Contributor)', icon: 'fa-user-astronaut', hint: "Maximum autonomy, finite bandwidth. The Engine will prioritize automation, AI tools, and freelancers to multiply your output." },
        { id: 'Grassroots', label: 'Community Group (Volunteers)', icon: 'fa-hands-holding-circle', hint: "Powered by people, not payroll. The Engine will focus on social capital, viral messaging, and reducing friction for volunteers." },
        { id: 'Startup', label: 'Small Team / Startup', icon: 'fa-rocket', hint: "High speed, high risk. The Engine will structure for 'Fail Fast' iterations, rapid prototyping, and growth metrics." },
        { id: 'NonProfit', label: 'Non-Profit / NGO', icon: 'fa-heart', hint: "Mission over profit. The Engine will emphasize grant compliance, stakeholder alignment, and transparency reporting." },
        { id: 'Enterprise', label: 'Established Corp / Enterprise', icon: 'fa-building', hint: "Resource rich, process heavy. The Engine will account for legal compliance, data security, and departmental integration." },
        { id: 'Public', label: 'Government / Public Agency', icon: 'fa-landmark', hint: "Public trust is paramount. The Engine will map out procurement cycles, regulatory hurdles, and civic engagement." }
    ],
    BUDGET: [
        { id: 'Zero', label: 'Zero Budget (Time & Effort)', icon: 'fa-hammer', hint: "No money, just grit. We will look for free-tier tools, barter networks, open-source assets, and organic growth." },
        { id: 'SelfFunded', label: 'Self-Funded (Personal Savings)', icon: 'fa-piggy-bank', hint: "You pay the bills. We will prioritize low-overhead solutions and 'revenue-first' tactics to protect your runway." },
        { id: 'Crowd', label: 'Crowd-Backed (Public Support)', icon: 'fa-bullhorn', hint: "Funded by the audience. We will prioritize marketing assets, video storytelling, and community management." },
        { id: 'Grant', label: 'Grant / Philanthropic', icon: 'fa-file-signature', hint: "Money with strings attached. We will align the roadmap with funding tranches and impact reporting requirements." },
        { id: 'Investor', label: 'Investor Capital (Equity)', icon: 'fa-chart-line', hint: "Fuel for the fire. We will focus on scalability, burn rate, and building defensible 'moats' against competitors." },
        { id: 'Taxpayer', label: 'Public / Taxpayer Funds', icon: 'fa-scale-balanced', hint: "Strict oversight. We will ensure adherence to budget codes, audits, and public procurement laws." }
    ],
    SCALE: [
        { id: 'Household', label: 'Household / Neighborhood', icon: 'fa-home', hint: "Hyper-local. Impact is face-to-face. Logistics are walkable. Success relies on personal trust." },
        { id: 'City', label: 'City / Municipality', icon: 'fa-city', hint: "Civic scale. Involves local government, zoning laws, and civic infrastructure." },
        { id: 'Regional', label: 'State / Regional', icon: 'fa-map', hint: "Broad geography. Requires supply chains, distribution networks, and broader coordination." },
        { id: 'National', label: 'National', icon: 'fa-flag-usa', hint: "Mass scale. Dealing with federal regulations, mass media markets, and country-wide logistics." },
        { id: 'Global', label: 'Global / International', icon: 'fa-earth-americas', hint: "Boundary-less physical impact. Dealing with international trade, localization, and cross-border logistics." },
        { id: 'Digital', label: 'Digital / Decentralized', icon: 'fa-network-wired', hint: "Everywhere and nowhere. Focus on server architecture, protocols, and digital distribution." }
    ],
    MODALITY: [
        { id: 'Iterative', label: 'Iterative (Build & Learn)', icon: 'fa-rotate', hint: "The 'Agile' approach. We build a small version, test it, learn, and improve. Best for unknowns." },
        { id: 'Linear', label: 'Linear Planning (Step-by-Step)', icon: 'fa-layer-group', hint: "The 'Waterfall' approach. Measure twice, cut once. We plan everything before starting. Best for construction/hardware." },
        { id: 'Swarm', label: 'Decentralized Swarm', icon: 'fa-hive', hint: "No central command. Parallel autonomous groups working on shared protocols. Best for movements." },
        { id: 'Crisis', label: 'Emergency Response (Triage)', icon: 'fa-truck-medical', hint: "Speed is life. We prioritize immediate action over efficiency or cost. Best for disasters." },
        { id: 'Consensus', label: 'Consensus (Democratic)', icon: 'fa-users-rectangle', hint: "Slow but steady. Decisions are made by vote or agreement. High buy-in, slower execution." },
        { id: 'Research', label: 'Experimental / Research', icon: 'fa-flask', hint: "The Lab approach. The goal is discovery, not shipping a product. We focus on data validity and hypothesis testing." }
    ]
};

// =============================================================================
// 2. CANONICAL HELPERS (The Source of Truth)
// =============================================================================

/**
 * 2a. Icon Resolution Strategy
 * 1. Ontology: Check DEFAULTS for exact ID or Label match.
 * 2. Heuristics: Fallback to keyword matching if data is missing.
 */
function getIconForOption(opt) {
    const fromOntology = _getIconFromOntology(opt);
    if (fromOntology) return fromOntology;
    
    return _getIconFromHeuristics(opt);
}

function _getIconFromOntology(opt) {
    for (let cat in DEFAULTS) {
        const match = DEFAULTS[cat].find(o => o.id === opt || o.label === opt);
        if (match) return match.icon;
    }
    return null;
}

function _getIconFromHeuristics(opt) {
    const lower = opt.toLowerCase();
    if (lower.includes('team') || lower.includes('start')) return 'fa-rocket';
    if (lower.includes('fund') || lower.includes('capital')) return 'fa-coins';
    if (lower.includes('community')) return 'fa-users';
    if (lower.includes('research')) return 'fa-flask';
    return 'fa-check-circle'; // Safe default
}

/**
 * 2b. Color Logic (Thematic Buckets)
 * Resolves color based on semantic category keywords.
 */
function getColorForOption(opt) {
    const themes = {
        'cyan': '#06b6d4',   // Identity / Drivers
        'green': '#22c55e',  // Fuel / Growth / Zero-Cost
        'orange': '#f97316', // Velocity / Iteration
        'pink': '#ec4899',   // Social / Community / Grant
        'indigo': '#6366f1', // Structure / Enterprise / Scale
        'slate': '#64748b'   // Default / Neutral
    };

    const lower = opt.toLowerCase();

    // DRIVER / IDENTITY
    if (lower.includes('me') || lower.includes('individual') || lower.includes('operator')) return themes.cyan;
    
    // FUEL / RESOURCES
    if (lower.includes('sweat') || lower.includes('zero') || lower.includes('self') || lower.includes('boot')) return themes.green;
    
    // SPEED / PROCESS
    if (lower.includes('start') || lower.includes('agile') || lower.includes('iter') || lower.includes('crisis')) return themes.orange;
    
    // SOCIAL / GRANTS
    if (lower.includes('non') || lower.includes('profit') || lower.includes('crowd') || lower.includes('grant')) return themes.pink;
    
    // STRUCTURE / SCALE
    if (lower.includes('enter') || lower.includes('corp') || lower.includes('public') || lower.includes('linear')) return themes.indigo;

    return themes.slate; 
}

/**
 * 2c. Date Logic (Safe Clone)
 * Prevents mutation side-effects on the Date object.
 */
function getSmartHorizonDate(label) {
    const today = new Date();
    const target = new Date(today); // Explicit clone for safety
    
    const map = {
        "3 Months": 3, "6 Months": 6, "1 Year": 12, "2 Years": 24, "5 Years": 60, "ASAP": 1
    };
    
    const months = map[label] || 0;
    target.setMonth(today.getMonth() + months);
    return target.toISOString().split('T')[0];
}

function formatDateFriendly(dateStr) {
    if (!dateStr) return "Pending Calibration...";
    const date = new Date(dateStr);
    if(isNaN(date.getTime())) return "Invalid Date";
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// =============================================================================
// 3. STATE MANAGEMENT
// =============================================================================

const State = {
    phase: 'INIT', 
    selectedCardId: null,
    selectedCardData: null,
    sysConfig: window.WIZARD_CONFIG || {},
    colorData: window.GOAL_COLOR_DATA || [],
    currentStepIndex: 0,
    steps: [], 
    config: {},     
    extraParams: [] 
};

// =============================================================================
// 4. GLOBAL BINDINGS (Public Interface)
// =============================================================================

// Expose these explicitly for HTML onclick attributes
window.selectGoal = function(cardWrapper) { handleCardClick(cardWrapper); };
window.selectOption = function(key, value) {
    State.config[key] = value;
    let icon = getIconForOption(value);
    injectPillToHero(key, value, icon);
    renderWizard();
};
window.toggleExtraParam = function(id) { toggleExtraParamLogic(id); };
window.wizardNext = function() { wizardNavigation('next'); };
window.wizardBack = function() { wizardNavigation('back'); };
window.jumpToStep = function(idx) { wizardNavigation('jump', idx); };
window.submitConfig = function() { submitConfigLogic(); };
window.exitStage = function() { if (State.phase === 'CONFIG') transitionTo('RETURNING'); };

// Insight Hover Helpers
window.updateInsightText = function(text) {
    const box = document.getElementById('active-insight-box');
    if(box) box.querySelector('.context-insight-body').innerText = text;
};
window.resetInsightText = function() {
    const box = document.getElementById('active-insight-box');
    if(box) box.querySelector('.context-insight-body').innerText = "Hover over an option to see how it affects the Engine.";
};
window.handleTagInput = handleTagInput;
window.removeTag = removeTag;


// =============================================================================
// 5. BUSINESS LOGIC (Internal)
// =============================================================================

function toggleExtraParamLogic(id) {
    const idx = State.extraParams.indexOf(id);
    const btn = document.querySelector(`.option-card-pill[onclick*="${id}"]`);
    
    if(idx > -1) {
        // Remove
        State.extraParams.splice(idx, 1);
        State.steps = State.steps.filter(s => s.id !== id);
        if(btn) btn.classList.remove('selected');
    } else {
        // Add
        State.extraParams.push(id);
        if(btn) btn.classList.add('selected');
        
        let conf = {};
        if (id === 'DIRECTIVE') {
            conf = { step_label: 'Core Values', step_icon: 'fa-heart', question: 'What do we stand for?', helper: 'The Engine needs your moral compass.', ui_type: 'tags', placeholder: 'e.g. Transparency, Zero Waste' };
        } else if (id === 'AVOIDANCE') {
            conf = { step_label: 'Dealbreakers', step_icon: 'fa-ban', question: 'What must we avoid?', helper: 'Negative constraints are vital.', ui_type: 'tags', placeholder: 'e.g. Debt, Burnout' };
        } else if (id === 'SCALE') {
            conf = { step_label: 'Scale', step_icon: 'fa-map-location-dot', question: 'What is the footprint?', helper: 'Geography dictates physics.', options: DEFAULTS.SCALE.map(o => o.label) };
        } else if (id === 'MODALITY') {
            conf = { step_label: 'Work Style', step_icon: 'fa-people-group', question: 'How do we coordinate?', helper: 'Rhythm dictates structure.', options: DEFAULTS.MODALITY.map(o => o.label) };
        }

        const stepDef = { id: id, ...conf };
        State.steps.splice(State.currentStepIndex + 1, 0, stepDef);
    }
    
    const nextBtn = document.getElementById('fork-next-btn');
    if(nextBtn) {
        if (State.extraParams.length > 0) {
            nextBtn.innerHTML = `CONFIGURE EXTRAS (${State.extraParams.length}) <i class="fas fa-arrow-right ms-2"></i>`;
            nextBtn.style.opacity = '1';
            nextBtn.style.pointerEvents = 'auto';
        } else {
            nextBtn.style.opacity = '0';
            nextBtn.style.pointerEvents = 'none';
        }
    }
}

function wizardNavigation(action, idx=null) {
    if (action === 'next') {
        if(State.currentStepIndex < State.steps.length - 1) {
            State.currentStepIndex++;
            renderWizard();
        } else {
            window.submitConfig();
        }
    } else if (action === 'back') {
        if(State.currentStepIndex > 0) {
            State.currentStepIndex--;
            renderWizard();
        }
    } else if (action === 'jump') {
        if(idx <= State.currentStepIndex + 1) {
            State.currentStepIndex = idx;
            renderWizard();
        }
    }
}

function submitConfigLogic() {
    const form = document.getElementById('final-submit-form');
    document.getElementById('form-goal').value = State.selectedCardData.goal;
    document.getElementById('form-title').value = State.selectedCardData.title;
    document.getElementById('form-domain').value = State.selectedCardData.domain;
    document.getElementById('form-domain-icon').value = State.selectedCardData.icon;
    
    form.querySelectorAll('.dynamic-param').forEach(e => e.remove());

    Object.keys(State.config).forEach(key => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key; 
        let val = State.config[key];
        if (Array.isArray(val)) val = val.join(', ');
        input.value = val;
        input.className = 'dynamic-param';
        form.appendChild(input);
    });

    const wizardContainer = document.querySelector('.wizard-container');
    if (wizardContainer) {
        wizardContainer.classList.add('loading-state');
        let spinnerWrapper = wizardContainer.querySelector('.embedded-spinner-wrapper');
        if (!spinnerWrapper) {
            spinnerWrapper = document.createElement('div');
            spinnerWrapper.className = 'embedded-spinner-wrapper';
            wizardContainer.appendChild(spinnerWrapper);
        }
        spinnerWrapper.innerHTML = `
            <div class="spinner-box">
                <div class="spinner-visual-stack">
                    <div class="la-ball-atom la-2x" style="color: var(--active-theme-color);"><div></div><div></div><div></div><div></div></div>
                    <i class="fas fa-bolt spinner-overlay-icon" style="color: var(--active-theme-color);"></i>
                </div>
                <div class="spinner-content">
                    <div class="spinner-title">Generating Solution...</div>
                    <div class="spinner-text-stage" id="wizard-text-stage"><div class="spinner-message wipe-in">SSPEC ENGINE ONLINE...</div></div>
                </div>
            </div>`;
        setTimeout(() => { form.submit(); }, 1500);
    } else {
        form.submit();
    }
}

function handleTagInput(key, event) {
    if (event.key === 'Enter' || event.key === ',') {
        event.preventDefault();
        const val = event.target.value.trim();
        if (val) {
            let current = State.config[key] || [];
            if (!Array.isArray(current)) current = [];
            if (!current.includes(val)) {
                current.push(val);
                State.config[key] = current;
                renderWizard(); 
                injectPillToHero(key, val, 'fa-tag'); 
            }
            setTimeout(() => {
                const el = document.getElementById(`tag-input-${key}`);
                if(el) el.focus();
            }, 50);
        }
    }
}

function removeTag(key, index, event) {
    event.stopPropagation(); 
    let current = State.config[key];
    if (Array.isArray(current)) {
        current.splice(index, 1);
        State.config[key] = current;
        renderWizard();
    }
}

// =============================================================================
// 6. VISUAL RENDERING (The Theater)
// =============================================================================

function handleCardClick(cardWrapper) {
    if (State.phase !== 'SELECTION' && State.phase !== 'DEALING') return;
    if (cardWrapper.classList.contains('violation')) return;
    
    const cardId = cardWrapper.dataset.cardId;
    const colorHue = parseFloat(cardWrapper.dataset.colorHue) || 180;
    const backendData = (State.colorData || []).find(g => (g.title || "").toLowerCase().replace(/\s+/g, '-') === cardId) || {};
    
    const goalData = {
        id: cardId,
        title: cardWrapper.dataset.cardTitle || "Unknown Goal",
        goal: cardWrapper.querySelector('.card-desc-large')?.innerText || "",
        domain: cardWrapper.querySelector('.card-domain-badge-large')?.innerText || "",
        icon: cardWrapper.querySelector('.card-icon-float-large i')?.className || "fas fa-cube",
        colorHue: colorHue,
        iconColor: backendData.icon_color || `hsl(${colorHue}, 90%, 30%)`
    };
    transitionTo('CONFIG', { cardWrapper, goalData: goalData });
}

function transitionTo(newPhase, payload = {}) {
    State.phase = newPhase;
    switch (newPhase) {
        case 'DEALING': handleDealingPhase(); break;
        case 'SELECTION': handleSelectionPhase(); break;
        case 'CONFIG': handleConfigPhase(payload.cardWrapper, payload.goalData); break;
        case 'RETURNING': handleReturningPhase(); break;
    }
}

// --- Transitions ---
function handleDealingPhase() {
    const cards = document.querySelectorAll('.flip-card-wrapper');
    cards.forEach((card, index) => {
        // Reset states
        card.classList.remove('state-selection', 'state-config', 'state-dimmed', 'state-returning');
        card.style.cssText = '';
        
        // 1. Initial State: Invisible, shifted down
        card.classList.add('state-dealing');
        void card.offsetWidth; // Force Reflow
        
        // 2. Reveal Sequence (Staggered)
        setTimeout(() => {
            card.classList.remove('state-dealing'); 
            card.classList.add('state-revealing'); // Card rises up, showing BACK face (Monolith)
            
            // 3. The Flip (Delayed)
            // INCREASED from 600 to 1200 to hold the Monolith view longer
            setTimeout(() => { 
                card.classList.remove('state-revealing'); 
                card.classList.add('state-selection'); // Triggers the 180deg flip to text
            }, 1200); 

        }, 300 + (index * 200));
    });

    // 4. Update State Logic Phase
    // Increased buffer to match new animation duration (cards.length * 200 + 1400)
    setTimeout(() => { 
        if (State.phase === 'DEALING') transitionTo('SELECTION'); 
    }, 400 + (cards.length * 200) + 1400);
}

function handleSelectionPhase() {
    document.querySelectorAll('.flip-card-wrapper').forEach(card => {
        card.classList.remove('state-dealing', 'state-revealing', 'state-config', 'state-dimmed', 'state-returning');
        card.classList.add('state-selection');
        card.style.cssText = '';
    });
}

function handleConfigPhase(cardWrapper, goalData) {
    if (!cardWrapper) return;
    State.selectedCardData = goalData;
    
    // Config Setup
    const coreKeys = ['OPERATOR', 'HORIZON', 'BUDGET'];
    State.steps = coreKeys.map(key => {
        let wizardConf = (State.sysConfig[key] && State.sysConfig[key].wizard) ? State.sysConfig[key].wizard : null;
        if (!wizardConf) wizardConf = { step_label: key, icon: 'fa-cube' };
        
        // Use DEFAULTS if available for labels
        if(DEFAULTS[key]) wizardConf.options = DEFAULTS[key].map(o => o.label);
        
        return { id: key, ...wizardConf };
    });
    State.steps.push({ id: 'FORK', step_label: 'Ready', step_icon: 'fa-bolt' });
    
    State.config = {};
    State.extraParams = [];
    State.currentStepIndex = 0;

    // ANIMATION LOGIC 
    const viewport = document.getElementById('stage-viewport');
    
    // 1. Dim others
    document.querySelectorAll('.flip-card-wrapper').forEach(c => { 
        if (c !== cardWrapper) c.classList.add('state-dimmed'); 
    });
    
    // 2. Calculate Geometry
    const rect = cardWrapper.getBoundingClientRect();
    const viewRect = viewport.getBoundingClientRect();
    
    // 3. Create Placeholder
    const placeholder = document.createElement('div');
    placeholder.className = 'grid-placeholder';
    placeholder.id = 'active-card-placeholder';
    placeholder.style.width = rect.width + 'px'; 
    placeholder.style.height = rect.height + 'px';
    cardWrapper.parentNode.insertBefore(placeholder, cardWrapper);
    
    // 4. Promote to Viewport & Fix Position
    viewport.appendChild(cardWrapper);
    cardWrapper.style.position = 'absolute';
    cardWrapper.style.top = (rect.top - viewRect.top) + 'px';
    cardWrapper.style.left = (rect.left - viewRect.left) + 'px';
    cardWrapper.style.width = rect.width + 'px'; 
    cardWrapper.style.height = rect.height + 'px';
    
    // FORCE REFLOW (Critical for CSS transition to catch)
    void cardWrapper.offsetWidth; 

    // 5. Trigger the State Change (The Flip & Dock)
    cardWrapper.classList.add('state-config');
    
    // 6. Animate to Docked Position
    requestAnimationFrame(() => {
        cardWrapper.style.top = '0px'; 
        cardWrapper.style.left = '0px'; 
        cardWrapper.style.height = '100%';
    });
    
    setTimeout(() => {
        const stage = document.getElementById('configuration-stage');
        if(stage) stage.classList.add('active');
        injectHeroContent(cardWrapper, goalData);
        renderWizard();
    }, 400);
}

function handleReturningPhase() {
    const cardWrapper = document.querySelector('.flip-card-wrapper.state-config');
    const placeholder = document.getElementById('active-card-placeholder');
    if (!cardWrapper || !placeholder) { transitionTo('SELECTION'); return; }
    
    const stage = document.getElementById('configuration-stage');
    if(stage) stage.classList.remove('active');
    
    const backFace = cardWrapper.querySelector('.flip-card-back');
    if(backFace) {
        backFace.style.opacity = '0';
        setTimeout(() => { 
            restoreMonolithContent(cardWrapper);
            backFace.style.opacity = '1'; 
        }, 150);
    }

    const viewport = document.getElementById('stage-viewport');
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
        placeholder.parentNode.insertBefore(cardWrapper, placeholder);
        placeholder.remove();
        transitionTo('SELECTION');
    }, 800);
}


// =============================================================================
// 7. WIZARD & COMPONENT RENDERERS
// =============================================================================

function renderWizard() {
    const currentStep = State.steps[State.currentStepIndex];
    if(!currentStep) return;

    const headerContainer = document.querySelector('.wizard-header');
    const mainContainer = document.getElementById('wizard-main-area');
    const footerContainer = document.querySelector('.wizard-footer');
    const wizardMeta = (State.sysConfig[currentStep.id] && State.sysConfig[currentStep.id].wizard) ? State.sysConfig[currentStep.id].wizard : currentStep; 
    
    if (currentStep.id === 'FORK') {
        headerContainer.classList.add('hidden'); 
        mainContainer.innerHTML = renderForkScreen();
    } else {
        headerContainer.classList.remove('hidden');
        headerContainer.innerHTML = `
            <div class="fade-in">
                <h2 class="font-brand text-dark mb-2" style="font-size: 2.2rem; line-height: 1.1;">
                    ${wizardMeta.question || currentStep.step_label}
                </h2>
                <p class="font-body text-muted" style="font-size: 1rem; max-width: 95%;">
                    ${wizardMeta.helper}
                </p>
            </div>`;
        mainContainer.innerHTML = renderStandardStep(currentStep);
    }

    const dotsHtml = State.steps.map((s, idx) => {
        let status = idx === State.currentStepIndex ? 'active' : (idx < State.currentStepIndex ? 'completed' : '');
        return `<div class="wizard-step-dot ${status}" onclick="window.jumpToStep(${idx})" title="${s.step_label || s.id}"></div>`;
    }).join('');

    const backBtnHtml = State.currentStepIndex === 0 
        ? `<button class="wiz-btn-back" style="visibility: hidden">Back</button>`
        : `<button class="wiz-btn-back" onclick="window.wizardBack()"><i class="fas fa-arrow-left"></i> Back</button>`;
        
    const nextBtnHtml = currentStep.id === 'FORK'
        ? `` 
        : `<button class="wiz-btn-next" onclick="window.wizardNext()">Next <i class="fas fa-arrow-right"></i></button>`;

    footerContainer.innerHTML = `
        <div class="d-flex align-items-center"><span class="wizard-track-label">Step ${State.currentStepIndex + 1}/${State.steps.length}</span><div class="wizard-progress-track">${dotsHtml}</div></div>
        <div class="d-flex gap-3">${backBtnHtml}${nextBtnHtml}</div>
    `;
}

function renderStandardStep(step) {
    const existingVal = State.config[step.id] || '';
    const backendNode = State.sysConfig[step.id] || {};
    const wizardMeta = backendNode.wizard || step; 
    
    let innerContent = '';

    // A. OPTIONS
    if (step.options && step.options.length > 0) {
        innerContent = `
            <div class="option-grid-compact fade-in">
                ${step.options.map(optLabel => {
                    const iconClass = getIconForOption(optLabel); 
                    const colorHex = getColorForOption(optLabel);
                    const isSelected = existingVal === optLabel;
                    
                    return `
                    <div class="option-card ${isSelected ? 'selected' : ''}" 
                         style="--opt-primary: ${colorHex};"
                         onclick="window.selectOption('${step.id}', '${optLabel}')">
                        <div class="option-icon"><i class="fas ${iconClass}"></i></div>
                        <div class="option-label">${optLabel}</div>
                    </div>`;
                }).join('')}
            </div>`;
    }
    // B. TAGS
    else if (backendNode.ui_type === 'tags' || step.ui_type === 'tags') {
        const currentTags = Array.isArray(existingVal) ? existingVal : (existingVal ? existingVal.split(',') : []);
        innerContent = `
            <div class="fade-in">
                <div class="tag-input-container" onclick="document.getElementById('tag-input-${step.id}').focus()">
                    ${currentTags.map((tag, i) => `<span class="tag-pill">${tag} <i class="fas fa-times tag-remove" onclick="window.removeTag('${step.id}', ${i}, event)"></i></span>`).join('')}
                    <input type="text" id="tag-input-${step.id}" class="tag-input-field" 
                           placeholder="${wizardMeta.placeholder || 'Type and press Enter...'}"
                           autocomplete="off" onkeydown="window.handleTagInput('${step.id}', event)">
                </div>
            </div>`;
    }
    // C. DATE
    else if (step.id === 'HORIZON' || backendNode.ui_type === 'date') {
        const quicks = wizardMeta.quick_selects || ["3 Months", "6 Months", "1 Year"];
        innerContent = `
            <div class="fade-in">
                <div class="date-quick-chips">
                    ${quicks.map(label => {
                        const calcDate = getSmartHorizonDate(label);
                        const isActive = existingVal === calcDate;
                        return `<div class="date-chip ${isActive ? 'active' : ''}" onclick="window.selectOption('${step.id}', '${calcDate}')">${label}</div>`;
                    }).join('')}
                </div>
                <div class="mt-4">
                    <label class="font-data text-muted x-small mb-2">OR SELECT SPECIFIC DATE</label>
                    <input type="date" class="form-control form-control-lg border-2 shadow-sm" style="height: 60px;"
                           value="${existingVal.includes('-') ? existingVal : ''}" onchange="window.selectOption('${step.id}', this.value)">
                </div>
            </div>`;
    }
    // D. FALLBACK
    else {
        innerContent = `<div class="fade-in"><textarea class="form-control bg-light border-0 font-body p-3 shadow-inner" rows="4" placeholder="Enter details..." oninput="window.selectOption('${step.id}', this.value)">${existingVal}</textarea></div>`;
    }

    return `
        <div class="d-flex flex-column h-100 justify-content-center">
            ${innerContent}
            <div class="context-insight-box mt-auto" id="active-insight-box">
                <div class="context-insight-title"><i class="fas fa-microchip me-1"></i> SPECULATE ENGINE</div>
                <div class="context-insight-body">Hover over an option to see how it affects the Engine.</div>
            </div>
        </div>`;
}

function renderForkScreen() {
    const extraOptions = [
        { id: 'DIRECTIVE', label: 'Core Values', icon: 'fa-heart', desc: 'Define ethical non-negotiables.' },
        { id: 'AVOIDANCE', label: 'Dealbreakers', icon: 'fa-triangle-exclamation', desc: 'Outcomes to actively prevent.' },
        { id: 'SCALE', label: 'Scale', icon: 'fa-map-location-dot', desc: 'Geographic or digital footprint.' },
        { id: 'MODALITY', label: 'Work Style', icon: 'fa-people-carry-box', desc: 'Methodology (Agile, etc).' }
    ];

    return `
        <div class="wizard-step fade-in h-100 d-flex flex-column">
            <div class="text-center pt-1 mb-2">
                <div class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-3 py-2 mb-2 font-data">
                    <i class="fas fa-check-circle me-2"></i> BASELINES ESTABLISHED
                </div>
                <h2 class="font-brand display-5 mb-2 text-dark">Ready to Engineer</h2>
            </div>
            <div class="flex-grow-1 d-flex flex-column justify-content-center align-items-center mb-3">
                <p class="text-muted font-body text-center mx-auto mb-4" style="max-width: 500px; font-size: 1.05rem;">
                    The Engine has enough context to reverse-engineer a valid path. <br>
                    You can generate the solution now, or add <strong>precision constraints</strong> below.
                </p>
                <button class="btn wiz-btn-gen rounded-pill px-5 py-3 font-data text-white shadow-lg hover-lift" 
                        onclick="window.submitConfig()"
                        style="background-color: var(--active-theme-color); font-size: 1.1rem; min-width: 260px; position: relative; overflow: hidden;">
                    <span class="position-relative z-2"><i class="fas fa-bolt me-2"></i> GENERATE STRUCTURED SOLUTION</span>
                    <div class="shimmer-effect"></div>
                </button>
            </div>
            <div class="border-top pt-3 mt-auto">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <div class="d-flex flex-column">
                        <h6 class="font-data text-dark fw-bold small mb-0" style="letter-spacing: 1px;">INCREASE PRECISION (OPTIONAL)</h6>
                        <span class="font-body x-small text-muted">Select factors to fine-tune the Engine's logic.</span>
                    </div>
                </div>
                <div class="option-grid-compact">
                    ${extraOptions.map(p => {
                        const isChecked = State.extraParams.includes(p.id);
                        return `
                        <div class="option-card-pill ${isChecked ? 'selected' : ''}" 
                             onclick="window.toggleExtraParam('${p.id}')"
                             style="--opt-primary: var(--active-theme-color);">
                            <div class="pill-icon-circle" style="width: 36px; height: 36px; font-size: 1rem;">
                                <i class="fas ${isChecked ? 'fa-check' : p.icon}"></i>
                            </div>
                            <div class="pill-content" style="flex:1;">
                                <div class="pill-title" style="font-size: 0.75rem; margin-bottom: 1px;">${p.label}</div>
                                <div class="pill-desc" style="font-size: 0.65rem; color: #64748b; line-height:1.2; display:block;">${p.desc}</div>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
                <div class="text-center mt-2" style="height: 35px;">
                    <button id="fork-next-btn" class="btn btn-outline-dark rounded-pill px-4 font-data small" 
                            style="opacity: 0; pointer-events: none; transition: opacity 0.3s;"
                            onclick="window.wizardNext()">
                        CONFIGURE EXTRAS <i class="fas fa-arrow-right ms-2"></i>
                    </button>
                </div>
            </div>
        </div>`;
}

function injectHeroContent(cardWrapper, goalData) {
    const backFace = cardWrapper.querySelector('.flip-card-back');
    if (!backFace) return;
    
    // 1. Calculate Colors
    const hue = goalData.colorHue || 180;
    const activeColor = `hsl(${hue}, 70%, 45%)`; 
    cardWrapper.style.setProperty('--active-theme-color', activeColor);

    // 2. TIMING SEQUENCE:
    // A. Hold the "Monolith" view for 600ms (The "Beat")
    setTimeout(() => {
        
        // B. Fade Out the Monolith (prepare for swap)
        // Ensure transition is active for this inline style change
        backFace.style.transition = 'opacity 0.4s ease';
        backFace.style.opacity = '0';
        
        // C. Swap Content & Fade In (After 400ms fade-out completes)
        setTimeout(() => {
            backFace.innerHTML = `
                <div class="card-texture-overlay"></div>
                <!-- CRITICAL FIX: style="opacity: 1" overrides the CSS default of 0 -->
                <div class="hero-card-content" style="opacity: 1 !important;"> 
                    <i class="${goalData.icon} hero-ghost-icon"></i>
                    
                    <button onclick="window.exitStage()" class="hero-return-button" style="pointer-events: auto;">
                        <i class="fas fa-arrow-left"></i> RETURN TO CHOICES
                    </button>
                    
                    <!-- Header Group: Domain & Title -->
                    <div class="hero-header-group">
                        <span class="hero-domain-label">SYSTEM DOMAIN</span>
                        <div class="hero-domain-pill" style="color: ${activeColor};">
                            <i class="${goalData.icon}"></i> 
                            <span>${goalData.domain}</span>
                        </div>
                    </div>
    
                    <h2 class="hero-title">${goalData.title}</h2>
                    
                    <div class="hero-desc-box">
                        <div class="hero-desc-accent"></div>
                        <p class="hero-desc-text">${goalData.goal}</p>
                    </div>
                    
                    <!-- System Config aligned below description -->
                    <div id="system-config-container">
                        <span class="sys-config-label">SYSTEM CONFIGURATION</span>
                        <div id="sys-pill-stack"></div>
                    </div>
                </div>`;
            
            // D. Force Reflow & Fade In
            void backFace.offsetWidth; 
            backFace.style.opacity = '1';
            
        }, 400); // Wait for fade-out
        
    }, 800); // Hold time
}

function restoreMonolithContent(cardWrapper) {
    const backFace = cardWrapper.querySelector('.flip-card-back');
    if (!backFace) return;
    const originalIcon = cardWrapper.dataset.originalIcon || 'fas fa-cube';
    
    backFace.style.opacity = '0';
    setTimeout(() => {
        backFace.innerHTML = `
            <div class="card-texture-overlay"></div>
            <div class="monolith-content">
                <div class="monolith-icon-circle"><i class="${originalIcon} monolith-icon"></i></div>
                <div class="font-data text-white-50 x-small tracking-widest opacity-75 border border-white border-opacity-25 rounded-pill px-3 py-1">STRUCTURED SPECULATION</div>
            </div>`;
        backFace.style.opacity = '1';
    }, 150);
}

function injectPillToHero(type, value, icon) {
    const stack = document.getElementById('sys-pill-stack');
    if(!stack) return;
    const existing = stack.querySelector(`[data-type="${type}"]`);
    if(existing) existing.remove();

    const pill = document.createElement('div');
    pill.className = 'system-pill-display shadow-sm'; 
    pill.setAttribute('data-type', type);
    pill.title = "Click to Edit";
    
    pill.style.cssText = `display: inline-flex; align-items: center; gap: 0.75rem; padding: 0.4rem 1rem 0.4rem 0.4rem; background: rgba(255, 255, 255, 0.9); border: 1px solid rgba(255,255,255,0.5); border-radius: 50px; margin-bottom: 0.5rem; cursor: pointer; backdrop-filter: blur(4px);`;
    
    pill.onclick = () => {
        const stepIndex = State.steps.findIndex(s => s.id === type);
        if (stepIndex !== -1) window.jumpToStep(stepIndex);
    };

    let dispValue = value.length > 25 ? value.substring(0, 22) + '...' : value;
    pill.innerHTML = `
        <div class="icon-box" style="width: 28px; height: 28px; border-radius: 50%; background: var(--active-theme-color, #333); color: white; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; flex-shrink: 0;"><i class="fas ${icon}"></i></div>
        <div style="display: flex; flex-direction: column; line-height: 1.1;"><span style="font-size: 0.55rem; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: #64748b; margin-bottom: 1px;">${type}</span><span class="value-text" style="font-size: 0.8rem; font-weight: 700; color: #1e293b;">${dispValue}</span></div>`;
    stack.appendChild(pill);
}

// =============================================================================
// 8. BOOTSTRAP (Init)
// =============================================================================

function renderNewGoals(goals, gridElement) {
    // 1. Clear Grid
    gridElement.innerHTML = '';
    
    // 2. Iterate & Build
    goals.forEach((goal, index) => {
        const hue = goal.color_hue || (index * 60) % 360;
        const cardId = `goal-${index}`;
        const cardWrapper = document.createElement('div');
        
        // Base Classes
        cardWrapper.className = `flip-card-wrapper ${!goal.is_compliant ? 'violation' : ''}`;
        
        // Data Attributes for Logic
        cardWrapper.dataset.cardId = cardId;
        cardWrapper.dataset.cardTitle = goal.title;
        cardWrapper.dataset.colorHue = hue;
        cardWrapper.dataset.goalIndex = index;
        
        // Visual Gradients
        const cardGrad = goal.card_gradient || `linear-gradient(135deg, hsl(${hue}, 70%, 50%), hsl(${hue + 30}, 80%, 40%))`;
        const plateGrad = goal.plate_gradient || `linear-gradient(135deg, hsl(${hue}, 70%, 60%), hsl(${hue}, 70%, 50%))`;
        const btnGrad = goal.btn_gradient || `linear-gradient(to right, hsl(${hue}, 70%, 50%), hsl(${hue}, 80%, 40%))`;
        const iconColor = goal.icon_color || '#fff';

        // Inner HTML (The Monolith & The Selection Face)
        cardWrapper.innerHTML = `
            <div class="flip-card-inner">
                
                <!-- BACK FACE (Monolith) -->
                <div class="flip-card-back" style="background: ${cardGrad};">
                    <div class="card-texture-overlay"></div>
                    <div class="monolith-content">
                        <div class="monolith-icon-circle"><i class="${goal.icon} monolith-icon"></i></div>
                        ${!goal.is_compliant 
                            ? `<span class="badge bg-black bg-opacity-25 border border-danger text-white font-data px-3 py-2 mt-3">PROTOCOL VIOLATION</span>` 
                            : `<div class="font-data text-white-50 x-small tracking-widest opacity-75 border border-white border-opacity-25 rounded-pill px-3 py-1 mt-3">STRUCTURED SPECULATION</div>`
                        }
                    </div>
                </div>
                
                <!-- FRONT FACE (Goal Details) -->
                <div class="flip-card-front">
                     <div class="card-header-plate" style="background: ${plateGrad};">
                         <div class="card-texture-overlay"></div>
                         <div class="card-domain-badge-large">${(goal.domain || 'GENERAL').toUpperCase()}</div>
                         <div class="card-icon-float-large"><i class="${goal.icon}" style="color: ${iconColor};"></i></div>
                     </div>
                     <div class="card-body-large">
                         <h3 class="card-title-large">${goal.title}</h3>
                         <p class="card-desc-large">${goal.goal}</p>
                     </div>
                     <div class="card-footer-large">
                         <button type="button" class="btn-select-pill-large" style="background: ${btnGrad};">
                             ${!goal.is_compliant ? 'PROTOCOL VIOLATION' : 'CHOOSE GOAL'}
                         </button>
                     </div>
                </div>
            </div>
            <!-- Pill Dock (Used for animations) -->
            <div class="system-pill-dock position-absolute top-0 start-0 w-100 p-4 d-flex flex-column gap-2" style="z-index: 5; pointer-events: none;"></div>
        `;
        
        // 3. Attach Event Listener (The Fix)
        const btn = cardWrapper.querySelector('.btn-select-pill-large');
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card wrapper click
                if (!goal.is_compliant) return; // Ignore violations
                window.selectGoal(cardWrapper);
            });
        }
        
        // 4. Mount
        gridElement.appendChild(cardWrapper);
    });
    
    // 5. Re-init Navigation Dots
    if (typeof initFooterDots === 'function') initFooterDots();
}

function initFooterDots() {
    const dots = document.querySelectorAll('.trinity-dot');
    const goals = window.GOAL_COLOR_DATA || [];
    dots.forEach((dot, idx) => {
        const goal = goals[idx];
        if (goal) {
            let color = goal.accent_color;
            if (!color && goal.color_hue !== undefined) color = `hsl(${goal.color_hue}, 70%, 50%)`;
            dot.style.setProperty('--dot-color', color || '#cbd5e1');
            dot.title = `Switch to: ${goal.title}`; 
            dot.onclick = (e) => { e.stopPropagation(); handleFooterDotClick(idx); };
            dot.style.display = 'inline-block';
        } else {
            dot.style.display = 'none';
        }
    });
}

function handleFooterDotClick(index) {
    const targetCardId = `goal-${index}`;
    const targetCard = document.querySelector(`[data-card-id="${targetCardId}"]`);
    if (!targetCard) return;
    if (State.selectedCardData && State.selectedCardData.id === targetCardId && State.phase === 'CONFIG') return; 
    updateActiveDot(index);
    if (State.phase === 'CONFIG') {
        window.exitStage();
        setTimeout(() => handleCardClick(targetCard), 850);
    } else {
        handleCardClick(targetCard);
    }
}

function updateActiveDot(index) {
    document.querySelectorAll('.trinity-dot').forEach(d => d.classList.remove('active'));
    if (index !== null && index !== undefined) {
        document.querySelector(`.trinity-dot[data-index="${index}"]`)?.classList.add('active');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('[SSPEC] Goal Selection Module Initialized');
    
    // 1. Setup Event Delegation (The Fix for Clickability)
    const gridContainer = document.getElementById('goalCardsContainer');
    
    if(gridContainer) {
        gridContainer.addEventListener('click', (e) => {
            // Check if we clicked the button (or icon inside it)
            const btn = e.target.closest('.btn-select-pill-large');
            const wrapper = e.target.closest('.flip-card-wrapper');
            
            if (btn && wrapper) {
                e.stopPropagation(); // Stop bubbling
                console.log("Button Click Detected via Delegation");
                if (wrapper.classList.contains('violation')) return;
                
                handleCardClick(wrapper);
                return;
            }
            
            // Allow card body click as fallback
            if (wrapper && !btn) {
                if (wrapper.classList.contains('violation')) return;
                handleCardClick(wrapper);
            }
        });
    }
    
    // 2. Cache Original Icons (Critical for the "Returning" animation)
    const existingCards = document.querySelectorAll('.flip-card-wrapper');
    existingCards.forEach(card => {
        const iconEl = card.querySelector('.monolith-icon');
        if (iconEl) card.dataset.originalIcon = iconEl.className;
    });

    // 3. START THE ENGINE (This was missing!)
    // This removes 'opacity: 0' and triggers the dealt animation
    transitionTo('DEALING');
    
    // 4. Initialize Navigation Dots
    initFooterDots();

    // 5. Bind "Generate New Goals" Button
    const newSpeculateBtn = document.getElementById('generate-new-goals');
    if (newSpeculateBtn) {
        // Clone to remove old listeners (safety)
        const clone = newSpeculateBtn.cloneNode(true);
        newSpeculateBtn.parentNode.replaceChild(clone, newSpeculateBtn);
        
        clone.addEventListener('click', async () => {
            const display = document.querySelector('.user-input-display');
            const edit = document.querySelector('.user-input-edit');
            const grid = document.getElementById('goalCardsContainer');
            
            let text = "";
            if (display && !display.classList.contains('d-none')) {
                text = display.innerText.replace(/^"|"$/g, '').trim(); 
            } else if (edit) {
                text = edit.value.trim();
            }

            if (text) {
                showLoadingSpinner('Analysing Trajectories...', 'fa-sync-alt');
                try {
                    const data = await regenerateGoals(text);
                    if (data && data.goals) {
                        State.colorData = data.goals;
                        window.GOAL_COLOR_DATA = data.goals;
                        renderNewGoals(data.goals, grid);
                        
                        State.phase = 'INIT';
                        State.selectedCardId = null;
                        setTimeout(() => transitionTo('DEALING'), 50);
                    }
                } catch (error) { 
                    console.error("Failed to regenerate goals:", error); 
                } finally { 
                    hideLoadingSpinner(); 
                }
            }
        });
    }
});