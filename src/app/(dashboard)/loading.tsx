/**
 * Shown the instant a dashboard link is tapped, while the server runs the
 * page's queries.
 *
 * Without a loading boundary the App Router holds the browser on the previous
 * page until the new one's HTML is ready, so every navigation reads as the app
 * hanging for a couple of seconds. This doesn't make the queries faster; it
 * makes the wait visible and the tap feel acknowledged, which is the part staff
 * were complaining about.
 *
 * Deliberately generic: one boundary for the whole group beats a bespoke
 * skeleton per route that drifts out of shape as pages change.
 */
function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />;
}

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <div className="flex flex-col gap-2">
        <Bar className="h-7 w-48" />
        <Bar className="h-4 w-72 max-w-full" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-border p-4">
            <Bar className="size-10 shrink-0 rounded-lg" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Bar className="h-6 w-20" />
              <Bar className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
        <Bar className="h-5 w-40" />
        {Array.from({ length: 6 }, (_, i) => (
          <Bar key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
