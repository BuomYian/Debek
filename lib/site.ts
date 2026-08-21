/** Base URL used to build absolute links in outgoing emails (password reset, staff invites). */
export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
