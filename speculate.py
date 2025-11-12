# speculate.py (Complete and Final Refactor)
import re
import os
import html
import json
import uuid
from uuid import UUID
import logging
from bs4 import BeautifulSoup
from flask import current_app
from ce_nodes import NODES, get_valid_node_types
from sqlalchemy.exc import SQLAlchemyError
from ai_service import generate_chat_response_with_node_types, generate_chat_response

# No longer importing from ce_templates

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- Helper function to render a CE pill ---
def _render_ce_pill_html(ce_id: str, ce_type: str, ce_text: str) -> str:
    """Helper function to generate the standard HTML for a CE pill."""
    node_info = NODES.get(ce_type, NODES['Default'])
    node_color = node_info.get('color', '#6c757d')
    node_icon = node_info.get('icon', 'fa-solid fa-question-circle')
    
    return (
        f'<span class="ce-pill" data-ce-id="{ce_id}" data-ce-type="{ce_type}" style="--node-color: {node_color};">'
        f'<span class="ce-pill-icon"><i class="{node_icon}"></i></span>'
        f'<span class="ce-pill-text">{html.escape(ce_text)}</span>'
        f'</span>'
    )

# --- COS Analysis and CE Creation ---

async def analyze_cos(cos_content: str, cos_id: str = None) -> dict:
    """
    Analyzes COS content using an AI model to identify potential CEs.
    This function's primary role is to get a structured JSON response from the AI.
    It does NOT generate the final HTML pills.
    """
    prompt = (
        f"Analyze the following Condition of Satisfaction (COS) text: '{cos_content}'. "
        "Identify all Conditional Elements (CEs) within this text. "
        f"For each CE found, determine its most appropriate 'NodeType' from this list ONLY: {', '.join(get_valid_node_types())}. "
        "Your response MUST be a valid JSON object with two keys: "
        "'analyzed_cos_text': The original COS text with each CE wrapped in <ce type='NodeType'>CE Text</ce> tags. "
        "And 'identified_ces': an array of objects, where each object has 'text' and 'type' keys. "
        "Example: {'analyzed_cos_text': 'The <ce type=\\'Research\\'>literature review</ce> must be done.', 'identified_ces': [{'text': 'literature review', 'type': 'Research'}]}"
    )

    messages = [
        {"role": "system", "content": "You are an expert in analyzing text to identify conditional elements and structure them in JSON. Ensure NodeTypes are from the provided list."},
        {"role": "user", "content": prompt},
    ]
    response_text = ""
    try:
        response_text = await generate_chat_response_with_node_types(messages, role='COS Analysis', task='Analyze COS for CEs')
        response_json = json.loads(response_text)
        return {
            'content_with_tags': response_json.get("analyzed_cos_text", cos_content),
            'identified_ces': response_json.get("identified_ces", [])
        }
    except Exception as e:
        current_app.logger.error(f"Error in analyze_cos: {e}. AI Response: '{response_text}'", exc_info=True)
        return {'content_with_tags': html.escape(cos_content), 'identified_ces': []}

async def create_cos(USE_DATABASE: bool, ssol_id: UUID, content: str, status: str, accountable_party: str = None, completion_date=None) -> str:
    """
    Creates a COS and its associated CEs by parsing a pre-tagged content string.
    This function NO LONGER makes an API call.
    """
    from models import COS, CE, db
    from store import ce_store, cos_store
    from app import app

    new_cos_uuid = uuid.uuid4()
    cos_id_str = str(new_cos_uuid)

    try:
        # 1. Parse the pre-tagged content string to find all <ce> tags.
        soup = BeautifulSoup(content, 'html.parser')
        ce_tags = soup.find_all('ce')
        
        new_ce_instances = []
        content_with_pills = content # Start with the original tagged content

        # 2. Create CE records and simultaneously build the final HTML for the COS content.
        for tag in ce_tags:
            ce_text = tag.string
            ce_type = tag.get('type')
            if not ce_text or not ce_type or ce_type not in NODES:
                continue

            new_ce_uuid = uuid.uuid4()
            ce_record = {
                'id': new_ce_uuid,
                'node_type': ce_type,
                'cos_id': new_cos_uuid,
                'data': {"details_data": {}, "resources": []}
            }
            new_ce_instances.append(ce_record)
            
            # Replace the simple <ce> tag with a full, rendered HTML pill.
            pill_html = _render_ce_pill_html(str(new_ce_uuid), ce_type, ce_text)
            
            # This is a bit tricky; we need to replace the tag without destroying the soup
            tag.replace_with(BeautifulSoup(pill_html, 'html.parser'))

        # Get the final HTML string from the modified soup
        content_with_pills = str(soup)

        # 3. Save everything to the database or in-memory store.
        if USE_DATABASE:
            with app.app_context():
                cos_instance = COS(
                    id=new_cos_uuid, content=content_with_pills, status=status, ssol_id=ssol_id,
                    accountable_party=accountable_party, completion_date=completion_date
                )
                db.session.add(cos_instance)

                for ce_rec in new_ce_instances:
                    ce_instance = CE(id=ce_rec['id'], node_type=ce_rec['node_type'], cos_id=new_cos_uuid, data=ce_rec['data'])
                    db.session.add(ce_instance)
                db.session.commit()
        else:
            cos_store[cos_id_str] = {'id': cos_id_str, 'content': content_with_pills, 'status': status, 'ssol_id': str(ssol_id)}
            for ce_rec in new_ce_instances:
                ce_store[str(ce_rec['id'])] = ce_rec
        
        return cos_id_str

    except Exception as e:
        current_app.logger.error(f"Error creating COS (SSOL: {ssol_id}): {e}", exc_info=True)
        if USE_DATABASE: db.session.rollback()
        raise

async def update_cos_by_id(USE_DATABASE: bool, cos_id: UUID, updated_data: dict) -> dict:
    """
    Updates a COS. If the content changes, it re-analyzes CEs and rebuilds the content with new pills.
    """
    from models import COS, CE, db
    from store import cos_store, ce_store
    from app import app

    new_content_text = updated_data.get('content')
    
    try:
        if new_content_text is not None:
            # If content is being updated, we must re-run the entire CE creation and pill generation process.
            analysis_result = await analyze_cos(new_content_text, str(cos_id))
            content_with_tags = analysis_result['content_with_tags']
            ces_to_create = analysis_result['identified_ces']
            
            new_ce_instances = []
            content_with_pills = content_with_tags

            for ce_data in ces_to_create:
                ce_text, ce_type = ce_data.get('text'), ce_data.get('type')
                if not ce_text or not ce_type: continue
                new_ce_uuid = uuid.uuid4()
                new_ce_instances.append({'id': new_ce_uuid, 'node_type': ce_type, 'cos_id': cos_id})
                ce_tag_to_replace = f"<ce type=\"{ce_type}\">{ce_text}</ce>"
                pill_html = _render_ce_pill_html(str(new_ce_uuid), ce_type, ce_text)
                content_with_pills = content_with_pills.replace(ce_tag_to_replace, pill_html, 1)
            
            updated_data['content'] = content_with_pills # Replace raw text with final HTML
        
        if USE_DATABASE:
            with app.app_context():
                cos = db.session.query(COS).get(cos_id)
                if not cos: return {'success': False, 'message': f"COS {cos_id} not found.", 'status_code': 404}
                
                # Update COS fields
                for key, value in updated_data.items():
                    if hasattr(cos, key) and key not in ['id', 'ssol_id']:
                        setattr(cos, key, value)
                
                if new_content_text is not None:
                    # Clear old CEs and add new ones
                    db.session.query(CE).filter_by(cos_id=cos_id).delete()
                    for ce_rec in new_ce_instances:
                        ce_instance = CE(id=ce_rec['id'], node_type=ce_rec['node_type'], cos_id=cos_id)
                        db.session.add(ce_instance)
                
                db.session.commit()
                return {'success': True, 'cos': cos.to_dict()}
        else:
            # In-memory logic...
            pass # (Can be filled in if needed)

    except Exception as e:
        current_app.logger.error(f"Error updating COS {cos_id}: {e}", exc_info=True)
        if USE_DATABASE: db.session.rollback()
        return {'success': False, 'message': f"Unexpected error: {str(e)}", 'status_code': 500}

def get_cos_by_id(USE_DATABASE: bool, cos_id: UUID):
    from models import COS, get_engine_and_session
    from store import cos_store
    from app import app

    if USE_DATABASE:
        if not isinstance(cos_id, UUID):
            try:
                cos_id = UUID(str(cos_id))
            except ValueError:
                current_app.logger.error(f"Invalid UUID format for cos_id: {cos_id}")
                return None
        with app.app_context():
            engine, session = get_engine_and_session()
            cos = session.query(COS).get(cos_id)
            session.close()
            return cos
    else:
        return cos_store.get(str(cos_id))

async def update_cos_by_id(USE_DATABASE: bool, cos_id_param: UUID, updated_data: dict) -> dict:
    from models import COS, CE, get_engine_and_session
    from store import cos_store, ce_store
    from app import app

    analysis_result = {}
    try:
        cos_id_uuid = cos_id_param
        cos_id_str = str(cos_id_uuid)

        new_content_text = updated_data.get('content')
        content_with_pills_for_update = None
        new_ces_data_list_from_analysis = []

        if new_content_text is not None:
            analysis_result = await analyze_cos(new_content_text, cos_id_str)
            content_with_pills_for_update = analysis_result['content_with_ce']
            new_ces_data_list_from_analysis = analysis_result['ces_data_list']
            updated_data['content'] = content_with_pills_for_update
        
        if USE_DATABASE:
            with app.app_context():
                engine, session = get_engine_and_session()
                cos = session.query(COS).get(cos_id_uuid)
                if not cos:
                    session.close()
                    return {'success': False, 'message': f"COS {cos_id_str} not found.", 'status_code': 404}

                for key, value in updated_data.items():
                    if key not in ['conditional_elements', 'id', 'ssol_id']:
                        setattr(cos, key, value)
                
                if new_content_text is not None:
                    session.query(CE).filter_by(cos_id=cos_id_uuid).delete(synchronize_session=False)
                    session.flush()

                    for ce_data in new_ces_data_list_from_analysis:
                        new_ce_instance = CE(
                            id=UUID(ce_data['id']),
                            node_type=ce_data['node_type'],
                            cos_id=cos_id_uuid
                        )
                        session.add(new_ce_instance)
                
                session.commit()
                updated_cos_dict = cos.to_dict()
                session.close()
                return {'success': True, 'cos': updated_cos_dict}
        else:
            cos_record = cos_store.get(cos_id_str)
            if not cos_record:
                return {'success': False, 'message': f"COS {cos_id_str} not found.", 'status_code': 404}

            for key, value in updated_data.items():
                if key != 'conditional_elements':
                    cos_record[key] = value
            
            if new_content_text is not None:
                if 'conditional_elements' in cos_record:
                    for old_ce in cos_record['conditional_elements']:
                        ce_store.pop(old_ce['id'], None)
                cos_record['conditional_elements'] = []

                for ce_data in new_ces_data_list_from_analysis:
                    new_ce_dict = {
                        'id': ce_data['id'],
                        'node_type': ce_data['node_type'],
                        'cos_id': cos_id_str
                    }
                    ce_store[ce_data['id']] = new_ce_dict
                    cos_record['conditional_elements'].append(new_ce_dict)
            
            return {'success': True, 'cos': cos_record}

    except KeyError as e:
        current_app.logger.error(f"KeyError updating COS {cos_id_param}: {e}. Analysis result: {analysis_result}", exc_info=True)
        return {'success': False, 'message': f"Data error: {str(e)}", 'status_code': 400}
    except Exception as e:
        current_app.logger.error(f"Error updating COS {cos_id_param}: {e}", exc_info=True)
        if USE_DATABASE and 'session' in locals() and session.is_active:
            session.rollback(); session.close()
        return {'success': False, 'message': f"Unexpected error: {str(e)}", 'status_code': 500}


def delete_cos_by_id(USE_DATABASE: bool, cos_id: UUID) -> bool:
    from models import COS, CE, get_engine_and_session
    from store import cos_store, ce_store
    from app import app

    try:
        cos_id_uuid = cos_id
        cos_id_str = str(cos_id_uuid)

        if USE_DATABASE:
            with app.app_context():
                engine, session = get_engine_and_session()
                session.query(CE).filter_by(cos_id=cos_id_uuid).delete(synchronize_session=False)
                cos = session.query(COS).get(cos_id_uuid)
                if cos:
                    session.delete(cos)
                    session.commit()
                    session.close()
                    return True
                session.close()
                return False
        else:
            if cos_id_str in cos_store:
                cos_record = cos_store.get(cos_id_str, {})
                for ce_data in cos_record.get('conditional_elements', []):
                    ce_store.pop(ce_data['id'], None)
                del cos_store[cos_id_str]
                return True
            return False
    except Exception as e:
        current_app.logger.error(f"Error deleting COS {cos_id}: {e}", exc_info=True)
        if USE_DATABASE and 'session' in locals() and session.is_active:
            session.rollback()
            session.close()
        return False

# --- SSOL CRUD Operations ---
def create_ssol(USE_DATABASE: bool, title: str, description: str) -> str:
    from models import SSOL, get_engine_and_session
    from store import ssol_store
    from app import app

    if USE_DATABASE:
        with app.app_context():
            engine, session = get_engine_and_session()
            new_ssol_uuid = uuid.uuid4()
            ssol = SSOL(id=new_ssol_uuid, title=title, description=description)
            session.add(ssol)
            session.commit()
            ssol_id_to_return = str(new_ssol_uuid)
            session.close()
            return ssol_id_to_return
    else:
        ssol_id = str(uuid.uuid4())
        ssol_store[ssol_id] = {'id': ssol_id, 'title': title, 'description': description, 'phases': {}}
        return ssol_id

def get_ssol_by_id(USE_DATABASE: bool, ssol_id: UUID):
    from models import SSOL, get_engine_and_session
    from store import ssol_store
    from app import app
    if USE_DATABASE:
        if not isinstance(ssol_id, UUID): ssol_id = UUID(str(ssol_id))
        with app.app_context():
            engine, session = get_engine_and_session()
            ssol = session.query(SSOL).get(ssol_id)
            session.close()
            return ssol
    else:
        return ssol_store.get(str(ssol_id))

# --- CE CRUD Operations ---
def get_ce_by_id(USE_DATABASE: bool, ce_id_param):
    from models import CE, get_engine_and_session
    from store import ce_store
    from app import app

    ce_id_uuid = None
    if isinstance(ce_id_param, UUID):
        ce_id_uuid = ce_id_param
    else:
        try:
            ce_id_uuid = UUID(str(ce_id_param))
        except ValueError:
            current_app.logger.error(f"Invalid UUID format for ce_id: '{ce_id_param}'")
            return None

    try:
        if USE_DATABASE:
            with app.app_context():
                engine, SessionLocal = get_engine_and_session()
                session = SessionLocal()
                try:
                    ce_db_instance = session.query(CE).get(ce_id_uuid)
                    if ce_db_instance:
                        ce_data_to_return = ce_db_instance.to_dict()
                    else:
                        current_app.logger.debug(f"CE with ID {ce_id_uuid} not found in database.")
                        ce_data_to_return = None
                except Exception as db_exc:
                    current_app.logger.error(f"Database error retrieving CE {ce_id_uuid}: {db_exc}", exc_info=True)
                    ce_data_to_return = None
                finally:
                    session.close()
            return ce_data_to_return
        else:
            return ce_store.get(str(ce_id_uuid))

    except ValueError as ve:
        current_app.logger.error(f"ValueError processing CE ID '{ce_id_param}': {ve}", exc_info=True)
        return None
    except Exception as e:
        current_app.logger.error(f"Unexpected error in get_ce_by_id for CE ID '{ce_id_param}': {e}", exc_info=True)
        return None


def create_ce(USE_DATABASE: bool, node_type: str, cos_id: UUID, data: dict) -> str:
    from models import CE, get_engine_and_session
    from store import ce_store
    from app import app

    new_ce_uuid = uuid.uuid4()
    ce_id_str = str(new_ce_uuid)

    if USE_DATABASE:
        with app.app_context():
            engine, session = get_engine_and_session()
            ce = CE(id=new_ce_uuid, node_type=node_type, cos_id=cos_id, data=data)
            session.add(ce)
            session.commit()
            session.close()
    else:
        ce_data = {'id': ce_id_str, 'node_type': node_type, 'cos_id': str(cos_id), 'data': data}
        ce_store[ce_id_str] = ce_data
    return ce_id_str


def update_ce_by_id(USE_DATABASE: bool, ce_id: UUID, ce_data: dict) -> bool:
    from models import CE, get_engine_and_session
    from store import ce_store
    from app import app

    ce_id_uuid = ce_id
    ce_id_str = str(ce_id_uuid)

    if USE_DATABASE:
        with app.app_context():
            engine, session = get_engine_and_session()
            ce = session.query(CE).get(ce_id_uuid)
            if ce:
                # The 'data' column is the one we update with the entire payload
                ce.data = ce_data
                session.commit()
                session.close()
                return True
            session.close()
            return False
    else:
        if ce_id_str in ce_store:
            # We update the 'data' field, but keep id, node_type, etc.
            if 'data' not in ce_store[ce_id_str]:
                 ce_store[ce_id_str]['data'] = {}
            ce_store[ce_id_str]['data'] = ce_data
            return True
        return False

def delete_ce_by_id(USE_DATABASE: bool, ce_id: UUID) -> bool:
    from models import CE, get_engine_and_session
    from store import ce_store
    from app import app
    
    ce_id_uuid = ce_id
    ce_id_str = str(ce_id_uuid)

    if USE_DATABASE:
        with app.app_context():
            engine, session = get_engine_and_session()
            ce = session.query(CE).get(ce_id_uuid)
            if ce:
                session.delete(ce)
                session.commit()
                session.close()
                return True
            session.close()
            return False
    else:
        return bool(ce_store.pop(ce_id_str, None))
