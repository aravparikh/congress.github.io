// app.js

// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
// Firestore imports are commented out as they are not directly used in this AI chat example,
// but included for completeness if you expand the app.
// import { getFirestore, doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
const firebaseConfig = {
  apiKey: "AIzaSyBMDzrZurHNHR_5QMIGzCOisVoAxOJ0d08",
  authDomain: "congressional-app-challe-eb3be.firebaseapp.com",
  projectId: "congressional-app-challe-eb3be",
  storageBucket: "congressional-app-challe-eb3be.firebasestorage.app",
  messagingSenderId: "182459835746",
  appId: "1:182459835746:web:8ae5e7a988dc88bb7e383b",
  measurementId: "G-JRLCDXSSLT"
};
// Global Firebase variables (provided by the Canvas environment)

let app;
let auth;
let db; // Placeholder for Firestore, not used in this specific AI chat functionality

document.addEventListener('DOMContentLoaded', async () => {
    const loadingFirebase = document.getElementById('loading-firebase');
    const landingPage = document.getElementById('landing-page');
    const mainAppLayout = document.getElementById('main-app-layout');
    const userIdDisplay = document.getElementById('user-id-display');

    // Modals and their buttons
    const loginModal = document.getElementById('login-modal');
    const signupModal = document.getElementById('signup-modal');
    const landingLoginBtn = document.getElementById('landing-login-btn');
    const landingSignupBtn = document.getElementById('landing-signup-btn');
    const closeLoginModalBtn = document.getElementById('close-login-modal');
    const closeSignupModalBtn = document.getElementById('close-signup-modal');
    const switchToSignupBtn = document.getElementById('switch-to-signup');
    const switchToLoginBtn = document.getElementById('switch-to-login');

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

    // Function to display a specific page
    const displayPage = (pageId) => {
        document.querySelectorAll('.page-content').forEach(page => {
            page.classList.remove('active');
        });
        document.getElementById(pageId).classList.add('active');

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

    // Initialize Firebase
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        // db = getFirestore(app); // Initialize Firestore if needed for other features
    } catch (error) {
        console.error("Firebase initialization error:", error);
        loadingFirebase.innerHTML = `<div class="text-red-600 dark:text-red-400">Error initializing Firebase. Please check your configuration.</div>`;
        return;
    }

    // Firebase Auth State Listener
    onAuthStateChanged(auth, async (user) => {
        loadingFirebase.classList.add('hidden'); // Hide loading spinner once auth state is known
        if (user) {
            // User is signed in
            landingPage.classList.add('hidden');
            mainAppLayout.classList.remove('hidden');
            const userId = user.uid || crypto.randomUUID(); // Fallback for anonymous
            userIdDisplay.textContent = `User ID: ${userId}`;
            displayPage('dashboard-page'); // Show dashboard by default after login
        } else {
            // User is signed out
            landingPage.classList.remove('hidden');
            mainAppLayout.classList.add('hidden');
            loginModal.classList.add('hidden');
            signupModal.classList.add('hidden');
        }
    });

    // Initial sign-in with custom token or anonymously
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
    document.getElementById('landing-see-features-btn').addEventListener('click', () => {
        // Scroll to features section
        document.getElementById('features-section').scrollIntoView({ behavior: 'smooth' });
        // Make features section visible (it's initially hidden by opacity/transform)
        document.getElementById('features-section').style.opacity = '1';
        document.getElementById('features-section').style.transform = 'translateY(0)';
    });

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
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorMessage = document.getElementById('login-error-message');
        errorMessage.classList.add('hidden');
        try {
            // In a real app, you'd use signInWithEmailAndPassword
            console.log("Login attempt (email/password not fully implemented for demo)");
            // For now, just simulate success and switch to app layout
            loginModal.classList.add('hidden');
            mainAppLayout.classList.remove('hidden');
            landingPage.classList.add('hidden');
            displayPage('dashboard-page');
            // A real login would involve: await signInWithEmailAndPassword(auth, email, password);
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
            // In a real app, you'd use createUserWithEmailAndPassword
            console.log("Signup attempt (email/password not fully implemented for demo)");
            // For now, just simulate success and switch to app layout
            signupModal.classList.add('hidden');
            mainAppLayout.classList.remove('hidden');
            landingPage.classList.add('hidden');
            displayPage('dashboard-page');
            // A real signup would involve: await createUserWithEmailAndPassword(auth, email, password);
        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.classList.remove('hidden');
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
            const response = await fetch('http://localhost:5000/generate', { // Ensure this URL matches your Flask backend
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

    // Placeholder functions for other pages (replace with actual logic later)
    const renderGrades = () => {
        const gradesListLoading = document.getElementById('grades-list-loading');
        const gradesTableContainer = document.getElementById('grades-table-container');
        const noGradesRecorded = document.getElementById('no-grades-recorded');
        const courseAveragesSummary = document.getElementById('course-averages-summary');
        
        gradesListLoading.classList.remove('hidden');
        gradesTableContainer.classList.add('hidden');
        noGradesRecorded.classList.add('hidden');
        courseAveragesSummary.classList.add('hidden');

        // Simulate loading
        setTimeout(() => {
            gradesListLoading.classList.add('hidden');
            noGradesRecorded.classList.remove('hidden'); // Show "no grades" initially
        }, 1000);
    };

    // Call renderGrades when grade tracker page is activated (or on initial load if user is logged in)
    navGradeTracker.addEventListener('click', renderGrades);

    // Initial call to hide loading spinner if auth state is already known
    // This handles cases where onAuthStateChanged might fire before DOMContentLoaded
    if (auth && auth.currentUser) {
        loadingFirebase.classList.add('hidden');
        landingPage.classList.add('hidden');
        mainAppLayout.classList.remove('hidden');
        const userId = auth.currentUser.uid || crypto.randomUUID();
        userIdDisplay.textContent = `User ID: ${userId}`;
        displayPage('dashboard-page');
    } else if (auth && !auth.currentUser) {
        loadingFirebase.classList.add('hidden');
        landingPage.classList.remove('hidden');
    }
});
