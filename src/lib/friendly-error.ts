// Every Server Action is tied to a build-specific ID that Next.js rotates on
// each deploy. A browser tab left open across a deploy still calls the old
// ID, which the new server doesn't recognize — Next.js throws
// "Failed to find Server Action. This request might be from an older or
// newer deployment." That's not a bug in the action itself, so showing that
// raw string in a toast just reads as an unexplained crash. Translate it
// into the one thing that actually fixes it.
const STALE_DEPLOY_HINT = "Failed to find Server Action";

export function friendlyErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    if (err.message.includes(STALE_DEPLOY_HINT)) {
      return "The app was just updated — please refresh the page and try again.";
    }
    return err.message;
  }
  return fallback;
}
