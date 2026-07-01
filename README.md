# Velocity Zone Manager

A full-stack Zone Manager for robotic mower fleet operations, built for TerraSync’s Velocity platform workflow.

This project supports property and zone management, GeoJSON import/export, map-based polygon editing using OpenLayers, and mower coverage validation logic.

---

## Stack

### Frontend
- React 18 + TypeScript (strict mode)
- Vite
- Tailwind CSS
- OpenLayers
- Axios

### Backend
- Flask
- Flask-SQLAlchemy
- Flask-JWT-Extended
- PostgreSQL + PostGIS
- GeoAlchemy2

### Infra
- Docker Compose (`frontend`, `backend`, `postgres`)

---

## Why PostGIS Geometry (instead of JSONB)

Zone boundaries are stored as **PostGIS `geometry(POLYGON, 4326)`** because the assignment requires geometry-based acreage and geospatial operations.  
This allows:
- accurate acreage calculation from polygon geometry (`ST_Area`)
- geometry transformation/validation with PostGIS functions
- future support for spatial overlap/intersection checks

This is more robust for spatial workloads than storing raw polygon JSON only in JSONB.

---

## Project Structure

```text
/frontend
/backend
docker-compose.yml
README.md
```

---

## Run Locally (Docker)

From repo root:

```bash
docker compose down -v
docker compose up --build
```

Services:
- Frontend: http://localhost:5173
- Backend: http://localhost:5000
- Health: http://localhost:5000/health

---

## Seed Data (First Boot)

On container startup, backend runs:

```bash
python seed.py && python app.py
```

Seed behavior:
- creates one demo property: **Bengaluru Golf Club**
- creates **3 pre-drawn polygon zones**
- idempotent (safe on repeated runs)

---

## Auth

- JWT-based auth
- token stored client-side (`localStorage`)
- protected routes redirect unauthenticated users

Endpoints:
- `POST /auth/signup`
- `POST /auth/login`

---

## API Contract Implemented

### Properties
- `GET /properties` (supports search by name/type and type filter)
- `POST /properties`
- `GET /properties/:id`
- `PUT /properties/:id`
- `DELETE /properties/:id`

### Zones
- `GET /properties/:id/zones`
- `POST /properties/:id/zones`
- `PUT /properties/:id/zones/:zone_id`
- `DELETE /properties/:id/zones/:zone_id`
- `GET /properties/:id/zones/summary`
- `GET /properties/:id/zones/export`
- `POST /properties/:id/zones/import`

---

## TER-S01 Coverage

- Signup, login, logout and protected routing
- Property CRUD with:
  - `name`
  - `type` (Golf Course / Airport / Corporate Campus / Other)
  - `total_acreage`
  - `notes`
- Zone CRUD with OpenLayers polygon drawing/editing
- Zone fields:
  - `name`
  - `zone_type` (Fairway / Rough / Perimeter / Exclusion)
  - `mower_count`
  - `status` (Active / Inactive)
- GeoJSON import (`FeatureCollection` polygons)
- GeoJSON export (`FeatureCollection`)
- map extent fit to zones on load
- India default map center when no zones
- sidebar zone list with computed acreage and understaffed indicator

---

## TER-S02 Coverage

- Server-side validation:
  - create/update zone with `mower_count = 0` returns `400` with:
  - `"A zone must have at least one assigned mower."`
- `understaffed` computed in API response (not stored):
  - `understaffed = acreage > mower_count * 2`
- Shared validation helper used across create and update (no logic duplication)
- Frontend displays backend validation error inline
- Understaffed zones are visually distinct:
  - sidebar warning styling
  - map warning styling
- `GET /properties/:id/zones/summary` returns:
  - total zones
  - total acreage
  - total mowers assigned
  - understaffed zone count

---

## GeoJSON Notes

### Import requirements
- must be valid `FeatureCollection`
- each feature must be `Polygon`
- non-polygon or invalid payloads return descriptive `400` errors

### Export output
- valid `FeatureCollection`
- includes geometry and zone metadata

---

## Testing

Backend tests run via:

```bash
docker compose exec backend pytest
```

(If running locally inside backend folder:)
```bash
cd backend
pytest
```

---

## AI Workflow

## Q1 — Which AI tools did you use, and what exactly for?

I used **ChatGPT** for:
1. Creating a compliance checklist against TER-S01/TER-S02 acceptance criteria.
2. Refactoring Flask validation logic to avoid duplication between zone create/update.
3. Reviewing frontend TypeScript API typing and error propagation for inline backend error display.
4. Validating OpenLayers map behavior requirements (extent fit, India default center, geometry projection handling).
5. Drafting a README structure aligned with assignment scoring requirements.

I did **not** blindly copy all output; I used it as implementation guidance and reviewed each change manually.

---

## Q2 — One concrete example of AI output accepted with no changes

### Prompt
> “Write a Flask helper that validates mower_count and returns the exact assignment-required error for zero: `A zone must have at least one assigned mower.`”

### Output used as-is
```python
def validate_mower_count(mower_count):
    try:
        val = int(mower_count)
    except (TypeError, ValueError):
        return "A zone must have at least one assigned mower."

    if val <= 0:
        return "A zone must have at least one assigned mower."
    return None
```

I used this exactly because it matched the acceptance criteria and covered invalid/non-numeric input.

---

## Q3 — One concrete example of AI output rejected or significantly edited

AI initially suggested a generic map implementation that read/wrote GeoJSON without explicit projection handling between EPSG:4326 and EPSG:3857.

### What was wrong
- Could cause coordinate/projection inconsistencies in OpenLayers drawing/editing workflows.
- Risked wrong extent fitting and geometry persistence issues.

### What I changed
- Explicitly used OpenLayers GeoJSON conversion with:
  - `dataProjection: "EPSG:4326"`
  - `featureProjection: "EPSG:3857"`
- Added explicit extent fit fallback:
  - fit to zone extent when features exist
  - default center over India when no zones

---

## Q4 — One part where AI was not useful and I did it myself

I manually performed the full **end-to-end Docker verification** (`docker compose down -v && docker compose up --build`) and interactive functional checks (auth flow, zone draw/edit, import/export, understaffed behavior).

AI could propose checks, but it could not verify real runtime behavior and integration issues in my environment.  
For container startup sequencing, seed idempotency, and UI/API interaction correctness, manual execution was necessary.

---

## Submission Notes

- Built to run from clean state with Docker Compose.
- Core focus was TER-S01 + TER-S02 correctness and reliability over visual polish.
- Mapping library used: **OpenLayers only**.
- Database used: **PostgreSQL/PostGIS only**.
