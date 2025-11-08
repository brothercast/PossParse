# utilities.py

import logging
import json
import re
import uuid
import os
import shutil
from typing import Dict, Any, List

from flask import current_app

# Import the high-level functions from YOUR ai_service.py
from ai_service import generate_chat_response, get_grounded_data, generate_image

# Local Imports
from ce_nodes import NODES, get_valid_node_types
from models import SSOL, COS, CE

# --- Logging Setup ---
logging.basicConfig(level=logging.INFO)

# --- SSPEC Methodology Context ---

def get_sspec_scenario() -> str:
    """Returns the SSPEC methodology description for AI context."""
    return """
    The SSPEC methodology is a structured approach to problem-solving.
    It involves defining a Strategic Solution aLignment (SSOL), which is a high-level goal,
    broken into five phases: Discovery, Engagement, Action, Completion, and Legacy.
    Each phase contains Conditions of Satisfaction (COS), which are verifiable requirements.
    Each COS is further detailed by Conditional Elements (CEs) using specialized node types.
    """

# --- GOAL SELECTION & INPUT ANALYSIS FUNCTIONS ---

async def generate_goal(user_input: str) -> List[Dict]:
    """
    Generates three goal options from user input and robustly validates the structure.
    """
    prompt = f"""Based on the user input '{user_input}', generate three distinct, high-level goal options. Each goal must be a JSON object with these exact keys: "domain", "title", "goal", "icon", "is_compliant". The "icon" must be a Font Awesome class. "is_compliant" must be a boolean."""
    
    system_instruction = "You are a JSON-only API. Your entire response MUST be a single, raw, valid JSON array of three objects. Do not use markdown ```json blocks. Do not add any introductory text. All keys and all string values MUST be enclosed in double quotes."

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
        
        logging.info(f"Validated and returning {len(validated_goals)} goal options.")
        return validated_goals

    except Exception as e:
        logging.error(f"Error in generate_goal: {e}", exc_info=True)
        return []

async def analyze_user_input(user_text: str) -> List[str]:
    """Analyzes user input and extracts key themes/keywords."""
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
    """
    Checks if user input is appropriate and constructive.
    """
    prompt = f"""
    Analyze the following user input for compliance with safety and constructive use policies.
    The input should not contain harmful content, hate speech, illegal activities, or be nonsensical.
    Text: "{user_text}"
    Return a JSON object with two keys: "compliant" (boolean) and "reason" (a brief, user-friendly explanation ONLY if non-compliant).
    """
    try:
        messages = [{"role": "user", "content": prompt}]
        response_str = await generate_chat_response(messages, role="user", task="compliance check")
        result = json.loads(response_str)
        return {
            "compliant": result.get('compliant', True),
            "reason": result.get('reason', '')
        }
    except Exception as e:
        logging.error(f"Error in is_input_compliant: {e}", exc_info=True)
        return {"compliant": False, "reason": "Could not be analyzed due to a system error."}

# --- OUTCOME & SSOL GENERATION ---

async def generate_outcome_data(ssol_title, ssol_description, domain):
    """Generates the structured SSOL data (Summary, Phases, COS, CEs) using the AI."""
    node_types_str = ', '.join(get_valid_node_types())
    # --- FIX: Modified prompt to request the structure routes.py expects ---
    prompt = f"""
    Generate a structured solution for this goal: '{ssol_title}' in the domain of '{domain}'.
    {get_sspec_scenario()}
    Your response MUST be a single valid JSON object with TWO top-level keys: 'ssolsummary' and 'phases'.
    1. 'ssolsummary': A comprehensive overview of the solution, using basic HTML markup for formatting.
    2. 'phases': An object containing a key for each of the 5 project phases (Discovery, Engagement, Action, Completion, Legacy).
    For each phase, the value should be an array of 2-3 Condition of Satisfaction (COS) strings.
    Within each COS string, embed relevant Conditional Elements (CEs) by wrapping them in <ce type="NodeType">CE text</ce> tags.
    Use ONLY these NodeTypes: {node_types_str}.
    Example structure: {{"ssolsummary": "<p>Summary here.</p>", "phases": {{"Discovery": ["The <ce type='Research'>market analysis</ce> must be done."], "Engagement": [...]}}}}
    """
    messages = [{"role": "user", "content": prompt}]
    response_str = await generate_chat_response(messages, role="user", task="ssol generation", temperature=0.7)
    return json.loads(response_str)

# --- CE DATA GENERATION ---

async def generate_ai_data(
    node_type: str, 
    cos_content: str, 
    ssol_goal: str, 
    agent_mode: str = 'context'
) -> dict:
    """
    Orchestrates AI data generation for CE modals.
    """
    node_config = NODES.get(node_type, NODES['Default'])
    query_context = f"The overall goal is '{ssol_goal}' and the specific requirement is '{cos_content}'."
    try:
        if agent_mode == 'speculate':
            resource_keys = [f"'{f['key']}'" for f in node_config.get('resource_schema', [])]
            query = f"Find 3 diverse, relevant resources for a '{node_type}' element, considering this context: {query_context}. For each resource, extract data for the following fields: {', '.join(resource_keys)}."
            return await get_grounded_data(query, node_type)
        else:
            if agent_mode == 'context':
                prompt = f"You are a strategic analyst. Briefly explain the purpose and importance of the '{node_type}' element in the context: {query_context}. Format the response as a JSON object with a single key 'contextual_description'."
            elif agent_mode == 'generate':
                detail_fields = [f"'{f['name']}'" for f in node_config.get('details_schema', [])]
                prompt = f"You are a subject matter expert. Based on the context: {query_context}, generate the summary content for a {node_type} element. Provide these fields: {', '.join(detail_fields)}. Format the output as a valid JSON object."
            else:
                return {"error": "Invalid agent mode specified."}
            
            messages = [{"role": "user", "content": prompt}]
            response_str = await generate_chat_response(messages, role="user", task=f"{agent_mode} generation", temperature=0.7)
            return json.loads(response_str)
    except Exception as e:
        logging.error(f"Error in orchestrator generate_ai_data for mode '{agent_mode}': {e}", exc_info=True)
        return {"error": str(e)}

# --- HELPER UTILITIES ---
