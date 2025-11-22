# routes.py
import os
import json
import uuid
import logging
import asyncio
import pdfkit
from uuid import UUID
from dotenv import load_dotenv
from bs4 import BeautifulSoup
from app import USE_DATABASE
from ce_nodes import NODES
from werkzeug.exceptions import BadRequest, NotFound
from models import get_engine_and_session, SSOL, COS
from ce_templates import generate_dynamic_modal
from ai_service import cleanup_gemini_client, generate_chat_response
from flask import Blueprint, render_template, request, flash, redirect, url_for, \
                    jsonify, make_response, current_app, send_from_directory
from utilities import generate_goal, analyze_user_input, is_input_compliant, \
                    generate_outcome_data, generate_ai_data, generate_image
from speculate import get_ce_by_id as speculate_get_ce_by_id, \
                      update_ce_by_id as speculate_update_ce_by_id, \
                      create_cos as speculate_create_cos, \
                      get_cos_by_id as speculate_get_cos_by_id, \
                      update_cos_by_id as speculate_update_cos_by_id, \
                      delete_cos_by_id as speculate_delete_cos_by_id, \
                      analyze_cos as speculate_analyze_cos, \
                      create_ssol as speculate_create_ssol

load_dotenv()

routes_bp = Blueprint('routes_bp', __name__)

# --- Lifecycle Management ---
@routes_bp.teardown_app_request
async def teardown_request(exception=None):
    """Clean up AI resources after each request."""
    await cleanup_gemini_client()

# --- Utility Routes ---
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
            current_app.logger.info(f"User Input: '{user_input}'. Calling generate_goal...")
            goal_options = await generate_goal(user_input)

            if not goal_options:
                flash("Could not generate goal options. Please try again or rephrase your input.", "warning")
                return render_template('input.html')

            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify(goals=goal_options, user_input=user_input)

            return render_template('goal_selection.html', goals=goal_options, user_input=user_input)
        except Exception as e:
            current_app.logger.error(f"Unexpected error in goal_selection: {e}", exc_info=True)
            flash(f"An unexpected error occurred: {e}", "error")
            return render_template('input.html', user_text=user_input)
    return redirect(url_for('routes_bp.index'))

# --- Outcome Generation ---
@routes_bp.route('/outcome', methods=['POST'])
async def outcome():
    if request.method == 'POST':
        selected_goal_text = request.form.get('selected_goal', '').strip()
        domain = request.form.get('domain', '').strip()
        selected_goal_title = request.form.get('selected_goal_title', '').strip()
        domain_icon = request.form.get('domain_icon', '').strip()

        if not selected_goal_text:
            flash("No goal selected. Please try again.", "error")
            return redirect(url_for('routes_bp.index'))
            
        try:
            # Create SSOL
            ssol_id_str = speculate_create_ssol(
            USE_DATABASE, 
            selected_goal_title, 
            selected_goal_text, 
            domain=domain
        )
            ssol_id_uuid = UUID(ssol_id_str)
            current_app.logger.info(f"SSOL created with ID: {ssol_id_str}")
            
            # Generate Structure
            current_app.logger.info("Generating structured solution from AI...")
            structured_solution_json = await generate_outcome_data(
                ssol_title=selected_goal_title, ssol_description=selected_goal_text, domain=domain
            )
            ssol_summary = structured_solution_json.get('ssolsummary', 'AI failed to generate a summary.')

            # Save COS items
            current_app.logger.info("Saving generated COS and their CEs...")
            phases_for_template = {}
            if 'phases' in structured_solution_json:
                for phase_name, cos_items in structured_solution_json['phases'].items():
                    phases_for_template[phase_name] = []
                    for cos_content_with_tags in cos_items:
                        if cos_content_with_tags:
                            new_cos_id_str = await speculate_create_cos(
                                USE_DATABASE, ssol_id=ssol_id_uuid, content=cos_content_with_tags, status='Proposed'
                            )
                            newly_created_cos = speculate_get_cos_by_id(USE_DATABASE, UUID(new_cos_id_str))
                            if newly_created_cos:
                                phases_for_template[phase_name].append(newly_created_cos.to_dict() if USE_DATABASE else newly_created_cos)

            outcome_data_for_template = {
                'ssol_id': ssol_id_str,
                'ssol_title': selected_goal_title,
                'selected_goal': selected_goal_text,
                'domain': domain,
                'domain_icon': domain_icon,
                'ssol_summary': ssol_summary,
                'phases': phases_for_template,
            }

            # Async Image Generation (Non-blocking/Graceful fail)
            try:
                current_app.logger.info("Dispatching image generation task...")
                image_prompt = f"""A vibrant, isometric, mid-century retro illustration of '{selected_goal_title}: {selected_goal_text}' 
                                    fulfilled, painterly lithograph style, 1950s Popular Science magazine cover, 
                                    saturated colors, idealized realism, optimistic composition, featuring 
                                    people of diverse ethnicities, ages, genders, and abilities, no text.
                                    """
                await generate_image(image_prompt, ssol_id_str)
            except Exception as img_exc:
                current_app.logger.error(f"Image generation failed for SSOL {ssol_id_str}: {img_exc}")

            return render_template('outcome.html', ssol=outcome_data_for_template, nodes=NODES, ssol_id=ssol_id_str)

        except Exception as e:
            current_app.logger.error(f"CRITICAL error in /outcome: {e}", exc_info=True)
            flash(f"A critical error occurred while generating the solution. Error: {e}", "error")
            return redirect(url_for('routes_bp.index'))

    return redirect(url_for('routes_bp.index'))


# --- Modal Generation (The Speculation Environment Shell) ---
@routes_bp.route('/get_ce_modal/<string:ce_type>', methods=['POST'])
async def get_ce_modal_route(ce_type):
    try:
        data = request.get_json()
        ce_id_str = data.get('ce_id')
        ce_text = data.get('ce_text', 'Conditional Element')

        ce_id_obj = UUID(ce_id_str) if ce_id_str else None
        ce_data = speculate_get_ce_by_id(USE_DATABASE, ce_id_obj) if ce_id_obj else {}
        
        # Initialize data structure if empty or missing
        if not ce_data or 'data' not in ce_data:
            ce_data = {
                'id': ce_id_str, 
                'node_type': ce_type, 
                'data': {
                    'details_data': {}, 
                    'resources': [],
                    'prerequisites': [],
                    'stakeholders': [],
                    'assumptions': [],
                    'connections': []
                }
            }

        node_config = NODES.get(ce_type, NODES['Default'])
        
        # Get basic context (Overview) from AI
        cos_content_html = data.get('cos_content', '')
        cos_content_text = BeautifulSoup(cos_content_html, 'html.parser').get_text(separator=' ', strip=True)
        
        ai_generated_data = await generate_ai_data(
            node_type=ce_type,
            cos_content=cos_content_text,
            ssol_goal=data.get('ssol_goal', ''),
            agent_mode='context'
        )

        modal_html = await generate_dynamic_modal(
            ce_type=ce_type,
            ce_text=ce_text,
            ce_data=ce_data,
            node_info=node_config,
            cos_content=cos_content_html,
            ai_generated_data=ai_generated_data,
            phase_name=data.get('phase_name', ''),
            phase_index=data.get('phase_index', 0)
        )
        
        return jsonify(modal_html=modal_html, ce_data=ce_data)

    except Exception as e:
        current_app.logger.error(f"Error in get_ce_modal_route: {e}", exc_info=True)
        return jsonify(error=f"An error occurred: {str(e)}"), 500


# --- THE UNIVERSAL INTELLIGENCE ROUTE (The Brain) ---
@routes_bp.route('/speculate_context', methods=['POST'])
async def speculate_context_route():
    """
    The Universal Brain of the Speculation Environment.
    It handles two types of requests:
    1. 'collections': Generating lists of items (Prerequisites, Stakeholders, etc.)
    2. 'narrative': generating text for specific details fields (Summary, Context, etc.)
    """
    try:
        data = request.get_json()
        ce_type = data.get('ce_type')           # e.g. 'Research', 'Risk'
        context = data.get('context')           # e.g. 'prerequisites', 'narrative'
        sub_context = data.get('sub_context')   # e.g. 'summary' (only for narrative)
        cos_text = data.get('cos_text', 'Achieve the goal.')

        # 1. Load Node Configuration & Prompts
        # Fallback to Default if the specific node type isn't found
        node_config = NODES.get(ce_type, NODES['Default'])
        prompts_map = node_config.get('prompts', {})
        
        # Ensure we have access to Default prompts if the specific node misses one
        default_prompts = NODES['Default'].get('prompts', {})

        final_prompt = ""
        system_instruction = "You are the SPECULATE Engine. Respond ONLY with valid JSON. Do not use markdown formatting."

        # 2. Branch Logic: Narrative vs. Collections
        if context == 'narrative':
            # --- Narrative Mode (Text Generation) ---
            
            # Try to find a specific narrative prompt, otherwise use a smart fallback
            raw_prompt = prompts_map.get('narrative', default_prompts.get('narrative'))
            
            if not raw_prompt:
                # Hard fallback if not defined in nodes yet
                raw_prompt = """
                Act as a strategic project manager. Write a professional 1-paragraph '{field}' 
                for a '{node_type}' element needed to achieve: '{cos_text}'.
                Focus on clarity, actionability, and value.
                Return strictly JSON: {{ "text": "Your generated text here." }}
                """
            
            # Inject the specific field name (e.g. 'Executive Summary') and context
            field_label = sub_context.replace('_', ' ').title() if sub_context else "Description"
            final_prompt = raw_prompt.format(
                cos_text=cos_text, 
                field=field_label, 
                node_type=ce_type
            )

        else:
            # --- Collection Mode (List Generation) ---
            
            # Retrieve the specific collection prompt (e.g., for 'prerequisites')
            raw_prompt = prompts_map.get(context, default_prompts.get(context))
            
            if not raw_prompt:
                # Hard fallback
                raw_prompt = f"Analyze '{cos_text}'. List 3 strategic items for {{context}}. Return JSON array."
            
            # Inject context
            final_prompt = raw_prompt.format(cos_text=cos_text)

        # 3. Execute SPECULATE Engine (AI Call)
        current_app.logger.info(f"Speculating {ce_type} -> {context} ({sub_context or 'list'})")
        
        ai_response_str = await generate_chat_response(
            messages=[{"role": "user", "content": final_prompt}], 
            role="Speculate Engine", 
            task=f"Speculate {context}",
            system_instruction=system_instruction,
            temperature=0.7
        )
        
        # 4. Clean and Parse JSON
        try:
            # Strip Markdown backticks if present (Common LLM artifact)
            cleaned_response = ai_response_str.replace("```json", "").replace("```", "").strip()
            parsed_json = json.loads(cleaned_response)
        except json.JSONDecodeError:
            current_app.logger.warning(f"Failed to parse AI JSON: {ai_response_str}")
            return jsonify({'success': False, 'error': 'AI returned invalid format. Please try again.'}), 500

        # 5. Return Formatted Data
        if context == 'narrative':
            # Expecting object: { "text": "..." }
            text_content = parsed_json.get('text', '') if isinstance(parsed_json, dict) else str(parsed_json)
            return jsonify({
                'success': True, 
                'text': text_content, 
                'field': sub_context
            })
        else:
            # Expecting list: [ {...}, {...} ]
            # Handle case where AI wraps list in a root object like { "items": [...] }
            if isinstance(parsed_json, dict):
                # Try to find the first list value
                for key, val in parsed_json.items():
                    if isinstance(val, list):
                        suggestions = val
                        break
                else:
                    suggestions = [] # Fallback
            elif isinstance(parsed_json, list):
                suggestions = parsed_json
            else:
                suggestions = []

            return jsonify({
                'success': True, 
                'suggestions': suggestions, 
                'context': context
            })

    except Exception as e:
        current_app.logger.error(f"Speculation Error in routes: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

# --- Data Operations (CRUD) ---

@routes_bp.route('/update_ce/<uuid:ce_id>', methods=['PUT'])
def update_ce_route(ce_id):
    try:
        data = request.get_json()
        if not data: raise BadRequest('No JSON payload')
        
        # We store the entire structure (collections + details) in the 'data' JSON column
        success = speculate_update_ce_by_id(USE_DATABASE, ce_id, data)
        
        if success:
            return jsonify(success=True), 200
        return jsonify(success=False, error="Update failed"), 500
    except Exception as e:
        current_app.logger.error(f"Error updating CE {ce_id}: {e}")
        return jsonify(success=False, error=str(e)), 500


@routes_bp.route('/create_cos', methods=['POST'])
async def create_cos_route():
    try:
        data = request.get_json()
        new_cos_id = await speculate_create_cos(
            USE_DATABASE, 
            UUID(data['ssol_id']), 
            data['content'], 
            data.get('status', 'Proposed'),
            data.get('accountable_party'),
            data.get('completion_date')
        )
        if new_cos_id:
            cos_obj = speculate_get_cos_by_id(USE_DATABASE, UUID(new_cos_id))
            return jsonify(success=True, cos=cos_obj.to_dict() if USE_DATABASE else cos_obj), 201
        return jsonify(success=False, error="Creation failed"), 500
    except Exception as e:
        return jsonify(success=False, error=str(e)), 500

@routes_bp.route('/update_cos/<uuid:cos_id>', methods=['PUT'])
async def update_cos_route(cos_id):
    try:
        data = request.get_json()
        result = await speculate_update_cos_by_id(USE_DATABASE, cos_id, data)
        if result['success']: return jsonify(success=True, cos=result['cos'])
        return jsonify(success=False, error=result['message']), result['status_code']
    except Exception as e:
        return jsonify(success=False, error=str(e)), 500

@routes_bp.route('/delete_cos/<uuid:cos_id>', methods=['DELETE'])
def delete_cos_route(cos_id):
    if speculate_delete_cos_by_id(USE_DATABASE, cos_id):
        return jsonify(success=True)
    return jsonify(success=False, error="Deletion failed"), 404


# --- Image & Export Operations ---

@routes_bp.route('/get_ssol_image/<uuid:ssol_id>')
def get_ssol_image_route(ssol_id):
    img_path = f"images/ssol_image_{ssol_id}.png"
    full_path = os.path.join(current_app.static_folder, img_path)
    if os.path.exists(full_path):
        return jsonify({'image_path': url_for('static', filename=img_path), 'status': 'found'})
    return jsonify({'status': 'pending_or_not_found'}), 200

@routes_bp.route('/save_as_pdf/<uuid:ssol_id>', methods=['POST'])
def save_as_pdf(ssol_id):
    try:
        data = request.get_json()
        if not data or 'htmlContent' not in data:
            raise ValueError("Invalid request: No HTML content provided.")
        html_content = data['htmlContent']

        css_file_path = os.path.join(current_app.root_path, 'static', 'styles.css')
        css_param = css_file_path if os.path.exists(css_file_path) else None

        # Convert relative paths to absolute
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

# --- Input Analysis ---

@routes_bp.route('/analyze_input', methods=['POST'])
async def analyze_input_route():
    try:
        txt = request.form.get('user_text')
        if not txt: return jsonify({'error': 'No text'}), 400
        return jsonify({
            'keywords': await analyze_user_input(txt), 
            'compliance': await is_input_compliant(txt)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500