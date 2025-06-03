import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Main application entry point

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM loaded, initializing application...');
    
    // Check if this is demo mode via URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const isDemoMode = urlParams.get('demo') === 'true';
    
    if (isDemoMode) {
        console.log('Demo mode detected - skipping authentication');
        showDemoMode();
        initializeApp();
        return;
    }
    
    // Wait for Firebase to be initialized for authenticated mode
    const checkFirebase = () => {
        if (window.auth) {
            initializeAuthCheck();
        } else {
            // If Firebase config is missing, fall back to demo mode
            setTimeout(() => {
                if (!window.auth) {
                    console.log('Firebase not available - falling back to demo mode');
                    showDemoMode();
                    initializeApp();
                }
            }, 2000);
        }
    };
    checkFirebase();
});

function initializeAuthCheck() {
    // Check if this is demo mode (no Firebase auth)
    if (!window.auth) {
        console.log('Demo mode - no authentication');
        showDemoMode();
        return;
    }
    
    // Check authentication first
    onAuthStateChanged(window.auth, (user) => {
        if (!user) {
            // No user signed in, redirect to login
            console.log('No user signed in, redirecting to login...');
            window.location.href = 'index.html';
            return;
        }
        
        console.log('User signed in:', user.email);
        
        // Initialize storage first, then initialize app
        if (window.storage && window.storage.initializeStorage) {
            window.storage.initializeStorage(user);
        }
        
        showUserInfo(user);
        
        // Small delay to ensure storage is initialized
        setTimeout(() => {
            initializeApp();
        }, 100);
    });
}

function showDemoMode() {
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (userInfo && userName) {
        userName.innerHTML = '<span class="demo-mode-indicator">DEMO</span>Demo User';
        userInfo.style.display = 'flex';
        
        // Initialize demo storage here
        if (window.storage && window.storage.initializeStorage) {
            window.storage.initializeStorage(null);
        }
        
        if (logoutBtn) {
            logoutBtn.textContent = 'Exit Demo';
            logoutBtn.addEventListener('click', () => {
                // Cleanup storage listeners before leaving
                if (window.storage && window.storage.cleanup) {
                    window.storage.cleanup();
                }
                window.location.href = 'index.html';
            });
        }
    }
    
    // Initialize app for demo mode
    setTimeout(() => {
        initializeApp();
    }, 100);
}

async function initializeApp() {
    try {
        console.log('Starting app initialization...');
        
        // Wait for all modules to be loaded
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check if all required modules are available
        const requiredModules = ['darkMode', 'markdown', 'modals', 'notesList', 'editor', 'events', 'storage'];
        const missingModules = requiredModules.filter(module => !window[module]);
        
        if (missingModules.length > 0) {
            console.error('Missing modules:', missingModules);
            console.log('Available modules:', Object.keys(window).filter(key => requiredModules.includes(key)));
            alert('Some modules failed to load. Please refresh the page.');
            return;
        }
        
        // Initialize dark mode first
        console.log('Initializing dark mode...');
        if (window.darkMode?.initializeDarkMode) {
            window.darkMode.initializeDarkMode();
        }
        
        // Initialize editor
        console.log('Initializing editor...');
        if (window.editor?.initializeEditor) {
            await window.editor.initializeEditor();
        } else {
            console.error('Editor initialization function missing');
        }
        
        // Setup all event listeners
        console.log('Setting up event listeners...');
        if (window.events?.setupEventListeners) {
            window.events.setupEventListeners();
        } else {
            console.error('Events setup function missing');
        }
        
        // Initial render of notes list
        console.log('Rendering notes list...');
        if (window.notesList?.renderNotesList) {
            window.notesList.renderNotesList();
        }
        
        console.log('✅ Application initialization complete');
    } catch (error) {
        console.error('❌ Error during application initialization:', error);
        alert('Application failed to initialize properly. Please refresh the page.');
    }
}

// Show user information in the UI
function showUserInfo(user) {
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (userInfo && userName) {
        userName.textContent = user.displayName || user.email || 'User';
        userInfo.style.display = 'flex';
        
        if (logoutBtn) {
            // Remove any existing listeners
            const newLogoutBtn = logoutBtn.cloneNode(true);
            logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
            
            // Add new logout listener
            newLogoutBtn.addEventListener('click', async () => {
                try {
                    // Cleanup storage listeners before signing out
                    if (window.storage && window.storage.cleanup) {
                        window.storage.cleanup();
                    }
                    await signOut(window.auth);
                    console.log('User signed out');
                    window.location.href = 'index.html';
                } catch (error) {
                    console.error('Sign out error:', error);
                    alert('Error signing out. Please try again.');
                }
            });
        }
    }
}

// Export functions for other modules
window.app = {
    isAuthenticated: () => window.auth?.currentUser !== null,
    getCurrentUser: () => window.auth?.currentUser
};