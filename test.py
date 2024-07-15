import os  
import json  
import time  
from dotenv import load_dotenv  
from openai import AzureOpenAI  
  
# Load environment variables  
load_dotenv()  
  
# Initialize the AzureOpenAI client  
azure_oai_key = os.getenv("AZURE_OPENAI_API_KEY")  
azure_oai_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")  
azure_oai_deployment_name = os.getenv("AZURE_DEPLOYMENT_NAME")  
azure_oai_model = os.getenv("AZURE_MODEL_NAME")  # Add this line to load the model name  
azure_openai_client = AzureOpenAI(  
    azure_endpoint=azure_oai_endpoint,  
    api_key=azure_oai_key,  
    api_version="2024-03-01-preview"  
)  
  
# Define the AI-related function  
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
  
            # Log the constructed messages for debugging  
            print(f"Constructed Messages for generate_chat_response: {json.dumps(messages_with_json, indent=2)}")  
  
            print(f"Sending request to Azure OpenAI: {messages_with_json}")  
  
            # Send request to Azure OpenAI model using JSON mode  
            response = azure_openai_client.chat.completions.create(  
                model=azure_oai_model,  # Use the model name loaded from the environment  
                response_format={"type": "json_object"},  
                messages=messages_with_json,  
                temperature=temperature,  
                max_tokens=1800  
            )  
            response_content = response.choices[0].message.content  
            print(f"Received response from AI: {response_content}")  
            return response_content  
        except Exception as e:  
            last_exception = e  
            if retry_attempt < retries - 1:  
                sleep_time = backoff_factor ** (retry_attempt + 1)  
                print(f"Error in generate_chat_response: {e}. Retrying in {sleep_time} seconds.")  
                time.sleep(sleep_time)  
            else:  
                print(f"Error in generate_chat_response: {e}. All retries exhausted.")  
  
    # Raise the last exception if all retries fail  
    raise last_exception  
  
# Import NODES from ce_nodes.py  
from ce_nodes import NODES, get_valid_node_types  
  
# Define the test function  
def test_ai_response(cos_text, ce_id, ce_type, ssol_goal):  
    node_info = NODES.get(ce_type, NODES['Default'])  
      
    # Print entire node_info for debugging  
    print(f"Full node_info for CE type '{ce_type}': {json.dumps(node_info, indent=2)}")  
      
    # Access ai_context directly and print it  
    ai_context = node_info['modal_config'].get('ai_context', '')  
    print(f"Accessed ai_context: {ai_context}")  
      
    modal_config_fields = node_info.get('modal_config', {}).get('fields', [])  
  
    if not ai_context:  
        print(f"No AI context provided for CE type: {ce_type}")  
        return {"summary": "No AI context provided.", "fields": {}}  
  
    valid_node_types = ', '.join(get_valid_node_types())  
    field_labels = [field['name'] for field in modal_config_fields]  
  
    # Log detailed information about the node and context  
    print(f"Node Info for CE Type '{ce_type}': {json.dumps(node_info, indent=2)}")  
    print(f"AI Context: {ai_context}")  
    print(f"Valid Node Types: {valid_node_types}")  
    print(f"Form Field Labels: {field_labels}")  
  
    messages = [  
        {  
            "role": "system",  
            "content": (  
                "You are a helpful assistant. Generate contextually relevant data based on the Structured Solution (SSOL) goal, "  
                "the parent Condition of Satisfaction (COS) text, and the specific Conditional Element Identifier (CE ID) and type provided. Use this information to generate "  
                "detailed and specific insights or data that can fulfill on satisfying the COS and ultimately achieving the SSOL goal. "  
                "Select the most appropriate conditional element type from the following list: {valid_node_types}."  
            ).format(valid_node_types=valid_node_types)  
        },  
        {  
            "role": "user",  
            "content": (  
                f"SSOL Goal: {ssol_goal}\n"  
                f"COS Text: {cos_text}\n"  
                f"CE ID: {ce_id}\n"  
                f"CE Type: {ce_type}\n"  
                f"Context: {ai_context}\n"  
                f"Form Field Labels: {', '.join(field_labels)}\n"  
                f"Based on the SSOL goal and the context provided by the parent COS and other conditional elements, "  
                f"generate a JSON response with the following structure:\n"  
                f"{{\n"  
                f"  \"summary\": \"Summary of the Conditional Element\",\n"  
                f"  \"fields\": {{\n"  
                f"    \"field_label_1\": \"Value for field_label_1\",\n"  
                f"    \"field_label_2\": \"Value for field_label_2\",\n"  
                f"    ...\n"  
                f"  }}\n"  
                f"}}\n"  
                f"Fill in the values for the form fields based on the COS and context provided."  
            )  
        }  
    ]  
  
    print("Constructed Prompt for AI:")  
    print(json.dumps(messages, indent=2))  
  
    try:  
        response = generate_chat_response(messages, role='AI Contextual Query', task=f'Generate Data for {ce_type}')  
        print("AI Response:")  
        print(response)  
        ai_data = json.loads(response)  
        print("Parsed AI Data:")  
        print(json.dumps(ai_data, indent=2))  
        return ai_data  
    except Exception as e:  
        print(f"Error generating AI data: {e}")  
        return {"summary": "Error generating AI data.", "fields": {}}  
  
if __name__ == "__main__":  
    # Test with placeholder data  
    cos_text = "This is a placeholder COS text."  
    ce_id = "placeholder-ce-id"  
    ce_type = "Research"  # Replace with the CE type you want to test  
    ssol_goal = "This is a placeholder SSOL goal."  
  
    test_ai_response(cos_text, ce_id, ce_type, ssol_goal)  
