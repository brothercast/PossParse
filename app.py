# app.py
import os
import sys
import logging
import asyncio
from datetime import datetime
from flask import Flask
from flask_migrate import Migrate
from sqlalchemy import text
from dotenv import load_dotenv
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text
from rich.logging import RichHandler

# ----------------------
# Windows asyncio fix
# ----------------------
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# ----------------------
# Load environment variables
# ----------------------
load_dotenv()
ARCHIVE_FOLDER = os.environ.get("SSPEC_ARCHIVE_FOLDER", "./SSPEC_Prompt_Archive")

# ----------------------
# Rich console setup
# ----------------------
ms365_theme = {
    "white": "#FFFFFF",
    "tan": "#CC3802",
    "teal": "#047E84",
    "plum": "#9A348E",
    "blush": "#DA627D",
    "salmon": "#FCA17D",
    "mint": "#64C5B1",
    "sky": "#86BBD8",
    "info": "#86BBD8",
    "warning": "#FCA17D",
    "danger": "#CC3802",
    "success": "#64C5B1"
}
console = Console()

# ----------------------
# Logging config
# ----------------------
logging.basicConfig(
    level="INFO",
    format="%(message)s",
    handlers=[RichHandler(console=console, rich_tracebacks=True)]
)
logger = logging.getLogger("rich")

# Suppress duplicate Werkzeug logs and ANSI codes, but not startup messages
werkzeug_logger = logging.getLogger("werkzeug")
werkzeug_logger.propagate = False
werkzeug_logger.setLevel(logging.WARNING)

# ----------------------
# Flask init
# ----------------------
app = Flask(__name__)
migrate = Migrate()
app.secret_key = os.environ.get('SECRET_KEY', 'a_very_secret_default_key')
USE_DATABASE = os.environ.get('USE_DATABASE', 'False').lower() in ('true', '1', 't', 'y', 'yes')

# ----------------------
# Database setup & auto-migrations
# ----------------------
from models import db
if USE_DATABASE:
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)
    migrate.init_app(app, db)

    with app.app_context():
        try:
            with db.engine.connect() as conn:
                try:
                    conn.execute(text("SELECT system_data FROM ssol LIMIT 1"))
                except Exception:
                    logger.warning("[tan]Column 'system_data' missing. Adding...[/tan]")
                    conn.execute(text("ALTER TABLE ssol ADD COLUMN system_data TEXT"))
                    conn.commit()
                    logger.info("[success]Column 'system_data' added[/success]")
        except Exception as e:
            logger.debug(f"[sky]DB fresh or missing table, skipping auto-migration: {e}[/sky]")

# ----------------------
# Template filters / context processors
# ----------------------
@app.template_filter()
def get_badge_class_from_status(status):
    return {
        'Proposed': 'bg-info',
        'In Progress': 'bg-warning text-dark',
        'Completed': 'bg-success',
        'Rejected': 'bg-danger'
    }.get(status, 'bg-secondary')

from ce_nodes import NODES
@app.context_processor
def inject_nodes():
    from system_nodes import SYSTEM_NODES
    return dict(nodes=NODES, system_nodes=SYSTEM_NODES)

# ----------------------
# --- TERMINAL TITLE SCREEN ---
# ----------------------
def get_latest_version(archive_folder: str) -> str:
    if not os.path.exists(archive_folder):
        return "v0001"
    versions = []
    for f in os.listdir(archive_folder):
        if f.startswith("SSPEC_Template_") and f.endswith(".txt"):
            try:
                num = int(f.split("_")[-1].split(".")[0])
                versions.append(num)
            except ValueError:
                continue
    return f"v{max(versions):04d}" if versions else "v0001"

def print_title_screen():
    version = get_latest_version(ARCHIVE_FOLDER)
    table = Table.grid(padding=1)
    table.add_row("[cyan]Author:[/cyan]", "Tone Pettit")
    table.add_row("[cyan]Organization:[/cyan]", "Structured Speculation Foundation")
    table.add_row("[cyan]Version:[/cyan]", version)
    table.add_row("[cyan]Date:[/cyan]", datetime.now().strftime("%Y-%m-%d"))

    panel = Panel(
        table,
        title="[bold magenta]SSPEC Horizon Possibility Parser[/bold magenta]",
        subtitle="[green]Structured Speculation Foundation[/green]",
        border_style="bright_blue",
        padding=(1, 2),
        expand=False
    )
    console.clear()
    console.print(Text("✨ POSSIBILITY PATHFINDER ✨", style="bold white on purple"), justify="center")
    console.print("\n")
    console.print(panel, justify="center")
    console.print("\n")

# ----------------------
# Routes
# ----------------------
from routes import routes_bp
app.register_blueprint(routes_bp)

# ----------------------
# Startup banner
# ----------------------
def print_startup_banner():
    sys_info = Table.grid(padding=1)
    sys_info.add_row("[tan]Runtime:[/tan]", f"[white]Python {sys.version.split()[0]}[/white]")
    sys_info.add_row("[tan]Framework:[/tan]", "[white]Flask[/white]")
    sys_info.add_row("[tan]Storage:[/tan]", f"[sky]{'Postgres/SQLite' if USE_DATABASE else 'In-Memory'}[/sky]")
    sys_info.add_row("[tan]Status:[/tan]", "[mint]ONLINE[/mint]")

    panel = Panel(
        sys_info,
        title="[bold white]SSPEC HORIZON v2026.01[/bold white]",
        border_style="teal",
        subtitle="[blush]Serving at http://127.0.0.1:5000[/blush]",
        padding=(1, 4),
        expand=False
    )
    console.print(panel, justify="center")

# ----------------------
# Main
# ----------------------
if __name__ == '__main__':
    print_title_screen()
    print_startup_banner()
    # Run Flask app normally: CTRL+C message will appear
    app.run(debug=True, port=5000)
