# system_nodes.py
"""
THE SYSTEM PARAMETER MANIFEST (v2026.04 - Sphere of Influence Edition)
------------------------------------
CHANGELOG:
- SCALE: Refactored to "Sphere of Influence". Maps to the Curriculum for Living levels
  (Self -> Group -> Community -> World).
- DIRECTIVE/AVOIDANCE: Configured for Tag Interface.
"""

SYSTEM_NODES = {
    # ==============================================================================
    # 0. THE MASTER NODE (The Root Container)
    # ==============================================================================
    "GOAL": {
        "label": "The Future Fulfilled",
        "icon": "fa-solid fa-bullseye",
        "color": "#212121", 
        "description": "The destination as a completed fact.",
        "guide": "Speak from the future. Do not say 'We want to build a park.' Say 'The Community Park IS open and thriving.'",
        "ui_type": "textarea",
        "prompt_injection": "PRIME DIRECTIVE ATTENUATION: The user has defined the Future Fulfilled as: '{value}'. All generated content must act as history leading up to this established fact."
    },

    # ==============================================================================
    # 1. CORE CONSTRAINTS (Identity & Time)
    # ==============================================================================
    "OPERATOR": {
        "label": "The Driver",
        "icon": "fa-solid fa-user-astronaut",
        "color": "#03a9f4", 
        "description": "Who is responsible for this outcome?",
        "guide": "The identity of the driver determines available leverage.",
        "ui_type": "select",
        "options": [
            "Individual Agent", 
            "Community / Grassroots", 
            "Small Team / Startup", 
            "Non-Profit / NGO", 
            "Corporate / Enterprise", 
            "Public / Civic Body",
            "Unsure / TBD"
        ],
        "wizard": {
            "question": "Who is Driving?",
            "helper": "Select the operational entity to calibrate resource leverage.",
            "insight_map": {
                "Individual Agent": "High autonomy. We will prioritize personal integrity and individual action.",
                "Community / Grassroots": "Powered by enrollment. We will focus on shared possibility and volunteerism.",
                "Small Team / Startup": "Optimized for agility. We will structure for rapid iteration and feedback.",
                "Non-Profit / NGO": "Mission-driven. We will focus on alignment, grants, and public trust.",
                "Corporate / Enterprise": "Resource-rich. We will account for compliance, scale, and integration.",
                "Public / Civic Body": "High authority. We will map regulatory frameworks and public mandates.",
                "Unsure / TBD": "The System will suggest the optimal operator based on the goal's complexity."
            }
        },
        "prompt_injection": "OPERATOR ATTENUATION: The executing agent is defined as: '{value}'. Filter all suggestions to match the capabilities and limitations of this entity type."
    },

    "HORIZON": {
        "label": "Target Date",
        "icon": "fa-solid fa-stopwatch",
        "color": "#ff9800", 
        "description": "The date this reality is fully realized.",
        "guide": "Is this a sprint or a marathon?",
        "ui_type": "date", 
        "wizard": {
            "question": "When do we Arrive?",
            "helper": "The System will reverse-engineer milestones from this date.",
            "quick_selects": ["3 Months", "6 Months", "1 Year", "2 Years", "5 Years", "ASAP"]
        },
        "prompt_injection": "TEMPORAL ATTENUATION: The system has a hard stop at '{value}'. All roadmaps, lead times, and resource acquisitions must mathematically fit within this window."
    },

    # ==============================================================================
    # 2. PHYSICS & LOGISTICS (The Engine)
    # ==============================================================================

    "BUDGET": {
        "label": "Fuel Source",
        "icon": "fa-solid fa-bolt", 
        "color": "#4caf50", 
        "description": "The energy source for the project.",
        "ui_type": "select",
        "options": [
            "Bootstrapped ($0)", 
            "Crowdfunded", 
            "Grant Funded", 
            "Venture Capital", 
            "Public Budget",
            "Undetermined"
        ],
        "wizard": {
            "question": "How is this Fueled?",
            "helper": "Money is energy. The source determines the speed and the strings attached.",
            "insight_map": {
                "Bootstrapped ($0)": "Sweat equity model. We will prioritize free tools, barter, and organic growth.",
                "Crowdfunded": "Public mandate required. Marketing assets and community enrollment are critical.",
                "Grant Funded": "Milestone driven. Reporting, impact metrics, and compliance are top priorities.",
                "Venture Capital": "High octane. Focus on rapid scaling, burn rate, and defensible moats.",
                "Public Budget": "Oversight heavy. Procurement, auditing, and RFP processes will be factors.",
                "Undetermined": "The System will estimate resource requirements based on the goal scope."
            }
        },
        "prompt_injection": "ECONOMIC ATTENUATION: The project operates on a '{value}' model. Filter resource suggestions to match this economic physics."
    },

    # --- REFACTORED: FROM GEOGRAPHY TO ONTOLOGY ---
    "SCALE": {
        "label": "Sphere of Influence",
        "icon": "fa-solid fa-earth-americas",
        "color": "#3f51b5", 
        "description": "The level of transformation being generated.",
        "ui_type": "select",
        "options": [
            "Personal (Self)", 
            "Interpersonal (Group)", 
            "Organizational (Community)", 
            "Global (World)", 
            "Digital / Universal"
        ],
        "wizard": {
            "question": "What is the Impact?",
            "helper": "Define the scope of transformation you are committed to causing.",
            "insight_map": {
                "Personal (Self)": "Transformation of Self. We will focus on personal integrity, habits, and individual environments.",
                "Interpersonal (Group)": "Transformation of Relationship. We will focus on communication, agreement, and enrolling others.",
                "Organizational (Community)": "Transformation of Community. We will focus on systems, leadership, and collective action.",
                "Global (World)": "Transformation of the World. We will focus on systemic change, paradigms, and universal contribution.",
                "Digital / Universal": "Boundary-less impact. We will focus on scalability, networks, and viral distribution."
            }
        },
        "prompt_injection": """
            ONTOLOGICAL SCALE ATTENUATION: The solution is designed for the '{value}' sphere. 
            If Personal, focus on individual habits/resources. 
            If Group/Community, focus on enrollment and shared agreement. 
            If Global, focus on systemic change and universal paradigms.
        """
    },

    "MODALITY": {
        "label": "Work Style",
        "icon": "fa-solid fa-people-carry-box",
        "color": "#607d8b", 
        "description": "The rhythm of coordination.",
        "ui_type": "select",
        "options": [
            "Agile / Iterative", 
            "Waterfall / Planned", 
            "Swarm / Decentralized", 
            "Crisis Response"
        ],
        "wizard": {
            "question": "How do we Coordinate?",
            "helper": "The rhythm of the team dictates the structure of the plan.",
            "insight_map": {
                "Agile / Iterative": "Build, measure, learn. We will structure via Sprints and feedback loops.",
                "Waterfall / Planned": "Measure twice, cut once. We will structure via Dependencies and sequencing.",
                "Swarm / Decentralized": "Parallel autonomy. We will structure via independent Nodes and shared context.",
                "Crisis Response": "Speed over efficiency. We will structure via Immediate Actions and triage."
            }
        },
        "prompt_injection": "METHODOLOGICAL ATTENUATION: Work is performed using a '{value}' style. Structure Prerequisites and Milestones accordingly."
    },

    # ==============================================================================
    # 3. VALUES & ETHICS (The Filter - Tag Interfaces)
    # ==============================================================================

    "DIRECTIVE": {
        "label": "Non-Negotiables",
        "icon": "fa-solid fa-heart",
        "color": "#9c27b0", 
        "description": "The immutable standards we uphold.",
        "ui_type": "tags", # SIGNALS FRONTEND TO USE PILL INTERFACE
        "wizard": {
            "question": "What are the Core Values?",
            "helper": "Type a value and press Enter (e.g. 'Integrity', 'Open Source', 'Inclusion').",
            "placeholder": "Add a value...",
            "insight_map": {} 
        },
        "prompt_injection": """
            ETHICAL ATTENUATION: The project is strictly bound by these Core Values: [{value}]. 
            Any AI suggestion that conflicts with these standards must be rejected. 
            Prioritize alignment with these values over speed or cost efficiency.
        """
    },

    "AVOIDANCE": { 
        "label": "Dealbreakers",
        "icon": "fa-solid fa-ban", 
        "color": "#ef5350", 
        "description": "Outcomes we must prevent at all costs.",
        "ui_type": "tags", # SIGNALS FRONTEND TO USE PILL INTERFACE
        "wizard": {
            "question": "What must we Avoid?",
            "helper": "Type a risk and press Enter (e.g. 'Burnout', 'Debt', 'Exclusion').",
            "placeholder": "Add a dealbreaker...",
            "insight_map": {}
        },
        "prompt_injection": """
            RISK ATTENUATION: The project must specifically avoid: [{value}]. 
            Scan all generated CEs for second-order effects that might trigger these negative outcomes.
        """
    },

    # ==============================================================================
    # 4. THE ARTIFACT
    # ==============================================================================

    "FULFILLMENT": {
        "label": "The Proof",
        "icon": "fa-solid fa-signature",
        "color": "#009688", # Teal
        "description": "The tangible evidence of completion.",
        "ui_type": "text",
        "wizard": {
            "question": "What is the Final Artifact?",
            "helper": "When the dust settles, what physical object proves we finished?",
            "placeholder": "e.g. The Signed Treaty, The Occupied Building...",
            "insight_map": {}
        },
        "prompt_injection": "ARTIFACT ATTENUATION: The final output must be a '{value}'. Reverse-engineer the 'Production' CEs required to manufacture this specific object."
    }
}

def get_valid_system_types():
    """Returns a list of all valid system node keys."""
    return list(SYSTEM_NODES.keys())

def get_system_node_config(key):
    """Safe retrieval of config with fallback."""
    return SYSTEM_NODES.get(key, SYSTEM_NODES['OPERATOR'])