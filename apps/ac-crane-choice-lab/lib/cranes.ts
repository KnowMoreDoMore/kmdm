export type Crane = {
  model: string;
  ratedTons: number;
  minRadiusFt: number;
  maxBoomFt: number;
  capacityAtMinLb: number;
  capacityAtMaxLb: number;
};

export const CRANES: readonly Crane[] = Object.freeze([
  { model: "AC87", ratedTons: 2, minRadiusFt: 20, maxBoomFt: 60, capacityAtMinLb: 1500, capacityAtMaxLb: 500 },
  { model: "AC80", ratedTons: 2, minRadiusFt: 20, maxBoomFt: 50, capacityAtMinLb: 1500, capacityAtMaxLb: 400 },
  { model: "AC167", ratedTons: 30, minRadiusFt: 20, maxBoomFt: 80, capacityAtMinLb: 6000, capacityAtMaxLb: 700 },
  { model: "AC170", ratedTons: 30, minRadiusFt: 20, maxBoomFt: 80, capacityAtMinLb: 6000, capacityAtMaxLb: 700 },
  { model: "AC168", ratedTons: 30, minRadiusFt: 20, maxBoomFt: 80, capacityAtMinLb: 6000, capacityAtMaxLb: 700 },
  { model: "AC160", ratedTons: 40, minRadiusFt: 20, maxBoomFt: 100, capacityAtMinLb: 9000, capacityAtMaxLb: 1000 },
  { model: "AC140", ratedTons: 40, minRadiusFt: 20, maxBoomFt: 100, capacityAtMinLb: 9000, capacityAtMaxLb: 1000 },
  { model: "AC180", ratedTons: 50, minRadiusFt: 20, maxBoomFt: 120, capacityAtMinLb: 20000, capacityAtMaxLb: 1200 },
  { model: "AC200", ratedTons: 50, minRadiusFt: 20, maxBoomFt: 135, capacityAtMinLb: 20000, capacityAtMaxLb: 750 },
]);

export const CRANE_MODELS = new Set([...CRANES.map((crane) => crane.model), "SITE_REVIEW"]);

export function capacityAtRadius(crane: Crane, radiusFt: number) {
  if (radiusFt <= crane.minRadiusFt) return crane.capacityAtMinLb;
  if (radiusFt > crane.maxBoomFt) return 0;
  const portion = (radiusFt - crane.minRadiusFt) / (crane.maxBoomFt - crane.minRadiusFt);
  return crane.capacityAtMinLb + portion * (crane.capacityAtMaxLb - crane.capacityAtMinLb);
}

export function recommendCrane(loadLb: number, horizontalFt: number, verticalFt: number) {
  const requiredBoomFt = Math.hypot(horizontalFt, verticalFt);
  return CRANES.find((crane) =>
    requiredBoomFt <= crane.maxBoomFt && loadLb <= capacityAtRadius(crane, horizontalFt),
  )?.model ?? "NO_MATCH";
}
