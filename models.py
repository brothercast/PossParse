import os
from dotenv import load_dotenv
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import create_engine   
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import scoped_session, sessionmaker  
import uuid  

load_dotenv()  
  
db = SQLAlchemy()  
# Create the base class for declarative class definitions  
Base = declarative_base() 
  
# Create the engine, typically bound to a specific database URL  
_engine = create_engine(os.environ.get('SQLALCHEMY_DATABASE_URI'), echo=True)  

# Create a configured "Session" class  
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)  
  
# Create a scoped session to ensure unique sessions for each thread  
session = scoped_session(SessionLocal)  
  
class SSOL(db.Model):  
    __tablename__ = 'ssol'  
    id = db.Column(db.Integer, primary_key=True)  
    title = db.Column(db.String(255), nullable=False)  
    description = db.Column(db.Text, nullable=True)  
    cos = db.relationship('COS', back_populates='ssol')  
  
class COS(db.Model):  
    __tablename__ = 'cos'  
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)  
    content = db.Column(db.String, nullable=False)  
    status = db.Column(db.String(50), nullable=False)  
    accountable_party = db.Column(db.String(255), nullable=True)  
    completion_date = db.Column(db.Date, nullable=True)  
    ssol_id = db.Column(db.Integer, db.ForeignKey('ssol.id'), nullable=False)  
    ssol = db.relationship('SSOL', back_populates='cos')  
    conditional_elements = db.relationship('CE', secondary='cos_ce_link', backref='cos')  
  
class CE(db.Model):  
    __tablename__ = 'ce'  
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)  
    content = db.Column(db.String, nullable=False)  
    node_type = db.Column(db.String(50), nullable=True)  
    details = db.Column(db.Text, nullable=True)  
    cos = db.relationship(  
        'COS', secondary='cos_ce_link', back_populates='conditional_elements'  
    )  
  
class COS_CE_Link(db.Model):  
    __tablename__ = 'cos_ce_link'  
    cos_id = db.Column(UUID(as_uuid=True), db.ForeignKey('cos.id'), primary_key=True)  
    ce_id = db.Column(UUID(as_uuid=True), db.ForeignKey('ce.id'), primary_key=True)  
