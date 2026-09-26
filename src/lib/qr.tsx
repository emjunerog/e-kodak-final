import { QRCodeSVG as BaseQRCodeSVG, QRCodeCanvas as BaseQRCodeCanvas } from 'qrcode.react';

export interface QRBookingPayload {
  v: number;
  bid: string;
  typ: 'booking';
  exp?: number;
  iat: number;
}

export interface QRGenerationOptions {
  size?: number;
  level?: 'L' | 'M' | 'Q' | 'H';
  includeMargin?: boolean;
  foregroundColor?: string;
  backgroundColor?: string;
}

export const QR_PAYLOAD_VERSION = 1;
export const QR_TOKEN_EXPIRY_DAYS = 365;

export function encodeQRBookingPayload(payload: QRBookingPayload): string {
  return JSON.stringify(payload);
}

export function extractTokenFromInput(rawInput: string): string {
  if (!rawInput) return '';
  const trimmed = rawInput.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed);
      const token = url.searchParams.get('token') || url.searchParams.get('id') || url.searchParams.get('bid');
      if (token) return decodeURIComponent(token);
    } catch {
      // not a valid URL, fallback
    }
  }
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed.bid === 'string') {
      return parsed.bid;
    }
  } catch {
    // not JSON, fallback
  }
  return trimmed;
}

export function decodeQRBookingPayload(token: string): QRBookingPayload | null {
  if (!token) return null;
  const raw = token.trim();
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed.v === QR_PAYLOAD_VERSION &&
      parsed.typ === 'booking' &&
      typeof parsed.bid === 'string' &&
      typeof parsed.iat === 'number'
    ) {
      return parsed as QRBookingPayload;
    }
  } catch {
    // Check if URL or raw token
  }

  const extracted = extractTokenFromInput(raw);
  if (extracted && extracted.length >= 4) {
    return {
      v: QR_PAYLOAD_VERSION,
      bid: extracted,
      typ: 'booking',
      iat: Math.floor(Date.now() / 1000),
    };
  }
  return null;
}

export function createQRBookingPayload(bookingToken: string): QRBookingPayload {
  const now = Math.floor(Date.now() / 1000);
  return {
    v: QR_PAYLOAD_VERSION,
    bid: bookingToken,
    typ: 'booking',
    iat: now,
    exp: now + QR_TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
  };
}

export function generateQRDataURL(bookingToken: string): string {
  // Return the canonical Public Pass URL with the unique booking token.
  // This allows any mobile phone camera, staff scanner, or companion app to scan the QR code
  // and immediately view the live, auto-updated booking pass from the database.
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/pass?token=${encodeURIComponent(bookingToken)}`;
  }
  return `/pass?token=${encodeURIComponent(bookingToken)}`;
}

export function validateBookingQRToken(token: string): { valid: boolean; bookingToken?: string; error?: string } {
  const payload = decodeQRBookingPayload(token);
  if (!payload || !payload.bid) {
    return { valid: false, error: 'Invalid QR code format' };
  }
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    return { valid: false, error: 'QR code has expired' };
  }
  return { valid: true, bookingToken: payload.bid };
}

export const defaultQRStyle: QRGenerationOptions = {
  size: 256,
  level: 'M',
  includeMargin: true,
  foregroundColor: '#1a1a2e',
  backgroundColor: '#ffffff',
};

export function QRCodeSVG({
  bookingToken,
  ...options
}: { bookingToken: string } & QRGenerationOptions) {
  const data = generateQRDataURL(bookingToken);
  return (
    <BaseQRCodeSVG
      value={data}
      size={options.size ?? defaultQRStyle.size}
      level={options.level ?? defaultQRStyle.level}
      includeMargin={options.includeMargin ?? defaultQRStyle.includeMargin}
      fgColor={options.foregroundColor ?? defaultQRStyle.foregroundColor}
      bgColor={options.backgroundColor ?? defaultQRStyle.backgroundColor}
    />
  );
}

export function QRCodeCanvas({
  bookingToken,
  ...options
}: { bookingToken: string } & QRGenerationOptions) {
  const data = generateQRDataURL(bookingToken);
  return (
    <BaseQRCodeCanvas
      value={data}
      size={options.size ?? defaultQRStyle.size}
      level={options.level ?? defaultQRStyle.level}
      includeMargin={options.includeMargin ?? defaultQRStyle.includeMargin}
      fgColor={options.foregroundColor ?? defaultQRStyle.foregroundColor}
      bgColor={options.backgroundColor ?? defaultQRStyle.backgroundColor}
    />
  );
}