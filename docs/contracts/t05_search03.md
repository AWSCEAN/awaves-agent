# API Contract: t05_search03 - Location Keyword Search

## Status: AGREED

## Frontend Requirements
- Keyword-based search input (already exists in LocationAutocomplete)
- Call backend `/search` endpoint with query string
- Display results: display_name, city, state, country, surf_score, surf_grade, surfing_level
- Handle empty results, loading state, API errors (500/503)

## Backend Proposal

### Endpoint: `GET /search`

**Query Parameters:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| q | string | Yes | - | Keyword search query (min 1 char) |
| size | int | No | 50 | Max results (1-100) |

**Response:** `SurfInfoResponse[]`

Each item contains:
```json
{
  "LocationId": "41.6354#-70.2911",
  "SurfTimestamp": "2026-02-11T06:00:00Z",
  "geo": { "lat": 41.6354, "lng": -70.2911 },
  "conditions": { "waveHeight": 1.5, "wavePeriod": 8.0, "windSpeed": 12.0, "waterTemperature": 15.0 },
  "derivedMetrics": { "surfScore": 65.0, "surfGrade": "B", "surfingLevel": "INTERMEDIATE" },
  "metadata": { "modelVersion": "...", "dataSource": "...", "predictionType": "FORECAST", "createdAt": "..." },
  "name": "Keating Road, Hyannis, ...",
  "region": "Massachusetts",
  "country": "United States",
  "address": "Keating Road, Hyannis, ...",
  "difficulty": "intermediate",
  "waveType": "Beach Break",
  "bestSeason": []
}
```

**Error Responses:**
- `503` - OpenSearch unavailable
- `422` - Invalid query parameters

## Agreement
- Frontend calls `/search?q=` instead of `/surf/search?q=`
- Response schema matches existing `SurfInfoResponse`
- No frontend type changes needed

## Test Cases
1. Search "Australia" → returns spots in Australia
2. Search "Bondi" → returns Bondi Beach spot
3. Search "nonexistent" → returns empty array
4. Search with OpenSearch down → returns 503
5. Cache hit: second search for same locationId returns cached surf data
6. Cache miss: first search triggers DynamoDB query + cache set

## Implementation Tracking
- [x] Backend: OpenSearch service
- [x] Backend: Search service (OpenSearch + Redis + DynamoDB)
- [x] Backend: `/search` endpoint
- [x] Backend: Ingestion script
- [x] Frontend: Updated searchSpots to call `/search`
- [ ] QA: Test search flow
- [ ] Review: Security & code quality

## Sign-off
- [ ] Backend Dev Agent
- [ ] Frontend Dev Agent
