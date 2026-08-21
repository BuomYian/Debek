/**
 * Placeholder Supabase database types.
 *
 * Replace this file's contents with the generated types once the schema
 * migrations (Phase 2) are applied to a real Supabase project:
 *
 *   npx supabase gen types typescript --project-id <project-ref> > lib/supabase/types.ts
 *
 * Keeping a minimal `Database` shape here (rather than `any`) lets the
 * typed client compile before the schema exists, without violating the
 * project's "no `any`" rule.
 */
export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
