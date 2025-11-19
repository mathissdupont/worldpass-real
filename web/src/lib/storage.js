// src/lib/storage.js

// --- API Configuration ---
const API_BASE = "/api";

// --- Keyler (tekleştirilmiş) ---
const VC_KEY       = "wp.vcs";         // Tek doğru key (backward compat için)
const OLD_VC_KEYS  = ["wp_vcs"];       // Eski anahtarlar (taşınacak)
const PROFILE_KEY  = "wp_profile";     // Profile data (fallback for non-authenticated users)
const IDENTITY_KEY = "worldpass_identity"; // Kimlik için key (identityContext ile uyumlu)
const DISPLAY_NAME_KEY = "worldpass_displayName"; // Görünen ad için key
const TOKEN_KEY = "wp_token";


// --- Helper to get auth token ---
function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); }
  catch { return null; }
}


// --- MIGRATION (eski anahtardan yenisine taşı) ---
export async function migrateVCsIfNeeded() {
  try {
    const token = getToken();
    if (!token) {
      // No token, can't migrate to backend, keep in localStorage
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
      return;
    }

    // Try to migrate from localStorage to backend
    const localVCs = localStorage.getItem(VC_KEY) || localStorage.getItem(OLD_VC_KEYS[0]);
    if (localVCs) {
      try {
        const vcs = JSON.parse(localVCs);
        if (Array.isArray(vcs) && vcs.length > 0) {
          // Upload each VC to backend
          for (const vc of vcs) {
            try {
              await fetch(`${API_BASE}/user/vcs/add`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-Token": token,
                },
                body: JSON.stringify({ vc }),
              });
            } catch (e) {
              console.warn("Failed to migrate VC:", e);
            }
          }
          // Clear local storage after successful migration
          localStorage.removeItem(VC_KEY);
          for (const old of OLD_VC_KEYS) {
            localStorage.removeItem(old);
          }
          window.dispatchEvent(new Event("vcs:changed"));
        }
      } catch (e) {
        console.warn("Failed to parse local VCs for migration:", e);
      }
    }
  } catch (e) {
    console.warn("Migration failed:", e);
  }
}


// --- VC işlemleri ---
/** VC listesini getir (en yeni başta) */
export async function getVCs() {
  const token = getToken();
  
  if (!token) {
    // Fallback to localStorage if no token
    try {
      const raw = localStorage.getItem(VC_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  // Fetch from backend
  try {
    const response = await fetch(`${API_BASE}/user/vcs`, {
      method: "GET",
      headers: {
        "X-Token": token,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch VCs");
    }

    const data = await response.json();
    return data.vcs.map(item => item.vc_payload);
  } catch (error) {
    console.warn("Backend VC fetch failed, falling back to localStorage:", error.message);
    // Fallback to localStorage
    try {
      const raw = localStorage.getItem(VC_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }
}

/** VC listesini kaydet */
export async function setVCs(list) {
  const token = getToken();
  
  if (!token) {
    // Fallback to localStorage if no token
    localStorage.setItem(VC_KEY, JSON.stringify(list || []));
    window.dispatchEvent(new Event("vcs:changed"));
    return;
  }

  // This function is less commonly used now - prefer addVC and removeVC
  // But we keep it for backward compatibility
  localStorage.setItem(VC_KEY, JSON.stringify(list || []));
  window.dispatchEvent(new Event("vcs:changed"));
}

/** Yeni VC ekle veya güncelle */
export async function addVC(vc) {
  const token = getToken();
  
  if (!token) {
    // Fallback to localStorage if no token
    const all = await getVCs();
    const idx = all.findIndex(x => x?.jti === vc?.jti);
    if (idx === -1) all.unshift(vc);
    else all[idx] = vc;
    localStorage.setItem(VC_KEY, JSON.stringify(all));
    window.dispatchEvent(new Event("vcs:changed"));
    return all;
  }

  // Add to backend
  try {
    const response = await fetch(`${API_BASE}/user/vcs/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Token": token,
      },
      body: JSON.stringify({ vc }),
    });

    if (!response.ok) {
      throw new Error("Failed to add VC");
    }

    window.dispatchEvent(new Event("vcs:changed"));
    return await getVCs();
  } catch (error) {
    console.warn("Backend VC add failed, falling back to localStorage:", error.message);
    // Fallback to localStorage
    const all = await getVCs();
    const idx = all.findIndex(x => x?.jti === vc?.jti);
    if (idx === -1) all.unshift(vc);
    else all[idx] = vc;
    localStorage.setItem(VC_KEY, JSON.stringify(all));
    window.dispatchEvent(new Event("vcs:changed"));
    return all;
  }
}

/** Belirli bir VC'yi sil */
export async function removeVC(jti) {
  const token = getToken();
  
  if (!token) {
    // Fallback to localStorage if no token
    const all = (await getVCs()).filter(x => x?.jti !== jti);
    localStorage.setItem(VC_KEY, JSON.stringify(all));
    window.dispatchEvent(new Event("vcs:changed"));
    return all;
  }

  // Delete from backend
  try {
    const response = await fetch(`${API_BASE}/user/vcs/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Token": token,
      },
      body: JSON.stringify({ vc_id: jti }),
    });

    if (!response.ok) {
      throw new Error("Failed to delete VC");
    }

    window.dispatchEvent(new Event("vcs:changed"));
    return await getVCs();
  } catch (error) {
    console.warn("Backend VC delete failed, falling back to localStorage:", error.message);
    // Fallback to localStorage
    const all = (await getVCs()).filter(x => x?.jti !== jti);
    localStorage.setItem(VC_KEY, JSON.stringify(all));
    window.dispatchEvent(new Event("vcs:changed"));
    return all;
  }
}

/** Tüm VC'leri temizle */
export async function clearVCs() {
  const token = getToken();
  
  // Always clear localStorage
  localStorage.removeItem(VC_KEY);
  
  if (token) {
    // Also clear backend - delete each VC
    try {
      const vcs = await getVCs();
      for (const vc of vcs) {
        const jti = vc.jti || vc.id;
        if (jti) {
          await removeVC(jti);
        }
      }
    } catch (error) {
      console.warn("Failed to clear backend VCs:", error);
    }
  }
  
  window.dispatchEvent(new Event("vcs:changed"));
}


// --- Profil işlemleri ---
export async function loadProfile() {
  const token = getToken();
  
  if (!token) {
    // Fallback to localStorage
    try {
      return JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  // Fetch from backend
  try {
    const response = await fetch(`${API_BASE}/user/profile`, {
      method: "GET",
      headers: {
        "X-Token": token,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch profile");
    }

    const data = await response.json();
    return {
      email: data.user.email,
      displayName: data.user.display_name,
      did: data.user.did,
      theme: data.user.theme,
      avatar: data.user.avatar,
      phone: data.user.phone,
      lang: data.user.lang,
      otpEnabled: data.user.otp_enabled,
    };
  } catch (error) {
    console.warn("Backend profile fetch failed, falling back to localStorage:", error.message);
    // Fallback to localStorage
    try {
      return JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}");
    } catch {
      return {};
    }
  }
}

export async function saveProfile(profile) {
  const token = getToken();
  
  if (!token) {
    // Fallback to localStorage
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile || {}));
    return;
  }

  // Save to backend
  try {
    const response = await fetch(`${API_BASE}/user/profile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Token": token,
      },
      body: JSON.stringify({
        display_name: profile.displayName,
        theme: profile.theme,
        avatar: profile.avatar,
        phone: profile.phone,
        lang: profile.lang,
        otp_enabled: profile.otpEnabled,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to save profile");
    }
  } catch (error) {
    console.warn("Backend profile save failed, falling back to localStorage:", error.message);
    // Fallback to localStorage
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile || {}));
  }
}

export async function loadVCs() {
  return await getVCs();
}

export async function saveVCs(list) {
  await setVCs(list);
}
