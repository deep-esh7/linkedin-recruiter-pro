// Local Razorpay wrapper to avoid CSP issues
class RazorpayWrapper {
  constructor() {
    this.scriptLoaded = false;
  }

  async loadScript() {
    return new Promise((resolve, reject) => {
      console.log('📜 SCRIPT DEBUG: Checking if script already loaded');
      console.log('📜 SCRIPT DEBUG: scriptLoaded =', this.scriptLoaded);
      console.log('📜 SCRIPT DEBUG: window.Razorpay =', !!window.Razorpay);
      
      if (this.scriptLoaded || window.Razorpay) {
        console.log('✅ SCRIPT DEBUG: Script already available, resolving');
        resolve();
        return;
      }

      console.log('📜 SCRIPT DEBUG: Creating script element');
      // Create script element
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      
      // Add timeout for script loading
      const timeout = setTimeout(() => {
        console.error('❌ SCRIPT DEBUG: Script loading timeout after 10 seconds');
        reject(new Error('Script loading timeout'));
      }, 10000);
      
      script.onload = () => {
        clearTimeout(timeout);
        console.log('✅ SCRIPT DEBUG: Script loaded successfully');
        console.log('📜 SCRIPT DEBUG: window.Razorpay now =', !!window.Razorpay);
        
        // Double check that Razorpay is actually available
        if (window.Razorpay) {
          this.scriptLoaded = true;
          resolve();
        } else {
          console.error('❌ SCRIPT DEBUG: Script loaded but window.Razorpay not available');
          reject(new Error('Razorpay object not available after script load'));
        }
      };
      
      script.onerror = (error) => {
        clearTimeout(timeout);
        console.error('❌ SCRIPT DEBUG: Failed to load script:', error);
        console.error('❌ SCRIPT DEBUG: This could be due to:');
        console.error('  1. CSP (Content Security Policy) blocking the external script');
        console.error('  2. Network connectivity issues');
        console.error('  3. Extension context restrictions');
        reject(new Error('Failed to load Razorpay script - Check CSP settings and network'));
      };
      
      console.log('📜 SCRIPT DEBUG: Appending script to head');
      document.head.appendChild(script);
    });
  }

  async initiatePayment(options) {
    try {
      console.log('🔧 RAZORPAY DEBUG: Starting payment initiation');
      console.log('🔧 RAZORPAY DEBUG: Options received', options);
      
      // Try to load Razorpay script first
      console.log('🔧 RAZORPAY DEBUG: Loading Razorpay script...');
      await this.loadScript();
      console.log('🔧 RAZORPAY DEBUG: Script loaded successfully');
      
      if (!window.Razorpay) {
        console.log('❌ RAZORPAY DEBUG: window.Razorpay not available');
        throw new Error('Razorpay not available');
      }

      console.log('✅ RAZORPAY DEBUG: window.Razorpay available, creating instance');
      const rzp = new window.Razorpay(options);
      console.log('✅ RAZORPAY DEBUG: Razorpay instance created, opening payment modal');
      rzp.open();
      console.log('✅ RAZORPAY DEBUG: Payment modal opened');
    } catch (error) {
      console.error('❌ RAZORPAY DEBUG: Payment failed:', error);
      console.error('❌ RAZORPAY DEBUG: Error stack:', error.stack);
      // Fallback: Show manual payment instructions
      this.showManualPaymentFallback(options);
    }
  }

  showManualPaymentFallback(options) {
    const amount = (options.amount / 100).toFixed(2);
    console.error('🚨 FALLBACK: Razorpay failed, showing manual payment option');
    
    const message = `
⚠️ Payment Gateway Issue

We're having trouble loading the payment system. This could be due to:
• Browser security settings
• Ad blockers blocking payment scripts
• Network connectivity issues

Amount: ₹${amount}
Plan: ${options.description}

Alternative Options:
1. Refresh the extension and try again
2. Check browser console for error details
3. Contact support for manual payment

Support: support@linkedinrecruiterpro.com
    `;
    
    alert(message);
    
    // Also log detailed debug info
    console.error('💡 TROUBLESHOOTING TIPS:');
    console.error('1. Check if your browser blocks third-party scripts');
    console.error('2. Temporarily disable ad blockers');
    console.error('3. Check browser console for CSP violations');
    console.error('4. Ensure extension has permission for checkout.razorpay.com');
  }
}

// Export for global use
window.RazorpayWrapper = RazorpayWrapper;