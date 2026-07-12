import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle, EmptyState } from "@agency/ui";

export function OperationsList({
  children,
  empty,
  title,
}: {
  children: ReactNode;
  empty: ReactNode;
  title: string;
}) {
  return (
    <Card>
      <CardHeader className="p-4">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {children ? <div className="divide-y divide-border">{children}</div> : <EmptyState title={empty} />}
      </CardContent>
    </Card>
  );
}
