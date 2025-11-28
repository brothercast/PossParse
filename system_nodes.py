# system_nodes.py
"""
THE SYSTEM PARAMETER MANIFEST
-----------------------------
This file defines the "System Nodes" (Strategic Anchors) for an SSOL.

ONTOLOGICAL STANCE:
These parameters act as the "Fixed Future." The AI is instructed to treat these 
not as goals to be attempted, but as realities that have already occurred.
All speculative logic involves "looking back" from this fulfilled state 
to determine what necessary components (CEs) brought it into existence.
"""

SYSTEM_NODES = {
    # ==============================================================================
    # 1. IDENTITY & CONTEXT (Who "Did" This?)
    # ==============================================================================
    
    "OPERATOR": {
        "label": "Operator Identity",
        "icon": "fa-solid fa-user-astronaut",
        "color": "#607d8b", # Slate Blue
        "description": "The entity responsible for this fulfillment.",
        "examples": ["Grassroots Org", "University Lab", "Series-A Startup"],
        "prompt_injection": """
            OPERATIONAL CONTEXT: This result was achieved by an entity operating as a '{value}'. 
            Ensure all speculative history (prerequisites/stakeholders) reflects the resources and limitations typical of this entity type.
        """
    },

    "SYSTEM_GOAL": {
        "label": "System Goal",
        "icon": "fa-solid fa-target",
        "color": "#ab47bc", # Horizon Purple
        "description": "The guiding ethos that was preserved throughout.",
        "examples": ["Open Source Forever", "Leave No Trace", "Radical Transparency"],
        "prompt_injection": """
            ETHICAL CONSTRAINT: Throughout the project's lifecycle, the directive '{value}' was strictly upheld. 
            Reject any 'means' that would have violated this 'end'.
        """
    },

    # ==============================================================================
    # 2. THE FULFILLED REALITY (The "Done" State)
    # ==============================================================================

    "FULFILLMENT": {
        "label": "Delivery Fulfilled",
        "icon": "fa-solid fa-box-open",
        "color": "#26c6da", # Horizon Cyan
        "description": "The tangible reality that exists now that the work is done.",
        "examples": ["Operational Clinic", "Published Law", "Manufactured Widget"],
        "prompt_injection": """
            FUTURE PERFECT STANCE: The project has successfully delivered a '{value}'. 
            Treat this object/state as real and tangible. Work backward to identify the physical components required to assemble it.
        """
    },

    "EVIDENCE": {
        "label": "Proof of Completion",
        "icon": "fa-solid fa-clipboard-check",
        "color": "#66bb6a", # Success Green
        "description": "The metrics that proved the phase was complete.",
        "examples": ["N=500 Responses", "$1M Revenue", "Zero Carbon Certificate"],
        "prompt_injection": """
            VERIFICATION: We know the project was successful because we measured '{value}'. 
            Ensure the 'Action Phase' includes the specific mechanisms required to capture and verify this data.
        """
    },

    # ==============================================================================
    # 3. THE HORIZON & BOUNDARIES (Space-Time Constraints)
    # ==============================================================================

    "HORIZON": {
        "label": "Event Horizon",
        "icon": "fa-solid fa-calendar-check",
        "color": "#ffa726", # Warning Amber
        "description": "The date when the possibility became reality.",
        "examples": ["By Q3 2026", "Before the Election", "In 18 Months"],
        "prompt_injection": """
            TEMPORAL BACKCASTING: The project was completed by '{value}'. 
            Reverse-engineer the timeline from this date. If a Prerequisite takes 6 months, place it 6 months prior to this horizon.
        """
    },

    "BUDGET": {
        "label": "Economic Fuel",
        "icon": "fa-solid fa-coins",
        "color": "#8d6e63", # Bronze
        "description": "The capital constraints that shaped the solution.",
        "examples": ["Bootstrapped ($0)", "Grant Funded", "Venture Scale"],
        "prompt_injection": """
            ECONOMIC REALITY: The solution was architected within a '{value}' model. 
            Do not suggest resources or hiring plans that exceed this capital structure.
        """
    },

    # ==============================================================================
    # 4. THE NETWORK & LEGACY (Connections)
    # ==============================================================================

    "MISSING_LINK": {
        "label": "The Catalyst",
        "icon": "fa-solid fa-puzzle-piece",
        "color": "#ef5350", # Danger Red
        "description": "The critical partnership that bridged the gap.",
        "examples": ["University IRB", "Manufacturing Partner", "Legislative Sponsor"],
        "prompt_injection": """
            NETWORK CRITICALITY: Success was impossible without acquiring '{value}'. 
            In the 'Engagement Phase', identify the specific node where this partnership was secured.
        """
    },

    "LEGACY": {
        "label": "Enduring Impact",
        "icon": "fa-solid fa-seedling",
        "color": "#66bd0e", # Legacy Green
        "description": "What remains operative after the project team disbands.",
        "examples": ["Open Database", "Self-Sustaining Fund", "Community Charter"],
        "prompt_injection": """
            LEGACY DESIGN: After the 'Completion Phase', a '{value}' remained active. 
            Ensure the 'Legacy Phase' contains CEs that establish the governance and maintenance of this asset.
        """
    }
}

def get_valid_system_types():
    """Returns a list of all valid system node keys."""
    return list(SYSTEM_NODES.keys())

def get_system_node_config(key):
    """Safe retrieval of config with fallback."""
    return SYSTEM_NODES.get(key, SYSTEM_NODES['OPERATOR'])