# utilities.py
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
from app import USE_DATABASE, db
from openai import AzureOpenAI
from ce_nodes import get_valid_node_types
from models import COS, CE, SSOL, COS_CE_Link
from store import ssol_store, cos_store, ce_store
from flask import current_app, flash, render_template
import requests
from ai_service import send_request_to_openai #Import function from ai_service.py
import openai #Import openai library


# Load environment variables
load_dotenv()
azure_oai_key = os.getenv("AZURE_OPENAI_API_KEY")
azure_oai_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
azure_oai_deployment_name = os.getenv("AZURE_DEPLOYMENT_NAME")
azure_oai_model = os.getenv("AZURE_MODEL_NAME")
stability_api_key = os.getenv("STABILITY_KEY")
azure_dalle_api_version = os.getenv("AZURE_DALLE_API_VERSION", "2024-04-01-preview") # Added DALL-E API Version
  

class Logger:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

    @staticmethod
    def log_message(message, level='info'):
        if level == 'info':
            formatted_message = f"{Logger.OKCYAN}{message}{Logger.ENDC}"
        elif level == 'warning':
            formatted_message = f"{Logger.WARNING}{message}{Logger.ENDC}"
        elif level == 'error':
            formatted_message = f"{Logger.FAIL}{message}{Logger.ENDC}"
        elif level == 'debug':
            formatted_message = f"{Logger.OKBLUE}{message}{Logger.ENDC}"
        else:
            formatted_message = message

        print(formatted_message)


def generate_chat_response(messages, role, task, temperature=0.75, retries=3, backoff_factor=2):
    last_exception = None
    for retry_attempt in range(retries):
        try:
            # Ensure the system message indicates JSON response format
            system_message = {
                "role": "system",
                "content": "You are a helpful assistant. Please respond with information in JSON format."
            }
            messages_with_json = [system_message] + messages

            # Log the constructed messages for debugging
            current_app.logger.debug(f"Constructed Messages for generate_chat_response: {json.dumps(messages_with_json, indent=2)}")

            current_app.logger.debug(f"Sending request to Azure OpenAI: {messages_with_json}")

            # Send request to Azure OpenAI model using JSON mode
            response = openai.chat.completions.create(
                model=azure_oai_model,
                response_format={"type": "json_object"},
                messages=messages_with_json,
                temperature=temperature,
                max_tokens=1800
            )
            response_content = response.choices[0].message.content
            current_app.logger.debug(f"Received response from AI: {response_content}")
            return response_content
        except Exception as e:
            last_exception = e
            if retry_attempt < retries - 1:
                sleep_time = backoff_factor ** (retry_attempt + 1)
                current_app.logger.error(f"Error in generate_chat_response: {e}. Retrying in {sleep_time} seconds.")
                time.sleep(sleep_time)
            else:
                current_app.logger.error(f"Error in generate_chat_response: {e}. All retries exhausted.")

    # Raise the last exception if all retries fail
    raise last_exception

def parse_ai_response_and_generate_html(response_json):
    structured_solution = {}
    expected_phases = ["Discovery", "Engagement", "Action", "Completion", "Legacy"]

    for phase in expected_phases:
        structured_solution[phase] = []
        for cos in response_json.get(phase, []):
            cos_id = str(uuid.uuid4())
            cos_html = cos.get('content', '') #Ensure content is a string
            ces = []
             
            if not cos_html:
                 current_app.logger.warning(f"COS HTML is empty for COS ID: {cos_id} phase: {phase}")
                 structured_solution[phase].append({
                    'id': cos_id,
                    'content': '',
                    'status': 'Proposed',
                    'ces': []
                })
                 continue # Skip the rest of the loop because the content is empty
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

                # Store the CEs
                if USE_DATABASE:
                    ce_instance = CE(id=ce_uuid, content=ce_tag.string, node_type=ce_tag['type'])
                    db.session.add(ce_instance)
                else:
                    ce_store[ce_uuid] = ce_data

            if USE_DATABASE:
                db.session.commit()

            structured_solution[phase].append({
                'id': cos_id,
                'content': str(soup),
                'status': 'Proposed',
                'ces': ces
            })

    return structured_solution

def generate_outcome_data(request, method, selected_goal=None, domain=None, domain_icon=None):
    # Initialize outcome_data with default keys and values
    outcome_data = {
        'user_input': '',
        'selected_goal': selected_goal,
        'domain_icon': domain_icon,
        'domain': domain,
        'ssol_id': None,
        'ssol_summary': "An error occurred while processing the summary data.",
        'phases': {},
        'generated_image_path': 'images/sspec_default.png'
    }

    user_input = request.form.get('user_text', '').strip() if method == 'POST' else request.args.get('user_text', '').strip()
    outcome_data['user_input'] = user_input

    # Generate or retrieve an SSOL instance and get the id
    if USE_DATABASE:
        ssol_instance = SSOL.query.filter_by(title=selected_goal).first()
        if not ssol_instance:
            ssol_instance = SSOL(title=selected_goal, description='')
            db.session.add(ssol_instance)
            db.session.commit()
        ssol_id = ssol_instance.id
    else:
        ssol_instance = next((ssol for ssol in ssol_store.values() if ssol['title'] == selected_goal), None)
        if not ssol_instance:
            ssol_id = str(uuid4())
            ssol_instance = {'id': ssol_id, 'title': selected_goal, 'description': ''}
            ssol_store[ssol_id] = ssol_instance
        ssol_id = ssol_instance['id']

    outcome_data['ssol_id'] = ssol_id

    # Generate the high-level summary
    summary_messages = [
        {
            "role": "system",
            "content": (
                "Assume it is possible to fulfill any outcome, generate a high-level summary "
                "(key name: summary) of everything required for the goal working backwards from fulfilled by some point in the future, "
                "includle any existing or potential legal, scientific, logistic or other barriers which needed to be addressed for completion."
            )
        },
        {
            "role": "user",
            "content": (
                f"Generate a high-level, elegantly-formatted summary for the goal: '{selected_goal}'. "
                "Please format the summary using Bootstrap-safe HTML, including tags such as <br> for line breaks "
                "and ordered lists."
            )
        }
    ]

    try:
        summary_response = generate_chat_response(summary_messages, role='Outcome Generation', task='Generate High-Level Summary')
        summary_data = json.loads(summary_response)
        outcome_data['ssol_summary'] = summary_data.get('summary', "") or ""
    except Exception as e:
        current_app.logger.error(f"Error in generate_outcome_data (summary): {e}", exc_info=True)

    # Generate the structured solution
    structured_solution_messages = [
        {
            "role": "system",
            "content": "You are a helpful assistant. Generate detailed Conditions of Satisfaction (COS) and multiple Conditional Elements (CE) for each COS of a project, including specific attributes for each CE."
        },
        {
            "role": "user",
            "content": (
                f"Generate a concise Structured Solution for the project '{selected_goal}'. "
                "For each phase (Discovery, Engagement, Action, Completion, Legacy), provide 2 to 5 targeted Conditions of Satisfaction (COS). "
                "For each COS, identify and list 2 to 4 specific and succinct Conditional Elements (CE) with unique IDs. "
                "Focus on essential contributors such as resources, legislation, research, stakeholders, and timelines. "
                "Select the most specific type from CE_nodes.py for each CE, denoted with <ce> tags. "
                "Account for interdependencies and their impacts across project phases. "
                "Format your response as a JSON object with each phase as a key and an array of COS objects as values. "
                "Each COS object should include brief COS text, a unique ID, a status (Proposed), and an array of CEs. "
                "Each CE should be a JSON object with 'id', 'content' (2-4 sentences), 'status', 'type', and additional details as needed. "

                 "Here is an example for the Discovery phase: "
                "'Discovery': ["
                "    {"
                "      'id': 'COS-001',"
                "      'content': '<ce id=\"CE-001\" type=\"Research\">Market research</ce> to assess <ce id=\"CE-002\" type=\"Demand\">consumer interest</ce> in a <ce id=\"CE-003\" type=\"Product\">new product</ce>.' ,"
                "      'status': 'Proposed',"
                "      'ces': ["
                "        {'id': 'CE-001', 'content': 'Conduct market analysis', 'status': 'Proposed', 'type': 'Research'},"
                "        {'id': 'CE-002', 'content': 'Evaluate consumer demand', 'status': 'Proposed', 'type': 'Demand'},"
                "        {'id': 'CE-003', 'content': 'Define product concept', 'status': 'Proposed', 'type': 'Product'}"
                "      ]"
                "    }"
                "]"
            )
        }
    ]

    try:
        structured_solution_response = generate_chat_response(structured_solution_messages, role='Structured Solution Generation', task='Generate Structured Solution')
        structured_solution_json = json.loads(structured_solution_response)

        # Ensure the structured_solution_json is a dictionary before processing
        if isinstance(structured_solution_json, dict):
            outcome_data['phases'] = parse_ai_response_and_generate_html(structured_solution_json)
        else:
            logging.error("Expected a dictionary for the structured solution JSON response.")
            outcome_data['phases'] = {}
    except json.JSONDecodeError as e:
        logging.error(f"JSON decoding error: {e}")
        outcome_data['phases'] = {}
    except Exception as e:
        logging.error(f"Error in generate_outcome_data (structured solution): {e}", exc_info=True)
        outcome_data['phases'] = {}
    if not outcome_data.get('phases'):
        outcome_data['phases'] = {}

    # Generate an image using Azure OpenAI DALL-E API
    try:
      image_prompt = f"A colorful, visually stunning photograph of a retro-futuristic tableau depicting '{selected_goal}' as a fulfilled goal, diverse,It's a Small World, 1962, photo-realistic, isometric, tiltshift "
      web_image_path = generate_dalle_image(image_prompt)
      outcome_data['generated_image_path'] = web_image_path
    except Exception as e:
        current_app.logger.error(f"Error generating image: {e}", exc_info=True)
        outcome_data['generated_image_path'] = 'images/sspec_default.png'
    # Return the outcome_data for rendering in the template
    return outcome_data

def generate_dalle_image(prompt):
    """Generates an image using Azure OpenAI's DALL-E API."""
    try:
        # Initialize Azure OpenAI client
        client = AzureOpenAI(
            api_version=azure_dalle_api_version,
            azure_endpoint=azure_oai_endpoint,
            api_key=azure_oai_key,
        )

        result = client.images.generate(
            model="Dalle3",  # the name of your DALL-E 3 deployment
            prompt=prompt,
            n=1,
            size="1024x1024",
            quality="standard",
            style="vivid"
        )

        image_url = json.loads(result.model_dump_json())['data'][0]['url']
        current_app.logger.info(f"Generated image with DALL-E: {image_url}")

        # Generate a unique filename for the image
        unique_filename = f"generated_image_{uuid.uuid4().hex}.png"
        # Ensure the 'static/images' directory exists within your Flask app structure
        static_folder = current_app.static_folder
        image_folder = os.path.join(static_folder, 'images')
        os.makedirs(image_folder, exist_ok=True) # Create the folder if it doesn't exist

        image_file_path = os.path.join(image_folder, unique_filename)  # Full path for saving the file
        image_data = requests.get(image_url, stream=True)

        if image_data.status_code == 200:
              with open(image_file_path, 'wb') as image_file:
                for chunk in image_data.iter_content(1024):
                    image_file.write(chunk)
              # Convert the path to a URL-friendly format for the web
              web_path = os.path.join('images', unique_filename).replace("\\", "/")
              return web_path
        else:
            current_app.logger.error(f"DALL-E Image download failed with status code {image_data.status_code}.")
            return 'images/sspec_default.png'  # Return default image if there was a problem downloading
    except Exception as e:
        current_app.logger.error(f"Error generating image with DALL-E: {e}", exc_info=True)
        return 'images/sspec_default.png'  # Fallback to default image
  
def analyze_user_input(text):
    messages = [
        {"role": "system", "content": "You are an AI that analyzes user inputs and extracts keywords."},
        {"role": "user", "content": text},
    ]
  
    response_text = generate_chat_response(messages, role='Keyword Extraction', task='Extract Keywords', temperature=0.75)
    keywords = response_text.split(', ')
    print(f"Keywords: {keywords}")
    return keywords

def generate_sentiment_analysis(text, temperature=0.7):
    messages = [
        {"role": "system", "content": "You are an AI trained to analyze sentiment and return POSITIVE, NEGATIVE, or NEUTRAL"},
        {"role": "user", "content": f"What sentiment is expressed in the following text: '{text}'?"},
    ]
  
    # Use the generate_chat_response function
    response_text = generate_chat_response(messages, role='Sentiment Analysis', task='Analyze Sentiment', temperature=temperature)
  
    # Parse the response to extract the sentiment
    sentiment = "NEUTRAL"  # Default to NEUTRAL if parsing fails or no clear sentiment is found
    if "positive" in response_text.lower():
        sentiment = "POSITIVE"
    elif "negative" in response_text.lower():
        sentiment = "NEGATIVE"
    elif "neutral" in response_text.lower():
        sentiment = "NEUTRAL"
  
    return sentiment
  
def generate_goal(user_input):
    goal_options = []
    temperatures = [0.6, 0.8, 1.0]
  
    while len(goal_options) < 3:
        for i, temp in enumerate(temperatures):
            messages = [
                {"role": "system", "content": "You are an AI that generates innovative and unique goal outcomes or intentions based on the user's input. Structure your response in JSON format with a 'goal' key."},
                {"role": "user", "content": user_input},
            ]
            try:
                response = send_request_to_openai(messages, temperature=temp)
                #Check if the response is a string
                if not isinstance(response, str):
                    raise ValueError("Response is not a string")

                goal_option_data = json.loads(response)
                goal_option = goal_option_data['goal']  # Expecting the response to have a 'goal' key
  
                goal_compliant, non_compliance_reason = is_goal_compliant(goal_option)
  
                if goal_compliant and goal_option not in [g['title'] for g in goal_options]:
                    goal_options.append({'title': goal_option, 'compliant': goal_compliant, 'reason': non_compliance_reason})
                elif not goal_compliant:
                    goal_options.append({'title': goal_option, 'compliant': False, 'reason': non_compliance_reason})
  
                if len(goal_options) == 3:
                    break
  
            except json.JSONDecodeError as e:
                print(f"Error parsing JSON in generate_goal (Variation {i + 1}): {e}")
                raise e
            except Exception as e:
                print(f"Error in generate_goal (Variation {i + 1}): {e}")
                raise e

    if len(goal_options) < 3:
        raise ValueError("Failed to generate unique goals. Please try again.")

    return goal_options

def is_goal_compliant(selected_goal):
    sentiment_counts = {'POSITIVE': 0, 'NEGATIVE': 0, 'NEUTRAL': 0}
  
    for _ in range(5):
        try:
            sentiment_label = generate_sentiment_analysis(selected_goal)
            # Ensure the label is uppercase to match dictionary keys
            sentiment_counts[sentiment_label.upper()] += 1
        except ValueError as e:
            print(f"Error in sentiment analysis: {e}")
            continue
  
    # Determine compliance based on the sentiment counts
    if sentiment_counts['POSITIVE'] >= 3:
        return True, ''
    elif sentiment_counts['NEGATIVE'] >= 3:
        return False, 'The goal does not comply with the safety protocol.'
    else:
        return True, 'The goal has a neutral sentiment and is allowed.'
  
def get_domain_icon_and_name(goal_domain):
    messages = [
        {"role": "system", "content": "You are an AI that suggests a realm and FontAwesome 6 Solid (fas) class icon based on the goal's topic. Output ONLY the JSON with the 'realm' and 'iconClass' keys. "},
        {"role": "user", "content": f"Based on the following text '{goal_domain}', provide ONLY the JSON object with a specific and succinct *realm* (category or area of focus) that this text falls under, as well as its corresponding FontAwesome 6 Solid class icon. The keys of the JSON should be 'realm' and 'iconClass'."}
    ]
    response_content = generate_chat_response(messages, role='Domain and Icon', task='Fetch Domain and free FontAwesome 6 Icon', temperature=0.37)

    try:
        # Log the raw response content for debugging
        Logger.log_message(f"Raw response content: {response_content}", 'debug')

        # Parse the JSON string into a dictionary
        response_data = json.loads(response_content)
        # Make sure to match the keys exactly with the response content
        domain = response_data.get("realm") # Changed from domain to realm
        icon_class = response_data.get("iconClass")  # Changed from "icon" to "iconClass"

        if not domain or not icon_class:
            # Log a warning if expected keys are missing
            Logger.log_message("Missing 'realm' or 'iconClass' in AI response.", 'warning')
            raise ValueError("Failed to generate domain and icon. Please try again.")

        return icon_class, domain

    except json.JSONDecodeError as e:
        # Log the JSON parsing error
        Logger.log_message(f"JSON parsing error: {e}", 'error')
        raise ValueError("Failed to parse JSON response. Please try again.")

    except Exception as e:
        # Log any other exceptions
        Logger.log_message(f"Unexpected error: {e}", 'error')
        raise

def get_cos_by_guid(ssol, cos_guid):
    for phase in ssol['phases'].values():
        for cos in phase:
            if cos['id'] == cos_guid:
                return cos
    return None

def update_cos_content_by_guid(ssol, cos_guid, new_content):
    cos = get_cos_by_guid(ssol, cos_guid)
    if cos:
        cos['content'] = new_content
        return True
    return False

def sanitize_filename(filename):
    # Sanitize the filename by removing or replacing invalid characters.
    filename = re.sub(r'[<>:"/\\|?*\x00-\x1F]', '', filename)  # Remove invalid characters
    filename = re.sub(r'[\s]+', '_', filename)  # Replace spaces with underscores
    return filename[:255]  # Truncate long filenames