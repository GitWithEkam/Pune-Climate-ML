# Pune Climate Intelligence API

Compact MVP backend for the existing React frontend and the repository's GEE + SegFormer climate pipeline. All implementation code is contained in `backend/`.

## Included

- Assessment creation/read/list, dashboard summary, and document upload.
- Flood, heat, green-cover, carbon, and composite scoring.
- Explainable score contributions and frontend-compatible response fields.
- Data-completeness confidence and explicit assumptions to avoid false precision.
- Verified optimization scenarios and actionable recommendations.
- Downloadable PDF assessment reports.
- Zero-config file persistence plus PostgreSQL/PostGIS support.
- Python adapter for the existing `ml_pipeline/PuneExtractor`.
- JWT access/refresh authentication with revocable refresh sessions.
- Role permissions for municipal authorities, planners, consultants, public viewers, and administrators.
- Rate limiting, request IDs, and structured JSON request logging with secret redaction.
- Redis/BullMQ assessment and notification workers with retries.
- Local, private AWS S3, or Firebase object-storage adapters.
- In-app notifications plus optional SMTP email and Twilio SMS delivery.

The default `fixture` ML mode produces stable Pune-like values so local development works without model weights or cloud credentials. Every such response is marked `development-fixture`. Set `ML_MODE=python` to use the real GEE + SegFormer pipeline.

## Run locally

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

API base URL: `http://localhost:4000/api`.

```bash
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo Planner","email":"planner@example.com","password":"StrongPassword123!"}'
```

Ready-made Postman/request bodies are in `examples/mock-assessment.json` and `examples/mock-assessment-with-ml.json`. To insert both automatically, keep the API running and use:

```bash
npm run seed
```

## Frontend contract

Responses include the fields already used by `frontend/src/data/mockData.js`: `projectName`, `location`, `projectType`, `climateScore`, `status`, risk scores, land-cover percentages, LST, spectral indices, elevation, and slope.

| Action | Method and route |
|---|---|
| Register/login | `POST /api/v1/auth/register`, `POST /api/v1/auth/login` |
| Rotate/revoke refresh token | `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout` |
| Administer users | `GET/POST /api/v1/users` |
| Create/run assessment | `POST /api/v1/assessments` |
| Queue assessment | `POST /api/v1/assessments?async=true` |
| Recent assessments | `GET /api/v1/assessments` |
| Assessment result | `GET /api/v1/assessments/:id` |
| Optimize | `POST /api/v1/assessments/:id/optimize` |
| Reassess scenario | `POST /api/v1/assessments/:id/reassess` |
| Upload plans/data | `POST /api/v1/assessments/:id/documents` (`documents` multipart field) |
| Download uploaded file | `GET /api/v1/assessments/:id/documents/:documentId` |
| Download report | `GET /api/v1/assessments/:id/report` |
| Dashboard summary | `GET /api/v1/dashboard` |
| In-app notifications | `GET /api/v1/notifications`, `PATCH /api/v1/notifications/:id/read` |
| Queue status | `GET /api/v1/jobs/:queue/:id` |

Except for health, registration, login, refresh, and logout, routes require `Authorization: Bearer <accessToken>`. Self-registration creates an `urban_planner`; only an administrator or municipal authority can create arbitrary roles. `public_viewer` is read-only, planners and consultants access their own assessments, and administrators/municipal authorities access all projects.

`climateScore` is a positive resilience score (higher is better). `impactScore` and risk sub-scores are pressures (higher is worse). This makes optimizer comparisons coherent while retaining the existing ML scorer's impact semantics.

Every assessment also returns `dataQuality` with `completeness`, `confidence`, source class, and assumptions. Supplying coordinates, real/request-provided ML output, built-up area, and material quantities raises confidence; fixture data and missing carbon quantities are called out explicitly.

## Real ML mode

1. Train or download the SegFormer weights as described in the root README.
2. Install the root Python dependencies and authenticate Earth Engine.
3. Configure `GEE_PROJECT_ID`, `MODEL_PATH`, and optional service-account variables.
4. Set `ML_MODE=python`.
5. Include Pune coordinates in the request:

```json
{
  "name": "Baner Urban Development",
  "type": "Mixed-use development",
  "location": "Baner, Pune",
  "coordinates": { "lat": 18.559, "lon": 73.7868 },
  "bufferM": 500
}
```

For offline inference or a separate model service, send the extractor result as `mlOutput`; land-cover totals and temperature are validated before scoring.

## PostgreSQL/PostGIS

For local file storage, no service is needed. To match the production storage layer in the architecture:

```bash
docker compose up -d database
```

Set `STORAGE_DRIVER=postgres` and use the `DATABASE_URL` from `.env.example`. On startup, the API creates the PostGIS extension and assessment table and stores coordinates as `geography(Point, 4326)`.

## Redis and background workers

```bash
docker compose up -d redis
```

Set `REDIS_URL=redis://localhost:6379`, run the API with `npm run dev`, and start a separate worker process with `npm run worker`. Requests sent to `POST /assessments?async=true` are processed by BullMQ with retries; outbound email/SMS deliveries also use the notification queue. Without `REDIS_URL`, normal assessment requests and notifications run synchronously.

## File storage

- `FILE_STORAGE_PROVIDER=local`: files remain under `backend/uploads/`.
- `FILE_STORAGE_PROVIDER=s3`: configure `AWS_REGION`, `AWS_S3_BUCKET`, and standard AWS credentials.
- `FILE_STORAGE_PROVIDER=firebase`: configure `FIREBASE_STORAGE_BUCKET` and `FIREBASE_SERVICE_ACCOUNT_PATH`.

Objects stay private and are downloaded through the authenticated API rather than public bucket URLs.

## Notifications

Every completed assessment creates an in-app notification. Configure `SMTP_*` variables for email and `TWILIO_*` variables for SMS. Missing providers are reported as `not_configured` without failing an assessment. Administrators and municipal authorities can create multi-channel notifications through `POST /api/v1/notifications`.

## Design boundary

The attached service diagram is represented as a modular monolith for the MVP: API gateway middleware, user/project services, ML ingestion, GIS/model bridge, scoring, optimization, reports, notifications, background workers, and swappable database/object storage. These are separate modules that can later be deployed independently without adding microservice overhead during the MVP.

The calculation boundary follows the attached R&D framework and existing ML package: land-cover pressure, historical satellite LST context, embodied carbon from major supplied materials, and SCS-CN storm runoff. The repository's documented Pune weights are retained (flood 30%, heat 30%, green 20%, carbon 20%). Formula calculations are deterministic; generated recommendations never replace them.

Uploads accept PDF, PNG, JPEG, and CSV files, up to 20 MB each and five files per request. Authentication, rate limiting and private object storage are enforced; production deployments should additionally add malware scanning.

## Verify

```bash
npm test
npm run check
```
