# ce_templates.py
from flask import render_template_string
from utilities import replace_ce_tags_with_pills

BASE_MODAL_TEMPLATE = """
<div class="modal fade ceModal" id="ceModal-{{ ceId }}" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-fullscreen-xl-down modal-xl" role="document">
        <div class="modal-content ce-app-shell" data-phase-index="{{ phase_index }}" style="--phase-color: var(--phase-{{ phase_index }});">
            
            <!-- HEADER: SYSTEM IDENTITY -->
            <div class="ce-modal-header">
                <div class="node-icon-box"><i class="{{ node_info.icon }}"></i></div>
                <div class="header-text-block ms-3 flex-grow-1">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h2 class="modal-title ce-title mb-0 text-white leading-tight">{{ ceType.replace('_', ' ').upper() }}</h2>
                            <div class="ce-header-metadata text-white opacity-75 small">// {{ phase_name.upper() }} PHASE <span class="mx-2">|</span> ID: {{ ceId.split('-')[0].upper() }}</div>
                        </div>
                        <!-- INTELLIGENCE BUTTON -->
                        <div class="d-flex gap-2">
                             <button class="btn btn-glass font-data d-none d-md-flex align-items-center gap-2" id="speculate-sidebar-toggle">
                                <i class="fas fa-brain"></i> ENGINE
                            </button>
                            <div class="vr bg-white opacity-50 mx-2" style="height: 24px;"></div>
                            <button type="button" class="btn-close-custom" data-bs-dismiss="modal"><i class="fas fa-times"></i></button>
                        </div>
                    </div>
                </div>
                <div class="header-ghost-icon"><i class="{{ node_info.icon }}"></i></div>
            </div>

            <!-- MICRO-TIMELINE (THE 4 QUADRANTS) -->
            <div class="ce-micro-timeline bg-white border-bottom px-4 py-2">
                <div class="row align-items-center g-0">
                    <div class="col-auto me-3 font-data small text-muted tracking-widest">EXECUTION PROTOCOL:</div>
                    <div class="col">
                        <div class="d-flex w-100 gap-1">
                            <div class="milestone-segment active" id="ms-q1"><div class="ms-bar"></div><span class="ms-label">DEFINITION</span></div>
                            <div class="milestone-segment" id="ms-q2"><div class="ms-bar"></div><span class="ms-label">ALIGNMENT</span></div>
                            <div class="milestone-segment" id="ms-q3"><div class="ms-bar"></div><span class="ms-label">EVIDENCE</span></div>
                            <div class="milestone-segment" id="ms-q4"><div class="ms-bar"></div><span class="ms-label">VALIDATION</span></div>
                        </div>
                    </div>
                    <div class="col-auto ms-3">
                        <span class="badge rounded-pill bg-light text-dark border" id="milestone-status">Q1: DRAFTING</span>
                    </div>
                </div>
            </div>

            <!-- WORKSPACE -->
            <div class="modal-body ce-workspace-body p-0 d-flex">
                
                <!-- LEFT COLUMN -->
                <div class="ce-main-column">
                    <!-- NAVIGATION -->
                    <ul class="nav nav-tabs ce-nav-tabs pt-2 px-4 bg-white" role="tablist">
                        <li class="nav-item"><button class="nav-link font-data active" data-bs-toggle="tab" data-bs-target="#view-overview-{{ ceId }}">OVERVIEW</button></li>
                        {% for collection in ['prerequisites', 'stakeholders', 'assumptions', 'resources'] %}
                        <li class="nav-item"><button class="nav-link font-data" data-bs-toggle="tab" data-bs-target="#view-{{ collection }}-{{ ceId }}">{{ collection|upper }} <span class="badge rounded-pill bg-light text-dark border ms-1 count-badge" data-collection="{{ collection }}">0</span></button></li>
                        {% endfor %}
                        <li class="nav-item ms-auto"><button class="nav-link font-data text-muted" data-bs-toggle="tab" data-bs-target="#view-connections-{{ ceId }}"><i class="fas fa-project-diagram"></i></button></li>
                    </ul>

                    <div class="ce-app-content tab-content bg-surface-screen">
                        
                        <!-- 1. OVERVIEW DASHBOARD (Bento) -->
                        <div class="tab-pane fade show active p-4" id="view-overview-{{ ceId }}">
                            <div class="row g-4 h-100">
                                
                                <!-- HERO: Editable Narrative Context -->
                                <div class="col-lg-8 d-flex flex-column">
                                    <div class="system-hero-card flex-grow-1 p-0 position-relative overflow-hidden">
                                        <div class="scan-line" style="opacity:0;"></div> 
                                        <div class="hero-ghost-icon"><i class="{{ node_info.icon }}"></i></div>

                                        <div class="d-flex flex-column h-100 position-relative z-2">
                                            <div class="p-4 pb-0 d-flex justify-content-between align-items-start">
                                                <div class="font-data text-white-50 small letter-spacing-2">STRATEGIC CONTEXT</div>
                                                
                                                <!-- BRANDING FIX: SPECULATE -->
                                                <button class="btn btn-sm btn-glass text-white btn-enhance-field" data-field="summary">
                                                    <i class="fas fa-brain me-2"></i> SPECULATE
                                                </button>
                                            </div>
                                            
                                            <!-- The Editable Area -->
                                            <div class="flex-grow-1 p-4">
                                                <form id="narrative-form-{{ ceId }}" class="h-100">
                                                    <textarea name="summary" 
                                                              class="form-control bg-transparent border-0 text-white font-body fs-5 h-100 p-0 shadow-none hero-textarea" 
                                                              style="resize: none; line-height: 1.6;" 
                                                              placeholder="Describe the strategic function of this node..."
                                                    >{{ ce_data.data.details_data.get('summary', '') }}</textarea>
                                                </form>
                                            </div>
                                            
                                            <!-- Footer -->
                                            <div class="px-4 py-3 bg-black bg-opacity-10 border-top border-white border-opacity-10 d-flex align-items-center gap-3">
                                                 <i class="fas fa-info-circle text-white-50"></i>
                                                 <span class="font-data small text-white-50">Direct input overrides generative model.</span>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Source COS -->
                                    <div class="mt-4 card border-0 shadow-sm">
                                        <div class="card-body p-4">
                                            <div class="d-flex align-items-center gap-2 mb-2">
                                                <i class="fas fa-crosshairs text-secondary"></i>
                                                <span class="font-data text-muted small">SOURCE REQUIREMENT</span>
                                            </div>
                                            <div class="font-body fst-italic text-dark">{{ cos_content_with_pills | safe }}</div>
                                        </div>
                                    </div>
                                </div>

                                <!-- RIGHT METRICS -->
                                <div class="col-lg-4 d-flex flex-column gap-3">
                                    <!-- Confidence -->
                                    <div class="card border-0 shadow-sm">
                                        <div class="card-body text-center p-4">
                                            <span class="font-data text-muted small">COMPLETION CONFIDENCE</span>
                                            <div class="display-3 font-brand text-dark my-2" id="confidence-score-display">0%</div>
                                            <!-- Sparkline -->
                                            <div class="d-flex justify-content-center gap-1 opacity-50" style="height: 10px;">
                                                <div class="bg-success w-1 rounded" style="height:40%"></div>
                                                <div class="bg-success w-1 rounded" style="height:60%"></div>
                                                <div class="bg-success w-1 rounded" style="height:30%"></div>
                                                <div class="bg-success w-1 rounded" style="height:80%"></div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Logic Stream -->
                                    <div class="card border-0 shadow-sm flex-grow-1">
                                        <div class="card-header bg-white border-bottom">
                                            <span class="font-data small text-danger"><i class="fas fa-bolt me-2"></i>CRITICAL SIGNALS</span>
                                        </div>
                                        <div class="card-body p-0 position-relative overflow-y-auto" id="overview-logic-stream" style="max-height: 200px;">
                                            <!-- Injected via JS -->
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- COLLECTIONS -->
                        {% for collection in ['prerequisites', 'stakeholders', 'assumptions', 'resources'] %}
                        <div class="tab-pane fade d-flex flex-column h-100" id="view-{{ collection }}-{{ ceId }}">
                             <!-- Toolbar -->
                             <div class="px-4 py-3 bg-white border-bottom d-flex justify-content-between align-items-center">
                                <div class="btn-group shadow-sm">
                                    <button class="btn btn-white font-data px-4 btn-add-item" data-collection="{{ collection }}"><i class="fas fa-plus me-2"></i> MANUAL</button>
                                    <!-- BRANDING FIX: SPECULATE -->
                                    <button class="btn btn-white font-data px-4 text-primary btn-speculate-collection" data-collection="{{ collection }}">
                                        <i class="fas fa-brain me-2"></i> SPECULATE
                                    </button>
                                </div>
                                <input type="text" class="form-control form-control-sm w-auto font-body" placeholder="Filter...">
                            </div>
                            <div class="flex-grow-1 p-4 overflow-y-auto collection-container" id="container-{{ collection }}-{{ ceId }}" data-collection="{{ collection }}"></div>
                             
                             <!-- Dynamic Editor -->
                             <div class="collection-editor p-4 bg-white border-top shadow-lg position-absolute bottom-0 w-100" id="editor-{{ collection }}-{{ ceId }}" style="display:none; z-index: 50;">
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <h5 class="font-brand mb-0">EDIT {{ collection[:-1]|upper }}</h5>
                                    <button type="button" class="btn-close btn-cancel-edit"></button>
                                </div>
                                <form class="editor-form" data-collection="{{ collection }}">
                                    {% set schema = node_info.get(collection[:-1] + '_schema', []) %}
                                    <div class="row g-3">
                                        {% for field in schema %}
                                        <div class="col-12 {{ 'col-md-6' if field.type != 'textarea' else '' }}">
                                            <label class="font-data text-muted small mb-1">{{ field.label }}</label>
                                            {% if field.type == 'textarea' %}<textarea name="{{ field.key }}" class="form-control bg-light" rows="2"></textarea>
                                            {% elif field.type == 'select' %}<select name="{{ field.key }}" class="form-select font-body">{% for option in field.options %}<option value="{{ option }}">{{ option }}</option>{% endfor %}</select>
                                            {% elif field.type == 'slider' %}<div class="ce-range-wrap"><input type="range" class="ce-range-input" name="{{ field.key }}" min="0" max="100" step="10"><span class="ce-range-value">50%</span></div>
                                            {% elif field.type == 'toggle' %}<div class="mt-2"><label class="ce-toggle-switch"><input type="checkbox" name="{{ field.key }}"><span class="ce-toggle-slider"></span></label></div>
                                            {% else %}<input type="text" name="{{ field.key }}" class="form-control">{% endif %}
                                        </div>
                                        {% endfor %}
                                    </div>
                                    <div class="mt-4 text-end"><button type="submit" class="btn btn-success font-data px-4 rounded-pill">SAVE ENTRY</button></div>
                                </form>
                            </div>
                        </div>
                        {% endfor %}

                        <!-- CONNECTIONS -->
                        <div class="tab-pane fade p-4" id="view-connections-{{ ceId }}">
                            <div class="text-center p-5 text-muted"><i class="fas fa-project-diagram fa-3x mb-3 opacity-25"></i><h5 class="font-brand">VECTOR MAP</h5><p class="small">No connections yet.</p></div>
                        </div>

                    </div>
                </div>

                <!-- SIDEBAR -->
                <div class="ai-sidebar d-flex flex-column border-start bg-white">
                    <div class="sidebar-persona-header" id="ai-sidebar-header"></div>
                    <div class="p-3 flex-grow-1 overflow-y-auto" id="ai-sidebar-content"></div>
                </div>

            </div>
            <!-- FOOTER -->
            <div class="modal-footer ce-modal-footer"><div class="font-data text-muted small me-auto" id="save-status">STATUS: UNSAVED</div><div class="d-flex gap-2"><button class="btn btn-outline-secondary rounded-pill px-4 font-data" data-bs-dismiss="modal">EXIT</button><button class="btn btn-primary rounded-pill px-4 font-data btn-save-changes">SAVE {{ ceType.upper() }}</button></div></div>
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

    return render_template_string(
        BASE_MODAL_TEMPLATE,
        ceId=safe_ce_id,  # Use the safe string version
        ceType=ce_type,
        ce_text=ce_text,
        ce_data=ce_data,
        node_info=node_info,
        cos_content_with_pills=cos_content_with_pills,
        ai_generated_data=ai_generated_data,
        phase_name=phase_name,
        phase_index=phase_index
    )