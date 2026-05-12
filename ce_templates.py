# ce_templates.py
from flask import render_template_string
from utilities import replace_ce_tags_with_pills

# ==============================================================================
# NODE-TYPE-AWARE TAB LABELS
# Each node type gets contextual tab names instead of generic "PREREQUISITES"
# ==============================================================================
TAB_LABELS = {
    "Research": {
        "prerequisites": "Data Sources",
        "stakeholders": "Experts",
        "assumptions": "Hypotheses",
        "resources": "References"
    },
    "Risk": {
        "prerequisites": "Indicators",
        "stakeholders": "Risk Owners",
        "assumptions": "Mitigations",
        "resources": "Frameworks"
    },
    "Stakeholder": {
        "prerequisites": "Pathways",
        "stakeholders": "Network",
        "assumptions": "Incentives",
        "resources": "Agreements"
    },
    "Praxis": {
        "prerequisites": "Dependencies",
        "stakeholders": "Operators",
        "assumptions": "Estimates",
        "resources": "Tools"
    },
    "Environment": {
        "prerequisites": "Regulations",
        "stakeholders": "Communities",
        "assumptions": "Trends",
        "resources": "Studies"
    },
    "Timeline": {
        "prerequisites": "Milestones",
        "stakeholders": "Schedulers",
        "assumptions": "Buffers",
        "resources": "Calendar"
    },
    "Advocacy": {
        "prerequisites": "Assets",
        "stakeholders": "Audiences",
        "assumptions": "Sentiment",
        "resources": "Campaigns"
    },
    "Collaboration": {
        "prerequisites": "Agreements",
        "stakeholders": "Partners",
        "assumptions": "Alignment",
        "resources": "Documents"
    },
    "Legal": {
        "prerequisites": "Regulations",
        "stakeholders": "Counsel",
        "assumptions": "Interpretations",
        "resources": "Documents"
    },
    "Financial": {
        "prerequisites": "Capital",
        "stakeholders": "Funders",
        "assumptions": "Projections",
        "resources": "Instruments"
    },
    "Technology": {
        "prerequisites": "Dependencies",
        "stakeholders": "Engineers",
        "assumptions": "Capabilities",
        "resources": "Platforms"
    },
    "Measurement": {
        "prerequisites": "Baselines",
        "stakeholders": "Analysts",
        "assumptions": "Targets",
        "resources": "Tools"
    },
    "Default": {
        "prerequisites": "Prerequisites",
        "stakeholders": "Stakeholders",
        "assumptions": "Assumptions",
        "resources": "Resources"
    }
}

# Friendly persona names for the sidebar
SIDEBAR_PERSONAS = {
    "Research": {"name": "Research Assistant", "icon": "fa-flask", "greeting": "Let's find the truth together."},
    "Risk": {"name": "Risk Advisor", "icon": "fa-shield-virus", "greeting": "Let's identify what could go wrong."},
    "Stakeholder": {"name": "Network Scout", "icon": "fa-user-astronaut", "greeting": "Let's map your human network."},
    "Praxis": {"name": "Operations Guide", "icon": "fa-rocket", "greeting": "Let's figure out the how."},
    "Environment": {"name": "Systems Ecologist", "icon": "fa-leaf", "greeting": "Let's understand the ecosystem."},
    "Timeline": {"name": "Schedule Architect", "icon": "fa-stopwatch", "greeting": "Let's map the critical path."},
    "Advocacy": {"name": "Campaign Strategist", "icon": "fa-bullhorn", "greeting": "Let's build momentum."},
    "Collaboration": {"name": "Partnership Advisor", "icon": "fa-handshake", "greeting": "Let's find the right allies."},
    "Legal": {"name": "Compliance Counsel", "icon": "fa-scale-balanced", "greeting": "Let's ensure we're covered."},
    "Financial": {"name": "Financial Strategist", "icon": "fa-coins", "greeting": "Let's make the numbers work."},
    "Technology": {"name": "Technical Architect", "icon": "fa-microchip", "greeting": "Let's design the system."},
    "Measurement": {"name": "Impact Analyst", "icon": "fa-chart-line", "greeting": "Let's define success."},
    "Default": {"name": "Workshop Assistant", "icon": "fa-brain", "greeting": "How can I help?"}
}


BASE_MODAL_TEMPLATE = """
<div class="modal fade ceModal" id="ceModal-{{ ceId }}" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-fullscreen-xl-down modal-xl" role="document">
        <div class="modal-content ce-app-shell" data-phase-index="{{ phase_index }}" style="--phase-color: {{ node_info.color }}; --node-color: {{ node_info.color }};">
            
            <!-- HEADER: WARM IDENTITY BAR -->
            <div class="ce-modal-header" style="background: linear-gradient(135deg, {{ node_info.color }}, {{ node_info.color }}dd);">
                <div class="node-icon-box"><i class="{{ node_info.icon }}"></i></div>
                <div class="header-text-block ms-3 flex-grow-1">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h2 class="modal-title ce-title mb-0 text-white leading-tight">{{ ceType.replace('_', ' ').upper() }}</h2>
                            <div class="ce-header-metadata text-white opacity-75 small">// {{ phase_name.upper().replace(' PHASE', '') }} PHASE <span class="mx-2">|</span> ID: {{ ceId.split('-')[0].upper() }}</div>
                        </div>
                        <div class="d-flex gap-2">
                             <button class="btn btn-glass font-data d-none align-items-center gap-2" id="ce-integrity-badge" style="background: rgba(255,255,255,0.15);">
                                <i class="fas fa-shield-alt"></i> <span class="integrity-label">INTEGRITY PENDING</span>
                            </button>
                             <button class="btn btn-glass font-data d-none d-md-flex align-items-center gap-2" id="speculate-sidebar-toggle">
                                <i class="fas fa-sparkles"></i> ASSISTANT
                            </button>
                            <div class="vr bg-white opacity-50 mx-2" style="height: 24px;"></div>
                            <button type="button" class="btn-close-custom" data-bs-dismiss="modal"><i class="fas fa-times"></i></button>
                        </div>
                    </div>
                </div>
                <div class="header-ghost-icon"><i class="{{ node_info.icon }}"></i></div>
            </div>

            <!-- PROGRESS DOTS (Replaces Execution Protocol) -->
            <div class="ce-progress-bar bg-white border-bottom px-4 py-2">
                <div class="d-flex align-items-center justify-content-between">
                    <div class="d-flex align-items-center gap-3">
                        <div class="ce-progress-dot active" style="--dot-color: {{ node_info.color }};"><span>Draft</span></div>
                        <div class="ce-progress-connector"></div>
                        <div class="ce-progress-dot" style="--dot-color: {{ node_info.color }};"><span>Refine</span></div>
                        <div class="ce-progress-connector"></div>
                        <div class="ce-progress-dot" style="--dot-color: {{ node_info.color }};"><span>Validate</span></div>
                        <div class="ce-progress-connector"></div>
                        <div class="ce-progress-dot" style="--dot-color: {{ node_info.color }};"><span>Complete</span></div>
                    </div>
                    <span class="badge rounded-pill border font-data" style="background: {{ node_info.color }}15; color: {{ node_info.color }}; border-color: {{ node_info.color }}40 !important;" id="milestone-status">Getting Started</span>
                </div>
            </div>

            <!-- WORKSPACE -->
            <div class="modal-body ce-workspace-body p-0 d-flex">
                
                <!-- LEFT COLUMN -->
                <div class="ce-main-column position-relative">
                    
                    <!-- INITIALIZATION STATE (Progressive Disclosure) -->
                    {% set is_empty = not ce_data.data.details_data.get(node_info.details_schema[0].key if node_info.details_schema else 'summary') %}
                    <div id="ce-init-state" class="position-absolute top-0 start-0 w-100 h-100 bg-white z-3 d-flex flex-column justify-content-center align-items-center" style="display: {{ 'flex' if is_empty else 'none' }} !important;">
                        <div class="text-center p-5" style="max-width: 500px;">
                            <div class="mb-4">
                                <i class="{{ node_info.icon }} fa-4x" style="color: {{ node_info.color }}; opacity: 0.8;"></i>
                            </div>
                            <h3 class="font-brand mb-3" style="color: #1e293b;">Welcome to the {{ ceType.replace('_', ' ').title() }} Workspace</h3>
                            <p class="font-body text-muted mb-5" style="line-height: 1.6;">
                                {{ node_info.definition }}<br>
                                <span class="small opacity-75">Let's establish the foundational definition to unlock the rest of the workspace tools.</span>
                            </p>
                            
                            <div class="d-flex flex-column gap-3">
                                <button id="btn-auto-init" class="btn text-white font-data rounded-pill py-3 px-4 shadow-sm position-relative overflow-hidden" style="background: linear-gradient(135deg, {{ node_info.color }}, {{ node_info.color }}dd); transition: transform 0.2s;">
                                    <i class="fas fa-sparkles me-2"></i> AUTO-GENERATE (AI DRAFT)
                                </button>
                                <div class="text-muted font-data small my-1">OR</div>
                                <button id="btn-manual-init" class="btn btn-light border font-data rounded-pill py-2 text-secondary">
                                    <i class="fas fa-pen me-2"></i> Write Manually
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- WORKSPACE CONTENT (Hidden if empty) -->
                    <div id="ce-workspace-content" class="h-100 d-flex flex-column" style="opacity: {{ '0' if is_empty else '1' }}; pointer-events: {{ 'none' if is_empty else 'auto' }}; transition: opacity 0.4s ease;">
                        
                        <!-- NAVIGATION -->
                        <ul class="nav nav-tabs ce-nav-tabs pt-2 px-4 bg-white flex-shrink-0" role="tablist" style="--phase-color: {{ node_info.color }};">
                            <li class="nav-item"><button class="nav-link font-data active" data-bs-toggle="tab" data-bs-target="#view-overview-{{ ceId }}">OVERVIEW</button></li>
                            {% for collection in ['prerequisites', 'stakeholders', 'assumptions', 'resources'] %}
                            <li class="nav-item"><button class="nav-link font-data" data-bs-toggle="tab" data-bs-target="#view-{{ collection }}-{{ ceId }}">{{ tab_labels.get(collection, collection)|upper }} <span class="badge rounded-pill bg-light text-dark border ms-1 count-badge" data-collection="{{ collection }}">0</span></button></li>
                            {% endfor %}
                            <li class="nav-item"><button class="nav-link font-data" data-bs-toggle="tab" data-bs-target="#view-criteria-{{ ceId }}"><i class="fas fa-vial me-1"></i>CRITERIA <span class="badge rounded-pill bg-light text-dark border ms-1 count-badge" data-collection="criteria">0</span></button></li>
                            <li class="nav-item ms-auto"><button class="nav-link font-data text-muted" data-bs-toggle="tab" data-bs-target="#view-connections-{{ ceId }}"><i class="fas fa-project-diagram"></i></button></li>
                        </ul>

                        <div class="ce-app-content tab-content flex-grow-1" data-tab-labels='{{ tab_labels | tojson }}' style="background: linear-gradient(180deg, #fefcfa 0%, #fff8f3 100%);">
                        
                        <!-- 1. OVERVIEW DASHBOARD — PRIMARY FIELD DOMINANT -->
                        <div class="tab-pane fade show active p-3 ce-tab-pane" id="view-overview-{{ ceId }}" style="gap: 0.75rem;">
                            
                            <!-- TIER 1: PRIMARY FIELD — RENDERED VIEW + EDIT MODE -->
                            <div class="ce-tier-card position-relative overflow-hidden d-flex flex-column ce-primary-card" style="--node-color: {{ node_info.color }}; min-height: 3em; max-height: 45vh;">
                                <div class="ce-def-ghost-icon"><i class="{{ node_info.icon }}"></i></div>
                                <div class="position-relative z-2 d-flex flex-column flex-grow-1" style="min-height: 0;">
                                    <!-- Header: Label + Controls -->
                                    <div class="d-flex justify-content-between align-items-center mb-2 flex-shrink-0">
                                        <span class="font-data small tracking-widest fw-bold" style="color: {{ node_info.color }};">
                                            {{ node_info.details_schema[0].label | upper if node_info.details_schema else 'NODE DEFINITION' }}
                                        </span>
                                        <div class="d-flex gap-2 align-items-center">
                                            <button class="btn btn-sm rounded-pill px-2 font-data border ce-edit-toggle" 
                                                    style="color: {{ node_info.color }}; border-color: {{ node_info.color }}40 !important; font-size: 0.62rem; padding: 1px 8px;"
                                                    title="Toggle Edit Mode">
                                                <i class="fas fa-pen me-1"></i> <span class="edit-toggle-label">Edit</span>
                                            </button>
                                            <button class="btn btn-sm rounded-pill px-3 font-data text-white btn-enhance-field shadow-sm" data-field="{{ node_info.details_schema[0].key if node_info.details_schema else 'summary' }}" style="background: {{ node_info.color }}; font-size: 0.7rem;">
                                                <i class="fas fa-sparkles me-1"></i> AI DRAFT
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <!-- RENDERED VIEW (default): Markdown + CE pills -->
                                    <div class="ce-rendered-view flex-grow-1 font-body custom-scrollbar" 
                                         style="overflow-y: auto; font-size: 0.88rem; line-height: 1.7; color: #334155; min-height: 0; cursor: text;"
                                         data-field="{{ node_info.details_schema[0].key if node_info.details_schema else 'summary' }}"
                                         data-placeholder="{{ node_info.details_schema[0].label if node_info.details_schema else 'Click to add content...' }}">
                                    </div>

                                    <!-- EDIT MODE (hidden): Raw textarea -->
                                    <form id="narrative-form-{{ ceId }}" class="flex-grow-1 d-none ce-edit-form" style="min-height: 0;">
                                        <textarea name="{{ node_info.details_schema[0].key if node_info.details_schema else 'summary' }}" 
                                                  class="form-control border-0 font-body p-0 shadow-none ce-hero-textarea w-100 h-100" 
                                                  style="resize: none; font-size: 0.88rem; line-height: 1.7; background: transparent; color: #334155;" 
                                                  placeholder="{{ node_info.details_schema[0].label if node_info.details_schema else 'Write your content here... Supports **markdown** formatting.' }}"
                                        >{{ ce_data.data.details_data.get(node_info.details_schema[0].key if node_info.details_schema else 'summary', '') }}</textarea>
                                        
                                        {% if node_info.details_schema|length > 1 %}
                                        {% for field in node_info.details_schema[1:] %}
                                        <input type="hidden" name="{{ field.key }}" value="{{ ce_data.data.details_data.get(field.key, '') }}">
                                        {% endfor %}
                                        {% endif %}
                                    </form>

                                    <!-- Definition footer -->
                                    <div class="d-flex align-items-center gap-2 pt-2 mt-auto flex-shrink-0" style="border-top: 1px solid {{ node_info.color }}15;">
                                         <i class="fas fa-info-circle" style="color: {{ node_info.color }}60; font-size: 0.7rem;"></i>
                                         <span class="font-data" style="color: {{ node_info.color }}80; font-size: 0.68rem;">{{ node_info.definition }}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- TIER 2: COMPACT SUPPORTING ROW -->
                            <div class="row g-2">
                                <!-- LEFT: Secondary Detail (compact) -->
                                <div class="col-lg-5">
                                    <div class="ce-tier-card h-100" style="--node-color: {{ node_info.color }}; padding: 0.8rem 1rem;">
                                        <div class="d-flex justify-content-between align-items-center mb-1">
                                            <span class="font-data small tracking-widest" style="color: #64748b; font-size: 0.62rem;">
                                                {{ node_info.details_schema[1].label | upper if node_info.details_schema|length > 1 else 'STRATEGIC CONTEXT' }}
                                            </span>
                                            <button class="btn btn-sm rounded-pill px-2 font-data border btn-enhance-field" data-field="{{ node_info.details_schema[1].key if node_info.details_schema|length > 1 else 'context' }}" style="color: {{ node_info.color }}; border-color: {{ node_info.color }}40 !important; font-size: 0.6rem; padding: 1px 8px;">
                                                <i class="fas fa-sparkles me-1"></i> Generate
                                            </button>
                                        </div>
                                        <textarea name="{{ node_info.details_schema[1].key if node_info.details_schema|length > 1 else 'context' }}" 
                                                  class="form-control border-0 font-body p-0 shadow-none ce-hero-textarea" 
                                                  rows="3"
                                                  style="resize: none; font-size: 0.8rem; line-height: 1.55; background: transparent; color: #475569;" 
                                                  placeholder="{{ node_info.details_schema[1].label if node_info.details_schema|length > 1 else 'Supporting context...' }}"
                                                  form="narrative-form-{{ ceId }}"
                                        >{{ ce_data.data.details_data.get(node_info.details_schema[1].key if node_info.details_schema|length > 1 else 'context', '') }}</textarea>
                                    </div>
                                </div>
                                
                                <!-- MIDDLE: Parent COS -->
                                <div class="col-lg-4">
                                    <div class="ce-tier-card h-100" style="--node-color: {{ node_info.color }}; padding: 0.8rem 1rem;">
                                        <div class="d-flex align-items-center gap-2 mb-1">
                                            <i class="fas fa-crosshairs" style="color: {{ node_info.color }}; font-size: 0.65rem;"></i>
                                            <span class="font-data small tracking-widest" style="color: #64748b; font-size: 0.62rem;">PARENT CONDITION</span>
                                        </div>
                                        <div class="font-body fst-italic text-dark" style="font-size: 0.78rem; line-height: 1.5; max-height: 8em; overflow-y: auto;">{{ cos_content_with_pills | safe }}</div>
                                    </div>
                                </div>

                                <!-- RIGHT: Quick Insights + Init -->
                                <div class="col-lg-3 d-flex flex-column gap-2">
                                    <!-- Quick Metrics -->
                                    <div class="ce-tier-card" style="--node-color: {{ node_info.color }}; padding: 0.6rem 0.8rem;">
                                        <span class="font-data small tracking-widest d-block mb-1" style="color: #64748b; font-size: 0.58rem;">QUICK INSIGHTS</span>
                                        <div class="d-flex flex-wrap gap-1">
                                            {% for collection in ['prerequisites', 'stakeholders', 'assumptions', 'resources'] %}
                                            <span class="badge rounded-pill font-data border bg-white text-muted metric-pill" data-collection="{{ collection }}" style="font-size: 0.58rem; padding: 3px 7px; cursor: pointer;">
                                                <span class="count-badge-inline" data-collection="{{ collection }}">0</span> {{ tab_labels.get(collection, collection) }}
                                            </span>
                                            {% endfor %}
                                        </div>
                                    </div>

                                    <!-- Init Card (hidden if populated) -->
                                    <div class="ce-tier-card text-center flex-grow-1" id="ce-init-state" style="display: none; --node-color: {{ node_info.color }}; background: linear-gradient(160deg, {{ node_info.color }}06, {{ node_info.color }}12); border: 1px dashed {{ node_info.color }}35; padding: 0.6rem;">
                                        <div class="rounded-circle d-inline-flex align-items-center justify-content-center mb-1" style="width: 32px; height: 32px; background: {{ node_info.color }}15;">
                                            <i class="{{ node_info.icon }}" style="color: {{ node_info.color }}; font-size: 0.8rem;"></i>
                                        </div>
                                        <h6 class="font-brand text-dark mb-1" style="font-size: 0.75rem;">Ready to Explore!</h6>
                                        <div class="d-flex gap-1">
                                            <button class="btn btn-sm font-data rounded-pill flex-grow-1 text-white shadow-sm" id="btn-auto-init" style="background: linear-gradient(90deg, {{ node_info.color }}, {{ node_info.color }}dd); font-size: 0.62rem; padding: 3px 6px;">
                                                <i class="fas fa-sparkles me-1"></i> Auto
                                            </button>
                                            <button class="btn btn-sm font-data rounded-pill flex-grow-1 border" id="btn-manual-init" style="color: {{ node_info.color }}; border-color: {{ node_info.color }}60 !important; font-size: 0.62rem; padding: 3px 6px;">
                                                <i class="fas fa-pen me-1"></i> Manual
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- TIER 3: COMPACT STATUS STRIP -->
                            <div class="row g-2">
                                <!-- Dependencies -->
                                <div class="col-md-4">
                                    <div class="ce-tier-card-mini" style="--node-color: {{ node_info.color }};">
                                        <div class="d-flex justify-content-between align-items-center mb-1">
                                            <span class="font-data fw-bold" style="font-size: 0.68rem; color: #475569;"><i class="fas fa-cubes me-1" style="color: {{ node_info.color }};"></i>{{ tab_labels.get('prerequisites', 'PREREQUISITES') | upper }}</span>
                                            <a href="#" class="font-data text-decoration-none btn-jump-tab" data-target="prerequisites" style="font-size: 0.62rem; color: {{ node_info.color }};">+ Add</a>
                                        </div>
                                        <div class="font-body text-muted" id="tier3-prereq-{{ ceId }}" style="font-size: 0.75rem;">No items yet</div>
                                    </div>
                                </div>
                                <!-- Risk Flags -->
                                <div class="col-md-4">
                                    <div class="ce-tier-card-mini" style="--node-color: #ef4444; background: #fef2f2;">
                                        <div class="d-flex justify-content-between align-items-center mb-1">
                                            <span class="font-data fw-bold" style="font-size: 0.68rem; color: #475569;"><i class="fas fa-exclamation-triangle me-1" style="color: #ef4444;"></i>RISK FLAGS</span>
                                            <a href="#" class="font-data text-decoration-none btn-jump-tab" data-target="assumptions" style="font-size: 0.62rem; color: #ef4444;">⚡ Scan</a>
                                        </div>
                                        <div class="font-body text-muted" id="tier3-risk-{{ ceId }}" style="font-size: 0.75rem;">No risks identified</div>
                                    </div>
                                </div>
                                <!-- Progress -->
                                <div class="col-md-4">
                                    <div class="ce-tier-card-mini" style="--node-color: {{ node_info.color }};">
                                        <div class="d-flex justify-content-between align-items-center mb-1">
                                            <span class="font-data fw-bold" style="font-size: 0.68rem; color: #475569;"><i class="fas fa-chart-pie me-1" style="color: {{ node_info.color }};"></i>PROGRESS</span>
                                            <span class="font-data fw-bold" style="font-size: 0.68rem; color: {{ node_info.color }};" id="completion-badge">0%</span>
                                        </div>
                                        <div class="progress mt-1" style="height: 6px; background: #e2e8f0; border-radius: 3px;">
                                            <div class="progress-bar" id="tier3-progress-bar" role="progressbar" style="width: 0%; background: {{ node_info.color }}; border-radius: 3px;"></div>
                                        </div>
                                        <div class="font-data text-muted mt-1" style="font-size: 0.6rem;">
                                            <span id="tier3-progress-text">0/3 milestones</span>
                                        </div>
                                        <!-- Hidden checklist items for JS state tracking -->
                                        <div class="d-none">
                                            <span id="chk-narrative"><i class="status-icon"></i><span class="font-body"></span></span>
                                            <span id="chk-prereq"><i class="status-icon"></i><span class="font-body"></span></span>
                                            <span id="chk-stakeholder"><i class="status-icon"></i><span class="font-body"></span></span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Hidden status card for JS compat -->
                            <div id="ce-status-card" class="d-none"></div>
                        </div>

                        <!-- COLLECTIONS -->
                        {% for collection in ['prerequisites', 'stakeholders', 'assumptions', 'resources'] %}
                        <div class="tab-pane fade ce-tab-pane" id="view-{{ collection }}-{{ ceId }}">
                             <!-- Toolbar -->
                             <div class="px-4 py-3 bg-white border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
                                <div class="d-flex gap-2">
                                    <button class="btn btn-white border font-data px-4 rounded-pill btn-add-item shadow-sm" data-collection="{{ collection }}"><i class="fas fa-plus me-2"></i> Add Manually</button>
                                    <button class="btn font-data px-4 rounded-pill text-white btn-speculate-collection shadow-sm" data-collection="{{ collection }}" style="background: linear-gradient(90deg, {{ node_info.color }}, {{ node_info.color }}dd);">
                                        <i class="fas fa-sparkles me-2"></i> AI Generate
                                    </button>
                                </div>
                                <div class="d-flex gap-3 align-items-center">
                                    <div class="btn-group shadow-sm" role="group" aria-label="View Mode">
                                        <button type="button" class="btn btn-white border px-3 text-muted btn-view-toggle active" data-view="tile" data-collection="{{ collection }}" title="Tile View"><i class="fas fa-th-large"></i></button>
                                        <button type="button" class="btn btn-white border px-3 text-muted btn-view-toggle" data-view="table" data-collection="{{ collection }}" title="Table View"><i class="fas fa-table"></i></button>
                                        <button type="button" class="btn btn-white border px-3 text-muted btn-view-toggle" data-view="constellation" data-collection="{{ collection }}" title="Constellation View"><i class="fas fa-project-diagram"></i></button>
                                    </div>
                                    <input type="text" class="form-control form-control-sm w-auto font-body rounded-pill border" placeholder="Search..." style="max-width: 180px;">
                                </div>
                            </div>
                            <div class="flex-grow-1 p-4 overflow-y-auto collection-container" id="container-{{ collection }}-{{ ceId }}" data-collection="{{ collection }}"></div>
                             
                             <!-- Dynamic Editor -->
                             <div class="collection-editor p-4 bg-white border-top shadow-lg position-absolute bottom-0 w-100 rounded-bottom-4" id="editor-{{ collection }}-{{ ceId }}" style="display:none; z-index: 50;">
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <h5 class="font-brand mb-0">EDIT {{ tab_labels.get(collection, collection)|upper }}</h5>
                                    <button type="button" class="btn-close btn-cancel-edit"></button>
                                </div>
                                <form class="editor-form" data-collection="{{ collection }}">
                                    {% set schema = node_info.get(collection[:-1] + '_schema', []) %}
                                    <div class="row g-3">
                                        {% for field in schema %}
                                        <div class="col-12 {{ 'col-md-6' if field.type != 'textarea' else '' }}">
                                            <label class="font-data text-muted small mb-1">{{ field.label }}</label>
                                            {% if field.type == 'textarea' %}<textarea name="{{ field.key }}" class="form-control bg-light rounded-3" rows="2"></textarea>
                                            {% elif field.type == 'select' %}<select name="{{ field.key }}" class="form-select font-body rounded-3">{% for option in field.options %}<option value="{{ option }}">{{ option }}</option>{% endfor %}</select>
                                            {% elif field.type == 'slider' %}<div class="ce-range-wrap"><input type="range" class="ce-range-input" name="{{ field.key }}" min="0" max="100" step="10"><span class="ce-range-value">50%</span></div>
                                            {% elif field.type == 'toggle' %}<div class="mt-2"><label class="ce-toggle-switch"><input type="checkbox" name="{{ field.key }}"><span class="ce-toggle-slider"></span></label></div>
                                            {% else %}<input type="text" name="{{ field.key }}" class="form-control rounded-3">{% endif %}
                                        </div>
                                        {% endfor %}
                                    </div>
                                    <div class="mt-4 text-end"><button type="submit" class="btn font-data px-4 rounded-pill text-white shadow-sm" style="background: linear-gradient(90deg, {{ node_info.color }}, {{ node_info.color }}dd);">SAVE ENTRY</button></div>
                                </form>
                            </div>
                        </div>
                        {% endfor %}

                        <!-- CRITERIA (Bespoke Tab) -->
                        <div class="tab-pane fade ce-tab-pane" id="view-criteria-{{ ceId }}">
                             <!-- Toolbar -->
                             <div class="px-4 py-3 bg-white border-bottom d-flex justify-content-between align-items-center">
                                <div class="d-flex gap-2">
                                    <button class="btn btn-white border font-data px-4 rounded-pill btn-add-item shadow-sm" data-collection="criteria"><i class="fas fa-plus me-2"></i> Add Criterion</button>
                                    <button class="btn font-data px-4 rounded-pill text-white btn-speculate-collection shadow-sm" data-collection="criteria" style="background: linear-gradient(90deg, {{ node_info.color }}, {{ node_info.color }}dd);">
                                        <i class="fas fa-sparkles me-2"></i> Extract Criteria
                                    </button>
                                </div>
                                <input type="text" class="form-control form-control-sm w-auto font-body rounded-pill border" placeholder="Search..." style="max-width: 180px;">
                            </div>
                            <div class="flex-grow-1 p-4 overflow-y-auto collection-container" id="container-criteria-{{ ceId }}" data-collection="criteria"></div>
                             
                             <!-- Dynamic Editor -->
                             <div class="collection-editor p-4 bg-white border-top shadow-lg position-absolute bottom-0 w-100 rounded-bottom-4" id="editor-criteria-{{ ceId }}" style="display:none; z-index: 50;">
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <h5 class="font-brand mb-0">EDIT CRITERION</h5>
                                    <button type="button" class="btn-close btn-cancel-edit"></button>
                                </div>
                                <form class="editor-form" data-collection="criteria">
                                    <div class="row g-3">
                                        <div class="col-12 col-md-6">
                                            <label class="font-data text-muted small mb-1">Criterion Label</label>
                                            <input type="text" name="label" class="form-control rounded-3" placeholder="e.g. Total Project Cost">
                                        </div>
                                        <div class="col-12 col-md-6">
                                            <label class="font-data text-muted small mb-1">Type</label>
                                            <select name="criterion_type" class="form-select font-body rounded-3">
                                                <option value="Threshold">Threshold (numeric pass/fail)</option>
                                                <option value="Gate">Gate (binary checkpoint)</option>
                                                <option value="Constraint">Constraint (invariant rule)</option>
                                                <option value="Conditional">Conditional (if/then fork)</option>
                                                <option value="Benchmark">Benchmark (external comparison)</option>
                                            </select>
                                        </div>
                                        <!-- Dynamic fields shown based on type -->
                                        <div class="col-12 col-md-4">
                                            <label class="font-data text-muted small mb-1">Operator</label>
                                            <select name="operator" class="form-select font-body rounded-3">
                                                <option value="≤">≤ (at most)</option>
                                                <option value="≥">≥ (at least)</option>
                                                <option value="=">= (exactly)</option>
                                                <option value="≠">≠ (not equal)</option>
                                                <option value="between">between</option>
                                            </select>
                                        </div>
                                        <div class="col-12 col-md-4">
                                            <label class="font-data text-muted small mb-1">Target Value</label>
                                            <input type="text" name="target" class="form-control rounded-3" placeholder="e.g. 50000">
                                        </div>
                                        <div class="col-12 col-md-4">
                                            <label class="font-data text-muted small mb-1">Unit</label>
                                            <input type="text" name="unit" class="form-control rounded-3" placeholder="e.g. $, %, days">
                                        </div>
                                        <div class="col-12 col-md-6">
                                            <label class="font-data text-muted small mb-1">Severity</label>
                                            <select name="severity" class="form-select font-body rounded-3">
                                                <option value="Hard">Hard (non-negotiable)</option>
                                                <option value="Soft">Soft (trade-off allowed)</option>
                                            </select>
                                        </div>
                                        <div class="col-12 col-md-6">
                                            <label class="font-data text-muted small mb-1">Status</label>
                                            <select name="status" class="form-select font-body rounded-3">
                                                <option value="Pending">⏳ Pending</option>
                                                <option value="Pass">✅ Pass</option>
                                                <option value="Fail">❌ Fail</option>
                                                <option value="Blocked">🔒 Blocked</option>
                                                <option value="Compliant">✅ Compliant</option>
                                                <option value="Violated">❌ Violated</option>
                                                <option value="Unresolved">❓ Unresolved</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="mt-4 text-end"><button type="submit" class="btn font-data px-4 rounded-pill text-white shadow-sm" style="background: linear-gradient(90deg, {{ node_info.color }}, {{ node_info.color }}dd);">SAVE CRITERION</button></div>
                                </form>
                            </div>
                        </div>

                        <!-- CONNECTIONS -->
                        <div class="tab-pane fade p-4" id="view-connections-{{ ceId }}">
                            <div class="text-center p-5 opacity-50 mt-4">
                                <i class="fas fa-project-diagram fa-3x mb-3" style="color: {{ node_info.color }};"></i>
                                <h5 class="font-brand text-dark">Constellation View</h5>
                                <p class="small text-muted">Connections will appear here as you link nodes together.</p>
                            </div>
                        </div>

                    </div>
                    </div> <!-- End workspace content -->
                </div>

                <!-- SIDEBAR -->
                <div class="ai-sidebar d-flex flex-column border-start bg-white">
                    <div class="sidebar-persona-header" id="ai-sidebar-header"></div>
                    <div class="p-3 flex-grow-1 overflow-y-auto" id="ai-sidebar-content"></div>
                </div>

            </div>
            <!-- FOOTER -->
            <div class="modal-footer ce-modal-footer border-top" style="background: white;">
                <div class="d-flex align-items-center gap-2 me-auto" id="save-status">
                    <i class="fas fa-circle text-muted" style="font-size: 6px;"></i>
                    <span class="font-data text-muted small">UNSAVED CHANGES</span>
                </div>
                <div class="d-flex gap-2">
                    <button class="btn btn-outline-secondary rounded-pill px-4 font-data" data-bs-dismiss="modal">Done</button>
                    <button class="btn rounded-pill px-4 font-data text-white btn-save-changes shadow-sm" style="background: linear-gradient(90deg, {{ node_info.color }}, {{ node_info.color }}dd);">
                        <i class="fas fa-check me-2"></i> Save {{ ceType.upper() }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>
"""

async def generate_dynamic_modal(ce_type, ce_text, ce_data, node_info, cos_content, ai_generated_data, phase_name, phase_index):
    cos_content_with_pills = replace_ce_tags_with_pills(cos_content)
    
    # --- CRITICAL FIX: Ensure ID is a string before template rendering ---
    # Handle UUID objects or None types safely
    raw_id = ce_data.get('id', 'new_ce')
    safe_ce_id = str(raw_id) if raw_id else 'new_ce'
    
    # Get node-type-specific tab labels
    tab_labels = TAB_LABELS.get(ce_type, TAB_LABELS['Default'])

    return render_template_string(
        BASE_MODAL_TEMPLATE,
        ceId=safe_ce_id,
        ceType=ce_type,
        ce_text=ce_text,
        ce_data=ce_data,
        node_info=node_info,
        cos_content_with_pills=cos_content_with_pills,
        ai_generated_data=ai_generated_data,
        phase_name=phase_name,
        phase_index=phase_index,
        tab_labels=tab_labels
    )