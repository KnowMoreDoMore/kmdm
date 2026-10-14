import assert from "node:assert/strict";
import test from "node:test";
import {
  CRANES,
  FT_PER_M,
  LB_PER_METRIC_TON,
  capacityAtRadius,
  evaluateFleet,
  sameCraneConfiguration,
} from "../app/crane-model.js";
import {
  DEFAULT_RATE_GROUPS,
  estimateRentalCost,
} from "../app/pricing-model.js";

test("loads the nine Sheet2 crane records", () => {
  assert.equal(CRANES.length, 9);
  assert.deepEqual(CRANES.map((crane) => crane.model), [
    "AC87", "AC80", "AC167", "AC170", "AC168", "AC160", "AC140", "AC180", "AC200",
  ]);
});

test("linear interpolation preserves both spreadsheet anchors", () => {
  const crane = CRANES.find((item) => item.model === "AC200");
  assert.ok(crane);
  assert.equal(capacityAtRadius(crane, 20), 20000);
  assert.equal(capacityAtRadius(crane, 135), 750);
  assert.equal(capacityAtRadius(crane, 19.99), null);
  assert.equal(capacityAtRadius(crane, 135.01), null);
});

test("interpolates the AC87 midpoint correctly", () => {
  const crane = CRANES.find((item) => item.model === "AC87");
  assert.ok(crane);
  assert.equal(capacityAtRadius(crane, 40), 1000);
});

test("default scenario selects AC180 at a 100 percent planning limit", () => {
  const result = evaluateFleet({
    heightFt: 24 * FT_PER_M,
    radiusFt: 22 * FT_PER_M,
    loadLb: 4 * LB_PER_METRIC_TON,
    maxUtilization: 100,
  });
  assert.equal(result.best?.crane.model, "AC180");
  assert.ok((result.best?.utilization ?? 101) < 100);
  assert.ok(result.requiredBoomFt < 135);
});

test("pricing applies each crane group minimum", () => {
  assert.equal(DEFAULT_RATE_GROUPS.length, 5);
  assert.deepEqual(estimateRentalCost("AC87", 1), {
    group: DEFAULT_RATE_GROUPS[0],
    requestedHours: 1,
    billableHours: 3,
    baseEstimate: 720,
  });
  assert.equal(estimateRentalCost("AC180", 3)?.baseEstimate, 1360);
  assert.equal(estimateRentalCost("AC200", 5)?.baseEstimate, 1750);
});

test("identifies identical crane configurations for grouped recommendations", () => {
  const ac167 = CRANES.find((item) => item.model === "AC167");
  const ac170 = CRANES.find((item) => item.model === "AC170");
  const ac160 = CRANES.find((item) => item.model === "AC160");
  assert.ok(ac167 && ac170 && ac160);
  assert.equal(sameCraneConfiguration(ac167, ac170), true);
  assert.equal(sameCraneConfiguration(ac167, ac160), false);
});

test("does not recommend a model outside the supplied radius domain", () => {
  const result = evaluateFleet({ heightFt: 10, radiusFt: 15, loadLb: 500, maxUtilization: 80 });
  assert.equal(result.best, null);
  assert.ok(result.rows.every((row) => row.reason === "Below modelled radius"));
});

test("distinguishes capacity failure from reach failure", () => {
  const result = evaluateFleet({ heightFt: 78.7, radiusFt: 72.2, loadLb: 9500, maxUtilization: 80 });
  assert.equal(result.best, null);
  assert.ok(result.rows.some((row) => row.reason === "Height + radius exceed reach"));
  assert.ok(result.rows.some((row) => row.reason === "Estimated capacity is insufficient"));
});
