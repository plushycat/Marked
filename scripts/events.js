// Event handling functionality

// Setup all event listeners
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Dark mode toggle
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle && window.darkMode) {
        darkModeToggle.addEventListener('click', window.darkMode.toggleDarkMode);
    }

    // Help button
    const helpButton = document.getElementById('helpButton');
    if (helpButton && window.modals) {
        helpButton.addEventListener('click', window.modals.showHelpModal);
    }

    // New note button
    const newNoteButton = document.getElementById('newNoteButton');
    if (newNoteButton && window.editor) {
        newNoteButton.addEventListener('click', window.editor.createNewNote);
    }

    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput && window.notesList) {
        searchInput.addEventListener('input', window.notesList.filterNotes);
    }

    // Note title input
    const noteTitle = document.getElementById('noteTitle');
    if (noteTitle) {
        noteTitle.addEventListener('input', (e) => {
            clearTimeout(window.titleSaveTimeout);
            window.titleSaveTimeout = setTimeout(() => {
                if (window.editor && window.editor.saveNote) {
                    window.editor.saveNote(false); // Always false here
                }
            }, 1000);
        });
    }

    // Setup toolbar buttons
    setupToolbarButtons();

    // File input for opening files
    const fileInput = document.getElementById('fileInput');
    if (fileInput && window.editor) {
        fileInput.addEventListener('change', window.editor.handleFileOpen);
    }

    // Modal event listeners
    setupModalEventListeners();
    
    // Global keyboard shortcuts - ESC key for preview mode (from working backup)
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            // Toggle preview/edit mode on ESC
            if (
                window.editor &&
                window.editor.markdownEditor &&
                typeof window.editor.markdownEditor.toggleMode === 'function'
            ) {
                event.preventDefault();
                event.stopPropagation();
                window.editor.markdownEditor.toggleMode();
                return;
            }
            
            // Handle ESC for modals if not in preview mode
            const openModals = document.querySelectorAll('input[type="checkbox"]:checked[id$="ModalCheckbox"]');
            if (openModals.length > 0) {
                openModals.forEach(modal => modal.checked = false);
                event.preventDefault();
            }
        }
    });
    
    console.log('Event listeners setup complete');
}

function setupToolbarButtons() {
    // Undo/Redo buttons
    const undoButton = document.getElementById('undoButton');
    const redoButton = document.getElementById('redoButton');
    
    if (undoButton && window.editor) {
        undoButton.addEventListener('click', window.editor.undo);
    }
    
    if (redoButton && window.editor) {
        redoButton.addEventListener('click', window.editor.redo);
    }

    // Save button
    const saveButton = document.getElementById('saveButton');
    if (saveButton && window.editor) {
        saveButton.addEventListener('click', () => {
            window.editor.saveNote(true); // Only true here
        });
    }

    // Delete button
    const deleteButton = document.getElementById('deleteButton');
    if (deleteButton && window.editor) {
        deleteButton.addEventListener('click', window.editor.deleteNote);
    }

    // Clear button
    const clearButton = document.getElementById('clearButton');
    if (clearButton && window.editor) {
        clearButton.addEventListener('click', () => {
            if (confirm('Clear the current note? This cannot be undone.')) {
                window.editor.createNewNote();
            }
        });
    }

    // Export buttons
    const txtButton = document.getElementById('txtButton');
    const mdButton = document.getElementById('mdButton');
    const openFileButton = document.getElementById('openFileButton');
    
    if (txtButton) {
        txtButton.addEventListener('click', () => {
            if (window.editor && window.editor.markdownEditor) {
                const content = window.editor.markdownEditor.getRawMarkdown();
                const blob = new Blob([content], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = (document.getElementById('noteTitle').value || 'note') + '.txt';
                a.click();
                URL.revokeObjectURL(url);
            }
        });
    }
    
    if (mdButton) {
        mdButton.addEventListener('click', () => {
            if (window.editor && window.editor.markdownEditor) {
                const content = window.editor.markdownEditor.getRawMarkdown();
                const blob = new Blob([content], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = (document.getElementById('noteTitle').value || 'note') + '.md';
                a.click();
                URL.revokeObjectURL(url);
            }
        });
    }
    
    if (openFileButton) {
        openFileButton.addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });
    }
}

function setupModalEventListeners() {
    console.log('Setting up modal event listeners...');
    
    // Help modal close button
    const helpModalCloseBtn = document.getElementById('helpModalCloseBtn');
    if (helpModalCloseBtn) {
        helpModalCloseBtn.addEventListener('click', () => {
            if (window.modals && window.modals.hideHelpModal) {
                window.modals.hideHelpModal();
            }
        });
        console.log('Help modal close button listener added');
    }

    // Confirm modal buttons
    const modalCancelBtn = document.getElementById('modalCancelBtn');
    const modalConfirmBtn = document.getElementById('modalConfirmBtn');
    
    if (modalCancelBtn) {
        modalCancelBtn.addEventListener('click', () => {
            if (window.modals && window.modals.hideConfirmModal) {
                window.modals.hideConfirmModal();
            }
        });
    }
    
    if (modalConfirmBtn) {
        modalConfirmBtn.addEventListener('click', () => {
            if (window.modals && window.modals.handleConfirmAction) {
                window.modals.handleConfirmAction();
            }
        });
    }

    // Save options modal buttons
    const saveUpdateBtn = document.getElementById('saveUpdateBtn');
    const saveAsNewBtn = document.getElementById('saveAsNewBtn');
    
    if (saveUpdateBtn) {
        saveUpdateBtn.addEventListener('click', () => {
            if (window.modals && window.modals.handleSaveUpdate) {
                window.modals.handleSaveUpdate();
            }
        });
    }
    
    if (saveAsNewBtn) {
        saveAsNewBtn.addEventListener('click', () => {
            if (window.modals && window.modals.handleSaveAsNew) {
                window.modals.handleSaveAsNew();
            }
        });
    }
    
    console.log('Modal event listeners setup complete');
}

// Show user info in header if user is authenticated
function showUserInfo() {
    // This function can be expanded later if needed
    console.log('User info display function called');
}

// Export for use by other modules
window.events = {
    setupEventListeners,
    showUserInfo
};

console.log('✅ Events module loaded and exported to window');