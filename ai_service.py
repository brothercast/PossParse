# ai_service.py (Refactored for Gemini Image Generation)
import os
import json
import uuid
import logging
import asyncio
from google import genai
from google.genai import types
from PIL import Image
from io import BytesIO
from dotenv import load_dotenv
from flask import current_app
from ce_nodes import get_valid_node_types
from openai import AzureOpenAI
import re  # Import the regular expression module
import aiohttp #Import
# from utilities import sanitize_filename

# Load environment variables
load_dotenv()
google_gemini_api_key = os.environ["GOOGLE_GEMINI_API"]
gemini_model_name = os.getenv("GEMINI_MODEL_NAME", "gemini-1.5-pro-002")  # STABLE model for text
gemini_image_model_name = os.getenv("GEMINI_IMAGE_MODEL_NAME", "models/gemini-2.0-flash-exp") # Model for image generation - defaults to flash-exp

# Initialize Gemini client for text and image (using same API key)
gemini_client = genai.Client(api_key=google_gemini_api_key)


async def send_request_to_gemini(messages, generation_config=None, logger=None):
    """
    Asynchronously sends a request to the Google Gemini API and returns the response.
    """
    if logger is None:
        logger = current_app.logger
    try:
        logger.debug(f"Sending request to Gemini with messages: {messages}")

        contents = []
        for message in messages:
            if isinstance(message, dict) and 'role' in message and 'content' in message:
                role = message['role']
                if role not in ("user", "model"):
                    raise ValueError(f"Invalid role: {role}. Role must be 'user' or 'model'.")
                contents.append(
                    types.Content(
                        role=role,
                        parts=[types.Part(text=message['content'])]
                    )
                )
            else:
                logger.warning(f"Invalid message format: {message}. Skipping this message.")

        if generation_config is None:
            generation_config = types.GenerateContentConfig(safety_settings=[])
        elif isinstance(generation_config, dict):
            generation_config.setdefault('safety_settings', [])
            generation_config = types.GenerateContentConfig(**generation_config)

        response = await gemini_client.aio.models.generate_content( # Use gemini_client here
            model=gemini_model_name, # Use gemini_model_name for TEXT model
            contents=contents,
            config=generation_config
        )
        logger.debug(f"Gemini API response: {response.text}")  # LOG THE raw RESPONSE
        return response.text

    except Exception as e:
        logger.error(f"Error sending request to Gemini API: {e}", exc_info=True)
        raise

async def generate_chat_response(messages, role, task, model=None, temperature=0.75, retries=3, backoff_factor=2, logger=None, generation_config=None, system_instruction=None):
    if logger is None:
        logger = current_app.logger

    if generation_config is None:
        generation_config = types.GenerateContentConfig(
            temperature=temperature,
            top_p=0.95,
            top_k=40,
            max_output_tokens=2048,
            safety_settings=[]
        )
    elif isinstance(generation_config, dict):
        generation_config.setdefault('safety_settings', [])
        generation_config = types.GenerateContentConfig(**generation_config)

    last_exception = None
    for retry_attempt in range(retries):
        try:
            logger.debug(f"Sending request to Gemini (attempt {retry_attempt + 1})")
            raw_response = await send_request_to_gemini(messages, generation_config, logger)

            # Extract JSON from the raw response (Robust extraction)
            match = re.search(r"```json\n(.*?)```", raw_response, re.DOTALL)
            if match:
                response_content = match.group(1).strip()
            else:
                response_content = raw_response  # Use raw response if no JSON found
                logger.warning(f"No JSON found in Gemini response.  Using raw response.  Response: {response_content}")
            logger.debug(f"Gemini API response (extracted): {response_content}")
            return response_content  # Return the *extracted* JSON string


        except Exception as e:
            last_exception = e
            if retry_attempt < retries - 1:
                sleep_time = backoff_factor ** (retry_attempt + 1)
                logger.warning(f"Error in generate_chat_response: {e}.  Retrying in {sleep_time} seconds.")
                await asyncio.sleep(sleep_time)
            else:
                logger.error(f"Error in generate_chat_response: {e}. All retries exhausted.")
    if last_exception:
        raise last_exception

async def generate_chat_response_with_node_types(messages, role, task, temperature=0.75, retries=3, backoff_factor=2, logger=None):
    if logger is None:
        logger = current_app.logger

    last_exception = None
    for retry_attempt in range(retries):
        try:
            node_types = get_valid_node_types()
            node_types_str = ', '.join(node_types)

            # Modify messages to include system instruction as a user message
            system_message = {
                "role": "user",
                "content": "You are a helpful assistant. Please respond with information in JSON format. Valid Node Types: " + node_types_str + " **The response should be valid JSON.**"
            }
            messages_with_system = [system_message] + messages  # Prepend system message


            generation_config = types.GenerateContentConfig(
                temperature=temperature,
                top_p=0.95,
                top_k=40,
                max_output_tokens=2048,
                safety_settings=[],
            )
            # NOTE: generate_chat_response already extracts the JSON
            response_content = await generate_chat_response(messages_with_system, role, task, temperature=temperature, retries=retries, backoff_factor=backoff_factor, logger=logger, generation_config=generation_config)
            return response_content  # Return the extracted JSON string
        except Exception as e:
            last_exception = e
            if retry_attempt < retries - 1:
                sleep_time = backoff_factor ** (retry_attempt + 1)
                logger.warning(f"Error in generate_chat_response: {e}. Retrying in {sleep_time} seconds.")
                await asyncio.sleep(sleep_time)
            else:
                logger.error(f"Error in generate_chat_response: {e}. All retries exhausted.")
    if last_exception:
        raise last_exception

async def get_grounded_data(query, ce_type):
    """
    Retrieves grounded data from Google Search for a given query and CE type.
    """
    try: # <-- Line 169 is likely here (start of try block)
        # client is already initialized at the top as gemini_client
        model = "gemini-2.0-pro-exp-02-05"  # Or your preferred model for grounding

        contents = [
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=query)],
            ),
            types.Content(
                role="model", #Must have a model response.
                parts = [types.Part.from_text(text="Okay, I will search for that.")]
            ),
              types.Content(
                role="user",
                parts = [types.Part.from_text(text=(
                    "You are a helpful assistant that extracts information from Google Search results. "
                    f"You are assisting with a Conditional Element of type: {ce_type}.  "
                    "Return a JSON object with the following structure: \n"
                    "{\n"
                    " 'results': [\n"
                    " {\n"
                    " 'title': 'Title of the search result',\n"
                    " 'url': 'URL of the search result',\n"
                    " 'snippet': 'Snippet from the search result',\n"
                    " 'extracted_data': { ... }  // Data mapped to CE fields\n"
                    " }\n"
                    " ],\n"
                    " 'summary': 'A brief summary of the findings',\n"
                     " 'attribution': 'Data retrieved via Google Search using Gemini API.'\n"
                    "}\n"
                    "The 'extracted_data' field should map relevant information from the snippet to the "
                    f"fields defined for the CE type '{ce_type}'.  If a field cannot be filled from the snippet, "
                    "leave it as null or an empty string.  **The response should be valid JSON.**"

                ))]
            )
        ]

        tools = [types.Tool(google_search=types.GoogleSearch())]

        generation_config = types.GenerateContentConfig(
            temperature=0.4,  # Lower temperature for more factual results
            top_p=0.95,
            top_k=40, #Added top k back in.
            max_output_tokens=2048,  # Adjust as needed
            tools=tools,
        )
        response = await gemini_client.aio.models.generate_content( # Use gemini_client here
          model=model,
          contents=contents,
          config=generation_config,
        )

        if response and response.text: # Check if response and response.text are valid
            # Extract JSON (Robust Extraction)
            match = re.search(r"```(?:json)?\n([\s\S]*?)```", response.text, re.IGNORECASE) # More lenient regex
            if match:
                response_content = match.group(1).strip()
                current_app.logger.debug(f"Gemini API response (extracted): {response_content}")
            else:
                response_content = response.text # Use full text if no JSON block found
                current_app.logger.warning(f"No JSON block found in Gemini response. Using raw response text. Raw Response: {response.text}")
        else:
            response_content = None # Set it to None
            current_app.logger.warning(f"Gemini API response or response text is None. Full response object: {response}") # Log full response for debugging

        if response_content: # only if we got a valid result
          try:
            grounded_data = json.loads(response_content)
          except json.JSONDecodeError as e:
            current_app.logger.error(f"JSONDecode Error: {e}")
            return None
        else: # no result
            return None

        return grounded_data

    except Exception as e: # <-- **MISSING or INCORRECT 'except' clause - ADD THIS LINE**
        current_app.logger.error(f"Error in get_grounded_data: {e}", exc_info=True)
        return None

async def generate_image(prompt): # Renamed from generate_dalle_image
    from utilities import sanitize_filename
    from flask import current_app # Ensure current_app is imported

    try:
        # gemini_client is already initialized at the top
        # gemini_image_model_name is loaded from env vars at the top

        contents = prompt # Just the prompt string

        generate_content_config = types.GenerateContentConfig(  # Add GenerateContentConfig
            temperature=1.0, # Match Playground's temperature (or use 0.9 or 0.75 if 1.0 is too creative)
            top_p=0.95,
            top_k=40,
            max_output_tokens=8192, # Match Playground's max_output_tokens (or adjust if needed)
            response_modalities=["image", "text"], # Use lowercase "image" and include "text"
            response_mime_type="text/plain" # Add response_mime_type
        )

        # Log the image prompt here BEFORE making the API call
        current_app.logger.debug(f"generate_image (Gemini) - Sending prompt to API: '{prompt}'") # Log at DEBUG level

        response = await gemini_client.aio.models.generate_content( # Still using non-streaming for now
            model=gemini_image_model_name, # Model from env var
            contents=contents,
            config=generate_content_config # Use the configured config
        )

        image_part = None
        for part in response.candidates[0].content.parts:
            if part.inline_data is not None:
                image_part = part
                break # Assuming only one image part

        if not image_part:
            raise ValueError("No image data found in Gemini response")

        image_bytes = image_part.inline_data.data
        image = Image.open(BytesIO(image_bytes))


        unique_filename = f"generated_image_gemini_{uuid.uuid4().hex}.png" # Gemini specific filename
        unique_filename = sanitize_filename(unique_filename)
        static_folder = current_app.static_folder
        image_folder = os.path.join(static_folder, 'images')
        os.makedirs(image_folder, exist_ok=True)
        image_file_path = os.path.join(image_folder, unique_filename)
        image.save(image_file_path) # Save using Pillow

        web_path = os.path.join('images', unique_filename).replace("\\", "/")
        return web_path

    except Exception as e:
        current_app.logger.error(f"Error in generate_image (Gemini - Refactored Config): {e}", exc_info=True) # Updated log message
        raise