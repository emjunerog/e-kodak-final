import { QRCodeSVG as QRCode } from 'qrcode.react';

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

export function decodeQRBookingPayload(token: string): QRBookingPayload | null {
  try {
    const parsed = JSON.parse(token);
    if (
      parsed.v === QR_PAYLOAD_VERSION &&
      parsed.typ === 'booking' &&
      typeof parsed.bid === 'string' &&
      typeof parsed.iat === 'number'
    ) {
      return parsed as QRBookingPayload;
    }
    return null;
  } catch {
    return null;
  }
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
  const payload = createQRBookingPayload(bookingToken);
  return encodeQRBookingPayload(payload);
}

export function validateBookingQRToken(token: string): { valid: boolean; bookingToken?: string; error?: string } {
  const payload = decodeQRBookingPayload(token);
  if (!payload) {
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
    <QRCode
      value={data}
      size={options.size ?? defaultQRStyle.size}
      level={options.level ?? defaultQRStyle.level}
      includeMargin={options.includeMargin ?? defaultQRStyle.includeMargin}
      fgColor={options.foregroundColor ?? defaultQRStyle.foregroundColor}
      bgColor={options.backgroundColor ?? defaultQRStyle.backgroundColor}
      renderAs="svg"
    />
  );
}

export function QRCodeCanvas({
  bookingToken,
  ...options
}: { bookingToken: string } & QRGenerationOptions) {
  const data = generateQRDataURL(bookingToken);
  return (
    <QRCode
      value={data}
      size={options.size ?? defaultQRStyle.size}
      level={options.level ?? defaultQRStyle.level}
      includeMargin={options.includeMargin ?? defaultQRStyle.includeMargin}
      fgColor={options.foregroundColor ?? defaultQRStyle.foregroundColor}
      bgColor={options.backgroundColor ?? defaultQRStyle.backgroundColor}
      renderAs="canvas"
    />
  );
}