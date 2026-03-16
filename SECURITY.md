# Security Configuration Guide

## 🔒 Important Security Notice

This extension requires sensitive API keys that should NEVER be committed to version control.

## Required Configuration

### 1. Firebase Configuration
Create your own Firebase project and replace placeholders in:
- `firebase-config.js`
- `firebase-local.js`

### 2. Razorpay Configuration  
Get your API keys from Razorpay dashboard and configure in:
- Firebase Remote Config (recommended)
- Local environment variables

### 3. Google OAuth
Set up OAuth credentials in Google Cloud Console.

## Setup Steps

1. **Copy config template:**
   ```bash
   cp config-template.js config.js
   ```

2. **Replace all placeholders:**
   - YOUR_FIREBASE_API_KEY_HERE
   - YOUR_RAZORPAY_KEY_ID_HERE  
   - YOUR_GOOGLE_OAUTH_CLIENT_ID_HERE

3. **Add config.js to .gitignore** (already done)

4. **Store secrets in Firebase Remote Config** (recommended for production)

## Security Best Practices

- ✅ Never commit API keys to version control
- ✅ Use environment variables or remote config
- ✅ Rotate keys regularly
- ✅ Use different keys for development/production
- ❌ Never log sensitive data to console
- ❌ Never include keys in client-side code

## Emergency Response

If keys are accidentally exposed:
1. Immediately revoke compromised keys
2. Generate new keys
3. Update all configurations
4. Review access logs