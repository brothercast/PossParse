import os
import json
import uuid
import pdfkit  
import openai
import requests
import logging
from bs4 import BeautifulSoup 
from app import app, USE_DATABASE
from uuid import UUID
from models import SSOL, COS, CE
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from flask import Flask, Blueprint, render_template, request, flash, redirect, url_for, jsonify, make_response, current_app, send_from_directory
from werkzeug.exceptions import BadRequest, NotFound
from utilities import generate_goal, get_domain_icon_and_name, generate_outcome_data, generate_structured_solution, get_cos_by_guid
from speculate import get_badge_class_from_status, get_cos_by_id, delete_cos_by_id, extract_conditional_elements, update_cos_by_id
from datetime import datetime
from dotenv import load_dotenv
from speculate import create_cos, get_cos_by_id, update_cos_by_id, delete_cos_by_id, get_badge_class_from_status, get_ce_by_id, analyze_cos, extract_conditional_elements  

# Load environment variables
load_dotenv()
azure_openai_key = os.environ["AZURE_OPENAI_API_KEY"]
azure_openai_endpoint = os.environ["AZURE_OPENAI_ENDPOINT"]
deployment_name = os.environ["AZURE_DEPLOYMENT_NAME"]

# Initialize Azure OpenAI client
openai.api_key = azure_openai_key
openai.api_base = azure_openai_endpoint
openai.api_type = 'azure'  # Necessary for using the OpenAI library with Azure OpenAI
openai.api_version = '2023-12-01'  # Latest / target version of the API

# Set the secret key and database URI from the environment variables
app.secret_key = os.environ.get('SECRET_KEY', 'your_secret_key')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('SQLALCHEMY_DATABASE_URI')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False  # Optionally to suppress warning

# Configure logging  
logging.basicConfig(level=logging.WARNING)   

# In-memory store  
ssol_store = {} 
cos_store = {} 
ce_store = {}

# Register the custom Jinja filter function
app.jinja_env.filters['get_badge_class_from_status'] = get_badge_class_from_status

routes_bp = Blueprint('routes_bp', __name__)  

@routes_bp.route('/favicon.ico')  
def favicon():  
    return send_from_directory(os.path.join(current_app.root_path, 'static'),  
                               'favicon.ico', mimetype='image/vnd.microsoft.icon')   

@routes_bp.route('/')  
def index():  
    return render_template('input.html')  

@routes_bp.route('/about')
def about():
    return render_template('about.html')

@routes_bp.route('/goal_selection', methods=['GET', 'POST'])
def goal_selection():
    if request.method == 'POST':
        user_input = request.form['user_text'].strip()
        try:
            goal_options = generate_goal(user_input)
            for goal in goal_options:
                goal['icon'], goal['domain'] = get_domain_icon_and_name(goal['title'])
            
            # Manually check for AJAX request
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify(goals=goal_options, user_input=user_input)
            
            return render_template('goal_selection.html', goals=goal_options, user_input=user_input)
        except ValueError as e:
            flash("An error occurred while processing your request. Please try again.", "error")
    return redirect(url_for('index'))

@routes_bp.route('/outcome', methods=['GET', 'POST'])    
def outcome():    
    if request.method == 'POST':    
        selected_goal = request.form.get('selected_goal', '').strip()    
        domain = request.form.get('domain', '').strip()    
        domain_icon = request.form.get('domain_icon', '').strip()  
  
        if not selected_goal:  
            flash("No goal selected. Please select a goal to proceed.", "error")  
            return redirect(url_for('routes_bp.index'))  
  
        try:    
            # Call generate_outcome_data with the correct number of arguments  
            outcome_data = generate_outcome_data(request, 'POST', selected_goal, domain, domain_icon)
            
            # Pass the outcome_data dictionary to the template with the correct structure  
            return render_template('outcome.html',  
                    ssol=outcome_data,  
                    structured_solution=outcome_data['phases'],  
                    ssol_id=outcome_data['ssol_id'])  
  
        except Exception as e:  
            current_app.logger.error(f"Error processing outcome: {e}", exc_info=True)  
            flash("An error occurred while processing your request. Please try again.", "error")  
            return redirect(url_for('routes_bp.index'))  
  
    # Redirect to the index page if not a POST request  
    flash("Invalid request method.", "error")  
    return redirect(url_for('routes_bp.index'))
 
@routes_bp.route('/save_as_pdf/<uuid:ssol_id>', methods=['POST'])  
def save_as_pdf(ssol_id):  
    try:  
        data = request.get_json()  
        html_content = data['htmlContent']  
        if not html_content:  
            raise ValueError("No HTML content provided.")  
  
        # Get the absolute path to the styles.css file  
        css_file_path = os.path.join(current_app.root_path, current_app.static_folder, 'styles.css')  
  
        # Get the absolute URL to the generated image (assuming it's served via a static route)  
        image_url = url_for('static', filename='path/to/generated_image.png', _external=True)  
  
        # Replace the relative paths in html_content with absolute paths  
        html_content = html_content.replace('src="/static/', f'src="{url_for("static", filename="", _external=True)}')  
  
        # Define options for pdfkit configuration  
        options = {  
            "page-size": "Letter",  
            "margin-top": "0.75in",  
            "margin-right": "0.75in",  
            "margin-bottom": "0.75in",  
            "margin-left": "0.75in",  
            "encoding": "UTF-8",  
            "custom-header": [("Accept-Encoding", "gzip")],  
            "no-outline": None,  
            "enable-local-file-access": None,  # This allows pdfkit to access local files  
        }  
  
        # Generate the PDF using pdfkit with additional options  
        pdf = pdfkit.from_string(html_content, False, options=options, css=css_file_path)  
  
        response = make_response(pdf)  
        response.headers['Content-Type'] = 'application/pdf'  
        response.headers['Content-Disposition'] = f'attachment; filename="Structured Solution {ssol_id}.pdf"'  
  
        return response  
  
    except Exception as e:  
        current_app.logger.error(f"Exception in save_as_pdf: {e}")  
        return jsonify(success=False, error=str(e)), 500  
    
@routes_bp.route('/update_cos/<uuid:cos_id>', methods=['PUT'])  
def update_cos_route(cos_id):  
    try:  
        data = request.get_json()  
        if not data:  
            raise BadRequest('No JSON payload received')  
  
        # Convert UUID to string for consistency  
        cos_id_str = str(cos_id)  
        update_result = update_cos_by_id(cos_id_str, data)  
  
        if update_result['success']:  
            return jsonify(success=True, cos=update_result['cos']), 200  
        else:  
            return jsonify(success=False, error=update_result['message']), 404  
  
    except BadRequest as e:  
        return jsonify(error=str(e)), 400  
    except Exception as e:  
        current_app.logger.error(f"Error updating COS with ID {cos_id}: {e}", exc_info=True)  
        return jsonify(error="An unexpected error occurred while updating the COS."), 500  

    
@routes_bp.route('/delete_cos/<uuid:cos_id>', methods=['DELETE'])  
def delete_cos_route(cos_id):  
    try:  
        # Convert UUID object to string  
        cos_id_str = str(cos_id)  
  
        if delete_cos_by_id(cos_id_str):  
            flash('COS has been successfully deleted.', 'success')  
            return jsonify(success=True), 200  
        else:  
            raise NotFound('Condition of Satisfaction could not be found or deleted.')  
  
    except NotFound as e:  
        logging.warning(f"NotFound: {e}")  
        return jsonify(success=False, error=str(e)), 404  
    except Exception as e:  
        logging.error(f"Unexpected error occurred: {e}", exc_info=True)  
        return jsonify(success=False, error=str(e)), 500  

@routes_bp.route('/get_ce_by_id', methods=['GET'])
def get_ce_by_id_route():
    ce_id = request.args.get('ce_id')
    ce = get_ce_by_id(ce_id)
    ce_data = ce.to_dict() if ce else None
    return jsonify(ce=ce_data) if ce_data else jsonify(error="CE not found"), 404

@routes_bp.route('/analyze_cos/<string:cos_id>', methods=['GET'])
def analyze_cos_route(cos_id):
    try:
        # Try to convert the cos_id string to a UUID
        uuid_cos_id = uuid.UUID(cos_id)

        # Convert UUID to string for consistency
        cos_id_str = str(uuid_cos_id)

        current_app.logger.debug(f"Starting analysis for COS with ID: {cos_id_str}")

        # Perform the analysis by calling the helper function
        analysis_result = analyze_cos_by_id(cos_id_str)

        if not analysis_result['success']:
            error_message = analysis_result['message']
            current_app.logger.warning(f"Analysis failed for COS with ID {cos_id_str}. Reason: {error_message}")
            return jsonify(error=error_message), 404 if error_message == "COS not found." else 500

        current_app.logger.debug(f"Analysis complete for COS with ID: {cos_id_str}")
        return jsonify(analysis_result), 200

    except ValueError:
        # If the cos_id is not a valid UUID, return an error response
        current_app.logger.error(f"Invalid COS ID: {cos_id}")
        return jsonify(error="Invalid COS ID"), 400

    except Exception as e:
        current_app.logger.error(f"Error analyzing COS with ID {cos_id}: {e}", exc_info=True)
        return jsonify(error="An unexpected error occurred while analyzing the COS."), 500
  
def analyze_cos_by_id(cos_id_str):    
    # Log the incoming request for analysis  
    current_app.logger.info(f"Request received to analyze COS with ID: {cos_id_str}")    
    
    # Retrieve the COS from the data store  
    cos = COS.query.get(cos_id_str) if USE_DATABASE else cos_store.get(cos_id_str)    
    
    if cos:    
        current_app.logger.info(f"COS with ID {cos_id_str} found. Analyzing content.")    
        # Call the analyze_cos function from utilities.py to perform the actual analysis  
        return analyze_cos(cos.content if USE_DATABASE else cos['content'])    
    
    # Log a warning if the COS was not found and return an appropriate message  
    current_app.logger.warning(f"COS with ID {cos_id_str} not found.")    
    return {'success': False, 'message': "COS not found."}  