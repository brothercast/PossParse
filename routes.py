# routes.py (Refactored Version with create_cos route)
from flask import Blueprint, render_template, request, flash, redirect, url_for, jsonify, make_response, current_app, send_from_directory
import os
import json
import uuid
import pdfkit
import logging
import asyncio
from bs4 import BeautifulSoup
from app import app, USE_DATABASE # app is needed for app_context
from uuid import UUID
from utilities import generate_goal, analyze_user_input, generate_sentiment_analysis, generate_ssol_id
from utilities import generate_outcome_data, generate_ssol_image as util_generate_ssol_image
from dotenv import load_dotenv
from ce_nodes import NODES
from werkzeug.exceptions import BadRequest, NotFound
from ce_templates import generate_dynamic_modal, generate_ai_data
from speculate import get_ce_by_id as speculate_get_ce_by_id, \
                      update_ce_by_id as speculate_update_ce_by_id, \
                      create_cos as speculate_create_cos, \
                      get_cos_by_id as speculate_get_cos_by_id, \
                      update_cos_by_id as speculate_update_cos_by_id, \
                      delete_cos_by_id as speculate_delete_cos_by_id, \
                      analyze_cos as speculate_analyze_cos # Added analyze_cos alias
from models import get_engine_and_session, SSOL, COS # Import COS for type checking if needed
from urllib.parse import urlparse

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

            # Image generation can start here, but ensure it doesn't block response
            # For DB mode, we need an ssol_id. For non-DB, we might use goal title.
            # This part needs to align with how ssol_id is established later.
            # For now, let's assume image generation is tied to outcome creation more directly.

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
        selected_goal_text = request.form.get('selected_goal', '').strip()
        domain = request.form.get('domain', '').strip()
        selected_goal_title = request.form.get('selected_goal_title', '').strip()
        domain_icon = request.form.get('domain_icon', '').strip()

        if not selected_goal_text:
            flash("No goal selected. Please select a goal.", "error")
            return redirect(url_for('routes_bp.index'))
        try:
            outcome_data = await generate_outcome_data(USE_DATABASE, request, 'POST', selected_goal_text, domain, domain_icon, selected_goal_title)
            ssol_id_str = outcome_data['ssol_id']
            
            current_app.logger.info(f"SSOL ID: {ssol_id_str}. Preparing to generate image.")

            image_prompt_context = selected_goal_title if selected_goal_title else selected_goal_text
            image_prompt = (
                f"A colorful, charming, and visually stunning diorama in the style of 'It's a Small World', "
                f"depicting '{image_prompt_context}' as a fulfilled goal in the domain of '{domain}'. "
                f"The scene should include diverse people, use an isometric perspective, and have a 1:1 square aspect ratio. "
                f"The artwork should evoke a mid-century modern aesthetic, reminiscent of 1960s illustration. "
                f"Do not include any text or labels."
            )
            
            current_app.logger.info(f"Attempting to generate image for SSOL {ssol_id_str} synchronously (awaiting)...")
            # AWAIT the image generation directly for debugging
            image_web_path = await util_generate_ssol_image(image_prompt, ssol_id=ssol_id_str)
            current_app.logger.info(f"Image generation returned path: {image_web_path} for SSOL {ssol_id_str}")
            
            # Optionally, update outcome_data if the template uses a direct image path variable from ssol
            # For now, we assume outcome.html's JS fetches it.

            return render_template('outcome.html', ssol=outcome_data, nodes=NODES, ssol_id=ssol_id_str, selected_goal_title=selected_goal_title)
        except Exception as e:
            current_app.logger.error(f"Error generating outcome data or image: {e}", exc_info=True)
            flash("Error processing your request. Please try again.", "error") # More generic error
            return redirect(url_for('routes_bp.index')) # Redirect to index on major error
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
def save_as_pdf(ssol_id):
    try:
        data = request.get_json()
        if not data or 'htmlContent' not in data:
            raise ValueError("Invalid request: No HTML content provided.")
        html_content = data['htmlContent']

        # Path to your CSS file
        css_file_path = os.path.join(current_app.root_path, 'static', 'styles.css')
        if not os.path.exists(css_file_path):
             current_app.logger.error(f"CSS file not found at: {css_file_path}") # Log error
             # Fallback or error, but for now let's proceed without it if not found, pdfkit might still work
             css_param = None
        else:
            css_param = css_file_path

        # Ensure local file access for images, etc.
        # Replace relative static paths with absolute local file paths or external URLs
        # This example assumes static files are served from the root. Adjust if using a prefix.
        # For local file access, it's often better to point to the file system path.
        # However, for images served via Flask, _external=True should generate correct URLs.
        html_content = html_content.replace('src="/static/', f'src="{url_for("static", filename="", _external=True)}')
        # For local file system paths (requires enable-local-file-access):
        # html_content = html_content.replace('src="/static/', 'src="' + os.path.join(current_app.static_folder,''))


        options = {
            "page-size": "Letter",
            "margin-top": "0.75in",
            "margin-right": "0.75in",
            "margin-bottom": "0.75in",
            "margin-left": "0.75in",
            "encoding": "UTF-8",
            "no-outline": None,
            "enable-local-file-access": None, # Crucial for local images/CSS if not inlined
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
        if not data:
            raise BadRequest('No JSON payload received.')

        content = data.get('content')
        status = data.get('status', 'Proposed') # Default status
        ssol_id_str = data.get('ssol_id')
        accountable_party = data.get('accountable_party')
        completion_date = data.get('completion_date') # Should be ISO format string or None

        if not content or not ssol_id_str:
            raise BadRequest('Missing required fields: content and ssol_id are required.')

        try:
            ssol_id_uuid = UUID(ssol_id_str)
        except ValueError:
            raise BadRequest(f"Invalid ssol_id format: '{ssol_id_str}'. Must be a valid UUID.")

        # speculate_create_cos already handles USE_DATABASE context internally
        # and performs analysis to embed CE pills.
        # It returns the new cos_id (string).
        new_cos_id_str = await speculate_create_cos(
            USE_DATABASE,
            ssol_id=ssol_id_uuid, # Pass UUID object
            content=content,
            status=status,
            accountable_party=accountable_party,
            completion_date=completion_date
        )

        if not new_cos_id_str:
            raise Exception("Failed to create COS record.")

        # Fetch the newly created COS to get its full data, including processed content
        if USE_DATABASE:
            with app.app_context(): # Ensure app context for DB operations
                engine, session = get_engine_and_session()
                # speculate_get_cos_by_id expects a UUID object if db, string if not
                created_cos = speculate_get_cos_by_id(USE_DATABASE, UUID(new_cos_id_str))
                if created_cos:
                    cos_dict = created_cos.to_dict()
                else:
                    cos_dict = None
                session.close()
        else:
            created_cos = speculate_get_cos_by_id(USE_DATABASE, new_cos_id_str)
            cos_dict = created_cos # In-memory store returns a dict

        if not cos_dict:
             current_app.logger.error(f"Failed to retrieve newly created COS with ID: {new_cos_id_str}")
             return jsonify(success=False, error="COS created but could not be retrieved."), 500

        return jsonify(success=True, cos=cos_dict), 201 # 201 Created

    except BadRequest as e:
        current_app.logger.warning(f"BadRequest in create_cos_route: {e}")
        return jsonify(success=False, error=str(e)), 400
    except Exception as e:
        current_app.logger.error(f"Error creating COS: {e}", exc_info=True)
        return jsonify(success=False, error="An unexpected error occurred while creating the COS."), 500


@routes_bp.route('/update_cos/<uuid:cos_id>', methods=['PUT'])
async def update_cos_route(cos_id): # Changed to async to allow await on speculate_update_cos_by_id if it becomes async
    try:
        data = request.get_json()
        if not data:
            raise BadRequest('No JSON payload received')
        cos_id_str = str(cos_id) # Ensure it's a string for in-memory store key if not using UUID object

        # speculate_update_cos_by_id handles USE_DATABASE context internally
        # It might become async if it involves AI re-analysis for CE pills.
        # For now, assuming it's synchronous but can be awaited if needed.
        update_result = await speculate_update_cos_by_id(USE_DATABASE, cos_id, data) # Pass UUID obj

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
    # speculate_delete_cos_by_id handles USE_DATABASE context internally
    try:
        success = speculate_delete_cos_by_id(USE_DATABASE, cos_id) # Pass UUID obj

        if success:
            return jsonify(success=True), 200
        return jsonify(success=False, error="COS not found or could not be deleted."), 404
    except Exception as e:
        current_app.logger.error(f"Error deleting COS {cos_id}: {e}", exc_info=True)
        return jsonify(success=False, error="An unexpected error occurred."), 500


# --- SSOL Image ---
@routes_bp.route('/get_ssol_image/<uuid:ssol_id>') # Keep uuid converter for type safety
async def get_ssol_image_route(ssol_id): # Renamed parameter to avoid clash with module
    ssol_id_str = str(ssol_id)
    image_filename = f"ssol_image_{ssol_id_str}.png" # Standard naming convention
    image_web_path_relative = os.path.join('images', image_filename).replace("\\", "/")
    image_fs_path = os.path.join(current_app.static_folder, 'images', image_filename)

    current_app.logger.info(f"GET_SSOL_IMAGE: Checking for {image_fs_path}")

    if os.path.exists(image_fs_path):
        current_app.logger.info(f"GET_SSOL_IMAGE: Found image {image_filename} for SSOL {ssol_id_str}.")
        return jsonify({'image_path': url_for('static', filename=image_web_path_relative), 'status': 'found'})
    else:
        current_app.logger.warning(f"GET_SSOL_IMAGE: Image {image_filename} for SSOL {ssol_id_str} not found at {image_fs_path}. It might still be generating.")
        # Return a specific status so client can retry or use default
        return jsonify({
            'image_path': url_for('static', filename='images/sspec_default.png'), # Provide default
            'status': 'pending_or_not_found', 
            'message': 'Image is processing or was not found. Displaying default.'
        }), 200 # Return 200 but with a status indicator

# --- CE Routes ---
@routes_bp.route('/get_ce_by_id', methods=['GET'])
def get_ce_by_id_route():
    ce_id_str = request.args.get('ce_id')
    if not ce_id_str:
        return jsonify(error="Missing 'ce_id' parameter"), 400
    try:
        ce_id = UUID(ce_id_str) # Convert to UUID
        # speculate_get_ce_by_id handles USE_DATABASE context
        ce = speculate_get_ce_by_id(USE_DATABASE, ce_id)

        if ce:
            return jsonify(ce=ce.to_dict() if USE_DATABASE else ce) # to_dict if model, else it's already dict
        return jsonify(error="CE not found"), 404

    except ValueError:
        return jsonify(error=f"Invalid CE ID format: {ce_id_str}"), 400
    except Exception as e:
        current_app.logger.error(f"Error getting CE {ce_id_str}: {e}", exc_info=True)
        return jsonify(error="An unexpected error occurred."), 500


@routes_bp.route('/analyze_cos/<uuid:cos_id>', methods=['GET']) # Changed to expect UUID
async def analyze_cos_by_id_route(cos_id): # Renamed from analyze_cos_by_id
    # speculate_analyze_cos handles USE_DATABASE context
    try:
        # First, get the COS content
        if USE_DATABASE:
            with app.app_context():
                engine, session = get_engine_and_session()
                cos_instance = session.query(COS).get(cos_id)
                session.close()
                if not cos_instance:
                    return jsonify({'success': False, 'message': 'COS not found'}), 404
                cos_content_to_analyze = cos_instance.content
        else:
            from store import cos_store
            cos_data = cos_store.get(str(cos_id))
            if not cos_data:
                return jsonify({'success': False, 'message': 'COS not found'}), 404
            cos_content_to_analyze = cos_data['content']
        
        # Now analyze its content
        # Pass cos_id (as string) for potential use within analyze_cos if it needs to link CEs back
        analysis_results = await speculate_analyze_cos(cos_content_to_analyze, str(cos_id))
        
        # If the analysis also updated the COS content in the database (e.g. added pills)
        # we might want to return the fresh COS object or its content.
        # For now, just returning analysis_results as per previous structure.
        return jsonify({'success': True, 'analysis_results': analysis_results}), 200

    except Exception as e:
        current_app.logger.error(f"Error analyzing COS {cos_id}: {e}", exc_info=True)
        return jsonify({'success': False, 'message': 'An unexpected error occurred during analysis.'}), 500


@routes_bp.route('/get_ce_modal/<string:ce_type>', methods=['POST'])
async def get_ce_modal_route(ce_type):
    try:
        data = request.get_json()
        current_app.logger.debug(f"get_ce_modal_route - request.get_json() data: {data}")

        ce_id_str = data.get('ce_id')
        ce_id_obj = UUID(ce_id_str) if ce_id_str else None


        # speculate_get_ce_by_id handles USE_DATABASE context
        ce_instance_or_dict = speculate_get_ce_by_id(USE_DATABASE, ce_id_obj) if ce_id_obj else None
        
        ce_data_for_modal = {}
        if ce_instance_or_dict:
            if USE_DATABASE and hasattr(ce_instance_or_dict, 'to_dict'):
                ce_data_for_modal = ce_instance_or_dict.to_dict()
            elif not USE_DATABASE and isinstance(ce_instance_or_dict, dict):
                 ce_data_for_modal = ce_instance_or_dict
            # Ensure 'id' is a string for template, even if it was UUID object
            if 'id' in ce_data_for_modal and isinstance(ce_data_for_modal['id'], UUID):
                ce_data_for_modal['id'] = str(ce_data_for_modal['id'])


        cos_content = data.get('cos_content', '')
        phase_name = data.get('phase_name', '')
        phase_index = data.get('phase_index', 0)
        ssol_goal = data.get('ssol_goal','')
        existing_ces = data.get('existing_ces', []) # For providing context to AI

        current_app.logger.debug(f"get_ce_modal_route - BEFORE generate_dynamic_modal - phase_name: '{phase_name}', phase_index: {phase_index}, ce_data_for_modal: {ce_data_for_modal}")

        ai_generated_data_for_modal = {} # Initialize
        if ce_type: # Only generate if ce_type is meaningful
             # Pass ce_id_str for logging/identification if needed by generate_ai_data
             ai_generated_data_for_modal = await generate_ai_data(cos_content, ce_id_str, ce_type, ssol_goal, existing_ces)

        from store import ce_store as in_memory_ce_store # Pass in-memory store for non-DB mode
        modal_html = await generate_dynamic_modal(
            ce_type,
            ce_data=ce_data_for_modal, # Pass the prepared dict
            cos_content=cos_content,
            ai_generated_data=ai_generated_data_for_modal,
            phase_name=phase_name,
            phase_index=phase_index,
            ce_store=in_memory_ce_store # ce_templates.py expects this
        )

        return jsonify(modal_html=modal_html, ai_generated_data=ai_generated_data_for_modal)

    except ValueError as ve: # For UUID conversion errors
        current_app.logger.error(f"ValueError in get_ce_modal: {ve}", exc_info=True)
        return jsonify(error=f"Invalid data format: {str(ve)}"), 400
    except Exception as e:
        current_app.logger.error(f"Error generating CE modal for type {ce_type}: {e}", exc_info=True)
        return jsonify(error=f"An error occurred: {str(e)}"), 500


@routes_bp.route('/ai-query-endpoint', methods=['POST'])
async def ai_query_route():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON payload received'}), 400

        ce_type = data.get('ce_type')
        cos_content = data.get('cos_content')
        ce_id = data.get('ce_id') # This could be string or None
        ssol_goal = data.get('ssol_goal')
        existing_ces = data.get('existing_ces', [])

        if not ce_type or not cos_content or not ssol_goal:
            return jsonify({'error': 'Missing required parameters: ce_type, cos_content, ssol_goal'}), 400

        ai_response = await generate_ai_data(cos_content, ce_id, ce_type, ssol_goal, existing_ces)

        return jsonify({'success': True, 'ai_response': ai_response})

    except Exception as e:
        current_app.logger.error(f"Error in ai_query_route: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@routes_bp.route('/update_ce/<uuid:ce_id>', methods=['PUT'])
def update_ce_route(ce_id): # ce_id is already a UUID object from Flask's converter
    try:
        data = request.get_json()
        if not data:
            raise BadRequest('No JSON payload received')

        # speculate_update_ce_by_id handles USE_DATABASE context
        success = speculate_update_ce_by_id(USE_DATABASE, ce_id, data) # Pass UUID object

        if success:
            # Optionally, fetch and return the updated CE data
            updated_ce_obj = speculate_get_ce_by_id(USE_DATABASE, ce_id)
            if updated_ce_obj:
                ce_data = updated_ce_obj.to_dict() if USE_DATABASE else updated_ce_obj
                return jsonify(success=True, ce=ce_data), 200
            return jsonify(success=True, message="CE updated but could not be retrieved."), 200
        return jsonify(success=False, error="CE not found or could not be updated"), 404
    except BadRequest as e:
        return jsonify(success=False, error=str(e)), 400
    except Exception as e:
        current_app.logger.error(f"Error updating CE {ce_id}: {e}", exc_info=True)
        return jsonify(success=False, error="An unexpected error occurred."), 500
