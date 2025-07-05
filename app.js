// app.js

// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
// Import Firestore modules
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, doc, deleteDoc, updateDoc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// YOUR FIREBASE CONFIGURATION - REPLACE WITH YOUR ACTUAL VALUES FROM FIREBASE CONSOLE
const firebaseConfig = {
  apiKey: "AIzaSyBMDzrZurHNHR_5QMIGzCOisVoAxOJ0d08",
  authDomain: "congressional-app-challe-eb3be.firebaseapp.com",
  projectId: "congressional-app-challe-eb3be",
  storageBucket: "congressional-app-challe-eb3be.firebase.app.com",
  messagingSenderId: "182459835746",
  appId: "1:182459835746:web:8ae5e7a988dc88bb7e383b",
  measurementId: "G-JRLCDXSSLT"
};


// Global variables (derived from firebaseConfig or set to null/defaults)
const appId = firebaseConfig.appId;
const initialAuthToken = null; // Set to null as it's not provided by your environment anymore

let app;
let auth;
let db; // This will now hold your Firestore instance

// GPA Calculator Data and Settings
// Note: userCourses will now be loaded from Firestore dynamically
// This is the default map, which can be overridden by user settings from Firestore
let gradePointMap = {
    'A+': 4.3,
    'A': 4.0,
    'A-': 3.7,
    'B+': 3.3,
    'B': 3.0,
    'B-': 2.7,
    'C+': 2.3,
    'C': 2.0,
    'C-': 1.7,
    'D+': 1.3,
    'D': 1.0,
    'D-': 0.7,
    'F': 0.0,
    'P': null, // Pass - ignored for GPA
    'NP': null, // Not Pass - ignored for GPA
    'I': null, // Incomplete - ignored for GPA
    'W': null  // Withdrawal - ignored for GPA
};

document.addEventListener('DOMContentLoaded', async () => {
    const loadingFirebase = document.getElementById('loading-firebase');
    const landingPage = document.getElementById('landing-page');
    const mainAppLayout = document.getElementById('main-app-layout');
    const userIdDisplay = document.getElementById('user-id-display');
    const sidebarAppTitle = document.getElementById('sidebar-app-title'); // Get the sidebar title element

    // Modals and their buttons
    const loginModal = document.getElementById('login-modal');
    const signupModal = document.getElementById('signup-modal');
    const landingLoginBtn = document.getElementById('landing-login-btn');
    const landingSignupBtn = document.getElementById('landing-signup-btn');
    const closeLoginModalBtn = document.getElementById('close-login-modal');
    const closeSignupModalBtn = document.getElementById('close-signup-modal');
    const switchToSignupBtn = document.getElementById('switch-to-signup');
    const switchToLoginBtn = document.getElementById('switch-to-login');
    const loginGoogleBtn = document.getElementById('login-google-btn'); // New: Get Google login button
    const signupGoogleBtn = document.getElementById('signup-google-btn'); // New: Get Google signup button


    // Navigation buttons
    const navDashboard = document.getElementById('nav-dashboard');
    const navTimeManagement = document.getElementById('nav-time-management');
    const navGradeTracker = document.getElementById('nav-grade-tracker');
    const navExtracurriculars = document.getElementById('nav-extracurriculars');
    const navCalendarSync = document.getElementById('nav-calendar-sync');
    const navSettings = document.getElementById('nav-settings');
    const logoutBtn = document.getElementById('logout-btn');

    // AI Chat elements
    const aiChatInput = document.getElementById('ai-chat-input');
    const sendAiChatBtn = document.getElementById('send-ai-chat-btn');
    const aiChatOutput = document.getElementById('ai-chat-output');
    const aiChatLoadingSpinner = document.getElementById('ai-chat-loading-spinner');
    const aiChatError = document.getElementById('ai-chat-error');

    // GPA Calculator elements
    const newCourseNameInput = document.getElementById('new-course-name');
    const newCourseCreditsInput = document.getElementById('new-course-credits');
    const newCourseGradeSelect = document.getElementById('new-course-grade');
    const addCourseBtn = document.getElementById('add-course-btn');
    const addCourseMessage = document.getElementById('add-course-message');
    const coursesListBody = document.getElementById('courses-list-body');
    const noCoursesRow = document.getElementById('no-courses-row');
    const gpaTotalCreditsDisplay = document.getElementById('gpa-total-credits');
    const gpaDisplay = document.getElementById('gpa-display');
    const gpaTableContainer = document.getElementById('gpa-table-container');
    const gpaSummary = document.getElementById('gpa-summary');
    const gradePointSettingsContainer = document.getElementById('grade-point-settings');
    const gradePointSettingsLoading = document.getElementById('grade-point-settings-loading');

    // GPA Planning Calculator elements
    const currentGpaInput = document.getElementById('current-gpa');
    const currentGpaCreditsInput = document.getElementById('current-gpa-credits');
    const additionalCreditsInput = document.getElementById('additional-credits');
    const targetGpaInput = document.getElementById('target-gpa');
    const calculatePlanningGpaBtn = document.getElementById('calculate-planning-gpa-btn');
    const planningGpaResultDiv = document.getElementById('planning-gpa-result');
    const requiredGpaDisplay = document.getElementById('required-gpa-display');
    const planningGpaMessage = document.getElementById('planning-gpa-message');

    // Dashboard GPA and Recent Grades elements
    const overallGpaDashboard = document.getElementById('overall-gpa');
    const recentGradesListDashboard = document.getElementById('recent-grades-list');
    const recentGradesLoadingDashboard = document.getElementById('recent-grades-loading');
    const noRecentGradesDashboard = document.getElementById('no-recent-grades');

    // Settings page elements
    const deleteUserDataBtn = document.getElementById('delete-user-data-btn');
    const deleteUserDataMessage = document.getElementById('delete-user-data-message');


    // Function to display a specific page
    const displayPage = async (pageId) => { // Made async to await settings/grades load
        document.querySelectorAll('.page-content').forEach(page => {
            page.classList.remove('active');
        });
        document.getElementById(pageId).classList.add('active');

        // Special handling for Grade Tracker page
        if (pageId === 'grade-tracker-page') {
            await loadGradePointSettings(); // Load settings first
            await loadGrades(); // Then load and render the GPA calculator
        } else if (pageId === 'dashboard-page') {
            await updateDashboardGrades(); // Update dashboard when navigating to it
        }

        // Update active navigation item styling
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('bg-indigo-100', 'dark:bg-indigo-700', 'text-indigo-600', 'dark:text-indigo-100');
            item.classList.add('text-gray-600', 'dark:text-gray-300');
        });
        const activeNavItem = document.getElementById(`nav-${pageId.replace('-page', '')}`);
        if (activeNavItem) {
            activeNavItem.classList.add('bg-indigo-100', 'dark:bg-indigo-700', 'text-indigo-600', 'dark:text-indigo-100');
            activeNavItem.classList.remove('text-gray-600', 'dark:text-gray-300');
        }
    };

    // Initialize Firebase App and Firestore
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app); // Initialize Firestore here
    } catch (error) {
        console.error("Firebase initialization error:", error);
        loadingFirebase.innerHTML = `<div class="text-red-600 dark:text-red-400">Error initializing Firebase. Please check your configuration and ensure you are connected to the internet.</div>`;
        return; // Stop execution if Firebase fails to initialize
    }

    // Firebase Auth State Listener
    onAuthStateChanged(auth, async (user) => {
        loadingFirebase.classList.add('hidden'); // Hide loading spinner once auth state is known
        if (user) {
            // User is signed in
            console.log("Firebase Auth State Changed: User signed in", user.uid);
            landingPage.classList.add('hidden');
            mainAppLayout.classList.remove('hidden');
            const userId = user.uid || crypto.randomUUID(); // Fallback for anonymous
            userIdDisplay.textContent = `User ID: ${userId}`;
            // Initial data loads after successful authentication
            await loadGradePointSettings(); // Load settings first
            await loadGrades(); // Load grades for Grade Tracker
            await updateDashboardGrades(); // Update dashboard
            displayPage('dashboard-page'); // Show dashboard by default after login
        } else {
            // User is signed out
            console.log("Firebase Auth State Changed: User signed out.");
            landingPage.classList.remove('hidden');
            mainAppLayout.classList.add('hidden');
            loginModal.classList.add('hidden');
            signupModal.classList.add('hidden');
            // Clear any displayed user data if signed out
            overallGpaDashboard.textContent = 'N/A';
            recentGradesListDashboard.innerHTML = '';
            noRecentGradesDashboard.classList.remove('hidden');
            coursesListBody.innerHTML = `<tr><td colspan="6" class="px-6 py-4 whitespace-nowrap text-center text-gray-500 dark:text-gray-400">Please log in to view your courses.</td></tr>`;
            gpaDisplay.textContent = '0.00';
            gpaTotalCreditsDisplay.textContent = '0.0';
        }
    });

    // Initial sign-in with custom token or anonymously
    // This runs only once when the page loads, attempting to sign in.
    // The onAuthStateChanged listener will handle subsequent UI updates.
    if (initialAuthToken) {
        try {
            await signInWithCustomToken(auth, initialAuthToken);
        } catch (error) {
            console.error("Error signing in with custom token:", error);
            // Fallback to anonymous sign-in if custom token fails
            try {
                await signInAnonymously(auth);
            } catch (anonError) {
                console.error("Error signing in anonymously:", anonError);
                loadingFirebase.innerHTML = `<div class="text-red-600 dark:text-red-400">Authentication failed. Please try again later.</div>`;
            }
        }
    } else {
        try {
            await signInAnonymously(auth);
        } catch (anonError) {
            console.error("Error signing in anonymously:", anonError);
            loadingFirebase.innerHTML = `<div class="text-red-600 dark:text-red-400">Authentication failed. Please try again later.</div>`;
        }
    }


    // --- Landing Page Button Handlers ---
    landingLoginBtn.addEventListener('click', () => loginModal.classList.remove('hidden'));
    landingSignupBtn.addEventListener('click', () => signupModal.classList.remove('hidden'));
    document.getElementById('landing-get-started-btn').addEventListener('click', () => signupModal.classList.remove('hidden'));
    // Removed the event listener for landing-see-features-btn as the section will be visible by default


    // --- Modal Switchers and Closers ---
    closeLoginModalBtn.addEventListener('click', () => loginModal.classList.add('hidden'));
    closeSignupModalBtn.addEventListener('click', () => signupModal.classList.add('hidden'));
    switchToSignupBtn.addEventListener('click', () => {
        loginModal.classList.add('hidden');
        signupModal.classList.remove('hidden');
    });
    switchToLoginBtn.addEventListener('click', () => {
        signupModal.classList.add('hidden');
        loginModal.classList.remove('hidden');
    });

    // --- Firebase Auth Forms (simplified for demonstration) ---
    // These are for email/password, which are currently simulated.
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorMessage = document.getElementById('login-error-message');
        errorMessage.classList.add('hidden');
        try {
            // In a real app, you'd use signInWithEmailAndPassword(auth, email, password);
            console.log("Login attempt (email/password not fully implemented for demo)");
            // For now, just simulate success and switch to app layout
            loginModal.classList.add('hidden');
            mainAppLayout.classList.remove('hidden');
            landingPage.classList.add('hidden');
            displayPage('dashboard-page');
        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.classList.remove('hidden');
        }
    });

    document.getElementById('signup-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const errorMessage = document.getElementById('signup-error-message');
        errorMessage.classList.add('hidden');
        try {
            // In a real app, you'd use createUserWithEmailAndPassword(auth, email, password);
            console.log("Signup attempt (email/password not fully implemented for demo)");
            // For now, just simulate success and switch to app layout
            signupModal.classList.add('hidden');
            mainAppLayout.classList.remove('hidden');
            landingPage.classList.add('hidden');
            displayPage('dashboard-page');
        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.classList.remove('hidden');
        }
    });

    // --- Google Sign-In/Sign-Up Buttons ---
    // Create a Google Auth provider instance
    const googleProvider = new GoogleAuthProvider();

    // Event listener for Google Login button
    loginGoogleBtn.addEventListener('click', async () => {
        try {
            await signInWithPopup(auth, googleProvider);
            // onAuthStateChanged listener will handle UI update upon successful sign-in
            loginModal.classList.add('hidden'); // Hide modal if it's still open
        } catch (error) {
            console.error("Google Login Error:", error);
            // Handle specific errors for Google Sign-In
            let errorMessage = "Google Sign-In failed. Please try again.";
            if (error.code === 'auth/popup-closed-by-user') {
                errorMessage = "Google Sign-In window closed. Please try again.";
            } else if (error.code === 'auth/cancelled-popup-request') {
                errorMessage = "Another sign-in request is in progress. Please try again.";
            }
            showCustomAlert(errorMessage); // Use your custom alert
        }
    });

    // Event listener for Google Signup button (can use the same signInWithPopup)
    signupGoogleBtn.addEventListener('click', async () => {
        try {
            await signInWithPopup(auth, googleProvider);
            // onAuthStateChanged listener will handle UI update upon successful sign-in
            signupModal.classList.add('hidden'); // Hide modal if it's still open
        } catch (error) {
            console.error("Google Signup Error:", error);
            let errorMessage = "Google Sign-Up failed. Please try again.";
            if (error.code === 'auth/popup-closed-by-user') {
                errorMessage = "Google Sign-Up window closed. Please try again.";
            } else if (error.code === 'auth/cancelled-popup-request') {
                errorMessage = "Another sign-up request is in progress. Please try again.";
            }
            showCustomAlert(errorMessage); // Use your custom alert
        }
    });


    // Logout button
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            // onAuthStateChanged will handle UI update
        } catch (error) {
            console.error("Error logging out:", error);
        }
    });

    // --- Navigation Handlers ---
    navDashboard.addEventListener('click', () => displayPage('dashboard-page'));
    navTimeManagement.addEventListener('click', () => displayPage('time-management-page'));
    navGradeTracker.addEventListener('click', () => displayPage('grade-tracker-page'));
    navExtracurriculars.addEventListener('click', () => displayPage('extracurriculars-page'));
    navCalendarSync.addEventListener('click', () => displayPage('calendar-sync-page'));
    navSettings.addEventListener('click', () => displayPage('settings-page'));

    // Add event listener for the sidebar app title to redirect to dashboard
    sidebarAppTitle.addEventListener('click', () => displayPage('dashboard-page'));


    // --- AI Chat Functionality ---
    sendAiChatBtn.addEventListener('click', sendAIChatMessage);
    aiChatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Prevent new line
            sendAIChatMessage();
        }
    });

    async function sendAIChatMessage() {
        const userText = aiChatInput.value.trim();
        if (userText === '') {
            aiChatError.textContent = 'Please enter a message.';
            aiChatError.classList.remove('hidden');
            return;
        }

        aiChatError.classList.add('hidden');
        aiChatLoadingSpinner.classList.remove('hidden');
        sendAiChatBtn.disabled = true;
        aiChatInput.disabled = true;

        // Display user message
        const userMessageDiv = document.createElement('div');
        userMessageDiv.className = 'flex justify-end mb-2';
        userMessageDiv.innerHTML = `<div class="bg-indigo-500 text-white p-3 rounded-lg max-w-[80%]">${userText}</div>`;
        aiChatOutput.prepend(userMessageDiv); // Add to top to maintain reverse order

        aiChatInput.value = ''; // Clear input

        try {
            const response = await fetch('https://student-planner-backend.onrender.com/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ user_text: userText })
            });

            const data = await response.json();

            if (response.ok) {
                const aiMessageDiv = document.createElement('div');
                aiMessageDiv.className = 'flex justify-start mb-2';
                aiMessageDiv.innerHTML = `<div class="bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-100 p-3 rounded-lg max-w-[80%] prose dark:prose-invert">${data.response.replace(/\n/g, '<br>')}</div>`;
                aiChatOutput.prepend(aiMessageDiv); // Add to top
            } else {
                aiChatError.textContent = `Error: ${data.error || 'Something went wrong on the server.'}`;
                aiChatError.classList.remove('hidden');
                const errorMessageDiv = document.createElement('div');
                errorMessageDiv.className = 'flex justify-start mb-2';
                errorMessageDiv.innerHTML = `<div class="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-3 rounded-lg max-w-[80%]">Error: ${data.error || 'Something went wrong.'}</div>`;
                aiChatOutput.prepend(errorMessageDiv);
            }
        } catch (error) {
            console.error('Fetch error:', error);
            aiChatError.textContent = 'Could not connect to the AI server. Please ensure the Python backend is running.';
            aiChatError.classList.remove('hidden');
            const errorMessageDiv = document.createElement('div');
            errorMessageDiv.className = 'flex justify-start mb-2';
            errorMessageDiv.innerHTML = `<div class="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-3 rounded-lg max-w-[80%]">Error: Could not connect to the AI server.</div>`;
            aiChatOutput.prepend(errorMessageDiv);
        } finally {
            aiChatLoadingSpinner.classList.add('hidden');
            sendAiChatBtn.disabled = false;
            aiChatInput.disabled = false;
            aiChatOutput.scrollTop = 0; // Scroll to top (since we prepend)
        }
    }

    // --- GPA Calculator Functions (Now uses Firestore) ---

    // Function to load grade point settings from Firestore
    async function loadGradePointSettings() {
        const userId = auth.currentUser ? auth.currentUser.uid : null;
        if (!userId) {
            gradePointSettingsLoading.classList.add('hidden');
            renderGradePointSettings(); // Render defaults if not logged in
            return;
        }

        gradePointSettingsLoading.classList.remove('hidden');
        try {
            const settingsDocRef = doc(db, `users/${userId}/settings/gpaSettings`);
            const docSnap = await getDoc(settingsDocRef);

            if (docSnap.exists()) {
                // Merge fetched settings with default, prioritizing fetched
                Object.assign(gradePointMap, docSnap.data());
                console.log("Loaded custom GPA settings:", gradePointMap);
            } else {
                // If no settings exist, save the default map for the user
                await setDoc(settingsDocRef, gradePointMap);
                console.log("Saved default GPA settings for new user.");
            }
        } catch (e) {
            console.error("Error loading or saving GPA settings:", e);
            // Fallback to default gradePointMap if there's an error
            showCustomAlert("Error loading GPA settings. Using default values.");
        } finally {
            gradePointSettingsLoading.classList.add('hidden');
            renderGradePointSettings(); // Always render settings after loading (or failing to load)
        }
    }

    // Function to save grade point settings to Firestore
    async function saveGradePointSettings(newSettings) {
        const userId = auth.currentUser ? auth.currentUser.uid : null;
        if (!userId) {
            console.warn("Not logged in, cannot save GPA settings.");
            return;
        }
        try {
            const settingsDocRef = doc(db, `users/${userId}/settings/gpaSettings`);
            await setDoc(settingsDocRef, newSettings);
            console.log("GPA settings saved successfully!");
        } catch (e) {
            console.error("Error saving GPA settings:", e);
            showCustomAlert("Error saving GPA settings. Please try again.");
        }
    }

    // Renders the grade point settings inputs
    const renderGradePointSettings = () => {
        gradePointSettingsContainer.innerHTML = ''; // Clear previous settings
        gradePointSettingsLoading.classList.add('hidden'); // Hide loading text

        for (const grade in gradePointMap) {
            if (gradePointMap[grade] !== null) { // Only render for grades with numerical points
                const settingDiv = document.createElement('div');
                settingDiv.className = 'flex items-center space-x-2';
                settingDiv.innerHTML = `
                    <label for="gp-${grade}" class="text-gray-700 dark:text-gray-300 font-medium">${grade}:</label>
                    <input type="number" id="gp-${grade}"
                           class="w-full rounded-md border-gray-300 shadow-sm sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 p-1"
                           step="0.1" min="0" max="4.3" value="${gradePointMap[grade].toFixed(1)}">
                `;
                gradePointSettingsContainer.appendChild(settingDiv);

                const inputElement = settingDiv.querySelector(`#gp-${grade}`);
                inputElement.addEventListener('input', (e) => {
                    const newPoints = parseFloat(e.target.value);
                    if (!isNaN(newPoints) && newPoints >= 0 && newPoints <= 4.3) {
                        gradePointMap[grade] = newPoints;
                        saveGradePointSettings(gradePointMap); // Save changes to Firestore
                        loadGrades(); // Recalculate and re-render GPA based on new map
                    }
                });
            }
        }
    };

    // Calculates GPA based on provided courses and gradePointMap
    const calculateGPA = (courses) => {
        let totalWeightedPoints = 0;
        let totalCredits = 0;

        courses.forEach(course => {
            const gradePoints = gradePointMap[course.grade];
            if (gradePoints !== null && gradePoints !== undefined) { // Only count grades that affect GPA
                totalWeightedPoints += gradePoints * course.credits;
                totalCredits += course.credits;
            }
        });

        const gpa = totalCredits > 0 ? (totalWeightedPoints / totalCredits) : 0;
        return { gpa: gpa.toFixed(2), totalCredits: totalCredits.toFixed(1) };
    };

    // Loads grades from Firestore and renders the courses table and updates GPA display
    async function loadGrades() {
        const userId = auth.currentUser ? auth.currentUser.uid : null;
        if (!userId) {
            coursesListBody.innerHTML = `<tr><td colspan="6" class="px-6 py-4 whitespace-nowrap text-center text-gray-500 dark:text-gray-400">Please log in to view your courses.</td></tr>`;
            noCoursesRow.classList.add('hidden'); // Hide if explicitly showing login message
            gpaDisplay.textContent = '0.00';
            gpaTotalCreditsDisplay.textContent = '0.0';
            gpaTableContainer.classList.add('hidden');
            gpaSummary.classList.add('hidden');
            return;
        }

        // Show loading state for grade tracker table
        noCoursesRow.classList.add('hidden'); // Hide "No courses added yet" while loading
        coursesListBody.innerHTML = `<tr><td colspan="6" class="px-6 py-4 whitespace-nowrap text-center text-gray-500 dark:text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-loader-2 animate-spin inline-block mr-2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Loading courses...
        </td></tr>`;

        let currentCourses = []; // Local array to hold fetched courses
        try {
            const gradesCollectionRef = collection(db, `users/${userId}/grades`);
            // Order by timestamp to ensure consistent loading order, useful for recent grades later
            const q = query(gradesCollectionRef, orderBy('timestamp', 'desc'));
            const querySnapshot = await getDocs(q);

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                currentCourses.push({ id: doc.id, ...data });
            });

            coursesListBody.innerHTML = ''; // Clear loading/no courses message

            if (currentCourses.length === 0) {
                noCoursesRow.classList.remove('hidden');
                gpaTableContainer.classList.add('hidden');
                gpaSummary.classList.add('hidden');
            } else {
                noCoursesRow.classList.add('hidden'); // Ensure it's hidden if courses exist
                gpaTableContainer.classList.remove('hidden');
                gpaSummary.classList.remove('hidden');

                currentCourses.forEach(course => {
                    const gradePoint = gradePointMap[course.grade];
                    const weightedPoints = gradePoint !== null && gradePoint !== undefined ? (gradePoint * course.credits).toFixed(2) : 'N/A';
                    const gradePointsDisplay = gradePoint !== null && gradePoint !== undefined ? gradePoint.toFixed(1) : 'N/A';

                    const row = document.createElement('tr');
                    row.className = 'hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150';
                    row.innerHTML = `
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">${course.name || 'Unnamed Course'}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">${course.credits.toFixed(1)}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">${course.grade}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">${gradePointsDisplay}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">${weightedPoints}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button data-id="${course.id}" class="delete-course-btn text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                            </button>
                        </td>
                    `;
                    coursesListBody.appendChild(row);
                });

                document.querySelectorAll('.delete-course-btn').forEach(button => {
                    button.addEventListener('click', deleteCourse);
                });
            }

            const { gpa, totalCredits } = calculateGPA(currentCourses);
            gpaTotalCreditsDisplay.textContent = totalCredits;
            gpaDisplay.textContent = gpa;

            // renderGradePointSettings is now called by loadGradePointSettings
            // to ensure gradePointMap is up-to-date before rendering settings.

        } catch (e) {
            console.error("Error loading grades: ", e);
            coursesListBody.innerHTML = `<tr><td colspan="6" class="px-6 py-4 whitespace-nowrap text-center text-red-600 dark:text-red-400">Error loading courses.</td></tr>`;
            noCoursesRow.classList.add('hidden');
            gpaTableContainer.classList.add('hidden');
            gpaSummary.classList.add('hidden');
        }
    }

    // Event listener for adding a new course
    addCourseBtn.addEventListener('click', async () => {
        const userId = auth.currentUser ? auth.currentUser.uid : null;
        if (!userId) {
            addCourseMessage.textContent = "You must be logged in to add courses.";
            addCourseMessage.classList.remove('hidden');
            return;
        }

        const courseName = newCourseNameInput.value.trim();
        const credits = parseFloat(newCourseCreditsInput.value);
        const grade = newCourseGradeSelect.value;

        if (isNaN(credits) || credits <= 0 || !grade) {
            addCourseMessage.textContent = "Please enter valid credits (a number greater than 0) and select a grade.";
            addCourseMessage.classList.remove('hidden');
            return;
        }
        addCourseMessage.classList.add('hidden'); // Hide any previous error messages

        try {
            await addDoc(collection(db, `users/${userId}/grades`), {
                name: courseName || "Unnamed Course", // Allow optional name
                credits: credits,
                grade: grade,
                timestamp: new Date() // Add a timestamp for sorting recent grades
            });
            newCourseNameInput.value = '';
            newCourseCreditsInput.value = '1.0';
            newCourseGradeSelect.value = '';
            await loadGrades(); // Reload and render grades after adding
            await updateDashboardGrades(); // Update dashboard
        } catch (e) {
            console.error("Error adding document: ", e);
            showCustomAlert("Error adding course. Please try again.");
        }
    });

    // Function to delete a course from Firestore
    async function deleteCourse(event) {
        const userId = auth.currentUser ? auth.currentUser.uid : null;
        if (!userId) return;

        showCustomConfirm("Are you sure you want to delete this course?", async () => {
            const courseId = event.currentTarget.dataset.id;
            try {
                await deleteDoc(doc(db, `users/${userId}/grades`, courseId));
                await loadGrades(); // Reload grades after deletion
                await updateDashboardGrades(); // Update dashboard
            } catch (e) {
                console.error("Error deleting document: ", e);
                showCustomAlert("Error deleting course. Please try again.");
            }
        });
    }

    // Function to update Recent Grades and Overall GPA on Dashboard
    async function updateDashboardGrades() {
        recentGradesLoadingDashboard.classList.remove('hidden');
        recentGradesListDashboard.innerHTML = '';
        noRecentGradesDashboard.classList.add('hidden');
        overallGpaDashboard.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-loader-2 animate-spin inline-block mr-2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`;


        const userId = auth.currentUser ? auth.currentUser.uid : null;
        if (!userId) {
            recentGradesLoadingDashboard.classList.add('hidden');
            noRecentGradesDashboard.classList.remove('hidden');
            overallGpaDashboard.textContent = 'N/A';
            return;
        }

        let allCourses = [];
        try {
            // Ensure gradePointMap is loaded before calculating GPA for dashboard
            await loadGradePointSettings();

            const gradesCollectionRef = collection(db, `users/${userId}/grades`);
            // Get all courses to calculate overall GPA
            const allCoursesQuerySnapshot = await getDocs(gradesCollectionRef);

            allCoursesQuerySnapshot.forEach((doc) => {
                allCourses.push({ id: doc.id, ...doc.data() });
            });

            // Calculate overall GPA for dashboard
            const { gpa } = calculateGPA(allCourses);
            overallGpaDashboard.textContent = gpa;

            // Query for recent grades (e.g., last 5, ordered by timestamp descending)
            // Note: We are re-querying here for simplicity, but in a larger app,
            // you might pass `allCourses` and sort locally if you already fetched all.
            const qRecent = query(gradesCollectionRef, orderBy('timestamp', 'desc'), limit(5));
            const recentGradesQuerySnapshot = await getDocs(qRecent);

            recentGradesLoadingDashboard.classList.add('hidden');

            if (recentGradesQuerySnapshot.empty) {
                noRecentGradesDashboard.classList.remove('hidden');
            } else {
                recentGradesQuerySnapshot.forEach((doc) => {
                    const data = doc.data();
                    const gradeItem = document.createElement('div');
                    gradeItem.className = 'flex items-center justify-between py-2 border-b last:border-b-0 border-gray-200 dark:border-gray-700';
                    gradeItem.innerHTML = `
                        <span class="text-gray-800 dark:text-gray-200">${data.name || 'Unnamed Course'}</span>
                        <span class="text-lg font-semibold text-indigo-600 dark:text-indigo-400">${data.grade}</span>
                    `;
                    recentGradesListDashboard.appendChild(gradeItem);
                });
            }
        } catch (e) {
            console.error("Error updating dashboard grades:", e);
            recentGradesLoadingDashboard.classList.add('hidden');
            noRecentGradesDashboard.classList.remove('hidden');
            recentGradesListDashboard.innerHTML = `<p class="text-red-600 dark:text-red-400">Error loading recent grades.</p>`;
            overallGpaDashboard.textContent = 'Error';
        }
    }

    // --- GPA Planning Calculator Logic ---
    calculatePlanningGpaBtn.addEventListener('click', () => {
        const currentGpa = parseFloat(currentGpaInput.value);
        const currentCredits = parseFloat(currentGpaCreditsInput.value);
        const additionalCredits = parseFloat(additionalCreditsInput.value);
        const targetGpa = parseFloat(targetGpaInput.value);

        planningGpaResultDiv.classList.add('hidden');
        planningGpaMessage.classList.add('hidden');
        requiredGpaDisplay.textContent = 'N/A';

        if (isNaN(currentGpa) || isNaN(currentCredits) || isNaN(additionalCredits) || isNaN(targetGpa) ||
            currentCredits < 0 || additionalCredits <= 0 || targetGpa < 0) {
            planningGpaMessage.textContent = 'Please enter valid numbers for all fields. Current Credits must be >= 0, Additional Credits must be > 0.';
            planningGpaMessage.classList.remove('hidden');
            return;
        }

        // Formula: Required GPA = (Target Total Points - Current Total Points) / Additional Credits
        // Target Total Points = Target GPA * (Current Credits + Additional Credits)
        // Current Total Points = Current GPA * Current Credits
        const targetTotalPoints = targetGpa * (currentCredits + additionalCredits);
        const currentTotalPoints = currentGpa * currentCredits;

        const requiredGpaPoints = (targetTotalPoints - currentTotalPoints);

        if (additionalCredits === 0 && requiredGpaPoints > 0) {
            planningGpaMessage.textContent = 'Cannot reach target GPA with 0 additional credits if current GPA is lower.';
            planningGpaMessage.classList.remove('hidden');
            return;
        } else if (additionalCredits === 0 && requiredGpaPoints <= 0) {
            requiredGpaDisplay.textContent = 'N/A (already at/above target or 0 additional credits)';
            planningGpaResultDiv.classList.remove('hidden');
            return;
        }


        const requiredGpa = requiredGpaPoints / additionalCredits;

        if (requiredGpa < 0) {
            requiredGpaDisplay.textContent = `0.00 (You'll easily reach your target even with Fs!)`;
            planningGpaResultDiv.classList.remove('hidden');
        } else if (requiredGpa > 4.3) { // Assuming 4.3 is the max possible GPA
            requiredGpaDisplay.textContent = `${requiredGpa.toFixed(2)} (Impossible to achieve)`;
            planningGpaResultDiv.classList.remove('hidden');
            planningGpaMessage.textContent = 'It appears impossible to reach your target GPA with the given credits.';
            planningGpaMessage.classList.remove('hidden');
        } else {
            requiredGpaDisplay.textContent = requiredGpa.toFixed(2);
            planningGpaResultDiv.classList.remove('hidden');
        }
    });

    // Custom Alert/Confirm Modals (replacing browser's alert/confirm)
    function showCustomAlert(message) {
        const modalId = 'custom-alert-modal';
        let modal = document.getElementById(modalId);
        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 hidden';
            modal.innerHTML = `
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm p-6 relative">
                    <p class="text-gray-900 dark:text-gray-100 text-center mb-6">${message}</p>
                    <button class="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors duration-200" onclick="document.getElementById('${modalId}').classList.add('hidden');">
                        OK
                    </button>
                </div>
            `;
            document.body.appendChild(modal);
        } else {
            modal.querySelector('p').textContent = message;
        }
        modal.classList.remove('hidden');
    }

    function showCustomConfirm(message, onConfirm) {
        const modalId = 'custom-confirm-modal';
        let modal = document.getElementById(modalId);
        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 hidden';
            modal.innerHTML = `
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm p-6 relative">
                    <p class="text-gray-900 dark:text-gray-100 text-center mb-6">${message}</p>
                    <div class="flex justify-around space-x-4">
                        <button id="confirm-yes" class="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors duration-200">Yes</button>
                        <button id="confirm-no" class="flex-1 bg-gray-300 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors duration-200">No</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        } else {
            modal.querySelector('p').textContent = message;
        }
        modal.classList.remove('hidden');

        const confirmYes = document.getElementById('confirm-yes');
        const confirmNo = document.getElementById('confirm-no');

        // Clear previous listeners to prevent multiple executions
        const newConfirmYes = confirmYes.cloneNode(true);
        const newConfirmNo = confirmNo.cloneNode(true);
        confirmYes.parentNode.replaceChild(newConfirmYes, confirmYes);
        confirmNo.parentNode.replaceChild(newConfirmNo, confirmNo);

        newConfirmYes.addEventListener('click', () => {
            modal.classList.add('hidden');
            onConfirm();
        });
        newConfirmNo.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    }

    // --- Delete User Data Functionality ---
    deleteUserDataBtn.addEventListener('click', async () => {
        const userId = auth.currentUser ? auth.currentUser.uid : null;
        if (!userId) {
            showCustomAlert("You must be logged in to delete your data.");
            return;
        }

        showCustomConfirm("WARNING: This will permanently delete ALL your grade data. This action cannot be undone. Are you sure?", async () => {
            deleteUserDataMessage.classList.add('hidden');
            try {
                // Get all documents in the user's grades subcollection
                const gradesCollectionRef = collection(db, `users/${userId}/grades`);
                const querySnapshot = await getDocs(gradesCollectionRef);

                // Create a batch to delete all documents efficiently
                const deletePromises = [];
                querySnapshot.forEach((doc) => {
                    deletePromises.push(deleteDoc(doc.ref));
                });

                // Also delete the GPA settings document
                const gpaSettingsDocRef = doc(db, `users/${userId}/settings/gpaSettings`);
                deletePromises.push(deleteDoc(gpaSettingsDocRef));

                await Promise.all(deletePromises); // Execute all deletions concurrently

                // Optionally, if you also want to delete the user's authentication account:
                // This requires re-authentication or a Cloud Function for security reasons.
                // For a client-side solution, the user might need to sign in again immediately before this call.
                // await auth.currentUser.delete(); // This will likely fail without recent re-authentication

                showCustomAlert("Your data has been successfully deleted. You will now be logged out.");
                await signOut(auth); // Log out the user after data deletion
            } catch (e) {
                console.error("Error deleting user data:", e);
                deleteUserDataMessage.textContent = `Error deleting data: ${e.message}. Please try again or contact support.`;
                deleteUserDataMessage.classList.remove('hidden');
                showCustomAlert("Error deleting data. Please check console for details.");
            }
        });
    });


    // Initial calls if user is already authenticated on page load
    // This block handles the state when the page first loads.
    // The onAuthStateChanged listener will also handle this, but this ensures
    // the initial UI state is set up quickly.
    if (auth && auth.currentUser) {
        loadingFirebase.classList.add('hidden');
        landingPage.classList.add('hidden');
        mainAppLayout.classList.remove('hidden');
        const userId = auth.currentUser.uid || crypto.randomUUID();
        userIdDisplay.textContent = `User ID: ${userId}`;
        // Await these initial loads to ensure data is present before user interacts
        await loadGradePointSettings(); // Load settings first
        await loadGrades(); // Load grades for grade tracker if user is on this page initially
        await updateDashboardGrades(); // Update dashboard on initial load
        displayPage('dashboard-page'); // Start on dashboard
    } else if (auth && !auth.currentUser) {
        loadingFirebase.classList.add('hidden');
        landingPage.classList.remove('hidden');
    }
});
