# 🚀 Complete Installation Guide

## 📋 **What You Need to Install**

### **Step 1: Install Node.js Dependencies**
```bash
# Install all required packages
npm install
```

### **Step 2: Install LiveKit Server (Global)**
```bash
# Install LiveKit server globally
npm install -g livekit-server
```

### **Step 3: Get Gemini API Key**
1. Go to: https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

### **Step 4: Create Environment File**
```bash
# Copy the example file
cp env.example .env

# Edit .env and add your API key
# Replace 'your_gemini_api_key_here' with your actual key
```

## 🔧 **Complete Installation Commands**

Run these commands in order:

```bash
# 1. Install all dependencies
npm install

# 2. Install LiveKit server globally
npm install -g livekit-server

# 3. Create .env file
cp env.example .env

# 4. Edit .env file (add your Gemini API key)
# Use any text editor to edit .env

# 5. Start LiveKit server (Terminal 1)
npm run dev

# 6. Start web server (Terminal 2)
npm run server

# 7. Open application
# Navigate to: http://localhost:3000
```

## 🧪 **Test Your Installation**

### **Test 1: Basic Health Check**
```bash
curl http://localhost:3000/api/health
```
Should return: `{"status":"ok","gemini_configured":true}`

### **Test 2: API Key Verification**
```bash
curl http://localhost:3000/api/verify-gemini
```
Should return: `{"status":"success","api_key_valid":true}`

### **Test 3: Voice Conversation**
1. Open http://localhost:3000
2. Click microphone button
3. Speak or type a message
4. AI should respond with voice and text

## 🔍 **Troubleshooting**

### **If npm install fails:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Try installing again
npm install
```

### **If LiveKit server fails:**
```bash
# Install LiveKit server globally
npm install -g livekit-server

# Or use npx (alternative)
npx livekit-server --dev
```

### **If Gemini API fails:**
1. Check your API key in .env file
2. Verify key format: should start with letters/numbers
3. Test at: http://localhost:3000/api/verify-gemini

## 📦 **What Gets Installed**

### **Dependencies:**
- `livekit-client` - LiveKit WebRTC client
- `livekit-server-sdk` - LiveKit server SDK
- `@google/generative-ai` - Gemini AI integration
- `dotenv` - Environment variable loader
- `express` - Web server framework

### **Dev Dependencies:**
- `http-server` - Static file server
- `concurrently` - Run multiple commands

### **Global Installation:**
- `livekit-server` - LiveKit development server (installed globally)

## 🎯 **Expected File Structure**

```
VT Hacks 13/
├── .env                    # Your API keys (create this)
├── .gitignore             # Git ignore rules
├── env.example            # Template for .env
├── package.json           # Dependencies
├── server.js              # Express server with Gemini
├── script.js              # Frontend JavaScript
├── livekit-integration.js # LiveKit integration
├── index.html             # Main HTML file
├── styles.css             # Styling
├── livekit.yaml           # LiveKit configuration
└── node_modules/          # Installed packages
```

## ✅ **Success Indicators**

You'll know everything is working when you see:

1. **Server starts without errors**
2. **"✅ Gemini API key is configured"** message
3. **Voice conversation works** (speak and get AI responses)
4. **LiveKit connection status** shows "Connected"

## 🆘 **Need Help?**

If you encounter issues:

1. **Check the console** for error messages
2. **Verify your .env file** has the correct API key
3. **Test individual components** using the test endpoints
4. **Check network connectivity** for API calls

## 🎉 **You're Ready!**

Once everything is installed and configured, you'll have a fully functional AI voice conversation system with:
- 🎤 Speech-to-text
- 🧠 Gemini AI responses  
- 🔊 Text-to-speech
- 🌐 Real-time audio streaming
- 💬 Conversation memory