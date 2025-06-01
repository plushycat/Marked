let notes = [];
try {
    notes = JSON.parse(localStorage.getItem('notes')) || [];
} catch (e) {
    console.error("Error loading notes from localStorage:", e);
    localStorage.removeItem('notes');
}

let currentNoteId = null;
let markdownEditor = null; // Add this declaration

// Add these variables at the top with other global variables
let undoStack = [];
let redoStack = [];
let maxUndoStackSize = 100; // Limit to prevent memory issues, but still very generous
let globalIsPreviewMode = false; // Add this with other global variables at the top

// Save notes to localStorage
function saveNotesToStorage() {
    localStorage.setItem('notes', JSON.stringify(notes));
}

// Render the list of notes
function renderNotesList() {
    const notesList = document.getElementById('notesList');
    notesList.innerHTML = '';
    notes.forEach(note => {
        const noteItem = document.createElement('div');
        noteItem.className = 'note-item';
        noteItem.textContent = note.title || note.content.split('\n')[0] || 'Untitled Note';
        noteItem.dataset.id = note.id;

        // Add timestamp to the note item
        const timestamp = document.createElement('span');
        timestamp.className = 'note-timestamp';
        timestamp.textContent = new Date(note.timestamp).toISOString();
        noteItem.appendChild(timestamp);

        noteItem.addEventListener('click', () => loadNoteById(note.id));
        notesList.appendChild(noteItem);
    });
}

// Load a note by ID
function loadNoteById(noteId) {
    currentNoteId = noteId;
    const note = notes.find(n => n.id === noteId);
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
                    previewContainer.innerHTML = markdownToHtml(note.content);
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
        notes.push(newNote);
        currentNoteId = newNote.id;
    } else {
        const note = notes.find(n => n.id === currentNoteId);
        if (note) {
            note.content = noteContent;
            note.title = title;
            note.timestamp = Date.now();
        }
    }
    saveNotesToStorage();
    renderNotesList();
}

// Delete the current note
function deleteNote() {
    if (currentNoteId) {
        showConfirmModal("Are you sure you want to delete this note? This cannot be undone.", () => {
            notes = notes.filter(n => n.id !== currentNoteId);
            currentNoteId = null;
            if (markdownEditor) {
                markdownEditor.setContent('');
            }
            saveNotesToStorage();
            renderNotesList();
        });
    }
}

// Clear the current note
function clearNote() {
    showConfirmModal("Are you sure you want to clear this note?", () => {
        if (markdownEditor) {
            markdownEditor.setContent('');
        }
        document.getElementById('noteTitle').value = '';
        document.getElementById('noteTimestamp').textContent = '';
    });
}

// Export the current note to .txt format
function exportNoteTxt() {
    if (!markdownEditor) return;
    const noteContent = markdownEditor.getRawMarkdown();
    const blob = new Blob([noteContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'note.txt';
    a.click();
    URL.revokeObjectURL(url);
}

// Export the current note to .md format
function exportNoteMd() {
    if (!markdownEditor) return;
    const noteContent = markdownEditor.getRawMarkdown();
    const blob = new Blob([noteContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'note.md';
    a.click();
    URL.revokeObjectURL(url);
}

// Create a new note
function createNewNote() {
    currentNoteId = null;
    if (markdownEditor) {
        clearUndoRedoStacks(); // Clear when creating a new note
        markdownEditor.setContent('');
    }
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteTimestamp').textContent = '';
}

// Markdown conversion
function markdownToHtml(markdownText) {
    if (!markdownText) return '';
    
    return markdownText
        .replace(/(?:\r\n|\r|\n)/g, '\n')
        // Handle multiline code blocks FIRST (before other processing)
        .replace(/```(\w+)?\n?([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
        // Handle spoiler tags (WITHOUT onclick - we use event delegation)
        .replace(/\|\|([^|]+)\|\|/g, '<span class="spoiler">$1</span>')
        .replace(/<spoiler>(.*?)<\/spoiler>/g, '<span class="spoiler">$1</span>')
        // Handle headers
        .replace(/^######\s?(.*)$/gm, '<h6>$1</h6>')
        .replace(/^#####\s?(.*)$/gm, '<h5>$1</h5>')
        .replace(/^####\s?(.*)$/gm, '<h4>$1</h4>')
        .replace(/^###\s?(.*)$/gm, '<h3>$1</h3>')
        .replace(/^##\s?(.*)$/gm, '<h2>$1</h2>')
        .replace(/^#\s?(.*)$/gm, '<h1>$1</h1>')
        // Handle text formatting
        .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/__(.*?)__/g, '<strong>$1</strong>')
        .replace(/_(.*?)_/g, '<em>$1</em>')
        .replace(/~~(.*?)~~/g, '<del>$1</del>')
        // Handle inline code (after multiline code)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Handle blockquotes - FIXED VERSION
        .replace(/^>\s?(.*)$/gm, '<!BLOCKQUOTE!>$1')
        .replace(/(<!BLOCKQUOTE!>.*(?:\n<!BLOCKQUOTE!>.*)*)/g, function(match) {
            const content = match.replace(/<!BLOCKQUOTE!>/g, '').trim();
            return `<blockquote>${content}</blockquote>`;
        })
        // Handle lists
        .replace(/^\d+\.\s+(.*)$/gm, '<ol><li>$1</li></ol>')
        .replace(/<\/ol>\s*<ol>/g, '')
        .replace(/^[-*+]\s+(.*)$/gm, '<ul><li>$1</li></ul>')
        .replace(/<\/ul>\s*<ul>/g, '')
        // Handle links and images
        .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
        .replace(/!\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<img src="$2" alt="$1" />')
        // Handle password content
        .replace(/<ps>(.*?)<\/ps>/g, (match, content) => {
            return `<span class="password-content">${content}</span>`;
        })
        .replace(/<password>(.*?)<\/password>/g, (match, content) => {
            return `<span class="password-content">${content}</span>`;
        })
        // Convert remaining lines to paragraphs
        .replace(/^(?!<[^>]+>|\s*[\-\*\+]\s|\d+\.\s|#|>|\s*$)(.+)$/gm, '<p>$1</p>')
        // Clean up empty paragraphs
        .replace(/<p>\s*<\/p>/g, '');
}

// Open file function
function openFile(file) {
    const reader = new FileReader();
    reader.onload = function(event) {
        const fileContent = event.target.result;
        if (markdownEditor) {
            markdownEditor.setContent(fileContent);
        }
        const title = file.name.replace(/\.(txt|md)$/, '');
        document.getElementById('noteTitle').value = title;
    };
    reader.readAsText(file);
}

// Filter notes function
function filterNotes() {
    const searchQuery = document.getElementById('searchInput').value.toLowerCase().trim();
    
    if (searchQuery === '') {
        renderNotesList();
        return;
    }
    
    const filteredNotes = notes.filter(note => {
        const titleMatch = note.title && note.title.toLowerCase().includes(searchQuery);
        const contentMatch = note.content.toLowerCase().includes(searchQuery);
        return titleMatch || contentMatch;
    });
    
    const notesList = document.getElementById('notesList');
    notesList.innerHTML = '';
    filteredNotes.forEach(note => {
        const noteItem = document.createElement('div');
        noteItem.className = 'note-item';
        noteItem.textContent = note.title || note.content.split('\n')[0] || 'Untitled Note';
        noteItem.dataset.id = note.id;
        
        const timestamp = document.createElement('span');
        timestamp.className = 'note-timestamp';
        timestamp.textContent = new Date(note.timestamp).toISOString();
        noteItem.appendChild(timestamp);
        
        noteItem.addEventListener('click', () => loadNoteById(note.id));
        notesList.appendChild(noteItem);
    });
}

// Dark Mode Toggle
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode ? 'enabled' : 'disabled');
    
    // Update the button icon
    updateDarkModeButtonIcon(isDarkMode);
    
    if (markdownEditor && markdownEditor.updateTheme) {
        markdownEditor.updateTheme();
    }
}

// Add this new function to update the button icon:
function updateDarkModeButtonIcon(isDarkMode) {
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        if (isDarkMode) {
            darkModeToggle.textContent = '☀️'; // Sun icon for light mode option
            darkModeToggle.title = 'Switch to Light Mode';
        } else {
            darkModeToggle.textContent = '🌙'; // Moon icon for dark mode option
            darkModeToggle.title = 'Switch to Dark Mode';
        }
    }
}

// Update the initializeDarkMode function to set the correct initial icon:
function initializeDarkMode() {
    const darkModeSetting = localStorage.getItem('darkMode');
    const isDarkMode = darkModeSetting === 'enabled';
    
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
    }
    
    // Set the correct icon on page load
    updateDarkModeButtonIcon(isDarkMode);
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
            previewContainer.innerHTML = markdownToHtml(textarea.value);
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
    previewContainer.addEventListener('click', function () {
        // Only switch if currently in preview mode
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

// Try to load CodeMirror, fallback to simple editor
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM loaded, initializing...');
    
    // Initialize dark mode first
    initializeDarkMode();
    
    // Try to setup CodeMirror, fallback to simple editor
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
                previewContainer.innerHTML = markdownToHtml(currentContent);
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
        previewContainer.addEventListener('click', function () {
            // Only switch if currently in preview mode
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
                                previewContainer.innerHTML = markdownToHtml(currentContent);
                            }
                        }
                    })
                ]
            }),
            parent: container
        });
        
        // Function to toggle between edit and preview modes
        function toggleMode() {
            isPreviewMode = !isPreviewMode;
            globalIsPreviewMode = isPreviewMode;
            
            if (isPreviewMode) {
                container.style.display = 'none';
                previewContainer.style.display = 'block';
                toggleButton.textContent = '✏️'; // Edit icon
                toggleButton.title = 'Switch to Edit Mode';
                previewContainer.innerHTML = markdownToHtml(currentContent);
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
                                    previewContainer.innerHTML = markdownToHtml(currentContent);
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
    
    // Setup event listeners
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filterNotes);
    }
    
    // Setup button event listeners
    document.getElementById('deleteButton').addEventListener('click', deleteNote);
    document.getElementById('clearButton').addEventListener('click', clearNote);
    document.getElementById('txtButton').addEventListener('click', exportNoteTxt);
    document.getElementById('mdButton').addEventListener('click', exportNoteMd);
    document.getElementById('newNoteButton').addEventListener('click', createNewNote);
    
    const darkModeToggleButton = document.getElementById('darkModeToggle');
    if (darkModeToggleButton) {
        darkModeToggleButton.addEventListener('click', toggleDarkMode);
    }
    
    // Setup file input handlers
    document.getElementById('openFileButton').addEventListener('click', function() {
        document.getElementById('fileInput').click();
    });
    
    document.getElementById('fileInput').addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            openFile(file);
        }
    });
    
    // Add event listeners for undo/redo buttons
    document.getElementById('undoButton').addEventListener('click', undo);
    document.getElementById('redoButton').addEventListener('click', redo);
    
    // Initial render
    renderNotesList();
    
    // Initialize undo/redo buttons state
    updateUndoRedoButtons();
    
    console.log('Initialization complete');
});

// Spoiler toggle functionality
function toggleSpoiler(element) {
    element.classList.toggle('revealed');
}

// SINGLE unified event handler for all interactions
document.addEventListener('click', function(event) {
    // Handle spoiler clicks with highest priority
    if (event.target.classList.contains('spoiler')) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        toggleSpoiler(event.target);
        return false;
    }
    
    // Handle password content
    if (event.target.classList.contains('password-content')) {
        event.target.classList.toggle('revealed');
        event.stopPropagation();
        return;
    }
    
    // Handle links - don't interfere
    if (event.target.tagName === 'A') {
        event.stopPropagation();
        return;
    }
    
    // Skip if inside interactive elements
    if (event.target.closest('.spoiler') || event.target.closest('.password-content') || event.target.closest('a')) {
        return;
    }
    
    // Handle editor mode switching for click-outside
    if (markdownEditor && typeof markdownEditor.toggleMode === 'function') {
        const editorContainer = document.getElementById('markdownEditor');
        const previewContainer = document.querySelector('.markdown-preview');
        const toggleButton = document.getElementById('modeToggleButton'); // Use the new ID
        const noteTitle = document.getElementById('noteTitle');
        const headerToolbar = document.querySelector('.editor-toolbar');
        const sidebar = document.querySelector('.notes-sidebar');
        
        // Check if click is inside any editor-related area
        const isInsideEditorArea = 
            (editorContainer && editorContainer.contains(event.target)) ||
            (previewContainer && previewContainer.contains(event.target)) ||
            (toggleButton && toggleButton.contains(event.target)) ||
            (noteTitle && noteTitle.contains(event.target)) ||
            (headerToolbar && headerToolbar.contains(event.target)) ||
            (sidebar && sidebar.contains(event.target));
        
        // Only toggle to preview if clicking completely outside and not already in preview
        if (!isInsideEditorArea) {
            const isInPreview = editorContainer && editorContainer.style.display === 'none';
            if (!isInPreview) {
                markdownEditor.toggleMode();
            }
        }
    }
});

// SINGLE keyboard event handler
document.addEventListener('keydown', function(e) {
    // Ctrl+Z for undo
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
    }
    
    // Ctrl+Y or Ctrl+Shift+Z for redo
    if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        redo();
        return;
    }
    
    // Escape key for toggle
    if (e.key === 'Escape') {
        e.preventDefault();
        if (markdownEditor && typeof markdownEditor.toggleMode === 'function') {
            markdownEditor.toggleMode();
        }
        return;
    }
    
    // Allow ESC to close any open modal
    if (e.key === 'Escape') {
        // Close confirm modal if open
        const confirmCheckbox = document.getElementById('confirmModalCheckbox');
        if (confirmCheckbox && confirmCheckbox.checked) {
            confirmCheckbox.checked = false;
        }
        // Close save options modal if open
        const saveOptionsCheckbox = document.getElementById('saveOptionsModalCheckbox');
        if (saveOptionsCheckbox && saveOptionsCheckbox.checked) {
            saveOptionsCheckbox.checked = false;
        }
    }
});

function showConfirmModal(message, onConfirm) {
    document.getElementById('modalMessage').textContent = message;
    document.getElementById('confirmModalCheckbox').checked = true;
    const confirmBtn = document.getElementById('modalConfirmBtn');
    const cancelBtn = document.getElementById('modalCancelBtn');
    // Remove previous listeners
    confirmBtn.onclick = null;
    cancelBtn.onclick = null;
    confirmBtn.onclick = function() {
        document.getElementById('confirmModalCheckbox').checked = false;
        onConfirm();
    };
    cancelBtn.onclick = function() {
        document.getElementById('confirmModalCheckbox').checked = false;
    };
}

function showSaveOptionsModal(onUpdate, onSaveAsNew) {
    document.getElementById('saveOptionsModalCheckbox').checked = true;
    const updateBtn = document.getElementById('saveUpdateBtn');
    const saveAsNewBtn = document.getElementById('saveAsNewBtn');
    // Remove previous listeners
    updateBtn.onclick = null;
    saveAsNewBtn.onclick = null;
    updateBtn.onclick = function() {
        document.getElementById('saveOptionsModalCheckbox').checked = false;
        onUpdate();
    };
    saveAsNewBtn.onclick = function() {
        document.getElementById('saveOptionsModalCheckbox').checked = false;
        onSaveAsNew();
    };
}

document.getElementById('saveButton').onclick = function() {
    showSaveOptionsModal(
        () => saveNote(), // Update existing
        () => {
            // Save as new
            if (!markdownEditor) return;
            const noteContent = markdownEditor.getRawMarkdown();
            const noteTitle = document.getElementById('noteTitle').value.trim();
            const title = noteTitle || noteContent.split('\n')[0] || 'Untitled Note';
            const newNote = {
                id: Date.now(),
                content: noteContent,
                title: title,
                timestamp: Date.now()
            };
            notes.push(newNote);
            currentNoteId = newNote.id;
            saveNotesToStorage();
            renderNotesList();
            loadNoteById(newNote.id);
        }
    );
};
