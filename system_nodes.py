# system_nodes.py
"""
THE SYSTEM PARAMETER MANIFEST (v4.2 - Future Fulfilled Edition)
------------------------------------
This file defines the "Physics" of the SSOL Universe.
It translates User-Friendly Concepts (Frontend) into Rigorous AI Constraints (Backend).

CHANGELOG v4.2:
- GOAL: Renamed to "The Future Fulfilled" to enforce the doctrine of completed possibility.
- DIRECTIVE: Converted to 'textarea' to support multiple Standards/Core Values.
- PROMPTS: Tuned to prioritize Ethical Constraints over Efficiency.
"""

SYSTEM_NODES = {
    # ==============================================================================
    # 0. THE MASTER NODE (The Root Container)
    # ==============================================================================
    "GOAL": {
        "label": "The Future Fulfilled",  # Doctrine-aligned naming
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
        "icon": "fa-solid fa-user-check",
        "color": "#03a9f4", # Light Blue
        "description": "Who is responsible for this outcome?",
        "guide": "The identity of the driver determines available leverage. (e.g. 'A Mom' has different leverage than 'A Mayor').",
        "ui_type": "entity_stack",
        "prompt_injection": """
            OPERATOR ATTENUATION: The executing agent is defined as: '{value}'. 
            Filter all suggestions to match the capabilities of this entity type. 
            (e.g., Individuals cannot pass laws; Governments cannot move fast; Non-Profits need grants).
        """
    },

    "HORIZON": {
        "label": "Target Date",
        "icon": "fa-solid fa-calendar-day",
        "color": "#ff9800", # Amber
        "description": "The date this reality is fully realized.",
        "guide": "Is this a hard deadline (e.g., Election Day) or a flexible target?",
        "ui_type": "date_manager", 
        "prompt_injection": """
            TEMPORAL ATTENUATION: The system has a hard stop at '{value}'. 
            All generated roadmaps, lead times, and resource acquisitions must mathematically fit within this window. 
            Flag any CEs that inherently require more time than available as 'High Risk'.
        """
    },

    # ==============================================================================
    # 2. PHYSICS & LOGISTICS (The Engine)
    # ==============================================================================

    "BUDGET": {
        "label": "Funding Model",
        "icon": "fa-solid fa-piggy-bank",
        "color": "#4caf50", # Green
        "description": "The energy source for the project.",
        "guide": "How is this sustained? (e.g. 'Grant Funded' changes the reporting requirements; 'Bootstrapped' changes the speed).",
        "ui_type": "select",
        "options": [
            "Self-Funded (Sweat Equity)", 
            "Crowdfunded (Public Backing)", 
            "Grant Funded (Non-Profit)", 
            "Venture Capital (High Growth)", 
            "Public Budget (Taxpayer)"
        ],
        "prompt_injection": """
            ECONOMIC ATTENUATION: The project operates on a '{value}' model. 
            Filter resource suggestions to match this economic physics. 
            (e.g., if Self-Funded, prioritize 'barter' and 'volunteerism'. If VC, prioritize 'speed' and 'hiring').
        """
    },

    "SCALE": {
        "label": "Scale & Reach",
        "icon": "fa-solid fa-map-location-dot",
        "color": "#3f51b5", # Indigo
        "description": "The physical or digital footprint.",
        "guide": "Are we impacting a block, a city, or the planet?",
        "ui_type": "select",
        "options": [
            "Neighborhood (Hyper-Local)", 
            "City-Wide (Municipal)", 
            "Regional (State/Provincial)", 
            "Global (Planetary/Digital)"
        ],
        "prompt_injection": """
            SPATIAL ATTENUATION: The solution is scoped to a '{value}' footprint. 
            Ensure Stakeholder suggestions match this jurisdiction (e.g., City Council vs. UN).
            Ensure Resource suggestions match this logistics chain.
        """
    },

    "MODALITY": {
        "label": "Work Style",
        "icon": "fa-solid fa-people-carry-box",
        "color": "#607d8b", # Blue Grey
        "description": "The rhythm of coordination.",
        "guide": "How do we move? Agile (Iterative), Waterfall (Planned), Swarm (Decentralized), or Crisis (Speed).",
        "ui_type": "select",
        "options": [
            "Agile / Iterative", 
            "Waterfall / Planned", 
            "Swarm / Decentralized", 
            "Crisis Response"
        ],
        "prompt_injection": """
            METHODOLOGICAL ATTENUATION: Work is performed using a '{value}' style. 
            Structure Prerequisites as 'Sprints' or 'Milestones' accordingly.
            Define 'Done' based on this philosophy.
        """
    },

    # ==============================================================================
    # 3. VALUES & ETHICS (The Filter)
    # ==============================================================================

    "DIRECTIVE": {
        "label": "Core Values & Standards",  # Updated Label
        "icon": "fa-solid fa-heart",
        "color": "#9c27b0", # Deep Purple
        "description": "The immutable standards we uphold.",
        "guide": "List the non-negotiables. (e.g., '1. Open Source Code, 2. Living Wage, 3. Zero Carbon').",
        "ui_type": "textarea", # Changed to Textarea for multi-value input
        "examples": [
            "Open Source, Radical Transparency", 
            "Local Sourcing Only, Zero Waste", 
            "Consensus Governance, DEI Priority"
        ],
        "prompt_injection": """
            ETHICAL ATTENUATION: The project is strictly bound by these Core Values: '{value}'. 
            Any AI suggestion (resource, partner, or method) that conflicts with these standards must be rejected. 
            Prioritize alignment with these values over speed or cost efficiency.
        """
    },

    "AVOIDANCE": { 
        "label": "Dealbreakers",
        "icon": "fa-solid fa-triangle-exclamation",
        "color": "#ef5350", # Red
        "description": "Outcomes we must prevent at all costs.",
        "guide": "What does failure look like? (e.g. 'Displacing residents', 'Taking on debt').",
        "ui_type": "textarea", # Changed to Textarea
        "examples": ["Displacing Residents", "Vendor Lock-in", "Public Debt"],
        "prompt_injection": """
            RISK ATTENUATION: The project must specifically avoid: '{value}'. 
            Scan all generated CEs for second-order effects that might trigger this negative outcome.
        """
    },

    # ==============================================================================
    # 4. THE ARTIFACT
    # ==============================================================================

    "FULFILLMENT": {
        "label": "Final Artifact",
        "icon": "fa-solid fa-box-open",
        "color": "#009688", # Teal
        "description": "The tangible evidence of completion.",
        "guide": "When the dust settles, what physical/digital object proves we finished? (e.g. 'The Signed Treaty', 'The Occupied Building').",
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
        "label": "Custom Constraint",
        "icon": "fa-solid fa-fingerprint",
        "color": "#e91e63", # Pink
        "description": "Any specific requirements unique to this vision.",
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