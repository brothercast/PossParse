import logging 
from flask import render_template_string  
from utilities import generate_chat_response  
from ce_nodes import NODES  
  
# Define a base template for the modal dialogs that will be populated dynamically  
BASE_MODAL_TEMPLATE = """  
<div class="modal fade" id="ceModal{{ ce_data.id }}" tabindex="-1" aria-labelledby="ceModalLabel{{ ce_data.id }}" aria-hidden="true">  
  <div class="modal-dialog modal-lg" role="document">  
    <div class="modal-content">  
      <div class="modal-header">  
        <h5 class="modal-title" id="ceModalLabel{{ ce_data.id }}">  
          <i class="{{ node_info['icon'] }}"></i>  
          {{ node_info['definition'] }}  
        </h5>  
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>  
      </div>  
      <div class="modal-body">  
        <h6>Parent COS: {{ cos_content }}</h6>  
        <p>{{ node_info['explanation'] }}</p>  
        <div class="ai-generated-data">  
          <h6>AI-Generated Data:</h6>  
          <p>{{ ai_data }}</p>  
        </div>  
        <form id="ceForm{{ ce_data.id }}" data-ce-id="{{ ce_data.id }}">  
          {{ form_fields | safe }}  
        </form>  
      </div>  
      <div class="modal-footer">  
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>  
        <button type="button" class="btn btn-primary btn-save-changes" data-ce-id="{{ ce_data.id }}">Save changes</button>  
      </div>  
    </div>  
  </div>  
</div>  
"""  
  
def generate_form_field(field):  
    field_templates = {  
        'text': '<input type="text" class="form-control" name="{name}" value="{value}" placeholder="{placeholder}"/>',  
        'number': '<input type="number" class="form-control" name="{name}" value="{value}" placeholder="{placeholder}"/>',  
        'textarea': '<textarea class="form-control" name="{name}" placeholder="{placeholder}">{value}</textarea>',  
        'email': '<input type="email" class="form-control" name="{name}" value="{value}" placeholder="{placeholder}"/>',  
        'password': '<input type="password" class="form-control" name="{name}" placeholder="{placeholder}"/>',  
        'date': '<input type="date" class="form-control" name="{name}" value="{value}"/>',  
        'time': '<input type="time" class="form-control" name="{name}" value="{value}"/>',  
        'datetime-local': '<input type="datetime-local" class="form-control" name="{name}" value="{value}"/>',  
        'color': '<input type="color" class="form-control" name="{name}" value="{value}"/>',  
        'checkbox': '<div class="form-check"><input type="checkbox" class="form-check-input" id="{name}" name="{name}" value="{value}" {checked}/><label class="form-check-label" for="{name}">{placeholder}</label></div>',  
        'radio': lambda field: ''.join(f'<div class="form-check"><input type="radio" class="form-check-input" id="{opt_value}" name="{field["name"]}" value="{opt_value}" '  
                                       f'{"checked" if "value" in field and opt_value == field["value"] else ""}/><label class="form-check-label" for="{opt_value}">{opt_label}</label></div>'  
                                       for opt_value, opt_label in (field.get('options', {})).items()),  
        'select': lambda field: '<select class="form-control" name="{name}">' + ''.join(f'<option value="{opt_value}" '  
                    f'{"selected" if "value" in field and opt_value == field["value"] else ""}>{opt_label}</option>'  
                    for opt_value, opt_label in (field.get('options', {})).items()) + '</select>',  
    }  
  
    checked = 'checked' if field.get('value', False) and (field['type'] in ['checkbox', 'radio']) else ''  
  
    if field['type'] in ['radio', 'select']:  
        return field_templates[field['type']](field)  
    else:  
        return field_templates[field['type']].format(name=field['name'], value=field.get('value', ''), placeholder=field.get('placeholder', ''), checked=checked)  
  
def generate_form_fields(fields_config):  
    return ''.join(generate_form_field(field) for field in fields_config)  
  
def generate_dynamic_modal(ce_type, ce_data=None, cos_content=None):  
    node_info = NODES.get(ce_type, NODES['Default'])  
    fields_config = node_info.get('modal_config', {}).get('fields', [])  
    form_fields = generate_form_fields(fields_config)  
  
    # Ensure ce_data and cos_content are provided  
    if not ce_data:  
        ce_data = {'id': 'unknown_ce_id'}  
    ce_id = ce_data.get('id', 'unknown_ce_id')  
    ssol_goal = "SSOL Goal Example"  # Replace with actual SSOL goal if available  
    ai_data = generate_ai_data(cos_content, ce_id, ce_type, ssol_goal)  
  
    modal_content = render_template_string(BASE_MODAL_TEMPLATE, ce_type=ce_type, node_info=node_info, form_fields=form_fields, ce_data=ce_data, cos_content=cos_content, ai_data=ai_data)  
    return modal_content  

  
def generate_ai_data(cos_text, ce_id, ce_type, ssol_goal):  
    node_info = NODES.get(ce_type, NODES['Default'])  
    ai_context = node_info.get('ai_context', '')  
  
    if not ai_context:  
        return "No AI context provided."  
  
    messages = [  
        {  
            "role": "system",  
            "content": (  
                "You are a helpful assistant. Generate contextually relevant data based on the Structured Solution (SSOL) goal, "  
                "the parent Condition of Satisfaction (COS) text, and the specific Conditional Element Identifier (CE ID) and type provided. Use this information to generate "  
                "detailed and specific insights or data that can fulfill on satisfying the COS and ultimately achieving the SSOL goal."  
            )  
        },  
        {  
            "role": "user",  
            "content": (  
                f"SSOL Goal: {ssol_goal}\n"  
                f"COS Text: {cos_text}\n"  
                f"CE ID: {ce_id}\n"  
                f"CE Type: {ce_type}\n"  
                f"Context: {ai_context}\n"  
                f"Based on the SSOL goal and the context provided by the parent COS, "  
                f"generate detailed and relevant data for the CE type '{ce_type}' that contributes towards meeting the COS and achieving the SSOL."  
            )  
        }  
    ]  
  
    try:  
        response = generate_chat_response(messages, role='AI Contextual Query', task=f'Generate Data for {ce_type}')  
        return response  
    except Exception as e:  
        logging.error(f"Error generating AI data: {e}")  
        return "Error generating AI data."  