from flask import Flask
from flask_sqlalchemy import SQLAlchemy
import os
from dotenv import load_dotenv
from speculate import get_badge_class_from_status

# Load environment variables
load_dotenv()

app = Flask(__name__, template_folder='templates')

# Set the secret key and database URI from the environment variables
app.secret_key = os.environ['SECRET_KEY']
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('SQLALCHEMY_DATABASE_URI')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False  # Optionally to suppress warning

# Initialize SQLAlchemy with the Flask app
db = SQLAlchemy(app)

# Import the functions from speculate after db has been initialized to avoid circular imports
from speculate import get_badge_class_from_status

# Register the custom Jinja filter function
app.jinja_env.filters['get_badge_class_from_status'] = get_badge_class_from_status

# Import and register the routes
from routes import routes_bp
app.register_blueprint(routes_bp)

if __name__ == '__main__':
    app.run()
