import {
    handleEditButtonClick,
    handleSaveButtonClick,
    handleCancelButtonClick,
  } from './base_functions.js';
  
  document.addEventListener('DOMContentLoaded', () => {
    // Initialize event listeners for edit, save, and cancel buttons
    const editButton = document.querySelector('.edit-user-input');
    const saveButton = document.querySelector('.save-user-input');
    const cancelButton = document.querySelector('.cancel-user-input');
  
    if (editButton && saveButton && cancelButton) {
      editButton.addEventListener('click', handleEditButtonClick);
      saveButton.addEventListener('click', handleSaveButtonClick);
      cancelButton.addEventListener('click', handleCancelButtonClick);
    } else {
      console.error('Required elements not found.');
    }
  });