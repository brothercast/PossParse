# ce_nodes.py

NODES = {  
    "Default": {  
        "definition": "This node is a default research mode for undefined node types.",  
        "icon": "fa-solid fa-icons",
        "color": "#95a5a6",  # Neutral Grey
        "modal_config": {  
            "fields": [  
                {"type": "text", "name": "subject", "placeholder": "Subject"},  
                {"type": "textarea", "name": "details", "placeholder": "Details"},  
                {"type": "text", "name": "stakeholders", "placeholder": "Stakeholders"}  
            ],  
            "explanation": "Default Resource Node.",  
            "ai_context": "Provide general information and suggestions to help achieve the Condition of Satisfaction (COS)."  
        },  
        "tabulator_config": {  
            "columns": [  
                {"title": "Subject", "field": "subject", "editor": "input"},  
                {"title": "Details", "field": "details", "editor": "input"},  
                {"title": "Stakeholders", "field": "stakeholders", "editor": "input"}  
            ]  
        }  
    },  
    "Research": {  
        "definition": "Aggregates and summarizes research materials and resources pertinent to the COS.",  
        "icon": "fa-solid fa-flask",
        "color": "#ec407a",  # Light Pink (from Discovery)
        "modal_config": {  
            "fields": [  
                {"type": "text", "name": "research_topic", "placeholder": "Research Topic"},  
                {"type": "textarea", "name": "research_summary", "placeholder": "Research Summary"},  
                {"type": "text", "name": "research_website", "placeholder": "Research Website"}  
            ],  
            "explanation": "Capture relevant research aspects of the node.",  
            "ai_context": "Provide detailed research information, studies, and academic resources relevant to the COS."  
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
        "definition": "Captures details of stakeholders involved in the COS.",
        "icon": "fa-solid fa-user-friends",
        "color": "#ffca28",  # Amber (Analogous to Completion)
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
            "columns": [
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
        "color": "#ff7043",  # Deep Orange (Analogous)
        "modal_config": {  
            "fields": [  
                {"type": "text", "name": "campaign_name", "placeholder": "Campaign Name"},  
                {"type": "textarea", "name": "campaign_objective", "placeholder": "Campaign Objective"},  
                {"type": "text", "name": "target_audience", "placeholder": "Target Audience"}  
            ],  
            "explanation": "Detail the advocacy campaign's objectives and target audience.",  
            "ai_context": "Provide information on advocacy efforts and campaign strategies pertinent to the COS."  
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
        "color": "#8d6e63",  # Brown (from Completion)
        "modal_config": {
            "fields": [
                {"type": "text", "name": "resource_name", "placeholder": "Resource Name"},
                {"type": "textarea", "name": "resource_details", "placeholder": "Resource Details"},
                {"type": "text", "name": "resource_type", "placeholder": "Resource Type"}
            ],
            "explanation": "Provide details about resources or assets required for the COS.",
            "ai_context": "List and detail resources or assets essential for achieving the COS."
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
        "color": "#5c6bc0",  # Indigo (from Action)
        "modal_config": {
            "fields": [
                {"type": "text", "name": "action_name", "placeholder": "Action Name"},
                {"type": "textarea", "name": "action_description", "placeholder": "Action Description"},
                {"type": "text", "name": "responsible_person", "placeholder": "Responsible Person"}
            ],
            "explanation": "Specify tasks or actions required to fulfill the COS.",
            "ai_context": "Detail actions or tasks necessary to meet the COS."
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
        "definition": "Specifies time frames or deadlines associated with the COS.",
        "icon": "fa-solid fa-clock",
        "color": "#ba68c8",  # Light Purple (from Action)
        "modal_config": {
            "fields": [
                {"type": "text", "name": "time_frame", "placeholder": "Time Frame"},
                {"type": "date", "name": "start_date", "placeholder": "Start Date"},
                {"type": "date", "name": "end_date", "placeholder": "End Date"}
            ],
            "explanation": "Provide time-related information such as deadlines and schedules for the COS.",
            "ai_context": "Detail time frames or deadlines associated with the COS."
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
        "definition": "Focuses on partnerships or collaboration efforts necessary for the COS.",
        "icon": "fa-solid fa-handshake",
        "color": "#4dd0e1",  # Light Cyan (from Engagement)
        "modal_config": {
            "fields": [
                {"type": "text", "name": "partner_name", "placeholder": "Partner Name"},
                {"type": "textarea", "name": "collaboration_details", "placeholder": "Collaboration Details"},
                {"type": "text", "name": "contact_person", "placeholder": "Contact Person"}
            ],
            "explanation": "Outline collaboration efforts and partnerships related to the COS.",
            "ai_context": "Detail partnerships or collaboration efforts necessary for the COS."
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
        "definition": "Addresses policy or regulatory aspects pertinent to the COS.",
        "icon": "fa-solid fa-gavel",
        "color": "#78909c",  # Blue Grey (from Action)
        "modal_config": {
            "fields": [
                {"type": "text", "name": "policy_name", "placeholder": "Policy Name"},
                {"type": "textarea", "name": "policy_details", "placeholder": "Policy Details"},
                {"type": "text", "name": "regulatory_body", "placeholder": "Regulatory Body"}
            ],
            "explanation": "Detail policies or regulations impacting the COS.",
            "ai_context": "Provide information on policies or regulatory aspects pertinent to the COS."
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
        "definition": "Covers legal considerations or requirements pertinent to the COS.",
        "icon": "fa-solid fa-balance-scale",
        "color": "#546e7a",  # Dark Blue Grey (from Action)
        "modal_config": {
            "fields": [
                {"type": "textarea", "name": "legal_requirements", "placeholder": "Legal Requirements"},
                {"type": "text", "name": "relevant_legislation", "placeholder": "Relevant Legislation"},
                {"type": "text", "name": "compliance_officer", "placeholder": "Compliance Officer"}
            ],
            "explanation": "Detail legal considerations and requirements for the COS.",
            "ai_context": "Provide information on legal considerations or requirements pertinent to the COS."
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
        "definition": "Addresses environmental factors related to the COS.",
        "icon": "fa-solid fa-leaf",
        "color": "#66bb6a",  # Green (from Legacy)
        "modal_config": {
            "fields": [
                {"type": "text", "name": "environmental_factor", "placeholder": "Environmental Factor"},
                {"type": "textarea", "name": "impact_assessment", "placeholder": "Impact Assessment"},
                {"type": "text", "name": "mitigation_strategy", "placeholder": "Mitigation Strategy"}
            ],
            "explanation": "Detail environmental factors and their impact on the COS.",
            "ai_context": "Provide information on environmental factors and impact assessments pertinent to the COS."
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
        "definition": "Identifies potential risks and mitigation strategies for the COS.",
        "icon": "fa-solid fa-exclamation-triangle",
        "color": "#e53935",  # Red (Alert Color)
        "modal_config": {
            "fields": [
                {"type": "text", "name": "risk_name", "placeholder": "Risk Name"},
                {"type": "textarea", "name": "risk_description", "placeholder": "Risk Description"},
                {"type": "text", "name": "mitigation_plan", "placeholder": "Mitigation Plan"}
            ],
            "explanation": "Detail potential risks and strategies to mitigate them for the COS.",
            "ai_context": "Identify potential risks and provide mitigation strategies for the COS."
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
        "color": "#26c6da",  # Bright Cyan (Analogous)
        "modal_config": {
            "fields": [
                {"type": "text", "name": "opportunity_name", "placeholder": "Opportunity Name"},
                {"type": "textarea", "name": "opportunity_description", "placeholder": "Opportunity Description"},
                {"type": "text", "name": "exploitation_plan", "placeholder": "Exploitation Plan"}
            ],
            "explanation": "Detail opportunities and strategies to capitalize on them for the COS.",
            "ai_context": "Identify opportunities and provide strategies to exploit them for the COS."
        },
        "tabulator_config": {
            "columns": [
                {"title": "Opportunity Name", "field": "opportunity_name", "editor": "input"},
                {"title": "Opportunity Description", "field": "opportunity_description", "editor": "textarea"},
                {"title": "Exploitation Plan", "field": "exploitation_plan", "editor": "input"}
            ]
        }
    }
}

def get_valid_node_types():  
    return list(NODES.keys()) 