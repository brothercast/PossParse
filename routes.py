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

# --- App Context & Stores ---
USE_DATABASE = os.environ.get('USE_DATABASE', 'False').lower() in ('true', '1', 't', 'y', 'yes')
from store import ssol_store, cos_store # <--- Added for In-Memory Support

# --- Data Models & Config ---
from models import get_engine_and_session, SSOL, COS
from ce_nodes import NODES
from system_nodes import SYSTEM_NODES
from system_templates import (
    render_command_deck, 
    render_system_config_modal
)

# --- Service Layers ---
from ai_service import cleanup_gemini_client, generate_chat_response, generate_governance_report
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
# 2. INTERNAL HELPERS (Data Persistence - Hybrid Support)
# ==============================================================================

def speculate_update_ssol_system_node_internal(ssol_id_str, key, value):
    """
    Updates the system_data JSON column directly from backend logic.
    Handles both SQL and In-Memory stores.
    """
    ssol_id_str = str(ssol_id_str)
    
    if USE_DATABASE:
        engine, session = get_engine_and_session()
        try:
            ssol = session.query(SSOL).get(UUID(ssol_id_str))
            if ssol:
                # SQLAlchemy requires reassignment of JSON types
                current_data = dict(ssol.system_data or {})
                current_data[key] = value
                ssol.system_data = current_data
                session.commit()
                return True
            return False
        except Exception as e:
            current_app.logger.error(f"Internal System Node Update Failed (DB): {e}")
            session.rollback()
            return False
        finally:
            session.close()
    else:
        # In-Memory Logic
        if ssol_id_str in ssol_store:
            current_data = ssol_store[ssol_id_str].get('system_data', {})
            current_data[key] = value
            ssol_store[ssol_id_str]['system_data'] = current_data
            return True
        return False

# ==============================================================================
# 3. BASIC NAVIGATION
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

# ==============================================================================
# 3b. DEBUG BYPASS — Skip Goal Selection, land on Outcome with sample data
# ==============================================================================

@routes_bp.route('/debug')
async def debug_bypass():
    """
    Creates a sample SSOL with pre-baked phases and conditions,
    then redirects straight to the outcome page.
    Usage: Navigate to http://127.0.0.1:5000/debug
    """
    # 1. System Physics (pre-baked wizard answers)
    system_data = {
        'GOAL': 'Sustainable Urban Farming Network',
        'OPERATOR': 'GreenVentures Inc.',
        'HORIZON': '2027-06-01',
        'BUDGET': 'Bootstrapped (Under $50K)',
        'SCALE': 'Small Team / Startup',
        'MODALITY': 'Hybrid (Digital + Physical)',
        'domain_icon': 'fas fa-seedling',
        'raw_summary': (
            'Establish a network of <sys type="SCALE">community-scale</sys> urban farms '
            'across <ce type="Environment">metropolitan food deserts</ce>, leveraging '
            '<ce type="Research">vertical farming technology</ce> and '
            '<ce type="Collaboration">local partnership models</ce> to provide '
            'affordable, fresh produce within a <sys type="HORIZON">2-year horizon</sys>. '
            'The initiative will operate under a <sys type="BUDGET">lean bootstrap model</sys> '
            'with <ce type="Stakeholder">community ownership structures</ce> '
            'ensuring long-term sustainability and equitable access.'
        )
    }

    # 2. Create SSOL Container
    ssol_id_str = speculate_create_ssol(
        USE_DATABASE,
        'Sustainable Urban Farming Network',
        'Establish a network of community-scale urban farms across metropolitan food deserts, '
        'providing affordable fresh produce through vertical farming technology and local partnerships.',
        domain='Agriculture & Food Systems',
        system_data=system_data
    )
    ssol_id_uuid = UUID(ssol_id_str)

    # 3. Pre-baked Phases & Conditions (with CE tags for pill rendering)
    sample_phases = {
        'Discovery': [
            "Conducted intensive <ce type='Research'>feasibility studies</ce> and <ce type='Research'>site analysis</ce> "
            "for modular vertical farming installations in identified <ce type='Environment'>food desert zones</ce>, "
            "evaluating soil conditions, sunlight access, and water infrastructure.",
            
            "Completed comprehensive <ce type='Research'>market demand analysis</ce> across target neighborhoods, "
            "identifying <ce type='Stakeholder'>community champions</ce> and mapping existing "
            "<ce type='Environment'>food distribution networks</ce>.",

            "Established <ce type='Measurement'>baseline nutrition metrics</ce> across target communities "
            "to enable pre/post <ce type='Measurement'>impact assessment</ce> of the farming network.",
        ],
        'Engagement': [
            "Established <ce type='Collaboration'>strategic partnerships</ce> with "
            "<ce type='Stakeholder'>local community organizations</ce> and "
            "<ce type='Stakeholder'>urban agriculture cooperatives</ce> to co-develop farm sites.",
            
            "Secured initial <ce type='Financial'>seed funding</ce> from "
            "<ce type='Stakeholder'>impact investors</ce> and <ce type='Financial'>municipal grant programs</ce> "
            "to develop detailed engineering plans and procure long-lead equipment.",

            "Completed <ce type='Legal'>zoning compliance review</ce> and obtained "
            "<ce type='Legal'>urban agriculture permits</ce> for all proposed farm sites.",
        ],
        'Action': [
            "Deployed first <ce type='Praxis'>pilot vertical farm module</ce> at the "
            "<ce type='Environment'>Eastside Community Center</ce>, achieving "
            "<ce type='Timeline'>30-day harvest cycle</ce> for leafy greens and herbs.",
            
            "Implemented <ce type='Technology'>IoT monitoring systems</ce> for automated "
            "<ce type='Technology'>crop health tracking</ce> and <ce type='Technology'>irrigation management</ce>, "
            "reducing water usage by 40% compared to traditional methods.",
        ],
        'Completion': [
            "Achieved network of <ce type='Praxis'>5 operational farm sites</ce> serving "
            "<ce type='Stakeholder'>12,000+ residents</ce> with weekly fresh produce deliveries.",
            
            "Published <ce type='Advocacy'>impact report</ce> demonstrating "
            "<ce type='Measurement'>nutritional outcome improvements</ce> and "
            "<ce type='Environment'>carbon footprint reduction</ce> metrics for stakeholder reporting.",
        ],
        'Legacy': [
            "Created open-source <ce type='Research'>Urban Farm Playbook</ce> enabling "
            "<ce type='Collaboration'>replication across 50+ cities</ce> with standardized "
            "<ce type='Praxis'>deployment frameworks</ce> and <ce type='Timeline'>90-day launch timelines</ce>.",
        ]
    }

    # 4. Create COS entries (with baseline system pills)
    for phase_name, cos_items in sample_phases.items():
        for cos_content in cos_items:
            try:
                await speculate_create_cos(
                    USE_DATABASE,
                    ssol_id=ssol_id_uuid,
                    content=cos_content,
                    status='Proposed'
                )
            except Exception as e:
                current_app.logger.error(f"Debug: Error creating COS: {e}")

    # 5. Save domain icon
    speculate_update_ssol_system_node_internal(ssol_id_str, 'domain_icon', 'fas fa-seedling')

    current_app.logger.info(f"🔧 DEBUG BYPASS: Created sample SSOL {ssol_id_str}")
    return redirect(url_for('routes_bp.view_ssol', ssol_id=ssol_id_str))

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
# 4. GOAL SELECTION WIZARD
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
# 5. OUTCOME GENERATION (The Bootstrapper - POST)
# ==============================================================================

@routes_bp.route('/outcome', methods=['POST'])
async def outcome():
    if request.method == 'POST':
        # 1. EXTRACT CORE IDENTITY
        selected_goal_text = request.form.get('selected_goal', '').strip()
        domain = request.form.get('domain', '').strip()
        selected_goal_title = request.form.get('selected_goal_title', '').strip()
        domain_icon = request.form.get('domain_icon', '').strip()

        # 2. DYNAMICALLY EXTRACT SYSTEM PHYSICS
        system_constraints = {}
        
        # Iterate through the Master Ontology to capture Wizard inputs
        for node_key in SYSTEM_NODES.keys():
            # The Wizard sends keys exactly matching the SYSTEM_NODES keys (e.g. "OPERATOR")
            val = request.form.get(node_key)
            
            if val:
                # SPECIAL HANDLING FOR TAGS (Arrays)
                config = SYSTEM_NODES.get(node_key, {})
                if config.get('ui_type') == 'tags':
                    # Clean up list formatting (remove trailing commas etc)
                    cleaned_val = ", ".join([x.strip() for x in val.split(',') if x.strip()])
                    system_constraints[node_key] = cleaned_val
                else:
                    system_constraints[node_key] = val.strip()

        # Inject the Prime Directive (GOAL) so it appears as a System Physics pill
        if selected_goal_title and 'GOAL' not in system_constraints:
            system_constraints['GOAL'] = selected_goal_title
        
        # Persist domain icon for sidebar rendering
        if domain_icon:
            system_constraints['domain_icon'] = domain_icon

        # 3. GENERATE INTELLIGENCE (With Attenuation)
        try:
            # We pass the constraints to the AI to influence the text generation
            structured_solution_json = await generate_outcome_data(
                ssol_title=selected_goal_title, 
                ssol_description=selected_goal_text, 
                domain=domain,
                forced_constraints=system_constraints 
            )
            
            # Merge AI params with User Constraints (User wins conflicts)
            ai_params = structured_solution_json.get('system_params', {})
            final_system_data = {**ai_params, **system_constraints}

            # 4. CREATE SSOL CONTAINER
            ssol_id_str = speculate_create_ssol(
                USE_DATABASE, 
                selected_goal_title, 
                selected_goal_text, 
                domain=domain,
                system_data=final_system_data 
            )
            ssol_id_uuid = UUID(ssol_id_str)

            # 4.5. CREATE BASELINE CEs FROM SYSTEM PILLS
            # By instantiating these as CE atoms, we ensure they are queryable and resolvable 
            # by the Arbitration Pane, while leaving the flat final_system_data on the SSOL for mobility.
            for key, value in final_system_data.items():
                if value and str(value).strip():
                    # Format as a distinct CE atom representing a baseline constraint or physics property
                    # Using <ce> tags ensures it parses correctly in the frontend CE Workshop
                    ce_label = "Constraint" if key in ["DIRECTIVE", "AVOIDANCE", "HORIZON", "BUDGET"] else "Guideline"
                    pill_content = f"[{ce_label.upper()}] The foundational {key.lower()} for this roadmap is defined as: <ce type='{key}'>{value}</ce>"
                    
                    try:
                        await speculate_create_cos(
                            USE_DATABASE,
                            ssol_id=ssol_id_uuid,
                            content=pill_content,
                            status='Proposed'
                        )
                    except Exception as ce_err:
                        current_app.logger.error(f"Error generating baseline CE for {key}: {ce_err}")

            # 5. CREATE PHASES & CONDITIONS (Standard Logic)
            if 'phases' in structured_solution_json:
                for phase_name, cos_items in structured_solution_json['phases'].items():
                    for cos_content_with_tags in cos_items:
                        if not cos_content_with_tags: continue
                        try:
                            await speculate_create_cos(
                                USE_DATABASE, 
                                ssol_id=ssol_id_uuid, 
                                content=cos_content_with_tags, 
                                status='Proposed'
                            )
                        except Exception as cos_err:
                            current_app.logger.error(f"Error generating COS: {cos_err}")

            # 6. ASYNC IMAGE GENERATION
            try:
                image_prompt = f"""
                A vibrant, isometric, mid-century retro illustration of '{selected_goal_title}: {selected_goal_text}' 
                fulfilled. Context: {domain}. Style: 1950s Popular Science magazine cover meets Mary Blair.
                Characteristics: Saturated technicolor palette (#ff7043, #26c6da, #ab47bc, #ffa726), 
                painterly lithograph texture, idealized realism, optimistic composition. No text.
                """
                await generate_image(image_prompt, ssol_id_str)
            except Exception as e:
                current_app.logger.warning(f"Image gen trigger failed: {e}")

            # 7. SAVE ARTIFACTS & REDIRECT
            
            # A. Save Raw Summary
            raw_ai_summary = structured_solution_json.get('ssolsummary', '')
            speculate_update_ssol_system_node_internal(ssol_id_str, 'raw_summary', raw_ai_summary)
            
            # Save the Domain Icon specifically for the Dashboard Hero view
            if domain_icon:
                speculate_update_ssol_system_node_internal(ssol_id_str, 'domain_icon', domain_icon)
                
            # Save the Raw Summary for the Charter
            raw_ai_summary = structured_solution_json.get('ssolsummary', '')
            speculate_update_ssol_system_node_internal(ssol_id_str, 'raw_summary', raw_ai_summary)

            return redirect(url_for('routes_bp.view_ssol', ssol_id=ssol_id_str))

        except Exception as e:
            current_app.logger.error(f"CRITICAL error in /outcome: {e}", exc_info=True)
            flash(f"System Critical Error: {e}", "error")
            return redirect(url_for('routes_bp.index'))

    return redirect(url_for('routes_bp.index'))

# ==============================================================================
# 6. OUTCOME VISUALIZATION (The Console Loader - GET)
# ==============================================================================

@routes_bp.route('/ssol/<uuid:ssol_id>', methods=['GET'])
def view_ssol(ssol_id):
    """
    Re-hydrates the SSPEC Dashboard.
    Supports both SQL and In-Memory modes via Hybrid Logic.
    """
    
    ssol_data_payload = {}
    all_cos_list = []
    
    # --- DATA FETCHING (Hybrid) ---
    if USE_DATABASE:
        engine, session = get_engine_and_session()
        try:
            ssol_obj = session.query(SSOL).get(ssol_id)
            if not ssol_obj:
                flash("Structured Solution not found.", "error")
                return redirect(url_for('routes_bp.index'))
            
            # Populate basic data
            ssol_data_payload = ssol_obj.to_dict() # Helper creates dict
            # Add dynamic field fallback
            ssol_data_payload['system_data'] = ssol_obj.system_data or {}
            
            # Fetch COS
            all_cos_list = [c.to_dict() for c in ssol_obj.cos]
            
        except Exception as e:
            current_app.logger.error(f"DB Error viewing SSOL: {e}")
            flash("Database Error.", "error")
            return redirect(url_for('routes_bp.index'))
        finally:
            session.close()
    else:
        # IN-MEMORY LOGIC
        ssol_id_str = str(ssol_id)
        raw_ssol = ssol_store.get(ssol_id_str)
        
        if not raw_ssol:
            flash("Structured Solution not found (In-Memory).", "error")
            return redirect(url_for('routes_bp.index'))
            
        ssol_data_payload = raw_ssol.copy()
        if 'system_data' not in ssol_data_payload:
            ssol_data_payload['system_data'] = {}
            
        # Manually filter COS for this SSOL
        all_cos_list = [c for c in cos_store.values() if c['ssol_id'] == ssol_id_str]

    # --- UI REHYDRATION (Common Logic) ---
    try:
        # 1. Command Deck
        sys_data = ssol_data_payload.get('system_data', {})
        
        # 1a. Back-fill sys_data from charter <sys> tags
        #     The AI mentions system nodes in the charter text that may not be
        #     in the wizard-captured system_data. Extract them for sidebar reciprocity.
        raw_summary = sys_data.get('raw_summary', ssol_data_payload.get('description', ""))
        if raw_summary:
            from bs4 import BeautifulSoup as BS4
            charter_soup = BS4(str(raw_summary), 'html.parser')
            for sys_tag in charter_soup.find_all('sys'):
                tag_type = sys_tag.get('type', '').upper()
                tag_value = sys_tag.get_text().strip()
                # Only back-fill if the key is a valid SYSTEM_NODE and not already set
                if tag_type and tag_type in SYSTEM_NODES and tag_type not in sys_data:
                    sys_data[tag_type] = tag_value

        deck_params_list = []
        for key, val in sys_data.items():
            if key in SYSTEM_NODES:
                deck_params_list.append({
                    'type': key,
                    'id': f'sys_{key}_{str(ssol_id)}',
                    'value': val
                })
        
        if not any(p['type'] == 'HORIZON' for p in deck_params_list):
             deck_params_list.append({'type': 'HORIZON', 'id': 'horizon_def', 'value': 'Unset'})

        components = render_command_deck(deck_params_list)
        config_modal = render_system_config_modal()

        # 2. Executive Charter
        formatted_summary = format_ssol_text(raw_summary, phase_index=0, system_data=sys_data)

        # 3. Phase Grid Reconstruction
        phases_ordered = ['Discovery', 'Engagement', 'Action', 'Completion', 'Legacy']
        phases_map = {p: [] for p in phases_ordered}
        
        if all_cos_list:
            chunk_size = max(1, len(all_cos_list) // 5)
            cos_iter = iter(all_cos_list)
            
            for i, phase in enumerate(phases_ordered):
                if i == 4:
                    phases_map[phase] = list(cos_iter)
                else:
                    items = []
                    try:
                        for _ in range(chunk_size): items.append(next(cos_iter))
                    except StopIteration: pass
                    phases_map[phase] = items

        # 4. Final Payload Overrides
        ssol_data_payload['ssol_summary'] = formatted_summary
        ssol_data_payload['selected_goal'] = ssol_data_payload.get('description')
        ssol_data_payload['ssol_title'] = ssol_data_payload.get('title')
        
        if 'domain_icon' in sys_data:
            ssol_data_payload['domain_icon'] = sys_data['domain_icon']
        elif 'domain_icon' not in ssol_data_payload:
            ssol_data_payload['domain_icon'] = "fas fa-cube"

        return render_template(
            'outcome.html',
            ssol=ssol_data_payload,
            ssol_id=str(ssol_id),
            phases=phases_map, # Pass explicitly if template expects it separate
            horizon_gauge_html=components['horizon_html'],
            system_pills_html=components['sidebar_html'],
            system_config_modal_html=config_modal,
            system_nodes=SYSTEM_NODES
        )

    except Exception as e:
        current_app.logger.error(f"Template Rendering Error: {e}", exc_info=True)
        flash("Error rendering solution.", "error")
        return redirect(url_for('routes_bp.index'))

# ==============================================================================
# 7. SYSTEM CONFIG & SPECULATION APIs
# ==============================================================================

@routes_bp.route('/update_ssol_system_node', methods=['POST'])
def update_ssol_system_node():
    data = request.get_json()
    ssol_id = data.get('ssol_id')
    key = data.get('key')   
    value = data.get('value') 

    if not ssol_id or not key:
        return jsonify({'success': False, 'error': 'Missing ID/Key'}), 400

    # Hybrid Logic for Update
    if USE_DATABASE:
        engine, session = get_engine_and_session()
        try:
            ssol = session.query(SSOL).get(UUID(ssol_id))
            if not ssol: return jsonify({'success': False}), 404

            # Specific column updates vs JSON updates
            current_data = dict(ssol.system_data or {})
            
            if key == 'HORIZON':
                try:
                    dt = datetime.strptime(value, '%Y-%m-%d').date()
                    ssol.target_date = dt
                except: pass
                current_data['HORIZON'] = value
            elif key == 'OPERATOR':
                ssol.owner = value
                current_data['OPERATOR'] = value
            else:
                current_data[key] = value
                
            ssol.system_data = current_data
            session.commit()
            return jsonify({'success': True})
        except Exception as e:
            session.rollback()
            return jsonify({'success': False, 'error': str(e)}), 500
        finally:
            session.close()
    else:
        # In-Memory Update
        if ssol_id in ssol_store:
            ssol = ssol_store[ssol_id]
            current_data = ssol.get('system_data', {})
            current_data[key] = value
            
            if key == 'HORIZON': ssol['target_date'] = value
            if key == 'OPERATOR': ssol['owner'] = value
            
            ssol['system_data'] = current_data
            return jsonify({'success': True})
        return jsonify({'success': False, 'error': 'Not Found'}), 404
        
@routes_bp.route('/speculate_context', methods=['POST'])
async def speculate_context_route():
    try:
        data = request.get_json()
        ce_type = data.get('ce_type', 'Default')
        context = data.get('context') 
        sub_context = data.get('sub_context', '') 
        cos_text = data.get('cos_text', '')
        ssol_id = data.get('ssol_id')
        
        # ==========================================================
        # 1. HYBRID CONTEXT FETCHING
        #    Retrieves Title + System Physics for AI Attenuation
        # ==========================================================
        ssol_context = {}
        if ssol_id:
            if USE_DATABASE:
                engine, session = get_engine_and_session()
                try:
                    obj = session.query(SSOL).get(UUID(str(ssol_id)))
                    if obj: 
                        ssol_context = {
                            'title': obj.title, # Critical for Governance Prompt
                            'target_date': obj.target_date, 
                            'owner': obj.owner, 
                            'system_data': obj.system_data or {}
                        }
                finally:
                    session.close()
            else:
                ssol_context = ssol_store.get(str(ssol_id), {})

        # ==========================================================
        # 2. GOVERNANCE BRANCH (Ombud/Advocate)
        #    Bypasses standard CE logic to run the Bicameral Check
        # ==========================================================
        if context == 'governance':
            if not ssol_context:
                return jsonify({'success': False, 'error': 'SSOL Context Not Found'}), 404
            
            failing_criteria = data.get('failing_criteria', [])
            
            # Delegates to ai_service.py logic defined in previous step
            report = await generate_governance_report(ssol_context, failing_criteria)
            return jsonify({'success': True, 'report': report})

        # ==========================================================
        # 3. STANDARD ATTENUATION LAYER (The Physics Block)
        #    Constructs the prompt rules for standard CE generation
        # ==========================================================
        system_instructions = []
        
        if ssol_context:
            if ssol_context.get('title'):
                system_instructions.append(f"PROJECT GOAL: {ssol_context['title']}")
            if ssol_context.get('target_date'):
                system_instructions.append(f"TEMPORAL: Hard deadline {ssol_context['target_date']}.")
            if ssol_context.get('owner'):
                system_instructions.append(f"OPERATOR: Entity is '{ssol_context['owner']}'.")
            
            # Dynamic Node Injection (Budget, Scale, Modality, etc.)
            if ssol_context.get('system_data'):
                for key, val in ssol_context['system_data'].items():
                    config = SYSTEM_NODES.get(key)
                    if config and 'prompt_injection' in config and val:
                        # Format the specific injection string
                        try:
                            system_instructions.append(config['prompt_injection'].format(value=val))
                        except Exception:
                            # Fallback if formatting fails
                            system_instructions.append(f"{key}: {val}")

        # Default fallback if no physics exist
        global_context_block = "\n".join(system_instructions) or "Standard procedures apply."

        # ==========================================================
        # 4. STANDARD NODE PROMPTING
        #    Narrative generation or List/Collection generation
        # ==========================================================
        node_config = NODES.get(ce_type, NODES['Default'])
        prompts_map = node_config.get('prompts', {})
        default_prompts = NODES['Default'].get('prompts', {})
        
        # A. Narrative Mode (Single Text Block)
        if context == 'narrative':
            base_prompt = prompts_map.get('narrative', default_prompts.get('narrative'))
            prompt_content = base_prompt.format(cos_text=cos_text, field=sub_context, node_type=ce_type)
            final_prompt = f"*** SYSTEM PHYSICS ***\n{global_context_block}\n\n*** TASK ***\n{prompt_content}"
            
            ai_response = await generate_chat_response(
                messages=[{"role": "user", "content": final_prompt}], 
                role="SSPEC Engine", 
                task=f"{ce_type}-narrative",
                system_instruction="You are the SSPEC Speculation Engine. CRITICAL: Be CONCISE. The primary field should contain only the core artifact — the question, specification, or objective in 2-5 sentences MAX. No essays, no numbered lists, no preambles. Supporting analysis goes elsewhere. Return pure JSON { 'text': ... }.",
                temperature=0.75 
            )

        # B. System Parameter Mode
        elif context == 'system_parameter':
            config = SYSTEM_NODES.get(ce_type, {})
            options = config.get('options', [])
            helper = config.get('description', '')
            
            prompt_content = f"Suggest an optimal value for the '{ce_type}' parameter.\n"
            prompt_content += f"Parameter Purpose: {helper}\n"
            if options:
                prompt_content += f"Pre-defined standard options: {', '.join(options)}\n"
            prompt_content += "You may select one of the pre-defined options OR invent a custom value if it improves the project flow based on the physics. "
            prompt_content += "If your suggestion might disrupt standard assumptions, append a brief warning to the text (e.g. 'Custom Option (Warning: Increases Cost)')."
            
            final_prompt = f"*** SYSTEM PHYSICS ***\n{global_context_block}\n\n*** TASK ***\n{prompt_content}"
            
            ai_response = await generate_chat_response(
                messages=[{"role": "user", "content": final_prompt}], 
                role="SSPEC Engine", 
                task=f"speculate_sys_{ce_type}",
                system_instruction="You are the SSPEC Speculation Engine. Return pure JSON { 'text': 'Suggested Value' }.",
                temperature=0.75 
            )

        # C. Collection Mode (Lists of Prereqs, Stakeholders, etc.)
        else:
            base_prompt = prompts_map.get(context, default_prompts.get(context)) or f"Analyze '{cos_text}'. List 3 items for {context}."
            prompt_content = base_prompt.format(cos_text=cos_text)
            final_prompt = f"*** SYSTEM PHYSICS ***\n{global_context_block}\n\n*** TASK ***\n{prompt_content}"

            ai_response = await generate_chat_response(
                messages=[{"role": "user", "content": final_prompt}], 
                role="SSPEC Engine", 
                task=f"{ce_type}-{context}",
                system_instruction="You are the SSPEC Speculation Engine. Return pure JSON array or object.",
                temperature=0.75 
            )
        
        # ==========================================================
        # 5. PARSING & RETURN
        # ==========================================================
        clean_json = ai_response.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(clean_json)

        if context in ['narrative', 'system_parameter']:
            txt = parsed.get('text', '') if isinstance(parsed, dict) else str(parsed)
            return jsonify({'success': True, 'text': txt, 'field': sub_context})
        else:
            suggestions = parsed if isinstance(parsed, list) else parsed.get('items', [])
            # Fallback if AI wraps array in a key
            if not isinstance(suggestions, list) and isinstance(parsed, dict):
                suggestions = next((v for k, v in parsed.items() if isinstance(v, list)), [])
                
            return jsonify({'success': True, 'suggestions': suggestions, 'context': context})

    except Exception as e:
        current_app.logger.error(f"Speculate Context Error: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

# ==============================================================================
# 8. CORE CRUD & MODAL APIs
# ==============================================================================

@routes_bp.route('/get_ce_modal/<string:ce_type>', methods=['POST'])
async def get_ce_modal_route(ce_type):
    try:
        data = request.get_json()
        ce_id_str = data.get('ce_id')
        ce_text = data.get('ce_text', 'Conditional Element')
        
        ce_id_obj = None
        if ce_id_str:
            try: ce_id_obj = UUID(ce_id_str)
            except ValueError: pass

        ce_data = speculate_get_ce_by_id(USE_DATABASE, ce_id_obj) if ce_id_obj else {}
        
        if not ce_data or 'data' not in ce_data:
            ce_data = {'id': str(ce_id_str) if ce_id_str else 'new_ce', 'node_type': ce_type, 'data': {
                'details_data': {}, 'resources': [], 'prerequisites': [], 'stakeholders': [], 'assumptions': [], 'connections': []
            }}

        node_config = NODES.get(ce_type, NODES['Default'])
        cos_content_html = data.get('cos_content', '')
        cos_text_only = BeautifulSoup(cos_content_html, 'html.parser').get_text(separator=' ', strip=True)
        
        ai_generated_data = await generate_ai_data(ce_type, cos_text_only, data.get('ssol_goal', ''), 'context')

        modal_html = await generate_dynamic_modal(
            ce_type=ce_type, ce_text=ce_text, ce_data=ce_data, node_info=node_config,
            cos_content=cos_content_html, ai_generated_data=ai_generated_data,
            phase_name=data.get('phase_name', ''), phase_index=data.get('phase_index', 0)
        )
        return jsonify(modal_html=modal_html, ce_data=ce_data)
    except Exception as e:
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
        ssol_uuid_obj = UUID(data['ssol_id'])
        cos_data = await speculate_create_cos(
            USE_DATABASE, ssol_uuid_obj, data['content'], 
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

# ==============================================================================
# 9. GOVERNANCE (Ombud & Advocate Micro-Generations)
# ==============================================================================

@routes_bp.route('/advocate/resolve_void', methods=['POST'])
async def resolve_void():
    """
    The Localized Micro-Generation endpoint for the Advocate node.
    Receives a Dependency Void and returns a speculative pathway to bridge it.
    """
    try:
        data = request.get_json()
        ssol_id = data.get('ssol_id')
        void_id = data.get('void_id')
        
        void_context = data.get('void_context', 'Dependency Void: Conflict in execution node.')
        
        # 1. Fetch SSOL Context
        ssol_context = {}
        if ssol_id:
            if USE_DATABASE:
                engine, session = get_engine_and_session()
                try:
                    obj = session.query(SSOL).get(UUID(str(ssol_id)))
                    if obj:
                        ssol_context = {
                            'title': obj.title,
                            'system_data': obj.system_data or {}
                        }
                finally:
                    session.close()
            else:
                ssol_context = ssol_store.get(str(ssol_id), {})

        # 2. Build Context String
        physics_context = []
        if ssol_context.get('system_data'):
            for k, v in ssol_context['system_data'].items():
                physics_context.append(f"{k}: {v}")
        physics_str = "\n".join(physics_context)
        
        # 3. Construct Prompt
        prompt = f"""
*** PROJECT CONTEXT ***
Title: {ssol_context.get('title', 'Unknown Project')}
Physics/Constraints:
{physics_str}

*** DEPENDENCY VOID ***
{void_context}

*** TASK ***
You are the SSPEC Advocate Node. Resolve this conflict via 'gradient descent'—finding an alternate pathway to the outcome that satisfies the constraints.
Explain the impact of Aligning, Declining, or Countering this pathway. Include 1-3 new CE sub-nodes (e.g., type: 'Partnership', 'Design', 'Development') required to execute the resolution.

Return pure JSON matching this exact structure:
{{
    "summary": "Brief 2-sentence explanation of the proposed pathway.",
    "impact_analysis": {{
        "align": "What happens if they accept this pathway?",
        "decline": "What are the risks of declining it?",
        "counter": "What is an alternative compromise?"
    }},
    "sub_nodes": [
        {{"type": "Collaboration", "text": "Sponsorship Tier"}}
    ]
}}
"""
        
        ai_response = await generate_chat_response(
            messages=[{"role": "user", "content": prompt}], 
            role="SSPEC Advocate", 
            task=f"resolve_void_{void_id}",
            system_instruction="You are the SSPEC Advocate. Return pure JSON only.",
            temperature=0.7 
        )

        clean_json = ai_response.replace("```json", "").replace("```", "").strip()
        resolution = json.loads(clean_json)
        
        return jsonify(success=True, status="success", resolution=resolution)
        
    except Exception as e:
        current_app.logger.error(f"Advocate Error: {e}")
        return jsonify(success=False, error=str(e)), 500