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

# --- Logging Setup ---
logging.basicConfig(level=logging.INFO)

# --- HELPER: CE Pill Rendering ---

def replace_ce_tags_with_pills(content):
    """
    Parses COS content, finds <ce> tags, and replaces them with interactive
    HTML pills using the Horizon styling structure.
    """
    if not content:
        return ""

    # Delayed imports to avoid circular dependencies with models
    from app import USE_DATABASE
    from store import ce_store
    from models import CE, get_engine_and_session
    from uuid import UUID

    soup = BeautifulSoup(str(content), 'html.parser')
    ce_tags = soup.find_all('ce')

    for tag in ce_tags:
        ce_id_str = tag.get('id')
        ce_type = tag.get('type', 'Default')
        ce_text = tag.get_text()
        
        resource_count = 0
        
        # --- 1. Fetch Resource Count (Optional, for badges) ---
        try:
            if ce_id_str:
                if USE_DATABASE:
                    engine, SessionLocal = get_engine_and_session()
                    session = SessionLocal()
                    try:
                        ce_uuid = UUID(ce_id_str)
                        ce_instance = session.query(CE).get(ce_uuid)
                        if ce_instance and ce_instance.data:
                            data_payload = ce_instance.data
                            if isinstance(data_payload, str):
                                data_payload = json.loads(data_payload)
                            resources = data_payload.get('resources', [])
                            resource_count = len(resources)
                    except Exception as db_err:
                        logging.warning(f"Error fetching CE count: {db_err}")
                    finally:
                        session.close()
                else:
                    # Fallback for in-memory store
                    ce_data = ce_store.get(ce_id_str, {})
                    if ce_data and 'data' in ce_data:
                        resource_count = len(ce_data['data'].get('resources', []))
        except Exception as e:
            logging.error(f"Error in replace_ce_tags_with_pills: {e}")

        # --- 2. Build Horizon Pill HTML ---
        
        # Get node config
        node_config = NODES.get(ce_type, NODES['Default'])
        node_color = node_config.get('color', '#6c757d')
        node_icon = node_config.get('icon', 'fa-solid fa-cube')

        # Container (Capsule)
        new_tag = soup.new_tag('span', attrs={
            'class': 'ce-pill', 
            'data-ce-id': ce_id_str,
            'data-ce-type': ce_type,
            'title': f"{ce_type} | Click to Configure",
            'style': f'--node-color: {node_color};' 
        })
        
        # Icon Box
        icon_span = soup.new_tag('span', attrs={'class': 'ce-pill-icon'})
        i_tag = soup.new_tag('i', attrs={'class': node_icon})
        icon_span.append(i_tag)
        new_tag.append(icon_span)
        
        # Text
        text_span = soup.new_tag('span', attrs={'class': 'ce-pill-text'})
        text_span.string = ce_text
        new_tag.append(text_span)

        # Optional Count Badge
        if resource_count > 0:
            count_badge = soup.new_tag('span', attrs={
                'class': 'badge bg-secondary ms-1 rounded-pill', 
                'style': 'font-size: 0.6em; opacity: 0.8;'
            })
            count_badge.string = str(resource_count)
            new_tag.append(count_badge)

        tag.replace_with(new_tag)

    return str(soup)


# --- GOAL SELECTION & INPUT ANALYSIS ---

async def generate_goal(user_input: str) -> List[Dict]:
    prompt = f"""
    Based on the user input '{user_input}', generate three distinct, high-level goal options. 
    Each goal must be a JSON object with keys: "domain", "title", "goal", "icon", "is_compliant". 
    
    ICON RULES:
    Use 'FontAwesome 6 Free' classes (e.g., 'fa-solid fa-rocket').
    
    Output Format: JSON Array of 3 objects.
    """
    
    system_instruction = "You are a JSON-only API."
    try:
        messages = [{"role": "user", "content": prompt}]
        response_str = await generate_chat_response(messages, role="user", task="goal generation", system_instruction=system_instruction)
        # Clean markdown
        response_str = response_str.replace("```json", "").replace("```", "").strip()
        
        ai_goals = json.loads(response_str)

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
    prompt = f'Analyze the text and extract 3-5 key themes. Text: "{user_text}". Return JSON object: {{ "keywords": [] }}'
    try:
        messages = [{"role": "user", "content": prompt}]
        response_str = await generate_chat_response(messages, role="user", task="keyword extraction")
        response_str = response_str.replace("```json", "").replace("```", "").strip()
        result = json.loads(response_str)
        return result.get('keywords', [])
    except Exception as e:
        return []

async def is_input_compliant(user_text: str) -> dict:
    prompt = f'Analyze compliance. Text: "{user_text}". Return JSON: {{ "compliant": boolean, "reason": string }}'
    try:
        messages = [{"role": "user", "content": prompt}]
        response_str = await generate_chat_response(messages, role="user", task="compliance check")
        response_str = response_str.replace("```json", "").replace("```", "").strip()
        result = json.loads(response_str)
        return {"compliant": result.get('compliant', True), "reason": result.get('reason', '')}
    except Exception as e:
        return {"compliant": False, "reason": "System error."}


# --- OUTCOME & CE GENERATION ---

async def generate_outcome_data(ssol_title, ssol_description, domain):
    node_types_str = ', '.join(get_valid_node_types())
    
    prompt = f"""
    Act as a Visionary Systems Architect.
    GOAL: Generate a Structured Solution (SSOL) for: '{ssol_title}' in domain '{domain}'.
    CONTEXT: {ssol_description}
    
    FRAMEWORK INSTRUCTIONS:
    The solution must follow the SSPEC 5-Phase Methodology. 
    For each phase, you must define 3-5 "Conditions of Satisfaction" (COS).
    
    CRITICAL LOGIC FOR COS:
    1. A COS is not a task; it is a STATE OF REALITY. 
    2. Collectively, the COS list must act as a "Checksum" for the phase. If all COS are marked "Complete", the Phase must be undeniably finished.
    3. Phrasing: Use passive past tense or future perfect tense (e.g., "Permits have been acquired" NOT "Acquire permits").
    
    PHASE DEFINITIONS:
    - Discovery: The feasibility and parameters are fully defined.
    - Engagement: The network, stakeholders, and permissions are locked in.
    - Action: The physical or digital execution is performed.
    - Completion: The output is verified against the integrity score.
    - Legacy: The systemic impact is secured for the future.

    FORMATTING RULES FOR CEs:
    Embed "Conditional Elements" (CEs) directly into the COS text using XML tags:
    <ce type="NodeType">Label</ce>
    
    Example: 
    "A binding MOU has been signed by the <ce type='Stakeholder'>Regional Director</ce> covering all <ce type='Risk'>Liability Concerns</ce>."
    
    Valid Types: {node_types_str}.
    
    Response Format (JSON ONLY):
    {{
        "ssolsummary": "<p>...</p>",
        "phases": {{
            "Discovery": ["COS Sentence 1...", "COS Sentence 2..."],
            "Engagement": [...],
            "Action": [...],
            "Completion": [...],
            "Legacy": [...]
        }}
    }}
    """
    
    # Increase temp slightly for creative problem solving
    messages = [{"role": "user", "content": prompt}]
    response_str = await generate_chat_response(messages, role="user", task="ssol generation", temperature=0.7)
    
    # Clean markdown wrappers if present
    clean_json = response_str.replace("```json", "").replace("```", "").strip()
    
    try:
        return json.loads(clean_json)
    except json.JSONDecodeError:
        logging.error(f"Failed to parse AI JSON for SSOL. Response: {clean_json}")
        return {
            "ssolsummary": "<p>Error generating solution structure. Please try again.</p>",
            "phases": {}
        }


async def generate_ai_data(node_type: str, cos_content: str, ssol_goal: str, agent_mode: str = 'context') -> dict:
    """Generates context data for a specific Node Modal."""
    node_config = NODES.get(node_type, NODES['Default'])
    query_context = f"Overall Goal: '{ssol_goal}'. Requirement: '{cos_content}'."
    
    try:
        if agent_mode == 'speculate':
            # Use grounded search (Placeholder logic for now)
            return await get_grounded_data(f"Research {node_type} for {ssol_goal}", node_type)
            
        else: # Context mode (Narrative generation)
            prompt = f"Briefly explain the strategic purpose of this '{node_type}' element in the Context: {query_context}. Return JSON with key 'contextual_description'."
            messages = [{"role": "user", "content": prompt}]
            response_str = await generate_chat_response(messages, role="user", task="contextual insight")
            response_str = response_str.replace("```json", "").replace("```", "").strip()
            return json.loads(response_str)

    except Exception as e:
        logging.error(f"Error in generate_ai_data ({agent_mode}): {e}", exc_info=True)
        return {}