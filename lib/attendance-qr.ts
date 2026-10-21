import { createHmac, timingSafeEqual } from 'crypto';

export const QR_INTERVAL_MS = 60_000;
const PURPOSE = 'fop-attendance-qr-v1';

function secret(): string {
  const key = process.env.ATTENDANCE_QR_SECRET;
  if (!key || key.length < 32) throw new Error('ATTENDANCE_QR_SECRET must be configured (at least 32 characters).');
  return key;
}
function signature(eventId: string, slot: number): string {
  return createHmac('sha256', secret()).update(`${PURPOSE}:${eventId}:${slot}`).digest('hex');
}
export function currentQr(eventId: string, now = Date.now()) {
  const slot = Math.floor(now / QR_INTERVAL_MS);
  return { token: `${slot}.${signature(eventId, slot)}`, expiresAt: (slot + 1) * QR_INTERVAL_MS };
}
export function validQr(eventId: string, token: string, now = Date.now()): boolean {
  const [slotText, sig, ...extra] = token.split('.');
  if (extra.length || !/^\d{9,12}$/.test(slotText || '') || !/^[a-f0-9]{64}$/.test(sig || '')) return false;
  const slot = Number(slotText);
  const current = Math.floor(now / QR_INTERVAL_MS);
  // A QR scanned earlier remains usable throughout the rehearsal day.
  // The public check-in API separately requires an open session dated today.
  // This prevents members being interrupted while entering their phone and shared PIN.
  if (slot < current - 1440 || slot > current) return false;
  const expected = Buffer.from(signature(eventId, slot), 'hex');
  return timingSafeEqual(expected, Buffer.from(sig, 'hex'));
}
