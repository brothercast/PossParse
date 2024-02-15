import re
import os
import json
import uuid
import logging
from app import db
from uuid import UUID
from ce_nodes import NODES
from sqlalchemy.exc import SQLAlchemyError
from utilities import generate_chat_response
from sqlalchemy.orm import relationship, sessionmaker
from flask import render_template, jsonify, current_app
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, String, Date, ForeignKey, create_engine

# In-memory data stores  
ssol_store = {}  
cos_store = {}  
ce_store = {}  

# Flag to toggle database usage  
USE_DATABASE = False  # Set to True when you want to use the database  
Base = declarative_base()

# Database Configuration
db_uri = os.environ.get("SQLALCHEMY_DATABASE_URI")
_engine = create_engine(db_uri)
Session = sessionmaker(bind=_engine)
session = Session()

class SSOL(Base):
    __tablename__ = "ssol"

    id = Column(Integer, primary_key=True)
    goal = Column(String)
    summary = Column(String)

    cos = relationship("COS", back_populates="ssol")

class COS(Base):
    __tablename__ = "cos"

    id = Column(Integer, primary_key=True)
    content = Column(String)
    status = Column(String)
    accountable_party = Column(String)
    completion_date = Column(Date)

    ssol_id = Column(Integer, ForeignKey("ssol.id"))  
    ssol = relationship("SSOL", back_populates="cos")  
    conditional_elements = relationship("CE", back_populates="cos")  

class CE(Base):
    __tablename__ = "ce"

    id = Column(Integer, primary_key=True)
    content = Column(String)
    status = Column(String)
    accountable_party = Column(String)
    completion_date = Column(Date)

    cos_id = Column(Integer, ForeignKey("cos.id"))
    cos = relationship("COS", back_populates="conditional_elements")

def create_cos(ssol_id, content, status, accountable_party=None, completion_date=None):  
    cos_id = str(uuid.uuid4())  
    new_cos = {  
        'id': cos_id,  
        'ssol_id': ssol_id,  
        'content': content,  
        'status': status,  
        'accountable_party': accountable_party,  
        'completion_date': completion_date  
    }  
    cos_store[cos_id] = new_cos  
    current_app.logger.info(f"COS created with ID {cos_id} and stored in memory.")  
    return cos_id  

def get_cos_by_id(cos_id):  
    if USE_DATABASE:  
        # Database operation  
        return session.query(COS).filter_by(id=cos_id).first()  
    else:  
        # In-memory operation  
        return cos_store.get(cos_id)  

# Function to analyze COS and identify potential conditional elements
def analyze_cos(cos_content):
    prompt = f"Given a condition of satisfaction '{cos_content}', identify potential conditional elements that can be further expanded upon. Each conditional element should be formatted as a dictionary with the 'content' key representing the element's content. The available node types are as follows: {', '.join(NODES.keys())}."
    messages = [
        {"role": "system", "content": "You are responsible for analyzing a condition of satisfaction (COS) and identifying potential conditional elements."},
        {"role": "user", "content": prompt},
    ]
    response_text = generate_chat_response(messages, role='COS Analysis', task='Analyze COS', temperature=0.6)

    # Extract CE information from GPT-3.5 Turbo response
    ce_list = extract_conditional_elements(response_text)
    parsed_ce_list = []

    # Parse and format each CE entry
    for ce_entry in ce_list:
        ce_content = ce_entry.strip().capitalize()
        ce_type = get_ce_type(ce_content)
        parsed_ce_list.append({"content": ce_content, "ce_type": ce_type})

    return parsed_ce_list

def update_cos_by_id(cos_id, updated_data):    
    try:  
        if USE_DATABASE:  
            # Convert string cos_id to UUID object for database operations  
            cos_id = UUID(cos_id)  
            # Retrieve the COS entry from the database  
            cos = db.session.query(COS).filter_by(id=cos_id).first()  
            if not cos:  
                return False  # COS not found in the database  
            # Update the COS entry with the new data  
            for key, value in updated_data.items():  
                setattr(cos, key, value)  
            # Commit changes to the database  
            db.session.commit()  
        else:  
            # Ensure cos_id is a string for in-memory store operations  
            cos_id = str(cos_id)  
            # Retrieve the COS entry from the in-memory store  
            cos = cos_store.get(cos_id)  
            if not cos:  
                return False  # COS not found in the in-memory store  
            # Update the COS entry with the new data  
            cos.update(updated_data)  
            cos_store[cos_id] = cos  # Save the updated COS back to the store  
  
        return True  # Update was successful  
  
    except SQLAlchemyError as e:  
        # Handle database-related errors  
        current_app.logger.error(f"Database error during COS update: {e}")  
        db.session.rollback()  
        return False  
    except Exception as e:  
        # Handle any other exceptions that may occur  
        current_app.logger.error(f"Unexpected error during COS update: {e}")  
        return False

def delete_cos_by_id(cos_id, ssol_id=None):    
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

# Helper function to extract conditional elements from GPT-3.5's response
def extract_conditional_elements(response):
    try:
        response_json = json.loads(response)
        conditional_elements = response_json.get("conditional_elements", [])
        return conditional_elements
    except json.JSONDecodeError as e:
        print(f"Error in extracting conditional elements: {e}")
        return []

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
    response_text = generate_chat_response(messages, role='Conditional Element (CE) Node Type Identification', task='Identify CE Type', temperature=0.6)

    ce_type_match = re.search(r'\[CE\] (.*?)$', response_text)
    if ce_type_match:
        ce_type = ce_type_match.group(1).strip()
        return ce_type
    else:
        return ""
    
# CRUD operations for SSOL
def create_ssol(goal, summary):  
    global ssol_store  
    if USE_DATABASE:
        ssol = SSOL(goal=goal, summary=summary)
        session.add(ssol)
        session.commit()
        return ssol.id
    else:  
        ssol_id = len(ssol_store) + 1  
        ssol_store[ssol_id] = {'id': ssol_id, 'goal': goal, 'summary': summary}  
        return ssol_id

def get_ssol_by_id(ssol_id):  
    if USE_DATABASE:  
        return session.query(SSOL).filter_by(id=ssol_id).first()  
    else:  
        return ssol_store.get(ssol_id)  
  
def update_ssol_by_id(ssol_id, updated_data):  
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
    if USE_DATABASE:  
        ssol = session.query(SSOL).filter_by(id=ssol_id).first()  
        session.delete(ssol)  
        session.commit()  
    else:  
        ssol = ssol_store.pop(ssol_id, None)  
        return bool(ssol)  # Returns True if an SSOL was deleted, False otherwise 


def create_ce(cos_id, content, status, accountable_party, completion_date):  
    if USE_DATABASE:  
        ce = CE(  
            content=content,  
            status=status,  
            accountable_party=accountable_party,  
            completion_date=completion_date,  
            cos_id=cos_id,  
        )  
        session.add(ce)  
        session.commit()  
        return ce.id  
    else:  
        ce_id = str(uuid.uuid4())  # Generate a unique UUID for the CE  
        ce_store[ce_id] = {  
            'id': ce_id,  
            'content': content,  
            'status': status,  
            'accountable_party': accountable_party,  
            'completion_date': completion_date,  
            'cos_id': cos_id  
        }  
        return ce_id  
  
def get_ce_by_id(ce_id):  
    if USE_DATABASE:  
        ce = session.query(CE).filter_by(id=ce_id).first()  
        return ce  
    else:  
        return ce_store.get(ce_id)  
  
def update_ce_by_id(ce_id, updated_data):  
    if USE_DATABASE:  
        ce = session.query(CE).filter_by(id=ce_id).first()  
        for key, value in updated_data.items():  
            setattr(ce, key, value)  
        session.commit()  
    else:  
        ce = ce_store.get(ce_id)  
        if ce:  
            ce.update(updated_data)  
  
def delete_ce_by_id(ce_id):  
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
    messages = [
        {"role": "system", "content": "You are responsible for analyzing a condition of satisfaction (COS) and identifying potential conditional elements."},
        {"role": "user", "content": f"Given a condition of satisfaction '{cos_content}', identify potential conditional elements that can be further expanded upon. Each conditional element should be formatted as a dictionary with the 'content' key representing the element's content."},
    ]
    response_text = generate_chat_response(
        messages, role='user', task='COS analysis and labeling', temperature=0.6
    )

    # Extract CE information from GPT-3.5 Turbo response
    ce_list = extract_conditional_elements(response_text)
    parsed_ce_list = []

    # Parse and format each CE entry
    for ce_entry in ce_list:
        ce_content = ce_entry.strip().capitalize()
        parsed_ce_list.append({"content": ce_content})

    return parsed_ce_list

def get_badge_class_from_status(status):    
    return {    
        'Proposed': 'bg-secondary',    
        'In Progress': 'bg-warning text-dark',  # Added text-dark for better contrast  
        'Completed': 'bg-success',    
        'Rejected': 'bg-danger'    
    }.get(status, 'bg-secondary')  # Default to 'bg-secondary' if status is not found 
 
    # Ensure database or in-memory store is initialized based on USE_DATABASE flag  
def initialize_data_store():  
    Base.metadata.create_all(_engine) if USE_DATABASE else None  