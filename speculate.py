# speculate.py (Complete and Refactored with fixes for pill parsing)
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
from ce_templates import replace_ce_tags_with_pills
from sqlalchemy.exc import SQLAlchemyError
from ai_service import generate_chat_response_with_node_types, generate_chat_response

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- NEW SAFE EXTRACTION HELPER ---
def _safe_get_ai_data(data_dict, key):
    """Safely retrieves a key, cleaning up surrounding quotes and whitespace."""
    if not isinstance(data_dict, dict):
        return None
    
    key_variants = [
        key,
        key.strip(),
        f'"{key}"',
        f'"{key}"'.strip(),
        f'  "{key}"'.strip(),
        f' {key} '.strip()
    ]
    
    for k in set(key_variants):
        if k in data_dict:
            return data_dict[k]
        
        for dict_key in data_dict.keys():
            if str(dict_key).strip().strip('"').lower() == key.lower():
                return data_dict[dict_key]
        
    return None

# --- COS Analysis and CE Pill Generation ---
async def analyze_cos(cos_content: str, cos_id: str = None) -> dict:
    """
    Analyzes COS content using AI to identify CEs, and prepares content with CE pills.
    Returns a dictionary: {'content_with_ce': <html_string>, 'ces_data_list': [<ce_dict>, ...]}
    """
    prompt = (
        f"Analyze the following Condition of Satisfaction (COS) text: '{cos_content}'. "
        "Identify all Conditional Elements (CEs) within this text. "
        "A CE is a specific part of the COS that requires further detail or action. "
        f"For each CE found, determine its most appropriate 'NodeType' from this list ONLY: {', '.join(get_valid_node_types())}. "
        "Your response MUST be a valid JSON object with two keys: "
        "'analyzed_cos_text': This should be the original COS text but with each identified CE "
        "wrapped in <ce type='NodeType'>Your CE Text Here</ce> tags. "
        "And 'identified_ces': an array of objects, where each object represents a CE and has 'text' and 'type' keys. "
        "Example JSON: "
        '{'
        '  "analyzed_cos_text": "The <ce type=\'Research\'>literature review</ce> must be completed and <ce type=\'Stakeholder\'>key experts</ce> identified.",'
        '  "identified_ces": ['
        '    {"text": "literature review", "type": "Research"},'
        '    {"text": "key experts", "type": "Stakeholder"}'
        '  ]'
        '}'
    )

    messages = [
        {"role": "system", "content": "You are an expert in analyzing text to identify conditional elements and structure them in JSON. Ensure NodeTypes are from the provided list. The 'analyzed_cos_text' MUST include the <ce> tags."},
        {"role": "user", "content": prompt},
    ]
    response_text = ""
    try:
        response_text = await generate_chat_response_with_node_types(messages, role='COS Analysis', task='Analyze COS for CEs')
        response_json = json.loads(response_text)

        ai_analyzed_text_with_tags = response_json.get("analyzed_cos_text", cos_content)
        ai_identified_ces_list = response_json.get("identified_ces", [])

        ces_data_for_pills = []
        for ce_item in ai_identified_ces_list:
            if ce_item.get("type") in get_valid_node_types():
                ces_data_for_pills.append({
                    'content': ce_item.get("text", ""),
                    'node_type': ce_item.get("type")
                })

        content_with_pills_html = replace_ce_tags_with_pills(ai_analyzed_text_with_tags, ces_data_for_pills)

        final_ces_data_list = []
        soup = BeautifulSoup(content_with_pills_html, 'html.parser')
        
        # --- FIX: Changed 'span' to 'div' to correctly find the new pill structure ---
        for pill_tag in soup.find_all('div', class_='ce-pill'):
            # --- FIX: Robustly find the text within the child span ---
            text_element = pill_tag.find('span', class_='ce-pill-text')
            pill_text = text_element.string.strip() if text_element and text_element.string else ""
            
            final_ces_data_list.append({
                'id': pill_tag.get('data-ce-id'),
                'content': pill_text,
                'node_type': pill_tag.get('data-ce-type'),
                'cos_id': cos_id
            })
        
        return {'content_with_ce': content_with_pills_html, 'ces_data_list': final_ces_data_list}

    except json.JSONDecodeError as e:
        current_app.logger.error(f"JSONDecodeError in analyze_cos: {e}. AI Response: '{response_text}'", exc_info=True)
        return {'content_with_ce': html.escape(cos_content), 'ces_data_list': []}
    except Exception as e:
        current_app.logger.error(f"Exception in analyze_cos: {e}. AI Response: '{response_text}'", exc_info=True)
        return {'content_with_ce': html.escape(cos_content), 'ces_data_list': []}

async def create_cos(USE_DATABASE: bool, ssol_id: UUID, content: str, status: str, accountable_party: str = None, completion_date=None) -> str:
    from models import COS, CE, get_engine_and_session
    from store import ce_store, cos_store
    from app import app
    from sqlalchemy.exc import SQLAlchemyError

    analysis_result = {}
    cos_id_str = None
    
    try:
        new_cos_uuid = uuid.uuid4()
        cos_id_str = str(new_cos_uuid)

        analysis_result = await analyze_cos(content, cos_id_str)
        content_with_pills = analysis_result['content_with_ce']
        extracted_ces_data = analysis_result['ces_data_list']

        if USE_DATABASE:
            with app.app_context():
                engine, SessionLocal = get_engine_and_session()
                session = SessionLocal()
                try:
                    if completion_date in ['None', 'N/A', '', None]:
                         completion_date_for_db = None
                    else:
                        completion_date_for_db = completion_date

                    cos_instance = COS(
                        id=new_cos_uuid,
                        content=content_with_pills,
                        status=status,
                        accountable_party=accountable_party,
                        completion_date=completion_date_for_db,
                        ssol_id=ssol_id
                    )
                    session.add(cos_instance)

                    for ce_data in extracted_ces_data:
                        ce_uuid = UUID(ce_data['id'])
                        ce_instance = CE(
                            id=ce_uuid,
                            content=ce_data['content'],
                            node_type=ce_data['node_type'],
                            cos_id=new_cos_uuid
                        )
                        session.add(ce_instance)
                        
                    session.commit()
                    
                except SQLAlchemyError as db_e:
                    session.rollback()
                    current_app.logger.error(f"DB Error on create_cos (SSOL: {ssol_id}, COS: {cos_id_str}): {db_e}", exc_info=True)
                    raise Exception(f"Database error while saving Condition of Satisfaction.") from db_e
                finally:
                    if session.is_active: 
                        session.close()
        else:
            cos_record = {
                'id': cos_id_str,
                'content': content_with_pills,
                'status': status,
                'ssol_id': str(ssol_id),
                'accountable_party': accountable_party,
                'completion_date': str(completion_date) if completion_date else None,
                'conditional_elements': []
            }
            cos_store[cos_id_str] = cos_record

            for ce_data in extracted_ces_data:
                ce_record = {
                    'id': ce_data['id'], 'content': ce_data['content'],
                    'node_type': ce_data['node_type'], 'cos_id': cos_id_str
                }
                ce_store[ce_data['id']] = ce_record
                cos_record['conditional_elements'].append(ce_record)
        
        return cos_id_str

    except ValueError as e:
        current_app.logger.error(f"Data validation error creating COS (SSOL: {ssol_id}): {e}", exc_info=True)
        raise ValueError(f"Data error: {str(e)}") from e
    except Exception as e:
        current_app.logger.error(f"General Error creating COS (SSOL: {ssol_id}, COS: {cos_id_str}): {e}", exc_info=True)
        raise

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
                            content=ce_data['content'],
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
                        'content': ce_data['content'],
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
            ce_from_store = ce_store.get(str(ce_id_uuid))
            if ce_from_store:
                form_data_mem = {}
                raw_content = ce_from_store.get('content')
                if isinstance(raw_content, str):
                    try:
                        form_data_mem = json.loads(raw_content)
                        if not isinstance(form_data_mem, dict):
                            form_data_mem = {}
                    except json.JSONDecodeError:
                        current_app.logger.debug(f"In-memory CE {ce_id_uuid} 'content' is not JSON: '{raw_content}'")
                        form_data_mem = {}
                elif isinstance(raw_content, dict):
                    form_data_mem = raw_content

                table_data_mem = []
                raw_details = ce_from_store.get('details')
                if isinstance(raw_details, str):
                    try:
                        table_data_mem = json.loads(raw_details)
                        if not isinstance(table_data_mem, list):
                            table_data_mem = []
                    except json.JSONDecodeError:
                        current_app.logger.debug(f"In-memory CE {ce_id_uuid} 'details' is not JSON: '{raw_details}'")
                        table_data_mem = []
                elif isinstance(raw_details, list):
                    table_data_mem = raw_details

                return {
                    'id': ce_from_store.get('id', str(ce_id_uuid)),
                    'node_type': ce_from_store.get('node_type'),
                    'cos_id': ce_from_store.get('cos_id'),
                    'form_data': form_data_mem,
                    'table_data': table_data_mem
                }
            else:
                current_app.logger.debug(f"CE with ID {ce_id_uuid} not found in in-memory store.")
                return None

    except ValueError as ve:
        current_app.logger.error(f"ValueError processing CE ID '{ce_id_param}': {ve}", exc_info=True)
        return None
    except Exception as e:
        current_app.logger.error(f"Unexpected error in get_ce_by_id for CE ID '{ce_id_param}': {e}", exc_info=True)
        return None


def create_ce(USE_DATABASE: bool, content: str, node_type: str, cos_id: UUID) -> str:
    from models import CE, get_engine_and_session
    from store import ce_store
    from app import app

    new_ce_uuid = uuid.uuid4()
    ce_id_str = str(new_ce_uuid)

    if USE_DATABASE:
        with app.app_context():
            engine, session = get_engine_and_session()
            ce = CE(id=new_ce_uuid, content=content, node_type=node_type, cos_id=cos_id)
            session.add(ce)
            session.commit()
            session.close()
    else:
        ce_data = {'id': ce_id_str, 'content': content, 'node_type': node_type, 'cos_id': str(cos_id)}
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
                for key, value in ce_data.items():
                    if hasattr(ce, key) and key not in ['id', 'cos_id']:
                        setattr(ce, key, value)
                session.commit()
                session.close()
                return True
            session.close()
            return False
    else:
        if ce_id_str in ce_store:
            ce_store[ce_id_str].update(ce_data)
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


# --- Initial SSOL Generation Logic ---
def parse_ai_response_and_generate_html(USE_DATABASE: bool, response_json: dict, ssol_id_for_cos: UUID) -> dict:
    from models import COS, CE, get_engine_and_session
    from store import cos_store, ce_store
    from app import app

    structured_solution = {}
    expected_phases = ["Discovery", "Engagement", "Action", "Completion", "Legacy"]

    for phase_name in expected_phases:
        structured_solution[phase_name] = []
        cos_list_from_ai = response_json.get(phase_name, [])

        for cos_dict_from_ai in cos_list_from_ai:
            cos_uuid = uuid.uuid4()
            cos_id_str = str(cos_uuid)
            
            raw_cos_content_from_ai = cos_dict_from_ai.get('content', '')
            content_with_html_pills = replace_ce_tags_with_pills(raw_cos_content_from_ai, [])

            ces_for_this_cos_data = []
            soup = BeautifulSoup(content_with_html_pills, 'html.parser')

            # --- BUG FIX: Changed 'span' to 'div' to match the actual HTML of the pills. ---
            for pill_tag in soup.find_all('div', class_='ce-pill'):
                ce_pill_id_str = pill_tag.get('data-ce-id')
                
                # --- BUG FIX: Extract text from the specific child span for robustness. ---
                text_element = pill_tag.find('span', class_='ce-pill-text')
                ce_content_text = text_element.string.strip() if text_element and text_element.string else ""
                
                ce_node_type = pill_tag.get('data-ce-type')

                if ce_pill_id_str and ce_node_type:
                    ce_data_item = {
                        'id': ce_pill_id_str,
                        'content': ce_content_text,
                        'node_type': ce_node_type,
                        'cos_id': cos_id_str
                    }
                    ces_for_this_cos_data.append(ce_data_item)

                    if USE_DATABASE:
                        with app.app_context():
                            engine, session = get_engine_and_session()
                            ce_instance = CE(
                                id=UUID(ce_pill_id_str),
                                content=ce_content_text,
                                node_type=ce_node_type,
                                cos_id=cos_uuid
                            )
                            session.add(ce_instance)
                    else:
                        ce_store[ce_pill_id_str] = ce_data_item

            if USE_DATABASE:
                with app.app_context():
                    engine, session = get_engine_and_session()
                    new_cos_db = COS(
                        id=cos_uuid,
                        content=content_with_html_pills,
                        status='Proposed',
                        ssol_id=ssol_id_for_cos,
                        accountable_party=None,
                        completion_date=None
                    )
                    session.add(new_cos_db)
            else:
                 cos_store[cos_id_str] = {
                    'id': cos_id_str,
                    'content': content_with_html_pills,
                    'status': 'Proposed',
                    'ssol_id': str(ssol_id_for_cos),
                    'accountable_party': None,
                    'completion_date': None,
                    'conditional_elements': ces_for_this_cos_data
                }

            structured_solution[phase_name].append({
                'id': cos_id_str,
                'content': content_with_html_pills,
                'status': 'Proposed',
                'accountable_party': None,
                'completion_date': None,
            })
    
    if USE_DATABASE:
        with app.app_context():
            engine, session = get_engine_and_session()
            try:
                session.commit()
            except Exception as e:
                session.rollback()
                current_app.logger.error(f"Error committing initial SSOL COS/CEs: {e}", exc_info=True)
                raise
            finally:
                session.close()

    return structured_solution