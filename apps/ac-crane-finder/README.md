# ac-crane-finder

Independent Cloudflare Workers deployment.

Install: `pnpm install --frozen-lockfile`

Build: `pnpm build`

Deploy: `pnpm deploy` (requires Cloudflare authorization).

Worker settings are in `cloudflare-worker.json`; Vite generates `dist/server/wrangler.json` during the build. GPT Sites authentication and deployment plugins have been removed.
