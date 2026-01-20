# system_templates.py
from flask import render_template_string
from system_nodes import SYSTEM_NODES
import datetime

# ==============================================================================
# 1. HORIZON GAUGE (Strict Single-Line Layout)
# ==============================================================================
HORIZON_GAUGE_TEMPLATE = """
<div class="card border-0 shadow-sm mb-4 overflow-visible system-node-card cursor-pointer group"
     onclick="openSystemEditor('{{ id }}', 'HORIZON', '{{ value }}')"
     title="Click to Calibrate Horizon">
    
    <!-- Main Container: Forced Flex Row with Inline Overrides -->
    <div class="d-flex align-items-stretch flex-nowrap w-100" 
         style="height: 80px; display: flex !important; flex-direction: row !important; overflow: visible;">
        
        <!-- COL 1: ICON STRIP (Strict Fixed Width) -->
        <div class="bg-warning bg-opacity-10 d-flex align-items-center justify-content-center border-end" 
             style="width: 72px; min-width: 72px; flex: 0 0 72px;">
            <i class="{{ icon }} fa-lg text-warning group-hover:scale-110 transition-transform"></i>
        </div>
        
        <!-- COL 2: TIMELINE DATA (Fluid Middle) -->
        <div class="position-relative d-flex align-items-center justify-content-between gap-3 px-4" 
             style="flex: 1 1 auto; min-width: 0; overflow: visible;">
            
            <!-- Origin Date -->
            <div class="text-nowrap">
                <div class="font-data text-muted x-small tracking-widest opacity-75 mb-1">ORIGIN</div>
                <div class="font-body fw-bold text-dark small">{{ start_date }}</div>
            </div>

            <!-- The Bar (Takes all remaining space) -->
            <div class="progress rounded-pill flex-grow-1 position-relative mx-3" style="height: 6px; background-color: #f1f5f9; overflow: visible;">
                
                <!-- Fill -->
                <div class="progress-bar rounded-pill position-relative" role="progressbar" 
                     style="width: {{ time_elapsed_percent }}%; background-color: {{ health_color }}; box-shadow: 0 2px 10px {{ health_color }}60;" 
                     aria-valuenow="{{ time_elapsed_percent }}" aria-valuemin="0" aria-valuemax="100">
                     
                     <!-- Current Head Marker -->
                     <div class="position-absolute top-50 translate-middle" style="right: -12px;">
                        <div class="bg-white border border-2 rounded-circle shadow-sm" 
                             style="width: 14px; height: 14px; border-color: {{ health_color }};"></div>
                        
                        <!-- THE PHASE INDICATOR (Floating Badge) -->
                        <div class="position-absolute bottom-100 start-50 translate-middle-x mb-2 text-nowrap" style="z-index: 10;">
                            <span class="badge bg-dark text-white border font-data x-small rounded-pill px-2 shadow-sm py-1">
                                <i class="fas fa-map-marker-alt text-warning me-1"></i> DISCOVERY
                            </span>
                        </div>
                     </div>
                </div>

                <!-- Milestones -->
                <div class="position-absolute top-50 start-20 translate-middle rounded-circle bg-white border border-secondary-subtle" style="width: 6px; height: 6px; left: 20%;"></div>
                <div class="position-absolute top-50 start-40 translate-middle rounded-circle bg-white border border-secondary-subtle" style="width: 6px; height: 6px; left: 40%;"></div>
                <div class="position-absolute top-50 start-60 translate-middle rounded-circle bg-white border border-secondary-subtle" style="width: 6px; height: 6px; left: 60%;"></div>
                <div class="position-absolute top-50 start-80 translate-middle rounded-circle bg-white border border-secondary-subtle" style="width: 6px; height: 6px; left: 80%;"></div>
            </div>

            <!-- Target Date -->
            <div class="text-end text-nowrap">
                <div class="font-data text-muted x-small tracking-widest opacity-75 mb-1">REALIZATION</div>
                <div class="font-body fw-bold text-dark small">{{ target_date_display }}</div>
            </div>
        </div>

        <!-- COL 3: COUNTDOWN (Strict Fixed Width) -->
        <div class="border-start bg-light d-flex flex-column align-items-center justify-content-center" 
             style="width: 100px; min-width: 100px; flex: 0 0 100px;">
            <div class="font-data text-muted x-small tracking-widest mb-1">WINDOW</div>
            <div class="font-brand text-dark fs-3 lh-1">{{ days_remaining }}</div>
            <div class="font-data text-muted x-small mt-1 opacity-75">DAYS</div>
        </div>

    </div>
</div>
"""

# ==============================================================================
# 2. SIDEBAR STACK (Refined "Monolith" Style)
# ==============================================================================
SYSTEM_SIDEBAR_STACK_TEMPLATE = """
<div class="d-flex flex-column gap-2 mt-4" id="system-anchor-stack">
    
    <div class="d-flex align-items-center justify-content-between px-1 mb-2">
        <span class="font-data text-white-50 small tracking-widest opacity-75">SYSTEM PHYSICS</span>
        <i class="fas fa-cog text-white-50 cursor-pointer hover-text-white transition-colors" title="Configure System"></i>
    </div>
    
    {% for param in system_params %}
    <!-- SYSTEM PILL (Matches Goal Selection "Precision" Pills) -->
    <div class="system-pill-static"
         onclick="openSystemEditor('{{ param.id }}', '{{ param.type }}', '{{ param.value }}')"
         title="Calibrate {{ param.label }}">
        
        <!-- Icon -->
        <div class="pill-icon-box" style="background-color: {{ param.color }};">
            <i class="{{ param.icon }}"></i>
        </div>
        
        <!-- Text -->
        <div class="pill-content">
            <div class="pill-label">{{ param.label }}</div>
            <div class="pill-value text-truncate">{{ param.value }}</div>
        </div>

        <!-- Edit Hint -->
        <div class="pill-action">
            <i class="fas fa-sliders-h"></i>
        </div>
    </div>
    {% endfor %}

    <button class="btn btn-outline-light border-dashed w-100 rounded-pill font-data x-small py-2 mt-3 opacity-50 hover-opacity-100"
            onclick="openSystemEditor('new', '', '')">
        <i class="fas fa-plus me-2"></i> ADD CONSTRAINT
    </button>
</div>
"""

# ==============================================================================
# 3. CAROUSEL MODAL (The "Calibration Wizard")
# ==============================================================================
SYSTEM_EDITOR_MODAL_TEMPLATE = """
<div class="modal fade" id="systemConfigModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-xl">
        <div class="modal-content border-0 rounded-4 shadow-2xl overflow-visible">
            
            <!-- Nav Arrows -->
            <div class="sys-nav-arrow sys-nav-prev" onclick="navigateSystemNode(-1)"><i class="fas fa-chevron-left fa-lg"></i></div>
            <div class="sys-nav-arrow sys-nav-next" onclick="navigateSystemNode(1)"><i class="fas fa-chevron-right fa-lg"></i></div>

            <div class="row g-0" style="min-height: 600px;">
                
                <!-- LEFT: Identity & State (Visualizer) -->
                <div class="col-md-5 sys-modal-left p-5" id="sys-identity-panel" style="background-color: #333; transition: background-color 0.5s;">
                    <div class="sys-modal-texture"></div>
                    
                    <div class="position-relative z-1 h-100 d-flex flex-column justify-content-between">
                        <!-- Header -->
                        <div>
                            <div class="bg-white bg-opacity-25 rounded-3 d-flex align-items-center justify-content-center mb-4 shadow-sm backdrop-blur" 
                                 style="width: 64px; height: 64px;">
                                <i class="fas fa-cube fa-2x text-white" id="sys-display-icon"></i>
                            </div>
                            <h2 class="font-brand text-white display-6 mb-2" id="sys-display-label">LOADING...</h2>
                            <div class="font-data text-white-50 small letter-spacing-2 mb-5">SYSTEM NODE CONFIGURATION</div>
                        </div>

                        <!-- THE STATE MONITOR (Bespoke Visualizer) -->
                        <div class="flex-grow-1 d-flex flex-column justify-content-center">
                             <div class="font-data text-white-50 x-small tracking-widest mb-2">CURRENT STATE VECTOR</div>
                             <!-- JS populates this based on node type (Stack vs Gauge vs Pill) -->
                             <div id="sys-visualizer-container" class="w-100"></div>
                        </div>

                        <!-- Pagination -->
                        <div class="d-flex justify-content-between align-items-end mt-4">
                            <div class="font-data text-white-50 small" id="sys-counter">CARD 1 / X</div>
                            <div class="sys-pagination" id="sys-dots-container"></div>
                        </div>
                    </div>
                </div>

                <!-- RIGHT: Ontology & Config (The Context) -->
                <div class="col-md-7 bg-white p-5 d-flex flex-column">
                    
                    <!-- Header -->
                    <div class="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4">
                        <div class="font-data text-muted small tracking-widest">
                            <i class="fas fa-sliders-h me-2"></i> CALIBRATION CONSOLE
                        </div>
                        <div class="d-flex gap-2">
                             <span class="badge bg-light text-muted border font-data rounded-pill px-3" id="sys-status-badge">PENDING</span>
                        </div>
                    </div>
                    
                    <!-- Scrollable Area -->
                    <div class="flex-grow-1 overflow-y-auto pe-2 custom-scrollbar d-flex flex-column gap-4">
                        
                        <!-- 1. DEFINITION CARD (Context) -->
                        <div class="bg-light rounded-3 p-4 border border-light-subtle">
                             <div class="d-flex gap-3">
                                <div class="mt-1"><i class="fas fa-info-circle text-primary"></i></div>
                                <div>
                                    <h6 class="font-data text-dark small mb-1">ONTOLOGICAL DEFINITION</h6>
                                    <p class="font-body text-secondary small mb-2" id="sys-display-desc" style="line-height: 1.5;">Description...</p>
                                    <div class="mt-2 pt-2 border-top border-light-subtle">
                                        <span class="font-data x-small text-muted uppercase me-1">Tip:</span>
                                        <span class="font-body x-small text-muted fst-italic" id="sys-display-guide">...</span>
                                    </div>
                                    <!-- Examples Container (New) -->
                                    <div id="sys-examples-container" class="d-flex flex-wrap gap-2 mt-3 pt-2 border-top border-dashed"></div>
                                </div>
                             </div>
                        </div>

                        <!-- 2. PROTOCOL TOGGLE -->
                        <div class="sys-protocol-toggle">
                            <button type="button" class="sys-protocol-btn active" id="mode-specify" onclick="setProtocolMode('SPECIFY')">
                                <i class="fas fa-pen-to-square me-2"></i> Specify
                            </button>
                            <button type="button" class="sys-protocol-btn" id="mode-speculate" onclick="setProtocolMode('SPECULATE')">
                                <i class="fas fa-wand-magic-sparkles me-2"></i> Speculate
                            </button>
                        </div>

                        <!-- 3. ACTIVE INPUT AREA (Bespoke) -->
                        <form id="system-node-form">
                            <input type="hidden" name="param_id" id="sys-param-id">
                            <input type="hidden" name="sys_type" id="sys-param-type">
                            <!-- JS Injects the correct inputs here -->
                            <div id="sys-input-container" class="mb-4"></div>
                            
                            <!-- 4. CONFIGURATION (Hard/Soft) -->
                            <div class="row g-3 mb-3">
                                <div class="col-6">
                                    <div class="border rounded-3 p-3 cursor-pointer hover-shadow transition-all selected-mode-card h-100" 
                                         id="constraint-hard" onclick="setConstraintMode('HARD')">
                                        <div class="font-data small text-dark mb-1"><i class="fas fa-lock me-2 text-primary"></i> HARD CONSTRAINT</div>
                                        <div class="text-muted x-small">Strict adherence.</div>
                                    </div>
                                </div>
                                <div class="col-6">
                                    <div class="border rounded-3 p-3 cursor-pointer hover-shadow transition-all opacity-50 h-100" 
                                         id="constraint-soft" onclick="setConstraintMode('SOFT')">
                                        <div class="font-data small text-dark mb-1"><i class="fas fa-unlock me-2"></i> SOFT GUIDELINE</div>
                                        <div class="text-muted x-small">Trade-offs permitted.</div>
                                    </div>
                                </div>
                                <input type="hidden" name="constraint_mode" id="sys-constraint-input" value="HARD">
                            </div>

                            <!-- Rationale -->
                            <div>
                                <label class="font-data text-muted x-small mb-1">RATIONALE</label>
                                <textarea name="rationale" id="sys-rationale" class="form-control bg-light border-0 small" rows="2" placeholder="Why is this constraint set?"></textarea>
                            </div>
                        </form>

                    </div>
                    
                    <!-- Footer -->
                    <div class="d-flex justify-content-end gap-3 mt-4 pt-3 border-top">
                        <button type="button" class="btn btn-light rounded-pill font-data px-4" data-bs-dismiss="modal">CANCEL</button>
                        <button type="button" class="btn btn-primary rounded-pill font-data px-5 shadow-lg" onclick="submitSystemForm()">
                            <i class="fas fa-save me-2"></i> COMMIT ANCHOR
                        </button>
                    </div>

                </div>
            </div>
        </div>
    </div>
</div>
"""

# ==============================================================================
# 4. RENDER FUNCTIONS
# ==============================================================================

def render_command_deck(system_params):
    """
    Orchestrates the Command Deck.
    Splits Horizon (Time) from the Anchors (Identity/Physics).
    """
    horizon_node = next((p for p in system_params if p['type'] == 'HORIZON'), None)
    other_params = [p for p in system_params if p['type'] != 'HORIZON']

    # Enrich generic params with Icon/Color from SYSTEM_NODES
    enriched_params = []
    for p in other_params:
        config = SYSTEM_NODES.get(p['type'], SYSTEM_NODES['OPERATOR'])
        enriched_params.append({
            **p,
            "icon": config['icon'],
            "color": config['color'],
            "label": config['label']
        })

    html_payload = {
        'horizon_html': "",
        'sidebar_html': ""
    }
    
    # 1. Render Horizon
    if horizon_node:
        import datetime
        # Logic: In real app, fetch creation_date from DB. For MVP, assume -7 days start.
        start_date = (datetime.date.today() - datetime.timedelta(days=7))
        val = horizon_node.get('value')
        
        # Display Logic
        target_display = val or "Unset"
        percent = 15 # Default MVP visual
        days_rem_str = "--" # Default
        
        # Try parsing date for real math
        try:
            if val and '-' in val:
                target_date = datetime.datetime.strptime(val, '%Y-%m-%d').date()
                total_days = (target_date - start_date).days
                days_left = (target_date - datetime.date.today()).days
                if total_days > 0:
                    percent = 100 - int((days_left / total_days) * 100)
                # Cap percentage between 0 and 100 for visual sanity
                percent = max(0, min(100, percent))
                days_rem_str = str(days_left)
                target_display = target_date.strftime('%b %d, %Y')
        except:
            pass

        # Color Logic based on health/time
        if percent > 90: health = "#ef5350" # Red
        elif percent > 75: health = "#ffa726" # Amber
        else: health = "#26c6da" # Teal

        html_payload['horizon_html'] = render_template_string(HORIZON_GAUGE_TEMPLATE, 
            start_date=start_date.strftime('%b %d, %Y'), 
            target_date_display=target_display,
            time_elapsed_percent=percent, 
            health_color=health,
            days_remaining=days_rem_str,
            value=val,
            id=horizon_node.get('id'),
            icon=SYSTEM_NODES['HORIZON']['icon']
        )
    
    # 2. Render Sidebar
    html_payload['sidebar_html'] = render_template_string(SYSTEM_SIDEBAR_STACK_TEMPLATE, system_params=enriched_params)
    
    return html_payload

def render_system_config_modal():
    return render_template_string(SYSTEM_EDITOR_MODAL_TEMPLATE, nodes=SYSTEM_NODES)

# ==============================================================================
# 5. GOVERNANCE WIDGET (The AI Clamps)
# ==============================================================================
GOVERNANCE_WIDGET_TEMPLATE = """
<div class="governance-console mb-4 fade-in">
    <div class="row g-0">
        <!-- OMBUD (Constraints) -->
        <div class="col-md-6 border-end border-light-subtle">
            <div class="p-3 d-flex align-items-start gap-3">
                <div class="gov-icon-box ombud">
                    <i class="fas fa-balance-scale"></i>
                </div>
                <div>
                    <div class="font-data x-small text-muted tracking-widest mb-1">OMBUD OVERSIGHT</div>
                    <div class="d-flex align-items-center gap-2 mb-1">
                        <span class="badge bg-success-subtle text-success border border-success-subtle font-data" id="ombud-status">COMPLIANT</span>
                        <span class="text-muted x-small" id="ombud-timestamp">Synced Just Now</span>
                    </div>
                    <p class="font-body x-small text-secondary mb-0" id="ombud-msg">
                        System constraints (Budget, Horizon) are aligned with projected velocity. No Charter violations detected.
                    </p>
                </div>
            </div>
        </div>

        <!-- ADVOCATE (Harmony) -->
        <div class="col-md-6">
            <div class="p-3 d-flex align-items-start gap-3">
                <div class="gov-icon-box advocate">
                    <i class="fas fa-lightbulb"></i>
                </div>
                <div>
                    <div class="font-data x-small text-muted tracking-widest mb-1">ADVOCATE INSIGHT</div>
                    <p class="font-body x-small text-dark fw-medium mb-0" id="advocate-msg">
                        <i class="fas fa-quote-left text-muted me-1 opacity-50"></i>
                        Consider creating a public-facing "Legacy" milestone early in the Engagement phase to build momentum before major resource expenditure.
                    </p>
                    <button class="btn btn-link p-0 text-decoration-none font-data x-small mt-1 text-primary" onclick="triggerGovernanceRefresh()">
                        <i class="fas fa-sync-alt me-1"></i> RE-SYNTHESIZE
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>
"""