// Editor functionality
let currentNoteId = null;
let markdownEditor = null;

// Add these variables for undo/redo functionality
let undoStack = [];
let redoStack = [];
let maxUndoStackSize = 100;
let globalIsPreviewMode = false;

// Make globalIsPreviewMode accessible globally (like in the backup)
window.globalIsPreviewMode = false;

// Update globalIsPreviewMode whenever it changes
function updateGlobalPreviewMode(isPreview) {
    globalIsPreviewMode = isPreview;
    window.globalIsPreviewMode = isPreview;
}

// Add undo/redo functionality
function saveToUndoStack(content) {
    // Don't save if content is the same as the last entry
    if (undoStack.length > 0 && undoStack[undoStack.length - 1] === content) {
        return;
    }
    
    undoStack.push(content);
    
    // Limit stack size
    if (undoStack.length > maxUndoStackSize) {
        undoStack.shift(); // Remove oldest entry
    }
    
    // Clear redo stack when new content is added
    redoStack = [];
    
    updateUndoRedoButtons();
}

function undo() {
    if (undoStack.length === 0) return;
    
    if (!markdownEditor) return;
    
    const currentContent = markdownEditor.getRawMarkdown();
    
    // Save current state to redo stack
    redoStack.push(currentContent);
    
    // Get previous state
    const previousContent = undoStack.pop();
    
    // Set the content without triggering another undo save
    markdownEditor.setContent(previousContent);
    
    updateUndoRedoButtons();
}

function redo() {
    if (redoStack.length === 0) return;
    
    if (!markdownEditor) return;
    
    const currentContent = markdownEditor.getRawMarkdown();
    
    // Save current state to undo stack
    undoStack.push(currentContent);
    
    // Get next content
    const nextContent = redoStack.pop();
    
    // Set the content
    markdownEditor.setContent(nextContent);
    
    updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
    const undoButton = document.getElementById('undoButton');
    const redoButton = document.getElementById('redoButton');
    
    if (undoButton) {
        undoButton.disabled = undoStack.length === 0;
    }
    
    if (redoButton) {
        redoButton.disabled = redoStack.length === 0;
    }
}

function clearUndoRedoStacks() {
    undoStack = [];
    redoStack = [];
    updateUndoRedoButtons();
}

// Get theme based on dark mode
function getTheme() {
    if (document.body.classList.contains('dark-mode')) {
        try {
            const { oneDark } = require('@codemirror/theme-one-dark');
            return [oneDark];
        } catch (e) {
            return [];
        }
    }
    return [];
}

// Simple text editor setup (fallback)
function setupSimpleEditor() {
    const container = document.getElementById('markdownEditor');
    
    // Create a simple textarea
    const textarea = document.createElement('textarea');
    textarea.id = 'simpleEditor';
    textarea.className = 'simple-editor-textarea';
    
    container.appendChild(textarea);
    
    // Add input event listener for undo tracking AND auto-save
    let inputTimeout;
    let autoSaveTimeout;
    textarea.addEventListener('input', function() {
        clearTimeout(inputTimeout);
        inputTimeout = setTimeout(() => {
            saveToUndoStack(textarea.value);
        }, 500);
        
        // Add auto-save for simple editor
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(() => {
            if (window.editor && window.editor.saveNote && currentNoteId) {
                console.log('Auto-saving content (simple editor)...');
                window.editor.saveNote(false); // false = auto-save (no modal)
            }
        }, 3000);
    });
    
    // Create preview container
    const previewContainer = document.createElement('div');
    previewContainer.className = 'markdown-preview';
    previewContainer.style.display = 'none';
    container.parentNode.insertBefore(previewContainer, container.nextSibling);
    
    // Use the existing button
    const toggleButton = document.getElementById('modeToggleButton');
    
    let isPreviewMode = false;
    
    // Function to toggle between edit and preview modes
    function toggleMode() {
        isPreviewMode = !isPreviewMode;
        updateGlobalPreviewMode(isPreviewMode); // Use the helper function
        
        if (isPreviewMode) {
            container.style.display = 'none';
            previewContainer.style.display = 'block';
            toggleButton.textContent = '✏️';
            toggleButton.title = 'Switch to Edit Mode (ESC to exit)';
            if (window.markdown && window.markdown.markdownToHtml) {
                previewContainer.innerHTML = window.markdown.markdownToHtml(textarea.value);
            }
        } else {
            container.style.display = 'block';
            previewContainer.style.display = 'none';
            toggleButton.textContent = '👁️';
            toggleButton.title = 'Switch to Preview Mode';
            textarea.focus();
        }
        
        console.log('Simple Editor - Toggled to:', isPreviewMode ? 'Preview' : 'Edit');
    }
    
    // Toggle button click handler
    if (toggleButton) {
        toggleButton.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleMode();
        });
    }
    
    // Click handler for preview container
    previewContainer.addEventListener('click', function (event) {
        // Prevent toggling mode if clicking a spoiler
        if (event.target.closest('.spoiler')) {
            return;
        }
        if (globalIsPreviewMode) {
            toggleMode();
        }
    });
    
    // Double-click on textarea to enter preview mode
    textarea.addEventListener('dblclick', function(event) {
        if (!isPreviewMode) {
            toggleMode();
        }
    });
    
    return {
        getRawMarkdown: () => textarea.value,
        setContent: (content) => {
            const oldContent = textarea.value;
            textarea.value = content || '';
            
            if (oldContent !== textarea.value) {
                saveToUndoStack(oldContent);
            }
            
            if (isPreviewMode && window.markdown && window.markdown.markdownToHtml) {
                previewContainer.innerHTML = window.markdown.markdownToHtml(textarea.value);
            }
        },
        updateTheme: () => {
            if (document.body.classList.contains('dark-mode')) {
                textarea.style.backgroundColor = '#1e1e1e';
                textarea.style.color = '#e0e0e0';
            } else {
                textarea.style.backgroundColor = '#fff';
                textarea.style.color = '#333';
            }
        },
        focus: () => textarea.focus(),
        toggleMode: toggleMode 
    };
}

// Setup CodeMirror editor
async function setupCodeMirrorEditor() {
    try {
        console.log('Attempting to load CodeMirror...');
        
        // Give modules time to load
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Try to import CodeMirror
        const modules = await Promise.all([
            import('https://cdn.jsdelivr.net/npm/@codemirror/view@6/dist/index.js'),
            import('https://cdn.jsdelivr.net/npm/@codemirror/state@6.2.0/dist/index.js'),
            import('https://cdn.jsdelivr.net/npm/@codemirror/basic-setup@0.20.0/dist/index.js'),
            import('https://cdn.jsdelivr.net/npm/@codemirror/lang-markdown@6/dist/index.js'),
            import('https://cdn.jsdelivr.net/npm/@codemirror/theme-one-dark@6/dist/theme.js')
        ]);
        
        const { EditorView } = modules[0];
        const { EditorState } = modules[1];
        const { basicSetup } = modules[2];
        const { markdown } = modules[3];
        const { oneDark } = modules[4];
        
        console.log('CodeMirror modules loaded successfully');
        
        const container = document.getElementById('markdownEditor');
        
        const previewContainer = document.createElement('div');
        previewContainer.className = 'markdown-preview';
        previewContainer.style.display = 'none';
        container.parentNode.insertBefore(previewContainer, container.nextSibling);
        
        // Use the existing button instead of creating a new one
        const toggleButton = document.getElementById('modeToggleButton');
        
        let isPreviewMode = false;
        let currentContent = '';
        let changeTimeout;
        
        // Function to toggle between edit and preview modes
        function toggleMode() {
            isPreviewMode = !isPreviewMode;
            updateGlobalPreviewMode(isPreviewMode); // Use the helper function
            
            if (isPreviewMode) {
                container.style.display = 'none';
                previewContainer.style.display = 'block';
                toggleButton.textContent = '✏️';
                toggleButton.title = 'Switch to Edit Mode (ESC to exit)';
                if (window.markdown && window.markdown.markdownToHtml) {
                    previewContainer.innerHTML = window.markdown.markdownToHtml(currentContent);
                }
            } else {
                container.style.display = 'block';
                previewContainer.style.display = 'none';
                toggleButton.textContent = '👁️';
                toggleButton.title = 'Switch to Preview Mode';
                view.focus();
            }
            
            console.log('CodeMirror Editor - Toggled to:', isPreviewMode ? 'Preview' : 'Edit');
        }
        
        // Toggle button click handler
        toggleButton.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleMode();
        });
        
        // Click handler for preview container
        previewContainer.addEventListener('click', function (event) {
            // Prevent toggling mode if clicking a spoiler
            if (event.target.closest('.spoiler')) {
                return;
            }
            if (globalIsPreviewMode) {
                toggleMode();
            }
        });
        
        // Double-click on editor to enter preview mode
        container.addEventListener('dblclick', function(event) {
            if (!isPreviewMode) {
                toggleMode();
            }
        });
        
        const view = new EditorView({
            state: EditorState.create({
                doc: '',
                extensions: [
                    basicSetup,
                    markdown(),
                    ...getTheme(),
                    EditorView.updateListener.of((update) => {
                        if (update.docChanged) {
                            const oldContent = currentContent;
                            currentContent = update.state.doc.toString();
                            
                            // Debounced undo save
                            clearTimeout(changeTimeout);
                            changeTimeout = setTimeout(() => {
                                if (oldContent !== currentContent) {
                                    saveToUndoStack(oldContent);
                                }
                            }, 500);
                            
                            if (isPreviewMode) {
                                previewContainer.innerHTML = window.markdown.markdownToHtml(currentContent);
                            }
                        }
                    })
                ]
            }),
            parent: container
        });
        
        // Add auto-save trigger to content changes
        view.dispatch({
            effects: EditorView.updateListener.of((update) => {
                if (update.docChanged) {
                    currentContent = view.state.doc.toString();
                    updatePreview(currentContent);
                    updateUndoRedoButtons();
                    
                    // Add content auto-save (silent)
                    clearTimeout(window.autoSaveTimeout);
                    window.autoSaveTimeout = setTimeout(() => {
                        if (window.editor && window.editor.saveNote && currentNoteId) {
                            console.log('Auto-saving content...');
                            window.editor.saveNote(false); // false = auto-save (no modal)
                        }
                    }, 3000); // Auto-save after 3 seconds of no typing
                }
            })
        });
        
        markdownEditor = {
            getRawMarkdown: () => currentContent,
            setContent: (content) => {
                const oldContent = currentContent;
                currentContent = content || '';
                view.dispatch({
                    changes: {
                        from: 0,
                        to: view.state.doc.length,
                        insert: currentContent
                    }
                });
                
                if (oldContent !== currentContent) {
                    saveToUndoStack(oldContent);
                }
            },
            updateTheme: () => {
                const newState = view.state.reconfigure({
                    extensions: [
                        basicSetup,
                        markdown(),
                        ...getTheme(),
                        EditorView.updateListener.of((update) => {
                            if (update.docChanged) {
                                const oldContent = currentContent;
                                currentContent = update.state.doc.toString();
                                
                                clearTimeout(changeTimeout);
                                changeTimeout = setTimeout(() => {
                                    if (oldContent !== currentContent) {
                                        saveToUndoStack(oldContent);
                                    }
                                }, 500);
                                
                                if (isPreviewMode) {
                                    previewContainer.innerHTML = window.markdown.markdownToHtml(currentContent);
                                }
                            }
                        })
                    ]
                });
                view.setState(newState);
            },
            focus: () => view.focus(),
            toggleMode: toggleMode
        };
        
        console.log('CodeMirror editor setup complete');
        
    } catch (error) {
        console.warn('CodeMirror failed to load, using simple editor:', error);
        markdownEditor = setupSimpleEditor();
    }
}

// Add initialization function that was missing
async function initializeEditor() {
    try {
        await setupCodeMirrorEditor();
        console.log('Editor initialized successfully');
    } catch (error) {
        console.warn('CodeMirror failed, using simple editor:', error);
        markdownEditor = setupSimpleEditor();
    }
    updateUndoRedoButtons();
    setupGlobalPreviewToggle();
    setupSpoilerDelegation(); 
}

// Load a note by ID
function loadNoteById(noteId) {
    currentNoteId = noteId;
    const note = window.storage.notes.find(n => n.id === noteId);
    if (note) {
        document.getElementById('noteTitle').value = note.title || '';
        if (markdownEditor) {
            clearUndoRedoStacks(); // Clear when loading a new note
            markdownEditor.setContent(note.content);
            // Ensure preview mode is active after loading a note
            if (!globalIsPreviewMode && typeof markdownEditor.toggleMode === 'function') {
                markdownEditor.toggleMode();
            }
            // --- Force update preview pane if already in preview mode ---
            if (globalIsPreviewMode) {
                // Try to find the preview container and update it
                const previewContainer = document.querySelector('.markdown-preview');
                if (previewContainer) {
                    previewContainer.innerHTML = window.markdown.markdownToHtml(note.content);
                }
            }
        }
        document.getElementById('noteTimestamp').textContent = 
            new Date(note.timestamp).toLocaleString();
    }
}

// Save or update the current note
async function saveNote(userInitiated = false) {
    // Only allow modal if explicitly from Save button
    if (userInitiated && document.activeElement?.id !== 'saveButton') {
        userInitiated = false;
    }
    console.log('saveNote called. userInitiated:', userInitiated, 'Stack:', new Error().stack);
    if (!markdownEditor) return;
    
    const noteContent = markdownEditor.getRawMarkdown();
    const noteTitle = document.getElementById('noteTitle').value.trim();
    const title = noteTitle || noteContent.split('\n')[0];

    // If no current note ID, always create new
    if (!currentNoteId) {
        const newNote = { 
            id: Date.now(), 
            content: noteContent, 
            title: title, 
            timestamp: Date.now() 
        };
        
        try {
            await window.storage.addNote(newNote);
            currentNoteId = newNote.id;
            console.log('New note created:', newNote.id);
            
            // Update timestamp display
            document.getElementById('noteTimestamp').textContent = 
                new Date(newNote.timestamp).toLocaleString();
            
            // Update UI
            if (!window.storage.isFirestoreMode()) {
                window.notesList.renderNotesList();
            }
        } catch (error) {
            console.error('Error creating note:', error);
            alert('Error saving note. Please try again.');
        }
        return;
    }

    // Only show modal if user pressed Save
    if (userInitiated) {
        window.modals.showSaveOptionsModal(
            'Update this note or save as new?',
            async () => {
                await updateExistingNote(currentNoteId, noteContent, title);
            },
            async () => {
                await saveAsNewNote(noteContent, title);
            }
        );
    } else {
        // Auto-save or programmatic save: just update
        await updateExistingNote(currentNoteId, noteContent, title);
    }
}

// Helper function to update existing note
async function updateExistingNote(noteId, content, title) {
    try {
        const existingNote = window.storage.notes.find(n => n.id === noteId);
        if (existingNote) {
            const updatedNote = {
                ...existingNote,
                content: content,
                title: title,
                timestamp: Date.now()
            };
            
            await window.storage.updateNote(noteId, updatedNote);
            console.log('Note updated:', noteId);
            
            // Update timestamp display
            document.getElementById('noteTimestamp').textContent = 
                new Date(updatedNote.timestamp).toLocaleString();
            
            // Update UI
            if (!window.storage.isFirestoreMode()) {
                window.notesList.renderNotesList();
            }
        }
    } catch (error) {
        console.error('Error updating note:', error);
        alert('Error updating note. Please try again.');
    }
}

// Helper function to save as new note
async function saveAsNewNote(content, title) {
    try {
        const newNote = { 
            id: Date.now(), 
            content: content, 
            title: title, 
            timestamp: Date.now() 
        };
        
        await window.storage.addNote(newNote);
        currentNoteId = newNote.id;
        console.log('New note created from existing:', newNote.id);
        
        // Update timestamp display
        document.getElementById('noteTimestamp').textContent = 
            new Date(newNote.timestamp).toLocaleString();
        
        // Update UI
        if (!window.storage.isFirestoreMode()) {
            window.notesList.renderNotesList();
        }
    } catch (error) {
        console.error('Error creating new note:', error);
        alert('Error saving new note. Please try again.');
    }
}

// Delete the current note
async function deleteNote() {
    if (!currentNoteId) {
        alert('No note selected to delete.');
        return;
    }

    // Find the note to confirm it exists
    const noteToDelete = window.storage.notes.find(n => n.id === currentNoteId);
    if (!noteToDelete) {
        alert('Note not found.');
        return;
    }

    const noteTitle = noteToDelete.title || noteToDelete.content.split('\n')[0] || 'Untitled Note';
    
    window.modals.showConfirmModal(
        `Are you sure you want to delete "${noteTitle}"? This cannot be undone.`, 
        async () => {
            try {
                console.log('Deleting note:', currentNoteId);
                
                // Delete from storage
                await window.storage.deleteNote(currentNoteId);
                
                // Clear editor
                const oldNoteId = currentNoteId;
                currentNoteId = null;
                
                if (markdownEditor) {
                    clearUndoRedoStacks();
                    markdownEditor.setContent('');
                }
                
                document.getElementById('noteTitle').value = '';
                document.getElementById('noteTimestamp').textContent = '';
                
                console.log('Note deleted successfully:', oldNoteId);
                
                // Update notes list immediately for localStorage mode
                if (!window.storage.isFirestoreMode()) {
                    window.notesList.renderNotesList();
                }
                
                // Show success feedback
                console.log('Delete operation completed');
                
            } catch (error) {
                console.error('Error deleting note:', error);
                alert('Error deleting note: ' + error.message);
            }
        }
    );
}

// Setup global preview toggle
function setupGlobalPreviewToggle() {
    document.addEventListener('mousedown', function(event) {
        // Only act if in edit mode and not already in preview
        if (!window.globalIsPreviewMode) {
            // Find editor and preview containers
            const editorContainer = document.getElementById('markdownEditor');
            const previewContainer = document.querySelector('.markdown-preview');
            // Ignore clicks inside editor, preview, modals, or toggle button
            if (
                editorContainer.contains(event.target) ||
                (previewContainer && previewContainer.contains(event.target)) ||
                event.target.closest('.modal-window, .modal-overlay') ||
                event.target.closest('#modeToggleButton')
            ) {
                return;
            }
            // Toggle to preview mode
            if (window.editor && window.editor.markdownEditor && typeof window.editor.markdownEditor.toggleMode === 'function') {
                window.editor.markdownEditor.toggleMode();
            }
        }
    });
}

// Spoiler functionality
function setupSpoilerDelegation() {
    document.addEventListener('click', function(event) {
        // Only handle in preview mode
        if (!window.globalIsPreviewMode) return;
        // Only handle spoilers inside .markdown-preview
        const spoiler = event.target.closest('.spoiler');
        if (
            spoiler &&
            spoiler.closest('.markdown-preview') &&
            typeof window.markdown?.toggleSpoiler === 'function'
        ) {
            event.stopPropagation();
            window.markdown.toggleSpoiler(spoiler);
        }
    });
}

// Check for unsaved changes before logout
function checkUnsavedChanges() {
    if (!markdownEditor || !currentNoteId) return Promise.resolve(true);

    const currentContent = markdownEditor.getRawMarkdown();
    const currentTitle = document.getElementById('noteTitle').value.trim();

    // Get the existing note to compare
    const existingNote = window.storage.notes.find(n => n.id === currentNoteId);
    if (!existingNote) return Promise.resolve(true);

    // Check if content or title has changed
    const contentChanged = currentContent !== existingNote.content;
    const titleChanged = currentTitle !== existingNote.title;

    if (contentChanged || titleChanged) {
        // Auto-save changes and proceed, NO MODAL
        return updateExistingNote(currentNoteId, currentContent, currentTitle || currentContent.split('\n')[0])
            .then(() => true)
            .catch(() => true); // Even if save fails, allow logout
    }

    return Promise.resolve(true);
}

// Export all necessary functions
window.editor = {
    initializeEditor,
    loadNoteById,
    saveNote,
    deleteNote,
    checkUnsavedChanges, // Add this export
    createNewNote: () => {
        currentNoteId = null;
        if (markdownEditor) {
            clearUndoRedoStacks();
            markdownEditor.setContent('');
        }
        document.getElementById('noteTitle').value = '';
        document.getElementById('noteTimestamp').textContent = '';
    },
    handleFileOpen: (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (markdownEditor) {
                    clearUndoRedoStacks();
                    markdownEditor.setContent(e.target.result);
                }
                document.getElementById('noteTitle').value = file.name.replace(/\.[^/.]+$/, "");
            };
            reader.readAsText(file);
        }
    },
    get markdownEditor() { return markdownEditor; },
    get isPreviewMode() { return globalIsPreviewMode; }, // Add this getter
    undo,
    redo
};