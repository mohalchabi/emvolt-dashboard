/**
 * Wallet paperwork goes to Blob storage straight from the browser.
 *
 * Sending it through a Server Action instead meant the bytes rode inside the
 * function's request body, and Vercel caps that at 4.5 MB for the whole
 * request. A phone scan of a multi-page invoice passes that easily, and the
 * rejection happens at the platform before any of our code runs, so the
 * browser gets an unparseable response rather than a message anyone can act
 * on. Uploading direct to Blob skips the function entirely.
 *
 * Deliberately free of server-only imports: the browser needs these values to
 * check a file before it starts, and the route needs the same ones to decide
 * what token to issue.
 */

export type WalletEntryKind = "deposit" | "transaction" | "petty_cash_expense";

const FOLDERS: Record<WalletEntryKind, string> = {
  deposit: "deposits",
  transaction: "payments",
  petty_cash_expense: "petty-cash",
};

export function isWalletEntryKind(value: unknown): value is WalletEntryKind {
  return typeof value === "string" && value in FOLDERS;
}

/** Blob keys an entry's paperwork is allowed to occupy. */
export function walletUploadPrefix(kind: WalletEntryKind, entryId: string): string {
  return `wallet/${FOLDERS[kind]}/${entryId}/`;
}

/** Generous, since it no longer has to fit in a function request. */
export const WALLET_UPLOAD_MAX_BYTES = 25 * 1024 * 1024;

/**
 * The cap for paperwork attached while an entry is still being created, which
 * does still ride inside the Server Action body.
 *
 * Well under Vercel's 4.5 MB request ceiling on purpose: the limit applies to
 * the raw body, so multipart boundaries, part headers and the form's own
 * fields all count against it. A file sized right at the ceiling puts the
 * request over it, and the platform rejects it before any code can explain
 * why. Anything larger goes on afterwards through the documents dialog.
 */
export const WALLET_INLINE_UPLOAD_MAX_BYTES = 4 * 1024 * 1024;

export const WALLET_UPLOAD_CONTENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
];

export function isAllowedWalletUploadType(type: string): boolean {
  return WALLET_UPLOAD_CONTENT_TYPES.includes(type);
}

/** `4.6 MB`, for telling someone exactly how far over they are. */
export function formatBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * What's wrong with the files on a create-entry form, or null if nothing is.
 *
 * Run in the browser before submitting, so an oversized batch is named and
 * measured instead of being sent and refused by the platform with a message
 * nobody can act on.
 */
export function inlineUploadProblem(formData: FormData): string | null {
  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  let total = 0;
  for (const file of files) {
    if (file.type && !isAllowedWalletUploadType(file.type)) {
      return `"${file.name}" isn't a PDF or an image.`;
    }
    total += file.size;
  }

  if (total > WALLET_INLINE_UPLOAD_MAX_BYTES) {
    return `That paperwork comes to ${formatBytes(total)}, and only ${formatBytes(
      WALLET_INLINE_UPLOAD_MAX_BYTES
    )} can go on while you're creating the entry. Save it first, then add the files from the + button on the row.`;
  }
  return null;
}

/** Strips anything that would make a blob key awkward to read or route. */
export function safeUploadName(fileName: string): string {
  return fileName.replace(/[^\w.-]+/g, "_").slice(-120) || "document";
}
