# KMDM websites

Independent Cloudflare Workers hosting for kmdm.org. Source lives in ReedNomura/kmdm.

| Site | Source directory | Worker | Planned address |
|---|---|---|---|
| AI Commons DMV | apps/ai-commons-dmv | kmdm-ai-commons | ai.kmdm.org |
| Teacher Resource Exchange | apps/teacher-resource-exchange | kmdm-teachers | teachers.kmdm.org |
| NOVA STEM Leadership Hub | apps/nova-stem-leadership-hub | kmdm-stem | stem.kmdm.org |
| AC Crane Choice Lab | apps/ac-crane-choice-lab | kmdm-cranelab | cranelab.kmdm.org |
| AC Crane Finder | apps/ac-crane-finder | kmdm-cranes | cranes.kmdm.org |

## Publishing edits

Each Worker connects to this repository through Cloudflare Workers Builds. Set its root directory to the matching app directory and production branch to main. Publish source changes to main to trigger deployment.

For framework sites, use build command `pnpm build` and deploy command `pnpm exec wrangler deploy --config dist/server/wrangler.json`. For AI Commons, use `node scripts/render.mjs && node scripts/test-pages.mjs && node scripts/test-news.mjs` and deploy command `node scripts/deploy.mjs`.

## Migration status

AI Commons is independently deployed. All four framework builds have passed. Custom domain activation and GitHub deployment connections are still being configured. The main kmdm.org directory page is not yet built.

## Data

Teacher Resource Exchange and Crane Choice Lab use separate D1 databases. Their original Sites tables were empty when inspected on October 14, 2026. The database schemas have been recreated in the independent Cloudflare account. No submitted user data or credentials are included in this repository.
