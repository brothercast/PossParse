import os
import re
import json
import uuid
import warnings
from PIL import Image
from transformers import T5ForConditionalGeneration, T5Tokenizer, pipeline
from dotenv import load_dotenv

load_dotenv()

# Your Hugging Face model and tokenizer
model_id = "lmsys/fastchat-t5-3b-v1.0"
tokenizer = T5Tokenizer.from_pretrained(model_id)
model = T5ForConditionalGeneration.from_pretrained(model_id)

# Create a text generation pipeline
text_generation_pipeline = pipeline("text2text-generation", model=model, tokenizer=tokenizer, device=-1, max_length=1000)

def generate_chat_response(messages):
    # Combine user and system messages into a single input text
    conversation = ""
    for message in messages:
        conversation += message["role"] + ": " + message["content"] + "\n"

    # Generate a response using the Hugging Face model
    response = text_generation_pipeline(conversation, max_length=1000, do_sample=True, top_k=50, top_p=0.95, temperature=0.7)[0]["generated_text"]

    # Extract and return the generated response
    response_text = response[len(conversation):].strip()
    print(f"SSPEC Response: {response_text}")
    return response_text

# Other utility functions

def generate_goal(user_input):
    goal_options = []
    temperatures = [0.6, 0.8, 1.0]

    while len(goal_options) < 3:
        for i, temp in enumerate(temperatures):
            messages = [
                {"role": "system", "content": "-."},
                {"role": "user", "content": user_input},
            ]

            try:
                goal_option = generate_chat_response(messages).strip()
            except Exception as e:
                print(f"Error in generate_goal (Variation {i + 1}): {e}")
                continue

            goal_compliant, non_compliance_reason = is_goal_compliant(goal_option)

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

def generate_image(prompt, seed=None, width=512, height=512):
    if not STABILITY_API_KEY:
        # Use the placeholder image if the API key is not provided
        placeholder_image_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "images", "sspec_default.png")
        return Image.open(placeholder_image_path)

    stability_api = client.StabilityInference(
        key=STABILITY_API_KEY,
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