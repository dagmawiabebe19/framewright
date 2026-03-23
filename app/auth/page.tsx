import { Suspense } from "react";
import { AuthPageClient } from "./auth-client";

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center text-sm text-[#5f5e70]">
          Loading…
        </div>
      }
    >
      <AuthPageClient />
    </Suspense>
  );
}
