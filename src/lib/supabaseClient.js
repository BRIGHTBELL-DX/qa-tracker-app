import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn(
    "Supabase env vars missing — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local"
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Magic-link login redirects back with a token in the URL — this must be
    // true so the client picks it up and turns it into a session automatically.
    detectSessionInUrl: true,
  },
});

export const ALLOWED_DOMAIN = "brightbell.co.kr";
