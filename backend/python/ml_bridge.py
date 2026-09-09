"""Small stdin/stdout adapter between the Node API and the existing ML pipeline."""

import json
import os
import sys
from pathlib import Path


def main():
    repository_root = Path(__file__).resolve().parents[2]
    sys.path.insert(0, str(repository_root))
    request = json.load(sys.stdin)

    from ml_pipeline.extractor import PuneExtractor

    coordinates = request.get("coordinates")
    if not coordinates:
        raise ValueError("coordinates are required when ML_MODE=python")

    project_id = os.environ.get("GEE_PROJECT_ID")
    model_path = os.environ.get("MODEL_PATH")
    if not project_id or not model_path:
        raise ValueError("GEE_PROJECT_ID and MODEL_PATH are required when ML_MODE=python")

    extractor = PuneExtractor(project_id, model_path)
    result = extractor.extract(
        coordinates["lat"],
        coordinates["lon"],
        request.get("bufferM", 500),
    )
    print(json.dumps({**result, "source": "gee-segformer"}))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(1)
