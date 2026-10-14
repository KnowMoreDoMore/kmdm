"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  BookOpen,
  Check,
  ClipboardCheck,
  CloudSun,
  Clock3,
  ExternalLink,
  Feather,
  GraduationCap,
  Landmark,
  Library,
  List,
  Map as MapIcon,
  MapPin,
  Network,
  Palette,
  Plane,
  Search,
  ShieldCheck,
  Shuffle,
  SlidersHorizontal,
  TimerReset,
  Trophy,
  UsersRound,
  Vote,
  Wrench,
  X,
} from "lucide-react";

import resourceData from "@/data/teacher_resources.json";
import nasaResourceData from "@/data/nasa_stem_resources.json";
import locResourceData from "@/data/loc_classroom_resources.json";
import noaaFisheriesData from "@/data/noaa_fisheries_resources.json";
import npsLessonData from "@/data/nps_lesson_resources.json";
import noaaSeaToSkyData from "@/data/noaa_sea_to_sky_resources.json";
import smithsonianLearningLabData from "@/data/smithsonian_learning_lab_resources.json";
import nationalArchivesLessonData from "@/data/national_archives_lesson_resources.json";
import stateData from "@/data/states.json";
import stateGeoData from "@/data/us_states_geo.json";
import stateProfileData from "@/data/state_profiles.json";
import stateNaepData from "@/data/state_naep_scores.json";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type ResourceRecord = {
  id: string;
  title: string;
  provider: string;
  sourceType: string;
  category: "Teach" | "Student opportunity" | "Educator growth";
  audience: string[];
  gradeBands: string[];
  subjects: string[];
  topics: string[];
  resourceType: string;
  summary: string;
  implementationStyle: string[];
  time: string;
  timeBucket: string;
  prep: string;
  standards: string[];
  standardsNote: string;
  cost: string;
  access: string;
  formats: string[];
  materials: string;
  availability: string;
  url: string;
  verified: string;
  featured: boolean;
  readyTomorrow: boolean;
  keywords?: string[];
  deadline?: string;
  cycleStatus?: string;
};

type Filters = {
  query: string;
  grade: string;
  subject: string;
  category: string;
  resourceType: string;
  timeBucket: string;
  sourceGroup: string;
  topic: string;
  standard: string;
  provider: string;
  implementation: string;
  format: string;
  accessGroup: string;
  state: string;
  standardsOnly: boolean;
  readyTomorrow: boolean;
  noAccount: boolean;
};

type SuggestionForm = {
  title: string;
  url: string;
  provider: string;
  resourceKind: string;
  whyUseful: string;
  submitterRole: string;
  submitterEmail: string;
  website: string;
};

type Coordinate = [number, number];
type StateFeature = {
  type: "Feature";
  properties: { NAME: string; STUSAB: string; GEOID: string };
  geometry: { type: "Polygon"; coordinates: Coordinate[][] } | { type: "MultiPolygon"; coordinates: Coordinate[][][] };
};
type StateProfile = (typeof stateProfileData.profiles)[number];
type StateNaepProfile = (typeof stateNaepData.states)[number];

type Bounds = { minX: number; minY: number; maxX: number; maxY: number };
type MapBox = { x: number; y: number; width: number; height: number };

const resources = [...resourceData.records, ...nasaResourceData.records, ...locResourceData.records, ...noaaFisheriesData.records, ...npsLessonData.records, ...noaaSeaToSkyData.records, ...smithsonianLearningLabData.records, ...nationalArchivesLessonData.records] as ResourceRecord[];
const catalogAsOf = [resourceData.as_of, nasaResourceData.as_of, locResourceData.as_of, noaaFisheriesData.as_of, npsLessonData.as_of, noaaSeaToSkyData.as_of, smithsonianLearningLabData.as_of, nationalArchivesLessonData.as_of].sort().at(-1)!;
const states = stateData.states as { name: string; abbreviation: string }[];
const stateFeatures = stateGeoData.features as StateFeature[];
const stateProfiles = stateProfileData.profiles as StateProfile[];
const stateProfileByAbbreviation = new Map(stateProfiles.map((profile) => [profile.abbreviation, profile]));
const stateNaepProfiles = stateNaepData.states as StateNaepProfile[];
const stateNaepByAbbreviation = new Map(stateNaepProfiles.map((profile) => [profile.abbreviation, profile]));
const ALL = "All";
const grades = ["Pre-K", "K–2", "3–5", "6–8", "9–12", "Postsecondary"];
const categories = ["Teach", "Student opportunity", "Educator growth"];
const timeBuckets = ["Under 30 minutes", "One class period", "Extended block", "Multi-day", "Multi-week", "Semester / year", "Flexible / varies"];
const sourceGroups = ["Federal / national", "State resource", "Free organization"];
const accessGroups = ["No sign-in", "Optional account", "Registration required", "Program-dependent"];
const emptySuggestion: SuggestionForm = { title: "", url: "", provider: "", resourceKind: "Not sure", whyUseful: "", submitterRole: "", submitterEmail: "", website: "" };

const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
const subjects = unique(resources.flatMap((item) => item.subjects));
const resourceTypes = unique(resources.map((item) => item.resourceType));
const topics = unique(resources.flatMap((item) => item.topics));
const standards = unique(resources.flatMap((item) => item.standards));
const providers = unique(resources.map((item) => item.provider));
const implementations = unique(resources.flatMap((item) => item.implementationStyle));
const formats = unique(resources.flatMap((item) => item.formats));
const detailedStates = unique(states.filter((state) => resources.some((item) => item.availability.includes(state.name) && !/nationwide/i.test(item.availability))).map((state) => state.name));
const emptyFilters: Filters = { query: "", grade: ALL, subject: ALL, category: ALL, resourceType: ALL, timeBucket: ALL, sourceGroup: ALL, topic: ALL, standard: ALL, provider: ALL, implementation: ALL, format: ALL, accessGroup: ALL, state: ALL, standardsOnly: false, readyTomorrow: false, noAccount: false };
const interestPaths = [
  { title: "Stories & primary sources", note: "Archives, oral histories, and creative reading", query: "primary sources", icon: Feather },
  { title: "Money & real life", note: "Budgeting, investing, work, and consumer skills", query: "financial", icon: Banknote },
  { title: "Health & preparedness", note: "Well-being, safety, and emergency readiness", query: "safety", icon: ShieldCheck },
  { title: "Civics & public life", note: "Government, rights, elections, and participation", query: "civics", icon: Vote },
  { title: "Art & creativity", note: "Visual art, music, poetry, and making", query: "art", icon: Palette },
  { title: "Invention & design", note: "Build, test, code, and solve real problems", query: "design", icon: Wrench },
  { title: "Earth, weather & outdoors", note: "Climate, oceans, parks, and live data", query: "weather", icon: CloudSun },
  { title: "Flight & future careers", note: "Aviation lessons, challenges, and pathways", query: "aviation", icon: Plane },
] as const;

const stateContactUrl = (abbreviation: string) => `https://www.ed.gov/about/contact-us/state-contacts/${abbreviation.toLowerCase()}`;

function featureRings(feature: StateFeature) {
  return feature.geometry.type === "Polygon" ? feature.geometry.coordinates : feature.geometry.coordinates.flat();
}

function normalizeLongitude(longitude: number, center: number) {
  let normalized = longitude;
  while (normalized - center > 180) normalized -= 360;
  while (normalized - center < -180) normalized += 360;
  return normalized;
}

function albersConic([longitude, latitude]: Coordinate, phi1Degrees: number, phi2Degrees: number, phi0Degrees: number, lambda0Degrees: number): Coordinate {
  const radians = Math.PI / 180;
  const phi = latitude * radians;
  const lambda = normalizeLongitude(longitude, lambda0Degrees) * radians;
  const phi1 = phi1Degrees * radians;
  const phi2 = phi2Degrees * radians;
  const phi0 = phi0Degrees * radians;
  const lambda0 = lambda0Degrees * radians;
  const n = (Math.sin(phi1) + Math.sin(phi2)) / 2;
  const c = Math.cos(phi1) ** 2 + 2 * n * Math.sin(phi1);
  const rho = Math.sqrt(c - 2 * n * Math.sin(phi)) / n;
  const rho0 = Math.sqrt(c - 2 * n * Math.sin(phi0)) / n;
  const theta = n * (lambda - lambda0);
  return [rho * Math.sin(theta), -(rho0 - rho * Math.cos(theta))];
}

function albersUs(coordinate: Coordinate): Coordinate {
  return albersConic(coordinate, 29.5, 45.5, 37.5, -96);
}

function albersAlaska(coordinate: Coordinate): Coordinate {
  return albersConic(coordinate, 55, 65, 62, -154);
}

function hawaiiInset([longitude, latitude]: Coordinate): Coordinate {
  return [normalizeLongitude(longitude, -157) * Math.cos(20.8 * Math.PI / 180), -latitude];
}

function boundsFor(features: StateFeature[], projection: (coordinate: Coordinate) => Coordinate): Bounds {
  const bounds: Bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const feature of features) for (const ring of featureRings(feature)) for (const coordinate of ring) {
    const [x, y] = projection(coordinate);
    bounds.minX = Math.min(bounds.minX, x); bounds.minY = Math.min(bounds.minY, y);
    bounds.maxX = Math.max(bounds.maxX, x); bounds.maxY = Math.max(bounds.maxY, y);
  }
  return bounds;
}

function fitPoint(point: Coordinate, bounds: Bounds, box: MapBox): Coordinate {
  const width = Math.max(bounds.maxX - bounds.minX, 0.0001);
  const height = Math.max(bounds.maxY - bounds.minY, 0.0001);
  const scale = Math.min(box.width / width, box.height / height);
  const offsetX = box.x + (box.width - width * scale) / 2;
  const offsetY = box.y + (box.height - height * scale) / 2;
  return [offsetX + (point[0] - bounds.minX) * scale, offsetY + (point[1] - bounds.minY) * scale];
}

const lowerFeatures = stateFeatures.filter((feature) => !["AK", "HI"].includes(feature.properties.STUSAB));
const lowerBounds = boundsFor(lowerFeatures, albersUs);
const insetProjection: Record<string, (coordinate: Coordinate) => Coordinate> = { AK: albersAlaska, HI: hawaiiInset };
const insetBounds = Object.fromEntries(["AK", "HI"].map((abbreviation) => {
  const feature = stateFeatures.find((item) => item.properties.STUSAB === abbreviation)!;
  return [abbreviation, boundsFor([feature], insetProjection[abbreviation])];
})) as Record<string, Bounds>;
const mapBoxes: Record<string, MapBox> = {
  lower: { x: 20, y: 18, width: 780, height: 352 },
  AK: { x: 42, y: 386, width: 218, height: 98 },
  HI: { x: 288, y: 423, width: 142, height: 52 },
};

function projectStatePoint(coordinate: Coordinate, abbreviation: string): Coordinate {
  if (abbreviation === "AK" || abbreviation === "HI") return fitPoint(insetProjection[abbreviation](coordinate), insetBounds[abbreviation], mapBoxes[abbreviation]);
  return fitPoint(albersUs(coordinate), lowerBounds, mapBoxes.lower);
}

function statePath(feature: StateFeature) {
  return featureRings(feature).map((ring) => ring.map((coordinate, index) => {
    const [x, y] = projectStatePoint(coordinate, feature.properties.STUSAB);
    return `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ") + " Z").join(" ");
}

function stateLabel(feature: StateFeature) {
  const projectedRings = featureRings(feature).map((ring) => ring.map((coordinate) => projectStatePoint(coordinate, feature.properties.STUSAB)));
  const ringArea = (ring: Coordinate[]) => Math.abs(ring.reduce((area, point, index) => {
    const next = ring[(index + 1) % ring.length];
    return area + point[0] * next[1] - next[0] * point[1];
  }, 0) / 2);
  const primary = projectedRings.reduce((largest, ring) => ringArea(ring) > ringArea(largest) ? ring : largest, projectedRings[0]);
  const bounds = boundsFor([{ ...feature, geometry: { type: "Polygon", coordinates: [primary] } } as StateFeature], (coordinate) => coordinate);
  return { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2, width: bounds.maxX - bounds.minX, height: bounds.maxY - bounds.minY };
}

const mappedStates = stateFeatures.map((feature) => ({ feature, path: statePath(feature), label: stateLabel(feature) }));

const formatCurrency = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

function StateProfilePreview({ profile }: { profile: StateProfile }) {
  return <div className="mt-4 space-y-4">
    <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4"><div className="flex items-center justify-between gap-3"><h4 className="font-black text-slate-950">Teacher pay</h4><span className="text-xs font-black uppercase tracking-[0.1em] text-cyan-800">{profile.salary.period}</span></div><p className="mt-1 text-xs leading-5 text-slate-600">Median, with the BLS 10th–90th percentile range</p><div className="mt-3 space-y-2">{profile.salary.occupations.map((occupation) => <div key={occupation.occupation_code} className="rounded-lg bg-white p-2.5"><div className="flex items-baseline justify-between gap-3"><span className="text-sm font-bold text-slate-800">{occupation.label.replace(" school teachers", "")}</span><strong className="text-sm text-slate-950">{formatCurrency(occupation.median)}</strong></div><div className="mt-1 text-xs text-slate-500">{formatCurrency(occupation.p10)}–{formatCurrency(occupation.p90)}</div></div>)}</div><a href={profile.salary.source_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-black text-blue-700">BLS source <ExternalLink className="size-3" /></a></div>
    <div><p className="text-xs font-black uppercase tracking-[0.12em] text-blue-700">Standards</p><p className="mt-1 text-sm font-black text-slate-950">{profile.standards.system}</p><p className="mt-1 text-xs leading-5 text-slate-600">{profile.standards.science}</p><a href={profile.standards.source_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-black text-blue-700">Official standards <ExternalLink className="size-3" /></a></div>
    <div><div className="flex items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.12em] text-blue-700">Student outcomes</p><p className="mt-1 text-sm font-black text-slate-950">NAEP 2024 scores and positions</p></div><a href={profile.outcomes.source_url} target="_blank" rel="noreferrer" className="text-xs font-black text-blue-700">Source</a></div><div className="mt-2 grid grid-cols-2 gap-2">{profile.outcomes.metrics.map((metric) => <a key={`${metric.subject}-${metric.grade}`} href={metric.snapshot_url} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 hover:border-blue-300"><span className="block text-xs font-bold text-slate-600">{metric.subject} · G{metric.grade}</span><strong className="mt-1 block text-xl text-slate-950">{metric.score}</strong><span className="block text-xs leading-4 text-slate-500">U.S. {metric.national_score} · {metric.at_or_above_proficient}% proficient+</span><span className="mt-1.5 block text-xs font-black text-blue-800">Score position {metric.score_rank}/{metric.comparison_count}</span><span className="block text-xs text-slate-600">Proficiency position {metric.proficiency_rank}/{metric.comparison_count}</span><span className="mt-1 block text-xs leading-4 text-slate-500">{metric.national_comparison}</span></a>)}</div><p className="mt-2 text-xs leading-5 text-slate-500">Positions order unrounded scores across the 50 states and D.C. They are descriptive—not proof that neighboring states differ statistically—and are not a teacher-quality rating.</p></div>
    <details className="rounded-lg border border-slate-200 bg-slate-50 p-3"><summary className="cursor-pointer text-sm font-black text-slate-800">Teacher working conditions</summary><p className="mt-2 text-xs leading-5 text-slate-600">{profile.working_conditions.summary}</p><a href={profile.working_conditions.source_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-black text-blue-700">NCES NTPS source <ExternalLink className="size-3" /></a></details>
  </div>;
}

function StateNaepSnapshot({ profile }: { profile: StateNaepProfile }) {
  return <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3"><div className="flex items-center justify-between gap-2"><p className="text-xs font-black uppercase tracking-[0.1em] text-blue-800">NAEP 2024</p><a href={stateNaepData.source_url} target="_blank" rel="noreferrer" className="text-xs font-black text-blue-700">Source</a></div><div className="mt-2 grid grid-cols-2 gap-2">{profile.metrics.map((metric) => <a key={`${metric.subject}-${metric.grade}`} href={metric.snapshot_url} target="_blank" rel="noreferrer" className="rounded-lg bg-white p-2 shadow-sm"><span className="block text-xs font-bold text-slate-600">{metric.subject === "Mathematics" ? "Math" : "Reading"} · G{metric.grade}</span><span className="mt-0.5 flex items-baseline justify-between gap-1"><strong className="text-base text-slate-950">{metric.score}</strong><span className="text-xs font-black text-blue-800">#{metric.score_rank}/51</span></span><span className="block text-xs leading-4 text-slate-500">{metric.at_or_above_proficient}% proficient+</span></a>)}</div><p className="mt-2 text-xs leading-4 text-slate-500">Raw-score position among 50 states + D.C.; open a card for the official snapshot. Rankings may not be statistically distinct.</p></div>;
}

function sourceGroup(item: ResourceRecord) {
  if (/state agency/i.test(item.sourceType) || detailedStates.some((state) => item.availability === state)) return "State resource";
  if (/federal|national archives|smithsonian|national gallery|united states courts|u\.s\. house/i.test(`${item.sourceType} ${item.provider}`)) return "Federal / national";
  return "Free organization";
}

function accessGroup(item: ResourceRecord) {
  const access = item.access.toLowerCase();
  if (/optional|account helpful|account to create|account to save|create and assign|email is optional/.test(access)) return "Optional account";
  if (/account required|registration.*required|create a free profile|must register|team registration required/.test(access)) return "Registration required";
  if (/var(?:y|ies)|application|nomination|reservation|required to participate|required through|school participation|direct contact|eligibility|permission|local academy|local sponsoring/.test(access)) return "Program-dependent";
  if (/no account needed|no sign-in|browse without account/.test(access)) return "No sign-in";
  return "Program-dependent";
}

function accessBadgeClass(group: string) {
  if (group === "No sign-in") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (group === "Optional account") return "border-cyan-200 bg-cyan-50 text-cyan-900";
  if (group === "Registration required") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}

function applyFilters(records: ResourceRecord[], filters: Filters) {
  const needles = filters.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return records.filter((item) => {
    const gradeAliases = item.gradeBands.flatMap((band) => ({ "Pre-K": ["prek", "pre-k", "preschool"], "K–2": ["kindergarten", "first grade", "second grade", "grade 1", "grade 2", "elementary"], "3–5": ["third grade", "fourth grade", "fifth grade", "grade 3", "grade 4", "grade 5", "elementary"], "6–8": ["sixth grade", "seventh grade", "eighth grade", "grade 6", "grade 7", "grade 8", "middle school"], "9–12": ["ninth grade", "tenth grade", "eleventh grade", "twelfth grade", "grade 9", "grade 10", "grade 11", "grade 12", "high school"], "Postsecondary": ["college", "postsecondary", "higher education"] }[band] || []));
    const searchable = [item.title, item.provider, item.sourceType, item.category, item.resourceType, item.summary, ...item.gradeBands, ...gradeAliases, ...item.subjects, ...item.topics, ...(item.keywords || []), ...item.implementationStyle, ...item.standards, item.time, item.prep, item.availability].join(" ").toLowerCase();
    const searchableTerms = searchable.split(/[^a-z0-9]+/).filter(Boolean);
    return (needles.length === 0 || needles.every((needle) => needle.length <= 4 ? searchableTerms.includes(needle) : searchable.includes(needle))) &&
      (filters.grade === ALL || item.gradeBands.includes(filters.grade)) &&
      (filters.subject === ALL || item.subjects.includes(filters.subject)) &&
      (filters.category === ALL || item.category === filters.category) &&
      (filters.resourceType === ALL || item.resourceType === filters.resourceType) &&
      (filters.timeBucket === ALL || item.timeBucket === filters.timeBucket) &&
      (filters.sourceGroup === ALL || sourceGroup(item) === filters.sourceGroup) &&
      (filters.topic === ALL || item.topics.includes(filters.topic)) &&
      (filters.standard === ALL || item.standards.includes(filters.standard)) &&
      (filters.provider === ALL || item.provider === filters.provider) &&
      (filters.implementation === ALL || item.implementationStyle.includes(filters.implementation)) &&
      (filters.format === ALL || item.formats.includes(filters.format)) &&
      (filters.accessGroup === ALL || accessGroup(item) === filters.accessGroup) &&
      (filters.state === ALL || item.availability.includes(filters.state)) &&
      (!filters.standardsOnly || item.standards.length > 0) &&
      (!filters.readyTomorrow || item.readyTomorrow) &&
      (!filters.noAccount || accessGroup(item) === "No sign-in");
  });
}

function sourceBadgeClass(group: string) {
  if (group === "Federal / national") return "border-blue-200 bg-blue-50 text-blue-800";
  if (group === "State resource") return "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800";
  return "border-teal-200 bg-teal-50 text-teal-800";
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return <div className="grid gap-1 border-t border-slate-200 py-3.5 sm:grid-cols-[150px_1fr] sm:gap-5"><dt className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</dt><dd className="text-sm leading-6 text-slate-700">{children || "Not specified"}</dd></div>;
}

function ResourceCard({ item, onOpen }: { item: ResourceRecord; onOpen: (item: ResourceRecord) => void }) {
  const group = sourceGroup(item);
  const signIn = accessGroup(item);
  return (
    <article className="resource-card group flex h-full flex-col rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-[0_10px_34px_rgb(20_35_60/6%)] transition duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[0_18px_50px_rgb(20_35_60/11%)] sm:p-6">
      <div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className={sourceBadgeClass(group)}>{group}</Badge><Badge variant="outline" className={accessBadgeClass(signIn)}>{signIn}</Badge>{item.standards.length > 0 && <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-900">Standards noted</Badge>}</div>
      <p className="mt-5 text-xs font-black uppercase tracking-[0.13em] text-blue-700">{item.category} · {item.resourceType}</p>
      <h3 className="mt-2 text-[1.35rem] font-black leading-7 tracking-[-0.03em] text-slate-950">{item.title}</h3>
      <p className="mt-1 text-sm font-bold text-blue-700">{item.provider}</p>
      <p className="mt-4 line-clamp-3 text-[0.95rem] leading-6 text-slate-600">{item.summary}</p>
      <dl className="mt-5 grid gap-2.5 border-y border-slate-100 py-4 text-sm text-slate-600"><div className="grid grid-cols-[5rem_1fr] gap-2"><dt className="font-bold text-slate-900">Grades</dt><dd>{item.gradeBands.length ? item.gradeBands.join(" · ") : "Not specified"}</dd></div><div className="grid grid-cols-[5rem_1fr] gap-2"><dt className="font-bold text-slate-900">Time</dt><dd>{item.time}</dd></div><div className="grid grid-cols-[5rem_1fr] gap-2"><dt className="font-bold text-slate-900">Style</dt><dd className="line-clamp-1">{item.implementationStyle.slice(0, 2).join(" · ")}</dd></div></dl>
      <div className="mt-4 flex flex-wrap gap-1.5">{item.subjects.slice(0, 2).map((subject) => <Badge key={subject} variant="secondary" className="bg-slate-100 text-slate-700">{subject}</Badge>)}{item.readyTomorrow && <Badge variant="secondary" className="bg-amber-100 text-amber-900">Ready for tomorrow</Badge>}</div>
      <div className="mt-auto flex items-center justify-between gap-3 pt-5"><span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500"><ShieldCheck className="size-3.5 text-emerald-600" />Checked {formatDate(item.verified)}</span><Button variant="outline" size="sm" className="rounded-full" onClick={() => onOpen(item)}>Details <ArrowRight /></Button></div>
    </article>
  );
}

function FilterPanel({ filters, setFilter, clearFilters }: { filters: Filters; setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void; clearFilters: () => void }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4"><h2 className="text-lg font-black tracking-[-0.02em] text-slate-950">Refine results</h2><button className="text-sm font-bold text-blue-700 hover:text-blue-900" onClick={clearFilters}>Clear all</button></div>
      <label className="block"><span className="filter-label">Grade band</span><NativeSelect value={filters.grade} onChange={(event) => setFilter("grade", event.target.value)} className="h-11 w-full rounded-xl bg-white"><NativeSelectOption value={ALL}>All grades</NativeSelectOption>{grades.map((item) => <NativeSelectOption key={item} value={item}>{item}</NativeSelectOption>)}</NativeSelect></label>
      <label className="block"><span className="filter-label">Subject</span><NativeSelect value={filters.subject} onChange={(event) => setFilter("subject", event.target.value)} className="h-11 w-full rounded-xl bg-white"><NativeSelectOption value={ALL}>All subjects</NativeSelectOption>{subjects.map((item) => <NativeSelectOption key={item} value={item}>{item}</NativeSelectOption>)}</NativeSelect></label>
      <label className="block"><span className="filter-label">Use it for</span><NativeSelect value={filters.category} onChange={(event) => setFilter("category", event.target.value)} className="h-11 w-full rounded-xl bg-white"><NativeSelectOption value={ALL}>Everything</NativeSelectOption>{categories.map((item) => <NativeSelectOption key={item} value={item}>{item}</NativeSelectOption>)}</NativeSelect></label>
      <details className="group rounded-xl border border-slate-200 bg-white p-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-black text-slate-900 marker:content-none">More filters <span className="text-xl leading-none text-blue-700 transition group-open:rotate-45">+</span></summary>
        <div className="mt-5 space-y-5 border-t border-slate-100 pt-5">
          <label className="block"><span className="filter-label">Topic</span><NativeSelect value={filters.topic} onChange={(event) => setFilter("topic", event.target.value)} className="h-11 w-full rounded-xl bg-white"><NativeSelectOption value={ALL}>All topics</NativeSelectOption>{topics.map((item) => <NativeSelectOption key={item} value={item}>{item}</NativeSelectOption>)}</NativeSelect></label>
          <label className="block"><span className="filter-label">Specific standard</span><NativeSelect value={filters.standard} onChange={(event) => setFilter("standard", event.target.value)} className="h-11 w-full rounded-xl bg-white"><NativeSelectOption value={ALL}>All standards</NativeSelectOption>{standards.map((item) => <NativeSelectOption key={item} value={item}>{item}</NativeSelectOption>)}</NativeSelect></label>
          <label className="block"><span className="filter-label">Time needed</span><NativeSelect value={filters.timeBucket} onChange={(event) => setFilter("timeBucket", event.target.value)} className="h-11 w-full rounded-xl bg-white"><NativeSelectOption value={ALL}>Any amount of time</NativeSelectOption>{timeBuckets.map((item) => <NativeSelectOption key={item} value={item}>{item}</NativeSelectOption>)}</NativeSelect></label>
          <label className="block"><span className="filter-label">Resource type</span><NativeSelect value={filters.resourceType} onChange={(event) => setFilter("resourceType", event.target.value)} className="h-11 w-full rounded-xl bg-white"><NativeSelectOption value={ALL}>All types</NativeSelectOption>{resourceTypes.map((item) => <NativeSelectOption key={item} value={item}>{item}</NativeSelectOption>)}</NativeSelect></label>
          <label className="block"><span className="filter-label">Teaching approach</span><NativeSelect value={filters.implementation} onChange={(event) => setFilter("implementation", event.target.value)} className="h-11 w-full rounded-xl bg-white"><NativeSelectOption value={ALL}>Any approach</NativeSelectOption>{implementations.map((item) => <NativeSelectOption key={item} value={item}>{item}</NativeSelectOption>)}</NativeSelect></label>
          <label className="block"><span className="filter-label">Format</span><NativeSelect value={filters.format} onChange={(event) => setFilter("format", event.target.value)} className="h-11 w-full rounded-xl bg-white"><NativeSelectOption value={ALL}>Any format</NativeSelectOption>{formats.map((item) => <NativeSelectOption key={item} value={item}>{item}</NativeSelectOption>)}</NativeSelect></label>
          <label className="block"><span className="filter-label">Source</span><NativeSelect value={filters.sourceGroup} onChange={(event) => setFilter("sourceGroup", event.target.value)} className="h-11 w-full rounded-xl bg-white"><NativeSelectOption value={ALL}>All trusted sources</NativeSelectOption>{sourceGroups.map((item) => <NativeSelectOption key={item} value={item}>{item}</NativeSelectOption>)}</NativeSelect></label>
          <label className="block"><span className="filter-label">Agency / provider</span><NativeSelect value={filters.provider} onChange={(event) => setFilter("provider", event.target.value)} className="h-11 w-full rounded-xl bg-white"><NativeSelectOption value={ALL}>All providers</NativeSelectOption>{providers.map((item) => <NativeSelectOption key={item} value={item}>{item}</NativeSelectOption>)}</NativeSelect></label>
          <label className="block"><span className="filter-label">Sign-in / registration</span><NativeSelect value={filters.accessGroup} onChange={(event) => setFilter("accessGroup", event.target.value)} className="h-11 w-full rounded-xl bg-white"><NativeSelectOption value={ALL}>Any access type</NativeSelectOption>{accessGroups.map((item) => <NativeSelectOption key={item} value={item}>{item}</NativeSelectOption>)}</NativeSelect></label>
          <label className="block"><span className="filter-label">Detailed state catalog</span><NativeSelect value={filters.state} onChange={(event) => setFilter("state", event.target.value)} className="h-11 w-full rounded-xl bg-white"><NativeSelectOption value={ALL}>All locations</NativeSelectOption>{detailedStates.map((item) => <NativeSelectOption key={item} value={item}>{item}</NativeSelectOption>)}</NativeSelect></label>
        </div>
      </details>
      <div className="space-y-3 border-t border-slate-200 pt-5">{[["standardsOnly", "Standards noted", "Provider or official framework is named"], ["readyTomorrow", "Ready for tomorrow", "Low-prep and classroom-ready"], ["noAccount", "No sign-in", "Open the resource without an account or registration"]].map(([key, label, note]) => <label key={key} className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5"><span><span className="block text-sm font-bold text-slate-900">{label}</span><span className="mt-0.5 block text-xs leading-5 text-slate-500">{note}</span></span><Switch checked={Boolean(filters[key as keyof Filters])} onCheckedChange={(checked) => setFilter(key as "standardsOnly" | "readyTomorrow" | "noAccount", checked)} aria-label={label} /></label>)}</div>
    </div>
  );
}

export default function Home() {
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [visibleCount, setVisibleCount] = useState(12);
  const [selected, setSelected] = useState<ResourceRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState("Best match");
  const [stateQuery, setStateQuery] = useState("");
  const [hoveredMapState, setHoveredMapState] = useState<string | null>(null);
  const [selectedMapState] = useState<string | null>("VA");
  const [surpriseIndex, setSurpriseIndex] = useState(0);
  const [suggestion, setSuggestion] = useState<SuggestionForm>(emptySuggestion);
  const [suggestionStatus, setSuggestionStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [suggestionMessage, setSuggestionMessage] = useState("");

  const filtered = useMemo(() => {
    const matches = applyFilters(resources, filters);
    return [...matches].sort((a, b) => {
      if (sort === "A–Z") return a.title.localeCompare(b.title);
      if (sort === "Ready soon") return Number(b.readyTomorrow) - Number(a.readyTomorrow) || a.title.localeCompare(b.title);
      if (sort === "Student deadlines") return (a.deadline || "9999-12-31").localeCompare(b.deadline || "9999-12-31");
      return Number(sourceGroup(b) === "Federal / national") - Number(sourceGroup(a) === "Federal / national") || Number(b.featured) - Number(a.featured) || Number(b.readyTomorrow) - Number(a.readyTomorrow) || a.title.localeCompare(b.title);
    });
  }, [filters, sort]);

  const activeFilterCount = [filters.query, filters.grade !== ALL, filters.subject !== ALL, filters.category !== ALL, filters.resourceType !== ALL, filters.timeBucket !== ALL, filters.sourceGroup !== ALL, filters.topic !== ALL, filters.standard !== ALL, filters.provider !== ALL, filters.implementation !== ALL, filters.format !== ALL, filters.accessGroup !== ALL, filters.state !== ALL, filters.standardsOnly, filters.readyTomorrow, filters.noAccount].filter(Boolean).length;
  const counts = useMemo(() => ({ federal: resources.filter((item) => sourceGroup(item) === "Federal / national").length, state: resources.filter((item) => sourceGroup(item) === "State resource").length, opportunities: resources.filter((item) => item.category === "Student opportunity").length, agencies: unique(resources.filter((item) => sourceGroup(item) === "Federal / national").map((item) => item.provider)).length }), []);
  const visibleStates = states.filter((state) => `${state.name} ${state.abbreviation}`.toLowerCase().includes(stateQuery.trim().toLowerCase()));
  const focusedMapAbbreviation = hoveredMapState || selectedMapState;
  const focusedMapState = focusedMapAbbreviation ? states.find((state) => state.abbreviation === focusedMapAbbreviation) : null;
  const focusedMapProfile = focusedMapAbbreviation ? stateProfileByAbbreviation.get(focusedMapAbbreviation) : null;
  const focusedMapNaep = focusedMapAbbreviation ? stateNaepByAbbreviation.get(focusedMapAbbreviation) : null;
  const focusedMapCount = focusedMapState ? resources.filter((item) => item.availability === focusedMapState.name).length : 0;
  const setMapState = setHoveredMapState;

  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool: (tool: Record<string, unknown>, options?: { signal?: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: Record<string, unknown>) => { try { void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => undefined); } catch { /* Progressive enhancement only. */ } };
    const nextPaint = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    register({ name: "search_teacher_resources", title: "Search teacher resources", description: "Replace the current Teacher Resource Exchange search and filters, then show matching verified resources.", inputSchema: { type: "object", properties: { query: { type: "string" }, grade: { type: "string", enum: [ALL, ...grades] }, subject: { type: "string", enum: [ALL, ...subjects] }, topic: { type: "string", enum: [ALL, ...topics] }, standard: { type: "string", enum: [ALL, ...standards] }, provider: { type: "string", enum: [ALL, ...providers] }, implementation: { type: "string", enum: [ALL, ...implementations] }, format: { type: "string", enum: [ALL, ...formats] }, accessGroup: { type: "string", enum: [ALL, ...accessGroups] }, category: { type: "string", enum: [ALL, ...categories] }, timeBucket: { type: "string", enum: [ALL, ...timeBuckets] }, sourceGroup: { type: "string", enum: [ALL, ...sourceGroups] }, standardsOnly: { type: "boolean" }, readyTomorrow: { type: "boolean" }, noAccount: { type: "boolean" } }, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false }, execute: async (raw: unknown) => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Search filters must be an object.");
      const input = raw as Partial<Filters>;
      const next: Filters = { ...emptyFilters, query: typeof input.query === "string" ? input.query : "", grade: typeof input.grade === "string" && [ALL, ...grades].includes(input.grade) ? input.grade : ALL, subject: typeof input.subject === "string" && [ALL, ...subjects].includes(input.subject) ? input.subject : ALL, topic: typeof input.topic === "string" && [ALL, ...topics].includes(input.topic) ? input.topic : ALL, standard: typeof input.standard === "string" && [ALL, ...standards].includes(input.standard) ? input.standard : ALL, provider: typeof input.provider === "string" && [ALL, ...providers].includes(input.provider) ? input.provider : ALL, implementation: typeof input.implementation === "string" && [ALL, ...implementations].includes(input.implementation) ? input.implementation : ALL, format: typeof input.format === "string" && [ALL, ...formats].includes(input.format) ? input.format : ALL, accessGroup: typeof input.accessGroup === "string" && [ALL, ...accessGroups].includes(input.accessGroup) ? input.accessGroup : ALL, category: typeof input.category === "string" && [ALL, ...categories].includes(input.category) ? input.category : ALL, timeBucket: typeof input.timeBucket === "string" && [ALL, ...timeBuckets].includes(input.timeBucket) ? input.timeBucket : ALL, sourceGroup: typeof input.sourceGroup === "string" && [ALL, ...sourceGroups].includes(input.sourceGroup) ? input.sourceGroup : ALL, standardsOnly: Boolean(input.standardsOnly), readyTomorrow: Boolean(input.readyTomorrow), noAccount: Boolean(input.noAccount) };
      setVisibleCount(12); setFilters(next); document.getElementById("resources")?.scrollIntoView({ behavior: "smooth" }); await nextPaint(); return { matchCount: applyFilters(resources, next).length, filters: next };
    } });
    register({ name: "open_teacher_resource", title: "Open a teacher resource", description: "Open the visible detail panel for one resource by its record ID.", inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"], additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false }, execute: async (raw: unknown) => {
      const id = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as { id?: unknown }).id : undefined;
      if (typeof id !== "string") throw new Error("A resource ID is required.");
      const item = resources.find((record) => record.id === id); if (!item) throw new Error("Resource not found.");
      setSelected(item); setDetailOpen(true); await nextPaint(); return { id: item.id, title: item.title, provider: item.provider };
    } });
    return () => lifecycle.abort();
  }, []);

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) { setVisibleCount(12); setFilters((current) => ({ ...current, [key]: value })); }
  function clearFilters() { setVisibleCount(12); setFilters(emptyFilters); }
  function openResource(item: ResourceRecord) { setSelected(item); setDetailOpen(true); }
  function exploreInterest(query: string) { setVisibleCount(12); setFilters({ ...emptyFilters, query }); requestAnimationFrame(() => document.getElementById("resources")?.scrollIntoView({ behavior: "smooth" })); }
  function surpriseMe() { const pool = resources.filter((item) => item.featured); const item = pool[surpriseIndex % pool.length]; setSurpriseIndex((index) => index + 1); openResource(item); }
  function browseState(stateName: string) { setVisibleCount(12); setFilters({ ...emptyFilters, state: stateName }); requestAnimationFrame(() => document.getElementById("resources")?.scrollIntoView({ behavior: "smooth" })); }
  function applyRoute(route: "teach" | "tomorrow" | "standards" | "students" | "growth" | "federal" | "states") {
    setVisibleCount(12);
    clearFilters();
    if (route === "teach") setFilters((current) => ({ ...current, category: "Teach" }));
    if (route === "tomorrow") setFilters((current) => ({ ...current, category: "Teach", readyTomorrow: true }));
    if (route === "standards") setFilters((current) => ({ ...current, standardsOnly: true }));
    if (route === "students") setFilters((current) => ({ ...current, category: "Student opportunity" }));
    if (route === "growth") setFilters((current) => ({ ...current, category: "Educator growth" }));
    if (route === "federal") setFilters((current) => ({ ...current, sourceGroup: "Federal / national" }));
    if (route === "states") { document.getElementById("states")?.scrollIntoView({ behavior: "smooth" }); return; }
    requestAnimationFrame(() => document.getElementById("resources")?.scrollIntoView({ behavior: "smooth" }));
  }

  function updateSuggestion<K extends keyof SuggestionForm>(key: K, value: SuggestionForm[K]) {
    setSuggestion((current) => ({ ...current, [key]: value }));
    if (suggestionStatus !== "idle") { setSuggestionStatus("idle"); setSuggestionMessage(""); }
  }

  async function submitSuggestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuggestionStatus("saving");
    setSuggestionMessage("");
    try {
      const response = await fetch("/api/resource-suggestions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(suggestion) });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "We could not save that suggestion.");
      setSuggestion(emptySuggestion);
      setSuggestionStatus("saved");
      setSuggestionMessage("Thank you—your suggestion is in the review queue.");
    } catch (error) {
      setSuggestionStatus("error");
      setSuggestionMessage(error instanceof Error ? error.message : "We could not save that suggestion. Please try again.");
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-[#f7f9fd]/95 backdrop-blur"><div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3 sm:px-7 lg:px-10"><a href="#top" className="flex min-w-0 items-center gap-3" aria-label="Teacher Resource Exchange home"><span className="brand-mark grid size-10 shrink-0 place-items-center rounded-xl bg-blue-700 text-white shadow-[0_8px_22px_rgb(29_78_216/24%)]"><Library className="size-5" /></span><span className="min-w-0"><span className="block truncate text-[0.66rem] font-black uppercase tracking-[0.16em] text-blue-700">National educator project</span><span className="block truncate text-[0.96rem] font-black tracking-[-0.025em] text-slate-950 sm:text-[1.05rem]">Teacher Resource Exchange</span></span></a><nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 lg:flex" aria-label="Primary navigation"><a href="#discover" className="hover:text-blue-700">Explore ideas</a><a href="#resources" className="hover:text-blue-700">Find resources</a><a href="#states" className="hover:text-blue-700">All 50 states</a><a href="#contribute" className="hover:text-blue-700">Suggest a resource</a><a href="#trust" className="hover:text-blue-700">How resources are checked</a></nav><Button className="rounded-full bg-blue-700 hover:bg-blue-800" asChild><a href="#resources">Search <Search /></a></Button></div></header>

	      <section id="top" className="relative overflow-hidden border-b border-slate-200 bg-[#f7f9fd]"><div className="catalog-grid absolute inset-0" aria-hidden="true" /><div className="relative mx-auto max-w-[1180px] px-5 py-9 sm:px-8 sm:py-12 lg:px-10"><div className="text-center"><div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-sm font-bold text-emerald-800 shadow-sm"><ShieldCheck className="size-4" />Official sources · checked {formatDate(catalogAsOf)}</div><h1 className="mx-auto mt-4 max-w-3xl text-balance text-[clamp(2.35rem,5vw,4.25rem)] font-black leading-[0.96] tracking-[-0.055em] text-slate-950">What do you need today?</h1><p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">Search {resources.length.toLocaleString()} verified teacher and student resources, or answer three quick questions to narrow the list.</p></div>
	        <div className="mx-auto mt-7 max-w-5xl rounded-[1.4rem] border border-blue-200 bg-white p-4 shadow-[0_22px_65px_rgb(38_70_120/12%)] sm:p-6"><label htmlFor="main-search" className="filter-label">Class, topic, or resource</label><div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3"><Search className="size-5 shrink-0 text-blue-700" /><Input id="main-search" value={filters.query} onChange={(event) => setFilter("query", event.target.value)} className="h-13 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0" placeholder="Try “World War I primary sources,” “weather activity,” or “scholarship”…" />{filters.query && <button className="grid size-9 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-200" onClick={() => setFilter("query", "")} aria-label="Clear search"><X className="size-4" /></button>}</div><div className="mt-4 grid gap-3 sm:grid-cols-3"><label><span className="filter-label">Grade</span><NativeSelect value={filters.grade} onChange={(event) => setFilter("grade", event.target.value)} className="h-11 w-full rounded-xl bg-white"><NativeSelectOption value={ALL}>Any grade</NativeSelectOption>{grades.map((item) => <NativeSelectOption key={item} value={item}>{item}</NativeSelectOption>)}</NativeSelect></label><label><span className="filter-label">Subject</span><NativeSelect value={filters.subject} onChange={(event) => setFilter("subject", event.target.value)} className="h-11 w-full rounded-xl bg-white"><NativeSelectOption value={ALL}>Any subject</NativeSelectOption>{subjects.map((item) => <NativeSelectOption key={item} value={item}>{item}</NativeSelectOption>)}</NativeSelect></label><label><span className="filter-label">I need it for</span><NativeSelect value={filters.category} onChange={(event) => setFilter("category", event.target.value)} className="h-11 w-full rounded-xl bg-white"><NativeSelectOption value={ALL}>Anything</NativeSelectOption>{categories.map((item) => <NativeSelectOption key={item} value={item}>{item}</NativeSelectOption>)}</NativeSelect></label></div><div className="mt-5 flex flex-wrap items-center justify-center gap-3"><Button className="rounded-full bg-blue-700 px-6 hover:bg-blue-800" asChild><a href="#resources">Show {filtered.length.toLocaleString()} matches <ArrowRight /></a></Button><Button variant="outline" className="rounded-full" onClick={surpriseMe}><Shuffle /> Surprise me</Button></div></div>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-bold text-slate-600"><span className="text-slate-400">Or start with:</span><button onClick={() => applyRoute("teach")} className="hover:text-blue-700">Classroom teaching resources</button><button onClick={() => applyRoute("tomorrow")} className="hover:text-blue-700">Ready for tomorrow</button><button onClick={() => applyRoute("states")} className="hover:text-blue-700">Browse by state</button></div></div></section>

      <section id="discover" className="border-b border-slate-200 bg-white"><details className="group mx-auto max-w-[1500px] px-5 py-6 sm:px-8 lg:px-10"><summary className="flex cursor-pointer list-none items-center justify-between gap-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 marker:content-none"><span><span className="eyebrow">Need inspiration?</span><strong className="mt-1 block text-xl text-slate-950">Browse by interest or discover something unexpected.</strong></span><span className="grid size-10 shrink-0 place-items-center rounded-full bg-blue-700 text-2xl font-light text-white transition group-open:rotate-45">+</span></summary><div className="py-8"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow">Explore an interest</p><h2 className="mt-2 text-3xl font-black tracking-[-0.045em] text-slate-950 sm:text-4xl">Find something unexpectedly useful.</h2><p className="mt-2 max-w-2xl text-slate-600">Pick a doorway and browse across agencies, subjects, grade bands, and formats. Each route stays fully filterable.</p></div><Button variant="outline" className="rounded-full border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100" onClick={surpriseMe}><Shuffle /> Surprise me</Button></div><div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{interestPaths.map(({ title, note, query, icon: Icon }) => { const count = applyFilters(resources, { ...emptyFilters, query }).length; return <button key={title} onClick={() => exploreInterest(query)} className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50"><div className="flex items-start justify-between gap-3"><span className="grid size-10 place-items-center rounded-xl bg-white text-blue-700 shadow-sm group-hover:bg-blue-700 group-hover:text-white"><Icon className="size-5" /></span><Badge variant="outline" className="bg-white text-slate-600">{count} finds</Badge></div><h3 className="mt-4 font-black text-slate-950">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{note}</p></button>; })}</div></div></details></section>

      <section id="resources" className="mx-auto max-w-[1500px] px-5 py-11 sm:px-8 lg:px-10 lg:py-14"><div className="flex flex-wrap items-end justify-between gap-5 border-b border-slate-200 pb-6"><div><p className="eyebrow">Resource finder</p><h2 className="mt-2 text-3xl font-black tracking-[-0.045em] text-slate-950 sm:text-4xl">Explore the catalog</h2><p className="mt-2 text-slate-600"><strong className="text-slate-950">{filtered.length}</strong> of {resources.length} verified resources match your search.</p></div><div className="flex items-center gap-2"><Button variant="outline" className="rounded-full lg:hidden" onClick={() => setFiltersOpen(true)}><SlidersHorizontal /> Filters {activeFilterCount > 0 && <span className="rounded-full bg-blue-700 px-1.5 text-xs text-white">{activeFilterCount}</span>}</Button><label className="flex items-center gap-2 text-sm font-bold text-slate-600"><span className="hidden sm:inline">Sort</span><NativeSelect value={sort} onChange={(event) => { setVisibleCount(12); setSort(event.target.value); }} className="h-10 min-w-40 rounded-full bg-white"><NativeSelectOption value="Best match">Best match</NativeSelectOption><NativeSelectOption value="Ready soon">Ready for class</NativeSelectOption><NativeSelectOption value="Student deadlines">Deadline soon</NativeSelectOption><NativeSelectOption value="A–Z">A–Z</NativeSelectOption></NativeSelect></label></div></div>
        {activeFilterCount > 0 && <div className="mt-4 flex flex-wrap items-center gap-2"><span className="text-sm font-bold text-slate-500">Active:</span>{filters.query && <Badge variant="outline" className="gap-1.5 rounded-full bg-white py-1.5">“{filters.query}” <button onClick={() => setFilter("query", "")} aria-label="Remove search"><X className="size-3" /></button></Badge>}{(["grade", "subject", "topic", "standard", "category", "resourceType", "timeBucket", "implementation", "format", "accessGroup", "sourceGroup", "provider", "state"] as const).map((key) => filters[key] !== ALL && <Badge key={key} variant="outline" className="gap-1.5 rounded-full bg-white py-1.5">{filters[key]} <button onClick={() => setFilter(key, ALL)} aria-label={`Remove ${filters[key]}`}><X className="size-3" /></button></Badge>)}{filters.standardsOnly && <Badge variant="outline" className="rounded-full bg-white py-1.5">Standards noted</Badge>}{filters.readyTomorrow && <Badge variant="outline" className="rounded-full bg-white py-1.5">Ready for tomorrow</Badge>}{filters.noAccount && <Badge variant="outline" className="rounded-full bg-white py-1.5">No sign-in</Badge>}<button className="ml-1 text-sm font-bold text-blue-700" onClick={clearFilters}>Clear all</button></div>}
        <div className="mt-7 grid gap-7 lg:grid-cols-[310px_minmax(0,1fr)]"><aside className="hidden lg:block"><div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-5"><FilterPanel filters={filters} setFilter={setFilter} clearFilters={clearFilters} /></div></aside><div>{filtered.length > 0 ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{filtered.slice(0, visibleCount).map((item) => <ResourceCard key={item.id} item={item} onOpen={openResource} />)}</div> : <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><Search className="mx-auto size-10 text-slate-400" /><h3 className="mt-4 text-2xl font-black text-slate-950">No exact match yet</h3><p className="mx-auto mt-2 max-w-lg leading-7 text-slate-600">Try fewer filters or search by a broader subject, grade band, or teaching goal.</p><Button className="mt-5 rounded-full bg-blue-700" onClick={clearFilters}>Show all resources</Button></div>}{visibleCount < filtered.length && <div className="mt-8 text-center"><Button variant="outline" size="lg" className="rounded-full bg-white" onClick={() => setVisibleCount((count) => count + 12)}>Show 12 more <ArrowRight /></Button></div>}</div></div>
      </section>

      <section id="states" className="border-y border-slate-200 bg-white"><div className="mx-auto max-w-[1280px] px-5 py-12 sm:px-8 lg:px-10 lg:py-16"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow">50-state explorer</p><h2 className="mt-2 text-4xl font-black leading-none tracking-[-0.05em] text-slate-950 sm:text-5xl">Choose a state.</h2><p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">Highlighted states have detailed resources in the catalog. Every state also links to its official education-agency contact page.</p></div><Badge variant="outline" className="rounded-full border-blue-200 bg-blue-50 px-4 py-2 text-blue-800">{detailedStates.length} detailed state catalogs</Badge></div>
        <Tabs defaultValue="map" className="mt-8"><TabsList className="h-11 rounded-full bg-slate-100 p-1"><TabsTrigger value="map" className="rounded-full px-4"><MapIcon /> Map</TabsTrigger><TabsTrigger value="list" className="rounded-full px-4"><List /> List</TabsTrigger></TabsList>
          <TabsContent value="map" className="mt-5"><div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 lg:grid-cols-[minmax(0,1fr)_250px]"><div className="overflow-x-auto p-3 sm:p-5"><svg viewBox="0 0 820 500" className="mx-auto block min-w-[650px] max-w-[900px]" role="img" aria-labelledby="state-map-title state-map-description"><title id="state-map-title">Interactive map of the 50 United States</title><desc id="state-map-description">Choose a state with detailed resources to browse the catalog, or choose another state to open its official education contacts.</desc>{mappedStates.map(({ feature, path, label }) => { const state = states.find((item) => item.abbreviation === feature.properties.STUSAB)!; const detailedCount = resources.filter((item) => item.availability === state.name).length; const isDetailed = detailedCount > 0; const showLabel = label.width > 24 && label.height > 15; return <a key={state.abbreviation} href={isDetailed ? "#resources" : stateContactUrl(state.abbreviation)} target={isDetailed ? undefined : "_blank"} rel={isDetailed ? undefined : "noreferrer"} className={`state-link ${isDetailed ? "is-detailed" : "is-doorway"}`} aria-label={isDetailed ? `${state.name}: browse ${detailedCount} detailed resources` : `${state.name}: open official education contacts`} onMouseEnter={() => setMapState(state.abbreviation)} onMouseLeave={() => setMapState(null)} onFocus={() => setMapState(state.abbreviation)} onBlur={() => setMapState(null)} onClick={isDetailed ? (event) => { event.preventDefault(); browseState(state.name); } : undefined}><path d={path} className="state-shape" fillRule="evenodd" clipRule="evenodd"><title>{isDetailed ? `${state.name}: ${detailedCount} detailed resources` : `${state.name}: official education doorway`}</title></path>{showLabel && <text x={label.x} y={label.y} className="state-label">{state.abbreviation}</text>}</a>; })}<g aria-hidden="true" className="map-inset-labels"><text x="43" y="495">Alaska</text><text x="288" y="487">Hawaii</text></g></svg></div><aside className="border-t border-slate-200 bg-white p-5 lg:border-l lg:border-t-0 lg:p-6" aria-live="polite">{focusedMapState ? <><p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">{focusedMapState.abbreviation}</p><h3 className="mt-1 text-2xl font-black tracking-[-0.035em] text-slate-950">{focusedMapState.name}</h3>{focusedMapCount > 0 ? <><p className="mt-3 text-sm leading-6 text-slate-600"><strong className="text-fuchsia-800">{focusedMapCount} detailed resources</strong> are currently indexed for this state.</p><button onClick={() => browseState(focusedMapState.name)} className="mt-4 inline-flex items-center gap-1.5 text-sm font-black text-blue-700">Browse resources <ArrowRight className="size-4" /></button></> : <><p className="mt-3 text-sm leading-6 text-slate-600">Use the official state doorway while its detailed catalog is being built.</p><a href={stateContactUrl(focusedMapState.abbreviation)} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-black text-blue-700">Official education page <ExternalLink className="size-4" /></a></>}</> : <><MapPin className="size-7 text-blue-700" /><h3 className="mt-4 text-xl font-black text-slate-950">Explore the real map</h3><p className="mt-2 text-sm leading-6 text-slate-600">Point to or tab through a state to see what is available. The list view remains available for quick scanning.</p></>}</aside></div><div className="mt-4 flex flex-wrap gap-5 text-sm text-slate-600"><span className="inline-flex items-center gap-2"><span className="size-3 rounded-sm border border-fuchsia-400 bg-fuchsia-200" />Detailed resources indexed</span><span className="inline-flex items-center gap-2"><span className="size-3 rounded-sm border border-blue-300 bg-blue-100" />Official state doorway</span></div><p className="mt-3 text-xs text-slate-500">Map geometry: <a href={stateGeoData.source_url} target="_blank" rel="noreferrer" className="font-bold text-blue-700 hover:underline">{stateGeoData.source} <ExternalLink className="inline size-3" /></a></p></TabsContent>
          <TabsContent value="list" className="mt-5"><div className="max-w-xl"><label htmlFor="state-search" className="filter-label">Find a state</label><div className="relative"><Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" /><Input id="state-search" value={stateQuery} onChange={(event) => setStateQuery(event.target.value)} className="h-12 rounded-xl bg-white pl-12" placeholder="Type a state name or abbreviation" /></div></div><div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">{visibleStates.map((state) => { const detailedCount = resources.filter((item) => item.availability === state.name).length; const isDetailed = detailedCount > 0; return <article key={state.abbreviation} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center justify-between gap-3"><span className="grid size-9 place-items-center rounded-lg bg-white text-xs font-black text-blue-700 shadow-sm">{state.abbreviation}</span>{isDetailed && <Badge className="bg-fuchsia-100 text-fuchsia-800">{detailedCount} indexed</Badge>}</div><h3 className="mt-3 font-black text-slate-950">{state.name}</h3>{isDetailed ? <button onClick={() => browseState(state.name)} className="mt-2 inline-flex items-center gap-1.5 text-sm font-black text-blue-700">Browse resources <ArrowRight className="size-3.5" /></button> : <a href={stateContactUrl(state.abbreviation)} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-sm font-black text-blue-700">Official education page <ExternalLink className="size-3.5" /></a>}</article>; })}</div>{visibleStates.length === 0 && <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-600">No state matches that search.</div>}</TabsContent>
        </Tabs>
        {focusedMapState && focusedMapNaep && <section className="mt-6 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-5 sm:p-6" aria-labelledby="state-scores-heading"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-blue-800">Comparable state results</p><h3 id="state-scores-heading" className="mt-1 text-2xl font-black tracking-[-0.035em] text-slate-950">{focusedMapState.name} scores and positions</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Official 2024 NAEP public-school results for reading and mathematics. Point to or tab to another state on the map to compare its profile.</p></div><Badge className="border-blue-200 bg-white text-blue-900">All 50 states</Badge></div><StateNaepSnapshot profile={focusedMapNaep} /></section>}
        {focusedMapProfile && <section className="mt-6 rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-blue-50 p-5 sm:p-6" aria-labelledby="state-profile-heading">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-800">State profile pilot</p>
              <h3 id="state-profile-heading" className="mt-1 text-2xl font-black tracking-[-0.035em] text-slate-950">{focusedMapProfile.state} at a glance</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Verified context for educators: statewide pay estimates, standards, student outcomes, and a responsible source for working-condition research.</p>
            </div>
            <Badge className="border-cyan-200 bg-white text-cyan-900">Verified prototype</Badge>
          </div>
          <StateProfilePreview profile={focusedMapProfile} />
        </section>}
        <p className="mt-5 text-sm text-slate-500">Directory source: <a className="font-bold text-blue-700 hover:underline" href={stateData.directory_url} target="_blank" rel="noreferrer">{stateData.directory_label} <ExternalLink className="inline size-3.5" /></a></p></div></section>

      <section id="collections" className="border-y border-slate-200 bg-[#0f2547] text-white"><div className="mx-auto max-w-[1500px] px-5 py-13 sm:px-8 lg:px-10 lg:py-16"><div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr] lg:items-end"><div><p className="eyebrow text-cyan-300!">Browse a shelf</p><h2 className="mt-2 text-4xl font-black leading-none tracking-[-0.05em] sm:text-5xl">Start with a trusted collection.</h2></div><p className="max-w-2xl text-lg leading-8 text-slate-300">These routes prioritize official, free, recently checked resources while keeping provider claims and hub notes clearly separated.</p></div><div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[{ route: "federal" as const, icon: Landmark, count: counts.federal, title: "Federal-first catalog", note: `${counts.agencies} federal and national providers` }, { route: "states" as const, icon: MapPin, count: 50, title: "State explorer", note: `${counts.state} detailed state resources so far` }, { route: "tomorrow" as const, icon: BookOpen, count: resources.filter((item) => item.readyTomorrow).length, title: "Classroom ready", note: "Low-prep materials you can use quickly" }, { route: "students" as const, icon: UsersRound, count: counts.opportunities, title: "Student opportunities", note: "Competitions, scholarships, and enrichment" }].map(({ route, icon: Icon, count, title, note }) => <button key={route} onClick={() => applyRoute(route)} className="group rounded-2xl border border-white/15 bg-white/[0.06] p-5 text-left transition hover:-translate-y-0.5 hover:border-cyan-300/70 hover:bg-white/[0.1]"><div className="flex items-center justify-between"><span className="grid size-11 place-items-center rounded-xl bg-cyan-300 text-slate-950"><Icon className="size-5" /></span><span className="text-3xl font-black tracking-[-0.05em] text-white">{count}</span></div><h3 className="mt-5 text-xl font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-300">{note}</p><span className="mt-5 inline-flex items-center gap-1.5 text-sm font-black text-cyan-300">Open collection <ArrowRight className="size-4" /></span></button>)}</div></div></section>

      <section id="contribute" className="border-b border-slate-200 bg-cyan-50/60"><div className="mx-auto grid max-w-[1500px] gap-8 px-5 py-13 sm:px-8 lg:grid-cols-[0.72fr_1.28fr] lg:px-10 lg:py-16"><div><p className="eyebrow">Help grow the exchange</p><h2 className="mt-2 text-4xl font-black leading-none tracking-[-0.05em] text-slate-950 sm:text-5xl">Know a resource we should check?</h2><p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">Send the official link and tell us why it is useful. Suggestions go into a private review queue; they are checked, labeled, and screened for duplicates before anything appears in the catalog.</p><div className="mt-6 space-y-3 text-sm leading-6 text-slate-700"><p className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-blue-700 font-black text-white">1</span><span><strong>Collected safely.</strong> Your suggestion is stored for review, not published immediately.</span></p><p className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-blue-700 font-black text-white">2</span><span><strong>Verified at the source.</strong> We confirm the provider, access, grades, subjects, standards, and current availability.</span></p><p className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-blue-700 font-black text-white">3</span><span><strong>Added once.</strong> Existing records are updated when the same resource is already represented.</span></p></div></div><form onSubmit={submitSuggestion} className="rounded-[1.4rem] border border-cyan-200 bg-white p-5 shadow-[0_18px_55px_rgb(20_50_90/10%)] sm:p-7"><div className="grid gap-5 sm:grid-cols-2"><label className="block sm:col-span-2"><span className="filter-label">Resource name *</span><Input required maxLength={180} value={suggestion.title} onChange={(event) => updateSuggestion("title", event.target.value)} className="h-11 rounded-xl" placeholder="Example: State history primary-source collection" /></label><label className="block sm:col-span-2"><span className="filter-label">Official resource link *</span><Input required type="url" maxLength={1000} value={suggestion.url} onChange={(event) => updateSuggestion("url", event.target.value)} className="h-11 rounded-xl" placeholder="https://…" /></label><label className="block"><span className="filter-label">Provider or organization</span><Input maxLength={180} value={suggestion.provider} onChange={(event) => updateSuggestion("provider", event.target.value)} className="h-11 rounded-xl" placeholder="Agency, association, foundation…" /></label><label className="block"><span className="filter-label">What kind of resource?</span><NativeSelect value={suggestion.resourceKind} onChange={(event) => updateSuggestion("resourceKind", event.target.value)} className="h-11 w-full rounded-xl bg-white"><NativeSelectOption value="Not sure">Not sure</NativeSelectOption><NativeSelectOption value="Classroom material">Classroom material</NativeSelectOption><NativeSelectOption value="Competition or scholarship">Competition or scholarship</NativeSelectOption><NativeSelectOption value="Professional learning">Professional learning</NativeSelectOption><NativeSelectOption value="Grant or funding">Grant or funding</NativeSelectOption><NativeSelectOption value="State standards or guidance">State standards or guidance</NativeSelectOption><NativeSelectOption value="Other">Other</NativeSelectOption></NativeSelect></label><label className="block sm:col-span-2"><span className="filter-label">Why is it useful? *</span><Textarea required maxLength={2000} value={suggestion.whyUseful} onChange={(event) => updateSuggestion("whyUseful", event.target.value)} className="min-h-28 rounded-xl" placeholder="Who is it for, what can teachers or students do with it, and anything we should know about access?" /></label><label className="block"><span className="filter-label">Your role (optional)</span><Input maxLength={120} value={suggestion.submitterRole} onChange={(event) => updateSuggestion("submitterRole", event.target.value)} className="h-11 rounded-xl" placeholder="Teacher, librarian, parent…" /></label><label className="block"><span className="filter-label">Email (optional)</span><Input type="email" maxLength={254} value={suggestion.submitterEmail} onChange={(event) => updateSuggestion("submitterEmail", event.target.value)} className="h-11 rounded-xl" placeholder="Only if we may follow up" /></label><label className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">Website<Input tabIndex={-1} autoComplete="off" value={suggestion.website} onChange={(event) => updateSuggestion("website", event.target.value)} /></label></div><div className="mt-6 flex flex-wrap items-center gap-4"><Button type="submit" disabled={suggestionStatus === "saving"} className="rounded-full bg-blue-700 px-6 hover:bg-blue-800">{suggestionStatus === "saving" ? "Saving…" : "Send for review"} <ArrowRight /></Button><p aria-live="polite" className={`text-sm font-bold ${suggestionStatus === "error" ? "text-red-700" : "text-emerald-700"}`}>{suggestionMessage}</p></div><p className="mt-4 text-xs leading-5 text-slate-500">Email is optional and is stored only with the suggestion for possible follow-up. Suggestions are never published automatically.</p></form></div></section>

	      <section id="trust" className="mx-auto max-w-[1500px] px-5 py-13 sm:px-8 lg:px-10 lg:py-16"><div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start"><div><p className="eyebrow">Clear before you click</p><h2 className="mt-2 text-4xl font-black leading-none tracking-[-0.05em] text-slate-950 sm:text-5xl">Useful labels.<br />Honest limits.</h2><p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">Every entry points to an official provider page and tells you what we know about time, access, materials, standards, and availability. Large repositories stay visible as doorways while their verified lessons and activities are added as individual, searchable records.</p></div><div className="grid gap-4 sm:grid-cols-2">{[{ icon: BadgeCheck, title: "Canonical source", text: "Links go to the agency or organization that actually provides the resource—not a copied listing or aggregator." }, { icon: Network, title: "Item-level and duplicate-aware", text: "Official item metadata is indexed provider by provider. Canonical URLs keep the same lesson from being added twice." }, { icon: ClipboardCheck, title: "Standards, with context", text: "We name a framework only when the provider documents it and note when alignment varies by item." }, { icon: Clock3, title: "Planning details", text: "Classroom time, prep, access, materials, format, and implementation style appear before you leave the hub." }, { icon: ShieldCheck, title: "Last checked", text: "Every record shows its review date so a teacher can judge how recently the details were confirmed." }].map(({ icon: Icon, title, text }) => <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><Icon className="size-6 text-blue-700" /><h3 className="mt-4 text-lg font-black text-slate-950">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></article>)}</div></div></section>

	      <footer className="border-t border-slate-200 bg-white px-5 py-8 sm:px-8 lg:px-10"><div className="mx-auto flex max-w-[1500px] flex-col justify-between gap-4 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-blue-700 text-white"><Library className="size-4" /></span><span><strong className="block text-sm text-slate-950">Teacher Resource Exchange</strong><span className="text-xs text-slate-500">A growing, federal-first catalog · checked {formatDate(catalogAsOf)}</span></span></div><div className="flex flex-wrap gap-4 text-sm font-bold text-slate-600"><a href="#resources" className="hover:text-blue-700">Find resources</a><a href="#states" className="hover:text-blue-700">All 50 states</a><a href="#collections" className="hover:text-blue-700">Collections</a><a href="#contribute" className="hover:text-blue-700">Suggest a resource</a><a href="#trust" className="hover:text-blue-700">Our labels</a></div></div></footer>

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}><SheetContent side="left" className="w-[92vw] overflow-y-auto bg-slate-50 sm:max-w-md"><SheetHeader className="sr-only"><SheetTitle>Resource filters</SheetTitle><SheetDescription>Refine the teacher resource catalog.</SheetDescription></SheetHeader><div className="p-6"><FilterPanel filters={filters} setFilter={setFilter} clearFilters={clearFilters} /><Button className="mt-6 w-full rounded-full bg-blue-700" onClick={() => setFiltersOpen(false)}>Show {filtered.length} resources</Button></div></SheetContent></Sheet>

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}><SheetContent className="w-[95vw] overflow-y-auto bg-white sm:max-w-[760px]">{selected && <><SheetHeader className="border-b border-slate-200 p-6 pr-12"><div className="mb-2 flex flex-wrap gap-2"><Badge variant="outline" className={sourceBadgeClass(sourceGroup(selected))}>{sourceGroup(selected)}</Badge><Badge variant="outline" className={accessBadgeClass(accessGroup(selected))}>{accessGroup(selected)}</Badge>{selected.readyTomorrow && <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-900">Ready for tomorrow</Badge>}</div><SheetTitle className="text-2xl font-black leading-8 tracking-[-0.035em] text-slate-950">{selected.title}</SheetTitle><SheetDescription className="text-base font-bold text-blue-700">{selected.provider}</SheetDescription></SheetHeader><div className="px-6 pb-9"><p className="py-5 text-base leading-7 text-slate-700">{selected.summary}</p>{selected.deadline && <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-black uppercase tracking-[0.12em] text-amber-800">Current deadline</p><p className="mt-1 text-lg font-black text-amber-950">{formatDate(selected.deadline)}</p>{selected.cycleStatus && <p className="mt-1 text-sm text-amber-900">{selected.cycleStatus}</p>}</div>}<dl><DetailRow label="For">{selected.audience.join(" · ")}</DetailRow><DetailRow label="Grades">{selected.gradeBands.join(" · ")}</DetailRow><DetailRow label="Subjects">{selected.subjects.join(" · ")}</DetailRow><DetailRow label="Topics">{selected.topics.join(" · ")}</DetailRow><DetailRow label="Resource type">{selected.resourceType}</DetailRow><DetailRow label="Teaching approach">{selected.implementationStyle.join(" · ")}</DetailRow><DetailRow label="Classroom time">{selected.time}</DetailRow><DetailRow label="Prep">{selected.prep}</DetailRow><DetailRow label="Standards">{selected.standards.length ? selected.standards.join(" · ") : "No formal alignment claimed"}</DetailRow><DetailRow label="Standards note">{selected.standardsNote}</DetailRow><DetailRow label="Sign-in / registration">{accessGroup(selected)}</DetailRow><DetailRow label="Access details">{selected.access}</DetailRow><DetailRow label="Materials">{selected.materials}</DetailRow><DetailRow label="Format">{selected.formats.join(" · ")}</DetailRow><DetailRow label="Available in">{selected.availability}</DetailRow><DetailRow label="Last checked">{formatDate(selected.verified)}</DetailRow></dl><div className="sticky bottom-0 mt-5 flex flex-wrap items-center gap-3 border-t border-slate-200 bg-white/95 py-4 backdrop-blur"><Button className="rounded-full bg-blue-700 hover:bg-blue-800" asChild><a href={selected.url} target="_blank" rel="noreferrer">Open official resource <ExternalLink /></a></Button><span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><Check className="size-3.5 text-emerald-600" />Official provider page</span></div></div></>}</SheetContent></Sheet>
    </main>
  );
}
