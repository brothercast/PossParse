# ✨ SSPEC HORIZON: Possibility Pathfinder ✨

**SSPEC Horizon** is an advanced, AI-driven project architecture and speculation engine. Designed for complex planning, innovation, and mass collaboration, it replaces traditional linear planning with an autonomous, self-healing "System Physics" ecosystem.

## 🚀 The Vision
Traditional project management tools track what you *already know*. SSPEC Horizon helps you discover what you *don't know*. 

By mapping **System Physics** (Constraints, Budget, Scale, Horizon) into an actionable data model, the platform allows users to generate dynamic **Conditions of Satisfaction (COS)** and dive deep into atomic **Conceptual Entities (CE)**—all guided by an advanced, contextually-aware Artificial Intelligence.

## 🧠 Core Features

### 1. Autonomous Speculation
Leveraging **Google Gemini 1.5 Pro** and **Flash**, the system drafts complex narratives, extracts required prerequisites, and identifies stakeholders with a single click via our "Progressive Disclosure" UI.

### 2. Bicameral Governance AI
SSPEC Horizon introduces a groundbreaking dual-AI feedback loop to ensure your project logic doesn't collapse under its own weight:
- 🛑 **The Ombud (The Brake):** Constantly monitors the system for constraint violations and logic failures (e.g., impossible budgets, failing criteria).
- 💡 **The Advocate (The Accelerator):** When integrity is compromised, the Advocate synthesizes the context and proposes actionable, programmatic resolutions (with measured downstream impact) that users can instantly **Align & Implement**.

### 3. Logic & Criteria Mapping
Forget flat text. Every Conceptual Entity allows users to define explicit logic rules (Thresholds, Gates, Constraints, Conditionals, and Benchmarks) that dynamically control the state of the parent project.

### 4. Interactive Constellation Views
Visualize the interconnected dependencies of your stakeholders, prerequisites, and resources with interactive, dynamic node graphs (powered by Vis.js).

---

## 🛠️ Technology Stack

- **Frontend:** HTML5, Vanilla JavaScript, CSS3 (Bespoke Glassmorphism & Micro-animations), Bootstrap 5, Vis.js
- **Backend:** Python, Flask, SQLAlchemy
- **AI Integration:** Google Gemini API (`google-genai`)
- **Database:** PostgreSQL (with SQLite in-memory fallback for rapid prototyping)
- **Versioning:** Automated Git-Hash Tracking

---

## ⚙️ Setup & Installation

**1. Clone the Repository**
```bash
git clone https://github.com/brothercast/PossParse.git
cd PossParse
```

**2. Install Dependencies**
```bash
pip install -r requirements.txt
```

**3. Configure Environment Variables**
Create a `.env` file in the root directory:
```env
GOOGLE_GEMINI_API=your_gemini_api_key_here
GEMINI_MODEL_NAME=gemini-1.5-flash
GEMINI_THINKING_MODEL_NAME=gemini-1.5-pro
GEMINI_IMAGE_MODEL_NAME=imagen-3.0-generate-001
SECRET_KEY=your_secret_flask_key
USE_DATABASE=False # Set to True to use PostgreSQL
# SQLALCHEMY_DATABASE_URI=postgresql://user:pass@localhost/sspec
```

**4. Run the Engine**
```bash
python app.py
```
*Access the application at `http://localhost:5000`.*

---

## 📜 License
This project is licensed under the MIT License. See the `LICENSE` file for details.
