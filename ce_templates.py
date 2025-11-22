# ce_templates.py
from flask import render_template_string
from utilities import replace_ce_tags_with_pills

BASE_MODAL_TEMPLATE = """
<div class="modal fade ceModal" id="ceModal-{{ ceId }}" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-fullscreen-xl-down modal-xl" role="document">
        <div class="modal-content ce-app-shell" data-phase-index="{{ phase_index }}" style="--phase-color: var(--phase-{{ phase_index }});">
            
            <!-- HEADER (Refactored per Prototype) -->
            <div class="modal-header ce-modal-header">
                <div class="node-icon"><i class="{{ node_info.icon }}"></i></div>
                <div class="ms-2 flex-grow-1">
                    <!-- Row 1: Title & Badge -->
                    <div class="ce-header-title-row">
                        <h5 class="modal-title ce-title">{{ ceType.upper() }} NODE</h5>
                        <div class="phase-badge">{{ phase_name.upper() }} PHASE</div>
                    </div>
                    <!-- Row 2: Metadata -->
                    <div class="ce-header-metadata">
                        // {{ ce_text }} // STRUCTURED SOLUTION // ID: {{ ceId.split('-')[0] }}
                    </div>
                </div>
                
                <div class="ms-auto d-flex align-items-center gap-2">
                     <!-- Visual Status Pill -->
                     <div class="bg-white bg-opacity-25 rounded-pill px-3 py-1 me-3 text-white small fw-bold border border-white border-opacity-25 d-none d-md-block">
                        <i class="fas fa-circle text-success me-1" style="font-size:6px; vertical-align:middle;"></i> ONLINE
                     </div>
                     
                     <button class="btn btn-header-action" id="speculate-sidebar-toggle" title="Toggle Intelligence">
                        <i class="fas fa-columns"></i>
                    </button>
                    <button type="button" class="btn btn-header-action" data-bs-dismiss="modal" aria-label="Close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>

            <!-- WORKSPACE -->
            <div class="modal-body ce-workspace-body p-0">
                
                <!-- LEFT: MAIN CONTENT -->
                <div class="ce-main-column">
                    
                    <!-- TABS (Consolidated) -->
                    <ul class="nav nav-tabs ce-nav-tabs" role="tablist">
                        <li class="nav-item"><button class="nav-link active" data-bs-toggle="tab" data-bs-target="#view-overview-{{ ceId }}"><i class="fas fa-home"></i> Overview</button></li>
                        <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#view-prerequisites-{{ ceId }}"><i class="fas fa-tasks"></i> Prerequisites</button></li>
                        <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#view-stakeholders-{{ ceId }}"><i class="fas fa-users"></i> Stakeholders</button></li>
                        <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#view-assumptions-{{ ceId }}"><i class="fas fa-shield-alt"></i> Assumptions</button></li>
                        <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#view-resources-{{ ceId }}"><i class="fas fa-database"></i> Resources</button></li>
                        <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#view-connections-{{ ceId }}"><i class="fas fa-project-diagram"></i> Connections</button></li>
                    </ul>

                    <div class="ce-app-content tab-content">
                        
                        <!-- 1. OVERVIEW TAB (Now includes Narrative) -->
                        <div class="tab-pane fade show active" id="view-overview-{{ ceId }}">
                            
                            <div class="content-header">Overview</div>
                            
                            <div class="row g-4 mb-5">
                                <!-- Big Status Card -->
                                <div class="col-md-7">
                                    <div class="dashboard-status-card">
                                        <div class="status-card-label">Current State</div>
                                        <div class="status-card-value mb-2">Awaiting Input<span class="text-warning" style="vertical-align: middle; font-size: 2rem; line-height:0;">•</span></div>
                                        <p class="text-muted mb-0" style="max-width: 90%;">
                                            This node is currently initialized. To begin, select the <strong>Speculate</strong> action on any tab to generate a strategic draft.
                                        </p>
                                    </div>
                                </div>
                                
                                <!-- Confidence / Metrics -->
                                <div class="col-md-5">
                                    <div class="row g-3 h-100">
                                        <div class="col-6">
                                            <div class="metric-card-modern h-100 d-flex flex-column justify-content-center text-center">
                                                <div class="metric-value count-badge" data-collection="prerequisites">0</div>
                                                <div class="metric-label">Prerequisites</div>
                                            </div>
                                        </div>
                                        <div class="col-6">
                                            <div class="metric-card-modern h-100 d-flex flex-column justify-content-center text-center">
                                                <div class="metric-value count-badge" data-collection="stakeholders">0</div>
                                                <div class="metric-label">Stakeholders</div>
                                            </div>
                                        </div>
                                        <div class="col-6">
                                            <div class="metric-card-modern h-100 d-flex flex-column justify-content-center text-center">
                                                <div class="metric-value count-badge" data-collection="assumptions">0</div>
                                                <div class="metric-label">Assumptions</div>
                                            </div>
                                        </div>
                                        <div class="col-6">
                                            <div class="metric-card-modern h-100 d-flex flex-column justify-content-center text-center">
                                                <div class="metric-value text-success">Online</div>
                                                <div class="metric-label">Status</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Merged Narrative Section -->
                            <div class="row">
                                <div class="col-12">
                                    <div class="d-flex justify-content-between align-items-center mb-3">
                                        <div class="content-header mb-0">Executive Narrative</div>
                                        <button class="btn btn-sm btn-link text-decoration-none" onclick="document.getElementById('narrative-details').classList.toggle('d-none')">
                                            Expand / Edit <i class="fas fa-chevron-down"></i>
                                        </button>
                                    </div>
                                    
                                    <!-- Display (Summary only) -->
                                    <div class="p-4 bg-white rounded border shadow-sm mb-4">
                                        <div class="d-flex gap-3">
                                            <div class="text-muted"><i class="fas fa-quote-left fa-2x opacity-25"></i></div>
                                            <div>
                                                <h6 class="fw-bold text-dark">Synopsis</h6>
                                                <p class="mb-0 text-muted">
                                                    {{ ce_data.data.details_data.get('summary', 'No narrative generated yet. Use the AI to draft an executive summary.') }}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Hidden Editing Form (Folded here instead of separate tab) -->
                                    <div id="narrative-details" class="d-none">
                                        <form id="narrative-form-{{ ceId }}" class="bg-white p-4 border rounded">
                                            {% for field in node_info.details_schema %}
                                            <div class="mb-3">
                                                <label class="small fw-bold text-uppercase text-muted">{{ field.label }}</label>
                                                <textarea name="{{ field.key }}" class="form-control bg-light" rows="3">{{ ce_data.data.details_data.get(field.key, '') }}</textarea>
                                            </div>
                                            {% endfor %}
                                            <div class="text-end">
                                                <button type="button" class="btn btn-primary btn-sm btn-save-changes">Save Narrative</button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="mt-4 pt-4 border-top">
                                <div class="content-header">Source Condition</div>
                                <div class="p-3 border border-dashed rounded text-muted fst-italic">
                                    {{ cos_content_with_pills | safe }}
                                </div>
                            </div>

                        </div>

                        <!-- 2-5. COLLECTIONS (Loop with Descriptions) -->
                        {% for collection in ['prerequisites', 'stakeholders', 'assumptions', 'resources'] %}
                        <div class="tab-pane fade h-100 d-flex flex-column" id="view-{{ collection }}-{{ ceId }}">
                            <div class="content-header">{{ collection|upper }}</div>
                            
                            <!-- Contextual Blurb -->
                            <p class="tab-context-description">
                                {% if collection == 'prerequisites' %}
                                    Identify dependencies and critical paths that must be cleared before this node is valid.
                                {% elif collection == 'stakeholders' %}
                                    Map the human network, institutions, and key decision-makers required for success.
                                {% elif collection == 'assumptions' %}
                                    List unvalidated risks and hypotheses that could jeopardize the outcome.
                                {% elif collection == 'resources' %}
                                    Gather files, links, and evidentiary support to verify this condition.
                                {% endif %}
                            </p>

                            <!-- Toolbar -->
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <div class="btn-group">
                                    <button class="btn btn-primary btn-sm px-3 btn-add-item" data-collection="{{ collection }}">
                                        <i class="fas fa-plus me-2"></i> Manual Entry
                                    </button>
                                    <!-- "One-Hit" Generator Button -->
                                    <button class="btn btn-outline-primary btn-sm px-3 btn-speculate-collection" data-collection="{{ collection }}">
                                        <i class="fas fa-magic me-2"></i> Auto-Generate
                                    </button>
                                </div>
                                <div class="input-group input-group-sm" style="width: 250px;">
                                    <span class="input-group-text bg-white"><i class="fas fa-search text-muted"></i></span>
                                    <input type="text" class="form-control" placeholder="Filter...">
                                </div>
                            </div>

                            <!-- List -->
                            <div class="flex-grow-1 overflow-y-auto collection-container" id="container-{{ collection }}-{{ ceId }}" data-collection="{{ collection }}">
                                <!-- JS Renders Cards Here -->
                            </div>

                            <!-- Hidden Form -->
                            <div class="collection-editor mt-3 bg-white border p-4 shadow-sm rounded" id="editor-{{ collection }}-{{ ceId }}" style="display: none;">
                                <div class="d-flex justify-content-between mb-3">
                                    <h6 class="fw-bold text-uppercase">Edit Entry</h6>
                                    <button type="button" class="btn-close btn-cancel-edit"></button>
                                </div>
                                <form class="editor-form" data-collection="{{ collection }}">
                                    {% set schema = node_info.get(collection[:-1] + '_schema', []) %}
                                    {% for field in schema %}
                                    <div class="mb-3">
                                        <label class="form-label small text-muted fw-bold">{{ field.label }}</label>
                                        {% if field.type == 'textarea' %}
                                            <textarea name="{{ field.key }}" class="form-control"></textarea>
                                        {% elif field.type == 'select' %}
                                            <select name="{{ field.key }}" class="form-select">{% for o in field.options %}<option value="{{ o }}">{{ o }}</option>{% endfor %}</select>
                                        {% else %}
                                            <input type="text" name="{{ field.key }}" class="form-control">
                                        {% endif %}
                                    </div>
                                    {% endfor %}
                                    <div class="text-end">
                                        <button type="submit" class="btn btn-success btn-sm">Save Item</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                        {% endfor %}

                        <!-- CONNECTIONS -->
                        <div class="tab-pane fade" id="view-connections-{{ ceId }}">
                            <div class="content-header">CONNECTIONS</div>
                            <p class="tab-context-description">Visualize and manage dependencies between this node and other elements of the Structured Solution.</p>
                            <div class="text-center p-5 text-muted border border-dashed rounded mt-4">
                                <i class="fas fa-project-diagram fa-3x mb-3 opacity-25"></i>
                                <h5>No active connections.</h5>
                            </div>
                        </div>

                    </div>
                </div>

                <!-- RIGHT: INTELLIGENCE SIDEBAR -->
                <div class="ai-sidebar d-flex flex-column">
                    <div class="p-3 border-bottom bg-white">
                        <h6 class="text-uppercase fw-bold mb-1" style="font-family:'Unica One'; letter-spacing:1px; font-size:1.1rem;">Intelligence</h6>
                        <div class="small text-muted"><i class="fas fa-circle text-success me-1" style="font-size:6px; vertical-align:middle;"></i> ONLINE</div>
                    </div>
                    <div class="p-3 overflow-y-auto flex-grow-1" id="ai-sidebar-content"></div>
                </div>

            </div>
        </div>
    </div>
</div>
"""

async def generate_dynamic_modal(ce_type, ce_text, ce_data, node_info, cos_content, ai_generated_data, phase_name, phase_index):
    # FIX: Force UUID to String to prevent 'uuid' has no attribute 'split' error
    ce_id_str = str(ce_data.get('id', 'new_ce'))
    
    cos_content_with_pills = replace_ce_tags_with_pills(cos_content)
    
    return render_template_string(
        BASE_MODAL_TEMPLATE,
        ceId=ce_id_str,  # Passing the safe string
        ceType=ce_type,
        ce_text=ce_text,
        ce_data=ce_data,
        node_info=node_info,
        cos_content_with_pills=cos_content_with_pills,
        ai_generated_data=ai_generated_data,
        phase_name=phase_name,
        phase_index=phase_index
    )