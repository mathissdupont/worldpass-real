let qrModulePromise;

async function loadQrModule() {
  if (!qrModulePromise) {
    qrModulePromise = import("qrcode").then((mod) => mod?.default ?? mod);
  }
  return qrModulePromise;
}

/**
 * Generate a QR image as a Data URL using a lazily loaded renderer.
 * @param {string} value
 * @param {import("qrcode").QRCodeRenderersOptions} [options]
 */
export async function qrToDataURL(value, options) {
  const qr = await loadQrModule();
  return qr.toDataURL(value, options);
}

/**
 * Render a QR code into the provided canvas element.
 * @param {HTMLCanvasElement} canvas
 * @param {string} value
 * @param {import("qrcode").QRCodeRenderersOptions} [options]
 */
export async function qrToCanvas(canvas, value, options) {
  const qr = await loadQrModule();
  return qr.toCanvas(canvas, value, options);
}

/**
 * Expose the raw module for advanced scenarios (e.g. SVG rendering).
 */
export async function getQrModule() {
  return loadQrModule();
}
