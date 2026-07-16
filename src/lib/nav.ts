import type { StaffRole } from "@/lib/constants";
import type { Dictionary } from "@/lib/i18n";

export type NavKey = "dashboard" | "leads" | "myLeads" | "clients" | "myClients" | "calendar" | "staff";

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
];

export function navForRole(role: StaffRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export function navLabel(item: NavItem, nav: Dictionary["nav"]): string {
  return nav[item.labelKey];
}
