import test from "node:test";
import assert from "node:assert/strict";
import { scoreAssessment } from "../src/domain/scoring.js";

const input = {
  mlOutput: {
    landcover: { vegetation_pct: 25, impervious_pct: 70, water_pct: 5 },
    lst_celsius_mean: 35,
  },
  materials: { concrete_ready_mix: 5_000_000, steel_reinforcement: 500_000 },
  builtUpAreaSqm: 10_000,
};

test("returns bounded, complementary climate and impact scores", () => {
  const result = scoreAssessment(input);
  assert.ok(result.impactScore >= 0 && result.impactScore <= 100);
  assert.equal(result.climateScore + result.impactScore, 100);
  assert.equal(Object.keys(result.breakdown).length, 4);
});

test("more vegetation and a cooler surface improve the climate score", () => {
  const baseline = scoreAssessment(input);
  const improved = scoreAssessment({
    ...input,
    mlOutput: {
      landcover: { vegetation_pct: 45, impervious_pct: 50, water_pct: 5 },
      lst_celsius_mean: 32,
    },
  });
  assert.ok(improved.climateScore > baseline.climateScore);
});
