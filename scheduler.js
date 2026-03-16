// Email Scheduling System
class EmailScheduler {
  constructor() {
    this.scheduledJobs = new Map();
    this.alarms = new Map();
    this.loadScheduledJobs();
  }

  // Schedule emails to be sent at specific time
  async scheduleEmails(emails, subject, message, attachmentFile, scheduledTime, timezone = 'local') {
    const jobId = this.generateJobId();
    const scheduledTimestamp = this.parseScheduledTime(scheduledTime, timezone);
    
    if (scheduledTimestamp <= Date.now()) {
      throw new Error('Scheduled time must be in the future');
    }

    const job = {
      id: jobId,
      emails: emails,
      subject: subject,
      message: message,
      attachmentFile: attachmentFile ? {
        name: attachmentFile.name,
        type: attachmentFile.type,
        size: attachmentFile.size,
        lastModified: attachmentFile.lastModified
      } : null,
      scheduledTime: scheduledTimestamp,
      timezone: timezone,
      status: 'scheduled',
      created: Date.now()
    };

    // Store the job
    this.scheduledJobs.set(jobId, job);
    this.saveScheduledJobs();

    // Create Chrome alarm
    await this.createAlarm(jobId, scheduledTimestamp);

    console.log(`📅 Emails scheduled for: ${new Date(scheduledTimestamp).toLocaleString()}`);
    return jobId;
  }

  // Parse scheduled time string to timestamp
  parseScheduledTime(scheduledTime, timezone) {
    let timestamp;
    
    if (typeof scheduledTime === 'number') {
      timestamp = scheduledTime;
    } else if (typeof scheduledTime === 'string') {
      timestamp = new Date(scheduledTime).getTime();
    } else if (scheduledTime instanceof Date) {
      timestamp = scheduledTime.getTime();
    } else {
      throw new Error('Invalid scheduled time format');
    }

    // Convert to UTC if needed
    if (timezone === 'UTC') {
      const offset = new Date().getTimezoneOffset() * 60000;
      timestamp = timestamp + offset;
    }

    return timestamp;
  }

  // Create Chrome alarm for scheduled job
  async createAlarm(jobId, timestamp) {
    const alarmName = `emailSchedule_${jobId}`;
    
    try {
      // Chrome alarms API
      if (chrome.alarms) {
        await chrome.alarms.create(alarmName, {
          when: timestamp
        });
        this.alarms.set(jobId, alarmName);
        console.log(`⏰ Alarm created: ${alarmName} for ${new Date(timestamp).toLocaleString()}`);
      } else {
        // Fallback to setTimeout for testing
        const delay = timestamp - Date.now();
        const timeoutId = setTimeout(() => {
          this.executeScheduledJob(jobId);
        }, delay);
        this.alarms.set(jobId, timeoutId);
      }
    } catch (error) {
      console.error('Failed to create alarm:', error);
      throw error;
    }
  }

  // Execute scheduled job
  async executeScheduledJob(jobId) {
    const job = this.scheduledJobs.get(jobId);
    if (!job) {
      console.error(`Job ${jobId} not found`);
      return;
    }

    if (job.status !== 'scheduled') {
      console.log(`Job ${jobId} is not scheduled (status: ${job.status})`);
      return;
    }

    console.log(`🚀 Executing scheduled job: ${jobId}`);
    job.status = 'executing';
    this.saveScheduledJobs();

    try {
      // Get Gmail OAuth instance
      const gmailOAuth = new GmailOAuth();
      await gmailOAuth.authenticate();

      // Send emails
      const results = await gmailOAuth.sendBulkEmails(
        job.emails,
        job.subject,
        job.message,
        null, // File object not available from storage
        2000 // 2 second delay
      );

      // Update job status
      job.status = 'completed';
      job.completedTime = Date.now();
      job.results = results;
      
      const successful = results.filter(r => r.status === 'success').length;
      const failed = results.length - successful;
      
      console.log(`✅ Scheduled job completed: ${successful} sent, ${failed} failed`);
      
      // Send notification
      this.sendNotification(
        'Email Sending Complete',
        `✅ ${successful} emails sent successfully\n❌ ${failed} emails failed`
      );

    } catch (error) {
      console.error('Scheduled job failed:', error);
      job.status = 'failed';
      job.error = error.message;
      
      this.sendNotification(
        'Email Sending Failed',
        `❌ Scheduled email sending failed: ${error.message}`
      );
    }

    this.saveScheduledJobs();
    this.cleanupAlarm(jobId);
  }

  // Cancel scheduled job
  async cancelScheduledJob(jobId) {
    const job = this.scheduledJobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status !== 'scheduled') {
      throw new Error(`Cannot cancel job with status: ${job.status}`);
    }

    job.status = 'cancelled';
    job.cancelledTime = Date.now();
    
    this.saveScheduledJobs();
    this.cleanupAlarm(jobId);
    
    console.log(`❌ Scheduled job cancelled: ${jobId}`);
  }

  // Cleanup alarm
  cleanupAlarm(jobId) {
    const alarmIdentifier = this.alarms.get(jobId);
    if (alarmIdentifier) {
      if (typeof alarmIdentifier === 'string') {
        // Chrome alarm
        chrome.alarms.clear(alarmIdentifier);
      } else {
        // setTimeout ID
        clearTimeout(alarmIdentifier);
      }
      this.alarms.delete(jobId);
    }
  }

  // Get all scheduled jobs
  getScheduledJobs() {
    return Array.from(this.scheduledJobs.values());
  }

  // Get scheduled jobs by status
  getJobsByStatus(status) {
    return this.getScheduledJobs().filter(job => job.status === status);
  }

  // Generate unique job ID
  generateJobId() {
    return 'job_' + Date.now() + '_' + Math.random().toString(36).substring(2);
  }

  // Save scheduled jobs to storage
  saveScheduledJobs() {
    const jobsArray = Array.from(this.scheduledJobs.entries());
    chrome.storage.local.set({ scheduledJobs: jobsArray });
  }

  // Load scheduled jobs from storage
  async loadScheduledJobs() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['scheduledJobs'], (result) => {
        if (result.scheduledJobs) {
          this.scheduledJobs = new Map(result.scheduledJobs);
          
          // Restart alarms for pending jobs
          this.restartPendingAlarms();
        }
        resolve();
      });
    });
  }

  // Restart alarms for pending scheduled jobs
  async restartPendingAlarms() {
    const now = Date.now();
    
    for (const [jobId, job] of this.scheduledJobs) {
      if (job.status === 'scheduled') {
        if (job.scheduledTime <= now) {
          // Job should have executed already
          console.log(`Executing overdue job: ${jobId}`);
          this.executeScheduledJob(jobId);
        } else {
          // Recreate alarm
          await this.createAlarm(jobId, job.scheduledTime);
        }
      }
    }
  }

  // Send browser notification
  sendNotification(title, message) {
    if (chrome.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iMjQiIGZpbGw9IiMwMDczQjEiLz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSIxMiIgeT0iMTIiPgo8cGF0aCBkPSJNNCAzSDIwQzIxLjEgMyAyMiAzLjkgMjIgNVYxOUMyMiAyMC4xIDIxLjEgMjEgMjAgMjFINEMzLjkgMjEgMyAyMC4xIDMgMTlWNUMzIDMuOSAzLjkgMyA0IDNaIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiLz4KPHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiIgZD0iTDMgN0wyMSA3Ii8+CjxwYXRoIGQ9Ik0zIDdMMTIgMTRMMjEgNyIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+Cjwvc3ZnPgo8L3N2Zz4K',
        title: title,
        message: message
      });
    }
  }

  // Format time for display
  formatScheduledTime(timestamp, timezone = 'local') {
    const date = new Date(timestamp);
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    };
    
    if (timezone === 'UTC') {
      return date.toUTCString();
    } else {
      return date.toLocaleString(undefined, options);
    }
  }
}

// Make it available globally
window.EmailScheduler = EmailScheduler;