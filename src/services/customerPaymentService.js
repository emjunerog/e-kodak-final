import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Service to handle customer payment operations, invoice tracking, and downpayment/full payments.
 */
export const customerPaymentService = {
  /**
   * Helper to parse any currency string or number to a clean float
   */
  parseAmount(val) {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const cleaned = String(val).replace(/[^0-9.]/g, '');
    return parseFloat(cleaned) || 0;
  },

  /**
   * Get all payments and pending bookings for a customer with intelligent price fallback
   */
  async getCustomerBillingData(customerId) {
    if (!isSupabaseConfigured || !supabase) {
      return { 
        success: true, 
        bookings: [], 
        payments: [], 
        summary: { totalInvoiced: 0, totalPaid: 0, totalBalance: 0, pendingCount: 0, paidCount: 0 } 
      };
    }

    try {
      // 1. Fetch all bookings for this customer, including services, tiers, and base prices
      const { data: rawBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_number,
          event_date,
          preferred_time,
          total_amount,
          down_payment_amount,
          remaining_balance,
          payment_status,
          status,
          tier_name,
          down_payment_confirmed,
          created_at,
          services:service_id (
            id,
            name,
            base_price,
            tiers,
            inclusions,
            cover_image
          )
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;

      const bookingList = rawBookings || [];
      const bookingIds = bookingList.map((b) => b.id);

      // 2. Fetch all recorded payments for these bookings
      let payments = [];
      if (bookingIds.length > 0) {
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payments')
          .select('*')
          .in('booking_id', bookingIds)
          .order('payment_date', { ascending: false });

        if (paymentsError) throw paymentsError;
        payments = paymentsData || [];
      }

      // 3. Resolve accurate pricing for each booking
      const resolvedBookings = bookingList.map((b) => {
        let total = parseFloat(b.total_amount) || 0;

        // If total_amount was 0 or unrecorded, look up package tier pricing
        if (total <= 0 && b.services?.tiers) {
          const tiersArr = Array.isArray(b.services.tiers) ? b.services.tiers : [];
          const matchingTier = tiersArr.find(
            (t) => (t.name || '').trim().toLowerCase() === (b.tier_name || '').trim().toLowerCase()
          );
          if (matchingTier?.price) {
            total = this.parseAmount(matchingTier.price);
          } else if (tiersArr.length > 0 && tiersArr[0]?.price) {
            total = this.parseAmount(tiersArr[0].price);
          }
        }

        // Fallback to service base_price if still 0
        if (total <= 0 && b.services?.base_price) {
          total = parseFloat(b.services.base_price) || 0;
        }

        // Ultimate reasonable default if still 0
        if (total <= 0) {
          total = 1500;
        }

        // Sum actual payments recorded for this booking
        const bPayments = payments.filter((p) => p.booking_id === b.id);
        const paidFromRecords = bPayments.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);
        const recordedDown = parseFloat(b.down_payment_amount) || 0;
        const paidSoFar = Math.max(paidFromRecords, recordedDown);

        const remaining = Math.max(0, total - paidSoFar);
        const isPaid = (b.payment_status === 'paid' || remaining <= 0) && paidSoFar > 0;

        // Proactively heal the database record if total_amount was previously 0.00
        if ((parseFloat(b.total_amount) || 0) <= 0 && total > 0) {
          supabase
            .from('bookings')
            .update({ 
              total_amount: total, 
              remaining_balance: remaining,
              updated_at: new Date().toISOString()
            })
            .eq('id', b.id)
            .then();
        }

        const bookingRef = b.booking_number || `BK-${b.id.slice(0, 8)}`;

        return {
          ...b,
          booking_number: bookingRef,
          booking_reference: bookingRef,
          total_amount: total,
          down_payment_amount: paidSoFar,
          remaining_balance: remaining,
          payment_status: isPaid ? 'paid' : (paidSoFar > 0 ? 'partial' : 'unpaid'),
        };
      });

      // Map payments to include official booking number & package name
      const paymentsWithBooking = payments.map((p) => {
        const matchingBooking = resolvedBookings.find((b) => b.id === p.booking_id);
        const ref = matchingBooking?.booking_number || `BK-${p.booking_id?.slice(0, 8)}`;
        return {
          ...p,
          booking_reference: ref,
          package_name: matchingBooking?.services?.name || matchingBooking?.tier_name || 'Studio Package',
        };
      });

      // Calculate totals
      const totalInvoiced = resolvedBookings.reduce((acc, b) => acc + (b.total_amount || 0), 0);
      const totalPaid = paymentsWithBooking.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);
      const totalBalance = resolvedBookings.reduce((acc, b) => {
        return acc + (b.payment_status === 'paid' ? 0 : b.remaining_balance);
      }, 0);

      const pendingInvoices = resolvedBookings.filter((b) => b.payment_status !== 'paid');

      return {
        success: true,
        bookings: resolvedBookings,
        payments: paymentsWithBooking,
        summary: {
          totalInvoiced,
          totalPaid,
          totalBalance: Math.max(0, totalBalance),
          pendingCount: pendingInvoices.length,
          paidCount: paymentsWithBooking.length,
        },
      };
    } catch (err) {
      console.error('Error fetching customer billing data:', err);
      return { 
        success: false, 
        error: err.message, 
        bookings: [], 
        payments: [], 
        summary: { totalInvoiced: 0, totalPaid: 0, totalBalance: 0, pendingCount: 0, paidCount: 0 } 
      };
    }
  },

  /**
   * Submit a payment on behalf of customer (Downpayment or Full Payment)
   */
  async submitPayment({
    bookingId,
    amount,
    paymentType, // 'downpayment' | 'full' | 'balance'
    paymentMethod, // 'gcash' | 'maya' | 'bank_transfer' | 'counter'
    referenceNumber,
    notes = '',
    recordedBy = null,
  }) {
    try {
      // 1. Fetch current booking state
      const { data: booking, error: bErr } = await supabase
        .from('bookings')
        .select(`
          *,
          services:service_id (
            id,
            name,
            base_price,
            tiers
          )
        `)
        .eq('id', bookingId)
        .single();

      if (bErr || !booking) throw new Error(bErr?.message || 'Booking not found');

      const payAmount = parseFloat(amount) || 0;
      if (payAmount <= 0) throw new Error('Payment amount must be greater than zero');

      // Resolve total if it was 0 in DB
      let totalAmount = parseFloat(booking.total_amount) || 0;
      if (totalAmount <= 0 && booking.services?.tiers) {
        const matchingTier = Array.isArray(booking.services.tiers)
          ? booking.services.tiers.find((t) => (t.name || '').toLowerCase() === (booking.tier_name || '').toLowerCase())
          : null;
        if (matchingTier?.price) {
          totalAmount = this.parseAmount(matchingTier.price);
        }
      }
      if (totalAmount <= 0) {
        totalAmount = payAmount;
      }

      // 2. Map payment_type and payment_method to exact uppercase DB enum constraints
      let dbPaymentType = 'OTHER';
      const ptLower = (paymentType || '').toLowerCase();
      if (ptLower.includes('down')) {
        dbPaymentType = 'DOWN_PAYMENT';
      } else if (ptLower.includes('full') || ptLower.includes('final') || ptLower.includes('bal')) {
        dbPaymentType = 'FINAL_PAYMENT';
      }

      let dbPaymentMethod = 'OTHER';
      const pmLower = (paymentMethod || '').toLowerCase();
      if (pmLower.includes('gcash') || pmLower.includes('maya') || pmLower.includes('wallet')) {
        dbPaymentMethod = 'E_WALLET';
      } else if (pmLower.includes('bank')) {
        dbPaymentMethod = 'BANK_TRANSFER';
      } else if (pmLower.includes('counter') || pmLower.includes('cash')) {
        dbPaymentMethod = 'CASH';
      }

      // Check current auth user for recorded_by
      let authUserId = recordedBy;
      if (!authUserId) {
        const { data: authData } = await supabase.auth.getUser();
        authUserId = authData?.user?.id || null;
      }

      const refNum = referenceNumber || `REF-${Date.now().toString(36).toUpperCase()}`;
      const { data: paymentRecord, error: pErr } = await supabase
        .from('payments')
        .insert({
          booking_id: bookingId,
          amount: payAmount,
          payment_type: dbPaymentType,
          payment_method: dbPaymentMethod,
          reference_number: refNum,
          payment_date: new Date().toISOString(),
          recorded_by: authUserId,
          notes: notes || `Customer registered payment for ${refNum} (${paymentMethod?.toUpperCase()})`,
        })
        .select()
        .single();

      if (pErr) throw pErr;

      // 3. Trigger `update_booking_balance` automatically recalculated booking balances in PostgreSQL.
      // Proactively refresh booking state
      const prevDown = parseFloat(booking.down_payment_amount) || 0;
      const newPaidTotal = prevDown + payAmount;
      const newRemaining = Math.max(0, totalAmount - newPaidTotal);
      const isFullyPaid = newRemaining <= 0;

      // If total_amount was previously 0, update it if permitted
      if (parseFloat(booking.total_amount) <= 0 && totalAmount > 0) {
        try {
          await supabase
            .from('bookings')
            .update({ total_amount: totalAmount, updated_at: new Date().toISOString() })
            .eq('id', bookingId);
        } catch (_) {
          // Handled by trigger
        }
      }

      return {
        success: true,
        payment: paymentRecord,
        remainingBalance: newRemaining,
        isFullyPaid,
      };
    } catch (err) {
      console.error('Error submitting customer payment:', err);
      return { success: false, error: err.message };
    }
  },
};
