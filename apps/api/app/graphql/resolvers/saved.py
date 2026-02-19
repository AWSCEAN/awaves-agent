"""Saved items resolvers for GraphQL."""

from datetime import datetime
from strawberry.types import Info

from app.graphql.context import GraphQLContext
from app.graphql.types.saved import (
    SavedItem,
    SavedListResult,
    SavedItemResponse,
    SaveItemInput,
    DeleteSavedItemInput,
    AcknowledgeChangeInput,
)
from app.repositories.saved_list_repository import SavedListRepository
from app.services.cache import SavedItemsCacheService as CacheService


async def get_saved_items(info: Info[GraphQLContext, None]) -> SavedListResult:
    """Get all saved items for the current user."""
    if not info.context.is_authenticated:
        raise Exception("Not authenticated")

    user_id = str(info.context.user_id)

    # Try cache first
    cached_items = await CacheService.get_saved_items(user_id)
    if cached_items is not None:
        db_items = cached_items
    else:
        # Fallback to DynamoDB
        db_items = await SavedListRepository.get_saved_list(user_id)
        # Cache even empty lists to avoid repeated DynamoDB hits
        await CacheService.store_saved_items(user_id, db_items)

    # Get feedback status using DataLoader (batched query)
    feedback_map = await info.context.feedback_loader.load_feedback_map(
        int(info.context.user_id)
    )

    # Build response with joined data
    items = []
    for item in db_items:
        location_id = item.get("LocationId", "")
        surf_timestamp = item.get("SurfTimestamp", "")
        key = f"{location_id}#{surf_timestamp}"
        feedback_status = feedback_map.get(key)
        items.append(SavedItem.from_dynamodb(item, feedback_status))

    return SavedListResult(items=items, total=len(items))


async def get_saved_item(
    info: Info[GraphQLContext, None],
    location_id: str,
    surf_timestamp: str,
) -> SavedItem:
    """Get a specific saved item."""
    if not info.context.is_authenticated:
        raise Exception("Not authenticated")

    user_id = str(info.context.user_id)

    item = await SavedListRepository.get_saved_item(
        user_id=user_id,
        location_id=location_id,
        surf_timestamp=surf_timestamp,
    )

    if not item:
        raise Exception("Saved item not found")

    return SavedItem.from_dynamodb(item)


async def save_item(
    info: Info[GraphQLContext, None],
    input: SaveItemInput,
) -> SavedItemResponse:
    """Save a surf location."""
    if not info.context.is_authenticated:
        raise Exception("Not authenticated")

    user_id = str(info.context.user_id)
    saved_at = datetime.utcnow().isoformat() + "Z"

    try:
        result = await SavedListRepository.save_item(
            user_id=user_id,
            location_id=input.location_id,
            surf_timestamp=input.surf_timestamp,
            saved_at=saved_at,
            surfer_level=input.surfer_level,
            surf_score=input.surf_score,
            surf_grade=input.surf_grade,
            address=input.address,
            region=input.region,
            country=input.country,
            departure_date=input.departure_date,
            wave_height=input.wave_height,
            wave_period=input.wave_period,
            wind_speed=input.wind_speed,
            water_temperature=input.water_temperature,
        )

        if result is None:
            return SavedItemResponse(success=False, error="Item already saved")

        await CacheService.invalidate_saved_items(user_id)

        return SavedItemResponse(
            success=True,
            data=SavedItem.from_dynamodb(result),
        )
    except Exception as e:
        return SavedItemResponse(success=False, error=str(e))


async def delete_saved_item(
    info: Info[GraphQLContext, None],
    input: DeleteSavedItemInput,
) -> bool:
    """Delete a saved item."""
    if not info.context.is_authenticated:
        raise Exception("Not authenticated")

    user_id = str(info.context.user_id)

    success = await SavedListRepository.delete_item(
        user_id=user_id,
        location_surf_key=input.location_surf_key,
        location_id=input.location_id,
        surf_timestamp=input.surf_timestamp,
    )

    if success:
        await CacheService.invalidate_saved_items(user_id)

    return success


async def acknowledge_change(
    info: Info[GraphQLContext, None],
    input: AcknowledgeChangeInput,
) -> bool:
    """Acknowledge a change notification."""
    if not info.context.is_authenticated:
        raise Exception("Not authenticated")

    user_id = str(info.context.user_id)

    success = await SavedListRepository.acknowledge_change(
        user_id=user_id,
        location_surf_key=input.location_surf_key,
        location_id=input.location_id,
        surf_timestamp=input.surf_timestamp,
    )

    if success:
        await CacheService.invalidate_saved_items(user_id)

    return success
