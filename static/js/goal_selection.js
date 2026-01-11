// static/js/goal_selection.js
// SSPEC "Horizon Fusion" - Goal Selection Controller (v2026.13 - Hoisting Fix)

import {
    regenerateGoals,
    showLoadingSpinner,
    hideLoadingSpinner
} from './base_functions.js';

// =============================================================================
// 1. DATA DEFAULTS (SSPEC ONTOLOGY)
// =============================================================================

const DEFAULTS = {
    OPERATOR: [
        { id: 'Individual', label: 'Solo / Individual', icon: 'fa-user', hint: "Solo operators need leverage. We'll prioritize **low-code tools**, **freelancers**, and **automation**." },
        { id: 'Grassroots', label: 'Community', icon: 'fa-users', hint: "Community power. We'll focus on **viral loops**, **social capital**, and **distributed action**." },
        { id: 'Team', label: 'Startup Team', icon: 'fa-rocket', hint: "Speed is key. We'll structure for **Agile sprints**, **MVP iteration**, and **rapid scaling**." },
        { id: 'NonProfit', label: 'Non-Profit', icon: 'fa-hand-holding-heart', hint: "Impact first. We'll emphasize **stakeholder alignment**, **transparent reporting**, and **sustainable growth**." },
        { id: 'Enterprise', label: 'Enterprise', icon: 'fa-building', hint: "Scale and safety. We'll build for **compliance**, **integration**, and **risk mitigation**." },
        { id: 'Public', label: 'Public Sector', icon: 'fa-landmark', hint: "Public trust. We'll map out **procurement**, **regulatory hurdles**, and **civic engagement**." }
    ],
    BUDGET: [
        { id: 'Bootstrapped', label: 'Sweat Equity ($0)', icon: 'fa-hammer', hint: "Resource scarcity requires ingenuity. We'll look for **free tiers**, **barter networks**, and **organic growth**." },
        { id: 'Crowdfunded', label: 'Crowdfunded', icon: 'fa-bullhorn', hint: "Audience is everything. We'll prioritize **marketing assets**, **community management**, and **rewards fulfillment**." },
        { id: 'Grant', label: 'Grant Funded', icon: 'fa-file-signature', hint: "Milestone driven. We'll align the roadmap with **funding tranches** and **impact reports**." },
        { id: 'VC', label: 'Venture Capital', icon: 'fa-chart-line', hint: "High octane. We'll focus on **metrics**, **burn rate**, and **defensible moats**." },
        { id: 'Public', label: 'Public Budget', icon: 'fa-landmark', hint: "Oversight heavy. We'll ensure strict adherence to **budget codes** and **audit trails**." }
    ],
    SCALE: [
        { id: 'Neighborhood', label: 'NEIGHBORHOOD', icon: 'fa-home', hint: "Hyper-local focus. Relationships are face-to-face." },
        { id: 'City', label: 'CITY-WIDE', icon: 'fa-city', hint: "Municipal scale. Involves local government and zoning." },
        { id: 'Region', label: 'REGIONAL', icon: 'fa-map', hint: "State or Provincial reach. Logistics become complex." },
        { id: 'Global', label: 'GLOBAL', icon: 'fa-globe', hint: "Planetary footprint. Digital-first or international supply chain." }
    ],
    MODALITY: [
        { id: 'Agile', label: 'AGILE', icon: 'fa-sync', hint: "Iterative cycles. We learn as we build." },
        { id: 'Waterfall', label: 'WATERFALL', icon: 'fa-stream', hint: "Linear progression. Planning is done upfront." },
        { id: 'Swarm', label: 'SWARM', icon: 'fa-users-cog', hint: "Decentralized coordination. Parallel autonomous actions." },
        { id: 'Crisis', label: 'CRISIS', icon: 'fa-ambulance', hint: "Emergency response. Speed overrides efficiency." }
    ]
};

// =============================================================================
// 1.5 VISUAL HELPERS (Moved Up to Prevent Hoisting Errors)
// =============================================================================

function getIconForOption(opt) {
    const map = {
        'Individual': 'fa-user', 'Community': 'fa-users', 'Grassroots': 'fa-seedling',
        'Startup': 'fa-rocket', 'Small Team': 'fa-user-friends',
        'Non-Profit': 'fa-hand-holding-heart', 'NGO': 'fa-globe',
        'Corporate': 'fa-building', 'Enterprise': 'fa-city', 
        'Public': 'fa-landmark', 'Civic': 'fa-university',
        'Bootstrapped': 'fa-hammer', 'Crowdfunded': 'fa-bullhorn', 
        'Grant': 'fa-file-signature', 'Venture': 'fa-chart-line', 
        'Agile': 'fa-sync-alt', 'Waterfall': 'fa-stream', 
        'Swarm': 'fa-project-diagram', 'Crisis': 'fa-ambulance',
        'Personal': 'fa-user-circle', 'Interpersonal': 'fa-handshake',
        'Organizational': 'fa-sitemap', 'Global': 'fa-earth-americas',
        'Digital': 'fa-network-wired', 'Unsure': 'fa-question-circle'
    };
    
    for (let key in map) {
        if (opt.includes(key)) return map[key];
    }
    return 'fa-circle-notch'; 
}

function getColorForOption(opt) {
    const themes = {
        'cyan': '#06b6d4',
        'green': '#22c55e',
        'orange': '#f97316',
        'pink': '#ec4899',
        'indigo': '#6366f1',
        'slate': '#64748b'
    };

    if (['Individual', 'Driver'].some(k => opt.includes(k))) return themes.cyan;
    if (['Community', 'Grassroots', 'Grant', 'Sustainable'].some(k => opt.includes(k))) return themes.green;
    if (['Startup', 'Small Team', 'Agile', 'Sprint', 'Horizon'].some(k => opt.includes(k))) return themes.orange;
    if (['Non-Profit', 'NGO', 'Crowdfunded', 'Social'].some(k => opt.includes(k))) return themes.pink;
    if (['Enterprise', 'Corporate', 'Public', 'Civic', 'Venture'].some(k => opt.includes(k))) return themes.indigo;

    return themes.slate; 
}

function formatDateFriendly(dateStr) {
    if (!dateStr) return "Pending Calibration...";
    const date = new Date(dateStr);
    if(isNaN(date.getTime())) return "Invalid Date";
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function getSmartHorizonDate(label) {
    const today = new Date();
    const map = {
        "3 Months": 3, "6 Months": 6, "1 Year": 12, "2 Years": 24, "5 Years": 60, "ASAP": 1
    };
    const months = map[label] || 0;
    const target = new Date(today.setMonth(today.getMonth() + months));
    return target.toISOString().split('T')[0];
}

// =============================================================================
// 2. STATE MANAGEMENT
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
// 3. EXPLICIT GLOBAL BINDINGS
// =============================================================================

window.selectOption = function(key, value) {
    State.config[key] = value;
    
    let icon = getIconForOption(value); 
    if (icon === 'fa-circle-notch') {
        const stepConf = State.steps.find(s => s.id === key);
        if (stepConf && stepConf.step_icon) icon = stepConf.step_icon;
        else icon = 'fa-check'; 
    }

    injectPillToHero(key, value, icon);
    renderWizard();
};

window.toggleExtraParam = function(id) {
    const idx = State.extraParams.indexOf(id);
    if(idx > -1) {
        State.extraParams.splice(idx, 1);
        State.steps = State.steps.filter(s => s.id !== id);
    } else {
        State.extraParams.push(id);
        let conf = State.sysConfig[id]?.wizard;
        if (!conf) {
            // ... (Same fallback logic)
            if (id === 'DIRECTIVE') conf = { step_label: 'Values', step_icon: 'fa-heart', question: 'Core Values', helper: 'What principles are non-negotiable?' };
            if (id === 'AVOIDANCE') conf = { step_label: 'Risks', step_icon: 'fa-triangle-exclamation', question: 'Dealbreakers', helper: 'What outcomes must be prevented?' };
            if (id === 'SCALE') conf = { step_label: 'Scale', step_icon: 'fa-map-location-dot', question: 'Scale & Reach', helper: 'Select the operational footprint.', options: DEFAULTS.SCALE };
            if (id === 'MODALITY') conf = { step_label: 'Style', step_icon: 'fa-people-carry-box', question: 'Work Style', helper: 'How does the team coordinate?', options: DEFAULTS.MODALITY };
        }
        const stepDef = { id: id, ...conf };
        State.steps.splice(State.steps.length - 1, 0, stepDef); 
    }
    renderWizard();
};

window.wizardNext = function() {
    if(State.currentStepIndex < State.steps.length - 1) {
        State.currentStepIndex++;
        renderWizard();
    } else {
        window.submitConfig();
    }
};

window.wizardBack = function() {
    if(State.currentStepIndex > 0) {
        State.currentStepIndex--;
        renderWizard();
    }
};

window.jumpToStep = function(idx) {
    if(idx <= State.currentStepIndex + 1) {
        State.currentStepIndex = idx;
        renderWizard();
    }
};

window.exitStage = function() { if (State.phase === 'CONFIG') transitionTo('RETURNING'); };
window.skipToSpeculate = function() { window.submitConfig(); };

window.submitConfig = function() {
    const form = document.getElementById('final-submit-form');
    
    document.getElementById('form-goal').value = State.selectedCardData.goal;
    document.getElementById('form-title').value = State.selectedCardData.title;
    document.getElementById('form-domain').value = State.selectedCardData.domain;
    document.getElementById('form-domain-icon').value = State.selectedCardData.icon;
    document.getElementById('form-operator').value = State.config.OPERATOR || '';
    document.getElementById('form-horizon').value = State.config.HORIZON || '';
    document.getElementById('form-budget').value = State.config.BUDGET || '';

    form.querySelectorAll('.dynamic-param').forEach(e => e.remove());
    Object.keys(State.config).forEach(key => {
        if(!['OPERATOR', 'HORIZON', 'BUDGET'].includes(key)) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key; 
            input.value = State.config[key];
            input.className = 'dynamic-param';
            form.appendChild(input);
        }
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
                    <div class="la-ball-atom la-2x" style="color: var(--active-theme-color);">
                        <div></div><div></div><div></div><div></div>
                    </div>
                    <i class="fas fa-bolt spinner-overlay-icon" style="color: var(--active-theme-color);"></i>
                </div>
                <div class="spinner-content">
                    <div class="spinner-title">Generating Solution...</div>
                    <div class="spinner-text-stage" id="wizard-text-stage">
                        <div class="spinner-message wipe-in">SSPEC ENGINE ONLINE...</div>
                    </div>
                </div>
            </div>
        `;
        
        setTimeout(() => { form.submit(); }, 1500);
    } else {
        form.submit();
    }
};

window.updateInsight = function(stepId, optionValue) {
    const box = document.getElementById('active-insight-box');
    if(!box) return;
    
    const backendNode = State.sysConfig[stepId] || {};
    const wizardMeta = backendNode.wizard || {};
    const insightMap = wizardMeta.insight_map || {};
    
    const text = insightMap[optionValue] || wizardMeta.helper || "Select an option.";
    box.querySelector('.context-insight-body').innerText = text;
};

window.resetInsight = function(stepId) {
    const existingVal = State.config[stepId];
    if(existingVal) {
        window.updateInsight(stepId, existingVal);
    } else {
        const backendNode = State.sysConfig[stepId] || {};
        const wizardMeta = backendNode.wizard || {};
        const box = document.getElementById('active-insight-box');
        if(box) box.querySelector('.context-insight-body').innerText = wizardMeta.helper || "Select an option.";
    }
};

window.handleTagInput = function(key, event) {
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
};

window.removeTag = function(key, index, event) {
    event.stopPropagation(); 
    let current = State.config[key];
    if (Array.isArray(current)) {
        current.splice(index, 1);
        State.config[key] = current;
        renderWizard();
    }
};

// =============================================================================
// 4. CORE LOGIC (DELEGATED CARD CLICK)
// =============================================================================

function handleCardClick(cardWrapper) {
    if (State.phase !== 'SELECTION' && State.phase !== 'DEALING') return;
    if (cardWrapper.classList.contains('violation')) return;
    const data = extractGoalData(cardWrapper);
    transitionTo('CONFIG', { cardWrapper, goalData: data });
}

function extractGoalData(card) {
    const cardId = card.dataset.cardId;
    const colorHue = parseFloat(card.dataset.colorHue) || 180;
    const backendData = (State.colorData || []).find(g => (g.title || "").toLowerCase().replace(/\s+/g, '-') === cardId) || {};
    return {
        id: cardId,
        title: card.dataset.cardTitle || "Unknown Goal",
        goal: card.querySelector('.card-desc-large')?.innerText || "",
        domain: card.querySelector('.card-domain-badge-large')?.innerText || "",
        icon: card.querySelector('.card-icon-float-large i')?.className || "fas fa-cube",
        colorHue: colorHue,
        iconColor: backendData.icon_color || `hsl(${colorHue}, 90%, 30%)`
    };
}

// =============================================================================
// 5. PHASE HANDLERS
// =============================================================================

function transitionTo(newPhase, payload = {}) {
    State.phase = newPhase;
    switch (newPhase) {
        case 'DEALING': handleDealingPhase(); break;
        case 'SELECTION': handleSelectionPhase(); break;
        case 'CONFIG': handleConfigPhase(payload.cardWrapper, payload.goalData); break;
        case 'RETURNING': handleReturningPhase(); break;
    }
}

function handleDealingPhase() {
    const cards = document.querySelectorAll('.flip-card-wrapper');
    cards.forEach((card, index) => {
        card.classList.remove('state-selection', 'state-config', 'state-dimmed', 'state-returning');
        card.style.cssText = '';
        const inner = card.querySelector('.flip-card-inner');
        if (inner) inner.style.transform = '';
        
        const iconEl = card.querySelector('.flip-card-back i.monolith-icon');
        if (iconEl) card.dataset.originalIcon = iconEl.className;
        
        card.classList.add('state-dealing');
        void card.offsetWidth; 
        
        setTimeout(() => {
            card.classList.remove('state-dealing'); 
            card.classList.add('state-revealing');
            setTimeout(() => { 
                card.classList.remove('state-revealing'); 
                card.classList.add('state-selection'); 
            }, 600);
        }, 300 + (index * 200));
    });
    setTimeout(() => { if (State.phase === 'DEALING') transitionTo('SELECTION'); }, 400 + (cards.length * 200) + 800);
}

function handleSelectionPhase() {
    document.querySelectorAll('.flip-card-wrapper').forEach(card => {
        card.classList.remove('state-dealing', 'state-revealing', 'state-config', 'state-dimmed', 'state-returning');
        card.classList.add('state-selection');
        card.style.cssText = '';
        const inner = card.querySelector('.flip-card-inner');
        if (inner) inner.style.transform = '';
    });
}

function handleConfigPhase(cardWrapper, goalData) {
    if (!cardWrapper) return;
    State.selectedCardData = goalData;

    const hue = goalData.colorHue || 180;
    const activeColor = `hsl(${hue}, 70%, 45%)`; 
    const lightTheme = `hsl(${hue}, 70%, 96%)`;  

    const stage = document.getElementById('configuration-stage');
    if (stage) {
        stage.style.setProperty('--active-theme-color', activeColor);
        stage.style.setProperty('--theme-light', lightTheme);
    }
    cardWrapper.style.setProperty('--active-theme-color', activeColor);

    const coreKeys = ['OPERATOR', 'HORIZON', 'BUDGET'];
    
    State.steps = coreKeys.map(key => {
        let wizardConf = (State.sysConfig[key] && State.sysConfig[key].wizard) ? State.sysConfig[key].wizard : null;
        if (!wizardConf) {
            wizardConf = { 
                step_label: key.charAt(0) + key.slice(1).toLowerCase(), 
                step_icon: key === 'OPERATOR' ? 'fa-user' : key === 'HORIZON' ? 'fa-calendar' : 'fa-coins', 
                question: key === 'OPERATOR' ? 'Who is Driving?' : key === 'HORIZON' ? 'Target Horizon?' : 'Resource Model?',
                helper: 'Calibrate this parameter to tune the engine.',
            };
        }
        if (!wizardConf.options && DEFAULTS[key]) wizardConf.options = DEFAULTS[key];
        if (key === 'HORIZON' && !wizardConf.quick_selects) wizardConf.quick_selects = ["3 Months", "6 Months", "1 Year", "2 Years", "ASAP"];

        return { id: key, ...wizardConf };
    });
    
    State.steps.push({ id: 'FORK', step_label: 'Ready', step_icon: 'fa-bolt' });
    State.config = {};
    State.extraParams = [];
    State.currentStepIndex = 0;

    const viewport = document.getElementById('stage-viewport');
    document.querySelectorAll('.flip-card-wrapper').forEach(c => { 
        if (c !== cardWrapper) c.classList.add('state-dimmed'); 
    });
    
    const rect = cardWrapper.getBoundingClientRect();
    const viewRect = viewport.getBoundingClientRect();
    const placeholder = document.createElement('div');
    placeholder.className = 'grid-placeholder';
    placeholder.id = 'active-card-placeholder';
    placeholder.style.width = rect.width + 'px'; 
    placeholder.style.height = rect.height + 'px';
    cardWrapper.parentNode.insertBefore(placeholder, cardWrapper);
    
    viewport.appendChild(cardWrapper);
    cardWrapper.style.position = 'absolute';
    cardWrapper.style.top = (rect.top - viewRect.top) + 'px';
    cardWrapper.style.left = (rect.left - viewRect.left) + 'px';
    cardWrapper.style.width = rect.width + 'px'; 
    cardWrapper.style.height = rect.height + 'px';
    cardWrapper.style.margin = '0'; 
    cardWrapper.style.zIndex = '100';
    
    void cardWrapper.offsetWidth;
    cardWrapper.classList.remove('state-selection'); 
    cardWrapper.classList.add('state-config');
    
    updateActiveDot(cardWrapper.dataset.goalIndex);
    
    requestAnimationFrame(() => {
        cardWrapper.style.top = '0px'; 
        cardWrapper.style.left = '0px'; 
        cardWrapper.style.height = '100%';
    });
    
    setTimeout(() => {
        if(stage) stage.classList.add('active');
        injectHeroContent(cardWrapper, goalData);
        renderWizard();
    }, 400);
}

function handleReturningPhase() {
    const cardWrapper = document.querySelector('.flip-card-wrapper.state-config');
    const placeholder = document.getElementById('active-card-placeholder');
    const stage = document.getElementById('configuration-stage');
    
    if(stage) stage.classList.remove('active');
    if (!cardWrapper || !placeholder) { transitionTo('SELECTION'); return; }
    
    const backFace = cardWrapper.querySelector('.flip-card-back');
    if(backFace) {
        backFace.style.opacity = '0';
        setTimeout(() => { restoreMonolithContent(cardWrapper); backFace.style.opacity = '1'; }, 150);
    }

    updateActiveDot(null);

    const viewport = document.getElementById('stage-viewport');
    const pRect = placeholder.getBoundingClientRect();
    
    cardWrapper.classList.remove('state-config'); 
    cardWrapper.classList.add('state-returning');
    
    requestAnimationFrame(() => {
        const vRect = viewport.getBoundingClientRect(); // re-measure viewport for safe return
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
        State.selectedCardId = null;
        transitionTo('SELECTION');
    }, 800);
}

// =============================================================================
// 6. FOOTER NAVIGATION (TRINITY CLUSTER)
// =============================================================================

function initFooterDots() {
    const dots = document.querySelectorAll('.trinity-dot');
    const goals = window.GOAL_COLOR_DATA || [];

    dots.forEach((dot, idx) => {
        const goal = goals[idx];
        if (goal) {
            let color = goal.accent_color;
            if (!color && goal.color_hue !== undefined) {
                color = `hsl(${goal.color_hue}, 70%, 50%)`;
            }
            
            dot.style.setProperty('--dot-color', color || '#cbd5e1');
            dot.title = `Switch to: ${goal.title}`; 
            
            dot.onclick = (e) => {
                e.stopPropagation();
                handleFooterDotClick(idx);
            };
        } else {
            dot.style.display = 'none';
        }
    });
}

function handleFooterDotClick(index) {
    const targetCardId = `goal-${index}`;
    const targetCard = document.querySelector(`[data-card-id="${targetCardId}"]`);
    if (!targetCard) return;

    if (State.selectedCardData && State.selectedCardData.id === targetCardId && State.phase === 'CONFIG') {
        return; 
    }

    updateActiveDot(index);

    if (State.phase === 'CONFIG') {
        window.exitStage();
        setTimeout(() => {
            handleCardClick(targetCard);
        }, 850);
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

// =========================================================
// WIZARD RENDERER
// =========================================================

function renderWizard() {
    const currentStep = State.steps[State.currentStepIndex];
    if(!currentStep) return;

    const headerContainer = document.querySelector('.wizard-header');
    const mainContainer = document.getElementById('wizard-main-area');
    const footerContainer = document.querySelector('.wizard-footer');

    const backendNode = State.sysConfig[currentStep.id] || {};
    const wizardMeta = backendNode.wizard || currentStep; 
    const existingVal = State.config[currentStep.id] || '';
    const insightMap = wizardMeta.insight_map || {};

    // A. HEADER
    headerContainer.innerHTML = `
        <div class="fade-in">
            <h2 class="font-brand text-dark mb-2" style="font-size: 2.2rem; line-height: 1.1;">
                ${wizardMeta.question || currentStep.step_label}
            </h2>
            <p class="font-body text-muted" style="font-size: 1rem; max-width: 95%;">
                ${wizardMeta.helper}
            </p>
        </div>
    `;

    // B. CONTENT
    let contentHTML = '';
    
    if (currentStep.id === 'FORK') {
        contentHTML = renderForkScreen();
    } else {
        // Render Standard Step returns the full HTML including insight deck
        contentHTML = renderStandardStep(currentStep);
    }

    mainContainer.innerHTML = contentHTML;

    // C. FOOTER
    const dotsHtml = State.steps.map((s, idx) => {
        let status = '';
        if (idx === State.currentStepIndex) status = 'active';
        else if (idx < State.currentStepIndex) status = 'completed';
        return `<div class="wizard-step-dot ${status}" onclick="window.jumpToStep(${idx})" title="${s.step_label || s.id}"></div>`;
    }).join('');

    const backBtnHtml = State.currentStepIndex === 0 
        ? `<button class="wiz-btn-back" style="visibility: hidden">Back</button>`
        : `<button class="wiz-btn-back" onclick="window.wizardBack()"><i class="fas fa-arrow-left"></i> Back</button>`;
        
    const nextBtnHtml = currentStep.id === 'FORK'
        ? `` 
        : `<button class="wiz-btn-next" onclick="window.wizardNext()">Next <i class="fas fa-arrow-right"></i></button>`;

    footerContainer.innerHTML = `
        <div class="d-flex align-items-center">
            <span class="wizard-track-label">Step ${State.currentStepIndex + 1}/${State.steps.length}</span>
            <div class="wizard-progress-track">
                ${dotsHtml}
            </div>
        </div>
        <div class="d-flex gap-3">
            ${backBtnHtml}
            ${nextBtnHtml}
        </div>
    `;
}

function renderStandardStep(step) {
    const existingVal = State.config[step.id] || '';
    const backendNode = State.sysConfig[step.id] || {};
    const wizardMeta = backendNode.wizard || step; 
    const insightMap = wizardMeta.insight_map || {};
    
    const currentInsight = insightMap[existingVal] || wizardMeta.helper || "Select an option to calibrate the System.";
    let innerContent = '';

    // --- CASE A: GRID SELECTION ---
    if (step.options && step.options.length > 0) {
        const optionsToRender = backendNode.options || step.options || [];
        innerContent = `
            <div class="option-grid-compact fade-in">
                ${optionsToRender.map(opt => {
                    const isSelected = existingVal === opt;
                    const iconClass = getIconForOption(opt); 
                    const colorHex = getColorForOption(opt);
                    
                    return `
                    <div class="option-card ${isSelected ? 'selected' : ''}" 
                         style="--opt-primary: ${colorHex};"
                         onclick="window.selectOption('${step.id}', '${opt}')"
                         onmouseenter="window.updateInsight('${step.id}', '${opt}')"
                         onmouseleave="window.resetInsight('${step.id}')">
                        
                        <div class="option-icon">
                            <i class="fas ${iconClass}"></i>
                        </div>
                        
                        <div class="option-label">${opt}</div>
                    </div>`;
                }).join('')}
            </div>
        `;
    }
    
    // --- CASE B: TAG INPUT ---
    else if (backendNode.ui_type === 'tags') {
        const currentTags = Array.isArray(existingVal) ? existingVal : (existingVal ? existingVal.split(',') : []);
        innerContent = `
            <div class="fade-in">
                <div class="tag-input-container" onclick="document.getElementById('tag-input-${step.id}').focus()">
                    ${currentTags.map((tag, i) => `
                        <span class="tag-pill">
                            ${tag} <i class="fas fa-times tag-remove" onclick="window.removeTag('${step.id}', ${i}, event)"></i>
                        </span>
                    `).join('')}
                    <input type="text" id="tag-input-${step.id}" class="tag-input-field" 
                           placeholder="${wizardMeta.placeholder || 'Type and press Enter...'}"
                           autocomplete="off"
                           onkeydown="window.handleTagInput('${step.id}', event)">
                </div>
                <div class="mt-3 font-data text-muted x-small d-flex align-items-center gap-2" style="opacity: 0.7;">
                    <i class="fas fa-keyboard"></i> <span>PRESS <kbd class="bg-light border rounded px-1 text-dark">ENTER ↵</kbd> TO ADD</span>
                </div>
            </div>`;
    }
    
    // --- CASE C: DATE ---
    else if (step.id === 'HORIZON' || backendNode.ui_type === 'date') {
        const quicks = wizardMeta.quick_selects || ["3 Months", "6 Months", "1 Year", "2 Years", "ASAP"];
        innerContent = `
            <div class="fade-in">
                <div class="date-quick-chips">
                    ${quicks.map(label => {
                        const calcDate = getSmartHorizonDate(label);
                        const isActive = existingVal === calcDate;
                        return `<div class="date-chip ${isActive ? 'active' : ''}" 
                                     onclick="window.selectOption('${step.id}', '${calcDate}')">
                                     ${label}
                                </div>`;
                    }).join('')}
                </div>
                <div class="mt-4">
                    <label class="font-data text-muted x-small mb-2">OR SELECT SPECIFIC COMPLETION DATE</label>
                    <input type="date" class="form-control form-control-lg border-2 shadow-sm" 
                           style="height: 60px; font-size: 1.5rem; font-family: var(--font-data);"
                           value="${existingVal.includes('-') ? existingVal : ''}" 
                           onchange="window.selectOption('${step.id}', this.value)">
                </div>
            </div>`;
    }
    // --- CASE D: FALLBACK ---
    else {
        innerContent = `<div class="fade-in"><textarea class="form-control bg-light border-0 font-body p-3 shadow-inner" rows="4" placeholder="Enter details..." oninput="window.selectOption('${step.id}', this.value)">${existingVal}</textarea></div>`;
    }

    return `
        <div class="d-flex flex-column h-100 justify-content-center">
            ${innerContent}
            ${renderInsightBox(currentInsight, "active-insight-box")}
        </div>
    `;
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
            <!-- Hero Status Area -->
            <div class="text-center pt-2 mb-4 flex-grow-1 d-flex flex-column justify-content-center align-items-center">
                <div class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-3 py-2 mb-3 font-data">
                    <i class="fas fa-check-circle me-2"></i> SYSTEM CALIBRATED
                </div>
                <h2 class="font-brand display-5 mb-3 text-dark">Ready to Speculate</h2>
                <p class="text-muted font-body mx-auto mb-4" style="max-width: 450px; font-size: 1.1rem;">
                    Core parameters locked. The Engine is primed to calculate your trajectory.
                </p>
                <button class="btn wiz-btn-gen rounded-pill px-5 py-3 font-data text-white shadow-lg hover-lift" 
                        onclick="window.submitConfig()"
                        style="background-color: var(--active-theme-color); font-size: 1.2rem; min-width: 250px;">
                    <i class="fas fa-bolt me-2"></i> GENERATE SOLUTION
                </button>
            </div>

            <!-- Optional Extras (The Fork) -->
            <div class="border-top pt-4 mt-auto">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h6 class="font-data text-muted fw-bold small mb-0" style="letter-spacing: 1px;">INCREASE PRECISION (OPTIONAL)</h6>
                    <span class="badge bg-light text-muted border font-data">POWER USER</span>
                </div>
                <div class="option-grid-compact" style="grid-template-columns: repeat(2, 1fr); gap: 0.8rem;">
                    ${extraOptions.map(p => {
                        const isChecked = State.extraParams.includes(p.id);
                        return `
                        <div class="option-card ${isChecked ? 'selected' : ''}" 
                             onclick="window.toggleExtraParam('${p.id}')"
                             style="min-height: 60px; padding: 0.8rem; --opt-primary: var(--active-theme-color);">
                            <div class="option-icon" style="width: 36px; height: 36px; font-size: 1rem;">
                                <i class="fas ${isChecked ? 'fa-check' : p.icon}"></i>
                            </div>
                            <div style="flex:1;">
                                <div class="option-label" style="font-size: 0.8rem;">${p.label}</div>
                                <div style="font-size: 0.7rem; color: #64748b; line-height:1.2;">${p.desc}</div>
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
                ${State.extraParams.length > 0 ? `
                    <div class="text-center mt-3">
                        <button class="btn btn-outline-dark rounded-pill px-4 font-data small" onclick="window.wizardNext()">
                            CONFIGURE EXTRAS (${State.extraParams.length}) <i class="fas fa-arrow-right ms-2"></i>
                        </button>
                    </div>` : ''
                }
            </div>
        </div>
    `;
}

function renderInsightBox(text, id="") {
    const formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return `
        <div class="context-insight-box" id="${id}">
            <div class="context-insight-title">
                <i class="fas fa-microchip me-1"></i> SPECULATE ENGINE
            </div>
            <div class="context-insight-body">${formatted}</div>
        </div>`;
}

function injectHeroContent(cardWrapper, goalData) {
    const backFace = cardWrapper.querySelector('.flip-card-back');
    if (!backFace) return;
    backFace.style.opacity = '0';
    setTimeout(() => {
        backFace.innerHTML = `
            <div class="card-texture-overlay"></div>
            <div class="hero-card-content">
                <i class="${goalData.icon} hero-ghost-icon"></i>
                <button onclick="window.exitStage()" class="hero-return-button"><i class="fas fa-arrow-left"></i> RETURN TO CHOICES</button>
                <div class="hero-domain-pill">
                    <i class="${goalData.icon}"></i> 
                    <span>${goalData.domain}</span>
                </div>
                <h2 class="hero-title">${goalData.title}</h2>
                <div class="hero-desc-box">
                    <div class="hero-desc-accent"></div>
                    <p class="hero-desc-text">${goalData.goal}</p>
                </div>
                <div id="system-config-container" style="margin-top: 1.5rem; width: 100%;">
                    <div class="font-data text-white-50 x-small tracking-widest mb-2" style="border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px;">SYSTEM CONFIGURATION</div>
                    <div id="sys-pill-stack" class="d-flex flex-column gap-2 align-items-start"></div>
                </div>
            </div>`;
        const hue = goalData.colorHue || 180;
        const activeColor = `hsl(${hue}, 70%, 45%)`;
        cardWrapper.style.setProperty('--active-theme-color', activeColor);
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
    
    pill.style.cssText = `
        display: inline-flex; align-items: center; gap: 0.75rem; 
        padding: 0.4rem 1rem 0.4rem 0.4rem; background: rgba(255, 255, 255, 0.9); 
        border: 1px solid rgba(255,255,255,0.5); border-radius: 50px; 
        margin-bottom: 0.5rem; cursor: pointer; backdrop-filter: blur(4px);
    `;
    
    pill.onclick = () => {
        const stepIndex = State.steps.findIndex(s => s.id === type);
        if (stepIndex !== -1) window.jumpToStep(stepIndex);
    };

    let dispValue = value.length > 25 ? value.substring(0, 22) + '...' : value;
    
    pill.innerHTML = `
        <div class="icon-box" style="
            width: 28px; height: 28px; border-radius: 50%; 
            background: var(--active-theme-color, #333); color: white; 
            display: flex; align-items: center; justify-content: center; 
            font-size: 0.8rem; flex-shrink: 0;">
            <i class="fas ${icon}"></i>
        </div>
        <div style="display: flex; flex-direction: column; line-height: 1.1;">
            <span style="font-size: 0.55rem; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: #64748b; margin-bottom: 1px;">${type}</span>
            <span class="value-text" style="font-size: 0.8rem; font-weight: 700; color: #1e293b;">${dispValue}</span>
        </div>`;
    stack.appendChild(pill);
}

function renderNewGoals(goals, gridElement) {
    gridElement.innerHTML = '';
    goals.forEach((goal, index) => {
        const hue = goal.color_hue || (index * 60) % 360;
        const cardId = `goal-${index}`;
        const cardWrapper = document.createElement('div');
        
        cardWrapper.className = `flip-card-wrapper ${!goal.is_compliant ? 'violation' : ''}`;
        cardWrapper.dataset.cardId = cardId;
        cardWrapper.dataset.cardTitle = goal.title;
        cardWrapper.dataset.colorHue = hue;
        cardWrapper.dataset.goalIndex = index;
        
        const cardGrad = goal.card_gradient || `linear-gradient(135deg, hsl(${hue}, 70%, 50%), hsl(${hue + 30}, 80%, 40%))`;
        const plateGrad = goal.plate_gradient || `linear-gradient(135deg, hsl(${hue}, 70%, 60%), hsl(${hue}, 70%, 50%))`;
        const btnGrad = goal.btn_gradient || `linear-gradient(to right, hsl(${hue}, 70%, 50%), hsl(${hue}, 80%, 40%))`;
        const iconColor = goal.icon_color || '#fff';

        cardWrapper.innerHTML = `
            <div class="flip-card-inner">
                <div class="flip-card-back" style="background: ${cardGrad};">
                    <div class="card-texture-overlay"></div>
                    <div class="monolith-content">
                        <div class="monolith-icon-circle"><i class="${goal.icon} monolith-icon"></i></div>
                        ${!goal.is_compliant ? `<span class="badge bg-black bg-opacity-25 border border-danger text-white font-data px-3 py-2 mt-3">PROTOCOL VIOLATION</span>` : `<div class="font-data text-white-50 x-small tracking-widest opacity-75 border border-white border-opacity-25 rounded-pill px-3 py-1 mt-3">STRUCTURED SPECULATION</div>`}
                    </div>
                </div>
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
                         <button type="button" class="btn-select-pill-large" style="background: ${btnGrad};">${!goal.is_compliant ? 'PROTOCOL VIOLATION' : 'CHOOSE GOAL'}</button>
                     </div>
                </div>
            </div>
            <div class="system-pill-dock position-absolute top-0 start-0 w-100 p-4 d-flex flex-column gap-2" style="z-index: 5; pointer-events: none;"></div>
        `;
        gridElement.appendChild(cardWrapper);
    });
    
    initFooterDots();
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('[SSPEC] Goal Selection Module Initialized');
    
    const existingCards = document.querySelectorAll('.flip-card-wrapper');
    existingCards.forEach(card => {
        card.removeAttribute('onclick');
        card.onclick = null; 
    });

    const gridContainer = document.getElementById('goalCardsContainer');
    if(gridContainer) {
        gridContainer.addEventListener('click', (e) => {
            const wrapper = e.target.closest('.flip-card-wrapper');
            if(wrapper) {
                handleCardClick(wrapper);
            }
        });
    }

    initFooterDots();
    transitionTo('DEALING');
    
    if (!document.getElementById('pill-anim-style')) {
        const style = document.createElement('style');
        style.id = 'pill-anim-style';
        style.innerHTML = `@keyframes pillPopIn { 0% { opacity: 0; transform: scale(0.8) translateX(-20px); } 100% { opacity: 1; transform: scale(1) translateX(0); } }`;
        document.head.appendChild(style);
    }
    
    const oldSpeculateBtn = document.getElementById('generate-new-goals');
    if (oldSpeculateBtn) {
        const newSpeculateBtn = oldSpeculateBtn.cloneNode(true);
        oldSpeculateBtn.parentNode.replaceChild(newSpeculateBtn, oldSpeculateBtn);
        
        newSpeculateBtn.addEventListener('click', async () => {
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