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

        // Add timestamp to the note item - local timezone format
        const timestamp = document.createElement('span');
        timestamp.className = 'note-timestamp';
        const date = new Date(note.timestamp);
        // Format: YYYY-MM-DD-T:HH:mm:ss in local timezone
        const localTimeString = date.getFullYear() + '-' + 
            String(date.getMonth() + 1).padStart(2, '0') + '-' + 
            String(date.getDate()).padStart(2, '0') + '-T:' + 
            String(date.getHours()).padStart(2, '0') + ':' + 
            String(date.getMinutes()).padStart(2, '0') + ':' + 
            String(date.getSeconds()).padStart(2, '0');
        timestamp.textContent = localTimeString;
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
        const date = new Date(note.timestamp);
        // Format: YYYY-MM-DD-T:HH:mm:ss in local timezone
        const localTimeString = date.getFullYear() + '-' + 
            String(date.getMonth() + 1).padStart(2, '0') + '-' + 
            String(date.getDate()).padStart(2, '0') + '-T:' + 
            String(date.getHours()).padStart(2, '0') + ':' + 
            String(date.getMinutes()).padStart(2, '0') + ':' + 
            String(date.getSeconds()).padStart(2, '0');
        timestamp.textContent = localTimeString;
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