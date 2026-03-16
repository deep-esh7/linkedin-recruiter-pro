# Firebase Realtime Database Setup Instructions

## 📋 Step-by-Step Setup

### 1. 🔥 Go to Firebase Console
- Visit: https://console.firebase.google.com/
- Select your project: **linked-in-recruiter-pro**

### 2. 📊 Create Realtime Database
1. In left sidebar, click **"Realtime Database"**
2. Click **"Create Database"** button
3. Choose **"Start in test mode"** (we'll add security rules later)
4. Select region: **us-central1** (recommended)

### 3. 📝 Import Initial Data Structure
1. In Realtime Database console, click **"Import JSON"**
2. Upload the file: `firebase-database-structure.json`
3. This will create all necessary collections and sample data

**OR manually create this structure:**

```json
{
  "config": {
    "searchFreeLimit": 10,
    "gmailFreeLimit": 5,
    "weeklyPrice": 499,
    "monthlyPrice": 1499,
    "razorpayKeyId": "YOUR_RAZORPAY_KEY_ID",
    "razorpaySecretKey": "YOUR_RAZORPAY_SECRET_KEY"
  }
}
```

### 4. 🔐 Set Security Rules
1. Go to **"Rules"** tab in Realtime Database
2. Replace existing rules with content from `firebase-security-rules.json`
3. Click **"Publish"**

### 5. ✅ Test Database Connection
1. Install and load the extension
2. Open Chrome DevTools → Console
3. Look for: `🔥 Firebase initialized successfully`
4. Check: `✅ Pricing system initialized`

## 📊 Database Structure Explanation

### `config/` - App Configuration
- **searchFreeLimit**: Number of free searches per user
- **gmailFreeLimit**: Number of free emails per user  
- **weeklyPrice**: Weekly subscription price in ₹
- **monthlyPrice**: Monthly subscription price in ₹
- **razorpayKeyId**: Your Razorpay live key
- **razorpaySecretKey**: Your Razorpay secret key

### `users/{userId}/` - User Data
- **searchUsed**: Count of searches used
- **gmailUsed**: Count of emails sent
- **subscriptionType**: "free" or "premium"
- **subscriptionExpiry**: Timestamp when subscription ends
- **createdAt**: User registration timestamp
- **lastActive**: Last activity timestamp

### `payments/{paymentId}/` - Payment Records
- **userId**: Reference to user who paid
- **paymentId**: Razorpay payment ID
- **planType**: "weekly" or "monthly"
- **amount**: Payment amount in ₹
- **status**: "completed", "failed", "pending"
- **timestamp**: Payment timestamp

### `analytics/` - Usage Analytics
- **daily**: Daily usage statistics
- **totals**: Overall platform statistics

## 🎛️ Admin Panel Usage

### Access Admin Panel
1. Open `admin.html` in browser
2. Configure pricing and limits
3. View real-time statistics
4. Monitor user activity

### Dynamic Configuration Changes
- Change **searchFreeLimit** → Affects all new usage checks
- Change **weeklyPrice** → Updates pricing for all users  
- Change **razorpayKeys** → Updates payment gateway immediately
- All changes are **real-time** and **instant**

## 🔧 Troubleshooting

### Firebase Connection Issues
```javascript
// Check in browser console:
console.log('Firebase config:', firebaseConfig);
console.log('Database URL:', firebase.app().options.databaseURL);
```

### Usage Tracking Issues
```javascript
// Test user creation:
// Open extension → Check console for "👤 User ID: chrome_xxx"
// Check Firebase → users/{userId} should be created
```

### Payment Integration Issues
```javascript
// Test payment flow:
// Try clicking upgrade → Should show Razorpay checkout
// Check console for "💳 Payment successful" or error messages
```

## 📈 Monitoring & Analytics

### Real-time User Tracking
- Monitor `users/` collection for new registrations
- Track `searchUsed` and `gmailUsed` counters
- Watch `subscriptionExpiry` for renewals needed

### Revenue Tracking  
- All payments logged in `payments/` collection
- Use admin panel for revenue analytics
- Monitor subscription conversion rates

### Usage Patterns
- Daily analytics in `analytics/daily/`
- Track feature usage trends
- Monitor server costs vs revenue

## 🚀 Going Live Checklist

✅ **Firebase Database** - Created with proper structure  
✅ **Security Rules** - Applied and published  
✅ **Admin Access** - Tested configuration changes  
✅ **Payment Flow** - Tested with Razorpay  
✅ **Usage Limits** - Verified blocking works  
✅ **Analytics** - Confirmed data collection  

**Your LinkedIn Recruiter Pro is ready for production!** 🎉