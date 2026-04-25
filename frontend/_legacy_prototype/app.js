document.addEventListener('DOMContentLoaded', () => {
    const nextButton = document.getElementById('nextButton');
    const inputField = document.getElementById('lastWorkDate');
    const chatArea = document.getElementById('chatArea');
    const progressComplete = document.querySelector('.progress-segment.complete');
    const progressPartial = document.querySelector('.progress-segment.partial');
    const progressUnanswered = document.querySelector('.progress-segment.unanswered');
    const progressText = document.querySelector('.progress-text');
    const avatarPulse = document.querySelector('.avatar-pulse');
    const voiceBtn = document.getElementById('voiceBtn');
    const menuBtn = document.getElementById('menuBtn');
    const sideDrawer = document.getElementById('sideDrawer');
    const drawerOverlay = document.getElementById('drawerOverlay');
    let isRecording = false;
    let recordingTimeout;

    // Drawer Logic
    function toggleDrawer() {
        sideDrawer.classList.toggle('open');
        drawerOverlay.classList.toggle('active');
    }

    menuBtn.addEventListener('click', toggleDrawer);
    drawerOverlay.addEventListener('click', toggleDrawer);

    // Automatically focus the input field on load for momentum
    inputField.focus();

    // Handle Voice button
    voiceBtn.addEventListener('click', () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    });

    function startRecording() {
        isRecording = true;
        voiceBtn.classList.add('recording');
        inputField.placeholder = 'Listening...';
        inputField.value = '';
        
        // Haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }

        // Simulate recording ending after a few seconds
        recordingTimeout = setTimeout(() => {
            stopRecording("March 2023"); // Simulated spoken text
        }, 3000);
    }

    function stopRecording(simulatedText) {
        clearTimeout(recordingTimeout);
        isRecording = false;
        voiceBtn.classList.remove('recording');
        inputField.placeholder = 'e.g. March 2023';
        
        if (simulatedText) {
            inputField.value = simulatedText;
            nextButton.disabled = false;
            handleSubmit();
        }
    }

    // Handle input to enable/disable Next button
    inputField.addEventListener('input', () => {
        nextButton.disabled = inputField.value.trim().length === 0;
    });

    // Handle Next button click
    nextButton.addEventListener('click', handleSubmit);
    
    // Handle Enter key
    inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !nextButton.disabled) {
            handleSubmit();
        }
    });

    function handleSubmit() {
        const val = inputField.value.trim();
        if (!val) return;

        // Clear error if present
        inputField.classList.remove('error');

        // Add user message to chat
        appendUserMessage(val);
        inputField.value = '';

        // Simulate successful capture haptic feedback (light double tap)
        if (navigator.vibrate) {
            navigator.vibrate([50, 50, 50]);
        }

        // Update progress bar
        updateProgress(40, 20, 40);

        // Simulate agent processing
        simulateAgentProcessing();
    }

    function appendUserMessage(text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message user-message';
        msgDiv.innerHTML = `
            <div class="message-bubble">${escapeHtml(text)}</div>
        `;
        chatArea.appendChild(msgDiv);
        scrollToBottom();
    }

    function appendAgentMessage(text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message agent-message';
        msgDiv.innerHTML = `
            <div class="avatar-container">
                <img src="https://ui-avatars.com/api/?name=Agent&background=003366&color=fff&rounded=true" alt="Agent Avatar" class="avatar">
            </div>
            <div class="message-bubble">${escapeHtml(text)}</div>
        `;
        chatArea.appendChild(msgDiv);
        scrollToBottom();
    }

    function simulateAgentProcessing() {
        // Show pulse animation on the last agent avatar to simulate "Listening/Analyzing"
        avatarPulse.style.animation = 'pulse 1s infinite cubic-bezier(0.4, 0, 0.2, 1)';
        
        // Simulate network delay
        setTimeout(() => {
            avatarPulse.style.animation = 'none'; // Stop pulsing
            appendAgentMessage('Got it. I have updated Section 4 with this date. Now, let\'s move to Section 5: Medical Conditions. What is the primary medical condition preventing you from working?');
            
            // Update input label and focus
            document.querySelector('.persistent-label').textContent = 'Primary Medical Condition';
            inputField.placeholder = 'e.g. Severe back pain';
            inputField.focus();

        }, 1500);
    }

    function updateProgress(complete, partial, unanswered) {
        progressComplete.style.width = `${complete}%`;
        progressPartial.style.width = `${partial}%`;
        progressUnanswered.style.width = `${unanswered}%`;
        progressText.textContent = `${complete}% Complete`;
    }

    function scrollToBottom() {
        chatArea.scrollTop = chatArea.scrollHeight;
    }

    // Utility to prevent XSS in prototype
    function escapeHtml(unsafe) {
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }
});
