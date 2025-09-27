# AI Voice Conversation System with LiveKit

A modern web-based speech-to-text and text-to-speech AI conversation application built with vanilla JavaScript, Web Speech API, and LiveKit for real-time audio streaming.

## Features

- 🎤 **Speech-to-Text**: Click the microphone button to speak naturally
- 🔊 **Text-to-Speech**: AI responses are automatically spoken aloud
- 💬 **Real-time Conversation**: Interactive chat interface with AI
- 🌐 **LiveKit Integration**: Real-time audio streaming and processing
- ⚙️ **Customizable Settings**: Adjust voice, speech rate, and pitch
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🎨 **Modern UI**: Beautiful gradient design with smooth animations
- 🔄 **Real-time Audio Processing**: Advanced audio analysis and streaming

## Quick Start

### Option 1: Simple Setup (Web Speech API Only)
1. Open `index.html` in a modern web browser
2. Start speaking or typing messages
3. AI will respond with both text and speech

### Option 2: Full LiveKit + OpenAI Setup (Recommended)
1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Set up OpenAI API**:
   - Get your API key from https://platform.openai.com/api-keys
   - Create a `.env` file in the project root:
   ```bash
   cp env.example .env
   ```
   - Edit `.env` and add your OpenAI API key:
   ```
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

3. **Start LiveKit Server**:
   ```bash
   npm run dev
   ```

4. **Start Web Server** (in another terminal):
   ```bash
   npm run server
   ```

5. **Open Application**: Navigate to `http://localhost:3000`

6. **Start Speaking**: Click the microphone button and speak your message
7. **Type Messages**: Alternatively, type in the text area and click send
8. **Listen to Responses**: AI responses are automatically spoken aloud
9. **Customize Settings**: Click the settings button to adjust voice options

## Browser Compatibility

- **Chrome/Edge**: Full support for speech recognition and synthesis
- **Firefox**: Limited speech recognition support
- **Safari**: Basic support with some limitations
- **Mobile Browsers**: Works on iOS Safari and Android Chrome

## Technical Details

### Speech Recognition
- Uses Web Speech API for real-time speech-to-text conversion
- Supports continuous and interim results
- Configurable language settings (default: English US)

### Speech Synthesis
- Text-to-speech using Web Speech API
- Multiple voice options available
- Adjustable speech rate and pitch
- Automatic voice selection based on system preferences

### LiveKit Integration
- Real-time audio streaming and processing
- WebRTC-based audio communication
- Advanced audio analysis and level detection
- Room-based audio management
- Token-based authentication

### AI Response Generation
- **OpenAI GPT-3.5-turbo integration** for intelligent conversations
- **Conversation memory** - maintains context across messages
- **Error handling** - graceful fallbacks for API issues
- **Customizable personality** - easily modify AI behavior

## File Structure

```
├── index.html              # Main HTML structure
├── styles.css              # CSS styling and animations
├── script.js               # Main JavaScript functionality
├── livekit-integration.js  # LiveKit integration module
├── server.js               # Express server with OpenAI API integration
├── livekit.yaml           # LiveKit server configuration
├── package.json           # Node.js dependencies and scripts
├── env.example            # Environment variables template
└── README.md              # This documentation
```

## Customization

### Customizing AI Personality
Edit the system prompt in `server.js` to change AI behavior:

```javascript
{
    role: 'system',
    content: 'You are a helpful AI assistant in a voice conversation app. Keep your responses conversational, friendly, and concise (under 100 words). You can help with general questions, have casual conversations, and provide assistance on various topics.'
}
```

### Using Different AI Models
Modify the model in `server.js` to use different OpenAI models:

```javascript
const completion = await openai.chat.completions.create({
    model: 'gpt-4', // or 'gpt-3.5-turbo', 'gpt-4-turbo'
    messages: messages,
    max_tokens: 150,
    temperature: 0.7
});
```

### Styling Customization
Modify `styles.css` to change:
- Color schemes
- Font families
- Layout dimensions
- Animation effects

## Requirements

- Modern web browser with Web Speech API support
- Microphone access (for speech input)
- Internet connection (for voice synthesis)

## LiveKit Features

- **Real-time Audio Streaming**: High-quality audio transmission
- **Audio Level Detection**: Visual feedback based on speaking volume
- **Room Management**: Join/leave audio rooms dynamically
- **Token Authentication**: Secure access control
- **WebRTC Integration**: Low-latency audio communication
- **Audio Processing**: Real-time frequency analysis

## Future Enhancements

- [ ] Integration with external AI APIs (OpenAI, Claude, etc.)
- [ ] Multi-language support
- [ ] Conversation history persistence
- [ ] Voice command shortcuts
- [ ] Custom wake word detection
- [ ] Audio file export
- [ ] Conversation analytics
- [ ] Multi-participant conversations
- [ ] Audio effects and filters
- [ ] Voice cloning integration

## License

This project is open source and available under the MIT License.

## Contributing

Feel free to submit issues, feature requests, or pull requests to improve this application.
