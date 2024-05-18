NODES = {
    "Location": {
        "definition": "This node allows the user to specify a geographic region relevant to the Conditional Element.",
        "icon": "fas fa-map-marker-alt",
        "modal_config": {
            "fields": [
                {"type": "text", "name": "region_name", "placeholder": "Region Name"},
                {"type": "textarea", "name": "region_details", "placeholder": "Region Details"},
                {"type": "text", "name": "coordinates", "placeholder": "Coordinates"}
            ]
        }
    },
    "Research": {
        "definition": "This node aggregates resources and research related to the Conditional Element.",
        "icon": "fas fa-flask",
        "modal_config": {
            "fields": [
                {"type": "text", "name": "research_title", "placeholder": "Research Title"},
                {"type": "textarea", "name": "research_summary", "placeholder": "Research Summary"},
                {"type": "text", "name": "researcher_name", "placeholder": "Researcher Name"}
            ]
        }
    },
    "Resource": {
        "definition": "This node provides a list of resources or assets related to the Conditional Element.",
        "icon": "fas fa-tools",
        "modal_config": {
            "fields": [
                {"type": "text", "name": "resource_name", "placeholder": "Resource Name"},
                {"type": "textarea", "name": "resource_details", "placeholder": "Resource Details"},
                {"type": "text", "name": "resource_type", "placeholder": "Resource Type"}
            ]
        }
    },
    "Action": {
        "definition": "This node represents an action or task to be taken to fulfill the Conditional Element.",
        "icon": "fas fa-tasks",
        "modal_config": {
            "fields": [
                {"type": "text", "name": "action_name", "placeholder": "Action Name"},
                {"type": "textarea", "name": "action_description", "placeholder": "Action Description"},
                {"type": "text", "name": "responsible_person", "placeholder": "Responsible Person"}
            ]
        }
    },
    "Time": {
        "definition": "This node specifies a time frame or deadline associated with the Conditional Element.",
        "icon": "fas fa-clock",
        "modal_config": {
            "fields": [
                {"type": "text", "name": "time_frame", "placeholder": "Time Frame"},
                {"type": "date", "name": "start_date", "placeholder": "Start Date"},
                {"type": "date", "name": "end_date", "placeholder": "End Date"}
            ]
        }
    },
    "Stakeholder": {
        "definition": "This node captures the stakeholders involved in the Conditional Element.",
        "icon": "fas fa-user-friends",
        "modal_config": {
            "fields": [
                {"type": "text", "name": "stakeholder_name", "placeholder": "Stakeholder Name"},
                {"type": "textarea", "name": "stakeholder_role", "placeholder": "Stakeholder Role"},
                {"type": "text", "name": "contact_info", "placeholder": "Contact Info"}
            ]
        }
    },
    "Collaboration": {
        "definition": "This node focuses on collaboration efforts or partnerships needed for the Conditional Element.",
        "icon": "fas fa-handshake",
        "modal_config": {
            "fields": [
                {"type": "text", "name": "partner_name", "placeholder": "Partner Name"},
                {"type": "textarea", "name": "collaboration_details", "placeholder": "Collaboration Details"},
                {"type": "text", "name": "contact_person", "placeholder": "Contact Person"}
            ]
        }
    },
    "Policy": {
        "definition": "This node addresses policy or regulatory aspects related to the Conditional Element.",
        "icon": "fas fa-gavel",
        "modal_config": {
            "fields": [
                {"type": "text", "name": "policy_name", "placeholder": "Policy Name"},
                {"type": "textarea", "name": "policy_details", "placeholder": "Policy Details"},
                {"type": "text", "name": "regulatory_body", "placeholder": "Regulatory Body"}
            ]
        }
    },
    "Data": {
        "definition": "This node highlights data requirements or analytics related to the Conditional Element.",
        "icon": "fas fa-database",
        "modal_config": {
            "fields": [
                {"type": "text", "name": "data_type", "placeholder": "Data Type"},
                {"type": "textarea", "name": "data_requirements", "placeholder": "Data Requirements"},
                {"type": "text", "name": "data_source", "placeholder": "Data Source"}
            ]
        }
    },
    "Technology": {
        "definition": "This node explores the use of technology or tools for the Conditional Element.",
        "icon": "fas fa-cogs",
        "modal_config": {
            "fields": [
                {"type": "text", "name": "technology_name", "placeholder": "Technology Name"},
                {"type": "textarea", "name": "technology_description", "placeholder": "Technology Description"},
                {"type": "text", "name": "integration_method", "placeholder": "Integration Method"}
            ]
        }
    },
    "Communication": {
        "definition": "This node focuses on communication strategies or channels related to the Conditional Element.",
        "icon": "fas fa-comments",
        "modal_config": {
            "fields": [
                {"type": "text", "name": "communication_channel", "placeholder": "Communication Channel"},
                {"type": "textarea", "name": "communication_plan", "placeholder": "Communication Plan"},
                {"type": "text", "name": "target_audience", "placeholder": "Target Audience"}
            ]
        }
    },
    "Skill": {
        "definition": "This node identifies specific skills or expertise required for the Conditional Element.",
        "icon": "fas fa-brain",
        "modal_config": {
            "fields": [
                {"type": "text", "name": "skill_name", "placeholder": "Skill Name"},
                {"type": "text", "name": "proficiency_level", "placeholder": "Proficiency Level"},
                {"type": "textarea", "name": "skill_description", "placeholder": "Skill Description"}
            ]
        }
    },
    "Education": {
        "definition": "This node addresses educational requirements or training related to the Conditional Element.",
        "icon": "fas fa-graduation-cap",
        "modal_config": {
            "fields": [
                {"type": "text", "name": "course_name", "placeholder": "Course Name"},
                {"type": "textarea", "name": "course_description", "placeholder": "Course Description"},
                {"type": "text", "name": "institution", "placeholder": "Institution"}
            ]
        }
    },
    "Evaluation": {
        "definition": "This node tracks evaluation methods or metrics for assessing the Conditional Element.",
        "icon": "fas fa-star-half-alt",
        "modal_config": {
            "fields": [
                {"type": "text", "name": "evaluation_method", "placeholder": "Evaluation Method"},
                {"type": "textarea", "name": "evaluation_criteria", "placeholder": "Evaluation Criteria"},
                {"type": "text", "name": "evaluator", "placeholder": "Evaluator"}
            ]
        }
    },
    "Impact": {
        "definition": "This node explores the potential impact or outcomes of the Conditional Element.",
        "icon": "fas fa-chart-bar",
        "modal_config": {
            "fields": [
                {"type": "textarea", "name": "impact_statement", "placeholder": "Impact Statement"},
                {"type": "text", "name": "impact_metric", "placeholder": "Impact Metric"},
                {"type": "textarea", "name": "long_term_effects", "placeholder": "Long-term Effects"}
            ]
        }
    },
    "Legal": {
        "definition": "This node covers legal considerations or requirements related to the Conditional Element.",
        "icon": "fas fa-balance-scale",
        "modal_config": {
            "fields": [
                {"type": "textarea", "name": "legal_requirements", "placeholder": "Legal Requirements"},
                {"type": "text", "name": "legislation", "placeholder": "Relevant Legislation"},
                {"type": "text", "name": "compliance_officer", "placeholder": "Compliance Officer"}
            ]
        }
    },
    "Environmental": {
        "definition": "This node focuses on environmental factors or considerations for the Conditional Element.",
        "icon": "fas fa-leaf",
        "modal_config": {
            "fields": [
                {"type": "textarea", "name": "environmental_impact", "placeholder": "Environmental Impact"},
                {"type": "textarea", "name": "sustainability_goals", "placeholder": "Sustainability Goals"},
                {"type": "text", "name": "regulatory_agency", "placeholder": "Regulatory Agency"}
            ]
        }
    },
    "Compliance": {
        "definition": "This node focuses on compliance requirements or regulations for the Conditional Element.",
        "icon": "fas fa-file-alt",
        "modal_config": {
            "fields": [
                {"type": "textarea", "name": "compliance_checklist", "placeholder": "Compliance Checklist"},
                {"type": "textarea", "name": "audit_history", "placeholder": "Audit History"},
                {"type": "text", "name": "compliance_analyst", "placeholder": "Compliance Analyst"}
            ]
        }
    },
    "Performance": {
        "definition": "This node tracks performance indicators or benchmarks for the Conditional Element.",
        "icon": "fas fa-chart-line",
        "modal_config": {
            "fields": [
                {"type": "text", "name": "performance_metric", "placeholder": "Performance Metric"},
                {"type": "text", "name": "benchmark", "placeholder": "Benchmark"},
                {"type": "text", "name": "measurement_tool", "placeholder": "Measurement Tool"}
            ]
        }
    },
    "Logistic": {
        "definition": "This node addresses logistical considerations or requirements for the Conditional Element.",
        "icon": "fas fa-truck",
        "modal_config": {
            "fields": [
                {"type": "textarea", "name": "logistics_plan", "placeholder": "Logistics Plan"},
                {"type": "text", "name": "supplier", "placeholder": "Supplier"},
                {"type": "text", "name": "delivery_schedule", "placeholder": "Delivery Schedule"}
            ]
        }
    },
    "Infrastructure": {
        "definition": "This node covers infrastructure needs or considerations for the Conditional Element.",
        "icon": "fas fa-building",
        "modal_config": {
            "fields": [
                {"type": "text", "name": "infrastructure_type", "placeholder": "Infrastructure Type"},
                {"type": "textarea", "name": "infrastructure_details", "placeholder": "Infrastructure Details"},
                {"type": "text", "name": "maintenance_schedule", "placeholder": "Maintenance Schedule"}
            ]
        }
    },
    "Health and Safety": {
        "definition": "This node focuses on health and safety considerations for the Conditional Element.",
        "icon": "fas fa-heartbeat",
        "modal_config": {
            "fields": [
                {"type": "textarea", "name": "safety_guidelines", "placeholder": "Safety Guidelines"},
                {"type": "text", "name": "health_risks", "placeholder": "Health Risks"},
                {"type": "text", "name": "safety_officer", "placeholder": "Safety Officer"}
            ]
        }
    },
    "Scalability": {
        "definition": "This node addresses the scalability potential of the Conditional Element.",
        "icon": "fas fa-expand-arrows-alt",
        "modal_config": {
            "fields": [
                {"type": "textarea", "name": "scalability_plan", "placeholder": "Scalability Plan"},
                {"type": "text", "name": "scaling_strategy", "placeholder": "Scaling Strategy"},
                {"type": "text", "name": "growth_metrics", "placeholder": "Growth Metrics"}
            ]
        }
    },
    "Ethical": {
        "definition": "This node explores ethical considerations or implications of the Conditional Element.",
        "icon": "fas fa-balance-scale-left",
        "modal_config": {
            "fields": [
                {"type": "textarea", "name": "ethical_considerations", "placeholder": "Ethical Considerations"},
                {"type": "text", "name": "ethics_committee", "placeholder": "Ethics Committee"},
                {"type": "text", "name": "ethical_guidelines", "placeholder": "Ethical Guidelines"}
            ]
        }
    },
    "Cultural": {
        "definition": "This node addresses cultural factors or considerations for the Conditional Element.",
        "icon": "fas fa-globe",
        "modal_config": {
            "fields": [
                {"type": "textarea", "name": "cultural_impact", "placeholder": "Cultural Impact"},
                {"type": "text", "name": "cultural_consultant", "placeholder": "Cultural Consultant"},
                {"type": "text", "name": "cultural_practices", "placeholder": "Cultural Practices"}
            ]
        }
    },
    "Innovation": {
        "definition": "This node focuses on innovative approaches or technologies for the Conditional Element.",
        "icon": "fas fa-lightbulb-on",
        "modal_config": {
            "fields": [
                {"type": "text", "name": "innovation_name", "placeholder": "Innovation Name"},
                {"type": "textarea", "name": "innovation_details", "placeholder": "Innovation Details"},
                {"type": "text", "name": "innovation_leader", "placeholder": "Innovation Leader"}
            ]
        }
    },
    "Public Relations": {
        "definition": "This node covers public relations strategies or activities related to the Conditional Element.",
        "icon": "fas fa-megaphone",
        "modal_config": {
            "fields": [
                {"type": "text", "name": "pr_strategy", "placeholder": "PR Strategy"},
                {"type": "textarea", "name": "media_contacts", "placeholder": "Media Contacts"},
                {"type": "text", "name": "spokesperson", "placeholder": "Spokesperson"}
            ]
        }
    },
    "Governance": {
        "definition": "This node addresses governance structures or requirements for the Conditional Element.",
        "icon": "fas fa-users-cog",
        "modal_config": {
            "fields": [
                {"type": "text", "name": "governance_model", "placeholder": "Governance Model"},
                {"type": "textarea", "name": "governance_details", "placeholder": "Governance Details"},
                {"type": "text", "name": "board_members", "placeholder": "Board Members"}
            ]
        }
    },
    "Monitoring": {
        "definition": "This node focuses on monitoring and tracking progress or performance related to the Conditional Element.",
        "icon": "fas fa-heartbeat",
        "modal_config": {
            "fields": [
                {"type": "text", "name": "monitoring_tool", "placeholder": "Monitoring Tool"},
                {"type": "textarea", "name": "monitoring_plan", "placeholder": "Monitoring Plan"},
                {"type": "text", "name": "responsible_person", "placeholder": "Responsible Person"}
            ]
        }
    },
    "Quality Assurance": {
        "definition": "This node ensures quality control and assurance processes and standards for the Conditional Element.",
        "icon": "fas fa-check-circle",
        "modal_config": {
            "fields": [
                {"type": "text", "name": "qa_process", "placeholder": "QA Process"},
                {"type": "textarea", "name": "quality_standards", "placeholder": "Quality Standards"},
                {"type": "text", "name": "qa_lead", "placeholder": "QA Lead"}
            ]
        }
    },
    "Ethical AI": {
        "definition": "This node explores ethical considerations and guidelines related to the use of AI in the Conditional Element.",
        "icon": "fas fa-brain",
        "modal_config": {
            "fields": [
                {"type": "textarea", "name": "ethical_ai_guidelines", "placeholder": "Ethical AI Guidelines"},
                {"type": "text", "name": "ai_ethics_board", "placeholder": "AI Ethics Board"},
                {"type": "text", "name": "ethical_issues", "placeholder": "Identified Ethical Issues"}
            ]
        }
    },
    "Privacy and Data Security": {
        "definition": "This node addresses privacy and data security measures and guidelines for the Conditional Element.",
        "icon": "fas fa-lock",
        "modal_config": {
            "fields": [
                {"type": "textarea", "name": "data_security_plan", "placeholder": "Data Security Plan"},
                {"type": "text", "name": "data_protection_officer", "placeholder": "Data Protection Officer"},
                {"type": "text", "name": "compliance_standard", "placeholder": "Compliance Standard"}
            ]
        }
    },
    "Regulatory Compliance": {
        "definition": "This node focuses specifically on regulatory compliance requirements for the Conditional Element.",
        "icon": "fas fa-balance-scale",
        "modal_config": {
            "fields": [
                {"type": "textarea", "name": "regulatory_requirements", "placeholder": "Regulatory Requirements"},
                {"type": "text", "name": "regulatory_agency", "placeholder": "Regulatory Agency"},
                {"type": "text", "name": "compliance_manager", "placeholder": "Compliance Manager"}
            ]
        }
    },
    "Cost and Budgeting": {
        "definition": "This node addresses cost estimation, budgeting, and financial considerations for the Conditional Element.",
        "icon": "fas fa-dollar-sign",
        "modal_config": {
            "fields": [
                {"type": "text", "name": "budget_item", "placeholder": "Budget Item"},
                {"type": "number", "name": "cost_estimate", "placeholder": "Cost Estimate"},
                {"type": "text", "name": "financial_officer", "placeholder": "Financial Officer"}
            ]
        }
    },
    "Accessibility": {
        "definition": "This node emphasizes accessibility requirements and inclusive design principles for the Conditional Element.",
        "icon": "fas fa-wheelchair",
        "modal_config": {
            "fields": [
                {"type": "textarea", "name": "accessibility_standards", "placeholder": "Accessibility Standards"},
                {"type": "text", "name": "accessibility_consultant", "placeholder": "Accessibility Consultant"},
                {"type": "text", "name": "compliance_check", "placeholder": "Compliance Check"}
            ]
        }
    },
    "User Experience": {
        "definition": "This node addresses user experience design and considerations for the Conditional Element.",
        "icon": "fas fa-user-circle",
        "modal_config": {
            "fields": [
                {"type": "text", "name": "ux_strategy", "placeholder": "UX Strategy"},
                {"type": "textarea", "name": "user_feedback", "placeholder": "User Feedback"},
                {"type": "text", "name": "ux_lead", "placeholder": "UX Lead"}
            ]
        }
    }
}
