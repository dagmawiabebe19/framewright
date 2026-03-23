import { Suspense } from "react";
import { AuthPageClient } from "./auth-client";

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#080808] flex items-center justify-center text-sm text-[#5a5040]">
          Loading…
        </div>
      }
    >
      <AuthPageClient />
    </Suspense>
  );
}
