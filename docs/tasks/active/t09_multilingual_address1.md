# Task: t09_multilingual_address1 - Multilingual Address Support (EN/KO)

## Status: In Progress

## Objective
Add Korean address support across the entire service stack using pre-translated CSV data.

## Changes Made

### Backend (apps/api/)

#### OpenSearch Setup
- **Dockerfile.opensearch** (NEW): Custom Docker image with nori (Korean) analyzer plugin
- **docker-compose.yml**: Updated to build from custom Dockerfile instead of stock image

#### OpenSearch Service (`app/services/opensearch_service.py`)
- Added `detect_language()` utility for Korean character detection
- Updated `create_index_if_not_exists()` with Korean analyzer settings and field mappings
- Added `_ensure_korean_mappings()` for upgrading existing indexes
- Updated `index_location()` and `bulk_index_locations()` to include Korean fields
- Updated `search_locations()` with language parameter and auto-detection
- Added `_build_english_query()` (preserves existing logic) and `_build_korean_query()` (nori-based)

#### Data Import
- **ingest_locations_from_csv.py**: Updated to support bilingual CSV with Korean columns
- **ingest_korean_translations.py** (NEW): Standalone script for importing Korean translations into existing DynamoDB/OpenSearch records

#### Search Service (`app/services/search_service.py`)
- Added `language` parameter passthrough to OpenSearchService
- Enriches results with Korean address fields (nameKo, regionKo, countryKo, addressKo, cityKo)

#### API Layer
- **routers/search.py**: Added optional `language` query parameter (backward compatible)
- **schemas/surf.py**: Added `regionKo`, `countryKo`, `addressKo`, `cityKo` optional fields to `SurfInfoResponse`

#### DynamoDB Mapping
- **surf_dynamodb.py**: `_to_surf_info()` now extracts Korean address fields from location data
- **surf_info_service.py**: `_to_surf_info()` now includes Korean fields
- **main.py**: Auto-seed logic now includes Korean fields when seeding OpenSearch

### Frontend (apps/web/)

#### Types (`packages/shared/src/index.ts`)
- Added `regionKo`, `countryKo`, `addressKo`, `cityKo` to `SurfInfo` interface

#### Components
- **LocationAutocomplete.tsx**: Korean region/country names populated in autocomplete options
- **SearchResultsList.tsx**: Shows Korean region/country when locale is 'ko'
- **SpotDetailPanel.tsx**: Shows Korean region/country when locale is 'ko'

#### API Integration
- **apiServices.ts**: `searchSpots()` now accepts optional `language` parameter
- **map/page.tsx**: Passes locale as language hint to search API

## Key Decisions
- Korean search uses nori analyzer for proper tokenization
- Language auto-detection based on Hangul character regex
- English search logic completely preserved (backward compatible)
- All API changes are backward compatible (new fields are optional)

## Files Changed
- `apps/api/Dockerfile.opensearch` (NEW)
- `apps/api/docker-compose.yml`
- `apps/api/app/services/opensearch_service.py`
- `apps/api/app/services/search_service.py`
- `apps/api/app/services/surf_dynamodb.py`
- `apps/api/app/services/surf_info_service.py`
- `apps/api/app/routers/search.py`
- `apps/api/app/schemas/surf.py`
- `apps/api/app/main.py`
- `apps/api/app/scripts/ingest_locations_from_csv.py`
- `apps/api/app/scripts/ingest_korean_translations.py` (NEW)
- `packages/shared/src/index.ts`
- `apps/web/components/LocationAutocomplete.tsx`
- `apps/web/components/SearchResultsList.tsx`
- `apps/web/components/SpotDetailPanel.tsx`
- `apps/web/lib/apiServices.ts`
- `apps/web/app/map/page.tsx`
