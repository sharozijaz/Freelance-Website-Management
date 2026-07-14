"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Modal,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@agency/ui";

interface EnvironmentItem {
  baseUrl: string | null;
  id: string;
  name: string;
  previewAccessConfigured: boolean;
  previewAccessTokenRotatedAt: string | null;
  stagingAccessEnabled: boolean;
  stagingAccessSecretConfigured: boolean;
  stagingAccessSecretRotatedAt: string | null;
  status: "active" | "inactive";
  type: "production" | "staging";
}

type SecurityAction =
  "disable_staging_access" | "enable_staging_access" | "rotate_preview" | "rotate_staging_secret";

interface PendingAction {
  action: SecurityAction;
  description: string;
  environment: EnvironmentItem;
  title: string;
}

interface OneTimeSecret {
  environmentName: string;
  kind: "preview" | "staging";
  value: string;
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Never";
}

function actionCopy(action: SecurityAction, environment: EnvironmentItem): PendingAction {
  if (action === "rotate_preview") {
    return {
      action,
      description:
        "The existing preview token becomes invalid. Connected deployments using the previous token must be updated.",
      environment,
      title: "Rotate preview token?",
    };
  }

  if (action === "rotate_staging_secret") {
    return {
      action,
      description:
        "The existing staging access secret becomes invalid. Users and deployments using the previous secret may lose access.",
      environment,
      title: "Rotate staging secret?",
    };
  }

  if (action === "disable_staging_access") {
    return {
      action,
      description:
        "The staging website will no longer require staging access authorization. Preview authorization remains separate.",
      environment,
      title: "Disable staging access protection?",
    };
  }

  return {
    action,
    description:
      "Staging access protection will be enabled and a new staging secret will be generated. Store it in the connected deployment.",
    environment,
    title: "Enable staging access protection?",
  };
}

function secretKind(action: SecurityAction): OneTimeSecret["kind"] | null {
  if (action === "rotate_preview") return "preview";
  if (action === "enable_staging_access" || action === "rotate_staging_secret") return "staging";
  return null;
}

export function EnvironmentSecurityClient({
  environments,
  websiteId,
}: {
  environments: EnvironmentItem[];
  websiteId: string;
}) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [oneTimeSecret, setOneTimeSecret] = useState<OneTimeSecret | null>(null);
  const stagingEnvironment = useMemo(
    () => environments.find((environment) => environment.type === "staging") ?? null,
    [environments],
  );

  async function runAction() {
    if (!pendingAction) return;

    setError(null);
    setIsMutating(true);
    setOneTimeSecret(null);

    try {
      const response = await fetch(
        `/api/websites/${websiteId}/environments/${pendingAction.environment.id}/security`,
        {
          body: JSON.stringify({ action: pendingAction.action }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      const payload = (await response.json()) as { error?: string; token?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Environment security could not be updated.");
      }

      const kind = secretKind(pendingAction.action);
      if (kind && payload.token) {
        setOneTimeSecret({
          environmentName: pendingAction.environment.name,
          kind,
          value: payload.token,
        });
      }

      setPendingAction(null);
      router.refresh();
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "Action failed.");
    } finally {
      setIsMutating(false);
    }
  }

  async function copySecret() {
    if (!oneTimeSecret) return;
    await navigator.clipboard.writeText(oneTimeSecret.value);
  }

  return (
    <div className="space-y-4">
      {error ? <Alert variant="error">{error}</Alert> : null}

      {oneTimeSecret ? (
        <Card className="border-warning">
          <CardHeader className="p-4">
            <CardTitle className="flex items-center justify-between gap-3 text-base">
              <span>{oneTimeSecret.kind === "preview" ? "Preview token" : "Staging secret"}</span>
              <Badge variant="warning">Shown once</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0">
            <p className="text-sm text-muted-foreground">
              This value cannot be retrieved again after you dismiss it. Store it in the connected
              deployment server environment.
            </p>
            <div className="rounded-md border border-border bg-muted p-3">
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                {oneTimeSecret.environmentName}
              </p>
              <code className="block break-all text-sm">{oneTimeSecret.value}</code>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void copySecret()} size="sm" type="button">
                Copy
              </Button>
              <Button
                onClick={() => {
                  setOneTimeSecret(null);
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-2">
        {environments.map((environment) => (
          <Card key={environment.id}>
            <CardHeader className="p-4">
              <CardTitle className="flex items-center justify-between gap-3 text-base">
                <span>{environment.name} Security</span>
                <Badge variant={environment.type === "staging" ? "info" : "outline"}>
                  {environment.type === "staging" ? "Staging" : "Production"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 pt-0">
              {environment.type === "staging" ? (
                <>
                  <SecurityFeature
                    action={
                      <Button
                        onClick={() => {
                          setPendingAction(actionCopy("rotate_preview", environment));
                        }}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Rotate Preview Token
                      </Button>
                    }
                    description="Human preview access for draft content on the connected staging site."
                    lastRotated={formatDate(environment.previewAccessTokenRotatedAt)}
                    status={
                      <Badge variant={environment.previewAccessConfigured ? "success" : "outline"}>
                        {environment.previewAccessConfigured ? "Configured" : "Not configured"}
                      </Badge>
                    }
                    title="Preview Access"
                  />

                  <SecurityFeature
                    action={
                      <div className="flex flex-wrap gap-2">
                        {environment.stagingAccessEnabled ? (
                          <Button
                            onClick={() => {
                              setPendingAction(actionCopy("disable_staging_access", environment));
                            }}
                            size="sm"
                            type="button"
                            variant="destructive"
                          >
                            Disable
                          </Button>
                        ) : (
                          <Button
                            onClick={() => {
                              setPendingAction(actionCopy("enable_staging_access", environment));
                            }}
                            size="sm"
                            type="button"
                          >
                            Enable
                          </Button>
                        )}
                        <Button
                          onClick={() => {
                            setPendingAction(actionCopy("rotate_staging_secret", environment));
                          }}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          Rotate Staging Secret
                        </Button>
                      </div>
                    }
                    description="Visitor gate for the staging website. Separate from draft preview authorization."
                    lastRotated={formatDate(environment.stagingAccessSecretRotatedAt)}
                    status={
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={environment.stagingAccessEnabled ? "success" : "outline"}>
                          {environment.stagingAccessEnabled ? "Enabled" : "Disabled"}
                        </Badge>
                        <Badge
                          variant={
                            environment.stagingAccessSecretConfigured ? "success" : "outline"
                          }
                        >
                          {environment.stagingAccessSecretConfigured
                            ? "Secret configured"
                            : "Secret not configured"}
                        </Badge>
                      </div>
                    }
                    title="Staging Access Protection"
                  />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Staging preview and access protection controls are not available for production
                  environments.
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </section>

      {stagingEnvironment ? <DeploymentInstructions environment={stagingEnvironment} /> : null}

      <Modal
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
        open={Boolean(pendingAction)}
      >
        <ModalContent>
          <ModalHeader>
            <ModalTitle>{pendingAction?.title}</ModalTitle>
            <ModalDescription>{pendingAction?.description}</ModalDescription>
          </ModalHeader>
          <ModalFooter>
            <ModalClose asChild>
              <Button disabled={isMutating} type="button" variant="outline">
                Cancel
              </Button>
            </ModalClose>
            <Button
              disabled={isMutating}
              onClick={() => {
                void runAction();
              }}
              type="button"
              variant={
                pendingAction?.action === "disable_staging_access" ? "destructive" : "primary"
              }
            >
              {isMutating ? "Working..." : "Confirm"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

function SecurityFeature({
  action,
  description,
  lastRotated,
  status,
  title,
}: {
  action: ReactNode;
  description: string;
  lastRotated: string;
  status: ReactNode;
  title: string;
}) {
  return (
    <div className="rounded-md border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {status}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Last rotated: {lastRotated}</p>
        {action}
      </div>
    </div>
  );
}

function DeploymentInstructions({ environment }: { environment: EnvironmentItem }) {
  return (
    <Card>
      <CardHeader className="p-4">
        <CardTitle className="text-base">Connected Deployment Checklist</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 p-4 pt-0 text-sm lg:grid-cols-2">
        <div className="space-y-2">
          <h3 className="font-medium">Preview access</h3>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Visit `/preview` with the preview token on the connected staging site.</li>
            <li>The connected server validates the token and sets an HttpOnly preview cookie.</li>
            <li>
              Server-side SDK requests send preview intent; Platform API identity still comes from
              API credentials.
            </li>
          </ul>
          <div className="rounded-md bg-muted p-3">
            <code className="block">SHAROZ_PREVIEW_ACCESS_TOKEN_HASH</code>
            <code className="block">SHAROZ_PREVIEW_ACCESS_TOKEN</code>
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="font-medium">Staging access</h3>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Staging access is separate from Blog preview authorization.</li>
            <li>The staging token exchange sets an HttpOnly staging access cookie.</li>
            <li>Connected middleware protects staging routes when enabled.</li>
          </ul>
          <div className="rounded-md bg-muted p-3">
            <code className="block">SHAROZ_STAGING_ACCESS_ENABLED</code>
            <code className="block">SHAROZ_STAGING_ACCESS_SECRET_HASH</code>
            <code className="block">SHAROZ_STAGING_ACCESS_SECRET</code>
          </div>
        </div>
        <p className="text-xs text-muted-foreground lg:col-span-2">
          Staging environment: {environment.name}. Never store these values in `NEXT_PUBLIC_*`
          variables or browser storage.
        </p>
      </CardContent>
    </Card>
  );
}
