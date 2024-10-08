import re
import os
import html
import json
import uuid
from uuid import UUID
import logging
from bs4 import BeautifulSoup 
from app import USE_DATABASE, db  
from ce_nodes import NODES
from ce_templates import replace_ce_tags_with_pills
from models import session  
from sqlalchemy.inspection import inspect
from sqlalchemy.exc import SQLAlchemyError
from utilities import generate_chat_response, get_valid_node_types, generate_chat_response_with_node_types
from models import COS, CE, SSOL, COS_CE_Link  
from store import ssol_store, cos_store, ce_store  
from sqlalchemy.orm import relationship, sessionmaker
from flask import render_template, jsonify, current_app
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, String, Date, ForeignKey, create_engine


logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s') 

def create_cos(ssol_id, content, status, accountable_party=None, completion_date=None):  
    try:  
        analyzed_content = analyze_cos(content)  

        # Ensure 'ces' key exists  
        content_with_ce = analyzed_content['content_with_ce']  
        ces = analyzed_content.get('ces', [])  

        if USE_DATABASE:  
            cos = COS(content=content_with_ce, status=status, accountable_party=accountable_party,  
                      completion_date=completion_date, ssol_id=ssol_id)  
            db.session.add(cos)  
            for ce_data in ces:  
                ce = CE(content=ce_data['content'], node_type=ce_data['ce_type'])  
                db.session.add(ce)  
                cos.conditional_elements.append(ce)  
            db.session.commit()  
            return cos.id  
        else:  
            cos_id = str(uuid.uuid4())  
            cos = {'id': cos_id, 'content': content_with_ce, 'status': status, 'ssol_id': ssol_id}  
            cos_store[cos_id] = cos  
            for ce_data in ces:  
                ce_id = str(uuid.uuid4())  
                ce = {'id': ce_id, 'content': ce_data['content'], 'node_type': ce_data['ce_type']}  
                ce_store[ce_id] = ce  
                cos['conditional_elements'] = cos.get('conditional_elements', []) + [ce]  
            return cos_id  
    except KeyError as e:  
        logging.error(f"Error creating COS: {e}")  
        raise  
    except Exception as e:  
        logging.error(f"Error creating COS: {e}", exc_info=True)  
        if USE_DATABASE:  
            db.session.rollback()  
        raise  

def get_cos_by_id(cos_id):  
    from app import USE_DATABASE 
    if USE_DATABASE:  
        return COS.query.get(cos_id)  
    else:  
        return cos_store.get(str(cos_id))  

def get_ce_by_id(ce_id: UUID):  
    try:  
        if USE_DATABASE:  
            ce = session.query(CE).get(ce_id)  
            if not ce:  
                current_app.logger.error(f"CE with ID {ce_id} not found in database.")  
                raise ValueError(f"CE with ID {ce_id} not found in the database.")  
        else:  
            ce_id_str = str(ce_id)  
            ce_dict = ce_store.get(ce_id_str)  
            if not ce_dict:  
                current_app.logger.error(f"CE with ID {ce_id_str} not found in in-memory store.")  
                raise ValueError(f"CE with ID {ce_id_str} not found in the in-memory store.")  

            ce_fields = {c.name for c in CE.__table__.columns}  
            ce_dict_filtered = {key: value for key, value in ce_dict.items() if key in ce_fields}  
            ce = CE(**ce_dict_filtered)  

        return ce  

    except ValueError as e:  
        logging.error(f"Error retrieving CE by ID {ce_id}: {e}")  
        raise e  
    except SQLAlchemyError as e:  
        logging.error(f"Database error retrieving CE by ID {ce_id}: {e}", exc_info=True)  
        raise e  
    except Exception as e:  
        logging.error(f"Unexpected error retrieving CE by ID {ce_id}: {e}", exc_info=True)  
        raise e  
    
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
        {"role": "system", "content": "Return a JSON object with the analyzed COS and CEs."},  
        {"role": "user", "content": prompt},  
    ]  

    try:  
        response_text = generate_chat_response_with_node_types(messages, role='COS Analysis', task='Analyze COS')  
        response_json = json.loads(response_text)  

        cos_text = response_json.get("COS", cos_content)  
        ces = response_json.get("CEs", [])  

        valid_ces = [  
            {'content': ce["text"], 'ce_type': ce["type"]}  
            for ce in ces if ce["type"] in get_valid_node_types()  
        ]  

        content_with_ce = replace_ce_tags_with_pills(cos_text, valid_ces)  

        return {  
            'content_with_ce': content_with_ce,  
            'ces': valid_ces  # Ensure 'ces' is always returned  
        }  

    except Exception as e:  
        logging.error(f"Exception occurred during COS analysis: {e}", exc_info=True)  
        return {  
            'content_with_ce': cos_content,  
            'ces': []  # Default to an empty list if there's an error  
        }  

  
def extract_conditional_elements(response_text, original_content):    
    ces = []    
    try:  
        # Use regex to extract CEs from response_text  
        matches = re.findall(r'<ce>(.*?)</ce>', response_text, re.IGNORECASE)  
        content_with_ce = original_content    
  
        for match in matches:    
            ce_content = html.escape(match.strip())  # Escape HTML special characters  
            ce_uuid = str(uuid.uuid4())    
            # Replace only the first occurrence of the matched CE content  
            content_with_ce = re.sub(rf'<ce>\s*{re.escape(match.strip())}\s*</ce>', f'<span class="ce-pill" data-ce-id="{ce_uuid}">{ce_content}</span>', content_with_ce, count=1)  
            ces.append({'id': ce_uuid, 'content': ce_content, 'ce_type': 'Unknown'})  
    
        return {'content_with_ce': content_with_ce, 'ces': ces}  
    except Exception as e:  
        # Handle any errors that occur during the extraction process  
        logging.error(f"Error extracting conditional elements: {e}", exc_info=True)  
        return {'content_with_ce': original_content, 'ces': []}  


def update_cos_by_id(cos_id, updated_data):  
    from app import db, USE_DATABASE  
    try:  
        # If using database, convert UUID to string for query  
        cos_id_str = str(cos_id) if isinstance(cos_id, UUID) else cos_id  
  
        # Update the COS entry with new data  
        if USE_DATABASE:  
            # Database operation  
            cos = session.query(COS).filter_by(id=cos_id).first()  
            if cos:  
                for key, value in updated_data.items():  
                    setattr(cos, key, value)  
                session.commit()  
                return {'success': True, 'cos': cos.to_dict()}  # Return the updated COS for client-side use  
            else:  
                return {'success': False, 'message': f"COS with ID {cos_id_str} not found."}  
        else:  
            # In-memory operation  
            cos = cos_store.get(cos_id_str)  # Attempt to retrieve the COS entry  
            if not cos:  
                # COS not found, log a warning  
                current_app.logger.warning(f"COS with ID {cos_id_str} not found in the in-memory store.")  
                return {'success': False, 'message': f"COS with ID {cos_id_str} not found."}  
  
            for key, value in updated_data.items():  
                cos[key] = value  
            cos_store[cos_id_str] = cos  # Store the updated COS back in the store  
  
            # Log the successful update and return the updated COS  
            current_app.logger.info(f"COS with ID {cos_id_str} successfully updated.")  
            return {'success': True, 'cos': cos}  # Return the updated COS for client-side use  
  
    except Exception as e:  
        # Log the error and return an error message  
        current_app.logger.error(f"Unexpected error during COS update: {e}", exc_info=True)  
        return {'success': False, 'message': f"Unexpected error occurred: {e}"}  


def delete_cos_by_id(cos_id, ssol_id=None):    
    from app import USE_DATABASE 
    if USE_DATABASE:    
        # Database operation    
        cos = session.query(COS).filter_by(id=cos_id).first()    
        if cos and (ssol_id is None or cos.ssol_id == ssol_id):    
            session.delete(cos)    
            session.commit()    
            return True  # COS was deleted successfully    
        else:    
            return False  # COS did not exist or did not match the provided SSOL_ID    
    else:    
        # In-memory operation    
        cos = cos_store.get(cos_id)    
        if cos and (ssol_id is None or cos['ssol_id'] == ssol_id):    
            del cos_store[cos_id]    
            return True  # COS was deleted successfully    
        return False  # COS did not exist or did not match the provided SSOL_ID 


# Function to analyze the COS content and extract the CE type(s)
def analyze_ce_type(request):
    try:
        ce_content = request.get_json()['ce_content']
        ce_type = None

        # Iterate through the ce_types in ce_nodes.py and check if it appears in the ce_content
        for ce_type, values in NODES.items():
            if ce_type in ce_content:
                break
        
        return jsonify(ce_type=ce_type)
    except Exception as e:
        return jsonify(error=str(e))

def get_ce_type(ce_content):  
    messages = [  
        {"role": "system", "content": "You are responsible for identifying the appropriate card type for the given conditional element."},  
        {"role": "user", "content": ce_content},  
    ]  
    response_text = generate_chat_response(messages, role='Conditional Element (CE) Node Type Identification', task='Identify CE Type', temperature=0.8)  
  
    try:  
        response_data = json.loads(response_text)  
        ce_type = response_data.get('type', '')  # Assuming the key for the CE type in the response is 'type'  
        return ce_type  
    except json.JSONDecodeError:  
        logging.error(f"Error parsing JSON response: {response_text}")  
        return ""  
    
# CRUD operations for SSOL  
def create_ssol(goal, summary):  
    from app import db, USE_DATABASE 
    if USE_DATABASE:  
        ssol = SSOL(goal=goal, summary=summary)  
        db.session.add(ssol)  
        db.session.commit()  
        return ssol.id  
    else:  
        ssol_id = str(uuid.uuid4())  
        ssol_store[ssol_id] = {'id': ssol_id, 'goal': goal, 'summary': summary}  
        return ssol_id 

def get_ssol_by_id(ssol_id):  
    from app import db, USE_DATABASE 
    if USE_DATABASE:  
        return SSOL.query.get(ssol_id)  
    else:  
        return ssol_store.get(ssol_id) 
  
def update_ssol_by_id(ssol_id, updated_data):  
    from app import db, USE_DATABASE 
    if USE_DATABASE:  
        ssol = session.query(SSOL).filter_by(id=ssol_id).first()  
        for key, value in updated_data.items():  
            setattr(ssol, key, value)  
        session.commit()  
    else:  
        ssol = ssol_store.get(ssol_id)  
        if ssol:  
            ssol.update(updated_data)  
  
def delete_ssol_by_id(ssol_id):  
    from app import db, USE_DATABASE 
    if USE_DATABASE:  
        ssol = session.query(SSOL).filter_by(id=ssol_id).first()  
        session.delete(ssol)  
        session.commit()  
    else:  
        ssol = ssol_store.pop(ssol_id, None)  
        return bool(ssol)  # Returns True if an SSOL was deleted, False otherwise 


def create_ce(content, node_type, cos_id):  
    ce_id = str(uuid.uuid4())  
    ce_data = {  
        'id': ce_id,  
        'content': content,  
        'node_type': node_type,  
        'cos_id': cos_id  
    }  

    if USE_DATABASE:  
        ce = CE(id=ce_id, content=content, node_type=node_type, cos_id=cos_id)  
        db.session.add(ce)  
        db.session.commit()  
        current_app.logger.debug(f"Created CE in database: {ce}")  
    else:  
        ce_store[ce_id] = ce_data  
        current_app.logger.debug(f"Created CE in in-memory store: {ce_store[ce_id]}")  

    return ce_id  



def update_ce_by_id(ce_id: UUID, ce_data):  
    if USE_DATABASE:  
        ce = CE.query.get(ce_id)  
        if ce:  
            for key, value in ce_data.items():  
                setattr(ce, key, value)  
            db.session.commit()  
            return True  
        else:  
            current_app.logger.error(f"CE with ID {ce_id} not found in database.")  
            return False  
    else:  
        ce_id_str = str(ce_id)  
        if ce_id_str in ce_store:  
            ce_store[ce_id_str].update(ce_data)  
            return True  
        else:  
            current_app.logger.error(f"CE with ID {ce_id_str} not found in in-memory store.")  
            return False  

  
def delete_ce_by_id(ce_id):  
    from app import db, USE_DATABASE 
    if USE_DATABASE:  
        ce = session.query(CE).filter_by(id=ce_id).first()  
        session.delete(ce)  
        session.commit()  
    else:  
        if ce_id in ce_store:  
            del ce_store[ce_id]  
            return True  # CE was deleted successfully  
        return False  # CE did not exist in the store  
  
# Function to generate the appropriate card based on the CE type  
def generate_card(ce_type, ce_id):  
    from app import db, USE_DATABASE 
    if ce_type in NODES:  
        node = NODES[ce_type]  
        # If using a database, render a template with data fetched from the database  
        if USE_DATABASE:  
            template = render_template(  
                node["flask_template"], ce_id=ce_id  
            )  
        else:  
            # If using the in-memory store, pass the CE data directly to the template  
            ce_data = ce_store.get(ce_id)  
            template = render_template(  
                node["flask_template"], ce=ce_data  
            )  
        return template  
    else:  
        return ""

  
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
        {"role": "system", "content": "Return a JSON object with the analyzed COS and CEs."},  
        {"role": "user", "content": prompt},  
    ]  
  
    try:  
        # Send messages to the AI and get the response  
        response_text = generate_chat_response_with_node_types(messages, role='COS Analysis', task='Analyze COS')  
        response_json = json.loads(response_text)  
  
        # Extract the COS and CEs from the response  
        cos_text = response_json.get("COS", cos_content)  
        ces = response_json.get("CEs", [])  
  
        valid_node_types = get_valid_node_types()  
  
        # Validate and process the CEs  
        valid_ces = []  
        for ce in ces:  
            if ce["type"] in valid_node_types:  
                new_ce = CE(content=ce["text"], node_type=ce["type"])  
                db.session.add(new_ce)  
                valid_ces.append(new_ce)  
  
        db.session.commit()  
  
        return {'COS': cos_text, 'CEs': [ce.to_dict() for ce in valid_ces]}  
  
    except Exception as e:  
        logging.error(f"Exception occurred during COS analysis: {e}", exc_info=True)  
        db.session.rollback()  
        return {'COS': cos_content, 'CEs': []}  

def get_badge_class_from_status(status):    
    return {    
        'Proposed': 'bg-info',    
        'In Progress': 'bg-warning text-dark',  # Added text-dark for better contrast  
        'Completed': 'bg-success',    
        'Rejected': 'bg-danger'    
    }.get(status, 'bg-secondary')  # Default to 'bg-secondary' if status is not found 
 
    # Ensure database or in-memory store is initialized based on USE_DATABASE flag  
def initialize_data_store():
    from app import USE_DATABASE, Base, _engine   
    Base.metadata.create_all(_engine) if USE_DATABASE else None  

def check_data_store_contents(data_store_type='in_memory'):  
    if data_store_type == 'in_memory':  
        try:  
            # Print contents of the in-memory store  
            for cos_id_str, cos_data in cos_store.items():  
                logging.info(f"COS ID: {cos_id_str}, Data: {cos_data}")  
        except NameError:  
            logging.warning("In-memory store 'cos_store' not found.")  
    elif data_store_type == 'database' and USE_DATABASE:  
        try:  
            # Query all entries in the COS table and print them  
            cos_entries = COS.query.all()  
            for entry in cos_entries:  
                logging.info(f"COS ID: {entry.id}, Data: {entry}")  
        except Exception as e:  
            logging.error(f"Database query failed with error: {e}")  
    else:  
        logging.error(f"Unknown data store type: {data_store_type}") 

        if __name__ == '__main__':  
            logging.info("Checking initial data store contents...")  
            check_data_store_contents('database' if USE_DATABASE else 'in_memory')  

def get_phase_index(cos):  
    # Determine the phase index based on the COS content or other criteria  
    phase_mapping = {  
        'Discovery': 0,  
        'Engagement': 1,  
        'Action': 2,  
        'Completion': 3,  
        'Legacy': 4,  
    }  
    # Example logic to determine the phase index  
    phase_name = cos.get('phase', 'SSPEC')  # Default to 'SSPEC Time Mapper' if phase not found  
    return phase_mapping.get(phase_name, 0)  # Default to 0 if phase not found in mapping  
