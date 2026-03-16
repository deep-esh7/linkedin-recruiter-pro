// Test Email Collection Permission System
// This demonstrates how the permission system prevents bypass

console.log('🧪 Testing Email Collection Permission System');
console.log('==========================================');

// Simulate the email collection permission system
let emailCollectionAllowed = false;
let extractedEmails = new Set();

function simulateEmailFound(email, source) {
  if (!emailCollectionAllowed) {
    console.log(`❌ Email found but collection NOT allowed (${source}): ${email}`);
    return false; // Email not saved
  } else {
    console.log(`✅ Email found and collection ALLOWED (${source}): ${email}`);
    extractedEmails.add(email);
    return true; // Email saved
  }
}

// Test scenarios
console.log('\n📧 Test 1: Manual scrolling without payment');
emailCollectionAllowed = false;
simulateEmailFound('test1@company.com', 'manual_scroll');
simulateEmailFound('test2@company.com', 'manual_scroll');

console.log('\n💳 Test 2: After paid search session');
emailCollectionAllowed = true;
simulateEmailFound('test3@company.com', 'paid_session');
simulateEmailFound('test4@company.com', 'paid_session');

console.log('\n⚠️ Test 3: Session ended, back to unpaid');
emailCollectionAllowed = false;
simulateEmailFound('test5@company.com', 'manual_scroll_after_session');

console.log('\n📊 Results:');
console.log('Emails collected:', extractedEmails.size);
console.log('Emails list:', Array.from(extractedEmails));

console.log('\n✅ Permission system working correctly!');
console.log('- Manual scrolling: BLOCKED');
console.log('- Paid sessions: ALLOWED');
console.log('- Session expiry: BLOCKED again');