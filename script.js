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
            console.log('Speech synthesis available:', 'speechSynthesis' in window);
            console.log('Available voices:', this.synthesis.getVoices().length);
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
        this.confidenceFill = document.getElementById('confidenceFill');
        this.confidenceText = document.getElementById('confidenceText');
        this.currentPageText = ''; // Store current page text for questions
        this.teachableModel = null;
        this.maxPredictions = 0;
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
            
            // Load Teachable Machine model
            await this.loadTeachableModel();
            
            // Start book detection after a short delay to ensure webcam is ready
            setTimeout(() => {
                this.startBookDetection();
            }, 1000);
            
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
        
        this.confidenceText.textContent = 'AI model loaded! Position a book in view.';
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
            console.log('About to speak AI response:', aiResponse);
            this.speakText(aiResponse);
            
            // Fallback: ensure microphone restarts even if speech synthesis fails
            setTimeout(() => {
                if (!this.isListening && !this.isSpeaking) {
                    console.log('Fallback: restarting microphone after AI response');
                    this.autoRestartListening();
                }
            }, 3000); // 3 second fallback
            
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
            icon.className = 'bookworm-avatar';
            icon.innerHTML = '🐛';
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
                    <div class="bookworm-avatar">🐛</div>
                    <p>Hi there, little reader! 👋 I'm your friendly bookworm friend! I love books so much that I eat them... just kidding! 😄 I read them to you instead! Just show me a book page and say "read this page" or "what do you see" and I'll tell you all about it! Let's go on a reading adventure together! 📚✨</p>
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

// Cleanup detection interval on page unload
window.addEventListener('beforeunload', () => {
    if (window.voiceConversation && window.voiceConversation.detectionInterval) {
        clearInterval(window.voiceConversation.detectionInterval);
    }
});