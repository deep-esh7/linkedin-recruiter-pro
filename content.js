let extractedEmails = new Set();
let observerActive = false;
let autoScrolling = false;
let scrollInterval;
let scrollSpeed = 2000; // milliseconds between scrolls
let emailCollectionAllowed = false; // Track if email collection is paid/allowed

function extractEmailsFromText(text) {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  return text.match(emailRegex) || [];
}

function scanPostsForEmails() {
  // More comprehensive selectors for LinkedIn posts
  const postSelectors = [
    '.feed-shared-update-v2',
    '.occludable-update',
    '[data-id*="activity"]',
    '[data-urn*="activity"]'
  ];
  
  const posts = document.querySelectorAll(postSelectors.join(', '));
  
  // Also scan the entire visible page content for loose emails
  const pageContent = document.body.innerText || document.body.textContent || '';
  const pageEmails = extractEmailsFromText(pageContent);
  
  pageEmails.forEach(email => {
    if (!extractedEmails.has(email.toLowerCase())) {
      extractedEmails.add(email.toLowerCase());
      // Save simple email without context for page-level emails
      saveEmailWithDetails(email.toLowerCase(), {
        source: 'page_scan',
        timestamp: Date.now()
      });
      console.log('Found email on page:', email);
    }
  });
  
  posts.forEach(post => {
    if (post.dataset && post.dataset.emailScanned) return;
    
    const textContent = post.innerText || post.textContent || '';
    const emails = extractEmailsFromText(textContent);
    
    emails.forEach(email => {
      if (!extractedEmails.has(email.toLowerCase())) {
        // Check if email collection is allowed (paid)
        if (!emailCollectionAllowed) {
          console.log('⚠️ Email found but collection not allowed (unpaid):', email);
          // Show warning to user about manual scrolling
          if (Math.random() < 0.1) { // Show warning 10% of time to avoid spam
            console.log('💰 Use extension auto-scroll for email collection');
          }
          return; // Skip saving this email
        }
        
        extractedEmails.add(email.toLowerCase());
        
        // Extract additional details from the post
        const postDetails = extractPostDetails(post);
        saveEmailWithDetails(email.toLowerCase(), postDetails);
        
        console.log('✅ Found email in PAID session:', email, postDetails);
        
        // Track email collection in Firebase if possible
        try {
          if (window.firebaseManager) {
            window.firebaseManager.updateUsage('search', 0); // Don't increment, just track activity
          }
        } catch (error) {
          console.log('Firebase tracking unavailable:', error);
        }
      }
    });
    
    if (post.dataset) {
      post.dataset.emailScanned = 'true';
    }
  });
}

function extractPostDetails(post) {
  const details = {
    email: null,
    posterName: null,
    company: null,
    jobTitle: null,
    location: null,
    postText: null,
    phoneNumber: null,
    timestamp: Date.now(),
    source: 'linkedin_post'
  };

  try {
    // Extract poster name
    const nameSelectors = [
      '.feed-shared-actor__name',
      '.feed-shared-update-v2__actor-name',
      '[data-control-name="actor_container"] .visually-hidden',
      '.update-components-actor__name',
      'a[data-control-name="actor"] .visually-hidden',
      '.actor-name'
    ];
    
    for (let selector of nameSelectors) {
      const nameElement = post.querySelector(selector);
      if (nameElement) {
        details.posterName = nameElement.textContent?.trim();
        if (details.posterName) break;
      }
    }

    // Extract company name
    const companySelectors = [
      '.feed-shared-actor__sub-description',
      '.feed-shared-update-v2__actor-sub-description',
      '.update-components-actor__description',
      '[data-control-name="actor_container"] .feed-shared-actor__description'
    ];
    
    for (let selector of companySelectors) {
      const companyElement = post.querySelector(selector);
      if (companyElement) {
        const companyText = companyElement.textContent?.trim();
        if (companyText && !companyText.includes('•')) {
          details.company = companyText;
        } else if (companyText) {
          // Try to extract company from "Job Title at Company" format
          const parts = companyText.split(' at ');
          if (parts.length > 1) {
            details.jobTitle = parts[0].trim();
            details.company = parts[1].split('•')[0].trim();
          }
        }
        if (details.company) break;
      }
    }

    // Extract post content
    const contentSelectors = [
      '.feed-shared-update-v2__description',
      '.feed-shared-text',
      '.feed-shared-inline-show-more-text__text',
      '.update-components-text'
    ];
    
    for (let selector of contentSelectors) {
      const contentElement = post.querySelector(selector);
      if (contentElement) {
        details.postText = contentElement.textContent?.trim();
        if (details.postText && details.postText.length > 10) break;
      }
    }

    // Extract phone numbers from post text
    if (details.postText) {
      const phoneRegex = /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;
      const phoneMatches = details.postText.match(phoneRegex);
      if (phoneMatches && phoneMatches.length > 0) {
        details.phoneNumber = phoneMatches[0].trim();
      }
    }

    // Extract location (if available)
    const locationSelectors = [
      '.feed-shared-actor__meta',
      '.update-components-actor__meta'
    ];
    
    for (let selector of locationSelectors) {
      const locationElement = post.querySelector(selector);
      if (locationElement) {
        const locationText = locationElement.textContent?.trim();
        if (locationText && locationText.includes('•')) {
          details.location = locationText.split('•').pop()?.trim();
        }
        if (details.location) break;
      }
    }

  } catch (error) {
    console.error('Error extracting post details:', error);
  }

  return details;
}

function saveEmailToStorage(email) {
  chrome.storage.local.get(['emails'], (result) => {
    const emails = result.emails || [];
    if (!emails.includes(email)) {
      emails.push(email);
      chrome.storage.local.set({ emails: emails });
    }
  });
}

function saveEmailWithDetails(email, details) {
  // Save to regular emails array for compatibility
  chrome.storage.local.get(['emails', 'emailDetails'], (result) => {
    const emails = result.emails || [];
    const emailDetails = result.emailDetails || {};
    
    // Add email to main list if not exists
    if (!emails.includes(email)) {
      emails.push(email);
    }
    
    // Add detailed information
    details.email = email;
    emailDetails[email] = details;
    
    chrome.storage.local.set({ 
      emails: emails,
      emailDetails: emailDetails 
    }, () => {
      console.log(`💾 Email saved to storage! Total: ${emails.length} emails`);
      console.log('📧 New email:', email);
      console.log('📋 Details:', details);
      
      // Also log to make sure storage was updated
      chrome.storage.local.get(['emails'], (verifyResult) => {
        console.log(`✅ Storage verification: ${(verifyResult.emails || []).length} emails in storage`);
      });
    });
  });
}

function startObserver() {
  if (observerActive) return;
  
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length > 0) {
        setTimeout(scanPostsForEmails, 500);
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  observerActive = true;
}

function initializeExtension() {
  console.log('LinkedIn Recruiter Pro: Initializing...');
  
  chrome.storage.local.get(['emails', 'autoScrolling'], (result) => {
    const storedEmails = result.emails || [];
    storedEmails.forEach(email => extractedEmails.add(email));
    console.log('Loaded stored emails:', storedEmails.length);
    
    // Restore auto-scroll state
    if (result.autoScrolling) {
      autoScrolling = true;
      startAutoScroll();
    }
  });
  
  // Immediate scan
  setTimeout(() => {
    console.log('LinkedIn Recruiter Pro: Starting scan...');
    scanPostsForEmails();
  }, 1000);
  
  startObserver();
  
  // More frequent scanning
  setInterval(scanPostsForEmails, 2000);
  
  // Add keyboard shortcuts with usage tracking protection
  document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && event.shiftKey && event.key === 'E') {
      console.log('Manual scan triggered via shortcut');
      scanPostsForEmails();
    }
    if (event.ctrlKey && event.shiftKey && event.key === 'S') {
      console.log('⚠️ Auto-scroll shortcut blocked - use extension popup for usage tracking');
      alert('⚠️ Please use the extension popup to start auto-scroll for proper usage tracking.');
      // Don't call toggleAutoScroll() to prevent bypass
    }
  });
}

function simulateTabPress() {
  // FORCE SCROLL FIRST - always move down regardless of TAB
  window.scrollBy({
    top: 150,
    behavior: 'smooth'
  });
  
  // Create and dispatch multiple TAB events with different approaches
  const target = document.activeElement || document.body;
  
  // Method 1: KeyboardEvent with all properties
  const tabEventDown = new KeyboardEvent('keydown', {
    key: 'Tab',
    code: 'Tab',
    keyCode: 9,
    which: 9,
    charCode: 9,
    bubbles: true,
    cancelable: true,
    composed: true,
    isTrusted: false
  });
  
  const tabEventUp = new KeyboardEvent('keyup', {
    key: 'Tab',
    code: 'Tab',
    keyCode: 9,
    which: 9,
    charCode: 9,
    bubbles: true,
    cancelable: true,
    composed: true,
    isTrusted: false
  });
  
  // Dispatch to multiple targets
  document.dispatchEvent(tabEventDown);
  target.dispatchEvent(tabEventDown);
  window.dispatchEvent(tabEventDown);
  
  setTimeout(() => {
    document.dispatchEvent(tabEventUp);
    target.dispatchEvent(tabEventUp);
    window.dispatchEvent(tabEventUp);
  }, 10);
  
  // Method 2: Always find new elements to focus
  setTimeout(() => {
    let allElements = document.querySelectorAll('*');
    let randomElement = allElements[Math.floor(Math.random() * allElements.length)];
    
    try {
      if (randomElement && randomElement.focus) {
        randomElement.focus();
        randomElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }
    } catch (e) {
      // Always fallback to scrolling
      window.scrollBy(0, 200);
    }
    
    // Additional force scroll
    window.scrollBy(0, 100);
  }, 20);
}

function startAutoScroll() {
  if (autoScrolling) return;
  
  autoScrolling = true;
  console.log('Auto-scrolling started - infinite ultra fast TAB key');
  
  scrollInterval = setInterval(() => {
    // Press TAB ultra quickly - 8 times per interval
    simulateTabPress();
    setTimeout(simulateTabPress, 15);
    setTimeout(simulateTabPress, 30);
    setTimeout(simulateTabPress, 45);
    setTimeout(simulateTabPress, 60);
    setTimeout(simulateTabPress, 75);
    setTimeout(simulateTabPress, 90);
    setTimeout(simulateTabPress, 105);
    
    // Log less frequently to avoid console spam
    if (Math.random() < 0.1) {
      console.log('TAB keys pressed ultra fast, current scroll position:', window.scrollY, 'Emails found:', extractedEmails.size);
    }
    
    // Scan for emails after TAB presses
    setTimeout(scanPostsForEmails, 120);
    
    // NO STOPPING CONDITIONS - runs indefinitely until manually stopped
    
  }, 150); // Ultra fast interval - every 150ms
  
  // Update storage to persist state
  chrome.storage.local.set({ autoScrolling: true });
}

function stopAutoScroll() {
  if (!autoScrolling) return;
  
  autoScrolling = false;
  if (scrollInterval) {
    clearInterval(scrollInterval);
    scrollInterval = null;
  }
  console.log('Auto-scrolling stopped');
  
  // Update storage
  chrome.storage.local.set({ autoScrolling: false });
}

function toggleAutoScroll() {
  if (autoScrolling) {
    stopAutoScroll();
  } else {
    startAutoScroll();
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  
  if (message.action === 'toggleAutoScroll') {
    toggleAutoScroll();
    console.log('Auto-scroll toggled, new state:', autoScrolling);
    sendResponse({ autoScrolling: autoScrolling });
    return true; // Keep message channel open
  }
  
  if (message.action === 'startAutoScroll') {
    console.log('🚀 Starting auto-scroll from external command');
    if (!autoScrolling) {
      emailCollectionAllowed = true; // Enable paid collection
      console.log('✅ Email collection ENABLED (paid session)');
      startAutoScroll();
    }
    sendResponse({ autoScrolling: autoScrolling, started: true });
    return true; // Keep message channel open
  }
  
  if (message.action === 'enableEmailCollection') {
    emailCollectionAllowed = true;
    console.log('✅ Email collection ENABLED (paid session)');
    sendResponse({ enabled: true });
    return true;
  }
  
  if (message.action === 'disableEmailCollection') {
    emailCollectionAllowed = false;
    console.log('⚠️ Email collection DISABLED (unpaid session)');
    sendResponse({ enabled: false });
    return true;
  }
  
  if (message.action === 'getAutoScrollStatus') {
    console.log('Returning auto-scroll status:', autoScrolling);
    sendResponse({ autoScrolling: autoScrolling });
    return true;
  }
  
  if (message.action === 'setScrollSpeed') {
    scrollSpeed = message.speed;
    console.log('Scroll speed changed to:', scrollSpeed);
    sendResponse({ success: true });
    return true;
  }
  
  return false;
});

// Console command to export all collected data
window.exportAllEmailData = function() {
  chrome.storage.local.get(['emails', 'emailDetails'], (result) => {
    const emails = result.emails || [];
    const emailDetails = result.emailDetails || {};
    
    console.log('📧 TOTAL EMAILS FOUND:', emails.length);
    console.log('📧 BASIC EMAIL LIST:', emails);
    console.log('📧 DETAILED EMAIL DATA:', emailDetails);
    
    // Create CSV format
    let csvData = 'Email,Poster Name,Company,Job Title,Location,Phone Number,Source,Timestamp,Post Text\n';
    
    emails.forEach(email => {
      const details = emailDetails[email] || {};
      const row = [
        email,
        (details.posterName || '').replace(/,/g, ';'),
        (details.company || '').replace(/,/g, ';'),
        (details.jobTitle || '').replace(/,/g, ';'),
        (details.location || '').replace(/,/g, ';'),
        details.phoneNumber || '',
        details.source || 'unknown',
        details.timestamp ? new Date(details.timestamp).toISOString() : '',
        (details.postText || '').replace(/,/g, ';').substring(0, 100)
      ].map(field => `"${field}"`).join(',');
      csvData += row + '\n';
    });
    
    console.log('📊 CSV FORMAT DATA:');
    console.log(csvData);
    
    // Download CSV function
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `linkedin_emails_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    
    return {
      totalEmails: emails.length,
      emails: emails,
      details: emailDetails,
      csv: csvData
    };
  });
};

// Prevent duplicate initialization
if (window.linkedinRecruiterProInitialized) {
  console.log('LinkedIn Recruiter Pro already initialized, skipping...');
} else if (window.location.hostname === 'www.linkedin.com') {
  window.linkedinRecruiterProInitialized = true;
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeExtension);
  } else {
    initializeExtension();
  }
}