// src/lib/storage.js

// --- Keyler (tekleştirilmiş) ---
const VC_KEY       = "wp.vcs";         // Tek doğru key
const OLD_VC_KEYS  = ["wp_vcs"];       // Eski anahtarlar (taşınacak)
const PROFILE_KEY  = "wp_profile";     // {displayName, did} (private key yok)


// --- MIGRATION (eski anahtardan yenisine taşı) ---
export function migrateVCsIfNeeded() {
  try {
    const cur = localStorage.getItem(VC_KEY);
    if (cur) return; // zaten yeni anahtar var
    for (const old of OLD_VC_KEYS) {
      const raw = localStorage.getItem(old);
      if (raw) {
        localStorage.setItem(VC_KEY, raw);
        localStorage.removeItem(old);
        window.dispatchEvent(new Event("vcs:changed"));
        break;
      }
    }
  } catch {}
}


// --- VC işlemleri ---
/** VC listesini getir (en yeni başta) */
export function getVCs() {
  try {
    const raw = localStorage.getItem(VC_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/** VC listesini kaydet */
export function setVCs(list) {
  localStorage.setItem(VC_KEY, JSON.stringify(list || []));
  window.dispatchEvent(new Event("vcs:changed")); // aynı sekmede tetikleyici
}

/** Yeni VC ekle veya güncelle */
export function addVC(vc) {
  const all = getVCs();
  const idx = all.findIndex(x => x?.jti === vc?.jti);
  if (idx === -1) all.unshift(vc);
  else all[idx] = vc;
  setVCs(all);
  return all;
}

/** Belirli bir VC’yi sil */
export function removeVC(jti) {
  const all = getVCs().filter(x => x?.jti !== jti);
  setVCs(all);
  return all;
}

/** Tüm VC’leri temizle */
export function clearVCs() {
  localStorage.removeItem(VC_KEY);
  window.dispatchEvent(new Event("vcs:changed"));
}


// --- Profil işlemleri ---
export function loadProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile || {}));
}

export function loadVCs() {
  try {
    const raw = localStorage.getItem(VC_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveVCs(list) {
  localStorage.setItem(VC_KEY, JSON.stringify(list || []));
  window.dispatchEvent(new Event("vcs:changed")); // aynı sekmede tetikleyici
}