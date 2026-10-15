# KMDM websites

Independent Cloudflare Workers hosting. Source: ReedNomura/kmdm.

| Site | Source directory | Worker | Planned custom address |
|---|---|---|---|
| Project directory | apps/home | kmdm-home | kmdm.org |
| AI Commons DMV | apps/ai-commons-dmv | kmdm-ai-commons | ai.kmdm.org |
| Teacher Resource Exchange | apps/teacher-resource-exchange | kmdm-teachers | teachers.kmdm.org |
| NOVA STEM Leadership Hub | apps/nova-stem-leadership-hub | kmdm-stem | stem.kmdm.org |
| AC Crane Choice Lab | apps/ac-crane-choice-lab | kmdm-cranelab | cranelab.kmdm.org |
| AC Crane Finder | apps/ac-crane-finder | kmdm-cranes | cranes.kmdm.org |

## Live directory

https://kmdm-home.reednomura-kmdm.workers.dev/

All five projects and the directory are independently hosted and public. Every homepage and representative framework JavaScript/CSS assets returned HTTP 200 after deployment.

## Publishing edits

Cloudflare Workers Builds is connected to this repository. Each Worker watches its matching app folder on main. Publishing changes to that folder triggers its deployment automatically.

Framework build command: `pnpm run build`.
Framework deploy command: `pnpm exec wrangler deploy --config dist/server/wrangler.json`.

AI Commons build command: `node scripts/render.mjs && node scripts/test-pages.mjs && node scripts/test-news.mjs`.
Directory build command: `node --check index.js`.
AI Commons and directory deploy command: `node scripts/deploy.mjs`.

Cloudflare manages the build authorization. Never commit credentials.

## Domain connection

Custom addresses are pending. Squarespace remains the registrar and currently controls DNS. Review the full existing DNS record list, preserve Google email records, and account for the existing DNSSEC delegation before changing nameservers.

## Data

Teacher Resource Exchange and Crane Choice Lab use separate D1 databases in the independent Cloudflare account. Their original Sites tables were empty when inspected on October 14, 2026; matching schemas were recreated. No submitted user data or credentials are included in this repository.
