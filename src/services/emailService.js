import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Sends a booking confirmation email via Supabase Edge Function 'send-email' (configured with SMTP).
 * Automatically logs the email to `email_logs`.
 */
export async function sendBookingConfirmationEmail({
  recipientEmail,
  recipientName = 'Valued Client',
  bookingNumber,
  bookingId = null,
  packageName,
  tierName,
  eventDate,
  preferredTime,
  location,
  downpaymentAmount,
  remainingBalance,
  paymentMethod,
  paymentReference
}) {
  if (!recipientEmail || !isSupabaseConfigured) {
    return { success: false, error: 'Recipient email or database not configured' };
  }

  const subject = `Booking Confirmed: Downpayment Received for ${packageName || 'Photoshoot'} (#${bookingNumber})`;

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f5f0; color: #1a1a1a; margin: 0; padding: 24px; }
        .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e5e0d8; padding: 32px; box-shadow: 0 4px 16px rgba(0,0,0,0.04); }
        .header { border-bottom: 2px solid #f0eae1; padding-bottom: 20px; margin-bottom: 24px; text-align: center; }
        .logo { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #0a0a0f; }
        .status { color: #047857; font-weight: 700; font-size: 14px; margin-top: 6px; }
        .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .details-table td { padding: 10px 0; border-bottom: 1px solid #f2ede4; font-size: 14px; }
        .label { color: #737373; width: 40%; }
        .value { color: #0a0a0f; font-weight: 600; text-align: right; }
        .amount-box { background: #faf8f5; border: 1px solid #e8dfd3; border-radius: 12px; padding: 16px; margin: 24px 0; text-align: center; }
        .amount-label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #8c764f; font-weight: 700; }
        .amount-val { font-size: 28px; font-weight: 800; color: #996515; margin: 4px 0; }
        .footer { text-align: center; font-size: 12px; color: #a3a3a3; margin-top: 24px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="logo">E-KODAK STUDIOS</div>
          <div class="status">Booking Confirmed & Downpayment Settled</div>
        </div>
        <p>Dear <strong>${recipientName}</strong>,</p>
        <p>Your photoshoot slot has been successfully reserved and your downpayment has been confirmed. Below are your booking and payment details:</p>
        
        <table class="details-table">
          <tr><td class="label">Booking Number</td><td class="value">#${bookingNumber}</td></tr>
          <tr><td class="label">Package & Tier</td><td class="value">${packageName || 'Photoshoot'} (${tierName || 'Standard'})</td></tr>
          <tr><td class="label">Photoshoot Schedule</td><td class="value">${eventDate} • ${preferredTime}</td></tr>
          <tr><td class="label">Studio Location</td><td class="value">${location}</td></tr>
          <tr><td class="label">Payment Method</td><td class="value">${paymentMethod}</td></tr>
          <tr><td class="label">Reference Number</td><td class="value">${paymentReference || 'N/A'}</td></tr>
        </table>

        <div class="amount-box">
          <div class="amount-label">Downpayment Settled</div>
          <div class="amount-val">₱${Number(downpaymentAmount || 0).toLocaleString()}</div>
          <div style="font-size: 12px; color: #666; margin-top: 4px;">Remaining Balance: ₱${Number(remainingBalance || 0).toLocaleString()} (payable on session day)</div>
        </div>

        <p style="font-size: 13px; line-height: 1.6; color: #555;">
          You can track this booking and scan your Order Tracking QR Code directly inside your E-Kodak Studio dashboard.
        </p>

        <div class="footer">
          E-Kodak Studios • 331 Rizal Street, City of Naga, Cebu • Contact: reservations@e-kodak.ph
        </div>
      </div>
    </body>
    </html>
  `;

  // 1. Insert into email_logs for administrative tracking
  try {
    await supabase.from('email_logs').insert({
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      subject,
      html_body: htmlBody,
      notification_type: 'BOOKING_CONFIRMATION',
      booking_id: bookingId,
      status: 'QUEUED',
      sent_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('[sendBookingConfirmationEmail] email_logs insert warning:', err.message);
  }

  // 2. Invoke Edge Function send-email (SMTP)
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: recipientEmail,
        subject,
        html: htmlBody,
        recipientName,
        bookingId,
        notificationType: 'BOOKING_CONFIRMATION'
      }
    });

    if (error) {
      console.warn('[sendBookingConfirmationEmail] Edge function SMTP invoke error:', error.message);
      return { success: false, error: error.message };
    }

    if (data && !data.success) {
      console.warn('[sendBookingConfirmationEmail] SMTP response error:', data.error);
      return { success: false, error: data.error };
    }

    console.log('[sendBookingConfirmationEmail] SMTP email sent successfully:', data);
    return { success: true, data };
  } catch (fnErr) {
    console.warn('[sendBookingConfirmationEmail] Edge function unreachable:', fnErr.message);
    return { success: false, error: fnErr.message };
  }
}
