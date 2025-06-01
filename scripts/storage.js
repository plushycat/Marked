// Storage functionality
let notes = [];
try {
    notes = JSON.parse(localStorage.getItem('notes')) || [];
} catch (e) {
    console.error("Error loading notes from localStorage:", e);
    localStorage.removeItem('notes');
}

// Save notes to localStorage
function saveNotesToStorage() {
    localStorage.setItem('notes', JSON.stringify(notes));
}

// Export for use by other modules
window.storage = {
    notes,
    saveNotesToStorage
};