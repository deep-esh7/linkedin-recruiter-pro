// Local Firebase initialization to avoid CSP issues
// This is a simplified version for Chrome extensions

class LocalFirebaseManager {
  constructor() {
    this.apiKey = process.env.FIREBASE_API_KEY || "YOUR_FIREBASE_API_KEY";
    this.databaseURL = "https://linked-in-recruiter-pro-default-rtdb.asia-southeast1.firebasedatabase.app";
    this.projectId = "linked-in-recruiter-pro";
    this.initialized = false;
    this.userId = null;
  }

  async initialize() {
    try {
      // Generate or retrieve user ID
      await this.getUserId();
      this.initialized = true;
      console.log('🔥 Local Firebase Manager initialized');
      return true;
    } catch (error) {
      console.error('❌ Local Firebase initialization failed:', error);
      return false;
    }
  }

  async getUserId() {
    const result = await chrome.storage.local.get(['userId']);
    if (result.userId) {
      this.userId = result.userId;
    } else {
      const chromeId = chrome.runtime.id || 'unknown';
      const timestamp = Date.now();
      const randomPart = Math.random().toString(36).substr(2, 9);
      this.userId = `chrome_${chromeId}_${timestamp}_${randomPart}`;
      chrome.storage.local.set({ userId: this.userId });
    }
    console.log('👤 User ID:', this.userId);
    return this.userId;
  }

  // HTTP-based Firebase REST API calls
  async makeRequest(path, method = 'GET', data = null) {
    const url = `${this.databaseURL}${path}.json`;
    
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Firebase request failed:', error);
      throw error;
    }
  }

  async getAppConfig() {
    try {
      const config = await this.makeRequest('/config');
      
      if (config) {
        console.log('⚙️ Loaded config from Firebase:', config);
        return config;
      }
      
      return this.getDefaultConfig();
    } catch (error) {
      console.error('❌ Failed to load config:', error);
      return this.getDefaultConfig();
    }
  }

  getDefaultConfig() {
    return {
      searchFreeLimit: 10,
      gmailFreeLimit: 5,
      weeklyPrice: 499,
      monthlyPrice: 1499,
      razorpayKeyId: 'YOUR_RAZORPAY_KEY_ID',
      razorpaySecretKey: 'YOUR_RAZORPAY_SECRET_KEY'
    };
  }

  async getUserData() {
    try {
      console.log(`👤 Getting user data for: ${this.userId}`);
      
      // Try local storage first
      const localKey = `userData_${this.userId}`;
      const localResult = await chrome.storage.local.get([localKey]);
      
      if (localResult[localKey]) {
        console.log('✅ Found local user data:', localResult[localKey]);
        // Try to sync to Firebase in background (don't wait for it)
        this.syncUserToFirebase(localResult[localKey]).catch(() => {
          console.log('🔄 Background Firebase sync failed');
        });
        return localResult[localKey];
      }
      
      // Try Firebase before creating new user
      try {
        console.log('📡 Checking Firebase for existing user...');
        const firebaseUser = await this.makeRequest(`/users/${this.userId}`);
        
        if (firebaseUser && typeof firebaseUser === 'object') {
          console.log('✅ Found user in Firebase:', firebaseUser);
          // Cache locally for future use
          await chrome.storage.local.set({ [localKey]: firebaseUser });
          return firebaseUser;
        }
      } catch (firebaseError) {
        console.log('⚠️ Firebase read failed:', firebaseError.message);
      }
      
      // No local data and no Firebase data, create new user
      console.log('🆕 Creating new user...');
      const newUser = {
        searchUsed: 0,
        gmailUsed: 0,
        subscriptionType: 'free',
        subscriptionExpiry: null,
        createdAt: Date.now(),
        lastActive: Date.now(),
        userId: this.userId
      };
      
      // Always save to local storage first
      await chrome.storage.local.set({ [localKey]: newUser });
      console.log('✅ New user created in local storage');
      
      // Save to Firebase directly  
      this.makeRequest(`/users/${this.userId}`, 'PUT', newUser).then(() => {
        console.log('✅ New user synced to Firebase');
      }).catch(error => {
        console.log('⚠️ Firebase sync failed:', error.message);
      });
      
      return newUser;
    } catch (error) {
      console.error('❌ Failed to create user data:', error);
      
      // Emergency fallback
      const fallbackUser = {
        searchUsed: 0,
        gmailUsed: 0,
        subscriptionType: 'free',
        subscriptionExpiry: null,
        createdAt: Date.now(),
        lastActive: Date.now(),
        userId: this.userId
      };
      
      return fallbackUser;
    }
  }

  // Try to sync user data to Firebase using analytics path
  async syncUserToFirebase(userData) {
    try {
      // Use analytics path which might have different permissions
      const timestamp = Date.now();
      const analyticsData = {
        userId: this.userId,
        usage: {
          searchUsed: userData.searchUsed,
          gmailUsed: userData.gmailUsed,
          subscriptionType: userData.subscriptionType
        },
        timestamp: timestamp,
        lastSync: timestamp
      };
      
      // Try multiple paths
      const paths = [
        `/analytics/users/${this.userId}`,
        `/usage/${this.userId}`, 
        `/sessions/${this.userId}_${timestamp}`
      ];
      
      for (const path of paths) {
        try {
          await this.makeRequest(path, 'PUT', analyticsData);
          console.log(`✅ User data synced to Firebase at ${path}`);
          return true;
        } catch (pathError) {
          console.log(`⚠️ Failed to sync to ${path}:`, pathError.message);
        }
      }
      
      console.log('❌ All Firebase sync attempts failed');
      return false;
    } catch (error) {
      console.error('❌ Firebase sync error:', error);
      return false;
    }
  }

  async updateUsage(type, increment = 1) {
    try {
      const userData = await this.getUserData();
      if (!userData) return false;

      const field = type === 'search' ? 'searchUsed' : 'gmailUsed';
      const newValue = (userData[field] || 0) + increment;
      
      const updatedUser = {
        ...userData,
        [field]: newValue,
        lastActive: Date.now()
      };
      
      // Always update local storage first for speed
      const localKey = `userData_${this.userId}`;
      await chrome.storage.local.set({ [localKey]: updatedUser });
      console.log(`📈 Updated ${type} usage by ${increment} in local storage`);
      
      // Now sync to Firebase (don't wait for it)
      this.makeRequest(`/users/${this.userId}`, 'PUT', updatedUser).then(() => {
        console.log(`✅ Synced ${type} usage to Firebase`);
      }).catch(error => {
        console.log(`⚠️ Firebase sync failed: ${error.message}`);
      });
      
      return true;
    } catch (error) {
      console.error('❌ Failed to update usage:', error);
      return false;
    }
  }

  async canUseFeature(type) {
    try {
      const userData = await this.getUserData();
      const config = await this.getAppConfig();
      
      if (!userData) return false;
      
      if (userData.subscriptionType !== 'free' && 
          userData.subscriptionExpiry && 
          userData.subscriptionExpiry > Date.now()) {
        return true;
      }
      
      const limit = type === 'search' ? config.searchFreeLimit : config.gmailFreeLimit;
      const used = type === 'search' ? userData.searchUsed || 0 : userData.gmailUsed || 0;
      
      return used < limit;
    } catch (error) {
      console.error('❌ Failed to check feature access:', error);
      return false;
    }
  }

  async getRemainingUsage() {
    try {
      const userData = await this.getUserData();
      const config = await this.getAppConfig();
      
      if (!userData) return { search: 0, gmail: 0 };
      
      if (userData.subscriptionType !== 'free' && 
          userData.subscriptionExpiry && 
          userData.subscriptionExpiry > Date.now()) {
        return { search: Infinity, gmail: Infinity, isPremium: true };
      }
      
      const searchRemaining = Math.max(0, config.searchFreeLimit - (userData.searchUsed || 0));
      const gmailRemaining = Math.max(0, config.gmailFreeLimit - (userData.gmailUsed || 0));
      
      return { 
        search: searchRemaining, 
        gmail: gmailRemaining, 
        isPremium: false,
        config: config
      };
    } catch (error) {
      console.error('❌ Failed to get remaining usage:', error);
      return { search: 0, gmail: 0 };
    }
  }

  async updateSubscription(type, duration) {
    try {
      const expiryTime = Date.now() + (duration === 'weekly' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000);
      
      const updates = {
        subscriptionType: type,
        subscriptionExpiry: expiryTime,
        lastPayment: Date.now()
      };
      
      await this.makeRequest(`/users/${this.userId}`, 'PATCH', updates);
      
      console.log(`✅ Subscription updated: ${type} for ${duration}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to update subscription:', error);
      return false;
    }
  }

  async logPayment(paymentData) {
    try {
      const paymentId = `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await this.makeRequest(`/payments/${paymentId}`, 'PUT', paymentData);
      console.log('💾 Payment logged to Firebase');
      return true;
    } catch (error) {
      console.error('❌ Failed to log payment:', error);
      return false;
    }
  }
}

// Export for global use
window.LocalFirebaseManager = LocalFirebaseManager;

// Test Firebase connection immediately when script loads
console.log('🔥 Firebase Local Manager script loaded');
console.log('🌍 LocalFirebaseManager available on window:', typeof window.LocalFirebaseManager);

// Immediate connection test
(async function testConnection() {
  try {
    console.log('🧪 Testing Firebase connection...');
    const manager = new LocalFirebaseManager();
    await manager.initialize();
    
    const config = await manager.getAppConfig();
    console.log('✅ Firebase config loaded:', config);
    
    // Test user data
    const userData = await manager.getUserData();
    console.log('👤 User data loaded:', userData);
    
  } catch (error) {
    console.error('❌ Firebase connection test failed:', error);
  }
})();