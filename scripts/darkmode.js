// Dark mode functionality

// Dark Mode Toggle
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode ? 'enabled' : 'disabled');
    
    // Update the button icon
    updateDarkModeButtonIcon(isDarkMode);
    
    // Update editor theme if editor is available
    if (window.editor && window.editor.markdownEditor() && window.editor.markdownEditor().updateTheme) {
        window.editor.markdownEditor().updateTheme();
    }
}

// Update the button icon
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

// Initialize dark mode on page load
function initializeDarkMode() {
    const darkModeSetting = localStorage.getItem('darkMode');
    const isDarkMode = darkModeSetting === 'enabled';
    
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
    }
    
    // Set the correct icon on page load
    updateDarkModeButtonIcon(isDarkMode);
}

// Export for use by other modules
window.darkMode = {
    toggleDarkMode,
    updateDarkModeButtonIcon,
    initializeDarkMode
};