# app_backend.py
from flask import Flask, request, jsonify
from flask_cors import CORS # Import CORS to handle cross-origin requests
import openai
import os

app = Flask(__name__)
CORS(app) # Enable CORS for all routes, allowing your frontend to connect

# ───────────────────────────────────────────────
# 1.  API Key Setup
# ───────────────────────────────────────────────
# It's highly recommended to set your OpenAI API key as an environment variable
# (e.g., OPENAI_API_KEY). This is more secure for production.
# For local development, if the environment variable is not set, it will prompt you.
openai_api_key = os.getenv("OPENAI_API_KEY")
if not openai_api_key:
    print("🔑  OPENAI_API_KEY environment variable not set.")
    print("Please set it (e.g., export OPENAI_API_KEY='your_key_here')")
    print("or enter it below for development purposes only.")
    openai_api_key = input("Enter your OpenAI API key: ").strip()

if not openai_api_key:
    raise ValueError("No API key provided – cannot continue. Please set OPENAI_API_KEY.")

# Initialize the OpenAI client with the API key
client = openai.OpenAI(api_key=openai_api_key)

# ───────────────────────────────────────────────
# 2.  System prompt (your refined instructions)
# ───────────────────────────────────────────────
DEFAULT_CUSTOM_INSTRUCTION = """
You are a friendly planning assistant helping a high‑school student map out their day‑to‑day life.

When the user types “generate schedule,” always produce:
   a) Today’s 24‑hour summary
   b) A 7‑day draft schedule

If some details are missing or unclear, do **not wait** — generate a **partial schedule** using the known data. Label any missing time blocks as “Unplanned” and always follow up with one clear question to fill a gap.

Information to collect:
• Class schedule (subject, start & end time, weekdays)
• Average total time on campus (or note if student is on break/holiday)
• Extracurricular activities (type, days, duration, desired vs. current)
• Sports commitments (type, practice/game times)
• Homework / study time per day
• Sleep pattern (bedtime, wake‑up)
• Commuting / travel time
• Free-time or leisure preferences

Question logic:
• Keep track of which details are still missing.
• After each schedule generation, ask one follow-up question for a missing item.
• Do not assume or invent missing details.

Output format:
a) Today’s 24-hour summary
b) 7-day draft schedule (Mon–Sun)
• Ensure each day totals 24 hours
• Use same block format
• Note any unmet wishes or time conflicts at the bottom
Style:
• Use concise, neutral language
• Use one- or two-word labels for time blocks (Sleep, School, Practice, etc.)
• Show times in HH:MM–HH:MM format for clarity.

Always generate the best schedule you can from current data, then ask the next question needed.
"""

# Changed to the correct model name for 'o4-mini' if you mean GPT-4o mini
MODEL_NAME = "gpt-4o-mini"

def generate_response(user_text: str, max_tokens: int = 512) -> str:
    """Send user_text to the model and return the assistant's reply."""
    try:
        chat_completion = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": DEFAULT_CUSTOM_INSTRUCTION},
                {"role": "user", "content": user_text}
            ],
            max_tokens=max_tokens,
            temperature=0.7,
            top_p=0.95,
        )
        return chat_completion.choices[0].message.content.strip()
    except Exception as err:
        # Log the full error for debugging on the server side
        print(f"Error calling OpenAI API: {err}")
        # Return a generic error message to avoid exposing sensitive details
        return "[ERROR] An internal server error occurred."

# ───────────────────────────────────────────────
# 3.  Flask API Endpoint
# ───────────────────────────────────────────────
@app.route('/generate', methods=['POST'])
def handle_generate_response():
    """
    Handles POST requests to the /generate endpoint.
    Expects a JSON payload with 'user_text'.
    Returns a JSON response with the AI's reply or an error message.
    """
    data = request.get_json()
    user_text = data.get('user_text')

    if not user_text:
        return jsonify({"error": "No 'user_text' provided in the request."}), 400
    
    # Call the AI model to generate a response
    response_text = generate_response(user_text)

    # Check if the response contains an error from the AI helper
    if response_text.startswith("[ERROR]"):
        # Return a generic error message to the client
        return jsonify({"error": "Failed to generate response due to an internal server error. Please try again later."}), 500
    
    return jsonify({"response": response_text})

# ───────────────────────────────────────────────
# 4.  Run the Flask Application
# ───────────────────────────────────────────────
if __name__ == '__main__':
    # Determine if running in debug mode based on FLASK_ENV environment variable
    # In a production environment, you would use a WSGI server like Gunicorn or uWSGI.
    # For local development, run on localhost:5000.
    is_debug_mode = os.getenv('FLASK_ENV') == 'development'
    
    print(f"Starting Flask server on http://127.0.0.1:5000 (Debug Mode: {is_debug_mode})")
    print("Ensure your OPENAI_API_KEY environment variable is set.")
    app.run(debug=is_debug_mode, port=5000)

