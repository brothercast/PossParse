from flask import render_template_string  
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
  
  
# Generate the form fields based on the CE type attributes  
def generate_form_fields(ce_type):    
    form_fields_html = ""    
    # Use ce_type to determine the appropriate fields based on NODES definition  
    node_info = NODES.get(ce_type, {'definition': 'Unknown CE Type', 'icon': ''})  
      
    attributes = [    
        {'name': 'content', 'type': 'textarea', 'value': '', 'placeholder': node_info['definition']},  
        {'name': 'node_type', 'type': 'text', 'value': ce_type, 'placeholder': 'Node Type'},  
        # ... other attributes based on ce_type ...  
    ]    
        
    for attribute in attributes:    
        field_html = generate_form_field(    
            field_type=attribute['type'],    
            field_name=attribute['name'],    
            field_value=attribute.get('value', ''),    
            placeholder=attribute.get('placeholder', ''),  
            # ... other parameters if needed ...  
        )    
        form_fields_html += field_html    
        
    return form_fields_html    

  
# Main function to generate a dynamic modal template for a given CE type  
def generate_dynamic_modal(ce_type):      
    # Retrieve node information from the NODES definition      
    node_info = NODES.get(ce_type, {'definition': 'Unknown CE Type', 'icon': ''})      
      
    # Generate form fields for the given CE type      
    form_fields = generate_form_fields(ce_type)      
      
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
    
# Example usage: Generate and print the modal content for a "Location" CE type    
if __name__ == "__main__":      
    print(get_ce_modal('Location')) 
  
# Function to retrieve and display the modal for a specific CE type  
def get_ce_modal(ce_type):  
    # Generate the dynamic modal for the CE type  
    modal_html = generate_dynamic_modal(ce_type)  
  
    # Return the rendered modal HTML  
    return modal_html  
  
# Example usage: Generate and print the modal content for a "Location" CE type  
if __name__ == "__main__":  
    print(get_ce_modal('Location'))  
