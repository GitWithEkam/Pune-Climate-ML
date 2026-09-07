const SETTINGS = {
  curveNumbers: { vegetation: 60, impervious: 98, water: 100 },
  designStormMm: 150,
  baseTemperatureC: 28,
  heatNormalizationC: 15,
  weights: { flood: 0.3, heat: 0.3, green: 0.2, carbon: 0.2 },
  emissionFactors: {
    concrete_ready_mix: 0.15,
    steel_reinforcement: 1.85,
    brick: 0.24,
    glass: 1.2,
    aluminium: 12.5,
  },
};

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const round = (value, digits = 1) => Number(value.toFixed(digits));

function runoffMm(curveNumber, rainfallMm) {
  const retention = 25400 / curveNumber - 254;
  const initialAbstraction = 0.2 * retention;
  if (rainfallMm <= initialAbstraction) return 0;
  return ((rainfallMm - initialAbstraction) ** 2) /
    (rainfallMm - initialAbstraction + retention);
}

function floodScore(landcover) {
  const cn = (
    landcover.vegetation_pct * SETTINGS.curveNumbers.vegetation +
    landcover.impervious_pct * SETTINGS.curveNumbers.impervious +
    landcover.water_pct * SETTINGS.curveNumbers.water
  ) / 100;
  const runoff = runoffMm(cn, SETTINGS.designStormMm);
  const baseline = runoffMm(SETTINGS.curveNumbers.vegetation, SETTINGS.designStormMm);
  return {
    score: round(clamp(((runoff - baseline) / SETTINGS.designStormMm) * 100)),
    curveNumber: round(cn),
    runoffMm: round(runoff),
    baselineRunoffMm: round(baseline),
    confidence: "high",
  };
}

function heatScore(lstCelsius) {
  const delta = lstCelsius - SETTINGS.baseTemperatureC;
  return {
    score: round(clamp((delta / SETTINGS.heatNormalizationC) * 100)),
    lstCelsius: round(lstCelsius, 2),
    baselineCelsius: SETTINGS.baseTemperatureC,
    deltaCelsius: round(delta, 2),
    confidence: "medium",
  };
}

function greenScore(landcover) {
  return {
    score: round(clamp(100 - landcover.vegetation_pct)),
    vegetationPct: round(landcover.vegetation_pct),
    confidence: "high",
  };
}

function carbonScore(materials, builtUpAreaSqm) {
  const total = Object.entries(SETTINGS.emissionFactors).reduce(
    (sum, [material, factor]) => sum + Number(materials[material] || 0) * factor,
    0,
  );
  const intensity = total / builtUpAreaSqm;
  let score = 20;
  let rating = "Low";
  if (intensity > 1200) [score, rating] = [100, "Very High"];
  else if (intensity > 800) [score, rating] = [80, "High"];
  else if (intensity > 400) [score, rating] = [50, "Moderate"];
  return {
    score,
    totalEmbodiedCarbonKgco2e: round(total, 0),
    carbonIntensityKgco2ePerSqm: round(intensity),
    rating,
    confidence: "medium",
  };
}

export function scoreAssessment({ mlOutput, materials = {}, builtUpAreaSqm }) {
  const flood = floodScore(mlOutput.landcover);
  const heat = heatScore(mlOutput.lst_celsius_mean);
  const green = greenScore(mlOutput.landcover);
  const carbon = carbonScore(materials, builtUpAreaSqm);
  const impactScore = round(
    flood.score * SETTINGS.weights.flood +
    heat.score * SETTINGS.weights.heat +
    green.score * SETTINGS.weights.green +
    carbon.score * SETTINGS.weights.carbon,
  );
  const riskLevel = impactScore < 30 ? "Low" : impactScore < 60 ? "Moderate" : "High";

  return {
    impactScore,
    climateScore: round(100 - impactScore),
    riskLevel,
    breakdown: { flood, heat, green, carbon },
    weights: SETTINGS.weights,
  };
}

export function explainScore(scoring) {
  return Object.entries(scoring.breakdown)
    .map(([factor, details]) => ({
      factor,
      score: details.score,
      weight: SETTINGS.weights[factor],
      contribution: round(details.score * SETTINGS.weights[factor]),
      confidence: details.confidence,
    }))
    .sort((a, b) => b.contribution - a.contribution);
}
