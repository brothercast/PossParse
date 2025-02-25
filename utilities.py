# utilities.py (Refactored for Robustness, Consolidation, and Detailed Logging)
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
from app import USE_DATABASE, db, app  # Import db, AND app
from ce_nodes import get_valid_node_types
from flask import current_app, flash, render_template
import asyncio
import aiohttp
import requests
from google.generativeai import types

load_dotenv()
azure_oai_key = os.getenv("AZURE_OPENAI_API_KEY")
azure_oai_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
azure_oai_deployment_name = os.getenv("AZURE_DEPLOYMENT_NAME")
azure_oai_model = os.getenv("AZURE_MODEL_NAME")
azure_dalle_api_version = os.getenv("AZURE_DALLE_API_VERSION")
azure_dalle_deployment_name = os.getenv("AZURE_DALLE_DEPLOYMENT_NAME")

def parse_ai_response_and_generate_html(response_json):
    from models import COS, CE, get_engine_and_session  # Local import
    from store import ce_store  # Local import

    structured_solution = {}
    expected_phases = ["Discovery", "Engagement", "Action", "Completion", "Legacy"]

    for phase in expected_phases:
        structured_solution[phase] = []
        for cos_dict in response_json.get(phase, []):
            cos_id = str(uuid.uuid4())
            cos_html = cos_dict['content']  # Access 'content' key
            ces = []

            soup = BeautifulSoup(cos_html, 'html.parser')
            for ce_tag in soup.find_all('ce'):
                ce_uuid = str(uuid.uuid4())
                new_tag = soup.new_tag('span', attrs={
                    'class': 'badge rounded-pill bg-secondary ce-pill',
                    'data-ce-id': ce_uuid,
                    'data-ce-type': ce_tag['type']
                })
                new_tag.string = ce_tag.string
                ce_tag.replace_with(new_tag)

                ce_data = {
                    'id': ce_uuid,
                    'content': ce_tag.string,
                    'status': 'Proposed',
                    'type': ce_tag['type']
                }
                ces.append(ce_data)

                if USE_DATABASE:
                    with app.app_context():
                        engine, session = get_engine_and_session()
                        ce_instance = CE(id=uuid.UUID(ce_uuid), content=ce_tag.string, node_type=ce_tag['type'])
                        session.add(ce_instance)
                        session.commit()
                        session.close()
                else:
                    ce_store[ce_uuid] = ce_data


            structured_solution[phase].append({
                'id': cos_id,
                'content': str(soup),
                'status': 'Proposed',
                'ces': ces
            })
    return structured_solution

async def generate_outcome_data(request, method, selected_goal=None, domain=None, domain_icon=None):
    from ai_service import generate_chat_response, azure_openai_client
    from models import get_engine_and_session
    from store import ssol_store

    outcome_data = {
        'user_input': '', 'selected_goal': selected_goal, 'domain_icon': domain_icon, 'domain': domain,
        'ssol_id': None, 'ssol_summary': "An error occurred while processing the summary data.",
        'phases': {}, 'generated_image_path': 'images/sspec_default.png'
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
                f"Generate a high-level summary for the goal: '{selected_goal}'. Consider the domain: {domain}. "
                f"Return a JSON object with a SINGLE KEY 'summary', containing the summary text. "
                f"Example: {{\"summary\": \"This is a sample summary.\"}}"  # Example!
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
                f"Generate a concise Structured Solution for the project '{selected_goal}'. "
                f"Consider these phases: Discovery, Engagement, Action, Completion, Legacy. "
                f"For EACH phase, create Conditions of Satisfaction (COS). "
                f"Each COS should be a plain-text sentence, and you may embed conditional elements using <ce type='NodeType'> tags."
                f"Output a JSON object where keys are phase names (title-cased, no spaces), and values are arrays of COS objects. "
                f"Each COS object MUST have an 'id' (string), 'content' (string, the COS text with CE tags), and 'status' (string, initially 'Proposed'). "
                f"Example: "
                f"{{"
                f"  \"Discovery\": ["
                f"    {{\"id\": \"1\", \"content\": \"Identify key stakeholders <ce type='Stakeholder'>stakeholder group</ce>.\", \"status\": \"Proposed\"}},"
                f"    {{\"id\": \"2\", \"content\": \"Conduct initial research <ce type='Research'>research area</ce>.\", \"status\": \"Proposed\"}}"
                f"  ],"
                f"  \"Engagement\": []"  # Empty array for phases with no COS initially
                f"}}"
                f"**The response MUST be valid JSON.**"
            )
        }
    ]
    try:
        current_app.logger.info("Generating structured solution from AI...")
        structured_solution_response = await generate_chat_response(structured_solution_messages, role='Structured Solution', task='Generate Solution')
        current_app.logger.debug(f"Structured Solution AI Response: {structured_solution_response}") # DEBUG level
        structured_solution_json = json.loads(structured_solution_response)
        if isinstance(structured_solution_json, dict):
            outcome_data['phases'] = parse_ai_response_and_generate_html(structured_solution_json)
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

    try:
        image_prompt = f"A colorful, visually stunning photograph of a retro-futuristic tableau depicting '{selected_goal}' as a fulfilled goal, diverse,It's a Small World, 1962, photo-realistic, isometric, tiltshift "
        image_prompt = html.escape(image_prompt)  # and the prompt
        current_app.logger.info(f"Generating image with prompt: {image_prompt}")
        web_image_path = await generate_dalle_image(image_prompt, azure_openai_client)
        outcome_data['generated_image_path'] = web_image_path
        current_app.logger.info(f"Image generated successfully. Path: {web_image_path}")

    except Exception as e:
        current_app.logger.error(f"Error generating image: {e}", exc_info=True)
        outcome_data['generated_image_path'] = 'images/sspec_default.png'

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
        messages = [
            {"role": "user", "content": user_input},
        ]
        system_instruction = (
            "You are an AI that generates three innovative and *distinct* goal outcomes based on user input. "
            "For EACH goal, also suggest a relevant domain (a general category like 'Technology', 'Health', 'Environment', NOT a URL) "
            "and a corresponding FontAwesome 6 Solid (fas) icon class.  "
            "Return a JSON array of objects. Each object MUST have 'title', 'domain', and 'icon' keys. "
            "Example: "
            "["
            "  {\"title\": \"Develop self-healing concrete\", \"domain\": \"Materials Science\", \"icon\": \"fas fa-building\"}, "
            "  {\"title\": \"Create AI-powered disease prediction\", \"domain\": \"Healthcare\", \"icon\": \"fas fa-heartbeat\"}, "
            "  {\"title\": \"Implement global carbon capture system\", \"domain\": \"Environmental Engineering\", \"icon\": \"fas fa-globe-americas\"}"
            "]"
        )
        # Modified System instruction:
        system_instruction = (
            "You are an AI that generates three innovative and *distinct* goal outcomes based on user input. "
            "For EACH goal, you MUST provide BOTH a short 'title' (1-5 words) AND a more detailed 'goal' description (1-3 sentences). " # KEY CHANGE
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

        try:
            response_text = await generate_chat_response(messages, role='Goal Generation', task='Generate Goal Options', temperature=temp, system_instruction=system_instruction)
            response_text = re.sub(r'^```json\s*|```s*$', '', response_text, flags=re.MULTILINE).strip()
            try:
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

def generate_ssol_id(USE_DATABASE, selected_goal):
    from models import SSOL, get_engine_and_session  # Import get_engine_and_session
    from store import ssol_store
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