# API Contract: GraphQL Migration for Saved List

**Contract ID:** t06_savedlist04
**Status:** AGREED
**Created:** 2026-02-08
**Last Updated:** 2026-02-08

---

## 1. Backend Changes

**Implemented by:** @backend-dev-agent

### GraphQL Schema

#### Query Type
```graphql
type Query {
  savedItems: SavedListResult!
  savedItem(locationId: String!, surfTimestamp: String!): SavedItem!
  feedback(locationId: String!, surfTimestamp: String!): FeedbackResult
}
```

#### Mutation Type
```graphql
type Mutation {
  saveItem(input: SaveItemInput!): SavedItemResponse!
  deleteSavedItem(input: DeleteSavedItemInput!): Boolean!
  acknowledgeChange(input: AcknowledgeChangeInput!): Boolean!
  submitFeedback(input: FeedbackInput!): FeedbackResponse!
}
```

#### Types
```graphql
type SavedItem {
  userId: String!
  locationSurfKey: String!
  locationId: String!
  surfTimestamp: String!
  savedAt: String!
  departureDate: String
  address: String
  region: String
  country: String
  waveHeight: Float
  wavePeriod: Float
  windSpeed: Float
  waterTemperature: Float
  surferLevel: String!
  surfScore: Float!
  surfGrade: String!
  flagChange: Boolean!
  changeMessage: String
  feedbackStatus: FeedbackStatus
}

type SavedListResult {
  items: [SavedItem!]!
  total: Int!
}

input SaveItemInput {
  locationId: String!
  surfTimestamp: String!
  surferLevel: String!
  surfScore: Float!
  surfGrade: String!
  departureDate: String
  address: String
  region: String
  country: String
  waveHeight: Float
  wavePeriod: Float
  windSpeed: Float
  waterTemperature: Float
}

input DeleteSavedItemInput {
  locationSurfKey: String
  locationId: String
  surfTimestamp: String
}

input AcknowledgeChangeInput {
  locationSurfKey: String
  locationId: String
  surfTimestamp: String
}
```

### DataLoader Implementation
- `FeedbackDataLoader` for batching feedback queries by user
- Prevents N+1 query problem when fetching saved items with feedback status
- Integrated into GraphQL context

### REST API Deprecation
All `/saved/*` endpoints marked as deprecated with `deprecated=True`:
- `GET /saved` -> Use `savedItems` query
- `POST /saved` -> Use `saveItem` mutation
- `DELETE /saved` -> Use `deleteSavedItem` mutation
- `GET /saved/{location_id}/{surf_timestamp}` -> Use `savedItem` query
- `POST /saved/acknowledge-change` -> Use `acknowledgeChange` mutation

### Files Changed
| File | Change |
|------|--------|
| `apps/api/app/graphql/__init__.py` | NEW - Package init |
| `apps/api/app/graphql/schema.py` | NEW - GraphQL schema with Query/Mutation |
| `apps/api/app/graphql/context.py` | NEW - GraphQL context with auth and DataLoader |
| `apps/api/app/graphql/dataloaders.py` | NEW - FeedbackDataLoader |
| `apps/api/app/graphql/types/saved.py` | NEW - Saved item types |
| `apps/api/app/graphql/types/feedback.py` | NEW - Feedback types |
| `apps/api/app/graphql/resolvers/saved.py` | NEW - Saved resolvers |
| `apps/api/app/graphql/resolvers/feedback.py` | NEW - Feedback resolvers |
| `apps/api/app/main.py` | Added /graphql endpoint |
| `apps/api/app/routers/saved.py` | Marked all endpoints as deprecated |

---

## 2. Frontend Changes

**Implemented by:** @frontend-dev-agent

### Apollo Client Setup
- `client.ts`: Apollo Client with InMemoryCache and type policies
- `links.ts`: HTTP link, auth link (JWT injection), error link

### GraphQL Definitions
| File | Content |
|------|---------|
| `lib/graphql/fragments/saved.ts` | SavedItemFields fragment |
| `lib/graphql/queries/saved.ts` | GET_SAVED_ITEMS, GET_SAVED_ITEM |
| `lib/graphql/mutations/saved.ts` | SAVE_ITEM, DELETE_SAVED_ITEM, ACKNOWLEDGE_CHANGE |
| `lib/graphql/mutations/feedback.ts` | SUBMIT_FEEDBACK |

### Custom Hook
```typescript
// apps/web/hooks/useSavedItems.ts
export function useSavedItems() {
  return {
    items: SavedItemResponse[],      // snake_case for backward compatibility
    total: number,
    loading: boolean,
    error: ApolloError | undefined,
    refetch: () => Promise<...>,
    saveItem: (input) => Promise<...>,
    deleteItem: (locationSurfKey) => Promise<boolean>,
    acknowledgeChange: (locationSurfKey) => Promise<boolean>,
    submitFeedback: (locationId, surfTimestamp, status) => Promise<...>,
  };
}
```

### Page Migration
- `apps/web/app/saved/page.tsx`: Migrated from REST to GraphQL hook
- Removed `savedService` and `feedbackService` imports
- Uses `useSavedItems` hook for all data operations

### Files Changed
| File | Change |
|------|--------|
| `apps/web/lib/apollo/client.ts` | NEW - Apollo Client config |
| `apps/web/lib/apollo/links.ts` | NEW - Apollo links (http, auth, error) |
| `apps/web/lib/graphql/**/*.ts` | NEW - GraphQL queries/mutations |
| `apps/web/hooks/useSavedItems.ts` | NEW - Custom hook |
| `apps/web/hooks/index.ts` | NEW - Hooks export |
| `apps/web/app/saved/page.tsx` | Migrated to GraphQL |
| `apps/web/components/Providers.tsx` | Added ApolloProvider |

---

## 3. Test Cases

### GraphQL Query Test
```bash
# Login and get token
TOKEN=$(curl -s -X POST http://localhost:8001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "password123"}' \
  | python -c "import sys,json; print(json.load(sys.stdin)['data']['access_token'])")

# Query saved items
curl -X POST http://localhost:8001/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "query": "{ savedItems { items { locationSurfKey surfScore surfGrade feedbackStatus } total } }"
  }'
```

Expected Response:
```json
{
  "data": {
    "savedItems": {
      "items": [
        {
          "locationSurfKey": "33.44#-94.04#2026-01-28T06:00:00Z",
          "surfScore": 82.4,
          "surfGrade": "A",
          "feedbackStatus": null
        }
      ],
      "total": 1
    }
  }
}
```

### GraphQL Mutation Test
```bash
# Delete saved item
curl -X POST http://localhost:8001/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "query": "mutation { deleteSavedItem(input: { locationSurfKey: \"33.44#-94.04#2026-01-28T06:00:00Z\" }) }"
  }'
```

Expected Response:
```json
{
  "data": {
    "deleteSavedItem": true
  }
}
```

---

## 4. Architecture

```
Frontend (Next.js)
    |
    v
Apollo Client --> /graphql (Strawberry)
    |                    |
    v                    v
REST /auth/*      GraphQL Resolvers
    |                    |
    v                    v
PostgreSQL        DynamoDB + PostgreSQL
                         |
                    DataLoader (N+1 prevention)
```

---

## 5. Security Review

### Strengths
- Authentication context properly isolated per request
- JWT token type validation (access/refresh)
- User isolation in DynamoDB queries (partition key)
- Password hashing with bcrypt

### Recommendations
| Priority | Issue | Action |
|----------|-------|--------|
| HIGH | localStorage XSS risk | Consider httpOnly cookies |
| MEDIUM | Exception error disclosure | Sanitize error messages |
| MEDIUM | No input validation | Add validators for string length/format |

---

## 6. Sign-off

| Agent | Status | Date |
|-------|--------|------|
| @backend-dev-agent | Implemented | 2026-02-08 |
| @frontend-dev-agent | Implemented | 2026-02-08 |
| @review-agent | Completed | 2026-02-08 |
| @qa-agent | Completed | 2026-02-08 |
| @docs-agent | Completed | 2026-02-08 |
