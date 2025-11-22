# models.py
import os
import json
import uuid
from datetime import date
from dotenv import load_dotenv
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import (create_engine, Column, String, ForeignKey, inspect, 
                        TEXT, TypeDecorator, Text, Date, Integer, Float)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import scoped_session, sessionmaker, relationship
from sqlalchemy.ext.declarative import declarative_base

load_dotenv()
db = SQLAlchemy()
Base = declarative_base()

# A generic JSON type for compatibility with different database backends (e.g., SQLite)
class JsonEncodedDict(TypeDecorator):
    """Enables JSON storage by encoding and decoding on the fly."""
    impl = TEXT

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return json.dumps(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return json.loads(value)

# Use the efficient native JSONB type if on PostgreSQL, otherwise use our text-based fallback.
JsonType = JSONB if 'postgresql' in os.environ.get('SQLALCHEMY_DATABASE_URI', '') else JsonEncodedDict


class SSOL(db.Model):
    __tablename__ = 'ssol'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # --- CORE IDENTITY ---
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # --- SCOPE & CONSTRAINTS (The MVP Project Container) ---
    domain = Column(String(100), nullable=True)     # Context for AI (e.g. "Bio-Tech")
    status = Column(String(50), default='Draft')    # Lifecycle (Draft, Active, Paused, Complete)
    owner = Column(String(255), nullable=True)      # The human champion
    target_date = Column(Date, nullable=True)       # The horizon/deadline
    
    # --- METRICS ---
    integrity_score = Column(Integer, default=100)  # 0-100 Health Metric
    completion_percentage = Column(Integer, default=0) # Derived from COS completion
    
    # --- RELATIONSHIPS ---
    cos = relationship('COS', back_populates='ssol', cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': str(self.id),
            'title': self.title,
            'description': self.description,
            'domain': self.domain,
            'status': self.status,
            'owner': self.owner,
            'target_date': self.target_date.isoformat() if self.target_date else None,
            'integrity_score': self.integrity_score,
            'completion_percentage': self.completion_percentage,
            'cos': [c.to_dict() for c in self.cos]
        }

class COS(db.Model):
    __tablename__ = 'cos'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content = Column(Text, nullable=False)
    
    # --- STATUS TRACKING ---
    status = Column(String(50), nullable=False, default='Proposed') # Proposed, Active, Complete, Verified
    
    accountable_party = Column(String(255), nullable=True)
    completion_date = Column(Date, nullable=True)
    
    ssol_id = Column(UUID(as_uuid=True), ForeignKey('ssol.id'), nullable=False)
    ssol = relationship('SSOL', back_populates='cos')
    conditional_elements = relationship('CE', back_populates='cos', cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': str(self.id),
            'content': self.content,
            'status': self.status,
            'accountable_party': self.accountable_party,
            'completion_date': self.completion_date.isoformat() if self.completion_date else None,
            'ssol_id': str(self.ssol_id),
            'conditional_elements': [ce.to_dict() for ce in self.conditional_elements]
        }

class CE(db.Model):
    __tablename__ = 'ce'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    node_type = Column(String(50), nullable=False, default='Default')
    
    cos_id = Column(UUID(as_uuid=True), ForeignKey('cos.id'), nullable=False)
    cos = relationship('COS', back_populates='conditional_elements')

    # --- THE STRATEGIC PAYLOAD ---
    # Stores the complete state of the Speculation Environment.
    # Initializing with all keys ensures the "Fresh Node" check in JS works reliably.
    data = Column(JsonType, nullable=False, default=lambda: {
        "details_data": {}, 
        "prerequisites": [],
        "stakeholders": [], 
        "assumptions": [],
        "resources": [],
        "connections": []
    })

    def to_dict(self):
        return {
            'id': str(self.id),
            'node_type': self.node_type,
            'cos_id': str(self.cos_id),
            'data': self.data 
        }


def get_engine_and_session():
    engine = create_engine(os.environ.get('SQLALCHEMY_DATABASE_URI'))
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = scoped_session(SessionLocal)
    return engine, session


def create_tables_if_not_exist(engine):
     if not inspect(engine).has_table("ssol"):
          Base.metadata.create_all(engine)