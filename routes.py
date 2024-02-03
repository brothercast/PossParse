import os
import json
import uuid
import logging
from app import app, db
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
import openai
from flask import Flask, Blueprint, render_template, request, flash, redirect, url_for, jsonify, current_app
from werkzeug.exceptions import BadRequest
from models import SSOL, COS, CE
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
logging.basicConfig(level=logging.INFO) 

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
            # Retrieve or create an SSOL instance and get the id  
            ssol_instance = next((ssol for ssol in ssol_store.values() if ssol['title'] == selected_goal), None)  
            if not ssol_instance:  
                ssol_id = len(ssol_store) + 1  
                ssol_instance = {'id': ssol_id, 'title': selected_goal, 'domain': domain, 'domain_icon': domain_icon}  
                ssol_store[ssol_id] = ssol_instance  
  
            ssol_id = ssol_instance['id']  
  
            # Generate outcome data with the SSOL instance's ID  
            outcome_data = generate_outcome_data(request, 'POST', selected_goal, domain, domain_icon, ssol_id)  
  
            # Pass the outcome_data dictionary to the template with the correct structure  
            return render_template('outcome.html',  
                        ssol=outcome_data,  
                        structured_solution=outcome_data['phases']) 
  
        except Exception as e:  
            current_app.logger.error(f"Error processing outcome: {e}", exc_info=True)  
            flash("An error occurred while processing your request. Please try again.", "error")  
            return redirect(url_for('routes_bp.index'))  
  
    # Redirect to the index page if not a POST request  
    flash("Invalid request method.", "error")  
    return redirect(url_for('routes_bp.index'))  

@routes_bp.route('/update_cos/<uuid:cos_id>', methods=['POST'])  
def update_cos_route(cos_id):  
    try:  
        data = request.get_json()  
        if not data:  
            raise BadRequest('No JSON payload received')  
  
        # Log the received data for debugging purposes  
        logging.info(f"Received data for COS ID {cos_id}: {data}")  
  
        # Check if ssol_id is provided in the payload  
        ssol_id = data.get('ssol_id')  
        if not ssol_id:  
            raise BadRequest('ssol_id must be provided to create or update a COS.')  
  
        # Update the existing COS instance with the new data  
        if str(cos_id) in cos_store:  
            cos_store[str(cos_id)].update(data)  
            flash('COS has been updated successfully.', 'info')  
        else:  
            # Create a new COS instance  
            cos_store[str(cos_id)] = data  
            flash('A new COS has been created.', 'info')  
  
        # Log the successful update or creation  
        logging.info(f"COS ID {cos_id} has been {'updated' if str(cos_id) in cos_store else 'created'} successfully.")  
  
        # Return the updated or created COS data  
        return jsonify(success=True, cos=cos_store[str(cos_id)]), 200  
  
    except BadRequest as e:  
        # Log the bad request error  
        logging.warning(f"BadRequest: {e}")  
        flash('No data received to update the COS.', 'error')  
        return jsonify(error=str(e)), 400  
    except Exception as e:  
        # Log any other exceptions that occur  
        logging.error(f"Unexpected error occurred: {e}", exc_info=True)  
        flash('An unexpected error occurred while updating the COS.', 'error')  
        return jsonify(error=str(e)), 500 

@routes_bp.route('/delete_cos', methods=['POST'])
def delete_cos_route():
    cos_id = request.form.get('cos_id')
    if delete_cos_by_id(cos_id):
        flash('COS has been successfully deleted.', 'success')
        return jsonify(success=True)
    else:
        flash('COS could not be found or deleted.', 'error')
        return jsonify(success=False, error="COS not found or could not be deleted"), 404


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
        return jsonify(analyzed_cos=[]), 404

    analyzed_data = analyze_cos(cos.content)
    conditional_elements = extract_conditional_elements(analyzed_data)
    return jsonify(analyzed_cos=conditional_elements)

# Register the Blueprint
app.register_blueprint(routes_bp)