// Test Firebase configuration setup
// This script sets up the admin-configurable values in Firebase

const FIREBASE_URL = 'https://linkedin-recruiter-pro-default-rtdb.asia-southeast1.firebasedatabase.app';

async function setupAdminConfig() {
  console.log('🔧 Setting up Firebase admin configuration...');
  
  // Admin-configurable settings
  const adminConfig = {
    // Usage limits (admin can change these in Firebase console)
    searchFreeLimit: 10,     // Free users get 10 searches
    gmailFreeLimit: 5,       // Free users get 5 email automations
    
    // Pricing (admin can change these in Firebase console)
    weeklyPrice: 499,        // ₹499 for weekly plan
    monthlyPrice: 1499,      // ₹1499 for monthly plan
    
    // Payment settings
    razorpayKeyId: 'rzp_live_Rsmpg2dDv0X1KT',
    razorpaySecretKey: 'naxBQ2qaAFkc36FZylpaqCUd',
    
    // Feature flags
    enablePremiumFeatures: true,
    enableUsageTracking: true,
    enablePayments: true,
    
    // Admin metadata
    lastUpdated: Date.now(),
    updatedBy: 'admin_setup_script',
    version: '1.0'
  };
  
  try {
    // Set admin configuration
    const configResponse = await fetch(`${FIREBASE_URL}/config.json`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(adminConfig)
    });
    
    if (!configResponse.ok) {
      throw new Error(`HTTP ${configResponse.status}: ${configResponse.statusText}`);
    }
    
    console.log('✅ Admin configuration saved to Firebase:');
    console.log('   📊 Search limit:', adminConfig.searchFreeLimit);
    console.log('   📧 Gmail limit:', adminConfig.gmailFreeLimit);
    console.log('   💰 Weekly price: ₹' + adminConfig.weeklyPrice);
    console.log('   💰 Monthly price: ₹' + adminConfig.monthlyPrice);
    
    // Test reading the configuration back
    const testResponse = await fetch(`${FIREBASE_URL}/config.json`);
    if (testResponse.ok) {
      const savedConfig = await testResponse.json();
      console.log('✅ Configuration verified in Firebase:', savedConfig);
    }
    
    // Create sample user for testing
    const sampleUser = {
      searchUsed: 3,           // User has used 3 searches
      gmailUsed: 1,            // User has used 1 email automation
      subscriptionType: 'free', // Free plan
      subscriptionExpiry: null,
      createdAt: Date.now(),
      lastActive: Date.now()
    };
    
    const userResponse = await fetch(`${FIREBASE_URL}/users/sample_user_123.json`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sampleUser)
    });
    
    if (userResponse.ok) {
      console.log('✅ Sample user created for testing');
      console.log('   🔍 Searches remaining:', adminConfig.searchFreeLimit - sampleUser.searchUsed);
      console.log('   📧 Emails remaining:', adminConfig.gmailFreeLimit - sampleUser.gmailUsed);
    }
    
  } catch (error) {
    console.error('❌ Failed to setup configuration:', error);
  }
}

async function testUsageCalculation() {
  console.log('\n🧪 Testing usage calculation...');
  
  try {
    // Get config
    const configResponse = await fetch(`${FIREBASE_URL}/config.json`);
    const config = await configResponse.json();
    
    // Get sample user
    const userResponse = await fetch(`${FIREBASE_URL}/users/sample_user_123.json`);
    const user = await userResponse.json();
    
    if (config && user) {
      const searchRemaining = config.searchFreeLimit - user.searchUsed;
      const gmailRemaining = config.gmailFreeLimit - user.gmailUsed;
      
      console.log('📊 Usage Calculation Results:');
      console.log(`   Search: ${user.searchUsed}/${config.searchFreeLimit} used, ${searchRemaining} remaining`);
      console.log(`   Gmail: ${user.gmailUsed}/${config.gmailFreeLimit} used, ${gmailRemaining} remaining`);
      
      // Test premium user
      const premiumUser = {
        ...user,
        subscriptionType: 'premium',
        subscriptionExpiry: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days from now
      };
      
      const isPremium = premiumUser.subscriptionType !== 'free' && 
                       premiumUser.subscriptionExpiry && 
                       premiumUser.subscriptionExpiry > Date.now();
      
      console.log('\n💎 Premium User Test:');
      console.log(`   Is Premium: ${isPremium}`);
      console.log(`   Search: ${isPremium ? '∞ unlimited' : searchRemaining + ' remaining'}`);
      console.log(`   Gmail: ${isPremium ? '∞ unlimited' : gmailRemaining + ' remaining'}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the setup
setupAdminConfig().then(() => {
  return testUsageCalculation();
}).then(() => {
  console.log('\n✅ Firebase setup complete!');
  console.log('🔥 Admin can now modify these values in Firebase Console:');
  console.log('   • Go to: https://console.firebase.google.com/');
  console.log('   • Select your project');
  console.log('   • Navigate to Realtime Database');
  console.log('   • Edit values under /config/searchFreeLimit and /config/gmailFreeLimit');
  console.log('   • Changes will be reflected in the extension immediately');
});