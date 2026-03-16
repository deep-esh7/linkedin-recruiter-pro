// Pricing and Subscription Management
class PricingManager {
  constructor() {
    this.firebaseManager = null;
    this.razorpay = null;
    this.config = null;
  }

  async initialize() {
    this.firebaseManager = new LocalFirebaseManager();
    await this.firebaseManager.initialize();
    this.config = await this.firebaseManager.getAppConfig();
    console.log('💳 Pricing Manager initialized');
  }

  // Check usage before allowing action
  async checkUsageAndProceed(actionType, callback) {
    const canUse = await this.firebaseManager.canUseFeature(actionType);
    
    if (canUse) {
      console.log(`✅ ${actionType} usage allowed, updating count...`);
      // Update usage and proceed
      const updateSuccess = await this.firebaseManager.updateUsage(actionType);
      
      if (updateSuccess) {
        console.log(`📈 ${actionType} usage incremented, executing action...`);
        callback();
        
        // Update display immediately to show new counts
        setTimeout(() => {
          this.updateUsageDisplay();
        }, 100);
      } else {
        console.error(`❌ Failed to update ${actionType} usage`);
        alert('Usage tracking failed. Please try again.');
      }
    } else {
      console.log(`❌ ${actionType} usage limit reached`);
      // Show upgrade prompt
      this.showUpgradePrompt(actionType);
    }
  }

  // Update usage display in popup
  async updateUsageDisplay() {
    const remaining = await this.firebaseManager.getRemainingUsage();
    
    // Update search usage display
    const searchUsage = document.getElementById('searchUsage');
    if (searchUsage) {
      if (remaining.isPremium) {
        searchUsage.textContent = '∞ searches (Premium)';
        searchUsage.className = 'usage-premium';
      } else {
        searchUsage.textContent = `${remaining.search} searches left`;
        searchUsage.className = remaining.search <= 2 ? 'usage-warning' : 'usage-normal';
      }
      
      // Force white styling for blue header
      searchUsage.style.color = 'white';
      searchUsage.style.fontWeight = '500';
      searchUsage.style.textShadow = '0 1px 2px rgba(0,0,0,0.2)';
      searchUsage.style.display = 'block';
    }

    // Update Gmail usage display
    const gmailUsage = document.getElementById('gmailUsage');
    if (gmailUsage) {
      if (remaining.isPremium) {
        gmailUsage.textContent = '∞ emails (Premium)';
        gmailUsage.className = 'usage-premium';
      } else {
        gmailUsage.textContent = `${remaining.gmail} emails left`;
        gmailUsage.className = remaining.gmail <= 1 ? 'usage-warning' : 'usage-normal';
      }
      
      // Force white styling for blue header  
      gmailUsage.style.color = 'white';
      gmailUsage.style.fontWeight = '500';
      gmailUsage.style.textShadow = '0 1px 2px rgba(0,0,0,0.2)';
      gmailUsage.style.display = 'block';
    }

    // Update upgrade button visibility
    const upgradeSection = document.getElementById('upgradeSection');
    if (upgradeSection) {
      upgradeSection.style.display = remaining.isPremium ? 'none' : 'block';
    }
  }

  // Show upgrade prompt
  showUpgradePrompt(actionType) {
    const actionName = actionType === 'search' ? 'search extraction' : 'email automation';
    
    // Show modal or redirect to pricing
    if (confirm(`You've reached your free limit for ${actionName}. Would you like to upgrade to continue?`)) {
      this.showPricingModal();
    }
  }

  // Show pricing modal
  showPricingModal() {
    const modal = document.getElementById('pricingModal');
    if (modal) {
      modal.style.display = 'block';
      this.updatePricingDisplay();
    }
  }

  // Update pricing display with dynamic values
  async updatePricingDisplay() {
    const config = await this.firebaseManager.getAppConfig();
    console.log('💰 Updating pricing display with config:', config);
    
    // Update weekly price (main pricing section)
    const weeklyPrice = document.getElementById('weeklyPrice');
    if (weeklyPrice) {
      weeklyPrice.textContent = config.weeklyPrice;
    }

    // Update monthly price (main pricing section)
    const monthlyPrice = document.getElementById('monthlyPrice');
    if (monthlyPrice) {
      monthlyPrice.textContent = config.monthlyPrice;
    }

    // Update modal pricing
    const modalWeeklyPrice = document.getElementById('modalWeeklyPrice');
    if (modalWeeklyPrice) {
      modalWeeklyPrice.textContent = config.weeklyPrice;
    }

    const modalMonthlyPrice = document.getElementById('modalMonthlyPrice');
    if (modalMonthlyPrice) {
      modalMonthlyPrice.textContent = config.monthlyPrice;
    }

    // Update free limits display (admin configurable)
    const searchLimit = document.getElementById('searchLimit');
    if (searchLimit) {
      searchLimit.textContent = config.searchFreeLimit;
      console.log('📊 Updated search limit display:', config.searchFreeLimit);
    }

    const gmailLimit = document.getElementById('gmailLimit');
    if (gmailLimit) {
      gmailLimit.textContent = config.gmailFreeLimit;
      console.log('📧 Updated gmail limit display:', config.gmailFreeLimit);
    }
  }

  // Initialize Razorpay payment
  async initiatePayment(planType) {
    console.log('💳 PAYMENT DEBUG: Initiating payment for', planType);
    
    try {
      const config = await this.firebaseManager.getAppConfig();
      // Config loaded (don't log sensitive data)
      
      // Validate config
      if (!config.razorpayKeyId || config.razorpayKeyId === 'your_razorpay_key_here') {
        throw new Error('Razorpay key not configured');
      }
      
      const amount = planType === 'weekly' ? config.weeklyPrice : config.monthlyPrice;
      console.log('💳 PAYMENT DEBUG: Amount calculated', amount);
      
      const options = {
        key: config.razorpayKeyId,
        amount: amount * 100, // Amount in paise
        currency: 'INR',
        name: 'LinkedIn Recruiter Pro',
        description: `${planType.charAt(0).toUpperCase() + planType.slice(1)} Subscription`,
        handler: async (response) => {
          await this.handlePaymentSuccess(response, planType);
        },
        prefill: {
          name: 'LinkedIn User',
          email: 'user@example.com'
        },
        theme: {
          color: '#0073b1'
        },
        modal: {
          ondismiss: () => {
            console.log('💳 Payment cancelled by user');
          }
        }
      };

      // Payment options configured (don't log sensitive data)
      
      // Create wrapper if not exists
      if (!this.razorpayWrapper) {
        console.log('💳 PAYMENT DEBUG: Creating new RazorpayWrapper');
        this.razorpayWrapper = new RazorpayWrapper();
      }
      
      console.log('💳 PAYMENT DEBUG: Calling razorpayWrapper.initiatePayment');
      await this.razorpayWrapper.initiatePayment(options);
      console.log('💳 PAYMENT DEBUG: Payment initiation completed');
      
    } catch (error) {
      console.error('💳 PAYMENT ERROR: Failed to initiate payment:', error);
      alert(`Payment initialization failed: ${error.message}\n\nPlease try again or contact support.`);
    }
  }

  // Handle successful payment
  async handlePaymentSuccess(paymentResponse, planType) {
    try {
      console.log('✅ Payment successful:', paymentResponse);
      
      // Update subscription in Firebase
      const success = await this.firebaseManager.updateSubscription('premium', planType);
      
      if (success) {
        alert(`🎉 Congratulations! Your ${planType} subscription is now active!`);
        
        // Close pricing modal
        const modal = document.getElementById('pricingModal');
        if (modal) {
          modal.style.display = 'none';
        }
        
        // Update usage display
        this.updateUsageDisplay();
        
        // Log payment details to Firebase for admin tracking
        await this.logPayment(paymentResponse, planType);
      } else {
        alert('❌ Failed to activate subscription. Please contact support.');
      }
    } catch (error) {
      console.error('❌ Payment processing failed:', error);
      alert('❌ Payment processing failed. Please try again.');
    }
  }

  // Log payment for admin tracking
  async logPayment(paymentResponse, planType) {
    try {
      const paymentData = {
        userId: this.firebaseManager.userId,
        paymentId: paymentResponse.razorpay_payment_id,
        orderId: paymentResponse.razorpay_order_id || null,
        signature: paymentResponse.razorpay_signature || null,
        planType: planType,
        amount: planType === 'weekly' ? this.config.weeklyPrice : this.config.monthlyPrice,
        timestamp: Date.now(),
        status: 'completed'
      };

      await this.firebaseManager.database.ref('payments').push(paymentData);
      console.log('💾 Payment logged to Firebase');
    } catch (error) {
      console.error('❌ Failed to log payment:', error);
    }
  }

  // Get subscription status
  async getSubscriptionStatus() {
    const userData = await this.firebaseManager.getUserData();
    if (!userData) return { active: false };

    const isActive = userData.subscriptionType !== 'free' && 
                    userData.subscriptionExpiry && 
                    userData.subscriptionExpiry > Date.now();

    return {
      active: isActive,
      type: userData.subscriptionType,
      expiry: userData.subscriptionExpiry,
      expiryDate: userData.subscriptionExpiry ? new Date(userData.subscriptionExpiry).toLocaleDateString() : null
    };
  }
}

// Export for use in other files
window.PricingManager = PricingManager;