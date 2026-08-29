# CiviFix Architecture

Next.js/React UI → API service → Django REST Framework → domain services → PostgreSQL/PostGIS. Redis is used by Celery for asynchronous SLA escalation. The application separates persistence models, serializers, API views, permissions and domain services. Spatial complaints/assets use PostGIS Point geometry (EPSG:4326).
