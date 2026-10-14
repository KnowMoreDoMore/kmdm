import { readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const ENDPOINT = "https://www.nationsreportcard.gov/NDEDataService/ChartHandler.aspx";
const OUTPUT = new URL("../data/state_naep_scores.json", import.meta.url);
const DIRECTORY = new URL("../data/states.json", import.meta.url);
const VERIFIED = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const CACHE_DIRECTORY = process.argv.find((value) => value.startsWith("--cache-dir="))?.slice("--cache-dir=".length);
const assessments = [
  { subject: "Mathematics", code: "MAT", grade: "4", cohort: "1", publication: "2024219", cache: "naep-mat4.json" },
  { subject: "Mathematics", code: "MAT", grade: "8", cohort: "2", publication: "2024219", cache: "naep-mat8.json" },
  { subject: "Reading", code: "RED", grade: "4", cohort: "1", publication: "2024220", cache: "naep-red4.json" },
  { subject: "Reading", code: "RED", grade: "8", cohort: "2", publication: "2024220", cache: "naep-red8.json" },
];

async function fetchTable(assessment) {
  const url = new URL(ENDPOINT);
  for (const [key, value] of Object.entries({ type: "sp_state_map_datatable", subject: assessment.code, cohort: assessment.cohort, year: "2024R3", wantse: "true", wantextdecplaces: "true" })) url.searchParams.set(key, value);
  const source = CACHE_DIRECTORY
    ? await readFile(`${CACHE_DIRECTORY}/${assessment.cache}`, "utf8")
    : (await execFileAsync("curl", ["-L", "--fail", "--compressed", "--max-time", "30", "-sS", "-A", "TeacherResourceExchange/1.0 (official NAEP state profile indexing)", url.toString()], { maxBuffer: 500_000 })).stdout;
  const document = JSON.parse(source);
  if (document.status !== 200) throw new Error(`NAEP data service returned status ${document.status}`);
  return document.result.StateMap_DataTableData.Statedata;
}

const directory = JSON.parse(await readFile(DIRECTORY, "utf8"));
const tables = await Promise.all(assessments.map(fetchTable));
const comparisonCodes = new Set([...directory.states.map((state) => state.abbreviation), "DC"]);
const comparisonLabel = { "▲": "Significantly higher than National public", "♦": "Not statistically different from National public", "▼": "Significantly lower than National public" };

const states = directory.states.map((state) => ({
  state: state.name,
  abbreviation: state.abbreviation,
  metrics: assessments.map((assessment, index) => {
    const rows = tables[index];
    const comparisonRows = rows.filter((row) => comparisonCodes.has(row.JurisdictionCode));
    const row = comparisonRows.find((candidate) => candidate.JurisdictionCode === state.abbreviation);
    const national = rows.find((candidate) => candidate.JurisdictionCode === "NP");
    if (!row || !national || comparisonRows.length !== 51) throw new Error(`Incomplete NAEP data for ${state.abbreviation} ${assessment.code} grade ${assessment.grade}`);
    const score = Number(row.MN_FP);
    const proficient = Number(row.AP_FP);
    return {
      subject: assessment.subject,
      grade: assessment.grade,
      score: Number(score.toFixed(0)),
      score_exact: Number(score.toFixed(2)),
      national_score: Number(Number(national.MN_FP).toFixed(0)),
      at_or_above_proficient: Number(proficient.toFixed(0)),
      national_comparison: comparisonLabel[row.SigSymbol],
      score_rank: 1 + comparisonRows.filter((candidate) => Number(candidate.MN_FP) > score).length,
      proficiency_rank: 1 + comparisonRows.filter((candidate) => Number(candidate.AP_FP) > proficient).length,
      comparison_count: comparisonRows.length,
      snapshot_url: `https://nces.ed.gov/nationsreportcard/subject/publications/stt2024/pdf/${assessment.publication}${state.abbreviation}${assessment.grade}.pdf`,
    };
  }),
}));

await writeFile(OUTPUT, `${JSON.stringify({
  as_of: VERIFIED,
  assessment: "NAEP 2024",
  source_url: "https://nces.ed.gov/nationsreportcard/state/default.aspx",
  data_service_url: ENDPOINT,
  methodology: "Competition positions calculated from unrounded estimates for the 50 states and District of Columbia. National public, DoDEA, and Puerto Rico are excluded. Positions do not account for sampling error and must be read with NAEP's statistical comparison.",
  states,
}, null, 2)}\n`);

console.log(JSON.stringify({ asOf: VERIFIED, states: states.length, metrics: states.reduce((sum, state) => sum + state.metrics.length, 0) }, null, 2));
