# ce_templates.py
from flask import render_template_string
from utilities import replace_ce_tags_with_pills

BASE_MODAL_TEMPLATE = """
<div class="modal fade ceModal" id="ceModal-{{ ceId }}" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-fullscreen-xl-down modal-xl" role="document">
        <div class="modal-content ce-app-shell" data-phase-index="{{ phase_index }}" style="--phase-color: var(--phase-{{ phase_index }});">
            
            <!-- HEADER -->
            <div class="modal-header ce-modal-header">
                <div class="node-icon"><i class="{{ node_info.icon }}"></i></div>
                <div class="ms-3 flex-grow-1 text-truncate">
                    <div class="modal-title ce-title">{{ ceType.replace('_', ' ').title() }}</div>
                    <div class="phase-name opacity-90">// {{ ce_text }} // {{ phase_name.title() }} PHASE</div>
                </div>
                <div class="ms-auto d-flex align-items-center gap-2">
                     <button class="btn btn-header-action" id="speculate-sidebar-toggle" title="Open Co-Pilot">
                        <i class="fas fa-columns"></i>
                    </button>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
            </div>

            <!-- PROGRESS BAR -->
            <div class="progress-bar-container">
                <div class="d-flex align-items-center">
                    <span class="small text-uppercase fw-bold text-muted me-3" style="font-size: 0.7rem; letter-spacing: 0.5px;">Readiness</span>
                    <div class="progress flex-grow-1" style="height: 6px; background-color: #e9ecef;">
                        <div id="ce-progress-bar" class="progress-bar" role="progressbar" style="width: 0%; transition: width 0.6s ease;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                    <span id="ce-progress-label" class="small fw-bold ms-3 text-muted" style="width: 35px; text-align: right;">0%</span>
                </div>
            </div>

            <!-- MAIN WORKSPACE -->
            <div class="modal-body ce-workspace-body p-0 d-flex overflow-hidden">
                
                <div class="ce-main-column d-flex flex-column flex-grow-1 overflow-hidden" style="min-width: 0;">
                    
                    <!-- STRATEGIC TABS -->
                    <ul class="nav nav-tabs ce-nav-tabs" role="tablist">
                        <li class="nav-item"><button class="nav-link active" data-bs-toggle="tab" data-bs-target="#view-overview-{{ ceId }}">Overview</button></li>
                        <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#view-narrative-{{ ceId }}">Narrative</button></li>
                        
                        <!-- Dynamic Collection Tabs -->
                        <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#view-prerequisites-{{ ceId }}">Prerequisites <span class="badge rounded-pill bg-light text-dark ms-1 count-badge" data-collection="prerequisites">0</span></button></li>
                        <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#view-stakeholders-{{ ceId }}">Stakeholders <span class="badge rounded-pill bg-light text-dark ms-1 count-badge" data-collection="stakeholders">0</span></button></li>
                        <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#view-assumptions-{{ ceId }}">Assumptions <span class="badge rounded-pill bg-light text-dark ms-1 count-badge" data-collection="assumptions">0</span></button></li>
                        <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#view-resources-{{ ceId }}">Resources <span class="badge rounded-pill bg-light text-dark ms-1 count-badge" data-collection="resources">0</span></button></li>
                        
                        <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#view-connections-{{ ceId }}">Connections <span class="badge rounded-pill bg-light text-dark ms-1 count-badge" data-collection="connections">0</span></button></li>
                    </ul>

                    <div class="ce-app-content tab-content flex-grow-1 overflow-y-auto bg-light">
                        
                        <!-- 1. OVERVIEW -->
                        <div class="tab-pane fade show active p-4" id="view-overview-{{ ceId }}">
                            <!-- (Overview content same as before, focused on dashboard metrics) -->
                             <div class="card ai-context-card border-0 shadow-sm mb-4">
                                <div class="card-body p-4">
                                    <div class="d-flex align-items-start gap-3">
                                        <div class="text-primary mt-1"><i class="fas fa-sparkles fa-lg"></i></div>
                                        <div class="flex-grow-1">
                                            <h6 class="fw-bold text-uppercase small text-muted mb-2">Strategic Insight</h6>
                                            <p class="text-dark mb-0" style="line-height: 1.6;">
                                                {{ ai_generated_data.contextual_description or 'Analyzing strategic context...' }}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <!-- Source COS -->
                            <div class="card border shadow-sm source-cos-card">
                                <div class="card-body">
                                    <h6 class="fw-bold text-secondary text-uppercase small mb-2"><i class="fas fa-crosshairs me-2"></i>Source Requirement</h6>
                                    <div class="p-3 bg-white rounded border border-light-subtle">
                                        <p class="fst-italic mb-0 text-dark small">{{ cos_content_with_pills | safe }}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 2. NARRATIVE (Previously Details) -->
                        <div class="tab-pane fade p-4" id="view-narrative-{{ ceId }}">
                            <div class="details-form-container mx-auto">
                                <form id="narrative-form-{{ ceId }}">
                                {% for field in node_info.details_schema %}
                                <div class="card mb-3 shadow-sm border-light">
                                    <div class="card-body">
                                        <div class="d-flex justify-content-between align-items-center mb-2">
                                            <label class="form-label mb-0 fw-bold text-secondary">{{ field.label }}</label>
                                            <button type="button" class="btn btn-sm btn-light text-primary btn-enhance-field" data-field="{{ field.key }}"><i class="fas fa-magic"></i></button>
                                        </div>
                                        <textarea name="{{ field.key }}" class="form-control bg-light border-0" rows="4">{{ ce_data.data.details_data.get(field.key, '') }}</textarea>
                                    </div>
                                </div>
                                {% endfor %}
                                </form>
                            </div>
                        </div>

                        <!-- 3-6. UNIVERSAL COLLECTIONS (Generated Loop) -->
                        {% for collection in ['prerequisites', 'stakeholders', 'assumptions', 'resources'] %}
                        {% set schema = node_info[collection[:-1] + '_schema'] %}
                        <div class="tab-pane fade d-flex flex-column h-100" id="view-{{ collection }}-{{ ceId }}">
                            
                            <!-- Toolbar -->
                            <div class="p-3 border-bottom bg-white flex-shrink-0 d-flex justify-content-between align-items-center">
                                <div class="btn-group">
                                    <button class="btn btn-primary btn-add-item" data-collection="{{ collection }}"><i class="fas fa-plus me-1"></i> Add {{ collection[:-1]|capitalize }}</button>
                                    <button class="btn btn-outline-primary btn-speculate-collection" data-collection="{{ collection }}"><i class="fas fa-brain me-1"></i> Suggest</button>
                                </div>
                                <input type="text" class="form-control form-control-sm w-auto search-collection" data-collection="{{ collection }}" placeholder="Filter...">
                            </div>

                            <!-- List Container -->
                            <div class="flex-grow-1 p-3 overflow-y-auto collection-container" id="container-{{ collection }}-{{ ceId }}" data-collection="{{ collection }}">
                                <!-- JS renders cards here -->
                            </div>

                            <!-- Hidden Editor (One per collection type to handle schema differences) -->
                            <div class="collection-editor p-4 bg-white border-top" id="editor-{{ collection }}-{{ ceId }}" style="display: none;">
                                <h5 class="mb-3 fw-bold">Edit {{ collection[:-1]|capitalize }}</h5>
                                <form class="editor-form" data-collection="{{ collection }}">
                                    {% for field in schema %}
                                    <div class="mb-3">
                                        <label class="form-label small fw-bold text-muted text-uppercase">{{ field.label }}</label>
                                        {% if field.type == 'textarea' %}
                                            <textarea name="{{ field.key }}" class="form-control" rows="2"></textarea>
                                        {% elif field.type == 'select' %}
                                            <select name="{{ field.key }}" class="form-select">
                                                {% for option in field.options %}<option value="{{ option }}">{{ option }}</option>{% endfor %}
                                            </select>
                                        {% elif field.type == 'slider' %}
                                            <input type="range" name="{{ field.key }}" class="form-range" min="0" max="100">
                                        {% else %}
                                            <input type="text" name="{{ field.key }}" class="form-control">
                                        {% endif %}
                                    </div>
                                    {% endfor %}
                                    <div class="d-flex justify-content-end gap-2">
                                        <button type="button" class="btn btn-light btn-cancel-edit">Cancel</button>
                                        <button type="submit" class="btn btn-success">Save</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                        {% endfor %}
                        
                        <!-- 7. CONNECTIONS TAB -->
                         <div class="tab-pane fade p-4" id="view-connections-{{ ceId }}">
                            <div id="connections-container" class="text-center p-5 text-muted">
                                <i class="fas fa-project-diagram fa-3x mb-3 opacity-25"></i>
                                <h5>Knowledge Graph</h5>
                                <p>Connections allow for vectorizing the relationship between this CE and the broader SSOL.</p>
                            </div>
                        </div>

                    </div>
                </div>

                <!-- AI SIDEBAR (Right Column) -->
                <div class="ai-sidebar d-flex flex-column border-start">
                    <div class="sidebar-header p-3 text-white bg-primary d-flex align-items-center">
                         <h6 class="mb-0 fw-bold"><i class="fas fa-brain me-2"></i> SPECULATE Engine</h6>
                    </div>
                    <div class="p-3 overflow-y-auto flex-grow-1" id="ai-sidebar-content"></div>
                </div>

            </div>

            <div class="modal-footer ce-modal-footer">
                <div class="small text-muted me-auto"><i class="fas fa-circle text-success" style="font-size: 8px;"></i> Systems Active</div>
                <button type="button" class="btn btn-outline-secondary px-4" data-bs-dismiss="modal">Close</button>
                <button type="button" class="btn btn-primary px-4 btn-save-changes">Save Changes</button>
            </div>
        </div>
    </div>
</div>
"""

# Generate function remains the same
async def generate_dynamic_modal(ce_type, ce_text, ce_data, node_info, cos_content, ai_generated_data, phase_name, phase_index):
    cos_content_with_pills = replace_ce_tags_with_pills(cos_content)
    return render_template_string(
        BASE_MODAL_TEMPLATE,
        ceId=ce_data.get('id', 'new_ce'),
        ceType=ce_type,
        ce_text=ce_text,
        ce_data=ce_data,
        node_info=node_info,
        cos_content_with_pills=cos_content_with_pills,
        ai_generated_data=ai_generated_data,
        phase_name=phase_name,
        phase_index=phase_index
    )