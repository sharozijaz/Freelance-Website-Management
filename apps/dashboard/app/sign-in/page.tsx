import type { Metadata } from "next";
import React from "react";
import { getSafeRedirectPath } from "@agency/auth/redirects";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@agency/ui";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = {
  title: "Sign in | Agency Platform",
  description: "Sign in to the Agency Website Platform dashboard.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const callbackUrl = getSafeRedirectPath(params?.callbackUrl);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12 text-foreground">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-sm font-medium text-muted-foreground">Agency Website Platform</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-normal">
            Sign in to your dashboard
          </h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>
              Use your agency account credentials to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignInForm callbackUrl={callbackUrl} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
