# 🔐 Google OAuth Setup Guide

This guide will help you set up Google OAuth authentication for your AI Voice Chat application.

## 📋 Prerequisites

- Google account
- Access to Google Cloud Console
- Your application already set up with OpenAI and LiveKit

## 🚀 Step-by-Step Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: `AI Voice Chat` (or your preferred name)
4. Click "Create"

### 2. Enable Google+ API

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click on it and press "Enable"

### 3. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. If prompted, configure the OAuth consent screen:
   - Choose "External" user type
   - Fill in required fields:
     - App name: `AI Voice Chat`
     - User support email: Your email
     - Developer contact: Your email
   - Add scopes: `email`, `profile`, `openid`
   - Add test users: Your email (for testing)

4. Create OAuth 2.0 Client ID:
   - Application type: "Web application"
   - Name: `AI Voice Chat Web Client`
   - Authorized JavaScript origins: `http://localhost:3001`
   - Authorized redirect URIs: `http://localhost:3001`
   - Click "Create"

### 4. Copy Your Credentials

1. After creating, you'll see a popup with your credentials
2. Copy the **Client ID** (looks like: `123456789-abcdefg.apps.googleusercontent.com`)
3. Keep this window open or copy the Client ID to a safe place

### 5. Update Your Environment Variables

1. Open your `.env` file
2. Add the Google Client ID:
   ```env
   GOOGLE_CLIENT_ID=your_actual_client_id_here
   ```

3. Generate a JWT secret (run this command in your terminal):
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

4. Add the JWT secret to your `.env` file:
   ```env
   JWT_SECRET=your_generated_jwt_secret_here
   ```

### 6. Install New Dependencies

```bash
npm install jsonwebtoken google-auth-library
```

### 7. Restart Your Server

```bash
npm run server
```

## 🧪 Testing the Setup

### 1. Test the Login Page

1. Go to `http://localhost:3001/login.html`
2. You should see a beautiful login page with a "Continue with Google" button
3. Click the button and complete the Google sign-in flow

### 2. Test Authentication Flow

1. After signing in, you should be redirected to the main app
2. You should see your name and profile picture in the header
3. Try using the voice chat features

### 3. Test Logout

1. Click the "Logout" button in the header
2. You should be redirected back to the login page

## 🔧 Troubleshooting

### Common Issues

**"Google OAuth not configured" error:**
- Check that `GOOGLE_CLIENT_ID` is set in your `.env` file
- Make sure the server is running
- Restart the server after adding the environment variable

**"Invalid client" error:**
- Verify the Client ID is correct in your `.env` file
- Check that the authorized origins include `http://localhost:3001`
- Make sure you're using the correct port (3001, not 3000)

**"Access blocked" error:**
- Add your email as a test user in the OAuth consent screen
- Make sure the OAuth consent screen is properly configured
- Check that the required scopes are added

**Login redirects but shows error:**
- Check the server console for error messages
- Verify that `JWT_SECRET` is set in your `.env` file
- Make sure all dependencies are installed

### Debug Steps

1. **Check server logs:**
   ```bash
   npm run server
   ```
   Look for any error messages related to Google OAuth

2. **Test API endpoints:**
   ```bash
   # Test Google Client ID endpoint
   curl http://localhost:3001/api/auth/google-client-id
   
   # Test health endpoint
   curl http://localhost:3001/api/health
   ```

3. **Check browser console:**
   - Open Developer Tools (F12)
   - Look for any JavaScript errors
   - Check the Network tab for failed requests

## 🚀 Production Deployment

For production deployment, you'll need to:

1. **Update OAuth settings:**
   - Add your production domain to authorized origins
   - Update redirect URIs for production
   - Publish your OAuth consent screen

2. **Environment variables:**
   - Set `GOOGLE_CLIENT_ID` to your production client ID
   - Use a strong, unique `JWT_SECRET`
   - Set `PORT` to your production port

3. **Security considerations:**
   - Use HTTPS in production
   - Implement proper CORS settings
   - Consider implementing token refresh
   - Add rate limiting

## 📚 Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)
- [JWT.io](https://jwt.io/) - For debugging JWT tokens

## ✅ Success Checklist

- [ ] Google Cloud project created
- [ ] Google+ API enabled
- [ ] OAuth 2.0 credentials created
- [ ] Client ID added to `.env` file
- [ ] JWT secret generated and added to `.env` file
- [ ] Dependencies installed (`jsonwebtoken`, `google-auth-library`)
- [ ] Server restarted
- [ ] Login page loads without errors
- [ ] Google sign-in works
- [ ] User is redirected to main app after login
- [ ] User info displays in header
- [ ] Logout works correctly

Once all items are checked, your Google OAuth integration is complete! 🎉
