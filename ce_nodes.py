NODES = {  
    "Default": {  
        "definition": "This node is a default research mode for undefined node types.",  
        "icon": "fa-solid fa-question-circle",  
        "modal_config": {  
            "fields": [  
                {"type": "text", "name": "detail", "placeholder": "Detail"},  
                {"type": "file", "name": "supporting_files", "placeholder": "Supporting Files"},  
                {"type": "text", "name": "stakeholders", "placeholder": "Stakeholders"}  
            ],  
            "explanation": "Provide a detailed description of the node.",  
            "ai_context": "Provide general information and suggestions to help achieve the Condition of Satisfaction (COS)."  
        },  
        "tabulator_config": {  
            "columns": [  
                {"title": "Detail", "field": "detail", "editor": "input"},  
                {"title": "Supporting Files", "field": "supporting_files", "editor": "input"},  
                {"title": "Stakeholders", "field": "stakeholders", "editor": "input"}  
            ]  
        }  
    },  
    "Research": {  
        "definition": "Aggregates and summarizes research materials and resources pertinent to the COS.",  
        "icon": "fa-solid fa-flask",  
        "modal_config": {  
            "fields": [  
                {"type": "text", "name": "research_title", "placeholder": "Research Title"},  
                {"type": "textarea", "name": "research_summary", "placeholder": "Research Summary"},  
                {"type": "text", "name": "researcher_name", "placeholder": "Researcher Name"}  
            ],  
            "explanation": "Capture relevant research aspects of the node.",  
            "ai_context": "Provide detailed research information, studies, and academic resources relevant to the COS."  
        },  
        "tabulator_config": {  
            "columns": [  
                {"title": "Research Title", "field": "research_title", "editor": "input"},  
                {"title": "Summary", "field": "research_summary", "editor": "textarea"},  
                {"title": "Researcher Name", "field": "researcher_name", "editor": "input"}  
            ]  
        }  
    },  
    
    "Education": {  
        "definition": "Addresses educational requirements or training related to the COS.",  
        "icon": "fa-solid fa-graduation-cap",  
        "modal_config": {  
            "fields": [  
                {"type": "text", "name": "course_name", "placeholder": "Course Name"},  
                {"type": "textarea", "name": "course_description", "placeholder": "Course Description"},  
                {"type": "text", "name": "institution", "placeholder": "Institution"}  
            ],  
            "explanation": "Detail educational requirements and training necessary for the COS.",  
            "ai_context": "Provide information on educational requirements or training related to the COS."  
        },  
        "tabulator_config": {  
            "columns": [  
                {"title": "Course Name", "field": "course_name", "editor": "input"},  
                {"title": "Description", "field": "course_description", "editor": "textarea"},  
                {"title": "Institution", "field": "institution", "editor": "input"}  
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
            "explanation": "Provide details about resources or assets required for the COS.",  
            "ai_context": "List and detail resources or assets essential for achieving the COS."  
        }  
    },  
    "Action": {  
        "definition": "Defines actions or tasks necessary to meet the COS.",  
        "icon": "fa-solid fa-tasks",  
        "modal_config": {  
            "fields": [  
                {"type": "text", "name": "action_name", "placeholder": "Action Name"},  
                {"type": "textarea", "name": "action_description", "placeholder": "Action Description"},  
                {"type": "text", "name": "responsible_person", "placeholder": "Responsible Person"}  
            ],  
            "explanation": "Specify tasks or actions required to fulfill the COS.",  
            "ai_context": "Detail actions or tasks necessary to meet the COS."  
        }  
    },  
    "Time": {  
        "definition": "Specifies time frames or deadlines associated with the COS.",  
        "icon": "fa-solid fa-clock",  
        "modal_config": {  
            "fields": [  
                {"type": "text", "name": "time_frame", "placeholder": "Time Frame"},  
                {"type": "date", "name": "start_date", "placeholder": "Start Date"},  
                {"type": "date", "name": "end_date", "placeholder": "End Date"}  
            ],  
            "explanation": "Provide time-related information such as deadlines and schedules for the COS.",  
            "ai_context": "Detail time frames or deadlines associated with the COS."  
        }  
    },  
    "Stakeholder": {  
        "definition": "Captures details of stakeholders involved in the COS.",  
        "icon": "fa-solid fa-user-friends",  
        "modal_config": {  
            "fields": [  
                {"type": "text", "name": "stakeholder_name", "placeholder": "Stakeholder Name"},  
                {"type": "textarea", "name": "stakeholder_role", "placeholder": "Stakeholder Role"},  
                {"type": "text", "name": "contact_info", "placeholder": "Contact Info"}  
            ],  
            "explanation": "Detail the roles and contact information of stakeholders related to the COS.",  
            "ai_context": "Identify and provide details of stakeholders involved in the COS."  
        },  
        "tabulator_config": {  
            "columns": [  
                {"title": "Stakeholder Name", "field": "stakeholder_name", "editor": "input"},  
                {"title": "Stakeholder Role", "field": "stakeholder_role", "editor": "textarea"},  
                {"title": "Contact Info", "field": "contact_info", "editor": "input"}  
            ]  
        }  
    },  
    "Collaboration": {  
        "definition": "Focuses on partnerships or collaboration efforts necessary for the COS.",  
        "icon": "fa-solid fa-handshake",  
        "modal_config": {  
            "fields": [  
                {"type": "text", "name": "partner_name", "placeholder": "Partner Name"},  
                {"type": "textarea", "name": "collaboration_details", "placeholder": "Collaboration Details"},  
                {"type": "text", "name": "contact_person", "placeholder": "Contact Person"}  
            ],  
            "explanation": "Outline collaboration efforts and partnerships related to the COS.",  
            "ai_context": "Detail partnerships or collaboration efforts necessary for the COS."  
        }  
    },  
    "Policy": {  
        "definition": "Addresses policy or regulatory aspects pertinent to the COS.",  
        "icon": "fa-solid fa-gavel",  
        "modal_config": {  
            "fields": [  
                {"type": "text", "name": "policy_name", "placeholder": "Policy Name"},  
                {"type": "textarea", "name": "policy_details", "placeholder": "Policy Details"},  
                {"type": "text", "name": "regulatory_body", "placeholder": "Regulatory Body"}  
            ],  
            "explanation": "Detail policies or regulations impacting the COS.",  
            "ai_context": "Provide information on policies or regulatory aspects pertinent to the COS."  
        }  
    },  
    "Data": {  
        "definition": "Highlights data requirements or analytics related to the COS.",  
        "icon": "fa-solid fa-database",  
        "modal_config": {  
            "fields": [  
                {"type": "text", "name": "data_type", "placeholder": "Data Type"},  
                {"type": "textarea", "name": "data_requirements", "placeholder": "Data Requirements"},  
                {"type": "text", "name": "data_source", "placeholder": "Data Source"}  
            ],  
            "explanation": "Specify data needs and analytical requirements for the COS.",  
            "ai_context": "Detail data requirements or analytics related to the COS."  
        }  
    },  
    "Technology": {  
        "definition": "Explores the use of technology or tools for achieving the COS.",  
        "icon": "fa-solid fa-cogs",  
        "modal_config": {  
            "fields": [  
                {"type": "text", "name": "technology_name", "placeholder": "Technology Name"},  
                {"type": "textarea", "name": "technology_description", "placeholder": "Technology Description"},  
                {"type": "text", "name": "integration_method", "placeholder": "Integration Method"}  
            ],  
            "explanation": "Detail the technological tools and integration methods for the COS.",  
            "ai_context": "Provide information on technology or tools for achieving the COS."  
        }  
    },  
    "Communication": {  
        "definition": "Focuses on communication strategies or channels related to the COS.",  
        "icon": "fa-solid fa-comments",  
        "modal_config": {  
            "fields": [  
                {"type": "text", "name": "communication_channel", "placeholder": "Communication Channel"},  
                {"type": "textarea", "name": "communication_plan", "placeholder": "Communication Plan"},  
                {"type": "text", "name": "target_audience", "placeholder": "Target Audience"}  
            ],  
            "explanation": "Outline communication strategies and channels for the COS.",  
            "ai_context": "Detail communication strategies or channels related to the COS."  
        }  
    },  
    "Skill": {  
        "definition": "Identifies specific skills or expertise required for achieving the COS.",  
        "icon": "fa-solid fa-brain",  
        "modal_config": {  
            "fields": [  
                {"type": "text", "name": "skill_name", "placeholder": "Skill Name"},  
                {"type": "text", "name": "proficiency_level", "placeholder": "Proficiency Level"},  
                {"type": "textarea", "name": "skill_description", "placeholder": "Skill Description"}  
            ],  
            "explanation": "Detail the skills and expertise required for the COS.",  
            "ai_context": "Identify and provide details on the skills required for achieving the COS."  
        }  
    },  
    "Education": {  
        "definition": "Addresses educational requirements or training related to the COS.",  
        "icon": "fa-solid fa-graduation-cap",  
        "modal_config": {  
            "fields": [  
                {"type": "text", "name": "course_name", "placeholder": "Course Name"},  
                {"type": "textarea", "name": "course_description", "placeholder": "Course Description"},  
                {"type": "text", "name": "institution", "placeholder": "Institution"}  
            ],  
            "explanation": "Detail educational requirements and training necessary for the COS.",  
            "ai_context": "Provide information on educational requirements or training related to the COS."  
        }  
    },  
    "Evaluation and Impact": {  
        "definition": "Tracks evaluation metrics and potential impacts of achieving the COS.",  
        "icon": "fa-solid fa-star-half-alt",  
        "modal_config": {  
            "fields": [  
                {"type": "text", "name": "evaluation_method", "placeholder": "Evaluation Method"},  
                {"type": "text", "name": "evaluation_criteria", "placeholder": "Evaluation Criteria"},  
                {"type": "text", "name": "evaluator", "placeholder": "Evaluator"},  
                {"type": "textarea", "name": "impact_statement", "placeholder": "Impact Statement"},  
                {"type": "text", "name": "impact_metric", "placeholder": "Impact Metric"},  
                {"type": "textarea", "name": "expected_outcomes", "placeholder": "Expected Outcomes"}  
            ],  
            "explanation": "Outline evaluation methods, criteria, and expected impacts for the COS.",  
            "ai_context": "Detail evaluation metrics and potential impacts of achieving the COS."  
        }  
    },  
    "Legal": {  
        "definition": "Covers legal considerations or requirements pertinent to the COS.",  
        "icon": "fa-solid fa-balance-scale",  
        "modal_config": {  
            "fields": [  
                {"type": "textarea", "name": "legal_requirements", "placeholder": "Legal Requirements"},  
                {"type": "text", "name": "relevant_legislation", "placeholder": "Relevant Legislation"},  
                {"type": "text", "name": "compliance_officer", "placeholder": "Compliance Officer"}  
            ],  
            "explanation": "Detail legal considerations and requirements for the COS.",  
            "ai_context": "Provide information on legal considerations or requirements pertinent to the COS."  
        }  
    },  
    "Environmental": {  
        "definition": "Focuses on environmental impact and sustainability related to the COS.",  
        "icon": "fa-solid fa-leaf",  
        "modal_config": {  
            "fields": [  
                {"type": "textarea", "name": "environmental_impact", "placeholder": "Environmental Impact"},  
                {"type": "text", "name": "sustainability_goals", "placeholder": "Sustainability Goals"},  
                {"type": "text", "name": "regulatory_agency", "placeholder": "Regulatory Agency"}  
            ],  
            "explanation": "Detail environmental impacts and sustainability goals for the COS.",  
            "ai_context": "Provide information on environmental impact and sustainability related to the COS."  
        }  
    },  
    "Performance and Monitoring": {  
        "definition": "Tracks performance indicators and progress monitoring for the COS.",  
        "icon": "fa-solid fa-chart-line",  
        "modal_config": {  
            "fields": [  
                {"type": "text", "name": "performance_metric", "placeholder": "Performance Metric"},  
                {"type": "text", "name": "benchmark", "placeholder": "Benchmark"},  
                {"type": "text", "name": "measurement_tool", "placeholder": "Measurement Tool"},  
                {"type": "text", "name": "monitoring_tool", "placeholder": "Monitoring Tool"},  
                {"type": "textarea", "name": "monitoring_plan", "placeholder": "Monitoring Plan"}  
            ],  
            "explanation": "Detail performance metrics and monitoring plans for the COS.",  
            "ai_context": "Provide information on performance indicators and monitoring progress for the COS."  
        }  
    },  
    "Logistics": {  
        "definition": "Combines logistics and infrastructure considerations for the COS.",  
        "icon": "fa-solid fa-truck",  
        "modal_config": {  
            "fields": [  
                {"type": "textarea", "name": "logistics_plan", "placeholder": "Logistics Plan"},  
                {"type": "text", "name": "supplier", "placeholder": "Supplier"},  
                {"type": "text", "name": "delivery_schedule", "placeholder": "Delivery Schedule"},  
                {"type": "text", "name": "infrastructure_type", "placeholder": "Infrastructure Type"},  
                {"type": "textarea", "name": "infrastructure_details", "placeholder": "Infrastructure Details"},  
                {"type": "text", "name": "maintenance_schedule", "placeholder": "Maintenance Schedule"}  
            ],  
            "explanation": "Detail logistics and infrastructure considerations for the COS.",  
            "ai_context": "Provide information on logistics and infrastructure for the COS."  
        }  
    },  
    "Health and Safety": {  
        "definition": "Focuses on health and safety guidelines related to the COS.",  
        "icon": "fa-solid fa-heartbeat",  
        "modal_config": {  
            "fields": [  
                {"type": "textarea", "name": "safety_guidelines", "placeholder": "Safety Guidelines"},  
                {"type": "textarea", "name": "health_risks", "placeholder": "Health Risks"},  
                {"type": "text", "name": "safety_officer", "placeholder": "Safety Officer"}  
            ],  
            "explanation": "Detail health and safety guidelines necessary for the COS.",  
            "ai_context": "Provide information on health and safety guidelines related to the COS."  
        }  
    },  
    "Scalability and Innovation": {  
        "definition": "Combines scalability potential and innovative approaches for the COS.",  
        "icon": "fa-solid fa-expand-arrows-alt",  
        "modal_config": {  
            "fields": [  
                {"type": "textarea", "name": "scalability_plan", "placeholder": "Scalability Plan"},  
                {"type": "text", "name": "scaling_strategy", "placeholder": "Scaling Strategy"},  
                {"type": "text", "name": "growth_metrics", "placeholder": "Growth Metrics"},  
                {"type": "text", "name": "innovation_name", "placeholder": "Innovation Name"},  
                {"type": "textarea", "name": "innovation_details", "placeholder": "Innovation Details"},  
                {"type": "text", "name": "innovation_leader", "placeholder": "Innovation Leader"}  
            ],  
            "explanation": "Detail scalability plans and innovative approaches for the COS.",  
            "ai_context": "Provide information on scalability potential and innovative approaches for the COS."  
        }  
    },  
    "Ethical and Cultural Considerations": {  
        "definition": "Combines ethical and cultural factors relevant to the COS.",  
        "icon": "fa-solid fa-balance-scale-left",  
        "modal_config": {  
            "fields": [  
                {"type": "textarea", "name": "ethical_considerations", "placeholder": "Ethical Considerations"},  
                {"type": "text", "name": "ethics_committee", "placeholder": "Ethics Committee"},  
                {"type": "textarea", "name": "ethical_guidelines", "placeholder": "Ethical Guidelines"},  
                {"type": "textarea", "name": "cultural_impact", "placeholder": "Cultural Impact"},  
                {"type": "text", "name": "cultural_consultant", "placeholder": "Cultural Consultant"},  
                {"type": "textarea", "name": "cultural_practices", "placeholder": "Cultural Practices"}  
            ],  
            "explanation": "Detail ethical and cultural considerations for the COS.",  
            "ai_context": "Provide information on ethical and cultural factors relevant to the COS."  
        }  
    },  
    "Public Relations and User Experience": {  
        "definition": "Combines public relations strategies and user experience design for the COS.",  
        "icon": "fa-solid fa-megaphone",  
        "modal_config": {  
            "fields": [  
                {"type": "textarea", "name": "pr_strategy", "placeholder": "PR Strategy"},  
                {"type": "text", "name": "media_contacts", "placeholder": "Media Contacts"},  
                {"type": "text", "name": "spokesperson", "placeholder": "Spokesperson"},  
                {"type": "textarea", "name": "ux_strategy", "placeholder": "UX Strategy"},  
                {"type": "textarea", "name": "user_feedback", "placeholder": "User Feedback"},  
                {"type": "text", "name": "ux_lead", "placeholder": "UX Lead"}  
            ],  
            "explanation": "Detail public relations strategies and user experience design for the COS.",  
            "ai_context": "Provide information on public relations strategies and user experience design for the COS."  
        }  
    },  
    "Governance and Quality Assurance": {  
        "definition": "Combines governance structures and quality assurance for the COS.",  
        "icon": "fa-solid fa-users-cog",  
        "modal_config": {  
            "fields": [  
                {"type": "text", "name": "governance_model", "placeholder": "Governance Model"},  
                {"type": "textarea", "name": "governance_details", "placeholder": "Governance Details"},  
                {"type": "text", "name": "board_members", "placeholder": "Board Members"},  
                {"type": "textarea", "name": "qa_process", "placeholder": "QA Process"},  
                {"type": "text", "name": "quality_standards", "placeholder": "Quality Standards"},  
                {"type": "text", "name": "qa_lead", "placeholder": "QA Lead"}  
            ],  
            "explanation": "Detail governance structures and quality assurance for the COS.",  
            "ai_context": "Provide information on governance and quality assurance for the COS."  
        }  
    },  
    "Risk Management and Contingency Planning": {  
        "definition": "Combines risk assessment and contingency planning for the COS.",  
        "icon": "fa-solid fa-shield-alt",  
        "modal_config": {  
            "fields": [  
                {"type": "textarea", "name": "risk_assessment", "placeholder": "Risk Assessment"},  
                {"type": "textarea", "name": "risk_mitigation", "placeholder": "Risk Mitigation"},  
                {"type": "text", "name": "risk_manager", "placeholder": "Risk Manager"},  
                {"type": "textarea", "name": "contingency_plan", "placeholder": "Contingency Plan"},  
                {"type": "text", "name": "contingency_lead", "placeholder": "Contingency Lead"},  
                {"type": "textarea", "name": "emergency_procedures", "placeholder": "Emergency Procedures"}  
            ],  
            "explanation": "Detail risk management and contingency planning for the COS.",  
            "ai_context": "Provide information on risk assessment and contingency planning for the COS."  
        }  
    }  
}  
  
def get_valid_node_types():  
    return list(NODES.keys()) 