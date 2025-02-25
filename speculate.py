# speculate.py
import re
import os
import html
import json
import uuid
from uuid import UUID
import logging
from bs4 import BeautifulSoup
from app import USE_DATABASE, app  # Import app!
from ce_nodes import NODES, get_valid_node_types
from ce_templates import replace_ce_tags_with_pills
from sqlalchemy.exc import SQLAlchemyError
from ai_service import generate_chat_response_with_node_types, generate_chat_response
from flask import current_app

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def create_cos(ssol_id, content, status, accountable_party=None, completion_date=None):
    from models import COS, CE, get_engine_and_session  # Local import
    from store import ce_store, cos_store  # Local import

    try:
        analyzed_content = analyze_cos(content)
        if 'content_with_ce' not in analyzed_content:
            raise KeyError("Expected 'content_with_ce' in analyzed content")

        content_with_ce = analyzed_content['content_with_ce']

        if USE_DATABASE:
            with app.app_context():  # Use application context
                engine, session = get_engine_and_session()
                cos = COS(content=content_with_ce, status=status, accountable_party=accountable_party,
                          completion_date=completion_date, ssol_id=ssol_id)
                session.add(cos)
                for ce_data in analyzed_content['ces']:
                    ce = CE(content=ce_data['content'], node_type=ce_data['ce_type'])
                    session.add(ce)
                    cos.conditional_elements.append(ce)
                session.commit()
                cos_id_to_return = str(cos.id)  # Get string representation
                session.close()
        else:
            cos_id_to_return = str(uuid.uuid4())
            cos = {'id': cos_id_to_return, 'content': content_with_ce, 'status': status, 'ssol_id': ssol_id, 'conditional_elements': []}
            cos_store[cos_id_to_return] = cos  # Use cos_id_to_return as key
            for ce_data in analyzed_content['ces']:
                ce_id = str(uuid.uuid4())
                ce = {'id': ce_id, 'content': ce_data['content'], 'node_type': ce_data['ce_type']}
                ce_store[ce_id] = ce
                cos['conditional_elements'].append(ce)  # Append to the list
        return cos_id_to_return  # Consistent return type

    except KeyError as e:
        logging.error(f"Error creating COS: {e}")
        raise
    except Exception as e:
        logging.error(f"Error creating COS: {e}", exc_info=True)
        if USE_DATABASE:
            with app.app_context():
                engine, session = get_engine_and_session()
                session.rollback()
                session.close()
        raise

def get_cos_by_id(cos_id):
    from models import COS, get_engine_and_session  # Local import
    from store import cos_store  # Local import

    if USE_DATABASE:
        with app.app_context():
            engine, session = get_engine_and_session()
            cos = session.query(COS).get(uuid.UUID(cos_id))  # Use UUID object
            session.close()
            return cos
    else:
        return cos_store.get(cos_id)

def analyze_cos(cos_content):
    prompt = (
        "Analyze the following condition of satisfaction (COS) and identify any conditional elements (CEs). "
        "Return a JSON object with the COS text and an array of CEs, each with its text and type."
        "\nCOS: '{}'"
        "\nExpected response format:"
        "{{"
        "  'COS': 'The full text of the COS',"
        "  'CEs': ["
        "    {{'text': 'A conditional element', 'type': 'The type of CE (must be one of the valid node types)'}}"
        "  ]"
        "}}"
    ).format(cos_content)

    messages = [
        {"role": "system", "content": "Return a JSON object with the analyzed COS and CEs. **The response should be valid JSON.**"},
        {"role": "user", "content": prompt},
    ]

    try:
        response_text = generate_chat_response_with_node_types(messages, role='COS Analysis', task='Analyze COS')
        response_json = json.loads(response_text)

        cos_text = response_json.get("COS", cos_content)
        ces = response_json.get("CEs", [])

        valid_node_types = get_valid_node_types()
        valid_ces = []
        for ce in ces:
            if ce["type"] in valid_node_types:
                valid_ces.append({
                    'content': ce["text"],
                    'ce_type': ce["type"]
                })

        content_with_ce = replace_ce_tags_with_pills(cos_text, valid_ces)
        return {'content_with_ce': content_with_ce, 'ces': valid_ces}

    except Exception as e:
        logging.error(f"Exception occurred during COS analysis: {e}", exc_info=True)
        return {'content_with_ce': cos_content, 'ces': []}


def update_cos_by_id(cos_id, updated_data):
    from models import COS, get_engine_and_session  # Local import
    from store import cos_store  #Local Import
    try:
        cos_id_uuid = uuid.UUID(cos_id) if isinstance(cos_id, str) else cos_id

        if USE_DATABASE:
            with app.app_context():  # Use application context
                engine, session = get_engine_and_session()
                cos = session.query(COS).get(cos_id_uuid)
                if cos:
                    for key, value in updated_data.items():
                        setattr(cos, key, value)
                    session.commit()
                    result = {'success': True, 'cos': cos.to_dict()}
                else:
                    result = {'success': False, 'message': f"COS with ID {cos_id} not found."}
                session.close()
            return result
        else:
            cos = cos_store.get(str(cos_id))  # Use string for in-memory
            if cos:
                cos.update(updated_data)
                return {'success': True, 'cos': cos}
            else:
                return {'success': False, 'message': f"COS with ID {cos_id} not found."}
    except Exception as e:
        current_app.logger.error(f"Unexpected error during COS update: {e}", exc_info=True)
        return {'success': False, 'message': f"Unexpected error occurred: {e}"}


def delete_cos_by_id(cos_id, ssol_id=None):
    from models import COS, get_engine_and_session  # Local import
    from store import cos_store  # Local import
    try:
        cos_id_uuid = uuid.UUID(cos_id) if isinstance(cos_id, str) else cos_id

        if USE_DATABASE:
            with app.app_context():
                engine, session = get_engine_and_session()
                cos = session.query(COS).get(cos_id_uuid)
                if cos and (ssol_id is None or str(cos.ssol_id) == str(ssol_id)):
                    session.delete(cos)
                    session.commit()
                    session.close()  # Close after commit
                    return True
                else:
                    session.close()
                    return False
        else:
            if cos_id in cos_store and (ssol_id is None or cos_store[cos_id]['ssol_id'] == ssol_id):
                del cos_store[cos_id]
                return True
            return False
    except Exception as e:
        current_app.logger.error(f"Error deleting COS: {e}", exc_info=True)
        return False

def get_ce_type(ce_content):
    messages = [
        {"role": "system", "content": "You are responsible for identifying the appropriate card type for the given conditional element. **Respond with valid JSON.**"},
        {"role": "user", "content": ce_content},
    ]
    response_text = generate_chat_response(messages, role='Conditional Element (CE) Node Type Identification', task='Identify CE Type', temperature=0.8)

    try:
        response_data = json.loads(response_text)
        return response_data.get('type', '')
    except json.JSONDecodeError:
        logging.error(f"Error parsing JSON response: {response_text}")
        return ""

def create_ssol(goal, summary):
    from models import SSOL, get_engine_and_session #Local Import
    from store import ssol_store #Local Import
    if USE_DATABASE:
        with app.app_context():
            engine, session = get_engine_and_session()
            ssol = SSOL(title=goal, description=summary) # Use title and description
            session.add(ssol)
            session.commit()
            ssol_id_to_return = str(ssol.id) # Return string UUID
            session.close()
            return ssol_id_to_return
    else:
        ssol_id = str(uuid.uuid4())
        ssol_store[ssol_id] = {'id': ssol_id, 'goal': goal, 'summary': summary}
        return ssol_id

def get_ssol_by_id(ssol_id):
    from models import SSOL, get_engine_and_session
    from store import ssol_store #Local Import
    if USE_DATABASE:
        with app.app_context():
            engine, session = get_engine_and_session()
            ssol = session.query(SSOL).get(uuid.UUID(ssol_id))
            session.close()
            return ssol
    else:
        return ssol_store.get(ssol_id)


def update_ssol_by_id(ssol_id, updated_data):
    from models import SSOL, get_engine_and_session
    from store import ssol_store  # Local Import
    if USE_DATABASE:
        with app.app_context():
            engine, session = get_engine_and_session()
            ssol = session.query(SSOL).get(uuid.UUID(ssol_id))
            if ssol:
              for key, value in updated_data.items():
                  setattr(ssol, key, value)
              session.commit()
              session.close()
    else:
        ssol = ssol_store.get(ssol_id)
        if ssol:
            ssol.update(updated_data)

def delete_ssol_by_id(ssol_id):
    from models import SSOL, get_engine_and_session
    from store import ssol_store # Local Import
    if USE_DATABASE:
        with app.app_context():
            engine, session = get_engine_and_session()
            ssol = session.query(SSOL).get(uuid.UUID(ssol_id))
            if ssol:
                session.delete(ssol)
                session.commit()
                session.close()
                return True
            else:
                session.close()
                return False
    else:
        return bool(ssol_store.pop(ssol_id, None))

def get_ce_by_id(ce_id: UUID):
    from models import CE, get_engine_and_session # Local Import
    from store import ce_store # Local Import

    try:
        ce_id_str = str(ce_id)
        if USE_DATABASE:
            with app.app_context():
                engine, session = get_engine_and_session()
                ce = session.query(CE).get(uuid.UUID(ce_id_str))  # Convert string to UUID
                session.close()
                if not ce:
                    raise ValueError(f"CE with ID {ce_id_str} not found in the database.")
        else:
            ce_dict = ce_store.get(ce_id_str)
            if not ce_dict:
              raise ValueError(f"CE with ID {ce_id_str} not found in the in-memory store.")
            ce = CE(**ce_dict) # Create a CE object for consistency
        return ce
    except ValueError as e:
        logging.error(f"Error retrieving CE by ID {ce_id_str}: {e}")
        raise
    except Exception as e:
        logging.error(f"Unexpected error retrieving CE by ID {ce_id_str}: {e}", exc_info=True)
        raise


def create_ce(content, node_type, cos_id):
    from models import CE, get_engine_and_session  # Local import
    from store import ce_store  # Local import

    ce_id = str(uuid.uuid4())
    if USE_DATABASE:
        with app.app_context():  # Use application context
            engine, session = get_engine_and_session()
            ce = CE(id=uuid.UUID(ce_id), content=content, node_type=node_type, cos_id=uuid.UUID(cos_id))
            session.add(ce)
            session.commit()
            current_app.logger.debug(f"Created CE in database: {ce}")
            session.close()
    else:
        ce_data = {'id': ce_id, 'content': content, 'node_type': node_type, 'cos_id': cos_id}
        ce_store[ce_id] = ce_data
        current_app.logger.debug(f"Created CE in in-memory store: {ce_store[ce_id]}")
    return ce_id

def update_ce_by_id(ce_id: UUID, ce_data):
    from models import CE, get_engine_and_session  # Local import
    from store import ce_store  # Local import

    ce_id_str = str(ce_id)
    if USE_DATABASE:
        with app.app_context():
            engine, session = get_engine_and_session()
            ce = session.query(CE).get(uuid.UUID(ce_id_str))
            if ce:
                for key, value in ce_data.items():
                    setattr(ce, key, value)
                session.commit()
                session.close()  # Close after commit
                return True
            else:
                current_app.logger.error(f"CE with ID {ce_id_str} not found in database.")
                session.close()
                return False
    else:
        if ce_id_str in ce_store:
            ce_store[ce_id_str].update(ce_data)
            return True
        else:
            current_app.logger.error(f"CE with ID {ce_id_str} not found in in-memory store.")
            return False

def delete_ce_by_id(ce_id):
    from models import CE, get_engine_and_session # Local Import
    from store import ce_store  # Local Import
    ce_id_str = str(ce_id)
    if USE_DATABASE:
        with app.app_context():
            engine, session = get_engine_and_session()
            ce = session.query(CE).get(uuid.UUID(ce_id_str))  # Convert string to UUID
            if ce:
                session.delete(ce)
                session.commit()
                session.close()
                return True
            else:
                session.close()
                return False
    else:
        return bool(ce_store.pop(ce_id_str, None))

def get_badge_class_from_status(status):
    return {
        'Proposed': 'bg-info',
        'In Progress': 'bg-warning text-dark',
        'Completed': 'bg-success',
        'Rejected': 'bg-danger'
    }.get(status, 'bg-secondary')

def check_data_store_contents(data_store_type='in_memory'):
    from models import COS, get_engine_and_session #Local Import
    from store import cos_store #Local Import
    if data_store_type == 'in_memory':
        try:
            for cos_id_str, cos_data in cos_store.items():
                logging.info(f"COS ID: {cos_id_str}, Data: {cos_data}")
        except NameError:
            logging.warning("In-memory store 'cos_store' not found.")
    elif data_store_type == 'database' and USE_DATABASE:
        try:
            with app.app_context():
                engine, session = get_engine_and_session()
                cos_entries = session.query(COS).all()
                for entry in cos_entries:
                    logging.info(f"COS ID: {entry.id}, Data: {entry}")
                session.close()
        except Exception as e:
            logging.error(f"Database query failed with error: {e}")
    else:
        logging.error(f"Unknown data store type: {data_store_type}")

def get_phase_index(cos):
    phase_mapping = {
        'Discovery': 0,
        'Engagement': 1,
        'Action': 2,
        'Completion': 3,
        'Legacy': 4,
    }
    phase_name = cos.get('phase', 'SSPEC')
    return phase_mapping.get(phase_name, 0)

def parse_ai_response_and_generate_html(response_json):
    from models import CE, get_engine_and_session  # Local import
    from store import ce_store  # Local import

    structured_solution = {}
    expected_phases = ["Discovery", "Engagement", "Action", "Completion", "Legacy"]

    for phase in expected_phases:
        structured_solution[phase] = []
        for cos_dict in response_json.get(phase, []):
            cos_id = str(uuid.uuid4())
            cos_html = cos_dict['content']  # Access 'content' key
            ces = []

            soup = BeautifulSoup(cos_html, 'html.parser')
            for ce_tag in soup.find_all('ce'):
                ce_uuid = str(uuid.uuid4())
                new_tag = soup.new_tag('span', attrs={
                    'class': 'badge rounded-pill bg-secondary ce-pill',
                    'data-ce-id': ce_uuid,
                    'data-ce-type': ce_tag['type']
                })
                new_tag.string = ce_tag.string
                ce_tag.replace_with(new_tag)

                ce_data = {
                    'id': ce_uuid,
                    'content': ce_tag.string,
                    'status': 'Proposed',
                    'type': ce_tag['type']
                }
                ces.append(ce_data)

                if USE_DATABASE:
                    with app.app_context():
                        engine, session = get_engine_and_session()
                        ce_instance = CE(id=uuid.UUID(ce_uuid), content=ce_tag.string, node_type=ce_tag['type'])
                        session.add(ce_instance)
                        session.commit()
                        session.close()
                else:
                    ce_store[ce_uuid] = ce_data


            structured_solution[phase].append({
                'id': cos_id,
                'content': str(soup),
                'status': 'Proposed',
                'ces': ces
            })
    return structured_solution