# Import necessary libraries and dependencies
import os
import folium
import openai
from dotenv import load_dotenv
from flask import render_template, request, flash, redirect, url_for, session, jsonify

# Set up OpenAI API credentials
load_dotenv()
openai.api_key = os.environ["OPENAI_API_KEY"]

# Location CE Template
def build_location_node(location_input):
    # Generate suggestions for geographic selection using GPT-3.5-Turbo
    response = openai.Completion.create(
        engine="text-davinci-003",
        prompt=f"Generate suggestions for geographic selection based on the input: '{location_input}'",
        max_tokens=50,
        n=5,
        temperature=0.7,
        stop=None,
        log_level="info"
    )

    # Extract the suggestions from the API response
    suggestions = [choice["text"].strip() for choice in response.choices]

    # Create a map using Leaflet.js and Folium
    m = folium.Map(location=[0, 0], zoom_start=2)

    # Add a marker to the map
    folium.Marker(location=[0, 0], popup="Location Marker").add_to(m)

    # Render the map to HTML
    map_html = m._repr_html_()

    # Build the Location CE template with suggestions
    location_ce_template = f"""
    <div id="location-ce-template" class="ce-template">
        {map_html}
        <input type="text" id="location-input" placeholder="Enter a location" value="{location_input}">
        <ul>
            {"".join(f"<li>{suggestion}</li>" for suggestion in suggestions)}
        </ul>
    </div>
    """

    return location_ce_template

def build_research_node():
    research_node_template = """
    <div id="research-node-template" class="ce-template">
  <h3>Research Node</h3>
  <ul id="research-list">
    <!-- Dynamically generated list items will be inserted here -->
  </ul>
  <div class="research-actions">
    <button class="btn btn-success btn-sm add-research-item" title="Add" data-bs-toggle="tooltip" data-bs-placement="top">
      <span class="glyphicon glyphicon-plus"></span>
    </button>
    <button class="btn btn-danger btn-sm remove-research-item" title="Remove" data-bs-toggle="tooltip" data-bs-placement="top">
      <span class="glyphicon glyphicon-minus"></span>
    </button>
    <button class="btn btn-primary btn-sm regenerate-research-items" title="Regenerate" data-bs-toggle="tooltip" data-bs-placement="top">
      <span class="glyphicon glyphicon-refresh"></span>
    </button>
  </div>
</div>
    """
    return research_node_template