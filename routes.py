import os
import json
import uuid
import pdfkit  
import openai
import requests
import logging
from bs4 import BeautifulSoup 
from ce_nodes import NODES
from app import app, USE_DATABASE
from uuid import UUID
from ce_templates import generate_dynamic_modal
from models import SSOL, COS, CE
from ce_templates import get_ce_modal 
from store import ce_store, cos_store, ssol_store
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from flask import Flask, Blueprint, render_template, request, flash, redirect, url_for, jsonify, make_response, current_app, send_from_directory
from werkzeug.exceptions import BadRequest, NotFound
from utilities import generate_goal, get_domain_icon_and_name, generate_outcome_data
from speculate import get_badge_class_from_status, get_cos_by_id, delete_cos_by_id, update_ce_by_id, update_cos_by_id, parse_ai_response_and_generate_html
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
        logging.info(f"Form data received: {request.form}")    
        selected_goal = request.form.get('selected_goal', '').strip()    
        domain = request.form.get('domain', '').strip()    
        domain_icon = request.form.get('domain_icon', '').strip()    
    
        try:        
            outcome_data = generate_outcome_data(request, 'POST', selected_goal, domain, domain_icon)    
            # Debugging: Log the type and content of outcome_data  
            logging.info(f"Type of outcome_data: {type(outcome_data)}")  
            logging.info(f"Content of outcome_data: {outcome_data}")  
            return render_template('outcome.html', ssol=outcome_data, ssol_id=outcome_data['ssol_id'], nodes=NODES)

        except Exception as e:      
            app.logger.error(f"An error occurred while generating the outcome data: {e}")    
            flash("An error occurred while generating the outcome data. Please try again.", "error")    
            return redirect(url_for('routes_bp.index'))    
    
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

@routes_bp.route('/get_ce_by_id/<string:ce_id>', methods=['GET'])  
def get_ce_by_id_route(ce_id):  
    try:  
        ce = get_ce_by_id(ce_id)  
        if ce:  
            # Check if CE is a model instance or a dictionary  
            if isinstance(ce, dict):  
                # When using in-memory store  
                cos_id = ce.get('cos_id')  
                cos_content = "Parent COS not found."  
                if cos_id:  
                    cos = get_cos_by_id(cos_id)  
                    cos_content = cos['content'] if cos else cos_content  
            else:  
                # When using a database  
                cos = get_cos_by_id(ce.cos_id) if ce.cos_id else None  
                cos_content = cos.content if cos else "Parent COS not found."  
              
            ce_data = ce.to_dict() if not isinstance(ce, dict) else ce  
            return jsonify(ce=ce_data, cos_content=cos_content), 200  
        else:  
            return jsonify(error=f"CE with ID {ce_id} not found"), 404  
    except Exception as e:  
        current_app.logger.error(f"Error in get_ce_by_id_route: {e}", exc_info=True)  
        return jsonify(error="Internal Server Error"), 500  

@app.route('/analyze_cos/<string:cos_id>', methods=['GET'])  
def analyze_cos_route(cos_id):  
    logging.info(f"Analyzing COS with ID: {cos_id}")
    try:  
        analysis_result = analyze_cos_by_id(cos_id)  
        if analysis_result['success']:  
            return jsonify(analysis_result['analysis_results']), 200  
        else:  
            return jsonify({'error': analysis_result['message']}), 404  
    except ValueError:  
        return jsonify({'error': "Invalid COS ID"}), 400  
    except Exception as e:  
        return jsonify({'error': str(e)}), 500  

def analyze_cos_by_id(cos_id_str):      
    try:  
        # Attempt to retrieve the COS from the database or in-memory store  
        cos = COS.query.get(cos_id_str) if USE_DATABASE else cos_store.get(cos_id_str)  
          
        if not cos:  
            # COS not found, return a consistent error response  
            return {'success': False, 'message': "COS not found."}  
          
        # Assuming analyze_cos performs the actual analysis and returns results  
        analysis_results = analyze_cos(cos.content if USE_DATABASE else cos['content'])  
          
        # Return structured response indicating success and including the analysis results  
        return {'success': True, 'analysis_results': analysis_results}  
      
    except Exception as e:  
        # Catch any unexpected errors and return a structured error response  
        return {'success': False, 'message': f"An unexpected error occurred: {str(e)}"}  

@routes_bp.route('/get_ce_modal/<string:ce_type>', methods=['GET'])  
def get_ce_modal_route(ce_type):  
    try:  
        modal_html = get_ce_modal(ce_type)  
        return jsonify(modal_html=modal_html)  
    except Exception as e:  
        current_app.logger.error(f"Error in get_ce_modal_route: {e}", exc_info=True)  
        return jsonify(error=str(e)), 500

@routes_bp.route('/update_ce/<uuid:ce_id>', methods=['POST'])  
def update_ce(ce_id):  
    ce_data = request.get_json()  
    try:  
        success = update_ce_by_id(ce_id, ce_data)  # Call the update function with new data  
        if success:  
            return jsonify(success=True), 200  
        else:  
            return jsonify(success=False, error="Conditional Element not found."), 404  
    except Exception as e:  
        return jsonify(success=False, error=str(e)), 500  

