import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth-helpers";
import { guessGender } from "@/lib/gender-guess";

function csvField(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

// Matches WhatsLoop's contact-import template (phone, name, email, company —
// only phone and name apply to leads) and its bare-digits phone format
// (966500000000, no leading +).
export async function GET(req: NextRequest) {
  await requireRole(["admin"]);

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const section = searchParams.get("section") || undefined;
  const assigned = searchParams.get("assigned");
  const gender = searchParams.get("gender");

  const leads = await prisma.lead.findMany({
    where: {
      status,
      section,
      assignedStaffId: assigned === "assigned" ? { not: null } : assigned === "unassigned" ? null : undefined,
    },
    select: { name: true, phone: true },
    orderBy: { createdAt: "desc" },
  });

  const filtered = gender && gender !== "all" ? leads.filter((l) => guessGender(l.name) === gender) : leads;

  const rows = ["phone,name", ...filtered.map((l) => `${csvField(l.phone.replace(/^\+/, ""))},${csvField(l.name)}`)];

  return new NextResponse(rows.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-export.csv"`,
    },
  });
}
