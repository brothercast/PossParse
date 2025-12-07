# speculate.py
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
from ai_service import generate_chat_response_with_node_types
from datetime import date, timedelta

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- Helper function to render a CE pill ---
def _render_ce_pill_html(ce_id: str, ce_type: str, ce_text: str) -> str:
    """
    Generates the Horizon-Style CE Capsule HTML.
    Handles case-insensitive lookup and fallbacks.
    """
    # 1. Case-insensitive lookup
    # Create a mapping of lower_case -> RealKey
    key_map = {k.lower(): k for k in NODES.keys()}
    clean_type = ce_type.strip()
    real_key = key_map.get(clean_type.lower(), 'Default')
    
    node_info = NODES.get(real_key)
    node_color = node_info.get('color', '#6c757d')
    node_icon = node_info.get('icon', 'fa-solid fa-cube')
    
    # 2. Fallback Color Generator (for hallucinations like "Market Need")
    # If it's truly unknown, give it a distinct color instead of gray
    if real_key == 'Default' and clean_type.lower() != 'default':
        # Hash the string to get a consistent color
        hash_val = sum(ord(c) for c in clean_type)
        colors = ['#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#009688', '#ff5722']
        node_color = colors[hash_val % len(colors)]
        node_icon = 'fa-solid fa-tag'
    else:
        node_color = node_info.get('color', '#6c757d')
        node_icon = node_info.get('icon', 'fa-solid fa-cube')
    
    return (
        f'<span class="ce-capsule" data-ce-id="{ce_id}" data-ce-type="{ce_type}" '
        f'style="background-color: {node_color};">'
        f'<i class="{node_icon} me-1"></i>{html.escape(ce_text)}'
        f'</span>'
    )
# --- AI Analysis ---

async def analyze_cos(cos_content: str, cos_id: str = None) -> dict:
    """
    Analyzes COS content to identify CEs. Returns structured JSON for creation/updating.
    """
    node_types_str = ', '.join(get_valid_node_types())
    prompt = (
        f"Analyze the following Condition of Satisfaction (COS) text: '{cos_content}'. "
        "Identify ALL distinct Conditional Elements (CEs) within this text. "
        f"Valid NodeTypes: {node_types_str}. "
        "Return JSON with keys 'analyzed_cos_text' (original text with <ce type='Type'>Title</ce> tags) "
        "and 'identified_ces' (array of {text, type})."
    )
    messages = [{"role": "user", "content": prompt}]
    try:
        response_text = await generate_chat_response_with_node_types(messages, role='COS Analysis', task='Analyze COS')
        # Parse logic
        match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", response_text, re.DOTALL)
        clean_text = match.group(1).strip() if match else response_text.strip()
        
        response_json = json.loads(clean_text)
        return {
            'content_with_tags': response_json.get("analyzed_cos_text", cos_content),
            'identified_ces': response_json.get("identified_ces", [])
        }
    except Exception as e:
        current_app.logger.error(f"Error in analyze_cos: {e}", exc_info=True)
        # Fallback: return original text, no CEs detected
        return {'content_with_tags': html.escape(cos_content), 'identified_ces': []}

# --- SSOL Operations ---

def create_ssol(USE_DATABASE: bool, title: str, description: str, domain: str = None) -> str:
    from models import SSOL, get_engine_and_session
    from store import ssol_store
    from app import app

    # MVP Rule: Set a default "Horizon" of 1 year from creation
    default_target_date = date.today() + timedelta(days=365)

    if USE_DATABASE:
        with app.app_context():
            engine, session = get_engine_and_session()
            new_ssol_uuid = uuid.uuid4()
            
            ssol = SSOL(
                id=new_ssol_uuid, 
                title=title, 
                description=description,
                domain=domain,
                status='Active', 
                target_date=default_target_date,
                integrity_score=100,
                completion_percentage=0
            )
            
            session.add(ssol)
            session.commit()
            ssol_id_to_return = str(new_ssol_uuid)
            session.close()
            return ssol_id_to_return
    else:
        ssol_id = str(uuid.uuid4())
        ssol_store[ssol_id] = {
            'id': ssol_id, 
            'title': title, 
            'description': description, 
            'domain': domain,
            'status': 'Active',
            'target_date': default_target_date.isoformat(),
            'integrity_score': 100,
            'completion_percentage': 0,
            'phases': {}
        }
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
    return ssol_store.get(str(ssol_id))

# --- COS Operations ---

async def create_cos(USE_DATABASE: bool, ssol_id: UUID, content: str, status: str, accountable_party: str = None, completion_date=None) -> dict:
    """
    Creates a COS and returns the FULL DATA DICTIONARY immediately.
    This avoids Read-After-Write race conditions.
    """
    from models import COS, CE, get_engine_and_session
    from store import ce_store, cos_store
    from app import app

    new_cos_uuid = uuid.uuid4()
    cos_id_str = str(new_cos_uuid)

    if isinstance(content, dict):
        content = content.get('text') or content.get('content') or json.dumps(content)
    elif not isinstance(content, str):
        content = str(content)

    try:
        # 1. Parse & Pill Logic
        soup = BeautifulSoup(content, 'html.parser')
        ce_tags = soup.find_all('ce')
        new_ce_instances = []
        
        for tag in ce_tags:
            ce_text = tag.string
            ce_type = tag.get('type', 'Default')
            if not ce_text: continue

            new_ce_uuid = uuid.uuid4()
            ce_record = {
                'id': new_ce_uuid,
                'node_type': ce_type,
                'cos_id': new_cos_uuid,
                'data': {"details_data": {}, "prerequisites": [], "stakeholders": [], "assumptions": [], "resources": [], "connections": []}
            }
            new_ce_instances.append(ce_record)
            
            # Replace with Horizon HTML
            # We use a simplified helper here or ensure _render_ce_pill_html is available
            from speculate import _render_ce_pill_html 
            pill_html = _render_ce_pill_html(str(new_ce_uuid), ce_type, ce_text)
            tag.replace_with(BeautifulSoup(pill_html, 'html.parser'))

        content_with_pills = str(soup)

        # 2. Persist & Return Data
        if USE_DATABASE:
            with app.app_context():
                engine, session = get_engine_and_session()
                cos_instance = COS(
                    id=new_cos_uuid, 
                    content=content_with_pills, 
                    status=status, 
                    ssol_id=ssol_id,
                    accountable_party=accountable_party, 
                    completion_date=completion_date
                )
                session.add(cos_instance)
                
                for ce_rec in new_ce_instances:
                    ce_instance = CE(
                        id=ce_rec['id'], 
                        node_type=ce_rec['node_type'], 
                        cos_id=new_cos_uuid, 
                        data=ce_rec['data']
                    )
                    session.add(ce_instance)
                
                session.commit()
                
                # CRITICAL FIX: Serialize inside the session
                final_data = cos_instance.to_dict()
                session.close()
                return final_data
        else:
            # In-memory store fallback
            result = {
                'id': cos_id_str, 
                'content': content_with_pills, 
                'status': status, 
                'ssol_id': str(ssol_id),
                'accountable_party': accountable_party,
                'completion_date': completion_date
            }
            cos_store[cos_id_str] = result
            for ce_rec in new_ce_instances:
                ce_store[str(ce_rec['id'])] = ce_rec
            return result

    except Exception as e:
        current_app.logger.error(f"Error creating COS: {e}", exc_info=True)
        raise
    
async def update_cos_by_id(USE_DATABASE: bool, cos_id: UUID, updated_data: dict) -> dict:
    from models import COS, CE, get_engine_and_session
    from app import app

    new_content = updated_data.get('content')
    
    try:
        new_ce_instances = []
        
        if new_content is not None:
            if isinstance(new_content, dict): new_content = json.dumps(new_content)
            elif not isinstance(new_content, str): new_content = str(new_content)
                    
            analysis = await analyze_cos(new_content, str(cos_id))
            soup = BeautifulSoup(analysis['content_with_tags'], 'html.parser')
            ce_tags = soup.find_all('ce')
            
            for tag in ce_tags:
                c_txt, c_type = tag.string, tag.get('type')
                new_id = uuid.uuid4()
                new_ce_instances.append({
                    'id': new_id, 'node_type': c_type, 
                    'data': {"details_data": {}, "resources": [], "prerequisites": [], "stakeholders": [], "assumptions": [], "connections": []}
                })
                # REPLACE WITH HORIZON CAPSULE HTML
                pill = _render_ce_pill_html(str(new_id), c_type, c_txt)
                tag.replace_with(BeautifulSoup(pill, 'html.parser'))
            
            updated_data['content'] = str(soup)

        if USE_DATABASE:
            with app.app_context():
                engine, session = get_engine_and_session()
                cos = session.query(COS).get(cos_id)
                if not cos: 
                    session.close()
                    return {'success': False, 'message': 'COS not found', 'status_code': 404}
                
                for k, v in updated_data.items():
                    if hasattr(cos, k) and k not in ['id', 'ssol_id']: 
                        setattr(cos, k, v)
                
                if new_content is not None:
                    session.query(CE).filter_by(cos_id=cos_id).delete()
                    for nc in new_ce_instances:
                        session.add(CE(id=nc['id'], node_type=nc['node_type'], cos_id=cos_id, data=nc['data']))
                
                session.commit()
                cos_dict = cos.to_dict()
                session.close()
                return {'success': True, 'cos': cos_dict, 'status_code': 200}
        
        return {'success': False, 'message': 'DB Required', 'status_code': 500}

    except Exception as e:
        current_app.logger.error(f"Error updating COS {cos_id}: {e}", exc_info=True)
        return {'success': False, 'message': str(e), 'status_code': 500}


def get_cos_by_id(USE_DATABASE: bool, cos_id: UUID):
    from models import COS, get_engine_and_session
    from store import cos_store
    from app import app
    if USE_DATABASE:
        with app.app_context():
            engine, session = get_engine_and_session()
            cos = session.query(COS).get(cos_id)
            res = cos.to_dict() if cos else None
            session.close()
            return res
    return cos_store.get(str(cos_id))

def delete_cos_by_id(USE_DATABASE: bool, cos_id: UUID) -> bool:
    from models import COS, CE, get_engine_and_session
    from app import app
    if USE_DATABASE:
        with app.app_context():
            engine, session = get_engine_and_session()
            session.query(CE).filter_by(cos_id=cos_id).delete()
            cos = session.query(COS).get(cos_id)
            if cos:
                session.delete(cos)
                session.commit()
                session.close()
                return True
            session.close()
            return False
    return False

# --- CE Operations ---

def get_ce_by_id(USE_DATABASE: bool, ce_id_param):
    from models import CE, get_engine_and_session
    from store import ce_store
    from app import app
    
    ce_id_uuid = ce_id_param if isinstance(ce_id_param, UUID) else UUID(str(ce_id_param))
    
    if USE_DATABASE:
        with app.app_context():
            engine, session = get_engine_and_session()
            ce = session.query(CE).get(ce_id_uuid)
            result = ce.to_dict() if ce else None
            session.close()
            return result
    return ce_store.get(str(ce_id_uuid))

def update_ce_by_id(USE_DATABASE: bool, ce_id: UUID, ce_data: dict) -> bool:
    from models import CE, get_engine_and_session
    from app import app
    if USE_DATABASE:
        with app.app_context():
            engine, session = get_engine_and_session()
            ce = session.query(CE).get(ce_id)
            if ce:
                ce.data = ce_data
                session.commit()
                session.close()
                return True
            session.close()
            return False
    return False

def create_ce(USE_DATABASE: bool, node_type: str, cos_id: UUID, data: dict) -> str:
    from models import CE, get_engine_and_session
    from app import app
    new_id = uuid.uuid4()
    if USE_DATABASE:
        with app.app_context():
            engine, session = get_engine_and_session()
            session.add(CE(id=new_id, node_type=node_type, cos_id=cos_id, data=data))
            session.commit()
            session.close()
    return str(new_id)

def delete_ce_by_id(USE_DATABASE: bool, ce_id: UUID) -> bool:
    from models import CE, get_engine_and_session
    from app import app
    if USE_DATABASE:
        with app.app_context():
            engine, session = get_engine_and_session()
            session.query(CE).filter_by(id=ce_id).delete()
            session.commit()
            session.close()
            return True
    return False