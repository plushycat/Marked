// Storage functionality with Firestore and localStorage support
import { 
    collection, 
    doc, 
    getDocs, 
    setDoc, 
    deleteDoc, 
    onSnapshot,
    query,
    orderBy,
    serverTimestamp,
    where
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let notes = [];
let isFirestoreMode = false;
let unsubscribeNotes = null;

// Initialize storage based on auth state
function initializeStorage(user = null) {
    if (user && window.db) {
        isFirestoreMode = true;
        console.log('Using Firestore for user:', user.email);
        setupFirestoreListener(user);
    } else {
        isFirestoreMode = false;
        console.log('Using localStorage (demo mode)');
        loadNotesFromLocalStorage();
    }
}

// Load notes from localStorage (demo mode)
function loadNotesFromLocalStorage() {
    try {
        notes = JSON.parse(localStorage.getItem('notes')) || [];
    } catch (e) {
        console.error("Error loading notes from localStorage:", e);
        localStorage.removeItem('notes');
        notes = [];
    }
}

// Setup Firestore real-time listener
function setupFirestoreListener(user) {
    if (unsubscribeNotes) {
        unsubscribeNotes();
    }

    const notesRef = collection(window.db, 'users', user.uid, 'notes');
    // Use 'timestamp' instead of 'updatedAt' to match your note structure
    const q = query(notesRef, orderBy('timestamp', 'desc'));
    
    unsubscribeNotes = onSnapshot(q, (snapshot) => {
        notes = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            notes.push({
                id: doc.id,
                ...data
            });
        });
        
        // Trigger notes list update if the function exists
        if (window.notesList && window.notesList.updateNotesList) {
            window.notesList.updateNotesList();
        }
        
        console.log('Notes synced from Firestore:', notes.length);
    }, (error) => {
        console.error('Error listening to notes:', error);
        // Fallback to localStorage if Firestore fails
        console.log('Falling back to localStorage...');
        isFirestoreMode = false;
        loadNotesFromLocalStorage();
    });
}

// Save notes to appropriate storage
async function saveNotesToStorage() {
    if (isFirestoreMode && window.auth?.currentUser) {
        // Don't save to Firestore here - individual note operations handle this
        return;
    } else {
        // Demo mode - save to localStorage
        localStorage.setItem('notes', JSON.stringify(notes));
    }
}

// Save a single note to Firestore
async function saveNoteToFirestore(note) {
    if (!isFirestoreMode || !window.auth?.currentUser) {
        return;
    }

    try {
        const user = window.auth.currentUser;
        const noteRef = doc(window.db, 'users', user.uid, 'notes', note.id.toString());
        
        const noteData = {
            ...note,
            timestamp: note.timestamp || Date.now(), // Use existing timestamp or current time
            userId: user.uid
        };

        await setDoc(noteRef, noteData);
        console.log('Note saved to Firestore:', note.id);
    } catch (error) {
        console.error('Error saving note to Firestore:', error);
        throw error;
    }
}

// Delete a note from Firestore
async function deleteNoteFromFirestore(noteId) {
    if (!isFirestoreMode || !window.auth?.currentUser) {
        return;
    }

    try {
        const user = window.auth.currentUser;
        const noteRef = doc(window.db, 'users', user.uid, 'notes', noteId);
        await deleteDoc(noteRef);
        console.log('Note deleted from Firestore:', noteId);
    } catch (error) {
        console.error('Error deleting note from Firestore:', error);
        throw error;
    }
}

// Add a new note
async function addNote(note) {
    if (isFirestoreMode) {
        await saveNoteToFirestore(note);
    } else {
        notes.unshift(note);
        saveNotesToStorage();
    }
}

// Update an existing note
async function updateNote(noteId, updatedNote) {
    if (isFirestoreMode) {
        await saveNoteToFirestore(updatedNote);
    } else {
        const index = notes.findIndex(n => n.id === noteId);
        if (index !== -1) {
            notes[index] = updatedNote;
            saveNotesToStorage();
        }
    }
}

// Delete a note
async function deleteNote(noteId) {
    console.log('Storage deleteNote called with ID:', noteId);
    
    if (isFirestoreMode) {
        try {
            await deleteNoteFromFirestore(noteId);
            console.log('Note deleted from Firestore:', noteId);
        } catch (error) {
            console.error('Firestore delete failed:', error);
            throw error;
        }
    } else {
        // localStorage mode
        const initialLength = notes.length;
        notes = notes.filter(note => note.id != noteId); // Use != to handle string/number comparison
        
        console.log(`Filtered notes: ${initialLength} -> ${notes.length}`);
        
        if (notes.length === initialLength) {
            console.warn('Note not found in localStorage:', noteId);
            throw new Error('Note not found');
        }
        
        try {
            await saveNotesToStorage();
            console.log('Notes saved to localStorage after deletion');
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            throw error;
        }
    }
}

// Get all notes
function getNotes() {
    return notes;
}

// Cleanup listeners
function cleanup() {
    if (unsubscribeNotes) {
        unsubscribeNotes();
        unsubscribeNotes = null;
    }
}

// Export for use by other modules
window.storage = {
    get notes() { return notes; },
    set notes(value) { notes = value; },
    saveNotesToStorage,
    addNote,
    updateNote,
    deleteNote,
    getNotes,
    initializeStorage,
    cleanup,
    isFirestoreMode: () => isFirestoreMode
};

// Initialize immediately for demo mode
if (!window.auth) {
    console.log('No auth detected, initializing storage for demo mode');
    initializeStorage(null);
}

console.log('✅ Storage module loaded and exported to window');

export {
    initializeStorage,
    addNote,
    updateNote,
    deleteNote,
    getNotes,
    cleanup
};