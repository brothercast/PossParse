# routes.py (Refactored Version with Gemini Image Generation - Validated and Refactored)
from flask import Blueprint, render_template, request, flash, redirect, url_for, jsonify, make_response, current_app, send_from_directory
import os
import json
import uuid
import pdfkit
import logging
import asyncio  # Import asyncio
from bs4 import BeautifulSoup
from app import app, USE_DATABASE
from uuid import UUID
from utilities import generate_goal, generate_outcome_data, analyze_user_input, generate_sentiment_analysis, generate_ssol_image, generate_ssol_id  # Import generate_ssol_image
from dotenv import load_dotenv
from ce_nodes import NODES
from werkzeug.exceptions import BadRequest, NotFound
from ce_templates import generate_dynamic_modal, generate_ai_data
from speculate import get_ce_by_id as speculate_get_ce_by_id, update_ce_by_id as speculate_update_ce_by_id
from models import get_engine_and_session, SSOL
from urllib.parse import urlparse  # ADD THIS IMPORT

load_dotenv()

routes_bp = Blueprint('routes_bp', __name__)


# --- Utility Route ---
@routes_bp.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(current_app.root_path, 'static'), 'favicon.ico', mimetype='image/vnd.microsoft.icon')


# --- Basic Pages ---
@routes_bp.route('/')
def index():
    return render_template('input.html')


@routes_bp.route('/about')
def about():
    return render_template('about.html')


# --- Goal Selection ---
@routes_bp.route('/goal_selection', methods=['POST'])
async def goal_selection():
    if request.method == 'POST':
        user_input = request.form['user_text'].strip()
        if not user_input:
            flash("Please enter your possibility or goal.", "error")
            return render_template('input.html')
        try:
            logging.info(f"User Input: '{user_input}'. Calling generate_goal...")
            goal_options = await generate_goal(user_input)
            logging.debug(f"generate_goal returned: {goal_options}")
            if not goal_options:
                flash("Could not generate goal options. Please try again.", "warning")
                return render_template('input.html')

            if USE_DATABASE:
                ssol_id_for_image = generate_ssol_id(USE_DATABASE, user_input)  # Generate ssol_id right away if using DB.
                asyncio.create_task(generate_ssol_image(f"Image prompt for goal: '{user_input}'", ssol_id=ssol_id_for_image))  # Start Gemini Image in background, pass ssol_id
            else:
                asyncio.create_task(generate_ssol_image(f"Image prompt for goal: '{user_input}'", selected_goal_title=user_input))  # Start Gemini Image in background, pass goal title for in-memory

            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify(goals=goal_options, user_input=user_input)

            return render_template('goal_selection.html', goals=goal_options, user_input=user_input)
        except ValueError as e:
            flash(str(e), "error")
            logging.error(f"ValueError in goal_selection: {e}", exc_info=True)
            return render_template('input.html', user_text=user_input, error_message=str(e))
        except Exception as e:
            flash("An unexpected error occurred. Please try again.", "error")
            logging.error(f"Unexpected error in goal_selection: {e}", exc_info=True)
            return render_template('input.html', user_text=user_input, error_message=str(e))
    return redirect(url_for('routes_bp.index'))


# --- Outcome Generation ---
@routes_bp.route('/outcome', methods=['POST'])
async def outcome():
    if request.method == 'POST':
        logging.info(f"Outcome route - Form data received: {request.form}")
        selected_goal = request.form.get('selected_goal', '').strip()
        domain = request.form.get('domain', '').strip()
        selected_goal_title = request.form.get('selected_goal_title', '').strip()  # Get title from form
        domain_icon = request.form.get('domain_icon', '').strip()

        if not selected_goal:
            flash("No goal selected. Please select a goal.", "error")
            return redirect(url_for('routes_bp.index'))
        try:
            # Log the titles and goals being passed
            logging.info(f"Calling generate_outcome_data with title: '{selected_goal_title}' and goal: '{selected_goal}'")  # Log title and goal
            logging.info("Calling generate_outcome_data...")
            outcome_data = await generate_outcome_data(USE_DATABASE, request, 'POST', selected_goal, domain, domain_icon, selected_goal_title)  # Pass USE_DATABASE and selected_goal_title
            ssol_id = outcome_data['ssol_id']  # Extract ssol_id
            logging.debug(f"generate_outcome_data returned: {outcome_data}")
            return render_template('outcome.html', ssol=outcome_data, nodes=NODES, ssol_id=ssol_id, selected_goal_title=selected_goal_title)  # Pass ssol_id and title to template
        except Exception as e:
            current_app.logger.error(f"Error generating outcome data: {e}", exc_info=True)
            flash("Error generating outcome data. Please try again.", "error")
            return redirect(url_for('routes_bp.goal_selection'))
    flash("Invalid request method for outcome.", "error")
    return redirect(url_for('routes_bp.index'))


# --- Input Analysis ---
@routes_bp.route('/analyze_input', methods=['POST'])
async def analyze_input_route():
    if request.method == 'POST':
        user_text = request.form.get('user_text')
        if not user_text:
            return jsonify({'error': 'No text provided'}), 400

        try:
            keywords = await analyze_user_input(user_text)
            sentiment = await generate_sentiment_analysis(user_text)
            return jsonify({'keywords': keywords, 'sentiment': sentiment})
        except Exception as e:
            logging.error(f"Error analyzing user input: {e}", exc_info=True)
            return jsonify({'error': 'Error analyzing input'}), 500
    return jsonify({'error': 'Invalid request method'}), 405


# --- PDF Export ---
@routes_bp.route('/save_as_pdf/<uuid:ssol_id>', methods=['POST'])
def save_as_pdf(ssol_id):  # <-- Corrected function definition
    return _save_as_pdf(ssol_id)  # <-- Call helper function


def _save_as_pdf(ssol_id):  # <-- Helper function for PDF generation
    try:
        data = request.get_json()
        if not data or 'htmlContent' not in data:
            raise ValueError("Invalid request: No HTML content provided.")
        html_content = data['htmlContent']

        css_file_path = os.path.join(current_app.root_path, current_app.static_folder, 'styles.css')
        if not os.path.exists(css_file_path):
            raise FileNotFoundError(f"CSS file not found at: {css_file_path}")

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
        response.headers['Content-Disposition'] = f'attachment; filename="Structured_Solution_{ssol_id}.pdf"'
        return response

    except Exception as e:
        current_app.logger.error(f"Exception in save_as_pdf: {e}", exc_info=True)
        return jsonify(success=False, error=str(e)), 500


# --- COS CRUD Routes ---
@routes_bp.route('/update_cos/<uuid:cos_id>', methods=['PUT'])
def update_cos_route(cos_id):
    from speculate import update_cos_by_id
    from models import get_engine_and_session

    try:
        data = request.get_json()
        if not data:
            raise BadRequest('No JSON payload received')
        cos_id_str = str(cos_id)

        if USE_DATABASE:
            with app.app_context():
                engine, session = get_engine_and_session()
                update_result = update_cos_by_id(USE_DATABASE, cos_id_str, data)  # Pass USE_DATABASE
                session.close()
        else:
            update_result = update_cos_by_id(USE_DATABASE, cos_id_str, data)  # Pass USE_DATABASE

        if update_result['success']:
            return jsonify(success=True, cos=update_result['cos']), 200
        return jsonify(success=False, error=update_result['message']), 404
    except BadRequest as e:
        return jsonify(error=str(e)), 400
    except Exception as e:
        current_app.logger.error(f"Error updating COS {cos_id}: {e}", exc_info=True)
        return jsonify(error="An unexpected error occurred."), 500


@routes_bp.route('/delete_cos/<uuid:cos_id>', methods=['DELETE'])
def delete_cos_route(cos_id):
    from speculate import delete_cos_by_id
    from models import get_engine_and_session

    try:
        cos_id_str = str(cos_id)
        if USE_DATABASE:
            with app.app_context():
                engine, session = get_engine_and_session()
                success = delete_cos_by_id(USE_DATABASE, cos_id_str)  # Pass USE_DATABASE
                session.close()
        else:
            success = delete_cos_by_id(USE_DATABASE, cos_id_str)  # Pass USE_DATABASE

        if success:
            return jsonify(success=True), 200
        return jsonify(success=False, error="COS not found or could not be deleted"), 404
    except Exception as e:
        current_app.logger.error(f"Error deleting COS {cos_id}: {e}", exc_info=True)
        return jsonify(error="An unexpected error occurred."), 500


# --- SSOL Image ---
@routes_bp.route('/get_ssol_image/<uuid:ssol_id>')
async def get_ssol_image(ssol_id):
    from utilities import generate_ssol_image
    from models import SSOL, get_engine_and_session
    from app import app
    from store import ssol_store

    ssol_id_str = str(ssol_id)
    try:
        if USE_DATABASE:
            with app.app_context():
                engine, session = get_engine_and_session()
                ssol_instance = session.query(SSOL).get(uuid.UUID(ssol_id_str))
                if not ssol_instance:
                    session.close()
                    return jsonify({'error': 'SSOL not found'}), 404
                selected_goal_title = ssol_instance.title
                domain = ssol_instance.domain
                session.close()
        else:
            ssol_data = ssol_store.get(ssol_id_str)
            if not ssol_data:
                return jsonify({'error': 'SSOL not found in in-memory store'}), 404
            selected_goal_title = ssol_data['title']
            domain = ssol_data.get('domain', 'General')

        image_prompt = (
            f"A colorful, charming, and visually stunning diorama in the style of 'It's a Small World', "
            f"depicting '{selected_goal_title}' as a fulfilled goal in the domain of '{domain}'. "
            f"The scene should include diverse people, use an isometric perspective, and have a 1:1 square aspect ratio. "
            f"The artwork should evoke a mid-century modern aesthetic, reminiscent of 1960s illustration. "
            f"Do not include any text or labels."
        )
        current_app.logger.debug(f"get_ssol_image - Sending prompt to API: '{image_prompt}'")

        web_image_path = await generate_ssol_image(image_prompt)
        if web_image_path == 'images/SSPEC_Logo_Motion.gif':
            return jsonify({'image_path': url_for('static', filename='images/sspec_default.png'), 'error': 'Failed to generate image, using static default.'})
        else:
            return jsonify({'image_path': url_for('static', filename=web_image_path)})

    except Exception as e:
        current_app.logger.error(f"Error in get_ssol_image route: {e}", exc_info=True)
        return jsonify({'image_path': url_for('static', filename='images/sspec_default.png'), 'error': 'Failed to generate image'}), 500


# --- CE Routes ---
@routes_bp.route('/get_ce_by_id', methods=['GET'])
def get_ce_by_id_route():
    from speculate import get_ce_by_id
    from models import get_engine_and_session

    ce_id = request.args.get('ce_id')
    if not ce_id:
        return jsonify(error="Missing 'ce_id' parameter"), 400
    try:
        if USE_DATABASE:
            with app.app_context():
                engine, session = get_engine_and_session()
                ce = speculate_get_ce_by_id(USE_DATABASE, ce_id)  # Pass USE_DATABASE and use alias
                session.close()
        else:
            ce = speculate_get_ce_by_id(USE_DATABASE, ce_id)  # Pass USE_DATABASE and use alias

        if ce:
            return jsonify(ce=ce.to_dict())
        return jsonify(error="CE not found"), 404

    except Exception as e:
        current_app.logger.error(f"Error getting CE {ce_id}: {e}", exc_info=True)
        return jsonify(error="An unexpected error occurred."), 500


@routes_bp.route('/analyze_cos/<string:cos_id>', methods=['GET'])
def analyze_cos_by_id(cos_id_str):
    from speculate import analyze_cos
    from models import COS, get_engine_and_session
    from store import cos_store
    try:

        if USE_DATABASE:
            with app.app_context():
                engine, session = get_engine_and_session()
                cos = session.query(COS).get(cos_id_str)
                session.close()
        else:
            cos = cos_store.get(cos_id_str)

        if not cos:
            return jsonify({'success': False, 'message': 'COS not found'}), 404

        analysis_results = analyze_cos(cos.content if USE_DATABASE else cos['content'], cos_id_str)  # Pass cos_id_str
        return jsonify({'success': True, 'analysis_results': analysis_results}), 200
    except Exception as e:
        current_app.logger.error(f"Error analyzing COS {cos_id_str}: {e}", exc_info=True)
        return jsonify({'success': False, 'message': 'An unexpected error occurred'}), 500


@routes_bp.route('/get_ce_modal/<string:ce_type>', methods=['POST'])
async def get_ce_modal_route(ce_type):
    from ce_templates import generate_dynamic_modal, generate_ai_data
    from speculate import get_ce_by_id
    from models import get_engine_and_session
    from store import ce_store

    try:
        data = request.get_json()
        current_app.logger.debug(f"get_ce_modal_route - request.get_json() data: {data}") # Log JSON Data

        ce_id = data.get('ce_id')

        if USE_DATABASE:
            with app.app_context():
                engine, session = get_engine_and_session()
                ce = get_ce_by_id(USE_DATABASE, ce_id) if ce_id else None  # Pass USE_DATABASE
                session.close()
        else:
            ce = get_ce_by_id(USE_DATABASE, ce_id) if ce_id else None  # Pass USE_DATABASE

        ce_data = ce.to_dict() if ce else {}
        cos_content = data.get('cos_content', '')
        phase_name = data.get('phase_name', '')
        phase_index = data.get('phase_index', 0)
        ssol_goal = data.get('ssol_goal','')
        existing_ces = data.get('existing_ces', [])

        current_app.logger.debug(f"get_ce_modal_route - BEFORE generate_dynamic_modal - phase_name: '{phase_name}', phase_index: {phase_index}") # Log phase_name and phase_index

        ai_generated_data = {}
        if ce_type:
             ai_generated_data = await generate_ai_data(cos_content, ce_id, ce_type, ssol_goal, existing_ces)


        modal_html = await generate_dynamic_modal(
            ce_type,
            ce_data=ce_data,
            cos_content=cos_content,
            ai_generated_data=ai_generated_data,
            phase_name=phase_name,
            phase_index=phase_index,
            ce_store = ce_store
        )

        return jsonify(modal_html=modal_html, ai_generated_data=ai_generated_data)

    except Exception as e:
        current_app.logger.error(f"Error generating CE modal: {e}", exc_info=True)
        return jsonify(error=f"An error occurred: {str(e)}"), 500


@routes_bp.route('/ai-query-endpoint', methods=['POST'])
async def ai_query_route():
    from ce_templates import generate_ai_data  # Local import to avoid circular dependency

    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON payload received'}), 400

        ce_type = data.get('ce_type')
        cos_content = data.get('cos_content')
        ce_id = data.get('ce_id')
        ssol_goal = data.get('ssol_goal')
        existing_ces = data.get('existing_ces')

        ai_response = await generate_ai_data(cos_content, ce_id, ce_type, ssol_goal, existing_ces)  # Pass existing_ces

        return jsonify({'success': True, 'ai_response': ai_response})

    except Exception as e:
        current_app.logger.error(f"Error in ai_query_route: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@routes_bp.route('/update_ce/<uuid:ce_id>', methods=['PUT'])
def update_ce_route(ce_id):
    from speculate import update_ce_by_id
    from models import get_engine_and_session

    try:
        data = request.get_json()
        if not data:
            raise BadRequest('No JSON payload received')
        ce_id_str = str(ce_id)

        if USE_DATABASE:
            with app.app_context():
                engine, session = get_engine_and_session()
                success = speculate_update_ce_by_id(USE_DATABASE, ce_id_str, data)  # Pass USE_DATABASE and use alias
                session.close()
        else:
            success = speculate_update_ce_by_id(USE_DATABASE, ce_id_str, data)  # Pass USE_DATABASE and use alias

        if success:
            return jsonify(success=True), 200
        return jsonify(success=False, error="CE not found or could not be updated"), 404
    except BadRequest as e:
        return jsonify(error=str(e)), 400
    except Exception as e:
        current_app.logger.error(f"Error updating CE {ce_id}: {e}", exc_info=True)
        return jsonify(error="An unexpected error occurred."), 500


urlpatterns = [
    # path('', views.home, name='home'), # Example URL pattern - not used in Flask Blueprint
]