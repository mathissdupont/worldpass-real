// src/lib/format.ts
export const short = (s:string, n=22)=> s?.length>n ? s.slice(0,n)+"…" : s;
export const dt = (iso?:string)=> iso ? new Date(iso).toLocaleString('tr-TR') : "";
