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
# Note: We delay import of models/store inside functions where necessary to avoid circular imports

# --- Logging Setup ---
logging.basicConfig(level=logging.INFO)

# --- SSPEC Methodology Context ---
def get_sspec_scenario() -> str:
    return """
    The Structured Speculation (SSPEC) methodology is a structured approach to problem-solving.
    It involves defining a Structured Solution (SSOL), which is a high-level goal,
    broken into five phases: Discovery, Engagement, Action, Completion, and Legacy.
    Each phase contains Conditions of Satisfaction (COS), which are verifiable requirements.
    Each COS is further detailed by Conditional Elements (CEs) using specialized node types.
    """

# --- HELPER: CE Pill Rendering ---

def replace_ce_tags_with_pills(content):
    """
    Parses COS content, finds <ce> tags, and replaces them with interactive
    HTML pills. It performs a real-time lookup to check for associated resources
    and adds a visual count or 'new' indicator.
    """
    if not content:
        return ""

    # Delayed imports to avoid circular dependencies
    from app import USE_DATABASE
    from store import ce_store
    from models import CE, get_engine_and_session
    from uuid import UUID

    soup = BeautifulSoup(content, 'html.parser')
    ce_tags = soup.find_all('ce')

    for tag in ce_tags:
        ce_id_str = tag.get('id')
        ce_type = tag.get('type', 'Default')
        ce_text = tag.get_text()
        
        resource_count = 0
        
        # --- 1. Fetch Resource Count Safely ---
        try:
            if ce_id_str:
                if USE_DATABASE:
                    # Create a temporary, isolated session for this lookup
                    engine, SessionLocal = get_engine_and_session()
                    session = SessionLocal()
                    try:
                        # Verify UUID format before query
                        ce_uuid = UUID(ce_id_str)
                        ce_instance = session.query(CE).get(ce_uuid)
                        
                        if ce_instance and ce_instance.data:
                            # Access the JSON data
                            data_payload = ce_instance.data
                            # Handle case where data might be a string (SQLite edge cases) or dict
                            if isinstance(data_payload, str):
                                data_payload = json.loads(data_payload)
                                
                            resources = data_payload.get('resources', [])
                            resource_count = len(resources)
                    except Exception as db_err:
                        logging.warning(f"Error fetching CE count for {ce_id_str}: {db_err}")
                    finally:
                        session.close()
                else:
                    # Fallback to in-memory store
                    ce_data = ce_store.get(ce_id_str, {})
                    if ce_data and 'data' in ce_data:
                        resource_count = len(ce_data['data'].get('resources', []))
        except Exception as e:
            # Fail gracefully (display pill with 0 count) rather than crashing the page
            logging.error(f"Error in replace_ce_tags_with_pills: {e}")

        # --- 2. Build the New Pill HTML ---
        
        # Get node config for styling
        node_config = NODES.get(ce_type, NODES['Default'])
        node_color = node_config.get('color', '#6c757d')
        node_icon = node_config.get('icon', 'fa-solid fa-cube')

        # Main Container (Matches styles.css .ce-pill)
        # We set a CSS variable --node-color for the icon background
        new_tag = soup.new_tag('span', attrs={
            'class': 'ce-pill',
            'data-ce-id': ce_id_str,
            'data-ce-type': ce_type,
            'title': f"{ce_type} | Click to open",
            'style': f'--node-color: {node_color};' 
        })
        
        # A. Icon Section (White icon on colored background)
        icon_span = soup.new_tag('span', attrs={'class': 'ce-pill-icon'})
        i_tag = soup.new_tag('i', attrs={'class': node_icon})
        icon_span.append(i_tag)
        new_tag.append(icon_span)
        
        # B. Text Section
        text_span = soup.new_tag('span', attrs={'class': 'ce-pill-text'})
        text_span.string = ce_text
        new_tag.append(text_span)

        # C. Indicator Section (Count or "New" Dot)
        if resource_count > 0:
            # Gray pill with number
            count_badge = soup.new_tag('span', attrs={
                'class': 'badge bg-secondary ms-1 me-1 rounded-pill', 
                'style': 'font-size: 0.65em; opacity: 0.9; vertical-align: middle;'
            })
            count_badge.string = str(resource_count)
            new_tag.append(count_badge)
        else:
            # Small Green "New" Dot
            dot = soup.new_tag('span', attrs={
                'class': 'rounded-circle bg-success d-inline-block ms-1 me-1', 
                'style': 'width: 6px; height: 6px; vertical-align: middle;',
                'title': 'Ready for Speculation'
            })
            new_tag.append(dot)

        # Replace the original <ce> tag with our new structured span
        tag.replace_with(new_tag)

    return str(soup)


# --- GOAL SELECTION & INPUT ANALYSIS ---

async def generate_goal(user_input: str) -> List[Dict]:
    prompt = f"""
    Based on the user input '{user_input}', generate three distinct, high-level goal options. 
    Each goal must be a JSON object with these exact keys: "domain", "title", "goal", "icon", "is_compliant". 
    
    ICON RULES (CRITICAL):
    1. Use valid 'FontAwesome 6 Free' class names (e.g., 'fa-solid fa-robot').
    2. DO NOT guess v7 icons. Stick to established v6 Solid icons.
    3. Ensure the icon is from the 'Free' set, not 'Pro'.
    
    "is_compliant" must be a boolean.
    """
    
    system_instruction = "You are a JSON-only API. Your entire response MUST be a single, raw, valid JSON array of three objects."
    try:
        messages = [{"role": "user", "content": prompt}]
        response_str = await generate_chat_response(messages, role="user", task="goal generation", system_instruction=system_instruction)
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
    prompt = f'Analyze the following text and extract 3-5 key themes or keywords. Text: "{user_text}". Return as a JSON object with a single key "keywords" containing an array of strings.'
    try:
        messages = [{"role": "user", "content": prompt}]
        response_str = await generate_chat_response(messages, role="user", task="keyword extraction")
        result = json.loads(response_str)
        return result.get('keywords', [])
    except Exception as e:
        logging.error(f"Error in analyze_user_input: {e}", exc_info=True)
        return []

async def is_input_compliant(user_text: str) -> dict:
    prompt = f"""Analyze the following user input for compliance with safety and constructive use policies. Text: "{user_text}". Return a JSON object with two keys: "compliant" (boolean) and "reason"."""
    try:
        messages = [{"role": "user", "content": prompt}]
        response_str = await generate_chat_response(messages, role="user", task="compliance check")
        result = json.loads(response_str)
        return {"compliant": result.get('compliant', True), "reason": result.get('reason', '')}
    except Exception as e:
        logging.error(f"Error in is_input_compliant: {e}", exc_info=True)
        return {"compliant": False, "reason": "System error."}


# --- OUTCOME & CE GENERATION ---

async def generate_outcome_data(ssol_title, ssol_description, domain):
    node_types_str = ', '.join(get_valid_node_types())
    prompt = f"""
    Generate a structured solution for: '{ssol_title}' in domain '{domain}'.
    {get_sspec_scenario()}
    
    Response MUST be a single JSON object with keys: 'ssolsummary' (HTML string) and 'phases' (Object with 5 phase keys).
    Each phase contains an array of COS strings.
    
    FORMATTING RULES FOR CEs:
    1. You MUST identify MULTIPLE Conditional Elements within a single COS if they represent distinct concepts (e.g., a tool AND a person AND a policy).
    2. Embed them using <ce type="NodeType">Label</ce>.
    3. The "Label" text inside the tags must be a concise TITLE (2-5 words). Do not wrap whole sentences.
    
    Example:
    Input: "We need to get approval from the City Council and buy a 3D Printer."
    Good Output: "We need to get <ce type='Stakeholder'>City Council Approval</ce> and acquire a <ce type='Resource'>3D Printer</ce>."
    
    Valid NodeTypes: {node_types_str}.
    """
    messages = [{"role": "user", "content": prompt}]
    response_str = await generate_chat_response(messages, role="user", task="ssol generation", temperature=0.7)
    return json.loads(response_str)

async def generate_ai_data(node_type: str, cos_content: str, ssol_goal: str, agent_mode: str = 'context') -> dict:
    node_config = NODES.get(node_type, NODES['Default'])
    query_context = f"Overall Goal: '{ssol_goal}'. Requirement: '{cos_content}'."
    
    try:
        if agent_mode == 'speculate':
            # Use grounded search
            resource_keys = [f"'{f['key']}'" for f in node_config.get('resource_schema', [])]
            query = f"Find 3 diverse, real-world resources for a '{node_type}' element. Context: {query_context}. Extract: {', '.join(resource_keys)}."
            return await get_grounded_data(query, node_type)
        
        elif agent_mode == 'generate':
            # Generate details form content
            detail_fields = [f"'{f['name']}'" for f in node_config.get('details_schema', [])]
            prompt = f"As an expert, generate summary content for a {node_type} element. Context: {query_context}. Provide JSON for fields: {', '.join(detail_fields)}."
            messages = [{"role": "user", "content": prompt}]
            response_str = await generate_chat_response(messages, role="user", task="generate details")
            return json.loads(response_str)
            
        else: # Context mode
            prompt = f"Briefly explain the strategic purpose of this '{node_type}' element in the Context: {query_context}. Return JSON with key 'contextual_description'."
            messages = [{"role": "user", "content": prompt}]
            response_str = await generate_chat_response(messages, role="user", task="contextual insight")
            return json.loads(response_str)

    except Exception as e:
        logging.error(f"Error in generate_ai_data ({agent_mode}): {e}", exc_info=True)
        return {"error": str(e)}