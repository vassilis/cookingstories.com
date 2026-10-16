"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton({ label, home }: { label: string; home: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="button button-quiet"
      style={{ minHeight: 36, padding: "0 14px", fontSize: 14 }}
      onClick={async () => {
        await authClient.signOut();
        router.push(home);
        router.refresh();
      }}
    >
      {label}
    </button>
  );
}
