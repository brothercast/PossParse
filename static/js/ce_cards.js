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
// Defines configuration for different Conditional Element (CE) types.
const NODES = {
    "Default": {
        icon: 'fa-spinner',
        modal_config: {
            fields: DEFAULT_FIELDS_CONFIG, // Use DEFAULT_FIELDS_CONFIG here
            explanation: "Default Resource Node.",
            ai_context: "Provide general information."
        },
        tabulator_config: DEFAULT_TABULATOR_CONFIG // Use DEFAULT_TABULATOR_CONFIG here
    },
    // ... (Your other CE type definitions - Research, Stakeholder, etc.)
    "Research": {
        "definition": "Aggregates and summarizes research materials.",
        "icon": "fa-solid fa-flask",
        "modal_config": {
            "fields": [
                {"type": "text", "name": "research_topic", "placeholder": "Research Topic"},
                {"type": "textarea", "name": "research_summary", "placeholder": "Research Summary"},
                {"type": "text", "name": "research_website", "placeholder": "Research Website"}
            ],
            "explanation": "Capture relevant research aspects of the node.",
            "ai_context": "Provide detailed research information."
        },
        "tabulator_config": {
            "columns": [
                {"title": "Research Topic", "field": "research_topic", "editor": "input"},
                {"title": "Research Summary", "field": "research_summary", "editor": "textarea"},
                {"title": "Research Website", "field": "research_website", "editor": "input"}
            ]
        }
    },
    "Stakeholder": {
        "definition": "Captures details of stakeholders involved.",
        "icon": "fa-solid fa-user-friends",
        "modal_config": {
            "fields": [
                {"type": "text", "name": "stakeholder_name", "placeholder": "Stakeholder Name"},
                {"type": "textarea", "name": "stakeholder_role", "placeholder": "Stakeholder Role"},
                {"type": "email", "name": "stakeholder_email", "placeholder": "Stakeholder Email"},
                {"type": "text", "name": "stakeholder_phone", "placeholder": "Stakeholder Phone"},
            ],
            "explanation": "Detail stakeholder roles and contact information.",
            "ai_context": "Identify and provide details of stakeholders."
        },
        "tabulator_config": {
            "columns": [
                {"title": "Stakeholder Name", "field": "stakeholder_name", "editor": "input"},
                {"title": "Stakeholder Role", "field": "stakeholder_role", "editor": "textarea"},
                {"title": "Stakeholder Email", "field": "stakeholder_email", "editor": "input"},
                {"title": "Stakeholder Phone", "field": "stakeholder_phone", "editor": "input"},
            ]
        }
    },
  "Advocacy": {
        "definition": "Focuses on efforts to influence public policy.",
        "icon": "fa-solid fa-bullhorn",
        "modal_config": {
            "fields": [
                {"type": "text", "name": "campaign_name", "placeholder": "Campaign Name"},
                {"type": "textarea", "name": "campaign_objective", "placeholder": "Campaign Objective"},
                {"type": "text", "name": "target_audience", "placeholder": "Target Audience"}
            ],
            "explanation": "Detail the advocacy campaign's objectives and target audience.",
            "ai_context": "Provide information on advocacy efforts."
        },
        "tabulator_config": {
            "columns": [
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
            "fields": [
                {"type": "text", "name": "resource_name", "placeholder": "Resource Name"},
                {"type": "textarea", "name": "resource_details", "placeholder": "Resource Details"},
                {"type": "text", "name": "resource_type", "placeholder": "Resource Type"}
            ],
            "explanation": "Provide details about required resources.",
            "ai_context": "List and detail resources or assets."
        },
        "tabulator_config": {
            "columns": [
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
            "fields": [
                {"type": "text", "name": "action_name", "placeholder": "Action Name"},
                {"type": "textarea", "name": "action_description", "placeholder": "Action Description"},
                {"type": "text", "name": "responsible_person", "placeholder": "Responsible Person"}
            ],
            "explanation": "Specify tasks or actions required.",
            "ai_context": "Detail actions or tasks."
        },
        "tabulator_config": {
            "columns": [
                {"title": "Action Name", "field": "action_name", "editor": "input"},
                {"title": "Action Description", "field": "action_description", "editor": "textarea"},
                {"title": "Responsible Person", "field": "responsible_person", "editor": "input"}
            ]
        }
    },
    "Timeline": {
        "definition": "Specifies time frames or deadlines.",
        "icon": "fa-solid fa-clock",
        "modal_config": {
            "fields": [
                {"type": "text", "name": "time_frame", "placeholder": "Time Frame"},
                {"type": "date", "name": "start_date", "placeholder": "Start Date"},
                {"type": "date", "name": "end_date", "placeholder": "End Date"}
            ],
            "explanation": "Provide time-related information.",
            "ai_context": "Detail time frames or deadlines."
        },
        "tabulator_config": {
            "columns": [
                {"title": "Time Frame", "field": "time_frame", "editor": "input"},
                {"title": "Start Date", "field": "start_date", "editor": "input"},
                {"title": "End Date", "field": "end_date", "editor": "input"}
            ]
        }
    },
    "Collaboration": {
        "definition": "Focuses on partnerships or collaboration efforts.",
        "icon": "fa-solid fa-handshake",
        "modal_config": {
            "fields": [
                {"type": "text", "name": "partner_name", "placeholder": "Partner Name"},
                {"type": "textarea", "name": "collaboration_details", "placeholder": "Collaboration Details"},
                {"type": "text", "name": "contact_person", "placeholder": "Contact Person"}
            ],
            "explanation": "Outline collaboration efforts.",
            "ai_context": "Detail partnerships or collaboration efforts."
        },
        "tabulator_config": {
            "columns": [
                {"title": "Partner Name", "field": "partner_name", "editor": "input"},
                {"title": "Collaboration Details", "field": "collaboration_details", "editor": "textarea"},
                {"title": "Contact Person", "field": "contact_person", "editor": "input"}
            ]
        }
    },
    "Policy": {
        "definition": "Addresses policy or regulatory aspects.",
        "icon": "fa-solid fa-gavel",
        "modal_config": {
            "fields": [
                {"type": "text", "name": "policy_name", "placeholder": "Policy Name"},
                {"type": "textarea", "name": "policy_details", "placeholder": "Policy Details"},
                {"type": "text", "name": "regulatory_body", "placeholder": "Regulatory Body"}
            ],
            "explanation": "Detail policies or regulations.",
            "ai_context": "Provide information on policies."
        },
        "tabulator_config": {
            "columns": [
                {"title": "Policy Name", "field": "policy_name", "editor": "input"},
                {"title": "Policy Details", "field": "policy_details", "editor": "textarea"},
                {"title": "Regulatory Body", "field": "regulatory_body", "editor": "input"}
            ]
        }
    },
    "Legislation": {
        "definition": "Covers legal considerations or requirements.",
        "icon": "fa-solid fa-balance-scale",
        "modal_config": {
            "fields": [
                {"type": "textarea", "name": "legal_requirements", "placeholder": "Legal Requirements"},
                {"type": "text", "name": "relevant_legislation", "placeholder": "Relevant Legislation"},
                {"type": "text", "name": "compliance_officer", "placeholder": "Compliance Officer"}
            ],
            "explanation": "Detail legal considerations.",
            "ai_context": "Provide information on legal considerations."
        },
        "tabulator_config": {
            "columns": [
                {"title": "Legal Requirements", "field": "legal_requirements", "editor": "textarea"},
                {"title": "Relevant Legislation", "field": "relevant_legislation", "editor": "input"},
                {"title": "Compliance Officer", "field": "compliance_officer", "editor": "input"}
            ]
        }
    },
    "Environment": {
        "definition": "Addresses environmental factors.",
        "icon": "fa-solid fa-leaf",
        "modal_config": {
            "fields": [
                {"type": "text", "name": "environmental_factor", "placeholder": "Environmental Factor"},
                {"type": "textarea", "name": "impact_assessment", "placeholder": "Impact Assessment"},
                {"type": "text", "name": "mitigation_strategy", "placeholder": "Mitigation Strategy"}
            ],
            "explanation": "Detail environmental factors and their impact.",
            "ai_context": "Provide information on environmental factors."
        },
        "tabulator_config": {
            "columns": [
                {"title": "Environmental Factor", "field": "environmental_factor", "editor": "input"},
                {"title": "Impact Assessment", "field": "impact_assessment", "editor": "textarea"},
                {"title": "Mitigation Strategy", "field": "mitigation_strategy", "editor": "input"}
            ]
        }
    },
    "Risk": {
        "definition": "Identifies potential risks and mitigation strategies.",
        "icon": "fa-solid fa-exclamation-triangle",
        "modal_config": {
            "fields": [
                {"type": "text", "name": "risk_name", "placeholder": "Risk Name"},
                {"type": "textarea", "name": "risk_description", "placeholder": "Risk Description"},
                {"type": "text", "name": "mitigation_plan", "placeholder": "Mitigation Plan"}
            ],
            "explanation": "Detail potential risks and strategies to mitigate them.",
            "ai_context": "Identify potential risks and provide mitigation strategies."
        },
        "tabulator_config": {
            "columns": [
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
            "fields": [
                {"type": "text", "name": "opportunity_name", "placeholder": "Opportunity Name"},
                {"type": "textarea", "name": "opportunity_description", "placeholder": "Opportunity Description"},
                {"type": "text", "name": "exploitation_plan", "placeholder": "Exploitation Plan"}
            ],
            "explanation": "Detail opportunities and strategies to capitalize on them.",
            "ai_context": "Identify opportunities and provide strategies."
        },
        "tabulator_config": {
            "columns": [
                {"title": "Opportunity Name", "field": "opportunity_name", "editor": "input"},
                {"title": "Opportunity Description", "field": "opportunity_description", "editor": "textarea"},
                {"title": "Exploitation Plan", "field": "exploitation_plan", "editor": "input"}
            ]
        }
    },
    "AnotherType": {
        icon: 'fa-solid fa-question', // A default icon
        modal_config: {
            fields: DEFAULT_FIELDS_CONFIG,
            explanation: "Generic Conditional Element.",
            ai_context: "Provide general information."
        },
        tabulator_config: DEFAULT_TABULATOR_CONFIG
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
    event.preventDefault();
    event.stopPropagation();

    console.log("handleCEPillClick() - CE Pill Clicked!", event.target);

    // Remove existing modal (if any)
    const existingModal = document.querySelector('.modal.fade.show');
    if (existingModal) {
        console.log("handleCEPillClick() - Found existing modal, removing it:", existingModal);
        existingModal.remove();
    } else {
        console.log("handleCEPillClick() - No existing modal found.");
    }

    const ceId = event.target.dataset.ceId;
    const ceType = event.target.dataset.ceType || "Default";
    const iconClass = NODES[ceType]?.icon || 'fa-spinner';
    const cosContentCell = event.target.closest('.cos-card')?.querySelector('.cos-content-display');
    const cosContent = cosContentCell ? cosContentCell.innerHTML : '';
    const phaseElement = event.target.closest('.accordion-item');
    const phaseName = phaseElement?.querySelector('.accordion-header button')?.innerText.trim();
    const phaseIndex = phaseElement ? Array.from(phaseElement.parentElement.children).indexOf(phaseElement) : 0;
    const ssolGoal = document.querySelector('#ssol-goal')?.textContent.trim() || "Goal Not Found";

    const requestData = {
        ce_id: ceId,
        cos_content: cosContent,
        phase_name: phaseName,
        phase_index: phaseIndex,
        ssol_goal: ssolGoal
    };

    showLoadingSpinner(`Loading ${ceType} data...`, iconClass);
    try {
        const response = await fetch(`/get_ce_modal/${encodeURIComponent(ceType)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            console.error("handleCEPillClick() - Fetch Response NOT OKAY:", response);
            throw new Error(`Network response was not ok: ${response.status}`);
        }

        const data = await response.json();
        hideLoadingSpinner();

        if (data && data.modal_html) {
            console.log("handleCEPillClick() - Received modal_html, displaying modal:", data);
             // Call displayCEModal *WITHOUT* passing tableData and _tabulatorColumns initially.
            displayCEModal(data.modal_html, ceId, ceType, cosContent, phaseName, phaseIndex, data.ai_generated_data, [], [], ssolGoal);
        } else {
            console.error(`CE type "${ceType}" not found or invalid response:`, data);
            alert('Error fetching CE Data');
        }
    } catch (error) {
        hideLoadingSpinner();
        console.error(`handleCEPillClick() - Fetch ERROR: ${error}`);
        alert('Error fetching CE Data');
    }
}

/**
 * Defines the Tabulator table columns based on the CE type.
 * @param {string} ceType - The type of Conditional Element.
 * @returns {Array<object>} - An array of Tabulator column definitions.
 */
function tabulatorColumnsDefinition(ceType) {
    const defaultColumns = [
        { formatter: "rowSelection", titleFormatter: "rowSelection", hozAlign: "center", headerSort: false, width: 40, resizable: false, cellClick: (e, cell) => cell.getRow().toggleSelect() },
        {
            title: "Source",
            field: "source_url",
            formatter: "link",
            formatterParams: {
                labelField: "source_title",
                target: "_blank",
            },
            headerSort: false,
        },
        { title: "Snippet", field: "source_snippet", headerSort: false, formatter: "textarea" },
    ];

    const nodeConfig = NODES && NODES[ceType] ? NODES[ceType].tabulator_config : undefined;
    const additionalColumns = nodeConfig && nodeConfig.columns ? nodeConfig.columns : [];

    return [...defaultColumns, ...additionalColumns];
}


/**
 * Displays the Conditional Element modal, handling DOM insertion and event listeners.
 * @param {string} modalHtml The HTML content of the modal.
 * @param {string} ceId The ID of the conditional element.
 * @param {string} p_ceType The type of the conditional element.
 * @param {string} cosContent The content of the related condition of satisfaction.
 * @param {string} p_phaseName The name of the current phase.
 * @param {number} phaseIndex The index of the current phase.
 * @param {object} aiGeneratedData The AI-generated data for the CE (optional).
 * @param {object[]} tableData The initial data for the tabulator table.
 * @param {object[]} _tabulatorColumns // Now unused.
 * @param {string} ssolGoal The goal of the structured solution.
 */
function displayCEModal(modalHtml, ceId, p_ceType, cosContent, p_phaseName, phaseIndex, aiGeneratedData = { fields: {} }, tableData = [], _tabulatorColumns, ssolGoal) {
    const modalContainer = document.getElementById('dynamicModalContainer');
    if (!modalContainer) {
        console.error('Modal container element (#dynamicModalContainer) not found.');
        return;
    }

    console.log("displayCEModal - Received ceId:", ceId);
    console.log("displayCEModal - Received p_ceType:", p_ceType);

    modalContainer.innerHTML = modalHtml;
    console.log("displayCEModal - Set modalContainer.innerHTML from modalHtml");

    // Log the *entire* innerHTML of the modalContainer to see exactly what's there
    console.log("displayCEModal - modalContainer.innerHTML BEFORE observer:", modalContainer.innerHTML); // *** ADDED LOGGING ***

    const observer = new MutationObserver((mutations, obs) => {
        const expectedId = `ceModal-${ceId}`; // *** ADDED VARIABLE ***
        console.log("MutationObserver callback triggered."); // *** ADDED LOGGING ***
        console.log("MutationObserver - Expected Modal ID:", expectedId); // *** ADDED LOGGING ***
        const modalElement = modalContainer.querySelector(`#${expectedId}`); // Use variable here
        console.log("MutationObserver - querySelector result (modalElement):", modalElement); // *** ADDED LOGGING ***

        if (modalElement) {
            console.log("displayCEModal() - modalElement found:", modalElement);
            const modal = new bootstrap.Modal(modalElement);

            modalElement.addEventListener('shown.bs.modal', () => {
                const tableElementId = `#dynamicTable-${ceId}`;
                const tableElement = document.querySelector(tableElementId);

                if (tableElement) {
                    tableElement.innerHTML = '';
                }

                initializeTabulatorTable(tableElementId, tableData, tabulatorColumnsDefinition(p_ceType), p_ceType, modalElement);

                const attribution = aiGeneratedData.attribution || '';
                if (attribution) {
                    const attributionElement = document.createElement('p');
                    attributionElement.classList.add('text-muted', 'small', 'mt-2');
                    attributionElement.textContent = attribution;
                    modalElement.querySelector('.modal-body').appendChild(attributionElement);
                }

                setupModalEventListeners(modalElement, ceId, p_ceType, cosContent, p_phaseName, ssolGoal);
            });

            modalElement.addEventListener('hidden.bs.modal', () => {
              if (modalElement.dataset.hasUnsavedChanges === 'true' && !confirm('You have unsaved changes.  Close anyway?')) {
                    modal.show(); // Re-show modal if unsaved changes and user cancels close
                } else {
                    modalElement.dataset.hasUnsavedChanges = 'false';
                    setupEventListeners();
                }
            });

            modal.show();
            obs.disconnect();
        } else {
            console.error(`MutationObserver: Modal element still not found for CE ID: ${ceId}`);
        }
    });

    observer.observe(modalContainer, { childList: true, subtree: true });
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
        return 'No form fields.';
    }
    return fieldsConfig.map(field => {
        const fieldValue = aiData[field.name] || '';
        const placeholder = field.placeholder || '';
        const fieldType = field.type || 'text';

        switch (fieldType) {
            case 'textarea':
                return `<div class="form-group">
                            <label for="${field.name}">${placeholder}</label>
                            <textarea class="form-control" id="${field.name}" name="${field.name}" placeholder="${placeholder}" rows="3">${fieldValue}</textarea>
                        </div>`;
            case 'select':
                 const options = field.options || [];
                 const optionsHtml = options.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('');
                 return `<div class="form-group">
                            <label for="${field.name}">${placeholder}</label>
                            <select class="form-control" id="${field.name}" name="${field.name}">${optionsHtml}</select>
                        </div>`
            default:
                return `<div class="form-group">
                            <label for="${field.name}">${placeholder}</label>
                            <input type="${fieldType}" class="form-control" id="${field.name}" name="${field.name}" placeholder="${placeholder}" value="${fieldValue}">
                        </div>`;
        }
    }).join('');
}

/**
 * Clears all input fields within a given form.
 * @param {string} formSelector - CSS selector for the form element.
 */
function clearFormFields(formSelector) {
    const form = document.querySelector(formSelector);
    if (form) {
        form.querySelectorAll('input, textarea, select').forEach(field => {
            if (field.type !== 'checkbox' && field.type !== 'radio') {
                field.value = '';
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

    const table = modalElement._tabulator;

     if (generateRowButton) {
        generateRowButton.addEventListener('click', () => {
            generateFieldsFromAI(ceId, p_ceType, cosContent, ssolGoal);
        });
    }

    modalElement.addEventListener('input', () => {
        modalElement.dataset.hasUnsavedChanges = 'true';
    });

      modalElement.addEventListener('hidden.bs.modal', () => {
        if (modalElement.dataset.hasUnsavedChanges === 'true' && !confirm('You have unsaved changes. Close anyway?')) {
            const modalInstance = bootstrap.Modal.getInstance(modalElement); // Correct way to get instance
            if (modalInstance) {
                modalInstance.show(); // Re-show modal if unsaved changes and user cancels
            }
        } else {
             modalElement.dataset.hasUnsavedChanges = 'false';
            setupEventListeners();
        }
    });

    if (addRowButton) {
        addRowButton.addEventListener('click', () => {
            const table = modalElement._tabulator; // Get Tabulator instance from modal
            const form = modalElement.querySelector(`#ceForm-${ceId}`);
            const formData = new FormData(form);
            const rowData = {};
            let isAnyFieldFilled = false;

            formData.forEach((value, key) => {
                if (value.trim() !== "") {
                    isAnyFieldFilled = true;
                }
                rowData[key] = value;
            });

            if (!isAnyFieldFilled) {
                alert("Please fill in at least one field before adding a row.");
                return;
            }

            const rows = table.getRows();
            let emptyRow = rows.find(row => Object.values(row.getData()).every(val => val === ''));

            if (emptyRow) {
                emptyRow.update(rowData);
            } else {
                table.addRow(rowData, true);
            }

            clearFormFields(`#ceForm-${ceId}`);
            modalElement.dataset.hasUnsavedChanges = 'true';
        });
    }

    if (saveChangesButton) {
        saveChangesButton.addEventListener('click', () => {
          saveCEChanges(ceId);
           modalElement.dataset.hasUnsavedChanges = 'false';
        });
    }

    if (deleteSelectedRowsButton) {
        deleteSelectedRowsButton.addEventListener('click', () => {
            const table = modalElement._tabulator; // Get Tabulator instance from modal
            if (table) {
                const selectedRows = table.getSelectedRows();
                selectedRows.forEach(row => row.delete());
                modalElement.dataset.hasUnsavedChanges = 'true';
            }
        });
    }

    if (duplicateSelectedRowsButton) {
        duplicateSelectedRowsButton.addEventListener('click', () => {
            const table = modalElement._tabulator; // Get Tabulator instance from modal
            if (table) {
                const selectedRows = table.getSelectedRows();
                selectedRows.forEach(row => {
                  const rowData = row.getData();
                    table.addRow({...rowData});
                });
                modalElement.dataset.hasUnsavedChanges = 'true';
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
    const tableData = table ? table.getData() : [];
     const nonNullRows = tableData.filter(row =>
        Object.values(row).some(value => value !== null && (typeof value === 'string' ? value.trim() !== '' : value !== ''))
    );

    const updatedData = {
        table_data: nonNullRows,
        form_data: getFormData(modalElement.querySelector(`#ceForm-${ceId}`))
    };

    fetch(`/update_ce/${encodeURIComponent(ceId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            console.log(`CE ID ${ceId} updated successfully`);
            updateCEPills(ceId, nonNullRows.length);
            setupEventListeners();
             bootstrap.Modal.getInstance(modalElement).hide();

        } else {
            console.error('Error updating CE:', data.error);
            alert(`Error updating CE: ${data.error}`);
        }
    })
    .catch(error => {
        console.error('Error updating CE:', error);
        alert(`An error occurred: ${error.message}`);
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
    formData.forEach((value, key) => { data[key] = value; });
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
             if (modalElement) { //Check if the modal element has been created
                const table = initializeTabulatorTable(tableElementId, [], tabulatorColumnsDefinition(ceType), ceType, modalElement); // Initialize Tabulator table (empty initially)

                 if (data.ai_response.table_data && Array.isArray(data.ai_response.table_data)) {
                     table.setData(data.ai_response.table_data); // Set table data if provided in AI response
                 }
             } else {
                console.error("Modal element not found when trying to initialize Tabulator.");
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