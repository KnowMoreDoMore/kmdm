import { readFile, writeFile } from "node:fs/promises";

const OUTPUT = new URL("../data/loc_classroom_resources.json", import.meta.url);
const EXISTING = new URL("../data/teacher_resources.json", import.meta.url);
const VERIFIED = "2026-09-26";
const COLLECTIONS = [
  {
    label: "Lesson plans",
    url: "https://www.loc.gov/programs/teachers/classroom-materials/lesson-plans/?fo=json&c=160",
  },
  {
    label: "Primary source sets",
    url: "https://www.loc.gov/programs/teachers/classroom-materials/primary-source-sets/?fo=json&c=160",
  },
];

const normalizeUrl = (value) => value.replace(/[?#].*$/, "").replace(/\/$/, "").toLowerCase();
const unique = (values) => [...new Set(values.filter(Boolean))];
const clean = (value = "") => value
  .replace(/<[^>]*>/g, " ")
  .replace(/&nbsp;/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&quot;|&#8220;|&#8221;/g, "\"")
  .replace(/&#039;|&#8217;/g, "’")
  .replace(/&ndash;|&#8211;/g, "–")
  .replace(/&mdash;|&#8212;/g, "—")
  .replace(/\s+/g, " ")
  .trim();

function gradeBands(values = []) {
  const bands = [];
  for (const value of values) {
    if (/^k-12$/i.test(value)) bands.push("K–2", "3–5", "6–8", "9–12");
    if (/^k-5$/i.test(value)) bands.push("K–2", "3–5");
    if (/^3-5$/i.test(value)) bands.push("3–5");
    if (/^6-8$/i.test(value)) bands.push("6–8");
    if (/^9-12$/i.test(value)) bands.push("9–12");
  }
  return unique(bands.length ? bands : ["3–5", "6–8", "9–12"]);
}

function canonicalTopic(value) {
  const normalized = clean(value)
    .replace(/\bAnd\b/g, "and")
    .replace(/\s*&\s*/g, " and ")
    .replace(/Politcs/i, "Politics")
    .replace(/Asian\s*[–-]\s*American/i, "Asian American")
    .replace(/Women’s/g, "Women's")
    .replace(/American history/i, "American History");
  const aliases = {
    "Arts and Culture, Maps and Geography": "Arts, culture, and geography",
    "Arts and Culture": "Arts and culture",
    "City and Regional History": "City and regional history",
    "Culture and Folklore": "Culture and folklife",
    "Culture and Folklife": "Culture and folklife",
    "Government, Law and Politics": "Government, law, and politics",
    "Immigration and Ethnic Heritage": "Immigration and ethnic heritage",
    "Maps and Geography": "Maps and geography",
    "News, Journalism and Advertising": "News, journalism, and advertising",
    "Photographs, Prints Posters": "Photographs, prints, and posters",
    "Photographs, Prints and Posters": "Photographs, prints, and posters",
    "Science Technology and Math": "Science, technology, and math",
    "Science, Technology and Business": "Science, technology, and business",
    "Science, Technology, Business": "Science, technology, and business",
    "Sports, Recreation and Leisure": "Sports, recreation, and leisure",
    "World History and Cultures": "World history and cultures",
  };
  return aliases[normalized] || normalized;
}

function subjects(topics, specificSubjects) {
  const text = `${topics.join(" ")} ${specificSubjects.join(" ")}`.toLowerCase();
  const values = [];
  if (/history|government|constitution|civic|politic|geograph|map|war|immigration|heritage|president|slavery|abolition|civil rights/.test(text)) values.push("Social studies");
  if (/literature|poetry|journalism|nonfiction|informational text|oral histor|advertising|persuasion|speech|whitman/.test(text)) values.push("ELA & literacy");
  if (/arts|culture|music|performing|photograph|poster|folkl/.test(text)) values.push("Arts");
  if (/mathemat|math/.test(text)) values.push("Mathematics");
  if (/science|technology|astronomy|solar system|paleont/.test(text)) values.push("Science");
  if (/technology|invention|industrial revolution|transportation/.test(text)) values.push("Engineering & design");
  return unique(values.length ? values : ["Social studies", "ELA & literacy"]);
}

function extractTime(html = "", isLesson) {
  if (!isLesson) return "Flexible; one class period or short inquiry";
  const match = html.match(/<h3[^>]*>\s*Time Required\s*<\/h3>\s*<p[^>]*>(.*?)<\/p>/is);
  return clean(match?.[1] || "Varies by lesson");
}

function timeBucket(value) {
  const text = value.toLowerCase();
  if (/semester|five months|school year/.test(text)) return "Semester / year";
  if (/week/.test(text)) return "Multi-week";
  if (/classes|class periods|days/.test(text)) return "Multi-day";
  if (/one class|50-minute|60-minute/.test(text)) return "One class period";
  return "Flexible / varies";
}

async function getJson(url) {
  const response = await fetch(url, { headers: { "User-Agent": "TeacherResourceExchange/1.0 (official catalog indexing)" } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

const existing = JSON.parse(await readFile(EXISTING, "utf8"));
const existingUrls = new Set(existing.records.map((record) => normalizeUrl(record.url)));
const collections = await Promise.all(COLLECTIONS.map(async (collection) => {
  const document = await getJson(collection.url);
  const apiComponent = document.content?.components?.find((component) => component.type === "api");
  if (!apiComponent?.results) throw new Error(`No official catalog results found for ${collection.label}`);
  if (apiComponent.pagination?.of !== apiComponent.results.length) throw new Error(`Incomplete official catalog response for ${collection.label}`);
  return { ...collection, results: apiComponent.results };
}));

const records = collections.flatMap(({ results }) => results).flatMap((result) => {
  const item = result.item || {};
  const url = result.url;
  const title = clean(result.title || item.title);
  if (!url || !title || result.access_restricted || existingUrls.has(normalizeUrl(url))) return [];

  const isLesson = item.type === "lesson-plan" || result.partof_type?.includes("lesson plan");
  const topics = unique([...(item.topics || []), ...(item.subjects || [])].map(canonicalTopic)).slice(0, 10);
  const classroomTime = extractTime(item.html_content, isLesson);
  const bands = gradeBands(item["recommended-grade-level"]);
  return [{
    id: `loc-classroom-${new URL(url).pathname.split("/").filter(Boolean).at(-1)}`,
    title,
    provider: "Library of Congress",
    sourceType: "Federal agency",
    category: "Teach",
    audience: ["Classroom teacher", "Student", "Librarian / media specialist"],
    gradeBands: bands,
    subjects: subjects(item.topics || [], item.subjects || []),
    topics: unique([...(topics.length ? topics : ["Primary sources"]), "Primary sources"]),
    resourceType: isLesson ? "Lesson / activity" : "Primary source set",
    summary: clean(result.description?.[0] || item.description) || "Official Library of Congress classroom material using primary sources.",
    implementationStyle: isLesson ? ["Teacher-led", "Inquiry-based", "Collaborative learning"] : ["Inquiry-based", "Discussion / seminar", "Teacher-led"],
    time: classroomTime,
    timeBucket: timeBucket(classroomTime),
    prep: isLesson ? "Light to moderate prep" : "Light prep",
    standards: [],
    standardsNote: "The Library of Congress supplies recommended grade levels and learning materials; confirm any lesson-specific standards on the official page.",
    cost: "Free",
    access: "No account needed to view or use the official classroom material",
    formats: isLesson ? ["Web page"] : ["Web page", "PDF / printable"],
    materials: isLesson ? "Library of Congress primary sources; activity materials vary by lesson" : "Digital or printed primary sources; teacher guide when provided",
    availability: "Nationwide",
    url,
    verified: VERIFIED,
    featured: false,
    readyTomorrow: !isLesson || timeBucket(classroomTime) === "One class period",
  }];
});

records.sort((a, b) => a.title.localeCompare(b.title));
await writeFile(OUTPUT, `${JSON.stringify({
  as_of: VERIFIED,
  provider: "Library of Congress",
  source_url: "https://www.loc.gov/programs/teachers/classroom-materials/",
  official_collections: COLLECTIONS.map(({ label, url }) => ({ label, url })),
  records,
}, null, 2)}\n`);

console.log(JSON.stringify({
  officialItems: collections.reduce((total, collection) => total + collection.results.length, 0),
  imported: records.length,
  duplicatesOrRestrictedSkipped: collections.reduce((total, collection) => total + collection.results.length, 0) - records.length,
  collections: collections.map((collection) => ({ label: collection.label, items: collection.results.length })),
}));
