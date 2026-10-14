import type { Metadata } from "next";
import { ArrowLeft, CheckCircle2, Clock3, Database, ExternalLink, KeyRound, ListChecks, MapPinned, ShieldAlert, Sparkles, Star } from "lucide-react";

import registryData from "@/data/source_registry.json";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Catalog Roadmap | Teacher Resource Exchange",
  description: "Current source coverage and the prioritized queue for expanding the Teacher Resource Exchange.",
};

type RegistrySource = (typeof registryData.sources)[number];
type ProductBacklogItem = (typeof registryData.product_backlog)[number];

const statusDisplay: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  completed: { label: "Completed", className: "border-emerald-200 bg-emerald-50 text-emerald-800", icon: CheckCircle2 },
  in_progress: { label: "In progress", className: "border-cyan-200 bg-cyan-50 text-cyan-900", icon: Clock3 },
  indexed: { label: "Indexed", className: "border-emerald-200 bg-emerald-50 text-emerald-800", icon: CheckCircle2 },
  partial: { label: "Partial", className: "border-amber-200 bg-amber-50 text-amber-900", icon: ListChecks },
  queued: { label: "Queued", className: "border-blue-200 bg-blue-50 text-blue-800", icon: Clock3 },
  needs_access: { label: "Needs access", className: "border-violet-200 bg-violet-50 text-violet-800", icon: KeyRound },
  temporarily_unavailable: { label: "Retry needed", className: "border-rose-200 bg-rose-50 text-rose-800", icon: ShieldAlert },
  planned: { label: "Planned", className: "border-slate-200 bg-slate-50 text-slate-700", icon: Database },
};

function SourceCard({ source }: { source: RegistrySource }) {
  const status = statusDisplay[source.status];
  const StatusIcon = status.icon;
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-xs font-black uppercase tracking-[0.12em] text-blue-700">Priority {source.priority}</p><h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-slate-950">{source.collection}</h2><p className="mt-1 text-sm font-bold text-slate-600">{source.provider}</p></div>
      <Badge variant="outline" className={`gap-1.5 rounded-full ${status.className}`}><StatusIcon className="size-3.5" />{status.label}</Badge>
    </div>
    <p className="mt-4 text-sm leading-6 text-slate-600">{source.next_action}</p>
    {source.blocker && <p className="mt-3 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm leading-6 text-rose-900"><strong>Current constraint:</strong> {source.blocker}</p>}
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm"><span className="font-bold text-slate-600">{source.imported_count.toLocaleString()} indexed</span><a href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-black text-blue-700 hover:underline">Official source <ExternalLink className="size-3.5" /></a></div>
  </article>;
}

const productIcons = {
  "state-educator-profiles": MapPinned,
  "map-geometry-quality": Sparkles,
  "resource-usefulness-signals": Star,
} as const;

function ProductBacklogCard({ item }: { item: ProductBacklogItem }) {
  const Icon = productIcons[item.id as keyof typeof productIcons] ?? ListChecks;
  const status = statusDisplay[item.status];
  const StatusIcon = status.icon;
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-4">
      <div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><Icon className="size-5" /></span><div><p className="text-xs font-black uppercase tracking-[0.12em] text-blue-700">Product priority {item.priority}</p><h3 className="mt-1 text-xl font-black tracking-[-0.03em] text-slate-950">{item.title}</h3></div></div>
      <Badge variant="outline" className={`hidden gap-1.5 rounded-full sm:inline-flex ${status.className}`}><StatusIcon className="size-3.5" />{status.label}</Badge>
    </div>
    <p className="mt-4 text-sm leading-6 text-slate-600">{item.goal}</p>
    <div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Next action</p><p className="mt-1 text-sm leading-6 text-slate-700">{item.next_action}</p></div>
    <details className="mt-4 border-t border-slate-100 pt-4"><summary className="cursor-pointer text-sm font-black text-blue-700">Sources and quality rules</summary><div className="mt-3 grid gap-4 text-sm leading-6 text-slate-600 sm:grid-cols-2"><div><p className="font-black text-slate-800">Planned evidence</p><ul className="mt-1 list-disc space-y-1 pl-5">{item.data_sources.map((source) => <li key={source}>{source}</li>)}</ul></div><div><p className="font-black text-slate-800">Guardrails</p><ul className="mt-1 list-disc space-y-1 pl-5">{item.guardrails.map((rule) => <li key={rule}>{rule}</li>)}</ul></div></div></details>
  </article>;
}

export default function RoadmapPage() {
  const indexed = registryData.sources.filter((source) => source.status === "indexed");
  const partial = registryData.sources.filter((source) => source.status === "partial").sort((a, b) => a.priority - b.priority || a.collection.localeCompare(b.collection));
  const next = registryData.sources.filter((source) => source.status !== "indexed" && source.status !== "partial").sort((a, b) => a.priority - b.priority || a.collection.localeCompare(b.collection));
  return <main className="min-h-screen bg-[#f7f9fd] text-slate-950">
    <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-5 py-4 sm:px-8"><a href="/" className="inline-flex items-center gap-2 text-sm font-black text-blue-700"><ArrowLeft className="size-4" />Resource finder</a><span className="text-sm font-bold text-slate-500">Checked Sep 28, 2026</span></div></header>
    <section className="mx-auto max-w-[1200px] px-5 py-10 sm:px-8 lg:py-14"><p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Catalog coverage</p><h1 className="mt-3 max-w-4xl text-4xl font-black leading-none tracking-[-0.05em] sm:text-6xl">A queue we can finish, not an endless search.</h1><p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">Every collection is tracked as indexed, partial, queued, awaiting access, temporarily unavailable, or planned. Future cataloging sessions can resume with the highest-priority unfinished source.</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-blue-700 p-5 text-white"><strong className="text-4xl font-black tracking-[-0.05em]">{registryData.summary.catalog_records.toLocaleString()}</strong><span className="mt-1 block text-sm text-blue-100">total searchable records</span></div><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><strong className="text-4xl font-black tracking-[-0.05em] text-emerald-950">{registryData.summary.item_level_imports.toLocaleString()}</strong><span className="mt-1 block text-sm text-emerald-800">repeatable item-level imports</span></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><strong className="text-4xl font-black tracking-[-0.05em]">{registryData.sources.length}</strong><span className="mt-1 block text-sm text-slate-600">source collections tracked</span></div></div>
    </section>
    <section className="border-y border-slate-200 bg-[#eef4ff]"><div className="mx-auto max-w-[1200px] px-5 py-10 sm:px-8"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Product improvements</p><h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">Better state exploration and community signals</h2><p className="mt-3 max-w-3xl text-slate-600">These features need different evidence and trust rules from the resource catalog, so they are tracked separately instead of being added as unsourced labels.</p></div><div className="mt-7 grid gap-4 lg:grid-cols-3">{registryData.product_backlog.sort((a, b) => a.priority - b.priority).map((item) => <ProductBacklogCard key={item.id} item={item} />)}</div></div></section>
    <section className="border-y border-slate-200 bg-white"><div className="mx-auto max-w-[1200px] px-5 py-10 sm:px-8"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Repeatable now</p><h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">Indexed feeds</h2></div><div className="mt-6 grid gap-4 md:grid-cols-3">{indexed.map((source) => <SourceCard key={source.id} source={source} />)}</div></div></section>
    <section className="border-b border-slate-200 bg-amber-50/45"><div className="mx-auto max-w-[1200px] px-5 py-10 sm:px-8"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-amber-800">In progress</p><h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">Useful now, still expanding</h2><p className="mt-3 max-w-3xl text-slate-600">These sources already contribute searchable records, but their larger official collections still need complete, repeatable coverage.</p></div><div className="mt-6 grid gap-4 md:grid-cols-2">{partial.map((source) => <SourceCard key={source.id} source={source} />)}</div></div></section>
    <section className="mx-auto max-w-[1200px] px-5 py-10 sm:px-8 lg:py-14"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Work queue</p><h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">Next sources, in priority order</h2><p className="mt-3 max-w-3xl text-slate-600">Classroom-ready federal collections come first. State catalogs follow after the federal adapters are established; time-sensitive grants and solicitations use a separate later pipeline.</p></div><div className="mt-7 grid gap-4 md:grid-cols-2">{next.map((source) => <SourceCard key={source.id} source={source} />)}</div></section>
  </main>;
}
