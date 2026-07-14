"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@agency/ui";

interface CredentialItem {
  createdAt: string;
  expiresAt: string | null;
  id: string;
  label: string;
  lastUsedAt: string | null;
  publicKey: string;
  revokedAt: string | null;
  status: "active" | "revoked";
  updatedAt: string;
  environment: {
    id: string;
    name: string;
    type: "production" | "staging";
  };
}

interface OneTimeSecret {
  publicKey: string;
  secret: string;
}

interface EnvironmentOption {
  id: string;
  name: string;
  status: "active" | "inactive";
  type: "production" | "staging";
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Never";
}

export function CredentialsClient({
  canManageCredentials,
  environments,
  initialCredentials,
  websiteId,
}: {
  canManageCredentials: boolean;
  environments: EnvironmentOption[];
  initialCredentials: CredentialItem[];
  websiteId: string;
}) {
  const [credentials, setCredentials] = useState(initialCredentials);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState("Production");
  const [environmentId, setEnvironmentId] = useState(environments[0]?.id ?? "");
  const [expiresAt, setExpiresAt] = useState("");
  const [oneTimeSecret, setOneTimeSecret] = useState<OneTimeSecret | null>(null);
  const activeCredentials = useMemo(
    () => credentials.filter((credential) => credential.status === "active"),
    [credentials],
  );

  async function refreshCredentials() {
    const response = await fetch(`/api/websites/${websiteId}/credentials`);
    const payload = (await response.json()) as { credentials?: CredentialItem[]; error?: string };
    if (!response.ok || !payload.credentials) {
      throw new Error(payload.error ?? "Credentials could not be refreshed.");
    }
    setCredentials(payload.credentials);
  }

  async function createCredential() {
    setError(null);
    setOneTimeSecret(null);
    const response = await fetch(`/api/websites/${websiteId}/credentials`, {
      body: JSON.stringify({ environmentId, expiresAt: expiresAt || null, label }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const payload = (await response.json()) as {
      credential?: CredentialItem;
      error?: string;
      secret?: string;
    };

    if (!response.ok || !payload.credential || !payload.secret) {
      setError(payload.error ?? "Credential could not be created.");
      return;
    }

    const credential = payload.credential;
    setCredentials((current) => [credential, ...current]);
    setOneTimeSecret({ publicKey: credential.publicKey, secret: payload.secret });
  }

  async function mutateCredential(credentialId: string, action: "revoke" | "rotate") {
    setError(null);
    setOneTimeSecret(null);
    const response = await fetch(`/api/websites/${websiteId}/credentials/${credentialId}`, {
      body: JSON.stringify({ action }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const payload = (await response.json()) as {
      credential?: CredentialItem;
      error?: string;
      secret?: string;
    };

    if (!response.ok) {
      setError(payload.error ?? "Credential could not be updated.");
      return;
    }

    if (action === "rotate" && payload.credential && payload.secret) {
      setOneTimeSecret({ publicKey: payload.credential.publicKey, secret: payload.secret });
    }

    await refreshCredentials();
  }

  return (
    <div className="space-y-4">
      {error ? <Alert variant="error">{error}</Alert> : null}

      {oneTimeSecret ? (
        <Card className="border-warning">
          <CardHeader className="p-4">
            <CardTitle className="text-base">Secret shown once</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0">
            <p className="text-sm text-muted-foreground">
              This secret will only be shown once. Store it in your website server environment.
            </p>
            <div>
              <Label>Public key</Label>
              <Input readOnly value={oneTimeSecret.publicKey} />
            </div>
            <div>
              <Label>Secret</Label>
              <Input readOnly value={oneTimeSecret.secret} />
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">Create Credential</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 p-4 pt-0 md:grid-cols-[minmax(0,1fr)_220px_220px_auto]">
          <div>
            <Label htmlFor="credential-label">Label</Label>
            <Input
              disabled={!canManageCredentials}
              id="credential-label"
              onChange={(event) => {
                setLabel(event.target.value);
              }}
              value={label}
            />
          </div>
          <div>
            <Label htmlFor="credential-environment">Environment</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              disabled={!canManageCredentials || environments.length === 0}
              id="credential-environment"
              onChange={(event) => {
                setEnvironmentId(event.target.value);
              }}
              value={environmentId}
            >
              {environments.map((environment) => (
                <option
                  disabled={environment.status !== "active"}
                  key={environment.id}
                  value={environment.id}
                >
                  {environment.name} ({environment.type})
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="credential-expiration">Expiration</Label>
            <Input
              disabled={!canManageCredentials}
              id="credential-expiration"
              onChange={(event) => {
                setExpiresAt(event.target.value);
              }}
              type="datetime-local"
              value={expiresAt}
            />
          </div>
          <Button
            className="self-end"
            disabled={!canManageCredentials || !environmentId}
            onClick={() => {
              void createCredential();
            }}
            type="button"
          >
            Create
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="flex items-center justify-between gap-3 text-base">
            <span>Credentials</span>
            <Badge variant={activeCredentials.length > 0 ? "success" : "outline"}>
              {activeCredentials.length} active
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border p-4 pt-0">
          {credentials.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No credentials have been created.</p>
          ) : (
            credentials.map((credential) => (
              <div className="grid gap-3 py-4 xl:grid-cols-[1fr_auto]" key={credential.id}>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{credential.label}</p>
                    <Badge variant="outline">{credential.environment.name}</Badge>
                    <Badge variant={credential.status === "active" ? "success" : "outline"}>
                      {credential.status}
                    </Badge>
                  </div>
                  <p className="break-all text-xs text-muted-foreground">{credential.publicKey}</p>
                  <dl className="grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
                    <div>
                      <dt className="font-medium text-foreground">Created</dt>
                      <dd>{formatDate(credential.createdAt)}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-foreground">Expires</dt>
                      <dd>{credential.expiresAt ? formatDate(credential.expiresAt) : "Never"}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-foreground">Last used</dt>
                      <dd>{formatDate(credential.lastUsedAt)}</dd>
                    </div>
                  </dl>
                </div>
                <div className="flex flex-wrap gap-2 xl:justify-end">
                  <Button
                    disabled={!canManageCredentials || credential.status !== "active"}
                    onClick={() => {
                      void mutateCredential(credential.id, "rotate");
                    }}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Rotate
                  </Button>
                  <Button
                    disabled={!canManageCredentials || credential.status !== "active"}
                    onClick={() => {
                      void mutateCredential(credential.id, "revoke");
                    }}
                    size="sm"
                    type="button"
                    variant="destructive"
                  >
                    Revoke
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
