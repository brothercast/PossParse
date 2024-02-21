import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Set the secret key and database URI from the environment variables
app.secret_key = os.environ.get('SECRET_KEY', 'your_secret_key')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('SQLALCHEMY_DATABASE_URI')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False  # Optionally to suppress warning
app.config['SQLALCHEMY_ECHO'] = True

# In-memory data stores  
ssol_store = {}  
cos_store = {}  
ce_store = {}  

# Initialize SQLAlchemy with the Flask app
db = SQLAlchemy(app)

# Initialize Flask-Migrate with the Flask app and SQLAlchemy DB
migrate = Migrate(app, db=db)

# Import the functions from speculate after db has been initialized to avoid circular imports
from speculate import get_badge_class_from_status

# Register the custom Jinja filter function
app.jinja_env.filters['get_badge_class_from_status'] = get_badge_class_from_status

# Import models - it's important that this comes after initializing db and before running migrate
from models import SSOL, COS, CE

# Import the routes
from routes import routes_bp

if __name__ == '__main__':
    app.run(debug=True)  # Set debug to True for development purposes
