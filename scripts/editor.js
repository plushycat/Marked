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
function saveNote() {
    if (!markdownEditor) return;
    
    const noteContent = markdownEditor.getRawMarkdown();
    const noteTitle = document.getElementById('noteTitle').value.trim();
    const title = noteTitle || noteContent.split('\n')[0];

    if (!currentNoteId) {
        const newNote = { id: Date.now(), content: noteContent, title: title, timestamp: Date.now() };
        window.storage.notes.push(newNote);
        currentNoteId = newNote.id;
    } else {
        const note = window.storage.notes.find(n => n.id === currentNoteId);
        if (note) {
            note.content = noteContent;
            note.title = title;
            note.timestamp = Date.now();
        }
    }
    window.storage.saveNotesToStorage();
    window.notesList.renderNotesList();
}

// Delete the current note
function deleteNote() {
    if (currentNoteId) {
        window.modals.showConfirmModal("Are you sure you want to delete this note? This cannot be undone.", () => {
            window.storage.notes = window.storage.notes.filter(n => n.id !== currentNoteId);
            currentNoteId = null;
            if (markdownEditor) {
                clearUndoRedoStacks();
                markdownEditor.setContent('');
            }
            document.getElementById('noteTitle').value = '';
            document.getElementById('noteTimestamp').textContent = '';
            window.storage.saveNotesToStorage();
            window.notesList.renderNotesList();
        });
    }
}

// Clear the current note
function clearNote() {
    if (markdownEditor) {
        clearUndoRedoStacks();
        markdownEditor.setContent('');
        
        // Update preview if in preview mode
        if (globalIsPreviewMode) {
            const previewContainer = document.querySelector('.markdown-preview');
            if (previewContainer) {
                previewContainer.innerHTML = ''; // Clear preview content
            }
        }
    }
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteTimestamp').textContent = '';
}

// Create a new note
function createNewNote() {
    currentNoteId = null;
    if (markdownEditor) {
        clearUndoRedoStacks(); // Clear when creating a new note
        markdownEditor.setContent('');
        
        // Update preview if in preview mode
        if (globalIsPreviewMode) {
            const previewContainer = document.querySelector('.markdown-preview');
            if (previewContainer) {
                previewContainer.innerHTML = ''; // Clear preview content
            }
        }
    }
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteTimestamp').textContent = '';
}

// Export the current note to .txt format
function exportNoteTxt() {
    if (!markdownEditor) return;
    
    const noteContent = markdownEditor.getRawMarkdown();
    const noteTitle = document.getElementById('noteTitle').value.trim() || 'untitled';
    
    const blob = new Blob([noteContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${noteTitle}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Export the current note to .md format
function exportNoteMd() {
    if (!markdownEditor) return;
    
    const noteContent = markdownEditor.getRawMarkdown();
    const noteTitle = document.getElementById('noteTitle').value.trim() || 'untitled';
    
    const blob = new Blob([noteContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${noteTitle}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Open file function
function openFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        if (markdownEditor) {
            clearUndoRedoStacks();
            markdownEditor.setContent(e.target.result);
        }
        // Extract filename without extension for title
        const fileName = file.name.replace(/\.[^/.]+$/, "");
        document.getElementById('noteTitle').value = fileName;
        currentNoteId = null; // Treat as new note
    };
    reader.readAsText(file);
}

// Initialize editor
async function initializeEditor() {
    console.log('Initializing editor...');
    
    // Try to setup CodeMirror, fallback to simple editor
    await setupCodeMirrorEditor();
    
    // Initialize undo/redo buttons state
    updateUndoRedoButtons();
    
    console.log('Editor initialization complete');
}

// Export for use by other modules
window.editor = {
    get currentNoteId() { return currentNoteId; },
    set currentNoteId(value) { currentNoteId = value; },
    markdownEditor: () => markdownEditor,
    initializeEditor,
    loadNoteById,
    saveNote,
    deleteNote,
    clearNote,
    createNewNote,
    exportNoteTxt,
    exportNoteMd,
    openFile,
    undo,
    redo,
    updateUndoRedoButtons,
    clearUndoRedoStacks
};