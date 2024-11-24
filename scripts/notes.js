let notes = [];
try {
    notes = JSON.parse(localStorage.getItem('notes')) || [];
} catch (e) {
    console.error("Error loading notes from localStorage:", e);
    localStorage.removeItem('notes');
}

let currentNoteId = null;

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
        noteItem.textContent = note.title || note.content.split('\n')[0] || 'Untitled Note'; // Show title if available
        noteItem.dataset.id = note.id;

        // Add timestamp to the note item
        const timestamp = document.createElement('span');
        timestamp.className = 'note-timestamp';
        timestamp.textContent = new Date(note.timestamp).toISOString();  // ISO format
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
        document.getElementById('noteTitle').value = note.title || '';  // Set title field
        document.getElementById('noteInput').value = note.content;
        renderNote();
    }
}

// Save or update the current note
function saveNote() {
    const noteContent = document.getElementById('noteInput').value;
    const noteTitle = document.getElementById('noteTitle').value.trim(); // Get title input value
    const title = noteTitle || noteContent.split('\n')[0]; // Default to the first line of content if no title is provided

    if (!currentNoteId) {
        const newNote = { id: Date.now(), content: noteContent, title: title, timestamp: Date.now() };
        notes.push(newNote);
        currentNoteId = newNote.id;
    } else {
        const note = notes.find(n => n.id === currentNoteId);
        if (note) {
            note.content = noteContent;
            note.title = title;  // Save the title
            note.timestamp = Date.now(); // Update timestamp
        }
    }
    saveNotesToStorage();
    renderNotesList();
    renderNote();
}

// Delete the current note
function deleteNote() {
    if (currentNoteId) {
        notes = notes.filter(n => n.id !== currentNoteId);
        currentNoteId = null;
        document.getElementById('noteInput').value = '';
        renderNote();
        saveNotesToStorage();
        renderNotesList();
    }
}

// Clear the current note
function clearNote() {
    document.getElementById('noteInput').value = '';
    renderNote();
}

// Export the current note to .txt format
function exportNoteTxt() {
    const noteContent = document.getElementById('noteInput').value;
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
    const noteContent = document.getElementById('noteInput').value;
    const blob = new Blob([noteContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'note.md';
    a.click();
    URL.revokeObjectURL(url);
}

// Render markdown preview
function renderNote() {
    const noteInput = document.getElementById('noteInput').value;
    const renderedNote = document.getElementById('renderedNote');
    renderedNote.innerHTML = markdownToHtml(noteInput);
}

// Create a new note
function createNewNote() {
    currentNoteId = null;
    document.getElementById('noteInput').value = '';
    renderNote();
}

// Markdown conversion
function markdownToHtml(markdownText) {
    return markdownText
        //Discord-style spoilers (||spoiler||)    
        .replace(/\|\|([^|]+)\|\|/g, '<span class="spoiler">$1</span>')

        // Handle HTML-style spoilers (<spoiler></spoiler>)
        .replace(/<spoiler>(.*?)<\/spoiler>/g, '<span class="spoiler">$1</span>')   
        // Headings
        .replace(/^######\s?(.*)$/gm, '<h6>$1</h6>')
        .replace(/^#####\s?(.*)$/gm, '<h5>$1</h5>')
        .replace(/^####\s?(.*)$/gm, '<h4>$1</h4>')
        .replace(/^###\s?(.*)$/gm, '<h3>$1</h3>')
        .replace(/^##\s?(.*)$/gm, '<h2>$1</h2>')
        .replace(/^#\s?(.*)$/gm, '<h1>$1</h1>')

        // Bold and Italics
        .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>') // Bold + Italic
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')             // Bold
        .replace(/\*(.*?)\*/g, '<em>$1</em>')                        // Italic
        .replace(/__(.*?)__/g, '<strong>$1</strong>')                // Bold (alt)
        .replace(/_(.*?)_/g, '<em>$1</em>')                          // Italic (alt)

        // Strikethrough
        .replace(/~~(.*?)~~/g, '<del>$1</del>')

        // Inline code
        .replace(/`([^`]+)`/g, '<code>$1</code>')

        // Code block
        .replace(/```([\s\S]+?)```/g, '<pre><code>$1</code></pre>')

        // Blockquote
        .replace(/^>\s?(.*)$/gm, '<blockquote>$1</blockquote>')

        // Ordered list
        .replace(/^\d+\.\s+(.*)$/gm, '<ol><li>$1</li></ol>')
        .replace(/<\/ol>\s*<ol>/g, '') // Merge consecutive lists

        // Unordered list
        .replace(/^[-*+]\s+(.*)$/gm, '<ul><li>$1</li></ul>')
        .replace(/<\/ul>\s*<ul>/g, '') // Merge consecutive lists

        // Links
        .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank">$1</a>')

        // Images
        .replace(/!\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<img src="$2" alt="$1" />')

        // Custom password tag parsing
        // Custom password tag parsing with hover to reveal
        .replace(/<password>(.*?)<\/password>/g, (match, content) => {
            return `
                <span class="password-content">${content}</span>
            `;
        })

        // Paragraphs for loose text (add missing new lines between blocks of text)
        .replace(/^(?!<[^>]+>|\s*[\-\*\+]\s|\d+\.\s|#|>|\s*$)(.+)$/gm, '<p>$1</p>');
}
// Handle file input for opening .txt and .md files
function openFile(file) {
    const reader = new FileReader();
    reader.onload = function(event) {
        const fileContent = event.target.result;
        document.getElementById('noteInput').value = fileContent;  // Set content in textarea
        renderNote();  // Update preview
    };
    reader.readAsText(file);
}

// Handle file input button click
document.getElementById('openFileButton').addEventListener('click', function() {
    document.getElementById('fileInput').click();
});

// Event listener for file input change
document.getElementById('fileInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        openFile(file);
    }
});

// Password toggle functionality
document.body.addEventListener('click', function(event) {
    if (event.target.classList.contains('show-password')) {
        const passwordContent = event.target.nextElementSibling;
        if (passwordContent.style.display === 'none') {
            passwordContent.style.display = 'block';
            event.target.textContent = 'Hide Password';
        } else {
            passwordContent.style.display = 'none';
            event.target.textContent = 'Show Password';
        }
    }
});

// Add this function to your existing code

function filterNotes() {

    const searchQuery = document.getElementById('searchInput').value.toLowerCase().trim();

    

    // If search query is empty, render all notes

    if (searchQuery === '') {

        renderNotesList();

        return;

    }


    // Filter notes based on search query

    const filteredNotes = notes.filter(note => {

        // Check if search query matches title or content

        const titleMatch = note.title && note.title.toLowerCase().includes(searchQuery);

        const contentMatch = note.content.toLowerCase().includes(searchQuery);

        

        return titleMatch || contentMatch;

    });


    // Render the filtered notes list

    const notesList = document.getElementById('notesList');

    notesList.innerHTML = '';

    filteredNotes.forEach(note => {

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


// Add event listener for search input

document.addEventListener('DOMContentLoaded', function() {

    const searchInput = document.getElementById('searchInput');

    if (searchInput) {

        searchInput.addEventListener('input', filterNotes);

    }

});


// Dark Mode Toggle
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode ? 'enabled' : 'disabled');
}

// Initialize Dark Mode from localStorage
function initializeDarkMode() {
    const darkModeSetting = localStorage.getItem('darkMode');
    if (darkModeSetting === 'enabled') {
        document.body.classList.add('dark-mode');
    }
}

// Event listener for dark mode toggle
document.addEventListener('DOMContentLoaded', function () {
    initializeDarkMode();
    const darkModeToggleButton = document.getElementById('darkModeToggle');
    if (darkModeToggleButton) {
        darkModeToggleButton.addEventListener('click', toggleDarkMode);
    }
});

// Event listeners
document.getElementById('saveButton').addEventListener('click', saveNote);
document.getElementById('deleteButton').addEventListener('click', deleteNote);
document.getElementById('clearButton').addEventListener('click', clearNote);
document.getElementById('txtButton').addEventListener('click', exportNoteTxt);
document.getElementById('mdButton').addEventListener('click', exportNoteMd);
document.getElementById('newNoteButton').addEventListener('click', createNewNote);
document.getElementById('noteInput').addEventListener('input', renderNote);
document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);

// Initial render
window.onload = function () {
    initializeDarkMode();
    renderNotesList();
    renderNote();
};
