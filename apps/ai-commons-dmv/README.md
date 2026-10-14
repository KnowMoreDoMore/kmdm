# AI Commons DMV

Independent Cloudflare Worker. Build the generated pages with `node scripts/render.mjs`, then run `node scripts/test-pages.mjs` and `node scripts/test-news.mjs`.

Deploy with `node scripts/deploy.mjs`. Cloudflare Workers Builds supplies deployment authorization through CLOUDFLARE_API_TOKEN. Never commit that token.

The published source is generated from templates/, data/, and worker runtime modules. worker/index.js is generated and excluded from version control.
