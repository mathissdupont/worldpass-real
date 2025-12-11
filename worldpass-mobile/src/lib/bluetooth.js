import { Platform, Share } from 'react-native';

let BleManager;

function getManager() {
  if (BleManager) return BleManager;
  try {
    // eslint-disable-next-line global-require
    const { BleManager: Manager } = require('react-native-ble-plx');
    BleManager = new Manager();
    return BleManager;
  } catch (err) {
    console.warn('BLE module not available', err?.message || err);
    return null;
  }
}

export async function isBleAvailable() {
  if (Platform.OS === 'web') return false;
  return Boolean(getManager());
}

export async function shareOverBle(message) {
  const manager = getManager();
  if (!manager) {
    // Graceful fallback: use system share sheet
    try {
      await Share.share({
        title: 'WorldPass Credential',
        message: message || 'Credential payload',
      });
    } catch (err) {
      console.warn('Share fallback failed', err?.message || err);
    }
    return { ok: false, reason: 'unavailable' };
  }

  try {
    // Minimal demo: start device scan and stop immediately (placeholder).
    // Real advertising requires native support; here we fallback to sharing if not possible.
    await manager.startDeviceScan(null, { allowDuplicates: false }, () => {});
    setTimeout(() => manager.stopDeviceScan(), 500);
    // Instead of actual BLE payload, also present share sheet for usability
    await Share.share({
      title: 'WorldPass Credential',
      message,
    });
    return { ok: true };
  } catch (err) {
    console.warn('BLE share failed', err?.message || err);
    try {
      await Share.share({ title: 'WorldPass Credential', message });
    } catch {}
    return { ok: false, reason: err?.message || 'ble_failed' };
  }
}
