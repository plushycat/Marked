// Editor functionality
let currentNoteId = null;
let markdownEditor = null;

// Add these variables for undo/redo functionality
let undoStack = [];
let redoStack = [];
let maxUndoStackSize = 100;
let globalIsPreviewMode = false;

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
    
    // Add input event listener for undo tracking
    let inputTimeout;
    textarea.addEventListener('input', function() {
        clearTimeout(inputTimeout);
        inputTimeout = setTimeout(() => {
            saveToUndoStack(textarea.value);
        }, 500);
    });
    
    // Create preview container
    const previewContainer = document.createElement('div');
    previewContainer.className = 'markdown-preview';
    previewContainer.style.display = 'none';
    container.parentNode.insertBefore(previewContainer, container.nextSibling);
    
    // Use the existing button instead of creating a new one
    const toggleButton = document.getElementById('modeToggleButton');
    
    let isPreviewMode = false;
    
    // Function to toggle between edit and preview modes
    function toggleMode() {
        isPreviewMode = !isPreviewMode;
        globalIsPreviewMode = isPreviewMode;
        
        if (isPreviewMode) {
            container.style.display = 'none';
            previewContainer.style.display = 'block';
            toggleButton.textContent = '✏️'; // Edit icon
            toggleButton.title = 'Switch to Edit Mode';
            previewContainer.innerHTML = window.markdown.markdownToHtml(textarea.value);
        } else {
            container.style.display = 'block';
            previewContainer.style.display = 'none';
            toggleButton.textContent = '👁️'; // Preview icon
            toggleButton.title = 'Switch to Preview Mode';
            textarea.focus();
        }
        
        console.log('Toggled to:', isPreviewMode ? 'Preview' : 'Edit');
    }
    
    // Toggle button click handler
    toggleButton.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleMode();
    });
    
    // Click handler for preview container
    previewContainer.addEventListener('click', function (event) {
        // Prevent toggling mode if clicking a spoiler or inside a spoiler
        if (event.target.closest('.spoiler')) {
            return;
        }
        if (globalIsPreviewMode && typeof markdownEditor.toggleMode === 'function') {
            markdownEditor.toggleMode();
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
            
            if (isPreviewMode) {
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
            import('https://cdn.jsdelivr.net/npm/@codemirror/state@6/dist/index.js'),
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
            globalIsPreviewMode = isPreviewMode;
            
            if (isPreviewMode) {
                container.style.display = 'none';
                previewContainer.style.display = 'block';
                toggleButton.textContent = '✏️'; // Edit icon
                toggleButton.title = 'Switch to Edit Mode';
                previewContainer.innerHTML = window.markdown.markdownToHtml(currentContent);
            } else {
                container.style.display = 'block';
                previewContainer.style.display = 'none';
                toggleButton.textContent = '👁️'; // Preview icon
                toggleButton.title = 'Switch to Preview Mode';
                view.focus();
            }
            
            console.log('Toggled to:', isPreviewMode ? 'Preview' : 'Edit');
        }
        
        // Toggle button click handler
        toggleButton.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleMode();
        });
        
        // Click handler for preview container
        previewContainer.addEventListener('click', function (event) {
            // Prevent toggling mode if clicking a spoiler or inside a spoiler
            if (event.target.closest('.spoiler')) {
                return;
            }
            if (globalIsPreviewMode && typeof markdownEditor.toggleMode === 'function') {
                markdownEditor.toggleMode();
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
                    
                    // AUTO-SAVE TRIGGER - Add this
                    clearTimeout(window.autoSaveTimeout);
                    window.autoSaveTimeout = setTimeout(() => {
                        if (window.editor && window.editor.saveNote && currentNoteId) {
                            console.log('Auto-saving note...');
                            window.editor.saveNote();
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
        // Try CodeMirror first, fallback to simple editor
        await setupCodeMirrorEditor();
        console.log('Editor initialized successfully');
    } catch (error) {
        console.warn('CodeMirror failed, using simple editor:', error);
        markdownEditor = setupSimpleEditor();
    }
    
    // Set up initial buttons state
    updateUndoRedoButtons();
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
async function saveNote() {
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

    // If editing existing note, check if content changed significantly
    const existingNote = window.storage.notes.find(n => n.id === currentNoteId);
    if (existingNote) {
        const contentChanged = existingNote.content !== noteContent;
        const titleChanged = existingNote.title !== title;
        
        // If significant changes, show save options modal
        if (contentChanged || titleChanged) {
            // Check if this looks like a completely different note
            const isSignificantChange = 
                Math.abs(noteContent.length - existingNote.content.length) > 100 ||
                noteContent.split(' ').length !== existingNote.content.split(' ').length;
            
            if (isSignificantChange && noteContent.trim().length > 50) {
                // Show save options modal
                window.modals.showSaveOptionsModal(
                    'This note has changed significantly. Would you like to update the existing note or save as a new note?',
                    async () => {
                        // Update existing note
                        await updateExistingNote(currentNoteId, noteContent, title);
                    },
                    async () => {
                        // Save as new note
                        await saveAsNewNote(noteContent, title);
                    }
                );
                return;
            }
        }
        
        // For minor changes, just update existing note
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

// Export all necessary functions
window.editor = {
    initializeEditor,
    loadNoteById,
    saveNote,
    deleteNote,
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
                    markdownEditor.setContent(e.target.result);
                }
                document.getElementById('noteTitle').value = file.name.replace(/\.[^/.]+$/, "");
            };
            reader.readAsText(file);
        }
    },
    exportAsTxt: () => {
        if (markdownEditor) {
            const content = markdownEditor.getRawMarkdown();
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = (document.getElementById('noteTitle').value || 'note') + '.txt';
            a.click();
            URL.revokeObjectURL(url);
        }
    },
    exportAsMarkdown: () => {
        if (markdownEditor) {
            const content = markdownEditor.getRawMarkdown();
            const blob = new Blob([content], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = (document.getElementById('noteTitle').value || 'note') + '.md';
            a.click();
            URL.revokeObjectURL(url);
        }
    },
    undo,
    redo
};