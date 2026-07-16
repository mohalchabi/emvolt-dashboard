// Google Sheet -> Lead import.
//
// Usage:
//   npx tsx scripts/import-leads.ts [path/to/file.csv]              (dry run — reports only)
//   npx tsx scripts/import-leads.ts [path/to/file.csv] --commit     (actually inserts)
//
// Defaults to scripts/sample-messy-leads.csv when no path is given, so the
// script is safe to run and inspect before the owner's real sheet arrives.
//
// Column names are resolved by alias, so this handles both a tidy
// (name, phone, source, section, interested_in, status) sheet and EmVolt's
// real intake sheet (Name, Contact Number, Date, Source, first call, second
// call, third call, comments) without a separate code path.
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { LEAD_SOURCES, TRAINING_TYPES, LEAD_STATUSES } from "../src/lib/constants";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Minimal RFC4180-ish CSV parser: quoted fields, escaped "" quotes, commas
// and newlines inside quotes. Good enough for a Google Sheets CSV export
// without pulling in a dependency for it.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          value += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        value += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(value);
      value = "";
    } else if (c === "\r") {
      // skip
    } else if (c === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += c;
    }
  }
  if (value.length > 0 || row.length > 0) {
    row.push(value);
    rows.push(row);
  }
  return rows;
}

// Saudi mobile numbers arrive as 05XXXXXXXX, 5XXXXXXXX, +9665XXXXXXXX,
// 9665XXXXXXXX, with any mix of spaces/dashes — normalize to +966XXXXXXXXX
// or reject if it doesn't resolve to a 9-digit Saudi mobile number. Numbers
// that resolve to another country's shape (UAE, Egypt, India, ...) are
// rejected too — they show up in the invalid list for manual review rather
// than being silently mis-normalized.
function normalizePhone(raw: string): string | null {
  let d = raw.replace(/[^\d]/g, "");
  if (!d) return null;
  if (d.startsWith("00966")) d = d.slice(5);
  else if (d.startsWith("966")) d = d.slice(3);
  else if (d.startsWith("0")) d = d.slice(1);
  if (!/^5\d{8}$/.test(d)) return null;
  return `+966${d}`;
}

function normalizeSection(raw: string): "male" | "female" | null {
  const key = raw.trim().toLowerCase();
  if (key === "m" || key === "male") return "male";
  if (key === "f" || key === "female") return "female";
  return null;
}

const SOURCE_MAP: Record<string, string> = {
  "cal.com": "cal_com",
  calcom: "cal_com",
  instagram: "instagram",
  insta: "instagram",
  ig: "instagram",
  "walk in": "walk_in",
  walkin: "walk_in",
  "walk-in": "walk_in",
  referral: "referral",
  ref: "referral",
  whatsapp: "whatsapp",
  wa: "whatsapp",
};
function normalizeSource(raw: string): (typeof LEAD_SOURCES)[number] {
  const mapped = SOURCE_MAP[raw.trim().toLowerCase()];
  return (mapped as (typeof LEAD_SOURCES)[number]) ?? "other";
}

const INTEREST_MAP: Record<string, string> = { ems: "ems", pilates: "pilates", pt: "pt" };
function normalizeInterest(raw: string): (typeof TRAINING_TYPES)[number] {
  const mapped = INTEREST_MAP[raw.trim().toLowerCase()];
  return (mapped as (typeof TRAINING_TYPES)[number]) ?? "ems";
}

const STATUS_MAP: Record<string, string> = {
  new: "new",
  "new lead": "new",
  contacted: "contacted",
  "trial scheduled": "trial_scheduled",
  "trial completed": "trial_completed",
  converted: "converted",
  won: "converted",
  lost: "lost",
};
function normalizeStatus(raw: string): (typeof LEAD_STATUSES)[number] | null {
  const mapped = STATUS_MAP[raw.trim().toLowerCase()];
  return (mapped as (typeof LEAD_STATUSES)[number]) ?? null;
}

// Handles both "D-M-YYYY" (dash) and "M/D/YYYY" (slash) as seen in EmVolt's
// sheet — falls back to today when a date cell doesn't parse cleanly rather
// than blocking the row on it.
function parseLeadDate(raw: string): Date {
  const m = raw.trim().match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (!m) return new Date();
  const [, a, b, year] = m;
  const [day, month] = raw.includes("-") ? [Number(a), Number(b)] : [Number(b), Number(a)];
  const date = new Date(Number(year), month - 1, day);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function findColumn(header: string[], aliases: string[]) {
  return header.findIndex((h) => aliases.includes(h.trim().toLowerCase()));
}

type ParsedLead = {
  name: string;
  phone: string;
  section: "male" | "female" | null;
  source: (typeof LEAD_SOURCES)[number];
  interestedIn: (typeof TRAINING_TYPES)[number];
  status: (typeof LEAD_STATUSES)[number];
  createdAt: Date;
  importNote: string | null;
  assignedStaffId: string | null;
  assignedStaffName: string | null;
};

async function main() {
  const args = process.argv.slice(2);
  const commit = args.includes("--commit");
  const filePath = args.find((a) => !a.startsWith("--")) ?? path.join(__dirname, "sample-messy-leads.csv");

  const text = fs.readFileSync(filePath, "utf-8");
  const allRows = parseCsv(text).filter((r) => r.some((cell) => cell.trim() !== ""));
  const [header, ...dataRows] = allRows;
  const idx = {
    name: findColumn(header, ["name"]),
    phone: findColumn(header, ["phone", "contact number", "contact"]),
    date: findColumn(header, ["date"]),
    source: findColumn(header, ["source"]),
    section: findColumn(header, ["section"]),
    interestedIn: findColumn(header, ["interested_in", "interest"]),
    status: findColumn(header, ["status"]),
    firstCall: findColumn(header, ["first call"]),
    secondCall: findColumn(header, ["second call"]),
    thirdCall: findColumn(header, ["third call"]),
    comments: findColumn(header, ["comments"]),
  };

  const existingPhones = new Set(
    (await prisma.lead.findMany({ select: { phone: true } })).map((l) => l.phone)
  );
  const seenPhones = new Set<string>();

  // Match "first/second/third call" staff names against real Staff records
  // so leads already contacted in the sheet land assigned to the person who
  // actually made the call, instead of sitting unassigned.
  const allStaff = await prisma.staff.findMany();
  const staffByName = new Map(allStaff.map((s) => [s.name.trim().toLowerCase(), s]));

  const toImport: ParsedLead[] = [];
  const duplicates: string[] = [];
  const invalid: string[] = [];
  let needsSectionCount = 0;

  dataRows.forEach((r, i) => {
    const rowNum = i + 2; // +1 for header, +1 for 1-indexing
    const cell = (colIdx: number) => (colIdx >= 0 ? (r[colIdx] ?? "").trim() : "");

    const name = cell(idx.name);
    const phone = normalizePhone(cell(idx.phone));

    if (!name) {
      invalid.push(`row ${rowNum}: missing name`);
      return;
    }
    if (!phone) {
      invalid.push(`row ${rowNum} (${name}): invalid/missing phone ("${cell(idx.phone)}")`);
      return;
    }
    if (existingPhones.has(phone) || seenPhones.has(phone)) {
      duplicates.push(`row ${rowNum}: ${name} (${phone})`);
      return;
    }
    seenPhones.add(phone);

    const section = normalizeSection(cell(idx.section));
    if (!section) needsSectionCount++;

    const callers = [idx.firstCall, idx.secondCall, idx.thirdCall]
      .map((ci) => cell(ci))
      .filter(Boolean);
    const uniqueCallers = [...new Set(callers.map((c) => c.trim()))];

    const statusFromColumn = normalizeStatus(cell(idx.status));
    const status = statusFromColumn ?? (uniqueCallers.length > 0 ? "contacted" : "new");

    const matchedStaff = uniqueCallers
      .map((c) => staffByName.get(c.toLowerCase()))
      .find((s): s is (typeof allStaff)[number] => Boolean(s));

    const noteParts: string[] = [];
    if (uniqueCallers.length > 0) noteParts.push(`Contacted by ${uniqueCallers.join(", ")} (imported).`);
    const comments = cell(idx.comments);
    if (comments) noteParts.push(`Comments: ${comments}`);

    toImport.push({
      name,
      phone,
      section,
      source: normalizeSource(cell(idx.source)),
      interestedIn: normalizeInterest(cell(idx.interestedIn)),
      status,
      createdAt: idx.date >= 0 ? parseLeadDate(cell(idx.date)) : new Date(),
      importNote: noteParts.length > 0 ? noteParts.join(" ") : null,
      assignedStaffId: matchedStaff?.id ?? null,
      assignedStaffName: matchedStaff?.name ?? null,
    });
  });

  console.log(`Source: ${filePath}`);
  console.log(`Parsed ${dataRows.length} data row(s).\n`);
  const assignedCount = toImport.filter((l) => l.assignedStaffId).length;
  console.log(
    `Ready to import: ${toImport.length} (${needsSectionCount} need section review, ${assignedCount} auto-assigned by caller match)`
  );
  toImport
    .slice(0, 20)
    .forEach((l) =>
      console.log(
        `  + ${l.name} (${l.phone}) — ${l.source}/${l.section ?? "unset"}/${l.status}${l.assignedStaffName ? ` → ${l.assignedStaffName}` : ""}`
      )
    );
  if (toImport.length > 20) console.log(`  ... and ${toImport.length - 20} more`);
  console.log(`\nSkipped as duplicate: ${duplicates.length}`);
  duplicates.slice(0, 10).forEach((d) => console.log(`  - ${d}`));
  if (duplicates.length > 10) console.log(`  ... and ${duplicates.length - 10} more`);
  console.log(`\nSkipped as invalid: ${invalid.length}`);
  invalid.slice(0, 10).forEach((d) => console.log(`  ! ${d}`));
  if (invalid.length > 10) console.log(`  ... and ${invalid.length - 10} more`);

  if (!commit) {
    console.log("\nDry run only — no changes made. Re-run with --commit to import.");
    return;
  }

  const systemAuthor = await prisma.staff.findFirst({ where: { role: "admin", active: true } });
  if (!systemAuthor) throw new Error("No active admin found to attribute import activity to.");

  for (const lead of toImport) {
    const created = await prisma.lead.create({
      data: {
        name: lead.name,
        phone: lead.phone,
        section: lead.section,
        source: lead.source,
        interestedIn: lead.interestedIn,
        status: lead.status,
        createdAt: lead.createdAt,
        assignedStaffId: lead.assignedStaffId,
      },
    });
    const text = lead.importNote ?? "Imported from Google Sheet.";
    await prisma.activityLog.create({
      data: {
        leadId: created.id,
        authorId: lead.assignedStaffId ?? systemAuthor.id,
        text,
        createdAt: lead.createdAt,
      },
    });
  }
  console.log(`\nImported ${toImport.length} lead(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
