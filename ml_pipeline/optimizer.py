import json
from google import genai
from pydantic import BaseModel, Field
from typing import Literal, List
from .scorer import run_full_score
from .config import CONFIG

MODIFIABLE_TARGETS = Literal[
    'vegetation_pct', 'impervious_pct',
    'concrete_ready_mix', 'steel_reinforcement', 'brick', 'glass', 'aluminium'
]

class Recommendation(BaseModel):
    target: MODIFIABLE_TARGETS = Field(description='The exact parameter to change.')
    new_value: float = Field(description='The recommended new value for this parameter, in the same units as the current value.')
    rationale: str = Field(description='One or two sentences explaining why this change helps, referencing the specific sub-score it improves.')
    expected_impact: Literal['low', 'moderate', 'high'] = Field(description='Rough expected impact on the composite score.')

class RecommendationSet(BaseModel):
    recommendations: List[Recommendation] = Field(description='Ranked list, most impactful first. 3-5 recommendations.')

class PuneOptimizer:
    def __init__(self, api_key):
        """
        Production Optimizer using Gemini AI to suggest project modifications.
        """
        self.client = genai.Client(api_key=api_key)
        self.model_name = 'gemini-2.0-flash'

    def build_prompt(self, state):
        return f"""You are an expert sustainability consultant advising on a proposed urban development project in Pune, India.
The project is rated by a deterministic climate-impact scoring system.

CURRENT SCORE: {state['scoring_result']['composite_score']}/100 ({state['scoring_result']['classification']})

SUB-SCORE BREAKDOWN (higher = worse impact):
{json.dumps(state['scoring_result']['breakdown'], indent=2)}

CURRENT LAND COVER:
{json.dumps(state['extracted_parameters']['landcover'], indent=2)}

CURRENT MATERIALS (kg):
{json.dumps(state['project_materials'], indent=2)}

BUILT-UP AREA: {state['built_up_area_sqm']} sqm

Recommend 3-5 concrete, specific changes to reduce the composite score.
Focus on the sub-scores with the highest a-priori impact.
Only recommend changes to parameters provided in the input.
"""

    def get_recommendations(self, state):
        prompt = self.build_prompt(state)
        response = self.client.models.generate_content(
            model=self.model_name,
            contents=prompt,
            config={
                'response_mime_type': 'application/json',
                'response_schema': RecommendationSet,
            },
        )
        return RecommendationSet.model_validate_json(response.text)

    def apply_recommendation(self, state, rec):
        new_landcover = dict(state['extracted_parameters']['landcover'])
        new_materials = dict(state['project_materials'])

        if rec.target in ('vegetation_pct', 'impervious_pct'):
            water = new_landcover.get('water_pct', 0)
            remaining = 100.0 - water
            if rec.target == 'vegetation_pct':
                new_veg = min(max(rec.new_value, 0.0), remaining)
                new_landcover['vegetation_pct'] = new_veg
                new_landcover['impervious_pct'] = remaining - new_veg
            else:
                new_imp = min(max(rec.new_value, 0.0), remaining)
                new_landcover['impervious_pct'] = new_imp
                new_landcover['vegetation_pct'] = remaining - new_imp
        else:
            new_materials[rec.target] = max(rec.new_value, 0.0)

        return new_landcover, new_materials

    def optimize(self, state):
        recs = self.get_recommendations(state)

        comparison = []
        baseline_score = state['scoring_result']['composite_score']

        for rec in recs.recommendations:
            lc, mats = self.apply_recommendation(state, rec)
            res = run_full_score(
                lc,
                state['extracted_parameters']['lst_celsius_mean'],
                mats,
                state['built_up_area_sqm'],
                CONFIG
            )
            comparison.append({
                'target': rec.target,
                'new_value': rec.new_value,
                'expected_impact': rec.expected_impact,
                'resulting_score': res['composite_score'],
                'score_change': round(res['composite_score'] - baseline_score, 1),
            })

        comparison.sort(key=lambda x: x['score_change'])

        # Top recommendation applied
        top_rec = recs.recommendations[0]
        new_lc, new_mats = self.apply_recommendation(state, top_rec)
        after_result = run_full_score(
            new_lc,
            state['extracted_parameters']['lst_celsius_mean'],
            new_mats,
            state['built_up_area_sqm'],
            CONFIG
        )

        return {
            'baseline_score': baseline_score,
            'baseline_classification': state['scoring_result']['classification'],
            'recommendations': [r.model_dump() for r in recs.recommendations],
            'comparison': comparison,
            'top_recommendation_applied': {
                'target': top_rec.target,
                'new_value': top_rec.new_value,
                'resulting_score': after_result['composite_score'],
                'resulting_classification': after_result['classification'],
            },
        }
