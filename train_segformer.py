import ee
import geemap
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from transformers import SegformerForSemanticSegmentation, SegformerImageProcessor
import json
import os

# --- CONFIGURATION ---
CONFIG = {
    'GEE_PROJECT': 'your-project-id',
    'MODEL_SAVE_PATH': 'models/segformer-pune',
    'BANDS': ['B4', 'B3', 'B2', 'B8'],
    'NUM_CLASSES': 3, # vegetation, impervious, water
    'BATCH_SIZE': 4,
    'EPOCHS': 20,
    'LR': 6e-4,
    'SCALE_M': 10,
    'BUFFER_M': 500,
    'TRAIN_LOCATIONS': [
        (18.5204, 73.8567), (18.5679, 73.9143), (18.4636, 73.8683),
        (18.5912, 73.7389), (18.5314, 73.8446), (18.4529, 73.8189),
    ]
}

ID2LABEL = {0: 'vegetation', 1: 'impervious', 2: 'water'}
LABEL2ID = {v: k for k, v in ID2LABEL.items()}

class PuneLandCoverDataset(Dataset):
    def __init__(self, images, labels, processor):
        self.images = images
        self.labels = labels
        self.processor = processor

    def __len__(self): return len(self.images)

    def __getitem__(self, idx):
        image = self.images[idx].astype(np.uint8)
        label = self.labels[idx].astype(np.int64)
        encoded = self.processor(image, label, return_tensors='pt')
        return {k: v.squeeze(0) for k, v in encoded.items()}

def get_worldcover_remapped(aoi):
    wc = ee.ImageCollection('ESA/WorldCover/v200').first().clip(aoi)
    veg_classes = [10, 20, 30, 40, 90, 95, 100]
    imp_classes = [50, 60]
    water_classes = [80]
    return wc.remap(
        veg_classes + imp_classes + water_classes,
        [0]*len(veg_classes) + [1]*len(imp_classes) + [2]*len(water_classes),
        defaultValue=3
    ).rename('label')

def train():
    print("🚀 Starting Production Training Pipeline...")

    # GEE Initialization with Service Account (Production Flow)
    try:
        import os
        from dotenv import load_dotenv
        load_dotenv()

        service_account = os.getenv("GEE_SERVICE_ACCOUNT")
        key_path = os.getenv("GEE_KEY_PATH")
        gee_project = os.getenv("GEE_PROJECT_ID")

        if service_account and key_path and os.path.exists(key_path):
            print(f"Authenticating with Service Account: {service_account}")
            credentials = ee.ServiceAccountCredentials(service_account, key_path)
            ee.Initialize(credentials, project=gee_project)
        else:
            print("Service account key not found. Attempting standard initialization...")
            ee.Initialize(project=gee_project)

    except Exception as e:
        print(f"❌ GEE Auth failed: {e}")
        print("\nTo fix this, run 'earthengine authenticate' in your terminal or use a Service Account key.")
        return

    # 1. Data Collection

    images, labels = [], []
    processor = SegformerImageProcessor(do_resize=True, size={'height': 512, 'width': 512})

    for lat, lon in CONFIG['TRAIN_LOCATIONS']:
        print(f"Pulling tile at {lat}, {lon}...")
        pt = ee.Geometry.Point([lon, lat])
        aoi = pt.buffer(CONFIG['BUFFER_M']).bounds()

        # Sentinel-2 RGB
        s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterBounds(aoi).median().clip(aoi)
        img_arr = geemap.ee_to_numpy(s2, region=aoi, bands=['B4', 'B3', 'B2'], scale=CONFIG['SCALE_M'])

        # WorldCover labels
        lbl_img = get_worldcover_remapped(aoi)
        lbl_arr = geemap.ee_to_numpy(lbl_img, region=aoi, bands=['label'], scale=CONFIG['SCALE_M'])

        images.append(img_arr)
        labels.append(lbl_arr.squeeze(-1))

    # 2. Model Setup
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    model = SegformerForSemanticSegmentation.from_pretrained(
        'nvidia/segformer-b0-finetuned-ade-512-512',
        num_labels=CONFIG['NUM_CLASSES'],
        id2label=ID2LABEL,
        label2id=LABEL2ID,
        ignore_mismatched_sizes=True
    ).to(device)

    # Freeze encoder
    for param in model.segformer.parameters():
        # We freeze everything except the classifier head
        # In SegFormerForSemanticSegmentation, the head is in model.decode_head
        param.requires_grad = False

    # Unfreeze the classification head
    for param in model.decode_head.parameters():
        param.requires_grad = True

    train_loader = DataLoader(PuneLandCoverDataset(images, labels, processor), batch_size=CONFIG['BATCH_SIZE'], shuffle=True)
    optimizer = torch.optim.AdamW([p for p in model.parameters() if p.requires_grad], lr=CONFIG['LR'])

    # 3. Training Loop
    model.train()
    for epoch in range(CONFIG['EPOCHS']):
        total_loss = 0
        for batch in train_loader:
            pixel_values, labels = batch['pixel_values'].to(device), batch['labels'].to(device)
            outputs = model(pixel_values=pixel_values, labels=labels)
            loss = outputs.loss
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
        print(f"Epoch {epoch+1}/{CONFIG['EPOCHS']} - Loss: {total_loss/len(train_loader):.4f}")

    # 4. Save Production Model
    os.makedirs(CONFIG['MODEL_SAVE_PATH'], exist_ok=True)
    model.save_pretrained(CONFIG['MODEL_SAVE_PATH'])
    processor.save_pretrained(CONFIG['MODEL_SAVE_PATH'])
    print(f"✅ Model saved to {CONFIG['MODEL_SAVE_PATH']}")

if __name__ == "__main__":
    train()
