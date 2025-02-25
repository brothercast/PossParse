# app.py (with colorlog)
import os
import logging
from flask import Flask
from flask_migrate import Migrate
from dotenv import load_dotenv
from models import db, get_engine_and_session, create_tables_if_not_exist
import colorlog  # Import colorlog

load_dotenv()

USE_DATABASE = os.environ.get('USE_DATABASE', 'False').lower() in ('true', '1', 't', 'y', 'yes')

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'a_good_default_secret_key')

# Configure colorlog
handler = colorlog.StreamHandler()
handler.setFormatter(colorlog.ColoredFormatter(
    '%(log_color)s%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    log_colors={
        'DEBUG':    'cyan',
        'INFO':     'green',
        'WARNING':  'yellow',
        'ERROR':    'red',
        'CRITICAL': 'red,bg_white',
    }
))

# Use Flask's logger and add the colorlog handler
logger = logging.getLogger()  # Get root logger (Flask uses this)
logger.setLevel(logging.DEBUG) # Set level
logger.addHandler(handler)



if USE_DATABASE:
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SQLALCHEMY_ECHO'] = os.environ.get('SQLALCHEMY_ECHO', 'False').lower() in ('true', '1', 't', 'y', 'yes')

    db.init_app(app)
    migrate = Migrate(app, db)

from routes import routes_bp
from speculate import get_badge_class_from_status
app.jinja_env.filters['get_badge_class_from_status'] = get_badge_class_from_status

app.register_blueprint(routes_bp, name='routes_bp')

if __name__ == '__main__':
    # logging.basicConfig is REPLACED by the colorlog setup above
    app.run(debug=True, port=5000)