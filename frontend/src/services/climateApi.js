// Backend integration point.
// Replace these mock functions with fetch/axios calls once the backend teammate
// exposes the climate analysis and optimization endpoints.

import { assessment, optimized, recommendations } from "../data/mockData";

export async function getAssessment() {
  return Promise.resolve(assessment);
}

export async function optimizeAssessment() {
  return Promise.resolve({
    baseline: assessment,
    optimized,
    recommendations
  });
}

export async function createAssessment(payload) {
  console.log("Assessment payload ready for backend:", payload);
  return Promise.resolve(assessment);
}
