# utilities.py (Corrected Circular Import - Version 0003 - Image generation removed from generate_outcome_data)
import io
import os
import re
import html
import json
import time
import uuid
import logging
import warnings
from uuid import uuid4
from PIL import Image
from bs4 import BeautifulSoup
from dotenv import load_dotenv
# from app import db, app # REMOVE or comment out THIS LINE (and any other 'from app import ...' lines)
from ce_nodes import get_valid_node_types
from flask import current_app, flash, render_template
import asyncio
import aiohttp
import requests
from google.generativeai import types
from speculate import parse_ai_response_and_generate_html

load_dotenv()
azure_oai_key = os.getenv("AZURE_OPENAI_API_KEY")
azure_oai_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
azure_oai_deployment_name = os.getenv("AZURE_DEPLOYMENT_NAME")
azure_oai_model = os.getenv("AZURE_MODEL_NAME")
azure_dalle_api_version = os.getenv("AZURE_DALLE_API_VERSION")
azure_dalle_deployment_name = os.getenv("AZURE_DALLE_DEPLOYMENT_NAME")

async def analyze_cos(cos_content, cos_id=None):
    from ai_service import generate_chat_response_with_node_types
    from ce_nodes import get_valid_node_types
    from ce_templates import replace_ce_tags_with_pills
    import json
    import logging

    prompt = (
        "Analyze the following condition of satisfaction (COS) and identify any conditional elements (CEs). "
        "Return a JSON object with the COS text and an array of CEs, each with its text and type."
        "\nCOS: '{}'"
        "\nExpected response format:"
        "{{"
        "  'COS': 'The full text of the COS',"
        "  'CEs': ["
        "    {{'text': 'A conditional element', 'type': 'The type of CE (must be one of the valid node types)'}}"
        "  ]"
        "}}"
    ).format(cos_content)

    messages = [
        {"role": "system", "content": "Return a JSON object with the analyzed COS and CEs. **The response should be valid JSON.**"},
        {"role": "user", "content": prompt},
    ]

    try:
        response_text = await generate_chat_response_with_node_types(messages, role='COS Analysis', task='Analyze COS')
        response_json = json.loads(response_text)

        cos_text = response_json.get("COS", cos_content)
        ces = response_json.get("CEs", [])

        valid_node_types = get_valid_node_types()
        valid_ces = []
        for ce in ces:
            if ce["type"] in valid_node_types:
                valid_ces.append({
                    'content': ce["text"],
                    'ce_type': ce["type"],  # Use ce_type (from AI) for now, rename later
                })

        # Rename 'ce_type' to 'node_type' for consistency
        for ce in valid_ces:
            ce['node_type'] = ce.pop('ce_type')
            if cos_id:  # Only add cos_id if it was provided
                ce['cos_id'] = cos_id

        content_with_ce = replace_ce_tags_with_pills(cos_text, valid_ces)
        return {'content_with_ce': content_with_ce, 'ces': valid_ces}

    except Exception as e:
        logging.error(f"Exception occurred during COS analysis: {e}", exc_info=True)
        return {'content_with_ce': cos_content, 'ces': []}

async def generate_outcome_data(USE_DATABASE, request, method, selected_goal=None, domain=None, domain_icon=None, selected_goal_title=None): # ADD selected_goal_title
    from ai_service import generate_chat_response, azure_openai_client
    from models import get_engine_and_session
    from store import ssol_store
    from speculate import parse_ai_response_and_generate_html  # Make sure this import is present

    outcome_data = {
        'user_input': '', 'selected_goal': selected_goal, 'domain_icon': domain_icon, 'domain': domain,
        'ssol_id': None, 'ssol_summary': "An error occurred while processing the summary data.",
        'ssol_title': selected_goal_title, # Add ssol_title here
        'phases': {}, 'generated_image_path': 'images/SSPEC_Logo_Motion.gif' #default image, will be updated later.
    }

    user_input = request.form.get('user_text', '').strip() if method == 'POST' else request.args.get('user_text', '').strip()
    user_input = html.escape(user_input)  # Sanitize user input
    outcome_data['user_input'] = user_input
    outcome_data['ssol_id'] = generate_ssol_id(USE_DATABASE, selected_goal)
    current_app.logger.info(f"Generating outcome data for goal: {selected_goal}, ssol_id: {outcome_data['ssol_id']}") # Log ssol_id

    # Sanitize selected_goal and domain as well
    selected_goal = html.escape(selected_goal) if selected_goal else ""
    domain = html.escape(domain) if domain else ""

        # --- Summary Generation ---
    summary_messages = [
        {
            "role": "user",
            "content": (
                f"Generate a **detailed and verbose summary** for the Structured Solution project: '{selected_goal}'. " # Keep emphasis on detailed and verbose
                f"Consider the domain: {domain}. "
                f"This summary MUST provide a **comprehensive overview of the entire Structured Solution**, and **use basic HTML markup for formatting** to enhance readability. Include:\n" # Instruction for HTML markup
                f"- **A high-level description of the project's overall goal and purpose**, formatted as a paragraph (`<p>`).\n" # HTML for goal
                f"- **A brief overview of each of the five phases** of the Structured Solution (Discovery, Engagement, Action, Completion, Legacy), highlighting the primary focus of each phase. **Format these phase overviews as an ordered list** (`<ol>`), with each phase description as a list item (`<li>`).\n" # HTML for phases as ordered list
                f"- **The anticipated overall outcome or impact** of successfully implementing the Structured Solution, formatted as a paragraph (`<p>`).\n" # HTML for impact
                f"Imagine you are writing an **executive summary or abstract** for a project proposal or report that will be displayed on a webpage. " # Analogy for web display
                f"Aim for a summary that is approximately **1-2 paragraphs and an ordered list of 5 items (one for each phase)** to thoroughly introduce the SSPEC PossPath output and its key components to someone unfamiliar with the project. " # Length guidance with HTML structure
                f"**Allowed HTML tags are:** `<p>`, `<ol>`, `<li>`, `<b>`, `<strong>`, `<i>`, `<em>`. **Use these tags to structure and emphasize key parts of the summary.**\n" # Explicitly list allowed HTML tags
                f"Return a JSON object with a SINGLE KEY 'summary', containing the summary text **with HTML markup**. " # Specify HTML in output
                f"**Example JSON Output (Illustrative - Your output should be more detailed):**\n"
                f"{{\n"
                f"  \"summary\": \"<p>This project aims to [Goal Description]...</p>\\n<ol>\\n  <li><b>Discovery Phase:</b> [Discovery Phase Summary]...</li>\\n  <li><b>Engagement Phase:</b> [Engagement Phase Summary]...</li>\\n  <li><b>Action Phase:</b> [Action Phase Summary]...</li>\\n  <li><b>Completion Phase:</b> [Completion Phase Summary]...</li>\\n  <li><b>Legacy Phase:</b> [Legacy Phase Summary]...</li>\\n</ol>\\n<p>The expected outcome is [Impact Description]...</p>\"\n" # Example with HTML markup
                f"}}"
            )
        },
    ]

    try:
        current_app.logger.info("Generating summary from AI...")
        summary_response = await generate_chat_response(summary_messages, role='Outcome Summary', task='Generate Summary')
        current_app.logger.debug(f"Summary AI Response: {summary_response}")  # DEBUG level for raw response
        summary_data = json.loads(summary_response)
        outcome_data['ssol_summary'] = summary_data.get('summary', "Summary not available.")
        current_app.logger.info("Summary generation successful.") # Log success
    except json.JSONDecodeError as e:
        current_app.logger.error(f"JSON decoding error when generating summary: {e}", exc_info=True) # Log with traceback
        outcome_data['ssol_summary'] = "Summary generation failed due to JSON error."
    except Exception as e:
        current_app.logger.error(f"Error in generate_outcome_data (summary): {e}", exc_info=True) # Log with traceback
        outcome_data['ssol_summary'] = "Summary generation failed."

       # --- Structured Solution Generation ---
    structured_solution_messages = [
       {
            "role": "user",
            "content": (
                f"You are an expert in structured problem-solving, specifically using a methodology called SSPEC PossPath. "
                f"Your task is to generate a concise Structured Solution for the project: '{selected_goal}'.\n\n"
                f"The Structured Solution should be organized into these phases: Discovery, Engagement, Action, Completion, Legacy.\n\n"
                f"For **EACH phase**, generate **1-3 Conditions of Satisfaction (COS)** that are relevant and achievable for that phase in the context of the overall project goal. "
                f"A Condition of Satisfaction is a clear, plain-text sentence describing a specific outcome that needs to be achieved to consider that phase (or part of a phase) successful.\n\n"
                f"**Crucially, within each COS sentence, identify opportunities to embed 'Conditional Elements' (CEs).** "
                f"Conditional Elements represent specific aspects within the COS that would benefit from further elaboration, research, or specification. "
                f"Mark these Conditional Elements by wrapping them in `<ce type='NodeType'>` tags.\n\n"
                f"**Valid 'NodeType' values are strictly limited to the following list from `ce_nodes.py`:** {', '.join(get_valid_node_types())}.\n" # Insert valid node types dynamically!
                f"**You MUST choose the most contextually appropriate 'NodeType' from this list for each Conditional Element.**\n\n"
                f"**Examples of COS with Conditional Elements:**\n"
                f"1. **Discovery Phase COS Example:** \"Identify key <ce type='Stakeholder'>stakeholder groups</ce> and conduct an initial <ce type='Research'>literature review</ce> to understand the current state of feline auditory research.\"\n" # Example with multiple CEs
                f"2. **Engagement Phase COS Example:** \"Schedule introductory meetings with <ce type='Stakeholder'>identified researchers</ce> and <ce type='Stakeholder'>veterinary experts</ce> to present the project and solicit feedback.\"\n" # Example with multiple CEs of same type
                f"3. **Action Phase COS Example:** \"Design a <ce type='Praxis'>musical experiment</ce> to test various chord progressions, focusing on <ce type='Parameter'>frequency ranges</ce> and <ce type='Parameter'>voicing styles</ce>.\"\n\n" # Example with different CE types
                f"**Instructions for JSON Output:**\n"
                f"Output a JSON object where:\n"
                f"* Keys are the **title-cased phase names** (Discovery, Engagement, Action, Completion, Legacy) with **no spaces**.\n"
                f"* Values are **arrays of COS objects** for each phase.\n"
                f"* Each COS object MUST have the following keys:\n"
                f"    * `'id'`: A unique string identifier for the COS (e.g., \"1\", \"2\", \"3\", ... within each phase).\n"
                f"    * `'content'`: **The full COS text sentence, including embedded `<ce type='NodeType'>` tags.**\n" # Emphasize including CE tags!
                f"    * `'status'`:  Always set to `'Proposed'` initially.\n\n"
                f"**Example JSON Output:**\n"
                f"{{\n"
                f"  \"Discovery\": [\n"
                f"    {{\"id\": \"1\", \"content\": \"Identify key <ce type='Stakeholder'>stakeholder groups</ce>.\", \"status\": \"Proposed\"}},\n"
                f"    {{\"id\": \"2\", \"content\": \"Conduct initial <ce type='Research'>research area</ce>.\", \"status\": \"Proposed\"}}\n"
                f"  ],\n"
                f"  \"Engagement\": [\n"
                f"    {{\"id\": \"3\", \"content\": \"Schedule meetings with <ce type='Stakeholder'>key researchers</ce>.\", \"status\": \"Proposed\"}}\n"
                f"  ],\n"
                f"  \"Action\": [] # Example of a phase with no initial COS\n"
                f"}}"
                f"**Ensure the response is valid JSON and strictly adheres to the output format.**"
            )
        }
    ]

    try:
        current_app.logger.info("Generating structured solution from AI...")
        structured_solution_response = await generate_chat_response(structured_solution_messages, role='Structured Solution', task='Generate Solution')
        current_app.logger.debug(f"Structured Solution AI Response: {structured_solution_response}") # DEBUG level
        structured_solution_json = json.loads(structured_solution_response)
        if isinstance(structured_solution_json, dict):
            # Pass USE_DATABASE here:
            outcome_data['phases'] = parse_ai_response_and_generate_html(USE_DATABASE, structured_solution_json) # Use speculate's function
            current_app.logger.info("Structured solution generation successful.")
        else:
            current_app.logger.error("Expected a dictionary for the structured solution JSON response.")
            outcome_data['phases'] = {}
    except json.JSONDecodeError as e:
        current_app.logger.error(f"JSON decoding error when generating structured solution: {e}", exc_info=True) # Log with traceback
        outcome_data['phases'] = {}
    except Exception as e:
        current_app.logger.error(f"Error in generate_outcome_data (structured solution): {e}", exc_info=True) # Log with traceback
        outcome_data['phases'] = {}


    current_app.logger.info("Outcome data generation complete.")
    return outcome_data

async def analyze_user_input(text):
    from ai_service import generate_chat_response
    messages = [
        {"role": "system", "content": "You are an AI that analyzes user inputs and extracts keywords. **Respond with JSON.**"},
        {"role": "user", "content": text},
    ]
    response_text = await generate_chat_response(messages, role='Keyword Extraction', task='Extract Keywords', temperature=0.75)
    keywords = response_text.split(', ')
    print(f"Keywords: {keywords}")
    return keywords

async def generate_sentiment_analysis(text, temperature=0.7):
    from ai_service import generate_chat_response
    messages = [
        {"role": "user", "content": f"What sentiment is expressed in the following text: '{text}'?"},
    ]
    system_instruction = "You are an AI trained to analyze sentiment and return POSITIVE, NEGATIVE, or NEUTRAL **in JSON format**"
    response_text = await generate_chat_response(messages, role='Sentiment Analysis', task='Analyze Sentiment', temperature=temperature, system_instruction=system_instruction)
    sentiment = "NEUTRAL"
    try:
        response_json = json.loads(response_text)
        sentiment = response_json.get("sentiment", "NEUTRAL").upper()
    except json.JSONDecodeError:
        logging.error(f"JSONDecodeError in generate_sentiment_analysis: {response_text}")
    return sentiment

async def generate_goal(user_input):
    from ai_service import generate_chat_response

    async def generate_single_goal(temp):
        # System instruction as part of messages:
        system_message = {
            "role": "user",
            "content": (
                "You are an AI that generates three innovative and *distinct* goal outcomes based on user input. "
                "For EACH goal, you MUST provide BOTH a short 'title' (1-5 words) AND a more detailed 'goal' description (1-3 sentences). "
                "Also suggest a relevant domain (a general category like 'Technology', 'Health', 'Environment', NOT a URL) "
                "and a corresponding FontAwesome 6 Solid (fas) icon class.  "
                "Return a JSON array of objects. Each object MUST have 'title', 'goal', 'domain', and 'icon' keys. "
                "Example: "
                "["
                "  {\"title\": \"Self-healing Concrete\", \"goal\": \"Develop a new type of concrete that can automatically repair cracks and damage, extending its lifespan.\", \"domain\": \"Materials Science\", \"icon\": \"fas fa-building\"}, "
                "  {\"title\": \"AI Disease Prediction\", \"goal\": \"Create an AI-powered system for early disease prediction using patient data and machine learning.\", \"domain\": \"Healthcare\", \"icon\": \"fas fa-heartbeat\"}, "
                "  {\"title\": \"Global Carbon Capture\", \"goal\": \"Implement a global-scale carbon capture and storage system to mitigate climate change.\", \"domain\": \"Environmental Engineering\", \"icon\": \"fas fa-globe-americas\"}"
                "]"
            )
        }

        messages = [
            system_message,  # System message as part of messages
            {"role": "user", "content": user_input},
        ]

        try:
            response_text = await generate_chat_response(messages, role='Goal Generation', task='Generate Goal Options', temperature=temp)

            try:
                # Directly try to parse as JSON.  The Gemini response IS a JSON list.
                goal_options = json.loads(response_text)
            except json.JSONDecodeError as e:
                logging.error(f"JSONDecodeError: {response_text} - {e}")
                return []  # Return an empty list on parsing failure

            if isinstance(goal_options, list):
                # Basic validation: check for required keys
                validated_goals = []
                for goal in goal_options:
                    if all(key in goal for key in ['title', 'domain', 'icon', 'goal']): #Added goal here.
                        validated_goals.append(goal)
                    else:
                        logging.warning(f"Invalid goal format: {goal}")
                return validated_goals
            else:
                logging.error(f"Unexpected response format (not a list): {response_text}")
                return []

        except Exception as e:
            logging.error(f"Unexpected error: {e}", exc_info=True)
            return []  # Return an empty list on any error

    temperatures = [0.6, 0.8, 1.0]
    all_goals = []
    seen_titles = set()

    async with asyncio.TaskGroup() as tg:
        tasks = [tg.create_task(generate_single_goal(temp)) for temp in temperatures]

    results = [task.result() for task in tasks]

    for goal_list in results:
        for goal in goal_list:
            if goal['title'] not in seen_titles:
                all_goals.append(goal)
                seen_titles.add(goal['title'])

    if not all_goals:
        raise ValueError("Failed to generate any valid goal options.")

    return all_goals[:3]


def get_cos_by_guid(ssol, cos_guid):
    for phase in ssol['phases'].values():
        for cos in phase:
            if cos['id'] == cos_guid: return cos
    return None

def update_cos_content_by_guid(ssol, cos_guid, new_content):
    cos = get_cos_by_guid(ssol, cos_guid)
    if cos: cos['content'] = new_content; return True
    return False

def sanitize_filename(filename):
    filename = re.sub(r'[<>:"/\\|?*\x00-\x1F]', '', filename)
    filename = re.sub(r'[\s]+', '_', filename)
    return filename[:255]

async def generate_dalle_image(prompt, azure_openai_client):
    from ai_service import azure_openai_client as client_module
    from utilities import sanitize_filename # Import sanitize_filename

    try:
        azure_dalle_deployment_name = os.getenv("AZURE_DALLE_DEPLOYMENT_NAME") #Added DALLE var

        client = azure_openai_client if azure_openai_client else client_module
        result = client.images.generate(  # REMOVE await
            model=azure_dalle_deployment_name, prompt=prompt, n=1, size="1024x1024", #Changed model to deployment name
        )
        image_url = result.data[0].url

        # Log the DALL-E response
        current_app.logger.debug(f"DALL-E API response: {result}")

        unique_filename = f"generated_image_{uuid.uuid4().hex}.png"
        unique_filename = sanitize_filename(unique_filename) # Sanitize filename here.
        static_folder = current_app.static_folder
        image_folder = os.path.join(static_folder, 'images')  # Correct path
        os.makedirs(image_folder, exist_ok=True)
        image_file_path = os.path.join(image_folder, unique_filename) # Corrected path

        async with aiohttp.ClientSession() as session:
            async with session.get(image_url) as resp:
                resp.raise_for_status()
                with open(image_file_path, 'wb') as f:
                    while True:
                        chunk = await resp.content.read(1024)
                        if not chunk:
                            break
                        f.write(chunk)

        web_path = os.path.join('images', unique_filename).replace("\\", "/")
        return web_path
    except Exception as e:
        current_app.logger.error(f"Error in generate_dalle_image: {e}", exc_info=True)
        raise

def generate_ssol_id(USE_DATABASE, selected_goal): # Add the parameter here
    from models import SSOL, get_engine_and_session  # Import get_engine_and_session
    from store import ssol_store
    from app import app # added app import

    if USE_DATABASE:
        with app.app_context():  # Use application context
            engine, session = get_engine_and_session()
            ssol_instance = session.query(SSOL).filter_by(title=selected_goal).first()
            if not ssol_instance:
                ssol_instance = SSOL(title=selected_goal, description='')
                session.add(ssol_instance)
                session.commit()
            ssol_id_to_return = str(ssol_instance.id) # Convert to string
            session.close()
            return ssol_id_to_return
    else:
        ssol_instance = next((ssol for ssol in ssol_store.values() if ssol['title'] == selected_goal), None)
        if not ssol_instance:
            ssol_id = str(uuid.uuid4())
            ssol_instance = {'id': ssol_id, 'title': selected_goal, 'description': ''}
            ssol_store[ssol_id] = ssol_instance
        return ssol_instance['id']

def get_badge_class_from_status(status):
    return {
        'Proposed': 'bg-info',
        'In Progress': 'bg-warning text-dark',
        'Completed': 'bg-success',
        'Rejected': 'bg-danger'
    }.get(status, 'bg-secondary')