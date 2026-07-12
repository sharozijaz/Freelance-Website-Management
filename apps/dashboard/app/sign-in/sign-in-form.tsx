"use client";

import { useRouter } from "next/navigation";
import { useState, type SyntheticEvent } from "react";
import { Alert, AlertDescription, Button, Input, Label } from "@agency/ui";
import { signIn } from "@agency/auth/client";
import { getSafeRedirectPath } from "@agency/auth/redirects";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getAuthErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    const message = String(error.message);

    if (message.toLowerCase().includes("verify")) {
      return "Please verify your email address before signing in.";
    }
  }

  return "The email or password is incorrect.";
}

export function SignInForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function onSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    const redirectTo = getSafeRedirectPath(callbackUrl);

    if (!emailPattern.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    if (password.length < 12) {
      setError("Enter your password.");
      return;
    }

    setIsPending(true);

    try {
      const result = await signIn.email({
        callbackURL: redirectTo,
        email: normalizedEmail,
        password,
      });

      if (result.error) {
        setError(getAuthErrorMessage(result.error));
        return;
      }

      router.replace(redirectTo);
      router.refresh();
    } catch {
      setError("Sign in is temporarily unavailable. Try again in a moment.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      {error ? (
        <Alert aria-live="polite" variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          autoComplete="email"
          disabled={isPending}
          id="email"
          inputMode="email"
          name="email"
          onChange={(event) => {
            setEmail(event.target.value);
          }}
          placeholder="owner@example.com"
          required
          type="email"
          value={email}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          autoComplete="current-password"
          disabled={isPending}
          id="password"
          minLength={12}
          name="password"
          onChange={(event) => {
            setPassword(event.target.value);
          }}
          required
          type="password"
          value={password}
        />
      </div>
      <Button className="w-full" disabled={isPending} type="submit">
        {isPending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
