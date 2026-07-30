"use client";
const KEY = "pp_token";
export const tokenStore = {
  get: () => (typeof window === "undefined" ? null : localStorage.getItem(KEY)),
  set: (t: string) => localStorage.setItem(KEY, t),
  clear: () => localStorage.removeItem(KEY),
};
