import type { StaffRole } from "@/lib/constants";
import type { Dictionary } from "@/lib/i18n";

export type NavKey =
  | "dashboard"
  | "leads"
  | "myLeads"
  | "clients"
  | "myClients"
  | "calendar"
  | "staff"
  | "packageTypes"
  | "wallet"
  | "pettyCash"
  | "myPettyCash"
  | "help";

export type NavItem = {
  href: string;
  labelKey: NavKey;
  roles: StaffRole[];
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", labelKey: "dashboard", roles: ["admin", "trainer_manager", "trainer", "front_desk"] },
  // Full lead list + weekly distribution is admin-only; everyone else works
  // their own assigned leads via "My Leads".
  { href: "/leads", labelKey: "leads", roles: ["admin", "trainer_manager"] },
  { href: "/my-leads", labelKey: "myLeads", roles: ["front_desk", "trainer"] },
  { href: "/clients", labelKey: "clients", roles: ["admin", "trainer_manager", "front_desk"] },
  { href: "/my-clients", labelKey: "myClients", roles: ["trainer"] },
  { href: "/calendar", labelKey: "calendar", roles: ["admin", "trainer_manager", "front_desk", "trainer"] },
  { href: "/staff", labelKey: "staff", roles: ["admin"] },
  { href: "/package-types", labelKey: "packageTypes", roles: ["admin", "trainer_manager"] },
  // Cash ledger — salaries, rent and the transfers funding them stay with the
  // owner, so this never appears for anyone else.
  { href: "/wallet", labelKey: "wallet", roles: ["admin"] },
  // The trainers manager runs the floor's cash but not the ledger, so petty
  // cash is linked on its own rather than through the wallet.
  { href: "/wallet/petty-cash", labelKey: "pettyCash", roles: ["trainer_manager"] },
  // Training videos. Sits last so it's out of the daily path but always
  // reachable — new staff are pointed here on their first shift.
  { href: "/help", labelKey: "help", roles: ["admin", "trainer_manager", "trainer", "front_desk"] },
];

/**
 * Deliberately not in NAV_ITEMS. Petty cash is issued to individuals, so this
 * tab follows the float rather than the role — the dashboard layout appends it
 * only for staff actually carrying one, and admins reach the same rows through
 * the full ledger at /wallet instead.
 */
export const MY_PETTY_CASH_NAV: NavItem = {
  href: "/my-petty-cash",
  labelKey: "myPettyCash",
  roles: ["trainer", "front_desk"],
};

export function navForRole(role: StaffRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export function navLabel(item: NavItem, nav: Dictionary["nav"]): string {
  return nav[item.labelKey];
}
