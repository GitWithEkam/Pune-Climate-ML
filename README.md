# Pune Climate Intelligence — ML Pipeline

This repository contains the core Machine Learning and Environmental Intelligence pipeline for the Pune region. It is designed to extract climate parameters from satellite data, calculate a deterministic impact score, and provide AI-driven project optimizations.

## 🚀 Pipeline Overview

The pipeline consists of three main stages:

### 1. CV Extraction (`ml_pipeline/extractor.py`)
Uses a fine-tuned **SegFormer-B0** model and **Google Earth Engine (GEE)** to extract:
- **Landcover Percentages**: Vegetation, Impervious, and Water cover.
- **Thermal Data**: Land Surface Temperature (LST) from Landsat-8.
- **Hydrology Data**: Slope and Elevation from Copernicus DEM.
- **Spectral Indices**: NDVI, NDBI, and NDWI.

### 2. Deterministic Scoring (`ml_pipeline/scorer.py`)
Implements engineering-grade formulas to calculate climate impact:
- **Flood Risk**: Based on the **SCS-CN** runoff method.
- **Heat Impact**: Scaled against Pune's urban heat baseline.
- **Carbon Impact**: Embodied carbon accounting based on material quantities and **GRIHA** benchmarks.
- **Composite Score**: A weighted aggregation of all factors.

### 3. AI Optimization (`ml_pipeline/optimizer.py`)
Utilizes **Gemini 2.0 Flash** to suggest specific project modifications. The optimizer applies these changes to the deterministic formulas to verify the actual score improvement before presenting them to the user.

## 🛠️ Installation & Setup

1. **Clone the repo**:
   ```bash
   git clone <repo-url>
   cd Pune_Climate_ML
   ```

2. **Configure Environment**:
   Create a `.env` file in the root directory:
   ```env
   GEE_PROJECT_ID=your-project-id
   GEMINI_API_KEY=your-api-key
   GEE_SERVICE_ACCOUNT=your-service-account-email
   GEE_KEY_PATH=path/to/your-key.json
   MODEL_PATH=models/segformer-pune
   ```

3. **Install Dependencies**:
   ```bash
   pip install ee geemap numpy torch transformers google-genai pydantic python-dotenv
   ```

## 🏋️ Training the Model

To train the SegFormer model for Pune's landcover, run the training script:
```bash
python train_segformer.py
```
This script will pull training tiles from GEE and save the fine-tuned weights to the `models/` directory.
