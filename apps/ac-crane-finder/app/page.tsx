"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Image from "next/image";
import {
  CRANES,
  FT_PER_M,
  LB_PER_METRIC_TON,
  evaluateFleet,
  sameCraneConfiguration,
} from "./crane-model";
import {
  DEFAULT_RATE_GROUPS,
  cloneDefaultRateGroups,
  estimateRentalCost,
} from "./pricing-model";

type UnitSystem = "metric" | "imperial";

function round(value: number, digits = 1) {
  return Number(value.toFixed(digits));
}

export default function Home() {
  const [unit, setUnit] = useState<UnitSystem>("imperial");
  const [heightFt, setHeightFt] = useState(24 * FT_PER_M);
  const [radiusFt, setRadiusFt] = useState(22 * FT_PER_M);
  const [loadLb, setLoadLb] = useState(4 * LB_PER_METRIC_TON);
  const [maxUtilization, setMaxUtilization] = useState(100);
  const [rateGroups, setRateGroups] = useState(cloneDefaultRateGroups);
  const [draftRates, setDraftRates] = useState(cloneDefaultRateGroups);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    let frame = 0;
    try {
      const saved = window.localStorage.getItem("crane-finder-rates-v1");
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length === DEFAULT_RATE_GROUPS.length) {
        frame = window.requestAnimationFrame(() => setRateGroups(parsed));
      }
    } catch {
      // Invalid local settings fall back to the supplied rate sheet.
    }
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!settingsOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSettingsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [settingsOpen]);

  const isMetric = unit === "metric";
  const height = isMetric ? heightFt / FT_PER_M : heightFt;
  const radius = isMetric ? radiusFt / FT_PER_M : radiusFt;
  const load = isMetric ? loadLb / LB_PER_METRIC_TON : loadLb;
  const distanceUnit = isMetric ? "m" : "ft";
  const loadUnit = isMetric ? "t" : "lb";
  const minimumRadius = isMetric ? 20 / FT_PER_M : 20;
  const requiredBoomFt = Math.hypot(heightFt, radiusFt);
  const boomAngle = Math.atan2(heightFt, radiusFt) * (180 / Math.PI);
  const selectedLoadLabel = isMetric
    ? `${round(load, 2)} t`
    : `${Math.round(load).toLocaleString()} lb`;
  const requiredBoomLabel = isMetric
    ? `${round(requiredBoomFt / FT_PER_M, 1)} m`
    : `${round(requiredBoomFt, 1)} ft`;

  const evaluation = useMemo(
    () => evaluateFleet({ heightFt, radiusFt, loadLb, maxUtilization }),
    [heightFt, loadLb, maxUtilization, radiusFt],
  );

  const validationMessage =
    !Number.isFinite(heightFt) || heightFt < 0
      ? "Vertical distance must be zero or greater."
      : !Number.isFinite(radiusFt) || radiusFt < 20
        ? "Horizontal distance is outside the modelled range; enter at least 20 ft (6.1 m)."
        : !Number.isFinite(loadLb) || loadLb <= 0
          ? "Total suspended load must be greater than zero."
          : null;
  const best = validationMessage ? null : evaluation.best;
  const recommendedRows = best
    ? evaluation.matches.filter((row) => sameCraneConfiguration(row.crane, best.crane))
    : [];
  const recommendedModels = recommendedRows.map((row) => row.crane.model);
  const otherMatches = best
    ? evaluation.matches.filter((row) => !recommendedModels.includes(row.crane.model))
    : [];

  const reset = () => {
    setUnit("imperial");
    setHeightFt(24 * FT_PER_M);
    setRadiusFt(22 * FT_PER_M);
    setLoadLb(4 * LB_PER_METRIC_TON);
    setMaxUtilization(100);
  };

  const openSettings = () => {
    setDraftRates(rateGroups.map((group) => ({ ...group, models: [...group.models] })));
    setSettingsOpen(true);
  };

  const saveSettings = () => {
    const sanitized = draftRates.map((group) => ({
      ...group,
      hourlyRate: Math.max(0, Number(group.hourlyRate) || 0),
      minimumHours: Math.max(1, Number(group.minimumHours) || 1),
    }));
    setRateGroups(sanitized);
    window.localStorage.setItem("crane-finder-rates-v1", JSON.stringify(sanitized));
    setSettingsOpen(false);
  };

  const displayCapacity = (pounds: number) =>
    isMetric ? `${round(pounds / LB_PER_METRIC_TON, 2)} t` : `${Math.round(pounds).toLocaleString()} lb`;

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand-link" href="https://www.accrane.com" target="_blank" rel="noreferrer">
          <Image className="brand-logo" src="/ac-crane-logo.gif" alt="AC Crane & Sign Service, Inc." width={298} height={171} unoptimized priority />
        </a>
        <div className="header-title">
          <p className="eyebrow">Preliminary fleet screening</p>
          <h1>Crane Finder</h1>
          <p>Enter the hook position and total suspended load to screen the fleet.</p>
        </div>
        <span className="data-badge">9 CRANES · SHEET2</span>
      </header>

      <section className="workspace">
        <aside className="visual-panel" aria-label="Lift geometry preview">
          <div className="visual-label">
            <p className="section-index">01 / LIFT GEOMETRY</p>
            <p>Live reach preview</p>
          </div>

          <div className="geometry" aria-hidden="true">
            <div className="geometry-grid" />
            <div className="scene-frame">
              <Image className="crane-scene-art" src="/ac-crane-lift-scene-v2.png" alt="" width={1536} height={1024} unoptimized priority />
              <div className="distance-guide guide-horizontal">
                <span>Horizontal · {round(radius, 1)} {distanceUnit}</span>
              </div>
              <div className="distance-guide guide-vertical">
                <span>Vertical · {round(height, 1)} {distanceUnit}</span>
              </div>
              <div className="guide-origin" />
              <div className="load-badge"><span>Load</span><strong>{selectedLoadLabel}</strong></div>
              <div className="boom-badge"><span>Required boom</span><strong>{requiredBoomLabel}</strong></div>
            </div>
          </div>

          <div className="geometry-stats">
            <div><span>Required boom</span><strong>{isMetric ? round(requiredBoomFt / FT_PER_M, 1) : round(requiredBoomFt, 1)} {distanceUnit}</strong></div>
            <div><span>Boom angle</span><strong>{round(boomAngle, 1)}°</strong></div>
          </div>
        </aside>

        <section className="control-panel">
          <div className="utility-row">
            <button className="reset-button" type="button" onClick={reset}><span aria-hidden="true">↺</span> Reset inputs</button>
            <label className="unit-field">
              <span>Units</span>
              <select value={unit} onChange={(event) => setUnit(event.target.value as UnitSystem)}>
                <option value="metric">Metric · m / t</option>
                <option value="imperial">Imperial · ft / lb</option>
              </select>
            </label>
            <button className="settings-button" type="button" onClick={openSettings}><span aria-hidden="true">⚙</span> Pricing settings</button>
          </div>

          <div className="inputs-card">
            <MeasureInput
              index="01"
              label="Vertical distance"
              hint="Required hook height from boom pivot"
              value={height}
              min={0}
              max={isMetric ? 45 : 150}
              step={isMetric ? 0.1 : 1}
              unit={distanceUnit}
              onChange={(value) => setHeightFt(isMetric ? value * FT_PER_M : value)}
            />
            <MeasureInput
              index="02"
              label="Horizontal distance"
              hint={`Radius from center of rotation; model starts at ${round(minimumRadius, 1)} ${distanceUnit}`}
              value={radius}
              min={isMetric ? round(minimumRadius, 2) : 20}
              max={isMetric ? round(135 / FT_PER_M, 2) : 135}
              step={isMetric ? 0.1 : 1}
              unit={distanceUnit}
              onChange={(value) => setRadiusFt(isMetric ? value * FT_PER_M : value)}
            />
            <MeasureInput
              index="03"
              label="Total suspended load"
              hint="Include load, rigging, hook block and devices"
              value={load}
              min={isMetric ? 0.1 : 100}
              max={isMetric ? 10 : 22000}
              step={isMetric ? 0.1 : 100}
              unit={loadUnit}
              onChange={(value) => setLoadLb(isMetric ? value * LB_PER_METRIC_TON : value)}
            />

            <div className="utilization-row">
              <div>
                <span className="input-index">04</span>
                <label htmlFor="utilization">Maximum planning utilization</label>
                <p>Illustrative planning reserve; confirm your company policy.</p>
              </div>
              <div className="utilization-control">
                <input id="utilization" type="range" min="50" max="100" step="5" value={maxUtilization} style={{ "--input-fill": `${(maxUtilization - 50) * 2}%` } as CSSProperties} onChange={(event) => setMaxUtilization(Number(event.target.value))} />
                <output htmlFor="utilization">{maxUtilization}%</output>
              </div>
            </div>
          </div>

          {validationMessage && <p className="validation-message" role="alert">{validationMessage}</p>}

          <section className={`result-card ${best ? "is-match" : "is-empty"}`} aria-live="polite">
            <div className="result-status">
              <span className="status-dot" />
              {best ? "Preliminary match" : "No preliminary match"}
            </div>
            {best ? (
              <>
                <div className="result-headline">
                  <div>
                    <p>Smallest qualifying model group</p>
                    <h2 className="model-list">{recommendedModels.join(" · ")}</h2>
                  </div>
                  <strong>{best.crane.ratedTons}<span> ton class</span></strong>
                </div>
                <div className="result-metrics">
                  <div><span>Estimated capacity</span><strong>{displayCapacity(best.estimatedCapacityLb ?? 0)}</strong></div>
                  <div><span>Load utilization</span><strong>{round(best.utilization ?? 0, 1)}%</strong></div>
                  <div><span>Maximum reach</span><strong>{isMetric ? round(best.crane.maxRadiusFt / FT_PER_M, 1) : best.crane.maxRadiusFt} {distanceUnit}</strong></div>
                </div>
                <CostEstimate
                  key={`${best.crane.model}-${rateGroups.map((group) => `${group.hourlyRate}-${group.minimumHours}`).join("-")}`}
                  model={best.crane.model}
                  rateGroups={rateGroups}
                />
                {otherMatches.length > 0 && (
                  <div className="alternatives-row">
                    <span>All other qualifying models</span>
                    <strong>{otherMatches.map((row) => row.crane.model).join(" · ")}</strong>
                  </div>
                )}
              </>
            ) : (
              <div className="empty-result">
                <h2>Adjust the lift or review a larger crane.</h2>
                <p>No crane in Sheet2 meets both the estimated capacity and simplified reach checks at the selected planning utilization.</p>
              </div>
            )}
          </section>

          <div className="warning-note">
            <strong>Screening estimate only.</strong>
            <p>Linear interpolation is not a manufacturer load chart. A qualified lift professional must verify the exact crane, configuration, deductions, ground conditions, wind and total load before any lift.</p>
          </div>
        </section>
      </section>

      <section className="details-section">
        <div className="details-heading">
          <p className="section-index">02 / TRANSPARENT RESULTS</p>
          <h2>Every model, every decision.</h2>
          <p>The prototype keeps source values separate from estimated values and shows why each model passes or fails.</p>
        </div>

        <div className="method-grid">
          <article>
            <span>Capacity model</span>
            <h3>Linear between two supplied anchors</h3>
            <p>At 20 ft, capacity equals “Max Weight.” At the supplied maximum radius, capacity equals “Weight Full Extend.” The tool does not extrapolate.</p>
            <code>C(r) = Wmax + ((r − 20) ÷ (Rmax − 20)) × (Wfull − Wmax)</code>
          </article>
          <article>
            <span>Reach model</span>
            <h3>Straight-line geometry</h3>
            <p>Because height is not present in Sheet2, the tool temporarily treats maximum radius as maximum boom length and checks the diagonal distance.</p>
            <code>Lrequired = √(height² + radius²)</code>
          </article>
          <article>
            <span>Selection rule</span>
            <h3>Smallest qualifying ton class</h3>
            <p>A model qualifies only when it passes radius, diagonal reach, and planning-utilization checks. Qualifying models are ranked by nominal ton class.</p>
            <code>load ÷ estimated capacity ≤ planning utilization</code>
          </article>
          <article>
            <span>Cost model</span>
            <h3>Hourly rate with minimum time</h3>
            <p>Rates begin with the supplied April 1, 2026 sheet and can be changed in Pricing settings. The estimate uses the larger of planned hours or the crane minimum.</p>
            <code>estimate = max(planned hours, minimum hours) × hourly rate</code>
          </article>
        </div>

        <div className="fleet-card">
          <div className="fleet-card-header">
            <div>
              <p className="section-index">LIVE FLEET EVALUATION</p>
              <h3>{CRANES.length} models from Sheet2</h3>
            </div>
            <span>At {round(radius, 1)} {distanceUnit} radius</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Class</th>
                  <th>Max reach</th>
                  <th>Estimated capacity</th>
                  <th>Utilization</th>
                  <th>Rate</th>
                  <th>Screening result</th>
                </tr>
              </thead>
              <tbody>
                {evaluation.rows.map((row) => (
                  <tr key={row.crane.model} className={row.qualifies && !validationMessage ? "passes" : "fails"}>
                    <td><strong>{row.crane.model}</strong></td>
                    <td>{row.crane.ratedTons} ton</td>
                    <td>{isMetric ? round(row.crane.maxRadiusFt / FT_PER_M, 1) : row.crane.maxRadiusFt} {distanceUnit}</td>
                    <td>{row.estimatedCapacityLb === null ? "—" : displayCapacity(row.estimatedCapacityLb)}</td>
                    <td>{row.utilization === null ? "—" : `${round(row.utilization, 1)}%`}</td>
                    <td>{estimateRentalCost(row.crane.model, 1, rateGroups)?.group.hourlyRate ? `$${estimateRentalCost(row.crane.model, 1, rateGroups)?.group.hourlyRate}/hr` : "—"}</td>
                    <td><span className="table-status">{validationMessage ? "Inputs invalid" : row.reason}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="data-notes">
          <div>
            <span>Source observations</span>
            <p>AC167 / AC170 / AC168 share identical values. AC160 / AC140 also share identical values. AC180 and AC200 share a 50-ton label and 20,000 lb maximum weight but differ at full extension.</p>
          </div>
          <div>
            <span>Confirm before v1</span>
            <p>“Tons” is assumed to be US short-ton class because capacities are in pounds. The attached 38124SHL chart shows a 123.5 ft boom, while the 50128SHL material shows a 128 ft boom and a 50-ton rating at 6 ft. Neither maps conclusively to an AC fleet alias, so Sheet2 remains the active approximation. <a href="https://giuffre.com/equipment/boom-trucks/" target="_blank" rel="noreferrer">Browse the Giuffre reference fleet</a>.</p>
          </div>
        </div>
      </section>

      {settingsOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSettingsOpen(false);
        }}>
          <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="pricing-settings-title">
            <div className="settings-header">
              <div>
                <p className="section-index">LOCAL ESTIMATE SETTINGS</p>
                <h2 id="pricing-settings-title">Pricing settings</h2>
              </div>
              <button type="button" aria-label="Close pricing settings" onClick={() => setSettingsOpen(false)}>×</button>
            </div>
            <p className="settings-intro">Adjust the hourly rate and minimum for each service group. Saved values stay on this device.</p>
            <div className="rate-settings-list">
              {draftRates.map((group, index) => (
                <div className="rate-setting" key={group.id}>
                  <div>
                    <strong>{group.label}</strong>
                    <span>{group.models.join(" · ")}</span>
                  </div>
                  <label>
                    Hourly rate
                    <span className="money-input"><b>$</b><input type="number" min="0" step="5" value={group.hourlyRate} onChange={(event) => setDraftRates((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, hourlyRate: Number(event.target.value) } : item))} /></span>
                  </label>
                  <label>
                    Minimum hours
                    <input type="number" min="1" step="1" value={group.minimumHours} onChange={(event) => setDraftRates((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, minimumHours: Number(event.target.value) } : item))} />
                  </label>
                </div>
              ))}
            </div>
            <div className="settings-note"><strong>Estimate only.</strong> These are weekday base rates. The supplied sheet says operator included and rates are port-to-port; overtime and Sunday/holiday rates are separate. Confirm current pricing before dispatch.</div>
            <div className="settings-actions">
              <button type="button" className="secondary-button" onClick={() => setDraftRates(cloneDefaultRateGroups())}>Restore rate sheet</button>
              <button type="button" className="primary-button" onClick={saveSettings}>Save pricing</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function MeasureInput({
  index,
  label,
  hint,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  index: string;
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  const id = `measure-${index}`;
  const percent = ((value - min) / (max - min)) * 100;
  return (
    <div className="measure-input">
      <div className="measure-copy">
        <span className="input-index">{index}</span>
        <div><label htmlFor={`${id}-number`}>{label}</label><p>{hint}</p></div>
      </div>
      <div className="measure-controls" style={{ "--input-fill": `${Math.min(100, Math.max(0, percent))}%` } as CSSProperties}>
        <input id={`${id}-range`} aria-label={`${label} slider`} type="range" min={min} max={max} step={step} value={round(value, 2)} onChange={(event) => onChange(Number(event.target.value))} />
        <div className="number-field">
          <input id={`${id}-number`} type="number" min={min} max={max} step={step} value={round(value, 2)} onChange={(event) => onChange(Number(event.target.value))} />
          <span>{unit}</span>
        </div>
      </div>
    </div>
  );
}

function CostEstimate({ model, rateGroups }: { model: string; rateGroups: ReturnType<typeof cloneDefaultRateGroups> }) {
  const minimumHours = estimateRentalCost(model, 1, rateGroups)?.group.minimumHours ?? 1;
  const [jobHours, setJobHours] = useState(minimumHours);
  const estimate = estimateRentalCost(model, jobHours, rateGroups);

  if (!estimate) return null;

  return (
    <div className="cost-estimate">
      <div className="cost-heading">
        <div>
          <span>Editable rental estimate</span>
          <strong>${estimate.baseEstimate.toLocaleString()}</strong>
        </div>
        <label>
          Planned hours · {estimate.group.minimumHours} hr minimum
          <input
            type="number"
            min={estimate.group.minimumHours}
            step="0.5"
            value={jobHours}
            onChange={(event) => setJobHours(Math.max(estimate.group.minimumHours, Number(event.target.value) || estimate.group.minimumHours))}
          />
        </label>
      </div>
      <p>
        {estimate.billableHours} billable hours × ${estimate.group.hourlyRate}/hour
        {jobHours < estimate.group.minimumHours ? ` (${estimate.group.minimumHours}-hour minimum applied)` : ""}.
        Weekday base rate with operator included, port-to-port. Overtime, Sundays/holidays, taxes, permits, lift plans, travel and add-ons are not included.
      </p>
    </div>
  );
}
