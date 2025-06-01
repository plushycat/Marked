// Modal functionality
function showConfirmModal(message, onConfirm) {
    // Show the modal
    const confirmCheckbox = document.getElementById('confirmModalCheckbox');
    const modalMessage = document.getElementById('modalMessage');
    const modalCancelBtn = document.getElementById('modalCancelBtn');
    const modalConfirmBtn = document.getElementById('modalConfirmBtn');

    if (!confirmCheckbox || !modalMessage || !modalCancelBtn || !modalConfirmBtn) return;

    confirmCheckbox.checked = true;
    modalMessage.textContent = message;

    // Remove previous listeners to avoid stacking
    modalCancelBtn.onclick = function() {
        confirmCheckbox.checked = false;
    };
    modalConfirmBtn.onclick = function() {
        confirmCheckbox.checked = false;
        if (typeof onConfirm === 'function') onConfirm();
    };
}

function showSaveOptionsModal(message, onSave, onCancel) {
    const saveOptionsCheckbox = document.getElementById('saveOptionsModalCheckbox');
    const saveModalMessage = document.getElementById('saveOptionsMessage'); // FIXED
    const saveModalCancelBtn = document.getElementById('saveAsNewBtn');     // FIXED
    const saveModalSaveBtn = document.getElementById('saveUpdateBtn');      // FIXED

    if (!saveOptionsCheckbox || !saveModalMessage || !saveModalCancelBtn || !saveModalSaveBtn) return;

    saveOptionsCheckbox.checked = true;
    saveModalMessage.textContent = message;

    saveModalCancelBtn.onclick = function() {
        saveOptionsCheckbox.checked = false;
        if (typeof onCancel === 'function') onCancel();
    };
    saveModalSaveBtn.onclick = function() {
        saveOptionsCheckbox.checked = false;
        if (typeof onSave === 'function') onSave();
    };
}

// Dynamically render the Markdown Help preview
function updateHelpModalPreview() {
    const example = document.getElementById('helpMarkdownExample');
    const preview = document.getElementById('helpMarkdownPreview');
    if (example && preview) {
        preview.innerHTML = window.markdown.markdownToHtml(example.textContent.trim());
    }
}

// Export for use by other modules
window.modals = {
    showConfirmModal,
    showSaveOptionsModal,
    updateHelpModalPreview
};