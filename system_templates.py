from flask import render_template_string
from system_nodes import SYSTEM_NODES

# --- 1. THE HORIZON GAUGE (Visualizes the "HORIZON" node) ---
HORIZON_GAUGE_TEMPLATE = """
<div class="bg-white border rounded-4 p-3 mb-4 shadow-sm d-flex align-items-center gap-4 position-relative overflow-hidden cursor-pointer hover-shadow transition-all" 
     onclick="openSystemEditor('{{ id }}')" title="Edit Temporal Horizon">
    
    <!-- Ambient Background Glow -->
    <div class="position-absolute top-0 start-0 h-100 w-100" 
         style="background: linear-gradient(90deg, rgba(var(--aviation-teal-rgb), 0.05), transparent); pointer-events: none;"></div>

    <!-- Icon Block -->
    <div class="rounded-circle bg-light d-flex align-items-center justify-content-center text-dark border shadow-sm position-relative z-1" 
         style="width:48px; height:48px; min-width:48px;">
        <i class="{{ icon }} fa-lg text-warning"></i>
    </div>

    <!-- The Bar Logic -->
    <div class="flex-grow-1 position-relative z-1">
        <div class="d-flex justify-content-between align-items-end mb-2">
            <span class="font-data small text-muted tracking-widest opacity-75">INCEPTION</span>
            <span class="font-data small text-primary tracking-widest fw-bold">TARGET: {{ value }}</span>
        </div>
        <div class="progress" style="height: 8px; background-color: #e9ecef;">
            <!-- Visualizing "Time Elapsed" - Mocked at 35% for MVP -->
            <div class="progress-bar bg-gradient-primary" role="progressbar" style="width: 35%; background-color: #00bcd4;" aria-valuenow="35" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
    </div>

    <!-- The T-Minus Readout -->
    <div class="text-end ps-3 border-start position-relative z-1">
        <div class="font-data text-muted" style="font-size: 0.65rem; letter-spacing: 1px;">STATUS</div>
        <div class="font-brand text-dark fs-4" style="line-height: 1;">ON TRACK</div>
    </div>
</div>
"""

# --- 2. THE SYSTEM PILLS (Strategic Anchors) ---
SYSTEM_PILL_ROW_TEMPLATE = """
<div class="d-flex flex-wrap gap-3 mt-4 pt-4 border-top border-light align-items-center" id="system-pill-container">
    <div class="font-data text-muted small tracking-widest me-2 d-flex align-items-center gap-2">
        <i class="fas fa-layer-group"></i> STRATEGIC ANCHORS:
    </div>
    
    <!-- Render Existing Parameters -->
    {% for param in system_params %}
    <div class="system-pill group position-relative" data-id="{{ param.id }}" data-type="{{ param.type }}">
        <div class="d-flex align-items-center bg-white border pe-3 ps-1 py-1 shadow-sm hover-shadow transition-all cursor-pointer" 
             style="border-radius: 50px;"
             onclick="openSystemEditor('{{ param.id }}', '{{ param.type }}', '{{ param.value }}')">
            <div class="rounded-circle d-flex align-items-center justify-content-center text-white me-2 shadow-sm" 
                 style="width: 28px; height: 28px; background-color: {{ param.color }};">
                <i class="{{ param.icon }} fa-xs"></i>
            </div>
            <div class="d-flex flex-column justify-content-center" style="line-height: 1.1;">
                <span class="font-data text-uppercase fw-bold" style="font-size: 0.6rem; color: #94a3b8; letter-spacing: 0.5px;">{{ param.label }}</span>
                <span class="font-body fw-bold text-dark small">{{ param.value }}</span>
            </div>
        </div>
    </div>
    {% endfor %}

    <!-- Add Button -->
    <button class="btn btn-sm btn-white rounded-circle border shadow-sm d-flex align-items-center justify-content-center transition-all" 
            style="width: 32px; height: 32px;" 
            onclick="openSystemEditor('new')"
            title="Define New Parameter">
        <i class="fas fa-plus text-primary fa-sm"></i>
    </button>
</div>
"""

# --- 3. THE CONFIG MODAL (Horizon Style) ---
SYSTEM_EDITOR_MODAL_TEMPLATE = """
<div class="modal fade" id="systemConfigModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content border-0 rounded-4 shadow-lg overflow-hidden">
            
            <!-- Header -->
            <div class="modal-header text-white border-0 p-4" style="background: linear-gradient(135deg, #2c3e50 0%, #37474f 100%);">
                <div class="d-flex align-items-center gap-3">
                    <div class="rounded-circle bg-white bg-opacity-10 p-3 border border-white border-opacity-10 shadow-sm">
                        <i class="fas fa-sliders fa-lg text-info"></i>
                    </div>
                    <div>
                        <h5 class="modal-title font-brand mb-0 tracking-wide">SYSTEM CONFIGURATION</h5>
                        <p class="small text-white-50 mb-0 font-data tracking-wider">DEFINE CONSTRAINTS & CONTEXT</p>
                    </div>
                </div>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>

            <!-- Body -->
            <div class="modal-body p-5 bg-surface-screen">
                <form id="system-node-form">
                    <input type="hidden" name="param_id" id="sys-param-id">
                    
                    <div class="row g-4">
                        <!-- Left: Type Selection -->
                        <div class="col-md-4 border-end">
                            <label class="font-data small text-muted mb-3 d-block tracking-widest">PARAMETER TYPE</label>
                            <div class="d-flex flex-column gap-2" id="sys-type-selector">
                                {% for key, node in nodes.items() %}
                                <input type="radio" class="btn-check" name="sys_type" id="type-{{ key }}" value="{{ key }}" autocomplete="off">
                                <label class="btn btn-outline-light border text-start text-dark d-flex align-items-center gap-3 p-2 shadow-sm" for="type-{{ key }}"
                                       onclick="updateSystemColor('{{ node.color }}', '{{ node.description }}')">
                                    <div class="rounded-circle d-flex align-items-center justify-content-center text-white" style="width:32px; height:32px; background-color: {{ node.color }};">
                                        <i class="{{ node.icon }} fa-sm"></i>
                                    </div>
                                    <div class="d-flex flex-column">
                                        <span class="font-data small fw-bold">{{ node.label }}</span>
                                        <span class="font-body text-muted" style="font-size: 0.65rem;">{{ node.examples[0] }}</span>
                                    </div>
                                </label>
                                {% endfor %}
                            </div>
                        </div>

                        <!-- Right: Input & Context -->
                        <div class="col-md-8 ps-md-4">
                            
                            <!-- Context Helper -->
                            <div class="alert alert-light border mb-4 d-flex gap-3 align-items-start shadow-sm">
                                <i class="fas fa-info-circle text-primary mt-1"></i>
                                <div>
                                    <h6 class="font-data small text-dark mb-1">STRATEGIC PURPOSE</h6>
                                    <p class="small text-muted mb-0 font-body" id="sys-description-text">Select a parameter type to see its definition.</p>
                                </div>
                            </div>

                            <!-- Value Input -->
                            <div class="form-group mb-4">
                                <label class="font-data small text-muted mb-2 tracking-widest">DEFINED REALITY</label>
                                <div class="input-group input-group-lg shadow-sm">
                                    <span class="input-group-text bg-white border-end-0">
                                        <i class="fas fa-pen text-muted" id="sys-icon-preview"></i>
                                    </span>
                                    <input type="text" class="form-control border-start-0 font-body fs-5" 
                                           id="sys-param-value" name="value" placeholder="Enter strategic definition..." required>
                                </div>
                            </div>

                            <!-- Action Footer -->
                            <div class="d-flex justify-content-between align-items-center mt-5 pt-3 border-top">
                                <button type="button" class="btn btn-link text-danger text-decoration-none font-data small p-0" id="btn-delete-param" style="display:none;">
                                    <i class="fas fa-trash me-1"></i> REMOVE
                                </button>
                                <div class="d-flex gap-2 ms-auto">
                                    <button type="button" class="btn btn-white border font-data rounded-pill px-4" data-bs-dismiss="modal">CANCEL</button>
                                    <button type="submit" class="btn btn-dark font-data rounded-pill px-5 shadow-lg">
                                        SAVE PARAMETER <i class="fas fa-arrow-right ms-2"></i>
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>

<script>
    function updateSystemColor(color, desc) {
        const icon = document.querySelector('#sys-icon-preview');
        const descText = document.querySelector('#sys-description-text');
        if(icon) icon.style.color = color;
        if(descText) descText.textContent = desc;
    }

    // Stub for opening modal logic - to be implemented in a JS controller
    window.openSystemEditor = function(id, type, value) {
        const modal = new bootstrap.Modal(document.getElementById('systemConfigModal'));
        document.getElementById('sys-param-id').value = id === 'new' ? '' : id;
        document.getElementById('sys-param-value').value = value || '';
        
        // Reset validation/checked state
        document.querySelectorAll('input[name="sys_type"]').forEach(el => el.checked = false);
        if(type) {
            const rad = document.getElementById('type-' + type);
            if(rad) { 
                rad.checked = true; 
                // Trigger onclick to update description visuals
                rad.click();
            }
        }
        
        const delBtn = document.getElementById('btn-delete-param');
        if(delBtn) delBtn.style.display = (id === 'new' ? 'none' : 'block');

        modal.show();
    };
</script>
"""

# --- RENDER HELPERS ---

def render_command_deck(system_params):
    """
    Orchestrates the rendering of the top Command Deck.
    Separates TIME elements for the Gauge vs Generic elements for Pills.
    """
    # 1. Separate Horizon (Time) from others
    horizon_node = next((p for p in system_params if p['type'] == 'HORIZON'), None)
    other_params = [p for p in system_params if p['type'] != 'HORIZON']

    # 2. Enrich with Config
    enriched_params = []
    for p in other_params:
        config = SYSTEM_NODES.get(p['type'], SYSTEM_NODES['OPERATOR'])
        enriched_params.append({
            **p,
            "icon": config['icon'],
            "color": config['color'],
            "label": config['label']
        })

    # 3. Build HTML
    html = ""
    
    # If we have a Horizon Node defined, render the Gauge
    if horizon_node:
        config = SYSTEM_NODES['HORIZON']
        html += render_template_string(HORIZON_GAUGE_TEMPLATE, 
                                       value=horizon_node.get('value', 'UNSET'), 
                                       id=horizon_node.get('id'),
                                       icon=config['icon'])
    
    # Render the Pill Row
    html += render_template_string(SYSTEM_PILL_ROW_TEMPLATE, system_params=enriched_params)
    
    return html

def render_system_config_modal():
    return render_template_string(SYSTEM_EDITOR_MODAL_TEMPLATE, nodes=SYSTEM_NODES)