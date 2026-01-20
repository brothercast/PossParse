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

/**
 * 2d. Hint Resolution
 * Extracts the 'hint' text from the DEFAULTS ontology matching the label.
 * Returns actionable advice for the Insight Box.
 */
function getHintForOption(optLabel) {
    for (let cat in DEFAULTS) {
        // Check for match in label or id
        const match = DEFAULTS[cat].find(o => o.label === optLabel || o.id === optLabel);
        if (match && match.hint) return match.hint;
    }
    return "Refines the structural constraints of the solution.";
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
    if(box) {
        // Matches the default state in renderStandardStep
        box.querySelector('.context-insight-body').innerText = "Hover over an option to preview its impact on the pathway.";
    }
};
window.handleTagInput = handleTagInput;
window.removeTag = removeTag;

// =============================================================================
// 5. BUSINESS LOGIC (Internal)
// =============================================================================

function toggleExtraParamLogic(id) {
    const idx = State.extraParams.indexOf(id);
    // Visual toggle in DOM
    const btn = document.querySelector(`.option-card-pill[onclick*="${id}"]`);
    const icon = btn.querySelector('.pill-icon-circle i');
    const defIcon = btn.dataset.defIcon || 'fa-circle'; // Fallback if needed, though renderForkScreen handles redraw usually

    if(idx > -1) {
        // Remove
        State.extraParams.splice(idx, 1);
        State.steps = State.steps.filter(s => s.id !== id);
        if(btn) {
            btn.classList.remove('selected');
            // Hacky icon toggle or just let re-render handle it? 
            // Re-rendering is safer for icons, but let's toggle class for speed
            // ideally we just re-render the button icon here
        }
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
            conf = { step_label: 'Scale', step_icon: 'fa-map', question: 'What is the footprint?', helper: 'Geography dictates physics.', options: DEFAULTS.SCALE.map(o => o.label) };
        } else if (id === 'MODALITY') {
            conf = { step_label: 'Work Style', step_icon: 'fa-users-gear', question: 'How do we coordinate?', helper: 'Rhythm dictates structure.', options: DEFAULTS.MODALITY.map(o => o.label) };
        }

        const stepDef = { id: id, ...conf };
        // Insert after current step (which is FORK)
        // Wait, standard insert logic:
        const forkIndex = State.steps.findIndex(s => s.id === 'FORK');
        // We actually want to append them after FORK in order of appearance
        // Re-sorting might be needed if user clicks out of order, 
        // but for now appending to the queue is fine.
        if (State.currentStepIndex + 1 < State.steps.length) {
             State.steps.splice(State.currentStepIndex + 1, 0, stepDef);
        } else {
             State.steps.push(stepDef);
        }
    }
    
    // --- FOOTER LOGIC ---
    updateForkFooter();
    
    // Re-render to update icons (checkmarks)
    const mainContainer = document.getElementById('wizard-main-area');
    mainContainer.innerHTML = renderForkScreen();
}

function updateForkFooter() {
    const nextBtn = document.querySelector('.wiz-btn-next');
    if (!nextBtn) return; // Safety check
    
    if (State.steps[State.currentStepIndex].id === 'FORK') {
        if (State.extraParams.length > 0) {
            nextBtn.innerHTML = `CONFIGURE EXTRAS (${State.extraParams.length}) <i class="fas fa-arrow-right ms-2"></i>`;
            nextBtn.style.visibility = 'visible';
            nextBtn.classList.add('btn-primary', 'text-white', 'border-0');
        } else {
            nextBtn.style.visibility = 'hidden';
            nextBtn.classList.remove('btn-primary', 'text-white', 'border-0');
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
    
    // Update footer logic after render
    setTimeout(updateForkFooter, 50); 
}

function submitConfigLogic() {
    // 1. Populate Hidden Form
    const form = document.getElementById('final-submit-form');
    document.getElementById('form-goal').value = State.selectedCardData.goal;
    document.getElementById('form-title').value = State.selectedCardData.title;
    document.getElementById('form-domain').value = State.selectedCardData.domain;
    document.getElementById('form-domain-icon').value = State.selectedCardData.icon;
    
    // Clear old dynamics
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

    // 2. Prepare Wizard Container
    const wizardContainer = document.querySelector('.wizard-container');
    if (!wizardContainer) { form.submit(); return; }

    wizardContainer.classList.add('loading-state');
    
    // 3. Inject CLASSIC ATOM SPINNER
    // Helper to generate an Orbit SVG string
    const getOrbitHtml = (color, duration, reverse, sphereGradient) => {
        const dir = reverse ? 'reverse' : 'normal';
        const counterAnim = reverse ? 'counter-spin-reverse' : 'counter-spin-normal';
        const flipStyle = reverse ? 'transform: scaleX(-1);' : '';
        
        // Define unique gradient ID
        const gradId = `grad-${color.replace('#','')}`;
        
        return `
        <div class="orbit-track-wrapper" style="animation: orbit-spin ${duration} linear infinite; animation-direction: ${dir};">
            <svg viewBox="0 0 100 100" class="orbit-svg" style="${flipStyle}">
                <defs>
                    <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stop-color="${color}" stop-opacity="0" />
                        <stop offset="100%" stop-color="${color}" stop-opacity="1" />
                    </linearGradient>
                </defs>
                <circle cx="50" cy="50" r="48" class="orbit-ring-faint" stroke="${color}" />
                <path d="M 16,84 A 48,48 0 0 1 50,2" class="orbit-trail" stroke="url(#${gradId})" />
            </svg>
            <div class="electron-sphere" 
                 style="background: ${sphereGradient}; color: ${color}; animation: ${counterAnim} ${duration} linear infinite;">
            </div>
        </div>`;
    };

    const atomHtml = `
    <div class="atom-wrapper fade-in">
        <div class="atom-rainbow-border"></div>
        <div class="atom-bg-dots"></div>
        
        <!-- 3D Scene -->
        <div class="atom-scene">
            <div class="atom-core">
                
                <!-- ORBIT 1: CYAN -->
                <div class="orbit-plane orbit-plane-1">
                    ${getOrbitHtml('#22d3ee', '1.5s', false, 'radial-gradient(circle at 35% 35%, #67e8f9 0%, #22d3ee 60%, #06b6d4 100%)')}
                </div>

                <!-- ORBIT 2: ORANGE -->
                <div class="orbit-plane orbit-plane-2">
                    ${getOrbitHtml('#fb923c', '2s', true, 'radial-gradient(circle at 35% 35%, #fdba74 0%, #fb923c 60%, #ea580c 100%)')}
                </div>

                <!-- ORBIT 3: PURPLE -->
                <div class="orbit-plane orbit-plane-3">
                    ${getOrbitHtml('#c084fc', '2.5s', false, 'radial-gradient(circle at 35% 35%, #d8b4fe 0%, #c084fc 60%, #9333ea 100%)')}
                </div>

                <!-- NUCLEUS -->
                <div class="atom-nucleus">
                    <div class="nucleus-ring"></div>
                    <div class="nucleus-glow"></div>
                    <i id="atom-icon" class="fas fa-rocket nucleus-icon visible"></i>
                </div>

            </div>
        </div>

        <!-- Text Wipe -->
        <div class="atom-text-area">
            <div class="atom-title">GENERATING YOUR STRUCTURED SOLUTION</div>
            <div class="atom-message-box">
                <div id="atom-msg-display" class="atom-msg active">ACCESSING SSPEC NEURAL NETWORK...</div>
            </div>
        </div>
    </div>`;

    // Clear and Inject
    // If embedded wrapper exists reuse it, else append
    let wrapper = wizardContainer.querySelector('.embedded-spinner-wrapper');
    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.className = 'embedded-spinner-wrapper';
        wrapper.style.cssText = "display: flex; flex:1; width:100%; height:100%;";
        wizardContainer.innerHTML = ''; // clear wizard content
        wizardContainer.appendChild(wrapper);
    }
    wrapper.innerHTML = atomHtml;

    // 4. Start Animations (Icon & Text Cycling)
    const icons = ['fa-rocket', 'fa-bolt', 'fa-globe', 'fa-microchip', 'fa-layer-group', 'fa-database'];
    const messages = [
        "Vectorizing inputs...",
        "Calibrating Horizon constraints...",
        "Optimizing resource paths...",
        "Drafting executive language...",
        "Finalizing data packet..."
    ];
    
    let iIdx = 0;
    let mIdx = 0;
    const iconEl = document.getElementById('atom-icon');
    const msgEl = document.getElementById('atom-msg-display');

    const animInterval = setInterval(() => {
        // Swap Icon
        iIdx = (iIdx + 1) % icons.length;
        if(iconEl) {
            iconEl.classList.remove('visible');
            iconEl.classList.add('pop-in');
            
            setTimeout(() => {
                iconEl.className = `fas ${icons[iIdx]} nucleus-icon pop-in`;
                requestAnimationFrame(() => {
                    iconEl.classList.remove('pop-in');
                    iconEl.classList.add('visible');
                });
            }, 150); // wait for fade out
        }

        // Swap Text (Slower cycle, every 2nd tick maybe? or just every tick is fine)
        // Let's do text every 2 ticks (2.4s)
        if (iIdx % 2 === 0) {
            mIdx = (mIdx + 1) % messages.length;
            if(msgEl) {
                msgEl.style.opacity = 0;
                msgEl.style.transform = "translateY(-5px)";
                setTimeout(() => {
                    msgEl.innerText = messages[mIdx];
                    msgEl.style.opacity = 1;
                    msgEl.style.transform = "translateY(0)";
                }, 300);
            }
        }

    }, 1200);

    // 5. Submit after delay
    setTimeout(() => { 
        clearInterval(animInterval);
        form.submit(); 
    }, 4500); // 4.5s simulation
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
    
    // Render Main Content
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

    // Render Progress Dots
    const dotsHtml = State.steps.map((s, idx) => {
        let status = idx === State.currentStepIndex ? 'active' : (idx < State.currentStepIndex ? 'completed' : '');
        return `<div class="wizard-step-dot ${status}" onclick="window.jumpToStep(${idx})" title="${s.step_label || s.id}"></div>`;
    }).join('');

    // --- NAVIGATION BUTTON LOGIC ---
    
    // 1. Back Button
    const backBtnHtml = State.currentStepIndex === 0 
        ? `<button class="wiz-btn-back" style="visibility: hidden">Back</button>`
        : `<button class="wiz-btn-back" onclick="window.wizardBack()"><i class="fas fa-arrow-left"></i> Back</button>`;
        
    // 2. Next Button (The Fix)
    // We ALWAYS create the button structure, but we control visibility/text based on state.
    let nextVisibility = 'visible';
    let nextText = `Next <i class="fas fa-arrow-right ms-2"></i>`;
    let nextClass = '';

    if (currentStep.id === 'FORK') {
        if (State.extraParams.length > 0) {
            nextText = `CONFIGURE EXTRAS (${State.extraParams.length}) <i class="fas fa-arrow-right ms-2"></i>`;
            nextClass = 'btn-primary text-white border-0'; // Add pop for the action
        } else {
            nextVisibility = 'hidden'; // Hide if no extras selected yet
        }
    }

    const nextBtnHtml = `
        <button class="wiz-btn-next ${nextClass}" 
                style="visibility: ${nextVisibility};" 
                onclick="window.wizardNext()">
            ${nextText}
        </button>`;

    // Render Footer
    footerContainer.innerHTML = `
        <div class="d-flex align-items-center"><span class="wizard-track-label">Step ${State.currentStepIndex + 1}/${State.steps.length}</span><div class="wizard-progress-track">${dotsHtml}</div></div>
        <div class="d-flex gap-3 align-items-center">${backBtnHtml}${nextBtnHtml}</div>
    `;
}

function renderStandardStep(step) {
    const existingVal = State.config[step.id] || '';
    const backendNode = State.sysConfig[step.id] || {};
    const wizardMeta = backendNode.wizard || step; 
    
    let innerContent = '';

    // A. OPTIONS (The Grid View)
    if (step.options && step.options.length > 0) {
        innerContent = `
            <div class="option-grid-compact fade-in">
                ${step.options.map(optLabel => {
                    const iconClass = getIconForOption(optLabel); 
                    const colorHex = getColorForOption(optLabel);
                    const isSelected = existingVal === optLabel;
                    
                    // --- REWIRED HINT LOGIC ---
                    const hintText = getHintForOption(optLabel);
                    // Safe escape for HTML attributes
                    const safeHint = hintText.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                    
                    return `
                    <div class="option-card ${isSelected ? 'selected' : ''}" 
                         style="--opt-primary: ${colorHex};"
                         onclick="window.selectOption('${step.id}', '${optLabel}')"
                         onmouseenter="window.updateInsightText('${safeHint}')"
                         onmouseleave="window.resetInsightText()">
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
    // C. DATE (THE HERO TIMELINE)
    else if (step.id === 'HORIZON' || backendNode.ui_type === 'date') {
        const quicks = wizardMeta.quick_selects || ["3 Months", "6 Months", "1 Year", "2 Years", "5 Years"];
        
        // Logic to show a default "Today" or the selected date
        let displayDate = existingVal ? existingVal : new Date().toISOString().split('T')[0];
        
        // Helper to trigger the hidden date input
        window.triggerDateInput = () => document.getElementById('real-date-input').showPicker();

        innerContent = `
            <div class="fade-in">
                
                <!-- Hero Wrapper -->
                <div class="timeline-hero-wrapper">
                    <div class="timeline-label-small">TARGET COMPLETION DATE</div>
                    
                    <!-- The Big Clickable Text -->
                    <div class="timeline-date-display" onclick="window.triggerDateInput()">
                        <span id="date-text-display">${existingVal ? existingVal : '-- / -- / --'}</span>
                        <i class="far fa-calendar-alt timeline-icon-trigger"></i>
                    </div>

                    <!-- Hidden Input -->
                    <input type="date" id="real-date-input" class="timeline-real-input"
                           value="${existingVal}" 
                           onchange="window.selectOption('${step.id}', this.value); document.getElementById('date-text-display').innerText = this.value;">

                    <!-- Quick Chips -->
                    <div class="chip-row">
                        ${quicks.map(label => {
                            const calcDate = getSmartHorizonDate(label);
                            const isActive = existingVal === calcDate;
                            return `<div class="date-chip-modern ${isActive ? 'active' : ''}" 
                                         onclick="window.selectOption('${step.id}', '${calcDate}')">
                                         ${label}
                                    </div>`;
                        }).join('')}
                    </div>
                </div>

                <!-- Physics/Insight Box -->
                <div class="timeline-physics-box">
                    <div class="physics-icon"><i class="fas fa-info-circle"></i></div>
                    <div class="physics-content">
                        <h6>TIMELINE PHYSICS</h6>
                        <p>
                            Short horizons (months) force "Hack" strategies and MVP compromises. 
                            Long horizons (years) allow for Infrastructure, Deep Research, and Institutional building.
                        </p>
                    </div>
                </div>

            </div>`;
    }
    // D. FALLBACK TEXTAREA
    else {
        innerContent = `<div class="fade-in"><textarea class="form-control bg-light border-0 font-body p-3 shadow-inner" rows="4" placeholder="Enter details..." oninput="window.selectOption('${step.id}', this.value)">${existingVal}</textarea></div>`;
    }

    return `
        <div class="d-flex flex-column h-100 justify-content-center">
            ${innerContent}
            <!-- UPDATED INSIGHT BOX COPY -->
            <div class="context-insight-box mt-auto" id="active-insight-box">
                <div class="context-insight-title"><i class="fas fa-info-circle me-1"></i> SYSTEM INSIGHT</div>
                <div class="context-insight-body">Hover over an option to preview its impact on the roadmap.</div>
            </div>
        </div>`;
}

function renderForkScreen() {
    const extraOptions = [
        { id: 'DIRECTIVE', label: 'Core Values', icon: 'fa-heart', desc: 'Ethical Standards' },
        { id: 'AVOIDANCE', label: 'Dealbreakers', icon: 'fa-ban', desc: 'Risks to Prevent' },
        { id: 'SCALE', label: 'Scale', icon: 'fa-map', desc: 'Physical Footprint' },
        { id: 'MODALITY', label: 'Work Style', icon: 'fa-people-group', desc: 'Team Rhythm' }
    ];

    return `
        <div class="wizard-step fade-in h-100 d-flex flex-column">
            <!-- HEADER -->
            <div class="text-center pt-2 mb-4">
                <div class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-3 py-2 mb-3 font-data">
                    <i class="fas fa-check-circle me-2"></i> BASELINES ESTABLISHED
                </div>
                <h2 class="font-brand display-5 mb-2 text-dark">Ready to Engineer</h2>
            </div>

            <!-- GENERATE BUTTON (Primary Action) -->
            <div class="flex-grow-1 d-flex flex-column justify-content-center align-items-center mb-4">
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

            <!-- SYSTEM PILLS (Secondary Configuration) -->
            <div class="border-top pt-4 mt-auto">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <div class="d-flex flex-column">
                        <h6 class="font-data text-dark fw-bold small mb-0" style="letter-spacing: 1px;">INCREASE PRECISION (OPTIONAL)</h6>
                        <span class="font-body x-small text-muted">Select factors to fine-tune the Engine's logic.</span>
                    </div>
                </div>
                
                <!-- PILL GRID -->
                <div class="option-grid-compact">
                    ${extraOptions.map(p => {
                        const isChecked = State.extraParams.includes(p.id);
                        
                        return `
                        <div class="option-card-pill ${isChecked ? 'selected' : ''}" 
                                onclick="window.toggleExtraParam('${p.id}')"
                                style="--opt-primary: var(--active-theme-color);">
                            
                            <!-- Left: Icon -->
                            <div class="pill-icon-circle">
                                <i class="fas ${p.icon}"></i>
                            </div>
                            
                            <!-- Middle: Text -->
                            <div class="pill-content d-flex flex-column">
                                <span class="pill-title">${p.label}</span>
                                <span class="pill-desc font-body text-muted x-small">${p.desc}</span>
                            </div>

                            <!-- Right: The New Check Indicator -->
                            <div class="pill-check-indicator">
                                <i class="fas fa-check"></i>
                            </div>

                        </div>`;
                    }).join('')}
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
    gridElement.innerHTML = '';
    
    goals.forEach((goal, index) => {
        const hue = goal.color_hue || (index * 60) % 360;
        const cardId = `goal-${index}`;
        
        const cardWrapper = document.createElement('div');
        // Add 'violation' class if needed
        cardWrapper.className = `flip-card-wrapper ${!goal.is_compliant ? 'violation' : ''}`;
        
        cardWrapper.dataset.cardId = cardId;
        cardWrapper.dataset.cardTitle = goal.title;
        cardWrapper.dataset.colorHue = hue;
        
        // Use Backend Gradients (Python assigns specific red themes for violations)
        // FIX: Do not force #2c3e50 if violation; use the goal.card_gradient (which is red)
        const cardGrad = goal.card_gradient || `linear-gradient(135deg, hsl(${hue}, 70%, 50%), hsl(${hue + 30}, 80%, 40%))`;
        const plateGrad = goal.plate_gradient || `linear-gradient(135deg, hsl(${hue}, 70%, 60%), hsl(${hue}, 70%, 50%))`;
        const btnGrad = goal.btn_gradient || `linear-gradient(to right, hsl(${hue}, 70%, 50%), hsl(${hue}, 80%, 40%))`;
        const iconColor = goal.icon_color || '#fff';

        cardWrapper.innerHTML = `
            <div class="flip-card-inner">
                
                <!-- BACK FACE (Monolith) -->
                <div class="flip-card-back" style="background: ${cardGrad};">
                    <div class="card-texture-overlay"></div>
                    <div class="monolith-content">
                        <div class="monolith-icon-circle" style="${!goal.is_compliant ? 'border-color: #ffcdd2;' : ''}">
                            <i class="${goal.icon} monolith-icon"></i>
                        </div>
                        
                        ${!goal.is_compliant 
                            ? `<!-- VIOLATION STATE UI -->
                               <div class="d-flex flex-column align-items-center mt-3 fade-in">
                                 <div class="badge bg-white text-danger border border-danger font-data px-4 py-2 shadow-sm" 
                                      style="font-size: 0.85rem; letter-spacing: 2px;">
                                      <i class="fas fa-ban me-2"></i>PROTOCOL VIOLATION
                                 </div>
                                 <div class="text-white font-body x-small mt-2 text-center px-4 opacity-75">
                                    Safety constraints active.
                                 </div>
                               </div>` 
                            : `<!-- VALID STATE UI -->
                               <div class="font-data text-white-50 x-small tracking-widest opacity-75 border border-white border-opacity-25 rounded-pill px-3 py-1 mt-3">
                                   STRUCTURED SPECULATION
                               </div>`
                        }
                    </div>
                </div>
                
                <!-- FRONT FACE (Goal Details) -->
                <div class="flip-card-front">
                     <div class="card-header-plate" style="background: ${plateGrad};">
                         <div class="card-texture-overlay"></div>
                         <div class="card-domain-badge-large" style="${!goal.is_compliant ? 'background: rgba(0,0,0,0.4); border-color: rgba(255,255,255,0.2);' : ''}">
                            ${(goal.domain || 'RESTRICTED').toUpperCase()}
                         </div>
                         <div class="card-icon-float-large">
                            <i class="${goal.icon}" style="color: ${iconColor};"></i>
                         </div>
                     </div>
                     
                     <div class="card-body-large">
                         <h3 class="card-title-large text-dark">${goal.title}</h3>
                         <p class="card-desc-large text-muted">${goal.goal}</p>
                     </div>
                     
                     <div class="card-footer-large">
                         <button type="button" class="btn-select-pill-large" 
                                 style="background: ${!goal.is_compliant ? '#94a3b8' : btnGrad}; 
                                        ${!goal.is_compliant ? 'cursor: not-allowed !important; filter: grayscale(1);' : ''}">
                             ${!goal.is_compliant ? '<i class="fas fa-lock me-2"></i> RESTRICTED' : 'CHOOSE GOAL'}
                         </button>
                     </div>
                </div>
            </div>
            <!-- Pill Dock -->
            <div class="system-pill-dock position-absolute top-0 start-0 w-100 p-4 d-flex flex-column gap-2" style="z-index: 5; pointer-events: none;"></div>
        `;
        
        // Attach Listeners
        if (goal.is_compliant) {
            const btn = cardWrapper.querySelector('.btn-select-pill-large');
            if(btn) btn.addEventListener('click', (e) => { e.stopPropagation(); window.selectGoal(cardWrapper); });
            cardWrapper.onclick = () => window.selectGoal(cardWrapper);
        } else {
            // Shake on click
            cardWrapper.onclick = () => {
                cardWrapper.classList.remove('animate-shake');
                void cardWrapper.offsetWidth; // Force reflow
                cardWrapper.classList.add('animate-shake');
            };
        }
        
        gridElement.appendChild(cardWrapper);
    });
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