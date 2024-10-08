import os  
import uuid  
from dotenv import load_dotenv  
from flask_sqlalchemy import SQLAlchemy  
from sqlalchemy import create_engine, Column, Integer, String, Text, ForeignKey, Date  
from sqlalchemy.dialects.postgresql import UUID  
from sqlalchemy.ext.declarative import declarative_base  
from sqlalchemy.orm import scoped_session, sessionmaker, relationship  
  
load_dotenv()  
  
db = SQLAlchemy()  
Base = declarative_base()  
_engine = create_engine(os.environ.get('SQLALCHEMY_DATABASE_URI'), echo=True)  
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)  
session = scoped_session(SessionLocal)  
  
class SSOL(db.Model):  
    __tablename__ = 'ssol'  
    id = Column(Integer, primary_key=True)  
    title = Column(String(255), nullable=False)  
    description = Column(Text, nullable=True)  
    cos = relationship('COS', back_populates='ssol')  
  
    def to_dict(self):  
        return {  
            'id': self.id,  
            'title': self.title,  
            'description': self.description,  
            'cos': [cos.to_dict() for cos in self.cos]  
        }  
  
class COS(db.Model):  
    __tablename__ = 'cos'  
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)  
    content = Column(String, nullable=False)  
    status = Column(String(50), nullable=False)  
    accountable_party = Column(String(255), nullable=True)  
    completion_date = Column(Date, nullable=True)  
    ssol_id = Column(Integer, ForeignKey('ssol.id'), nullable=False)  
    ssol = relationship('SSOL', back_populates='cos')  
    conditional_elements = relationship('CE', back_populates='cos')    
  
    def to_dict(self):  
        return {  
            'id': str(self.id),  
            'content': self.content,  
            'status': self.status,  
            'accountable_party': self.accountable_party,  
            'completion_date': self.completion_date.isoformat() if self.completion_date else None,  
            'ssol_id': self.ssol_id,  
            'conditional_elements': [ce.to_dict() for ce in self.conditional_elements]  
        }  
  
class CE(db.Model):  
    __tablename__ = 'ce'  
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)  
    content = Column(String, nullable=False)  
    node_type = Column(String(50), nullable=True)  
    details = Column(Text, nullable=True)  
    cos_id = Column(UUID(as_uuid=True), ForeignKey('cos.id'), nullable=False)  # Add this line  
    cos = relationship('COS', back_populates='conditional_elements')  
  
    def to_dict(self):  
        return {  
            'id': str(self.id),  
            'content': self.content,  
            'node_type': self.node_type,  
            'details': self.details,  
            'cos_id': str(self.cos_id)  # Include the cos_id in the dictionary  
        } 
  
class COS_CE_Link(db.Model):  
    __tablename__ = 'cos_ce_link'  
    cos_id = Column(UUID(as_uuid=True), ForeignKey('cos.id'), primary_key=True)  
    ce_id = Column(UUID(as_uuid=True), ForeignKey('ce.id'), primary_key=True) 
      
Base.metadata.create_all(_engine)  
