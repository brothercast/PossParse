from flask import render_template, render_template_string 
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
        <button type="button" class="btn btn-primary" data-bs-dismiss="modal" id="saveChangesButton{{ ce_type }}">Save Changes</button>  
    
      </div>    
    </div>    
  </div>    
</div>    
""" 
  
# Generate the form fields based on the CE type attributes  
def generate_form_fields(field_type, field_name, field_value='', placeholder='', options=None, attributes={}):  
    # Common attributes string for reuse in multiple field templates  
    common_attrs = f'name="{field_name}" id="{field_name}" ' + ' '.join(f'{k}="{v}"' for k, v in attributes.items())  
      
    # Field templates based on the type of field  
    field_templates = {  
        'text': f'<input type="text" class="form-control" {common_attrs} value="{field_value}" placeholder="{placeholder}"/>',  
        'number': f'<input type="number" class="form-control" {common_attrs} value="{field_value}" placeholder="{placeholder}"/>',  
        'textarea': f'<textarea class="form-control" {common_attrs} placeholder="{placeholder}">{field_value}</textarea>',  
        'email': f'<input type="email" class="form-control" {common_attrs} value="{field_value}" placeholder="{placeholder}"/>',  
        'password': f'<input type="password" class="form-control" {common_attrs} placeholder="{placeholder}"/>',  
        'date': f'<input type="date" class="form-control" {common_attrs} value="{field_value}"/>',  
        'time': f'<input type="time" class="form-control" {common_attrs} value="{field_value}"/>',  
        'datetime-local': f'<input type="datetime-local" class="form-control" {common_attrs} value="{field_value}"/>',  
        'color': f'<input type="color" class="form-control" {common_attrs} value="{field_value}"/>',  
        'checkbox': f'<div class="form-check"><input type="checkbox" class="form-check-input" {common_attrs} value="{field_value}" { "checked" if field_value else "" }/><label class="form-check-label" for="{field_name}">{placeholder}</label></div>',  
        # Additional field types...  
        'map': f'<div class="map-picker" data-name="{field_name}" id="map_{field_name}"></div>',  # Placeholder for map picker  
        'contact_picker': f'<div class="contact-picker" data-name="{field_name}" id="contact_picker_{field_name}"></div>',  # Placeholder for contact picker  
        # ... other field types ...  
        'select': (  
            f'<select class="form-control" {common_attrs}>' +  
            ''.join(f'<option value="{opt_value}" {"selected" if opt_value == field_value else ""}>{opt_label}</option>'  
                    for opt_value, opt_label in (options or {}).items()) +  
            '</select>'  
        ),  
        # ... more field types as needed ...  
    }  
  
    # Generate the HTML for the specified field type  
    field_html = field_templates.get(field_type, f'<p>Unsupported field type: {field_type}</p>')  
  
    # Add a form group for better styling if a label is present  
    if placeholder:  
        label_html = f'<label for="{field_name}">{placeholder}</label>'  
        form_group_html = f'<div class="form-group">{label_html}{field_html}</div>'  
    else:  
        form_group_html = field_html  
  
    return form_group_html   

def get_phase_color(phase):  
    phase_colors = {  
        "Discovery": "#e91e63",  
        "Engagement": "#00bcd4",  
        "Action": "#9c27b0",  
        "Completion": "#ffc107",  
        "Legacy": "#66bd0e",  
    }  
    return phase_colors.get(phase, "#ffffff")
  
# Main function to generate a dynamic modal template for a given CE type  
def generate_dynamic_modal(ce_type, ce_data, cos_phase):  
    node_info = NODES.get(ce_type, {})  
    form_fields_html = generate_form_fields(ce_type, ce_data)  
    phase_color = get_phase_color(cos_phase)  # Function to get the color based on the phase  
  
    # Render the dynamic modal with form fields and phase color  
    modal_content = render_template(  
        "ce_modal.html",  # Assuming you have a corresponding template file for modals  
        ce_type=ce_type,  
        ce_data=ce_data,  
        node_info=node_info,  
        form_fields=form_fields_html,  
        phase_color=phase_color  
    )  
    return modal_content   
    
 
# Function to retrieve and display the modal for a specific CE type  
def get_ce_modal(ce_type, ce_data, cos_phase):  
    # Generate the dynamic modal for the CE type and COS phase  
    modal_html = generate_dynamic_modal(ce_type, ce_data, cos_phase)  
    return modal_html  
  
