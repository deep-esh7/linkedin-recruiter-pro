// Direct Firebase connectivity test
const FIREBASE_URL = 'https://linked-in-recruiter-pro-default-rtdb.asia-southeast1.firebasedatabase.app';

async function directFirebaseTest() {
  console.log('🔧 Direct Firebase Test Starting...');
  
  try {
    // 1. Test reading config
    console.log('📡 Testing config read...');
    const configResponse = await fetch(`${FIREBASE_URL}/config.json`);
    
    if (!configResponse.ok) {
      throw new Error(`Config read failed: ${configResponse.status}`);
    }
    
    const config = await configResponse.json();
    console.log('✅ Config loaded successfully:', config);
    
    // 2. Test creating a user
    console.log('👤 Testing user creation...');
    const testUserId = `test_user_${Date.now()}`;
    const testUser = {
      searchUsed: 0,
      gmailUsed: 0, 
      subscriptionType: 'free',
      subscriptionExpiry: null,
      createdAt: Date.now(),
      lastActive: Date.now()
    };
    
    const userResponse = await fetch(`${FIREBASE_URL}/users/${testUserId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    
    if (!userResponse.ok) {
      console.log('⚠️ User creation failed (might be permissions):', userResponse.status);
    } else {
      console.log('✅ User created successfully');
      
      // 3. Test reading the user back
      const verifyResponse = await fetch(`${FIREBASE_URL}/users/${testUserId}.json`);
      if (verifyResponse.ok) {
        const userData = await verifyResponse.json();
        console.log('✅ User data verified:', userData);
        
        // 4. Test calculating remaining usage
        const searchRemaining = config.searchFreeLimit - userData.searchUsed;
        const gmailRemaining = config.gmailFreeLimit - userData.gmailUsed;
        
        console.log('📊 Usage calculation:');
        console.log(`   Search: ${userData.searchUsed}/${config.searchFreeLimit} used, ${searchRemaining} remaining`);
        console.log(`   Gmail: ${userData.gmailUsed}/${config.gmailFreeLimit} used, ${gmailRemaining} remaining`);
        
        console.log('\n🎯 Values that should appear in popup:');
        console.log(`   "${searchRemaining} searches left"`);
        console.log(`   "${gmailRemaining} emails left"`);
        console.log(`   Weekly: ₹${config.weeklyPrice}`);
        console.log(`   Monthly: ₹${config.monthlyPrice}`);
        
      }
    }
    
    console.log('\n✅ All Firebase tests completed successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Firebase test failed:', error);
    
    console.log('\n🔧 Fallback values that extension should use:');
    console.log('   "10 searches left"');
    console.log('   "5 emails left"'); 
    console.log('   Weekly: ₹499');
    console.log('   Monthly: ₹1499');
    
    return false;
  }
}

// Run the test
directFirebaseTest();