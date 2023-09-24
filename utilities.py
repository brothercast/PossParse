import io
import os
import re
import json
import time
import uuid
import openai
import warnings
from PIL import Image
from stability_sdk import client
from dotenv import load_dotenv
from openai.error import RateLimitError
import stability_sdk.interfaces.gooseai.generation.generation_pb2 as generation

load_dotenv()
openai.api_key = os.environ["OPENAI_API_KEY"]
STABILITY_HOST = os.environ["STABILITY_HOST"]
STABILITY_KEY = os.environ["STABILITY_KEY"]

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

def generate_chat_response(messages, role, task, temperature=0.75, retries=3, backoff_factor=2):
    for retry_attempt in range(retries):
        try:
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=messages,
                max_tokens=300,
                n=1,
                temperature=temperature,
            )
            response_text = response.choices[0].message.content
            print(f"SSPEC Response ({role} - {task}): {response_text}")
            return response_text.strip()
        except RateLimitError as e:
            if retry_attempt < retries - 1:
                sleep_time = backoff_factor ** (retry_attempt + 1)
                print(f"RateLimitError in generate_chat_response: {e}. Retrying in {sleep_time} seconds.")
                time.sleep(sleep_time)
            else:
                print(f"RateLimitError in generate_chat_response: {e}. All retries exhausted.")
                return "SERVER_TIMEOUT"
        except Exception as e:
            print(f"Error in generate_chat_response: {e}")
            raise e

def generate_outcome_data(user_input, selected_goal=None, domain=None, domain_icon=None):
    outcome_data = {}
    user_input = user_input.strip()
    
    try:
        response = generate_chat_response([{"role": "user", "content": user_input}], role='Outcome Generation', task='Generate Outcome Data (Retry)', temperature=0.75)

        if "SERVER_TIMEOUT" in response:
            print("Server timeout occurred. Generating missing data using partial response.")
            response_parts = response.split("POSTCODE")
            partial_response = response_parts[0]

            goal_match = re.search(r'"goal": "(.*?)"', partial_response)
            ssol_summary_match = re.search(r'"ssol_summary": "(.*?)"', partial_response)
            structured_solution_match = re.search(r'"structured_solution": (\{.*?\})', partial_response)

            goal = goal_match.group(1) if goal_match else None
            ssol_summary = ssol_summary_match.group(1) if ssol_summary_match else None
            structured_solution = json.loads(structured_solution_match.group(1)) if structured_solution_match else None

            outcome_data['goal'] = goal
            outcome_data['ssol_summary'] = ssol_summary
            outcome_data['structured_solution'] = structured_solution
            return outcome_data

        structured_solution = generate_structured_solution(selected_goal)
        outcome_data['structured_solution'] = structured_solution

        return outcome_data

    except Exception as e:
        print(f"Error in generate_outcome_data: {e}")
        raise e
    
def get_completion(prompt, model="gpt-3.5-turbo", temperature=0.7):
    messages = [{"role": "user", "content": prompt}]
    response = openai.ChatCompletion.create(
        model=model,
        messages=messages,
        temperature=temperature,
    )
    return response.choices[0].message["content"].strip()

def analyze_user_input(text):
    messages = [
        {"role": "system", "content": "You are an AI that analyzes user inputs and extracts keywords."},
        {"role": "user", "content": text},
    ]

    response_text = generate_chat_response(messages, role='Keyword Extraction', task='Extract Keywords', temperature=0.75)
    keywords = response_text.split(', ')
    print(f"Keywords: {keywords}")
    return keywords

def generate_sentiment_analysis(text, model="gpt-3.5-turbo"):
    prompt = f"Sentiment analysis: Which sentiment is the following text: POSITIVE NEGATIVE or NEUTRAL? '{text}'"
    sentiment = get_completion(prompt, model=model, temperature=0.7)
    
    sentiment_label = re.search(r'(POSITIVE|NEGATIVE|NEUTRAL)', sentiment)
    if sentiment_label:
        return sentiment_label.group(0).upper()
    else:
        print(f"Unexpected sentiment response: {sentiment}")
        return 'NEUTRAL'

def generate_goal(user_input):
    goal_options = []
    temperatures = [0.6, 0.8, 1.0]

    while len(goal_options) < 3:
        for i, temp in enumerate(temperatures):
            messages = [
                {"role": "system", "content": "You are an AI that generates innovative and unique goal outcomes or intentions, no more than 50-70 characters long, based on the user's input."},
                {"role": "user", "content": user_input},
            ]

            try:
                goal_option = generate_chat_response(messages, role='Goal Generation', task=f'Generate Goal (Variation {i + 1})', temperature=temp).strip()
            except RateLimitError as e:
                print(f"RateLimitError in generate_goal (Variation {i + 1}): {e}")
                continue
            except Exception as e:
                print(f"Error in generate_goal (Variation {i + 1}): {e}")
                raise e

            goal_compliant, non_compliance_reason = is_goal_compliant(goal_option)
            
            # Check if the generated goal is "NOT ALLOWED"
            if goal_option == "NOT ALLOWED":
                goal_options.append({'title': goal_option, 'compliant': False, 'reason': non_compliance_reason})
                return goal_options
            
            if goal_compliant and goal_option not in [g['title'] for g in goal_options]:
                goal_options.append({'title': goal_option, 'compliant': goal_compliant, 'reason': non_compliance_reason})
            elif not goal_compliant:
                goal_options.append({'title': goal_option, 'compliant': False, 'reason': non_compliance_reason})

            if len(goal_options) == 3:
                break

    if len(goal_options) < 3:
        raise ValueError("Failed to generate unique goals. Please try again.")

    return goal_options

def is_goal_compliant(selected_goal):
    sentiment_counts = {'POSITIVE': 0, 'NEGATIVE': 0, 'NEUTRAL': 0}

    for _ in range(5):
        try:
            sentiment_label = generate_sentiment_analysis(selected_goal)
            sentiment_counts[sentiment_label] += 1
        except ValueError as e:
            print(f"Error in sentiment analysis: {e}")
            continue

    return (sentiment_counts['POSITIVE'] >= 3, '') if sentiment_counts['POSITIVE'] >= 3 else \
           (False, 'The goal does not comply with the safety protocol.') if sentiment_counts['NEGATIVE'] >= 3 else \
           (True, 'The goal has a neutral sentiment and is allowed.')

def get_domain_icon_and_name(goal_domain):
    prompt = f"For the goal: '{goal_domain}', please provide ONLY the FontAwesome icon class (with 'fas' prefix) and a categorical domain, separated by a comma. Do not include any additional information or explanation. Example format: fas fa-star, Astronomy & Astrophysics"
    response_text = get_completion(prompt, temperature=0.95)
    icon_and_domain = response_text.split(', ')

    if len(icon_and_domain) == 2:
        best_icon, best_domain = icon_and_domain
    else:
        best_icon, best_domain = 'fas fa-star', ''

    return best_icon.strip(), best_domain.strip()

def generate_outcome_data(request, method, selected_goal=None, domain=None, domain_icon=None):
    outcome_data = {}

    if method == 'POST':
        user_input = request.form['user_text'].strip()
    else:
        user_input = request.args.get('user_text', '').strip()

    outcome_data['user_input'] = user_input
    outcome_data['selected_goal'] = selected_goal
    outcome_data['domain_icon'], outcome_data['domain'] = domain_icon, domain

    messages = [
        {"role": "system", "content": "Assuming it is possible to fulfill any outcome and working backwards, generates a high-level summary of everything required for the goal as a fulfilled by some point in the future, including any existing legal, scientific, logistic or other barriers which needed to be addressed for completion."},
        {"role": "user", "content": f"Generate a high-level summary for the goal: '{selected_goal}'. Please format the summary using HTML tags, such as &lt;br&gt; for line breaks."}
    ]
    outcome_data['ssol_summary'] = generate_chat_response(messages, role='Outcome Generation', task='Generate High-Level Summary')

    structured_solution = generate_structured_solution(selected_goal)
    outcome_data['structured_solution'] = structured_solution

    # Generate an image using the Stable Diffusion API
    image_prompt = f"A visually stunning futurisitic illustration depicting '{selected_goal}' as a fulfilled goal, Mary Blair 1959, isometric"
    generated_image = generate_image(image_prompt)
    if generated_image:
        # Use an absolute path for saving the image
        image_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'images', 'generated_image.png')
        generated_image.save(image_path)
        outcome_data['generated_image'] = True
    else:
        outcome_data['generated_image'] = False

    return outcome_data

def generate_image(prompt, seed=None, width=512, height=512):
    if not openai.api_key or not os.environ.get("STABILITY_API_KEY"):
        # Use the placeholder image if the API keys are not provided
        placeholder_image_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "images", "sspec_default.png")
        return Image.open(placeholder_image_path)

    stability_api = client.StabilityInference(
        key=STABILITY_KEY,
        verbose=True,
        engine="stable-diffusion-xl-beta-v2-2-2",
    )

    unique_filename = f"generated_image_{uuid.uuid4().hex}.png"  # Unique name for each generated image
    image_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "images", unique_filename)

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
                    img.save(image_path)  # Save the generated image with the unique filename
                    return img
    except Exception as e:
        print(f"Error in generate_image: {e}")

    # If an error occurs or the image is not generated, use the placeholder image
    placeholder_image_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "images", "sspec_default.png")
    return Image.open(placeholder_image_path)

def generate_structured_solution(selected_goal):
    messages = [
        {"role": "system", "content": "You are an ethics-bound AI that determines conditions of satisfaction needed to complete a given goal across these phases: Discovery, Engagement, Action, Completion, and Legacy, based on first principles. For each phase, please speculate a set of specific, measurable Conditions of Satisfaction (COS) in the past tense, which when met, ensure or indicate project completion. Ensure that the COS are specific to the goal and follow a logical progression through the phases. Provide the response in JSON format, with each phase as a key and its COS as an array of strings. For example: {'discovery': ['COS 1', 'COS 2'], 'engagement': ['COS 1', 'COS 2'], ...}."},
        {"role": "user", "content": f"Generate a Structured Solution which fulfills the following goal: '{selected_goal}'. Provide between 2 to 5 specific, measurable Conditions of Satisfaction (COS) for each phase: Discovery, Engagement, Action, Completion, and Legacy, in JSON format."}
    ]

    structured_solution = {
        'goal': selected_goal,
        'phases': {
            'discovery': [],
            'engagement': [],
            'action': [],
            'completion': [],
            'legacy': []
        }
    }

    response_text = generate_chat_response(messages, role='Structured Solution Generation', task='Generate Structured Solution')

    cleaned_response_text = response_text.replace('\n', ' ').replace('\r', '').strip()

    json_match = re.search(r'\{.*\}', cleaned_response_text)
    if json_match:
        json_data = json_match.group(0)
    else:
        raise ValueError("Failed to extract JSON data from the response.")

    try:
        response_json = json.loads(json_data)
    except (json.JSONDecodeError, ValueError) as e:
        print(f"Error in parsing JSON data: {e}")
        response_json = {
            'discovery': ['Default COS 1', 'Default COS 2'],
            'engagement': ['Default COS 1', 'Default COS 2'],
            'action': ['Default COS 1', 'Default COS 2'],
            'completion': ['Default COS 1', 'Default COS 2'],
            'legacy': ['Default COS 1', 'Default COS 2']
        }

    for phase_key, cos_list in response_json.items():
        structured_solution['phases'][phase_key] = [{'id': str(uuid.uuid4()), 'content': cos, 'status': 'Proposed'} for cos in cos_list]

    return structured_solution