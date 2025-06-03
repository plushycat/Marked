// Firebase configuration and initialization

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Your Firebase config for marked-zero project
const firebaseConfig = {
  apiKey: "AIzaSyByO7fbN8WJh_Z_hqRr1_b_kphT4CWz5ns",
  authDomain: "marked-zero.firebaseapp.com",
  projectId: "marked-zero",
  storageBucket: "marked-zero.firebasestorage.app",
  messagingSenderId: "31786393735",
  appId: "1:31786393735:web:6a359976e1cbe37fc61822"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Make auth available globally
window.auth = auth;

console.log('Firebase initialized successfully for project:', firebaseConfig.projectId);

export { auth };