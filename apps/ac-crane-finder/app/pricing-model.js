/**
 * Editable planning rates transcribed from the supplied AC Crane & Sign Service
 * rate sheet (effective April 1, 2026). These are estimates, not quotes.
 */
export const DEFAULT_RATE_GROUPS = Object.freeze([
  Object.freeze({ id: "87ft", label: "87 ft · 2 ton", models: Object.freeze(["AC87", "AC80"]), hourlyRate: 240, minimumHours: 3 }),
  Object.freeze({ id: "167ft", label: "167 ft · 5 ton", models: Object.freeze(["AC167", "AC170", "AC168"]), hourlyRate: 260, minimumHours: 3 }),
  Object.freeze({ id: "160ft", label: "160 ft · 15 ton", models: Object.freeze(["AC160", "AC140"]), hourlyRate: 280, minimumHours: 4 }),
  Object.freeze({ id: "184ft", label: "184 ft · 30 ton", models: Object.freeze(["AC180"]), hourlyRate: 340, minimumHours: 4 }),
  Object.freeze({ id: "204ft", label: "204 ft · 30 ton", models: Object.freeze(["AC200"]), hourlyRate: 350, minimumHours: 4 }),
]);

export function cloneDefaultRateGroups() {
  return DEFAULT_RATE_GROUPS.map((group) => ({ ...group, models: [...group.models] }));
}

export function estimateRentalCost(model, requestedHours, rateGroups = DEFAULT_RATE_GROUPS) {
  const group = rateGroups.find((candidate) => candidate.models.includes(model));
  if (!group || !Number.isFinite(requestedHours) || requestedHours <= 0) return null;

  const billableHours = Math.max(requestedHours, group.minimumHours);
  return {
    group,
    requestedHours,
    billableHours,
    baseEstimate: billableHours * group.hourlyRate,
  };
}
