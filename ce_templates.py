# ce_templates.py
from flask import render_template_string
from utilities import replace_ce_tags_with_pills

BASE_MODAL_TEMPLATE = """
<div class="modal fade ceModal" id="ceModal-{{ ceId }}" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-fullscreen-xl-down modal-xl" role="document">
        <div class="modal-content ce-app-shell" data-phase-index="{{ phase_index }}" style="--phase-color: var(--phase-{{ phase_index }});">
            
            <!-- HEADER (System Identity) -->
            <div class="ce-modal-header">
                <div class="node-icon-box">
                    <i class="{{ node_info.icon }}"></i>
                </div>
                <div class="header-text-block">
                    <h2 class="modal-title ce-title mb-0 text-white leading-tight">
                        {{ ceType.replace('_', ' ').upper() }}
                    </h2>
                    <div class="ce-header-metadata text-white opacity-75 small">
                        // {{ phase_name.upper() }} PHASE <span class="mx-2">|</span> ID: {{ ceId.split('-')[0].upper() }}
                    </div>
                </div>
                <div class="d-flex align-items-center gap-3 text-white position-relative" style="z-index:10;">
                     <button class="btn btn-glass font-data d-none d-md-flex align-items-center gap-2" id="speculate-sidebar-toggle" title="Toggle Intelligence">
                        <i class="fas fa-brain"></i> ENGINE
                    </button>
                    <div class="vr bg-white opacity-50 mx-2" style="height: 24px;"></div>
                    <button type="button" class="btn-close-custom" data-bs-dismiss="modal" aria-label="Close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="header-ghost-icon">
                    <i class="{{ node_info.icon }}"></i>
                </div>
            </div>

            <!-- READINESS BAR -->
            <div class="progress-bar-container">
                <div class="d-flex justify-content-between align-items-center mb-1" style="line-height:1;">
                    <span class="font-data small text-muted" style="font-size: 0.65rem; letter-spacing: 1px;">ANALYSIS DEPTH</span>
                    <span id="ce-progress-label" class="font-data small fw-bold text-muted">0%</span>
                </div>
                <div class="progress" style="height: 4px;">
                    <div id="ce-progress-bar" class="progress-bar" role="progressbar" style="width: 0%"></div>
                </div>
            </div>

            <!-- WORKSPACE -->
            <div class="modal-body ce-workspace-body p-0 d-flex">
                
                <!-- LEFT COLUMN -->
                <div class="ce-main-column">
                    <ul class="nav nav-tabs ce-nav-tabs pt-2 px-4 bg-white" role="tablist">
                        <li class="nav-item"><button class="nav-link font-data active" data-bs-toggle="tab" data-bs-target="#view-overview-{{ ceId }}">OVERVIEW</button></li>
                        <li class="nav-item"><button class="nav-link font-data" data-bs-toggle="tab" data-bs-target="#view-narrative-{{ ceId }}">NARRATIVE</button></li>
                        
                        {% for collection in ['prerequisites', 'stakeholders', 'assumptions', 'resources'] %}
                        <li class="nav-item">
                            <button class="nav-link font-data" data-bs-toggle="tab" data-bs-target="#view-{{ collection }}-{{ ceId }}">
                                {{ collection|upper }} 
                                <span class="badge rounded-pill bg-light text-dark border ms-1 count-badge" data-collection="{{ collection }}">0</span>
                            </button>
                        </li>
                        {% endfor %}
                        
                        <li class="nav-item ms-auto"><button class="nav-link font-data text-muted" data-bs-toggle="tab" data-bs-target="#view-connections-{{ ceId }}"><i class="fas fa-project-diagram"></i></button></li>
                    </ul>

                    <!-- CONTENT AREA -->
                    <div class="ce-app-content tab-content flex-grow-1 overflow-y-auto bg-surface-screen position-relative">
                        <div class="bg-technical-grid position-absolute top-0 start-0 w-100 h-100" style="pointer-events: none; z-index: 0;"></div>
                        
                        <div class="position-relative p-4" style="z-index: 1;">
                            
                            <!-- 1. OVERVIEW -->
                            <div class="tab-pane fade show active" id="view-overview-{{ ceId }}">
                                <div class="row g-4">
                                    <div class="col-lg-8">
                                        <div class="system-status-card">
                                            <div class="status-ghost"><i class="{{ node_info.icon }}"></i></div>
                                            <div class="scan-overlay" style="display:none;"></div>
                                            <div class="font-data text-white-50 small mb-2 letter-spacing-2">SYSTEM STATUS</div>
                                            <div class="status-card-value text-white display-4 font-brand mb-4 text-shadow-sm">INITIALIZED</div>
                                            <div class="p-3 rounded bg-white bg-opacity-10 border border-white border-opacity-25 backdrop-blur">
                                                <div class="d-flex gap-3">
                                                    <i class="fas fa-info-circle text-white mt-1"></i>
                                                    <div>
                                                        <div class="font-data text-white small mb-1">CONTEXTUAL INSIGHT</div>
                                                        <p class="font-body text-white mb-0 small opacity-90">
                                                            {{ ai_generated_data.contextual_description or 'System standby. Speculation engine ready.' }}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-lg-4">
                                        <div class="card metric-card border-0 shadow-sm h-100">
                                            <div class="card-body d-flex flex-column justify-content-center text-center p-4">
                                                <div class="font-data text-muted small mb-2">RESOURCE DENSITY</div>
                                                <div class="display-2 font-brand text-secondary resource-counter">0</div>
                                            </div>
                                            <div class="card-footer bg-light border-top-0 text-center p-3">
                                                <span class="badge bg-success font-data"><span id="verified-counter">0</span> VERIFIED</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="mt-4 card border-0 shadow-sm">
                                    <div class="card-body p-4">
                                        <h6 class="font-data text-muted small mb-3">SOURCE CONDITION PROTOCOL</h6>
                                        <div class="font-body fst-italic text-dark fs-5">{{ cos_content_with_pills | safe }}</div>
                                    </div>
                                </div>
                            </div>

                            <!-- 2. NARRATIVE -->
                            <div class="tab-pane fade" id="view-narrative-{{ ceId }}">
                                <div class="details-form-container mx-auto" style="max-width: 900px;">
                                    <form id="narrative-form-{{ ceId }}">
                                    {% for field in node_info.details_schema %}
                                    <div class="mb-5">
                                        <div class="d-flex justify-content-between align-items-end mb-2 border-bottom pb-2">
                                            <label class="font-data text-dark h5 mb-0">{{ field.label }}</label>
                                            <button type="button" class="btn btn-sm btn-link text-decoration-none font-data text-primary btn-enhance-field" data-field="{{ field.key }}"><i class="fas fa-magic me-1"></i> ENHANCE</button>
                                        </div>
                                        <textarea name="{{ field.key }}" class="form-control border-0 bg-white shadow-sm p-4 font-body fs-6" rows="5" placeholder="Drafting strategy...">{{ ce_data.data.details_data.get(field.key, '') }}</textarea>
                                    </div>
                                    {% endfor %}
                                    </form>
                                </div>
                            </div>

                            <!-- 3-6. COLLECTIONS -->
                            {% for collection in ['prerequisites', 'stakeholders', 'assumptions', 'resources'] %}
                            <div class="tab-pane fade d-flex flex-column h-100" id="view-{{ collection }}-{{ ceId }}">
                                <div class="d-flex justify-content-between align-items-center mb-4">
                                    <div class="btn-group shadow-sm">
                                        <button class="btn btn-white font-data px-4 btn-add-item" data-collection="{{ collection }}"><i class="fas fa-plus me-2 text-muted"></i> MANUAL</button>
                                        <button class="btn btn-white font-data px-4 text-primary btn-speculate-collection" data-collection="{{ collection }}"><i class="fas fa-brain me-2"></i> AUTO-GEN</button>
                                    </div>
                                    <input type="text" class="form-control w-auto border-0 shadow-sm font-body" placeholder="Search {{ collection }}...">
                                </div>
                                <div class="collection-container" id="container-{{ collection }}-{{ ceId }}" data-collection="{{ collection }}"></div>
                                
                                <!-- EDITOR (Hidden) -->
                                <div class="collection-editor p-4 bg-white border-top shadow-lg position-absolute bottom-0 start-0 w-100" id="editor-{{ collection }}-{{ ceId }}" style="display:none; z-index: 50;">
                                    <div class="d-flex justify-content-between align-items-center mb-3">
                                        <h5 class="font-brand">NEW ENTRY</h5>
                                        <button type="button" class="btn-close btn-cancel-edit"></button>
                                    </div>
                                    <form class="editor-form" data-collection="{{ collection }}">
                                        {% set schema_key = collection[:-1] + '_schema' %} 
                                        {% set schema = node_info.get(schema_key, []) %}
                                        <div class="row g-3">
                                            {% for field in schema %}
                                            <div class="col-12 {{ 'col-md-6' if field.type != 'textarea' else '' }}">
                                                <label class="font-data text-muted small mb-1">{{ field.label }}</label>
                                                {% if field.type == 'textarea' %}
                                                    <textarea name="{{ field.key }}" class="form-control bg-light" rows="2"></textarea>
                                                {% elif field.type == 'select' %}
                                                    <select name="{{ field.key }}" class="form-select font-body">{% for option in field.options %}<option value="{{ option }}">{{ option }}</option>{% endfor %}</select>
                                                {% elif field.type == 'slider' %}
                                                    <div class="ce-range-wrap"><input type="range" class="ce-range-input" name="{{ field.key }}" min="0" max="100" step="10"><span class="ce-range-value">50%</span></div>
                                                {% elif field.type == 'toggle' %}
                                                    <div class="mt-2"><label class="ce-toggle-switch"><input type="checkbox" name="{{ field.key }}"><span class="ce-toggle-slider"></span></label></div>
                                                {% else %}
                                                    <input type="text" name="{{ field.key }}" class="form-control">
                                                {% endif %}
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
                                <div class="text-center p-5 opacity-50"><i class="fas fa-project-diagram fa-4x mb-3"></i><h4 class="font-brand text-muted">NETWORK GRAPH</h4><p>No active vector connections.</p></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- SIDEBAR -->
                <div class="ai-sidebar d-flex flex-column border-start bg-white">
                    <div class="sidebar-persona-header" id="ai-sidebar-header"></div>
                    <div class="p-3 flex-grow-1 overflow-y-auto" id="ai-sidebar-content"></div>
                </div>

            </div>
            
            <!-- FOOTER: DYNAMIC SAVE BUTTON -->
            <div class="modal-footer ce-modal-footer bg-white border-top d-flex justify-content-between">
                <div class="font-data text-muted small" id="save-status">STATUS: UNSAVED</div>
                <div class="d-flex gap-2">
                    <button type="button" class="btn btn-outline-secondary font-data px-4 rounded-pill" data-bs-dismiss="modal">EXIT</button>
                    <!-- Updated to show CE Type dynamically -->
                    <button type="button" class="btn btn-primary font-data px-4 rounded-pill btn-save-changes">
                        SAVE {{ ceType.upper() }}
                    </button>
                </div>
            </div>

        </div>
    </div>
</div>
"""

async def generate_dynamic_modal(ce_type, ce_text, ce_data, node_info, cos_content, ai_generated_data, phase_name, phase_index):
    ce_id_str = str(ce_data.get('id', 'new_ce'))
    cos_content_with_pills = replace_ce_tags_with_pills(cos_content)
    return render_template_string(
        BASE_MODAL_TEMPLATE,
        ceId=ce_id_str,
        ceType=ce_type,
        ce_text=ce_text,
        ce_data=ce_data,
        node_info=node_info,
        cos_content_with_pills=cos_content_with_pills,
        ai_generated_data=ai_generated_data,
        phase_name=phase_name,
        phase_index=phase_index
    )