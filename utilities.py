import io  
import os  
import re  
import html
import json
import time
import uuid
import logging
from uuid import uuid4
import warnings  
from PIL import Image
from bs4 import BeautifulSoup  
from dotenv import load_dotenv
from openai import AzureOpenAI
from app import USE_DATABASE, db  
from models import COS, CE, SSOL, COS_CE_Link  
from store import ssol_store, cos_store, ce_store  
from stability_sdk import client as stability_client  
from flask import current_app, flash, render_template
import stability_sdk.interfaces.gooseai.generation.generation_pb2 as generation  

# Load environment variables    
load_dotenv()  
azure_oai_key = os.getenv("AZURE_OPENAI_API_KEY")  
azure_oai_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")  
azure_oai_deployment_name = os.getenv("AZURE_DEPLOYMENT_NAME")  
azure_oai_model = os.getenv("AZURE_MODEL_NAME")  
stability_api_key = os.getenv("STABILITY_KEY")
  
# Initialize the AzureOpenAI client as a global variable  
azure_openai_client = AzureOpenAI(  
    azure_endpoint=azure_oai_endpoint,  
    api_key=azure_oai_key,  
    api_version="2024-03-01-preview"  
)

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
            
            # Send request to Azure OpenAI model using JSON mode
            response = azure_openai_client.chat.completions.create(
                model=azure_oai_model,
                response_format={"type": "json_object"},
                messages=messages_with_json,
                temperature=temperature,
                max_tokens=1800
            )
            response_content = response.choices[0].message.content
            Logger.log_message(f"SSPEC Response ({role} - {task}): {response_content}", 'debug')
            return response_content
        except Exception as e:
            last_exception = e
            if retry_attempt < retries - 1:
                sleep_time = backoff_factor ** (retry_attempt + 1)
                Logger.log_message(f"Error in generate_chat_response: {e}. Retrying in {sleep_time} seconds.", 'error')
                time.sleep(sleep_time)
            else:
                Logger.log_message(f"Error in generate_chat_response: {e}. All retries exhausted.", 'error')
    
    # Raise the last exception if all retries fail
    raise last_exception

def parse_ai_response_and_generate_html(response_json):    
    structured_solution = {}  
    expected_phases = ["Discovery", "Engagement", "Action", "Completion", "Legacy"]    
  
    for phase in expected_phases:    
        structured_solution[phase] = []  
        for cos in response_json.get(phase, []):    
            cos_id = str(uuid.uuid4())    
            cos_html = cos['content']  
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
        outcome_data['ssol_summary'] = summary_data.get('summary', "Summary not available.")  
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
  )}
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
  
    # Generate an image using Stability AI          
    try:  
        image_prompt = f"A colorful, visually stunning photograph of a retro-futuristic tableau depicting '{selected_goal}' as a fulfilled goal, Mary Blair, It's a Small World, 1962, photo-realistic, isometric, tiltshift "  
        web_image_path = generate_image(image_prompt, selected_goal)  
        outcome_data['generated_image_path'] = web_image_path  
    except Exception as e:  
        current_app.logger.error(f"Error generating image: {e}", exc_info=True)  
        outcome_data['generated_image_path'] = 'images/sspec_default.png'  
  
    # Return the outcome_data for rendering in the template  
    return outcome_data  


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
                response = generate_chat_response(messages, role='Goal Generation', task=f'Generate Goal (Variation {i + 1})', temperature=temp).strip()
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
        {"role": "system", "content": "You are an AI that suggests a domain and FontAwesome 6 Solid (fas) class icon based on the goal domain. Output only the domain and icon class in JSON format."},  
        {"role": "user", "content": f"What is the best domain and corresponding FontAwesome icon class for the goal related to '{goal_domain}'?"}  
    ]  
    response_content = generate_chat_response(messages, role='Domain and Icon', task='Fetch Domain and free FontAwesome 6 Icon', temperature=0.37)  
  
    try:  
        # Log the raw response content for debugging  
        Logger.log_message(f"Raw response content: {response_content}", 'debug')  
          
        # Parse the JSON string into a dictionary  
        response_data = json.loads(response_content)  
        # Make sure to match the keys exactly with the response content  
        domain = response_data.get("domain")  
        icon_class = response_data.get("iconClass")  # Changed from "icon" to "iconClass"  
          
        if not domain or not icon_class:  
            # Log a warning if expected keys are missing  
            Logger.log_message("Missing 'domain' or 'iconClass' in AI response.", 'warning')  
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
  
def generate_image(prompt, goal_title, seed=None, width=512, height=512):      
    if not azure_oai_key or not stability_api_key:      
        raise ValueError("API keys are not provided for Azure OpenAI or Stability SDK.")     
    
    stability_api = stability_client.StabilityInference(    
        key=stability_api_key,    
        verbose=True,    
        engine="stable-diffusion-xl-beta-v2-2-2",    
    )    
  
    # Generate a unique filename for the image  
    unique_filename = f"generated_image_{uuid.uuid4().hex}.png"  
      
    # Ensure the 'static/images' directory exists within your Flask app structure  
    static_folder = current_app.static_folder  
    image_folder = os.path.join(static_folder, 'images')  
    os.makedirs(image_folder, exist_ok=True)  # Create the folder if it does not exist  
    image_file_path = os.path.join(image_folder, unique_filename)  # Full path for saving the file  
  
    try:  
        answers = stability_api.generate(  
            prompt=prompt,  
            seed=seed,  
            steps=30,  
            cfg_scale=8.0,  
            width=width,  
            height=height,  
            samples=1,  
            sampler=generation.SAMPLER_K_DPMPP_2M,  
        )  
  
        for resp in answers:  
            for artifact in resp.artifacts:  
                if artifact.finish_reason == generation.FILTER:  
                    warnings.warn("Your request activated the API's safety filters and could not be processed. Please modify the prompt and try again.")  
                if artifact.type == generation.ARTIFACT_IMAGE:  
                    img = Image.open(io.BytesIO(artifact.binary))  
                    img.save(image_file_path)  # Save the image using the correct directory and filename  
                    # Convert the path to URL-friendly format  
                    web_path = os.path.join('images', unique_filename).replace("\\", "/")  
                    return web_path  
    except Exception as e:  
        print(f"Error in generate_image: {e}")  
  
    # If an error occurs or the image is not generated, use a placeholder image  
    placeholder_image_path = os.path.join('images', 'sspec_default.png').replace("\\", "/")  
    return placeholder_image_path
  
def generate_structured_solution(selected_goal):      
    structured_solution = {}    
    system_message = {      
        "role": "system",      
        "content": (      
            "You are an AI that generates a structured solution for a project. "    
            "For each phase of the project, generate Conditions of Satisfaction (COS) with embedded Conditional Elements (CEs). "    
            "Use <ce> tags to denote CEs within the COS text and provide each CE with a unique identifier and type. "    
            "Return a JSON object with phases as keys and lists of COS objects as values. "    
            "Each COS object should include the COS text with embedded CEs, a unique ID, a status, and an array of CEs. "    
            "Each CE should be represented within the COS text and also listed as a JSON object with 'id', 'content', and 'type' keys. "    
            "The keys for COS text, status, and CEs should be 'cos_text', 'cos_status', and 'cos_ces' respectively."    
        )      
    }      
      
    user_message = {        
        "role": "user",        
        "content": (      
            f"Generate a Structured Solution for the project '{selected_goal}'. "    
            "For each phase (Discovery, Engagement, Action, Completion, Legacy), provide 2 to 5 specific and succinct COS. "    
            "Within each COS text, identify and label relevant keywords as CEs using <ce> tags. "    
            "Assign each CE a unique ID and a type that best describes its role or category in the context of the COS. "    
            "Provide a brief explanation for each COS's importance and how it contributes to the overall goal. "    
            "Format your response as a JSON object with each phase as a key and an array of COS objects. "    
            "Use the keys 'cos_text', 'cos_status', and 'cos_ces' for COS text, status, and CEs respectively."    
        )        
    }

    messages = [system_message, user_message]      
    try:      
        response_text = generate_chat_response(      
            messages,       
            role='Structured Solution Generation',       
            task='Generate Structured Solution',       
            temperature=0.75,       
            retries=3,       
            backoff_factor=2      
        )      

        # Check if the response is complete and valid JSON before parsing  
        if response_text and response_text.strip().endswith('}'):  
            response_json = json.loads(response_text)      
        else:  
            raise ValueError("Incomplete JSON response received from AI.")  

        # Iterate over the phases and extract the COS and CEs directly from the list  
        structured_solution['phases'] = {  
    phase: [  
        {  
            'id': cos.get('id', str(uuid.uuid4())),  
            'status': 'Proposed',  
            'cos_text': cos['cos_text'],  # Corrected key  
            'ces': cos.get('CEs', [])  
        }  
        for cos in response_json.get(phase, [])  
    ]  
    for phase in ['Discovery', 'Engagement', 'Action', 'Completion', 'Legacy']  
}  

        
        return structured_solution  # Return the correctly structured solution    

    except json.JSONDecodeError as e:      
        current_app.logger.error(f"Error parsing JSON response: {e}", exc_info=True)      
        raise ValueError("Failed to parse JSON response.")      
    except ValueError as e:  
        current_app.logger.error(f"Error in generating structured solution: {e}", exc_info=True)      
        raise  
    except Exception as e:      
        current_app.logger.error(f"Unexpected error in generating structured solution: {e}", exc_info=True)      
        raise ValueError("Failed to generate structured solution.")

    