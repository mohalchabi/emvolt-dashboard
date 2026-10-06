"use client";

import { UserPlus, PhoneCall } from "lucide-react";
import { NewClientDialog } from "@/components/clients/new-client-dialog";
import { NewLeadDialog } from "@/components/leads/new-lead-dialog";
import { ActionTile } from "@/components/dashboard/action-tile";
import type { Staff } from "@/generated/prisma/client";
import type { Dictionary, Locale } from "@/lib/i18n";

/**
 * The two things front desk start from a standing position.
 *
 * Both already existed as buttons on their own list pages. They are repeated
 * here because someone is usually at the counter when they're needed, and the
 * home screen is where the person is looking.
 */
export function HomeActions({
  trainers,
  staff,
  t,
  locale,
}: {
  trainers: Staff[];
  /** Everyone a lead can be assigned to. */
  staff: Staff[];
  t: Dictionary;
  locale: Locale;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      <NewClientDialog
        trainers={trainers}
        t={t.clientsPage}
        trigger={
          <ActionTile
            label={t.homeActions.addCustomer}
            hint={t.homeActions.addCustomerHint}
            icon={UserPlus}
          />
        }
      />
      <NewLeadDialog
        staff={staff}
        t={t.newLeadDialog}
        locale={locale}
        trigger={
          <ActionTile
            label={t.homeActions.addLead}
            hint={t.homeActions.addLeadHint}
            icon={PhoneCall}
            tone="good"
          />
        }
      />
    </div>
  );
}
