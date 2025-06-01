// Main application entry point

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM loaded, initializing application...');
    
    try {
        // Initialize dark mode first
        window.darkMode.initializeDarkMode();
        
        // Initialize editor (this will set up CodeMirror or fallback to simple editor)
        await window.editor.initializeEditor();
        
        // Setup all event listeners
        window.events.setupEventListeners();
        
        // Initial render of notes list
        window.notesList.renderNotesList();
        
        console.log('Application initialization complete');
    } catch (error) {
        console.error('Error during application initialization:', error);
    }
});