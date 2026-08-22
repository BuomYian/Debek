#!/usr/bin/env node
/**
 * Deletes the 15 seed staff/doctor accounts via the Supabase Admin API,
 * so scripts/seed-users.mjs can recreate them fresh (e.g. after
 * changing seeded names/phones — that script is idempotent per-email
 * and *skips* an account that already exists, so it can't rename one).
 *
 * Deleting through the Admin API (not a raw SQL DELETE FROM auth.users)
 * matters for the same reason seed-users.mjs creates through it: GoTrue
 * keeps related state (auth.identities, sessions, refresh tokens) that
 * a hand-written DELETE can leave orphaned.
 *
 * public.profiles rows are removed automatically — profiles.id
 * references auth.users(id) on delete cascade (0004_profiles.sql) — but
 * that cascade cannot walk past doctors/appointments/etc. wherever
 * those hold an `on delete restrict` FK, so run
 * supabase/reset-seed-data.sql FIRST to clear the data that would
 * otherwise block it.
 *
 * Usage:
 *   psql "$DATABASE_URL" -f supabase/reset-seed-data.sql
 *   node scripts/reset-seed-users.mjs
 *   node scripts/seed-users.mjs
 *   psql "$DATABASE_URL" -f supabase/seed.sql
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";

function loadEnvLocal() {
  const path = new URL("../.env.local", import.meta.url);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    const value = rawValue.replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.");
  process.exit(1);
}

// Same fixed email list as seed-users.mjs — emails never changed, only
// the full_name/phone metadata did, so this list stays in sync by hand.
const SEED_EMAILS = [
  "admin@debek.local",
  "admin2@debek.local",
  "reception@debek.local",
  "reception2@debek.local",
  "reception3@debek.local",
  "doctor1@debek.local",
  "doctor2@debek.local",
  "doctor3@debek.local",
  "doctor4@debek.local",
  "doctor5@debek.local",
  "doctor6@debek.local",
  "doctor7@debek.local",
  "doctor8@debek.local",
  "doctor9@debek.local",
  "doctor10@debek.local",
];

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserIdByEmail(email) {
  // Admin API has no "get by email" — page through listUsers. Fine at
  // this scale (15 known accounts, one small seed project).
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email === email);
    if (found) return found.id;
    if (data.users.length < 200) break;
  }
  return null;
}

async function main() {
  console.log(`Deleting seed accounts at ${SUPABASE_URL} ...`);
  for (const email of SEED_EMAILS) {
    const id = await findUserIdByEmail(email);
    if (!id) {
      console.log(`skip (not found): ${email}`);
      continue;
    }
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) throw error;
    console.log(`deleted: ${email}`);
  }
  console.log("\nDone. Next: node scripts/seed-users.mjs");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
