/**
 * Gym Tracker Pro - Core Logic
 */

// --- Configuration ---
// REPLACE WITH YOUR FIREBASE CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyAHLLbo6zbVryKiCH96r84dGX8cOXfzTHE",
    authDomain: "progredi-1.firebaseapp.com",
    projectId: "progredi-1",
    storageBucket: "progredi-1.firebasestorage.app",
    messagingSenderId: "603628930060",
    appId: "1:603628930060:web:2336837d9f7be899771a29",
    measurementId: "G-Z3PEPCMLN3"
};

// --- State Management ---
const state = {
    user: null, // Local user name or Auth User object
    uid: null,  // Firebase User ID
    plan: null,
    workouts: [],
    settings: {
        multiplier: 1.025
    }
};

let db = null;
let auth = null;

// --- DOM Elements ---
const app = document.getElementById('app');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    try {
        initFirebase();
        init();
    } catch (e) {
        console.error("Initialization failed:", e);
        app.innerHTML = `<div class="card"><h1>Error</h1><p>${e.message}</p></div>`;
    }
});

function initFirebase() {
    if (true) {
        firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();
        
        auth.onAuthStateChanged(user => {
            if (user) {
                state.uid = user.uid;
                state.user = user.displayName;
                loadFromFirestore();
            }
        });
    }
}

function init() {
    loadState(); // Try local first
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    if (!state.user) {
        renderLogin();
    } else if (!state.plan) {
        renderSetup();
    } else {
        renderDashboard();
    }
}

function loadState() {
    const saved = localStorage.getItem('gymTrackerState');
    if (saved) {
        Object.assign(state, JSON.parse(saved));
    }
}

function saveState() {
    localStorage.setItem('gymTrackerState', JSON.stringify(state));
    if (state.uid && db) {
        db.collection('users').doc(state.uid).set(state, { merge: true });
    }
}

async function loadFromFirestore() {
    if (!state.uid || !db) return;
    const doc = await db.collection('users').doc(state.uid).get();
    if (doc.exists) {
        Object.assign(state, doc.data());
        renderDashboard();
    }
}

// --- Views ---

function renderLogin() {
    app.innerHTML = `
        <div class="card text-center">
            <h1>Gym Tracker Pro</h1>
            <p>Track your progress. Crush your goals.</p>
            
            <div class="input-group">
                <label>Guest Access</label>
                <input type="text" id="username" placeholder="Enter your name">
                <button class="btn" onclick="handleLogin()">Continue as Guest</button>
            </div>

            <div style="margin: 20px 0; border-top: 1px solid var(--border); position: relative;">
                <span style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: var(--card-bg); padding: 0 10px; color: var(--text-muted); font-size: 0.8rem;">OR</span>
            </div>

            <button class="btn btn-secondary" onclick="handleGoogleLogin()">
                <i data-lucide="log-in" style="margin-right: 8px;"></i> Login with Google
            </button>
            <p style="font-size: 0.8rem; margin-top: 10px; color: var(--text-muted);">
                (Requires Firebase Config in code)
            </p>
        </div>
    `;
    lucide.createIcons();
}

window.handleLogin = () => {
    const username = document.getElementById('username').value;
    if (!username) return alert('Please enter a name');
    state.user = username;
    saveState();
    renderSetup();
};

window.handleGoogleLogin = () => {
    if (!auth) return alert("Firebase not configured. Please add your API keys to script.js");
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(error => alert(error.message));
};

function renderSetup() {
    app.innerHTML = `
        <div class="card">
            <h2>Setup Your Plan</h2>
            <div class="input-group">
                <label>Training Frequency</label>
                <select id="frequency">
                    <option value="3">3 Days</option>
                    <option value="4">4 Days</option>
                    <option value="5">5 Days</option>
                    <option value="6">6 Days</option>
                </select>
            </div>
            <div class="input-group">
                <label>Overload Multiplier</label>
                <select id="multiplier">
                    <option value="1.025">2.5% (Conservative)</option>
                    <option value="1.05">5% (Aggressive)</option>
                </select>
            </div>
            <button class="btn" onclick="handleSetupStep1()">Next: Name Days</button>
        </div>
    `;
}

window.handleSetupStep1 = () => {
    const freq = document.getElementById('frequency').value;
    const mult = document.getElementById('multiplier').value;
    
    state.settings.multiplier = parseFloat(mult);
    // Initialize empty plan
    state.plan = {
        days: Array.from({length: parseInt(freq)}, (_, i) => ({
            name: `Day ${i + 1}`,
            exercises: []
        }))
    };
    renderDayNaming();
};

function renderDayNaming() {
    app.innerHTML = `
        <div class="card">
            <h2>Name Your Days</h2>
            <p>Give each training day a name (e.g., "Push", "Legs").</p>
            <div id="day-inputs">
                ${state.plan.days.map((day, i) => `
                    <div class="input-group">
                        <label>Day ${i + 1}</label>
                        <input type="text" id="day-name-${i}" value="${day.name}">
                    </div>
                `).join('')}
            </div>
            <button class="btn" onclick="handleDayNaming()">Next: Choose Exercises</button>
        </div>
    `;
}

window.handleDayNaming = () => {
    state.plan.days.forEach((_, i) => {
        const name = document.getElementById(`day-name-${i}`).value;
        if (name) state.plan.days[i].name = name;
    });
    saveState();
    renderExerciseSelection(0);
};

function renderExerciseSelection(dayIndex) {
    if (dayIndex >= state.plan.days.length) {
        saveState();
        renderDashboard();
        return;
    }

    const day = state.plan.days[dayIndex];
    
    app.innerHTML = `
        <div class="card">
            <h2>Setup: ${day.name}</h2>
            <p>Add exercises for this day.</p>
            
            <div id="exercise-list">
                ${day.exercises.map(ex => `<div class="exercise-item">${ex}</div>`).join('')}
            </div>

            <div class="input-group mt-4">
                <input type="text" id="new-exercise" placeholder="e.g. Bench Press">
                <button class="btn btn-secondary mt-2" onclick="addExercise(${dayIndex})">Add Exercise</button>
            </div>

            <button class="btn mt-4" onclick="renderExerciseSelection(${dayIndex + 1})">
                ${dayIndex === state.plan.days.length - 1 ? 'Finish Setup' : 'Next Day'}
            </button>
        </div>
    `;
}

window.addExercise = (dayIndex) => {
    const input = document.getElementById('new-exercise');
    if (!input.value) return;
    
    state.plan.days[dayIndex].exercises.push(input.value);
    input.value = '';
    saveState();
    renderExerciseSelection(dayIndex);
};

function renderDashboard() {
    const lastWorkout = state.workouts[state.workouts.length - 1];
    let nextDayIndex = 0;
    
    if (lastWorkout) {
        nextDayIndex = (lastWorkout.dayIndex + 1) % state.plan.days.length;
    }
    
    const nextWorkout = state.plan.days[nextDayIndex];

    app.innerHTML = `
        <header class="flex-between" style="margin-bottom: 20px;">
            <div>
                <h2>Hi, ${state.user.split(' ')[0]}</h2>
                <p>Ready to lift?</p>
            </div>
            <div class="flex-center gap-2">
                ${state.uid ? '<span style="font-size:0.8rem; color:var(--success)">Synced</span>' : ''}
                <button class="btn-secondary" style="width: auto; padding: 8px;" onclick="resetApp()">
                    <i data-lucide="rotate-ccw"></i>
                </button>
            </div>
        </header>

        <div class="card">
            <h3>Next Session: ${nextWorkout.name}</h3>
            <div class="workout-preview">
                ${nextWorkout.exercises.map(ex => `
                    <div class="exercise-item">
                        <span>${ex}</span>
                        <span style="color: var(--primary)">Target: ${getRecommendation(ex)}</span>
                    </div>
                `).join('')}
            </div>
            <button class="btn" onclick="startWorkout(${nextDayIndex})">Start Workout</button>
        </div>

        <div class="card">
            <h3>Progress</h3>
            <p>Workouts Completed: ${state.workouts.length}</p>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${Math.min(state.workouts.length * 5, 100)}%"></div>
            </div>
        </div>
    `;
    lucide.createIcons();
}

function getRecommendation(exerciseName) {
    for (let i = state.workouts.length - 1; i >= 0; i--) {
        const wo = state.workouts[i];
        const record = wo.exercises.find(e => e.name === exerciseName);
        // Check if record has sets (new format) or is old format
        if (record) {
            let bestWeight = 0;
            if (record.sets) {
                bestWeight = Math.max(...record.sets.map(s => s.weight));
            } else {
                bestWeight = record.weight;
            }
            return `${(bestWeight * state.settings.multiplier).toFixed(1)}kg`;
        }
    }
    return "Start Base";
}

window.startWorkout = (dayIndex) => {
    const day = state.plan.days[dayIndex];
    
    app.innerHTML = `
        <div class="card">
            <div class="flex-between">
                <h2>${day.name}</h2>
                <button class="btn-secondary" style="width:auto" onclick="renderDashboard()">Cancel</button>
            </div>
            
            <div id="active-workout">
                ${day.exercises.map((ex, exIdx) => `
                    <div class="card exercise-card" data-exercise="${ex}">
                        <h3>${ex}</h3>
                        <div class="sets-container" id="sets-${exIdx}">
                            <div class="set-row flex-between gap-2">
                                <span class="set-num">1</span>
                                <input type="number" placeholder="kg" class="weight-input">
                                <input type="number" placeholder="reps" class="reps-input">
                            </div>
                        </div>
                        <button class="btn-secondary btn-sm mt-2" onclick="addSet(${exIdx})">+ Add Set</button>
                    </div>
                `).join('')}
            </div>
            <button class="btn" onclick="finishWorkout(${dayIndex})">Complete Workout</button>
        </div>
    `;
};

window.addSet = (exIdx) => {
    const container = document.getElementById(`sets-${exIdx}`);
    const setNum = container.children.length + 1;
    const div = document.createElement('div');
    div.className = 'set-row flex-between gap-2';
    div.innerHTML = `
        <span class="set-num">${setNum}</span>
        <input type="number" placeholder="kg" class="weight-input">
        <input type="number" placeholder="reps" class="reps-input">
    `;
    container.appendChild(div);
};

window.finishWorkout = (dayIndex) => {
    const day = state.plan.days[dayIndex];
    const sessionData = {
        date: new Date().toISOString(),
        dayIndex: dayIndex,
        exercises: []
    };

    const exerciseCards = document.querySelectorAll('.exercise-card');
    exerciseCards.forEach(card => {
        const name = card.dataset.exercise;
        const sets = [];
        card.querySelectorAll('.set-row').forEach(row => {
            const weight = parseFloat(row.querySelector('.weight-input').value) || 0;
            const reps = parseFloat(row.querySelector('.reps-input').value) || 0;
            if (weight > 0 && reps > 0) {
                sets.push({ weight, reps });
            }
        });
        
        if (sets.length > 0) {
            sessionData.exercises.push({ name, sets });
        }
    });

    state.workouts.push(sessionData);
    saveState();
    
    app.innerHTML = `
        <div class="card text-center" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px;">
            <i data-lucide="trophy" style="width: 64px; height: 64px; color: var(--success); margin-bottom: 20px;"></i>
            <h2 style="color: var(--success)">Workout Complete!</h2>
            <p>Great job! Data saved.</p>
            <button class="btn" onclick="renderDashboard()">Back to Home</button>
        </div>
    `;
    lucide.createIcons();
};

window.resetApp = () => {
    if(confirm('Reset all data?')) {
        localStorage.removeItem('gymTrackerState');
        location.reload();
    }
}


