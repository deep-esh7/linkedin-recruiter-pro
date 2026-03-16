// Gmail content script for keyboard automation
let gmailAutomationActive = false;

function addKeyboardShortcuts() {
  document.addEventListener('keydown', function(event) {
    // Ctrl+Shift+Enter to send email quickly
    if (event.ctrlKey && event.shiftKey && event.key === 'Enter') {
      event.preventDefault();
      
      // Try to find and click the Send button
      const sendButtons = [
        'div[data-tooltip="Send ‪(Ctrl+Enter)‬"]',
        'div[role="button"][aria-label*="Send"]',
        'div[data-tooltip*="Send"]',
        'div[aria-label*="Send"]',
        '.T-I.J-J5-Ji.aoO.v7.T-I-atl.L3'
      ];
      
      for (let selector of sendButtons) {
        const sendBtn = document.querySelector(selector);
        if (sendBtn && sendBtn.offsetParent !== null) {
          console.log('Found send button, clicking...');
          sendBtn.click();
          
          // Close tab after sending
          setTimeout(() => {
            window.close();
          }, 1000);
          return;
        }
      }
      
      // Fallback: try Ctrl+Enter (Gmail's native shortcut)
      const ctrlEnterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      });
      document.dispatchEvent(ctrlEnterEvent);
      
      // Close tab after potential send
      setTimeout(() => {
        window.close();
      }, 1500);
    }
    
    // Ctrl+Shift+A to attach file quickly
    if (event.ctrlKey && event.shiftKey && event.key === 'A') {
      event.preventDefault();
      
      const attachButtons = [
        'div[data-tooltip="Attach files ‪(Ctrl+Shift+A)‬"]',
        'div[aria-label*="Attach"]',
        'div[data-tooltip*="Attach"]',
        'input[type="file"]'
      ];
      
      for (let selector of attachButtons) {
        const attachBtn = document.querySelector(selector);
        if (attachBtn && attachBtn.offsetParent !== null) {
          console.log('Found attach button, clicking...');
          attachBtn.click();
          
          // Show helpful message
          setTimeout(() => {
            const notification = document.createElement('div');
            notification.innerHTML = `
              <div style="position: fixed; top: 10px; right: 10px; background: #4CAF50; color: white; padding: 10px 15px; border-radius: 5px; z-index: 10000; font-family: Arial; font-size: 14px;">
                📎 Select your resume file<br>
                <small>Then press Ctrl+Shift+Enter to send</small>
              </div>
            `;
            document.body.appendChild(notification);
            
            // Remove notification after 3 seconds
            setTimeout(() => {
              if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
              }
            }, 3000);
          }, 500);
          return;
        }
      }
    }
    
    // Ctrl+Shift+R to quickly paste resume message (alternative)
    if (event.ctrlKey && event.shiftKey && event.key === 'R') {
      event.preventDefault();
      
      // Add resume mention to message if not already there
      const bodyElements = document.querySelectorAll('div[contenteditable="true"], textarea');
      bodyElements.forEach(element => {
        if (element.value !== undefined) {
          if (!element.value.includes('resume attached')) {
            element.value += '\n\nPlease find my resume attached for your review.';
          }
        } else {
          if (!element.innerHTML.includes('resume attached')) {
            element.innerHTML += '<br><br>Please find my resume attached for your review.';
          }
        }
      });
    }
  });
  
  console.log('Gmail automation shortcuts added:');
  console.log('- Ctrl+Shift+Enter: Send email and close tab');
  console.log('- Ctrl+Shift+A: Open file attachment dialog');
}

// Auto-fill message if URL contains parameters
function autoFillFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const body = urlParams.get('body');
  
  if (body) {
    setTimeout(() => {
      // Try to find and fill the compose body
      const bodySelectors = [
        'div[aria-label="Message Body"]',
        'div[contenteditable="true"]',
        '.Am.Al.editable'
      ];
      
      for (let selector of bodySelectors) {
        const bodyElement = document.querySelector(selector);
        if (bodyElement) {
          bodyElement.innerHTML = body.replace(/\n/g, '<br>');
          console.log('Message body auto-filled');
          break;
        }
      }
    }, 2000);
  }
}

// Initialize when Gmail loads
if (window.location.hostname === 'mail.google.com') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      addKeyboardShortcuts();
      autoFillFromUrl();
    });
  } else {
    addKeyboardShortcuts();
    autoFillFromUrl();
  }
}