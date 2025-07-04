// app.js

// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
// Firestore imports are uncommented and included for grade tracking functionality.
import { getFirestore, doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Global Firebase variables (provided by the Canvas environment)
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let app;
let auth;
let db; // Initialized for Firestore

document.addEventListener('DOMContentLoaded', async () => {
    const loadingFirebase = document.getElementById('loading-firebase');
    const landingPage = document.getElementById('landing-page');
    const mainAppLayout = document.getElementById('main-app-layout');
    const userIdDisplay = document.getElementById('user-id-display');
    const overallGpaDisplay = document.getElementById('overall-gpa-display'); // New element for GPA display

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

    // Grade Tracker elements
    const addGradeForm = document.getElementById('add-grade-form');
    const courseNameInput = document.getElementById('course-name');
    const assignmentNameInput = document.getElementById('assignment-name');
    const percentageGradeInput = document.getElementById('percentage-grade');
    const creditHoursInput = document.getElementById('credit-hours');
    const gradesListLoading = document.getElementById('grades-list-loading');
    const gradesTableContainer = document.getElementById('grades-table-container');
    const gradesTableBody = document.getElementById('grades-table-body');
    const noGradesRecorded = document.getElementById('no-grades-recorded');
    const courseAveragesSummary = document.getElementById('course-averages-summary'); // This will now display overall GPA

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
        db = getFirestore(app); // Initialize Firestore
    } catch (error) {
        console.error("Firebase initialization error:", error);
        loadingFirebase.innerHTML = `<div class="text-red-600 dark:text-red-400">Error initializing Firebase. Please check your configuration.</div>`;
        return;
    }

    // Define grade point mapping for GPA calculation
    const GRADE_POINT_MAP = {
        'A': 4.0,
        'B': 3.0,
        'C': 2.0,
        'D': 1.0,
        'F': 0.0
    };

    // Function to convert percentage to letter grade and then to grade point
    const percentageToGradePoint = (percentage) => {
        if (percentage >= 90) return GRADE_POINT_MAP['A'];
        if (percentage >= 80) return GRADE_POINT_MAP['B'];
        if (percentage >= 70) return GRADE_POINT_MAP['C'];
        if (percentage >= 60) return GRADE_POINT_MAP['D'];
        return GRADE_POINT_MAP['F'];
    };

    // Function to render grades and calculate GPA
    const renderGrades = async () => {
        gradesListLoading.classList.remove('hidden');
        gradesTableContainer.classList.add('hidden');
        noGradesRecorded.classList.add('hidden');
        courseAveragesSummary.classList.add('hidden');

        if (!auth.currentUser) {
            console.log("No user logged in, cannot fetch grades.");
            gradesListLoading.classList.add('hidden');
            noGradesRecorded.classList.remove('hidden');
            overallGpaDisplay.textContent = '--';
            return;
        }

        const userId = auth.currentUser.uid;
        const gradesRef = collection(db, `users/${userId}/grades`); // Assuming a 'grades' subcollection for each user

        try {
            const q = query(gradesRef); // You might add ordering or filtering here if needed
            const querySnapshot = await getDocs(q);

            let totalGradePoints = 0;
            let totalCreditHours = 0;
            const grades = [];

            if (querySnapshot.empty) {
                gradesListLoading.classList.add('hidden');
                noGradesRecorded.classList.remove('hidden');
                overallGpaDisplay.textContent = '0.00'; // No grades, so GPA is 0.00
                return;
            }

            querySnapshot.forEach((doc) => {
                const gradeData = doc.data();
                const percentage = parseFloat(gradeData.percentage);
                const creditHours = parseFloat(gradeData.creditHours);

                if (!isNaN(percentage) && !isNaN(creditHours)) {
                    const gradePoint = percentageToGradePoint(percentage);
                    totalGradePoints += gradePoint * creditHours;
                    totalCreditHours += creditHours;
                    grades.push({ id: doc.id, ...gradeData, gradePoint }); // Store grade point for display
                }
            });

            // Calculate Overall GPA
            const overallGPA = totalCreditHours > 0 ? (totalGradePoints / totalCreditHours).toFixed(2) : '0.00';
            overallGpaDisplay.textContent = overallGPA;

            // Render grades in the table
            gradesTableBody.innerHTML = ''; // Clear existing grades
            grades.forEach(grade => {
                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-50 dark:hover:bg-gray-700';
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">${grade.courseName}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">${grade.assignmentName}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">${grade.percentage}%</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">${grade.gradePoint.toFixed(1)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">${grade.creditHours}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button data-id="${grade.id}" class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200 delete-grade-btn">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                        </button>
                    </td>
                `;
                gradesTableBody.appendChild(row);
            });

            // Show grade table and averages summary
            gradesTableContainer.classList.remove('hidden');
            courseAveragesSummary.classList.remove('hidden');
            // You might want to populate courseAveragesList here with individual course GPA/averages
            // For example:
            // const courseAveragesList = document.getElementById('course-averages-list');
            // courseAveragesList.innerHTML = '<p class="text-gray-700 dark:text-gray-300">Individual course averages will be implemented here.</p>';

        } catch (error) {
            console.error("Error fetching grades:", error);
            gradesListLoading.classList.add('hidden');
            noGradesRecorded.classList.remove('hidden');
            overallGpaDisplay.textContent = '--'; // Display error or default
        } finally {
            gradesListLoading.classList.add('hidden');
        }
    };


    // Add Grade Form Submission
    addGradeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!auth.currentUser) {
            alert("Please log in to add grades.");
            return;
        }

        const courseName = courseNameInput.value.trim();
        const assignmentName = assignmentNameInput.value.trim();
        const percentageGrade = parseFloat(percentageGradeInput.value);
        const creditHours = parseFloat(creditHoursInput.value);

        if (courseName === '' || assignmentName === '' || isNaN(percentageGrade) || isNaN(creditHours)) {
            alert('Please fill in all grade details correctly.');
            return;
        }

        const userId = auth.currentUser.uid;
        try {
            await addDoc(collection(db, `users/${userId}/grades`), {
                courseName,
                assignmentName,
                percentage: percentageGrade,
                creditHours,
                timestamp: new Date()
            });
            alert('Grade added successfully!');
            addGradeForm.reset();
            renderGrades(); // Re-render grades after adding new one
        } catch (error) {
            console.error("Error adding grade:", error);
            alert('Failed to add grade. Please try again.');
        }
    });

    // Delete Grade
    // Event delegation for delete buttons
    gradesTableBody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-grade-btn') || e.target.closest('.delete-grade-btn')) {
            const button = e.target.closest('.delete-grade-btn');
            const gradeId = button.dataset.id;

            if (confirm('Are you sure you want to delete this grade?')) {
                if (!auth.currentUser) {
                    alert("Please log in to delete grades.");
                    return;
                }
                const userId = auth.currentUser.uid;
                try {
                    await deleteDoc(doc(db, `users/${userId}/grades`, gradeId));
                    alert('Grade deleted successfully!');
                    renderGrades(); // Re-render grades after deletion
                } catch (error) {
                    console.error("Error deleting grade:", error);
                    alert('Failed to delete grade. Please try again.');
                }
            }
        }
    });


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
            renderGrades(); // Render grades on login/page load
        } else {
            // User is signed out
            landingPage.classList.remove('hidden');
            mainAppLayout.classList.add('hidden');
            loginModal.classList.add('hidden');
            signupModal.classList.add('hidden');
            overallGpaDisplay.textContent = '--'; // Clear GPA on logout
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

    // --- Modal Close Buttons ---
    closeLoginModalBtn.addEventListener('click', () => loginModal.classList.add('hidden'));
    closeSignupModalBtn.addEventListener('click', () => signupModal.classList.add('hidden'));

    // --- Switch between Login/Signup Modals ---
    switchToSignupBtn.addEventListener('click', () => {
        loginModal.classList.add('hidden');
        signupModal.classList.remove('hidden');
    });
    switchToLoginBtn.addEventListener('click', () => {
        signupModal.classList.add('hidden');
        loginModal.classList.remove('hidden');
    });

    // --- Navigation Handlers ---
    navDashboard.addEventListener('click', () => displayPage('dashboard-page'));
    navTimeManagement.addEventListener('click', () => displayPage('time-management-page'));
    navGradeTracker.addEventListener('click', renderGrades); // Call renderGrades to refresh data when navigating
    navExtracurriculars.addEventListener('click', () => displayPage('extracurriculars-page'));
    navCalendarSync.addEventListener('click', () => displayPage('calendar-sync-page'));
    navSettings.addEventListener('click', () => displayPage('settings-page'));
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            alert('Logged out successfully!');
        } catch (error) {
            console.error("Error signing out:", error);
            alert('Failed to log out. Please try again.');
        }
    });

    // --- AI Chat Functionality ---
    sendAiChatBtn.addEventListener('click', async () => {
        const userText = aiChatInput.value.trim();
        if (userText === '') return;

        aiChatOutput.innerHTML = ''; // Clear previous output
        aiChatError.classList.add('hidden');
        aiChatLoadingSpinner.classList.remove('hidden');

        try {
            const response = await fetch('http://127.0.0.1:5000/generate', { // Assuming backend runs on 5000
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ user_text: userText }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            aiChatOutput.innerHTML = data.response; // Display AI response
            aiChatInput.value = ''; // Clear input

        } catch (error) {
            console.error("Error generating AI response:", error);
            aiChatError.textContent = `Error: ${error.message}. Please try again.`;
            aiChatError.classList.remove('hidden');
        } finally {
            aiChatLoadingSpinner.classList.add('hidden');
        }
    });

    // Allow sending AI chat message with Enter key
    aiChatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendAiChatBtn.click();
        }
    });

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
        renderGrades(); // Render grades on initial load if user is logged in
    } else if (auth && !auth.currentUser) {
        loadingFirebase.classList.add('hidden');
        landingPage.classList.remove('hidden');
    }
});
