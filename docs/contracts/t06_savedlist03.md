# API Contract: Feedback Dismissal System

**Contract ID:** t06_savedlist03
**Status:** AGREED
**Created:** 2026-02-08
**Last Updated:** 2026-02-08

---

## 1. Overview

Once a user provides feedback on a saved item, the feedback prompt should not be displayed on subsequent visits (page refresh or re-entry).

---

## 2. Backend Changes

**Implemented by:** @backend-dev-agent

### Schema Update

Added `feedback_status` field to `SavedItemResponse`:

```python
# apps/api/app/schemas/saved.py

FeedbackStatus = Literal["POSITIVE", "NEGATIVE", "DEFERRED"]

class SavedItemResponse(BaseModel):
    # ... existing fields ...
    feedback_status: Optional[FeedbackStatus] = None

    @classmethod
    def from_dynamodb(
        cls,
        item: dict,
        feedback_status: Optional[FeedbackStatus] = None,
    ) -> "SavedItemResponse":
        # ... returns item with feedback_status ...
```

### Router Update

Modified `get_saved_list` endpoint to fetch feedback from PostgreSQL:

```python
# apps/api/app/routers/saved.py

async def _get_feedback_map(
    session: AsyncSession,
    user_id: int,
) -> dict[str, FeedbackStatus]:
    """Get feedback status for saved items from PostgreSQL."""
    result = await session.execute(
        select(Feedback).where(Feedback.user_id == user_id)
    )
    feedbacks = result.scalars().all()
    return {
        f"{fb.location_id}#{fb.surf_timestamp}": fb.feedback_status
        for fb in feedbacks
    }

@router.get("", response_model=CommonResponse[SavedListResponse])
async def get_saved_list(
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
) -> CommonResponse[SavedListResponse]:
    # Get items from DynamoDB/cache
    db_items = await DynamoDBService.get_saved_list(user_id)

    # Get feedback status from PostgreSQL
    feedback_map = await _get_feedback_map(session, int(user_id))

    # Build response with joined data
    items = []
    for item in db_items:
        key = f"{location_id}#{surf_timestamp}"
        feedback_status = feedback_map.get(key)
        items.append(SavedItemResponse.from_dynamodb(item, feedback_status))

    return CommonResponse(result="success", data=SavedListResponse(...))
```

### Files Changed

| File | Change |
|------|--------|
| `apps/api/app/schemas/saved.py` | Added `FeedbackStatus` type and `feedback_status` field |
| `apps/api/app/routers/saved.py` | Added `_get_feedback_map` function, modified `get_saved_list` |

---

## 3. Frontend Changes

**Implemented by:** @frontend-dev-agent

### TypeScript Type Update

```typescript
// packages/shared/src/index.ts

export interface SavedItemResponse {
  // ... existing fields ...
  feedback_status?: FeedbackStatus;
}
```

### Saved Page Update

```typescript
// apps/web/app/saved/page.tsx

const fetchSavedItems = useCallback(async () => {
  const response = await savedService.getSavedItems();

  if (response.success && response.data?.result === 'success') {
    const items = response.data.data.items;
    setSavedItems(items);

    // Initialize feedbackMap from API response
    const initialFeedbackMap: Record<string, FeedbackStatus> = {};
    for (const item of items) {
      if (item.feedback_status) {
        initialFeedbackMap[item.location_surf_key] = item.feedback_status;
      }
    }
    setFeedbackMap(initialFeedbackMap);
  }
}, []);
```

### Files Changed

| File | Change |
|------|--------|
| `packages/shared/src/index.ts` | Added `feedback_status` to `SavedItemResponse` |
| `apps/web/app/saved/page.tsx` | Initialize `feedbackMap` from API response |

---

## 4. API Response Example

### GET /saved

```json
{
  "result": "success",
  "data": {
    "items": [
      {
        "user_id": "8",
        "location_surf_key": "33.44#-94.04#2026-01-28T06:00:00Z",
        "location_id": "33.44#-94.04",
        "surf_timestamp": "2026-01-28T06:00:00Z",
        "surf_score": 85.5,
        "surf_grade": "A",
        "flag_change": false,
        "feedback_status": "POSITIVE"
      }
    ],
    "total": 1
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| feedback_status | string \| null | POSITIVE / NEGATIVE / DEFERRED / null |

---

## 5. User Flow

```
1. User provides feedback (POSITIVE/NEGATIVE/DEFERRED)
        |
        v
2. Frontend calls POST /feedback/saved-item
        |
        v
3. Feedback stored in PostgreSQL (feedback table)
        |
        v
4. User refreshes page or re-enters saved list
        |
        v
5. GET /saved returns items with feedback_status
        |
        v
6. Frontend initializes feedbackMap from response
        |
        v
7. SavedItemCard checks feedbackStatus prop
   - If exists: Show "Thanks for feedback!" or nothing
   - If null: Show feedback prompt
```

---

## 6. Test Cases

### Manual Test
1. Login as test user
2. Navigate to saved list
3. Provide feedback on an item (click thumbs up/down)
4. Refresh the page
5. Verify feedback prompt is NOT shown for that item

### API Test
```bash
# Get saved items with feedback status
curl -X GET http://localhost:8001/saved \
  -H "Authorization: Bearer $TOKEN"

# Expected: items include feedback_status field
```

---

## 7. Sign-off

| Agent | Status | Date |
|-------|--------|------|
| @backend-dev-agent | Implemented | 2026-02-08 |
| @frontend-dev-agent | Implemented | 2026-02-08 |
| @qa-agent | Completed | 2026-02-08 |
| @review-agent | Completed | 2026-02-08 |
| @docs-agent | Completed | 2026-02-08 |
