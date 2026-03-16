// Configuration Template - Replace placeholders with your actual values
// DO NOT commit actual keys to version control

const CONFIG = {
  // Firebase Configuration
  firebase: {
    apiKey: "YOUR_FIREBASE_API_KEY_HERE",
    authDomain: "your-project.firebaseapp.com", 
    databaseURL: "https://your-project-default-rtdb.region.firebasedatabase.app/",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef",
    measurementId: "G-XXXXXXXXXX"
  },
  
  // Razorpay Configuration
  razorpay: {
    keyId: "YOUR_RAZORPAY_KEY_ID_HERE", // rzp_live_xxx or rzp_test_xxx
    secretKey: "YOUR_RAZORPAY_SECRET_KEY_HERE" // Should be stored server-side only
  },
  
  // OAuth Configuration  
  oauth: {
    clientId: "YOUR_GOOGLE_OAUTH_CLIENT_ID_HERE"
  }
};

// Export for use in extension
window.AppConfig = CONFIG;