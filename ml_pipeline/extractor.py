import ee
import geemap
import numpy as np
import torch
import torch.nn as nn
from transformers import SegformerForSemanticSegmentation, SegformerImageProcessor
import os

# Production Constants
SCALE_M = 10
NUM_CLASSES = 3
ID2LABEL = {0: 'vegetation', 1: 'impervious', 2: 'water'}
LABEL2ID = {v: k for k, v in ID2LABEL.items()}

class PuneExtractor:
    def __init__(self, gee_project_id, model_path=None):
        """
        Production Extractor for Pune Climate Intelligence.
        Integrates Google Earth Engine for satellite data and SegFormer for land cover analysis.
        """
        # 1. GEE Initialization
        try:
            import os
            service_account = os.getenv("GEE_SERVICE_ACCOUNT")
            key_path = os.getenv("GEE_KEY_PATH")

            if service_account and key_path:
                if os.path.exists(key_path):
                    # Standard production service account flow
                    credentials = ee.ServiceAccountCredentials(service_account, key_path)
                    ee.Initialize(credentials, project=gee_project_id)
                else:
                    # Key file missing - log clearly and try fallback
                    print(f"WARNING: Service account key not found at {key_path}. Attempting standard auth...")
                    ee.Initialize(project=gee_project_id)
            else:
                # No service account config - use standard auth
                ee.Initialize(project=gee_project_id)
        except Exception as e:
            # If it still fails, provide a more helpful error message for the user
            raise RuntimeError(f"GEE Auth failed. If you are running locally, ensure you have run 'earthengine authenticate' or provided a valid Service Account key. Error: {str(e)}")

        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'

        # 2. Production Model Loading
        if model_path and os.path.exists(model_path):
            self.model = SegformerForSemanticSegmentation.from_pretrained(model_path).to(self.device)
        else:
            # In production, this would be a critical error if the trained model is missing
            raise FileNotFoundError(f"Trained model not found at {model_path}. Please run train_segformer.py first.")

        self.model.eval()
        self.processor = SegformerImageProcessor(do_resize=True, size={'height': 512, 'width': 512})

    def get_sentinel2_composite(self, aoi, start_date='2025-01-01', end_date='2026-06-01', cloud_pct=20):
        collection = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                      .filterBounds(aoi)
                      .filterDate(start_date, end_date)
                      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', cloud_pct)))
        composite = collection.median().clip(aoi)

        # Calculate indices for climate profiling
        ndvi = composite.normalizedDifference(['B8', 'B4']).rename('NDVI')
        ndbi = composite.normalizedDifference(['B11', 'B8']).rename('NDBI')
        ndwi = composite.normalizedDifference(['B3', 'B8']).rename('NDWI')
        return composite.addBands([ndvi, ndbi, ndwi])

    def get_lst_celsius(self, aoi, start_date='2025-01-01', end_date='2026-06-01', cloud_pct=20):
        collection = (ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
                      .filterBounds(aoi)
                      .filterDate(start_date, end_date)
                      .filter(ee.Filter.lt('CLOUD_COVER', cloud_pct)))
        composite = collection.median().clip(aoi)
        # LST formula for Landsat 8 Level 2: DN * 0.00341802 + 149.0 (Kelvin)
        lst_kelvin = composite.select('ST_B10').multiply(0.00341802).add(149.0)
        return lst_kelvin.subtract(273.15).rename('LST_C')

    def get_slope_and_elevation(self, aoi):
        dem = ee.ImageCollection('COPERNICUS/DEM/GLO30').select('DEM').mosaic().clip(aoi)
        slope = ee.Terrain.slope(dem).rename('slope_deg')
        return dem.rename('elevation_m'), slope

    def run_inference(self, image_array):
        """Perform semantic segmentation on the RGB crop."""
        image = image_array.astype(np.uint8)
        encoded = self.processor(image, return_tensors='pt').to(self.device)
        with torch.no_grad():
            outputs = self.model(**encoded)
            logits = outputs.logits
            upsampled = nn.functional.interpolate(
                logits, size=image.shape[:2], mode='bilinear', align_corners=False
            )
            pred_mask = upsampled.argmax(dim=1).squeeze(0).cpu().numpy()
        return pred_mask

    def calculate_percentages(self, pred_mask):
        total = pred_mask.size
        percentages = {}
        for class_id, name in ID2LABEL.items():
            pct = float((pred_mask == class_id).sum()) / total * 100
            percentages[f'{name}_pct'] = round(pct, 2)
        return percentages

    def extract(self, lat, lon, buffer_m=500):
        """
        Main entry point: Extracts satellite features and classifies landcover.
        """
        plot_point = ee.Geometry.Point([lon, lat])
        aoi = plot_point.buffer(buffer_m).bounds()

        # 1. Satellite Data Acquisition
        s2_indexed = self.get_sentinel2_composite(aoi)
        lst = self.get_lst_celsius(aoi)
        elevation, slope = self.get_slope_and_elevation(aoi)

        # 2. Process RGB for ML Model
        s2_array = geemap.ee_to_numpy(s2_indexed, region=aoi, bands=['B4', 'B3', 'B2'], scale=SCALE_M)

        # 3. SegFormer Inference
        pred_mask = self.run_inference(s2_array)
        landcover_pcts = self.calculate_percentages(pred_mask)

        # 4. Extract Regional Mean Metrics
        ndvi_mean = float(np.nanmean(geemap.ee_to_numpy(s2_indexed.select('NDVI'), region=aoi, bands=['NDVI'], scale=SCALE_M)))
        ndbi_mean = float(np.nanmean(geemap.ee_to_numpy(s2_indexed.select('NDBI'), region=aoi, bands=['NDBI'], scale=SCALE_M)))
        lst_mean = float(np.nanmean(geemap.ee_to_numpy(lst, region=aoi, bands=['LST_C'], scale=SCALE_M)))
        slope_mean = float(np.nanmean(geemap.ee_to_numpy(slope, region=aoi, bands=['slope_deg'], scale=SCALE_M)))
        elev_mean = float(np.nanmean(geemap.ee_to_numpy(elevation, region=aoi, bands=['elevation_m'], scale=SCALE_M)))

        return {
            'project_location': {'lat': lat, 'lon': lon, 'buffer_m': buffer_m},
            'landcover': landcover_pcts,
            'ndvi_mean': round(ndvi_mean, 3),
            'ndbi_mean': round(ndbi_mean, 3),
            'lst_celsius_mean': round(lst_mean, 2),
            'slope_deg_mean': round(slope_mean, 2),
            'elevation_m_mean': round(elev_mean, 2),
        }
