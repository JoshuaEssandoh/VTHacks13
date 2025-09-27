class LiveKitIntegration {
    constructor() {
        this.room = null;
        this.isConnected = false;
        this.audioTrack = null;
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.analysisActive = false;
        
        this.initializeElements();
        this.initializeLiveKit();
    }

    initializeElements() {
        this.connectionStatus = document.getElementById('connectionStatus');
        this.connectionText = document.getElementById('connectionText');
    }

    async initializeLiveKit() {
        try {
            // LiveKit configuration
            const config = {
                url: 'ws://localhost:7880',
                token: await this.generateToken(),
                audio: true,
                video: false,
                publishDefaults: {
                    audioPreset: {
                        maxBitrate: 32000,
                        priority: 'high'
                    }
                }
            };

            // Create room
            this.room = new LiveKit.Room();
            
            // Set up event listeners
            this.setupRoomEventListeners();
            
            // Connect to room
            await this.room.connect(config.url, config.token);
            
        } catch (error) {
            console.error('Failed to initialize LiveKit:', error);
            this.updateConnectionStatus('Connection failed', 'error');
        }
    }

    async generateToken() {
        // In a production environment, you would call your backend to generate a token
        // For development, we'll use a simple token generation
        const roomName = 'ai-conversation-room';
        const participantName = 'user-' + Math.random().toString(36).substr(2, 9);
        
        // This is a simplified token generation for development
        // In production, use LiveKit's server SDK to generate proper tokens
        return btoa(JSON.stringify({
            room: roomName,
            identity: participantName,
            exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
            iss: 'devkey',
            sub: 'devkey'
        }));
    }

    setupRoomEventListeners() {
        this.room.on(LiveKit.RoomEvent.Connected, () => {
            console.log('Connected to LiveKit room');
            this.isConnected = true;
            this.updateConnectionStatus('Connected to LiveKit', 'connected');
            this.setupAudioProcessing();
        });

        this.room.on(LiveKit.RoomEvent.Disconnected, (reason) => {
            console.log('Disconnected from LiveKit room:', reason);
            this.isConnected = false;
            this.updateConnectionStatus('Disconnected', 'error');
        });

        this.room.on(LiveKit.RoomEvent.TrackSubscribed, (track, publication, participant) => {
            console.log('Track subscribed:', track.kind);
            if (track.kind === LiveKit.Track.Kind.Audio) {
                this.handleAudioTrack(track);
            }
        });

        this.room.on(LiveKit.RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
            console.log('Track unsubscribed:', track.kind);
        });

        this.room.on(LiveKit.RoomEvent.ActiveSpeakersChanged, (speakers) => {
            console.log('Active speakers changed:', speakers);
        });
    }

    async setupAudioProcessing() {
        try {
            // Get user media
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 44100
                } 
            });

            // Create audio context for real-time processing
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.analyser.smoothingTimeConstant = 0.8;

            // Connect microphone to analyser
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            this.microphone.connect(this.analyser);

            // Connect analyser directly (no need for deprecated ScriptProcessor)
            // Audio analysis will be handled by requestAnimationFrame

            // Set up audio processing
            this.setupAudioAnalysis();

            // Publish audio track to LiveKit
            this.audioTrack = await LiveKit.createLocalAudioTrack({
                deviceId: stream.getAudioTracks()[0].getSettings().deviceId
            });
            
            await this.room.localParticipant.publishTrack(this.audioTrack);

        } catch (error) {
            console.error('Failed to setup audio processing:', error);
            this.updateConnectionStatus('Audio setup failed', 'error');
        }
    }

    setupAudioAnalysis() {
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        // Use requestAnimationFrame for audio analysis instead of deprecated onaudioprocess
        const analyzeAudio = () => {
            if (!this.analysisActive || !this.analyser) return;
            
            this.analyser.getByteFrequencyData(dataArray);
            
            // Calculate audio level
            const average = dataArray.reduce((a, b) => a + b) / bufferLength;
            const audioLevel = average / 255;
            
            // Update UI based on audio level
            this.updateAudioLevel(audioLevel);
            
            // Detect speech activity
            if (audioLevel > 0.01) {
                this.onSpeechDetected(audioLevel);
            }
            
            // Continue analysis
            requestAnimationFrame(analyzeAudio);
        };
        
        this.analysisActive = true;
        analyzeAudio();
    }

    updateAudioLevel(level) {
        // Update voice button visual feedback based on audio level
        const voiceButton = document.getElementById('voiceButton');
        if (voiceButton) {
            const intensity = Math.min(level * 10, 1);
            voiceButton.style.transform = `scale(${1 + intensity * 0.2})`;
            voiceButton.style.boxShadow = `0 0 ${intensity * 20}px rgba(102, 126, 234, ${intensity})`;
        }
    }

    onSpeechDetected(level) {
        // This can be used to trigger speech recognition or other actions
        console.log('Speech detected, level:', level);
    }

    handleAudioTrack(track) {
        // Handle incoming audio tracks from other participants
        const audioElement = track.attach();
        audioElement.play();
    }

    updateConnectionStatus(text, status) {
        this.connectionText.textContent = text;
        this.connectionStatus.className = `connection-status ${status}`;
    }

    async startAudioStreaming() {
        if (!this.isConnected) {
            console.warn('Not connected to LiveKit room');
            return false;
        }

        try {
            if (this.audioTrack) {
                await this.room.localParticipant.setMicrophoneEnabled(true);
                return true;
            }
        } catch (error) {
            console.error('Failed to start audio streaming:', error);
        }
        return false;
    }

    async stopAudioStreaming() {
        if (this.audioTrack) {
            await this.room.localParticipant.setMicrophoneEnabled(false);
        }
    }

    async disconnect() {
        this.analysisActive = false;
        
        if (this.room) {
            await this.room.disconnect();
        }
        
        if (this.audioContext) {
            await this.audioContext.close();
        }
        
        this.isConnected = false;
        this.updateConnectionStatus('Disconnected', 'error');
    }

    // Get real-time audio data for analysis
    getAudioData() {
        if (!this.analyser) return null;
        
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteFrequencyData(dataArray);
        
        return {
            frequencyData: dataArray,
            bufferLength: bufferLength,
            sampleRate: this.audioContext.sampleRate
        };
    }

    // Check if user is currently speaking
    isUserSpeaking() {
        if (!this.analyser) return false;
        
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteFrequencyData(dataArray);
        
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        return average > 5; // Threshold for speech detection
    }
}

// Export for use in main script
window.LiveKitIntegration = LiveKitIntegration;
