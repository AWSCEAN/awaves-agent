# Task: tsm_smlocal01 - Local SageMaker Inference Endpoint

## Status: In Progress

## Objective
Replace mock predictions in `/surf/predict` with real ML inference using the LightGBM model (`20260211_model.pkl`), with Open-Meteo data as feature source.

## Implementation Summary

### Backend Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/api/requirements.txt` | MODIFIED | Added lightgbm, scikit-learn, numpy |
| `apps/api/app/config.py` | MODIFIED | Added `inference_mode`, `sagemaker_local_endpoint` settings |
| `apps/api/.env.local` | MODIFIED | Added `INFERENCE_MODE=direct`, `SAGEMAKER_LOCAL_ENDPOINT` |
| `apps/api/app/services/openmeteo_service.py` | CREATED | Open-Meteo Marine + Weather API client |
| `apps/api/app/services/feature_engineering.py` | CREATED | 37-feature engineering pipeline for LightGBM model |
| `apps/api/app/services/inference_service.py` | CREATED | Model loading + prediction with LightGBM booster |
| `apps/api/app/services/prediction_service.py` | CREATED | Shared prediction logic (cache, inference, fallback, week info) |
| `apps/api/app/routers/surf.py` | MODIFIED | Simplified predict route to use prediction_service |
| `apps/api/app/main.py` | MODIFIED | Model loading at startup, enhanced health check |
| `apps/api/app/graphql/types/surf.py` | CREATED | Strawberry types: SurfPredictionInput/Result |
| `apps/api/app/graphql/resolvers/surf.py` | CREATED | GraphQL resolver for predict_surf query |
| `apps/api/app/graphql/schema.py` | MODIFIED | Added predict_surf query |
| `apps/api/app/ml_models/inference.py` | CREATED | SageMaker-compatible handler (future Docker use) |
| `apps/api/docker-compose.yml` | MODIFIED | Added sagemaker-inference service (optional profile) |

### Model Details
- **Type:** LightGBM Regressor (1814 estimators, lr=0.037)
- **Features:** 37 (13 raw from Open-Meteo + 24 derived)
- **Output:** Regression score (surfScore 0-100)
- **Grade mapping:** A (>=80), B (>=60), C (>=40), D (<40)

### Architecture
```
POST /surf/predict
  -> prediction_service.get_surf_prediction()
    -> CacheService (Redis check)
    -> InferenceService.predict()
      -> OpenMeteoService.fetch_hourly_data() (Marine + Weather APIs)
      -> FeatureEngineeringService.build_feature_vectors() (37 features)
      -> LightGBM booster.predict() (via run_in_executor)
    -> CacheService (Redis store, 24h TTL)
    -> Week info + spot name lookup
```

### Inference Modes
- `direct` (default): Load model directly with pickle, fetch Open-Meteo data at inference time
- `mock`: Deterministic random predictions (no model/API needed)

### Frontend Impact
- **None** - Frontend already calls `POST /surf/predict` and displays results via `PredictionResultPanel` and `SpotDetailPanel`

## Agents
- **Backend Dev:** Implementation complete
- **Frontend Dev:** No changes needed
- **Review:** Pending
- **QA:** Pending
- **Docs:** Pending
