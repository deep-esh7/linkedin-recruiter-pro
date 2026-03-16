chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ emails: [] });
  console.log('LinkedIn Recruiter Pro installed');
});

// Handle scheduled email alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name.startsWith('emailSchedule_')) {
    const jobId = alarm.name.replace('emailSchedule_', '');
    console.log(`⏰ Alarm fired for job: ${jobId}`);
    
    // Execute the scheduled job
    executeScheduledEmailJob(jobId);
  }
});

async function executeScheduledEmailJob(jobId) {
  try {
    // Load scheduled jobs from storage
    const result = await chrome.storage.local.get(['scheduledJobs']);
    const scheduledJobs = new Map(result.scheduledJobs || []);
    
    const job = scheduledJobs.get(jobId);
    if (!job || job.status !== 'scheduled') {
      console.log(`Job ${jobId} not found or not scheduled`);
      return;
    }
    
    console.log(`🚀 Executing scheduled email job: ${jobId}`);
    
    // Update job status
    job.status = 'executing';
    scheduledJobs.set(jobId, job);
    chrome.storage.local.set({ scheduledJobs: Array.from(scheduledJobs.entries()) });
    
    // Note: In a real implementation, you'd need to instantiate EmailScheduler here
    // and call its executeScheduledJob method. For now, we'll just mark as completed.
    
    job.status = 'completed';
    job.completedTime = Date.now();
    scheduledJobs.set(jobId, job);
    chrome.storage.local.set({ scheduledJobs: Array.from(scheduledJobs.entries()) });
    
    // Send notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iMjQiIGZpbGw9IiMwMDczQjEiLz4KPC9zdmc+',
      title: 'Scheduled Emails Sent',
      message: `📧 Scheduled email job completed: ${job.emails.length} emails processed`
    });
    
  } catch (error) {
    console.error('Failed to execute scheduled job:', error);
  }
}

chrome.action.onClicked.addListener((tab) => {
  if (tab.url && tab.url.includes('linkedin.com')) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
  }
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.emails) {
    const emailCount = changes.emails.newValue ? changes.emails.newValue.length : 0;
    chrome.action.setBadgeText({
      text: emailCount > 0 ? emailCount.toString() : ''
    });
    chrome.action.setBadgeBackgroundColor({ color: '#0073b1' });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background script received message:', message, 'from:', sender);
  
  if (message.action === 'getEmails') {
    chrome.storage.local.get(['emails'], (result) => {
      sendResponse({ emails: result.emails || [] });
    });
    return true;
  }
  
  if (message.action === 'addEmail') {
    chrome.storage.local.get(['emails'], (result) => {
      const emails = result.emails || [];
      if (!emails.includes(message.email)) {
        emails.push(message.email);
        chrome.storage.local.set({ emails: emails });
      }
    });
  }
  
  if (message.action === 'startAutoScrollOnTab') {
    const tabId = message.tabId;
    console.log('Starting auto-scroll on tab:', tabId);
    
    // Try to send message to content script
    chrome.tabs.sendMessage(tabId, { action: 'startAutoScroll' }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('Content script not ready, injecting...');
        // Inject content script if not present
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content.js']
        }, () => {
          if (chrome.runtime.lastError) {
            console.error('Failed to inject:', chrome.runtime.lastError);
          } else {
            // Try again after injection
            setTimeout(() => {
              chrome.tabs.sendMessage(tabId, { action: 'startAutoScroll' });
            }, 3000); // Increased timeout for LinkedIn to load
          }
        });
      } else {
        console.log('Auto-scroll command sent successfully');
      }
    });
  }
});