import re
import os
import json
from sqlalchemy import Column, Integer, String, Date, ForeignKey, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from ce_nodes import NODES
from flask import render_template, jsonify
from utilities import generate_chat_response

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


# Helper function to extract conditional elements from GPT-3.5's response
def extract_conditional_elements(response):
    try:
        response_json = json.loads(response)
        conditional_elements = response_json.get("conditional_elements", [])
        return conditional_elements
    except json.JSONDecodeError as e:
        print(f"Error in extracting conditional elements: {e}")
        return []


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
    ssol = SSOL(goal=goal, summary=summary)
    session.add(ssol)
    session.commit()
    return ssol.id


def get_ssol_by_id(ssol_id):
    ssol = session.query(SSOL).filter_by(id=ssol_id).first()
    return ssol


def update_ssol_by_id(ssol_id, updated_data):
    ssol = session.query(SSOL).filter_by(id=ssol_id).first()
    for key, value in updated_data.items():
        setattr(ssol, key, value)
    session.commit()


def delete_ssol_by_id(ssol_id):
    ssol = session.query(SSOL).filter_by(id=ssol_id).first()
    session.delete(ssol)
    session.commit()


# CRUD operations for COS
def create_cos(ssol_id, content, status, accountable_party, completion_date):
    cos = COS(
        content=content,
        status=status,
        accountable_party=accountable_party,
        completion_date=completion_date,
        ssol_id=ssol_id,
    )
    session.add(cos)
    session.commit()
    return cos.id


def get_cos_by_id(cos_id):
    cos = session.query(COS).filter_by(id=cos_id).first()
    return cos


def update_cos_by_id(cos_id, updated_data):
    cos = session.query(COS).filter_by(id=cos_id).first()
    for key, value in updated_data.items():
        setattr(cos, key, value)
    session.commit()


def delete_cos_by_id(cos_id):
    cos = session.query(COS).filter_by(id=cos_id).first()
    session.delete(cos)
    session.commit()


# CRUD operations for CE
def create_ce(cos_id, content, status, accountable_party, completion_date):
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


def get_ce_by_id(ce_id):
    ce = session.query(CE).filter_by(id=ce_id).first()
    return ce


def update_ce_by_id(ce_id, updated_data):
    ce = session.query(CE).filter_by(id=ce_id).first()
    for key, value in updated_data.items():
        setattr(ce, key, value)
    session.commit()


def delete_ce_by_id(ce_id):
    ce = session.query(CE).filter_by(id=ce_id).first()
    session.delete(ce)
    session.commit()


# Function to generate the appropriate card based on the CE type
def generate_card(ce_type, ce_id):
    if ce_type in NODES:
        node = NODES[ce_type]
        template = render_template(
            node["flask_template"], ce_id=ce_id
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
    if status == "In Progress":
        return "badge-warning"
    elif status == "Completed":
        return "badge-success"
    elif status == "Rejected":
        return "badge-danger"
    elif status == "Proposed":
        return "badge-primary"
    else:
        return "badge-info"