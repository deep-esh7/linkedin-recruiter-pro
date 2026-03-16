# 🔥 Gmail OAuth Setup Instructions 

## IMPORTANT: Follow these steps to enable full automation!

### Step 1: Google Cloud Console Setup (5 minutes)

1. **Go to Google Cloud Console**: https://console.cloud.google.com/

2. **Create a new project**:
   - Click "Select a project" → "New Project"
   - Project name: "LinkedIn Gmail Extension"
   - Click "Create"

3. **Enable Gmail API**:
   - Go to "APIs & Services" → "Library"
   - Search "Gmail API" → Click it → Click "Enable"

4. **Create OAuth Credentials**:
   - Go to "APIs & Services" → "Credentials"
   - Click "+ Create Credentials" → "OAuth 2.0 Client IDs"
   - Configure consent screen if needed:
     - User Type: External → Create
     - App name: "LinkedIn Gmail Extension"
     - User support email: Your email
     - Developer contact: Your email → Save and Continue
   - Application type: "Chrome extension"
   - Name: "LinkedIn Gmail Extension"
   - Add your extension ID (from chrome://extensions/)
   - Click "Create"

5. **Copy Client ID**:
   - Copy the "Client ID" (ends with .apps.googleusercontent.com)

### Step 2: Update Extension

1. **Edit manifest.json**:
   ```json
   "oauth2": {
     "client_id": "PASTE_YOUR_CLIENT_ID_HERE",
     "scopes": [
       "https://www.googleapis.com/auth/gmail.send"
     ]
   }
   ```

2. **Reload extension** in chrome://extensions/

### Step 3: Test Authentication

1. **Open extension popup**
2. **Click "🔐 Connect Gmail Account"**
3. **Login with Google** (popup will open)
4. **Grant permissions** to send emails
5. **Status should show "✅ Connected"**

### Step 4: Start Full Automation! 🚀

1. **Collect emails** from LinkedIn (as before)
2. **Fill subject and message**
3. **Select resume file** (will auto-attach to all emails!)
4. **Click "🚀 Start Automatic Sending"**
5. **Sit back and watch** - everything happens automatically!

## What happens with full automation:
- ✅ **Zero clicking** - completely automatic
- ✅ **Auto-attachment** - resume attached to every email
- ✅ **Progress tracking** - real-time progress bar
- ✅ **Error handling** - skips failed emails
- ✅ **Rate limiting** - 2 second delay between emails
- ✅ **Duplicate prevention** - never sends twice

## Troubleshooting:

**If OAuth fails:**
- Make sure Gmail API is enabled
- Check Client ID is correct in manifest.json
- Reload extension after manifest changes

**If sending fails:**
- Check Gmail API quotas in Google Cloud Console
- Verify your Google account has sending permissions

## Security Note:
Your OAuth token stays in your browser - extension never stores your credentials!