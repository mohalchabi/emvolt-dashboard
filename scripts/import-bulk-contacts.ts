// Bulk contact list -> Lead import (e.g. a purchased/scraped contact sheet,
// as opposed to scripts/import-leads.ts which handles the studio's own
// intake sheet with real source/status/caller columns).
//
// Usage:
//   npx tsx scripts/import-bulk-contacts.ts <path/to/file.xlsx>              (dry run — reports only)
//   npx tsx scripts/import-bulk-contacts.ts <path/to/file.xlsx> --commit     (actually inserts)
//
// Expected columns (by position, header row required): fname_e, lname_e,
// sex, birth_dt, city, mobile. sex/city are ignored — in practice they've
// been observed as a near-constant, non-discriminating value across the
// whole sheet, not a real per-row signal. Gender is instead guessed from
// the first name via src/lib/gender-guess.ts, same heuristic the Leads
// admin filter uses.
import "dotenv/config";
import path from "node:path";
import XLSX from "xlsx";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { guessGender } from "../src/lib/gender-guess";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Same normalization as scripts/import-leads.ts: Saudi mobiles arrive as
// 05XXXXXXXX, 5XXXXXXXX, +9665XXXXXXXX, 9665XXXXXXXX (Excel often strips a
// leading 0 by storing the cell as a number) — normalize to +966XXXXXXXXX
// or reject if it doesn't resolve to a 9-digit Saudi mobile shape.
function normalizePhone(raw: string): string | null {
  let d = raw.replace(/[^\d]/g, "");
  if (!d) return null;
  if (d.startsWith("00966")) d = d.slice(5);
  else if (d.startsWith("966")) d = d.slice(3);
  else if (d.startsWith("0")) d = d.slice(1);
  if (!/^5\d{8}$/.test(d)) return null;
  return `+966${d}`;
}

function titleCase(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

type ParsedRow = {
  name: string;
  phone: string;
  section: "male" | "female" | null;
};

async function main() {
  const args = process.argv.slice(2);
  const commit = args.includes("--commit");
  const filePath = args.find((a) => !a.startsWith("--"));
  if (!filePath) {
    console.error("Usage: npx tsx scripts/import-bulk-contacts.ts <file.xlsx> [--commit]");
    process.exit(1);
  }

  const wb = XLSX.readFile(path.resolve(filePath));
  const sheetName = wb.SheetNames[0];
  const rows: string[][] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
    header: 1,
    defval: "",
  });
  const [header, ...dataRows] = rows;
  console.log(`Source: ${filePath} (sheet "${sheetName}")`);
  console.log(`Header: ${JSON.stringify(header)}`);
  console.log(`Parsed ${dataRows.length} data row(s).\n`);

  const [existingLeadPhones, existingClientPhones] = await Promise.all([
    prisma.lead.findMany({ select: { phone: true } }).then((r) => new Set(r.map((x) => x.phone))),
    prisma.client.findMany({ select: { phone: true } }).then((r) => new Set(r.map((x) => x.phone))),
  ]);

  const toImport: ParsedRow[] = [];
  const seenInFile = new Set<string>();
  let dupFile = 0;
  let dupLead = 0;
  let dupClient = 0;
  let missingName = 0;
  let missingPhone = 0;
  let needsSectionReview = 0;

  for (const r of dataRows) {
    const fname = String(r[0] ?? "").trim();
    const lname = String(r[1] ?? "").trim();
    const mobileRaw = String(r[5] ?? "").trim();

    if (!fname && !lname) {
      missingName++;
      continue;
    }
    const name = titleCase(`${fname} ${lname}`.trim());

    const phone = normalizePhone(mobileRaw);
    if (!phone) {
      missingPhone++;
      continue;
    }

    if (seenInFile.has(phone)) {
      dupFile++;
      continue;
    }
    if (existingLeadPhones.has(phone)) {
      dupLead++;
      continue;
    }
    if (existingClientPhones.has(phone)) {
      dupClient++;
      continue;
    }
    seenInFile.add(phone);

    const guessed = guessGender(name);
    const section = guessed === "unknown" ? null : guessed;
    if (!section) needsSectionReview++;

    toImport.push({ name, phone, section });
  }

  console.log(`Ready to import: ${toImport.length}`);
  console.log(`  of which needs section review (gender not recognized): ${needsSectionReview}`);
  toImport
    .slice(0, 15)
    .forEach((l) => console.log(`  + ${l.name} (${l.phone}) — section: ${l.section ?? "unset"}`));
  if (toImport.length > 15) console.log(`  ... and ${toImport.length - 15} more`);

  console.log(`\nSkipped — missing name: ${missingName}`);
  console.log(`Skipped — missing/invalid phone: ${missingPhone}`);
  console.log(`Skipped — duplicate within file: ${dupFile}`);
  console.log(`Skipped — duplicate of existing lead: ${dupLead}`);
  console.log(`Skipped — duplicate of existing client: ${dupClient}`);

  if (!commit) {
    console.log("\nDry run only — no changes made. Re-run with --commit to import.");
    return;
  }

  const systemAuthor = await prisma.staff.findFirst({ where: { role: "admin", active: true } });
  if (!systemAuthor) throw new Error("No active admin found to attribute import activity to.");

  let created = 0;
  for (const lead of toImport) {
    const row = await prisma.lead.create({
      data: {
        name: lead.name,
        phone: lead.phone,
        section: lead.section,
        source: "bulk_import",
        interestedIn: "ems",
        status: "new",
      },
    });
    await prisma.activityLog.create({
      data: {
        leadId: row.id,
        authorId: systemAuthor.id,
        text: "Imported from bulk contact list.",
      },
    });
    created++;
    if (created % 500 === 0) console.log(`  ...${created} imported`);
  }
  console.log(`\nImported ${created} lead(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
