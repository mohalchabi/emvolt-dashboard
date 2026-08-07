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
  | "help";

export type NavItem = {
  href: string;
  labelKey: NavKey;
  roles: StaffRole[];
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", labelKey: "dashboard", roles: ["admin", "trainer", "front_desk"] },
  // Full lead list + weekly distribution is admin-only; everyone else works
  // their own assigned leads via "My Leads".
  { href: "/leads", labelKey: "leads", roles: ["admin"] },
  { href: "/my-leads", labelKey: "myLeads", roles: ["front_desk", "trainer"] },
  { href: "/clients", labelKey: "clients", roles: ["admin", "front_desk"] },
  { href: "/my-clients", labelKey: "myClients", roles: ["trainer"] },
  { href: "/calendar", labelKey: "calendar", roles: ["admin", "front_desk", "trainer"] },
  { href: "/staff", labelKey: "staff", roles: ["admin"] },
  { href: "/package-types", labelKey: "packageTypes", roles: ["admin"] },
  // Cash ledger — salaries, petty cash and the transfers funding them are
  // admin-only, so this never appears for trainers or front desk.
  { href: "/wallet", labelKey: "wallet", roles: ["admin"] },
  // Training videos. Sits last so it's out of the daily path but always
  // reachable — new staff are pointed here on their first shift.
  { href: "/help", labelKey: "help", roles: ["admin", "trainer", "front_desk"] },
];

export function navForRole(role: StaffRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export function navLabel(item: NavItem, nav: Dictionary["nav"]): string {
  return nav[item.labelKey];
}
