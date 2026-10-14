import { readFile, writeFile } from "node:fs/promises";

const BASE_URL = "https://www.nps.gov";
const CATALOG_URL = `${BASE_URL}/solr/`;
const SOURCE_PAGE = `${BASE_URL}/teachers/teacher-resources.htm`;
const OUTPUT = new URL("../data/nps_lesson_resources.json", import.meta.url);
const VERIFIED = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const EXPECTED_TYPE = "Lesson Plan";
const EXISTING = [
  new URL("../data/teacher_resources.json", import.meta.url),
  new URL("../data/nasa_stem_resources.json", import.meta.url),
  new URL("../data/loc_classroom_resources.json", import.meta.url),
  new URL("../data/noaa_fisheries_resources.json", import.meta.url),
];

const unique = (values) => [...new Set(values.filter(Boolean))];
const normalizeUrl = (value) => value.replace(/[?#].*$/, "").replace(/\/$/, "").toLowerCase();
const clean = (value = "") => value
  .replace(/<[^>]*>/g, " ")
  .replace(/&nbsp;/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&quot;|&#34;/g, '"')
  .replace(/&#039;|&#39;|&apos;/g, "’")
  .replace(/&ndash;/g, "–")
  .replace(/&mdash;/g, "—")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/\s+/g, " ")
  .trim();

function concise(value, limit = 520) {
  const text = clean(value);
  if (text.length <= limit) return text;
  const shortened = text.slice(0, limit - 1).replace(/\s+\S*$/, "");
  return `${shortened}…`;
}

function gradeBands(values = []) {
  const bands = [];
  for (const value of values) {
    if (/Pre-Kindergarten through Second Grade/i.test(value)) bands.push("Pre-K", "K–2");
    if (/Third Grade through Fifth Grade/i.test(value)) bands.push("3–5");
    if (/Sixth Grade through Eighth Grade/i.test(value)) bands.push("6–8");
    if (/Ninth Grade through Twelfth Grade/i.test(value)) bands.push("9–12");
    if (/College|Graduate|Adult Education/i.test(value)) bands.push("Postsecondary");
  }
  return unique(bands);
}

function subjectsFor(values = [], text = "") {
  const subjectMap = {
    "Literacy and Language Arts": "ELA & literacy",
    Math: "Mathematics",
    Science: "Science",
    "Social Studies": "Social studies",
  };
  const subjects = values.map((value) => subjectMap[value]).filter(Boolean);
  if (!subjects.length) {
    if (/history|historic|war|government|civic|culture|community|slavery|rights|geograph/i.test(text)) subjects.push("Social studies");
    if (/read|writ|literacy|poetry|story|language|journal|speech/i.test(text)) subjects.push("ELA & literacy");
    if (/science|ecology|geology|biology|climate|weather|water|wildlife|plant|animal|energy/i.test(text)) subjects.push("Science");
    if (/math|number|measure|geometry|graph|statistic/i.test(text)) subjects.push("Mathematics");
  }
  return unique(subjects.length ? subjects : ["Interdisciplinary"]);
}

function topicsFor(text) {
  const rules = [
    [/primary source|historic document|oral histor|photograph|artifact/i, "Primary sources"],
    [/civil war|revolution|world war|slavery|abolition|reconstruction|immigration|american histor/i, "U.S. history"],
    [/civil rights|segregation|equality|discrimination|human rights/i, "Civil rights"],
    [/indigenous|native american|american indian|tribal/i, "Indigenous history"],
    [/government|civic|citizen|democra|constitution|congress|president|public lands/i, "Civics"],
    [/geograph|\bmaps?\b|cartograph|place-based/i, "Geography"],
    [/ecosystem|ecology|habitat|food web|biodiversity/i, "Ecosystems"],
    [/wildlife|animal|bird|insect|fish|mammal/i, "Wildlife"],
    [/plant|forest|tree|botan/i, "Plants"],
    [/geolog|rock|fossil|volcan|earthquake|canyon|plate tectonic/i, "Geology"],
    [/ocean|marine|coast|coral|tide/i, "Ocean science"],
    [/water|river|stream|lake|wetland|watershed/i, "Water"],
    [/climate|weather|atmosphere/i, "Climate"],
    [/conserv|preserv|steward|protect|environment/i, "Conservation"],
    [/\bdata\b|\bgraphs?\b|\bsurveys?\b|\bmeasur(?:e|es|ed|ing|ement|ements)\b|statistics?/i, "Data literacy"],
    [/engineer|design challenge|\bdesign(?:s|ing)?\b|\bbuild(?:s|ing)?\b|invention|technology/i, "Engineering design"],
    [/\barts?\b|music|poetry|theater|creative|drawing|painting/i, "Arts and culture"],
    [/career|job|profession/i, "Career exploration"],
    [/sound|soundscape|listen/i, "Sound"],
  ];
  return unique(["National parks", ...rules.filter(([pattern]) => pattern.test(text)).map(([, topic]) => topic)]).slice(0, 7);
}

function implementationStyles(text) {
  const rules = [
    [/primary source|historic document|artifact|photograph|oral histor/i, "Primary-source analysis"],
    [/investigat|inquiry|research|evidence|observe|question/i, "Inquiry-based"],
    [/\bexperiments?\b|hands-on|\bbuild(?:s|ing)?\b|\bcreat(?:e|es|ed|ing)\b|\bmak(?:e|es|ing)\b|\bmodels?\b|\blabs?\b|field work/i, "Hands-on activity"],
    [/outdoor|trail|field trip|outside|park visit/i, "Outdoor / field-based"],
    [/role.?play|simulation|mock trial|reenact/i, "Simulation / role play"],
    [/debate|discussion|seminar|share|reflect/i, "Discussion / seminar"],
    [/group|team|partner|collaborat/i, "Collaborative learning"],
    [/\bprojects?\b|design challenge|problem.?based/i, "Project / problem-based"],
    [/\bmaps?\b|\bgraphs?\b|\bdatasets?\b|data collection|analy[sz]e data/i, "Data investigation"],
  ];
  const styles = rules.filter(([pattern]) => pattern.test(text)).map(([, style]) => style);
  return unique(styles.length ? styles : ["Teacher-led"]).slice(0, 4);
}

function standardsFor(item) {
  const standards = [];
  if ((item.Common_Core_Standards_Ela_Item || []).length) standards.push("Common Core ELA");
  if ((item.Common_Core_Standards_Math_Item || []).length) standards.push("Common Core Math");
  const additional = clean(item.Additional_Standards || "");
  if (/NGSS|Next Generation Science Standards?/i.test(additional)) standards.push("NGSS");
  if (/C3 Framework/i.test(additional)) standards.push("C3 Framework");
  if (clean(item.State_Standards || "")) standards.push("State standards");
  return unique(standards);
}

function timeBucket(duration) {
  if (/^90 Minutes$/i.test(duration)) return "Extended block";
  if (/^(30|60) Minutes$/i.test(duration)) return "One class period";
  return "Flexible / varies";
}

function sample(items, target = 28) {
  if (items.length <= target) return items;
  const step = (items.length - 1) / (target - 1);
  return unique(Array.from({ length: target }, (_, index) => items[Math.round(index * step)]));
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

async function fetchCatalog() {
  const url = new URL(CATALOG_URL);
  const fields = [
    "ID", "Title", "Abstract", "Question_Objective", "PageURL", "Date_Last_Modified",
    "Common_Core_Standards_Item", "Common_Core_Standards_Ela_Item", "Common_Core_Standards_Math_Item",
    "State_Standards", "Additional_Standards", "Grade_Level_Item", "Subjects_Item", "Duration",
    "Tags_Item", "Sites_Item", "Parks_Item",
  ];
  url.searchParams.set("defType", "edismax");
  url.searchParams.append("fq", 'Category:"Teacher Resources"');
  url.searchParams.append("fq", `Type:"${EXPECTED_TYPE}"`);
  url.searchParams.set("rows", "2000");
  url.searchParams.set("start", "0");
  url.searchParams.set("q", "*");
  url.searchParams.set("wt", "json");
  url.searchParams.set("sort", "Title asc");
  url.searchParams.set("fl", fields.join(","));
  const response = await fetch(url, { headers: { "User-Agent": "TeacherResourceExchange/1.0 (official federal education catalog indexing)" } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  const document = await response.json();
  const records = document.response?.docs || [];
  const expected = document.response?.numFound;
  if (!Number.isInteger(expected) || records.length !== expected) {
    throw new Error(`Incomplete NPS catalog response: expected ${expected}, received ${records.length}.`);
  }
  return records;
}

async function verifyOfficialPages(items) {
  const pages = sample(items).map((item) => new URL(item.PageURL, BASE_URL).toString());
  await mapWithConcurrency(pages, 6, async (url) => {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      headers: { "User-Agent": "TeacherResourceExchange/1.0 (official federal education catalog verification)" },
    });
    if (!response.ok) throw new Error(`NPS sample verification failed (${response.status}): ${url}`);
  });
  return pages.length;
}

const existingDocuments = await Promise.all(EXISTING.map(async (file) => JSON.parse(await readFile(file, "utf8"))));
const existingUrls = new Set(existingDocuments.flatMap((document) => document.records || []).map((record) => normalizeUrl(record.url)));
const catalog = await fetchCatalog();
const canonicalUrls = catalog.map((item) => normalizeUrl(new URL(item.PageURL, BASE_URL).toString()));
if (new Set(canonicalUrls).size !== catalog.length) throw new Error("NPS lesson catalog contains duplicate canonical URLs.");
const samplePagesChecked = await verifyOfficialPages(catalog);

const records = catalog.flatMap((item) => {
  const url = new URL(item.PageURL, BASE_URL).toString();
  if (existingUrls.has(normalizeUrl(url))) return [];
  const title = clean(item.Title);
  const summary = concise(item.Abstract || item.Question_Objective);
  const tags = (item.Tags_Item || []).map(clean);
  const parks = unique([...(item.Sites_Item || []), ...(item.Parks_Item || [])].map(clean));
  const searchableText = clean([title, summary, item.Question_Objective, tags.join(" "), parks.join(" ")].join(" "));
  const grades = gradeBands(item.Grade_Level_Item || []);
  const duration = clean(item.Duration || "Flexible; see the official lesson");
  const standards = standardsFor(item);
  const standardsLabel = standards.length ? standards.join(", ") : "No formal standards metadata";
  return [{
    id: `nps-lesson-${String(item.ID).toLowerCase()}`,
    title,
    provider: "National Park Service",
    sourceType: "Federal agency",
    category: "Teach",
    audience: ["Classroom teacher", "Student", "Informal educator"],
    gradeBands: grades,
    subjects: subjectsFor(item.Subjects_Item || [], searchableText),
    topics: topicsFor(searchableText),
    keywords: unique([...parks, ...tags]).slice(0, 16),
    resourceType: "Lesson / activity",
    summary,
    implementationStyle: implementationStyles(searchableText),
    time: duration,
    timeBucket: timeBucket(duration),
    prep: duration === "90 Minutes" ? "Moderate prep" : "Light to moderate prep",
    standards,
    standardsNote: `${standardsLabel} supplied in the official NPS record; review the lesson page for the exact codes and context.`,
    cost: "Free",
    access: "No account needed to view the official lesson",
    formats: ["Web page"],
    materials: "Materials vary by lesson; see the official preparation and materials sections",
    availability: "Nationwide",
    url,
    verified: VERIFIED,
    featured: false,
    readyTomorrow: duration === "30 Minutes" || duration === "60 Minutes",
  }];
});

records.sort((a, b) => a.title.localeCompare(b.title) || a.url.localeCompare(b.url));
await writeFile(OUTPUT, `${JSON.stringify({
  as_of: VERIFIED,
  provider: "National Park Service",
  source_url: SOURCE_PAGE,
  catalog_endpoint: CATALOG_URL,
  official_lesson_count: catalog.length,
  verification: `Every record came from the live official NPS Educator Resources catalog. ${samplePagesChecked} evenly distributed destination pages were also checked successfully on ${VERIFIED}.`,
  records,
}, null, 2)}\n`);

console.log(JSON.stringify({
  officialLessons: catalog.length,
  imported: records.length,
  existingUrlsSkipped: catalog.length - records.length,
  samplePagesChecked,
  gradeBands: Object.fromEntries(["Pre-K", "K–2", "3–5", "6–8", "9–12", "Postsecondary"].map((grade) => [grade, records.filter((record) => record.gradeBands.includes(grade)).length])),
  subjects: Object.fromEntries(["ELA & literacy", "Mathematics", "Science", "Social studies", "Interdisciplinary"].map((subject) => [subject, records.filter((record) => record.subjects.includes(subject)).length])),
  standardsTagged: records.filter((record) => record.standards.length).length,
}, null, 2));
