# routes.py
from flask import Blueprint, render_template, request, flash, redirect, url_for, \
                    jsonify, make_response, current_app, send_from_directory
import os
import json
import uuid
import pdfkit
import logging
import asyncio
from bs4 import BeautifulSoup
from app import USE_DATABASE
from uuid import UUID
from utilities import generate_goal, analyze_user_input, is_input_compliant, \
                    generate_outcome_data, generate_ai_data, \
                    generate_image
from ai_service import cleanup_gemini_client
from dotenv import load_dotenv
from ce_templates import generate_dynamic_modal
from ce_nodes import NODES
from werkzeug.exceptions import BadRequest, NotFound
from speculate import get_ce_by_id as speculate_get_ce_by_id, \
                      update_ce_by_id as speculate_update_ce_by_id, \
                      create_cos as speculate_create_cos, \
                      get_cos_by_id as speculate_get_cos_by_id, \
                      update_cos_by_id as speculate_update_cos_by_id, \
                      delete_cos_by_id as speculate_delete_cos_by_id, \
                      analyze_cos as speculate_analyze_cos, \
                      create_ssol as speculate_create_ssol
from models import get_engine_and_session, SSOL, COS


load_dotenv()

routes_bp = Blueprint('routes_bp', __name__)

# --- FIX: Add the teardown handler to the blueprint ---
@routes_bp.teardown_app_request
async def teardown_request(exception=None):
    """Clean up resources after each request."""
    await cleanup_gemini_client()

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
                flash("Could not generate goal options. Please try again or rephrase your input.", "warning")
                return render_template('input.html')

            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify(goals=goal_options, user_input=user_input)

            return render_template('goal_selection.html', goals=goal_options, user_input=user_input)
        except Exception as e:
            flash(f"An unexpected error occurred while generating goals: {e}", "error")
            logging.error(f"Unexpected error in goal_selection: {e}", exc_info=True)
            return render_template('input.html', user_text=user_input, error_message=str(e))
    return redirect(url_for('routes_bp.index'))

# --- Outcome Generation ---
@routes_bp.route('/outcome', methods=['POST'])
async def outcome():
    if request.method == 'POST':
        # ... (getting form data remains the same) ...
        selected_goal_text = request.form.get('selected_goal', '').strip()
        domain = request.form.get('domain', '').strip()
        selected_goal_title = request.form.get('selected_goal_title', '').strip()
        domain_icon = request.form.get('domain_icon', '').strip()

        if not selected_goal_text:
            flash("No goal selected.", "error")
            return redirect(url_for('routes_bp.index'))
            
        try:
            ssol_id_str = speculate_create_ssol(USE_DATABASE, selected_goal_title, selected_goal_text)
            ssol_id_uuid = UUID(ssol_id_str)
            logging.info(f"SSOL created with ID: {ssol_id_str}")

            # --- SINGLE API CALL for all COS and CEs ---
            logging.info("Generating structured solution from AI in a single call...")
            structured_solution_json = await generate_outcome_data(
                ssol_title=selected_goal_title, ssol_description=selected_goal_text, domain=domain
            )
            ssol_summary = structured_solution_json.get('ssolsummary', 'AI failed to generate a summary.')

            # --- FAST, LOCAL-ONLY LOOP ---
            logging.info("Saving generated COS and their CEs (no new API calls)...")
            phases_for_template = {}
            if 'phases' in structured_solution_json:
                for phase_name, cos_items in structured_solution_json['phases'].items():
                    phases_for_template[phase_name] = []
                    for cos_content_with_tags in cos_items:
                        if cos_content_with_tags:
                            # This call is now fast, as it only does DB operations.
                            new_cos_id_str = await speculate_create_cos(
                                USE_DATABASE, ssol_id=ssol_id_uuid, content=cos_content_with_tags, status='Proposed'
                            )
                            newly_created_cos = speculate_get_cos_by_id(USE_DATABASE, UUID(new_cos_id_str))
                            if newly_created_cos:
                                phases_for_template[phase_name].append(newly_created_cos.to_dict() if USE_DATABASE else newly_created_cos)

            # ... (rest of the route for template rendering and image generation remains the same) ...
            
            outcome_data_for_template = {
                'ssol_id': ssol_id_str, 'ssol_title': selected_goal_title, 'selected_goal': selected_goal_text,
                'domain': domain, 'domain_icon': domain_icon, 'ssol_summary': ssol_summary, 'phases': phases_for_template,
            }

            logging.info("Constructing image prompt...")
            image_prompt_text = f"A vibrant, visually stunning futuristic illustration depicting '{selected_goal_text}' as a fulfilled goal, isometric, Mary Blair, 1962"
            logging.info(f"Calling image generation service for SSOL {ssol_id_str}...")
            await generate_image(image_prompt_text, ssol_id_str)
            
            return render_template('outcome.html', ssol=outcome_data_for_template, nodes=NODES, ssol_id=ssol_id_str, selected_goal_title=selected_goal_title)


        except Exception as e:
            current_app.logger.error(f"Critical error in /outcome route: {e}", exc_info=True)
            flash(f"A critical error occurred while generating the solution. Error: {e}", "error")
            return redirect(url_for('routes_bp.index'))

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
            compliance_data = await is_input_compliant(user_text)
            return jsonify({'keywords': keywords, 'compliance': compliance_data})
        except Exception as e:
            logging.error(f"Error analyzing user input: {e}", exc_info=True)
            return jsonify({'error': 'Error analyzing input'}), 500
    return jsonify({'error': 'Invalid request method'}), 405

# --- PDF Export ---
@routes_bp.route('/save_as_pdf/<uuid:ssol_id>', methods=['POST'])
def save_as_pdf(ssol_id):
    try:
        data = request.get_json()
        if not data or 'htmlContent' not in data:
            raise ValueError("Invalid request: No HTML content provided.")
        html_content = data['htmlContent']

        css_file_path = os.path.join(current_app.root_path, 'static', 'styles.css')
        css_param = css_file_path if os.path.exists(css_file_path) else None
        if not css_param:
             current_app.logger.error(f"CSS file not found at: {css_file_path}")

        html_content = html_content.replace('src="/static/', f'src="{url_for("static", filename="", _external=True)}')

        options = {
            "page-size": "Letter", "margin-top": "0.75in", "margin-right": "0.75in",
            "margin-bottom": "0.75in", "margin-left": "0.75in", "encoding": "UTF-8",
            "no-outline": None, "enable-local-file-access": None,
        }

        pdf = pdfkit.from_string(html_content, False, options=options, css=css_param)

        response = make_response(pdf)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = f'attachment; filename="SSPEC_Solution_{ssol_id}.pdf"'
        return response

    except Exception as e:
        current_app.logger.error(f"Exception in save_as_pdf for SSOL {ssol_id}: {e}", exc_info=True)
        return jsonify(success=False, error=str(e)), 500

# --- COS CRUD Routes ---
@routes_bp.route('/create_cos', methods=['POST'])
async def create_cos_route():
    try:
        data = request.get_json()
        if not data: raise BadRequest('No JSON payload received.')

        content = data.get('content')
        ssol_id_str = data.get('ssol_id')
        if not content or not ssol_id_str:
            raise BadRequest('Missing required fields: content and ssol_id are required.')
        
        ssol_id_uuid = UUID(ssol_id_str)

        new_cos_id_str = await speculate_create_cos(
            USE_DATABASE,
            ssol_id=ssol_id_uuid,
            content=content,
            status=data.get('status', 'Proposed'),
            accountable_party=data.get('accountable_party'),
            completion_date=data.get('completion_date')
        )

        if not new_cos_id_str:
            raise Exception("Failed to create COS record in the data store.")

        created_cos_obj = speculate_get_cos_by_id(USE_DATABASE, UUID(new_cos_id_str))
        if not created_cos_obj:
             return jsonify(success=False, error="COS created but could not be retrieved."), 500

        cos_dict = created_cos_obj.to_dict() if USE_DATABASE else created_cos_obj
        return jsonify(success=True, cos=cos_dict), 201

    except BadRequest as e:
        return jsonify(success=False, error=str(e)), 400
    except Exception as e:
        current_app.logger.error(f"Error creating COS: {e}", exc_info=True)
        return jsonify(success=False, error="An unexpected error occurred while creating the COS."), 500

@routes_bp.route('/update_cos/<uuid:cos_id>', methods=['PUT'])
async def update_cos_route(cos_id):
    try:
        data = request.get_json()
        if not data: raise BadRequest('No JSON payload received')
        
        update_result = await speculate_update_cos_by_id(USE_DATABASE, cos_id, data)

        if update_result['success']:
            return jsonify(success=True, cos=update_result['cos']), 200
        return jsonify(success=False, error=update_result['message']), update_result.get('status_code', 404)
    except BadRequest as e:
        return jsonify(success=False, error=str(e)), 400
    except Exception as e:
        current_app.logger.error(f"Error updating COS {cos_id}: {e}", exc_info=True)
        return jsonify(success=False, error="An unexpected error occurred."), 500

@routes_bp.route('/delete_cos/<uuid:cos_id>', methods=['DELETE'])
def delete_cos_route(cos_id):
    try:
        success = speculate_delete_cos_by_id(USE_DATABASE, cos_id)
        if success:
            return jsonify(success=True), 200
        return jsonify(success=False, error="COS not found or could not be deleted."), 404
    except Exception as e:
        current_app.logger.error(f"Error deleting COS {cos_id}: {e}", exc_info=True)
        return jsonify(success=False, error="An unexpected error occurred."), 500

# --- SSOL Image ---
@routes_bp.route('/get_ssol_image/<uuid:ssol_id>')
def get_ssol_image_route(ssol_id):
    ssol_id_str = str(ssol_id)
    image_filename = f"ssol_image_{ssol_id_str}.png"
    image_web_path_relative = os.path.join('images', image_filename).replace("\\", "/")
    image_fs_path = os.path.join(current_app.static_folder, 'images', image_filename)
    
    current_app.logger.info(f"GET_SSOL_IMAGE: Checking for {image_fs_path}")
    
    if os.path.exists(image_fs_path):
        current_app.logger.info(f"GET_SSOL_IMAGE: Found image {image_filename} for SSOL {ssol_id_str}.")
        return jsonify({'image_path': url_for('static', filename=image_web_path_relative), 'status': 'found'})
    else:
        current_app.logger.warning(f"GET_SSOL_IMAGE: Image {image_filename} for SSOL {ssol_id_str} not found.")
        return jsonify({ 'status': 'pending_or_not_found', 'message': 'Image is processing or was not found.' }), 200

# --- CE Routes ---
@routes_bp.route('/get_ce_by_id', methods=['GET'])
def get_ce_by_id_route():
    ce_id_str = request.args.get('ce_id')
    if not ce_id_str:
        return jsonify(error="Missing 'ce_id' parameter"), 400
    try:
        ce_id = UUID(ce_id_str)
        ce = speculate_get_ce_by_id(USE_DATABASE, ce_id)
        if ce:
            return jsonify(ce=ce.to_dict() if USE_DATABASE else ce)
        return jsonify(error="CE not found"), 404
    except ValueError:
        return jsonify(error=f"Invalid CE ID format: {ce_id_str}"), 400
    except Exception as e:
        current_app.logger.error(f"Error getting CE {ce_id_str}: {e}", exc_info=True)
        return jsonify(error="An unexpected error occurred."), 500

@routes_bp.route('/analyze_cos/<uuid:cos_id>', methods=['GET'])
async def analyze_cos_by_id_route(cos_id):
    try:
        cos_content_to_analyze = ""
        if USE_DATABASE:
            cos_instance = speculate_get_cos_by_id(USE_DATABASE, cos_id)
            if not cos_instance:
                return jsonify({'success': False, 'message': 'COS not found'}), 404
            cos_content_to_analyze = cos_instance.content
        else:
            from store import cos_store
            cos_data = cos_store.get(str(cos_id))
            if not cos_data:
                return jsonify({'success': False, 'message': 'COS not found'}), 404
            cos_content_to_analyze = cos_data['content']
        
        analysis_results = await speculate_analyze_cos(cos_content_to_analyze, str(cos_id))
        return jsonify({'success': True, 'analysis_results': analysis_results}), 200
    except Exception as e:
        current_app.logger.error(f"Error analyzing COS {cos_id}: {e}", exc_info=True)
        return jsonify({'success': False, 'message': 'An unexpected error occurred during analysis.'}), 500

@routes_bp.route('/get_ce_modal/<string:ce_type>', methods=['POST'])
async def get_ce_modal_route(ce_type):
    try:
        data = request.get_json()
        ce_id_str = data.get('ce_id')
        
        # --- FIX: Receive ce_text from the frontend payload ---
        ce_text = data.get('ce_text', 'Conditional Element') # Use a default for safety

        ce_id_obj = UUID(ce_id_str) if ce_id_str else None

        ce_data = speculate_get_ce_by_id(USE_DATABASE, ce_id_obj) if ce_id_obj else {}
        if not ce_data or 'data' not in ce_data:
            ce_data = {'id': ce_id_str, 'node_type': ce_type, 'data': {'details_data': {}, 'resources': []}}

        node_config = NODES.get(ce_type, NODES['Default'])
        cos_content_html = data.get('cos_content', '')
        cos_content_text_only = BeautifulSoup(cos_content_html, 'html.parser').get_text(separator=' ', strip=True)

        ai_generated_data = await generate_ai_data(
            node_type=ce_type,
            cos_content=cos_content_text_only,
            ssol_goal=data.get('ssol_goal', ''),
            agent_mode='context'
        )

        modal_html = await generate_dynamic_modal(
            ce_type=ce_type,
            ce_text=ce_text,  # --- FIX: Pass the ce_text to the template function ---
            ce_data=ce_data,
            node_info=node_config,
            cos_content=cos_content_html,
            ai_generated_data=ai_generated_data,
            phase_name=data.get('phase_name', ''),
            phase_index=data.get('phase_index', 0)
        )
        
        return jsonify(modal_html=modal_html, ce_data=ce_data)

    except Exception as e:
        current_app.logger.error(f"Error in get_ce_modal_route for type {ce_type}: {e}", exc_info=True)
        return jsonify(error=f"An error occurred: {str(e)}"), 500

@routes_bp.route('/ai-query-endpoint', methods=['POST'])
async def ai_query_route():
    try:
        data = request.get_json()
        if not data: return jsonify({'error': 'No JSON payload received'}), 400

        required_params = ['ce_type', 'cos_content', 'ssol_goal']
        if not all(key in data for key in required_params):
            return jsonify({'error': f'Missing required parameters: {required_params}'}), 400
        
        ai_response = await generate_ai_data(
            node_type=data.get('ce_type'),
            cos_content=data.get('cos_content'),
            ssol_goal=data.get('ssol_goal'),
            agent_mode=data.get('agent_mode', 'speculate') # e.g., 'speculate', 'generate'
        )
        return jsonify({'success': True, 'ai_response': ai_response})

    except Exception as e:
        current_app.logger.error(f"Error in ai_query_route: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500