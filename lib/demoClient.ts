import { getSupabaseClient } from "./supabase/client";

export function getVisitorId() {
  if (typeof window === "undefined") return "";
  const key = "demo-visitor-id";
  let id = window.localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(key, id);
  }
  return id;
}

export function getClient() {
  return getSupabaseClient();
}
