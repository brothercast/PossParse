import io  
import os  
import re  
import json  
import time
import uuid
import openai
import warnings  
from PIL import Image  
from flask import current_app, flash 
from dotenv import load_dotenv
from openai import AzureOpenAI
  
from stability_sdk import client as stability_client  
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
    api_version="2023-07-01-preview"  
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
                max_tokens=350
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

def generate_outcome_data(request, method, selected_goal=None, domain=None, domain_icon=None, ssol_id=None):    
    outcome_data = {}    
    
    if method == 'POST':    
        user_input = request.form['user_text'].strip()    
    else:    
        user_input = request.args.get('user_text', '').strip()    
    
    outcome_data['user_input'] = user_input    
    outcome_data['selected_goal'] = selected_goal    
    outcome_data['domain_icon'], outcome_data['domain'] = domain_icon, domain 
  
    # Generate a high-level summary and format it using HTML  
    messages = [  
        {"role": "system", "content": "Assuming it is possible to fulfill any outcome and working backwards, generate a high-level summary of everything required for the goal as fulfilled by some point in the future. Include existing legal, scientific, logistic, or other barriers that need to be addressed for completion."},  
        {"role": "user", "content": f"Generate a high-level summary for the goal: '{selected_goal}'. Please format the summary using HTML tags, such as <br> for line breaks."}  
    ]  
    response_content = generate_chat_response(messages, role='Outcome Generation', task='Generate High-Level Summary')  
  
    try:    
        response_data = json.loads(response_content)    
        outcome_data['ssol_summary'] = response_data['summary']    
    except (json.JSONDecodeError, KeyError) as e:    
        current_app.logger.error(f"Error in generate_outcome_data: {e}")  
        outcome_data['ssol_summary'] = "<p>An error occurred while processing the summary data.</p>"    
    
    try:  
        structured_solution = generate_structured_solution(selected_goal, ssol_id)  
          
        # Validate the structured solution contains the required phases  
        if not all(phase in structured_solution for phase in ['discovery', 'engagement', 'action', 'completion', 'legacy']):  
            raise ValueError("Structured solution is missing required phases.")  
          
        outcome_data['structured_solution'] = structured_solution  
    except (ValueError, json.JSONDecodeError) as e:  
        current_app.logger.error(f"Error in generate_structured_solution: {e}")  
        outcome_data['structured_solution'] = {'error': "An error occurred while generating the structured solution."}  
      
    # Generate the image  
    try:  
        image_prompt = f"A visually stunning futuristic isometric illustration depicting '{selected_goal}' as a fulfilled goal by Mary Blair, 1959"  
        generated_image = generate_image(image_prompt, selected_goal)    
        if generated_image:    
            unique_filename = f"generated_image_{uuid.uuid4().hex}.png"    
            image_path = os.path.join('static', 'images', unique_filename).replace('\\', '/')    
            generated_image.save(os.path.join(current_app.root_path, image_path.replace('/', os.sep)))    
            outcome_data['generated_image_path'] = image_path  
        else:    
            raise ValueError("Failed to generate image.")  
    except Exception as e:  
        current_app.logger.error(f"Error in generate_image: {e}")  
        outcome_data['generated_image_path'] = 'static/images/sspec_default.png'  
    
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
  
# Load environment variables
load_dotenv()
stability_api_key = os.getenv("STABILITY_KEY")

def generate_image(prompt, goal_title, seed=None, width=512, height=512):    
    if not azure_oai_key or not stability_api_key:    
        raise ValueError("API keys are not provided for Azure OpenAI or Stability SDK.")   
    
    stability_api = stability_client.StabilityInference(  
        key=stability_api_key,  
        verbose=True,  
        #engine="stable-diffusion-xl-beta-v2-2-2",
        engine="stable-diffusion-xl-1024-v1-0",  
    )  

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
                    return img  # Return the image object
    except Exception as e:
        print(f"Error in generate_image: {e}")

    # If an error occurs or the image is not generated, use the placeholder image
    placeholder_image_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "images", "sspec_default.png")
    return Image.open(placeholder_image_path)


def generate_structured_solution(selected_goal, ssol_id):  
    messages = [  
        {"role": "system", "content": "You are an ethics-bound AI that speculates specific conditions of satisfaction needed to complete a given goal across these phases: Discovery, Engagement, Action, Completion, and Legacy, based on first principles. For each phase, please speculate a set of specific, measurable Conditions of Satisfaction (COS) in the past tense, which when met, ensure or indicate project completion. Ensure that the COS are specific to the goal and follow a logical progression through the phases. Provide the response in JSON format, with each phase as a key and its COS as an array of strings. For example: {'discovery': ['COS 1', 'COS 2'], 'engagement': ['COS 1', 'COS 2'], ...}."},  
        {"role": "user", "content": f"Generate a Structured Solution which fulfills the following goal: '{selected_goal}'. Provide between 2 to 5 specific, measurable Conditions of Satisfaction (COS) for each phase: Discovery, Engagement, Action, Completion, and Legacy, in JSON format."}  
    ]  
  
    response_text = generate_chat_response(messages, role='Structured Solution Generation', task='Generate Structured Solution')  
    cleaned_response_text = response_text.replace('\n', ' ').replace('\r', '').strip()  
    json_match = re.search(r'\{.*\}', cleaned_response_text)  
  
    if not json_match:  
        raise ValueError("Failed to extract JSON data from the response.")  
  
    json_data = json_match.group(0)  
    try:  
        response_json = json.loads(json_data)  
    except (json.JSONDecodeError, ValueError) as e:  
        print(f"Error in parsing JSON data: {e}")  
        # If JSON parsing fails, you might want to handle it in a specific way, such as re-prompting the user or providing a default response.  
        raise  
  
    structured_solution = {  
        'goal': selected_goal,  
        'phases': {}  
    }  
  
    # Build the structured solution using the provided SSOL ID  
    for phase_key, cos_list in response_json.items():  
        structured_solution['phases'][phase_key] = [  
            {  
                'id': str(uuid.uuid4()),  # This is a unique identifier for the COS itself  
                'content': cos,  
                'status': 'Proposed',  
                'ssol_id': ssol_id  # Associate the COS with the SSOL instance using the provided ssol_id  
            }  
            for cos in cos_list  
        ]  
  
    return structured_solution  
