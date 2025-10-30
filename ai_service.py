# ai_service.py 
import os
import json
import uuid
import logging
import asyncio
from google import genai
from google.genai import types
from google.genai.types import HarmCategory, HarmBlockThreshold
from PIL import Image
from io import BytesIO
from dotenv import load_dotenv
from flask import current_app
from ce_nodes import get_valid_node_types
from openai import AzureOpenAI
import re
import aiohttp

# Load environment variables
load_dotenv()
google_gemini_api_key = os.environ["GOOGLE_GEMINI_API"]
gemini_model_name = os.getenv("GEMINI_MODEL_NAME")
gemini_image_model_name = os.getenv("GEMINI_IMAGE_MODEL_NAME")

# Initialize Gemini client
gemini_client = genai.Client(api_key=google_gemini_api_key)

async def send_request_to_gemini(messages, generation_config=None, logger=None):
    """
    Asynchronously sends a request to the Google Gemini API and returns the response.
    This function now expects that any 'system' roles have already been converted.
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
            generation_config = types.GenerateContentConfig(safety_settings=[
                types.SafetySetting(category=HarmCategory.HARM_CATEGORY_HARASSMENT, threshold=HarmBlockThreshold.BLOCK_ONLY_HIGH),
                types.SafetySetting(category=HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold=HarmBlockThreshold.BLOCK_ONLY_HIGH),
                types.SafetySetting(category=HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold=HarmBlockThreshold.BLOCK_ONLY_HIGH),
                types.SafetySetting(category=HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold=HarmBlockThreshold.BLOCK_ONLY_HIGH),
            ])
        elif isinstance(generation_config, dict):
            generation_config.setdefault('safety_settings', [
                types.SafetySetting(category=HarmCategory.HARM_CATEGORY_HARASSMENT, threshold=HarmBlockThreshold.BLOCK_ONLY_HIGH),
                types.SafetySetting(category=HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold=HarmBlockThreshold.BLOCK_ONLY_HIGH),
                types.SafetySetting(category=HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold=HarmBlockThreshold.BLOCK_ONLY_HIGH),
                types.SafetySetting(category=HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold=HarmBlockThreshold.BLOCK_ONLY_HIGH),
            ])
            generation_config = types.GenerateContentConfig(**generation_config)

        response = await gemini_client.aio.models.generate_content(
            model=gemini_model_name,
            contents=contents,
            config=generation_config
        )
        logger.debug(f"Gemini API response: {response.text}")
        return response.text

    except Exception as e:
        logger.error(f"Error sending request to Gemini API: {e}", exc_info=True)
        raise

async def generate_chat_response(messages, role, task, model=None, temperature=0.75, retries=3, backoff_factor=2, logger=None, generation_config=None, system_instruction=None):
    if logger is None:
        logger = current_app.logger
    
    processed_messages = []
    for msg in messages:
        if msg.get('role') == 'system':
            if not processed_messages or processed_messages.get('role') != 'user':
                processed_messages.insert(0, {'role': 'user', 'content': msg['content']})
            else:
                processed_messages['content'] = f"{msg['content']}\n\n{processed_messages['content']}"
        else:
            processed_messages.append(msg)
    
    if system_instruction:
        if not processed_messages or processed_messages.get('role') != 'user':
            processed_messages.insert(0, {'role': 'user', 'content': system_instruction})
        else:
            processed_messages['content'] = f"{system_instruction}\n\n{processed_messages['content']}"

    if generation_config is None:
        generation_config = types.GenerateContentConfig(
            temperature=temperature,
            top_p=0.95,
            top_k=40,
            max_output_tokens=8192,
            safety_settings=[
                types.SafetySetting(category=HarmCategory.HARM_CATEGORY_HARASSMENT, threshold=HarmBlockThreshold.BLOCK_ONLY_HIGH),
                types.SafetySetting(category=HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold=HarmBlockThreshold.BLOCK_ONLY_HIGH),
                types.SafetySetting(category=HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold=HarmBlockThreshold.BLOCK_ONLY_HIGH),
                types.SafetySetting(category=HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold=HarmBlockThreshold.BLOCK_ONLY_HIGH),
            ]
        )
    elif isinstance(generation_config, dict):
        generation_config.setdefault('safety_settings', [
            types.SafetySetting(category=HarmCategory.HARM_CATEGORY_HARASSMENT, threshold=HarmBlockThreshold.BLOCK_ONLY_HIGH),
            types.SafetySetting(category=HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold=HarmBlockThreshold.BLOCK_ONLY_HIGH),
            types.SafetySetting(category=HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold=HarmBlockThreshold.BLOCK_ONLY_HIGH),
            types.SafetySetting(category=HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold=HarmBlockThreshold.BLOCK_ONLY_HIGH),
        ])
        generation_config.setdefault('max_output_tokens', 8192)
        generation_config = types.GenerateContentConfig(**generation_config)

    last_exception = None
    for retry_attempt in range(retries):
        try:
            logger.debug(f"Sending request to Gemini (attempt {retry_attempt + 1})")
            raw_response = await send_request_to_gemini(processed_messages, generation_config, logger)

            match = re.search(r"```(?:json)?\s*\n(.*?)\s*```", raw_response, re.DOTALL)
            
            if match:
                response_content = match.group(1).strip()
            else:
                response_content = raw_response
                logger.warning(f"No JSON markdown block found in Gemini response. Using raw response. Response: {response_content}")
            
            logger.debug(f"Gemini API response (extracted): {response_content}")
            return response_content

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


async def generate_chat_response_with_node_types(messages, role, task, temperature=0.75, retries=3, backoff_factor=2, logger=None):
    if logger is None:
        logger = current_app.logger

    last_exception = None
    for retry_attempt in range(retries):
        try:
            node_types = get_valid_node_types()
            node_types_str = ', '.join(node_types)

            system_message = {
                "role": "user",
                "content": "You are a helpful assistant. Please respond with information in JSON format. Valid Node Types: " + node_types_str + " **The response should be valid JSON.**"
            }
            messages_with_system = [system_message] + messages

            response_content = await generate_chat_response(messages_with_system, role, task, temperature=temperature, retries=retries, backoff_factor=backoff_factor, logger=logger)
            return response_content
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
        # --- MODIFIED: Corrected the model name ---
        model = gemini_model_name

        contents = [
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=query)],
            ),
            types.Content(
                role="model",
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
            temperature=0.4,
            top_p=0.95,
            top_k=40,
            max_output_tokens=8192,
            tools=tools,
        )
        response = await gemini_client.aio.models.generate_content(
          model=model,
          contents=contents,
          config=generation_config,
        )

        response_content = ""
        if response and response.text:
            # --- MODIFIED: More robust JSON extraction to handle truncated responses ---
            raw_text = response.text
            match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", raw_text, re.DOTALL)
            if match:
                response_content = match.group(1).strip()
                current_app.logger.debug(f"Gemini API response (extracted from markdown): {response_content}")
            else:
                # Fallback: Find the first '{' and last '}' if no markdown block is found
                start = raw_text.find('{')
                end = raw_text.rfind('}')
                if start != -1 and end != -1 and end > start:
                    response_content = raw_text[start:end+1]
                    current_app.logger.warning(f"No JSON markdown block found. Extracted from curly braces. Raw Response: {raw_text}")
                else:
                    current_app.logger.warning(f"No JSON found at all in Gemini response. Raw Response: {raw_text}")
        else:
            current_app.logger.warning(f"Gemini API response or response text is None. Full response object: {response}")

        if response_content:
          try:
            grounded_data = json.loads(response_content)
          except json.JSONDecodeError as e:
            current_app.logger.error(f"JSONDecode Error: {e}. Content that failed: '{response_content}'")
            return None
        else:
            return None

        return grounded_data

    except Exception as e:
        current_app.logger.error(f"Error in get_grounded_data: {e}", exc_info=True)
        return None

async def generate_image(prompt):
    from utilities import sanitize_filename
    from flask import current_app

    try:
        contents = prompt

        generate_content_config = types.GenerateContentConfig(
            temperature=1.0,
            top_p=0.95,
            top_k=40,
            max_output_tokens=8192,
            response_modalities=["image", "text"],
            response_mime_type="text/plain"
        )

        current_app.logger.debug(f"generate_image (Gemini) - Sending prompt to API: '{prompt}'")

        response = await gemini_client.aio.models.generate_content(
            model=gemini_image_model_name,
            contents=contents,
            config=generate_content_config
        )

        image_part = None
        for candidate in response.candidates:
             for part in candidate.content.parts:
                if part.inline_data is not None and part.inline_data.mime_type.startswith('image/'):
                    image_part = part
                    break
             if image_part:
                 break

        if not image_part:
            raise ValueError("No image data found in Gemini response")

        image_bytes = image_part.inline_data.data
        image = Image.open(BytesIO(image_bytes))


        unique_filename = f"generated_image_gemini_{uuid.uuid4().hex}.png"
        unique_filename = sanitize_filename(unique_filename)
        static_folder = current_app.static_folder
        image_folder = os.path.join(static_folder, 'images')
        os.makedirs(image_folder, exist_ok=True)
        image_file_path = os.path.join(image_folder, unique_filename)
        image.save(image_file_path)

        web_path = os.path.join('images', unique_filename).replace("\\", "/")
        return web_path

    except Exception as e:
        current_app.logger.error(f"Error in generate_image (Gemini - Refactored Config): {e}", exc_info=True)
        raise