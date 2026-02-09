## Task ID
t06_savedlist01

## Status
COMPLETED - 2026-02-05

## Objective
Update Saved List feature with DynamoDB integration, cache configuration, feedback functionality, and comprehensive UI updates.

## Agent Order
1. backend
2. frontend
3. qa
4. review
5. docs

## Success Criteria
- [x] DynamoDB integration for saved items
- [x] Cache configuration for saved items
- [x] Feedback table and API in PostgreSQL
- [x] Updated Saved List UI with real API integration
- [x] Change notification UI
- [x] Feedback UI (thumbs up/down)
- [x] Delete confirmation UX
- [x] TypeScript types updated
- [x] Security review passed

## Implementation Summary

### Backend Changes
| File | Change |
|------|--------|
| `apps/api/app/config.py` | Added DynamoDB settings (dynamodb_saved_list_table, ddb_endpoint_url) |
| `apps/api/app/services/dynamodb.py` | NEW - DynamoDB service with save/get/delete/acknowledge operations |
| `apps/api/app/schemas/saved.py` | NEW - SavedItemRequest, SavedItemResponse, SavedListResponse, etc. |
| `apps/api/app/routers/saved.py` | Complete rewrite with DynamoDB + cache integration |
| `apps/api/app/services/cache.py` | Added saved items cache methods (store/get/invalidate) |
| `apps/api/app/models/feedback.py` | Added SavedItemFeedback model for PostgreSQL |
| `apps/api/app/schemas/feedback.py` | Added SavedItemFeedbackRequest, SavedItemFeedbackResponse |
| `apps/api/app/routers/feedback.py` | Added /feedback/saved-item endpoints |
| `apps/api/requirements.txt` | Added aioboto3>=12.0.0, updated boto3 version constraint |

### Frontend Changes
| File | Change |
|------|--------|
| `packages/shared/src/index.ts` | Added SavedItemRequest, SavedItemResponse, SavedListResponse, FeedbackStatus, SavedItemFeedbackRequest, SavedItemFeedbackResponse types |
| `apps/web/lib/apiServices.ts` | Updated savedService and feedbackService with new DynamoDB API methods |
| `apps/web/components/SavedItemCard.tsx` | NEW - Card component with surf conditions, grades, feedback UI, change notification banner |
| `apps/web/app/saved/page.tsx` | Complete rewrite with API integration, loading/error states, feedback management |

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /saved | Get all saved items for user (cache-first) |
| POST | /saved | Save a surf location to DynamoDB |
| DELETE | /saved | Delete a saved item |
| GET | /saved/{location_id}/{surf_timestamp} | Get specific saved item |
| POST | /saved/acknowledge-change | Acknowledge change notification |
| POST | /feedback/saved-item | Submit feedback for saved item |
| GET | /feedback/saved-item/{location_id}/{surf_timestamp} | Get feedback for saved item |

### Data Flow
1. User views Saved page → Frontend fetches /saved
2. Backend checks Redis cache first → If miss, queries DynamoDB
3. User submits feedback → Stored in PostgreSQL (saved_item_feedback table)
4. User deletes item → DynamoDB delete + cache invalidation
5. Change detection → flag_change: true in DynamoDB → UI shows notification banner

### SavedItemCard Features
- Surf grades display (surf_grade, surf_safety_grade)
- Surf score progress bar (0-100)
- Conditions grid (wave height, period, wind speed, water temp)
- Date information (saved_at, departure_date)
- Feedback buttons (thumbs up/down/later)
- Delete confirmation modal
- Change notification banner with acknowledge button

### Cache Configuration
- Key pattern: `awaves:saved:{user_id}`
- TTL: 3600 seconds (1 hour)
- Invalidated on: save, delete, acknowledge-change

### DynamoDB Schema
- Table: saved_list (configurable via DYNAMODB_SAVED_LIST_TABLE)
- Partition Key: UserId (String)
- Sort Key: SortKey (String) - format: `{location_id}#{surf_timestamp}`
- Attributes: LocationId, SurfTimestamp, SavedAt, Address, Region, Country, DepartureDate, waveHeight, wavePeriod, windSpeed, waterTemperature, SurferLevel, surfScore, surfGrade, surfSafetyGrade, flagChange, changeMessage

### PostgreSQL Schema (saved_item_feedback)
```sql
CREATE TABLE saved_item_feedback (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    location_id VARCHAR(100) NOT NULL,
    surf_timestamp VARCHAR(50) NOT NULL,
    feedback_result INTEGER,  -- 1=positive, 0=negative, NULL=deferred
    feedback_status VARCHAR(20) NOT NULL,  -- POSITIVE, NEGATIVE, DEFERRED
    created_at TIMESTAMP NOT NULL
);
```

### Notes
- DynamoDB Local required for local development (endpoint: http://localhost:8000)
- Redis cache is optional - graceful degradation if unavailable
- All endpoints require JWT authentication
- Users can only access their own data (user_id from token)

### Dependencies Added
- aioboto3>=12.0.0 (async DynamoDB operations)
- boto3>=1.33.2,<1.34.35 (AWS SDK, version constraint for aiobotocore compatibility)
