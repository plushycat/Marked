let notes = [];
try {
    notes = JSON.parse(localStorage.getItem('notes')) || [];
} catch (e) {
    console.error("Error loading notes from localStorage:", e);
    localStorage.removeItem('notes');
}

let currentNoteId = null;
let markdownEditor = null; // Add this declaration

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
            markdownEditor.setContent(note.content);
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
        notes = notes.filter(n => n.id !== currentNoteId);
        currentNoteId = null;
        if (markdownEditor) {
            markdownEditor.setContent('');
        }
        saveNotesToStorage();
        renderNotesList();
    }
}

// Clear the current note
function clearNote() {
    if (markdownEditor) {
        markdownEditor.setContent('');
    }
    document.getElementById('noteTitle').value = '';
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
    
    if (markdownEditor && markdownEditor.updateTheme) {
        markdownEditor.updateTheme();
    }
}

// Initialize Dark Mode from localStorage
function initializeDarkMode() {
    const darkModeSetting = localStorage.getItem('darkMode');
    if (darkModeSetting === 'enabled') {
        document.body.classList.add('dark-mode');
    }
}

// Simple text editor setup (fallback)
function setupSimpleEditor() {
    const container = document.getElementById('markdownEditor');
    
    // Create a simple textarea
    const textarea = document.createElement('textarea');
    textarea.id = 'simpleEditor';
    textarea.style.width = '100%';
    textarea.style.height = '300px';
    textarea.style.fontFamily = 'monospace';
    textarea.style.fontSize = '14px';
    textarea.style.border = 'none';
    textarea.style.outline = 'none';
    textarea.style.padding = '15px';
    textarea.style.resize = 'none';
    textarea.style.backgroundColor = 'var(--card-background)';
    textarea.style.color = 'var(--text-color)';
    
    container.appendChild(textarea);
    
    // Create preview container
    const previewContainer = document.createElement('div');
    previewContainer.className = 'markdown-preview';
    previewContainer.style.display = 'none';
    container.parentNode.insertBefore(previewContainer, container.nextSibling);
    
    // Create toggle button
    const toggleButton = document.createElement('button');
    toggleButton.textContent = 'Preview';
    toggleButton.style.marginBottom = '10px';
    toggleButton.style.width = 'auto';
    toggleButton.style.padding = '8px 16px';
    container.parentNode.insertBefore(toggleButton, container);
    
    let isPreviewMode = false;
    
    // Function to toggle between edit and preview modes
    function toggleMode() {
        isPreviewMode = !isPreviewMode;
        
        if (isPreviewMode) {
            container.style.display = 'none';
            previewContainer.style.display = 'block';
            toggleButton.textContent = 'Edit';
            previewContainer.innerHTML = markdownToHtml(textarea.value);
        } else {
            container.style.display = 'block';
            previewContainer.style.display = 'none';
            toggleButton.textContent = 'Preview';
            textarea.focus(); // Focus the textarea when switching back to edit mode
        }
    }
    
    // Toggle button click handler
    toggleButton.addEventListener('click', function(e) {
        e.stopPropagation(); // Prevent event bubbling
        toggleMode();
    });
    
    // Click outside handler for simple editor
    document.addEventListener('click', function(e) {
        // Check if click is outside the editor area
        const editorArea = container.parentNode; // The .note-editor section
        const clickedInsideEditor = container.contains(e.target) || 
                                  previewContainer.contains(e.target) || 
                                  toggleButton.contains(e.target) ||
                                  editorArea.querySelector('#noteTitle').contains(e.target) ||
                                  editorArea.querySelector('.editor-buttons').contains(e.target);
        
        // Don't toggle if clicking on spoilers, password content, or links
        const isInteractiveElement = e.target.classList.contains('spoiler') ||
                                   e.target.classList.contains('password-content') ||
                                   e.target.tagName === 'A' ||
                                   e.target.closest('.spoiler') ||
                                   e.target.closest('.password-content') ||
                                   e.target.closest('a');
        
        if (!clickedInsideEditor && !isInteractiveElement) {
            // Only toggle to preview mode if we're currently in edit mode
            if (!isPreviewMode) {
                toggleMode();
            }
        }
    });
    
    // Click on preview to go back to edit mode
    previewContainer.addEventListener('click', function(e) {
        // Don't switch to edit mode if clicking on interactive elements
        if (e.target.classList.contains('spoiler') || 
            e.target.classList.contains('password-content') ||
            e.target.tagName === 'A' ||
            e.target.closest('.spoiler') ||
            e.target.closest('.password-content') ||
            e.target.closest('a')) {
            e.stopPropagation();
            return; // Exit early, don't toggle mode
        }
        
        e.stopPropagation(); // Prevent event bubbling
        if (isPreviewMode) {
            toggleMode();
        }
    });
    
    return {
        getRawMarkdown: () => textarea.value,
        setContent: (content) => {
            textarea.value = content || '';
        },
        updateTheme: () => {
            // Simple theme update for textarea
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

// Spoiler toggle functionality for preview mode
function toggleSpoiler(element) {
    console.log('Toggling spoiler:', element); // Debug log
    element.classList.toggle('revealed');
    
    // Add visual feedback
    if (element.classList.contains('revealed')) {
        element.style.transform = 'scale(1.02)';
        setTimeout(() => {
            element.style.transform = '';
        }, 150);
    }
}

// Password toggle functionality
document.body.addEventListener('click', function(event) {
    console.log('Click detected on:', event.target, 'Classes:', event.target.classList); // Debug log
    
    // Handle password content
    if (event.target.classList.contains('show-password')) {
        const passwordContent = event.target.nextElementSibling;
        if (passwordContent.style.display === 'none') {
            passwordContent.style.display = 'block';
            event.target.textContent = 'Hide Password';
        } else {
            passwordContent.style.display = 'none';
            event.target.textContent = 'Show Password';
        }
        return;
    }
    
    // Handle spoiler content - simplified and more reliable
    if (event.target.classList.contains('spoiler')) {
        console.log('Spoiler clicked!'); // Debug log
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        
        toggleSpoiler(event.target);
        return false;
    }
}, true); // Use capture phase to catch events early

// Single DOMContentLoaded event listener
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
        
        // Setup CodeMirror editor
        const container = document.getElementById('markdownEditor');
        
        // Create preview container
        const previewContainer = document.createElement('div');
        previewContainer.className = 'markdown-preview';
        previewContainer.style.display = 'none';
        container.parentNode.insertBefore(previewContainer, container.nextSibling);
        
        // Create toggle button
        const toggleButton = document.createElement('button');
        toggleButton.textContent = 'Preview';
        toggleButton.style.marginBottom = '10px';
        toggleButton.style.width = 'auto';
        toggleButton.style.padding = '8px 16px';
        container.parentNode.insertBefore(toggleButton, container);
        
        let isPreviewMode = false;
        let currentContent = '';
        
        const getTheme = () => {
            return document.body.classList.contains('dark-mode') ? [oneDark] : [];
        };
        
        const view = new EditorView({
            state: EditorState.create({
                doc: '',
                extensions: [
                    basicSetup,
                    markdown(),
                    ...getTheme(),
                    EditorView.updateListener.of((update) => {
                        if (update.docChanged) {
                            currentContent = update.state.doc.toString();
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
            
            if (isPreviewMode) {
                container.style.display = 'none';
                previewContainer.style.display = 'block';
                toggleButton.textContent = 'Edit';
                previewContainer.innerHTML = markdownToHtml(currentContent);
            } else {
                container.style.display = 'block';
                previewContainer.style.display = 'none';
                toggleButton.textContent = 'Preview';
                view.focus(); // Focus the editor when switching back to edit mode
            }
        }
        
        // Toggle button click handler
        toggleButton.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent event bubbling
            toggleMode();
        });
        
        // Click outside handler for CodeMirror editor
        document.addEventListener('click', function(e) {
            // Check if click is outside the editor area
            const editorArea = container.parentNode; // The .note-editor section
            const clickedInsideEditor = container.contains(e.target) || 
                                      previewContainer.contains(e.target) || 
                                      toggleButton.contains(e.target) ||
                                      editorArea.querySelector('#noteTitle').contains(e.target) ||
                                      editorArea.querySelector('.editor-buttons').contains(e.target);
            
            // Don't toggle if clicking on spoilers, password content, or links
            const isInteractiveElement = e.target.classList.contains('spoiler') ||
                                       e.target.classList.contains('password-content') ||
                                       e.target.tagName === 'A' ||
                                       e.target.closest('.spoiler') ||
                                       e.target.closest('.password-content') ||
                                       e.target.closest('a');
            
            if (!clickedInsideEditor && !isInteractiveElement) {
                // Only toggle to preview mode if we're currently in edit mode
                if (!isPreviewMode) {
                    toggleMode();
                }
            }
        });
        
        // Click on preview to go back to edit mode
        previewContainer.addEventListener('click', function(e) {
            // Don't switch to edit mode if clicking on interactive elements
            if (e.target.classList.contains('spoiler') || 
                e.target.classList.contains('password-content') ||
                e.target.tagName === 'A' ||
                e.target.closest('.spoiler') ||
                e.target.closest('.password-content') ||
                e.target.closest('a')) {
                e.stopPropagation();
                return; // Exit early, don't toggle mode
            }
            
            e.stopPropagation(); // Prevent event bubbling
            if (isPreviewMode) {
                toggleMode();
            }
        });
        
        markdownEditor = {
            getRawMarkdown: () => currentContent,
            setContent: (content) => {
                currentContent = content || '';
                view.dispatch({
                    changes: {
                        from: 0,
                        to: view.state.doc.length,
                        insert: currentContent
                    }
                });
            },
            updateTheme: () => {
                const newState = view.state.reconfigure({
                    extensions: [
                        basicSetup,
                        markdown(),
                        ...getTheme(),
                        EditorView.updateListener.of((update) => {
                            if (update.docChanged) {
                                currentContent = update.state.doc.toString();
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
            toggleMode: toggleMode // Add this line to expose the toggle function
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
    document.getElementById('saveButton').addEventListener('click', saveNote);
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
    
    // Initial render
    renderNotesList();
    
    console.log('Initialization complete');
    
    // After setting up the markdown editor, add keyboard event listener
    
    // Global keyboard event listener for Escape key
    document.addEventListener('keydown', function(e) {
        // Check if Escape key is pressed
        if (e.key === 'Escape') {
            // Prevent default behavior
            e.preventDefault();
            
            // Only toggle if markdownEditor exists and has the toggle functionality
            if (markdownEditor && typeof markdownEditor.toggleMode === 'function') {
                markdownEditor.toggleMode();
            }
        }
    });
});
