# app.py (Auto-Migration Logic Added)
import os
import logging
import asyncio
import sys
from flask import Flask
from flask_migrate import Migrate
from dotenv import load_dotenv
from models import db
from sqlalchemy import text # Import text for raw sql
import colorlog
from ce_nodes import NODES

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

load_dotenv()

app = Flask(__name__)
migrate = Migrate()

app.secret_key = os.environ.get('SECRET_KEY', 'a_very_secret_default_key')
USE_DATABASE = os.environ.get('USE_DATABASE', 'False').lower() in ('true', '1', 't', 'y', 'yes')

handler = colorlog.StreamHandler()
handler.setFormatter(colorlog.ColoredFormatter(
    '%(log_color)s%(asctime)s - %(name)s - %(levelname)s - %(message)s'
))
logger = logging.getLogger()
logger.setLevel(logging.INFO)
if not logger.handlers:
    logger.addHandler(handler)

@app.template_filter()
def get_badge_class_from_status(status):
   return {
       'Proposed': 'bg-info',
       'In Progress': 'bg-warning text-dark',
       'Completed': 'bg-success',
       'Rejected': 'bg-danger'
   }.get(status, 'bg-secondary')

# app.py
@app.context_processor
def inject_nodes():
    from system_nodes import SYSTEM_NODES
    from ce_nodes import NODES
    return dict(nodes=NODES, system_nodes=SYSTEM_NODES)

if USE_DATABASE:
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    db.init_app(app)
    migrate.init_app(app, db)
    
    # --- AUTO-MIGRATION CHECK ---
    with app.app_context():
        try:
            # Check if system_data column exists
            with db.engine.connect() as conn:
                # This query is SQLite specific, usually safe for local dev
                # For Postgres you'd check information_schema
                try:
                    result = conn.execute(text("SELECT system_data FROM ssol LIMIT 1"))
                except Exception:
                    logger.warning("Column 'system_data' missing in 'ssol'. Attempting to add it...")
                    # Add the column. JSONType in models.py maps to TEXT for SQLite
                    conn.execute(text("ALTER TABLE ssol ADD COLUMN system_data TEXT"))
                    conn.commit()
                    logger.info("Successfully added 'system_data' column.")
        except Exception as e:
            logger.error(f"Auto-migration check failed: {e}")

from routes import routes_bp
app.register_blueprint(routes_bp)

if __name__ == '__main__':
    app.run(debug=True, port=5000)