# ce_templates.py  
  
import json  
import logging  
from store import ce_store  
from bs4 import BeautifulSoup  
from flask import render_template_string, current_app  
from utilities import generate_chat_response  
from ce_nodes import NODES, get_valid_node_types  
  
# Define a base template for the modal dialogs that will be populated dynamically  
BASE_MODAL_TEMPLATE = """  
<div class="modal fade" id="ceModal-${ceId}" tabindex="-1" aria-labelledby="ceModalLabel-${ceId}" aria-hidden="true">
  <div class="modal-dialog modal-lg" role="document">
    <div class="modal-content">
      <div class="modal-header" style="background-color: ${phaseColor};">
        <div class="filled-box"></div>
        <h5 class="modal-title" id="ceModalLabel-${ceId}">
          <span class="node-icon me-2" style="color: ${phaseColor};">
            <i class="${NODES[ceType]?.icon || 'fa-solid fa-question-circle'}"></i>
          </span>
          <span class="modal-header-title">${ceType.replace('_', ' ').toUpperCase()} // ${phaseName.toUpperCase()}</span>
        </h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <div class="d-flex align-items-center mb-3">
          <h5 class="mb-0 me-2" style="font-family: 'Unica One', cursive;">Source COS:</h5>
          <div class="cos-content">${generateCOSContent(cosContent)}</div>
        </div>
        <p>${aiGeneratedData.contextual_description || 'No contextual description available.'}</p>
        <div id="dynamicTable-${ceId}" class="tabulator-table mb-3"></div>

        <div class="row justify-content-start mb-3">
          <div class="col-auto">
            <button type="button" class="btn btn-sm btn-danger" id="deleteSelectedRowsButton-${ceId}">Delete</button>
            <button type="button" class="btn btn-sm btn-secondary" id="duplicateSelectedRowsButton-${ceId}">Duplicate</button>
          </div>
        </div>

        <form id="ceForm-${ceId}">
          ${generateFormFields(fieldsConfig, ai_generated_data.fields)}
        </form>
        <div class="row mt-2">
          <div class="col">
            <button type="button" class="btn btn-success w-100" id="addRowButton-${ceId}" style="padding-top: 10px;">Add ${ceType}</button>
          </div>
          <div class="col">
            <button type="button" class="btn btn-primary w-100" id="generateRowButton-${ceId}" style="padding-top: 10px;">Generate ${ceType}</button>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
        <button type="button" class="btn btn-primary btn-save-changes" data-ce-id="${ceId}">Save changes</button>
      </div>
    </div>
  </div>
</div>
"""  

DEFAULT_FIELDS_CONFIG = [  
    {"type": "text", "name": "subject", "placeholder": "Subject"},  
    {"type": "textarea", "name": "details", "placeholder": "Details"},  
    {"type": "text", "name": "stakeholders", "placeholder": "Stakeholders"}  
]  
  
DEFAULT_TABULATOR_CONFIG = {  
    "columns": [  
        {"title": "Subject", "field": "subject", "editor": "input"},  
        {"title": "Details", "field": "details", "editor": "input"},  
        {"title": "Stakeholders", "field": "stakeholders", "editor": "input"}  
    ]  
}  
  
def generate_form_field(field_type, field_name, field_value='', placeholder='', options=None):  
    current_app.logger.debug(f"Generating form field: type={field_type}, name={field_name}, value={field_value}, placeholder={placeholder}")  
    field_templates = {  
        'text': '<div class="form-group"><label for="{name}">{label}</label><input type="text" class="form-control" id="{name}" name="{name}" value="{value}" placeholder="{placeholder}" data-placeholder="{placeholder}"/></div>',  
        'number': '<div class="form-group"><label for="{name}">{label}</label><input type="number" class="form-control" id="{name}" name="{name}" value="{value}" placeholder="{placeholder}" data-placeholder="{placeholder}"/></div>',  
        'textarea': '<div class="form-group"><label for="{name}">{label}</label><textarea class="form-control" id="{name}" name="{name}" placeholder="{placeholder}" data-placeholder="{placeholder}" rows="4">{value}</textarea></div>',  
        'email': '<div class="form-group"><label for="{name}">{label}</label><input type="email" class="form-control" id="{name}" name="{name}" value="{value}" placeholder="{placeholder}" data-placeholder="{placeholder}"/></div>',  
        'password': '<div class="form-group"><label for="{name}">{label}</label><input type="password" class="form-control" id="{name}" name="{name}" placeholder="{placeholder}" data-placeholder="{placeholder}"/></div>',  
        'date': '<div class="form-group"><label for="{name}">{label}</label><input type="date" class="form-control" id="{name}" name="{name}" value="{value}" data-placeholder="{placeholder}"/></div>',  
        'time': '<div class="form-group"><label for="{name}">{label}</label><input type="time" class="form-control" id="{name}" name="{name}" value="{value}" data-placeholder="{placeholder}"/></div>',  
        'datetime-local': '<div class="form-group"><label for="{name}">{label}</label><input type="datetime-local" class="form-control" id="{name}" name="{name}" value="{value}" data-placeholder="{placeholder}"/></div>',  
        'color': '<div class="form-group"><label for="{name}">{label}</label><input type="color" class="form-control" id="{name}" name="{name}" value="{value}" data-placeholder="{placeholder}"/></div>',  
        'checkbox': '<div class="form-check"><input type="checkbox" class="form-check-input" id="{name}" name="{name}" value="{value}" {checked}/><label class="form-check-label" for="{name}">{placeholder}</label></div>',  
        'radio': '<div class="form-check"><input type="radio" class="form-check-input" id="{name}" name="{name}" value="{value}" {checked}/><label class="form-check-label" for="{name}">{placeholder}</label></div>',  
        'select': '<div class="form-group"><label for="{name}">{label}</label><select class="form-control" id="{name}" name="{name}">{options}</select></div>',  
    }  
  
    checked = 'checked' if field_value and field_type in ['checkbox', 'radio'] else ''  
    label = field_name.replace('_', ' ').title()  # Generate a label from the field name  
  
    if field_type in ['radio', 'select']:  
        options_html = ''.join(f'<option value="{opt_value}" {"selected" if field_value and opt_value == field_value else ""}>{opt_label}</option>' for opt_value, opt_label in (options or {}).items())  
        return field_templates.get(field_type, field_templates['text']).format(name=field_name, label=label, value=field_value, placeholder=placeholder, options=options_html)  
    else:  
        return field_templates.get(field_type, field_templates['text']).format(name=field_name, label=label, value=field_value, placeholder=placeholder, checked=checked)  
  
def generate_form_fields(fields_config, ai_generated_data=None):  
    if not fields_config:  
        current_app.logger.error("No fields_config provided to generate form fields.")  
        return "No form fields available."  
    current_app.logger.debug(f"Generating form fields with config: {fields_config}")  
    form_fields_html = ""  
    for field in fields_config:  
        current_app.logger.debug(f"Generating field: {field}")  
        # Check if AI-generated data exists for the field  
        field_value = ai_generated_data.get(field['name'], '') if ai_generated_data else ''  
        field_html = generate_form_field(  
            field_type=field['type'],  
            field_name=field['name'],  
            field_value=field_value,  
            placeholder=field.get('placeholder', ''),  
            options=field.get('options', None)  
        )  
        form_fields_html += field_html  
    return form_fields_html  
 

def generate_table_headers(fields_config):  
    table_headers_html = ""  
    for field in fields_config:  
        header_label = field['name'].replace('_', ' ').title()  
        table_headers_html += f"<th>{header_label}</th>"  
    return table_headers_html  
  
def generate_dynamic_modal(ce_type, ce_data=None, cos_content=None, ai_generated_data=None, phase_name=None, phase_index=None, ce_store=None):  
    current_app.logger.debug(f"Generating modal for CE type: {ce_type}")  
    current_app.logger.debug(f"CE data: {ce_data}")  
    current_app.logger.debug(f"COS content: {cos_content}")  
    current_app.logger.debug(f"AI generated data: {ai_generated_data}")  
    current_app.logger.debug(f"Phase name: {phase_name}")  
    current_app.logger.debug(f"Phase index: {phase_index}")  
  
    node_info = NODES.get(ce_type, NODES['Default'])  
    fields_config = node_info['modal_config']['fields']  
    tabulator_config = node_info['tabulator_config']  
  
    saved_form_data = ce_data.get('form_data', {}) if ce_data else {}  
    form_fields = generate_form_fields(fields_config, saved_form_data or ai_generated_data.get('fields', {}))  
    table_headers = generate_table_headers(fields_config)  
    table_data = ce_data.get('table_data', []) if ce_data else []  
  
    node_name = ce_type.replace('_', ' ').title()  
    ai_context_description = ai_generated_data.get('contextual_description', 'No contextual description provided.')  
    cos_content_with_pills = replace_ce_tags_with_pills(cos_content, ce_store)  
  
    full_cos_text = extract_full_cos_text(cos_content)  # Define the full_cos_text variable here  
  
    modal_content = render_template_string(  
        BASE_MODAL_TEMPLATE,  
        ce_type=ce_type,  
        node_info=node_info,  
        form_fields=form_fields,  
        table_headers=table_headers,  
        table_data=table_data,  
        tabulator_columns=[  
            { 'formatter': 'rowSelection', 'titleFormatter': 'rowSelection', 'hozAlign': 'center', 'headerSort': False, 'cellClick': lambda e, cell: cell.getRow().toggleSelect() },  
            *tabulator_config['columns'],  
        ],  
        ce_data=ce_data or {'id': 'unknown_ce_id'},  
        cos_content=cos_content_with_pills,  
        full_cos_text=full_cos_text,  # Use the defined full_cos_text variable here  
        ai_generated_data=ai_generated_data,  
        phase_name=phase_name,  
        phase_index=phase_index,  
        node_name=node_name,  
        ce_id=ce_data.get('id', 'unknown_ce_id') if ce_data else 'unknown_ce_id',  
        ai_context_description=ai_generated_data.get('contextual_description', 'No contextual description provided.')  
    )  
  
    return modal_content  

def extract_full_cos_text(cos_content):
    soup = BeautifulSoup(cos_content, 'html.parser')
    return ' '.join(soup.stripped_strings)

def generate_fa_icon_for_node_type(node_type):  
    messages = [  
        {"role": "system", "content": "You are an AI that suggests a FontAwesome 6 Solid (fas) class icon based on the node type name. Output only the icon class in JSON format."},  
        {"role": "user", "content": f"What is the best FontAwesome icon class for the node type '{node_type}'?"}  
    ]  
    response_content = generate_chat_response(messages, role='Icon Generation', task='Fetch FontAwesome 6 Icon', temperature=0.37)  
  
    try:  
        # Log the raw response content for debugging  
        current_app.logger.debug(f"Raw response content: {response_content}")  
  
        # Parse the JSON string into a dictionary  
        response_data = json.loads(response_content)  
        # Make sure to match the keys exactly with the response content  
        icon_class = response_data.get("iconClass")  # Changed from "icon" to "iconClass"  
  
        if not icon_class:  
            # Log a warning if expected keys are missing  
            current_app.logger.warning("Missing 'iconClass' in AI response.")  
            raise ValueError("Failed to generate icon. Please try again.")  
  
        return icon_class  
  
    except json.JSONDecodeError as e:  
        # Log the JSON parsing error  
        current_app.logger.error(f"JSON parsing error: {e}")  
        raise ValueError("Failed to parse JSON response. Please try again.")  
  
    except Exception as e:  
        # Log any other exceptions  
        current_app.logger.error(f"Unexpected error: {e}")  
        raise  
  
def replace_ce_tags_with_pills(content, ce_store):  
    soup = BeautifulSoup(content, 'html.parser')  
    for ce_tag in soup.find_all('ce'):  
        ce_uuid = ce_tag['id']  
        ce_type = ce_tag['type']  
        ce_data = ce_store.get(ce_uuid, {})  
        resource_count = len(ce_data.get('table_data', []))  
  
        new_tag = soup.new_tag('span', attrs={  
            'class': 'badge rounded-pill bg-secondary ce-pill position-relative',  
            'data-ce-id': ce_uuid,  
            'data-ce-type': ce_type,  
        })  
        new_tag.string = ce_tag.string  
  
        # Add the counter in a separate span with badge classes  
        if resource_count > 0:  
            counter_tag = soup.new_tag('span', attrs={  
                'class': 'badge rounded-pill bg-light text-dark ms-2'  
            })  
            counter_tag.string = str(resource_count)  
            new_tag.append(counter_tag)  
  
        # Add the green dot indicator if the CE is new  
        if ce_data.get('is_new'):  
            green_dot = soup.new_tag('span', attrs={  
                'class': 'position-absolute top-0 start-100 translate-middle p-2 bg-success border border-light rounded-circle'  
            })  
            visually_hidden_text = soup.new_tag('span', attrs={'class': 'visually-hidden'})  
            visually_hidden_text.string = 'New CE'  
            green_dot.append(visually_hidden_text)  
            new_tag.append(green_dot)  
  
        ce_tag.replace_with(new_tag)  
    return str(soup)  

def get_ce_modal(ce_type):  
    modal_html = generate_dynamic_modal(ce_type)  
    return modal_html  
  
def generate_ai_data(cos_text, ce_id, ce_type, ssol_goal, existing_ces=None):  
    if existing_ces is None:  
        existing_ces = []  # Default to an empty list if no existing CEs are provided  
  
    node_info = NODES.get(ce_type, NODES['Default'])  
    ai_context = node_info.get('modal_config', {}).get('ai_context', '')  
    modal_config_fields = node_info.get('modal_config', {}).get('fields', [])  
  
    if not ai_context:  
        current_app.logger.debug(f"No AI context provided for CE type: {ce_type}")  
        return {"summary": "No AI context provided.", "fields": {}}  
  
    valid_node_types = ', '.join(get_valid_node_types())  
    field_labels = [field['name'] for field in modal_config_fields]  
  
    messages = [  
        {  
            "role": "system",  
            "content": (  
                "You are a helpful assistant. Generate contextually relevant data based on the Structured Solution (SSOL) goal, "  
                "the parent Condition of Satisfaction (COS) text, and the specific Conditional Element Identifier (CE ID) and type provided. Use this information to generate "  
                "detailed and specific insights or data that can fulfill on satisfying the COS and ultimately achieving the SSOL goal. "  
                "Choose the most appropriate conditional element type from within the following list: {valid_node_types}."  
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
                f"Existing Conditional Elements: {json.dumps(existing_ces)}\n"  # Include existing CEs  
                f"Based on the SSOL goal and the context provided by the parent COS and other conditional elements, "  
                f"generate a JSON response with the following structure:\n"  
                f"{{\n"  
                f"  \"summary\": \"Summary of the Conditional Element\",\n"  
                f"  \"contextual_description\": \"Contextual description of the CE\",\n"  
                f"  \"fields\": {{\n"  
                f"    \"field_label_1\": \"Unique value for field_label_1\",\n"  
                f"    \"field_label_2\": \"Unique value for field_label_2\",\n"  
                f"    ...\n"  
                f"  }}\n"  
                f"}}\n"  
                f"Ensure that the generated fields are unique and provide new information that complements the existing conditional elements."  
            )  
        }  
    ]  
  
    try:  
        response = generate_chat_response(messages, role='AI Contextual Query', task=f'Generate Data for {ce_type}')  
        current_app.logger.debug(f"AI Response: {response}")  
        ai_data = json.loads(response)  
        current_app.logger.debug(f"Parsed AI Data: {ai_data}")  
        return ai_data  
    except Exception as e:  
        current_app.logger.error(f"Error generating AI data: {e}")  
        return {"summary": "Error generating AI data.", "contextual_description": "Error generating context.", "fields": {}}  
