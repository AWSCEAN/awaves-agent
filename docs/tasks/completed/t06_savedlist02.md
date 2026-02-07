## Task ID
t06_savedlist02

## Status
COMPLETED - 2026-02-07

## Objective
Refactor saved_list and feedback feature schemas across PostgreSQL, DynamoDB, and Valkey. Simplify saved list UI by removing unnecessary fields and implementing change notification overlay.

## Agent Order
1. backend
2. frontend
3. qa
4. review
5. docs

## Success Criteria
- [x] PostgreSQL: Merge SavedItemFeedback into Feedback table
- [x] PostgreSQL: Create Alembic migration for schema changes
- [x] DynamoDB: Remove surfSafetyGrade from schema
- [x] DynamoDB: Use location_surf_key as composite key
- [x] Frontend: Remove surfSafetyGrade display
- [x] Frontend: Remove savedAt display (show only departureDate)
- [x] Frontend: Implement change notification overlay with dimming
- [x] TypeScript: Update shared types
- [x] Fix 422 error on acknowledge-change endpoint

## Implementation Summary

### Backend Changes
| File | Change |
|------|--------|
| `apps/api/alembic.ini` | NEW - Alembic configuration for async migrations |
| `apps/api/alembic/env.py` | NEW - Async SQLAlchemy migration environment |
| `apps/api/alembic/script.py.mako` | NEW - Migration template |
| `apps/api/alembic/versions/001_refactor_feedback_table.py` | NEW - Migration to merge feedback tables |
| `apps/api/app/models/feedback.py` | Merged SavedItemFeedback into Feedback, changed id to BigInteger |
| `apps/api/app/models/user.py` | Removed UserV2 alias |
| `apps/api/app/schemas/saved.py` | Added location_surf_key to request schemas, explicit Field(default=None) |
| `apps/api/app/services/dynamodb.py` | Removed surfSafetyGrade, added _parse_location_surf_key helper |

### Frontend Changes
| File | Change |
|------|--------|
| `packages/shared/src/index.ts` | Removed surf_safety_grade, renamed sort_key to location_surf_key |
| `apps/web/components/SavedItemCard.tsx` | Removed surfSafetyGrade/savedAt display, added dimming overlay for flagChange |
| `apps/web/app/saved/page.tsx` | Updated to use location_surf_key for API calls |
| `apps/web/lib/apiServices.ts` | Updated acknowledgeChange to use location_surf_key |

### Database Schema Changes

#### PostgreSQL - Feedback Table (New Schema)
```sql
CREATE TABLE feedback (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    location_id VARCHAR(100) NOT NULL,
    surf_timestamp VARCHAR(50) NOT NULL,
    feedback_result BOOLEAN,      -- Changed from INTEGER
    feedback_status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL
);
```

#### DynamoDB - saved_list Table
- Removed: `surfSafetyGrade` attribute
- `SortKey` format: `{latitude}#{longitude}#{timestamp}` (used as location_surf_key)

### UI Changes

#### SavedItemCard - Change Notification
When `flag_change = true`:
1. Entire card content is dimmed (opacity: 40%, pointer-events: none)
2. Overlay appears with:
   - Warning icon
   - "Change Detected" header
   - Change message from API
   - "Acknowledge" button
3. User clicks acknowledge -> API call to clear flag

### Data Flow
1. User views Saved page -> Fetch /saved
2. If item has `flag_change: true` -> Card is dimmed with overlay
3. User clicks "Acknowledge" -> POST /saved/acknowledge-change with location_surf_key
4. Backend updates DynamoDB (flagChange=false, remove changeMessage)
5. Cache is invalidated
6. UI updates to show normal card

### Test Data Setup
DynamoDB (User 8):
```json
{
  "UserId": "8",
  "SortKey": "33.44#-94.04#2026-01-28T06:00:00Z",
  "flagChange": true,
  "changeMessage": "The surfing index has decreased"
}
```

### Notes
- Alembic initialized for future database migrations
- Migration can be run with: `cd apps/api && alembic upgrade head`
- Server must be restarted after schema changes for Pydantic to reload

### Dependencies
- No new dependencies added
- Uses existing: aioboto3, boto3, alembic (already in requirements)
