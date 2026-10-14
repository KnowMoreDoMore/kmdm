import { readFile, writeFile } from "node:fs/promises";

const API = "https://www.nasa.gov/wp-json/wp/v2";
const OUTPUT = new URL("../data/nasa_stem_resources.json", import.meta.url);
const EXISTING = new URL("../data/teacher_resources.json", import.meta.url);
const VERIFIED = "2026-09-25";

const decode = (value = "") => value
  .replace(/<[^>]*>/g, " ")
  .replace(/&nbsp;/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&#8217;|&#039;/g, "’")
  .replace(/&#8220;|&quot;/g, "“")
  .replace(/&#8221;/g, "”")
  .replace(/&#8211;/g, "–")
  .replace(/&#8212;/g, "—")
  .replace(/&hellip;/g, "…")
  .replace(/&#038;/g, "&")
  .replace(/\s+/g, " ")
  .trim();

const normalizeUrl = (value) => value.replace(/[?#].*$/, "").replace(/\/$/, "").toLowerCase();
const unique = (values) => [...new Set(values.filter(Boolean))];

const typeLabels = new Set([
  "Bookmarks", "Data Sets", "Educator Guides", "Hands-on Activities", "Image Galleries",
  "Interactive Multimedia", "Lesson Plans / Activities", "Mobile Apps", "Other Multimedia",
  "Play and Learn", "Posters", "Program Brochures", "Read About It", "STEM Resource Collections",
  "Videos", "Websites", "Coloring and Puzzles", "Games",
]);

const structuralLabels = new Set([
  "Audience", "Grade Levels", "Subject", "Type", "Educators", "Students", "Grades K-4",
  "Grades 5-8", "Grades 9-12", "Higher Education", "Informal Education",
]);

function gradeBands(names) {
  const grades = [];
  if (names.has("Grades K-4")) grades.push("K–2", "3–5");
  if (names.has("Grades 5-8")) grades.push("3–5", "6–8");
  if (names.has("Grades 9-12")) grades.push("9–12");
  if (names.has("Higher Education")) grades.push("Postsecondary");
  if (grades.length === 0) grades.push("K–2", "3–5", "6–8", "9–12");
  return unique(grades);
}

function subjects(names) {
  const values = [];
  if (names.has("Art")) values.push("Arts");
  if (names.has("Careers")) values.push("Career exploration");
  if (names.has("Computer Science")) values.push("Computer science");
  if (names.has("Earth Science") || names.has("Life Science") || names.has("Physical Science") || names.has("Space Science") || names.has("Human Space Exploration")) values.push("Science");
  if (names.has("Engineering Design") || names.has("Technology")) values.push("Engineering & design");
  if (names.has("History")) values.push("Social studies");
  if (names.has("Mathematics")) values.push("Mathematics");
  if (names.has("Spanish")) values.push("World languages");
  if (values.length === 0) values.push("Science", "Engineering & design");
  return unique(values);
}

function resourceType(names) {
  if (names.has("Lesson Plans / Activities") || names.has("Hands-on Activities")) return "Lesson / activity";
  if (names.has("Data Sets")) return "Data / tool";
  if (names.has("Interactive Multimedia") || names.has("Mobile Apps") || names.has("Games") || names.has("Play and Learn")) return "Interactive";
  if (names.has("Videos")) return "Video";
  if (names.has("Educator Guides")) return "Teacher guide";
  if (names.has("STEM Resource Collections")) return "Collection / portal";
  if (names.has("Posters") || names.has("Image Galleries") || names.has("Coloring and Puzzles")) return "Printable / visual";
  return "Reference / media";
}

function implementation(names) {
  if (names.has("Data Sets")) return ["Data investigation", "Inquiry-based"];
  if (names.has("Hands-on Activities")) return ["Hands-on / lab", "Inquiry-based"];
  if (names.has("Lesson Plans / Activities")) return ["Teacher-led", "Inquiry-based"];
  if (names.has("Interactive Multimedia") || names.has("Mobile Apps") || names.has("Games") || names.has("Play and Learn")) return ["Technology-enhanced", "Independent / self-paced"];
  if (names.has("Videos") || names.has("Read About It")) return ["Teacher-led", "Independent / self-paced"];
  return ["Teacher-selected"];
}

function formats(names) {
  const values = ["Web page"];
  if (names.has("Videos")) values.push("Video");
  if (names.has("Data Sets")) values.push("Dataset");
  if (names.has("Interactive Multimedia") || names.has("Mobile Apps") || names.has("Games") || names.has("Play and Learn")) values.push("Interactive");
  if (names.has("Educator Guides") || names.has("Lesson Plans / Activities") || names.has("Posters") || names.has("Coloring and Puzzles")) values.push("PDF / printable");
  return unique(values);
}

function category(title, summary, names) {
  const text = `${title} ${summary}`.toLowerCase();
  if (!names.has("Lesson Plans / Activities") && !names.has("Hands-on Activities") && /\b(internship|fellowship|scholarship|competition|contest|student opportunit|apply|applications)\b/.test(text)) return "Student opportunity";
  return "Teach";
}

async function getJson(url) {
  const response = await fetch(url, { headers: { "User-Agent": "TeacherResourceExchange/1.0 (official catalog indexing)" } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

const existing = JSON.parse(await readFile(EXISTING, "utf8"));
const existingUrls = new Set(existing.records.map((record) => normalizeUrl(record.url)));

const termResponse = await fetch(`${API}/stem-terms?per_page=100&page=1&_fields=id,name`, { headers: { "User-Agent": "TeacherResourceExchange/1.0 (official catalog indexing)" } });
if (!termResponse.ok) throw new Error(`${termResponse.status} ${termResponse.statusText}: NASA term index`);
const termPages = Number(termResponse.headers.get("x-wp-totalpages") || 1);
const firstTerms = await termResponse.json();
const remainingTerms = await Promise.all(Array.from({ length: termPages - 1 }, (_, index) => getJson(`${API}/stem-terms?per_page=100&page=${index + 2}&_fields=id,name`)));
const termMap = new Map(firstTerms.concat(...remainingTerms).map((term) => [term.id, decode(term.name)]));

const postFields = "id,slug,link,title,excerpt,modified_gmt,stem-terms";
const firstUrl = `${API}/stem-content?per_page=100&page=1&_fields=${postFields}`;
const firstResponse = await fetch(firstUrl, { headers: { "User-Agent": "TeacherResourceExchange/1.0 (official catalog indexing)" } });
if (!firstResponse.ok) throw new Error(`${firstResponse.status} ${firstResponse.statusText}: ${firstUrl}`);
const totalPages = Number(firstResponse.headers.get("x-wp-totalpages") || 1);
const firstPage = await firstResponse.json();
const remaining = await Promise.all(Array.from({ length: totalPages - 1 }, (_, index) => getJson(`${API}/stem-content?per_page=100&page=${index + 2}&_fields=${postFields}`)));
const posts = firstPage.concat(...remaining);

const records = posts.flatMap((post) => {
  const title = decode(post.title?.rendered);
  const summary = decode(post.excerpt?.rendered);
  const url = post.link;
  if (!title || !url || existingUrls.has(normalizeUrl(url))) return [];
  const termNames = (post["stem-terms"] || []).map((id) => termMap.get(id)).filter(Boolean);
  const names = new Set(termNames);
  const topics = unique(termNames.filter((name) => !structuralLabels.has(name) && !typeLabels.has(name))).slice(0, 8);
  const recordCategory = category(title, summary, names);
  const itemType = resourceType(names);
  return [{
    id: `nasa-catalog-${post.slug}`,
    title,
    provider: "NASA",
    sourceType: "Federal agency",
    category: recordCategory,
    audience: unique([names.has("Educators") ? "Classroom teacher" : "", names.has("Students") || recordCategory === "Student opportunity" ? "Student" : ""]).length ? unique([names.has("Educators") ? "Classroom teacher" : "", names.has("Students") || recordCategory === "Student opportunity" ? "Student" : ""]) : ["Classroom teacher", "Student"],
    gradeBands: gradeBands(names),
    subjects: subjects(names),
    topics: topics.length ? topics : ["Space", "STEM"],
    resourceType: itemType,
    summary: summary || "Official NASA STEM learning resource from the agency’s searchable education catalog.",
    implementationStyle: implementation(names),
    time: "Varies by resource",
    timeBucket: "Flexible / varies",
    prep: itemType === "Lesson / activity" ? "Light to moderate prep" : "Open and explore",
    standards: [],
    standardsNote: "NASA identifies grade level and subject in its catalog; confirm any item-specific standards on the linked resource.",
    cost: "Free",
    access: "No account needed to view the official resource page",
    formats: formats(names),
    materials: itemType === "Lesson / activity" ? "Internet-connected device; activity materials vary" : "Internet-connected device",
    availability: "Nationwide",
    url,
    verified: VERIFIED,
    featured: false,
    readyTomorrow: itemType === "Lesson / activity" && names.has("Educator Guides"),
  }];
});

records.sort((a, b) => a.title.localeCompare(b.title));
await writeFile(OUTPUT, `${JSON.stringify({ as_of: VERIFIED, provider: "NASA", source_url: "https://www.nasa.gov/learning-resources/search/", source_api: `${API}/stem-content`, records }, null, 2)}\n`);
console.log(JSON.stringify({ officialPosts: posts.length, imported: records.length, duplicatesSkipped: posts.length - records.length, totalPages }));
