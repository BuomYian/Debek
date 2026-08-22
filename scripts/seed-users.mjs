#!/usr/bin/env node
/**
 * Creates the seed staff accounts (2 admins, 3 receptionists, 10
 * doctors — Section 4's "~5 staff users, ~10 doctors") via the Supabase
 * Admin API.
 *
 * Why this can't be plain SQL in supabase/seed.sql: creating a working
 * login means writing to both auth.users (with a correctly-hashed
 * password) AND auth.identities, in a shape that has drifted across
 * Supabase/GoTrue versions. supabase.auth.admin.createUser() is the one
 * stable interface for that — hand-crafting the INSERTs is a classic
 * source of "the row exists but login fails" bugs. Everything else
 * (patients, appointments, medical records, ...) has no such constraint,
 * so it lives in plain SQL in supabase/seed.sql instead.
 *
 * The public.profiles row for each account is created automatically by
 * the handle_new_auth_user trigger (0004_profiles.sql), reading
 * full_name/role/phone out of the user_metadata set here.
 *
 * Usage:
 *   node scripts/seed-users.mjs
 * Then:
 *   psql "$DATABASE_URL" -f supabase/seed.sql
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";

// Minimal .env.local reader so this script has no extra dependency
// beyond @supabase/supabase-js, which is already part of the project.
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
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Copy .env.example to .env.local and fill in your Supabase project's credentials first.",
  );
  process.exit(1);
}

// Same password for every seeded demo account — this is throwaway
// academic-project data, not a real deployment. Documented in README.md.
const SEED_PASSWORD = "Debek@2026";

// Phone numbers use South Sudan's country code (+211); mobile prefixes
// (092/095/096/097) mirror MTN/Zain/Digitel South Sudan ranges.
const staff = [
  { email: "admin@debek.local", full_name: "Awut Deng Garang", role: "admin", phone: "+211 92 000 0001" },
  { email: "admin2@debek.local", full_name: "Emmanuel Taban Wani", role: "admin", phone: "+211 92 000 0002" },
  { email: "reception@debek.local", full_name: "Nyandeng Malong Akec", role: "receptionist", phone: "+211 95 000 0010" },
  { email: "reception2@debek.local", full_name: "Santino Lado Modi", role: "receptionist", phone: "+211 95 000 0011" },
  { email: "reception3@debek.local", full_name: "Rebecca Ajak Bol", role: "receptionist", phone: "+211 95 000 0012" },
];

const doctors = [
  { email: "doctor1@debek.local", full_name: "Dr. Deng Chol Kuol", phone: "+211 96 000 0020" },
  { email: "doctor2@debek.local", full_name: "Dr. Achol Majok Ayen", phone: "+211 96 000 0021" },
  { email: "doctor3@debek.local", full_name: "Dr. James Wani Lomude", phone: "+211 96 000 0022" },
  { email: "doctor4@debek.local", full_name: "Dr. Grace Nyanhial Gatkuoth", phone: "+211 96 000 0023" },
  { email: "doctor5@debek.local", full_name: "Dr. Peter Gatluak Riek", phone: "+211 96 000 0024" },
  { email: "doctor6@debek.local", full_name: "Dr. Mary Abuk Athian", phone: "+211 96 000 0025" },
  { email: "doctor7@debek.local", full_name: "Dr. Simon Yel Kur", phone: "+211 96 000 0026" },
  { email: "doctor8@debek.local", full_name: "Dr. Agnes Adau Ajang", phone: "+211 96 000 0027" },
  { email: "doctor9@debek.local", full_name: "Dr. Joseph Madut Manyang", phone: "+211 96 000 0028" },
  { email: "doctor10@debek.local", full_name: "Dr. Elizabeth Nyibol Deng", phone: "+211 96 000 0029" },
];

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function ensureUser({ email, full_name, role, phone }) {
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: SEED_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name, role: role ?? "doctor", phone },
  });

  if (createError) {
    // 422/"already registered" is expected on re-runs — not fatal.
    if (String(createError.message).toLowerCase().includes("already")) {
      console.log(`skip (already exists): ${email}`);
      return;
    }
    throw createError;
  }

  console.log(`created: ${email} (${created.user.id})`);
}

async function main() {
  console.log(`Seeding staff accounts at ${SUPABASE_URL} ...`);
  for (const user of staff) {
    await ensureUser(user);
  }
  for (const doc of doctors) {
    await ensureUser({ ...doc, role: "doctor" });
  }
  console.log("\nDone. All seeded accounts use the password:", SEED_PASSWORD);
  console.log("Next: psql \"$DATABASE_URL\" -f supabase/seed.sql");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
