const express = require('express');
const path = require('path');
const { AccessToken } = require('livekit-server-sdk');
const OpenAI = require('openai');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// ========================================
// 🤖 OPENAI INITIALIZATION
// ========================================
// Initialize OpenAI with your API key from .env file
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// ========================================
// 🔐 GOOGLE OAUTH INITIALIZATION
// ========================================
// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// JWT secret for session tokens
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// ========================================
// 🌐 CORS CONFIGURATION
// ========================================
// Configure CORS to allow Google OAuth and frontend requests
app.use(cors({
    origin: true, // Allow all origins for development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// Additional CORS headers for Google OAuth
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

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

        // Prepare messages for OpenAI
        const messages = [
            {
                role: 'system',
                content: 'You are a helpful AI assistant in a voice conversation app. Keep your responses conversational, friendly, and concise (under 100 words). You can help with general questions, have casual conversations, and provide assistance on various topics.'
            },
            ...conversationHistory,
            {
                role: 'user',
                content: message
            }
        ];

        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: messages,
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
// 🔍 OPENAI API KEY VERIFICATION ENDPOINT
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
                instructions: 'Create a .env file with: OPENAI_API_KEY=your-actual-key-here'
            });
        }

        // Test the API key with a simple request
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'user', content: 'Say "OpenAI API key is working correctly" in exactly those words.' }
            ],
            max_tokens: 10
        });

        const testResponse = completion.choices[0].message.content;

        res.json({
            status: 'success',
            configured: true,
            api_key_valid: true,
            model: 'gpt-3.5-turbo',
            test_response: testResponse,
            usage: completion.usage,
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
// 🔐 AUTHENTICATION MIDDLEWARE
// ========================================
// Middleware to verify JWT tokens
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// ========================================
// 🔐 GOOGLE OAUTH ROUTES
// ========================================
// Google OAuth callback
app.post('/api/auth/google', async (req, res) => {
    try {
        const { credential } = req.body;
        
        if (!credential) {
            return res.status(400).json({ error: 'Credential is required' });
        }

        console.log('Received Google credential, verifying...');

        // Verify the Google ID token
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const { sub: googleId, email, name, picture } = payload;

        console.log('Google OAuth successful for user:', email);

        // Create user object
        const user = {
            id: googleId,
            email,
            name,
            picture,
            loginTime: new Date().toISOString()
        };

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: googleId, 
                email, 
                name 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user
        });

    } catch (error) {
        console.error('Google OAuth error:', error);
        
        // More specific error handling
        if (error.message.includes('Token used too early')) {
            return res.status(400).json({ 
                success: false,
                error: 'Token used too early. Please try again.' 
            });
        }
        
        if (error.message.includes('Invalid token')) {
            return res.status(400).json({ 
                success: false,
                error: 'Invalid Google token. Please try signing in again.' 
            });
        }

        res.status(500).json({ 
            success: false,
            error: 'Authentication failed. Please check your Google OAuth configuration.' 
        });
    }
});

// Verify JWT token
app.get('/api/auth/verify', authenticateToken, (req, res) => {
    res.json({
        valid: true,
        user: req.user
    });
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
    // Since we're using JWT, logout is handled client-side
    // In a production app, you might want to maintain a blacklist
    res.json({ success: true, message: 'Logged out successfully' });
});

// Get Google Client ID for frontend
app.get('/api/auth/google-client-id', (req, res) => {
    res.json({ clientId: process.env.GOOGLE_CLIENT_ID });
});

// Get OpenAI API Key for frontend
app.get('/api/openai-key', (req, res) => {
    res.json({ apiKey: process.env.OPENAI_API_KEY });
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
        console.log('📝 Create a .env file with: OPENAI_API_KEY=your-actual-key-here');
    }
});

// ========================================
// 📋 SETUP INSTRUCTIONS
// ========================================
/*
TO SET UP YOUR OPENAI API KEY:

1. Get your API key from: https://platform.openai.com/api-keys
2. Create a .env file in this directory
3. Add this line to .env: OPENAI_API_KEY=your-actual-key-here
4. Restart the server: npm run server
5. Test the key: http://localhost:3000/api/verify-openai

EXAMPLE .env FILE:
OPENAI_API_KEY=sk-your-actual-openai-key-here
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
PORT=3000
*/