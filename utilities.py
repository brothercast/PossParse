# utilities.py

import re
import json
import logging
import hashlib
import colorsys
from datetime import date
from bs4 import BeautifulSoup
from flask import current_app
from typing import Dict, List, Tuple, Optional
from dateutil.relativedelta import relativedelta

# Import AI services
from ai_service import generate_chat_response, get_grounded_data, generate_image

# Local Imports
from ce_nodes import NODES, get_valid_node_types
from system_nodes import SYSTEM_NODES, get_valid_system_types

# --- Logging Setup ---
logging.basicConfig(level=logging.INFO)

# ==============================================================================
# PHASE COLOR VOCABULARY (SEMANTIC ANCHORS - DO NOT GENERATE THESE)
# ==============================================================================
# These are intentional design tokens, not computed values.
# They carry semantic weight and must remain stable.
# Tuned for: distinctiveness, accessibility, emotional legibility

PHASE_COLORS = {
    0: {  # DISCOVERY
        'name': 'Discovery',
        'hue': 187,           # Cyan-Teal
        'saturation': 0.72,
        'lightness': 0.58,
        'hex': '#17a2b8',
        'hex_light': '#4dd0e1',
        'hex_dark': '#00838f',
        'semantic': 'exploration, research, possibility'
    },
    1: {  # ENGAGEMENT
        'name': 'Engagement',
        'hue': 262,           # Purple-Violet
        'saturation': 0.52,
        'lightness': 0.47,
        'hex': '#6f42c1',
        'hex_light': '#9575cd',
        'hex_dark': '#512da8',
        'semantic': 'connection, collaboration, dialogue'
    },
    2: {  # ACTION
        'name': 'Action',
        'hue': 24,            # Orange-Amber
        'saturation': 0.85,
        'lightness': 0.54,
        'hex': '#e8590c',
        'hex_light': '#ff8a50',
        'hex_dark': '#bf360c',
        'semantic': 'execution, momentum, delivery'
    },
    3: {  # COMPLETION
        'name': 'Completion',
        'hue': 145,           # Green-Emerald
        'saturation': 0.63,
        'lightness': 0.42,
        'hex': '#28a745',
        'hex_light': '#66bb6a',
        'hex_dark': '#1b5e20',
        'semantic': 'achievement, validation, closure'
    },
    4: {  # LEGACY
        'name': 'Legacy',
        'hue': 340,           # Rose-Magenta
        'saturation': 0.65,
        'lightness': 0.50,
        'hex': '#d63384',
        'hex_light': '#f06292',
        'hex_dark': '#ad1457',
        'semantic': 'impact, sustainability, continuity'
    }
}

# ==============================================================================
# PHASE SELECTION (Hash to Semantic Anchor)
# ==============================================================================

def text_to_phase_index(text: str) -> int:
    """
    Maps text to one of the 5 phase indices deterministically.
    This is NOT arbitrary hashing - it selects from a finite semantic vocabulary.
    
    The goal title determines which PHASE anchors the entire palette.
    """
    if not text:
        return 0  # Default to Discovery
    
    # Create stable hash
    hash_obj = hashlib.md5(text.lower().strip().encode('utf-8'))
    hash_int = int(hash_obj.hexdigest()[:8], 16)
    
    # Map to phase index (0-4)
    phase_index = hash_int % 5
    
    return phase_index


def get_phase_anchor(text: str) -> Dict:
    """
    Returns the Phase color that will anchor the palette for this goal.
    This is a semantic token, not a generated color.
    """
    phase_index = text_to_phase_index(text)
    return {
        'index': phase_index,
        **PHASE_COLORS[phase_index]
    }


# ==============================================================================
# HARMONIC COLOR GENERATION (Relative to Phase Anchor)
# ==============================================================================

def hsl_to_hex(h: float, s: float, l: float) -> str:
    """
    Converts HSL (h in degrees, s/l in 0-1) to hex string.
    """
    # Normalize hue to 0-1 range
    h_norm = (h % 360) / 360.0
    
    # Convert HSL to RGB
    if s == 0:
        r = g = b = l
    else:
        def hue_to_rgb(p, q, t):
            if t < 0: t += 1
            if t > 1: t -= 1
            if t < 1/6: return p + (q - p) * 6 * t
            if t < 1/2: return q
            if t < 2/3: return p + (q - p) * (2/3 - t) * 6
            return p
        
        q = l * (1 + s) if l < 0.5 else l + s - l * s
        p = 2 * l - q
        r = hue_to_rgb(p, q, h_norm + 1/3)
        g = hue_to_rgb(p, q, h_norm)
        b = hue_to_rgb(p, q, h_norm - 1/3)
    
    # Convert to hex
    return '#{:02x}{:02x}{:02x}'.format(
        int(round(r * 255)),
        int(round(g * 255)),
        int(round(b * 255))
    )


def generate_near_harmonic(phase: Dict, seed: str = '') -> Dict:
    """
    Generates Card 2: Near Harmonic
    
    Purpose: Cohesion, visual calm, reads as "related"
    
    Rules:
    - Hue: Phase ± 20-40°
    - Chroma: 0.6-0.8 × Phase chroma
    - Lightness: Phase + small lift
    """
    base_hue = phase['hue']
    base_sat = phase['saturation']
    base_light = phase['lightness']
    
    # Deterministic offset based on seed
    if seed:
        seed_hash = int(hashlib.md5(seed.encode()).hexdigest()[:4], 16)
    else:
        seed_hash = 1234
    
    # Hue offset: ±20-40° (biased by seed)
    hue_offset = 20 + (seed_hash % 21)  # 20-40
    hue_direction = 1 if (seed_hash % 2) == 0 else -1
    new_hue = (base_hue + (hue_offset * hue_direction)) % 360
    
    # Saturation: 60-80% of original
    sat_factor = 0.60 + ((seed_hash % 21) / 100)  # 0.60-0.80
    new_sat = min(1.0, base_sat * sat_factor)
    
    # Lightness: slight lift (+5-15%)
    light_lift = 0.05 + ((seed_hash % 11) / 100)  # 0.05-0.15
    new_light = min(0.85, base_light + light_lift)
    
    hex_primary = hsl_to_hex(new_hue, new_sat, new_light)
    hex_light = hsl_to_hex(new_hue, new_sat * 0.7, min(0.92, new_light + 0.15))
    hex_dark = hsl_to_hex(new_hue, min(1.0, new_sat * 1.1), max(0.25, new_light - 0.18))
    
    return {
        'role': 'near_harmonic',
        'hue': new_hue,
        'saturation': new_sat,
        'lightness': new_light,
        'hex': hex_primary,
        'hex_light': hex_light,
        'hex_dark': hex_dark,
        'relationship': f"Near harmonic of {phase['name']} (Hue {hue_direction * hue_offset:+}°)"
    }


def generate_distant_harmonic(phase: Dict, seed: str = '') -> Dict:
    """
    Generates Card 3: Distant Harmonic
    
    Purpose: Distinction, energy, avoids clashes via capped chroma
    
    Rules:
    - Hue: Phase ± 90-140° (biased, not symmetric)
    - Chroma: ≤ Phase chroma
    - Lightness: Phase - small drop
    """
    base_hue = phase['hue']
    base_sat = phase['saturation']
    base_light = phase['lightness']
    
    # Deterministic offset based on seed
    if seed:
        seed_hash = int(hashlib.md5(seed.encode()).hexdigest()[:4], 16)
    else:
        seed_hash = 5678
    
    # Hue offset: 90-140° (biased direction)
    hue_offset = 90 + (seed_hash % 51)  # 90-140
    # Bias toward clockwise for visual distinction
    hue_direction = 1 if (seed_hash % 3) != 0 else -1
    new_hue = (base_hue + (hue_offset * hue_direction)) % 360
    
    # Saturation: capped at phase saturation (0.7-1.0x)
    sat_factor = 0.70 + ((seed_hash % 31) / 100)  # 0.70-1.00
    new_sat = min(base_sat, base_sat * sat_factor)
    
    # Lightness: slight drop (-5-12%)
    light_drop = 0.05 + ((seed_hash % 8) / 100)  # 0.05-0.12
    new_light = max(0.30, base_light - light_drop)
    
    hex_primary = hsl_to_hex(new_hue, new_sat, new_light)
    hex_light = hsl_to_hex(new_hue, new_sat * 0.7, min(0.90, new_light + 0.18))
    hex_dark = hsl_to_hex(new_hue, min(1.0, new_sat * 1.1), max(0.22, new_light - 0.15))
    
    return {
        'role': 'distant_harmonic',
        'hue': new_hue,
        'saturation': new_sat,
        'lightness': new_light,
        'hex': hex_primary,
        'hex_light': hex_light,
        'hex_dark': hex_dark,
        'relationship': f"Distant harmonic of {phase['name']} (Hue {hue_direction * hue_offset:+}°)"
    }


# ==============================================================================
# PALETTE GENERATION (Full Card Set)
# ==============================================================================

def generate_card_gradient(color: Dict) -> str:
    """Generates a CSS gradient string for a card background."""
    return f"linear-gradient(135deg, {color['hex_light']} 0%, {color['hex']} 50%, {color['hex_dark']} 100%)"


def generate_plate_gradient(color: Dict) -> str:
    """Generates a lighter gradient for header plates."""
    return f"linear-gradient(135deg, {color['hex_light']} 0%, {color['hex']} 100%)"


def generate_button_gradient(color: Dict) -> str:
    """Generates a gradient for buttons."""
    return f"linear-gradient(to right, {color['hex']} 0%, {color['hex_dark']} 100%)"


def build_card_palette(color: Dict, role: str) -> Dict:
    """
    Builds the full palette dict for a single card.
    """
    return {
        'color_role': role,
        'color_hue': color['hue'],
        'color_saturation': color['saturation'],
        'color_lightness': color['lightness'],
        'card_gradient': generate_card_gradient(color),
        'plate_gradient': generate_plate_gradient(color),
        'btn_gradient': generate_button_gradient(color),
        'icon_color': color['hex_dark'],
        'accent_color': color['hex'],
        'accent_light': color['hex_light'],
        'accent_dark': color['hex_dark'],
        'text_on_color': '#ffffff',
        'color_relationship': color.get('relationship', 'Phase Anchor')
    }


def assign_goal_colors(goals: List[Dict]) -> List[Dict]:
    """
    Assigns phase-anchored harmonic colors to a list of goals.
    
    Color Architecture:
    1. Card 0 (Phase Anchor): Semantic token from PHASE_COLORS vocabulary
    2. Card 1 (Near Harmonic): Cohesive, subordinate, stabilizing
    3. Card 2 (Distant Harmonic): Contrasting but capped chroma
    
    Args:
        goals: List of goal dictionaries with at least 'title' key
        
    Returns:
        Goals list with color properties added
    """
    if not goals:
        return goals
    
    # Get the first goal's title to determine Phase Anchor
    anchor_title = goals[0].get('title', 'default goal')
    phase_anchor = get_phase_anchor(anchor_title)
    
    current_app.logger.info(
        f"Phase Anchor: '{anchor_title}' → {phase_anchor['name']} "
        f"(Phase {phase_anchor['index']}, Hue {phase_anchor['hue']}°)"
    )
    
    # Generate harmonic companions
    near_harmonic = generate_near_harmonic(phase_anchor, anchor_title + '_near')
    distant_harmonic = generate_distant_harmonic(phase_anchor, anchor_title + '_distant')
    
    current_app.logger.info(f"Near Harmonic: Hue {near_harmonic['hue']:.0f}° ({near_harmonic['relationship']})")
    current_app.logger.info(f"Distant Harmonic: Hue {distant_harmonic['hue']:.0f}° ({distant_harmonic['relationship']})")
    
    # Color assignment order
    color_slots = [
        (phase_anchor, 'phase_anchor'),
        (near_harmonic, 'near_harmonic'),
        (distant_harmonic, 'distant_harmonic')
    ]
    
    for i, goal in enumerate(goals):
        # Handle non-compliant goals (override with danger theme)
        if not goal.get('is_compliant', True):
            goal.update({
                'color_role': 'violation',
                'color_hue': 0,
                'card_gradient': 'linear-gradient(135deg, #ffcdd2 0%, #ef5350 50%, #b71c1c 100%)',
                'plate_gradient': 'linear-gradient(135deg, #ffcdd2 0%, #ef5350 100%)',
                'btn_gradient': 'linear-gradient(to right, #ef5350 0%, #c62828 100%)',
                'icon_color': '#b71c1c',
                'accent_color': '#ef5350',
                'accent_light': '#ffcdd2',
                'accent_dark': '#b71c1c',
                'phase_anchor_index': phase_anchor['index'],
                'phase_anchor_name': phase_anchor['name']
            })
            continue
        
        # Assign color based on position (cycle if more than 3 goals)
        color_data, role = color_slots[i % 3]
        palette = build_card_palette(color_data, role)
        
        # Add phase context (all cards know their anchor)
        palette['phase_anchor_index'] = phase_anchor['index']
        palette['phase_anchor_name'] = phase_anchor['name']
        
        goal.update(palette)
        
        current_app.logger.debug(
            f"Goal '{goal.get('title', 'Untitled')}' → {role} "
            f"(Hue {color_data['hue']:.0f}°)"
        )
    
    return goals

# =========================================================
# DATE LOGIC (The Atomic Clock Mirror)
# =========================================================
def calculate_smart_horizon(offset_label: str) -> str:
    """
    The Atomic Clock: Converts fuzzy human timeframes into specific Gregorian dates.
    Used by both the Wizard (via config injection) and the SPECULATE Engine.
    """
    today = date.today()
    
    # The Physics of Time
    offsets = {
        "3 Months": 3,
        "6 Months": 6,
        "1 Year": 12,
        "2 Years": 24,
        "5 Years": 60,
        "ASAP": 1 # Aggressive 30-day sprint
    }
    
    # Calculate target
    months = offsets.get(offset_label, 0)
    target_date = today + relativedelta(months=months)
    
    return target_date.isoformat() # Returns YYYY-MM-DD

# ==============================================================================
# PHASE COLORS FOR OUTCOME PAGE (COS Phases)
# ==============================================================================

def get_phase_color_for_cos(phase_name: str) -> Dict:
    """
    Returns the semantic phase color for a COS phase.
    Maps phase names to the PHASE_COLORS vocabulary.
    """
    phase_mapping = {
        'discovery': 0,
        'engagement': 1,
        'action': 2,
        'completion': 3,
        'legacy': 4
    }
    
    phase_key = phase_name.lower().strip()
    phase_index = phase_mapping.get(phase_key, 0)
    phase_data = PHASE_COLORS[phase_index]
    
    return {
        'index': phase_index,
        'name': phase_data['name'],
        'hex': phase_data['hex'],
        'hex_light': phase_data['hex_light'],
        'hex_dark': phase_data['hex_dark'],
        'gradient': f"linear-gradient(135deg, {phase_data['hex_light']} 0%, {phase_data['hex']} 100%)",
        'semantic': phase_data['semantic']
    }


def get_all_phase_colors() -> List[Dict]:
    """
    Returns all phase colors in order for use in outcome rendering.
    """
    return [
        {
            'index': i,
            'name': phase['name'],
            'hex': phase['hex'],
            'hex_light': phase['hex_light'],
            'hex_dark': phase['hex_dark'],
            'gradient': f"linear-gradient(135deg, {phase['hex_light']} 0%, {phase['hex']} 100%)",
            'semantic': phase['semantic']
        }
        for i, phase in PHASE_COLORS.items()
    ]


# ==============================================================================
# CE & SYSTEM PILL COLORS (Harmonized with Phase Context)
# ==============================================================================

def get_ce_pill_color(ce_type: str, phase_index: Optional[int] = None) -> Dict[str, str]:
    """
    Gets colors for a CE pill, harmonized with the current phase context.
    
    If phase_index is provided, generates a complementary color.
    Otherwise falls back to the CE node's default color.
    """
    node_config = NODES.get(ce_type, NODES.get('Default', {}))
    default_color = node_config.get('color', '#6c757d')
    
    if phase_index is not None and phase_index in PHASE_COLORS:
        phase = PHASE_COLORS[phase_index]
        # Generate split-complementary for CE pills
        ce_hue = (phase['hue'] + 150) % 360
        ce_hex = hsl_to_hex(ce_hue, phase['saturation'] * 0.8, phase['lightness'] + 0.05)
        ce_dark = hsl_to_hex(ce_hue, phase['saturation'] * 0.9, phase['lightness'] - 0.15)
        
        return {
            'background': ce_hex,
            'icon_bg': '#ffffff',
            'icon_color': ce_dark,
            'text': '#ffffff'
        }
    
    return {
        'background': default_color,
        'icon_bg': '#ffffff',
        'icon_color': default_color,
        'text': '#ffffff'
    }


def get_system_pill_color(sys_type: str, phase_index: Optional[int] = None) -> Dict[str, str]:
    """
    Gets colors for a system anchor pill, harmonized with phase context.
    """
    sys_config = SYSTEM_NODES.get(sys_type, SYSTEM_NODES.get('CUSTOM', {}))
    default_color = sys_config.get('color', '#64748b')
    
    if phase_index is not None and phase_index in PHASE_COLORS:
        phase = PHASE_COLORS[phase_index]
        # Analogous offset for system pills
        sys_hue = (phase['hue'] + 30) % 360
        sys_hex = hsl_to_hex(sys_hue, phase['saturation'] * 0.7, phase['lightness'] + 0.1)
        sys_dark = hsl_to_hex(sys_hue, phase['saturation'] * 0.85, phase['lightness'] - 0.1)
        
        return {
            'background': sys_hex,
            'border': sys_dark,
            'icon_color': '#ffffff',
            'text': sys_dark
        }
    
    return {
        'background': default_color,
        'border': default_color,
        'icon_color': '#ffffff',
        'text': default_color
    }


# ==============================================================================
# TEXT PARSING & FORMATTING
# ==============================================================================

def replace_ce_tags_with_pills(content: str, phase_index: Optional[int] = None) -> str:
    """
    Parses <ce type="Risk">Text</ce> tags into styled CE Capsule pills.
    
    Args:
        content: HTML string with <ce> tags
        phase_index: Optional phase index for color harmony (0-4)
    """
    if not content:
        return ""

    soup = BeautifulSoup(str(content), 'html.parser')
    ce_tags = soup.find_all('ce')

    for tag in ce_tags:
        ce_id_str = tag.get('id')
        ce_type = tag.get('type', 'Default')
        ce_text = tag.get_text()
        
        # Get harmonized or default colors
        colors = get_ce_pill_color(ce_type, phase_index)
        
        # Get icon from node config
        node_config = NODES.get(ce_type, NODES['Default'])
        icon_cls = node_config.get('icon', 'fa-solid fa-cube')

        # Build the pill
        new_tag = soup.new_tag('span', attrs={
            'class': 'ce-capsule',
            'data-ce-id': ce_id_str,
            'data-ce-type': ce_type,
            'title': f"{ce_type} | Click to Open Speculation Engine",
            'style': f"--node-color: {colors['background']}; --node-icon-color: {colors['icon_color']};"
        })
        
        icon_i = soup.new_tag('i', attrs={'class': icon_cls})
        new_tag.append(icon_i)
        new_tag.append(soup.new_string(ce_text))
        
        tag.replace_with(new_tag)

    return str(soup)


def replace_sys_tags_with_highlights(content: str, phase_index: Optional[int] = None) -> str:
    """
    Parses <sys type="BUDGET">Value</sys> tags into styled system pills.
    
    Args:
        content: HTML string with <sys> tags  
        phase_index: Optional phase index for color harmony (0-4)
    """
    if not content:
        return ""
    
    soup = BeautifulSoup(str(content), 'html.parser')
    sys_tags = soup.find_all('sys')

    for tag in sys_tags:
        sys_type = tag.get('type', 'CUSTOM').upper()
        sys_text = tag.get_text()
        
        # Get harmonized or default colors
        colors = get_system_pill_color(sys_type, phase_index)
        
        # Get config
        config = SYSTEM_NODES.get(sys_type, SYSTEM_NODES.get('CUSTOM', {}))
        icon = config.get('icon', 'fa-tag')

        # Build wrapper
        wrapper = soup.new_tag('span', attrs={
            'class': 'sys-highlight',
            'data-type': sys_type,
            'title': f"{config.get('label', sys_type)}: {sys_text}",
            'style': f"--sys-color: {colors['background']}; --sys-border: {colors['border']};"
        })
        
        # Icon circle
        icon_span = soup.new_tag('span', attrs={'class': 'sys-highlight-icon'})
        icon_i = soup.new_tag('i', attrs={'class': icon})
        icon_span.append(icon_i)
        wrapper.append(icon_span)
        
        # Text label
        text_span = soup.new_tag('span', attrs={'class': 'sys-highlight-text'})
        text_span.string = sys_text
        wrapper.append(text_span)
        
        tag.replace_with(wrapper)

    return str(soup)


def format_ssol_text(content: str, phase_index: Optional[int] = None) -> str:
    """
    Master formatter for SSOL Summaries with optional phase-aware color harmony.
    """
    step_one = replace_sys_tags_with_highlights(content, phase_index)
    final_output = replace_ce_tags_with_pills(step_one, phase_index)
    return final_output


# ==============================================================================
# GOAL GENERATION
# ==============================================================================

async def generate_goal(user_input: str) -> List[Dict]:
    """
    Generates goal options with phase-anchored harmonic color palettes.
    """
    prompt = f"""
    Based on the user input '{user_input}', generate three distinct, high-level goal options. 
    
    OUTPUT REQUIREMENTS:
    1. Respond with a valid JSON Array of 3 objects.
    2. Each object must strictly follow this schema:
       {{
         "domain": "String",
         "title": "String",
         "goal": "String",
         "icon": "FontAwesome Class String (e.g. 'fa-solid fa-rocket')",
         "is_compliant": Boolean
       }}
    3. Ensure all keys are quoted.
    4. Ensure all string values are properly escaped.
    5. Ensure commas separate all key-value pairs and array items.
    
    ICON RULES: Use 'FontAwesome 6 Free' solid icons (fa-solid fa-*).
    """
    
    try:
        messages = [{"role": "user", "content": prompt}]
        response_str = await generate_chat_response(
            messages, 
            role="user", 
            task="goal generation", 
            system_instruction="You are a strict JSON generator. No markdown. No trailing commas.",
            generation_config={"response_mime_type": "application/json", "temperature": 0.7}
        )
        
        # --- JSON Extraction & Repair ---
        cleaned = response_str.strip()
        
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?", "", cleaned).strip()
        if cleaned.endswith("```"):
            cleaned = re.sub(r"```$", "", cleaned).strip()

        match = re.search(r'\[.*\]', cleaned, re.DOTALL)
        if match:
            cleaned = match.group(0)
        
        try:
            ai_goals = json.loads(cleaned)
        except json.JSONDecodeError as e:
            logging.warning(f"JSON Parse Error: {e}. Attempting repairs...")
            
            # Repair strategies
            repaired = re.sub(r'\}\s*\{', '}, {', cleaned)
            repaired = re.sub(r'\"\s*\n\s*\"', '",\n"', repaired)
            
            try:
                ai_goals = json.loads(repaired)
                logging.info("JSON successfully repaired.")
            except json.JSONDecodeError:
                logging.error("Failed to repair JSON. Returning empty.")
                return []

        # Validate and normalize
        validated_goals = []
        for goal in ai_goals:
            if not isinstance(goal, dict):
                continue
            validated_goals.append({
                'domain': goal.get('domain', 'General'),
                'title': goal.get('title', 'Untitled Goal'),
                'goal': goal.get('goal', 'No description provided.'),
                'icon': goal.get('icon', 'fa-solid fa-question-circle'),
                'is_compliant': goal.get('is_compliant', goal.get('iscompliant', True))
            })
        
        # *** APPLY PHASE-ANCHORED COLOR SYSTEM ***
        validated_goals = assign_goal_colors(validated_goals)
        
        return validated_goals

    except Exception as e:
        logging.error(f"Error in generate_goal: {e}", exc_info=True)
        return []


# ==============================================================================
# OUTCOME GENERATION
# ==============================================================================

async def generate_outcome_data(ssol_title, ssol_description, domain, forced_constraints=None):
    """
    The SPECULATE Engine v2026.
    
    METHODOLOGY: FUTURE-BACK ENGINEERING
    This function creates the SSOL (Structured Solution). 
    It parses abstract "Possibilities" (even nonsense/word-salad) into 
    mechanical Conditions of Satisfaction (COS) and Conditional Elements (CE).
    """
    node_types_str = ', '.join(get_valid_node_types())
    sys_types_str = ', '.join(get_valid_system_types())
    
    constraint_text = ""
    if forced_constraints:
        constraint_text = "\n*** HARD SYSTEM PHYSICS (ATTENUATION LAYER) ***\n"
        for k, v in forced_constraints.items():
            constraint_text += f"- {k}: {v}\n"
        constraint_text += "These constraints are the immutable laws of this project's universe.\n"

    prompt = f"""
    IDENTITY: You are the SPECULATE ENGINE. You do not "suggest" or "brainstorm." 
    You are a Strategic Logic Processor designed to reverse-engineer reality from a future state.

    INPUT DATA (THE POSSIBILITY):
    Title: '{ssol_title}'
    Context: {ssol_description}
    Domain: '{domain}'
    {constraint_text}

    *** THE CHALLENGE: PARSING ABSTRACTION ***
    The User Input may be abstract, metaphorical, or "word salad" (e.g., "A world of pure light").
    Your Prime Directive is to ground this into tangible, execute-able MECHANICS.
    Ask: "If this abstract future EXITS as a fact, what infrastructure, sociology, and resources make it so?"

    *** METHODOLOGY: FUTURE-BACK ENGINEERING ***
    1.  **TIME-SHIFT:** Assume the goal is ALREADY 100% COMPLETE. It is history.
    2.  **DECONSTRUCT:** Break the "Possibility" down into "Conditions of Satisfaction" (COS).
    3.  **ATTENUATE:** Apply the implicit physics (Time, Budget, Operator) to every node.

    *** EXECUTION PROTOCOL ***

    PHASE 1: INFER SYSTEM ANCHORS (The Physics)
    Determine the constraints required for this reality to hold true.
    - WHO (Operator): What entity executed this? (An Individual, DAO, Corp, NGO, Cult, Algorithm?)
    - WHEN (Horizon): What is the calculated time-to-fulfillment?
    - HOW (Budget/Scale): What was the fuel source?
    Valid Types: {sys_types_str}.

    PHASE 2: EXECUTIVE CHARTER (The Narrative)
    Write a concise, authoritative summary of the *completed* project.
    - Use <sys type="TYPE">Value</sys> tags to highlight System Anchors.
    - Tone: Professional, past-tense, engineered clarity.

    PHASE 3: PHASE STRUCTURE (The Roadmap)
    Define 3-5 "Conditions of Satisfaction" (COS) for each Phase.
    - Each COS must be a specific, measurable state that was achieved.
    - Embed "Conditional Elements" (CEs) using <ce type="ValidType">Label</ce>.
    - CEs are the Atomic Units of the solution (The 'What').

    **Phases of the Doctrine:**
    1. Discovery (The Setup / Research)
    2. Engagement (The Network / Stakeholders)
    3. Action (The Build / Praxis)
    4. Completion (The Verification / Success)
    5. Legacy (The Impact / Sustainability)

    Valid CE Node Types: {node_types_str}.

    *** RESPONSE FORMAT (JSON ONLY) ***
    {{
        "ssolsummary": "<p>The <sys type='OPERATOR'>Global Unity DAO</sys> successfully harmonized...</p>",
        "system_params": {{
            "HORIZON": "2030-01-01",
            "OPERATOR": "Decentralized Network",
            "SCALE": "Planetary",
            "DIRECTIVE": "Radical Empathy"
        }},
        "phases": {{
            "Discovery": ["Mapped the <ce type='Research'>Psychological Baselines</ce>...", "..."],
            "Engagement": [...],
            "Action": [...],
            "Completion": [...],
            "Legacy": [...]
        }}
    }}
    """
    
    messages = [{"role": "user", "content": prompt}]
    
    # We use a lower temperature to enforce "Engine" logic over "Creative" fluff
    response_str = await generate_chat_response(
        messages, role="user", task="SPECULATE Engine Run", temperature=0.3
    )
    
    clean_json = response_str.replace("```json", "").replace("```", "").strip()
    
    try:
        result = json.loads(clean_json)
        
        # Get phase anchor from title for consistent theming
        phase_anchor = get_phase_anchor(ssol_title)
        result['phase_anchor_index'] = phase_anchor['index']
        result['phase_anchor_name'] = phase_anchor['name']
        result['phase_colors'] = get_all_phase_colors()
        
        return result
        
    except json.JSONDecodeError:
        logging.error(f"SPECULATE Engine Failure. Raw Output: {clean_json}")
        # Fallback structural return
        return {
            "ssolsummary": "<p>The SPECULATE Engine encountered interference parsing this timeline.</p>",
            "phases": {},
            "system_params": {},
            "phase_anchor_index": 0,
            "phase_anchor_name": "Discovery",
            "phase_colors": get_all_phase_colors()
        }


# ==============================================================================
# ADDITIONAL UTILITY FUNCTIONS
# ==============================================================================

async def analyze_user_input(user_text: str) -> List[str]:
    prompt = f'Analyze text and extract 3-5 key keywords. Text: "{user_text}". Return JSON: {{ "keywords": [] }}'
    try:
        messages = [{"role": "user", "content": prompt}]
        response_str = await generate_chat_response(
            messages, role="user", task="keyword extraction", 
            generation_config={"response_mime_type": "application/json"}
        )
        return json.loads(response_str).get('keywords', [])
    except Exception:
        return []


async def is_input_compliant(user_text: str) -> dict:
    prompt = f'Analyze compliance. Text: "{user_text}". Return JSON: {{ "compliant": boolean, "reason": string }}'
    try:
        messages = [{"role": "user", "content": prompt}]
        response_str = await generate_chat_response(
            messages, role="user", task="compliance check", 
            generation_config={"response_mime_type": "application/json"}
        )
        result = json.loads(response_str)
        return {"compliant": result.get('compliant', True), "reason": result.get('reason', '')}
    except Exception:
        return {"compliant": False, "reason": "System error."}


async def generate_ai_data(node_type: str, cos_content: str, ssol_goal: str, agent_mode: str = 'context') -> dict:
    """Generates context data for a specific Node Modal."""
    try:
        if agent_mode == 'speculate':
            return await get_grounded_data(f"Research {node_type} for {ssol_goal}", node_type)
        else:
            prompt = f"Briefly explain the strategic purpose of this '{node_type}' element. Context: Goal '{ssol_goal}', Requirement '{cos_content}'. Return JSON with key 'contextual_description'."
            messages = [{"role": "user", "content": prompt}]
            
            response_str = await generate_chat_response(
                messages, role="user", task="contextual insight",
                generation_config={"response_mime_type": "application/json", "temperature": 0.7}
            )
            
            cleaned = response_str.replace("```json", "").replace("```", "").strip()
            return json.loads(cleaned)

    except Exception as e:
        logging.error(f"Error in generate_ai_data ({agent_mode}): {e}", exc_info=True)
        return {}