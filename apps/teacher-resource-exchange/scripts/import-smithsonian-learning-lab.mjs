import { readFile, writeFile } from "node:fs/promises";

const CAPTURE = new URL("../data/smithsonian_learning_lab_capture.json", import.meta.url);
const OUTPUT = new URL("../data/smithsonian_learning_lab_resources.json", import.meta.url);
const SOURCE_URL = "https://learninglab.si.edu/collections-by-grade";
const GRADE_ORDER = ["Pre-K", "K–2", "3–5", "6–8", "9–12", "Postsecondary"];
const EXPECTED_PAGES = { "K–2": 31, "3–5": 40, "6–8": 57, "9–12": 50 };

const unique = (values) => [...new Set(values.filter(Boolean))];
const normalizeUrl = (value) => value.replace(/[?#].*$/, "").replace(/\/$/, "").toLowerCase();
const clean = (value = "") => value.replace(/\s+/g, " ").trim();

function concise(value, limit = 460) {
  const text = clean(value);
  if (!text) return "";
  if (text.length <= limit) return /[.!?…][\"”']?$/.test(text) ? text : `${text}…`;
  return `${text.slice(0, limit - 1).replace(/\s+\S*$/, "")}…`;
}

function subjectsFor(text) {
  const values = [];
  const rules = [
    [/\b(scien\w*|biolog\w*|ecolog\w*|ecosystem\w*|animal\w*|wildlife|species|habitat\w*|climat\w*|weather|astronom\w*|space|planet\w*|geolog\w*|fossil\w*|physic\w*|chemist\w*|environment\w*|ocean\w*|marine|plant\w*|earth|water|energy|health|anatom\w*|medicine|stem)\b/i, "Science"],
    [/\b(engineer\w*|design\w*|invention\w*|inventor\w*|technolog\w*|architect\w*|build\w*|maker\w*|prototype\w*|robot\w*|coding|computer\w*)\b/i, "Engineering & design"],
    [/\b(arts?|artist\w*|portrait\w*|paint\w*|sculpt\w*|music\w*|danc\w*|theat\w*|drama\w*|visual\w*|photograph\w*|films?|poe\w*|creativ\w*|craft\w*|draw\w*)\b/i, "Arts"],
    [/\b(histor\w*|civic\w*|citizen\w*|government\w*|president\w*|congress\w*|constitution\w*|cultur\w*|geograph\w*|migration|immigration|war|identity|community|indigenous|native|nation\w*|societ\w*|economic\w*|archaeolog\w*)\b/i, "Social studies"],
    [/\b(read\w*|writ\w*|literacy|language|vocabular\w*|speech|stor\w*|literature|poe\w*|texts?|author\w*|books?|bilingual)\b/i, "ELA & literacy"],
    [/\b(math\w*|geometr\w*|numbers?|data|statistic\w*|measur\w*|algebra\w*|ratios?|proportion\w*|graphs?)\b/i, "Mathematics"],
  ];
  for (const [pattern, subject] of rules) if (pattern.test(text)) values.push(subject);
  return unique(values.length ? values : ["Interdisciplinary"]);
}

function topicsFor(text) {
  const rules = [
    [/animal|wildlife|species|mammal|bird|insect|amphibian|reptile/i, "Animals and wildlife"],
    [/conservation|endangered|habitat|ecosystem|ecology|biodiversity|rainforest/i, "Conservation and ecosystems"],
    [/ocean|marine|coral|reef|coast|shore|watershed/i, "Ocean and coastal science"],
    [/climate|weather|atmosphere/i, "Climate and weather"],
    [/space|planet|moon|sun|star|astronom|meteorite|spacecraft/i, "Space science"],
    [/engineer|design|invent|build|maker|prototype|technology|architecture/i, "Engineering and design"],
    [/\barts?\b|\bartist\w*|\bportrait\w*|\bpaint\w*|\bsculpt\w*|\bmusic\w*|\bdanc\w*|\btheat\w*|\bvisual\w*|\bcreativ\w*|\bcraft\w*/i, "Arts and creativity"],
    [/primary source|object-based|object based|artifact|historical source|photograph|archive/i, "Object and primary-source inquiry"],
    [/civic|citizen|government|constitution|congress|president|democracy|rights|freedom|liberty/i, "Civics and government"],
    [/identity|culture|heritage|tradition|indigenous|native|community|migration|immigration/i, "Culture and identity"],
    [/black history|african american|civil rights|harlem|slavery|enslaved/i, "African American history"],
    [/latino|latina|hispanic|mexic|puerto ric|quinceañera/i, "Latino history and culture"],
    [/native american|american indian|alaska native|indigenous|yup|iñupiaq|athabascan|haida|tlingit/i, "Indigenous histories and cultures"],
    [/language|literacy|reading|writing|poetry|story|bilingual/i, "Language and literacy"],
    [/health|medicine|anatomy|wellness|nutrition/i, "Health and the human body"],
    [/food|agriculture|farm|garden/i, "Food and agriculture"],
    [/\bwar\b|military|conflict|veteran|soldier/i, "Military history"],
    [/map|geography|place|landscape/i, "Geography and place"],
    [/data|statistics|graph|measurement|number|geometry|mathematics|math/i, "Mathematics and data"],
  ];
  return unique(rules.filter(([pattern]) => pattern.test(text)).map(([, topic]) => topic)).slice(0, 8);
}

function standardsFor(text) {
  const standards = [];
  if (/Next Generation Science Standards|\bNGSS\b/i.test(text)) standards.push("NGSS");
  if (/Common Core State Standards|\bCCSS\b|Common Core/i.test(text)) standards.push("Common Core State Standards");
  if (/C3 Framework|College, Career, and Civic Life/i.test(text)) standards.push("C3 Framework");
  if (/National Core Arts Standards|\bNCAS\b/i.test(text)) standards.push("National Core Arts Standards");
  return standards;
}

function resourceType(text) {
  if (/professional development|teacher training|educator workshop/i.test(text)) return "Professional learning";
  if (/curriculum|unit plan|learning kit|teaching kit/i.test(text)) return "Curriculum / unit";
  if (/lesson|activity|learning sequence|investigation|student challenge/i.test(text)) return "Lesson / activity";
  if (/interactive|simulation|virtual tour|game\b/i.test(text)) return "Interactive";
  if (/primary source set|document set|source set/i.test(text)) return "Primary source set";
  if (/guide|teaching resource|educator resource|toolkit|template/i.test(text)) return "Educator guide";
  return "Learning collection";
}

function implementationFor(text) {
  const values = [];
  if (/inquir|investigat|observe|question|see,? think,? wonder|thinking routine/i.test(text)) values.push("Inquiry-based");
  if (/\barts?\b|\bartist\w*|\bportrait\w*|\bmusic\w*|\bdanc\w*|\btheat\w*|\bvisual\w*|\bcreativ\w*/i.test(text)) values.push("Arts-integrated");
  if (/hands-on|hands on|activity|experiment|build|make|create|game|craft|draw/i.test(text)) values.push("Hands-on");
  if (/primary source|object-based|object based|artifact|document|photograph|museum object/i.test(text)) values.push("Primary-source analysis");
  if (/discuss|discussion|seminar|debate|conversation|collaborat|small group|partner/i.test(text)) values.push("Discussion / collaborative");
  if (/project-based|project based|student-led|student led|choice board|independent/i.test(text)) values.push("Student-directed");
  return unique(values.length ? values : ["Flexible / teacher-selected"]).slice(0, 4);
}

function prepFor(type, itemCount) {
  if (type === "Lesson / activity" && itemCount <= 15) return "Light to moderate prep";
  if (type === "Educator guide" || type === "Interactive") return "Light prep";
  return "Moderate prep; select collection items before class";
}

const capture = JSON.parse(await readFile(CAPTURE, "utf8"));
const VERIFIED = capture.capturedAt;
const prior = JSON.parse(await readFile(OUTPUT, "utf8"));
if (!VERIFIED || !Array.isArray(capture.rows) || !Array.isArray(capture.pages) || !capture.rows.length) {
  throw new Error("Smithsonian capture is empty or malformed.");
}

const pageKeys = capture.pages.map((page) => `${page.band}:${page.page}`);
if (new Set(pageKeys).size !== pageKeys.length) throw new Error("Smithsonian capture contains duplicate pages.");
if (capture.pages.reduce((total, page) => total + page.count, 0) !== capture.rows.length) {
  throw new Error("Smithsonian capture page counts do not match its row count.");
}

const priorByUrl = new Map((prior.records || []).map((record) => [normalizeUrl(record.url), record]));
const merged = new Map();
for (const row of capture.rows) {
  if (!row.title || !row.url || !row.gradeBand) throw new Error("Incomplete Smithsonian capture row.");
  const key = normalizeUrl(row.url);
  const current = merged.get(key);
  if (!current) {
    merged.set(key, { ...row, gradeBands: new Set([row.gradeBand]) });
    continue;
  }
  current.gradeBands.add(row.gradeBand);
  if ((row.description || "").length > (current.description || "").length) current.description = row.description;
  if (!current.provider && row.provider) current.provider = row.provider;
  current.itemCount = Math.max(current.itemCount || 0, row.itemCount || 0);
}

const currentRecords = [...merged.entries()].map(([key, item]) => {
  const legacy = priorByUrl.get(key);
  const gradeBands = unique([...item.gradeBands, ...(legacy?.gradeBands || [])])
    .sort((a, b) => GRADE_ORDER.indexOf(a) - GRADE_ORDER.indexOf(b));
  const provider = clean(item.provider) || legacy?.provider || "Smithsonian Institution";
  const text = clean(`${item.title} ${item.description || ""} ${provider}`);
  const type = resourceType(text);
  const standards = standardsFor(text);
  const topics = topicsFor(text);
  const code = new URL(item.url).pathname.split("/").filter(Boolean).at(-1).toLowerCase();
  return {
    id: `smithsonian-learning-lab-${code}`,
    title: clean(item.title),
    provider,
    sourceType: "Federal / national",
    category: "Teach",
    audience: ["Classroom teacher", "Student", "Museum / informal educator"],
    gradeBands,
    subjects: subjectsFor(text),
    topics: topics.length ? topics : ["Museum learning"],
    resourceType: type,
    summary: concise(item.description) || `${provider} collection containing ${item.itemCount} curated Smithsonian resources. Open the official collection for its objects, media, educator guidance, and activities.`,
    implementationStyle: implementationFor(text),
    time: `Flexible; collection contains ${item.itemCount} item${item.itemCount === 1 ? "" : "s"}`,
    timeBucket: "Flexible / varies",
    prep: prepFor(type, item.itemCount),
    standards,
    standardsNote: standards.length
      ? "The official collection description names these frameworks; open the collection to review the exact alignment and expectations."
      : "No formal standards alignment is claimed from the catalog description; review the collection page for any item-level alignment.",
    cost: "Free",
    access: "No account needed to view; free account needed to copy, assign, or save",
    formats: ["Web page", "Mixed media", "Digital museum objects"],
    materials: "Smithsonian digital objects, media, and collection guidance; activity materials vary",
    availability: "Nationwide",
    url: item.url,
    verified: VERIFIED,
    featured: false,
    readyTomorrow: false,
    keywords: unique(["Smithsonian", "Smithsonian Learning Lab", `${item.itemCount} collection items`, ...topics]),
  };
});

const currentUrls = new Set(currentRecords.map((record) => normalizeUrl(record.url)));
const preservedRecords = (prior.records || []).filter((record) => !currentUrls.has(normalizeUrl(record.url)));
const records = [...currentRecords, ...preservedRecords]
  .sort((a, b) => a.title.localeCompare(b.title) || a.url.localeCompare(b.url));

const canonicalUrls = records.map((record) => normalizeUrl(record.url));
if (new Set(canonicalUrls).size !== canonicalUrls.length) throw new Error("Smithsonian import contains duplicate canonical URLs.");
if (new Set(records.map((record) => record.id)).size !== records.length) throw new Error("Smithsonian import contains duplicate ids.");

const capturedByBand = Object.fromEntries(GRADE_ORDER.map((band) => [band, capture.rows.filter((row) => row.gradeBand === band).length]).filter(([, count]) => count));
const capturedPagesByBand = Object.fromEntries(GRADE_ORDER.map((band) => [band, capture.pages.filter((page) => page.band === band).length]).filter(([, count]) => count));
const pageCoverage = Object.fromEntries(Object.entries(EXPECTED_PAGES).map(([band, expected]) => {
  const captured = capturedPagesByBand[band] || 0;
  return [band, `${captured} of ${expected} pages${captured === expected ? " (complete)" : ""}`];
}));
const fullyIndexed = Object.entries(EXPECTED_PAGES).every(([band, expected]) => capturedPagesByBand[band] === expected);
await writeFile(OUTPUT, `${JSON.stringify({
  as_of: VERIFIED,
  provider: "Smithsonian Institution",
  collection: "Smithsonian-created Learning Lab collections",
  source_url: SOURCE_URL,
  coverage: {
    status: fullyIndexed ? "indexed" : "partial",
    method: "Official Smithsonian-created grade-filtered search results, sorted by most recently modified, captured page by page from server-rendered result cards. Canonical collection URLs are deduplicated and their verified grade placements are merged.",
    captured_grade_placements: capture.rows.length,
    captured_by_band: capturedByBand,
    captured_pages: capture.pages.length,
    page_coverage: pageCoverage,
    current_capture_unique_records: currentRecords.length,
    prior_verified_records_preserved: preservedRecords.length,
    unique_records: records.length,
  },
  records,
}, null, 2)}\n`);

console.log(JSON.stringify({
  capturedPlacements: capture.rows.length,
  capturedPages: capture.pages.length,
  capturedByBand,
  capturedPagesByBand,
  fullyIndexed,
  currentUniqueRecords: currentRecords.length,
  priorVerifiedRecordsPreserved: preservedRecords.length,
  imported: records.length,
  providers: new Set(records.map((record) => record.provider)).size,
}, null, 2));
