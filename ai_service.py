import os
import json
import uuid
import logging
import asyncio
import re
from contextvars import ContextVar
from google import genai
from google.genai import types
from google.genai.types import HarmCategory, HarmBlockThreshold
from PIL import Image
from io import BytesIO
from dotenv import load_dotenv
from flask import current_app

# This import might seem unused but is needed for get_valid_node_types() if called from this module
from ce_nodes import get_valid_node_types

# --- Configuration & Initialization ---
load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def sanitize_filename(filename: str) -> str:
    """Sanitizes a string to be a valid filename."""
    return re.sub(r'[^a-zA-Z0-9_.-]', '_', filename)

google_gemini_api_key = os.environ.get("GOOGLE_GEMINI_API")
gemini_model_name = os.getenv("GEMINI_MODEL_NAME")
gemini_thinking_model_name = os.getenv("GEMINI_THINKING_MODEL_NAME")
gemini_image_model_name = os.getenv("GEMINI_IMAGE_MODEL_NAME")

# --- ContextVar for Request-Scoped Client ---
_gemini_client_context: ContextVar = ContextVar('gemini_client', default=None)

def get_gemini_client():
    client = _gemini_client_context.get()
    if client is None:
        logging.info("Initializing Gemini client for current request context...")
        if not google_gemini_api_key:
            logging.error("CRITICAL: GOOGLE_GEMINI_API key is missing.")
            raise ConnectionError("Google Gemini API key is not configured.")
        client = genai.Client(api_key=google_gemini_api_key)
        _gemini_client_context.set(client)
        logging.info("Gemini client initialized successfully for this context.")
    return client

async def cleanup_gemini_client():
    client = _gemini_client_context.get()
    if client is not None and hasattr(client, 'aio'):
        try:
            if hasattr(client.aio, '_api_client') and hasattr(client.aio._api_client, '_aiohttp_session'):
                session = client.aio._api_client._aiohttp_session
                if session and not session.closed:
                    await session.close()
                    logging.debug("Closed aiohttp session for Gemini client in this context.")
        except Exception as e:
            logging.warning(f"Error closing Gemini client session: {e}")
        finally:
            _gemini_client_context.set(None)

# --- Core AI Functions ---

async def send_request_to_gemini(messages, generation_config=None, model=None, logger=None):
    if logger is None: logger = current_app.logger
    try:
        client = get_gemini_client()
        model_to_use = model or gemini_model_name
        logger.debug(f"Sending request to Gemini model '{model_to_use}' with messages: {messages}")
        contents = []
        for message in messages:
            if isinstance(message, dict) and 'role' in message and 'content' in message:
                role = 'model' if message['role'] in ['assistant', 'model'] else 'user'
                contents.append(types.Content(role=role, parts=[types.Part(text=message['content'])]))
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

        response = await client.aio.models.generate_content(
            model=model_to_use,
            contents=contents,
            config=generation_config
        )
        logger.debug(f"Gemini API response: {response.text}")
        return response.text
    except Exception as e:
        logger.error(f"Error sending request to Gemini API: {e}", exc_info=True)
        raise

async def generate_chat_response(messages, role, task, model=None, temperature=0.75, retries=3, backoff_factor=2, logger=None, generation_config=None, system_instruction=None):
    if logger is None: logger = current_app.logger
    processed_messages = []
    for msg in messages:
        if msg.get('role') == 'system':
            if not processed_messages or processed_messages[0].get('role') != 'user':
                processed_messages.insert(0, {'role': 'user', 'content': msg['content']})
            else:
                processed_messages[0]['content'] = f"{msg['content']}\n\n{processed_messages[0]['content']}"
        else:
            processed_messages.append(msg)
    if system_instruction:
        if not processed_messages or processed_messages[0].get('role') != 'user':
            processed_messages.insert(0, {'role': 'user', 'content': system_instruction})
        else:
            processed_messages[0]['content'] = f"{system_instruction}\n\n{processed_messages[0]['content']}"

    model_to_use = model or gemini_thinking_model_name
    if generation_config is None:
        generation_config = types.GenerateContentConfig(
            temperature=temperature, top_p=0.95, top_k=40, max_output_tokens=8192,
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
            logger.debug(f"Sending request to Gemini (attempt {retry_attempt + 1}) for task '{task}'")
            raw_response = await send_request_to_gemini(processed_messages, generation_config, model_to_use, logger)
            response_content = raw_response
            match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", raw_response, re.DOTALL)
            if match:
                response_content = match.group(1).strip()
            else:
                first_bracket = raw_response.find('[')
                first_curly = raw_response.find('{')
                start_index = -1
                if first_bracket != -1 and first_curly != -1:
                    start_index = min(first_bracket, first_curly)
                elif first_bracket != -1:
                    start_index = first_bracket
                else:
                    start_index = first_curly
                if start_index != -1:
                    start_char = raw_response[start_index]
                    end_char = ']' if start_char == '[' else '}'
                    end_index = raw_response.rfind(end_char)
                    if end_index > start_index:
                        response_content = raw_response[start_index : end_index + 1].strip()
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
    if logger is None: logger = current_app.logger
    node_types = get_valid_node_types()
    node_types_str = ', '.join(node_types)
    system_instruction = f"You are a helpful assistant. Please respond with information in JSON format. Valid Node Types: {node_types_str} **The response should be valid JSON.**"
    return await generate_chat_response(messages, role, task, temperature=temperature, retries=retries, backoff_factor=backoff_factor, logger=logger, system_instruction=system_instruction)

async def get_grounded_data(query, ce_type):
    logger = current_app.logger
    try:
        client = get_gemini_client()
        model = gemini_thinking_model_name
        contents = [types.Content(role="user", parts=[types.Part.from_text(text=query)])]
        tools = [types.Tool(google_search=types.GoogleSearch())]
        generation_config = types.GenerateContentConfig(
            temperature=0.4, top_p=0.95, top_k=40, max_output_tokens=8192
        )
        response = await client.aio.models.generate_content(
            model=model,
            contents=contents,
            tools=tools,
            config=generation_config
        )
        response_content = ""
        if response and response.text:
            raw_text = response.text
            match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", raw_text, re.DOTALL)
            if match:
                response_content = match.group(1).strip()
            else:
                start = raw_text.find('{')
                end = raw_text.rfind('}')
                if start != -1 and end != -1 and end > start:
                    response_content = raw_text[start:end+1]
                else:
                    logger.warning(f"No JSON found in grounded Gemini response. Raw: {raw_text}")
        else:
            logger.warning(f"Grounded Gemini response or text is None. Full response: {response}")

        if response_content:
            try:
                grounded_data = json.loads(response_content)
                return grounded_data
            except json.JSONDecodeError as e:
                logger.error(f"JSONDecode Error in get_grounded_data: {e}. Content: '{response_content}'")
                return None
        else:
            return None
    except Exception as e:
        logger.error(f"Error in get_grounded_data: {e}", exc_info=True)
        return None

async def generate_image(prompt: str, ssol_id: str):
    logger = current_app.logger
    try:
        client = get_gemini_client()
        logger.debug(f"generate_image (Gemini) - Sending prompt to API: '{prompt}'")
        
        generation_config = types.GenerateContentConfig(
            response_modalities=["TEXT", "IMAGE"]
        )
        
        # Now, make the API call using the defined config.
        response = await client.aio.models.generate_content(
            model=gemini_image_model_name,
            contents=prompt,
            config=generation_config
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
        image_filename = f"ssol_image_{ssol_id}.png"
        sanitized_filename = sanitize_filename(image_filename)
        static_folder = current_app.static_folder
        image_folder = os.path.join(static_folder, 'images')
        os.makedirs(image_folder, exist_ok=True)
        image_file_path = os.path.join(image_folder, sanitized_filename)
        image.save(image_file_path)
        web_path = os.path.join('images', sanitized_filename).replace("\\", "/")
        logger.info(f"Image for SSOL {ssol_id} saved to: {web_path}")
        return web_path
    except Exception as e:
        logger.error(f"Error in generate_image for SSOL {ssol_id}: {e}", exc_info=True)
        raise