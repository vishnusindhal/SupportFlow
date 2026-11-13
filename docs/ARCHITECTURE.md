# Architecture

The backend uses FastAPI routers, Pydantic schemas, services, repositories,
and SQLAlchemy models. Authentication dependencies resolve the user and
organization membership from the access token; route input never selects an
authorized tenant.

The frontend uses React, TypeScript, Vite, Tailwind-compatible CSS, Axios,
React Router, and a protected route boundary. PostgreSQL is the production
database; SQLite is supported for fast local unit/API tests.

