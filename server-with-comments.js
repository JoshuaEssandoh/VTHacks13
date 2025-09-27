const express = require('express');
const path = require('path');
const { AccessToken } = require('livekit-server-sdk');
const OpenAI = require('openai');

// ========================================
// 🔑 API KEY CONFIGURATION SECTION
// ========================================
// This loads environment variables from .env file
// Make sure you have a .env file with: OPENAI_API_KEY=sk-your-actual-key-here
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// ========================================
// 🤖 OPENAI INITIALIZATION
// ========================================
// This is where the OpenAI API key is loaded from environment variables
// The API key should be stored in your .env file as OPENAI_API_KEY
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY  // ← API key loaded from .env file
});

// ========================================
// 📝 MIDDLEWARE SETUP
// ========================================
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
// 🧠 OPENAI CHAT ENDPOINT
// ========================================
// This endpoint uses the OpenAI API key configured above
// It handles all AI conversations from the frontend
app.post('/api/ai-chat', async (req, res) => {
    try {
        const { message, conversationHistory = [] } = req.body;
        
        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // ========================================
        // 🔑 API KEY USAGE POINT
        // ========================================
        // This is where the OpenAI API key is actually used
        // If the API key is invalid, this will throw an error
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful AI assistant in a voice conversation app. Keep your responses conversational, friendly, and concise (under 100 words). You can help with general questions, have casual conversations, and provide assistance on various topics.'
                },
                ...conversationHistory,
                {
                    role: 'user',
                    content: message
                }
            ],
            max_tokens: 150,
            temperature: 0.7,
            presence_penalty: 0.1,
            frequency_penalty: 0.1
        });

        const aiResponse = completion.choices[0].message.content;
        
        res.json({ 
            response: aiResponse,
            usage: completion.usage
        });

    } catch (error) {
        console.error('OpenAI API Error:', error);
        
        // ========================================
        // 🚨 API KEY ERROR HANDLING
        // ========================================
        // These errors indicate API key issues
        if (error.code === 'insufficient_quota') {
            res.status(402).json({ 
                error: 'OpenAI API quota exceeded. Please check your billing.' 
            });
        } else if (error.code === 'invalid_api_key') {
            res.status(401).json({ 
                error: 'Invalid OpenAI API key. Please check your configuration.' 
            });
        } else {
            res.status(500).json({ 
                error: 'AI service temporarily unavailable. Please try again later.' 
            });
        }
    }
});

// ========================================
// 🔍 API KEY VERIFICATION ENDPOINT
// ========================================
// Add this endpoint to test if your API key is working
// Visit: http://localhost:3000/api/verify-openai
app.get('/api/verify-openai', async (req, res) => {
    try {
        // Check if API key is configured
        if (!process.env.OPENAI_API_KEY) {
            return res.status(400).json({ 
                error: 'OpenAI API key not configured in .env file',
                configured: false,
                instructions: 'Create a .env file with: OPENAI_API_KEY=sk-your-actual-key-here'
            });
        }

        // Test the API key with a simple request
        const testResponse = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'user', content: 'Say "API key is working correctly" in exactly those words.' }
            ],
            max_tokens: 10
        });

        res.json({
            status: 'success',
            configured: true,
            api_key_valid: true,
            model: 'gpt-3.5-turbo',
            test_response: testResponse.choices[0].message.content,
            usage: testResponse.usage,
            message: 'Your OpenAI API key is working correctly!'
        });

    } catch (error) {
        console.error('OpenAI API Key Verification Error:', error);
        
        let errorMessage = 'Unknown error';
        let errorCode = 'unknown';
        
        if (error.code === 'invalid_api_key') {
            errorMessage = 'Invalid API key. Please check your .env file.';
            errorCode = 'invalid_key';
        } else if (error.code === 'insufficient_quota') {
            errorMessage = 'API key has insufficient quota. Please add billing to your OpenAI account.';
            errorCode = 'insufficient_quota';
        } else if (error.code === 'rate_limit_exceeded') {
            errorMessage = 'Rate limit exceeded. Please try again later.';
            errorCode = 'rate_limit';
        } else {
            errorMessage = error.message || 'Failed to verify API key';
        }

        res.status(400).json({
            status: 'error',
            configured: !!process.env.OPENAI_API_KEY,
            api_key_valid: false,
            error: errorMessage,
            error_code: errorCode,
            instructions: 'Check your .env file and ensure OPENAI_API_KEY is set correctly'
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
        openai_configured: !!process.env.OPENAI_API_KEY,
        message: process.env.OPENAI_API_KEY ? 'API key is configured' : 'API key not found in .env file'
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
    if (process.env.OPENAI_API_KEY) {
        console.log('✅ OpenAI API key is configured');
        console.log(`🔍 To verify your API key, visit: http://localhost:${port}/api/verify-openai`);
    } else {
        console.log('❌ OpenAI API key not found in .env file');
        console.log('📝 Create a .env file with: OPENAI_API_KEY=sk-your-actual-key-here');
    }
});

// ========================================
// 📋 SETUP INSTRUCTIONS
// ========================================
/*
TO SET UP YOUR OPENAI API KEY:

1. Get your API key from: https://platform.openai.com/api-keys
2. Create a .env file in this directory
3. Add this line to .env: OPENAI_API_KEY=sk-your-actual-key-here
4. Restart the server: npm run server
5. Test the key: http://localhost:3000/api/verify-openai

EXAMPLE .env FILE:
OPENAI_API_KEY=sk-1234567890abcdef1234567890abcdef1234567890abcdef
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
PORT=3000
*/
