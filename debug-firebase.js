// Debug Firebase connection
console.log('🔍 Debugging Firebase connection...');

const URLS_TO_TEST = [
  'https://linkedin-recruiter-pro-default-rtdb.asia-southeast1.firebasedatabase.app',
  'https://linked-in-recruiter-pro-default-rtdb.asia-southeast1.firebasedatabase.app',
  'https://linkedin-recruiter-pro-default-rtdb.firebaseio.com',
  'https://linked-in-recruiter-pro-default-rtdb.firebaseio.com'
];

async function testFirebaseURL(url) {
  console.log(`\n🧪 Testing URL: ${url}`);
  
  try {
    // Test basic connection
    const configResponse = await fetch(`${url}/config.json`);
    console.log(`   Status: ${configResponse.status}`);
    
    if (configResponse.ok) {
      const config = await configResponse.json();
      console.log('   ✅ SUCCESS! Config found:', config);
      return url;
    } else {
      console.log(`   ❌ Failed: ${configResponse.status} ${configResponse.statusText}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  return null;
}

async function findWorkingURL() {
  console.log('🔍 Testing multiple Firebase URLs...');
  
  for (const url of URLS_TO_TEST) {
    const workingUrl = await testFirebaseURL(url);
    if (workingUrl) {
      console.log(`\n✅ Found working URL: ${workingUrl}`);
      
      // Try to create a test config
      try {
        const testConfig = {
          searchFreeLimit: 10,
          gmailFreeLimit: 5,
          weeklyPrice: 499,
          monthlyPrice: 1499,
          testConnection: true,
          timestamp: Date.now()
        };
        
        const putResponse = await fetch(`${workingUrl}/config.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testConfig)
        });
        
        if (putResponse.ok) {
          console.log('✅ Successfully created config in database');
          
          // Read it back to verify
          const verifyResponse = await fetch(`${workingUrl}/config.json`);
          if (verifyResponse.ok) {
            const savedConfig = await verifyResponse.json();
            console.log('✅ Verified saved config:', savedConfig);
          }
        } else {
          console.log(`❌ Failed to write config: ${putResponse.status}`);
        }
      } catch (writeError) {
        console.log(`❌ Write test failed: ${writeError.message}`);
      }
      
      return workingUrl;
    }
  }
  
  console.log('\n❌ No working Firebase URL found');
  console.log('💡 Possible solutions:');
  console.log('   1. Check Firebase project exists');
  console.log('   2. Verify database rules allow read/write');
  console.log('   3. Ensure correct region is selected');
  
  return null;
}

findWorkingURL().then(workingUrl => {
  if (workingUrl) {
    console.log('\n🎉 Firebase connection successful!');
    console.log(`📝 Update firebase-local.js with: ${workingUrl}`);
  } else {
    console.log('\n❌ Firebase connection failed');
    console.log('💡 Extension will use fallback values');
  }
});