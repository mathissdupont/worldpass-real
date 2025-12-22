// Lightweight analytics helper with safe no-ops in dev
// Env flags (Vite):
// - VITE_ANALYTICS_ENABLED = 'true' to enable in production
// - VITE_GTAG_ID = 'G-XXXX' Google Analytics 4 ID (optional)
// - VITE_ANALYTICS_AUTO_INIT = 'true' to auto-inject gtag (optional)

const isBrowser = typeof window !== 'undefined';
const ENABLED = isBrowser && import.meta.env.PROD && (import.meta.env.VITE_ANALYTICS_ENABLED === 'true');
const ENDPOINT = isBrowser ? (import.meta.env.VITE_ANALYTICS_ENDPOINT || '/api/evt') : null;

function ensureDataLayer() {
	if (!isBrowser) return;
	window.dataLayer = window.dataLayer || [];
}

function postToBackend(payload) {
	if (!ENABLED || !isBrowser || !ENDPOINT) return;
	try {
		const body = JSON.stringify(payload);
		// Prefer sendBeacon when available (non-blocking during navigation)
		if (navigator?.sendBeacon) {
			const blob = new Blob([body], { type: 'application/json' });
			navigator.sendBeacon(ENDPOINT, blob);
			return;
		}
		// Fallback: keepalive fetch for unload-safe-ish delivery
		fetch(ENDPOINT, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body,
			keepalive: true,
		}).catch(() => {});
	} catch (_) {
		// swallow
	}
}

export function initAnalytics(options = {}) {
	if (!isBrowser) return;

	const id = options.gtagId || import.meta.env.VITE_GTAG_ID;
	const auto = options.autoInit ?? (import.meta.env.VITE_ANALYTICS_AUTO_INIT === 'true');

	// If gtag already present, nothing to do
	if (window.gtag) return;

	ensureDataLayer();

	// Define gtag shim
	window.gtag = function gtag() {
		window.dataLayer.push(arguments);
	};

	// Optionally auto-initialize GA4 if ID provided and auto-init enabled
	if (ENABLED && auto && id) {
		const script = document.createElement('script');
		script.async = true;
		script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
		document.head.appendChild(script);

		window.gtag('js', new Date());
		window.gtag('config', id);
	}
}

export function track(event, props = {}) {
	if (!ENABLED || !isBrowser || !event) return;
	try {
		postToBackend({
			event,
			props,
			ts: Date.now(),
			path: window.location?.pathname + window.location?.search,
			title: document?.title,
		});

		if (typeof window.gtag === 'function') {
			window.gtag('event', event, props);
			return;
		}
		ensureDataLayer();
		window.dataLayer.push({ event, ...props, timestamp: Date.now() });
	} catch (_) {
		// swallow
	}
}

export function pageview(path, title) {
	if (!ENABLED || !isBrowser) return;
	try {
		const location = path || (window.location?.pathname + window.location?.search) || '/';
		postToBackend({
			event: 'page_view',
			props: {},
			ts: Date.now(),
			path: location,
			title: title || document?.title,
		});

		if (typeof window.gtag === 'function') {
			const id = import.meta.env.VITE_GTAG_ID;
			if (id) {
				window.gtag('config', id, { page_path: location, page_title: title });
			} else {
				window.gtag('event', 'page_view', { page_location: location, page_title: title });
			}
			return;
		}
		ensureDataLayer();
		window.dataLayer.push({ event: 'page_view', page_location: location, page_title: title, timestamp: Date.now() });
	} catch (_) {
		// swallow
	}
}

export function setUser(userId, properties = {}) {
	if (!ENABLED || !isBrowser) return;
	try {
		if (typeof window.gtag === 'function') {
			window.gtag('set', { user_id: userId, ...properties });
			return;
		}
		ensureDataLayer();
		window.dataLayer.push({ event: 'set_user', user_id: userId, ...properties });
	} catch (_) {
		// swallow
	}
}
