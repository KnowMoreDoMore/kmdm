import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);
const registry = JSON.parse(await readFile(new URL("data/source_registry.json", ROOT), "utf8"));
const errors = [];
const seenIds = new Set();
const seenProductIds = new Set();
let indexedItems = 0;

for (const source of registry.sources) {
  if (seenIds.has(source.id)) errors.push(`Duplicate source id: ${source.id}`);
  seenIds.add(source.id);
  if (!source.provider || !source.collection || !source.url || !source.status || !source.next_action) {
    errors.push(`Incomplete registry record: ${source.id || "unknown"}`);
  }
  if (source.dataset) {
    const document = JSON.parse(await readFile(new URL(source.dataset, ROOT), "utf8"));
    const actual = document.records?.length;
    if (actual !== source.imported_count) errors.push(`${source.id}: registry says ${source.imported_count}, dataset contains ${actual}`);
  }
  if (source.status === "indexed") indexedItems += source.imported_count;
}

for (const item of registry.product_backlog || []) {
  if (seenProductIds.has(item.id)) errors.push(`Duplicate product backlog id: ${item.id}`);
  seenProductIds.add(item.id);
  if (!item.title || !item.status || !item.goal || !item.next_action || !item.data_sources?.length || !item.guardrails?.length) {
    errors.push(`Incomplete product backlog record: ${item.id || "unknown"}`);
  }
}

if (indexedItems !== registry.summary.item_level_imports) {
  errors.push(`Item-level summary says ${registry.summary.item_level_imports}, indexed sources total ${indexedItems}`);
}

const allCatalogs = [
  "data/teacher_resources.json",
  "data/nasa_stem_resources.json",
  "data/loc_classroom_resources.json",
  "data/noaa_fisheries_resources.json",
  "data/nps_lesson_resources.json",
  "data/noaa_sea_to_sky_resources.json",
  "data/smithsonian_learning_lab_resources.json",
  "data/national_archives_lesson_resources.json",
];
const catalogDocuments = await Promise.all(allCatalogs.map(async (file) => JSON.parse(await readFile(new URL(file, ROOT), "utf8"))));
const catalogRecords = catalogDocuments.flatMap((document) => document.records || []);
const catalogCount = catalogRecords.length;

const normalizeUrl = (value) => value.replace(/[?#].*$/, "").replace(/\/$/, "").toLowerCase();
const seenCatalogIds = new Set();
const seenCatalogUrls = new Set();
for (const record of catalogRecords) {
  if (!record.id || !record.title || !record.provider || !record.url) errors.push(`Incomplete catalog record: ${record.id || record.title || "unknown"}`);
  if (seenCatalogIds.has(record.id)) errors.push(`Duplicate catalog id: ${record.id}`);
  seenCatalogIds.add(record.id);
  const canonicalUrl = normalizeUrl(record.url);
  if (seenCatalogUrls.has(canonicalUrl)) errors.push(`Duplicate catalog URL: ${canonicalUrl}`);
  seenCatalogUrls.add(canonicalUrl);
}

if (catalogCount !== registry.summary.catalog_records) {
  errors.push(`Catalog summary says ${registry.summary.catalog_records}, datasets contain ${catalogCount}`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  const statusCounts = registry.sources.reduce((counts, source) => {
    counts[source.status] = (counts[source.status] || 0) + 1;
    return counts;
  }, {});
  console.log(JSON.stringify({
    asOf: registry.as_of,
    catalogRecords: catalogCount,
    itemLevelImports: indexedItems,
    sourcesTracked: registry.sources.length,
    productImprovementsTracked: registry.product_backlog?.length || 0,
    statusCounts,
    nextPriority: registry.sources.filter((source) => source.status !== "indexed").sort((a, b) => a.priority - b.priority)[0]?.id,
  }, null, 2));
}
