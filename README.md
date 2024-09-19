#  SSPEC PossPath: Structured Speculation Possibility Pathfinder

Welcome to **SSPEC PossPath**, a groundbreaking project management tool designed to drive innovation through mass collaboration. Whether you're working on a startup, a research project, or a community initiative, PossPath empowers you to bridge divides and achieve ambitious goals.

##  Features

* Collaborative Goal Selection: Engage teams to speculate and select high-level outcomes that inspire collective commitment.
* Structured Solutions: Generate detailed Conditions of Satisfaction (COS) and Conditional Elements (CE) for each phase of your project.
* AI-Driven Insights: Leverage AI to enhance decision-making and streamline complex processes.
* Dynamic Modals: Interactive elements that provide contextual data and intuitive interfaces for project management.
* PDF Export: Seamlessly convert your solutions and plans into PDF documents for easy sharing.

##  Screenshots

![Goal Selection](static/images/goal_selection_screenshot.png)
*Choose from AI-generated outcomes tailored to your input.*

![Outcome Phases](static/images/outcome_phases_screenshot.png)
*Visualize your project's phases with interactive conditions and elements.*

##  Technology Stack

* Frontend: HTML, CSS, JavaScript, Bootstrap
* Backend: Flask, SQLAlchemy
* AI Integration: Azure OpenAI
* Database: PostgreSQL (optional with in-memory fallback)

##  Setup & Installation

1. **Clone the Repository:**

git clone [https://github.com/brothercast/PossParse.git](https://github.com/brothercast/PossParse.git)
cd PossParse


**2.  Install Dependencies:**
pip install -r requirements.txt

**3. Set Up Environment Variables:**

Create a .env file in the root directory.   
Add your configuration keys:

**AZURE_OPENAI_API_KEY=your_azure_key**
**AZURE_OPENAI_ENDPOINT=your_azure_endpoint**
**SQLALCHEMY_DATABASE_URI**=**your_database_uri**

4. Run the Application:

**flask run**

5. **Access the App:** 
Open http://localhost:5000 in your web browser.

### Contribution
We welcome contributions from the community! Please read our Contributing Guidelines for more information.

### License
This project is licensed under the MIT License. See the LICENSE file for details.   

### Acknowledgements
Special thanks to our team, beta testers, and the open-source community for their invaluable support and contributions.
