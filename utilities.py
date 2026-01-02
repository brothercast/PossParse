# utilities.py

import logging
import json
import re
import uuid
from typing import Dict, List
from bs4 import BeautifulSoup
from flask import current_app

# Import AI services
from ai_service import generate_chat_response, get_grounded_data, generate_image

# Local Imports
from ce_nodes import NODES, get_valid_node_types
from system_nodes import SYSTEM_NODES, get_valid_system_types

# --- Logging Setup ---
logging.basicConfig(level=logging.INFO)

# ==============================================================================
# 1. TEXT PARSING & FORMATTING (The "Magic Parsing" Layer)
# ==============================================================================

def replace_ce_tags_with_pills(content):
    """
    Parses <ce type="Risk">Text</ce> tags into Solid Color Pills (.ce-capsule).
    Used for Actionable Elements (Atoms).
    """
    if not content:
        return ""

    # Use HTML parser
    soup = BeautifulSoup(str(content), 'html.parser')
    ce_tags = soup.find_all('ce')

    for tag in ce_tags:
        ce_id_str = tag.get('id') # Optional ID if linking to DB
        ce_type = tag.get('type', 'Default')
        ce_text = tag.get_text()
        
        # 1. Get Config
        node_config = NODES.get(ce_type, NODES['Default'])
        bg_color = node_config.get('color', '#6c757d')
        icon_cls = node_config.get('icon', 'fa-solid fa-cube')

        # 2. Build Horizon Capsule HTML
        # CRITICAL UPDATE: We set --node-color as a CSS variable here
        new_tag = soup.new_tag('span', attrs={
            'class': 'ce-capsule', 
            'data-ce-id': ce_id_str,
            'data-ce-type': ce_type,
            'title': f"{ce_type} | Click to Open Speculation Engine",
            'style': f'--node-color: {bg_color};' 
        })
        
        # Icon (We remove 'me-1' because flex gap/margin handles it better now)
        icon_i = soup.new_tag('i', attrs={'class': f"{icon_cls}"})
        new_tag.append(icon_i)
        
        # Text
        text_node = soup.new_string(ce_text)
        new_tag.append(text_node)

        tag.replace_with(new_tag)

    return str(soup)


def replace_sys_tags_with_highlights(content):
    """
    Parses <sys> tags into "Slick" Inline Pills.
    Structure: <span class="sys-highlight"><span class="sys-highlight-icon"><i class="fa..."></i></span><span class="sys-highlight-text">Value</span></span>
    """
    if not content: return ""
    
    # Import locally to avoid circular imports
    from system_nodes import SYSTEM_NODES 
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(str(content), 'html.parser')
    sys_tags = soup.find_all('sys')

    for tag in sys_tags:
        sys_type = tag.get('type', 'CUSTOM').upper()
        sys_text = tag.get_text()
        
        # Lookup config
        config = SYSTEM_NODES.get(sys_type, SYSTEM_NODES['CUSTOM'])
        color = config.get('color', '#666')
        icon = config.get('icon', 'fa-tag')

        # 1. Main Container
        wrapper = soup.new_tag('span', attrs={
            'class': 'sys-highlight',
            'data-type': sys_type,
            'title': f"{config['label']}: {sys_text}",
            'style': f'--sys-color: {color};'
        })
        
        # 2. Icon Circle
        icon_span = soup.new_tag('span', attrs={'class': 'sys-highlight-icon'})
        icon_i = soup.new_tag('i', attrs={'class': icon})
        icon_span.append(icon_i)
        wrapper.append(icon_span)
        
        # 3. Text Label
        text_span = soup.new_tag('span', attrs={'class': 'sys-highlight-text'})
        text_span.string = sys_text
        wrapper.append(text_span)
        
        tag.replace_with(wrapper)

    return str(soup)


def format_ssol_text(content):
    """
    Master formatter for SSOL Summaries. 
    Runs both parsers to ensure the Executive Summary looks rich and connected.
    """
    # 1. Process System Anchors (Context Tags)
    step_one = replace_sys_tags_with_highlights(content)
    
    # 2. Process Conditional Elements (Action Pills)
    final_output = replace_ce_tags_with_pills(step_one)
    
    return final_output


# ==============================================================================
# 2. INPUT ANALYSIS (Goal Selection)
# ==============================================================================

async def generate_goal(user_input: str) -> List[Dict]:
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
    4. Ensure all string values are properly escaped (no unescaped newlines or quotes).
    5. Ensure commas separate all key-value pairs and all array items.
    
    ICON RULES: Use 'FontAwesome 6 Free' classes. 
    """
    
    try:
        messages = [{"role": "user", "content": prompt}]
        response_str = await generate_chat_response(
            messages, 
            role="user", 
            task="goal generation", 
            system_instruction="You are a strict JSON generator. Do not include markdown formatting. Do not include trailing commas.",
            generation_config={"response_mime_type": "application/json", "temperature": 0.7}
        )
        
        # --- ROBUST JSON EXTRACTION ---
        cleaned = response_str.strip()
        
        # 1. Strip Markdown Code Fences if present (common LLM artifact)
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?", "", cleaned).strip()
        if cleaned.endswith("```"):
            cleaned = re.sub(r"```$", "", cleaned).strip()

        # 2. Regex find the array brackets
        match = re.search(r'\[.*\]', cleaned, re.DOTALL)
        if match:
            cleaned = match.group(0)
        
        # 3. Try parsing
        try:
            ai_goals = json.loads(cleaned)
        except json.JSONDecodeError as e:
            logging.warning(f"JSON Parse Error: {e}. Raw: {cleaned[:100]}... Attempting Repairs.")
            
            # --- REPAIR STRATEGIES ---
            
            # Repair 1: Missing comma between objects: } {  ->  }, {
            repaired = re.sub(r'\}\s*\{', '}, {', cleaned)
            
            # Repair 2: Missing comma between fields: "val" "key" -> "val", "key"
            # Look for: " (quote), optional space/newline, " (quote)
            # This is risky but often necessary for LLMs that forget commas
            repaired = re.sub(r'\"\s*\n\s*\"', '",\n"', repaired)
            
            try:
                ai_goals = json.loads(repaired)
                logging.info("JSON successfully repaired.")
            except json.JSONDecodeError:
                logging.error("Failed to repair JSON. Returning empty.", exc_info=True)
                return []

        validated_goals = []
        for goal in ai_goals:
            if not isinstance(goal, dict): continue
            validated_goals.append({
                'domain': goal.get('domain', 'General'),
                'title': goal.get('title', 'Untitled Goal'),
                'goal': goal.get('goal', 'No description provided.'),
                'icon': goal.get('icon', 'fa-solid fa-question-circle'),
                'is_compliant': goal.get('is_compliant', goal.get('iscompliant', True))
            })
        return validated_goals

    except Exception as e:
        logging.error(f"Error in generate_goal: {e}", exc_info=True)
        return []

async def analyze_user_input(user_text: str) -> List[str]:
    
    prompt = f'Analyze text and extract 3-5 key keywords. Text: "{user_text}". Return JSON: {{ "keywords": [] }}'
    try:
        messages = [{"role": "user", "content": prompt}]
        response_str = await generate_chat_response(messages, role="user", task="keyword extraction", generation_config={"response_mime_type": "application/json"})
        return json.loads(response_str).get('keywords', [])
    except Exception:
        return []

async def is_input_compliant(user_text: str) -> dict:
    prompt = f'Analyze compliance. Text: "{user_text}". Return JSON: {{ "compliant": boolean, "reason": string }}'
    try:
        messages = [{"role": "user", "content": prompt}]
        response_str = await generate_chat_response(messages, role="user", task="compliance check", generation_config={"response_mime_type": "application/json"})
        result = json.loads(response_str)
        return {"compliant": result.get('compliant', True), "reason": result.get('reason', '')}
    except Exception:
        return {"compliant": False, "reason": "System error."}


# ==============================================================================
# 3. OUTCOME GENERATION (The Architect)
# ==============================================================================

async def generate_outcome_data(ssol_title, ssol_description, domain, forced_constraints=None):
    """
    The primary bootstrap function. 
    Architects the solution structure and infers System Nodes.
    """
    
    # Prepare Lists for the Prompt
    node_types_str = ', '.join(get_valid_node_types())
    sys_types_str = ', '.join(get_valid_system_types())
    
    # Inject User Constraints if present
    constraint_text = ""
    if forced_constraints:
        constraint_text = "\n*** HARD USER CONSTRAINTS (NON-NEGOTIABLE) ***\n"
        for k, v in forced_constraints.items():
            constraint_text += f"- {k}: {v}\n"
        constraint_text += "You MUST incorporate these specific constraints into your System Configuration.\n"

    prompt = f"""
    Act as a Visionary Systems Architect for the SSPEC Project Management Engine.
    
    *** MISSION PARAMETERS ***
    GOAL: '{ssol_title}'
    DOMAIN: '{domain}'
    CONTEXT: {ssol_description}
    {constraint_text}
    
    *** INSTRUCTIONS ***

    1. SYSTEM CONFIGURATION (Inference):
    Based on the context, infer the critical "System Anchors" (Who, How, Why, Scale).
    Valid Types: {sys_types_str}.
    
    2. EXECUTIVE SUMMARY (The Narrative):
    Write a cohesive HTML paragraph summarizing the strategy.
    - Use <sys type="TYPE">Value</sys> tags to highlight System Anchors.
    - DO NOT USE <ce> tags in this summary. This section is for high-level context only.
    - Ensure the tone is professional, visionary, and confident.
    
    3. PHASE STRUCTURE (STRICT ADHERENCE REQUIRED):
    You must use EXACTLY these 5 Phase names. Do NOT rename them.
    - Discovery
    - Engagement
    - Action
    - Completion
    - Legacy

    For each phase, define 3-5 "Conditions of Satisfaction" (COS).
    A COS is a state of reality, not just a task.
    Embed Conditional Elements (CEs) in the COS text using <ce type="ValidType">Label</ce>.
    Valid CE Types: {node_types_str}.
    
    *** RESPONSE FORMAT (JSON ONLY) ***
    {{
        "ssolsummary": "<p>The <sys type='OPERATOR'>Global Team</sys> will...</p>",
        "system_params": {{
            "HORIZON": "Quarter 4 2025",
            "OPERATOR": "Consortium",
            "SCALE": "Global",
            "DIRECTIVE": "Open Source"
        }},
        "phases": {{
            "Discovery": ["COS Sentence 1...", "COS Sentence 2..."],
            "Engagement": [...],
            "Action": [...],
            "Completion": [...],
            "Legacy": [...]
        }}
    }}
    """
    
    # Execute AI Call
    messages = [{"role": "user", "content": prompt}]
    response_str = await generate_chat_response(
        messages, 
        role="user", 
        task="ssol generation", 
        temperature=0.5 # Lower temp to enforce strict phase naming
    )
    
    # Clean and Parse
    clean_json = response_str.replace("```json", "").replace("```", "").strip()
    
    try:
        return json.loads(clean_json)
    except json.JSONDecodeError:
        logging.error(f"Failed to parse AI JSON for SSOL. Response: {clean_json}")
        return {
            "ssolsummary": "<p>Error generating solution structure. Please try again.</p>",
            "phases": {},
            "system_params": {}
        }


async def generate_ai_data(node_type: str, cos_content: str, ssol_goal: str, agent_mode: str = 'context') -> dict:
    """Generates context data for a specific Node Modal."""
    try:
        if agent_mode == 'speculate':
            return await get_grounded_data(f"Research {node_type} for {ssol_goal}", node_type)
            
        else: # Context mode (Narrative generation)
            prompt = f"Briefly explain the strategic purpose of this '{node_type}' element in the Context: Overall Goal '{ssol_goal}', Specific Requirement '{cos_content}'. Return JSON with key 'contextual_description'."
            messages = [{"role": "user", "content": prompt}]
            
            response_str = await generate_chat_response(
                messages, 
                role="user", 
                task="contextual insight",
                generation_config={"response_mime_type": "application/json", "temperature": 0.7}
            )
            
            cleaned = response_str.replace("```json", "").replace("```", "").strip()
            return json.loads(cleaned)

    except Exception as e:
        logging.error(f"Error in generate_ai_data ({agent_mode}): {e}", exc_info=True)
        return {}