export default function DashboardLoading() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-4 md:p-6">
      <div className="h-8 w-56 rounded-md bg-muted" />
      <div className="grid gap-3 md:grid-cols-4">
        <div className="h-28 rounded-lg bg-muted" />
        <div className="h-28 rounded-lg bg-muted" />
        <div className="h-28 rounded-lg bg-muted" />
        <div className="h-28 rounded-lg bg-muted" />
      </div>
      <div className="h-80 rounded-lg bg-muted" />
    </main>
  );
}
