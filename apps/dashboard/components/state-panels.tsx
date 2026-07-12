import { EmptyState } from "@agency/ui";

interface UnauthorizedStateProps {
  message?: string;
}

export function UnauthorizedState({
  message = "You do not have access to this screen.",
}: UnauthorizedStateProps) {
  return (
    <EmptyState
      description={message}
      title="Unauthorized"
    />
  );
}

export function NoActiveOrganizationState() {
  return (
    <EmptyState
      description="Switch into a client workspace before managing client-specific operations."
      title="No active client workspace"
    />
  );
}
