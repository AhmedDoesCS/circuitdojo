import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client: optional by design.
 *
 * CircuitDojo runs completely offline in guest mode (progress and attempts go
 * to localStorage). Supabase adds accounts, cross-device progress and attempt
 * history. If the env vars are absent the app degrades quietly rather than
 * throwing at import time, so `npm run dev` works on a fresh clone.
 */

const url = import.meta.env?.VITE_SUPABASE_URL;
const anonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey && !url.includes('your-project-ref'));

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

/** Human-readable reason shown in the account panel when auth is unavailable. */
export const supabaseStatus = isSupabaseConfigured
  ? 'connected'
  : 'Not configured, copy .env.example to .env and add your project URL and anon key to enable accounts.';
