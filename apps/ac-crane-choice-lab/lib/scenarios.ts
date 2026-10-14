export type Scenario = {
  id: string;
  title: string;
  category: string;
  site: string;
  loadLb: number;
  horizontalFt: number;
  verticalFt: number;
  ground: string;
  access: string;
  constraint: string;
  detail: string;
};

export const SCENARIOS: readonly Scenario[] = Object.freeze([
  { id: "hvac-54", title: "Rooftop HVAC placement", category: "Rooftop equipment", site: "Two-story commercial building", loadLb: 2400, horizontalFt: 54, verticalFt: 42, ground: "Level asphalt", access: "Open setup", constraint: "Parapet at roof edge", detail: "Unit must land 8 ft inboard of the roof edge." },
  { id: "sign-32", title: "Channel-letter sign install", category: "Sign installation", site: "Retail storefront", loadLb: 900, horizontalFt: 32, verticalFt: 28, ground: "Paved parking lot", access: "Moderate traffic", constraint: "Canopy below work", detail: "Two installers will guide the sign from the roof." },
  { id: "transformer-27", title: "Transformer replacement", category: "Utility equipment", site: "Industrial service yard", loadLb: 9000, horizontalFt: 27, verticalFt: 12, ground: "Compacted gravel", access: "Open setup", constraint: "Occupied facility", detail: "Short pick with tight shutdown window." },
  { id: "truss-72", title: "Roof truss placement", category: "Structural material", site: "New construction", loadLb: 1800, horizontalFt: 72, verticalFt: 44, ground: "Compacted soil", access: "Wide approach", constraint: "Excavation near setup", detail: "Long, wind-sensitive load with a clear landing zone." },
  { id: "generator-33", title: "Emergency generator set", category: "Mechanical equipment", site: "Medical office", loadLb: 6500, horizontalFt: 33, verticalFt: 18, ground: "Level concrete", access: "Narrow driveway", constraint: "Limited tail swing", detail: "Generator lands on a housekeeping pad behind the building." },
  { id: "sign-remove-45", title: "Pole-sign cabinet removal", category: "Sign removal", site: "Roadside business", loadLb: 650, horizontalFt: 45, verticalFt: 35, ground: "Paved shoulder", access: "One-lane closure", constraint: "Overhead communications", detail: "Cabinet weight is confirmed; pole remains in place." },
  { id: "tower-36", title: "Cooling tower replacement", category: "Rooftop equipment", site: "Manufacturing plant", loadLb: 10000, horizontalFt: 36, verticalFt: 55, ground: "Reinforced concrete", access: "Open setup", constraint: "Active production", detail: "Load crosses an occupied low roof before landing." },
  { id: "sculpture-48", title: "Stone sculpture placement", category: "Specialty lift", site: "Municipal plaza", loadLb: 5200, horizontalFt: 48, verticalFt: 26, ground: "Decorative pavers", access: "Restricted setup", constraint: "Underground utilities", detail: "Finish is delicate and final orientation matters." },
  { id: "chiller-44", title: "Rooftop chiller lift", category: "Mechanical equipment", site: "Four-story office", loadLb: 7800, horizontalFt: 44, verticalFt: 63, ground: "Level asphalt", access: "Street setup", constraint: "Pedestrian control", detail: "Rigging weight is included; landing frame is ready." },
  { id: "landing-42", title: "Steel stair landing", category: "Structural steel", site: "Building addition", loadLb: 3800, horizontalFt: 42, verticalFt: 34, ground: "Compacted fill", access: "Open setup", constraint: "Wall blocks visibility", detail: "Operator will rely on a qualified signal person." },
  { id: "rooftop-sign-58", title: "Rooftop sign structure", category: "Sign installation", site: "Seven-story hotel", loadLb: 700, horizontalFt: 58, verticalFt: 72, ground: "Street pavement", access: "Lane closure", constraint: "Wind exposure", detail: "Light load, but the roof setback drives the reach." },
  { id: "light-pole-36", title: "Parking-lot light pole", category: "Pole installation", site: "Shopping center", loadLb: 1100, horizontalFt: 36, verticalFt: 48, ground: "Level asphalt", access: "Open parking area", constraint: "Live customer traffic", detail: "Pole is 42 ft long and arrives fully assembled." },
]);

export const SESSION_SIZE = 10;
export const CONFIDENCE_OPTIONS = ["High", "Medium", "Low"] as const;
export const REASON_OPTIONS = ["Capacity margin", "Reach", "Site access", "Availability", "Operator fit"] as const;

export function requiredBoomFt(scenario: Scenario) {
  return Math.round(Math.hypot(scenario.horizontalFt, scenario.verticalFt));
}
