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
        "criterion_schema": [
            {"key": "label", "label": "Criterion", "type": "text"},
            {"key": "criterion_type", "label": "Type", "type": "select", "options": ["Threshold", "Gate", "Constraint", "Conditional", "Benchmark"]},
            {"key": "operator", "label": "Operator", "type": "select", "options": ["≤", "≥", "=", "≠", "between"]},
            {"key": "target", "label": "Target", "type": "text"},
            {"key": "unit", "label": "Unit", "type": "text"},
            {"key": "current", "label": "Current Value", "type": "text"},
            {"key": "severity", "label": "Severity", "type": "select", "options": ["Hard", "Soft"]},
            {"key": "condition", "label": "Condition", "type": "text"},
            {"key": "if_true", "label": "If True", "type": "text"},
            {"key": "if_false", "label": "If False", "type": "text"},
            {"key": "reference", "label": "Reference", "type": "text"},
            {"key": "status", "label": "Status", "type": "select", "options": ["Pending", "Pass", "Fail", "Blocked", "Compliant", "Violated", "Unresolved"]}
        ],
        "prompts": {
            "narrative": """
                IDENTITY: You are a sub-routine of the SPECULATE Engine.
                TASK: Write a highly specific, bespoke '{field}' for the objective: '{cos_text}'.
                CRITICAL INSTRUCTION: Do NOT write generic filler, corporate buzzwords, or dictionary definitions of what the field means. Invent concrete, tangible details, specific mechanics, and real-world implementation steps.
                CONSTRAINT: Strictly adhere to the System Physics (Budget, Operator, Horizon) provided in the context.
                OUTPUT: JSON {{ "text": "Your bespoke, concrete text here." }}
            """,
            "prerequisites": "Analyze '{cos_text}'. Considering the System Constraints, what 3 precursors are physically required? Return JSON array: [{{\"title\": \"Prereq\", \"status\": \"Pending\"}}]",
            "stakeholders": "Who is involved in '{cos_text}'? Ensure they match the OPERATOR context (e.g. Grassroots vs Corp). Return JSON array: [{{\"name\": \"Name/Role\", \"role\": \"Description\"}}]",
            "assumptions": "What are we assuming about '{cos_text}'? Return JSON array: [{{\"hypothesis\": \"Assumption...\", \"risk\": \"Medium\"}}]",
            "resources": "Suggest 3 resources for '{cos_text}' compatible with the BUDGET context. Return JSON array: [{{\"title\": \"Resource Name\", \"url\": \"#\"}}]",
            "criteria": """Analyze '{cos_text}' and extract 3-5 concrete, testable success criteria. For each, identify the most appropriate type:
- Threshold: numeric pass/fail (has operator + target number + unit)
- Gate: binary checkpoint (done or not done, may block downstream work)
- Constraint: invariant rule (must ALWAYS be true)
- Conditional: if/then branching logic (contingency path)
- Benchmark: comparison to external reference point

Return JSON array: [{{\"label\": \"Criterion name\", \"criterion_type\": \"Threshold|Gate|Constraint|Conditional|Benchmark\", \"operator\": \"≤\", \"target\": \"50000\", \"unit\": \"$\", \"status\": \"Pending\"}}]
Only include fields relevant to the criterion_type. For Gate: use label + status. For Constraint: use label + severity + status. For Conditional: use label + condition + if_true + if_false + status."""
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
                TASK: Formulate a highly specific, actionable '{field}' for: '{cos_text}'.
                RULES:
                - If the field is 'research_question': Write ONLY the precise, testable research question itself. 2-3 sentences MAX. No preamble.
                - If the field is 'summary': Write a concrete, bespoke executive synthesis detailing the exact research approach, methodology, and specific data targets. Do NOT use generic filler like 'we will conduct research to understand the market'. Name the specific methodologies.
                ATTENUATION: Ensure the scope of research fits the HORIZON constraint.
                OUTPUT: JSON {{ "text": "Your specific, concrete text here." }}
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
                IDENTITY: You are the Risk Engineering Module.
                TASK: Write a highly specific, bespoke '{field}' for: '{cos_text}'.
                CRITICAL INSTRUCTION: Do NOT use generic risk filler (e.g. 'we will mitigate risks by implementing a plan'). Detail the EXACT failure vectors, structural vulnerabilities, or specific worst-case scenarios. Invent tangible mitigation mechanics (e.g. 'implementing triple-redundant failovers for the specific API gateway').
                ATTENUATION: Align the resilience strategy with the HORIZON constraint.
                OUTPUT: JSON {{ "text": "Your bespoke risk assessment here." }}
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
                IDENTITY: You are the Operations Tactical Module.
                TASK: Write a highly specific, bespoke '{field}' plan for: '{cos_text}'.
                CRITICAL INSTRUCTION: Do NOT use generic corporate buzzwords (e.g. 'we will prioritize critical path activities', 'efficiently allocate resources', 'leverage synergies'). Describe EXACTLY WHAT is being built, HOW it operates physically, and the specific logistical mechanics. Invent tangible operational details that prove you read the context.
                ATTENUATION: Ensure the logistical complexity fits the BUDGET and OPERATOR constraints.
                OUTPUT: JSON {{ "text": "Your bespoke tactical plan here." }}
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
                What tools or SOPs are needed for '{cos_text}'?
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
                TASK: Write a highly specific, bespoke '{field}' assessment for: '{cos_text}'.
                CRITICAL INSTRUCTION: Avoid generic sustainability filler (e.g. 'we will assess the environmental impact to ensure compliance'). Name the exact ecosystems, specific pollutants, zoning challenges, or community dynamics involved. Invent tangible, real-world context.
                ATTENUATION: Align impact assessment with the SCALE and DIRECTIVE (Ethics) constraints.
                OUTPUT: JSON {{ "text": "Your specific ecological assessment here." }}
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
                TASK: Write a highly specific, bespoke '{field}' for: '{cos_text}'.
                CRITICAL INSTRUCTION: Do NOT use generic timeline filler (e.g. 'we will sequence events to ensure timely delivery'). Specify the EXACT phasing, tangible dependencies, and specific temporal bottlenecks (e.g. 'Phase 1 requires 4 weeks for soil remediation before foundations can be poured').
                ATTENUATION: Ensure the timeline strictly fits the HORIZON constraint.
                OUTPUT: JSON {{ "text": "Your specific timeline plan here." }}
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
                IDENTITY: You are the Public Advocacy Module.
                TASK: Write a highly specific, bespoke '{field}' for: '{cos_text}'.
                CRITICAL INSTRUCTION: Do NOT use generic marketing filler (e.g. 'we will engage stakeholders to build awareness'). Name the exact channels, specific target demographics, and tangible messaging mechanics. Invent concrete campaign details.
                ATTENUATION: Align the tone with the DIRECTIVE (Ethics) constraint.
                OUTPUT: JSON {{ "text": "Your bespoke advocacy plan here." }}
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
                TASK: Write a highly specific, bespoke '{field}' for: '{cos_text}'.
                CRITICAL INSTRUCTION: Do NOT use generic partnership filler (e.g. 'we will foster synergies and build strategic relationships'). Define the EXACT nature of the partnership, specific value exchanges, and concrete terms of collaboration.
                ATTENUATION: Align the structure with the OPERATOR context.
                OUTPUT: JSON {{ "text": "Your specific partnership strategy here." }}
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
    },

    # ==============================================================================
    # 10. LEGAL (The Counselor)
    # ==============================================================================
    "Legal": {
        "definition": "Contracts, compliance, and regulatory frameworks.",
        "icon": "fa-solid fa-scale-balanced",
        "color": "#78909c", # Blue-gray
        "details_schema": [
            {"key": "regulatory_requirement", "label": "Regulatory Requirement", "type": "textarea", "rows": 3},
            {"key": "compliance_strategy", "label": "Compliance Strategy", "type": "textarea", "rows": 3}
        ],
        "prerequisite_schema": [
            {"key": "regulation", "label": "Applicable Law/Regulation", "type": "text"},
            {"key": "jurisdiction", "label": "Jurisdiction", "type": "text"}
        ],
        "stakeholder_schema": [
            {"key": "counsel", "label": "Legal Counsel", "type": "text"},
            {"key": "authority", "label": "Regulatory Authority", "type": "text"}
        ],
        "assumption_schema": [
            {"key": "interpretation", "label": "Regulatory Interpretation", "type": "text"},
            {"key": "risk_level", "label": "Compliance Risk", "type": "select", "options": ["Low", "Medium", "High"]}
        ],
        "resource_schema": [
            {"key": "document", "label": "Legal Document", "type": "text"},
            {"key": "status", "label": "Status", "type": "select", "options": ["Draft", "Under Review", "Executed"]}
        ],
        "prompts": {
            "narrative": """
                IDENTITY: You are the Legal Counsel Module.
                TASK: Write a highly specific, bespoke '{field}' for the legal/regulatory requirements of: '{cos_text}'.
                CRITICAL INSTRUCTION: Do NOT use generic legal filler (e.g. 'we will ensure compliance with all applicable laws'). Cite plausible specific regulations, exact compliance frameworks, or specific liability mechanisms relevant to the context.
                ATTENUATION: Align regulatory complexity with the OPERATOR and SCALE constraints.
                OUTPUT: JSON {{ "text": "Your specific compliance analysis here." }}
            """,
            "prerequisites": """
                What laws, permits, or regulations apply to '{cos_text}'?
                Return JSON array: [{{"regulation": "Specific Law/Code", "jurisdiction": "City/State/Federal"}}]
            """,
            "stakeholders": """
                Who provides legal oversight for '{cos_text}'?
                Return JSON array: [{{"counsel": "Attorney/Firm", "authority": "Regulatory Body"}}]
            """,
            "assumptions": """
                What regulatory interpretations are we relying on for '{cos_text}'?
                Return JSON array: [{{"interpretation": "We assume the regulation means...", "risk_level": "Medium"}}]
            """,
            "resources": """
                What legal documents are required for '{cos_text}'?
                Return JSON array: [{{"document": "Contract/License/Permit", "status": "Draft"}}]
            """
        }
    },

    # ==============================================================================
    # 11. FINANCIAL (The Treasurer)
    # ==============================================================================
    "Financial": {
        "definition": "Budgets, funding models, and economic sustainability.",
        "icon": "fa-solid fa-coins",
        "color": "#43a047", # Money-green
        "details_schema": [
            {"key": "financial_objective", "label": "Financial Objective", "type": "textarea", "rows": 3},
            {"key": "funding_model", "label": "Funding Model", "type": "textarea", "rows": 3}
        ],
        "prerequisite_schema": [
            {"key": "capital_req", "label": "Capital Requirement", "type": "text"},
            {"key": "secured", "label": "Secured?", "type": "select", "options": ["Pending", "Partial", "Secured"]}
        ],
        "stakeholder_schema": [
            {"key": "funder", "label": "Funder/Investor", "type": "text"},
            {"key": "terms", "label": "Terms", "type": "text"}
        ],
        "assumption_schema": [
            {"key": "revenue_model", "label": "Revenue Assumption", "type": "text"},
            {"key": "burn_rate", "label": "Burn Rate", "type": "text"}
        ],
        "resource_schema": [
            {"key": "instrument", "label": "Financial Instrument", "type": "text"},
            {"key": "amount", "label": "Amount", "type": "text"}
        ],
        "prompts": {
            "narrative": """
                IDENTITY: You are the Financial Modeling Module.
                TASK: Write a highly specific, bespoke '{field}' for the financial dimensions of: '{cos_text}'.
                CRITICAL INSTRUCTION: Do NOT use generic financial filler (e.g. 'we will optimize costs to ensure ROI'). Specify exact capital allocation strategies, specific funding vehicles (e.g. Series A, municipal bonds), or concrete financial mechanisms.
                ATTENUATION: Strictly align with the BUDGET constraint. A 'Sweat Equity' project gets different advice than 'Venture Capital'.
                OUTPUT: JSON {{ "text": "Your bespoke financial analysis here." }}
            """,
            "prerequisites": """
                What capital or financial prerequisites are needed for '{cos_text}'?
                Return JSON array: [{{"capital_req": "Specific Amount/Resource", "secured": "Pending"}}]
            """,
            "stakeholders": """
                Who funds or financially supports '{cos_text}'?
                Return JSON array: [{{"funder": "Investor/Grant Body", "terms": "Equity/Grant/Loan"}}]
            """,
            "assumptions": """
                What financial assumptions underpin '{cos_text}'?
                Return JSON array: [{{"revenue_model": "We assume revenue from...", "burn_rate": "$X/month"}}]
            """,
            "resources": """
                What financial instruments or accounts are needed for '{cos_text}'?
                Return JSON array: [{{"instrument": "Grant/Line of Credit/Revenue", "amount": "$X"}}]
            """
        }
    },

    # ==============================================================================
    # 12. TECHNOLOGY (The Architect)
    # ==============================================================================
    "Technology": {
        "definition": "Platforms, tools, and technical architecture.",
        "icon": "fa-solid fa-microchip",
        "color": "#1565c0", # Deep blue
        "details_schema": [
            {"key": "technical_spec", "label": "Technical Specification", "type": "textarea", "rows": 3},
            {"key": "architecture", "label": "Architecture Overview", "type": "textarea", "rows": 3}
        ],
        "prerequisite_schema": [
            {"key": "tech_dependency", "label": "Technical Dependency", "type": "text"},
            {"key": "status", "label": "Status", "type": "select", "options": ["Evaluating", "Selected", "Deployed"]}
        ],
        "stakeholder_schema": [
            {"key": "engineer", "label": "Technical Lead", "type": "text"},
            {"key": "vendor", "label": "Vendor/Provider", "type": "text"}
        ],
        "assumption_schema": [
            {"key": "capability", "label": "Capability Assumption", "type": "text"},
            {"key": "maturity", "label": "Tech Maturity", "type": "select", "options": ["Emerging", "Proven", "Legacy"]}
        ],
        "resource_schema": [
            {"key": "platform", "label": "Platform/Tool", "type": "text"},
            {"key": "license", "label": "License", "type": "select", "options": ["Open Source", "Commercial", "Custom"]}
        ],
        "prompts": {
            "narrative": """
                IDENTITY: You are the Systems Architecture Module.
                TASK: Write a highly specific, bespoke '{field}' for the technology requirements of: '{cos_text}'.
                CRITICAL INSTRUCTION: Do NOT use generic tech filler (e.g. 'we will leverage innovative platforms for digital transformation'). Name exact theoretical tech stacks, specific protocols, hardware requirements, or integration mechanics.
                ATTENUATION: Match technical complexity to the BUDGET and OPERATOR constraints. A bootstrapped individual needs low-code; an enterprise needs enterprise-grade.
                OUTPUT: JSON {{ "text": "Your specific technical specification here." }}
            """,
            "prerequisites": """
                What technical dependencies must be resolved for '{cos_text}'?
                Return JSON array: [{{"tech_dependency": "Specific Platform/API/Tool", "status": "Evaluating"}}]
            """,
            "stakeholders": """
                Who builds and maintains the technology for '{cos_text}'?
                Return JSON array: [{{"engineer": "Role/Title", "vendor": "Provider Name"}}]
            """,
            "assumptions": """
                What technical assumptions are we making about '{cos_text}'?
                Return JSON array: [{{"capability": "We assume the platform can...", "maturity": "Proven"}}]
            """,
            "resources": """
                What platforms or tools are needed for '{cos_text}'?
                Return JSON array: [{{"platform": "Tool Name", "license": "Open Source"}}]
            """
        }
    },

    # ==============================================================================
    # 13. MEASUREMENT (The Analyst)
    # ==============================================================================
    "Measurement": {
        "definition": "KPIs, metrics, and impact assessment.",
        "icon": "fa-solid fa-chart-line",
        "color": "#f57c00", # Warm orange
        "details_schema": [
            {"key": "success_metric", "label": "Success Metric", "type": "textarea", "rows": 3},
            {"key": "measurement_plan", "label": "Measurement Plan", "type": "textarea", "rows": 3}
        ],
        "prerequisite_schema": [
            {"key": "baseline", "label": "Baseline Value", "type": "text"},
            {"key": "data_source", "label": "Data Source", "type": "text"}
        ],
        "stakeholder_schema": [
            {"key": "analyst", "label": "Analyst/Owner", "type": "text"},
            {"key": "audience", "label": "Report Audience", "type": "text"}
        ],
        "assumption_schema": [
            {"key": "target", "label": "Target Value", "type": "text"},
            {"key": "confidence", "label": "Confidence", "type": "slider"}
        ],
        "resource_schema": [
            {"key": "tool", "label": "Analytics Tool", "type": "text"},
            {"key": "frequency", "label": "Frequency", "type": "select", "options": ["Daily", "Weekly", "Monthly", "Quarterly"]}
        ],
        "prompts": {
            "narrative": """
                IDENTITY: You are the Performance Analytics Module.
                TASK: Write a highly specific, bespoke '{field}' defining how success is measured for: '{cos_text}'.
                CRITICAL INSTRUCTION: Do NOT use generic metrics filler (e.g. 'we will monitor KPIs to track success'). Define the EXACT data points being measured, the telemetry systems used, and the specific cadence of measurement.
                ATTENUATION: Align measurement complexity with the SCALE and MODALITY constraints.
                OUTPUT: JSON {{ "text": "Your specific measurement plan here." }}
            """,
            "prerequisites": """
                What baselines must be established before measuring '{cos_text}'?
                Return JSON array: [{{"baseline": "Current Value/State", "data_source": "Where to get it"}}]
            """,
            "stakeholders": """
                Who tracks and reports on '{cos_text}'?
                Return JSON array: [{{"analyst": "Role/Title", "audience": "Board/Funders/Team"}}]
            """,
            "assumptions": """
                What targets are we aiming for with '{cos_text}'?
                Return JSON array: [{{"target": "Specific KPI Target", "confidence": 70}}]
            """,
            "resources": """
                What tools are needed to measure '{cos_text}'?
                Return JSON array: [{{"tool": "Analytics Platform", "frequency": "Monthly"}}]
            """
        }
    }
}

def get_valid_node_types():
    """Returns a list of all valid node type keys."""
    return list(NODES.keys())