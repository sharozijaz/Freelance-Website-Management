import type { ReactNode } from "react";
import { Card, CardContent } from "@agency/ui";

export function SummaryCard({
  label,
  value,
  helper,
}: {
  helper?: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
        <div className="mt-2 font-display text-2xl font-semibold">{value}</div>
        {helper ? <p className="mt-1 text-xs text-muted-foreground">{helper}</p> : null}
      </CardContent>
    </Card>
  );
}
