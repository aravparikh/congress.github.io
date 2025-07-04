# Congressional-App
https://aravparikh.github.io/congress.github.io/
Overview
The Student Planner App is a comprehensive time management and academic tracking tool designed specifically for high school students. It aims to help students stay organized, improve their academic performance, and explore extracurricular opportunities effectively.

Features
Dynamic Landing Page: A modern, responsive landing page with a clear call to action, showcasing the app's core features. Includes "Login" and "Sign Up" placeholders for future authentication.

Persistent Session: Once a user clicks "Get Started," the app remembers their preference and directly loads the Dashboard on subsequent visits. A "Logout" option is available to return to the landing page.

Dashboard: Provides a quick overview of the user's overall GPA and recent academic activities.

AI-Powered Time Management:

Schedule Generator: Users can input their daily routine, academic goals, and commitments, and the app utilizes Google's Gemini AI to generate a personalized, detailed daily schedule.

AI Time Summary (Placeholder): Future functionality to provide AI-generated insights and suggestions for optimizing time usage.

Grade Tracker:

Allows users to easily add, view, and delete grades for various courses and assignments.

Automatically calculates individual course averages and an overall GPA.

Data is stored persistently using Firebase Firestore.

Extracurricular Roadmap (Placeholder): Future functionality to suggest extracurricular activities based on user interests and help them explore these opportunities.

Calendar Synchronization (Placeholder): Future functionality to sync generated schedules with external calendar services like Google Calendar and Microsoft Outlook Calendar.

Responsive Design: Built with Tailwind CSS, ensuring a seamless experience across various devices (mobile, tablet, desktop).

Firebase Integration: Utilizes Firebase Authentication (anonymous sign-in) and Firestore for secure and real-time data storage.

Technologies Used
Frontend: HTML5, CSS3 (Tailwind CSS), JavaScript (Vanilla JS)

Backend/Database: Google Firebase (Authentication, Firestore)

AI Integration: Google Gemini API (gemini-2.0-flash model)

Setup and Installation
This application is designed to run within a Google Canvas environment, which provides the necessary Firebase configuration and authentication tokens automatically.

To run this application:

Ensure you are in a Google Canvas environment.

Paste the provided HTML code into the index.html file in your Canvas editor.

The necessary Firebase SDKs are loaded via CDN, and global variables (__app_id, __firebase_config, __initial_auth_token) are automatically injected by the Canvas environment.

The application should load directly in the preview pane.

Note: No local installation or complex setup is required outside of the Canvas environment.

Usage
Landing Page:

Upon first load, you will see the landing page.

Click "Get Started" to proceed to the Dashboard.

Click "See Features" to scroll down and view a brief overview of the app's capabilities.

"Login" and "Sign Up" buttons are placeholders; clicking them will show a "coming soon" message.

Dashboard:

View your overall GPA and a summary of recent grades.

"Upcoming Tasks" and "AI Time Summary" are placeholders for future features.

Navigation:

Use the sidebar on the left to navigate between "Dashboard," "Time Management," "Grade Tracker," "Extracurriculars," and "Calendar Sync."

Time Management:

Enter a detailed prompt about your schedule needs into the text area.

Click "Generate Schedule" to get an AI-powered example schedule.

"AI Time Summary" is a placeholder.

Grade Tracker:

Fill out the "Add New Grade" form with course, assignment, score, and date.

Click "Add Grade" to save it to your personal Firestore database.

View all your recorded grades in the table below.

Click the trash icon next to a grade to delete it.

See calculated course averages at the bottom.

Extracurriculars & Calendar Sync:

These sections are currently placeholders. Clicking their buttons will display "coming soon" messages.

Logout:

Click the "Logout" button in the sidebar to clear your session and return to the landing page.

Future Enhancements (Roadmap)
Full Authentication: Implement robust user authentication (email/password, Google Sign-In) using Firebase Auth.

AI Time Summary: Develop the AI to provide personalized time management insights and actionable advice.

Extracurricular Roadmap:

Integrate AI to suggest extracurriculars based on user profiles (interests, academic strengths, goals).

Allow users to track their participation and progress in activities.

Calendar Synchronization: Implement actual integration with Google Calendar and Microsoft Outlook Calendar for seamless schedule management.

Task Management: Add a dedicated section for managing daily tasks and assignments, potentially linked to the generated schedules.

Notifications: Implement in-app notifications for deadlines, study reminders, or new AI insights.

Progress Tracking: Visualize academic and extracurricular progress over time with charts and graphs.

User Profiles: Allow users to create and manage detailed profiles, including academic goals, interests, and preferences.

License
This project is open-source and available under the MIT License.
