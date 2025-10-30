# ce_templates.py
from flask import current_app
import json
import logging
import uuid
from uuid import UUID
from store import ce_store
from bs4 import BeautifulSoup
from flask import render_template_string, current_app
from ce_nodes import NODES
from ai_service import generate_chat_response, get_grounded_data

def get_color_theme(hex_color):
    """Determines if a hex color is light or dark to choose a contrasting text color."""
    if not hex_color or not hex_color.startswith('#'):
        return 'dark'
    hex_color = hex_color.lstrip('#')
    try:
        r, g, b = tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
        luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
        return 'light' if luminance > 0.6 else 'dark'
    except (ValueError, IndexError):
        return 'dark'

BASE_MODAL_TEMPLATE = """
<div class="modal fade ceModal" id="ceModal-{{ ceId }}" tabindex="-1" aria-labelledby="ceModalLabel-{{ ceId }}" aria-hidden="true">
    <div class="modal-dialog modal-xl" role="document">
        <div class="modal-content ce-modal" data-node-type="{{ ceType }}">
            <!-- Modal Header -->
            <div class="modal-header ce-modal-header" style="background-color: {{ node_color }};">
                <div class="node-icon" style="background-color: white;">
                    <i class="{{ icon_class }}" style="color: {{ node_color }};"></i>
                </div>
                <h5 class="modal-title ce-title" id="ceModalLabel-{{ ceId }}">
                    {{ ceType.replace('_', ' ').title() }}
                </h5>
                <span class="phase-name">// {{ phase_name.title() }} PHASE</span>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>

            <!-- Modal Body -->
            <div class="modal-body ce-modal-body">
                <!-- SECTION 1: CONTEXT -->
                <div class="section">
                    <h2 class="section-heading">CONTEXT</h2>
                    <div class="sub-section">
                        <div class="context-label">Source Condition of Satisfaction (COS):</div>
                        <div class="content-block italic">
                            {{ cos_content_with_pills | safe }}
                        </div>
                    </div>
                    <div class="sub-section">
                        <div class="context-label">AI Contextual Insight for {{ ceType.replace('_', ' ').title() }}:</div>
                        <div class="content-block">
                            <p>{{ ai_generated_data.contextual_description or 'No AI contextual description available.' }}</p>
                        </div>
                    </div>
                </div>
                <!-- SECTION 2: DETAILS -->
                <div class="section">
                    <h2 class="section-heading">DETAILS</h2>
                    <form id="ceForm-{{ ceId }}">
                        <div class="form-grid">
                            {{ form_fields | safe }}
                        </div>
                    </form>
                    <div class="action-row">
                        <button type="button" class="btn btn-primary" id="addRowButton-{{ ceId }}"><i class="fas fa-plus"></i> Add to Resources</button>
                        <button type="button" class="btn btn-info" id="generateRowButton-{{ ceId }}"><i class="fas fa-magic"></i> Generate with AI</button>
                    </div>
                </div>
                <!-- SECTION 3: RESOURCES -->
                <div class="section">
                    <h2 class="section-heading">RESOURCES</h2>
                    <div id="dynamicTable-{{ ceId }}" class="tabulator-table resources-table"></div>
                    <div class="action-row">
                        <button type="button" class="btn btn-danger" id="deleteSelectedRowsButton-{{ ceId }}"><i class="fas fa-trash-alt"></i> Delete Selected</button>
                    </div>
                </div>
            </div>

            <!-- Modal Footer -->
            <div class="modal-footer ce-modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button type="button" class="btn btn-primary btn-save-changes" data-ce-id="{{ ceId }}">Save Changes</button>
            </div>
        </div>
    </div>
    <!-- Hidden script tag to pass initial data to JS -->
    <script type="application/json" class="initial-table-data" id="initial-data-{{ ceId }}">
        {{ table_data | tojson }}
    </script>
</div>
"""

def generate_form_field(field_type, field_name, field_value='', placeholder='', options=None):
    label = field_name.replace('_', ' ').title()
    field_html = f'<div class="form-group"><label for="{field_name}">{label}</label>'
    if field_type == 'textarea':
        field_html += f'<textarea class="form-control form-input" id="{field_name}" name="{field_name}" placeholder="{placeholder}">{field_value}</textarea>'
    else:
        field_html += f'<input type="{field_type}" class="form-control form-input" id="{field_name}" name="{field_name}" value="{field_value}" placeholder="{placeholder}">'
    field_html += '</div>'
    return field_html

def generate_form_fields(fields_config, form_data=None):
    if form_data is None: form_data = {}
    form_fields_html = ""
    for field in fields_config:
        field_name = field['name']
        field_value = form_data.get(field_name, '')
        form_fields_html += generate_form_field(
            field['type'], field_name, field_value, field.get('placeholder', '')
        )
    return form_fields_html

async def generate_dynamic_modal(ce_type, ce_data=None, cos_content=None, ai_generated_data=None, phase_name=None, phase_index=None, ce_store=None):
    node_info = NODES.get(ce_type, NODES['Default'])
    fields_config = node_info['modal_config']['fields']
    
    # Use AI generated data for form fields if no saved data exists
    saved_form_data = ce_data.get('form_data', {}) if ce_data else {}
    form_data_for_render = saved_form_data or ai_generated_data.get('fields', {})

    form_fields = generate_form_fields(fields_config, form_data_for_render)
    
    # Use AI generated table data if no saved data exists
    saved_table_data = ce_data.get('table_data', []) if ce_data else []
    table_data_for_render = saved_table_data or ai_generated_data.get('table_data', [])

    node_color = node_info.get('color', '#6c757d')
    icon_class = node_info.get('icon', 'fa-solid fa-question-circle')

    ces = list(ce_store.values()) if ce_store else []
    cos_content_with_pills = replace_ce_tags_with_pills(cos_content, ces)
    
    ce_id = ce_data.get('id', 'new_ce') if ce_data else 'new_ce'
    
    return render_template_string(
        BASE_MODAL_TEMPLATE,
        ceId=ce_id,
        ceType=ce_type,
        icon_class=icon_class,
        node_color=node_color,
        form_fields=form_fields,
        table_data=table_data_for_render,
        cos_content_with_pills=cos_content_with_pills,
        ai_generated_data=ai_generated_data,
        phase_name=phase_name,
        phase_index=phase_index
    )

def replace_ce_tags_with_pills(content, ces_metadata_for_pills=None):
    if not content: return ""
    soup = BeautifulSoup(content, 'html.parser')
    for ce_tag in soup.find_all('ce'):
        ce_type = ce_tag.get('type', 'Default')
        ce_text = ce_tag.text
        node_info = NODES.get(ce_type, NODES['Default'])
        node_color = node_info.get('color', '#95a5a6')
        node_icon = node_info.get('icon', 'fa-solid fa-question-circle')
        ce_uuid = str(uuid.uuid4())

        pill_group = soup.new_tag('div', attrs={
            'class': 'btn-group ce-pill', 'role': 'group',
            'data-ce-id': ce_uuid, 'data-ce-type': ce_type,
            'style': f'--node-color: {node_color};'
        })
        icon_tag_part = soup.new_tag('span', attrs={'class': 'btn ce-pill-icon-tag'})
        icon_element = soup.new_tag('i', attrs={'class': f'{node_icon}'})
        icon_tag_part.append(icon_element)
        text_tag_part = soup.new_tag('span', attrs={'class': 'btn ce-pill-text', 'tabindex': '-1'})
        text_tag_part.string = ce_text
        pill_group.append(icon_tag_part)
        pill_group.append(text_tag_part)
        ce_tag.replace_with(pill_group)
    return str(soup)

async def generate_ai_data(cos_text, ce_id, ce_type, ssol_goal, existing_ces=None):
    if existing_ces is None: existing_ces = []
    
    node_info = NODES.get(ce_type, NODES['Default'])
    ai_context = node_info.get('modal_config', {}).get('ai_context', '')
    modal_fields = node_info.get('modal_config', {}).get('fields', [])
    field_definitions = json.dumps({field['name']: field.get('placeholder', '') for field in modal_fields})

    prompt_template = f"""
[ROLE & GOAL]
You are a specialized data extraction and generation model. Your sole purpose is to populate a structured JSON object based on the context provided. You must be precise, factual, and strictly adhere to the output format.

[RULES]
1. Your entire response MUST be a single, raw JSON object.
2. DO NOT include any conversational text, explanations, or markdown formatting like ```json.
3. Ensure all string values within the JSON are properly escaped. Do not use invalid escape sequences.
4. If you cannot find relevant information for a field, provide an empty string "".
5. The 'fields' object MUST contain all requested keys, even if their values are empty.

[CONTEXT]
- SSOL Goal: "{ssol_goal}"
- Parent COS Text: "{cos_text}"
- CE Type: "{ce_type}"
- CE Field Definitions: {field_definitions}
- AI Context for this CE Type: "{ai_context}"

[TASK & FORMAT]
Analyze the provided [CONTEXT] to generate the required data. Use your search tool to find this information. Populate the following JSON structure precisely:

{{
  "summary": "<A one-sentence summary of this element's purpose.>",
  "contextual_description": "<A 2-3 sentence paragraph explaining how this CE fits into the larger goal.>",
  "fields": {{
    {', '.join([f'"{field["name"]}": "<Value for {field["name"]} based on your search>"' for field in modal_fields])}
  }},
  "table_data": [
    {{
      "source_title": "<Title of the primary web page or document found>",
      "source_url": "<URL of the source>",
      "source_snippet": "<A relevant snippet from the source, properly escaped.>",
      {', '.join([f'"{field["name"]}": "<Value for {field["name"]} extracted from this specific source>"' for field in modal_fields])}
    }}
  ],
  "attribution": "Data retrieved via Google Search using Gemini API."
}}
"""
    
    # --- MODIFIED: Pass the ce_type to get_grounded_data ---
    grounded_data = await get_grounded_data(prompt_template, ce_type)
    
    if grounded_data and (grounded_data.get('fields') or grounded_data.get('table_data')):
        current_app.logger.info("Successfully retrieved and parsed grounded data.")
        return grounded_data
    
    current_app.logger.warning("Grounded data failed or was empty. Falling back to generative AI.")
    try:
        fallback_prompt = prompt_template.replace(
            "Use your search tool to find this information.", 
            "Generate plausible and contextually relevant data to populate this structure."
        ).replace(
            '"table_data": [', '"table_data": []' # Instruct fallback to not generate table data
        )
        messages = [{"role": "user", "content": fallback_prompt}]
        response_text = await generate_chat_response(messages, role="AI Fallback", task="Generate CE Data")
        
        if response_text:
            return json.loads(response_text)
        else:
            raise ValueError("Fallback AI returned an empty response.")
            
    except Exception as e:
        current_app.logger.error(f"Error during generative AI fallback: {e}", exc_info=True)
        return {
            "summary": "Error generating AI data.",
            "contextual_description": "The AI model failed to generate a valid response after multiple attempts.",
            "fields": {field['name']: "" for field in modal_fields},
            "table_data": [],
            "attribution": ""
        }