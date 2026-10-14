"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight, ArrowUpRight, BookOpen, CalendarDays, CheckCircle2, Compass,
  Copy, Download, ExternalLink, GraduationCap, Handshake, Lightbulb, Map as MapIcon, MapPin,
  MessageCircle, RefreshCw, Search, ShieldCheck, Target, Trophy, UsersRound, X,
} from "lucide-react";

import clubData from "@/data/club_content.json";
import eventSources from "@/data/event_sources.json";
import opportunityData from "@/data/opportunities.json";
import trainingData from "@/data/training_modules.json";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Opportunity = {
  id: string; name: string; organization: string; short_description: string;
  stem_fields: string[]; field_group: string; leadership_pathways: string[];
  primary_pathway: string; audience_eligibility: string; audience_tags: string[];
  opportunity_type: string; type_group: string; actions: string[]; nova_actions: string[];
  club_use: string; location: string; modality: string; date: string; deadline: string;
  deadline_date: string | null; cost: string; student_pricing: string;
  funding_travel_support: string; annual_recurrence: string; official_url: string;
  supporting_official_urls: string[]; recommended_next_action: string; notes: string;
  status: string; date_last_verified: string; is_featured: boolean; is_local: boolean;
  has_funding: boolean; event_scope: string; is_single_day: boolean; event_start_date: string;
  map_place: string; map_lat: number | null; map_lon: number | null;
};

type Pathway = {
  name: string; slug: string; description: string; student_outcomes: string;
  example_activities: string[]; starter_roles: string[];
};

type EventSource = {
  name: string; focus: string; region: string; cadence: string; kind: "official" | "discovery"; url: string;
};

type TrainingModule = {
  id: string; title: string; time: string; outcome: string; steps: string[]; template: string;
};

type Filters = {
  query: string; audience: string; field: string; type: string; pathway: string;
  format: string; status: string; localOnly: boolean; fundedOnly: boolean; singleDayOnly: boolean;
};

const opportunities = opportunityData.records as Opportunity[];
const pathways = clubData.pathways as Pathway[];
const sourceWatchlist = eventSources as EventSource[];
const trainingModules = trainingData as TrainingModule[];
const ALL = "All";

const guideSets = [
  { value: "meetings", label: "Meetings", title: "Conferences & professional societies", description: "Compare student access, presentation routes, travel support, and chapter-building options.", types: ["Conference & meeting", "Membership & chapter"] },
  { value: "experiences", label: "Experiences", title: "Internships, research & fellowships", description: "Prioritize mentored, paid, and community-college-accessible experiences.", types: ["Internship & research", "Leadership & training"] },
  { value: "funding", label: "Funding", title: "Scholarships & funding", description: "Use eligibility details to build an early funding calendar and application support pipeline.", types: ["Scholarship & funding"] },
  { value: "challenges", label: "Challenges", title: "Competitions & technical challenges", description: "Turn competition calendars into student-led project teams, documentation, and mentoring.", types: ["Competition & challenge"] },
  { value: "recognition", label: "Recognition", title: "Awards & recognition", description: "Track both individual honors and opportunities that recognize chapters or student organizations.", types: ["Award & recognition"] },
  { value: "training", label: "Training", title: "Training & skill-building", description: "Choose one credible learning route, attach it to a small project, and save evidence of what you can now do.", types: ["Training & skill-building"] },
];

const coachGoals = [
  "Find a research experience",
  "Land an internship or first STEM role",
  "Find funding",
  "Attend a local event",
  "Build a technical skill",
  "Present or compete",
];

const coachBlockers = [
  "I do not know which option fits",
  "I am unsure whether I am eligible",
  "My application materials are not ready",
  "I need a mentor or recommendation",
  "Cost, travel, or time may be a barrier",
  "I need confidence and a first step",
];

const blockerAdvice: Record<string, string> = {
  "I do not know which option fits": "Compare only three records. Eliminate any option that fails eligibility, timing, or genuine interest; then choose the one with the clearest next action.",
  "I am unsure whether I am eligible": "Quote the exact eligibility sentence you are unsure about. Bring your enrollment status, credits completed, GPA, citizenship status if relevant, and transfer plan.",
  "My application materials are not ready": "Build the smallest complete packet first: one-page resume, unofficial transcript, 150-word interest statement, and a list of two possible references.",
  "I need a mentor or recommendation": "Ask for advice before asking for a letter. Share the official link, deadline, your fit, and a draft resume; give the person a graceful way to decline.",
  "Cost, travel, or time may be a barrier": "Separate required cost from optional cost, check virtual access and travel support, and estimate the weekly time before deciding the opportunity is out of reach.",
  "I need confidence and a first step": "Use a 20-minute action: create the account, save the deadline, attend one webinar, or draft one paragraph. Momentum is evidence, not a feeling you wait for.",
};

const goalAdvice: Record<string, string> = {
  "Find a research experience": "Name one topic you can discuss with curiosity, one method you want to learn, and the weekly or summer schedule you can actually sustain.",
  "Land an internship or first STEM role": "Translate class, work, and club experience into evidence: what you built, measured, improved, explained, or completed with a team.",
  "Find funding": "Check the service obligation, enrollment level, citizenship, GPA, and transfer-status rules before spending time on essays.",
  "Attend a local event": "Choose a learning goal and one person or role you want to understand. Attendance becomes leadership when you bring back a useful synthesis.",
  "Build a technical skill": "Pick one course, one artifact, and one demonstration date. A finished small project is stronger than five half-started credentials.",
  "Present or compete": "Start with the evidence you already have: a class project, lab result, prototype, data story, or outreach activity that can become an abstract or team challenge.",
};

const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));

function formatGroup(value: string) {
  const lower = value.toLowerCase();
  if (lower.includes("virtual") || lower.includes("online")) {
    if (lower.includes("in-person") || lower.includes("in person") || lower.includes("on-site")) return "Hybrid";
    return "Online";
  }
  if (lower.includes("hybrid")) return "Hybrid";
  if (lower.includes("in-person") || lower.includes("in person") || lower.includes("on-site") || lower.includes("residential")) return "In person";
  return "Varies";
}

function displayDate(value: string | null) {
  if (!value) return "Dates TBA";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}

function daysFromDate(value: string | null, anchorDate: string) {
  if (!value) return null;
  const start = new Date(`${anchorDate}T12:00:00Z`).getTime();
  const end = new Date(`${value}T12:00:00Z`).getTime();
  return Math.ceil((end - start) / 86_400_000);
}

function dueLabel(value: string | null, anchorDate: string) {
  const days = daysFromDate(value, anchorDate);
  if (days === null) return "Plan ahead";
  if (days < 0) return "Deadline passed";
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days <= 14) return `${days} days left`;
  return displayDate(value);
}

function transitNote(place: string) {
  const notes: Record<string, string> = {
    "Washington, DC": "Metro access varies by venue; confirm the nearest station on the organizer page.",
    Arlington: "Many venues are near Orange or Silver Line stations; confirm the final walk.",
    McLean: "Silver Line access may be practical; verify the venue entrance and final connection.",
    Fairfax: "Check campus bus and parking instructions before leaving.",
    "College Park": "Green Line and campus shuttle options may help; confirm weekend service.",
    Greenbelt: "Green Line plus a local connection may be needed.",
    Baltimore: "MARC or Amtrak may work for some events; plan the final local connection.",
  };
  return notes[place] || "Confirm transit, parking, and the final venue entrance before travel.";
}

function applyFilters(records: Opportunity[], filters: Filters) {
  const needle = filters.query.trim().toLowerCase();
  return records.filter((item) => {
    const searchable = [item.name, item.organization, item.short_description, item.stem_fields.join(" "), item.field_group, item.primary_pathway, item.audience_eligibility, item.opportunity_type, item.location].join(" ").toLowerCase();
    return (!needle || searchable.includes(needle)) &&
      (filters.audience === ALL || item.audience_tags.includes(filters.audience)) &&
      (filters.field === ALL || item.field_group === filters.field) &&
      (filters.type === ALL || item.type_group === filters.type) &&
      (filters.pathway === ALL || item.leadership_pathways.includes(filters.pathway)) &&
      (filters.format === ALL || formatGroup(item.modality) === filters.format) &&
      (filters.status === ALL || item.status === filters.status) &&
      (!filters.localOnly || item.is_local) && (!filters.fundedOnly || item.has_funding) &&
      (!filters.singleDayOnly || item.is_single_day);
  });
}

function statusClass(status: string) {
  if (status === "Confirmed 2026-27") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status.includes("TBA")) return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return <div className="grid gap-1 border-t border-slate-200 py-3 sm:grid-cols-[150px_1fr] sm:gap-5"><dt className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</dt><dd className="text-sm leading-6 text-slate-700">{children || "Not published"}</dd></div>;
}

function OpportunityCard({ item, onOpen, currentDate }: { item: Opportunity; onOpen: (item: Opportunity) => void; currentDate: string }) {
  return (
    <article className="opportunity-card group rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_28px_rgb(18_45_79/5%)] transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-[0_15px_40px_rgb(18_45_79/10%)]">
      <div className="flex h-full flex-col">
        <div className="mb-3 flex flex-wrap gap-2"><Badge variant="outline" className={statusClass(item.status)}>{item.status}</Badge>{item.is_local && <Badge variant="outline" className="border-cyan-200 bg-cyan-50 text-cyan-900">DC / Virginia</Badge>}{item.has_funding && <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-800">Funding</Badge>}</div>
        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{item.type_group}</p>
        <h3 className="mt-1 text-xl font-black leading-6 tracking-[-0.025em] text-primary">{item.name}</h3>
        <p className="mt-1 text-sm font-bold text-cyan-800">{item.organization}</p>
        <p className="mt-3 line-clamp-3 text-[0.95rem] leading-6 text-slate-600">{item.short_description}</p>
        <div className="mt-5 grid gap-2 border-t border-slate-100 pt-4 text-sm text-slate-600"><span className="inline-flex items-start gap-2"><CalendarDays className="mt-0.5 size-4 shrink-0 text-cyan-700" /><strong className="text-slate-800">{dueLabel(item.deadline_date, currentDate)}</strong></span><span className="inline-flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-cyan-700" />{item.location}</span></div>
        <div className="mt-auto flex items-center justify-between gap-3 pt-5"><div className="flex flex-wrap gap-1.5">{item.nova_actions.slice(0, 3).map((action) => <Badge key={action} variant="secondary">{action}</Badge>)}</div><Button variant="outline" size="sm" className="shrink-0 rounded-full" onClick={() => onOpen(item)}>Details <ArrowRight /></Button></div>
      </div>
    </article>
  );
}

export default function Home() {
  const liveDate = () => { const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10); };
  const [query, setQuery] = useState("");
  const [audience, setAudience] = useState(ALL);
  const [field, setField] = useState(ALL);
  const [type, setType] = useState(ALL);
  const [pathway, setPathway] = useState(ALL);
  const [format, setFormat] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [localOnly, setLocalOnly] = useState(false);
  const [fundedOnly, setFundedOnly] = useState(false);
  const [singleDayOnly, setSingleDayOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  const [selected, setSelected] = useState<Opportunity | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [currentDate] = useState(liveDate);
  const [calendarMonth, setCalendarMonth] = useState(() => liveDate().slice(0, 7));
  const [eventWindow, setEventWindow] = useState("90");
  const [copiedTraining, setCopiedTraining] = useState("");
  const [coachGoal, setCoachGoal] = useState(coachGoals[0]);
  const [coachBlocker, setCoachBlocker] = useState(coachBlockers[0]);
  const [coachQuestion, setCoachQuestion] = useState("");
  const [copied, setCopied] = useState(false);
  const [suggestTitle, setSuggestTitle] = useState("");
  const [suggestOrganizer, setSuggestOrganizer] = useState("");
  const [suggestUrl, setSuggestUrl] = useState("");
  const [suggestTiming, setSuggestTiming] = useState("");
  const [suggestFit, setSuggestFit] = useState("");
  const [suggestAccess, setSuggestAccess] = useState("");
  const [suggestCopied, setSuggestCopied] = useState(false);

  const audiences = useMemo(() => unique(opportunities.flatMap((item) => item.audience_tags)), []);
  const fields = useMemo(() => unique(opportunities.map((item) => item.field_group)), []);
  const types = useMemo(() => unique(opportunities.map((item) => item.type_group)), []);
  const pathwayOptions = useMemo(() => pathways.map((item) => item.name), []);
  const statuses = useMemo(() => unique(opportunities.map((item) => item.status)), []);
  const currentFilters: Filters = { query, audience, field, type, pathway, format, status, localOnly, fundedOnly, singleDayOnly };
  const filtered = useMemo(() => applyFilters(opportunities, currentFilters).sort((a, b) => {
    const aPast = Boolean(a.deadline_date && a.deadline_date < currentDate);
    const bPast = Boolean(b.deadline_date && b.deadline_date < currentDate);
    if (aPast !== bPast) return aPast ? 1 : -1;
    return (a.deadline_date || "9999-12-31").localeCompare(b.deadline_date || "9999-12-31");
  }), [query, audience, field, type, pathway, format, status, localOnly, fundedOnly, singleDayOnly, currentDate]);
  const upcoming = useMemo(() => opportunities.filter((item) => item.status === "Confirmed 2026-27" && (daysFromDate(item.deadline_date, currentDate) ?? 9999) >= 0).slice(0, 8), [currentDate]);
  const pastDeadlineCount = useMemo(() => opportunities.filter((item) => item.deadline_date && item.deadline_date < currentDate).length, [currentDate]);
  const activeFilterCount = [query, audience !== ALL, field !== ALL, type !== ALL, pathway !== ALL, format !== ALL, status !== ALL, localOnly, fundedOnly, singleDayOnly].filter(Boolean).length;
  const eventRecords = useMemo(() => opportunities.filter((item) => {
    if (!item.event_start_date || item.event_start_date < currentDate) return false;
    if (eventWindow === "all") return true;
    const days = daysFromDate(item.event_start_date, currentDate) ?? 9999;
    return days <= Number(eventWindow);
  }).sort((a, b) => a.event_start_date.localeCompare(b.event_start_date)), [currentDate, eventWindow]);
  const eventMonths = useMemo(() => unique(eventRecords.map((item) => item.event_start_date.slice(0, 7))), [eventRecords]);
  const calendarCells = useMemo(() => {
    const [year, month] = calendarMonth.split("-").map(Number);
    const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return Array.from({ length: 42 }, (_, index) => {
      const day = index - firstWeekday + 1;
      const iso = day >= 1 && day <= daysInMonth ? `${calendarMonth}-${String(day).padStart(2, "0")}` : "";
      return { day: iso ? day : null, records: iso ? eventRecords.filter((item) => item.event_start_date === iso) : [] };
    });
  }, [calendarMonth, eventRecords]);
  const mapGroups = useMemo(() => {
    const groups = new globalThis.Map<string, { place: string; lat: number; lon: number; records: Opportunity[] }>();
    for (const item of eventRecords) {
      if (item.map_lat == null || item.map_lon == null || !item.map_place) continue;
      const key = item.map_place;
      const existing = groups.get(key);
      if (existing) existing.records.push(item);
      else groups.set(key, { place: item.map_place, lat: item.map_lat, lon: item.map_lon, records: [item] });
    }
    return [...groups.values()];
  }, [eventRecords]);
  const onlineEvents = useMemo(() => eventRecords.filter((item) => item.is_single_day && item.map_lat == null), [eventRecords]);
  const planningRecords = useMemo(() => opportunities.filter((item) =>
    ["Competition & challenge", "Conference & meeting", "Presenting opportunity", "Award & recognition"].includes(item.type_group) &&
    item.status !== "Future planning",
  ).sort((a, b) => (a.deadline_date || "9999-12-31").localeCompare(b.deadline_date || "9999-12-31")), []);
  const planningBuckets = useMemo(() => [
    { label: "Act now", note: "Today through October 2026", records: planningRecords.filter((item) => item.deadline_date && item.deadline_date >= currentDate && item.deadline_date <= "2026-10-31") },
    { label: "Build this fall", note: "November-December 2026", records: planningRecords.filter((item) => item.deadline_date && item.deadline_date >= "2026-11-01" && item.deadline_date <= "2026-12-31") },
    { label: "Winter decisions", note: "January-February 2027", records: planningRecords.filter((item) => item.deadline_date && item.deadline_date >= "2027-01-01" && item.deadline_date <= "2027-02-28") },
    { label: "Spring decisions", note: "March-May 2027", records: planningRecords.filter((item) => item.deadline_date && item.deadline_date >= "2027-03-01" && item.deadline_date <= "2027-05-31") },
    { label: "Watch and verify", note: "No single official deadline yet", records: planningRecords.filter((item) => !item.deadline_date) },
  ], [planningRecords, currentDate]);
  const coachRecommendations = useMemo(() => opportunities.filter((item) => {
    if (coachGoal === "Find a research experience") return item.type_group === "Internship & research" || item.primary_pathway === "Research & Discovery";
    if (coachGoal === "Land an internship or first STEM role") return item.type_group === "Internship & research";
    if (coachGoal === "Find funding") return item.type_group === "Scholarship & funding" || item.has_funding;
    if (coachGoal === "Attend a local event") return item.is_single_day && item.is_local;
    if (coachGoal === "Build a technical skill") return item.type_group === "Training & skill-building";
    return item.type_group === "Presenting opportunity" || item.type_group === "Competition & challenge" || /present/i.test(item.opportunity_type);
  }).slice(0, 4), [coachGoal]);
  const questionBrief = `My goal: ${coachGoal}.\nWhere I am stuck: ${coachBlocker}.\nContext: ${coachQuestion.trim() || "I have not chosen a specific opportunity yet."}\nWhat I checked: eligibility, official deadline, cost, format, and the next required action.\nMy ask: Can you help me choose the next concrete step and tell me what I should bring to our next meeting?`;
  const suggestionBrief = `Suggested STEM opportunity\n\nTitle: ${suggestTitle.trim() || "Not provided"}\nOrganizer: ${suggestOrganizer.trim() || "Not provided"}\nOfficial URL: ${suggestUrl.trim() || "Not provided"}\nDate or deadline: ${suggestTiming.trim() || "Not provided"}\nWhy it fits NOVA students: ${suggestFit.trim() || "Not provided"}\nEligibility, cost, or access notes: ${suggestAccess.trim() || "Not provided"}\n\nPlease verify this on the organizer's official page before adding it to the hub.`;

  // Reset pagination when a finder filter changes.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setVisibleCount(12), [query, audience, field, type, pathway, format, status, localOnly, fundedOnly, singleDayOnly]);

  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool: (tool: Record<string, unknown>, options?: { signal?: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const nextPaint = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const register = (tool: Record<string, unknown>) => { try { void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => undefined); } catch { /* Progressive enhancement only. */ } };
    register({
      name: "configure_opportunity_filters", title: "Filter STEM opportunities",
      description: "Replace the current Opportunity Finder filters and show matching records.",
      inputSchema: { type: "object", properties: { query: { type: "string" }, audience: { type: "string", enum: [ALL, ...audiences] }, field: { type: "string", enum: [ALL, ...fields] }, type: { type: "string", enum: [ALL, ...types] }, pathway: { type: "string", enum: [ALL, ...pathwayOptions] }, format: { type: "string", enum: [ALL, "Online", "Hybrid", "In person", "Varies"] }, status: { type: "string", enum: [ALL, ...statuses] }, localOnly: { type: "boolean" }, fundedOnly: { type: "boolean" }, singleDayOnly: { type: "boolean" } }, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: async (raw: unknown) => {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Filters must be an object.");
        const input = raw as Partial<Filters>;
        const allowedStrings: Array<[keyof Filters, string[]]> = [
          ["audience", [ALL, ...audiences]], ["field", [ALL, ...fields]],
          ["type", [ALL, ...types]], ["pathway", [ALL, ...pathwayOptions]],
          ["format", [ALL, "Online", "Hybrid", "In person", "Varies"]],
          ["status", [ALL, ...statuses]],
        ];
        if (input.query !== undefined && typeof input.query !== "string") throw new Error("Query must be text.");
        for (const [key, allowed] of allowedStrings) {
          const value = input[key];
          if (value !== undefined && (typeof value !== "string" || !allowed.includes(value))) throw new Error(`Invalid ${key} filter.`);
        }
        if (input.localOnly !== undefined && typeof input.localOnly !== "boolean") throw new Error("localOnly must be true or false.");
        if (input.fundedOnly !== undefined && typeof input.fundedOnly !== "boolean") throw new Error("fundedOnly must be true or false.");
        if (input.singleDayOnly !== undefined && typeof input.singleDayOnly !== "boolean") throw new Error("singleDayOnly must be true or false.");
        const next: Filters = {
          query: typeof input.query === "string" ? input.query : "",
          audience: typeof input.audience === "string" && [ALL, ...audiences].includes(input.audience) ? input.audience : ALL,
          field: typeof input.field === "string" && [ALL, ...fields].includes(input.field) ? input.field : ALL,
          type: typeof input.type === "string" && [ALL, ...types].includes(input.type) ? input.type : ALL,
          pathway: typeof input.pathway === "string" && [ALL, ...pathwayOptions].includes(input.pathway) ? input.pathway : ALL,
          format: typeof input.format === "string" && [ALL, "Online", "Hybrid", "In person", "Varies"].includes(input.format) ? input.format : ALL,
          status: typeof input.status === "string" && [ALL, ...statuses].includes(input.status) ? input.status : ALL,
          localOnly: Boolean(input.localOnly), fundedOnly: Boolean(input.fundedOnly), singleDayOnly: Boolean(input.singleDayOnly),
        };
        setQuery(next.query); setAudience(next.audience); setField(next.field); setType(next.type); setPathway(next.pathway); setFormat(next.format); setStatus(next.status); setLocalOnly(next.localOnly); setFundedOnly(next.fundedOnly); setSingleDayOnly(next.singleDayOnly);
        document.getElementById("finder")?.scrollIntoView({ behavior: "smooth" }); await nextPaint();
        return { matchCount: applyFilters(opportunities, next).length, filters: next };
      },
    });
    register({
      name: "open_opportunity_details", title: "Open an opportunity",
      description: "Open the visible detail panel for one opportunity using its record ID.",
      inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"], additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: async (raw: unknown) => {
        const id = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as { id?: unknown }).id : undefined;
        if (typeof id !== "string") throw new Error("A record ID is required.");
        const item = opportunities.find((record) => record.id === id); if (!item) throw new Error("Opportunity not found.");
        setSelected(item); setSheetOpen(true); await nextPaint(); return { id: item.id, name: item.name, status: item.status };
      },
    });
    return () => lifecycle.abort();
  }, [audiences, fields, pathwayOptions, statuses, types]);

  function clearFilters() { setQuery(""); setAudience(ALL); setField(ALL); setType(ALL); setPathway(ALL); setFormat(ALL); setStatus(ALL); setLocalOnly(false); setFundedOnly(false); setSingleDayOnly(false); }
  function openRecord(item: Opportunity) { setSelected(item); setSheetOpen(true); }
  function applyPreset(preset: "community-research" | "high-aerospace" | "local" | "funded" | "single-day" | "competitions") {
    clearFilters();
    if (preset === "community-research") { setAudience("Community college"); setType("Internship & research"); }
    if (preset === "high-aerospace") { setAudience("High school"); setField("Aerospace & space"); }
    if (preset === "local") setLocalOnly(true); if (preset === "funded") setFundedOnly(true); if (preset === "single-day") { setSingleDayOnly(true); setLocalOnly(true); } if (preset === "competitions") setType("Competition & challenge");
    requestAnimationFrame(() => document.getElementById("finder")?.scrollIntoView({ behavior: "smooth" }));
  }
  async function copyQuestionBrief() {
    await navigator.clipboard.writeText(questionBrief);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }
  async function copySuggestionBrief() {
    await navigator.clipboard.writeText(suggestionBrief);
    setSuggestCopied(true);
    window.setTimeout(() => setSuggestCopied(false), 1800);
  }
  function openSuggestionEmail() {
    window.location.href = `mailto:?subject=${encodeURIComponent(`STEM opportunity suggestion: ${suggestTitle.trim() || "new lead"}`)}&body=${encodeURIComponent(suggestionBrief)}`;
  }
  async function copyTraining(module: TrainingModule) {
    await navigator.clipboard.writeText(`${module.title}\n\n${module.outcome}\n\n${module.template}`);
    setCopiedTraining(module.id);
    window.setTimeout(() => setCopiedTraining(""), 1800);
  }
  function downloadCalendar(item: Opportunity) {
    if (!item.event_start_date) return;
    const compact = item.event_start_date.replaceAll("-", "");
    const next = new Date(`${item.event_start_date}T12:00:00Z`); next.setUTCDate(next.getUTCDate() + 1);
    const end = next.toISOString().slice(0, 10).replaceAll("-", "");
    const clean = (value: string) => value.replaceAll("\\", "\\\\").replaceAll("\n", "\\n").replaceAll(",", "\\,").replaceAll(";", "\\;");
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//NOVA STEM Leadership Hub//EN", "BEGIN:VEVENT", `UID:${item.id}@nova-stem-hub`, `DTSTART;VALUE=DATE:${compact}`, `DTEND;VALUE=DATE:${end}`, `SUMMARY:${clean(item.name)}`, `LOCATION:${clean(item.location)}`, `DESCRIPTION:${clean(`${item.short_description} Official page: ${item.official_url}`)}`, `URL:${item.official_url}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${item.id}.ics`; anchor.click(); URL.revokeObjectURL(url);
  }
  function downloadCsv() {
    const columns: [string, (item: Opportunity) => string][] = [
      ["Name", (item) => item.name], ["Organization", (item) => item.organization], ["Description", (item) => item.short_description], ["STEM fields", (item) => item.stem_fields.join("; ")], ["Pathways", (item) => item.leadership_pathways.join("; ")], ["Eligibility", (item) => item.audience_eligibility], ["Type", (item) => item.opportunity_type], ["Actions", (item) => item.nova_actions.join("; ")], ["Location", (item) => item.location], ["Format", (item) => item.modality], ["Date", (item) => item.date], ["Deadline", (item) => item.deadline], ["Cost", (item) => item.cost], ["Student pricing", (item) => item.student_pricing], ["Funding/travel support", (item) => item.funding_travel_support], ["Annual recurrence", (item) => item.annual_recurrence], ["Official link", (item) => item.official_url], ["Next action", (item) => item.recommended_next_action], ["Notes", (item) => item.notes], ["Status", (item) => item.status], ["Last verified", (item) => item.date_last_verified],
    ];
    const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const csv = [columns.map(([label]) => escape(label)).join(","), ...filtered.map((item) => columns.map(([, getter]) => escape(getter(item))).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "nova-stem-opportunities-filtered.csv"; anchor.click(); URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-2 px-4 py-3.5 sm:gap-6 sm:px-8 lg:px-12">
          <a className="flex min-w-0 items-center gap-2.5 sm:gap-3" href="#top" aria-label="NOVA STEM Leadership Hub home"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_8px_24px_rgb(18_43_76/18%)]"><Compass className="size-5" /></span><span className="min-w-0"><span className="hidden truncate text-[0.68rem] font-bold uppercase tracking-[0.16em] text-muted-foreground sm:block">Northern Virginia Community College</span><span className="block truncate text-[0.9rem] font-extrabold tracking-[-0.02em] sm:text-[1.02rem]">STEM Leadership Hub</span></span></a>
          <nav className="hidden items-center gap-5 text-sm font-semibold text-muted-foreground xl:flex" aria-label="Primary navigation"><a className="hover:text-foreground" href="#quickstart">Start here</a><a className="hover:text-foreground" href="#upcoming">Upcoming</a><a className="hover:text-foreground" href="#events">Calendar & timeline</a><a className="hover:text-foreground" href="#finder">All opportunities</a><a className="hover:text-foreground" href="#training">Training</a><a className="hover:text-foreground" href="#coach">Ask & suggest</a></nav>
          <Button className="shrink-0 rounded-full" asChild><a href="#quickstart"><span className="sm:hidden">Start</span><span className="hidden sm:inline">Choose a starting point</span> <ArrowUpRight /></a></Button>
        </div>
      </header>

      <section id="top" className="relative overflow-hidden border-b border-border/70">
        <div className="absolute inset-0 field-grid opacity-70" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-[1480px] gap-9 px-5 py-12 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-12 lg:py-16">
          <div className="flex flex-col justify-center"><div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-sm font-bold text-cyan-900"><ShieldCheck className="size-4" /> Official-source snapshot · refreshed October 2, 2026</div><p className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-cyan-800">A launchpad for student-led STEM work</p><h1 className="max-w-4xl text-balance text-[clamp(2.7rem,6vw,5.7rem)] font-black leading-[0.92] tracking-[-0.06em] text-primary">Choose a direction.<br /><span className="text-cyan-800">Build the next move.</span></h1><p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">{clubData.vision.short}</p><div className="mt-8 flex flex-wrap gap-3"><Button size="lg" className="rounded-full" asChild><a href="#quickstart">Start with four choices <ArrowRight /></a></Button><Button size="lg" variant="outline" className="rounded-full bg-white" asChild><a href="#finder">Search all {opportunityData.record_count}</a></Button></div><blockquote className="mt-8 max-w-3xl border-l-4 border-accent pl-5 text-lg font-bold leading-8 text-primary">“{clubData.vision.promise}”</blockquote></div>
          <div className="grid content-start gap-4 rounded-[1.75rem] border border-slate-200 bg-white/90 p-5 shadow-[0_28px_80px_rgb(15_40_75/12%)] backdrop-blur sm:p-7"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.15em] text-cyan-800">Validated resource snapshot</p><h2 className="mt-1 text-2xl font-black tracking-[-0.035em] text-primary">Current, sourced, and honest about TBA dates</h2></div><ShieldCheck className="size-9 text-cyan-700" /></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">{[[String(opportunityData.record_count), "official-source records"], [String(opportunityData.confirmed_count), "confirmed for 2026–27"], [String(opportunityData.community_college_count), "explicitly community college"], [String(opportunityData.local_count), "DC / Virginia relevance"]].map(([value, label]) => <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-3xl font-black tracking-[-0.04em] text-primary">{value}</p><p className="mt-1 text-sm leading-5 text-slate-600">{label}</p></div>)}</div><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950"><strong className="block">What “validated” means here</strong>Dates, eligibility, prices, and links come from the organizer or sponsoring agency. If the next cycle is not published, the record stays marked TBA instead of borrowing an old date.</div><div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm leading-6 text-cyan-950"><strong className="block">Private by design</strong>No accounts, profiles, analytics, saved progress, or on-site submissions. Filters and typed text exist only in the open page and disappear when it closes. {pastDeadlineCount} passed deadlines are automatically kept out of “Act next.”</div></div>
        </div>
      </section>

      <section id="quickstart" className="border-b border-border bg-white"><div className="mx-auto max-w-[1480px] px-5 py-12 sm:px-8 lg:px-12"><div className="section-heading"><div><p className="eyebrow">Start here</p><h2>What do you want to do?</h2></div><p>Pick one route. You can always open the full record later for eligibility, cost, travel, and source notes.</p></div><div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <a href="#upcoming" className="group rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-50"><CalendarDays className="size-6 text-cyan-800" /><h3 className="mt-4 text-xl font-black text-primary">I need the next deadline</h3><p className="mt-2 text-sm leading-6 text-slate-600">See the eight nearest confirmed actions.</p><span className="mt-5 inline-flex items-center gap-1 text-sm font-black text-cyan-800">Show me <ArrowRight className="size-4" /></span></a>
        <button className="group rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-50" onClick={() => applyPreset("competitions")}><Trophy className="size-6 text-cyan-800" /><h3 className="mt-4 text-xl font-black text-primary">I want to compete</h3><p className="mt-2 text-sm leading-6 text-slate-600">Open {opportunities.filter((item) => item.type_group === "Competition & challenge").length} challenges and competitions.</p><span className="mt-5 inline-flex items-center gap-1 text-sm font-black text-cyan-800">Compare options <ArrowRight className="size-4" /></span></button>
        <button className="group rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-50" onClick={() => applyPreset("single-day")}><MapPin className="size-6 text-cyan-800" /><h3 className="mt-4 text-xl font-black text-primary">I want something nearby</h3><p className="mt-2 text-sm leading-6 text-slate-600">Find short DC and Northern Virginia events.</p><span className="mt-5 inline-flex items-center gap-1 text-sm font-black text-cyan-800">See local events <ArrowRight className="size-4" /></span></button>
        <a href="#coach" className="group rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-50"><MessageCircle className="size-6 text-cyan-800" /><h3 className="mt-4 text-xl font-black text-primary">I need help choosing</h3><p className="mt-2 text-sm leading-6 text-slate-600">Build a focused question for the club or an advisor.</p><span className="mt-5 inline-flex items-center gap-1 text-sm font-black text-cyan-800">Use the coach <ArrowRight className="size-4" /></span></a>
      </div></div></section>

      <section id="upcoming" className="border-b border-border bg-white"><div className="mx-auto max-w-[1480px] px-5 py-12 sm:px-8 lg:px-12"><div className="section-heading"><div><p className="eyebrow">Act next</p><h2>Upcoming opportunities</h2></div><p>Near-term confirmed deadlines calculated from today’s date. Passed deadlines are hidden here; always recheck the official page before submitting, paying, or traveling.</p></div><div className="mt-7 grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 md:grid-cols-2 xl:grid-cols-4">{upcoming.map((item, index) => <button key={item.id} className="group min-h-56 bg-white p-5 text-left transition hover:bg-cyan-50" onClick={() => openRecord(item)}><div className="flex items-start justify-between gap-4"><span className="text-xs font-black uppercase tracking-[0.13em] text-cyan-800">0{index + 1}</span><ArrowUpRight className="size-4 text-slate-400 group-hover:text-cyan-800" /></div><p className="mt-6 text-sm font-black text-rose-700">{dueLabel(item.deadline_date, currentDate)}</p><h3 className="mt-2 text-lg font-black leading-6 tracking-[-0.02em] text-primary">{item.name}</h3><p className="mt-2 text-sm font-semibold text-slate-500">{item.organization}</p><p className="mt-5 line-clamp-2 text-sm leading-5 text-slate-600">{item.recommended_next_action}</p></button>)}</div></div></section>

      <section id="events" className="border-b border-border bg-[#eaf2f7]"><div className="mx-auto max-w-[1480px] px-5 py-14 sm:px-8 lg:px-12"><div className="section-heading"><div><p className="eyebrow">Event planner</p><h2>See the date, distance, and lead time.</h2></div><p>Use the calendar for short regional events, the map for travel patterns, and the planning timeline for competitions and conferences that need months of preparation.</p></div>
        <div className="mt-6 flex flex-wrap items-center gap-2"><span className="mr-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500">Show events in the next</span>{[["7", "7 days"], ["30", "30 days"], ["90", "90 days"], ["all", "All future"]].map(([value, label]) => <Button key={value} size="sm" variant={eventWindow === value ? "default" : "outline"} className="rounded-full bg-white" onClick={() => setEventWindow(value)}>{label}</Button>)}</div>
        <Tabs defaultValue="calendar" className="mt-8"><div className="overflow-x-auto pb-1"><TabsList className="h-auto min-w-max rounded-xl bg-white p-1.5"><TabsTrigger value="calendar" className="rounded-lg px-4 py-2.5 font-bold"><CalendarDays /> Calendar</TabsTrigger><TabsTrigger value="map" className="rounded-lg px-4 py-2.5 font-bold"><MapIcon /> Map</TabsTrigger><TabsTrigger value="timeline" className="rounded-lg px-4 py-2.5 font-bold"><Trophy /> Planning timeline</TabsTrigger></TabsList></div>
          <TabsContent value="calendar" className="mt-4"><div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_16px_60px_rgb(18_45_79/7%)] sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-2xl font-black tracking-[-0.03em] text-primary">Single-day STEM calendar</h3><p className="mt-1 text-sm text-slate-600">{eventRecords.length} verified events in this snapshot</p></div><div className="flex flex-wrap gap-2">{eventMonths.map((month) => <Button key={month} size="sm" variant={calendarMonth === month ? "default" : "outline"} className="rounded-full" onClick={() => setCalendarMonth(month)}>{new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T12:00:00Z`))}</Button>)}</div></div>
            <div className="mt-6 overflow-x-auto"><div className="min-w-[820px]"><div className="grid grid-cols-7 border-b border-slate-200">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="px-2 py-2 text-center text-xs font-black uppercase tracking-[0.12em] text-slate-500">{day}</div>)}</div><div className="grid grid-cols-7 overflow-hidden rounded-b-xl border-b border-l border-slate-200">{calendarCells.map((cell, index) => <div key={index} className={`min-h-32 border-r border-t border-slate-200 p-2 ${cell.day ? "bg-white" : "bg-slate-50"}`}><span className={`text-xs font-black ${cell.records.length ? "text-cyan-800" : "text-slate-400"}`}>{cell.day}</span><div className="mt-2 space-y-1.5">{cell.records.map((item) => <button key={item.id} className="block w-full rounded-lg bg-cyan-50 px-2 py-1.5 text-left text-xs font-bold leading-4 text-primary transition hover:bg-cyan-100" onClick={() => openRecord(item)}>{item.name}</button>)}</div></div>)}</div></div></div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"><p className="text-sm text-slate-600">Past events are hidden automatically. Open any event to download a calendar file.</p><Button variant="outline" className="rounded-full" onClick={() => applyPreset("single-day")}>Open local events in the finder <ArrowRight /></Button></div></div></TabsContent>
          <TabsContent value="map" className="mt-4"><div className="grid gap-5 lg:grid-cols-[1.55fr_0.75fr]"><div className="relative min-h-[560px] overflow-hidden rounded-[1.5rem] border border-slate-300 bg-[#dcebf1] shadow-[0_16px_60px_rgb(18_45_79/7%)]"><div className="dmv-map absolute inset-0" aria-hidden="true" /><div className="absolute left-[9%] top-[48%] text-xs font-black uppercase tracking-[0.12em] text-slate-500">Northern Virginia</div><div className="absolute bottom-[7%] right-[9%] text-xs font-black uppercase tracking-[0.12em] text-slate-500">Southern Maryland</div>{mapGroups.map((group) => { const left = Math.max(7, Math.min(93, ((group.lon + 77.65) / 1.3) * 100)); const top = Math.max(10, Math.min(90, ((39.4 - group.lat) / 1.15) * 100)); return <div key={`${group.place}-${group.lat}`} style={{ left: `${left}%`, top: `${top}%` }} className="absolute z-10 -translate-x-1/2 -translate-y-1/2"><span className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/95 px-2 py-1 text-[0.65rem] font-black text-primary shadow">{group.place}</span><button className="rounded-full border-4 border-white bg-primary px-3 py-2 text-xs font-black text-white shadow-lg transition hover:scale-110 hover:bg-cyan-800" title={`${group.place}: ${group.records.length} event${group.records.length === 1 ? "" : "s"}`} onClick={() => openRecord(group.records[0])}><span className="block text-base leading-none">{group.records.length}</span><span className="sr-only"> events in {group.place}</span></button></div>; })}<div className="absolute bottom-4 left-4 rounded-xl bg-white/95 px-4 py-3 text-xs leading-5 text-slate-600 shadow"><strong className="block text-primary">How to read the map</strong>Numbered pins group events by place. Select a pin to open the first event, then use the location list for every event there.</div></div>
            <div className="space-y-4"><div className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-black text-primary">In-person clusters</h3><div className="mt-3 divide-y divide-slate-100">{[...mapGroups].sort((a, b) => a.place.localeCompare(b.place)).map((group) => <div key={group.place} className="py-3"><div className="flex items-center justify-between gap-3"><strong className="text-sm text-primary">{group.place}</strong><Badge variant="secondary">{group.records.length}</Badge></div><p className="mt-1 text-[0.7rem] leading-4 text-slate-500">{transitNote(group.place)}</p>{group.records.map((item) => <button key={item.id} className="mt-2 block text-left text-xs font-semibold leading-4 text-cyan-800 hover:underline" onClick={() => openRecord(item)}>{displayDate(item.event_start_date)} · {item.name}</button>)}</div>)}</div></div><div className="rounded-2xl border border-violet-200 bg-violet-50 p-5"><h3 className="font-black text-violet-950">Attend from anywhere</h3><p className="mt-1 text-sm leading-5 text-violet-800">{onlineEvents.length} single-day events are fully virtual.</p><div className="mt-3 space-y-2">{onlineEvents.slice(0, 5).map((item) => <button key={item.id} className="block text-left text-xs font-bold leading-4 text-violet-900 hover:underline" onClick={() => openRecord(item)}>{displayDate(item.event_start_date)} · {item.name}</button>)}</div></div></div></div></TabsContent>
          <TabsContent value="timeline" className="mt-4"><div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_16px_60px_rgb(18_45_79/7%)] sm:p-7"><div className="grid gap-4 border-b border-slate-200 pb-6 md:grid-cols-[0.8fr_1.2fr]"><div><h3 className="text-2xl font-black tracking-[-0.03em] text-primary">Competition and conference runway</h3><p className="mt-2 text-sm leading-6 text-slate-600">The date shown is the next official submission, registration, or price milestone—not necessarily the event date.</p></div><div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><strong>Planning rule:</strong> form teams 8-16 weeks before a competition deadline, request recommendations 4-6 weeks before an application, and make travel decisions before the cheapest registration window closes.</div></div><div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">{planningBuckets.map((bucket) => <section key={bucket.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><div><h4 className="font-black text-primary">{bucket.label}</h4><p className="mt-1 text-xs text-slate-500">{bucket.note}</p></div><Badge variant="secondary">{bucket.records.length}</Badge></div><div className="mt-4 divide-y divide-slate-200">{bucket.records.slice(0, 7).map((item) => <button key={item.id} className="block w-full py-3 text-left" onClick={() => openRecord(item)}><span className="block text-xs font-black uppercase tracking-wide text-cyan-800">{item.deadline_date ? displayDate(item.deadline_date) : item.status}</span><strong className="mt-1 block text-sm leading-5 text-primary">{item.name}</strong><span className="mt-1 block text-xs leading-4 text-slate-500">{item.date}</span></button>)}</div>{bucket.records.length > 7 && <p className="border-t border-slate-200 pt-3 text-xs font-semibold text-slate-500">+ {bucket.records.length - 7} more in the finder</p>}</section>)}</div><div className="mt-7 border-t border-slate-200 pt-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.13em] text-cyan-800">Source watchlist</p><h3 className="mt-1 text-xl font-black text-primary">Official calendars and discovery communities</h3></div><p className="max-w-2xl text-sm leading-6 text-slate-600">Eventbrite, LinkedIn, Meetup, and community calendars are used to discover leads. A record is only marked validated after checking an organizer or sponsoring-agency page.</p></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{sourceWatchlist.map((source) => <a key={source.name} href={source.url} target="_blank" rel="noreferrer" className={`rounded-xl border p-4 transition hover:border-cyan-300 hover:bg-cyan-50 ${source.kind === "discovery" ? "border-violet-200 bg-violet-50/40" : "border-slate-200"}`}><span className="flex items-start justify-between gap-3"><span><Badge variant="outline" className="mb-2">{source.kind === "discovery" ? "Discovery lead" : "Official calendar"}</Badge><strong className="block text-sm text-primary">{source.name}</strong></span><ExternalLink className="size-4 shrink-0 text-slate-400" /></span><span className="mt-2 block text-xs leading-5 text-slate-600">{source.focus}</span><span className="mt-3 block text-[0.68rem] font-black uppercase tracking-wide text-cyan-800">{source.region} · {source.cadence}</span></a>)}</div></div></div></TabsContent>
        </Tabs></div></section>

      <section id="finder" className="mx-auto max-w-[1480px] px-5 py-14 sm:px-8 lg:px-12">
        <div className="section-heading"><div><p className="eyebrow">Opportunity finder</p><h2>Start with what matters to you</h2></div><p>Search across eligibility, fields, formats, pathways, location, funding, and status. TBA records are intentionally separate from confirmed dates.</p></div>
        <div className="mt-7 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_16px_60px_rgb(18_45_79/7%)] sm:p-6">
          <div className="grid gap-3 lg:grid-cols-[minmax(280px,1.4fr)_repeat(3,minmax(150px,0.6fr))]"><label className="relative block"><span className="filter-label">Search</span><Search className="pointer-events-none absolute bottom-3.5 left-3 size-4 text-slate-500" /><Input className="h-11 rounded-xl bg-slate-50 pl-10 text-base shadow-none" placeholder="Try biology, aerospace, policy, or paid" value={query} onChange={(event) => setQuery(event.target.value)} /></label>{[["Audience", audience, setAudience, audiences], ["STEM area", field, setField, fields], ["Opportunity type", type, setType, types]].map(([label, value, setter, options]) => <label key={label as string} className="block"><span className="filter-label">{label as string}</span><NativeSelect className="h-11 w-full rounded-xl bg-slate-50 text-sm shadow-none" value={value as string} onChange={(event) => (setter as (next: string) => void)(event.target.value)}><NativeSelectOption value={ALL}>All</NativeSelectOption>{(options as string[]).map((option) => <NativeSelectOption key={option} value={option}>{option}</NativeSelectOption>)}</NativeSelect></label>)}</div>
          <div className="mt-3 grid gap-3 lg:grid-cols-[repeat(3,minmax(150px,1fr))_auto_auto_auto] lg:items-end">{[["Leadership pathway", pathway, setPathway, pathwayOptions], ["Format", format, setFormat, ["Online", "Hybrid", "In person", "Varies"]], ["Planning status", status, setStatus, statuses]].map(([label, value, setter, options]) => <label key={label as string} className="block"><span className="filter-label">{label as string}</span><NativeSelect className="h-11 w-full rounded-xl bg-slate-50 text-sm shadow-none" value={value as string} onChange={(event) => (setter as (next: string) => void)(event.target.value)}><NativeSelectOption value={ALL}>All</NativeSelectOption>{(options as string[]).map((option) => <NativeSelectOption key={option} value={option}>{option}</NativeSelectOption>)}</NativeSelect></label>)}<label className="flex h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700"><span>DC / Virginia</span><Switch checked={localOnly} onCheckedChange={setLocalOnly} /></label><label className="flex h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700"><span>Funding</span><Switch checked={fundedOnly} onCheckedChange={setFundedOnly} /></label><label className="flex h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700"><span>Single-day</span><Switch checked={singleDayOnly} onCheckedChange={setSingleDayOnly} /></label></div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"><div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-600"><span className="rounded-full bg-primary px-3 py-1.5 text-primary-foreground">{filtered.length} matches</span><span>{activeFilterCount ? `${activeFilterCount} active filter${activeFilterCount === 1 ? "" : "s"}` : "Showing the full database"}</span>{activeFilterCount > 0 && <button className="inline-flex items-center gap-1 font-bold text-cyan-800 hover:underline" onClick={clearFilters}><X className="size-3.5" /> Clear</button>}</div><Button variant="outline" size="sm" className="rounded-full" onClick={downloadCsv} disabled={!filtered.length}><Download /> Export filtered CSV</Button></div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2" aria-label="Suggested searches"><span className="mr-1 self-center text-xs font-black uppercase tracking-[0.13em] text-slate-500">Try a route</span><Button variant="outline" size="sm" className="rounded-full bg-white" onClick={() => applyPreset("community-research")}>Community college + research</Button><Button variant="outline" size="sm" className="rounded-full bg-white" onClick={() => applyPreset("high-aerospace")}>High school + aerospace</Button><Button variant="outline" size="sm" className="rounded-full bg-white" onClick={() => applyPreset("single-day")}>Local single-day events</Button><Button variant="outline" size="sm" className="rounded-full bg-white" onClick={() => applyPreset("local")}>DC / Virginia</Button><Button variant="outline" size="sm" className="rounded-full bg-white" onClick={() => applyPreset("funded")}>Funding available</Button></div>
        <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-live="polite">{filtered.slice(0, visibleCount).map((item) => <OpportunityCard key={item.id} item={item} onOpen={openRecord} currentDate={currentDate} />)}</div>
        {filtered.length === 0 && <div className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><Search className="mx-auto size-8 text-slate-400" /><p className="mt-3 text-lg font-black text-primary">No exact match in this snapshot.</p><p className="mt-1 text-slate-600">Clear one filter, broaden the audience, or try a related STEM field.</p><Button variant="outline" className="mt-5 rounded-full" onClick={clearFilters}>Clear all filters</Button></div>}
        {visibleCount < filtered.length && <div className="mt-8 text-center"><Button variant="outline" size="lg" className="rounded-full bg-white" onClick={() => setVisibleCount((count) => count + 12)}>Show 12 more <ArrowRight /></Button></div>}
      </section>

      <section id="training" className="border-y border-border bg-[#f7f4ed]"><div className="mx-auto max-w-[1480px] px-5 py-14 sm:px-8 lg:px-12"><div className="section-heading"><div><p className="eyebrow">Training center</p><h2>Practice the move before it matters</h2></div><p>Short, practical lessons for opportunity validation, applications, events, mentoring, and competitions. Nothing is tracked; copy a worksheet and use it wherever you choose.</p></div><div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{trainingModules.map((module, index) => <article key={module.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_28px_rgb(18_45_79/5%)]"><div className="flex items-center justify-between gap-3"><span className="grid size-9 place-items-center rounded-full bg-primary text-sm font-black text-white">{index + 1}</span><Badge variant="secondary">{module.time}</Badge></div><h3 className="mt-5 text-xl font-black tracking-[-0.025em] text-primary">{module.title}</h3><p className="mt-2 text-sm font-semibold leading-6 text-cyan-900">{module.outcome}</p><ol className="mt-4 space-y-2 border-t border-slate-100 pt-4">{module.steps.map((step, stepIndex) => <li key={step} className="grid grid-cols-[1.4rem_1fr] gap-2 text-sm leading-5 text-slate-600"><span className="font-black text-cyan-800">{stepIndex + 1}.</span>{step}</li>)}</ol><Button variant="outline" className="mt-5 rounded-full" onClick={() => copyTraining(module)}><Copy /> {copiedTraining === module.id ? "Worksheet copied" : "Copy worksheet"}</Button></article>)}</div><div className="mt-6 flex items-start gap-3 rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm leading-6 text-cyan-950"><ShieldCheck className="mt-0.5 size-5 shrink-0" /><p><strong>Privacy promise:</strong> there are no logins, profiles, saved progress, tracking pixels, or forms that submit to this site. Copy buttons use your browser’s clipboard only when you choose them.</p></div></div></section>

      <section id="coach" className="border-y border-border bg-white"><div className="mx-auto max-w-[1480px] px-5 py-14 sm:px-8 lg:px-12"><div className="section-heading"><div><p className="eyebrow">Ask, learn & contribute</p><h2>Get help—or bring the club a new lead</h2></div><p>The coach turns uncertainty into a focused question. The suggestion form prepares text you can copy or email yourself. Neither tool sends or saves what you type.</p></div>
        <div className="mt-8 grid gap-5 lg:grid-cols-[0.78fr_1.22fr]"><div className="rounded-[1.5rem] bg-primary p-6 text-primary-foreground sm:p-8"><MessageCircle className="size-8 text-cyan-300" /><h3 className="mt-5 text-3xl font-black tracking-[-0.04em]">Build your advice brief</h3><p className="mt-3 leading-7 text-slate-300">Good advice starts with a clear goal, the exact point of friction, and the facts you have already checked.</p><div className="mt-7 space-y-5"><label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-[0.13em] text-cyan-200">1 · What are you trying to do?</span><NativeSelect className="h-12 w-full rounded-xl border-white/20 bg-white text-primary" value={coachGoal} onChange={(event) => setCoachGoal(event.target.value)}>{coachGoals.map((item) => <NativeSelectOption key={item} value={item}>{item}</NativeSelectOption>)}</NativeSelect></label><label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-[0.13em] text-cyan-200">2 · Where are you stuck?</span><NativeSelect className="h-12 w-full rounded-xl border-white/20 bg-white text-primary" value={coachBlocker} onChange={(event) => setCoachBlocker(event.target.value)}>{coachBlockers.map((item) => <NativeSelectOption key={item} value={item}>{item}</NativeSelectOption>)}</NativeSelect></label><label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-[0.13em] text-cyan-200">3 · Add the opportunity or context</span><textarea className="min-h-28 w-full rounded-xl border border-white/20 bg-white p-3 text-sm leading-6 text-primary outline-none ring-cyan-300 focus:ring-2" placeholder="Example: I am a first-year cybersecurity student with 14 credits. I can travel only on Fridays, and I am looking at NREIP." value={coachQuestion} onChange={(event) => setCoachQuestion(event.target.value)} /></label></div><div className="mt-4 flex items-center gap-2 text-xs leading-5 text-slate-300"><ShieldCheck className="size-4 shrink-0 text-cyan-300" />Nothing is submitted. Copy the brief and choose who receives it.</div></div>
          <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-5"><Target className="size-6 text-cyan-800" /><p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-cyan-800">Coach&apos;s focus</p><p className="mt-2 text-sm font-semibold leading-6 text-primary">{goalAdvice[coachGoal]}</p></div><div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><Lightbulb className="size-6 text-amber-700" /><p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-amber-800">Unblock the next step</p><p className="mt-2 text-sm font-semibold leading-6 text-primary">{blockerAdvice[coachBlocker]}</p></div></div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Copyable question brief</p><h3 className="mt-1 text-xl font-black text-primary">Bring this to the club or an advisor</h3></div><Button className="rounded-full" onClick={copyQuestionBrief}><Copy /> {copied ? "Copied" : "Copy brief"}</Button></div><pre className="mt-5 whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-4 font-sans text-sm leading-6 text-slate-700">{questionBrief}</pre></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Practice on real options</p><h3 className="mt-1 text-xl font-black text-primary">Four records to compare</h3></div><Badge variant="secondary">{coachRecommendations.length}</Badge></div><div className="mt-3 divide-y divide-slate-100">{coachRecommendations.map((item) => <button key={item.id} className="group flex w-full items-center justify-between gap-4 py-3 text-left" onClick={() => openRecord(item)}><span><strong className="block text-sm text-primary group-hover:text-cyan-800">{item.name}</strong><span className="mt-1 block text-xs text-slate-500">{item.organization} · {item.status}</span></span><ArrowRight className="size-4 shrink-0 text-slate-400 group-hover:translate-x-1" /></button>)}</div></div></div></div>
        <div className="mt-7 rounded-[1.5rem] border border-violet-200 bg-violet-50 p-5 sm:p-7"><div className="grid gap-5 lg:grid-cols-[0.62fr_1.38fr]"><div><p className="text-xs font-black uppercase tracking-[0.13em] text-violet-700">Suggest an event or opportunity</p><h3 className="mt-2 text-3xl font-black tracking-[-0.04em] text-primary">Found something we missed?</h3><p className="mt-3 leading-7 text-slate-700">Give the club the official link and the facts needed to validate it. Copy the brief or open an email draft, then choose the advisor or student editor who should receive it.</p><div className="mt-5 rounded-xl border border-violet-200 bg-white/70 p-4 text-sm leading-6 text-violet-950"><strong className="block">Validation checklist</strong>Official organizer page · date or deadline · who can participate · cost or student rate · travel or virtual access</div></div><div className="grid gap-3 sm:grid-cols-2"><label className="block"><span className="filter-label">Title</span><Input className="h-11 rounded-xl bg-white" placeholder="Example: local AI hackathon" value={suggestTitle} onChange={(event) => setSuggestTitle(event.target.value)} /></label><label className="block"><span className="filter-label">Organizer</span><Input className="h-11 rounded-xl bg-white" placeholder="Organization or university" value={suggestOrganizer} onChange={(event) => setSuggestOrganizer(event.target.value)} /></label><label className="block sm:col-span-2"><span className="filter-label">Official URL</span><Input className="h-11 rounded-xl bg-white" type="url" placeholder="https://official-organizer.org/event" value={suggestUrl} onChange={(event) => setSuggestUrl(event.target.value)} /></label><label className="block"><span className="filter-label">Date or deadline</span><Input className="h-11 rounded-xl bg-white" placeholder="Published date or TBA" value={suggestTiming} onChange={(event) => setSuggestTiming(event.target.value)} /></label><label className="block"><span className="filter-label">Eligibility, cost, or access</span><Input className="h-11 rounded-xl bg-white" placeholder="Who can join? Free, paid, virtual?" value={suggestAccess} onChange={(event) => setSuggestAccess(event.target.value)} /></label><label className="block sm:col-span-2"><span className="filter-label">Why it fits NOVA students</span><textarea className="min-h-24 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm leading-6 text-primary outline-none ring-violet-300 focus:ring-2" placeholder="What field, pathway, or student goal does it support?" value={suggestFit} onChange={(event) => setSuggestFit(event.target.value)} /></label><div className="flex flex-wrap gap-3 sm:col-span-2"><Button className="rounded-full" onClick={copySuggestionBrief}><Copy /> {suggestCopied ? "Copied" : "Copy suggestion"}</Button><Button variant="outline" className="rounded-full bg-white" onClick={openSuggestionEmail}>Open email draft <ArrowUpRight /></Button></div><p className="text-xs leading-5 text-slate-600 sm:col-span-2">This site has no inbox and stores nothing. The email button opens your own mail app with no recipient filled in.</p></div></div></div>
      </div></section>

      <section id="pathways" className="border-y border-border bg-primary py-14 text-primary-foreground"><div className="mx-auto max-w-[1480px] px-5 sm:px-8 lg:px-12"><div className="section-heading section-heading-dark"><div><p className="eyebrow text-cyan-200!">Leadership pathways</p><h2>Leadership is a practice, not a title</h2></div><p>Pathways are starting points—not boxes. Students can combine them, change direction, and lead at an appropriate scale from their first semester.</p></div><div className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-white/15 bg-white/15 md:grid-cols-2 xl:grid-cols-4">{pathways.map((item, index) => <article key={item.slug} className="flex min-h-[380px] flex-col bg-primary p-6 transition hover:bg-[#173a63]"><p className="text-sm font-black text-cyan-200">0{index + 1}</p><h3 className="mt-5 text-2xl font-black leading-7 tracking-[-0.03em]">{item.name}</h3><p className="mt-3 text-sm leading-6 text-slate-300">{item.description}</p><div className="mt-5 border-t border-white/15 pt-4"><p className="text-xs font-black uppercase tracking-[0.13em] text-amber-300">Student-led examples</p><ul className="mt-3 space-y-2 text-sm leading-5 text-slate-200">{item.example_activities.slice(0, 3).map((activity) => <li key={activity} className="flex gap-2"><span className="text-cyan-300">•</span>{activity}</li>)}</ul></div><div className="mt-auto flex flex-wrap gap-1.5 pt-5">{item.starter_roles.slice(0, 3).map((role) => <span key={role} className="rounded-full border border-white/15 px-2.5 py-1 text-xs font-bold text-slate-200">{role}</span>)}</div></article>)}</div><p className="mt-6 max-w-4xl text-sm leading-6 text-slate-300"><strong className="text-white">Why competitions are not their own pathway:</strong> a competition is a vehicle for research, technical design, entrepreneurship, communication, outreach, or team leadership. Organizing this way keeps the learning goal visible.</p></div></section>

      <section id="guides" className="mx-auto max-w-[1480px] px-5 py-14 sm:px-8 lg:px-12"><div className="section-heading"><div><p className="eyebrow">Curated guides</p><h2>Turn a directory into a plan</h2></div><p>Each guide pulls the most relevant records into a planning view. Open any record for complete eligibility, pricing, funding, notes, and the direct official link.</p></div><Tabs defaultValue="meetings" className="mt-7"><div className="overflow-x-auto pb-2"><TabsList className="h-auto min-w-max rounded-xl bg-slate-200/70 p-1.5">{guideSets.map((guide) => <TabsTrigger key={guide.value} value={guide.value} className="rounded-lg px-4 py-2.5 text-sm font-bold">{guide.label}</TabsTrigger>)}</TabsList></div>{guideSets.map((guide) => { const guideRecords = opportunities.filter((item) => guide.types.includes(item.type_group)); return <TabsContent key={guide.value} value={guide.value} className="mt-4"><div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 sm:p-7"><div className="grid gap-4 border-b border-slate-200 pb-6 md:grid-cols-[0.8fr_1.2fr]"><h3 className="text-3xl font-black tracking-[-0.04em] text-primary">{guide.title}</h3><p className="text-lg leading-8 text-slate-600">{guide.description}</p></div><div className="mt-3 divide-y divide-slate-200">{guideRecords.slice(0, 7).map((item) => <button key={item.id} className="group grid w-full gap-3 py-5 text-left transition hover:bg-slate-50 sm:grid-cols-[1.1fr_0.8fr_1fr_auto] sm:items-center sm:px-3" onClick={() => openRecord(item)}><span><span className="block font-black leading-5 text-primary">{item.name}</span><span className="mt-1 block text-sm font-semibold text-cyan-800">{item.organization}</span></span><span className="text-sm leading-5 text-slate-600"><strong className="block text-xs uppercase tracking-wide text-slate-500">Timing</strong>{item.deadline_date ? displayDate(item.deadline_date) : "Dates TBA"}</span><span className="line-clamp-2 text-sm leading-5 text-slate-600"><strong className="block text-xs uppercase tracking-wide text-slate-500">Student access</strong>{item.student_pricing || item.funding_travel_support}</span><ArrowRight className="size-4 text-slate-400 group-hover:translate-x-1 group-hover:text-cyan-800" /></button>)}</div><Button className="mt-4 rounded-full" onClick={() => { clearFilters(); setType(guide.types.length === 1 ? guide.types[0] : ALL); requestAnimationFrame(() => document.getElementById("finder")?.scrollIntoView({ behavior: "smooth" })); }}>Open this guide in the finder <ArrowRight /></Button></div></TabsContent>; })}</Tabs></section>

      <section id="playbook" className="border-t border-border bg-white"><div className="mx-auto max-w-[1480px] px-5 py-14 sm:px-8 lg:px-12"><div className="section-heading"><div><p className="eyebrow">Club operating model</p><h2>Maintain the resource by using it</h2></div><p>The database stays alive when verification, mentoring, applications, projects, and handoffs are regular student leadership work—not one advisor’s annual cleanup.</p></div><div className="mt-8 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]"><div className="rounded-2xl bg-primary p-6 text-primary-foreground sm:p-8"><p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-200">Four-step student journey</p><ol className="mt-6 space-y-6">{[["Choose a pathway", "Start with the kind of STEM leader you want to become. Pathways are starting points, not boxes."], ["Filter the database", "Read eligibility before investing time; use confirmed versus TBA status to plan honestly."], ["Take one next action", "Request a transcript, ask for a recommendation, create an account, draft an abstract, or name a project lead."], ["Bring it back", "Share what you learned, mentor another member, and leave a practical handoff for the next student."]].map(([title, text], index) => <li key={title} className="grid grid-cols-[2.4rem_1fr] gap-3"><span className="grid size-9 place-items-center rounded-full bg-cyan-300 font-black text-primary">{index + 1}</span><span><strong className="block text-lg">{title}</strong><span className="mt-1 block text-sm leading-6 text-slate-300">{text}</span></span></li>)}</ol></div><div className="grid gap-5 sm:grid-cols-2"><div className="rounded-2xl border border-slate-200 p-6"><RefreshCw className="size-7 text-cyan-700" /><h3 className="mt-4 text-xl font-black text-primary">Maintenance rhythm</h3><ul className="mt-4 space-y-4">{clubData.maintenance.cadence.map((item) => <li key={item.frequency}><strong className="text-sm text-cyan-800">{item.frequency}</strong><p className="mt-1 text-sm leading-6 text-slate-600">{item.practice}</p></li>)}</ul></div><div className="rounded-2xl border border-slate-200 p-6"><UsersRound className="size-7 text-cyan-700" /><h3 className="mt-4 text-xl font-black text-primary">Distributed ownership</h3><ul className="mt-4 space-y-4">{clubData.maintenance.roles.map((item) => <li key={item.role}><strong className="text-sm text-primary">{item.role}</strong><p className="mt-1 text-sm leading-6 text-slate-600">{item.responsibility}</p></li>)}</ul></div></div></div>
        <div className="mt-5 grid gap-5 md:grid-cols-3"><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><CheckCircle2 className="size-6 text-emerald-700" /><h3 className="mt-3 font-black text-emerald-950">Confirmed 2026–27</h3><p className="mt-2 text-sm leading-6 text-emerald-900">Official dates or active terms are published. Recheck before committing money or travel.</p></div><div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><CalendarDays className="size-6 text-amber-700" /><h3 className="mt-3 font-black text-amber-950">Recurring—dates TBA</h3><p className="mt-2 text-sm leading-6 text-amber-900">The program is valuable, but the next cycle is not announced. Plan materials; do not copy last year’s date.</p></div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><BookOpen className="size-6 text-slate-600" /><h3 className="mt-3 font-black text-slate-900">Future planning</h3><p className="mt-2 text-sm leading-6 text-slate-700">A major cycle has closed or belongs in a later horizon. Archive it and watch for the next official announcement.</p></div></div>
        <div className="mt-8 border-t border-slate-200 pt-6"><p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Five ways to participate now</p><div className="mt-4 grid gap-3 sm:grid-cols-5">{clubData.action_modes.map((mode, index) => { const icons = [Compass, Handshake, Lightbulb, Trophy, GraduationCap]; const Icon = icons[index]; return <div key={mode.name} className="rounded-xl border border-slate-200 p-4"><Icon className="size-5 text-cyan-700" /><h3 className="mt-3 font-black text-primary">{mode.name}</h3><p className="mt-1 text-sm leading-5 text-slate-600">{mode.description}</p></div>; })}</div></div></div></section>

      <footer className="border-t border-slate-700 bg-[#0b2039] px-5 py-8 text-white sm:px-8 lg:px-12"><div className="mx-auto flex max-w-[1480px] flex-col justify-between gap-4 md:flex-row md:items-center"><div><p className="font-black">NOVA STEM Leadership Hub</p><p className="mt-1 text-sm text-slate-300">Living planning resource · official-source snapshot refreshed October 2, 2026 · no accounts or tracking</p></div><div className="flex flex-wrap gap-4 text-sm font-bold text-cyan-200"><a href="#quickstart" className="hover:text-white">Start here</a><a href="#events" className="hover:text-white">Calendar & timeline</a><a href="#finder" className="hover:text-white">All opportunities</a><a href="#training" className="hover:text-white">Training</a><a href="#coach" className="hover:text-white">Ask & suggest</a></div></div></footer>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}><SheetContent className="w-[94vw] overflow-y-auto bg-white sm:max-w-[760px]">{selected && <><SheetHeader className="border-b border-slate-200 p-6 pr-12"><div className="mb-2 flex flex-wrap gap-2"><Badge variant="outline" className={statusClass(selected.status)}>{selected.status}</Badge>{selected.is_local && <Badge variant="outline">DC / Virginia</Badge>}{selected.has_funding && <Badge variant="outline">Funding</Badge>}{selected.is_single_day && <Badge variant="outline">Single-day</Badge>}</div><SheetTitle className="text-2xl font-black leading-8 tracking-[-0.035em] text-primary">{selected.name}</SheetTitle><SheetDescription className="text-base font-bold text-cyan-800">{selected.organization}</SheetDescription></SheetHeader><div className="px-6 pb-8"><p className="py-5 text-base leading-7 text-slate-700">{selected.short_description}</p><div className="mb-5 rounded-xl bg-primary p-5 text-primary-foreground"><p className="text-xs font-black uppercase tracking-[0.13em] text-cyan-200">Recommended next action</p><p className="mt-2 font-bold leading-6">{selected.recommended_next_action}</p></div><dl><DetailRow label="Eligibility">{selected.audience_eligibility}</DetailRow><DetailRow label="STEM fields">{selected.stem_fields.join(" · ")}</DetailRow><DetailRow label="Pathways">{selected.leadership_pathways.join(" · ")}</DetailRow><DetailRow label="Opportunity type">{selected.opportunity_type}</DetailRow><DetailRow label="Event scope">{selected.event_scope}</DetailRow><DetailRow label="Club use">{selected.club_use}</DetailRow><DetailRow label="Location">{selected.location}</DetailRow><DetailRow label="Format">{selected.modality}</DetailRow><DetailRow label="Program dates">{selected.date}</DetailRow><DetailRow label="Deadline">{selected.deadline}</DetailRow><DetailRow label="Cost">{selected.cost}</DetailRow><DetailRow label="Student pricing">{selected.student_pricing}</DetailRow><DetailRow label="Funding / travel">{selected.funding_travel_support}</DetailRow><DetailRow label="Recurrence">{selected.annual_recurrence}</DetailRow><DetailRow label="Notes">{selected.notes}</DetailRow><DetailRow label="Last verified">{displayDate(selected.date_last_verified)}</DetailRow></dl><div className="sticky bottom-0 mt-5 flex flex-wrap gap-3 border-t border-slate-200 bg-white/95 py-4 backdrop-blur"><Button className="rounded-full" asChild><a href={selected.official_url} target="_blank" rel="noreferrer">Open official page <ExternalLink /></a></Button>{selected.is_single_day && selected.event_start_date && <Button variant="outline" className="rounded-full" onClick={() => downloadCalendar(selected)}><CalendarDays /> Add to calendar</Button>}{selected.supporting_official_urls.slice(0, 1).map((url) => <Button key={url} variant="outline" className="rounded-full" asChild><a href={url} target="_blank" rel="noreferrer">Supporting source <ExternalLink /></a></Button>)}</div></div></>}</SheetContent></Sheet>
    </main>
  );
}
