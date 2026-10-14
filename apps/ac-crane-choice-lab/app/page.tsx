"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { CRANES } from "../lib/cranes";
import {
  CONFIDENCE_OPTIONS,
  REASON_OPTIONS,
  SCENARIOS,
  SESSION_SIZE,
  requiredBoomFt,
  type Scenario,
} from "../lib/scenarios";

type SavedChoice = {
  scenarioId: string;
  title: string;
  selectedCrane: string;
  baselineCrane: string;
  confidence: string;
};

type FleetCount = { model: string; count: number };
type Totals = { count: number; sessions: number; byCrane: FleetCount[] };

const formatNumber = new Intl.NumberFormat("en-US");

function shuffledSession() {
  return [...SCENARIOS].sort(() => Math.random() - 0.5).slice(0, SESSION_SIZE);
}

export default function Home() {
  const [jobs, setJobs] = useState<Scenario[]>(() => SCENARIOS.slice(0, SESSION_SIZE));
  const [jobIndex, setJobIndex] = useState(0);
  const [reviewer, setReviewer] = useState("");
  const [sessionId, setSessionId] = useState(() => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`);
  const [selectedCrane, setSelectedCrane] = useState("");
  const [confidence, setConfidence] = useState("High");
  const [reasons, setReasons] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [choices, setChoices] = useState<SavedChoice[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "saving">("idle");
  const [message, setMessage] = useState("");
  const [showData, setShowData] = useState(false);
  const [totals, setTotals] = useState<Totals | null>(null);

  const currentJob = jobs[jobIndex];
  const completed = jobIndex >= jobs.length;
  const agreementCount = useMemo(
    () => choices.filter((choice) => choice.selectedCrane === choice.baselineCrane).length,
    [choices],
  );

  function resetAnswer() {
    setSelectedCrane("");
    setConfidence("High");
    setReasons([]);
    setNote("");
    setMessage("");
  }

  function startNewMix() {
    setJobs(shuffledSession());
    setJobIndex(0);
    setChoices([]);
    setSessionId(window.crypto.randomUUID());
    resetAnswer();
  }

  function toggleReason(reason: string) {
    setReasons((current) => current.includes(reason)
      ? current.filter((item) => item !== reason)
      : [...current, reason]);
  }

  async function loadTotals() {
    try {
      const response = await fetch("/api/selections");
      if (response.ok) setTotals(await response.json() as Totals);
    } catch {
      setTotals(null);
    }
  }

  async function openData() {
    setShowData(true);
    await loadTotals();
  }

  async function saveChoice() {
    if (!currentJob || !selectedCrane) return;
    if (!reviewer.trim()) {
      setMessage("Add your name or initials at the top before saving.");
      document.querySelector<HTMLInputElement>("#reviewer")?.focus();
      return;
    }

    setSaveState("saving");
    setMessage("");
    try {
      const response = await fetch("/api/selections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId,
          evaluator: reviewer,
          scenarioId: currentJob.id,
          selectedCrane,
          confidence,
          reasons,
          note,
        }),
      });
      const result = await response.json() as { error?: string; baselineCrane?: string };
      if (!response.ok || !result.baselineCrane) throw new Error(result.error ?? "Could not save this choice.");

      setChoices((current) => [...current, {
        scenarioId: currentJob.id,
        title: currentJob.title,
        selectedCrane,
        baselineCrane: result.baselineCrane ?? "NO_MATCH",
        confidence,
      }]);
      setJobIndex((index) => index + 1);
      resetAnswer();
      if (jobIndex + 1 >= jobs.length) void loadTotals();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save this choice. Please try again.");
    } finally {
      setSaveState("idle");
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <Image src="/ac-crane-logo.gif" alt="AC Crane & Sign Service, Inc." width={298} height={171} priority unoptimized />
          <div className="brand-copy"><span>Manager calibration</span><strong>Crane Choice Lab</strong></div>
        </div>
        <div className="header-actions">
          <label className="reviewer-field" htmlFor="reviewer"><span>Reviewer</span><input id="reviewer" value={reviewer} onChange={(event) => setReviewer(event.target.value)} placeholder="Name or initials" maxLength={60} /></label>
          <button className="data-button" type="button" onClick={openData}>View data</button>
          <div className="progress-copy"><strong>{Math.min(jobIndex, jobs.length)}</strong> of {jobs.length}<span> reviewed</span></div>
        </div>
      </header>

      {completed ? (
        <Completion choices={choices} agreementCount={agreementCount} totals={totals} onNewMix={startNewMix} onOpenData={openData} />
      ) : currentJob ? (
        <section className="workspace">
          <div className="intro-row">
            <div><span className="eyebrow">Scenario {String(jobIndex + 1).padStart(2, "0")} · {currentJob.category}</span><h1>Which crane would you send?</h1><p>Review the job details, then choose the best fit from the AC fleet.</p></div>
            <div className="intro-tools"><button type="button" className="text-button" onClick={startNewMix}>Shuffle jobs</button><span className="time-chip">About 20 seconds</span></div>
          </div>

          <div className="decision-grid">
            <JobCard scenario={currentJob} jobNumber={jobIndex + 1} />
            <section className="choice-panel" aria-label="Crane selection">
              <div className="choice-heading"><span className="step-dot">1</span><div><h2>Select a crane</h2><p>Choose what you would dispatch for this job.</p></div></div>
              <div className="crane-grid">
                {CRANES.map((crane) => (
                  <button key={crane.model} type="button" className={selectedCrane === crane.model ? "crane-option selected" : "crane-option"} onClick={() => setSelectedCrane(crane.model)} aria-pressed={selectedCrane === crane.model}>
                    <span>{crane.model}</span><small>{crane.ratedTons} ton</small><i aria-hidden="true">✓</i>
                  </button>
                ))}
              </div>
              <button type="button" className={selectedCrane === "SITE_REVIEW" ? "need-more selected" : "need-more"} onClick={() => setSelectedCrane("SITE_REVIEW")} aria-pressed={selectedCrane === "SITE_REVIEW"}>Need more information or a site visit</button>

              <div className="compact-feedback">
                <div><span className="feedback-label">Confidence</span><div className="segmented">{CONFIDENCE_OPTIONS.map((option) => <button key={option} type="button" className={confidence === option ? "active" : ""} onClick={() => setConfidence(option)}>{option}</button>)}</div></div>
                <div><span className="feedback-label">Main reason <em>optional</em></span><div className="reason-list">{REASON_OPTIONS.map((reason) => <button key={reason} type="button" className={reasons.includes(reason) ? "active" : ""} onClick={() => toggleReason(reason)}>{reason}</button>)}</div></div>
                <label className="note-field"><span className="feedback-label">Quick note <em>optional</em></span><input value={note} onChange={(event) => setNote(event.target.value)} maxLength={300} placeholder="Anything the numbers do not capture?" /></label>
              </div>

              <div className="quick-note"><strong>No recommendation shown.</strong> We want your independent judgment.</div>
              {message && <p className="error-message" role="alert">{message}</p>}
              <button className="save-button" disabled={!selectedCrane || saveState === "saving"} type="button" onClick={saveChoice}>
                {saveState === "saving" ? "Saving…" : selectedCrane === "SITE_REVIEW" ? "Save site review & next job" : selectedCrane ? `Save ${selectedCrane} & next job` : "Select a crane to continue"}<span>→</span>
              </button>
            </section>
          </div>
          <p className="safety-note">Internal learning tool only. This does not replace an approved load chart, site review, lift plan, or qualified operator judgment.</p>
        </section>
      ) : null}

      {showData && <DataPanel totals={totals} onClose={() => setShowData(false)} />}
    </main>
  );
}

function JobCard({ scenario, jobNumber }: { scenario: Scenario; jobNumber: number }) {
  return (
    <article className="job-card">
      <div className="job-visual" aria-hidden="true"><div className="building" /><div className="load-box">{formatNumber.format(scenario.loadLb)} lb</div><div className="boom-line" /><div className="truck-base" /></div>
      <div className="job-heading"><span className="job-number">JOB {String(jobNumber).padStart(2, "0")}</span><div><h2>{scenario.title}</h2><p>{scenario.site}</p></div></div>
      <dl className="spec-grid">
        <div><dt>Total load</dt><dd>{formatNumber.format(scenario.loadLb)} <span>lb</span></dd></div>
        <div><dt>Horizontal</dt><dd>{scenario.horizontalFt} <span>ft</span></dd></div>
        <div><dt>Vertical</dt><dd>{scenario.verticalFt} <span>ft</span></dd></div>
        <div><dt>Required boom</dt><dd>{requiredBoomFt(scenario)} <span>ft</span></dd></div>
      </dl>
      <div className="condition-grid"><div><span>Ground</span><strong>{scenario.ground}</strong></div><div><span>Access</span><strong>{scenario.access}</strong></div><div><span>Watch for</span><strong>{scenario.constraint}</strong></div></div>
      <p className="job-detail">{scenario.detail}</p>
    </article>
  );
}

function Completion({ choices, agreementCount, totals, onNewMix, onOpenData }: { choices: SavedChoice[]; agreementCount: number; totals: Totals | null; onNewMix: () => void; onOpenData: () => void }) {
  return (
    <section className="completion workspace">
      <span className="complete-mark">✓</span><span className="eyebrow">Session saved</span><h1>That’s the calibration set.</h1><p>Your selections are stored and ready to compare with the current preliminary model.</p>
      <div className="summary-strip"><div><strong>{choices.length}</strong><span>jobs reviewed</span></div><div><strong>{agreementCount}</strong><span>matched preliminary model</span></div><div><strong>{totals?.count ?? choices.length}</strong><span>total saved decisions</span></div></div>
      <div className="completion-actions"><button className="save-button" type="button" onClick={onNewMix}>Start another job mix <span>→</span></button><button className="secondary-button" type="button" onClick={onOpenData}>Review collected data</button></div>
      <div className="session-table"><div className="table-head"><span>Job</span><span>Your choice</span><span>Current model</span></div>{choices.map((choice) => <div key={choice.scenarioId}><span>{choice.title}</span><strong>{choice.selectedCrane === "SITE_REVIEW" ? "Site review" : choice.selectedCrane}</strong><span className={choice.selectedCrane === choice.baselineCrane ? "match" : "difference"}>{choice.baselineCrane}</span></div>)}</div>
    </section>
  );
}

function DataPanel({ totals, onClose }: { totals: Totals | null; onClose: () => void }) {
  const maximum = Math.max(1, ...(totals?.byCrane.map((item) => item.count) ?? [1]));
  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <aside className="data-drawer" role="dialog" aria-modal="true" aria-labelledby="data-title">
        <button className="close-button" onClick={onClose} aria-label="Close data panel">×</button><span className="eyebrow">Collected decisions</span><h2 id="data-title">Manager selection data</h2><p>Use this history to see where expert judgment agrees with—or improves—the preliminary calculator.</p>
        <div className="data-totals"><div><strong>{totals?.count ?? "—"}</strong><span>decisions</span></div><div><strong>{totals?.sessions ?? "—"}</strong><span>sessions</span></div></div>
        <h3>Crane choices</h3><div className="bar-list">{totals?.byCrane.length ? totals.byCrane.map((item) => <div key={item.model}><span>{item.model === "SITE_REVIEW" ? "Site review" : item.model}</span><i><b style={{ width: `${Math.max(5, (item.count / maximum) * 100)}%` }} /></i><strong>{item.count}</strong></div>) : <p>No selections saved yet.</p>}</div>
        <a className="download-button" href="/api/selections?format=csv">Download all selections as CSV</a>
        <small>CSV includes each scenario, the manager’s choice, confidence, reasons, and the current formula’s result.</small>
      </aside>
    </div>
  );
}
