# app.py (Final Refactor using Application Factory Pattern)
import os
import logging
import asyncio
import sys
from flask import Flask
from flask_migrate import Migrate
from dotenv import load_dotenv
from models import db # Only import the 'db' object from models
import colorlog
from ce_nodes import NODES

# --- FIX for asyncio on Windows ---
# This is the standard fix for `RuntimeError: Event loop is closed` on Windows.
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
# --- END FIX ---

load_dotenv()

# --- 1. Create App and Extension Instances (Uninitialized) ---
app = Flask(__name__)
migrate = Migrate() # Create the Migrate object, but don't connect it to the app yet.

# --- App Configuration ---
app.secret_key = os.environ.get('SECRET_KEY', 'a_very_secret_default_key')
USE_DATABASE = os.environ.get('USE_DATABASE', 'False').lower() in ('true', '1', 't', 'y', 'yes')

# --- Logger Configuration ---
handler = colorlog.StreamHandler()
handler.setFormatter(colorlog.ColoredFormatter(
    '%(log_color)s%(asctime)s - %(name)s - %(levelname)s - %(message)s'
))
logger = logging.getLogger()
logger.setLevel(logging.INFO)
if not logger.handlers:
    logger.addHandler(handler)

# --- Jinja Filter ---
@app.template_filter()
def get_badge_class_from_status(status):
   return {
       'Proposed': 'bg-info',
       'In Progress': 'bg-warning text-dark',
       'Completed': 'bg-success',
       'Rejected': 'bg-danger'
   }.get(status, 'bg-secondary')

@app.context_processor
def inject_nodes():
    """Injects the NODES dictionary into all templates."""
    return dict(nodes=NODES)

# --- 2. Initialize Extensions Conditionally ---
# This is the core of the fix. We now initialize the extensions inside the 'if' block.
if USE_DATABASE:
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SQLALCHEMY_ECHO'] = os.environ.get('SQLALCHEMY_ECHO', 'False').lower() in ('true', '1', 't')

    # Now, connect the db and migrate objects to the configured app.
    # This ensures the 'db' command is registered only when USE_DATABASE is true.
    db.init_app(app)
    migrate.init_app(app, db)

# --- 3. Blueprint Registration ---
# Import blueprints AFTER the app is configured.
from routes import routes_bp
app.register_blueprint(routes_bp)

# --- Main Execution (for `python app.py`) ---
if __name__ == '__main__':
    # This block is for direct execution and is not run by the 'flask' command.
    app.run(debug=True, port=5000)