import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { generateQRDataURL, createQRBookingPayload, extractTokenFromInput } from '../lib/qr';

export async function generateAndStoreQRCode(bookingId, bookingToken) {
  if (!isSupabaseConfigured) {
    return { data: null, error: new Error('Database connection is not configured.') };
  }

  try {
    const payload = createQRBookingPayload(bookingToken);
    const qrDataUrl = generateQRDataURL(bookingToken);

    const qrSvgResponse = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(qrDataUrl)}&format=svg`);
    if (!qrSvgResponse.ok) {
      throw new Error('Failed to generate QR code from external service');
    }
    const qrSvgBlob = await qrSvgResponse.blob();

    const fileName = `qr-${bookingId}-${Date.now()}.svg`;
    const filePath = `${bookingId}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('booking-qr-codes')
      .upload(filePath, qrSvgBlob, {
        contentType: 'image/svg+xml',
        upsert: false,
      });

    if (uploadError) {
      console.error('QR code upload error:', uploadError);
      throw new Error('Failed to store QR code');
    }

    const { data: urlData } = supabase.storage
      .from('booking-qr-codes')
      .getPublicUrl(uploadData.path);

    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        qr_code_path: uploadData.path,
        qr_payload_version: payload.v,
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('Booking QR update error:', updateError);
    }

    return {
      data: {
        qr_code_path: uploadData.path,
        qr_public_url: urlData.publicUrl,
        qr_data_url: qrDataUrl,
      },
      error: null,
    };
  } catch (error) {
    console.error('generateAndStoreQRCode error:', error);
    return { data: null, error };
  }
}

export async function regenerateQRCode(bookingId, newBookingToken) {
  if (!isSupabaseConfigured) {
    return { data: null, error: new Error('Database connection is not configured.') };
  }

  try {
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('qr_code_path')
      .eq('id', bookingId)
      .single();

    if (fetchError) throw fetchError;

    if (booking?.qr_code_path) {
      await supabase.storage.from('booking-qr-codes').remove([booking.qr_code_path]);
    }

    return generateAndStoreQRCode(bookingId, newBookingToken);
  } catch (error) {
    console.error('regenerateQRCode error:', error);
    return { data: null, error };
  }
}

export async function rotateBookingToken(bookingId) {
  if (!isSupabaseConfigured) {
    return { data: null, error: new Error('Database connection is not configured.') };
  }

  try {
    const newToken = crypto.randomUUID();

    const { data, error } = await supabase
      .from('bookings')
      .update({
        booking_token: newToken,
        booking_token_rotated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .select('booking_token')
      .single();

    if (error) throw error;

    await regenerateQRCode(bookingId, newToken);

    return { data: { booking_token: data.booking_token }, error: null };
  } catch (error) {
    console.error('rotateBookingToken error:', error);
    return { data: null, error };
  }
}

export async function getQRCodePublicUrl(qrCodePath) {
  if (!isSupabaseConfigured || !qrCodePath) return null;
  const { data } = supabase.storage.from('booking-qr-codes').getPublicUrl(qrCodePath);
  return data.publicUrl;
}

export async function logQRScan({
  bookingId,
  scannedBy = null,
  scanType = 'COMPANION_APP',
  userAgent = null,
  ipAddress = null,
  scanResult = 'SUCCESS',
}) {
  if (!isSupabaseConfigured) return { data: null, error: null };

  try {
    const { data, error } = await supabase
      .from('qr_scan_logs')
      .insert({
        booking_id: bookingId,
        scanned_by: scannedBy,
        scan_type: scanType,
        user_agent: userAgent,
        ip_address: ipAddress,
        scan_result: scanResult,
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('logQRScan error:', error);
    return { data: null, error };
  }
}

export async function getBookingQRScanLogs(bookingId) {
  if (!isSupabaseConfigured) return { data: [], error: null };

  try {
    const { data, error } = await supabase
      .from('qr_scan_logs')
      .select(`
        id,
        scan_type,
        scan_result,
        user_agent,
        created_at,
        scanned_by_profile:profiles!qr_scan_logs_scanned_by_fkey(first_name, last_name)
      `)
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error('getBookingQRScanLogs error:', error);
    return { data: [], error };
  }
}

/**
 * Verifies a scanned QR booking token against the database with anti-replay duplicate checks
 * (Asset 9: QR Transaction Security)
 */
export async function verifyQRPassScan({
  bookingToken,
  scannedBy = null,
  scanType = 'STAFF_CHECKIN',
  userAgent = navigator?.userAgent || 'Browser',
  ipAddress = null,
}) {
  if (!bookingToken) {
    return { success: false, message: 'QR booking token is missing.', booking: null };
  }

  if (!isSupabaseConfigured) {
    return {
      success: false,
      message: 'Database connection is not configured. Live verification requires active database credentials.',
      booking: null,
    };
  }

  try {
    // Extract token whether scanned as URL, JSON payload, or raw string
    const lookupToken = extractTokenFromInput(String(bookingToken).trim());
    if (!lookupToken) {
      return { success: false, message: 'Could not read a valid pass token from this QR code.', booking: null };
    }

    // 1. Look up booking by unique secure token or booking number
    let booking = null;
    try {
      const { data: rpcBooking, error: rpcErr } = await supabase.rpc('get_booking_by_pass_token', {
        lookup_token: lookupToken
      });
      if (rpcBooking && !rpcErr) {
        booking = rpcBooking;
      }
    } catch {}

    if (!booking) {
      let query = supabase
        .from('bookings')
        .select(`
          id,
          booking_number,
          status,
          payment_status,
          booking_token,
          event_date,
          preferred_time,
          total_amount,
          remaining_balance,
          customer_id,
          is_deleted,
          deleted_at,
          deletion_reason,
          customer:profiles!bookings_customer_id_fkey(id, first_name, last_name, phone, email),
          service:services!bookings_service_id_fkey(id, name, base_price)
        `);

      // Check if UUID or booking number
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lookupToken);
      if (isUuid) {
        query = query.or(`booking_token.eq.${lookupToken},id.eq.${lookupToken}`);
      } else {
        query = query.or(`booking_number.ilike.%${lookupToken}%,booking_token.eq.${lookupToken}`);
      }

      const { data: bookingList, error: fetchError } = await query.limit(1);
      if (!fetchError && bookingList?.[0]) {
        booking = bookingList[0];
      }
    }

    if (fetchError || !booking) {
      // Log failed attempt
      await logQRScan({
        bookingId: null,
        scannedBy,
        scanType,
        userAgent,
        ipAddress,
        scanResult: 'INVALID',
      });
      return { success: false, message: 'Invalid or unrecognized QR pass.', booking: null };
    }

    // Guard against deleted bookings
    if (booking.is_deleted) {
      await logQRScan({
        bookingId: booking.id,
        scannedBy,
        scanType,
        userAgent,
        ipAddress,
        scanResult: 'DELETED_PASS',
      });
      return {
        success: false,
        message: 'This booking order has been cancelled or removed by studio administration.',
        booking: null,
        is_deleted: true,
      };
    }

    // 2. Anti-replay check: detect rapid duplicate scans within 5 seconds
    const { data: recentScans } = await supabase
      .from('qr_scan_logs')
      .select('id, created_at')
      .eq('booking_id', booking.id)
      .eq('scan_result', 'SUCCESS')
      .order('created_at', { ascending: false })
      .limit(1);

    if (recentScans && recentScans.length > 0) {
      const lastScanTime = new Date(recentScans[0].created_at).getTime();
      const now = Date.now();
      if (now - lastScanTime < 5000) {
        // Replayed scan detected
        await logQRScan({
          bookingId: booking.id,
          scannedBy,
          scanType: 'STAFF_CHECKIN',
          userAgent,
          ipAddress,
          scanResult: 'REVOKED',
        });
        return {
          success: false,
          message: 'Duplicate scan ignored (anti-replay debounce active).',
          booking,
          isDuplicate: true,
        };
      }
    }

    // 3. Log verified scan into audit history
    await logQRScan({
      bookingId: booking.id,
      scannedBy,
      scanType: 'STAFF_CHECKIN',
      userAgent,
      ipAddress,
      scanResult: 'SUCCESS',
    });

    return {
      success: true,
      message: 'QR pass successfully verified.',
      booking,
    };
  } catch (error) {
    console.error('verifyQRPassScan error:', error);
    return { success: false, message: error.message || 'Verification error.', booking: null };
  }
}