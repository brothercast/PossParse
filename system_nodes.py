# system_nodes.py
"""
THE SYSTEM PARAMETER MANIFEST (v4.0 - Networked Autonomy)
------------------------------------
This file defines the "Physics" of the SSOL Universe.
These nodes act as the 'Environmental Variables' for the Speculation Engine.

CONCEPTS:
- MASTER NODE: The "GOAL" node acting as the primary container.
- ATTENUATION: 'prompt_injection' fields are prepended to every AI call,
  ensuring CEs (currency) automatically align with these constraints.
"""

SYSTEM_NODES = {
    # ==============================================================================
    # 0. THE MASTER NODE (The Root Container)
    # ==============================================================================
    "GOAL": {
        "label": "Prime Objective",
        "icon": "fa-solid fa-bullseye",
        "color": "#212121", # Black/Dark Grey (The Singularity)
        "description": "The Singularity. The absolute definition of the future state. All other nodes orbit this gravity well.",
        "guide": "State the outcome as a completed fact in the past tense (e.g., 'The Ocean was cleaned').",
        "ui_type": "textarea",
        "examples": ["The Event was successfully hosted", "The Prototype is functional"],
        "prompt_injection": """
            PRIME DIRECTIVE: The ultimate purpose of every element generated must directly contribute to: '{value}'.
            Discard any suggestion that does not have a causal link to this outcome.
        """
    },

    # ==============================================================================
    # 1. CORE CONSTRAINTS (Time & Identity)
    # ==============================================================================
    "HORIZON": {
        "label": "Target Deadline",
        "icon": "fa-solid fa-calendar-day",
        "color": "#ff9800", # Amber (Urgency)
        "description": "The Temporal Boundary. When does this possibility collapse into reality?",
        "guide": "Is this a hard stop (Election Day) or a soft target (Quarter 4)?",
        "ui_type": "date_manager", 
        "prompt_injection": """
            TEMPORAL ATTENUATION: The system has a hard stop at '{value}'. 
            All generated roadmaps, lead times, and resource acquisitions must mathematically fit within this window. 
            Flag any CEs that inherently require more time than available.
        """
    },
    
    "OPERATOR": {
        "label": "Project Champion",
        "icon": "fa-solid fa-user-check",
        "color": "#03a9f4", # Light Blue (Identity)
        "description": "The Driver. The specific entity types responsible for execution.",
        "guide": "Who is driving? A DAO? A Non-Profit? A Corporation? This dictates available leverage.",
        "ui_type": "entity_stack",
        "examples": ["Community Land Trust", "Agile Software Team", "Solo Founder"],
        "prompt_injection": """
            OPERATOR ATTENUATION: The executing agent is defined as: '{value}'. 
            Ensure all suggestions (budgeting style, legal frameworks, organizational hierarchy) are native to this specific type of entity.
            Do not suggest corporate strategies for grassroots operators, and vice versa.
        """
    },

    # ==============================================================================
    # 2. VALUES & ETHICS (The Filter)
    # ==============================================================================

    "DIRECTIVE": {
        "label": "Core Value",
        "icon": "fa-solid fa-heart",
        "color": "#9c27b0", # Deep Purple (Spirit)
        "description": "The Immutable Law. The ethical framework that filters all decisions.",
        "guide": "What rule is unbreakable? (e.g. Radical Transparency, Zero Waste).",
        "ui_type": "text",
        "examples": ["Open Source Only", "Local Sourcing", "Consensus Governance"],
        "prompt_injection": """
            ETHICAL ATTENUATION: The value of '{value}' is non-negotiable. 
            Filter out any 'efficient' solutions that violate this principle. 
            Prioritize inefficient solutions if they better align with this value.
        """
    },

    "AVOIDANCE": { 
        "label": "Anti-Goal", 
        "icon": "fa-solid fa-triangle-exclamation",
        "color": "#ef5350", # Red (Danger)
        "description": "The Third Rail. Outcomes that constitute failure, even if the goal is met.",
        "guide": "What are we afraid of? (Gentrification, Debt, Burnout).",
        "ui_type": "text",
        "examples": ["Displacing Residents", "Vendor Lock-in", "Public Debt"],
        "prompt_injection": """
            RISK ATTENUATION: The project must specifically avoid: '{value}'. 
            Scan all generated CEs for second-order effects that might trigger this negative outcome.
        """
    },

    # ==============================================================================
    # 3. PHYSICS & LOGISTICS (The Engine)
    # ==============================================================================

    "BUDGET": {
        "label": "Fuel Source",
        "icon": "fa-solid fa-piggy-bank",
        "color": "#4caf50", # Green (Money)
        "description": "The Economic Physics. Defines the sustainability and acquisition logic.",
        "guide": "How is this powered? Grants? Sales? Sweat Equity?",
        "ui_type": "select",
        "options": ["Bootstrapped ($0)", "Crowdfunded", "Grant Funded", "Venture Capital", "Public Budget"],
        "prompt_injection": """
            ECONOMIC ATTENUATION: The project operates on a '{value}' model. 
            Adjust resource granularity accordingly. 
            (e.g., if Bootstrapped, suggest 'sweat equity' and 'barter'. If VC, suggest 'hiring' and 'saas tools').
        """
    },

    "SCALE": {
        "label": "Impact Reach",
        "icon": "fa-solid fa-map-location-dot",
        "color": "#3f51b5", # Indigo (Space)
        "description": "The Spatial Footprint. Determines regulatory and logistical complexity.",
        "guide": "Where does this exist? A single room? A city? The internet?",
        "ui_type": "select",
        "options": ["Hyper-Local (Neighborhood)", "Municipal (City)", "Regional", "Global / Digital"],
        "prompt_injection": """
            SPATIAL ATTENUATION: The solution is scoped to a '{value}' footprint. 
            Ensure Stakeholder suggestions match this jurisdiction (e.g., City Council vs. UN).
            Ensure Resource suggestions match this logistics chain.
        """
    },

    "MODALITY": {
        "label": "Execution Style", 
        "icon": "fa-solid fa-people-carry-box",
        "color": "#607d8b", # Blue Grey (Method)
        "description": "The Rhythm of Work. How does the team coordinate?",
        "ui_type": "select",
        "options": ["Agile / Iterative", "Waterfall / Planned", "Swarm / Decentralized", "Crisis Response"],
        "prompt_injection": """
            METHODOLOGICAL ATTENUATION: Work is performed using a '{value}' style. 
            Structure Prerequisites as 'Sprints' or 'Milestones' accordingly.
            Define 'Done' based on this philosophy.
        """
    },

    # ==============================================================================
    # 4. THE ARTIFACT
    # ==============================================================================

    "FULFILLMENT": {
        "label": "Final Deliverable",
        "icon": "fa-solid fa-box-open",
        "color": "#009688", # Teal (Tangible)
        "description": "The Artifact. What physical or digital object remains when the project ends?",
        "guide": "Is it a PDF? A Building? A Law? A Community Garden?",
        "ui_type": "text",
        "examples": ["Legislative Bill", "Physical Prototype", "Research Paper", "Community Center"],
        "prompt_injection": """
            ARTIFACT ATTENUATION: The final output must be a '{value}'. 
            Reverse-engineer the 'Production' CEs required to manufacture/author/build this specific object.
        """
    },

    # ==============================================================================
    # 5. WILDCARD
    # ==============================================================================
    "CUSTOM": {
        "label": "Custom Vector",
        "icon": "fa-solid fa-fingerprint",
        "color": "#e91e63", # Pink (Unique)
        "description": "User-Defined Constraint. Any specific variable not covered above.",
        "ui_type": "text",
        "prompt_injection": """
            CUSTOM ATTENUATION: adhere strictly to this user-defined constraint: '{value}'.
        """
    }
}

def get_valid_system_types():
    """Returns a list of all valid system node keys."""
    return list(SYSTEM_NODES.keys())

def get_system_node_config(key):
    """Safe retrieval of config with fallback."""
    return SYSTEM_NODES.get(key, SYSTEM_NODES['OPERATOR'])