// Notes list rendering and filtering
// Render the list of notes
function renderNotesList() {
    const notesList = document.getElementById('notesList');
    notesList.innerHTML = '';
    window.storage.notes.forEach(note => {
        const noteItem = document.createElement('div');
        noteItem.className = 'note-item';
        noteItem.textContent = note.title || note.content.split('\n')[0] || 'Untitled Note';
        noteItem.dataset.id = note.id;

        // Add timestamp to the note item
        const timestamp = document.createElement('span');
        timestamp.className = 'note-timestamp';
        timestamp.textContent = new Date(note.timestamp).toISOString();
        noteItem.appendChild(timestamp);

        noteItem.addEventListener('click', () => window.editor.loadNoteById(note.id));
        notesList.appendChild(noteItem);
    });
}

// Filter notes function
function filterNotes() {
    const searchQuery = document.getElementById('searchInput').value.toLowerCase().trim();
    
    if (searchQuery === '') {
        renderNotesList();
        return;
    }
    
    const filteredNotes = window.storage.notes.filter(note => {
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
        
        noteItem.addEventListener('click', () => window.editor.loadNoteById(note.id));
        notesList.appendChild(noteItem);
    });
}

// Export for use by other modules
window.notesList = {
    renderNotesList,
    filterNotes
};