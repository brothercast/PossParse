# routes.py
import os
import json
import uuid
import logging
import asyncio
import pdfkit
from uuid import UUID
from datetime import date, timedelta, datetime
from dotenv import load_dotenv
from bs4 import BeautifulSoup
from werkzeug.exceptions import BadRequest, NotFound
from flask import Blueprint, render_template, request, flash, redirect, url_for, \
                    jsonify, make_response, current_app, send_from_directory

# --- App Context ---
from app import USE_DATABASE

# --- Data Models & Config ---
from models import get_engine_and_session, SSOL, COS
from ce_nodes import NODES
from system_nodes import SYSTEM_NODES
from system_templates import (
    render_command_deck, 
    render_system_config_modal
)

# --- Service Layers ---
from ai_service import cleanup_gemini_client, generate_chat_response
from utilities import generate_goal, analyze_user_input, is_input_compliant, \
                    generate_outcome_data, generate_ai_data, generate_image, \
                    format_ssol_text

# --- Speculation Operations ---
from speculate import get_ce_by_id as speculate_get_ce_by_id, \
                      update_ce_by_id as speculate_update_ce_by_id, \
                      create_cos as speculate_create_cos, \
                      get_cos_by_id as speculate_get_cos_by_id, \
                      update_cos_by_id as speculate_update_cos_by_id, \
                      delete_cos_by_id as speculate_delete_cos_by_id, \
                      analyze_cos as speculate_analyze_cos, \
                      create_ssol as speculate_create_ssol

# --- Template Generators ---
from ce_templates import generate_dynamic_modal

load_dotenv()

routes_bp = Blueprint('routes_bp', __name__)

# ==============================================================================
# 1. LIFECYCLE MANAGEMENT
# ==============================================================================

@routes_bp.teardown_app_request
async def teardown_request(exception=None):
    """Clean up AI resources after each request."""
    await cleanup_gemini_client()

# ==============================================================================
# 2. BASIC NAVIGATION & UTILITIES
# ==============================================================================

@routes_bp.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(current_app.root_path, 'static'), 'favicon.ico', mimetype='image/vnd.microsoft.icon')

@routes_bp.route('/')
def index():
    return render_template('input.html')

@routes_bp.route('/about')
def about():
    return render_template('about.html')

@routes_bp.route('/analyze_input', methods=['POST'])
async def analyze_input_route():
    text = request.form.get('user_text')
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    
    return jsonify({
        'keywords': await analyze_user_input(text), 
        'compliance': await is_input_compliant(text)
    })

# ==============================================================================
# 3. GOAL SELECTION
# ==============================================================================

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
                flash("Could not generate goal options. Please try again.", "warning")
                return render_template('input.html')

            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify(goals=goal_options, user_input=user_input)

            return render_template('goal_selection.html', goals=goal_options, user_input=user_input)
        except Exception as e:
            current_app.logger.error(f"Error in goal_selection: {e}", exc_info=True)
            flash(f"An error occurred: {e}", "error")
            return render_template('input.html', user_text=user_input)
    return redirect(url_for('routes_bp.index'))

# ==============================================================================
# 4. OUTCOME GENERATION (The Bootstrapper)
# ==============================================================================

@routes_bp.route('/outcome', methods=['POST'])
async def outcome():
    if request.method == 'POST':
        # 1. EXTRACT FORM DATA
        selected_goal_text = request.form.get('selected_goal', '').strip()
        domain = request.form.get('domain', '').strip()
        selected_goal_title = request.form.get('selected_goal_title', '').strip()
        domain_icon = request.form.get('domain_icon', '').strip()

        if not selected_goal_text:
            flash("No goal selected. Please try again.", "error")
            return redirect(url_for('routes_bp.index'))
            
        try:
            current_app.logger.info(f"Initializing Outcome for: {selected_goal_title}")

            # ------------------------------------------------------------------
            # 2. GENERATE INTELLIGENCE (Structure + System Nodes)
            # ------------------------------------------------------------------
            structured_solution_json = await generate_outcome_data(
                ssol_title=selected_goal_title, 
                ssol_description=selected_goal_text, 
                domain=domain
            )
            
            raw_summary = structured_solution_json.get('ssolsummary', 'Analysis pending...')
            # Apply Formatting (Magic Parsing for System Tags)
            ssol_summary = format_ssol_text(raw_summary)
            
            ai_system_params = structured_solution_json.get('system_params', {})

            # ------------------------------------------------------------------
            # 3. CREATE SSOL CONTAINER
            # ------------------------------------------------------------------
            ssol_id_str = speculate_create_ssol(
                USE_DATABASE, 
                selected_goal_title, 
                selected_goal_text, 
                domain=domain
            )
            ssol_id_uuid = UUID(ssol_id_str)

            # ------------------------------------------------------------------
            # 4. BOOTSTRAP SYSTEM NODES (DB Save)
            # ------------------------------------------------------------------
            if USE_DATABASE:
                engine, session = get_engine_and_session()
                try:
                    ssol_obj = session.query(SSOL).get(ssol_id_uuid)
                    if ssol_obj:
                        ssol_obj.system_data = ai_system_params
                        if 'OPERATOR' in ai_system_params:
                            ssol_obj.owner = ai_system_params['OPERATOR']
                        session.commit()
                        current_app.logger.info("Saved inferred System Nodes to DB.")
                except Exception as db_e:
                    current_app.logger.error(f"Failed to save System Data: {db_e}")
                finally:
                    session.close()

            # ------------------------------------------------------------------
            # 5. CREATE PHASES & CONDITIONS (Refactored for Reliability)
            # ------------------------------------------------------------------
            phases_for_template = {}
            
            if 'phases' in structured_solution_json:
                for phase_name, cos_items in structured_solution_json['phases'].items():
                    phases_for_template[phase_name] = []
                    
                    for cos_content_with_tags in cos_items:
                        if not cos_content_with_tags: continue
                            
                        try:
                            # CREATE AND GET DATA IN ONE SHOT
                            cos_data = await speculate_create_cos(
                                USE_DATABASE, 
                                ssol_id=ssol_id_uuid, 
                                content=cos_content_with_tags, 
                                status='Proposed'
                            )
                            
                            if cos_data:
                                phases_for_template[phase_name].append(cos_data)
                            else:
                                current_app.logger.warning(f"COS creation returned empty data for phase {phase_name}")
                                    
                        except Exception as cos_err:
                            current_app.logger.error(f"Error generating COS: {cos_err}")

            # ------------------------------------------------------------------
            # 6. RENDER COMMAND DECK UI (Visuals)
            # ------------------------------------------------------------------
            # We build the master list, then pass it to the single render function.
            deck_params_list = []
            
            # A. Prepare Horizon (Default 1 year)
            import datetime
            default_horizon = (datetime.date.today() + datetime.timedelta(days=365)).strftime('%Y-%m-%d')
            deck_params_list.append({
                'type': 'HORIZON', 
                'id': f'horizon_{ssol_id_str}', 
                'value': default_horizon 
            })
            
            # B. Prepare System Anchors
            for key, val in ai_system_params.items():
                if key in SYSTEM_NODES and key != 'HORIZON':
                    deck_params_list.append({
                        'type': key,
                        'id': f'sys_{key}_{str(uuid.uuid4())[:8]}',
                        'value': val
                    })

            # C. Render Components
            # render_command_deck returns {'horizon_html': ..., 'sidebar_html': ...}
            components = render_command_deck(deck_params_list) 
            
            gauge_html = components['horizon_html']
            pills_html = components['sidebar_html']
            
            config_modal = render_system_config_modal()

            # ------------------------------------------------------------------
            # 7. ASYNC IMAGE GENERATION
            # ------------------------------------------------------------------
            try:
                image_prompt = f"""
                A vibrant, isometric, mid-century retro illustration of '{selected_goal_title}: {selected_goal_text}' 
                fulfilled. Style: 1950s Popular Science magazine cover meets Syd Mead.
                Characteristics: Saturated technicolor palette (teal, orange, cream), painterly lithograph texture,
                idealized realism, optimistic composition. No text.
                """
                await generate_image(image_prompt, ssol_id_str)
            except Exception as e:
                current_app.logger.warning(f"Image gen trigger failed: {e}")

            # ------------------------------------------------------------------
            # 8. FINAL RENDER
            # ------------------------------------------------------------------
            outcome_data = {
                'ssol_id': ssol_id_str,
                'ssol_title': selected_goal_title,
                'selected_goal': selected_goal_text,
                'domain': domain,
                'domain_icon': domain_icon,
                'ssol_summary': ssol_summary,
                'phases': phases_for_template
            }

            return render_template(
                'outcome.html', 
                ssol=outcome_data, 
                nodes=NODES, 
                ssol_id=ssol_id_str,
                horizon_gauge_html=gauge_html,
                system_pills_html=pills_html,
                system_config_modal_html=config_modal
            )

        except Exception as e:
            current_app.logger.error(f"CRITICAL error in /outcome: {e}", exc_info=True)
            flash(f"System Critical Error: {e}", "error")
            return redirect(url_for('routes_bp.index'))

    return redirect(url_for('routes_bp.index'))

# ==============================================================================
# 5. INTELLIGENCE & CONFIG
# ==============================================================================
@routes_bp.route('/update_ssol_system_node', methods=['POST'])
def update_ssol_system_node():
    data = request.get_json()
    ssol_id = data.get('ssol_id')
    key = data.get('key')   # e.g., 'BUDGET'
    value = data.get('value') # e.g., 'Bootstrapped'

    if not ssol_id or not key:
        return jsonify({'success': False}), 400

    engine, session = get_engine_and_session()
    try:
        ssol = session.query(SSOL).get(UUID(ssol_id))
        if not ssol:
            return jsonify({'success': False, 'error': 'SSOL not found'}), 404

        # Specialized handling for CORE fields that have their own columns
        if key == 'HORIZON':
            try:
                # Try to parse date, fallback to text if user typed "Next Summer"
                from datetime import datetime
                dt = datetime.strptime(value, '%Y-%m-%d').date()
                ssol.target_date = dt
            except:
                # If fuzzy date, store in system_data instead
                current_data = dict(ssol.system_data or {})
                current_data['HORIZON_TEXT'] = value
                ssol.system_data = current_data
        
        elif key == 'OPERATOR':
            ssol.owner = value
            # Also store in JSON for the prompt engine
            current_data = dict(ssol.system_data or {})
            current_data['OPERATOR'] = value
            ssol.system_data = current_data
            
        else:
            # Generic System Node (Budget, Directive, etc.)
            # Mutable dict approach for SQLAlchemy JSON tracking
            current_data = dict(ssol.system_data or {})
            current_data[key] = value
            ssol.system_data = current_data

        session.commit()
        return jsonify({'success': True})
    except Exception as e:
        session.rollback()
        current_app.logger.error(f"Error in update_ssol_system_node: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        session.close()

@routes_bp.route('/speculate_context', methods=['POST'])
async def speculate_context_route():
    try:
        data = request.get_json()
        ce_type = data.get('ce_type', 'Default')
        context = data.get('context') # e.g., 'prerequisites', 'narrative'
        sub_context = data.get('sub_context', '') # e.g., 'summary'
        cos_text = data.get('cos_text', '')
        ssol_id = data.get('ssol_id')
        
        # 2. SYSTEM ATTENUATION (The "Telepathy" Layer)
        system_instructions = []
        
        if ssol_id and USE_DATABASE:
            try:
                engine, session = get_engine_and_session()
                ssol = session.query(SSOL).get(UUID(ssol_id))
                
                if ssol:
                    if ssol.target_date:
                        system_instructions.append(f"TEMPORAL CONSTRAINT: Hard deadline is {ssol.target_date}. All steps must fit this timeline.")
                    if ssol.owner:
                        system_instructions.append(f"OPERATOR CONTEXT: The acting entity is '{ssol.owner}'. Suggest resources accessible to them.")
                    if ssol.system_data:
                        for key, val in ssol.system_data.items():
                            config = SYSTEM_NODES.get(key)
                            if config and 'prompt_injection' in config:
                                instruction = config['prompt_injection'].format(value=val)
                                system_instructions.append(instruction)
                session.close()
            except Exception as db_e:
                current_app.logger.warning(f"Attenuation Layer skipped (DB Error): {db_e}")

        global_context_block = "\n".join(system_instructions)
        if not global_context_block:
            global_context_block = "CONTEXT: Standard operating procedure. No specific constraints defined."

        # 3. NODE-SPECIFIC PROMPT ASSEMBLY
        node_config = NODES.get(ce_type, NODES['Default'])
        prompts_map = node_config.get('prompts', {})
        default_prompts = NODES['Default'].get('prompts', {})
        
        if context == 'narrative':
            base_prompt = prompts_map.get('narrative', default_prompts.get('narrative'))
            prompt_content = base_prompt.format(cos_text=cos_text, field=sub_context, node_type=ce_type)
            final_prompt = f"*** SYSTEM PHYSICS (NON-NEGOTIABLE CONSTRAINTS) ***\n{global_context_block}\n\n*** SPECIFIC TASK ***\n{prompt_content}"
            system_inst = "Return strictly JSON: { \"text\": \"...\" }"
            
        else:
            base_prompt = prompts_map.get(context, default_prompts.get(context))
            if not base_prompt:
                base_prompt = f"Analyze '{cos_text}'. List 3 items for {context}."
            prompt_content = base_prompt.format(cos_text=cos_text)
            final_prompt = f"*** SYSTEM PHYSICS (NON-NEGOTIABLE CONSTRAINTS) ***\n{global_context_block}\n\n*** SPECIFIC TASK ***\n{prompt_content}"
            system_inst = "Return a valid JSON array of objects."

        # 4. EXECUTE ENGINE
        ai_response = await generate_chat_response(
            messages=[{"role": "user", "content": final_prompt}], 
            role="SSPEC Engine", 
            task=f"{ce_type}-{context}",
            system_instruction=system_inst,
            temperature=0.75 
        )
        
        clean_json = ai_response.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(clean_json)

        if context == 'narrative':
            txt = parsed.get('text', '') if isinstance(parsed, dict) else str(parsed)
            return jsonify({'success': True, 'text': txt, 'field': sub_context})
        else:
            suggestions = []
            if isinstance(parsed, dict):
                for key, val in parsed.items():
                    if isinstance(val, list):
                        suggestions = val
                        break
            elif isinstance(parsed, list):
                suggestions = parsed
            return jsonify({'success': True, 'suggestions': suggestions, 'context': context})

    except Exception as e:
        current_app.logger.error(f"Speculation Error: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

# ==============================================================================
# 7. CORE CRUD & EXPORT 
# ==============================================================================

@routes_bp.route('/get_ce_modal/<string:ce_type>', methods=['POST'])
async def get_ce_modal_route(ce_type):
    try:
        data = request.get_json()
        ce_id_str = data.get('ce_id')
        ce_text = data.get('ce_text', 'Conditional Element')
        
        # Ensure we have a valid UUID object for DB lookup, but keep string for fallback
        ce_id_obj = None
        if ce_id_str:
            try:
                ce_id_obj = UUID(ce_id_str)
            except ValueError:
                pass # Handle non-UUID strings if necessary

        # Fetch Data
        ce_data = speculate_get_ce_by_id(USE_DATABASE, ce_id_obj) if ce_id_obj else {}
        
        # Initialize structure if missing
        if not ce_data or 'data' not in ce_data:
            # Ensure the ID in the fallback dict is a STRING
            ce_data = {'id': str(ce_id_str) if ce_id_str else 'new_ce', 'node_type': ce_type, 'data': {
                'details_data': {}, 'resources': [], 'prerequisites': [], 'stakeholders': [], 'assumptions': [], 'connections': []
            }}

        node_config = NODES.get(ce_type, NODES['Default'])
        cos_content_html = data.get('cos_content', '')
        
        # Strip HTML to feed plain text to AI
        cos_text_only = BeautifulSoup(cos_content_html, 'html.parser').get_text(separator=' ', strip=True)
        
        # Get context summary
        ai_generated_data = await generate_ai_data(ce_type, cos_text_only, data.get('ssol_goal', ''), 'context')

        modal_html = await generate_dynamic_modal(
            ce_type=ce_type, ce_text=ce_text, ce_data=ce_data, node_info=node_config,
            cos_content=cos_content_html, ai_generated_data=ai_generated_data,
            phase_name=data.get('phase_name', ''), phase_index=data.get('phase_index', 0)
        )
        return jsonify(modal_html=modal_html, ce_data=ce_data)
    except Exception as e:
        # Improved error logging to catch these issues in console
        current_app.logger.error(f"Error generating CE Modal: {e}", exc_info=True)
        return jsonify(error=str(e)), 500

@routes_bp.route('/update_ce/<uuid:ce_id>', methods=['PUT'])
def update_ce_route(ce_id):
    data = request.get_json()
    if speculate_update_ce_by_id(USE_DATABASE, ce_id, data): return jsonify(success=True)
    return jsonify(success=False), 500

@routes_bp.route('/create_cos', methods=['POST'])
async def create_cos_route():
    try:
        data = request.get_json()
        cos_data = await speculate_create_cos(
            USE_DATABASE, UUID(data['ssol_id']), data['content'], 
            data.get('status', 'Proposed'), data.get('accountable_party'), data.get('completion_date')
        )
        if cos_data: return jsonify(success=True, cos=cos_data), 201
        return jsonify(success=False), 500
    except Exception as e:
        return jsonify(success=False, error=str(e)), 500

@routes_bp.route('/update_cos/<uuid:cos_id>', methods=['PUT'])
async def update_cos_route(cos_id):
    try:
        data = request.get_json()
        res = await speculate_update_cos_by_id(USE_DATABASE, cos_id, data)
        if res['success']: return jsonify(success=True, cos=res['cos'])
        return jsonify(success=False, error=res['message']), res['status_code']
    except Exception as e:
        return jsonify(success=False, error=str(e)), 500

@routes_bp.route('/delete_cos/<uuid:cos_id>', methods=['DELETE'])
def delete_cos_route(cos_id):
    if speculate_delete_cos_by_id(USE_DATABASE, cos_id): return jsonify(success=True)
    return jsonify(success=False), 404

@routes_bp.route('/get_ssol_image/<uuid:ssol_id>')
def get_ssol_image_route(ssol_id):
    p = f"images/ssol_image_{ssol_id}.png"
    if os.path.exists(os.path.join(current_app.static_folder, p)):
        return jsonify({'image_path': url_for('static', filename=p), 'status': 'found'})
    return jsonify({'status': 'pending'})

@routes_bp.route('/save_as_pdf/<uuid:ssol_id>', methods=['POST'])
def save_as_pdf(ssol_id):
    try:
        html = request.get_json()['htmlContent'].replace('src="/static/', f'src="{url_for("static", filename="", _external=True)}')
        pdf_options = {"page-size": "Letter", "margin-top": "0.75in", "margin-right": "0.75in", "margin-bottom": "0.75in", "margin-left": "0.75in", "encoding": "UTF-8", "no-outline": None, "enable-local-file-access": None}
        pdf = pdfkit.from_string(html, False, options=pdf_options, css=os.path.join(current_app.root_path, 'static', 'styles.css'))
        r = make_response(pdf)
        r.headers['Content-Type'] = 'application/pdf'
        r.headers['Content-Disposition'] = f'attachment; filename="SSPEC_{ssol_id}.pdf"'
        return r
    except Exception as e:
        return jsonify(success=False, error=str(e)), 500