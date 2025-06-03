// Notes list rendering and filtering

// Helper function to safely get notes
function getNotes() {
    if (window.storage && window.storage.notes) {
        return window.storage.notes;
    }
    return [];
}

// Render the list of notes
function renderNotesList() {
    const notesList = document.getElementById('notesList');
    if (!notesList) return;
    
    const notes = getNotes();
    notesList.innerHTML = '';
    
    // Sort notes by timestamp (newest first)
    const sortedNotes = notes.sort((a, b) => b.timestamp - a.timestamp);
    
    sortedNotes.forEach(note => {
        const noteItem = document.createElement('div');
        noteItem.className = 'note-item';
        noteItem.textContent = note.title || note.content.split('\n')[0] || 'Untitled Note';
        noteItem.dataset.id = note.id;

        // Add timestamp
        const timestamp = document.createElement('span');
        timestamp.className = 'note-timestamp';
        const date = new Date(note.timestamp);
        const localTimeString = date.getFullYear() + '-' +
            String(date.getMonth() + 1).padStart(2, '0') + '-' +
            String(date.getDate()).padStart(2, '0') + '-T:' +
            String(date.getHours()).padStart(2, '0') + ':' +
            String(date.getMinutes()).padStart(2, '0') + ':' +
            String(date.getSeconds()).padStart(2, '0');
        timestamp.textContent = localTimeString;
        noteItem.appendChild(timestamp);        noteItem.addEventListener('click', () => {
            if (window.editor && window.editor.loadNoteById) {
                window.editor.loadNoteById(note.id);
                // Also immediately update the highlight
                if (window.notesList && window.notesList.updateSidebarSelectionHighlight) {
                    window.notesList.updateSidebarSelectionHighlight(note.id);
                }
            }
        });
        notesList.appendChild(noteItem);
    });    // After rendering, update highlight for the current note
    if (window.editor && window.editor.getCurrentNoteId && window.notesList && window.notesList.updateSidebarSelectionHighlight) {
        const currentNoteId = window.editor.getCurrentNoteId();
        if (currentNoteId) {
            window.notesList.updateSidebarSelectionHighlight(currentNoteId);
        }
    }
}

// Filter notes function
function filterNotes() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    const searchQuery = searchInput.value.toLowerCase().trim();
    
    if (searchQuery === '') {
        renderNotesList();
        return;
    }
    
    const notes = getNotes();
    
    const filteredNotes = notes.filter(note => {
        const titleMatch = note.title && note.title.toLowerCase().includes(searchQuery);
        const contentMatch = note.content.toLowerCase().includes(searchQuery);
        return titleMatch || contentMatch;
    });
    
    const notesList = document.getElementById('notesList');
    if (!notesList) return;
    
    notesList.innerHTML = '';
    filteredNotes.forEach(note => {
        const noteItem = document.createElement('div');
        noteItem.className = 'note-item';
        noteItem.textContent = note.title || note.content.split('\n')[0] || 'Untitled Note';
        noteItem.dataset.id = note.id;
        
        // Add timestamp
        const timestamp = document.createElement('span');
        timestamp.className = 'note-timestamp';
        const date = new Date(note.timestamp);
        const localTimeString = date.getFullYear() + '-' + 
            String(date.getMonth() + 1).padStart(2, '0') + '-' + 
            String(date.getDate()).padStart(2, '0') + '-T:' + 
            String(date.getHours()).padStart(2, '0') + ':' + 
            String(date.getMinutes()).padStart(2, '0') + ':' + 
            String(date.getSeconds()).padStart(2, '0');
        timestamp.textContent = localTimeString;
        noteItem.appendChild(timestamp);        noteItem.addEventListener('click', () => {
            if (window.editor && window.editor.loadNoteById) {
                window.editor.loadNoteById(note.id);
                // Also immediately update the highlight
                if (window.notesList && window.notesList.updateSidebarSelectionHighlight) {
                    window.notesList.updateSidebarSelectionHighlight(note.id);
                }
            }
        });
        notesList.appendChild(noteItem);
    });
    
    // After filtering, restore the selection highlight if there's an active note
    if (window.editor && window.editor.getCurrentNoteId && window.notesList && window.notesList.updateSidebarSelectionHighlight) {
        const currentNoteId = window.editor.getCurrentNoteId();
        if (currentNoteId) {
            window.notesList.updateSidebarSelectionHighlight(currentNoteId);
        }
    }
}

// Update notes list (for Firestore real-time updates)
function updateNotesList() {
    renderNotesList();
}

// Update sidebar selection highlight
function updateSidebarSelectionHighlight(selectedNoteId) {
    // Remove 'selected' from all note items
    document.querySelectorAll('.note-item.selected').forEach(el => el.classList.remove('selected'));
    
    // Add 'selected' to the currently selected note
    if (selectedNoteId) {
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
            const selected = document.querySelector(`.note-item[data-id="${selectedNoteId}"]`);
            if (selected) {
                selected.classList.add('selected');
                console.log(`✅ Highlighted note with ID: ${selectedNoteId}`);
            } else {
                console.log(`⚠️ Could not find note element with ID: ${selectedNoteId}`);
            }
        }, 10);
    }
}

window.notesList = {
    renderNotesList: renderNotesList,
    filterNotes: filterNotes,
    updateNotesList: updateNotesList,
    updateSidebarSelectionHighlight: updateSidebarSelectionHighlight
};

console.log('✅ NotesList module loaded and exported to window');