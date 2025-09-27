# AI Voice Conversation System with LiveKit

A modern web-based speech-to-text and text-to-speech AI conversation application built with vanilla JavaScript, Web Speech API, LiveKit for real-time audio streaming, and OpenAI GPT for intelligent responses.

## 🚀 Quick Start

### **3-Step Setup**
```bash
# 1. Install dependencies
npm install

# 2. Run automated setup
npm run setup

# 3. Add your OpenAI API key to .env file
# Get key from: https://platform.openai.com/api-keys

# 4. Start the system
npm run server
```

## ✨ Features

- 🎤 **Speech-to-Text**: Click the microphone button to speak naturally
- 🔊 **Text-to-Speech**: AI responses are automatically spoken aloud
- 💬 **Real-time Conversation**: Interactive chat interface with AI
- 🌐 **LiveKit Integration**: Real-time audio streaming and processing
- 🧠 **OpenAI GPT-3.5-turbo**: Intelligent AI responses
- ⚙️ **Customizable Settings**: Adjust voice, speech rate, and pitch
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🎨 **Modern UI**: Beautiful gradient design with smooth animations
- 🔄 **Real-time Audio Processing**: Advanced audio analysis and streaming
- 💭 **Conversation Memory**: Maintains context across messages

## 🛠️ Installation

### **Option 1: Automated Setup (Recommended)**
```bash
# Clone or download the project
# Navigate to project directory

# Install dependencies
npm install

# Run automated setup
npm run setup

# Edit .env file and add your OpenAI API key
# Start the system
npm run server
```

### **Option 2: Manual Setup**
```bash
# Install dependencies
npm install

# Create environment file
cp env.example .env

# Edit .env and add your OpenAI API key
# Get key from: https://platform.openai.com/api-keys

# Start the system
npm run server
```

## 🔑 API Key Setup

### **Get OpenAI API Key**
1. Visit: https://platform.openai.com/api-keys
2. Sign in with your OpenAI account
3. Click "Create new secret key"
4. Copy your API key (starts with `sk-`)

### **Configure Environment**
```bash
# Edit .env file
OPENAI_API_KEY=sk-your-actual-api-key-here
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
PORT=3000
```

## 🧪 Testing

### **Test API Integration**
```bash
# Test OpenAI API key
npm run test-api

# Test server health
npm run test-health

# Test voice conversation
# Open http://localhost:3000 and try speaking/typing
```

### **Expected Results**
- **API Test**: `{"status":"success","api_key_valid":true}`
- **Health Test**: `{"status":"ok","openai_configured":true}`
- **Voice Test**: AI responds to speech and text input

## 📦 Available Commands

```bash
npm run setup      # Automated setup and configuration
npm run server     # Start web server only
npm run dev        # Start LiveKit server only
npm run dev:full   # Start both LiveKit and web servers
npm run test-api   # Test OpenAI API connection
npm run test-health # Test server health status
npm run serve      # Start static file server
```

## 🏗️ Architecture

### **Frontend Components**
- **HTML/CSS/JavaScript**: Modern web interface
- **Web Speech API**: Speech-to-text and text-to-speech
- **LiveKit Client**: Real-time audio streaming

### **Backend Services**
- **Express Server**: API endpoints and static file serving
- **OpenAI Integration**: GPT-3.5-turbo for AI responses
- **LiveKit Server**: Real-time audio processing

### **AI Processing Pipeline**
```
User Speech → Web Speech API → OpenAI GPT → Text-to-Speech → Audio Output
     ↑                                    ↓
     └─────────── Conversation Loop ──────┘
```

## 🔧 Customization

### **AI Personality**
Edit the system prompt in `server.js`:
```javascript
{
    role: 'system',
    content: 'You are a helpful AI assistant in a voice conversation app...'
}
```

### **Voice Settings**
Modify voice parameters in the UI settings or `script.js`:
```javascript
utterance.rate = 1.0;    // Speech speed
utterance.pitch = 1.0;   // Voice pitch
utterance.voice = voice; // Voice selection
```

### **UI Styling**
Customize colors, fonts, and layout in `styles.css`:
```css
:root {
    --primary-color: #667eea;
    --secondary-color: #764ba2;
    --accent-color: #28a745;
}
```

## 📁 Project Structure

```
├── index.html              # Main HTML structure
├── styles.css              # CSS styling and animations
├── script.js               # Frontend JavaScript functionality
├── livekit-integration.js  # LiveKit integration module
├── server.js               # Express server with OpenAI integration
├── setup.js                # Automated setup script
├── livekit.yaml           # LiveKit server configuration
├── package.json           # Dependencies and scripts
├── .env                   # Environment variables (create this)
├── env.example            # Environment template
├── .gitignore             # Git ignore rules
├── QUICK_START.md         # Quick start guide
└── README.md              # This documentation
```

## 🔒 Security

- **API Key Protection**: Stored in `.env` file (gitignored)
- **Environment Variables**: Sensitive data not committed to version control
- **HTTPS Ready**: Configure SSL for production deployment

## 🚀 Deployment

### **Development**
```bash
npm run dev:full  # Start both servers
```

### **Production**
1. Set up production environment variables
2. Configure LiveKit Cloud or your own LiveKit server
3. Deploy to your preferred hosting platform
4. Set up SSL/HTTPS for secure connections

## 🆘 Troubleshooting

### **Common Issues**

**API Key Not Working**
- Verify key format (starts with `sk-`)
- Check billing status on OpenAI account
- Ensure `.env` file exists and is properly formatted

**Voice Not Working**
- Check browser microphone permissions
- Try typing instead of speaking
- Check browser console for errors

**Server Won't Start**
- Run `npm install` to install dependencies
- Check `.env` file exists
- Verify port 3000 is available

**LiveKit Connection Issues**
- LiveKit is optional for basic AI functionality
- Check LiveKit server is running
- Verify network connectivity

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Feel free to submit issues, feature requests, or pull requests to improve this application.

## 🎉 Acknowledgments

- **OpenAI** for GPT-3.5-turbo API
- **LiveKit** for real-time audio streaming
- **Web Speech API** for browser-based speech recognition
- **Express.js** for the web server framework