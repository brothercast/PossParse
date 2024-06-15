# ce_templates.py   
import logging  
from flask import render_template_string, current_app  
from utilities import generate_chat_response  
from ce_nodes import NODES  
  
# Define a base template for the modal dialogs that will be populated dynamically  
BASE_MODAL_TEMPLATE = """  
<div class="modal fade" id="ceModal{{ ce_id }}" tabindex="-1" aria-labelledby="ceModalLabel{{ ce_id }}" aria-hidden="true">  
  <div class="modal-dialog modal-lg" role="document">  
    <div class="modal-content phase-{{ phase_index }}"> <!-- Add phase color class -->  
      <div class="modal-header">  
        <div class="filled-box"></div>  
        <h5 class="modal-title" id="ceModalLabel{{ ce_id }}">  
          <span class="node-icon me-2" style="background-color: white;">  
            <i class="{{ node_info['icon'] }}" style="color: var(--phase-{{ phase_index }});"></i>  
          </span>  
          <span class="modal-header-title">{{ node_name }}</span>  
        </h5>  
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>  
      </div>  
      <div class="modal-body">  
        <p>{{ node_info['definition'] }}</p>  
        <h6>Parent COS: {{ cos_content }}</h6>  
        <p>{{ ai_generated_data | safe }}</p>  
        <form id="ceForm{{ ce_id }}">  
          {{ form_fields | safe }}  
        </form>  
      </div>  
      <div class="modal-footer">  
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>  
        <button type="button" class="btn btn-primary btn-save-changes" data-ce-id="{{ ce_id }}">Save changes</button>  
      </div>  
    </div>  
  </div>  
</div>  
"""  


def generate_form_field(field_type, field_name, field_value='', placeholder='', options=None):  
    field_templates = {  
        'text': '<div class="form-group"><label for="{name}">{label}</label><input type="text" class="form-control" id="{name}" name="{name}" value="{value}" placeholder="{placeholder}"/></div>',  
        'number': '<div class="form-group"><label for="{name}">{label}</label><input type="number" class="form-control" id="{name}" name="{name}" value="{value}" placeholder="{placeholder}"/></div>',  
        'textarea': '<div class="form-group"><label for="{name}">{label}</label><textarea class="form-control" id="{name}" name="{name}" placeholder="{placeholder}" rows="3">{value}</textarea></div>',  
        'email': '<div class="form-group"><label for="{name}">{label}</label><input type="email" class="form-control" id="{name}" name="{name}" value="{value}" placeholder="{placeholder}"/></div>',  
        'password': '<div class="form-group"><label for="{name}">{label}</label><input type="password" class="form-control" id="{name}" name="{name}" placeholder="{placeholder}"/></div>',  
        'date': '<div class="form-group"><label for="{name}">{label}</label><input type="date" class="form-control" id="{name}" name="{name}" value="{value}"/></div>',  
        'time': '<div class="form-group"><label for="{name}">{label}</label><input type="time" class="form-control" id="{name}" name="{name}" value="{value}"/></div>',  
        'datetime-local': '<div class="form-group"><label for="{name}">{label}</label><input type="datetime-local" class="form-control" id="{name}" name="{name}" value="{value}"/></div>',  
        'color': '<div class="form-group"><label for="{name}">{label}</label><input type="color" class="form-control" id="{name}" name="{name}" value="{value}"/></div>',  
        'checkbox': '<div class="form-check"><input type="checkbox" class="form-check-input" id="{name}" name="{name}" value="{value}" {checked}/><label class="form-check-label" for="{name}">{placeholder}</label></div>',  
        'radio': '<div class="form-check"><input type="radio" class="form-check-input" id="{name}" name="{name}" value="{value}" {checked}/><label class="form-check-label" for="{name}">{placeholder}</label></div>',  
        'select': '<div class="form-group"><label for="{name}">{label}</label><select class="form-control" id="{name}" name="{name}">{options}</select></div>',  
    }  
  
    checked = 'checked' if field_value and field_type in ['checkbox', 'radio'] else ''  
    label = field_name.replace('_', ' ').title()  # Generate a label from the field name  
  
    if field_type in ['radio', 'select']:  
        options_html = ''.join(f'<option value="{opt_value}" {"selected" if field_value and opt_value == field_value else ""}>{opt_label}</option>' for opt_value, opt_label in (options or {}).items())  
        return field_templates[field_type].format(name=field_name, label=label, value=field_value, placeholder=placeholder, options=options_html)  
    else:  
        return field_templates[field_type].format(name=field_name, label=label, value=field_value, placeholder=placeholder, checked=checked) 
  
def generate_form_fields(fields_config):  
    form_fields_html = ""  
    for field in fields_config:  
        field_html = generate_form_field(  
            field_type=field['type'],  
            field_name=field['name'],  
            field_value=field.get('value', ''),  
            placeholder=field.get('placeholder', ''),  
            options=field.get('options', None)  
        )  
        form_fields_html += field_html  
    return form_fields_html  
  
def generate_dynamic_modal(ce_type, ce_data=None, cos_content=None, ai_generated_data=None, phase_name=None, phase_index=None):  
    node_info = NODES.get(ce_type, NODES['Default'])  
    fields_config = node_info.get('modal_config', {}).get('fields', [])  
  
    # Populate form fields with existing data if available  
    form_fields = ""  
    for field in fields_config:  
        field_value = ce_data.get(field['name'], '') if ce_data else ''  
        form_fields += generate_form_field(field['type'], field['name'], field_value, field.get('placeholder', ''), field.get('options', None))  
  
    node_name = ce_type.replace('_', ' ').title()  # Convert node type to a readable format  
  
    modal_content = render_template_string(  
        BASE_MODAL_TEMPLATE,  
        ce_type=ce_type,  
        node_info=node_info,  
        form_fields=form_fields,  
        ce_data=ce_data or {'id': 'unknown_ce_id'},  
        cos_content=cos_content,  
        ai_generated_data=ai_generated_data or "No AI context provided.",  
        phase_name=phase_name,  
        phase_index=phase_index,  
        node_name=node_name,  
        ce_id=ce_data.get('id', 'unknown_ce_id') if ce_data else 'unknown_ce_id'  # Ensure ce_id is passed correctly  
    )  
    return modal_content  




def get_ce_modal(ce_type):  
    modal_html = generate_dynamic_modal(ce_type)  
    return modal_html  
  
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
        logging.info(f"AI Response: {response}")  
        return response  
    except Exception as e:  
        logging.error(f"Error generating AI data: {e}")  
        return "Error generating AI data."  
