# app.py (Auto-Migration Logic Added)
import os
import sys
import logging
import asyncio
from flask import Flask
from flask_migrate import Migrate
from dotenv import load_dotenv
from models import db
from sqlalchemy import text

# --- RICH UI LIBRARY ---
from rich.console import Console
from rich.theme import Theme
from rich.panel import Panel
from rich.table import Table
from rich.text import Text
from rich.logging import RichHandler

# Local Imports
from ce_nodes import NODES

# --- 1. CONFIGURATION & THEME ---
# Windows Asyncio Fix
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

load_dotenv()

# Define MS365 Palette
ms365_theme = Theme({
    "white": "#FFFFFF",
    "tan": "#CC3802",      # Access/PowerPoint-ish
    "teal": "#047E84",     # Excel-ish
    "plum": "#9A348E",     # OneNote/Teams-ish
    "blush": "#DA627D",
    "salmon": "#FCA17D",
    "mint": "#64C5B1",
    "sky": "#86BBD8",      # Word/Outlook-ish
    "teal_blue": "#33658A",
    "info": "#86BBD8",
    "warning": "#FCA17D",
    "danger": "#CC3802",
    "success": "#64C5B1"
})

# Initialize Rich Console
console = Console(theme=ms365_theme)

# Configure Logging to use RichHandler (Pretty logs with timestamps)
logging.basicConfig(
    level="INFO",
    format="%(message)s",
    datefmt="[%X]",
    handlers=[RichHandler(console=console, rich_tracebacks=True, markup=True, show_path=False)]
)
logger = logging.getLogger("rich")

# --- 2. FLASK INIT ---
app = Flask(__name__)
migrate = Migrate()

app.secret_key = os.environ.get('SECRET_KEY', 'a_very_secret_default_key')
USE_DATABASE = os.environ.get('USE_DATABASE', 'False').lower() in ('true', '1', 't', 'y', 'yes')

# --- 3. DATABASE SETUP & MIGRATIONS ---
if USE_DATABASE:
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    db.init_app(app)
    migrate.init_app(app, db)
    
    # --- AUTO-MIGRATION CHECK ---
    with app.app_context():
        try:
            with db.engine.connect() as conn:
                try:
                    # Check if system_data column exists
                    conn.execute(text("SELECT system_data FROM ssol LIMIT 1"))
                except Exception:
                    logger.warning("[tan]Column 'system_data' missing in 'ssol'. Attempting to add it...[/tan]")
                    conn.execute(text("ALTER TABLE ssol ADD COLUMN system_data TEXT"))
                    conn.commit()
                    logger.info("[success]Successfully added 'system_data' column.[/success]")
        except Exception as e:
            # Swallow error if table doesn't exist yet (first run)
            logger.debug(f"[sky]Auto-migration check skipped (fresh DB): {e}[/sky]")

# --- 4. TEMPLATE FILTERS & PROCESSORS ---
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
    from system_nodes import SYSTEM_NODES
    return dict(nodes=NODES, system_nodes=SYSTEM_NODES)

# --- 5. ROUTES ---
from routes import routes_bp
app.register_blueprint(routes_bp)

# --- 6. STARTUP DASHBOARD ---
def print_startup_banner():
    console.clear()
    
    # Construct the Grid for System Stats
    sys_info = Table.grid(padding=1)
    sys_info.add_row("[tan]Runtime:[/tan]", f"[white]Python {sys.version.split()[0]}[/white]")
    sys_info.add_row("[tan]Framework:[/tan]", "[white]Flask[/white]")
    sys_info.add_row("[tan]Storage:[/tan]", f"[sky]{'Postgres/SQLite' if USE_DATABASE else 'In-Memory Dictionary'}[/sky]")
    sys_info.add_row("[tan]Status:[/tan]", "[mint]ONLINE[/mint]")

    # Create the Dashboard Panel
    main_panel = Panel(
        sys_info,
        title="[bold white]SSPEC HORIZON v2025.33[/bold white]",
        border_style="teal",
        subtitle="[blush]Serving at http://127.0.0.1:5000[/blush]",
        padding=(1, 4),
        expand=False
    )
    
    # Print the Layout
    console.print("\n")
    console.print(Text(" POSSIBILITY PATHFINDER ", style="bold white on plum"), justify="center")
    console.print("\n")
    console.print(main_panel, justify="center")
    console.print("\n")

if __name__ == '__main__':
    # Render the TUI
    print_startup_banner()
    
    # Suppress the default boring Flask banner
    cli = sys.modules['flask.cli']
    cli.show_server_banner = lambda *x: None
    
    # Run App
    app.run(debug=True, port=5000)