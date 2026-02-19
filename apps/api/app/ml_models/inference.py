"""SageMaker-compatible inference handler for surf prediction model.

This file is used when deploying the model via SageMaker Docker container
(locally or on AWS). It implements the standard SageMaker serving interface:
  - model_fn: Load model from /opt/ml/model
  - input_fn: Deserialize request body
  - predict_fn: Run inference
  - output_fn: Serialize response

Usage with SageMaker local container:
  1. tar -czf model.tar.gz 20260211_model.pkl inference.py
  2. docker run -p 8080:8080 -v ./extracted_model:/opt/ml/model <image> serve
  3. curl http://localhost:8080/invocations -d '{"lat":33.44,"lng":-94.04,...}'
"""

import json
import os
import pickle


def model_fn(model_dir):
    """Load the LightGBM model from the SageMaker model directory."""
    model_path = os.path.join(model_dir, "20260211_model.pkl")
    with open(model_path, "rb") as f:
        model = pickle.load(f)
    # Use the booster directly for compatibility
    if hasattr(model, "booster_"):
        return model.booster_
    return model


def input_fn(request_body, content_type="application/json"):
    """Deserialize and validate the request body."""
    if content_type != "application/json":
        raise ValueError(f"Unsupported content type: {content_type}")

    data = json.loads(request_body)

    # Expect either raw features or structured input
    if "features" in data:
        # Direct feature vector
        return data
    elif "lat" in data and "lng" in data:
        # Structured input - needs feature engineering
        return data
    else:
        raise ValueError(
            "Request must contain either 'features' array or "
            "'lat', 'lng', 'surf_date', 'surfer_level' fields"
        )


def predict_fn(input_data, model):
    """Run prediction on the input data."""
    import numpy as np

    if "features" in input_data:
        # Direct feature vector - predict immediately
        features = np.array(input_data["features"], dtype=np.float64)
        if features.ndim == 1:
            features = features.reshape(1, -1)
        scores = model.predict(features)
        # Model outputs 0-1 range; scale to 0-100
        avg_score = float(np.clip(np.mean(scores) * 100, 0, 100))
    else:
        # Structured input - build features inline
        # This is a simplified version; full feature engineering
        # requires Open-Meteo data which the container doesn't fetch.
        # For container deployment, the caller should pre-compute features.
        raise ValueError(
            "Container inference requires pre-computed 'features' array. "
            "Use the FastAPI proxy endpoint for automatic feature engineering."
        )

    avg_score = round(avg_score, 1)
    grade = (
        "A" if avg_score >= 80
        else "B" if avg_score >= 60
        else "C" if avg_score >= 40
        else "D"
    )

    surfer_level = input_data.get("surfer_level", "intermediate")
    level_map = {
        "beginner": "BEGINNER",
        "intermediate": "INTERMEDIATE",
        "advanced": "ADVANCED",
    }

    return {
        "surfScore": avg_score,
        "surfGrade": grade,
        "surfingLevel": level_map.get(surfer_level.lower(), "INTERMEDIATE"),
    }


def output_fn(prediction, accept="application/json"):
    """Serialize the prediction response."""
    if accept != "application/json":
        raise ValueError(f"Unsupported accept type: {accept}")
    return json.dumps(prediction)
