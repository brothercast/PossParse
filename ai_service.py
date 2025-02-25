# ai_service.py (Extract JSON from Gemini response)
import os
import json
import logging
import asyncio
from google import genai
from google.genai import types
from dotenv import load_dotenv
from flask import current_app
from ce_nodes import get_valid_node_types
from openai import AzureOpenAI
import re  # Import the regular expression module

# Load environment variables
load_dotenv()
google_gemini_api_key = os.environ["GOOGLE_GEMINI_API"]
gemini_model_name = os.getenv("GEMINI_MODEL_NAME", "gemini-1.5-pro-002")  # STABLE model
azure_openai_key = os.environ["AZURE_OPENAI_API_KEY"]
azure_openai_endpoint = os.environ["AZURE_OPENAI_ENDPOINT"]
azure_openai_deployment_name = os.environ["AZURE_DEPLOYMENT_NAME"]
azure_dalle_api_version = os.getenv("AZURE_DALLE_API_VERSION")  # Use DALL-E specific version

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
    if system_instruction:
        generation_config.system_instruction = system_instruction

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
            generation_config = types.GenerateContentConfig(
                temperature=temperature,
                top_p=0.95,
                top_k=40,
                max_output_tokens=2048,
                safety_settings=[],
                system_instruction="You are a helpful assistant. Please respond with information in JSON format. Valid Node Types: " + node_types_str + " **The response should be valid JSON.**"
            )
            # NOTE: generate_chat_response already extracts the JSON
            response_content = await generate_chat_response(messages, role, task, temperature=temperature, retries=retries, backoff_factor=backoff_factor, logger=logger, generation_config=generation_config)
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