import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);
const directory = JSON.parse(await readFile(new URL("data/states.json", ROOT), "utf8"));
const stateProfiles = JSON.parse(await readFile(new URL("data/state_profiles.json", ROOT), "utf8"));
const stateNaepScores = JSON.parse(await readFile(new URL("data/state_naep_scores.json", ROOT), "utf8"));
const stateByAbbreviation = new Map(directory.states.map((state) => [state.abbreviation, state.name]));
const errors = [];
const seen = new Set();

for (const profile of stateProfiles.profiles) {
  if (seen.has(profile.abbreviation)) errors.push(`Duplicate state profile: ${profile.abbreviation}`);
  seen.add(profile.abbreviation);
  if (stateByAbbreviation.get(profile.abbreviation) !== profile.state) errors.push(`${profile.abbreviation}: state name does not match the directory`);
  if (!profile.salary?.source_url || !profile.standards?.source_url || !profile.outcomes?.source_url || !profile.working_conditions?.source_url) errors.push(`${profile.abbreviation}: missing an official source`);
  if (!profile.salary?.occupations?.length) errors.push(`${profile.abbreviation}: missing salary occupations`);
  for (const occupation of profile.salary?.occupations || []) {
    if (!(occupation.p10 <= occupation.median && occupation.median <= occupation.p90)) errors.push(`${profile.abbreviation}: invalid wage percentile order for ${occupation.occupation_code}`);
  }
  if (profile.outcomes?.metrics?.length !== 4) errors.push(`${profile.abbreviation}: expected four NAEP reading/math grade 4/8 metrics`);
  for (const metric of profile.outcomes?.metrics || []) {
    if (!Number.isFinite(metric.score_exact) || !metric.national_comparison) errors.push(`${profile.abbreviation}: missing NAEP comparison context for ${metric.subject} grade ${metric.grade}`);
    if (!(metric.score_rank >= 1 && metric.score_rank <= metric.comparison_count)) errors.push(`${profile.abbreviation}: invalid score position for ${metric.subject} grade ${metric.grade}`);
    if (!(metric.proficiency_rank >= 1 && metric.proficiency_rank <= metric.comparison_count)) errors.push(`${profile.abbreviation}: invalid proficiency position for ${metric.subject} grade ${metric.grade}`);
  }
}

if (stateNaepScores.states?.length !== 50) errors.push(`Expected 50 state NAEP profiles, found ${stateNaepScores.states?.length || 0}`);
for (const profile of stateNaepScores.states || []) {
  if (stateByAbbreviation.get(profile.abbreviation) !== profile.state) errors.push(`${profile.abbreviation}: NAEP state name does not match the directory`);
  if (profile.metrics?.length !== 4) errors.push(`${profile.abbreviation}: expected four NAEP metrics`);
  for (const metric of profile.metrics || []) {
    if (!(metric.score_rank >= 1 && metric.score_rank <= 51)) errors.push(`${profile.abbreviation}: invalid NAEP score position`);
    if (!(metric.proficiency_rank >= 1 && metric.proficiency_rank <= 51)) errors.push(`${profile.abbreviation}: invalid NAEP proficiency position`);
    if (!metric.national_comparison || !metric.snapshot_url) errors.push(`${profile.abbreviation}: incomplete NAEP context`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ asOf: stateProfiles.as_of, fullProfiles: stateProfiles.profiles.length, naepProfiles: stateNaepScores.states.length, states: stateProfiles.profiles.map((profile) => profile.abbreviation) }, null, 2));
}
