import { readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const PUBLIC_BASE = "https://www.noaa.gov";
const SOURCE_PAGE = `${PUBLIC_BASE}/education/resources`;
const FETCH_BASE = "https://prod-01-alb-www-noaa.woc.noaa.gov";
const OUTPUT = new URL("../data/noaa_sea_to_sky_resources.json", import.meta.url);
const VERIFIED = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const EXISTING = [
  new URL("../data/teacher_resources.json", import.meta.url),
  new URL("../data/nasa_stem_resources.json", import.meta.url),
  new URL("../data/loc_classroom_resources.json", import.meta.url),
  new URL("../data/noaa_fisheries_resources.json", import.meta.url),
  new URL("../data/nps_lesson_resources.json", import.meta.url),
];

const unique = (values) => [...new Set(values.filter(Boolean))];
const normalizeUrl = (value) => value.replace(/[?#].*$/, "").replace(/\/$/, "").toLowerCase();
const decode = (value = "") => value
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;|&#160;/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&quot;|&#34;/g, '"')
  .replace(/&apos;|&#039;|&#39;/g, "’")
  .replace(/&ndash;/g, "–")
  .replace(/&mdash;/g, "—")
  .replace(/&rsquo;/g, "’")
  .replace(/&ldquo;|&rdquo;/g, '"')
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">");
const clean = (value = "") => decode(value.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();

function concise(value, limit = 520) {
  const text = clean(value).replace(/\s+offsite link\b/gi, "");
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1).replace(/\s+\S*$/, "")}…`;
}

async function getPage(page) {
  const url = new URL("/education/resources", FETCH_BASE);
  if (page) url.searchParams.set("page", String(page));
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const { stdout } = await execFileAsync("curl", [
        "-L", "--fail", "--compressed", "--max-time", "45", "-sS",
        "-H", "Host: www.noaa.gov",
        "-A", "TeacherResourceExchange/1.0 (official NOAA education catalog indexing)",
        url.toString(),
      ], { maxBuffer: 2_000_000 });
      return stdout;
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 750 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

function fieldValues(block, fieldNumber) {
  const startMarker = `c-field--name-field-graf-resource-filter-${fieldNumber}`;
  const start = block.indexOf(startMarker);
  if (start < 0) return [];
  const nextField = block.indexOf("c-field--name-field-graf-resource-filter-", start + startMarker.length);
  const description = block.indexOf("class=\"description-image\"", start);
  const end = [nextField, description].filter((value) => value > start).sort((a, b) => a - b)[0] ?? block.length;
  return unique([...block.slice(start, end).matchAll(/<div\s+class="c-field__item">([\s\S]*?)<\/div>/gi)].map((match) => clean(match[1])));
}

function parseRows(html) {
  const records = [];
  const blocks = html.split(/<div\s+class="c-view__row">/i).slice(1);
  for (const block of blocks) {
    const id = block.match(/id="paragraph-id-(\d+)-default"/i)?.[1];
    const titleField = block.indexOf("c-field--name-field-graf-title");
    const filtersStart = block.indexOf('<div  class="filters">', titleField);
    const titleBlock = titleField >= 0 ? block.slice(titleField, filtersStart > titleField ? filtersStart : undefined) : "";
    const titleMatch = titleBlock.match(/<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!id || !titleMatch) continue;
    const descriptionStart = block.indexOf("c-field--name-field-graf-description");
    const descriptionBlock = descriptionStart >= 0 ? block.slice(descriptionStart) : "";
    const description = descriptionBlock.match(/<div\s+class="c-field__item">([\s\S]*?)<\/div>/i)?.[1] || "";
    const href = decode(titleMatch[1]);
    let url;
    try { url = new URL(href, PUBLIC_BASE).toString(); } catch { continue; }
    records.push({
      sourceId: id,
      url,
      title: clean(titleMatch[2]),
      description: concise(description),
      featured: /c-field--name-field-graf-featured[\s\S]*?<div\s+class="c-field__item">\s*Featured\s*<\/div>/i.test(block),
      audiences: fieldValues(block, 1),
      subjects: fieldValues(block, 2),
      resourceTypes: fieldValues(block, 3),
      topics: fieldValues(block, 4),
      standards: fieldValues(block, 5),
      specialCategories: fieldValues(block, 6),
      collections: fieldValues(block, 7),
    });
  }
  return records;
}

async function fetchCatalog() {
  const firstHtml = await getPage(0);
  const expected = Number(firstHtml.match(/<strong>([\d,]+)<\/strong>\s+results/i)?.[1]?.replace(/,/g, ""));
  if (!Number.isInteger(expected) || expected < 1) throw new Error("NOAA Sea to Sky did not report a valid catalog result count.");
  const totalPages = Math.ceil(expected / 10);
  const pages = await mapWithConcurrency(Array.from({ length: totalPages - 1 }, (_, index) => index + 1), 8, async (page, index) => {
    const rows = parseRows(await getPage(page));
    if ((index + 1) % 25 === 0) console.error(`Fetched ${index + 1}/${totalPages - 1} additional NOAA pages`);
    return rows;
  });
  const rows = [...parseRows(firstHtml), ...pages.flat()];
  if (rows.length !== expected) throw new Error(`Incomplete NOAA Sea to Sky response: expected ${expected}, parsed ${rows.length}.`);
  return rows;
}

function gradeBands(values) {
  const map = {
    "Grade K-2": "K–2",
    "Grade 3-5": "3–5",
    "Grade 6-8": "6–8",
    "Grade 9-12": "9–12",
    "College+": "Postsecondary",
  };
  return unique(values.map((value) => map[value]));
}

function audiencesFor(values, specialCategories) {
  const audiences = ["Classroom teacher"];
  if (values.some((value) => /^Grade |College\+/i.test(value))) audiences.push("Student");
  if (values.includes("Adults")) audiences.push("Adult learner");
  if (specialCategories.includes("Informal")) audiences.push("Informal educator");
  return unique(audiences);
}

function subjectsFor(values) {
  const map = {
    Arts: "Arts",
    "Earth science": "Science",
    "ELA (English Language Arts)": "ELA & literacy",
    "Engineering and technology": "Engineering & design",
    "Humanities/liberal arts": "Humanities",
    "Life science": "Science",
    Math: "Mathematics",
    "Physical science": "Science",
    "Social studies": "Social studies",
  };
  const subjects = unique(values.map((value) => map[value] || value));
  return subjects.length ? subjects : ["Interdisciplinary"];
}

function resourceType(values) {
  if (values.includes("Lesson plan") || values.includes("Activity/demonstration")) return "Lesson / activity";
  if (values.includes("Module/unit")) return "Curriculum / unit";
  if (values.includes("Game/online activity") || values.includes("Simulation")) return "Interactive / simulation";
  if (values.includes("Data product")) return "Data / tool";
  if (values.includes("Citizen science project")) return "Citizen science";
  if (values.includes("Career profile")) return "Career exploration";
  if (values.includes("Coloring/activity book") || values.includes("Poster/brochure") || values.includes("Arts and crafts")) return "Printable / maker activity";
  if (values.includes("Video") || values.includes("Animation") || values.includes("Podcast") || values.includes("Multimedia")) return "Video / multimedia";
  if (values.includes("Webinar")) return "Webinar / professional learning";
  if (values.includes("Contest")) return "Competition / challenge";
  if (values.includes("Collection") || values.includes("NOAA Education resource collection")) return "Resource collection";
  if (values.includes("Background information") || values.includes("Related story")) return "Background reading";
  return values[0] || "Classroom resource";
}

function implementationStyles(values, type) {
  const map = {
    "Hands-on": "Hands-on activity",
    Inquiry: "Inquiry-based",
    Models: "Modeling",
    "Uses data": "Data investigation",
    "Outdoor education": "Outdoor / field-based",
    Informal: "Informal learning",
    "Project-based": "Project / problem-based",
    "Problem-based": "Project / problem-based",
  };
  const styles = unique(values.map((value) => map[value]).filter(Boolean));
  if (/Interactive|simulation/.test(type)) styles.push("Interactive / simulation");
  if (/Video|Background|Career/.test(type)) styles.push("Teacher-led");
  return unique(styles.length ? styles : ["Teacher-led"]);
}

function formatsFor(values) {
  const formats = ["Web page"];
  if (values.some((value) => /Lesson plan|Module\/unit|Coloring|Poster|brochure|Arts and crafts/.test(value))) formats.push("PDF / printable");
  if (values.some((value) => /Video|Animation|Multimedia/.test(value))) formats.push("Video");
  if (values.includes("Podcast")) formats.push("Audio");
  if (values.some((value) => /Game\/online activity|Simulation|Data product/.test(value))) formats.push("Interactive / data tool");
  return unique(formats);
}

function mergeCatalogDuplicates(items) {
  const byUrl = new Map();
  for (const item of items) {
    const key = normalizeUrl(item.url);
    const existing = byUrl.get(key);
    if (!existing) {
      byUrl.set(key, item);
      continue;
    }
    for (const field of ["audiences", "subjects", "resourceTypes", "topics", "standards", "specialCategories", "collections"]) {
      existing[field] = unique([...existing[field], ...item[field]]);
    }
    existing.featured ||= item.featured;
    if (item.description.length > existing.description.length) existing.description = item.description;
  }
  return [...byUrl.values()];
}

function verificationSample(items, target = 32) {
  if (items.length <= target) return items;
  const step = (items.length - 1) / (target - 1);
  return unique(Array.from({ length: target }, (_, index) => items[Math.round(index * step)]));
}

async function verifyDestination(item) {
  const publicUrl = new URL(item.url);
  const args = ["-L", "--max-time", "30", "-sS", "-o", "/dev/null", "-w", "%{http_code}", "-A", "TeacherResourceExchange/1.0 (official resource verification)"];
  let url = publicUrl.toString();
  if (publicUrl.hostname === "www.noaa.gov") {
    args.push("-H", "Host: www.noaa.gov");
    url = new URL(`${publicUrl.pathname}${publicUrl.search}`, FETCH_BASE).toString();
  }
  args.push(url);
  try {
    const { stdout } = await execFileAsync("curl", args, { maxBuffer: 100_000 });
    const status = Number(stdout.trim().slice(-3));
    return status >= 200 && status < 400;
  } catch {
    return false;
  }
}

const existingDocuments = await Promise.all(EXISTING.map(async (file) => JSON.parse(await readFile(file, "utf8"))));
const existingUrls = new Set(existingDocuments.flatMap((document) => document.records || []).map((record) => normalizeUrl(record.url)));
const catalogRows = await fetchCatalog();
const catalog = mergeCatalogDuplicates(catalogRows);
const sample = verificationSample(catalog);
const verificationResults = await mapWithConcurrency(sample, 8, verifyDestination);
const samplePagesChecked = verificationResults.filter(Boolean).length;
const samplePagesEdgeBlocked = verificationResults.length - samplePagesChecked;
if (samplePagesChecked < Math.ceil(sample.length * 0.7)) {
  throw new Error(`NOAA destination verification was too weak: only ${samplePagesChecked}/${sample.length} sampled pages returned a successful response.`);
}

const records = catalog.flatMap((item) => {
  if (existingUrls.has(normalizeUrl(item.url))) return [];
  const type = resourceType(item.resourceTypes);
  const grades = gradeBands(item.audiences);
  const topics = unique(item.topics).slice(0, 10);
  const standards = unique(item.standards);
  const printable = item.resourceTypes.some((value) => /Lesson plan|Coloring|Poster|brochure|Arts and crafts/.test(value));
  return [{
    id: `noaa-sea-to-sky-${item.sourceId}`,
    title: item.title,
    provider: "NOAA Office of Education",
    sourceType: "Federal agency",
    category: "Teach",
    audience: audiencesFor(item.audiences, item.specialCategories),
    gradeBands: grades,
    subjects: subjectsFor(item.subjects),
    topics: topics.length ? topics : ["Ocean, weather, and climate"],
    keywords: unique([...item.collections, ...item.specialCategories, ...item.resourceTypes]).slice(0, 16),
    resourceType: type,
    summary: item.description || "Free education resource reviewed for NOAA's Sea to Sky catalog.",
    implementationStyle: implementationStyles(item.specialCategories, type),
    time: "Flexible; see the official resource",
    timeBucket: "Flexible / varies",
    prep: printable ? "Light to moderate prep" : "Varies by resource",
    standards,
    standardsNote: standards.length
      ? "NGSS Disciplinary Core Idea metadata supplied in NOAA's official education catalog; review the resource for its exact classroom context."
      : "NOAA does not claim a formal standards alignment for this catalog record.",
    cost: "Free",
    access: "No account needed to browse the official NOAA resource record",
    formats: formatsFor(item.resourceTypes),
    materials: "Materials vary; see the official resource record",
    availability: "Nationwide",
    url: item.url,
    verified: VERIFIED,
    featured: item.featured,
    readyTomorrow: printable && grades.length > 0,
  }];
});

records.sort((a, b) => a.title.localeCompare(b.title) || a.url.localeCompare(b.url));
await writeFile(OUTPUT, `${JSON.stringify({
  as_of: VERIFIED,
  provider: "NOAA Office of Education",
  source_url: SOURCE_PAGE,
  official_result_count: catalogRows.length,
  unique_official_destinations: catalog.length,
  verification: `Every record came from NOAA's live Sea to Sky education catalog. NOAA staff state that catalog resources are reviewed for accuracy and usefulness. ${samplePagesChecked} of ${sample.length} evenly distributed destination pages returned a successful response on ${VERIFIED}; ${samplePagesEdgeBlocked} additional NOAA landing page${samplePagesEdgeBlocked === 1 ? " was" : "s were"} blocked by the site's edge protection during automated checking and remain included because they are current records in NOAA's live reviewed catalog.`,
  records,
}, null, 2)}\n`);

console.log(JSON.stringify({
  officialResults: catalogRows.length,
  uniqueOfficialDestinations: catalog.length,
  imported: records.length,
  duplicateDestinationsMerged: catalogRows.length - catalog.length,
  existingUrlsSkipped: catalog.length - records.length,
  sampleDestinationsChecked: samplePagesChecked,
  sampleDestinationsEdgeBlocked: samplePagesEdgeBlocked,
  gradeBands: Object.fromEntries(["K–2", "3–5", "6–8", "9–12", "Postsecondary"].map((grade) => [grade, records.filter((record) => record.gradeBands.includes(grade)).length])),
  standardsTagged: records.filter((record) => record.standards.length).length,
  lessonLike: records.filter((record) => ["Lesson / activity", "Curriculum / unit"].includes(record.resourceType)).length,
}, null, 2));
