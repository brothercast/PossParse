// ce_cards.js
import { showLoadingSpinner, hideLoadingSpinner } from './base_functions.js';

// Initialize ce_store (if not already defined - best practice)
const ce_store = window.ce_store || {};

// --- Default Configurations for CE Modals and Tables ---
// Define default configurations to be used if specific CE type configurations are missing in NODES
const DEFAULT_FIELDS_CONFIG = [
    { type: "text", name: "subject", placeholder: "Subject" },
    { type: "textarea", name: "details", placeholder: "Details" },
    { type: "text", name: "stakeholders", placeholder: "Stakeholders" }
];

const DEFAULT_TABULATOR_CONFIG = {
    columns: [
        { title: "Subject", field: "subject", editor: "input" },
        { title: "Details", field: "details", editor: "input" },
        { title: "Stakeholders", field: "stakeholders", editor: "input" }
    ]
};

// --- NODES Definition ---
// Defines configuration for different Conditional Element (CE) types,
// including icons, modal form fields, and Tabulator table columns.
const NODES = {
    "Default": {
        icon: 'fa-spinner',
        modal_config: {
            fields: DEFAULT_FIELDS_CONFIG, // Use DEFAULT_FIELDS_CONFIG here
            explanation: "Default Resource Node.", // Added explanation for Default node
            ai_context: "Provide general information and suggestions to help achieve the Condition of Satisfaction (COS)." // Added ai_context
        },
        tabulator_config: DEFAULT_TABULATOR_CONFIG // Use DEFAULT_TABULATOR_CONFIG here
    },
    "Research": {
        "definition": "Aggregates and summarizes research materials and resources pertinent to the COS.",
        "icon": "fa-solid fa-flask",
        "modal_config": {
            fields: [
                {"type": "text", "name": "research_topic", "placeholder": "Research Topic"},
                {"type": "textarea", "name": "research_summary", "placeholder": "Research Summary"},
                {"type": "text", "name": "research_website", "placeholder": "Research Website"}
            ],
            "explanation": "Capture relevant research aspects of the node.",
            "ai_context": "Provide detailed research information, studies, and academic resources relevant to the COS."
        },
        "tabulator_config": {
            columns: [
                {"title": "Research Topic", "field": "research_topic", "editor": "input"},
                {"title": "Research Summary", "field": "research_summary", "editor": "textarea"},
                {"title": "Research Website", "field": "research_website", "editor": "input"}
            ]
        }
    },
    "Stakeholder": {
        "definition": "Captures details of stakeholders involved in the COS.",
        "icon": "fa-solid fa-user-friends",
        "modal_config": {
            "fields": [
                {"type": "text", "name": "stakeholder_name", "placeholder": "Stakeholder Name"},
                {"type": "textarea", "name": "stakeholder_role", "placeholder": "Stakeholder Role"},
                {"type": "email", "name": "stakeholder_email", "placeholder": "Stakeholder Email"},
                {"type": "text", "name": "stakeholder_phone", "placeholder": "Stakeholder Phone"},
            ],
            "explanation": "Detail the roles and contact information of stakeholders related to the COS.",
            "ai_context": "Identify and provide details of stakeholders involved in the COS."
        },
        "tabulator_config": {
            columns: [
                {"title": "Stakeholder Name", "field": "stakeholder_name", "editor": "input"},
                {"title": "Stakeholder Role", "field": "stakeholder_role", "editor": "textarea"},
                {"title": "Stakeholder Email", "field": "stakeholder_email", "editor": "input"},
                {"title": "Stakeholder Phone", "field": "stakeholder_phone", "editor": "input"},
            ]
        }
    },
    "Advocacy": {
        "definition": "Focuses on efforts to influence public policy and resource allocation decisions.",
        "icon": "fa-solid fa-bullhorn",
        "modal_config": {
            fields: [
                {"type": "text", "name": "campaign_name", "placeholder": "Campaign Name"},
                {"type": "textarea", "name": "campaign_objective", "placeholder": "Campaign Objective"},
                {"type": "text", "name": "target_audience", "placeholder": "Target Audience"}
            ],
            "explanation": "Detail the advocacy campaign's objectives and target audience.",
            "ai_context": "Provide information on advocacy efforts and campaign strategies pertinent to the COS."
        },
        "tabulator_config": {
            columns: [
                {"title": "Campaign Name", "field": "campaign_name", "editor": "input"},
                {"title": "Campaign Objective", "field": "campaign_objective", "editor": "textarea"},
                {"title": "Target Audience", "field": "target_audience", "editor": "input"}
            ]
        }
    },

    "Resource": {
        "definition": "Lists resources or assets essential for achieving the COS.",
        "icon": "fa-solid fa-tools",
        "modal_config": {
            fields: [
                {"type": "text", "name": "resource_name", "placeholder": "Resource Name"},
                {"type": "textarea", "name": "resource_details", "placeholder": "Resource Details"},
                {"type": "text", "name": "resource_type", "placeholder": "Resource Type"}
            ],
            "explanation": "Provide details about resources or assets required for the COS.",
            "ai_context": "List and detail resources or assets essential for achieving the COS."
        },
        "tabulator_config": {
            columns: [
                {"title": "Resource Name", "field": "resource_name", "editor": "input"},
                {"title": "Resource Details", "field": "resource_details", "editor": "textarea"},
                {"title": "Resource Type", "field": "resource_type", "editor": "input"}
            ]
        }
    },
    "Praxis": {
        "definition": "Defines actions or tasks necessary to meet the COS.",
        "icon": "fa-solid fa-tasks",
        "modal_config": {
            fields: [
                {"type": "text", "name": "action_name", "placeholder": "Action Name"},
                {"type": "textarea", "name": "action_description", "placeholder": "Action Description"},
                {"type": "text", "name": "responsible_person", "placeholder": "Responsible Person"}
            ],
            "explanation": "Specify tasks or actions required to fulfill the COS.",
            "ai_context": "Detail actions or tasks necessary to meet the COS."
        },
        "tabulator_config": {
            columns: [
                {"title": "Action Name", "field": "action_name", "editor": "input"},
                {"title": "Action Description", "field": "action_description", "editor": "textarea"},
                {"title": "Responsible Person", "field": "responsible_person", "editor": "input"}
            ]
        }
    },
    "Timeline": {
        "definition": "Specifies time frames or deadlines associated with the COS.",
        "icon": "fa-solid fa-clock",
        "modal_config": {
            fields: [
                {"type": "text", "name": "time_frame", "placeholder": "Time Frame"},
                {"type": "date", "name": "start_date", "placeholder": "Start Date"},
                {"type": "date", "name": "end_date", "placeholder": "End Date"}
            ],
            "explanation": "Provide time-related information such as deadlines and schedules for the COS.",
            "ai_context": "Detail time frames or deadlines associated with the COS."
        },
        "tabulator_config": {
            columns: [
                {"title": "Time Frame", "field": "time_frame", "editor": "input"},
                {"title": "Start Date", "field": "start_date", "editor": "input"},
                {"title": "End Date", "field": "end_date", "editor": "input"}
            ]
        }
    },
    "Collaboration": {
        "definition": "Focuses on partnerships or collaboration efforts necessary for the COS.",
        "icon": "fa-solid fa-handshake",
        "modal_config": {
            fields: [
                {"type": "text", "name": "partner_name", "placeholder": "Partner Name"},
                {"type": "textarea", "name": "collaboration_details", "placeholder": "Collaboration Details"},
                {"type": "text", "name": "contact_person", "placeholder": "Contact Person"}
            ],
            "explanation": "Outline collaboration efforts and partnerships related to the COS.",
            "ai_context": "Detail partnerships or collaboration efforts necessary for the COS."
        },
        "tabulator_config": {
            columns: [
                {"title": "Partner Name", "field": "partner_name", "editor": "input"},
                {"title": "Collaboration Details", "field": "collaboration_details", "editor": "textarea"},
                {"title": "Contact Person", "field": "contact_person", "editor": "input"}
            ]
        }
    },
    "Policy": {
        "definition": "Addresses policy or regulatory aspects pertinent to the COS.",
        "icon": "fa-solid fa-gavel",
        "modal_config": {
            fields: [
                {"type": "text", "name": "policy_name", "placeholder": "Policy Name"},
                {"type": "textarea", "name": "policy_details", "placeholder": "Policy Details"},
                {"type": "text", "name": "regulatory_body", "placeholder": "Regulatory Body"}
            ],
            "explanation": "Detail policies or regulations impacting the COS.",
            "ai_context": "Provide information on policies or regulatory aspects pertinent to the COS."
        },
        "tabulator_config": {
            columns: [
                {"title": "Policy Name", "field": "policy_name", "editor": "input"},
                {"title": "Policy Details", "field": "policy_details", "editor": "textarea"},
                {"title": "Regulatory Body", "field": "regulatory_body", "editor": "input"}
            ]
        }
    },
    "Legislation": {
        "definition": "Covers legal considerations or requirements pertinent to the COS.",
        "icon": "fa-solid fa-balance-scale",
        "modal_config": {
            fields: [
                {"type": "textarea", "name": "legal_requirements", "placeholder": "Legal Requirements"},
                {"type": "text", "name": "relevant_legislation", "placeholder": "Relevant Legislation"},
                {"type": "text", "name": "compliance_officer", "placeholder": "Compliance Officer"}
            ],
            "explanation": "Detail legal considerations and requirements for the COS.",
            "ai_context": "Provide information on legal considerations or requirements pertinent to the COS."
        },
        "tabulator_config": {
            columns: [
                {"title": "Legal Requirements", "field": "legal_requirements", "editor": "textarea"},
                {"title": "Relevant Legislation", "field": "relevant_legislation", "editor": "input"},
                {"title": "Compliance Officer", "field": "compliance_officer", "editor": "input"}
            ]
        }
    },
    "Environment": {
        "definition": "Addresses environmental factors related to the COS.",
        "icon": "fa-solid fa-leaf",
        "modal_config": {
            fields: [
                {"type": "text", "name": "environmental_factor", "placeholder": "Environmental Factor"},
                {"type": "textarea", "name": "impact_assessment", "placeholder": "Impact Assessment"},
                {"type": "text", "name": "mitigation_strategy", "placeholder": "Mitigation Strategy"}
            ],
            "explanation": "Detail environmental factors and their impact on the COS.",
            "ai_context": "Provide information on environmental factors and impact assessments pertinent to the COS."
        },
        "tabulator_config": {
            columns: [
                {"title": "Environmental Factor", "field": "environmental_factor", "editor": "input"},
                {"title": "Impact Assessment", "field": "impact_assessment", "editor": "textarea"},
                {"title": "Mitigation Strategy", "field": "mitigation_strategy", "editor": "input"}
            ]
        }
    },
    "Risk": {
        "definition": "Identifies potential risks and mitigation strategies for the COS.",
        "icon": "fa-solid fa-exclamation-triangle",
        "modal_config": {
            fields: [
                {"type": "text", "name": "risk_name", "placeholder": "Risk Name"},
                {"type": "textarea", "name": "risk_description", "placeholder": "Risk Description"},
                {"type": "text", "name": "mitigation_plan", "placeholder": "Mitigation Plan"}
            ],
            "explanation": "Detail potential risks and strategies to mitigate them for the COS.",
            "ai_context": "Identify potential risks and provide mitigation strategies for the COS."
        },
        "tabulator_config": {
            columns: [
                {"title": "Risk Name", "field": "risk_name", "editor": "input"},
                {"title": "Risk Description", "field": "risk_description", "editor": "textarea"},
                {"title": "Mitigation Plan", "field": "mitigation_plan", "editor": "input"}
            ]
        }
    },
    "Opportunity": {
        "definition": "Identifies opportunities that can enhance the COS.",
        "icon": "fa-solid fa-lightbulb",
        "modal_config": {
            fields: [
                {"type": "text", "name": "opportunity_name", "placeholder": "Opportunity Name"},
                {"type": "textarea", "name": "opportunity_description", "placeholder": "Opportunity Description"},
                {"type": "text", "name": "exploitation_plan", "placeholder": "Exploitation Plan"}
            ],
            "explanation": "Detail opportunities and strategies to capitalize on them for the COS.",
            "ai_context": "Identify opportunities and provide strategies to exploit them for the COS."
        },
        "tabulator_config": {
            columns: [
                {"title": "Opportunity Name", "field": "opportunity_name", "editor": "input"},
                {"title": "Opportunity Description", "field": "opportunity_description", "editor": "textarea"},
                {"title": "Exploitation Plan", "field": "exploitation_plan", "editor": "input"}
            ]
        }
    },
    "AnotherType": { // Example - Add configurations for other ceTypes here
        icon: 'fa-solid fa-question', // Default icon if "AnotherType" is actually used
        modal_config: {
            fields: DEFAULT_FIELDS_CONFIG, // Fallback to DEFAULT_FIELDS_CONFIG
            explanation: "Generic Conditional Element.", // Default explanation
            ai_context: "Provide general information." // Default AI context
        },
        tabulator_config: DEFAULT_TABULATOR_CONFIG // Fallback to DEFAULT_TABULATOR_CONFIG
    }
};

// --- End of NODES Definition ---


document.addEventListener('DOMContentLoaded', setupEventListeners);

/**
 * Sets up event listeners for CE pills after the DOM is loaded.
 */
function setupEventListeners() {
    console.log("setupEventListeners() - Adding event listeners to CE pills");
    document.querySelectorAll('.ce-pill').forEach(pill => {
        console.log("setupEventListeners() - Processing pill:", pill);
        pill.removeEventListener('click', handleCEPillClick); // Prevent duplicate listeners
        pill.addEventListener('click', handleCEPillClick);
        pill.title = 'Double-click to open Conditional Element'; // Tooltip for CE pills
    });
    console.log("setupEventListeners() - Event listeners added.");
}

/**
 * Handles the click event on a CE pill. Fetches and displays the CE modal.
 * @param {Event} event - The click event object.
 */
async function handleCEPillClick(event) {
    event.preventDefault(); // Prevent default link behavior if pill is an <a> tag
    event.stopPropagation(); // Stop event from bubbling up

    console.log("handleCEPillClick() - CE Pill Clicked!", event.target);

    // Remove any existing modal to prevent stacking
    const existingModal = document.querySelector('.modal.fade.show');
    if (existingModal) {
        console.log("handleCEPillClick() - Found existing modal, removing it:", existingModal);
        existingModal.remove();
    } else {
        console.log("handleCEPillClick() - No existing modal found.");
    }

    const ceId = event.target.dataset.ceId;
    const ceType = event.target.dataset.ceType || "Default";
    const iconClass = NODES[ceType]?.icon || 'fa-spinner'; // Fallback icon if type not defined
    const cosContentCell = event.target.closest('.cos-card')?.querySelector('.cos-content-display');
    const cosContent = cosContentCell ? cosContentCell.innerHTML : ''; // Get COS content from display div
    const phaseElement = event.target.closest('.accordion-item');
    const phaseName = phaseElement?.querySelector('.accordion-header button')?.innerText.trim(); // Get phase name from accordion header
    const phaseIndex = phaseElement ? Array.from(phaseElement.parentElement.children).indexOf(phaseElement) : 0; // Get phase index in accordion
    const ssolGoal = document.querySelector('#ssol-goal')?.textContent.trim() || "Goal Not Found"; // Get SSOL goal from hidden div

    const requestData = { // Data to send to the server to fetch modal content
        ce_id: ceId,
        cos_content: cosContent,
        phase_name: phaseName,
        phase_index: phaseIndex,
        ssol_goal: ssolGoal
    };

    showLoadingSpinner(`Loading ${ceType} data...`, iconClass); // Show loading spinner with CE type and icon
    try {
        const response = await fetch(`/get_ce_modal/${encodeURIComponent(ceType)}`, { // Fetch modal HTML from server
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            console.error("handleCEPillClick() - Fetch Response NOT OKAY:", response);
            throw new Error(`Network response was not ok: ${response.status}`); // Handle HTTP errors
        }

        const data = await response.json(); // Parse JSON response
        hideLoadingSpinner(); // Hide loading spinner after response

        if (data && data.modal_html) {
            console.log("handleCEPillClick() - Received modal_html, displaying modal:", data);
            displayCEModal(data.modal_html, ceId, ceType, cosContent, phaseName, phaseIndex, data.ai_generated_data, data.table_data, data.tabulator_columns, ssolGoal); // Display the modal
        } else {
            console.error(`CE type "${ceType}" not found or invalid response:`, data);
            alert('Error fetching CE Data'); // Alert user if modal content is missing or invalid
        }
    } catch (error) {
        hideLoadingSpinner(); // Ensure spinner is hidden even on error
        console.error(`handleCEPillClick() - Fetch ERROR: ${error}`);
        console.error('Error fetching modal content:', error);
        alert('Error fetching CE Data'); // Alert user on fetch error
    }
}

/**
 * Defines the Tabulator table columns based on the CE type.
 * @param {string} ceType - The type of Conditional Element.
 * @returns {Array<object>} - An array of Tabulator column definitions.
 */
function tabulatorColumnsDefinition(ceType) {
    const defaultColumns = [ // Default columns common to all CE types
        { formatter: "rowSelection", titleFormatter: "rowSelection", hozAlign: "center", headerSort: false, width: 40, resizable: false, cellClick: (e, cell) => cell.getRow().toggleSelect() }, // Row selection checkbox
        {
            title: "Source",
            field: "source_url",
            formatter: "link", // Format as a hyperlink
            formatterParams: {
                labelField: "source_title", // Display source_title as link text
                target: "_blank", // Open links in a new tab
            },
            headerSort: false, // Disable header sorting for source column
        },
        { title: "Snippet", field: "source_snippet", headerSort: false, formatter: "textarea" }, // Format snippet as textarea for better readability
    ];

    // Add CE-type specific columns from NODES configuration if available
    const nodeConfig = NODES && NODES[ceType] ? NODES[ceType].tabulator_config : undefined;
    const additionalColumns = nodeConfig && nodeConfig.columns ? nodeConfig.columns : [];

    return [...defaultColumns, ...additionalColumns]; // Combine default and CE-type specific columns
}


/**
 * Displays the Conditional Element modal with dynamic content.
 * @param {string} modalHtml - HTML content for the modal.
 * @param {string} ceId - ID of the Conditional Element.
 * @param {string} p_ceType - Type of the Conditional Element.
 * @param {string} cosContent - Content of the Condition of Satisfaction.
 * @param {string} p_phaseName - Name of the phase.
 * @param {number} phaseIndex - Index of the phase.
 * @param {object} aiGeneratedData - AI-generated data for the modal.
 * @param {Array<object>} tableData - Data for the Tabulator table.
 * @param {Array<object>} _tabulatorColumns - (Not directly used, columns are generated dynamically).
 * @param {string} ssolGoal - The overall SSPEC goal.
 */
function displayCEModal(modalHtml, ceId, p_ceType, cosContent, p_phaseName, phaseIndex, aiGeneratedData = { fields: {} }, tableData = [], _tabulatorColumns, ssolGoal) {
    const modalContainer = document.getElementById('dynamicModalContainer');
    if (!modalContainer) {
        console.error('Modal container element not found.');
        return;
    }

    const phaseColors = ["#e91e63", "#00bcd4", "#9c27b0", "#ffc107", "#66bd0e"]; // Phase color palette
    const phaseColor = phaseColors[phaseIndex % phaseColors.length]; // Cycle through phase colors
    const fieldsConfig = NODES[p_ceType]?.modal_config.fields || DEFAULT_FIELDS_CONFIG; // Get form fields config from NODES or use default
    const iconClass = NODES[p_ceType]?.icon || 'fa-solid fa-icons'; // Get icon class from NODES or use default

    // Construct the modal HTML using template literals
    const wrappedModalHtml = `
        <div class="modal fade ceModal" id="ceModal-${ceId}" tabindex="-1" aria-labelledby="ceModalLabel-${ceId}" aria-hidden="true">
            <div class="modal-dialog modal-lg" role="document">
                <div class="modal-content">
                    <div class="modal-header" style="background-color: ${phaseColor};">
                        <div class="node-icon me-2"><i class="${iconClass}"></i></div> <h5 class="modal-title ce-title" id="ceModalLabel-${ceId}">
                            ${p_ceType.replace(/_/g, ' ').toUpperCase()} - ${p_phaseName.toUpperCase()} PHASE
                        </h5>
                        <button type="button" class="btn-close close-button" data-bs-dismiss="modal" aria-label="Close">×</button>
                    </div>
                    <div class="modal-body">
                        <p><span class="context-label">Source COS:</span>${cosContent}</p>
                        <p><span class="context-label">${p_ceType}:</span> ${aiGeneratedData.contextual_description || 'No description.'}</p>
                        <div id="dynamicTable-${ceId}" class="tabulator-table mb-3"></div>
                        <div class="row justify-content-start mb-3">
                            <div class="col-auto">
                                <button type="button" class="btn btn-sm btn-danger" id="deleteSelectedRowsButton-${ceId}">Delete</button>
                                <button type="button" class="btn btn-sm btn-secondary" id="duplicateSelectedRowsButton-${ceId}">Duplicate</button>
                            </div>
                        </div>
                        <form id="ceForm-${ceId}">${generateFormFields(fieldsConfig, aiGeneratedData.fields)}</form>
                        <div class="row mt-2">
                            <div class="col"><button type="button" class="btn btn-success w-100" id="addRowButton-${ceId}">Add ${p_ceType}</button></div>
                            <div class="col"><button type="button" class="btn btn-primary w-100" id="generateRowButton-${ceId}">Generate ${p_ceType}</button></div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary btn-save-changes" data-ce-id="${ceId}">Save</button>
                    </div>
                </div>
            </div>
        </div>`;

    modalContainer.innerHTML = wrappedModalHtml; // Set modal container HTML

    const modalElement = modalContainer.querySelector(`#ceModal-${ceId}`); // Get the modal element
    if (!modalElement) {
        console.error(`Modal element not found for CE ID: ${ceId}`);
        return;
    }

    const modal = new bootstrap.Modal(modalElement); // Initialize Bootstrap modal
    modal.show(); // Show the modal

    const tabulatorColumns = tabulatorColumnsDefinition(p_ceType); // Get column definitions for Tabulator

    modalElement.addEventListener('shown.bs.modal', () => { // Initialize Tabulator when modal is fully shown
        const tableElementId = `#dynamicTable-${ceId}`;
        const tableElement = document.querySelector(tableElementId);

        if (tableElement) {
            tableElement.innerHTML = ''; // Clear any existing Tabulator instance
        }
        initializeTabulatorTable(tableElementId, tableData, tabulatorColumns, p_ceType, modalElement); // Initialize Tabulator table
    });


    modalElement.addEventListener('hidden.bs.modal', () => { // Handle modal close event
        if (modalElement.dataset.hasUnsavedChanges === 'true' && !confirm('You have unsaved changes. Close anyway?')) {
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) {
                modalInstance.show(); // Re-show modal if unsaved changes and user cancels close
            }
        } else {
            setupEventListeners(); // Re-setup CE pill event listeners after modal close
        }
    });

    const attribution = aiGeneratedData.attribution || ''; // Get attribution from AI data
    if (attribution) {
        const attributionElement = document.createElement('p');
        attributionElement.classList.add('text-muted', 'small', 'mt-2'); // Add CSS classes for styling
        attributionElement.textContent = attribution; // Set attribution text
        modalElement.querySelector('.modal-body').appendChild(attributionElement); // Append attribution to modal body
    }

    setupModalEventListeners(modalElement, ceId, p_ceType, cosContent, p_phaseName, ssolGoal); // Setup modal specific event listeners (buttons, form)
}

/**
 * Initializes the Tabulator table within the modal.
 * @param {string} tableSelector - CSS selector for the table element.
 * @param {Array<object>} tableData - Data for the table.
 * @param {Array<object>} tabulatorColumns - Column definitions for the table.
 * @param {string} ceType - Type of the Conditional Element.
 * @param {HTMLElement} modalElement - The modal element itself.
 * @returns {Tabulator|null} - The initialized Tabulator table instance or null on error.
 */
function initializeTabulatorTable(tableSelector, tableData, tabulatorColumns, ceType, modalElement) {
    const tableElement = document.querySelector(tableSelector);
    if (!tableElement) {
        console.error('Table element not found:', tableSelector);
        return null;
    }

    const initialData = tableData.length > 0 ? tableData : []; // Use provided table data or empty array

    try {
        const table = new Tabulator(tableSelector, { // Initialize Tabulator
            data: initialData,
            layout: "fitColumns", // Fit columns to table width
            movableColumns: true, // Allow column reordering
            resizableRows: true, // Allow row resizing
            selectable: true, // Enable row selection
            reactiveData: true, // Enable reactive data updates
            placeholder: `Add or Generate ${ceType}`, // Placeholder text when table is empty
            columns: tabulatorColumns, // Use dynamically defined columns
        });
        modalElement._tabulator = table; // Attach Tabulator instance to the modal element for later access
        return table; // Return the Tabulator instance
    } catch (error) {
        console.error('Error initializing Tabulator:', error);
        return null; // Return null if Tabulator initialization fails
    }
}


/**
 * Generates HTML form fields based on the fields configuration.
 * @param {Array<object>} fieldsConfig - Configuration for form fields.
 * @param {object} aiData - AI-generated data to pre-populate fields.
 * @returns {string} - HTML string of form fields.
 */
function generateFormFields(fieldsConfig, aiData = {}) {
    if (!fieldsConfig) {
        console.error("No fieldsConfig provided.");
        return 'No form fields.'; // Return a message if no fields are configured
    }
    return fieldsConfig.map(field => { // Map each field config to a form field HTML string
        const fieldValue = aiData[field.name] || ''; // Get AI data for the field or default to empty string
        const placeholder = field.placeholder || ''; // Get placeholder from config or default to empty string
        const fieldType = field.type || 'text'; // Get field type from config or default to 'text'

        switch (fieldType) { // Generate different HTML based on field type
            case 'textarea':
                return `<div class="form-group">
                            <label for="${field.name}">${placeholder}</label>
                            <textarea class="form-control" id="${field.name}" name="${field.name}" placeholder="${placeholder}" rows="3">${fieldValue}</textarea>
                        </div>`;
            case 'select': // (Example - not fully implemented in provided NODES config)
                 const options = field.options || [];
                 const optionsHtml = options.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('');
                 return `<div class="form-group">
                            <label for="${field.name}">${placeholder}</label>
                            <select class="form-control" id="${field.name}" name="${field.name}">${optionsHtml}</select>
                        </div>`;
            default: // Default to text input for unknown types
                return `<div class="form-group">
                            <label for="${field.name}">${placeholder}</label>
                            <input type="${fieldType}" class="form-control" id="${field.name}" name="${field.name}" placeholder="${placeholder}" value="${fieldValue}">
                        </div>`;
        }
    }).join(''); // Join all field HTML strings together
}

/**
 * Clears all input fields within a given form.
 * @param {string} formSelector - CSS selector for the form element.
 */
function clearFormFields(formSelector) {
    const form = document.querySelector(formSelector);
    if (form) {
        form.querySelectorAll('input, textarea, select').forEach(field => { // Select all input types
            if (field.type !== 'checkbox' && field.type !== 'radio') { // Skip checkboxes and radios
                field.value = ''; // Clear the value of other input types
            }
        });
    }
}

/**
 * Sets up event listeners for buttons and form interactions within the modal.
 * @param {HTMLElement} modalElement - The modal element.
 * @param {string} ceId - ID of the Conditional Element.
 * @param {string} p_ceType - Type of the Conditional Element.
 * @param {string} cosContent - Content of the Condition of Satisfaction.
 * @param {string} p_phaseName - Name of the phase.
 * @param {string} ssolGoal - The overall SSPEC goal.
 */
function setupModalEventListeners(modalElement, ceId, p_ceType, cosContent, p_phaseName, ssolGoal) {
    const addRowButton = modalElement.querySelector(`#addRowButton-${ceId}`);
    const generateRowButton = modalElement.querySelector(`#generateRowButton-${ceId}`);
    const saveChangesButton = modalElement.querySelector('.btn-save-changes');
    const deleteSelectedRowsButton = modalElement.querySelector(`#deleteSelectedRowsButton-${ceId}`);
    const duplicateSelectedRowsButton = modalElement.querySelector(`#duplicateSelectedRowsButton-${ceId}`);

    const table = modalElement._tabulator; // Get Tabulator instance attached to modal

    if (generateRowButton) {
        generateRowButton.addEventListener('click', () => { // Event listener for "Generate" button
            generateFieldsFromAI(ceId, p_ceType, cosContent, ssolGoal); // Trigger AI data generation
        });
    }

    modalElement.addEventListener('input', () => { // Track changes in modal form/table for "unsaved changes" detection
        modalElement.dataset.hasUnsavedChanges = 'true';
    });

    modalElement.addEventListener('hidden.bs.modal', () => { // Handle modal hidden event (close)
        if (modalElement.dataset.hasUnsavedChanges === 'true' && !confirm('You have unsaved changes. Close anyway?')) {
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) {
                modalInstance.show(); // Re-show modal if unsaved changes and user cancels close
            }
        } else {
            modalElement.dataset.hasUnsavedChanges = 'false'; // Reset unsaved changes flag
            setupEventListeners(); // Re-initialize CE pill event listeners
        }
    });

    if (addRowButton) {
        addRowButton.addEventListener('click', () => { // Event listener for "Add Row" button
            const table = modalElement._tabulator;
            const form = modalElement.querySelector(`#ceForm-${ceId}`);
            const formData = new FormData(form); // Get form data
            const rowData = {};
            let isAnyFieldFilled = false;

            formData.forEach((value, key) => { // Process form data
                if (value.trim() !== "") {
                    isAnyFieldFilled = true; // Check if at least one field is filled
                }
                rowData[key] = value; // Populate rowData object
            });

            if (!isAnyFieldFilled) {
                alert("Please fill in at least one field before adding a row."); // Alert if no fields are filled
                return;
            }

            const rows = table.getRows();
            let emptyRow = rows.find(row => Object.values(row.getData()).every(val => val === '')); // Check for existing empty row

            if (emptyRow) {
                emptyRow.update(rowData); // Update existing empty row
            } else {
                table.addRow(rowData, true); // Add new row if no empty row exists
            }

            clearFormFields(`#ceForm-${ceId}`); // Clear the form after adding row
            modalElement.dataset.hasUnsavedChanges = 'true'; // Set unsaved changes flag
        });
    }

    if (saveChangesButton) {
        saveChangesButton.addEventListener('click', () => { // Event listener for "Save Changes" button
            saveCEChanges(ceId); // Save CE changes to server and update UI
            modalElement.dataset.hasUnsavedChanges = 'false'; // Reset unsaved changes flag
        });
    }

    if (deleteSelectedRowsButton) {
        deleteSelectedRowsButton.addEventListener('click', () => { // Event listener for "Delete Selected" button
            const table = modalElement._tabulator;
            if (table) {
                const selectedRows = table.getSelectedRows(); // Get selected rows
                selectedRows.forEach(row => row.delete()); // Delete selected rows from table
                modalElement.dataset.hasUnsavedChanges = 'true'; // Set unsaved changes flag
            }
        });
    }

    if (duplicateSelectedRowsButton) {
        duplicateSelectedRowsButton.addEventListener('click', () => { // Event listener for "Duplicate Selected" button
            const table = modalElement._tabulator;
            if (table) {
                const selectedRows = table.getSelectedRows(); // Get selected rows
                selectedRows.forEach(row => {
                    const rowData = row.getData(); // Get data of selected row
                    table.addRow({...rowData}); // Add a duplicate row with the same data
                });
                modalElement.dataset.hasUnsavedChanges = 'true'; // Set unsaved changes flag
            }
        });
    }
}

/**
 * Saves changes made in the CE modal to the server and updates the UI.
 * @param {string} ceId - ID of the Conditional Element.
 */
function saveCEChanges(ceId) {
    const modalElement = document.querySelector(`#ceModal-${ceId}`);
    const table = modalElement._tabulator;
    const tableData = table ? table.getData() : []; // Get table data if Tabulator is initialized
    const nonNullRows = tableData.filter(row => // Filter out rows where all values are null/empty
        Object.values(row).some(value => value !== null && (typeof value === 'string' ? value.trim() !== '' : value !== ''))
    );

    const updatedData = { // Prepare data to send to server
        table_data: nonNullRows, // Table data (filtered non-null rows)
        form_data: getFormData(modalElement.querySelector(`#ceForm-${ceId}`)) // Form data from modal form
    };

    fetch(`/update_ce/${encodeURIComponent(ceId)}`, { // Send PUT request to update CE data on server
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.status}`); // Handle HTTP errors
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            console.log(`CE ID ${ceId} updated successfully`);
            updateCEPills(ceId, nonNullRows.length); // Update CE pill counter in UI
            setupEventListeners(); // Re-initialize CE pill event listeners
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) {
                modalInstance.hide(); // Hide the modal after successful save
            }


        } else {
            console.error('Error updating CE:', data.error);
            alert(`Error updating CE: ${data.error}`); // Alert user on server-side error
        }
    })
    .catch(error => {
        console.error('Error updating CE:', error);
        alert(`An error occurred: ${error.message}`); // Alert user on client-side error
    });
}

/**
 * Extracts form data from a given form element.
 * @param {HTMLFormElement} form - The form element.
 * @returns {object} - An object containing form data (key-value pairs).
 */
function getFormData(form) {
    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => { data[key] = value; }); // Convert FormData to a plain JavaScript object
    return data;
}

/**
 * Updates the counter badge on CE pills to reflect the number of resources.
 * @param {string} ceId - ID of the Conditional Element.
 * @param {number} resourceCount - Number of resources associated with the CE.
 */
function updateCEPills(ceId, resourceCount) {
    const cePills = document.querySelectorAll(`.ce-pill[data-ce-id="${ceId}"]`); // Select all pills with the given CE ID
    cePills.forEach(cePill => {
        const ceText = cePill.textContent.replace(/\(\d+\)$/, '').trim(); // Remove existing counter from pill text
        cePill.innerHTML = ''; // Clear pill content to rebuild

        const textNode = document.createTextNode(ceText); // Create text node for pill text
        cePill.appendChild(textNode); // Append text node to pill

        if (resourceCount > 0) {
            const tally = document.createElement('span');
            tally.className = 'badge rounded-pill bg-light text-dark ms-2 counter'; // Style for counter badge
            tally.textContent = resourceCount.toString(); // Set counter text
            cePill.appendChild(tally); // Append counter badge to pill
        }
        cePill.addEventListener('click', handleCEPillClick); // Re-attach click event listener to pill
    });
}


/**
 * Generates form fields and table data using AI for a specific CE type.
 * @param {string} ceId - ID of the Conditional Element.
 * @param {string} ceType - Type of the Conditional Element.
 * @param {string} cosContent - Content of the Condition of Satisfaction.
 * @param {string} ssolGoal - The overall SSPEC goal.
 */
async function generateFieldsFromAI(ceId, ceType, cosContent, ssolGoal) {
    const form = document.querySelector(`#ceForm-${ceId}`);
    if (!form) {
        console.error(`Form not found for CE ID: ${ceId}`);
        return;
    }

    // Collect existing CEs (excluding the current one) for context
    const existingCEs = Array.from(document.querySelectorAll('.ce-pill'))
        .filter(pill => pill.dataset.ceId !== ceId) // Exclude current CE pill
        .map(pill => ({
            id: pill.dataset.ceId,
            type: pill.dataset.ceType,
            content: pill.textContent.trim() // Get text content of the pill
        }));

    const requestData = { // Data to send to server for AI generation
        ce_id: ceId,
        ce_type: ceType,
        cos_content: cosContent,
        ssol_goal: ssolGoal,
        existing_ces: existingCEs // Include existing CEs for context
    };

    showLoadingSpinner(`Generating ${ceType}...`); // Show loading spinner during AI call
    try {
        const response = await fetch('/ai-query-endpoint', { // Fetch AI-generated data from server
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.status}`); // Handle HTTP errors
        }

        const data = await response.json(); // Parse JSON response
        hideLoadingSpinner(); // Hide loading spinner after response

        if (data && data.ai_response) {
            populateFormFields(ceId, data.ai_response.fields); // Populate form fields with AI data

            const tableElementId = `#dynamicTable-${ceId}`;
            const modalElement = document.querySelector(`#ceModal-${ceId}`); // Get modal element (needed for table init)
            const table = initializeTabulatorTable(tableElementId, [], tabulatorColumnsDefinition(ceType), ceType, modalElement); // Initialize Tabulator table (empty initially)

            if (data.ai_response.table_data && Array.isArray(data.ai_response.table_data)) {
                table.setData(data.ai_response.table_data); // Set table data if provided in AI response
            }

        } else {
            console.error('AI response not found or error in response:', data);
        }
    } catch (error) {
        hideLoadingSpinner(); // Ensure spinner is hidden even on error
        console.error('Error generating fields from AI:', error);
    }
}

/**
 * Populates form fields with AI-generated data.
 * @param {string} ceId - ID of the Conditional Element.
 * @param {object} aiData - AI-generated data for form fields.
 */
function populateFormFields(ceId, aiData) {
    const form = document.querySelector(`#ceForm-${ceId}`);
    if (form && aiData) {
        Object.keys(aiData).forEach(fieldName => { // Iterate through AI data fields
            const input = form.querySelector(`[name="${fieldName}"]`); // Find corresponding input field in form
            if (input) {
                input.value = aiData[fieldName] || ''; // Set input value from AI data or default to empty
            }
        });
    }
}


export { displayCEModal };