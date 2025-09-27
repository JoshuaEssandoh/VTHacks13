#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

console.log('🚀 AI Voice Conversation Setup');
console.log('================================\n');

// Check if .env already exists
if (fs.existsSync('.env')) {
    console.log('✅ .env file already exists');
    console.log('📝 Please edit .env and add your OpenAI API key\n');
} else {
    console.log('📝 Creating .env file...');
    
    // Create .env file content
    const envContent = `# ========================================
# 🔑 ENVIRONMENT CONFIGURATION FILE
# ========================================
# This file contains sensitive configuration data
# DO NOT commit this file to version control

# ========================================
# 🤖 OPENAI API CONFIGURATION
# ========================================
# Get your API key from: https://platform.openai.com/api-keys
# Replace 'your_openai_api_key_here' with your actual API key
# Format: sk- followed by 48 characters
OPENAI_API_KEY=your_openai_api_key_here

# ========================================
# 🌐 LIVEKIT CONFIGURATION
# ========================================
# These are development settings for LiveKit
# For production, use LiveKit Cloud or your own server
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret

# ========================================
# 🚀 SERVER CONFIGURATION
# ========================================
# Port for the web server (default: 3000)
PORT=3000

# ========================================
# 📝 SETUP INSTRUCTIONS
# ========================================
# 1. Replace 'your_openai_api_key_here' with your actual OpenAI API key
# 2. Get your API key from: https://platform.openai.com/api-keys
# 3. Make sure your API key starts with 'sk-'
# 4. Save this file
# 5. Restart your server: npm run server
# 6. Test the configuration: http://localhost:3000/api/verify-openai`;

    fs.writeFileSync('.env', envContent);
    console.log('✅ .env file created successfully\n');
}

// Check if node_modules exists
if (fs.existsSync('node_modules')) {
    console.log('✅ Dependencies already installed');
} else {
    console.log('📦 Installing dependencies...');
    console.log('   Run: npm install\n');
}

console.log('🔧 Next Steps:');
console.log('1. Get your OpenAI API key from: https://platform.openai.com/api-keys');
console.log('2. Edit .env file and replace "your_openai_api_key_here" with your actual key');
console.log('3. Run: npm run server');
console.log('4. Open: http://localhost:3000');
console.log('5. Test your API key: http://localhost:3000/api/verify-openai\n');

console.log('🎉 Setup complete! Your AI voice conversation system is ready.');
