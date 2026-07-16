// Client scheduling sheet -> Client + Session import.
//
// Usage:
//   npx tsx scripts/import-client-schedule.ts <path/to/file.csv>              (dry run)
//   npx tsx scripts/import-client-schedule.ts <path/to/file.csv> --commit     (actually inserts)
//
// Sheet columns: Date, Client Name, Contact Number, attendance time, Coash
// (trainer), session (blank, or "Trial session"). The "attendance time"
// header means every row is a session that already happened, so every
// imported Session is created with status "completed".
//
// Assumption flagged for review: the sheet doesn't say EMS vs Pilates per
// session, so any row not marked "Trial session" is imported as type "ems"
// (EmVolt's flagship service) — correct this per-session afterward if any
// of these were actually Pilates.
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

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

// Client phones aren't rejected for being non-Saudi (unlike the lead
// importer) — a real client with a foreign number is legitimate. Just
// normalized to a clean +<digits> form.
function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  return `+${digits}`;
}

// "15-4-2026" = D-M-YYYY, consistently dash-separated in this sheet.
function parseDate(raw: string): Date | null {
  const m = raw.trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  return Number.isNaN(date.getTime()) ? null : date;
}

// "7:00 pm" / "9:30 am" -> {hour, minute} in 24h.
function parseTime(raw: string): { hour: number; minute: number } | null {
  const m = raw.trim().toLowerCase().match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = Number(m[2]);
  const period = m[3];
  if (period === "pm" && hour !== 12) hour += 12;
  if (period === "am" && hour === 12) hour = 0;
  return { hour, minute };
}

const COACH_MAP: Record<string, string> = {
  nermin: "Nermeen",
  nermeen: "Nermeen",
  amnah: "Amna",
  amna: "Amna",
};

type Row = {
  date: Date;
  clientName: string;
  phone: string;
  time: { hour: number; minute: number };
  coachRaw: string;
  isTrial: boolean;
};

async function main() {
  const args = process.argv.slice(2);
  const commit = args.includes("--commit");
  const filePath = args.find((a) => !a.startsWith("--"));
  if (!filePath) {
    console.error("Usage: npx tsx scripts/import-client-schedule.ts <path/to/file.csv> [--commit]");
    process.exit(1);
  }

  const text = fs.readFileSync(filePath, "utf-8");
  const allRows = parseCsv(text).filter((r) => r.some((cell) => cell.trim() !== ""));
  const [header, ...dataRows] = allRows;
  const idx = {
    date: header.findIndex((h) => h.trim().toLowerCase().startsWith("date")),
    name: header.findIndex((h) => h.trim().toLowerCase().startsWith("client name")),
    phone: header.findIndex((h) => h.trim().toLowerCase().startsWith("contact")),
    time: header.findIndex((h) => h.trim().toLowerCase().startsWith("attendance")),
    coach: header.findIndex((h) => h.trim().toLowerCase().startsWith("coa")),
    session: header.findIndex((h) => h.trim().toLowerCase().startsWith("session")),
  };

  const trainers = await prisma.staff.findMany({ where: { role: "trainer" } });
  const trainerByName = new Map(trainers.map((t) => [t.name.toLowerCase(), t]));

  const parsedRows: Row[] = [];
  const invalid: string[] = [];

  dataRows.forEach((r, i) => {
    const rowNum = i + 2;
    const cell = (ci: number) => (ci >= 0 ? (r[ci] ?? "").trim() : "");

    const clientName = cell(idx.name);
    const date = parseDate(cell(idx.date));
    const time = parseTime(cell(idx.time));
    const coachRaw = cell(idx.coach).toLowerCase();

    if (!clientName) return invalid.push(`row ${rowNum}: missing client name`);
    if (!date) return invalid.push(`row ${rowNum} (${clientName}): unparseable date "${cell(idx.date)}"`);
    if (!time) return invalid.push(`row ${rowNum} (${clientName}): unparseable time "${cell(idx.time)}"`);
    if (!COACH_MAP[coachRaw]) return invalid.push(`row ${rowNum} (${clientName}): unrecognized coach "${cell(idx.coach)}"`);

    parsedRows.push({
      date,
      clientName,
      phone: normalizePhone(cell(idx.phone)),
      time,
      coachRaw,
      isTrial: cell(idx.session).toLowerCase().includes("trial"),
    });
  });

  // Group by client name (not phone — two different clients in this sheet
  // share one phone number, so name is the reliable identity here).
  const byClient = new Map<string, Row[]>();
  for (const row of parsedRows) {
    const key = row.clientName.trim().toLowerCase();
    if (!byClient.has(key)) byClient.set(key, []);
    byClient.get(key)!.push(row);
  }

  const existingClients = await prisma.client.findMany({ select: { name: true } });
  const existingNames = new Set(existingClients.map((c) => c.name.trim().toLowerCase()));

  console.log(`Source: ${filePath}`);
  console.log(`Parsed ${dataRows.length} data row(s) into ${byClient.size} unique client(s).\n`);

  let totalSessions = 0;
  const clientPlans: {
    name: string;
    phone: string;
    trainerId: string;
    trainerName: string;
    sessions: Row[];
    isNew: boolean;
  }[] = [];

  for (const [key, rows] of byClient) {
    const sorted = [...rows].sort((a, b) => a.date.getTime() - b.date.getTime());
    const latest = sorted[sorted.length - 1];
    const trainer = trainerByName.get(COACH_MAP[latest.coachRaw].toLowerCase());
    if (!trainer) {
      invalid.push(`client ${latest.clientName}: no active trainer named ${COACH_MAP[latest.coachRaw]}`);
      continue;
    }
    clientPlans.push({
      name: latest.clientName.trim(),
      phone: latest.phone,
      trainerId: trainer.id,
      trainerName: trainer.name,
      sessions: sorted,
      isNew: !existingNames.has(key),
    });
    totalSessions += sorted.length;
  }

  clientPlans.forEach((c) => {
    console.log(
      `  ${c.isNew ? "+" : "~"} ${c.name} (${c.phone}) — trainer ${c.trainerName}, ${c.sessions.length} session(s)`
    );
  });
  console.log(`\nTotal sessions to create: ${totalSessions}`);
  console.log(`\nSkipped as invalid: ${invalid.length}`);
  invalid.forEach((d) => console.log(`  ! ${d}`));

  if (!commit) {
    console.log("\nDry run only — no changes made. Re-run with --commit to import.");
    return;
  }

  const systemAuthor = await prisma.staff.findFirst({ where: { role: "admin", active: true } });
  if (!systemAuthor) throw new Error("No active admin found to attribute import activity to.");

  for (const plan of clientPlans) {
    let client = await prisma.client.findFirst({
      where: { name: { equals: plan.name, mode: "insensitive" } },
    });
    if (!client) {
      client = await prisma.client.create({
        data: {
          name: plan.name,
          phone: plan.phone,
          section: "female",
          status: "active",
          assignedTrainerId: plan.trainerId,
        },
      });
      await prisma.activityLog.create({
        data: {
          clientId: client.id,
          authorId: systemAuthor.id,
          text: `Imported from scheduling sheet (${plan.sessions.length} past session(s)).`,
        },
      });
    } else {
      await prisma.client.update({ where: { id: client.id }, data: { assignedTrainerId: plan.trainerId } });
    }

    for (const session of plan.sessions) {
      const datetime = new Date(session.date);
      datetime.setHours(session.time.hour, session.time.minute, 0, 0);
      const trainer = trainerByName.get(COACH_MAP[session.coachRaw].toLowerCase())!;

      await prisma.session.create({
        data: {
          trainerId: trainer.id,
          type: session.isTrial ? "trial" : "ems",
          datetime,
          duration: 20,
          status: "completed",
          clientId: client.id,
        },
      });
    }
  }

  console.log(`\nImported ${clientPlans.length} client(s), ${totalSessions} session(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
