import { Button } from "@/components/ui/button";
import { signOutAction } from "@/lib/actions/auth";

export function SignOutButton({ label = "Sign out" }: { label?: string }) {
  return (
    <form action={signOutAction}>
      <Button type="submit" variant="ghost" size="sm" className="w-full justify-start">
        {label}
      </Button>
    </form>
  );
}
