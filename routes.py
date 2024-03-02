import os
import json
import pdfkit  
import openai
import logging
from app import app, db
import uuid 
from uuid import UUID
from models import SSOL, COS, CE
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from flask import Flask, Blueprint, render_template, request, flash, redirect, url_for, jsonify, make_response, current_app
from werkzeug.exceptions import BadRequest, NotFound
from utilities import generate_goal, get_domain_icon_and_name, generate_outcome_data, generate_structured_solution, get_cos_by_guid
from speculate import get_badge_class_from_status, get_cos_by_id, delete_cos_by_id, extract_conditional_elements, update_cos_by_id, USE_DATABASE
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
  
        # Define options for pdfkit configuration  
        options = {  
            "enable-local-file-access": "",  # Allow local file access  
        }  
  
        # Generate the PDF using pdfkit with additional options  
        pdf = pdfkit.from_string(html_content, False, options=options)    
    
        response = make_response(pdf)    
        response.headers['Content-Type'] = 'application/pdf'    
        response.headers['Content-Disposition'] = f'attachment; filename={ssol_id}.pdf'    
    
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
            
        update_result = update_cos_by_id(cos_id, data)    
        if update_result['success']:    
            # The updated COS should be included in the response  
            return jsonify(success=True, cos=update_result['cos']), 200    
        else:    
            return jsonify(success=False, error=update_result.get('message', 'An error occurred')), 404    
            
    except BadRequest as e:    
        return jsonify(error=str(e)), 400    
    except Exception as e:    
        return jsonify(error=str(e)), 500  

    
@routes_bp.route('/delete_cos/<uuid:cos_id>', methods=['DELETE'])  # Changed method to DELETE for semantics  
def delete_cos_route(cos_id):  
    try:  
        # Convert string cos_id to UUID  
        cos_id = UUID(cos_id)  
  
        if delete_cos_by_id(cos_id):  
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

@routes_bp.route('/analyze_cos/<uuid:cos_id>', methods=['GET'])        
def analyze_cos_route(cos_id):        
    cos = get_cos_by_id(cos_id)        
    if not cos:        
        logging.warning(f"analyze_cos_route: COS with ID {cos_id} not found.")      
        return jsonify(analyzed_cos=[]), 404        
  
    try:      
        analyzed_data = analyze_cos(cos['content'])       
        conditional_elements = analyzed_data.get('ces', [])      
        content_with_ce = analyzed_data.get('content_with_ce', '')  
  
        # If using a database, store the analyzed CEs in the database  
        if USE_DATABASE:  
            for ce in conditional_elements:  
                new_ce = CE(content=ce['content'], cos_id=cos['id'])  
                db.session.add(new_ce)  
            db.session.commit()  
            conditional_elements = [ce.to_dict() for ce in cos.conditional_elements]  # Convert CE objects to dictionaries  
  
        else:  
            # If not using a database, store the analyzed CEs in an in-memory store  
            for ce in conditional_elements:  
                ce_id = str(uuid.uuid4())  # Generate a UUID for CE  
                ce_store[ce_id] = {'id': ce_id, 'content': ce['content']}  
            conditional_elements = list(ce_store.values())  # Get all CEs from in-memory store  
  
        return jsonify(analyzed_cos=conditional_elements, content_with_ce=content_with_ce)      
    
    except Exception as e:    
        logging.error(f"Error analyzing COS with ID {cos_id}: {e}")    
        return jsonify(error=str(e)), 500  

# Register the Blueprint
app.register_blueprint(routes_bp)