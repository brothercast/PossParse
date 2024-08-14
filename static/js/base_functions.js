export function applyTextillateEffect(elements, delayScale = 1.5, delayOffset = 0, fadeEffect = false) {  
  const baseDelay = 30;  
  const animationDuration = 1000; // Set the animation duration to 1000 milliseconds (1 second)  
  Array.from(elements).forEach((element, index) => {  
    const elementDelay = baseDelay + index * delayOffset;  
    if (fadeEffect) {  
      $(element).fadeIn(animationDuration - (index - 1) * elementDelay);  
    } else {  
      $(element).textillate({  
        in: {  
          effect: 'flipInY',  
          delayScale: delayScale,  
          delay: elementDelay,  
          sync: false,  
          shuffle: false,  
          reverse: false,  
          duration: animationDuration, // Set the animation duration  
        },  
        out: {  
          effect: 'flipOutY',  
          delayScale: delayScale,  
          delay: elementDelay,  
          sync: false,  
          shuffle: false,  
          reverse: false,  
          duration: animationDuration, // Set the animation duration  
        },  
        loop: true,  
      });  
    }  
  });  
}  
  
export function handleEditButtonClick() {  
  const userInputCell = document.querySelector('.user-input');  
  const editButton = document.querySelector('.edit-user-input');  
  const saveButton = document.querySelector('.save-user-input');  
  const cancelButton = document.querySelector('.cancel-user-input');  
  if (userInputCell && editButton && saveButton && cancelButton) {  
    userInputCell.setAttribute('contenteditable', 'true');  
    userInputCell.focus();  
    editButton.classList.add('d-none');  
    saveButton.classList.remove('d-none');  
    cancelButton.classList.remove('d-none');  
  } else {  
    console.error("Required elements not found.");  
  }  
}  
  
export function handleSaveButtonClick(callback) {  
  const userInputCell = document.querySelector('.user-input');  
  const editButton = document.querySelector('.edit-user-input');  
  const saveButton = document.querySelector('.save-user-input');  
  const cancelButton = document.querySelector('.cancel-user-input');  
  if (userInputCell && editButton && saveButton && cancelButton) {  
    userInputCell.setAttribute('contenteditable', 'false');  
    editButton.classList.remove('d-none');  
    saveButton.classList.add('d-none');  
    cancelButton.classList.add('d-none');  
    if (typeof callback === 'function') {  
      callback(userInputCell.textContent.trim());  
    }  
  } else {  
    console.error("Required elements not found.");  
  }  
}  
  
export function handleCancelButtonClick() {  
  const userInputCell = document.querySelector('.user-input');  
  const editButton = document.querySelector('.edit-user-input');  
  const saveButton = document.querySelector('.save-user-input');  
  const cancelButton = document.querySelector('.cancel-user-input');  
  if (userInputCell && editButton && saveButton && cancelButton) {  
    userInputCell.setAttribute('contenteditable', 'false');  
    editButton.classList.remove('d-none');  
    saveButton.classList.add('d-none');  
    cancelButton.classList.add('d-none');  
  } else {  
    console.error("Required elements not found.");  
  }  
}  
  
export async function regenerateGoals(user_input) {  
  showLoadingSpinner('Speculating New Outcomes...');  
  try {  
    const response = await fetch('/goal_selection', {  
      method: 'POST',  
      headers: {  
        'Content-Type': 'application/x-www-form-urlencoded',  
        'X-Requested-With': 'XMLHttpRequest',  
      },  
      body: new URLSearchParams({ user_text: user_input }),  
    });  
    if (response.ok) {  
      const data = await response.json();  
      updateGoalCards(data, user_input); // Pass user_input to updateGoalCards  
      hideLoadingSpinner();  
    } else {  
      throw new Error('Failed to fetch new goals');  
    }  
  } catch (error) {  
    console.error('Error:', error);  
    hideLoadingSpinner();  
  }  
}  
  
export function initializeEventListeners() {  
  const editButton = document.querySelector('.edit-user-input');  
  const saveButton = document.querySelector('.save-user-input');  
  const cancelButton = document.querySelector('.cancel-user-input');  
  const speculateButton = document.getElementById('generate-new-goals');  
  if (editButton) {  
    editButton.addEventListener('click', handleEditButtonClick);  
  } else {  
    console.error("editUserInput element not found.");  
  }  
  if (saveButton) {  
    saveButton.addEventListener('click', () => {  
      handleSaveButtonClick((user_input) => {  
        regenerateGoals(user_input);  
      });  
    });  
  } else {  
    console.error("saveButton element not found.");  
  }  
  if (cancelButton) {  
    cancelButton.addEventListener('click', handleCancelButtonClick);  
  } else {  
    console.error('cancelButton element not found.');  
  }  
  if (speculateButton) {  
    speculateButton.addEventListener('click', () => {  
      const userInputCell = document.querySelector('.user-input');  
      const user_input = userInputCell.textContent.trim();  
      regenerateGoals(user_input);  
    });  
  } else {  
    console.error("generateNewGoalsButton element not found.");  
  }  
  // Apply the animation effect after the cards are updated  
  const goalCardsContainer = document.querySelector('.card-container');  
  if (goalCardsContainer) {  
    const domainElements = goalCardsContainer.querySelectorAll('.domain');  
    const titleElements = goalCardsContainer.querySelectorAll('.card-title');  
    applyTextillateEffect(titleElements, 1.5, 0);  
    // Trigger the animations after a delay to ensure smooth execution  
    setTimeout(() => {  
      domainElements.forEach((element) => {  
        $(element).fadeIn(1000);  
      });  
      titleElements.forEach((element) => {  
        $(element).textillate('start');  
      });  
    }, 1000); // Delay the animation trigger by 1 second  
  } else {  
    console.error('goalCardsContainer element not found.');  
  }  
}  
  
export function updateGoalCards(data, userInputCell) {  
  const goalCardsContainer = document.querySelector('.card-container');  
  if (goalCardsContainer) {  
    goalCardsContainer.innerHTML = '';  
    data.goals.forEach((goal) => {  
      const card = document.createElement('div');  
      card.className = `card retro-futuristic-card text-center mb-4 ${goal.compliant ? '' : 'non-compliant'}`;  
      const cardBody = document.createElement('div');  
      cardBody.className = 'card-body card-content';  
      const icon = document.createElement('i');  
      icon.className = `${goal.icon} fa-2x mb-3`;  
      cardBody.appendChild(icon);  
      const domain = document.createElement('p');  
      domain.className = 'domain domain-text';  
      domain.textContent = goal.domain;  
      cardBody.appendChild(domain);  
      const title = document.createElement('h5');  
      title.className = 'card-title';  
      title.dataset.text = goal.title;  
      title.innerHTML = goal.title;  
      cardBody.appendChild(title);  
      if (goal.compliant) {  
        const form = document.createElement('form');  
        form.action = '/outcome';  
        form.method = 'post';  
        form.className = 'goal-selection-form';  
        const inputSelectedGoal = document.createElement('input');  
        inputSelectedGoal.type = 'hidden';  
        inputSelectedGoal.name = 'selected_goal';  
        inputSelectedGoal.value = goal.title;  
        form.appendChild(inputSelectedGoal);  
        const inputDomain = document.createElement('input');  
        inputDomain.type = 'hidden';  
        inputDomain.name = 'domain';  
        inputDomain.value = goal.domain;  
        form.appendChild(inputDomain);  
        const inputDomainIcon = document.createElement('input');  
        inputDomainIcon.type = 'hidden';  
        inputDomainIcon.name = 'domain_icon';  
        inputDomainIcon.value = goal.icon;  
        form.appendChild(inputDomainIcon);  
        const inputUserText = document.createElement('input');  
        inputUserText.type = 'hidden';  
        inputUserText.name = 'user_text';  
        inputUserText.value = userInputCell.textContent.trim();  
        form.appendChild(inputUserText);  
        const submitButton = document.createElement('button');  
        submitButton.type = 'submit';  
        submitButton.className = 'btn btn-primary';  
        submitButton.textContent = 'Select';  
        form.appendChild(submitButton);  
        cardBody.appendChild(form);  
      } else {  
        const startOverButton = document.createElement('button');  
        startOverButton.type = 'button';  
        startOverButton.className = 'btn btn-danger';  
        startOverButton.textContent = 'Start Over';  
        startOverButton.onclick = () => {  
          window.location.href = '/';  
        };  
        cardBody.appendChild(startOverButton);  
      }  
      card.appendChild(cardBody);  
      goalCardsContainer.appendChild(card);  
    });  
  }  
}  
  
console.log("base_functions.js has been loaded");  
  
export function showLoadingSpinner(message = 'Speculating Structured Solution...') {  
  console.log("showLoadingSpinner called with message:", message);  
  const spinner = document.getElementById('loading-spinner');  
  const spinnerText = document.getElementById('spinner-text');  
  if (spinner && spinnerText) {  
    spinnerText.textContent = message;  
    spinner.classList.remove('d-none');  
    spinner.classList.add('fade-in');  
  }  
}  
  
export function hideLoadingSpinner() {  
  console.log("hideLoadingSpinner called");  
  const spinner = document.getElementById('loading-spinner');  
  if (spinner) {  
    spinner.classList.add('d-none');  
    spinner.classList.remove('fade-in');  
  }  
}  