document.addEventListener('DOMContentLoaded', function() {
  // DOM elements
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
  const weeklyPlanBtn = document.getElementById('weeklyPlanBtn');
  const monthlyPlanBtn = document.getElementById('monthlyPlanBtn');
  const modalWeeklyBtn = document.getElementById('modalWeeklyBtn');
  const modalMonthlyBtn = document.getElementById('modalMonthlyBtn');
  const closePricingModal = document.getElementById('closePricingModal');
  const startSendingBtn = document.getElementById('startSendingBtn');
  const authenticateBtn = document.getElementById('authenticateBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  
  let allEmails = [];
  let isAutoScrolling = false;
  let pricingManager = null;
  let currentSearchSession = null; // Track if search was already paid for
  let isAutomationPaid = false; // Track if current email collection is paid

  // Basic email display function
  function updateEmailDisplay(emails = allEmails) {
    emailCount.textContent = `${emails.length} emails found`;
    
    if (emails.length === 0) {
      emailList.innerHTML = '<div class="no-emails">No emails found yet. Start scrolling on LinkedIn!</div>';
      return;
    }

    chrome.storage.local.get(['emailDetails'], (result) => {
      const emailDetails = result.emailDetails || {};
      
      emailList.innerHTML = emails.map(email => {
        const details = emailDetails[email];
        let detailsHtml = '';
        
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

      // Add copy button listeners
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
    });
  }

  // Copy to clipboard function
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

  // Load emails from storage
  function loadEmails() {
    chrome.storage.local.get(['emails'], (result) => {
      console.log('Loading emails from storage:', result);
      allEmails = result.emails || [];
      console.log('Loaded emails:', allEmails.length, 'emails');
      updateEmailDisplay();
    });
  }

  // Listen for real-time email updates
  chrome.storage.onChanged.addListener((changes, namespace) => {
    console.log('🔄 Storage change detected:', { namespace, changes: Object.keys(changes) });
    
    if (namespace === 'local') {
      if (changes.emails) {
        const oldCount = changes.emails.oldValue?.length || 0;
        const newCount = changes.emails.newValue?.length || 0;
        console.log(`📧 Email count changed: ${oldCount} → ${newCount}`);
        
        allEmails = changes.emails.newValue || [];
        updateEmailDisplay();
        
        // Update email count in real-time
        emailCount.textContent = `${newCount} emails found`;
      }
      
      if (changes.emailDetails) {
        console.log('📧 Email details updated');
        updateEmailDisplay(); // Refresh display with new details
      }
    }
  });

  // Also poll for updates every 2 seconds as fallback
  setInterval(() => {
    chrome.storage.local.get(['emails'], (result) => {
      const currentEmails = result.emails || [];
      if (currentEmails.length !== allEmails.length) {
        console.log(`🔄 Polling detected email change: ${allEmails.length} → ${currentEmails.length}`);
        allEmails = currentEmails;
        updateEmailDisplay();
      }
    });
  }, 2000);

  // Clear all emails
  if (clearBtn) {
    clearBtn.addEventListener('click', function() {
      if (confirm('Clear all emails?')) {
        chrome.storage.local.set({ emails: [], emailDetails: {} });
        allEmails = [];
        updateEmailDisplay();
      }
    });
  }

  // Copy all emails
  if (copyAllBtn) {
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
  }

  // Export emails
  if (exportBtn) {
    exportBtn.addEventListener('click', function() {
      if (allEmails.length === 0) {
        alert('No emails to export!');
        return;
      }
      
      chrome.storage.local.get(['emails', 'emailDetails'], (result) => {
        const emails = result.emails || [];
        const emailDetails = result.emailDetails || {};
        
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
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `linkedin_emails_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.textContent = '✅ Exported!';
        this.classList.add('copied');
        setTimeout(() => {
          this.textContent = '📥 Export CSV';
          this.classList.remove('copied');
        }, 2000);
      });
    });
  }

  // Debug button - Enhanced with pricing test
  if (debugBtn) {
    debugBtn.addEventListener('click', function() {
      console.log('🔍 DEBUG: Starting comprehensive test...');
      
      // Test Firebase directly first
      fetch('https://linked-in-recruiter-pro-default-rtdb.asia-southeast1.firebasedatabase.app/config.json')
        .then(response => response.json())
        .then(config => {
          console.log('🔥 Firebase config loaded:', config);
          
          // Update display directly with Firebase values
          const searchUsage = document.getElementById('searchUsage');
          const gmailUsage = document.getElementById('gmailUsage');
          const searchLimit = document.getElementById('searchLimit');
          const gmailLimit = document.getElementById('gmailLimit');
          
          if (searchUsage) searchUsage.textContent = `${config.searchFreeLimit} searches left`;
          if (gmailUsage) gmailUsage.textContent = `${config.gmailFreeLimit} emails left`;
          if (searchLimit) searchLimit.textContent = config.searchFreeLimit;
          if (gmailLimit) gmailLimit.textContent = config.gmailFreeLimit;
          
          alert('✅ Firebase loaded! Limits updated');
        })
        .catch(error => {
          console.error('❌ Firebase failed:', error);
          alert('❌ Firebase connection failed - using defaults');
        });
      
      // Debug current search session
      console.log('🔍 Current search session:', currentSearchSession);
      if (currentSearchSession) {
        const sessionAge = Date.now() - currentSearchSession.timestamp;
        const remainingTime = 300000 - sessionAge; // 5 minutes - elapsed time
        console.log(`⏰ Session age: ${Math.round(sessionAge/1000)}s, remaining: ${Math.round(remainingTime/1000)}s`);
        console.log(`🔄 Auto-scroll used: ${currentSearchSession.autoScrollUsed}`);
      }
      
      // Original debug functionality for emails
      chrome.storage.local.get(['emails', 'emailDetails'], (result) => {
        console.log('🔍 DEBUG STORAGE:', result);
        
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
            loadEmails();
          });
          alert('No emails found! Added test data. Check popup again.');
        } else {
          alert(`Debug Info:\nEmails: ${(result.emails || []).length}\nDetails: ${Object.keys(result.emailDetails || {}).length}\nCheck console for full data`);
        }
      });
    });
  }

  
  // Extract search execution to separate function
  function executeSearch(keywords, dateValue) {
    // Create search session - user has paid for this search
    currentSearchSession = {
      sessionId: `search_${Date.now()}`,
      keywords: keywords,
      dateValue: dateValue,
      timestamp: Date.now(),
      tabId: null,
      autoScrollUsed: false
    };
    
    isAutomationPaid = true; // Mark automation as paid
    
    const encodedKeywords = encodeURIComponent(keywords);
    const linkedinUrl = `https://www.linkedin.com/search/results/content/?keywords=${encodedKeywords}&origin=FACETED_SEARCH&datePosted=%5B%22${dateValue}%22%5D`;
    
    console.log('🔍 Opening LinkedIn search (PAID SESSION):', linkedinUrl);
    console.log('💰 Search session created:', currentSearchSession.sessionId);
    console.log('✅ Automation marked as PAID');
    
    chrome.tabs.create({
      url: linkedinUrl,
      active: true
    }, function(tab) {
      console.log('LinkedIn search opened in tab:', tab.id);
      
      // Associate tab with paid session
      currentSearchSession.tabId = tab.id;
      
      // Enable email collection on this tab immediately
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, { action: 'enableEmailCollection' }, (response) => {
          console.log('✅ Email collection enabled on tab:', tab.id);
        });
      }, 2000);
      
      setTimeout(() => {
        chrome.runtime.sendMessage({
          action: 'startAutoScrollOnTab',
          tabId: tab.id
        });
      }, 3000);
    });
  }

  // Gmail automation functionality with usage tracking
  if (startSendingBtn) {
    startSendingBtn.addEventListener('click', async function() {
      console.log('📧 Gmail automation requested');
      
      // Check if emails are available
      if (!allEmails || allEmails.length === 0) {
        alert('No emails found! Please collect some emails first.');
        return;
      }
      
      // Check usage limits before proceeding
      if (pricingManager) {
        console.log('📧 Checking Gmail usage limits...');
        await pricingManager.checkUsageAndProceed('gmail', () => {
          executeGmailAutomation();
        });
      } else {
        console.log('⚠️ No pricing manager, proceeding with Gmail automation...');
        executeGmailAutomation();
      }
    });
  }
  
  // Extract Gmail execution to separate function
  function executeGmailAutomation() {
    console.log('📧 Starting Gmail automation for', allEmails.length, 'emails');
    
    // For now, just show a success message
    // In a full implementation, this would integrate with gmail-oauth.js
    alert(`✅ Gmail automation started for ${allEmails.length} emails!\n(This would integrate with Gmail OAuth in full version)`);
    
    // Update button state
    if (startSendingBtn) {
      startSendingBtn.textContent = '✅ Automation Started';
      startSendingBtn.disabled = true;
      
      setTimeout(() => {
        startSendingBtn.textContent = '🚀 Start Automatic Sending';
        startSendingBtn.disabled = false;
      }, 3000);
    }
  }

  // Auto-scroll current page functionality with usage tracking
  if (autoScrollBtn) {
    autoScrollBtn.addEventListener('click', async function() {
      console.log('🔄 Auto-scroll requested on current page');
      
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url && tabs[0].url.includes('linkedin.com')) {
          
          // Check if auto-scroll is currently running
          chrome.tabs.sendMessage(tabs[0].id, { action: 'getAutoScrollStatus' }, async (response) => {
            if (chrome.runtime.lastError) {
              console.error('Failed to get auto-scroll status:', chrome.runtime.lastError);
              alert('Please refresh the LinkedIn page and try again');
              return;
            }
            
            // If auto-scroll is currently running, just stop it (no usage charge)
            if (response && response.autoScrolling) {
              console.log('🛑 Auto-scroll already running - stopping it (no charge)');
              chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleAutoScroll' });
              this.textContent = 'Start Auto-Scroll (Current Page)';
              this.classList.remove('btn-stop');
              this.classList.add('btn-auto');
              return;
            }
            
            // Check if this tab has a valid paid session (from search button or previous direct payment)
            console.log('🔍 DEBUGGING SESSION VALIDATION:');
            console.log('- currentSearchSession:', currentSearchSession);
            console.log('- Current tab ID:', tabs[0].id);
            console.log('- Session tab ID:', currentSearchSession?.tabId);
            console.log('- Time diff:', currentSearchSession ? (Date.now() - currentSearchSession.timestamp) : 'N/A');
            
            let hasValidSession = false;
            if (currentSearchSession && 
                currentSearchSession.tabId === tabs[0].id && 
                (Date.now() - currentSearchSession.timestamp) < 300000) {
              hasValidSession = true;
              console.log('✅ Valid paid session found:', currentSearchSession.sessionId);
              console.log('🆓 FREE auto-scroll (session already paid)');
            } else {
              console.log('❌ Session validation failed:');
              console.log('  - Has session?', !!currentSearchSession);
              console.log('  - Tab match?', currentSearchSession?.tabId === tabs[0].id);
              console.log('  - Time valid?', currentSearchSession ? (Date.now() - currentSearchSession.timestamp) < 300000 : false);
            }
            
            // If user came directly to LinkedIn (no paid session), charge for auto-scroll
            if (!hasValidSession) {
              console.log('❌ No valid paid session - charging for auto-scroll');
              if (pricingManager) {
                await pricingManager.checkUsageAndProceed('search', () => {
                  // Create new session after payment
                  currentSearchSession = {
                    sessionId: `direct_scroll_${Date.now()}`,
                    timestamp: Date.now(),
                    tabId: tabs[0].id,
                    autoScrollUsed: true
                  };
                  console.log('💰 Direct access charged, new session:', currentSearchSession.sessionId);
                  executeAutoScroll(tabs[0].id, this);
                });
              } else {
                console.log('⚠️ No pricing manager, proceeding with auto-scroll...');
                executeAutoScroll(tabs[0].id, this);
              }
            } else {
              // Free auto-scroll for paid session
              console.log('🆓 Free auto-scroll for existing paid session');
              executeAutoScroll(tabs[0].id, this);
            }
          });
          
        } else {
          alert('Please open a LinkedIn page first!');
        }
      });
    });
  }
  
  // Extract auto-scroll execution to separate function  
  function executeAutoScroll(tabId, buttonElement) {
    chrome.tabs.sendMessage(tabId, { action: 'toggleAutoScroll' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Failed to start auto-scroll:', chrome.runtime.lastError);
        alert('Please refresh the LinkedIn page and try again');
      } else {
        console.log('✅ Auto-scroll started:', response);
        buttonElement.textContent = 'Stop Auto-Scroll';
        buttonElement.classList.remove('btn-auto');
        buttonElement.classList.add('btn-stop');
      }
    });
  }

  // Tab functionality
  function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetTab = button.getAttribute('data-tab');
        
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        button.classList.add('active');
        const targetContent = document.getElementById(targetTab + 'Tab');
        if (targetContent) {
          targetContent.classList.add('active');
        }
      });
    });
  }

  // Initialize pricing system
  async function initializePricingSystem() {
    try {
      console.log('🔧 Checking pricing system dependencies...');
      console.log('LocalFirebaseManager available:', !!window.LocalFirebaseManager);
      console.log('PricingManager available:', !!window.PricingManager);
      
      if (window.LocalFirebaseManager && window.PricingManager) {
        console.log('🚀 Initializing pricing manager...');
        pricingManager = new PricingManager();
        await pricingManager.initialize();
        console.log('✅ Pricing system initialized successfully');
        
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
        
        // Update usage display
        console.log('📊 Updating usage display...');
        await pricingManager.updateUsageDisplay();
        console.log('✅ Usage display updated');
        
        // Update pricing display with Firebase config
        console.log('💰 Updating pricing display...');
        await pricingManager.updatePricingDisplay();
        console.log('✅ Pricing display updated');
      } else {
        console.log('⚠️ Missing dependencies:');
        if (!window.LocalFirebaseManager) console.log('   ❌ LocalFirebaseManager not found');
        if (!window.PricingManager) console.log('   ❌ PricingManager not found');
        
        // Fallback: Set default usage display
        updateUsageDisplayFallback();
        console.log('⚠️ Using fallback pricing display');
      }
    } catch (error) {
      console.error('❌ Failed to initialize pricing system:', error);
      updateUsageDisplayFallback();
    }
  }

  // Fallback usage display with proper defaults
  function updateUsageDisplayFallback() {
    console.log('🔄 Using fallback usage display');
    
    const searchUsage = document.getElementById('searchUsage');
    const gmailUsage = document.getElementById('gmailUsage');
    const searchLimit = document.getElementById('searchLimit');
    const gmailLimit = document.getElementById('gmailLimit');
    
    // Default limits from firebase-local.js getDefaultConfig()
    const defaultSearchLimit = 10;
    const defaultGmailLimit = 5;
    
    if (searchUsage) {
      searchUsage.textContent = `${defaultSearchLimit} searches left`;
      searchUsage.className = 'usage-normal';
      searchUsage.style.display = 'block';
      searchUsage.style.color = 'white';
      searchUsage.style.fontWeight = '500';
      searchUsage.style.textShadow = '0 1px 2px rgba(0,0,0,0.2)';
      console.log('✅ Search usage element updated:', searchUsage.textContent);
    } else {
      console.log('❌ searchUsage element not found');
    }
    
    if (gmailUsage) {
      gmailUsage.textContent = `${defaultGmailLimit} emails left`;
      gmailUsage.className = 'usage-normal';
      gmailUsage.style.display = 'block';
      gmailUsage.style.color = 'white';
      gmailUsage.style.fontWeight = '500';
      gmailUsage.style.textShadow = '0 1px 2px rgba(0,0,0,0.2)';
      console.log('✅ Gmail usage element updated:', gmailUsage.textContent);
    } else {
      console.log('❌ gmailUsage element not found');
    }
    
    // Update pricing display limits
    if (searchLimit) {
      searchLimit.textContent = defaultSearchLimit;
    }
    if (gmailLimit) {
      gmailLimit.textContent = defaultGmailLimit;
    }
    
    console.log('📊 Fallback display updated:', {
      search: defaultSearchLimit,
      gmail: defaultGmailLimit
    });
  }

  // Force usage display update immediately
  function forceUsageDisplayUpdate() {
    console.log('🔥 Force updating usage display...');
    
    // Check if elements exist
    const searchUsage = document.getElementById('searchUsage');
    const gmailUsage = document.getElementById('gmailUsage');
    
    console.log('Elements found:', {
      searchUsage: !!searchUsage,
      gmailUsage: !!gmailUsage
    });
    
    if (pricingManager) {
      pricingManager.updateUsageDisplay().catch(error => {
        console.error('❌ Pricing manager update failed:', error);
        updateUsageDisplayFallback();
      });
    } else {
      updateUsageDisplayFallback();
    }
  }

  // Initialize everything
  console.log('🚀 Initializing LinkedIn Recruiter Pro...');
  
  // Always show default values first, then try to load Firebase
  updateUsageDisplayFallback();
  
  initializeTabs();
  loadEmails();
  
  // Add settings button event listeners
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      if (settingsModal) {
        settingsModal.style.display = 'block';
      }
    });
  }
  
  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', () => {
      if (settingsModal) {
        settingsModal.style.display = 'none';
      }
    });
  }
  
  // Add main button event listeners that don't require pricing manager
  if (autoScrollBtn) {
    autoScrollBtn.addEventListener('click', () => {
      if (!isAutoScrolling) {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          chrome.tabs.sendMessage(tabs[0].id, {action: 'startAutoScroll'});
        });
        autoScrollBtn.textContent = 'Stop Auto-Scroll';
        autoScrollBtn.classList.add('btn-stop');
        isAutoScrolling = true;
      } else {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          chrome.tabs.sendMessage(tabs[0].id, {action: 'stopAutoScroll'});
        });
        autoScrollBtn.textContent = 'Start Auto-Scroll (Current Page)';
        autoScrollBtn.classList.remove('btn-stop');
        isAutoScrolling = false;
      }
    });
  }
  
  // Add start search button event listener 
  if (startSearchBtn) {
    startSearchBtn.addEventListener('click', async () => {
      const keywords = searchKeywords.value.trim();
      const dateValue = dateFilter.value;
      
      if (!keywords) {
        alert('Please enter search keywords!');
        return;
      }
      
      console.log('🔍 Start search clicked:', keywords);
      
      // Check usage limits if pricing manager is available
      if (pricingManager) {
        console.log('🔍 Checking search usage limits...');
        await pricingManager.checkUsageAndProceed('search', () => {
          executeSearch(keywords, dateValue);
        });
      } else {
        console.log('⚠️ Pricing manager not available, executing search directly');
        executeSearch(keywords, dateValue);
      }
    });
  }
  
  // Add authenticate button event listener
  if (authenticateBtn) {
    authenticateBtn.addEventListener('click', () => {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'authenticate'});
      });
    });
  }
  
  // Force update usage display every 2 seconds
  setInterval(forceUsageDisplayUpdate, 2000);
  
  // Initialize pricing system with timeout
  setTimeout(() => {
    console.log('⏰ Starting pricing system initialization...');
    initializePricingSystem().then(() => {
      // Force update after pricing system loads
      setTimeout(forceUsageDisplayUpdate, 500);
    });
  }, 100);
  
  console.log('✅ LinkedIn Recruiter Pro initialized successfully!');
});