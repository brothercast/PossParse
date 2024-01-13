import os
import json
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
import openai
from flask import Flask, Blueprint, render_template, request, flash, redirect, url_for, jsonify
from werkzeug.exceptions import BadRequest
from models import SSOL, COS, CE
from utilities import generate_goal, get_domain_icon_and_name, generate_outcome_data
from speculate import get_badge_class_from_status, get_cos_by_id, delete_cos_by_id, extract_conditional_elements, update_cos_by_id
from datetime import datetime
from dotenv import load_dotenv
from speculate import create_cos, get_cos_by_id, update_cos_by_id, delete_cos_by_id, get_badge_class_from_status, get_ce_by_id, analyze_cos, extract_conditional_elements  


# Load environment variables
load_dotenv()
azure_openai_key = os.environ["AZURE_OPENAI_API_KEY"]
azure_openai_endpoint = os.environ["AZURE_OPENAI_ENDPOINT"]
deployment_name = os.environ["AZURE_DEPLOYMENT_NAME"]

app = Flask(__name__)

# Initialize Azure OpenAI client
openai.api_key = azure_openai_key
openai.api_base = azure_openai_endpoint
openai.api_type = 'azure'  # Necessary for using the OpenAI library with Azure OpenAI
openai.api_version = '2023-07-01'  # Latest / target version of the API

# Set the secret key and database URI from the environment variables
app.secret_key = os.environ.get('SECRET_KEY', 'your_secret_key')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('SQLALCHEMY_DATABASE_URI')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False  # Optionally to suppress warning

# Initialize SQLAlchemy with the Flask app
db = SQLAlchemy(app)

# Initialize Flask-Migrate with the Flask app and SQLAlchemy DB
migrate = Migrate(app, db)

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
    selected_goal = request.values.get('selected_goal', '')
    domain = request.values.get('domain', '')
    domain_icon = request.values.get('domain_icon', '')

    if not selected_goal:
        return redirect(url_for('index'))

    try:
        outcome_data = generate_outcome_data(request, 'POST', selected_goal, domain, domain_icon)
        # Ensure 'ssol' is included in the context
        ssol_data = outcome_data.get('structured_solution')  # Or however you retrieve the 'ssol' data

        return render_template(
            'outcome.html',
            ssol=ssol_data,  # Add 'ssol' to the context
            **outcome_data
        )
        
    except ValueError as e:
        flash("An error occurred while processing your request. Please try again.", "error")
        return redirect(url_for('goal_selection'))


@routes_bp.route('/update_cos/<uuid:cos_id>', methods=['POST'])
def update_cos_route(cos_id):
    try:
        data = request.get_json()
        if not data:
            raise BadRequest('No JSON payload received')

        update_cos_by_id(cos_id, data)
        cos = get_cos_by_id(cos_id)
        cos_dict = cos.to_dict() if cos else {}
        return jsonify(success=True, cos=cos_dict), 200  
    except BadRequest as e:
        return jsonify(error=str(e)), 400
    except Exception as e:
        return jsonify(error=str(e)), 500

@routes_bp.route('/delete_cos', methods=['POST'])
def delete_cos_route():
    cos_id = request.form.get('cos_id')
    delete_cos_by_id(cos_id)
    return jsonify(success=True)

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

if __name__ == '__main__':
    app.run(debug=True)
