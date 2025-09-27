const express = require('express');
const path = require('path');
const { AccessToken } = require('livekit-server-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// ========================================
// 🤖 GEMINI AI INITIALIZATION
// ========================================
// Initialize Gemini AI with your API key from .env file
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Middleware
app.use(express.json());
app.use(express.static('.'));

// ========================================
// 🔐 LIVEKIT TOKEN GENERATION
// ========================================
app.post('/api/token', (req, res) => {
    try {
        const { roomName, participantName } = req.body;
        
        const token = new AccessToken('devkey', 'secret', {
            identity: participantName,
            ttl: '1h',
        });
        
        token.addGrant({
            room: roomName,
            roomJoin: true,
            canPublish: true,
            canSubscribe: true,
        });
        
        const jwt = token.toJwt();
        
        res.json({
            token: jwt,
            url: 'ws://localhost:7880'
        });
    } catch (error) {
        console.error('Error generating token:', error);
        res.status(500).json({ error: 'Failed to generate token' });
    }
});

// ========================================
// 🧠 GEMINI CHAT ENDPOINT
// ========================================
// This endpoint uses the Gemini API key configured above
// It handles all AI conversations from the frontend
app.post('/api/ai-chat', async (req, res) => {
    try {
        const { message, conversationHistory = [] } = req.body;
        
        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Get the Gemini model
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        // Build conversation context
        let conversationText = "You are a helpful AI assistant in a voice conversation app. Keep your responses conversational, friendly, and concise (under 100 words).\n\n";
        
        // Add conversation history
        conversationHistory.forEach(msg => {
            conversationText += `${msg.role}: ${msg.content}\n`;
        });
        
        // Add current message
        conversationText += `user: ${message}\nassistant:`;

        const result = await model.generateContent(conversationText);
        const response = await result.response;
        const aiResponse = response.text();

        res.json({ 
            response: aiResponse,
            model: 'gemini-pro'
        });

    } catch (error) {
        console.error('Gemini API Error:', error);
        
        // ========================================
        // 🚨 API KEY ERROR HANDLING
        // ========================================
        if (error.message?.includes('API_KEY_INVALID')) {
            res.status(401).json({ 
                error: 'Invalid Gemini API key. Please check your configuration.' 
            });
        } else if (error.message?.includes('QUOTA_EXCEEDED')) {
            res.status(402).json({ 
                error: 'Gemini API quota exceeded. Please check your billing.' 
            });
        } else {
            res.status(500).json({ 
                error: 'AI service temporarily unavailable. Please try again later.' 
            });
        }
    }
});

// ========================================
// 🔍 GEMINI API KEY VERIFICATION ENDPOINT
// ========================================
// Add this endpoint to test if your API key is working
// Visit: http://localhost:3000/api/verify-gemini
app.get('/api/verify-gemini', async (req, res) => {
    try {
        // Check if API key is configured
        if (!process.env.GEMINI_API_KEY) {
            return res.status(400).json({ 
                error: 'Gemini API key not configured in .env file',
                configured: false,
                instructions: 'Create a .env file with: GEMINI_API_KEY=your-actual-key-here'
            });
        }

        // Test the API key with a simple request
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Say 'Gemini API key is working correctly' in exactly those words.");
        const response = await result.response;
        const testResponse = response.text();

        res.json({
            status: 'success',
            configured: true,
            api_key_valid: true,
            model: 'gemini-pro',
            test_response: testResponse,
            message: 'Your Gemini API key is working correctly!'
        });

    } catch (error) {
        console.error('Gemini API Key Verification Error:', error);
        
        let errorMessage = 'Unknown error';
        let errorCode = 'unknown';
        
        if (error.message?.includes('API_KEY_INVALID')) {
            errorMessage = 'Invalid API key. Please check your .env file.';
            errorCode = 'invalid_key';
        } else if (error.message?.includes('QUOTA_EXCEEDED')) {
            errorMessage = 'API key has insufficient quota. Please check your billing.';
            errorCode = 'insufficient_quota';
        } else {
            errorMessage = error.message || 'Failed to verify API key';
        }

        res.status(400).json({
            status: 'error',
            configured: !!process.env.GEMINI_API_KEY,
            api_key_valid: false,
            error: errorMessage,
            error_code: errorCode,
            instructions: 'Check your .env file and ensure GEMINI_API_KEY is set correctly'
        });
    }
});

// ========================================
// 🏥 HEALTH CHECK ENDPOINT
// ========================================
// This endpoint shows if the API key is configured (but not if it's valid)
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        gemini_configured: !!process.env.GEMINI_API_KEY,
        message: process.env.GEMINI_API_KEY ? 'API key is configured' : 'API key not found in .env file'
    });
});

// ========================================
// 🚀 SERVER STARTUP
// ========================================
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log('LiveKit server should be running on ws://localhost:7880');
    
    // ========================================
    // 🔑 API KEY STATUS ON STARTUP
    // ========================================
    if (process.env.GEMINI_API_KEY) {
        console.log('✅ Gemini API key is configured');
        console.log(`🔍 To verify your API key, visit: http://localhost:${port}/api/verify-gemini`);
    } else {
        console.log('❌ Gemini API key not found in .env file');
        console.log('📝 Create a .env file with: GEMINI_API_KEY=your-actual-key-here');
    }
});

// ========================================
// 📋 SETUP INSTRUCTIONS
// ========================================
/*
TO SET UP YOUR GEMINI API KEY:

1. Get your API key from: https://makersuite.google.com/app/apikey
2. Create a .env file in this directory
3. Add this line to .env: GEMINI_API_KEY=your-actual-key-here
4. Restart the server: npm run server
5. Test the key: http://localhost:3000/api/verify-gemini

EXAMPLE .env FILE:
GEMINI_API_KEY=your-actual-gemini-key-here
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
PORT=3000
*/