import { env } from "cloudflare:workers";
import { CRANE_MODELS, recommendCrane } from "../../../lib/cranes";
import { CONFIDENCE_OPTIONS, SCENARIOS } from "../../../lib/scenarios";

export const runtime = "edge";

const scenarioById = new Map(SCENARIOS.map((scenario) => [scenario.id, scenario]));
const allowedConfidence = new Set<string>(CONFIDENCE_OPTIONS);

async function ensureSchema() {
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS crane_selections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      evaluator TEXT NOT NULL,
      scenario_id TEXT NOT NULL,
      scenario_title TEXT NOT NULL,
      category TEXT NOT NULL,
      load_lb INTEGER NOT NULL,
      horizontal_ft INTEGER NOT NULL,
      vertical_ft INTEGER NOT NULL,
      selected_crane TEXT NOT NULL,
      baseline_crane TEXT NOT NULL,
      confidence TEXT NOT NULL,
      reasons TEXT NOT NULL,
      note TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_crane_selections_created_at ON crane_selections(created_at)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_crane_selections_scenario_id ON crane_selections(scenario_id)"),
    env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_crane_selections_session_scenario ON crane_selections(session_id, scenario_id)"),
  ]);
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  await ensureSchema();
  const url = new URL(request.url);

  if (url.searchParams.get("format") === "csv") {
    const { results } = await env.DB.prepare(`SELECT evaluator, scenario_title, category, load_lb,
      horizontal_ft, vertical_ft, selected_crane, baseline_crane, confidence, reasons, note, created_at
      FROM crane_selections ORDER BY created_at DESC LIMIT 5000`).all<Record<string, unknown>>();
    const columns = ["evaluator", "scenario_title", "category", "load_lb", "horizontal_ft", "vertical_ft", "selected_crane", "baseline_crane", "confidence", "reasons", "note", "created_at"];
    const csv = [columns.join(","), ...results.map((row) => columns.map((column) => csvCell(row[column])).join(","))].join("\n");
    return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=ac-crane-manager-selections.csv" } });
  }

  const totals = await env.DB.prepare("SELECT COUNT(*) AS count, COUNT(DISTINCT session_id) AS sessions FROM crane_selections").first<{ count: number; sessions: number }>();
  const { results: byCrane } = await env.DB.prepare("SELECT selected_crane AS model, COUNT(*) AS count FROM crane_selections GROUP BY selected_crane ORDER BY count DESC").all();
  return Response.json({ count: totals?.count ?? 0, sessions: totals?.sessions ?? 0, byCrane });
}

export async function POST(request: Request) {
  await ensureSchema();
  const body = await request.json() as Record<string, unknown>;
  const scenario = scenarioById.get(String(body.scenarioId ?? ""));
  const selectedCrane = String(body.selectedCrane ?? "");
  const evaluator = String(body.evaluator ?? "").trim().slice(0, 60);
  const sessionId = String(body.sessionId ?? "").slice(0, 80);
  const confidence = String(body.confidence ?? "");
  const reasons = Array.isArray(body.reasons) ? body.reasons.map(String).slice(0, 5) : [];
  const note = String(body.note ?? "").trim().slice(0, 300);

  if (!scenario || !CRANE_MODELS.has(selectedCrane) || !evaluator || !sessionId || !allowedConfidence.has(confidence)) {
    return Response.json({ error: "Please complete the reviewer, crane, and confidence fields." }, { status: 400 });
  }

  const baselineCrane = recommendCrane(scenario.loadLb, scenario.horizontalFt, scenario.verticalFt);
  const result = await env.DB.prepare(`INSERT OR IGNORE INTO crane_selections (
    session_id, evaluator, scenario_id, scenario_title, category, load_lb, horizontal_ft,
    vertical_ft, selected_crane, baseline_crane, confidence, reasons, note, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(sessionId, evaluator, scenario.id, scenario.title, scenario.category, scenario.loadLb,
      scenario.horizontalFt, scenario.verticalFt, selectedCrane, baselineCrane, confidence,
      reasons.join("|"), note, Date.now())
    .run();

  return Response.json({ ok: true, id: result.meta.last_row_id, baselineCrane });
}
