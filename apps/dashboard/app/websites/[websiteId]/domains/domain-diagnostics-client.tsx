"use client";

import { useState, useTransition } from "react";
import { Badge, Button } from "@agency/ui";
import type { DomainDiagnosticResult } from "@/lib/deployment/diagnostics";

export function DomainDiagnosticsClient({
  domainId,
  initialDiagnostics = null,
  websiteId,
}: {
  domainId: string;
  initialDiagnostics?: DomainDiagnosticResult | null;
  websiteId: string;
}) {
  const [diagnostics, setDiagnostics] = useState<DomainDiagnosticResult | null>(initialDiagnostics);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function runDiagnostics() {
    startTransition(async () => {
      setError(null);
      const response = await fetch(
        `/api/websites/${encodeURIComponent(websiteId)}/domains/${encodeURIComponent(domainId)}/diagnostics`,
        { method: "POST" },
      );
      const payload = (await response.json()) as {
        diagnostics?: DomainDiagnosticResult;
        error?: string;
      };
      if (!response.ok || !payload.diagnostics) {
        setError(payload.error ?? "Domain diagnostics failed.");
        return;
      }
      setDiagnostics(payload.diagnostics);
    });
  }

  return (
    <div className="mt-3 rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Observed Diagnostics</p>
          <p className="text-xs text-muted-foreground">
            Real server-side DNS and TLS checks. Results are shown for this browser session; use
            Save Status when you want the operational labels above to change.
          </p>
        </div>
        <Button
          disabled={pending}
          onClick={runDiagnostics}
          size="sm"
          type="button"
          variant="outline"
        >
          {pending ? "Checking..." : "Run Diagnostics"}
        </Button>
      </div>

      {error ? <p className="mt-3 text-sm text-error">{error}</p> : null}
      {diagnostics ? (
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div className="rounded-md bg-muted/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">DNS</p>
              <Badge variant={diagnostics.dns.status === "resolved" ? "success" : "warning"}>
                {diagnostics.dns.status}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Checked {new Date(diagnostics.dns.checkedAt).toLocaleString()}
            </p>
            {diagnostics.dns.records.length > 0 ? (
              <ul className="mt-2 space-y-1 text-xs">
                {diagnostics.dns.records.map((record, index) => (
                  <li
                    className="break-words"
                    key={`${record.type}-${record.value}-${index.toString()}`}
                  >
                    <span className="font-medium">{record.type}</span> {record.value}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                No A, AAAA, or CNAME records found.
              </p>
            )}
          </div>

          <div className="rounded-md bg-muted/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">TLS</p>
              <Badge variant={diagnostics.tls.status === "valid" ? "success" : "warning"}>
                {diagnostics.tls.status}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Checked {new Date(diagnostics.tls.checkedAt).toLocaleString()}
            </p>
            <dl className="mt-2 grid gap-1 text-xs">
              <DiagnosticRow label="Authorized" value={diagnostics.tls.authorized ? "Yes" : "No"} />
              <DiagnosticRow label="Subject" value={diagnostics.tls.subject ?? "Not available"} />
              <DiagnosticRow label="Issuer" value={diagnostics.tls.issuer ?? "Not available"} />
              <DiagnosticRow
                label="Valid from"
                value={diagnostics.tls.validFrom ?? "Not available"}
              />
              <DiagnosticRow label="Valid to" value={diagnostics.tls.validTo ?? "Not available"} />
              <DiagnosticRow
                label="Expiry"
                value={
                  typeof diagnostics.tls.daysUntilExpiry === "number"
                    ? `${diagnostics.tls.daysUntilExpiry.toString()} day(s)`
                    : "Not available"
                }
              />
              {diagnostics.tls.authorizationError ? (
                <DiagnosticRow label="Authorization" value={diagnostics.tls.authorizationError} />
              ) : null}
            </dl>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DiagnosticRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[0.8fr_1.4fr] gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words">{value}</dd>
    </div>
  );
}
