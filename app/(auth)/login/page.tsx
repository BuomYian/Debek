import { Suspense } from "react";

import { LoginForm } from "@/components/features/auth/login-form";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    // useSearchParams() in LoginForm requires a Suspense boundary during
    // static generation.
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
