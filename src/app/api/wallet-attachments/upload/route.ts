import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/auth";
import {
  WALLET_UPLOAD_CONTENT_TYPES,
  WALLET_UPLOAD_MAX_BYTES,
  isWalletEntryKind,
  walletUploadPrefix,
} from "@/lib/wallet-uploads";

/**
 * Issues the short-lived token the browser uses to upload wallet paperwork
 * straight to Blob storage.
 *
 * The token is the whole of the authority granted, so everything that
 * constrains it is decided here and not in the browser: who may have one, what
 * content types it accepts, how large the file may be, and which key prefix it
 * may write to. A caller who tampers with any of those gets a token that
 * won't work for what they asked.
 *
 * `requireRole` isn't used because it answers with a redirect, which is the
 * wrong reply to a fetch expecting JSON.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const json = await handleUpload({
      body,
      request,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const session = await auth();
        // The ledger's paperwork is the owner's, as it was before.
        if (session?.user?.role !== "admin") throw new Error("Not allowed.");

        let parsed: unknown;
        try {
          parsed = clientPayload ? JSON.parse(clientPayload) : null;
        } catch {
          throw new Error("Bad upload request.");
        }
        const claim = parsed as { kind?: unknown; entryId?: unknown } | null;
        if (!claim || !isWalletEntryKind(claim.kind) || typeof claim.entryId !== "string") {
          throw new Error("Bad upload request.");
        }

        // Pin the key to the entry it claims to belong to, so a token issued
        // for one entry can't be spent writing over another one's paperwork.
        const prefix = walletUploadPrefix(claim.kind, claim.entryId);
        if (!pathname.startsWith(prefix)) throw new Error("Bad upload path.");

        return {
          allowedContentTypes: WALLET_UPLOAD_CONTENT_TYPES,
          maximumSizeInBytes: WALLET_UPLOAD_MAX_BYTES,
          addRandomSuffix: true,
        };
      },
    });

    return NextResponse.json(json);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed." },
      { status: 400 }
    );
  }
}
