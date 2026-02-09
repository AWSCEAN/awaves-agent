# API Contract: Saved List Schema Refactoring

**Contract ID:** t06_savedlist02
**Status:** AGREED
**Created:** 2026-02-07
**Last Updated:** 2026-02-07

---

## 1. Backend Changes

**Implemented by:** @backend-dev-agent

### PostgreSQL Schema Changes

#### Feedback Table Refactoring
- Merged `saved_item_feedback` table into `feedback` table
- Changed `id` from VARCHAR(36) to BIGINT AUTO_INCREMENT
- Changed `user_id` from VARCHAR(36) to BIGINT
- Changed `feedback_result` from INTEGER to BOOLEAN

**New Schema:**
```sql
CREATE TABLE feedback (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    location_id VARCHAR(100) NOT NULL,
    surf_timestamp VARCHAR(50) NOT NULL,
    feedback_result BOOLEAN,
    feedback_status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL
);
CREATE INDEX ix_feedback_user_id ON feedback(user_id);
CREATE INDEX ix_feedback_location_id ON feedback(location_id);
```

### Alembic Migration Setup
- Initialized Alembic for async SQLAlchemy migrations
- Created migration `001_refactor_feedback_table.py`

### DynamoDB Schema Changes
- Removed `surfSafetyGrade` attribute
- `SortKey` now used as `location_surf_key` (composite key: `{locationId}#{surfTimestamp}`)

### API Changes

#### AcknowledgeChangeRequest Schema
```python
class AcknowledgeChangeRequest(BaseModel):
    location_surf_key: Optional[str] = Field(default=None)
    location_id: Optional[str] = Field(default=None)
    surf_timestamp: Optional[str] = Field(default=None)
```

#### DeleteSavedItemRequest Schema
```python
class DeleteSavedItemRequest(BaseModel):
    location_surf_key: Optional[str] = Field(default=None)
    location_id: Optional[str] = Field(default=None)
    surf_timestamp: Optional[str] = Field(default=None)
```

### Files Changed
| File | Change |
|------|--------|
| `apps/api/alembic.ini` | NEW - Alembic configuration |
| `apps/api/alembic/env.py` | NEW - Async migration environment |
| `apps/api/alembic/versions/001_refactor_feedback_table.py` | NEW - Feedback table migration |
| `apps/api/app/models/feedback.py` | Refactored to single Feedback model |
| `apps/api/app/models/user.py` | Removed UserV2 alias |
| `apps/api/app/schemas/saved.py` | Updated request schemas with location_surf_key |
| `apps/api/app/services/dynamodb.py` | Removed surfSafetyGrade, added location_surf_key parsing |

---

## 2. Frontend Changes

**Implemented by:** @frontend-dev-agent

### TypeScript Types Updates
- Removed `surf_safety_grade` from `SavedItemResponse`
- Renamed `sort_key` to `location_surf_key`
- Updated `AcknowledgeChangeRequest` and `DeleteSavedItemRequest`

### UI Changes

#### SavedItemCard Component
1. **Removed surfSafetyGrade display** - Only shows surf_grade now
2. **Removed savedAt display** - Only shows departure_date
3. **Change Notification Overlay**:
   - When `flag_change = true`, entire card is dimmed (opacity 40%)
   - Overlay with warning icon, change message, and acknowledge button
   - Card content is non-interactive when dimmed

### Files Changed
| File | Change |
|------|--------|
| `packages/shared/src/index.ts` | Removed surf_safety_grade, renamed sort_key to location_surf_key |
| `apps/web/components/SavedItemCard.tsx` | Removed fields, added dimming overlay for change notification |
| `apps/web/app/saved/page.tsx` | Updated to use location_surf_key |

---

## 3. Test Cases

### Backend Test - Acknowledge Change
```bash
# Login and get token
TOKEN=$(curl -s -X POST http://localhost:8001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser8", "password": "password123"}' \
  | python -c "import sys,json; print(json.load(sys.stdin)['data']['access_token'])")

# Acknowledge change
curl -X POST http://localhost:8001/saved/acknowledge-change \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "location_surf_key": "33.44#-94.04#2026-01-28T06:00:00Z"
  }'
```

Expected Response:
```json
{
  "result": "success",
  "error": null,
  "data": null
}
```

### DynamoDB Test Data (User 8)
```json
{
  "UserId": "8",
  "SortKey": "33.44#-94.04#2026-01-28T06:00:00Z",
  "LocationId": "33.44#-94.04",
  "SurfTimestamp": "2026-01-28T06:00:00Z",
  "flagChange": true,
  "changeMessage": "The surfing index has decreased",
  "surfScore": 82.4,
  "surfGrade": "A",
  "waveHeight": 0.9,
  "wavePeriod": 9.7,
  "windSpeed": 8.1,
  "waterTemperature": 10.1
}
```

---

## 4. Sign-off

| Agent | Status | Date |
|-------|--------|------|
| @backend-dev-agent | Implemented | 2026-02-07 |
| @frontend-dev-agent | Implemented | 2026-02-07 |
| @review-agent | Pending | - |
| @qa-agent | Pending | - |
| @docs-agent | Implemented | 2026-02-07 |
