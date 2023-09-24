from flask import Flask
import os
from dotenv import load_dotenv
from speculate import get_badge_class_from_status

app = Flask(__name__, template_folder='templates')
app.secret_key = os.environ['SECRET_KEY']

# Register the custom Jinja filter function
app.jinja_env.filters['get_badge_class_from_status'] = get_badge_class_from_status

# Import and register the routes
from routes import routes_bp
app.register_blueprint(routes_bp)

if __name__ == '__main__':
    app.run()