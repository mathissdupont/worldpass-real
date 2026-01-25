// Ed25519 seed'den private ve public key türetir (tweetnacl)
import nacl from 'tweetnacl';
import { b64u, b64uToBytes } from './crypto';

export function ed25519FromSeed(seed) {
  // seed Uint8Array (32 byte)
  const kp = nacl.sign.keyPair.fromSeed(seed);
  return { sk: kp.secretKey, pk: kp.publicKey };
}

export function ed25519FromSeedB64u(seed_b64u) {
  const seed = (typeof seed_b64u === 'string') ? b64uToBytes(seed_b64u) : seed_b64u;
  if (!(seed instanceof Uint8Array) || seed.length !== 32) throw new Error('Invalid Ed25519 seed');
  return ed25519FromSeed(seed);
}
