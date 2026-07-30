import { generateSecret, verify } from 'otplib';

export function generate2FASecret(username: string): { secret: string; qrCodeUrl: string; otpauthUrl: string } {
  const secret = generateSecret({ length: 16 });
  const label = encodeURIComponent(`Durak Online (${username})`);
  const otpauthUrl = `otpauth://totp/${label}?secret=${secret}&issuer=DurakOnline&period=30&digits=6`;
  const qrCodeUrl = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%231e293b"/><text x="100" y="90" font-family="sans-serif" font-size="12" fill="%2338bdf8" text-anchor="middle">Durak 2FA Authenticator</text><text x="100" y="115" font-family="monospace" font-size="14" fill="%23f8fafc" text-anchor="middle">${secret.substring(0, 8)}</text><text x="100" y="135" font-family="monospace" font-size="14" fill="%23f8fafc" text-anchor="middle">${secret.substring(8)}</text><rect x="40" y="150" width="120" height="8" rx="4" fill="%2322c55e"/></svg>`;
  return { secret, qrCodeUrl, otpauthUrl };
}

export async function verify2FACode(secret: string, code: string): Promise<boolean> {
  if (!secret || !code) return false;
  const result = await verify({ secret, token: code.trim() });
  return result.valid;
}
