class VoiceConversation {
    constructor() {
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isListening = false;
        this.isSpeaking = false;
        this.conversationHistory = [];
        this.livekit = null;
        this.audioStream = null;
        
        this.initializeElements();
        this.initializeCamera();
        // Skip LiveKit initialization for now
        // this.initializeLiveKit();
        this.initializeSpeechRecognition();
        this.initializeEventListeners();
        this.loadVoices();
        this.setupSettings();
        
        // Automatically start microphone listening when page loads
        this.autoStartListening();
        
        // Test speech synthesis on load
        setTimeout(() => {
            console.log('Testing speech synthesis...');
            this.speakText('Hello! Speech synthesis is working.');
        }, 2000);
    }

    initializeElements() {
        this.conversationArea = document.getElementById('conversationArea');
        this.textInput = document.getElementById('textInput');
        this.voiceButton = document.getElementById('voiceButton');
        this.sendButton = document.getElementById('sendButton');
        this.clearButton = document.getElementById('clearButton');
        this.settingsButton = document.getElementById('settingsButton');
        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusText = document.getElementById('statusText');
        this.settingsModal = document.getElementById('settingsModal');
        this.closeSettings = document.getElementById('closeSettings');
        this.voiceSelect = document.getElementById('voiceSelect');
        this.speechRate = document.getElementById('speechRate');
        this.speechPitch = document.getElementById('speechPitch');
        this.rateValue = document.getElementById('rateValue');
        this.pitchValue = document.getElementById('pitchValue');
        this.webcam = document.getElementById('webcam');
        this.canvas = document.getElementById('canvas');
        this.captureButton = document.getElementById('captureButton');
        this.ocrStatus = document.getElementById('ocrStatus');
        this.currentPageText = ''; // Store current page text for questions
    }

    // LiveKit initialization disabled for testing
    async initializeLiveKit() {
        console.log('LiveKit initialization skipped for testing');
        return;
    }

    async initializeCamera() {
        try {
            // Get webcam access
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 640, height: 480 } 
            });
            this.webcam.srcObject = stream;
            
            // Add capture button listener
            this.captureButton.addEventListener('click', () => this.captureAndReadPage());
            
            this.updateOcrStatus('Ready to read and analyze books! Position a page in the camera and say "read this page".', 'ready');
            
        } catch (error) {
            console.error('Camera access denied:', error);
            this.updateOcrStatus('Camera access required for reading books', 'error');
        }
    }

    async captureAndReadPage() {
        this.updateOcrStatus('Reading page...', 'processing');
        this.captureButton.disabled = true;
        
        // Capture image from webcam
        const context = this.canvas.getContext('2d');
        context.drawImage(this.webcam, 0, 0, 640, 480);
        
        // Convert to image data
        const imageData = this.canvas.toDataURL('image/png');
        
        try {
            // Use Tesseract to extract text
            const result = await Tesseract.recognize(imageData, 'eng', {
                logger: m => console.log(m) // Show progress in console
            });
            const extractedText = result.data.text.trim();
            
            if (extractedText.length > 10) {
                this.readBookPage(extractedText);
            } else {
                this.updateOcrStatus('No text found. Try adjusting the book position.', 'error');
                this.speakText('I cannot see any text clearly. Please adjust the book position and try again.');
            }
        } catch (error) {
            console.error('OCR Error:', error);
            this.updateOcrStatus('Error reading page', 'error');
            this.speakText('Sorry, I had trouble reading the page. Please try again.');
        }
        
        this.captureButton.disabled = false;
    }

    async captureAndReadPageWithAI() {
        this.updateOcrStatus('Reading page...', 'processing');
        
        // Capture image from webcam
        const context = this.canvas.getContext('2d');
        context.drawImage(this.webcam, 0, 0, 640, 480);
        
        // Convert to image data
        const imageData = this.canvas.toDataURL('image/png');
        
        try {
            // Use Tesseract to extract text
            const result = await Tesseract.recognize(imageData, 'eng', {
                logger: m => console.log(m) // Show progress in console
            });
            const extractedText = result.data.text.trim();
            
            if (extractedText.length > 10) {
                await this.processBookPageWithAI(extractedText);
            } else {
                this.updateOcrStatus('No text found. Try adjusting the book position.', 'error');
                this.speakText('I cannot see any text clearly. Please adjust the book position and try again.');
            }
        } catch (error) {
            console.error('OCR Error:', error);
            this.updateOcrStatus('Error reading page', 'error');
            this.speakText('Sorry, I had trouble reading the page. Please try again.');
        }
    }

    async processBookPageWithAI(extractedText) {
        this.currentPageText = extractedText; // Store for questions
        this.updateOcrStatus('Processing with AI...', 'processing');
        
        // Add to conversation
        this.addMessage('Reading page from your book...', 'system');
        this.addMessage(extractedText, 'book');
        
        try {
            // Create a prompt for OpenAI to analyze and respond to the book page
            const aiPrompt = `I just read a page from a book that contains the following text: "${extractedText}". 
            
            Please provide a helpful, engaging response that:
            1. Acknowledges what was read
            2. Provides a brief summary or highlights key points
            3. Asks an engaging question to encourage discussion
            4. Uses child-friendly language
            5. Keeps the response conversational and encouraging
            
            Make it sound natural and friendly, as if you're a helpful reading assistant.`;

            // Add the book content to conversation history
            this.conversationHistory.push({ 
                role: 'system', 
                content: `The child just showed me a page from their book that says: "${extractedText}". I should be ready to answer questions about this text in a child-friendly way.` 
            });

            // Generate AI response
            this.updateStatus('AI is analyzing the page...', 'thinking');
            
            const response = await fetch('/api/ai-chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: aiPrompt,
                    conversationHistory: this.conversationHistory
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const aiResponse = data.response;
            
            // Add AI response to conversation
            this.addMessage(aiResponse, 'ai');
            this.conversationHistory.push({ role: 'assistant', content: aiResponse });
            
            // Speak the AI response
            this.speakText(aiResponse);
            
            this.updateOcrStatus('Page processed successfully!', 'success');
            
        } catch (error) {
            console.error('Error processing book page with AI:', error);
            
            // Fallback to simple reading if AI fails
            this.addMessage('I can see the text from your book page. Let me read it to you:', 'ai');
            this.speakText(`Here's what I see on this page: ${extractedText}`);
            this.updateOcrStatus('Page read (AI processing failed)', 'success');
        }
    }

    readBookPage(pageText) {
        this.currentPageText = pageText; // Store for questions
        this.updateOcrStatus('Page read successfully!', 'success');
        
        // Add to conversation
        this.addMessage('Reading page from your book...', 'system');
        this.addMessage(pageText, 'book');
        
        // Read the page aloud with slower, child-friendly pace
        this.speakText(`Here's what I see on this page: ${pageText}`);
        
        // Add context to conversation history for AI
        this.conversationHistory.push({ 
            role: 'system', 
            content: `The child just showed me a page from their book that says: "${pageText}". I should be ready to answer questions about this text in a child-friendly way.` 
        });
    }

    updateOcrStatus(text, type = 'ready') {
        this.ocrStatus.textContent = text;
        this.ocrStatus.className = `ocr-status ${type}`;
    }

    initializeSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';
            
            this.recognition.onstart = () => {
                this.isListening = true;
                this.updateUI();
                this.updateStatus('Listening...', 'listening');
            };
            
            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                this.handleUserInput(transcript);
            };
            
            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                let errorMessage = 'Error: ' + event.error;
                
                // Provide more user-friendly error messages
                if (event.error === 'not-allowed') {
                    errorMessage = 'Microphone permission denied. Please allow microphone access and refresh the page.';
                } else if (event.error === 'no-speech') {
                    errorMessage = 'No speech detected. Try speaking again.';
                } else if (event.error === 'audio-capture') {
                    errorMessage = 'Microphone not available. Please check your microphone connection.';
                } else if (event.error === 'network') {
                    errorMessage = 'Network error. Please check your internet connection.';
                }
                
                this.updateStatus(errorMessage, 'error');
                this.isListening = false;
                this.updateUI();
            };
            
            this.recognition.onend = () => {
                this.isListening = false;
                this.updateUI();
                this.updateStatus('Ready to listen', 'ready');
            };
        } else {
            this.updateStatus('Speech recognition not supported', 'error');
            this.voiceButton.disabled = true;
        }
    }

    initializeEventListeners() {
        this.voiceButton.addEventListener('click', () => this.toggleListening());
        this.sendButton.addEventListener('click', () => this.sendTextMessage());
        this.clearButton.addEventListener('click', () => this.clearConversation());
        this.settingsButton.addEventListener('click', () => this.openSettings());
        this.closeSettings.addEventListener('click', () => this.closeSettingsModal());
        
        this.textInput.addEventListener('input', () => this.updateSendButton());
        this.textInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendTextMessage();
            }
        });

        // Close modal when clicking outside
        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) {
                this.closeSettingsModal();
            }
        });
    }

    loadVoices() {
        const loadVoices = () => {
            const voices = this.synthesis.getVoices();
            console.log('Loading voices, found:', voices.length);
            this.voiceSelect.innerHTML = '<option value="default">Default Voice</option>';
            
            // Preferred voices for more natural sound (in order of preference)
            const preferredVoices = [
                'Microsoft Zira Desktop - English (United States)',
                'Microsoft David Desktop - English (United States)',
                'Google US English',
                'Samantha',
                'Alex',
                'Victoria',
                'Daniel',
                'Karen',
                'Moira',
                'Tessa'
            ];
            
            // Add preferred voices first
            let firstPreferredVoice = null;
            preferredVoices.forEach(preferredName => {
                const voice = voices.find(v => v.name.includes(preferredName));
                if (voice) {
                    const option = document.createElement('option');
                    option.value = voices.indexOf(voice);
                    option.textContent = `★ ${voice.name} (${voice.lang})`;
                    option.style.fontWeight = 'bold';
                    this.voiceSelect.appendChild(option);
                    
                    // Remember the first preferred voice for auto-selection
                    if (!firstPreferredVoice) {
                        firstPreferredVoice = voices.indexOf(voice);
                    }
                }
            });
            
            // Auto-select the first preferred voice if available
            if (firstPreferredVoice !== null) {
                this.voiceSelect.value = firstPreferredVoice;
            }
            
            // Add other English voices
            voices.forEach((voice, index) => {
                if (voice.lang.startsWith('en') && !preferredVoices.some(p => voice.name.includes(p))) {
                    const option = document.createElement('option');
                    option.value = index;
                    option.textContent = `${voice.name} (${voice.lang})`;
                    this.voiceSelect.appendChild(option);
                }
            });
            
            // Add all other voices
            voices.forEach((voice, index) => {
                if (!voice.lang.startsWith('en')) {
                    const option = document.createElement('option');
                    option.value = index;
                    option.textContent = `${voice.name} (${voice.lang})`;
                    this.voiceSelect.appendChild(option);
                }
            });
            
            console.log('Voice loading complete, selected voice:', this.voiceSelect.value);
        };

        // Try to load voices immediately
        if (this.synthesis.getVoices().length > 0) {
            console.log('Voices available immediately');
            loadVoices();
        } else {
            console.log('Waiting for voices to load...');
            this.synthesis.onvoiceschanged = loadVoices;
            
            // Fallback: try loading voices after a delay
            setTimeout(() => {
                if (this.synthesis.getVoices().length > 0) {
                    console.log('Voices loaded after delay');
                    loadVoices();
                }
            }, 1000);
        }
    }

    setupSettings() {
        this.speechRate.addEventListener('input', (e) => {
            this.rateValue.textContent = e.target.value;
        });
        
        this.speechPitch.addEventListener('input', (e) => {
            this.pitchValue.textContent = e.target.value;
        });
    }

    async toggleListening() {
        if (this.isListening) {
            this.recognition.stop();
            // Skip LiveKit for now
            // if (this.livekit) {
            //     await this.livekit.stopAudioStreaming();
            // }
        } else {
            // Skip LiveKit for now
            // if (this.livekit && this.livekit.isConnected) {
            //     const streamingStarted = await this.livekit.startAudioStreaming();
            //     if (!streamingStarted) {
            //         this.updateStatus('Failed to start audio streaming', 'error');
            //         return;
            //     }
            // }
            
            this.recognition.start();
        }
    }

    handleUserInput(text) {
        if (!text.trim()) return;
        
        this.addMessage(text, 'user');
        this.conversationHistory.push({ role: 'user', content: text });
        
        // Check for OCR voice commands first
        if (this.isOCRCommand(text)) {
            this.handleOCRCommand(text);
            return;
        }
        
        // Generate AI response for regular conversation
        this.generateAIResponse(text);
    }

    async generateAIResponse(userInput) {
        try {
            this.updateStatus('AI is thinking...', 'thinking');
            
            console.log('Sending request to API:', { message: userInput });
            
            // Call OpenAI API through our backend
            const response = await fetch('/api/ai-chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: userInput,
                    conversationHistory: this.conversationHistory
                })
            });

            console.log('API Response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json();
                console.error('API Error:', errorData);
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('API Response data:', data);
            const aiResponse = data.response;
            
            this.addMessage(aiResponse, 'ai');
            this.conversationHistory.push({ role: 'assistant', content: aiResponse });
            
            // Speak the response
            this.speakText(aiResponse);
            
        } catch (error) {
            console.error('Error generating AI response:', error);
            
            // More specific error messages
            let errorMessage = "I'm sorry, I encountered an error processing your request. Please try again.";
            
            if (error.message.includes('Failed to fetch')) {
                errorMessage = "I can't connect to the server. Please make sure the server is running.";
            } else if (error.message.includes('HTTP 401')) {
                errorMessage = "API key is invalid. Please check your configuration.";
            } else if (error.message.includes('HTTP 402')) {
                errorMessage = "API quota exceeded. Please check your billing.";
            } else if (error.message.includes('HTTP 500')) {
                errorMessage = "Server error. Please try again later.";
            }
            
            this.addMessage(errorMessage, 'ai');
            this.speakText(errorMessage);
        }
    }

    speakText(text) {
        console.log('Attempting to speak text:', text);
        
        // Check if speech synthesis is supported
        if (!('speechSynthesis' in window)) {
            console.error('Speech synthesis not supported');
            this.updateStatus('Speech synthesis not supported', 'error');
            return;
        }
        
        if (this.isSpeaking) {
            console.log('Canceling current speech');
            this.synthesis.cancel();
        }
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Apply voice settings
        const voices = this.synthesis.getVoices();
        console.log('Available voices:', voices.length);
        
        const selectedVoiceIndex = this.voiceSelect.value;
        if (selectedVoiceIndex !== 'default' && voices[selectedVoiceIndex]) {
            utterance.voice = voices[selectedVoiceIndex];
            console.log('Using voice:', voices[selectedVoiceIndex].name);
        }
        
        utterance.rate = parseFloat(this.speechRate.value);
        utterance.pitch = parseFloat(this.speechPitch.value);
        utterance.volume = 0.9; // Higher volume for clarity
        
        console.log('Speech settings:', {
            rate: utterance.rate,
            pitch: utterance.pitch,
            volume: utterance.volume,
            voice: utterance.voice ? utterance.voice.name : 'default'
        });
        
        // Add natural pauses and emphasis
        utterance.text = text
            .replace(/\./g, '. ')  // Add pause after periods
            .replace(/,/g, ', ')   // Add pause after commas
            .replace(/!/g, '! ')   // Add pause after exclamations
            .replace(/\?/g, '? ')  // Add pause after questions
            .replace(/\s+/g, ' ')  // Clean up extra spaces
            .trim();
        
        utterance.onstart = () => {
            console.log('Speech started');
            this.isSpeaking = true;
            this.updateStatus('Speaking...', 'speaking');
        };
        
        utterance.onend = () => {
            console.log('Speech ended');
            this.isSpeaking = false;
            this.updateStatus('Ready to listen', 'ready');
            this.updateUI(); // Re-enable text input
            
            // Automatically restart voice recognition after speaking
            this.autoRestartListening();
        };
        
        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event.error);
            this.isSpeaking = false;
            this.updateStatus('Speech error: ' + event.error, 'error');
            this.updateUI(); // Re-enable text input
        };
        
        console.log('Starting speech synthesis...');
        this.synthesis.speak(utterance);
    }

    addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        const icon = document.createElement('i');
        // Update icons for different message types
        if (sender === 'user') {
            icon.className = 'fas fa-user';
        } else if (sender === 'book') {
            icon.className = 'fas fa-book-open';
        } else if (sender === 'system') {
            icon.className = 'fas fa-info-circle';
        } else {
            icon.className = 'fas fa-robot';
        }
        
        const textP = document.createElement('p');
        textP.textContent = text;
        
        contentDiv.appendChild(icon);
        contentDiv.appendChild(textP);
        messageDiv.appendChild(contentDiv);
        
        this.conversationArea.appendChild(messageDiv);
        this.scrollToBottom();
    }

    scrollToBottom() {
        this.conversationArea.scrollTop = this.conversationArea.scrollHeight;
    }

    sendTextMessage() {
        const text = this.textInput.value.trim();
        if (!text) return;
        
        this.textInput.value = '';
        this.updateSendButton();
        this.handleUserInput(text);
    }

    updateSendButton() {
        const hasText = this.textInput.value.trim().length > 0;
        this.sendButton.disabled = !hasText;
    }

    updateUI() {
        this.voiceButton.classList.toggle('listening', this.isListening);
        this.voiceButton.disabled = this.isSpeaking;
        // Only disable text input when listening, not when speaking
        this.textInput.disabled = this.isListening;
    }

    updateStatus(text, type = 'ready') {
        this.statusText.textContent = text;
        this.statusIndicator.className = `status-indicator ${type}`;
    }

    clearConversation() {
        this.conversationArea.innerHTML = `
            <div class="message ai-message">
                <div class="message-content">
                    <i class="fas fa-robot"></i>
                    <p>Hello! I'm your reading helper! The microphone is active and listening! You can say "read this page", "scan the book", or "what do you see" to have me analyze book pages. Just start speaking!</p>
                </div>
            </div>
        `;
        this.conversationHistory = [];
        this.currentPageText = '';
        this.updateStatus('Microphone is active - start speaking!', 'listening');
        this.updateOcrStatus('Ready to read and analyze books! Position a page in the camera and say "read this page".', 'ready');
    }

    openSettings() {
        this.settingsModal.style.display = 'block';
    }

    closeSettingsModal() {
        this.settingsModal.style.display = 'none';
    }

    async autoStartListening() {
        // Wait a moment for the page to fully load and speech recognition to be ready
        setTimeout(async () => {
            if (this.recognition && !this.isListening && !this.isSpeaking) {
                try {
                    console.log('Auto-starting microphone...');
                    this.recognition.start();
                    this.updateStatus('Microphone is now active - start speaking!', 'listening');
                } catch (error) {
                    console.error('Failed to auto-start microphone:', error);
                    this.updateStatus('Microphone permission needed - click the microphone button to start', 'error');
                }
            }
        }, 1000); // 1 second delay to ensure everything is initialized
    }

    autoRestartListening() {
        // Wait a moment after speaking ends before restarting listening
        setTimeout(() => {
            if (this.recognition && !this.isListening && !this.isSpeaking) {
                try {
                    console.log('Auto-restarting microphone...');
                    this.recognition.start();
                    this.updateStatus('Microphone is active - start speaking!', 'listening');
                } catch (error) {
                    console.error('Failed to auto-restart microphone:', error);
                    this.updateStatus('Click microphone button to restart', 'error');
                }
            }
        }, 500); // Short delay to ensure speech has fully ended
    }

    isOCRCommand(text) {
        const lowerText = text.toLowerCase();
        const ocrCommands = [
            'read this page',
            'scan this page',
            'read the page',
            'scan the page',
            'read the book',
            'scan the book',
            'capture the page',
            'take a picture',
            'read what you see',
            'what do you see',
            'analyze this page',
            'process this page'
        ];
        
        return ocrCommands.some(command => lowerText.includes(command));
    }

    async handleOCRCommand(text) {
        console.log('OCR command detected:', text);
        
        // Add a system message about the OCR command
        this.addMessage('I heard you want me to read a page! Let me capture and analyze it for you.', 'system');
        this.speakText('I heard you want me to read a page! Let me capture and analyze it for you.');
        
        // For voice commands, use AI analysis
        await this.captureAndReadPageWithAI();
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.voiceConversation = new VoiceConversation();
});

// Handle page visibility changes to pause/resume speech
document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
    } else if (!document.hidden && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
    }
});