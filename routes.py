import os  
import json
import openai
from app import app
from datetime import datetime  
from dotenv import load_dotenv  
from werkzeug.exceptions import BadRequest  
from utilities import generate_goal, get_domain_icon_and_name, generate_outcome_data  
from flask import Blueprint, render_template, request, flash, redirect, url_for, session, jsonify 
from markupsafe import Markup  
from speculate import create_cos, get_cos_by_id, update_cos_by_id, delete_cos_by_id, get_badge_class_from_status, get_ce_by_id, analyze_cos, extract_conditional_elements
from sqlalchemy import Column, Integer, String, Date, ForeignKey  
from sqlalchemy.orm import relationship  
from sqlalchemy.ext.declarative import declarative_base  

# Load environment variables  
load_dotenv()  
azure_openai_key = os.environ["AZURE_OPENAI_API_KEY"]  
azure_openai_endpoint = os.environ["AZURE_OPENAI_ENDPOINT"]  
deployment_name = os.environ["AZURE_DEPLOYMENT_NAME"]  

# Initialize Azure OpenAI client  
openai.api_key = azure_openai_key  
openai.api_base = azure_openai_endpoint  
openai.api_type = 'azure'  # Necessary for using the OpenAI library with Azure OpenAI  
openai.api_version = '2023-07-01'  # Latest / target version of the API  

Base = declarative_base()   

routes_bp = Blueprint('routes_bp', __name__)  
class COS(Base):  
    __tablename__ = "cos"  
    id = Column(Integer, primary_key=True)
    content = Column(String)
    status = Column(String)
    accountable_party = Column(String)
    completion_date = Column(Date)

    ssol_id = Column(Integer, ForeignKey("ssol.id"))
    ssol = relationship("SSOL", back_populates="cos")

    conditional_elements = relationship("CE", back_populates="cos")


@app.route('/')
def index():
    return render_template('input.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/goal_selection', methods=['GET', 'POST'])
def goal_selection():
    user_input = None
    goal_options = []
    selected_goal = None
    domain_icon = None
    domain = None
    
    if request.method == 'POST':
        user_input = request.form['user_text'].strip()

        try:
            goal_options = generate_goal(user_input)

            for goal in goal_options:
                if goal['title'] == selected_goal:
                    goal['icon'], goal['domain'] = domain_icon, domain
                else:
                    goal['icon'], goal['domain'] = get_domain_icon_and_name(goal['title'])
                
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify(goals=goal_options, user_input=user_input)
            else:
                return render_template(
                    'goal_selection.html',
                    goals=goal_options,
                    user_input=user_input,
                    domain=goal_options[0]['domain'],
                    domain_icon=goal_options[0]['icon']
                )

        except ValueError as e:
            print(f"Error in goal_selection route: {e}")
            flash("An error occurred while processing your request. Please try again.", "error")
            return redirect(url_for('index'))
    else:
        return redirect(url_for('index'))

@app.route('/outcome', methods=['GET', 'POST'])
def outcome():
    if request.method == 'POST':
        selected_goal = request.form.get('selected_goal', '')
        domain = request.form.get('domain', '')
        domain_icon = request.form.get('domain_icon', '')
    else:
        selected_goal = request.args.get('selected_goal', '')
        domain = request.args.get('domain', '')
        domain_icon = request.args.get('domain_icon', '')

    print(f"Selected goal: {selected_goal}")
    print(f"Domain: {domain}")
    print(f"Domain icon: {domain_icon}")

    if not selected_goal:
        return redirect(url_for('index'))

    try:
        outcome_data = generate_outcome_data(request, 'POST', selected_goal, domain, domain_icon)
        print("Outcome data:", outcome_data)

        structured_solution = outcome_data.get('structured_solution', {})

        if not structured_solution:
            structured_solution = {
                'goal': selected_goal,
                'phases': {
                    'discovery': [],
                    'engagement': [],
                    'action': [],
                    'completion': [],
                    'legacy': []
                }
            }

        structured_solution_json = json.dumps(outcome_data['structured_solution'])

        if request.args.get('format', '') == 'json':
            return json.dumps(outcome_data)

        return render_template(
            'outcome.html',
            goal=outcome_data['structured_solution']['goal'],
            ssol=outcome_data['structured_solution'],
            ssol_json=structured_solution_json,
            get_badge_class_from_status=get_badge_class_from_status, 
            **outcome_data
        )
        
    except ValueError as e:
        print(f"Error in outcome route: {e}")
        flash("An error occurred while processing your request. Please try again.", "error")
        return redirect(url_for('goal_selection'))

@app.route('/create_cos', methods=['POST'])
def create_cos(ssol_id, content, accountable_party, completion_date):
    cos = COS(
        content=content,
        status="Proposed",
        accountable_party=accountable_party,
        completion_date=completion_date,
        ssol_id=ssol_id,
    )
    session.add(cos)
    session.commit()
    return cos.id

@app.route('/update_cos/<string:cos_id>', methods=['POST'])  
def update_cos(cos_id):
    try:
        data = request.get_json()
        if not data:
            raise BadRequest('No JSON payload received')

        content = data.get('content')
        status = data.get('status')
        accountable_party = data.get('accountable_party')
        completion_date = data.get('completion_date')

        # Convert the completion_date to a datetime object if it's not None
        if completion_date:
            completion_date = datetime.strptime(completion_date, '%Y-%m-%d').date()

        # Assuming update_cos_by_id and get_cos_by_id are defined elsewhere and work correctly
        updated = update_cos_by_id(cos_id, {
            'content': content,
            'status': status,
            'accountable_party': accountable_party,
            'completion_date': completion_date
        })

        if not updated:
            raise ValueError('Failed to update COS')

        cos = get_cos_by_id(cos_id)
        if not cos:
            raise ValueError('COS not found after update')

        return jsonify(cos=cos)
    except BadRequest as e:
        return jsonify(error=str(e)), 400
    except ValueError as e:
        return jsonify(error=str(e)), 500
    except Exception as e:
        return jsonify(error='An unexpected error occurred'), 500

@app.route('/delete_cos', methods=['POST'])
def delete_cos():
    cos_id = request.form.get('cos_id')

    delete_cos_by_id(cos_id)
    return jsonify(success=True)

# Update the route to accept a query parameter for ce_id  
@app.route('/get_ce_by_id', methods=['GET'])  
def get_ce_by_id_route():  
    try:  
        ce_id = request.args.get('ce_id')  
        ce = get_ce_by_id(ce_id)  
        if ce:  
            ce_data = {  
                'id': str(ce.id),  
                'content': ce.content,  
                'status': ce.status,  
                'accountable_party': ce.accountable_party,  
                'completion_date': ce.completion_date.isoformat() if ce.completion_date else None,  
            }  
            return jsonify(ce=ce_data)  
        else:  
            return jsonify(ce=None), 404  
    except Exception as e:  
        return jsonify(error=str(e)), 500  


@app.route('/analyze_ce_type', methods=['POST'])
def analyze_ce_type():
    return analyze_ce_type(request)

@routes_bp.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze_cos/<string:cos_id>', methods=['GET'])    
def analyze_cos_route(cos_id):  
    # Retrieve the COS by its ID  
    cos = get_cos_by_id(cos_id)  
    # Check if the COS exists  
    if not cos:  
        # If not found, return an empty list and 404 status  
        return jsonify(analyzed_cos=[]), 404  
  
    # If the COS is found, analyze its content  
    analyzed_data = analyze_cos(cos.content)  
    # Extract conditional elements from the analyzed data  
    conditional_elements = extract_conditional_elements(analyzed_data)  
    # Return the analyzed data as JSON  
    return jsonify(analyzed_cos=conditional_elements)  
    return jsonify(analyzed_cos=analyzed_data)

""" def analyze_cos_content(cos_content):
    # Use GPT-3.5 to analyze the COS content and extract conditional elements
    # Call the function that sends the prompt to GPT-3.5 and gets the response
    analyzed_text = speculate.analyze_cos(cos_content)
    # Extract conditional elements from the response and return them
    return speculate.extract_conditional_elements(analyzed_text) """
