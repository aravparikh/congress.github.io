from flask import Flask, request, jsonify
from flask_cors import CORS
import openai
import os
import json
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

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

client = openai.OpenAI(api_key=openai_api_key)

# ───────────────────────────────────────────────
# 2.  System Prompt (Instructions)
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

Once you generate the calendar ask the user this question: is this calendar good?
Output: Yes if it's good, No if it's bad.

Always generate the best schedule you can from current data, then ask the next question needed.
"""

MODEL_NAME = "gpt-4o-mini"

def generate_response(user_text: str, max_tokens: int = 1024) -> str:
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
        print(f"Error calling OpenAI API: {err}")
        return "[ERROR] An internal server error occurred."

# ───────────────────────────────────────────────
# 3. Helper Functions
# ───────────────────────────────────────────────

def calendar_to_json(response_text: str) -> dict:
    """
    Parses the AI response into structured JSON.
    """
    today_summary = ""
    weekly_schedule = {}
    current_day = None
    lines = response_text.splitlines()
    section = None

    for line in lines:
        line = line.strip()
        if "Today’s 24-hour summary" in line:
            section = "today"
            continue
        elif "7-day draft schedule" in line:
            section = "week"
            continue
        elif section == "today" and line:
            today_summary += line + " "
        elif section == "week" and line:
            if any(day in line for day in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]):
                current_day = line.rstrip(":")
                weekly_schedule[current_day] = []
            elif current_day and "–" in line:
                weekly_schedule[current_day].append(line)

    return {
        "today_summary": today_summary.strip(),
        "weekly_schedule": weekly_schedule
    }

def save_calendar_json(calendar_json: dict):
    """
    Saves the calendar JSON to a local file.
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"calendar_{timestamp}.json"
    with open(filename, "w") as f:
        json.dump(calendar_json, f, indent=4)
    print(f"📁 Calendar saved to {filename}")

# ───────────────────────────────────────────────
# 4. Flask API Endpoints
# ───────────────────────────────────────────────

@app.route('/', methods=['GET'])
def home():
    return jsonify({"message": "Student Planner Backend is running!"}), 200

@app.route('/generate', methods=['POST'])
def handle_generate_response():
    data = request.get_json()
    user_text = data.get('user_text')
    last_schedule_text = data.get('last_schedule_text', "")

    if not user_text:
        return jsonify({"error": "No 'user_text' provided in the request."}), 400

    # Handle user's Yes/No response
    if user_text.strip().lower() in ["yes", "no"]:
        print(f"✅ User responded: {user_text.strip()}")
        if user_text.strip().lower() == "yes" and last_schedule_text:
            calendar_json = calendar_to_json(last_schedule_text)
            save_calendar_json(calendar_json)
        return jsonify({"response": "Thanks for your feedback!"})

    # Generate new schedule
    response_text = generate_response(user_text)

    if response_text.startswith("[ERROR]"):
        return jsonify({"error": "Failed to generate response due to an internal server error. Please try again later."}), 500

    return jsonify({
        "response": response_text,
        "last_schedule_text": response_text
    })

# ───────────────────────────────────────────────
# 5. Run the Flask Application
# ───────────────────────────────────────────────

if __name__ == '__main__':
    is_debug_mode = os.getenv('FLASK_ENV') == 'development'
    print(f"Starting Flask server on http://127.0.0.1:5000 (Debug Mode: {is_debug_mode})")
    print("Ensure your OPENAI_API_KEY environment variable is set.")
    app.run(debug=is_debug_mode, port=5000)

