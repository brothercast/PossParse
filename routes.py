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
from uuid import uuid4  
from ce_templates import generate_dynamic_modal, generate_ai_data
from sqlalchemy.exc import SQLAlchemyError
from models import SSOL, COS, CE  
from store import ce_store, cos_store, ssol_store  
from flask import Blueprint, render_template, render_template_string, request, flash, redirect, url_for, jsonify, make_response, current_app, send_from_directory  
from werkzeug.exceptions import BadRequest, NotFound  
from utilities import generate_goal, get_domain_icon_and_name, generate_outcome_data  
from speculate import get_badge_class_from_status, delete_cos_by_id, update_ce_by_id, update_cos_by_id, get_ce_by_id, analyze_cos, get_cos_by_id, get_phase_index, get_ssol_by_id    
from dotenv import load_dotenv  
  
# Load environment variables  
load_dotenv()  
azure_openai_key = os.environ["AZURE_OPENAI_API_KEY"]  
azure_openai_endpoint = os.environ["AZURE_OPENAI_ENDPOINT"]  
deployment_name = os.environ["AZURE_DEPLOYMENT_NAME"]  
  
# Initialize Azure OpenAI client  
openai.api_key = azure_openai_key  
openai.api_base = azure_openai_endpoint  
openai.api_type = 'azure'  
openai.api_version = '2023-12-01'  
  
# Set the secret key and database URI from the environment variables  
app.secret_key = os.environ.get('SECRET_KEY', 'your_secret_key')  
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('SQLALCHEMY_DATABASE_URI')  
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False  
  
# Configure logging  
logging.basicConfig(level=logging.WARNING)  
  
# Register the custom Jinja filter function  
app.jinja_env.filters['get_badge_class_from_status'] = get_badge_class_from_status  
  
# Create the blueprint  
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
  
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':  
                return jsonify(goals=goal_options, user_input=user_input)  
  
            return render_template('goal_selection.html', goals=goal_options, user_input=user_input)  
        except ValueError as e:  
            flash("An error occurred while processing your request. Please try again.", "error")  
    return redirect(url_for('routes_bp.index'))  
  
@routes_bp.route('/outcome', methods=['GET', 'POST'])  
def outcome():  
    if request.method == 'POST':  
        logging.info(f"Form data received: {request.form}")  
        selected_goal = request.form.get('selected_goal', '').strip()  
        domain = request.form.get('domain', '').strip()  
        domain_icon = request.form.get('domain_icon', '').strip()  
  
        try:  
            outcome_data = generate_outcome_data(request, 'POST', selected_goal, domain, domain_icon)  
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
  
        css_file_path = os.path.join(current_app.root_path, current_app.static_folder, 'styles.css')  
        html_content = html_content.replace('src="/static/', f'src="{url_for("static", filename="", _external=True)}')  
  
        options = {  
            "page-size": "Letter",  
            "margin-top": "0.75in",  
            "margin-right": "0.75in",  
            "margin-bottom": "0.75in",  
            "margin-left": "0.75in",  
            "encoding": "UTF-8",  
            "custom-header": [("Accept-Encoding", "gzip")],  
            "no-outline": None,  
            "enable-local-file-access": None,  
        }  
  
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

@routes_bp.route('/get_ce_modal/<string:ce_type>', methods=['POST'])  
def get_ce_modal(ce_type):  
    try:  
        data = request.get_json()  
        ce_id = data.get('ce_id')  
        cos_content = data.get('cos_content')  
        phase_name = data.get('phase_name')  
        phase_index = data.get('phase_index')  
        ssol_goal = data.get('ssol_goal')  
  
        # Fetch AI generated data  
        ai_generated_data = generate_ai_data(cos_content, ce_id, ce_type, ssol_goal)  
  
        modal_content = generate_dynamic_modal(ce_type, None, cos_content, ai_generated_data, phase_name, phase_index)  
        return jsonify(modal_html=modal_content)  
    except Exception as e:  
        current_app.logger.error(f"Error getting modal content for CE type {ce_type}: {e}", exc_info=True)  
        return jsonify(error=f"Error: {e}"), 500  

@routes_bp.route('/analyze_cos/<string:cos_id>', methods=['GET'])  
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
        cos = COS.query.get(cos_id_str) if USE_DATABASE else cos_store.get(cos_id_str)  
        if not cos:  
            return {'success': False, 'message': "COS not found."}  
  
        analysis_results = analyze_cos(cos.content if USE_DATABASE else cos['content'])  
        return {'success': True, 'analysis_results': analysis_results}  
    except Exception as e:  
        return {'success': False, 'message': f"An unexpected error occurred: {str(e)}"}  
  
@routes_bp.route('/update_ce/<uuid:ce_id>', methods=['POST'])  
def update_ce(ce_id):  
    ce_data = request.get_json()  
    try:  
        success = update_ce_by_id(ce_id, ce_data)  
        if success:  
            return jsonify(success=True), 200  
        else:  
            return jsonify(success=False, error="Conditional Element not found."), 404  
    except Exception as e:  
        return jsonify(success=False, error=str(e)), 500  
  
@routes_bp.route('/ai-query-endpoint', methods=['POST'])  
def ai_query_endpoint():  
    try:  
        data = request.get_json()  
        if not data:  
            raise BadRequest('No JSON payload received.')  
  
        cos_text = data.get('cos_text')  
        ce_id = data.get('ce_id')  
        ce_type = data.get('ce_type')  
        ssol_goal = data.get('ssol_goal')  
  
        if not all([cos_text, ce_id, ce_type, ssol_goal]):  
            raise BadRequest('Missing required fields in JSON payload.')  
  
        # Changed the call to generate_ai_data to not include '()' since it's a function, not a callable object  
        ai_response = generate_ai_data(cos_text, ce_id, ce_type, ssol_goal)  
        return jsonify(ai_response=ai_response), 200  
    except BadRequest as e:  
        return jsonify(success=False, error=str(e)), 400  
    except Exception as e:  
        current_app.logger.error(f"Exception in AI query endpoint: {e}")  
        return jsonify(success=False, error=str(e)), 500  

# Function to fetch actual CE data  
def fetch_ce_data(ce_type):  
    try:  
        if USE_DATABASE:  
            ce_data = CE.query.filter_by(node_type=ce_type).first()  
            if ce_data:  
                current_app.logger.debug(f"Fetched CE data from database for type '{ce_type}': {ce_data}")  
            else:  
                current_app.logger.warning(f"CE data for type '{ce_type}' not found in the database.")  
        else:  
            ce_data = next((ce for ce in ce_store.values() if ce.get('node_type') == ce_type), None)  
            if ce_data:  
                current_app.logger.debug(f"Fetched CE data from in-memory store for type '{ce_type}': {ce_data}")  
            else:  
                current_app.logger.warning(f"CE data for type '{ce_type}' not found in the in-memory store.")  
  
        if not ce_data:  
            current_app.logger.warning(f"CE data for type '{ce_type}' not found. Falling back to Default node type.")  
            ce_data = NODES.get('Default')  
            ce_data = {  
                'id': 'default_id',  
                'content': '',  
                'node_type': 'Default',  
                'details': ''  
            }  
  
        return ce_data  
    except Exception as e:  
        current_app.logger.error(f"Error fetching CE data for type '{ce_type}': {e}", exc_info=True)  
        return None  
 
# Debug routes for logging CE entries  
@routes_bp.route('/debug/log_ce_entries', methods=['GET'])  
def debug_log_ce_entries():  
    log_ce_entries()  
    return jsonify({"message": "Logged CE entries"}), 200  
  
@routes_bp.route('/debug/log_in_memory_ce_entries', methods=['GET'])  
def debug_log_in_memory_ce_entries():  
    try:  
        from store import ce_store  
        for ce_id, ce in ce_store.items():  
            current_app.logger.debug(f"CE ID: {ce_id}, Type: {ce.get('node_type')}, Content: {ce.get('content')}")  
        return jsonify({"message": "Logged in-memory CE entries"}), 200  
    except Exception as e:  
        current_app.logger.error(f"Error logging in-memory CE entries: {e}", exc_info=True)  
        return jsonify({"message": "Error logging in-memory CE entries", "error": str(e)}), 500  
  
# Other utility functions  
def log_ce_entries():  
    ce_entries = CE.query.all()  
    for ce in ce_entries:  
        current_app.logger.debug(f"CE ID: {ce.id}, Type: {ce.node_type}, Content: {ce.content}")  
  
def log_in_memory_ce_entries():  
    for ce_id, ce in ce_store.items():  
        current_app.logger.debug(f"CE ID: {ce_id}, Type: {ce.get('node_type')}, Content: {ce.get('content')}")  
