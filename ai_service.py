# ai_service.py (Corrected get_grounded_data AND generate_chat_response)
import os
import json
import uuid
import logging
import asyncio
from google import genai
from google.genai import types
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
gemini_model_name = os.getenv("GEMINI_MODEL_NAME", "gemini-1.5-pro-002")  # STABLE model
azure_openai_key = os.environ["AZURE_OPENAI_API_KEY"]
azure_openai_endpoint = os.environ["AZURE_OPENAI_ENDPOINT"]
azure_openai_deployment_name = os.environ["AZURE_DEPLOYMENT_NAME"]
azure_dalle_api_version = os.getenv("AZURE_DALLE_API_VERSION")  # Use DALL-E specific version
azure_dalle_deployment_name = os.getenv("AZURE_DALLE_DEPLOYMENT_NAME")

# Initialize Gemini client
client = genai.Client(api_key=google_gemini_api_key)

# Initialize Azure OpenAI client
azure_openai_client = AzureOpenAI(
    api_version=azure_dalle_api_version,
    api_key=azure_openai_key,
    azure_endpoint=azure_openai_endpoint
)

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

        response = await client.aio.models.generate_content(
            model=gemini_model_name,
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
    # REMOVE: system instruction here

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
                # REMOVE system instruction here
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
    try:
        client = genai.Client(api_key=os.environ["GOOGLE_GEMINI_API"])
        model = "gemini-2.0-pro-exp-02-05"  # Or your preferred model

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
        response = await client.aio.models.generate_content(
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

    except Exception as e:
        current_app.logger.error(f"Error in get_grounded_data: {e}", exc_info=True)
        return None

async def generate_dalle_image(prompt, azure_openai_client):
    from ai_service import azure_openai_client as client_module
    from utilities import sanitize_filename

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
        unique_filename = sanitize_filename(unique_filename) #Call sanitize filename
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