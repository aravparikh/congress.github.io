# app_backend.py
from flask import Flask, request, jsonify
from flask_cors import CORS # Import CORS to handle cross-origin requests
import openai
import os
import json # Import json module

app = Flask(__name__)
CORS(app) # Enable CORS for all routes, allowing your frontend to connect

# ───────────────────────────────────────────────
# 1.  API Key Setup
# ───────────────────────────────────────────────
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
# 2.  System prompt (your refined instructions for JSON output)
# ───────────────────────────────────────────────
DEFAULT_CUSTOM_INSTRUCTION = """
You are a friendly planning assistant helping a high-school student map out their day-to-day life.
Your primary goal is to generate schedules and gather information.

When the user types “generate schedule,” or asks for a schedule, always produce a JSON object with the following structure:
{
  "todaySummary": "Today's 24-hour summary text.",
  "sevenDaySchedule": [
    {
      "day": "Monday",
      "events": [
        {"name": "Event Name 1", "start": "HH:MM", "end": "HH:MM"},
        {"name": "Event Name 2", "start": "HH:MM", "end": "HH:MM"}
      ]
    },
    {
      "day": "Tuesday",
      "events": [
        {"name": "Event Name 3", "start": "HH:MM", "end": "HH:MM"}
      ]
    },
    // ... continue for Wednesday to Sunday
  ],
  "followUpQuestion": "A single, clear follow-up question to gather more details."
}

If some details are missing or unclear, do **not wait** — generate a **partial schedule** using the known data. Label any missing time blocks as “Unplanned” and always follow up with one clear question to fill a gap.

Information to collect:
• Class schedule (subject, start & end time, weekdays)
• Average total time on campus (or note if student is on break/holiday)
• Extracurricular activities (type, days, duration, desired vs. current)
• Sports commitments (type, practice/game times)
• Homework / study time per day
• Sleep pattern (bedtime, wake-up)
• Commuting / travel time
• Free-time or leisure preferences

Question logic:
• Keep track of which details are still missing.
• After each schedule generation, ask one follow-up question for a missing item.
• Do not assume or invent missing details.

Output format details:
- The entire output MUST be a valid JSON string.
- "todaySummary" should be a string describing today's schedule.
- "sevenDaySchedule" must be an array of 7 objects, one for each day (Monday to Sunday).
- Each day object must have a "day" string (e.g., "Monday") and an "events" array.
- Each event object must have "name" (string), "start" (HH:MM string), and "end" (HH:MM string).
- Ensure times are in 24-hour HH:MM format (e.g., "09:00", "17:30").
- "followUpQuestion" should be a string.

Always generate the best schedule you can from current data, then ask the next question needed.
"""

# Changed to the correct model name for 'o4-mini' if you mean GPT-4o mini
MODEL_NAME = "gpt-4o-mini"

def generate_response(user_text: str, max_tokens: int = 1024) -> str: # Increased max_tokens for JSON
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
            response_format={"type": "json_object"} # Explicitly request JSON
        )
        return chat_completion.choices[0].message.content.strip()
    except Exception as err:
        print(f"Error calling OpenAI API: {err}")
        return json.dumps({"error": f"[ERROR] Failed to generate response: {str(err)}"})

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

    # Attempt to parse the response as JSON
    try:
        parsed_response = json.loads(response_text)
        if "error" in parsed_response: # Check if the AI itself returned an error JSON
            return jsonify(parsed_response), 500
        return jsonify({"response": parsed_response}) # Send the parsed JSON
    except json.JSONDecodeError:
        # If AI didn't return valid JSON, treat it as an error
        print(f"AI response was not valid JSON: {response_text}")
        return jsonify({"error": "AI generated an invalid response format. Please try again."}), 500


# ───────────────────────────────────────────────
# 4.  Run the Flask Application
# ───────────────────────────────────────────────
if __name__ == '__main__':
    print("Starting Flask server on http://127.0.0.1:5000")
    print("Ensure your OPENAI_API_KEY environment variable is set.")
    app.run(debug=True, port=5000)
