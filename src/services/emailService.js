import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

/**
 * Builds the luxury HTML template for Payment Security Verification (OTP).
 * Follows E-Kodak Studios signature editorial aesthetic:
 * - Playfair Display editorial wordmark & headings
 * - Inter / system-ui clean modern typography for body, tables & badges
 * - Strict lining-nums for the 6-digit OTP passcode (no awkward Georgia descenders)
 * - Deep emerald (#0d2a1c) & warm gold (#c9a96e / #d4af37)
 */
export function renderPaymentVerificationEmailHtml({
  recipientName = 'Valued Client',
  otpCode,
  packageName = 'Photoshoot Session',
  downpaymentAmount = 0,
  eventDate = '',
  preferredTime = '',
  expiryMinutes = 10
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Security Verification — E-Kodak Studios</title>
  <!-- Google Fonts: Playfair Display (editorial) + Inter (clean modern body) -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600&family=Inter:wght@400;500;600;700;800&display=swap');
    
    * {
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .brand-heading {
      font-family: 'Playfair Display', 'Times New Roman', serif !important;
    }
    .body-font {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
    }
    .num-lining {
      font-variant-numeric: lining-nums tabular-nums !important;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f6f4ee; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1a1714;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f4ee; padding: 32px 12px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e7ded0; box-shadow: 0 12px 36px rgba(0,0,0,0.06);">
          
          <!-- Top Studio Emerald Banner -->
          <tr>
            <td style="background: #0d2a1c; padding: 32px 28px; text-align: center;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="font-family: 'Playfair Display', 'Times New Roman', serif; font-size: 22px; font-weight: 800; letter-spacing: 3.5px; color: #ffffff; text-transform: uppercase;">
                      E-KODAK STUDIOS
                    </div>
                    <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10.5px; letter-spacing: 2px; color: #c9a96e; text-transform: uppercase; margin-top: 6px; font-weight: 700;">
                      Editorial &amp; Commemorative Photography • Naga, Cebu
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Gold Accent Divider Line -->
          <tr>
            <td style="height: 3px; background-color: #c9a96e; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 36px 32px 28px 32px;">

              <!-- Headline -->
              <h1 style="font-family: 'Playfair Display', 'Times New Roman', serif; font-size: 25px; font-weight: 700; color: #0d2a1c; margin: 0 0 12px 0; line-height: 1.3; letter-spacing: -0.3px;">
                Authorize Payment
              </h1>

              <p style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.6; color: #4b4844; margin: 0 0 20px 0;">
                Dear <strong>${recipientName}</strong>,<br>
                Please use the 6-digit one-time code below to authorize your 50% reservation downpayment before proceeding through the payment gateway.
              </p>

              <!-- Transaction Summary Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #faf7f2; border: 1px solid #ece4d7; border-radius: 14px; padding: 16px 20px; margin-bottom: 24px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <tr>
                  <td>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size: 11px; font-weight: 600; color: #78716c; text-transform: uppercase; letter-spacing: 0.8px; padding-bottom: 6px;">Photoshoot Package</td>
                        <td align="right" style="font-size: 13px; font-weight: 700; color: #1a1714; padding-bottom: 6px;">${packageName}</td>
                      </tr>
                      ${eventDate ? `
                      <tr>
                        <td style="font-size: 11px; font-weight: 600; color: #78716c; text-transform: uppercase; letter-spacing: 0.8px; padding-bottom: 6px;">Scheduled Date</td>
                        <td align="right" style="font-size: 13px; font-weight: 600; color: #1a1714; padding-bottom: 6px; font-variant-numeric: lining-nums tabular-nums;">${eventDate} ${preferredTime ? '• ' + preferredTime : ''}</td>
                      </tr>` : ''}
                      <tr>
                        <td style="font-size: 11px; font-weight: 700; color: #78716c; text-transform: uppercase; letter-spacing: 0.8px; border-top: 1px dashed #ded4c5; padding-top: 10px;">Downpayment Required</td>
                        <td align="right" style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 17px; font-weight: 800; color: #0d2a1c; border-top: 1px dashed #ded4c5; padding-top: 10px; font-variant-numeric: lining-nums tabular-nums;">₱${Number(downpaymentAmount || 0).toLocaleString()}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- 6-Digit OTP Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                <tr>
                  <td align="center" style="background-color: #fbf8f2; border: 2px dashed #c9a96e; border-radius: 16px; padding: 26px 16px;">
                    <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 2px; color: #8c764f; text-transform: uppercase; margin-bottom: 8px;">
                      Your One-Time Passcode
                    </div>
                    <!-- Crisp Modern Lining Numerals: Inter / SF Pro / Segoe UI / Roboto -->
                    <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 40px; font-weight: 800; letter-spacing: 14px; text-indent: 14px; color: #0d2a1c; margin: 4px 0 10px 0; font-variant-numeric: lining-nums tabular-nums; line-height: 1.2;">
                      ${otpCode}
                    </div>
                    <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #78716c; font-weight: 500;">
                      Valid for <strong>${expiryMinutes} minutes</strong>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Security Notice -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px 8px 8px 4px; padding: 12px 16px; margin-bottom: 24px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <tr>
                  <td style="font-size: 12px; line-height: 1.5; color: #92400e;">
                    <strong>Security Notice:</strong> Never share this code with anyone. E-Kodak staff will never request your verification code. If you did not initiate this booking, you can safely disregard this message.
                  </td>
                </tr>
              </table>

              <p style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; line-height: 1.5; color: #78716c; margin: 0; text-align: center;">
                Need help? Contact studio reservations at <a href="mailto:reservations@e-kodak.ph" style="color: #0d2a1c; font-weight: 600; text-decoration: underline;">reservations@e-kodak.ph</a>.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #faf7f2; border-top: 1px solid #e7ded0; padding: 24px 32px; text-align: center;">
              <div style="font-family: 'Playfair Display', 'Times New Roman', serif; font-size: 14px; font-weight: 800; letter-spacing: 2px; color: #0d2a1c; text-transform: uppercase;">
                E-KODAK STUDIOS
              </div>
              <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: #8c8275; margin-top: 4px;">
                331 Rizal Street, City of Naga, Cebu • Non-VAT Reg. TIN: 402-991-824-000
              </div>
              <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; color: #a8a29e; margin-top: 8px;">
                &copy; ${new Date().getFullYear()} E-Kodak Studios. All rights reserved.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Builds the luxury HTML template for Booking Confirmation & Official Receipt.
 * Matches the studio's in-app Official Receipt layout:
 * - Studio TIN, Address, OR Number, Booking Ref
 * - Client & Schedule Details
 * - Itemized Payment Breakdown with 50% Settled badge
 * - Camera-Ready QR Pass portal link
 */
export function renderBookingConfirmationReceiptHtml({
  recipientName = 'Valued Client',
  bookingNumber = 'BK-2026-00001',
  receiptNumber = 'OR-2026-00001',
  packageName = 'Photoshoot Session',
  tierName = 'Standard',
  eventDate = 'Upcoming Date',
  preferredTime = 'Scheduled Slot',
  location = 'E-Kodak Studio, 331 Rizal Street, City of Naga, Cebu',
  downpaymentAmount = 0,
  remainingBalance = 0,
  totalAmount = null,
  paymentMethod = 'GCASH',
  paymentReference = 'N/A',
  issuedDate = null,
  bookingUrl = null
}) {
  const formattedIssuedDate = issuedDate || new Date().toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
  const computedTotal = totalAmount != null ? totalAmount : (Number(downpaymentAmount || 0) + Number(remainingBalance || 0));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Official Payment Receipt &amp; Booking Confirmation — E-Kodak Studios</title>
  <!-- Google Fonts: Playfair Display (editorial) + Inter (clean modern body) -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600&family=Inter:wght@400;500;600;700;800&display=swap');
    
    * {
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .brand-heading {
      font-family: 'Playfair Display', 'Times New Roman', serif !important;
    }
    .body-font {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
    }
    .num-lining {
      font-variant-numeric: lining-nums tabular-nums !important;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f6f4ee; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1a1714;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f4ee; padding: 32px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e7ded0; box-shadow: 0 12px 36px rgba(0,0,0,0.06);">
          
          <!-- Top Studio Emerald Header -->
          <tr>
            <td style="background: #0d2a1c; padding: 32px 28px; text-align: center;">
              <div style="font-family: 'Playfair Display', 'Times New Roman', serif; font-size: 24px; font-weight: 800; letter-spacing: 3.5px; color: #ffffff; text-transform: uppercase;">
                E-KODAK STUDIOS
              </div>
              <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10.5px; letter-spacing: 2px; color: #c9a96e; text-transform: uppercase; margin-top: 6px; font-weight: 700;">
                Official Photography Receipt &amp; Confirmation
              </div>
            </td>
          </tr>

          <!-- Gold Accent Divider Line -->
          <tr>
            <td style="height: 3px; background-color: #c9a96e; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 28px 24px 28px;">

              <!-- Greeting -->
              <h1 style="font-family: 'Playfair Display', 'Times New Roman', serif; font-size: 24px; font-weight: 700; color: #0d2a1c; margin: 0 0 10px 0; line-height: 1.3; letter-spacing: -0.3px;">
                Photoshoot Reservation Confirmed
              </h1>
              <p style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.6; color: #4b4844; margin: 0 0 24px 0;">
                Dear <strong>${recipientName}</strong>,<br>
                Thank you for choosing E-Kodak Studios. We have successfully received your 50% reservation downpayment and locked in your studio slot. Below is your official electronic receipt:
              </p>

              <!-- OFFICIAL RECEIPT CARD -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fffdf9; border: 1px solid #e2d9cd; border-radius: 16px; padding: 22px; margin-bottom: 24px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <tr>
                  <td>
                    <!-- Receipt Header -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom: 2px dashed #ded4c5; padding-bottom: 14px; margin-bottom: 14px;">
                      <tr>
                        <td>
                          <div style="font-family: 'Playfair Display', 'Times New Roman', serif; font-size: 16px; font-weight: 800; color: #0d2a1c; letter-spacing: 1px;">
                            OFFICIAL RECEIPT
                          </div>
                          <div style="font-size: 10px; color: #78716c; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; font-weight: 600;">
                            TIN: 402-991-824-000 • Non-VAT Reg.
                          </div>
                        </td>
                        <td align="right">
                          <div style="font-size: 10px; color: #78716c; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Receipt No.</div>
                          <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace; font-size: 13px; font-weight: 800; color: #0d2a1c; font-variant-numeric: lining-nums tabular-nums;">${receiptNumber}</div>
                        </td>
                      </tr>
                    </table>

                    <!-- Metadata Grid -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom: 1px dashed #ded4c5; padding-bottom: 12px; margin-bottom: 14px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      <tr>
                        <td style="font-size: 11px; font-weight: 600; color: #78716c; text-transform: uppercase; padding: 4px 0; width: 40%;">Booking Reference:</td>
                        <td align="right" style="font-size: 12px; font-weight: 700; color: #92400e; padding: 4px 0; font-variant-numeric: lining-nums tabular-nums;">#${bookingNumber}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 11px; font-weight: 600; color: #78716c; text-transform: uppercase; padding: 4px 0;">Date Issued:</td>
                        <td align="right" style="font-size: 12px; font-weight: 600; color: #1a1714; padding: 4px 0; font-variant-numeric: lining-nums tabular-nums;">${formattedIssuedDate}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 11px; font-weight: 600; color: #78716c; text-transform: uppercase; padding: 4px 0;">Client Name:</td>
                        <td align="right" style="font-size: 12px; font-weight: 600; color: #1a1714; padding: 4px 0;">${recipientName}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 11px; font-weight: 600; color: #78716c; text-transform: uppercase; padding: 4px 0;">Session Schedule:</td>
                        <td align="right" style="font-size: 12px; font-weight: 600; color: #1a1714; padding: 4px 0; font-variant-numeric: lining-nums tabular-nums;">${eventDate} • ${preferredTime}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 11px; font-weight: 600; color: #78716c; text-transform: uppercase; padding: 4px 0;">Studio Venue:</td>
                        <td align="right" style="font-size: 12px; font-weight: 500; color: #1a1714; padding: 4px 0;">${location}</td>
                      </tr>
                    </table>

                    <!-- Itemized Statement -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom: 2px dashed #ded4c5; padding-bottom: 12px; margin-bottom: 14px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      <tr style="border-bottom: 1px solid #eee7dc;">
                        <td style="font-size: 10px; font-weight: 700; color: #78716c; text-transform: uppercase; letter-spacing: 0.8px; padding-bottom: 8px;">Description</td>
                        <td align="right" style="font-size: 10px; font-weight: 700; color: #78716c; text-transform: uppercase; letter-spacing: 0.8px; padding-bottom: 8px;">Amount (PHP)</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; font-weight: 600; color: #1a1714; padding: 6px 0;">
                          ${packageName} ${tierName ? '(' + tierName + ')' : ''}
                        </td>
                        <td align="right" style="font-size: 13px; font-weight: 700; color: #1a1714; padding: 6px 0; font-variant-numeric: lining-nums tabular-nums;">
                          ₱${Number(computedTotal || 0).toLocaleString()}
                        </td>
                      </tr>
                    </table>

                    <!-- Payment Summary Box -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 12px 16px; margin-bottom: 12px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      <tr>
                        <td>
                          <div style="font-size: 12px; font-weight: 700; color: #065f46;">
                            50% Downpayment Settled
                          </div>
                          <div style="font-size: 11px; color: #047857; margin-top: 2px;">
                            Verified via ${paymentMethod || 'GCASH'} (Ref: ${paymentReference || 'N/A'})
                          </div>
                        </td>
                        <td align="right">
                          <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 18px; font-weight: 800; color: #065f46; font-variant-numeric: lining-nums tabular-nums;">
                            ₱${Number(downpaymentAmount || 0).toLocaleString()}
                          </div>
                          <div style="font-size: 10px; font-weight: 700; color: #059669; text-transform: uppercase; letter-spacing: 0.5px;">
                            CONFIRMED
                          </div>
                        </td>
                      </tr>
                    </table>

                    <!-- Remaining Balance Due -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      <tr>
                        <td style="font-size: 12px; font-weight: 600; color: #4b4844;">
                          Balance Payable on Session Day:
                        </td>
                        <td align="right" style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 800; color: #1a1714; font-variant-numeric: lining-nums tabular-nums;">
                          ₱${Number(remainingBalance || 0).toLocaleString()}
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

              <!-- QR Pass CTA Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #141416; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <tr>
                  <td>
                    <div style="font-family: 'Playfair Display', 'Times New Roman', serif; font-size: 18px; font-weight: 700; color: #f5f4f0; margin-bottom: 6px; letter-spacing: -0.2px;">
                      Your Camera-Ready QR Pass is Active
                    </div>
                    <p style="font-size: 12px; line-height: 1.5; color: #a8a29e; margin: 0 0 16px 0;">
                      Show your QR pass when checking in at E-Kodak Studios. You can access your pass, booking tracking, and digital soft copies directly in your portal.
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                      <tr>
                        <td align="center" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 9999px;">
                          <a href="${bookingUrl || 'https://e-kodak.ph/dashboard/bookings'}" target="_blank" style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 800; color: #1a1714; text-decoration: none; padding: 12px 28px; display: inline-block; letter-spacing: 0.5px;">
                            View Booking &amp; QR Pass →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; line-height: 1.5; color: #78716c; text-align: center; margin: 0;">
                Studio Address: 331 Rizal Street, City of Naga, Cebu • Need to reschedule? Please notify the studio at least 24 hours in advance.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #faf7f2; border-top: 1px solid #e7ded0; padding: 24px 32px; text-align: center;">
              <div style="font-family: 'Playfair Display', 'Times New Roman', serif; font-size: 14px; font-weight: 800; letter-spacing: 2px; color: #0d2a1c; text-transform: uppercase;">
                E-KODAK STUDIOS
              </div>
              <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: #8c8275; margin-top: 4px;">
                Official Electronic Receipt • Issued in City of Naga, Cebu, Philippines
              </div>
              <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; color: #a8a29e; margin-top: 8px;">
                &copy; ${new Date().getFullYear()} E-Kodak Studios. All rights reserved.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Sends a 6-digit payment security verification OTP code to the customer before redirecting to the payment gateway.
 */
export async function sendPaymentVerificationOtpEmail({
  recipientEmail,
  recipientName = 'Valued Client',
  otpCode,
  packageName = 'Photoshoot Session',
  downpaymentAmount = 0,
  eventDate = '',
  preferredTime = '',
  expiryMinutes = 10
}) {
  if (!recipientEmail || !isSupabaseConfigured) {
    return { success: false, error: 'Recipient email or database not configured' };
  }

  const subject = `Payment Authorization Code: ${otpCode} — E-Kodak Studios`;
  const htmlBody = renderPaymentVerificationEmailHtml({
    recipientName,
    otpCode,
    packageName,
    downpaymentAmount,
    eventDate,
    preferredTime,
    expiryMinutes
  });

  // 1. Insert into email_logs for administrative tracking
  try {
    await supabase.from('email_logs').insert({
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      subject,
      html_body: htmlBody,
      notification_type: 'PAYMENT_VERIFICATION',
      status: 'QUEUED',
      sent_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('[sendPaymentVerificationOtpEmail] email_logs insert warning:', err.message);
  }

  // 2. Invoke Edge Function send-email (SMTP)
  try {
    const plainText = `Your E-Kodak Studio payment authorization code is: ${otpCode}. Valid for ${expiryMinutes} minutes. Photoshoot Package: ${packageName}. Downpayment Required: ₱${Number(downpaymentAmount || 0).toLocaleString()}. Please use this code to authorize your reservation.`;

    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: recipientEmail,
        subject,
        html: htmlBody,
        text: plainText,
        recipientName,
        notificationType: 'PAYMENT_VERIFICATION'
      }
    });

    if (error) {
      console.warn('[sendPaymentVerificationOtpEmail] Edge function SMTP invoke error:', error.message);
      return { success: false, error: error.message };
    }

    if (data && !data.success) {
      console.warn('[sendPaymentVerificationOtpEmail] SMTP response error:', data.error);
      return { success: false, error: data.error };
    }

    console.log('[sendPaymentVerificationOtpEmail] OTP email sent successfully:', data);
    return { success: true, data };
  } catch (fnErr) {
    console.warn('[sendPaymentVerificationOtpEmail] Edge function unreachable:', fnErr.message);
    return { success: false, error: fnErr.message };
  }
}

/**
 * Sends a booking confirmation & official receipt email via Supabase Edge Function 'send-email'.
 * Automatically logs the email to `email_logs`.
 */
export async function sendBookingConfirmationEmail({
  recipientEmail,
  recipientName = 'Valued Client',
  bookingNumber,
  bookingId = null,
  receiptNumber = null,
  packageName,
  tierName,
  eventDate,
  preferredTime,
  location,
  downpaymentAmount,
  remainingBalance,
  totalAmount = null,
  paymentMethod,
  paymentReference,
  issuedDate = null,
  bookingUrl = null
}) {
  if (!recipientEmail || !isSupabaseConfigured) {
    return { success: false, error: 'Recipient email or database not configured' };
  }

  const effectiveReceiptNo = receiptNumber || `OR-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  const subject = `Official Payment Receipt & Booking Confirmation (#${bookingNumber}) — E-Kodak Studios`;

  const htmlBody = renderBookingConfirmationReceiptHtml({
    recipientName,
    bookingNumber,
    receiptNumber: effectiveReceiptNo,
    packageName,
    tierName,
    eventDate,
    preferredTime,
    location,
    downpaymentAmount,
    remainingBalance,
    totalAmount,
    paymentMethod,
    paymentReference,
    issuedDate,
    bookingUrl
  });

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
    const plainText = `Official Payment Receipt & Booking Confirmation (#${bookingNumber}) — E-Kodak Studios. Photoshoot Package: ${packageName}. Downpayment Settled: ₱${Number(downpaymentAmount || 0).toLocaleString()}. Remaining Balance: ₱${Number(remainingBalance || 0).toLocaleString()}. Date: ${eventDate} • ${preferredTime}. Venue: ${location}. Access your digital portal at: ${bookingUrl || 'https://e-kodak.ph/dashboard/bookings'}`;

    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: recipientEmail,
        subject,
        html: htmlBody,
        text: plainText,
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

    console.log('[sendBookingConfirmationEmail] Confirmation email sent successfully:', data);
    return { success: true, data };
  } catch (fnErr) {
    console.warn('[sendBookingConfirmationEmail] Edge function unreachable:', fnErr.message);
    return { success: false, error: fnErr.message };
  }
}

function escapeEmailHtml(val) {
  return String(val || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Sends a formal Gmail notification via the send-email Edge Function when an
 * administrator permanently deletes a customer's account and associated orders.
 */
export async function sendCustomerDeletionNoticeEmail({
  recipientEmail,
  recipientName = 'Valued Client',
  deletedBookings = [],
  reason = '',
}) {
  if (!recipientEmail || !isSupabaseConfigured) {
    return { success: false, error: 'Recipient email or database not configured' };
  }

  const cleanEmail = String(recipientEmail).trim();
  const safeName = escapeEmailHtml(recipientName || 'Valued Client');
  const safeEmail = escapeEmailHtml(cleanEmail);
  const safeReason = reason ? escapeEmailHtml(String(reason).trim()) : '';

  const ordersBlock =
    Array.isArray(deletedBookings) && deletedBookings.length > 0
      ? `<div style="background:#fbf8f1;border:1px solid #e6d7b8;border-radius:12px;padding:16px;margin:20px 0;text-align:left;">
          <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#87550e;">
            Removed Orders (${deletedBookings.length})
          </p>
          <ul style="margin:0;padding-left:18px;font-size:13px;color:#3f3a34;line-height:1.6;">
            ${deletedBookings
              .map((b) => {
                const ref = escapeEmailHtml(b?.booking_number || 'Booking');
                const tier = b?.tier_name ? ` — ${escapeEmailHtml(b.tier_name)}` : '';
                return `<li><strong>#${ref}</strong>${tier}</li>`;
              })
              .join('')}
          </ul>
        </div>`
      : '';

  const reasonBlock = safeReason
    ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px 14px;margin:16px 0;text-align:left;">
        <p style="margin:0 0 4px 0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#991b1b;">
          Administrative Note
        </p>
        <p style="margin:0;font-size:13px;color:#7f1d1d;line-height:1.5;">${safeReason}</p>
      </div>`
    : '';

  const subject = 'Account & Booking Deletion Notice — E-Kodak Studio';
  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Account &amp; Booking Removal Notice — E-Kodak Studios</title>
</head>
<body style="margin:0;padding:0;background-color:#f6f4ee;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1a1714;">
  <div style="max-width:580px;margin:32px auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e7ded0;">
    <div style="background:#141413;padding:30px 24px;text-align:center;border-bottom:4px solid #c9a96e;">
      <h1 style="margin:0;color:#ffffff;font-size:24px;letter-spacing:2.5px;text-transform:uppercase;">E-Kodak Studio</h1>
    </div>
    <div style="padding:32px 28px;text-align:left;">
      <h2 style="margin:0 0 12px 0;font-size:20px;color:#141413;">Account Deletion Notice</h2>
      <p style="font-size:14px;line-height:1.6;color:#4a453e;margin:0 0 14px 0;">
        Hello <strong>${safeName}</strong>,
      </p>
      <p style="font-size:14px;line-height:1.6;color:#4a453e;margin:0 0 14px 0;">
        This is to inform you that your E-Kodak Photography Studio customer account (<strong>${safeEmail}</strong>) and all associated booking orders have been permanently deleted by studio administration.
      </p>
      <p style="font-size:14px;line-height:1.6;color:#4a453e;margin:0 0 14px 0;">
        Access to the customer dashboard for this account is now closed and your order records are no longer active.
      </p>
      ${ordersBlock}
      ${reasonBlock}
      <p style="font-size:13px;line-height:1.6;color:#6b645c;margin:20px 0 0 0;">
        If you believe this was done in error or have any questions, please contact E-Kodak Studio directly.
      </p>
    </div>
    <div style="background:#faf8f4;padding:18px 24px;text-align:center;border-top:1px solid #eee7da;">
      <p style="margin:0;font-size:11px;color:#8c847a;">
        &copy; ${new Date().getFullYear()} E-Kodak Photography Studio. Automated administrative notification.
      </p>
    </div>
  </div>
</body>
</html>`;

  const plainText = `Hello ${recipientName || 'Valued Client'}, your E-Kodak Photography Studio account (${cleanEmail}) and ${deletedBookings.length} associated booking order(s) have been permanently deleted by studio administration. Your customer dashboard access is now closed.${reason ? ` Note: ${reason}` : ''}`;

  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: cleanEmail,
        subject,
        html: htmlBody,
        text: plainText,
        recipientName: recipientName || cleanEmail,
        bookingId: null,
        notificationType: 'ACCOUNT_DELETION_NOTICE',
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    if (data && !data.success) {
      return { success: false, error: data.error || 'Email delivery failed' };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err?.message || 'Email dispatch failed' };
  }
}
