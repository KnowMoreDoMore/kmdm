import { readFile, writeFile } from "node:fs/promises";

const STATES = new URL("../data/states.json", import.meta.url);
const OUTPUT = new URL("../data/us_states_geo.json", import.meta.url);
const VERIFIED = "2026-09-26";
const SOURCE = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

const stateDirectory = JSON.parse(await readFile(STATES, "utf8"));
const statesByName = new Map(stateDirectory.states.map((state) => [state.name, state]));

const response = await fetch(SOURCE, { headers: { "User-Agent": "TeacherResourceExchange/1.0 (state display geometry)" } });
if (!response.ok) throw new Error(`${response.status} ${response.statusText}: us-atlas state topology`);
const topology = await response.json();

function decodeArc(index) {
  const arc = topology.arcs[index < 0 ? ~index : index];
  let x = 0;
  let y = 0;
  const points = arc.map(([deltaX, deltaY]) => {
    x += deltaX;
    y += deltaY;
    return [
      Number((x * topology.transform.scale[0] + topology.transform.translate[0]).toFixed(4)),
      Number((y * topology.transform.scale[1] + topology.transform.translate[1]).toFixed(4)),
    ];
  });
  return index < 0 ? points.reverse() : points;
}

function decodeRing(arcIndexes) {
  return arcIndexes.flatMap((index, position) => {
    const points = decodeArc(index);
    return position === 0 ? points : points.slice(1);
  });
}

function decodeGeometry(geometry) {
  if (geometry.type === "Polygon") return { type: "Polygon", coordinates: geometry.arcs.map(decodeRing).filter((ring) => ring.length >= 4) };
  if (geometry.type === "MultiPolygon") return {
    type: "MultiPolygon",
    coordinates: geometry.arcs
      .map((polygon) => polygon.map(decodeRing).filter((ring) => ring.length >= 4))
      .filter((polygon) => polygon[0]?.length >= 4),
  };
  throw new Error(`Unsupported state geometry: ${geometry.type}`);
}

const features = topology.objects.states.geometries
  .filter((geometry) => statesByName.has(geometry.properties?.name))
  .map((geometry) => {
    const state = statesByName.get(geometry.properties.name);
    return {
      type: "Feature",
      geometry: decodeGeometry(geometry),
      properties: { NAME: state.name, STUSAB: state.abbreviation, GEOID: String(geometry.id).padStart(2, "0") },
    };
  })
  .sort((a, b) => a.properties.NAME.localeCompare(b.properties.NAME));

if (features.length !== 50) throw new Error(`Expected 50 state geometries, received ${features.length}`);

await writeFile(OUTPUT, `${JSON.stringify({
  type: "FeatureCollection",
  as_of: VERIFIED,
  source: "us-atlas v3 display topology, derived from U.S. Census Bureau cartographic boundaries",
  source_url: "https://github.com/topojson/us-atlas",
  features,
}, null, 2)}\n`);

console.log(JSON.stringify({ imported: features.length, source: "us-atlas v3 / U.S. Census Bureau" }));
