import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
// Import Firestore modules
import { getFirestore, collection, addDoc, getDocs, query, orderBy, doc, deleteDoc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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
    const connectCalendarBtn = document.getElementById('connect-calendar-btn');
    const calendarBtnText = document.getElementById('calendar-btn-text');
    const calendarBtnSpinner = document.getElementById('calendar-btn-spinner');
    const calendarStatus = document.getElementById('calendar-status');

    // Check for calendar connection status from URL on page load
    const checkCalendarStatus = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const calendarStatusParam = urlParams.get('calendar_status');

        if (calendarStatusParam === 'connected') {
            // If connection is successful, hide the button and show the status message
            connectCalendarBtn.classList.add('hidden');
            calendarStatus.classList.remove('hidden');
        }
    };
    checkCalendarStatus();

    // Function to display a specific page
    const displayPage = async (pageId) => {
        document.querySelectorAll('.page-content').forEach(page => page.classList.remove('active'));
        document.getElementById(pageId).classList.add('active');
        if (pageId === 'grade-tracker-page') {
            await loadGradePointSettings();
            await loadGrades();
        } else if (pageId === 'dashboard-page') {
            await updateDashboardGrades();
        } else if (pageId === 'settings-page') {
            await loadGradePointSettings();
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

    // --- Calendar Connect Button ---
    connectCalendarBtn.addEventListener('click', () => {
        // Update button state to show it's working
        calendarBtnText.textContent = 'Connecting...';
        calendarBtnSpinner.classList.remove('hidden');
        connectCalendarBtn.disabled = true;
        connectCalendarBtn.classList.add('connecting');

        // Redirect to the backend authorization endpoint
        window.location.href = 'https://student-planner-backend.onrender.com/authorize';
    });

    // --- GPA & Grade Functions ---
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

    const renderGradePointSettings = () => {
        gradePointSettingsContainer.innerHTML = '';
        gradePointSettingsLoading.classList.add('hidden');
        for (const grade in gradePointMap) {
            if (gradePointMap[grade] !== null) {
                const settingDiv = document.createElement('div');
                settingDiv.className = 'flex items-center space-x-2';
                settingDiv.innerHTML = `
                    <label for="gp-${grade}" class="text-gray-700 dark:text-gray-300 font-medium">${grade}:</label>
                    <input type="number" id="gp-${grade}" class="form-input text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 w-full p-2 rounded-lg" step="0.1" value="${gradePointMap[grade].toFixed(1)}">
                `;
                gradePointSettingsContainer.appendChild(settingDiv);
                const inputElement = document.getElementById(`gp-${grade}`);
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
            console.error("Error loading GPA settings:", e);
        } finally {
            renderGradePointSettings();
        }
    }

    async function loadGrades() {
        const userId = auth.currentUser ? auth.currentUser.uid : null;
        if (!userId) return;
        try {
            const gradesCollectionRef = collection(db, `users/${userId}/grades`);
            const q = query(gradesCollectionRef, orderBy('timestamp', 'desc'));
            const querySnapshot = await getDocs(q);
            const currentCourses = [];
            querySnapshot.forEach((doc) => currentCourses.push({ id: doc.id, ...doc.data() }));
            coursesListBody.innerHTML = '';
            if (currentCourses.length === 0) {
                noCoursesRow.style.display = '';
            } else {
                noCoursesRow.style.display = 'none';
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

    async function deleteCourse(event) {
        const userId = auth.currentUser ? auth.currentUser.uid : null;
        if (!userId) return;
        const courseId = event.currentTarget.dataset.id;
        if (confirm("Are you sure you want to delete this course?")) {
            try {
                await deleteDoc(doc(db, `users/${userId}/grades`, courseId));
                await loadGrades();
                await updateDashboardGrades();
            } catch (e) {
                console.error("Error deleting document: ", e);
            }
        }
    }

    addCourseBtn.addEventListener('click', async () => {
        const userId = auth.currentUser ? auth.currentUser.uid : null;
        if (!userId) { return; }
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
            await addDoc(collection(db, `users/${userId}/grades`), { name: courseName || "Unnamed Course", credits, grade, timestamp: new Date() });
            newCourseNameInput.value = ''; newCourseCreditsInput.value = '1.0'; newCourseGradeSelect.value = '';
            await loadGrades();
            await updateDashboardGrades();
        } catch (e) { console.error("Error adding document: ", e); }
    });

    async function updateDashboardGrades() {
        recentGradesLoadingDashboard.style.display = 'block';
        recentGradesListDashboard.innerHTML = '';
        overallGpaDashboard.textContent = '...';
        const userId = auth.currentUser ? auth.currentUser.uid : null;
        if (!userId) { return; }
        try {
            await loadGradePointSettings();
            const gradesCollectionRef = collection(db, `users/${userId}/grades`);
            const allCoursesQuerySnapshot = await getDocs(gradesCollectionRef);
            const allCourses = [];
            allCoursesQuerySnapshot.forEach((doc) => allCourses.push({ id: doc.id, ...doc.data() }));
            recentGradesLoadingDashboard.style.display = 'none';
            if (allCourses.length === 0) {
                overallGpaDashboard.textContent = 'N/A';
                recentGradesListDashboard.innerHTML = `<p class="text-center text-gray-500">Go to the Grade Tracker to add courses.</p>`;
                return;
            }
            const { gpa } = calculateGPA(allCourses);
            overallGpaDashboard.textContent = gpa;
            allCourses.sort((a, b) => (b.timestamp.seconds || 0) - (a.timestamp.seconds || 0));
            const recentCourses = allCourses.slice(0, 5);
            recentCourses.forEach((course) => {
                const gradeItem = document.createElement('div');
                gradeItem.className = 'flex items-center justify-between py-2 border-b last:border-b-0 border-gray-200 dark:border-gray-700';
                gradeItem.innerHTML = `<span class="text-gray-800 dark:text-gray-200">${course.name || 'Unnamed Course'}</span><span class="text-lg font-semibold text-indigo-600 dark:text-indigo-400">${course.grade}</span>`;
                recentGradesListDashboard.appendChild(gradeItem);
            });
        } catch (e) {
            console.error("Error updating dashboard grades:", e);
            recentGradesLoadingDashboard.style.display = 'none';
            overallGpaDashboard.textContent = 'Error';
            recentGradesListDashboard.innerHTML = `<p class="text-red-500 text-center">Could not load grade data.</p>`;
        }
    }
    
    calculatePlanningGpaBtn.addEventListener('click', () => { /* GPA planning logic */ });
    deleteUserDataBtn.addEventListener('click', async () => { /* Delete logic */ });
});
let chatHistory = [];
let lastScheduleText = "";

const addChatMessage = (message, isUser = false) => {
    const messageDiv = document.createElement('div');
    messageDiv.className = `mb-4 flex ${isUser ? 'justify-end' : 'justify-start'} animate-fadeIn`;
    
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = `max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
        isUser 
            ? 'chat-bubble-user text-white shadow-lg' 
            : 'chat-bubble-ai text-gray-800 dark:text-gray-100 shadow-md border border-gray-200 dark:border-gray-600'
    }`;
    
    if (isUser) {
        bubbleDiv.innerHTML = `<p class="text-sm font-medium">${escapeHtml(message)}</p>`;
    } else {
        const formattedMessage = formatAIResponse(message);
        bubbleDiv.innerHTML = formattedMessage;
    }
    
    messageDiv.appendChild(bubbleDiv);
    aiChatOutput.appendChild(messageDiv);
    
    // Smooth scroll to show new message
    setTimeout(() => {
        aiChatOutput.scrollTop = aiChatOutput.scrollHeight;
    }, 100);
};

const escapeHtml = (text) => {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
};

const formatAIResponse = (text) => {
    // Convert line breaks and format the response for better readability
    let formatted = escapeHtml(text)
        .replace(/\n\n/g, '</p><p class="mb-3">')
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-indigo-700 dark:text-indigo-300">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em class="italic text-gray-600 dark:text-gray-400">$1</em>');
    
    // Wrap in paragraph tags
    formatted = `<div class="prose prose-sm max-w-none text-gray-700 dark:text-gray-300"><p class="mb-3">${formatted}</p></div>`;
    
    // Format time blocks better
    formatted = formatted.replace(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/g, 
        '<span class="inline-block bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-2 py-1 rounded-md text-xs font-mono font-semibold mr-1 mb-1">$1–$2</span>');
    
    // Format day headers
    formatted = formatted.replace(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)(:|\s*-)/g, 
        '<h4 class="font-bold text-lg text-indigo-600 dark:text-indigo-400 mt-4 mb-2 flex items-center"><svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>$1</h4>');
    
    return formatted;
};

const sendChatMessage = async () => {
    const message = aiChatInput.value.trim();
    if (!message) return;
    
    // Clear input and show user message
    aiChatInput.value = '';
    aiChatInput.style.height = 'auto';
    addChatMessage(message, true);
    chatHistory.push({ role: 'user', content: message });
    
    // Show loading state
    aiChatLoadingSpinner.classList.remove('hidden');
    sendAiChatBtn.disabled = true;
    sendAiChatBtn.innerHTML = '<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>';
    aiChatError.classList.add('hidden');
    
    try {
        const response = await fetch('https://student-planner-backend.onrender.com/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_text: message,
                last_schedule_text: lastScheduleText
            })
        });
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}. Please try again.`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Store the schedule text for future reference
        if (data.last_schedule_text) {
            lastScheduleText = data.last_schedule_text;
        }
        
        // Add AI response
        addChatMessage(data.response, false);
        chatHistory.push({ role: 'assistant', content: data.response });
        
    } catch (error) {
        console.error('Error sending chat message:', error);
        const errorText = `${error.message} Please try again.`;
        document.getElementById('ai-chat-error-text').textContent = errorText;
        aiChatError.classList.remove('hidden');
        
        // Add error message to chat
        addChatMessage('Sorry, I encountered an error. Please try again in a moment.', false);
    } finally {
        // Reset loading state
        aiChatLoadingSpinner.classList.add('hidden');
        sendAiChatBtn.disabled = false;
        sendAiChatBtn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>';
        aiChatInput.focus();
    }
};

const initializeTimeManagement = () => {
    if (aiChatOutput.children.length === 0) {
        setTimeout(() => {
            addChatMessage("🎯 Hi there! I'm your AI scheduling assistant. I can help you create personalized study schedules that work with your lifestyle.\n\n💡 **To get started, try saying:**\n• 'Generate a daily schedule'\n• 'I need help balancing homework and sleep'\n• 'Create a weekly study plan'\n\nJust tell me about your routine, classes, and goals!", false);
        }, 500);
    }
};

// Update your existing displayPage function to include time management initialization
const originalDisplayPage = displayPage; // Store reference to existing function
displayPage = async (pageId) => {
    document.querySelectorAll('.page-content').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    if (pageId === 'grade-tracker-page') {
        await loadGradePointSettings();
        await loadGrades();
    } else if (pageId === 'dashboard-page') {
        await updateDashboardGrades();
    } else if (pageId === 'settings-page') {
        await loadGradePointSettings();
    } else if (pageId === 'time-management-page') {
        initializeTimeManagement();
    }
    
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const activeNavItem = document.getElementById(`nav-${pageId.replace('-page', '')}`);
    if (activeNavItem) activeNavItem.classList.add('active');
};

// Add these event listeners to your existing event listeners section
sendAiChatBtn.addEventListener('click', sendChatMessage);

aiChatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
    }
});

// Auto-resize textarea
aiChatInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});

// Add CSS animation for fade in effect
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .animate-fadeIn {
        animation: fadeIn 0.3s ease-out;
    }
`;
document.head.appendChild(style);

