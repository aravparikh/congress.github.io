import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    signInAnonymously,
    onAuthStateChanged,
    signOut,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, doc, addDoc, onSnapshot, query, deleteDoc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Global variables for Firebase instances and user data
let app;
let db;
let auth;
let currentUserId = null;
let gradesData = []; // To store fetched grades

// Default GPA breakdown and percentage to letter grade rules
// These will be used if no custom settings are found in Firestore for a user
const defaultGpaBreakdown = {
    "A+": 4.3, "A": 4.0, "A-": 3.7,
    "B+": 3.3, "B": 3.0, "B-": 2.7,
    "C+": 2.3, "C": 2.0, "C-": 1.7,
    "D+": 1.3, "D": 1.0, "D-": 0.7,
    "F": 0.0
};

// Ordered from highest to lowest percentage for correct lookup
const defaultPercentageToLetterGradeRules = [
    { grade: "A+", min: 97, max: 100 },
    { grade: "A", min: 93, max: 96 },
    { grade: "A-", min: 90, max: 92 },
    { grade: "B+", min: 87, max: 89 },
    { grade: "B", min: 83, max: 86 },
    { grade: "B-", min: 80, max: 82 },
    { grade: "C+", min: 77, max: 79 },
    { grade: "C", min: 73, max: 76 },
    { grade: "C-", min: 70, max: 72 },
    { grade: "D+", min: 67, max: 69 },
    { grade: "D", min: 63, max: 66 },
    { grade: "D-", min: 60, max: 62 },
    { grade: "F", min: 0, max: 59 }
];

let userGpaBreakdown = { ...defaultGpaBreakdown };
let userPercentageToLetterGradeRules = [...defaultPercentageToLetterGradeRules];


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

// Utility function to show messages (for grade tracker)
function showMessage(message, type) {
    const messageDiv = document.getElementById('grade-message');
    messageDiv.textContent = message;
    messageDiv.className = `p-3 rounded-lg ${type === 'success' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200' : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200'}`;
    messageDiv.classList.remove('hidden');
    setTimeout(() => {
        messageDiv.classList.add('hidden');
    }, 5000); // Hide after 5 seconds
}

// Function to show custom modal (general purpose, e.g., for feature coming soon or password reset feedback)
function showCustomModal(title, message) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl text-center max-w-sm mx-auto relative">
            <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">${title}</h3>
            <p class="text-gray-700 dark:text-gray-300 mb-6">${message}</p>
            <button onclick="this.closest('.fixed').remove()" class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Got It!</button>
            <button class="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" onclick="this.closest('.fixed').remove()">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
        </div>
    `;
    document.body.appendChild(modal);
}

// Function to show authentication error messages
function showAuthError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
}

// Function to hide authentication error messages
function hideAuthError(elementId) {
    document.getElementById(elementId).classList.add('hidden');
}

// Function to toggle visibility of modals
function toggleModal(modalId, show) {
    document.getElementById(modalId).classList.toggle('hidden', !show);
}

// Function to switch between landing page and main app layout
function showPage(pageId) {
    const landingPage = document.getElementById('landing-page');
    const mainAppLayout = document.getElementById('main-app-layout');
    const appMainContentArea = document.getElementById('app-main-content-area');

    // Hide all top-level containers first
    landingPage.classList.add('hidden');
    mainAppLayout.classList.add('hidden');
    document.getElementById('login-modal').classList.add('hidden');
    document.getElementById('signup-modal').classList.add('hidden');

    if (pageId === 'landing-page') {
        landingPage.classList.remove('hidden');
    } else if (pageId === 'login-modal') {
        toggleModal('login-modal', true);
    } else if (pageId === 'signup-modal') {
        toggleModal('signup-modal', true);
    }
    else {
        // If trying to go to an app page, ensure user is authenticated
        if (auth.currentUser) {
            mainAppLayout.classList.remove('hidden');
            appMainContentArea.querySelectorAll('.page-content').forEach(page => {
                page.classList.remove('active');
            });
            document.getElementById(pageId).classList.add('active');

            // Special handling for settings page to render UI
            if (pageId === 'settings-page') {
                renderGPASettingsUI();
                renderPercentageSettingsUI();
            }

            // Update active state for navigation buttons
            document.querySelectorAll('.nav-item').forEach(btn => {
                btn.classList.remove('bg-indigo-100', 'dark:bg-indigo-700', 'text-indigo-700', 'dark:text-indigo-100');
                btn.classList.add('text-gray-600', 'dark:text-gray-300', 'hover:bg-gray-100', 'dark:hover:bg-gray-700');
            });
            const activeNavButton = document.getElementById(`nav-${pageId.replace('-page', '')}`);
            if (activeNavButton) {
                activeNavButton.classList.add('bg-indigo-100', 'dark:bg-indigo-700', 'text-indigo-700', 'dark:text-indigo-100');
                activeNavButton.classList.remove('text-gray-600', 'dark:text-gray-300', 'hover:bg-gray-100', 'dark:hover:bg-gray-700');
            }
        } else {
            // If not authenticated, redirect to landing page
            showPage('landing-page');
            showCustomModal("Access Denied", "Please log in or sign up to access the student planner features.");
        }
    }
}

// --- Firebase Initialization and Auth ---
async function initializeFirebase() {
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        onAuthStateChanged(auth, async (user) => { // Made async to await settings load
            document.getElementById('loading-firebase').classList.add('hidden'); // Hide loading spinner

            if (user) {
                currentUserId = user.uid;
                document.getElementById('user-id-display').innerHTML = `User ID: <span class="font-mono break-all">${currentUserId}</span>`;
                
                // Load user settings
                await loadUserSettings();
                setupFirestoreListeners(); // Set up grade listener AFTER settings are loaded

                // If user is logged in, and localStorage indicates they started the app, go to dashboard
                if (localStorage.getItem('appStarted') === 'true') {
                    showPage('dashboard-page');
                } else {
                    showPage('landing-page'); // Otherwise, show landing page
                }
            } else {
                // User is signed out or no user is logged in
                currentUserId = null; // Clear userId
                userGpaBreakdown = { ...defaultGpaBreakdown }; // Reset to defaults
                userPercentageToLetterGradeRules = [...defaultPercentageToLetterGradeRules]; // Reset to defaults
                document.getElementById('user-id-display').innerHTML = ''; // Clear display
                // Always show landing page if no user is logged in
                showPage('landing-page');
                // Also clear appStarted flag if user logs out
                localStorage.removeItem('appStarted');
            }
        });
    } catch (error) {
        console.error("Error initializing Firebase:", error);
        document.getElementById('loading-firebase').classList.add('hidden');
        showCustomModal("Application Error", `Failed to load the application. Please try refreshing the page. Error: ${error.message}`);
    }
}

// --- User Settings Management (New) ---
async function loadUserSettings() {
    if (!currentUserId) return;

    const settingsDocRef = doc(db, `users/${currentUserId}/settings`, 'gpa_config');
    try {
        const docSnap = await getDoc(settingsDocRef);
        if (docSnap.exists()) {
            const settings = docSnap.data();
            if (settings.gpaBreakdown) {
                userGpaBreakdown = settings.gpaBreakdown;
            }
            if (settings.percentageToLetterGradeRules) {
                userPercentageToLetterGradeRules = settings.percentageToLetterGradeRules;
                // Ensure rules are sorted correctly after loading
                userPercentageToLetterGradeRules.sort((a, b) => b.min - a.min);
            }
            console.log("User settings loaded:", userGpaBreakdown, userPercentageToLetterGradeRules);
        } else {
            // If no settings exist, create them with defaults
            await saveUserSettings();
        }
    } catch (error) {
        console.error("Error loading user settings:", error);
        // Fallback to defaults in case of error
        userGpaBreakdown = { ...defaultGpaBreakdown };
        userPercentageToLetterGradeRules = [...defaultPercentageToLetterGradeRules];
    }
}

async function saveUserSettings() {
    if (!currentUserId) return;

    const settingsDocRef = doc(db, `users/${currentUserId}/settings`, 'gpa_config');
    try {
        await setDoc(settingsDocRef, {
            gpaBreakdown: userGpaBreakdown,
            percentageToLetterGradeRules: userPercentageToLetterGradeRules
        });
        console.log("User settings saved.");
    } catch (error) {
        console.error("Error saving user settings:", error);
    }
}

// --- Authentication Functions ---
async function handleSignUp(event) {
    event.preventDefault();
    hideAuthError('signup-error-message'); // Always hide previous errors on new attempt
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // User is automatically signed in after creation
        currentUserId = userCredential.user.uid; // Ensure currentUserId is set for new users
        await saveUserSettings(); // Initialize settings for new user
        localStorage.setItem('appStarted', 'true');
        showPage('dashboard-page'); // Redirect to dashboard on successful sign-up
    } catch (error) {
        let errorMessage = "Failed to sign up.";
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = "This email is already in use.";
        } else if (error.code === 'auth/weak-password') {
            errorMessage = "Password should be at least 6 characters.";
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = "Invalid email address.";
        } else if (error.code === 'auth/operation-not-allowed') {
            errorMessage = "Email/Password sign-in is not enabled in Firebase. Please enable it in your Firebase project settings.";
        }
        showAuthError('signup-error-message', errorMessage);
        console.error("Sign up error:", error);
    }
}

async function handleLogin(event) {
    event.preventDefault();
    hideAuthError('login-error-message'); // Always hide previous errors on new attempt
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged will handle page redirection and settings loading
        localStorage.setItem('appStarted', 'true');
    } catch (error) {
        let errorMessage = "Failed to log in.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            errorMessage = "Invalid email or password.";
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = "Invalid email address.";
        } else if (error.code === 'auth/operation-not-allowed') {
            errorMessage = "Email/Password sign-in is not enabled in Firebase. Please enable it in your Firebase project settings.";
        }
        showAuthError('login-error-message', errorMessage);
        console.error("Login error:", error);
    }
}

async function handleGoogleSignIn(event) {
    event.preventDefault();
    hideAuthError('login-error-message'); // Clear login errors
    hideAuthError('signup-error-message'); // Clear signup errors

    const provider = new GoogleAuthProvider();
    try {
        const userCredential = await signInWithPopup(auth, provider);
        currentUserId = userCredential.user.uid; // Ensure currentUserId is set
        await loadUserSettings(); // Load or initialize settings for Google users
        localStorage.setItem('appStarted', 'true');
        showPage('dashboard-page');
    } catch (error) {
        let errorMessage = "Failed to sign in with Google.";
        if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = "Google sign-in popup was closed.";
        } else if (error.code === 'auth/cancelled-popup-request') {
            errorMessage = "Google sign-in was cancelled.";
        } else if (error.code === 'auth/operation-not-allowed') {
            errorMessage = "Google sign-in is not enabled in Firebase. Please enable it in your Firebase project settings.";
        }
        showAuthError('login-error-message', errorMessage); // Display error on login modal
        console.error("Google sign-in error:", error);
    }
}

async function handleForgotPassword() {
    hideAuthError('login-error-message'); // Clear any existing login errors
    const email = document.getElementById('login-email').value;

    if (!email) {
        showAuthError('login-error-message', "Please enter your email address to reset your password.");
        return;
    }

    try {
        await sendPasswordResetEmail(auth, email);
        showCustomModal("Password Reset", `If an account exists for ${email}, a password reset link has been sent to that email address. Please check your inbox.`);
        toggleModal('login-modal', false); // Close login modal after sending
    } catch (error) {
        let errorMessage = "Failed to send password reset email.";
        if (error.code === 'auth/user-not-found') {
            // For security reasons, Firebase often returns 'user-not-found' even if email is valid
            // to avoid revealing which emails are registered. We'll give a generic success message.
            showCustomModal("Password Reset", `If an account exists for ${email}, a password reset link has been sent to that email address. Please check your inbox.`);
            toggleModal('login-modal', false); // Close login modal
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = "Invalid email address format.";
        } else if (error.code === 'auth/operation-not-allowed') {
            errorMessage = "Email/Password sign-in is not enabled in Firebase. Please enable it in your Firebase project settings.";
        }
        showAuthError('login-error-message', errorMessage);
        console.error("Password reset error:", error);
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

    let totalWeightedGradePoints = 0;
    let totalWeight = 0;

    gradesData.forEach(grade => {
        const letterGrade = grade.letterGrade;
        const weight = parseFloat(grade.weight) || 0;
        const isAP = grade.isAP || false;

        let gradePoints = userGpaBreakdown[letterGrade];

        if (gradePoints === undefined) {
            console.warn(`GPA points not found for letter grade: ${letterGrade}. Using 0.`);
            gradePoints = 0;
        }

        // Apply AP weighting if applicable
        if (isAP) {
            gradePoints = Math.min(gradePoints + 1.0, 5.0); // Add 1.0 for AP, cap at 5.0
        }

        totalWeightedGradePoints += (gradePoints * weight);
        totalWeight += weight;
    });

    if (totalWeight === 0) return "N/A";
    return (totalWeightedGradePoints / totalWeight).toFixed(2);
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
                            Letter
                        </th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Weight
                        </th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            AP
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
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${grade.letterGrade || 'N/A'}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${grade.weight || 'N/A'}%</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${grade.isAP ? 'Yes' : 'No'}</td>
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

// Function to send current date to the Python API (from previous request)
async function sendCurrentDateToAI() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(today.getDate()).padStart(2, '0');
    const currentDateString = `${year}-${month}-${day}`;

    const messageDiv = document.getElementById('send-date-message');
    messageDiv.textContent = 'Sending date...';
    messageDiv.className = 'mt-2 text-sm text-gray-600 dark:text-gray-300';

    try {
        // IMPORTANT: Replace with the actual URL of your deployed Flask API
        // For local testing: 'http://127.0.0.1:5000/set_summary_date'
        // For deployment: 'https://your-api-domain.com/set_summary_date'
        const apiUrl = 'http://127.0.0.1:5000/set_summary_date'; // Change this for deployment

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ date: currentDateString })
        });

        const result = await response.json();

        if (response.ok) {
            messageDiv.textContent = `Date sent successfully: ${result.date}`;
            messageDiv.className = 'mt-2 text-sm text-green-600 dark:text-green-400';
        } else {
            messageDiv.textContent = `Error sending date: ${result.error || 'Unknown error'}`;
            messageDiv.className = 'mt-2 text-sm text-red-600 dark:text-red-400';
            console.error("API Error:", result);
        }
    } catch (error) {
        messageDiv.textContent = `Network error: Could not reach API.`;
        messageDiv.className = 'mt-2 text-sm text-red-600 dark:text-red-400';
        console.error("Fetch error:", error);
    }
}


// --- Grade Tracker Logic ---
// Helper to get letter grade from score based on user's rules
function getLetterGradeFromScore(score) {
    for (const rule of userPercentageToLetterGradeRules) {
        if (score >= rule.min && score <= rule.max) {
            return rule.grade;
        }
    }
    return "F"; // Default to F if no rule matches
}

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
            const displayWeight = grade.weight !== undefined ? `${grade.weight}%` : 'N/A';
            const displayAP = grade.isAP ? 'Yes' : 'No';
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">${grade.course}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${grade.assignment}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${grade.score}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${grade.letterGrade || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${displayWeight}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${displayAP}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${new Date(grade.date).toLocaleDateString()}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button data-id="${grade.id}" class="delete-grade-btn text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200 transition-colors duration-200" title="Delete Grade">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2 inline-block"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                    </button>
                </td>
            `;
        });

        // Render course averages
        const courseAverages = {};
        gradesData.forEach(grade => {
            const courseName = grade.course;
            if (!courseAverages[courseName]) {
                courseAverages[courseName] = { totalWeightedGradePoints: 0, totalWeight: 0 };
            }

            const letterGrade = grade.letterGrade;
            const weight = parseFloat(grade.weight) || 0;
            const isAP = grade.isAP || false;

            let gradePoints = userGpaBreakdown[letterGrade];
            if (gradePoints === undefined) {
                console.warn(`GPA points not found for letter grade: ${letterGrade} in course ${courseName}. Using 0.`);
                gradePoints = 0;
            }

            if (isAP) {
                gradePoints = Math.min(gradePoints + 1.0, 5.0); // Add 1.0 for AP, cap at 5.0
            }

            courseAverages[courseName].totalWeightedGradePoints += (gradePoints * weight);
            courseAverages[courseName].totalWeight += weight;
        });

        for (const courseName in courseAverages) {
            const avgData = courseAverages[courseName];
            const average = (avgData.totalWeight === 0) ? "N/A" : (avgData.totalWeightedGradePoints / avgData.totalWeight).toFixed(2);

            const li = document.createElement('li');
            li.className = "flex justify-between items-center text-gray-700 dark:text-gray-300";
            li.innerHTML = `
                <span class="font-medium">${courseName}:</span>
                <span class="font-bold text-indigo-600 dark:text-indigo-400">${average}</span>
            `;
            courseAveragesList.appendChild(li);
        }
    }
}

async function addGrade(event) {
    event.preventDefault();
    if (!db || !currentUserId) {
        showMessage("Firebase not initialized or user not logged in. Please log in to add grades.", "error");
        return;
    }

    const course = document.getElementById('grade-course').value.trim();
    const assignment = document.getElementById('grade-assignment').value.trim();
    const score = document.getElementById('grade-score').value.trim();
    const letterGrade = document.getElementById('grade-letter-grade').value.trim(); // New: Get letter grade
    const weight = document.getElementById('grade-weight').value.trim();
    const date = document.getElementById('grade-date').value.trim();
    const isAP = document.getElementById('grade-is-ap').checked; // New: Get AP status

    if (!course || !assignment || !score || !letterGrade || !weight || !date) {
        showMessage("Please fill in all required fields (Course, Assignment, Score, Letter Grade, Weight, Date).", "error");
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

    // Optional: Validate if entered letter grade matches calculated one (for consistency)
    const calculatedLetterGrade = getLetterGradeFromScore(parseFloat(score));
    if (calculatedLetterGrade !== letterGrade) {
        // You can choose to warn the user, or auto-correct, or allow override.
        // For now, we'll just log a warning.
        console.warn(`Entered letter grade (${letterGrade}) does not match calculated letter grade (${calculatedLetterGrade}) for score ${score}.`);
        // showMessage(`Warning: Entered letter grade (${letterGrade}) doesn't match calculated (${calculatedLetterGrade}). Please ensure consistency or update your percentage rules.`, "warning");
    }

    try {
        const gradesCollectionRef = collection(db, `users/${currentUserId}/grades`);
        await addDoc(gradesCollectionRef, {
            course: course,
            assignment: assignment,
            score: parseFloat(score),
            letterGrade: letterGrade, // Store letter grade
            weight: parseFloat(weight),
            date: date,
            isAP: isAP, // Store AP status
            timestamp: new Date().toISOString()
        });
        showMessage("Grade added successfully!", "success");
        document.getElementById('add-grade-form').reset();
        document.getElementById('grade-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('grade-weight').value = "1";
        document.getElementById('grade-is-ap').checked = false; // Reset AP checkbox
        document.getElementById('grade-letter-grade').value = ""; // Reset dropdown
    } catch (error) {
        console.error("Error adding grade:", error);
        showMessage("Failed to add grade.", "error");
    }
}

async function deleteGrade(gradeId) {
    if (!db || !currentUserId) {
        showMessage("Firebase not initialized or user not logged in. Please log in to delete grades.", "error");
        return;
    }
    try {
        const gradeDocRef = doc(db, `users/${currentUserId}/grades`, gradeId);
        await deleteDoc(gradeDocRef);
        showMessage("Grade deleted successfully!", "success");
    } catch (error) {
        console.error("Error deleting grade:", error);
        showMessage("Failed to delete grade.", "error");
    }
}

// --- Settings Page Logic (New) ---

// Render GPA Scale Configuration UI
function renderGPASettingsUI() {
    const tableBody = document.getElementById('gpa-scale-table-body');
    tableBody.innerHTML = ''; // Clear existing rows

    // Sort grades alphabetically for consistent display, A+ first
    const sortedGrades = Object.keys(userGpaBreakdown).sort((a, b) => {
        const order = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F"];
        return order.indexOf(a) - order.indexOf(b);
    });

    sortedGrades.forEach(grade => {
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">${grade}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <input
                    type="number"
                    step="0.1"
                    min="0"
                    class="gpa-input w-24 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500"
                    data-grade="${grade}"
                    value="${userGpaBreakdown[grade]}"
                />
            </td>
        `;
    });
}

// Save GPA Scale Configuration
async function saveGPASettings() {
    const newGpaBreakdown = {};
    const inputs = document.querySelectorAll('#gpa-scale-table-body .gpa-input');
    let isValid = true;
    inputs.forEach(input => {
        const grade = input.dataset.grade;
        const value = parseFloat(input.value);
        if (isNaN(value) || value < 0) {
            isValid = false;
            input.classList.add('border-red-500'); // Highlight error
        } else {
            newGpaBreakdown[grade] = value;
            input.classList.remove('border-red-500');
        }
    });

    if (!isValid) {
        document.getElementById('gpa-settings-message').textContent = "Please enter valid numbers for all grade points.";
        document.getElementById('gpa-settings-message').className = 'mt-2 text-sm text-red-600 dark:text-red-400';
        document.getElementById('gpa-settings-message').classList.remove('hidden');
        return;
    }

    userGpaBreakdown = newGpaBreakdown;
    await saveUserSettings();
    document.getElementById('gpa-settings-message').textContent = "GPA settings saved successfully!";
    document.getElementById('gpa-settings-message').className = 'mt-2 text-sm text-green-600 dark:text-green-400';
    document.getElementById('gpa-settings-message').classList.remove('hidden');
    // Re-render dashboard/grades to reflect new GPA immediately
    renderGrades();
    renderDashboard();
}

// Render Percentage to Letter Grade Rules UI
function renderPercentageSettingsUI() {
    const tableBody = document.getElementById('percentage-rules-table-body');
    tableBody.innerHTML = ''; // Clear existing rows

    // Ensure rules are sorted by min percentage descending for display
    userPercentageToLetterGradeRules.sort((a, b) => b.min - a.min);

    userPercentageToLetterGradeRules.forEach((rule, index) => {
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">${rule.grade}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    class="percentage-min-input w-24 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500"
                    data-index="${index}"
                    value="${rule.min}"
                />
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    class="percentage-max-input w-24 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500"
                    data-index="${index}"
                    value="${rule.max}"
                />
            </td>
        `;
    });
}

// Save Percentage to Letter Grade Rules
async function savePercentageSettings() {
    const newPercentageRules = [];
    const minInputs = document.querySelectorAll('#percentage-rules-table-body .percentage-min-input');
    const maxInputs = document.querySelectorAll('#percentage-rules-table-body .percentage-max-input');
    const gradeCells = document.querySelectorAll('#percentage-rules-table-body td:first-child');

    let isValid = true;
    for (let i = 0; i < minInputs.length; i++) {
        const grade = gradeCells[i].textContent;
        const minVal = parseFloat(minInputs[i].value);
        const maxVal = parseFloat(maxInputs[i].value);

        if (isNaN(minVal) || isNaN(maxVal) || minVal < 0 || maxVal > 100 || minVal > maxVal) {
            isValid = false;
            minInputs[i].classList.add('border-red-500');
            maxInputs[i].classList.add('border-red-500');
        } else {
            newPercentageRules.push({ grade: grade, min: minVal, max: maxVal });
            minInputs[i].classList.remove('border-red-500');
            maxInputs[i].classList.remove('border-red-500');
        }
    }

    if (!isValid) {
        document.getElementById('percentage-settings-message').textContent = "Please enter valid percentage ranges (0-100, min <= max).";
        document.getElementById('percentage-settings-message').className = 'mt-2 text-sm text-red-600 dark:text-red-400';
        document.getElementById('percentage-settings-message').classList.remove('hidden');
        return;
    }

    // Sort the rules by min percentage descending before saving for consistent lookup
    newPercentageRules.sort((a, b) => b.min - a.min);
    userPercentageToLetterGradeRules = newPercentageRules;
    await saveUserSettings();
    document.getElementById('percentage-settings-message').textContent = "Percentage rules saved successfully!";
    document.getElementById('percentage-settings-message').className = 'mt-2 text-sm text-green-600 dark:text-green-400';
    document.getElementById('percentage-settings-message').classList.remove('hidden');
    // Re-render the settings UI to show the sorted order
    renderPercentageSettingsUI();
}


// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    initializeFirebase();

    // Set default date for grade input
    document.getElementById('grade-date').value = new Date().toISOString().split('T')[0];

    // Landing page button listeners
    document.getElementById('landing-get-started-btn').addEventListener('click', () => {
        if (auth.currentUser) {
            localStorage.setItem('appStarted', 'true');
            showPage('dashboard-page');
        } else {
            showPage('login-modal');
        }
    });
    document.getElementById('landing-see-features-btn').addEventListener('click', () => {
        const featuresSection = document.getElementById('features-section');
        featuresSection.classList.add('opacity-100', 'translate-y-0');
        featuresSection.scrollIntoView({ behavior: 'smooth' });
    });

    // Login/Signup button listeners on landing page
    document.getElementById('landing-login-btn').addEventListener('click', () => showPage('login-modal'));
    document.getElementById('landing-signup-btn').addEventListener('click', () => showPage('signup-modal'));

    // Modal close buttons
    document.getElementById('close-login-modal').addEventListener('click', () => toggleModal('login-modal', false));
    document.getElementById('close-signup-modal').addEventListener('click', () => toggleModal('signup-modal', false));

    // Switch between login and signup forms
    document.getElementById('switch-to-signup').addEventListener('click', (e) => {
        e.preventDefault();
        toggleModal('login-modal', false);
        toggleModal('signup-modal', true);
        hideAuthError('login-error-message');
    });
    document.getElementById('switch-to-login').addEventListener('click', (e) => {
        e.preventDefault();
        toggleModal('signup-modal', false);
        toggleModal('login-modal', true);
        hideAuthError('signup-error-message');
    });

    // Authentication form submissions
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('signup-form').addEventListener('submit', handleSignUp);
    document.getElementById('login-google-btn').addEventListener('click', handleGoogleSignIn);
    document.getElementById('signup-google-btn').addEventListener('click', handleGoogleSignIn);

    // Forgot Password link listener
    document.getElementById('forgot-password-link').addEventListener('click', handleForgotPassword);


    // Navigation button event listeners (for main app)
    document.getElementById('nav-dashboard').addEventListener('click', () => showPage('dashboard-page'));
    document.getElementById('nav-time-management').addEventListener('click', () => showPage('time-management-page'));
    document.getElementById('nav-grade-tracker').addEventListener('click', () => showPage('grade-tracker-page'));
    document.getElementById('nav-extracurriculars').addEventListener('click', () => showPage('extracurriculars-page'));
    document.getElementById('nav-calendar-sync').addEventListener('click', () => showPage('calendar-sync-page'));
    document.getElementById('nav-settings').addEventListener('click', () => showPage('settings-page')); // NEW: Settings nav item

    // "Student Planner" title in sidebar listener
    document.getElementById('sidebar-app-title').addEventListener('click', () => {
        localStorage.removeItem('appStarted');
        showPage('landing-page');
        document.getElementById('nav-dashboard').classList.remove('bg-indigo-100', 'dark:bg-indigo-700', 'text-indigo-700', 'dark:text-indigo-100');
        document.getElementById('nav-dashboard').classList.add('text-gray-600', 'dark:text-gray-300', 'hover:bg-gray-100', 'dark:hover:bg-gray-700');
    });

    // Logout button listener
    document.getElementById('logout-btn').addEventListener('click', async () => {
        try {
            await signOut(auth);
            localStorage.removeItem('appStarted');
            showPage('landing-page');
            document.getElementById('nav-dashboard').classList.remove('bg-indigo-100', 'dark:bg-indigo-700', 'text-indigo-700', 'dark:text-indigo-100');
            document.getElementById('nav-dashboard').classList.add('text-gray-600', 'dark:text-gray-300', 'hover:bg-gray-100', 'dark:hover:bg-gray-700');
        } catch (error) {
            console.error("Error during logout:", error);
            showCustomModal("Logout Error", "Failed to log out. Please try again.");
        }
    });

    // Time Management button listener
    document.getElementById('generate-schedule-btn').addEventListener('click', generateSchedule);
    // Send Current Date to AI button listener (from previous request)
    document.getElementById('send-date-to-ai-btn').addEventListener('click', sendCurrentDateToAI);


    // Grade Tracker form submission
    document.getElementById('add-grade-form').addEventListener('submit', addGrade);

    // Event listener for score input to auto-populate letter grade
    document.getElementById('grade-score').addEventListener('input', (event) => {
        const score = parseFloat(event.target.value);
        if (!isNaN(score)) {
            document.getElementById('grade-letter-grade').value = getLetterGradeFromScore(score);
        } else {
            document.getElementById('grade-letter-grade').value = '';
        }
    });


    // Event delegation for delete buttons in grades table
    document.getElementById('grades-table-body').addEventListener('click', (event) => {
        if (event.target.closest('.delete-grade-btn')) {
            const button = event.target.closest('.delete-grade-btn');
            const gradeId = button.dataset.id;
            deleteGrade(gradeId);
        }
    });

    // Settings page save buttons
    document.getElementById('save-gpa-settings-btn').addEventListener('click', saveGPASettings);
    document.getElementById('save-percentage-settings-btn').addEventListener('click', savePercentageSettings);


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
