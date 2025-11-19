# ce_nodes.py
"""
THE SPECULATION ENVIRONMENT MANIFEST
------------------------------------
This file defines the DNA for every Node Application in the SSPEC system.
It goes beyond simple data entry, defining "Smart Schemas" that guide
users and AI agents to think strategically about each specific domain.

Schema Field Types for UI Rendering:
- text, textarea, number, date, link
- select (requires 'options')
- slider (0-100 range for confidence/impact)
- tags (array of strings)
- toggle (boolean switch)
- currency (financial values)
"""

NODES = {
    # ==============================================================================
    # 1. DEFAULT (The Fallback)
    # ==============================================================================
    "Default": {
        "definition": "General purpose speculation node.",
        "icon": "fa-solid fa-cube",
        "color": "#95a5a6",
        "details_schema": [
            {"key": "summary", "label": "Executive Summary", "type": "textarea", "rows": 4, "help": "High-level overview."},
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
        ]
    },

    # ==============================================================================
    # 2. RESEARCH (The Knowledge Engine)
    # ==============================================================================
    "Research": {
        "definition": "A workspace for finding, synthesizing, and analyzing truth.",
        "icon": "fa-solid fa-flask",
        "color": "#ec407a", # Pink (Discovery)
        "details_schema": [
            {"key": "research_question", "label": "Core Question", "type": "textarea", "help": "What is the single most important thing we need to know?", "rows": 2},
            {"key": "hypothesis", "label": "Working Hypothesis", "type": "textarea", "rows": 2},
            {"key": "synthesis", "label": "Synthesis of Findings", "type": "textarea", "rows": 6, "help": "AI Generated summary of all attached resources."}
        ],
        "prerequisite_schema": [
            {"key": "data_req", "label": "Data Requirement", "type": "text"},
            {"key": "access_status", "label": "Access", "type": "select", "options": ["Open", "Restricted", "Purchased"]},
            {"key": "blocker", "label": "Blockers", "type": "tags"}
        ],
        "stakeholder_schema": [
            {"key": "name", "label": "Subject Matter Expert", "type": "text"},
            {"key": "expertise", "label": "Field of Study", "type": "tags"},
            {"key": "credibility", "label": "Credibility Score", "type": "slider"}
        ],
        "assumption_schema": [
            {"key": "premise", "label": "Theoretical Premise", "type": "text"},
            {"key": "validation_method", "label": "Validation Method", "type": "select", "options": ["Lit Review", "Experiment", "Interview"]},
            {"key": "validated", "label": "Validated?", "type": "toggle"}
        ],
        "resource_schema": [
            {"key": "title", "label": "Title", "type": "text", "width": "full"},
            {"key": "url", "label": "Source URL", "type": "link", "width": "half"},
            {"key": "type", "label": "Type", "type": "select", "options": ["Paper", "Article", "Dataset", "Interview"], "width": "half"},
            {"key": "relevance", "label": "Relevance", "type": "slider", "width": "third"},
            {"key": "snippet", "label": "Key Insight", "type": "textarea", "width": "full"},
            {"key": "ai_summary", "label": "AI Analysis", "type": "textarea", "readonly": True, "width": "full"}
        ]
    },

    # ==============================================================================
    # 3. RISK (The Immune System)
    # ==============================================================================
    "Risk": {
        "definition": "Identifies threats, calculates exposure, and engineers resilience.",
        "icon": "fa-solid fa-shield-virus",
        "color": "#e53935", # Red (Warning)
        "details_schema": [
            {"key": "risk_vector", "label": "Primary Risk Vector", "type": "text", "help": "Where is the threat coming from?"},
            {"key": "scenario", "label": "Worst-Case Scenario", "type": "textarea", "rows": 3},
            {"key": "resilience_strategy", "label": "Resilience Strategy", "type": "textarea", "rows": 3}
        ],
        "prerequisite_schema": [ # Using Prerequisites to track "Early Warning Signs"
            {"key": "indicator", "label": "Early Warning Indicator", "type": "text"},
            {"key": "threshold", "label": "Trigger Threshold", "type": "text"},
            {"key": "monitoring", "label": "Monitoring Active?", "type": "toggle"}
        ],
        "stakeholder_schema": [
            {"key": "owner", "label": "Risk Owner", "type": "text"},
            {"key": "impacted_group", "label": "Impacted Group", "type": "text"}
        ],
        "assumption_schema": [
            {"key": "mitigation_theory", "label": "Mitigation Theory", "type": "text", "help": "Why do we think our plan will work?"},
            {"key": "confidence", "label": "Confidence", "type": "slider"}
        ],
        "resource_schema": [ # Specific schema for Risk Resources (Mitigation Tools)
            {"key": "tool_name", "label": "Mitigation Tool/Protocol", "type": "text"},
            {"key": "cost", "label": "Implementation Cost", "type": "currency"},
            {"key": "effectiveness", "label": "Est. Effectiveness", "type": "slider"}
        ]
    },

    # ==============================================================================
    # 4. STAKEHOLDER (The Social Graph)
    # ==============================================================================
    "Stakeholder": {
        "definition": "Maps the human network, alignment, and value exchange.",
        "icon": "fa-solid fa-user-astronaut",
        "color": "#ffca28", # Amber (Engagement)
        "details_schema": [
            {"key": "alignment_goal", "label": "Alignment Goal", "type": "textarea", "help": "What does 'success' look like for this group?"},
            {"key": "value_proposition", "label": "Value Proposition", "type": "textarea", "help": "What do they get out of it?"},
            {"key": "friction_points", "label": "Potential Friction", "type": "tags"}
        ],
        "prerequisite_schema": [
            {"key": "intro_path", "label": "Introduction Pathway", "type": "text", "help": "Who introduces us?"},
            {"key": "material_needs", "label": "Materials Needed", "type": "tags"}
        ],
        "stakeholder_schema": [ # This is recursive! Sub-stakeholders or team members
            {"key": "name", "label": "Contact Name", "type": "text"},
            {"key": "influence", "label": "Influence (0-100)", "type": "slider"},
            {"key": "interest", "label": "Interest (0-100)", "type": "slider"},
            {"key": "stance", "label": "Stance", "type": "select", "options": ["Champion", "Supporter", "Neutral", "Blocker"]}
        ],
        "assumption_schema": [
            {"key": "incentive_theory", "label": "Incentive Theory", "type": "text"},
            {"key": "validated", "label": "Confirmed via Interview?", "type": "toggle"}
        ],
        "resource_schema": [ # Resources here are CRM-like
            {"key": "title", "label": "Document/Contract", "type": "text"},
            {"key": "status", "label": "Status", "type": "select", "options": ["Draft", "Sent", "Signed"]},
            {"key": "link", "label": "Link", "type": "link"}
        ]
    },

    # ==============================================================================
    # 5. PRAXIS (The Action Engine)
    # ==============================================================================
    "Praxis": {
        "definition": "The physics of doing. Tasks, friction, and execution.",
        "icon": "fa-solid fa-rocket",
        "color": "#5c6bc0", # Indigo (Action)
        "details_schema": [
            {"key": "objective", "label": "Operational Objective", "type": "textarea", "rows": 2},
            {"key": "definition_of_done", "label": "Definition of Done", "type": "textarea", "rows": 3, "help": "Verifiable completion criteria."},
            {"key": "friction_analysis", "label": "Friction Analysis", "type": "textarea", "help": "Why is this hard?"}
        ],
        "prerequisite_schema": [
            {"key": "dependency", "label": "Hard Dependency", "type": "text"},
            {"key": "status", "label": "Status", "type": "select", "options": ["Blocked", "Ready", "Complete"]}
        ],
        "stakeholder_schema": [
            {"key": "executor", "label": "Executor", "type": "text"},
            {"key": "approver", "label": "Approver", "type": "text"}
        ],
        "assumption_schema": [
            {"key": "time_est", "label": "Time Estimation Assumption", "type": "text"},
            {"key": "resource_avail", "label": "Resource Availability Assumption", "type": "toggle"}
        ],
        "resource_schema": [
            {"key": "tool", "label": "Tool/Platform", "type": "text"},
            {"key": "access_link", "label": "Access Link", "type": "link"},
            {"key": "instructions", "label": "SOP/Instructions", "type": "textarea"}
        ]
    },

    # ==============================================================================
    # 6. ENVIRONMENT (The Context)
    # ==============================================================================
    "Environment": {
        "definition": "Analysis of physical, market, and systemic ecosystems.",
        "icon": "fa-solid fa-leaf",
        "color": "#66bb6a", # Green (Sustainability)
        "details_schema": [
            {"key": "ecosystem", "label": "Target Ecosystem", "type": "text"},
            {"key": "impact_assessment", "label": "Impact Assessment", "type": "textarea", "rows": 4},
            {"key": "circularity", "label": "Circularity/Regeneration Strategy", "type": "textarea", "rows": 3}
        ],
        "prerequisite_schema": [
            {"key": "permit", "label": "Permit/Regulatory Approval", "type": "text"},
            {"key": "baseline_data", "label": "Baseline Data Needed", "type": "text"}
        ],
        "stakeholder_schema": [
            {"key": "community", "label": "Local Community", "type": "text"},
            {"key": "regulator", "label": "Regulatory Body", "type": "text"}
        ],
        "assumption_schema": [
            {"key": "trend", "label": "Market/Climate Trend", "type": "text"},
            {"key": "stability", "label": "Stability Confidence", "type": "slider"}
        ],
        "resource_schema": [
            {"key": "title", "label": "Report/Study", "type": "text"},
            {"key": "data_points", "label": "Key Data Points", "type": "tags"},
            {"key": "url", "label": "Link", "type": "link"}
        ]
    },

    # ==============================================================================
    # 7. TIMELINE (The Temporal Backbone)
    # ==============================================================================
    "Timeline": {
        "definition": "Sequence, tempo, and critical path management.",
        "icon": "fa-solid fa-stopwatch",
        "color": "#ba68c8", # Purple
        "details_schema": [
            {"key": "milestone_name", "label": "Major Milestone", "type": "text"},
            {"key": "critical_path", "label": "Is Critical Path?", "type": "toggle"},
            {"key": "slack_analysis", "label": "Slack/Buffer Analysis", "type": "textarea"}
        ],
        "prerequisite_schema": [
            {"key": "event", "label": "Preceding Event", "type": "text"},
            {"key": "lead_time", "label": "Lead Time Needed", "type": "text"}
        ],
        "stakeholder_schema": [
            {"key": "owner", "label": "Schedule Owner", "type": "text"}
        ],
        "assumption_schema": [
            {"key": "velocity", "label": "Velocity Assumption", "type": "text"},
            {"key": "external_factors", "label": "External Factors (Weather/Supply)", "type": "tags"}
        ],
        "resource_schema": [
            {"key": "event", "label": "Event", "type": "text"},
            {"key": "start", "label": "Start Date", "type": "date"},
            {"key": "end", "label": "End Date", "type": "date"},
            {"key": "status", "label": "Status", "type": "select", "options": ["On Track", "At Risk", "Late"]}
        ]
    },

    # ==============================================================================
    # 8. ADVOCACY (The Voice)
    # ==============================================================================
    "Advocacy": {
        "definition": "Building momentum, narratives, and public will.",
        "icon": "fa-solid fa-bullhorn",
        "color": "#ff7043", # Orange
        "details_schema": [
            {"key": "core_narrative", "label": "Core Narrative", "type": "textarea", "rows": 3},
            {"key": "call_to_action", "label": "Call to Action (CTA)", "type": "text"},
            {"key": "channels", "label": "Key Channels", "type": "tags"}
        ],
        "prerequisite_schema": [
            {"key": "asset", "label": "Creative Asset Needed", "type": "text"},
            {"key": "platform", "label": "Platform Readiness", "type": "toggle"}
        ],
        "stakeholder_schema": [
            {"key": "audience", "label": "Target Audience Segment", "type": "text"},
            {"key": "influencer", "label": "Key Influencer/Partner", "type": "text"}
        ],
        "assumption_schema": [
            {"key": "sentiment", "label": "Public Sentiment Assumption", "type": "text"},
            {"key": "resonance", "label": "Resonance Score", "type": "slider"}
        ],
        "resource_schema": [
            {"key": "title", "label": "Campaign Asset", "type": "text"},
            {"key": "type", "label": "Format", "type": "select", "options": ["Video", "Article", "Social Post", "Event"]},
            {"key": "url", "label": "Link", "type": "link"}
        ]
    },

    # ==============================================================================
    # 9. COLLABORATION (The Glue)
    # ==============================================================================
    "Collaboration": {
        "definition": "Synergy, partnerships, and joint ventures.",
        "icon": "fa-solid fa-handshake",
        "color": "#4dd0e1", # Cyan
        "details_schema": [
            {"key": "synergy_goal", "label": "Synergy Goal", "type": "textarea", "help": "What can we do together that we can't do alone?"},
            {"key": "governance", "label": "Governance Model", "type": "select", "options": ["Informal", "MOU", "Contractual", "JV"]},
            {"key": "trust_level", "label": "Current Trust Level", "type": "slider"}
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
            {"key": "alignment", "label": "Strategic Alignment Assumption", "type": "textarea"},
            {"key": "resource_sharing", "label": "Resource Sharing Willingness", "type": "slider"}
        ],
        "resource_schema": [
            {"key": "title", "label": "Agreement/MOU", "type": "text"},
            {"key": "status", "label": "Status", "type": "select", "options": ["Drafting", "Negotiating", "Signed"]},
            {"key": "link", "label": "Link", "type": "link"}
        ]
    }
}

def get_valid_node_types():
    """Returns a list of all valid node type keys."""
    return list(NODES.keys())