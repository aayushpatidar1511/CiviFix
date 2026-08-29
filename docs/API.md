# API

Interactive Swagger/OpenAPI is exposed at `/api/docs/`; schema JSON is `/api/schema/`.

Authentication uses JWT access/refresh tokens. All protected resources require an `Authorization: Bearer <access-token>` header.
