// Firebase Authentication with Google and Email

import { 
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    onAuthStateChanged,
    signOut 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

let isSignupMode = false;
const provider = new GoogleAuthProvider();

document.addEventListener('DOMContentLoaded', function() {
    console.log('Auth page loaded');
    
    // Check if user is already logged in
    onAuthStateChanged(window.auth, (user) => {
        if (user) {
            // User is signed in, redirect to app
            window.location.href = 'app.html';
        }
    });
    
    if (window.darkMode) {
        window.darkMode.initializeDarkMode();
    }
    
    setupEventListeners();
});

function setupEventListeners() {
    // Form switching
    document.getElementById('showSignup')?.addEventListener('click', (e) => {
        e.preventDefault();
        switchToSignup();
    });
    
    document.getElementById('showLogin')?.addEventListener('click', (e) => {
        e.preventDefault();
        switchToLogin();
    });
    
    // Form submissions
    document.getElementById('loginForm')?.addEventListener('submit', handleEmailLogin);
    document.getElementById('signupForm')?.addEventListener('submit', handleEmailSignup);
    
    // Google auth buttons
    document.getElementById('googleSignInBtn')?.addEventListener('click', handleGoogleAuth);
    document.getElementById('googleSignUpBtn')?.addEventListener('click', handleGoogleAuth);
    
    // Dark mode toggle
    document.getElementById('authDarkModeToggle')?.addEventListener('click', () => {
        if (window.darkMode) window.darkMode.toggleDarkMode();
    });
}

function switchToSignup() {
    document.getElementById('loginForm')?.classList.remove('active');
    document.getElementById('signupForm')?.classList.add('active');
    isSignupMode = true;
    clearForms();
}

function switchToLogin() {
    document.getElementById('signupForm')?.classList.remove('active');
    document.getElementById('loginForm')?.classList.add('active');
    isSignupMode = false;
    clearForms();
}

function clearForms() {
    document.querySelectorAll('.auth-form').forEach(form => {
        form.reset();
        form.querySelectorAll('input').forEach(input => {
            input.classList.remove('error');
        });
        form.querySelectorAll('.error-message').forEach(msg => msg.remove());
    });
}

async function handleEmailLogin(e) {
    e.preventDefault();
    
    const email = e.target.email.value.trim();
    const password = e.target.password.value;
    const submitBtn = e.target.querySelector('.auth-btn.primary');
    
    if (!validateInputs(email, password)) return;
    
    setButtonLoading(submitBtn, 'Signing in...');
    
    try {
        await signInWithEmailAndPassword(window.auth, email, password);
        // Redirect handled by onAuthStateChanged
    } catch (error) {
        console.error('Login error:', error);
        showError(getErrorMessage(error));
        setButtonReady(submitBtn, 'Sign In');
    }
}

async function handleEmailSignup(e) {
    e.preventDefault();
    
    const name = e.target.name.value.trim();
    const email = e.target.email.value.trim();
    const password = e.target.password.value;
    const submitBtn = e.target.querySelector('.auth-btn.primary');
    
    if (!validateSignupInputs(name, email, password)) return;
    
    setButtonLoading(submitBtn, 'Creating account...');
    
    try {
        const userCredential = await createUserWithEmailAndPassword(window.auth, email, password);
        // Update profile with name if needed
        await userCredential.user.updateProfile({ displayName: name });
        // Redirect handled by onAuthStateChanged
    } catch (error) {
        console.error('Signup error:', error);
        showError(getErrorMessage(error));
        setButtonReady(submitBtn, 'Create Account');
    }
}

async function handleGoogleAuth() {
    const btn = event.target.closest('.google-btn');
    setButtonLoading(btn, 'Connecting...');
    
    try {
        await signInWithPopup(window.auth, provider);
        // Redirect handled by onAuthStateChanged
    } catch (error) {
        console.error('Google auth error:', error);
        showError(getErrorMessage(error));
        setButtonReady(btn, btn.textContent.includes('Sign up') ? 'Sign up with Google' : 'Continue with Google');
    }
}

function validateInputs(email, password) {
    if (!validateEmail(email)) {
        showFieldError(document.getElementById('loginEmail'), 'Please enter a valid email');
        return false;
    }
    
    if (password.length < 6) {
        showFieldError(document.getElementById('loginPassword'), 'Password must be at least 6 characters');
        return false;
    }
    
    return true;
}

function validateSignupInputs(name, email, password) {
    if (name.length < 2) {
        showFieldError(document.getElementById('signupName'), 'Name must be at least 2 characters');
        return false;
    }
    
    if (!validateEmail(email)) {
        showFieldError(document.getElementById('signupEmail'), 'Please enter a valid email');
        return false;
    }
    
    if (password.length < 6) {
        showFieldError(document.getElementById('signupPassword'), 'Password must be at least 6 characters');
        return false;
    }
    
    return true;
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showFieldError(input, message) {
    const existingError = input.parentNode.querySelector('.error-message');
    if (existingError) existingError.remove();
    
    input.classList.add('error');
    
    const errorSpan = document.createElement('span');
    errorSpan.className = 'error-message';
    errorSpan.textContent = message;
    input.parentNode.appendChild(errorSpan);
    
    input.focus();
}

function showError(message) {
    alert(message); // Simple error display - you can make this prettier
}

function getErrorMessage(error) {
    switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
            return 'Invalid email or password';
        case 'auth/email-already-in-use':
            return 'Email is already registered';
        case 'auth/weak-password':
            return 'Password is too weak';
        case 'auth/invalid-email':
            return 'Invalid email address';
        case 'auth/popup-closed-by-user':
            return 'Sign-in cancelled';
        default:
            return 'An error occurred. Please try again.';
    }
}

function setButtonLoading(button, text) {
    button.textContent = text;
    button.disabled = true;
}

function setButtonReady(button, text) {
    button.textContent = text;
    button.disabled = false;
}

// Export for other modules
window.authHandler = {
    signOut: () => signOut(window.auth)
};