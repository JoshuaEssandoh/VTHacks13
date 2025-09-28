# StoryVue – AI Reading Assistant

An AI-powered reading assistant for visually impaired children with voice conversations, OCR-based book reading, and educational Q&A.

## Quick Start

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

## Features

- **Speech-to-Text**: Click the microphone button to speak naturally
- **Text-to-Speech**: AI responses are automatically spoken aloud
- **Real-time Conversation**: Interactive chat interface with AI
- **LiveKit Integration**: Real-time audio streaming and processing
- **OpenAI GPT-3.5-turbo**: Intelligent AI responses
- **Customizable Settings**: Adjust voice, speech rate, and pitch
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Audio Processing**: Advanced audio analysis and streaming
- **Conversation Memory**: Maintains context across messages

## Installation

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

## API Key Setup

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

## Architecture

### **Frontend:**
- HTML5, CSS3, JavaScript (ES6+)
- Web Speech API (voice recognition + synthesis)
- Tesseract.js (OCR)
- TensorFlow.js (ML models)

### **Backend:**
- Node.js + Express.js
- OpenAI API (conversational AI)
- Google OAuth 2.0
- LiveKit (real-time audio processing)

### **AI Processing Pipeline**
```
User Speech → Web Speech API → OpenAI GPT → Text-to-Speech → Audio Output
     ↑                                    ↓
     └─────────── Conversation Loop ──────┘
```

## Deployment

### **Development**
```bash
npm run dev:full  # Start both servers
```

### **Production**
1. Set up production environment variables
2. Configure LiveKit Cloud or your own LiveKit server
3. Deploy to your preferred hosting platform
4. Set up SSL/HTTPS for secure connections

## Troubleshooting

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

## License

This project is open source and available under the MIT License.

## Contributing

Feel free to submit issues, feature requests, or pull requests to improve this application.

## Acknowledgments

- **OpenAI** for GPT-3.5-turbo API
- **LiveKit** for real-time audio streaming
- **Web Speech API** for browser-based speech recognition
- **Express.js** for the web server framework
