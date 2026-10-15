/*
  =============================================================================
  FitGestão — Módulo de Autenticação JWT Nativo (Zero-Dependency)
  Assinatura e verificação via HMAC-SHA256 utilizando apenas node:crypto.
  =============================================================================
*/

const crypto = require('node:crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'fitgestao_super_secret_key_soberana_2026_zero_dep';
const DEFAULT_EXP_SECONDS = 24 * 60 * 60; // 24 horas

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf-8');
}

function sign(headerStr, payloadStr, secret = JWT_SECRET) {
  const data = `${headerStr}.${payloadStr}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(data);
  return hmac.digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function generateToken(payload, expiresInSeconds = DEFAULT_EXP_SECONDS) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const fullPayload = { ...payload, exp };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = sign(encodedHeader, encodedPayload);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyToken(token, secret = JWT_SECRET) {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signatureB64] = parts;
  const expectedSignature = sign(headerB64, payloadB64, secret);

  const sigBuffer = Buffer.from(signatureB64);
  const expBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(payloadB64));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Token expirado
    }
    return payload;
  } catch {
    return null;
  }
}

module.exports = {
  generateToken,
  verifyToken,
  JWT_SECRET
};
