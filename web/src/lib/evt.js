export function track(event, props = {}) {
  try {
    const payload = { event, timestamp: Date.now(), ...props };
    if (typeof window !== 'undefined' && Array.isArray(window.dataLayer)) {
      window.dataLayer.push(payload);
    } else if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', event, props);
    } else {
      // Fallback to console for dev
      // eslint-disable-next-line no-console
      console.debug('[evt]', payload);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.debug('[evt:error]', e);
  }
}
