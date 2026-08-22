import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { cloudinary } from "@/lib/cloudinary/config";

/**
 * Section 5.8: "Signed uploads only — generate the signature in a
 * server action; never expose the Cloudinary API secret to the
 * browser." A route handler rather than a server action because the
 * client needs this as a plain JSON POST it can call right before
 * POSTing the file straight to Cloudinary (a server action response
 * isn't a natural fit for that upload widget flow); either way, the
 * secret never leaves this server-only module.
 *
 * Section 8 lists this exact route ("/api → cloudinary signature,
 * webhooks").
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const timestamp = Math.round(Date.now() / 1000);
  const folder = "debek/patient-files";
  // Signed into the request so Cloudinary itself rejects anything else,
  // not just our own client-side check (Section 5.8: "Restrict MIME
  // types").
  const allowedFormats = "pdf,jpg,jpeg,png,webp";

  const apiSecret = cloudinary.config().api_secret;
  if (!apiSecret) {
    return NextResponse.json({ error: "Upload is not configured." }, { status: 500 });
  }

  const signature = cloudinary.utils.api_sign_request({ timestamp, folder, allowed_formats: allowedFormats }, apiSecret);

  return NextResponse.json({
    signature,
    timestamp,
    folder,
    allowedFormats,
    apiKey: cloudinary.config().api_key,
    cloudName: cloudinary.config().cloud_name,
  });
}
