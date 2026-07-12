"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { signOut } from "@agency/auth/client";

export function SignOutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleSignOut() {
    setIsPending(true);

    try {
      await signOut();
    } finally {
      router.replace("/sign-in");
      router.refresh();
    }
  }

  return (
    <button
      className="flex w-full items-center gap-2 text-left"
      disabled={isPending}
      onClick={handleSignOut}
      type="button"
    >
      <LogOut aria-hidden className="size-4" />
      {isPending ? "Signing out..." : "Sign out"}
    </button>
  );
}
