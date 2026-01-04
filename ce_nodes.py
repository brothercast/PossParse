# ce_nodes.py
"""
THE SPECULATION ENVIRONMENT MANIFEST (v2026 - Engine Compatible)
------------------------------------
This file defines the DNA for every Node Application in the SSPEC system.
It couples 'Smart Schemas' (for the UI) with 'Strategic Prompts' (for the AI).

PROMPT VARIABLES:
- {cos_text}: The text of the source Condition of Satisfaction.
- {field}: The specific field being enhanced (e.g., "Executive Summary", "Objective").
- {node_type}: The type of the node (e.g., "Research", "Risk").

NOTE: Double braces {{ }} are used to escape JSON structure examples in Python f-strings.
"""

NODES = {
    # ==============================================================================
    # 1. DEFAULT (The Generalist)
    # ==============================================================================
    "Default": {
        "definition": "General purpose speculation node.",
        "icon": "fa-solid fa-cube",
        "color": "#95a5a6",
        "details_schema": [
            {"key": "summary", "label": "Executive Summary", "type": "textarea", "rows": 4},
            {"key": "context", "label": "Strategic Context", "type": "textarea", "rows": 3}
        ],
        "prerequisite_schema": [
            {"key": "title", "label": "Condition", "type": "text"},
            {"key": "status", "label": "Status", "type": "select", "options": ["Pending", "Met"]},
            {"key": "confidence", "label": "Confidence", "type": "slider"}
        ],
        "stakeholder_schema": [
            {"key": "name", "label": "Name", "type": "text"},
            {"key": "role", "label": "Role", "type": "text"}
        ],
        "assumption_schema": [
            {"key": "hypothesis", "label": "Hypothesis", "type": "text"},
            {"key": "risk", "label": "Risk Level", "type": "select", "options": ["Low", "High"]}
        ],
        "resource_schema": [
            {"key": "title", "label": "Resource Title", "type": "text"},
            {"key": "url", "label": "Link", "type": "link"}
        ],
        "prompts": {
            "narrative": """
                IDENTITY: You are a sub-routine of the SPECULATE Engine.
                TASK: Write a concise, professional '{field}' for a '{node_type}' element needed to achieve the specific Condition: '{cos_text}'.
                CONSTRAINT: Strictly adhere to the System Physics (Budget, Operator, Horizon) provided in the context.
                OUTPUT: JSON {{ "text": "Your text here." }}
            """,
            "prerequisites": "Analyze '{cos_text}'. Considering the System Constraints, what 3 precursors are physically required? Return JSON array: [{{\"title\": \"Prereq\", \"status\": \"Pending\"}}]",
            "stakeholders": "Who is involved in '{cos_text}'? Ensure they match the OPERATOR context (e.g. Grassroots vs Corp). Return JSON array: [{{\"name\": \"Name/Role\", \"role\": \"Description\"}}]",
            "assumptions": "What are we assuming about '{cos_text}'? Return JSON array: [{{\"hypothesis\": \"Assumption...\", \"risk\": \"Medium\"}}]",
            "resources": "Suggest 3 resources for '{cos_text}' compatible with the BUDGET context. Return JSON array: [{{\"title\": \"Resource Name\", \"url\": \"#\"}}]"
        }
    },

    # ==============================================================================
    # 2. RESEARCH (The Scientist)
    # ==============================================================================
    "Research": {
        "definition": "A workspace for finding, synthesizing, and analyzing truth.",
        "icon": "fa-solid fa-flask",
        "color": "#ec407a", # Pink
        "details_schema": [
            {"key": "research_question", "label": "Primary Research Question", "type": "textarea", "rows": 2},
            {"key": "summary", "label": "Executive Synthesis", "type": "textarea", "rows": 6}
        ],
        "prerequisite_schema": [
            {"key": "data_req", "label": "Data Requirement", "type": "text"},
            {"key": "access_status", "label": "Access", "type": "select", "options": ["Open", "Restricted", "Purchased"]}
        ],
        "stakeholder_schema": [
            {"key": "name", "label": "Subject Matter Expert", "type": "text"},
            {"key": "expertise", "label": "Field of Study", "type": "text"}
        ],
        "assumption_schema": [
            {"key": "premise", "label": "Theoretical Premise", "type": "text"},
            {"key": "validation_method", "label": "Validation Method", "type": "select", "options": ["Lit Review", "Experiment", "Interview"]}
        ],
        "resource_schema": [
            {"key": "title", "label": "Paper/Source Title", "type": "text"},
            {"key": "type", "label": "Type", "type": "select", "options": ["Paper", "Article", "Dataset"]},
            {"key": "url", "label": "Source URL", "type": "link"}
        ],
        "prompts": {
            "narrative": """
                IDENTITY: You are the Research Module of the SPECULATE Engine.
                TASK: Define the epistemic requirements for: '{cos_text}'. Write the '{field}'.
                ATTENUATION: Ensure the scope of research fits the HORIZON constraint.
                OUTPUT: JSON {{ "text": "Your research text here." }}
            """,
            "prerequisites": """
                To answer the research question implied by: '{cos_text}', what data is required?
                Return JSON array: [{{\"data_req\": \"Specific Dataset\", \"access_status\": \"Unknown\"}}]
            """,
            "stakeholders": """
                Suggest 3 types of SMEs needed for: '{cos_text}'.
                Return JSON array: [{{\"name\": \"Role Title\", \"expertise\": \"Academic Field\"}}]
            """,
            "assumptions": """
                What theoretical assumptions are we making in '{cos_text}'?
                Return JSON array: [{{\"premise\": \"Theory...\", \"validation_method\": \"Lit Review\"}}]
            """,
            "resources": """
                Find 3 relevant papers/sources for: '{cos_text}'.
                Return JSON array: [{{\"title\": \"Paper Title\", \"type\": \"Paper\", \"url\": \"https://scholar.google.com/\"}}]
            """
        }
    },

    # ==============================================================================
    # 3. RISK (The Immune System)
    # ==============================================================================
    "Risk": {
        "definition": "Identifies threats, calculates exposure, and engineers resilience.",
        "icon": "fa-solid fa-shield-virus",
        "color": "#e53935", # Red
        "details_schema": [
            {"key": "risk_vector", "label": "Primary Risk Vector", "type": "text"},
            {"key": "scenario", "label": "Worst-Case Scenario", "type": "textarea", "rows": 3},
            {"key": "resilience_strategy", "label": "Resilience Strategy", "type": "textarea", "rows": 3}
        ],
        "prerequisite_schema": [
            {"key": "indicator", "label": "Early Warning Indicator", "type": "text"},
            {"key": "threshold", "label": "Trigger Threshold", "type": "text"}
        ],
        "stakeholder_schema": [
            {"key": "owner", "label": "Risk Owner", "type": "text"},
            {"key": "impacted_group", "label": "Impacted Group", "type": "text"}
        ],
        "assumption_schema": [
            {"key": "mitigation_theory", "label": "Mitigation Theory", "type": "text"},
            {"key": "confidence", "label": "Confidence (0-100)", "type": "slider"}
        ],
        "resource_schema": [
            {"key": "tool_name", "label": "Mitigation Tool", "type": "text"},
            {"key": "cost", "label": "Est. Cost", "type": "currency"}
        ],
        "prompts": {
            "narrative": """
                IDENTITY: You are the Risk Assessment Module.
                TASK: Write a '{field}' analysis for: '{cos_text}'.
                ATTENUATION: Consider the AVOIDANCE constraint provided in the system physics.
                OUTPUT: JSON {{ "text": "Your analysis here." }}
            """,
            "prerequisites": """
                For the risk scenario in '{cos_text}', what indicators must be monitored?
                Return JSON array: [{{\"indicator\": \"Metric to watch\", \"threshold\": \"Value\"}}]
            """,
            "stakeholders": """
                Who owns the risk associated with '{cos_text}'?
                Return JSON array: [{{\"owner\": \"Role\", \"impacted_group\": \"Population\"}}]
            """,
            "assumptions": """
                What 'safety assumptions' are we making about '{cos_text}' that could be false?
                Return JSON array: [{{\"mitigation_theory\": \"We assume...\", \"confidence\": 50}}]
            """,
            "resources": """
                Suggest 3 mitigation frameworks/tools for: '{cos_text}'.
                Return JSON array: [{{\"tool_name\": \"Framework Name\", \"cost\": \"0\"}}]
            """
        }
    },

    # ==============================================================================
    # 4. STAKEHOLDER (The Diplomat)
    # ==============================================================================
    "Stakeholder": {
        "definition": "Maps the human network, alignment, and value exchange.",
        "icon": "fa-solid fa-user-astronaut",
        "color": "#ffca28", # Amber
        "details_schema": [
            {"key": "alignment_goal", "label": "Alignment Goal", "type": "textarea"},
            {"key": "value_proposition", "label": "Value Proposition", "type": "textarea"}
        ],
        "prerequisite_schema": [
            {"key": "intro_path", "label": "Introduction Pathway", "type": "text"},
            {"key": "material_needs", "label": "Materials Needed", "type": "text"}
        ],
        "stakeholder_schema": [
            {"key": "name", "label": "Contact Name", "type": "text"},
            {"key": "influence", "label": "Influence (0-100)", "type": "slider"},
            {"key": "stance", "label": "Stance", "type": "select", "options": ["Champion", "Neutral", "Blocker"]}
        ],
        "assumption_schema": [
            {"key": "incentive_theory", "label": "Incentive Theory", "type": "text"},
            {"key": "validated", "label": "Confirmed?", "type": "toggle"}
        ],
        "resource_schema": [
            {"key": "title", "label": "Document", "type": "text"},
            {"key": "status", "label": "Status", "type": "select", "options": ["Draft", "Sent", "Signed"]}
        ],
        "prompts": {
            "narrative": """
                IDENTITY: You are the Diplomacy Module.
                TASK: Write a '{field}' strategy for: '{cos_text}'.
                ATTENUATION: Adjust tone and targets based on the SCALE and OPERATOR constraints (e.g. Grassroots vs. Global).
                OUTPUT: JSON {{ "text": "Your strategy here." }}
            """,
            "prerequisites": """
                To engage stakeholders for '{cos_text}', what materials are prerequisites?
                Return JSON array: [{{\"intro_path\": \"Via Industry Group\", \"material_needs\": \"Pitch Deck\"}}]
            """,
            "stakeholders": """
                Who are the key decision makers for: '{cos_text}'?
                Return JSON array: [{{\"name\": \"Role/Title\", \"influence\": 80, \"stance\": \"Neutral\"}}]
            """,
            "assumptions": """
                Why do we think these stakeholders will align with '{cos_text}'?
                Return JSON array: [{{\"incentive_theory\": \"They benefit by...\", \"validated\": false}}]
            """,
            "resources": """
                What agreements are standard for: '{cos_text}'?
                Return JSON array: [{{\"title\": \"MOU/Contract\", \"status\": \"Draft\"}}]
            """
        }
    },

    # ==============================================================================
    # 5. PRAXIS (The Operator)
    # ==============================================================================
    "Praxis": {
        "definition": "The physics of doing. Tasks, friction, and execution.",
        "icon": "fa-solid fa-rocket",
        "color": "#5c6bc0", # Indigo
        "details_schema": [
            {"key": "objective", "label": "Operational Objective", "type": "textarea", "rows": 2},
            {"key": "friction_analysis", "label": "Friction Analysis", "type": "textarea"}
        ],
        "prerequisite_schema": [
            {"key": "dependency", "label": "Hard Dependency", "type": "text"},
            {"key": "status", "label": "Status", "type": "select", "options": ["Blocked", "Ready"]}
        ],
        "stakeholder_schema": [
            {"key": "executor", "label": "Executor", "type": "text"},
            {"key": "approver", "label": "Approver", "type": "text"}
        ],
        "assumption_schema": [
            {"key": "time_est", "label": "Time Est", "type": "text"},
            {"key": "resource_avail", "label": "Resources Available?", "type": "toggle"}
        ],
        "resource_schema": [
            {"key": "tool", "label": "Tool/Platform", "type": "text"},
            {"key": "instructions", "label": "SOP/Link", "type": "link"}
        ],
        "prompts": {
            "narrative": """
                IDENTITY: You are the Operations Module.
                TASK: Write a '{field}' plan for: '{cos_text}'.
                ATTENUATION: Ensure the logistical complexity fits the BUDGET and OPERATOR constraints.
                OUTPUT: JSON {{ "text": "Your plan here." }}
            """,
            "prerequisites": """
                What must physically exist before '{cos_text}' can start?
                Return JSON array: [{{\"dependency\": \"Task X Complete\", \"status\": \"Blocked\"}}]
            """,
            "stakeholders": """
                Who executes and who approves: '{cos_text}'?
                Return JSON array: [{{\"executor\": \"Role\", \"approver\": \"Manager/Client\"}}]
            """,
            "assumptions": """
                What are the time/resource assumptions for '{cos_text}'?
                Return JSON array: [{{\"time_est\": \"2 Weeks\", \"resource_avail\": true}}]
            """,
            "resources": """
                What tools or SOPs are needed for: '{cos_text}'?
                Return JSON array: [{{\"tool\": \"Tool Name\", \"instructions\": \"#\"}}]
            """
        }
    },

    # ==============================================================================
    # 6. ENVIRONMENT (The Ecologist)
    # ==============================================================================
    "Environment": {
        "definition": "Analysis of physical, market, and systemic ecosystems.",
        "icon": "fa-solid fa-leaf",
        "color": "#66bb6a", # Green
        "details_schema": [
            {"key": "ecosystem", "label": "Target Ecosystem", "type": "text"},
            {"key": "impact_assessment", "label": "Impact Assessment", "type": "textarea", "rows": 4}
        ],
        "prerequisite_schema": [
            {"key": "permit", "label": "Permit/Regulation", "type": "text"},
            {"key": "baseline_data", "label": "Baseline Data", "type": "text"}
        ],
        "stakeholder_schema": [
            {"key": "community", "label": "Community", "type": "text"},
            {"key": "regulator", "label": "Regulator", "type": "text"}
        ],
        "assumption_schema": [
            {"key": "trend", "label": "Market/Climate Trend", "type": "text"},
            {"key": "stability", "label": "Stability Confidence", "type": "slider"}
        ],
        "resource_schema": [
            {"key": "title", "label": "Report/Study", "type": "text"},
            {"key": "url", "label": "Link", "type": "link"}
        ],
        "prompts": {
            "narrative": """
                IDENTITY: You are the Systems Ecology Module.
                TASK: Write a '{field}' assessment for: '{cos_text}'.
                ATTENUATION: Align impact assessment with the SCALE and DIRECTIVE (Ethics) constraints.
                OUTPUT: JSON {{ "text": "Your assessment here." }}
            """,
            "prerequisites": """
                What regulatory permits or baselines are required for: '{cos_text}'?
                Return JSON array: [{{\"permit\": \"Permit Type\", \"baseline_data\": \"Survey Needed\"}}]
            """,
            "stakeholders": """
                Which communities or regulators gatekeep: '{cos_text}'?
                Return JSON array: [{{\"community\": \"Local Group\", \"regulator\": \"Agency\"}}]
            """,
            "assumptions": """
                What external trends are we assuming hold stable for '{cos_text}'?
                Return JSON array: [{{\"trend\": \"Trend Description\", \"stability\": 60}}]
            """,
            "resources": """
                Find impact studies relevant to: '{cos_text}'.
                Return JSON array: [{{\"title\": \"Report Title\", \"url\": \"#\"}}]
            """
        }
    },

    # ==============================================================================
    # 7. TIMELINE (The Scheduler)
    # ==============================================================================
    "Timeline": {
        "definition": "Sequence, tempo, and critical path management.",
        "icon": "fa-solid fa-stopwatch",
        "color": "#ba68c8", # Purple
        "details_schema": [
            {"key": "milestone_name", "label": "Major Milestone", "type": "text"},
            {"key": "slack_analysis", "label": "Buffer Analysis", "type": "textarea"}
        ],
        "prerequisite_schema": [
            {"key": "event", "label": "Preceding Event", "type": "text"},
            {"key": "lead_time", "label": "Lead Time", "type": "text"}
        ],
        "stakeholder_schema": [
            {"key": "owner", "label": "Schedule Owner", "type": "text"}
        ],
        "assumption_schema": [
            {"key": "velocity", "label": "Velocity Assumption", "type": "text"},
            {"key": "external_factors", "label": "External Factors", "type": "text"}
        ],
        "resource_schema": [
            {"key": "event", "label": "Event", "type": "text"},
            {"key": "date", "label": "Target Date", "type": "date"}
        ],
        "prompts": {
            "narrative": """
                IDENTITY: You are the Temporal Logistics Module.
                TASK: Write a '{field}' description for: '{cos_text}'.
                ATTENUATION: Critical! Ensure all lead times fit strictly within the HORIZON date provided.
                OUTPUT: JSON {{ "text": "Your analysis here." }}
            """,
            "prerequisites": """
                What events must happen *before* '{cos_text}'?
                Return JSON array: [{{\"event\": \"Precursor Event\", \"lead_time\": \"2 Weeks\"}}]
            """,
            "stakeholders": """
                Who is responsible for the schedule of: '{cos_text}'?
                Return JSON array: [{{\"owner\": \"Project Manager / Role\"}}]
            """,
            "assumptions": """
                What assumptions about speed/delays affect '{cos_text}'?
                Return JSON array: [{{\"velocity\": \"Standard Pace\", \"external_factors\": \"Weather/Shipping\"}}]
            """,
            "resources": """
                Suggest key calendar deadlines for: '{cos_text}'.
                Return JSON array: [{{\"event\": \"Milestone Name\", \"date\": \"2025-01-01\"}}]
            """
        }
    },

    # ==============================================================================
    # 8. ADVOCACY (The Campaigner)
    # ==============================================================================
    "Advocacy": {
        "definition": "Building momentum, narratives, and public will.",
        "icon": "fa-solid fa-bullhorn",
        "color": "#ff7043", # Orange
        "details_schema": [
            {"key": "core_narrative", "label": "Core Narrative", "type": "textarea", "rows": 3},
            {"key": "call_to_action", "label": "Call to Action", "type": "text"}
        ],
        "prerequisite_schema": [
            {"key": "asset", "label": "Creative Asset", "type": "text"},
            {"key": "platform", "label": "Platform Ready?", "type": "toggle"}
        ],
        "stakeholder_schema": [
            {"key": "audience", "label": "Target Audience", "type": "text"},
            {"key": "influencer", "label": "Influencer/Partner", "type": "text"}
        ],
        "assumption_schema": [
            {"key": "sentiment", "label": "Sentiment Assumption", "type": "text"},
            {"key": "resonance", "label": "Resonance Score", "type": "slider"}
        ],
        "resource_schema": [
            {"key": "title", "label": "Campaign Asset", "type": "text"},
            {"key": "type", "label": "Format", "type": "select", "options": ["Post", "Video", "Article"]}
        ],
        "prompts": {
            "narrative": """
                IDENTITY: You are the Campaign Strategy Module.
                TASK: Write a compelling '{field}' for: '{cos_text}'.
                ATTENUATION: Adjust the narrative voice to match the OPERATOR and DIRECTIVE (Ethics) constraints.
                OUTPUT: JSON {{ "text": "Your narrative here." }}
            """,
            "prerequisites": """
                What assets must be ready before advocating for '{cos_text}'?
                Return JSON array: [{{\"asset\": \"Video/Graphics\", \"platform\": false}}]
            """,
            "stakeholders": """
                Who is the target audience for '{cos_text}'?
                Return JSON array: [{{\"audience\": \"Demographic\", \"influencer\": \"Personality/Org\"}}]
            """,
            "assumptions": """
                What are we assuming the public feels about '{cos_text}'?
                Return JSON array: [{{\"sentiment\": \"Positive/Skeptical\", \"resonance\": 70}}]
            """,
            "resources": """
                Suggest 3 content media types for: '{cos_text}'.
                Return JSON array: [{{\"title\": \"Viral Video Concept\", \"type\": \"Video\"}}]
            """
        }
    },

    # ==============================================================================
    # 9. COLLABORATION (The Connector)
    # ==============================================================================
    "Collaboration": {
        "definition": "Synergy, partnerships, and joint ventures.",
        "icon": "fa-solid fa-handshake",
        "color": "#4dd0e1", # Cyan
        "details_schema": [
            {"key": "synergy_goal", "label": "Synergy Goal", "type": "textarea"},
            {"key": "governance", "label": "Governance Model", "type": "select", "options": ["Informal", "MOU", "Contractual"]}
        ],
        "prerequisite_schema": [
            {"key": "intro", "label": "Warm Intro Needed?", "type": "toggle"},
            {"key": "nda", "label": "NDA Required?", "type": "toggle"}
        ],
        "stakeholder_schema": [
            {"key": "partner_org", "label": "Partner Organization", "type": "text"},
            {"key": "poc", "label": "Point of Contact", "type": "text"}
        ],
        "assumption_schema": [
            {"key": "alignment", "label": "Alignment Assumption", "type": "textarea"},
            {"key": "resource_sharing", "label": "Sharing Willingness", "type": "slider"}
        ],
        "resource_schema": [
            {"key": "title", "label": "Agreement", "type": "text"},
            {"key": "status", "label": "Status", "type": "select", "options": ["Drafting", "Signed"]}
        ],
        "prompts": {
            "narrative": """
                IDENTITY: You are the Partnership Module.
                TASK: Write a '{field}' regarding the alliance for: '{cos_text}'.
                ATTENUATION: Ensure governance models fit the OPERATOR type (e.g. DAO vs Corp).
                OUTPUT: JSON {{ "text": "Your strategy here." }}
            """,
            "prerequisites": """
                What legal safeguards are needed before collaborating on '{cos_text}'?
                Return JSON array: [{{\"intro\": true, \"nda\": true}}]
            """,
            "stakeholders": """
                Identify potential partner organizations for: '{cos_text}'.
                Return JSON array: [{{\"partner_org\": \"Org Name\", \"poc\": \"Title/Role\"}}]
            """,
            "assumptions": """
                Why do we assume these partners want to work on '{cos_text}'?
                Return JSON array: [{{\"alignment\": \"Strategic Fit...\", \"resource_sharing\": 80}}]
            """,
            "resources": """
                What governance documents are required for: '{cos_text}'?
                Return JSON array: [{{\"title\": \"MOU/Teaming Agreement\", \"status\": \"Drafting\"}}]
            """
        }
    }
}

def get_valid_node_types():
    """Returns a list of all valid node type keys."""
    return list(NODES.keys())