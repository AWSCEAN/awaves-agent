"""GraphQL resolvers for surf prediction inference."""

import logging

import strawberry

from app.graphql.context import GraphQLContext
from app.graphql.types.surf import (
    DerivedMetricsGQL,
    GeoGQL,
    PredictionMetadataGQL,
    SurfPrediction,
    SurfPredictionInput,
    SurfPredictionResult,
)
from app.services.prediction_service import get_surf_prediction

logger = logging.getLogger(__name__)


async def predict_surf(
    info: strawberry.Info[GraphQLContext, None],
    input: SurfPredictionInput,
) -> SurfPredictionResult:
    """Run surf prediction inference via shared prediction service."""
    try:
        result = await get_surf_prediction(
            input.location_id, input.surf_date, input.surfer_level
        )

        dm = result.get("derivedMetrics", {})
        meta = result.get("metadata", {})
        geo = result.get("geo", {})

        prediction = SurfPrediction(
            location_id=result.get("locationId", input.location_id),
            surf_timestamp=result.get("surfTimestamp", ""),
            geo=GeoGQL(lat=geo.get("lat", 0), lng=geo.get("lng", 0)),
            derived_metrics=DerivedMetricsGQL(
                surf_score=dm.get("surfScore", 0),
                surf_grade=dm.get("surfGrade", "D"),
                surfing_level=dm.get("surfingLevel", "INTERMEDIATE"),
            ),
            metadata=PredictionMetadataGQL(
                model_version=meta.get("modelVersion", ""),
                data_source=meta.get("dataSource", ""),
                prediction_type=meta.get("predictionType", ""),
                created_at=meta.get("createdAt", ""),
                cache_source=meta.get("cacheSource"),
            ),
            week_number=result.get("weekNumber", 0),
            week_range=result.get("weekRange", ""),
            spot_name=result.get("spotName", input.location_id),
            spot_name_ko=result.get("spotNameKo"),
        )

        return SurfPredictionResult(success=True, data=prediction)

    except Exception as e:
        logger.warning("GraphQL predict_surf failed: %s", e)
        return SurfPredictionResult(success=False, error=str(e))
