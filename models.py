# models.py
import os
import json
import uuid
from dotenv import load_dotenv
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import (create_engine, Column, String, ForeignKey, inspect, 
                        TEXT, TypeDecorator, Text, Date) # FIX: Added Text and Date to imports
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
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    cos = relationship('COS', back_populates='ssol', cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': str(self.id),
            'title': self.title,
            'description': self.description,
            'cos': [c.to_dict() for c in self.cos]
        }

class COS(db.Model):
    __tablename__ = 'cos'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content = Column(Text, nullable=False)
    status = Column(String(50), nullable=False, default='Proposed')
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

    # --- THE CORE REFACTOR ---
    # All flexible data is now stored in a single, extensible JSON field.
    # The old 'content' and 'details' columns are removed.
    # The default ensures new CEs start with the correct empty structure, preventing errors.
    data = Column(JsonType, nullable=False, default=lambda: {"details_data": {}, "resources": []})

    def to_dict(self):
        # The to_dict method now simply returns the stored data along with the ID info.
        return {
            'id': str(self.id),
            'node_type': self.node_type,
            'cos_id': str(self.cos_id),
            'data': self.data  # This will contain 'details_data' and 'resources'
        }


def get_engine_and_session():
    engine = create_engine(os.environ.get('SQLALCHEMY_DATABASE_URI'))
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = scoped_session(SessionLocal)
    return engine, session


def create_tables_if_not_exist(engine):
     if not inspect(engine).has_table("ssol"):
          Base.metadata.create_all(engine)