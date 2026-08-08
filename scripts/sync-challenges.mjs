/**
 * Push the authored challenge templates into the Supabase `challenges` table.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/sync-challenges.mjs
 *
 * The app does not need this to run — templates live in code and challenges are
 * generated client-side. Syncing exists so the catalogue is queryable from the
 * database (analytics, a future daily-challenge picker, server-side checking).
 *
 * Uses the SERVICE ROLE key, so run it from a terminal, never from the browser.
 */

import { createClient } from '@supabase/supabase-js';
import { TEMPLATES, instantiate } from '../src/challenges/index.js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

// A sample instance per template gives the row a concrete brief and schema to
// show, without pretending the pool is finite.
const rows = TEMPLATES.map((template) => {
  const sample = instantiate(template.id, 1);
  return {
    template_id: template.id,
    topic: template.topic,
    difficulty_tier: template.tier,
    title: template.title,
    concept: template.concept,
    brief: sample.brief,
    requirements_schema: sample.requirements,
    is_template: true,
    template_params: sample.params,
  };
});

const { error } = await supabase.from('challenges').upsert(rows, { onConflict: 'template_id' });

if (error) {
  console.error('Sync failed:', error.message);
  process.exit(1);
}

console.log(`Synced ${rows.length} challenge templates.`);
