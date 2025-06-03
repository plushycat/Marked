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
    const saveModalMessage = document.getElementById('saveOptionsMessage');
    const saveModalCancelBtn = document.getElementById('saveAsNewBtn');
    const saveModalSaveBtn = document.getElementById('saveUpdateBtn');

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

// Store current confirm action for the event handlers
let currentConfirmAction = null;
let currentSaveAction = null;
let currentSaveAsNewAction = null;

function hideConfirmModal() {
    const confirmCheckbox = document.getElementById('confirmModalCheckbox');
    if (confirmCheckbox) {
        confirmCheckbox.checked = false;
    }
}

function hideHelpModal() {
    const helpCheckbox = document.getElementById('helpModalCheckbox');
    if (helpCheckbox) {
        helpCheckbox.checked = false;
    }
}

function showHelpModal() {
    const helpCheckbox = document.getElementById('helpModalCheckbox');
    if (helpCheckbox) {
        helpCheckbox.checked = true;
        // Update the help preview when shown
        updateHelpModalPreview();
    }
}

function hideSaveOptionsModal() {
    const saveOptionsCheckbox = document.getElementById('saveOptionsModalCheckbox');
    if (saveOptionsCheckbox) {
        saveOptionsCheckbox.checked = false;
    }
}

function handleConfirmAction() {
    console.log('Confirm action clicked');
    hideConfirmModal();
    if (typeof currentConfirmAction === 'function') {
        currentConfirmAction();
        currentConfirmAction = null;
    }
}

function handleSaveUpdate() {
    console.log('Save update clicked');
    hideSaveOptionsModal();
    if (typeof currentSaveAction === 'function') {
        currentSaveAction();
        currentSaveAction = null;
    }
}

function handleSaveAsNew() {
    console.log('Save as new clicked');
    hideSaveOptionsModal();
    if (typeof currentSaveAsNewAction === 'function') {
        currentSaveAsNewAction();
        currentSaveAsNewAction = null;
    }
}

// Enhanced showConfirmModal that stores the action
function showConfirmModalWithAction(message, onConfirm) {
    currentConfirmAction = onConfirm;
    showConfirmModal(message, null); // Don't pass the action directly
}

// Enhanced showSaveOptionsModal that stores the actions
function showSaveOptionsModalWithActions(message, onSave, onSaveAsNew) {
    console.log('Showing save options modal:', message);
    currentSaveAction = onSave;
    currentSaveAsNewAction = onSaveAsNew;
    
    const saveOptionsCheckbox = document.getElementById('saveOptionsModalCheckbox');
    const saveModalMessage = document.getElementById('saveOptionsMessage');

    if (!saveOptionsCheckbox || !saveModalMessage) {
        console.error('Save options modal elements not found');
        return;
    }

    saveOptionsCheckbox.checked = true;
    saveModalMessage.textContent = message;
}

// Dynamically render the Markdown Help preview
function updateHelpModalPreview() {
    console.log('Updating help modal preview...');
    const example = document.getElementById('helpMarkdownExample');
    const preview = document.getElementById('helpMarkdownPreview');
    if (example && preview && window.markdown) {
        const markdownText = example.textContent.trim();
        console.log('Converting markdown:', markdownText);
        preview.innerHTML = window.markdown.markdownToHtml(markdownText);
        console.log('Help preview updated');
    } else {
        console.error('Help modal elements missing:', {
            example: !!example,
            preview: !!preview,
            markdown: !!window.markdown
        });
    }
}

// Export for use by other modules
window.modals = {
    showConfirmModal: showConfirmModalWithAction,
    showSaveOptionsModal: showSaveOptionsModalWithActions,
    updateHelpModalPreview,
    hideConfirmModal,
    hideHelpModal,
    showHelpModal,
    hideSaveOptionsModal,
    handleConfirmAction,
    handleSaveUpdate,
    handleSaveAsNew
};

console.log('✅ Modals module loaded and exported to window');