// app.js

// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
// Import Firestore modules
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, doc, deleteDoc, updateDoc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// YOUR FIREBASE CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyBMDzrZurHNHR_5QMIGzCOisVoAxOJ0d08",
  authDomain: "congressional-app-challe-eb3be.firebaseapp.com",
  projectId: "congressional-app-challe-eb3be",
  storageBucket: "congressional-app-challe-eb3be.firebase.app.com",
  messagingSenderId: "182459835746",
  appId: "1:182459835746:web:8ae5e7a988dc88bb7e383b",
  measurementId: "G-JRLCDXSSLT"
};


// Global variables
let app;
let auth;
let db;
let gradePointMap = {
    'A+': 4.3, 'A': 4.0, 'A-': 3.7,
    'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7,
    'D+': 1.3, 'D': 1.0, 'D-': 0.7,
    'F': 0.0, 'P': null, 'NP': null, 'I': null, 'W': null
};

document.addEventListener('DOMContentLoaded', async () => {
    // Get all DOM elements
    const loadingFirebase = document.getElementById('loading-firebase');
    const landingPage = document.getElementById('landing-page');
    const mainAppLayout = document.getElementById('main-app-layout');
    const userIdDisplay = document.getElementById('user-id-display');
    const sidebarAppTitle = document.getElementById('sidebar-app-title');
    const loginModal = document.getElementById('login-modal');
    const signupModal = document.getElementById('signup-modal');
    const landingLoginBtn = document.getElementById('landing-login-btn');
    const landingSignupBtn = document.getElementById('landing-signup-btn');
    const closeLoginModalBtn = document.getElementById('close-login-modal');
    const closeSignupModalBtn = document.getElementById('close-signup-modal');
    const switchToSignupBtn = document.getElementById('switch-to-signup');
    const switchToLoginBtn = document.getElementById('switch-to-login');
    const loginGoogleBtn = document.getElementById('login-google-btn');
    const signupGoogleBtn = document.getElementById('signup-google-btn');
    const navDashboard = document.getElementById('nav-dashboard');
    const navTimeManagement = document.getElementById('nav-time-management');
    const navGradeTracker = document.getElementById('nav-grade-tracker');
    const navExtracurriculars = document.getElementById('nav-extracurriculars');
    const navCalendarSync = document.getElementById('nav-calendar-sync');
    const navSettings = document.getElementById('nav-settings');
    const logoutBtn = document.getElementById('logout-btn');
    const aiChatInput = document.getElementById('ai-chat-input');
    const sendAiChatBtn = document.getElementById('send-ai-chat-btn');
    const aiChatOutput = document.getElementById('ai-chat-output');
    const aiChatLoadingSpinner = document.getElementById('ai-chat-loading-spinner');
    const aiChatError = document.getElementById('ai-chat-error');
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
    const currentGpaInput = document.getElementById('current-gpa');
    const currentGpaCreditsInput = document.getElementById('current-gpa-credits');
    const additionalCreditsInput = document.getElementById('additional-credits');
    const targetGpaInput = document.getElementById('target-gpa');
    const calculatePlanningGpaBtn = document.getElementById('calculate-planning-gpa-btn');
    const planningGpaResultDiv = document.getElementById('planning-gpa-result');
    const requiredGpaDisplay = document.getElementById('required-gpa-display');
    const planningGpaMessage = document.getElementById('planning-gpa-message');
    const overallGpaDashboard = document.getElementById('overall-gpa');
    const recentGradesListDashboard = document.getElementById('recent-grades-list');
    const recentGradesLoadingDashboard = document.getElementById('recent-grades-loading');
    const noRecentGradesDashboard = document.getElementById('no-recent-grades');
    const deleteUserDataBtn = document.getElementById('delete-user-data-btn');
    const deleteUserDataMessage = document.getElementById('delete-user-data-message');

    // Function to display a specific page
    const displayPage = async (pageId) => {
        document.querySelectorAll('.page-content').forEach(page => page.classList.remove('active'));
        document.getElementById(pageId).classList.add('active');
        if (pageId === 'grade-tracker-page') {
            await loadGradePointSettings();
            await loadGrades();
        } else if (pageId === 'dashboard-page') {
            await updateDashboardGrades();
        }
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        const activeNavItem = document.getElementById(`nav-${pageId.replace('-page', '')}`);
        if (activeNavItem) activeNavItem.classList.add('active');
    };

    // Initialize Firebase
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
    } catch (error) {
        console.error("Firebase initialization error:", error);
        loadingFirebase.innerHTML = `<div class="text-red-500">Error initializing Firebase.</div>`;
        return;
    }

    // Firebase Auth State Listener
    onAuthStateChanged(auth, async (user) => {
        loadingFirebase.classList.add('hidden');
        if (user) {
            landingPage.classList.add('hidden');
            mainAppLayout.classList.remove('hidden');
            userIdDisplay.textContent = `User ID: ${user.uid}`;
            await loadGradePointSettings();
            await updateDashboardGrades();
            displayPage('dashboard-page');
        } else {
            landingPage.classList.remove('hidden');
            mainAppLayout.classList.add('hidden');
            loginModal.classList.add('hidden');
            signupModal.classList.add('hidden');
        }
    });

    // --- Event Listeners ---
    landingLoginBtn.addEventListener('click', () => loginModal.classList.remove('hidden'));
    landingSignupBtn.addEventListener('click', () => signupModal.classList.remove('hidden'));
    document.getElementById('landing-get-started-btn').addEventListener('click', () => signupModal.classList.remove('hidden'));
    closeLoginModalBtn.addEventListener('click', () => loginModal.classList.add('hidden'));
    closeSignupModalBtn.addEventListener('click', () => signupModal.classList.add('hidden'));
    switchToSignupBtn.addEventListener('click', () => { loginModal.classList.add('hidden'); signupModal.classList.remove('hidden'); });
    switchToLoginBtn.addEventListener('click', () => { signupModal.classList.add('hidden'); loginModal.classList.remove('hidden'); });

    const googleProvider = new GoogleAuthProvider();
    const handleGoogleSignIn = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
            loginModal.classList.add('hidden');
            signupModal.classList.add('hidden');
        } catch (error) { console.error("Google Sign-In Error:", error); showCustomAlert("Google Sign-In failed."); }
    };
    loginGoogleBtn.addEventListener('click', handleGoogleSignIn);
    signupGoogleBtn.addEventListener('click', handleGoogleSignIn);

    logoutBtn.addEventListener('click', async () => { try { await signOut(auth); } catch (error) { console.error("Error logging out:", error); } });
    navDashboard.addEventListener('click', (e) => { e.preventDefault(); displayPage('dashboard-page'); });
    navTimeManagement.addEventListener('click', (e) => { e.preventDefault(); displayPage('time-management-page'); });
    navGradeTracker.addEventListener('click', (e) => { e.preventDefault(); displayPage('grade-tracker-page'); });
    navExtracurriculars.addEventListener('click', (e) => { e.preventDefault(); displayPage('extracurriculars-page'); });
    navCalendarSync.addEventListener('click', (e) => { e.preventDefault(); displayPage('calendar-sync-page'); });
    navSettings.addEventListener('click', (e) => { e.preventDefault(); displayPage('settings-page'); });
    sidebarAppTitle.addEventListener('click', () => displayPage('dashboard-page'));

    const sendAIChatMessage = async () => { /* AI Chat logic remains the same */ };
    sendAiChatBtn.addEventListener('click', sendAIChatMessage);
    aiChatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAIChatMessage(); } });

    async function loadGradePointSettings() { /* Logic remains the same */ }
    async function saveGradePointSettings(newSettings) { /* Logic remains the same */ }
    const renderGradePointSettings = () => { /* Logic remains the same */ };
    const calculateGPA = (courses) => { /* Logic remains the same */ };
    async function loadGrades() { /* Logic remains the same */ }
    async function deleteCourse(event) { /* Logic remains the same */ }

    addCourseBtn.addEventListener('click', async () => {
        const userId = auth.currentUser ? auth.currentUser.uid : null;
        if (!userId) { showCustomAlert("You must be logged in to add courses."); return; }
        const courseName = newCourseNameInput.value.trim();
        const credits = parseFloat(newCourseCreditsInput.value);
        const grade = newCourseGradeSelect.value;
        if (isNaN(credits) || credits <= 0 || !grade) { addCourseMessage.textContent = "Please enter valid credits and select a grade."; addCourseMessage.classList.remove('hidden'); return; }
        addCourseMessage.classList.add('hidden');
        try {
            await addDoc(collection(db, `users/${userId}/grades`), { name: courseName || "Unnamed Course", credits, grade, timestamp: new Date() });
            newCourseNameInput.value = ''; newCourseCreditsInput.value = '1.0'; newCourseGradeSelect.value = '';
            await loadGrades(); await updateDashboardGrades();
        } catch (e) { console.error("Error adding document: ", e); showCustomAlert("Error adding course."); }
    });

    calculatePlanningGpaBtn.addEventListener('click', () => { /* GPA planning logic remains the same */ });

    // ### THIS IS THE UPDATED FUNCTION ###
    async function updateDashboardGrades() {
        recentGradesLoadingDashboard.classList.remove('hidden');
        recentGradesListDashboard.innerHTML = '';
        noRecentGradesDashboard.classList.add('hidden');
        overallGpaDashboard.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-loader-2 animate-spin inline-block mr-2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`;
        
        const userId = auth.currentUser ? auth.currentUser.uid : null;
        if (!userId) { /* Not logged in logic remains the same */ return; }

        const showGetStartedPrompt = (idSuffix = '') => {
            overallGpaDashboard.textContent = 'N/A';
            recentGradesListDashboard.innerHTML = `
                <div class="text-center py-4">
                    <p class="text-gray-500 dark:text-gray-400">Let's get started!</p>
                    <p class="text-gray-500 dark:text-gray-400 mt-1">
                        Go to the <a href="#" id="dashboard-nav-to-grades${idSuffix}" class="text-indigo-500 hover:underline font-semibold">Grade Tracker</a> to add your first course.
                    </p>
                </div>
            `;
            document.getElementById(`dashboard-nav-to-grades${idSuffix}`).addEventListener('click', (e) => {
                e.preventDefault();
                displayPage('grade-tracker-page');
            });
        };

        try {
            await loadGradePointSettings();
            const gradesCollectionRef = collection(db, `users/${userId}/grades`);
            const allCoursesQuerySnapshot = await getDocs(gradesCollectionRef);
            const allCourses = [];
            allCoursesQuerySnapshot.forEach((doc) => allCourses.push({ id: doc.id, ...doc.data() }));

            recentGradesLoadingDashboard.classList.add('hidden');
            if (allCourses.length === 0) {
                showGetStartedPrompt(); // Show prompt if no grades exist
                return;
            }

            const { gpa } = calculateGPA(allCourses);
            overallGpaDashboard.textContent = gpa;
            allCourses.sort((a, b) => (b.timestamp.seconds || 0) - (a.timestamp.seconds || 0));
            const recentCourses = allCourses.slice(0, 5);
            noRecentGradesDashboard.classList.add('hidden');
            recentCourses.forEach((course) => {
                const gradeItem = document.createElement('div');
                gradeItem.className = 'flex items-center justify-between py-2 border-b last:border-b-0 border-gray-200 dark:border-gray-700';
                gradeItem.innerHTML = `<span class="text-gray-800 dark:text-gray-200">${course.name || 'Unnamed Course'}</span><span class="text-lg font-semibold text-indigo-600 dark:text-indigo-400">${course.grade}</span>`;
                recentGradesListDashboard.appendChild(gradeItem);
            });
        } catch (e) {
            console.error("Error updating dashboard grades:", e);
            recentGradesLoadingDashboard.classList.add('hidden');
            showGetStartedPrompt('-error'); // Show same helpful prompt on error
        }
    }

    function showCustomAlert(message) { alert(message); }
    function showCustomConfirm(message, onConfirm) { if (confirm(message)) { onConfirm(); } }

    deleteUserDataBtn.addEventListener('click', async () => { /* Delete logic remains the same */ });
});
