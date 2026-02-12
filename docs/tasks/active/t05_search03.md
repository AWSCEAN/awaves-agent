# Task: t05_search03 - Location Keyword Search via OpenSearch

## Status: IN PROGRESS

## Objective
Implement location keyword search using OpenSearch and retrieve corresponding surf_info using locationId as the primary key.

## Changes Made

### Infrastructure
- **docker-compose.yml** (`apps/api/docker-compose.yml`) - OpenSearch single-node setup with security disabled, port 9200

### Backend (apps/api/)

#### New Files
- `app/services/opensearch_service.py` - OpenSearch client, index management, keyword search via multi_match
- `app/services/search_service.py` - Orchestrates OpenSearch search + Redis cache + DynamoDB surf_info lookup
- `app/services/surf_info_service.py` - DynamoDB surf_info queries by locationId
- `app/routers/search.py` - `GET /search?q=` endpoint for keyword search
- `app/scripts/__init__.py` - Scripts package
- `app/scripts/ingest_locations_from_csv.py` - CSV ingestion into DynamoDB locations table + OpenSearch index

#### Modified Files
- `app/config.py` - Added `opensearch_host`, `opensearch_port`, `dynamodb_locations_table`, `redis_ttl_seconds`
- `app/main.py` - Added search router, OpenSearch initialization on startup, cleanup on shutdown
- `app/services/surf_dynamodb.py` - Updated `_to_surf_info` to include location metadata (display_name, city, state, country)
- `requirements.txt` - Added `opensearch-py==2.7.1`

### Frontend (apps/web/)

#### Modified Files
- `lib/apiServices.ts` - Changed `searchSpots()` to call `/search` (OpenSearch) instead of `/surf/search` (coordinate substring)

## Architecture
- **OpenSearch**: Used strictly for keyword search (multi_match on display_name, city, state, country)
- **DynamoDB**: Source of truth for both locations table and surf_info table
- **Redis**: Cache layer with key format `awaves:surf:latest:{locationId}`, configurable TTL
- **locationId**: Generated once during CSV ingestion as `"{lat}#{lon}"`, never reconstructed from floats at runtime

## Search Flow
1. User enters keyword (e.g., "Australia", "Bondi Beach")
2. Frontend calls `GET /search?q=keyword`
3. Backend queries OpenSearch `locations` index using multi_match
4. Extracts locationId from OpenSearch documents (never reconstructed)
5. For each locationId, checks Redis cache (`awaves:surf:latest:{locationId}`)
6. On cache miss, queries DynamoDB surf_info table
7. Returns aggregated results with location metadata + surf conditions

## Agent Sign-off
- [ ] Backend Dev Agent
- [ ] Frontend Dev Agent
- [ ] Review Agent
- [ ] QA Agent
- [ ] Docs Agent
