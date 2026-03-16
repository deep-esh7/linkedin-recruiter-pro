// Gmail OAuth and API Integration
class GmailOAuth {
  constructor(customClientId = null) {
    this.clientId = customClientId || '945873930122-qqqov98l0kuagvi52f5fs7tti7f6vslj.apps.googleusercontent.com';
    this.accessToken = null;
    this.isAuthenticated = false;
    console.log('GmailOAuth initialized with client ID:', this.clientId);
  }

  // Authenticate with Google OAuth
  async authenticate() {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          console.error('OAuth Error:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }
        
        if (token) {
          this.accessToken = token;
          this.isAuthenticated = true;
          console.log('✅ OAuth authentication successful');
          resolve(token);
        } else {
          reject(new Error('No access token received'));
        }
      });
    });
  }

  // Convert file to base64 for attachment
  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Create email message with attachment
  async createEmailMessage(to, subject, body, attachmentFile = null) {
    const boundary = 'boundary_' + Math.random().toString(36).substring(2);
    
    let message = [
      'MIME-Version: 1.0',
      `To: ${to}`,
      `Subject: ${subject}`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      body,
      ''
    ].join('\r\n');

    // Add attachment if provided
    if (attachmentFile) {
      const base64Content = await this.fileToBase64(attachmentFile);
      const fileName = attachmentFile.name;
      const mimeType = attachmentFile.type || 'application/octet-stream';
      
      message += [
        `--${boundary}`,
        `Content-Type: ${mimeType}; name="${fileName}"`,
        'Content-Transfer-Encoding: base64',
        `Content-Disposition: attachment; filename="${fileName}"`,
        '',
        base64Content,
        ''
      ].join('\r\n');
    }
    
    message += `--${boundary}--`;
    
    // Encode the message in base64url format
    return btoa(message).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  // Send email via Gmail API
  async sendEmail(to, subject, body, attachmentFile = null) {
    try {
      if (!this.isAuthenticated) {
        await this.authenticate();
      }

      const encodedMessage = await this.createEmailMessage(to, subject, body, attachmentFile);
      
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          raw: encodedMessage
        })
      });

      if (!response.ok) {
        throw new Error(`Gmail API Error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`✅ Email sent successfully to ${to}:`, result);
      return result;
      
    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error);
      throw error;
    }
  }

  // Send bulk emails with delay
  async sendBulkEmails(emails, subject, body, attachmentFile = null, delayMs = 2000) {
    const results = [];
    
    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      
      try {
        console.log(`📤 Sending email ${i + 1}/${emails.length} to: ${email}`);
        
        const result = await this.sendEmail(email, subject, body, attachmentFile);
        results.push({ email, status: 'success', result });
        
        // Update progress in popup
        chrome.runtime.sendMessage({
          action: 'updateSendingProgress',
          sent: i + 1,
          total: emails.length,
          currentEmail: email
        });
        
        // Add delay between emails to avoid rate limits
        if (i < emails.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        
      } catch (error) {
        console.error(`Failed to send to ${email}:`, error);
        results.push({ email, status: 'error', error: error.message });
      }
    }
    
    return results;
  }

  // Revoke authentication
  async revokeAuth() {
    if (this.accessToken) {
      chrome.identity.removeCachedAuthToken({ token: this.accessToken }, () => {
        this.accessToken = null;
        this.isAuthenticated = false;
        console.log('🔓 OAuth authentication revoked');
      });
    }
  }
}

// Make it available globally
window.GmailOAuth = GmailOAuth;