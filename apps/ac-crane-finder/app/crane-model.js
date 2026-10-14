/**
 * Source: Crane Capacity Chart.xlsx, Sheet2!A1:J6.
 * Distances are stored in feet and capacities in pounds, exactly as supplied.
 */
export const CRANES = Object.freeze([
  { model: "AC87", ratedTons: 2, minRadiusFt: 20, maxRadiusFt: 60, capacityAtMinLb: 1500, capacityAtMaxLb: 500 },
  { model: "AC80", ratedTons: 2, minRadiusFt: 20, maxRadiusFt: 50, capacityAtMinLb: 1500, capacityAtMaxLb: 400 },
  { model: "AC167", ratedTons: 30, minRadiusFt: 20, maxRadiusFt: 80, capacityAtMinLb: 6000, capacityAtMaxLb: 700 },
  { model: "AC170", ratedTons: 30, minRadiusFt: 20, maxRadiusFt: 80, capacityAtMinLb: 6000, capacityAtMaxLb: 700 },
  { model: "AC168", ratedTons: 30, minRadiusFt: 20, maxRadiusFt: 80, capacityAtMinLb: 6000, capacityAtMaxLb: 700 },
  { model: "AC160", ratedTons: 40, minRadiusFt: 20, maxRadiusFt: 100, capacityAtMinLb: 9000, capacityAtMaxLb: 1000 },
  { model: "AC140", ratedTons: 40, minRadiusFt: 20, maxRadiusFt: 100, capacityAtMinLb: 9000, capacityAtMaxLb: 1000 },
  { model: "AC180", ratedTons: 50, minRadiusFt: 20, maxRadiusFt: 120, capacityAtMinLb: 20000, capacityAtMaxLb: 1200 },
  { model: "AC200", ratedTons: 50, minRadiusFt: 20, maxRadiusFt: 135, capacityAtMinLb: 20000, capacityAtMaxLb: 750 },
]);

export const FT_PER_M = 3.280839895;
export const LB_PER_METRIC_TON = 2204.622622;

/**
 * Linear interpolation between the two spreadsheet capacity anchors.
 * No extrapolation is allowed outside the supplied radius range.
 */
export function capacityAtRadius(crane, radiusFt) {
  if (!Number.isFinite(radiusFt) || radiusFt < crane.minRadiusFt || radiusFt > crane.maxRadiusFt) {
    return null;
  }
  const position =
    (radiusFt - crane.minRadiusFt) / (crane.maxRadiusFt - crane.minRadiusFt);
  return crane.capacityAtMinLb + position * (crane.capacityAtMaxLb - crane.capacityAtMinLb);
}

export function sameCraneConfiguration(a, b) {
  return a.ratedTons === b.ratedTons
    && a.minRadiusFt === b.minRadiusFt
    && a.maxRadiusFt === b.maxRadiusFt
    && a.capacityAtMinLb === b.capacityAtMinLb
    && a.capacityAtMaxLb === b.capacityAtMaxLb;
}

export function evaluateFleet({ heightFt, radiusFt, loadLb, maxUtilization }) {
  const requiredBoomFt = Math.hypot(heightFt, radiusFt);
  const rows = CRANES.map((crane) => {
    const estimatedCapacityLb = capacityAtRadius(crane, radiusFt);
    const radiusCovered = estimatedCapacityLb !== null;
    const reaches = Number.isFinite(requiredBoomFt) && requiredBoomFt <= crane.maxRadiusFt;
    const utilization = estimatedCapacityLb && loadLb > 0
      ? (loadLb / estimatedCapacityLb) * 100
      : null;
    const qualifies = Boolean(
      radiusCovered &&
      reaches &&
      utilization !== null &&
      utilization <= maxUtilization,
    );

    let reason = "Preliminary match";
    if (!radiusCovered) reason = radiusFt < crane.minRadiusFt ? "Below modelled radius" : "Radius exceeds reach";
    else if (!reaches) reason = "Height + radius exceed reach";
    else if (utilization === null) reason = "Load is invalid";
    else if (utilization > maxUtilization) reason = "Estimated capacity is insufficient";

    return { crane, estimatedCapacityLb, radiusCovered, reaches, utilization, qualifies, reason };
  });

  const matches = rows
    .filter((row) => row.qualifies)
    .sort(
      (a, b) =>
        a.crane.ratedTons - b.crane.ratedTons ||
        (a.estimatedCapacityLb ?? 0) - (b.estimatedCapacityLb ?? 0) ||
        a.crane.maxRadiusFt - b.crane.maxRadiusFt ||
        a.crane.model.localeCompare(b.crane.model),
    );

  return { rows, matches, best: matches[0] ?? null, requiredBoomFt };
}
