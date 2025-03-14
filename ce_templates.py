# ce_templates.py
from flask import current_app
import json
import logging
import uuid
from uuid import UUID
from store import ce_store
from bs4 import BeautifulSoup
from flask import render_template_string, current_app
from ce_nodes import NODES, get_valid_node_types
from ai_service import generate_chat_response, get_grounded_data  # Import get_grounded_data

BASE_MODAL_TEMPLATE = """
<div class="modal fade ceModal" id="ceModal-${ceId}" tabindex="-1" aria-labelledby="ceModalLabel-${ceId}" aria-hidden="true">
    <div class="modal-dialog modal-xl" role="document">
        <div class="modal-content ce-modal">
            <!-- Modal Header -->
            <div class="modal-header ce-modal-header" style="background-color: ${phaseColor};">
                <div class="node-icon">
                    <i class="${icon_class}"></i>
                </div>
                <h5 class="modal-title ce-title" id="ceModalLabel-${ceId}">
                    ${ceType.replace('_', ' ').title()}
                </h5>
                <span class="phase-name">// ${phaseName.title()} PHASE</span>
                <button type="button" class="close-btn close-button" data-bs-dismiss="modal" aria-label="Close">×</button>
            </div>

            <!-- Modal Body -->
            <div class="modal-body ce-modal-body">
                <!-- SECTION 1: CONTEXT -->
                <div class="section">
                    <h2 class="section-heading">CONTEXT - Understanding the Context of this Element</h2>

                    <!-- SUB-SECTION 1.1: Condition of Satisfaction Context -->
                    <div class="sub-section">
                        <h3 class="sub-heading">Condition of Satisfaction Context</h3>
                        <div class="context-label">Source Condition of Satisfaction (COS):</div>
                        <div class="content-block italic">
                            ${cos_content_with_pills}
                        </div>
                    </div>

                    <!-- SUB-SECTION 1.2: [CE Type Name] Node Context & Insight -->
                    <div class="sub-section">
                        <h3 class="sub-heading">${ceType.replace('_', ' ').title()} Node Context & Insight</h3>
                        <div class="context-label">${ceType.replace('_', ' ').title()} Node & Context:</div>
                        <div class="content-block">
                            <p><b>Definition:</b></p>
                            <p class="definition-text">${node_info.modal_config.explanation}</p>
                            <hr style="margin: 10px 0; border-top: 1px dashed #ccc;">
                            <p><b>AI Contextual Insight:</b></p>
                            <p class="content italic">${ai_generated_data.contextual_description || 'No AI contextual description available.'}</p>
                        </div>
                    </div>
                </div>

                <!-- SECTION 2: DETAILS -->
                <div class="section">
                    <h2 class="section-heading">DETAILS - Attributes and Specifications of the ${ceType.replace('_', ' ').title()}</h2>

                    <!-- FORM FIELDS -->
                    <div class="form-grid">
                        ${form_fields}
                    </div>

                    <!-- Resource Action Buttons - Positioned BETWEEN form fields and table -->
                    <div class="action-row">
                        <button type="button" class="btn btn-primary" id="addRowButton-${ceId}"><i class="fas fa-plus"></i> Add ${ceType.replace('_', ' ').title()}</button>
                        <button type="button" class="btn btn-primary" id="generateRowButton-${ceId}"><i class="fas fa-magic"></i> Generate ${ceType.replace('_', ' ').title()}</button>
                    </div>
                </div>

                <!-- SECTION 3: RESOURCES -->
                <div class="section">
                    <h2 class="section-heading">RESOURCES - Data and References for this Element</h2>
                    <h3 class="sub-heading">Related Resources for ${ceType.replace('_', ' ').title()}</h3>

                    <!-- TABULATOR TABLE -->
                    <div id="dynamicTable-${ceId}" class="tabulator-table resources-table"></div>

                    <!-- Resource Management Buttons -->
                    <div class="action-row">
                        <button type="button" class="btn btn-danger" id="deleteSelectedRowsButton-${ceId}"><i class="fas fa-trash-alt"></i> Delete Selected</button>
                        <button type="button" class="btn btn-default" id="duplicateSelectedRowsButton-${ceId}"><i class="fas fa-copy"></i> Duplicate Selected</button>
                    </div>
                </div>
            </div>

            <!-- Modal Footer -->
            <div class="modal-footer ce-modal-footer">
                <button type="button" class="btn btn-default btn-close-modal" data-bs-dismiss="modal">Close</button>
                <button type="button" class="btn btn-primary btn-save-changes" data-ce-id="${ceId}">Save Changes</button>
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
        'text': '<div class="form-group"><label for="{name}">{label}</label><input type="text" class="form-control form-input" id="{name}" name="{name}" value="{value}" placeholder="{placeholder}" data-placeholder="{placeholder}"/></div>',
        'number': '<div class="form-group"><label for="{name}">{label}</label><input type="number" class="form-control form-input" id="{name}" name="{name}" value="{value}" placeholder="{placeholder}" data-placeholder="{placeholder}"/></div>',
        'textarea': '<div class="form-group"><label for="{name}">{label}</label><textarea class="form-control form-input form-textarea" id="{name}" name="{name}" placeholder="{placeholder}" data-placeholder="{placeholder}" rows="4">{value}</textarea></div>',
        'email': '<div class="form-group"><label for="{name}">{label}</label><input type="email" class="form-control form-input" id="{name}" name="{name}" value="{value}" placeholder="{placeholder}" data-placeholder="{placeholder}"/></div>',
        'password': '<div class="form-group"><label for="{name}">{label}</label><input type="password" class="form-control form-input" id="{name}" name="{name}" value="{value}" placeholder="{placeholder}" data-placeholder="{placeholder}"/></div>',
        'date': '<div class="form-group"><label for="{name}">{label}</label><input type="date" class="form-control form-input" id="{name}" name="{name}" value="{value}" data-placeholder="{placeholder}"/></div>',
        'time': '<div class="form-group"><label for="{name}">{label}</label><input type="time" class="form-control form-input" id="{name}" name="{name}" value="{value}" data-placeholder="{placeholder}"/></div>',
        'datetime-local': '<div class="form-group"><label for="{name}">{label}</label><input type="datetime-local" class="form-control form-input" id="{name}" name="{name}" value="{value}" data-placeholder="{placeholder}"/></div>',
        'color': '<div class="form-group"><label for="{name}">{label}</label><input type="color" class="form-control form-input" id="{name}" name="{name}" value="{value}" data-placeholder="{placeholder}"/></div>',
        'checkbox': '<div class="form-check"><input type="checkbox" class="form-check-input" id="{name}" name="{name}" value="{value}" {checked}/><label class="form-check-label" for="{name}">{placeholder}</label></div>',
        'radio': '<div class="form-check"><input type="radio" class="form-check-input" id="{name}" name="{name}" value="{value}" {checked}/><label class="form-check-label" for="{name}">{placeholder}</label></div>',
        'select': '<div class="form-group"><label for="{name}">{label}</label><select class="form-control form-input" id="{name}" name="{name}">{options}</select></div>',
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
        table_headers_html += f"<th><strong>{header_label}</strong></th>"
    return table_headers_html

async def generate_dynamic_modal(ce_type, ce_data=None, cos_content=None, ai_generated_data=None, phase_name=None, phase_index=None, ce_store=None):
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

    # Process the COS content to replace CE tags with CE pills
    ces = list(ce_store.values())  # Ensure that ce_store contains the correct structure
    for ce in ces:
        if 'node_type' not in ce:  # Corrected to use node_type
            ce['node_type'] = 'Unknown' # Corrected to use node_type
            current_app.logger.warning(f"Added missing 'node_type' to CE: {ce}")

    cos_content_with_pills = replace_ce_tags_with_pills(cos_content, ces)

    # Determine phase color
    phase_colors = ["#e91e63", "#00bcd4", "#9c27b0", "#ffc107", "#66bd0e"]  # Example colors
    phaseColor = phase_colors[phase_index % len(phase_colors)] if phase_index is not None else "#6c757d"  # Default color

    # Get icon class, awaiting the async function
    icon_class = NODES[ce_type].get('icon') if ce_type in NODES else await get_node_type_icon_and_name(ce_type)



    modal_content = render_template_string(
        BASE_MODAL_TEMPLATE,
        ce_type=ce_type,
        icon_class = icon_class, #NODES[ce_type].get('icon') if ce_type in NODES else get_node_type_icon_and_name(ce_type),
        node_info=node_info,
        form_fields=form_fields,
        table_headers=table_headers,
        table_data=table_data,
        tabulator_columns=[
            { 'formatter': 'rowSelection', 'titleFormatter': 'rowSelection', 'hozAlign': 'center', 'headerSort': False, 'cellClick': lambda e, cell: cell.getRow().toggleSelect() },
            *tabulator_config['columns'],
        ],
        ce_data=ce_data or {'id': 'unknown_ce_id'},
        cos_content_with_pills=cos_content_with_pills,  # Use processed COS content with CE pills
        ai_generated_data=ai_generated_data,
        phase_name=phase_name,
        phase_index=phase_index,
        node_name=node_name,
        ce_id=ce_data.get('id', 'unknown_ce_id') if ce_data else 'unknown_ce_id',
        ai_context_description=ai_generated_data.get('contextual_description', 'No contextual description provided.'),
        phaseColor = phaseColor
    )

    return modal_content

async def get_node_type_icon_and_name(node_type):
    messages = [
        {"role": "user", "content": f"You are an AI that suggests a FontAwesome 6 Solid (fas) class icon based on the node type name. Output only the icon class in JSON format."},
        {"role": "user", "content": f"What is the best FontAwesome icon class for the node type '{node_type}'?"}
    ]
    response_content = await generate_chat_response(messages, role='Icon Generation', task='Fetch FontAwesome 6 Icon', temperature=0.37)

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

def assign_ce_type(ce):
    if 'node_type' not in ce or not ce['node_type']: #Corrected to node_type
        # Assign a default CE type if none is provided
        ce['node_type'] = 'Default' #Corrected to node_type
        logging.info(f"Assigned default 'node_type' to CE: {ce}")
    return ce

def replace_ce_tags_with_pills(content, ces):
    soup = BeautifulSoup(content, 'html.parser')

    # First, find and replace all <ce> tags in the content
    for ce_tag in soup.find_all('ce'):
        ce_type = ce_tag.get('type', 'Default')  # Default type if not specified
        ce_uuid = str(uuid.uuid4())
        new_tag = soup.new_tag('span', attrs={
            'class': 'badge rounded-pill bg-secondary ce-pill position-relative',
            'data-ce-id': ce_uuid,
            'data-ce-type': ce_type
        })
        new_tag.string = ce_tag.text  # Use the text content of the <ce> tag

        # Add indicator for new CEs (assuming you have a way to identify new CEs, e.g., a flag in 'ce_data')
        # if ce_data.get('is_new'):
        #     green_dot = soup.new_tag('span', attrs={
        #         'class': 'position-absolute top-0 start-100 translate-middle p-2 bg-success border border-light rounded-circle'
        #     })
        #     visually_hidden_text = soup.new_tag('span', attrs={'class': 'visually-hidden'})
        #     visually_hidden_text.string = 'New CE'
        #     green_dot.append(visually_hidden_text)
        #     new_tag.append(green_dot)

        ce_tag.replace_with(new_tag)

    # Then, process the provided 'ces' list to update or add pill counts
    for ce in ces:
        ce = assign_ce_type(ce)
        # Find existing pills by data-ce-id, if available.  Otherwise, fall back to finding by content.
        if 'id' in ce:
            existing_pill = soup.find('span', attrs={'data-ce-id': ce['id']})
        else:
            existing_pill = soup.find('span', class_='ce-pill', string=ce['content'])

        if existing_pill:
            # Update existing pill
            if ce.get('count', 0) > 0:
                counter_tag = existing_pill.find('span', class_='counter')
                if counter_tag:
                    counter_tag.string = str(ce['count'])
                else:
                    counter_tag = soup.new_tag('span', attrs={'class': 'badge rounded-pill bg-light text-dark ms-2 counter'})
                    counter_tag.string = str(ce['count'])
                    existing_pill.append(counter_tag)
            if ce.get('is_new'):
                green_dot = existing_pill.find('span', class_='position-absolute')
                if not green_dot:
                  green_dot = soup.new_tag('span', attrs={
                      'class': 'position-absolute top-0 start-100 translate-middle p-2 bg-success border border-light rounded-circle'
                  })
                  visually_hidden_text = soup.new_tag('span', attrs={'class': 'visually-hidden'})
                  visually_hidden_text.string = 'New CE'
                  green_dot.append(visually_hidden_text)
                  existing_pill.append(green_dot)


        else:
          #Add new pills that may not exist in the original text:
          ce_uuid = str(uuid.uuid4())
          new_tag = soup.new_tag('span', attrs={
              'class': 'badge rounded-pill bg-secondary ce-pill position-relative',
              'data-ce-id': ce_uuid,
              'data-ce-type': ce['node_type']
          })
          new_tag.string = ce['content']

          # Add counter if applicable
          if ce.get('count', 0) > 0:
              counter_tag = soup.new_tag('span', attrs={
                  'class': 'badge rounded-pill bg-light text-dark ms-2 counter'
              })
              counter_tag.string = str(ce['count'])
              new_tag.append(counter_tag)
          if ce.get('is_new'):
                green_dot = soup.new_tag('span', attrs={
                    'class': 'position-absolute top-0 start-100 translate-middle p-2 bg-success border border-light rounded-circle'
                })
                visually_hidden_text = soup.new_tag('span', attrs={'class': 'visually-hidden'})
                visually_hidden_text.string = 'New CE'
                green_dot.append(visually_hidden_text)
                new_tag.append(green_dot)
          soup.append(new_tag)

    return str(soup)


async def get_ce_modal(ce_type):
    modal_html = await generate_dynamic_modal(ce_type)
    return modal_html

async def generate_ai_data(cos_text, ce_id, ce_type, ssol_goal, existing_ces=None):
    if existing_ces is None:
        existing_ces = []  # Default to an empty list if no existing CEs are provided

    node_info = NODES.get(ce_type, NODES['Default'])
    ai_context = node_info.get('modal_config', {}).get('ai_context', '')
    modal_config_fields = node_info.get('modal_config', {}).get('fields', [])

    if not ai_context:
        current_app.logger.debug(f"No AI context provided for CE type: {ce_type}")
        return {"summary": "No AI context provided.", "fields": {}}

     # --- Construct the Search Query ---
    #This is the most important part.  Be VERY specific and use all available context.
    query = (
        f"Find information related to: {ce_type} for '{cos_text}' in the context of '{ssol_goal}'.  "
    )
    #Add additional context if it exists.
    if existing_ces:
        query += f"Consider these existing elements: {', '.join([ce['content'] for ce in existing_ces])}. "

    for field in modal_config_fields:
        query += f"Find {field['name']}. " #Add the names of the fields you want filled.

    current_app.logger.info(f"Constructed query: {query}")

    # --- Get Grounded Data ---
    grounded_data = await get_grounded_data(query, ce_type)

    if grounded_data:
        current_app.logger.info(f"Grounded Data Retrieved {grounded_data}")
        #Initialize ai_generated_data:
        ai_generated_data = {
          "summary": grounded_data.get('summary', 'Summary not available.'),
          "contextual_description": grounded_data.get('contextual_description', 'No contextual description available.'),
          "fields": {},
          "table_data": [],
          "attribution": grounded_data.get('attribution', '')
        }

        #Process each result.  Extract data and map to fields and table.
        for result in grounded_data.get('results', []):
            # 1. Populate Form Fields (if possible)
            for field in modal_config_fields:
                field_name = field['name']
                if field_name in result.get('extracted_data', {}):
                #Add to the ai_generated_data['fields'] dictionary:
                    ai_generated_data['fields'][field_name] = result['extracted_data'][field_name]

            # 2. Populate Tabulator Table
            row_data = {'source_title': result.get('title'), 'source_url': result.get('url'), 'source_snippet': result.get('snippet')}
            row_data.update(result.get('extracted_data', {}))  # Merge extracted data
            ai_generated_data['table_data'].append(row_data)

    else:
        current_app.logger.warning("No grounded data returned.")
        # Fallback to the original AI generation if grounding fails
        # --- Original AI Generation (as fallback) ---

        valid_node_types = ', '.join(get_valid_node_types())
        field_labels = [field['name'] for field in modal_config_fields]
        # System instruction as part of messages:
        system_message = {
            "role": "user",
            "content": (
                "You are a helpful assistant. Generate contextually relevant data based on the Structured Solution (SSOL) goal, "
                "the parent Condition of Satisfaction (COS) text, and the specific Conditional Element Identifier (CE ID) and type provided. Use this information to generate "
                "detailed and specific insights or data that can fulfill on satisfying the COS and ultimately achieving the SSOL goal. "
                "Choose the most appropriate conditional element type from within the following list: {valid_node_types}."
            ).format(valid_node_types=valid_node_types)
        }
        messages = [
            system_message, # Put system message first!
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
            response = await generate_chat_response(messages, role='AI Contextual Query', task=f'Generate Data for {ce_type}')
            current_app.logger.debug(f"AI Response: {response}")
            ai_data = json.loads(response)
            current_app.logger.debug(f"Parsed AI Data: {ai_data}")
            return ai_data
        except Exception as e:
            current_app.logger.error(f"Error generating AI data: {e}")
            return {"summary": "Error generating AI data.", "contextual_description": "Error generating context.", "fields": {}}

    return ai_generated_data