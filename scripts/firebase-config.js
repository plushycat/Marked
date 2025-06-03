// Firebase configuration and initialization

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.private.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

window.auth = auth;
window.db = db;

console.log('Firebase initialized successfully for project:', firebaseConfig.projectId);

export { auth, db };