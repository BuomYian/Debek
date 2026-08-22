import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/guards";
import { CLINIC_NAME, CLINIC_TAGLINE } from "@/lib/clinic";

export const metadata = { title: "Settings" };

/**
 * Section 8 lists this route; Sections 5.1–5.9 never define what
 * clinic-level settings actually are, and Section 4's schema has no
 * settings table — there's nothing configurable to build a real form
 * around without inventing scope the spec didn't ask for. This shows
 * what's genuinely configurable today (the clinic identity used on
 * every printed document, and where the rest of the environment lives)
 * rather than a form that edits nothing.
 */
export default async function SettingsPage() {
  await requireRole(["admin"]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Clinic identity and where the rest of the configuration lives.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clinic identity</CardTitle>
          <CardDescription>
            Shown on every printed prescription, invoice, and medical record. Defined in{" "}
            <code className="rounded bg-muted px-1 py-0.5">lib/clinic.ts</code> — there&apos;s no settings table to
            edit this from the UI yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <p>
            <span className="text-muted-foreground">Name:</span> {CLINIC_NAME}
          </p>
          <p>
            <span className="text-muted-foreground">Tagline:</span> {CLINIC_TAGLINE}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Environment configuration</CardTitle>
          <CardDescription>
            Supabase and Cloudinary credentials, and the site URL used in outgoing emails, are set via environment
            variables — see <code className="rounded bg-muted px-1 py-0.5">.env.example</code> for the full list.
            Changing them means updating the deployment&apos;s environment, not this page.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
