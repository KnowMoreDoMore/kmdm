import { readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const BASE_URL = "https://www.fisheries.noaa.gov";
const CATALOG_URL = `${BASE_URL}/resources/educational-materials`;
const OUTPUT = new URL("../data/noaa_fisheries_resources.json", import.meta.url);
const EXISTING = [
  new URL("../data/teacher_resources.json", import.meta.url),
  new URL("../data/nasa_stem_resources.json", import.meta.url),
  new URL("../data/loc_classroom_resources.json", import.meta.url),
];
const VERIFIED = "2026-09-26";

const FILTERS = {
  grades: {
    k_5: ["K–2", "3–5"],
    "6_8": ["6–8"],
    "9_12": ["9–12"],
    secondary: ["Postsecondary"],
    informal: [],
  },
  audiences: {
    educator: "Classroom teacher",
    students: "Student",
  },
  materials: {
    activity_game: "Activity / game",
    brochure: "Brochure / book / fact sheet",
    curriculum: "Curriculum / lesson plan",
    miscellaneous: "Other educational material",
    poster: "Poster / sign",
    presentation: "Presentation",
    guide: "User guide",
    video: "Video",
  },
};

const unique = (values) => [...new Set(values.filter(Boolean))];
const normalizeUrl = (value) => value.replace(/[?#].*$/, "").replace(/\/$/, "").toLowerCase();
const decode = (value = "") => value
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&quot;/g, '"')
  .replace(/&apos;|&#039;/g, "’")
  .replace(/&ndash;/g, "–")
  .replace(/&mdash;/g, "—")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">");
const clean = (value = "") => decode(value.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();

async function getText(url, options = {}) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const { stdout } = await execFileAsync("curl", ["-L", "--fail", "--max-time", "30", "-sS", "-A", "Mozilla/5.0", String(url)], { maxBuffer: 2_000_000, ...options });
      return stdout;
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  throw lastError;
}

function parseItems(html) {
  const records = [];
  const blocks = html.split('<div class="vertical-list__item">').slice(1);
  for (const block of blocks) {
    const titleMatch = block.match(/<h3 class="teaser__title">\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!titleMatch || !titleMatch[1].startsWith("/resource/educational-materials/")) continue;
    const summaryMatch = block.match(/<div class="teaser__summary">([\s\S]*?)<\/div>/i);
    const regions = [...block.matchAll(/<span class="region_label_nc-gray">([\s\S]*?)<\/span>/gi)].map((match) => clean(match[1]));
    records.push({
      url: new URL(titleMatch[1], BASE_URL).toString(),
      title: clean(titleMatch[2]),
      summary: clean(summaryMatch?.[1] || ""),
      regions: unique(regions),
    });
  }
  return records;
}

function parseCount(html, url) {
  const match = html.match(/<strong>([\d,]+)<\/strong> resources? match(?:es)?/i);
  if (/No resources match your filter criteria/i.test(html)) return 0;
  if (!match) throw new Error(`NOAA Fisheries catalog did not report a result count: ${url}`);
  return Number(match[1].replace(/,/g, ""));
}

async function fetchCatalog(query = {}) {
  const firstUrl = new URL(CATALOG_URL);
  for (const [key, value] of Object.entries(query)) firstUrl.searchParams.set(key, value);
  firstUrl.searchParams.set("page", "0");
  const firstHtml = await getText(firstUrl);
  const expected = parseCount(firstHtml, firstUrl);
  const items = parseItems(firstHtml);
  const pages = Math.ceil(expected / 10);
  const rest = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, async (_, index) => {
    const page = index + 1;
    const url = new URL(firstUrl);
    url.searchParams.set("page", String(page));
    return parseItems(await getText(url));
  }));
  items.push(...rest.flat());
  const byUrl = new Map(items.map((item) => [normalizeUrl(item.url), item]));
  if (byUrl.size !== expected) throw new Error(`Incomplete NOAA Fisheries catalog response: expected ${expected}, found ${byUrl.size}.`);
  return [...byUrl.values()];
}

async function membership(parameter, values) {
  const result = new Map();
  const catalogs = await Promise.all(Object.keys(values).map(async (value) => ({
    value,
    items: await fetchCatalog({ [`${parameter}[${value}]`]: value }),
  })));
  for (const { value, items } of catalogs) {
    for (const item of items) {
      const key = normalizeUrl(item.url);
      if (!result.has(key)) result.set(key, []);
      result.get(key).push(value);
    }
  }
  return result;
}

function subjectsFor(text) {
  const subjects = [];
  if (/ocean|marine|fish|whale|dolphin|seal|turtle|shark|salmon|coral|habitat|ecosystem|species|biology|ecology|climate|watershed|water quality|aquaculture|seafood|science/i.test(text)) subjects.push("Science");
  if (/history|culture|community|indigenous|policy|law|management|geograph|econom/i.test(text)) subjects.push("Social studies");
  if (/book|story|reading|literacy|vocabulary|brochure|fact sheet/i.test(text)) subjects.push("ELA & literacy");
  if (/math|measure|graph|data/i.test(text)) subjects.push("Mathematics");
  if (/engineer|technology|design|build/i.test(text)) subjects.push("Engineering & design");
  if (/nutrition|health|food safety/i.test(text)) subjects.push("Health");
  return unique(subjects.length ? subjects : ["Science"]);
}

function topicsFor(text, regions) {
  const rules = [
    [/ocean|sea\b|coast/i, "Ocean and coastal science"],
    [/marine|fish|whale|dolphin|seal|turtle|shark|salmon|coral/i, "Marine life"],
    [/fisher|seafood/i, "Fisheries and seafood"],
    [/habitat|ecosystem|ecology|food web/i, "Habitats and ecosystems"],
    [/conserv|protect|steward|debris|pollution/i, "Conservation"],
    [/climate|warming|sea level/i, "Climate"],
    [/watershed|water quality|river|stream/i, "Watersheds"],
    [/aquaculture/i, "Aquaculture"],
    [/endangered|threatened|protected species/i, "Endangered species"],
    [/data|graph|mapping|survey|monitor/i, "Data literacy"],
    [/career|scientist|researcher/i, "STEM careers"],
    [/indigenous|tribal|native/i, "Indigenous knowledge"],
  ];
  return unique([...rules.filter(([pattern]) => pattern.test(text)).map(([, topic]) => topic), ...regions]).slice(0, 8);
}

function resourceType(materials) {
  if (materials.includes("curriculum")) return "Curriculum / unit";
  if (materials.includes("activity_game")) return "Lesson / activity";
  if (materials.includes("video")) return "Video";
  if (materials.includes("presentation")) return "Presentation";
  if (materials.includes("poster")) return "Poster / printable";
  if (materials.includes("brochure")) return "Guide / printable";
  if (materials.includes("guide")) return "Educator guide";
  return "Classroom resource";
}

function formatsFor(materials) {
  const formats = ["Web page"];
  if (materials.some((value) => ["curriculum", "activity_game", "brochure", "poster", "guide"].includes(value))) formats.push("PDF / printable");
  if (materials.includes("video")) formats.push("Video");
  if (materials.includes("presentation")) formats.push("Slides / presentation");
  return unique(formats);
}

const existingDocuments = await Promise.all(EXISTING.map(async (file) => JSON.parse(await readFile(file, "utf8"))));
const existingRecords = existingDocuments.flatMap((document) => document.records || []);
const existingUrls = new Set(existingRecords.map((record) => normalizeUrl(record.url)));
const existingTitles = new Set(existingRecords.map((record) => `${record.provider.toLowerCase()}::${record.title.toLowerCase()}`));

const catalog = await fetchCatalog();
const [gradeMembership, audienceMembership, materialMembership] = await Promise.all([
  membership("field_grade_outreach_edu_value", FILTERS.grades),
  membership("field_audience_outreach_edu_value", FILTERS.audiences),
  membership("field_category_outreach_edu_value", FILTERS.materials),
]);
const records = catalog.flatMap((item) => {
  const key = normalizeUrl(item.url);
  const duplicateTitle = existingTitles.has(`noaa fisheries::${item.title.toLowerCase()}`);
  if (existingUrls.has(key) || duplicateTitle) return [];
  const gradeKeys = gradeMembership.get(key) || [];
  const audienceKeys = audienceMembership.get(key) || [];
  const materialKeys = materialMembership.get(key) || [];
  const text = `${item.title} ${item.summary}`;
  const type = resourceType(materialKeys);
  const isActivity = ["Lesson / activity", "Curriculum / unit"].includes(type);
  const topics = topicsFor(text, item.regions);
  return [{
    id: `noaa-fisheries-${new URL(item.url).pathname.split("/").filter(Boolean).at(-1)}`,
    title: item.title,
    provider: "NOAA Fisheries",
    sourceType: "Federal agency",
    category: "Teach",
    audience: unique(["Classroom teacher", ...audienceKeys.map((value) => FILTERS.audiences[value])]),
    gradeBands: unique(gradeKeys.flatMap((value) => FILTERS.grades[value])),
    subjects: subjectsFor(text),
    topics: topics.length ? topics : ["Ocean and coastal science"],
    resourceType: type,
    summary: item.summary || "Official NOAA Fisheries educational material for classroom or informal learning.",
    implementationStyle: isActivity ? ["Teacher-led", "Hands-on"] : type === "Video" ? ["Media-rich", "Teacher-led"] : ["Teacher-led"],
    time: "Flexible; see the official resource",
    timeBucket: "Flexible / varies",
    prep: isActivity ? "Varies by activity" : "Light prep",
    standards: [],
    standardsNote: "NOAA Fisheries supplies grade and material-type metadata; no formal standards alignment is claimed unless the individual resource states one.",
    cost: "Free",
    access: "No account needed to view the official resource",
    formats: formatsFor(materialKeys),
    materials: isActivity ? "Materials vary by activity; see the official resource" : `Official ${FILTERS.materials[materialKeys[0]]?.toLowerCase() || "educational material"}`,
    availability: "Nationwide",
    url: item.url,
    verified: VERIFIED,
    featured: false,
    readyTomorrow: type === "Video" || type === "Poster / printable" || type === "Guide / printable",
  }];
});

records.sort((a, b) => a.title.localeCompare(b.title));
await writeFile(OUTPUT, `${JSON.stringify({
  as_of: VERIFIED,
  provider: "NOAA Fisheries",
  source_url: CATALOG_URL,
  official_result_count: catalog.length,
  verification: "Each record appeared in NOAA Fisheries' live official catalog; destination links are current NOAA.gov item URLs supplied by that catalog.",
  records,
}, null, 2)}\n`);

console.log(JSON.stringify({
  officialItems: catalog.length,
  imported: records.length,
  duplicatesSkipped: catalog.length - records.length,
  grades: Object.fromEntries(Object.keys(FILTERS.grades).map((value) => [value, [...gradeMembership.values()].filter((members) => members.includes(value)).length])),
  materialTypes: Object.fromEntries(Object.keys(FILTERS.materials).map((value) => [value, [...materialMembership.values()].filter((members) => members.includes(value)).length])),
}));
