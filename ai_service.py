# ai_service.py
import os
import json
import openai
import logging
import time
from dotenv import load_dotenv
from flask import current_app
from tenacity import retry, stop_after_attempt, wait_exponential, RetryError
from ce_nodes import get_valid_node_types

# Load environment variables
load_dotenv()
azure_openai_key = os.environ["AZURE_OPENAI_API_KEY"]
azure_openai_endpoint = os.environ["AZURE_OPENAI_ENDPOINT"]
azure_oai_model = os.getenv("AZURE_MODEL_NAME")
azure_oai_api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2023-12-01")  # Default version

# Initialize Azure OpenAI client
openai.api_key = azure_openai_key
openai.api_base = azure_openai_endpoint
openai.api_type = 'azure'
openai.api_version = azure_oai_api_version


class AzureOpenAIClient:
    """
    A client for interacting with the Azure OpenAI API.

    This class centralizes the logic for calling the Azure OpenAI API,
    including retries and error handling.
    """
    def __init__(self, api_key, api_base, api_version, model_name):
        openai.api_key = api_key
        openai.api_base = api_base
        openai.api_type = 'azure'
        openai.api_version = api_version
        self.model_name = model_name

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10), reraise=True)
    def _send_request(self, messages, temperature=0.75, max_tokens=1500, response_format={"type": "json_object"}):
        """
        Sends a request to the Azure OpenAI API with retry logic.
        """
        try:
            current_app.logger.debug(f"Sending request to Azure OpenAI: {messages}")
            response = openai.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                response_format=response_format
            )
            current_app.logger.debug(f"Azure OpenAI response: {response}")
            return response.choices[0].message.content
        except Exception as e:
            current_app.logger.error(f"Error in _send_request: {e}", exc_info=True)
            raise  # Re-raise the exception to trigger the retry mechanism

    def chat_completion(self, messages, temperature=0.75, max_tokens=1500):
        """
        Sends a request to the Azure OpenAI API and returns the response content.

        Args:
            messages (list): A list of message dictionaries as per OpenAI API.
            temperature (float): The sampling temperature to use.
            max_tokens (int): The maximum number of tokens to generate.

        Returns:
            str: The content of the response from the API

        Raises:
            RetryError: If any error occurs during the API call after all retries.
        """
        try:
            return self._send_request(messages, temperature, max_tokens)
        except RetryError as e:
            current_app.logger.error(f"RetryError in chat_completion: {e}", exc_info=True)
            raise

    def chat_completion_with_node_types(self, messages, temperature=0.75, max_tokens=1500):
        """
            Sends a request to the Azure OpenAI API using the chat_completion function including node_types
        """
        node_types = get_valid_node_types()  # Fetch valid node types
        node_types_str = ', '.join(node_types)
        # Ensure the system message indicates JSON response format
        system_message = {
          "role": "system",
          "content": "You are a helpful assistant. Please respond with information in JSON format. Valid Node Types: " + node_types_str
        }
        messages_with_json = [system_message] + messages
        try:
            return self._send_request(messages_with_json, temperature, max_tokens)
        except RetryError as e:
            current_app.logger.error(f"RetryError in chat_completion_with_node_types: {e}", exc_info=True)
            raise

# Create a global instance of the client
azure_openai_client = AzureOpenAIClient(azure_openai_key, azure_openai_endpoint, azure_oai_api_version, azure_oai_model)

def send_request_to_openai(messages, temperature=0.75, max_tokens=1500, response_format={"type": "json_object"}):
    """
    Sends a request to the Azure OpenAI API and returns the response.

    Args:
        messages (list): A list of message dictionaries as per OpenAI API.
        temperature (float): The sampling temperature to use.
        max_tokens (int): The maximum number of tokens to generate.
        response_format (dict): The output format of the response

    Returns:
        str: The content of the response from the API

    Raises:
        Exception: If any error occurs during the API call.
    """
    try:
        return azure_openai_client._send_request(messages, temperature, max_tokens, response_format)
    except Exception as e:
        current_app.logger.error(f"Error in send_request_to_openai: {e}", exc_info=True)
        raise


def generate_chat_response(messages, role, task, temperature=0.75, max_tokens=1500):
    """
        Sends a request to the Azure OpenAI API using the chat_completion function.
    """
    try:
        return azure_openai_client.chat_completion(messages, temperature, max_tokens)
    except RetryError as e:
        current_app.logger.error(f"RetryError in generate_chat_response: {e}", exc_info=True)
        raise


def generate_chat_response_with_node_types(messages, role, task, temperature=0.75, max_tokens=1500):
    """
    Sends a request to the Azure OpenAI API using the chat_completion_with_node_types.
    """
    try:
        return azure_openai_client.chat_completion_with_node_types(messages, temperature, max_tokens)
    except RetryError as e:
        current_app.logger.error(f"RetryError in generate_chat_response_with_node_types: {e}", exc_info=True)
        raise