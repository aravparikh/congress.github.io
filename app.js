import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, doc, addDoc, onSnapshot, query, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Global variables for Firebase instances and user data
let app;
let db;
let auth;
let currentUserId = null;
let gradesData = []; // To store fetched grades

// IMPORTANT: Replace this with YOUR OWN Firebase project configuration
// You can find this in your Firebase project settings (Project settings -> General -> Your apps -> Firebase SDK snippet -> Config)
const firebaseConfig = {
    apiKey: "AIzaSyBMDzrZurHNHR_5QMIGzCOisVoAxOJ0d08",
    authDomain: "congressional-app-challe-eb3be.firebaseapp.com",
    projectId: "congressional-app-challe-eb3be",
    storageBucket: "congressional-app-challe-eb3be.firebasestorage.app",
    messagingSenderId: "182459835746",
    appId: "1:182459835746:web:8ae5e7a988dc88bb7e383b",
    measurementId: "G-JRLCDXSSLT"
};

// Utility function to show messages
function showMessage(message, type) {
    const messageDiv = document.getElementById('grade-message');
    messageDiv.textContent = message;
    messageDiv.className = `p-3 rounded-lg ${type === 'success' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200' : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200'}`;
    messageDiv.classList.remove('hidden');
    setTimeout(() => {
        messageDiv.classList.add('hidden');
    }, 5000); // Hide after 5 seconds
}

// Function to show custom modal
function showCustomModal(title, message) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl text-center max-w-sm mx-auto">
            <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">${title}</h3>
            <p class="text-gray-700 dark:text-gray-300 mb-6">${message}</p>
            <button onclick="this.closest('.fixed').remove()" class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Got It!</button>
        </div>
    `;
    document.body.appendChild(modal);
}

// Function to switch between landing page and main app layout
function showPage(pageId) {
    const landingPage = document.getElementById('landing-page');
    const mainAppLayout = document.getElementById('main-app-layout');
    const appMainContentArea = document.getElementById('app-main-content-area'); // Reference to the main content area inside mainAppLayout

    // Hide all top-level containers first
    landingPage.classList.remove('active');
    landingPage.classList.add('hidden'); // Ensure it's display: none
    mainAppLayout.classList.remove('active');
    mainAppLayout.classList.add('hidden'); // Ensure it's display: none

    if (pageId === 'landing-page') {
        landingPage.classList.add('active');
        landingPage.classList.remove('hidden');
    } else {
        mainAppLayout.classList.add('active');
        mainAppLayout.classList.remove('hidden');

        // Hide all specific content pages within the main app layout
        appMainContentArea.querySelectorAll('.page-content').forEach(page => {
            page.classList.remove('active');
        });
        // Show the requested specific content page
        document.getElementById(pageId).classList.add('active');
    }

    // Update active state for navigation buttons (only for main app pages)
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('bg-indigo-100', 'dark:bg-indigo-700', 'text-indigo-700', 'dark:text-indigo-100');
        btn.classList.add('text-gray-600', 'dark:text-gray-300', 'hover:bg-gray-100', 'dark:hover:bg-gray-700');
    });
    if (pageId !== 'landing-page') {
        const activeNavButton = document.getElementById(`nav-${pageId.replace('-page', '')}`);
        if (activeNavButton) {
            activeNavButton.classList.add('bg-indigo-100', 'dark:bg-indigo-700', 'text-indigo-700', 'dark:text-indigo-100');
            activeNavButton.classList.remove('text-gray-600', 'dark:text-gray-300', 'hover:bg-gray-100', 'dark:hover:bg-gray-700');
        }
    }
}

// --- Firebase Initialization and Auth ---
async function initializeFirebase() {
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        // Check if the user has previously "started" the app
        const appStarted = localStorage.getItem('appStarted');

        // For GitHub Pages, we'll use anonymous sign-in by default
        // If you implement email/password or other auth, you'd replace this.
        await signInAnonymously(auth);

        onAuthStateChanged(auth, (user) => {
            if (user) {
                currentUserId = user.uid;
                document.getElementById('user-id-display').innerHTML = `User ID: <span class="font-mono break-all">${currentUserId}</span>`;
                setupFirestoreListeners();
            } else {
                // If for some reason anonymous sign-in fails or user is null, generate a random ID
                currentUserId = crypto.randomUUID();
                document.getElementById('user-id-display').innerHTML = `User ID: <span class="font-mono break-all">${currentUserId}</span>`;
                setupFirestoreListeners();
            }
            document.getElementById('loading-firebase').classList.add('hidden'); // Hide loading spinner

            // Decide which page to show initially
            if (appStarted === 'true') {
                showPage('dashboard-page');
                // Ensure dashboard nav item is active if we directly land there
                document.getElementById('nav-dashboard').classList.add('bg-indigo-100', 'dark:bg-indigo-700', 'text-indigo-700', 'dark:text-indigo-100');
                document.getElementById('nav-dashboard').classList.remove('text-gray-600', 'dark:text-gray-300', 'hover:bg-gray-100', 'dark:hover:bg-gray-700');
            } else {
                showPage('landing-page');
            }
        });
    } catch (error) {
        console.error("Error initializing Firebase:", error);
        document.getElementById('loading-firebase').classList.add('hidden');
        showCustomModal("Application Error", `Failed to load the application. Please try refreshing the page. Error: ${error.message}`);
    }
}

// --- Firestore Listeners ---
function setupFirestoreListeners() {
    if (!db || !currentUserId) {
        console.warn("Firestore or User ID not available for listeners.");
        return;
    }

    // Firestore collection path for grades (using user-specific data)
    const gradesCollectionRef = collection(db, `users/${currentUserId}/grades`);
    const q = query(gradesCollectionRef);

    onSnapshot(q, (snapshot) => {
        gradesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderGrades();
        renderDashboard(); // Update dashboard with latest grades
        document.getElementById('grades-list-loading').classList.add('hidden');
        document.getElementById('recent-grades-loading').classList.add('hidden');
    }, (error) => {
        console.error("Error fetching grades:", error);
        showMessage("Failed to load grades.", "error");
        document.getElementById('grades-list-loading').classList.add('hidden');
        document.getElementById('recent-grades-loading').classList.add('hidden');
    });
}

// --- Dashboard Logic ---
function calculateOverallGPA() {
    if (gradesData.length === 0) return "N/A";

    let totalWeightedScore = 0;
    let totalWeight = 0;

    gradesData.forEach(grade => {
        const score = parseFloat(grade.score) || 0;
        const weight = parseFloat(grade.weight) || 0; // Ensure weight is a number

        totalWeightedScore += (score * weight);
        totalWeight += weight;
    });

    if (totalWeight === 0) return "N/A"; // Avoid division by zero if no weighted grades
    return (totalWeightedScore / totalWeight).toFixed(2);
}

function renderDashboard() {
    document.getElementById('overall-gpa').textContent = calculateOverallGPA();

    const recentGradesList = document.getElementById('recent-grades-list');
    const noRecentGrades = document.getElementById('no-recent-grades');

    if (gradesData.length === 0) {
        recentGradesList.innerHTML = '';
        noRecentGrades.classList.remove('hidden');
    } else {
        noRecentGrades.classList.add('hidden');
        const tableHtml = `
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead class="bg-gray-50 dark:bg-gray-700">
                    <tr>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider rounded-tl-lg">
                            Course
                        </th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Assignment
                        </th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Score
                        </th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Weight
                        </th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider rounded-tr-lg">
                            Date
                        </th>
                    </tr>
                </thead>
                <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    ${gradesData.slice(0, 5).map(grade => `
                        <tr>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">${grade.course}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${grade.assignment}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${grade.score}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${grade.weight || 'N/A'}%</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${new Date(grade.date).toLocaleDateString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        recentGradesList.innerHTML = tableHtml;
    }
}


// --- Time Management Logic ---
async function generateSchedule() {
    const promptInput = document.getElementById('schedule-prompt');
    const scheduleOutputDiv = document.getElementById('generated-schedule-output');
    const scheduleContentDiv = document.getElementById('schedule-content');
    const scheduleErrorDiv = document.getElementById('schedule-error');
    const generateBtn = document.getElementById('generate-schedule-btn');
    const spinner = document.getElementById('generate-schedule-spinner');

    const prompt = promptInput.value.trim();

    if (!prompt) {
        scheduleErrorDiv.textContent = "Please enter a prompt for schedule generation.";
        scheduleErrorDiv.classList.remove('hidden');
        scheduleOutputDiv.classList.add('hidden');
        return;
    }

    // Reset state
    scheduleErrorDiv.classList.add('hidden');
    scheduleOutputDiv.classList.add('hidden');
    scheduleContentDiv.innerHTML = '';
    generateBtn.disabled = true;
    spinner.classList.remove('hidden');
    generateBtn.textContent = 'Generating...'; // Update button text

    try {
        const chatHistory = [];
        chatHistory.push({ role: "user", parts: [{ text: `Generate a detailed high school student schedule based on the following needs: ${prompt}. Include typical school hours, study time, breaks, and potential extracurriculars. Be realistic and provide a daily breakdown.` }] });
        const payload = { contents: chatHistory };
        // For security, the API key for Gemini is still hardcoded for this client-side app.
        // For production, consider a server-side proxy or a build step to inject it.
        const apiKey = firebaseConfig.apiKey; 
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            const text = result.candidates[0].content.parts[0].text;
            scheduleContentDiv.innerHTML = text.replace(/\n/g, '<br />'); // Preserve newlines as breaks
            scheduleOutputDiv.classList.remove('hidden');
        } else {
            scheduleErrorDiv.textContent = "Failed to generate schedule. Please try again.";
            scheduleErrorDiv.classList.remove('hidden');
            console.error("Unexpected API response structure:", result);
        }
    } catch (err) {
        scheduleErrorDiv.textContent = "An error occurred while generating the schedule. Please check your network connection.";
        scheduleErrorDiv.classList.remove('hidden');
        console.error("Fetch error:", err);
    } finally {
        generateBtn.disabled = false;
        spinner.classList.add('hidden');
        generateBtn.textContent = 'Generate Schedule'; // Reset button text
    }
}

// --- Grade Tracker Logic ---
function renderGrades() {
    const gradesTableBody = document.getElementById('grades-table-body');
    const noGradesRecorded = document.getElementById('no-grades-recorded');
    const gradesTableContainer = document.getElementById('grades-table-container');
    const courseAveragesSummary = document.getElementById('course-averages-summary');
    const courseAveragesList = document.getElementById('course-averages-list');

    gradesTableBody.innerHTML = ''; // Clear existing rows
    courseAveragesList.innerHTML = ''; // Clear existing averages

    if (gradesData.length === 0) {
        noGradesRecorded.classList.remove('hidden');
        gradesTableContainer.classList.add('hidden');
        courseAveragesSummary.classList.add('hidden');
    } else {
        noGradesRecorded.classList.add('hidden');
        gradesTableContainer.classList.remove('hidden');
        courseAveragesSummary.classList.remove('hidden');

        gradesData.forEach(grade => {
            const row = gradesTableBody.insertRow();
            // Ensure weight is displayed, default to 1 if not present (for older entries)
            const displayWeight = grade.weight !== undefined ? `${grade.weight}%` : 'N/A';
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">${grade.course}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${grade.assignment}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${grade.score}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${displayWeight}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${new Date(grade.date).toLocaleDateString()}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button data-id="${grade.id}" class="delete-grade-btn text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200 transition-colors duration-200" title="Delete Grade">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2 inline-block"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                    </button>
                </td>
            `;
        });

        // Render course averages
        const uniqueCourses = [...new Set(gradesData.map(g => g.course))];
        uniqueCourses.forEach(course => {
            const courseGrades = gradesData.filter(g => g.course.toLowerCase() === course.toLowerCase());
            
            let totalWeightedScore = 0;
            let totalWeight = 0;

            courseGrades.forEach(grade => {
                const score = parseFloat(grade.score) || 0;
                const weight = parseFloat(grade.weight) || 0;
                totalWeightedScore += (score * weight);
                totalWeight += weight;
            });

            const average = (totalWeight === 0) ? "N/A" : (totalWeightedScore / totalWeight).toFixed(2);

            const li = document.createElement('li');
            li.className = "flex justify-between items-center text-gray-700 dark:text-gray-300";
            li.innerHTML = `
                <span class="font-medium">${course}:</span>
                <span class="font-bold text-indigo-600 dark:text-indigo-400">${average}</span>
            `;
            courseAveragesList.appendChild(li);
        });
    }
}

async function addGrade(event) {
    event.preventDefault();
    if (!db || !currentUserId) {
        showMessage("Firebase not initialized. Please try again.", "error");
        return;
    }

    const course = document.getElementById('grade-course').value.trim();
    const assignment = document.getElementById('grade-assignment').value.trim();
    const score = document.getElementById('grade-score').value.trim();
    const weight = document.getElementById('grade-weight').value.trim(); // Get weight
    const date = document.getElementById('grade-date').value.trim();

    if (!course || !assignment || !score || !weight || !date) {
        showMessage("Please fill in all fields.", "error");
        return;
    }
    if (isNaN(parseFloat(score)) || parseFloat(score) < 0 || parseFloat(score) > 100) {
        showMessage("Score must be a number between 0 and 100.", "error");
        return;
    }
    if (isNaN(parseFloat(weight)) || parseFloat(weight) < 0 || parseFloat(weight) > 100) {
        showMessage("Weight must be a number between 0 and 100.", "error");
        return;
    }


    try {
        // Firestore collection path for grades (using user-specific data)
        const gradesCollectionRef = collection(db, `users/${currentUserId}/grades`);
        await addDoc(gradesCollectionRef, {
            course: course,
            assignment: assignment,
            score: parseFloat(score),
            weight: parseFloat(weight), // Save weight as a number
            date: date,
            timestamp: new Date().toISOString()
        });
        showMessage("Grade added successfully!", "success");
        document.getElementById('add-grade-form').reset(); // Reset form
        document.getElementById('grade-date').value = new Date().toISOString().split('T')[0]; // Set default date again
        document.getElementById('grade-weight').value = "1"; // Reset weight to default
    } catch (error) {
        console.error("Error adding grade:", error);
        showMessage("Failed to add grade.", "error");
    }
}

async function deleteGrade(gradeId) {
    if (!db || !currentUserId) {
        showMessage("Firebase not initialized. Please try again.", "error");
        return;
    }
    try {
        // Firestore document path for deleting a grade
        const gradeDocRef = doc(db, `users/${currentUserId}/grades`, gradeId);
        await deleteDoc(gradeDocRef);
        showMessage("Grade deleted successfully!", "success");
    } catch (error) {
        console.error("Error deleting grade:", error);
        showMessage("Failed to delete grade.", "error");
    }
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    initializeFirebase();

    // Set default date for grade input
    document.getElementById('grade-date').value = new Date().toISOString().split('T')[0];

    // Landing page button listeners
    document.getElementById('landing-get-started-btn').addEventListener('click', () => {
        localStorage.setItem('appStarted', 'true'); // Set flag
        showPage('dashboard-page');
    });
    document.getElementById('landing-see-features-btn').addEventListener('click', () => {
        const featuresSection = document.getElementById('features-section');
        featuresSection.classList.add('opacity-100', 'translate-y-0'); // Trigger fade-in animation
        featuresSection.scrollIntoView({ behavior: 'smooth' });
    });

    // Login/Signup button listeners (placeholders)
    document.getElementById('landing-login-btn').addEventListener('click', () => {
        showCustomModal("Login Feature", "Login functionality is coming soon!");
    });
    document.getElementById('landing-signup-btn').addEventListener('click', () => {
        showCustomModal("Sign Up Feature", "Sign up functionality is coming soon!");
    });

    // Navigation button event listeners (for main app)
    document.getElementById('nav-dashboard').addEventListener('click', () => showPage('dashboard-page'));
    document.getElementById('nav-time-management').addEventListener('click', () => showPage('time-management-page'));
    document.getElementById('nav-grade-tracker').addEventListener('click', () => showPage('grade-tracker-page'));
    document.getElementById('nav-extracurriculars').addEventListener('click', () => showPage('extracurriculars-page'));
    document.getElementById('nav-calendar-sync').addEventListener('click', () => showPage('calendar-sync-page'));

    // "Student Planner" title in sidebar listener
    document.getElementById('sidebar-app-title').addEventListener('click', () => {
        localStorage.removeItem('appStarted'); // Clear the flag
        showPage('landing-page'); // Redirect to landing page
        // Reset active nav item for dashboard if it was active
        document.getElementById('nav-dashboard').classList.remove('bg-indigo-100', 'dark:bg-indigo-700', 'text-indigo-700', 'dark:text-indigo-100');
        document.getElementById('nav-dashboard').classList.add('text-gray-600', 'dark:text-gray-300', 'hover:bg-gray-100', 'dark:hover:bg-gray-700');
    });


    // Logout button listener
    document.getElementById('logout-btn').addEventListener('click', async () => {
        try {
            await signOut(auth); // Sign out from Firebase
            localStorage.removeItem('appStarted'); // Clear the flag
            showPage('landing-page'); // Redirect to landing page
            // Reset active nav item for dashboard if it was active
            document.getElementById('nav-dashboard').classList.remove('bg-indigo-100', 'dark:bg-indigo-700', 'text-indigo-700', 'dark:text-indigo-100');
            document.getElementById('nav-dashboard').classList.add('text-gray-600', 'dark:text-gray-300', 'hover:bg-gray-100', 'dark:hover:bg-gray-700');
        } catch (error) {
            console.error("Error during logout:", error);
            showCustomModal("Logout Error", "Failed to log out. Please try again.");
        }
    });

    // Time Management button listener
    document.getElementById('generate-schedule-btn').addEventListener('click', generateSchedule);

    // Grade Tracker form submission
    document.getElementById('add-grade-form').addEventListener('submit', addGrade);

    // Event delegation for delete buttons in grades table
    document.getElementById('grades-table-body').addEventListener('click', (event) => {
        if (event.target.closest('.delete-grade-btn')) {
            const button = event.target.closest('.delete-grade-btn');
            const gradeId = button.dataset.id;
            deleteGrade(gradeId);
        }
    });

    // Placeholder for AI Time Summary button
    document.getElementById('generate-summary-btn').addEventListener('click', () => {
        showCustomModal("Feature Coming Soon!", "AI Time Summary feature is under development. Stay tuned!");
    });

    // Placeholder for AI Time Summary button on Time Management page
    document.getElementById('generate-time-summary-btn').addEventListener('click', () => {
        showCustomModal("Feature Coming Soon!", "AI Time Summary feature is under development. Stay tuned!");
    });

    // Placeholder for Extracurriculars button
    document.querySelector('#extracurriculars-page button').addEventListener('click', () => {
        showCustomModal("Feature Coming Soon!", "AI Extracurricular Suggestions feature is under development. Stay tuned!");
    });

    // Placeholder for Calendar Sync buttons
    document.querySelector('#calendar-sync-page button:nth-of-type(1)').addEventListener('click', () => {
        showCustomModal("Feature Coming Soon!", "Google Calendar Sync feature is under development. Stay tuned!");
    });
    document.querySelector('#calendar-sync-page button:nth-of-type(2)').addEventListener('click', () => {
        showCustomModal("Feature Coming Soon!", "Microsoft Calendar Sync feature is under development. Stay tuned!");
    });
});
