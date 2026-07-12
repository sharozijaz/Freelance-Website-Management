export type MembershipRole =
  "agency_owner" | "agency_admin" | "client_admin" | "editor" | "writer" | "viewer";

export type MembershipStatus = "invited" | "active" | "disabled" | "removed";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  image?: string | null;
  emailVerified?: boolean;
}

export interface AuthSession {
  id: string;
  userId: string;
  expiresAt: Date;
  activeOrganizationId?: string | null;
}

export interface OrganizationMembership {
  organizationId: string;
  userId: string;
  role: MembershipRole;
  status: MembershipStatus;
  permissions: string[];
}

export interface SessionContext {
  session: AuthSession;
  user: AuthUser;
  memberships: OrganizationMembership[];
  activeOrganizationId?: string | null;
}

export type AuditAuthEvent =
  | "auth.sign_in"
  | "auth.sign_out"
  | "auth.password_reset_requested"
  | "auth.password_reset_completed"
  | "auth.email_verification_requested"
  | "auth.email_verified"
  | "auth.organization_switched"
  | "auth.permission_denied";

export interface AuditAuthEventPayload {
  action: AuditAuthEvent;
  actorUserId?: string;
  organizationId?: string;
  metadata?: Record<string, unknown>;
}
