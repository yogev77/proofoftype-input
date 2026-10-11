// Server-side helper: check a Proof of Type proof token before you save text.
//
//   import { verifyProof } from './server.mjs';   // copy this file into your project
//   const r = await verifyProof({ token, text, origin: 'https://your-site.com' });
//   if (!r.ok) throw new Error(r.reason);
//   r.proof.author  // the Proof of Type username who typed it
//
// Uses the public API (POST https://www.proofoftype.com/api/v1/verify). For
// offline checks, verify the JWT (EdDSA) against
// https://www.proofoftype.com/.well-known/jwks.json — see README.

const API = 'https://www.proofoftype.com/api/v1/verify';

/**
 * @param {{ token: string, text: string, origin: string, fetch?: typeof fetch }} p
 * @returns {Promise<{ ok: true, proof: object } | { ok: false, reason: string }>}
 */
export async function verifyProof({ token, text, origin, fetch: f = globalThis.fetch }) {
  if (typeof token !== 'string' || !token) return { ok: false, reason: 'missing_token' };
  if (typeof text !== 'string') return { ok: false, reason: 'missing_text' };
  if (typeof origin !== 'string' || !origin) return { ok: false, reason: 'missing_origin' };
  const res = await f(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, text, origin }),
  });
  const r = await res.json().catch(() => ({}));
  if (!r.valid) return { ok: false, reason: r.reason || `http_${res.status}` };
  if (!r.text_matches) return { ok: false, reason: 'text_mismatch' };
  if (!r.origin_matches) return { ok: false, reason: 'origin_mismatch' };
  return { ok: true, proof: r.proof };
}
