from flask import render_template, render_template_string  
from utilities import generate_chat_response  
from ce_nodes import NODES  
  
# Define a base template for the modal dialogs that will be populated dynamically  
BASE_MODAL_TEMPLATE = """  
<div class="modal fade" id="ceModal{{ ce_type }}" tabindex="-1" aria-labelledby="ceModalLabel{{ ce_type }}" aria-hidden="true">  
  <div class="modal-dialog" role="document">  
    <div class="modal-content">  
      <div class="modal-header">  
        <h5 class="modal-title" id="ceModalLabel{{ ce_type }}">  
          <i class="{{ node_info['icon'] }}"></i>  
          {{ node_info['definition'] }}  
        </h5>  
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>  
      </div>  
      <div class="modal-body">  
        <form id="ceForm{{ ce_type }}">  
          {{ form_fields | safe }}  
        </form>  
      </div>  
      <div class="modal-footer">  
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>  
        <button type="button" class="btn btn-primary">Save changes</button>  
      </div>  
    </div>  
  </div>  
</div>  
"""  
  
def generate_form_field(field_type, field_name, field_value='', placeholder='', options=None):  
    # Field templates based on the type of field  
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
        'radio': ''.join(f'<div class="form-check"><input type="radio" class="form-check-input" id="{opt_value}" name="{field_name}" value="{opt_value}" '  
                         f'{"checked" if field_value and opt_value == field_value else ""}/><label class="form-check-label" for="{opt_value}">{opt_label}</label></div>'  
                         for opt_value, opt_label in (options or {}).items()),  
        'select': '<select class="form-control" name="{name}">' + ''.join(f'<option value="{opt_value}" '  
                    f'{"selected" if field_value and opt_value == field_value else ""}>{opt_label}</option>'  
                    for opt_value, opt_label in (options or {}).items()) + '</select>',  
        # ... more field types as needed ...  
    }  
  
    # If the field type is a checkbox or radio button and the value is True, add the 'checked' attribute  
    checked = 'checked' if field_value and (field_type in ['checkbox', 'radio']) else ''  
  
    # Format the field template with field values and return the HTML string  
    if field_type in ['radio', 'select']:  
        return field_templates[field_type].format(name=field_name)  
    else:  
        return field_templates[field_type].format(name=field_name, value=field_value, placeholder=placeholder, checked=checked)  
  
def get_phase_color(phase):  
    phase_colors = {  
        "Discovery": "#e91e63",  
        "Engagement": "#00bcd4",  
        "Action": "#9c27b0",  
        "Completion": "#ffc107",  
        "Legacy": "#66bd0e",  
    }  
    return phase_colors.get(phase, "#ffffff")  
  
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
  
def generate_dynamic_modal(ce_type, ce_data=None):  
    # Retrieve node information from the NODES definition  
    node_info = NODES.get(ce_type, {'definition': 'Unknown CE Type', 'icon': ''})  
    # Generate form fields for the given CE type  
    fields_config = node_info.get('modal_config', {}).get('fields', [])  
    form_fields = generate_form_fields(fields_config)  
    # Render the base modal template with dynamic content  
    modal_content = render_template_string(  
        BASE_MODAL_TEMPLATE,  
        ce_type=ce_type,  
        node_info=node_info,  
        form_fields=form_fields  
    )  
    return modal_content  
  
# Function to retrieve and display the modal for a specific CE type  
def get_ce_modal(ce_type):  
    # Generate the dynamic modal for the CE type  
    modal_html = generate_dynamic_modal(ce_type)  
    # Return the rendered modal HTML  
    return modal_html  
  
def generate_ai_query(cos_text, ce_id, ce_type, ssol_goal):  
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
                f"Based on the SSOL goal and the context provided by the parent COS, "  
                f"generate detailed and relevant data for the CE type '{ce_type}' that contributes towards meeting the COS and achieving the SSOL."  
            )  
        }  
    ]  
    return generate_chat_response(messages, role='AI Contextual Query', task=f'Generate Data for {ce_type}')  
