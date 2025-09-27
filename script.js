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
        this.initializeLiveKit();
        this.initializeSpeechRecognition();
        this.initializeEventListeners();
        this.loadVoices();
        this.setupSettings();
        
        // Automatically start microphone listening when page loads
        this.autoStartListening();
        
        // Test speech synthesis on load (but only after user interaction)
        // Some browsers require user interaction before allowing speech synthesis
        console.log('Speech synthesis available:', 'speechSynthesis' in window);
        console.log('Available voices:', this.synthesis.getVoices().length);
        console.log('Voice select element:', this.voiceSelect);
        console.log('Speech rate element:', this.speechRate);
        console.log('Speech pitch element:', this.speechPitch);
        
        // Speech synthesis testing removed - no automatic testing on user interaction

    }

    initializeElements() {
        this.conversationArea = document.getElementById('conversationContainer');
        this.textInput = document.getElementById('messageInput');
        this.voiceButton = document.getElementById('voiceButton');
        this.sendButton = document.getElementById('sendBtn');
        this.clearButton = document.getElementById('clearButton');
        this.settingsButton = document.getElementById('settingsButton');
        this.statusIndicator = document.getElementById('connectionStatus');
        this.statusText = document.getElementById('connectionText');
        this.settingsModal = document.getElementById('settingsModal');
        this.closeSettings = document.getElementById('closeSettings');
        this.voiceSelect = document.getElementById('voiceSelect');
        this.speechRate = document.getElementById('speechRate');
        this.speechPitch = document.getElementById('speechPitch');
        this.rateValue = document.getElementById('rateValue');
        this.pitchValue = document.getElementById('pitchValue');
        this.webcam = document.getElementById('videoElement');
        this.canvas = document.getElementById('canvas');
        this.captureButton = document.getElementById('captureButton');
        this.ocrStatus = document.getElementById('ocrStatus');
        this.confidenceFill = document.getElementById('confidenceFill');
        this.confidenceText = document.getElementById('confidenceValue');
        this.currentPageText = ''; // Store current page text for questions
        this.teachableModel = null;
        this.maxPredictions = 0;
    }

    // LiveKit initialization disabled for testing
    async initializeLiveKit() {
        try {
            console.log('LiveKit initialization skipped - using Web Speech API');
            // Skip LiveKit for now to focus on basic speech synthesis
            // this.livekit = new LiveKitIntegration();
            console.log('Using standard Web Speech API for speech synthesis');
        } catch (error) {
            console.error('LiveKit initialization failed:', error);
            console.log('Falling back to standard speech synthesis');
        }
    }

    async initializeCamera() {
        try {
            // Initialize camera controls
            this.initializeCameraControls();
            
            // Load Teachable Machine model
            await this.loadTeachableModel();
            
            this.updateOcrStatus('Click "Start Camera" to begin reading books!', 'ready');
            
        } catch (error) {
            console.error('Camera initialization failed:', error);
            this.updateOcrStatus('Camera initialization failed', 'error');
        }
    }

    initializeCameraControls() {
        const startBtn = document.getElementById('startCameraBtn');
        const stopBtn = document.getElementById('stopCameraBtn');
        
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startCamera());
        }
        
        if (stopBtn) {
            stopBtn.addEventListener('click', () => this.stopCamera());
        }
        
        // Initially hide stop button
        if (stopBtn) {
            stopBtn.style.display = 'none';
        }
    }

    async startCamera() {
        try {
            console.log('Starting camera...');
            this.updateOcrStatus('Starting camera...', 'processing');
            
            // Get webcam access
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 640, height: 480 } 
            });
            
            this.audioStream = stream; // Store stream for later cleanup
            this.webcam.srcObject = stream;
            
            // Add capture button listener
            if (this.captureButton) {
                this.captureButton.addEventListener('click', () => this.captureAndReadPage());
            }
            
            // Show/hide buttons
            const startBtn = document.getElementById('startCameraBtn');
            const stopBtn = document.getElementById('stopCameraBtn');
            
            if (startBtn) startBtn.style.display = 'none';
            if (stopBtn) stopBtn.style.display = 'inline-block';
            
            // Start book detection after a short delay to ensure webcam is ready
            setTimeout(() => {
                this.startBookDetection();
            }, 1000);
            
            this.updateOcrStatus('Camera started! Position a page in the camera and say "read this page".', 'ready');
            
        } catch (error) {
            console.error('Camera access denied:', error);
            this.updateOcrStatus('Camera access denied. Please allow camera access and try again.', 'error');
        }
    }

    stopCamera() {
        console.log('Stopping camera...');
        this.updateOcrStatus('Stopping camera...', 'processing');
        
        // Stop all video tracks
        if (this.audioStream) {
            this.audioStream.getTracks().forEach(track => {
                track.stop();
                console.log('Stopped track:', track.kind);
            });
            this.audioStream = null;
        }
        
        // Clear video source
        if (this.webcam) {
            this.webcam.srcObject = null;
        }
        
        // Show/hide buttons
        const startBtn = document.getElementById('startCameraBtn');
        const stopBtn = document.getElementById('stopCameraBtn');
        
        if (startBtn) startBtn.style.display = 'inline-block';
        if (stopBtn) stopBtn.style.display = 'none';
        
        // Stop book detection
        this.stopBookDetection();
        
        this.updateOcrStatus('Camera stopped. Click "Start Camera" to begin again.', 'ready');
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

    async loadTeachableModel() {
        this.confidenceText.textContent = 'Loading AI model...';
        
        // Load your actual Teachable Machine model
        const modelURL = "https://teachablemachine.withgoogle.com/models/Ves4Ftz2m/model.json";
        const metadataURL = "https://teachablemachine.withgoogle.com/models/Ves4Ftz2m/metadata.json";   
        
        console.log('Attempting to load model from:', modelURL);
        
        this.teachableModel = await tmImage.load(modelURL, metadataURL);
        this.maxPredictions = this.teachableModel.getTotalClasses();
        
        console.log('Teachable Machine model loaded successfully');
        console.log('Number of classes:', this.maxPredictions);
        console.log('Class labels:', this.teachableModel.getClassLabels());
        
        this.confidenceText.textContent = 'Hold up your book!';
    }


    startBookDetection() {
        console.log('Starting book detection...');
        
        if (this.teachableModel) {
            console.log('Using Teachable Machine model');
            // Use Teachable Machine model
            this.detectionInterval = setInterval(async () => {
                await this.detectBookWithTeachableModel();
            }, 1000); // Check every second
        } else {
            console.log('Teachable Machine model not loaded');
            this.confidenceText.textContent = 'Teachable Machine model not loaded';
        }
    }

    stopBookDetection() {
        console.log('Stopping book detection...');
        
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
            this.detectionInterval = null;
        }
        
        // Reset confidence indicator
        if (this.confidenceText) {
            this.confidenceText.textContent = '0%';
        }
        if (this.confidenceFill) {
            this.confidenceFill.style.width = '0%';
        }
    }

    async detectBookWithTeachableModel() {
        if (!this.teachableModel || !this.webcam.videoWidth) return;
        
        try {
            // Create a temporary canvas for the webcam frame
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = 200;
            tempCanvas.height = 200;
            
            // Draw webcam frame to temp canvas
            tempCtx.drawImage(this.webcam, 0, 0, 200, 200);
            
            // Predict using Teachable Machine model
            const prediction = await this.teachableModel.predict(tempCanvas);
            
            // Log all predictions for debugging
            console.log('Teachable Machine predictions:', prediction);
            
            // Find book and no_book confidence scores
            let bookConfidence = 0;
            let noBookConfidence = 0;
            let predictedClass = '';
            
            for (let i = 0; i < this.maxPredictions; i++) {
                const confidence = prediction[i].probability;
                const className = prediction[i].className.toLowerCase();
                
                console.log(`${className}: ${(confidence * 100).toFixed(1)}%`);
                
                if (className.includes('book') && !className.includes('no')) {
                    bookConfidence = confidence;
                    predictedClass = 'Book';
                } else if (className.includes('no') || className.includes('empty') || className.includes('background')) {
                    noBookConfidence = confidence;
                    if (!predictedClass) predictedClass = 'No Book';
                }
            }
            
            // Store predictions for display
            this.lastPredictions = {
                book: bookConfidence,
                no_book: noBookConfidence
            };
            
            // Use the higher confidence score
            const maxConfidence = Math.max(bookConfidence, noBookConfidence);
            const finalClass = bookConfidence > noBookConfidence ? 'Book' : 'No Book';
            
            console.log(`Final prediction: ${finalClass} (${(maxConfidence * 100).toFixed(1)}%)`);
            
            // Update UI based on prediction
            this.updateConfidenceIndicator(maxConfidence, finalClass);
            
        } catch (error) {
            console.error('Error in Teachable Machine detection:', error);
        }
    }

    async detectBookWithComputerVision() {
        if (!this.webcam.videoWidth) {
            console.log('Webcam not ready yet');
            return;
        }
        
        try {
            // Use computer vision heuristics for book detection
            const bookConfidence = this.calculateBookConfidence();
            
            console.log('Computer vision confidence:', bookConfidence);
            
            // Update UI
            this.updateConfidenceIndicator(bookConfidence, 'Book');
            
        } catch (error) {
            console.error('Error in computer vision detection:', error);
            // Fallback to a basic test confidence
            this.updateConfidenceIndicator(0.3, 'Book (Test Mode)');
        }
    }

    calculateBookConfidence() {
        // Use computer vision techniques for book detection
        const textPatternConfidence = this.detectTextPatterns();
        const edgeConfidence = this.detectRectangularEdges();
        const contrastConfidence = this.detectTextContrast();
        
        console.log('Detection components:', {
            text: textPatternConfidence,
            edge: edgeConfidence,
            contrast: contrastConfidence
        });
        
        // Combine multiple detection methods for better accuracy
        const combinedConfidence = (
            textPatternConfidence * 0.4 +
            edgeConfidence * 0.3 +
            contrastConfidence * 0.3
        );
        
        console.log('Combined confidence:', combinedConfidence);
        return Math.min(1, combinedConfidence);
    }

    detectTextPatterns() {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 200;
            canvas.height = 200;
            
            ctx.drawImage(this.webcam, 0, 0, 200, 200);
            const imageData = ctx.getImageData(0, 0, 200, 200);
            const data = imageData.data;
            
            // Convert to grayscale and detect text-like patterns
            let textLikePixels = 0;
            let totalPixels = 0;
            
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const brightness = (r + g + b) / 3;
                
                // Look for high contrast areas (potential text)
                if (brightness > 30 && brightness < 220) {
                    textLikePixels++;
                }
                totalPixels++;
            }
            
            const textRatio = textLikePixels / totalPixels;
            
            // Return confidence based on text-like pixel ratio
            if (textRatio > 0.3) return 0.8; // High confidence
            if (textRatio > 0.2) return 0.6; // Medium confidence
            if (textRatio > 0.1) return 0.3; // Low confidence
            return 0;
            
        } catch (error) {
            return 0;
        }
    }

    detectRectangularEdges() {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 150;
            canvas.height = 150;
            
            ctx.drawImage(this.webcam, 0, 0, 150, 150);
            const imageData = ctx.getImageData(0, 0, 150, 150);
            const data = imageData.data;
            
            // Simple edge detection using Sobel operator
            let edgeStrength = 0;
            const width = 150;
            const height = 150;
            
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const idx = (y * width + x) * 4;
                    const r = data[idx];
                    const g = data[idx + 1];
                    const b = data[idx + 2];
                    const brightness = (r + g + b) / 3;
                    
                    // Simple edge detection
                    const rightIdx = (y * width + (x + 1)) * 4;
                    const rightBrightness = (data[rightIdx] + data[rightIdx + 1] + data[rightIdx + 2]) / 3;
                    
                    const downIdx = ((y + 1) * width + x) * 4;
                    const downBrightness = (data[downIdx] + data[downIdx + 1] + data[downIdx + 2]) / 3;
                    
                    const edgeX = Math.abs(brightness - rightBrightness);
                    const edgeY = Math.abs(brightness - downBrightness);
                    const edgeMagnitude = Math.sqrt(edgeX * edgeX + edgeY * edgeY);
                    
                    if (edgeMagnitude > 30) {
                        edgeStrength++;
                    }
                }
            }
            
            const edgeRatio = edgeStrength / ((width - 2) * (height - 2));
            
            // Return confidence based on edge density (rectangular objects have many edges)
            if (edgeRatio > 0.15) return 0.7; // High confidence
            if (edgeRatio > 0.1) return 0.5;  // Medium confidence
            if (edgeRatio > 0.05) return 0.3; // Low confidence
            return 0;
            
        } catch (error) {
            return 0;
        }
    }

    detectTextContrast() {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 100;
            canvas.height = 100;
            
            ctx.drawImage(this.webcam, 0, 0, 100, 100);
            const imageData = ctx.getImageData(0, 0, 100, 100);
            const data = imageData.data;
            
            let minBrightness = 255;
            let maxBrightness = 0;
            let totalBrightness = 0;
            let pixelCount = 0;
            
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const brightness = (r + g + b) / 3;
                
                minBrightness = Math.min(minBrightness, brightness);
                maxBrightness = Math.max(maxBrightness, brightness);
                totalBrightness += brightness;
                pixelCount++;
            }
            
            const avgBrightness = totalBrightness / pixelCount;
            const contrast = maxBrightness - minBrightness;
            
            // Good text contrast: not too dark, not too bright, good contrast range
            let confidence = 0;
            
            if (avgBrightness > 80 && avgBrightness < 180) confidence += 0.3;
            if (contrast > 100) confidence += 0.4;
            if (contrast > 150) confidence += 0.3;
            
            return Math.min(1, confidence);
            
        } catch (error) {
            return 0;
        }
    }

    updateConfidenceIndicator(confidence, className = '') {
        const percentage = Math.round(confidence * 100);
        this.confidenceFill.style.width = `${percentage}%`;
        
        // Show both book and no_book confidence if we have the data
        if (this.teachableModel && this.lastPredictions) {
            const bookConf = Math.round(this.lastPredictions.book * 100);
            const noBookConf = Math.round(this.lastPredictions.no_book * 100);
            this.confidenceText.textContent = `Book: ${bookConf}% | No Book: ${noBookConf}%`;
        } else {
            this.confidenceText.textContent = `${className} detected! (${percentage}% confidence)`;
        }
        
        if (confidence >= 0.7) {
            this.confidenceText.className = 'confidence-text high';
            this.captureButton.disabled = false;
        } else if (confidence >= 0.4) {
            this.confidenceText.className = 'confidence-text medium';
            this.captureButton.disabled = false;
        } else {
            this.confidenceText.className = 'confidence-text low';
            this.captureButton.disabled = true;
        }
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
            // Add the book content to conversation history
            this.conversationHistory.push({ 
                role: 'system', 
                content: `The child just showed me a page from their book that says: "${extractedText}". I should be ready to answer questions about this text in a child-friendly way.` 
            });

            // Generate AI response
            this.updateStatus('AI is analyzing the page...', 'thinking');
            
            // Try real AI API first, fallback to mock if it fails
            let aiResponse;
            try {
                const bookAnalysisPrompt = `I just read this text from a child's book: "${extractedText}". Please provide a friendly, engaging analysis that helps a child understand what they're reading. Make it fun and educational, and ask them what they think about it!`;
                aiResponse = await this.callOpenAI(bookAnalysisPrompt);
                console.log('Generated AI response for book page from OpenAI:', aiResponse);
            } catch (apiError) {
                console.warn('OpenAI API failed for book page, using mock response:', apiError);
                aiResponse = this.generateBookPageResponse(extractedText);
                console.log('Generated mock AI response for book page:', aiResponse);
            }
            
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

    generateBookPageResponse(extractedText) {
        // Simple analysis of the text
        const wordCount = extractedText.split(/\s+/).length;
        const hasQuestions = extractedText.includes('?');
        const hasExclamations = extractedText.includes('!');
        
        let response = "Wow! I can see you have some text here! ";
        
        if (wordCount > 50) {
            response += "This looks like a longer passage with lots of words! ";
        } else if (wordCount > 20) {
            response += "This is a nice medium-sized text! ";
        } else {
            response += "This looks like a shorter text! ";
        }
        
        if (hasQuestions) {
            response += "I can see there are questions in this text - that's great for learning! ";
        }
        
        if (hasExclamations) {
            response += "I notice there are exclamation marks - this text seems exciting! ";
        }
        
        response += `I can see about ${wordCount} words in this text. `;
        
        // Add some encouraging words
        const encouragements = [
            "You're doing such a great job reading!",
            "This looks like interesting content!",
            "I love how you're exploring new words!",
            "You're becoming such a good reader!",
            "This text looks really engaging!"
        ];
        
        response += encouragements[Math.floor(Math.random() * encouragements.length)] + " ";
        response += "Would you like me to help you understand any specific words or ask questions about what you've read?";
        
        return response;
    }

    readBookPage(pageText) {
        this.currentPageText = pageText; // Store for questions
        this.updateOcrStatus('Page read successfully!', 'success');
        
        // Add to conversation
        this.addMessage('Reading page from your book...', 'system');
        this.addMessage(pageText, 'book');
        
        // Read the page text directly without any prefix
        this.speakText(pageText);
        
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
        console.log('Initializing event listeners...');
        
        // Check if elements exist before adding listeners
        if (this.voiceButton) {
            this.voiceButton.addEventListener('click', () => this.toggleListening());
            console.log('Voice button listener added');
        } else {
            console.warn('Voice button not found');
        }
        
        if (this.sendButton) {
            this.sendButton.addEventListener('click', () => this.sendTextMessage());
            console.log('Send button listener added');
        } else {
            console.warn('Send button not found');
        }
        
        if (this.clearButton) {
            this.clearButton.addEventListener('click', () => this.clearConversation());
            console.log('Clear button listener added');
        } else {
            console.warn('Clear button not found');
        }
        
        if (this.settingsButton) {
            this.settingsButton.addEventListener('click', () => this.openSettings());
            console.log('Settings button listener added');
        } else {
            console.warn('Settings button not found');
        }
        
        if (this.closeSettings) {
            this.closeSettings.addEventListener('click', () => this.closeSettingsModal());
            console.log('Close settings listener added');
        } else {
            console.warn('Close settings button not found');
        }
        
        if (this.textInput) {
            this.textInput.addEventListener('input', () => this.updateSendButton());
            this.textInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendTextMessage();
                }
            });
            console.log('Text input listeners added');
        } else {
            console.warn('Text input not found');
        }

        // Close modal when clicking outside
        if (this.settingsModal) {
            this.settingsModal.addEventListener('click', (e) => {
                if (e.target === this.settingsModal) {
                    this.closeSettingsModal();
                }
            });
            console.log('Settings modal listener added');
        } else {
            console.warn('Settings modal not found');
        }
        
        console.log('Event listeners initialization complete');
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
        console.log('handleUserInput called with:', text);
        if (!text.trim()) {
            console.log('Empty text, returning');
            return;
        }
        
        console.log('Adding user message to conversation');
        this.addMessage(text, 'user');
        this.conversationHistory.push({ role: 'user', content: text });
        
        // Check for OCR voice commands first
        if (this.isOCRCommand(text)) {
            console.log('OCR command detected, handling OCR');
            this.handleOCRCommand(text);
            return;
        }
        
        // Generate AI response for regular conversation
        console.log('Generating AI response for regular conversation');
        this.generateAIResponse(text);
    }

    async generateAIResponse(userInput) {
        try {
            console.log('=== AI RESPONSE GENERATION START ===');
            console.log('User input:', userInput);
            
            this.updateStatus('AI is thinking...', 'thinking');
            
            // Try real AI API first, fallback to mock if it fails
            let aiResponse;
            try {
                aiResponse = await this.callOpenAI(userInput);
                console.log('Generated AI response from OpenAI:', aiResponse);
            } catch (apiError) {
                console.warn('OpenAI API failed, using mock response:', apiError);
                aiResponse = this.generateMockResponse(userInput);
                console.log('Generated mock AI response:', aiResponse);
            }
            
            console.log('Adding message to conversation area...');
            this.addMessage(aiResponse, 'ai');
            this.conversationHistory.push({ role: 'assistant', content: aiResponse });
            console.log('Message added successfully');
            
            // Speak the response
            console.log('About to speak AI response:', aiResponse);
            console.log('AI response length:', aiResponse.length);
            console.log('AI response type:', typeof aiResponse);
            
            // Ensure we have a valid response to speak
            if (aiResponse && aiResponse.trim()) {
                console.log('Calling speakText with AI response...');
                this.speakText(aiResponse.trim());
                console.log('Speech synthesis called successfully');
            } else {
                console.warn('AI response is empty or invalid, skipping speech synthesis');
            }
            
            // Fallback: ensure microphone restarts even if speech synthesis fails
            setTimeout(() => {
                if (!this.isListening && !this.isSpeaking) {
                    console.log('Fallback: restarting microphone after AI response');
                    this.autoRestartListening();
                }
            }, 3000); // 3 second fallback
            
            console.log('=== AI RESPONSE GENERATION COMPLETE ===');
            
        } catch (error) {
            console.error('Error generating AI response:', error);
            
            const errorMessage = "I'm sorry, I encountered an error processing your request. Please try again.";
            
            this.addMessage(errorMessage, 'ai');
            console.log('About to speak error message:', errorMessage);
            this.speakText(errorMessage);
            
            // Fallback: ensure microphone restarts even if speech synthesis fails
            setTimeout(() => {
                if (!this.isListening && !this.isSpeaking) {
                    console.log('Fallback: restarting microphone after error response');
                    this.autoRestartListening();
                }
            }, 3000); // 3 second fallback
        }
    }

    async callOpenAI(userInput) {
        const apiKey = await this.getOpenAIKey();
        if (!apiKey) {
            throw new Error('OpenAI API key not configured');
        }

        // Prepare conversation history for context
        const messages = [
            {
                role: "system",
                content: "You are a friendly, enthusiastic bookworm assistant for children. You help kids with reading, answer questions about books, and make learning fun. Always be encouraging and speak in a child-friendly way. Keep responses concise but engaging."
            },
            ...this.conversationHistory.slice(-10), // Last 10 messages for context
            {
                role: "user",
                content: userInput
            }
        ];

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: messages,
                max_tokens: 150,
                temperature: 0.7,
                presence_penalty: 0.6,
                frequency_penalty: 0.3
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        return data.choices[0].message.content.trim();
    }

    async getOpenAIKey() {
        // Check if we already have the API key cached
        let apiKey = localStorage.getItem('openai_api_key');
        
        if (!apiKey) {
            try {
                // Fetch API key from server
                console.log('Fetching OpenAI API key from server...');
                const response = await fetch('http://localhost:3000/api/openai-key');
                if (response.ok) {
                    const data = await response.json();
                    apiKey = data.apiKey;
                    if (apiKey) {
                        localStorage.setItem('openai_api_key', apiKey);
                        console.log('OpenAI API key fetched from server and cached');
                    }
                } else {
                    console.warn('Failed to fetch API key from server:', response.status);
                }
            } catch (error) {
                console.warn('Error fetching API key from server:', error);
            }
        }
        
        if (!apiKey) {
            console.log('No OpenAI API key available, will use mock responses');
        } else {
            console.log('OpenAI API key available');
        }
        
        return apiKey;
    }

    // Function to update API key from settings
    updateOpenAIKey(newKey) {
        if (newKey && newKey.trim()) {
            localStorage.setItem('openai_api_key', newKey.trim());
            console.log('OpenAI API key updated');
            return true;
        }
        return false;
    }

    // Function to clear API key
    clearOpenAIKey() {
        localStorage.removeItem('openai_api_key');
        console.log('OpenAI API key cleared');
    }

    generateMockResponse(userInput) {
        const lowerInput = userInput.toLowerCase();
        
        // Greeting responses
        if (lowerInput.includes('hello') || lowerInput.includes('hi') || lowerInput.includes('hey')) {
            return "Hello there, little reader! I'm so excited to help you with your reading adventure! What book would you like to explore today?";
        }
        
        // Book-related responses
        if (lowerInput.includes('book') || lowerInput.includes('read') || lowerInput.includes('story')) {
            return "I love books too! Show me a page from your book and I'll help you understand it better. Just say 'read this page' or click the camera button!";
        }
        
        // Help responses
        if (lowerInput.includes('help') || lowerInput.includes('what can you do')) {
            return "I'm your friendly bookworm assistant! I can help you read book pages, answer questions about stories, and make reading fun! Try showing me a book page or asking me about your favorite stories!";
        }
        
        // Question responses
        if (lowerInput.includes('?') || lowerInput.includes('what') || lowerInput.includes('how') || lowerInput.includes('why')) {
            return "That's a great question! I'd love to help you find the answer. If you show me a book page, I can read it and help explain what it means!";
        }
        
        // Thank you responses
        if (lowerInput.includes('thank') || lowerInput.includes('thanks')) {
            return "You're very welcome! I'm so happy to help you with your reading! Is there anything else you'd like to know about books?";
        }
        
        // Reading-related responses
        if (lowerInput.includes('read') || lowerInput.includes('page') || lowerInput.includes('text')) {
            return "I'm ready to read with you! Just show me a book page in the camera and I'll tell you all about it!";
        }
        
        // Default responses
        const responses = [
            "That's so interesting! Tell me more about what you're thinking!",
            "I love hearing from you! What book are you reading today?",
            "You're such a great reader! Keep asking questions!",
            "I'm here to help you with all your reading adventures! What would you like to explore?",
            "That sounds wonderful! I'd love to learn more about it!",
            "You're doing such a great job with your reading! Keep it up!",
            "I'm so excited to help you discover new stories! What's your favorite book?",
            "You're asking such smart questions! I love helping curious readers like you!"
        ];
        
        return responses[Math.floor(Math.random() * responses.length)];
    }

    speakText(text) {
        console.log('=== SPEAKTEXT CALLED ===');
        console.log('Text to speak:', text);
        console.log('Text type:', typeof text);
        console.log('Text length:', text ? text.length : 'undefined');
        console.log('Current speaking status:', this.isSpeaking);
        console.log('Speech synthesis available:', 'speechSynthesis' in window);
        
        // Check if speech synthesis is supported
        if (!('speechSynthesis' in window)) {
            console.error('Speech synthesis not supported');
            this.updateStatus('Speech synthesis not supported', 'error');
            return;
        }
        
        // Check if text is valid
        if (!text || typeof text !== 'string' || !text.trim()) {
            console.warn('Invalid text provided to speakText:', text);
            return;
        }
        
        if (this.isSpeaking) {
            console.log('Canceling current speech');
            this.synthesis.cancel();
        }
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Apply voice settings with error checking
        const voices = this.synthesis.getVoices();
        console.log('Available voices:', voices.length);
        
        // Check if voice select element exists and has a value
        if (this.voiceSelect && this.voiceSelect.value) {
            const selectedVoiceIndex = this.voiceSelect.value;
            console.log('Selected voice index:', selectedVoiceIndex);
            
            if (selectedVoiceIndex !== 'default' && voices[selectedVoiceIndex]) {
                utterance.voice = voices[selectedVoiceIndex];
                console.log('Using voice:', voices[selectedVoiceIndex].name);
            } else {
                console.log('Using default voice');
            }
        } else {
            console.log('Voice select not available, using default voice');
        }
        
        // Check if speech rate and pitch elements exist
        if (this.speechRate && this.speechRate.value) {
            utterance.rate = parseFloat(this.speechRate.value);
        } else {
            utterance.rate = 1.0;
            console.log('Speech rate not available, using default 1.0');
        }
        
        if (this.speechPitch && this.speechPitch.value) {
            utterance.pitch = parseFloat(this.speechPitch.value);
        } else {
            utterance.pitch = 1.0;
            console.log('Speech pitch not available, using default 1.0');
        }
        
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
            console.log('Speech ended - onend event fired');
            this.isSpeaking = false;
            this.updateStatus('Ready to listen', 'ready');
            this.updateUI(); // Re-enable text input
            
            // Automatically restart voice recognition after speaking
            console.log('Calling autoRestartListening from onend event');
            this.autoRestartListening();
        };
        
        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event.error);
            console.error('Error details:', {
                error: event.error,
                type: event.type,
                text: utterance.text
            });
            this.isSpeaking = false;
            this.updateStatus('Speech error: ' + event.error, 'error');
            this.updateUI(); // Re-enable text input
            
            // Still try to restart listening even if speech failed
            this.autoRestartListening();
        };
        
        console.log('Starting speech synthesis...');
        console.log('Utterance text:', utterance.text);
        console.log('Utterance settings:', {
            rate: utterance.rate,
            pitch: utterance.pitch,
            volume: utterance.volume,
            voice: utterance.voice ? utterance.voice.name : 'default'
        });
        
        try {
            console.log('Calling this.synthesis.speak...');
            console.log('this.synthesis:', this.synthesis);
            console.log('window.speechSynthesis:', window.speechSynthesis);
            
            // Use window.speechSynthesis as fallback if this.synthesis is null
            const synthesis = this.synthesis || window.speechSynthesis;
            synthesis.speak(utterance);
            console.log('speechSynthesis.speak called successfully');
        } catch (error) {
            console.error('Error calling speech synthesis:', error);
            this.updateStatus('Speech synthesis failed', 'error');
        }
    }

    addMessage(text, sender) {
        console.log(`=== ADDING MESSAGE ===`);
        console.log('Sender:', sender);
        console.log('Text:', text);
        console.log('Conversation area exists:', !!this.conversationArea);
        
        if (!this.conversationArea) {
            console.warn('Conversation area not available for adding message');
            return;
        }
        
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
            icon.className = 'bookworm-avatar';
            icon.innerHTML = '🐛';
        }
        
        const textP = document.createElement('p');
        textP.textContent = text;
        
        contentDiv.appendChild(icon);
        contentDiv.appendChild(textP);
        messageDiv.appendChild(contentDiv);
        
        console.log('Message element created, appending to conversation area...');
        this.conversationArea.appendChild(messageDiv);
        console.log('Message appended successfully');
        
        this.scrollToBottom();
        console.log('=== MESSAGE ADDED ===');
    }

    scrollToBottom() {
        if (this.conversationArea) {
            this.conversationArea.scrollTop = this.conversationArea.scrollHeight;
        }
    }

    sendTextMessage() {
        console.log('sendTextMessage called');
        const text = this.textInput.value.trim();
        console.log('Text input:', text);
        if (!text) {
            console.log('No text to send');
            return;
        }
        
        this.textInput.value = '';
        this.updateSendButton();
        console.log('Calling handleUserInput with:', text);
        this.handleUserInput(text);
    }

    updateSendButton() {
        if (!this.textInput || !this.sendButton) {
            console.warn('Text input or send button not available for update');
            return;
        }
        const hasText = this.textInput.value.trim().length > 0;
        this.sendButton.disabled = !hasText;
    }

    updateUI() {
        if (this.voiceButton) {
            this.voiceButton.classList.toggle('listening', this.isListening);
            this.voiceButton.disabled = this.isSpeaking;
        }
        // Only disable text input when listening, not when speaking
        if (this.textInput) {
            this.textInput.disabled = this.isListening;
        }
    }

    updateStatus(text, type = 'ready') {
        if (this.statusText) {
            this.statusText.textContent = text;
        }
        if (this.statusIndicator) {
            this.statusIndicator.className = `status-indicator ${type}`;
        }
    }

    clearConversation() {
        if (this.conversationArea) {
            this.conversationArea.innerHTML = `
                <div class="message ai-message">
                    <div class="message-content">
                        <div class="bookworm-avatar">🐛</div>
                        <p>Hi there, little reader! I'm your friendly bookworm friend! I love books so much that I eat them... just kidding! I read them to you instead! Just show me a book page and say "read this page" or "what do you see" and I'll tell you all about it! Let's go on a reading adventure together! </p>
                    </div>
                </div>
            `;
        }
        this.conversationHistory = [];
        this.currentPageText = '';
        this.updateStatus('Microphone is active - start speaking!', 'listening');
        this.updateOcrStatus('Ready to read and analyze books! Position a page in the camera and say "read this page".', 'ready');
    }

    openSettings() {
        if (this.settingsModal) {
            this.settingsModal.style.display = 'block';
        }
    }

    closeSettingsModal() {
        if (this.settingsModal) {
            this.settingsModal.style.display = 'none';
        }
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

    autoRestartListening() {
        console.log('Auto-restart listening called. Current state:', {
            isListening: this.isListening,
            isSpeaking: this.isSpeaking,
            recognition: !!this.recognition
        });
        
        // Wait a moment after speaking ends before restarting listening
        setTimeout(() => {
            console.log('Attempting auto-restart. State check:', {
                isListening: this.isListening,
                isSpeaking: this.isSpeaking,
                recognition: !!this.recognition
            });
            
            if (this.recognition && !this.isListening && !this.isSpeaking) {
                try {
                    console.log('Auto-restarting microphone...');
                    this.recognition.start();
                    this.updateStatus('Microphone is active - start speaking!', 'listening');
                    console.log('Microphone auto-restart successful');
                } catch (error) {
                    console.error('Failed to auto-restart microphone:', error);
                    this.updateStatus('Click microphone button to restart', 'error');
                }
            } else {
                console.log('Auto-restart skipped due to current state');
            }
        }, 500); // Short delay to ensure speech has fully ended
    }

    // Manual restart method for debugging
    manualRestartMicrophone() {
        console.log('Manual microphone restart requested');
        this.autoRestartListening();
    }

    // Test speech synthesis manually
    testSpeech() {
        console.log('Testing speech synthesis manually...');
        this.speakText('This is a test of the speech synthesis system.');
    }

    // Simple test function for debugging
    testSimpleSpeech() {
        console.log('=== SIMPLE SPEECH TEST ===');
        console.log('Speech synthesis object:', this.synthesis);
        console.log('Window speech synthesis:', window.speechSynthesis);
        console.log('Are they the same?', this.synthesis === window.speechSynthesis);
        console.log('Speech synthesis available:', 'speechSynthesis' in window);
        console.log('Currently speaking:', speechSynthesis.speaking);
        console.log('Pending:', speechSynthesis.pending);
        
        // Cancel any existing speech
        if (speechSynthesis.speaking) {
            console.log('Canceling existing speech...');
            speechSynthesis.cancel();
        }
        
        const utterance = new SpeechSynthesisUtterance('Hello, this is a simple test of speech synthesis.');
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        utterance.onstart = () => {
            console.log('Simple speech started successfully!');
            alert('Speech started! Check your speakers.');
        };
        
        utterance.onend = () => {
            console.log('Simple speech ended successfully!');
        };
        
        utterance.onerror = (event) => {
            console.error('Simple speech error:', event.error);
            console.error('Error details:', {
                error: event.error,
                type: event.type,
                charIndex: event.charIndex,
                charLength: event.charLength
            });
            alert('Speech error: ' + event.error);
        };
        
        console.log('About to call speechSynthesis.speak...');
        console.log('Utterance text:', utterance.text);
        console.log('Utterance settings:', {
            rate: utterance.rate,
            pitch: utterance.pitch,
            volume: utterance.volume
        });
        
        try {
            speechSynthesis.speak(utterance);
            console.log('speechSynthesis.speak called successfully');
        } catch (error) {
            console.error('Error calling speechSynthesis.speak:', error);
            alert('Error calling speech synthesis: ' + error.message);
        }
    }

    // Quick test function for immediate debugging
    testQuickSpeech() {
        console.log('=== QUICK SPEECH TEST ===');
        console.log('Testing speech synthesis immediately...');
        
        if (!('speechSynthesis' in window)) {
            console.error('Speech synthesis not supported');
            return;
        }
        
        const utterance = new SpeechSynthesisUtterance('Quick test of speech synthesis.');
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 0.9;
        
        utterance.onstart = () => {
            console.log('Quick test speech started successfully');
        };
        
        utterance.onend = () => {
            console.log('Quick test speech ended successfully');
        };
        
        utterance.onerror = (event) => {
            console.error('Quick test speech error:', event.error);
        };
        
        try {
            window.speechSynthesis.speak(utterance);
            console.log('Quick test speech synthesis called successfully');
        } catch (error) {
            console.error('Error calling quick test speech synthesis:', error);
        }
    }

    // Test AI response generation
    testAIResponse() {
        console.log('Testing AI response generation...');
        const testInput = 'hello';
        const response = this.generateMockResponse(testInput);
        console.log('Test input:', testInput);
        console.log('Generated response:', response);
        
        // Test adding message
        this.addMessage('Test user message', 'user');
        this.addMessage(response, 'ai');
        
        // Test speech
        this.speakText('This is a test of the AI response system.');
    }
    
    // Test full AI response flow with speech
    async testFullAIResponse() {
        console.log('=== TESTING FULL AI RESPONSE FLOW ===');
        try {
            const testInput = 'Hello, can you help me with my book?';
            console.log('Test input:', testInput);
            
            // Simulate the full flow
            this.addMessage(testInput, 'user');
            await this.generateAIResponse(testInput);
            
        } catch (error) {
            console.error('Error in full AI response test:', error);
        }
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.voiceConversation = new VoiceConversation();
});

// Global test functions for debugging
window.testSpeech = () => {
    if (window.voiceConversation) {
        window.voiceConversation.testSpeech();
    } else {
        console.error('VoiceConversation not initialized');
    }
};

window.testAI = () => {
    if (window.voiceConversation) {
        window.voiceConversation.testAIResponse();
    } else {
        console.error('VoiceConversation not initialized');
    }
};

window.testSimpleSpeech = () => {
    if (window.voiceConversation) {
        window.voiceConversation.testSimpleSpeech();
    } else {
        console.error('VoiceConversation not initialized');
    }
};

window.testDirectSpeech = () => {
    console.log('Testing direct speech synthesis...');
    const utterance = new SpeechSynthesisUtterance('Hello, this is a direct test of speech synthesis.');
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    utterance.onstart = () => console.log('Direct speech started');
    utterance.onend = () => console.log('Direct speech ended');
    utterance.onerror = (event) => console.error('Direct speech error:', event.error);
    
    speechSynthesis.speak(utterance);
};

window.testOpenAI = async () => {
    if (window.voiceConversation) {
        console.log('Testing OpenAI API...');
        try {
            const response = await window.voiceConversation.callOpenAI('Hello, this is a test!');
            console.log('OpenAI response:', response);
            alert('OpenAI test successful! Check console for response.');
        } catch (error) {
            console.error('OpenAI test failed:', error);
            alert('OpenAI test failed: ' + error.message);
        }
    } else {
        console.error('VoiceConversation not initialized');
    }
};

window.testAPIKey = async () => {
    console.log('Testing API key fetch...');
    try {
        const response = await fetch('http://localhost:3001/api/openai-key');
        const data = await response.json();
        console.log('API key response:', data);
        alert('API key test successful! Check console for details.');
    } catch (error) {
        console.error('API key test failed:', error);
        alert('API key test failed: ' + error.message);
    }
};

window.testFullAI = async () => {
    if (window.voiceConversation) {
        console.log('Testing full AI response flow...');
        await window.voiceConversation.testFullAIResponse();
    } else {
        console.error('VoiceConversation not initialized');
    }
};

window.testSpeechSynthesis = () => {
    console.log('=== SPEECH SYNTHESIS TEST ===');
    console.log('Speech synthesis available:', 'speechSynthesis' in window);
    console.log('Available voices:', speechSynthesis.getVoices().length);
    console.log('Speaking:', speechSynthesis.speaking);
    console.log('Pending:', speechSynthesis.pending);
    
    const utterance = new SpeechSynthesisUtterance('Hello! This is a test of speech synthesis.');
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    utterance.onstart = () => {
        console.log('Speech started successfully!');
        alert('Speech started! Check your speakers.');
    };
    
    utterance.onend = () => {
        console.log('Speech ended successfully!');
    };
    
    utterance.onerror = (event) => {
        console.error('Speech error:', event.error);
        alert('Speech error: ' + event.error);
    };
    
    console.log('Starting speech synthesis...');
    speechSynthesis.speak(utterance);
};

window.testQuickSpeech = () => {
    console.log('Quick speech test...');
    const utterance = new SpeechSynthesisUtterance('Quick test!');
    utterance.onstart = () => console.log('Quick test started');
    utterance.onend = () => console.log('Quick test ended');
    utterance.onerror = (event) => console.error('Quick test error:', event.error);
    speechSynthesis.speak(utterance);
};

// Handle page visibility changes to pause/resume speech
document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
    } else if (!document.hidden && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
    }
});

// Cleanup detection interval on page unload
window.addEventListener('beforeunload', () => {
    if (window.voiceConversation && window.voiceConversation.detectionInterval) {
        clearInterval(window.voiceConversation.detectionInterval);
    }
});