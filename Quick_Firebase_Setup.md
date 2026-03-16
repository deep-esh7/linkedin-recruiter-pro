# 🔥 Quick Firebase Database Setup

Since you have the Firebase console open, here's the **fastest way** to set up your database:

## 🚀 Method 1: Copy-Paste JSON (Fastest)

1. **In your Firebase console**, click the **"⋮" menu** → **"Import JSON"**

2. **Copy this entire structure** and paste it:

```json
{
  "config": {
    "searchFreeLimit": 10,
    "gmailFreeLimit": 5,
    "weeklyPrice": 499,
    "monthlyPrice": 1499,
    "razorpayKeyId": "YOUR_RAZORPAY_KEY_ID",
    "razorpaySecretKey": "YOUR_RAZORPAY_SECRET_KEY",
    "features": {
      "unlimited_search": true,
      "unlimited_gmail": true,
      "premium_support": true,
      "advanced_filters": true
    },
    "updatedAt": 1703123456789,
    "version": "1.0"
  },
  "users": {
    "sample_template": {
      "searchUsed": 0,
      "gmailUsed": 0,
      "subscriptionType": "free",
      "subscriptionExpiry": null,
      "createdAt": 1703123456789,
      "lastActive": 1703123456789,
      "note": "Real users will be created automatically"
    }
  },
  "analytics": {
    "daily": {
      "2024-01-15": {
        "totalUsers": 0,
        "newUsers": 0,
        "searchUsage": 0,
        "gmailUsage": 0,
        "revenue": 0,
        "activeSubscriptions": 0
      }
    },
    "totals": {
      "totalUsers": 0,
      "totalRevenue": 0,
      "totalSearches": 0,
      "totalEmails": 0,
      "activeSubscriptions": 0,
      "lastUpdated": 1703123456789
    }
  },
  "admin": {
    "settings": {
      "maintenanceMode": false,
      "newUserRegistration": true,
      "paymentEnabled": true,
      "notificationMessage": "Welcome to LinkedIn Recruiter Pro!",
      "supportEmail": "support@linkedinrecruiterpro.com"
    },
    "logs": {
      "setup": {
        "1703123456789": {
          "action": "manual_setup",
          "timestamp": 1703123456789,
          "status": "completed"
        }
      }
    }
  },
  "payments": {
    "placeholder": {
      "note": "Payment records will be created here automatically",
      "createdAt": 1703123456789
    }
  }
}
```

3. **Click "Import"** and you're done! ✅

## 🛡️ Method 2: Set Database Rules

In the **"Rules"** tab, replace the existing rules with:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

**Note**: This is for development. For production, use more restrictive rules.

## ✅ Verification

After import, your database should show:

```
linked-in-recruiter-pro/
├── config/
│   ├── searchFreeLimit: 10
│   ├── gmailFreeLimit: 5
│   ├── weeklyPrice: 499
│   └── monthlyPrice: 1499
├── users/
├── analytics/
├── admin/
└── payments/
```

## 🎯 Alternative: Use Auto-Setup Script

If you prefer automated setup:

1. Open `auto-setup-firebase.html` in your browser
2. Click "🚀 Auto-Create Database Structure"
3. Watch it create everything automatically

## 🚀 Test the Extension

After database setup:

1. **Load the extension** in Chrome
2. **Open popup** → Should show usage stats
3. **Go to LinkedIn** → Try search functionality
4. **Check Firebase** → Should see user data appearing

**Your database is now ready for LinkedIn Recruiter Pro!** 🎉