import { Platform } from 'react-native';

let NfcManager;
let NfcTech;
let Ndef;

function getNfcModule() {
  if (!NfcManager) {
    try {
      // Lazy require to avoid crashes on platforms without native support
      // eslint-disable-next-line global-require
      const nfc = require('react-native-nfc-manager');
      NfcManager = nfc.default;
      NfcTech = nfc.NfcTech;
      Ndef = nfc.Ndef;
    } catch (err) {
      console.warn('NFC module not available', err?.message || err);
      return null;
    }
  }
  return { NfcManager, NfcTech, Ndef };
}

export async function isNfcSupported() {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    return false;
  }
  const mod = getNfcModule();
  if (!mod) return false;
  try {
    const supported = await mod.NfcManager.isSupported();
    return Boolean(supported);
  } catch (err) {
    console.warn('NFC support check failed', err?.message || err);
    return false;
  }
}

export async function ensureNfcEnabled() {
  const mod = getNfcModule();
  if (!mod) return { ok: false, reason: 'unavailable' };
  try {
    await mod.NfcManager.start();
    const enabled = await mod.NfcManager.isEnabled();
    return { ok: enabled, reason: enabled ? null : 'disabled' };
  } catch (err) {
    console.warn('NFC init failed', err?.message || err);
    return { ok: false, reason: 'error' };
  }
}

export async function writeNdefPayload(textPayload) {
  const mod = getNfcModule();
  if (!mod) return { ok: false, reason: 'unavailable' };
  const { NfcManager: manager, NfcTech: tech, Ndef: ndef } = mod;
  try {
    await manager.requestTechnology(tech.Ndef, {
      alertMessage: 'Credentialı paylaşmak için telefonu alıcıya yaklaştır',
    });
    const bytes = ndef.encodeMessage([ndef.textRecord(textPayload)]);
    await manager.writeNdefMessage(bytes);
    await manager.setAlertMessageIOS?.('Credential gönderildi');
    await manager.cancelTechnologyRequest();
    return { ok: true };
  } catch (err) {
    console.warn('NFC write failed', err?.message || err);
    try { await manager.cancelTechnologyRequest(); } catch {} // best effort
    return { ok: false, reason: err?.message || 'write_failed' };
  }
}

export async function readNdefOnce() {
  const mod = getNfcModule();
  if (!mod) return { ok: false, data: null, reason: 'unavailable' };
  const { NfcManager: manager, NfcTech: tech, Ndef: ndef } = mod;
  try {
    await manager.requestTechnology(tech.Ndef, {
      alertMessage: 'Okumak için tagi yaklaştır',
    });
    const tag = await manager.getTag();
    const records = ndef?.decodeMessage(tag?.ndefMessage || []) || [];
    const payload = records.find((r) => r?.payload)?.payload;
    const text = payload ? ndef.text.decodePayload(payload) : null;
    await manager.cancelTechnologyRequest();
    return { ok: true, data: text };
  } catch (err) {
    console.warn('NFC read failed', err?.message || err);
    try { await manager.cancelTechnologyRequest(); } catch {} // best effort
    return { ok: false, data: null, reason: err?.message || 'read_failed' };
  }
}

export async function shareCredentialNfc(credential) {
  const supported = await isNfcSupported();
  if (!supported) return { ok: false, reason: 'unsupported' };
  const ready = await ensureNfcEnabled();
  if (!ready.ok) return ready;
  const payload = JSON.stringify(credential);
  return writeNdefPayload(payload);
}
