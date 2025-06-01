// Event handling functionality

// Setup all event listeners
function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', window.notesList.filterNotes);
    }
    
    // Button event listeners
    document.getElementById('deleteButton').addEventListener('click', window.editor.deleteNote);
    document.getElementById('clearButton').addEventListener('click', function() {
        // Show confirmation modal for clearing note
        window.modals.showConfirmModal("Are you sure you want to clear this note? Any unsaved changes will be lost.", () => {
            window.editor.clearNote();
        });
    });
    document.getElementById('txtButton').addEventListener('click', window.editor.exportNoteTxt);
    document.getElementById('mdButton').addEventListener('click', window.editor.exportNoteMd);
    document.getElementById('newNoteButton').addEventListener('click', window.editor.createNewNote);
    
    // Dark mode toggle
    const darkModeToggleButton = document.getElementById('darkModeToggle');
    if (darkModeToggleButton) {
        darkModeToggleButton.addEventListener('click', window.darkMode.toggleDarkMode);
    }
    
    // File input handlers
    document.getElementById('openFileButton').addEventListener('click', function() {
        document.getElementById('fileInput').click();
    });
    
    document.getElementById('fileInput').addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            window.editor.openFile(file);
        }
    });
    
    // Undo/redo buttons
    document.getElementById('undoButton').addEventListener('click', window.editor.undo);
    document.getElementById('redoButton').addEventListener('click', window.editor.redo);
      // Save button with modal
    document.getElementById('saveButton').addEventListener('click', function() {
        window.modals.showSaveOptionsModal(
            "Would you like to update the existing note or save as a new note?",
            function onSave() {
                window.editor.saveNote(); // Update existing note
            },
            function onCancel() {
                // Save as new note
                window.editor.currentNoteId = null;
                window.editor.saveNote();
            }
        );
    });
    
    // Confirm modal overlay click to close
    const confirmOverlay = document.querySelector('.confirm-modal-overlay');
    if (confirmOverlay) {
        confirmOverlay.addEventListener('click', function () {
            const confirmCheckbox = document.getElementById('confirmModalCheckbox');
            if (confirmCheckbox) confirmCheckbox.checked = false;
        });
    }
    
    // Save options modal overlay click to close
    const saveOverlay = document.querySelector('.save-modal-overlay');
    if (saveOverlay) {
        saveOverlay.addEventListener('click', function () {
            const saveOptionsCheckbox = document.getElementById('saveOptionsModalCheckbox');
            if (saveOptionsCheckbox) saveOptionsCheckbox.checked = false;
        });
    }
    
    // Help modal open/close logic
    document.getElementById('helpButton').addEventListener('click', function() {
        document.getElementById('helpModalCheckbox').checked = true;
        window.modals.updateHelpModalPreview();
    });
    
    // Help modal overlay and close button
    const helpOverlay = document.querySelector('.help-modal-overlay');
    if (helpOverlay) {
        helpOverlay.addEventListener('click', function () {
            document.getElementById('helpModalCheckbox').checked = false;
        });
    }
    
    const helpCloseBtn = document.getElementById('helpModalCloseBtn');
    if (helpCloseBtn) {
        helpCloseBtn.addEventListener('click', function () {
            document.getElementById('helpModalCheckbox').checked = false;
        });
    }
    
    // Space bar to toggle preview/edit mode
    document.addEventListener('keydown', function(e) {
        if (e.code === 'Space' && !e.target.matches('input, textarea, [contenteditable]')) {
            // Check if any modal is open
            const confirmCheckbox = document.getElementById('confirmModalCheckbox');
            if (confirmCheckbox && confirmCheckbox.checked) {
                return;
            }
            const saveOptionsCheckbox = document.getElementById('saveOptionsModalCheckbox');
            if (saveOptionsCheckbox && saveOptionsCheckbox.checked) {
                return;
            }
            // Only toggle editor mode if no modal was open
            if (window.editor.markdownEditor() && typeof window.editor.markdownEditor().toggleMode === 'function') {
                e.preventDefault();
                window.editor.markdownEditor().toggleMode();
            }
        }
        
        // ESC key: close modals first, only toggle mode if no modal is open
        if (e.key === 'Escape') {
            let modalClosed = false;
            
            // Close help modal if open
            const helpCheckbox = document.getElementById('helpModalCheckbox');
            if (helpCheckbox && helpCheckbox.checked) {
                helpCheckbox.checked = false;
                modalClosed = true;
            }
            
            // Close confirm modal if open
            const confirmCheckbox = document.getElementById('confirmModalCheckbox');
            if (confirmCheckbox && confirmCheckbox.checked) {
                confirmCheckbox.checked = false;
                modalClosed = true;
            }
            
            // Close save options modal if open
            const saveOptionsCheckbox = document.getElementById('saveOptionsModalCheckbox');
            if (saveOptionsCheckbox && saveOptionsCheckbox.checked) {
                saveOptionsCheckbox.checked = false;
                modalClosed = true;
            }
            
            // Only toggle editor mode if no modal was closed
            if (!modalClosed && window.editor.markdownEditor() && typeof window.editor.markdownEditor().toggleMode === 'function') {
                e.preventDefault();
                window.editor.markdownEditor().toggleMode();
            }
        }
    });
    
    // Global click handler for spoilers and mode switching
    document.addEventListener('click', function(event) {
        // 1. Handle spoiler clicks FIRST and EXIT immediately
        const spoilerElement = event.target.closest('.spoiler');
        if (spoilerElement) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            window.markdown.toggleSpoiler(spoilerElement);
            return; // CRITICAL: Exit immediately after handling spoiler
        }

        // 2. Handle password-content (CSS hover only, no click action needed)
        if (event.target.classList.contains('password-content')) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        // 3. Handle links - don't interfere
        if (event.target.tagName === 'A') {
            event.stopPropagation();
            return;
        }

        // 4. Skip if inside password-content or link (but NOT spoilers - already handled above)
        if (
            event.target.closest('.password-content') ||
            event.target.closest('a')
        ) {
            return;
        }

        // 5. Handle editor mode switching for click-outside
        if (window.editor.markdownEditor() && typeof window.editor.markdownEditor().toggleMode === 'function') {
            const editorContainer = document.getElementById('markdownEditor');
            const previewContainer = document.querySelector('.markdown-preview');
            const toggleButton = document.getElementById('modeToggleButton');
            const noteTitle = document.getElementById('noteTitle');
            const headerToolbar = document.querySelector('.editor-toolbar');
            const sidebar = document.querySelector('.notes-sidebar');

            const isInsideEditorArea =
                (editorContainer && editorContainer.contains(event.target)) ||
                (previewContainer && previewContainer.contains(event.target)) ||
                (toggleButton && toggleButton.contains(event.target)) ||
                (noteTitle && noteTitle.contains(event.target)) ||
                (headerToolbar && headerToolbar.contains(event.target)) ||
                (sidebar && sidebar.contains(event.target));

            if (!isInsideEditorArea) {
                const isInPreview = editorContainer && editorContainer.style.display === 'none';
                if (!isInPreview) {
                    window.editor.markdownEditor().toggleMode();
                }
            } else if (previewContainer && previewContainer.contains(event.target)) {
                // Only toggle mode if clicking directly on preview container, not on interactive elements
                if (event.target === previewContainer || 
                    (event.target.tagName === 'P' || event.target.tagName === 'DIV') &&
                    !event.target.closest('.spoiler') && 
                    !event.target.closest('.password-content') &&
                    !event.target.closest('a')) {
                    window.editor.markdownEditor().toggleMode();
                }
            }
        }
    });
}

// Export for use by other modules
window.events = {
    setupEventListeners
};