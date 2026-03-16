// Firebase Configuration and Realtime Database Integration
class FirebaseManager {
  constructor() {
    this.firebaseConfig = {
      apiKey: "AIzaSyADwo_Xx7xK-ixiiKG53hBg7U4HAhq_fXc",
      authDomain: "linked-in-recruiter-pro.firebaseapp.com",
      databaseURL: "https://linked-in-recruiter-pro-default-rtdb.asia-southeast1.firebasedatabase.app/",
      projectId: "linked-in-recruiter-pro",
      storageBucket: "linked-in-recruiter-pro.firebasestorage.app",
      messagingSenderId: "103533996437",
      appId: "1:103533996437:web:5ecbe4a891d795d8f3ae9c",
      measurementId: "G-CXRFVG5TC5"
    };
    
    this.database = null;
    this.initialized = false;
    this.userId = null;
  }

  async initialize() {
    try {
      // Initialize Firebase (you'll need to include Firebase SDK)
      if (!firebase.apps.length) {
        firebase.initializeApp(this.firebaseConfig);
      }
      this.database = firebase.database();
      this.initialized = true;
      console.log('🔥 Firebase initialized successfully');
      
      // Generate or retrieve user ID
      await this.getUserId();
      return true;
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error);
      return false;
    }
  }

  async getUserId() {
    // Get or create unique user ID using Chrome's unique identifier
    const result = await chrome.storage.local.get(['userId']);
    if (result.userId) {
      this.userId = result.userId;
    } else {
      // Generate unique ID using Chrome extension's built-in UUID + timestamp
      const chromeId = chrome.runtime.id || 'unknown';
      const timestamp = Date.now();
      const randomPart = Math.random().toString(36).substr(2, 9);
      this.userId = `chrome_${chromeId}_${timestamp}_${randomPart}`;
      chrome.storage.local.set({ userId: this.userId });
    }
    console.log('👤 User ID:', this.userId);
    return this.userId;
  }

  // Get dynamic configuration from Firebase
  async getAppConfig() {
    try {
      const snapshot = await this.database.ref('config').once('value');
      const config = snapshot.val();
      
      if (config) {
        console.log('⚙️ Loaded config from Firebase:', config);
        return {
          searchFreeLimit: config.searchFreeLimit || 10,
          gmailFreeLimit: config.gmailFreeLimit || 5,
          weeklyPrice: config.weeklyPrice || 499,
          monthlyPrice: config.monthlyPrice || 1499,
          razorpayKeyId: config.razorpayKeyId || 'rzp_live_Rsmpg2dDv0X1KT',
          razorpaySecretKey: config.razorpaySecretKey || 'naxBQ2qaAFkc36FZylpaqCUd',
          features: config.features || {
            unlimited_search: true,
            unlimited_gmail: true,
            premium_support: true,
            advanced_filters: true
          }
        };
      }
      
      // Return default config if Firebase config not found
      return this.getDefaultConfig();
    } catch (error) {
      console.error('❌ Failed to load config from Firebase:', error);
      return this.getDefaultConfig();
    }
  }

  getDefaultConfig() {
    return {
      searchFreeLimit: 10,
      gmailFreeLimit: 5,
      weeklyPrice: 499,
      monthlyPrice: 1499,
      razorpayKeyId: 'rzp_live_Rsmpg2dDv0X1KT',
      razorpaySecretKey: 'naxBQ2qaAFkc36FZylpaqCUd',
      features: {
        unlimited_search: true,
        unlimited_gmail: true,
        premium_support: true,
        advanced_filters: true
      }
    };
  }

  // Get user's current usage and subscription status
  async getUserData() {
    try {
      const snapshot = await this.database.ref(`users/${this.userId}`).once('value');
      const userData = snapshot.val();
      
      if (userData) {
        return userData;
      } else {
        // Create new user with default data
        const newUser = {
          searchUsed: 0,
          gmailUsed: 0,
          subscriptionType: 'free',
          subscriptionExpiry: null,
          createdAt: Date.now(),
          lastActive: Date.now()
        };
        
        await this.database.ref(`users/${this.userId}`).set(newUser);
        return newUser;
      }
    } catch (error) {
      console.error('❌ Failed to get user data:', error);
      return null;
    }
  }

  // Update user usage
  async updateUsage(type, increment = 1) {
    try {
      const userRef = this.database.ref(`users/${this.userId}`);
      const field = type === 'search' ? 'searchUsed' : 'gmailUsed';
      
      await userRef.child(field).transaction((currentValue) => {
        return (currentValue || 0) + increment;
      });
      
      await userRef.child('lastActive').set(Date.now());
      
      console.log(`📈 Updated ${type} usage by ${increment}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to update usage:', error);
      return false;
    }
  }

  // Check if user can perform action
  async canUseFeature(type) {
    try {
      const userData = await this.getUserData();
      const config = await this.getAppConfig();
      
      if (!userData) return false;
      
      // Check if user has active subscription
      if (userData.subscriptionType !== 'free' && 
          userData.subscriptionExpiry && 
          userData.subscriptionExpiry > Date.now()) {
        return true; // Premium user - unlimited access
      }
      
      // Check free limits
      const limit = type === 'search' ? config.searchFreeLimit : config.gmailFreeLimit;
      const used = type === 'search' ? userData.searchUsed || 0 : userData.gmailUsed || 0;
      
      return used < limit;
    } catch (error) {
      console.error('❌ Failed to check feature access:', error);
      return false;
    }
  }

  // Get remaining usage
  async getRemainingUsage() {
    try {
      const userData = await this.getUserData();
      const config = await this.getAppConfig();
      
      if (!userData) return { search: 0, gmail: 0 };
      
      // If premium user, return unlimited
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

  // Update subscription after payment
  async updateSubscription(type, duration) {
    try {
      const userRef = this.database.ref(`users/${this.userId}`);
      const expiryTime = Date.now() + (duration === 'weekly' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000);
      
      await userRef.update({
        subscriptionType: type,
        subscriptionExpiry: expiryTime,
        lastPayment: Date.now()
      });
      
      console.log(`✅ Subscription updated: ${type} for ${duration}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to update subscription:', error);
      return false;
    }
  }
}

// Export for use in other files
window.FirebaseManager = FirebaseManager;