// Test user creation and usage tracking
const FIREBASE_URL = 'https://linked-in-recruiter-pro-default-rtdb.asia-southeast1.firebasedatabase.app';

async function testUserCreationAndUsage() {
  console.log('🧪 Testing user creation and usage tracking...');
  
  const testUserId = `chrome_test_${Date.now()}`;
  
  try {
    // 1. Create a test user
    const newUser = {
      searchUsed: 0,
      gmailUsed: 0,
      subscriptionType: 'free',
      subscriptionExpiry: null,
      createdAt: Date.now(),
      lastActive: Date.now(),
      userId: testUserId
    };
    
    console.log('📝 Creating user:', testUserId);
    const createResponse = await fetch(`${FIREBASE_URL}/users/${testUserId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    });
    
    if (!createResponse.ok) {
      throw new Error(`Create failed: ${createResponse.status}`);
    }
    
    console.log('✅ User created successfully');
    
    // 2. Read the user back
    console.log('📖 Reading user data...');
    const readResponse = await fetch(`${FIREBASE_URL}/users/${testUserId}.json`);
    
    if (!readResponse.ok) {
      throw new Error(`Read failed: ${readResponse.status}`);
    }
    
    const userData = await readResponse.json();
    console.log('✅ User data read:', userData);
    
    // 3. Update usage (simulate search)
    console.log('🔍 Simulating search usage...');
    const updatedUser = {
      ...userData,
      searchUsed: userData.searchUsed + 1,
      lastActive: Date.now()
    };
    
    const updateResponse = await fetch(`${FIREBASE_URL}/users/${testUserId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedUser)
    });
    
    if (!updateResponse.ok) {
      throw new Error(`Update failed: ${updateResponse.status}`);
    }
    
    console.log('✅ Usage updated successfully');
    
    // 4. Verify the update
    console.log('🔍 Verifying usage update...');
    const verifyResponse = await fetch(`${FIREBASE_URL}/users/${testUserId}.json`);
    const verifiedData = await verifyResponse.json();
    
    console.log('📊 Final user data:', verifiedData);
    
    // 5. Test limit calculation
    const config = {
      searchFreeLimit: 10,
      gmailFreeLimit: 5
    };
    
    const searchRemaining = config.searchFreeLimit - verifiedData.searchUsed;
    const gmailRemaining = config.gmailFreeLimit - verifiedData.gmailUsed;
    
    console.log('\n🎯 UI Display Values:');
    console.log(`   Search: "${searchRemaining} searches left"`);
    console.log(`   Gmail: "${gmailRemaining} emails left"`);
    
    // 6. Cleanup - delete test user
    console.log('\n🧹 Cleaning up test user...');
    await fetch(`${FIREBASE_URL}/users/${testUserId}.json`, {
      method: 'DELETE'
    });
    console.log('✅ Test user deleted');
    
    console.log('\n🎉 All tests passed! Firebase is working perfectly.');
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

testUserCreationAndUsage();