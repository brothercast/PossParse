import os
import uuid
from dotenv import load_dotenv
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import create_engine, Column, Integer, String, Text, ForeignKey, Date, inspect
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import scoped_session, sessionmaker, relationship

load_dotenv()

db = SQLAlchemy()
Base = declarative_base()

#  --- Removed _engine, SessionLocal, session here ---

class SSOL(db.Model):
    __tablename__ = 'ssol'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)  # Use UUID for SSOL id
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    cos = relationship('COS', back_populates='ssol')

    def to_dict(self):
        return {
            'id': str(self.id),  # Return UUID as string
            'title': self.title,
            'description': self.description,
            'cos': [cos.to_dict() for cos in self.cos]
        }

class COS(db.Model):
    __tablename__ = 'cos'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content = Column(Text, nullable=False)  # Changed to Text for larger content
    status = Column(String(50), nullable=False)
    accountable_party = Column(String(255), nullable=True)
    completion_date = Column(Date, nullable=True)
    ssol_id = Column(UUID(as_uuid=True), ForeignKey('ssol.id'), nullable=False)  # Use UUID for ssol_id
    ssol = relationship('SSOL', back_populates='cos')
    conditional_elements = relationship('CE', back_populates='cos')

    def to_dict(self):
        return {
            'id': str(self.id),
            'content': self.content,
            'status': self.status,
            'accountable_party': self.accountable_party,
            'completion_date': self.completion_date.isoformat() if self.completion_date else None,
            'ssol_id': str(self.ssol_id),  # Return UUID as string
            'conditional_elements': [ce.to_dict() for ce in self.conditional_elements]
        }

class CE(db.Model):
    __tablename__ = 'ce'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content = Column(Text, nullable=False)   # Changed to Text for larger content
    node_type = Column(String(50), nullable=True)
    details = Column(Text, nullable=True)  # Keep this as Text (for Tabulator)
    cos_id = Column(UUID(as_uuid=True), ForeignKey('cos.id'), nullable=False)
    cos = relationship('COS', back_populates='conditional_elements')

    def to_dict(self):
        return {
            'id': str(self.id),
            'content': self.content,
            'node_type': self.node_type,
            'details': self.details,
            'cos_id': str(self.cos_id)
        }

# --- Removed COS_CE_Link --- (It's redundant with the relationship)

# --- Moved engine and session creation to a function ---
def get_engine_and_session():
    engine = create_engine(os.environ.get('SQLALCHEMY_DATABASE_URI'), echo=True)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = scoped_session(SessionLocal)
    return engine, session

# --- Removed Base.metadata.create_all(_engine) --- Use Flask-Migrate
# In app.py (or wherever you initialize your app):
# from flask_migrate import Migrate
# migrate = Migrate(app, db) #  after db.init_app(app)

# Example of conditional table creation (ONLY if not using Flask-Migrate)
def create_tables_if_not_exist(engine):
     if not inspect(engine).has_table("ssol"):
          Base.metadata.create_all(engine)