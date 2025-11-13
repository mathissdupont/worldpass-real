import { statusOf } from "@/lib/issuerStore.js";
export function setupStatusRouter(){
  const orig = window.fetch;
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.url;
    const m = url.match(/\/api\/status\/(.+)$/);
    if (m && (!init || (init.method||"GET").toUpperCase()==="GET")) {
      const jti = decodeURIComponent(m[1]);
      const st = statusOf(jti);
      return new Response(st.revoked ? "revoked" : "ok", { status: 200 });
    }
    return orig(input, init);
  };
}
