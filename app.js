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

// Global variables
const appId = firebaseConfig.appId; 
const initialAuthToken = null; // Set to null as it's not provided by your environment anymore

let app;
let auth;
let db; // Placeholder for Firestore, not used in this specific AI chat functionality

// GPA Calculator Data and Settings
let userCourses = []; // Array to store course objects: { id: uuid, name: string, credits: number, grade: string }
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


    // Function to display a specific page
    const displayPage = (pageId) => {
        document.querySelectorAll('.page-content').forEach(page => {
            page.classList.remove('active');
        });
        document.getElementById(pageId).classList.add('active');

        // Special handling for Grade Tracker page
        if (pageId === 'grade-tracker-page') {
            renderGPACalculator(); // Render the GPA calculator when navigating to this page
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

    // Initialize Firebase
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        // db = getFirestore(app); // Initialize Firestore if needed for other features
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
            displayPage('dashboard-page'); // Show dashboard by default after login
        } else {
            // User is signed out
            console.log("Firebase Auth State Changed: User signed out.");
            landingPage.classList.remove('hidden');
            mainAppLayout.classList.add('hidden');
            loginModal.classList.add('hidden');
            signupModal.classList.add('hidden');
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

    // --- GPA Calculator Functions ---

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
                        renderGPACalculator(); // Recalculate GPA on setting change
                    }
                });
            }
        }
    };

    // Calculates GPA based on userCourses and gradePointMap
    const calculateGPA = () => {
        let totalWeightedPoints = 0;
        let totalCredits = 0;

        userCourses.forEach(course => {
            const gradePoints = gradePointMap[course.grade];
            if (gradePoints !== null && gradePoints !== undefined) { // Check if grade has a numerical point
                totalWeightedPoints += gradePoints * course.credits;
                totalCredits += course.credits;
            }
        });

        const gpa = totalCredits > 0 ? (totalWeightedPoints / totalCredits) : 0;
        return { gpa: gpa.toFixed(2), totalCredits: totalCredits.toFixed(1) };
    };

    // Renders the courses table and updates GPA display
    const renderGPACalculator = () => {
        coursesListBody.innerHTML = ''; // Clear existing rows

        if (userCourses.length === 0) {
            noCoursesRow.classList.remove('hidden');
            coursesListBody.appendChild(noCoursesRow);
            gpaTableContainer.classList.add('hidden');
            gpaSummary.classList.add('hidden');
        } else {
            noCoursesRow.classList.add('hidden');
            gpaTableContainer.classList.remove('hidden');
            gpaSummary.classList.remove('hidden');

            userCourses.forEach((course, index) => {
                const gradePoints = gradePointMap[course.grade];
                const weightedPoints = gradePoints !== null && gradePoints !== undefined ? (gradePoints * course.credits).toFixed(2) : 'N/A';
                const gradePointsDisplay = gradePoints !== null && gradePoints !== undefined ? gradePoints.toFixed(1) : 'N/A';

                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150';
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">${course.name || 'Untitled Course'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">${course.credits.toFixed(1)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">${course.grade}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">${gradePointsDisplay}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">${weightedPoints}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button data-id="${course.id}" class="delete-course-btn text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">Delete</button>
                    </td>
                `;
                coursesListBody.appendChild(row);
            });

            // Attach event listeners for delete buttons
            document.querySelectorAll('.delete-course-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const courseIdToDelete = e.target.dataset.id;
                    userCourses = userCourses.filter(course => course.id !== courseIdToDelete);
                    renderGPACalculator(); // Re-render after deletion
                });
            });
        }

        const { gpa, totalCredits } = calculateGPA();
        gpaTotalCreditsDisplay.textContent = totalCredits;
        gpaDisplay.textContent = gpa;

        renderGradePointSettings(); // Always render settings when GPA is rendered/updated
    };

    // Add Course Function
    addCourseBtn.addEventListener('click', () => {
        const name = newCourseNameInput.value.trim();
        const credits = parseFloat(newCourseCreditsInput.value);
        const grade = newCourseGradeSelect.value;

        addCourseMessage.classList.add('hidden'); // Hide previous messages

        if (isNaN(credits) || credits <= 0) {
            addCourseMessage.textContent = 'Please enter valid credits (a number greater than 0).';
            addCourseMessage.classList.remove('hidden');
            return;
        }
        if (!grade) {
            addCourseMessage.textContent = 'Please select a grade.';
            addCourseMessage.classList.remove('hidden');
            return;
        }

        const newCourse = {
            id: crypto.randomUUID(), // Unique ID for each course
            name: name,
            credits: credits,
            grade: grade
        };

        userCourses.push(newCourse);
        renderGPACalculator(); // Re-render the list and GPA

        // Clear form
        newCourseNameInput.value = '';
        newCourseCreditsInput.value = '1.0';
        newCourseGradeSelect.value = '';
    });

    // Event listeners for recalculating GPA when input fields change (for existing courses)
    // This part is handled by re-rendering the whole table which re-attaches listeners
    // For now, new course addition is the primary way to add/update data.
    // In a more complex app, you might add inline editing.

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

    // Initial render of GPA calculator when the page loads (in case grade-tracker-page is shown by default)
    // This is also called when navigating to the grade tracker page via displayPage function
    renderGPACalculator(); 
});
