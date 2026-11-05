/**
 * Xendit Payment Gateway Integration Service
 * E-Kodak Photography Studio
 * Supports: GCash, Maya (PayMaya), GrabPay, ShopeePay, Online Banking (BDO, BPI, UnionBank), QR Ph
 */

const XENDIT_API_URL = 'https://api.xendit.co/v2/invoices';

export const xenditPaymentService = {
  getSecretKey() {
    return (
      import.meta.env.VITE_XENDIT_SECRET_KEY ||
      'xnd_development_qA4nQuonAwImHO6EDyKz1Y1r5oVcjVx3iaHpZJPkzpNtdTTrXBvYx7p5f35iIM3'
    );
  },

  getAuthHeader() {
    const key = this.getSecretKey();
    const encoded = typeof btoa !== 'undefined'
      ? btoa(key + ':')
      : Buffer.from(key + ':').toString('base64');
    return `Basic ${encoded}`;
  },

  /**
   * Create a live Xendit Invoice / Hosted Checkout Session specifically targeted to the customer's choice
   */
  async createInvoice({
    bookingId,
    amount,
    customerName,
    customerEmail,
    customerPhone,
    serviceName,
    tierName,
    paymentChannel = 'gcash' // 'gcash' | 'maya' | 'bank_transfer'
  }) {
    try {
      const externalId = `EK-INV-${bookingId || Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
      
      // Map user choice to exact Xendit supported payment method codes
      let selectedMethods = ['GCASH'];
      let channelLabel = 'GCash';
      if (paymentChannel === 'maya') {
        selectedMethods = ['PAYMAYA'];
        channelLabel = 'Maya';
      } else if (paymentChannel === 'bank_transfer') {
        selectedMethods = ['BDO', 'BPI', 'UNIONBANK', 'RCBC', 'QRPH'];
        channelLabel = 'Online Banking';
      } else {
        selectedMethods = ['GCASH'];
        channelLabel = 'GCash';
      }

      const returnPath = typeof window !== 'undefined' && window.location.pathname.includes('/book')
        ? window.location.pathname
        : '/dashboard/book';

      const payload = {
        external_id: externalId,
        amount: Math.round(Number(amount)),
        description: `Downpayment (${channelLabel}): ${serviceName || 'Photoshoot'} (${tierName || 'Standard'}) — E-Kodak Studios`,
        invoice_duration: 86400,
        currency: 'PHP',
        customer: {
          given_names: customerName || 'Valued Client',
          email: customerEmail || 'client@e-kodak.ph',
          mobile_number: customerPhone ? customerPhone.replace(/[^0-9+]/g, '') : '+639178880123'
        },
        success_redirect_url: `${origin}${returnPath}?payment_status=success&invoice_id={invoice_id}&external_id=${externalId}&channel=${paymentChannel}&step=7`,
        failure_redirect_url: `${origin}${returnPath}?payment_status=failed&step=6`,
        payment_methods: selectedMethods
      };

      const res = await fetch(XENDIT_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error_code === 'REQUEST_FORBIDDEN_ERROR') {
          return {
            success: false,
            errorCode: 'REQUEST_FORBIDDEN_ERROR',
            message: "Your Xendit API key needs 'Invoices: Write' permission. In Xendit Dashboard > Settings > API Keys, please check 'Write' on Invoices."
          };
        }
        return {
          success: false,
          errorCode: data.error_code || 'API_ERROR',
          message: data.message || 'Failed to create Xendit checkout session.'
        };
      }

      return {
        success: true,
        invoiceId: data.id,
        invoiceUrl: data.invoice_url,
        externalId: data.external_id,
        expiryDate: data.expiry_date
      };
    } catch (err) {
      console.error('[Xendit Service Error]', err);
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: err.message || 'Network error connecting to Xendit.'
      };
    }
  },

  /**
   * Check Invoice Status
   */
  async getInvoice(invoiceId) {
    try {
      const res = await fetch(`https://api.xendit.co/v2/invoices/${invoiceId}`, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      return { success: res.ok, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
};
