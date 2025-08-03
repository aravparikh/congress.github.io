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
            item.classList.remove('active');
        });
        const activeNavItem = document.getElementById(`nav-${pageId.replace('-page', '')}`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
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
            if (noRecentGradesDashboard) noRecentGradesDashboard.classList.remove('hidden');
            if (coursesListBody) coursesListBody.innerHTML = `<tr><td colspan="6" class="px-6 py-4 whitespace-nowrap text-center text-gray-500 dark:text-gray-400">Please log in to view your courses.</td></tr>`;
            if (gpaDisplay) gpaDisplay.textContent = '0.00';
            if (gpaTotalCreditsDisplay) gpaTotalCreditsDisplay.textContent = '0.0';
        }
    });

    // Initial sign-in with custom token or anonymously
    if (initialAuthToken) {
        try {
            await signInWithCustomToken(auth, initialAuthToken);
        } catch (error) {
            console.error("Error signing in with custom token:", error);
            try {
                await signInAnonymously(auth);
            } catch (anonError) {
                console.error("Error signing in anonymously:", anonError);
                loadingFirebase.innerHTML = `<div class="text-red-600 dark:text-red-400">Authentication failed. Please try again later.</div>`;
            }
        }
    } else {
        // This is the default path if no token is provided.
        // onAuthStateChanged will handle showing the landing page.
    }


    // --- Landing Page Button Handlers ---
    landingLoginBtn.addEventListener('click', () => loginModal.classList.remove('hidden'));
    landingSignupBtn.addEventListener('click', () => signupModal.classList.remove('hidden'));
    document.getElementById('landing-get-started-btn').addEventListener('click', () => signupModal.classList.remove('hidden'));


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

    // --- Firebase Auth Forms ---
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        // Login logic would go here
    });

    document.getElementById('signup-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        // Signup logic would go here
    });

    // --- Google Sign-In/Sign-Up Buttons ---
    const googleProvider = new GoogleAuthProvider();

    const handleGoogleSignIn = async () => {
         try {
            await signInWithPopup(auth, googleProvider);
            loginModal.classList.add('hidden');
            signupModal.classList.add('hidden');
        } catch (error) {
            console.error("Google Sign-In Error:", error);
            showCustomAlert("Google Sign-In failed. Please try again.");
        }
    };

    loginGoogleBtn.addEventListener('click', handleGoogleSignIn);
    signupGoogleBtn.addEventListener('click', handleGoogleSignIn);


    // Logout button
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error logging out:", error);
        }
    });

    // --- Navigation Handlers ---
    navDashboard.addEventListener('click', (e) => { e.preventDefault(); displayPage('dashboard-page'); });
    navTimeManagement.addEventListener('click', (e) => { e.preventDefault(); displayPage('time-management-page'); });
    navGradeTracker.addEventListener('click', (e) => { e.preventDefault(); displayPage('grade-tracker-page'); });
    navExtracurriculars.addEventListener('click', (e) => { e.preventDefault(); displayPage('extracurriculars-page'); });
    navCalendarSync.addEventListener('click', (e) => { e.preventDefault(); displayPage('calendar-sync-page'); });
    navSettings.addEventListener('click', (e) => { e.preventDefault(); displayPage('settings-page'); });
    sidebarAppTitle.addEventListener('click', () => displayPage('dashboard-page'));


    // --- AI Chat Functionality ---
    const sendAIChatMessage = async () => {
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

        const userMessageDiv = document.createElement('div');
        userMessageDiv.className = 'flex justify-end mb-2';
        userMessageDiv.innerHTML = `<div class="bg-indigo-500 text-white p-3 rounded-lg max-w-[80%]">${userText}</div>`;
        aiChatOutput.prepend(userMessageDiv);

        aiChatInput.value = '';

        try {
            const response = await fetch('https://student-planner-backend.onrender.com/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_text: userText })
            });
            const data = await response.json();
            const aiMessageDiv = document.createElement('div');
            aiMessageDiv.className = 'flex justify-start mb-2';
            if (response.ok) {
                aiMessageDiv.innerHTML = `<div class="bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-100 p-3 rounded-lg max-w-[80%] prose dark:prose-invert">${data.response.replace(/\n/g, '<br>')}</div>`;
            } else {
                aiMessageDiv.innerHTML = `<div class="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-3 rounded-lg max-w-[80%]">Error: ${data.error || 'Something went wrong.'}</div>`;
            }
            aiChatOutput.prepend(aiMessageDiv);
        } catch (error) {
            console.error('Fetch error:', error);
            const errorMessageDiv = document.createElement('div');
            errorMessageDiv.className = 'flex justify-start mb-2';
            errorMessageDiv.innerHTML = `<div class="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-3 rounded-lg max-w-[80%]">Error: Could not connect to the AI server.</div>`;
            aiChatOutput.prepend(errorMessageDiv);
        } finally {
            aiChatLoadingSpinner.classList.add('hidden');
            sendAiChatBtn.disabled = false;
            aiChatInput.disabled = false;
        }
    }
    sendAiChatBtn.addEventListener('click', sendAIChatMessage);
    aiChatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendAIChatMessage();
        }
    });

    // --- GPA Calculator Functions ---
    async function loadGradePointSettings() {
        const userId = auth.currentUser ? auth.currentUser.uid : null;
        if (!userId) {
            renderGradePointSettings();
            return;
        }
        gradePointSettingsLoading.classList.remove('hidden');
        try {
            const settingsDocRef = doc(db, `users/${userId}/settings/gpaSettings`);
            const docSnap = await getDoc(settingsDocRef);
            if (docSnap.exists()) {
                Object.assign(gradePointMap, docSnap.data());
            } else {
                await setDoc(settingsDocRef, gradePointMap);
            }
        } catch (e) {
            console.error("Error loading or saving GPA settings:", e);
        } finally {
            gradePointSettingsLoading.classList.add('hidden');
            renderGradePointSettings();
        }
    }

    async function saveGradePointSettings(newSettings) {
        const userId = auth.currentUser ? auth.currentUser.uid : null;
        if (!userId) return;
        try {
            const settingsDocRef = doc(db, `users/${userId}/settings/gpaSettings`);
            await setDoc(settingsDocRef, newSettings);
        } catch (e) {
            console.error("Error saving GPA settings:", e);
        }
    }

    const renderGradePointSettings = () => {
        gradePointSettingsContainer.innerHTML = '';
        gradePointSettingsLoading.classList.add('hidden');
        for (const grade in gradePointMap) {
            if (gradePointMap[grade] !== null) {
                const settingDiv = document.createElement('div');
                settingDiv.className = 'flex items-center space-x-2';
                settingDiv.innerHTML = `
                    <label for="gp-${grade}" class="text-gray-700 dark:text-gray-300 font-medium">${grade}:</label>
                    <input type="number" id="gp-${grade}" class="w-full rounded-md border-gray-300 shadow-sm sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 p-1" step="0.1" min="0" max="5.0" value="${gradePointMap[grade].toFixed(1)}">
                `;
                gradePointSettingsContainer.appendChild(settingDiv);
                const inputElement = settingDiv.querySelector(`#gp-${grade}`);
                inputElement.addEventListener('input', (e) => {
                    const newPoints = parseFloat(e.target.value);
                    if (!isNaN(newPoints)) {
                        gradePointMap[grade] = newPoints;
                        saveGradePointSettings(gradePointMap);
                        loadGrades();
                    }
                });
            }
        }
    };

    const calculateGPA = (courses) => {
        let totalWeightedPoints = 0;
        let totalCredits = 0;
        courses.forEach(course => {
            const gradePoints = gradePointMap[course.grade];
            if (gradePoints !== null && gradePoints !== undefined) {
                totalWeightedPoints += gradePoints * course.credits;
                totalCredits += course.credits;
            }
        });
        const gpa = totalCredits > 0 ? (totalWeightedPoints / totalCredits) : 0;
        return { gpa: gpa.toFixed(2), totalCredits: totalCredits.toFixed(1) };
    };

    async function loadGrades() {
        const userId = auth.currentUser ? auth.currentUser.uid : null;
        if (!userId) {
            coursesListBody.innerHTML = `<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">Please log in.</td></tr>`;
            return;
        }

        coursesListBody.innerHTML = `<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">Loading...</td></tr>`;
        try {
            const gradesCollectionRef = collection(db, `users/${userId}/grades`);
            const q = query(gradesCollectionRef, orderBy('timestamp', 'desc'));
            const querySnapshot = await getDocs(q);
            const currentCourses = [];
            querySnapshot.forEach((doc) => currentCourses.push({ id: doc.id, ...doc.data() }));

            coursesListBody.innerHTML = '';
            if (currentCourses.length === 0) {
                noCoursesRow.classList.remove('hidden');
                gpaTableContainer.classList.add('hidden');
                gpaSummary.classList.add('hidden');
            } else {
                noCoursesRow.classList.add('hidden');
                gpaTableContainer.classList.remove('hidden');
                gpaSummary.classList.remove('hidden');
                currentCourses.forEach(course => {
                    const gradePoint = gradePointMap[course.grade];
                    const weightedPoints = (gradePoint !== null && gradePoint !== undefined) ? (gradePoint * course.credits).toFixed(2) : 'N/A';
                    const row = document.createElement('tr');
                    row.className = 'hover:bg-gray-50 dark:hover:bg-gray-700';
                    row.innerHTML = `
                        <td class="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">${course.name || 'Unnamed'}</td>
                        <td class="px-6 py-4 text-gray-500 dark:text-gray-300">${course.credits.toFixed(1)}</td>
                        <td class="px-6 py-4 text-gray-500 dark:text-gray-300">${course.grade}</td>
                        <td class="px-6 py-4 text-gray-500 dark:text-gray-300">${(gradePoint !== null && gradePoint !== undefined) ? gradePoint.toFixed(1) : 'N/A'}</td>
                        <td class="px-6 py-4 text-gray-500 dark:text-gray-300">${weightedPoints}</td>
                        <td class="px-6 py-4 text-right"><button data-id="${course.id}" class="delete-course-btn text-red-500 hover:text-red-700">Delete</button></td>
                    `;
                    coursesListBody.appendChild(row);
                });
                document.querySelectorAll('.delete-course-btn').forEach(button => button.addEventListener('click', deleteCourse));
            }
            const { gpa, totalCredits } = calculateGPA(currentCourses);
            gpaTotalCreditsDisplay.textContent = totalCredits;
            gpaDisplay.textContent = gpa;
        } catch (e) {
            console.error("Error loading grades: ", e);
            coursesListBody.innerHTML = `<tr><td colspan="6" class="px-6 py-4 text-center text-red-500">Error loading courses.</td></tr>`;
        }
    }

    addCourseBtn.addEventListener('click', async () => {
        const userId = auth.currentUser ? auth.currentUser.uid : null;
        if (!userId) {
            showCustomAlert("You must be logged in to add courses.");
            return;
        }
        const courseName = newCourseNameInput.value.trim();
        const credits = parseFloat(newCourseCreditsInput.value);
        const grade = newCourseGradeSelect.value;
        if (isNaN(credits) || credits <= 0 || !grade) {
            addCourseMessage.textContent = "Please enter valid credits and select a grade.";
            addCourseMessage.classList.remove('hidden');
            return;
        }
        addCourseMessage.classList.add('hidden');
        try {
            await addDoc(collection(db, `users/${userId}/grades`), {
                name: courseName || "Unnamed Course",
                credits: credits,
                grade: grade,
                timestamp: new Date()
            });
            newCourseNameInput.value = '';
            newCourseCreditsInput.value = '1.0';
            newCourseGradeSelect.value = '';
            await loadGrades();
            await updateDashboardGrades();
        } catch (e) {
            console.error("Error adding document: ", e);
            showCustomAlert("Error adding course.");
        }
    });

    async function deleteCourse(event) {
        const userId = auth.currentUser ? auth.currentUser.uid : null;
        if (!userId) return;
        showCustomConfirm("Are you sure you want to delete this course?", async () => {
            const courseId = event.currentTarget.dataset.id;
            try {
                await deleteDoc(doc(db, `users/${userId}/grades`, courseId));
                await loadGrades();
                await updateDashboardGrades();
            } catch (e) {
                console.error("Error deleting document: ", e);
                showCustomAlert("Error deleting course. Please try again.");
            }
        });
    }

    async function updateDashboardGrades() {
        recentGradesLoadingDashboard.classList.remove('hidden');
        recentGradesListDashboard.innerHTML = '';
        noRecentGradesDashboard.classList.add('hidden');
        overallGpaDashboard.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-loader-2 animate-spin inline-block mr-2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`;
        const userId = auth.currentUser ? auth.currentUser.uid : null;
        if (!userId) {
            recentGradesLoadingDashboard.classList.add('hidden');
            overallGpaDashboard.textContent = 'N/A';
            recentGradesListDashboard.innerHTML = `<p class="text-center text-gray-500">Please log in to see your grades.</p>`;
            return;
        }
        try {
            await loadGradePointSettings();
            const gradesCollectionRef = collection(db, `users/${userId}/grades`);
            const allCoursesQuerySnapshot = await getDocs(gradesCollectionRef);
            const allCourses = [];
            allCoursesQuerySnapshot.forEach((doc) => {
                allCourses.push({ id: doc.id, ...doc.data() });
            });
            recentGradesLoadingDashboard.classList.add('hidden');
            if (allCourses.length === 0) {
                overallGpaDashboard.textContent = 'N/A';
                recentGradesListDashboard.innerHTML = `
                    <div class="text-center py-4">
                        <p class="text-gray-500 dark:text-gray-400">Let's get started!</p>
                        <p class="text-gray-500 dark:text-gray-400 mt-1">
                            Go to the
                            <a href="#" id="dashboard-nav-to-grades" class="text-indigo-500 hover:underline font-semibold">Grade Tracker</a>
                            to add your first course.
                        </p>
                    </div>
                `;
                document.getElementById('dashboard-nav-to-grades').addEventListener('click', (e) => {
                    e.preventDefault();
                    displayPage('grade-tracker-page');
                });
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
                gradeItem.innerHTML = `
                    <span class="text-gray-800 dark:text-gray-200">${course.name || 'Unnamed Course'}</span>
                    <span class="text-lg font-semibold text-indigo-600 dark:text-indigo-400">${course.grade}</span>
                `;
                recentGradesListDashboard.appendChild(gradeItem);
            });
        } catch (e) {
            console.error("Error updating dashboard grades:", e);
            recentGradesLoadingDashboard.classList.add('hidden');
            overallGpaDashboard.textContent = 'Error';
            recentGradesListDashboard.innerHTML = `<p class="text-red-600 dark:text-red-400 text-center">Could not load grade data. Please try again later.</p>`;
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
        if (isNaN(currentGpa) || isNaN(currentCredits) || isNaN(additionalCredits) || isNaN(targetGpa) || currentCredits < 0 || additionalCredits <= 0 || targetGpa < 0) {
            planningGpaMessage.textContent = 'Please enter valid numbers for all fields.';
            planningGpaMessage.classList.remove('hidden');
            return;
        }
        const targetTotalPoints = targetGpa * (currentCredits + additionalCredits);
        const currentTotalPoints = currentGpa * currentCredits;
        const requiredGpaPoints = (targetTotalPoints - currentTotalPoints);
        const requiredGpa = requiredGpaPoints / additionalCredits;
        if (requiredGpa < 0) {
            requiredGpaDisplay.textContent = `0.00`;
        } else if (requiredGpa > 5.0) { // Assuming 5.0 is max
            requiredGpaDisplay.textContent = `${requiredGpa.toFixed(2)} (Impossible)`;
        } else {
            requiredGpaDisplay.textContent = requiredGpa.toFixed(2);
        }
        planningGpaResultDiv.classList.remove('hidden');
    });

    // Custom Alert/Confirm Modals
    function showCustomAlert(message) {
        // Implementation for a custom alert
        alert(message);
    }

    function showCustomConfirm(message, onConfirm) {
        // Implementation for a custom confirm
        if (confirm(message)) {
            onConfirm();
        }
    }

    // --- Delete User Data Functionality ---
// ... (the code for the GPA planning calculator and custom modals) ...

    // --- Delete User Data Functionality ---
    deleteUserDataBtn.addEventListener('click', async () => {
        const userId = auth.currentUser ? auth.currentUser.uid : null;
        if (!userId) {
            showCustomAlert("You must be logged in to delete your data.");
            return;
        }
        showCustomConfirm("WARNING: This will permanently delete ALL your grade data. Are you sure?", async () => {
            try {
                const gradesCollectionRef = collection(db, `users/${userId}/grades`);
                const querySnapshot = await getDocs(gradesCollectionRef);
                const deletePromises = [];
                querySnapshot.forEach((doc) => deletePromises.push(deleteDoc(doc.ref)));
                const gpaSettingsDocRef = doc(db, `users/${userId}/settings/gpaSettings`);
                deletePromises.push(deleteDoc(gpaSettingsDocRef));
                await Promise.all(deletePromises);
                showCustomAlert("Your data has been successfully deleted. You will now be logged out.");
                await signOut(auth);
            } catch (e) {
                console.error("Error deleting user data:", e);
                showCustomAlert("Error deleting data. Please try again.");
            }
        });
    });

    // The 'onAuthStateChanged' listener you defined earlier handles the initial load.
    // No extra code is needed here.

}); // This is the final closing bracket for the 'DOMContentLoaded' listener.
