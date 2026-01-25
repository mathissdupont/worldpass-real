import { ed25519FromSeedB64u } from "./ed25519";
import { b64u } from "./crypto";

// Kimlik objesinde sk_b64u eksikse ve seed_b64u varsa, private key seed'den türet ve ekle
export function ensurePrivateKeyFields(identity) {
  if (!identity) return identity;
  // seed_b64u varsa ve sk_b64u yoksa, türet
  if (!identity.sk_b64u && identity.seed_b64u) {
    try {
      const { sk } = ed25519FromSeedB64u(identity.seed_b64u);
      identity.sk_b64u = b64u(sk);
    } catch {}
  }
  return identity;
}
