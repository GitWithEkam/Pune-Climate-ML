import json
from .config import CONFIG

def area_weighted_cn(landcover, cn_table):
    veg = landcover.get('vegetation_pct', 0) / 100.0
    imp = landcover.get('impervious_pct', 0) / 100.0
    water = landcover.get('water_pct', 0) / 100.0
    cn = (veg * cn_table['vegetation']
          + imp * cn_table['impervious']
          + water * cn_table['water'])
    return cn

def scs_cn_runoff_mm(cn, rainfall_mm):
    """Standard SCS-CN runoff equation."""
    s = (25400.0 / cn) - 254.0   # potential maximum retention, mm
    ia = 0.2 * s                  # initial abstraction, mm
    if rainfall_mm <= ia:
        return 0.0
    q = ((rainfall_mm - ia) ** 2) / (rainfall_mm - ia + s)
    return q

def flood_risk_score(landcover, config):
    cn_actual = area_weighted_cn(landcover, config['curve_numbers'])
    q_actual = scs_cn_runoff_mm(cn_actual, config['design_storm_mm'])

    # Baseline: same plot at 100% vegetated cover (pre-development reference)
    baseline_landcover = {'vegetation_pct': 100.0, 'impervious_pct': 0.0, 'water_pct': 0.0}
    cn_baseline = area_weighted_cn(baseline_landcover, config['curve_numbers'])
    q_baseline = scs_cn_runoff_mm(cn_baseline, config['design_storm_mm'])

    excess_runoff_mm = max(q_actual - q_baseline, 0.0)
    score = min((excess_runoff_mm / config['design_storm_mm']) * 100.0, 100.0)

    return {
        'score': round(score, 1),
        'curve_number': round(cn_actual, 1),
        'runoff_mm': round(q_actual, 1),
        'baseline_runoff_mm': round(q_baseline, 1),
        'excess_runoff_mm': round(excess_runoff_mm, 1),
        'confidence': 'high',
    }

def heat_impact_score(lst_celsius_mean, config):
    # Use regional UHI intensity factor
    delta = lst_celsius_mean - config['base_temp_celsius']
    # Score is normalized by the UHI intensity factor: 10C above base = 100 points if factor is 0.1
    score = max(0.0, min((delta / (config['uhi_intensity_factor'] * 100)) * 100.0, 100.0))
    return {
        'score': round(score, 1),
        'lst_celsius': round(lst_celsius_mean, 2),
        'baseline_celsius': config['base_temp_celsius'],
        'delta_celsius': round(delta, 2),
        'confidence': 'medium',
    }

def green_cover_impact_score(landcover):
    vegetation_pct = landcover.get('vegetation_pct', 0)
    score = max(0.0, 100.0 - vegetation_pct)
    return {
        'score': round(score, 1),
        'vegetation_pct': vegetation_pct,
        'confidence': 'high',
    }

def carbon_impact_score(materials, built_up_area_sqm, config):
    factors = config['emission_factors_kgco2e_per_kg']
    total_kgco2e = sum(materials.get(mat, 0) * factor for mat, factor in factors.items())
    carbon_intensity = total_kgco2e / built_up_area_sqm

    bands = config['carbon_bands']
    if carbon_intensity <= bands['low']:
        rating, score = 'Low', 20.0
    elif carbon_intensity <= bands['moderate']:
        rating, score = 'Moderate', 50.0
    elif carbon_intensity <= bands['high']:
        rating, score = 'High', 80.0
    else:
        rating, score = 'Very High', 100.0

    return {
        'score': round(score, 1),
        'total_embodied_carbon_kgco2e': round(total_kgco2e, 0),
        'carbon_intensity_kgco2e_per_sqm': round(carbon_intensity, 1),
        'carbon_rating': rating,
        'confidence': 'medium',
    }

def composite_score(flood, heat, green, carbon, config):
    weights = config['weights']
    composite = (
        flood['score'] * weights['flood']
        + heat['score'] * weights['heat']
        + green['score'] * weights['green']
        + carbon['score'] * weights['carbon']
    )

    if composite < 30:
        classification = 'LOW IMPACT'
    elif composite < 60:
        classification = 'MODERATE IMPACT'
    else:
        classification = 'HIGH IMPACT'

    return {
        'composite_score': round(composite, 1),
        'classification': classification,
        'breakdown': {
            'flood_risk': flood,
            'heat_impact': heat,
            'green_cover': green,
            'carbon': carbon,
        },
        'weights_used': weights,
    }

def explain_score(result):
    contributions = []
    for name, sub in result['breakdown'].items():
        # Map the sub-score name back to the weight key
        weight_key = 'flood' if 'flood' in name else 'heat' if 'heat' in name else 'green' if 'green' in name else 'carbon'
        weight = result['weights_used'][weight_key]
        contribution_points = round(sub['score'] * weight, 1)
        contributions.append({
            'factor': name,
            'sub_score': sub['score'],
            'weight': weight,
            'points_contributed': contribution_points,
            'confidence': sub.get('confidence', 'unknown'),
        })
    contributions.sort(key=lambda x: x['points_contributed'], reverse=True)
    return contributions

def run_full_score(landcover, lst_celsius_mean, materials, built_up_area_sqm, config):
    flood = flood_risk_score(landcover, config)
    heat = heat_impact_score(lst_celsius_mean, config)
    green = green_cover_impact_score(landcover)
    carbon = carbon_impact_score(materials, built_up_area_sqm, config)
    return composite_score(flood, heat, green, carbon, config)
