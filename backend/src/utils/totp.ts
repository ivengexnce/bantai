import crypto from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function base32Decode(input: string): Buffer {
  const cleaned = input.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const ch of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) {
      throw new Error('Invalid Base32 TOTP secret');
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

export function generateTotpToken(secretBase32: string, stepCounter?: number): string {
  const step = stepCounter ?? Math.floor(Date.now() / 1000 / 30);
  const key = base32Decode(secretBase32);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(step), 0);

  const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(binary % 1_000_000).padStart(6, '0');
}

export function verifyTotpToken(
  secretBase32: string,
  code: string,
  lastUsedStep?: number,
  windowSteps: number = 1
): { valid: boolean; matchedStep?: number } {
  const normalized = code.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(normalized)) {
    return { valid: false };
  }

  const currentStep = Math.floor(Date.now() / 1000 / 30);
  const inputBuf = Buffer.from(normalized, 'utf8');

  for (let delta = -windowSteps; delta <= windowSteps; delta++) {
    const step = currentStep + delta;
    if (step < 0) continue;
    // Replay protection: never allow reusing a counter step already accepted
    if (lastUsedStep !== undefined && step <= lastUsedStep) continue;

    const expected = generateTotpToken(secretBase32, step);
    const expectedBuf = Buffer.from(expected, 'utf8');
    if (expectedBuf.length === inputBuf.length && crypto.timingSafeEqual(expectedBuf, inputBuf)) {
      return { valid: true, matchedStep: step };
    }
  }

  return { valid: false };
}

export function buildOtpAuthUri(accountEmail: string, secretBase32: string, issuer: string = 'BANTAI'): string {
  const label = encodeURIComponent(`${issuer}:${accountEmail}`);
  const encIssuer = encodeURIComponent(issuer);
  return `otpauth://totp/${label}?secret=${secretBase32}&issuer=${encIssuer}&algorithm=SHA1&digits=6&period=30`;
}

export function generateRecoveryCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const hex = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${hex.slice(0, 4)}-${hex.slice(4, 8)}`);
  }
  return codes;
}

export function hashSecretToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken.trim().toUpperCase()).digest('hex');
}

export function hashPasswordResetToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
}
