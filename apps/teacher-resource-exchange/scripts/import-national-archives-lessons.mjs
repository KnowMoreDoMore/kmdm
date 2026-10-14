import { readFile, writeFile } from "node:fs/promises";

const BASE_URL = "https://www.archives.gov";
const SOURCE_PAGE = `${BASE_URL}/education/teaching-with-documents`;
const OUTPUT = new URL("../data/national_archives_lesson_resources.json", import.meta.url);
const VERIFIED = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "America/New_York",
}).format(new Date());
const ERA_INDEXES = [
  ["Revolution and the New Nation (1754–1820s)", "/education/lessons/revolution-new-nation.html"],
  ["Expansion and Reform (1801–1868)", "/education/lessons/expansion-reform.html"],
  ["Civil War and Reconstruction (1850–1877)", "/education/lessons/civil-war-reconstruction.html"],
  ["Development of the Industrial United States (1870–1900)", "/education/lessons/industrial-us.html"],
  ["Emergence of Modern America (1890–1930)", "/education/lessons/modern-america.html"],
  ["Great Depression and World War II (1929–1945)", "/education/lessons/depression-wwii.html"],
  ["Postwar United States (1945–early 1970s)", "/education/lessons/postwar-us.html"],
  ["Contemporary United States (1968–present)", "/education/lessons/contemporary-us.html"],
];
const EXISTING = [
  "teacher_resources.json",
  "nasa_stem_resources.json",
  "loc_classroom_resources.json",
  "noaa_fisheries_resources.json",
  "nps_lesson_resources.json",
  "noaa_sea_to_sky_resources.json",
  "smithsonian_learning_lab_resources.json",
].map((file) => new URL(`../data/${file}`, import.meta.url));

const unique = (values) => [...new Set(values.filter(Boolean))];
const normalizeUrl = (value) => value.replace(/[?#].*$/, "").replace(/\/$/, "").toLowerCase();
const decode = (value = "") => value
  .replace(/<[^>]*>/g, " ")
  .replace(/&nbsp;|&#160;/gi, " ")
  .replace(/&amp;|&#38;/gi, "&")
  .replace(/&quot;|&#34;/gi, '"')
  .replace(/&#0*39;|&apos;/gi, "’")
  .replace(/&ndash;|&#8211;/gi, "–")
  .replace(/&mdash;|&#8212;/gi, "—")
  .replace(/&hellip;|&#8230;/gi, "…")
  .replace(/&ldquo;|&rdquo;|&#8220;|&#8221;/gi, '"')
  .replace(/\s+/g, " ")
  .trim();

function concise(value, limit = 440) {
  const text = decode(value);
  if (text.length <= limit) return /[.!?…]["”']?$/.test(text) ? text : `${text}…`;
  return `${text.slice(0, limit - 1).replace(/\s+\S*$/, "")}…`;
}

async function fetchOfficial(url) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": "TeacherResourceExchange/1.0 (official federal education catalog indexing)" },
  });
  return { response, html: await response.text() };
}

function anchorLinks(html, baseUrl) {
  return [...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map((match) => ({
    url: new URL(match[1], baseUrl),
    title: decode(match[2]),
  }));
}

function metaDescription(html) {
  return decode(
    html.match(/<meta[^>]+name=["']description["'][^>]+content="([^"]*)"/i)?.[1]
    || html.match(/<meta[^>]+content="([^"]*)"[^>]+name=["']description["']/i)?.[1]
    || html.match(/<meta[^>]+name=["']description["'][^>]+content='([^']*)'/i)?.[1]
    || html.match(/<meta[^>]+content='([^']*)'[^>]+name=["']description["']/i)?.[1]
    || "",
  );
}

function pageText(html) {
  return decode(html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " "));
}

function subjectsFor(title, text) {
  const subjects = ["Social studies"];
  if (/letter|telegram|speech|address|petition|deposition|text|writ|read|literacy|narrative/i.test(text)) subjects.push("ELA & literacy");
  if (/photograph|poster|cartoon|sampler|art|draw|visual/i.test(text)) subjects.push("Arts");
  if (/patent|invention|telephone|electric lamp|cotton gin|technology|sputnik|nuclear|fallout/i.test(title)) subjects.push("Science", "Engineering & design");
  if (/census|data|tally|population|statistics/i.test(text)) subjects.push("Mathematics");
  return unique(subjects);
}

function topicsFor(title, text, era) {
  const rules = [
    [/constitution|congress|election|president|veto|government|suffrage|amendment|watergate|civil rights act/i, "Civics"],
    [/civil rights|segregation|equal rights|discrimination|brown v\.? board|rosa parks|martin luther king/i, "Civil rights"],
    [/slav|abolition|fugitive|amistad|freedmen/i, "Slavery and emancipation"],
    [/immigra|chinese boycott|migration/i, "Immigration and migration"],
    [/native|indian|sioux|navajo|tribal/i, "Indigenous history"],
    [/war|military|navy|army|infantry|d-day|vietnam|korean conflict|blockade/i, "Military history"],
    [/women|woman|suffrage|amelia bloomer/i, "Women's history"],
    [/labor|industrial|railroad|homestead|world's columbian|child labor/i, "Industry and labor"],
    [/photograph|poster|cartoon|sampler|visual/i, "Visual literacy"],
    [/treaty|diploma|international|israel|peace corps/i, "International relations"],
    [/census|electoral tally|data|population/i, "Data literacy"],
  ];
  const topics = rules.filter(([pattern]) => pattern.test(text)).map(([, topic]) => topic);
  if (/patent|invention|telephone|electric lamp|cotton gin|sputnik/i.test(title)) topics.push("Invention and technology");
  return unique(["Primary sources", "U.S. history", era, ...topics]).slice(0, 8);
}

function gradeBandsFor(text) {
  const bands = [];
  if (/grades?\s+k\s*[–-]\s*4|grades?\s+k\s+through\s+4/i.test(text)) bands.push("K–2", "3–5");
  if (/grades?\s+(?:4|5)\s*(?:[–-]|through)\s*12/i.test(text)) bands.push("3–5", "6–8", "9–12");
  return unique(bands.length ? bands : ["6–8", "9–12"]);
}

function implementationStyles(text) {
  const styles = ["Primary-source analysis", "Inquiry-based"];
  if (/discuss|debate|seminar|reflect/i.test(text)) styles.push("Discussion / seminar");
  if (/group|team|partner|collaborat/i.test(text)) styles.push("Collaborative learning");
  if (/role.?play|simulation|mock/i.test(text)) styles.push("Simulation / role play");
  if (/map|data|census|tally|chart|graph/i.test(text)) styles.push("Data investigation");
  return unique(styles).slice(0, 4);
}

function slugFor(url) {
  return new URL(url).pathname.split("/").filter(Boolean).at(-1).replace(/\.html$/, "");
}

const existingDocuments = await Promise.all(EXISTING.map(async (file) => JSON.parse(await readFile(file, "utf8"))));
const existingUrls = new Set(existingDocuments.flatMap((document) => document.records || []).map((record) => normalizeUrl(record.url)));
const indexPaths = new Set(ERA_INDEXES.map(([, path]) => path));
const candidates = [];

for (const [era, path] of ERA_INDEXES) {
  const indexUrl = new URL(path, BASE_URL).toString();
  const { response, html } = await fetchOfficial(indexUrl);
  if (!response.ok) throw new Error(`National Archives era index failed (${response.status}): ${indexUrl}`);
  for (const link of anchorLinks(html, indexUrl)) {
    if (link.url.hostname !== "www.archives.gov") continue;
    if (!link.url.pathname.startsWith("/education/lessons/")) continue;
    if (indexPaths.has(link.url.pathname) || link.url.pathname.includes("/worksheets")) continue;
    if (link.url.hash || !link.title || /^(Top|Skip to main content)$/i.test(link.title)) continue;
    candidates.push({ title: link.title, era, url: link.url.toString() });
  }
}

const uniqueCandidates = [...new Map(candidates.map((item) => [normalizeUrl(item.url), item])).values()];
const verifiedPages = [];
const inactivePages = [];
let nextCandidate = 0;

async function verifyWorker() {
  while (nextCandidate < uniqueCandidates.length) {
    const candidate = uniqueCandidates[nextCandidate];
    nextCandidate += 1;
    const { response, html } = await fetchOfficial(candidate.url);
    if (!response.ok) {
      inactivePages.push({ title: candidate.title, url: candidate.url, status: response.status });
      continue;
    }
    verifiedPages.push({ ...candidate, url: response.url, html });
  }
}

await Promise.all(Array.from({ length: 8 }, verifyWorker));

const records = verifiedPages.flatMap(({ title, era, url, html }) => {
  if (existingUrls.has(normalizeUrl(url))) return [];
  const text = pageText(html);
  const description = metaDescription(html);
  const searchableText = `${title} ${description}`;
  const explicitStandards = [];
  if (/National History Standards/i.test(text)) explicitStandards.push("National History Standards");
  if (/National Standards for Civics and Government/i.test(text)) explicitStandards.push("National Standards for Civics and Government");
  return [{
    id: `nara-teaching-documents-${slugFor(url)}`,
    title,
    provider: "National Archives and Records Administration",
    sourceType: "Federal agency",
    category: "Teach",
    audience: ["Classroom teacher", "Student", "Librarian / media specialist"],
    gradeBands: gradeBandsFor(text),
    subjects: subjectsFor(title, searchableText),
    topics: topicsFor(title, searchableText, era),
    keywords: [era],
    resourceType: "Lesson / activity",
    summary: description.length >= 80
      ? concise(description)
      : `A National Archives Teaching with Documents lesson using primary sources to examine ${title}.${description ? ` Official page description: ${description}.` : ""}`,
    implementationStyle: implementationStyles(searchableText),
    time: "Flexible; activities vary by lesson",
    timeBucket: "Flexible / varies",
    prep: "Moderate prep",
    standards: unique(explicitStandards.length ? explicitStandards : ["National History Standards", "National Standards for Civics and Government"]),
    standardsNote: explicitStandards.length
      ? "The official lesson names these standards; review its standards section for the exact era, theme, and performance expectations."
      : "The collection states that its teaching activities are correlated to the National History Standards and National Standards for Civics and Government; the individual page does not supply exact codes.",
    cost: "Free",
    access: "No account needed to view or use the official lesson",
    formats: ["Web page", "Printable primary sources"],
    materials: "National Archives primary sources, historical background, and lesson-specific activity materials",
    availability: "Nationwide",
    url,
    verified: VERIFIED,
    featured: false,
    readyTomorrow: false,
  }];
});

records.sort((a, b) => a.title.localeCompare(b.title) || a.url.localeCompare(b.url));
const canonicalUrls = records.map((record) => normalizeUrl(record.url));
if (new Set(canonicalUrls).size !== canonicalUrls.length) throw new Error("National Archives import contains duplicate canonical URLs.");

await writeFile(OUTPUT, `${JSON.stringify({
  as_of: VERIFIED,
  provider: "National Archives and Records Administration",
  source_url: SOURCE_PAGE,
  official_indexes: ERA_INDEXES.map(([era, path]) => ({ era, url: new URL(path, BASE_URL).toString() })),
  verification: `Every record was discovered from an official National Archives era index and its destination returned successfully on ${VERIFIED}. Inactive official index links were excluded.`,
  inactive_pages: inactivePages.sort((a, b) => a.title.localeCompare(b.title)),
  records,
}, null, 2)}\n`);

console.log(JSON.stringify({
  officialCandidates: uniqueCandidates.length,
  activePages: verifiedPages.length,
  imported: records.length,
  duplicatesSkipped: verifiedPages.length - records.length,
  inactivePages,
  gradeBands: Object.fromEntries(["K–2", "3–5", "6–8", "9–12"].map((grade) => [grade, records.filter((record) => record.gradeBands.includes(grade)).length])),
}, null, 2));
