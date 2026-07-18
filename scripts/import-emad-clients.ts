// One-off import of Coach Emad's existing customer sheet (D:\داتا  .xlsx) into
// Client + Package. Dry-run by default; pass --commit to actually write.
import * as XLSX from "xlsx";
import { prisma } from "../src/lib/db";

const COMMIT = process.argv.includes("--commit");

function excelSerialToDate(serial: number): Date {
  // Excel's epoch is 1899-12-30 (to account for its fictitious 1900 leap day).
  return new Date(Date.UTC(1899, 11, 30) + serial * 86400 * 1000);
}

function normalizePhone(raw: number | string): string {
  const digits = String(raw).replace(/\D/g, "");
  const local = digits.startsWith("0") ? digits.slice(1) : digits;
  return `+966${local}`;
}

type Row = {
  name: string;
  phone: string;
  sessions: number;
  startDate: Date;
  expiryDate: Date;
  cost: number;
  notes: string | null;
  dateAnomaly: boolean;
};

async function main() {
  const wb = XLSX.readFile("D:/داتا  .xlsx");
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

  const rows: Row[] = raw
    .filter((r) => typeof r.__EMPTY === "number")
    .map((r) => {
      const startDate = excelSerialToDate(Number(r.__EMPTY_2));
      const expiryDate = excelSerialToDate(Number(r.__EMPTY_3));
      return {
        name: String(r.EMVOLT).trim(),
        phone: normalizePhone(r.__EMPTY as number),
        sessions: Number(r.__EMPTY_1),
        startDate,
        expiryDate,
        cost: Number(r.__EMPTY_4),
        notes: r.__EMPTY_5 ? String(r.__EMPTY_5) : null,
        dateAnomaly: expiryDate.getTime() < startDate.getTime(),
      };
    });

  const emad = await prisma.staff.findUnique({ where: { email: "emad44420@gmail.com" } });
  if (!emad) throw new Error("Emad's staff row not found.");

  console.log(`Coach: ${emad.name} (${emad.id})\n`);

  for (const row of rows) {
    const existingClient = await prisma.client.findFirst({ where: { phone: row.phone } });
    const existingLead = await prisma.lead.findFirst({
      where: { phone: row.phone },
      include: { convertedClient: true },
    });
    console.log(
      `${row.name} | ${row.phone} | ${row.sessions} sessions | ${row.startDate.toDateString()} -> ${row.expiryDate.toDateString()}${row.dateAnomaly ? "  <<< EXPIRY BEFORE START" : ""} | ${row.cost} SAR | notes=${row.notes ?? "-"}` +
        (existingClient ? `  [MATCHES EXISTING CLIENT ${existingClient.id} - ${existingClient.name}]` : "") +
        (existingLead ? `  [MATCHES EXISTING LEAD ${existingLead.id} - status ${existingLead.status}]` : "")
    );

    if (!COMMIT) continue;

    const client = await prisma.client.create({
      data: {
        name: row.name,
        phone: row.phone,
        section: "male",
        status: "active",
        assignedTrainerId: emad.id,
        convertedFromLeadId: existingLead && !existingLead.convertedClient ? existingLead.id : undefined,
      },
    });
    // The sheet has one row where expiry < start (likely the two date cells
    // were swapped) — order chronologically rather than write a negative
    // duration; flagged above for a human to confirm against the original.
    const [purchaseDate, expiryDate] = row.dateAnomaly
      ? [row.expiryDate, row.startDate]
      : [row.startDate, row.expiryDate];
    await prisma.package.create({
      data: {
        clientId: client.id,
        name: `${row.sessions} Sessions`,
        totalSessions: row.sessions,
        price: row.cost,
        purchaseDate,
        expiryDate,
      },
    });
    if (existingLead && existingLead.status !== "converted") {
      await prisma.lead.update({ where: { id: existingLead.id }, data: { status: "converted" } });
    }
  }

  console.log(COMMIT ? "\nCommitted." : "\nDry run only — pass --commit to write.");
  await prisma.$disconnect();
}

main();
