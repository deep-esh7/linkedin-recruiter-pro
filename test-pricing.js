// Test pricing manager functionality
console.log('🧪 Testing Pricing Manager...');

// Simulate DOM elements
const mockDOM = {
  searchUsage: { textContent: '', className: '' },
  gmailUsage: { textContent: '', className: '' },
  searchLimit: { textContent: '' },
  gmailLimit: { textContent: '' },
  weeklyPrice: { textContent: '' },
  monthlyPrice: { textContent: '' }
};

// Mock document.getElementById
global.document = {
  getElementById: (id) => mockDOM[id] || null
};

// Mock chrome storage
global.chrome = {
  storage: {
    local: {
      get: (keys) => {
        return new Promise(resolve => {
          resolve({ userId: 'test_user_123' });
        });
      },
      set: (data) => {
        return new Promise(resolve => {
          console.log('📝 Storage set:', data);
          resolve();
        });
      }
    }
  }
};

// Mock fetch for Firebase
global.fetch = async (url, options) => {
  console.log('🌍 Mock fetch called:', url);
  
  if (url.includes('/config.json')) {
    return {
      ok: true,
      json: () => Promise.resolve({
        searchFreeLimit: 15,  // Different from default to test
        gmailFreeLimit: 8,    // Different from default to test
        weeklyPrice: 599,     // Different from default to test
        monthlyPrice: 1699    // Different from default to test
      })
    };
  }
  
  if (url.includes('/users/')) {
    return {
      ok: true,
      json: () => Promise.resolve({
        searchUsed: 3,
        gmailUsed: 2,
        subscriptionType: 'free',
        subscriptionExpiry: null
      })
    };
  }
  
  return { ok: false, status: 404 };
};

// Load the Firebase manager
require('./firebase-local.js');

// Test the pricing manager
(async function testPricing() {
  try {
    console.log('🔧 Creating Firebase Manager...');
    const firebaseManager = new global.LocalFirebaseManager();
    await firebaseManager.initialize();
    
    console.log('📊 Getting config...');
    const config = await firebaseManager.getAppConfig();
    console.log('✅ Config:', config);
    
    console.log('👤 Getting user data...');
    const userData = await firebaseManager.getUserData();
    console.log('✅ User data:', userData);
    
    console.log('🧮 Testing usage calculation...');
    const remaining = await firebaseManager.getRemainingUsage();
    console.log('✅ Remaining usage:', remaining);
    
    // Test if the values would update the DOM
    console.log('\n📱 DOM Updates:');
    if (remaining.isPremium) {
      console.log('   Search: ∞ searches (Premium)');
      console.log('   Gmail: ∞ emails (Premium)');
    } else {
      console.log(`   Search: ${remaining.search} searches left`);
      console.log(`   Gmail: ${remaining.gmail} emails left`);
    }
    
    console.log('\n💰 Pricing Updates:');
    console.log(`   Weekly: ${config.weeklyPrice}`);
    console.log(`   Monthly: ${config.monthlyPrice}`);
    console.log(`   Search Limit: ${config.searchFreeLimit}`);
    console.log(`   Gmail Limit: ${config.gmailFreeLimit}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
})();