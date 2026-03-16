document.addEventListener('DOMContentLoaded', function() {
  const emailList = document.getElementById('emailList');
  const emailCount = document.getElementById('emailCount');
  const clearBtn = document.getElementById('clearBtn');
  const copyAllBtn = document.getElementById('copyAllBtn');
  const exportBtn = document.getElementById('exportBtn');
  const searchInput = document.getElementById('searchInput');
  const debugBtn = document.getElementById('debugBtn');
  const autoScrollBtn = document.getElementById('autoScrollBtn');
  const startSearchBtn = document.getElementById('startSearchBtn');
  const searchKeywords = document.getElementById('searchKeywords');
  const dateFilter = document.getElementById('dateFilter');
  const emailSubject = document.getElementById('emailSubject');
  const emailMessage = document.getElementById('emailMessage');
  const resumeFile = document.getElementById('resumeFile');
  const selectFileBtn = document.getElementById('selectFileBtn');
  const fileName = document.getElementById('fileName');
  const startSendingBtn = document.getElementById('startSendingBtn');
  const stopSendingBtn = document.getElementById('stopSendingBtn');
  const sentCount = document.getElementById('sentCount');
  const remainingCount = document.getElementById('remainingCount');
  const authenticateBtn = document.getElementById('authenticateBtn');
  const authStatus = document.getElementById('authStatus');
  const progressBar = document.getElementById('progressFill');
  const currentEmail = document.getElementById('currentEmail');
  const scheduleRadios = document.querySelectorAll('input[name="sendTime"]');
  const scheduleDateTime = document.getElementById('scheduleDateTime');
  const scheduleDate = document.getElementById('scheduleDate');
  const scheduleTime = document.getElementById('scheduleTime');
  const scheduleTimezone = document.getElementById('scheduleTimezone');
  const schedulePresets = document.querySelectorAll('.btn-preset');
  const scheduleStatus = document.getElementById('scheduleStatus');
  const manualEmails = document.getElementById('manualEmails');
  const addEmailsBtn = document.getElementById('addEmailsBtn');
  const clearAllEmailsBtn = document.getElementById('clearAllEmailsBtn');
  const addEmailsStatus = document.getElementById('addEmailsStatus');
  const importFileBtn = document.getElementById('importFileBtn');
  const importEmailFile = document.getElementById('importEmailFile');
  const settingsBtn = document.getElementById('settingsBtn');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const oauthSettings = document.getElementById('oauthSettings');
  const clientIdInput = document.getElementById('clientIdInput');
  const currentClientId = document.getElementById('currentClientId');
  const testOAuthBtn = document.getElementById('testOAuthBtn');
  const applyOAuthBtn = document.getElementById('applyOAuthBtn');
  const oauthStatus = document.getElementById('oauthStatus');
  const weeklyPlanBtn = document.getElementById('weeklyPlanBtn');
  const monthlyPlanBtn = document.getElementById('monthlyPlanBtn');
  const modalWeeklyBtn = document.getElementById('modalWeeklyBtn');
  const modalMonthlyBtn = document.getElementById('modalMonthlyBtn');
  const closePricingModal = document.getElementById('closePricingModal');
  
  let allEmails = [];
  let isAutoScrolling = false;
  let isSending = false;
  let sentEmails = new Set();
  let currentSendingIndex = 0;
  let selectedFile = null;
  let gmailOAuth = null;
  let isAuthenticated = false;
  let emailScheduler = null;
  let pricingManager = null;
  let firebaseManager = null;

  function updateEmailDisplay(emails = allEmails) {
    emailCount.textContent = `${emails.length} emails found`;
    
    if (emails.length === 0) {
      emailList.innerHTML = '<div class="no-emails">No emails found yet. Start scrolling on LinkedIn!</div>';
      return;
    }

    // Load email details for enhanced display (future use)
    chrome.storage.local.get(['emailDetails'], (result) => {
      const emailDetails = result.emailDetails || {};
      
      emailList.innerHTML = emails.map(email => {
        const details = emailDetails[email];
        let detailsHtml = '';
        
        // Build enhanced details display
        if (details) {
          const detailParts = [];
          if (details.posterName) detailParts.push(`<span class="detail-item"><strong>👤</strong> ${details.posterName}</span>`);
          if (details.company) detailParts.push(`<span class="detail-item"><strong>🏢</strong> ${details.company}</span>`);
          if (details.jobTitle) detailParts.push(`<span class="detail-item"><strong>💼</strong> ${details.jobTitle}</span>`);
          if (details.phoneNumber) detailParts.push(`<span class="detail-item"><strong>📞</strong> ${details.phoneNumber}</span>`);
          if (details.location) detailParts.push(`<span class="detail-item"><strong>📍</strong> ${details.location}</span>`);
          
          if (detailParts.length > 0) {
            detailsHtml = `<div class="email-details">${detailParts.join('')}</div>`;
          }
        }
        
        return `
          <div class="email-item" data-email="${email}">
            <div style="flex: 1;">
              <span class="email-text">${email}</span>
              ${detailsHtml}
            </div>
            <button class="copy-btn" data-email="${email}">Copy</button>
          </div>
        `;
      }).join('');

      document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const email = this.dataset.email;
          copyToClipboard(email);
          this.textContent = 'Copied!';
          this.classList.add('copied');
          setTimeout(() => {
            this.textContent = 'Copy';
            this.classList.remove('copied');
          }, 1500);
        });
      });
      
      // Add click handler for future detailed view (currently hidden)
      document.querySelectorAll('.email-item').forEach(item => {
        item.addEventListener('dblclick', function() {
          const email = this.dataset.email;
          showEmailDetails(email); // For future implementation
        });
      });
    });
  }
  
  // Function to show detailed email information (for future use)
  function showEmailDetails(email) {
    chrome.storage.local.get(['emailDetails'], (result) => {
      const emailDetails = result.emailDetails || {};
      const details = emailDetails[email];
      
      if (details) {
        console.log('Email details for', email, ':', details);
        // Future: Show popup or modal with full details
        // For now, just log to console for debugging
      } else {
        console.log('No additional details available for:', email);
      }
    });
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Copied to clipboard:', text);
    }).catch(err => {
      console.error('Failed to copy:', err);
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    });
  }

  function loadEmails() {
    chrome.storage.local.get(['emails', 'sentEmails'], (result) => {
      console.log('Loading emails from storage:', result);
      allEmails = result.emails || [];
      sentEmails = new Set(result.sentEmails || []);
      console.log('Loaded emails:', allEmails.length, 'emails');
      updateEmailDisplay();
      updateSendingStatus();
    });
  }

  // Save form data to storage
  function saveFormData() {
    const formData = {
      subject: emailSubject.value,
      message: emailMessage.value,
      keywords: searchKeywords.value,
      dateFilter: dateFilter.value
    };
    chrome.storage.local.set({ formData: formData });
    
    // Show save indicator
    showSaveIndicator();
  }
  
  // Show temporary save indicator
  function showSaveIndicator() {
    // Remove any existing indicator
    const existingIndicator = document.querySelector('.save-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }
    
    // Create new indicator
    const indicator = document.createElement('div');
    indicator.className = 'save-indicator';
    indicator.innerHTML = '💾 Saved';
    document.body.appendChild(indicator);
    
    // Remove after 2 seconds
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
      }
    }, 2000);
  }

  // Load form data from storage
  function loadFormData() {
    chrome.storage.local.get(['formData'], (result) => {
      if (result.formData) {
        const data = result.formData;
        if (data.subject) emailSubject.value = data.subject;
        if (data.message) emailMessage.value = data.message;
        if (data.keywords) searchKeywords.value = data.keywords;
        if (data.dateFilter) dateFilter.value = data.dateFilter;
        console.log('Form data restored:', data);
      }
    });
  }

  function updateSendingStatus() {
    const unsent = allEmails.filter(email => !sentEmails.has(email));
    sentCount.textContent = `Sent: ${sentEmails.size}`;
    remainingCount.textContent = `Remaining: ${unsent.length}`;
  }

  // Email validation function
  function isValidEmail(email) {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$/;
    return emailRegex.test(email.trim());
  }

  // Parse emails from text input
  function parseEmailsFromText(text) {
    // Split by newlines and commas, then clean up
    const emails = text
      .split(/[\n,]/)
      .map(email => email.trim())
      .filter(email => email.length > 0)
      .filter(email => isValidEmail(email))
      .map(email => email.toLowerCase());
    
    // Remove duplicates using Set
    return [...new Set(emails)];
  }

  // Add emails manually with duplicate checking
  function addEmailsManually() {
    const inputText = manualEmails.value.trim();
    
    if (!inputText) {
      showAddStatus('Please enter some emails to add!', 'error');
      return;
    }
    
    // Parse emails from input
    const newEmails = parseEmailsFromText(inputText);
    
    if (newEmails.length === 0) {
      showAddStatus('No valid email addresses found!', 'error');
      return;
    }
    
    // Check for duplicates and filter out existing emails
    const duplicates = [];
    const unique = [];
    
    newEmails.forEach(email => {
      if (allEmails.includes(email)) {
        duplicates.push(email);
      } else {
        unique.push(email);
      }
    });
    
    // Add unique emails to the list
    if (unique.length > 0) {
      allEmails = [...allEmails, ...unique];
      chrome.storage.local.set({ emails: allEmails });
      updateEmailDisplay();
      updateSendingStatus();
    }
    
    // Clear input
    manualEmails.value = '';
    
    // Show status message
    let statusMessage = '';
    let statusType = 'success';
    
    if (unique.length > 0 && duplicates.length > 0) {
      statusMessage = `✅ Added ${unique.length} new emails. ⚠️ Skipped ${duplicates.length} duplicates.`;
      statusType = 'info';
    } else if (unique.length > 0) {
      statusMessage = `✅ Added ${unique.length} new emails successfully!`;
      statusType = 'success';
    } else {
      statusMessage = `⚠️ All ${duplicates.length} emails were already in the list.`;
      statusType = 'info';
    }
    
    showAddStatus(statusMessage, statusType);
    console.log('Manual emails added:', { unique, duplicates, total: allEmails.length });
  }

  // Clear all emails
  function clearAllEmails() {
    if (allEmails.length === 0) {
      showAddStatus('Email list is already empty!', 'info');
      return;
    }
    
    const emailCount = allEmails.length;
    
    if (confirm(`Are you sure you want to clear all ${emailCount} emails?\n\nThis will also reset the sent emails tracking.`)) {
      allEmails = [];
      sentEmails = new Set();
      
      chrome.storage.local.set({ 
        emails: [], 
        sentEmails: [] 
      });
      
      updateEmailDisplay();
      updateSendingStatus();
      
      showAddStatus(`🗑️ Cleared ${emailCount} emails from the list.`, 'info');
      console.log('All emails cleared');
    }
  }

  // Import emails from file
  function importEmailsFromFile() {
    const file = importEmailFile.files[0];
    if (!file) {
      showAddStatus('Please select a file to import!', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      const fileContent = e.target.result;
      
      // Parse emails from file content
      const importedEmails = parseEmailsFromText(fileContent);
      
      if (importedEmails.length === 0) {
        showAddStatus('No valid email addresses found in the file!', 'error');
        return;
      }
      
      // Check for duplicates
      const duplicates = [];
      const unique = [];
      
      importedEmails.forEach(email => {
        if (allEmails.includes(email)) {
          duplicates.push(email);
        } else {
          unique.push(email);
        }
      });
      
      // Add unique emails
      if (unique.length > 0) {
        allEmails = [...allEmails, ...unique];
        chrome.storage.local.set({ emails: allEmails });
        updateEmailDisplay();
        updateSendingStatus();
      }
      
      // Show status
      let statusMessage = '';
      if (unique.length > 0 && duplicates.length > 0) {
        statusMessage = `📄 Imported ${unique.length} new emails from file. Skipped ${duplicates.length} duplicates.`;
      } else if (unique.length > 0) {
        statusMessage = `📄 Successfully imported ${unique.length} emails from file!`;
      } else {
        statusMessage = `⚠️ All ${duplicates.length} emails from file were already in the list.`;
      }
      
      showAddStatus(statusMessage, unique.length > 0 ? 'success' : 'info');
      console.log('File import completed:', { file: file.name, unique, duplicates, total: allEmails.length });
      
      // Clear file input
      importEmailFile.value = '';
    };
    
    reader.onerror = function() {
      showAddStatus('Error reading the file. Please try again.', 'error');
    };
    
    reader.readAsText(file);
  }

  // Show status message for email addition
  function showAddStatus(message, type = 'info') {
    addEmailsStatus.textContent = message;
    addEmailsStatus.className = `add-status ${type}`;
    
    // Clear after 5 seconds
    setTimeout(() => {
      addEmailsStatus.textContent = '';
      addEmailsStatus.className = 'add-status';
    }, 5000);
  }

  searchInput.addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    const filteredEmails = allEmails.filter(email => 
      email.toLowerCase().includes(searchTerm)
    );
    updateEmailDisplay(filteredEmails);
  });

  clearBtn.addEventListener('click', function() {
    if (confirm('Are you sure you want to clear all collected emails?')) {
      chrome.storage.local.set({ emails: [] }, () => {
        allEmails = [];
        updateEmailDisplay();
      });
    }
  });

  copyAllBtn.addEventListener('click', function() {
    if (allEmails.length === 0) {
      alert('No emails to copy!');
      return;
    }
    
    const emailText = allEmails.join('\n');
    copyToClipboard(emailText);
    
    this.textContent = 'Copied!';
    this.classList.add('copied');
    setTimeout(() => {
      this.textContent = 'Copy All';
      this.classList.remove('copied');
    }, 1500);
  });

  exportBtn.addEventListener('click', function() {
    if (allEmails.length === 0) {
      alert('No emails to export!');
      return;
    }
    
    // Get detailed email data
    chrome.storage.local.get(['emails', 'emailDetails'], (result) => {
      const emails = result.emails || [];
      const emailDetails = result.emailDetails || {};
      
      // Create CSV content
      let csvContent = 'Email,Poster Name,Company,Job Title,Location,Phone Number,Source,Timestamp,Post Text\n';
      
      emails.forEach(email => {
        const details = emailDetails[email] || {};
        const row = [
          email,
          (details.posterName || '').replace(/,/g, ';'),
          (details.company || '').replace(/,/g, ';'),
          (details.jobTitle || '').replace(/,/g, ';'),
          (details.location || '').replace(/,/g, ';'),
          details.phoneNumber || '',
          details.source || 'manual',
          details.timestamp ? new Date(details.timestamp).toLocaleString() : '',
          (details.postText || '').replace(/,/g, ';').substring(0, 100)
        ].map(field => `"${field}"`).join(',');
        csvContent += row + '\n';
      });
      
      // Download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `linkedin_emails_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Update button to show success
      this.textContent = '✅ Exported!';
      this.classList.add('copied');
      setTimeout(() => {
        this.textContent = '📥 Export CSV';
        this.classList.remove('copied');
      }, 2000);
    });
  });

  debugBtn.addEventListener('click', function() {
    chrome.storage.local.get(['emails', 'emailDetails'], (result) => {
      console.log('🔍 DEBUG STORAGE:', result);
      
      // Add test data if no emails exist
      if (!result.emails || result.emails.length === 0) {
        const testEmails = ['test@example.com', 'john.doe@company.com'];
        const testDetails = {
          'test@example.com': {
            posterName: 'Test User',
            company: 'Test Company',
            jobTitle: 'Software Engineer',
            phoneNumber: '+1-555-0123',
            location: 'New York, NY',
            source: 'linkedin_post',
            timestamp: Date.now()
          },
          'john.doe@company.com': {
            posterName: 'John Doe',
            company: 'Tech Corp',
            jobTitle: 'Flutter Developer',
            phoneNumber: '+1-555-0456',
            location: 'San Francisco, CA',
            source: 'linkedin_post',
            timestamp: Date.now()
          }
        };
        
        chrome.storage.local.set({ 
          emails: testEmails, 
          emailDetails: testDetails 
        }, () => {
          console.log('✅ Test data added');
          loadEmails(); // Reload emails
        });
        alert('No emails found! Added test data. Check popup again.');
      } else {
        alert(`Debug Info:\nEmails: ${(result.emails || []).length}\nDetails: ${Object.keys(result.emailDetails || {}).length}\nCheck console for full data`);
      }
    });
  });

  // OAuth Settings functionality
  function initializeOAuthSettings() {
    // Load current OAuth client ID
    loadCurrentClientId();
    
    settingsBtn.addEventListener('click', () => {
      oauthSettings.style.display = 'block';
      loadCurrentClientId();
    });
    
    closeSettingsBtn.addEventListener('click', () => {
      oauthSettings.style.display = 'none';
      oauthStatus.textContent = '';
      oauthStatus.className = 'oauth-status';
    });
    
    testOAuthBtn.addEventListener('click', testOAuthConnection);
    applyOAuthBtn.addEventListener('click', applyNewClientId);
  }
  
  function loadCurrentClientId() {
    chrome.storage.local.get(['customClientId'], (result) => {
      const storedClientId = result.customClientId;
      if (storedClientId) {
        currentClientId.textContent = storedClientId;
        clientIdInput.value = storedClientId;
      } else {
        // Load from manifest default
        currentClientId.textContent = '945873930122-qqqov98l0kuagvi52f5fs7tti7f6vslj.apps.googleusercontent.com';
        clientIdInput.value = '';
      }
    });
  }
  
  function testOAuthConnection() {
    const clientId = clientIdInput.value.trim();
    
    if (!clientId) {
      showOAuthStatus('Please enter a Client ID to test', 'error');
      return;
    }
    
    if (!isValidClientId(clientId)) {
      showOAuthStatus('Invalid Client ID format. Should end with .apps.googleusercontent.com', 'error');
      return;
    }
    
    showOAuthStatus('Testing connection...', 'info');
    
    // Test the OAuth connection
    try {
      // Simple validation test
      setTimeout(() => {
        showOAuthStatus('✅ Client ID format is valid. Click "Apply & Save" to use this key.', 'success');
      }, 1000);
    } catch (error) {
      showOAuthStatus('❌ Connection test failed: ' + error.message, 'error');
    }
  }
  
  function applyNewClientId() {
    const clientId = clientIdInput.value.trim();
    
    if (!clientId) {
      showOAuthStatus('Please enter a Client ID', 'error');
      return;
    }
    
    if (!isValidClientId(clientId)) {
      showOAuthStatus('Invalid Client ID format', 'error');
      return;
    }
    
    // Save to storage
    chrome.storage.local.set({ customClientId: clientId }, () => {
      showOAuthStatus('✅ OAuth Client ID updated successfully! Restart extension to take effect.', 'success');
      
      // Update the display
      currentClientId.textContent = clientId;
      
      // Update the OAuth instance if it exists
      if (gmailOAuth) {
        gmailOAuth.clientId = clientId;
      }
      
      // Clear authentication status to force re-auth
      isAuthenticated = false;
      authStatus.textContent = 'Not connected (new key applied)';
      authStatus.classList.remove('connected');
    });
  }
  
  function isValidClientId(clientId) {
    return clientId.includes('.apps.googleusercontent.com') && clientId.length > 20;
  }
  
  function showOAuthStatus(message, type) {
    oauthStatus.textContent = message;
    oauthStatus.className = `oauth-status ${type}`;
  }

  // Tab functionality
  function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetTab = button.getAttribute('data-tab');
        
        // Remove active class from all buttons and contents
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        // Add active class to clicked button and corresponding content
        button.classList.add('active');
        document.getElementById(targetTab + 'Tab').classList.add('active');
      });
    });
  }

  function updateAutoScrollButton() {
    if (isAutoScrolling) {
      autoScrollBtn.textContent = 'Stop Auto-Scroll';
      autoScrollBtn.classList.remove('btn-auto');
      autoScrollBtn.classList.add('btn-stop');
    } else {
      autoScrollBtn.textContent = 'Start Auto-Scroll';
      autoScrollBtn.classList.remove('btn-stop');
      autoScrollBtn.classList.add('btn-auto');
    }
  }


  autoScrollBtn.addEventListener('click', function() {
    console.log('Auto-scroll button clicked');
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (chrome.runtime.lastError) {
        console.error('Error querying tabs:', chrome.runtime.lastError);
        return;
      }
      
      if (!tabs[0] || !tabs[0].url.includes('linkedin.com')) {
        alert('Please navigate to LinkedIn first!');
        return;
      }
      
      console.log('Sending toggleAutoScroll message to tab:', tabs[0].id);
      chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleAutoScroll' }, function(response) {
        if (chrome.runtime.lastError) {
          console.log('Content script not ready, injecting and trying again...');
          // Inject content script and try again
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ['content.js']
          }, function() {
            if (chrome.runtime.lastError) {
              console.error('Failed to inject content script:', chrome.runtime.lastError);
              alert('Please refresh the LinkedIn page and try again.');
            } else {
              // Try again after injection
              setTimeout(() => {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleAutoScroll' }, function(response) {
                  if (response) {
                    isAutoScrolling = response.autoScrolling;
                    updateAutoScrollButton();
                  }
                });
              }, 1000);
            }
          });
          return;
        }
        
        console.log('Received response:', response);
        if (response) {
          isAutoScrolling = response.autoScrolling;
          updateAutoScrollButton();
        }
      });
    });
  });


  function checkAutoScrollStatus() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (!tabs[0] || !tabs[0].url.includes('linkedin.com')) {
        console.log('Not on LinkedIn page');
        return;
      }
      
      chrome.tabs.sendMessage(tabs[0].id, { action: 'getAutoScrollStatus' }, function(response) {
        if (chrome.runtime.lastError) {
          console.log('Content script not ready, injecting...');
          // Inject content script manually
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ['content.js']
          }, function() {
            if (chrome.runtime.lastError) {
              console.error('Failed to inject content script:', chrome.runtime.lastError);
            } else {
              console.log('Content script injected successfully');
              // Try again after injection
              setTimeout(() => {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'getAutoScrollStatus' }, function(response) {
                  if (response) {
                    isAutoScrolling = response.autoScrolling;
                    updateAutoScrollButton();
                  }
                });
              }, 1000);
            }
          });
          return;
        }
        
        if (response) {
          isAutoScrolling = response.autoScrolling;
          updateAutoScrollButton();
        }
      });
    });
  }

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.emails) {
      allEmails = changes.emails.newValue || [];
      updateEmailDisplay();
    }
  });

  startSearchBtn.addEventListener('click', function() {
    // Check usage before proceeding
    if (pricingManager) {
      pricingManager.checkUsageAndProceed('search', () => {
        executeLinkedInSearch();
      });
    } else {
      executeLinkedInSearch();
    }
  });
  
  function executeLinkedInSearch() {
    const keywords = searchKeywords.value.trim();
    const dateValue = dateFilter.value;
    
    if (!keywords) {
      alert('Please enter search keywords!');
      return;
    }
    
    // Encode the keywords for URL
    const encodedKeywords = encodeURIComponent(keywords);
    
    // Build the LinkedIn search URL
    const linkedinUrl = `https://www.linkedin.com/search/results/content/?keywords=${encodedKeywords}&origin=FACETED_SEARCH&datePosted=%5B%22${dateValue}%22%5D`;
    
    console.log('🔍 Opening LinkedIn search with usage tracking:', linkedinUrl);
    
    // Open LinkedIn search in new tab
    chrome.tabs.create({
      url: linkedinUrl,
      active: true
    }, function(tab) {
      console.log('LinkedIn search opened in tab:', tab.id);
      
      // Wait for page to load, then start auto-scroll
      console.log('Waiting for LinkedIn to load...');
      
      // Try multiple times to ensure it works
      let attempts = 0;
      const maxAttempts = 10;
      
      const tryStartAutoScroll = () => {
        attempts++;
        console.log(`Attempt ${attempts} to start auto-scroll on tab ${tab.id}`);
        
        chrome.tabs.sendMessage(tab.id, { action: 'toggleAutoScroll' }, function(response) {
          if (chrome.runtime.lastError) {
            console.log('Content script not ready, injecting...', chrome.runtime.lastError);
            
            // Inject content script
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['content.js']
            }, function() {
              if (chrome.runtime.lastError) {
                console.error('Failed to inject content script:', chrome.runtime.lastError);
                if (attempts < maxAttempts) {
                  setTimeout(tryStartAutoScroll, 2000);
                }
              } else {
                console.log('Content script injected successfully');
                // Try starting auto-scroll again after injection
                setTimeout(() => {
                  chrome.tabs.sendMessage(tab.id, { action: 'toggleAutoScroll' }, function(response) {
                    if (response) {
                      console.log('✅ Auto-scroll started successfully on new LinkedIn search tab');
                    } else {
                      console.log('⚠️ Auto-scroll response was empty, but command sent');
                    }
                  });
                }, 2000);
              }
            });
          } else {
            console.log('✅ Auto-scroll started immediately on new tab:', response);
          }
        });
      };
      
      // Start trying after 3 seconds
      setTimeout(tryStartAutoScroll, 3000);
      
      // Close popup after opening link
      window.close();
    });

  // File selection
  selectFileBtn.addEventListener('click', function() {
    resumeFile.click();
  });

  resumeFile.addEventListener('change', function(e) {
    if (e.target.files.length > 0) {
      selectedFile = e.target.files[0];
      fileName.textContent = selectedFile.name;
      
      // Save file name to storage
      chrome.storage.local.set({ selectedFileName: selectedFile.name });
    } else {
      selectedFile = null;
      fileName.textContent = 'No file selected';
      chrome.storage.local.remove('selectedFileName');
    }
  });

  // Auto-save form data on input
  emailSubject.addEventListener('input', saveFormData);
  emailMessage.addEventListener('input', saveFormData);
  searchKeywords.addEventListener('input', saveFormData);
  dateFilter.addEventListener('change', saveFormData);
  
  // Also save on blur (when user clicks away)
  emailSubject.addEventListener('blur', saveFormData);
  emailMessage.addEventListener('blur', saveFormData);

  // Initialize Gmail OAuth and Scheduler
  function initializeGmailOAuth() {
    // Load custom client ID if available
    chrome.storage.local.get(['customClientId'], (result) => {
      const customClientId = result.customClientId;
      if (customClientId) {
        // Update GmailOAuth with custom client ID
        gmailOAuth = new GmailOAuth(customClientId);
        console.log('Gmail OAuth initialized with custom client ID');
      } else {
        gmailOAuth = new GmailOAuth();
        console.log('Gmail OAuth initialized with default client ID');
      }
      emailScheduler = new EmailScheduler();
    });
  }

  // Initialize scheduling controls
  function initializeScheduling() {
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    scheduleDate.min = today;
    scheduleDate.value = today;
    
    // Set default time to 1 hour from now
    const now = new Date();
    now.setHours(now.getHours() + 1);
    scheduleTime.value = now.toTimeString().substring(0, 5);
    
    // Schedule radio button handlers
    scheduleRadios.forEach(radio => {
      radio.addEventListener('change', function() {
        if (this.value === 'scheduled') {
          scheduleDateTime.style.display = 'flex';
          updateScheduleStatus();
        } else {
          scheduleDateTime.style.display = 'none';
          scheduleStatus.textContent = '';
        }
      });
    });
    
    // Date/time change handlers
    scheduleDate.addEventListener('change', updateScheduleStatus);
    scheduleTime.addEventListener('change', updateScheduleStatus);
    scheduleTimezone.addEventListener('change', updateScheduleStatus);
    
    // Preset button handlers
    schedulePresets.forEach(button => {
      button.addEventListener('click', function() {
        const hours = parseInt(this.dataset.hours);
        setSchedulePreset(hours);
        
        // Update button state
        schedulePresets.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
      });
    });
  }

  // Set schedule preset
  function setSchedulePreset(hours) {
    const targetTime = new Date();
    targetTime.setHours(targetTime.getHours() + hours);
    
    scheduleDate.value = targetTime.toISOString().split('T')[0];
    scheduleTime.value = targetTime.toTimeString().substring(0, 5);
    
    // Select scheduled option
    document.querySelector('input[name="sendTime"][value="scheduled"]').checked = true;
    scheduleDateTime.style.display = 'flex';
    
    updateScheduleStatus();
  }

  // Update schedule status display
  function updateScheduleStatus() {
    if (!scheduleDate.value || !scheduleTime.value) return;
    
    try {
      const scheduledDateTime = new Date(`${scheduleDate.value}T${scheduleTime.value}`);
      const now = new Date();
      
      if (scheduledDateTime <= now) {
        scheduleStatus.textContent = '⚠️ Scheduled time must be in the future';
        scheduleStatus.className = 'schedule-status';
        return;
      }
      
      const diffMs = scheduledDateTime - now;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      let timeLeft = '';
      if (diffHours > 0) {
        timeLeft = `${diffHours}h ${diffMins}m`;
      } else {
        timeLeft = `${diffMins}m`;
      }
      
      const formattedTime = scheduledDateTime.toLocaleString();
      scheduleStatus.textContent = `✅ Scheduled for ${formattedTime} (in ${timeLeft})`;
      scheduleStatus.className = 'schedule-status scheduled';
      
    } catch (error) {
      scheduleStatus.textContent = '❌ Invalid date/time';
      scheduleStatus.className = 'schedule-status';
    }
  }

  // Authenticate with Gmail
  async function authenticateGmail() {
    try {
      authenticateBtn.textContent = '🔄 Connecting...';
      authenticateBtn.disabled = true;
      
      await gmailOAuth.authenticate();
      
      isAuthenticated = true;
      authStatus.textContent = '✅ Connected';
      authStatus.classList.add('connected');
      authenticateBtn.textContent = '🔐 Connected';
      startSendingBtn.disabled = false;
      
      console.log('Gmail authentication successful');
      
    } catch (error) {
      console.error('Authentication failed:', error);
      authStatus.textContent = '❌ Failed';
      authenticateBtn.textContent = '🔐 Retry Connection';
      authenticateBtn.disabled = false;
      alert('Gmail authentication failed. Please try again.');
    }
  }

  // Update progress bar and status
  function updateProgress(sent, total, email) {
    const percentage = (sent / total) * 100;
    progressBar.style.width = `${percentage}%`;
    currentEmail.textContent = `Sending to: ${email}`;
    
    sentCount.textContent = `Sent: ${sent}`;
    remainingCount.textContent = `Remaining: ${total - sent}`;
  }

  // Automatic email sending with OAuth (with scheduling support)
  async function sendEmailsAutomatically() {
    const unsent = allEmails.filter(email => !sentEmails.has(email));
    
    if (unsent.length === 0) {
      alert('All emails have been sent!');
      stopSending();
      return;
    }

    const subject = emailSubject.value.trim();
    const message = emailMessage.value.trim();

    if (!subject || !message) {
      alert('Please enter subject and message!');
      return;
    }

    if (!isAuthenticated) {
      alert('Please connect your Gmail account first!');
      return;
    }

    // Check if scheduling is enabled
    const sendTimeOption = document.querySelector('input[name="sendTime"]:checked').value;
    
    if (sendTimeOption === 'scheduled') {
      return await scheduleEmailSending(unsent, subject, message);
    } else {
      return await sendEmailsNow(unsent, subject, message);
    }
  }

  // Schedule emails for later
  async function scheduleEmailSending(emails, subject, message) {
    try {
      if (!scheduleDate.value || !scheduleTime.value) {
        alert('Please select a date and time for scheduling!');
        return;
      }

      const scheduledDateTime = new Date(`${scheduleDate.value}T${scheduleTime.value}`);
      const timezone = scheduleTimezone.value;
      
      if (scheduledDateTime <= new Date()) {
        alert('Scheduled time must be in the future!');
        return;
      }

      const jobId = await emailScheduler.scheduleEmails(
        emails,
        subject,
        message,
        selectedFile,
        scheduledDateTime,
        timezone
      );

      const formattedTime = scheduledDateTime.toLocaleString();
      currentEmail.textContent = `✅ Emails scheduled for ${formattedTime}`;
      
      alert(`📅 Emails scheduled successfully!\n⏰ Sending at: ${formattedTime}\n📧 Recipients: ${emails.length}\n🆔 Job ID: ${jobId}`);
      
      // Reset to "Send Now" option
      document.querySelector('input[name="sendTime"][value="now"]').checked = true;
      scheduleDateTime.style.display = 'none';
      scheduleStatus.textContent = '';
      
    } catch (error) {
      console.error('Email scheduling failed:', error);
      alert(`❌ Email scheduling failed: ${error.message}`);
    }
  }

  // Send emails immediately
  async function sendEmailsNow(emails, subject, message) {
    isSending = true;
    startSendingBtn.textContent = '📤 Sending...';
    startSendingBtn.disabled = true;
    stopSendingBtn.style.display = 'block';
    
    try {
      console.log(`🚀 Starting immediate email sending to ${emails.length} recipients`);
      
      // Send emails using Gmail API
      const results = await gmailOAuth.sendBulkEmails(
        emails, 
        subject, 
        message, 
        selectedFile, // Attachment file
        2000 // 2 second delay between emails
      );
      
      // Update sent emails tracking
      const successfulSends = results.filter(r => r.status === 'success');
      successfulSends.forEach(result => {
        sentEmails.add(result.email);
      });
      
      chrome.storage.local.set({ sentEmails: Array.from(sentEmails) });
      updateSendingStatus();
      
      // Show results
      const successful = successfulSends.length;
      const failed = results.length - successful;
      
      currentEmail.textContent = `✅ Complete: ${successful} sent, ${failed} failed`;
      
      if (failed > 0) {
        console.log('Failed emails:', results.filter(r => r.status === 'error'));
      }
      
      alert(`📧 Email sending complete!\n✅ Sent: ${successful}\n❌ Failed: ${failed}`);
      
    } catch (error) {
      console.error('Bulk email sending failed:', error);
      alert('Email sending failed. Please check console for details.');
    }
    
    stopSending();
  }

  function stopSending() {
    isSending = false;
    startSendingBtn.textContent = '🚀 Start Automatic Sending';
    startSendingBtn.disabled = !isAuthenticated;
    stopSendingBtn.style.display = 'none';
    progressBar.style.width = '0%';
    console.log('Email sending stopped');
  }

  // Event listeners for manual email addition
  addEmailsBtn.addEventListener('click', addEmailsManually);
  clearAllEmailsBtn.addEventListener('click', clearAllEmails);
  importFileBtn.addEventListener('click', function() {
    importEmailFile.click();
  });
  importEmailFile.addEventListener('change', importEmailsFromFile);
  
  // Allow Enter key to add emails in textarea
  manualEmails.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      addEmailsManually();
    }
  });

  // Event listeners for Gmail automation  
  authenticateBtn.addEventListener('click', authenticateGmail);
  startSendingBtn.addEventListener('click', function() {
    // Check usage before proceeding with Gmail automation
    if (pricingManager) {
      pricingManager.checkUsageAndProceed('gmail', () => {
        sendEmailsAutomatically();
      });
    } else {
      sendEmailsAutomatically();
    }
  });
  stopSendingBtn.addEventListener('click', stopSending);
  
  // Listen for progress updates from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateSendingProgress') {
      updateProgress(message.sent, message.total, message.currentEmail);
    }
  });

  // Load saved file name
  function loadSelectedFile() {
    chrome.storage.local.get(['selectedFileName'], (result) => {
      if (result.selectedFileName) {
        fileName.textContent = `📎 ${result.selectedFileName} (select again to use)`;
      }
    });
  }

  // Initialize pricing system
  async function initializePricingSystem() {
    try {
      pricingManager = new PricingManager();
      await pricingManager.initialize();
      console.log('✅ Pricing system initialized');
      
      // Update usage display
      await pricingManager.updateUsageDisplay();
      
      // Add payment event listeners
      if (weeklyPlanBtn) {
        weeklyPlanBtn.addEventListener('click', () => pricingManager.initiatePayment('weekly'));
      }
      if (monthlyPlanBtn) {
        monthlyPlanBtn.addEventListener('click', () => pricingManager.initiatePayment('monthly'));
      }
      if (modalWeeklyBtn) {
        modalWeeklyBtn.addEventListener('click', () => pricingManager.initiatePayment('weekly'));
      }
      if (modalMonthlyBtn) {
        modalMonthlyBtn.addEventListener('click', () => pricingManager.initiatePayment('monthly'));
      }
      if (closePricingModal) {
        closePricingModal.addEventListener('click', () => {
          document.getElementById('pricingModal').style.display = 'none';
        });
      }
      
    } catch (error) {
      console.error('❌ Failed to initialize pricing system:', error);
    }
  }

  // Wrap search functionality with usage tracking
  function performSearchWithTracking() {
    if (pricingManager) {
      pricingManager.checkUsageAndProceed('search', () => {
        // Original search functionality
        console.log('🔍 Performing search with usage tracking');
        // Add your original search logic here
      });
    } else {
      console.log('⚠️ Pricing system not initialized, proceeding without tracking');
    }
  }

  // Wrap Gmail functionality with usage tracking
  function performGmailWithTracking() {
    if (pricingManager) {
      pricingManager.checkUsageAndProceed('gmail', () => {
        // Original Gmail functionality
        console.log('📧 Performing Gmail automation with usage tracking');
        // Add your original Gmail logic here
      });
    } else {
      console.log('⚠️ Pricing system not initialized, proceeding without tracking');
    }
  }

  // Initialize
  initializeTabs();
  initializeOAuthSettings();
  initializePricingSystem(); // Initialize pricing first
  initializeGmailOAuth();
  initializeScheduling();
  checkAutoScrollStatus();
  loadEmails();
  loadFormData(); // Load saved form data
  loadSelectedFile(); // Load saved file name
});