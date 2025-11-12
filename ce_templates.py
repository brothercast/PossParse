# ce_templates.py
from flask import render_template_string

# This is the complete, final template for the "Speculation Environment".
# It dynamically builds its forms and views based on the NODES dictionary.
BASE_MODAL_TEMPLATE = """
<div class="modal fade ceModal" id="ceModal-{{ ceId }}" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-fullscreen-xl-down modal-xl" role="document">
        <div class="modal-content ce-app-shell" data-phase-index="{{ phase_index }}" style="--phase-color: var(--phase-{{ phase_index }});">
            
            <div class="modal-header ce-modal-header">
                <div class="node-icon"><i class="{{ node_info.icon }}"></i></div>
                <div class="ms-3 flex-grow-1 text-truncate">
                    <span class="modal-title ce-title">{{ ceType.replace('_', ' ').title() }}</span>
                    <span class="phase-name">// {{ ce_text }} // {{ phase_name.title() }} PHASE</span>
                </div>
                <div class="ms-auto d-flex align-items-center flex-shrink-0">
                    <button class="btn btn-header-action" id="speculate-sidebar-toggle">
                        <i class="fas fa-brain"></i> Speculate Co-Pilot
                    </button>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
            </div>

            <ul class="nav nav-tabs ce-nav-tabs" role="tablist">
                <li class="nav-item"><button class="nav-link active" data-bs-toggle="tab" data-bs-target="#view-overview-{{ ceId }}">Overview</button></li>
                <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#view-details-{{ ceId }}">Details</button></li>
                <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#view-resources-{{ ceId }}">Resources <span class="badge rounded-pill bg-secondary ms-2 resource-counter">0</span></button></li>
                <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#view-connections-{{ ceId }}">Connections <span class="badge rounded-pill bg-secondary ms-2 connection-counter">0</span></button></li>
            </ul>

            <div class="modal-body ce-app-body">
                <div class="ce-app-content tab-content flex-grow-1">
                    
                    <div class="tab-pane fade show active p-4" id="view-overview-{{ ceId }}">
                        <div class="row g-4 overview-grid">
                            <div class="col-lg-8">
                                <div class="card mb-4 source-cos-card">
                                    <div class="card-body">
                                        <h5 class="card-title text-muted"><i class="fas fa-crosshairs me-2"></i> Source Condition of Satisfaction</h5>
                                        <div class="content-block mt-3">
                                            <p class="card-text fst-italic">
                                                {{ cos_content_with_pills | safe }}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div class="card ai-insight-card">
                                    <div class="card-body">
                                        <a class="d-flex justify-content-between align-items-center text-decoration-none text-dark" data-bs-toggle="collapse" href="#collapse-summary-{{ ceId }}" role="button" aria-expanded="false">
                                            <h5 class="card-title mb-0"><i class="fas fa-lightbulb me-2"></i> Summary</h5>
                                            <i class="fas fa-chevron-down text-muted"></i>
                                        </a>
                                        <div class="collapse" id="collapse-summary-{{ ceId }}">
                                            <div class="content-block mt-3">
                                                <p class="card-text text-muted" id="summary-content-container">
                                                    {{ ai_generated_data.contextual_description or 'This is the high-level summary. Use the Co-Pilot to generate this content.' }}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-lg-4">
                                <div class="card overview-stat-card">
                                    <div class="card-header fw-bold">Status Dashboard</div>
                                    <ul class="list-group list-group-flush">
                                        <li class="list-group-item d-flex justify-content-between align-items-center">
                                            <div><i class="fas fa-book me-2 text-muted"></i>Resources</div>
                                            <span class="badge bg-primary rounded-pill resource-counter">0</span>
                                        </li>
                                        <li class="list-group-item d-flex justify-content-between align-items-center">
                                            <div><i class="fas fa-check-circle me-2 text-muted"></i>Verified</div>
                                            <span class="badge bg-success rounded-pill" id="verified-counter">0</span>
                                        </li>
                                        <li class="list-group-item d-flex justify-content-between align-items-center">
                                            <div><i class="fas fa-project-diagram me-2 text-muted"></i>Connections</div>
                                            <span class="badge bg-info rounded-pill connection-counter">0</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="tab-pane fade p-4" id="view-details-{{ ceId }}">
                        <div class="details-form-container mx-auto">
                            <form id="details-form-{{ ceId }}">
                            {% for field in node_info.details_schema %}
                            <div class="card mb-3">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                        <label for="detail-{{ field.name }}" class="form-label mb-0 h6">{{ field.label }}</label>
                                        <button type="button" class="btn btn-sm btn-outline-primary btn-enhance-field" data-field="{{ field.name }}">
                                            <i class="fas fa-wand-magic-sparkles"></i> Enhance
                                        </button>
                                    </div>
                                    <textarea id="detail-{{ field.name }}" name="{{ field.name }}" class="form-control" placeholder="{{ field.placeholder }}" rows="5">{{ ce_data.data.details_data.get(field.name, '') }}</textarea>
                                </div>
                            </div>
                            {% endfor %}
                            </form>
                            <div class="d-grid gap-2 mt-4">
                                <button class="btn btn-primary" id="generate-all-details-btn"><i class="fas fa-brain me-2"></i> Generate with SPECULATE Engine</button>
                            </div>
                        </div>
                    </div>

                    <div class="tab-pane fade d-flex flex-column h-100" id="view-resources-{{ ceId }}">
                        <div id="resources-toolbar" class="p-3 border-bottom bg-light flex-shrink-0"></div>
                        <div id="bulk-actions-bar" class="p-2 border-bottom align-items-center" style="display: none;"></div>
                        <div id="resources-container" class="flex-grow-1" style="overflow-y: auto;"></div>
                        <div id="resource-editor-container" class="resource-editor p-4" style="display: none;">
                            <form id="resource-editor-form-{{ ceId }}">
                                <h4 id="resource-editor-title" class="mb-3">New Resource</h4>
                                {% for field in node_info.resource_schema %}
                                <div class="mb-3">
                                    <label for="editor-{{ field.key }}" class="form-label">{{ field.label }}</label>
                                    {% if field.type == 'textarea' %}
                                        <textarea id="editor-{{ field.key }}" name="{{ field.key }}" class="form-control" placeholder="{{ field.placeholder or '' }}" rows="3"></textarea>
                                    {% elif field.type == 'select' %}
                                        <select id="editor-{{ field.key }}" name="{{ field.key }}" class="form-select">
                                            <option value="">Choose...</option>
                                            {% for option in field.options %}
                                            <option value="{{ option }}">{{ option }}</option>
                                            {% endfor %}
                                        </select>
                                    {% else %}
                                        <input type="{{ field.type if field.type in ['text', 'number', 'date'] else 'text' }}" id="editor-{{ field.key }}" name="{{ field.key }}" class="form-control" placeholder="{{ field.placeholder or '' }}">
                                    {% endif %}
                                </div>
                                {% endfor %}
                                <div class="d-flex justify-content-end gap-2 mt-4">
                                    <button type="button" class="btn btn-secondary" id="cancel-edit-btn">Cancel</button>
                                    <button type="submit" class="btn btn-primary" id="save-resource-btn">Save Resource</button>
                                </div>
                            </form>
                        </div>
                    </div>
                    
                    <div class="tab-pane fade p-4" id="view-connections-{{ ceId }}">
                        <h4 class="mb-3">Knowledge Graph Connections</h4>
                        <div id="connections-container">
                             <div class="text-center p-5 text-muted"><h4>No Connections</h4><p>Link this element to other CEs, COS, or SSOLs to build the knowledge graph.</p></div>
                        </div>
                        <button class="btn btn-outline-primary mt-3"><i class="fas fa-plus"></i> Add Connection</button>
                    </div>
                </div>

                <div id="ai-sidebar" class="ai-sidebar" style="display: none;">
                    <div class="p-3 border-bottom d-flex justify-content-between align-items-center">
                        <h5 class="mb-0"><i class="fas fa-brain me-2"></i> Co-Pilot</h5>
                        <button type="button" class="btn-close" id="close-sidebar-btn"></button>
                    </div>
                    <div class="p-3" id="ai-sidebar-content"> <!-- Sidebar content goes here --> </div>
                </div>
            </div>

            <div class="modal-footer ce-modal-footer">
                <div class="me-auto text-muted small" id="save-status">Not saved</div>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary btn-save-changes"><i class="fas fa-save me-2"></i>Save Changes</button>
            </div>
        </div>
    </div>
</div>
"""

async def generate_dynamic_modal(ce_type, ce_text, ce_data, node_info, cos_content, ai_generated_data, phase_name, phase_index):
    """
    Renders the new "Speculation Environment" modal shell, passing all necessary context.
    """
    return render_template_string(
        BASE_MODAL_TEMPLATE,
        ceId=ce_data.get('id', 'new_ce'),
        ceType=ce_type,
        ce_text=ce_text,
        ce_data=ce_data,
        node_info=node_info,
        cos_content_with_pills=cos_content,
        ai_generated_data=ai_generated_data,
        phase_name=phase_name,
        phase_index=phase_index
    )