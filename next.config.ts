import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // InBody result uploads (src/lib/actions/inbody.ts) allow files up to 4.5MB;
    // Next's default Server Action body limit is 1MB, which rejects those uploads
    // before the action's own size check ever runs.
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
