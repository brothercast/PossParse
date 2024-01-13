import uuid  
from app import db
from datetime import datetime
from sqlalchemy.dialects.postgresql import UUID

class SSOL(db.Model):
    __tablename__ = 'ssol'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship to COS
    cos = db.relationship('COS', back_populates='ssol', cascade="all, delete-orphan")

class COS(db.Model):  
    __tablename__ = 'cos'  
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)    
    content = db.Column(db.String, nullable=False)  
    status = db.Column(db.String(50), nullable=False)  
    accountable_party = db.Column(db.String(255), nullable=True)  
    completion_date = db.Column(db.Date, nullable=True)  
      
    # Foreign key linking back to SSOL  
    ssol_id = db.Column(db.Integer, db.ForeignKey('ssol.id'), nullable=False)  
    ssol = db.relationship('SSOL', back_populates='cos')  
      
    # Relationship to CE  
    conditional_elements = db.relationship('CE', back_populates='cos', cascade="all, delete-orphan")  
  
    def to_dict(self):  
        return {  
            'id': str(self.id),  # UUID to string for JSON serialization  
            'content': self.content,  
            'status': self.status,  
            'accountable_party': self.accountable_party or '',  # or an empty string if None  
            'completion_date': self.completion_date.strftime('%Y-%m-%d') if self.completion_date else '',  # or an empty string if None  
            'ssol_id': self.ssol_id  
            # 'conditional_elements': [ce.to_dict() for ce in self.conditional_elements]  # Uncomment if you need to serialize CE as well  
        }  

class CE(db.Model):
    __tablename__ = 'ce'
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.String, nullable=False)
    condition_type = db.Column(db.String(50), nullable=True)
    is_satisfied = db.Column(db.Boolean, default=False)
    
    # Foreign key linking back to COS
    cos_id = db.Column(db.Integer, db.ForeignKey('cos.id'), nullable=False)
    cos = db.relationship('COS', back_populates='conditional_elements')
