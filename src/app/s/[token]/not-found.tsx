// Shown for an unknown, expired or revoked link, and for a page that doesn't exist under a live
// one. Deliberately the same message for all of them.
export default function ShareNotFound() {
  return (
    <div className="mx-auto max-w-md pt-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">This link isn&apos;t available</h1>
      <p className="pt-2 text-sm text-muted-foreground">
        It may have expired or been turned off. Ask the person who shared it for a new link.
      </p>
    </div>
  );
}
