# utilities.py
import re
import json
import logging
import hashlib
import uuid
from datetime import date
from bs4 import BeautifulSoup
from flask import current_app
from typing import Dict, List, Tuple, Optional, Any
from dateutil.relativedelta import relativedelta

# --- EXTERNAL SERVICES ---
# We rely on ai_service for the raw LLM/Image calls to keep this file clean.
from ai_service import generate_chat_response, get_grounded_data, generate_image as service_generate_image

# --- CONFIGURATION ---
from ce_nodes import NODES, get_valid_node_types
from system_nodes import SYSTEM_NODES, get_valid_system_types

# --- LOGGING ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# ==============================================================================
# SECTION 1: VISUAL SYSTEM (Colors & Phases)
# ==============================================================================
# These semantic anchors ensure the UI feels deterministic and structured.

PHASE_COLORS = {
    0: { 'name': 'Discovery', 'hue': 187, 'saturation': 0.72, 'lightness': 0.58, 'hex': '#17a2b8', 'hex_light': '#4dd0e1', 'hex_dark': '#00838f', 'semantic': 'exploration' },
    1: { 'name': 'Engagement', 'hue': 262, 'saturation': 0.52, 'lightness': 0.47, 'hex': '#6f42c1', 'hex_light': '#9575cd', 'hex_dark': '#512da8', 'semantic': 'connection' },
    2: { 'name': 'Action', 'hue': 24, 'saturation': 0.85, 'lightness': 0.54, 'hex': '#e8590c', 'hex_light': '#ff8a50', 'hex_dark': '#bf360c', 'semantic': 'execution' },
    3: { 'name': 'Completion', 'hue': 145, 'saturation': 0.63, 'lightness': 0.42, 'hex': '#28a745', 'hex_light': '#66bb6a', 'hex_dark': '#1b5e20', 'semantic': 'achievement' },
    4: { 'name': 'Legacy', 'hue': 340, 'saturation': 0.65, 'lightness': 0.50, 'hex': '#d63384', 'hex_light': '#f06292', 'hex_dark': '#ad1457', 'semantic': 'impact' }
}

def text_to_phase_index(text: str) -> int:
    """Deterministically maps any string to a Phase Index (0-4)."""
    if not text: return 0
    hash_obj = hashlib.md5(text.lower().strip().encode('utf-8'))
    return int(hash_obj.hexdigest()[:8], 16) % 5

def get_phase_anchor(text: str) -> Dict:
    """Returns the Semantic Color Data for a given string."""
    idx = text_to_phase_index(text)
    return { 'index': idx, **PHASE_COLORS[idx] }

def hsl_to_hex(h: float, s: float, l: float) -> str:
    """Converts HSL values to a HEX string."""
    h_norm = (h % 360) / 360.0
    if s == 0: return '#{:02x}{:02x}{:02x}'.format(int(l*255), int(l*255), int(l*255))
    def hue_to_rgb(p, q, t):
        if t < 0: t += 1
        if t > 1: t -= 1
        if t < 1/6: return p + (q - p) * 6 * t
        if t < 1/2: return q
        if t < 2/3: return p + (q - p) * (2/3 - t) * 6
        return p
    q = l * (1 + s) if l < 0.5 else l + s - l * s
    p = 2 * l - q
    r = int(hue_to_rgb(p, q, h_norm + 1/3) * 255)
    g = int(hue_to_rgb(p, q, h_norm) * 255)
    b = int(hue_to_rgb(p, q, h_norm - 1/3) * 255)
    return '#{:02x}{:02x}{:02x}'.format(r, g, b)

def generate_near_harmonic(phase: Dict, seed: str = '') -> Dict:
    """Generates a cohesive secondary color."""
    base_hue, base_sat, base_light = phase['hue'], phase['saturation'], phase['lightness']
    seed_hash = int(hashlib.md5(seed.encode()).hexdigest()[:4], 16) if seed else 1234
    
    hue_offset = 20 + (seed_hash % 21)
    hue_dir = 1 if (seed_hash % 2) == 0 else -1
    new_hue = (base_hue + (hue_offset * hue_dir)) % 360
    new_sat = min(1.0, base_sat * (0.60 + ((seed_hash % 21) / 100)))
    new_light = min(0.85, base_light + (0.05 + ((seed_hash % 11) / 100)))
    
    return {
        'role': 'near_harmonic', 'hue': new_hue, 'saturation': new_sat, 'lightness': new_light,
        'hex': hsl_to_hex(new_hue, new_sat, new_light),
        'hex_light': hsl_to_hex(new_hue, new_sat * 0.7, min(0.92, new_light + 0.15)),
        'hex_dark': hsl_to_hex(new_hue, min(1.0, new_sat * 1.1), max(0.25, new_light - 0.18))
    }

def generate_distant_harmonic(phase: Dict, seed: str = '') -> Dict:
    """Generates a contrasting tertiary color."""
    base_hue, base_sat, base_light = phase['hue'], phase['saturation'], phase['lightness']
    seed_hash = int(hashlib.md5(seed.encode()).hexdigest()[:4], 16) if seed else 5678
    
    hue_offset = 90 + (seed_hash % 51)
    hue_dir = 1 if (seed_hash % 3) != 0 else -1
    new_hue = (base_hue + (hue_offset * hue_dir)) % 360
    new_sat = min(base_sat, base_sat * (0.70 + ((seed_hash % 31) / 100)))
    new_light = max(0.30, base_light - (0.05 + ((seed_hash % 8) / 100)))
    
    return {
        'role': 'distant_harmonic', 'hue': new_hue, 'saturation': new_sat, 'lightness': new_light,
        'hex': hsl_to_hex(new_hue, new_sat, new_light),
        'hex_light': hsl_to_hex(new_hue, new_sat * 0.7, min(0.90, new_light + 0.18)),
        'hex_dark': hsl_to_hex(new_hue, min(1.0, new_sat * 1.1), max(0.22, new_light - 0.15))
    }

def assign_goal_colors(goals: List[Dict]) -> List[Dict]:
    """Applies the harmonic color system to a list of Goals."""
    if not goals: return goals
    anchor_title = goals[0].get('title', 'default')
    phase_anchor = get_phase_anchor(anchor_title)
    
    current_app.logger.info(f"Phase Anchor: '{anchor_title}' → {phase_anchor['name']} (Hue {phase_anchor['hue']}°)")
    
    near = generate_near_harmonic(phase_anchor, anchor_title + '_n')
    distant = generate_distant_harmonic(phase_anchor, anchor_title + '_d')
    slots = [(phase_anchor, 'phase_anchor'), (near, 'near_harmonic'), (distant, 'distant_harmonic')]
    
    for i, goal in enumerate(goals):
        # Violation Theme Logic
        if not goal.get('is_compliant', True):
            goal.update({
                'color_role': 'violation', 'color_hue': 0, 'icon_color': '#b71c1c',
                'card_gradient': 'linear-gradient(135deg, #ffcdd2 0%, #ef5350 50%, #b71c1c 100%)',
                'plate_gradient': 'linear-gradient(135deg, #ffcdd2 0%, #ef5350 100%)',
                'btn_gradient': 'linear-gradient(to right, #ef5350 0%, #c62828 100%)'
            })
            continue
            
        c, role = slots[i % 3]
        goal.update({
            'color_role': role, 'color_hue': c['hue'], 'icon_color': c['hex_dark'],
            'card_gradient': f"linear-gradient(135deg, {c['hex_light']} 0%, {c['hex']} 50%, {c['hex_dark']} 100%)",
            'plate_gradient': f"linear-gradient(135deg, {c['hex_light']} 0%, {c['hex']} 100%)",
            'btn_gradient': f"linear-gradient(to right, {c['hex']} 0%, {c['hex_dark']} 100%)",
            'accent_color': c['hex']
        })
    return goals

# ==============================================================================
# SECTION 2: DYNAMIC TEXT ENGINE (The "Magic Parsing" Logic)
# ==============================================================================

def get_system_pill_color(sys_type: str, phase_index: Optional[int] = None) -> Dict[str, str]:
    config = SYSTEM_NODES.get(sys_type, SYSTEM_NODES.get('CUSTOM', {}))
    default = config.get('color', '#64748b')
    
    if phase_index is not None and phase_index in PHASE_COLORS:
        phase = PHASE_COLORS[phase_index]
        sys_hue = (phase['hue'] + 30) % 360
        sys_hex = hsl_to_hex(sys_hue, phase['saturation'] * 0.7, phase['lightness'] + 0.1)
        sys_dark = hsl_to_hex(sys_hue, phase['saturation'] * 0.85, phase['lightness'] - 0.1)
        return {'background': sys_hex, 'border': sys_dark, 'icon_color': '#ffffff', 'text': sys_dark}
    
    return {'background': default, 'border': default, 'icon_color': '#ffffff', 'text': default}

def get_ce_pill_color(ce_type: str, phase_index: Optional[int] = None) -> Dict[str, str]:
    config = NODES.get(ce_type, NODES.get('Default', {}))
    default = config.get('color', '#6c757d')
    
    if phase_index is not None and phase_index in PHASE_COLORS:
        phase = PHASE_COLORS[phase_index]
        ce_hue = (phase['hue'] + 150) % 360
        ce_hex = hsl_to_hex(ce_hue, phase['saturation'] * 0.8, phase['lightness'] + 0.05)
        ce_dark = hsl_to_hex(ce_hue, phase['saturation'] * 0.9, phase['lightness'] - 0.15)
        return {'background': ce_hex, 'icon_color': ce_dark}
        
    return {'background': default, 'icon_color': default}

def replace_ce_tags_with_pills(content: str, phase_index: Optional[int] = None) -> str:
    """Parses <ce> tags into interactive pills for the dashboard."""
    if not content: return ""
    soup = BeautifulSoup(str(content), 'html.parser')
    for tag in soup.find_all('ce'):
        ce_type = tag.get('type', 'Default')
        ce_text = tag.get_text()
        colors = get_ce_pill_color(ce_type, phase_index)
        icon_cls = NODES.get(ce_type, NODES['Default']).get('icon', 'fa-cube')
        
        new_tag = soup.new_tag('span', attrs={
            'class': 'ce-capsule',
            'data-ce-id': tag.get('id', ''),
            'data-ce-type': ce_type,
            'style': f"--node-color: {colors['background']}; --node-icon-color: {colors['icon_color']};"
        })
        icon = soup.new_tag('i', attrs={'class': icon_cls})
        new_tag.append(icon)
        new_tag.append(soup.new_string(ce_text))
        tag.replace_with(new_tag)
    return str(soup)

def replace_sys_tags_with_highlights(content: str, phase_index: Optional[int] = None, system_data: Optional[Dict] = None) -> str:
    """
    Parses <sys> tags. 
    **CRITICAL**: If `system_data` is provided, it dynamically overrides the tag's text 
    with the live value from the database.
    """
    if not content: return ""
    soup = BeautifulSoup(str(content), 'html.parser')
    for tag in soup.find_all('sys'):
        sys_type = tag.get('type', 'CUSTOM').upper()
        
        # --- DYNAMIC INJECTION ---
        if system_data and sys_type in system_data and system_data[sys_type]:
            sys_text = str(system_data[sys_type])
        else:
            sys_text = tag.get_text()
        # -------------------------

        colors = get_system_pill_color(sys_type, phase_index)
        config = SYSTEM_NODES.get(sys_type, SYSTEM_NODES.get('CUSTOM', {}))
        
        wrapper = soup.new_tag('span', attrs={
            'class': 'sys-highlight',
            'data-type': sys_type,
            'title': f"{config.get('label', sys_type)}: {sys_text}",
            'style': f"--sys-color: {colors['background']}; --sys-border: {colors['border']};"
        })
        
        icon_span = soup.new_tag('span', attrs={'class': 'sys-highlight-icon'})
        icon_span.append(soup.new_tag('i', attrs={'class': config.get('icon', 'fa-tag')}))
        wrapper.append(icon_span)
        
        text_span = soup.new_tag('span', attrs={'class': 'sys-highlight-text'})
        text_span.string = sys_text
        wrapper.append(text_span)
        
        tag.replace_with(wrapper)
        
    return str(soup)

def format_ssol_text(content: str, phase_index: Optional[int] = None, system_data: Optional[Dict] = None) -> str:
    """
    The master formatter used by routes.py.
    Orchestrates both System Highlight injection and CE Pill rendering.
    """
    step_one = replace_sys_tags_with_highlights(content, phase_index, system_data)
    final_output = replace_ce_tags_with_pills(step_one, phase_index)
    return final_output

# ==============================================================================
# SECTION 3: THE SPECULATE ENGINE (AI Wrappers)
# ==============================================================================

async def generate_goal(user_input: str) -> List[Dict]:
    """
    Generates high-level goal options with visual themes.
    """
    prompt = f"""
    Generate 3 distinct high-level goal options for input: '{user_input}'.
    Return JSON array of objects: {{ "domain": "String", "title": "String", "goal": "String", "icon": "fa-solid class", "is_compliant": Boolean }}
    Strict JSON. No Markdown.
    """
    try:
        resp = await generate_chat_response(
            [{"role": "user", "content": prompt}], 
            "user", "goal gen", 
            generation_config={"response_mime_type": "application/json"}
        )
        cleaned = re.sub(r"```(?:json)?|```", "", resp).strip()
        data = json.loads(cleaned)
        goals = data if isinstance(data, list) else data.get('goals', [])
        return assign_goal_colors(goals)
    except Exception as e:
        current_app.logger.error(f"Goal Gen Error: {e}")
        return []

async def generate_outcome_data(ssol_title, ssol_description, domain, forced_constraints=None):
    """
    The Core Engine. Generates the structured phases and content.
    Includes the 'Attenuation Layer' (System Physics).
    """
    from system_nodes import SYSTEM_NODES # Ensure import

    constraint_block = []
    
    if forced_constraints:
        constraint_block.append("\n*** SYSTEM PHYSICS (ATTENUATION LAYER) ***")
        
        for key, value in forced_constraints.items():
            if not value: continue
            
            # 1. Look for specific Prompt Injection logic in the Node Config
            node_config = SYSTEM_NODES.get(key, {})
            injection_template = node_config.get('prompt_injection')
            
            if injection_template:
                # Format the template with the user's value
                # e.g., "RISK ATTENUATION: Avoid [Debt, Pollution]..."
                try:
                    formatted_instruction = injection_template.format(value=value)
                    constraint_block.append(f"- {formatted_instruction}")
                except:
                    # Fallback if formatting fails
                    constraint_block.append(f"- {key}: {value}")
            else:
                # Generic Fallback
                constraint_block.append(f"- {key}: {value}")

    # Join into a single strong block of text
    constraint_text = "\n".join(constraint_block)

    prompt = f"""
    IDENTITY: SPECULATE ENGINE. Reverse-Engineer a 100% completed future.
    INPUT: Title: '{ssol_title}', Context: {ssol_description}, Domain: '{domain}'
    
    {constraint_text}
    
    PHASE 1: EXEC CHARTER. Write a summary using <sys type="TYPE">Value</sys> tags for anchors.
    PHASE 2: ROADMAP. 5 Phases (Discovery, Engagement, Action, Completion, Legacy). 
    3-5 COS per phase. Embed <ce type="Type">Label</ce> tags.
    Valid CEs: {', '.join(get_valid_node_types())}
    
    RETURN JSON: {{ "ssolsummary": "html...", "system_params": {{...}}, "phases": {{ "Discovery": ["cos..."], ... }} }}
    """
    
    try:
        resp = await generate_chat_response(
            [{"role": "user", "content": prompt}], 
            "user", "speculate engine", 
            temperature=0.35 # Lower temperature for logic
        )
        clean = re.sub(r"```(?:json)?|```", "", resp).strip()
        return json.loads(clean)
    except Exception as e:
        current_app.logger.error(f"Speculate Error: {e}")
        # Fallback Structure to prevent crash
        return {
            "ssolsummary": "<p>Signal interference. Raw input data preserved.</p>",
            "phases": {"Discovery": ["Analyze input failure."], "Action": ["Manual override required."]},
            "system_params": forced_constraints or {}
        }

async def generate_ai_data(node_type, cos_content, ssol_goal, agent_mode='context'):
    """Used by the CE Modal to populate the sidebar insights."""
    if agent_mode == 'speculate':
        return await get_grounded_data(f"Research {node_type} for {ssol_goal}", node_type)
    
    prompt = f"Explain strategic purpose of '{node_type}'. Context: Goal '{ssol_goal}', Req '{cos_content}'. Return JSON {{ 'contextual_description': '...' }}"
    try:
        resp = await generate_chat_response([{"role": "user", "content": prompt}], "user", "insight", generation_config={"response_mime_type": "application/json"})
        return json.loads(resp.replace("```json", "").replace("```", "").strip())
    except: return {}

# ==============================================================================
# SECTION 4: LEGACY & HELPERS
# ==============================================================================

async def generate_image(prompt: str, ssol_id: str):
    """Wrapper to route image requests through ai_service."""
    return await service_generate_image(prompt, ssol_id)

def sanitize_filename(filename: str) -> str:
    """Safe filename generator."""
    return re.sub(r'[^a-zA-Z0-9_.-]', '_', filename)

def calculate_smart_horizon(label: str) -> str:
    """Converts '3 Months' to a Date String."""
    offsets = {"3 Months": 3, "6 Months": 6, "1 Year": 12, "2 Years": 24, "5 Years": 60, "ASAP": 1}
    return (date.today() + relativedelta(months=offsets.get(label, 0))).isoformat()

async def analyze_user_input(text: str) -> List[str]:
    """Extracts keywords from input."""
    try:
        resp = await generate_chat_response([{"role": "user", "content": f'Extract 3 keywords from "{text}". JSON {{ "keywords": [] }}'}], "user", "keywords", generation_config={"response_mime_type": "application/json"})
        return json.loads(resp).get('keywords', [])
    except: return []

async def is_input_compliant(text: str) -> dict:
    """Safety check."""
    try:
        resp = await generate_chat_response([{"role": "user", "content": f'Compliance check: "{text}". JSON {{ "compliant": bool, "reason": str }}'}], "user", "compliance", generation_config={"response_mime_type": "application/json"})
        return json.loads(resp)
    except: return {"compliant": False, "reason": "Error"}