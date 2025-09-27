# 🚀 Quick Start Guide

## ⚡ **3-Step Setup**

### **Step 1: Install & Setup**
```bash
# Install dependencies
npm install

# Run automated setup
npm run setup
```

### **Step 2: Add Your OpenAI API Key**
1. Get your API key from: https://platform.openai.com/api-keys
2. Edit `.env` file and replace `your_openai_api_key_here` with your actual key
3. Save the file

### **Step 3: Start the System**
```bash
# Start the server
npm run server

# Open in browser
# Navigate to: http://localhost:3000
```

## 🧪 **Test Your Setup**

### **Test API Key**
```bash
npm run test-api
```
Should return: `{"status":"success","api_key_valid":true}`

### **Test Health**
```bash
npm run test-health
```
Should return: `{"status":"ok","openai_configured":true}`

### **Test Voice Conversation**
1. Open http://localhost:3000
2. Click microphone button and speak
3. Or type a message and press send
4. AI should respond with both text and voice

## 🔧 **Available Commands**

```bash
npm run setup      # Automated setup
npm run server     # Start web server
npm run dev        # Start LiveKit server
npm run dev:full   # Start both servers
npm run test-api   # Test OpenAI API
npm run test-health # Test server health
```

## 🎯 **What You Get**

- 🎤 **Speech-to-Text** - Click microphone to speak
- 🧠 **AI Responses** - Powered by OpenAI GPT-3.5-turbo
- 🔊 **Text-to-Speech** - AI responses are spoken aloud
- 💬 **Conversation Memory** - Maintains context across messages
- 🌐 **Real-time Audio** - LiveKit integration for advanced audio

## 🆘 **Troubleshooting**

### **API Key Issues**
- Make sure your key starts with `sk-`
- Check you copied the entire key
- Verify billing is set up on OpenAI account

### **Server Won't Start**
- Check `.env` file exists
- Verify `OPENAI_API_KEY` is set correctly
- Run `npm install` if dependencies are missing

### **Voice Not Working**
- Check browser permissions for microphone
- Try typing instead of speaking
- Check browser console for errors

## 🎉 **You're Ready!**

Once you complete these steps, you'll have a fully functional AI voice conversation system!
