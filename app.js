// app.js

// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
// Import Firestore modules
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// YOUR FIREBASE CONFIGURATION - REPLACE WITH YOUR ACTUAL VALUES FROM FIREBASE CONSOLE
const firebaseConfig = {
  apiKey: "AIzaSyBMDzrZurHNHR_5QMIGzCOisVoAxOJ0d08",
  authDomain: "congressional-app-challe-eb3be.firebaseapp.com",
  projectId: "congressional-app-challe-eb3be",
  storageBucket: "congressional-app-challe-eb3be.firebasestorage.app",
  messagingSenderId: "182459835746",
  appId: "1:182459835746:web:8ae5e7a988dc88bb7e383b",
  measurementId: "G-JRLCDXSSLT"
};


// Global variables (derived from firebaseConfig or set to null/defaults)
const appId = typeof __app_id !== 'undefined' ? __app_id : firebaseConfig.appId;
const firebaseConfigParsed = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : firebaseConfig;
let db; // Firestore instance
let auth; // Auth instance
let userId = null; // Current user ID

// Initialize Firebase
let app;
try {
    app = initializeApp(firebaseConfigParsed);
    db = getFirestore(app);
    auth = getAuth(app);
    console.log("Firebase initialized successfully.");
} catch (error) {
    console.error("Error initializing Firebase:", error);
    // Display a user-friendly error message if Firebase fails to initialize
    document.getElementById('loading-firebase').innerHTML = `
        <div class="text-red-500 text-center p-4">
            <p class="font-bold">Error loading application.</p>
            <p>Please check your internet connection or try again later.</p>
            <p class="text-sm mt-2">Details: ${error.message}</p>
        </div>
    `;
    // Prevent further execution if Firebase is not initialized
    throw new Error("Firebase initialization failed.");
}


// Custom Alert/Modal Function
function showCustomAlert(message, type = 'info') {
    const alertModal = document.getElementById('custom-alert-modal');
    const alertMessage = document.getElementById('custom-alert-message');
    const alertHeader = document.getElementById('custom-alert-header');
    const alertIcon = document.getElementById('custom-alert-icon');

    alertMessage.textContent = message;

    // Reset classes
    alertHeader.className = 'flex items-center p-4 rounded-t-lg';
    alertIcon.innerHTML = ''; // Clear previous icon

    if (type === 'success') {
        alertHeader.classList.add('bg-green-500', 'text-white');
        alertIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
    } else if (type === 'error') {
        alertHeader.classList.add('bg-red-500', 'text-white');
        alertIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2L8 8m4 4l-2 2m2-2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
    } else { // info or default
        alertHeader.classList.add('bg-blue-500', 'text-white');
        alertIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
    }

    alertModal.classList.remove('hidden');
    setTimeout(() => {
        alertModal.classList.add('hidden');
    }, 3000); // Auto-hide after 3 seconds
}


// DOM Elements
const loadingFirebase = document.getElementById('loading-firebase');
const landingPage = document.getElementById('landing-page');
const mainAppLayout = document.getElementById('main-app-layout');
const getStartedBtn = document.getElementById('get-started-btn');
const logoutBtn = document.getElementById('logout-btn');
const userIdDisplay = document.getElementById('user-id-display');

// Navigation elements
const navLinks = document.querySelectorAll('.nav-link');
const pageContents = document.querySelectorAll('.page-content');

// Grade Tracker elements
const gradeForm = document.getElementById('grade-form');
const courseNameInput = document.getElementById('course-name');
const gradeInput = document.getElementById('grade');
const weightInput = document.getElementById('weight');
const gradesList = document.getElementById('grades-list');
const gpaDisplay = document.getElementById('gpa-display');
const overallGpaDisplay = document.getElementById('overall-gpa-display');

// Dashboard elements
const dashboardGradesSummary = document.getElementById('dashboard-grades-summary');
const dashboardTimeManagementSummary = document.getElementById('dashboard-time-management-summary');

// Time Management elements
const aiChatOutput = document.getElementById('ai-chat-output');
const aiChatInput = document.getElementById('ai-chat-input');
const sendChatBtn = document.getElementById('send-chat-btn');
const generateScheduleBtn = document.getElementById('generate-schedule-btn');

// Settings elements
const deleteUserDataBtn = document.getElementById('delete-user-data-btn');
const deleteUserDataMessage = document.getElementById('delete-user-data-message');


// Function to display specific page
function displayPage(pageId) {
    pageContents.forEach(page => {
        page.classList.remove('active', 'animate-fade-in-down');
    });
    const activePage = document.getElementById(pageId);
    if (activePage) {
        activePage.classList.add('active', 'animate-fade-in-down');
    }

    // Update active nav link styling
    navLinks.forEach(link => {
        if (link.getAttribute('data-page') === pageId) {
            link.classList.add('bg-indigo-700', 'text-white');
            link.classList.remove('text-indigo-200', 'hover:bg-indigo-600');
        } else {
            link.classList.remove('bg-indigo-700', 'text-white');
            link.classList.add('text-indigo-200', 'hover:bg-indigo-600');
        }
    });
}

// Function to handle authentication state changes
onAuthStateChanged(auth, async (user) => {
    loadingFirebase.classList.add('hidden'); // Hide loading spinner once auth state is known
    if (user) {
        // User is signed in
        userId = user.uid;
        landingPage.classList.add('hidden');
        mainAppLayout.classList.remove('hidden');
        userIdDisplay.textContent = `User ID: ${userId}`;
        displayPage('dashboard-page'); // Default to dashboard on login
        await loadGrades(); // Load grades for grade tracker
        await updateDashboardGrades(); // Update dashboard summary
    } else {
        // User is signed out
        userId = null;
        mainAppLayout.classList.add('hidden');
        landingPage.classList.remove('hidden');
        userIdDisplay.textContent = 'User ID: N/A';
        // Clear any displayed data if user logs out
        gradesList.innerHTML = '';
        gpaDisplay.textContent = '0.00';
        overallGpaDisplay.textContent = '0.00';
        aiChatOutput.innerHTML = '';
        dashboardGradesSummary.innerHTML = '<p class="text-gray-600 dark:text-gray-400">No grades to display.</p>';
        dashboardTimeManagementSummary.innerHTML = '<p class="text-gray-600 dark:text-gray-400">No schedule generated yet.</p>';
    }
});

// Initial authentication check (for when the page first loads)
document.addEventListener('DOMContentLoaded', async () => {
    // Attempt to sign in anonymously if no user is authenticated
    if (!auth.currentUser) {
        try {
            // Use the __initial_auth_token if available for custom auth, otherwise sign in anonymously
            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                await signInWithCustomToken(auth, __initial_auth_token);
                console.log("Signed in with custom token.");
            } else {
                await signInAnonymously(auth);
                console.log("Signed in anonymously.");
            }
        } catch (error) {
            console.error("Error during initial sign-in:", error);
            showCustomAlert(`Authentication failed: ${error.message}`, 'error');
            loadingFirebase.classList.add('hidden');
            landingPage.classList.remove('hidden');
        }
    }
});


// Event Listeners

// Get Started Button
getStartedBtn.addEventListener('click', () => {
    // The onAuthStateChanged listener will handle the UI update after anonymous sign-in
    // No explicit action needed here beyond triggering the sign-in if not already
    console.log("Get Started button clicked.");
});

// Logout Button
logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        showCustomAlert("Logged out successfully!", 'success');
    } catch (error) {
        console.error("Error logging out:", error);
        showCustomAlert(`Logout failed: ${error.message}`, 'error');
    }
});

// Navigation Links
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const pageId = link.getAttribute('data-page');
        displayPage(pageId);
        // Load data specific to the page if needed
        if (pageId === 'grade-tracker-page' && userId) {
            loadGrades();
        } else if (pageId === 'dashboard-page' && userId) {
            updateDashboardGrades();
        }
    });
});

// Grade Tracker Functions
async function addGrade(courseName, grade, weight) {
    if (!userId) {
        showCustomAlert("Please sign in to add grades.", 'error');
        return;
    }
    try {
        const gradesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/grades`);
        await addDoc(gradesCollectionRef, {
            courseName: courseName,
            grade: parseFloat(grade),
            weight: parseFloat(weight),
            timestamp: new Date()
        });
        showCustomAlert("Grade added successfully!", 'success');
        await loadGrades(); // Reload grades to update the list
        await updateDashboardGrades(); // Update dashboard
    } catch (e) {
        console.error("Error adding document: ", e);
        showCustomAlert(`Error adding grade: ${e.message}`, 'error');
    }
}

async function loadGrades() {
    if (!userId) {
        gradesList.innerHTML = '<p class="text-gray-600 dark:text-gray-400">Please sign in to view grades.</p>';
        gpaDisplay.textContent = '0.00';
        overallGpaDisplay.textContent = '0.00';
        return;
    }
    gradesList.innerHTML = '<p class="text-gray-600 dark:text-gray-400">Loading grades...</p>';
    try {
        const gradesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/grades`);
        // Note: orderBy is commented out to avoid potential index issues as per instructions.
        // If sorting is needed, it should be done client-side.
        const q = query(gradesCollectionRef); // Removed orderBy( "timestamp", "desc")
        const querySnapshot = await getDocs(q);

        let grades = [];
        querySnapshot.forEach((doc) => {
            grades.push({ id: doc.id, ...doc.data() });
        });

        // Client-side sorting by timestamp (descending)
        grades.sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate());

        displayGrades(grades);
        calculateGPA(grades);
    } catch (e) {
        console.error("Error loading grades: ", e);
        gradesList.innerHTML = `<p class="text-red-500">Error loading grades: ${e.message}</p>`;
        showCustomAlert(`Error loading grades: ${e.message}`, 'error');
    }
}

function displayGrades(grades) {
    gradesList.innerHTML = ''; // Clear current list
    if (grades.length === 0) {
        gradesList.innerHTML = '<p class="text-gray-600 dark:text-gray-400">No grades added yet.</p>';
        return;
    }
    grades.forEach(grade => {
        const li = document.createElement('li');
        li.className = 'flex justify-between items-center bg-gray-100 dark:bg-gray-700 p-3 rounded-lg shadow-sm mb-2 animate-fade-in-up';
        li.innerHTML = `
            <div>
                <span class="font-semibold">${grade.courseName}:</span> ${grade.grade}% (Weight: ${grade.weight})
            </div>
            <button data-id="${grade.id}" class="delete-grade-btn text-red-500 hover:text-red-700 ml-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm6 0a1 1 0 01-2 0v6a1 1 0 112 0V8z" clip-rule="evenodd" />
                </svg>
            </button>
        `;
        gradesList.appendChild(li);
    });

    // Add event listeners for delete buttons
    document.querySelectorAll('.delete-grade-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const gradeId = e.currentTarget.dataset.id;
            if (confirm("Are you sure you want to delete this grade?")) { // Using confirm for simplicity, replace with custom modal in production
                await deleteGrade(gradeId);
            }
        });
    });
}

async function deleteGrade(gradeId) {
    if (!userId) {
        showCustomAlert("Please sign in to delete grades.", 'error');
        return;
    }
    try {
        const gradeDocRef = doc(db, `artifacts/${appId}/users/${userId}/grades`, gradeId);
        await deleteDoc(gradeDocRef);
        showCustomAlert("Grade deleted successfully!", 'success');
        await loadGrades(); // Reload grades
        await updateDashboardGrades(); // Update dashboard
    } catch (e) {
        console.error("Error deleting document: ", e);
        showCustomAlert(`Error deleting grade: ${e.message}`, 'error');
    }
}

function calculateGPA(grades) {
    if (grades.length === 0) {
        gpaDisplay.textContent = '0.00';
        overallGpaDisplay.textContent = '0.00';
        return;
    }

    let totalWeightedPoints = 0;
    let totalWeight = 0;
    let totalGrades = 0;
    let sumOfGrades = 0;

    grades.forEach(g => {
        // Convert percentage grade to a 4.0 scale for GPA calculation
        // This is a simplified conversion. A more accurate system would use letter grades.
        let gpaEquivalent = 0;
        if (g.grade >= 90) gpaEquivalent = 4.0;
        else if (g.grade >= 80) gpaEquivalent = 3.0;
        else if (g.grade >= 70) gpaEquivalent = 2.0;
        else if (g.grade >= 60) gpaEquivalent = 1.0;
        else gpaEquivalent = 0.0;

        totalWeightedPoints += gpaEquivalent * g.weight;
        totalWeight += g.weight;
        sumOfGrades += g.grade;
        totalGrades++;
    });

    const calculatedGPA = totalWeight > 0 ? (totalWeightedPoints / totalWeight).toFixed(2) : '0.00';
    const averagePercentage = totalGrades > 0 ? (sumOfGrades / totalGrades).toFixed(2) : '0.00';

    gpaDisplay.textContent = calculatedGPA;
    overallGpaDisplay.textContent = `${averagePercentage}%`;
}

// Grade Form Submission
gradeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const courseName = courseNameInput.value.trim();
    const grade = gradeInput.value.trim();
    const weight = weightInput.value.trim();

    if (courseName && grade && weight) {
        await addGrade(courseName, grade, weight);
        courseNameInput.value = '';
        gradeInput.value = '';
        weightInput.value = '';
    } else {
        showCustomAlert("Please fill in all grade fields.", 'error');
    }
});

// Dashboard Functions
async function updateDashboardGrades() {
    if (!userId) {
        dashboardGradesSummary.innerHTML = '<p class="text-gray-600 dark:text-gray-400">Please sign in to view grades summary.</p>';
        return;
    }
    try {
        const gradesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/grades`);
        const q = query(gradesCollectionRef);
        const querySnapshot = await getDocs(q);

        let grades = [];
        querySnapshot.forEach((doc) => {
            grades.push({ id: doc.id, ...doc.data() });
        });

        if (grades.length === 0) {
            dashboardGradesSummary.innerHTML = '<p class="text-gray-600 dark:text-gray-400">No grades to display. Add some in the Grade Tracker!</p>';
            return;
        }

        let totalWeightedPoints = 0;
        let totalWeight = 0;
        let sumOfGrades = 0;
        let totalCourses = 0;
        const courseAverages = {}; // To store average for each course

        grades.forEach(g => {
            // Calculate GPA equivalent
            let gpaEquivalent = 0;
            if (g.grade >= 90) gpaEquivalent = 4.0;
            else if (g.grade >= 80) gpaEquivalent = 3.0;
            else if (g.grade >= 70) gpaEquivalent = 2.0;
            else if (g.grade >= 60) gpaEquivalent = 1.0;
            else gpaEquivalent = 0.0;

            totalWeightedPoints += gpaEquivalent * g.weight;
            totalWeight += g.weight;

            // Calculate course averages
            if (!courseAverages[g.courseName]) {
                courseAverages[g.courseName] = { sum: 0, count: 0, totalWeight: 0 };
            }
            courseAverages[g.courseName].sum += g.grade * g.weight; // Sum of grade * weight
            courseAverages[g.courseName].totalWeight += g.weight; // Sum of weights for the course
            totalCourses++;
        });

        const overallCalculatedGPA = totalWeight > 0 ? (totalWeightedPoints / totalWeight).toFixed(2) : '0.00';

        let summaryHtml = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-indigo-100 dark:bg-indigo-900 p-4 rounded-lg shadow-md">
                    <h3 class="font-semibold text-lg text-indigo-800 dark:text-indigo-200 mb-2">Overall GPA</h3>
                    <p class="text-3xl font-bold text-indigo-900 dark:text-indigo-100">${overallCalculatedGPA}</p>
                </div>
                <div class="bg-blue-100 dark:bg-blue-900 p-4 rounded-lg shadow-md">
                    <h3 class="font-semibold text-lg text-blue-800 dark:text-blue-200 mb-2">Total Courses Tracked</h3>
                    <p class="text-3xl font-bold text-blue-900 dark:text-blue-100">${Object.keys(courseAverages).length}</p>
                </div>
            </div>
            <h3 class="font-semibold text-xl text-gray-900 dark:text-gray-100 mt-6 mb-3">Course Breakdown</h3>
            <ul class="space-y-2">
        `;

        for (const courseName in courseAverages) {
            const avg = courseAverages[courseName];
            const courseAvgPercentage = avg.totalWeight > 0 ? (avg.sum / avg.totalWeight).toFixed(2) : '0.00';
            summaryHtml += `
                <li class="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm flex justify-between items-center">
                    <span class="font-medium">${courseName}</span>
                    <span class="text-gray-700 dark:text-gray-300">${courseAvgPercentage}%</span>
                </li>
            `;
        }
        summaryHtml += `</ul>`;
        dashboardGradesSummary.innerHTML = summaryHtml;

    } catch (e) {
        console.error("Error updating dashboard grades: ", e);
        dashboardGradesSummary.innerHTML = `<p class="text-red-500">Error loading dashboard grades: ${e.message}</p>`;
    }
}

// Time Management Chatbot Functions
sendChatBtn.addEventListener('click', async () => {
    const userText = aiChatInput.value.trim();
    if (userText) {
        await sendUserMessageToAI(userText);
    } else {
        showCustomAlert("Please enter a message.", 'info');
    }
});

aiChatInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
        const userText = aiChatInput.value.trim();
        if (userText) {
            await sendUserMessageToAI(userText);
        } else {
            showCustomAlert("Please enter a message.", 'info');
        }
    }
});

generateScheduleBtn.addEventListener('click', async () => {
    const prompt = "generate schedule";
    await sendUserMessageToAI(prompt);
});

async function sendUserMessageToAI(userText) {
    // Display user message
    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'flex justify-end mb-2';
    const userBubble = document.createElement('div');
    userBubble.className = 'bg-indigo-500 text-white p-3 rounded-lg max-w-[80%]';
    userBubble.textContent = userText; // Use textContent to prevent XSS
    userMessageDiv.appendChild(userBubble);
    aiChatOutput.prepend(userMessageDiv); // Add to top to maintain reverse order
    aiChatInput.value = ''; // Clear input

    // Display loading indicator for AI response
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'flex justify-start mb-2';
    loadingDiv.innerHTML = `
        <div class="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 p-3 rounded-lg max-w-[80%] flex items-center">
            <svg class="animate-spin h-5 w-5 mr-3 text-gray-500" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generating response...
        </div>
    `;
    aiChatOutput.prepend(loadingDiv);

    try {
        const response = await fetch('http://127.0.0.1:5000/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ user_text: userText })
        });

        const data = await response.json();

        // Remove loading indicator
        aiChatOutput.removeChild(loadingDiv);

        const aiMessageDiv = document.createElement('div');
        aiMessageDiv.className = 'flex justify-start mb-2';
        const aiBubble = document.createElement('div');
        aiBubble.className = 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 p-3 rounded-lg max-w-[80%] prose dark:prose-invert';

        if (response.ok) {
            // Convert markdown to HTML for display
            aiBubble.innerHTML = marked.parse(data.response);
        } else {
            aiBubble.textContent = `Error: ${data.error || 'Unknown error'}`;
            showCustomAlert(`AI response error: ${data.error || 'Unknown error'}`, 'error');
        }
        aiMessageDiv.appendChild(aiBubble);
        aiChatOutput.prepend(aiMessageDiv);

        // Update dashboard time management summary with the latest AI response
        dashboardTimeManagementSummary.innerHTML = marked.parse(data.response);

    } catch (error) {
        console.error("Error fetching AI response:", error);
        // Remove loading indicator
        aiChatOutput.removeChild(loadingDiv);

        const errorMessageDiv = document.createElement('div');
        errorMessageDiv.className = 'flex justify-start mb-2';
        const errorBubble = document.createElement('div');
        errorBubble.className = 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 p-3 rounded-lg max-w-[80%]';
        errorBubble.textContent = 'Failed to get AI response. Please check the backend server and your network connection.';
        errorMessageDiv.appendChild(errorBubble);
        aiChatOutput.prepend(errorMessageDiv);
        showCustomAlert("Failed to get AI response. Check console for details.", 'error');
    }
}

// Settings Page Functions
deleteUserDataBtn.addEventListener('click', async () => {
    if (!userId) {
        showCustomAlert("No user is signed in.", 'error');
        return;
    }

    // Custom confirmation dialog
    const confirmDeleteModal = document.getElementById('confirm-delete-modal');
    confirmDeleteModal.classList.remove('hidden');

    document.getElementById('confirm-delete-yes').onclick = async () => {
        confirmDeleteModal.classList.add('hidden');
        deleteUserDataMessage.classList.add('hidden'); // Hide previous messages

        try {
            // Delete grades collection
            const gradesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/grades`);
            const querySnapshot = await getDocs(query(gradesCollectionRef));
            const deletePromises = [];
            querySnapshot.forEach((docToDelete) => {
                deletePromises.push(deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/grades`, docToDelete.id)));
            });
            await Promise.all(deletePromises);
            console.log("All grades deleted for user:", userId);

            // After deleting data, sign out the user
            await signOut(auth);
            showCustomAlert("All your data has been deleted and you have been logged out.", 'success');
            deleteUserDataMessage.textContent = 'All your data has been successfully deleted.';
            deleteUserDataMessage.classList.remove('hidden', 'text-red-600', 'dark:text-red-400');
            deleteUserDataMessage.classList.add('text-green-600', 'dark:text-green-400');

        } catch (e) {
            console.error("Error deleting user data:", e);
            deleteUserDataMessage.textContent = `Error deleting data: ${e.message}. Please try again or contact support.`;
            deleteUserDataMessage.classList.remove('hidden');
            showCustomAlert("Error deleting data. Please check console for details.", 'error');
        }
    };

    document.getElementById('confirm-delete-no').onclick = () => {
        confirmDeleteModal.classList.add('hidden');
        showCustomAlert("Data deletion cancelled.", 'info');
    };
});


// Initial calls if user is already authenticated on page load
// This block handles the state when the page first loads.
// The onAuthStateChanged listener will also handle this, but this ensures
// the initial UI state is set up quickly.
// This block is largely redundant due to onAuthStateChanged and DOMContentLoaded listener
// but kept for clarity on initial load intent.
/*
document.addEventListener('DOMContentLoaded', async () => {
    if (auth && auth.currentUser) {
        loadingFirebase.classList.add('hidden');
        landingPage.classList.add('hidden');
        mainAppLayout.classList.remove('hidden');
        const userId = auth.currentUser.uid || crypto.randomUUID();
        userIdDisplay.textContent = `User ID: ${userId}`;
        displayPage('dashboard-page'); // Start on dashboard
        // Await these initial loads to ensure data is present before user interacts
        await loadGrades(); // Load grades for grade tracker if user is on this page initially
        await updateDashboardGrades(); // Update dashboard on initial load
    } else if (auth && !auth.currentUser) {
        loadingFirebase.classList.add('hidden');
        landingPage.classList.remove('hidden');
    }
});
*/
