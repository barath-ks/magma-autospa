"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ForgotPasswordRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const role = searchParams.get("role") || "staff";
    router.replace(`/auth/forgot-password?role=${role}`);
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base text-text-secondary text-sm font-mono">
      Redirecting to secure password reset...
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordRedirect />
    </Suspense>
  );
}
