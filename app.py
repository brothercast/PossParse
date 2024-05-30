import os  
import logging  
from flask import Flask  
from flask_migrate import Migrate  
from dotenv import load_dotenv  
from models import db  # Import the db object from models.py  

  
# Load environment variables  
load_dotenv()  
  
# Flag to toggle database usage  
USE_DATABASE = os.environ.get('USE_DATABASE', 'False').lower() in ['true', '1', 't']  
  
# Initialize Flask app  
app = Flask(__name__)  
  
# Set the secret key from the environment variables  
app.secret_key = os.environ.get('SECRET_KEY', 'your_secret_key')  
  
if USE_DATABASE:  
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI')  
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False  
    app.config['SQLALCHEMY_ECHO'] = True  
  
    # Initialize SQLAlchemy  
    db.init_app(app)  
  
    # Initialize Flask-Migrate  
    migrate = Migrate(app, db)  
  
# Import the functions from speculate after db has been initialized to avoid circular imports  
from speculate import get_badge_class_from_status  
  
# Register the custom Jinja filter function  
app.jinja_env.filters['get_badge_class_from_status'] = get_badge_class_from_status  
  
# Import the routes and register the Blueprint at the end of the file  
from routes import routes_bp  
app.register_blueprint(routes_bp)  
  
if __name__ == '__main__':  
    logging.basicConfig(level=logging.DEBUG)  # Set the logging level to DEBUG  
    logging.info("Checking initial data store contents...")  
    from speculate import check_data_store_contents  
    check_data_store_contents('database' if USE_DATABASE else 'in_memory')  
    app.run(debug=True)  