import { ed25519FromSeedB64u } from "./ed25519";
import { b64u, b64uToBytes } from "./crypto";

// identity objesini MUTATE etme: kopya üstünden dön
export function ensurePrivateKeyFields(identity) {
  if (!identity) return identity;

  const out = { ...identity };

  // 1) Eğer seed yok ama sk varsa -> seed'i sk'nin ilk 32 byte'ından çıkar
  // tweetnacl secretKey = 64 byte (ilk 32 byte seed)
  if (!out.seed_b64u && out.sk_b64u) {
    try {
      const skBytes = b64uToBytes(out.sk_b64u);
      if (skBytes.length === 64) {
        const seed = skBytes.slice(0, 32);
        out.seed_b64u = b64u(seed);
      }
    } catch { /* empty */ }
  }

  // 2) Eğer sk yok ama seed varsa -> sk türet
  if (!out.sk_b64u && out.seed_b64u) {
    try {
      const { sk } = ed25519FromSeedB64u(out.seed_b64u);
      out.sk_b64u = b64u(sk);
    } catch { /* empty */ }
  }

  return out;
}
