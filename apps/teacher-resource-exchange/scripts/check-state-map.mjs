import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);
const directory = JSON.parse(await readFile(new URL("data/states.json", ROOT), "utf8"));
const map = JSON.parse(await readFile(new URL("data/us_states_geo.json", ROOT), "utf8"));
const errors = [];
const featuresByAbbreviation = new Map(map.features.map((feature) => [feature.properties.STUSAB, feature]));

if (map.features.length !== 50) errors.push(`Expected 50 state features, found ${map.features.length}`);
if (featuresByAbbreviation.size !== 50) errors.push("State abbreviations are not unique");

for (const state of directory.states) {
  const feature = featuresByAbbreviation.get(state.abbreviation);
  if (!feature) {
    errors.push(`Missing geometry for ${state.name}`);
    continue;
  }
  if (feature.properties.NAME !== state.name) errors.push(`${state.abbreviation}: name does not match the state directory`);
  const rings = feature.geometry.type === "Polygon" ? feature.geometry.coordinates : feature.geometry.coordinates.flat();
  if (!rings.length) errors.push(`${state.abbreviation}: no polygon rings`);
  for (const ring of rings) {
    if (ring.length < 4) errors.push(`${state.abbreviation}: polygon ring has fewer than four points`);
    const first = ring[0];
    const last = ring.at(-1);
    if (first?.[0] !== last?.[0] || first?.[1] !== last?.[1]) errors.push(`${state.abbreviation}: polygon ring is not closed`);
    for (const [longitude, latitude] of ring) {
      if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
        errors.push(`${state.abbreviation}: invalid coordinate`);
        break;
      }
    }
  }
}

for (const [abbreviation, minimumParts] of Object.entries({ AK: 10, HI: 5, MI: 2, MD: 2 })) {
  const feature = featuresByAbbreviation.get(abbreviation);
  const parts = feature?.geometry.type === "MultiPolygon" ? feature.geometry.coordinates.length : 1;
  if (parts < minimumParts) errors.push(`${abbreviation}: expected at least ${minimumParts} distinct display polygons, found ${parts}`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    states: map.features.length,
    source: map.source,
    regressionChecks: ["Alaska", "Hawaii", "Michigan", "Maryland"],
  }, null, 2));
}
