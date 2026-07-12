"use client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_AUTH_BASE_URL,
});

export const useSession = authClient.useSession;

export const signIn = authClient.signIn;
export const signOut = authClient.signOut;
export const requestPasswordReset = authClient.requestPasswordReset;
export const resetPassword = authClient.resetPassword;
export const sendVerificationEmail = authClient.sendVerificationEmail;
export const verifyEmail = authClient.verifyEmail;
