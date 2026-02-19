"""GraphQL types for surf prediction inference."""

from typing import Optional

import strawberry


@strawberry.input
class SurfPredictionInput:
    """Input for surf score prediction."""

    location_id: str
    surf_date: str
    surfer_level: str


@strawberry.type
class GeoGQL:
    """Geographic coordinates."""

    lat: float
    lng: float


@strawberry.type
class DerivedMetricsGQL:
    """Prediction derived metrics."""

    surf_score: float
    surf_grade: str
    surfing_level: str


@strawberry.type
class PredictionMetadataGQL:
    """Prediction metadata."""

    model_version: str
    data_source: str
    prediction_type: str
    created_at: str
    cache_source: Optional[str] = None


@strawberry.type
class SurfPrediction:
    """Full surf prediction result."""

    location_id: str
    surf_timestamp: str
    geo: GeoGQL
    derived_metrics: DerivedMetricsGQL
    metadata: PredictionMetadataGQL
    week_number: int
    week_range: str
    spot_name: str
    spot_name_ko: Optional[str] = None


@strawberry.type
class SurfPredictionResult:
    """Wrapper for prediction result with success/error."""

    success: bool
    data: Optional[SurfPrediction] = None
    error: Optional[str] = None
