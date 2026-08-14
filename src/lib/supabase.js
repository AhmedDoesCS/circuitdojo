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

/**
 * Supabase's error strings, said the way a person would say them.
 *
 * What comes back from the API is written for whoever is building the thing:
 * "Invalid login credentials", "User already registered", "For security purposes
 * you can only request this after 51 seconds". None of that is addressed to the
 * person reading it, and one of them is asking a learner to care about our rate
 * limiter. Anything not recognised falls through unchanged rather than being
 * swallowed, because an unrecognised error is still better than silence.
 */
const HUMAN_ERRORS = [
  [/invalid login credentials/i, 'That email and password do not match an account.'],
  [/email not confirmed/i, 'Check your email and click the link first, then sign in.'],
  [/user already registered|already been registered/i,
   'There is already an account with that email. Try signing in instead.'],
  [/password should be at least/i, 'Passwords need to be at least six characters.'],
  [/unable to validate email|invalid email/i, 'That email address does not look right.'],
  [/only request this after (\d+)/i, 'Just a moment, then try again.'],
  [/rate limit|too many requests/i, 'Too many attempts. Wait a minute and try again.'],
  [/network|fetch/i, 'Could not reach the server. Check your connection and try again.'],
];

export function humanAuthError(message) {
  if (!message) return null;
  for (const [pattern, text] of HUMAN_ERRORS) {
    if (pattern.test(message)) return text;
  }
  return message;
}
